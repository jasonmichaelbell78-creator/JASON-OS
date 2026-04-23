#!/usr/bin/env node
/**
 * apply-arbitration.js — CLI shim for preview.applyArbitration.
 *
 * Reads a final arbitration package (see synthesis-agent-template.md
 * Part 3) from the given JSON file and applies it to the on-disk
 * preview catalogs. Prints the summary as JSON to stdout.
 *
 * Usage:
 *   node .claude/sync/label/backfill/apply-arbitration.js <package.json>
 *
 * Exit codes:
 *   0 — clean application, no per-decision errors
 *   1 — application succeeded but some decisions were skipped (errors[] non-empty)
 *   2 — usage / read / parse / hard error from applyArbitration itself
 */

"use strict";

const fs = require("node:fs");
const { applyArbitration } = require("./preview");
const { sanitize } = require("../lib/sanitize");

function cli() {
  const pkgPath = process.argv[2];
  if (!pkgPath) {
    process.stderr.write(
      "usage: node apply-arbitration.js <arbitration-package.json>\n"
    );
    process.exit(2);
  }
  let pkg;
  try {
    pkg = JSON.parse(fs.readFileSync(pkgPath, "utf8"));
  } catch (err) {
    process.stderr.write(
      `apply-arbitration: package read/parse failed: ${sanitize(err)}\n`
    );
    process.exit(2);
  }
  let summary;
  try {
    summary = applyArbitration(pkg);
  } catch (err) {
    process.stderr.write(`apply-arbitration: ${sanitize(err)}\n`);
    process.exit(2);
  }
  process.stdout.write(JSON.stringify(summary, null, 2) + "\n");
  process.exit(summary.errors.length === 0 ? 0 : 1);
}

if (require.main === module) cli();

module.exports = { cli };
