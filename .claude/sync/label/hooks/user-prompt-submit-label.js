#!/usr/bin/env node
/**
 * user-prompt-submit-label.js — UserPromptSubmit surfacing hook (PLAN §S4).
 *
 * Implements D15 path 2 — prepend a warning to the next user prompt until
 * Claude has acknowledged all pending label-system failures. This is the
 * backstop if the PostToolUse hook's Step 0 surfacing was missed or
 * dismissed: every subsequent user prompt carries the warning forward.
 *
 * Protocol:
 *   stdin  — Claude Code UserPromptSubmit payload (JSON; we care about
 *            the event shape only — we don't need to echo the prompt).
 *   stdout — When failures are pending, print the warning block as
 *            additional context for Claude's next turn. When the queue
 *            is clean, stay silent.
 *   exit   — 0 normally. Non-zero ONLY if the hook's own state-file read
 *            collapsed so the operator knows the surfacing plumbing itself
 *            is broken (the hook's own failure must not be silent per D15).
 *
 * The hook never blocks the prompt — it just annotates. Claude's behavior
 * on seeing the annotation is governed by feedback_ack_requires_approval.
 *
 * Settings.json wiring is NOT landed here — same dormant-until-approved
 * posture as post-tool-use-label.js. See sibling hook for rationale.
 */

const path = require("node:path");

const LABEL_ROOT = path.resolve(__dirname, "..");

let helpers;
function loadHelpers() {
  if (helpers) return helpers;
  const { sanitize, logger } = require(path.join(LABEL_ROOT, "lib", "sanitize"));
  const agentRunner = require(path.join(LABEL_ROOT, "lib", "agent-runner"));
  helpers = { sanitize, logger, agentRunner };
  return helpers;
}

/**
 * Entry point — evaluate the pending-failure queue and emit context if
 * needed.
 *
 * @param {object} [options]
 * @param {string} [options.queuePath] - Override the queue location (tests).
 * @returns {{code: number, output: string}}
 */
function evaluate(options = {}) {
  const { sanitize, agentRunner } = loadHelpers();
  const queuePath = options.queuePath ?? agentRunner.DEFAULT_PENDING_QUEUE;

  let entries;
  try {
    entries = agentRunner.readQueue(queuePath);
  } catch (err) {
    // Read-side failure: the surfacing plumbing itself is broken. Emit its
    // own warning (via stdout so Claude sees it) AND exit non-zero.
    const msg = sanitize(err);
    return {
      code: 2,
      output: buildOwnFailureWarning(msg),
    };
  }

  if (entries.length === 0) return { code: 0, output: "" };

  const failures = entries
    .map((entry) => ({ entry, verdict: agentRunner.classifyJob(entry) }))
    .filter((row) => row.verdict === "failed" || row.verdict === "timed_out");

  if (failures.length === 0) {
    // Queue is non-empty but only "running" jobs — nothing actionable yet.
    return { code: 0, output: "" };
  }

  return { code: 0, output: buildFailureWarning(failures) };
}

/**
 * Format the pending-failure warning block per PLAN §S4.
 * @param {Array<{entry: object, verdict: string}>} failures
 * @returns {string}
 */
function buildFailureWarning(failures) {
  const sorted = [...failures].sort(
    (a, b) => Number(a.entry.spawned_at) - Number(b.entry.spawned_at)
  );
  const lines = [];
  lines.push("[LABEL-SYSTEM — acknowledgement required]");
  lines.push("Unresolved failures (oldest first):");
  for (const { entry, verdict } of sorted) {
    const when = Number.isFinite(Number(entry.spawned_at))
      ? new Date(Number(entry.spawned_at)).toISOString()
      : "<unknown-time>";
    const file = typeof entry.file_path === "string" ? entry.file_path : "<no-path>";
    const job = typeof entry.job_id === "string" ? entry.job_id : "<no-id>";
    lines.push(`- ${when}: ${verdict} — ${file} (job=${job})`);
  }
  lines.push(
    "Claude must present these with decision options (retry / fix / skip-with-reason) BEFORE proceeding with the user's request below."
  );
  lines.push("");
  lines.push("===");
  lines.push("");
  return lines.join("\n");
}

/**
 * Warning for the hook's own read-side failure.
 * @param {string} sanitizedMessage
 * @returns {string}
 */
function buildOwnFailureWarning(sanitizedMessage) {
  return [
    "[LABEL-SYSTEM — hook self-failure]",
    "The user-prompt-submit label hook could not read its pending-failures queue.",
    `Reason: ${sanitizedMessage}`,
    "This means the D15 path-2 surfacing is disabled for this turn. Claude must surface this to the user before proceeding with anything label-system-adjacent.",
    "",
    "===",
    "",
  ].join("\n");
}

// =========================================================
// Stdin entry point
// =========================================================

function readStdinAndHandle() {
  process.stdin.setEncoding("utf8");
  let buffer = "";
  process.stdin.on("error", () => {
    process.exit(0);
  });
  process.stdin.on("data", (chunk) => {
    buffer += chunk;
  });
  process.stdin.on("end", () => {
    // Parse for side-effect only (future-proofing: we may want to scope
    // warnings to specific agents or sessions). Invalid JSON → silent bail
    // so we never block Claude's flow on bad stdin.
    if (buffer.trim().length > 0) {
      try {
        JSON.parse(buffer);
      } catch {
        process.exit(0);
      }
    }
    try {
      const queuePath = process.env.LABEL_PENDING_QUEUE_OVERRIDE;
      const { code, output } = evaluate(queuePath ? { queuePath } : {});
      if (output.length > 0) process.stdout.write(output);
      process.exit(code);
    } catch (err) {
      const { sanitize } = loadHelpers();
      process.stderr.write(`user-prompt-submit-label fatal: ${sanitize(err)}\n`);
      process.exit(2);
    }
  });
}

if (require.main === module) {
  readStdinAndHandle();
}

module.exports = {
  evaluate,
  buildFailureWarning,
  buildOwnFailureWarning,
};
