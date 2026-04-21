/**
 * scan.test.js — Piece 3 S8 back-fill scan + split-batches tests.
 *
 * Runs with:
 *   node --test .claude/sync/label/backfill/__tests__/scan.test.js
 *
 * Uses a tmpdir fixture with 8 synthetic files (mix of >50 KB and <50 KB)
 * and a minimal scope.json whose include patterns target fixture files.
 * Each test uses its own fixture root so the scope-matcher compile cache
 * (in scope-matcher.js) doesn't bleed between tests.
 */

"use strict";

const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");

const { scan, splitBatches, formatAllocation } = require(path.join(__dirname, "..", "scan"));

// ---------------------------------------------------------------------------
// Fixture helpers
// ---------------------------------------------------------------------------

/**
 * Create a tmpdir with 8 synthetic files and a minimal scope.json.
 *
 * Sizes are chosen so the large-file threshold (>50 KB) cleanly partitions
 * the set: 4 small (<50 KB) and 4 large (>50 KB). One file is >135 KB after
 * doubling to exercise the single-file overflow case.
 *
 * @returns {{ root: string, scopePath: string, files: Array<{rel: string, bytes: number}> }}
 */
function buildFixture() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "scan-"));

  const plan = [
    // Large files (>50 KB raw → weighted ×2)
    { rel: "src/big-a.md",      bytes: 80 * 1024 },   // weighted 160 KB — single-file overflow
    { rel: "src/big-b.md",      bytes: 60 * 1024 },   // weighted 120 KB — fits alone
    { rel: "src/big-c.md",      bytes: 55 * 1024 },   // weighted 110 KB — fits alone
    { rel: "src/big-d.md",      bytes: 51 * 1024 },   // weighted 102 KB — fits alone
    // Small files (<=50 KB raw)
    { rel: "src/small-a.md",    bytes: 20 * 1024 },
    { rel: "src/small-b.md",    bytes: 10 * 1024 },
    { rel: "src/small-c.md",    bytes:  5 * 1024 },
    { rel: "src/small-d.md",    bytes:  2 * 1024 },
    // Excluded file — must NOT be picked up.
    { rel: "src/excluded.md",   bytes:  8 * 1024 },
    // Out-of-scope file — matches no include pattern.
    { rel: "other/noise.txt",   bytes:  4 * 1024 },
  ];

  for (const f of plan) {
    const abs = path.join(root, f.rel);
    fs.mkdirSync(path.dirname(abs), { recursive: true });
    // Use a repeating ASCII byte so size is exact.
    fs.writeFileSync(abs, Buffer.alloc(f.bytes, 0x61));
  }

  const scope = {
    version: 1,
    include: ["src/**/*.md"],
    exclude: ["src/excluded.md"],
  };
  const scopePath = path.join(root, "scope.json");
  fs.writeFileSync(scopePath, JSON.stringify(scope, null, 2));

  return { root, scopePath, files: plan };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

test("scan: discovers all 8 in-scope files with correct sizes + weights", () => {
  const { root, scopePath } = buildFixture();
  const result = scan({ scopePath, rootDir: root });

  assert.equal(result.files.length, 8, "should find exactly 8 in-scope files");

  // Verify sort order: descending by weighted_kb.
  for (let i = 0; i < result.files.length - 1; i += 1) {
    assert.ok(
      result.files[i].weighted_kb >= result.files[i + 1].weighted_kb,
      `files[${i}].weighted_kb should be >= files[${i + 1}].weighted_kb`
    );
  }

  // Largest file is big-a.md (80 KB → 160 KB weighted).
  const largest = result.files[0];
  assert.equal(largest.path, "src/big-a.md");
  assert.equal(largest.size_bytes, 80 * 1024);
  assert.equal(largest.size_kb, 80);
  assert.equal(largest.weighted_kb, 160);

  // Small files: weighted == size_kb (no doubling below threshold).
  const smallA = result.files.find((f) => f.path === "src/small-a.md");
  assert.ok(smallA, "small-a should be present");
  assert.equal(smallA.size_kb, 20);
  assert.equal(smallA.weighted_kb, 20);
});

test("scan: respects exclude patterns and out-of-scope paths", () => {
  const { root, scopePath } = buildFixture();
  const result = scan({ scopePath, rootDir: root });
  const paths = result.files.map((f) => f.path);

  assert.ok(!paths.includes("src/excluded.md"), "excluded.md must be filtered out");
  assert.ok(!paths.includes("other/noise.txt"), "out-of-scope .txt must be filtered out");
});

test("splitBatches: packs files correctly, large file gets own bin, totals conserve", () => {
  const { root, scopePath } = buildFixture();
  const result = scan({ scopePath, rootDir: root });
  const batches = splitBatches(result.files);

  assert.ok(batches.length >= 1, "at least one batch expected");

  // big-a.md is 160 KB weighted > 135 KB target → must be alone in its bin.
  const bigABin = batches.find((b) => b.files.some((f) => f.path === "src/big-a.md"));
  assert.ok(bigABin, "big-a.md must land in some bin");
  assert.equal(bigABin.files.length, 1, "single-file overflow: big-a.md owns its bin");
  assert.equal(bigABin.total_weighted_kb, 160);

  // Conservation: sum of batch weighted_kb equals scan's total weighted_kb.
  const scanTotalWeighted = result.files.reduce((a, f) => a + f.weighted_kb, 0);
  const batchTotalWeighted = batches.reduce((a, b) => a + b.total_weighted_kb, 0);
  assert.equal(
    batchTotalWeighted,
    scanTotalWeighted,
    "sum of batch weighted_kb must equal scan total"
  );

  // Conservation: sum of batch total_kb equals sum of scan size_kb.
  const scanTotalKb = result.files.reduce((a, f) => a + f.size_kb, 0);
  const batchTotalKb = batches.reduce((a, b) => a + b.total_kb, 0);
  assert.equal(batchTotalKb, scanTotalKb, "sum of batch size_kb must equal scan total");

  // Every input file appears in exactly one bin.
  const flat = batches.flatMap((b) => b.files.map((f) => f.path));
  assert.equal(flat.length, result.files.length, "no files lost or duplicated");
  assert.equal(new Set(flat).size, flat.length, "no duplicate files across bins");

  // Every non-overflow bin stays <= target.
  for (const bin of batches) {
    if (bin.files.length > 1) {
      assert.ok(
        bin.total_weighted_kb <= 135,
        `multi-file bin must not exceed target: got ${bin.total_weighted_kb}`
      );
    }
  }
});

test("splitBatches: caps per-batch file count at maxFilesPerBatch (default 15)", () => {
  // 30 tiny files — at 2 KB each, total weighted 60 KB, all fit one bin
  // byte-wise. Without the cap they'd pack into a single 30-file batch
  // which breaches the feedback_agent_stalling_pattern 16-file stall
  // ceiling. With the default cap they split into two bins.
  const files = Array.from({ length: 30 }, (_, i) => ({
    path: `tiny-${i}.md`,
    size_bytes: 2 * 1024,
    size_kb: 2,
    weighted_kb: 2,
  }));
  const batches = splitBatches(files);
  assert.equal(batches.length, 2, "30 tiny files exceed the 15-file cap → 2 bins");
  for (const bin of batches) {
    assert.ok(bin.files.length <= 15, `bin with ${bin.files.length} files exceeds cap`);
  }
  // All 30 files still placed — cap doesn't drop anything.
  const placed = batches.reduce((acc, b) => acc + b.files.length, 0);
  assert.equal(placed, 30);
});

test("splitBatches: custom maxFilesPerBatch overrides default", () => {
  const files = Array.from({ length: 10 }, (_, i) => ({
    path: `x-${i}.md`,
    size_bytes: 1 * 1024,
    size_kb: 1,
    weighted_kb: 1,
  }));
  // maxFilesPerBatch: 3 on 10 files → 4 bins (3+3+3+1).
  const batches = splitBatches(files, { maxFilesPerBatch: 3 });
  assert.equal(batches.length, 4);
  assert.ok(batches.every((b) => b.files.length <= 3));
});

test("splitBatches: single-file overflow — a 160 KB file gets its own bin", () => {
  // Synthetic input; doesn't need fs. Target 135, one file weighted 160.
  const files = [
    { path: "huge.md", size_bytes: 80 * 1024, size_kb: 80, weighted_kb: 160 },
    { path: "tiny.md", size_bytes:  5 * 1024, size_kb:  5, weighted_kb:   5 },
  ];
  const batches = splitBatches(files, { targetKb: 135 });

  assert.equal(batches.length, 2, "huge + tiny should produce 2 bins");
  const hugeBin = batches.find((b) => b.files[0].path === "huge.md");
  assert.ok(hugeBin, "huge bin must exist");
  assert.equal(hugeBin.files.length, 1, "huge.md bin is single-file");
  assert.equal(hugeBin.total_weighted_kb, 160, "overflow bin preserves weight");
});

test("formatAllocation: contains required lines and correct agent count", () => {
  const { root, scopePath } = buildFixture();
  const result = scan({ scopePath, rootDir: root });
  const batches = splitBatches(result.files);
  const out = formatAllocation(result, batches);

  // Required line shape — Step 3 of BYTE_WEIGHTED_SPLITS.md.
  assert.match(out, /^Target files: 8$/m, "Target files line");
  assert.match(out, /^Total bytes: \d+ KB \(weighted: \d+ KB with large-file doubling\)$/m, "Total bytes line");
  assert.match(
    out,
    new RegExp(`^Batches: ${batches.length} \\(average \\d+ KB per batch\\)$`, "m"),
    "Batches line"
  );
  const expectedAgents = batches.length * 2;
  assert.match(
    out,
    new RegExp(
      `^Agents to dispatch: ${expectedAgents} \\(${batches.length} primary \\+ ${batches.length} secondary\\)$`,
      "m"
    ),
    "Agents-to-dispatch line with 2x batch count"
  );
});
