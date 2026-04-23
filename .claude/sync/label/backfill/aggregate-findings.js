#!/usr/bin/env node
/**
 * aggregate-findings.js — Aggregate per-batch crosschecked.json files into
 * the FINDINGS_JSON shape consumed by the synthesis agent.
 *
 * orchestrate.js builds this shape inline when called as a library and
 * passes it to the optional `synthesize` callback. When G.1 was driven
 * by a custom batch script that did not provide a `synthesize` callback
 * (the actual G.1 + G.1.5 flow), the per-batch artifacts persist in
 * `.claude/state/batch-tmp/B<NN>/crosschecked.json` but no aggregated
 * findings file is produced. This CLI fills that gap.
 *
 * Output shape matches synthesis-agent-template.md's `{{FINDINGS_JSON}}`
 * placeholder:
 *
 *   {
 *     agreement_rate: <0..1>,
 *     record_count: <int>,
 *     unreachable: ["<path>", ...],
 *     disagreements: [{path, field, case, candidates, primary, secondary}, ...]
 *   }
 *
 * Plus the synthesis agent benefits from a `records` slice for novel-
 * composite + sections detection — included as a fifth top-level field.
 *
 * Usage:
 *   node .claude/sync/label/backfill/aggregate-findings.js \
 *     [--batch-dir .claude/state/batch-tmp] \
 *     [--out .claude/state/g1-findings.json]
 *
 * Without --out, prints JSON to stdout.
 *
 * Exit codes:
 *   0 — clean
 *   1 — no batches found / aggregation produced empty output
 *   2 — usage / read / parse error
 */

"use strict";

const fs = require("node:fs");
const path = require("node:path");
const { sanitize } = require("../lib/sanitize");

const REPO_ROOT = path.resolve(__dirname, "..", "..", "..", "..");
const DEFAULT_BATCH_DIR = path.join(REPO_ROOT, ".claude", "state", "batch-tmp");

/**
 * Collect all `crosschecked.json` files under batchDir (one per `B<NN>/`
 * subdirectory). Returns an array of {batchId, records} parsed entries.
 */
function collectBatchFiles(batchDir) {
  let entries;
  try {
    entries = fs.readdirSync(batchDir, { withFileTypes: true });
  } catch (err) {
    throw new Error(`aggregate-findings: batch dir read failed: ${sanitize(err)}`);
  }
  const batches = [];
  for (const ent of entries) {
    if (!ent.isDirectory()) continue;
    const batchId = ent.name;
    const ccPath = path.join(batchDir, batchId, "crosschecked.json");
    let raw;
    try {
      raw = fs.readFileSync(ccPath, "utf8");
    } catch (err) {
      if (err && err.code === "ENOENT") continue; // pre-G.1 / partial batch
      throw new Error(
        `aggregate-findings: read failed for ${batchId}: ${sanitize(err)}`
      );
    }
    let records;
    try {
      records = JSON.parse(raw);
    } catch (err) {
      throw new Error(
        `aggregate-findings: parse failed for ${batchId}: ${sanitize(err)}`
      );
    }
    if (!Array.isArray(records)) {
      throw new Error(
        `aggregate-findings: ${batchId}/crosschecked.json is not an array`
      );
    }
    batches.push({ batchId, records });
  }
  // Stable sort by batchId so output is deterministic across runs.
  batches.sort((a, b) => a.batchId.localeCompare(b.batchId));
  return batches;
}

/**
 * Compute the aggregated findings object from collected batch files.
 */
function aggregate(batches) {
  const allCrossChecked = [];
  for (const { records } of batches) {
    for (const r of records) {
      if (r && typeof r === "object") allCrossChecked.push(r);
    }
  }

  const previewRecords = allCrossChecked
    .filter((r) => r && r.preview)
    .map((r) => r.preview);

  const unreachable = allCrossChecked
    .filter((r) => r && r.unreachable)
    .map((r) => r.path)
    .filter((p) => typeof p === "string");

  const agreementRate =
    previewRecords.length === 0
      ? 1
      : previewRecords.filter(
          (r) => Array.isArray(r.needs_review) && r.needs_review.length === 0
        ).length / previewRecords.length;

  const disagreements = allCrossChecked.flatMap((r) =>
    (r?.disagreements || []).map((d) => ({ path: r.path, ...d }))
  );

  return {
    agreement_rate: agreementRate,
    record_count: previewRecords.length,
    unreachable,
    disagreements,
    records: previewRecords,
  };
}

function parseArgs(argv) {
  const args = { batchDir: DEFAULT_BATCH_DIR, out: null };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--batch-dir") {
      args.batchDir = argv[++i];
    } else if (a.startsWith("--batch-dir=")) {
      args.batchDir = a.slice("--batch-dir=".length);
    } else if (a === "--out") {
      args.out = argv[++i];
    } else if (a.startsWith("--out=")) {
      args.out = a.slice("--out=".length);
    } else {
      throw new Error(`unknown arg: ${a}`);
    }
  }
  return args;
}

function cli() {
  let args;
  try {
    args = parseArgs(process.argv.slice(2));
  } catch (err) {
    process.stderr.write(
      `aggregate-findings: ${sanitize(err)}\n` +
        "usage: node aggregate-findings.js [--batch-dir DIR] [--out FILE]\n"
    );
    process.exit(2);
  }

  let batches;
  try {
    batches = collectBatchFiles(args.batchDir);
  } catch (err) {
    process.stderr.write(`aggregate-findings: ${sanitize(err)}\n`);
    process.exit(2);
  }

  if (batches.length === 0) {
    process.stderr.write(
      `aggregate-findings: no crosschecked.json files found under ${args.batchDir}\n`
    );
    process.exit(1);
  }

  const findings = aggregate(batches);
  const json = JSON.stringify(findings, null, 2);

  if (args.out) {
    try {
      fs.writeFileSync(args.out, json + "\n", "utf8");
    } catch (err) {
      process.stderr.write(`aggregate-findings: write failed: ${sanitize(err)}\n`);
      process.exit(2);
    }
    // Brief summary to stderr so the user sees what landed.
    process.stderr.write(
      `aggregate-findings: wrote ${args.out}\n` +
        `  batches:        ${batches.length}\n` +
        `  records:        ${findings.record_count}\n` +
        `  unreachable:    ${findings.unreachable.length}\n` +
        `  disagreements:  ${findings.disagreements.length}\n` +
        `  agreement_rate: ${(findings.agreement_rate * 100).toFixed(1)}%\n`
    );
  } else {
    process.stdout.write(json + "\n");
  }
  process.exit(0);
}

if (require.main === module) cli();

module.exports = { collectBatchFiles, aggregate };
