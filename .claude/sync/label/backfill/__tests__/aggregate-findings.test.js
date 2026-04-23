/**
 * aggregate-findings.test.js — Covers the disagreement-path fix from
 * PR #11 R1 Gemini item (r.path vs r.preview.path for successful
 * cross-check records).
 */

"use strict";

const { test } = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");

const { aggregate } = require(path.join(__dirname, "..", "aggregate-findings.js"));

test("aggregate: disagreement path is sourced from r.preview.path on successful records", () => {
  // cross-check output shape for a successful record:
  //   { preview: { path: "x.md", ... }, disagreements: [...] }
  // Pre-fix, aggregate() read `r.path` which is undefined for successful
  // records — every disagreement shipped with `path: undefined`, breaking
  // downstream grouping/arbitration (which keys off path).
  const batches = [
    {
      batchId: "B01",
      records: [
        {
          preview: {
            path: "x.md",
            needs_review: ["purpose"],
          },
          disagreements: [
            { field: "purpose", case: "C", primary: { value: "a" }, secondary: { value: "b" } },
          ],
        },
      ],
    },
  ];
  const out = aggregate(batches);
  assert.equal(out.disagreements.length, 1);
  assert.equal(out.disagreements[0].path, "x.md", "path must be carried through");
  assert.equal(out.disagreements[0].field, "purpose");
});

test("aggregate: unreachable-shape records still carry r.path (no regression)", () => {
  const batches = [
    {
      batchId: "B01",
      records: [
        { unreachable: true, path: "gone.md", reason: "ENOENT" },
      ],
    },
  ];
  const out = aggregate(batches);
  assert.deepEqual(out.unreachable, ["gone.md"]);
  assert.equal(out.disagreements.length, 0);
});

test("aggregate: mixed successful + unreachable in one batch", () => {
  const batches = [
    {
      batchId: "B01",
      records: [
        {
          preview: { path: "a.md", needs_review: [] },
          disagreements: [],
        },
        { unreachable: true, path: "gone.md" },
        {
          preview: { path: "b.md", needs_review: ["type"] },
          disagreements: [
            { field: "type", case: "C", primary: { value: "doc" }, secondary: { value: "skill" } },
          ],
        },
      ],
    },
  ];
  const out = aggregate(batches);
  assert.equal(out.record_count, 2, "a.md + b.md counted, gone.md is unreachable");
  assert.deepEqual(out.unreachable, ["gone.md"]);
  assert.equal(out.disagreements.length, 1);
  assert.equal(out.disagreements[0].path, "b.md");
});
