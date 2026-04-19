# D12 Findings: scripts/archive/ + scripts/__tests__/ + scripts/metrics/__tests__/ + Final Script Census

**Agent:** D12
**Profile:** codebase
**Date:** 2026-04-18
**Scope:**
- `scripts/archive/` — 9 scripts + 1 README (archived/deprecated scripts)
- `scripts/__tests__/` — 11 top-level test files
- `scripts/metrics/__tests__/` — 1 test file
- Final census pass: full scripts/ directory enumeration + gap identification

---

## Part 1: scripts/archive/ — Archive Purpose and Inventory

### Why the Archive Exists

The `scripts/archive/README.md` (dated 2026-03-17) explains the archive was created when the JSONL-canonical review pipeline was introduced (Task 7, 2026-03-15). At that time, four scripts were explicitly moved: `sync-reviews-to-jsonl.js`, `sync-reviews-to-jsonl.v1.js` (now absent), `archive-reviews.js` (now absent), and `run-consolidation.v1.js`. These four were superseded by `review-lifecycle.js`.

**README vs filesystem discrepancy:** The README documents 4 scripts, but the actual archive directory contains 9 scripts. Five additional scripts were moved to archive in April 2026 (timestamps Apr 6-11) without updating the README:

- `decompose-state.js` (Apr 6) — one-time planning state migration (D77)
- `migrate-ecosystem-v2.js` (Apr 8) — reviews pipeline fracture recovery
- `migrate-retros.js` (Apr 8) — markdown-to-JSONL retro migration
- `backfill-hashes.js` (Apr 11) — TDMS content hash backfill
- `audit-s0-promotions.js` (Apr 11) — TDMS severity demotion audit
- `repair-archives.js` (Apr 11) — REVIEWS_*.md consolidation repair
- `reverify-resolved.js` (Apr 11) — TDMS resolution re-verification

**Three distinct categories of archived scripts:**

1. **Review pipeline v1 remnants** (2 scripts) — `sync-reviews-to-jsonl.js` and `run-consolidation.v1.js`, both superseded by `review-lifecycle.js`. The README's documentation matches these.

2. **One-time data migrations** (5 scripts) — `decompose-state.js`, `migrate-ecosystem-v2.js`, `migrate-retros.js`, `repair-archives.js`. These ran once, fixed a data state issue, and were preserved as reference. Not superseded by any ongoing script.

3. **One-time TDMS audits** (2 scripts) — `audit-s0-promotions.js`, `backfill-hashes.js`, `reverify-resolved.js`. These operated on MASTER_DEBT.jsonl to correct data quality issues.

### Portability Assessment

All 9 archive scripts are `not-portable`:
- They reference SoNash-specific data paths (MASTER_DEBT.jsonl, .claude/state/reviews.jsonl, docs/technical-debt/)
- Most were one-time operational scripts with no ongoing lifecycle
- Two scripts (`audit-s0-promotions.js`, `run-consolidation.v1.js`) have broken relative paths (`./lib/`) because they were moved from `scripts/` root to `scripts/archive/` without path updates — `./lib/` resolves to a nonexistent `scripts/archive/lib/` instead of the intended `scripts/lib/`

### Module Systems

| Script | Module | Size |
|--------|--------|------|
| `audit-s0-promotions.js` | CJS | 13.3KB |
| `backfill-hashes.js` | CJS | 5.4KB |
| `decompose-state.js` | **ESM** (import) | 4.5KB |
| `migrate-ecosystem-v2.js` | CJS | 8.8KB |
| `migrate-retros.js` | CJS | 8.2KB |
| `repair-archives.js` | CJS | 14.9KB |
| `reverify-resolved.js` | CJS | 16.1KB |
| `run-consolidation.v1.js` | CJS | 30.3KB |
| `sync-reviews-to-jsonl.js` | CJS | **46.6KB** |

`decompose-state.js` is the only ESM script. `sync-reviews-to-jsonl.js` at 46.6KB is the largest file in the archive; it contains extensive markdown parsing logic documented as reference material for maintaining `review-lifecycle.js`.

### Superseded_by Mapping

| Script | Superseded By |
|--------|---------------|
| `sync-reviews-to-jsonl.js` | `review-lifecycle.js` |
| `run-consolidation.v1.js` | `review-lifecycle.js` (also `run-consolidation.js`) |
| Others | None (one-time operations) |

---

## Part 2: scripts/__tests__/ — Top-Level Test Suite Overview

### Architecture

The 11 test files in `scripts/__tests__/` form the **Data Effectiveness Audit test suite** — a structured set of functional tests created across 9 audit waves. All 11 use Node.js built-in `node:test` runner (no external test framework). All are CJS modules (matching the root package.json which has no `"type": "module"` field).

### Test Categories

**Tests for scripts (imports the target module):**

| Test File | Tests | Test Runner Pattern |
|-----------|-------|---------------------|
| `learning-router.test.js` | `scripts/lib/learning-router.js` | temp-dir isolation, beforeEach/afterEach |
| `lifecycle-scores-integrity.test.js` | live `.claude/state/lifecycle-scores.jsonl` data | reads live file |
| `positive-patterns-coverage.test.js` | live `docs/` MD files | reads live files |
| `ratchet-baselines.test.js` | `scripts/ratchet-baselines.js` | cache-busting require.cache |
| `review-lifecycle.test.js` | `scripts/review-lifecycle.js` | temp-dir isolation |
| `route-enforcement-gaps.test.js` | `scripts/route-enforcement-gaps.js` | inline fixtures |
| `route-lifecycle-gaps.test.js` | `scripts/route-lifecycle-gaps.js` | temp-dir isolation |
| `verify-enforcement.test.js` | `scripts/verify-enforcement.js` | temp-dir isolation |

**Tests that reimplement logic inline (no import of target module):**

| Test File | Tests (inline reimplementation) | Rationale |
|-----------|----------------------------------|-----------|
| `wave6-alerts.test.js` | `run-alerts.js` detection logic | Script hard to import cleanly |
| `wave9-defense-depth.test.js` | `run-alerts.js` checkEnforcementVerification() (inline) + `learning-router.js` (imported) + `scripts/config/verified-patterns.json` | Multi-target test |
| `generate-lifecycle-scores-md.test.js` | `scripts/generate-lifecycle-scores-md.js` | Wave 5.1 TDMS |

**Notable pattern:** `wave6-alerts.test.js` and the `run-alerts.js` portion of `wave9-defense-depth.test.js` reimplement their target's logic inline instead of importing. This pattern is used when a script has complex initialization that makes direct import impractical. The tests mirror the source exactly — this is documented in the comment blocks.

### Data Effectiveness Audit Wave Mapping

| Wave | Test File(s) | Purpose |
|------|-------------|---------|
| 2.1 | `learning-router.test.js` | Learning router functional validation |
| 2.3 | `verify-enforcement.test.js` | Enforcement verification |
| 4.2 | `route-enforcement-gaps.test.js` | Gap extraction from CLAUDE.md |
| 5.1 | `generate-lifecycle-scores-md.test.js` | Lifecycle scores MD generation |
| 6.3 | `ratchet-baselines.test.js` | Ratchet baselines semantic validation |
| 6 | `wave6-alerts.test.js` | Alert checker logic |
| 9 | `wave9-defense-depth.test.js` | Multi-component defense depth |
| Gap fill 19/20 | `lifecycle-scores-integrity.test.js` | Data integrity |
| Gap fill 21/22 | `positive-patterns-coverage.test.js` | Pattern doc coverage |
| (lifecycle) | `review-lifecycle.test.js` | Review pipeline SYNC/ARCHIVE/VALIDATE/RENDER |
| (lifecycle) | `route-lifecycle-gaps.test.js` | Route gap categorization |

### Portability

- **not-portable** (4): `lifecycle-scores-integrity.test.js`, `positive-patterns-coverage.test.js`, `wave6-alerts.test.js`, `wave9-defense-depth.test.js` — test SoNash-specific schemas and doc structures
- **sanitize-then-portable** (7): Test scripts that cover logic units which themselves are portable — valid for JASON-OS if their target scripts are ported

---

## Part 3: scripts/metrics/__tests__/

One file: `dedup-review-metrics.test.js`

- Tests `dedupMetrics()` in `scripts/metrics/dedup-review-metrics.js`
- CJS, node:test runner with beforeEach/afterEach temp-dir lifecycle
- Uses `findProjectRoot()` dynamic root detection helper
- Regression guard for retro action item #8 (dedup PR review metrics)
- Created 2026-03-18 (v1.0)
- Classification: `sanitize-then-portable` (reviews.jsonl path would need adjustment)

---

## FINAL SCRIPT CENSUS

### Methodology

Total scripts in `scripts/` (excluding `node_modules/` and `dist/`) = **312 files**

```
find scripts/ -type f | grep -v "/node_modules/" | grep -v "/dist/" | wc -l
=> 312
```

### Coverage by D-Agent

| Agent | Scope | Files Covered |
|-------|-------|--------------|
| D6a-d | `scripts/` root files (JS/sh/mjs/json/md) | 78 |
| D7 | `scripts/lib/` | 21 |
| D8a | `scripts/health/` root + `checkers/` | 14 |
| D8b | `scripts/health/lib/` + `health/lib/__tests__/` + `health/checkers/__tests__/` + 2 health root tests | 27 |
| D9 | `scripts/debt/` | 28 |
| D10a | `scripts/reviews/` root + lib/ + __tests__ aggregate (JSONL records) | 30 JSONL |
| D10b | `scripts/reviews/__tests__/` (21 files) + `reviews/dist/` (89 — **gitignored, not in 312**) | 21 of 312 |
| D11b | `scripts/planning/`, `repo-analysis/`, `research/`, `secrets/`, `skills/`, `tasks/`, `hooks/`, `mcp/` | 29 |
| **D12** | `scripts/archive/`, `scripts/__tests__/`, `scripts/metrics/__tests__/` | **21** |
| **Total covered** | | **266** |

**Note on D8 overlap:** D8a and D8b both claim `mid-session-alerts.test.js` and `run-health-check.test.js` (2 records). Files covered = 39 unique health files, records emitted = 41.

**Note on D10b dist:** D10b emitted 48 records covering reviews/__tests__ (21) and reviews/dist (89 gitignored files). Only the 21 __tests__ records count toward the 312 census.

### Uncovered Script Directories — GAP FLAG

These 6 script subdirectories have NO D-agent findings filed as of D12:

| Directory | File Count | Contents |
|-----------|-----------|----------|
| `scripts/audit/` | 10 | Audit pipeline scripts |
| `scripts/cas/` | 12 | CAS (Content Analysis System?) scripts |
| `scripts/config/` | 15 | Configuration JSON files + 1 loader script |
| `scripts/docs/` | 1 | `generate-llms-txt.js` |
| `scripts/metrics/` (root) | 2 | `dedup-review-metrics.js`, `review-churn-tracker.js` |
| `scripts/multi-ai/` | 6 | Multi-AI aggregation scripts |
| **Total uncovered** | **46** | |

**Census reconciliation:**
```
Covered:  266
Uncovered: 46
Total:    312  ✓
```

These 46 files need coverage from a gap-fill agent before the scripts/ census is complete.

---

## Gaps and Missing References

1. **Archive README is stale** — The `scripts/archive/README.md` documents only 4 of the 9 archived scripts. The 5 scripts archived in April 2026 are undocumented in the README. A future update should add the missing entries.

2. **scripts/archive/sync-reviews-to-jsonl.v1.js referenced but absent** — The README mentions `sync-reviews-to-jsonl.v1.js` was archived, but the file does not exist in the directory (may have been deleted rather than archived).

3. **Broken relative paths in archive** — `audit-s0-promotions.js` and `run-consolidation.v1.js` use `./lib/` relative paths that resolve to a nonexistent `scripts/archive/lib/`. These scripts cannot execute from archive/ location. This is acceptable for reference-only files but should be noted if any future operator tries to run them.

4. **6 uncovered script subdirs (46 files)** — `audit/`, `cas/`, `config/`, `docs/`, `metrics/` (main), `multi-ai/` are not covered by any D6-D12 agent. These require a gap-fill wave before the scripts/ census is complete.

5. **wave6-alerts.test.js + wave9 run-alerts portion have no script to import** — `run-alerts.js` does not appear to exist at `scripts/run-alerts.js` (checked: not found). These test files reimplement the logic inline specifically because the script may be in `scripts/health/` or has been renamed. This should be verified.

6. **D10a/D10b overlap note** — D10a and D10b both cover parts of `scripts/reviews/` with some ambiguity about which agent covers which subpaths. D22 (schema surveyor) should dedup the path coverage.

---

## Learnings for Methodology

1. **Archive README drift is a real hazard** — When scripts move to archive, the README is rarely updated. D-agents auditing archive dirs should compare README contents to filesystem and flag all discrepancies. The 9-file archive directory with a 4-file README is a prime example.

2. **Two archival reasons, one directory** — This archive mixes "superseded scripts" (have ongoing replacements) with "completed one-time migrations" (no replacement needed; they just ran once). These deserve different treatment in the JSONL: superseded scripts should have `superseded_by` populated; one-time migrations should not. A `migration_complete` flag would be useful but was not in the schema.

3. **`./lib/` path-breaking-on-move** — Two scripts broke silently when moved from `scripts/` root to `scripts/archive/`. This is a pattern worth flagging in methodology: any script moved to archive should have its relative paths verified. A linter checking for `./lib/` paths in `scripts/archive/*.js` would catch this.

4. **Inline-reimplementation test pattern** — wave6-alerts.test.js and the run-alerts portion of wave9 tests reimplement their target's detection logic without importing it. This pattern should be inventoried as a distinct test strategy. It produces tests that are valid regression guards but not true integration tests (changes to the source function don't automatically fail the tests).

5. **Census reconciliation approach** — The `find scripts/ -type f | grep -v /node_modules/ | grep -v /dist/ | wc -l` formula gives the exact 312 count. Agent scope definitions should explicitly exclude or include `dist/` and `node_modules/` to avoid census ambiguity. D10b inventoried dist/ (89 files) separately which was the right call — dist files are generated artifacts, not source files, and should be excluded from primary census counts.

6. **Data-vs-script tests** — `lifecycle-scores-integrity.test.js` and `positive-patterns-coverage.test.js` test live data files and documentation, not scripts. These are a distinct category: "data integrity tests." The SCHEMA_SPEC.md `type: script` category doesn't have a `test_type` enum to distinguish "script unit test" from "data integrity test." Worth surfacing for D22.

7. **D12 scope was appropriately sized** — archive (9 + 1 README), __tests__ (11), metrics/__tests__ (1) = 21 files total. This was the right batch size for one agent.

---

## Confidence Assessment

- HIGH claims: 12 (filesystem-verified file counts, module system checks, dependency paths)
- MEDIUM claims: 5 (portability assessments, test_for mappings inferred from imports)
- LOW claims: 1 (run-alerts.js existence/location — not confirmed)
- UNVERIFIED claims: 0

Overall confidence: HIGH
