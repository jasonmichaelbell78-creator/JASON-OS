# D4b-2: User-Home Memories Inventory — Files 22–42

**Agent:** D4b-2
**Date:** 2026-04-18
**Source directory:** `C:\Users\jason\.claude\projects\C--Users-jason-Workspace-dev-projects-JASON-OS\memory\`
**Canonical reference:** `.claude/canonical-memory/` (12 files)
**Files covered:** 21 (indices 22–42)

---

## Summary Table

| # | Filename | Name (short) | Type | Classification | Scope | has_canonical |
|---|----------|-------------|------|---------------|-------|--------------|
| 22 | feedback_never_defer_without_approval.md | Never defer skill steps without approval | feedback | portable | workflow-discipline | false |
| 23 | feedback_no_agent_budgets.md | No agent budgets | feedback | portable | deep-research / multi-agent | false |
| 24 | feedback_no_artificial_caps.md | No artificial caps on synthesis output | feedback | portable | synthesis / output formatting | false |
| 25 | feedback_no_blanket_count_labels.md | No blanket count-based labels | feedback | portable | communication / labeling | false |
| 26 | feedback_no_broken_widgets.md | No broken widgets or partial tabs | feedback | project-specific | dashboard / UI quality | false |
| 27 | feedback_no_incomplete_agent_findings.md | Never accept incomplete agent findings | feedback | portable | multi-agent / completeness | false |
| 28 | feedback_no_preexisting_rejection.md | Pre-existing not valid rejection in PR review | feedback | portable | pr-review | **true** |
| 29 | feedback_no_premature_next_steps.md | Never jump to next phase without being asked | feedback | portable | workflow pacing | false |
| 30 | feedback_no_research_caps.md | No caps on research scope | feedback | portable | deep-research / multi-agent | false |
| 31 | feedback_no_session_end_assumptions.md | Never assume session-end | feedback | portable | workflow pacing / session management | false |
| 32 | feedback_no_silent_skill_failures.md | No silent skill failures | feedback | portable | skill execution / error handling | false |
| 33 | feedback_no_stale_ci_assumption.md | No stale CI assumption | feedback | portable | CI / pr-review | false |
| 34 | feedback_no_unnecessary_brainstorming.md | Don't brainstorm when decisions made | feedback | portable | skill invocation discipline | false |
| 35 | feedback_parallel_agents_for_impl.md | Parallel agents for implementation | feedback | portable | implementation / multi-agent | **true** |
| 36 | feedback_per_skill_self_audit.md | Per-skill self-audit from shared base | feedback | portable | skill quality / self-audit | false |
| 37 | feedback_permission_over_aliases.md | Permission rules over shell aliases | feedback | portable | workflow optimization / AI-director | false |
| 38 | feedback_pr_review_paste_only.md | PR review content from user paste only | feedback | portable | pr-review / input handling | false |
| 39 | feedback_pr_review_state_files.md | pr-review must use state files | feedback | portable | pr-review / state persistence | false |
| 40 | feedback_pr_timing.md | PR timing discipline | feedback | portable | PR workflow / timing | false |
| 41 | feedback_pre_analysis_before_port.md | Pre-analysis required before every port | feedback | portable | porting / migration discipline | false |
| 42 | feedback_precommit_fixer_report.md | Pre-commit fixer report + confirmation | feedback | portable | pre-commit / commit workflow | false |

---

## Gap Analysis: Canonical vs User-Home (this batch)

Of the 21 files in this batch:

- **has_canonical = true:** 2 files
  - `feedback_no_preexisting_rejection.md` — present in canonical
  - `feedback_parallel_agents_for_impl.md` — present in canonical

- **has_canonical = false:** 19 files — these exist only in user-home memory and are NOT yet in `.claude/canonical-memory/`

The 19 gaps in this batch are overwhelmingly portable behavioral rules (workflow discipline, multi-agent patterns, PR process, skill invocation). One is project-specific (`feedback_no_broken_widgets.md` — dashboard-specific, SoNash-origin, low portability value).

---

## Learnings for Methodology

### Sizing

This batch of 21 files is uniform in size: all are concise (8–48 lines). No file required pagination. The largest file (`feedback_never_defer_without_approval.md`) at 48 lines is still fully readable in one pass. All had conventional frontmatter (YAML `---` delimited) with 3–5 fields.

### Classification Patterns

All 21 files are type `feedback`. Classification breaks down as:

- **portable (20/21):** Behavioral rules about workflow discipline, multi-agent patterns, research governance, PR process, skill execution, communication, and commit/CI discipline. These apply independent of any specific project or tech stack and should be candidates for canonical-memory inclusion.
- **project-specific (1/21):** `feedback_no_broken_widgets.md` — dashboard/UI quality rule clearly originating from a SoNash dashboard feature. Low value for JASON-OS canonical unless a dashboard skill is added.

### Frontmatter Observations

- **Standard fields used:** `name`, `description`, `type` — present on every file
- **Optional fields present on some:** `status` (4 files), `originSessionId` (3 files)
- `status: active` is explicit in 4 files; the remaining 17 have no status field but are implicitly active (no deprecated/archived signal)
- `originSessionId` values are UUIDs in some files, human-readable session identifiers ("Session #245") in others — inconsistent schema across the corpus. Any sync schema should normalize this.
- One file (`feedback_no_blanket_count_labels.md`) uses `originSessionId` with a UUID, while others use `originSessionId` with a session label string — both patterns exist.

### Gap Analysis Findings

The canonical gap is large. Of 21 files in this batch, 19 are absent from canonical-memory. This matches the D4b-1 pattern (high gap rate). The two files that DO exist in canonical (`feedback_no_preexisting_rejection.md`, `feedback_parallel_agents_for_impl.md`) both have `status: active` in their frontmatter and include slightly more structured frontmatter than their non-canonical counterparts — suggesting the canonical copy may be a revised/promoted version.

**Key observation:** `feedback_parallel_agents_for_impl.md` and `feedback_no_preexisting_rejection.md` in the user-home memory include a `system-reminder` note "This memory is 2 days old" — indicating Claude's memory system has a recency tracking layer that surfaces staleness warnings. The canonical versions would need similar or equivalent handling.

### Schema Fields Confirmed for JSONL

Fields used in this batch's JSONL output:
- `index`, `filename`, `name`, `description`, `type`, `status`, `frontmatter_fields`, `has_canonical`, `classification`, `scope`, `summary`, `origin_session`, `recency_signal`

`recency_signal` is a new field not in earlier batches — captures the system-reminder staleness flag present on 2 files. Recommended to add this field to the canonical sync schema.

### SoNash Adjustments for Sync

Files in this batch most likely to require content review/adjustment before canonical promotion:

1. **feedback_no_broken_widgets.md** — References "Tabs 5 and 6", "velocity-log", "commit-log" — SoNash dashboard-specific. Either strip or gate behind a project-type check before promoting.
2. **feedback_per_skill_self_audit.md** — References `.claude/state/deep-plan.jason-os-mvp.state.json` MI-5 and SoNash feature branch for skill-audit base. JASON-OS-localized reference that needs updating at promotion time.
3. **feedback_pre_analysis_before_port.md** — References SoNash-specific scan patterns (`sonash|SoNash|firebase|firestore|sonarcloud|MASTER_DEBT|TDMS|/add-debt|Qodo|CodeRabbit|Gemini`). Portable in structure but the scan pattern list is SoNash-specific and needs generalization.
4. **feedback_pr_review_state_files.md** — References PR #453 R3 on 2026-03-19 as the incident. Incident reference is historical context, not a behavioral problem — safe to keep as-is.

All other 15 non-canonical portables are clean and can be promoted to canonical-memory with minimal or no edits.
