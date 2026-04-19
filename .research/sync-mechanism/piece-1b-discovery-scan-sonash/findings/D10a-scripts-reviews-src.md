# D10a Findings: scripts/reviews/ Real Source Files

**Agent:** D10a
**Profile:** codebase
**Date:** 2026-04-18
**Scope:** `scripts/reviews/` excluding `dist/`, `node_modules/`, `__tests__/`

---

## File Count and JS/TS Split

**Total source files inventoried: 30**
- TypeScript (.ts): 24 files
- JavaScript (.js): 3 files (dedup-reviews.js, compute-changelog-metrics.js, validate-jsonl-schemas.js)
- Config (tsconfig.json): 1 file
- Subtotal: 28 files + 2 non-code (see Gaps)

**Breakdown by location:**
- Root-level scripts: 13 (10 TS + 3 JS)
- `lib/` modules: 9 TS files
- `lib/schemas/` schemas: 8 TS files

**Build pipeline:** `npx tsc` compiles all TS to `dist/` (CommonJS, ES2019). `dist/` is gitignored but present on disk. The npm script `reviews:render` uses `npx tsx` (no compile step) — the only entry point that bypasses dist/.

---

## Subsystem Architecture

```
ORCHESTRATORS (entry points)
├── backfill-reviews.ts         — one-time archive→JSONL migration
├── build-enforcement-manifest.ts — CODE_PATTERNS.md → enforcement JSONL
├── verify-enforcement-manifest.ts — drift detection on enforcement JSONL
├── render-reviews-to-md.ts     — JSONL → AI_REVIEW_LEARNINGS_LOG.md
│
CONSUMER/WRITERS (dual CLI + library)
├── write-review-record.ts      — ReviewRecord → .claude/state/reviews.jsonl
├── write-retro-record.ts       — RetroRecord → .claude/state/retros.jsonl
├── write-invocation.ts         — InvocationRecord → data/ecosystem-v2/invocations.jsonl
├── write-deferred-items.ts     — DeferredItemRecords → data/ecosystem-v2/deferred-items.jsonl
│
PIPELINE LIBS (orchestrated by above)
├── lib/promote-patterns.ts     — recurrence detection + CODE_PATTERNS.md promotion (PIPE-05/06)
├── lib/generate-claude-antipatterns.ts — CLAUDE.md Section 4 auto-update (PIPE-07)
├── lib/generate-fix-template-stubs.ts  — FIX_TEMPLATES.md stub generator (PIPE-08)
├── lib/parse-review.ts         — markdown archive parser + field extractors
│
UTILITIES (maintenance)
├── dedup-reviews.js            — duplicate ID resolution in reviews.jsonl
├── dedup-debt.ts               — duplicate content_hash resolution in MASTER_DEBT.jsonl
├── compute-changelog-metrics.js — PR metrics from retros + reviews (CLI only)
│
VALIDATORS
└── validate-jsonl-schemas.js   — schema drift checker (requires dist/)
│
LIB FOUNDATION
├── lib/write-jsonl.ts          — appendRecord() with lock + symlink guard
├── lib/read-jsonl.ts           — readValidatedJsonl<T>() safe reader
├── lib/completeness.ts         — hasField() / validateCompleteness() helpers
├── lib/enforcement-manifest.ts — EnforcementRecordSchema + classifyCoverage()
│
SCHEMAS (lib/schemas/)
├── shared.ts       — BaseRecord, CompletenessTier, Origin (shared by all)
├── review.ts       — ReviewRecord
├── retro.ts        — RetroRecord
├── deferred-item.ts — DeferredItemRecord
├── invocation.ts   — InvocationRecord
├── warning.ts      — WarningRecord
├── learning-route.ts — LearningRouteRecord
├── lifecycle-score.ts — LifecycleScoreRecord
└── index.ts        — barrel export + SCHEMA_MAP
│
CONFIG
└── tsconfig.json   — CJS compile config
```

---

## Data Contracts (Reviews Schema)

This subsystem manages 7 primary JSONL data stores and 3 document outputs:

### JSONL Data Stores

| File | Schema | Producers | Consumers |
|------|--------|-----------|-----------|
| `.claude/state/reviews.jsonl` | ReviewRecord | write-review-record.ts, pr-review skill | render-reviews-to-md.ts, dedup-reviews.js, compute-changelog-metrics.js, validate-jsonl-schemas.js |
| `.claude/state/retros.jsonl` | RetroRecord | write-retro-record.ts, pr-retro skill | compute-changelog-metrics.js, validate-jsonl-schemas.js |
| `data/ecosystem-v2/reviews.jsonl` | ReviewRecord (v2) | backfill-reviews.ts | promote-patterns.ts, generate-claude-antipatterns.ts, generate-fix-template-stubs.ts |
| `data/ecosystem-v2/retros.jsonl` | RetroRecord (v2) | backfill-reviews.ts | (direct analysis) |
| `data/ecosystem-v2/invocations.jsonl` | InvocationRecord | write-invocation.ts | ecosystem-audit skills (19+) |
| `data/ecosystem-v2/deferred-items.jsonl` | DeferredItemRecord | write-deferred-items.ts | dedup-debt.ts |
| `data/ecosystem-v2/enforcement-manifest.jsonl` | EnforcementRecord | build-enforcement-manifest.ts | verify-enforcement-manifest.ts |

**Critical observation: DUAL-PATH DATA SPLIT.** `.claude/state/reviews.jsonl` is the LIVE write target for the pr-review skill. `data/ecosystem-v2/reviews.jsonl` is the MIGRATED/BACKFILLED version used by the promotion pipeline. These are DIFFERENT files. validate-jsonl-schemas.js reads from `.claude/state/` while backfill-reviews.ts writes to `data/ecosystem-v2/`. This is a known architectural split (pre-migration legacy vs. v2 ecosystem).

### Document Outputs

| File | Section | Producer | Consumers |
|------|---------|----------|-----------|
| `docs/AI_REVIEW_LEARNINGS_LOG.md` | `## Active Reviews` | render-reviews-to-md.ts | pr-review skill reference |
| `docs/agent_docs/CODE_PATTERNS.md` | per-category sections | promote-patterns.ts | build-enforcement-manifest.ts |
| `CLAUDE.md` | Section 4 anti-patterns | generate-claude-antipatterns.ts | all AI turns (loaded via system prompt) |

### State Files

| File | Owner | Purpose |
|------|-------|---------|
| `.claude/state/consolidation.json` | promote-patterns.ts | Idempotency: last processed review ID |
| `.claude/state/reviews.jsonl.bak` | dedup-reviews.js | Safety backup before dedup |

---

## write-invocation.ts Deep-Dive

**Why it's critical:** D1c identified this as consumed by 6+ ecosystem-audit skills. The actual count is higher — every skill that calls `node dist/write-invocation.js --data` for invocation tracking uses this. The grep confirms 19 skill files reference it (audit-agent-quality, brainstorm, create-audit, data-effectiveness-audit, deep-plan, document-analysis, health-ecosystem-audit, hook-ecosystem-audit, media-analysis, pr-retro, repo-analysis, script-ecosystem-audit, skill-audit, skill-creator, todo, website-analysis, plus 3 more via _shared docs).

**What it does:**
1. Dual-mode: exports `writeInvocation(projectRoot, data)` library function AND runs as CLI via `node dist/write-invocation.js --data '{...}'`
2. Auto-fills `id`, `date`, `schema_version`, `completeness`, `origin` when caller omits them (backward compatibility for 18+ skills that predate the BaseRecord schema bump — T32 fix)
3. Validates against `InvocationRecord` Zod schema, writes to `data/ecosystem-v2/invocations.jsonl`
4. Uses `require.main === module` guard — can be imported without side effects

**Schema contract (InvocationRecord):**
- Extends BaseRecord (id, date, schema_version, completeness, completeness_missing, origin)
- Required: `skill` (string), `type` (skill|agent|team), `success` (boolean)
- Optional: `duration_ms`, `error`, `agent_name`, `team_name`, `model`, `tokens`
- Context sub-object: PR, session, trigger, agents_audited, grade, mean_score, improvements, categories, target, decisions, score, topic, note

**For JASON-OS:** The pr-review skill's invocation tracking is a key portability target. The write-invocation.ts binary mode (calling via `node dist/write-invocation.js --data`) is a clean interface. The main sanitization needed is the output path (`data/ecosystem-v2/invocations.jsonl` → JASON-OS equivalent).

**Build requirement:** Skills call `node dist/write-invocation.js` (compiled output). Any port must run `npx tsc` in `scripts/reviews/` before the compiled binary is available. Alternatively, skills could call `npx tsx write-invocation.ts` (as `reviews:render` does for render-reviews-to-md.ts) to bypass compilation.

---

## JS vs TS Split and Why

**TypeScript (24 files):** All the schema-validated JSONL writers, the Zod schema definitions, and the more complex orchestrators use TypeScript. The compile step produces CJS output in `dist/` that skills invoke via `node dist/...`. TypeScript is used where type safety matters — schemas, record builders, readers.

**JavaScript (3 files):** `dedup-reviews.js`, `compute-changelog-metrics.js`, `validate-jsonl-schemas.js` are all maintenance/utility scripts that were written or left as CJS JS. `dedup-reviews.js` and `validate-jsonl-schemas.js` export helpers for testing via `module.exports`. `validate-jsonl-schemas.js` notably loads compiled schema from `dist/` — it is CJS because it consumes the compiled output, not the source.

**No ESM in this subsystem.** Package.json has no `"type": "esm"`. All TS compiles to CJS (`module: commonjs` in tsconfig). The `learning-route.ts` and `lifecycle-score.ts` files use `import from './shared.js'` (`.js` extension) which is an ESM compatibility shim pattern but they still compile to CJS.

---

## Build Pipeline

1. `cd scripts/reviews && npx tsc` — compiles all `.ts` files to `dist/` (CJS, ES2019, with `.d.ts` declarations)
2. Skills invoke `node dist/write-invocation.js --data '...'` (and other dist/ binaries)
3. `npm run reviews:render` uses `npx tsx render-reviews-to-md.ts` — bypasses dist/, runs TypeScript directly
4. `dist/` is gitignored but present on disk (D10b covers `dist/` and `__tests__/`)

**Who rebuilds dist/?** Not tracked by any CI gate. Must be manually run after TS source changes. This is a **portability risk**: if JASON-OS ports the TS sources, operators must know to compile before invoking.

---

## Cross-Component Consumers (Who Reads What This Writes)

### Skills consuming write-invocation.ts (via `node dist/write-invocation.js`)
audit-agent-quality, brainstorm, create-audit, data-effectiveness-audit, deep-plan, document-analysis, health-ecosystem-audit, hook-ecosystem-audit, media-analysis, pr-retro, repo-analysis, script-ecosystem-audit, skill-audit, skill-creator, todo, website-analysis, plus _shared/ecosystem-audit docs

### Skills consuming write-review-record.ts
pr-review skill (writes ReviewRecord after each review round)

### Skills consuming write-retro-record.ts
pr-retro skill (writes RetroRecord after retrospective)

### scripts/review-lifecycle.js (D6b finding: root orchestrator)
Calls `render-reviews-to-md.ts` as a pipeline step (npm script `reviews:lifecycle`)

---

## What's Portable vs SoNash-Review-Specific

### Portable (no sanitization needed)
- `lib/schemas/shared.ts` — BaseRecord, CompletenessTier, Origin schemas
- `lib/schemas/warning.ts` — generic warning schema
- `lib/completeness.ts` — pure utility helpers
- `lib/write-jsonl.ts` — generic appendRecord (needs safe-fs.js ported)
- `lib/read-jsonl.ts` — generic readValidatedJsonl (needs read-jsonl.js ported)

### Sanitize-then-portable (path/name substitution only)
- `write-invocation.ts` — change output path from `data/ecosystem-v2/invocations.jsonl`
- `write-review-record.ts` — change `.claude/state/reviews.jsonl` path
- `write-retro-record.ts` — change `.claude/state/retros.jsonl` path
- `write-deferred-items.ts` — change `data/ecosystem-v2/deferred-items.jsonl` path
- `lib/schemas/invocation.ts` — InvocationRecord context fields generalize well
- `lib/schemas/review.ts` — ReviewRecord structure is generic enough
- `lib/schemas/retro.ts` — RetroRecord is generic enough
- `lib/schemas/deferred-item.ts` — DeferredItemRecord is generic
- `lib/schemas/learning-route.ts` — route enum is SoNash-specific but scaffold path is config
- `render-reviews-to-md.ts` — section markers need updating
- `dedup-reviews.js` — rev-94 title backfill is one-time historical fix, removable
- `compute-changelog-metrics.js` — just change .claude/state/ paths
- `validate-jsonl-schemas.js` — change data dir path, update JSONL_FILES map

### Not portable (SoNash-specific history or config)
- `backfill-reviews.ts` — KNOWN_SKIPPED_IDS (64 SoNash review numbers), 14 archive files, v1 state migration — this is a one-time historical migration, not a portable tool
- `build-enforcement-manifest.ts` — scans SoNash-specific eslint-plugin-sonash, check-pattern-compliance.js, .semgrep/rules/
- `verify-enforcement-manifest.ts` — same SoNash-specific sources
- `lib/parse-review.ts` — KNOWN_SKIPPED_IDS, KNOWN_DUPLICATE_IDS are SoNash history
- `lib/promote-patterns.ts` — CODE_PATTERNS.md and consolidation paths
- `lib/generate-claude-antipatterns.ts` — CLAUDE.md Section 4 structure
- `lib/schemas/lifecycle-score.ts` — 20-value category enum names SoNash systems
- `lib/enforce-manifest.ts` — enforcement mechanism structure is SoNash-specific
- `dedup-debt.ts` — MASTER_DEBT.jsonl and DEBT-NNNN ID format are SoNash

### JASON-OS Current Coverage
JASON-OS has a `pr-review` skill (per CLAUDE.md and memory notes). The write-review-record.ts, write-retro-record.ts, and write-invocation.ts are the most directly relevant ports. The schemas (review, retro, invocation, deferred-item) form the data contract for that skill's state management.

---

## Learnings for Methodology

1. **Dual-path data split requires explicit documentation.** The `.claude/state/` vs `data/ecosystem-v2/` split tripped up analysis — validate-jsonl-schemas.js reads from one path while backfill-reviews.ts writes to the other. Future scans should flag when the same schema (ReviewRecord) has two live file locations.

2. **dist/ present on disk despite gitignore.** The `dist/` tree was available for inspection even though gitignored. D10b (covering dist/ and __tests__/) should note this — the compiled JS in dist/ is the actual runtime artifact that skills execute.

3. **require.main===module guard is the right pattern for dual-mode files.** Six files (write-invocation.ts, write-review-record.ts, write-retro-record.ts, write-deferred-items.ts, dedup-reviews.js, dedup-debt.ts) use this pattern. It enables both library import and CLI use, which is the correct pattern for porting to JASON-OS.

4. **npm script entry points reveal invocation patterns more reliably than file inspection alone.** `reviews:render` uses `npx tsx` (not `node dist/`) — which means render-reviews-to-md.ts has a DIFFERENT invocation path than the other TS files. This was only visible from package.json, not from the file itself.

5. **.js extension imports in TS files (learning-route.ts, lifecycle-score.ts) signal ESM compat intent.** These two files import `from './shared.js'` — unusual for CJS-compiled TS. Future ports should check if this causes issues in JASON-OS's tsconfig setup.

6. **Schema architecture is well-designed for portability.** The BaseRecord + 7 entity schemas pattern is clean. The SCHEMA_MAP in index.ts enabling runtime schema lookup is particularly useful for JASON-OS's validate-jsonl workflow.

7. **Invocation tracking is a cross-cutting concern with 19 consumers.** Any JASON-OS port that skips write-invocation.ts but ports the skills will have broken invocation tracking. This should be flagged as a prerequisite dependency.

8. **Scope sizing:** 30 files in one agent was at the upper limit but manageable because the subsystem has clear internal structure. The schema layer (8 files) + lib layer (6 files) + entry points (13 files) + config (1 file) decomposed cleanly.

---

## Gaps and Missing References

1. **write-warning-record.ts does not exist.** WarningRecord schema is defined but there is no write-warning-record.ts. D10b's __tests__/ coverage may reveal test stubs, or warnings may be written directly by other scripts. Who produces `warnings.jsonl` is unclear from this scan.

2. **write-learning-route.ts does not exist.** LearningRouteRecord and LifecycleScoreRecord schemas are defined but no writer script was found in source. These may be in dist/ as compiled artifacts, or produced by ecosystem-audit skills directly via library import.

3. **learning-route-router is referenced in LearningRouteRecord docstring** ("Writer: learning-router") but no such file exists in scripts/reviews/. May be in another directory — D11/D12 agents should scan for it.

4. **Integration with scripts/review-lifecycle.js (D6b).** The root-level `review-lifecycle.js` is described by D6b as a pipeline orchestrator that calls into this subsystem. The exact call graph was not verified in this scan — D6b's findings should be cross-referenced with D10a's entry points.

5. **dist/write-review-record.d.ts** was seen in the dist/ listing (truncated) but the full dist/ inventory is D10b's scope. D10b should confirm all 9 TS entry points are compiled.

6. **Test coverage for compute-changelog-metrics.js and validate-jsonl-schemas.js** is marked false (no __tests__ file found in source scan). D10b will confirm via __tests__/ inventory.

7. **dedup-reviews.js reads from .claude/state/reviews.jsonl** (legacy path) while backfill-reviews.ts writes the migrated version to `data/ecosystem-v2/reviews.jsonl`. The production flow for dedup is against the legacy path — this means the canonical dedup is still operating on the pre-migration file. Whether this is intentional or a gap should be confirmed with D6b (review-lifecycle.js analysis).

---

## Confidence Assessment

- All 30 source files read directly from filesystem — HIGH confidence throughout
- Data contracts derived from code analysis, not documentation — MEDIUM-HIGH (may miss runtime-only paths)
- Consumer list for write-invocation.ts based on grep of skill files — MEDIUM (skills may call from dist/ without explicit TS import)
- Portability assessments based on path/schema analysis — HIGH for clear cases, MEDIUM for edge cases
