**Document Version:** 1.0
**Last Updated:** 2026-04-18
**Status:** COMPLETE
**Agent:** D11a — scripts small clusters pt1
**Clusters covered:** cas/ (12 files), audit/ (10 files), docs/ (1 file), metrics/ (3 files), multi-ai/ (6 files), config/ (15 files)
**Total records:** 47 (32 scripts + 15 configs)

---

## Pre-Work Notes Carried Forward

- `scripts/config/` needed dedicated D6a/D6b flag coverage — inventoried fully here (15 files).
- `multi-ai/state-manager.js` uses non-standard state path `.claude/multi-ai-audit/` (confirmed D1d note).
- `extract-agent-findings.js` was previously hardcoded to a Windows absolute path (fixed, confirmed).

---

## Cluster Architecture Notes

### cas/ — Content Analysis System (12 files)

**Data model and pipeline:**
CAS is SoNash's internal research pipeline for ingesting, analyzing, and querying external repositories and documents. The canonical data structures are:

- `.research/<slug>/analysis.json` — v3.0 schema with scored source metadata, candidates array (mirrored from journal), and tags
- `.research/extraction-journal.jsonl` — the canonical authority for extraction decisions (candidates in analysis.json are a mirror/cache)
- `.research/content-analysis.db` — SQLite with FTS5 full-text search tables, rebuilt from journal+analysis data
- `.research/EXTRACTIONS.md` — generated human-readable index

**Key architectural principle:** "Extractions are canon" — journal has authority over analysis.json.candidates. This is why backfill scripts exist: they repair the mirror when journal diverges from analysis.json.

**Script roles:**
- `rebuild-index.js` / `update-index.js` — full vs incremental SQLite sync
- `recall.js` — query CLI against SQLite with FTS5
- `retag.js` / `backfill-tags.js` — tag management (withLock() for journal+vocab atomic writes)
- `migrate-schemas.js` / `migrate-v3.js` / `fix-depth-mislabel.js` / `backfill-candidates.js` / `backfill-tags.js` / `promote-firecrawl-to-journal.js` — one-shot or idempotent migration fixes
- `generate-extractions-md.js` — generates human-readable EXTRACTIONS.md
- `self-audit.js` — validates output quality against CONVENTIONS.md S13 rules

**External deps:** `better-sqlite3` (rebuild-index, update-index, recall), `zod` (self-audit schema validation).

**Portability:** The CAS subsystem is deeply SoNash-specific. The data model (analysis.json v3.0), the .research/ directory structure, the tag vocabulary, the CONVENTIONS.md S13 rule set, and the firecrawl integration are all SoNash artifacts. None of these 12 files are portable as-is. The SQLite + FTS5 architecture pattern and the withLock() atomic write pattern are portable ideas but the implementation is not extractable without the surrounding schema.

---

### audit/ — TDMS Audit Pipeline (10 files)

**Architecture:**

The audit/ cluster is the supporting infrastructure for the Tech Debt Management System (TDMS). It sits between audit skill execution (which produces raw findings.jsonl) and the TDMS intake pipeline (scripts/debt/).

**Flow:**
```
pre-audit-check.js -> [skill runs] -> post-audit.js -> intake-audit.js -> generate-views.js -> generate-metrics.js -> generate-results-index.js
```

**Script roles:**
- `pre-audit-check.js` — preflight validator (6 checks before skill runs)
- `post-audit.js` — post-skill orchestrator (calls debt/ pipeline)
- `validate-audit-integration.js` — validates JSONL schema compliance at each pipeline stage
- `validate-templates.js` — validates multi-AI audit template quality
- `transform-jsonl-schema.js` — one-time field rename migration for old audit output
- `compare-audits.js` — delta analysis between two audit runs
- `count-commits-since.js` — determines if re-audit is warranted (git log integration)
- `track-resolutions.js` — reconciles MASTER_DEBT.jsonl against git history
- `audit-health-check.js` — system health (9-category diagnostic)
- `generate-results-index.js` — RESULTS_INDEX.md generator

**load-config consumers:** `transform-jsonl-schema.js` and `validate-audit-integration.js` both import `load-config` from scripts/config/. `audit-health-check.js` reads `audit-schema.json` directly.

**Note on generate-results-index.js:** Implements its own atomic write sequence (guardSymlink + safeWriteFileSync + safeRenameSync) rather than using the project's `safeAtomicWriteSync`. Functionally equivalent but deviates from the shared helper pattern.

**Portability:** All 10 files are `not-portable`. They have SoNash-specific file paths (docs/audits/, docs/technical-debt/MASTER_DEBT.jsonl, AUDIT_TRACKER.md), 9-category TDMS taxonomy, and the entire pipeline assumes SoNash's audit output directory structure.

---

### docs/ — Documentation Generators (1 file)

**generate-llms-txt.js:**
Generates `/llms.txt` per the llmstxt.org spec. The file has two halves:

1. **Portable half:** Custom YAML frontmatter parser, skill directory scanner (.claude/skills/*/SKILL.md), safeAtomicWriteSync write, and exported testable functions. None of these depend on SoNash specifics.

2. **SoNash-specific half:** `buildHeaderLines()` contains a hardcoded SoNash product description and technology stack references (Next.js 16, React 19, Firebase 12). Also `buildResearchLines()` and `buildScriptsLines()` reference SoNash-specific paths (.research/EXTRACTIONS.md, scripts/cas/, scripts/reviews/, etc.).

**Port strategy:** The portable half can be extracted as-is. The 4 builder functions with hardcoded content (`buildHeaderLines`, `buildResearchLines`, `buildScriptsLines`, `buildSourceLines`) need to be parameterized or replaced with JASON-OS equivalents. `buildCoreDocsLines()` references ROADMAP.md, SESSION_CONTEXT.md, AI_WORKFLOW.md — all of which exist in JASON-OS, so that builder may be nearly portable.

---

### metrics/ — PR Review Metrics (3 files, including 1 test)

**dedup-review-metrics.js (CJS):**
Reads `.claude/state/review-metrics.jsonl`, deduplicates by PR number (keeping latest timestamp), reconciles review_rounds from reviews.jsonl, writes back atomically. Has test coverage (`__tests__/dedup-review-metrics.test.js`). Portable-with-adaptation (the .claude/state path is portable; the JSONL schema is PR-review-specific).

**review-churn-tracker.js (ESM):**
Calls `gh` CLI to fetch PR data. SoNash-specific because it depends on GitHub and the SoNash PR workflow.

**MODULE SYSTEM INCONSISTENCY:** `dedup-review-metrics.js` is CJS (`require()`), while `review-churn-tracker.js` is ESM (`import`). Both are `.js` files in the same directory. This is a known footgun — if Node.js package.json sets `"type": "module"`, the CJS file breaks, and vice versa. This inconsistency should be flagged for the sync-mechanism port decision.

---

### multi-ai/ — Multi-AI Audit Orchestration (6 files)

**Architecture:**

The multi-ai/ cluster implements a multi-model audit consensus pipeline. Raw findings from different AI models are normalized, deduplicated, and unified:

```
Raw AI output -> extract-agent-findings.js (extract from transcripts)
             -> normalize-format.js (any format -> JSONL)
             -> fix-schema.js (field aliases, severity/effort normalization)
             -> raw/<category>-<source>.jsonl (per AI source files)
             -> aggregate-category.js (multi-tier dedup, CANON-XXXX IDs)
             -> canon/CANON-<CATEGORY>.jsonl (canonical per-category)
             -> unify-findings.js (cross-category merge, priority scoring)
             -> final/UNIFIED-FINDINGS.jsonl + SUMMARY.md
```

State managed by `state-manager.js` (persists across compactions to `.claude/multi-ai-audit/`).

**MODULE SYSTEM MIX:** 4 of 6 files are ESM (`normalize-format.js`, `fix-schema.js`, `aggregate-category.js`, `state-manager.js`, `unify-findings.js`); 1 is CJS (`extract-agent-findings.js`). The ESM files use `createRequire` to import the CJS `parse-jsonl-line.js` library. This is a deliberate bridging pattern, not an error.

**Portability assessment:**
- `normalize-format.js` — portable-with-adaptation: the multi-format detection and parsing engine has no SoNash dependencies
- `fix-schema.js` — portable-with-adaptation: field aliases and severity normalization are TDMS-schema-aligned
- `state-manager.js` — portable-with-adaptation: the session state machine is general; only VALID_CATEGORIES needs updating
- `aggregate-category.js` — not-portable: the CANON-XXXX ID scheme and session directory structure are SoNash-specific
- `extract-agent-findings.js` — not-portable: assumes SoNash agent output file format
- `unify-findings.js` — not-portable: session directory structure, SoNash-specific paths

**Non-standard state path (D1d confirmed):** state-manager.js persists to `.claude/multi-ai-audit/` rather than `.claude/state/`. The multi-ai-audit skill uses this deliberately to isolate audit session state from general tool state. Any JASON-OS port must account for this.

---

### config/ — Shared Configuration Subsystem (15 files)

**This is the most important cluster for the sync-mechanism port.** The config/ directory is the central registry for all tooling behavior. It acts as a single source of truth for:

1. **Schema definitions:** `audit-schema.json` — the 9-category TDMS taxonomy and severity/effort/status enums. This is the foundational config that flows through the entire audit pipeline.

2. **Hook gate registry:** `hook-checks.json` — schema_version=1 registry of all 20 pre-commit and pre-push checks with full metadata (wave, blocking mode, exit codes, conditions, actions). This is the authoritative declaration of the hook system. The structure is portable; the specific commands and paths are SoNash-specific.

3. **Pattern enforcement:** `propagation-patterns.json` + `known-propagation-baseline.json` + `verified-patterns.json` + `ai-patterns.json` — the security and quality pattern enforcement system. `propagation-patterns.json` and `verified-patterns.json` are HIGHLY PORTABLE and directly align with JASON-OS CLAUDE.md S5 anti-patterns.

4. **Document system:** `doc-header-config.json` (portable), `doc-dependencies.json` (SoNash paths), `doc-generator-config.json` (SoNash directory structure).

5. **Skill system:** `skill-config.json` (portable validation patterns, SoNash topic aliases), `skill-registry.json` (SoNash-specific, auto-generated).

6. **Audit config:** `audit-config.json` (SoNash-specific thresholds), `agent-triggers.json` (SoNash-specific agents), `category-mappings.json` (mostly portable).

**load-config.js — the entry module:**

CJS module that provides two functions:
- `loadConfig(name)` — reads `<name>.json` with path-traversal guard (rejects `..`, `/`, `\` in name)
- `loadConfigWithRegex(name, fields)` — additionally converts `{source, flags}` objects to RegExp instances recursively

The path-traversal guard is important: it uses explicit name validation (not path.resolve + relative check) because config names are programmer-controlled strings, not user file paths. This is a simpler and appropriate check for this use case.

**Regex descriptor pattern:** Several JSON configs use `{"source": "...", "flags": "..."}` objects instead of regex literals (JSON doesn't support regex literals). `loadConfigWithRegex` handles the conversion. This is used in: `audit-config.json`, `ai-patterns.json`, `propagation-patterns.json`, `hook-checks.json`, `skill-config.json`, `doc-dependencies.json`, `doc-header-config.json`, `agent-triggers.json`.

**Consumer map:**
```
load-config.js <- transform-jsonl-schema.js
load-config.js <- validate-audit-integration.js (loads audit-schema.json)

audit-schema.json <- validate-audit-integration.js
audit-schema.json <- pre-audit-check.js (direct read)
audit-schema.json <- audit-health-check.js (direct read)
audit-schema.json <- hook-checks.json (audit-s0s1, debt-schema checks reference it)

hook-checks.json <- audit-health-check.js (lib consistency check)
propagation-patterns.json <- check-propagation-staged.js
propagation-patterns.json <- check-propagation.js
known-propagation-baseline.json <- check-propagation-staged.js
ai-patterns.json <- check-pattern-compliance.js (pattern-compliance hook)
doc-dependencies.json <- check-cross-doc-deps.js (cross-doc-deps hook)
doc-header-config.json <- check-doc-headers.js (doc-headers hook)
doc-generator-config.json <- docs:index npm script
skill-config.json <- skills:validate npm script
skill-registry.json <- skills:validate npm script
agent-triggers.json <- triggers:check npm script
category-mappings.json <- audit intake scripts
verified-patterns.json <- code-reviewer agent
```

**Port priorities for config/:**
- Port immediately (high value, portable): `propagation-patterns.json`, `verified-patterns.json`, `doc-header-config.json`, `load-config.js`
- Port with updates (structure portable, content needs adaptation): `audit-schema.json`, `hook-checks.json`, `skill-config.json`, `category-mappings.json`, `ai-patterns.json`
- Regenerate from scratch: `skill-registry.json`, `known-propagation-baseline.json`
- SoNash-only (don't port): `audit-config.json`, `agent-triggers.json`, `doc-dependencies.json`, `doc-generator-config.json`

---

## Portability Summary

| Cluster | Files | Not-Portable | Portable-with-Adaptation | Portable |
|---------|-------|-------------|--------------------------|---------|
| cas/ | 12 | 12 | 0 | 0 |
| audit/ | 10 | 10 | 0 | 0 |
| docs/ | 1 | 0 | 1 | 0 |
| metrics/ | 3 | 1 | 1+1test | 0 |
| multi-ai/ | 6 | 3 | 3 | 0 |
| config/ | 15 | 6 | 6 | 3 |
| **Total** | **47** | **32** | **11** | **3** |

Most valuable for JASON-OS port: `propagation-patterns.json`, `verified-patterns.json`, `doc-header-config.json`, `load-config.js`, `normalize-format.js`, `fix-schema.js`, `state-manager.js`, `generate-llms-txt.js`.

---

## Learnings for Methodology

1. **Module system detection cannot be inferred from extension.** Within the same directory, `.js` files can be CJS or ESM. Must inspect `require()` vs `import` at top of file. Found in metrics/ (CJS + ESM mix) and multi-ai/ (ESM majority with one CJS).

2. **config/ is not "just JSON."** The 15-file config/ cluster has a loader module (load-config.js), a regex descriptor convention ({source, flags}), and a consumer dependency graph that spans audit/, multi-ai/, hook scripts, and npm scripts. It required full depth-read to map accurately.

3. **CAS is a self-contained data subsystem.** All 12 CAS files share a consistent internal dependency graph (all use safe-fs, safe-cas-io, parse-jsonl-line) and a clear data model (analysis.json v3.0 + journal + SQLite). They can be assessed as a unit: all not-portable, all CJS.

4. **Cross-subsystem coupling is a portability risk.** `audit-health-check.js` requires `scripts/multi-ai/state-manager.js` via require() to access `VALID_CATEGORIES`. This creates a runtime dependency from audit/ into multi-ai/. If either subsystem is ported without the other, this breaks.

5. **Hook-checks.json is the gate registry.** Understanding the hook system requires reading hook-checks.json, not just the hook files themselves. The JSON declares the authoritative wave order, blocking modes, skip flags, and exit code semantics. This is a key pattern to port.

6. **known-propagation-baseline.json is >55K tokens.** Too large to read in one shot. The structure is clear from reading the first 50 lines: it's a list of {type, key, file, addedAt, reason} entries — one entry per exempted file+pattern-key combination. JASON-OS should start with an empty baseline.

---

## Gaps

1. **metrics/__tests__/dedup-review-metrics.test.js not read.** The test file was noted as existing (`test_coverage=true` for dedup-review-metrics.js) but not fully inventoried. D10b background agent may cover this (it handles reviews tests + dist). If not, it remains uninventoried.

2. **known-propagation-baseline.json not fully read** — only first 50 lines. The structure is clear (suppression list entries) but the complete list of suppressed files was not captured. Total entry count unknown.

3. **scripts/cas/schemas/analysis-schema.js not read.** Referenced by backfill-candidates.js and self-audit.js. It's a Zod schema definition for analysis.json v3.0. This is likely part of D11b scope or was covered by another agent's cas/ scan.

4. **scripts/config/load-config.js consumers in npm scripts not verified.** The consumer map above is based on reading the JS files. Some config files are consumed via npm run commands (e.g., `skills:validate`, `patterns:check`, `triggers:check`). The actual npm script implementations in package.json were not read here.

5. **D6a/D6b note on config/ dedicated coverage.** The D6a/D6b flag was "config/ needs dedicated coverage." This file provides that coverage. However, the D6a/D6b agents may have also partially inventoried config/ files from the scripts/root perspective. Cross-agent deduplication will be needed in synthesis.
