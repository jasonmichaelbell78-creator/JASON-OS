# D10b Findings: scripts/reviews/__tests__/ + scripts/reviews/dist/

**Agent:** D10b
**Profile:** codebase
**Date:** 2026-04-18
**Scope:** `scripts/reviews/__tests__/` (all test files) and `scripts/reviews/dist/` (compiled artifacts)

---

## Summary

- **Test files:** 21 (18 TypeScript + 3 JavaScript)
- **Source files tested:** 27 of 29 non-config source files (D10a inventory = 30, subtract tsconfig.json = 29)
- **Uncovered source files:** 3 (dedup-reviews.js, compute-changelog-metrics.js, validate-jsonl-schemas.js)
- **Test coverage:** ~93% of source files have at least one test
- **dist/ file count:** 89 total files (1 tsbuildinfo + 18 root .js + 18 root .d.ts + 8 lib .js + 8 lib .d.ts + 9 schemas .js + 9 schemas .d.ts + 18 __tests__ .js + 18 __tests__ .d.ts)
- **dist/ gitignore status:** GITIGNORED — `scripts/reviews/dist` is in root `.gitignore` line 25
- **Regeneration command:** `cd scripts/reviews && npx tsc`

---

## Test Coverage Map

### Tests organized by source target

| Test File | Module System | Source Target(s) | Portability |
|-----------|---------------|------------------|-------------|
| `backfill-reviews.test.ts` | cjs | `backfill-reviews.ts` | not-portable |
| `build-enforcement-manifest.test.ts` | cjs | `build-enforcement-manifest.ts` | not-portable |
| `completeness.test.ts` | cjs | `lib/completeness.ts` | portable |
| `dedup-debt.test.ts` | cjs | `dedup-debt.ts` | not-portable |
| `enforcement-manifest.test.ts` | cjs | `lib/enforcement-manifest.ts` | not-portable |
| `generate-claude-antipatterns.test.ts` | cjs | `lib/generate-claude-antipatterns.ts` | not-portable |
| `generate-fix-template-stubs.test.ts` | cjs | `lib/generate-fix-template-stubs.ts` | not-portable |
| `parse-review.test.ts` | cjs | `lib/parse-review.ts` | not-portable |
| `promote-patterns.test.ts` | cjs | `lib/promote-patterns.ts` | not-portable |
| `promotion-pipeline.test.ts` | cjs | `lib/promote-patterns.ts` (integration) | not-portable |
| `read-write-jsonl.test.ts` | cjs | `lib/read-jsonl.ts` + `lib/write-jsonl.ts` | portable |
| `render-reviews-to-md.test.ts` | cjs | `render-reviews-to-md.ts` | sanitize-then-portable |
| `schemas.test.ts` | cjs | `lib/schemas/` (all 7 entity schemas) | sanitize-then-portable |
| `verify-enforcement-manifest.test.ts` | cjs | `verify-enforcement-manifest.ts` | not-portable |
| `write-deferred-items.test.ts` | cjs | `write-deferred-items.ts` | sanitize-then-portable |
| `write-invocation.test.ts` | cjs | `write-invocation.ts` | sanitize-then-portable |
| `write-retro-record.test.ts` | cjs | `write-retro-record.ts` | sanitize-then-portable |
| `write-review-record.test.ts` | cjs | `write-review-record.ts` | sanitize-then-portable |
| `cross-db-validation.test.js` | cjs | `scripts/review-lifecycle.js` (D6b) | not-portable |
| `disposition-validation.test.js` | cjs | `write-review-record.ts` + `review-lifecycle.js` | sanitize-then-portable |
| `pipeline-consistency.test.js` | cjs | `write-review-record.ts` + `render-reviews-to-md.ts` + `review-lifecycle.js` | not-portable |

### Source files with NO test coverage

| Source File | D10a Portability | Why No Test |
|-------------|-----------------|-------------|
| `dedup-reviews.js` | sanitize-then-portable | Maintenance utility; exports for manual dedup runs |
| `compute-changelog-metrics.js` | sanitize-then-portable | CLI-only metrics computation |
| `validate-jsonl-schemas.js` | sanitize-then-portable | Requires dist/ at runtime; likely tested via integration rather than unit tests |

### Double-covered sources

`lib/promote-patterns.ts` has two test files: `promote-patterns.test.ts` (unit) and `promotion-pipeline.test.ts` (integration). This is intentional — the unit file tests pure functions in isolation, the pipeline file tests the full orchestrator.

`render-reviews-to-md.ts` is the only source that is tested via a direct TypeScript import (`from '../render-reviews-to-md'`) rather than via `require(path.resolve(PROJECT_ROOT, 'scripts/reviews/dist/...'))`. All other TS tests load the compiled dist artifact.

---

## Test Architecture Notes

### Common patterns across all tests

1. **findProjectRoot() helper** — every test file (TS and JS) contains an identical `findProjectRoot(startDir)` walk-up function. This makes tests portable across invocation locations (run from `__tests__/`, from `dist/__tests__/`, or from project root). An inline utility rather than a shared module.

2. **dist/ loading pattern** — 17 of 18 TS tests do: `require(path.resolve(PROJECT_ROOT, 'scripts/reviews/dist/<module>.js'))`. This means tests require a compiled dist/ before running. The single exception is `render-reviews-to-md.test.ts` which imports from TS source.

3. **Temp directory isolation** — tests that do file I/O use `os.tmpdir()` + `beforeEach`/`afterEach` cleanup. No test touches production JSONL files.

4. **SEC-008 guard** — `write-review-record.test.ts` includes `assertWithinRoot()` for path traversal checks, demonstrating the security pattern from `scripts/lib/security-helpers.js` applied within tests.

5. **Node.js built-in test runner** — all tests use `node:test` (`describe`, `test`, `beforeEach`, `afterEach`). No Vitest or Jest.

### Out-of-scope tests in __tests__/

Three `.js` test files (`cross-db-validation`, `disposition-validation`, `pipeline-consistency`) test logic primarily in `scripts/review-lifecycle.js` (D6b scope). They are placed in `__tests__/` but target a file outside the `scripts/reviews/` subtree. This is architecturally awkward — these are cross-subsystem regression guards born from specific retro action items (retro items #3 and #14 per test docstrings). They are NOT compiled via tsconfig (they are plain CJS .js files), so they do not appear in `dist/__tests__/`.

---

## dist/ Enumeration

### Gitignore status

`scripts/reviews/dist` appears as line 25 in the root `.gitignore`. The directory is fully gitignored. It is present on disk (built locally) but not committed. `dist-tests/` (line 24) is a separate gitignored directory at the project root for the global test build output.

### Regeneration command

```
cd scripts/reviews && npx tsc
```

This uses `scripts/reviews/tsconfig.json` which extends `../../tsconfig.json` and sets:
- `outDir: ./dist`
- `module: commonjs`
- `target: ES2019`
- `declaration: true` (generates .d.ts twins)
- `include: ["lib/**/*.ts", "*.ts", "__tests__/**/*.ts"]`

**Important:** The `__tests__/*.ts` files ARE included in this compile. This means `dist/__tests__/` contains compiled test artifacts — not the test runner path for CI. The root `npm test` uses `tsconfig.test.json` which compiles tests to `dist-tests/` separately with `scripts/reviews/__tests__/**/*.ts` in its include list. The two compile paths (local `dist/__tests__/` and root `dist-tests/`) produce the same compiled test output in different locations.

### dist/ structure and file counts

| Directory | .js files | .d.ts files | Notes |
|-----------|-----------|-------------|-------|
| `dist/` root | 9 | 9 | 9 TS entry points — all 9 compiled correctly |
| `dist/lib/` | 8 | 8 | All 8 lib modules compiled — no gaps |
| `dist/lib/schemas/` | 9 | 9 | All 9 schema files compiled (8 entity + 1 index) |
| `dist/__tests__/` | 18 | 18 | 18 compiled TS tests (3 CJS .js tests excluded) |
| `dist/` misc | 1 (tsbuildinfo) | — | Incremental build cache |
| **Total** | **44 .js** | **44 .d.ts** | **+1 tsbuildinfo = 89 files** |

### Compilation gaps (TS sources NOT in dist/)

None — all 9 root `.ts` entry points, all 8 `lib/*.ts` files, and all 9 `lib/schemas/*.ts` files have corresponding compiled artifacts. The `render-reviews-to-md.ts` file appears in dist/ even though it is invoked via `npx tsx` (not `node dist/`) in the npm scripts — the dist artifact exists and is used by tests.

### Sources that bypass dist/

- `dedup-reviews.js`, `compute-changelog-metrics.js`, `validate-jsonl-schemas.js` — these are plain JS, not TypeScript. They are not compiled by tsc and have no dist/ counterparts.
- `render-reviews-to-md.ts` — has a dist/ artifact but npm run reviews:render invokes the TS source directly via `npx tsx`. The dist copy exists for test imports.

### Portability of dist/ files

All dist/ files inherit their source file's portability classification. `portability: not-portable` applies universally to all dist/ artifacts by policy (always regenerate), regardless of whether the source is portable. The portability column in the JSONL records `not-portable` for the `status: generated` artifacts to enforce regeneration discipline.

---

## Learnings for Methodology

1. **dist/ compiled test artifacts are a dual-compile artifact.** The `scripts/reviews/tsconfig.json` include pattern for `__tests__/**/*.ts` means `dist/__tests__/` contains compiled test files alongside compiled source. This is distinct from the root `dist-tests/` used by CI. Future scans should check for this multi-compile pattern when a project has per-subsystem tsconfigs.

2. **Three CJS .js test files are invisible to the TypeScript compiler.** `cross-db-validation.test.js`, `disposition-validation.test.js`, and `pipeline-consistency.test.js` have no dist/ counterparts because they are plain CJS and excluded by `allowJs: false` in tsconfig.test.json. Counting test files via dist/ alone would miss them. Always scan `__tests__/` directly.

3. **Out-of-scope test placement is architecturally significant.** Tests in `scripts/reviews/__tests__/` that test `scripts/review-lifecycle.js` (a D6b file) represent cross-subsystem regression guards rather than unit tests. This pattern should be flagged for D22 (schema surveyor): a test file's placement does not always indicate its scope.

4. **findProjectRoot() inline helper duplication.** Every test file (18 TS + 3 JS = 21 files) contains an identical `findProjectRoot()` implementation. This is a deliberate choice for test portability (tests run from different CWDs) but represents 21 copies of the same 12-line function. A shared test utility module would be cleaner — flag as a refactor opportunity.

5. **render-reviews-to-md.test.ts is the only test that imports TS source directly.** The import `from '../render-reviews-to-md'` works because this test is compiled together with the source in tsconfig.test.json. All other tests use `require(dist/...)`. This exception matters for port strategy: if porting tests, `render-reviews-to-md.test.ts` requires the TS source to be available at compile time, not just the dist artifact.

6. **89 dist/ files for 30 source files is a 3x ratio.** Ratio breakdown: each TS source produces 2 dist artifacts (.js + .d.ts). Plus the `__tests__/` directory has its own compiled copies. Plan for 2-3x file growth when counting sync targets that include dist/.

7. **dist/ is always regenerated — never port it.** Port the TS sources and tsconfig; the operator regenerates dist/ after clone. This is already captured by `portability: not-portable` + `status: generated` on all dist records, but the methodology implication for JASON-OS port plans is explicit: dist/ should be in .gitignore from day one.

---

## Gaps

1. **No test runner npm script specifically for `scripts/reviews/__tests__/`.** Tests in this dir are compiled via `tsconfig.test.json` and run as part of `npm test` via the glob `dist-tests/tests/**/*.test.js`. There is no `test:reviews` shorthand. The full test pipeline requires `npm run test:build` first.

2. **The 3 out-of-scope JS test files (cross-db-validation, disposition-validation, pipeline-consistency) test logic in `review-lifecycle.js`**, but `review-lifecycle.js` appears to have no dedicated test file of its own in D6b's scope. This should be flagged to D6b — these `__tests__/` files may be the only test coverage for `review-lifecycle.js`.

3. **write-warning-record.ts does not exist** (per D10a gap). There is also no `write-warning-record.test.ts` — this confirms the gap is at the source level, not a missing test. WarningRecord is tested via `schemas.test.ts` (schema shape only) but no writer is tested.

4. **Dual compile path ambiguity.** `dist/__tests__/` (from `scripts/reviews/tsconfig.json`) and `dist-tests/tests/scripts/reviews/...` (from root `tsconfig.test.json`) both exist but are separate artifacts. Whether CI uses `dist/__tests__/` or `dist-tests/` needs verification with D6b. Based on the `npm test` glob (`dist-tests/tests/**/*.test.js`), CI uses `dist-tests/`. The `dist/__tests__/` artifacts may only serve local development.

5. **validate-jsonl-schemas.js has no unit test.** This is a risk: it is the schema drift checker for all 7 JSONL stores. Its untested status was flagged by D10a and confirmed here — no test file exists.

---

## Confidence Assessment

- All findings based on direct filesystem reads — HIGH confidence throughout
- Test-to-source mapping derived from docstrings and import analysis — HIGH
- Dual compile path analysis (dist/ vs dist-tests/) based on tsconfig and npm scripts — HIGH
- Coverage percentage (93%) is file-count-based, not statement/branch coverage — note this limitation
