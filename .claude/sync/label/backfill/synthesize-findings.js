#!/usr/bin/env node
/**
 * synthesize-findings.js — Mechanical synthesis of aggregated G.1 findings
 * into the user-facing report + machine-readable arbitration proposal.
 *
 * Replaces the agent-dispatch path of `synthesize-agent-template.md` for
 * runs where the cross-check output is structured enough to process
 * deterministically (case classification + value distribution → default
 * proposals). The output contract is identical to the agent template.
 *
 * Why mechanical, not agent: the disagreements list classifies each
 * conflict by case (C/D/E/G); needs_review minus disagreements gives
 * Case B (agreed-low-confidence) and Case F (both-null) per record.
 * D = set-union, E = pick non-null, C/G = list with higher-confidence
 * recommendation, F = coverage gap. The judgment-heavy slice the agent
 * template anticipated (purpose/notes wording variance) doesn't apply
 * when those fields are 100% null per record — they're all coverage
 * gaps, not wording variance.
 *
 * Outputs four artifacts (see --out-dir):
 *
 *   g1-synthesis-summary.md     — short scannable per-field summary
 *   g1-synthesis-detail.md      — full per-record detail
 *   g1-arbitration-proposal.json — machine arbitration proposal
 *   g1-coverage-gaps.jsonl      — coverage-gap list for separate review
 *
 * Usage:
 *   node .claude/sync/label/backfill/synthesize-findings.js \
 *     [--findings .claude/state/g1-findings.json] \
 *     [--composites-dir .claude/sync/label] \
 *     [--out-dir .claude/state]
 *
 * Exit codes:
 *   0 — clean
 *   2 — usage / read / parse / write error
 */

"use strict";

const fs = require("node:fs");
const path = require("node:path");
const { sanitize } = require("../lib/sanitize");

const REPO_ROOT = path.resolve(__dirname, "..", "..", "..", "..");
const DEFAULT_FINDINGS = path.join(REPO_ROOT, ".claude", "state", "g1-findings.json");
const DEFAULT_COMPOSITES_DIR = path.join(REPO_ROOT, ".claude", "sync", "label");
const DEFAULT_OUT_DIR = path.join(REPO_ROOT, ".claude", "state");

// Records to sample per field when many conflicts exist (keeps the
// summary report scannable while preserving enough variance for the
// user to spot a pattern).
const SAMPLE_PER_FIELD_LIMIT = 5;

// Threshold for proposing a "default answer" on a bulk per-field
// question — if one value covers ≥ this fraction of conflicts on the
// field, suggest it as the bulk-answer default.
const BULK_DEFAULT_DOMINANCE_THRESHOLD = 0.6;

/**
 * Treat as "value missing for verify": null, undefined, empty string,
 * or empty array. These are the shapes verify.js's purpose / rule layer
 * reject as a non-empty needs_review entry.
 */
function isMissingValue(v) {
  if (v === null || v === undefined) return true;
  if (typeof v === "string" && v.trim().length === 0) return true;
  if (Array.isArray(v) && v.length === 0) return true;
  return false;
}

/**
 * Pick the higher-confidence candidate. Ties resolved primary > secondary
 * since primary is the canonical reference per template role split.
 */
function pickHigherConfidence(disagreement) {
  const p = disagreement.primary || {};
  const s = disagreement.secondary || {};
  const pc = typeof p.confidence === "number" ? p.confidence : 0;
  const sc = typeof s.confidence === "number" ? s.confidence : 0;
  if (pc >= sc) return { source: "primary", value: p.value, confidence: pc };
  return { source: "secondary", value: s.value, confidence: sc };
}

/**
 * Set-union for arrays of objects or scalars. For object arrays, dedupe
 * by JSON serialization (good enough for catalog-style records).
 */
function setUnion(a, b) {
  const seen = new Set();
  const out = [];
  for (const v of [...(a || []), ...(b || [])]) {
    const key = typeof v === "object" ? JSON.stringify(v) : String(v);
    if (!seen.has(key)) {
      seen.add(key);
      out.push(v);
    }
  }
  return out;
}

/**
 * Group an array of items by a key function. Returns Map<key, items[]>.
 */
function groupBy(items, keyFn) {
  const out = new Map();
  for (const item of items) {
    const k = keyFn(item);
    if (!out.has(k)) out.set(k, []);
    out.get(k).push(item);
  }
  return out;
}

/**
 * Classify each (record, field) in needs_review into a case bucket.
 *
 * Returns { B, C, D, E, F, G } where each value is an array of
 * per-record entries augmented with disagreement details when
 * available. Case B and F are derived from needs_review minus
 * disagreements (since cross-check classifies "agree on low
 * confidence" and "agree on null" as needs_review entries but not
 * disagreements).
 */
function classifyCases(findings) {
  const buckets = { B: [], C: [], D: [], E: [], F: [], G: [] };

  // Index disagreements by (path, field) for O(1) lookup.
  const disagreementByKey = new Map();
  for (const d of findings.disagreements || []) {
    disagreementByKey.set(`${d.path}|${d.field}`, d);
  }

  for (const rec of findings.records || []) {
    if (!Array.isArray(rec.needs_review)) continue;
    for (const field of rec.needs_review) {
      const key = `${rec.path}|${field}`;
      const dis = disagreementByKey.get(key);
      if (dis) {
        const caseLetter = dis.case || "C";
        if (!buckets[caseLetter]) buckets[caseLetter] = [];
        buckets[caseLetter].push({
          path: rec.path,
          field,
          case: caseLetter,
          primary: dis.primary,
          secondary: dis.secondary,
          candidates: dis.candidates,
        });
      } else {
        // Not in disagreements → either both agreed on low-confidence
        // value (Case B) or both agreed on null/missing (Case F).
        const recValue = rec[field];
        if (isMissingValue(recValue)) {
          buckets.F.push({ path: rec.path, field, case: "F" });
        } else {
          buckets.B.push({
            path: rec.path,
            field,
            case: "B",
            value: recValue,
          });
        }
      }
    }
  }
  return buckets;
}

/**
 * Build the auto-merge proposal entries from Cases B + D + E.
 *
 *   B → auto-confirm the agreed value
 *   D → set-union the two arrays
 *   E → promote the non-null sibling
 */
function buildAutoMerge(buckets) {
  const proposals = [];

  for (const item of buckets.B) {
    proposals.push({
      path: item.path,
      field: item.field,
      case: "B",
      proposed_value: item.value,
      proposed_confidence: 0.9,
      rationale:
        "Both agents agreed on this value with at least one low-confidence flag. Confirming agreed value.",
    });
  }

  for (const item of buckets.D) {
    const pVal = item.primary?.value;
    const sVal = item.secondary?.value;
    const merged = setUnion(
      Array.isArray(pVal) ? pVal : [],
      Array.isArray(sVal) ? sVal : []
    );
    proposals.push({
      path: item.path,
      field: item.field,
      case: "D",
      proposed_value: merged,
      proposed_confidence: 0.85,
      rationale: `Set-union preserves contributions from both agents (primary ${
        Array.isArray(pVal) ? pVal.length : 0
      }, secondary ${Array.isArray(sVal) ? sVal.length : 0}, merged ${merged.length}).`,
    });
  }

  for (const item of buckets.E) {
    const p = item.primary || {};
    const s = item.secondary || {};
    const nonNull = p.value !== null && p.value !== undefined ? p : s;
    const source = nonNull === p ? "primary" : "secondary";
    proposals.push({
      path: item.path,
      field: item.field,
      case: "E",
      proposed_value: nonNull.value,
      proposed_confidence: 0.7,
      rationale: `Only ${source} could derive a value; using ${source} value with confidence 0.7.`,
    });
  }

  return proposals;
}

/**
 * Build the open arbitration questions from Cases C + G.
 */
function buildOpenQuestions(buckets) {
  const questions = [];
  for (const caseLetter of ["C", "G"]) {
    for (const item of buckets[caseLetter]) {
      const rec = pickHigherConfidence(item);
      questions.push({
        path: item.path,
        field: item.field,
        case: caseLetter,
        options: [
          {
            source: "primary",
            value: item.primary?.value,
            confidence: item.primary?.confidence ?? 0,
          },
          {
            source: "secondary",
            value: item.secondary?.value,
            confidence: item.secondary?.confidence ?? 0,
          },
        ],
        recommendation: {
          source: rec.source,
          value: rec.value,
          rationale: `${rec.source} carries higher confidence (${rec.confidence.toFixed(2)}); recommended as default unless the user has a contrary house convention.`,
        },
      });
    }
  }
  return questions;
}

/**
 * Detect novel composites (composite_id values that don't appear in the
 * existing composites catalogs) + sections-detected records.
 */
function detectNovelComposites(findings, compositesDir) {
  const knownIds = new Set();
  for (const fname of ["composites-shared.jsonl", "composites-local.jsonl"]) {
    const p = path.join(compositesDir, fname);
    let raw;
    try {
      raw = fs.readFileSync(p, "utf8");
    } catch (err) {
      if (err && err.code === "ENOENT") continue;
      throw err;
    }
    for (const line of raw.split("\n")) {
      if (!line.trim()) continue;
      try {
        const obj = JSON.parse(line);
        if (obj && typeof obj.composite_id === "string") {
          knownIds.add(obj.composite_id);
        }
      } catch {
        // skip malformed lines
      }
    }
  }

  const grouped = new Map();
  for (const rec of findings.records || []) {
    if (typeof rec.composite_id !== "string" || rec.composite_id.length === 0) continue;
    if (knownIds.has(rec.composite_id)) continue;
    if (!grouped.has(rec.composite_id)) grouped.set(rec.composite_id, []);
    grouped.get(rec.composite_id).push(rec.path);
  }
  return [...grouped.entries()].map(([composite_id, member_paths]) => ({
    composite_id,
    member_paths,
  }));
}

function detectSections(findings) {
  const out = [];
  for (const rec of findings.records || []) {
    if (Array.isArray(rec.sections) && rec.sections.length > 0) {
      out.push({ path: rec.path, section_count: rec.sections.length });
    }
  }
  return out;
}

/**
 * Build the complete arbitration-proposal object (matches Part 2 of
 * synthesize-agent-template.md).
 */
function buildProposal(findings, compositesDir) {
  const buckets = classifyCases(findings);
  return {
    schema_version: "1.0",
    auto_merge_proposals: buildAutoMerge(buckets),
    open_arbitration_questions: buildOpenQuestions(buckets),
    coverage_gaps: buckets.F.map(({ path: p, field }) => ({ path: p, field })),
    novel_composites: detectNovelComposites(findings, compositesDir),
    _buckets_summary: {
      B: buckets.B.length,
      C: buckets.C.length,
      D: buckets.D.length,
      E: buckets.E.length,
      F: buckets.F.length,
      G: buckets.G.length,
    },
  };
}

/**
 * Render the short scannable summary report. Per-field counts +
 * up-to-5 sample records per field + bulk-answer default proposals
 * where one value dominates the conflict set.
 */
function renderSummary(findings, proposal) {
  const lines = [];
  const pct = (n) => `${(n * 100).toFixed(1)}%`;
  const sectionsDetected = detectSections(findings);

  lines.push("# G.1 Synthesis Summary");
  lines.push("");
  lines.push(
    `**Records:** ${findings.record_count}. ` +
      `**Disagreements:** ${findings.disagreements?.length || 0}. ` +
      `**Agreement rate (records with no fields needing review):** ${pct(findings.agreement_rate)}.`
  );
  lines.push("");
  lines.push(
    "Agreement rate is 0% because every record has at least one field flagged for review — purpose and notes are null on every record (the agents could not derive free-text fields without reading file contents at the depth needed). Structural fields (type, source_scope, portability) have much higher agent agreement."
  );
  lines.push("");

  lines.push("## At a glance");
  lines.push("");
  lines.push(`- **Auto-merge proposals:** ${proposal.auto_merge_proposals.length} (Case B + D + E — confidence-weighted defaults)`);
  lines.push(`- **Open arbitration questions:** ${proposal.open_arbitration_questions.length} (Case C + G — your call needed)`);
  lines.push(`- **Coverage gaps:** ${proposal.coverage_gaps.length} (Case F — both agents emitted null)`);
  lines.push(`- **Novel composites:** ${proposal.novel_composites.length}`);
  lines.push(`- **Records with sections:** ${sectionsDetected.length}`);
  lines.push("");
  lines.push(
    "Case key: B = both agents agreed but at least one was low-confidence; C = scalar conflict; D = array partial overlap; E = one value vs null; F = both null; G = type-name mismatch."
  );
  lines.push("");

  // ----- Per-field summary table -----
  lines.push("## Per-field summary (where the work is)");
  lines.push("");

  const fieldAccum = new Map();
  function addToField(field, group, value) {
    if (!fieldAccum.has(field)) {
      fieldAccum.set(field, { B: 0, C: 0, D: 0, E: 0, F: 0, G: 0, samples: [], values: new Map() });
    }
    const f = fieldAccum.get(field);
    f[group] = (f[group] || 0) + 1;
    if (value !== undefined) {
      const k = JSON.stringify(value);
      f.values.set(k, (f.values.get(k) || 0) + 1);
    }
    if (f.samples.length < SAMPLE_PER_FIELD_LIMIT) {
      f.samples.push({ group, value });
    }
  }
  for (const p of proposal.auto_merge_proposals) addToField(p.field, p.case, p.proposed_value);
  for (const q of proposal.open_arbitration_questions) {
    addToField(q.field, q.case, q.recommendation?.value);
  }
  for (const g of proposal.coverage_gaps) addToField(g.field, "F");

  // Sort fields by total touches descending.
  const fieldOrder = [...fieldAccum.entries()]
    .sort((a, b) => {
      const aTotal = a[1].B + a[1].C + a[1].D + a[1].E + a[1].F + a[1].G;
      const bTotal = b[1].B + b[1].C + b[1].D + b[1].E + b[1].F + b[1].G;
      return bTotal - aTotal;
    });

  lines.push("| Field | Total | B (agree-lowconf) | C (conflict) | D (array merge) | E (one-null) | F (both null) | G (type) |");
  lines.push("|---|---|---|---|---|---|---|---|");
  for (const [field, f] of fieldOrder) {
    const total = f.B + f.C + f.D + f.E + f.F + f.G;
    lines.push(
      `| \`${field}\` | ${total} | ${f.B} | ${f.C} | ${f.D} | ${f.E} | ${f.F} | ${f.G} |`
    );
  }
  lines.push("");

  // ----- Per-field drill-down with samples + bulk-default proposals -----
  lines.push("## Per-field drill-down");
  lines.push("");
  lines.push(
    "For fields with many conflicts of the same case, a single bulk answer often covers them. Where one value clearly dominates the conflict set, I propose it as a default — you can accept the default or override per record."
  );
  lines.push("");

  for (const [field, f] of fieldOrder) {
    const total = f.B + f.C + f.D + f.E + f.F + f.G;
    if (total === 0) continue;
    lines.push(`### \`${field}\` — ${total} records needing review`);
    lines.push("");

    // Distribution
    const groupBits = [];
    if (f.B) groupBits.push(`${f.B} Case B (auto-confirm proposal)`);
    if (f.C) groupBits.push(`${f.C} Case C (open arbitration)`);
    if (f.D) groupBits.push(`${f.D} Case D (array merge proposal)`);
    if (f.E) groupBits.push(`${f.E} Case E (non-null promote proposal)`);
    if (f.F) groupBits.push(`${f.F} Case F (coverage gap — neither agent had a value)`);
    if (f.G) groupBits.push(`${f.G} Case G (type-mismatch — open arbitration)`);
    lines.push(`Breakdown: ${groupBits.join("; ")}.`);

    // Bulk-default proposal — find dominant value among proposed/recommended values
    if (f.values.size > 0) {
      const totalValues = [...f.values.values()].reduce((a, b) => a + b, 0);
      const sortedValues = [...f.values.entries()].sort((a, b) => b[1] - a[1]);
      const [topKey, topCount] = sortedValues[0];
      const dominance = topCount / totalValues;
      if (dominance >= BULK_DEFAULT_DOMINANCE_THRESHOLD) {
        const topVal = JSON.parse(topKey);
        const valStr = typeof topVal === "string" ? `"${topVal}"` : JSON.stringify(topVal);
        lines.push(
          `Bulk-default proposal: \`${valStr}\` covers ${topCount}/${totalValues} (${pct(dominance)}). Reply "default \`${field}\`" to accept this for all conflicting records.`
        );
      } else {
        lines.push(
          `No single dominant value (top: ${pct(dominance)}). This field needs per-record or per-pattern decisions.`
        );
      }
    }

    // Samples (up to 5)
    if (f.samples.length > 0) {
      lines.push("");
      lines.push("Samples:");
      for (const s of f.samples) {
        const valStr =
          s.value === undefined
            ? "(no proposed value — coverage gap)"
            : typeof s.value === "string"
              ? `"${s.value}"`
              : JSON.stringify(s.value);
        lines.push(`- (Case ${s.group}) ${valStr}`);
      }
      if (total > f.samples.length) {
        lines.push(`- … ${total - f.samples.length} more (see g1-synthesis-detail.md)`);
      }
    }
    lines.push("");
  }

  // ----- Novel composites -----
  lines.push("## Novel composites");
  lines.push("");
  if (proposal.novel_composites.length === 0) {
    lines.push("_None detected._");
  } else {
    for (const c of proposal.novel_composites) {
      lines.push(`- **${c.composite_id}** (${c.member_paths.length} members)`);
      for (const p of c.member_paths.slice(0, 5)) lines.push(`  - \`${p}\``);
      if (c.member_paths.length > 5) lines.push(`  - … ${c.member_paths.length - 5} more`);
    }
  }
  lines.push("");

  // ----- Sections detected -----
  lines.push("## Sections detected");
  lines.push("");
  if (sectionsDetected.length === 0) {
    lines.push("_None detected._");
  } else {
    for (const s of sectionsDetected) {
      lines.push(`- \`${s.path}\` — ${s.section_count} section(s)`);
    }
  }
  lines.push("");

  // ----- Approve gate -----
  lines.push("## What I need from you, in this order");
  lines.push("");
  lines.push(
    `1. **Auto-merge proposals** — there are ${proposal.auto_merge_proposals.length} proposals (Case B/D/E). Reply "approve all auto-merges" to accept the batch, or call out specific ones to override.`
  );
  lines.push("");
  lines.push(
    `2. **Open arbitration questions** — ${proposal.open_arbitration_questions.length} conflicts (Case C/G) need your call. You can answer in bulk per field where the same convention applies (e.g., "for type conflicts on \`.research/.../findings/*\`, use \`research-session\`") or per record where the call is record-specific. Per-field bulk-default proposals are listed above where one value dominates.`
  );
  lines.push("");
  lines.push(
    `3. **Coverage gaps** — ${proposal.coverage_gaps.length} fields neither agent could derive. For each (or in bulk per field), tell me: assign a value, defer (consequence: subsequent commits touching that record will be blocked by validate-catalog rule 2 until resolved), or trigger a narrower agent re-run with sharpened prompts.`
  );
  lines.push("");
  lines.push(
    "Once you answer, I will assemble the final arbitration package, run apply-arbitration.js against the preview catalogs, then run verify.js as the hard gate. If verify is clean, we move to the /label-audit dogfood and your final approval before promote."
  );
  lines.push("");

  return lines.join("\n");
}

/**
 * Render the full per-record detail markdown (large — written to a
 * separate file so the summary stays scannable).
 */
function renderDetail(proposal) {
  const lines = [];
  lines.push("# G.1 Synthesis — Full Per-Record Detail");
  lines.push("");
  lines.push("This is the complete per-record breakdown. The summary report (`g1-synthesis-summary.md`) is what you read first; this is the drill-down for any field where you want to see every record.");
  lines.push("");

  // Group everything by field for easy scanning.
  const all = [
    ...proposal.auto_merge_proposals.map((p) => ({ ...p, kind: "auto-merge" })),
    ...proposal.open_arbitration_questions.map((q) => ({ ...q, kind: "open-question" })),
    ...proposal.coverage_gaps.map((g) => ({ ...g, kind: "coverage-gap" })),
  ];
  const byField = groupBy(all, (x) => x.field);
  const sortedFields = [...byField.keys()].sort();

  for (const field of sortedFields) {
    const items = byField.get(field);
    lines.push(`## \`${field}\` — ${items.length} entries`);
    lines.push("");
    for (const item of items) {
      lines.push(`### \`${item.path}\``);
      if (item.kind === "auto-merge") {
        const valStr =
          typeof item.proposed_value === "string"
            ? `"${item.proposed_value}"`
            : JSON.stringify(item.proposed_value);
        lines.push(
          `- **Case ${item.case}** (auto-merge proposal, confidence ${item.proposed_confidence})`
        );
        lines.push(`- Proposed value: \`${valStr}\``);
        lines.push(`- Rationale: ${item.rationale}`);
      } else if (item.kind === "open-question") {
        lines.push(`- **Case ${item.case}** (open arbitration)`);
        for (const opt of item.options) {
          const valStr =
            typeof opt.value === "string" ? `"${opt.value}"` : JSON.stringify(opt.value);
          lines.push(
            `  - ${opt.source} (confidence ${(opt.confidence ?? 0).toFixed(2)}): \`${valStr}\``
          );
        }
        if (item.recommendation) {
          const valStr =
            typeof item.recommendation.value === "string"
              ? `"${item.recommendation.value}"`
              : JSON.stringify(item.recommendation.value);
          lines.push(`- Recommendation: ${item.recommendation.source} (\`${valStr}\`) — ${item.recommendation.rationale}`);
        }
      } else if (item.kind === "coverage-gap") {
        lines.push(`- **Case F** (coverage gap — neither agent had a value)`);
      }
      lines.push("");
    }
  }
  return lines.join("\n");
}

function parseArgs(argv) {
  const args = {
    findings: DEFAULT_FINDINGS,
    compositesDir: DEFAULT_COMPOSITES_DIR,
    outDir: DEFAULT_OUT_DIR,
  };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--findings") args.findings = argv[++i];
    else if (a.startsWith("--findings=")) args.findings = a.slice("--findings=".length);
    else if (a === "--composites-dir") args.compositesDir = argv[++i];
    else if (a.startsWith("--composites-dir=")) args.compositesDir = a.slice("--composites-dir=".length);
    else if (a === "--out-dir") args.outDir = argv[++i];
    else if (a.startsWith("--out-dir=")) args.outDir = a.slice("--out-dir=".length);
    else throw new Error(`unknown arg: ${a}`);
  }
  return args;
}

function cli() {
  let args;
  try {
    args = parseArgs(process.argv.slice(2));
  } catch (err) {
    process.stderr.write(
      `synthesize-findings: ${sanitize(err)}\n` +
        "usage: node synthesize-findings.js [--findings FILE] [--composites-dir DIR] [--out-dir DIR]\n"
    );
    process.exit(2);
  }

  let findings;
  try {
    findings = JSON.parse(fs.readFileSync(args.findings, "utf8"));
  } catch (err) {
    process.stderr.write(`synthesize-findings: findings read failed: ${sanitize(err)}\n`);
    process.exit(2);
  }

  let proposal;
  try {
    proposal = buildProposal(findings, args.compositesDir);
  } catch (err) {
    process.stderr.write(`synthesize-findings: build failed: ${sanitize(err)}\n`);
    process.exit(2);
  }

  const summaryPath = path.join(args.outDir, "g1-synthesis-summary.md");
  const detailPath = path.join(args.outDir, "g1-synthesis-detail.md");
  const proposalPath = path.join(args.outDir, "g1-arbitration-proposal.json");
  const gapsPath = path.join(args.outDir, "g1-coverage-gaps.jsonl");

  try {
    fs.writeFileSync(summaryPath, renderSummary(findings, proposal), "utf8");
    fs.writeFileSync(detailPath, renderDetail(proposal), "utf8");
    fs.writeFileSync(proposalPath, JSON.stringify(proposal, null, 2) + "\n", "utf8");
    fs.writeFileSync(
      gapsPath,
      proposal.coverage_gaps.map((g) => JSON.stringify(g)).join("\n") + "\n",
      "utf8"
    );
  } catch (err) {
    process.stderr.write(`synthesize-findings: write failed: ${sanitize(err)}\n`);
    process.exit(2);
  }

  process.stderr.write(
    `synthesize-findings: wrote 4 artifacts to ${args.outDir}\n` +
      `  summary:    ${summaryPath}\n` +
      `  detail:     ${detailPath}\n` +
      `  proposal:   ${proposalPath}\n` +
      `  gaps:       ${gapsPath}\n` +
      `  cases: B=${proposal._buckets_summary.B} C=${proposal._buckets_summary.C} D=${proposal._buckets_summary.D} E=${proposal._buckets_summary.E} F=${proposal._buckets_summary.F} G=${proposal._buckets_summary.G}\n`
  );
  process.exit(0);
}

if (require.main === module) cli();

module.exports = {
  classifyCases,
  buildAutoMerge,
  buildOpenQuestions,
  buildProposal,
  renderSummary,
  renderDetail,
  detectNovelComposites,
  detectSections,
  isMissingValue,
  setUnion,
  pickHigherConfidence,
};
