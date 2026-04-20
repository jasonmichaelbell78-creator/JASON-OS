/**
 * checkpoint.test.js — Piece 3 S8 back-fill checkpoint smoke tests.
 *
 * Runs with:
 *   node --test .claude/sync/label/backfill/__tests__/checkpoint.test.js
 *
 * Every test uses an isolated tmp directory via `fs.mkdtempSync`. The real
 * CHECKPOINT_PATH constant is referenced ONCE to confirm its shape; no test
 * writes to it.
 */

const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");

const {
  CHECKPOINT_PATH,
  saveCheckpoint,
  loadCheckpoint,
  loadCheckpointHistory,
  clearCheckpoint,
} = require(path.join(__dirname, "..", "checkpoint"));

/** Allocate an isolated tmp checkpoint path. */
function tmpCheckpoint() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "label-backfill-ckpt-"));
  return path.join(dir, "checkpoint.jsonl");
}

// --- CHECKPOINT_PATH constant --------------------------------------------

test("CHECKPOINT_PATH: resolves to absolute .claude/state/label-backfill-checkpoint.jsonl", () => {
  assert.equal(typeof CHECKPOINT_PATH, "string");
  assert.ok(path.isAbsolute(CHECKPOINT_PATH), "must be absolute");
  assert.ok(
    CHECKPOINT_PATH.endsWith(
      path.join(".claude", "state", "label-backfill-checkpoint.jsonl")
    ),
    `unexpected tail: ${CHECKPOINT_PATH}`
  );
});

// --- Round-trip -----------------------------------------------------------

test("saveCheckpoint + loadCheckpoint round-trip", () => {
  const file = tmpCheckpoint();
  const state = {
    ts: "2026-04-20T18:00:00.000Z",
    phase: "scan",
    batch_index: 0,
    batch_total: null,
    completed_batches: [],
    artifacts: { preview_dir: ".claude/sync/label/preview" },
    notes: "first scan",
  };
  saveCheckpoint(state, { path: file });
  const back = loadCheckpoint({ path: file });
  assert.deepEqual(back, state);
});

// --- Latest vs history ---------------------------------------------------

test("loadCheckpoint returns LATEST; loadCheckpointHistory returns all in order", () => {
  const file = tmpCheckpoint();
  const s1 = { ts: "2026-04-20T18:00:00.000Z", phase: "scan", batch_index: 0 };
  const s2 = { ts: "2026-04-20T18:01:00.000Z", phase: "split", batch_index: 0 };
  const s3 = {
    ts: "2026-04-20T18:02:00.000Z",
    phase: "dispatching",
    batch_index: 0,
    batch_total: 3,
  };
  saveCheckpoint(s1, { path: file });
  saveCheckpoint(s2, { path: file });
  saveCheckpoint(s3, { path: file });

  const latest = loadCheckpoint({ path: file });
  assert.deepEqual(latest, s3);

  const history = loadCheckpointHistory({ path: file });
  assert.equal(history.length, 3);
  assert.deepEqual(history[0], s1);
  assert.deepEqual(history[1], s2);
  assert.deepEqual(history[2], s3);
});

// --- Missing/empty file ---------------------------------------------------

test("loadCheckpoint on missing file returns null", () => {
  const file = tmpCheckpoint();
  // File does not exist yet.
  assert.equal(loadCheckpoint({ path: file }), null);
  assert.deepEqual(loadCheckpointHistory({ path: file }), []);
});

test("loadCheckpoint on empty file returns null", () => {
  const file = tmpCheckpoint();
  fs.writeFileSync(file, "");
  assert.equal(loadCheckpoint({ path: file }), null);
  assert.deepEqual(loadCheckpointHistory({ path: file }), []);
});

// --- clearCheckpoint -----------------------------------------------------

test("clearCheckpoint on missing file does not throw (idempotent)", () => {
  const file = tmpCheckpoint();
  assert.doesNotThrow(() => clearCheckpoint({ path: file }));
});

test("clearCheckpoint removes existing file", () => {
  const file = tmpCheckpoint();
  saveCheckpoint({ phase: "scan" }, { path: file });
  assert.ok(fs.existsSync(file), "precondition: file should exist");
  clearCheckpoint({ path: file });
  assert.equal(fs.existsSync(file), false);
});

// --- Validation: ts / phase ----------------------------------------------

test("saveCheckpoint without ts auto-populates a valid ISO string", () => {
  const file = tmpCheckpoint();
  saveCheckpoint({ phase: "scan" }, { path: file });
  const back = loadCheckpoint({ path: file });
  assert.equal(back.phase, "scan");
  assert.equal(typeof back.ts, "string");
  assert.ok(back.ts.length > 0, "ts must be non-empty");
  // ISO 8601 basic shape: YYYY-MM-DDTHH:MM:SS(.fff)Z
  const iso = new Date(back.ts);
  assert.ok(!Number.isNaN(iso.getTime()), `ts not parseable as Date: ${back.ts}`);
  // Round-trip: Date -> ISO should give back the same string our code wrote.
  assert.equal(iso.toISOString(), back.ts);
});

test("saveCheckpoint without phase throws", () => {
  const file = tmpCheckpoint();
  assert.throws(
    () => saveCheckpoint({ ts: "2026-04-20T18:00:00.000Z" }, { path: file }),
    /phase is required/
  );
});

test("saveCheckpoint with empty phase throws", () => {
  const file = tmpCheckpoint();
  assert.throws(
    () => saveCheckpoint({ phase: "" }, { path: file }),
    /phase is required/
  );
});

test("saveCheckpoint with non-object state throws", () => {
  const file = tmpCheckpoint();
  assert.throws(() => saveCheckpoint(null, { path: file }), /plain object/);
  assert.throws(() => saveCheckpoint("nope", { path: file }), /plain object/);
  assert.throws(() => saveCheckpoint([1, 2], { path: file }), /plain object/);
});

// --- Corruption detection ------------------------------------------------

test("loadCheckpoint throws with line number on corrupted line", () => {
  const file = tmpCheckpoint();
  const good = JSON.stringify({ ts: "2026-04-20T18:00:00.000Z", phase: "scan" });
  // Line 2 is malformed JSON.
  fs.writeFileSync(file, `${good}\n{not-json\n`);
  assert.throws(
    () => loadCheckpoint({ path: file }),
    (err) =>
      err instanceof Error &&
      /malformed JSON/.test(err.message) &&
      /line 2/.test(err.message)
  );
  assert.throws(
    () => loadCheckpointHistory({ path: file }),
    /line 2/
  );
});

// --- Crash-resume simulation ---------------------------------------------

test("crash-resume: save 3, reopen history, confirm all 3 present + latest is 3rd", () => {
  const file = tmpCheckpoint();
  const s1 = {
    ts: "2026-04-20T18:00:00.000Z",
    phase: "scan",
    batch_index: null,
    batch_total: null,
    completed_batches: [],
  };
  const s2 = {
    ts: "2026-04-20T18:05:00.000Z",
    phase: "dispatching",
    batch_index: 0,
    batch_total: 3,
    completed_batches: [],
  };
  const s3 = {
    ts: "2026-04-20T18:10:00.000Z",
    phase: "cross-checking",
    batch_index: 1,
    batch_total: 3,
    completed_batches: [0],
  };
  saveCheckpoint(s1, { path: file });
  saveCheckpoint(s2, { path: file });
  saveCheckpoint(s3, { path: file });

  // Re-require the module fresh to simulate process restart. Because the
  // module's state lives entirely on disk this is belt-and-suspenders, but
  // it makes the "crash-resume" intent explicit.
  delete require.cache[require.resolve(path.join(__dirname, "..", "checkpoint"))];
  const reopened = require(path.join(__dirname, "..", "checkpoint"));

  const history = reopened.loadCheckpointHistory({ path: file });
  assert.equal(history.length, 3);
  assert.deepEqual(history[0], s1);
  assert.deepEqual(history[1], s2);
  assert.deepEqual(history[2], s3);

  const latest = reopened.loadCheckpoint({ path: file });
  assert.deepEqual(latest, s3);
});

// --- Blank-line tolerance -------------------------------------------------

test("load* skips blank lines", () => {
  const file = tmpCheckpoint();
  const s1 = JSON.stringify({ ts: "2026-04-20T18:00:00.000Z", phase: "scan" });
  const s2 = JSON.stringify({ ts: "2026-04-20T18:01:00.000Z", phase: "split" });
  // Deliberate blank lines before, between, after.
  fs.writeFileSync(file, `\n${s1}\n\n${s2}\n\n`);
  const history = loadCheckpointHistory({ path: file });
  assert.equal(history.length, 2);
  assert.equal(history[0].phase, "scan");
  assert.equal(history[1].phase, "split");
  assert.equal(loadCheckpoint({ path: file }).phase, "split");
});
