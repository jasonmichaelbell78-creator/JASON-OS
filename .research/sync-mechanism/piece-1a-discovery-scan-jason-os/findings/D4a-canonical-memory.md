# D4a — Canonical Memory Inventory: JASON-OS

**Agent:** D4a
**Scan target:** `.claude/canonical-memory/` (JASON-OS repo root)
**Files read:** 12 (1 index + 11 memories)
**Date:** 2026-04-18

---

## Summary Table

| Name | memory_type | scope | portability | Size (bytes) | 1-line purpose |
|------|-------------|-------|-------------|--------------|----------------|
| MEMORY.md *(index)* | index | universal | sanitize-then-portable | 1664 | Root index linking all memories by section — not a memory itself |
| feedback_agent_teams_learnings | feedback | user | portable | 1091 | Agent team mechanics: Explore=read-only, idle floods, 3-7x token cost, team size limits, subagent-vs-team rule |
| feedback_code_review_patterns | feedback | user | portable | 774 | PR workflow: description quality, reject-as-pre-existing forbidden, bot sequencing, commit-before-push |
| feedback_convergence_loops_mandatory | feedback | user | portable | 873 | Every significant pass loops internally (min 2 iterations); shortcuts cascade into compounding errors |
| feedback_execution_failure_recovery | feedback | user | portable | 715 | Stop-diagnose-confirm on failure; no blind retries, no destructive shortcuts |
| feedback_no_preexisting_rejection | feedback | user | portable | 713 | Pre-existing is not a valid PR rejection reason; always give user fix-or-track options |
| feedback_parallel_agents_for_impl | feedback | user | portable | 830 | Use parallel agents + convergence loops for implementation; single-thread = implementation theater |
| feedback_verify_not_grep | feedback | user | portable | 850 | Verification = functional tests, not grep; grep proves string presence, not feature behavior |
| session-end-learnings | project | project | not-portable | 4455 | Append-only retrospective log of JASON-OS session-end insights (Sessions 2 + 3) |
| user_communication_preferences | user | user | portable | 469 | Concise responses, 5-8 question batches, delegation pattern, push protocol, two-locale awareness |
| user_decision_authority | user | user | portable | 495 | Claude delegates: naming/impl/tools; user retains: architecture/security/scope/CLAUDE.md |
| user_expertise_profile | user | user | portable | 510 | Deep Node.js/scripting/tooling expertise; frontend needs guidance; solo developer |

---

## Key Observations

### Name divergence (CRITICAL for sync)
`feedback_verify_not_grep.md` in canonical-memory is referenced as `feedback_grep_vs_understanding` in the user-home MEMORY.md (auto-memory). These are the same concept under different filenames. One of these is stale or renamed. The canonical-memory version (`feedback_verify_not_grep`) is the git-tracked authority.

### Content overlap
`feedback_no_preexisting_rejection.md` and `feedback_code_review_patterns.md` both state the "never reject as pre-existing" rule. The former is a focused extraction of the latter. The schema should support a `related_memories` or `supersedes` field to make this relationship explicit.

### Project-type memory is append-only log
`session-end-learnings.md` is the only `project`-type memory. It is a chronological, append-only retrospective — not a behavioral rule. It cannot be ported (contains commit SHAs, T-ticket numbers, JASON-OS-specific session data). SoNash equivalent would be a fresh file with the same structure and purpose.

### User-type memory with project bleed
`user_expertise_profile.md` contains a JASON-OS-specific note ("Stack for this project (JASON-OS) is intentionally TBD"). This blurs the user/project boundary. For SoNash, this line would be replaced with SoNash's actual stack. Recommend extracting project-specific context to a project-type memory.

### Missing sections in canonical MEMORY.md
The canonical `MEMORY.md` only has User and Feedback sections. The user-home `MEMORY.md` has User, Feedback, Project, and Reference sections. The canonical index is behind — it does not index `session-end-learnings.md` (project type).

---

## Learnings for Methodology

### Agent sizing
12 files read in 3 parallel batches (4 per batch) plus 1 directory check. Right-sized for a single agent. 12 memories is a comfortable scope — all reads completed without stalling. For SoNash at 25 memories, recommend splitting into 2 agents (D4a covers A-M, D4b covers N-Z) or batching by type (user/feedback in one agent, project/reference in another).

### File-type observations
All files are `.md` with YAML frontmatter. Frontmatter is consistent: `name`, `description`, `type`, `status` fields. One exception: `MEMORY.md` (the index) has no frontmatter at all. Another: `session-end-learnings.md` omits the `status: active` field — it may be intentional since an append-only log doesn't have a status in the same sense. The frontmatter `name` field matches the filename slug in all cases, which makes automated parsing reliable.

### Classification heuristics
The `type` → `scope_hint` mapping is clean for `feedback` and `user` types (both → `user` scope). The `project` type → `project` scope works cleanly. The `reference` type (not present in this set) should map to `user` scope per the assignment spec. The only ambiguity is `user_expertise_profile.md` which carries project-specific content — the type field alone is insufficient to flag this; body inspection is required.

The four-type taxonomy (user / feedback / project / reference) fits all 11 memories cleanly. No outliers. The index file (`MEMORY.md`) would need a fifth type (`index`) if it were to be included in the taxonomy — currently it sits outside.

### Dependency extraction
No memories reference other memories by filename in their body text. Cross-references are conceptual (convergence loops mentioned in parallel-agents body) but not linked. Dependency extraction from body text would require semantic inference, not string matching. The `MEMORY.md` index IS the explicit dependency graph — it links by markdown hyperlink to filenames. That is the cleanest extraction surface: parse MEMORY.md links to derive the dependency list for the index.

For the schema, `dependencies` field will mostly be empty arrays for individual memories, and populated only for the index. This is correct — memories are intentionally self-contained.

### Schema-field candidates
Beyond `memory_type`, `scope`, `portability`:

- **`status`** — present in frontmatter (`active`). Should be in schema. Enables filtering stale memories.
- **`related_memories[]`** — needed to express overlap (e.g., `feedback_no_preexisting_rejection` ↔ `feedback_code_review_patterns`). Not inferable from body text alone; requires human annotation.
- **`supersedes`** / **`superseded_by`** — needed for the `feedback_verify_not_grep` vs `feedback_grep_vs_understanding` naming divergence. This is the highest-priority schema gap.
- **`source_session`** — would let us trace when each memory was created. Not in frontmatter currently; would need git log as the source (`git log --follow -1 -- <file>`).
- **`last_referenced`** — not tracked anywhere currently; would require hook instrumentation.
- **`append_only`** — boolean; true for `session-end-learnings.md`. Would guide sync behavior (never overwrite, only append).
- **`portability_notes`** — free-text field to explain WHY a memory needs sanitization (e.g., "contains project-specific stack note on line 6").

Flagged supersession: `feedback_verify_not_grep` (canonical) appears to be the same memory as `feedback_grep_vs_understanding` (user-home). The user-home version may be a renamed successor. Without a `supersedes` field, this relationship is invisible to automated sync.

### Adjustments recommended for SoNash memory scan
SoNash canonical has ~25 memories (2x JASON-OS). Specific adjustments:

1. **Split into 2 sub-agents** — one for A-L filenames, one for M-Z. Each reads ~12-13 files, which is the comfortable range established here.
2. **Prioritize frontmatter parsing** — all JASON-OS files have clean frontmatter; SoNash likely follows the same convention, so frontmatter extraction should be the primary metadata source.
3. **Flag all project-type memories individually** — SoNash's project memories will be entirely different content; these are not portable and should be inventoried separately to prevent accidental sync.
4. **Check for reference-type memories** — JASON-OS canonical has none; user-home MEMORY.md references `t3_convergence_loops.md` and `reference_pr_review_integrations.md` under a Reference section. SoNash may have these or equivalents.
5. **Run git log on each file** — `git log --follow -1 --format="%ai %s" -- <file>` to get creation date and source session context. This is feasible in the SoNash scan and adds the `source_session` candidate field.
6. **Check for naming divergence** — the `feedback_verify_not_grep` vs `feedback_grep_vs_understanding` issue suggests SoNash may have memories that were renamed but the old name persists in the user-home MEMORY.md index. Cross-check every link in SoNash's MEMORY.md against actual filenames.
7. **Look for append-only logs** — SoNash likely has a `session-end-learnings.md` equivalent or similar retrospective log. Mark as `append_only: true` and `not-portable`.
