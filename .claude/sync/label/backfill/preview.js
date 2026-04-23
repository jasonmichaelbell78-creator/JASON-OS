/**
 * preview.js — Piece 3 S8 preview gate (D9c).
 *
 * The back-fill orchestrator writes its proposed catalog to
 * `.claude/sync/label/preview/{shared,local}.jsonl` FIRST, so the user can
 * approve/reject before anything touches the real catalog. On approve, the
 * preview is promoted atomically to the real `.claude/sync/label/` directory.
 *
 * Split rule (per DERIVATION_RULES.md §3.2 `source_scope`):
 *   - shared.jsonl  ← `universal`, `user`  (travels to other repos / operator)
 *   - local.jsonl   ← `project`, `machine`, `ephemeral`  (this repo / host only)
 *   - missing       → shared  (safer; will appear in needs_review anyway)
 *
 * All file I/O goes through `catalog-io.writeCatalog` / `readCatalog` so
 * atomic semantics stay in one place (Piece 4 single-point-of-change).
 *
 * ROLLBACK STRATEGY (promotePreview)
 * ----------------------------------
 * A "real catalog promotion" writes two files (shared + local). If the
 * second write fails after the first has already succeeded, the real
 * catalog is left in a torn state (new shared + old local). To avoid that:
 *
 *   1. Read both preview files up-front. If either read fails, throw BEFORE
 *      touching the real directory. Nothing is half-applied.
 *   2. Snapshot the existing real files (if any) into an in-memory backup
 *      BEFORE any write. Backup is:
 *        - the current on-disk records (if readable), OR
 *        - `null` sentinel meaning "no real file existed; rollback = delete"
 *   3. Write the new real shared.jsonl. If this step fails, no state has
 *      changed yet — just re-throw.
 *   4. Write the new real local.jsonl. If THIS step fails, the real
 *      catalog is torn. Restore the shared snapshot (via writeCatalog or
 *      unlink if the backup was `null`) then re-throw the original error.
 *
 * Because `catalog-io.writeCatalog` is itself atomic (tmp + rename), each
 * individual step is either fully-applied or not-applied. The rollback
 * only has to handle the "first succeeded, second failed" gap between the
 * two writeCatalog calls. Rollback failures are surfaced alongside the
 * original error so the user sees the full picture (torn state + reason).
 */

const fs = require("node:fs");
const path = require("node:path");

const { readCatalog, writeCatalog } = require("../lib/catalog-io");
const { sanitize } = require("../lib/sanitize");

// Repo root: backfill/ -> label/ -> sync/ -> .claude/ -> <repo root>
const REPO_ROOT = path.resolve(__dirname, "..", "..", "..", "..");

const PREVIEW_DIR = path.join(REPO_ROOT, ".claude", "sync", "label", "preview");
const REAL_DIR = path.join(REPO_ROOT, ".claude", "sync", "label");
const SHARED_BASENAME = "shared.jsonl";
const LOCAL_BASENAME = "local.jsonl";

// source_scope values that stay on this machine / this project / this session
const LOCAL_SCOPES = new Set(["project", "machine", "ephemeral"]);
// source_scope values that cross repos or follow the operator
const SHARED_SCOPES = new Set(["universal", "user"]);

/**
 * Split an array of catalog records into shared vs local buckets based on
 * their `source_scope` field. Records missing `source_scope` fall through to
 * `shared` — safer default since unknown-scope records will already be
 * flagged in needs_review; keeping them shared avoids silently losing them
 * when a downstream repo syncs.
 *
 * @param {object[]} records
 * @returns {{ shared: object[], local: object[] }}
 */
function splitBySourceScope(records) {
  if (!Array.isArray(records)) {
    throw new TypeError("preview.splitBySourceScope: records must be an array");
  }
  const shared = [];
  const local = [];
  for (const record of records) {
    const scope = record && typeof record === "object" ? record.source_scope : undefined;
    if (LOCAL_SCOPES.has(scope)) {
      local.push(record);
    } else if (SHARED_SCOPES.has(scope)) {
      shared.push(record);
    } else {
      // missing / unrecognized — default shared (will be in needs_review)
      shared.push(record);
    }
  }
  return { shared, local };
}

/**
 * Ensure `dir` exists (recursive mkdir). Sanitizes any error.
 * @param {string} dir
 */
function ensureDir(dir) {
  try {
    fs.mkdirSync(dir, { recursive: true });
  } catch (err) {
    throw new Error(`preview: mkdir failed: ${sanitize(err)}`);
  }
}

/**
 * Write the proposed catalog to the preview directory, splitting by
 * `source_scope`. Overwrites any prior preview. Both files are written
 * atomically via `catalog-io.writeCatalog`.
 *
 * @param {object[]} records
 * @param {object} [opts]
 * @param {string} [opts.previewDir] - override (test isolation)
 * @returns {{ sharedPath: string, localPath: string, counts: { shared: number, local: number } }}
 */
function writePreview(records, opts = {}) {
  const previewDir = opts.previewDir ?? PREVIEW_DIR;
  ensureDir(previewDir);

  const { shared, local } = splitBySourceScope(records);
  const sharedPath = path.join(previewDir, SHARED_BASENAME);
  const localPath = path.join(previewDir, LOCAL_BASENAME);

  try {
    writeCatalog(sharedPath, shared);
  } catch (err) {
    throw new Error(`preview.writePreview: shared write failed: ${sanitize(err)}`);
  }
  try {
    writeCatalog(localPath, local);
  } catch (err) {
    // R2 Q6: failure-atomic preview — if local write fails after shared
    // landed, clean up the half-written shared so the preview dir is
    // either fully populated or empty. Re-running writePreview would
    // otherwise leave a stale mismatched shared+local pair on disk.
    let cleanupErr = null;
    try {
      require("node:fs").rmSync(sharedPath, { force: true });
    } catch (rmErr) {
      cleanupErr = sanitize(rmErr);
    }
    const primary = `preview.writePreview: local write failed: ${sanitize(err)}`;
    if (cleanupErr !== null) {
      throw new Error(
        `${primary}; cleanup of partial shared ALSO failed: ${cleanupErr}`
      );
    }
    throw new Error(`${primary}; cleaned partial shared preview`);
  }

  return {
    sharedPath,
    localPath,
    counts: { shared: shared.length, local: local.length },
  };
}

/**
 * True iff BOTH preview files exist and are readable (stat succeeds).
 * Used as the approve-gate precondition.
 *
 * @param {object} [opts]
 * @param {string} [opts.previewDir]
 * @returns {boolean}
 */
function previewExists(opts = {}) {
  const previewDir = opts.previewDir ?? PREVIEW_DIR;
  const sharedPath = path.join(previewDir, SHARED_BASENAME);
  const localPath = path.join(previewDir, LOCAL_BASENAME);
  try {
    return fs.statSync(sharedPath).isFile() && fs.statSync(localPath).isFile();
  } catch {
    return false;
  }
}

/**
 * Read an existing real catalog into memory as a rollback snapshot.
 * Returns `null` if the file does not exist (meaning "rollback = delete").
 * Any other read error propagates — we refuse to start a promotion we
 * can't cleanly undo.
 *
 * @param {string} realPath
 * @returns {object[] | null}
 */
function snapshotReal(realPath) {
  // R1 Q2: avoid fs.existsSync TOCTOU — CLAUDE.md §5 row 3 forbids
  // existsSync pre-checks. We try the read directly and map ENOENT to
  // "no snapshot needed" (rollback = delete). Note we can't just call
  // readCatalog() here because that helper itself swallows ENOENT and
  // returns [] — we need to distinguish "missing" from "empty" so the
  // rollback path knows whether to delete (null) vs rewrite-empty ([]).
  let raw;
  try {
    raw = fs.readFileSync(realPath, "utf8");
  } catch (err) {
    if (err && err.code === "ENOENT") return null;
    throw new Error(`preview.promotePreview: snapshot read failed: ${sanitize(err)}`);
  }
  // Now that the read succeeded, delegate to readCatalog for parse
  // semantics. This second call races ENOENT in theory, but in
  // practice the atomic writers elsewhere in this module guarantee
  // the file is either fully written or absent — the race is closed
  // by our own writers (catalog-io uses atomic rename).
  try {
    if (raw.trim() === "") return [];
    return readCatalog(realPath);
  } catch (err) {
    throw new Error(`preview.promotePreview: snapshot parse failed: ${sanitize(err)}`);
  }
}

/**
 * Restore a snapshot captured by `snapshotReal`. If snapshot is `null`,
 * the file did not exist before promotion — delete it. Otherwise rewrite
 * it via `writeCatalog`. Errors from the restore path are appended to the
 * caller's error message so both facts surface together.
 *
 * @param {string} realPath
 * @param {object[] | null} snapshot
 * @returns {string | null} - error description if restore failed, else null
 */
function restoreSnapshot(realPath, snapshot) {
  // R1 Q2 propagation: no existsSync pre-check — rmSync({force:true}) is
  // idempotent on missing files, so attempt the delete unconditionally
  // when snapshot===null and let rmSync silently ignore ENOENT.
  try {
    if (snapshot === null) {
      fs.rmSync(realPath, { force: true });
    } else {
      writeCatalog(realPath, snapshot);
    }
    return null;
  } catch (err) {
    return sanitize(err);
  }
}

/**
 * Promote a preview catalog to the real catalog directory. Precondition:
 * both preview files must already exist (call after `previewExists` returns
 * true). Implementation copies records (reads the preview, writes to the
 * real path) rather than moving — the preview survives promotion so the
 * user can diff/re-approve if needed, and the orchestrator calls
 * `clearPreview` explicitly when it wants to reset.
 *
 * Rollback: if the second (local) write fails after the first (shared)
 * write has landed, the prior real shared.jsonl snapshot is restored so the
 * real catalog is not left in a torn state. See file header for details.
 *
 * @param {object} [opts]
 * @param {string} [opts.previewDir]
 * @param {string} [opts.realDir]
 * @returns {{ sharedPath: string, localPath: string, counts: { shared: number, local: number } }}
 */
function promotePreview(opts = {}) {
  const previewDir = opts.previewDir ?? PREVIEW_DIR;
  const realDir = opts.realDir ?? REAL_DIR;

  const previewShared = path.join(previewDir, SHARED_BASENAME);
  const previewLocal = path.join(previewDir, LOCAL_BASENAME);

  if (!previewExists({ previewDir })) {
    throw new Error(
      "preview.promotePreview: preview not found — run writePreview() before promotePreview()"
    );
  }

  // Step 1: read both preview files up-front. Either both succeed or we
  // bail before touching the real directory.
  let sharedRecords;
  let localRecords;
  try {
    sharedRecords = readCatalog(previewShared);
  } catch (err) {
    throw new Error(`preview.promotePreview: preview shared read failed: ${sanitize(err)}`);
  }
  try {
    localRecords = readCatalog(previewLocal);
  } catch (err) {
    throw new Error(`preview.promotePreview: preview local read failed: ${sanitize(err)}`);
  }

  ensureDir(realDir);
  const realShared = path.join(realDir, SHARED_BASENAME);
  const realLocal = path.join(realDir, LOCAL_BASENAME);

  // Step 2: snapshot existing real catalog for rollback. `null` = no file.
  const sharedSnapshot = snapshotReal(realShared);
  const localSnapshot = snapshotReal(realLocal);

  // Step 3: write new real shared.jsonl. On failure, no state change yet.
  try {
    writeCatalog(realShared, sharedRecords);
  } catch (err) {
    throw new Error(`preview.promotePreview: real shared write failed: ${sanitize(err)}`);
  }

  // Step 4: write new real local.jsonl. On failure, roll shared back.
  try {
    writeCatalog(realLocal, localRecords);
  } catch (err) {
    const restoreErr = restoreSnapshot(realShared, sharedSnapshot);
    // localSnapshot untouched — the local write never started.
    void localSnapshot;
    const primary = `preview.promotePreview: real local write failed: ${sanitize(err)}`;
    if (restoreErr !== null) {
      throw new Error(`${primary}; rollback of shared ALSO failed: ${restoreErr}`);
    }
    throw new Error(`${primary}; rolled shared back to prior state`);
  }

  return {
    sharedPath: realShared,
    localPath: realLocal,
    counts: { shared: sharedRecords.length, local: localRecords.length },
  };
}

/**
 * Apply a user arbitration package to the on-disk preview catalogs.
 *
 * The synthesis agent emits an arbitration package alongside its markdown
 * report (see `synthesis-agent-template.md`). Each decision names a record
 * by `path`, the field to update, and the resolved value. This function
 * is the missing piece between "user makes arbitration decisions" and
 * "preview catalog has resolved values" — without it, verify.js can never
 * pass on a preview that contains needs_review entries by design.
 *
 * For each decision:
 *   - finds the matching record in shared.jsonl OR local.jsonl by `path`
 *   - sets `record[field] = decision.resolved_value` (null is allowed —
 *     means "user confirms null is correct here")
 *   - removes `field` from `record.needs_review` (if present)
 *   - sets `record.confidence[field] = decision.confidence` (default 0.95
 *     — high because the source of truth is now the user, not an agent)
 *
 * Records named in `unresolved_coverage_gaps` are intentionally NOT
 * touched. Their needs_review entries survive, which means verify.js
 * will keep failing on them. That is the point: the next gate makes the
 * unresolved set explicit so the user (or a follow-up arbitration round)
 * has to address them before promotion.
 *
 * Atomic semantics mirror promotePreview(): both files are read up-front,
 * the existing on-disk versions are snapshotted, shared is written first,
 * and a local-write failure rolls shared back to its pre-arbitration state.
 *
 * @param {{ decisions: Array<{path: string, field: string, resolved_value: any, confidence?: number, reason?: string, source?: string}>, unresolved_coverage_gaps?: Array<{path: string, field: string}>, schema_version?: string }} pkg
 * @param {object} [opts]
 * @param {string} [opts.previewDir]
 * @returns {{ decisionsApplied: number, decisionsSkipped: number, recordsModified: number, needsReviewCleared: number, unresolvedCoverageGaps: number, errors: string[] }}
 */
function applyArbitration(pkg, opts = {}) {
  if (!pkg || typeof pkg !== "object") {
    throw new TypeError("preview.applyArbitration: pkg must be an object");
  }
  if (!Array.isArray(pkg.decisions)) {
    throw new TypeError("preview.applyArbitration: pkg.decisions must be an array");
  }

  const previewDir = opts.previewDir ?? PREVIEW_DIR;
  if (!previewExists({ previewDir })) {
    throw new Error(
      "preview.applyArbitration: preview not found — run writePreview() before applyArbitration()"
    );
  }

  const sharedPath = path.join(previewDir, SHARED_BASENAME);
  const localPath = path.join(previewDir, LOCAL_BASENAME);

  let sharedRecords;
  let localRecords;
  try {
    sharedRecords = readCatalog(sharedPath);
  } catch (err) {
    throw new Error(`preview.applyArbitration: shared read failed: ${sanitize(err)}`);
  }
  try {
    localRecords = readCatalog(localPath);
  } catch (err) {
    throw new Error(`preview.applyArbitration: local read failed: ${sanitize(err)}`);
  }

  // Snapshot pre-modification state for rollback if the write phase tears.
  // We can't reuse snapshotReal because that's keyed off the real-catalog
  // path semantics (ENOENT → null). Here both files MUST exist or
  // previewExists would have returned false above.
  const sharedSnapshot = JSON.parse(JSON.stringify(sharedRecords));
  void sharedSnapshot; // surfaced via restoreSnapshot below

  // Index by path across both buckets. A path lives in exactly one file
  // (split by source_scope at writePreview time), so single map is fine.
  const index = new Map();
  for (const rec of sharedRecords) {
    if (rec && typeof rec.path === "string") index.set(rec.path, { rec, bucket: "shared" });
  }
  for (const rec of localRecords) {
    if (rec && typeof rec.path === "string") index.set(rec.path, { rec, bucket: "local" });
  }

  const summary = {
    decisionsApplied: 0,
    decisionsSkipped: 0,
    recordsModified: 0,
    needsReviewCleared: 0,
    unresolvedCoverageGaps: Array.isArray(pkg.unresolved_coverage_gaps)
      ? pkg.unresolved_coverage_gaps.length
      : 0,
    errors: [],
  };
  const modifiedPaths = new Set();

  for (const decision of pkg.decisions) {
    if (!decision || typeof decision !== "object") {
      summary.decisionsSkipped++;
      summary.errors.push("decision is not an object");
      continue;
    }
    const { path: recPath, field } = decision;
    if (typeof recPath !== "string" || typeof field !== "string") {
      summary.decisionsSkipped++;
      summary.errors.push(
        `decision missing path or field: ${JSON.stringify({ path: recPath, field })}`
      );
      continue;
    }
    const hit = index.get(recPath);
    if (!hit) {
      summary.decisionsSkipped++;
      summary.errors.push(`no preview record for path "${recPath}"`);
      continue;
    }

    // Apply the resolved value. `null` is intentionally allowed — it
    // means the user confirmed null is the correct value for that field.
    hit.rec[field] = decision.resolved_value === undefined ? null : decision.resolved_value;

    // Bookkeeping: clear the needs_review entry for this field if present.
    if (Array.isArray(hit.rec.needs_review)) {
      const before = hit.rec.needs_review.length;
      hit.rec.needs_review = hit.rec.needs_review.filter((f) => f !== field);
      if (hit.rec.needs_review.length < before) summary.needsReviewCleared++;
    }

    // Update per-field confidence — user input gets high confidence by
    // default since the source of truth is now the user, not an agent.
    if (!hit.rec.confidence || typeof hit.rec.confidence !== "object") {
      hit.rec.confidence = {};
    }
    const conf =
      typeof decision.confidence === "number" &&
      decision.confidence >= 0 &&
      decision.confidence <= 1
        ? decision.confidence
        : 0.95;
    hit.rec.confidence[field] = conf;

    summary.decisionsApplied++;
    modifiedPaths.add(recPath);
  }
  summary.recordsModified = modifiedPaths.size;

  // Write phase. Shared first, then local. If local fails, restore the
  // shared snapshot so the preview is not left in a torn (half-arbitrated)
  // state. previewExists is guaranteed true above, so a write here is a
  // pure overwrite — no mkdir needed.
  try {
    writeCatalog(sharedPath, sharedRecords);
  } catch (err) {
    throw new Error(`preview.applyArbitration: shared write failed: ${sanitize(err)}`);
  }
  try {
    writeCatalog(localPath, localRecords);
  } catch (err) {
    let restoreErr = null;
    try {
      writeCatalog(sharedPath, sharedSnapshot);
    } catch (rollbackErr) {
      restoreErr = sanitize(rollbackErr);
    }
    const primary = `preview.applyArbitration: local write failed: ${sanitize(err)}`;
    if (restoreErr !== null) {
      throw new Error(`${primary}; rollback of shared ALSO failed: ${restoreErr}`);
    }
    throw new Error(`${primary}; rolled shared back to pre-arbitration state`);
  }

  return summary;
}

/**
 * Remove the preview directory entirely. Idempotent.
 * @param {object} [opts]
 * @param {string} [opts.previewDir]
 */
function clearPreview(opts = {}) {
  const previewDir = opts.previewDir ?? PREVIEW_DIR;
  try {
    fs.rmSync(previewDir, { recursive: true, force: true });
  } catch (err) {
    throw new Error(`preview.clearPreview: rm failed: ${sanitize(err)}`);
  }
}

module.exports = {
  PREVIEW_DIR,
  REAL_DIR,
  SHARED_BASENAME,
  LOCAL_BASENAME,
  splitBySourceScope,
  writePreview,
  promotePreview,
  applyArbitration,
  clearPreview,
  previewExists,
};
