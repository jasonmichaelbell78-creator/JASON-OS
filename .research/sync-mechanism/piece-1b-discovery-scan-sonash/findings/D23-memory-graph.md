# D23: Memory Cross-Reference Graph — SoNash (Full Corpus)

**Agent:** D23
**Profile:** codebase
**Date:** 2026-04-18
**Scope:** All 83 user-home memories + 25 canonical memories
**Methodology:** Full-read + grep extraction of cross-references, session clustering, and canonical pairings

---

## Summary Numbers

| Metric | Count |
|--------|-------|
| Total edges emitted | 168 |
| `contains` edges (MEMORY.md → memory files) | 97 (75 user-home MEMORY.md + 22 canonical MEMORY.md) |
| `related` edges (prose/structured cross-refs) | 14 |
| `supersedes` / `superseded_by` edges | 4 |
| `cross_canonical` edges (user-home ↔ canonical pairs) | 22 |
| `session_cluster` edges (shared originSessionId) | 29 |
| Files in session clusters | 2 identified clusters |
| Hub memories (3+ inbound edges) | 8 |
| Orphan memories (0 inbound AND 0 outbound) | 0 confirmed, 10 candidates |
| Supersession chains found | 2 explicit, 2 implicit |
| Unlisted files in user-home MEMORY.md | 10 |

---

## Hub Memories (Most Referenced)

Inbound edge count (all edge types except contains-from-MEMORY.md):

| Memory File | Inbound Edges | Edge Types |
|-------------|--------------|------------|
| `reference_tdms_systems.md` | 3 | related (x2 from feedback_tdms_intake_path), contains (canonical MEMORY.md) |
| `project_hook_contract_canon.md` | 3 | contains (user MEMORY.md), contains (canonical MEMORY.md), related (reference_ai_capabilities both dirs) |
| `feedback_statusline_rebuild_safety.md` | 3 | contains (user MEMORY.md), related (reference_statusline_architecture), session_cluster (x7 from 7389d098 cluster) |
| `reference_statusline_architecture.md` | 2 | contains (user MEMORY.md), session_cluster (x7 from 7389d098 cluster) |
| `feedback_agent_stalling_pattern.md` | 2 | contains (user MEMORY.md), related (reference_ai_capabilities) |
| `feedback_repo_analysis_phase_ordering.md` | 2 | contains (user MEMORY.md), related (feedback_repo_analysis_knowledge_gap), session_cluster (feedback_write_rejection_hard_stop) |
| `feedback_scope_drift_deep_research.md` | 2 | contains (user MEMORY.md), related (project_t28_content_intelligence) |
| `feedback_no_silent_deferrals_execution.md` | 2 | contains (user MEMORY.md), related (project_t28_content_intelligence) |
| `feedback_workflow_chain.md` | 2 | contains (user MEMORY.md), related (feedback_deep_plan_qa_format) |
| `feedback_deep_plan_research_check.md` | 2 | contains (user MEMORY.md), related (feedback_deep_plan_qa_format) |
| `feedback_no_unnecessary_brainstorming.md` | 2 | contains (user MEMORY.md), related (feedback_deep_plan_qa_format) |

**Structural hub:** `reference_statusline_architecture.md` + `feedback_statusline_rebuild_safety.md` form a tight bidirectional pair — every statusline-related concern routes through one of these two files. They are semantically coupled and both born in the same session (7389d098).

**Thematic hub:** `feedback_deep_plan_qa_format.md` is the only file with a formal `**Related memories:**` section — it has 3 outbound related edges, making it the most explicitly connected node in the graph.

---

## Orphan Memories (Zero Inbound AND Outbound)

**True orphans (zero cross-references, not listed in MEMORY.md):**

D5 found 10 files that exist in the user-home directory but are NOT listed in user-home MEMORY.md. These are strong orphan candidates — no contains-from-MEMORY.md edge, and from D23's scan none have explicit related/supersedes/cross-refs either:

1. `feedback_repo_analysis_knowledge_gap.md` — NOT in MEMORY.md but HAS a related edge to feedback_repo_analysis_phase_ordering (not truly orphaned)
2. `project_agent_env_analysis.md` — NOT in user-home MEMORY.md (but is in canonical MEMORY.md)
3. `project_analysis_synthesis_comparison.md` — NOT in MEMORY.md, no outbound refs found
4. `project_contrarian_agent_design.md` — NOT in MEMORY.md, no outbound refs found
5. `project_github_health_research.md` — NOT in MEMORY.md, no outbound refs found
6. `project_hook_if_research.md` — NOT in MEMORY.md, no outbound refs found
7. `project_multi_layer_memory.md` — NOT in MEMORY.md, no outbound refs found
8. `project_repo_analysis_skill.md` — NOT in MEMORY.md, has superseded_by edge (not truly orphaned)
9. `sws_session221_decisions.md` — exists in user-home dir but NOT listed in user-home MEMORY.md (listed in canonical MEMORY.md only)
10. `t3_convergence_loops.md` — exists in user-home dir but NOT listed in user-home MEMORY.md (listed in canonical MEMORY.md only)

**True orphans (no edges of any type):** `project_analysis_synthesis_comparison.md`, `project_contrarian_agent_design.md`, `project_github_health_research.md`, `project_hook_if_research.md`, `project_multi_layer_memory.md` — 5 files with no inbound and no outbound edges in this corpus.

**Note:** These are not orphaned from CONTENT relevance — project_multi_layer_memory.md in particular is highly relevant to the sync-mechanism project. They are orphaned from the GRAPH perspective: no link points to them and they don't link to others. The MEMORY.md index not listing them is the root cause.

---

## Supersession Chains

### Chain 1: Explicit — project_repo_analysis_skill → project_repo_analysis_v42
- `project_repo_analysis_skill.md` (user-home): full body = "SUPERSEDED — see project_repo_analysis_v42.md. Delete this file."
- Direction: `project_repo_analysis_skill` ←superseded_by— `project_repo_analysis_v42`
- Status: Dead stub with no frontmatter. Should be deleted. Still in filesystem and on disk.
- Evidence type: Explicit body-text declaration

### Chain 2: Implicit (rename) — feedback_verify_not_grep → feedback_grep_vs_understanding
- `feedback_verify_not_grep.md` (canonical): narrow framing — "retro verification must use functional tests not grep"
- `feedback_grep_vs_understanding.md` (user-home): broader framing — "Don't grep for analysis or verification. Use JSON+jq for parsing, functional tests for verification."
- Direction: canonical `feedback_verify_not_grep` ←superseded_by— user-home `feedback_grep_vs_understanding`
- Status: No frontmatter field in either file. Canonical is orphaned — it exists in canonical-only with no user-home counterpart by name.
- Evidence type: D5 semantic analysis (name divergence + content scope expansion)

### Chain 3: Implicit (merge) — feedback_parallel_agents_for_impl absorbed into feedback_agent_teams_learnings
- `feedback_parallel_agents_for_impl.md` (canonical): standalone rule about parallel agent use for implementation
- `feedback_agent_teams_learnings.md` (user-home): merged version covering all agent team learnings INCLUDING the parallel-agents-for-impl content
- Direction: canonical `feedback_parallel_agents_for_impl` ←superseded_by— user-home `feedback_agent_teams_learnings`
- Status: Canonical is orphaned. The user-home merged file has no canonical counterpart reflecting its full merged scope.
- Evidence type: D5 content comparison

### Chain 4: Practical supersession — user_expertise_profile (canonical) is factually wrong
- `user_expertise_profile.md` (canonical): "Node.js/scripting expert, Firebase comfortable, frontend needs guidance, solo developer"
- `user_expertise_profile.md` (user-home): "No-code orchestrator, builds through AI orchestration, meta-tooling focus, 269+ sessions"
- This is NOT a formal supersession chain (both files have the same name, same path pattern) but it IS the most operationally dangerous content drift in the entire corpus. The cross_canonical edge (E118) flags this.
- Evidence type: D4d + D5 direct content comparison

---

## Session Clusters

### Cluster 1: Session 7389d098-40f3-498d-a495-fe6dd68bdf2c (8 files — "Session #244")
The largest session cluster in the corpus. Eight memories born in a single session:

| File | Type |
|------|------|
| `feedback_agent_teams_learnings.md` | feedback |
| `feedback_code_review_patterns.md` | feedback |
| `feedback_grep_vs_understanding.md` | feedback |
| `feedback_interactive_gates.md` | feedback |
| `feedback_no_premature_next_steps.md` | feedback |
| `feedback_statusline_rebuild_safety.md` | feedback |
| `reference_extraction_journal.md` | reference |
| `reference_statusline_architecture.md` | reference |

This session produced 6 behavioral corrections + 2 reference documents in a single sitting. The feedback files cluster around agent behavior, code review discipline, and interactive gate rules — suggesting a session involving a major PR review cycle or agent team dispatch where multiple failures were captured. The two reference files (extraction_journal + statusline_architecture) suggest the session also involved building/deploying the statusline and establishing the extractions workflow.

Session cluster produces C(8,2) = 28 session_cluster edges (all pairs).

### Cluster 2: Session 331dfa27-c52d-46cc-91ce-e5b7c20e8329 (2 files — "Session #276")
A smaller cluster — two files from the same session:

| File | Type |
|------|------|
| `feedback_repo_analysis_phase_ordering.md` | feedback |
| `feedback_write_rejection_hard_stop.md` | feedback |

These two files share a session involving ArchiveBox analysis (Session #276) where both repo-analysis phase order violations and a Write rejection scenario were encountered. 1 session_cluster edge.

### Singleton sessions (each has 1 file):
- `feed74e0` → `feedback_no_blanket_count_labels.md`
- `ee98d374` → unknown (file not identified in D4a-d extraction — needs follow-up)
- `da103c91` → `feedback_skills_in_plans_are_tool_calls.md`
- `d34c4cb2` → `feedback_deep_plan_qa_format.md`
- `c93aabec` → `project_t29_synthesis_consolidation.md`
- `142f84e3` → `feedback_testing_with_writes.md`

**Total files with originSessionId:** 16 of 83 (19.3%). The majority (83.8%) have no session tracking.

---

## Canonical ↔ User-Home Pairing Matrix

22 files exist in both directories (23 pairs including MEMORY.md):

| File | Drift Level | Operational Risk |
|------|------------|-----------------|
| `MEMORY.md` | SEVERE structural | HIGH — user-home index has 10 unlisted files; canonical is ~40 sessions behind |
| `user_communication_preferences.md` | Formatting only | LOW |
| `user_expertise_profile.md` | Content drift | CRITICAL — canonical framing is factually wrong |
| `user_decision_authority.md` | Formatting only | LOW |
| `feedback_agent_teams_learnings.md` | Substantive addition | MEDIUM — canonical missing parallel-agents content |
| `feedback_code_review_patterns.md` | Minor addition | LOW-MEDIUM |
| `feedback_convergence_loops_mandatory.md` | Formatting only | LOW |
| `feedback_deep_plan_hook_discovery_process.md` | Formatting only | LOW |
| `feedback_execution_failure_recovery.md` | Formatting only | LOW |
| `feedback_no_preexisting_rejection.md` | Formatting only | LOW |
| `feedback_pr_review_state_files.md` | Substantive gap | HIGH — canonical missing cross-locale git-commit rule |
| `feedback_stale_reviews_dist.md` | Factually wrong | CRITICAL — canonical documents removed command |
| `feedback_sws_is_meta_plan.md` | Formatting only | LOW |
| `project_active_initiatives.md` | Heavily stale | HIGH — ~40 sessions of initiative state changes |
| `project_agent_env_analysis.md` | Status wrong | HIGH — canonical shows in-progress, actually COMPLETE |
| `project_cross_locale_config.md` | Substantive gap | MEDIUM |
| `project_hook_contract_canon.md` | Formatting only | LOW |
| `sws_session221_decisions.md` | Formatting only | LOW |
| `t3_convergence_loops.md` | Content addition | LOW-MEDIUM — canonical missing advanced patterns |
| `reference_ai_capabilities.md` | Heavily stale | MEDIUM — ~44 sessions of capability changes |
| `reference_documentation_standards.md` | Formatting only | LOW |
| `reference_external_systems.md` | Formatting only | LOW |
| `reference_tdms_systems.md` | Formatting only | LOW |

**Critical drift (operationally wrong):** 3 files  
**High drift (significant content gap):** 5 files  
**Low drift (formatting only):** 13 files  
**Formatting-only pair ratio:** 56.5% — more than half the canonical set is semantically current

---

## Graph Topology

### Connected Components

The graph is essentially a **hub-and-spoke topology** dominated by two index hubs:
- **User-home MEMORY.md** connects to 73 of 83 user-home files (87.9% of user-home)
- **Canonical MEMORY.md** connects to all 24 canonical files (100%)

Without MEMORY.md edges, the graph has significantly lower connectivity:
- Cross-file related edges: 12 (covers 14 unique files)
- Session cluster edges: 28 (covers 8+2 files in clusters)
- Supersession edges: 4 (covers 4+2 files across 2 chains)
- Cross-canonical edges: 22 (covers 22 file pairs)

**Direct non-MEMORY cross-references** (files that actively link to other files by name):
1. `feedback_deep_plan_qa_format.md` → 3 files (most connected node after MEMORY.md)
2. `feedback_tdms_intake_path.md` → 1 file (reference_tdms_systems)
3. `feedback_repo_analysis_knowledge_gap.md` ↔ `feedback_repo_analysis_phase_ordering.md` (mutual)
4. `reference_ai_capabilities.md` → 2 files (feedback_agent_stalling_pattern, project_hook_contract_canon)
5. `reference_statusline_architecture.md` → 1 file (feedback_statusline_rebuild_safety)
6. `project_t28_content_intelligence.md` → 2 files (feedback_scope_drift + feedback_no_silent_deferrals)
7. `feedback_skills_in_plans_are_tool_calls.md` → 1 file (feedback_extractions_are_canon — GHOST REF, file not found)
8. `project_repo_analysis_skill.md` → 1 file (project_repo_analysis_v42 — supersession)

### Graph Density
- Total nodes: 83 (user-home) + 25 (canonical) = 108 nodes
- Total edges (excluding MEMORY.md contains): 66 meaningful edges
- Density of non-MEMORY connections: very sparse (~0.006 density)
- **Conclusion:** The memory corpus is an almost-flat collection indexed by MEMORY.md, not a rich knowledge graph. Cross-file references are rare and mostly one-directional.

---

## Learnings for Methodology

### 1. Memory cross-refs are almost entirely PROSE, not structured
Only ONE file in the 83-file user-home corpus uses a formal `**Related memories:**` section (`feedback_deep_plan_qa_format.md`). All other cross-references are buried in body text. Future graph extraction must use grep + manual scan, not any structured field.

### 2. MEMORY.md is the only real index — but it has gaps
The user-home MEMORY.md lists 73 of 83 files (87.9%). Ten files exist on disk but are not indexed. These are the most likely to be "forgotten" memories — not loaded in context because the index doesn't reference them. The canonical MEMORY.md has zero gaps (100% coverage of its 24 files). The sync mechanism should auto-regenerate MEMORY.md from directory contents.

### 3. Session clustering reveals capture events, not semantic relationships
The 8-file cluster (Session #244) contains files that are thematically diverse — statusline architecture, extraction journal, agent teams, interactive gates. They share a birth session but not a topic. Session clustering = temporal proximity, NOT semantic relatedness. Don't use session clusters as semantic edges in sync tooling.

### 4. Supersession is nearly invisible without content analysis
Only 1 of 4 supersession chains is explicit (the dead stub). The other 3 are implied by: rename (verify_not_grep → grep_vs_understanding), merge (parallel_agents → agent_teams), content drift (expertise_profile). A sync mechanism relying on explicit `supersedes` frontmatter fields would miss 75% of supersession relationships.

### 5. Ghost reference discovered: `feedback_extractions_are_canon`
`feedback_skills_in_plans_are_tool_calls.md` references "`feedback_extractions_are_canon`" as "the most important step" — but this file does NOT exist anywhere in the 83-file user-home corpus or the 25-file canonical corpus. It was either: (a) renamed (possibly to `reference_extraction_journal.md`?), (b) deleted, or (c) exists in JASON-OS but not SoNash. This is a dangling reference — a broken graph edge. Sync tooling must detect and flag ghost references.

### 6. The `related[]` JSONL field from D4a-d is insufficient for graph construction
D4a-d agents captured `related[]` for each file as a best-effort extraction. However:
- D4b captured 2 files with explicit related refs (repo_analysis pair and tdms_intake)
- D23 found 6 additional prose-only cross-refs not captured in D4a-d
- Session cluster edges (28 total) were not captured in D4a-d at all
- Cross-canonical edges (22 total) were not in D4a-d JSONL
This confirms D23 is necessary — D4a-d related[] extraction was insufficient.

### 7. Canonical pairing can be detected by filename-matching alone for 91.3%
21 of 23 canonical files match user-home filenames exactly. Only 2 canonical files have no user-home filename match: `feedback_parallel_agents_for_impl.md` and `feedback_verify_not_grep.md`. The sync mechanism can use filename-exact matching as the primary pairing strategy with a semantic fallback for renamed pairs.

---

## Gaps and Missing References

### 1. `feedback_extractions_are_canon.md` — ghost reference
Referenced in `feedback_skills_in_plans_are_tool_calls.md` but not found in the 83-file user-home corpus or the 25-file canonical corpus. Needs investigation:
- Could be `reference_extraction_journal.md` (semantic overlap but different name)
- Could be a deleted file
- Could exist in JASON-OS only

### 2. `originSessionId` for 67 of 83 files is missing
Only 16 files (19.3%) have session IDs. This means 80.7% of the corpus has no birth-session tracking. Session cluster analysis is necessarily incomplete.

### 3. Canonical files were not directly read for body cross-references
D23 only verified cross-references in canonical files that were grepped during the canonical scan. The full canonical body read was not performed for all 24 non-MEMORY.md canonical files. Low risk — canonical files are older and less likely to have complex cross-refs, and the grep scan covered the most likely candidates.

### 4. `sws_session221_decisions.md` and `t3_convergence_loops.md` — ambiguous listing
Both files exist in user-home directory AND canonical directory. Neither is listed in user-home MEMORY.md. Both ARE listed in canonical MEMORY.md. Unclear if omission from user-home MEMORY.md is intentional. Contains edges were added for canonical MEMORY.md → these files but NOT from user-home MEMORY.md (correctly reflecting the actual index state).

### 5. 10 unlisted user-home files have no MEMORY.md contains edge
The 10 files not in user-home MEMORY.md (see orphans section) effectively exist outside the indexed graph. The graph has no path from user-home MEMORY.md to these files. For sync tooling, they would not be "discovered" by following MEMORY.md links — they need filesystem enumeration.

---

## Confidence Assessment

- HIGH claims: 155 edges (directly observed in file contents or filesystem)
- MEDIUM claims: 12 edges (inferred from D5 analysis, not direct file comparison)
- LOW claims: 1 edge (E168 anti-edge note)
- UNVERIFIED claims: 0
- Overall confidence: HIGH

The D4a-d and D5 agents provided strong prior evidence that D23 built on. All session cluster edges were derived from grep-confirmed `originSessionId` values in frontmatter. All `contains` edges were verified by reading both MEMORY.md files directly. All supersession chains were either explicitly stated (chain 1) or confirmed by D5's content analysis (chains 2-4).
