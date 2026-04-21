/**
 * orchestrate.test.js — End-to-end tests for the back-fill orchestrator.
 *
 * Covers Plan §S8 "Done when" acceptance:
 *   - Runs end-to-end on a test fixture (<20 files)
 *   - Preview accurate
 *   - Approve writes real catalog
 *   - Reject re-runs with corrections
 *   - Checkpoint recovery verified
 *
 * scan() returns repo-relative forward-slash paths (see scan.js output), so
 * dispatcher mocks build records off f.path directly rather than pre-hashing
 * by absolute path — keeps the tests portable across Windows and POSIX.
 */

const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");

const BACKFILL = path.join(__dirname, "..");
const orch = require(path.join(BACKFILL, "orchestrate"));
const catalogIo = require(path.join(BACKFILL, "..", "lib", "catalog-io"));

// --- fixture helpers ---

function makeFixture() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "bf-e2e-"));
  const scopePath = path.join(root, "scope.json");
  fs.writeFileSync(
    scopePath,
    JSON.stringify({
      version: 1,
      include: ["**/*.md", "**/*.js"],
      exclude: ["**/__tests__/**", "**/*.test.js"],
    })
  );

  const files = [
    { rel: "docs/skill-a.md", bytes: 5 * 1024, scope: "universal" },
    { rel: "docs/skill-b.md", bytes: 5 * 1024, scope: "universal" },
    { rel: "hooks/hook-x.js", bytes: 10 * 1024, scope: "universal" },
    { rel: "scripts/tool-y.js", bytes: 80 * 1024, scope: "user" },
    { rel: "project/plan.md", bytes: 3 * 1024, scope: "project" },
    { rel: "project/notes.md", bytes: 2 * 1024, scope: "project" },
  ];

  for (const f of files) {
    const abs = path.join(root, f.rel);
    fs.mkdirSync(path.dirname(abs), { recursive: true });
    fs.writeFileSync(abs, "x".repeat(f.bytes));
  }

  return { root, scopePath, files };
}

function rmrf(dir) {
  try {
    fs.rmSync(dir, { recursive: true, force: true });
  } catch {
    // Best-effort test cleanup.
  }
}

// Infer source_scope from a fixture-relative path. Matches the fixture layout
// in makeFixture(); tests that don't use makeFixture pass their own scope fn.
function scopeForPath(p) {
  if (p.startsWith("project/")) return "project";
  if (p.startsWith("scripts/")) return "user";
  return "universal";
}

/**
 * Build a dispatcher that calls `recordFn(file, role)` for each file in the
 * batch. recordFn receives scan's output (repo-relative path + sizes) and
 * returns a full agent-output record.
 */
function buildDispatcher(recordFn, role) {
  return async (batch) => batch.files.map((f) => recordFn(f, role));
}

// --- tests ---

test("e2e: runBackfill end-to-end on fixture — agreement path", async () => {
  const { root, scopePath } = makeFixture();
  const previewDir = path.join(root, "preview");
  const checkpointPath = path.join(root, "backfill-checkpoint.jsonl");

  const recordFn = (f) => ({
    path: f.path,
    type: "script",
    source_scope: scopeForPath(f.path),
    portability: "portable",
    purpose: `Purpose for ${f.path}`,
    confidence: {
      type: 0.95,
      source_scope: 0.92,
      portability: 0.88,
      purpose: 0.9,
    },
  });

  const result = await orch.runBackfill({
    scanOpts: { scopePath, rootDir: root },
    dispatchPrimary: buildDispatcher(recordFn, "primary"),
    dispatchSecondary: buildDispatcher(recordFn, "secondary"),
    previewDir,
    checkpointPath,
  });

  assert.equal(result.scanResult.files.length, 6);
  assert.ok(result.batches.length >= 1 && result.batches.length <= 6);
  assert.equal(result.preview.counts.shared + result.preview.counts.local, 6);
  // project -> local; universal + user -> shared
  assert.equal(result.preview.counts.shared, 4);
  assert.equal(result.preview.counts.local, 2);

  const sharedRecords = catalogIo.readCatalog(result.preview.shared);
  const localRecords = catalogIo.readCatalog(result.preview.local);
  assert.equal(sharedRecords.length, 4);
  assert.equal(localRecords.length, 2);

  for (const r of [...sharedRecords, ...localRecords]) {
    assert.deepEqual(r.needs_review, [], `${r.path} should have empty needs_review`);
  }

  const history = orch.loadCheckpointHistory({ path: checkpointPath });
  const phases = history.map((h) => h.phase);
  assert.ok(phases.includes("scan"));
  assert.ok(phases.includes("split"));
  assert.ok(phases.includes("cross-checking"));
  assert.equal(phases[phases.length - 1], "preview-written");

  rmrf(root);
});

test("e2e: runBackfill surfaces disagreements into needs_review", async () => {
  const { root, scopePath } = makeFixture();
  const previewDir = path.join(root, "preview");
  const checkpointPath = path.join(root, "backfill-checkpoint.jsonl");

  const primary = (f) => ({
    path: f.path,
    type: "skill",
    source_scope: scopeForPath(f.path),
    purpose: `Shared purpose for ${f.path}`,
    confidence: { type: 0.95, source_scope: 0.9, purpose: 0.9 },
  });
  // Secondary disagrees on `type` for skill-a.md only.
  const secondary = (f) => ({
    path: f.path,
    type: f.path === "docs/skill-a.md" ? "agent" : "skill",
    source_scope: scopeForPath(f.path),
    purpose: `Shared purpose for ${f.path}`,
    confidence: { type: 0.9, source_scope: 0.88, purpose: 0.92 },
  });

  const result = await orch.runBackfill({
    scanOpts: { scopePath, rootDir: root },
    dispatchPrimary: buildDispatcher(primary, "primary"),
    dispatchSecondary: buildDispatcher(secondary, "secondary"),
    previewDir,
    checkpointPath,
  });

  const shared = catalogIo.readCatalog(result.preview.shared);
  const skillA = shared.find((r) => r.path === "docs/skill-a.md");
  assert.ok(skillA, "skill-a.md should be in shared preview");
  assert.ok(skillA.needs_review.includes("type"), "type disagreement should surface in needs_review");

  const skillB = shared.find((r) => r.path === "docs/skill-b.md");
  assert.deepEqual(skillB.needs_review, []);

  rmrf(root);
});

test("e2e: approveAndPromote writes real catalog atomically", async () => {
  const { root, scopePath } = makeFixture();
  const previewDir = path.join(root, "preview");
  const realDir = path.join(root, "real");
  const checkpointPath = path.join(root, "backfill-checkpoint.jsonl");

  const recordFn = (f) => ({
    path: f.path,
    type: "script",
    source_scope: scopeForPath(f.path),
    confidence: { type: 0.95, source_scope: 0.92 },
  });

  await orch.runBackfill({
    scanOpts: { scopePath, rootDir: root },
    dispatchPrimary: buildDispatcher(recordFn, "primary"),
    dispatchSecondary: buildDispatcher(recordFn, "secondary"),
    previewDir,
    checkpointPath,
  });

  fs.mkdirSync(realDir, { recursive: true });
  const promoted = orch.approveAndPromote({ previewDir, realDir, checkpointPath });

  assert.ok(fs.existsSync(promoted.sharedPath));
  assert.ok(fs.existsSync(promoted.localPath));
  const realShared = catalogIo.readCatalog(promoted.sharedPath);
  const realLocal = catalogIo.readCatalog(promoted.localPath);
  assert.equal(realShared.length + realLocal.length, 6);

  const latest = orch.loadCheckpoint({ path: checkpointPath });
  assert.equal(latest.phase, "promoted");

  rmrf(root);
});

test("e2e: reject + re-run with corrected dispatchers produces new preview", async () => {
  const { root, scopePath } = makeFixture();
  const previewDir = path.join(root, "preview");
  const checkpointPath = path.join(root, "backfill-checkpoint.jsonl");

  const weak = (f) => ({
    path: f.path,
    type: "unknown",
    source_scope: scopeForPath(f.path),
    confidence: { type: 0.3, source_scope: 0.4 },
  });

  await orch.runBackfill({
    scanOpts: { scopePath, rootDir: root },
    dispatchPrimary: buildDispatcher(weak, "primary"),
    dispatchSecondary: buildDispatcher(weak, "secondary"),
    previewDir,
    checkpointPath,
  });

  const weakShared = catalogIo.readCatalog(path.join(previewDir, "shared.jsonl"));
  assert.ok(
    weakShared.some((r) => r.needs_review && r.needs_review.length > 0),
    "weak run should leave needs_review items"
  );

  orch.rejectAndClear({ previewDir });
  assert.equal(orch.previewExists({ previewDir }), false);

  const strong = (f) => ({
    path: f.path,
    type: "script",
    source_scope: scopeForPath(f.path),
    confidence: { type: 0.95, source_scope: 0.93 },
  });

  await orch.runBackfill({
    scanOpts: { scopePath, rootDir: root },
    dispatchPrimary: buildDispatcher(strong, "primary"),
    dispatchSecondary: buildDispatcher(strong, "secondary"),
    previewDir,
    checkpointPath,
  });

  const strongShared = catalogIo.readCatalog(path.join(previewDir, "shared.jsonl"));
  for (const r of strongShared) {
    assert.deepEqual(r.needs_review, [], `${r.path} needs_review should be empty on re-run`);
  }

  rmrf(root);
});

test("e2e: checkpoint recovery — resume skips completed batches AND preserves their records", async () => {
  const { root, scopePath } = makeFixture();
  const previewDir = path.join(root, "preview");
  const checkpointPath = path.join(root, "backfill-checkpoint.jsonl");

  const recordFn = (f) => ({
    path: f.path,
    type: "script",
    source_scope: scopeForPath(f.path),
    confidence: { type: 0.95, source_scope: 0.92 },
  });

  // First run: execute a complete back-fill so we can then simulate a
  // mid-way crash and verify that resume recovers ALL records — not just
  // the freshly-dispatched ones. (R1 Q1 regression coverage.)
  await orch.runBackfill({
    scanOpts: { scopePath, rootDir: root },
    dispatchPrimary: buildDispatcher(recordFn, "primary"),
    dispatchSecondary: buildDispatcher(recordFn, "secondary"),
    previewDir,
    checkpointPath,
  });

  // Snapshot the complete-run preview counts for comparison with resume.
  const fullShared = catalogIo.readCatalog(path.join(previewDir, "shared.jsonl"));
  const fullLocal = catalogIo.readCatalog(path.join(previewDir, "local.jsonl"));
  const fullTotal = fullShared.length + fullLocal.length;
  assert.equal(fullTotal, 6, "baseline run must produce all 6 fixture records");

  // Now wipe preview + simulate a mid-flight crash after batch 0: the
  // checkpoint file already holds real cross-check-result entries from
  // the baseline run. Overlay a "cross-checking" checkpoint claiming only
  // batch 0 is done; resume must skip batch 0 but still end up with ALL
  // original records in the new preview (rehydrated from the baseline
  // cross-check-result history).
  orch.rejectAndClear({ previewDir });
  orch.saveCheckpoint(
    {
      ts: new Date().toISOString(),
      phase: "cross-checking",
      batch_index: 0,
      batch_total: null,
      completed_batches: [0],
    },
    { path: checkpointPath }
  );

  let primaryCalls = 0;
  let secondaryCalls = 0;
  const countingPrimary = async (batch, batchId) => {
    primaryCalls += 1;
    return buildDispatcher(recordFn, "primary")(batch, batchId);
  };
  const countingSecondary = async (batch, batchId) => {
    secondaryCalls += 1;
    return buildDispatcher(recordFn, "secondary")(batch, batchId);
  };

  const result = await orch.runBackfill({
    scanOpts: { scopePath, rootDir: root },
    dispatchPrimary: countingPrimary,
    dispatchSecondary: countingSecondary,
    previewDir,
    checkpointPath,
    resume: true,
  });

  assert.ok(result.batches.length >= 1, "fixture must produce at least 1 batch");
  if (result.batches.length > 1) {
    assert.ok(
      primaryCalls < result.batches.length,
      `resume should skip completed batch 0 — got ${primaryCalls} primary calls for ${result.batches.length} batches`
    );
    assert.equal(primaryCalls, secondaryCalls);
  }

  // R1 Q1 regression: preview must contain records from ALL batches —
  // the skipped one rehydrated from checkpoint history, the remaining
  // ones freshly dispatched. Previously this would silently drop batch 0.
  const resumedShared = catalogIo.readCatalog(path.join(previewDir, "shared.jsonl"));
  const resumedLocal = catalogIo.readCatalog(path.join(previewDir, "local.jsonl"));
  const resumedTotal = resumedShared.length + resumedLocal.length;
  assert.equal(
    resumedTotal,
    fullTotal,
    `resumed preview must contain all ${fullTotal} records (got ${resumedTotal}); rehydration from checkpoint history dropped records`
  );

  rmrf(root);
});

test("e2e: dispatchers returning non-array throw at trust boundary", async () => {
  // R1 Gemini G3: validate dispatcher return shape before .find() crashes.
  const { root, scopePath } = makeFixture();
  const previewDir = path.join(root, "preview");
  const checkpointPath = path.join(root, "backfill-checkpoint.jsonl");

  await assert.rejects(
    () =>
      orch.runBackfill({
        scanOpts: { scopePath, rootDir: root },
        dispatchPrimary: async () => null, // Should crash cleanly, not TypeError.
        dispatchSecondary: async () => [],
        previewDir,
        checkpointPath,
      }),
    /dispatchPrimary.*must return an array/
  );

  rmrf(root);
});

test("e2e: synthesize callback receives summary data", async () => {
  const { root, scopePath } = makeFixture();
  const previewDir = path.join(root, "preview");
  const checkpointPath = path.join(root, "backfill-checkpoint.jsonl");

  const recordFn = (f) => ({
    path: f.path,
    type: "script",
    source_scope: scopeForPath(f.path),
    confidence: { type: 0.95, source_scope: 0.92 },
  });

  let capturedSummary;
  const synthesize = (findings) => {
    capturedSummary = findings;
    return { ok: true, report: "stub synthesis" };
  };

  const result = await orch.runBackfill({
    scanOpts: { scopePath, rootDir: root },
    dispatchPrimary: buildDispatcher(recordFn, "primary"),
    dispatchSecondary: buildDispatcher(recordFn, "secondary"),
    synthesize,
    previewDir,
    checkpointPath,
  });

  assert.ok(capturedSummary, "synthesize callback must be invoked");
  assert.equal(typeof capturedSummary.agreement_rate, "number");
  assert.equal(capturedSummary.record_count, 6);
  assert.deepEqual(result.summary, { ok: true, report: "stub synthesis" });

  rmrf(root);
});

test("e2e: runBackfill validates required callbacks", async () => {
  await assert.rejects(() => orch.runBackfill({}), /dispatchPrimary/);
  await assert.rejects(
    () => orch.runBackfill({ dispatchPrimary: () => [] }),
    /dispatchSecondary/
  );
});
