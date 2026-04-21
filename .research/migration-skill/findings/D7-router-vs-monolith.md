# D7-router-vs-monolith — findings

**Agent:** D7-router-vs-monolith (Phase 1 D-agent)
**Question:** SQ-D7c — Tradeoff analysis, monolithic `/migration` vs router + ancillaries
**Date:** 2026-04-21
**Source:** `.research/migration-skill/BRAINSTORM.md` §5 Q7, §2 (seven-phase arc), external precedent (dbt, Flyway, Cookiecutter, Rails, Git, Terraform)

---

## Summary

The seven-phase arc of `/migration` has three natural cleavage candidates: **Discovery (Phase 2)**, **Prove (Phase 6)**, and **Plan-export invocation (Phase 4→5 when plan-export mode is chosen)**. External precedent strongly favors **phased sub-commands with a router parent** (dbt- and Terraform-style) *when* each phase has independent invocation value. For `/migration`'s first-class use cases, **most phases are NOT independently invoked** — Discovery-without-Plan and Plan-without-Execute are niche, while Prove-after-the-fact is a plausible standalone need. Recommendation: **(b) router + 2-3 ancillaries** — `/migration` as monolithic primary with the seven-phase internal arc preserved, plus `/migration-scan` (pure Discovery, non-mutating, dogfoodable in both directions) and `/migration-prove` (convergence-loop harness reusable outside migration context). **Do NOT** pre-factor `/migration-reshape` or `/repo-profile` — both couple too tightly to the in-progress plan state to stand alone.

Refactor cost if wrong (monolith-first → decompose later): **low-moderate** (1-3 days per extraction) if the seven-phase arc keeps clean internal phase boundaries from day 1. Refactor cost the other way (over-decompose → re-monolith) is **moderate-high** because invocation-contract rollback forces all call-sites + plan-export consumers to change at once.

---

## 1. Decision criteria (7 criteria)

| # | Criterion | Monolith favored when | Decomposition favored when |
|---|-----------|----------------------|---------------------------|
| 1 | **Invocation frequency (standalone)** | Users always run the full arc end-to-end | Sub-phase has real standalone demand (e.g., `dbt test` without `dbt run`) |
| 2 | **User surface / menu size** | One verb users remember; menu shown internally | Users think in verbs (scan vs. apply vs. prove) and want the verb as front door |
| 3 | **State boundaries** | Tightly coupled state threads all phases (plan IDs, gate memory, verdict tables) | Each phase can serialize its own state to/from disk cleanly |
| 4 | **Reuse potential (cross-skill)** | Phase logic is migration-specific | Phase logic is general-purpose (e.g., convergence-loop, repo-profile) and reusable by other skills |
| 5 | **Testability / dogfood** | Full-arc integration test is primary quality gate | Sub-phase can be tested in isolation and lights up unique failure modes |
| 6 | **Phase independence (re-entry)** | Mid-flow re-entry is rare; linear arc dominates | Users will re-run single phases on existing plan (`flyway repair`, `flyway info`) |
| 7 | **Plan-export consumer shape (D26)** | Exported plan only invoked by same skill in destination | Exported plan invokes specific sub-skills that exist independently (modular consumer) |

A phase decomposes well if **3+ criteria lean toward decomposition**.

---

## 2. Phase-by-phase decomposition analysis for /migration

| Phase | Name | Standalone value? | Reusable? | State-isolated? | Verdict |
|-------|------|-------------------|-----------|-----------------|---------|
| 0 | Context | No — pure setup | No | No (loads central state) | **Keep in monolith** |
| 1 | Target pick | No — menu only | No | No | **Keep in monolith** |
| 2 | Discovery | **YES** — users want "what would migrate look like?" preview; proactive-scan mode (D2) already implies standalone use | High — `/migration-scan` could feed `/sync`, `/label-audit`, debt logging | Yes — outputs a discovery-report artifact | **EXTRACT as `/migration-scan`** |
| 3 | Research | No — verdict-conditional (R4); meaningless without Phase 2 verdicts | Already delegates to `/deep-research` | No | **Keep in monolith (delegates)** |
| 4 | Plan | Edge — `MIGRATION_PLAN.md` artifact is already portable (D26 plan-export) | Low — plan is migration-specific | Yes (artifact is the state) | **Keep in monolith; plan-export mode IS the decomposition** |
| 5 | Execute | No — without plan, nothing to execute; plan-export mode re-invokes in destination | No | Needs plan input | **Keep in monolith** |
| 6 | Prove | **YES** — convergence-loop over a claimed-done migration is valuable after-the-fact; also reusable for non-migration verification | High — D27 already lists `/convergence-loop` as a general skill | Yes — takes plan + destination state as input | **EXTRACT as `/migration-prove`** (or fold into general `/convergence-loop`) |

**Candidate `/migration-reshape` (from brainstorm Q7):** rejected. Reshape only exists inside a verdict from Phase 2 + research from Phase 3 + plan from Phase 4. Extracting it means re-loading all three predecessors' state at every invocation — all the coupling, none of the isolation benefit.

**Candidate `/repo-profile` (from brainstorm Q7):** rejected as a migration-skill ancillary — but plausible as an **independent foundational skill** that `/migration-scan` consumes. Out of scope for D7 router shape; flag for separate brainstorm.

---

## 3. External precedent catalog (7 precedents)

### 3.1 dbt (phased sub-commands)
- **Shape:** `dbt run`, `dbt test`, `dbt seed`, `dbt snapshot`, `dbt docs`, `dbt build` (compound of run+test+seed+snapshot)
- **Lesson:** Each sub-command is independently invoked in CI/CD and local dev. `dbt build` exists because the *composition* is itself a named workflow. Decomposition works because each phase consumes a shared project graph but produces independently useful output.
- **Fit to /migration:** Partial. Phases 2 and 6 have `dbt test`-like standalone value. Phases 0-5 do not have `dbt run`-like "run me alone" value.
- URL: https://docs.getdbt.com/reference/dbt-commands (2026-04-21)

### 3.2 Flyway (operational phased sub-commands)
- **Shape:** `flyway migrate`, `info`, `validate`, `baseline`, `repair`, `undo`, `clean`, `snapshot`
- **Lesson:** `info` and `repair` are the decomposition wins — they're invoked mid-flow, out of sequence, when state drifts. `baseline` is a one-time onboarding escape hatch. All sub-commands share the `flyway_schema_history` table as state spine.
- **Fit to /migration:** Strong for `/migration-prove` (analog: `flyway validate`) and hypothetical `/migration-info` (show current state of a MIGRATION_PLAN.md). A `/migration-repair` for corrupted plan state is a plausible post-v1 add.
- URL: https://flywaydb.org/documentation/commandline/ (2026-04-21)

### 3.3 Cookiecutter (pure monolith)
- **Shape:** Single `cookiecutter <template>` command. Interactive prompts from `cookiecutter.json`. Pre- and post-gen hooks in the template directory.
- **Lesson:** When the workflow is genuinely linear (pick template → fill vars → render → post-hooks), decomposition adds ceremony without payoff. Extensibility lives in the *template*, not in sub-commands.
- **Fit to /migration:** Partial counter-example. `/migration`'s linear arc resembles cookiecutter, BUT `/migration` has mid-flow gates, verdict branches, and plan-export re-invocation that cookiecutter doesn't. Cookiecutter's monolith succeeds because there are no re-entry points; `/migration` has several.
- URL: https://cookiecutter.readthedocs.io/en/stable/cli_options.html (2026-04-21)

### 3.4 Rails generators + rake tasks (namespaced sub-commands)
- **Shape:** `rails generate migration`, `rails db:migrate`, `rails db:rollback`, `rails db:seed`. Two tiers: `generate` = scaffolding (creates files); `db:*` = runtime ops (mutates DB).
- **Lesson:** Rails splits scaffolding (file generation) from operations (state mutation) at the top-level verb. This maps cleanly onto `/migration`'s direct-apply vs. plan-export split (D26): plan-export ≈ generate (produces artifact), direct-apply ≈ db:migrate (mutates state).
- **Fit to /migration:** Strongest precedent for D26. Suggests the mode-switch inside `/migration` could become two verbs: `/migration-plan` and `/migration-apply`. REJECTED for v1 because D28's re-entry norm and R3 gate-re-confirmation make a single interactive skill simpler — but a plausible v2 shape.
- URL: https://guides.rubyonrails.org/command_line.html (2026-04-21)

### 3.5 Git (plumbing + porcelain)
- **Shape:** ~150 sub-commands split into "porcelain" (user-facing: `commit`, `push`) and "plumbing" (script-facing: `hash-object`, `cat-file`). Porcelain interfaces unstable; plumbing interfaces stable.
- **Lesson:** When decomposition gets too deep, the layered architecture (stable low-level + evolving high-level) is the only way to keep ecosystem extensibility without breaking callers. `/migration` does NOT need this — it's one skill, not a hundred — but the discipline (expose stable primitives separately from user commands) is useful for Phase 5 execute primitives (sanitize, reshape, rewrite) if they're ever invoked by other skills.
- **Fit to /migration:** Caution. Git's depth is a warning about over-decomposition; no migration tool needs that surface area. Stay shallow (router + 2-3 ancillaries max).
- URL: https://git-scm.com/book/en/v2/Git-Internals-Plumbing-and-Porcelain (2026-04-21)

### 3.6 Terraform (plan/apply/destroy — separation of concerns)
- **Shape:** `terraform plan`, `terraform apply`, `terraform destroy` as peer sub-commands. `apply` accepts a saved plan artifact. `destroy` is `apply` with inverted goal.
- **Lesson:** The plan/apply split is the canonical decomposition for any system where "what would happen" must be reviewable before "do it." This IS the D3 plan-then-execute pattern. Terraform's success validates that splitting plan and execute across invocations (with a portable plan artifact) is robust.
- **Fit to /migration:** Direct analog. `MIGRATION_PLAN.md` = Terraform plan file; direct-apply = `terraform apply -auto-approve`; plan-export = `terraform plan -out=plan.tfplan` + later `terraform apply plan.tfplan`. Strong support for `/migration-plan` + `/migration-apply` split as a future v2 shape; v1 keeps them inside one router because the skill-harness gate model already serializes the review step.
- URL: https://developer.hashicorp.com/terraform/cli/commands/plan (2026-04-21)

### 3.7 clig.dev / Atlassian / Microsoft CLI design guidance (aggregate)
- **Rule:** "If you have a tool sufficiently complex, reduce complexity via sub-commands. If several closely-related tools, combine them for discoverability."
- **Rule:** "If a command has sub-commands, the parent should be a *grouping identifier*, not an action." (Microsoft CommandLine guidance)
- **Rule:** "Be consistent across sub-commands — same flag names, same output shape."
- **Lesson:** A pure-router `/migration` (parent has no action, only dispatches) is the cleaner decomposition shape than a "monolith + escape-hatch sub-commands" hybrid. If decomposing, commit fully.
- URLs: https://clig.dev/ , https://learn.microsoft.com/en-us/dotnet/standard/commandline/design-guidance (both 2026-04-21)

---

## 4. Concrete recommendation

**Recommendation: (b) router + 2-3 ancillaries.**

Specifically:

```
/migration              PRIMARY — runs seven-phase arc end-to-end (default front door)
/migration-scan         ANCILLARY — Phase 2 Discovery only; non-mutating; dogfoodable
/migration-prove        ANCILLARY — Phase 6 Prove only; convergence-loop harness
```

### Rationale

1. **Criterion-fit scoring:** Phases 2 and 6 each hit 4+ of the 7 decomposition criteria (standalone value, reusable, state-isolated, testable in isolation). Phases 0, 1, 3, 4, 5 each hit 0-1 criteria.
2. **Precedent alignment:** dbt + Flyway both validate the pattern of "one composite command + several peer sub-commands that can also run standalone." Cookiecutter validates keeping the linear arc monolithic when no sub-phase has standalone demand — so we keep Phases 0/1/3/4/5 inside `/migration`.
3. **D26 plan-export is the fourth decomposition** — but it's a *mode flag*, not a separate skill. Terraform's apply-a-plan-file pattern confirms this works as an in-skill mode. A separate `/migration-apply` is a v2 option only if plan-export usage dominates.
4. **Proactive-scan (D2) already needs `/migration-scan`** as a standalone front door. Forcing users to invoke `/migration` just to get the scan, then decline at Phase 3, is friction with no payoff.
5. **`/migration-prove` as convergence-loop wrapper** lets the same verification engine audit any claim-vs-reality gap, not just migrations. D27 already flags `/convergence-loop` as a general skill — `/migration-prove` could be a thin alias for `/convergence-loop --scope=migration-plan`.
6. **Why NOT router-only (no primary `/migration`):** Users still want the end-to-end verb. A bare `/migration-scan` + `/migration-plan` + `/migration-execute` + `/migration-prove` chain is dbt-without-`dbt-build` — the common-case workflow gets no shortcut. Keep `/migration` as the composite front door.
7. **Why NOT (c) 4-5 ancillaries:** `/migration-reshape` and `/migration-rewrite` (per D23/D24) have no standalone state — they only exist mid-plan. Extracting them forces state re-hydration at every call. Git's plumbing-porcelain depth is a warning, not a template.

### Invocation contract (primary → ancillary)

- `/migration` calls into `/migration-scan` internally at Phase 2 (or skips if already-run artifact exists in state).
- `/migration` calls into `/migration-prove` internally at Phase 6.
- Both ancillaries accept `--invoked-by=migration` + `--state-dir=<path>` so standalone vs. nested invocations share the same artifact format.
- Ancillaries NEVER call the primary back (no circular dispatch).

---

## 5. Refactor cost if wrong

### Scenario A: Ship (a) monolith v1 → need (b) router + 2-3 later
- **Cost:** LOW-MODERATE (1-3 days per extraction).
- **Preconditions:** The seven-phase internal arc must keep clean phase boundaries from day 1 (R2 already mandates this). Each phase's inputs/outputs serialize to disk.
- **Extraction work per ancillary:** (a) copy phase logic to new skill file, (b) define invocation contract, (c) add state-dir handoff in primary, (d) author standalone SKILL.md, (e) update tests.
- **User impact:** None if primary keeps composite behavior unchanged.

### Scenario B: Ship (c) router + 4-5 ancillaries v1 → need to re-monolith
- **Cost:** MODERATE-HIGH (1-2 weeks).
- **Why higher:** Every ancillary has a documented invocation contract users may have scripted against. Rolling back means (a) deprecation cycle, (b) removing or aliasing public sub-commands, (c) re-unifying state handling that was split across files, (d) updating exported plans that reference sub-skills. Terraform's `destroy` + `-target` evolution shows how decomposition commitments are sticky.

### Scenario C: Ship (b) v1 (recommendation) → need to collapse one ancillary
- **Cost:** LOW (<1 day) if the ancillary is aliased/deprecated. Users of the ancillary migrate to `/migration --scan-only` or similar mode flag.

### Scenario D: Ship (b) v1 → need to add more ancillaries (c)
- **Cost:** LOW (1-3 days each), same shape as Scenario A.

**Asymmetry conclusion:** Under-decomposing is cheaper to fix than over-decomposing. Recommendation (b) is the minimal viable decomposition that captures the clear wins (Phase 2, Phase 6) while keeping refactor options open.

---

## 6. Sources

- `C:\Users\jbell\.local\bin\JASON-OS\.research\migration-skill\BRAINSTORM.md` — authoritative context (§2 seven-phase arc, §5 Q7, D23/D24/D26/D27)
- dbt Command Reference — https://docs.getdbt.com/reference/dbt-commands (2026-04-21)
- Flyway CLI — https://flywaydb.org/documentation/commandline/ (2026-04-21)
- Cookiecutter CLI options — https://cookiecutter.readthedocs.io/en/stable/cli_options.html (2026-04-21)
- Rails command line — https://guides.rubyonrails.org/command_line.html (2026-04-21)
- Git internals (plumbing/porcelain) — https://git-scm.com/book/en/v2/Git-Internals-Plumbing-and-Porcelain (2026-04-21)
- Terraform plan command — https://developer.hashicorp.com/terraform/cli/commands/plan (2026-04-21)
- Command Line Interface Guidelines — https://clig.dev/ (2026-04-21)
- Microsoft CommandLine design guidance — https://learn.microsoft.com/en-us/dotnet/standard/commandline/design-guidance (2026-04-21)
- Atlassian CLI design principles — https://www.atlassian.com/blog/it-teams/10-design-principles-for-delightful-clis (2026-04-21)
- HN discussion (CLI sub-command design) — https://news.ycombinator.com/item?id=35789781 (2026-04-21)
