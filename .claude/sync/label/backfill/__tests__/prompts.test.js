/**
 * prompts.test.js — Back-fill orchestrator prompt builder tests.
 *
 * Runs with `node --test .claude/sync/label/backfill/__tests__/prompts.test.js`.
 * Covers externally-observable contracts of the prompt builder: hydration
 * of primary/secondary/synthesis templates, placeholder guard behavior,
 * and the existence of the three default template files on disk.
 */

"use strict";

const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");

const MODULE_PATH = path.join(__dirname, "..", "prompts.js");
const {
  buildPrimaryPrompt,
  buildSecondaryPrompt,
  buildSynthesisPrompt,
  PRIMARY_TEMPLATE,
  SECONDARY_TEMPLATE,
  SYNTHESIS_TEMPLATE,
} = require(MODULE_PATH);

const SAMPLE_BATCH = {
  files: [
    { path: ".claude/hooks/foo.js", weighted_kb: 12.3 },
    { path: ".claude/skills/bar/SKILL.md", weighted_kb: 67.8 },
  ],
};

test("buildPrimaryPrompt: hydrates batch id, files, and role header", () => {
  const out = buildPrimaryPrompt(SAMPLE_BATCH, { batchId: "B1" });
  assert.ok(
    out.includes("Primary Derivation Agent"),
    "primary role header must appear"
  );
  assert.ok(out.includes("Batch B1"), "batch id must be substituted in header");
  assert.ok(
    out.includes(".claude/hooks/foo.js"),
    "first file path must appear"
  );
  assert.ok(
    out.includes(".claude/skills/bar/SKILL.md"),
    "second file path must appear"
  );
  assert.ok(out.includes("weighted_kb: 12.3"), "first weighted_kb must render");
  assert.ok(out.includes("weighted_kb: 67.8"), "second weighted_kb must render");
  assert.ok(
    !/\{\{[A-Z0-9_]+\}\}/.test(out),
    "no {{PLACEHOLDER}} tokens should survive substitution"
  );
});

test("buildSecondaryPrompt: emphasizes independence and lists files", () => {
  const out = buildSecondaryPrompt(SAMPLE_BATCH, { batchId: "B1" });
  assert.ok(
    out.includes("Secondary Derivation Agent"),
    "secondary role header must appear"
  );
  assert.ok(
    out.includes("INDEPENDENTLY"),
    "independence language must appear verbatim"
  );
  assert.ok(out.includes("Batch B1"), "batch id must be substituted");
  assert.ok(
    out.includes(".claude/hooks/foo.js"),
    "first file path must appear"
  );
  assert.ok(
    out.includes(".claude/skills/bar/SKILL.md"),
    "second file path must appear"
  );
  assert.ok(
    !/\{\{[A-Z0-9_]+\}\}/.test(out),
    "no {{PLACEHOLDER}} tokens should survive substitution"
  );
});

test("buildSynthesisPrompt: embeds findings as a fenced JSON block", () => {
  const findings = {
    agreement_rate: 0.94,
    disagreements: [
      { path: "a.js", field: "type", primary: "script", secondary: "script-lib" },
    ],
  };
  const out = buildSynthesisPrompt(findings);
  const serialized = JSON.stringify(findings, null, 2);
  assert.ok(out.includes(serialized), "serialized findings must appear verbatim");
  assert.ok(out.includes("```json"), "findings must be wrapped in ```json fence");
  assert.ok(out.includes("Approve or reject?"), "gate language must appear");
  assert.ok(
    !/\{\{[A-Z0-9_]+\}\}/.test(out),
    "no {{PLACEHOLDER}} tokens should survive substitution"
  );
});

test("unfilled placeholder: hydrator throws when template is missing a token", () => {
  // Write a fixture template into a tmp dir that references {{UNKNOWN_TOKEN}},
  // which the builder has no substitution for — must trigger the guard.
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "label-backfill-prompts-"));
  try {
    const fakeTemplate = path.join(tmpDir, "fake-template.md");
    fs.writeFileSync(
      fakeTemplate,
      "# Fake {{BATCH_ID}}\n\nUnknown: {{UNKNOWN_TOKEN}}\n\n{{BATCH_FILES_LIST}}\n",
      "utf8"
    );

    assert.throws(
      () =>
        buildPrimaryPrompt(SAMPLE_BATCH, {
          batchId: "B1",
          templatePath: fakeTemplate,
        }),
      /Unfilled placeholder/,
      "must throw when an unrecognized {{TOKEN}} survives substitution"
    );
  } finally {
    // R1 Q12 (Qodo Sugg #4): try/finally ensures the tmpdir is cleaned up
    // even if an assertion throws. Prevents test-run artifact leakage.
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
});

test("default templates exist and are readable on disk", () => {
  for (const p of [PRIMARY_TEMPLATE, SECONDARY_TEMPLATE, SYNTHESIS_TEMPLATE]) {
    assert.ok(fs.existsSync(p), `template missing: ${path.basename(p)}`);
    const body = fs.readFileSync(p, "utf8");
    assert.ok(
      body.length > 0,
      `template empty: ${path.basename(p)}`
    );
  }
});
