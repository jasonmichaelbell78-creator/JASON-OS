# JASON-OS Foundation — Decision Record

**Date:** 2026-04-16 (revised post-Batch-6 and post-SoNash-hook-investigation)
**Topic:** JASON-OS Foundation (research slug: `jason-os-mvp`)
**Decisions captured:** 38 across 6 batches + 6 meta-instructions
**Primary research input:** `.research/jason-os-mvp/RESEARCH_OUTPUT.md` v1.2
**Revision note:** D36 revised and D37 replaced after investigation of SoNash `.husky/` and pattern-compliance scripts (see Batch 6 section). Layer 0+ item list consolidated at end.

---

## How to Use This Document

This is the standalone decision record referenced during Foundation implementation. Every plan step cites decisions by ID (e.g., "per D13, write to PORT_ANALYSIS.md"). If a decision is ambiguous in practice, flag and re-decide here — don't invent. Deep-plan's PLAN.md references this document; it does not duplicate it.

---

## Meta-Instructions (Durable Rules Through Every Step)

These are operator directives captured during discovery that shape how steps are executed, not what is built. Every port step, every hook wiring, every skill adaptation must honor these.

| ID | Rule | Source | Applies To |
|----|------|--------|------------|
| **MI-1** | **Pre-analysis before every port.** Every file ported from SoNash MUST first undergo pre-analysis: (a) SoNash-reference scan (extended regex per D21), (b) upstream callers, (c) downstream dependencies. No file is ported without this analysis completing first. Output: central `PORT_ANALYSIS.md` ledger (D13). | User, Batch 1 | Every Layer 0+/0/1/2/3/4 port step |
| **MI-2** | **Deferrals need a place in PLAN.md.** Every deferred item (Layer 2/3/4 gates, §3 deferral, advisory→mandatory flip, etc.) appears in the Post-Foundation Deferrals section with explicit trigger conditions — not in prose. | User, Batch 1 | PLAN.md structure (D15) |
| **MI-3** | **Post-Foundation: sync-mechanism research is the immediate next project.** Start with BACKWARDS sync (SoNash → JASON-OS); prepare architecture for FORWARD sync (JASON-OS → downstream) "sooner than later." Easily expandable as features added. PLAN.md's final step routes to `/brainstorm sync-mechanism`. | User, Batch 1 | PLAN.md handoff (D14) |
| **MI-4** | **Pre-push PR review required before first PR.** Qodo + SonarCloud at minimum (GitHub Apps + workflow + secrets). User-action steps PROMPTED (per `feedback_user_action_steps.md`), not silently assumed. CodeRabbit excluded per prior SoNash experience. | User, Batch 3 | New Foundation scope; placement per D22 |
| **MI-5** | **Per-skill self-audit scripted from base.** Each ported skill receives its own self-audit, generated from a shared base and adjusted for that skill's invariants. Refresh `skill-audit` from SoNash feature branch (D31) BEFORE any per-skill self-audit work. | User, Batch 4 | Layer 0+ item `0f` (D30) + every skill port |
| **MI-6** | **Todo-graduation.** Post-Foundation Deferrals (MI-2) are a temporary home. The moment `/todo` becomes operational (D9 Layer 0 full-port completes), deferrals migrate into `/todo` as tracked backlog items with trigger conditions preserved. Plan's Deferrals section becomes a pointer to the `/todo` query. Prevents "deferred but forgotten." | User, Batch 6 | Layer 0 completion triggers migration step; all items currently in Post-Foundation Deferrals |

---

## Batch 1 — Strategic Foundation (D1–D7)

Decisions that shape every downstream choice. Resolves research's three open strategic questions (SQ-1, SQ-2, G16).

| # | Topic | Choice | Rationale |
|---|-------|--------|-----------|
| **D1** | SQ-1 Extract-vs-Design | **Hybrid** — extract infrastructure (hooks, `hooks/lib`, `SESSION_CONTEXT.md` format) as-is after pre-analysis; design skills/agents where SoNash coupling lives | Research implicitly maps to this — infra items labeled "copy as-is" while skill items flagged as "tailored rewrite." Avoids both "SoNash-in-a-trenchcoat" and full-reinvention cost. |
| **D2** | SQ-2 Workflow-as-product vs Artifact-port | **Both** — process doc (`AI_WORKFLOW.md` encodes brainstorm→research→plan→execute chain) + catalogs (`SKILL_INDEX.md` with version/sync) + ported artifacts | Process IS what makes the OS portable; catalogs are how AI navigates; aligns with memory `feedback_workflow_chain.md` |
| **D3** | G16 Stack declaration (CLAUDE.md §1) | **Language-agnostic project + Node.js infrastructure** — §1 says "project stack: agnostic; Claude Code infrastructure: Node.js 22 (.nvmrc)" | Honors brainstorm anti-goal "dev-only"; non-Node downstream projects not excluded; unblocks `/todo` full-port path |
| **D4** | CLAUDE.md §1-3 fill-in scope | **§1 + lightweight §2; §3 deferred** — §1 per D3; §2 per D24; §3 defers to architecture emergent from sync-mechanism work | Avoids over-committing §3 Architecture which should emerge from the 16-domain program |
| **D5** | Scope commitment | **Staged** — Layer 0+ and Layer 1 firm commitment; Layer 2/3/4 planned but re-approved per-layer at execution time | CH-C-006: home-feel criteria structurally derived, not user-validated. Ship 0+/1 first; discover if 2/3/4 actually matter to feel-like-home |
| **D6** | `user-prompt-handler` enforcement gradient | **Advisory-first** — stderr hints only during sessions 1-10; flip to mandatory later via config (D25) | Research explicitly recommends for sessions 1-10; allows wiring hook now; mandatory flip becomes env-var change, not code edit |
| **D7** | Maintenance-trap mitigation (CH-C-005) | **Full** — `SKILL_INDEX.md` + frontmatter fields (`portability_status`, `source_version`, `source_path`, `last_synced`) on all 9 skills | Research: "JASON-OS would have more robust tracking than its source"; low cost, high future value; prevents 6-month drift |

---

## Batch 2 — Scope & Item Selection (D8–D15)

Which specific research items are in/out; instrumentation for MI-1/2/3.

| # | Topic | Choice | Rationale |
|---|-------|--------|-----------|
| **D8** | Layer 0+ item selection | **ALL 5 IN** — 0a PROACTIVELY clauses (8 agents), 0b `.nvmrc`, 0c strip `write-invocation.ts` (9 skills), 0d GATE/BEHAVIORAL annotations (CLAUDE.md §4), 0e AgentSkills field hygiene (9 skills) | Total ~1.5-2h; each addresses research-flagged gap at zero infra cost |
| **D9** | `/todo` repair path | **Full port (~1.5h)** — copy `todos-cli.js`, `render-todos.js`, `todos-mutations.js`; strip invocation-tracking section; pre-analysis required per MI-1 | Hard deps present (`safe-fs.js`, `sanitize-error.js`, `parse-jsonl-line.js`); Node.js infra confirmed (D3); working `/todo` unlocks `session-begin` health check |
| **D10** | `/add-debt` stub | **Stub** (~60-line SKILL.md writing to `.planning/DEBT_LOG.md`, ~30-45 min) | Preserves `deep-research` Phase 5 routing signal; pairs with pre-commit-fixer lightweight pattern |
| **D11** | `hooks/lib` prereq scope | **All 4 files** (`git-utils.js`, `state-utils.js`, `sanitize-input.js`, `rotate-state.js`) copied after pre-analysis verifies zero-coupling claim | Enforces MI-1; if research's "zero SoNash coupling" claim holds, all 4 land together; if any has unexpected coupling, redesign or skip |
| **D12** | `SESSION_CONTEXT.md` format at bootstrap | **SoNash 5-field format exactly for v0** — Current Session Counter, Uncommitted Work, Last Updated, Quick Status section, Next Session Goals section | Ported hooks have hard dependency on 5-field contract; format compatibility first, extend after Foundation ships |
| **D13** | Pre-analysis output format (MI-1) | **Central `.planning/jason-os-mvp/PORT_ANALYSIS.md` ledger** — one row per file: source, target, refs-found, upstream, downstream, verdict, port date | Scannable; one place for go/no-go; survives Foundation as maintenance artifact; usable by eventual sync-mechanism work |
| **D14** | Post-Foundation handoff chain (MI-3) | **Full chain** — PLAN.md final step = `/brainstorm sync-mechanism`, honoring memory `feedback_workflow_chain.md` | Direction known (backwards first, forward prep); brainstorm this time = scoping for anti-goals and open questions specific to sync |
| **D15** | Deferrals structure in PLAN.md (MI-2) | **Post-Foundation Deferrals section** at end of PLAN.md — each deferral listed with explicit trigger condition; no numbered execution steps | Keeps Foundation PLAN.md focused on commitment; makes deferrals visible/searchable; pairs with sync-research handoff |

---

## Batch 3 — Execution Shape (D16–D21)

How the plan gets executed after approval.

| # | Topic | Choice | Rationale |
|---|-------|--------|-----------|
| **D16** | Execution order within Foundation | **Parallel-where-possible** — Layer 0+ and Layer 0 interleaved (both small, independent); then `1-prereq` → Layer 1 | Compresses ~3-4h into ~2h; `1-prereq` stays gated before Layer 1 where it matters; aligns with memory `feedback_parallel_agents_for_impl` |
| **D17** | Execution mode | **Split** — Layer 0+ manual in main session (tiny text edits); each port in Layer 0/1 dispatched to a port-agent (pre-analysis → PORT_ANALYSIS.md row → port → commit) | Avoids over-orchestration on cosmetic items; parallelizes actual port work; pairs with MI-1 ledger discipline |
| **D18** | Commit cadence | **Per logical bundle** — Layer 0+ (5 cosmetic items) = 1 commit; each port = 1 commit (pairs with PORT_ANALYSIS.md row); `SESSION_CONTEXT.md` + `session-end` port = 1 commit | Natural atomic revert units; one-commit-per-ledger-entry keeps bookkeeping neat |
| **D19** | Per-layer gate format (D5 staged re-engagement) | **Live feels-like-home check** — after using Foundation in a real session, subjective evaluation gates per-layer go/no-go | CH-C-006: criteria structurally derived; per-layer trigger = "has the pain point surfaced?" not "has time elapsed?" |
| **D20** | Foundation validation approach | **End-to-end validation session** after firm layers complete — full real session using Foundation features; confirm home-feel; revise PLAN.md before gated-layer commitment | CH-C-006: structural derivation needs user validation; cheap (one session); natural gate into Layer 2/3/4 planning |
| **D21** | Pre-analysis scan pattern (MI-1) | **Extended pattern** — bootstrap sanitization regex + upstream/downstream terms (`npm run (patterns:check\|session:gaps\|hooks:health\|session:end\|reviews:sync)`, `write-invocation.ts`, `session-end-commit`, `hasDebtCandidates`, `pr-ecosystem-audit`) | MI-1 requires upstream/downstream scan, not just sanitization; defining extended regex once keeps ledger entries comparable |

---

## Batch 4 — Specifics, PR Review & Process (D22–D29)

Pre-push PR review scope (MI-4); runAnalyze design; memory architecture; doc scopes.

| # | Topic | Choice | Rationale |
|---|-------|--------|-----------|
| **D22** | Pre-push PR review placement (MI-4) | **Split** — infra (Qodo/SonarCloud GitHub Apps + workflow YAML + secrets) in Layer 0+; `pr-review` SKILL.md port in pre-push mini-phase (paired with Layer 4 quality-skills cluster) | Infra is mechanical, fits 0+ pattern; SKILL.md port is heavier (71 sanitization hits in SoNash version) and pairs with Layer 4 |
| **D23** | Pre-push PR review integrations scope | **Qodo + SonarCloud only** (CodeRabbit EXCLUDED per user — SoNash removed it due to overlapping reviews + noise; Gemini + pr-retro defer to post-Foundation) | User directive: no CodeRabbit (durable preference, saved to memory `reference_pr_review_integrations.md`); minimum set meets MI-4 without known-painful integration |
| **D24** | CLAUDE.md §2 lightweight scope | **Expanded** — security-helpers/sanitize-error reference at §5 Anti-Patterns + explicit CI security stanza (SonarCloud quality gate + Semgrep + CodeQL as part of PR review; secrets never in git) | With pr-review in scope (MI-4/D22/D23), security review IS part of workflow; §2 should reference the pipeline |
| **D25** | `user-prompt-handler` `runAnalyze` stub design | **Full parameterized port** — dispatch table extracted to `.claude/analyze-directives.json`; mode via env var `JASON_ANALYZE_MODE=advisory\|mandatory`; mode flip is 1-line env change | Research's recommended pattern; same effort as simpler options but future-proofs the mandatory flip completely; aligns with D6 (advisory now, flip via config) |
| **D26** | `SKILL_INDEX.md` columns | **Minimum 6 cols** — name, description, `portability_status` (synced/forked/local-only), `source_path`, `source_version`, `last_synced` | Addresses CH-C-005 maintenance trap directly; extra columns added later when useful; avoids premature schema commitment |
| **D27** | Memory portability architecture (CH-C-010) | **Canonical-memory IS the portability story** — `.claude/canonical-memory/` git-tracked (done); onboarding step = manual `cp .claude/canonical-memory/* ~/.claude/projects/<slug>/memory/`; documented in `AI_WORKFLOW.md` | Research G2 recommendation; canonical-first with explicit promotion; aligns with Foundation's document-the-process posture; bidirectional sync defers to sync-mechanism research (MI-3) |
| **D28** | `AI_WORKFLOW.md` v0 content scope | **Core + PR-review placement + memory onboarding** — intro, workflow chain, Navigation Map, pointer table, PR-review section, canonical-memory `cp` step. ~180-220 lines. | Q22/Q27 both land in `AI_WORKFLOW` per D2 workflow-as-product; process-encoded, not catalog-encoded |
| **D29** | Self-audit checkpoint cadence | **Per layer boundary** — audit after `0+`, `0`, `1-prereq`, `1`, validation session, and each gated layer | Matches staged commitment (D5); natural revert points; pairs with per-logical-bundle commits (D18) |

---

## Batch 5 — Final Specifics (D30–D35)

MI-5 execution; catalog docs; session-end details; approval gate; retro.

| # | Topic | Choice | Rationale |
|---|-------|--------|-----------|
| **D30** | MI-5 execution — `skill-audit` refresh placement | **Layer 0+ item `0f`** — refresh from SoNash feature branch as sixth zero-cost win; every subsequent port includes per-skill self-audit sub-step | Refresh is infrastructure, not a repair; fits 0+ alongside other skill-hygiene items (0c, 0e); subsequent ports benefit from refreshed base |
| **D31** | Identifying SoNash `skill-audit` feature branch | **Auto-discover** — Claude checks `sonash-v0` git log for recent `skill-audit` commits, proposes branch, user confirms before pull | Saves user-action round trip; still prompts before pull per memory `feedback_user_action_steps` |
| **D32** | Catalog doc scopes | **Current items + `[PLANNED]` markers** — `HOOKS.md` includes `[PLANNED]` rows for Layer 1/2 hooks (commit-tracker, pre-compaction-save, compact-restore, user-prompt-handler, loop-detector, governance-logger, post-read-handler); `COMMAND_REFERENCE` includes PR-review commands once wired; `SKILL_INDEX` at 6-col minimum (D26) | Documents current + surfaces planned; `HOOKS.md` doubles as execution checklist during Layer 1/2 ports |
| **D33** | `session-end` v0 Step 3 target plan file | **Hardcode `.planning/jason-os-mvp/PLAN.md`** — simplest; evolve when next plan (e.g., `.planning/jason-os-sync/`) exists | Avoid premature plan-pointer infra; convention-based resolution can be added when there are actually multiple plans to route between |
| **D34** | Plan-approval gate granularity | **Staged approval** — firm layers (0+ + 1 + pre-push mini-phase) approved up-front; gated Layers 2/3/4 re-approved individually at feels-like-home gate | Consistent with D5 staged commitment + D19 feels-like-home trigger; firm layers get one approval, gated layers re-engage on demand |
| **D35** | Retro cadence | **One retro after firm-layer completion** — validation session (D20) doubles as retro input; feeds into gated-layer planning | Per-layer audits (D29) handle technical correctness; retro addresses plan-quality; one focused retro informs whether gated layers even matter; avoid retro fatigue |

---

## Batch 6 — Pre-commit / Pre-push Hook Scope (D36–D38, post-investigation revised)

Originally a 3-question addendum on pre-commit/pre-push hooks. User's follow-up question triggered a direct read of SoNash's `.husky/pre-commit` (776 LOC), `.husky/pre-push` (663 LOC), and the pattern-compliance/propagation subsystem (8 scripts + JSON registry + test suite). D36 was revised and D37 replaced after that investigation.

| # | Topic | Choice | Rationale |
|---|-------|--------|-----------|
| **D36** *(revised)* | Pre-commit / pre-push scope | **Husky scaffold with language-agnostic minimum** — minimal `package.json` with husky dev-dep + `.husky/pre-commit` + `.husky/pre-push` shells wired to: gitleaks (secrets), escalation-gate (blocks push on unacknowledged error-severity warnings), and a wrapper that defers to existing `block-push-to-main.js`. Skip code-quality, pattern, and propagation checks. Adds Layer 0+ item `0h`. | Investigation showed SoNash pre-commit/pre-push are far richer than "agent compliance." B-scoped husky scaffold gets the infrastructure so each future check becomes a single-line addition rather than infra work. Skipped items (13 pre-commit + 11 pre-push) migrate to `/todo` per MI-6. |
| **D37** *(new)* | Pattern cognition & propagation subsystem placement | **Post-Foundation project paired with sync-mechanism research** — they share "propagate changes across locations" DNA. Seeded now via Layer 0+ item `0i`: create `scripts/config/propagation-patterns.seed.json` with CLAUDE.md §5 anti-patterns formatted for future `check-pattern-compliance.js` consumption. Full port (8 scripts + registry + tests) becomes its own project after sync-mechanism research. | Pattern cognition without propagation = half the value; propagation without sync architecture = duplicative work. Small seed preserves direction; full subsystem earns its own project because SoNash has 8 scripts, a JSON registry, a test suite, and 7 npm scripts. |
| **D37-ORIGINAL** *(superseded)* | Pre-push scope beyond `block-push-to-main` *(original Q37)* | **Leave as-is** — block-push-to-main.js sufficient standalone; husky-B scaffold (D36-revised) now provides the structure for future additions. | Original standing unchanged; context evolved. Additional pre-push code-quality checks still deferred per original rationale (Qodo/SonarCloud fire on PR). |
| **D38** *(unchanged by revision)* | Placement of `pre-commit-agent-compliance` + `track-agent-invocation` | **Layer 2 (ambient intelligence)** — fits naturally as PreToolUse tripwire alongside `loop-detector` and `governance-logger`; `track-agent-invocation.js` is Layer 2 prerequisite. | D36-revised covers husky-scaffold-layer (Layer 0+). D38 places the Claude-Code-level hook in Layer 2 where it belongs. Both work together: husky fires before the git process; the Claude hook fires before Claude issues the `git commit` Bash call. |

---

## Consolidated Layer 0+ Item List (post-revision, post-self-audit)

Ten items. Total estimated effort: ~3.5-4.5h including pre-analysis (MI-1) on every ported script.

| Item | Description | Source | Est. |
|------|-------------|--------|------|
| **0a** | PROACTIVELY clauses on all 8 agents | D8 | 15-20 min |
| **0b** | `.nvmrc` (value: `22`) | D8 | 1 min |
| **0c** | Strip `write-invocation.ts` Invocation Tracking sections from 9 ported skills | D8 | ~20 min |
| **0d** | GATE/BEHAVIORAL annotations on CLAUDE.md §4 (16-row table ready) | D8 | ~30 min |
| **0e** | AgentSkills field hygiene on 9 skills (`compatibility`, `metadata.version`) | D8 | ~30 min |
| **0f** | Refresh `skill-audit` from SoNash feature branch; each subsequent port gets per-skill self-audit (MI-5) | D30, MI-5 | ~45 min + pre-analysis |
| **0g** | PR-review integrations infrastructure — Qodo + SonarCloud GitHub Apps + workflow YAML + secrets; CodeRabbit excluded | D22, MI-4 | ~45 min user-action + 30 min me |
| **0h** | Husky scaffold — minimal `package.json` + `.husky/pre-commit` + `.husky/pre-push` with gitleaks/escalation-gate/block-push-to-main wiring | D36-revised | ~30 min |
| **0i** | Pattern registry seed — create `scripts/config/propagation-patterns.seed.json` with CLAUDE.md §5 anti-patterns in future-compatible format | D37-new | ~15 min |
| **0j** | CLAUDE.md §1 + §2 fill-in — §1 language-agnostic + Node.js infrastructure; §2 expanded with security-helpers reference + CI security stanza; §3 stays deferred | D3, D4, D24 (added in Phase 3.5 self-audit) | ~20-30 min |

---

## Open Items / Explicit Non-Decisions

These were surfaced during research or discovery and deliberately NOT resolved here. All migrate to `/todo` backlog once `/todo` goes operational per MI-6.

**Architecture / scope:**
- **CLAUDE.md §3 Architecture** — defers to architecture emergent from sync-mechanism work (per D4). Tracked in Post-Foundation Deferrals.
- **Memory bidirectional sync** — defers to sync-mechanism research (CH-C-010).
- **Layer 2, 3, 4 engagement** — each gated by feels-like-home check per D19.

**Skills / integrations:**
- **Gemini integration in PR review** — CLI installed, OAuth pending; deferred post-Foundation.
- **`pr-retro` skill port** — stays deferred per `BOOTSTRAP_DEFERRED.md` (depends on `pr-ecosystem-audit`, not ported).

**Enforcement:**
- **`runAnalyze` mandatory mode flip** — deferred via config env var (D25 + D6); flipped when agents stabilize (trigger: ≥5 agents with PROACTIVELY clauses + stable workflow).

**Pre-commit / pre-push enrichment (D36-revised — 24 deferred checks):**
- Pre-commit additions: ESLint, tests, lint-staged, pattern-compliance, propagation-staged, audit-s0s1, skill-validation, cognitive-complexity, cross-doc-deps, doc-headers, doc-index auto-update, agent compliance, debt-schema, JSONL-MD sync (13 items).
- Pre-push additions: circular-deps, pattern-compliance-push, code-reviewer gate, propagation full, hook-tests, security-check, tsc, cyclomatic-CC, cognitive-CC, npm-audit, event-triggers (11 items).
- Trigger: each lands when prerequisites exist (stack chosen, tools installed, patterns seeded, etc.) AND migrated to `/todo` per MI-6.

**Pattern cognition & propagation subsystem (D37):**
- Full port (8 scripts + registry + tests + 7 npm scripts) as its own post-Foundation project, paired with sync-mechanism research.
- Trigger: after Foundation firm layers complete AND sync-mechanism research begins.
- Seed only in Foundation (Layer 0+ item `0i`).

---

## Caveats From Research (Must Be Honored in PLAN.md)

Pulled forward from DIAGNOSIS.md for quick reference during plan drafting:

1. **C-023 cross-model DISAGREE:** "32 of 80 portable" is structural upper bound, not ground truth. Don't use for scope sizing.
2. **CH-C-005 maintenance trap:** Covered by D7/D26.
3. **CH-C-010 memory portability:** Covered by D27 (canonical-memory) + deferred bidirectional sync.
4. **CH-C-003 compaction defense:** Must sequence `SESSION_CONTEXT.md` + `session-end` BEFORE pre-compaction-save wiring — covered in Layer 1 prereq ordering (D16).
5. **CH-C-008 advisory vs mandatory:** Covered by D6 + D25.
