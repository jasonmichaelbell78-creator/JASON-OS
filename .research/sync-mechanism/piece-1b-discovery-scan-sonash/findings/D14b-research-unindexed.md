# D14b Findings: .research/ Un-Indexed Sessions + Top-Level Artifact Taxonomy

**Agent:** D14b
**Profile:** codebase
**Date:** 2026-04-18
**Scope:** SoNash .research/ — un-indexed current sessions + top-level non-session files
**Schema:** SCHEMA_SPEC.md v1.0 (Section 3G for research-session)

---

## Summary

- **Total current dirs in .research/:** 13 (excluding archive/)
- **Indexed in research-index.jsonl:** 2 current (dev-dashboard, file-registry-portability-graph); 9 archived
- **Un-indexed current sessions:** 9
- **Top-level non-directory artifacts:** 7 files
- **Special corpus dir (not a session):** analysis/ (T29 repo-analysis output)

---

## Un-Indexed Session List

### Why is the index stale?

The research-index.jsonl appears to have been built retroactively and then
abandoned. It was last written on 2026-04-17 (file-registry-portability-graph),
but 9 current sessions predate it without entries. Root causes by session:

| Session | Last Date | Why Un-Indexed |
|---------|-----------|----------------|
| debt-runner-expansion | 2026-03-27 | Predates index; index schema may not have existed yet |
| multi-layer-memory | 2026-03-31 | Predates index; index may have been created after archiving phase |
| research-discovery-standard | 2026-03-24 | Predates index |
| research-discovery-standard-v2 | 2026-04-04 | Schema in flux; two schema variants exist in index |
| website-analysis | 2026-04-05 | Incomplete session (selfAuditResult=null, Phases 4-5 pending) |
| t28-intelligence-graph-data-layer | 2026-04-07 | readyForDeepPlan=false; may have been intentionally withheld |
| jason-os | 2026-04-01 | Brainstorm-only; no metadata.json; may not fit index schema |
| content-analysis-system | 2026-04-08 | Brainstorm-only stub; no research phase |
| repo-analysis | 2026-04-05 (workflow) | Not a standard research session; pre-brainstorm corpus |

**Pattern:** The index was designed for `deep-research` sessions with structured
metadata.json. Sessions without metadata.json (jason-os, content-analysis-system),
incomplete sessions (website-analysis), and non-standard hybrids (repo-analysis
working dir) were never added.

---

## Session-by-Session Inventory

### 1. debt-runner-expansion

| Field | Value |
|-------|-------|
| Path | .research/debt-runner-expansion/ |
| Type | research-session |
| Session type | deep-research |
| Depth | L3 |
| Status | complete |
| Claim count | 44 |
| Source count | 53 |
| Date completed | 2026-03-27 |
| Portability | not-portable |

**What it is:** L3 codebase-analysis + architecture research on expanding
SoNash's Technical Debt Management System (TDMS) with a CLI write-side and
Next.js web dashboard read-side. Produced the hybrid-fetch architecture decision
(dev API route + static JSON fallback).

**Structure:** Full research session with findings-v1/ + findings/ (two rounds),
challenges-v1/ + challenges/ (4 challenge rounds), claims.jsonl, sources.jsonl,
metadata.json, RESEARCH_OUTPUT.md, DECISIONS_PRE_PLAN.md, SYNERGIES.md. 25
agents, 6 bugs confirmed, 15 factual corrections applied.

**Why un-indexed:** Predates the index. TDMS is SoNash-specific product code.
Not portable.

---

### 2. multi-layer-memory

| Field | Value |
|-------|-------|
| Path | .research/multi-layer-memory/ |
| Type | research-session |
| Session type | deep-research |
| Depth | L1 |
| Status | complete (challenge-and-gap-complete) |
| Claim count | 128 |
| Source count | 38 |
| Date completed | 2026-03-31 |
| Portability | sanitize-then-portable |

**What it is:** L1 research on the multi-layer memory architecture for Claude
Code (user memory, auto-memory, canonical-memory, state schema, episodic memory).
High claim count (128) with strong confidence (101 HIGH). 

**Notable structure:** Uses multi-file claims pattern: claims-analysis.jsonl,
claims-landscape.jsonl, claims-recommendations.jsonl, claims.jsonl. 40 agents
deployed (4 failed + respawned). Has RESEARCH_OUTPUT.md only (no BRAINSTORM.md).

**Portability value:** High. Memory architecture findings apply universally to
any Claude Code project. Debt candidates: canonical-memory divergence, STATE_SCHEMA.md
8x stale, episodic-memory blocked, governance-changes.jsonl missing.

**Why un-indexed:** Predates index; multi-claims-file schema may have made
indexing awkward.

---

### 3. research-discovery-standard

| Field | Value |
|-------|-------|
| Path | .research/research-discovery-standard/ |
| Type | research-session |
| Session type | hybrid (BRAINSTORM.md + RESEARCH_OUTPUT.md) |
| Depth | L1 |
| Status | complete |
| Claim count | not in metadata (listed as output_lines=533) |
| Source count | 100+ external |
| Date completed | 2026-03-24 |
| Portability | portable |

**What it is:** The foundational research that defines the deep-research
methodology itself. 10 sub-questions, 5 waves, 18 agents, 14 findings files,
4 challenge files. Consumer hint = deep-plan.

**Unusual aspect:** Has BRAINSTORM.md inside the research session dir — this is
itself the genesis of the research methodology. Also has AUDIT.md.

**Portability:** Fully portable — the standard is project-agnostic by design.
This IS JASON-OS's deep-research skill specification source.

**Why un-indexed:** Predates index (earliest dated session, 2026-03-24).

---

### 4. research-discovery-standard-v2

| Field | Value |
|-------|-------|
| Path | .research/research-discovery-standard-v2/ |
| Type | research-session |
| Session type | deep-research |
| Depth | L1 |
| Status | complete (synthesis_complete) |
| Claim count | 77 |
| Source count | 63 |
| Date completed | 2026-04-04 |
| Portability | portable |

**What it is:** Supplemental gap-filling research on the research-discovery-standard.
8 sub-questions covering: state machine design, auto-advance, findings-refs,
todo UX, schema versioning, dashboard design, scouting governance, CL integration.

**Notable:** Has RESUME.md (compaction-resilient session state). Explicit
cross-reference to .research/research-discovery-standard/ and
.planning/research-discovery-standard/DECISIONS.md. 52 deep-plan candidates,
35 memory candidates.

**Cross-session reference:** relates_to.brainstorm = research-discovery-standard/
BRAINSTORM.md — explicit inter-session dependency link.

**Why un-indexed:** Schema drift period (index shows two variants). RESUME.md
suggests this session survived a compaction, possibly obscuring its completion.

---

### 5. website-analysis

| Field | Value |
|-------|-------|
| Path | .research/website-analysis/ |
| Type | research-session |
| Session type | deep-research |
| Depth | L1 |
| Status | complete (but selfAuditResult=null) |
| Claim count | 175 |
| Source count | 26 |
| Date completed | 2026-04-05 |
| Portability | sanitize-then-portable |

**What it is:** Deep-research on Website Analysis Skill design. Largest claim
count of all un-indexed sessions (175). 22 sub-questions, 39 agents. Produced
a detailed skill design with Creator View, Expedition Mode, compliance gates,
rate limiting, and storage architecture.

**Notable:** selfAuditResult=null — Phases 4 (self-audit) and 5 (presentation
and routing) explicitly marked pending in consumerHints. The session is
functionally complete (research_output.md produced, challenges incorporated)
but formally incomplete.

**Portability:** sanitize-then-portable — creator context injection and
memory.md references are SoNash-specific, but the skill design framework is
portable.

**Why un-indexed:** selfAuditResult=null; Phases 4-5 pending. Index likely only
accepts fully-complete sessions.

---

### 6. t28-intelligence-graph-data-layer

| Field | Value |
|-------|-------|
| Path | .research/t28-intelligence-graph-data-layer/ |
| Type | research-session |
| Session type | deep-research |
| Depth | L1 |
| Status | complete (post-challenge, readyForDeepPlan=false) |
| Claim count | 73 |
| Source count | 55 |
| Date completed | 2026-04-07 |
| Portability | sanitize-then-portable |

**What it is:** Research on SQLite + FTS5 + better-sqlite3 as the T28 Intelligence
Graph data layer. 39 agents. Produced architecture recommendation and 5
disqualified alternatives with detailed reasons.

**Notable:** Has synthesis/ subdirectory (S1-S3 synthesis files) + challenges/.
Also has query-pattern-audit.md (partial OQ-17 completion). readyForDeepPlan=false
blocked by OQ-16 and OQ-17.

**Portable elements:** SQLite + better-sqlite3 selection rationale, M2M tag
benchmarks, @huggingface/transformers v4 note, disqualification log for 8
alternatives — all portable to any knowledge graph design.

**Why un-indexed:** readyForDeepPlan=false; two open questions block deep-plan
routing. May have been intentionally excluded as "not yet final."

---

### 7. jason-os

| Field | Value |
|-------|-------|
| Path | .research/jason-os/ |
| Type | research-session |
| Session type | brainstorm |
| Depth | L0-brainstorm |
| Status | complete |
| Claim count | n/a |
| Source count | n/a |
| Date | 2026-04-01 (revisited 2026-04-03) |
| Portability | portable |

**What it is:** SoNash's formal brainstorm for creating JASON-OS. Single file:
BRAINSTORM.md. No metadata.json, no claims, no findings. Routes to deep-plan.

**Critical cross-reference:** This is the origin document for the project we
are currently scanning. Key statements:

- Chose Direction B→F (Template → Platform) over 5 other directions
- Identified ~47 portable skills, ~16 generic agents, ~5 portable hooks as
  extraction candidates
- Open Question 1 = "What innovative sync mechanisms can minimize manual
  overhead?" — this IS the sync-mechanism research we are executing now
- Decision 33 added Domain 02a (External Adoption Scouting) as ongoing domain
- Operator clarification: "won't all port over and many will most likely be
  simplified" — sets expectation that extraction is curated, not wholesale
- Anti-goal: "no SoNash-specific references" = sanitize_fields requirement is
  explicit from day one

**2026-04-03 Revisit:** Added Domain 02a (External Adoption Scouting) and
B+C Hybrid resolution (new domain + cross-cutting adoption protocol).

**Why un-indexed:** Brainstorm-only; no metadata.json; index schema requires
structured metadata. Also: indexing a brainstorm about the project that uses
the index would be self-referential.

---

### 8. content-analysis-system

| Field | Value |
|-------|-------|
| Path | .research/content-analysis-system/ |
| Type | research-session |
| Session type | brainstorm |
| Depth | L0-brainstorm |
| Status | stub |
| Claim count | n/a |
| Source count | n/a |
| Date | 2026-04-08 |
| Portability | sanitize-then-portable |

**What it is:** T29 Unified Content Intelligence System brainstorm. Proposes
two user-facing commands: `/analyze` (route + extract from anything) and
`/recall` (search extracted knowledge). Stub — brainstorm complete, research
not started.

**Dependencies declared in BRAINSTORM.md:** analysis-synthesis-comparison,
t28-intelligence-graph-data-layer, T27 media extraction, unstructured-io patterns,
source-slug-map.json.

**Anti-goal note:** "Don't let infrastructure eat the project (learned from T28
data layer detour)" — signals awareness of scope creep risk.

**Why un-indexed:** Brainstorm-only stub; no research phase. No metadata.json.

---

### 9. repo-analysis

| Field | Value |
|-------|-------|
| Path | .research/repo-analysis/ |
| Type | research-session (hybrid classification) |
| Session type | hybrid |
| Depth | L1 |
| Status | active |
| Claim count | n/a |
| Source count | n/a |
| Portability | not-portable |

**What it is:** NOT a standard research session. This is the active working
directory for T28 pre-brainstorm repo corpus building. Contains:

- `_T28-analysis-plan.md` — systematic queue of 28+ repos across 6 clusters
  for /repo-analysis and /website-analysis
- `_gap-agent-A.md`, `_gap-agent-B.md`, `_gap-agent-C.md`, `_gap-agent-EF.md`
  — per-cluster gap analysis reports from background agents
- `_workflow-phase-a.md` — Phase A gap fix coordination doc (compaction-resilient)

**Critical distinction:** This is NOT the same as `.research/archive/repo-analysis-skill/`
which IS indexed (the research that DESIGNED the repo-analysis skill). This dir
is the OUTPUT of using that skill to scan repos for T28.

**Portability:** not-portable — all content is SoNash T28-specific repo analysis.

**Why un-indexed:** Not a research session per index schema. Active workflow
artifact, not a completed deep-research output.

---

## Top-Level Artifact Taxonomy

| File | Type | Scope | Size | Purpose |
|------|------|-------|------|---------|
| research-index.jsonl | config | project | 5,363B / 11 lines | Master index of completed research sessions |
| EXTRACTIONS.md | doc | project | 92,353B / 674 lines | Auto-generated extraction candidates summary |
| extraction-journal.jsonl | todo-log | project | 199,307B / 379 lines | Append-only extraction journal (primary write-side) |
| knowledge.sqlite | config | machine | 409,600B | SQLite knowledge database (T28/T29 backend) |
| content-analysis.db | config | machine | 434,176B | SQLite content analysis database (CAS backend) |
| content-analysis.db-shm | config | machine | 32,768B | SQLite shared memory for content-analysis.db |
| content-analysis.db-wal | config | machine | 0B | WAL journal for content-analysis.db (active mode) |
| source-slug-map.json | config | project | 5,363B | 18 source-to-slug mappings for migration script |
| tag-vocabulary.json | config | project | 49,563B / 1141 lines | Controlled tag vocabulary (CONVENTIONS.md §14) |

**Schema note:** Both SQLite databases are machine-scoped runtime artifacts.
Per T28 debt candidate, they should be .gitignored but the gitignore status
was not verified in this scan.

**New type needed:** The JSONL output uses `type: config` for SQLite databases
which is awkward. A `type: database` enum value would be more expressive. Filed
as a schema gap (see Learnings section).

---

## jason-os Session Deep-Dive

This section specifically covers what SoNash says about JASON-OS in the
.research/jason-os/BRAINSTORM.md — the canonical origin document.

### What SoNash was when JASON-OS was conceived (2026-04-01):

- 67 skills, 37 agents, 21 hooks
- The app work had become secondary to the workflow OS
- No comparable "Claude Code OS" existed at this sophistication level

### What was identified as portable:

- ~47 generic skills (audits, planning, research, session management, design)
- ~16 generic agents (deep-research pipeline, architecture, quality)
- ~5 portable hooks (push protection, MCP check, large file gate)
- ~5 library scripts (security-helpers, sanitize-error, safe-fs, read-jsonl)
- Behavioral guardrails and coding standards from CLAUDE.md

### What was identified as NOT portable:

- ~20 skills (TDMS, SonarCloud, code-reviewer with Firebase patterns)
- ~19 agents (frontend-developer with React/Firebase, debugger with SoNash)
- ~16 hooks (Firestore rules guard, session-start with Firebase build)
- Stack-specific CLAUDE.md sections 1-3, 7-8
- `sonash-context` skill (loaded by 10+ agents)

### Direction chosen and why:

**B→F: Template → Platform.** Template gives immediate value; CLI (jason-os
sync, jason-os init) solves the sync problem medium-term. Plugin (Direction A)
was noted as having the best sync story but plugin constraints limit what can
be included.

**The decisive factor per the doc:** The direction matches the operator's
identity — a no-code vibe coder building an OS that proves no-code orchestration
works. The template ships fast; the platform grows from use.

### Sync mechanism as open question:

Open Question 1 = "What innovative sync mechanisms can minimize manual overhead
during the template phase?" — this is explicitly deferred to "deep-plan or
deep-research". The sync-mechanism branch (which this scan is part of) IS the
answer to OQ-1.

### Operator's key constraints on portability:

From the 2026-04-03 revisit clarifications:
- "Won't all port over and many will most likely be simplified" — curated
  extraction, not wholesale copy
- "I don't think in terms of shippable. I want to create. The rest comes in time."
- Windows agent bug: "not an issue here at home" — guardrails sufficient
- 16-domain scope: "massive is fine. the joy is in the work."

### 2026-04-03 Revisit additions:

- Domain 02a (External Adoption Scouting) added as ongoing Tier 1 domain
- Cross-cutting adoption protocol: every domain checks 02a before scoping
- Decisions 33, 34, 35 added
- repo-analysis skill established as primary tool for Domain 02a

---

## Cross-Reference Patterns

Identified cross-session references within the un-indexed sessions:

| From Session | References | Via |
|-------------|------------|-----|
| research-discovery-standard-v2 | research-discovery-standard | relates_to field in metadata.json |
| research-discovery-standard-v2 | research-discovery-standard/BRAINSTORM.md | relates_to.brainstorm field |
| content-analysis-system | analysis-synthesis-comparison | "Prior Research" in BRAINSTORM.md |
| content-analysis-system | t28-intelligence-graph-data-layer | "Prior Research" in BRAINSTORM.md |
| repo-analysis | t28-intelligence-graph-data-layer | _T28-analysis-plan.md references T28 goal |
| repo-analysis | website-analysis | workflow uses website-analysis skill outputs |
| website-analysis | multi-layer-memory | consumerHints.hasMemoryCandidates + MEMORY.md extraction |
| jason-os | (inception of sync-mechanism) | Open Question 1 = sync mechanism |

**Notably absent:** No cross-references FROM research-index.jsonl TO the
un-indexed sessions. The index has no mechanism to note "see also" un-indexed
sessions.

---

## Learnings for Methodology

1. **research-index.jsonl schema drift** — Two distinct schemas exist in the
   same file. Early records: `topicSlug`, `claimCount`, `sourceCount`. Later
   records: `slug`, `claims`, `sources`, `tags`. Any downstream consumer must
   handle both schemas. The D14-series should flag this for D22 (schema surveyor).

2. **Brainstorm sessions need a distinct classification** — The index
   only accommodates sessions with metadata.json. Brainstorm-only dirs
   (jason-os, content-analysis-system) have no metadata.json and no claims,
   making them impossible to index in the current schema. The JSONL schema's
   `session_type: brainstorm` enum handles this, but the research-index.jsonl
   doesn't have a `brainstorm` status row.

3. **New `type: database` needed** — SQLite files are not `config`. Recommend
   `type: database` as a new enum value. Flagging for D22.

4. **analysis/ is a corpus, not a session** — The analysis/ directory is the
   largest working artifact in .research/ (30+ sources, active audit failures)
   but defies `type: research-session`. A `type: corpus` or using `type: doc`
   with `scope: project` may be appropriate. Flagged for D22.

5. **Incomplete sessions not in index** — website-analysis has selfAuditResult=null
   and is not indexed. t28 has readyForDeepPlan=false and is not indexed. The
   index appears to require "deep-plan ready" status. This is a useful convention
   to document.

6. **Source-count inflation** — multi-layer-memory metadata claims 38 sources
   but notes "sourcesEstimated=300". Source counting methodology varies by session.

7. **RESUME.md as session resilience signal** — research-discovery-standard-v2
   has a RESUME.md. This pattern (compaction-resilient state) should be noted
   as a JASON-OS portability candidate — any long-running research session
   benefits from it.

---

## Gaps and Missing References

1. **research-index.jsonl not updated for 9 sessions** — The gap is documented
   but the fix (backfilling the index) is out of scope for this scan.

2. **repo-analysis classification ambiguous** — This dir blends /repo-analysis
   skill outputs with gap agent reports and workflow coordination docs. No clean
   type maps to it. Best-fit: `type: research-session` with `session_type: hybrid`.

3. **SQLite gitignore status unverified** — knowledge.sqlite and content-analysis.db
   may or may not be gitignored. D17a-b (root config scanner) should verify.

4. **archive/ not fully inventoried here** — 18 dirs in archive/, only 9 are in
   the index. 9 un-indexed archive dirs exist (codex-claude-code-plugin,
   learning-analysis, learning-system-effectiveness, repo-analysis-knowledge,
   repo-analysis-value-extraction, repo-cleanup, t39-hook-ecosystem,
   unified-content-intelligence, worktree-management). These were out of D14b
   scope but should be flagged for D14c or a follow-up agent.

5. **T28/T29 task numbering** — Internal task numbers (T28, T29) are
   SoNash-specific and not portable. Any sync of methodology documents must
   strip or remap these references.

6. **No `analysis-synthesis-comparison` in current dir** — This indexed session
   (`.research/archive/analysis-synthesis-comparison/`) is referenced by
   content-analysis-system BRAINSTORM.md but lives in archive/. Cross-archive
   reference pattern confirmed.

---

## Confidence Assessment

- HIGH claims: 12 (session inventories from metadata.json + BRAINSTORM.md reads)
- MEDIUM claims: 4 (portability assessments, why-un-indexed reasoning)
- LOW claims: 1 (gitignore status of SQLite databases — unverified)
- UNVERIFIED claims: 0
- Overall confidence: HIGH

All session inventories are grounded in direct filesystem reads of metadata.json
and primary documents. Portability classifications are interpretive but grounded
in SCHEMA_SPEC.md definitions and explicit content from the documents.
