# D8a Findings: scripts/health/ (top-level + checkers/)

**Agent:** D8a
**Profile:** codebase
**Date:** 2026-04-18
**Scope:** `scripts/health/*.js` + `scripts/health/checkers/*.js`
**Note:** `scripts/health/lib/` is covered by D8b. `checkers/__tests__/` are test files
(not inventoried here — test files were out of scope per methodology, but counted).

---

## File Count Summary

| Location | Files (non-lib) |
|---|---|
| `scripts/health/` top-level | 3 (run-health-check.js, run-health-check.test.js, mid-session-alerts.test.js) |
| `scripts/health/checkers/` | 11 checker .js files |
| `scripts/health/checkers/__tests__/` | 11 test files (noted, not inventoried as separate units) |
| **Total in scope** | **14 .js files** |

Expected 25-30 (from spawn prompt) — actual scope is 14. The remaining 25 files that
bring the total to 39 are: 7 lib/*.js files (D8b scope), 11 checkers/__tests__/*.js
tests, 6 lib/__tests__/*.js tests, and 1 lib/warning-lifecycle.test.js.

---

## Architecture: Single-Orchestrator Pattern

```
run-health-check.js (entry point, script type)
  |
  +-- lib/composite.js       [computeCompositeScore]   (D8b)
  +-- lib/dimensions.js      [getDimensionDetail, DIMENSIONS]  (D8b)
  +-- lib/scoring.js         [computeGrade]            (D8b)
  |
  +-- checkers/code-quality.js      [checkCodeQuality]
  +-- checkers/security.js          [checkSecurity]
  +-- checkers/debt-health.js       [checkDebtHealth]
  +-- checkers/test-coverage.js     [checkTestCoverage]
  +-- checkers/learning-effectiveness.js  [checkLearningEffectiveness]
  +-- checkers/hook-pipeline.js     [checkHookPipeline]
  +-- checkers/session-management.js  [checkSessionManagement]
  +-- checkers/documentation.js     [checkDocumentation]
  +-- checkers/pattern-enforcement.js  [checkPatternEnforcement]
  +-- checkers/ecosystem-integration.js  [checkEcosystemIntegration]
  +-- checkers/data-effectiveness.js  [checkDataEffectiveness]
```

Each checker is independent — no checker calls another. All checker → lib
dependencies go only through `lib/scoring` (scoreMetric) and `lib/utils`
(ROOT_DIR, safeParse, safeReadLines, runCommandSafe).

There is **no hook-analytics.js** or **run-github-health.js** orchestrator in
this directory. The single orchestrator is `run-health-check.js`.

---

## Checker Inventory by Domain

### Category: Code Quality
- **code-quality.js** — TypeScript errors (tsc), ESLint errors/warnings, pattern
  violations (custom ESLint plugin), circular dependencies, derived style score.
  Calls: `npm run type-check`, `npm run lint`, `npm run patterns:check`,
  `npm run deps:circular`.

### Category: Security
- **security.js** — npm audit (JSON parse for critical/high vulns), secret
  exposure detection via `npm run security:check`. Regex `/secret|credential|leak/i`.

### Category: Technical Debt
- **debt-health.js** — Reads `docs/technical-debt/metrics.json` (S0/S1 alert
  counts, summary) and `docs/technical-debt/MASTER_DEBT.jsonl` (per-item
  age calculation) plus intake/resolution 30-day logs.
  **SoNash-specific:** TDMS data files and S0/S1 severity classification.

### Category: Testing
- **test-coverage.js** — Reads `.claude/test-results/*.jsonl` (most recent
  file), computes pass rate, failure/error counts, staleness.
  **Portable:** standard JSONL schema (status: pass/fail/error, timestamp).

### Category: Learning & Patterns
- **learning-effectiveness.js** — Parses `docs/LEARNING_METRICS.md` markdown
  table (violations-per-PR, recurring categories rate).
  **SoNash-specific:** file name and table structure.

- **pattern-enforcement.js** — Reads `.claude/state/warned-files.json` for
  hotspot file counts / repeat offenders (3+ warnings). Also calls
  `npm run patterns:sync` and `npm run patterns:check`.

### Category: Infrastructure
- **hook-pipeline.js** — Most complex checker (206 lines). Reads 3 state
  files: `hook-warnings-log.jsonl`, `override-log.jsonl`, `commit-failures.jsonl`.
  Also reads `.git/hook-output.log`. Computes 12 metrics over 7-day and 24-hour
  windows. Runs `git log` for noise ratio.
  **Key schema contracts** (consumed from state files):
  - `hook-warnings-log.jsonl`: `{timestamp, hook, type, ...}`
  - `override-log.jsonl`: `{timestamp, reason, ...}`
  - `commit-failures.jsonl`: `{timestamp, failedCheck, ...}`

### Category: Documentation
- **documentation.js** — Checks `docs/SESSION_CONTEXT.md` mtime, runs
  `npm run validate:canon`, `crossdoc:check`, `docs:placement`,
  `docs:external-links`, counts .md files in docs/.
  **SoNash-specific:** SESSION_CONTEXT.md sentinel file, all 4 npm scripts.

### Category: Process & Workflow
- **session-management.js** — git status --porcelain (uncommitted count),
  git log (branch staleness), `.claude/hooks/.session-state.json`
  (session gap). **Highly portable** — generic git + session state.

- **ecosystem-integration.js** — Most coupled to SoNash services. Reads
  `review-metrics.jsonl` (pr-review skill output), calls `gh run list`,
  `npm run sonar:check`, reads `velocity-log.jsonl`, calls `reviews:sync-check`
  and `review:churn`. Contains SonarCloud, GitHub CLI, and SoNash PR review
  system dependencies.

### Category: Data Effectiveness
- **data-effectiveness.js** — Reads `.claude/state/lifecycle-scores.jsonl`
  (TDMS data-lifecycle scoring). Schema: `{total, recall, action}` per system.
  **SoNash-specific:** lifecycle-scores concept is TDMS data management.

---

## Health Score Aggregation Mechanism

Run-health-check.js collects all checker return values into `checkerResults`
(keyed by checker name). Each checker returns:

```js
{
  metrics: {
    metric_name: {
      value: <number>,
      score: <0-100>,
      rating: "good" | "average" | "poor",
      benchmark: { good: N, average: N, poor: N }
    }
  },
  no_data: boolean
}
```

Then delegates to `lib/composite.js` (D8b scope) which:
1. Maps each checker to one or more **dimensions** (14 total per tests)
2. Aggregates dimensions into **9 categories**
3. Produces a weighted **composite score** (0-100) + letter grade (A-F)

The `computeGrade()` function in `lib/scoring.js` assigns: A(90+), B(80+), C(70+),
D(60+), F(<60).

Output JSON schema:
```json
{
  "timestamp": "ISO8601",
  "mode": "full | quick",
  "score": 0-100,
  "grade": "A|B|C|D|F",
  "categoryScores": { "Code Quality": { "score": N, "grade": "X", "no_data": bool }, ... },
  "dimensionScores": { "dim-id": { "score": N, "grade": "X", "no_data": bool }, ... },
  "checkerResults": { ... full per-checker metrics ... }
}
```

---

## Quick-Mode vs Full-Mode Checkers

| Checker | quick:true | Domain |
|---|---|---|
| code-quality | YES | Code Quality |
| security | YES | Security |
| debt-health | YES | Technical Debt |
| test-coverage | YES | Testing |
| learning-effectiveness | no | Learning & Patterns |
| hook-pipeline | no | Infrastructure |
| session-management | no | Process & Workflow |
| documentation | no | Documentation |
| pattern-enforcement | no | Learning & Patterns |
| ecosystem-integration | no | Process & Workflow |
| data-effectiveness | no | Data Effectiveness |

---

## Portable vs SoNash-Specific Breakdown

### Portable (minimal or no changes needed)
- `run-health-check.js` — orchestrator pattern is fully portable; just swap
  which checkers are registered
- `checkers/test-coverage.js` — generic JSONL test-results schema
- `checkers/session-management.js` — git + generic session-state schema
- `checkers/security.js` — npm audit + generic security script hook
  (script name `security:check` is replaceable)

### Sanitize-then-portable (concept portable, data/scripts SoNash-specific)
- `checkers/code-quality.js` — npm script names require replacement; TS/ESLint
  concept is generic
- `checkers/hook-pipeline.js` — state file paths/schemas are the contract;
  concept is generic; noise ratio pattern is SoNash commit convention
- `checkers/session-management.js` — fully portable
- `checkers/documentation.js` — SESSION_CONTEXT.md sentinel and all 4 npm scripts
  need replacement; doc-count approach is portable
- `checkers/pattern-enforcement.js` — warned-files.json concept portable;
  SoNash custom ESLint plugin scripts need replacement
- `checkers/learning-effectiveness.js` — LEARNING_METRICS.md structure SoNash-specific

### Not-portable (requires rebuild for JASON-OS)
- `checkers/debt-health.js` — reads TDMS-specific data files (MASTER_DEBT.jsonl,
  metrics.json, intake/resolution logs). The TDMS does not exist in JASON-OS.
- `checkers/data-effectiveness.js` — reads lifecycle-scores.jsonl, a TDMS
  concept. No direct JASON-OS equivalent.
- `checkers/ecosystem-integration.js` — deeply coupled to SoNash PR review
  skill (review-metrics.jsonl, fix_ratio, review_rounds), SonarCloud, and
  velocity-log; most of these don't exist in JASON-OS yet. Partially portable
  (ci_failures via gh, session-related metrics).

---

## Mid-Session Alerts: D3b Watchpoint Resolution

`mid-session-alerts.js` lives at `scripts/health/lib/mid-session-alerts.js`
(D8b scope). The test file `mid-session-alerts.test.js` is at the top level
of `scripts/health/` (D8a scope) and imports via `./lib/mid-session-alerts.js`.

Alert types detected (from test file):
- `deferred-aging` — items >30 days old in deferred-items.jsonl
- `duplicate-deferrals` — same title appearing 3+ times within 7 days
- `score-degradation` — health score dropped 10+ points between latest two entries
  in ecosystem-health-log.jsonl

Cooldown mechanism: 1-hour per alert type, stored in `alerts-cooldown.json`.

The test file uses ESM (`import`) while the rest of the project is CJS — the
test runner must be invoked with `--experimental-vm-modules` or equivalent,
or the test file must be run with a separate ESM-compatible node invocation.

---

## Module System Notes

All `checkers/*.js` and `run-health-check.js` use CJS (`"use strict"` + `require()`).
`mid-session-alerts.test.js` uses ESM (`import` statements) despite no
`"type": "module"` in `package.json`. This is a deliberate mixed-module pattern
(lib/mid-session-alerts.js itself appears to be ESM given the dynamic `import()`
in the test). D8b will confirm mid-session-alerts.js module system.

---

## Serendipitous Discovery: __tests__ Subdirectory Under checkers/

Each of the 11 checkers has a corresponding test in `checkers/__tests__/`. This
means the health system has 3-tier test coverage:
1. `checkers/__tests__/*.test.js` — per-checker unit tests
2. `lib/__tests__/*.test.js` — lib unit tests (D8b scope)
3. `run-health-check.test.js` — integration tests across all checkers + lib

This is unusually thorough for a health-check subsystem and is a strong signal
that the entire health system was built as production-quality infrastructure,
not a diagnostic script.

---

## Learnings for Methodology

1. **File count discrepancy:** The spawn prompt expected 25-30 files; actual
   scope was 14 (top-level + checkers only). The full directory has 39 files
   but 25 are in lib/ and __tests__ subdirs. Future spawn prompts should use
   `find -maxdepth 1` and `find checkers/ -maxdepth 1` separately rather than
   estimating from total.

2. **Test files co-located at top level:** `run-health-check.test.js` and
   `mid-session-alerts.test.js` sit at `scripts/health/` top level alongside
   the entry point — not in a `__tests__/` dir. Checkers use `__tests__/`
   subdirs. Inconsistent placement is worth noting for port methodology.

3. **Mixed CJS/ESM in one package:** The test for an ESM lib lives at
   top-level health directory using ESM import syntax while all checkers and
   the orchestrator use CJS. Any port must handle this split explicitly.

4. **Checker scope classification rule:** A checker that only reads generic
   git/node state (session-management, test-coverage) can be classified
   `portable` immediately. Any checker that reads files from `docs/` or
   product-specific npm scripts should be `sanitize-then-portable`. Any checker
   reading TDMS-specific data schemas (debt-health, data-effectiveness) is
   practically `not-portable` for JASON-OS Phase 1.

5. **Benchmark objects are data contracts:** The `BENCHMARKS` object in each
   checker is a data contract the composite scorer relies on. When porting
   a checker to JASON-OS, these benchmarks need review and possibly replacement
   with new thresholds appropriate to the new project.

6. **no_data:true pattern is a portability feature:** Checkers gracefully
   return `{metrics:{}, no_data:true}` when data sources are absent. This
   makes partial deployment viable — JASON-OS can port only the portable
   checkers and the others simply return no_data without crashing the
   orchestrator.

---

## Gaps and Missing References

1. **lib/ contents not inventoried here** (D8b scope): composite.js,
   dimensions.js, scoring.js, utils.js, health-log.js, mid-session-alerts.js,
   warning-lifecycle.js. The composite/dimensions/scoring call graph is the
   heart of the aggregation mechanism — D8b data is required to fully document
   the output schema.

2. **Dimension-to-checker mapping unknown:** Which of the 14 dimensions maps
   to which checker/metric is defined in `lib/dimensions.js` (D8b). The tests
   confirm 14 dimensions and 9 categories but the specific mappings are not
   visible from the orchestrator or checker files.

3. **mid-session-alerts.js ESM confirmation pending:** D8b should confirm
   whether `lib/mid-session-alerts.js` uses `export` (ESM) — the test uses
   dynamic `import()` suggesting yes.

4. **How mid-session-alerts is invoked:** The test file confirms the API
   (`runMidSessionChecks(opts)`), but the invocation path from the hook system
   is not visible in this scope. D3b (commit-tracker.js) reportedly
   async-spawns it. Confirm whether `scripts/health/lib/mid-session-alerts.js`
   is the async-spawn target or if there is a top-level wrapper.

5. **checkers/__tests__ not inventoried:** 11 test files in
   `checkers/__tests__/` were discovered but not read. They exist and provide
   coverage evidence. D8b should note if any reveal unexpected dependencies.

6. **ecosystem-health-log.jsonl consumer:** mid-session-alerts reads
   `ecosystem-health-log.jsonl` for score degradation detection. Where is this
   file written? Likely by `lib/health-log.js` (D8b) which is invoked by the
   orchestrator after runs — but this is unconfirmed from this scope.

---

## Confidence Assessment

- HIGH claims: File inventory (direct filesystem read), orchestrator call graph
  (direct code read), checker return schemas (direct code read), module system
  classification (require() vs import visible in source), portability classifications.
- MEDIUM claims: Aggregation mechanism (partially — lib/composite is D8b scope),
  mid-session-alerts invocation path (test reveals API but not caller chain).
- LOW claims: None.
- UNVERIFIED claims: None.

**Overall confidence:** HIGH for D8a scope. Key gaps are D8b dependencies.
