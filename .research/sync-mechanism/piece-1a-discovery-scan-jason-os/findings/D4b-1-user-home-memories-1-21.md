# D4b-1: User-Home Memories Inventory (Files 1–21)

**Agent:** D4b-1
**Date:** 2026-04-18
**Source:** `~/.claude/projects/C--Users-<user>-Workspace-dev-projects-JASON-OS/memory/`
**Canonical set:** `.claude/canonical-memory/` (12 files)
**Files scanned:** 21

---

## Summary Table

| # | Filename | memory_type | has_canonical | portability |
|---|----------|-------------|---------------|-------------|
| 1 | MEMORY.md | user (index) | true | sanitize-then-portable |
| 2 | feedback_ack_requires_approval.md | feedback | false | portable |
| 3 | feedback_agent_config_revert_hazard.md | feedback | false | portable |
| 4 | feedback_agent_hot_reload.md | feedback | false | portable |
| 5 | feedback_agent_output_files_empty.md | feedback | false | sanitize-then-portable |
| 6 | feedback_agent_stalling_pattern.md | feedback | false | portable |
| 7 | feedback_agent_teams_learnings.md | feedback | true | portable |
| 8 | feedback_code_review_patterns.md | feedback | true | portable |
| 9 | feedback_commit_hook_state_files.md | feedback | false | sanitize-then-portable |
| 10 | feedback_convergence_loops_mandatory.md | feedback | true | portable |
| 11 | feedback_deep_plan_hook_discovery_process.md | feedback | false | portable |
| 12 | feedback_deep_plan_qa_format.md | feedback | false | portable |
| 13 | feedback_deep_plan_research_check.md | feedback | false | portable |
| 14 | feedback_deep_research_formula.md | feedback | false | portable |
| 15 | feedback_deep_research_phases_mandatory.md | feedback | false | portable |
| 16 | feedback_dont_over_surface.md | feedback | false | portable |
| 17 | feedback_execution_failure_recovery.md | feedback | true | portable |
| 18 | feedback_explain_before_decide.md | feedback | false | portable |
| 19 | feedback_grep_vs_understanding.md | feedback | false | portable |
| 20 | feedback_interactive_gates.md | feedback | false | portable |
| 21 | feedback_never_bulk_accept.md | feedback | false | portable |

**Gap summary:** 16 of 21 files are NOT in canonical (has_canonical: false).
**Canonical matches in this batch:** 5 — MEMORY.md, feedback_agent_teams_learnings, feedback_code_review_patterns, feedback_convergence_loops_mandatory, feedback_execution_failure_recovery.

---

## Canonical Set Cross-Reference

The canonical set contains 12 files. Of those 12:
- 5 appear in this batch (see above)
- 7 are not in this batch and will appear in D4b-2/D4b-3 or not at all in user-home:
  - feedback_no_preexisting_rejection.md
  - feedback_parallel_agents_for_impl.md
  - feedback_verify_not_grep.md
  - session-end-learnings.md
  - user_communication_preferences.md
  - user_decision_authority.md
  - user_expertise_profile.md

**Notable:** `feedback_verify_not_grep.md` is in canonical but user-home has the broader `feedback_grep_vs_understanding.md` — different filenames, overlapping content. These are not duplicates: grep_vs_understanding covers 3 anti-patterns; verify_not_grep likely focuses on the verification theater pattern specifically.

---

## Notable Findings

### Redundancy cluster: interactive-gates / ack / bulk-accept
Three files cover overlapping territory around "wait for user input":
- `feedback_ack_requires_approval.md` (813 bytes) — state-modification without approval
- `feedback_interactive_gates.md` (1412 bytes) — superset: 3 rules including ack + bulk-accept
- `feedback_never_bulk_accept.md` (1015 bytes) — bulk-accept alone

Same incident (user said "A" → Claude bulk-accepted 7 questions) appears in both feedback_interactive_gates and feedback_never_bulk_accept. Consolidation candidate for canonical: one `feedback_interactive_gates.md` with all three sub-rules, deprecating the two narrower files.

### Frontmatter quality gap
Files with canonical counterparts use filename-slug as the `name` field (e.g., `"name": "feedback_agent_teams_learnings"` instead of a display name). Non-canonical files use proper display names (`"name": "Agent config file revert hazard"`). This inconsistency suggests the canonical-promoted files were written in an earlier style before display-name convention was established.

### Machine-scoped outlier
`feedback_agent_output_files_empty.md` is the only machine-scoped memory in this batch — Windows-specific symlink bug, home locale vs work locale distinction. The mitigation pattern (check task-notification result) is portable but the diagnostic context is not.

### Project-scoped outlier
`feedback_commit_hook_state_files.md` references specific JASON-OS file paths (`.claude/state/hook-warnings-log.jsonl`, `docs/AI_REVIEW_LEARNINGS_LOG.md`). These file paths may not exist in SoNash or other targets. The principle is portable; the specific file list requires sanitization.

### originSessionId as quality signal
4 of 21 files have `originSessionId` frontmatter (feedback_agent_hot_reload, feedback_deep_plan_qa_format, feedback_explain_before_decide, feedback_grep_vs_understanding, feedback_interactive_gates). These tend to be larger, better-structured files with clearer "Why/How-to-apply" sections. Consider making originSessionId a schema recommendation for new memories.

---

## Learnings for Methodology

### Agent sizing
21 memories in one agent was right-sized — all reads completed in a single parallel batch plus one file-size bash call. The bottleneck was not reading (all done in parallel) but composition time for 21 JSONL objects. For SoNash's 83 memories, I recommend splitting into 4 agents of ~20-21 each (matching this sizing) rather than 3 of ~28. The 21-file limit kept composition manageable without context pressure.

### Classification heuristics
The 4-type taxonomy (user/feedback/project/reference) mapped cleanly for all 21 files — no taxonomy strain. All 20 non-index files are `feedback`. The MEMORY.md index itself is ambiguous: it is a project artifact (project-scoped content, references 60+ files by name) but functions as a `user` index document. Recommend adding an `index` subtype or treating index files as their own category rather than forcing into user/feedback/project/reference.

Scope mapping was the harder call:
- `feedback` → `universal` by default (behavioral rules apply everywhere)
- Exception: `feedback_agent_output_files_empty` → `machine` (Windows-specific)
- Exception: `feedback_commit_hook_state_files` → `project` (JASON-OS paths)
- Exception: `feedback_explain_before_decide` → `user` (user-specific expertise trigger)

The scope field disambiguates what the memory_type field cannot: two `feedback` memories can have very different portability profiles.

### Gap analysis (canonical vs user-home)
**16 of 21 are missing from canonical.** That is a 76% gap rate. Key patterns in what's missing:

1. **Skill-methodology memories** — deep_plan_hook_discovery, deep_plan_qa_format, deep_plan_research_check, deep_research_formula, deep_research_phases_mandatory. These are all operational learnings about how to run skills correctly. Five files, zero canonical counterparts. This is the largest thematic gap.

2. **Agent-behavior memories** — ack_requires_approval, agent_config_revert_hazard, agent_hot_reload, agent_output_files_empty, agent_stalling_pattern. Platform-behavior and agent-operation rules. Five files, zero canonical counterparts.

3. **Communication/surface memories** — dont_over_surface, explain_before_decide, interactive_gates, never_bulk_accept, ack_requires_approval. These overlap with the user-interaction domain. Partially captured in canonical via feedback_interactive_gates being absent but three related files present.

**Pattern conclusion:** The canonical set appears to have been seeded with "foundational" behavioral rules (convergence loops, execution recovery, parallel agents, code review) but missed the full sweep of skill-operational and agent-behavior learnings. Those were likely added to user-home after the canonical seed was created — temporal gap in promotion.

### Schema-field candidates
Beyond type/scope/portability + has_canonical, these fields emerged as useful:

1. **`originSessionId`** — present in 5 files; enables tracing a memory to its originating session for audit/context. Recommend adding to schema spec.
2. **`status`** — present in 6 files with value 'active'; useful for deprecation/archival lifecycle. Recommend adding with values: `active|deprecated|merged|tentative`.
3. **`superseded_by`** — not present but needed: redundancy cluster (ack/interactive-gates/bulk-accept) needs a way to mark narrower files as superseded when consolidated.
4. **`related_memories`** — feedback_explain_before_decide already cross-references 3 other memories inline. Making this structured (array of filenames) would enable graph traversal for sync tooling.
5. **`incident_session`** — some memories reference session numbers (#235, #244) as evidence. Capturing this as structured metadata rather than inline prose would improve auditability.

### Adjustments recommended for SoNash memory scan
SoNash has 83 user-home memories — approximately 4x this batch size.

1. **Split into 4 agents of ~21 files each.** Do not do 3×28; the 21-file ceiling kept composition clean. Use D4b-1 through D4b-4 with 21/21/21/20 splits.

2. **Pre-sort by filename prefix before splitting.** SoNash likely has more `user_*` and `project_*` files mixed in with `feedback_*`. Grouping by prefix gives each agent a cleaner thematic scope and reduces cross-agent redundancy detection work.

3. **Add a redundancy-detection pass as a separate agent.** This batch found a 3-way redundancy cluster (ack/interactive-gates/bulk-accept). With 83 memories, expect 5-10 such clusters. Dispatch a dedicated D4b-merge agent after all 4 scan agents complete, tasked only with cross-referencing for consolidation candidates.

4. **Expect more project-scoped memories in SoNash.** JASON-OS is a relatively new project (bootstrap phase), so most memories are universal behavioral rules. SoNash has deeper history and specific infrastructure (statusline, dashboard, SonarCloud hotspot workflows, etc.). Anticipate 10-15 project-scoped memories that are `not-portable` to JASON-OS — flag these clearly in the has_canonical field notes.

5. **Check for `feedback_statusline_rebuild_safety.md`** in SoNash — it appears in the JASON-OS MEMORY.md index but was not in the 21 files assigned to this agent. It's likely SoNash-origin (statusline is a SoNash artifact). Flag as `not-portable` if found.

6. **Note the frontmatter quality gap.** Older memories (those with canonical counterparts) use filename-slug as `name`. This means canonical files may need a name field cleanup pass. Include a name-quality check in the SoNash scan schema.
