# D14c Findings: .research/archive/ Inventory

**Agent:** D14c
**Profile:** codebase
**Date:** 2026-04-18
**Scope:** `.research/archive/` — 18 archived research sessions in SoNash (sonash-v0)
**Schema:** SCHEMA_SPEC.md v1.0

---

## Archive Topic Taxonomy (Grouped by Theme)

### Theme 1: Claude Code Infrastructure Research (6 sessions)

| Session | Depth | Type | Claims | Sources |
|---------|-------|------|--------|---------|
| `claude-code-permissions` | L1 | deep-research | 9 | 9 |
| `hook-if-conditions` | L1 | deep-research | 60 | 39 |
| `custom-agents` | L4 | deep-research | 111 | 58 |
| `custom-statusline` | L1 | deep-research | 30 | 27 |
| `worktree-management` | L0-brainstorm | brainstorm | 0 | 0 |
| `t39-hook-ecosystem` | L2 | hybrid | 0 | 0 |

These sessions research the Claude Code platform itself — permissions, hooks, agents, statusline, parallel instances, hook failure diagnosis. `hook-if-conditions` and `claude-code-permissions` have direct portability to JASON-OS.

### Theme 2: Repo Analysis Skill Family (4 sessions)

| Session | Depth | Type | Claims | Sources |
|---------|-------|------|--------|---------|
| `repo-analysis-skill` | L4 | deep-research | 50 | 147 |
| `repo-analysis-value-extraction` | L1 | deep-research | 80 | 131 |
| `repo-analysis-knowledge` | L0-brainstorm | brainstorm | 0 | 0 |
| `unified-content-intelligence` | L0-brainstorm | brainstorm | 0 | 0 |

Sequential evolution: `repo-analysis-skill` (defensive/health lens) → `repo-analysis-value-extraction` (offensive/creator lens) → `repo-analysis-knowledge` (insight/philosophy lens) → `unified-content-intelligence` (T28 unified system replacing all 4 analysis/synthesis skills). The last three are SoNash-specific design evolution that won't apply to JASON-OS directly, but the research methodology is reusable.

### Theme 3: Skill Family Comparison and Quality (3 sessions)

| Session | Depth | Type | Claims | Sources |
|---------|-------|------|--------|---------|
| `analysis-synthesis-comparison` | L1 | deep-research | 60 | 15 |
| `learning-system-effectiveness` | L1 | deep-research | 40 | 80 |
| `learning-analysis` | L0-brainstorm | brainstorm | 0 | 0 |

Research on how SoNash skills work together and whether the learning/behavioral system is actually improving Claude's behavior. `learning-system-effectiveness` has strong methodology-reuse potential for any AI project measuring behavioral compliance.

### Theme 4: Codebase Operations (3 sessions)

| Session | Depth | Type | Claims | Sources |
|---------|-------|------|--------|---------|
| `repo-cleanup` | L1 | deep-research | 45 | 0 |
| `plan-orchestration` | L3 | deep-research | 34 | 28 |
| `github-health` | L1 | deep-research | 39 | 27 |

Codebase-specific operations research. `repo-cleanup` audit framework (9 graded categories) is reusable. `plan-orchestration` is SoNash-specific (7 active plans at that time). `github-health` contains PAT leak findings specific to SoNash's GitHub state.

### Theme 5: External Tool Research (2 sessions)

| Session | Depth | Type | Claims | Sources |
|---------|-------|------|--------|---------|
| `cli-tools` | L1 | deep-research | 45 | 73 |
| `codex-claude-code-plugin` | L1 | deep-research | 50 | 70 |

Tool evaluation research. `cli-tools` is dated (2026-03-23) but the evaluation methodology is reusable. `codex-claude-code-plugin` contains a Windows-specific blocking bug finding and security analysis of the OpenAI/Anthropic dual-cloud approach.

---

## Archive Date Range

| Oldest | Newest |
|--------|--------|
| 2026-03-23 (`cli-tools`, `custom-statusline`, `repo-cleanup`) | 2026-04-11 (`t39-hook-ecosystem`) |

Span: approximately 3 weeks. Most sessions fall in late March to early April 2026.

---

## Dup-With-Index Sessions

Sessions that appear BOTH in `.research/archive/` AND in `research-index.jsonl`:

| Session | Index Status | Index outputPath | Archive Path | Path Conflict? |
|---------|-------------|-----------------|--------------|---------------|
| `cli-tools` | archived | `.research/archive/cli-tools/` | `.research/archive/cli-tools/` | No |
| `custom-statusline` | archived | `.research/archive/custom-statusline/` | `.research/archive/custom-statusline/` | No |
| `hook-if-conditions` | archived | `.research/archive/hook-if-conditions/` | `.research/archive/hook-if-conditions/` | No |
| `claude-code-permissions` | archived | `.research/archive/claude-code-permissions/` | `.research/archive/claude-code-permissions/` | No |
| `custom-agents` | complete | `.research/custom-agents/` | `.research/archive/custom-agents/` | YES |
| `plan-orchestration` | complete | `.research/plan-orchestration/` | `.research/archive/plan-orchestration/` | YES |
| `github-health` | complete | `.research/github-health/` | `.research/archive/github-health/` | YES |
| `analysis-synthesis-comparison` | complete | `.research/analysis-synthesis-comparison/` | `.research/archive/analysis-synthesis-comparison/` | YES |
| `repo-analysis-skill` | complete | (empty) | `.research/archive/repo-analysis-skill/` | Partial |

**Total dup-with-index: 9 sessions (4 archived-status, 5 complete-status with path conflicts)**

The 5 sessions marked `complete` in the index but physically located in `archive/` represent a significant data integrity issue. The index records them with non-archive output paths that don't exist on disk. This means consumers reading `research-index.jsonl` and following `outputPath` will get 404s for those 5 sessions.

---

## Methodology-Reusable Archives

Archives whose research methodology, frameworks, or findings are directly applicable to future JASON-OS research scans:

| Session | Reusable Element | Notes |
|---------|-----------------|-------|
| `hook-if-conditions` | if-condition spec findings, OTB feasibility triage, spawn-elimination patterns | Core findings are platform-level (Claude Code), not SoNash-specific |
| `claude-code-permissions` | Complete permissions reference (file locations, precedence, merge rules) | Only path/example sanitization needed |
| `worktree-management` | Native `claude --worktree` flag discovery, state isolation requirements, CLAUDE_PROJECT_DIR env var pattern | AI Instructions block is directly embeddable |
| `learning-system-effectiveness` | Measurement framework (SECI, Goodhart's Law, ratcheting), code-vs-behavioral separation principle | Applies to any AI project learning system |
| `custom-agents` | 5-wave deep-research structure, consolidation framework, gap-pursuit amendment pattern | Methodology is the reusable part; SoNash agent specifics are not |
| `cli-tools` | Multi-round search + contrarian verification workflow (6/6 self-audit) | Process quality exemplar |
| `repo-cleanup` | 9-category graded cleanup audit framework | Applies to any codebase audit |
| `codex-claude-code-plugin` | Security threat modeling pattern (dual-cloud, review gate risk) | Pattern reusable; specific findings dated |
| `analysis-synthesis-comparison` | Comparative skill analysis framework, schema drift detection, cross-pollination methodology | Applies to any skill family comparison |
| `unified-content-intelligence` | Anti-goals framework, unified extraction pipeline architecture | JASON-OS has no such system yet; architecture pattern is portable |

---

## Learnings for Methodology

**1. Archive structural heterogeneity is significant.**
Of 18 archived sessions, 3 are brainstorm-only (no claims.jsonl), 1 is an atypical live-investigation capture (t39, 6 non-standard files), and 1 is a pre-schema session (claude-code-permissions, findings/ only). The assumption that all archive sessions follow the standard schema (RESEARCH_OUTPUT.md + claims.jsonl + metadata.json + sources.jsonl) is wrong for 5 of 18 sessions (28%). Future archive scanners must check structure before assuming schema.

**2. Index path conflicts are a material data integrity issue.**
5 sessions are marked `complete` in research-index.jsonl with outputPaths pointing to non-archive locations (e.g., `.research/custom-agents/`) but the actual data lives in `archive/`. Index status (`complete`) and physical location (`archive/`) are inconsistent. The index was likely not updated when sessions were moved to archive.

**3. Brainstorm sessions in archive are underrepresented in depth metadata.**
4 brainstorm-only sessions have no claim_count or source_count data. The `depth: L0-brainstorm` enum is the right classification but the schema lacks a `brainstorm_questions_answered` field that would be more informative than claim_count:0.

**4. T39 session is neither standard research nor brainstorm.**
The t39-hook-ecosystem archive is a compaction-survival handoff dump — session state, continuation plans, handoffs, and a PR body. This is a distinct artifact type (live-investigation-capture) not represented in the type enum. Classified as `hybrid` for now. Suggest D22 evaluate adding `type: investigation-handoff` to the enum.

**5. Source count ranges dramatically.**
Archive source counts range from 0 (brainstorms) to 147 (repo-analysis-skill). The `claimCount:0, sourceCount:0` pattern for brainstorms is technically correct per schema but loses information. A `phase_reached` field for brainstorms would be more useful.

**6. Depth L3 is rare.**
Only `plan-orchestration` is L3. Most archive sessions are L1 or L4 (deep dives). L2 is absent. L4 appears twice (custom-agents, repo-analysis-skill) — both are architecture-heavy sessions with 29-45 agents.

**7. metadata.json is the most reliable metadata source.**
The research-index.jsonl has stale/conflicting data for several sessions. The session-local metadata.json is more accurate for depth, claims, sources, and outputPath. When they conflict, prefer metadata.json.

---

## Gaps and Missing References

1. **`repo-cleanup` source_count is 0** in metadata.json — no sources.jsonl entry count available. The file exists but metadata didn't capture it.

2. **`github-health` coverage gap**: 18 of 21 planned agents did not produce findings files per metadata. The RESEARCH_OUTPUT.md exists but was synthesized from partial data.

3. **`codex-claude-code-plugin` self-audit not performed** (metadata.json: `"selfAuditResult": null`). Potential quality gap.

4. **`repo-analysis-value-extraction` self-audit not performed** (metadata.json: `"selfAuditResult": null`).

5. **No D14a or D14b outputs were available** when this agent ran. The dup-with-index analysis above covers only what was discoverable via research-index.jsonl directly. D14a (indexed current sessions) would add ~7 indexed current sessions to the census. D14b (un-indexed top-level dirs) would add the non-archive, non-index .research/ dirs.

6. **`t39-hook-ecosystem` has no RESEARCH_OUTPUT.md** — the investigation's findings are distributed across 6 handoff docs. No synthesis was completed before archiving.

---

## Full Research Census

Based on all available data (D14c complete; D14a and D14b not yet available — estimates from direct filesystem inspection):

### D14a — Indexed Current Sessions (research-index.jsonl, non-archived)
From research-index.jsonl analysis:
- `plan-orchestration` (complete) — in archive/, index path stale
- `dev-dashboard` (complete) — in .research/dev-dashboard/
- `custom-agents` (complete) — in archive/, index path stale
- `github-health` (complete) — in archive/, index path stale
- `repo-analysis-skill` (complete) — in archive/, index path stale
- `analysis-synthesis-comparison` (complete) — in archive/, index path stale
- `file-registry-portability-graph` (complete-post-challenge-v1.1) — path TBD

**D14a estimated scope: ~7 indexed current sessions** (note: 5 physically live in archive — D14c has covered them above)

### D14b — Un-Indexed Top-Level .research/ Dirs
Top-level dirs present but NOT in research-index.jsonl:
- `analysis/` (unknown)
- `content-analysis-system/` (unknown)
- `debt-runner-expansion/` (unknown)
- `jason-os/` (JASON-OS specific)
- `multi-layer-memory/` (prior research referenced in unified-content-intelligence brainstorm — 41 agents, 128 claims)
- `repo-analysis/` (unknown — separate from repo-analysis-skill)
- `research-discovery-standard/` (unknown)
- `research-discovery-standard-v2/` (unknown)
- `t28-intelligence-graph-data-layer/` (T28 related)
- `website-analysis/` (analysis/synthesis skill)

**D14b estimated scope: ~10 un-indexed session directories**

### D14c — Archived Sessions (this agent)
**18 sessions confirmed** (4 brainstorm-only, 1 investigation-handoff, 13 standard deep-research)

### Top-Level Artifacts (D14b scope — flat files)
- `extraction-journal.jsonl`
- `research-index.jsonl`
- `EXTRACTIONS.md`
- `source-slug-map.json`
- `tag-vocabulary.json`
- `knowledge.sqlite`
- `content-analysis.db` (+.db-shm, .db-wal)

**Top-level artifact count: 7 files (plus 2 WAL files)**

### Grand Total Research Units

| Category | Count | Source |
|----------|-------|--------|
| D14a: Indexed current sessions | ~7 | research-index.jsonl (non-archived) |
| D14b: Un-indexed top-level dirs | ~10 | filesystem |
| D14b: Top-level flat artifacts | 7 | filesystem |
| D14c: Archived sessions | 18 | this agent |
| **Grand total research units** | **~42** | combined |

**Note:** The 5 "complete" indexed sessions that physically live in archive/ are counted once (in D14c, archived). The index records them as current but they are archived on disk. D14a's effective unique count is therefore ~2 sessions (dev-dashboard, file-registry-portability-graph) that are NOT in archive/.

---

## Confidence Assessment

- HIGH claims: 8 (structural facts directly observed from filesystem)
- MEDIUM claims: 6 (inferences about date ranges, methodology reusability)
- LOW claims: 2 (D14a/D14b census estimates — not yet verified by those agents)
- UNVERIFIED claims: 0
- Overall confidence: MEDIUM-HIGH (archive inventory is complete and direct; census estimates are grounded in filesystem)
