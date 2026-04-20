/**
 * preview.test.js — Piece 3 S8 preview gate tests.
 *
 * Runs with:
 *   node --test .claude/sync/label/backfill/__tests__/preview.test.js
 *
 * Every test isolates preview/real dirs under `fs.mkdtempSync` so there is
 * zero chance of touching the real `.claude/sync/label/preview/` on disk.
 */

const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");

const MOD = path.join(__dirname, "..", "preview");
const LIB = path.join(__dirname, "..", "..", "lib");

// Build a fresh tmp workspace with isolated preview + real dirs.
function mkWorkspace() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "label-preview-"));
  const previewDir = path.join(root, "preview");
  const realDir = path.join(root, "real");
  fs.mkdirSync(realDir, { recursive: true });
  return { root, previewDir, realDir };
}

// Six records covering all five source_scope values + one missing.
function sampleRecords() {
  return [
    { path: "a.md", source_scope: "universal", name: "a" },
    { path: "b.md", source_scope: "user", name: "b" },
    { path: "c.md", source_scope: "project", name: "c" },
    { path: "d.md", source_scope: "machine", name: "d" },
    { path: "e.md", source_scope: "ephemeral", name: "e" },
    { path: "f.md", name: "f" }, // missing source_scope → shared (default)
  ];
}

test("splitBySourceScope: 6 records split into 3 shared + 3 local", () => {
  const { splitBySourceScope } = require(MOD);
  const { shared, local } = splitBySourceScope(sampleRecords());
  // shared = universal + user + missing(default)
  assert.equal(shared.length, 3);
  // local = project + machine + ephemeral
  assert.equal(local.length, 3);

  const sharedPaths = shared.map((r) => r.path).sort();
  const localPaths = local.map((r) => r.path).sort();
  assert.deepEqual(sharedPaths, ["a.md", "b.md", "f.md"]);
  assert.deepEqual(localPaths, ["c.md", "d.md", "e.md"]);
});

test("splitBySourceScope: empty array → empty buckets", () => {
  const { splitBySourceScope } = require(MOD);
  const { shared, local } = splitBySourceScope([]);
  assert.deepEqual(shared, []);
  assert.deepEqual(local, []);
});

test("splitBySourceScope: non-array input throws TypeError", () => {
  const { splitBySourceScope } = require(MOD);
  assert.throws(() => splitBySourceScope(null), TypeError);
  assert.throws(() => splitBySourceScope("x"), TypeError);
});

test("writePreview: round-trip via catalog-io.readCatalog", () => {
  const { writePreview } = require(MOD);
  const { readCatalog } = require(path.join(LIB, "catalog-io"));
  const { previewDir } = mkWorkspace();

  const records = sampleRecords();
  const result = writePreview(records, { previewDir });

  assert.equal(result.counts.shared, 3);
  assert.equal(result.counts.local, 3);
  assert.equal(result.sharedPath, path.join(previewDir, "shared.jsonl"));
  assert.equal(result.localPath, path.join(previewDir, "local.jsonl"));

  const sharedBack = readCatalog(result.sharedPath);
  const localBack = readCatalog(result.localPath);
  assert.equal(sharedBack.length, 3);
  assert.equal(localBack.length, 3);

  // Verify content round-trips exactly (order preserved within each bucket).
  const sharedExpected = records.filter((r) =>
    r.source_scope === "universal" || r.source_scope === "user" || !r.source_scope
  );
  const localExpected = records.filter(
    (r) => r.source_scope === "project" || r.source_scope === "machine" || r.source_scope === "ephemeral"
  );
  assert.deepEqual(sharedBack, sharedExpected);
  assert.deepEqual(localBack, localExpected);
});

test("previewExists: false before writePreview, true after", () => {
  const { writePreview, previewExists } = require(MOD);
  const { previewDir } = mkWorkspace();

  assert.equal(previewExists({ previewDir }), false);
  writePreview(sampleRecords(), { previewDir });
  assert.equal(previewExists({ previewDir }), true);
});

test("previewExists: false if only one file present", () => {
  const { previewExists } = require(MOD);
  const { previewDir } = mkWorkspace();
  fs.mkdirSync(previewDir, { recursive: true });
  fs.writeFileSync(path.join(previewDir, "shared.jsonl"), "");
  // local.jsonl missing
  assert.equal(previewExists({ previewDir }), false);
});

test("promotePreview: writes real catalog; preview still exists (copy semantics)", () => {
  const { writePreview, promotePreview, previewExists } = require(MOD);
  const { readCatalog } = require(path.join(LIB, "catalog-io"));
  const { previewDir, realDir } = mkWorkspace();

  writePreview(sampleRecords(), { previewDir });
  const result = promotePreview({ previewDir, realDir });

  assert.equal(result.sharedPath, path.join(realDir, "shared.jsonl"));
  assert.equal(result.localPath, path.join(realDir, "local.jsonl"));
  assert.equal(result.counts.shared, 3);
  assert.equal(result.counts.local, 3);

  // Real files exist with correct records
  const realShared = readCatalog(result.sharedPath);
  const realLocal = readCatalog(result.localPath);
  assert.equal(realShared.length, 3);
  assert.equal(realLocal.length, 3);
  assert.deepEqual(
    realShared.map((r) => r.path).sort(),
    ["a.md", "b.md", "f.md"]
  );
  assert.deepEqual(
    realLocal.map((r) => r.path).sort(),
    ["c.md", "d.md", "e.md"]
  );

  // Preview still exists after promote (copy, not move)
  assert.equal(previewExists({ previewDir }), true);
});

test("promotePreview: throws if preview missing", () => {
  const { promotePreview } = require(MOD);
  const { previewDir, realDir } = mkWorkspace();
  assert.throws(
    () => promotePreview({ previewDir, realDir }),
    /preview not found/i
  );
});

test("promotePreview: rollback restores prior shared when local write fails", () => {
  const { writePreview, promotePreview } = require(MOD);
  const { readCatalog, writeCatalog } = require(path.join(LIB, "catalog-io"));
  const { previewDir, realDir } = mkWorkspace();

  // Seed a prior real catalog so we have something to roll BACK to.
  const priorShared = [{ path: "old-shared.md", source_scope: "universal", name: "old-s" }];
  const priorLocal = [{ path: "old-local.md", source_scope: "project", name: "old-l" }];
  writeCatalog(path.join(realDir, "shared.jsonl"), priorShared);
  writeCatalog(path.join(realDir, "local.jsonl"), priorLocal);

  // Write a valid preview.
  writePreview(sampleRecords(), { previewDir });

  // Force the local write to fail by replacing realDir/local.jsonl with a
  // DIRECTORY of the same name. writeCatalog will succeed writing its tmp
  // file but safeRenameSync will refuse to rename over a directory, causing
  // the atomic write to throw. This simulates "second write fails after
  // first succeeded" — triggers the rollback path.
  fs.rmSync(path.join(realDir, "local.jsonl"), { force: true });
  fs.mkdirSync(path.join(realDir, "local.jsonl"));

  assert.throws(
    () => promotePreview({ previewDir, realDir }),
    /real local write failed/i
  );

  // After rollback, real shared.jsonl should be back to the PRIOR content
  // (not the new preview content).
  const sharedAfter = readCatalog(path.join(realDir, "shared.jsonl"));
  assert.deepEqual(sharedAfter, priorShared);
});

test("promotePreview: rollback when no prior real existed → shared deleted", () => {
  const { writePreview, promotePreview } = require(MOD);
  const { previewDir, realDir } = mkWorkspace();

  // No prior real catalog. Force local write failure via directory trick.
  writePreview(sampleRecords(), { previewDir });
  fs.mkdirSync(path.join(realDir, "local.jsonl"));

  assert.throws(
    () => promotePreview({ previewDir, realDir }),
    /real local write failed/i
  );

  // Shared.jsonl was written during step 3 but must be deleted on rollback
  // (prior snapshot was null → rollback = delete).
  assert.equal(fs.existsSync(path.join(realDir, "shared.jsonl")), false);
});

test("clearPreview: removes preview dir; previewExists → false", () => {
  const { writePreview, clearPreview, previewExists } = require(MOD);
  const { previewDir } = mkWorkspace();

  writePreview(sampleRecords(), { previewDir });
  assert.equal(previewExists({ previewDir }), true);
  clearPreview({ previewDir });
  assert.equal(previewExists({ previewDir }), false);
  assert.equal(fs.existsSync(previewDir), false);
});

test("clearPreview: idempotent when preview dir doesn't exist", () => {
  const { clearPreview } = require(MOD);
  const { previewDir } = mkWorkspace();
  // previewDir was never created
  clearPreview({ previewDir }); // must not throw
});

test("module exports: constants and functions all present", () => {
  const mod = require(MOD);
  assert.equal(typeof mod.PREVIEW_DIR, "string");
  assert.equal(typeof mod.REAL_DIR, "string");
  assert.equal(mod.SHARED_BASENAME, "shared.jsonl");
  assert.equal(mod.LOCAL_BASENAME, "local.jsonl");
  assert.equal(typeof mod.splitBySourceScope, "function");
  assert.equal(typeof mod.writePreview, "function");
  assert.equal(typeof mod.promotePreview, "function");
  assert.equal(typeof mod.clearPreview, "function");
  assert.equal(typeof mod.previewExists, "function");
  // PREVIEW_DIR should be under REAL_DIR's parent (per plan)
  assert.ok(mod.PREVIEW_DIR.endsWith(path.join(".claude", "sync", "label", "preview")));
  assert.ok(mod.REAL_DIR.endsWith(path.join(".claude", "sync", "label")));
});
