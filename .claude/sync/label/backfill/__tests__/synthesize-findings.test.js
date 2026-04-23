/**
 * synthesize-findings.test.js — Covers behavior changes introduced in
 * PR #11 R1:
 *
 *   - isMissingValue: empty array is NOT missing (Qodo #5)
 *   - setUnion: stable across key-order differences (Gemini #15)
 *   - classifyCases: empty-array agreement → Case B, not Case F (Qodo #5)
 *   - renderSummary: 0%-rationale paragraph is conditional (Gemini #16)
 */

"use strict";

const { test } = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");

const MOD = path.join(__dirname, "..", "synthesize-findings.js");
const {
  isMissingValue,
  setUnion,
  stableStringify,
  classifyCases,
  renderSummary,
  buildProposal,
} = require(MOD);

// ---- isMissingValue --------------------------------------------------------

test("isMissingValue: null, undefined, and whitespace-only strings are missing", () => {
  assert.equal(isMissingValue(null), true);
  assert.equal(isMissingValue(undefined), true);
  assert.equal(isMissingValue(""), true);
  assert.equal(isMissingValue("   "), true);
  assert.equal(isMissingValue("\t\n"), true);
});

test("isMissingValue: empty arrays are NOT missing (legitimate schema value)", () => {
  // Pre-fix regression: `[]` was treated as missing, misclassifying
  // agreed-empty dependencies/tool_deps/external_services as Case F
  // coverage gaps instead of Case B auto-confirms.
  assert.equal(isMissingValue([]), false);
  assert.equal(isMissingValue([1]), false);
  assert.equal(isMissingValue([{}]), false);
});

test("isMissingValue: non-empty strings and objects are not missing", () => {
  assert.equal(isMissingValue("hello"), false);
  assert.equal(isMissingValue({}), false);
  assert.equal(isMissingValue(0), false);
  assert.equal(isMissingValue(false), false);
});

// ---- stableStringify / setUnion -------------------------------------------

test("stableStringify: object key order does not affect output", () => {
  const a = { a: 1, b: 2, c: { d: 3, e: 4 } };
  const b = { c: { e: 4, d: 3 }, b: 2, a: 1 };
  assert.equal(stableStringify(a), stableStringify(b));
});

test("stableStringify: arrays preserve index order", () => {
  assert.equal(stableStringify([1, 2, 3]), "[1,2,3]");
  assert.notEqual(stableStringify([1, 2, 3]), stableStringify([3, 2, 1]));
});

test("setUnion: dedupes objects with different key orders (LLM output safety)", () => {
  // Primary and secondary agents may emit the same semantic object in
  // different key orders — native JSON.stringify treats them as distinct
  // and leaks duplicates. stableStringify keying fixes that.
  const primary = [{ name: "foo", hardness: "hard" }];
  const secondary = [{ hardness: "hard", name: "foo" }];
  const merged = setUnion(primary, secondary);
  assert.equal(merged.length, 1, "same object with different key order must dedupe");
});

test("setUnion: preserves genuinely distinct objects", () => {
  const merged = setUnion(
    [{ name: "foo" }, { name: "bar" }],
    [{ name: "bar" }, { name: "baz" }]
  );
  assert.equal(merged.length, 3);
});

// ---- classifyCases empty-array behavior ------------------------------------

test("classifyCases: agreed empty-array on required field is Case B, not Case F", () => {
  const findings = {
    records: [
      {
        path: "x.md",
        needs_review: ["dependencies"],
        dependencies: [], // valid empty value per schema v1.3
        confidence: { dependencies: 0.4 }, // low but agreed
      },
    ],
    disagreements: [], // both agents agreed
  };
  const buckets = classifyCases(findings);
  assert.equal(buckets.B.length, 1, "empty-array agreement → Case B (auto-confirm)");
  assert.equal(buckets.F.length, 0, "should NOT be misclassified as Case F");
  assert.deepEqual(buckets.B[0].value, []);
});

test("classifyCases: null values still classify as Case F", () => {
  const findings = {
    records: [
      {
        path: "x.md",
        needs_review: ["purpose"],
        purpose: null,
      },
    ],
    disagreements: [],
  };
  const buckets = classifyCases(findings);
  assert.equal(buckets.F.length, 1);
  assert.equal(buckets.B.length, 0);
});

// ---- renderSummary conditional prose ---------------------------------------

test("renderSummary: 0%-rationale paragraph only appears when agreement_rate IS 0", () => {
  const findingsZero = {
    record_count: 5,
    disagreements: [],
    agreement_rate: 0,
    records: [],
  };
  const proposalZero = buildProposal(findingsZero, __dirname);
  const summaryZero = renderSummary(findingsZero, proposalZero);
  assert.ok(
    summaryZero.includes("Agreement rate is 0%"),
    "0%-rationale must appear when rate is 0"
  );

  const findingsHigh = {
    record_count: 5,
    disagreements: [],
    agreement_rate: 0.42,
    records: [],
  };
  const proposalHigh = buildProposal(findingsHigh, __dirname);
  const summaryHigh = renderSummary(findingsHigh, proposalHigh);
  assert.ok(
    !summaryHigh.includes("Agreement rate is 0%"),
    "0%-rationale must NOT appear when rate is non-zero (would contradict stats)"
  );
});
