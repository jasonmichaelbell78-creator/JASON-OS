/**
 * checkpoint.js — Piece 3 S8 back-fill orchestrator resume-safe checkpoint.
 *
 * Persists orchestrator state as append-only JSONL at
 * `.claude/state/label-backfill-checkpoint.jsonl` so a crash mid-run can be
 * resumed from the last completed batch (PLAN §S8 step 6).
 *
 * File I/O routes through `scripts/lib/safe-fs.js` — no raw `fs.writeFileSync`
 * — matching the append-under-lock pattern in `lib/agent-runner.js` lines
 * 175–275. Errors are routed through `../lib/sanitize` so raw
 * `error.message` never escapes (CLAUDE.md §5 anti-pattern row 1).
 *
 * Module API:
 *   CHECKPOINT_PATH           — resolved absolute path constant
 *   saveCheckpoint(state,{path}) — atomic JSONL append
 *   loadCheckpoint({path})       — returns LATEST state or null
 *   loadCheckpointHistory({path})— returns full state[] in order
 *   clearCheckpoint({path})      — removes file; ENOENT-idempotent
 *
 * Module is schema-agnostic beyond requiring `ts` (auto-populated) and
 * `phase` (must be non-empty string) — broader shape lives in PLAN §S8.
 */

const fs = require("node:fs");
const path = require("node:path");

// backfill/checkpoint.js -> repo root is 4 levels up
// (backfill -> label -> sync -> .claude -> repo root)
const REPO_ROOT_SENTINEL = path.join(__dirname, "..", "..", "..", "..");
const { safeAtomicWriteSync, readTextWithSizeGuard, withLock } = require(
  path.join(REPO_ROOT_SENTINEL, "scripts", "lib", "safe-fs.js")
);
const { sanitize } = require("../lib/sanitize");

const CHECKPOINT_PATH = path.join(
  REPO_ROOT_SENTINEL,
  ".claude",
  "state",
  "label-backfill-checkpoint.jsonl"
);

/**
 * Validate + (lightly) normalize a state object before persisting.
 * Synthesizes `ts` when absent; throws when `phase` is missing.
 *
 * @param {object} state
 * @returns {object} state with `ts` guaranteed
 */
function normalizeState(state) {
  if (!state || typeof state !== "object" || Array.isArray(state)) {
    throw new TypeError("checkpoint.saveCheckpoint: state must be a plain object");
  }
  const out = { ...state };
  if (typeof out.ts !== "string" || out.ts.length === 0) {
    out.ts = new Date().toISOString();
  }
  if (typeof out.phase !== "string" || out.phase.length === 0) {
    throw new Error(
      "checkpoint.saveCheckpoint: state.phase is required and must be a non-empty string"
    );
  }
  return out;
}

/**
 * Append one checkpoint state to the JSONL file. Atomic under advisory lock.
 *
 * @param {object} state - Orchestrator state snapshot
 * @param {object} [opts]
 * @param {string} [opts.path] - Override path (testing)
 */
function saveCheckpoint(state, opts = {}) {
  const normalized = normalizeState(state);
  const abs = path.resolve(opts.path || CHECKPOINT_PATH);
  const dir = path.dirname(abs);
  try {
    fs.mkdirSync(dir, { recursive: true });
  } catch (err) {
    throw new Error(`checkpoint.saveCheckpoint: mkdir failed: ${sanitize(err)}`);
  }
  withLock(abs, () => {
    let existing = "";
    let hasContent = false;
    try {
      hasContent = fs.statSync(abs).size > 0;
    } catch (err) {
      if (err && err.code === "ENOENT") {
        hasContent = false;
      } else {
        throw new Error(
          `checkpoint.saveCheckpoint: stat failed: ${sanitize(err)}`
        );
      }
    }
    if (hasContent) {
      try {
        existing = readTextWithSizeGuard(abs);
      } catch (err) {
        throw new Error(
          `checkpoint.saveCheckpoint: existing checkpoint read failed: ${sanitize(err)}`
        );
      }
      if (existing.length > 0 && !existing.endsWith("\n")) existing += "\n";
    }
    const payload = `${existing}${JSON.stringify(normalized)}\n`;
    try {
      safeAtomicWriteSync(abs, payload, { encoding: "utf8" });
    } catch (err) {
      throw new Error(
        `checkpoint.saveCheckpoint: atomic write failed: ${sanitize(err)}`
      );
    }
  });
}

/**
 * Parse the entire checkpoint file into an array of state objects.
 * Blank lines skipped. Malformed lines throw (resume safety — corrupt
 * checkpoint must be surfaced, not silently skipped).
 *
 * @param {string} abs - Absolute path
 * @returns {object[]}
 */
function parseAll(abs) {
  let size = 0;
  try {
    size = fs.statSync(abs).size;
  } catch (err) {
    if (err && err.code === "ENOENT") return [];
    throw new Error(`checkpoint.load: stat failed: ${sanitize(err)}`);
  }
  if (size === 0) return [];
  let text;
  try {
    text = readTextWithSizeGuard(abs);
  } catch (err) {
    throw new Error(`checkpoint.load: read failed: ${sanitize(err)}`);
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
        `checkpoint.load: line ${lineNo} malformed JSON: ${sanitize(err)}`
      );
    }
  }
  return out;
}

/**
 * Return the latest checkpoint state, or null if no file / empty file.
 *
 * @param {object} [opts]
 * @param {string} [opts.path]
 * @returns {object|null}
 */
function loadCheckpoint(opts = {}) {
  const abs = path.resolve(opts.path || CHECKPOINT_PATH);
  const all = parseAll(abs);
  if (all.length === 0) return null;
  return all[all.length - 1];
}

/**
 * Return all checkpoint states in file order.
 *
 * @param {object} [opts]
 * @param {string} [opts.path]
 * @returns {object[]}
 */
function loadCheckpointHistory(opts = {}) {
  const abs = path.resolve(opts.path || CHECKPOINT_PATH);
  return parseAll(abs);
}

/**
 * Remove the checkpoint file. Idempotent on ENOENT; other errors sanitized
 * and re-thrown.
 *
 * @param {object} [opts]
 * @param {string} [opts.path]
 */
function clearCheckpoint(opts = {}) {
  const abs = path.resolve(opts.path || CHECKPOINT_PATH);
  try {
    fs.unlinkSync(abs);
  } catch (err) {
    if (err && err.code === "ENOENT") return;
    throw new Error(`checkpoint.clearCheckpoint: unlink failed: ${sanitize(err)}`);
  }
}

module.exports = {
  CHECKPOINT_PATH,
  saveCheckpoint,
  loadCheckpoint,
  loadCheckpointHistory,
  clearCheckpoint,
};
