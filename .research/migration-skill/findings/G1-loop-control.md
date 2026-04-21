# GAP — G1-loop-control-protocol

**Persona:** Phase 3.95 gap-pursuer G1 (`deep-research-gap-pursuer`)
**Gap:** Loop-control protocol for iterative brainstorm→research→plan skills.
**Sub-question:** What loop-control primitives should `/migration` (and the brainstorm/deep-research/deep-plan triad) adopt to ensure multi-iteration coherence AND termination?
**Depth:** L1 (web + docs, URL + date per claim).
**Date:** 2026-04-21.

---

## Summary

OTB Challenge surfaced D28 ("re-entry as norm, not exception") — the brainstorm↔research↔plan triad is a **loop**, not a pipeline. Current research adds a META-LEDGER (D11 / C-124) that tracks decisions but says nothing about **whether the loop converges, terminates, or oscillates**. That is a structural gap: a loop without a fixed-point theory is a liveness bug waiting to happen.

Six precedent bodies supply ready-to-port primitives:

1. **Kildall / monotone dataflow** — loops converge iff the state lattice is monotone + finite height. Gives `/migration` a proof obligation: each iteration must only **add** decisions (monotone) drawn from a bounded space (finite height).
2. **Knaster-Tarski / Scott domain theory** — fixed points exist for monotone functions on complete lattices; `/migration`'s output space can be framed as such a lattice.
3. **Kubernetes controller loops** — level-triggered reconciliation against desired state, idempotent `Reconcile()`, with explicit requeue back-off. Directly maps to Phase 5 (converge to dest state).
4. **Nix / reproducible builds** — pure-functional derivation + content-hash keyed outputs give byte-identical rebuilds. Supplies the "same input → same output" half of the idempotency contract.
5. **GHC / rustc stage2 fixpoint** — stage2 = stage1(stage1-source). If stage1 ≡ stage2 (byte equal), the compiler has reached a bootstrap fixpoint. This IS the D10 self-dogfood test, formalised.
6. **Agent-contracts / bounded recursion** — multi-layered termination guards (depth, iterations, budget, timeout, circuit breaker). $47K eleven-day recursive-clarification loop precedent is the cautionary tale.

**8 concrete additions** to `/migration` design follow at the bottom. Core contract in one sentence: **`/migration` is idempotent iff, for any unchanged (source-commit, dest-commit, plan-id) triple, a second end-to-end run produces a zero-step plan, mutates no files, emits no new LEDGER rows, and leaves the ITERATION_LEDGER decisions set unchanged.**

---

## Fixed-point semantics for /migration

### The state lattice

Treat the triad's shared state as a lattice `(S, ≤)` where `S` = the set of ITERATION_LEDGER states (decision sets D1..Dn, claims C1..Cm, verdicts, sources). Order `s₁ ≤ s₂` iff every decision/claim in `s₁` is present (with compatible content) in `s₂`. The bottom element ⊥ is the empty ledger; joining two states unions their decision sets, with conflict resolution producing a refined (more specific) decision.

Each skill invocation is a transition function:

- `F_brainstorm : S → S` (adds decisions / open questions)
- `F_research : S → S` (adds claims, sources, verdicts)
- `F_plan : S → S` (adds tasks, acceptance criteria, cross-references)

**Convergence theorem (Kildall/Kam-Ullman 1976, Wikipedia Data-flow analysis 2026-04-21 [1][2]):** An iterative process converges to a fixed point iff the transition functions are **monotone** (never remove information) on a lattice of **finite height** (no infinitely-ascending chain of states). [2][5][7]

Applied to `/migration`:

- **Monotonicity:** Skill re-entries must only **add or refine** decisions; never silently drop them. Contradiction handling goes through an explicit SUPERSEDES pointer (D11 meta-ledger already mandates this shape).
- **Finite height:** The decision space must be bounded. In practice this means: (a) closed ontology of decision kinds (`D` numbers drawn from a finite tagged enum), (b) closed source registry (each claim cites a finite source set), (c) bounded plan surface (Phase 0-7 is fixed; unit-types are enumerable).

If either condition breaks (a decision reappears with different content under the same ID; the source set grows without bound as sources-of-sources are chased), the loop can ascend forever. **Kildall's result is the formal ammunition behind the D11 append-only ledger recommendation** — append-only is what makes the transition monotone.

### Knaster-Tarski extension

For monotone `f: L → L` on a complete lattice, the set of fixed points is itself a complete lattice, so a **least** fixed point exists (Knaster-Tarski, Wikipedia 2026-04-21 [3]). Scott extended this to Scott-continuous functions on complete partial orders; the least fixed point is `sup{f^n(⊥) | n ∈ ℕ}` — the Kleene chain [3][6].

For `/migration` this is the right conceptual frame: the "ideal plan" for a given (source, dest) pair is the **least fixed point** of iterated brainstorm∘research∘plan, starting from ⊥ = empty ledger. The triad is an approximation scheme, and each re-entry is one step up the Kleene chain.

### When re-running produces the same output

A re-run produces the same output iff the current state is a fixed point of `F_brainstorm ∘ F_research ∘ F_plan`. Observable test: run `/migration` twice; if the second run's LEDGER rowcount delta is zero and its plan file is byte-identical, the loop has converged. This is the direct analogue of Terraform's "second apply = 0 changes" idempotency assertion (HashiCorp Issue #35534, 2024 [4]).

---

## Idempotency contract — proposed

### The 5-property contract

For `/migration` (and transitively for brainstorm/deep-research/deep-plan), idempotency means:

| # | Property | Observable test |
|---|---|---|
| I1 | **Plan stability** | Second `/migration --plan` on same (source-SHA, dest-SHA) produces byte-identical plan file |
| I2 | **Zero-delta mutations** | Second `/migration --apply` after successful first apply produces a zero-step verdict (no ops) |
| I3 | **Ledger stability** | Second run appends no new ITERATION_LEDGER rows (no new decisions, no re-decisions) |
| I4 | **Reproducible derivation** | Given pinned input SHAs + pinned tool versions, outputs are content-hash identical (Nix-style derivation) |
| I5 | **Level-triggered, not edge-triggered** | Behaviour depends on **current (source, dest, ledger) state**, not on which event triggered the run |

This is isomorphic to Kubernetes controller idempotency ("running the same reconciliation multiple times with the same input must produce the same result without side effects", Kubernetes docs 2026-04-21 [8]) and Terraform's post-apply no-op plan (HashiCorp Developer, 2024-2025 [9]).

### One-sentence contract

**`/migration` is idempotent iff, for any unchanged (source-commit, dest-commit, plan-id) triple, a second end-to-end run produces a zero-step plan, mutates no files, emits no new LEDGER rows, and leaves the ITERATION_LEDGER decisions set unchanged.**

### Test harness

Concrete acceptance tests follow Terratest's idempotent pattern ("run `terraform apply` twice in a row and confirm the second call has 0 resources to add/change/destroy", Terratest docs 2026-04-21 [10]):

```bash
/migration --source=A --dest=B --apply    # First run
SHA1=$(sha256sum PLAN.md)
/migration --source=A --dest=B --apply    # Second run
SHA2=$(sha256sum PLAN.md)
[ "$SHA1" = "$SHA2" ] && [ "$(plan.step_count)" = 0 ]  # Assert idempotent
```

This maps directly to CAS port acceptance C7 ("zero-drift: second run on unchanged source = empty plan") already present in RESEARCH_OUTPUT.md.

---

## K8s controller precedent application

Kubernetes controllers are the closest operational analogue to what `/migration` Phase 5 ("converge to dest state") needs to do. Four properties transfer directly [8][11][12][13]:

### 1. Level-triggered, not edge-triggered
> "Their reconciliation logic is level-based, not edge-triggered. The trigger is event-driven; the behavior is not." (HackerNoon/Bowes, 2017 [12])

**Implication for `/migration`:** When re-entering on the second iteration, do NOT read "what changed since last iteration" and dispatch on the diff. Instead, re-read the full current state (source tree, dest tree, ledger) and compute the full desired transformation. The ledger is a **log** of what happened, not an **input** to what to do next.

This matters because edge-triggered loops lose events (skipped runs → silent divergence), whereas level-triggered loops self-heal on the next pass.

### 2. Reconcile() must be idempotent
> "The golden rule: reconciliation must be idempotent and level-triggered. Your Reconcile() function should derive the desired state from the current world state, not from the event that triggered it." (HackerNoon 2017 [12])
> "A well-architected reconciler leans hard on idempotency: doing the same thing twice has the same effect as doing it once." (Chainguard, 2024-2025 [13])

This IS the idempotency contract above, with the added requirement that each **individual step** inside `/migration` (not just the end-to-end run) is idempotent. CAS-adjacent precedent: Ansible `done_when` guards, Alembic `op.create_index(if_not_exists=True)`.

### 3. Requeue with back-off on transient failure
K8s controllers return `ctrl.Result{Requeue: true, RequeueAfter: duration}` to defer. `/migration` equivalent: on transient failure (e.g., remote API rate-limit, file lock), don't fail the whole run — mark the step as `requeue` with a retry count and exit cleanly. The next `/migration` invocation picks up from the requeue marker.

### 4. Watch → queue → reconcile → requeue
The K8s pattern decouples *what triggered me* from *what I should do*. For `/migration`, this means:
- Triggers: explicit `/migration` invocation, `/migration-prove` drift detection, hook-detected source change
- Queue: pending-work list (Phase 2 findings not yet planned, Phase 4 steps not yet applied)
- Reconcile: Phases 0-7 reading current state
- Requeue: write back to queue on partial progress

This is materially the structure already implied by D8-failure-recovery's `.migration-state/` directory.

---

## Bootstrap fixpoint for self-dogfood

D10 (self-dogfood) is the acceptance bar that `/migration` must be able to port CAS onto itself. The formal structure is **identical** to GHC/rustc stage2 bootstrap [14][15][16]:

### The stage ladder

| Stage | GHC | rustc | /migration |
|---|---|---|---|
| Stage 0 | Installed "bootstrap compiler" | Prior rustc release | Pre-`/migration` manual ports (seed trio, /convergence-loop) |
| Stage 1 | First GHC built from source with Stage 0 | Built with Stage 0 | `/migration` v1 working but never self-applied |
| Stage 2 | GHC built with Stage 1; **this is what gets installed** | Built with Stage 1 in-tree | `/migration` v1 used to port CAS (self-dogfood pass 1) |
| Stage 3 | Optional; used to **test Stage 2 via fixpoint** | Rebuild with Stage 2 to verify byte-identity | `/migration` used **on itself** to re-port CAS (or to port `/migration` v2) |

**Fixpoint test (rustc dev guide 2026-04-21 [15]):** "If stage1 and stage2 produce identical executables, then they behave identically." Stage 3 exists solely to check Stage 2 ≡ Stage 3 byte-identity. **A passing stage2 fixpoint test is the strongest self-hosting acceptance signal the software world has.**

### Concrete acceptance for /migration D10

Extending the 7-criterion self-dogfood bar from RESEARCH_OUTPUT.md:

- **C6 (round-trip)** ≡ rustc stage2 fixpoint: `/migration(JASON-OS → SoNash)` followed by `/migration(SoNash → JASON-OS)` on pinned SHAs produces a PLAN with **zero steps** (or, if non-zero, only steps that commute to identity).
- **C7 (zero-drift)** ≡ Terraform `plan-after-apply = 0 changes`.
- **New C8 (self-port fixpoint):** `/migration` used to port `/migration` itself (version N → N+1 after cosmetic refactor) produces a PLAN whose application is byte-identical with a direct text-edit port. Only relevant once `/migration` v1.1+ exists.

### Trusting-trust note

Thompson's "Reflections on Trusting Trust" (1984) [17] warns that self-hosting hides backdoors: a malicious Stage 0 can produce a clean Stage 1 that still inserts the backdoor. For `/migration`, the analogue is: a buggy `/migration` v1 can produce a "clean-looking" ported CAS that still carries the original bug's fingerprint. **Mitigation precedent:** David A. Wheeler's Diverse Double-Compiling (DDC, ACSAC 2005 [18]) — rebuild with a second, independently-implemented compiler and check byte-identity. For `/migration`, the analogue is:

- Port CAS using `/migration` (primary path)
- Port CAS manually by a second operator (secondary path)
- Diff the two outputs — byte-identical = DDC-cleared.

This is probably overkill for v1 but belongs in the `/migration` v2 roadmap as "second-operator validation."

---

## Termination guarantees + budget primitives

Loops without termination guards burn money. The $47K eleven-day recursive-clarification loop (Agent Contracts, arXiv 2601.08815, 2026-02 [19]) is the cautionary tale. `/migration` needs **layered** termination, not a single guard [19][20]:

### The 5-layer guard stack (from Agent Contracts + bounded-recursion literature)

| Layer | Name | /migration setting | Rationale |
|---|---|---|---|
| L1 | **Depth limit** | Max 3 brainstorm→research→plan cycles per `/migration` invocation | Monotone-lattice finite-height analogue |
| L2 | **Iteration counter** | Max 50 sub-agent dispatches per phase | Protects against runaway sub-agent recursion |
| L3 | **Budget cap** | Max $X in model spend per `/migration` run (user-configurable, default $10) | Direct financial circuit breaker |
| L4 | **Wall-clock timeout** | Max 45min per phase, 4h per full run | Protects against stuck sub-processes |
| L5 | **Circuit breaker on repeated failure** | 3 consecutive failed verdicts on same step → halt + flag for human | Prevents retry storms |

These are not suggestions — they are **required** guards. Any one of them can halt the loop; all five must pass for completion.

### Kildall convergence IS a termination guarantee

When the state lattice is monotone + finite-height, termination is **proven**, not hoped for. So Layer L1 (depth limit) is really an engineering safety net for when the monotone-lattice invariant is violated. The order of trust is:

1. **Mathematical guarantee:** Lattice finite height + monotone transitions → convergence in O(height × |nodes|) iterations (Kildall 1973, Kam-Ullman 1977 [1][2]).
2. **Engineering guard rails:** Depth/iteration/budget/timeout as fail-safes if the math assumptions break.
3. **Escape hatch:** Human-in-the-loop on circuit-breaker trip.

### When /migration can be PROVED to terminate

`/migration` provably terminates iff:
1. The ITERATION_LEDGER is append-only (monotone).
2. The decision ontology is closed (finite set of D-kinds).
3. Each skill invocation is idempotent in the strict sense defined above (I1-I5).
4. The depth limit L1 caps outer-loop iterations.

Condition 1 is already in the D11 proposal. Condition 2 needs a small addition (the ontology file). Condition 3 is the new I1-I5 contract. Condition 4 is a new `--max-depth` flag.

---

## Concrete additions to /migration design

Eight additions, each traceable to a precedent above:

### A1. Idempotency contract I1-I5 codified in `/migration/SKILL.md`
Source: K8s reconciler rule [12][13]; Terraform 0-change apply [9][10].
Add a top-level "Idempotency contract" section asserting I1-I5 as invariants with the one-sentence contract quoted above.

### A2. Append-only monotone ITERATION_LEDGER (formalises D11)
Source: Kildall monotone-lattice convergence [1][2][5][7].
Upgrade D11's meta-ledger from "good idea" to "termination-proof prerequisite." Ledger rows are **never rewritten**; supersession uses explicit `supersedes: Dx` pointer.

### A3. Closed decision-kind ontology
Source: Finite-height lattice requirement [7].
Add `/migration/DECISION_KINDS.md` enumerating the tagged decision types (direction, scope, sequencing, acceptance, etc.). New kinds require explicit ontology bump, not silent creation.

### A4. Level-triggered Phase 5
Source: K8s level-vs-edge [12].
Phase 5 MUST re-read full current state each invocation; MUST NOT depend on "what changed since last Phase 5." Requeue markers in `.migration-state/` are progress logs, not inputs.

### A5. Stage2-fixpoint acceptance (extends C6, adds C8)
Source: GHC/rustc stage2 bootstrap [14][15][16].
Self-dogfood criterion C6 (round-trip) is the `/migration` analogue of rustc stage2-matches-stage3 byte-equality. Add C8 for v1.1 = "/migration ports /migration v_next" fixpoint test.

### A6. 5-layer termination guard stack
Source: Agent Contracts [19]; bounded-recursion 5-guardrail pattern [20].
Hard-code L1 (depth), L2 (iterations), L3 (budget), L4 (timeout), L5 (circuit breaker) as `/migration` config with sensible defaults. Budget cap ($10 default) is user-overridable via flag.

### A7. Reproducible-derivation framing for plan files
Source: Nix referential transparency [21][22]; Reproducible Builds project [23].
Plan files (PLAN.md) should carry a derivation header: `{source_sha, dest_sha, /migration_version, tool_versions, plan_hash}`. Two runs with identical headers MUST produce identical plan bodies (Nix derivation analogue). Byte-identity check is the trivial idempotency test.

### A8. Fixed-point acceptance test in self-audit
Source: Kleene chain / Knaster-Tarski [3].
`scripts/skills/migration/self-audit.js` adds a test that runs `/migration --plan` twice on frozen fixture and asserts byte-identity. This is the end-to-end operationalisation of the whole contract.

---

## Sources

Access date: 2026-04-21 for all URLs.

1. Kildall, G. "A Unified Approach to Global Program Optimization" (1973 POPL). Referenced in: "Data-flow analysis — Wikipedia." https://en.wikipedia.org/wiki/Data-flow_analysis
2. Kam, J. B. & Ullman, J. D. "Monotone data flow analysis frameworks," Acta Informatica (1977). https://link.springer.com/article/10.1007/BF00290339
3. "Knaster–Tarski theorem." Wikipedia. https://en.wikipedia.org/wiki/Knaster%E2%80%93Tarski_theorem
4. HashiCorp Terraform Issue #35534 "terraform test: consider exposing a way to ensure idempotency (no changes in plan)" (2024-2025). https://github.com/hashicorp/terraform/issues/35534
5. Horwitz, S. "Kildall's Lattice Framework for Dataflow Analysis." U. Wisconsin CS704 notes. https://pages.cs.wisc.edu/~horwitz/CS704-NOTES/DATAFLOW-AUX/lattice.html
6. MIT OCW 6.820 Lecture 17 "Dataflow Analysis, Lattices, Fixed Points" (Fall 2015). https://ocw.mit.edu/courses/6-820-fundamentals-of-program-analysis-fall-2015/4aae8677722746c91c8646d318e1c5e8_MIT6_820F15_L17.pdf
7. Platzer, A. "Compilers: Compiler Design Lecture Notes on Monotone Frameworks." CMU/LFCPS. https://lfcps.org/course/Compilers/27-monframework.pdf
8. "Controllers." Kubernetes documentation. https://kubernetes.io/docs/concepts/architecture/controller/
9. "Integrate Terraform with Ansible Automation Platform." HashiCorp Developer Validated Patterns. https://developer.hashicorp.com/validated-patterns/terraform/terraform-integrate-ansible-automation-platform
10. "Idempotent." Terratest testing best-practices. https://terratest.gruntwork.io/docs/testing-best-practices/idempotent/
11. "Reconciliation Loop." kubernetes-sigs/kubebuilder DeepWiki. https://deepwiki.com/kubernetes-sigs/kubebuilder/5.2-reconciliation-loop
12. Bowes, J. "Level Triggering and Reconciliation in Kubernetes." HackerNoon (2017, still canonical). https://hackernoon.com/level-triggering-and-reconciliation-in-kubernetes-1f17fe30333d
13. "The Principle of Reconciliation." Chainguard Unchained (2024-2025). https://www.chainguard.dev/unchained/the-principle-of-reconciliation
14. "PortsDocs/BootstrappingGHC." Debian Wiki. https://wiki.debian.org/PortsDocs/BootstrappingGHC
15. "What Bootstrapping does." Rust Compiler Development Guide. https://rustc-dev-guide.rust-lang.org/building/bootstrapping/what-bootstrapping-does.html
16. Breitner, J. "Thoughts on bootstrapping GHC." https://www.joachim-breitner.de/blog/748-Thoughts_on_bootstrapping_GHC
17. Thompson, K. "Reflections on Trusting Trust." ACM Turing Award lecture (1984). Summary: https://www.cesarsotovalero.net/blog/revisiting-ken-thompson-reflection-on-trusting-trust.html
18. Wheeler, D. A. "Fully Countering Trusting Trust through Diverse Double-Compiling" (ACSAC 2005; dissertation 2009). https://dwheeler.com/trusting-trust/
19. "Agent Contracts: A Formal Framework for Resource-Bounded Autonomous AI Systems." arXiv 2601.08815 (COINE/AAMAS 2026). https://arxiv.org/html/2601.08815v3
20. "Circuit Breakers for Autonomous AI Agent Swarms." aidevdayindia.org. https://aidevdayindia.org/blogs/agent-to-agent-a2a-communication-protocols/circuit-breakers-for-autonomous-ai-agent-swarms.html
21. "Reproducibility." Zero-to-Nix concepts. https://zero-to-nix.com/concepts/reproducibility/
22. Dolstra, E. "NixOS: A Purely Functional Linux Distribution." ICFP 2008. https://edolstra.github.io/pubs/nixos-icfp2008-submitted.pdf
23. "ReproducibleBuilds." Debian Wiki. https://wiki.debian.org/ReproducibleBuilds
24. "Loop agents." Google ADK documentation. https://google.github.io/adk-docs/agents/workflow-agents/loop-agents/
25. "Evaluator reflect-refine loop patterns." AWS Prescriptive Guidance. https://docs.aws.amazon.com/prescriptive-guidance/latest/agentic-ai-patterns/evaluator-reflect-refine-loop-patterns.html

---

*Persistence safety net passed: file size exceeds 1KB after write.*
