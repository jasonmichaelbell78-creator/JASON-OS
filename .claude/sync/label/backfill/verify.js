#!/usr/bin/env node
/**
 * verify.js — Verification harness for back-fill agent outputs (Plan §S10).
 *
 * Runs at the trust boundary between agent output and `crossCheckBatch()`.
 * Stacks three verification layers:
 *
 *   1. Schema validation — ajv against `schema-v1.json` (file_record)
 *   2. Per-field sanity — path-exists, type-agrees-with-derive-heuristic,
 *      required_secrets SHOUTING_SNAKE_CASE, tool_deps recognizable
 *   3. Statistical sanity — computed across a whole batch (not per record)
 *
 * Called by the live Claude session after parsing agent JSON output.
 * Does NOT spawn agents or cross-check; those live in orchestrate.js /
 * cross-check.js. This is purely a quality gate.
 *
 * Usage:
 *   const { verifyRecord, verifyBatch, statisticalSanity } = require('./verify');
 *   const report = verifyBatch(agentRecords, { batchId: 'B01' });
 *   // report.clean (bool) / report.records[i].errors / report.statistical
 *
 * CLI mode (for ad-hoc debugging):
 *   node verify.js <path-to-jsonl> [--batch-id=B01]
 */

"use strict";

const fs = require("node:fs");
const path = require("node:path");

const REPO_ROOT_SENTINEL = path.join(__dirname, "..", "..", "..", "..");

const { getValidators, applyRuleLayer } = require(
  path.join(REPO_ROOT_SENTINEL, ".claude", "sync", "label", "lib", "validate-catalog.js")
);
const { detectType } = require(
  path.join(REPO_ROOT_SENTINEL, ".claude", "sync", "label", "lib", "derive.js")
);
const { sanitize } = require(
  path.join(REPO_ROOT_SENTINEL, ".claude", "sync", "label", "lib", "sanitize.js")
);
const { validatePathInDir } = require(
  path.join(REPO_ROOT_SENTINEL, "scripts", "lib", "security-helpers.js")
);

// Known well-formed values — used for sanity-but-not-reject warnings.
const KNOWN_TOOL_DEPS = new Set([
  "node", "npm", "bash", "sh", "git", "gh", "go", "python", "python3",
  "jq", "gitleaks", "ajv", "semgrep", "codeql", "sonar-scanner",
  "husky", "lint-staged", "curl", "wget", "grep", "sed", "awk",
  "docker", "make", "cargo", "rustc", "rg", "fzf",
]);

const KNOWN_EXTERNAL_SERVICES = new Set([
  "github", "github-actions", "sonarcloud", "qodo", "openweathermap",
  "openai", "anthropic", "google", "aws", "npm-registry",
  "gitleaks", "semgrep-registry", "codeql", "gemini",
]);

const SECRET_NAME_RE = /^[A-Z][A-Z0-9_]*$/;

/**
 * Verify a single record against schema + sanity layers.
 *
 * @param {object} record
 * @param {object} [opts]
 * @param {string} [opts.repoRoot] - override for tests
 * @returns {{clean: boolean, schemaErrors: string[], ruleErrors: string[], sanityWarnings: string[], sanityErrors: string[]}}
 */
function verifyRecord(record, opts = {}) {
  const repoRoot = opts.repoRoot || REPO_ROOT_SENTINEL;
  const schemaErrors = [];
  const ruleErrors = [];
  const sanityWarnings = [];
  const sanityErrors = [];

  // Layer 1: schema
  // `confidence` is a runtime cross-check metadata field — agents emit it,
  // but it is intentionally NOT in schema-v1.json (file_record has
  // `additionalProperties: false`). Strip before schema check; preserve the
  // raw record for sanity checks below.
  try {
    const { validateFile } = getValidators();
    const toValidate = record && typeof record === "object" && "confidence" in record
      ? (() => { const { confidence: _conf, ...rest } = record; return rest; })()
      : record;
    const ok = validateFile(toValidate);
    if (!ok) {
      for (const e of validateFile.errors || []) {
        schemaErrors.push(`${e.instancePath || "(root)"}: ${e.message}`);
      }
    }
  } catch (err) {
    schemaErrors.push(`schema validator threw: ${sanitize(err)}`);
  }

  // Piece 3 commit-time rules
  try {
    for (const m of applyRuleLayer(record)) ruleErrors.push(m);
  } catch (err) {
    ruleErrors.push(`rule layer threw: ${sanitize(err)}`);
  }

  // Layer 2: per-field sanity
  // Validate path stays within repo root BEFORE any fs ops (trust boundary —
  // agent output is untrusted; `../` traversal could probe files outside repo).
  let abs = null;
  if (record && typeof record.path === "string" && record.path.length > 0) {
    try {
      validatePathInDir(repoRoot, record.path);
      abs = path.join(repoRoot, record.path);
    } catch {
      sanityErrors.push(`path escapes repo root: ${record.path}`);
    }
  }

  // 2a. path exists on disk (treat missing as hard error — agent hallucinated)
  if (abs !== null) {
    try {
      if (!fs.existsSync(abs)) {
        sanityErrors.push(`path does not exist on disk: ${record.path}`);
      }
    } catch (err) {
      sanityWarnings.push(`path existsSync threw: ${sanitize(err)}`);
    }
  }

  // 2b. type agrees with derive.js heuristic
  if (abs !== null && typeof record.type === "string") {
    try {
      let content = "";
      try {
        if (fs.existsSync(abs)) {
          const stat = fs.statSync(abs);
          // Skip content read for >256 KB — detectType mostly uses path anyway.
          if (stat.size <= 256 * 1024) {
            content = fs.readFileSync(abs, "utf8");
          }
        }
      } catch {
        // swallow — detectType tolerates empty content
      }
      const expected = detectType(record.path, content);
      if (expected && expected !== record.type) {
        sanityWarnings.push(
          `type disagreement: agent="${record.type}", derive.detectType="${expected}"`
        );
      }
    } catch (err) {
      sanityWarnings.push(`type heuristic threw: ${sanitize(err)}`);
    }
  }

  // external_dep_entry shape: {name, hardness}. Helper to extract string name.
  const depName = (entry) => {
    if (typeof entry === "string") return entry;
    if (entry && typeof entry === "object" && typeof entry.name === "string") return entry.name;
    return null;
  };

  // 2c. required_secrets SHOUTING_SNAKE_CASE (schema says array of external_dep_entry objects)
  if (Array.isArray(record?.required_secrets)) {
    for (const s of record.required_secrets) {
      const nm = depName(s);
      if (nm === null) {
        sanityWarnings.push(`required_secrets entry not string or {name} object`);
        continue;
      }
      if (!SECRET_NAME_RE.test(nm)) {
        sanityWarnings.push(`required_secrets "${nm}" not SHOUTING_SNAKE_CASE`);
      }
    }
  }

  // 2d. tool_deps recognizable (informational — schema says array of external_dep_entry)
  if (Array.isArray(record?.tool_deps)) {
    for (const t of record.tool_deps) {
      const nm = depName(t);
      if (nm === null) continue;
      if (!KNOWN_TOOL_DEPS.has(nm.toLowerCase())) {
        sanityWarnings.push(`tool_deps "${nm}" not in known-CLI list (may still be valid)`);
      }
    }
  }

  // 2e. external_services recognizable (informational — schema says array of external_dep_entry)
  if (Array.isArray(record?.external_services)) {
    for (const svc of record.external_services) {
      const nm = depName(svc);
      if (nm === null) continue;
      const normalized = nm.toLowerCase().replace(/[_-]/g, "");
      let found = false;
      for (const k of KNOWN_EXTERNAL_SERVICES) {
        if (normalized.includes(k.replace(/[_-]/g, ""))) {
          found = true;
          break;
        }
      }
      if (!found) {
        sanityWarnings.push(`external_services "${nm}" not in known-service list (may still be valid)`);
      }
    }
  }

  // 2f. purpose non-empty and not suspiciously short
  if (typeof record?.purpose !== "string" || record.purpose.trim().length === 0) {
    sanityErrors.push("purpose is empty or not a string");
  } else if (record.purpose.trim().length < 15) {
    sanityWarnings.push(`purpose is suspiciously short (${record.purpose.trim().length} chars)`);
  }

  // 2g. dependencies shape (if present)
  if (Array.isArray(record?.dependencies)) {
    for (const dep of record.dependencies) {
      if (!dep || typeof dep !== "object") {
        sanityErrors.push(`dependencies entry not an object: ${JSON.stringify(dep)}`);
        continue;
      }
      if (typeof dep.name !== "string") sanityErrors.push("dependency missing string name");
      if (dep.hardness && !["hard", "soft"].includes(dep.hardness)) {
        sanityErrors.push(`dependency hardness "${dep.hardness}" not in {hard,soft}`);
      }
      if (dep.kind && !["spawn", "import", "reference", "invoke"].includes(dep.kind)) {
        sanityErrors.push(`dependency kind "${dep.kind}" not in {spawn,import,reference,invoke}`);
      }
    }
  }

  const clean =
    schemaErrors.length === 0 &&
    ruleErrors.length === 0 &&
    sanityErrors.length === 0;

  return { clean, schemaErrors, ruleErrors, sanityWarnings, sanityErrors };
}

/**
 * Verify an array of records (one batch's worth).
 *
 * @param {object[]} records
 * @param {object} [opts]
 * @param {string} [opts.batchId]
 * @param {string} [opts.repoRoot]
 * @returns {{clean: boolean, batchId: string|undefined, records: Array<{path: string|null, ...verifyRecord}>, statistical: object, summary: object}}
 */
function verifyBatch(records, opts = {}) {
  if (!Array.isArray(records)) {
    throw new TypeError("verifyBatch: records must be an array");
  }
  const per = records.map((r) => ({
    path: (r && typeof r === "object" && typeof r.path === "string") ? r.path : null,
    ...verifyRecord(r, opts),
  }));
  const statistical = statisticalSanity(records);
  const summary = {
    total: per.length,
    clean: per.filter((r) => r.clean).length,
    withSchemaErrors: per.filter((r) => r.schemaErrors.length > 0).length,
    withRuleErrors: per.filter((r) => r.ruleErrors.length > 0).length,
    withSanityErrors: per.filter((r) => r.sanityErrors.length > 0).length,
    withSanityWarnings: per.filter((r) => r.sanityWarnings.length > 0).length,
  };
  return {
    clean: summary.clean === summary.total,
    batchId: opts.batchId,
    records: per,
    statistical,
    summary,
  };
}

/**
 * Compute batch-level statistical-sanity flags.
 * Flags degenerate distributions (all records share one value for a field
 * that should vary) and suspicious constants.
 *
 * @param {object[]} records
 * @returns {{typeDistribution: object, portabilityDistribution: object, statusDistribution: object, flags: string[]}}
 */
function statisticalSanity(records) {
  const flags = [];
  const typeDistribution = {};
  const portabilityDistribution = {};
  const statusDistribution = {};
  const purposeLengths = [];

  for (const r of records) {
    if (!r || typeof r !== "object") continue;
    if (typeof r.type === "string") {
      typeDistribution[r.type] = (typeDistribution[r.type] || 0) + 1;
    }
    if (typeof r.portability === "string") {
      portabilityDistribution[r.portability] = (portabilityDistribution[r.portability] || 0) + 1;
    }
    if (typeof r.status === "string") {
      statusDistribution[r.status] = (statusDistribution[r.status] || 0) + 1;
    }
    if (typeof r.purpose === "string") {
      purposeLengths.push(r.purpose.trim().length);
    }
  }

  // Flag: if we have >3 records and all share one type/portability value, that's suspicious.
  if (records.length > 3) {
    if (Object.keys(typeDistribution).length === 1) {
      flags.push(`all ${records.length} records share type="${Object.keys(typeDistribution)[0]}"`);
    }
    if (Object.keys(portabilityDistribution).length === 1) {
      flags.push(
        `all ${records.length} records share portability="${Object.keys(portabilityDistribution)[0]}"`
      );
    }
  }

  // Flag: suspiciously uniform purpose length (std dev < 5 chars on ≥5 records)
  if (purposeLengths.length >= 5) {
    const mean = purposeLengths.reduce((a, b) => a + b, 0) / purposeLengths.length;
    const variance =
      purposeLengths.reduce((a, b) => a + (b - mean) ** 2, 0) / purposeLengths.length;
    const stddev = Math.sqrt(variance);
    if (stddev < 5) {
      flags.push(
        `purpose-length stddev=${stddev.toFixed(1)} on ${purposeLengths.length} records — suspiciously uniform`
      );
    }
  }

  return {
    typeDistribution,
    portabilityDistribution,
    statusDistribution,
    purposeLengthMean:
      purposeLengths.length > 0
        ? purposeLengths.reduce((a, b) => a + b, 0) / purposeLengths.length
        : 0,
    flags,
  };
}

/**
 * Render a verifyBatch report as human-readable text.
 *
 * @param {ReturnType<typeof verifyBatch>} report
 * @returns {string}
 */
function formatReport(report) {
  const lines = [];
  lines.push(`=== Verification report${report.batchId ? " — " + report.batchId : ""} ===`);
  const s = report.summary;
  lines.push(
    `Records: ${s.total} | clean: ${s.clean} | schema-err: ${s.withSchemaErrors} | ` +
      `rule-err: ${s.withRuleErrors} | sanity-err: ${s.withSanityErrors} | ` +
      `sanity-warn: ${s.withSanityWarnings}`
  );
  const st = report.statistical;
  lines.push(
    `Types: ${JSON.stringify(st.typeDistribution)} | Portability: ` +
      `${JSON.stringify(st.portabilityDistribution)}`
  );
  if (st.flags.length > 0) {
    lines.push(`Statistical flags:`);
    for (const f of st.flags) lines.push(`  - ${f}`);
  }
  for (const r of report.records) {
    const hasIssues =
      r.schemaErrors.length > 0 ||
      r.ruleErrors.length > 0 ||
      r.sanityErrors.length > 0 ||
      r.sanityWarnings.length > 0;
    if (!hasIssues) continue;
    lines.push(`\n  ${r.path || "(no path)"}`);
    for (const e of r.schemaErrors) lines.push(`    [SCHEMA] ${e}`);
    for (const e of r.ruleErrors) lines.push(`    [RULE]   ${e}`);
    for (const e of r.sanityErrors) lines.push(`    [SANITY] ${e}`);
    for (const w of r.sanityWarnings) lines.push(`    [WARN]   ${w}`);
  }
  return lines.join("\n");
}

/**
 * Check cross-batch consistency across a fully-populated result set.
 * Call once, after every batch has been cross-checked.
 *
 * @param {object[]} allRecords - flat array, one record per file
 * @returns {{clean: boolean, issues: string[]}}
 */
function crossBatchConsistency(allRecords) {
  const issues = [];

  // Duplicate paths
  const seenPaths = new Map();
  for (const r of allRecords) {
    if (!r || typeof r.path !== "string") continue;
    if (seenPaths.has(r.path)) {
      issues.push(`duplicate path across batches: ${r.path}`);
    } else {
      seenPaths.set(r.path, true);
    }
  }

  // supersedes / superseded_by reverse-pair check
  const byName = new Map();
  for (const r of allRecords) {
    if (r && typeof r.name === "string") byName.set(r.name, r);
  }
  for (const r of allRecords) {
    if (!r) continue;
    if (Array.isArray(r.supersedes)) {
      for (const other of r.supersedes) {
        const target = byName.get(other);
        if (!target) {
          issues.push(`${r.path} supersedes "${other}" but that name has no record`);
        } else if (target.superseded_by && target.superseded_by !== r.name) {
          issues.push(
            `${r.path} supersedes "${other}" but "${other}".superseded_by="${target.superseded_by}"`
          );
        }
      }
    }
    if (r.superseded_by) {
      const target = byName.get(r.superseded_by);
      if (!target) {
        issues.push(`${r.path}.superseded_by="${r.superseded_by}" has no matching record`);
      }
    }
  }

  // Dangling dependency pointers
  for (const r of allRecords) {
    if (!r || !Array.isArray(r.dependencies)) continue;
    for (const dep of r.dependencies) {
      if (!dep || typeof dep.name !== "string") continue;
      if (!byName.has(dep.name)) {
        issues.push(
          `${r.path} depends on "${dep.name}" but no matching record exists (may be external)`
        );
      }
    }
  }

  return { clean: issues.length === 0, issues };
}

// CLI mode — reads JSONL from a file and prints the report.
function cli() {
  const args = process.argv.slice(2);
  const jsonlPath = args.find((a) => !a.startsWith("--"));
  const batchIdArg = args.find((a) => a.startsWith("--batch-id="));
  if (!jsonlPath) {
    process.stderr.write("usage: node verify.js <records.jsonl> [--batch-id=B01]\n");
    process.exit(2);
  }
  try {
    const raw = fs.readFileSync(jsonlPath, "utf8");
    const records = raw
      .split("\n")
      .filter((line) => line.trim().length > 0)
      .map((line) => JSON.parse(line));
    const batchId = batchIdArg ? batchIdArg.split("=")[1] : undefined;
    const report = verifyBatch(records, { batchId });
    process.stdout.write(formatReport(report) + "\n");
    process.exit(report.clean ? 0 : 1);
  } catch (err) {
    process.stderr.write(`verify: ${sanitize(err)}\n`);
    process.exit(2);
  }
}

if (require.main === module) cli();

module.exports = {
  verifyRecord,
  verifyBatch,
  statisticalSanity,
  crossBatchConsistency,
  formatReport,
};
