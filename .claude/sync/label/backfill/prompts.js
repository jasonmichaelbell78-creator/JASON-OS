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

const { validatePathInDir } = require(
  path.join(__dirname, "..", "..", "..", "..", "scripts", "lib", "security-helpers.js")
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

// Schema-ref-by-version (D6.8) — every dispatched prompt references schema
// v1.3 shapes explicitly so re-runs do not inherit a stale in-code shape.
// Exported for downstream consumers that want to stamp records with the
// same version used at dispatch time.
const SCHEMA_VERSION = "1.3";

// Max depth for {{INCLUDE:...}} directives (D5.2). 3 levels is generous;
// current design is 1 (template → shared partial). Deeper implies a cycle
// or accidental recursion.
const MAX_INCLUDE_DEPTH = 3;

// Any {{TOKEN}} we have not substituted is a bug - error out instead of
// shipping a half-rendered prompt to the agent. Pattern accepts A-Z0-9_
// plus colon+slug to cover {{INCLUDE:filename}} so a stray/typoed include
// directive is also flagged.
const PLACEHOLDER_PATTERN = /\{\{[A-Z0-9_]+(?::[A-Za-z0-9._-]+)?\}\}/;

/**
 * Read a template file and recursively substitute any
 * `{{INCLUDE:filename}}` directives with the contents of a sibling file
 * (D5.2 shared-partial contract — agent-instructions-shared.md).
 *
 * INCLUDE filenames are restricted to a basename with no path separators
 * or parent-traversal — partials live beside the template, never in a
 * subdirectory or outside the backfill/ dir.
 *
 * @param {string} templatePath - Absolute template path
 * @param {number} [depth=0] - Internal recursion guard
 * @returns {string}
 */
function readTemplate(templatePath, depth = 0) {
  if (depth > MAX_INCLUDE_DEPTH) {
    throw new Error(`Template include depth exceeded (max ${MAX_INCLUDE_DEPTH})`);
  }
  let text;
  try {
    if (typeof readTextWithSizeGuard === "function") {
      text = readTextWithSizeGuard(templatePath);
    } else {
      text = fs.readFileSync(templatePath, "utf8");
    }
  } catch (err) {
    throw new Error(`Failed to read prompt template: ${sanitizeError(err)}`);
  }
  // Process {{INCLUDE:filename}} directives (D5.2).
  text = text.replace(/\{\{INCLUDE:([^}]+)\}\}/g, (_, fname) => {
    const name = String(fname).trim();
    if (name.length === 0 || /[\/\\]/.test(name) || name.includes("..")) {
      throw new Error(
        `INCLUDE directive rejected (path traversal or empty): ${JSON.stringify(name)}`
      );
    }
    const includePath = path.join(path.dirname(templatePath), name);
    return readTemplate(includePath, depth + 1);
  });
  return text;
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

/**
 * Repo root used for filesystem guards. Points at JASON-OS root by
 * resolving up from this file (`.claude/sync/label/backfill/`).
 */
const DEFAULT_REPO_ROOT = path.join(__dirname, "..", "..", "..", "..");

/**
 * Normalize a guard-collected `needs_review` list — dedupe, preserve
 * insertion order, and tolerate absent/non-array input. Kept local
 * so applyRuntimeGuards is self-contained.
 *
 * @param {string[]} prior
 * @param {string[]} add
 * @returns {string[]}
 */
function mergeNeedsReviewList(prior, add) {
  const out = Array.isArray(prior) ? [...prior] : [];
  for (const field of add) {
    if (typeof field === "string" && field.length > 0 && !out.includes(field)) {
      out.push(field);
    }
  }
  return out;
}

/**
 * Apply the D6.8 runtime guards to a single agent-emitted record BEFORE
 * it reaches verify.js / cross-check.js. Guards implement the 5 S10
 * mid-run dispatch fixes as permanent logic:
 *
 *   1. Hard-dep exists-check (path-shaped deps only) — downgrade to soft
 *      + append to `notes` if referenced file is missing on disk.
 *   2. `content_hash` omit-if-unknown (D2.4) — delete the field if the
 *      agent emitted null/undefined. Never emit `null`.
 *   3. Legacy `portability: "generated"` rewrite (D3.2) — convert to
 *      `not-portable` and add `portability` to needs_review for human
 *      disambiguation.
 *   4. Git-hook event disambiguation (D3.3) — if `type: git-hook` carries
 *      `event` instead of `git_hook_event`, migrate the value.
 *   5. Schema-version stamp — ensure `schema_version: "1.3"` lands on
 *      every record the dispatcher forwards (D6.8 schema-ref-by-version).
 *
 * Returns a NEW record; does not mutate the input. Guards that do not
 * trigger leave the field untouched.
 *
 * @param {object} record - Agent-emitted record (post-JSON.parse)
 * @param {object} [opts]
 * @param {string} [opts.repoRoot=DEFAULT_REPO_ROOT]
 * @returns {object}
 */
function applyRuntimeGuards(record, opts = {}) {
  if (!record || typeof record !== "object") return record;
  const repoRoot = opts.repoRoot || DEFAULT_REPO_ROOT;

  const out = { ...record };
  const guardNotes = [];
  let needsReviewAdditions = [];

  // Guard 1: hard-dep exists-check. Only apply to path-shaped names
  // (contain a slash or start with a dot) — registry-name references
  // (e.g. "convergence-loop") would be resolved at a higher layer.
  //
  // Agent-emitted `dep.name` is untrusted input. Confine it to repoRoot
  // via validatePathInDir before probing the filesystem — absolute paths
  // or `..` traversal fail confinement and are treated as non-existent,
  // which triggers the existing hard→soft downgrade. Matches the pattern
  // used in verify.js and derive.toRepoRelative for the same reason.
  if (Array.isArray(out.dependencies)) {
    out.dependencies = out.dependencies.map((dep) => {
      if (
        !dep ||
        typeof dep !== "object" ||
        dep.hardness !== "hard" ||
        typeof dep.name !== "string"
      ) {
        return dep;
      }
      // "Path-shaped" = anything the confinement guard should look at.
      // Forward slash, leading dot, backslash, or an absolute form (POSIX
      // root or Windows drive letter) all qualify. Registry names like
      // "convergence-loop" fall through to the higher-layer resolver.
      const isPathShaped =
        dep.name.includes("/") ||
        dep.name.includes("\\") ||
        dep.name.startsWith(".") ||
        path.isAbsolute(dep.name);
      if (!isPathShaped) return dep;
      let exists = false;
      let confined = false;
      try {
        validatePathInDir(repoRoot, dep.name);
        confined = true;
        const abs = path.resolve(repoRoot, dep.name);
        exists = fs.existsSync(abs);
      } catch {
        exists = false;
      }
      if (!exists) {
        const reason = confined
          ? `not found at ${dep.name}`
          : "out-of-repo or invalid path";
        guardNotes.push(`dep ${dep.name} ${reason}; downgraded hard→soft on dispatch`);
        return { ...dep, hardness: "soft" };
      }
      return dep;
    });
  }

  // Guard 2: content_hash omit-if-unknown (D2.4).
  if ("content_hash" in out && (out.content_hash === null || out.content_hash === undefined)) {
    delete out.content_hash;
  }

  // Guard 3: legacy portability:generated → not-portable (D3.2).
  // The `enum_portability` schema never included `generated`; if the
  // agent-runner emits it, rewrite and flag for human review.
  if (out.portability === "generated") {
    out.portability = "not-portable";
    guardNotes.push(
      "legacy portability:generated rewritten to not-portable (D3.2); needs_review"
    );
    needsReviewAdditions.push("portability");
  }

  // Guard 4: git-hook event disambiguation (D3.3).
  // Legacy agents may have emitted `event` for `type: git-hook`; v1.3
  // uses `git_hook_event` for that namespace.
  if (
    out.type === "git-hook" &&
    typeof out.event === "string" &&
    out.event.length > 0 &&
    !out.git_hook_event
  ) {
    out.git_hook_event = out.event;
    delete out.event;
    guardNotes.push(
      "legacy `event` field rewritten to `git_hook_event` on type:git-hook (D3.3)"
    );
  }

  // Guard 5: schema-version stamp (D6.8 schema-ref-by-version).
  // Always stamp the current SCHEMA_VERSION on dispatch output unless the
  // agent explicitly set an older compatible value (additive upgrade path
  // per D3.7). Stamping "1.3" is the dispatcher's contract.
  out.schema_version = SCHEMA_VERSION;

  // Merge guard notes into the record's `notes` field.
  if (guardNotes.length > 0) {
    const base = typeof out.notes === "string" ? out.notes : "";
    const stamped = `[runtime-guard] ${guardNotes.join("; ")}`;
    out.notes = base.length > 0 ? `${base}\n${stamped}` : stamped;
  }

  // Merge needs_review additions. Guard 3 forces a portability review.
  if (needsReviewAdditions.length > 0) {
    out.needs_review = mergeNeedsReviewList(out.needs_review, needsReviewAdditions);
  }

  return out;
}

module.exports = {
  buildPrimaryPrompt,
  buildSecondaryPrompt,
  buildSynthesisPrompt,
  applyRuntimeGuards,
  SCHEMA_VERSION,
  PRIMARY_TEMPLATE,
  SECONDARY_TEMPLATE,
  SYNTHESIS_TEMPLATE,
};
