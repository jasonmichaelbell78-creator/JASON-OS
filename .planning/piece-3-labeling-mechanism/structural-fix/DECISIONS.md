# DECISIONS — Piece 3 Structural Fix + Scope Expansion + Re-run + Mirror Prep

**Session:** 13 (2026-04-21)
**Parent plan:** `.planning/piece-3-labeling-mechanism/PLAN.md`
**Pickup:** `.planning/piece-3-labeling-mechanism/S10_HANDOFF.md`
**Diagnosis:** `./DIAGNOSIS.md`
**Plan:** `./PLAN.md`

58 decisions across 13 discovery categories. Every decision row is standalone
— cite by ID (D1.1, D2.3, …) from PLAN.md + future retro entries.

---

## Category 1 — Scope.json philosophy + implementation

| ID   | Decision                                                                                                                                                   | Rationale                                                                                                        |
| ---- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| D1.1 | **Scope model: negative-space.** `include: ["**/*"]` + explicit excludes only.                                                                             | Drift-by-omission becomes impossible; future committable files are in-scope automatically.                       |
| D1.2 | **`.research/**` fully in scope** — all 241 files enter catalog via re-run.                                                                                | "Committable = in scope" rule is unconditional; subsetting re-opens MVP-noise door.                              |
| D1.3 | **`**/__tests__/**` fully in scope** — all 10 files; `test` type added in Cat 2.                                                                           | Tests are first-class code.                                                                                      |
| D1.4 | **31 pattern-gap fixes resolved by construction** via D1.1's model flip.                                                                                   | One mechanism, not two.                                                                                          |
| D1.5 | **Generated artifacts fully in scope**, stamped `status: generated` (+ `portability: not-portable` \| `portable-with-deps`). Includes 17 `.husky/_/*` shims, `package-lock.json`, `.research/research-index.jsonl`, `.planning/TODOS.md`. | Preserves the rule; downstream consumers filter on `status`. |
| D1.6 | **`scope.json` comments retained + reformulated** — compact rule inline (`include rule: committable = in scope`) + pointer to this DECISIONS.md.            | Load-bearing for new contributors reading the file cold.                                                         |
| D1.7 | **`scope.json` version bump `1 → 2`** + add `philosophy: "committable-is-in-scope"` field.                                                                  | Marks the philosophical pivot; self-documenting.                                                                 |
| D1.8 | **No scope-audit gate needed** — D1.1's negative-space model makes drift impossible by construction.                                                       | Gate is vacuous.                                                                                                 |

**Implementation note:** scope-matcher.js must use minimatch `dot: true` (or
`{**/*,**/.*}` pattern) to match dotfiles under `**/*`. Verify
`.claude/sync/label/lib/scope-matcher.js` current behavior during PLAN Step 1.

---

## Category 2 — Schema v1.3: shape fixes

| ID   | Decision                                                                                                                                                                                                          | Rationale                                                                                                   |
| ---- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| D2.1 | **`lineage_object`: schema wins.** Shape stays `{source_project, source_path, source_version, ported_date}` with `additionalProperties: false`. Templates rewrite.                                                | Semantically stronger than template shape; drift was a template bug.                                        |
| D2.2 | **`confidence` field added to schema** as optional top-level: `{type: "object", additionalProperties: {type: "number", minimum: 0, maximum: 1}}`. `verify.js` + `cross-check.js` strip-before-validate removed.   | Honest about agent output; drops band-aid; consumers can read historical confidence if useful.              |
| D2.3 | **`external_dep_entry` objects always** — `{name, hardness}` object required on `required_secrets`, `tool_deps`, `external_services`, `mcp_dependencies`. Templates rewrite with explicit JSON examples.          | Uniform shape across 4 fields; `required_secrets` benefits from `hardness` too.                             |
| D2.4 | **`content_hash` stays string-only, non-nullable.** Template says "OMIT if unknown" (no `null`).                                                                                                                   | Omit-if-unknown is cleanest; null is ambiguous semantics.                                                   |
| D2.5 | **§9.3 split.** `type: hook` requires the 7 fields (`event`, `matcher`, `if_condition`, `continue_on_error`, `exit_code_action`, `async_spawn`, `kill_switch_env`). `type: hook-lib` requires none of them.       | hook-lib is a distinct concept (shared code for hooks, no event of its own).                                |
| D2.6 | **Strict `additionalProperties: false` preserved everywhere.** `confidence` is now explicit.                                                                                                                       | Strict schemas catch drift early; confidence is no longer a leak.                                           |

---

## Category 2 — Schema v1.3: enums + evolution ceremony

| ID   | Decision                                                                                                                                                                            | Rationale                                                                                                                     |
| ---- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| D3.1 | **`enum_type` additions: `git-hook` + `test`.** `skill-reference` and `companion-doc` remain path-pattern sub-shapes of `doc`.                                                      | Fewer enum values, no loss of queryability; git-hook + test are structurally distinct.                                        |
| D3.2 | **`enum_portability` unchanged.** Generated files use `{status: generated, portability: not-portable \| portable-with-deps}` pair.                                                  | Pair already encodes the meaning; adding `generated` to portability would duplicate.                                          |
| D3.3 | **New `enum_git_hook_event`** alongside `enum_hook_event`. Schema `allOf` branch for `type: git-hook` requires `git_hook_event: enum_git_hook_event`. Distinct semantic namespace.   | Git-hook events and Claude-Code-hook events are semantically distinct.                                                        |
| D3.4 | **Schema version = v1.3 (minor, additive).** Philosophy-level signal rides on `scope.json` v2 (D1.7) + this DECISIONS.md reference. No v2.0 schema bump.                            | All changes are additive or loosening (SemVer minor); SoNash v1.2 records validate cleanly under v1.3.                        |
| D3.5 | **`enums.json` auto-generated from `schema-v1.json`** via a build script (path: `.claude/sync/schema/build-enums.js` or `scripts/sync/build-enums.js` — decided in PLAN Step 2).    | Robust against human drift; single source of truth.                                                                           |
| D3.6 | **EVOLUTION.md v1.3 entry follows existing v1.0–v1.2 pattern** — date, version, rationale, changes list, SoNash mirror obligation, migration notes.                                 | Consistency with existing entries.                                                                                            |
| D3.7 | **SoNash gradual backward-compat** — v1.2 records validate under v1.3 (additive-only). No hard cutover. New records stamp `schema_version: "1.3"`.                                  | Additive-only allows mixed window; matches CATALOG_SHAPE.md §4.1 pattern.                                                     |

---

## Category 3 — Naming convention canon

| ID   | Decision                                                                                                                                                                                                                                              | Rationale                                                                      |
| ---- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------ |
| D4.1 | **Type-dependent naming canon** encoded in `derive.js`: `skill → dir slug`; `agent`, `team` → basename without ext; all other types → basename without ext; collision → fallback to full path.                                                        | Matches existing cross-reference mental model in templates + reference docs.   |
| D4.2 | **No format regex** on `.name`. Any non-empty string is valid.                                                                                                                                                                                         | Legitimate names include `SESSION_CONTEXT`, `README.md`, `.nvmrc`.             |
| D4.3 | **Uniqueness enforced in both layers** — derive.js suggests; `validate-catalog.js` enforces with clear error naming the two conflicting paths. Validator builds an index per run.                                                                      | Belt-and-suspenders; clear error surface.                                      |
| D4.4 | **Cross-reference resolution by `.name` catalog lookup** — scan shared.jsonl + local.jsonl for matching `.name`.                                                                                                                                       | Simplest; O(N~400) is fine.                                                     |

---

## Category 4 — derive.js heuristic expansion

| ID   | Decision                                                                                                                                                                                                                                                    | Rationale                                                                     |
| ---- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------- |
| D4.5 | **Five new rules in `detectType()`:** (a) `.claude/hooks/run-*.sh` → `hook-lib`; (b) `.claude/hooks/**/*.sh` (other) → `hook-lib`; (c) `.husky/_shared.sh`, `.husky/husky.sh` → `hook-lib`; (d) `.husky/<name>` (no ext, not under `_/`) → `git-hook`; (e) `.husky/_/*` (shims) → `git-hook` + caller stamps `status: generated`. | Most-specific-to-general; handles S10 `husky.sh` + `.validate-test.cjs` edge cases. |
| D4.6 | **test detection rule: both `**/__tests__/**/*.{js,cjs,mjs,ts}` AND `**/*.{test,spec}.{js,cjs,mjs,ts}`.** Type: `test`.                                                                                                                                      | Covers both conventions; future-proof.                                        |
| D4.7 | **Rename `.claude/sync/schema/.validate-test.cjs` → `validate.test.cjs`** as part of this work.                                                                                                                                                              | Matches D4.6 pattern; costs nothing.                                          |

---

## Category 5 — Templates

| ID   | Decision                                                                                                                                                            | Rationale                                                                        |
| ---- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------- |
| D5.1 | **Templates: surgical diff patch.** Edit the 6 drift sections + insert naming canon. Don't rewrite the 95% that works.                                              | Drift is localized; full rewrite is risk without benefit.                        |
| D5.2 | **Partial share — new `agent-instructions-shared.md`** containing the 6 schema/field-shape sections. Both primary + secondary templates `{{INCLUDE}}` it at dispatch time. Role preambles stay inline. | Drift risk drops for schema sections; roles stay semantically distinct. |
| D5.3 | **CATALOG_SHAPE.md: 3 targeted updates** — §4.6 `schema_version` stamp (`"1.2"` → `"1.3"`), §3 per-type extension list (add `git-hook` + `test`), §9 version history entry for v1.3. | Targeted; no scope creep. |
| D5.4 | **Full audit of `DERIVATION_RULES.md` + `DISAGREEMENT_RESOLUTION.md`** now — reconcile against D2/D3/D4 decisions.                                                  | Authoritative `/label-audit` reference docs; drift here creates re-disagreement on every future run. |
| D5.5 | **One v1.3 cheat-sheet JSON block** (~40 lines) in both agent templates — all critical shapes in one place for fast agent retrieval.                                 | Agents skim; scattered blocks reduce retrieval.                                  |

---

## Category 6 — Re-run strategy

| ID   | Decision                                                                                                                                                                            | Rationale                                                                      |
| ---- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------ |
| D6.1 | **Full re-run.** All ~429 files fresh derivation. Existing 169 preview discarded.                                                                                                   | Purity over speed; partial contamination defeats the structural fix.           |
| D6.2 | **Existing preview + per-batch state renamed** to `.claude/sync/label/preview/s10-run-1-attempt/` + `.claude/state/s10-run-1-attempt/` (still gitignored).                         | Historical reference for debugging; no state pollution on re-run.              |
| D6.3 | **Enhanced+ promotion gate:** `verify.js` pass → `/label-audit` dogfooded on preview → audit report included in synthesis → user approves → atomic promote via rename.             | Convergence loop proves foundation; audit-green = safe to promote.             |

---

## Category 7 — Upstream hook wiring

| ID   | Decision                                                                                                                                                                                  | Rationale                                                                    |
| ---- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------- |
| D7.1 | **PostToolUse label hook wired as part of this structural fix, at promotion.** `.claude/settings.json` gains the entry in the promotion commit.                                           | Clean foundation + hook wiring = live system.                                |
| D7.2 | **Matcher pattern: `^(Edit\|Write\|MultiEdit)$`.** Bash-modification catches excluded.                                                                                                    | Covers ~99% of intentional changes via Claude tools.                         |
| D7.3 | **`continueOnError: true`, `exit_code_action: warn`** on all three label hooks.                                                                                                            | Matches every other JASON-OS PostToolUse hook; pre-commit is the blocker.    |
| D7.4 | **All three label hooks wired** — `post-tool-use-label.js`, `user-prompt-submit-label.js`, `notification-label.js`. All at promotion.                                                     | Mechanism is built; wiring all three is low-cost.                            |
| D7.5 | **Pre-commit catalog validator activated, BLOCKING** (no warn-mode cycle). `.husky/pre-commit` gains `validate-catalog.js` invocation alongside gitleaks. Non-zero exit blocks commit.    | Live at promotion is the point; warn-mode delays real enforcement.           |

---

## Category 8 — `/label-audit` accuracy verification

| ID   | Decision                                                                                                                                                                              | Rationale                                                                  |
| ---- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------- |
| D7.6 | **Dogfood failure → abort promotion + conversational resolution** per D12a. Narrow re-run is offered in-conversation, not auto-triggered.                                             | Matches Piece 3 native UX; human judgment where needed.                    |
| D7.7 | **`/label-audit` manual-only** — no auto-schedule, no session-begin/end integration.                                                                                                   | Preserves 3-layer architecture (hook primary, validator gate, audit supplementary). |

---

## Category 9 — S11 / S12 / S13 PLAN impact

| ID   | Decision                                                                                                                                                                                                              | Rationale                                                                     |
| ---- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------- |
| D8.1 | **Commit boundary: logical groupings** (~8 commits): (1) schema+enums+3 MDs; (2) templates+CATALOG_SHAPE+DERIVATION_RULES+DISAGREEMENT_RESOLUTION+shared partial; (3) derive.js+validation tooling; (4) scope.json+hooks+settings.json; (5) READMEs+OVERRIDE; (6) `validate-test.cjs` rename; (7) re-run output (preview → catalog) + PLAN §S10 timestamp; (8) PLAN §S11/§S12/§S13 patches + SONASH_MIRROR_DELTA. | Reviewable units; maps to PR review; rollback per-concern. |
| D8.2 | **All three PLAN sections patched** (§S11, §S12, §S13) — audit scope, test fixture list, mirror artifact list each reference v1.3 shapes + 429-file scope.                                                            | Each section cites concrete shapes/scope; stale text misguides future sessions. |
| D8.3 | **S12 test fixtures rewritten to v1.3** — external_dep objects, lineage shape, confidence, name-canon compliant.                                                                                                      | Wrong fixtures = wrong tests.                                                  |

---

## Category 10 — SoNash Piece 5.5 mirror coordination

| ID   | Decision                                                                                                                                                                                                                              | Rationale                                                                       |
| ---- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------- |
| D8.4 | **SoNash mirror defers to separate Piece 5.5 session.** This session stays JASON-OS-only.                                                                                                                                            | Piece 5.5 is native home; JASON-OS gets stability first.                        |
| D8.5 | **Mirror scope: shared/universal only.** Crosses: `schema-v1.json`, `enums.json`, `SCHEMA.md`, `EVOLUTION.md`, `EXAMPLES.md`, all 3 agent templates + `agent-instructions-shared.md`, `CATALOG_SHAPE.md`, `DERIVATION_RULES.md`, `DISAGREEMENT_RESOLUTION.md`, `derive.js`, `verify.js`, `cross-check.js`, `validate-catalog.js`, the build-enums script. **Does NOT cross:** `scope.json` (project-scoped), `settings.json` hook wiring (project-scoped), `.husky/pre-commit` (project-scoped). | Matches schema's own `source_scope` semantics — universal mirrors, project stays local. |
| D8.6 | **`SONASH_MIRROR_DELTA.md` staging artifact produced this session**, under `.planning/piece-3-labeling-mechanism/structural-fix/`. Lists Q8.5 artifacts + diff summary + porting notes. Piece 5.5 session consumes it.                | Context is fresh; saves Piece 5.5 session half its work; matches `feedback_pre_analysis_before_port`. |

---

## Category 11 — Validation tooling updates

| ID   | Decision                                                                                                                            | Rationale                                                                  |
| ---- | ----------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------- |
| D5.6 | **`verify.js` strip-before-validate removed.** Validates raw agent output against v1.3.                                             | Per D2.2; no band-aid.                                                      |
| D5.7 | **`cross-check.js` strip-before-validate removed.** Parallel to verify.js.                                                         | Parallel to verify.js.                                                      |
| D5.8 | **`validate-catalog.js` single-path validation against v1.3.** v1.2-stamped records pass by additive compatibility. `schema_version` is informational. | Simplest; honors D3.7 gradual-upgrade promise. |

---

## Category 12 — Orchestration scale-up

| ID   | Decision                                                                                                                                                                                                                                         | Rationale                                                                                                                                     |
| ---- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| D6.4 | **50KB byte-weighted batching** (same as S10). Expected ~45 batches, ~90 agents.                                                                                                                                                                | Proven scale; agent context safe.                                                                                                             |
| D6.5 | **Sequential batch execution — one batch at a time.** Expected ~90 min wall-clock. **Flipped from earlier 3-concurrent recommendation after user asked "what's most accurate?"** Sequential maximizes observability and enables mid-run dispatch patches (how S10's 6 fixes were caught). | Accuracy > speed; sequential preserves the catch-and-patch window between batches that S10 demonstrated was necessary.                         |
| D6.6 | **Per-batch checkpoint** (`.claude/state/label-backfill-checkpoint.jsonl`). Resume-on-crash loses ≤1 batch.                                                                                                                                     | Natural orchestrator unit; minimum state churn.                                                                                                |
| D6.7 | **Hard 5-min per-agent timeout + auto-retry with narrower batch** on timeout.                                                                                                                                                                   | Concrete and testable; respects `feedback_agent_stalling_pattern` ("split into narrower scopes").                                              |
| D6.8 | **Split wrapper fixes** — schema rules live in `agent-instructions-shared.md` (D5.2); runtime guards (exists-check-before-hard-dep, content_hash omit) stay in `prompts.js`.                                                                    | Clean separation: schema with schema doc; runtime with dispatcher.                                                                             |

---

## Category 13 — Documentation sync

| ID   | Decision                                                                                                                                                                      | Rationale                                                                 |
| ---- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------- |
| D8.7 | **Full audit of 7 orphan READMEs + `OVERRIDE_CONVERSATION_EXAMPLES.md`** this session (~1 hr total). Each reconciled against Batch 2–7 decisions. | Authoritative docs; one-time cost prevents drift; matches D5.4 spirit.    |

---

## Cross-cutting invariants

1. **Schema-first authority.** When template and schema disagree, schema wins (D2.1, D2.3).
2. **No band-aids.** Strip-before-validate is dead (D5.6, D5.7). Post-hoc record surgery is dead (D6.1 full re-run).
3. **Observability > throughput.** Sequential batches (D6.5), per-batch checkpoint (D6.6), hard timeouts (D6.7).
4. **Three-layer architecture preserved** (D4 of parent plan): hook primary (D7.1–D7.4) + pre-commit gate (D7.5) + audit supplementary (D7.7).
5. **Negative-space scope + schema strictness + type-dependent naming** is the permanent foundation for Piece 5 `/sync` work.
6. **Cross-repo mirror operates on `source_scope` semantics** (D8.5) — universal crosses, project stays local.

---

## Summary totals

- **13 discovery categories** × **52 questions asked** = **58 locked decisions**
- 7 commits in logical groupings per D8.1 (+ 1 re-run promotion commit)
- ~45 back-fill batches × ~90 agents on the re-run
- Schema stays v1.3 (minor, additive); `scope.json` v1 → v2 (philosophy)
- Artifacts produced this session: DIAGNOSIS, DECISIONS, PLAN, SONASH_MIRROR_DELTA
