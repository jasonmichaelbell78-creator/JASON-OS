# D2-ecosystem-audits-a — SoNash *-ecosystem-audit cluster (Part A, 5 skills)

**Scope:** Inventory 5 ecosystem-audit skills for `/migration` cross-skill
integration (Q2). These are multi-file skills (20–30 files) built on a shared
orchestrator pattern. SKILL.md + 2–3 high-signal companions per skill + the
shared `_shared/ecosystem-audit/` module.

**Sub-question:** SQ-D2-ecosystem-audits-a — does-what, coupling, `/migration`
call likelihood/phase, invocation shape, D23 verdict per skill. Flag standout
dispatch patterns for Q1.

**Scope fit:** All 5 are SoNash-repo-audit tools (hook / session / TDMS / PR /
health / skill / doc / script state). They are **not** general-purpose skills
`/migration` would call mid-flow. They are prior-art exemplars for the
migration dispatch shape (orchestrator → parallel sub-agents with fixed return
protocol → aggregation). Integration for `/migration` is **mostly negative**
(ignore for v1) but **pattern-rich** for Q1.

---

## 1. Summary

- **Coupling:** HIGH for all 5. Every skill hardcodes sonash-specific paths:
  `.husky/pre-commit`, `CLAUDE.md` schema, `data/ecosystem-v2/`,
  `scripts/health/`, `scripts/reviews/write-invocation.ts`, `SKILL_INDEX.md`
  layout, `.claude/state/*-history.jsonl` schemas. None are JASON-OS-ready.
- **`/migration` call likelihood:** LOW across the board. `/migration` will
  not invoke these mid-run in v1. They are **targets** of migration, not
  **tools** for migration. The lone exception is a latent pattern-reuse
  opportunity (see §4) — the Stage 1/Stage 2 orchestrator is a direct template
  for `/migration`'s Phase 2 Discovery + Phase 3 Research parallel dispatch.
- **D23 verdict distribution (for if each were ported):** 5 × `reshape`
  (none are `copy-as-is` or `sanitize` — all carry structural coupling to
  SoNash ecosystem schemas). `comprehensive-ecosystem-audit` is arguably a
  candidate for `rewrite` if JASON-OS's ecosystem-audit topology differs from
  SoNash's 8-audit roster.
- **Top integration points:** (a) invocation-tracking write-invocation.ts
  handshake (all 5 write through `scripts/reviews/`), (b) `/add-debt` TDMS
  handshake (all 5 delegate deferral to TDMS), (c) `_shared/ecosystem-audit/`
  module — a shared-skill-module pattern `/migration` itself might adopt.
- **Novel Q1 dispatch patterns flagged:** the "COMPLETE: {name} grade {G}
  score {S} errors {N} …" return-line protocol (§4.1), JSON-to-file side
  channel for result payload (§4.2), 5+3 staged wave architecture (§4.3),
  `_shared/` skill-module pattern (§4.4).

---

## 2. Skill integration table

| # | Skill | Files | Does-what | Coupling | `/migration` phase | Verdict |
|---|---|---|---|---|---|---|
| 1 | `comprehensive-ecosystem-audit` | 4 | Orchestrates 8 sub-audits in 2 staged parallel waves; writes `COMPREHENSIVE_ECOSYSTEM_AUDIT_REPORT.md` with weighted health grade + heat map | HIGH — hardcodes SoNash 8-audit roster, weight table, domain heatmap categories, `.claude/tmp/` paths, result-file naming conventions | **N/A** (not called by `/migration`); **pattern source** for §4 | `reshape` (or `rewrite` if JASON-OS audit roster diverges) |
| 2 | `doc-ecosystem-audit` | 24 | 16-category doc ecosystem audit: DOCUMENTATION_INDEX, links, content quality, `docs:index` pipeline, coverage | HIGH — hardcodes `DOCUMENTATION_INDEX.md` layout, `AI_WORKFLOW.md`, `docs/agent_docs/*`, SoNash `docs:index` npm script, `.husky/pre-commit` stage patterns | **None**; migration-target content | `reshape` |
| 3 | `health-ecosystem-audit` | 21 | 26-category health-monitoring-system audit: `scripts/health/` checkers, `data/ecosystem-v2/` JSONL, live-test exec, mid-session alerts | HIGH — hardcodes `scripts/health/`, `data/ecosystem-v2/test-registry.jsonl`, `ecosystem-health-log.jsonl`, `warnings.jsonl`, `deferred-items.jsonl`, `scripts/health/lib/mid-session-alerts.js`, `scripts/health/lib/warning-lifecycle.js`, npm test invocation | **None** for `/migration`. Possibly a migration TARGET for the health-monitoring subsystem if JASON-OS builds equivalent | `reshape` (very deep — entire health subsystem is SoNash-shaped) |
| 4 | `hook-ecosystem-audit` | 29 | 20-category hook audit: `.claude/hooks/`, `.husky/pre-commit`, CI/CD workflows, settings.json gates | HIGH — hardcodes `.husky/pre-commit` 11-stage POSIX structure, SoNash hook roster (18 hooks + 6 libs + 2 global), override-log.jsonl, sanitize-error.js conventions | **None** for `/migration`. JASON-OS CLAUDE.md §2 references `sanitize-error.cjs` and `.husky/pre-commit` — **same class** but different contents. Hook-audit is NOT reusable without reshape | `reshape` |
| 5 | `skill-ecosystem-audit` | 24 | 21-category skill audit: frontmatter compliance, cross-refs, registry sync, agent orchestration hygiene | HIGH — hardcodes `SKILL_INDEX.md`, CLAUDE.md trigger-table grammar, `docs/agent_docs/FIX_TEMPLATES.md`, `CODE_PATTERNS.md`, 30-/60-day staleness windows | **Possible meta-use only**: verifying `/migration` itself ported cleanly (self-dogfood proof per Q10) | `reshape` |

---

## 3. Top integration points

### 3.1 Invocation tracking (all 5 — HIGH friction for `/migration`)

Each audit's Phase 8 / closure writes:
```
cd scripts/reviews && npx tsx write-invocation.ts --data '{...}'
```
Cite:
- `hook-ecosystem-audit/SKILL.md:394`
- `health-ecosystem-audit/SKILL.md:249`

This handshake lives in `scripts/reviews/` — a SoNash-specific invocation
tracker. `/migration` itself will almost certainly inherit this same pattern
(all serious SoNash skills do). **Migration blocker:** `scripts/reviews/` is
**unported** in JASON-OS; it's a prerequisite for ANY SoNash skill port.
Already flagged in D3 research threads (Q3 blocker inventory).

### 3.2 `/add-debt` TDMS handshake (all 5)

Each skill defers findings via `/add-debt` with `source_id:
review:{audit-name}-ecosystem-audit-{date}`. Cite:
- `_shared/ecosystem-audit/CRITICAL_RULES.md:62`
- `hook-ecosystem-audit/SKILL.md:274`

JASON-OS has `add-debt` stub per active-skills listing — **present** in
bootstrap form (writes to `.planning/DEBT_LOG.md`). So `/migration` can
itself use `/add-debt` for "deferred migration decisions," but that's a
direct consumer pattern, not an ecosystem-audit-mediated one.

### 3.3 Shared module: `_shared/ecosystem-audit/` (6 files)

Four of the five (doc, health, hook, skill) delegate Critical Rules,
Compaction Guard, Finding Walkthrough, and Summary/Trends to
`.claude/skills/_shared/ecosystem-audit/*.md`. Cite:
- `skill-ecosystem-audit/SKILL.md:51`, `:67`, `:150`, `:161`
- `doc-ecosystem-audit/SKILL.md:45-46` (identical pattern)
- `health-ecosystem-audit` does NOT use `_shared/` — it uses `REFERENCE.md`
  (older pattern, pre-extraction). `hook-ecosystem-audit` also uses
  `REFERENCE.md`. The 2026-03-25 extraction ported only doc + skill + 2
  others to `_shared/`.

**Migration relevance:** The `_shared/` pattern is **directly applicable**
to `/migration`'s own multi-skill decomposition (Q7). If `/migration`
spawns `/migration-scan` + `/migration-reshape` + `/migration-prove`, they
can share `_shared/migration/CRITICAL_RULES.md` etc. Pattern is proven in
SoNash.

### 3.4 State file & history convention (all 5)

- Progress file: `.claude/tmp/{audit}-audit-progress.json` (2-hour TTL)
- Session log: `.claude/tmp/{audit}-audit-session-{YYYY-MM-DD-HHMM}.jsonl`
- Report: `.claude/tmp/{audit}-audit-report-{YYYY-MM-DD}.md`
- History: `.claude/state/{audit}-ecosystem-audit-history.jsonl`

`/migration` needs an **equivalent state rubric** for Phase 0→6 gates.
D28's iterative-re-entry norm suggests a richer state schema — but the
`.claude/tmp/` + `.claude/state/` split is the right shape. Cite:
`hook-ecosystem-audit/SKILL.md:108-137`, `:403`.

### 3.5 `sanitize-error` + security-helpers import chain

`hook-ecosystem-audit/scripts/checkers/code-quality-security.js:134,202-203`
— the hook audit actively detects whether other scripts import
`scripts/lib/sanitize-error.js`. JASON-OS CLAUDE.md §2 references
`sanitize-error.cjs` (note `.cjs` — JASON-OS variant). This is a
**reshape signal** for any ported hook audit: regex pattern
`/\b(?:sanitize-error|sanitize-input|sanitizeError|sanitizeInput)\b/` is
fine but `patchTarget` and advice strings encode SoNash path
`scripts/lib/sanitize-error.js` — JASON-OS uses `.cjs` extension.

### 3.6 Not-integration (explicit non-call-sites for /migration)

None of these 5 skills will be **called** by `/migration` during an active
migration run. Their outputs (reports, history JSONLs) could inform a
pre-migration health snapshot but that's optional, not in the seven-phase
arc.

---

## 4. Dispatch-pattern observations (for Q1 cross-pollination)

These are the **reusable orchestration primitives** `/migration`'s multi-agent
dispatch (Q1) should copy.

### 4.1 "COMPLETE:" return-line protocol

Every sub-audit invoked by the orchestrator returns **one line**:

```
COMPLETE: {audit-name} grade {grade} score {score} errors {N} warnings {N} info {N}
```

Cite: `comprehensive-ecosystem-audit/SKILL.md:37-39`,
`comprehensive-ecosystem-audit/reference/WAVE_DETAILS.md:87-88,108-110,...`.

This is the Windows-0-byte-bug mitigation (per SoNash CLAUDE.md
behavioral-guardrail 15: "Never accept empty agent results silently"). Short
return keeps orchestrator context small. **Direct transplant** for
`/migration`'s Phase 2/3 parallel research spawns.

### 4.2 JSON-to-file side channel

Full payload lands at `.claude/tmp/ecosystem-{name}-result.json`; orchestrator
reads **only** summary sections (first 50 lines, or `summary` key). Cite:
`WAVE_DETAILS.md:268-295` (node -e eval extracting only summary+top-3
findings).

This is the "big result, narrow return" pattern. `/migration` research
agents producing reshape-idiom reports should use this same shape:
full MD to `.research/migration-skill/findings/`, orchestrator gets
`COMPLETE: {findings-file} size {N}KB topics {T1,T2,T3}`.

### 4.3 Staged-wave architecture with checkpoints

`comprehensive-ecosystem-audit`: Stage 1 (5 parallel) → checkpoint (verify 5
result files exist, non-empty) → Stage 2 (3 parallel) → checkpoint → Stage 3
(sequential aggregation). Per-stage partial-failure tolerance: re-normalize
weights to 100% over completed audits. Cite: `WAVE_DETAILS.md:154-175`,
`SKILL.md:135-140`.

**Migration relevance:** `/migration` Phase 3 (Research) is verdict-
conditional (D25) — for `reshape`/`rewrite` it needs to dispatch parallel
destination-idiom research. Staged + checkpointed + fault-tolerant is the
right shape. The weight-renormalization detail (`WAVE_DETAILS.md:328-335`)
is a nice idea for confidence scoring when one research agent crashes.

### 4.4 Compaction-guard / resume protocol (all 5)

2-hour stale TTL on `.claude/tmp/*-progress.json`; on resume, display
dashboard from saved data, skip re-running script, show
"Resuming audit from finding {n}/{total}". Cite: `hook-ecosystem-audit/
SKILL.md:114-131`.

This is D22 (gate-memory R3) in action — prior decisions shown as context,
confirmation re-required per user-level decision. `/migration` can adopt
this verbatim for gate-state persistence across sessions.

### 4.5 Domain-chunked walkthrough (skill-ecosystem-audit only)

`skill-ecosystem-audit` extends the shared compaction guard with
`currentDomain` and `domainsCompleted` fields (SKILL.md:74). This is an
answer to "scope explosion" — when findings > 30, walk by domain-chunk, save
between chunks. Cite: `skill-ecosystem-audit/SKILL.md:72-75`.

**Migration relevance:** If `/migration` Phase 2 discovers many file/workflow/
concept candidates (a bulk-migration case), domain-chunked gates let user
pause between chunks without losing decisions. Direct pattern reuse.

### 4.6 `--batch --summary` flag contract

All run-*-audit.js scripts accept `--batch` (suppress state writes) and
`--summary` (compact output). `--batch` is MANDATORY when invoked by the
orchestrator, to avoid parallel state-file contention. Cite:
`hook-ecosystem-audit/SKILL.md:152-153`, `run-hook-ecosystem-audit.js:13-14`.

**Migration relevance:** any `/migration`-spawned research agent writing to
`.research/migration-skill/findings/` needs an analogous "batch mode" flag
to avoid stomping parent orchestrator state.

### 4.7 Orchestrator "agent roster" separation from sub-skills

The comprehensive orchestrator **does not re-implement** sub-audit logic —
it only dispatches. Each sub-audit's `run-*-audit.js` stands alone (user can
invoke `/hook-ecosystem-audit` directly). Same skill, two invocation modes:
interactive (direct) or batch (orchestrated). Cite:
`hook-ecosystem-audit/SKILL.md:139-153` ("Dependency Constraints" — single-
threaded interactive OR one of 4 parallel agents).

**Migration relevance:** `/migration` can be invoked directly OR as part of
a hypothetical `/comprehensive-port-check`. Same SKILL.md file; `--batch`
flag toggles Q&A off and produces machine-readable summary. Saves having to
maintain two skill-shapes.

---

## 5. Coupling distribution

| Coupling grade | Count | Skills |
|---|---|---|
| LOW | 0 | — |
| MED | 0 | — |
| HIGH | 5 | all 5 |

All 5 carry sonash-v0 path assumptions, ecosystem-v2 JSONL schema assumptions,
or SoNash-specific subsystem references (scripts/health, scripts/reviews,
DOCUMENTATION_INDEX, CLAUDE.md trigger-table grammar, .husky pipeline). None
would run in JASON-OS without reshape.

---

## 6. Sources

- `C:\Users\jbell\.local\bin\sonash-v0\.claude\skills\comprehensive-ecosystem-audit\SKILL.md:1-172`
- `C:\Users\jbell\.local\bin\sonash-v0\.claude\skills\comprehensive-ecosystem-audit\reference\WAVE_DETAILS.md:1-369`
- `C:\Users\jbell\.local\bin\sonash-v0\.claude\skills\doc-ecosystem-audit\SKILL.md:1-253`
- `C:\Users\jbell\.local\bin\sonash-v0\.claude\skills\doc-ecosystem-audit\scripts\checkers\coverage-completeness.js:127-302`
- `C:\Users\jbell\.local\bin\sonash-v0\.claude\skills\doc-ecosystem-audit\scripts\checkers\generation-pipeline.js:93-167`
- `C:\Users\jbell\.local\bin\sonash-v0\.claude\skills\health-ecosystem-audit\SKILL.md:1-273`
- `C:\Users\jbell\.local\bin\sonash-v0\.claude\skills\health-ecosystem-audit\REFERENCE.md:295-304`
- `C:\Users\jbell\.local\bin\sonash-v0\.claude\skills\health-ecosystem-audit\scripts\run-health-ecosystem-audit.js:32-120`
- `C:\Users\jbell\.local\bin\sonash-v0\.claude\skills\hook-ecosystem-audit\SKILL.md:1-440`
- `C:\Users\jbell\.local\bin\sonash-v0\.claude\skills\hook-ecosystem-audit\REFERENCE.md:276-313`
- `C:\Users\jbell\.local\bin\sonash-v0\.claude\skills\hook-ecosystem-audit\scripts\run-hook-ecosystem-audit.js:1-220`
- `C:\Users\jbell\.local\bin\sonash-v0\.claude\skills\hook-ecosystem-audit\scripts\checkers\code-quality-security.js:134,202-203`
- `C:\Users\jbell\.local\bin\sonash-v0\.claude\skills\skill-ecosystem-audit\SKILL.md:1-271`
- `C:\Users\jbell\.local\bin\sonash-v0\.claude\skills\skill-ecosystem-audit\scripts\checkers\agent-orchestration.js:1-299`
- `C:\Users\jbell\.local\bin\sonash-v0\.claude\skills\skill-ecosystem-audit\scripts\checkers\coverage-consistency.js:181-474`
- `C:\Users\jbell\.local\bin\sonash-v0\.claude\skills\_shared\ecosystem-audit\CRITICAL_RULES.md:1-71`
- `C:\Users\jbell\.local\bin\JASON-OS\.research\migration-skill\BRAINSTORM.md` §3 D23–D27, §5 Q1–Q2
- `C:\Users\jbell\.local\bin\sonash-v0\CLAUDE.md` §4 behavioral guardrail 15 (Windows 0-byte bug)
- `C:\Users\jbell\.local\bin\JASON-OS\CLAUDE.md` §2 (sanitize-error.cjs)
