# D8b Findings: scripts/health/lib/ + Test Files

**Agent:** D8b
**Profile:** codebase
**Date:** 2026-04-18
**Scope:**
- `scripts/health/lib/*.js` (7 files)
- `scripts/health/lib/__tests__/*.test.js` (6 files)
- `scripts/health/lib/warning-lifecycle.test.js` (1 file, lives at lib/ top level)
- `scripts/health/mid-session-alerts.test.js` (top-level, D8a-noted)
- `scripts/health/run-health-check.test.js` (top-level, D8a-noted)
- `scripts/health/checkers/__tests__/*.test.js` (11 files)

**Pre-work read:** SCHEMA_SPEC.md v1.0 + D8a narrative.

---

## File Count Summary

| Location | Files |
|---|---|
| `scripts/health/lib/` (source) | 7 |
| `scripts/health/lib/__tests__/` | 6 |
| `scripts/health/lib/warning-lifecycle.test.js` (at lib/ root) | 1 |
| `scripts/health/` top-level test files | 2 |
| `scripts/health/checkers/__tests__/` | 11 |
| **Total inventoried** | **27** |

Combined with D8a's 14 files (3 top-level + 11 checkers), the full health
subsystem is **41 files** across 5 subdirectories.

---

## Lib File Inventory

| File | Type | Module System | Portability | Entry Point |
|---|---|---|---|---|
| `utils.js` | script-lib | CJS | portable | no |
| `scoring.js` | script-lib | CJS | portable | no |
| `dimensions.js` | script-lib | CJS | sanitize-then-portable | no |
| `composite.js` | script-lib | CJS | sanitize-then-portable | no |
| `health-log.js` | script-lib | **ESM** | sanitize-then-portable | yes (CLI) |
| `warning-lifecycle.js` | script-lib | **ESM** | sanitize-then-portable | no |
| `mid-session-alerts.js` | script-lib | **ESM** | sanitize-then-portable | yes (CLI spawn) |

**Module system split in lib/:** 4 CJS, 3 ESM. The CJS files are the
data-pure computation layer (scoring, composite, dimensions, utils). The ESM
files are the I/O layer (health-log, warning-lifecycle, mid-session-alerts).
This is a deliberate architectural split -- ESM files use `import.meta.url`
for runtime path resolution, which is unavailable in CJS.

**No nested package.json** in `scripts/health/` or `scripts/health/lib/`.
Root `package.json` has no `"type"` field (defaults to CJS). The ESM files
rely on explicit ESM syntax being recognized by the Node.js version in use
(22+), likely invoked directly as CLI processes (node file.js) where the
runtime infers ESM from the `import` keyword at top level. All three ESM lib
files use the `fileURLToPath(import.meta.url)` + `createRequire(import.meta.url)`
pattern for mixed-mode CJS interop.

---

## Consumer Matrix: Which Checkers Use Which Libs

| Lib | Consumers |
|---|---|
| `utils.js` | ALL 11 checkers (ROOT_DIR, safeParse, safeReadLines, runCommandSafe) |
| `scoring.js` | ALL 11 checkers (scoreMetric); also `composite.js`, `dimensions.js` |
| `dimensions.js` | `composite.js` only |
| `composite.js` | `run-health-check.js` only |
| `health-log.js` | `run-health-check.js` (appendHealthScore after run); also read by `mid-session-alerts.js` via its DEFAULT_PATHS.healthLogPath |
| `warning-lifecycle.js` | `mid-session-alerts.js` (createWarningRecord uses same underlying mechanism via reviews/dist) |
| `mid-session-alerts.js` | `commit-tracker.js` hook (async spawn via D3b); direct CLI invocation |

The dependency graph has a clear layering:

```
hooks (async spawn)
  └─ mid-session-alerts.js (ESM, CLI)
       └─ read-jsonl (scripts/lib)
       └─ safe-fs (scripts/lib)
       └─ reviews/dist/* (compiled TS)
       └─ append-hook-warning.js (scripts/)

run-health-check.js
  ├─ composite.js → scoring.js, dimensions.js
  ├─ ALL checkers → utils.js, scoring.js
  └─ health-log.js (post-run append)
       └─ safe-fs, parse-jsonl-line (scripts/lib)
       └─ scoring.js (computeTrend)
```

---

## Test Coverage Matrix

| Source File | Test File(s) | Framework | Module System |
|---|---|---|---|
| `lib/utils.js` | (no dedicated test) | — | — |
| `lib/scoring.js` | `lib/__tests__/scoring.test.js` + `scoring.property.test.js` | node:test + fast-check | CJS |
| `lib/dimensions.js` | `lib/__tests__/dimensions.test.js` | node:test | CJS |
| `lib/composite.js` | `lib/__tests__/composite.test.js` + `composite.property.test.js` | node:test + fast-check | CJS |
| `lib/health-log.js` | `lib/__tests__/health-log.test.js` | node:test | CJS (dynamic import for ESM exports) |
| `lib/warning-lifecycle.js` | `lib/warning-lifecycle.test.js` | node:test | ESM |
| `lib/mid-session-alerts.js` | `mid-session-alerts.test.js` (top-level) | node:test | ESM (dynamic import) |
| `run-health-check.js` | `run-health-check.test.js` (top-level) | node:test | CJS |
| `checkers/code-quality.js` | `checkers/__tests__/code-quality.test.js` | node:test | CJS |
| `checkers/data-effectiveness.js` | `checkers/__tests__/data-effectiveness.test.js` | node:test | CJS |
| `checkers/debt-health.js` | `checkers/__tests__/debt-health.test.js` | node:test | CJS |
| `checkers/documentation.js` | `checkers/__tests__/documentation.test.js` | node:test | CJS |
| `checkers/ecosystem-integration.js` | `checkers/__tests__/ecosystem-integration.test.js` | node:test | CJS |
| `checkers/hook-pipeline.js` | `checkers/__tests__/hook-pipeline.test.js` | node:test | CJS |
| `checkers/learning-effectiveness.js` | `checkers/__tests__/learning-effectiveness.test.js` | node:test | CJS |
| `checkers/pattern-enforcement.js` | `checkers/__tests__/pattern-enforcement.test.js` | node:test | CJS |
| `checkers/security.js` | `checkers/__tests__/security.test.js` | node:test | CJS |
| `checkers/session-management.js` | `checkers/__tests__/session-management.test.js` | node:test | CJS |
| `checkers/test-coverage.js` | `checkers/__tests__/test-coverage.test.js` | node:test | CJS |

**Gap: `utils.js` has no dedicated unit test.** It is indirectly tested
through every checker test (mocked via require.cache mutation pattern), but
there is no `utils.test.js` file. This is the single test coverage gap in
the health subsystem.

**Property-based tests:** `fast-check` is used for `scoring.js` and
`composite.js` -- the two pure numeric computation modules. This is a
production-quality signal.

**Test isolation pattern in checker tests:** All 11 checker tests use the
`require.cache` mutation technique to inject mutable function refs for
`utils.safeReadLines` and `utils.runCommandSafe`. This allows behavioral
control without filesystem or subprocess involvement. The pattern is
consistent across all checker tests.

---

## Deep-Dive: mid-session-alerts.js

### Invocation Chain

```
commit-tracker.js hook (D3b)
  └─ async execFile() / spawn()
       └─ node scripts/health/lib/mid-session-alerts.js
            (CLI entry at line 298: if process.argv[1] === __filename)
```

This is confirmed: `mid-session-alerts.js` IS the direct async-spawn target.
It has a CLI guard at the bottom (`if (process.argv[1] && resolve(process.argv[1]) === __filename)`)
that runs `runMidSessionChecks()` when invoked directly. Output goes to stderr
(`console.error`), which is the hook warning surface.

### Alert Schema

The `runMidSessionChecks(opts)` function returns:

```js
{
  alerts: Array<{
    type: "deferred-aging" | "duplicate-deferrals" | "score-degradation",
    message: string,
    severity: "warning" | "error"
  }>,
  skipped: number  // alerts suppressed by cooldown
}
```

### Three Alert Types

| Type | Trigger | Severity | Data Source |
|---|---|---|---|
| `deferred-aging` | Items with lifecycle `open`/`in-progress`/null AND `date <= 30 days ago` | `warning` | `data/ecosystem-v2/deferred-items.jsonl` |
| `duplicate-deferrals` | Same `title+category` (lowercased) appearing 2+ times within 7 days | `warning` | `data/ecosystem-v2/deferred-items.jsonl` |
| `score-degradation` | `previous.score - current.score >= 10` (last 2 entries) | `error` | `data/ecosystem-v2/ecosystem-health-log.jsonl` |

Note: duplicate-deferrals counts occurrences beyond first (so 3 records = 2
duplicates). The test confirms `"2 duplicate"` message for 3 identical records.

### Cooldown Mechanism

- **Cooldown file:** `.claude/hooks/.alerts-cooldown.json`
- **Schema:** `{ "alert-type": "ISO8601-timestamp" }`
- **Window:** 1 hour per alert type
- **Logic:** `isInCooldown(cooldown, alertType)` checks `Date.now() - lastFired < 3600000`
- **Persistence:** Written only when alerts fire AND `!opts.skipSideEffects`
- **Failure mode:** Cooldown write failure is swallowed (best-effort) -- alerts still surface

### Side Effects Pipeline (when not suppressed)

When an alert fires and `!opts.skipSideEffects`:

1. `createWarningRecord()` -- appends to `warnings.jsonl` via
   `scripts/reviews/dist/lib/write-jsonl` + `WarningRecord` Zod schema.
   Origin type: `"manual"`, tool: `"mid-session-alerts"`. Lifecycle: `"new"`.

2. `surfaceHookWarning()` -- `execFileSync(node, [append-hook-warning.js, ...args])` with timeout 5000ms.
   Hook args: `--hook=mid-session`, `--type=health`, `--severity=<sev>`, `--message=<msg>`.

3. `writeCooldown()` -- updates `.alerts-cooldown.json`.

All three are in `try/catch` blocks -- failure in any does not block alert
emission.

### Performance Target

File header: "Keeps execution under 2 seconds -- JSONL reads and date
comparisons only." No subprocesses in the check functions themselves
(subprocess only for side effects). `readJsonl` uses `read-jsonl` from
`scripts/lib/`, not `safeReadLines` (different utility).

### Data Contract: deferred-items.jsonl

Fields read by mid-session-alerts:
- `lifecycle`: string (`"open"`, `"in-progress"`, absent = treated as open)
- `date`: YYYY-MM-DD string
- `title`: string (for duplicate detection key)
- `category`: string (for duplicate detection key)

### Data Contract: ecosystem-health-log.jsonl

Fields read by mid-session-alerts:
- `score`: number (for degradation delta)

Written by `lib/health-log.js` `appendHealthScore()`. Full record schema per
D8a + health-log.js source:
```json
{
  "timestamp": "ISO8601",
  "mode": "full | quick",
  "score": 0-100,
  "grade": "A|B|C|D|F",
  "categoryScores": { ... },
  "dimensionScores": { ... },
  "summary": { "errors": N, "warnings": N, "info": N },
  "delta": { "previous_score": N|null, "change": N|null, "trend": "stable|improving|degrading|null" }
}
```

The data contract between `health-log.js` (writer) and `mid-session-alerts.js`
(reader) is: `{ score: number }` per entry. Only the `score` field is consumed.

---

## Lib Portability Assessment

| Lib | JASON-OS Portability | Primary Blocker |
|---|---|---|
| `utils.js` | Portable | None -- generic shell helpers |
| `scoring.js` | Portable | None -- pure math |
| `dimensions.js` | Sanitize-then-portable | 3 TDMS-specific dimensions (data-effectiveness, debt-aging, debt-velocity) need replacement |
| `composite.js` | Sanitize-then-portable | CATEGORY_WEIGHTS includes Data Effectiveness at 0.15; CHECKER_TO_CATEGORY references TDMS checkers |
| `health-log.js` | Sanitize-then-portable | DEFAULT_LOG_PATH (ecosystem-v2 dir); depends on scripts/lib/safe-fs and scripts/lib/parse-jsonl-line (both D7 scope, likely portable) |
| `warning-lifecycle.js` | Sanitize-then-portable | **Hard dependency on `scripts/reviews/dist/` compiled TypeScript.** This is the most problematic lib. The reviews system TypeScript must be built before this lib works. |
| `mid-session-alerts.js` | Sanitize-then-portable | deferred-items.jsonl TDMS concept needs JASON-OS equivalent; also reviews/dist dependency (best-effort caught) |

**Key insight:** `warning-lifecycle.js` and (partially) `mid-session-alerts.js`
have a hard dependency on `scripts/reviews/dist/` -- compiled TypeScript
artifacts that are not in the lib directory and require a separate build step.
`health-log.js` uses `safe-fs` and `parse-jsonl-line` from `scripts/lib/`
(D7 scope) -- those need to exist in JASON-OS.

---

## Learnings for Methodology

1. **ESM lib file detection:** The `import.meta.url` + `fileURLToPath` +
   `createRequire` triple is the canonical ESM-with-CJS-interop pattern in
   this codebase. When scanning lib files, check for this triple to classify
   as ESM even when the package.json has no `"type": "module"`. Extension
   alone (`*.js`) is insufficient.

2. **Test placement inconsistency within a single directory:** `warning-lifecycle.test.js`
   lives at `scripts/health/lib/` alongside the source it tests, while all
   other lib tests are in `lib/__tests__/`. This inconsistency is worth
   flagging for future port methodology -- when inventorying a directory,
   always glob `*.test.js` at the top level AND within `__tests__/`.

3. **Property-based tests signal production-quality:** `fast-check` usage for
   `scoring.js` and `composite.js` is a strong signal these files are
   production-grade and worth porting as-is. The property test fixtures reveal
   the full expected input shape (checker result objects with all metric keys).

4. **require.cache mutation as mock pattern:** All 11 checker tests use
   `require.cache[UTILS_PATH] = { exports: { safeReadLines: (...) => safeReadLinesFn(...) } }`
   to inject controllable mocks. This pattern requires CJS (would not work in
   ESM). When porting checker tests to JASON-OS, this pattern is the
   established convention.

5. **Compiled dist/ as dependency:** `scripts/reviews/dist/` is a compiled
   TypeScript build artifact that multiple health lib files depend on. Future
   scan agents covering `scripts/reviews/` should flag whether dist/ is
   checked into git or generated at build time. This is a cross-agent
   dependency that D8b cannot fully resolve from health scope alone.

6. **Test count heuristic:** The health subsystem has 27 test files for 14
   source files (lib + checkers), a ~2:1 test-to-source ratio. For 7 lib
   files, 8 test files exist (6 in __tests__/, 1 at lib root, plus the
   top-level mid-session-alerts.test.js). Only `utils.js` is untested.

7. **No `__tests__/` directory under `scripts/health/` top level:** The two
   top-level test files (`run-health-check.test.js`, `mid-session-alerts.test.js`)
   are co-located with their source at `scripts/health/`, not in a `__tests__/`
   subdirectory. This is distinct from the checker pattern (which uses
   `checkers/__tests__/`). The health system has 3 different test placement
   conventions in one directory tree.

---

## Gaps and Missing References

1. **`scripts/reviews/dist/` not inventoried:** `warning-lifecycle.js` and
   `mid-session-alerts.js` depend on `scripts/reviews/dist/lib/write-jsonl`,
   `scripts/reviews/dist/lib/read-jsonl`, and
   `scripts/reviews/dist/lib/schemas/warning`. Whether these are committed
   artifacts or generated at build time is unknown from D8b scope. This is a
   critical portability blocker for `warning-lifecycle.js`. D-agent covering
   `scripts/reviews/` should flag this.

2. **`scripts/lib/parse-jsonl-line.js` not confirmed:** `health-log.js`
   requires `../../lib/parse-jsonl-line`. D7 covered `scripts/lib/` --
   D7 findings should confirm this file exists and its portability status.

3. **`scripts/append-hook-warning.js` not inventoried in D8b scope:**
   `mid-session-alerts.js` calls it via `execFileSync`. This is in
   `scripts/` root (D6a-c scope). D6a-c should have it, or it may be a gap.

4. **`utils.js` has no dedicated test:** The most widely consumed lib in the
   health subsystem (used by all 11 checkers) has no direct unit test. Risk:
   any regression in ROOT_DIR discovery or `runCommandSafe` would only be
   caught by checker tests indirectly.

5. **`data/ecosystem-v2/` directory not inventoried by D8b:** The data
   directory containing `deferred-items.jsonl`, `ecosystem-health-log.jsonl`,
   `warnings.jsonl` is read by multiple health lib files. D8b scope is
   `scripts/health/` only. The data schema is inferred from source code -- not
   validated against actual file contents.

6. **fast-check version not confirmed:** `composite.property.test.js` and
   `scoring.property.test.js` require `fast-check` as an npm dependency. D8b
   has not confirmed it is listed in `package.json` `devDependencies`. If
   missing, property tests would fail at require time.

---

## Confidence Assessment

- HIGH claims: File inventory (direct filesystem read), module system
  classification (direct code read: `import` vs `require`), alert schema
  (direct code read of `runMidSessionChecks`), cooldown mechanism (direct
  code read), consumer matrix (direct imports traced), data contracts
  (deferred-items + ecosystem-health-log schemas from source), test placement
  locations, test framework usage (node:test throughout).
- MEDIUM claims: `scripts/reviews/dist/` artifact status (inferred as compiled
  TS, not confirmed as checked-in or generated), `fast-check` in devDependencies
  (not verified against package.json).
- LOW claims: None.
- UNVERIFIED claims: None.

**Overall confidence:** HIGH for D8b scope.
