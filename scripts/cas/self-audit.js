"use strict";

/**
 * Content Analysis System — Self-Audit (JASON-OS port)
 *
 * Validates any handler's output directory against CONVENTIONS.md Section 13.
 * Run after any analysis completes to catch naming mismatches, missing artifacts,
 * and schema failures BEFORE presenting results.
 *
 * Usage: node scripts/cas/self-audit.js --slug=<slug>
 *
 * Exit codes:
 *   0 = all checks pass
 *   1 = one or more checks failed (details printed)
 *
 * @see .claude/skills/shared/CONVENTIONS.md (Section 13: Handler Output Contract)
 *
 * JASON-OS port adaptation (PORT_DECISIONS.md Batch 8 #12):
 *   - Dropped extraction-journal.jsonl + EXTRACTIONS.md checks (the
 *     extraction-journal system was cut in Batch 1 #5).
 *   - Dropped last_synthesized_at validation (/synthesize cut in Batch 1 #2).
 *   - Dropped tag-consistency check across analysis ↔ journal (no journal).
 *   - Kept artifact presence, schema validation, behavioral state-file
 *     check, citation/home-repo path checks. These survive cleanly.
 */

const fs = require("node:fs");
const path = require("node:path");
const {
  sanitizeError,
  validatePathInDir,
  refuseSymlinkWithParents,
} = require("../lib/security-helpers.js");
const { readUtf8Sync } = require("../lib/safe-fs.js");

const PROJECT_ROOT = path.resolve(__dirname, "../.."); // validatePathInDir: constant-path (no user input)
const ANALYSIS_DIR = path.join(PROJECT_ROOT, ".research", "analysis");
const STATE_DIR = path.join(PROJECT_ROOT, ".claude", "state");

// Strict slug pattern (QS-1): alphanumerics, dot, dash, underscore only.
// Rejects path separators, NUL bytes, traversal sequences, and shell metas.
const SLUG_RE = /^[A-Za-z0-9._-]+$/;

// JASON-OS port: SoNash had a separate `scripts/lib/safe-cas-io.js` module
// providing `safeReadText` / `safeReadJson` / `isValidArtifactFile`. Those
// helpers live inline here against `scripts/lib/safe-fs.js` (the JASON-OS
// canonical safe I/O module). Behavior preserved: parent-chain symlink
// refusal, regular-file enforcement, ENOENT propagation.
function safeReadText(filePath) {
  refuseSymlinkWithParents(filePath);
  // QS-4: enforce regular-file before read; readUtf8Sync would otherwise
  // happily slurp a FIFO/socket/device.
  const st = fs.lstatSync(filePath);
  if (!st.isFile()) {
    const err = new Error("Not a regular file");
    err.code = "ENOTFILE";
    throw err;
  }
  return readUtf8Sync(filePath);
}
function safeReadJson(filePath) {
  return JSON.parse(safeReadText(filePath));
}
function isValidArtifactFile(filePath) {
  try {
    refuseSymlinkWithParents(filePath);
    const st = fs.lstatSync(filePath);
    if (st.isSymbolicLink()) return false;
    if (!st.isFile()) return false;
    return st.size > 0;
  } catch {
    return false;
  }
}

// Step 10.5 extended checks: filename/ID patterns cited from Creator View
// that count as "specific citations" per AUDIT_SPEC check 5a. JASON-OS port:
// content-eval.jsonl removed (Batch 2 #10).
const CITATION_ARTIFACT_NAMES = [
  "deep-read.md",
  "coverage-audit.jsonl",
  "findings.jsonl",
  "value-map.json",
  "summary.md",
  "transcript.md",
];
const CITATION_FINDING_RE = /\bF-?\d+\b/; // F-001, F001, F-42
const CITATION_EVAL_ID_RE = /\b[K-P]-?\d+\b/; // K1, K-1 style IDs used in gist eval entries
// Path-file extensions treated as citation markers when mentioned in prose.
const CITATION_FILE_EXTS = new Set([
  "py",
  "md",
  "mdx",
  "js",
  "jsx",
  "ts",
  "tsx",
  "json",
  "jsonl",
  "yaml",
  "yml",
  "sh",
  "rs",
  "go",
  "rb",
  "php",
  "html",
  "css",
  "scss",
  "txt",
  "rst",
  "sql",
  "toml",
  "cfg",
  "ini",
]);

// CONVENTIONS Section 13.1: MUST artifacts
// analysis.json = all depths. value-map + creator-view = Standard/Deep only.
const MUST_ALL_DEPTHS = [{ file: "analysis.json", description: "Unified schema record" }];
const MUST_STANDARD_DEEP = [
  { file: "value-map.json", description: "Candidates array (Phase 6)" },
  { file: "creator-view.md", description: "Creator View prose (Phase 4)" },
];

// SHOULD artifacts — Standard/Deep only (warn if missing = phase skip)
// Per CONVENTIONS Section 13.2.
// JASON-OS port: content-eval.jsonl dropped (PORT_DECISIONS.md Batch 2 #10).
const SHOULD_ARTIFACTS = [
  { file: "findings.jsonl", description: "Findings (Phase 2/5)", phase: "2" },
  { file: "summary.md", description: "Summary (Phase 5)", phase: "5" },
  { file: "deep-read.md", description: "Deep Read (Phase 2b)", phase: "2b" },
  { file: "coverage-audit.jsonl", description: "Coverage Audit (Phase 6b)", phase: "6b" },
];

// WRONG artifact names (fail if present — naming violation)
const WRONG_NAMES = [
  { file: "SITE-ANALYSIS.md", correct: "creator-view.md", reason: "CONVENTIONS Section 13" },
];

function parseSlug(argv) {
  for (const arg of argv.slice(2)) {
    if (arg.startsWith("--slug=")) return arg.slice(7);
  }
  return null;
}

// Safe path join: validates containment within ANALYSIS_DIR before returning.
// Uses path.join rather than path.resolve so the propagation checker
// (validate-path pattern) recognizes the containment check as adjacent. The
// validatePathInDir call above already rejects any rel that escapes ANALYSIS_DIR.
function safePath(slugPart, filePart) {
  const rel = slugPart + path.sep + filePart;
  validatePathInDir(ANALYSIS_DIR, rel);
  return path.join(ANALYSIS_DIR, rel);
}

// Return the lstat of a regular file with parent-chain symlink protection, or
// null if the path does not exist, is a symlink (final or any parent), or is
// not a regular file. Never throws — suitable for size reporting in loops.
function safeFileStat(filePath) {
  try {
    refuseSymlinkWithParents(filePath);
    const st = fs.lstatSync(filePath);
    if (st.isSymbolicLink()) return null;
    if (!st.isFile()) return null;
    return st;
  } catch {
    return null;
  }
}

// --- Artifact checks (split from monolithic checkArtifacts for S-1) ---

function evaluateMustArtifact(ctx, file, description, results) {
  const filePath = safePath(ctx.slug, file);
  const stat = safeFileStat(filePath);
  if (!stat) {
    results.fail.push(`MUST artifact missing: ${file} (${description})`);
    return;
  }
  if (stat.size === 0) {
    results.fail.push(`MUST artifact empty: ${file} (${description})`);
    return;
  }
  results.pass.push(`${file} (${stat.size} bytes)`);
}

function evaluateShouldArtifact(ctx, entry, results, isStandardOrDeep) {
  const { file, description, phase } = entry;
  const filePath = safePath(ctx.slug, file);
  const stat = safeFileStat(filePath);
  if (stat && stat.size > 0) {
    results.pass.push(`${file} (${stat.size} bytes)`);
    return;
  }
  if (!isStandardOrDeep) return;
  const reason = stat
    ? `SHOULD artifact empty: ${file} (${description}) — Phase ${phase} may have been skipped`
    : `SHOULD artifact missing: ${file} (${description}) — Phase ${phase} skipped`;
  results.warn.push(reason);
}

function evaluateWrongName(ctx, entry, results) {
  const { file, correct, reason } = entry;
  if (safeFileStat(safePath(ctx.slug, file))) {
    results.fail.push(`Wrong artifact name: ${file} should be ${correct} (${reason})`);
  }
}

function checkArtifacts(ctx) {
  const results = { pass: [], fail: [], warn: [] };
  const isStandardOrDeep = ctx.depth === "standard" || ctx.depth === "deep";

  for (const entry of MUST_ALL_DEPTHS) {
    evaluateMustArtifact(ctx, entry.file, entry.description, results);
  }
  if (isStandardOrDeep) {
    for (const entry of MUST_STANDARD_DEEP) {
      evaluateMustArtifact(ctx, entry.file, entry.description, results);
    }
  }
  for (const entry of SHOULD_ARTIFACTS) {
    evaluateShouldArtifact(ctx, entry, results, isStandardOrDeep);
  }
  for (const entry of WRONG_NAMES) {
    evaluateWrongName(ctx, entry, results);
  }

  return results;
}

// --- Schema checks (split from monolithic checkSchema for S-2) ---

function loadAnalysisOrFail(dir, results) {
  const analysisPath = path.join(dir, "analysis.json");
  try {
    return safeReadJson(analysisPath);
  } catch (err) {
    if (err.code === "ENOENT") {
      results.fail.push("Cannot validate schema — analysis.json missing");
    } else {
      results.fail.push(`analysis.json parse error: ${sanitizeError(err)}`);
    }
    return null;
  }
}

function checkSchemaVersion(data, results) {
  if (data.schema_version) {
    results.pass.push(`schema_version: ${data.schema_version}`);
  } else {
    results.fail.push("analysis.json missing schema_version field");
  }
}

function runZodValidation(data, results) {
  try {
    const { validate } = require("../lib/analysis-schema.js");
    const result = validate(data, "analysis");
    if (result.success) {
      results.pass.push("Zod schema validation: PASS");
    } else {
      results.fail.push(`Zod schema validation: FAIL — ${result.error}`);
    }
  } catch (err) {
    results.fail.push(`Zod schema validation error: ${sanitizeError(err)}`);
  }
}

function checkCandidateCount(data, results) {
  if (data.depth !== "quick" && (!data.candidates || data.candidates.length === 0)) {
    results.fail.push("Standard/Deep analysis has 0 candidates — value-map likely empty too");
    return;
  }
  if (data.candidates) {
    results.pass.push(`${data.candidates.length} candidates in analysis.json`);
  }
}

function checkMediaSpecific(data, ctx, results) {
  if (data.source_type !== "media") return;
  if (data.transcript_source) {
    results.pass.push(`transcript_source: ${data.transcript_source}`);
  } else {
    results.fail.push("Media analysis missing transcript_source field (CONVENTIONS 13.3)");
  }
  const transcriptPath = safePath(ctx.slug, "transcript.md");
  const tStat = safeFileStat(transcriptPath);
  if (tStat && tStat.size > 0) {
    results.pass.push(`transcript.md (${tStat.size} bytes)`);
  } else {
    results.fail.push("Media analysis missing transcript.md (CONVENTIONS 13.3 MUST)");
  }
}

function checkSchema(ctx) {
  const results = { pass: [], fail: [] };
  const data = loadAnalysisOrFail(ctx.dir, results);
  if (!data) return results;
  checkSchemaVersion(data, results);
  runZodValidation(data, results);
  checkCandidateCount(data, results);
  checkMediaSpecific(data, ctx, results);
  return results;
}

// --- Behavioral checks ---

const HANDLER_MAP = {
  repo: "repo-analysis",
  website: "website-analysis",
  document: "document-analysis",
  media: "media-analysis",
};

function loadStateFile(handler, slug, results) {
  // QC-S1: validate the constructed state filename does not escape STATE_DIR.
  const stateRel = `${handler}.${slug}.state.json`;
  try {
    validatePathInDir(STATE_DIR, stateRel);
  } catch (err) {
    results.warn.push(`State file path rejected by containment check: ${sanitizeError(err)}`);
    return null;
  }
  const stateFile = path.join(STATE_DIR, stateRel);
  try {
    return safeReadJson(stateFile);
  } catch (err) {
    if (err.code === "ENOENT") {
      results.warn.push(
        "No state file — pipeline tail (tags, retro, routing) may have been skipped (CONVENTIONS 16)"
      );
    } else {
      results.warn.push(`State file exists but is malformed or unsafe: ${sanitizeError(err)}`);
    }
    return null;
  }
}

function checkBehavioral(ctx) {
  const results = { pass: [], fail: [], warn: [] };
  const isStandardOrDeep = ctx.depth === "standard" || ctx.depth === "deep";
  if (!isStandardOrDeep) return results;

  // Skip the state-file lookup entirely when source_type is unmapped — we'd
  // otherwise probe for `unknown.<slug>.state.json`, which can never exist
  // and produces a confusing "no state file" warning under a misleading
  // handler name.
  const handler = HANDLER_MAP[ctx.sourceType];
  if (!handler) {
    // Sanitize the unknown source_type before logging — a malformed
    // analysis.json could put CR/LF (or worse, terminal escape sequences)
    // into source_type and disrupt the audit's terminal output.
    const safeSourceType = String(ctx.sourceType).replace(/[\r\n\x1b]/g, " ");
    results.warn.push(
      `Unknown source_type '${safeSourceType}' — skipping state-file check`
    );
    return results;
  }
  const state = loadStateFile(handler, ctx.slug, results);
  if (!state) return results;

  results.pass.push(`State file exists (${handler}.${ctx.slug})`);
  // QC-2: do NOT echo process_feedback content — it can contain user
  // sentiment / private notes. Confirm presence + length only.
  if (state.process_feedback) {
    const len = String(state.process_feedback).length;
    results.pass.push(`Retro feedback captured (${len} chars)`);
  } else {
    results.warn.push(
      "State file exists but process_feedback is empty — retro may have been skipped (CONVENTIONS 16.2)"
    );
  }

  return results;
}

// ---------------------------------------------------------------------------
// Step 10.5 extended checks (folded into self-audit per T29 Session #277).
// JASON-OS port: extraction-journal-related checks (6a, 6b, 6c, 7b, 7c)
// dropped per PORT_DECISIONS.md Batch 8 #12 + Batch 1 #5. Surviving checks:
// 5a (Creator View specific citations), 5c (home-repo refs broken-link
// detection), 8 (re-analysis trends signal). Skipped: 5b (prose style —
// heuristics too noisy), 7a (research-index depth match).
// ---------------------------------------------------------------------------

function countCitations(creatorViewText) {
  if (!creatorViewText) return 0;
  let hits = 0;
  for (const name of CITATION_ARTIFACT_NAMES) {
    if (creatorViewText.includes(name)) hits++;
  }
  const findingMatches = creatorViewText.match(new RegExp(CITATION_FINDING_RE.source, "g"));
  if (findingMatches) hits += findingMatches.length;
  const evalMatches = creatorViewText.match(new RegExp(CITATION_EVAL_ID_RE.source, "g"));
  if (evalMatches) hits += evalMatches.length;
  // Count file-path tokens that look like specific artifact references.
  // Two patterns: backtick-wrapped paths AND bare file references with a
  // recognized extension (e.g., "benchmarks/overall/registry.py" in prose).
  const seen = new Set();
  const addIfFilepath = (token) => {
    if (!token) return;
    if (token.includes(" ")) return;
    if (token.startsWith("http://") || token.startsWith("https://")) return;
    if (token.includes("<") || token.includes(">")) return; // skip <placeholders>
    if (token.includes("/") || /\.[a-zA-Z0-9]{2,5}$/.test(token)) {
      if (!seen.has(token)) {
        seen.add(token);
        hits++;
      }
    }
  };
  const backtickRe = /`([^`\n]{3,120})`/g;
  collectBacktickTokens(backtickRe, creatorViewText, addIfFilepath);
  // Bare file refs: word boundaries around path-like tokens. Extension filter
  // is applied programmatically to keep the regex simple (no large alternation).
  const tokenRe = /(?<![A-Za-z0-9_/.-])([A-Za-z0-9_.-][A-Za-z0-9_./-]{2,119})(?![A-Za-z0-9_/.-])/g;
  collectExtensionTokens(tokenRe, creatorViewText, addIfFilepath);
  return hits;
}

function collectBacktickTokens(re, text, visit) {
  for (const match of text.matchAll(re)) visit(match[1]);
}

function collectExtensionTokens(re, text, visit) {
  for (const match of text.matchAll(re)) {
    const token = match[1];
    const dot = token.lastIndexOf(".");
    if (dot < 1 || dot === token.length - 1) continue;
    if (CITATION_FILE_EXTS.has(token.slice(dot + 1).toLowerCase())) visit(token);
  }
}

function check5aSpecificCitations(dir, results) {
  const creatorViewPath = path.join(dir, "creator-view.md");
  let text;
  try {
    text = safeReadText(creatorViewPath);
  } catch {
    return; // creator-view missing — already covered by MUST check
  }
  const count = countCitations(text);
  if (count >= 2) {
    results.pass.push(`Creator View cites >=2 specific items (${count} refs found)`);
  } else {
    results.fail.push(
      `Creator View has only ${count} specific citation(s) to deep-read/findings/value-map — Step 10.5 check 5a requires >=2`
    );
  }
}

// Prefixes/filenames that unambiguously identify SoNash home-repo paths.
// Source-repo paths from analyzed repos (e.g., docling's docs/concepts/*)
// are intentionally excluded to avoid false positives.
const HOME_REPO_PREFIXES = [
  ".claude/",
  ".research/",
  "scripts/cas/",
  "scripts/lib/",
  "scripts/reviews/",
  "scripts/debt/",
  "scripts/docs/",
  "docs/agent_docs/",
  "functions/src/",
  "functions/lib/",
];
const HOME_REPO_FILES = new Set([
  "CLAUDE.md",
  "ROADMAP.md",
  "AI_WORKFLOW.md",
  "SESSION_CONTEXT.md",
  "firebase.json",
  "firestore.rules",
  "package.json",
  "tsconfig.json",
]);

function isHomeRepoRef(token) {
  if (HOME_REPO_FILES.has(token)) return true;
  for (const prefix of HOME_REPO_PREFIXES) {
    if (token.startsWith(prefix)) return true;
  }
  return false;
}

function isSkippableBacktickToken(token) {
  if (token.includes(" ")) return true;
  if (token.startsWith("http://") || token.startsWith("https://")) return true;
  if (token.includes("<") || token.includes(">")) return true; // skip <slug>, <N> placeholders
  if (token.includes("*")) return true; // skip glob patterns like docs/agent_docs/*
  return false;
}

function collectHomeRepoCandidates(text) {
  const candidates = new Set();
  const re = /`([^`\n]{3,120})`/g;
  for (const match of text.matchAll(re)) {
    const token = match[1];
    if (isSkippableBacktickToken(token)) continue;
    if (isHomeRepoRef(token)) candidates.add(token);
  }
  return candidates;
}

// QS-2: presence check refuses symlinked-into-tree references. lstatSync
// throws ENOENT for missing entries; refuseSymlinkWithParents short-circuits
// on any symlink in the parent chain. Either failure mode marks the
// reference as broken — symlink misuse is treated as broken, not silently
// followed.
function pathExistsRefusingSymlinks(abs) {
  try {
    refuseSymlinkWithParents(abs);
    fs.lstatSync(abs);
    return true;
  } catch {
    return false;
  }
}

function findBrokenHomeRefs(candidatePaths) {
  const broken = [];
  for (const rel of candidatePaths) {
    const clean = rel
      .replace(/[.,:;]$/, "")
      .split("#")[0]
      .split("?")[0];
    try {
      validatePathInDir(PROJECT_ROOT, clean);
    } catch {
      continue;
    }
    const abs = path.join(PROJECT_ROOT, clean);
    if (!pathExistsRefusingSymlinks(abs)) broken.push(clean);
  }
  return broken;
}

function check5cHomeRepoRefs(dir, results) {
  const creatorViewPath = path.join(dir, "creator-view.md");
  let text;
  try {
    text = safeReadText(creatorViewPath);
  } catch {
    return;
  }
  const candidatePaths = collectHomeRepoCandidates(text);
  if (candidatePaths.size === 0) {
    // No home-repo refs is acceptable — most source-focused Creator Views
    // cite source-repo artifacts, not SoNash paths.
    return;
  }
  const broken = findBrokenHomeRefs(candidatePaths);
  if (broken.length === 0) {
    results.pass.push(
      `Creator View home-repo refs verified (${candidatePaths.size} checked) — Step 10.5 check 5c`
    );
    return;
  }
  // WARN rather than FAIL: the regex can't distinguish broken citations
  // ("per CONVENTIONS.md line 42") from proposals ("create CONVENTIONS.md").
  // User inspection resolves intent.
  const preview = broken.slice(0, 3).join(", ");
  const moreSuffix = broken.length > 3 ? ` +${broken.length - 3} more` : "";
  results.warn.push(
    `Creator View cites ${broken.length} home-repo path(s) that do not currently exist: ${preview}${moreSuffix} — may be extraction proposals OR broken refs (Step 10.5 check 5c)`
  );
}

function check8ReanalysisSignal(dir, results) {
  const trendsPath = path.join(dir, "trends.jsonl");
  const stat = safeFileStat(trendsPath);
  if (stat && stat.size > 0) {
    results.pass.push(
      `trends.jsonl present (${stat.size} bytes) — prior re-analysis history (Step 10.5 check 8)`
    );
  }
  // Absence is not a fail — most sources have no trends.jsonl yet.
}

function checkStep10Extended(ctx) {
  const results = { pass: [], fail: [], warn: [] };
  const isStandardOrDeep = ctx.depth === "standard" || ctx.depth === "deep";
  if (!isStandardOrDeep) return results;

  check5aSpecificCitations(ctx.dir, results);
  check5cHomeRepoRefs(ctx.dir, results);
  check8ReanalysisSignal(ctx.dir, results);

  return results;
}

// --- main() helpers (split for S-3) ---

function validateSlug(slug) {
  if (!slug) {
    console.error("Usage: node scripts/cas/self-audit.js --slug=<slug>");
    process.exit(1);
  }
  // QS-1: reject slugs containing path separators, dot-dot sequences, NUL,
  // or any other character outside the explicit safelist BEFORE feeding
  // into validatePathInDir. validatePathInDir checks containment but not
  // the shape of the input.
  if (!SLUG_RE.test(slug) || slug === "." || slug === "..") {
    console.error("Invalid slug: must match [A-Za-z0-9._-]+ and not be '.' or '..'");
    process.exit(1);
  }
  validatePathInDir(ANALYSIS_DIR, slug);
}

function resolveAnalysisDir(slug) {
  const dir = path.join(ANALYSIS_DIR, slug);
  // QS-3: race-safe directory check. existsSync follows symlinks (TOCTOU
  // window) and tells us nothing about file type. lstat + isDirectory in
  // one call avoids the race and rejects symlinked dirs.
  let dirStat;
  try {
    refuseSymlinkWithParents(dir);
    dirStat = fs.lstatSync(dir);
  } catch {
    console.error(`Output directory not found for slug: ${slug}`);
    process.exit(1);
  }
  if (!dirStat.isDirectory()) {
    console.error(`Output path is not a directory for slug: ${slug}`);
    process.exit(1);
  }
  return dir;
}

// Q-1: read analysis metadata once; surface depth + identity to callers via
// ctx so individual check functions don't re-open analysis.json. ENOENT
// degrades to defaults silently (Quick Scan path); other errors are
// reported but the audit continues so downstream checks still run.
function readAnalysisMetadata(dir, slug) {
  const meta = { source: slug, sourceType: "repo", depth: "quick" };
  const analysisPath = path.join(dir, "analysis.json");
  try {
    const data = safeReadJson(analysisPath);
    if (data.source) meta.source = data.source;
    if (data.source_type) meta.sourceType = data.source_type;
    if (data.depth) meta.depth = data.depth;
  } catch (err) {
    if (err.code !== "ENOENT") {
      // Surface non-ENOENT errors instead of silently swallowing them.
      console.error(`Warning: could not read analysis.json: ${sanitizeError(err)}`);
    }
  }
  return meta;
}

function aggregateResults(sections) {
  const aggregate = { pass: [], fail: [], warn: [] };
  for (const section of sections) {
    if (section.pass) aggregate.pass.push(...section.pass);
    if (section.fail) aggregate.fail.push(...section.fail);
    if (section.warn) aggregate.warn.push(...section.warn);
  }
  return aggregate;
}

function printAggregate(aggregate) {
  if (aggregate.pass.length > 0) {
    console.log(`\nPASS (${aggregate.pass.length}):`);
    for (const p of aggregate.pass) console.log(`  + ${p}`);
  }
  if (aggregate.warn.length > 0) {
    console.log(`\nWARN (${aggregate.warn.length}):`);
    for (const w of aggregate.warn) console.log(`  ~ ${w}`);
  }
  if (aggregate.fail.length > 0) {
    console.log(`\nFAIL (${aggregate.fail.length}):`);
    for (const f of aggregate.fail) console.log(`  x ${f}`);
  }
  console.log(
    `\n---\nResult: ${aggregate.fail.length === 0 ? "PASS" : "FAIL"} (${aggregate.pass.length} pass, ${aggregate.warn.length} warn, ${aggregate.fail.length} fail)`
  );
}

function main() {
  const slug = parseSlug(process.argv);
  validateSlug(slug);
  const dir = resolveAnalysisDir(slug);
  const meta = readAnalysisMetadata(dir, slug);
  const ctx = { dir, slug, sourceType: meta.sourceType, depth: meta.depth };

  // QC-1: identify the audit by slug, not by absolute path. Absolute paths
  // can leak username / install layout into shared logs.
  console.log(`CAS Self-Audit: ${slug}`);
  console.log(`Source: ${meta.source}`);
  console.log("---");

  const sections = [
    checkArtifacts(ctx),
    checkSchema(ctx),
    checkBehavioral(ctx),
    checkStep10Extended(ctx),
  ];
  const aggregate = aggregateResults(sections);
  printAggregate(aggregate);
  process.exit(aggregate.fail.length > 0 ? 1 : 0);
}

try {
  main();
} catch (err) {
  console.error(`Fatal: ${sanitizeError(err)}`);
  process.exit(1);
}
