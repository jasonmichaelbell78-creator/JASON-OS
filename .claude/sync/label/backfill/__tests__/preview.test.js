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

  // Force the local write to fail by making realDir/local.jsonl read-only.
  // snapshotReal reads the file successfully first (R1 Q2 post-fix: no
  // pre-flight existsSync; reads are direct), then writeCatalog's
  // safeAtomicWriteSync attempts the rename over the read-only target and
  // fails. This triggers the step-4 rollback path the test is verifying.
  fs.chmodSync(path.join(realDir, "local.jsonl"), 0o444);

  try {
    assert.throws(
      () => promotePreview({ previewDir, realDir }),
      /real local write failed/i
    );

    // After rollback, real shared.jsonl should be back to the PRIOR content
    // (not the new preview content).
    const sharedAfter = readCatalog(path.join(realDir, "shared.jsonl"));
    assert.deepEqual(sharedAfter, priorShared);
  } finally {
    // Restore perms so tmpdir cleanup doesn't choke on read-only files.
    fs.chmodSync(path.join(realDir, "local.jsonl"), 0o644);
  }
});

test("promotePreview: rollback when no prior real existed → shared deleted", () => {
  const { writePreview, promotePreview } = require(MOD);
  const { previewDir, realDir } = mkWorkspace();

  // No prior real catalog. Pre-create realLocal as an empty read-only file
  // so snapshotReal reads it successfully (as `[]`) while the subsequent
  // writeCatalog rename fails — forcing the rollback path with
  // sharedSnapshot = null (ENOENT). Same trigger as the "prior exists"
  // sibling test, different prior state for coverage.
  fs.mkdirSync(realDir, { recursive: true });
  const realLocal = path.join(realDir, "local.jsonl");
  fs.writeFileSync(realLocal, "");
  fs.chmodSync(realLocal, 0o444);

  writePreview(sampleRecords(), { previewDir });

  try {
    assert.throws(
      () => promotePreview({ previewDir, realDir }),
      /real local write failed/i
    );

    // Shared.jsonl was written during step 3 but must be deleted on rollback
    // (prior snapshot was null → rollback = delete).
    assert.equal(fs.existsSync(path.join(realDir, "shared.jsonl")), false);
  } finally {
    fs.chmodSync(realLocal, 0o644);
  }
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
  assert.equal(typeof mod.applyArbitration, "function");
  assert.equal(typeof mod.clearPreview, "function");
  assert.equal(typeof mod.previewExists, "function");
  // PREVIEW_DIR should be under REAL_DIR's parent (per plan)
  assert.ok(mod.PREVIEW_DIR.endsWith(path.join(".claude", "sync", "label", "preview")));
  assert.ok(mod.REAL_DIR.endsWith(path.join(".claude", "sync", "label")));
});

// ---- applyArbitration ------------------------------------------------------
//
// These tests exercise the missing piece between "user makes arbitration
// decisions" and "preview catalog has resolved values" — without it the
// pre-arbitration preview can never pass verify.js (every record carries
// needs_review entries by design after the synthesis pass).

// Records carrying needs_review entries — the realistic post-G.1 shape.
function arbitrationFixture() {
  return [
    {
      path: "a.md",
      source_scope: "universal",
      name: "a",
      purpose: null,
      notes: null,
      needs_review: ["purpose", "notes"],
      confidence: { name: 1, purpose: 0, notes: 0 },
    },
    {
      path: "c.md",
      source_scope: "project",
      name: "c",
      purpose: null,
      type: null,
      needs_review: ["purpose", "type"],
      confidence: { name: 1, purpose: 0, type: 0 },
    },
  ];
}

test("applyArbitration: applies decisions across both buckets, clears needs_review, bumps confidence", () => {
  const { writePreview, applyArbitration } = require(MOD);
  const { readCatalog } = require(path.join(LIB, "catalog-io"));
  const { previewDir } = mkWorkspace();
  writePreview(arbitrationFixture(), { previewDir });

  const result = applyArbitration(
    {
      decisions: [
        { path: "a.md", field: "purpose", resolved_value: "Worked example fixture for shared bucket" },
        { path: "a.md", field: "notes", resolved_value: "Sourced from universal-scope corpus" },
        { path: "c.md", field: "purpose", resolved_value: "Project-scope fixture", confidence: 0.85 },
        { path: "c.md", field: "type", resolved_value: "doc" },
      ],
    },
    { previewDir },
  );

  assert.equal(result.decisionsApplied, 4);
  assert.equal(result.decisionsSkipped, 0);
  assert.equal(result.recordsModified, 2);
  assert.equal(result.needsReviewCleared, 4);
  assert.equal(result.unresolvedCoverageGaps, 0);
  assert.deepEqual(result.errors, []);

  const shared = readCatalog(path.join(previewDir, "shared.jsonl"));
  const local = readCatalog(path.join(previewDir, "local.jsonl"));
  const a = shared.find((r) => r.path === "a.md");
  const c = local.find((r) => r.path === "c.md");

  assert.equal(a.purpose, "Worked example fixture for shared bucket");
  assert.equal(a.notes, "Sourced from universal-scope corpus");
  assert.deepEqual(a.needs_review, []);
  assert.equal(a.confidence.purpose, 0.95);
  assert.equal(a.confidence.notes, 0.95);

  assert.equal(c.purpose, "Project-scope fixture");
  assert.equal(c.type, "doc");
  assert.deepEqual(c.needs_review, []);
  assert.equal(c.confidence.purpose, 0.85); // honored override
  assert.equal(c.confidence.type, 0.95);
});

test("applyArbitration: null resolved_value is honored (user confirms null is correct)", () => {
  const { writePreview, applyArbitration } = require(MOD);
  const { readCatalog } = require(path.join(LIB, "catalog-io"));
  const { previewDir } = mkWorkspace();
  writePreview(arbitrationFixture(), { previewDir });

  const result = applyArbitration(
    {
      decisions: [
        { path: "a.md", field: "notes", resolved_value: null, confidence: 0.9 },
      ],
    },
    { previewDir },
  );

  assert.equal(result.decisionsApplied, 1);
  assert.equal(result.needsReviewCleared, 1);

  const shared = readCatalog(path.join(previewDir, "shared.jsonl"));
  const a = shared.find((r) => r.path === "a.md");
  assert.equal(a.notes, null);
  assert.deepEqual(a.needs_review, ["purpose"]); // notes cleared, purpose still flagged
  assert.equal(a.confidence.notes, 0.9);
});

test("applyArbitration: unknown path → counted in skipped + errors, no record changes", () => {
  const { writePreview, applyArbitration } = require(MOD);
  const { readCatalog } = require(path.join(LIB, "catalog-io"));
  const { previewDir } = mkWorkspace();
  writePreview(arbitrationFixture(), { previewDir });

  const result = applyArbitration(
    {
      decisions: [
        { path: "does/not/exist.md", field: "purpose", resolved_value: "x" },
        { path: "a.md", field: "purpose", resolved_value: "ok" },
      ],
    },
    { previewDir },
  );

  assert.equal(result.decisionsApplied, 1);
  assert.equal(result.decisionsSkipped, 1);
  assert.equal(result.errors.length, 1);
  assert.match(result.errors[0], /no preview record for path "does\/not\/exist\.md"/);

  const shared = readCatalog(path.join(previewDir, "shared.jsonl"));
  const a = shared.find((r) => r.path === "a.md");
  assert.equal(a.purpose, "ok");
});

test("applyArbitration: unresolved_coverage_gaps is reported in summary but does not modify records", () => {
  const { writePreview, applyArbitration } = require(MOD);
  const { readCatalog } = require(path.join(LIB, "catalog-io"));
  const { previewDir } = mkWorkspace();
  writePreview(arbitrationFixture(), { previewDir });

  const result = applyArbitration(
    {
      decisions: [],
      unresolved_coverage_gaps: [
        { path: "a.md", field: "purpose" },
        { path: "c.md", field: "type" },
      ],
    },
    { previewDir },
  );

  assert.equal(result.decisionsApplied, 0);
  assert.equal(result.unresolvedCoverageGaps, 2);

  // Records untouched — needs_review still populated, fields still null.
  const shared = readCatalog(path.join(previewDir, "shared.jsonl"));
  const local = readCatalog(path.join(previewDir, "local.jsonl"));
  const a = shared.find((r) => r.path === "a.md");
  const c = local.find((r) => r.path === "c.md");
  assert.equal(a.purpose, null);
  assert.deepEqual(a.needs_review, ["purpose", "notes"]);
  assert.equal(c.type, null);
});

test("applyArbitration: missing pkg or non-array decisions throws TypeError", () => {
  const { applyArbitration } = require(MOD);
  const { previewDir } = mkWorkspace();
  // No preview written — but TypeError fires before the previewExists check.
  assert.throws(() => applyArbitration(null, { previewDir }), TypeError);
  assert.throws(() => applyArbitration("x", { previewDir }), TypeError);
  assert.throws(() => applyArbitration({}, { previewDir }), TypeError);
  assert.throws(() => applyArbitration({ decisions: "x" }, { previewDir }), TypeError);
});

test("applyArbitration: missing preview throws", () => {
  const { applyArbitration } = require(MOD);
  const { previewDir } = mkWorkspace();
  // previewDir exists but no shared/local files
  assert.throws(
    () => applyArbitration({ decisions: [] }, { previewDir }),
    /preview not found/i,
  );
});

test("applyArbitration: empty decisions list is a clean no-op (writes both files unchanged)", () => {
  const { writePreview, applyArbitration } = require(MOD);
  const { readCatalog } = require(path.join(LIB, "catalog-io"));
  const { previewDir } = mkWorkspace();
  writePreview(arbitrationFixture(), { previewDir });
  const sharedBefore = readCatalog(path.join(previewDir, "shared.jsonl"));
  const localBefore = readCatalog(path.join(previewDir, "local.jsonl"));

  const result = applyArbitration({ decisions: [] }, { previewDir });
  assert.equal(result.decisionsApplied, 0);
  assert.equal(result.recordsModified, 0);

  const sharedAfter = readCatalog(path.join(previewDir, "shared.jsonl"));
  const localAfter = readCatalog(path.join(previewDir, "local.jsonl"));
  assert.deepEqual(sharedAfter, sharedBefore);
  assert.deepEqual(localAfter, localBefore);
});

// PR #11 R1 item 2 (Qodo): decisions whose (path,field) is in
// unresolved_coverage_gaps must be ignored. The synthesis agent emits this
// list specifically to keep verify.js failing on fields the user must
// address in a follow-up run — an arbitration package that tries to resolve
// them anyway is malformed or adversarial.
test("applyArbitration: decisions targeting unresolved_coverage_gaps are skipped (not applied)", () => {
  const { writePreview, applyArbitration } = require(MOD);
  const { readCatalog } = require(path.join(LIB, "catalog-io"));
  const { previewDir } = mkWorkspace();
  writePreview(arbitrationFixture(), { previewDir });

  const result = applyArbitration(
    {
      decisions: [
        { path: "a.md", field: "purpose", resolved_value: "should be ignored" },
        { path: "a.md", field: "notes", resolved_value: "this one applies" },
      ],
      unresolved_coverage_gaps: [{ path: "a.md", field: "purpose" }],
    },
    { previewDir },
  );

  assert.equal(result.decisionsApplied, 1);
  assert.equal(result.decisionsSkipped, 1);
  assert.equal(result.unresolvedCoverageGaps, 1);
  assert.equal(result.errors.length, 1);
  assert.match(result.errors[0], /unresolved_coverage_gaps/);

  const shared = readCatalog(path.join(previewDir, "shared.jsonl"));
  const a = shared.find((r) => r.path === "a.md");
  // purpose stays null + still in needs_review; notes was applied.
  assert.equal(a.purpose, null);
  assert.ok(a.needs_review.includes("purpose"), "purpose must stay in needs_review");
  assert.equal(a.notes, "this one applies");
});

// PR #11 R1 item 2 (Qodo compliance): forbidden field names would corrupt
// object internals if assigned via rec[field]=value.
test("applyArbitration: __proto__/constructor/prototype decisions are rejected", () => {
  const { writePreview, applyArbitration } = require(MOD);
  const { previewDir } = mkWorkspace();
  writePreview(arbitrationFixture(), { previewDir });

  const result = applyArbitration(
    {
      decisions: [
        { path: "a.md", field: "__proto__", resolved_value: { polluted: true } },
        { path: "a.md", field: "constructor", resolved_value: "bad" },
        { path: "a.md", field: "prototype", resolved_value: "bad" },
      ],
    },
    { previewDir },
  );

  assert.equal(result.decisionsApplied, 0);
  assert.equal(result.decisionsSkipped, 3);
  for (const err of result.errors) {
    assert.match(err, /corrupt object internals/);
  }
  // Base Object.prototype must remain unpolluted — property access reaches
  // through to the base prototype for any plain object, not just the one
  // we tried to mutate.
  assert.equal({}.polluted, undefined);
});

// PR #11 R1 suggestion #13: arbitration may only resolve fields the record
// actually flagged for review. Catches both adversarial packages and
// honest typos (wrong field name) without mutating records.
test("applyArbitration: decisions for fields not in needs_review are skipped", () => {
  const { writePreview, applyArbitration } = require(MOD);
  const { readCatalog } = require(path.join(LIB, "catalog-io"));
  const { previewDir } = mkWorkspace();
  writePreview(arbitrationFixture(), { previewDir });

  const result = applyArbitration(
    {
      decisions: [
        { path: "a.md", field: "source_scope", resolved_value: "user" }, // not in needs_review
      ],
    },
    { previewDir },
  );

  assert.equal(result.decisionsApplied, 0);
  assert.equal(result.decisionsSkipped, 1);
  assert.match(result.errors[0], /not present in needs_review/);

  const shared = readCatalog(path.join(previewDir, "shared.jsonl"));
  const a = shared.find((r) => r.path === "a.md");
  assert.equal(a.source_scope, "universal", "source_scope must not change");
});

// PR #11 R1 suggestion #12: missing resolved_value was silently coerced to
// null + needs_review cleared + 0.95 confidence stamped. Now treated as
// malformed.
test("applyArbitration: decision missing resolved_value is rejected (no silent null coercion)", () => {
  const { writePreview, applyArbitration } = require(MOD);
  const { readCatalog } = require(path.join(LIB, "catalog-io"));
  const { previewDir } = mkWorkspace();
  writePreview(arbitrationFixture(), { previewDir });

  const result = applyArbitration(
    {
      decisions: [
        { path: "a.md", field: "purpose" }, // no resolved_value key at all
      ],
    },
    { previewDir },
  );

  assert.equal(result.decisionsApplied, 0);
  assert.equal(result.decisionsSkipped, 1);
  assert.match(result.errors[0], /missing resolved_value/);

  const shared = readCatalog(path.join(previewDir, "shared.jsonl"));
  const a = shared.find((r) => r.path === "a.md");
  assert.equal(a.purpose, null, "field untouched");
  assert.ok(a.needs_review.includes("purpose"), "needs_review entry preserved");
});

test("applyArbitration: malformed decisions are skipped + reported, well-formed siblings still apply", () => {
  const { writePreview, applyArbitration } = require(MOD);
  const { readCatalog } = require(path.join(LIB, "catalog-io"));
  const { previewDir } = mkWorkspace();
  writePreview(arbitrationFixture(), { previewDir });

  const result = applyArbitration(
    {
      decisions: [
        null,                                  // not an object
        { path: "a.md" },                      // missing field
        { field: "purpose" },                  // missing path
        { path: "a.md", field: "purpose", resolved_value: "kept" },
      ],
    },
    { previewDir },
  );

  assert.equal(result.decisionsApplied, 1);
  assert.equal(result.decisionsSkipped, 3);
  assert.equal(result.errors.length, 3);

  const shared = readCatalog(path.join(previewDir, "shared.jsonl"));
  const a = shared.find((r) => r.path === "a.md");
  assert.equal(a.purpose, "kept");
});
