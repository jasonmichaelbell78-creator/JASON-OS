# D10 — Self-dogfood concrete success criteria

**Agent:** D10-self-dogfood
**Sub-question:** SQ-D10 — what does "successful self-dogfood" observably mean
for `/migration` run on `/migration`?
**Depth:** L1
**Date:** 2026-04-21

---

## Summary

Self-dogfood for `/migration` is not one check — it is a stacked set of
observable properties. The brainstorm's three candidate criteria (produces
own plan, plan executes cleanly, ported result is structurally identical)
are necessary but insufficient: they cover the "forward" direction only.
D16 commits to both-direction-from-v1, which implies the dogfood bar MUST
also exercise `out` direction (JASON-OS → SoNash) and — most valuably — a
**round-trip** property (JASON-OS → SoNash → JASON-OS) that functions as
the analogue of rustc's stage2-matches-stage1 compiler-fixpoint test.

Recommendation:

- **7 criteria total** (3 from brainstorm, operationalized; 4 new).
- **Round-trip property: INCLUDE** as MUST for v1 acceptance. It is the
  single strongest signal that both directions work symmetrically, and it
  is the canonical self-hosting acceptance test (rustc stage2 fixpoint,
  terraform `apply` → `plan` = 0 changes).
- **Zero-drift property: INCLUDE** as MUST — a second `/migration` run on
  unchanged source must produce an empty-diff `MIGRATION_PLAN.md`
  (every unit `copy-as-is` or `skip`, no `sanitize/reshape/rewrite`).
  This is the idempotency test directly borrowed from terraform.
- **Test-suite shape: (i) manual-walkthrough-with-assertions now,
  (ii) fixture-based automated harness as v1.1.** JASON-OS v0 has
  `scripts/` but no full test infra; a fixture harness is achievable but
  not v1-critical.
- **Milestone: v1 acceptance bar = criteria 1-5 + round-trip (6).
  Zero-drift (7) and full CI harness deferred to v1.1.** Back-direction
  working is a *consequence* of round-trip passing, which is why the
  round-trip property is the elegant single gate for D16 both-direction
  symmetry.

---

## 1. Concrete criteria list (7 numbered, each with observable check)

### C1 — Produces own `MIGRATION_PLAN.md` targeting SoNash *(brainstorm a)*

**Observable check:**

- Run `/migration` from JASON-OS with `direction=out`,
  `other-endpoint=<sonash path>`, `unit=concept`, target
  `.claude/skills/migration/` (the skill's own tree).
- Assert: file
  `C:\Users\jbell\.local\bin\JASON-OS\.research\migration-skill\MIGRATION_PLAN.md`
  exists, is non-empty, has all seven phases represented in its
  structure, contains at minimum N verdicts where N ≥ count of files in
  `.claude/skills/migration/`, and every verdict ∈ D23 legend
  (`copy-as-is | sanitize | reshape | rewrite | skip | blocked-on-prereq`).
- Pass criteria: schema-valid plan artifact; no `blocked-on-prereq` on
  CAS / `/sync` (they must be ported before this test runs, per §6 of
  BRAINSTORM.md).

### C2 — Resulting plan executes cleanly in SoNash *(brainstorm b)*

**Observable check:**

- In plan-export mode (D26), the produced `MIGRATION_PLAN.md` is copied to
  SoNash and invoked there.
- Assert:
  - Every gate confirms-or-defers without throwing;
  - Zero `sanitize-error.cjs` violations in the transformed files;
  - Pre-commit passes in SoNash on the resulting branch;
  - No file written outside declared destination paths (auditable via
    `git status` scope check).

### C3 — Ported `/migration` in SoNash produces structurally identical results *(brainstorm c)*

**Observable check:**

- Run the *ported-into-SoNash* `/migration` against a fixed test fixture
  (e.g. migrating a small skill from JASON-OS → SoNash).
- Run the *original JASON-OS* `/migration` against the same fixture.
- Diff the two resulting `MIGRATION_PLAN.md` artifacts modulo:
  - absolute-path prefixes,
  - timestamps,
  - UUIDs / state-file ids.
- Assert: structural diff is empty (same phase sequence, same verdicts
  per unit, same gate count, same ripple set). "Structurally identical" =
  identical AST of the plan, not byte-identical text.

### C4 *(new)* — Back-direction works: SoNash → JASON-OS *(implied by D16)*

**Observable check:**

- Per D16, "full both-direction build from v1." Self-dogfood must
  exercise `direction=in` independently (not only `out`).
- Run `/migration direction=in other-endpoint=<sonash>` picking a known
  unit (e.g. CAS `scripts/cas/` — one of the known blockers per §6).
- Assert: produces a plan that, when executed, results in a JASON-OS
  tree where the ported unit passes JASON-OS's own structural checks
  (skill frontmatter, size, cross-refs — per skill-audit JASON-OS scope
  note).

### C5 *(new)* — Gate-memory resume survives a mid-flow compaction

**Observable check:**

- Midway through a `/migration` run (after Phase 2, before Phase 5),
  simulate compaction: clear conversation context, re-invoke
  `/migration`.
- Assert (per D22 / R3): state file at
  `.claude/state/task-migration-<slug>.state.json` surfaces prior
  decisions, but confirmation is re-required at each gate. No silent
  continuation.
- This is a dogfood criterion because `/migration` is by design a
  long-running, multi-gate skill; compaction-resilience is a first-class
  quality bar (cf. skill-audit §Compaction Resilience).

### C6 *(new, MUST for v1)* — Round-trip property: A → B → A' yields A' ≡ A

**Observable check:**

- Let `A` = the JASON-OS `/migration` skill tree at commit `rev-A`.
- Run `/migration out` to migrate `A` into SoNash → produces `B`
  (SoNash-resident form).
- Run `/migration in` on SoNash's `B` back into a scratch JASON-OS
  worktree → produces `A'`.
- Assert: `A' ≡ A` structurally (same files, same frontmatter fields,
  same gate sequences; sanitize diffs modulo the transformation rules
  that are defined as reversible).
- Rationale: this is the **rustc stage2 fixpoint** analogue — "libraries
  built with the stage2 compiler ought to be identical to before, unless
  something has broken" ([rustc-dev-guide][rustc]). It is the single
  strongest evidence that both directions are symmetric. Failing this
  test reveals a silent one-way transformation (e.g. a sanitize rule
  with no inverse, a reshape that hard-codes a destination idiom into
  content).

**Caveat:** not every transformation is reversible. Sanitize that
redacts a real credential → can't restore the credential. So
round-trip is run on a fixture set chosen for reversibility
(skill files, configs with no secrets). This is analogous to how
terraform's "apply then plan = 0 changes" ([terratest][tt]) is run on
deterministic resources, not ones with drift-by-design.

### C7 *(new, SHOULD for v1, MUST for v1.1)* — Zero-drift property: re-run on unchanged source is a no-op

**Observable check:**

- After a completed `/migration` run, immediately re-run it on the
  unchanged source.
- Assert: the second pass produces a `MIGRATION_PLAN.md` with verdicts
  ∈ `{copy-as-is, skip}` for every unit, and Phase 5 (Execute) writes
  zero bytes to the destination (or dry-run reports a zero-diff).
- This is the direct idempotency test — `terraform apply; terraform
  plan` = 0 changes ([terratest idempotent][tt], [hashicorp #35534][tf]).

---

## 2. Round-trip + zero-drift property proposals

| Property    | Status | Analogy                                              | V1 bar? |
| ----------- | ------ | ---------------------------------------------------- | ------- |
| Round-trip  | **INCLUDE** | rustc stage2-fixpoint; nix eval-reproducibility | MUST |
| Zero-drift  | **INCLUDE** | terraform `apply; plan = 0 changes`             | SHOULD in v1, MUST in v1.1 |

Both are properties, not decisions — they compose with the seven-phase
arc cleanly because they're assertions on the *output artifacts* (plan +
executed tree), not new phases.

Round-trip is the **cheaper-than-it-looks** test because D18 locks
JASON-OS as workshop regardless of direction: both runs happen from
here, plan state lives here, so the round-trip harness is just two
`/migration` invocations + one git diff. No cross-machine coordination.

---

## 3. Test-suite shape recommendation for v0 JASON-OS

JASON-OS v0 has:

- `scripts/` with `scripts/lib/` helpers (sanitize-error, safe-fs,
  security-helpers) per CLAUDE.md §2.
- Husky + pre-commit (gitleaks-only currently).
- CI workflows (Semgrep, CodeQL, SonarCloud, Qodo) per CLAUDE.md §2.
- No test runner / no fixture harness yet for skills.

### Recommended shape: (i) manual walkthrough now, (ii) fixture harness v1.1

**Phase 1 (v1 acceptance — manual walkthrough with specific assertions):**

- Operator runs `/migration` on `/migration` per C1–C6.
- Assertions from §1 above are checked interactively at Phase 6 Prove
  gates — `/migration` Phase 6 is "embedded convergence-loop
  verification" per §2 of BRAINSTORM.md, which is the natural host for
  these checks.
- Results recorded in a dogfood-run log under
  `.research/migration-skill/dogfood-runs/<date>.md`.
- **Why not automated yet:** writing a robust harness requires a
  fixture set (small, reversible unit candidates), a diff tool that
  normalizes paths/timestamps, and an invocation mode that runs
  `/migration` without interactive gates (either a `--ci` flag or a
  recorded-script replay). None of those exist.

**Phase 2 (v1.1 — automated fixture harness):**

- Introduce `scripts/skills/migration/dogfood.js` that:
  1. Prepares a fixture directory (copy of a sanitized mini-skill).
  2. Invokes `/migration` in a non-interactive test mode
     (needs C8-level decision: CI mode for an inherently
     confirm-gated skill — likely "auto-confirm copy-as-is/skip,
     fail on sanitize/reshape/rewrite" for CI).
  3. Runs the round-trip (C6) + zero-drift (C7) checks deterministically.
  4. Exits non-zero on any structural mismatch.
- Wire into CI as a separate workflow (not pre-commit — runtime is too
  long).
- This is NOT v1-critical because v1 has the manual walkthrough as the
  acceptance gate.

**Phase 3 (v1.2+ — CI-gated):**

- Fixture harness becomes required-check on PRs touching
  `.claude/skills/migration/**` or `scripts/skills/migration/**`.
- Optional cross-repo harness: checkout a SoNash fixture as a submodule
  or `.claude/fixtures/sonash-mini/` for the in-direction test.

---

## 4. Precedent catalog

| System       | Dogfood shape                                              | Lesson for `/migration`                                                                                                        |
| ------------ | ---------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| **rustc**    | 3-stage bootstrap (stage0 → stage1 → stage2), assert "libraries built with stage2 identical to before" ([rustc-dev-guide][rustc]) | The stage2 fixpoint = our round-trip (C6). Different stages catch different bug classes: stage1 = "compiles at all"; stage2 = "semantically preserving."                  |
| **terraform**| `apply` then `plan` asserts zero-changes; Terratest codifies this as idempotency test ([terratest][tt], [hashicorp #35534][tf]) | Direct template for zero-drift (C7). The idempotency test is cheap and catches the "reshape that's not a fixed point" bug.  |
| **go compiler** | Self-hosted since Go 1.5; bootstrapped from prior Go version. Assert: compiler compiles itself; produced compiler compiles the same source to identical binaries. | Reinforces round-trip as canonical. Also: allows *prior* version to bootstrap — parallel to "the previous `/migration` can still plan the new `/migration`," useful as a backwards-compat check past v1. |
| **nix / nixpkgs** | Nixpkgs is expressed in Nix; Nix evaluates Nixpkgs. Reproducibility property: same inputs → same outputs, bit-identical.         | Round-trip + reproducibility. Our equivalent: same source tree + same flag set → same `MIGRATION_PLAN.md` every time. That's a stricter form of zero-drift. |
| **home-manager** | Configuration-of-user-env tool that can manage its own install; idempotent rebuilds.                                               | Dogfood as "the tool manages itself end-to-end, not just parts." → /migration should be able to migrate its own state files, hooks, scripts — not just SKILL.md.          |
| **skill-audit** (in-house) | Has a Phase 5 self-audit: re-reads all modified files, grep-based evidence, diff-based mapping (SKILL.md lines 436-519).              | Exact template for `/migration`'s Phase 6 Prove. Grep + diff over the plan's declared outputs is deterministic and avoids the "LLM re-interpreting its own output" echo problem. |
| **dogfooding (general)** | "Proactive resolution of potential inconsistency and dependency issues" ([wikipedia][wk], [herocoders][hc]) | Dogfood's real value is discovering design drift during build, not just end-gate acceptance. Apply by running `/migration` on `/migration` *while building it*, not only at v1 cut. |

### Applied lessons

1. **Multi-stage, not single-pass.** Like rustc: C1/C2 is stage1
   (compiles at all); C3 is stage2 (semantically identical output); C6
   is the fixpoint (re-compiling with stage2 produces stage2).
2. **Fixpoint as the symmetry gate.** Don't separately test both
   directions; one round-trip test covers both, and its failure mode is
   more informative than a one-directional pass.
3. **Determinism as a pre-condition.** Zero-drift and round-trip both
   require that `/migration` produces deterministic output given the
   same inputs. This may force a design decision: strip timestamps /
   stable-sort ripple lists / normalize paths in the plan artifact.
4. **Dogfood mid-build, not only at cut.** Per general-dogfooding
   sources, run `/migration` on `/migration` after each major gate
   design lands — not just at v1 acceptance.

---

## 5. Milestone recommendation

### v1 acceptance bar (MUST pass all of):

- **C1** — produces own plan
- **C2** — plan executes cleanly in SoNash
- **C3** — ported result structurally identical
- **C4** — back-direction (in) works on one known fixture
- **C5** — compaction resume works
- **C6** — round-trip property holds on a reversible fixture

**Rationale on back-direction vs. round-trip:** D16 commits
both-direction-first-class. C4 proves back-direction on a fixture; C6
proves symmetry across the whole pipeline. Together they discharge
D16's self-dogfood-as-test (not design-crutch) intent. One without the
other leaves a gap: C4 alone could pass with subtle directional drift;
C6 alone could pass on a fixture that happens to be identity-preserving
by accident.

### v1.1 bar:

- **C7** — zero-drift / idempotency on re-run
- Automated fixture harness (§3 Phase 2)

### v1.2+ bar:

- CI-gated harness on PRs touching the skill tree
- Cross-repo fixture (real SoNash mini)

### On "does self-dogfood imply back-direction works?"

**Yes — but only if round-trip (C6) is in the v1 bar, not just
forward-direction (C1–C3).** The brainstorm's three candidate criteria
are forward-only. Adding C6 is what makes self-dogfood the honest test
of D16's both-direction-first-class commitment. Without C6, v1 can ship
a skill that passes "its own dogfood" while silently being 90%
one-directional.

---

## 6. Sources

- [rustc-dev-guide — What Bootstrapping does][rustc]
- [rust-lang/rust src/bootstrap/README.md][rustc-readme]
- [Terratest — Idempotent testing best practices][tt]
- [hashicorp/terraform issue #35534 — idempotency test exposure][tf]
- [Eating your own dog food — Wikipedia][wk]
- [Dogfooding in software development — herocoders][hc]
- In-repo: `C:\Users\jbell\.local\bin\JASON-OS\.research\migration-skill\BRAINSTORM.md` §2, §3 D16 / D22 / D23 / D24, §5 Q10, §6
- In-repo: `C:\Users\jbell\.local\bin\JASON-OS\.claude\skills\skill-audit\SKILL.md` Phase 5 (self-audit precedent, lines 436-519)
- In-repo: `C:\Users\jbell\.local\bin\JASON-OS\CLAUDE.md` §1 (stack), §2 (scripts/lib + CI pipeline)

[rustc]: https://rustc-dev-guide.rust-lang.org/building/bootstrapping/what-bootstrapping-does.html
[rustc-readme]: https://github.com/rust-lang/rust/blob/main/src/bootstrap/README.md
[tt]: https://terratest.gruntwork.io/docs/testing-best-practices/idempotent/
[tf]: https://github.com/hashicorp/terraform/issues/35534
[wk]: https://en.wikipedia.org/wiki/Eating_your_own_dog_food
[hc]: https://www.herocoders.com/blog/dogfooding-in-software-development-eat-your-own-code
