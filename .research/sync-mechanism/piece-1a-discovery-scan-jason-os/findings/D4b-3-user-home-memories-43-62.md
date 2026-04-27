# D4b-3: User-Home Memories Inventory (Indices 43–62)

**Agent:** D4b-3
**Profile:** codebase
**Date:** 2026-04-18
**Coverage:** 20 memory files from `C:/Users/<user>/.claude/projects/C--Users-<user>-Workspace-dev-projects-JASON-OS/memory/`
**Sub-batch indices:** 43–62

---

## Summary Table

| # | File | Type | Scope | Portability | has_canonical | originSessionId |
|---|------|------|-------|-------------|---------------|-----------------|
| 43 | feedback_project_scoped_over_global | feedback | user | portable | false | none |
| 44 | feedback_scope_drift_deep_research | feedback | user | portable | false | none |
| 45 | feedback_skills_in_plans_are_tool_calls | feedback | user | portable | false | none |
| 46 | feedback_sonarcloud_mark_as_safe | feedback | user | portable | false | 8e667a17 |
| 47 | feedback_statusline_rebuild_safety | feedback | user | portable-with-sanitization | false | f6ce3805 |
| 48 | feedback_testing_with_writes | feedback | user | portable | false | 142f84e3 |
| 49 | feedback_todo_graduation | feedback | user | portable | false | dbea5544 |
| 50 | feedback_user_action_steps | feedback | user | portable | false | none |
| 51 | feedback_workflow_chain | feedback | user | portable | false | none |
| 52 | feedback_worktree_guidance | feedback | user | portable | false | none |
| 53 | feedback_write_rejection_hard_stop | feedback | user | portable | false | none |
| 54 | project_cross_locale_config | project | project | not-portable | false | none |
| 55 | project_jason_os | project | project | not-portable | false | none |
| 56 | project_sync_mechanism_principles | project | project | not-portable | false | f6ce3805 |
| 57 | reference_pr_review_integrations | reference | user | portable | false | dbea5544 |
| 58 | t3_convergence_loops | reference | user | portable | false | none |
| 59 | user_communication_preferences | user | user | portable | **true** | none |
| 60 | user_creation_mindset | user | user | portable | false | none |
| 61 | user_decision_authority | user | user | portable | **true** | none |
| 62 | user_expertise_profile | user | user | portable | **true** | none |

**Canonical coverage this batch: 3/20 (15%)**
All 3 canonical matches are user/* files. Zero feedback/* files in this batch have canonical counterparts.

---

## Gap Summary

### Confirmed gaps (user-portable memories absent from canonical-memory):

| File | Why it matters |
|------|---------------|
| feedback_project_scoped_over_global | Universal Claude Code rule — touches every config/install operation |
| feedback_scope_drift_deep_research | Prevents a session-destroying mistake with deep-research |
| feedback_skills_in_plans_are_tool_calls | Core execution discipline for JASON-OS skill system |
| feedback_sonarcloud_mark_as_safe | Required for any SonarCloud-integrated project |
| feedback_statusline_rebuild_safety | Portable (with sanitization) — JASON-OS-specific details removable |
| feedback_testing_with_writes | Universal coding discipline |
| feedback_todo_graduation | Universal /todo integration pattern |
| feedback_user_action_steps | Universal execution discipline |
| feedback_workflow_chain | Defines the user's canonical meta-workflow |
| feedback_worktree_guidance | Applies to any Claude Code project using worktrees |
| feedback_write_rejection_hard_stop | Universal hook-rejection recovery protocol |
| reference_pr_review_integrations | User preference — applies across all projects |
| t3_convergence_loops | Tenet-level principle — more durable than feedback |
| user_creation_mindset | User identity — referenced by project_sync_mechanism_principles as load-bearing |

### Partial gaps (has_canonical=true but parity unverified):

| File | Concern |
|------|---------|
| user_communication_preferences | System-reminder shows 2-day-old; locale note (jbell/jason) may differ from canonical |
| user_decision_authority | System-reminder shows 2-day-old; verify bullet count/content vs canonical |
| user_expertise_profile | No status field vs status:active pattern in sibling user/* files — schema inconsistency |

---

## Learnings for Methodology

### Project-memory handling

The 3 `project_*` memories (`project_cross_locale_config`, `project_jason_os`, `project_sync_mechanism_principles`) share a clear classification pattern:

- **Type field is `project`** in all three frontmatters — explicit and consistent.
- **All are correctly absent from canonical-memory.** Project memories are JASON-OS-specific and should never be canonicalized as-is.
- **The pattern to flag for SoNash:** SoNash will have analogous `project_sonash.md` and project-specific memories with the same `type: project` field. Discovery agents for SoNash should apply the same `not-portable` classification and exclude them from canonical gap analysis — unless the content contains embedded portable principles (see below).

**Edge case: embedded portability.** Two project memories contain portable elements:
- `project_cross_locale_config`: The classification framework ("cumulative + non-reconstructable = git-tracked; session-scoped = local") is a portable methodology, even though the specific file list is project-specific.
- `project_sync_mechanism_principles`: The 6 design principles (especially Principles 1, 2, 3) are general enough to apply to any sync-mechanism project. They also explicitly list 5 memory cross-references (`user_creation_mindset`, `feedback_no_research_caps`, etc.) — the richest dependency graph of any file in this batch.

**Schema recommendation:** Add a `portable_elements` field to project-type entries to capture extractable principles that could inform future canonical memories.

### Unusual prefixes: the t3_ convention

`t3_convergence_loops.md` is the only file in the entire user-home memory directory with a `t3_` prefix. Findings:

- The `t3` prefix appears to indicate **Tenet #3** — a numbered design-philosophy taxonomy distinct from `feedback_*` (corrective lessons from incidents) and `reference_*` (lookup tables).
- Unlike `feedback_*` files, tenets do not describe a corrective incident. They articulate design philosophy and principles.
- The file has `type: reference` in frontmatter — the tenet convention is not expressed via `type: tenet`. The prefix IS the convention signal, not the type field.
- The `status: active` field in frontmatter is notable — it suggests tenets may have a lifecycle (active/deprecated/superseded) that feedback files don't explicitly track.
- **Implied siblings:** `t1_`, `t2_`, and potentially `t4_+` tenets may exist elsewhere or may not yet have been written. This suggests an in-progress taxonomy.
- **Relationship to feedback counterpart:** `feedback_convergence_loops_mandatory.md` IS in canonical-memory and covers the behavioral correction angle. `t3_convergence_loops.md` covers the design-philosophy angle (when/why). They are complementary, not duplicative. Both should be in canonical.
- **Schema recommendation:** Add a `prefix_convention` field to capture `feedback_`, `project_`, `reference_`, `t[N]_` prefixes as a formal taxonomy signal. The type field alone is insufficient — `t3_` has `type: reference` but is semantically distinct from `reference_pr_review_integrations.md`.

### Recent memories: structural differences

Three files were created in the last few days (2026-04-18 session, originSessionId f6ce3805): `feedback_statusline_rebuild_safety.md` and `project_sync_mechanism_principles.md`. Observations:

**`feedback_statusline_rebuild_safety.md` (f6ce3805, 2026-04-18):**
- Has `originSessionId` in frontmatter — a field present in ~40% of feedback files; older files more often lack it.
- Body structure uses a **Hard rules** subsection with numbered steps (1–6) — more granular than older files which use generic Why/How-to-apply.
- Contains Go-version pinning and build flag specifics (`go build -a`, `go 1.26`) — implementation detail level not seen in older feedback files.
- More operational/procedural than principle-level.

**`project_sync_mechanism_principles.md` (f6ce3805, 2026-04-18):**
- Has explicit `Memory links:` section naming 5 other memory files by filename — this is new convention not seen in any other file in this batch.
- Contains a design-reversal note ("Previous draft had JASON-OS as workshop... WRONG. Corrected 2026-04-18") — documents mid-project correction in the memory itself.
- Principle 4 (symmetric peer architecture) is the most architecturally significant finding in the entire batch.

**`project_sync_mechanism_principles.md` vs `feedback_statusline_rebuild_safety.md` — same originSessionId:**
Two files from the same session (f6ce3805) have quite different maturity levels: the principles file is high-level strategic; the statusline file is low-level operational. Same session can produce both types.

**General recency pattern:** More recent files tend to have:
- `originSessionId` present (older files more often lack it)
- `status: active` field in frontmatter (older user/* files inconsistently have this)
- More structured body with named subsections (Hard rules, Memory links, When to consult)
- Higher specificity in examples (session IDs, specific filenames, dates)

**`feedback_explain_before_decide` and `feedback_no_blanket_count_labels`** were listed in MEMORY.md's header index but are NOT in the 20 files assigned to this agent — they appear to be in D4b-1 or D4b-2's batch.

### Frontmatter schema drift

Three distinct frontmatter patterns observed across this batch:

**Pattern A — minimal (older):** `name`, `description`, `type` only
- Examples: feedback_project_scoped_over_global, feedback_scope_drift_deep_research, user_creation_mindset

**Pattern B — extended (newer user/* files):** adds `status: active`
- Examples: user_communication_preferences, user_decision_authority, t3_convergence_loops

**Pattern C — fully attributed (newest):** adds `originSessionId`
- Examples: feedback_statusline_rebuild_safety, project_sync_mechanism_principles, feedback_sonarcloud_mark_as_safe

Mixed: `user_expertise_profile` has `type: user` but no `status` field — inconsistent with its siblings (user_communication_preferences and user_decision_authority both have `status: active`). This is a schema drift gap.

### The reference_* pattern

`reference_pr_review_integrations.md` is the only `reference_*`-prefixed file in this batch. It differs from `t3_*` (tenet philosophy) in that it is a lookup/preference table, not a design principle. The `type: reference` field is shared between these two conceptually distinct categories. Prefix is the only reliable discriminator.

### High-value gap for immediate canonical addition

`user_creation_mindset.md` is explicitly referenced by name in `project_sync_mechanism_principles.md`'s Memory links section — it is load-bearing for the current project's design philosophy. Its absence from canonical-memory means any new session without MEMORY.md context will miss a core user value. This is the highest-priority gap in this batch.

---

## Confidence Assessment

- All findings based on direct file reads — HIGH confidence throughout.
- Canonical gap analysis based on exact filename matching against the confirmed canonical-memory directory listing.
- The t3_ tenet-numbering interpretation is inferred from context (no documentation of the convention found) — MEDIUM confidence on the "Tenet #3" interpretation; HIGH confidence that it is a distinct prefix category.
- Implied sibling tenets (t1_, t2_) are speculative — LOW confidence, requires cross-batch verification.
