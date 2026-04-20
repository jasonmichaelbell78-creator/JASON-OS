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

const { sanitize } = require("../lib/sanitize");

/**
 * Drive the back-fill end-to-end with injected agent dispatchers.
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
  if (resume) {
    try {
      resumeState = checkpointMod.loadCheckpoint(checkpointPath ? { path: checkpointPath } : {});
    } catch (err) {
      throw new Error(`runBackfill: resume checkpoint load failed: ${sanitize(err)}`);
    }
  }

  const scanResult = scanMod.scan(scanOpts);
  cp("scan", { file_count: scanResult.files.length });

  const batches = scanMod.splitBatches(scanResult.files, splitOpts);
  cp("split", { batch_total: batches.length });

  const allCrossChecked = [];
  const completedBatches = Array.isArray(resumeState?.completed_batches)
    ? new Set(resumeState.completed_batches)
    : new Set();

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

    const pairs = batch.files.map((f) => {
      const p = primaryRecords.find((r) => r && r.path === f.path) ?? null;
      const s = secondaryRecords.find((r) => r && r.path === f.path) ?? null;
      return { path: f.path, primary: p, secondary: s };
    });

    const results = crossCheckMod.crossCheckBatch(pairs);
    for (const r of results) allCrossChecked.push(r);

    completedBatches.add(i);
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
 * @param {object} [opts]
 * @param {string} [opts.previewDir]
 * @param {string} [opts.realDir]
 * @param {string} [opts.checkpointPath]
 * @returns {{sharedPath, localPath, counts}}
 */
function approveAndPromote(opts = {}) {
  const result = previewMod.promotePreview(opts);
  checkpointMod.saveCheckpoint(
    { ts: new Date().toISOString(), phase: "promoted", artifacts: result },
    opts.checkpointPath ? { path: opts.checkpointPath } : {}
  );
  return result;
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
