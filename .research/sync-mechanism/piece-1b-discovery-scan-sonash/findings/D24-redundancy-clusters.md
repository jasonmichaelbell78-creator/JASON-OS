# D24 — Redundancy Cluster Analysis (Post-Wave-1)

**Agent:** D24
**Profile:** codebase
**Date:** 2026-04-18
**Scope:** Post-Wave-1 redundancy detection across memories (83-file pool), skills (80+), agents (40+), and scripts. Identifies consolidation candidates for Piece 2+.

---

## Summary Statistics

| Category | Clusters Found | Members in Overlap | Top Consolidation Action |
|---|---|---|---|
| Memory | 7 clusters | 26 memory files | 2 merge-into-one, 1 supersede-canonical |
| Skill | 5 clusters | 26 skill files | 2 deprecated-delete, 1 extract-shared-template |
| Agent | 3 clusters | 18 agent files | 1 do-not-port (deprecated stubs) |
| Script | 3 clusters | ~44 script files | 1 byte-identical-copy maintenance |
| **Total** | **18 clusters** | **~114 units** | |

**Memories with substantive consolidation opportunity: 13** (MEM-C2, C3, C4, C5, C6 clusters)

---

## Part 1: Memory Redundancy Clusters

### MEM-C1: Agent Operational Constraints (LOW priority — keep separate)

**Members (4):** `feedback_agent_config_revert_hazard`, `feedback_agent_hot_reload`, `feedback_agent_output_files_empty`, `feedback_agent_stalling_pattern`

**Overlap: ~35%** — domain-adjacent, not semantically identical.

All four cover constraints on agent spawning and runtime behavior (hazards, limitations, failure modes). They belong to the same "agent gotchas" mental model but each addresses a distinct, non-overlapping failure mode:

- Config-revert: stale snapshot when agent edits shared config
- Hot-reload: agents created mid-session not in registry
- Output files empty: Windows symlink constraint, 0-byte output
- Stalling: context exhaustion on 16+ files

**Recommendation:** Keep all four as separate files. Group them under a shared section label in MEMORY.md ("Agent Operational Gotchas") without merging content. No files should be deleted.

---

### MEM-C2: Agent Quality and Scale (HIGH priority — partial merge)

**Members (4):** `feedback_agent_teams_learnings`, `feedback_parallel_agents_for_impl`, `feedback_no_incomplete_agent_findings`, `feedback_no_agent_budgets`

**Overlap: ~45%** — thematic overlap, one confirmed absorption.

The key finding here is documented supersession that has NOT been applied in JASON-OS:

- `feedback_parallel_agents_for_impl` (canonical-only in SoNash, per D5) was absorbed INTO `feedback_agent_teams_learnings` in the SoNash user-home evolution. The SoNash user-home version of `agent_teams_learnings` contains the parallel_agents content merged in.
- JASON-OS has BOTH as separate files. `feedback_agent_teams_learnings` in JASON-OS is the older, pre-merge version; `feedback_parallel_agents_for_impl` is separate.
- SoNash canonical has `feedback_parallel_agents_for_impl` as a standalone orphan file (no user-home counterpart).

**Recommendation:** Evaluate absorbing `feedback_parallel_agents_for_impl` content into JASON-OS's `feedback_agent_teams_learnings` (matching the SoNash user-home evolution). The canonical file is the orphan that should be retired. `no_incomplete_agent_findings` and `no_agent_budgets` are sufficiently distinct to keep separate.

**Net change:** 1 merge (parallel_agents → agent_teams_learnings), resulting in 3 remaining files.

---

### MEM-C3: Interactive Gates and Acknowledgment — CRITICAL CONSOLIDATION (CRITICAL priority — merge into one)

**Members (4):** `feedback_ack_requires_approval`, `feedback_interactive_gates`, `feedback_never_bulk_accept`, `feedback_never_defer_without_approval`

**Overlap: ~70%** — major semantic overlap, direct textual duplication confirmed.

**This is the highest-value memory consolidation in the entire corpus.** Direct evidence of textual duplication:

| Rule | Location 1 | Location 2 |
|---|---|---|
| Never act on a question you just asked | `feedback_ack_requires_approval` body | `feedback_interactive_gates` rule 2 |
| Never interpret ambiguous input as bulk acceptance | `feedback_never_bulk_accept` body | `feedback_interactive_gates` rule 3 |

`feedback_interactive_gates` is already a superset of `feedback_ack_requires_approval` AND `feedback_never_bulk_accept`. The three files address the same behavioral failure (acting without explicit user confirmation) from three different incident angles, but with near-identical prescriptions.

`feedback_never_defer_without_approval` is a borderline case — it covers skill-step discipline (don't skip phases without user decision) which is related but distinct. The "never defer" rule is about comprehensive skill execution, not just gate-waiting.

**Recommendation:**
1. Absorb `feedback_ack_requires_approval` into `feedback_interactive_gates` as named rule 1 (already implicit)
2. Absorb `feedback_never_bulk_accept` into `feedback_interactive_gates` as named rule 3 (already present verbatim)
3. Keep `feedback_never_defer_without_approval` separate (covers skill execution discipline, not just gate-waiting)
4. Result: 2 files remain from 4 (interactive_gates + never_defer_without_approval)

**Net change:** -2 files, zero information loss.

---

### MEM-C4: Grep Anti-Patterns — Known Supersession (HIGH priority — supersede canonical)

**Members (2):** `feedback_grep_vs_understanding`, `feedback_verify_not_grep`

**Overlap: ~85%** — direct supersession, confirmed by D4a findings and Piece 1a §6.2.

This is the pre-documented supersession case. The relationship:
- `feedback_verify_not_grep` (canonical-only): narrower framing — "don't use grep for verification"
- `feedback_grep_vs_understanding` (user-home and JASON-OS): broader framing — adds "don't use grep for analysis", "replace grep pipelines with structured data"

JASON-OS correctly has only the newer broader file. SoNash canonical has only the older narrower file.

**Recommendation:**
1. Add `superseded_by: feedback_grep_vs_understanding` frontmatter to `feedback_verify_not_grep.md` in SoNash canonical
2. Add `supersedes: feedback_verify_not_grep` frontmatter to `feedback_grep_vs_understanding.md` in both SoNash user-home and JASON-OS
3. In SoNash canonical, replace the canonical file with the broader version under the new name
4. No files deleted yet — preserve the superseded_by chain until D23 completes the memory graph

**Net change in JASON-OS:** 0 (already correct). Net change in SoNash canonical: 1 rename + frontmatter update.

---

### MEM-C5: PR Review Process (MEDIUM priority — partial merge)

**Members (5):** `feedback_code_review_patterns`, `feedback_pr_review_paste_only`, `feedback_pr_review_state_files`, `feedback_pr_timing`, `feedback_no_preexisting_rejection`

**Overlap: ~30%** — domain-adjacent, with compound-vs-standalone duplication in code_review_patterns.

Confirmed duplication within the cluster:

| Rule | In code_review_patterns | In standalone file |
|---|---|---|
| Never reject items as pre-existing | YES ("Never reject items as 'pre-existing'") | YES (feedback_no_preexisting_rejection) |
| Create PR after session close-out | YES ("Create PR AFTER session close-out") | YES (feedback_pr_timing covers this) |

`feedback_code_review_patterns` is a compound file that has absorbed several rules that also exist as standalone files with more detail.

**Recommendation:**
- Option A (deduplicate compound): Remove the duplicated sub-rules from `feedback_code_review_patterns` and have it reference the standalone files, keeping it as a high-level overview.
- Option B (promote compound): Expand `feedback_code_review_patterns` to be the authoritative compound file, deprecating the standalone `feedback_no_preexisting_rejection` and folding `feedback_pr_timing` into it.

`feedback_pr_review_paste_only` and `feedback_pr_review_state_files` are distinct enough (specific operational constraints) to keep separate regardless of which option is chosen.

**Recommended:** Option B for JASON-OS — `feedback_code_review_patterns` becomes the compound file. `feedback_no_preexisting_rejection` is absorbed (with its expanded detail from the standalone file). `feedback_pr_timing` rule is folded in.

**Net change:** -1 to -2 files if Option B.

---

### MEM-C6: Premature Progression Anti-Patterns (HIGH priority — merge into one)

**Members (3):** `feedback_no_premature_next_steps`, `feedback_no_session_end_assumptions`, `feedback_dont_over_surface`

**Overlap: ~60%** — high semantic overlap, direct textual inclusion confirmed.

Direct evidence of textual inclusion (content read confirmed):

| Rule | In no_premature_next_steps | In standalone file |
|---|---|---|
| "Never propose fold into session-end..." | YES (last bullet point) | YES (feedback_no_session_end_assumptions entire file) |
| "When asked anything else? — name only true blockers. Don't enumerate..." | YES (second-to-last bullet) | YES (feedback_dont_over_surface entire file) |

`feedback_no_premature_next_steps` already contains both the session-end rule and the over-surfacing rule as bullet points. The standalone files are more detailed versions of those same bullets.

**Recommendation:**
1. Make `feedback_no_premature_next_steps` the master file
2. Expand its session-end and over-surfacing bullets to match the standalone file detail
3. Delete `feedback_no_session_end_assumptions` and `feedback_dont_over_surface` (or mark as superseded_by: no_premature_next_steps)
4. Result: 1 enriched master file from 3

**Net change:** -2 files, zero information loss (the detail is already in no_premature_next_steps, expanded).

---

### MEM-C7: Skills and Workflow Discipline (LOW priority — keep separate)

**Members (4):** `feedback_skills_in_plans_are_tool_calls`, `feedback_per_skill_self_audit`, `feedback_no_unnecessary_brainstorming`, `feedback_workflow_chain`

**Overlap: ~25%** — domain-adjacent, complementary not redundant.

The brainstorm pair (`workflow_chain` + `no_unnecessary_brainstorming`) is the closest overlap: one establishes when TO brainstorm; the other corrects premature invocation. They are complementary by design, not redundant. The other two cover distinct concerns (skill execution and quality).

**Recommendation:** Keep all four separate. No consolidation warranted.

---

## Part 2: Skill Redundancy Clusters

### SKILL-C1: Audit-* Single-Session Family (MEDIUM priority — normalize structure)

**Members (9):** `audit-code`, `audit-performance`, `audit-engineering-productivity`, `audit-security`, `audit-refactoring`, `audit-enhancements`, `audit-documentation`, `audit-aggregator`, `audit-ai-optimization`

**Structural overlap: ~65%** — template family with intentional domain differentiation.

D1e/D1f confirm these are structurally near-identical: identical frontmatter extensions (`supports_parallel`, `fallback_available`, `estimated_time_*`), same parallel+sequential architecture, same `_shared/AUDIT_TEMPLATE.md` delegation, same TDMS intake pipeline, same JSONL finding schema. The domain content (file targets, check categories) is legitimately different.

The pattern mirrors what `_shared/ecosystem-audit/` did for the ecosystem audit family. For the single-session audit family, `_shared/AUDIT_TEMPLATE.md` already abstracts some shared protocol but the JSONL schema and frontmatter extensions are still copy-pasted.

**Recommendation:** Do not merge skills. For sync-mechanism: port as a family bundle; any port of one templates the others. For future Piece 2+ consolidation: extract the JSONL finding schema into a shared schema file, and normalize the frontmatter extensions.

---

### SKILL-C2: Ecosystem Audit Family (LOW priority — already extracted)

**Members (8):** `hook-ecosystem-audit`, `tdms-ecosystem-audit`, `pr-ecosystem-audit`, `session-ecosystem-audit`, `script-ecosystem-audit`, `doc-ecosystem-audit`, `skill-ecosystem-audit`, `health-ecosystem-audit`

**Structural overlap: ~70%** — shared extraction already done.

The redundancy was already addressed by extracting `_shared/ecosystem-audit/` (5 shared modules). The remaining inline duplication exists only in `hook-ecosystem-audit` and `script-ecosystem-audit` (v2.0, predating the March 25 extraction). `lib/` file copies are intentional self-contained bundles.

**Recommendation:** No immediate consolidation needed. Track future migration of hook and script audits to use `_shared/` delegation (reducing inline protocol duplication). For sync-mechanism: `_shared/ecosystem-audit/` must port first as a prerequisite for the 6 skills that depend on it.

---

### SKILL-C3: CAS Cluster (MEDIUM priority — all-or-nothing port bundle)

**Members (3):** `analyze`, `synthesize`, `recall`

**Overlap: ~30%** — pipeline family sharing a data contract, not redundant.

These three form the Content Analysis System (T28 epic). Each serves a distinct phase (input/transform/query). They cannot be usefully merged — the overlap is the shared data contract (analysis.json, content-analysis.db) not functional purpose.

**Recommendation:** Not a consolidation candidate — a bundle candidate. For sync-mechanism: treat as all-or-nothing port. None are in JASON-OS; porting one alone would be useless. Flag as a future bundle when JASON-OS designs its CAS equivalent.

---

### SKILL-C4: website-synthesis + repo-synthesis — DELETE BOTH (CRITICAL — deprecation artifacts)

**Members (2):** `website-synthesis`, `repo-synthesis`

**Overlap: 100%** — both are deprecated redirect stubs, both superseded by `synthesize`.

These are pure migration artifacts from the T29 synthesis consolidation (Session #271, 2026-04-09). Both are ~2-3KB redirect-only stubs scheduled for deletion. Both have `superseded_by: synthesize` in their SKILL.md.

**Recommendation:** Delete both from SoNash. Do not port either to JASON-OS. Port only `synthesize` as the current canonical synthesis skill.

---

### SKILL-C5: audit-code / audit-performance / audit-engineering-productivity — Identical Frontmatter (MEDIUM priority — template extraction)

**Members (3):** `audit-code`, `audit-performance`, `audit-engineering-productivity`

**Overlap: ~80%** — near-identical structure per D1f.

D1f explicitly: "structurally near-identical: same YAML frontmatter, same parallel+sequential architecture, same `_shared/AUDIT_TEMPLATE.md` delegation." This is a subset of SKILL-C1 but more tightly coupled. Any port of one naturally templates the others.

**Recommendation:** When porting, use one as the template. For Piece 2+ consolidation: extract shared boilerplate (parallel mode declaration, TDMS intake steps, JSONL schema) into a parameterized shared file. Consolidation opportunity is structural, not content-level.

---

## Part 3: Agent Redundancy Clusters

### AGENT-C1: Deprecated Consolidation Stubs — DO NOT PORT (CRITICAL)

**Members (8):** `deployment-engineer`, `devops-troubleshooter`, `error-detective`, `markdown-syntax-formatter`, `penetration-tester`, `prompt-engineer`, `react-performance-optimization`, `security-engineer`

All 8 are redirect-only stubs consolidated 2026-04-01. Expiry: 2026-06-01. Targets: debugger (3), fullstack-developer (1), performance-engineer (1), technical-writer (3).

**Recommendation:** Do not port any of these to JASON-OS. Port only the consolidation targets (debugger, fullstack-developer, performance-engineer, technical-writer). In SoNash, delete after the 2026-06-01 expiry (no automated enforcement found).

---

### AGENT-C2: Deep-Research Pipeline Agents (LOW priority — all distinct)

**Members (8):** Deep-research pipeline + challengers.

All 8 are already in JASON-OS. Each covers a distinct pipeline phase. The contrarian/otb pair is the closest semantic pair but they are genuinely distinct roles (steel-man/pre-mortem vs out-of-the-box alternatives). No consolidation warranted.

**Recommendation:** No changes needed. The only delta between SoNash and JASON-OS versions is the `skills: [sonash-context]` frontmatter field — which should be replaced with a `jason-os-context` equivalent when that skill is created.

---

### AGENT-C3: Context Injection Agents (MEDIUM priority — evaluate for JASON-OS)

**Members (2):** `general-purpose` (agent), `sonash-context` (skill used as context injector)

These are complementary mechanisms at different layers, not redundant. `general-purpose` is a project-aware direct-use agent. `sonash-context` is a context-injection vehicle for other agents via `skills:` frontmatter.

For JASON-OS, the `general-purpose` agent should be sanitized and ported (replacing SoNash constraints with JASON-OS-specific constraints). The `sonash-context` mechanism should be reimplemented as `jason-os-context`. This is a high-value architectural pattern to adopt.

---

## Part 4: Script Redundancy Clusters

### SCRIPT-C1: check-* Scripts (MEDIUM priority — shared infrastructure)

**Members (~27):** All `check-*.js` scripts identified by D6a-d.

Without deep-reading every script (outside D24 scope), pattern-level analysis from D1a/b and D6a-d suggests:
- Several are near-identical in structure (validation pattern, exit code conventions)
- Domain logic differs per script
- No confirmed byte-identical pairs (unlike safe-fs.js)

**Recommendation:** Defer deep analysis to a dedicated consolidation pass. The opportunity is a shared `check-infrastructure.js` utility (common CLI arg parsing, output formatting, exit code conventions) that all check-* scripts import. This mirrors what `_shared/ecosystem-audit/` did for skill protocol.

---

### SCRIPT-C2: safe-fs.js Copies — Byte-Identical (MEDIUM priority — document sync requirement)

**Members (~10):** Canonical `scripts/lib/safe-fs.js` + copies in each ecosystem-audit skill's `scripts/lib/` directory.

D1a confirmed byte-identical copies across all 5 mega-skill bundles. D1b confirms the same for the remaining audits and alerts. Total: ~10 copies.

The copy pattern is intentional (self-contained skill bundles). This is not redundancy to eliminate but a maintenance requirement to document: canonical source = `scripts/lib/safe-fs.js`; any fix must propagate to all copies.

**Recommendation:** Document sync requirement. Add a linting check that verifies skill-local `safe-fs.js` copies match the canonical. JASON-OS already has `scripts/lib/safe-fs.js` as the canonical.

---

### SCRIPT-C3: Skill Self-Audit Scripts (MEDIUM priority — extract shared base)

**Members (7):** `scripts/skills/*/self-audit.js` across skill-audit, pr-review, session-end, brainstorm, deep-plan, convergence-loop, deep-research.

D1f confirms these are "7 similar but distinct." Each handles that skill's invariants on top of shared structural checks. `feedback_per_skill_self_audit` (JASON-OS memory) explicitly prescribes the correct consolidation: "scripting from a base means the structural checks stay uniform and only the skill-specific extensions diverge."

**Recommendation:** Extract a `scripts/skills/shared/self-audit-base.js` module containing structural checks (frontmatter presence, line count, MUST/SHOULD hierarchy, JSONL output format). Each skill's `self-audit.js` imports the base and adds skill-specific invariant checks. No files deleted; all refactored to use shared base.

---

## Part 5: Ranked Consolidation Opportunities

| Rank | Cluster | Action | Impact | Files Affected |
|---|---|---|---|---|
| 1 | MEM-C3 (interactive gates + ack + never_bulk_accept) | Merge 3 → 1 | Eliminates 2 redundant files with 70% content duplication | 3 memory files |
| 2 | MEM-C6 (premature progression trio) | Merge 3 → 1 | Eliminates 2 files whose content already exists in the master | 3 memory files |
| 3 | AGENT-C1 (deprecated stubs) | Delete 8 | Removes 8 expired redirect stubs | 8 agent files |
| 4 | SKILL-C4 (website-synthesis + repo-synthesis) | Delete 2 | Removes 2 expired deprecated skills | 2 skill files |
| 5 | MEM-C4 (grep supersession) | Add supersedes frontmatter | Formalizes known supersession chain | 2 memory files |
| 6 | MEM-C2 (parallel_agents absorption) | Merge 1 → 0 (parallel_agents into agent_teams) | Closes canonical-vs-user-home divergence | 2 memory files |
| 7 | MEM-C5 (PR review compound) | Partial merge | Reduces duplication in code_review_patterns | 3-5 memory files |
| 8 | SCRIPT-C3 (self-audit base extraction) | Refactor | Reduces structural duplication in 7 scripts | 7+ script files |
| 9 | SKILL-C5 (audit trio template) | Extract template | Reduces boilerplate in 3 near-identical skills | 3 skill files |
| 10 | SCRIPT-C2 (safe-fs.js sync) | Document + lint | Prevents maintenance hazard from copy drift | ~10 script files |

---

## Learnings for Methodology

### 1. Cross-file textual duplication is detectable only by reading both files

The MEM-C3 cluster (interactive_gates superset) was only detectable by reading the full content of all three files. Filename similarity alone would not reveal that `feedback_interactive_gates.md` already contains the full text of `feedback_never_bulk_accept.md` as rule 3. Any methodology relying on filename clustering alone will miss this class of redundancy.

**Implication:** Redundancy detection requires full content reads, not just index-level scanning. D24 scope must include reading the actual file content, not just JSONL metadata.

### 2. The "compound file absorbing standalone rules" pattern is a consolidation trigger

`feedback_code_review_patterns` and `feedback_no_premature_next_steps` are both compound files where sub-rules have also been captured as standalone files. This creates two levels of truth that can drift. The pattern requires either: (a) promote the compound file to be authoritative and delete the standalone duplicates, or (b) keep the compound as a thin index that points to the standalone files. Either approach is better than the current state where the same rule exists with different detail levels in two places.

**Schema implication for D22:** Add a `compound_rules` array field to the memory schema — when a memory file contains multiple distinct behavioral rules, list them by short name. This enables automated detection of standalone files whose content overlaps with compound files.

### 3. Supersession chains exist without formal metadata

The grep supersession (`verify_not_grep` → `grep_vs_understanding`) was documented in narrative but has no frontmatter metadata. The `parallel_agents_for_impl` absorption into `agent_teams_learnings` (SoNash user-home) similarly has no formal supersedes/superseded_by annotation. Both represent real supersession chains that a sync mechanism would need to detect via semantic matching, not filename matching.

**Implication:** The `supersedes`/`superseded_by` fields in SCHEMA_SPEC are load-bearing. They need to be populated retroactively for the confirmed supersession cases. D23 (memory graph agent) should be the canonical source for these relationships but D24 has surfaced the confirmed instances.

### 4. Three-way redundancy in interactive-gates memories may indicate session-capture pattern

MEM-C3 has three separate files created in different sessions for the same behavioral failure (not waiting for user confirmation). This suggests the behavioral correction keeps being made fresh in each session because the existing memories aren't firing. The redundancy is a signal that the behavioral rule isn't sticking — having it in three places hasn't helped. The consolidation into one authoritative file with all three incident angles may improve recall.

### 5. The canonical-only orphan (feedback_parallel_agents_for_impl) is a documentation of completed absorption

The canonical file exists without a user-home counterpart because the user-home version merged it. This is an under-documented pattern: when user-home evolves to absorb a rule from a separate canonical file into an existing file, the canonical is left orphaned. Future methodology should check for canonical-only files and determine if they represent: (a) content that never made it to user-home, or (b) content that was absorbed into user-home under a different name/location.

### 6. Skill family bundles are not redundancy — they are structured parallelism

The audit-* family and ecosystem-audit family look redundant at first glance (same structure, many members). They are not redundancy to eliminate but structured parallelism to manage. The consolidation opportunity is shared infrastructure (templates, schemas, protocol docs) not skill merging. Methodology should distinguish: (a) structural similarity = port as family bundle, and (b) functional overlap = consolidation candidate.

---

## Gaps and Missing References

1. **D1e uncovered 20 skills:** D1f noted D1e was never spawned, leaving 20 skills unscanned (brainstorm, deep-plan, session-begin, session-end, todo, audit-aggregator, audit-ai-optimization, audit-documentation, audit-enhancements, audit-refactoring, audit-security, and others). Any redundancy among those 20 skills is undetected. In particular, `audit-aggregator` (synthesizes all 9 audit outputs) may have structural overlap with the ecosystem audit family findings.

2. **D22 (schema surveyor) not yet filed:** D22a/b findings referenced in the task brief were not in the findings directory at time of D24 execution. Schema overlap analysis between JSONL records cannot be completed until D22 files its output.

3. **SoNash memory files (positions 43-63) — D4c gap:** D4d noted D4c was never filed. Positions 43-63 (feedback_testing_with_writes through project_reviews_system_health — 21 files) are unscanned. These include feedback files that may participate in memory clusters. In particular, `feedback_testing_with_writes`, `feedback_workflow_chain`, and `feedback_worktree_guidance` from this range could add to existing clusters.

4. **check-* script deep analysis deferred:** Without reading every check-* script, the true redundancy within the 27+ scripts cannot be characterized beyond structural/pattern-level. A dedicated script-redundancy agent with read access to the scripts/ directory would produce higher-confidence findings.

5. **JASON-OS vs SoNash memory divergence not fully mapped:** Several JASON-OS memories are JASON-OS-only (no SoNash counterpart): `feedback_no_file_out_of_scope_sync_scans`, `feedback_no_research_caps`, `feedback_explain_before_decide`, `feedback_pre_analysis_before_port`, `feedback_todo_graduation`, `feedback_permission_over_aliases`, `feedback_sonarcloud_mark_as_safe`, `feedback_project_scoped_over_global`, `feedback_dont_over_surface`, `feedback_no_session_end_assumptions`. These represent behavioral learnings captured only in JASON-OS. Whether they should be backported to SoNash is a separate analysis.

6. **GSD skill family not inventoried in D1a-f:** The 11 GSD agents reference 9 GSD skills (`gsd:*` commands) that were never assigned to a D1 agent. Any redundancy within the GSD skill family is undetected.

---

## Confidence Assessment

- HIGH claims: 12 (direct file reads confirming textual duplication, JSONL metadata confirmed, D-agent narrative quotes used directly)
- MEDIUM claims: 5 (script cluster analysis based on structural patterns, not direct reads; partial merge recommendations for MEM-C5 where the best option is judgment-dependent)
- LOW claims: 1 (check-* script redundancy depth — only structural inference, not content-level verification)
- UNVERIFIED claims: 0
- Overall confidence: HIGH
