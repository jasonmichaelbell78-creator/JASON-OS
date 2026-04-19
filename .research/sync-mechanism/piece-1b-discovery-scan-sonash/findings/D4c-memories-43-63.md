# Findings: D4c — SoNash User-Home Memories 43–63

**Agent:** D4c
**Profile:** codebase
**Date:** 2026-04-18
**Sub-Question IDs:** Piece 1b slice — alphabetical positions 43–63
**Schema version:** SCHEMA_SPEC.md v1.0

---

## Slice Summary

This slice spans the tail of the `feedback_*` series (5 files) and the entire
`project_*` series (16 files). It is the first slice to encounter `project_`
memory types in volume. One superseded stub was found.

| # | Filename | memory_type | portability | has_canonical |
|---|----------|-------------|-------------|---------------|
| 43 | feedback_testing_with_writes.md | feedback | portable | false |
| 44 | feedback_user_action_steps.md | feedback | portable | false |
| 45 | feedback_workflow_chain.md | feedback | sanitize-then-portable | false |
| 46 | feedback_worktree_guidance.md | feedback | portable | false |
| 47 | feedback_write_rejection_hard_stop.md | feedback | portable | false |
| 48 | project_active_initiatives.md | project | not-portable | true |
| 49 | project_agent_env_analysis.md | project | not-portable | true |
| 50 | project_analysis_synthesis_comparison.md | project | sanitize-then-portable | false |
| 51 | project_codex_plugin_research.md | project | sanitize-then-portable | false |
| 52 | project_contrarian_agent_design.md | project | sanitize-then-portable | false |
| 53 | project_cross_locale_config.md | project | sanitize-then-portable | true |
| 54 | project_debt_runner_expansion.md | project | not-portable | false |
| 55 | project_github_health_research.md | project | sanitize-then-portable | false |
| 56 | project_hook_contract_canon.md | project | sanitize-then-portable | true |
| 57 | project_hook_if_research.md | project | sanitize-then-portable | false |
| 58 | project_jason_os.md | project | not-portable | false |
| 59 | project_learning_system_analysis.md | project | sanitize-then-portable | false |
| 60 | project_multi_layer_memory.md | project | sanitize-then-portable | false |
| 61 | project_repo_analysis_skill.md | project | not-portable | false |
| 62 | project_repo_analysis_v42.md | project | not-portable | false |
| 63 | project_reviews_system_health.md | project | not-portable | false |

**Total files:** 21
**Memory type distribution:**
- feedback: 5
- project: 16
- tenet: 0
- user: 0
- reference: 0
- index: 0

---

## Taxonomy Analysis

### Feedback files (43–47): Tail of the feedback_ series

The five remaining feedback files follow the same patterns established in
D4a/D4b. All are universally or near-universally portable. Three have
`originSessionId` present in frontmatter:

- `feedback_testing_with_writes.md`: 142f84e3 (Session #286)
- `feedback_write_rejection_hard_stop.md`: 331dfa27 (Session #276)
- `feedback_workflow_chain.md`: no ID but no-frontmatter (raw `name:` only)

None have canonical counterparts. All five also exist in JASON-OS user-home
memory with near-identical content.

**feedback_workflow_chain.md** is the one partially-portable outlier. The
workflow chain pattern itself (brainstorm → deep-research → deep-plan →
execute) is universal, but the body references "superpowers" skills
(SoNash-specific plugin set) as the anti-pattern. JASON-OS does not have the
superpowers conflict, so the file would require sanitization to remove the
SoNash-specific failure mode while keeping the chain description.

### Project files (48–63): First full project_ block

This slice contains the entire `project_*` alphabet from `project_active`
through `project_reviews`. Key observations:

**Canonical coverage:** 4 of 16 project files have canonical counterparts
(project_active_initiatives, project_agent_env_analysis, project_cross_locale_config,
project_hook_contract_canon). All four canonical counterparts are expected
to have significant content drift — these are living status documents.

**Not-portable cluster:** 6 files are classified `not-portable`:
- project_active_initiatives.md — pure SoNash initiative state
- project_agent_env_analysis.md — SoNash initiative completion record
- project_debt_runner_expansion.md — TDMS-specific (SoNash-only)
- project_jason_os.md — meta-document about this scan's subject
- project_repo_analysis_skill.md — deprecated stub
- project_repo_analysis_v42.md — SoNash skill version tracking
- project_reviews_system_health.md — SoNash PR review system

**Sanitize-then-portable cluster:** 7 files with extractable portable
principles buried in SoNash-specific scaffolding:
- project_analysis_synthesis_comparison.md — cross-skill design principles
- project_codex_plugin_research.md — plugin ecosystem intelligence
- project_contrarian_agent_design.md — Claude Code agent constraints
- project_cross_locale_config.md — cross-locale sync framework
- project_github_health_research.md — GitHub Health skill design
- project_hook_contract_canon.md — hook schema contract
- project_hook_if_research.md — Claude Code platform facts
- project_learning_system_analysis.md — learning measurement principles
- project_multi_layer_memory.md — memory token cost model

---

## Canonical Gap Analysis

**Total files this slice:** 21
**Files WITH canonical counterpart:** 4 (project_active_initiatives, project_agent_env_analysis,
project_cross_locale_config, project_hook_contract_canon)
**Canonical gap %:** 81% (17 of 21 lack canonical)

Broken down by type:
- feedback files: 0% canonical coverage (0 of 5)
- project files: 25% canonical coverage (4 of 16)

This is significantly lower canonical coverage than the feedback_ series
(where ~30% had canonicals). Project files are largely initiative-specific
and time-bound — canonicalization would require active maintenance.

**Notable:** The 4 canonical project files (active_initiatives, agent_env_analysis,
cross_locale_config, hook_contract_canon) are all expected to have CONTENT DRIFT.
In particular, project_active_initiatives.md's canonical is likely multiple
sessions behind (Session #269 in user-home vs unclear in canonical).

---

## Content Bleed Instances

**Content bleed** = SoNash-specific content mixed into files where JASON-OS
would need it in purified form.

1. **feedback_workflow_chain.md**: References `superpowers:writing-plans`,
   `superpowers:subagent-driven-development`, `docs/superpowers/plans/` —
   SoNash-specific plugin paths embedded in what should be universal workflow
   guidance.

2. **project_analysis_synthesis_comparison.md**: Contains skill version
   numbers (v4.2), REFERENCE.md schema drift (v2.0 spec vs v4.2 runtime),
   and `synthesis.json` vs `schema_version` key conflict — entirely
   SoNash-skill-specific technical debt embedded alongside portable
   design principles.

3. **project_hook_contract_canon.md**: T5 tenet reference, SWS CANON plan,
   and `.canon/` directory references mixed with portable hook schema fields.
   The portable content (hook-checks.json fields) could be extracted cleanly
   but is currently framed as a SoNash CANON registration task.

4. **project_contrarian_agent_design.md** (filename mismatch): File is named
   for the contrarian agent design but contains the full custom-agents
   initiative completion record. The filename slug is stale — it was likely
   named when the contrarian agent was the focal deliverable, and the scope
   expanded. This is a metadata quality issue, not a content bleed per se.

**Total content bleed instances (strict): 3** (items 1–3 above)
**Metadata quality issue: 1** (item 4)

---

## New Memory Types Encountered

**memory_type: project** — first full block in this scan (D4a/D4b were all
`feedback` and one `index`). Project memories have distinct characteristics:

- **Status field variety:** project files use `complete` in body text (not
  frontmatter) even when frontmatter only says `type: project`. One file
  (project_reviews_system_health.md) includes `status: active` in frontmatter
  — inconsistent across the set.
- **recency_signal pattern:** Project files frequently have explicit date
  stamps in body text (e.g., 'as of 2026-04-08', 'COMPLETE 2026-04-04').
  These are stronger recency signals than the feedback files which usually
  referenced session numbers.
- **Superseded stub found:** project_repo_analysis_skill.md contains only a
  redirect notice ('SUPERSEDED — see project_repo_analysis_v42.md. Delete
  this file.'). No frontmatter. This is the first true deprecated stub
  in the memory set.

**Tenet files:** None encountered in this slice. Tenet files (t[N]_) appear
alphabetically after `project_` and `reference_` — they will be in D4d's scope.

---

## High-Value Serendipitous Findings

1. **Portability split numbers embedded in project_jason_os.md**: ~47 portable
   skills, ~16 portable agents, ~5 portable hooks, ~20 SoNash-specific skills,
   ~19 agents, ~16 hooks. These estimates come from the SoNash brainstorm
   (Session #256) and are directly useful for calibrating the scope of this
   very scan. Cross-reference with D1a-f and D2a-b findings.

2. **Claude Code platform facts in project_hook_if_research.md**: Exit code 2
   = BLOCK for PreToolUse (not a SoNash convention — platform behavior),
   hooks not hot-reloaded mid-session, Windows paths POSIX-normalized before
   if matching, PostToolUseFailure is a supported event. These are
   ground-truth Claude Code behaviors that should be promoted to JASON-OS
   canonical memory.

3. **Token cost model in project_multi_layer_memory.md**: ~4,000 tokens
   always-injected (CLAUDE.md + MEMORY.md index); up to ~19,240 if all files
   loaded; individual files loaded on-demand. This is empirically measured
   (128 claims, 41 agents) — not an estimate. Directly applicable to JASON-OS
   memory design decisions.

4. **A-MAC paper fabrication caught**: project_multi_layer_memory.md documents
   that '70% elimination' figure was fabricated by a synthesis agent — the
   A-MAC paper (arxiv:2603.04549) is real but the specific figure was
   hallucinated. This is a useful data quality finding for research validation.

5. **project_repo_analysis_skill.md as dead stub**: File contains only one
   line: 'SUPERSEDED — see project_repo_analysis_v42.md. Delete this file.'
   This is an explicit deletion instruction that was never executed. First
   instance of a memory file with no frontmatter at all in this scan.

---

## Gaps and Missing References

1. **project_t28_content_intelligence.md** referenced by project_active_initiatives.md
   but NOT in this slice — must be in D4b's slice (positions 22–42) or D4d's
   (positions 64–83). Check D4b/D4d coverage.

2. **project_sonash_identity.md** referenced by D4a's MEMORY.md index but not
   seen in D4b or D4c. If it falls in D4b's range (22–42), D4b should have it.

3. **project_skill_audit_tracking_broken.md** referenced in D4a's MEMORY.md
   index but not encountered in D4c scope (falls outside alphabetical range here).

4. **project_sonarcloud_disabled.md** referenced in D4a's MEMORY.md index —
   also outside this slice's range.

5. **project_website_analysis_skill.md**, **project_t29_synthesis_consolidation.md**
   — referenced in D4a MEMORY.md index, expected in D4d or already covered.

6. **Canonical drift depth**: project_active_initiatives.md canonical was not
   read (D5 scope). From the body, user-home is at Session #269 (2026-04-08) —
   canonical is likely at Session #232 era based on D4a findings. This ~37-session
   gap represents several months of initiative state changes not in canonical.

---

## Learnings for Methodology

### 1. Project files need explicit `status` in frontmatter
Most project files only specify `type: project` in frontmatter without an
explicit `status:` field. The status (active/complete/deprecated) is buried in
the body. Future scans should look for completion markers in body text
('SHIPPED', 'COMPLETE', 'EXECUTED') to infer status. Only two files
(project_hook_contract_canon, project_reviews_system_health) included
`status: active` in frontmatter.

### 2. recency_signal extraction differs between types
For feedback files, recency signals are session numbers referenced in body text.
For project files, they're explicit ISO-like dates in body headers ('as of
2026-04-08', 'Research completed 2026-03-31'). The extraction technique should
be type-aware: look for `as of YYYY-MM-DD` and `(Session #NNN, YYYY-MM-DD)` for
project files; look for `Session #NNN` for feedback files.

### 3. Superseded stubs are a real pattern
project_repo_analysis_skill.md proves that superseded files can have zero
frontmatter and a single-line body. The classification rule for this edge case:
`status: deprecated`, `memory_type: project` (inferred from prefix), no
portability value since it has no content to port. Flag for deletion.

### 4. Filename mismatch as a memory quality signal
project_contrarian_agent_design.md has content that doesn't match its name.
This is a quality signal worth flagging in the MD narrative but does not need
a separate JSONL field (the notes field handles it). Future scans should
compare frontmatter `name:` field against filename slug as a consistency check.

### 5. project_ files have higher content density than feedback_ files
Average content in project files is 500–1,200 bytes vs 400–700 for feedback.
The research-summary format (project_github_health_research, project_learning_system_analysis)
can be 1,000–1,500 bytes. Agent sizing for D4 slices appears appropriate — 21
files per agent is manageable even at this density.

### 6. Canonical counterparts for project files are snapshot-type documents
Unlike feedback files (where canonical = portable distillation), project file
canonicals are snapshots in time. A project_active_initiatives canonical is
inherently stale as soon as new work completes. The sync strategy for project
files needs to account for this — they require periodic refresh, not one-time
port.

### 7. Serendipitous high-value portable content in project files
Several project files contain buried portable intelligence: platform facts in
project_hook_if_research, token cost model in project_multi_layer_memory,
research methodology in project_learning_system_analysis. These would be
missed by a summary scan. Full-read methodology is essential for project files.

---

## Confidence Assessment

- HIGH claims: 19 (directly read from file contents)
- MEDIUM claims: 2 (canonical drift estimates — canonical files not read)
- LOW claims: 0
- UNVERIFIED claims: 0
- Overall confidence: HIGH

All file contents were read in full. Canonical counterpart existence was
verified against the canonical-memory directory listing. Status inferences
from body text are marked as such in notes fields.
