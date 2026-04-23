/**
 * cross-check.test.js — Field-level disagreement routing tests.
 *
 * One test per DISAGREEMENT_RESOLUTION.md case (A–G) plus:
 *   - Record unreachable (primary null)
 *   - crossCheckBatch routing across 3 pairs (A / B / C mix)
 */

const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");

const MOD = path.join(__dirname, "..", "cross-check.js");

// --- Case A: agreement + high confidence ---
test("Case A: agreement + high confidence → committed, not in needsReview", () => {
  const { crossCheck } = require(MOD);
  const primary = {
    path: "a.js",
    type: "script-lib",
    confidence: { type: 0.95 },
  };
  const secondary = {
    path: "a.js",
    type: "script-lib",
    confidence: { type: 0.9 },
  };
  const { preview, needsReview, disagreements } = crossCheck({
    primary,
    secondary,
  });
  assert.equal(preview.type, "script-lib");
  assert.equal(preview.confidence.type, 0.9); // min(0.95, 0.9)
  assert.ok(!needsReview.includes("type"));
  assert.deepEqual(preview.needs_review, []);
  assert.deepEqual(disagreements, []);
});

// --- Case B: agreement + low confidence ---
test("Case B: agreement + low confidence → committed, in needsReview", () => {
  const { crossCheck } = require(MOD);
  const primary = {
    path: "b.js",
    purpose: "helper",
    confidence: { purpose: 0.7 },
  };
  const secondary = {
    path: "b.js",
    purpose: "helper",
    confidence: { purpose: 0.75 },
  };
  const { preview, needsReview, disagreements } = crossCheck({
    primary,
    secondary,
  });
  assert.equal(preview.purpose, "helper");
  assert.equal(preview.confidence.purpose, 0.7);
  assert.ok(needsReview.includes("purpose"));
  assert.deepEqual(disagreements, []);
});

// --- Case C: scalar disagreement ---
test("Case C: scalar disagreement → null in preview, candidates on disagreements sidecar", () => {
  const { crossCheck } = require(MOD);
  const primary = {
    path: "c.js",
    type: "script-lib",
    confidence: { type: 0.92 },
  };
  const secondary = {
    path: "c.js",
    type: "script",
    confidence: { type: 0.88 },
  };
  const { preview, needsReview, disagreements } = crossCheck({
    primary,
    secondary,
  });
  // Preview value is schema-compliant null (scalar field stays a scalar).
  assert.equal(preview.type, null);
  assert.equal(preview.confidence.type, 0);
  assert.ok(needsReview.includes("type"));
  assert.equal(disagreements.length, 1);
  const d = disagreements[0];
  assert.equal(d.field, "type");
  assert.equal(d.case, "C");
  // Candidates now live on the disagreement sidecar, not inside the record.
  assert.equal(d.candidates.length, 2);
  assert.equal(d.candidates[0].source, "primary");
  assert.equal(d.candidates[0].value, "script-lib");
  assert.equal(d.candidates[0].confidence, 0.92);
  assert.equal(d.candidates[1].source, "secondary");
  assert.equal(d.candidates[1].value, "script");
});

// --- Case D: array disagreement ---
test("Case D: array disagreement → set-union in preview (schema-compliant), candidates on sidecar", () => {
  const { crossCheck } = require(MOD);
  const primary = {
    path: "d.js",
    deps: ["fs", "path"],
    confidence: { deps: 0.9 },
  };
  const secondary = {
    path: "d.js",
    deps: ["path", "os"],
    confidence: { deps: 0.85 },
  };
  const { preview, needsReview, disagreements } = crossCheck({
    primary,
    secondary,
  });
  // Preview value IS the merged array — schema validates (array of strings).
  assert.deepEqual(preview.deps, ["fs", "path", "os"]);
  assert.ok(needsReview.includes("deps"));
  assert.equal(disagreements.length, 1);
  const d = disagreements[0];
  assert.equal(d.case, "D");
  assert.equal(d.candidates.length, 2);
  assert.deepEqual(d.candidates[0].value, ["fs", "path"]);
  assert.deepEqual(d.candidates[1].value, ["path", "os"]);
});

// --- Case E: one side null ---
test("Case E: one side null → non-null committed, in needsReview", () => {
  const { crossCheck } = require(MOD);
  const primary = {
    path: "e.js",
    purpose: "utility helper",
    confidence: { purpose: 0.9 },
  };
  const secondary = {
    path: "e.js",
    purpose: null,
    confidence: { purpose: 0 },
  };
  const { preview, needsReview, disagreements } = crossCheck({
    primary,
    secondary,
  });
  assert.equal(preview.purpose, "utility helper");
  assert.ok(needsReview.includes("purpose"));
  assert.equal(disagreements.length, 1);
  assert.equal(disagreements[0].case, "E");
});

// --- Case F: both null ---
test("Case F: both null with low confidence → null committed, in needsReview", () => {
  const { crossCheck } = require(MOD);
  const primary = {
    path: "f.js",
    purpose: null,
    confidence: { purpose: 0 },
  };
  const secondary = {
    path: "f.js",
    purpose: null,
    confidence: { purpose: 0 },
  };
  const { preview, needsReview, disagreements } = crossCheck({
    primary,
    secondary,
  });
  assert.equal(preview.purpose, null);
  assert.ok(needsReview.includes("purpose"));
  assert.deepEqual(disagreements, []); // F is a gap, not a disagreement
});

test("Case F: both null with high confidence → agreement, NOT in needsReview", () => {
  // Post-confidence-coverage-rule: when both agents confidently say null
  // (e.g. lineage: null on a native file), that's agreement on null, not a
  // gap. Should score via min(pConf, sConf) and stay out of needs_review.
  const { crossCheck } = require(MOD);
  const primary = {
    path: "f.js",
    lineage: null,
    confidence: { lineage: 0.95 },
  };
  const secondary = {
    path: "f.js",
    lineage: null,
    confidence: { lineage: 0.9 },
  };
  const { preview, needsReview, disagreements } = crossCheck({
    primary,
    secondary,
  });
  assert.equal(preview.lineage, null);
  assert.ok(
    !needsReview.includes("lineage"),
    `lineage should NOT be flagged when both agents confidently agree on null (got needsReview: ${JSON.stringify(needsReview)})`
  );
  assert.equal(preview.confidence.lineage, 0.9, "score is min(pConf, sConf)");
  assert.deepEqual(disagreements, []);
});

// --- Case G: type mismatch ---
test("Case G: type mismatch → null in preview (schema-compliant), type_mismatch on sidecar", () => {
  const { crossCheck } = require(MOD);
  const primary = {
    path: "g.js",
    type: "script",
    confidence: { type: 0.9 },
  };
  const secondary = {
    path: "g.js",
    type: { kind: "script" }, // object vs string — Case G
    confidence: { type: 0.85 },
  };
  const { preview, needsReview, disagreements } = crossCheck({
    primary,
    secondary,
  });
  // Preview stores null (scalar schema-compliant); sidecar flags the
  // type_mismatch so the synthesis agent surfaces it prominently.
  assert.equal(preview.type, null);
  assert.equal(preview.confidence.type, 0);
  assert.ok(needsReview.includes("type"));
  assert.equal(disagreements.length, 1);
  const d = disagreements[0];
  assert.equal(d.case, "G");
  assert.equal(d.type_mismatch, true);
  assert.equal(d.candidates.length, 2);
});

// --- R2 Q5: machinery fields excluded from cross-check ---
test("Machinery fields: primary/secondary disagreement on last_hook_fire does NOT surface", () => {
  // R2 Q5: orchestrator-owned fields (pending_agent_fill, manual_override,
  // needs_review, last_hook_fire, schema_version) MUST be excluded from the
  // cross-check field iteration — agent timestamps differ by construction
  // and would otherwise produce a guaranteed Case C disagreement per record.
  const { crossCheck } = require(MOD);
  const primary = {
    path: "m.js",
    type: "script",
    last_hook_fire: "2026-04-20T18:00:00.000Z",
    pending_agent_fill: false,
    manual_override: ["type"],
    needs_review: ["purpose"],
    schema_version: "1.2",
    confidence: { type: 0.95 },
  };
  const secondary = {
    path: "m.js",
    type: "script",
    last_hook_fire: "2026-04-20T18:00:00.999Z", // different timestamp
    pending_agent_fill: false,
    manual_override: [], // primary has ["type"], secondary has []
    needs_review: [], // different too
    schema_version: "1.2",
    confidence: { type: 0.92 },
  };
  const { preview, needsReview, disagreements } = crossCheck({
    primary,
    secondary,
  });
  // Only `type` should be cross-checked (agreement).
  assert.equal(preview.type, "script");
  assert.deepEqual(disagreements, []);
  assert.deepEqual(needsReview, []);
  // Machinery fields are excluded from the preview too — orchestrator
  // re-stamps them at promote time.
  assert.ok(!("last_hook_fire" in preview));
  assert.ok(!("pending_agent_fill" in preview));
  assert.ok(!("manual_override" in preview));
  assert.ok(!("needs_review" in preview) || Array.isArray(preview.needs_review));
  // (needs_review is added by the machinery layer — tolerate either absence
  // or empty-array presence depending on downstream merge.)
  assert.ok(!("schema_version" in preview));
});

// --- Record unreachable: primary null ---
test("Record unreachable: primary null → { unreachable: true }", () => {
  const { crossCheck } = require(MOD);
  const result = crossCheck({
    primary: null,
    secondary: {
      path: "x.js",
      type: "script",
      confidence: { type: 0.9 },
    },
  });
  assert.equal(result.preview, null);
  assert.deepEqual(result.needsReview, []);
  assert.deepEqual(result.disagreements, []);
  assert.equal(result.unreachable, true);
});

// --- crossCheckBatch: 3 pairs A/B/C ---
test("crossCheckBatch: 3 pairs A/B/C → correct routing per pair", () => {
  const { crossCheckBatch } = require(MOD);
  const pairs = [
    {
      path: "a.js",
      primary: {
        path: "a.js",
        type: "script-lib",
        confidence: { type: 0.95 },
      },
      secondary: {
        path: "a.js",
        type: "script-lib",
        confidence: { type: 0.9 },
      },
    },
    {
      path: "b.js",
      primary: {
        path: "b.js",
        purpose: "helper",
        confidence: { purpose: 0.7 },
      },
      secondary: {
        path: "b.js",
        purpose: "helper",
        confidence: { purpose: 0.75 },
      },
    },
    {
      path: "c.js",
      primary: {
        path: "c.js",
        type: "script-lib",
        confidence: { type: 0.92 },
      },
      secondary: {
        path: "c.js",
        type: "script",
        confidence: { type: 0.88 },
      },
    },
  ];
  const results = crossCheckBatch(pairs);
  assert.equal(results.length, 3);

  // Pair A: agreement, high confidence → clean.
  assert.equal(results[0].path, "a.js");
  assert.equal(results[0].preview.type, "script-lib");
  assert.deepEqual(results[0].needsReview, []);
  assert.deepEqual(results[0].disagreements, []);

  // Pair B: agreement, low confidence → committed + flagged.
  assert.equal(results[1].path, "b.js");
  assert.equal(results[1].preview.purpose, "helper");
  assert.ok(results[1].needsReview.includes("purpose"));
  assert.deepEqual(results[1].disagreements, []);

  // Pair C: scalar disagreement → null in preview, candidates on sidecar.
  assert.equal(results[2].path, "c.js");
  assert.equal(results[2].preview.type, null);
  assert.ok(results[2].needsReview.includes("type"));
  assert.equal(results[2].disagreements.length, 1);
  assert.equal(results[2].disagreements[0].case, "C");
  assert.equal(results[2].disagreements[0].candidates.length, 2);
});
