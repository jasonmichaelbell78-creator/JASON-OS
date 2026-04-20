/**
 * scan.js — Piece 3 S8 back-fill orchestrator: scan + split phases.
 *
 * Enumerates in-scope repo files (via `scope.json` + `scope-matcher.js`),
 * computes byte-weighted sizes (large files >50 KB count 2x), and packs
 * them into ~135 KB batches using first-fit decreasing bin-packing per
 * `.claude/skills/label-audit/reference/BYTE_WEIGHTED_SPLITS.md`.
 *
 * Exposes the T22 count-pass announcement string so the orchestrator can
 * surface the allocation for user confirmation before dispatching agents.
 *
 * All error paths route through `./sanitize` (→ sanitize-error.cjs) so raw
 * `error.message` never reaches stderr (CLAUDE.md §5 anti-pattern row 1).
 */

"use strict";

const fs = require("node:fs");
const path = require("node:path");

const REPO_ROOT_SENTINEL = path.join(__dirname, "..", "..", "..", "..");
const DEFAULT_SCOPE_PATH = path.join(
  REPO_ROOT_SENTINEL,
  ".claude",
  "sync",
  "label",
  "scope.json"
);

const { compileScope } = require(path.join(
  REPO_ROOT_SENTINEL,
  ".claude",
  "sync",
  "label",
  "lib",
  "scope-matcher.js"
));
const { sanitize } = require(path.join(
  REPO_ROOT_SENTINEL,
  ".claude",
  "sync",
  "label",
  "lib",
  "sanitize.js"
));

// Defaults per BYTE_WEIGHTED_SPLITS.md.
const DEFAULT_TARGET_KB = 135;
const DEFAULT_LARGE_THRESHOLD_KB = 50;
// Per `feedback_agent_stalling_pattern` memory: agents reading 16+ files
// silently stall. Cap per-batch file count below that threshold so dense
// small-file batches (e.g. packs of 2 KB memories, prompt templates, or
// short configs) don't exceed the stall ceiling even when bytes fit.
const DEFAULT_MAX_FILES_PER_BATCH = 15;

// Directories pruned at walk time. Matches scope.json excludes for the
// common-hot paths — pre-stat pruning saves ~99% of stat calls on a repo
// with node_modules or .git. Scope.json excludes still apply after the walk
// as the source-of-truth filter.
const PRUNE_DIRS = new Set([
  "node_modules",
  ".git",
  ".research",
]);

// `.claude/state` is pruned via a path-prefix check, not a basename set, so
// `.claude/state-foo` (if it ever existed) wouldn't be swept up with it.
const PRUNE_PATH_PREFIXES = [".claude/state"];

/**
 * Read a file as JSON, wrapping any failure in a sanitized Error.
 * @param {string} filePath
 * @returns {object}
 */
function readJsonSafe(filePath) {
  try {
    const raw = fs.readFileSync(filePath, "utf8");
    const stripped = raw.codePointAt(0) === 0xfeff ? raw.slice(1) : raw;
    return JSON.parse(stripped);
  } catch (err) {
    throw new Error(`scan: failed to read scope config: ${sanitize(err)}`);
  }
}

/**
 * Recursively walk `rootDir`, pushing forward-slash relative paths of every
 * regular file into `out`. Prunes well-known noise directories (node_modules,
 * .git, .research, .claude/state) before recursing to avoid wasted stats.
 *
 * Does not follow symlinks — Dirent.isFile() returns false for symlinks, so
 * they're skipped automatically, which matches the conservative stance in
 * `scripts/lib/safe-fs.js`.
 *
 * @param {string} rootDir - Absolute repo root
 * @param {string} relDir - Current directory relative to rootDir ("" at root)
 * @param {string[]} out - Accumulator of forward-slash relative file paths
 */
function walk(rootDir, relDir, out) {
  const absDir = relDir === "" ? rootDir : path.join(rootDir, relDir);
  let entries;
  try {
    entries = fs.readdirSync(absDir, { withFileTypes: true });
  } catch (err) {
    // An unreadable directory (permission, race) shouldn't abort the whole
    // scan — log via sanitize() and continue. Observer surfaces via D15.
    console.warn(`scan: skipping ${relDir || "<root>"}: ${sanitize(err)}`);
    return;
  }
  for (const entry of entries) {
    const name = entry.name;
    const childRel = relDir === "" ? name : `${relDir}/${name}`;
    if (entry.isDirectory()) {
      if (PRUNE_DIRS.has(name)) continue;
      if (PRUNE_PATH_PREFIXES.some((p) => childRel === p || childRel.startsWith(`${p}/`))) {
        continue;
      }
      walk(rootDir, childRel, out);
    } else if (entry.isFile()) {
      out.push(childRel);
    }
    // Symlinks, sockets, FIFOs, block/char devices: skipped by design.
  }
}

/**
 * Scan phase — enumerate in-scope files and emit their byte-weighted inventory.
 *
 * @param {object} [opts]
 * @param {string} [opts.scopePath=DEFAULT_SCOPE_PATH] - Path to scope.json
 * @param {string} [opts.rootDir=REPO_ROOT_SENTINEL] - Repo root to walk
 * @param {number} [opts.largeThresholdKb=50] - Size above which weight doubles
 * @returns {{ files: Array<{path: string, size_bytes: number, size_kb: number, weighted_kb: number}> }}
 */
function scan(opts = {}) {
  const scopePath = opts.scopePath || DEFAULT_SCOPE_PATH;
  const rootDir = opts.rootDir || REPO_ROOT_SENTINEL;
  const largeThresholdKb =
    typeof opts.largeThresholdKb === "number"
      ? opts.largeThresholdKb
      : DEFAULT_LARGE_THRESHOLD_KB;

  const scope = readJsonSafe(scopePath);
  const matcher = compileScope(scope);

  const relPaths = [];
  walk(rootDir, "", relPaths);

  const files = [];
  for (const rel of relPaths) {
    if (!matcher.matches(rel)) continue;
    const abs = path.join(rootDir, rel);
    let st;
    try {
      st = fs.statSync(abs);
    } catch (err) {
      console.warn(`scan: stat failed for ${rel}: ${sanitize(err)}`);
      continue;
    }
    const sizeBytes = st.size;
    const sizeKb = sizeBytes / 1024;
    const weightedKb = sizeKb > largeThresholdKb ? sizeKb * 2 : sizeKb;
    files.push({
      path: rel,
      size_bytes: sizeBytes,
      size_kb: sizeKb,
      weighted_kb: weightedKb,
    });
  }

  files.sort((a, b) => b.weighted_kb - a.weighted_kb);
  return { files };
}

/**
 * Split phase — first-fit decreasing bin-packing of weighted-sized files.
 *
 * Per BYTE_WEIGHTED_SPLITS.md Step 2: files are placed into the first bin
 * whose running total + the file's weight does not exceed `targetKb`. A
 * single file whose own weight exceeds `targetKb` is accepted as its own
 * one-file bin — splitting a file across agents is worse than overflow.
 *
 * @param {Array<{path: string, weighted_kb: number, size_kb: number}>} files
 *   Expected sorted descending by weighted_kb (sort-defensively here anyway).
 * @param {object} [opts]
 * @param {number} [opts.targetKb=135]
 * @param {number} [opts.largeThresholdKb=50] - Reserved for future tuning;
 *   retained in signature per the module brief.
 * @param {number} [opts.maxFilesPerBatch=15] - Dual cap alongside targetKb
 *   to keep per-batch file count below the agent-stalling threshold
 *   (`feedback_agent_stalling_pattern`: 16+ files silently stalls).
 * @returns {Array<{files: Array, total_kb: number, total_weighted_kb: number}>}
 */
// eslint-disable-next-line no-unused-vars
function splitBatches(files, opts = {}) {
  const targetKb =
    typeof opts.targetKb === "number" ? opts.targetKb : DEFAULT_TARGET_KB;
  const maxFilesPerBatch =
    typeof opts.maxFilesPerBatch === "number" && opts.maxFilesPerBatch > 0
      ? Math.floor(opts.maxFilesPerBatch)
      : DEFAULT_MAX_FILES_PER_BATCH;

  // Defensive copy + descending sort. The scan phase already sorts, but a
  // caller passing arbitrary input shouldn't silently break bin-packing
  // quality.
  const sorted = Array.from(files).sort((a, b) => b.weighted_kb - a.weighted_kb);

  const bins = [];
  for (const file of sorted) {
    const weight = file.weighted_kb;

    // Single-file overflow: weight > targetKb means it gets its own bin.
    // We create the bin explicitly rather than relying on "no bin fits →
    // new bin" fallback so the intent is visible in the code.
    if (weight > targetKb) {
      bins.push({
        files: [file],
        total_kb: file.size_kb,
        total_weighted_kb: weight,
      });
      continue;
    }

    let placed = false;
    for (const bin of bins) {
      if (
        bin.files.length < maxFilesPerBatch &&
        bin.total_weighted_kb + weight <= targetKb
      ) {
        bin.files.push(file);
        bin.total_kb += file.size_kb;
        bin.total_weighted_kb += weight;
        placed = true;
        break;
      }
    }
    if (!placed) {
      bins.push({
        files: [file],
        total_kb: file.size_kb,
        total_weighted_kb: weight,
      });
    }
  }
  return bins;
}

/**
 * Format the T22 count-pass announcement. Multi-line string exactly matching
 * BYTE_WEIGHTED_SPLITS.md Step 3 — consumed by the orchestrator to confirm
 * with the user before dispatching agents.
 *
 * @param {{files: Array<{size_kb: number, weighted_kb: number}>}} scanResult
 * @param {Array<{total_weighted_kb: number}>} batches
 * @returns {string}
 */
function formatAllocation(scanResult, batches) {
  const files = scanResult.files;
  const totalKb = files.reduce((acc, f) => acc + f.size_kb, 0);
  const totalWeightedKb = files.reduce((acc, f) => acc + f.weighted_kb, 0);
  const batchCount = batches.length;
  const avgPerBatch =
    batchCount === 0
      ? 0
      : batches.reduce((acc, b) => acc + b.total_weighted_kb, 0) / batchCount;
  const agentCount = batchCount * 2;

  return [
    `Target files: ${files.length}`,
    `Total bytes: ${Math.round(totalKb)} KB (weighted: ${Math.round(totalWeightedKb)} KB with large-file doubling)`,
    `Batches: ${batchCount} (average ${Math.round(avgPerBatch)} KB per batch)`,
    `Agents to dispatch: ${agentCount} (${batchCount} primary + ${batchCount} secondary)`,
  ].join("\n");
}

module.exports = {
  scan,
  splitBatches,
  formatAllocation,
  // Exported for tests + orchestrator introspection.
  DEFAULT_SCOPE_PATH,
  DEFAULT_TARGET_KB,
  DEFAULT_MAX_FILES_PER_BATCH,
  DEFAULT_LARGE_THRESHOLD_KB,
};
