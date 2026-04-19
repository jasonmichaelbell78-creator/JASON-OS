# D14a Findings: SoNash Research-Index Inventory

**Agent:** D14a
**Profile:** codebase
**Date:** 2026-04-18
**Scope:** 11 research sessions tracked in `.research/research-index.jsonl`
**Output JSONL:** `D14a-research-indexed.jsonl`

---

## Index Schema Drift Analysis

The `research-index.jsonl` uses TWO incompatible schemas across its 11 entries.
The split is clean at the 2026-03-31 boundary (confirmed by Piece 1a §6.3/§7.6).

### Schema A: Pre-2026-03-31 Verbose (9 entries)

Fields: `topicSlug`, `topic`, `depth`, `domain`, `completedAt`, `claimCount`,
`sourceCount`, `confidenceDistribution` (object), `keywords` (array),
`outputPath`, `status`.

Sessions using this schema:
- cli-tools (2026-03-23)
- custom-statusline (2026-03-23)
- plan-orchestration (2026-03-24)
- hook-if-conditions (2026-03-29)
- dev-dashboard (2026-03-29)
- custom-agents (2026-03-30)
- github-health (2026-03-29)
- claude-code-permissions (2026-03-25)
- analysis-synthesis-comparison (2026-04-06)

### Schema B: Post-2026-03-31 Short-Form (2 entries)

Fields: `slug`, `topic`, `status`, `depth`, `date`, `claims`, `sources`,
`path`, `tags` (array). No `domain`, no `completedAt` timestamp, no
`confidenceDistribution` object, no `keywords`.

Sessions using this schema:
- repo-analysis-skill (2026-03-31)
- file-registry-portability-graph (2026-04-17)

**Schema split: 9 verbose / 2 short-form.**

### Schema B Anomaly: Non-Standard Status Value

`file-registry-portability-graph` uses `status: "complete-post-challenge-v1.1"`
— a non-standard value not in the SCHEMA_SPEC enum
(`active|deferred|archived|deprecated|stub|gated|complete`). This encodes
versioning information that should be in `notes`.

---

## Per-Session Classification

### 1. cli-tools

- **Status:** archived (confirmed)
- **Actual path:** `.research/archive/cli-tools/` (index path matches)
- **Session type:** deep-research
- **Depth:** L1
- **Claims/Sources:** 45 / 73
- **Portability:** not-portable (SoNash-specific tool choices and workflow)
- **Files:** RESEARCH_OUTPUT.md, challenges/, claims.jsonl, findings/, metadata.json, sources.jsonl
- **Hybrid:** No (no PLAN.md)
- **Schema variant:** pre-2026-03-31-verbose
- **Notes:** Earliest research session. Results fed into SoNash toolchain decisions.

### 2. custom-statusline

- **Status:** archived (confirmed)
- **Actual path:** `.research/archive/custom-statusline/` (index path matches)
- **Session type:** deep-research
- **Depth:** L1
- **Claims/Sources:** 30 / 27
- **Portability:** not-portable (SoNash-specific design decisions; binary shipped to tools/statusline/)
- **Files:** RESEARCH_OUTPUT.md, challenges/, claims.jsonl, findings/, metadata.json, sources.jsonl
- **Hybrid:** No (no PLAN.md)
- **Schema variant:** pre-2026-03-31-verbose
- **Notes:** Research was actioned — statusline binary now in tools/statusline/. The underlying
  widget-design methodology could theoretically be reused but is tightly coupled to SoNash Go/Node choices.

### 3. plan-orchestration

- **Status:** archived (filesystem) / complete (index) — INDEX STATUS DRIFT
- **Actual path:** `.research/archive/plan-orchestration/` — INDEX PATH WRONG (index says `.research/plan-orchestration/`)
- **Session type:** deep-research
- **Depth:** L3 (both index and metadata.json agree)
- **Claims/Sources:** 34 / 28 (metadata.json: 34/28 — match)
- **Portability:** not-portable (specific to SoNash's 7 active plans at that time)
- **Files:** RESEARCH_OUTPUT.md, challenges/, claims.jsonl, findings/, metadata.json, sources.jsonl
- **Hybrid:** No (no PLAN.md)
- **Schema variant:** pre-2026-03-31-verbose
- **Notes:** metadata.json reveals 22 agents, 4 search rounds, self-audit passed 5/6.
  Cross-model Gemini CLI was unavailable during this session (skipped with note).

### 4. hook-if-conditions

- **Status:** archived (confirmed)
- **Actual path:** `.research/archive/hook-if-conditions/` (index path matches)
- **Session type:** deep-research
- **Depth:** L1
- **Claims/Sources:** 45 / 35
- **Portability:** sanitize-then-portable (if-condition pattern analysis is generic; hook names are SoNash-specific)
- **Files:** RESEARCH_OUTPUT.md, challenges/, claims.jsonl, findings/, metadata.json, sources.jsonl
- **Hybrid:** No (no PLAN.md)
- **Schema variant:** pre-2026-03-31-verbose
- **Sanitize fields:** Hook names referencing SoNash-specific hooks (gsd-context-monitor, ensure-fnm)
- **Notes:** METHODOLOGY-REUSABLE. The if-condition performance analysis patterns (spawn-reduction
  heuristics, condition ordering, event-type filtering) apply to any Claude Code project.

### 5. dev-dashboard

- **Status:** complete (confirmed in active tree)
- **Actual path:** `.research/dev-dashboard/` (index path matches)
- **Session type:** deep-research
- **Depth:** L3 (metadata.json) — INDEX DEPTH MISMATCH (index says L1)
- **Claims/Sources:** 100 / 90 (metadata.json confirms — match)
- **Portability:** not-portable (SoNash-specific dashboard tabs, product code, data schemas)
- **Files:** DECISIONS_PRE_RESEARCH.md, RESEARCH_OUTPUT.md, RESEARCH_PLAN.md, challenges/, claims.jsonl, findings/, metadata.json, sources.jsonl
- **Hybrid:** No. RESEARCH_PLAN.md is a research orchestration document (not an implementation
  PLAN.md). DECISIONS_PRE_RESEARCH.md captures pre-research user decisions. Neither triggers `hybrid`.
- **Schema variant:** pre-2026-03-31-verbose
- **Notes:** Richest session in the index. 36 agents across 5 waves. metadata.json records
  `pre_work_required` (infrastructure bugs that must be fixed before dashboard code) and
  `broken_data_sources` (velocity-log, commit-log, reviews-archive, SonarCloud all have data
  quality issues). `session: 245` links it to SoNash session tracking. INDEX DEPTH ERROR:
  index says L1, metadata says L3 — metadata is authoritative.

### 6. custom-agents

- **Status:** archived (filesystem) / complete (index) — INDEX STATUS DRIFT
- **Actual path:** `.research/archive/custom-agents/` — INDEX PATH WRONG (index says `.research/custom-agents/`)
- **Session type:** deep-research
- **Depth:** L1
- **Claims/Sources:** 102 / 46
- **Portability:** sanitize-then-portable (multi-agent pipeline patterns, adversarial review, model-selection heuristics are portable; SoNash-specific agent names and context-injection are not)
- **Files:** RESEARCH_OUTPUT.md, challenges/, claims.jsonl, findings/, metadata.json, sources.jsonl
- **Hybrid:** No (no PLAN.md)
- **Schema variant:** pre-2026-03-31-verbose
- **Sanitize fields:** SoNash-specific agent names, SoNash context references in skills-injection findings
- **Notes:** METHODOLOGY-REUSABLE. Second highest claim count (102). Adversarial agent
  patterns, quality-validation pipelines, team-sizing heuristics are directly applicable to JASON-OS.

### 7. github-health

- **Status:** archived (filesystem) / complete (index) — INDEX STATUS DRIFT
- **Actual path:** `.research/archive/github-health/` — INDEX PATH WRONG (index says `.research/github-health/`)
- **Session type:** deep-research
- **Depth:** L1
- **Claims/Sources:** 39 / 27 (metadata.json) — INDEX CLAIM/SOURCE MISMATCH (index says 100/103)
- **Portability:** sanitize-then-portable (GitHub API categories, skill-design methodology portable; SoNash-specific operational findings — PAT leaks, Release Please failures — are not)
- **Files:** RESEARCH_OUTPUT.md, RESEARCH_PLAN.md, claims.jsonl, findings/, metadata.json, sources.jsonl
- **Hybrid:** No. RESEARCH_PLAN.md is research orchestration (not PLAN.md).
- **Schema variant:** pre-2026-03-31-verbose
- **Sanitize fields:** SoNash-specific repo findings (PAT leaks, Release Please state), TDMS references
- **Notes:** METHODOLOGY-REUSABLE. GitHub API category taxonomy (security/actions/config/deploy/deps/release/metadata)
  and skill-design patterns are portable. Index shows p0Issues=3, p1Issues=5 — these are SoNash-specific
  operational items, not methodology. INDEX COUNTS UNRELIABLE: metadata.json shows 39 claims/27 sources
  vs index's 100/103 — a 2.5x discrepancy. metadata.json is authoritative.

### 8. claude-code-permissions

- **Status:** archived (confirmed)
- **Actual path:** `.research/archive/claude-code-permissions/` (index path matches)
- **Session type:** deep-research
- **Depth:** L1
- **Claims/Sources:** 9 / 9 (index only — no metadata.json present)
- **Portability:** portable (Claude Code infrastructure, not project-specific)
- **Files:** findings/ only (contains claude-code-permission-system-FINDINGS.md)
- **Hybrid:** No (no PLAN.md)
- **Schema variant:** pre-2026-03-31-verbose
- **Notes:** SPARSE SESSION. Only a findings/ subdirectory exists — no RESEARCH_OUTPUT.md,
  no metadata.json, no claims.jsonl, no sources.jsonl. This is a minimal/quick-reference session.
  9 claims all HIGH confidence. Fully portable — Claude Code permissions are universal.

### 9. repo-analysis-skill

- **Status:** archived (filesystem) / complete (index) — INDEX STATUS DRIFT
- **Actual path:** `.research/archive/repo-analysis-skill/` — INDEX PATH WRONG (index says `.research/repo-analysis-skill/`)
- **Session type:** deep-research
- **Depth:** L4 (metadata.json authoritative) — INDEX DEPTH WRONG (index says L1)
- **Claims/Sources:** 50 / 147 (metadata.json) — index says 50/147, match on claims; source count matches
- **Portability:** sanitize-then-portable (Quick Scan default, 4-tier pipeline, absence pattern classifier, categorical scoring bands are portable; SoNash codebase-as-reference-rubric and TDMS schema references are not)
- **Files:** RESEARCH_OUTPUT.md, SYNTHESIS_EXTERNAL.md, SYNTHESIS_INTERNAL.md, challenges/, claims.jsonl, findings/, metadata.json, sources.jsonl
- **Hybrid:** No (no PLAN.md)
- **Schema variant:** post-2026-03-31-short
- **Notes:** METHODOLOGY-REUSABLE. Full L4 pipeline with 29 agents, 6 search rounds, 26 findings
  files, 6 contradictions found and resolved. Most methodologically mature session in the index.
  Has SYNTHESIS_EXTERNAL.md + SYNTHESIS_INTERNAL.md (split synthesis pattern). metadata.json
  has rich consumerHints, selfAuditResult, and contradictionsResolved sections. INDEX DEPTH ERROR:
  index says L1, metadata says L4.

### 10. analysis-synthesis-comparison

- **Status:** archived (filesystem) / complete (index) — INDEX STATUS DRIFT
- **Actual path:** `.research/archive/analysis-synthesis-comparison/` — INDEX PATH WRONG (index says `.research/analysis-synthesis-comparison/`)
- **Session type:** deep-research
- **Depth:** L1
- **Claims/Sources:** 60 / 15 (metadata.json authoritative)
- **Portability:** sanitize-then-portable (cross-skill convergence patterns, unified design conventions, contradiction cataloging methodology portable; SoNash-specific schema drift details are not)
- **Files:** RESEARCH_OUTPUT.md, challenges/, claims.jsonl, findings/, metadata.json, sources.jsonl
- **Hybrid:** No (no PLAN.md)
- **Schema variant:** pre-2026-03-31-verbose
- **Sanitize fields:** SoNash skill version numbers, SoNash-specific TDMS references
- **Notes:** INDEX NON-STANDARD CONFIDENCE DISTRIBUTION: uses REFUTED:3, UNVERIFIABLE:5, CONFLICTED:6
  alongside HIGH:46/MEDIUM:6 — novel distribution fields not in standard schema. This is the only
  session in the index with these extra confidence categories. metadata.json confidenceDistribution
  shows HIGH:117 — counting all findings files raw without dedup (60 is the synthesized claim count).
  Cross-skill architectural analysis methodology is portable.

### 11. file-registry-portability-graph

- **Status:** complete (confirmed, not archived)
- **Actual path:** `.research/file-registry-portability-graph/` (index path matches)
- **Session type:** deep-research
- **Depth:** L1 (exhaustive)
- **Claims/Sources:** 120 / 106
- **Portability:** portable (topic is cross-project infrastructure — scope enum, portability classification, JSONL registry pattern are universal)
- **Files:** RESEARCH_OUTPUT.md, challenges/, claims.jsonl, findings/, metadata.json, sources.jsonl
- **Hybrid:** No (no PLAN.md)
- **Schema variant:** post-2026-03-31-short
- **Notes:** DIRECT ANCESTOR of sync-mechanism work. Binding conclusion (v1.1 post-challenge):
  Option D — minimum-viable JSONL + PostToolUse hook + scope-tags. Contrarian + cross-model Gemini
  flipped Option B (@optave/codegraph) to Option D. Critical finding: @optave/codegraph likely does
  NOT index .md/.yaml as first-class nodes — wrong tool for JASON-OS skill/agent files. D7 scope enum
  (universal/user/project/machine/ephemeral) was independently validated by 5 external systems. 8
  searchers + 1 synthesizer + 2 verifiers + 2 challengers. Memory file count correction: 80+ (not 44).
  KuzuDB abandoned Oct 2025 — do not use CodeGraphContext on Windows.

---

## Hybrid Sessions Identified

None. Zero sessions have PLAN.md present. All 11 are pure `deep-research` type.

Two sessions have RESEARCH_PLAN.md (dev-dashboard, github-health) — these are
research orchestration documents that record the research question scope and
settled pre-research decisions. They do NOT constitute `hybrid` under SCHEMA_SPEC
3G (which requires both RESEARCH_OUTPUT.md AND PLAN.md — the latter being an
implementation plan, not a research plan).

---

## Portable Methodology Sessions

Sessions flagged `sanitize-then-portable` or `portable` — recommended for JASON-OS import:

| Session | Portability | Key Portable Methodology |
|---------|-------------|--------------------------|
| hook-if-conditions | sanitize-then-portable | if-condition performance patterns, spawn-reduction heuristics, event-type filtering |
| custom-agents | sanitize-then-portable | Multi-agent pipeline design, adversarial review patterns, model-selection heuristics, team-sizing |
| github-health | sanitize-then-portable | GitHub API category taxonomy, skill-design methodology |
| claude-code-permissions | portable | Claude Code permission system reference (universal) |
| repo-analysis-skill | sanitize-then-portable | Quick Scan default pattern, 4-tier pipeline, absence pattern classifier, categorical scoring bands, L4 research methodology |
| analysis-synthesis-comparison | sanitize-then-portable | Cross-skill convergence patterns, contradiction cataloging methodology |
| file-registry-portability-graph | portable | Scope enum (universal/user/project/machine/ephemeral), JSONL registry pattern, Option D architecture, portability classification heuristics |

**Portable count: 7 of 11 sessions have methodology reusable in JASON-OS.**

The 4 not-portable sessions (cli-tools, custom-statusline, plan-orchestration, dev-dashboard)
contain research tightly coupled to SoNash's specific product stack, timeline, or data schemas.

---

## Index Integrity Findings

### Path Drift (5 sessions)

The index `outputPath`/`path` fields do not match actual filesystem locations for 5 sessions.
All were moved to archive after the index was written, but the index was not updated:

| Session | Index Path | Actual Path |
|---------|-----------|-------------|
| plan-orchestration | `.research/plan-orchestration/` | `.research/archive/plan-orchestration/` |
| custom-agents | `.research/custom-agents/` | `.research/archive/custom-agents/` |
| github-health | `.research/github-health/` | `.research/archive/github-health/` |
| repo-analysis-skill | `.research/repo-analysis-skill/` | `.research/archive/repo-analysis-skill/` |
| analysis-synthesis-comparison | `.research/analysis-synthesis-comparison/` | `.research/archive/analysis-synthesis-comparison/` |

### Status Drift (4 sessions)

Index status says `complete` but filesystem location is `archive/`:

| Session | Index Status | Correct Status |
|---------|-------------|----------------|
| plan-orchestration | complete | archived |
| custom-agents | complete | archived |
| github-health | complete | archived |
| repo-analysis-skill | complete | archived |

Note: `analysis-synthesis-comparison` index correctly says `complete` for the session data
but the filesystem moved it to archive — so status is technically accurate but path is wrong.

### Depth Drift (2 sessions)

| Session | Index Depth | metadata.json Depth |
|---------|------------|---------------------|
| dev-dashboard | L1 | L3 |
| repo-analysis-skill | L1 | L4 |

metadata.json is authoritative in both cases.

### Claim/Source Count Drift (1 session)

| Session | Index Claims/Sources | metadata.json Claims/Sources |
|---------|--------------------|-----------------------------|
| github-health | 100 / 103 | 39 / 27 |

The index values (100/103) appear to be erroneous — possibly copy-paste from dev-dashboard
(which is also 100 claims, completed the same day). metadata.json values (39/27) are authoritative.

### Non-Standard Index Values

- `file-registry-portability-graph`: `status: "complete-post-challenge-v1.1"` — non-standard enum
- `analysis-synthesis-comparison`: confidence distribution includes `REFUTED`, `UNVERIFIABLE`,
  `CONFLICTED` fields alongside standard HIGH/MEDIUM — not in base schema

### Sparse Session

`claude-code-permissions` contains only a `findings/` subdirectory with a single FINDINGS.md file.
No RESEARCH_OUTPUT.md, no metadata.json, no claims.jsonl, no sources.jsonl. This is the only
session with this incomplete structure.

---

## Learnings for Methodology

1. **Index is not a reliable source of truth for paths or status.** 5 of 11 sessions have path
   drift, 4 have status drift, 2 have depth errors, 1 has a 2.5x claim count error. The index
   was written at session-start and not updated when sessions were archived. LESSON: Always verify
   index claims against filesystem. For JASON-OS, the sync-mechanism should treat filesystem as
   canonical and index as a hint only.

2. **metadata.json is more reliable than index.** Where both exist, metadata.json consistently
   has more accurate and richer data. 8 of 11 sessions have metadata.json. LESSON: metadata.json
   should be the primary data source for research session inventory.

3. **Two schema variants require branching logic.** Agents consuming research-index.jsonl must
   handle both `topicSlug`/`claimCount`/`outputPath` (verbose) and `slug`/`claims`/`path` (short).
   LESSON: Document schema transition date (2026-03-31) and use it as a branch point.

4. **RESEARCH_PLAN.md != PLAN.md for hybrid detection.** Two sessions have RESEARCH_PLAN.md but
   are not hybrid. The hybrid marker is specifically PLAN.md (implementation plan), not research
   orchestration plans. LESSON: Hybrid detection must check for PLAN.md specifically, not any
   *PLAN*.md pattern.

5. **DECISIONS_PRE_RESEARCH.md is a novel artifact type.** dev-dashboard has a pre-research
   settled-decisions document. This is not in SCHEMA_SPEC as a recognized type. Could be captured
   in `notes` or as a new `has_pre_research_decisions` boolean. Flag for D22.

6. **Sparse sessions exist.** claude-code-permissions has only a findings/ subdir — no synthesis,
   no metadata. This may represent a quick-reference research pattern distinct from full sessions.
   LESSON: Session inventory must handle missing RESEARCH_OUTPUT.md gracefully.

7. **Non-standard confidence distribution fields.** analysis-synthesis-comparison uses REFUTED,
   UNVERIFIABLE, CONFLICTED in its index entry. These richer categories may be worth standardizing
   in JASON-OS's research schema rather than forcing them into HIGH/MEDIUM/LOW/UNVERIFIED.

8. **file-registry-portability-graph is the anchor session for sync-mechanism.** Its Option D
   recommendation (JSONL + PostToolUse hook + scope-tags) and D7 scope enum
   (universal/user/project/machine/ephemeral) are the direct foundation for the current
   sync-mechanism design. Any sync-mechanism agent should treat this as primary input.

9. **Contrarian + cross-model verification can flip recommendations.** file-registry went from
   Option B to Option D after challenger pass. This validates the multi-phase deep-research
   methodology (Phases 3-5 as mandatory). The flip happened because contrarian identified
   @optave/codegraph likely does not index .md/.yaml — a fundamental requirement mismatch missed
   by 8 searchers + synthesizer.

10. **Agent scope sizing: 11 sessions in one D-agent is at the upper boundary.** This scan was
    feasible because the index provided a summary shortcut and most sessions only needed ls + metadata.json.
    The MEDIUM-depth read on file-registry-portability-graph (required by spec) added significant
    context but was manageable. If sessions had required deep reads, 11 would be too many per agent.

---

## Gaps and Missing References

1. **No access to RESEARCH_OUTPUT.md content for sessions 1-10** (only file-registry was
   deep-read per spec). The index+metadata.json summary is sufficient for inventory purposes
   but claim content is not captured. D14b/D14c may cover the non-indexed sessions.

2. **claude-code-permissions findings file not read.** The single FINDINGS.md in findings/ was
   not read — only its existence confirmed. Content not captured.

3. **Sessions outside the 11-session index.** The `.research/archive/` directory contains
   sessions NOT in research-index.jsonl: codex-claude-code-plugin, learning-analysis,
   learning-system-effectiveness, repo-analysis-knowledge, repo-analysis-value-extraction,
   repo-cleanup, t39-hook-ecosystem, unified-content-intelligence, worktree-management.
   These are outside D14a scope (index-tracked only) but should be covered by D14b/D14c.

4. **Non-archive active sessions not in the index.** `.research/` active tree also contains:
   analysis/, content-analysis-system/, debt-runner-expansion/, jason-os/, multi-layer-memory/,
   repo-analysis/, research-discovery-standard/, research-discovery-standard-v2/,
   t28-intelligence-graph-data-layer/, website-analysis/. These are outside D14a scope.

---

## Confidence Assessment

- HIGH claims: 8 (index schema variant identification, path drift findings, depth drift findings,
  metadata.json > index reliability, hybrid detection, sparse session, file-registry as anchor)
- MEDIUM claims: 3 (portability classifications, methodology reuse assessments)
- LOW claims: 0
- UNVERIFIED claims: 0
- Overall confidence: HIGH

All findings are based on direct filesystem reads (ls, cat metadata.json, head RESEARCH_OUTPUT.md)
with no inference from training data.
