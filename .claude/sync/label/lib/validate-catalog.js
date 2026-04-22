#!/usr/bin/env node
/**
 * validate-catalog.js — Pre-commit validator for Piece 3 catalogs.
 *
 * Wraps ajv against `.claude/sync/schema/schema-v1.json` (v1.3) and adds
 * Piece 3 commit-time rules (D3 + D5):
 *
 *   1. `status: partial` is rejected — must resolve the async fill first.
 *   2. `needs_review` MUST be an empty array — any non-empty list blocks.
 *   3. `pending_agent_fill: true` is rejected — async fills must settle.
 *   4. `.name` uniqueness across the catalog (D4.3) — duplicate names
 *      fail with both conflicting paths named in the error.
 *   5. `schema_version` is informational — records stamped older than
 *      "1.3" still validate by additive compatibility per D5.8.
 *
 * Structural-fix D5.8: single-path validation against v1.3. The old
 * `extendStatusEnum` in-memory fallback was a pre-v1.1 belt-and-
 * suspenders — schema has carried `partial` natively since v1.1 and
 * it is now dead code. Removed.
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

  // D5.8 (structural-fix): single-path validation against v1.3. The old
  // in-memory `extendStatusEnum(schema, "partial")` belt-and-suspenders
  // was for pre-v1.1 schema files during cross-repo sync windows; schema
  // has carried `partial` natively since v1.1 — dead code removed.

  // D2.2 (structural-fix): schema-v1.json needs ajv-formats because
  // last_hook_fire carries format:date-time. Registering formats here
  // matches the posture in .validate-test.cjs (Phase A).
  const addFormats = require("ajv-formats");
  // allErrors:false — fail-fast on first validation error. Silences the
  // ajv-allerrors-true DoS advisory (Semgrep) and matches production-grade
  // usage; we still emit a specific diagnostic for the first failure, which
  // is enough to guide a local-dev fix.
  const ajv = new Ajv({ allErrors: false, strict: false });
  addFormats(ajv);
  const validateFile = compileFileRecordValidator(ajv, schema);
  const validateComposite = compileCompositeValidator(ajv, schema);
  cachedValidator = { validateFile, validateComposite };
  return cachedValidator;
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
 * D4.3 name-uniqueness enforcement. Builds a `{name → firstSeenRecord}`
 * index; emits a Duplicate error for every subsequent record that shares
 * a name, naming both conflicting paths in the message.
 *
 * @param {object[]} records
 * @returns {Array<{line: number, path: string, messages: string[]}>}
 */
function checkNameUniqueness(records) {
  const nameIndex = new Map();
  const errors = [];
  records.forEach((record, idx) => {
    if (!record || typeof record !== "object") return;
    if (typeof record.name !== "string" || record.name.length === 0) return;
    const thisPath = typeof record.path === "string" ? record.path : `<line ${idx + 1}>`;
    const prior = nameIndex.get(record.name);
    if (prior) {
      errors.push({
        line: idx + 1,
        path: thisPath,
        messages: [
          `Duplicate .name "${record.name}" between ${prior.path} and ${thisPath}`,
        ],
      });
    } else {
      nameIndex.set(record.name, { path: thisPath, line: idx + 1 });
    }
  });
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

  // D4.3: catalog-scope name uniqueness check (runs after per-record
  // validation so schema errors and duplicate errors both surface).
  errors.push(...checkNameUniqueness(records));

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
  checkNameUniqueness,
  validateCatalog,
  filterStagedCatalogs,
  cli,
};
