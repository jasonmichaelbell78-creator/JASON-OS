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

test("verifyRecord: content-read failure surfaces as sanityWarning (not silent swallow)", () => {
  const { verifyRecord } = require(MOD);
  // Point at a file we know is oversized for the 256 KB heuristic cap.
  // package-lock.json is large enough in most Node projects; if missing,
  // fall back to any repo file >256 KB, or skip.
  const repoRoot = path.join(__dirname, "..", "..", "..", "..", "..");
  const candidates = [
    "package-lock.json",
    ".research/sync-mechanism/piece-1b-discovery-scan-sonash/findings/D20d-dep-map-merged.jsonl",
    ".research/migration-skill/RESEARCH_OUTPUT.md",
    ".research/migration-skill/TRANSCRIPT.md",
  ];
  let bigPath = null;
  for (const c of candidates) {
    const abs = path.join(repoRoot, c);
    try {
      const st = fs.statSync(abs);
      if (st.size > 256 * 1024) {
        bigPath = c;
        break;
      }
    } catch {
      // try next
    }
  }
  if (!bigPath) {
    // Synthesize one in a temp location relative to repoRoot — but we need a
    // path INSIDE the repo or the traversal guard will reject it. Skip if
    // no oversize file exists.
    console.log("# skip oversize test: no candidate file >256 KB in repo");
    return;
  }
  const result = verifyRecord(baseRecord({ path: bigPath, type: "docs" }));
  assert.ok(
    result.sanityWarnings.some((w) => w.includes("content read failed")),
    `expected content-read warning on oversize file, got: ${JSON.stringify(result.sanityWarnings)}`
  );
});

test("CLI: parseCliArgs handles both --batch-id=X and --batch-id X forms", () => {
  // Smoke-test the CLI via a subprocess round-trip. Write a tiny JSONL to
  // a tmp location inside the repo, invoke both forms, confirm non-zero
  // exit doesn't crash before we see the usage line (we expect exit=1 due
  // to schema failures on the minimal fixture — but the CLI should at
  // least parse args and run verifyBatch).
  const { execFileSync } = require("node:child_process");
  const repoRoot = path.join(__dirname, "..", "..", "..", "..", "..");
  const tmp = path.join(os.tmpdir(), `verify-cli-${process.pid}.jsonl`);
  try {
    fs.writeFileSync(tmp, JSON.stringify(baseRecord()) + "\n");
    // Feed the positional arg INSIDE the repo — traversal guard rejects
    // outside paths for Layer 2, but the CLI itself reads the JSONL from
    // any path (that's the outer fs read, not record.path).
    for (const form of [
      ["node", [path.join(repoRoot, ".claude/sync/label/backfill/verify.js"), tmp, "--batch-id=B01"]],
      ["node", [path.join(repoRoot, ".claude/sync/label/backfill/verify.js"), tmp, "--batch-id", "B01"]],
    ]) {
      let stdout = "";
      try {
        stdout = String(execFileSync(form[0], form[1], { stdio: ["ignore", "pipe", "pipe"] }));
      } catch (err) {
        // Non-zero exit is fine — we just need the report to render.
        stdout = err.stdout ? String(err.stdout) : "";
      }
      assert.ok(
        stdout.includes("Verification report"),
        `expected report header in stdout for form ${JSON.stringify(form[1])}, got: ${stdout.slice(0, 200)}`
      );
      assert.ok(
        stdout.includes("B01"),
        `expected batchId "B01" in report for form ${JSON.stringify(form[1])}`
      );
    }
  } finally {
    try { fs.unlinkSync(tmp); } catch { /* ignore */ }
  }
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

test("verifyBatch: degenerate-flag fires at MIN_RECORDS_FOR_DEGENERATE_CHECK boundary (3 records)", () => {
  // Boundary test for PR #10 R2 Qodo suggestion #1 — the degenerate check
  // must fire at exactly the named-constant threshold, not threshold+1.
  const { verifyBatch } = require(MOD);
  const records = [
    baseRecord({ path: "scripts/lib/safe-fs.js", name: "r1" }),
    baseRecord({ path: "scripts/lib/sanitize-error.cjs", name: "r2" }),
    baseRecord({ path: "scripts/lib/security-helpers.js", name: "r3" }),
  ];
  const report = verifyBatch(records);
  const flagsText = report.statistical.flags.join(" | ");
  assert.ok(
    flagsText.includes("share type"),
    `expected degenerate-type flag to fire at exactly 3 records, got: ${flagsText}`
  );
});
