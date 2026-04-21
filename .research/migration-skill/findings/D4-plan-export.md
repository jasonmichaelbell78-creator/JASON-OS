# D4 — Plan-Export Mechanics (SQ-D4)

**Agent:** D4-plan-export
**Phase:** 1 (deep-research / migration-skill)
**Depth:** L1 (web + docs + in-house adapter)
**Date:** 2026-04-21
**Scope:** Direct-apply vs plan-export output-mode mechanics (BRAINSTORM D26), with focus on the plan-export half: format, portability to destination, comparable patterns, invocation model, selection heuristic.

---

## Summary

The plan-export mode should produce a **MIGRATION_PLAN.md artifact that is a markdown-with-embedded-YAML-frontmatter hybrid** — human-readable by default (operator can follow steps manually) AND machine-executable by a minimal dedicated runner (whether `/migration` itself or a lightweight `/apply-migration-plan` companion). The artifact ships as a **single file** (plus a sidecar `migration-payload/` tree of staged content blobs when needed) that a destination repo can consume **without requiring the full `/migration` skill to be pre-installed**. The portable runner is small enough to live either (a) as an always-present lightweight skill included in any repo adopting the pattern, (b) as an embedded "runner stub" inside the MIGRATION_PLAN.md itself (via a `## Runner Instructions` section the operator pastes into their Claude Code session), or (c) as a plain shell script the plan emits alongside itself for no-AI execution. Plan-export wins over direct-apply when: crossing a trust boundary, targeting an unowned / foreign-idiom repo, queuing a change for later review, or producing a rollback-able record. Direct-apply wins when: both endpoints are locally trusted, verdict is `copy-as-is` or mild `sanitize`, and the operator explicitly prefers speed over auditability.

---

## 1. Proposed MIGRATION_PLAN.md schema

### 1.1 Shape — Markdown + YAML frontmatter + optional sidecar payload

Inspired by: Flyway's versioned filenames + Alembic's `upgrade()`/`downgrade()` + Ansible's task-list + Kustomize's base/overlay separation + dbt seeds' sidecar-file pattern + cookiecutter's `pre_gen`/`post_gen` hooks + EF Core's migration bundle self-containment.

```markdown
---
migration_plan_version: 1
plan_id: <uuid-or-slug>             # e.g. "sonash-to-jason-os-20260421-cas-port"
generated_by: /migration v<X.Y.Z>
generated_at: 2026-04-21T13:45:00-04:00
source_endpoint:
  repo: sonash-v0
  path: C:/Users/jason/Workspace/dev-projects/sonash-v0
  commit: abc1234
  branch: main
destination_endpoint:
  repo: JASON-OS
  path: C:/Users/jbell/.local/bin/JASON-OS
  commit: def5678
  branch: main
direction: out                       # in | out
unit_type: skill                     # file | workflow | concept | skill | bundle
verdict: reshape                     # copy-as-is | sanitize | reshape | rewrite
# precondition gate — the runner MUST check these before any write
preconditions:
  - destination_clean: true
  - destination_head_matches: def5678  # abort if destination drifted since plan was generated
  - required_paths_exist:
      - .claude/skills/
      - scripts/lib/
  - required_paths_absent:
      - .claude/skills/cas/           # conflict check
rollback:
  mode: snapshot                     # snapshot | reverse-steps | none
  snapshot_dir: .migration-state/plans/<plan_id>/pre-apply/
---

# Migration Plan: <human-readable title>

## Summary
<what moves, why, from where, to where — 1 paragraph>

## Preflight
<human-readable version of the frontmatter preconditions, for operator review>

## Steps

### Step 1 — Sanitize `scripts/cas/indexer.js`
- verdict: sanitize
- source: sonash-v0/scripts/cas/indexer.js
- destination: JASON-OS/scripts/cas/indexer.js
- transforms:
  - strip-home-paths: replace `/home/jason/sonash/` → `${REPO_ROOT}/`
  - strip-env: remove `SONASH_API_KEY` references
- done_when: destination file exists AND `node -c` passes
- payload: migration-payload/step-1/indexer.js   # post-transform file, staged

### Step 2 — Reshape `sonash.config.json` → `.claude/config/cas.json`
- verdict: reshape
- source: sonash-v0/sonash.config.json
- destination: JASON-OS/.claude/config/cas.json
- transforms:
  - extract-keys: [cas.db_path, cas.model]
  - rewrite-paths: rooted from JASON-OS convention
- done_when: destination JSON validates against schema `schemas/cas-config.schema.json`
- payload: migration-payload/step-2/cas.json

### Step 3 — Register skill in SKILL_INDEX.md
- verdict: rewrite
- target: JASON-OS/.claude/skills/SKILL_INDEX.md
- operation: append-table-row
- content: |
    | cas | Content-analysis service port | port-from-sonash |
- done_when: grep for "| cas |" in file succeeds

## Verification
<convergence-loop checks to run AFTER apply — cited from source plan>
- `node .claude/skills/cas/validate.js` exits 0
- All files in payload/ have matching destination files with identical sha256

## Rollback
- Restore from `.migration-state/plans/<plan_id>/pre-apply/`

## Runner Instructions
<self-contained paragraph telling an operator with fresh Claude Code how to apply —
  see §4 Invocation Model>
```

### 1.2 Why this shape

| Design choice                    | Rationale                                                                             | Precedent                        |
| -------------------------------- | ------------------------------------------------------------------------------------- | -------------------------------- |
| Markdown primary                 | Human-reviewable; operator can follow manually if runner absent                        | Ansible playbooks (YAML + names) |
| YAML frontmatter                 | Structured precondition + rollback data, parseable without markdown tokenization       | Jekyll / MDX / dbt YAML props    |
| Explicit verdict per step        | Maps directly to BRAINSTORM D23 verdict legend                                         | Rails `change` vs `up/down`      |
| Payload sidecar                  | Pre-transformed content travels with plan — runner writes bytes, doesn't re-transform | EF Core migration bundles        |
| `done_when` per step             | Idempotency check; each step becomes self-verifying                                   | Ansible idempotency; dbt tests   |
| Precondition gate in frontmatter | Abort fast on destination drift                                                       | Flyway checksum; terraform plan-file tamper check |
| Snapshot rollback                | Single-op undo without having to reverse transforms                                   | EF Core idempotent bundle pattern |
| Commit SHAs pinned               | Plan tied to exact source+dest state at generation time                               | terraform binary plan signature  |

### 1.3 Alternative schemas considered (rejected)

- **Pure JSON plan** — loses human readability, operator can't review without a tool. Rejected per D8 ("nothing silent, ever" — operator review must remain possible).
- **Pure shell script** — too low-level, no verdict semantics, no rollback metadata. Could be emitted *alongside* as a fallback (see §4.3) but not as the primary artifact.
- **Pure markdown prose** — unparseable by a runner; regresses to manual execution only. Rejected because D3 specifies a machine-actionable plan artifact.
- **Terraform-style binary** — opaque; operator can't review before apply. Rejected per D8. Terraform gets away with it because the human-readable text output is separate from the binary; we'd need both anyway, so skip the binary.

---

## 2. Dependency on destination having `/migration`

**Verdict: Plan-export MUST be destination-agnostic — the destination does NOT need `/migration` installed.**

### 2.1 The chicken-and-egg problem

If plan-export required `/migration` to exist at the destination, the first migration into any new destination could never be done via plan-export — because `/migration` itself wouldn't be there yet. This breaks the self-dogfood criterion (Q10 in BRAINSTORM §5) and defeats the "portable" premise of D26.

### 2.2 Three layers of destination requirement

Ranked from most-portable to least:

| Layer | Requirement at destination                                 | Portability          |
| ----- | ---------------------------------------------------------- | -------------------- |
| L0    | Nothing — operator reads plan and does steps manually      | Universal            |
| L1    | A plain shell script runner (emitted alongside plan)        | Any POSIX / PowerShell |
| L2    | A tiny `/apply-migration-plan` skill (~100 LOC)            | Any Claude Code install |
| L3    | Full `/migration` skill                                     | JASON-OS + ported destinations |

**Recommendation:** Support L0–L2. Never require L3. `/migration` produces artifacts valid at all three layers.

### 2.3 Packaging suggestion

The plan-export mode SHOULD emit:

```
.migration-state/plans/<plan_id>/
├── MIGRATION_PLAN.md            # L0 — operator-readable
├── apply.sh                      # L1 — bash runner (POSIX)
├── apply.ps1                     # L1 — PowerShell runner (Windows)
├── migration-payload/            # staged content (step-N/ subdirs)
└── .runner-manifest.json         # L2 — machine-readable step graph
```

The L2 skill `/apply-migration-plan` reads `.runner-manifest.json` + the markdown, runs gates, writes payload, checks `done_when`. That skill is small enough (~100–200 LOC) to either (a) ship as its own tiny skill in any repo that wants idiomatic plan consumption, or (b) be embedded as a bootstrap snippet inside the MIGRATION_PLAN.md "Runner Instructions" section.

### 2.4 Bootstrap path for foreign destinations

For a destination that has neither `/migration` nor `/apply-migration-plan`:
1. Operator opens MIGRATION_PLAN.md in destination repo
2. Copies the `## Runner Instructions` snippet into their Claude Code session
3. Claude Code applies steps per the snippet's directions (operates as an ephemeral, in-context runner — no skill install required)
4. OR operator runs `bash apply.sh` for full no-AI execution

This is the chicken-and-egg dissolver: the runner is either in-context (pasted) or it's a plain shell script. Neither requires prior install.

---

## 3. Comparable-patterns catalog (8 patterns, L1 depth)

### 3.1 Flyway versioned SQL migrations
- **Format:** `V<version>__<description>.sql` filename with body = raw SQL statements; each has version + description + checksum. Stored in `db/migrations/` directory.
- **Pros:** Simple filename convention; checksum detects drift; deterministic ordering; multi-file composition.
- **Cons:** SQL-only (domain-specific); no per-statement idempotency metadata; no rollback unless explicit "undo" migrations are written (repeatable/versioned split).
- **Lesson for /migration:** Adopt the **checksum-for-drift-detection** and **explicit version/timestamp in filename** to prevent reordering issues.
- Source: <https://documentation.red-gate.com/fd/versioned-migrations-273973333.html> (accessed 2026-04-21)

### 3.2 Alembic Python migration scripts
- **Format:** Python file per migration, contains `upgrade()` and `downgrade()` functions; revision graph tracked via `revision` / `down_revision` string IDs in the script header.
- **Pros:** Explicit bidirectional operations; code-as-migration allows arbitrary logic; autogenerate from schema diff.
- **Cons:** Requires Alembic runtime at destination (not portable to foreign repos); Python-only.
- **Lesson:** The `upgrade()`/`downgrade()` pair maps to our `apply` / `rollback` per step. Revision-graph IDs could become our `plan_id` + `parent_plan_id` if /migration ever supports chained migrations.
- Source: <https://alembic.sqlalchemy.org/en/latest/autogenerate.html> (accessed 2026-04-21)

### 3.3 Ansible playbooks
- **Format:** YAML list of plays; each play has hosts + tasks; each task has name + module + args + optional idempotency guards (`creates:`, `when:`, `changed_when:`).
- **Pros:** Human-readable; idempotent-by-default modules; named steps show in output; `--check` dry-run mode.
- **Cons:** Requires Ansible runtime at target; no rollback primitive (operator writes reversals as separate plays); YAML indentation fragility.
- **Lesson:** The **task-name-as-documentation** pattern and **idempotency guards per step** are directly adoptable. Our `done_when` is Ansible's `creates`/`changed_when` renamed.
- Source: <https://docs.ansible.com/projects/ansible/latest/playbook_guide/playbooks_intro.html> (accessed 2026-04-21)

### 3.4 Terraform plan binary + JSON + human output
- **Format:** Three outputs from same source: (1) binary `.tfplan` file (cryptographically signed, tamper-resistant, consumed by `terraform apply`); (2) JSON via `terraform show -json` (machine-readable); (3) human text via `terraform show` or default plan output.
- **Pros:** Cryptographic tamper-proof binary prevents apply-time drift; multiple views of same plan; applies only what was planned.
- **Cons:** Binary opaque to humans without the CLI; destination needs Terraform installed; tied to `.tfstate` file.
- **Lesson:** The **three-view pattern** (machine-readable + human-readable + human-summary) is the right model. We emit markdown (human) + frontmatter (machine-lite) + `.runner-manifest.json` (machine-full). **Pin commit SHAs** mirrors the tamper-resistance goal for our use case (verify destination didn't drift between plan and apply).
- Source: <https://developer.hashicorp.com/terraform/internals/json-format> (accessed 2026-04-21)

### 3.5 Cookiecutter templates
- **Format:** Directory with `cookiecutter.json` (variable prompts) + `{{cookiecutter.project_slug}}/` template tree (Jinja-rendered) + `hooks/` dir with `pre_prompt.py`, `pre_gen_project.py`, `post_gen_project.py`.
- **Pros:** Templated variables; pre/post hooks for validation/cleanup; cross-platform (Python); well-established.
- **Cons:** One-shot (no update after generation); no rollback; requires Cookiecutter runtime at target.
- **Lesson:** The **pre-gen / post-gen hook lifecycle** maps to our precondition / verification phases. The **templated-variables-with-defaults** pattern is relevant for reshape: rewrite home-paths via templated placeholders.
- Source: <https://cookiecutter.readthedocs.io/en/stable/advanced/hooks.html> (accessed 2026-04-21)

### 3.6 Rails ActiveRecord migrations
- **Format:** Ruby class with a `change` method (declarative, reversible-by-inference) or explicit `up`/`down` pair for non-reversible ops. Uses `reversible do |dir| dir.up {...}; dir.down {...} end` for inline bidirectional blocks.
- **Pros:** DSL is ergonomic; auto-reverse for common ops; version history is a timeline of files.
- **Cons:** Ruby-only; tightly coupled to ActiveRecord; no portability across frameworks.
- **Lesson:** The **"single change method when auto-reversible, explicit pair when not"** pattern is a good heuristic. Our `copy-as-is` / `sanitize` verdicts are auto-reversible (snapshot rollback works); `reshape` / `rewrite` verdicts may need explicit reverse steps.
- Source: <https://guides.rubyonrails.org/active_record_migrations.html> (accessed 2026-04-21)

### 3.7 Kustomize overlays
- **Format:** `base/` directory with `kustomization.yaml` + resources; `overlays/<env>/` dirs each with their own `kustomization.yaml` referencing the base + strategic-merge-patch YAML or JSON-6902 patches.
- **Pros:** Declarative; layered patches; built-in transformers (namePrefix, commonLabels); no templating (pure YAML merge).
- **Cons:** YAML-merge semantics subtle; only fits resource-shaped data.
- **Lesson:** The **base + patch-overlay model** is interesting for re-port / diff-port semantics (BRAINSTORM Q9): v1 of a ported file = base; subsequent sync-backs = overlay patches. Out of scope for initial /migration v1 but worth noting for the diff-port mode question.
- Source: <https://kubernetes.io/docs/tasks/manage-kubernetes-objects/kustomization/> (accessed 2026-04-21)

### 3.8 dbt seeds
- **Format:** CSV files in `seeds/` dir + optional YAML property file for column types; loaded via `dbt seed`.
- **Pros:** Data-as-code; version-controlled; simple.
- **Cons:** Not a migration format per se — static-reference-data loader; no transformation logic; truncate-and-reload semantics.
- **Lesson:** Our payload sidecar (`migration-payload/step-N/<file>`) uses the same **content-travels-with-plan** model. The payload is pre-transformed files the runner writes verbatim — analogous to dbt loading CSVs verbatim into tables.
- Source: <https://docs.getdbt.com/docs/build/seeds> (accessed 2026-04-21)

### 3.9 (Bonus) EF Core migration bundles
- **Format:** Self-contained executable (`efbundle` or `efbundle.exe`) produced by `dotnet ef migrations bundle`; optionally self-contained with `--self-contained -r <rid>` to include .NET runtime. Idempotent — skips already-applied migrations.
- **Pros:** Zero install at destination (runtime optional); idempotent; single-file artifact; works in Docker/CI.
- **Cons:** Platform-specific binary (needs cross-build per target OS); opaque (no pre-apply inspection); EF Core-specific.
- **Lesson:** The **single-file-artifact + idempotent-apply** goal is exactly what plan-export wants. But for our markdown-first context, the human-readable layer is non-negotiable — so we adopt the *idempotency guarantee* (re-running plan = no-op if already applied) without the binary opacity.
- Source: <https://devblogs.microsoft.com/dotnet/introducing-devops-friendly-ef-core-migration-bundles/> (accessed 2026-04-21)

### 3.10 Pattern-synthesis matrix

| Dimension             | Winning pattern(s)           | Adopted?                                                                      |
| --------------------- | ---------------------------- | ----------------------------------------------------------------------------- |
| Human readability     | Ansible, Rails, Kustomize    | Yes — markdown as primary                                                     |
| Machine parseability  | Terraform JSON, EF bundle    | Yes — YAML frontmatter + `.runner-manifest.json`                              |
| Drift detection       | Flyway checksum, TF signature | Yes — commit SHA pinning                                                      |
| Bidirectionality      | Alembic, Rails               | Partial — snapshot rollback for v1; explicit reverse for rewrite-verdict only |
| Idempotency           | Ansible, EF bundle           | Yes — `done_when` per step; skip-if-satisfied                                 |
| Content travels w/ plan | dbt seeds, Cookiecutter    | Yes — `migration-payload/` sidecar                                            |
| Zero-install at target | EF self-contained bundle    | Yes — via `apply.sh` / in-context runner stub                                 |
| Templated variables   | Cookiecutter                 | Partial — for reshape's path-rewrite step                                     |

---

## 4. Invocation model at destination

### 4.1 Three invocation channels (ranked by convenience)

**Channel A — Claude Code `/apply-migration-plan` skill**
- Operator: `cd <dest-repo> && claude → /apply-migration-plan .migration-state/plans/<plan_id>/`
- Skill reads frontmatter, runs preflight, walks steps, confirms at gates (D8), writes files, runs `done_when` checks.
- Requires: a ~100–200 LOC companion skill. Small enough to ship alongside JASON-OS and be ported via — irony intended — `/migration` itself as one of the first self-dogfood runs.

**Channel B — In-context runner via pasted "Runner Instructions"**
- Operator: opens Claude Code in dest repo, pastes the `## Runner Instructions` section of MIGRATION_PLAN.md as their message.
- Claude reads the plan, performs steps using base file tools + bash.
- Requires: any Claude Code install. No skill install.
- Caveat: quality depends on how prescriptive the Runner Instructions section is. Must be written to be unambiguous — step IDs, exact commands, exact paths, exact gate prompts.

**Channel C — Plain shell script `apply.sh` / `apply.ps1`**
- Operator: `bash .migration-state/plans/<plan_id>/apply.sh`
- No AI involvement. Script runs preflight checks, copies payload files, runs verification commands, exits nonzero on any failure.
- Requires: bash or PowerShell. Works in CI, in containers, in headless contexts.
- Tradeoff: Cannot do LLM-y transformations at apply-time. Everything must be pre-baked into payload files at plan-generation time. This is actually desirable — it enforces the invariant that plans are deterministic artifacts, not live transformations.

### 4.2 Recommendation

**Emit all three.** Channel A is the default (cleanest Claude-Code UX, full D8 compliance). Channel B is the escape hatch for destinations without the companion skill. Channel C is the no-AI / CI / auditable-by-shell fallback.

Channels B and C should be **byte-identical in outcome** — if Channel C runs cleanly, Channel A/B should too (they just narrate it better). This makes `apply.sh` the "ground truth" executable, with the Claude channels being human-friendly wrappers.

### 4.3 User-facing command at destination

When `/migration` in plan-export mode finishes generating the plan in the source, it MUST print exactly what to do at the destination, e.g.:

```
Plan written to .migration-state/plans/sonash-to-jason-os-20260421-cas-port/
To apply, choose one:

  [A] In destination (with /apply-migration-plan skill):
      cd /path/to/JASON-OS && claude
      /apply-migration-plan .migration-state/plans/sonash-to-jason-os-20260421-cas-port/

  [B] In destination (ad-hoc Claude session, no skill):
      cd /path/to/JASON-OS && claude
      Then paste the contents of:
      .migration-state/plans/sonash-to-jason-os-20260421-cas-port/RUNNER_STUB.md

  [C] Plain shell (no AI):
      cd /path/to/JASON-OS
      bash .migration-state/plans/sonash-to-jason-os-20260421-cas-port/apply.sh
```

This satisfies D8 (nothing silent) and D29 (local-only) cleanly.

---

## 5. Direct-apply vs plan-export decision heuristic

### 5.1 Verdict-driven default (primary)

| Verdict (D23)          | Default mode    | Rationale                                                                                           |
| ---------------------- | --------------- | --------------------------------------------------------------------------------------------------- |
| `copy-as-is`           | direct-apply    | No transformation, low risk, speed preferred                                                         |
| `sanitize`             | direct-apply    | Mechanical regex, low risk if both endpoints owned                                                   |
| `reshape`              | plan-export     | Structural rewrite against destination idioms — operator review valuable                             |
| `rewrite`              | plan-export     | Dispatches research mid-execute (D24); operator review essential                                     |
| `skip`                 | n/a             | No artifact                                                                                         |
| `blocked-on-prereq`    | plan-export     | Defers until prereq resolves; plan artifact captures state for later resume                         |

### 5.2 Context-driven overrides (secondary — any one flips verdict-default to plan-export)

- Destination is **foreign / unowned** (operator doesn't control dest repo) → plan-export
- Destination has **uncommitted changes** (dirty working tree) → plan-export
- Operator is **migrating across trust boundary** (personal → work, home → client) → plan-export
- User **explicitly requests plan-export** at the output-mode gate → plan-export
- **CI / batch context** (non-interactive, no review opportunity) → plan-export with mandatory separate review step before apply
- Migration is **cross-machine** (v2+; out of scope for v1 per D29 but planned)

### 5.3 User-selected at gate (ultimate)

Per D8, the output-mode choice is always surfaced to the user at a dedicated gate — the heuristic above populates the **default** recommendation, but the user confirms or overrides at the gate. Never silent.

Gate prompt suggestion:

```
Output mode selection — verdict is `reshape`, destination is owned (JASON-OS).

  Default: plan-export (verdict-driven)
  Override: direct-apply (suitable if you want speed and accept lower reviewability)

Which mode? [plan-export / direct-apply]
```

### 5.4 Compound heuristic pseudo-rule

```
mode = default-for-verdict(verdict)
if any(foreign, dirty, trust-boundary-cross, ci-context):
    mode = 'plan-export'
if user-explicitly-chose:
    mode = user-choice
```

### 5.5 Anti-pattern to guard against

Do NOT let direct-apply mode silently skip the plan artifact. Even in direct-apply, a MIGRATION_PLAN.md SHOULD still be written (to `.migration-state/plans/<plan_id>/`) for post-hoc audit and rollback — the difference is that direct-apply runs the plan immediately after generating it, whereas plan-export stops after generation and hands the artifact to the operator. This preserves audit trail regardless of mode and makes rollback uniform.

---

## 6. Open questions / uncertainties this research surfaced

1. **Does `/apply-migration-plan` become its own skill, or a sub-behavior of `/migration`?** Argument for separate skill: destinations that don't want full `/migration` still get a useful runner. Argument for unified: one less skill to maintain, self-dogfood target is simpler. Recommend: separate but tiny (see D28 re-entry trigger — this may surface in skill-decomposition research question Q7).
2. **Payload sidecar vs inline in markdown?** For small files (<10KB) inlining as code fences is simpler; for larger or binary content sidecar is mandatory. Research needed to set threshold and format (base64? raw? gzip?). Recommend: default to sidecar always, but embed a content-hash in the step entry for integrity.
3. **Re-port / diff-port format (BRAINSTORM Q9).** Kustomize overlay model is the closest match but would be a significant layer of complexity. Defer to a subsequent research pass once v1 shape solidifies.
4. **Cross-platform runner** — `apply.sh` vs `apply.ps1` vs Node.js script. A Node.js-based runner (since JASON-OS already requires Node 22 per CLAUDE.md §1) would unify both platforms and could reuse `scripts/lib/` helpers. Likely winner for v1; bash/PS scripts as generation outputs from the Node runner.
5. **Runner Instructions section format (Channel B)** — needs a prose-template that is robust to LLM paraphrase drift. Consider a numbered-list-with-exact-commands pattern + a test harness that runs the paste-into-Claude flow and verifies output.

---

## 7. Sources

Web (all accessed 2026-04-21):

- Flyway versioned migrations — <https://documentation.red-gate.com/fd/versioned-migrations-273973333.html>
- Flyway migration format — <https://documentation.red-gate.com/fd/migrations-271585107.html>
- Alembic autogenerate — <https://alembic.sqlalchemy.org/en/latest/autogenerate.html>
- Ansible playbooks intro — <https://docs.ansible.com/projects/ansible/latest/playbook_guide/playbooks_intro.html>
- Ansible idempotency — <https://pocketcmds.com/rules/ansible/ansible-idempotency>
- Terraform JSON plan format — <https://developer.hashicorp.com/terraform/internals/json-format>
- Terraform show command — <https://developer.hashicorp.com/terraform/cli/commands/show>
- Cookiecutter hooks — <https://cookiecutter.readthedocs.io/en/stable/advanced/hooks.html>
- Cookiecutter README — <https://cookiecutter.readthedocs.io/en/latest/README.html>
- Rails ActiveRecord migrations — <https://guides.rubyonrails.org/active_record_migrations.html>
- Kustomize — <https://kubernetes.io/docs/tasks/manage-kubernetes-objects/kustomization/>
- dbt seeds — <https://docs.getdbt.com/docs/build/seeds>
- EF Core migration bundles — <https://devblogs.microsoft.com/dotnet/introducing-devops-friendly-ef-core-migration-bundles/>
- EF Core applying migrations — <https://learn.microsoft.com/en-us/ef/core/managing-schemas/migrations/applying>
- GitHub Actions reusable workflows — <https://docs.github.com/en/actions/how-tos/reuse-automations/reuse-workflows>
- Claude Code skills (portability model) — <https://code.claude.com/docs/en/skills>

In-house:

- `C:\Users\jbell\.local\bin\JASON-OS\.research\migration-skill\BRAINSTORM.md` §3 D3 (MIGRATION_PLAN.md artifact), §3 D8 (nothing silent), §3 D23 (verdict legend), §3 D24 (phase 5 content), §3 D26 (output modes), §3 D29 (v1 local-only), §5 Q4 (this question)
- `C:\Users\jbell\.local\bin\JASON-OS\.claude\skills\deep-plan\SKILL.md` lines 72–76, 224–238 (DIAGNOSIS / DECISIONS / PLAN artifact structure — the in-house precedent for separate machine+human readable plan artifacts), lines 309–322 (handoff routing — analogous to our Channel A/B/C invocation routing)
- `C:\Users\jbell\.local\bin\JASON-OS\CLAUDE.md` §1 (Node 22 runtime baseline — informs Channel C runner language choice)
