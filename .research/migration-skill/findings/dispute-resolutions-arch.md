# DISPUTE RESOLUTIONS — Architecture & design

**Dispute-resolver:** persona `<JASON_OS_ROOT>\.claude\agents\dispute-resolver.md` (DRAGged 5-type taxonomy, evidence-weight hierarchy T1→T4)
**Date:** 2026-04-21
**Inputs consulted:**
- `findings/D7-router-vs-monolith.md` (C-042 basis)
- `findings/D7-other-multi-skill-families.md` (C-043 basis)
- `findings/D7-cas-precedent.md` (C-044 basis — boundary heuristic)
- `findings/D1-migration-agent-spec.md` (8-new-agent proposal)
- `findings/D1-agents-jason-os.md` (general-purpose collapse alternative)
- `findings/V4-design-web.md` (verifier V4 C-042/C-043/C-044 triad resolution)
- `challenges/contrarian.md` (Challenges 1, 6, 7 + NC-04, NC-06)
- `BRAINSTORM.md` §2, D16–D18, D22–D28
- `RESEARCH_OUTPUT.md` lines 14, 53, 379 (the three-way ambiguity)
- `CLAUDE.md` §4 guardrails #15, #16 + §7 agents
- JASON-OS `.claude/agents/` directory (8 files, inventoried)

---

## Summary

Three disputes resolved with concrete, committable verdicts. Canonical architecture = **"minimum-viable router (/migration) + 2 ancillary skills (/migration-scan, /migration-prove)"**. D16 back-direction = **VIOLATED (reframe to v1.1)** per D28 iterative re-entry norm. Agent count = **2 new custom agents** (`migration-executor` + `migration-plan-author`), 6 reused. Full rationale and per-claim update table below.

- Dispute count resolved: **3**
- Canonical architecture name: **"minimum-viable router + 2 ancillaries (router-with-2-ancillaries)"**
- D16 verdict: **VIOLATED → reframed to v1.1**
- Agent count recommended: **2 new** (plus 6 reused)

---

## Dispute 1: Decomposition shape (3-way ambiguity → ONE canonical name)

### The three-way ambiguity (restatement)

| Location | Label used | Shape implied |
|---|---|---|
| `RESEARCH_OUTPUT.md:14` (Exec Summary) | "monolith-with-companions + phased-pipeline" | Shape A + Shape C — everything inside one SKILL.md, companions passive |
| `RESEARCH_OUTPUT.md:53` (Theme 1 rec) | "router + 2 ancillaries" | Shape D — peer skills with their own invocation contracts |
| `RESEARCH_OUTPUT.md:379` (Recommendation #1) | "minimum-viable router + 2 ancillaries" | Shape D (same as line 53, different wording) |

These are **two distinct architectures** (Shape A+C vs Shape D) plus one restatement of Shape D. The contrarian NC-06 is correct: the synthesis commits to different shapes in three sentences.

### Reasoning from the four required angles

**(a) What the 7-phase arc naturally wants (BRAINSTORM §2):** The arc is linear with mid-flow gates. Phases 0, 1, 3, 4, 5 each have only 0-1 of the 7 decomposition criteria satisfied per `D7-router-vs-monolith.md:37-49`. They are tightly coupled via gate memory, verdict state, and plan artifact state. Phases 2 (Discovery) and 6 (Prove) each hit 4+ criteria — they have standalone value (Phase 2 = proactive-scan per D2; Phase 6 = convergence-loop harness reusable outside /migration). The arc naturally *wants* the spine monolithic and the two high-leverage extremes peelable.

**(b) What D22/R3 gate-memory requires (BRAINSTORM:81):** Gate memory is a state-file contract where prior answers aid recall but confirmation is always re-required. This REJECTS pure monolith-with-companions (Shape A alone) because the state file must be addressable by a peer skill at resume time — the monolith-with-deep-research pattern keeps state inside one skill's turn (`deep-research/SKILL.md:202-204`), and `/migration` explicitly needs re-entry across sessions and across skill boundaries. R3's "re-required confirmation" contract is satisfied equally well by Shape A OR Shape D, but is materially cleaner under Shape D because each ancillary writes its own state namespace and the router re-hydrates on re-entry. Evidence: `D7-invocation-contracts.md:72-122` applies D22 across skill boundaries as "no-inherit" — requires peer skills.

**(c) What D26 output modes imply (BRAINSTORM:85):** Direct-apply vs plan-export are *modes*, not separate skills. The D26 plan-export artifact (`MIGRATION_PLAN.md`) is meant to be invoked by a **separate tiny** `/apply-migration-plan` skill at destination per C-095 + `D4-plan-export.md:151-163` — NOT by `/migration` itself. This argues for keeping the primary skill monolithic-within-phases (the mode fork lives inside Phase 4/5), but confirms that Shape D's "peer skill for Phase 6" pattern is the right direction — Phase 6 (Prove) must work against a plan regardless of mode. Terraform's `plan`/`apply` split (`D7-router-vs-monolith.md:85-88`) is the canonical analog: plan-export is plan-saved-to-artifact, direct-apply is plan-then-apply-inline; neither requires the primary skill to split scan or reshape into peers.

**(d) What the deep-research precedent shows (`D7-other-multi-skill-families.md`):** `/deep-research` is 12 phases + state file + agents-within-skill. Its companions (REFERENCE.md, domains/*.yaml) are passive. This is the closest existing large-scale JASON-OS skill. BUT deep-research has no standalone-invocable sub-phase — nobody runs `deep-research-phase-2-decomposition` as its own verb. `/migration` is different: proactive-scan mode (D2) IS a real standalone use case for Phase 2, and convergence-loop-as-prove is already a general skill (per `D7-router-vs-monolith.md:117`). So deep-research's pure monolith works because no phase had independent demand; `/migration` has independent demand at Phases 2 and 6 by explicit brainstorm decision.

### Canonical verdict

**Adopt: "minimum-viable router + 2 ancillaries."**

Concretely:
```
/migration              PRIMARY — 7-phase orchestrator, internal phases 0/1/3/4/5 remain in-skill
/migration-scan         ANCILLARY — Phase 2 Discovery; non-mutating; standalone-invocable
/migration-prove        ANCILLARY — Phase 6 Prove; convergence-loop wrapper; standalone-invocable
```

Why this label (and not the two alternatives):

1. **Rejected: "monolith-with-companions"** — fails D7-cas-precedent's three-part boundary heuristic (`D7-cas-precedent.md:255-289`) for Phases 2 and 6. Both phases pass (a) own user-facing invocation (D2 proactive-scan; Phase 6 as standalone convergence-loop harness), (b) own distinct artifact set (`DISCOVERY.md`; `PROVE.md`), and (c) re-runnable independently (scan against an unchanged source yields empty-diff; prove against a post-migration state yields T20 tally). Keeping them inside the monolith forces users to drive a 7-phase menu just to reach them, which violates the D28 re-entry norm and the proactive-scan D2 decision.

2. **Rejected: "monolith-with-companions + phased-pipeline" (Exec Summary line 14)** — this is a description of the *primary skill's internal shape*, not the whole architecture. The router IS monolith-with-companions at the SKILL.md level (it has REFERENCE.md + state file + scripts/ helpers). But the whole-family shape adds two ancillaries. "Monolith-with-companions" alone is wrong because it misses the ancillaries; "router + 2 ancillaries" is right because the primary (`/migration`) serves as the composite front door analogous to `dbt build` while the ancillaries (`/migration-scan`, `/migration-prove`) serve as peer sub-commands analogous to `dbt test` / `dbt run`.

3. **Boundary-heuristic authorship concern (contrarian Challenge 1):** The contrarian correctly notes D7-cas-precedent's heuristic was authored inside the same Q7 cluster whose contradiction it adjudicates. Resolution: the heuristic is a *structural test*, not a claim about CAS — it asks three yes/no questions about any candidate peer skill. Its provenance doesn't weaken its discriminating power, but it DOES mean we should not treat it as external corroboration. We adopt it because independent precedent (Terraform plan/apply; dbt run/test/seed; Flyway info/repair) *also* supports the 2-ancillary-extraction shape. The heuristic is one of three converging arguments, not a solo tiebreaker.

### Naming convention (to be used throughout re-synthesized RESEARCH_OUTPUT.md)

**Canonical label:** "router + 2 ancillaries" or "minimum-viable router + 2 ancillaries" (interchangeable).

Component names (use these exactly, everywhere):
- **Primary:** `/migration` (the router). Internal shape = "monolith-with-companions" (SKILL.md + REFERENCE.md + optional verdicts/*.yaml + scripts/migration/). Do NOT call the whole architecture "monolith-with-companions"; that phrase refers to the primary's internal file layout only.
- **Ancillary A:** `/migration-scan` (Phase 2 Discovery peer skill).
- **Ancillary B:** `/migration-prove` (Phase 6 Prove peer skill).

Forbidden labels (remove from re-synthesized output):
- "monolith-with-companions" as a whole-family descriptor (it describes only the primary's file layout)
- "phased-pipeline" as a standalone architecture (it's an orthogonal axis — the primary and both ancillaries are all internally phased)
- Any usage that reads as if Shape A and Shape D are being claimed simultaneously at the family level

### Claim updates (Dispute 1)

| Claim | Old | New | New wording |
|---|---|---|---|
| C-042 (router+2) | MEDIUM | **HIGH** | "Ship `/migration` as minimum-viable router with 2 ancillaries (`/migration-scan`, `/migration-prove`). Primary uses monolith-with-companions internal layout; ancillaries are peer skills per D7-cas-precedent boundary heuristic." |
| C-043 (pure monolith) | MEDIUM → LOW (V4 recommendation) | **LOW (confirmed)** | "Alternative considered: pure monolith-with-companions. REJECTED for /migration because Phases 2 and 6 pass all three promote-to-peer criteria (standalone invocation, distinct artifact set, re-runnable independently). Retained as alternative record only." |
| C-044 (boundary heuristic) | MEDIUM → HIGH (V4 recommendation) | **HIGH (confirmed)** | "Boundary heuristic (own invocation + distinct artifacts + re-runnable independently) from D7-cas-precedent. Applied to /migration: Phases 2 and 6 pass; Phases 3, 4, 5 fail criterion (c); Phase 0/1 fail (a)(b). Heuristic is one of three converging arguments (precedent catalog dbt/Flyway/Terraform + refactor-cost asymmetry + criterion-fit scoring)." |

---

## Dispute 2: D16 back-direction coverage

### The question

BRAINSTORM D16 (line 70): "Full both-direction build from v1 — both directions first-class. Self-dogfood is a test, not a design crutch."

Is this **UPHELD** by the research (design is symmetric, back-direction will just work) or **VIOLATED** (research doesn't actually support it)?

### Evidence

1. **D5-reshape-pipeline grep for direction symmetry:** Zero matches for `reverse|bidirection|symmetric|backward` (contrarian Challenge 6; re-verified this session). Only match for "direction" in D5 is in the sole worked walkthrough title: "`audit-code` SoNash → JASON-OS" (`D5-reshape-pipeline.md:197`).

2. **D5 primitives carry direction bias in examples:** P3 example hard-codes `{"SoNash": "JASON-OS", ...}`; P9 is described as "SoNash Zod schema → JASON-OS-agnostic equivalent." While the primitives are in principle direction-agnostic, every instantiation is one-way.

3. **D10 C4 criterion (`D10-self-dogfood.md:92-103`) acknowledges back-direction is *implied by D16* not *designed into the pipeline*:** The text reads "Per D16, 'full both-direction build from v1.' Self-dogfood must exercise `direction=in` independently (not only `out`)." This is a test-level assertion, not a design-level guarantee. The text of RESEARCH_OUTPUT.md:263 even has a direction-label slip ("Back-direction works: SoNash → JASON-OS") flagged by the contrarian.

4. **D10 C6 round-trip (keystone criterion):** Round-trip A → B → A' does exercise both directions. BUT as the contrarian notes, "round-trip can pass without the pipeline actually handling JASON-OS→SoNash well if JASON-OS starts sparse and ends sparse (trivial round-trip that doesn't exercise the hard primitives)." The round-trip property is necessary but not sufficient for D16 symmetry.

5. **D9 re-port/diff-port finding:** `D9-diff-port.md` catalogs four re-port modes that share a 3-way-merge substrate — but the scenarios A/B/C/D are also written one direction (source-authoritative).

### Verdict: **VIOLATED** — reframed to v1.1 per D28

D16 is not UPHELD. The research surfaced genuinely direction-asymmetric design artifacts (D5 signals, D5 primitives, D9 scenarios). The signal detectors and primitives are *principally* direction-agnostic but their concrete instantiation has not been exercised in the reverse direction, and the reverse direction would likely surface new primitives (contrarian suggests "helper-strip" for removing JASON-OS infrastructure when going back to SoNash).

Rather than mandate a follow-up research round before /deep-plan (option b), adopt option (a) with a refinement:

### Recommended adjustment: Option (a+) — downgrade D16 to v1.1 + documented reframe per D28

**The concrete change to BRAINSTORM.md:**

Replace D16 text with:
> **D16 (updated per post-research reframe, 2026-04-21):** Direction-symmetric design is the v1.1 goal. v1 ships with `direction=out` (JASON-OS → external) as the primary validated flow and `direction=in` as an available-but-caveated flow. Full both-direction build is reframed to v1.1 because D5 research (reshape pipeline) was executed one-direction-only; the 9 signal detectors, 11 transformation primitives, and single worked walkthrough are SoNash → JASON-OS only. A D5-reverse finding (symmetric re-run for JASON-OS → SoNash) is required before D16-as-originally-written can be upheld. Per D28 iterative re-entry norm, this is a research-surfaced reframe, not a decision change.

**Why option (a+) over option (b) (mandatory pre-plan research round):**

1. The D28 re-entry norm (BRAINSTORM:92) explicitly allows "research surfaces material reframe → re-enter brainstorm." This IS that scenario. Blocking /deep-plan on a full D5-reverse research round is costly (estimated ~1 week incremental research) when the reframe can proceed into planning with v1 rescoped.

2. Self-dogfood C1/C2 (produce plan + execute plan targeting SoNash) is tractable in v1 with direction=out only. C4 (back-direction) and C6 (round-trip) move to v1.1 as part of the D16-reframe package. This aligns with contrarian Challenge 5's recommendation to rescope v1 acceptance to C1+C2.

3. The D5-reverse research CAN run in parallel with /deep-plan for v1 (direction=out). The reframe surfaces the gap; the plan incorporates it as a v1.1 scope marker; the D5-reverse research lands before v1.1 kickoff.

4. Option (b) treats the gap as blocking. It is not. v1 (direction=out) is a shippable product that validates the 7-phase arc + verdict legend + gate design against the origin use case (SoNash → JASON-OS). v1.1 extends symmetry. This matches the "M0→M4" milestone ladder already in the research output.

### Claim updates (Dispute 2)

| Claim | Old | New | New wording |
|---|---|---|---|
| C-021 (9 signal detectors) | HIGH | **MEDIUM** (per contrarian) | "Nine signal detectors for verdict assignment, direction=out validated. Direction-symmetric instantiation deferred to D5-reverse research (v1.1 scope)." |
| C-022 (3-source hybrid idiom detection) | HIGH | **MEDIUM** (per contrarian) | "3-source hybrid idiom detection (static scan + IDIOM_MANIFEST.yaml + few-shot LLM). Validated for direction=out; direction=in instantiation unproven." |
| C-055 (7 self-dogfood criteria) | HIGH | **MEDIUM** | "7 self-dogfood criteria. v1 acceptance scoped to C1+C2 (direction=out). C3 (structural-identical), C4 (back-direction), C5-C7 deferred to v1.1 pending D5-reverse + D16 reframe." |
| C-057 (v1 bar = C1-C5 + C6) | MEDIUM | **LOW (rescoped)** | "v1 acceptance bar REVISED: C1+C2 only (direction=out). Original C1-C5 + C6 bar rescoped to v1.1 per D16 reframe." |
| **NEW: C-D16-reframe** | — | **HIGH** | "D16 ('full both-direction build from v1') is reframed to v1.1 per D28 iterative re-entry norm. v1 ships direction=out only; D5-reverse research required before v1.1 kickoff. Rationale: D5 reshape pipeline findings are direction=out-only in 9 signals, 11 primitives, and sole worked walkthrough." |

---

## Dispute 3: Agent count for /migration

### The proposals

- **D1-migration-agent-spec:** 8-9 new custom agents + 6 reused (`migration-discovery-scanner`, `migration-verdict-assigner`, `migration-plan-author`, `migration-plan-checker`, `migration-sanitizer`, `migration-reshaper`, `migration-rewriter`, `migration-executor`, `migration-prove-reporter`).
- **D1-agents-jason-os:** As few as 1 new (`migration-executor`) using the `pre-commit-fixer` `general-purpose` precedent (`pre-commit-fixer/SKILL.md:168-170`) — the only existing in-code precedent for transformation-oriented agent dispatch in JASON-OS.

### Reasoning from the three required angles

**(a) Tool-grant differentiation:**

Per `D1-migration-agent-spec.md:37-40`, four of the proposed new agents (sanitizer, reshaper, rewriter, executor) declare **identical** tool grants: `Read, Write, Edit, Bash, Grep, Glob`. Only `migration-rewriter` adds `WebSearch, WebFetch, Context7 MCP`. So the tool-grant differentiation argument supports AT MOST 2 agents: "local-only transformer" (Read/Write/Edit/Bash/Grep/Glob) and "research-during-transform transformer" (adds WebSearch + WebFetch + Context7). Three other proposed agents — `migration-discovery-scanner`, `migration-plan-checker`, `migration-prove-reporter` — have read-only tool profiles that are already well-served by **reused** `deep-research-searcher` (codebase profile) + `deep-research-verifier` respectively. The `migration-plan-author` declares the same Read/Write/Bash/Grep/Glob as the existing synthesizers; fits into reused territory with a migration-scoped prompt.

Net: tool-grant differentiation justifies **1-2 new agents**, not 8-9.

**(b) Testability per agent type:**

Skill-audit (`_shared/SELF_AUDIT_PATTERN.md:1-332` per C-058) runs a 12-category rubric per agent. 8 new agents × ~300 LOC each + skill-audit runs = ~2,400 LOC of new agent definitions plus 8 audit cycles. Operational cost per contrarian Challenge 7 is ~2 weeks additional work over v1 milestone.

BUT: testability argues for NOT collapsing the verdict-specific transformers into one, because each has distinct failure modes (sanitize failure = regex collision; reshape failure = idiom mismatch; rewrite failure = semantic drift). HOWEVER, the `pre-commit-fixer` precedent demonstrates these failure modes can be handled inside ONE agent by scoped prompts — pre-commit-fixer dispatches ESLint/Prettier/tsc fixes through a single `general-purpose` invocation with category-specific prompt framing. The `/migration` analog is: one `migration-executor` agent receives a verdict + unit + context, and the PROMPT varies per verdict (not the agent).

Net: testability argues that verdict-aware prompting in ONE executor is cheaper to test + maintain than 3-4 sibling agents with identical tool grants.

**(c) Operational cost of maintaining 8-9 agent definitions:**

JASON-OS currently has 8 agents total (`.claude/agents/` — verified this session: `contrarian-challenger.md`, `deep-research-final-synthesizer.md`, `deep-research-gap-pursuer.md`, `deep-research-searcher.md`, `deep-research-synthesizer.md`, `deep-research-verifier.md`, `dispute-resolver.md`, `otb-challenger.md`; total 8 files, 61.5 KB). Adding 8-9 agents for one skill **doubles** the agent inventory. This is a significant governance cost.

Contrast: adding **2 new agents** (executor + plan-author) brings the inventory from 8 → 10 (25% growth), which is proportionate to /migration being a major new skill. Retains headroom for future skills without agent-inventory bloat.

### Verdict: **2 new agents + 6 reused**

Recommended roster:

| # | Agent | New/Reuse | Role | Phase |
|---|---|---|---|---|
| 1 | `migration-executor` | **NEW** | Single active-transformation agent. Receives verdict + unit + idiom bundle (from reused deep-research-searcher). Dispatches verdict-aware prompts internally (sanitize-prompt vs reshape-prompt vs rewrite-prompt). Tool grants: `Read, Write, Edit, Bash, Grep, Glob, WebSearch, WebFetch, mcp__context7__resolve-library-id, mcp__context7__query-docs` (rewrite-verdict units need these; gated at prompt level). Model: sonnet default; per-unit opus flag for rewrite verdicts. | 5 Execute |
| 2 | `migration-plan-author` | **NEW** | Writes `MIGRATION_PLAN.md`. Distinct from `deep-research-synthesizer` because MIGRATION_PLAN.md schema (verdict ledger, unit-type tracks, mode-switch, gate checkpoints) differs from RESEARCH_OUTPUT.md schema. Tool grants: `Read, Write, Bash, Grep, Glob`. | 4 Plan |
| 3 | `deep-research-searcher` | REUSE | Phase 2 discovery scan (codebase profile); Phase 3 destination-idiom research. Already profile-switchable. | 2, 3 |
| 4 | `deep-research-verifier` | REUSE | Phase 6 prove — dual-path verification (filesystem + web) of post-migration claims. Existing 4-verdict taxonomy fits. | 6 |
| 5 | `contrarian-challenger` | REUSE | Phase 2 verdict challenge (adversarial check before verdicts lock); optional Phase 4 plan challenge. | 2, (4 optional) |
| 6 | `dispute-resolver` | REUSE | Mid-execute idiom conflicts (source-idiom vs destination-idiom disagreement). DRAGged taxonomy applies cleanly. | 2, 5 (on demand) |
| 7 | `Explore` (built-in) | REUSE | Phase 0 context load; Phase 2 ripple map. | 0, 2 |
| 8 | `convergence-loop` (skill, not agent) | REUSE | Phase 6 convergence-loop harness (`/migration-prove` wraps this). | 6 |

**Explicitly rejected from the D1-migration-agent-spec proposal:**
- `migration-discovery-scanner` → roll into `deep-research-searcher` (codebase profile) with migration-scoped spawn prompt. Precedent: `/brainstorm` reuses deep-research-searcher.
- `migration-verdict-assigner` → roll into orchestrator (skill-level dispatch, analogous to /deep-research's phase dispatch). Verdict assignment is a structured per-unit call, not a long-running investigation — does not need its own agent. Alternative: use `general-purpose` with verdict-specific prompt if parallelism is needed (matches pre-commit-fixer pattern).
- `migration-plan-checker` → roll into `deep-research-verifier` with a MIGRATION_PLAN.md verification profile. Its role (gap detection against verdicts + research) is structurally identical to what the verifier already does for research claims.
- `migration-sanitizer`, `migration-reshaper`, `migration-rewriter` → collapsed into `migration-executor` (the ONE new execution agent). Verdict-aware prompting handles the differentiation. This is the `pre-commit-fixer` precedent applied.
- `migration-prove-reporter` → orchestrator-owned. Writing PROVE.md is template-population from convergence-loop output + verifier claims; it is not agent-worthy work. Precedent: /deep-research's RESEARCH_OUTPUT.md is written by an agent (final-synthesizer) because the reconciliation is complex (claims.jsonl/sources.jsonl/metadata.json). PROVE.md has no analogous reconciliation burden.

### v1 vs v1.1 agent roadmap

- **v1 (ships):** 2 new agents (`migration-executor`, `migration-plan-author`) + 6 reused.
- **v1.1 (upgrade trigger — only if operational evidence demands):** Split `migration-executor` into `migration-sanitizer` + `migration-reshaper` + `migration-rewriter` if gate traces show verdict-collision (one agent's context pollutes another verdict's reasoning) OR if rewrite-verdict units need a dedicated opus-model agent for cost/quality reasons.

Upgrade trigger is OBSERVED behavior, not speculative. This matches the refactor-cost asymmetry argument in `D7-router-vs-monolith.md:130-148`: under-decomposing agents is cheaper to fix than over-decomposing.

### Claim updates (Dispute 3)

| Claim | Old | New | New wording |
|---|---|---|---|
| C-009 (5-8 new agents) | MEDIUM | **LOW (rescoped)** | "Agent count recommendation: 2 new custom (`migration-executor`, `migration-plan-author`) + 6 reused. Original 8-new proposal collapsed per pre-commit-fixer general-purpose precedent and identical-tool-grant analysis. Split agents deferred to v1.1 pending operational evidence." |
| **NEW: C-agent-roster-v1** | — | **HIGH** | "v1 agent roster = 2 new (`migration-executor` with verdict-aware prompting; `migration-plan-author` for MIGRATION_PLAN.md) + 6 reused (`deep-research-searcher`, `deep-research-verifier`, `contrarian-challenger`, `dispute-resolver`, `Explore`, `convergence-loop` skill). Total: 10 agents in JASON-OS inventory (up from 8)." |
| **NEW: C-agent-split-trigger** | — | **MEDIUM** | "v1.1 split trigger: if verdict-collision appears in gate traces OR rewrite-verdict units need dedicated opus-model agent, split `migration-executor` into sanitizer/reshaper/rewriter siblings. Trigger is observed, not speculative." |

---

## Proposed claim updates (consolidated)

| Claim | Current | Proposed | Reason |
|---|---|---|---|
| C-009 | MEDIUM | **LOW (rescoped)** | Agent count collapsed from 5-8 to 2 new + 6 reused (Dispute 3) |
| C-021 | HIGH | **MEDIUM** | Signal detectors are direction=out only (Dispute 2) |
| C-022 | HIGH | **MEDIUM** | Idiom detection direction=out only (Dispute 2) |
| C-042 | MEDIUM | **HIGH** | Canonical architecture = router + 2 ancillaries (Dispute 1) |
| C-043 | MEDIUM → LOW | **LOW (confirmed)** | Pure monolith rejected per boundary heuristic (Dispute 1) |
| C-044 | MEDIUM → HIGH | **HIGH (confirmed)** | Boundary heuristic is one of three converging arguments (Dispute 1) |
| C-055 | HIGH | **MEDIUM** | v1 bar rescoped to C1+C2 (Dispute 2) |
| C-057 | MEDIUM | **LOW (rescoped)** | v1 acceptance bar = C1+C2 only (Dispute 2) |
| **NEW: C-D16-reframe** | — | **HIGH** | D16 reframed to v1.1 per D28 (Dispute 2) |
| **NEW: C-agent-roster-v1** | — | **HIGH** | 2 new + 6 reused (Dispute 3) |
| **NEW: C-agent-split-trigger** | — | **MEDIUM** | v1.1 split is observation-gated (Dispute 3) |

### Text corrections required in re-synthesized RESEARCH_OUTPUT.md

1. **Line 14 (Exec Summary):** Replace "monolith-with-companions + phased-pipeline" with "minimum-viable router + 2 ancillaries (`/migration` primary with monolith-with-companions internal layout; `/migration-scan` and `/migration-prove` as peer skills)."

2. **Line 53 (Theme 1 rec):** Keep "router + 2 ancillaries" language, add: "Primary internal layout follows Shape A (monolith-with-companions) + Shape C (phased pipeline); the whole-family architecture is Shape D (router-plus-ancillary-skills) applied minimally per D7-cas-precedent boundary heuristic."

3. **Line 263 (C4 criterion):** Fix direction typo: "Back-direction works: **JASON-OS → SoNash** independently (implied by D16)" (was "SoNash → JASON-OS" — same as forward case, flagged by contrarian).

4. **Line 270 (v1 acceptance bar):** Rescope from "Criteria 1-5 + C6" to "Criteria 1-2 only; C3-C7 deferred to v1.1 per D16 reframe."

5. **Line 379 (Recommendation #1):** Already reads "minimum-viable router + 2 ancillaries" — keep this wording as the canonical label. Remove any conflicting phrasing elsewhere.

6. **Recommendation #2 (CAS port):** Not part of this dispute resolution but flagged by contrarian Challenge 3 — recommend splitting CAS port into Tier 0 (hand-port schemas+lib, before `/migration` exists) + Tier 1 (handler skills, via `/migration` v0). Separate dispute.

---

## Return summary

- **Disputes resolved:** 3
- **Canonical architecture name:** `minimum-viable router + 2 ancillaries` (primary `/migration` with monolith-with-companions internal layout; ancillaries `/migration-scan` (Phase 2) and `/migration-prove` (Phase 6))
- **D16 verdict:** `violated → reframed to v1.1` (per D28 iterative re-entry norm)
- **Agent count recommended:** `2 new` (`migration-executor`, `migration-plan-author`) + 6 reused (total inventory 8→10)
- **Findings path:** `<JASON_OS_ROOT>\.research\migration-skill\findings\dispute-resolutions-arch.md`

**End DISPUTE RESOLUTIONS — Architecture & design.**
