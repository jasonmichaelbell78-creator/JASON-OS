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
  applyRuntimeGuards,
  SCHEMA_VERSION,
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

// --- v1.3 additions (Piece 3 structural-fix D5.2 + D6.8) ---

test("{{INCLUDE:...}} substitutes a sibling partial", () => {
  // Primary template contains {{INCLUDE:agent-instructions-shared.md}}.
  // After hydration, we expect content from the shared partial to appear
  // inline — e.g. the D4.1 naming-canon rule and the v1.3 cheat-sheet.
  const out = buildPrimaryPrompt(SAMPLE_BATCH, { batchId: "B1" });
  assert.ok(
    out.includes("naming canon"),
    "shared partial content (naming canon) must substitute inline"
  );
  assert.ok(
    out.includes("schema v1.3") || out.includes("v1.3 cheat-sheet"),
    "shared partial should carry v1.3 reference language"
  );
  assert.ok(
    !out.includes("{{INCLUDE:"),
    "no {{INCLUDE:}} directive should survive substitution"
  );
});

test("{{INCLUDE:...}} rejects path-traversal filenames", () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "label-include-traversal-"));
  try {
    const fakeTemplate = path.join(tmpDir, "bad-template.md");
    fs.writeFileSync(
      fakeTemplate,
      "# Bad {{BATCH_ID}}\n\n{{INCLUDE:../../../etc/passwd}}\n\n{{BATCH_FILES_LIST}}\n",
      "utf8"
    );
    assert.throws(
      () =>
        buildPrimaryPrompt(SAMPLE_BATCH, {
          batchId: "B1",
          templatePath: fakeTemplate,
        }),
      /INCLUDE directive rejected/,
      "path-traversal filename in INCLUDE must be rejected"
    );
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
});

test("applyRuntimeGuards: SCHEMA_VERSION is 1.3", () => {
  assert.equal(SCHEMA_VERSION, "1.3");
});

test("applyRuntimeGuards: hard-dep exists-check downgrades missing paths", () => {
  const record = {
    name: "foo",
    path: ".claude/hooks/foo.js",
    type: "hook",
    dependencies: [
      { name: ".claude/hooks/does-not-exist.js", hardness: "hard", kind: "import" },
      { name: "convergence-loop", hardness: "hard", kind: "reference" }, // registry name, not path-shaped — untouched
      { name: ".claude/sync/schema/schema-v1.json", hardness: "hard", kind: "reference" }, // exists
    ],
  };
  const out = applyRuntimeGuards(record);
  assert.equal(out.dependencies[0].hardness, "soft", "missing-path hard dep downgraded to soft");
  assert.equal(out.dependencies[1].hardness, "hard", "registry-name ref left untouched");
  assert.equal(out.dependencies[2].hardness, "hard", "existing path left at hard");
  assert.ok(out.notes.includes("runtime-guard"), "notes must be stamped");
  assert.ok(
    out.notes.includes("does-not-exist.js"),
    "downgraded path must be named in notes"
  );
});

test("applyRuntimeGuards: content_hash null is omitted (D2.4)", () => {
  const withNull = applyRuntimeGuards({ name: "a", path: "a.md", content_hash: null });
  assert.ok(!("content_hash" in withNull), "null content_hash deleted");

  const withValue = applyRuntimeGuards({ name: "a", path: "a.md", content_hash: "sha256:abc" });
  assert.equal(withValue.content_hash, "sha256:abc", "populated content_hash preserved");

  const absent = applyRuntimeGuards({ name: "a", path: "a.md" });
  assert.ok(!("content_hash" in absent), "absent content_hash stays absent");
});

test("applyRuntimeGuards: legacy portability:generated rewrites + flags (D3.2)", () => {
  const record = {
    name: "shim",
    path: ".husky/_/pre-commit",
    type: "git-hook",
    git_hook_event: "pre-commit",
    status: "generated",
    portability: "generated",
  };
  const out = applyRuntimeGuards(record);
  assert.equal(out.portability, "not-portable", "generated→not-portable rewrite");
  assert.ok(
    Array.isArray(out.needs_review) && out.needs_review.includes("portability"),
    "portability flagged for review"
  );
  assert.ok(
    out.notes.includes("legacy portability:generated"),
    "rewrite logged in notes"
  );
});

test("applyRuntimeGuards: git-hook event disambiguation (D3.3)", () => {
  const record = {
    name: "pre-commit",
    path: ".husky/pre-commit",
    type: "git-hook",
    event: "pre-commit", // legacy field — should migrate to git_hook_event
  };
  const out = applyRuntimeGuards(record);
  assert.equal(out.git_hook_event, "pre-commit", "migrated to git_hook_event");
  assert.ok(!("event" in out), "legacy event field removed");
  assert.ok(out.notes.includes("git_hook_event"), "migration logged");
});

test("applyRuntimeGuards: git-hook with both event+git_hook_event keeps git_hook_event", () => {
  // Defensive: if an agent emits both, the explicit git_hook_event wins
  // and no migration runs (event field is left alone for the schema layer
  // to reject via additionalProperties: false).
  const record = {
    name: "pre-commit",
    path: ".husky/pre-commit",
    type: "git-hook",
    event: "stale-value",
    git_hook_event: "pre-commit",
  };
  const out = applyRuntimeGuards(record);
  assert.equal(out.git_hook_event, "pre-commit");
  assert.equal(out.event, "stale-value", "event preserved when git_hook_event already set");
});

test("applyRuntimeGuards: stamps schema_version 1.3 (D6.8)", () => {
  const out1 = applyRuntimeGuards({ name: "a", path: "a.md" });
  assert.equal(out1.schema_version, "1.3");

  // Overwrites a stale stamp
  const out2 = applyRuntimeGuards({ name: "a", path: "a.md", schema_version: "1.2" });
  assert.equal(out2.schema_version, "1.3");
});

test("applyRuntimeGuards: no-op when record lacks all guard triggers", () => {
  const record = {
    name: "clean",
    path: "clean.md",
    type: "doc",
    portability: "portable",
    dependencies: [],
    content_hash: "sha256:deadbeef",
    notes: "already has notes",
  };
  const out = applyRuntimeGuards(record);
  assert.equal(out.portability, "portable", "untouched");
  assert.equal(out.content_hash, "sha256:deadbeef", "untouched");
  assert.equal(out.notes, "already has notes", "notes unchanged when no guards fire");
  assert.equal(out.schema_version, "1.3", "schema_version still stamped");
  assert.equal(out.dependencies.length, 0, "dependencies untouched");
});

test("applyRuntimeGuards: null/undefined input returned unchanged", () => {
  assert.equal(applyRuntimeGuards(null), null);
  assert.equal(applyRuntimeGuards(undefined), undefined);
  assert.equal(applyRuntimeGuards("not an object"), "not an object");
});

// PR #11 R1 item 1 (Qodo): path-shaped hard deps that escape the repo root
// must not probe the host filesystem. validatePathInDir rejects absolute
// paths and `..` traversal; the guard must then treat the dep as
// non-existent (downgrade hard→soft) instead of calling existsSync on an
// attacker-controlled path.
test("applyRuntimeGuards: absolute dep path is confined (hard→soft, no host probe)", () => {
  const abs = process.platform === "win32" ? "C:\\Windows\\System32\\cmd.exe" : "/etc/passwd";
  const record = {
    name: "x",
    path: "x.md",
    type: "doc",
    dependencies: [{ name: abs, hardness: "hard", kind: "reference" }],
  };
  const out = applyRuntimeGuards(record);
  assert.equal(
    out.dependencies[0].hardness,
    "soft",
    "absolute paths must be downgraded without probing"
  );
  assert.ok(
    typeof out.notes === "string" && out.notes.includes("out-of-repo or invalid path"),
    "note must flag out-of-repo reason, not a bogus 'not found at <abs>'"
  );
});

test("applyRuntimeGuards: parent-traversal dep path is confined (hard→soft, no host probe)", () => {
  const record = {
    name: "x",
    path: "x.md",
    type: "doc",
    dependencies: [
      { name: "../../../etc/passwd", hardness: "hard", kind: "reference" },
    ],
  };
  const out = applyRuntimeGuards(record);
  assert.equal(out.dependencies[0].hardness, "soft");
  assert.ok(out.notes.includes("out-of-repo or invalid path"));
});
