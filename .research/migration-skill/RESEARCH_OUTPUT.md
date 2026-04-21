# Research Report: /migration skill design and architecture

**Date:** 2026-04-21
**Depth:** L1 (Exhaustive)
**Question Type:** skill design / architecture
**Domain:** technology
**Overall Confidence:** HIGH (evidence-rich across 35 D-agents; contradictions explicitly surfaced + re-synthesized)

**Re-synthesized 2026-04-21** — incorporated findings from V1-V4 verifiers, contrarian + OTB challenges, and 2 dispute resolvers (arch + CAS). Changes touched ~38% of claims; decomposition label, CAS auth scope, D16 back-direction, agent count, and /sonash-context classification were reframed.

**Post-gap re-synthesis 2026-04-21 (Phase 3.97)** — added Theme 12 (loop-control protocol) from G1 + GV1; updated Theme 6 (CAS) with G2 + GV2 SoNash-side cost findings; claims ~150, sources ~110. Gap-pursuit round 1 dispatched 2 G-agents (G1 loop-control, G2 SoNash-source-cost) + 2 GV-agents (GV1 + GV2). GV1 forced A5/A8 v1.1 scope-tagging + soften of rustc byte-identity claim; GV2 corrected SoNash-side grep counts and identified a data-integrity bug (SonarCloud key has TWO variants — `jasonmichaelbell78-creator_sonash-v0` AND `<sonar-key-no-creator-variant>`). See Contradictions & Open Questions and Methodology lessons learned for the full change log.

---

## Executive Summary

The `/migration` skill is designed as a **heavy-lifting cross-repo active-transformation tool** with JASON-OS as one endpoint and any locally-cloned external repo as the other. After synthesizing 35 parallel D-agent investigations across 12 research questions — plus 4 verifier passes, 1 contrarian challenge, 1 OTB challenge, and 2 dispute-resolver rounds — the canonical architecture is **minimum-viable router + 2 ancillaries** (primary `/migration` with monolith-with-companions **internal layout**; ancillaries `/migration-scan` at Phase 2 and `/migration-prove` at Phase 6, as peer skills per D7-cas-precedent boundary heuristic). The whole-family shape is Shape D (router-plus-ancillary-skills) applied minimally; the "monolith-with-companions + phased-pipeline" label describes only the primary skill's internal file layout, not the family architecture (per dispute-resolutions-arch Dispute 1). The single most load-bearing pattern across the ecosystem is the SoNash "write-to-disk-first, state-file-as-spine, gates-at-every-decision" triad — every viable candidate pattern in the codebase uses it, and `/migration`'s 7-phase arc plus D8 "nothing silent" rule demands it [1][2][3].

`/migration` needs **2 new custom agents + 6 reused** (per dispute-resolutions-arch Dispute 3). New: `migration-executor` (single active-transformation agent using verdict-aware prompting — sanitize/reshape/rewrite dispatched via prompt variation inside one agent, following the `pre-commit-fixer` `general-purpose` precedent) and `migration-plan-author` (MIGRATION_PLAN.md authoring). Reused: `deep-research-searcher`, `deep-research-verifier`, `contrarian-challenger`, `dispute-resolver`, `Explore` built-in, `convergence-loop` (skill). The original D1-migration-agent-spec 8-9-new-agent proposal has been **collapsed** — four of the proposed new agents had identical tool grants, and tool-grant differentiation justifies at most 1-2 distinct executors. JASON-OS's 8 existing agents are exclusively research/synthesizer/challenge roles with NO Edit/MultiEdit tool grants, so Phase 5 still needs the new executor; the v1.1 split trigger (break `migration-executor` into sanitizer/reshaper/rewriter siblings) is observation-gated, not speculative. Doubling the agent inventory (8 → 16-17) for a single skill was deemed disproportionate governance cost [4][5][6].

Execution readiness is currently blocked by **three hard prerequisites** (shift-risk 1): the `/sync` engine (Piece 5) is unbuilt with two upstream pieces still in flight; CAS is entirely absent from JASON-OS and by D19 decision must be ported *through* `/migration` itself as its first real job; and no content-sanitize / reshape / rewrite primitive exists in JASON-OS's `scripts/lib/` — the existing `sanitize-error.cjs` is an *error-log* scrubber, not a content transformer. Additional medium-risk blockers include: `/pr-review`, `add-debt`, and `label-audit` in partial/stub state with volatile schemas; the CLAUDE.md §4 NEEDS_GATE hooks for user-prompt frustration detection, loop detection, and agent-result-size validation are still honor-only; and the Windows 0-byte agent bug (upstream issue #39791 / #17147) remains OPEN, mandating the "persistence safety net" pattern on every Phase 5 spawn [7][8][9][10].

The active-transformation pipeline (D23/D24) is best modeled as a **4-lane verdict router with 11 transformation primitives** (copy-bytes → regex-replace → string-rename → template-substitute → frontmatter-rewrite → import-swap → section-restructure → helper-inject → schema-rebind → domain-rewrite → research-dispatch-mid-execute), **9 signal detectors** for verdict assignment, and gate budgets scaling per-verdict (1 / 2 / 3 / 4 gates for copy-as-is / sanitize / reshape / rewrite). Idiom detection is recommended as a 3-source hybrid: static scan of destination `.claude/skills/_shared/` (authoritative) + optional `IDIOM_MANIFEST.yaml` (explicit override) + few-shot LLM inference gated at discovery surface. Atomicity is **per-verdict-unit** (one commit per unit in direct-apply mode), with 11 failure modes enumerated and git-rebase-style `--continue / --skip / --abort` verbs for resume [11][12][13].

The plan-export mode (D26) should emit a **markdown-primary + YAML-frontmatter + sidecar-payload hybrid** that is destination-agnostic — L0 operator reads manually, L1 plain `apply.sh`/`apply.ps1` runs it, L2 tiny `/apply-migration-plan` skill consumes it (~100-200 LOC), L3 full `/migration` skill executes it. The destination MUST NOT require `/migration` installed (would break the chicken-and-egg for first-port-to-new-repo). Terraform's plan/apply separation, Alembic upgrade/downgrade, Ansible idempotency guards, and dbt seeds' content-travels-with-plan pattern together inform the schema [14][15][16].

The CAS port is **35-38 port actions totaling ~143 person-hours** (~3-4 weeks calendar), with strict bottom-up order (schemas → lib → scripts/cas/ → handler skills → router LAST) and three XL rewrites dominating the critical path: `scripts/lib/analysis-schema.js` (493 lines), `scripts/cas/self-audit.js` (814 lines), and `repo-analysis/REFERENCE.md` (2,032 lines). The three hardcoded `jasonmichaelbell78-creator/sonash-v0` home-repo guard strings must rewrite together to a `HOME_REPO_URL` config; 7 cites across 4 skills must adopt a new `HOME_CONTEXT_FILES[]` config contract (JASON-OS has CLAUDE.md but no SESSION_CONTEXT.md or ROADMAP.md yet — fail-soft loader required). A serendipitous discovery: the `.research/content-analysis.db` and `.research/knowledge.sqlite` databases in SoNash are **byte-identical** (both 409,600 bytes, identical MD5) — stale alias of the real DB and a port-time landmine [17][18][19].

Self-dogfood is best operationalized as **7 criteria with round-trip property as keystone**: C1 produces own MIGRATION_PLAN.md targeting SoNash, C2 plan executes cleanly in SoNash, C3 ported /migration in SoNash produces structurally-identical results, C4 back-direction works (SoNash → JASON-OS), C5 re-port/diff-port modes return empty diff on unchanged inputs, C6 round-trip JASON-OS → SoNash → JASON-OS is idempotent (analogous to rustc stage2-fixpoint and terraform `apply` → `plan` = 0 changes), C7 zero-drift property (second run on unchanged source = empty plan). A lightweight single-file `ITERATION_LEDGER.md` is recommended to preserve multi-loop D28 re-entry coherence — a full ADR-per-decision system is overkill but the current BRAINSTORM/RESEARCH/PLAN triad already shows D-number collisions and missing re-entry provenance after only 2 iterations [20][21][22].

Gap-round 1 adds two structural findings to the executive picture: **Theme 12 (loop-control protocol)** formalises D28 multi-iteration coherence as a real fixed-point convergence proof via Kildall monotone-lattice semantics + 5-property idempotency contract (I1-I5) + 5-layer termination guard stack — upgrading the meta-ledger from "good idea" to "termination-proof prerequisite" and giving `/migration` the mathematical ammunition to claim it terminates [G1][GV1]. **Revised CAS port cost, post-G2+GV2:** the realistic /migration v1 gross estimate rises to **~160-170 person-hours** (~143h D6 CAS mechanical port + ~25-40h codemod-carrying load, SoNash-side refactor cost = 0h under the HYBRID absorb-in-/migration default); if operator elects the optional SoNash-side pre-port hygiene pass, add 24-43h SoNash-side [G2][GV2]. **Methodology callout:** grep scope-narrowness surfaced twice this run (V3 CAS auth claim, G2 SoNash cost claim) with identical failure mode — the verifier/contrarian must grep **broader** scope and **different** patterns than the D-agent's evidence path. See Methodology lessons learned.

### Top 3-5 recommendations

1. **Ship `/migration` v1 as minimum-viable router + 2 ancillaries.** Primary `/migration` (monolithic 7-phase orchestrator) with **monolith-with-companions internal layout** (SKILL.md + REFERENCE.md overflow + optional `verdicts/*.yaml` idiom configs + `scripts/migration/apply-plan.js` executable helper) + peer skills `/migration-scan` (Phase 2 standalone) and `/migration-prove` (Phase 6 convergence-loop harness). Do NOT pre-factor `/migration-reshape` or `/repo-profile` (state coupling too tight). Per dispute-resolutions-arch Dispute 1: "monolith-with-companions" as a whole-family descriptor is forbidden; it refers only to the primary skill's internal file layout.
2. **Port order, bottom-up:** Tier 0 shared primitives (sanitize-error.cjs, safe-fs.js, security-helpers.js — 3 files, ~0.5 day); Tier 1 convergence-loop skill (5× recurrence across migration phases; single biggest unlock); Tier 2 CAS port as `/migration`'s self-dogfood (~143h, 3-4 weeks); Tier 3 `/sync` engine (Piece 5 — still has Pieces 3.5 and 4 ahead of it); Tier 4 `/migration` itself, shipping last.
3. **Adopt the Windows 0-byte persistence safety net on every Phase 5 agent spawn** — post-spawn `wc -c` check, capture `<result>` text fallback, max 1 retry then escalate. CLAUDE.md §4 guardrail #15 is currently honor-only; `/migration` needs this as a structural gate or commit failures will silently corrupt outputs. The upstream issue #39791/#17147 is OPEN as of 2026-04.
4. **Design MIGRATION_PLAN.md as destination-agnostic** with three apply channels (L0 manual, L1 shell script, L2 tiny `/apply-migration-plan` skill). Never require `/migration` at destination — breaks first-port-to-new-repo bootstrap.
5. **Adopt a lightweight single-file `ITERATION_LEDGER.md`** to preserve D28 multi-loop coherence. One append-only row per skill re-entry (iter, date, skill, trigger, source-iter, touches-decisions). Full ADR system is overkill; zero meta-ledger is already breaking (D-number collision visible after 2 iterations).

---

## Key Findings

Organized by theme rather than sub-question. Each theme integrates findings from multiple D-agents across the 12 research questions.

### Theme 1: `/migration` skill decomposition shape (Q1, Q7)

**Two distinct recommendations surface, with different framing but converging on a router-with-ancillaries direction:**

D7-router-vs-monolith recommends **option (b): router + 2-3 ancillaries** — `/migration` as monolithic primary with internal 7-phase arc + `/migration-scan` (Phase 2 standalone) + `/migration-prove` (Phase 6 convergence-loop wrapper). Phases 2 and 6 each hit 4+ of 7 decomposition criteria (standalone value, reusable, state-isolated, testable in isolation); phases 0, 1, 3, 4, 5 each hit 0-1 criteria. External precedent: dbt (dbt run/test/seed/build — phased sub-commands), Flyway (`info`, `repair` mid-flow), Terraform (plan-apply separation). Reject `/migration-reshape` and `/repo-profile` extraction: reshape has no state without a plan, profile-export pair has awkward re-runnability [23].

D7-other-multi-skill-families recommends **monolith-with-companions modeled on deep-research** (Shape A + Shape C phased-pipeline), with `verdicts/*.yaml` analogous to `deep-research/domains/*.yaml`, plus executable helper scripts analogous to `mcp-builder/scripts/evaluation.py`. Rejects shared-chassis Shape B (premature) and router-plus-ancillary-skills Shape D (CAS precedent, handled by D7a) for v1 [24].

D7-cas-precedent documents CAS as a working precedent for the decomposition Q7 contemplates (`/analyze` router → 4 handlers → `/synthesize`/`/recall` postprocessors). Identifies 7 works-count patterns worth adopting and 5 breaks-count anti-patterns to avoid. Boundary heuristic: promote a worker to peer skill when (a) has own user-facing invocation, (b) owns distinct artifact set, (c) re-runnable independently — otherwise keep as agent-within-skill [25].

**Convergence:** All three findings support some decomposition, with the minimum being a router front door plus 2 standalone-invocable ancillaries (scan, prove). The contradiction is primarily on *how much* to extract: deep-research-style monolith-with-passive-companions (D7-other) vs router-with-active-sibling-skills (D7-router-vs-monolith). D7-cas-precedent provides the boundary heuristic to resolve: Phases 2 and 6 satisfy all three criteria (a, b, c), so active-sibling-skills is justified for those two; Phases 3, 4, 5 fail (c), so stay monolith.

**Contrarian caveat (per challenges/contrarian.md Challenge 1):** D7-cas-precedent's boundary heuristic was authored inside the same Q7 cluster whose contradiction it adjudicates. Its discriminating power is structural (3 yes/no questions), but provenance means it's **one of three converging arguments**, not an independent tiebreaker. The other two converging signals are the refactor-cost asymmetry and precedent-catalog convergence (Terraform plan/apply + dbt run/test/seed + Flyway info/repair all support 2-ancillary shape).

**Recommendation:** **Minimum-viable router + 2 ancillaries** (Phase 2 scan, Phase 6 prove), everything else monolith. Primary internal layout follows Shape A (monolith-with-companions) + Shape C (phased pipeline); the whole-family architecture is Shape D (router-plus-ancillary-skills) applied minimally per D7-cas-precedent boundary heuristic. D7a and D7b converge on extraction; the canonical label is "minimum-viable router + 2 ancillaries" (per dispute-resolutions-arch Dispute 1). Refactor cost asymmetry favors under-decomposing (1-3 days to extract later) over over-decomposing (1-2 weeks to re-monolith) [23].

**Confidence:** HIGH (post-dispute-resolution; was MEDIUM pre-resolution per V4 triad flagging)

---

### Theme 2: Agent roster + parallel dispatch (Q1)

**JASON-OS has 8 agents** (all Sonnet-backed, all `/deep-research`-pipeline shape). Zero of them have Edit/MultiEdit tool grants. Every existing agent is read/research/challenge/synthesize — none are transformation-oriented. This is the single largest agent-layer gap for `/migration` [4].

**SoNash has 49 live agents** (57 top-level files, 8 are deprecated redirect stubs). Coupling split: 16 heavily-SoNash-coupled, 8 thin-coupled (deep-research pipeline, strip `skills: [sonash-context]`), 12 of 18 gsd-* agents are pipeline-portable (fully generic — per V1 count clarification), plus 11 divergent `global/` gsd-* variants. Portable ratio after sanitization is roughly 20:21 — essentially half the live agent surface is reachable for `/migration` [26].

**Agent roster (POST-RESOLUTION, per dispute-resolutions-arch Dispute 3): 2 new custom + 6 reused** (total JASON-OS inventory goes from 8 → 10). New agents: `migration-executor` (single active-transformation agent, verdict-aware prompting handles sanitize/reshape/rewrite differentiation via prompt — matches `pre-commit-fixer` `general-purpose` pattern at `pre-commit-fixer/SKILL.md:168-170`; per V2, actual line is :153 — substance unchanged; tool grants `Read, Write, Edit, Bash, Grep, Glob, WebSearch, WebFetch, Context7 MCP`; model sonnet default, opus flag for rewrite verdicts) and `migration-plan-author` (writes MIGRATION_PLAN.md — schema differs from RESEARCH_OUTPUT.md enough to warrant distinct agent from `deep-research-synthesizer`). Reused: `deep-research-searcher` (Phase 2 discovery scan; Phase 3 idiom research), `deep-research-verifier` (Phase 6 prove — dual-path verification), `contrarian-challenger` (Phase 2 adversarial verdict check; optional Phase 4 plan challenge), `dispute-resolver` (mid-execute idiom conflicts), `Explore` built-in (Phase 0 context load; Phase 2 ripple map), `convergence-loop` skill (Phase 6 wrapped by `/migration-prove` ancillary) [27][6].

**Collapsed / rejected from original 8-9-new proposal:** `migration-discovery-scanner` → reuse `deep-research-searcher` with migration-scoped prompt; `migration-verdict-assigner` → orchestrator-owned (not a long-running investigation); `migration-plan-checker` → `deep-research-verifier` with MIGRATION_PLAN.md profile; `migration-sanitizer/reshaper/rewriter` → collapsed into `migration-executor` (verdict-aware prompt); `migration-prove-reporter` → orchestrator-owned (template population, no reconciliation burden). **v1.1 split trigger is observation-gated:** break `migration-executor` into sanitizer/reshaper/rewriter siblings only if gate traces show verdict-collision OR rewrite-verdict units demand a dedicated opus-model agent.

**Dispatch patterns — 8 catalogued:** (1) Fixed-wave staged dispatch from `comprehensive-ecosystem-audit` (5+3 agents in 2 stages); (2) Byte-weighted batching from `label-audit` (~120-150 KB per batch, primary+secondary cross-check); (3) Wave-with-queue via D + 3 + floor(D/5) formula; (4) Scaling-by-depth from `deep-research` (L1-L4 verifier/challenger counts); (5) Conditional gap pursuit with capped fan-out (ceil(G/2), depth caps L1=4 through L4=10); (6) Context-exhaustion re-spawn (Critical Rule 8 — split across 2+ smaller agents, never accept partial output); (7) Windows 0-byte fallback (Critical Rule 4); (8) TeamCreate for L4 interdependent sub-questions (gated behind CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1) [28][29].

**Runtime cap is 10 concurrent Task-tool spawns** (hard, not 4 as `deep-research` SKILL.md:209 states). The 4-agent skill-stated cap is a self-imposed **context discipline** budget. Community observation: the queue does not drain dynamically — 20 tasks = 10 run, then 10 run, not 10-and-replace-as-slots-free [10].

**Recommendation for `/migration`:** Phase 3 research follows fixed-wave 4-agent-cap pattern (Pattern 1+3). Phase 5 mid-execute fresh-idiom research follows incremental 1-2 agent dispatch (Pattern 5+6+2) — orchestrator is already juggling commit state + per-file verdicts + gate memory, can't afford 4-agent waves. Windows 0-byte persistence safety net on **every** Phase 5 spawn (MANDATORY per CLAUDE.md §4 guardrail #15).

**Confidence:** HIGH

---

### Theme 3: JASON-OS execution blockers (Q3)

**JASON-OS surface: 14 SKILL.md files** (= 11 built + 3 partial; the 3 partial are a SUBSET of the 14, not an additive count) **plus 3 referenced-and-absent systems** (`/sync`, CAS, `/pr-retro`) — per V1 wording clarification. **Three shift-risk-1 blockers** dominate:

1. **`/sync` engine (Piece 5) unbuilt.** Piece 3 labeling is *Next* (S8-S14 pending); Piece 4 registry after; Piece 5 last. `/migration` Phase 0 ("pull /sync registry") contract is speculative until Piece 5 exists. Sync-mechanism has its own brainstorm and parallel track [7].
2. **CAS entirely absent from JASON-OS.** Per D19, CAS port is `/migration`'s first real job. 6 CAS skills + 17 CAS scripts + shared schemas all need porting. No `.claude/skills/{analyze,document-analysis,media-analysis,recall,repo-analysis,synthesize}` in JASON-OS [17].
3. **No content-sanitize / reshape / rewrite primitive in `scripts/lib/`.** Existing `sanitize-error.cjs` is error-log scrubber, not content transformer. Every `/migration` verdict depends on primitives that don't exist. PORT_ANALYSIS.md (53KB) does this by hand today in SoNash [8].

**Medium-risk blockers:**

- **`add-debt` v0.1 stub** — real TDMS schema deferred until after sync-mechanism project; all Phase 5 verdict denials + Phase 6 prove failures that file debt will reshape when real schema lands.
- **`/pr-review` v4.6-jasonos-v0.1 (Foundation-scoped)** — reviewer set trimmed to Qodo + SonarCloud; CodeRabbit/Gemini excluded; named in BRAINSTORM D27 as cross-skill seed.
- **`label-audit` v0.2** — §S8 agent fleet wiring deferred; Piece 3 is *Next*; Phase 2 discovery calls label derivation.
- **CLAUDE.md §4 NEEDS_GATE hooks** — `frustrationDetection` (#5), `loop-detector.js` (#9), `track-agent-invocation.js` result-size check (#15) all honor-only. Without them, D8 "nothing silent" is aspirational.
- **Missing migration-state CLI + plan-writer** — no `scripts/migration/` exists; must be built as part of `/migration` itself.

**Recommendation:** Block `/migration` design at none of these; block `/migration` execution on (#1-3). CAS port self-dogfood is the natural bridge. Ship `/sync` in parallel.

**Confidence:** HIGH

---

### Theme 4: Active transformation pipeline (Q5) + failure recovery (Q8)

**Pipeline architecture:** 4-lane verdict router (copy-as-is / sanitize / reshape / rewrite, with skip and blocked-on-prereq as non-lanes). 9 signal triggers feed verdict assignment [11]:

- S1 hardcoded home-paths → sanitize
- S2 repo-name strings → sanitize
- S3 dest-absent imports → reshape OR rewrite
- S4 destination-incompatible schema → rewrite
- S5 unresolved cross-skill call → blocked-on-prereq
- S6 dest-idiom deviation → reshape
- S7 domain-only concepts → rewrite
- S8 structural identity unchanged → copy-as-is
- S9 file-type fast-path → copy-as-is

Decision rules evaluate top-down; first match wins; ties escalate to next-higher verdict; every assignment emits evidence trace shown at verdict gate (D8).

**11 transformation primitives (P1-P11):** copy-bytes, regex-replace, string-rename, template-substitute, frontmatter-rewrite, import-swap, section-restructure, helper-inject, schema-rebind, domain-rewrite, research-dispatch-mid-execute. Reshape uses P1-P7; rewrite uses P1-P11. Only rewrite can dispatch mid-execute research (P11) — matches D24/D25.

**Idiom detection — 3-source hybrid:** (1) Static scan of destination `_shared/SKILL_STANDARDS.md` + CLAUDE.md + skills exemplars + `scripts/lib/` + `package.json` (authoritative); (2) Optional `IDIOM_MANIFEST.yaml` in destination (explicit override); (3) Few-shot LLM exemplar inference for gaps, gated at discovery surface. Handles ~80% of idiom questions for JASON-OS↔SoNash pair statically [11].

**Gate budgets per verdict:** copy-as-is=1, sanitize=2, reshape=3, rewrite=4 (rewrite's G-RESEARCH only fires when P11 dispatches). Per-unit default; batch-confirm as opt-in gate prompt; no silent batch mode in v1.

**Failure taxonomy — 11 modes enumerated:** F1 unforeseen dest idiom → halt unit, re-enter Phase 3; F2 pre-commit rejection → hand off to `/pre-commit-fixer` (CLAUDE.md #9); F3 dirty destination → halt, switch to plan-export; F4 mid-flow user denial → git restore --staged, state advances to skipped; F5 agent timeout → retry ≤2; F6 Windows 0-byte write → must fail loudly; F7 encoding/CRLF corruption → halt, re-write with explicit UTF-8 no-BOM; F8 partial plan execution → resume via state file; F9 session crash → resume + verify git status matches; F10 split-brain (commit succeeded, state-write failed) → reconcile from `Migration-Unit:` trailer; F11 state file corruption → rebuild from git log [13].

**Atomicity:** Per-verdict-unit (one entry in MIGRATION_PLAN.md = one atomic boundary). Per-file too narrow (reshape may touch multiple files); per-phase too wide (one failure invalidates all). One-commit-per-unit in direct-apply mode, with `Migration-Unit: <id>` trailer enabling F10/F11 recovery.

**Recovery verbs (from git rebase precedent):** `--continue` / `--skip` / `--abort`, plus `--replace-unit` (Terraform precedent) and `--status` (Rails precedent). Idempotency requirement: resumed unit MUST be no-op if already at target state (Flink precedent).

**Confidence:** HIGH (pattern-rich, strong external precedent catalog)

---

### Theme 5: Output modes — direct-apply vs plan-export (Q4)

**MIGRATION_PLAN.md recommended shape:** markdown primary + YAML frontmatter + optional sidecar payload tree. Human-readable by operator; machine-executable by a minimal runner; works at L0 (read manually) through L3 (full /migration at destination) [14].

**Destination requirement stack (4 layers):**
- L0: Nothing — operator reads and does steps manually
- L1: Plain `apply.sh` / `apply.ps1` runner (emitted alongside plan)
- L2: Tiny `/apply-migration-plan` skill (~100-200 LOC)
- L3: Full `/migration` skill

**Must support L0-L2; never require L3.** Destination needing `/migration` installed breaks first-port-to-new-repo bootstrap (chicken-and-egg) and defeats D26's "portable" premise.

**Schema elements:** plan_id, generated_by, commit SHAs pinned (both endpoints), direction, unit_type, verdict, preconditions (destination-clean, destination-head-matches, required-paths-exist/absent), rollback mode (snapshot/reverse-steps/none), per-step verdict + transforms + done_when idempotency check + payload sidecar reference.

**Precedent synthesis:** Terraform plan file (pinned SHA, tamper-resistance), Alembic upgrade()/downgrade() (bidirectional ops), Ansible idempotency guards (done_when), Flyway checksum (drift detection), dbt seeds (content-travels-with-plan), EF Core migration bundles (idempotent apply), Cookiecutter hooks (pre/post validation), Kustomize overlays (future diff-port candidate) [14].

**Direct-apply vs plan-export decision heuristic:**

| Verdict | Default mode | Override triggers → plan-export |
|---------|--------------|---------------------------------|
| copy-as-is | direct-apply | Any: foreign dest / dirty tree / trust boundary / CI context / user choice |
| sanitize | direct-apply | Same |
| reshape | **plan-export** | N/A — already plan-export |
| rewrite | **plan-export** | N/A — already plan-export |
| skip | n/a | n/a |
| blocked-on-prereq | plan-export | Captures state for later resume |

**Anti-pattern guard:** Even in direct-apply, always write MIGRATION_PLAN.md first (to `.migration-state/plans/<plan_id>/`) — makes rollback uniform and preserves audit trail regardless of mode.

**Confidence:** HIGH (precedent catalog is saturated; schema rationale load-bearing from 9 precedents)

---

### Theme 6: CAS port scope + surgical rewrite list (Q6)

**38 port actions totaling ~143 person-hours** (~18 working days single-operator, 3-4 weeks calendar). **Corrected verdict distribution (per V3-cas):** 14 reshape / 6 rewrite / 7 sanitize / 7 skip / 3 blocked-on-prereq / 1 copy-as-is = 38 total. The earlier headline "35 / 12/8/8/3/3/1 / zero copy-as-is" was a stale pre-balance summary; the 38-row master table carries 1 copy-as-is row (`sanitize-error.cjs`). Total action range 35-38 previously cited reflects pre- vs post-rebalance drafting [19][17].

**Per-skill verdicts:** `/analyze` reshape, `/document-analysis` reshape, `/media-analysis` reshape, `/recall` reshape, `/repo-analysis` **rewrite** (heaviest — 30 coupling sites), `/synthesize` reshape/rewrite mix [17].

**Critical rewrites (Tier A — cannot be simple path swap):**
1. **Home-repo URL guard (3 cites)** — `repo-analysis/SKILL.md:68`, `:431-432`, `REFERENCE.md:1336`. Currently string-equality against `jasonmichaelbell78-creator/sonash-v0`. Must become `HOME_REPO_URL` config (single) or `HOME_REPO_ALLOWLIST[]` (multi-home).
2. **`HOME_CONTEXT_FILES[]` contract (7 cites across 4 skills)** — 5 home-context files (SESSION_CONTEXT.md, ROADMAP.md, CLAUDE.md, `.claude/skills/`, MEMORY.md) independently loaded by 4 handlers. JASON-OS has CLAUDE.md but NO SESSION_CONTEXT.md or ROADMAP.md yet — fail-soft present-only loader required. Shared `CONVENTIONS.md §9` reshape is choke-point for all 4 Creator-View handlers.
3. **`CAS_SCRIPTS_ROOT` (17+ cites)** — `scripts/cas/*.js` path references. Recommended: package-ify as `@jason-os/cas-scripts` npm dep.
4. **`SCHEMA_LIB_PATH` (8 cites)** — `scripts/lib/analysis-schema.js` 493-line Zod module.

**Tier B reshape (structural path config):** `RESEARCH_ROOT` (40+ cites — biggest mechanical coupling), `CAS_DB_PATH` (12 cites), `STATE_ROOT`, `PLANNING_ROOT`, subdir conventions.

**Tier C sanitize:** CLAUDE.md anchor links (§2/§5/§7 map 1:1), example-data "sonash" mentions (4 cites), hardcoded Windows `Workspace` prefix (2 cites, just MAX_PATH math examples), security helper paths (JASON-OS has `.cjs` variant — verify filename at port).

**Tier D blocked-on-prereq:** `scripts/reviews/write-invocation.ts` invocation-tracking (JASON-OS tracking mechanism TBD); `/sonash-context` skill dependency; `gsd-codebase-mapper`/`security-auditor`/`code-reviewer` agent name remapping.

**Port order (bottom-up):** Wave 0 foundation (schemas, sanitize-error); Wave 1 analysis-schema.js XL gate; Wave 2 scripts/cas/ (recall → update-index → rebuild-index → retag → self-audit XL); Wave 3 handler skills in parallel pairs (document-analysis + media-analysis first, then recall, then repo-analysis with home-repo guard keystone); Wave 4 synthesize + blocked-on-prereq resolutions; Wave 5 analyze router LAST.

**Top 5 critical path:** analysis-schema.ts → analysis-schema.js (XL gate) → update-index.js (compaction-recovery anchor) → repo-analysis/SKILL.md (home-repo guard rewrite) → analyze/SKILL.md (router last).

**CAS auth scope — NARROW, per dispute-resolutions-cas Dispute 1 + challenges/contrarian.md Challenge 2:** Originally framed as "CAS has ZERO auth deps; zero external API calls." The correct statement: CAS **scripts layer** (`scripts/cas/*.js`, 12 files) has zero credentials and zero network calls (grep of `process.env|OPENAI|ANTHROPIC|API_KEY|TOKEN|SECRET|GOOGLE|FIREBASE|gh api|git clone|git fetch|curl|fetch\(|https?://` returns 0 matches, verified this session). However, CAS **skill-body layer** carries networked surfaces in **3 of 6 skills**:
- `/repo-analysis` — `gh api` (SKILL.md:69, :92, :429; REFERENCE.md:1285), `git clone --filter=blob:none --depth=1` (SKILL.md:174; REFERENCE.md:1675), `git fetch --unshallow` (SKILL.md:179; REFERENCE.md:1682), `api.securityscorecards.dev` HTTPS (REFERENCE.md:38, :51) — **7 networked hits total**
- `/document-analysis` — `WebFetch api.github.com/gists`, arxiv, `api.semanticscholar.org/graph/v1/paper/arXiv:<id>` (REFERENCE.md:929-930, :943-950) — **3 networked hits**
- `/media-analysis` — YouTube oEmbed/noembed `WebFetch` + Python `youtube-transcript-api` (SKILL.md:159-162, :191-193)
- `/analyze`, `/recall`, `/synthesize` — **network-free** (only prose-level `sonash-context` mention at `synthesize/REFERENCE.md:730`)

None of the 6 CAS skills declares `allowed-tools` frontmatter — they inherit the invoking session's tool grants verbatim. **Implication for D29 (see Theme 11):** local-only v1 must either refuse the 3 networked CAS skills on port OR gate them behind explicit user confirmation; D12's `credential.helper=manager` is live on JASON-OS and would activate on first verbatim port invocation against a private/rate-limited path.

**SoNash-side source refactor cost (per G2 + GV2 gap-round 1):** `/migration` imposes a silent refactor bill on SoNash itself that the 143h D6 estimate does not contain. Six refactor categories (naming / separation-of-concerns / hardcoded paths / cross-repo coordination / plus code-reviewer generalization + SonarCloud config broadening) sum to **24-43h for a minimal port-friendly SoNash pass (Option B: alias-table in CONVENTIONS + env-var plumbing + CONVENTIONS §9 extraction)**, per GV2-revised counts. GV2 corrected G2 down on three axes: (a) **TDMS 418 refs across 116 `.claude/` files** (G2 reported 210/30 — off by ~2×); (b) **home-context cites 697 refs across 157 `.claude/` files** (G2 reported 520/120 — under by ~34%); (c) **Firestore/Firebase surface 394 refs across 62 `.claude/` files, 20 in `code-reviewer.md` alone — VERIFIED** (G2 reported 159/20 — under by ~2.5×). GV2 also identified a **data-integrity bug in G2**: the SonarCloud project-key has **TWO variants** — `jasonmichaelbell78-creator_sonash-v0` (3 sites across 2 `.claude/` files + root config files like `sonar-project.properties`) AND `<sonar-key-no-creator-variant>` without the `-creator` suffix (4 sites in `sonarcloud/SKILL.md` + 3 sites in `.research/archive/github-health/findings/D15`). G2 conflated these; **/migration codemod must ship TWO rules**, not one, and emit a warning rather than silently normalize (pre-existing SoNash data-integrity bug documented at `.research/archive/github-health/findings/D15-sonarcloud-integration.md`).

**Scope-expansion caveat (GV2):** G2 confined grep to `.claude/` only. The true SoNash coupling extends through the debt-management subsystem (`docs/technical-debt/`, `scripts/debt/`, `tests/scripts/debt/`), build config (`sonar-project.properties` — authoritative CI config, `.vscode/settings.json`, GitHub Actions workflows), and historical plan archives (`.planning/`, `docs/archive/`). TDMS repo-wide count is 1255+ lines across 200+ files; SonarCloud-key-variant-1 is 20 hits across 11 files repo-wide (not 7/5). **Phase 2 Discovery must walk the full repo, not just `.claude/`** — G2 recommended `SONASH_REFACTOR_CANDIDATES.md` stays read-only but its inventory scope must now be broader.

**Recommendation (revised per GV2): HYBRID — absorb-in-/migration v1 default + emit `SONASH_REFACTOR_CANDIDATES.md`.** /migration v1 carries ~10 codemod rules internally (two SonarCloud variants separately, PROJECT_ROOT rewrite, HOME_CONTEXT_FILES lookup, CAS_SCRIPTS_ROOT, creator-view/analysis-view alias, etc.) at ~25-40h build-out cost (GV2 revised up from G2's 15-25h). SoNash-side v1 cost = 0h (operator defers). If operator later elects Option B SoNash hygiene pass: 24-43h. **Revised /migration v1 gross: ~160-170h total** (143h CAS mechanical + 25-40h codemod-carrying + 0h SoNash-side in HYBRID). This preserves D14 (non-mandatory), D19 (reshape-during-port not pre-port), and C-128's insight (source-side prep is real) while avoiding Phase `-1` mandates.

**CAS bootstrap escape (per dispute-resolutions-cas Dispute 2 + challenges/contrarian.md Challenge 3):** The "M2: use `/migration` v0 to port CAS" milestone is circular — `/migration` v0 requires CAS present to work, but M2 IS CAS being ported via `/migration`. Resolution via option **(b)**: split CAS port into two tiers, backed by BRAINSTORM §6 line 152 "OR precursor milestone" language and RESEARCH_OUTPUT line 348 "schemas+lib … ported as prereq":
- **CAS-Tier-0 (hand-port precursor)** — 5 lib modules (`safe-cas-io`, `parse-jsonl-line`, `read-jsonl`, `analysis-schema`, `retag-mutations`) + 12 `scripts/cas/*.js` + `.research/` substrate + `better-sqlite3` npm install. **No `/migration` involvement.** Estimated ~40-50h.
- **CAS-Tier-1 (`/migration` first real job)** — 6 CAS handler skills (`/recall`, `/document-analysis`, `/media-analysis` first as low-risk; `/repo-analysis`, `/synthesize`, `/analyze` router last). Estimated ~90-100h.
- Decomposed milestones become: **M2a** = Tier-0 hand-port; **M2b** = `/migration` v0 on simple non-CAS target; **M2c** = `/migration` on 3 low-risk CAS skills; **M2d** = `/migration` on 3 high-risk CAS skills. This resolves the circularity and aligns with OTB-9 C-147's missing v0.5 scaffold milestone.

**Confidence:** HIGH (coupling sites enumerated by file:line; auth scope + bootstrap both filesystem-verified this session)

---

### Theme 7: Cross-skill integration inventory (Q2, D27 expansion)

**Across 7 D2-* sibling inventories**, the recurring structural patterns are clear [30][31][32][33][34][35]:

**Consumer pattern — `/migration` is mostly a consumer, rarely a callee.** 18 skills + 3 hooks + 3 shared scripts recur across the 7 phases — 9 of those recur in 3+ phases (load-bearing).

**Top load-bearing dependencies (by phase recurrence):**

| Dependency | Phases | Recurrence |
|---|---|---|
| `convergence-loop` | 2,3,4,5,6 | **5x (critical)** |
| `sanitize-error` / `safe-fs` / `security-helpers` triad | 5 (direct), all phases via hooks | **1x direct, ∞x transitive** |
| `deep-research` | 2,3 | **3x** |
| `find-skills` | 0,1,2 | **3x** |
| `brainstorm` (re-entry) | 1,3 | **2x** |
| `checkpoint`, `todo`, `sonash-context`-analog | 2x each | 2x |
| `pre-commit-fixer` | 5 | 1x (MANDATORY per CLAUDE.md #9) |
| `deep-plan` | 4 | 1x (pattern-lender elsewhere) |

**Audit family (13 skills across 2 D-agents):** Zero are called *by* `/migration` during any of its 7 phases. All are post-migration consumers — operator may run `/audit-code`/`/audit-comprehensive` after `/migration` lands changes. Three top pattern-references: `audit-comprehensive` 4-stage wave orchestration (precedent for Phase 2 Discovery + Phase 5 Execute), `audit-aggregator` JSONL finding schema (template for verdict-ledger output), `audit-process` 7-stage + Windows 0-byte recovery (direct 7-phase analog) [30][31].

**Ecosystem-audit family (11 skills across 2 D-agents):** HIGH coupling in all. `/migration` call likelihood LOW across the board. Key pattern reuses: `_shared/ecosystem-audit/` chassis (CRITICAL_RULES, COMPACTION_GUARD, FINDING_WALKTHROUGH, SUMMARY_AND_TRENDS, CLOSURE) for own `_shared/migration/`; compaction guard / 2-hour-stale progress files for state machine; `doc-optimizer` 13-agent 5-wave orchestration with Windows 0-byte fallback as Phase 5 execute precedent; "COMPLETE: {name} grade {g}" return-line protocol for keeping orchestrator context clean [32][33].

**CAS-adjacent (7 skills, D2-content-analysis-adjacent):** `/recall` is the lowest-cost Phase 0/2 prior-art check ("have we seen this target before?"). `/analyze` router for Phase 2 unknown-target. `/synthesize` for Phase 3 concept-level reshape research. `/repo-analysis` for whole-repo migration Phase 2/3. `/media-analysis` and `/document-analysis` opportunistic. `repo-synthesis` deprecated stub — never invoke. All 6 live CAS skills are pre-port-dependent for `/migration` execution beyond trivial file-copy — concept unit-type blocked-on-prereq in v1-MVP until CAS ported [34].

**Code/PR/GH cluster (7 skills, D2-code-pr-gh):** Only `pre-commit-fixer` is a direct Phase 5 fit (fully local, D29-compat). `code-reviewer` optional Phase 6 advisory. `pr-review`, `pr-retro`, `gh-fix-ci`, `github-health`, `sonarcloud` all require network → out-of-band for v1 per D29. `/pr-review` is downstream-only — mention in Phase 7 handoff after user pushes, never call from `/migration` [35].

**MCP/Testing cluster (7 skills):** `mcp-builder` is NOT a Phase 5 transformation helper (wraps external APIs, orthogonal domain). `webapp-testing` opportunistic Phase 6 when unit is UI. `validate-claude-folder` strong Phase 6 integrity gate after reshape. `system-test`/`test-suite` are targets not callers. `sonash-context` is a Phase 5 REWRITE target (transform `skills: [sonash-context]` → `skills: [jason-os-context]` in ported agents). `add-debt` is Phase 5/6 deferred-item outlet [36].

**Core orchestration cluster (9 skills, D2-core-orchestration):** All 8 dual-resident skills diverge between JASON-OS and SoNash (100%). 5 divergence buckets: B1 Invocation Tracking block (sanitize), B2 frontmatter compatibility (sanitize), B3 DEFERRED infrastructure markers (reshape — the heaviest semantically), B4 lineage/port-marker comment (copy-as-is+extend), B5 minor content rewrite (reshape). Integration points: Phase 3 → `/deep-research` mandatory; Phase 4 → MIGRATION_PLAN.md via `/deep-plan` or emulation; Phase 6 → `/convergence-loop` embedded; Phase 0 → `/brainstorm` re-entry on D28 reframe; pre-execute gate → `/checkpoint`; `/todo` as back-pressure for blocked-on-prereq [37].

**Hooks + lib (D2-hooks-lib, ~54 files):** Seed trio `sanitize-error.cjs` + `symlink-guard.js` + `security-helpers.js` is the entire security envelope. Dep-chain depth 4 levels max. Per V2-sonash-integration minor drift corrections: top-level SoNash hook JS count is **26** (was stated as 25), `scripts/lib/` is **21 modules** (was stated as 20; D2-integration-synthesis already had 21), and SoNash `.claude/skills/` directory count is **80** (was stated as 81). None of these mini-miscounts invalidate port-order reasoning. Port-order implication: **any Phase 5 hook port drags in seed trio + `sanitize-input.js` + `git-utils.js` (~1,400 lines total; V2 disk-verified 97+506+757+46 = 1,406 exactly)**. Top-3 port-now candidates: sanitize-error.cjs (copy), symlink-guard.js (copy), security-helpers.js (copy). Top-3 do-not-port: `post-write-validator.js` (rewrite — 44KB SoNash policy), `session-start.js` (rewrite — 47KB Firebase/Next.js), `firestore-rules-guard.js` / `deploy-safeguard.js` (skip — no Firebase in JASON-OS) [38].

**Content-other cluster (7 skills):** All 7/7 verdicts = **skip**. Zero integration with `/migration` (hypothesis confirmed: content-writer/website-analysis/excel-analysis/market-research/developer-growth/data-effectiveness all orthogonal domains) [39].

**Skill-infrastructure cluster (D2-skill-infra, 14 skills):** `/migration` is a PRODUCT of `skill-creator` + `skill-audit` more than a consumer. `_shared/SKILL_STANDARDS.md` + `_shared/SELF_AUDIT_PATTERN.md` define the authoring contract. `/migration` needs `scripts/skills/migration/self-audit.js` per CAS reference pattern. `skill-audit`'s 12-category rubric provides the observable definition for Q10 self-dogfood criteria [40].

**Confidence:** HIGH

---

### Theme 8: Diff-port / re-port / fix-only-pull semantics (Q9)

**Four distinct patterns, one underlying operation.** Not four different skills — four modes of a single "re-synchronization" operation differing along two axes: scope (whole-unit vs narrow-slice) and direction (forward vs reverse) [41].

**Patterns:**

1. **Full re-port** — same `/migration` skill, explicit `re-port` mode flag, same 7-phase arc, different Phase 4 artifact shape (3-way merge plan: BASE = last-ported-SHA, SOURCE = current SoNash HEAD, DEST = current JASON-OS HEAD).
2. **Diff-port** — narrower: pull only new work from source. Unit granularity drops below file to commit-range or hunk-set. Dependency-chain analysis mandatory (from Linux kernel stable-tree: "fix must be standalone or brought with prerequisites").
3. **Fix-only-pull** — strictly narrower than diff-port. Pull designated subset (just bugfix commits, not features). Requires classification (fixes vs features vs refactors). Linux kernel solution: `Fixes:` trailer + AUTOSEL classifier + `Cc: stable@` convention.
4. **Revert-port** — undo a prior port when source side reverted. Uses same 3-way merge substrate in reverse direction.

**External precedent:**
- Linux kernel stable-tree backports (narrow-slice forward) + AUTOSEL classifier
- Copybara's `merge_import` mode (diff3 three-way merge preserving destination-only changes)
- Git cherry-pick (semantically equivalent to 3-way merge against picked commit's parent)
- Rails `app:update` with `THOR_MERGE` (three-way interactive merge during upgrade)

**/sync vs /migration boundary (one sentence):** `/sync` detects drift and emits drift report at file level (same / different / only-on-one-side); `/migration` owns the semantic diff (what changed, why, whether it should propagate) and the transformation (sanitize/reshape/rewrite per D23/D24).

**Recommendation:** **v1 ships full re-port only.** Diff-port, fix-only, revert-port are v1.1+. All four share the same three-way-merge substrate, so v1 re-port implementation should preserve enough state to make the other three an extension, not a rewrite.

**Confidence:** MEDIUM (single D-agent source; external precedent strong but pattern-application is prospective)

---

### Theme 9: Self-dogfood criteria + milestone sequencing (Q10)

**7 criteria with round-trip property as keystone** [42]:

- **C1** — Produces own MIGRATION_PLAN.md targeting SoNash (brainstorm a)
- **C2** — Resulting plan executes cleanly in SoNash (brainstorm b)
- **C3** — Ported `/migration` in SoNash produces structurally identical results (brainstorm c)
- **C4** — Back-direction works: **JASON-OS → SoNash** independently (implied by D16; direction typo corrected per dispute-resolutions-arch Dispute 2 & contrarian Challenge 6)
- **C5** — Re-port/diff-port returns empty diff on unchanged inputs
- **C6** — **Round-trip JASON-OS → SoNash → JASON-OS is idempotent** — analogous to rustc stage2-matches-stage1 compiler-fixpoint test and terraform `apply` → `plan` = 0 changes
- **C7** — **Zero-drift property** — second `/migration` run on unchanged source produces empty-diff MIGRATION_PLAN.md (all copy-as-is or skip, no sanitize/reshape/rewrite)

**Round-trip (C6) is the single strongest signal** that both directions work symmetrically (D16) — it's the canonical self-hosting acceptance test. Zero-drift (C7) is the idempotency test from terraform.

**Test-suite shape:** (i) manual walkthrough with assertions now; (ii) fixture-based automated harness as v1.1 (JASON-OS v0 has `scripts/` but no full test infrastructure).

**v1 acceptance bar (REVISED per dispute-resolutions-arch Dispute 2 + contrarian Challenge 5):** **C1 + C2 only** (forward-direction: produce plan + execute plan targeting SoNash). C3-C7 deferred to v1.1.

**D16 reframe (VIOLATED → reframed to v1.1 per D28 iterative re-entry norm):** The original BRAINSTORM D16 said "full both-direction build from v1 — both directions first-class." This is VIOLATED by the current research: D5-reshape-pipeline has **zero occurrences** of `reverse|bidirection|symmetric|backward`; the 9 signal detectors, 11 primitives, and sole worked walkthrough (`audit-code SoNash → JASON-OS`) are all direction=out only. Contrarian's steel-manned concern (round-trip C6 can trivially pass if JASON-OS starts sparse and ends sparse) reinforces that C6 is necessary but not sufficient for D16 symmetry. Per D28 iterative re-entry norm (BRAINSTORM:92), this is a research-surfaced reframe, not a decision change: D16-as-originally-written is moved to v1.1 scope; v1 ships direction=out as primary validated flow; direction=in is available-but-caveated; a D5-reverse research finding (symmetric re-run for JASON-OS → SoNash) is required before v1.1 kickoff. The D5-reverse research CAN run in parallel with `/deep-plan` for v1 (direction=out).

**Binding to skill-audit:** D2-skill-infra flagged that `skill-audit`'s 12-category rubric (including Category 11 convergence-loop/T25 and Category 12 completion-verification) provides the observable definition of "successful self-dogfood" — Q10 can be partially answered by referencing the rubric directly [40].

**Milestone sequencing:**

| Milestone | Contents | Prereqs |
|---|---|---|
| M0 | Seed trio port (sanitize-error, safe-fs, security-helpers) | none |
| M1 | `/convergence-loop` port | M0 |
| M2 | CAS port (self-dogfood of `/migration` on CAS; 143h) | M1 + `/migration` v0 working locally |
| M3 | `/sync` Piece 5 engine | M1 + Piece 3.5/4 complete |
| M4 | `/migration` v1 acceptance (C1-5 + C6 round-trip pass) | M2 + M3 |
| M5 | v1.1 diff-port/fix-only-pull + fixture harness + C7 zero-drift | M4 |

**Confidence:** MEDIUM-HIGH (criteria are observable; external precedent (rustc, terraform) strong; implementation sequencing depends on CAS port feasibility as first-real-job)

---

### Theme 10: Process meta-ledger + multi-iteration coherence (Q11)

**Recommendation: LIGHTWEIGHT meta-ledger — YES, but as single thin append-only file `ITERATION_LEDGER.md`, not parallel heavyweight ADR system.**

**Current triad assessment:** BRAINSTORM.md + RESEARCH_OUTPUT.md + PLAN.md works for 1-2 iterations but already shows three coherence failures in migration-skill artifacts after only 2 iterations [43]:

1. **D-number collision / namespace overload.** BRAINSTORM_WIP.md:53 has D11 = "Dropped direction"; research question #11 in BRAINSTORM.md:134 is "Process meta-ledger." The sub-agent file is literally named "D11-meta-ledger" — D11 means *two different things* in two different scopes (decision-number vs research-question-number). A meta-ledger would force a cross-scope registry (DEC-11 / RQ-11 / D-AGENT-11).
2. **Re-entry provenance is implicit.** BRAINSTORM.md groups D16-D19 by session header prose, not structured field. No per-decision "born session N, modified session M, triggered-by" field. After 5 loops the prose structure becomes unreadable.
3. **Cross-artifact coherence is narrative-only.** If research-iteration-1 reframes D19, which decision is now stale? No back-pointer, no "affects:" field, no "invalidates:" pointer.

**Precedent catalog:** ADR supersede chain, IETF RFC-bis versioning, Microsoft Engineering Playbook Decision Log (closest analog — table-of-contents above per-ADR files), Spotify Engineering ADR practice, TLA+ stepwise refinement.

**Proposed schema (one markdown table, append-only):** `.research/<topic-slug>/ITERATION_LEDGER.md` with header declaring append-only rule. Per-row fields: iter (monotonic int), date (ISO-8601), skill (brainstorm/deep-research/deep-plan/execute), trigger (1-line prose), source-iter (int or "seed"), touches (list of decision-IDs), and optionally status-delta + back-pointer.

**Authority:** Authored by whichever skill is re-entering. Read by all three on re-entry as canonical "what happened before this loop" context. Never reorder or delete rows.

**Confidence:** MEDIUM-HIGH (pattern rationale strong; implementation is prescriptive but simple)

---

### Theme 11: Local auth + Windows state-safety model (Q12)

**Permission model (one sentence):** `/migration` **the skill itself** runs as invoking user with read access to source + write access to destination tree, issues zero network calls, zero `git push`/`fetch`/`pull`, and reuses the existing single-user-CLI trust model from `scripts/lib/safe-fs.js` (TOCTOU acceptable) [44].

**D29 scope qualifier (per dispute-resolutions-cas Dispute 1 + NC-D29-SCOPE-QUALIFIER):** Local-only applies to `/migration` the skill, not to `/migration`'s port targets. CAS `/repo-analysis` + `/document-analysis` + `/media-analysis` skill bodies contain networked idioms (`gh api`, `git clone --depth=1`, `git fetch --unshallow`, `api.securityscorecards.dev`, `api.github.com/gists`, `api.semanticscholar.org`, YouTube oEmbed, `youtube-transcript-api`) that would inherit into JASON-OS on verbatim port. D29 local-only v1 must either (a) **refuse** those 3 networked CAS skills during port until sanitize/rewrite strips the surface, OR (b) **gate them behind explicit user confirmation** at Phase 5 REWRITE with a documented D29 exception. D12's `credential.helper=manager` is already live on JASON-OS (D12-local-auth-perms.md:151); porting unreshaped `/repo-analysis` would silently activate credential prompts on first private-repo invocation. See Theme 6 CAS auth scope for the file:line inventory.

**Capabilities needed:** Read source files, enumerate source layout, `git status --porcelain` both repos, `git worktree list --porcelain` both repos, write destination via `safeWriteFileSync`/`safeAtomicWriteSync`, `git add` on destination (optional in plan-export).

**Capabilities must NOT do in v1:** No `git push` (CLAUDE.md #7), no fetch/pull/clone (endpoints already local per D29), no `git remote` edits, no `gh` CLI calls, no credential-helper touch, no autonomous `git commit` (staging ceiling; user commits after review per D8).

**File permissions on write:** `mode: 0o600` in `safeWriteFile`. On NTFS with `core.filemode=false`, POSIX bit effectively ignored — NTFS uses ACL inheritance from parent directory. No chmod/icacls calls needed.

**Worktree matrix: 3 source states × 4 dest states = 12 cells.** Default (MC × MC) is current user setup. REFUSE on DIRTY-BRANCH (target branch checked out in sibling worktree). `.git` in secondary worktree is a *file* not directory (contains `gitdir:` pointer); `lstatSync` distinguishes. Use `git rev-parse --show-toplevel` to find repo root, never `fs.existsSync(".git")` + assume-directory. Bare repos out of scope for v1.

**Dirty-state count: 6 refuse + 4 warn + 3 recoverable/auto-fix = 13 categories total.**

**Windows-specific gotchas:**
1. **VS Code / editor file locks → EBUSY** (microsoft/vscode issues #35020, #81224, #128418, #142462, #231542). `fs.writeFileSync` throws `EBUSY: resource busy or locked` when editor has file open (even unsaved). Retry pattern with user-guidance (close file in editor).
2. **Path length (MAX_PATH 260 chars)** — rarely hit for JASON-OS paths but `.research/analysis/<slug>/...` can exceed with deep repos.
3. **Windows Defender scan latency** — bulk writes may trigger per-file scans, throttling throughput. Not correctness issue.
4. **CRLF/LF normalization** — `.gitattributes` handles via `core.autocrlf`; explicit UTF-8-no-BOM writes recommended.
5. **Windows 0-byte bug (issue #39791/#17147 OPEN 2026-04)** — `run_in_background=true` attempts symlink creation requiring `SeCreateSymbolicLinkPrivilege` (admins or Developer Mode only); on EPERM, fallback creates empty file. Workaround: enable Developer Mode OR orchestrator-side persistence safety net (`wc -c` + `<result>` capture + Write fallback) [10].

**Confidence:** HIGH

---

### Theme 12: Loop-control protocol (gap-round 1, G1 + GV1)

**D28 "re-entry as norm, not exception" demands a formal loop-control protocol**, not just a recording ledger. Theme 10's `ITERATION_LEDGER.md` captures **what** happened across re-entries; it says nothing about **whether the loop converges, terminates, or oscillates**. That is a structural gap: a loop without a fixed-point theory is a liveness bug waiting to happen. G1 supplies six precedent bodies (Kildall/monotone dataflow, Knaster-Tarski/Scott domain theory, Kubernetes reconciliation, Nix reproducibility, GHC/rustc stage2 fixpoint, Agent-Contracts bounded recursion); GV1 verified the mathematical backbone (Kildall VERIFIED), softened the rustc stage2 byte-identity claim (CONFLICTED — aspirational, rustc 1.54 demonstrably fails byte-equality), partially verified K8s (PARTIAL — operational semantics correct, K8s main docs don't use the "level-triggered" term explicitly; lean on Kubebuilder/Chainguard as primary), and verified Agent Contracts arXiv 2601.08815 [G1][GV1].

**Idempotency contract (one sentence):** **`/migration` is idempotent iff, for any unchanged (source-commit, dest-commit, plan-id) triple, a second end-to-end run produces a zero-step plan, mutates no files, emits no new LEDGER rows, and leaves the ITERATION_LEDGER decisions set unchanged.**

**5-property contract (I1-I5):**

| # | Property | Observable test |
|---|---|---|
| I1 | **Plan stability** | Second `/migration --plan` on same (source-SHA, dest-SHA) produces byte-identical plan file |
| I2 | **Zero-delta mutations** | Second `/migration --apply` after successful first apply produces a zero-step verdict (no ops) |
| I3 | **Ledger stability** | Second run appends no new ITERATION_LEDGER rows (no new decisions, no re-decisions) |
| I4 | **Reproducible derivation** | Given pinned input SHAs + pinned tool versions, outputs are content-hash identical (Nix-style derivation) |
| I5 | **Level-triggered, not edge-triggered** | Behaviour depends on current (source, dest, ledger) state, not on which event triggered the run |

**8 concrete design additions (A1-A8), post-GV1-adjustment:**

| # | Name | Source | Confidence (GV1-adjusted) | Scope |
|---|---|---|---|---|
| A1 | Idempotency contract I1-I5 codified in `/migration/SKILL.md` | K8s reconciler rule; Terraform 0-change apply | **HIGH** | v1 |
| A2 | Append-only monotone ITERATION_LEDGER (formalises D11) | Kildall monotone-lattice convergence (VERIFIED) | **HIGH** — backbone of termination proof | v1 |
| A3 | Closed decision-kind ontology | Finite-height lattice requirement | **MEDIUM-HIGH** — finite-height applies to kinds (closed enum), not instances (bounded per-run by L1) | v1 |
| A4 | Level-triggered Phase 5 | K8s level-vs-edge | **MEDIUM-HIGH** — operational semantics correct; re-cite via Kubebuilder/Chainguard (K8s main docs citation weak per GV1 P2 PARTIAL) | v1 |
| A5 | Stage2-fixpoint acceptance (extends C6, adds C8) | GHC/rustc stage2 bootstrap | **HIGH but scoped to v1.1** — C6 round-trip already deferred per D16 reframe; rustc byte-identity **overstated** in G1 (softened per GV1 — aspirational, fragile in practice) | v1.1 |
| A6 | 5-layer termination guard stack (L1 depth, L2 iterations, L3 budget, L4 timeout, L5 circuit breaker) | Agent Contracts arXiv 2601.08815 (VERIFIED); bounded-recursion pattern | **HIGH** (footnote: L1 "max 3 cycles" is an engineering heuristic, NOT Kildall-derived — Kildall's formal bound is O(height × \|nodes\|), dozens for realistic runs) | v1 |
| A7 | Reproducible-derivation plan header `{source_sha, dest_sha, /migration_version, tool_versions, plan_hash}` | Nix referential transparency; Reproducible Builds | **MEDIUM** | v1 |
| A8 | **Plan-stability self-audit (forward-direction I1 test, renamed per GV1)** — `/migration --plan` twice on same fixture, assert byte-identity of PLAN.md | Kleene chain / Knaster-Tarski | **MEDIUM-HIGH** — renamed to make forward-only scope clear; distinct from A5 round-trip (which is v1.1) | v1 |

**5-layer guard stack (A6 detail):**

| Layer | Name | /migration setting | Rationale |
|---|---|---|---|
| L1 | Depth limit | Max 3 brainstorm→research→plan cycles per `/migration` invocation (heuristic, not Kildall-derived) | Monotone-lattice finite-height safety net |
| L2 | Iteration counter | Max 50 sub-agent dispatches per phase | Runaway sub-agent recursion guard |
| L3 | Budget cap | Max $X in model spend per run (user-configurable, default $10) | Financial circuit breaker |
| L4 | Wall-clock timeout | Max 45min per phase, 4h per full run | Stuck-subprocess protection |
| L5 | Circuit breaker on repeated failure | 3 consecutive failed verdicts on same step → halt + flag for human | Retry-storm prevention |

**Convergence theorem (Kildall/Kam-Ullman 1976):** An iterative process converges to a fixed point iff the transition functions are **monotone** (never remove information) on a lattice of **finite height** (no infinitely-ascending chain). Applied to `/migration`: **monotonicity** = ITERATION_LEDGER append-only, no silent decision drop (D11 meta-ledger already mandates this shape); **finite height** applies to the **decision-kind ontology** (closed enum per A3), NOT to instances (decision IDs D1..Dn grow but are bounded per-run by L1). If either condition breaks, the loop can ascend forever — Kildall's result is the formal ammunition behind the append-only ledger recommendation. When both conditions hold, termination is **proven**, not hoped for.

**Precedent verification summary (per GV1):**
- **Kildall monotone dataflow** — VERIFIED (Wikipedia Data-flow analysis direct quote matches)
- **Knaster-Tarski / Scott domain theory** — UNVERIFIABLE this pass but standard result
- **Kubernetes reconciliation** — PARTIAL (K8s main docs [8] do not explicitly say "level-triggered"; secondary sources carry it; re-cite via Kubebuilder [11] + Chainguard [13])
- **Nix reproducible derivation** — UNVERIFIABLE this pass but standard
- **GHC/rustc stage2 fixpoint** — CONFLICTED: (a) rustc-dev-guide says "libraries ... ought to be identical" not "must be"; (b) G1's in-body quote mis-attributes stage1↔stage2 vs stage2↔stage3; (c) rustc 1.54.0 demonstrably fails byte-equality in practice. **Stage2-fixpoint is aspirational, not enforced** — G1's "strongest self-hosting acceptance signal" is softened to "one of the strongest, though in practice fragile."
- **Agent Contracts arXiv 2601.08815** — VERIFIED (Qing Ye & Jing Tan, COINE/AAMAS 2026; "90% token reduction, 525x lower variance in iterative workflows")

**When /migration can be PROVED to terminate:** (1) ITERATION_LEDGER is append-only (monotone); (2) decision ontology is closed (finite set of D-kinds per A3); (3) each skill invocation is idempotent in strict I1-I5 sense; (4) depth limit L1 caps outer-loop iterations. Condition 1 already in D11; condition 2 needs A3 ontology file; condition 3 is the new I1-I5 contract; condition 4 is a new `--max-depth` flag.

**Confidence:** MEDIUM-HIGH (mathematical backbone VERIFIED; operational precedents correct but citation-quality mixed; v1/v1.1 scoping makes the design actionable without over-promising byte-identity) [G1][GV1]

---

## Contradictions & Open Questions

| Claim | Source A says | Source B says | Assessment |
|---|---|---|---|
| Decomposition shape for v1 | D7-router-vs-monolith [23]: router + 2-3 ancillaries (`/migration-scan`, `/migration-prove`) | D7-other-multi-skill-families [24]: monolith-with-companions modeled on `/deep-research` (no sibling skills) | **RESOLVED per dispute-resolutions-arch Dispute 1:** Canonical = **"minimum-viable router + 2 ancillaries"** (Shape D applied minimally; primary `/migration` with monolith-with-companions INTERNAL layout; `/migration-scan` + `/migration-prove` as peer skills). C-042 promoted MEDIUM → HIGH; C-043 confirmed LOW (rejected); C-044 boundary heuristic promoted MEDIUM → HIGH. The heuristic is one of three converging arguments (precedent catalog + refactor-cost asymmetry + criterion-fit scoring), not a solo tiebreaker. |
| Agent count for /migration | D1-migration-agent-spec [27]: 8-9 new + 6 reused (separate sanitize/reshape/rewrite agents) | D1-agents-jason-os [4]: possibly single `migration-executor` using `pre-commit-fixer` `general-purpose` pattern (1 new + 6 reused) | **RESOLVED per dispute-resolutions-arch Dispute 3: 2 new + 6 reused.** `migration-executor` (verdict-aware prompting inside single agent — matches pre-commit-fixer precedent) + `migration-plan-author`. Six reused: deep-research-searcher, deep-research-verifier, contrarian-challenger, dispute-resolver, Explore, convergence-loop skill. v1.1 split trigger (→ sanitizer/reshaper/rewriter siblings) is observation-gated on gate-trace verdict-collision or opus-model cost/quality need. C-009 downgraded MEDIUM → LOW (rescoped); NEW C-agent-roster-v1 at HIGH. |
| Windows 0-byte issue number | D1-dispatch-patterns [10]: upstream issue #17147 is currently-tracked, #39791 cited in SKILL.md returns no search results | SoNash deep-research SKILL.md:39: issue #39791 | **Doc drift, not research disagreement.** Issue #39791 URL resolves to symptom report; #17147 is the newer tracked one. Both describe same bug. Flag deep-research SKILL.md for update. |
| Whether CAS should be ported before `/migration` or as /migration's first job | BRAINSTORM §6: CAS as blocker OR /migration's first big job | D19 decision: CAS port *through* /migration — NO `--foreign-mode` flag | **D19 wins by explicit decision.** /migration v1 MVP supports file + workflow unit-types with Grep/Read fallback; concept unit-type blocked-on-prereq until CAS ported. CAS port becomes /migration's first real job + self-dogfood target. |
| Phase 5 agent-invocation orchestration | D1-agents-sonash [26]: 5 patterns in active use, default to 4-agent concurrency cap | D1-dispatch-patterns [10]: runtime cap is 10 concurrent, skill-stated 4 is context-discipline | **Both true; different scopes.** Runtime allows 10; `/migration` should use 4 for Phase 3 (orchestrator tracking multiple streams) and 1-2 for Phase 5 (also tracking commit state). Never approach 10 — that's absolute ceiling. |
| rustc stage2 byte-identity as self-hosting acceptance signal | G1 [G1] line 141: "A passing stage2 fixpoint test is the strongest self-hosting acceptance signal the software world has." | GV1 [GV1] P3 CONFLICTED: rustc-dev-guide says libraries "ought to be" identical (not compilers, not "must be"); rustc 1.54 demonstrably fails byte-equality; in-body quote mis-attributes stage1↔stage2 vs stage2↔stage3 | **Aspirational precedent, fragile in practice.** A5 recommendation softened from byte-identity to structural-fixpoint criterion; A5 scoped to v1.1 (C6 round-trip already deferred per D16 reframe). "One of the strongest self-hosting acceptance signals" is the accurate framing; "the strongest" is overstated. |
| Grep scope for SoNash-side refactor cost (G2 counts) | G2 claims (`.claude/`-only): 210 TDMS across 30 files, 520 home-context across 120 files, 159 Firestore across 20 files, SonarCloud key "7 sites across 5 files" | GV2 actual: 418 TDMS across 116 `.claude/` files (1255+ repo-wide across 200+); 697 home-context across 157 `.claude/` files; 394 Firestore across 62 `.claude/` files (20 in code-reviewer.md alone VERIFIED); SonarCloud key `jasonmichaelbell78-creator_sonash-v0` is 3 sites/2 files `.claude/`-scope (20/11 repo-wide); **separate variant** `<sonar-key-no-creator-variant>` at 4 sites in `sonarcloud/SKILL.md` | **Grep scope-narrowness recurring failure mode.** V3 (CAS auth) and G2 (SoNash cost) both under-scoped their searches relative to claim subjects. Theme: verification/research agents need "grep broader scope AND different pattern than the D-agent's evidence path" rule as default. Cost revision UP: 24-43h SoNash-side + 25-40h /migration codemod carrying; /migration v1 gross estimate rises to ~160-170h. **TWO SonarCloud codemod rules required, not one.** |

### Unresolved Questions

- **Route all 6 CAS skills through `/migration`, or port schemas + lib as Tier 0 shared work first, then use `/migration` for the skill files?** D6-cas-reshape-verdict-list recommends bottom-up; D19 makes CAS a self-dogfood target. The schemas+lib are so foundational that they're not meaningfully "migrated" — they're ported as prereq. Open for decision.
- **Does `/migration-plan` and `/migration-apply` become a v2 split (Rails generate/db:migrate, Terraform plan/apply)?** D7-router-vs-monolith flags this as v2 option. D26 output modes already address it as mode-flag inside one skill.
- **Agent retry budget for reshape/rewrite** — D8 proposes ≤2 per CLAUDE.md #9 analog. Is 2 right for reshape (medium complexity) or should reshape get 3?
- **Commit-trailer parsing as sole F11 recovery path** — robust enough, or mirror state to per-unit sidecar JSON `state/units/U007.json` for belt-and-suspenders?
- **`/apply-migration-plan` as separate skill vs sub-behavior of `/migration`** — D4 flags this as open; lean toward separate tiny skill for destination portability.
- **Payload sidecar threshold for inline vs external** — small files (<10KB) inlining vs sidecar always; format (base64/raw/gzip)?
- **Cross-platform runner language** — apply.sh vs apply.ps1 vs Node.js. Node recommended since JASON-OS requires Node 22 per CLAUDE.md §1; bash/PS as generation outputs.

---

## Confidence Assessment

| Category | Confidence | Evidence Quality | Notes |
|---|---|---|---|
| Agent roster + dispatch patterns | HIGH | 3 D-agents, file:line citations, 8 dispatch patterns catalogued with codebase precedents | Windows 0-byte bug mandatory; runtime cap vs skill cap well-documented |
| Execution blockers | HIGH | 2 D-agents, BOOTSTRAP_DEFERRED.md + CLAUDE.md §4 + todos.jsonl all triangulated | /sync + CAS + content-transform primitives are shift-risk-1 |
| Cross-skill integration (Q2) | HIGH | 8 D-agents covering 80+ SoNash skills; verdicts per D23 legend; LOW/ambient coupling distinguished from MEDIUM/HIGH | D2-content-other hypothesis (7/7 skip) confirmed |
| Active transformation pipeline (Q5) | HIGH | Single D-agent but comprehensive with 9 signals + 11 primitives + worked walkthrough; external precedent catalog (OpenRewrite, jscodeshift, Rector) | Idiom-detection 3-source hybrid rationale strong |
| Output modes (Q4) | HIGH | Single D-agent with 9-precedent catalog; destination-agnostic imperative load-bearing | Terraform + Alembic + Ansible + dbt + EF Core cross-validate |
| CAS port scope (Q6) | HIGH | 6 D6-* sub-agents; 89 unique coupling sites enumerated; 35-38 port actions with effort estimates | Byte-identical DB serendipity + home-repo guard 3-cite cluster are load-bearing findings |
| Failure recovery (Q8) | HIGH | 11 failure modes with detection + recovery + state; git-rebase/Alembic/Flyway/dbt/Terraform/Flink precedent | `--continue`/`--skip`/`--abort` verbs adopt directly |
| Diff-port semantics (Q9) | MEDIUM | Single D-agent; 4 pattern analog; v1 limited to full re-port | Pattern application prospective — no in-code precedent |
| Self-dogfood criteria (Q10) | MEDIUM-HIGH | External precedent (rustc stage2, terraform idempotency) strong; implementation sequencing depends on CAS port feasibility | Round-trip + zero-drift are keystone signals |
| Meta-ledger (Q11) | MEDIUM-HIGH | 5 precedents catalogued; 3 existing coherence failures documented | Lightweight append-only file; schema prescriptive but simple |
| Local auth + Windows (Q12) | HIGH | Single D-agent; 12-cell worktree matrix; 5 Windows gotchas with upstream issue URLs | Safe-fs.js trust model already in place |
| Agent decomposition (Q7) | MEDIUM | Two recommendations (router+2 vs monolith) with different reasoning; D7-cas-precedent provides boundary heuristic | Better supported: minimum-viable-2-ancillaries; under-decomposing is cheaper to fix |

---

## Recommendations

1. **Ship `/migration` v1 as minimum-viable router + 2 ancillaries.** Primary `/migration` (monolithic 7-phase arc) + `/migration-scan` (Phase 2 standalone) + `/migration-prove` (Phase 6 convergence-loop wrapper). Keep Phases 0, 1, 3, 4, 5 in the router. Do NOT pre-factor `/migration-reshape`, `/migration-rewrite`, or `/repo-profile`. [23][24][25]

2. **Port order is bottom-up, strict prerequisites.** Tier 0 seed trio (sanitize-error.cjs + safe-fs.js + security-helpers.js) → Tier 1 `/convergence-loop` (5x recurrence unblock) → Tier 2 CAS port as self-dogfood (Wave 0-5, ~143h, 3-4 weeks calendar) → Tier 3 `/sync` Piece 5 (in parallel) → Tier 4 `/migration` itself. [8][38][17][19]

3. **Mandatory Windows 0-byte persistence safety net on every Phase 5 agent spawn.** `wc -c` post-spawn, capture `<result>` text fallback via Write tool, max 1 retry, escalate to user. CLAUDE.md §4 #15 is currently honor-only; upstream issue #39791/#17147 OPEN as of 2026-04. Also flag: loop-detector.js + track-agent-invocation.js are NEEDS_GATE; design the hook before they land. [10][9]

4. **Adopt MIGRATION_PLAN.md as markdown-primary + YAML-frontmatter + sidecar-payload hybrid with L0-L2 destination requirement levels.** Never require `/migration` at destination (chicken-and-egg break). Ship `apply.sh` + `apply.ps1` alongside the plan. The tiny `/apply-migration-plan` skill (~100-200 LOC) becomes a natural spinoff that itself migrates via `/migration`. [14]

5. **Adopt per-verdict-unit atomicity + one-commit-per-unit + `Migration-Unit:` trailer.** Git-rebase verb set (`--continue`/`--skip`/`--abort`) + Terraform `--replace-unit` + Rails `--status`. Idempotency requirement on resume: unit must be no-op if already at target state. [13]

6. **4-lane verdict router with 9 signals + 11 primitives + gate budgets 1/2/3/4.** Idiom detection 3-source hybrid (static scan + optional IDIOM_MANIFEST.yaml + few-shot LLM gap-filler). Per-unit gates default; batch-confirm opt-in at gate prompt; never silent batch. [11]

7. **Write `ITERATION_LEDGER.md` as single append-only file beside BRAINSTORM.md.** One row per skill re-entry (iter / date / skill / trigger / source-iter / touches-decisions). Full ADR system is overkill; zero meta-ledger is already breaking (D-number collision visible after 2 iterations). [43]

8. **CAS port resolves 3 hardcoded `jasonmichaelbell78-creator/sonash-v0` cites together** via `HOME_REPO_URL` config. Also resolves 7 cites of `HOME_CONTEXT_FILES[]` across 4 skills via fail-soft present-only loader. Also resolves 17+ `scripts/cas/*.js` cites via `CAS_SCRIPTS_ROOT` env var (recommended: package-ify as `@jason-os/cas-scripts`). [17][18]

9. **7 criteria self-dogfood acceptance bar with round-trip as keystone.** C1-C5 straightforward observable checks. C6 round-trip (JASON-OS → SoNash → JASON-OS idempotent) is single strongest D16 both-direction signal. C7 zero-drift (second run on unchanged source = empty plan) deferred to v1.1 full harness. [42]

10. **`/pr-review` is downstream-only, never callable from `/migration`.** D29 v1 local-only forbids network → 5/7 skills in code-PR-GH cluster are out-of-band. `pre-commit-fixer` is the one direct Phase 5 integration (CLAUDE.md #9 mandatory route after hook failure). [35]

---

## Unexpected Findings

Discoveries beyond the 12 research questions that surfaced during the L1 investigation:

- **Byte-identical CAS DB aliases.** `.research/content-analysis.db` and `.research/knowledge.sqlite` in SoNash both 409,600 bytes, identical MD5 `d098a358f3e75c978e0417e759e3c84e`. Different mtimes (04-17 vs 04-21), both with live `-shm`/`-wal`. Stale alias — legacy path or operator convenience copy still being opened by some code path. Port-time landmine. [25]

- **`CLAUDE.md §7 34-agent count claim is stale** versus filesystem reality (57 top-level files, 49 live post-stub-strip in SoNash). [26]

- **8 SoNash agent files are deprecated redirect stubs** (removed 2026-04-01, redirect expires 2026-06-01): `deployment-engineer.md`, `devops-troubleshooter.md`, `error-detective.md`, `markdown-syntax-formatter.md`, `penetration-tester.md`, `prompt-engineer.md`, `react-performance-optimization.md`, `security-engineer.md`. Skip entirely during any port. [26]

- **`.claude/agents/global/` holds 11 divergent copies of gsd-* agents** (NOT hardlinks — `diff gsd-planner.md global/gsd-planner.md` returns "1,1354c1,1477"). Independent divergence. If porting, choose authoritative copy per skill. [26]

- **DDL duplicated across `rebuild-index.js` (L37-112) and `update-index.js` (L291-350).** Both contain `CREATE TABLE IF NOT EXISTS` for all 5 CAS tables. Silent schema split risk. Generalization: any decomposed skill family with shared data substrate needs a DDL module, not per-caller DDL. [25]

- **`safe-fs.js` is byte-identical (24,810 bytes) across 3 audit families** (doc-ecosystem-audit, pr-ecosystem-audit, hook-ecosystem-audit). The `_shared/` extraction stopped at protocol docs — code was not extracted. Known half-done refactor; opportunity for /migration's own `_shared/migration/` if a sibling skill ever emerges. [24]

- **`website-synthesis` is a deprecated redirect stub** (consolidated into `/synthesize` at Session #271, T29 Wave 3); never port the stub. Update D27 inventory accordingly. [39]

- **`/sonash-context` is a SKILL, not a hidden file dependency (per dispute-resolutions-cas Dispute 3).** Filesystem-confirmed at `C:\Users\jbell\.local\bin\sonash-v0\.claude\skills\sonash-context\SKILL.md` (91 lines, `name: sonash-context` frontmatter). It is **not** in D6's 5-item home-context-file list. It is injected into 30+ SoNash agents via `skills: [sonash-context]` frontmatter field (backend-architect, code-reviewer, debugger, general-purpose, deep-research-searcher, deep-research-verifier, deep-research-synthesizer, deep-research-gap-pursuer, explore, plan, contrarian-challenger, otb-challenger, dispute-resolver, and 17 more). The one grep hit inside `/synthesize` (`REFERENCE.md:730`) is prose reference, not runtime dispatch. **Port action (captured by C-082):** author a `/jason-os-context` analog skill in JASON-OS carrying stack-agnostic content, then rewrite agent frontmatter `skills: [sonash-context]` → `skills: [jason-os-context]` at Phase 5 REWRITE. C-108 reclassified as observational; C-082 remains the load-bearing port claim. [17]

- **`comprehensive-ecosystem-audit` return-line protocol** `COMPLETE: {audit-name} grade {grade} score {score} errors {N} warnings {N} info {N}` is a direct transplant candidate for `/migration` Phase 5 agent spawn returns — keeps orchestrator context clean while per-agent details live in result JSON files. [32]

- **Invocation-tracking (`scripts/reviews/write-invocation.ts`) is a SoNash-specific handshake consumed by all 4 ecosystem audits + `/repo-analysis`.** JASON-OS has `scripts/reviews/` unported — blocks 5+ skill ports as blocked-on-prereq. [33][17]

- **D-number collision already visible after 2 iterations** — BRAINSTORM_WIP.md:53 D11 ("Dropped direction") vs research Q11 ("Process meta-ledger") vs this sub-agent file literally named "D11-meta-ledger." Three different semantic axes sharing one number. Supports the meta-ledger recommendation. [43]

- **CLAUDE.md NEEDS_GATE annotations** are a disciplined way to mark the honor-only → automated-enforcement gap. Three `/migration`-relevant hooks (frustrationDetection, loop-detector, track-agent-invocation) are structurally named with the hook filename that will gate them when built. [9]

---

## Structural gaps surfaced by OTB

Three structural gaps in the research frame that a BRAINSTORM re-entry (D28) would resolve quickly. Per challenges/otb.md these are the "must-resolve before PLAN" class:

- **Family/project unit-type missing from D1 (OTB-4, new claim C-130, HIGH).** D1 declares three unit-types: file / workflow / concept. The de-facto natural migration units already visible in the ecosystem are **families / projects**: CAS (6 skills + 17 scripts + schemas + `_shared/`), ecosystem-audit (11-skill family with `_shared/ecosystem-audit/` chassis), and sync-mechanism (5-piece project). None fit file, workflow, or concept cleanly — they are larger than any of those and require coordinated multi-unit port. C-130 promotes this from implicit to explicit.

- **`greenfield-clone` verdict missing from D23 legend (OTB-5, new claim C-133, MEDIUM-HIGH).** D23 enumerates copy-as-is / sanitize / reshape / rewrite / skip / blocked-on-prereq. Missing: a seventh verdict for "port is the wrong answer — the concept is worth taking but the implementation is not source-derivation-worthy; rebuild greenfield in JASON-OS idioms from concept only." Current research forces these into `rewrite` which muddies gate budget and rollback semantics. `greenfield-clone` routes to `/skill-creator` or `/deep-plan`, NOT to Phase 5 Execute — a distinct call graph. Concept unit-type (D1) is **always** `greenfield-clone` by definition (no source file).

- **`/migration v0.5` scaffold milestone missing between M1 and M2 (OTB-9, new claim C-147, HIGH).** The M0-M5 ladder (Theme 9) is logically incoherent as written: Tier 2 (CAS port) depends on Tier 4 (`/migration`), Tier 4 depends on Tier 3 (`/sync`). The research's "bottom-up" framing obscures a genuine critical-path circularity (Tier 2 ↔ Tier 4). Resolution: insert **M1.5 `/migration v0.5` scaffold** (file + workflow unit-types only; no `/sync` Phase 0 dependency; no CAS concept-unit dependency) between `/convergence-loop` port (M1) and CAS port (M2). v0.5 is the linchpin the plan implicitly depends on but never names. This aligns with the CAS-Tier-0/Tier-1 split from dispute-resolutions-cas Dispute 2.

---

## Premise-shifters worth BRAINSTORM re-entry

Per challenges/otb.md, three premise-shifters surfaced that should trigger D28 re-entry rather than be quietly absorbed:

- **D19 "CAS port as first job" is axiomatic, not derived (OTB-2, new claim C-124, MEDIUM; C-127 MEDIUM-HIGH).** The ~143h CAS port is the single most expensive decision in the plan. The research never stress-tested the premise that JASON-OS skills actually need SQL-backed content analysis semantics. If file + workflow unit-types are 80-90% of the immediate migration demand (OTB-2 C-125, MEDIUM-HIGH: ~20-LOC `repo-profile.mjs` may cover what concept-unit actually needs), the ~143h may be partially or entirely unnecessary. Additionally, C-127 (MEDIUM-HIGH): the ~143h estimate **excludes ~20-40h of SoNash-side pre-port refactoring** ("to migrate, first make migratable" — Aviator case study lesson); actual calendar is likely ~180h, not 143h.

- **Codemod ecosystem as architectural alternative, not primitive source (OTB-1, new claim C-121, MEDIUM).** OpenRewrite, jscodeshift, Rector were cited 3 times in D5 as sources for transformation primitives P4/P6. But these tools solve the overall problem with a **library of declarative recipes + thin runner** — not a 7-phase heavy skill with verdict router, state machine, and gate budgets. The reframe: what if `/migration` v1 is one recipe-library + one runner, and recipes *are* the unit? D23 verdicts become "no recipe matched" vs "recipe N matched." Scan mode becomes "recipe-match scan." `verdicts/*.yaml` (already in the research as a peripheral config) becomes the architectural center. Shrinks skill surface by ~40% without sacrificing verdict expressiveness.

- **D28 "re-entry as norm" demands a loop-control protocol, not just a recording ledger (OTB-7, new claim C-140, MEDIUM).** Theme 10's `ITERATION_LEDGER.md` is a recording tool. The missing companion is a **loop-control protocol** with explicit backlog math (added-decisions minus resolved-decisions), oscillation detection (same decision ID touched 3+ times with differing values → escalate), and livelock signaling (backlog increases 3 consecutive re-entries → pivot-to-execute with current best). Without it, "re-enter brainstorm on material reframe" is a livelock hazard. Adjacent-domain precedents the research did not mine: Kildall fixed-point iteration (dataflow analysis), Kubernetes controller reconciliation loops (~10 years of operational learning on this exact convergence problem), Nix eval reproducibility. Without a protocol, D28 remains aspirational; the C7 zero-drift property may need to move from v1.1-deferred to v1-must-have for loop stability (C-143, LOW).

---

## Challenges (Phase 3 summary)

Phase 3 ran after initial synthesis. Full detail in `challenges/contrarian.md` (8 challenges; 3 CRITICAL) and `challenges/otb.md` (9 insights; 29 new claims proposed; 5 premise-shifters).

**Contrarian — key outcomes:**
- Challenge 1 (decomposition 3-sentence contradiction) — **RESOLVED by dispute-resolutions-arch Dispute 1**: canonical label fixed to "minimum-viable router + 2 ancillaries" throughout.
- Challenge 2 (CAS zero-auth-deps scope) — **RESOLVED**: verdict is **NARROW** — scripts zero-auth, skill bodies networked in 3 of 6. See Theme 6 updated CAS auth scope section.
- Challenge 3 (CAS bootstrap circularity) — **RESOLVED** via option (b) split: Tier-0 hand-port precursor + Tier-1 via `/migration`. See Theme 6 bootstrap escape section.
- Challenge 4 (local-only honor-only discipline) — acknowledged; C-062 downgraded HIGH → MEDIUM-HIGH with NC-D29-SCOPE-QUALIFIER.
- Challenge 5 (v1 acceptance bar overambitious) — **ACCEPTED**: v1 rescoped to C1+C2 only per dispute-resolutions-arch Dispute 2.
- Challenge 6 (D16 back-direction structurally absent) — **ACCEPTED**: D16 reframed VIOLATED → v1.1 per D28.
- Challenge 7 (agent over-engineering) — **RESOLVED** by collapse to 2 new + 6 reused.
- Challenge 8 (meta-ledger Chesterton's Fence) — partially accepted; C-061 stays MEDIUM, "<5%" softened.

**OTB — top 5 highest-leverage claims (selected for RESEARCH_OUTPUT integration; full 29 available in challenges/otb.md):**
- C-130 (family/project unit-type gap) — HIGH
- C-133 (greenfield-clone verdict gap) — MEDIUM-HIGH
- C-147 (missing v0.5 scaffold milestone) — HIGH
- C-127 (source-side pre-port refactor cost unpriced) — MEDIUM-HIGH
- C-140 (loop-control protocol missing) — MEDIUM

---

## Methodology lessons learned (post-gap-round-1)

Gap-round 1 surfaced a systemic methodology issue worth flagging for every future `/deep-research` run:

### Grep scope-narrowness as a recurring failure mode

**Instances observed this run:**
- **V3 (CAS auth verification):** Originally the CAS "zero auth deps, zero external API calls" claim was framed as whole-domain; V3's broader grep across skill bodies (not just `scripts/cas/`) revealed 3 of 6 CAS skills carry networked surfaces (`gh api`, `git clone --depth=1`, `api.securityscorecards.dev`, `api.github.com/gists`, `api.semanticscholar.org`, YouTube oEmbed). The correction: scope is NARROW (scripts layer zero-auth; skill bodies networked in 3 of 6), not whole-CAS.
- **G2 (SoNash-source-cost):** G2 confined grep to `.claude/` only. GV2's broader grep across `scripts/`, `docs/`, `.planning/`, `.research/archive/`, and root files (including `sonar-project.properties`, `.vscode/settings.json`, `llms.txt`, `tests/`) found systematic under-reporting on 3 of 4 priority claims (TDMS 210→418, home-context 520→697, Firestore 159→394). Also caught a data-integrity bug: G2 conflated two distinct SonarCloud project-key literals (`jasonmichaelbell78-creator_sonash-v0` vs `<sonar-key-no-creator-variant>`), which would have silently miss-covered the `.claude/skills/sonarcloud/SKILL.md` hits under a one-rule codemod.

**Identical failure mode in both:** The D/G-agent grepped the subdirectory where they expected the pattern to live; the verifier grepped the whole repo with the same pattern and caught concentrations the D-agent never reached. Pattern-scope narrowness compounds with directory-scope narrowness.

**Recommendation for future /deep-research runs:**

1. **Verifier prompts should mandate "grep broader scope AND different pattern than the D-agent's evidence path"** as a default rule. Specifically: (a) expand directory scope by one level (if D-agent greps `.claude/`, verifier greps full repo); (b) use bare string + alternation + case-insensitive variants (if D-agent uses narrow regex, verifier uses bare substring first).
2. **The contrarian-challenger's adversarial mandate is what consistently caught these.** The contrarian explicitly looks for "what's outside the D-agent's frame." Consider giving V-agents (verifiers) the same adversarial mandate by default — not just "spot-check these claims" but "find what the D-agent didn't look at."
3. **Symmetric mirror for count-based claims:** Any D-agent claim of the form "N hits across M files" should be re-grepped by the verifier with (a) a broader directory scope and (b) at least two pattern variants (bare substring, full regex, case-insensitive). If the V-count is >1.5× the D-count, flag as "scope-narrowness under-report" and revise the claim.

**Net impact this run:** 3 Theme-6 counts corrected, 1 data-integrity bug surfaced (two SonarCloud variants), 1 cost range revised up ~10-15%, 1 "TWO codemod rules required" correction. All caught by GV2 in ~30min of broader-scope grep — a very high ROI for explicit verifier adversarial grepping.

---

## Sources

### Tier 1 (Authoritative — codebase file:line citations + official upstream)

| # | Title | URL / path | Type | Date |
|---|---|---|---|---|
| [1] | BRAINSTORM.md — /migration 7-phase arc + 29 decisions | `C:\Users\jbell\.local\bin\JASON-OS\.research\migration-skill\BRAINSTORM.md` | codebase | 2026-04-20 |
| [2] | deep-research SKILL.md (JASON-OS) | `C:\Users\jbell\.local\bin\JASON-OS\.claude\skills\deep-research\SKILL.md` | codebase | current |
| [3] | deep-research REFERENCE.md (JASON-OS) | `C:\Users\jbell\.local\bin\JASON-OS\.claude\skills\deep-research\REFERENCE.md` | codebase | current |
| [4] | JASON-OS agents inventory (8 agents) | `C:\Users\jbell\.local\bin\JASON-OS\.claude\agents\*.md` | codebase | current |
| [5] | pre-commit-fixer SKILL.md (JASON-OS) | `C:\Users\jbell\.local\bin\JASON-OS\.claude\skills\pre-commit-fixer\SKILL.md:168-170` | codebase | current |
| [6] | pre-commit-fixer dispatch pattern | `C:\Users\jbell\.local\bin\sonash-v0\.claude\skills\pre-commit-fixer\SKILL.md:168-170` | codebase | current |
| [7] | BOOTSTRAP_DEFERRED.md (JASON-OS) | `C:\Users\jbell\.local\bin\JASON-OS\.planning\jason-os\BOOTSTRAP_DEFERRED.md:166-169` | codebase | current |
| [8] | scripts/lib/sanitize-error.cjs | `C:\Users\jbell\.local\bin\JASON-OS\scripts\lib\sanitize-error.cjs` | codebase | current |
| [9] | CLAUDE.md §4 Behavioral Guardrails (JASON-OS) | `C:\Users\jbell\.local\bin\JASON-OS\CLAUDE.md:62-117` | codebase | 2026-04-15 |
| [10] | D1-dispatch-patterns findings (8 patterns + Windows 0-byte) | `C:\Users\jbell\.local\bin\JASON-OS\.research\migration-skill\findings\D1-dispatch-patterns.md` | codebase | 2026-04-21 |
| [11] | D5-reshape-pipeline findings (9 signals + 11 primitives + idiom 3-source) | `C:\Users\jbell\.local\bin\JASON-OS\.research\migration-skill\findings\D5-reshape-pipeline.md` | codebase | 2026-04-21 |
| [12] | Windows 0-byte upstream issue #17147 | https://github.com/anthropics/claude-code/issues/17147 | web | 2026-04-21 |
| [13] | D8-failure-recovery findings (11 modes + state schema) | `C:\Users\jbell\.local\bin\JASON-OS\.research\migration-skill\findings\D8-failure-recovery.md` | codebase | 2026-04-21 |
| [14] | D4-plan-export findings (MIGRATION_PLAN.md schema + 9 precedents) | `C:\Users\jbell\.local\bin\JASON-OS\.research\migration-skill\findings\D4-plan-export.md` | codebase | 2026-04-21 |
| [15] | Terraform JSON plan format | https://developer.hashicorp.com/terraform/internals/json-format | official-docs | 2026-04-21 |
| [16] | Alembic autogenerate | https://alembic.sqlalchemy.org/en/latest/autogenerate.html | official-docs | 2026-04-21 |
| [17] | D6-cas-skills-deep findings (89 coupling sites across 6 skills) | `C:\Users\jbell\.local\bin\JASON-OS\.research\migration-skill\findings\D6-cas-skills-deep.md` | codebase | 2026-04-21 |
| [18] | D6-cas-reshape-verdict-list (35-38 port actions, ~143h) | `C:\Users\jbell\.local\bin\JASON-OS\.research\migration-skill\findings\D6-cas-reshape-verdict-list.md` | codebase | 2026-04-21 |
| [19] | SoNash CAS skill inventory | `C:\Users\jbell\.local\bin\sonash-v0\.claude\skills\{analyze,document-analysis,media-analysis,recall,repo-analysis,synthesize}\` | codebase | current |
| [20] | D10-self-dogfood findings (7 criteria incl. round-trip + zero-drift) | `C:\Users\jbell\.local\bin\JASON-OS\.research\migration-skill\findings\D10-self-dogfood.md` | codebase | 2026-04-21 |
| [21] | Rustc stage2 bootstrap | https://rustc-dev-guide.rust-lang.org/building/bootstrapping.html | web | 2026-04-21 |
| [22] | Terraform idempotency guarantee | https://developer.hashicorp.com/terraform/cli/commands/plan | official-docs | 2026-04-21 |
| [23] | D7-router-vs-monolith findings (7 criteria + 7 precedent catalog) | `C:\Users\jbell\.local\bin\JASON-OS\.research\migration-skill\findings\D7-router-vs-monolith.md` | codebase | 2026-04-21 |
| [24] | D7-other-multi-skill-families findings (6 families, 5 shapes) | `C:\Users\jbell\.local\bin\JASON-OS\.research\migration-skill\findings\D7-other-multi-skill-families.md` | codebase | 2026-04-21 |
| [25] | D7-cas-precedent findings (7 works + 5 breaks + boundary heuristic) | `C:\Users\jbell\.local\bin\JASON-OS\.research\migration-skill\findings\D7-cas-precedent.md` | codebase | 2026-04-21 |
| [26] | D1-agents-sonash findings (49 live agents + 5 dispatch patterns) | `C:\Users\jbell\.local\bin\JASON-OS\.research\migration-skill\findings\D1-agents-sonash.md` | codebase | 2026-04-21 |
| [27] | D1-migration-agent-spec findings (8 new + 6 reused agents) | `C:\Users\jbell\.local\bin\JASON-OS\.research\migration-skill\findings\D1-migration-agent-spec.md` | codebase | 2026-04-21 |
| [28] | D7-invocation-contracts findings (state passing + gate memory + CL Programmatic Mode) | `C:\Users\jbell\.local\bin\JASON-OS\.research\migration-skill\findings\D7-invocation-contracts.md` | codebase | 2026-04-21 |
| [29] | deep-research SKILL.md (SoNash) — 12-phase arc + 5 sub-agents | `C:\Users\jbell\.local\bin\sonash-v0\.claude\skills\deep-research\SKILL.md` | codebase | current |
| [30] | D2-audit-family-a findings (7 skills) | `C:\Users\jbell\.local\bin\JASON-OS\.research\migration-skill\findings\D2-audit-family-a.md` | codebase | 2026-04-21 |
| [31] | D2-audit-family-b findings (6 skills) | `C:\Users\jbell\.local\bin\JASON-OS\.research\migration-skill\findings\D2-audit-family-b.md` | codebase | 2026-04-21 |
| [32] | D2-ecosystem-audits-a findings (5 skills + dispatch patterns) | `C:\Users\jbell\.local\bin\JASON-OS\.research\migration-skill\findings\D2-ecosystem-audits-a.md` | codebase | 2026-04-21 |
| [33] | D2-ecosystem-audits-b findings (6 skills + doc-optimizer) | `C:\Users\jbell\.local\bin\JASON-OS\.research\migration-skill\findings\D2-ecosystem-audits-b.md` | codebase | 2026-04-21 |
| [34] | D2-content-analysis-adjacent findings (7 CAS skills) | `C:\Users\jbell\.local\bin\JASON-OS\.research\migration-skill\findings\D2-content-analysis-adjacent.md` | codebase | 2026-04-21 |
| [35] | D2-code-pr-gh findings (7 skills, D29 compat matrix) | `C:\Users\jbell\.local\bin\JASON-OS\.research\migration-skill\findings\D2-code-pr-gh.md` | codebase | 2026-04-21 |
| [36] | D2-mcp-testing findings (7 skills) | `C:\Users\jbell\.local\bin\JASON-OS\.research\migration-skill\findings\D2-mcp-testing.md` | codebase | 2026-04-21 |
| [37] | D2-core-orchestration findings (9 skills + 5 divergence buckets) | `C:\Users\jbell\.local\bin\JASON-OS\.research\migration-skill\findings\D2-core-orchestration.md` | codebase | 2026-04-21 |
| [38] | D2-hooks-lib findings (54 files + dep-chain depth 4) | `C:\Users\jbell\.local\bin\JASON-OS\.research\migration-skill\findings\D2-hooks-lib.md` | codebase | 2026-04-21 |
| [39] | D2-content-other findings (7 skills, all skip) | `C:\Users\jbell\.local\bin\JASON-OS\.research\migration-skill\findings\D2-content-other.md` | codebase | 2026-04-21 |
| [40] | D2-skill-infra findings (14 skills + authoring contract) | `C:\Users\jbell\.local\bin\JASON-OS\.research\migration-skill\findings\D2-skill-infra.md` | codebase | 2026-04-21 |
| [41] | D9-diff-port findings (4 scenarios + /sync boundary) | `C:\Users\jbell\.local\bin\JASON-OS\.research\migration-skill\findings\D9-diff-port.md` | codebase | 2026-04-21 |
| [42] | D10-self-dogfood (7 criteria + round-trip keystone) — see [20] | see [20] | codebase | 2026-04-21 |
| [43] | D11-meta-ledger findings (5 precedents + 3 current failures) | `C:\Users\jbell\.local\bin\JASON-OS\.research\migration-skill\findings\D11-meta-ledger.md` | codebase | 2026-04-21 |
| [44] | D12-local-auth-perms findings (12-cell worktree matrix + 13 dirty-state categories) | `C:\Users\jbell\.local\bin\JASON-OS\.research\migration-skill\findings\D12-local-auth-perms.md` | codebase | 2026-04-21 |
| [45] | D2-integration-synthesis findings (24 unique cross-phase deps) | `C:\Users\jbell\.local\bin\JASON-OS\.research\migration-skill\findings\D2-integration-synthesis.md` | codebase | 2026-04-21 |
| [46] | D3-jason-os-skills-scripts (14 skills + script inventory + top-10 blockers) | `C:\Users\jbell\.local\bin\JASON-OS\.research\migration-skill\findings\D3-jason-os-skills-scripts.md` | codebase | 2026-04-21 |
| [47] | D3-jason-os-hooks-agents-infra (8 hooks + 8 agents + sync Piece 5 status) | `C:\Users\jbell\.local\bin\JASON-OS\.research\migration-skill\findings\D3-jason-os-hooks-agents-infra.md` | codebase | 2026-04-21 |
| [48] | D6-cas-scripts-deep (detailed CAS script inventory) | `C:\Users\jbell\.local\bin\JASON-OS\.research\migration-skill\findings\D6-cas-scripts-deep.md` | codebase | 2026-04-21 |
| [49] | D6-cas-dbs-schemas (byte-identical DB finding) | `C:\Users\jbell\.local\bin\JASON-OS\.research\migration-skill\findings\D6-cas-dbs-schemas.md` | codebase | 2026-04-21 |
| [50] | D6-cas-planning (3 planning trees) | `C:\Users\jbell\.local\bin\JASON-OS\.research\migration-skill\findings\D6-cas-planning.md` | codebase | 2026-04-21 |
| [51] | D6-cas-integration (5-layer ported DAG) | `C:\Users\jbell\.local\bin\JASON-OS\.research\migration-skill\findings\D6-cas-integration.md` | codebase | 2026-04-21 |

### Tier 2 (Verified — external docs cross-referenced with codebase)

| # | Title | URL | Type | Date |
|---|---|---|---|---|
| [52] | Flyway CLI documentation | https://flywaydb.org/documentation/commandline/ | official-docs | 2026-04-21 |
| [53] | dbt commands reference | https://docs.getdbt.com/reference/dbt-commands | official-docs | 2026-04-21 |
| [54] | Rails command line | https://guides.rubyonrails.org/command_line.html | official-docs | 2026-04-21 |
| [55] | Git internals plumbing/porcelain | https://git-scm.com/book/en/v2/Git-Internals-Plumbing-and-Porcelain | official-docs | 2026-04-21 |
| [56] | Cookiecutter hooks | https://cookiecutter.readthedocs.io/en/stable/advanced/hooks.html | official-docs | 2026-04-21 |
| [57] | Ansible playbooks intro | https://docs.ansible.com/projects/ansible/latest/playbook_guide/playbooks_intro.html | official-docs | 2026-04-21 |
| [58] | Kustomize overlays | https://kubernetes.io/docs/tasks/manage-kubernetes-objects/kustomization/ | official-docs | 2026-04-21 |
| [59] | EF Core migration bundles | https://devblogs.microsoft.com/dotnet/introducing-devops-friendly-ef-core-migration-bundles/ | blog | 2026-04-21 |
| [60] | dbt retry/defer | https://docs.getdbt.com/reference/commands/retry | official-docs | 2026-04-21 |
| [61] | Terraform state/taint | https://developer.hashicorp.com/terraform/cli/state/taint | official-docs | 2026-04-21 |
| [62] | Flink checkpointing | https://nightlies.apache.org/flink/flink-docs-master/docs/dev/datastream/fault-tolerance/checkpointing/ | official-docs | 2026-04-21 |
| [63] | ADR GitHub community | https://adr.github.io/ | community | 2026-04-21 |
| [64] | Microsoft Decision Log pattern | https://microsoft.github.io/code-with-engineering-playbook/design/design-reviews/decision-log/ | official-docs | 2026-04-21 |
| [65] | Claude Code agent teams | https://code.claude.com/docs/en/agent-teams | official-docs | 2026-04-21 |
| [66] | Claude Code sub-agents | https://code.claude.com/docs/en/sub-agents | official-docs | 2026-04-21 |
| [67] | Claude Code skills | https://code.claude.com/docs/en/skills | official-docs | 2026-04-21 |
| [68] | OpenRewrite recipes | https://docs.openrewrite.org/concepts-and-explanations/recipes | official-docs | 2026-04-21 |
| [69] | jscodeshift API | https://jscodeshift.com/build/api-reference/ | official-docs | 2026-04-21 |
| [70] | Rector PHP documentation | https://getrector.com/documentation | official-docs | 2026-04-21 |

### Tier 3 (Community — blog / commentary / forum)

| # | Title | URL | Type | Date |
|---|---|---|---|---|
| [71] | Claude Code sub-agents guide (amux) | https://amux.io/guides/claude-code-subagents/ | blog | 2026-04-21 |
| [72] | Claude Code sub-agent best practices (claudefa.st) | https://claudefa.st/blog/guide/agents/sub-agent-best-practices | blog | 2026-04-21 |
| [73] | clig.dev CLI guidelines | https://clig.dev/ | community | 2026-04-21 |
| [74] | Atlassian CLI design principles | https://www.atlassian.com/blog/it-teams/10-design-principles-for-delightful-clis | blog | 2026-04-21 |
| [75] | Aviator LLM migration case study | https://www.aviator.co/blog/llm-agents-for-code-migration-a-real-world-case-study/ | blog | 2026-04-21 |
| [76] | LLM code migration with diffs (arxiv) | https://arxiv.org/html/2511.00160v1 | academic | 2026-04-21 |

### Tier 4 (Gap-round 1 — G1 + G2 findings + GV1 + GV2 verifier reports + web precedents)

| # | Title | URL / path | Type | Date |
|---|---|---|---|---|
| [G1] | G1 gap-pursuer loop-control findings (8 design recommendations A1-A8 + 6 precedent bodies) | `C:\Users\jbell\.local\bin\JASON-OS\.research\migration-skill\findings\G1-loop-control.md` | codebase | 2026-04-21 |
| [G2] | G2 gap-pursuer SoNash-source-cost findings (6 refactor categories, 24-44h SoNash-side estimate) | `C:\Users\jbell\.local\bin\JASON-OS\.research\migration-skill\findings\G2-sonash-source-cost.md` | codebase | 2026-04-21 |
| [GV1] | GV1 gap-verifier report on G1 (4 priority claims re-verified; 7 edits required; A5+A8 v1.1 scope, rustc P3 CONFLICTED) | `C:\Users\jbell\.local\bin\JASON-OS\.research\migration-skill\findings\GV1-loop-control-verify.md` | codebase | 2026-04-21 |
| [GV2] | GV2 gap-verifier report on G2 (3 priority counts corrected upward; SonarCloud data-integrity bug surfaced; TWO codemod rules required) | `C:\Users\jbell\.local\bin\JASON-OS\.research\migration-skill\findings\GV2-sonash-cost-verify.md` | codebase | 2026-04-21 |
| [77] | Kildall "A Unified Approach to Global Program Optimization" (1973 POPL) — via Wikipedia Data-flow analysis | https://en.wikipedia.org/wiki/Data-flow_analysis | web | 2026-04-21 |
| [78] | Kam & Ullman "Monotone data flow analysis frameworks" Acta Informatica (1977) | https://link.springer.com/article/10.1007/BF00290339 | academic | 2026-04-21 |
| [79] | Knaster-Tarski theorem | https://en.wikipedia.org/wiki/Knaster%E2%80%93Tarski_theorem | web | 2026-04-21 |
| [80] | Kubernetes controller documentation | https://kubernetes.io/docs/concepts/architecture/controller/ | official-docs | 2026-04-21 |
| [81] | Kubebuilder reconciliation loop | https://deepwiki.com/kubernetes-sigs/kubebuilder/5.2-reconciliation-loop | official-docs | 2026-04-21 |
| [82] | Bowes "Level Triggering and Reconciliation in Kubernetes" HackerNoon 2017 | https://hackernoon.com/level-triggering-and-reconciliation-in-kubernetes-1f17fe30333d | blog | 2026-04-21 |
| [83] | Chainguard "The Principle of Reconciliation" 2024-2025 | https://www.chainguard.dev/unchained/the-principle-of-reconciliation | blog | 2026-04-21 |
| [84] | Rust Compiler Development Guide — bootstrapping | https://rustc-dev-guide.rust-lang.org/building/bootstrapping/what-bootstrapping-does.html | official-docs | 2026-04-21 |
| [85] | GHC bootstrapping (Debian wiki) | https://wiki.debian.org/PortsDocs/BootstrappingGHC | official-docs | 2026-04-21 |
| [86] | Nix reproducibility (Zero-to-Nix) | https://zero-to-nix.com/concepts/reproducibility/ | official-docs | 2026-04-21 |
| [87] | Agent Contracts arXiv 2601.08815 (Ye & Tan, COINE/AAMAS 2026) | https://arxiv.org/html/2601.08815v3 | academic | 2026-04-21 |
| [88] | HashiCorp Terraform Issue #35534 — idempotency assertion | https://github.com/hashicorp/terraform/issues/35534 | community | 2026-04-21 |
| [89] | Terratest idempotent testing best-practice | https://terratest.gruntwork.io/docs/testing-best-practices/idempotent/ | official-docs | 2026-04-21 |
| [90] | Thompson "Reflections on Trusting Trust" (1984 Turing Award lecture) | https://www.cesarsotovalero.net/blog/revisiting-ken-thompson-reflection-on-trusting-trust.html | blog | 2026-04-21 |
| [91] | Wheeler "Fully Countering Trusting Trust through Diverse Double-Compiling" ACSAC 2005 | https://dwheeler.com/trusting-trust/ | academic | 2026-04-21 |
| [92] | Platzer CMU Compilers Lecture Notes on Monotone Frameworks | https://lfcps.org/course/Compilers/27-monframework.pdf | academic | 2026-04-21 |
| [93] | Aviator "How to Manage Code in a Large Codebase" | https://www.aviator.co/blog/how-to-manage-code-in-a-large-codebase/ | blog | 2026-04-21 |
| [94] | Mike Cvet "Migrations: Refactoring for Your System" | https://mikecvet.medium.com/migrations-8f1b0273abfa | blog | 2026-04-21 |
| [95] | D15-sonarcloud-integration (SoNash archive) — documents the TWO SonarCloud project-key variants | `C:\Users\jbell\.local\bin\sonash-v0\.research\archive\github-health\findings\D15-sonarcloud-integration.md` | codebase | 2026-04-21 |

---

## Methodology

- **Depth:** L1 (Exhaustive)
- **Agents:** 35 D-searchers, 1 synthesizer, 4 verifiers (V1-V4), 1 contrarian challenger, 1 OTB challenger, 2 dispute-resolver rounds (arch + CAS), 2 gap-pursuers (G1 loop-control, G2 SoNash-source-cost), 2 gap-verifiers (GV1, GV2), 1 re-synthesizer (Phase 3.9) + 1 final re-synthesizer (Phase 3.97, this session)
- **Search rounds:** ~5-8 per D-agent (BRAINSTORM says "Don't cap agent counts — allocation formula is a floor")
- **Duration:** Phase 1 (parallel D-agents) + Phase 2 synthesis + Phase 2.5 verification + Phase 3 challenges + Phase 3.5 dispute resolution + Phase 3.9 re-synthesis + Phase 3.95 gap pursuit (G1+G2) + Phase 3.96 gap verification (GV1+GV2) + Phase 3.97 final re-synthesis (this edit)
- **Input size:** ~778 KB across 35 D-findings + ~67 KB across 4 V-findings + ~82 KB challenges + ~56 KB dispute resolutions + ~48 KB across 2 G-findings + ~35 KB across 2 GV-findings
- **Output size:** RESEARCH_OUTPUT.md (this file) + claims.jsonl + sources.jsonl + metadata.json
- **Self-audit:** pending (Phase 4)
- **Re-synthesis triggered (Phase 3.9):** ~38% of claims changed from verification + challenges + disputes. Scope of changes: decomposition label canonicalized, CAS auth scope reframed NARROW, D16 reframed to v1.1, agent count collapsed from 8-9 new → 2 new, `/sonash-context` reclassified SKILL (not file), minor drift items across V1/V2/V3/V4.
- **Final re-synthesis triggered (Phase 3.97):** Theme 12 (loop-control protocol) added as structural addition from G1 + GV1; Theme 6 (CAS) updated with G2 + GV2 SoNash-side cost findings (counts corrected upward ~1.8-2.5×, TWO SonarCloud codemod rules required, cost revised up to ~160-170h /migration v1 gross); GV1 forced A5/A8 v1.1 scope-tagging + rustc stage2 byte-identity soften; GV2 identified data-integrity bug (conflated two SonarCloud project-key variants). Grep scope-narrowness elevated to cross-cutting methodology callout.
- **Key synthesis decisions:**
  - Themes organized by conceptual axis (not by sub-question) — 12 themes emerged (Theme 12 added in Phase 3.97)
  - Contradictions surfaced in dedicated section (not silently resolved); 2 cross-agent disputes explicitly resolved in dispute-resolver round; 2 additional contradictions added in Phase 3.97 (rustc byte-identity overstatement; G2 grep scope-narrowness)
  - Agent count claim in CLAUDE.md §7 flagged as stale (57 files real vs 34 claimed)
  - Confidence inflated where cross-agent convergence occurred; held at MEDIUM where single-agent or prospective; web-only claims downgraded HIGH → MEDIUM per V1 budget discipline (C-006, C-007, C-119)
  - Windows 0-byte bug elevated to cross-theme finding (appears in 4 D-agent reports)
  - Contrarian-surfaced structural gaps (family unit-type, greenfield-clone verdict, v0.5 scaffold) added as OTB section, not silently absorbed
  - Gap-round 1 findings: loop-control protocol (formalising D28) + SoNash-side refactor cost (correcting C-127 from "~20-40h ballpark" to 24-43h SoNash + 25-40h /migration codemod) + grep-scope-narrowness elevated to methodology lesson
  - A5/A8 scope-tagging: A5 explicitly v1.1 (depends on deferred C6 round-trip); A8 renamed "Plan-stability self-audit (forward-direction I1 test)" to disambiguate from A5
