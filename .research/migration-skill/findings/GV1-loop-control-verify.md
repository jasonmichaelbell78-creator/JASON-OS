# GV1 — Gap-Verifier report for G1-loop-control

**Persona:** Phase 3.96 gap-verifier GV1
**Target:** `findings/G1-loop-control.md` (21.6 KB, 25 sources, 8 recommendations A1-A8)
**Date:** 2026-04-21
**Verdict legend:** VERIFIED / REFUTED / UNVERIFIABLE / CONFLICTED / PARTIAL

---

## Summary

G1's core framing — that append-only ledger + closed ontology + idempotent
transitions give `/migration` a real fixed-point convergence proof — is
**mathematically sound** and **well-supported** by the Kildall/Kam-Ullman
precedent. The Kubernetes level-triggered claim is **operationally correct**
but its citation to the main K8s docs page is weak (the HackerNoon secondary
source carries the burden; I could not re-fetch it, blocked 403). The rustc
stage2 fixpoint claim is **substantively correct in intent but mis-cited in
detail** — the "byte-equal" framing is aspirational and routinely fails in
practice, and G1's in-body quote is attributed to the wrong stage pair. The
Agent Contracts arXiv paper **exists and matches** the description.

The **biggest cross-claim issue** is internal, not external: G1's A5
recommendation treats C6 (round-trip) as the stage2-fixpoint analogue and
proposes extending it — but per `dispute-resolutions-arch.md` Dispute 2, C6
is **deferred to v1.1** (v1 is forward-only, direction=out). G1's A5 therefore
cannot land in v1 and must be re-tagged as a v1.1 commitment. Similarly A8
(self-audit byte-identity test) assumes round-trip capability that v1 will
not have.

Budget: 4 priority claims re-verified via WebFetch/WebSearch; remaining 21
claims flagged UNVERIFIABLE with the standard "high-confidence from training
+ agent reports, not independently re-verified" note.

---

## Per-claim verdict table

### Priority claims (re-verified this pass)

| # | Claim (abbrev.) | Source cited in G1 | Verdict | Evidence / note |
|---|---|---|---|---|
| P1 | Kildall monotone-dataflow converges iff monotone + finite-height | [1][2][5][7] Wikipedia Data-flow analysis | **VERIFIED** | Wikipedia confirms verbatim: "value domain should be a partial order with finite height"; "combination of transfer function and join operation should be monotonic"; "Monotonicity ensures... finite height ensures that it cannot grow indefinitely. Thus we will ultimately reach a situation where T(x) = x." G1's mathematical framing is sound. Append-only = monotone is a correct application. |
| P2 | K8s controllers are level-triggered, Reconcile() must be idempotent | [8][12][13] kubernetes.io + HackerNoon + Chainguard | **PARTIAL** | K8s main docs (ref [8]) use "control loop" / "desired vs current state" language but do NOT explicitly say "level-triggered" or "idempotent" on that page. The level-triggered terminology carries through secondary sources (HackerNoon [12], Chainguard [13]) which I could not re-fetch this pass (HackerNoon 403). The operational claim is correct community knowledge; the citation to [8] for that exact phrasing is **weak**. G1 should down-weight [8] and lean harder on [12][13] or add Kubebuilder docs as primary. |
| P3 | rustc stage2/stage3 byte-identical fixpoint test | [15] rustc-dev-guide | **CONFLICTED** | Multiple issues: (a) Official rustc-dev-guide says "Stage 3 is optional. To sanity check our new compiler, we can build the **libraries** with the stage2 compiler. The result ought to be identical to before" — libraries, not compiler executables, and "ought to be" not "must be." (b) G1 line 141 quotes "If stage1 and stage2 produce identical executables, then they behave identically" — this quote attributes stage1↔stage2 identity, not stage2↔stage3 as G1's framing requires. (c) Web search confirms "rustc 1.54.0 from git does not produce identical stage2 and stage3 build artifacts" — the byte-identity is aspirational, reproducibility issues routinely break it in practice. G1's conceptual framing (self-hosting fixpoint) is correct; the "strongest self-hosting acceptance signal the software world has" (line 141) is **overstated**. |
| P4 | Agent Contracts arXiv 2601.08815 exists, describes resource-bounded termination guards | [19] arxiv.org/html/2601.08815v3 | **VERIFIED** | Paper exists: "Agent Contracts: A Formal Framework for Resource-Bounded Autonomous AI Systems," Qing Ye & Jing Tan, COINE 2026 (co-located AAMAS 2026, Paphos). Abstract confirms resource-constraint / budget / temporal-boundary framing. Empirical claim: "90% token reduction with 525x lower variance in iterative workflows." Matches G1's usage. Note: G1's "$47K eleven-day recursive-clarification loop" anecdote (line 22, 165) is NOT visible in the paper abstract I could access — it may be inside the full PDF or may be a separate industry anecdote conflated with this citation. Flag for author spot-check. |

### Remaining claims (UNVERIFIABLE this pass — high-confidence from training)

| # | Claim | Verdict | Note |
|---|---|---|---|
| R1 | Knaster-Tarski: monotone f on complete lattice has complete-lattice fixed-point set [3] | UNVERIFIABLE | Standard result; matches training knowledge. Not re-fetched. |
| R2 | Scott / Kleene chain: lfp = sup{f^n(⊥)} [3][6] | UNVERIFIABLE | Standard domain theory; matches training. Not re-fetched. |
| R3 | Terraform post-apply 0-change idempotency [4][9] | UNVERIFIABLE | Widely-known Terraform property. Not re-fetched. |
| R4 | Terratest idempotent pattern [10] | UNVERIFIABLE | Matches known Terratest best-practice. Not re-fetched. |
| R5 | Kubebuilder reconciliation loop [11] | UNVERIFIABLE | Standard Kubebuilder framing. Not re-fetched. |
| R6 | Chainguard "Principle of Reconciliation" quote [13] | UNVERIFIABLE | Quote plausible, source live; not re-fetched this pass. |
| R7 | GHC bootstrap ladder (Debian wiki + Breitner) [14][16] | UNVERIFIABLE | Matches GHC bootstrapping common knowledge. Not re-fetched. |
| R8 | Thompson "Trusting Trust" 1984 Turing Award lecture [17] | UNVERIFIABLE | Canonical, universally cited. Not re-fetched. |
| R9 | Wheeler DDC (Diverse Double-Compiling) ACSAC 2005 [18] | UNVERIFIABLE | Standard DDC reference. Not re-fetched. |
| R10 | Circuit-breakers-for-AI-swarms blog [20] | UNVERIFIABLE | Third-party blog; not critical load-bearing. Not re-fetched. |
| R11 | Nix reproducibility [21][22] | UNVERIFIABLE | Matches Nix canonical framing. Not re-fetched. |
| R12 | Reproducible Builds Debian wiki [23] | UNVERIFIABLE | Matches known project. Not re-fetched. |
| R13 | ADK Loop agents [24] | UNVERIFIABLE | Google ADK doc, plausible. Not re-fetched. |
| R14 | AWS evaluator reflect-refine loops [25] | UNVERIFIABLE | AWS Prescriptive Guidance, plausible. Not re-fetched. |
| R15 | Kildall 1973 POPL original citation [1] | UNVERIFIABLE | Referenced through Wikipedia; Wikipedia itself is VERIFIED (P1). |
| R16 | Kam-Ullman 1977 Acta Informatica [2] | UNVERIFIABLE | Paper exists; DOI live; exact convergence bound not re-checked. |
| R17 | Horwitz CS704 notes [5] | UNVERIFIABLE | U. Wisconsin course notes; plausible. Not re-fetched. |
| R18 | MIT OCW 6.820 Lecture 17 [6] | UNVERIFIABLE | Standard MIT OCW course; plausible. Not re-fetched. |
| R19 | Platzer CMU compilers notes [7] | UNVERIFIABLE | Plausible; not re-fetched. |
| R20 | HashiCorp Issue #35534 [4] | UNVERIFIABLE | GitHub issue, plausible; not re-fetched. |
| R21 | Bowes HackerNoon 2017 [12] | UNVERIFIABLE | WebFetch returned 403; content accessible via cache historically. Rely on community consensus that article exists and matches. |

Standard note: R1–R21 are high-confidence from training data and from the G1
gap-pursuer agent's own reports, but have **not been independently
re-verified in this pass** per the stated verification budget.

---

## Cross-claim consistency findings

### Inconsistency #1 (HIGH): A5 depends on deferred-to-v1.1 C6

**G1 A5 (line 219-221):** "Self-dogfood criterion C6 (round-trip) is the
`/migration` analogue of rustc stage2-matches-stage3 byte-equality."

**Conflict:** `dispute-resolutions-arch.md` (line 22, 26, 133, 145, 146, 231)
decisively **reframes D16 to v1.1**, and RESEARCH_OUTPUT.md line 291 sets the
v1 acceptance bar to "**C1 + C2 only** (forward-direction: produce plan +
execute plan targeting SoNash). C3-C7 deferred to v1.1."

C6 does not exist as a v1 acceptance gate. G1's A5 is therefore **a v1.1
commitment masquerading as a v1 recommendation**. The stage2-fixpoint frame
is correct architecturally but cannot be operationalised until v1.1 when
direction=in lands.

**Proposed adjustment:** Re-tag A5 as **v1.1** explicitly. Leave the framing
(C6 ≡ stage2 fixpoint, C8 for `/migration` self-porting) intact — it's a
good target — but move it out of v1 scope. Note this alongside A5 in
G1-loop-control.md.

### Inconsistency #2 (HIGH): A8 self-audit byte-identity test presumes round-trip

**G1 A8 (line 231-233):** "`scripts/skills/migration/self-audit.js` adds a
test that runs `/migration --plan` twice on frozen fixture and asserts
byte-identity."

**Partial conflict:** Re-running `/migration --plan` twice on the **same**
source-SHA is the *zero-drift / idempotency* test (C7-adjacent, I1 in G1's
own contract), not the *round-trip* test. As a **forward-direction-only**
idempotency check this is v1-feasible. The risk is that a future reader
conflates A8 with A5's round-trip stage2-fixpoint — they are distinct tests.

**Proposed adjustment:** Rename A8 to make forward-direction-only clear:
"Plan-stability self-audit (I1 test): run `/migration --plan` twice on same
(source-SHA, dest-SHA), assert byte-identity." Explicitly separate from A5
which is round-trip / bidirectional.

### Inconsistency #3 (MEDIUM): Finite-height lattice vs. append-only practice

**G1 claim (lines 45-47):** Finite height requires "closed ontology of
decision kinds," "closed source registry," "bounded plan surface."

**Tension:** In practice, the source registry for `/migration` is *not*
closed — every new research pass can cite new URLs. The decision registry
also grows as new D-numbers are minted. G1 acknowledges this (A3 ontology
bump), but the formal finite-height property only holds if **decision
kinds** (the tagged enum) are closed — the **decision instances** (D1, D2,
..., Dn) can grow unboundedly, they're just drawn from a finite tag set.

This is actually consistent with Kildall if you view the lattice element as
a SET of decisions (each drawn from a finite kind-set) — set inclusion gives
monotone growth, and the set is bounded *per-invocation* by depth limit L1.
**So the formal framing works**, but the G1 text elides the distinction
between "kind" (finite) and "instance" (unbounded-in-principle-but-bounded-by-L1).

**Proposed adjustment:** Add one sentence to §"Fixed-point semantics"
clarifying: "Finite height applies to the **decision-kind ontology** (closed
enum, A3); the instance set per run is bounded by the depth limit L1 (A6),
which is the engineering backstop when kind-closure is violated or when the
ontology ontology-bumps mid-run."

### Inconsistency #4 (LOW): L1 "max 3 cycles" vs. Kildall O(height × |nodes|)

**G1 A6 L1 (line 172):** "Max 3 brainstorm→research→plan cycles per
`/migration` invocation."

**Check:** Kildall's bound is O(height × |nodes|), where height is lattice
height and |nodes| is CFG size. For `/migration`, height ≈ max-decision-depth
(how many supersede pointers can chain), |nodes| ≈ decision count. "3" is a
**heuristic**, not derived from the lattice geometry. That's fine — G1 notes
L1 is "an engineering safety net for when the monotone-lattice invariant is
violated" (line 181) — but the juxtaposition of "3" next to Kildall's formal
bound can read as if 3 is mathematically motivated.

**Proposed adjustment:** In A6 L1, add: "'3' is an engineering heuristic, not
a Kildall-derived bound; the true mathematical bound is O(height × |nodes|)
on the decision lattice, which for realistic `/migration` runs is likely in
the dozens."

### Consistency wins (no issues)

- **A1 I1-I5 idempotency contract** ↔ K8s/Terraform precedent: coherent.
- **A2 append-only ledger** ↔ D11 meta-ledger / Kildall monotonicity: coherent.
- **A3 closed ontology** ↔ Kildall finite-height: coherent (modulo #3 above).
- **A4 level-triggered Phase 5** ↔ K8s reconciler: coherent (modulo P2 citation weakness).
- **A6 5-layer guards** ↔ Agent Contracts: coherent.
- **A7 reproducible derivation** ↔ Nix: coherent.

---

## Confidence adjustments for G1 recommendations

| Rec | G1 claimed confidence (implicit) | Adjusted | Reason |
|---|---|---|---|
| A1 | HIGH | **HIGH** (unchanged) | Idempotency contract is sound; precedents (K8s, Terraform) well-established. |
| A2 | HIGH | **HIGH** (unchanged) | Append-only = monotone is mathematically correct (P1 VERIFIED). |
| A3 | HIGH | **MEDIUM-HIGH** | Correct in kind-vs-instance distinction once clarified (see inconsistency #3). |
| A4 | HIGH | **MEDIUM-HIGH** | Operationally correct but primary K8s docs citation is weak (P2 PARTIAL); re-cite via Kubebuilder/Chainguard. |
| A5 | HIGH (v1) | **HIGH (v1.1 only)** | Re-tag as v1.1; C6 is deferred per dispute-resolutions-arch. Stage2-fixpoint quote (P3) is **overstated** — rustc byte-identity is aspirational, routinely broken. Soften line 141 from "the strongest self-hosting acceptance signal the software world has" to "one of the strongest self-hosting acceptance signals, though in practice rustc stage2/stage3 byte-identity is fragile and often fails for reproducibility reasons." |
| A6 | HIGH | **HIGH** (unchanged) | Agent Contracts paper verified (P4); 5-layer framing is sound. Minor note on L1 heuristic (#4). |
| A7 | MEDIUM-HIGH | **MEDIUM-HIGH** (unchanged) | Nix derivation framing well-supported. |
| A8 | HIGH | **MEDIUM-HIGH** | Rename for clarity to disambiguate from A5 round-trip (see inconsistency #2). |

**Net effect on G1 bottom line:** The 8 recommendations are fundamentally
sound; A5 and A8 need scope-tagging; A3 needs a one-sentence clarification;
A5 needs one quote softened. No recommendation is refuted; no recommendation
is unviable.

---

## Proposed edits to G1-loop-control.md (concrete)

1. **Line 141** — soften: change "A passing stage2 fixpoint test is the
   strongest self-hosting acceptance signal the software world has." to
   "A passing stage2 fixpoint test is among the strongest self-hosting
   acceptance signals, though in practice rustc stage2/stage3 byte-identity
   has historically been fragile (reproducibility breaks routinely surface
   non-determinism in the compiler); the property is aspirational, not
   always empirically achieved."

2. **Line 147 (C6 as stage2-fixpoint)** — add scope marker: "C6 (round-trip)
   — **DEFERRED TO v1.1 per dispute-resolutions-arch Dispute 2; v1 ships
   forward-only** — is the `/migration` analogue of rustc stage2 fixpoint."

3. **Line 219-221 (A5)** — add one-line v1.1 tag at the top of A5: "**Scope:
   v1.1 (not v1).** Self-dogfood criterion C6 (round-trip) is deferred per
   D16 reframe; A5 operationalises for v1.1 kickoff."

4. **Line 231-233 (A8)** — rename and clarify: "**A8. Plan-stability
   self-audit (forward-direction I1 test).** `scripts/skills/migration/
   self-audit.js` runs `/migration --plan` twice on frozen (source-SHA,
   dest-SHA) fixture and asserts byte-identity of generated PLAN.md. This
   is the v1-feasible zero-drift idempotency check (C7-adjacent) and is
   distinct from A5's round-trip stage2-fixpoint (v1.1)."

5. **After line 47 (§Fixed-point semantics, end of 'Finite height' para)** —
   one-sentence clarification: "Note: finite height applies to the
   **decision-kind ontology** (closed enum per A3); the decision-instance
   set grows per invocation but is bounded by the depth limit L1 (A6), which
   is the engineering backstop if kind-closure is violated or the ontology
   bumps mid-run."

6. **Line 172 (A6 L1)** — short footnote: "('3' is an engineering heuristic,
   not a Kildall-derived bound; Kildall's formal bound is O(height × |nodes|)
   on the decision lattice — realistically in the dozens for `/migration`.)"

7. **Line 248 (K8s ref [8])** — weaken its role: "[8] Kubernetes
   documentation — **background context; level-triggered / idempotent
   terminology carried by secondary sources [12][13]**."

---

## Scoring summary (for handoff)

- **Claims verified (full web re-check):** 4 priority claims (P1-P4)
- **Claims unverifiable this pass:** 21 (R1-R21), flagged with standard note
- **Verdict distribution:**
  - VERIFIED: 2 (P1 Kildall, P4 Agent Contracts)
  - PARTIAL: 1 (P2 K8s level-triggered — correct, citation weak)
  - CONFLICTED: 1 (P3 rustc stage2 byte-identity — overstated)
  - REFUTED: 0
  - UNVERIFIABLE: 21
- **Cross-claim inconsistencies:** 4 (1× HIGH A5↔D16-reframe, 1× HIGH A8↔A5
  disambiguation, 1× MEDIUM kind-vs-instance, 1× LOW L1 heuristic framing)
- **Recommendations adjusted:** 3 of 8 (A3 clarify, A5 re-tag + soften, A8
  rename) — remaining 5 unchanged
- **Recommendations refuted:** 0

G1's bottom-line position — that `/migration` can be given a real
mathematical convergence proof via Kildall + append-only ledger + closed
ontology, and a layered termination stack via Agent Contracts — **holds up
under this spot-check**. The v1-vs-v1.1 scoping is the main deliverable of
this verification pass.

---

*Persistence safety net: file size exceeds 1KB after write.*
