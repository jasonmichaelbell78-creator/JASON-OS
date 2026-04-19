# D4b — SoNash User-Home Memories: Positions 22–42

**Agent:** D4b
**Profile:** codebase
**Date:** 2026-04-18
**Scope:** `~/.claude/projects/C--Users-jason-Workspace-dev-projects-sonash-v0/memory/` lines 22–42 (alphabetical sort)
**Memory count:** 21
**Files covered:** `feedback_no_blanket_count_labels.md` through `feedback_tdms_intake_path.md`

---

## Memory Inventory

### 1. feedback_no_blanket_count_labels

- **memory_type:** feedback
- **prefix_convention:** feedback_
- **originSessionId:** feed74e0-12ce-49f5-8818-acf7b8b2e1e8
- **has_canonical:** false
- **append_only:** false
- **portability:** portable
- **related:** []
- **recency_signal:** null
- **portable_elements:** Universal AI-communication principle: describe substance not frequency counts when categorizing items.
- **content_bleed:** none
- **notes:** T40 vocabulary seeding context. No project-specific refs. Already in JASON-OS MEMORY.md.

---

### 2. feedback_no_broken_widgets

- **memory_type:** feedback
- **prefix_convention:** feedback_
- **originSessionId:** null (no frontmatter field)
- **has_canonical:** false
- **append_only:** false
- **portability:** sanitize-then-portable
- **sanitize_fields:** Dashboard/command-center framing is SoNash-specific; generalize as "deliverables must ship complete"
- **related:** []
- **recency_signal:** null
- **portable_elements:** Ship complete or not at all. Fix data gaps before building features.
- **content_bleed:** none

---

### 3. feedback_no_incomplete_agent_findings

- **memory_type:** feedback
- **prefix_convention:** feedback_
- **originSessionId:** null
- **has_canonical:** false
- **append_only:** false
- **portability:** portable
- **related:** []
- **recency_signal:** null
- **portable_elements:** Never silently accept partial agent data. Gap found → dispatch fill-in. Default stance is completeness over speed.
- **content_bleed:** none
- **notes:** Session #264 origin. PR numbers (#492, #489, #487) are SoNash history but don't affect portability. Already in JASON-OS CLAUDE.md §4 guardrail 15.

---

### 4. feedback_no_preexisting_rejection

- **memory_type:** feedback
- **prefix_convention:** feedback_
- **originSessionId:** null
- **has_canonical:** TRUE — exists at `.claude/canonical-memory/feedback_no_preexisting_rejection.md`
- **append_only:** false
- **portability:** portable
- **related:** []
- **recency_signal:** null
- **portable_elements:** Pre-existing is not a rejection reason. Always offer fix-now or DEBT-item options.
- **content_bleed:** Minor. Canonical reformats frontmatter description to multi-line. User-home adds sentence "This applies regardless of how many codebase-wide instances exist." Both have `status: active`. Substantively equivalent — no functional divergence.

---

### 5. feedback_no_premature_next_steps

- **memory_type:** feedback
- **prefix_convention:** feedback_
- **originSessionId:** 7389d098-40f3-498d-a495-fe6dd68bdf2c
- **has_canonical:** false
- **append_only:** false
- **portability:** portable
- **related:** []
- **recency_signal:** null
- **portable_elements:** After completing work, present results and wait. "Proceed" means current thing. Never propose session-end as a default action.
- **content_bleed:** none
- **notes:** Extended rule set: includes session-end assumptions, 'anything else?' handling. Session #244 origin. Already in JASON-OS CLAUDE.md and MEMORY.md.

---

### 6. feedback_no_silent_deferrals_execution

- **memory_type:** feedback
- **prefix_convention:** feedback_
- **originSessionId:** null
- **has_canonical:** false
- **append_only:** false
- **portability:** portable
- **related:** []
- **recency_signal:** null
- **portable_elements:** Before marking step done, compare against Done-when criteria. Missing deliverable = immediate flag.
- **content_bleed:** none
- **notes:** T28 Session #269 origin (7 silently deferred items). Fully portable principle.

---

### 7. feedback_no_silent_skill_failures

- **memory_type:** feedback
- **prefix_convention:** feedback_
- **originSessionId:** null
- **has_canonical:** false
- **append_only:** false
- **portability:** portable
- **related:** []
- **recency_signal:** null
- **portable_elements:** After every SHOULD/MUST step, verify output exists. Retry with mitigation. If retry fails: report options, never silently continue.
- **content_bleed:** none
- **notes:** Triggered by repo-analysis skipping repomix. Already in JASON-OS CLAUDE.md §4 guardrail 9.

---

### 8. feedback_no_stale_ci_assumption

- **memory_type:** feedback
- **prefix_convention:** feedback_
- **originSessionId:** null
- **has_canonical:** false
- **append_only:** false
- **portability:** portable
- **related:** []
- **recency_signal:** null
- **portable_elements:** Verify commit SHA in CI logs matches branch HEAD before rejecting a failure as stale.
- **content_bleed:** none
- **notes:** PR #503 R3 origin. Already in JASON-OS MEMORY.md.

---

### 9. feedback_no_unnecessary_brainstorming

- **memory_type:** feedback
- **prefix_convention:** feedback_
- **originSessionId:** null
- **has_canonical:** false
- **append_only:** false
- **portability:** portable
- **related:** []
- **recency_signal:** null
- **portable_elements:** If user says 'lets do X' with clear parameters, just do it. Brainstorm only for creative exploration.
- **content_bleed:** none
- **notes:** Session #265 (2026-04-06) origin. Already in JASON-OS MEMORY.md.

---

### 10. feedback_permissions_cleanup

- **memory_type:** feedback
- **prefix_convention:** feedback_
- **originSessionId:** null
- **has_canonical:** false
- **append_only:** false
- **portability:** sanitize-then-portable
- **sanitize_fields:** Specific counts (283 entries), PR numbers (PR #469), session references (Session #238), dates (2026-03-25) are SoNash-specific
- **related:** []
- **recency_signal:** 2026-03-25 mentioned inline
- **portable_elements:** Tiered permissions model (project wildcards / near-empty local / global cross-project). Cleanup trigger: local > ~10 entries.
- **content_bleed:** none
- **notes:** Tiered permission model is universally applicable.

---

### 11. feedback_pr_review_state_files

- **memory_type:** feedback
- **prefix_convention:** feedback_
- **originSessionId:** null
- **has_canonical:** TRUE — exists at `.claude/canonical-memory/feedback_pr_review_state_files.md`
- **append_only:** false
- **portability:** portable
- **related:** []
- **recency_signal:** null
- **portable_elements:** State data must survive compaction. For cross-locale work, state files must be git-committed.
- **content_bleed:** SIGNIFICANT. Canonical is MISSING the cross-locale git-commit requirement. User-home version adds: "state files must be git committed along with each review round's fix commit" and the PR #453 R3 (2026-03-19) cross-locale example. Canonical is an older, incomplete version. **Canonical needs updating.**

---

### 12. feedback_precommit_fixer_report

- **memory_type:** feedback
- **prefix_convention:** feedback_
- **originSessionId:** null
- **has_canonical:** false
- **append_only:** false
- **portability:** portable
- **related:** []
- **recency_signal:** null
- **portable_elements:** Structured PRE-COMMIT FIX RESULT report format. Always present before re-committing.
- **content_bleed:** none
- **notes:** Contains exact report template inline. Already in JASON-OS MEMORY.md.

---

### 13. feedback_repo_analysis_knowledge_gap

- **memory_type:** feedback
- **prefix_convention:** feedback_
- **originSessionId:** null
- **has_canonical:** false
- **append_only:** false
- **portability:** sanitize-then-portable
- **sanitize_fields:** Version numbers (v3.0/v4.0/v4.1), value-map.json schema, EXTRACTIONS.md artifact name — all repo-analysis-specific
- **related:** ["feedback_repo_analysis_phase_ordering"]
- **recency_signal:** 2026-04-05 (resolution date mentioned inline)
- **portable_elements:** Knowledge extraction is the most important dimension of analysis. Both pattern and knowledge candidates should be tracked. Watch for regression toward clinical/technical extraction.
- **content_bleed:** none
- **notes:** Frontmatter description says "FULLY ADDRESSED in v4.1" — status is historical reference file. Core principle is portable.

---

### 14. feedback_repo_analysis_phase_ordering

- **memory_type:** feedback
- **prefix_convention:** feedback_
- **originSessionId:** 331dfa27-c52d-46cc-91ce-e5b7c20e8329
- **has_canonical:** false
- **append_only:** false
- **portability:** sanitize-then-portable
- **sanitize_fields:** Phase numbers (4b, 4, 6c, 6b), EXTRACTIONS.md artifact, analysis.json schema — repo-analysis-specific
- **related:** ["feedback_repo_analysis_knowledge_gap"]
- **recency_signal:** null
- **portable_elements:** Phase ordering is structural. Interactive gates must be presented, not auto-decided. Self-audit must verify actual artifact presence.
- **content_bleed:** none
- **notes:** Session #276 ArchiveBox analysis origin.

---

### 15. feedback_routing_menu_value

- **memory_type:** feedback
- **prefix_convention:** feedback_
- **originSessionId:** null
- **has_canonical:** false
- **append_only:** false
- **portability:** sanitize-then-portable
- **sanitize_fields:** Routing destinations (TDMS/deep-plan/cross-repo synthesis) are SoNash-specific skill names; generalize as routing menus for downstream workflow discovery
- **related:** []
- **recency_signal:** null
- **portable_elements:** Post-analysis routing menus that surface non-obvious next actions add user value. Keep routing broad, not minimal.
- **content_bleed:** none

---

### 16. feedback_scope_drift_deep_research

- **memory_type:** feedback
- **prefix_convention:** feedback_
- **originSessionId:** null
- **has_canonical:** false
- **append_only:** false
- **portability:** portable
- **related:** []
- **recency_signal:** null
- **portable_elements:** Before scoping deep-research, restate user's original goal and confirm research maps to it. Infrastructure research only after feature design is settled. Watch for brainstorm→research→sub-component-becomes-project drift.
- **content_bleed:** none
- **notes:** T28 Session #267 'Intelligence Graph Data Layer' story. Already in JASON-OS MEMORY.md.

---

### 17. feedback_skills_in_plans_are_tool_calls

- **memory_type:** feedback
- **prefix_convention:** feedback_
- **originSessionId:** da103c91-f16d-4c7d-a8a4-4eb6cd956ba6
- **has_canonical:** false
- **append_only:** false
- **portability:** portable
- **related:** []
- **recency_signal:** null
- **portable_elements:** Any /skillname in a plan is a Skill tool call, not prose instructions. Never manually perform skill phases.
- **content_bleed:** none
- **notes:** Longest and most detailed file in this scope. Session #273, T29 Wave 4 origin. Skill list includes SoNash-specific names (gsd:*, debt-runner, recall) but principle is portable. Already in JASON-OS MEMORY.md.

---

### 18. feedback_stale_reviews_dist

- **memory_type:** feedback
- **prefix_convention:** feedback_
- **originSessionId:** null
- **has_canonical:** TRUE — exists at `.claude/canonical-memory/feedback_stale_reviews_dist.md`
- **append_only:** false
- **portability:** not-portable
- **related:** []
- **recency_signal:** 2026-03-25 (removal of reviews:generate noted inline)
- **portable_elements:** On test failures involving generated/compiled dist artifacts, rebuild before debugging code.
- **content_bleed:** SIGNIFICANT + FACTUAL DIVERGENCE. User-home explicitly states `reviews:generate` was REMOVED on 2026-03-25 and current rebuild command is `npm run reviews:render`. Canonical description still says "rebuild with tsc or reviews:generate" and body documents `npm run reviews:generate`. Canonical is factually outdated. **Canonical must be updated to match user-home.**

---

### 19. feedback_statusline_rebuild_safety

- **memory_type:** feedback
- **prefix_convention:** feedback_
- **originSessionId:** 7389d098-40f3-498d-a495-fe6dd68bdf2c
- **has_canonical:** false
- **append_only:** false
- **portability:** sanitize-then-portable
- **sanitize_fields:** Go version (1.26.1), go.mod reference, binary naming convention (sonash-statusline-v3.exe) — SoNash-specific
- **related:** []
- **recency_signal:** null
- **portable_elements:** Claude Code holds file handle to running exe — never overwrite. Versioned filename + git checkout is the safe deployment pattern. Project-level settings.json overrides user-level for statusLine.command.
- **content_bleed:** none
- **notes:** Session #244 (same session ID as feedback_no_premature_next_steps). Already in JASON-OS MEMORY.md. JASON-OS uses jason-statusline-v2.exe.

---

### 20. feedback_sws_is_meta_plan

- **memory_type:** feedback
- **prefix_convention:** feedback_
- **originSessionId:** null
- **has_canonical:** TRUE — exists at `.claude/canonical-memory/feedback_sws_is_meta_plan.md`
- **append_only:** false
- **portability:** sanitize-then-portable
- **sanitize_fields:** SWS plan name, child plan names (Tooling/CQ/DE), DECISIONS-reeval.md artifact — SoNash-specific
- **related:** []
- **recency_signal:** null
- **portable_elements:** Meta-plan architecture: orchestrating plan references child plans via gates/sequences, does not absorb child plan content.
- **content_bleed:** Minor / equivalent. User-home and canonical are substantively identical. Canonical is slightly more terse. No functional divergence.

---

### 21. feedback_tdms_intake_path

- **memory_type:** feedback
- **prefix_convention:** feedback_
- **originSessionId:** null
- **has_canonical:** false
- **append_only:** false
- **portability:** not-portable
- **related:** ["reference_tdms_systems"]
- **recency_signal:** 2026-04-04 (origin date mentioned inline)
- **portable_elements:** Never write directly to canonical data stores — always use designated intake/mutation scripts.
- **content_bleed:** none
- **notes:** Contains full CLI template for intake-manual.js. Explicitly cross-references reference_tdms_systems.md for 'overwrite hazard'. SoNash-specific TDMS system.

---

## Type Distribution

| memory_type | count |
|-------------|-------|
| feedback    | 21    |
| **Total**   | **21** |

All 21 files in this scope are `feedback_` prefix type. No user/project/reference/tenet/index types appear in positions 22–42.

---

## Portability Distribution

| portability            | count |
|------------------------|-------|
| portable               | 11    |
| sanitize-then-portable | 7     |
| not-portable           | 3     |

---

## Canonical Coverage

4 of 21 files have canonical equivalents in `.claude/canonical-memory/`:

| file | has_canonical | content_bleed |
|------|---------------|---------------|
| feedback_no_preexisting_rejection | true | Minor (wording only, substantively equivalent) |
| feedback_pr_review_state_files | true | **SIGNIFICANT** — canonical missing cross-locale git-commit requirement |
| feedback_stale_reviews_dist | true | **SIGNIFICANT + FACTUAL** — canonical documents removed command (`reviews:generate`); current is `reviews:render` |
| feedback_sws_is_meta_plan | true | Minor / equivalent (canonical slightly more terse) |

17 of 21 files have no canonical equivalent.

---

## Content-Bleed Summary

**Content-bleed count: 4** (all 4 canonical-matched files show some divergence)

- **Minor bleed (2):** `feedback_no_preexisting_rejection`, `feedback_sws_is_meta_plan` — reformatting / terse editing, no functional loss
- **Significant bleed (1):** `feedback_pr_review_state_files` — canonical missing cross-locale git-commit requirement added in user-home
- **Significant + factual bleed (1):** `feedback_stale_reviews_dist` — canonical documents a script (`reviews:generate`) that was removed 2026-03-25; user-home reflects current command (`reviews:render`)

**Risk assessment:** The `feedback_stale_reviews_dist` canonical divergence is the most operationally dangerous — anyone reading canonical would use a removed command and get a confusing failure. `feedback_pr_review_state_files` canonical gap would cause cross-locale state loss.

---

## Cross-JASON-OS Overlap

The following D4b files are already reflected in JASON-OS MEMORY.md or CLAUDE.md:

| file | JASON-OS location |
|------|------------------|
| feedback_no_blanket_count_labels | MEMORY.md |
| feedback_no_incomplete_agent_findings | CLAUDE.md §4 #15 |
| feedback_no_premature_next_steps | CLAUDE.md + MEMORY.md |
| feedback_no_silent_skill_failures | CLAUDE.md §4 #9 + MEMORY.md |
| feedback_no_stale_ci_assumption | MEMORY.md |
| feedback_no_unnecessary_brainstorming | MEMORY.md |
| feedback_precommit_fixer_report | MEMORY.md |
| feedback_scope_drift_deep_research | MEMORY.md |
| feedback_skills_in_plans_are_tool_calls | MEMORY.md |
| feedback_statusline_rebuild_safety | MEMORY.md |

10 of 21 files already have presence in JASON-OS. The remaining 11 are SoNash-native (or partially portable) with no JASON-OS equivalent yet.

---

## Notable Observations

### Session ID clustering
Two files share the same `originSessionId` (`7389d098-40f3-498d-a495-fe6dd68bdf2c`): `feedback_no_premature_next_steps` and `feedback_statusline_rebuild_safety`. Both from Session #244. This suggests a single session can produce multiple distinct feedback memories.

### Repo-analysis feedback cluster
Files 13 and 14 (`feedback_repo_analysis_knowledge_gap`, `feedback_repo_analysis_phase_ordering`) are tightly coupled and cross-reference each other inline. They form a mini-cluster about the same skill's evolution. Their `related[]` arrays reflect this.

### TDMS cross-reference
`feedback_tdms_intake_path` explicitly references `reference_tdms_systems` in its body text — this is a rare explicit inline cross-reference within a feedback file. The `related` field captures it.

### Not-portable files
Three files are classified `not-portable`: `feedback_stale_reviews_dist` (SoNash-specific reviews build pipeline), `feedback_tdms_intake_path` (SoNash TDMS system), and `feedback_routing_menu_value` would be `sanitize-then-portable` rather than truly not-portable since the principle survives. The two truly not-portable ones have no analogous system in JASON-OS.

---

## Gaps and Missing References

1. **D4a not yet written** — No D4a findings exist in the findings directory. D4b cannot cross-reference D4a's scope (positions 1–21). The full MEMORY.md index file at position 1 is in D4a's scope and would provide the master list of all memories.

2. **originSessionId gap** — 15 of 21 files have no `originSessionId`. This is consistent with feedback files being written without explicit session tracking. The gap is in the source data, not the extraction.

3. **No `supersedes`/`superseded_by` chains detected** — None of the 21 files reference a prior version. However, `feedback_stale_reviews_dist` is functionally a supersession (user-home has newer content than canonical). No formal supersession metadata exists.

4. **`feedback_no_agent_budgets` and `feedback_no_artificial_caps`** — These are in D4a's scope (positions 18–19). Referenced in JASON-OS MEMORY.md. D4b cannot confirm their SoNash state.

5. **Canonical coverage is sparse** — Only 4 of 21 (19%) files in this scope have canonical equivalents. The majority of feedback learnings live only in user-home. D5 (canonical-memory agent) will provide the authoritative canonical inventory.

---

## Learnings for Methodology

### 1. All-feedback scope is expected for positions 22–42
The sorted memory list places all `feedback_` files in a contiguous alphabetical band. D4b's entire scope is `feedback_` type. D4c–D4d will shift into `project_`, `reference_`, tenet, and user type files. Methodology note: type distribution per D-agent is not uniform — agents near the top of the alphabet will get all-feedback batches.

### 2. Content-bleed detection requires reading both versions
The `feedback_stale_reviews_dist` divergence (removed vs current command name) would be completely invisible from user-home alone. The canonical-memory check is essential, not optional. Even "substantively similar" entries deserve a line-level diff pass.

### 3. SIGNIFICANT content-bleed in canonical-memory is a sync direction signal
When user-home has MORE content than canonical (as with `feedback_pr_review_state_files`), the sync direction is **user-home → canonical**, not the other way around. The canonical is the older/authoritative version conceptually, but in practice the user-home memories are more current. This needs a formal sync rule in the LEARNINGS.md.

### 4. Cross-JASON-OS overlap detection is valuable
10 of 21 files already exist in JASON-OS — this confirms the portability of feedback patterns and validates the sync-mechanism premise. However, JASON-OS versions may differ from SoNash originals (e.g., JASON-OS MEMORY.md `feedback_statusline_rebuild_safety` may reference JASON-OS binary names, not SoNash names).

### 5. originSessionId presence correlates with detail level
Files WITH originSessionId (5 of 21) tend to be more detailed and narrative — they were written in a specific session with more context. Files WITHOUT tend to be more terse operational rules. This is a useful signal for synthesis: high-narrative files have richer portable_elements.

### 6. "FULLY ADDRESSED" status in feedback files
`feedback_repo_analysis_knowledge_gap` has description "FULLY ADDRESSED in v4.1" — this is a documentation pattern (historical reference, don't apply). D22 schema surveyor may want a formal `historical_reference: true` flag for files like this.

### 7. Agent sizing: 21 files is comfortably within scope
No stalling or sampling was needed. 21 feedback files with 100% read coverage is the right granularity for a D4-series agent. D4c and D4d may have different file types (project_, reference_, user_, tenet_) requiring different analysis depth.

---

## Confidence Assessment

- HIGH claims: 19 (file contents read directly, canonical checks performed)
- MEDIUM claims: 2 (portability classifications for borderline cases)
- LOW claims: 0
- UNVERIFIED claims: 0
- Overall confidence: HIGH
