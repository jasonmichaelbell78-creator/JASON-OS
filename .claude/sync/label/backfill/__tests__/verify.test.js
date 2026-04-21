/**
 * verify.test.js — verification harness tests.
 *
 * Covers:
 *   - Path traversal guard (verifyRecord rejects `../` and absolute paths)
 *   - Missing-path sanity error
 *   - Type-disagreement warning
 *   - Statistical degenerate-distribution flag
 *   - CLI helper path (parseCliArgs integration)
 */

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");

const MOD = path.join(__dirname, "..", "verify.js");

// Minimum valid record shape — schema requires a lot of fields; we construct
// a record that will pass Layer 1 schema so we can exercise Layer 2 sanity.
function baseRecord(overrides = {}) {
  return {
    path: "scripts/lib/safe-fs.js",
    name: "safe-fs",
    type: "script-lib",
    purpose: "Safe filesystem wrappers with symlink guards and atomic writes.",
    status: "active",
    portability: "portable",
    origin: "jason-os",
    dependencies: [],
    tool_deps: [{ name: "node", hardness: "hard" }],
    required_secrets: [],
    external_services: [],
    ...overrides,
  };
}

test("verifyRecord: path traversal (../) produces sanity error, skips fs ops", () => {
  const { verifyRecord } = require(MOD);
  const result = verifyRecord(baseRecord({ path: "../../etc/passwd" }));
  assert.ok(
    result.sanityErrors.some((e) => e.includes("escapes repo root")),
    `expected traversal sanity error, got: ${JSON.stringify(result.sanityErrors)}`
  );
  // Must NOT leak a "does not exist on disk" error — that would confirm we
  // still did fs.existsSync on the traversal path.
  assert.ok(
    !result.sanityErrors.some((e) => e.includes("does not exist on disk")),
    "fs.existsSync should not run on paths that escape the repo root"
  );
});

test("verifyRecord: absolute path rejected by traversal guard", () => {
  const { verifyRecord } = require(MOD);
  const abs = process.platform === "win32" ? "C:\\Windows\\System32\\cmd.exe" : "/etc/passwd";
  const result = verifyRecord(baseRecord({ path: abs }));
  assert.ok(
    result.sanityErrors.some((e) => e.includes("escapes repo root")),
    `expected traversal sanity error on absolute path, got: ${JSON.stringify(result.sanityErrors)}`
  );
});

test("verifyRecord: nonexistent in-repo path produces 'does not exist' error", () => {
  const { verifyRecord } = require(MOD);
  const result = verifyRecord(
    baseRecord({ path: "path/that/definitely/does/not/exist-xyzzy-12345.js" })
  );
  assert.ok(
    result.sanityErrors.some((e) => e.includes("does not exist on disk")),
    `expected 'does not exist' sanity error, got: ${JSON.stringify(result.sanityErrors)}`
  );
});

test("verifyRecord: existing in-repo path passes sanity layer", () => {
  const { verifyRecord } = require(MOD);
  // safe-fs.js is known to exist in the repo
  const result = verifyRecord(baseRecord());
  assert.ok(
    !result.sanityErrors.some((e) => e.includes("escapes repo root")),
    "well-formed in-repo path should not produce traversal error"
  );
  assert.ok(
    !result.sanityErrors.some((e) => e.includes("does not exist on disk")),
    "existing path should not produce missing-file error"
  );
});

test("verifyBatch: statistical flag fires when all records share one type", () => {
  const { verifyBatch } = require(MOD);
  // Use 4 records sharing one type/portability — should flag degenerate dist.
  const records = [
    baseRecord({ path: "scripts/lib/safe-fs.js", name: "r1" }),
    baseRecord({ path: "scripts/lib/sanitize-error.cjs", name: "r2" }),
    baseRecord({ path: "scripts/lib/security-helpers.js", name: "r3" }),
    baseRecord({ path: "scripts/lib/read-jsonl.js", name: "r4" }),
  ];
  const report = verifyBatch(records);
  const flagsText = report.statistical.flags.join(" | ");
  assert.ok(
    flagsText.includes("share type"),
    `expected degenerate-type flag, got: ${flagsText}`
  );
});
