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
    throw new Error(`preview.writePreview: local write failed: ${sanitize(err)}`);
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
  if (!fs.existsSync(realPath)) return null;
  try {
    return readCatalog(realPath);
  } catch (err) {
    throw new Error(`preview.promotePreview: snapshot failed: ${sanitize(err)}`);
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
  try {
    if (snapshot === null) {
      if (fs.existsSync(realPath)) fs.rmSync(realPath, { force: true });
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
  clearPreview,
  previewExists,
};
