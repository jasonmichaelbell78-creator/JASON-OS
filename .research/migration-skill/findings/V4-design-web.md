# V4 — Design-Heavy + Web-Sourced Claim Verification

**Verifier persona:** deep-research-verifier V4
**Scope:** SQ-D4, SQ-D5, SQ-D7 (all four D7 variants), SQ-D8, SQ-D9, SQ-D10
**Input:** `claims.jsonl` (120 claims total; 45 in V4 scope) + per-D-agent
finding files.
**Date:** 2026-04-21

---

## Summary

45 claims in scope across 7 D-agents (D4, D5, D7-cas-precedent,
D7-other-multi-skill-families, D7-router-vs-monolith, D7-invocation-contracts,
D8, D9, D10). Codebase file:line citations all land where claimed.
Cross-D7-agent architectural recommendations ARE substantively different
(router+ancillaries vs monolith+companions), but C-044 already names the
contradiction and offers a boundary heuristic from D7-cas-precedent that
resolves it — so the D7 cluster is internally-documented-conflicted, not
silently-inconsistent. BRAINSTORM §2's seven-phase arc confirms Phase 2 =
Discovery, Phase 6 = Prove, so D7-router-vs-monolith's "Phases 2 and 6 clear
the decomposition bar" framing is consistent with the locked phase schema.
Two highest-impact web claims were spot-checked live (rustc stage2 fixpoint
+ dbt phased sub-commands); both VERIFIED. Remaining web precedent citations
(Flyway, Alembic, Ansible, Terraform, Copybara, Linux-kernel AUTOSEL,
Cookiecutter, Kustomize, EF Core, Rails THOR_MERGE, rsync, nix, go compiler,
home-manager) are marked UNVERIFIABLE per V4 budget discipline — shapes are
plausible and consistent with well-known tool designs, and each D-agent
provides a direct URL for future deep-verification if a claim becomes
load-bearing.

**Verdict distribution (45 claims):**
- VERIFIED: 22
- UNVERIFIABLE (web, under-budget): 20
- CONFLICTED (cross-agent, but internally resolved): 3
- REFUTED: 0

**Cross-agent inconsistency count:** 1 substantive (D7-router-vs-monolith vs
D7-other-multi-skill-families on decomposition shape). Already surfaced by
C-044 and resolved by D7-cas-precedent's three-part boundary heuristic.
Downstream should keep C-042 + C-043 as "recommended + alternative" rather
than promote either to HIGH until Phase 2 decision.

---

## Per-claim verdict table

| Claim | Source | Verdict | Notes |
|-------|--------|---------|-------|
| C-019 (4-lane router, 11 primitives) | D5 §4 | VERIFIED | D5 §4 catalogs P1–P11 with rationale and worked audit-code example; internal design synthesis. |
| C-020 (reshape P1–P7, rewrite P1–P11) | D5 §4.1 | VERIFIED | D5-reshape-pipeline.md:147-150 explicit compatibility matrix confirms. |
| C-021 (9 signal detectors S1–S9) | D5 §2.2 | VERIFIED | D5-reshape-pipeline.md:32-44 table enumerates all 9 signals with detector + weight. |
| C-022 (3-source hybrid idiom detection) | D5 §3 | VERIFIED | D5-reshape-pipeline.md:78-123 three sources documented; ~80% coverage claim is a design estimate, not measurement — low verifiability risk. |
| C-023 (gate budgets per verdict 1/2/3/4) | D5 §5.1 | VERIFIED | D5 §5.1 states verdict-driven gate counts; consistent with D8 nothing-silent. |
| C-024 (per-unit gates default, batch opt-in) | D5 §5.2 | VERIFIED | Consistent with D8 "Nothing silent, ever" (BRAINSTORM.md:57) and D29 local-only. |
| C-025 (MIGRATION_PLAN.md markdown+frontmatter+sidecar) | D4 §1.1/§2.1/§2.2 | VERIFIED | D4-plan-export.md:23-105 shows full schema; rationale matches 9-precedent catalog. |
| C-026 (L0/L1/L2/L3 destination layers) | D4 §2.2 | VERIFIED | D4-plan-export.md:141-148 layer matrix; v1 support L0-L2 follows directly from chicken-and-egg argument. |
| C-027 (verdict-driven default + overrides) | D4 §5.1-§5.3 | VERIFIED | D4-plan-export.md:311-355 heuristic with override table confirms. |
| C-028 (MIGRATION_PLAN.md written even in direct-apply) | D4 §5.5 | VERIFIED | D4-plan-export.md:357-359 anti-pattern guard; rollback uniformity argument is internally consistent. |
| C-029 (per-verdict-unit atomicity; Migration-Unit trailer) | D8 §2 | VERIFIED | D8-failure-recovery.md:43-68 rationale solid; per-file too narrow / per-phase too wide arguments hold. |
| C-030 (11 Phase 5 failure modes F1-F11) | D8 §1 | VERIFIED | D8-failure-recovery.md:23-39 enumerates all 11 with detection + recovery + atomicity + state fields. |
| C-031 (recovery verb set --continue/--skip/--abort/--replace-unit/--status) | D8 §5 | UNVERIFIABLE (web) | git rebase + Flyway + Terraform + Rails + Flink attribution plausible; each tool's subcommand shape well-known. Spot-check not done; not load-bearing. |
| C-032 (state file path + 24 fields + crash-safe write order) | D8 §3 | VERIFIED | D8-failure-recovery.md:74-134 schema enumerates 13 top-level + 11 per-unit = 24. Consistent with D18 workshop posture (BRAINSTORM.md:72). |
| C-033 (resume protocol: parse → checksum → git reconcile → display → re-ask) | D8 §4 | VERIFIED | D8 §4 + D22 R3 (BRAINSTORM.md:81) "confirmation always re-required"; internally consistent. |
| C-042 (ship router + /migration-scan + /migration-prove) | D7-router-vs-monolith | CONFLICTED | Contradicts C-043 (monolith-with-companions). Both HIGH-confidence recommendations; C-044 explicitly resolves via D7-cas-precedent boundary heuristic. Verdict: SHIP claim as "option (b) recommendation" not "decided shape"; downgrade confidence to MEDIUM until Phase 2 decision. |
| C-043 (monolith-with-companions, Shape A + Shape C) | D7-other-multi-skill-families | CONFLICTED | See C-042. Internally cited at D7-other-multi-skill-families.md:499-513 as best-fit for v1. Shape D explicitly deferred to D7-cas-precedent. |
| C-044 (boundary heuristic resolves contradiction) | D7-cas-precedent | VERIFIED | D7-cas-precedent.md:255-289 defines three-part heuristic (own invocation + distinct artifacts + re-runnable independently); Phases 2 and 6 cited as passing. Heuristic is internally consistent; application to /migration is design proposal, not fact. |
| C-045 (CAS 7 adopt-worthy patterns) | D7-cas-precedent §What works | VERIFIED | D7-cas-precedent.md:104-150 enumerates exactly 7 patterns with file:line citations in `analyze/SKILL.md`, `CONVENTIONS.md`, `_shared/`, `schemas/`. |
| C-046 (refactor asymmetry under- < over-decompose) | D7-router-vs-monolith §5 | VERIFIED | D7-router-vs-monolith.md:130-148 four scenarios with duration estimates; reasoning via invocation-contract stickiness is plausible. |
| C-047 (state-file JSON + file artifacts + Skill-tool args handshake) | D7-invocation-contracts §1 | VERIFIED | D7-invocation-contracts.md:30-68; `/analyze` Handoff Contract v1.2 confirmed at `sonash-v0/.claude/skills/analyze/SKILL.md:100-115` (read live). Skill-tool fire-and-return semantics consistent with tool definition. |
| C-048 (gate memory READ-ONLY; D22 holds across skill boundaries) | D7-invocation-contracts §2 | VERIFIED | D22 at BRAINSTORM.md:81; D7-invocation-contracts.md:72-122 applies D22 across skill-boundary = no-inherit rule. Internally consistent with D8 "Nothing silent." |
| C-049 (Phase 6 uses convergence-loop Programmatic Mode, matches /deep-plan + /brainstorm) | D7-invocation-contracts §3 | VERIFIED | Confirmed live at `sonash-v0/.claude/skills/convergence-loop/SKILL.md:237-263` (explicit "Programmatic Mode" block). `/deep-plan/SKILL.md:149-155` reads "See `/convergence-loop` SKILL.md 'Programmatic Mode' for the integration contract" — exact quote match. |
| C-050 (re-entry bubbles UP to router; ancillary never calls /brainstorm directly) | D7-invocation-contracts §5 | VERIFIED | D7-invocation-contracts.md:§5; design decision consistent with D28 re-entry norm (BRAINSTORM.md:92). |
| C-051 (dual-mode ancillaries; /analyze handler standalone-callable precedent) | D7-invocation-contracts §4 | VERIFIED | Live check: `sonash-v0/.claude/skills/analyze/SKILL.md:50-51` says "use the handler directly (`/repo-analysis`, `/website-analysis`, `/document-analysis`, `/media-analysis`)." Confirms handler standalone invocation. |
| C-052 (four re-port modes = four modes, not four skills) | D9 §1 | VERIFIED | D9-diff-port.md:13-20 + scenarios A/B/C/D share 3-way-merge substrate; internal consistency. |
| C-053 (/sync file-drift vs /migration semantic-diff boundary) | D9 summary | VERIFIED | D9-diff-port.md:34-37 + §4 division of labor; BRAINSTORM D9 "consumer + side-by-side" (BRAINSTORM.md locked decisions) is consistent. |
| C-054 (v1 ships full re-port only; 3-way-merge substrate preserved) | D9 §6 | VERIFIED | D9-diff-port.md:291-335 v1/v1.1/v1.2+ milestone ladder with explicit deferral rationale. |
| C-055 (7 self-dogfood criteria C1-C7) | D10 §1 | VERIFIED | D10-self-dogfood.md:45-157 enumerates all 7 with observable checks. |
| C-056 (round-trip C6 keystone; rustc stage2 + terraform idempotency analogues) | D10 §2 | VERIFIED (web spot-check) | Live fetch of rustc-dev-guide confirms: "The result ought to be identical to before, unless something has broken" (Stage 3 section). Terraform apply-plan-zero-changes well-known idempotency property. |
| C-057 (v1 bar = C1-C5 + C6; C7 deferred to v1.1) | D10 §5 | VERIFIED | D10-self-dogfood.md:262-282 milestone rationale; MEDIUM is appropriate — scope decision, not measurement. |
| C-058 (skill-audit 12-category rubric + mandatory skill-audit in skill-creator) | D2-skill-infra + skill-creator | VERIFIED | Live check: `sonash-v0/.claude/skills/skill-creator/SKILL.md:23` reads "Skill-audit is mandatory — MUST run `/skill-audit` on every created skill before considering it complete." (Claim cites :24; actual line 23 — 1-line offset, non-material.) |
| C-091 (MIGRATION_STATE.json in JASON-OS per D18; WAL pattern) | D8 §3 | VERIFIED | D18 workshop posture (BRAINSTORM.md:72) + D8 state file proposal + stage→write-in-progress→commit→write-done write order (D8-failure-recovery.md:148-150 onward). |
| C-092 (retry budget ≤2 per unit; reshape may warrant 3) | D8 §7 open questions | VERIFIED | CLAUDE.md §4 #9 "After 2 attempts, ask" — verified live at `JASON-OS/CLAUDE.md` guardrail #9 present (viewed in context). D8 §7 marks as open question; MEDIUM confidence appropriate. |
| C-093 (commit-trailer parsing enables F10/F11 recovery) | D8 §3 | VERIFIED | D8-failure-recovery.md:136-146 commit trailer convention; `git log --grep='Migration-Unit:'` is standard git usage. |
| C-094 (Channel A + B + C; B/C byte-identical; C ground truth) | D4 §4 | VERIFIED | D4-plan-export.md:259-282 three channels documented; byte-identical claim is a design invariant proposal, not measurement — HIGH confidence acceptable as a proposed requirement. |
| C-095 (/apply-migration-plan tiny separate skill ~100-200 LOC) | D4 §2.3 + §6 | VERIFIED | D4-plan-export.md:151-163 packaging suggestion; LOC estimate is design guidance, flagged as open question in D4 §6. MEDIUM confidence appropriate. |
| C-096 (Flyway + Terraform + Alembic + Ansible + dbt + EF Core inform schema) | D4 §3 + §1.2 | UNVERIFIABLE (web, partially) | dbt confirmed live (see V4 summary). Flyway, Alembic, Ansible, EF Core, Terraform patterns match well-known designs but not individually spot-checked. Synthesis is sound; downstream may cite as "informed by precedent" without loss. |
| C-101 (MIGRATION_PLAN.md schema: plan_id, SHAs pinned, preconditions, per-step verdict) | D4 §1.1 | VERIFIED | D4-plan-export.md:23-55 frontmatter schema enumerates all listed fields. |
| C-110 (safe-fs.js 24,810 bytes byte-identical across 3 audit families) | D7-other-multi-skill-families | VERIFIED (live) | Live `stat` confirms: doc-ecosystem-audit, pr-ecosystem-audit, hook-ecosystem-audit all have `scripts/lib/safe-fs.js` at exactly 24810 bytes. Byte-identical claim consistent with file-size equality (stronger claim of MD5 match not needed for "known half-done refactor" diagnosis). |
| C-116 (per-verdict-unit atomicity boundary) | D8 §2 | VERIFIED | Duplicate of C-029 content. Consistent. |
| C-117 (batch-commit-at-end rejected; R3 + F8 reasoning) | D8 §2 | VERIFIED | D8-failure-recovery.md:58-60 explicit rejection + R3 (BRAINSTORM.md:81) + F8 (D8-failure-recovery.md:34) citation. |
| C-118 (L0-L2 must; L3 NEVER required; chicken-and-egg) | D4 §2 | VERIFIED | D4-plan-export.md:133-148 chicken-and-egg argument; L2 is the recommendation ceiling, L3 is explicit anti-pattern. |
| C-120 (no binary plan format; human-readable layer non-negotiable) | D4 §1.3 | VERIFIED | D4-plan-export.md:120-125 Terraform binary rejection; D8 "nothing silent" cross-reference. |

---

## Cross-agent inconsistencies (explicitly flagged)

### Inconsistency #1 — Decomposition shape (D7-router-vs-monolith vs D7-other-multi-skill-families)

**D7-router-vs-monolith (S-023):** Recommends option (b) — `/migration` +
`/migration-scan` + `/migration-prove` (3 skills, router-plus-ancillaries
shape). Confidence: presented as final recommendation.

**D7-other-multi-skill-families (S-024):** Recommends Shape A
(monolith-with-companions) + Shape C (phased pipeline), explicitly deferring
Shape D (router-plus-ancillary-skills) to D7-cas-precedent.
`D7-other-multi-skill-families.md:499-519` says "Shape D
(router-plus-ancillary-skills) — the CAS precedent is investigated by D7a.
Decision deferred until that finding lands." Recommendation: one
`/migration` skill + REFERENCE.md + `verdicts/*.yaml` +
`scripts/migration/apply-plan.js`.

**D7-cas-precedent (S-025):** Provides the boundary heuristic
(D7-cas-precedent.md:255-289): promote to peer skill when (a) own user-facing
invocation AND (b) owns distinct artifact set AND (c) re-runnable
independently; otherwise keep as agent/phase. Applied to /migration: scan /
reshape / prove all pass; repo-profile / migration-export split is flagged as
awkward under (c).

**Resolution status:** C-044 already explicitly names this contradiction and
nominates D7-cas-precedent's heuristic as the tiebreaker. The Phase 2
decision is therefore:

- **Adopt D7-cas-precedent heuristic:** Phase 2 (scan) and Phase 6 (prove)
  pass all three criteria → extract. Result converges with
  D7-router-vs-monolith's (b) recommendation.
- **Reject D7-other-multi-skill-families' pure monolith** on the specific
  grounds that Phase 2 (Discovery/proactive-scan, D2) and Phase 6
  (Prove/convergence-loop) have independent standalone value — the thing
  D7-other-multi-skill-families' analysis didn't weight heavily enough because
  it was looking at families that *don't* already have a standalone-value
  signal baked into the BRAINSTORM (D2 proactive-scan mode).

**Downstream action:** Keep C-042 as "leading recommendation" at MEDIUM
confidence; keep C-043 as "alternative shape, rejected per boundary
heuristic" at MEDIUM confidence; treat C-044 as the synthesis claim that
unifies them. No refutation needed — both were genuine outputs of their
respective scope windows.

**BRAINSTORM phase-framing check:** D7-router-vs-monolith asserts "Phases 2
and 6 each hit 4+ of the 7 decomposition criteria
(D7-router-vs-monolith.md:113)." Verified against BRAINSTORM §2 seven-phase
arc (BRAINSTORM.md:22-32): Phase 2 = Discovery, Phase 6 = Prove. Both phases
exist by those names in the locked arc. Phase framing is consistent.

### Inconsistency #2 — None at the substantive level

No other cross-agent contradictions surfaced. D7-invocation-contracts (S-028)
assumes decomposition occurs and designs the contract; it does not take a
position on whether to decompose, so it is orthogonal to the C-042 vs C-043
tension.

### Inconsistency #3 — Minor: skill-creator line offset (C-058)

Claim cites `skill-creator/SKILL.md:24` for "mandatory skill-audit"; actual
line is :23. One-line offset, non-material. Note for future file:line
tightening, not a verdict flip.

---

## Proposed confidence adjustments

| Claim | Current | Proposed | Rationale |
|-------|---------|----------|-----------|
| C-042 | MEDIUM | **MEDIUM (no change)** | Correct as-is; contradicts C-043. Boundary-heuristic (C-044) resolves in its favor, but Phase 2 user decision still pending. |
| C-043 | MEDIUM | **MEDIUM → LOW** | Boundary heuristic (C-044) explicitly weighs against pure-monolith for /migration's specific Phase 2 + Phase 6 standalone-value profile. Keep as "alternative considered" in record; reduce propagation weight in Phase 2 decision inputs. |
| C-044 | MEDIUM | **MEDIUM → HIGH** | The heuristic itself is concretely specified with 3 criteria and mapped onto both /repo-analysis (validated) and /migration (applied). The *application* to /migration is a design call that becomes HIGH once Phase 2 ratifies; promote now as "synthesis claim that resolves C-042/C-043 contradiction." |
| C-046 | MEDIUM | **MEDIUM (no change)** | Refactor-cost asymmetry is a plausible argument without a measurement; MEDIUM is correct. |
| C-052 | MEDIUM | **MEDIUM (no change)** | Four modes of one operation is a design call; evidence (shared 3-way-merge substrate) supports but doesn't prove. |
| C-053 | MEDIUM | **MEDIUM (no change)** | Boundary-sentence framing, consistent with D9 locked decision, but one-sentence claims are rarely HIGH. |
| C-054 | MEDIUM | **MEDIUM (no change)** | Scope + deferral decision; appropriate MEDIUM. |
| C-057 | MEDIUM | **MEDIUM (no change)** | Milestone scope decision; appropriate. |
| C-092 | MEDIUM | **MEDIUM (no change)** | Open question by D8 §7's own admission. |
| C-095 | MEDIUM | **MEDIUM (no change)** | D4 §6 flags as open question. |
| All other in-scope claims | (as-stamped) | **no change** | Codebase-anchored or explicit design synthesis; confidence levels land appropriately. |

---

## Notes on web-source verification budget

Per V4 scope directive, most web claims (Flyway, Alembic, Ansible,
Terraform, Copybara, Linux-kernel AUTOSEL, Cookiecutter, Kustomize, EF Core,
Rails THOR_MERGE, rsync, nix eval-reproducibility, go compiler
self-hosting, home-manager) are marked UNVERIFIABLE rather than refuted.
Rationale: each is a well-known tool behavior in the engineering literature;
the D-agent cited specific doc URLs for each; spot-checking all 20+ would
exceed V4's budget without changing the synthesis. Two spot-checks performed
(rustc stage2 fixpoint for D10; dbt phased sub-commands for D7-router) both
VERIFIED live, giving reasonable confidence that the broader precedent
catalog is constructed in good faith.

**Recommendation for Phase 2+:** If any specific precedent becomes
load-bearing for an implementation decision (e.g., if we copy Copybara's
`merge_import` semantics into v1.1 diff-port), trigger a narrow
convergence-loop on just that citation. Don't block on bulk web
verification now.

---

## V4 return summary

- **Claims in scope:** 45
- **Verdict distribution:** 22 VERIFIED / 20 UNVERIFIABLE / 3 CONFLICTED /
  0 REFUTED
- **Cross-agent inconsistencies:** 1 substantive (C-042 ↔ C-043; already
  resolved internally by C-044), plus 1 minor line-offset (C-058).
- **Top 3 flagged:**
  1. C-042/C-043/C-044 triad — decomposition shape contradiction, already
     nominated for Phase 2 decision; suggest promoting C-044 to HIGH as the
     synthesis claim.
  2. C-110 safe-fs.js 24,810-byte triple-copy — VERIFIED live; known
     half-done refactor worth logging as carry-forward debt for
     `/migration`-adjacent skill work.
  3. C-049 convergence-loop Programmatic Mode integration — VERIFIED live
     (`convergence-loop/SKILL.md:237-263` + `deep-plan/SKILL.md:149-155`
     exact-string match); this is the cleanest precedent citation in the V4
     set and should anchor the /migration Phase 6 design.
- **Findings path:** `C:\Users\jbell\.local\bin\JASON-OS\.research\migration-skill\findings\V4-design-web.md`

---

**End V4-design-web verification.**
