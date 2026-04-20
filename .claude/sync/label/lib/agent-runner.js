/**
 * agent-runner.js — Spawn derivation agents + track pending jobs.
 *
 * Two execution modes:
 *
 *   1. HEADLESS (PostToolUse hook path, PLAN §S3):
 *      Hook can't use the Claude Code Task tool — it runs as a subprocess
 *      fired BY Claude Code. So hook-triggered derivation spawns `claude -p`
 *      as a detached child process, then exits. Next hook invocation reads
 *      the pending-jobs queue, checks for completed output files, and
 *      applies them to the catalog.
 *
 *   2. INLINE (back-fill orchestrator, PLAN §S8):
 *      Orchestrator runs inside a live Claude Code session and will use the
 *      Task tool directly — the orchestrator code imports THIS module only
 *      for the pending-queue helpers, not the spawn helpers.
 *
 * This MVP covers mode (1) with an injectable spawner so tests don't need a
 * live `claude` binary. Mode (2) integration is completed in S8.
 *
 * All errors routed through ./sanitize so raw `error.message` never escapes.
 */

const { spawn } = require("node:child_process");
const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");

const REPO_ROOT_SENTINEL = path.join(__dirname, "..", "..", "..", "..");
const { safeAtomicWriteSync, readTextWithSizeGuard, withLock } = require(
  path.join(REPO_ROOT_SENTINEL, "scripts", "lib", "safe-fs.js")
);
const { sanitize } = require("./sanitize");

const DEFAULT_TIMEOUT_MS = 120_000; // 2 min per agent (back-fill can override)
const DEFAULT_PENDING_QUEUE = path.join(
  REPO_ROOT_SENTINEL,
  ".claude",
  "state",
  "label-pending-failures.jsonl"
);

/**
 * Create a short, URL-safe job ID.
 * @returns {string}
 */
function newJobId() {
  return `job_${Date.now()}_${crypto.randomBytes(4).toString("hex")}`;
}

/**
 * Default spawner — invokes the `claude` CLI in headless mode (`-p`).
 * Injected during tests so no live binary is required.
 *
 * @param {object} args
 * @param {string} args.prompt - Prompt text (passed on stdin to avoid argv size limits)
 * @param {string} args.outputPath - Absolute path the agent writes to
 * @param {number} args.timeoutMs
 * @param {object} [args.env]
 * @returns {{pid: number | null, spawnedAt: number}} spawn metadata
 */
function resolveExecutable(name) {
  // Walk process.env.PATH (honouring PATHEXT on Windows) to find `name`'s
  // absolute path. Returning an absolute path lets us spawn with
  // shell:false on every platform — Windows can then resolve .cmd/.bat
  // without needing the shell, which closes the spawn-shell-true finding
  // (Semgrep #25, R2 follow-up to R1 #22).
  const pathEnv = process.env.PATH || "";
  const sep = process.platform === "win32" ? ";" : ":";
  const exts = process.platform === "win32"
    ? (process.env.PATHEXT || ".COM;.EXE;.BAT;.CMD").split(";")
    : [""];
  const dirs = pathEnv.split(sep).filter(Boolean);
  for (const dir of dirs) {
    for (const ext of exts) {
      const candidate = path.join(dir, name + ext);
      try {
        if (fs.statSync(candidate).isFile()) return candidate;
      } catch {
        // Not found in this dir, try next. Most PATH entries miss on any
        // given name — the throw-per-miss is the hot loop, not an error.
      }
    }
  }
  return null;
}

function defaultHeadlessSpawner({ prompt, outputPath, timeoutMs, env }) {
  const claudeBinary = resolveExecutable("claude");
  if (!claudeBinary) {
    // No claude binary in PATH. Emit the same structured error shape as an
    // async spawn failure so the next Step-0 sweep surfaces via
    // applyAgentOutput's `output.error` path instead of hanging as
    // timed_out.
    try {
      fs.writeFileSync(
        outputPath,
        JSON.stringify({ error: "spawn failed: claude binary not found in PATH" })
      );
    } catch {
      // If marker write fails, pending-queue sweep still times out the job.
    }
    return { pid: null, spawnedAt: Date.now() };
  }
  const child = spawn(claudeBinary, ["-p", "--output-format=json"], {
    detached: true,
    stdio: ["pipe", "ignore", "ignore"],
    env: { ...process.env, ...(env ?? {}), LABEL_AGENT_OUTPUT_PATH: outputPath },
    windowsHide: true,
  });
  // Async spawn failures (ENOENT, EACCES) arrive as 'error' events. Without
  // a listener the event crashes the parent hook process. Persist a
  // structured error marker at outputPath so the next Step-0 sweep reads it
  // as complete-with-error via applyAgentOutput's `output.error` path.
  child.once("error", (err) => {
    try {
      fs.writeFileSync(
        outputPath,
        JSON.stringify({ error: `spawn failed: ${sanitize(err)}` })
      );
    } catch {
      // If marker write fails, the pending-queue sweep still classifies
      // the entry as timed_out once spawnedAt + timeoutMs elapses.
    }
  });
  if (child.stdin) {
    try {
      child.stdin.write(prompt);
      child.stdin.end();
    } catch {
      // Non-fatal: child may already have closed stdin. The queue entry
      // captures PID + spawnedAt so orchestration can detect non-completion.
    }
  }
  child.unref();
  // Timeout wiring: a setTimeout holds the event loop; we detach so parent
  // can exit. The timeout is informational in the queue record — actual
  // enforcement happens when the consumer reads the queue and sees no
  // output file AND `Date.now() - spawnedAt > timeoutMs`.
  return { pid: child.pid ?? null, spawnedAt: Date.now() };
}

/**
 * Spawn an async derivation agent. Writes a pending-queue entry and returns
 * the job ID immediately. Caller (hook) does NOT await agent completion.
 *
 * @param {object} args
 * @param {string} args.prompt - Full prompt for the derivation agent
 * @param {string} args.filePath - File being derived (for queue audit)
 * @param {string} args.outputPath - Where the agent writes its JSON output
 * @param {number} [args.timeoutMs=DEFAULT_TIMEOUT_MS]
 * @param {string} [args.queuePath=DEFAULT_PENDING_QUEUE]
 * @param {(args: object) => {pid: number|null, spawnedAt: number}} [args.spawner] - Test injection
 * @returns {string} Job ID
 */
function runAgentAsync({
  prompt,
  filePath,
  outputPath,
  timeoutMs = DEFAULT_TIMEOUT_MS,
  queuePath = DEFAULT_PENDING_QUEUE,
  spawner = defaultHeadlessSpawner,
}) {
  if (typeof prompt !== "string" || prompt.length === 0) {
    throw new TypeError("agent-runner.runAgentAsync: prompt required");
  }
  if (typeof filePath !== "string" || filePath.length === 0) {
    throw new TypeError("agent-runner.runAgentAsync: filePath required");
  }
  if (typeof outputPath !== "string" || outputPath.length === 0) {
    throw new TypeError("agent-runner.runAgentAsync: outputPath required");
  }

  const jobId = newJobId();
  let spawnMeta;
  try {
    spawnMeta = spawner({ prompt, outputPath, timeoutMs, env: {} });
  } catch (err) {
    throw new Error(`agent-runner.runAgentAsync: spawner failed: ${sanitize(err)}`);
  }

  const entry = {
    job_id: jobId,
    file_path: filePath,
    output_path: outputPath,
    pid: spawnMeta.pid,
    spawned_at: spawnMeta.spawnedAt,
    timeout_ms: timeoutMs,
    status: "pending",
  };
  appendQueueEntry(queuePath, entry);
  return jobId;
}

/**
 * Append a pending-queue JSONL entry under an advisory lock.
 * @param {string} queuePath
 * @param {object} entry
 */
function appendQueueEntry(queuePath, entry) {
  const abs = path.resolve(queuePath);
  const dir = path.dirname(abs);
  try {
    fs.mkdirSync(dir, { recursive: true });
  } catch (err) {
    throw new Error(`agent-runner.appendQueueEntry: mkdir failed: ${sanitize(err)}`);
  }
  withLock(abs, () => {
    let existing = "";
    let hasContent = false;
    try {
      hasContent = fs.statSync(abs).size > 0;
    } catch (err) {
      if (err && err.code === "ENOENT") {
        // Missing file is fine — this is the first append.
        hasContent = false;
      } else {
        throw new Error(
          `agent-runner.appendQueueEntry: stat failed: ${sanitize(err)}`
        );
      }
    }
    if (hasContent) {
      try {
        existing = readTextWithSizeGuard(abs);
      } catch (err) {
        throw new Error(
          `agent-runner.appendQueueEntry: existing queue read failed: ${sanitize(err)}`
        );
      }
      if (existing.length > 0 && !existing.endsWith("\n")) existing += "\n";
    }
    const payload = `${existing}${JSON.stringify(entry)}\n`;
    safeAtomicWriteSync(abs, payload, { encoding: "utf8" });
  });
}

/**
 * Read the pending-jobs queue. Missing file → empty array. Blank lines skipped.
 * @param {string} [queuePath=DEFAULT_PENDING_QUEUE]
 * @returns {object[]}
 */
function readQueue(queuePath = DEFAULT_PENDING_QUEUE) {
  const abs = path.resolve(queuePath);
  try {
    const st = fs.statSync(abs);
    if (st.size === 0) return [];
  } catch (err) {
    if (err && err.code === "ENOENT") return [];
    throw new Error(`agent-runner.readQueue: stat failed: ${sanitize(err)}`);
  }
  let text;
  try {
    text = readTextWithSizeGuard(abs);
  } catch (err) {
    throw new Error(`agent-runner.readQueue: read failed: ${sanitize(err)}`);
  }
  const out = [];
  let lineNo = 0;
  for (const rawLine of text.split("\n")) {
    lineNo += 1;
    const line = rawLine.trim();
    if (line.length === 0) continue;
    try {
      out.push(JSON.parse(line));
    } catch (err) {
      throw new Error(
        `agent-runner.readQueue: line ${lineNo} malformed JSON: ${sanitize(err)}`
      );
    }
  }
  return out;
}

/**
 * Atomically rewrite the queue. Used by the PostToolUse hook's Step 0 sweep
 * to drop completed/failed entries after they've been applied.
 * @param {string} queuePath
 * @param {object[]} entries
 */
function rewriteQueue(queuePath, entries) {
  if (!Array.isArray(entries)) {
    throw new TypeError("agent-runner.rewriteQueue: entries must be an array");
  }
  const abs = path.resolve(queuePath);
  const dir = path.dirname(abs);
  try {
    fs.mkdirSync(dir, { recursive: true });
  } catch (err) {
    throw new Error(`agent-runner.rewriteQueue: mkdir failed: ${sanitize(err)}`);
  }
  const payload = entries.length === 0 ? "" : `${entries.map((e) => JSON.stringify(e)).join("\n")}\n`;
  try {
    safeAtomicWriteSync(abs, payload, { encoding: "utf8" });
  } catch (err) {
    throw new Error(`agent-runner.rewriteQueue: atomic write failed: ${sanitize(err)}`);
  }
}

/**
 * Classify a pending-queue entry: "complete" (output exists + parseable),
 * "timed_out" (no output + past deadline), "running" (still within deadline),
 * "failed" (output exists but unparseable or process indicator says so).
 *
 * @param {object} entry - Queue record from runAgentAsync
 * @param {number} [now=Date.now()]
 * @returns {"complete" | "timed_out" | "running" | "failed"}
 */
function classifyJob(entry, now = Date.now()) {
  if (!entry || typeof entry !== "object") return "failed";
  const outputPath = entry.output_path;
  const spawnedAt = Number(entry.spawned_at);
  const timeoutMs = Number(entry.timeout_ms) || DEFAULT_TIMEOUT_MS;

  if (typeof outputPath === "string") {
    try {
      const st = fs.statSync(outputPath);
      if (st.size > 0) {
        try {
          JSON.parse(readTextWithSizeGuard(outputPath));
          return "complete";
        } catch {
          return "failed";
        }
      }
    } catch (err) {
      if (!err || (err.code !== "ENOENT" && err.code !== "ENOTDIR")) {
        return "failed";
      }
      // ENOENT / ENOTDIR — fall through to timeout / running classification.
    }
  }
  if (!Number.isFinite(spawnedAt)) return "failed";
  if (now - spawnedAt > timeoutMs) return "timed_out";
  return "running";
}

/**
 * Read + parse the output file of a completed job.
 * @param {object} entry - Queue entry
 * @returns {object}
 */
function readJobOutput(entry) {
  if (!entry || typeof entry.output_path !== "string") {
    throw new TypeError("agent-runner.readJobOutput: entry.output_path required");
  }
  try {
    return JSON.parse(readTextWithSizeGuard(entry.output_path));
  } catch (err) {
    throw new Error(`agent-runner.readJobOutput: parse failed: ${sanitize(err)}`);
  }
}

module.exports = {
  DEFAULT_TIMEOUT_MS,
  DEFAULT_PENDING_QUEUE,
  newJobId,
  defaultHeadlessSpawner,
  runAgentAsync,
  readQueue,
  rewriteQueue,
  classifyJob,
  readJobOutput,
};
