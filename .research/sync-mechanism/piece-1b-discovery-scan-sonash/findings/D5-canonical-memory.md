# D5: Canonical Memory Inventory + Gap Analysis — SoNash

**Agent:** D5
**Profile:** codebase
**Date:** 2026-04-18
**Scope:** `.claude/canonical-memory/` (SoNash) + user-home memory dir gap analysis

---

## Summary Numbers

| Metric | Count |
|--------|-------|
| Canonical files (incl. MEMORY.md) | 25 |
| Canonical memory files (excl. MEMORY.md) | 24 |
| User-home files (incl. MEMORY.md) | 83 |
| User-home memory files (excl. MEMORY.md) | 82 |
| Files in BOTH dirs | 23 (22 memories + MEMORY.md) |
| Canonical-only files | 2 |
| User-home files WITHOUT canonical counterpart | 60 |
| Canonical gap count | 60 of 82 user-home memories (73.2%) |
| Files with byte-identical content | 0 (all 23 shared files differ) |
| Files with formatting-only drift | 13 |
| Files with substantive content drift | 10 |
| Files with material staleness (operationally wrong) | 3 |

---

## Part 1: Canonical Inventory Taxonomy

The 24 canonical memory files (excluding MEMORY.md) divide as follows:

### User-type memories (3 files)
- `user_communication_preferences.md` — portable
- `user_decision_authority.md` — portable
- `user_expertise_profile.md` — portable but CRITICALLY STALE (wrong framing)

### Feedback-type memories (11 files)
- `feedback_agent_teams_learnings.md` — portable, substantively evolved in user-home
- `feedback_code_review_patterns.md` — portable, minor content addition in user-home
- `feedback_convergence_loops_mandatory.md` — portable, formatting drift only
- `feedback_deep_plan_hook_discovery_process.md` — portable, formatting drift only
- `feedback_execution_failure_recovery.md` — portable, formatting drift only
- `feedback_no_preexisting_rejection.md` — portable, formatting drift only
- `feedback_parallel_agents_for_impl.md` — **CANONICAL-ONLY** (absorbed into user-home agent_teams file)
- `feedback_pr_review_state_files.md` — portable, missing cross-locale git-commit rule
- `feedback_stale_reviews_dist.md` — **OPERATIONALLY STALE** (references removed command)
- `feedback_sws_is_meta_plan.md` — SoNash-specific, formatting drift only
- `feedback_verify_not_grep.md` — **CANONICAL-ONLY** (renamed to feedback_grep_vs_understanding in user-home)

### Project-type memories (6 files)
- `project_active_initiatives.md` — SoNash-specific, heavily stale (~40 sessions behind)
- `project_agent_env_analysis.md` — SoNash-specific, status wrong (shows active, actually complete)
- `project_cross_locale_config.md` — sanitize-then-portable, substantial content gap
- `project_hook_contract_canon.md` — SoNash-specific, formatting drift only
- `sws_session221_decisions.md` — SoNash-specific, formatting drift only
- `t3_convergence_loops.md` — portable concept, missing advanced patterns section

### Reference-type memories (4 files)
- `reference_ai_capabilities.md` — sanitize-then-portable, ~44 sessions stale on capability counts
- `reference_documentation_standards.md` — portable, formatting drift only
- `reference_external_systems.md` — not-portable (URLs), formatting drift only
- `reference_tdms_systems.md` — not-portable (TDMS), formatting drift only

---

## Part 2: Gap Analysis

### Canonical Gap: 60 of 82 user-home memories have no canonical counterpart (73.2%)

This significantly exceeds the JASON-OS pattern from Piece 1a (50 of 60 = 83%). SoNash has more total user-home memories and the canonical set covers a smaller fraction (27% vs 17% in JASON-OS — SoNash canonical is proportionally slightly better but still severely incomplete).

### User-Home Files WITHOUT a Canonical Counterpart (60 files)

#### Feedback-type gaps (37 files) — sorted by priority

**Priority HIGH (portable, critical behavioral rules):**
1. `feedback_agent_config_revert_hazard.md` — spawned agents silently revert shared configs
2. `feedback_agent_stalling_pattern.md` — subagents stall on 16+ files
3. `feedback_deep_plan_qa_format.md` — Q&A format for clarifying questions (corrected 3x)
4. `feedback_deep_plan_research_check.md` — never skip Phase 0 Step 3 research offer
5. `feedback_deep_research_formula.md` — formula is floor, not ceiling
6. `feedback_deep_research_phases_mandatory.md` — Phases 3-5 mandatory
7. `feedback_grep_vs_understanding.md` — RENAME of canonical feedback_verify_not_grep.md (broader framing)
8. `feedback_interactive_gates.md` — hard stop at choice prompts, never bulk-accept
9. `feedback_no_autonomous_deferrals.md` — never defer without explicit user decision
10. `feedback_no_incomplete_agent_findings.md` — never accept partial agent data
11. `feedback_no_silent_deferrals_execution.md` — never mark step done while skipping sub-items
12. `feedback_no_silent_skill_failures.md` — detect, retry, report — never silently skip
13. `feedback_scope_drift_deep_research.md` — research user's goal not sub-component
14. `feedback_skills_in_plans_are_tool_calls.md` — slash commands in plans = tool invocations
15. `feedback_testing_with_writes.md` — every code change needs its own tests
16. `feedback_user_action_steps.md` — prompt user for install/auth steps
17. `feedback_workflow_chain.md` — brainstorm -> deep-research -> deep-plan -> execute
18. `feedback_write_rejection_hard_stop.md` — hook-rejected Write = immediate retry

**Priority MEDIUM (portable, process discipline):**
19. `feedback_adoption_verdict_in_creator_view.md`
20. `feedback_commit_hook_state_files.md`
21. `feedback_learnings_must_complete.md`
22. `feedback_no_agent_budgets.md`
23. `feedback_no_artificial_caps.md`
24. `feedback_no_auto_debt_routing.md` (partially SoNash-specific)
25. `feedback_no_broken_widgets.md`
26. `feedback_no_premature_next_steps.md`
27. `feedback_no_stale_ci_assumption.md`
28. `feedback_no_unnecessary_brainstorming.md`
29. `feedback_permissions_cleanup.md`
30. `feedback_precommit_fixer_report.md`
31. `feedback_statusline_rebuild_safety.md` (partially SoNash-specific)
32. `feedback_worktree_guidance.md`

**Priority LOW:**
33. `feedback_no_blanket_count_labels.md`
34. `feedback_repo_analysis_knowledge_gap.md` (SoNash-specific)
35. `feedback_repo_analysis_phase_ordering.md` (SoNash-specific)
36. `feedback_routing_menu_value.md`
37. `feedback_tdms_intake_path.md` (SoNash TDMS-specific)

#### Project-type gaps (18 files)

**Portable pattern (high priority for cross-project learning):**
- `project_multi_layer_memory.md` — multi-layer memory architecture (highly relevant to JASON-OS)
- `project_contrarian_agent_design.md` — design decisions for contrarian agent pattern
- `project_hook_if_research.md` — hook if-condition research

**SoNash-specific (low portability):**
- `project_analysis_synthesis_comparison.md`
- `project_codex_plugin_research.md`
- `project_debt_runner_expansion.md`
- `project_github_health_research.md`
- `project_jason_os.md` (JASON-OS state tracked from SoNash perspective)
- `project_learning_system_analysis.md`
- `project_repo_analysis_skill.md`
- `project_repo_analysis_v42.md`
- `project_reviews_system_health.md`
- `project_skill_audit_tracking_broken.md`
- `project_sonarcloud_disabled.md`
- `project_sonash_identity.md`
- `project_t28_content_intelligence.md`
- `project_t29_synthesis_consolidation.md`
- `project_website_analysis_skill.md`

#### Reference-type gaps (3 files)
- `reference_extraction_journal.md` — sanitize-then-portable
- `reference_pre_push_skip_vars.md` — sanitize-then-portable
- `reference_statusline_architecture.md` — sanitize-then-portable

#### User-type gaps (2 files)
- `user_creation_mindset.md` — **HIGH PRIORITY** — creates for joy not shipping; critical framing
- `user_os_vision.md` — **HIGH PRIORITY** — primary goal is JASON-OS OS; SoNash is secondary

---

## Part 3: Canonical-Only Files (Reverse Gap)

Two canonical files have NO user-home counterpart:

| File | Explanation |
|------|-------------|
| `feedback_parallel_agents_for_impl.md` | Content was absorbed into user-home `feedback_agent_teams_learnings.md` — canonical has a standalone file that user-home merged into a combined file. Canonical is orphaned. |
| `feedback_verify_not_grep.md` | User-home renamed this to `feedback_grep_vs_understanding.md` with broader framing. Canonical still has the old name. The canonical file is a stale/superseded version of the user-home equivalent. |

Both represent canonical-level technical debt: the canonical set has files whose user-home evolution diverged in structure (merge vs. standalone, rename vs. same name).

---

## Part 4: Drift Findings

All 23 shared files differ. Drift falls into three categories:

### Category A: Formatting-only drift (13 files)
Content is semantically equivalent; differences are YAML multi-line vs single-line description, line wrapping (80-char canonical vs single long lines in user-home), prose name field vs slug name field, trailing blank lines.

Files: `feedback_convergence_loops_mandatory`, `feedback_deep_plan_hook_discovery_process`, `feedback_execution_failure_recovery`, `feedback_no_preexisting_rejection`, `feedback_sws_is_meta_plan`, `project_hook_contract_canon`, `reference_documentation_standards`, `reference_external_systems`, `reference_tdms_systems`, `sws_session221_decisions`, `t3_convergence_loops` (plus content addition), `user_communication_preferences`, `user_decision_authority`

The formatting difference reveals a schema evolution: user-home adopted single-line YAML descriptions and prose name fields (more readable in Claude's context window). Canonical uses multi-line wrapped YAML (prettier-friendly). This is a systematic formatting divergence, not content divergence.

### Category B: Substantive content additions in user-home (7 files)

| File | Gap in Canonical |
|------|-----------------|
| `feedback_agent_teams_learnings` | User-home merged parallel-agents content; added return protocol and background-agent guidance |
| `feedback_code_review_patterns` | User-home adds "no PR until all work complete" rule (PR #457 evidence) |
| `feedback_pr_review_state_files` | User-home adds cross-locale git-commit requirement (PR #453 R3 incident) |
| `project_cross_locale_config` | User-home adds state file classification framework, branch-specific artifacts lesson, CL-verified analysis |
| `project_active_initiatives` | User-home reflects Session #269 state (40 sessions of evolution vs canonical's ~Session #225) |
| `reference_ai_capabilities` | User-home adds 38 agents, 72 skills, Context7 GSD deployment, AutoDream, teams infrastructure |
| `t3_convergence_loops` | User-home adds advanced convergence patterns section from 5-pass PLAN-v3.md rebuild |

### Category C: Operationally wrong / harmful staleness (3 files)

These are the highest-priority fixes:

**1. `feedback_stale_reviews_dist.md` (CRITICAL)**
- Canonical says: `npm run reviews:generate`
- Reality: This command was **REMOVED** as of 2026-03-25
- Correct command: `npm run reviews:render`
- Following canonical would cause a hard failure

**2. `user_expertise_profile.md` (CRITICAL FRAMING ERROR)**
- Canonical says: "Deep Node.js/scripting/infrastructure expertise"
- Reality: User is a **no-code orchestrator** who builds through AI orchestration; explicitly corrected 2026-04-05
- Consequence: Using canonical would cause AI to recommend tools based on language stack rather than ease/quality
- This is the most semantically harmful drift

**3. `project_agent_env_analysis.md` (STATUS WRONG)**
- Canonical says: "Phase 4 NEXT" (in-progress)
- Reality: **COMPLETE** — all 5 phases done, Session #236, PR #465 merged
- Using canonical would cause re-planning of completed work

---

## Part 5: MEMORY.md Index Staleness

### Canonical MEMORY.md
- **Status: STALE but internally consistent**
- Lists all 24 non-MEMORY.md canonical files via links — no broken links, no unlisted files
- Exception: `sws_session221_decisions.md` and `t3_convergence_loops.md` appear as Project section entries in canonical MEMORY.md; user-home MEMORY.md does NOT list either (they exist in user-home dir but are unlisted there)
- Canonical MEMORY.md has 4 sections: User (3), Feedback (11), Project (6), Reference (4) — totaling 24 links
- Represents ~Session #225 state (approximately Session #225 based on references like "first real usage with 4-member research-team" in agent_teams)

### User-Home MEMORY.md
- **Status: STALE — 10 files in dir unlisted**
- Has 85 lines vs canonical's 72
- Lists 73 files (via links)
- 10 files in user-home dir NOT listed in user-home MEMORY.md:
  1. `feedback_repo_analysis_knowledge_gap.md`
  2. `project_agent_env_analysis.md`
  3. `project_analysis_synthesis_comparison.md`
  4. `project_contrarian_agent_design.md`
  5. `project_github_health_research.md`
  6. `project_hook_if_research.md`
  7. `project_multi_layer_memory.md`
  8. `project_repo_analysis_skill.md`
  9. `sws_session221_decisions.md`
  10. `t3_convergence_loops.md`
- No broken links (all links point to existing files)
- `sws_session221_decisions.md` and `t3_convergence_loops.md` exist in user-home dir but are NOT listed in user-home MEMORY.md — suggesting they were added to the dir without updating the index

### MEMORY.md Staleness Verdict
- Canonical MEMORY.md: **INTERNALLY CONSISTENT** but ~44 sessions stale relative to user-home state
- User-home MEMORY.md: **10 FILES UNLISTED** — index lags behind dir contents

---

## Learnings for Methodology

**1. Name-field divergence is systematic, not random**
The canonical MEMORY.md uses slug-style name fields (e.g., `feedback_verify_not_grep`) while user-home uses prose names (e.g., `Never reject review items as pre-existing`). This is a deliberate evolution — prose names read better in Claude's context window. A sync mechanism needs a name-normalization step, not just a content merge.

**2. "Both exist" does not mean "in sync"**
Every single one of the 23 shared files differs. The canonical set is not a subset of user-home — it's a snapshot at a prior point. A sync mechanism cannot assume canonical = truth; canonical = last committed state.

**3. Rename divergence is the hardest gap type**
`feedback_verify_not_grep.md` (canonical) vs `feedback_grep_vs_understanding.md` (user-home) is a rename. The canonical file has no user-home counterpart by name but there IS a semantic equivalent. A filename-match gap analysis (like this one) will miss the semantic equivalence. The sync mechanism needs a semantic deduplication step for these renames.

**4. Merge divergence: one canonical file for two separate user-home files**
`feedback_parallel_agents_for_impl.md` (canonical standalone) was absorbed into `feedback_agent_teams_learnings.md` (user-home merged). The canonical gap analysis shows parallel_agents_for_impl has no user-home counterpart — correct — but the inverse is also true: the user-home agent_teams file has no canonical counterpart that reflects its merged scope. A sync mechanism needs to handle file merges, not just file additions.

**5. Status fields on project-type memories decay rapidly**
Project memories like `project_active_initiatives.md` and `project_agent_env_analysis.md` become wrong within weeks. A sync mechanism should flag project-type memories as high-staleness-risk and require recency verification before accepting canonical as source-of-truth.

**6. Two canonical-only files are de facto obsolete**
`feedback_parallel_agents_for_impl.md` and `feedback_verify_not_grep.md` exist in canonical but not in user-home (by name). Before porting canonical to JASON-OS, these should be evaluated: parallel_agents should be superseded by the merged user-home version; verify_not_grep should be replaced by the renamed user-home version.

**7. MEMORY.md indices are second-class citizens**
Both MEMORY.md files are stale in different ways. Canonical is complete but outdated; user-home is current but has 10 unlisted files. The MEMORY.md is clearly written by hand and lags behind actual dir contents. Any sync tooling should auto-regenerate MEMORY.md from dir contents + frontmatter, not rely on manual maintenance.

**8. originSessionId is a user-home-only field**
Only user-home files have `originSessionId` in frontmatter. Canonical files never set this field. The schema spec allows it for memory files — but the canonical authoring process doesn't capture it. This is a provenance gap in canonical.

---

## Gaps and Missing References

1. **Semantic equivalence not captured**: The rename `feedback_verify_not_grep` -> `feedback_grep_vs_understanding` is detected as a canonical-only file and a gap file, but the semantic link is not formally recorded. D23 (memory graph) should handle this.

2. **Canonical commit timestamps not checked**: This scan identified approximate session numbers from content evidence but did not retrieve git log timestamps for canonical files. A git-log pass on `.claude/canonical-memory/` would give exact commit dates for staleness calculation.

3. **User-home file creation dates not available**: The user-home dir is not git-tracked, so there is no way to determine when each gap file was created relative to the canonical set without parsing file content for session references.

4. **No content read on gap files**: The 60 gap files were enumerated but not read. D4a-d cover user-home memories, so those records will have full content. D5 gap analysis relies on filename inference for portability/priority — D4a-d findings should be cross-referenced for content-level portability assessment.

5. **Canonical MEMORY.md section for 'sws' and 't3' is ambiguous**: Both files appear in canonical MEMORY.md as Project section entries and exist in both dirs, but user-home MEMORY.md does not list them. It is unclear whether these were omitted from user-home MEMORY.md intentionally or by oversight.
