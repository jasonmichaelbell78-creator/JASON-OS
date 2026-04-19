# D9 Findings: scripts/debt/ — TDMS Architecture Inventory

**Agent:** D9
**Profile:** codebase
**Date:** 2026-04-18
**Scope:** `/c/Users/jason/Workspace/dev-projects/sonash-v0/scripts/debt/` (28 files)

---

## TDMS Subsystem Architecture

The Technical Debt Management System (TDMS) in SoNash is a fully self-contained
Node.js pipeline for ingesting, normalizing, deduplicating, triaging, resolving,
and reporting technical debt. All 28 files in `scripts/debt/` belong to this system.

### Architecture Layers (top to bottom)

```
┌─────────────────────────────────────────────────────────────────┐
│  LAYER 0: ORCHESTRATION                                         │
│  consolidate-all.js — master pipeline runner                    │
└──────────────────────────┬──────────────────────────────────────┘
                           │
┌──────────────────────────▼──────────────────────────────────────┐
│  LAYER 1: EXTRACTION / INTAKE                                   │
│  (multiple sources → raw/*.jsonl)                               │
│                                                                 │
│  From structured JSONL:                                         │
│    extract-audits.js        docs/audits/**/*.jsonl              │
│    extract-reviews.js       docs/reviews/**/*.jsonl             │
│                             docs/aggregation/*.jsonl            │
│                                                                 │
│  From unstructured sources:                                     │
│    extract-scattered-debt.js  TODO/FIXME/HACK/XXX comments      │
│    extract-roadmap-debt.js    ROADMAP.md checkboxes             │
│    extract-audit-reports.js   Dec 2025 markdown reports (1-shot)│
│    extract-context-debt.js    .claude/state/ gap files (1-shot) │
│                                                                 │
│  Direct CLI intake:                                             │
│    intake-manual.js         single item via CLI args            │
│    intake-audit.js          audit JSONL batch (3 formats)       │
│    intake-pr-deferred.js    single PR-deferred item             │
│    ingest-cleaned-intake.js pre-cleaned scattered-intake        │
└──────────────────────────┬──────────────────────────────────────┘
                           │
┌──────────────────────────▼──────────────────────────────────────┐
│  LAYER 2: NORMALIZATION                                         │
│  normalize-all.js                                               │
│    reads:  raw/*.jsonl (all except normalized-all.jsonl)        │
│    writes: raw/normalized-all.jsonl                             │
│    applies: enum enforcement, path normalization, hash regen    │
│    adds: `updated` timestamp                                    │
└──────────────────────────┬──────────────────────────────────────┘
                           │
┌──────────────────────────▼──────────────────────────────────────┐
│  LAYER 3: DEDUPLICATION                                         │
│  dedup-multi-pass.js                                            │
│    reads:  raw/normalized-all.jsonl                             │
│    writes: raw/deduped.jsonl                                    │
│            logs/dedup-log.jsonl                                 │
│            raw/review-needed.jsonl (S0/S1 uncertain matches)    │
│                                                                 │
│  6 passes:                                                      │
│    0: Parametric (file + title with numbers stripped to #)      │
│    1: Exact content_hash match                                  │
│    2: Near match (same file, line±5, title>80% Levenshtein)     │
│    3: Semantic (same file, title>90%, also flags for review)    │
│    4: Cross-source (SonarCloud rule ↔ audit finding corr.)      │
│    5: Systemic annotation (same title ≥3 files → cluster_id)   │
└──────────────────────────┬──────────────────────────────────────┘
                           │
┌──────────────────────────▼──────────────────────────────────────┐
│  LAYER 3.5: TRIAGE / CLEANING                                   │
│  clean-intake.js            scattered-intake → cleaned JSONL    │
│  process-review-needed.js   S0/S1 dedup pairs → manual triage  │
└──────────────────────────┬──────────────────────────────────────┘
                           │
┌──────────────────────────▼──────────────────────────────────────┐
│  LAYER 4: MASTER STORAGE / VIEW GENERATION                      │
│  generate-views.js                                              │
│    read-only mode:  reads MASTER_DEBT.jsonl → views             │
│    --ingest mode:   reads deduped.jsonl → assigns DEBT IDs      │
│                     → appends to MASTER_DEBT.jsonl → views      │
│    outputs:                                                     │
│      INDEX.md                     human-readable index          │
│      views/by-severity.md                                       │
│      views/by-category.md                                       │
│      views/by-status.md                                         │
│      views/verification-queue.md                                │
│      LEGACY_ID_MAPPING.json       CANON-XXXX → DEBT-XXXX        │
└──────────────────────────┬──────────────────────────────────────┘
                           │
┌──────────────────────────▼──────────────────────────────────────┐
│  LAYER 5: RESOLUTION / LIFECYCLE                                │
│  resolve-item.js            single item: RESOLVED/FALSE_POSITIVE│
│  resolve-bulk.js            bulk: RESOLVED; --eligible-only     │
│  verify-resolutions.js      audit: NEW→VERIFIED, RESOLVED check │
│  escalate-deferred.js       auto-escalate deferred PR items     │
└──────────────────────────┬──────────────────────────────────────┘
                           │
┌──────────────────────────▼──────────────────────────────────────┐
│  LAYER 6: REPORTING / METRICS                                   │
│  generate-metrics.js        METRICS.md + metrics.json (dashboard│
└──────────────────────────┬──────────────────────────────────────┘
                           │
┌──────────────────────────▼──────────────────────────────────────┐
│  LAYER 7: SYNC / MAINTENANCE                                    │
│  sync-sonarcloud.js         live API sync + stale resolution    │
│  sync-deduped.js            propagate MASTER edits → deduped    │
│  sync-roadmap-refs.js       validate DEBT-XXXX in ROADMAP.md    │
│  assign-roadmap-refs.js     bulk-assign roadmap tracks          │
│  reconcile-roadmap.js       replace CANON-XXXX → DEBT-XXXX      │
└──────────────────────────┬──────────────────────────────────────┘
                           │
┌──────────────────────────▼──────────────────────────────────────┐
│  LAYER 8: SCHEMA / PHASE MANAGEMENT                             │
│  validate-schema.js         validate any JSONL against schema   │
│  check-phase-status.js      check TDMS rollout phase completion │
└─────────────────────────────────────────────────────────────────┘
```

### Complete Call Graph (who calls whom)

```
consolidate-all.js
  → extract-audits.js
  → extract-reviews.js
  → normalize-all.js
  → dedup-multi-pass.js
  → generate-views.js (--ingest)

intake-audit.js (post-intake pipeline)
  → dedup-multi-pass.js
  → generate-views.js
  → assign-roadmap-refs.js

intake-manual.js
  → generate-views.js

intake-pr-deferred.js
  → generate-views.js

escalate-deferred.js
  → intake-pr-deferred.js (via execFileSync)

resolve-item.js
  → generate-views.js

resolve-bulk.js
  → generate-views.js

sync-sonarcloud.js
  → generate-views.js

ingest-cleaned-intake.js  (no downstream calls)
clean-intake.js           (no downstream calls)
process-review-needed.js  (no downstream calls)
verify-resolutions.js     (no downstream calls)
assign-roadmap-refs.js    (no downstream calls)
reconcile-roadmap.js      (no downstream calls)
sync-deduped.js           (no downstream calls)
sync-roadmap-refs.js      (no downstream calls)
generate-metrics.js       (no downstream calls)
validate-schema.js        (no downstream calls)
check-phase-status.js     (no downstream calls)
extract-scattered-debt.js (no downstream calls)
extract-roadmap-debt.js   (no downstream calls)
extract-audit-reports.js  (no downstream calls)
extract-context-debt.js   (no downstream calls)
normalize-all.js          (no downstream calls)
```

---

## Master Storage Schema: MASTER_DEBT.jsonl

Every line is one JSON object (a TDMS item). The full field set:

### Required Core Fields

| Field | Type | Notes |
|-------|------|-------|
| `id` | string | `DEBT-XXXX` (4-digit zero-padded, auto-assigned) |
| `source_id` | string | Source prefix: `audit:`, `review:`, `sonarcloud:`, `manual:UUID`, `pr-deferred:UUID`, `code-comment:`, `roadmap:`, `context:`, `dec-2025-report:` |
| `source_file` | string | Relative path to originating file, or `"manual-entry"`, `"sonarcloud-sync"`, `"PR #N"` |
| `category` | enum | `code-quality`, `security`, `performance`, `documentation`, `refactoring`, `engineering-productivity`, `ai-optimization`, `accessibility`, `process`, `enhancements` |
| `severity` | enum | `S0` (critical), `S1` (high), `S2` (medium), `S3` (low) |
| `type` | enum | `tech-debt`, `code-smell`, `bug`, `vulnerability`, `process-gap`, `enhancement`, `hotspot` |
| `file` | string | Repo-relative file path (normalized, no leading slash) |
| `line` | integer | Line number (0 if unknown) |
| `title` | string | Max 500 chars |
| `description` | string | Detailed description |
| `recommendation` | string | Suggested fix |
| `effort` | enum | `E0` (trivial), `E1` (small), `E2` (medium), `E3` (large) |
| `status` | enum | `NEW`, `VERIFIED`, `IN_PROGRESS`, `TRIAGED`, `RESOLVED`, `FALSE_POSITIVE` |
| `roadmap_ref` | string or null | Roadmap track: `Track-S`, `Track-P`, `Track-D`, `Track-E`, `Track-T`, `M2.1`, `M2.2`, `M2.3-REF`, `M1.5` |
| `created` | string | ISO date `YYYY-MM-DD` |
| `verified_by` | string or null | Who verified (string, `"auto"`, or null) |
| `resolution` | object or null | `{type, reason, date}` or `{date, pr}` |
| `content_hash` | string | SHA-256 of deterministic subset of fields (via generate-content-hash.js) |

### Optional / Contextual Fields

| Field | Type | Set By |
|-------|------|--------|
| `original_id` | string | Extract scripts (preserves CANON-XXXX etc.) |
| `rule` | string | SonarCloud rule key |
| `sonar_key` | string | SonarCloud issue key (for sync/resolve tracking) |
| `evidence` | array | Supporting evidence strings |
| `sources` | array | Originating review sources |
| `merged_from` | array | source_ids of items merged into this one |
| `pr_bucket` | string | Suggested PR grouping |
| `consensus_score` | number | Aggregated cross-source confidence |
| `dependencies` | array | Related debt item IDs |
| `roadmap_status` | string | ROADMAP.md tracking status |
| `cluster_id` | string | `CLUSTER-XXXXXXXX` if systemic pattern (pass 5) |
| `cluster_count` | integer | Count of items in cluster |
| `cluster_primary` | boolean | Is this the primary cluster representative? |
| `updated` | string | ISO date of last normalization |
| `resolved_date` | string | ISO date of resolution |
| `source_pr` | integer | PR number for pr-deferred items |
| `pr_number` | integer | PR number (same as source_pr, set by intake-pr-deferred) |
| `subcategory` | string | Enhancement audit: original category before override |
| `impact` | string | Enhancement audit: impact level (I0-I3) |
| `counter_argument` | string | Enhancement audit: honesty guard |
| `current_approach` | string | Enhancement audit: existing approach |
| `proposed_outcome` | string | Enhancement audit: target outcome |
| `confidence` | number | Enhancement audit: confidence score |

### Supporting Files (alongside MASTER_DEBT.jsonl)

```
docs/technical-debt/
  MASTER_DEBT.jsonl              — canonical master
  MASTER_DEBT.jsonl.bak          — backup (assign-roadmap-refs)
  FALSE_POSITIVES.jsonl          — items removed as false positives
  INDEX.md                       — human-readable index
  LEGACY_ID_MAPPING.json         — CANON-XXXX → DEBT-XXXX mapping
  METRICS.md                     — dashboard metrics (human)
  metrics.json                   — dashboard metrics (machine)
  raw/
    audits.jsonl                 — extract-audits output
    reviews.jsonl                — extract-reviews output
    scattered-intake.jsonl       — extract-scattered-debt/roadmap/context output
    scattered-intake-cleaned.jsonl  — clean-intake output
    normalized-all.jsonl         — normalize-all output
    deduped.jsonl                — dedup-multi-pass output
    review-needed.jsonl          — dedup S0/S1 uncertain pairs
  views/
    by-severity.md
    by-category.md
    by-status.md
    verification-queue.md
  logs/
    intake-log.jsonl             — all intake actions (manual, audit, pr-deferred, sonarcloud)
    dedup-log.jsonl              — dedup merge records
    resolution-log.jsonl         — resolve-item/resolve-bulk/sync-sonarcloud resolutions
    metrics-log.jsonl            — metrics trend snapshots
    resolution-audit-report.json — verify-resolutions audit output
```

---

## Ingest → Classification → Review → Report Pipeline

### Standard Batch Flow (consolidate-all.js)

```
1. extract-audits.js        docs/audits/**/*.jsonl → raw/audits.jsonl
2. extract-reviews.js       docs/reviews/**/*.jsonl + docs/aggregation/*.jsonl → raw/reviews.jsonl
3. normalize-all.js         raw/*.jsonl → raw/normalized-all.jsonl
4. dedup-multi-pass.js      raw/normalized-all.jsonl → raw/deduped.jsonl
5. generate-views.js --ingest  raw/deduped.jsonl → MASTER_DEBT.jsonl + views/
```

### Real-Time Intake Flow (any intake-*.js)

```
CLI invocation
  ↓
validate inputs → check schema (audit-schema.json)
  ↓
generateContentHash() → check against existing MASTER hashes
  ↓
if duplicate: exit(0) with warning
  ↓
assign DEBT-XXXX (max existing + 1)
  ↓
appendMasterDebtSync([item])
  → writes to MASTER_DEBT.jsonl (append)
  → writes to raw/deduped.jsonl (append)
  → writes to logs/intake-log.jsonl
  ↓
generate-views.js (regenerate all views)
```

### Severity Classification Mechanism

Severity is assigned at extraction time via source-specific mappers:

| Source | Mechanism |
|--------|-----------|
| Manual intake | Explicit `--severity S0-S3` CLI arg |
| Audit JSONL (TDMS native) | `severity` field pass-through |
| Doc Standards format | Inherits from parent audit category |
| Enhancement audit | Impact mapping: I0=S1, I1=S2, I2=S2, I3=S3 (never S0) |
| SonarCloud issues | BLOCKER/CRITICAL=S0, MAJOR=S1, MINOR=S2, INFO=S3; cognitive complexity BLOCKERs overridden to S1 |
| SonarCloud hotspots | HIGH=S0, MEDIUM=S1, LOW=S2 |
| Code comments | TODO=S3, FIXME/HACK/XXX/WORKAROUND=S2 |
| Markdown reports | Regex/keyword heuristic: 🔴/critical=S0, 🟡/high=S1, medium=S2, low=S3 |
| ROADMAP.md items | Keyword heuristic; explicit `- S1` markers parsed |
| .claude/state/ gaps | S3 default; FINDING-* with critical/security/data-loss keywords = S1, else S2 |

### Pattern Detection (Recurring Debt Clusters)

Pass 5 of dedup-multi-pass.js implements systemic pattern detection:
- Groups items by normalized title (lowercase, punctuation stripped)
- Items with same title appearing in 3+ distinct files → annotated with `cluster_id` (SHA-256 prefix of title) and `cluster_count`
- Most-severe item in cluster gets `cluster_primary: true`
- No items removed in pass 5 — annotation only

Cross-source pass 4 uses a hardcoded `SONAR_TO_CATEGORY` map:
- `javascript:S1854`, `typescript:S1854` → code-quality (useless assignment)
- `javascript:S3776`, `typescript:S3776` → code-quality (cognitive complexity)
- `javascript:S2245`, `typescript:S2245` → security (weak random)
- `javascript:S4830`, `typescript:S4830` → security (certificate validation)

### Review/Triage Workflow

Two triage paths:
1. `raw/review-needed.jsonl`: S0/S1 items with parametric matches flagged by dedup pass 0; processed by `process-review-needed.js` to determine true duplicates vs distinct instances
2. `views/verification-queue.md`: Items in `NEW` status awaiting human verification; `verify-resolutions.js` auto-promotes to `VERIFIED` if referenced file exists on disk

### Reporting and Aggregation

- `generate-views.js`: 5 markdown files (INDEX, by-severity, by-category, by-status, verification-queue) + `LEGACY_ID_MAPPING.json`
- `generate-metrics.js`: `METRICS.md` (human) + `metrics.json` (machine, for SoNash dev dashboard)

### Automated Alerting

No push-based alerting. `generate-metrics.js` is designed to run at session-end/session-start via hook (see `metrics-log.jsonl` for trend tracking). No webhook or notification targets found.

---

## Portable Components vs SoNash-Specific

### Portable (sanitize-then-portable) — 20 files

These files have generic debt-tracking algorithms. Project-specific values are limited to file paths and enum labels that can be reconfigured.

| File | Portable Core | What to Replace |
|------|---------------|-----------------|
| `intake-manual.js` | CLI intake, hash dedup, ID assignment | DEBT_DIR, LOG paths |
| `intake-audit.js` | 3-format input mapping, batch intake | DEBT_DIR, LOG paths |
| `intake-pr-deferred.js` | PR-linked intake | DEBT_DIR, LOG paths |
| `ingest-cleaned-intake.js` | Pre-cleaned batch ingest | DEBT_DIR, INPUT_FILE |
| `extract-audits.js` | JSONL extraction + normalization | AUDITS_DIR path |
| `extract-reviews.js` | JSONL extraction from reviews/aggregation | REVIEWS_DIR, AGGREGATION_DIR |
| `extract-scattered-debt.js` | TODO/FIXME/HACK comment scanner | SCAN_DIRS (src,app,etc.) |
| `extract-roadmap-debt.js` | Checkbox debt classifier | ROADMAP_FILE path |
| `normalize-all.js` | Schema normalization | RAW_DIR path |
| `dedup-multi-pass.js` | 6-pass dedup engine | SONAR_TO_CATEGORY rules |
| `consolidate-all.js` | Pipeline orchestrator | Script paths |
| `generate-views.js` | Markdown + JSON view generator | BASE_DIR paths |
| `generate-metrics.js` | Metrics generation | BASE_DIR, dashboard coupling |
| `sync-deduped.js` | MASTER→deduped propagation | ROOT paths |
| `sync-roadmap-refs.js` | DEBT-XXXX ref validation | ROADMAP paths |
| `resolve-item.js` | Single item lifecycle | DEBT_DIR paths |
| `resolve-bulk.js` | Bulk lifecycle | REPO_ROOT, DEBT_DIR |
| `verify-resolutions.js` | Status auditing | DEBT_DIR paths |
| `process-review-needed.js` | Triage of uncertain matches | DEBT_DIR paths |
| `clean-intake.js` | 4-phase intake cleaner | DEBT_DIR paths |
| `validate-schema.js` | Schema validation | DEBT_DIR, audit-schema.json |

### Not Portable (product-coupled) — 8 files

| File | Reason |
|------|--------|
| `extract-audit-reports.js` | Hardcoded REPORT_CONFIG for 17 specific Dec 2025 SoNash report filenames |
| `extract-context-debt.js` | Hardcoded SOURCE_FILES: agent-research-results.md, system-test-gap-analysis-pass2.md |
| `sync-sonarcloud.js` | Direct SonarCloud API, SoNash org/project keys, sonar-project.properties |
| `assign-roadmap-refs.js` | SoNash roadmap track taxonomy (Track-S/P/D/E/T, M2.1/2.2/2.3-REF, M1.5) |
| `reconcile-roadmap.js` | SoNash CANON-XXXX ID scheme, ROADMAP.md, LEGACY_ID_MAPPING.json |
| `escalate-deferred.js` | Reads data/ecosystem-v2/deferred-items.jsonl (SoNash product state); rev-NNN review_id format |
| `check-phase-status.js` | Hardcoded 17-phase SoNash TDMS rollout checklist |

---

## What JASON-OS `add-debt` v0 Stub Would Need to Absorb

The minimum viable `add-debt` for JASON-OS is the real-time intake path:

### Must-have (portable core, no SoNash coupling)

1. **Schema definition** (`audit-schema.json` equivalent): validCategories, validSeverities, validTypes, validStatuses, validEfforts, requiredFields
2. **`generate-content-hash.js`** (from `scripts/lib/`): deterministic hash for dedup
3. **`normalize-file-path.js`** (from `scripts/lib/`): path normalization
4. **`parse-jsonl-line.js`** (from `scripts/lib/`): safe JSONL parsing
5. **`safe-fs.js`** (from `scripts/lib/`): `appendMasterDebtSync`, `safeWriteFileSync`
6. **`intake-manual.js` logic**: CLI args → validate → hash → dedup → DEBT-ID → append
7. **`validate-schema.js` logic**: for pre-commit gate
8. **`generate-views.js` logic (read-only mode)**: INDEX.md from MASTER_DEBT.jsonl

### Nice-to-have (portable, enables batch workflows)

9. **`extract-scattered-debt.js` logic** (with configurable SCAN_DIRS)
10. **`dedup-multi-pass.js` logic** (passes 0-3 are fully generic; pass 4 needs sonar rules stripped)
11. **`normalize-all.js` logic**

### Do Not Port (SoNash-specific)

- `sync-sonarcloud.js` (SonarCloud API, project-specific)
- `assign-roadmap-refs.js` (SoNash track taxonomy)
- `escalate-deferred.js` (SoNash product data)
- `extract-audit-reports.js` (SoNash Dec 2025 archives)
- `extract-context-debt.js` (SoNash state files)
- `check-phase-status.js` (SoNash TDMS rollout phases)
- `reconcile-roadmap.js` (SoNash CANON-XXXX scheme)

### Key Design Decisions to Preserve on Port

1. **`appendMasterDebtSync` writes to both MASTER and deduped atomically** — this two-file invariant prevents sync-deduped.js problems at runtime
2. **content_hash is computed before ID assignment** — enables dedup before committing to storage
3. **ID format is DEBT-XXXX with max+1 assignment** — never recycles IDs; gap-safe
4. **audit-schema.json is the single source of truth** for all enums — intake, normalize, validate all load from the same config file
5. **Default to --dry-run** in all extraction/migration scripts — prevents accidental writes

---

## Module System Anomaly

26 of 28 files are CJS (`require()` / `module.exports`).

**Two ESM outliers** (use `import`/`export`):
- `sync-roadmap-refs.js` — uses `import` with `createRequire` workaround to load the CJS `parse-jsonl-line.js` lib
- `check-phase-status.js` — uses `import` from `../lib/sanitize-error.js` (the `.js` ESM variant, not `.cjs`)

This is not a `"type": "module"` package — the root `package.json` has no `"type"` field, so `.js` defaults to CJS. These two ESM files must be run with a Node.js version that supports explicit ESM (Node 22 per CLAUDE.md). The mismatch suggests `sync-roadmap-refs.js` was converted to ESM at some point without completing the migration.

---

## Gaps and Missing References

1. **`extract-sonarcloud.js`** is referenced in `consolidate-all.js` step 1 as DEPRECATED but the file does not exist in `scripts/debt/`. Its role has been replaced by `sync-sonarcloud.js`. File count seen in the filesystem: 28 files (matches earlier enum).

2. **`scripts/config/audit-schema.json`** — the single source of truth for all schema enums — was not read in this scan. Its exact contents (validCategories, validSeverities, etc.) are the formal contract; the enum values in this document are derived from reading the consuming scripts but not verified against the canonical config file.

3. **`scripts/lib/read-jsonl.js`** is used by `sync-deduped.js` and `clean-intake.js` but was not inventoried (covered by D7).

4. **`data/ecosystem-v2/deferred-items.jsonl`** — the SoNash product state file read by `escalate-deferred.js` — is in the `data/` dir which appears to be a product dir (D19a territory). Not inventoried here.

5. **No automated alerting found.** `generate-metrics.js` is the only metrics output; no webhook, Slack, or notification integration. Dashboard coupling is via `metrics.json` read by SoNash's UI layer.

6. **Pre-commit integration of `validate-schema.js`**: The `--staged-only` flag suggests it was intended for a pre-commit hook, but this scan didn't verify which hooks in `.claude/hooks/` actually invoke it. D3a-b would have this.

---

## Learnings for Methodology

### 1. 28-file script directories need 4+ sub-agents
This scope (28 files, most 200-1000 lines) was workable in one D-agent pass, but only because the files were architecturally coherent (one system). A directory with 28 unrelated scripts would need splitting by function group.

### 2. CJS vs ESM is non-trivial at the script level
Two of 28 files use ESM import syntax in a CJS-default package. The SCHEMA_SPEC field `module_system` catches this correctly — but the decision rule "check nearest package.json `type` field" is necessary but insufficient: per-file explicit require/import usage must also be checked. Both ESM files were detectable only by reading the first few lines.

### 3. "Not portable" vs "sanitize-then-portable" boundary
The distinction hardened around three questions: (a) does the file read a SoNash-specific external API (SonarCloud)? (b) does the file reference SoNash-specific product data files (data/ecosystem-v2/)? (c) does the file contain a hardcoded list of SoNash-named artifacts (REPORT_CONFIG, 17-phase checklist, CANON-XXXX scheme)? Files that only had project-specific file paths (DEBT_DIR) got `sanitize-then-portable` because paths are configuration, not logic.

### 4. Pipeline scripts warrant a composite record
This 28-file TDMS system is a clear candidate for a D21 `composite` record, with `component_units` listing all 28 files and `data_contracts` capturing the MASTER_DEBT.jsonl schema and the deduped.jsonl invariant. D-agents should flag "this is a composite" even when they can't emit the composite record themselves.

### 5. The two-file invariant (MASTER + deduped) is load-bearing
`appendMasterDebtSync` in `scripts/lib/safe-fs.js` writes to both MASTER_DEBT.jsonl AND raw/deduped.jsonl atomically. Any port of `add-debt` that only writes to one file will create a sync problem. This should be a `data_contracts` entry.

### 6. Schema enums live in config, not in scripts
All 7+ scripts that do enum validation import from `scripts/config/audit-schema.json` via `load-config.js`. This pattern should be documented as a port requirement: the config file must come with the scripts, not just the scripts themselves.

---

## Confidence Assessment

- HIGH claims: 28 (all file classifications derived from direct reads)
- MEDIUM claims: 3 (module_system for esm files; test_coverage for files where tests exist in dist-tests/ but not directly confirmed by file listing)
- LOW claims: 0
- UNVERIFIED claims: 1 (exact audit-schema.json enum values — inferred from consuming scripts, not read from source)
- Overall confidence: HIGH
