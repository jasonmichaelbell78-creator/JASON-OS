# D2-ecosystem-audits-b — Findings

**Agent:** Phase 1 D-agent D2-ecosystem-audits-b
**Scope:** SoNash `*-ecosystem-audit` cluster part B (PR / Script / Session / TDMS) plus two doc skills (`doc-optimizer`, `docs-maintain`).
**Depth:** L1 (SKILL.md + sampled companions + checker coupling probe).
**Skill count:** 6.
**Parent research:** BRAINSTORM.md §5 Q2, §3 D27/D19/D23/D24.

---

## Summary

All four `*-ecosystem-audit` skills (PR, Script, Session, TDMS) are **deeply SoNash-coupled** — each checker hard-codes paths like `docs/AI_REVIEW_LEARNINGS_LOG.md`, `docs/technical-debt/MASTER_DEBT.jsonl`, `.claude/state/reviews.jsonl`, or hook names like `compact-restore.js`, `commit-tracker.js`, `pre-compaction-save.js` that are SoNash-ecosystem artifacts, not JASON-OS artifacts. They share a `_shared/ecosystem-audit/` library (CRITICAL_RULES, COMPACTION_GUARD, FINDING_WALKTHROUGH, SUMMARY_AND_TRENDS, CLOSURE_AND_GUARDRAILS) and a common `lib/` layout (`scoring`, `benchmarks`, `state-manager`, `patch-generator`) — shared chassis, SoNash-specific guts.

`doc-optimizer` is a **13-agent wave orchestrator** — the most agent-heavy skill in this batch — heavily coupled to SoNash's docs tree (`docs/audits/FALSE_POSITIVES.jsonl`, `docs/technical-debt/MASTER_DEBT.jsonl`, `npm run docs:index`, `scripts/debt/intake-audit.js`, `scripts/check-*.js` scripts). `docs-maintain` is a thin wrapper around SoNash npm scripts (`docs:sync-check`, `docs:index`).

**`/migration` call likelihood is LOW for all six.** None are natural cross-skill call-sites for `/migration` — they are target-of-migration artifacts themselves, not helpers `/migration` would dispatch. However, their **shared `_shared/ecosystem-audit/` chassis** and the **wave-orchestration pattern from `doc-optimizer`** are highly relevant as **architectural precedents** for `/migration`'s Phase 2 Discovery, Phase 5 Execute verdict-gated walkthroughs (D23/D24), and agent parallelism (Q1/Q7).

**Verdict distribution (per D23):** 0 copy-as-is, 0 sanitize, 2 reshape, 4 rewrite, 0 skip, 0 blocked — all six require destination-idiom research (R4 applies, Phase 3 cannot skip).

---

## Skill integration table

| # | Skill | File count | Does what | Coupling | /migration call likelihood + phase | Invocation shape | D23 verdict |
|---|-------|-----------|-----------|----------|-----------------------------------|------------------|-------------|
| 1 | `pr-ecosystem-audit` | 24 | 18-category diagnostic of PR-review ecosystem (Qodo/SonarCloud/reviews.jsonl/retros/FIX_TEMPLATES) with composite grade + trend + walkthrough | **HIGH (SoNash-specific)** — checkers hard-code `reviews.jsonl`, `AI_REVIEW_LEARNINGS_LOG.md`, Qodo `pr-agent.toml` sections, FIX_TEMPLATES.md | LOW — `/migration` wouldn't audit PRs; but it **could cite this skill's pattern as precedent** for own execute-phase walkthrough | `/pr-ecosystem-audit` (orchestrator fallback: `--batch --summary`) | rewrite |
| 2 | `script-ecosystem-audit` | 25 | 18-category diagnostic of `scripts/**/*.js` infrastructure (module-consistency, safety/error-handling via `sanitize-error.js`/`security-helpers.js`, registration-reachability, code-quality, testing) | **HIGH (SoNash-specific)** — checkers scan SoNash `scripts/` tree, `package.json` npm registrations, reference CLAUDE.md §5 anti-patterns by name | LOW — script inventories exist but this skill audits them, does not migrate | `/script-ecosystem-audit [--summary \| --check \| --batch \| --save-baseline]` | rewrite |
| 3 | `session-ecosystem-audit` | 24 | 17-category diagnostic of session lifecycle (begin/end/checkpoint/alerts), 4-layer compaction resilience (commit-tracker, pre-compaction-save, compact-restore, check-session-gaps), handoff.json schema | **HIGH (SoNash-specific)** — references seven specific hook filenames, checks `SESSION_CONTEXT.md` counter vs `commit-log.jsonl`, validates `handoff.json` 11-field schema | LOW — concerns session plumbing orthogonal to migration; **BUT `/migration` state machine (D21) will itself produce handoff artifacts** this skill could later audit | `/session-ecosystem-audit` | rewrite |
| 4 | `tdms-ecosystem-audit` | 24 | 16-category diagnostic of Technical Debt Management System (`scripts/debt/*.js` 37-script pipeline, `MASTER_DEBT.jsonl` ↔ `raw/deduped.jsonl` sync invariant, `ROADMAP.md` cross-refs, dedup algo, views, metrics) | **HIGH (SoNash-specific)** — entire skill is a TDMS surveyor; JASON-OS has DEBT_LOG.md stub (not pipeline) | LOW — but references `MASTER_DEBT.jsonl` surface `/add-debt` is already a JASON-OS v0 stub, so any `/migration` deferral flow ties back here indirectly | `/tdms-ecosystem-audit` | rewrite |
| 5 | `doc-optimizer` | 2 | **13-agent wave orchestrator** (5 waves, 4-min to 40-min window) — auto-fixes formatting/headers/links, reports issues as JSONL, generates enhancement recommendations; integrates TDMS intake as Step 9 | **HIGH (SoNash-specific wiring)** but **pattern-reusable** — uses SoNash `scripts/check-*.js`, `docs/audits/FALSE_POSITIVES.jsonl`, `scripts/debt/intake-audit.js`, `npm run docs:index`, and 5-tier doc hierarchy | LOW-MED — NOT invoked by `/migration`, but **wave+agent pattern is a leading candidate for `/migration` Phase 5 (Execute) parallel-reshape agents per Q1** | `/doc-optimizer` (no args; Wave chunking resume via `progress.json`) | reshape (pattern-port, not content-port) |
| 6 | `docs-maintain` | 1 | Lightweight doc sync-check + index regen wrapper; delegates to `npm run docs:sync-check` and `npm run docs:index` | **MED-HIGH** — thin, but all work is SoNash npm-script execution; no agents, no internal logic | LOW — unlikely `/migration` caller; closest JASON-OS analog would be whatever doc-index regen exists post-port | `/docs-maintain [--check \| --update]` | reshape |

---

## Top integration points for /migration

### 1. Shared `_shared/ecosystem-audit/` chassis (all 4 audits)
**Files:** `<SONASH_ROOT>\.claude\skills\_shared\ecosystem-audit\CRITICAL_RULES.md`, `COMPACTION_GUARD.md`, `FINDING_WALKTHROUGH.md`, `SUMMARY_AND_TRENDS.md`, `CLOSURE_AND_GUARDRAILS.md`, `README.md`.
**Evidence:** All four audit SKILL.md files contain identical `> Read .claude/skills/_shared/ecosystem-audit/{FILE}.md` directives — pr:42-46, session:48-50, tdms:47-49, script:SKILL.md references REFERENCE.md in-skill instead (v2.0 different style, predates extraction).
**Relevance:** `/migration` Phase 2 (Discovery), Phase 5 (Execute), Phase 6 (Prove) will need analogous shared patterns (progress-resume, walkthrough protocol, summary-and-trends). The 8 CRITICAL RULES align nearly 1:1 with `/migration`'s D8 (nothing silent) + D3 (plan-then-execute) + D22 R3 (gate memory aids recall) axioms.

### 2. Compaction guard / progress file / 2-hour staleness (all 4 audits)
**Evidence:** Each audit writes `.claude/tmp/{name}-audit-progress.json`, checks staleness < 2 hours, resume-on-start (pr:SKILL.md:60-64, session:62-68, tdms:60-66, script:84-103). doc-optimizer uses `.claude/state/doc-optimizer/progress.json` with wave-chunking resume (doc-optimizer/SKILL.md:383-416).
**Relevance:** Direct pattern for `/migration` state machine / mid-state resume (D21-D22). Indicates the SoNash ecosystem has already solved the Windows compaction-survivability problem and the primitive can be hoisted verbatim into JASON-OS for `/migration`.

### 3. `doc-optimizer` wave orchestration pattern
**Files:** `<SONASH_ROOT>\.claude\skills\doc-optimizer\SKILL.md`, `prompts.md`.
**Evidence:** 5-wave DAG (Wave 0 discovery → Wave 1 4 agents in parallel → Wave 2 4 parallel → Wave 3 2 parallel → Wave 4 3 parallel → unify → report), with explicit Windows 0-byte bug fallback (SKILL.md:162-168, #39791), CRITICAL RETURN PROTOCOL (orchestrator never reads JSONL files, uses `wc -l` only — lines 113-133), and agent context-budget check between waves.
**Relevance:** **Strongest precedent for `/migration` Q1 (agent approach) + Q7 (decomposition).** If `/migration` executes multi-file reshape via parallel agents, doc-optimizer proves the Windows-safe pattern. The "max 2 waves per invocation" rule (SKILL.md:140-146) directly answers Q8 (failure/recovery) for active transformation.

### 4. TDMS intake as Phase-6-defer endpoint (`doc-optimizer` + all 4 audits)
**Evidence:** doc-optimizer/SKILL.md:358-369 invokes `node scripts/debt/intake-audit.js ... --dry-run` then real, plus `cp docs/technical-debt/MASTER_DEBT.jsonl docs/technical-debt/raw/deduped.jsonl` guard (Session #134 bug workaround from tdms-ecosystem-audit/SKILL.md:244). All 4 audits emit DEBT entries via `/add-debt` on defer decisions.
**Relevance:** `/migration` skip / blocked-on-prereq verdicts (D23) naturally route here. JASON-OS has the `/add-debt` stub (CLAUDE.md §7 skill list) — so the defer contract already exists, the consumer (full TDMS pipeline) does not.

### 5. Hook-filename coupling (session-ecosystem-audit)
**Files:** `<SONASH_ROOT>\.claude\skills\session-ecosystem-audit\scripts\checkers\compaction-resilience.js` (lines 1-50 shown; 68 references per count).
**Evidence:** Skill references seven session-related SoNash hook filenames (`session-start.js`, `commit-tracker.js`, `pre-compaction-save.js`, `compact-restore.js`, `compaction-handoff.js`, gap detector `scripts/check-session-gaps.js`, `.session-state.json`) as fixed literals — SKILL.md:22-25 + 228-242.
**Relevance:** If JASON-OS renames or restructures any of these during port, the skill's checkers break silently (high-count literal drift). Flag for `/migration` target analysis.

### 6. Shared `scripts/lib/` utilization scoring (script-ecosystem-audit)
**Evidence:** script-ecosystem-audit checker `safety-error-handling.js:227,233,493` flags missing use of `scripts/lib/sanitize-error.js` and `scripts/lib/security-helpers.js`. Both are canonical JASON-OS CLAUDE.md §2 helpers.
**Relevance:** `/migration` reshape of any script should preserve the lib-import pattern; this skill's rule-set is effectively a pre-baked JASON-OS anti-pattern checker (cross-ref JASON-OS CLAUDE.md §5).

---

## Dispatch-pattern observations

1. **Orchestrator-fan-out contract is explicit.** `comprehensive-ecosystem-audit/SKILL.md:73-75,90` shows all four audits invocable headless as `node .claude/skills/{name}/scripts/run-{name}.js --batch --summary` returning `{grade,score,errors,warnings,info,patches,domains}`. This is a clean dispatch contract `/migration` could dogfood for its own Phase 6 (Prove).
2. **Checker-per-domain is the universal shape.** All four audits ship a `scripts/checkers/*.js` module per domain (5 for PR/script/session, 5 for TDMS + fewer), loaded via `require()` array (pr `run-pr-ecosystem-audit.js:74-80`). Uniform — reinforces that `/migration`'s Phase 2 Discovery can follow the same checker-array pattern for sanitize-candidate detection.
3. **v2 JSON schema is stable across audits.** stdout = JSON, stderr = progress (pr:SKILL.md:79-85, session:74-79, tdms:74-79, script:108-114). `/migration` `MIGRATION_PLAN.md` generation could emit the same discipline.
4. **Compaction-guard reuse points to a missing shared skill-primitive.** Each audit re-implements the same resume protocol, suggesting JASON-OS should extract it as a `_shared/` primitive before porting any audit — which is itself a `/migration` reshape candidate per D24.
5. **doc-optimizer is the outlier:** 13 parallel agents (not sequential checkers), wave-chunked, context-budget-aware. This is the shape `/migration` Phase 5 Execute should emulate if multi-file reshape is in scope (Q1).
6. **docs-maintain contains no internal logic** — pure shell dispatch. Port effort near-zero once `npm run docs:sync-check` + `docs:index` exist in JASON-OS; a v0 `/docs-maintain` stub is trivial.
7. **No direct cross-skill calls between the 6.** None of these skills invoke each other; they are siblings under `comprehensive-ecosystem-audit` (PR/Script/Session/TDMS) or standalone (doc-optimizer/docs-maintain). `/migration` would not find intra-cluster dispatch here.

---

## Sources

- `<SONASH_ROOT>\.claude\skills\pr-ecosystem-audit\SKILL.md` (lines 1-333)
- `<SONASH_ROOT>\.claude\skills\pr-ecosystem-audit\scripts\run-pr-ecosystem-audit.js` (lines 1-100)
- `<SONASH_ROOT>\.claude\skills\pr-ecosystem-audit\scripts\checkers\feedback-integration.js:46,47,386,394,446,447`
- `<SONASH_ROOT>\.claude\skills\pr-ecosystem-audit\scripts\checkers\pattern-lifecycle.js:48,50,54,107,534`
- `<SONASH_ROOT>\.claude\skills\pr-ecosystem-audit\scripts\checkers\effectiveness-metrics.js:44-47,265-322,406-495`
- `<SONASH_ROOT>\.claude\skills\script-ecosystem-audit\SKILL.md` (lines 1-299)
- `<SONASH_ROOT>\.claude\skills\script-ecosystem-audit\scripts\checkers\safety-error-handling.js:227,233,493`
- `<SONASH_ROOT>\.claude\skills\script-ecosystem-audit\scripts\checkers\registration-reachability.js` (lines 1-50)
- `<SONASH_ROOT>\.claude\skills\session-ecosystem-audit\SKILL.md` (lines 1-273)
- `<SONASH_ROOT>\.claude\skills\session-ecosystem-audit\scripts\checkers\compaction-resilience.js` (lines 1-50; 68 SoNash-hook references total)
- `<SONASH_ROOT>\.claude\skills\tdms-ecosystem-audit\SKILL.md` (lines 1-257)
- `<SONASH_ROOT>\.claude\skills\tdms-ecosystem-audit\scripts\checkers\roadmap-integration.js:54,73,106,107,119,159,178,197,238,244,255,268,294-296`
- `<SONASH_ROOT>\.claude\skills\doc-optimizer\SKILL.md` (lines 1-487)
- `<SONASH_ROOT>\.claude\skills\doc-optimizer\prompts.md` (lines 1-60)
- `<SONASH_ROOT>\.claude\skills\docs-maintain\SKILL.md` (lines 1-106)
- `<SONASH_ROOT>\.claude\skills\_shared\ecosystem-audit\CRITICAL_RULES.md` (lines 1-50)
- `<SONASH_ROOT>\.claude\skills\comprehensive-ecosystem-audit\SKILL.md:73-75,90,158-160` (orchestrator fan-out contract)
- `<JASON_OS_ROOT>\CLAUDE.md` §2, §5, §7 (JASON-OS helper / anti-pattern / skill cross-reference)
- `<JASON_OS_ROOT>\.research\migration-skill\BRAINSTORM.md` §3 D19, D23, D24, D27; §5 Q1, Q2, Q7, Q8 (scope + verdict legend)

---

## Return summary (for parent dispatch)

- **Skill count:** 6 (4 audits + doc-optimizer + docs-maintain)
- **Coupling distribution:** 4 HIGH-SoNash-specific (pr/script/session/tdms audits), 1 HIGH-wiring-but-reusable-pattern (doc-optimizer), 1 MED-HIGH-thin-wrapper (docs-maintain)
- **Top integration points:**
  1. Shared `_shared/ecosystem-audit/` chassis (CRITICAL RULES, COMPACTION GUARD, FINDING WALKTHROUGH, SUMMARY & TRENDS, CLOSURE) — reusable primitive for `/migration`
  2. Compaction guard / 2-hour-stale progress files — direct port candidate for `/migration` D21-D22 state machine
  3. `doc-optimizer` 13-agent 5-wave orchestration + Windows 0-byte fallback — precedent for `/migration` Q1/Q7/Q8
  4. TDMS intake contract (`scripts/debt/intake-audit.js` + MASTER_DEBT↔deduped sync guard) — defer-verdict consumer for `/migration` D23
  5. `comprehensive-ecosystem-audit` fan-out contract (`--batch --summary` → v2 JSON stdout / progress stderr) — dispatch contract `/migration` Phase 6 can mirror
  6. Session-audit hard-coded hook filenames — watch-list for JASON-OS port-time renames
- **Verdicts (D23):** 4× rewrite (audits), 2× reshape (doc-optimizer pattern-port, docs-maintain wrapper-port); 0× copy-as-is / sanitize / skip / blocked — all require destination-idiom research per R4
- **Findings path:** `<JASON_OS_ROOT>\.research\migration-skill\findings\D2-ecosystem-audits-b.md`
