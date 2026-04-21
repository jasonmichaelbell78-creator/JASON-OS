#!/usr/bin/env node
/**
 * post-tool-use-label.js — PostToolUse Edit/Write hook (PLAN §S3).
 *
 * Implements D2 + D11 + D15:
 *   - Step 0 (BEFORE anything): drain pending-agent queue; exit non-zero on
 *     failures so Claude must acknowledge per D15 path 1.
 *   - Step 1–5: classify the current edit (NEW / MAJOR / MINOR) and write
 *     a partial or full record into the catalog.
 *   - Step 6: spawn async understanding-field agent if needed.
 *   - Return 0 on success (never blocks the user's Edit/Write).
 *
 * Reads stdin per the Claude Code hook protocol. The settings.json wiring
 * is intentionally NOT landed here — Claude must surface the registration
 * step to the user for approval before flipping this hook live (see
 * SESSION_CONTEXT.md / the corresponding /todo entry once wired).
 */

const fs = require("node:fs");
const path = require("node:path");

const LABEL_ROOT = path.resolve(__dirname, "..");
const REPO_ROOT = path.resolve(LABEL_ROOT, "..", "..", "..");

// Lazy require so a missing dep or an early startup error doesn't crash the
// stdin handler before we can sanitize.
let helpers;
function loadHelpers() {
  if (helpers) return helpers;
  const { sanitize, logger } = require(path.join(LABEL_ROOT, "lib", "sanitize"));
  const { deriveCheapFields } = require(path.join(LABEL_ROOT, "lib", "derive"));
  const { fingerprint, sameFingerprint, parseFingerprint } = require(
    path.join(LABEL_ROOT, "lib", "fingerprint")
  );
  const { readCatalog, updateRecord, findRecord } = require(
    path.join(LABEL_ROOT, "lib", "catalog-io")
  );
  const { loadScope } = require(path.join(LABEL_ROOT, "lib", "scope-matcher"));
  const agentRunner = require(path.join(LABEL_ROOT, "lib", "agent-runner"));
  helpers = {
    sanitize,
    logger,
    deriveCheapFields,
    fingerprint,
    sameFingerprint,
    parseFingerprint,
    readCatalog,
    updateRecord,
    findRecord,
    loadScope,
    agentRunner,
  };
  return helpers;
}

const SHARED_CATALOG = path.join(LABEL_ROOT, "shared.jsonl");
const LOCAL_CATALOG = path.join(LABEL_ROOT, "local.jsonl");

// Fingerprint-change threshold that classifies an edit as MAJOR. We approximate
// "% content change" via normalized-length delta since SHA-256 itself carries
// no similarity signal. Callers with precise diff context can override.
const MAJOR_EDIT_LENGTH_RATIO = 0.2;

// Agent-output directory
const AGENT_OUTPUT_DIR = path.join(REPO_ROOT, ".claude", "state", "label-agent-output");

/**
 * Entry point — called once stdin is fully read.
 *
 * @param {object} payload - The parsed Claude Code hook payload
 * @returns {number} Exit code to return to Claude Code
 */
function handleHook(payload) {
  const { sanitize, logger } = loadHelpers();

  let step0Code = 0;
  try {
    step0Code = drainPendingQueue();
  } catch (err) {
    logger.error("label-hook Step 0 failed", err);
    // Surfacing past-failure handling itself is load-bearing; non-zero so
    // Claude sees the message.
    return 2;
  }

  try {
    processCurrentEdit(payload);
  } catch (err) {
    // Never block the user's Edit/Write on a current-edit error. Log via
    // sanitized logger; step0Code still propagates.
    process.stderr.write(`label-hook current-edit error: ${sanitize(err)}\n`);
  }

  return step0Code;
}

/**
 * Step 0 — Process the pending-agent queue. Complete → update catalog.
 * Failed / timed_out → surface via non-zero exit + stderr details.
 *
 * @returns {number} Exit code (0 = no pending failures, 2 = failures present)
 */
function drainPendingQueue() {
  const { agentRunner, logger, updateRecord } = loadHelpers();
  const entries = agentRunner.readQueue();
  if (entries.length === 0) return 0;

  const remaining = [];
  const failures = [];

  for (const entry of entries) {
    const verdict = agentRunner.classifyJob(entry);
    if (verdict === "complete") {
      try {
        applyAgentOutput(entry);
      } catch (err) {
        logger.error(`label-hook apply-output failed for ${entry.file_path}`, err);
        failures.push({ ...entry, verdict: "apply-failed" });
      }
    } else if (verdict === "timed_out" || verdict === "failed") {
      failures.push({ ...entry, verdict });
      // Also mark the catalog record so downstream tooling (e.g. audit skill)
      // can find orphan partial records.
      try {
        const catalog = catalogFor(entry.file_path);
        updateRecord(catalog, entry.file_path, (cur) => {
          if (!cur) return cur;
          return { ...cur, pending_agent_fill: false };
        });
      } catch (err) {
        // Non-fatal for user flow — the verdict is still surfaced via the
        // failures array below. Log so operators can diagnose recurring
        // catalog-write failures instead of silently swallowing them.
        logger.error(
          `label-hook catalog-clear failed for ${entry.file_path}`,
          err
        );
      }
    } else {
      remaining.push(entry);
    }
  }

  agentRunner.rewriteQueue(agentRunner.DEFAULT_PENDING_QUEUE, remaining);

  if (failures.length > 0) {
    process.stderr.write(
      `\n[label-hook] ${failures.length} pending job failure(s) require acknowledgement per D15:\n`
    );
    for (const f of failures) {
      process.stderr.write(
        `  - ${new Date(f.spawned_at).toISOString()}  job=${f.job_id}  verdict=${f.verdict}  file=${f.file_path}\n`
      );
    }
    process.stderr.write(
      `  Claude must present these to the user with decision options (retry / fix / skip-with-reason) before proceeding.\n`
    );
    return 2;
  }
  return 0;
}

/**
 * Step 1–5 — Derive cheap fields + write partial record + spawn async agent.
 *
 * @param {object} payload
 */
function processCurrentEdit(payload) {
  const {
    sanitize,
    logger,
    deriveCheapFields,
    fingerprint,
    findRecord,
    updateRecord,
    loadScope,
    agentRunner,
  } = loadHelpers();

  const filePath = extractFilePath(payload);
  if (!filePath) return; // Not an Edit/Write payload we can process

  const rel = toRepoRelative(filePath);
  if (!rel) return;

  const scope = loadScope();
  if (!scope.matches(rel)) return; // Out of scope — silent skip.

  let cheap;
  try {
    cheap = deriveCheapFields(path.join(REPO_ROOT, rel), { repoRoot: REPO_ROOT });
  } catch (err) {
    logger.warn(`label-hook cheap-derive skipped for ${rel}`, err);
    return;
  }

  const catalogPath = catalogFor(rel);
  const existing = findRecord(catalogPath, rel);
  const classification = classifyEdit(existing, cheap);

  const baseRecord = mergeRecord(existing, cheap, classification);

  if (classification === "MINOR") {
    try {
      updateRecord(catalogPath, rel, () => baseRecord);
    } catch (err) {
      logger.warn(`label-hook write (MINOR) failed for ${rel}`, err);
    }
    return;
  }

  // NEW or MAJOR — write partial + spawn async agent
  const partial = {
    ...baseRecord,
    status: "partial",
    pending_agent_fill: true,
  };
  try {
    updateRecord(catalogPath, rel, () => partial);
  } catch (err) {
    logger.warn(`label-hook write (partial) failed for ${rel}`, err);
    return;
  }

  try {
    fs.mkdirSync(AGENT_OUTPUT_DIR, { recursive: true });
    // Strip all filesystem-invalid characters (slashes, Windows-reserved
    // `<>:"|?*`, and control chars) + cap length so a path with unusual
    // chars doesn't produce an invalid output filename. Keeps the stem
    // human-readable in logs rather than hashing.
    const safeStem = rel
      .replace(/[\\/<>:"|?*\x00-\x1f]/g, "_")
      .slice(0, 120);
    const outputPath = path.join(
      AGENT_OUTPUT_DIR,
      `${safeStem}.${Date.now()}.json`
    );
    const prompt = buildAgentPrompt(rel, classification);
    agentRunner.runAgentAsync({
      prompt,
      filePath: rel,
      outputPath,
    });
  } catch (err) {
    // Spawn failure is non-blocking for the user's Edit/Write; the record
    // stays `partial` so the pre-commit validator will catch it and force
    // resolution later. Log sanitized.
    process.stderr.write(
      `[label-hook] agent spawn failed for ${rel}: ${sanitize(err)}\n`
    );
  }
}

// =========================================================
// Helpers
// =========================================================

function extractFilePath(payload) {
  if (!payload || typeof payload !== "object") return null;
  const toolInput = payload.tool_input ?? {};
  if (typeof toolInput.file_path === "string" && toolInput.file_path.length > 0) {
    return toolInput.file_path;
  }
  return null;
}

function toRepoRelative(filePath) {
  const abs = path.isAbsolute(filePath) ? filePath : path.resolve(REPO_ROOT, filePath);
  const rel = path.relative(REPO_ROOT, abs);
  if (/^\.\.(?:[\\/]|$)/.test(rel)) return null;
  return rel.split(path.sep).join("/");
}

/**
 * Choose the catalog file a record belongs in. MVP: everything goes to
 * `shared.jsonl` at the hook layer; back-fill + audit split shared vs
 * local using the record's `source_scope` (PLAN §S8).
 *
 * @param {string} _relPath
 * @returns {string}
 */
function catalogFor(_relPath) {
  return SHARED_CATALOG;
}

function classifyEdit(existing, cheap) {
  if (!existing) return "NEW";
  if (existing.type !== cheap.type) return "MAJOR";
  const prev = parseSize(existing.file_size);
  const curr = parseSize(cheap.file_size);
  if (prev > 0) {
    const ratio = Math.abs(curr - prev) / prev;
    if (ratio >= MAJOR_EDIT_LENGTH_RATIO) return "MAJOR";
  }
  if (existing.fingerprint && cheap.fingerprint && existing.fingerprint !== cheap.fingerprint) {
    return "MINOR";
  }
  return "MINOR";
}

function parseSize(v) {
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? n : 0;
}

function mergeRecord(existing, cheap, classification) {
  const now = new Date().toISOString();
  const base = existing ?? {
    path: cheap.path,
    manual_override: [],
    needs_review: [],
    schema_version: "1.2",
  };
  // Never overwrite fields listed in manual_override.
  const protectedFields = new Set(
    Array.isArray(base.manual_override) ? base.manual_override : []
  );
  const merged = { ...base };
  for (const [key, value] of Object.entries(cheap)) {
    if (protectedFields.has(key)) continue;
    merged[key] = value;
  }
  merged.content_hash = cheap.fingerprint;
  merged.last_hook_fire = now;
  // R1 Q11 / Qodo Sugg #3: always upgrade to the current schema_version
  // on every hook-fired merge, even if `base.schema_version` was an older
  // value (e.g. "1.1"). Records are being rewritten with v1.2 machinery
  // fields populated here — the stamp must reflect the write-time schema,
  // not the pre-existing read-time schema.
  merged.schema_version = "1.2";
  merged.manual_override = Array.isArray(base.manual_override) ? base.manual_override : [];
  merged.needs_review = Array.isArray(base.needs_review) ? base.needs_review : [];
  merged.pending_agent_fill = false;
  if (classification === "MINOR") {
    merged.status = base.status || "active";
  }
  return merged;
}

function buildAgentPrompt(relPath, classification) {
  return [
    `You are the Piece 3 label-derivation agent. A ${classification === "NEW" ? "new" : "major"} edit was made to ${relPath}.`,
    "",
    "Produce a JSON object with the understanding-field set per .claude/sync/label/docs/CATALOG_SHAPE.md §3 and the per-type extensions in .claude/sync/schema/SCHEMA.md §9.",
    "Fields required:",
    "  purpose, source_scope, runtime_scope, portability, dependencies,",
    "  external_services, tool_deps, mcp_dependencies, required_secrets,",
    "  lineage, supersedes, superseded_by, sanitize_fields, state_files,",
    "  notes, data_contracts, component_units, composite_id,",
    "  plus any per-type extensions the file's `type` mandates.",
    "",
    "Write the JSON object to $LABEL_AGENT_OUTPUT_PATH (environment variable).",
    "On any error, write {\"error\": \"<sanitized-message>\"} to that path instead of crashing silently.",
  ].join("\n");
}

function applyAgentOutput(entry) {
  const { updateRecord, agentRunner, logger } = loadHelpers();
  let output;
  try {
    output = agentRunner.readJobOutput(entry);
  } catch (err) {
    logger.error(`label-hook readJobOutput failed for ${entry.file_path}`, err);
    throw err;
  }
  if (output && typeof output === "object" && typeof output.error === "string") {
    // Agent reported a structured error. Clear pending flag; surface via
    // the pending-queue sweep.
    updateRecord(catalogFor(entry.file_path), entry.file_path, (cur) => {
      if (!cur) return cur;
      return { ...cur, pending_agent_fill: false, status: cur.status || "partial" };
    });
    throw new Error(output.error);
  }

  // Reject null, arrays, and primitives — applying a non-object to the
  // record would corrupt the catalog merge below.
  if (!output || typeof output !== "object" || Array.isArray(output)) {
    updateRecord(catalogFor(entry.file_path), entry.file_path, (cur) => {
      if (!cur) return cur;
      return { ...cur, pending_agent_fill: false, status: cur.status || "partial" };
    });
    throw new Error("agent output invalid (expected JSON object)");
  }

  updateRecord(catalogFor(entry.file_path), entry.file_path, (cur) => {
    const base = cur ?? { path: entry.file_path };
    // Strip prototype-pollution keys from agent output before spread. JSON
    // can parse `__proto__` / `constructor` / `prototype` as own properties;
    // even though `{...output}` uses CreateDataProperty and doesn't pollute
    // the prototype directly, the own-key copies surprise downstream code
    // (Object.assign, iteration, frozen-object assumptions). Agent output
    // is semi-trusted (we spawn it, but the prompt is large and agent
    // behaviour is not fully controlled). (Qodo Compliance #1 R5.)
    const DANGEROUS_KEYS = new Set(["__proto__", "constructor", "prototype"]);
    const sanitizedOutput = {};
    for (const key of Object.keys(output)) {
      if (DANGEROUS_KEYS.has(key)) continue;
      sanitizedOutput[key] = output[key];
    }
    const merged = { ...base, ...sanitizedOutput };
    // Lock primary key — never let agent output rewrite the record's path.
    // A hallucinated `path` would mismatch updateRecord's lookup key and
    // stall the job permanently. Pin after spread, before any other
    // protected-field logic. If `base.path` is missing / empty (corrupted
    // record), fall back to the queue entry's file_path. If BOTH are
    // missing, throw rather than silently write `undefined` as the primary
    // key — unreachable given upstream runAgentAsync validation of
    // filePath, but defence-in-depth against hand-edited queue files.
    // (Qodo Sugg#1 R4 + Sugg#5 R5.)
    const pinnedPath =
      typeof base.path === "string" && base.path.trim().length > 0
        ? base.path
        : typeof entry.file_path === "string" && entry.file_path.trim().length > 0
          ? entry.file_path
          : null;
    if (!pinnedPath) {
      throw new Error(
        "applyAgentOutput: cannot pin record path (base.path and entry.file_path both missing)"
      );
    }
    merged.path = pinnedPath;
    // Respect manual_override — don't let agent output clobber it.
    const protectedFields = new Set(
      Array.isArray(base.manual_override) ? base.manual_override : []
    );
    for (const field of protectedFields) {
      if (field in base) merged[field] = base[field];
    }
    // Coerce agent-controlled structural fields back to arrays so a
    // wrong-type agent output can't bypass the rule-layer's array-length
    // semantics. `needs_review` coerces to `["needs_review"]` (a
    // self-naming sentinel) rather than `[]` so bad-typed output doesn't
    // silently become `status:active`. `manual_override` coerces to `[]`
    // so protected-field logic can't crash. (Qodo Sugg R7.)
    if (!Array.isArray(merged.needs_review)) {
      merged.needs_review = ["needs_review"];
    }
    if (!Array.isArray(merged.manual_override)) {
      merged.manual_override = [];
    }
    merged.pending_agent_fill = false;
    merged.status = merged.needs_review.length > 0 ? "partial" : "active";
    merged.last_hook_fire = new Date().toISOString();
    return merged;
  });
}

// =========================================================
// Stdin entry point
// =========================================================

function readStdinAndHandle() {
  process.stdin.setEncoding("utf8");
  let buffer = "";
  process.stdin.on("error", (err) => {
    // Hook must not crash Claude's flow, but stdin failure must NOT skip
    // Step 0 (drainPendingQueue) — D15 contract requires past-job
    // failures to surface even when the current-edit payload is
    // unavailable. Run handleHook({}) so drainPendingQueue still fires;
    // current-edit processing gets a no-op empty payload. (Qodo Sugg R7
    // — real D15 contract gap my R6 fix left.)
    const code = err && typeof err.code === "string" ? err.code : "UNKNOWN";
    try {
      process.stderr.write(`[label-hook] stdin ${code}\n`);
    } catch {
      // Stderr itself failed — nothing useful we can do.
    }
    try {
      process.exit(handleHook({}));
    } catch {
      process.exit(0);
    }
  });
  process.stdin.on("data", (chunk) => {
    buffer += chunk;
  });
  process.stdin.on("end", () => {
    let payload = {};
    if (buffer.trim().length > 0) {
      try {
        payload = JSON.parse(buffer);
      } catch {
        // Invalid stdin — still drain Step 0 so D15 failures surface.
        // current-edit side gets no-op via empty payload. (Qodo Sugg R7.)
        try {
          process.stderr.write("[label-hook] invalid stdin payload (not JSON)\n");
        } catch {
          // Stderr itself failed — nothing useful we can do.
        }
        try {
          process.exit(handleHook({}));
        } catch {
          process.exit(0);
        }
      }
    }
    try {
      const code = handleHook(payload);
      process.exit(code);
    } catch (err) {
      const { sanitize } = loadHelpers();
      process.stderr.write(`label-hook fatal: ${sanitize(err)}\n`);
      // Non-zero ONLY for unhandled fatals; normal error paths exit 0 so the
      // user's Edit/Write is never blocked.
      process.exit(2);
    }
  });
}

if (require.main === module) {
  readStdinAndHandle();
}

module.exports = {
  handleHook,
  drainPendingQueue,
  processCurrentEdit,
  classifyEdit,
  mergeRecord,
  extractFilePath,
  toRepoRelative,
  catalogFor,
  SHARED_CATALOG,
  LOCAL_CATALOG,
  MAJOR_EDIT_LENGTH_RATIO,
};
