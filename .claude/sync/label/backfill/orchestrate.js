/**
 * orchestrate.js — Back-fill orchestrator (Plan §S8).
 *
 * Two roles:
 *   1. Barrel — re-exports the five module APIs so callers can `require
 *      ('./orchestrate')` once.
 *   2. Driver — `runBackfill()` walks the phases scan -> split -> dispatch
 *      -> cross-check -> preview, checkpointing between phases so a crashed
 *      session can resume.
 *
 * Agent dispatch is INJECTED — the module itself never spawns Claude Task
 * tool agents. A live Claude Code session (or an e2e test) provides
 * `dispatchPrimary` / `dispatchSecondary` / `synthesize` callbacks. This
 * matches the agent-runner.js §INLINE contract: "the orchestrator code
 * imports THIS module only for the pending-queue helpers, not the spawn
 * helpers."
 *
 * Error sanitization flows through each sub-module; this file only wraps
 * phase transitions.
 */

const path = require("node:path");

const scanMod = require("./scan");
const promptsMod = require("./prompts");
const crossCheckMod = require("./cross-check");
const checkpointMod = require("./checkpoint");
const previewMod = require("./preview");

const { sanitize, logger } = require("../lib/sanitize");

/**
 * Drive the back-fill end-to-end with injected agent dispatchers.
 *
 * **Trust model (R1 Q4/Q5 — Qodo compliance advisory):** The path
 * options below — `previewDir`, `checkpointPath`, and the
 * `opts.previewDir` / `opts.realDir` / `opts.auditPath` paths forwarded
 * to `approveAndPromote` — are expected to come from one of three
 * trusted sources:
 *
 *   1. Module-internal defaults (`PREVIEW_DIR`, `REAL_DIR`,
 *      `CHECKPOINT_PATH`, `PROMOTE_AUDIT_PATH`) derived from
 *      `__dirname` — not user input.
 *   2. Test fixtures authored by operators — tmpdir paths, not user
 *      input.
 *   3. Caller-side code in a live Claude session which itself does not
 *      accept user-prompt paths.
 *
 * No call site in this codebase passes a user-prompt-derived path
 * into these options. Path confinement against an allowedRoot was
 * evaluated and declined for R1 as speculative-attacker hardening
 * (Qodo ⚪ advisory, not 🔴). If a caller ever begins accepting
 * user-prompt paths, this contract MUST change — add an `allowedRoot`
 * option that rejects paths resolving outside it.
 *
 * @param {object} opts
 * @param {object} [opts.scanOpts] - passed to scan()
 * @param {object} [opts.splitOpts] - passed to splitBatches()
 * @param {(batch: object, batchId: string) => Promise<object[]> | object[]} opts.dispatchPrimary
 *   Returns array of primary records (one per file in batch)
 * @param {(batch: object, batchId: string) => Promise<object[]> | object[]} opts.dispatchSecondary
 *   Returns array of secondary records (same shape)
 * @param {(findings: object) => Promise<object> | object} [opts.synthesize]
 *   Optional synthesis step; receives { agreement_rate, disagreements, ... }
 * @param {string} [opts.previewDir]
 * @param {string} [opts.checkpointPath]
 * @param {boolean} [opts.resume=false] - honor existing checkpoint
 * @returns {Promise<{ preview: {shared, local}, summary?: object, scanResult, batches }>}
 */
async function runBackfill(opts) {
  if (!opts || typeof opts !== "object") {
    throw new TypeError("runBackfill: opts object required");
  }
  const {
    scanOpts = {},
    splitOpts = {},
    dispatchPrimary,
    dispatchSecondary,
    synthesize,
    previewDir,
    checkpointPath,
    resume = false,
  } = opts;

  if (typeof dispatchPrimary !== "function" || typeof dispatchSecondary !== "function") {
    throw new TypeError("runBackfill: dispatchPrimary and dispatchSecondary callbacks required");
  }

  const ts = () => new Date().toISOString();
  const cp = (phase, extra = {}) =>
    checkpointMod.saveCheckpoint(
      { ts: ts(), phase, ...extra },
      checkpointPath ? { path: checkpointPath } : {}
    );

  let resumeState = null;
  let resumeHistory = null;
  if (resume) {
    try {
      resumeState = checkpointMod.loadCheckpoint(checkpointPath ? { path: checkpointPath } : {});
      resumeHistory = checkpointMod.loadCheckpointHistory(checkpointPath ? { path: checkpointPath } : {});
    } catch (err) {
      throw new Error(`runBackfill: resume checkpoint load failed: ${sanitize(err)}`);
    }
  }

  const scanResult = scanMod.scan(scanOpts);
  cp("scan", { file_count: scanResult.files.length });

  const batches = scanMod.splitBatches(scanResult.files, splitOpts);
  cp("split", { batch_total: batches.length });

  // R1 Q1 / Gemini G1: resume is only correctness-safe when per-batch
  // cross-check outputs persist, otherwise skipped batches produce a
  // preview missing their records. We checkpoint each batch's results
  // under phase:"cross-check-result" below, and here we rehydrate
  // allCrossChecked from history before dispatching remaining batches.
  //
  // Rehydration rule: only pull in cross-check-result entries whose
  // `batch_index` is in completedBatches — otherwise a checkpoint file
  // that survived a fuller prior run (then got overwritten with a
  // smaller completed_batches set) would cause us to rehydrate batches
  // that will ALSO be re-dispatched below, producing duplicates.
  const allCrossChecked = [];
  let completedBatches;
  if (resume && Array.isArray(resumeState?.completed_batches)) {
    completedBatches = new Set(resumeState.completed_batches);
    // Newest wins on batch_index: scan from most-recent entry backward,
    // keep the first result seen per batch_index, gated on the claimed
    // completedBatches set. Dedupe by path within kept batches.
    const seenBatchIdx = new Set();
    const seenPaths = new Set();
    if (Array.isArray(resumeHistory)) {
      for (let i = resumeHistory.length - 1; i >= 0; i--) {
        const entry = resumeHistory[i];
        if (!entry || entry.phase !== "cross-check-result") continue;
        if (!Array.isArray(entry.results)) continue;
        const idx = Number(entry.batch_index);
        if (!Number.isFinite(idx)) continue;
        if (!completedBatches.has(idx)) continue;
        if (seenBatchIdx.has(idx)) continue;
        seenBatchIdx.add(idx);
        for (const r of entry.results) {
          if (!r || typeof r !== "object") continue;
          const key = r.path || null;
          if (key && seenPaths.has(key)) continue;
          if (key) seenPaths.add(key);
          allCrossChecked.push(r);
        }
      }
    }
    // R2 Q1: per-batch missing-rehydration detection. The R1 safety
    // valve was "if ANY claimed batch is missing results, drop the
    // ENTIRE skip set" — correct but wasteful: a partial-truncation
    // that drops one batch's results would force re-dispatch of every
    // completed batch. Now we detect the specific missing batch_index
    // set and only re-dispatch those, preserving rehydrated batches.
    // Qodo Sugg #1 R2 (9/10).
    const missing = [...completedBatches].filter(
      (idx) => !seenBatchIdx.has(idx)
    );
    if (missing.length > 0) {
      logger.warn(
        `runBackfill: resume claimed ${completedBatches.size} completed ` +
          `batches, but cross-check-result rows missing for batches: ` +
          `${missing.join(", ")} — re-dispatching missing batches only`
      );
      for (const idx of missing) completedBatches.delete(idx);
    }
  } else {
    completedBatches = new Set();
  }

  for (let i = 0; i < batches.length; i++) {
    if (completedBatches.has(i)) continue;
    const batch = batches[i];
    const batchId = `B${i + 1}`;

    cp("dispatching", { batch_index: i, batch_total: batches.length });

    let primaryRecords;
    let secondaryRecords;
    try {
      primaryRecords = await dispatchPrimary(batch, batchId);
      secondaryRecords = await dispatchSecondary(batch, batchId);
    } catch (err) {
      throw new Error(`runBackfill: dispatch for ${batchId} failed: ${sanitize(err)}`);
    }

    // R1 Gemini G3: dispatcher contract promises an array per file. A
    // callback that returns null / error-object / undefined would crash
    // .find() below. Validate at the trust boundary so the message names
    // the offending dispatcher instead of surfacing as a TypeError.
    if (!Array.isArray(primaryRecords)) {
      throw new TypeError(
        `runBackfill: dispatchPrimary for ${batchId} must return an array, got ${typeof primaryRecords}`
      );
    }
    if (!Array.isArray(secondaryRecords)) {
      throw new TypeError(
        `runBackfill: dispatchSecondary for ${batchId} must return an array, got ${typeof secondaryRecords}`
      );
    }

    const pairs = batch.files.map((f) => {
      const p = primaryRecords.find((r) => r && r.path === f.path) ?? null;
      const s = secondaryRecords.find((r) => r && r.path === f.path) ?? null;
      return { path: f.path, primary: p, secondary: s };
    });

    const results = crossCheckMod.crossCheckBatch(pairs);
    for (const r of results) allCrossChecked.push(r);

    completedBatches.add(i);
    // Persist per-batch outputs so a crashed session can resume without
    // losing these records. Kept as a separate phase entry so the resume
    // path can scan loadCheckpointHistory() for exactly these rows.
    cp("cross-check-result", {
      batch_index: i,
      batch_total: batches.length,
      results,
    });
    cp("cross-checking", {
      batch_index: i,
      batch_total: batches.length,
      completed_batches: [...completedBatches],
    });
  }

  const previewRecords = allCrossChecked
    .filter((r) => r && r.preview)
    .map((r) => r.preview);
  const unreachablePaths = allCrossChecked
    .filter((r) => r && r.unreachable)
    .map((r) => r.path);

  const previewOpts = previewDir ? { previewDir } : {};
  const writeResult = previewMod.writePreview(previewRecords, previewOpts);
  cp("preview-written", {
    batch_total: batches.length,
    completed_batches: [...completedBatches],
    artifacts: {
      preview_dir: previewDir || previewMod.PREVIEW_DIR,
      shared_count: writeResult.counts.shared,
      local_count: writeResult.counts.local,
    },
  });

  let summary;
  if (typeof synthesize === "function") {
    const agreementRate =
      previewRecords.length === 0
        ? 1
        : previewRecords.filter((r) => Array.isArray(r.needs_review) && r.needs_review.length === 0)
            .length / previewRecords.length;
    const disagreements = allCrossChecked.flatMap((r) =>
      (r?.disagreements || []).map((d) => ({ path: r.path, ...d }))
    );
    summary = await synthesize({
      agreement_rate: agreementRate,
      record_count: previewRecords.length,
      unreachable: unreachablePaths,
      disagreements,
    });
  }

  return {
    scanResult,
    batches,
    preview: {
      shared: writeResult.sharedPath,
      local: writeResult.localPath,
      counts: writeResult.counts,
    },
    summary,
    unreachable: unreachablePaths,
  };
}

/**
 * Approve the current preview → atomic promotion to real catalog.
 * Convenience wrapper; callers can also call previewMod.promotePreview() directly.
 *
 * Appends a promotion audit row to `.claude/state/label-promote-audit.jsonl`
 * alongside the checkpoint write, so critical catalog-change actions have
 * a reconstructable trail separate from the (transient) checkpoint file
 * (R1 Q7 — Generic: Comprehensive Audit Trails compliance). The
 * `auditPath` option overrides the default location for tests.
 *
 * @param {object} [opts]
 * @param {string} [opts.previewDir]
 * @param {string} [opts.realDir]
 * @param {string} [opts.checkpointPath]
 * @param {string} [opts.auditPath] - Override default promote-audit log path
 * @returns {{sharedPath, localPath, counts}}
 */
function approveAndPromote(opts = {}) {
  const result = previewMod.promotePreview(opts);
  const ts = new Date().toISOString();
  checkpointMod.saveCheckpoint(
    { ts, phase: "promoted", artifacts: result },
    opts.checkpointPath ? { path: opts.checkpointPath } : {}
  );

  // R2 Compliance (Comprehensive Audit Trails / Qodo ⚪): include an
  // operator identity so audit rows are reconstructable per-actor. For
  // JASON-OS (single-user dev CLI) this is the OS-level username from
  // `os.userInfo().username`, with env-var fallback. Not a security-
  // bearing identity (no auth system exists); it's forensic signal.
  let operatorId = "unknown";
  try {
    operatorId =
      require("node:os").userInfo().username ||
      process.env.USER ||
      process.env.USERNAME ||
      "unknown";
  } catch {
    operatorId = process.env.USER || process.env.USERNAME || "unknown";
  }
  const auditEntry = {
    ts,
    action: "promote-preview-to-real",
    outcome: "success",
    operator_id: operatorId,
    shared_path: result.sharedPath,
    local_path: result.localPath,
    counts: result.counts,
  };
  try {
    appendPromoteAudit(auditEntry, opts.auditPath);
  } catch (err) {
    // Audit-trail failure is surfaced but not fatal — the promotion
    // itself succeeded. Sanitized.
    logger.error(`approveAndPromote: audit append failed: ${sanitize(err)}`);
  }
  return result;
}

/**
 * Default promote-audit log path. `.claude/state/` is gitignored.
 */
const PROMOTE_AUDIT_PATH = require("node:path").join(
  __dirname,
  "..",
  "..",
  "..",
  "..",
  ".claude",
  "state",
  "label-promote-audit.jsonl"
);

/**
 * Append a JSONL audit row. Creates the directory on first write.
 * @param {object} entry
 * @param {string} [overridePath]
 */
function appendPromoteAudit(entry, overridePath) {
  const fs = require("node:fs");
  const path = require("node:path");
  const abs = overridePath || PROMOTE_AUDIT_PATH;
  fs.mkdirSync(path.dirname(abs), { recursive: true });
  fs.appendFileSync(abs, JSON.stringify(entry) + "\n", "utf8");
}

/**
 * Reject the preview → clear it so a re-run produces fresh output.
 *
 * @param {object} [opts]
 */
function rejectAndClear(opts = {}) {
  previewMod.clearPreview(opts);
}

module.exports = {
  // driver
  runBackfill,
  approveAndPromote,
  rejectAndClear,
  PROMOTE_AUDIT_PATH,

  // scan
  scan: scanMod.scan,
  splitBatches: scanMod.splitBatches,
  formatAllocation: scanMod.formatAllocation,

  // prompts
  buildPrimaryPrompt: promptsMod.buildPrimaryPrompt,
  buildSecondaryPrompt: promptsMod.buildSecondaryPrompt,
  buildSynthesisPrompt: promptsMod.buildSynthesisPrompt,
  PRIMARY_TEMPLATE: promptsMod.PRIMARY_TEMPLATE,
  SECONDARY_TEMPLATE: promptsMod.SECONDARY_TEMPLATE,
  SYNTHESIS_TEMPLATE: promptsMod.SYNTHESIS_TEMPLATE,

  // cross-check
  crossCheck: crossCheckMod.crossCheck,
  crossCheckBatch: crossCheckMod.crossCheckBatch,

  // checkpoint
  CHECKPOINT_PATH: checkpointMod.CHECKPOINT_PATH,
  saveCheckpoint: checkpointMod.saveCheckpoint,
  loadCheckpoint: checkpointMod.loadCheckpoint,
  loadCheckpointHistory: checkpointMod.loadCheckpointHistory,
  clearCheckpoint: checkpointMod.clearCheckpoint,

  // preview
  PREVIEW_DIR: previewMod.PREVIEW_DIR,
  REAL_DIR: previewMod.REAL_DIR,
  SHARED_BASENAME: previewMod.SHARED_BASENAME,
  LOCAL_BASENAME: previewMod.LOCAL_BASENAME,
  splitBySourceScope: previewMod.splitBySourceScope,
  writePreview: previewMod.writePreview,
  promotePreview: previewMod.promotePreview,
  clearPreview: previewMod.clearPreview,
  previewExists: previewMod.previewExists,
};
