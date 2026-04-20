#!/usr/bin/env node
/**
 * validate-catalog.js — Pre-commit validator for Piece 3 catalogs.
 *
 * Wraps ajv against `.claude/sync/schema/schema-v1.json` and adds Piece 3
 * commit-time rules (D3 + D5):
 *
 *   1. `status: partial` is rejected — must resolve the async fill first.
 *   2. `needs_review` MUST be an empty array — any non-empty list blocks.
 *   3. `pending_agent_fill: true` is rejected — async fills must settle.
 *   4. Optional: schema_version must match a known value.
 *
 * Also extends the in-memory copy of the schema's `status` enum with
 * `partial` so records in flight pass schema validation but fail the rule
 * layer. This avoids touching `schema-v1.json` until the minor bump lands
 * (see `.claude/sync/label/docs/CATALOG_SHAPE.md` §4.1).
 *
 * Invocation:
 *   node validate-catalog.js            # all 4 default catalogs
 *   node validate-catalog.js --staged   # only catalogs that appear in git staged-file list
 *   node validate-catalog.js --path=.claude/sync/label/shared.jsonl
 *
 * Exit codes:
 *   0 — clean
 *   1 — validation failure (details printed to stderr)
 *   2 — usage / environmental error (missing schema, bad args)
 */

const fs = require("node:fs");
const path = require("node:path");
const { execFileSync } = require("node:child_process");

const REPO_ROOT_SENTINEL = path.join(__dirname, "..", "..", "..", "..");
const { readCatalog } = require("./catalog-io");
const { sanitize, logger } = require("./sanitize");

const SCHEMA_PATH = path.join(REPO_ROOT_SENTINEL, ".claude", "sync", "schema", "schema-v1.json");
const DEFAULT_CATALOGS = [
  ".claude/sync/label/shared.jsonl",
  ".claude/sync/label/local.jsonl",
  ".claude/sync/label/composites-shared.jsonl",
  ".claude/sync/label/composites-local.jsonl",
];

let cachedValidator = null;

/**
 * Lazy-load ajv + schema. Cached for repeated calls.
 * @returns {{validateFile: Function, validateComposite: Function}}
 */
function getValidators() {
  if (cachedValidator) return cachedValidator;
  let Ajv;
  try {
    ({ default: Ajv } = require("ajv"));
  } catch {
    // ajv 8 exposes the class directly via require()
    Ajv = require("ajv");
  }
  let schema;
  try {
    schema = JSON.parse(fs.readFileSync(SCHEMA_PATH, "utf8"));
  } catch (err) {
    throw new Error(`validate-catalog: schema load failed: ${sanitize(err)}`);
  }

  // Extend status enum in memory: add `partial` so schema-valid records can
  // be inflight; the rule layer below separately rejects them at commit.
  // (Harmless now that schema-v1.json also carries `partial`; retained as
  // belt-and-suspenders for pre-v1.1 schema files encountered during
  // cross-repo sync windows.)
  extendStatusEnum(schema, "partial");

  // Piece 3 adds machinery fields (`pending_agent_fill`, `manual_override`,
  // `needs_review`, `last_hook_fire`, `schema_version`) on top of the Piece 2
  // universal columns. Until those land as typed optional columns via a
  // schema v1.2 bump (tracked in the /todo backlog), we relax the file_record
  // subschema to allow additional properties. The rule layer below still
  // enforces the semantic invariants (status:partial, pending_agent_fill,
  // needs_review) so commit-time safety is unaffected.
  relaxFileRecordAdditionalProperties(schema);

  // allErrors:false — fail-fast on first validation error. Silences the
  // ajv-allerrors-true DoS advisory (Semgrep) and matches production-grade
  // usage; we still emit a specific diagnostic for the first failure, which
  // is enough to guide a local-dev fix.
  const ajv = new Ajv({ allErrors: false, strict: false });
  const validateFile = compileFileRecordValidator(ajv, schema);
  const validateComposite = compileCompositeValidator(ajv, schema);
  cachedValidator = { validateFile, validateComposite };
  return cachedValidator;
}

/**
 * Patch the status enum in an ajv-loaded schema. Searches common locations
 * (definitions, $defs) for `enum_status` and adds the value if missing.
 * @param {object} schema
 * @param {string} value
 */
function extendStatusEnum(schema, value) {
  const locations = [schema.definitions, schema.$defs];
  for (const container of locations) {
    if (!container) continue;
    const def = container.enum_status;
    if (!def || !Array.isArray(def.enum)) continue;
    if (!def.enum.includes(value)) def.enum.push(value);
  }
}

/**
 * Relax `additionalProperties: false` on the file_record subschema so the
 * Piece 3 machinery fields don't trip schema validation. Scoped narrowly —
 * we only flip the file_record (and composite_record) definition, not the
 * whole schema.
 * @param {object} schema
 */
function relaxFileRecordAdditionalProperties(schema) {
  const locations = [schema.definitions, schema.$defs];
  for (const container of locations) {
    if (!container) continue;
    for (const key of [
      "file_record",
      "fileRecord",
      "composite_record",
      "compositeRecord",
    ]) {
      const def = container[key];
      if (def && typeof def === "object" && def.additionalProperties === false) {
        def.additionalProperties = true;
      }
    }
  }
  // NOTE: we deliberately do NOT relax `schema.additionalProperties` at the
  // top level. A flat-authored schema would mean "additionalProperties
  // applies to the whole document," and flipping it globally dilutes
  // strict-schema checks for every consumer — a fail-open posture. If a
  // future schema is authored flat, add the targeted relaxation at the
  // record-definition that actually needs it, not the document root.
  // (Qodo Sugg R7 — removed top-level fallback.)
}

/**
 * Compile a validator for file records. Falls back to the whole schema if
 * a file-specific definition can't be located.
 */
function compileFileRecordValidator(ajv, schema) {
  const fileDef =
    (schema.definitions && (schema.definitions.file_record || schema.definitions.fileRecord)) ||
    (schema.$defs && (schema.$defs.file_record || schema.$defs.fileRecord)) ||
    null;
  if (fileDef) {
    return ajv.compile({ ...fileDef, definitions: schema.definitions, $defs: schema.$defs });
  }
  return ajv.compile(schema);
}

function compileCompositeValidator(ajv, schema) {
  const compDef =
    (schema.definitions &&
      (schema.definitions.composite_record || schema.definitions.compositeRecord)) ||
    (schema.$defs && (schema.$defs.composite_record || schema.$defs.compositeRecord)) ||
    null;
  if (compDef) {
    return ajv.compile({ ...compDef, definitions: schema.definitions, $defs: schema.$defs });
  }
  return ajv.compile(schema);
}

/**
 * Apply the Piece 3 commit-time rules on top of schema validation.
 * @param {object} record
 * @returns {string[]} List of rule-layer error messages; empty if clean
 */
function applyRuleLayer(record) {
  const errors = [];
  if (record && typeof record === "object") {
    if (record.status === "partial") {
      errors.push("status: partial (async fill not yet settled)");
    }
    if (record.pending_agent_fill === true) {
      errors.push("pending_agent_fill: true (async job still in flight)");
    }
    if (Array.isArray(record.needs_review) && record.needs_review.length > 0) {
      errors.push(`needs_review non-empty: ${record.needs_review.join(", ")}`);
    }
  }
  return errors;
}

/**
 * Validate a single catalog file.
 * @param {string} catalogPath
 * @param {"file" | "composite"} [recordType="file"]
 * @returns {{valid: boolean, errors: Array<{line: number, path: string, messages: string[]}>}}
 */
function validateCatalog(catalogPath, recordType = "file") {
  let records;
  try {
    records = readCatalog(catalogPath);
  } catch (err) {
    return {
      valid: false,
      errors: [{ line: 0, path: catalogPath, messages: [sanitize(err)] }],
    };
  }
  const { validateFile, validateComposite } = getValidators();
  const schemaValidator = recordType === "composite" ? validateComposite : validateFile;
  const errors = [];

  records.forEach((record, idx) => {
    const lineNo = idx + 1;
    const perRecord = [];
    const schemaOk = schemaValidator(record);
    if (!schemaOk && Array.isArray(schemaValidator.errors)) {
      for (const e of schemaValidator.errors) {
        perRecord.push(`${e.instancePath || "<root>"}: ${e.message}`);
      }
    }
    for (const msg of applyRuleLayer(record)) perRecord.push(msg);
    if (perRecord.length > 0) {
      errors.push({
        line: lineNo,
        path: record && typeof record.path === "string" ? record.path : "<no path>",
        messages: perRecord,
      });
    }
  });

  return { valid: errors.length === 0, errors };
}

/**
 * Filter a catalog list to only those touched by currently-staged files.
 * @param {string[]} catalogs
 * @returns {string[]}
 */
function filterStagedCatalogs(catalogs) {
  let staged;
  try {
    staged = execFileSync("git", ["diff", "--cached", "--name-only"], {
      encoding: "utf8",
      cwd: REPO_ROOT_SENTINEL,
    })
      .split("\n")
      .map((s) => s.trim())
      .filter(Boolean);
  } catch (err) {
    logger.warn("validate-catalog: git diff --cached failed; validating all catalogs", err);
    return catalogs;
  }
  const stagedSet = new Set(staged);
  return catalogs.filter((c) => stagedSet.has(c));
}

function parseArgv(argv) {
  const opts = { staged: false, paths: [] };
  for (const arg of argv) {
    if (arg === "--staged") opts.staged = true;
    else if (arg.startsWith("--path=")) opts.paths.push(arg.slice("--path=".length));
    else if (arg === "--all" || arg === "-h" || arg === "--help") {
      // --all is default; help falls through to cli()
      if (arg === "-h" || arg === "--help") opts.help = true;
    }
  }
  return opts;
}

function printHelp() {
  process.stdout.write(
    [
      "Usage: node .claude/sync/label/lib/validate-catalog.js [options]",
      "",
      "Options:",
      "  --staged             Only validate catalogs in the git staged list",
      "  --path=<file>        Validate a specific catalog (repeatable)",
      "  --all                Validate all four default catalogs (default)",
      "  -h, --help           Show this help",
      "",
      "Exit codes:",
      "  0  clean",
      "  1  validation failure",
      "  2  usage / environmental error",
      "",
    ].join("\n")
  );
}

function cli(argv) {
  const opts = parseArgv(argv);
  if (opts.help) {
    printHelp();
    return 0;
  }

  let targets = opts.paths.length > 0 ? opts.paths : DEFAULT_CATALOGS;
  if (opts.staged) targets = filterStagedCatalogs(targets);

  if (targets.length === 0) {
    process.stdout.write("validate-catalog: no catalogs to check.\n");
    return 0;
  }

  let anyFailure = false;
  for (const catalogPath of targets) {
    const recordType = /composites/.test(catalogPath) ? "composite" : "file";
    const abs = path.resolve(REPO_ROOT_SENTINEL, catalogPath);
    if (!fs.existsSync(abs)) {
      // Missing catalog is valid (haven't back-filled yet). Silent skip.
      continue;
    }
    const { valid, errors } = validateCatalog(abs, recordType);
    if (valid) {
      process.stdout.write(`✓ ${catalogPath}: clean\n`);
    } else {
      anyFailure = true;
      process.stderr.write(`\n✗ ${catalogPath}: ${errors.length} invalid record(s)\n`);
      for (const e of errors) {
        process.stderr.write(`  line ${e.line} (${e.path}):\n`);
        for (const msg of e.messages) process.stderr.write(`    - ${msg}\n`);
      }
    }
  }
  return anyFailure ? 1 : 0;
}

if (require.main === module) {
  try {
    const code = cli(process.argv.slice(2));
    process.exit(code);
  } catch (err) {
    process.stderr.write(`validate-catalog: ${sanitize(err)}\n`);
    process.exit(2);
  }
}

module.exports = {
  SCHEMA_PATH,
  DEFAULT_CATALOGS,
  getValidators,
  applyRuleLayer,
  validateCatalog,
  filterStagedCatalogs,
  cli,
};
