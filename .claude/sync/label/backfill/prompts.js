/**
 * prompts.js — Back-fill orchestrator prompt builder.
 *
 * Hydrates the three markdown templates under `backfill/` with per-batch
 * and per-run data. The orchestrator (S8 of PLAN.md) feeds the returned
 * strings directly to primary/secondary/synthesis agents.
 *
 * Contract (see PLAN S8 + DERIVATION_RULES.md + DISAGREEMENT_RESOLUTION.md):
 *  - buildPrimaryPrompt(batch, { templatePath, batchId }) -> string
 *  - buildSecondaryPrompt(batch, { templatePath, batchId }) -> string
 *  - buildSynthesisPrompt(findings, { templatePath }) -> string
 *
 * All errors surface through `scripts/lib/sanitize-error.cjs` so no raw
 * filesystem paths or internal messages leak into logs.
 */

"use strict";

const path = require("node:path");
const fs = require("node:fs");

const { sanitizeError } = require(
  path.join(__dirname, "..", "..", "..", "..", "scripts", "lib", "sanitize-error.cjs")
);

let readTextWithSizeGuard;
try {
  ({ readTextWithSizeGuard } = require(
    path.join(__dirname, "..", "..", "..", "..", "scripts", "lib", "safe-fs.js")
  ));
} catch {
  readTextWithSizeGuard = null;
}

const PRIMARY_TEMPLATE = path.join(__dirname, "agent-primary-template.md");
const SECONDARY_TEMPLATE = path.join(__dirname, "agent-secondary-template.md");
const SYNTHESIS_TEMPLATE = path.join(__dirname, "synthesis-agent-template.md");

// Any {{TOKEN}} we have not substituted is a bug - error out instead of
// shipping a half-rendered prompt to the agent.
const PLACEHOLDER_PATTERN = /\{\{[A-Z0-9_]+\}\}/;

/**
 * Read a template file with the size-guarded helper when available; fall
 * back to readFileSync wrapped in try/catch. Errors are sanitized before
 * re-throw so no absolute filesystem paths leak through.
 *
 * @param {string} templatePath
 * @returns {string}
 */
function readTemplate(templatePath) {
  try {
    if (typeof readTextWithSizeGuard === "function") {
      return readTextWithSizeGuard(templatePath);
    }
    return fs.readFileSync(templatePath, "utf8");
  } catch (err) {
    throw new Error(`Failed to read prompt template: ${sanitizeError(err)}`);
  }
}

/**
 * Verify no `{{TOKEN}}` placeholder survived substitution. Throws with a
 * sanitized identifier of the offending token (but not the template path).
 *
 * @param {string} rendered
 */
function assertFullyHydrated(rendered) {
  const match = PLACEHOLDER_PATTERN.exec(rendered);
  if (match) {
    // R3 Q5 / Qodo Sugg #5: `sanitizeError` is designed for Error objects,
    // not strings. Passing `match[0]` (the raw placeholder text) to it is a
    // conceptual misuse. Format the token directly: JSON-escape + truncate
    // overly-long matches so the error message stays readable without
    // needing error-object sanitization.
    const token = String(match[0]);
    const safeToken =
      token.length > 200
        ? `${JSON.stringify(token.slice(0, 200))}…`
        : JSON.stringify(token);
    throw new Error(`Unfilled placeholder in prompt template: ${safeToken}`);
  }
}

/**
 * Format the file inventory block. Each entry becomes
 * `- <path> (weighted_kb: N.N)`. The orchestrator fills `weighted_kb` from
 * the byte-weighting pass (S8 step 2). A file with no recorded weight is
 * rendered as `weighted_kb: 0.0` so the agent still sees the path.
 *
 * @param {Array<{path: string, weighted_kb: number}>} files
 * @returns {string}
 */
function formatBatchFilesList(files) {
  if (!Array.isArray(files) || files.length === 0) {
    return "_(empty batch)_";
  }
  return files
    .map((f) => {
      const p = f && typeof f.path === "string" ? f.path : "<unknown>";
      const wkb =
        f && typeof f.weighted_kb === "number" && Number.isFinite(f.weighted_kb)
          ? f.weighted_kb
          : 0;
      return `- ${p} (weighted_kb: ${wkb.toFixed(1)})`;
    })
    .join("\n");
}

/**
 * Hydrate a primary/secondary batch prompt template.
 *
 * @param {{files: Array<{path: string, weighted_kb: number}>}} batch
 * @param {{templatePath?: string, batchId: string}} opts
 * @param {string} defaultTemplate
 * @returns {string}
 */
function hydrateBatchPrompt(batch, opts, defaultTemplate) {
  if (!batch || !Array.isArray(batch.files)) {
    throw new Error("buildPrompt: batch.files must be an array");
  }
  const { templatePath = defaultTemplate, batchId } = opts || {};
  if (typeof batchId !== "string" || batchId.length === 0) {
    throw new Error("buildPrompt: batchId must be a non-empty string");
  }

  const raw = readTemplate(templatePath);
  const filesList = formatBatchFilesList(batch.files);
  const rendered = raw
    .split("{{BATCH_ID}}")
    .join(batchId)
    .split("{{BATCH_FILES_LIST}}")
    .join(filesList);

  assertFullyHydrated(rendered);
  return rendered;
}

/**
 * Build the prompt string for a primary derivation agent.
 *
 * @param {{files: Array<{path: string, weighted_kb: number}>}} batch
 * @param {{templatePath?: string, batchId: string}} opts
 * @returns {string}
 */
function buildPrimaryPrompt(batch, opts) {
  return hydrateBatchPrompt(batch, opts, PRIMARY_TEMPLATE);
}

/**
 * Build the prompt string for a secondary (independent cross-check)
 * derivation agent.
 *
 * @param {{files: Array<{path: string, weighted_kb: number}>}} batch
 * @param {{templatePath?: string, batchId: string}} opts
 * @returns {string}
 */
function buildSecondaryPrompt(batch, opts) {
  return hydrateBatchPrompt(batch, opts, SECONDARY_TEMPLATE);
}

/**
 * Build the prompt string for the synthesis agent. The findings object
 * is serialized into a fenced JSON block and interpolated in place of
 * `{{FINDINGS_JSON}}`.
 *
 * @param {object} findings
 * @param {{templatePath?: string}} [opts]
 * @returns {string}
 */
function buildSynthesisPrompt(findings, opts) {
  const { templatePath = SYNTHESIS_TEMPLATE } = opts || {};
  if (findings === undefined || findings === null) {
    throw new Error("buildSynthesisPrompt: findings must be provided");
  }

  let serialized;
  try {
    serialized = JSON.stringify(findings, null, 2);
  } catch (err) {
    throw new Error(`Failed to serialize findings: ${sanitizeError(err)}`);
  }
  if (typeof serialized !== "string") {
    throw new Error("buildSynthesisPrompt: findings did not serialize to JSON");
  }

  const raw = readTemplate(templatePath);
  const rendered = raw.split("{{FINDINGS_JSON}}").join(serialized);

  assertFullyHydrated(rendered);
  return rendered;
}

module.exports = {
  buildPrimaryPrompt,
  buildSecondaryPrompt,
  buildSynthesisPrompt,
  PRIMARY_TEMPLATE,
  SECONDARY_TEMPLATE,
  SYNTHESIS_TEMPLATE,
};
