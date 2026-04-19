# D7 — Research Artifacts Inventory

**Agent:** D7
**Date:** 2026-04-18
**Scope:** `.research/` top-level sessions in JASON-OS repo
**Profile:** codebase (Read/Glob/Bash — no grep for analysis)

---

## Session Summary Table

| Session | Status | Depth | Purpose | Output Doc | Files | Size |
|---|---|---|---|---|---|---|
| `file-registry-portability-graph` | complete (v1.1 post-challenge) | L1 | Evaluated 60+ tools for self-updating file registry with portability graph; concluded no single tool satisfies all criteria; recommended Option D (JSONL + PostToolUse hook + scope-tags) | RESEARCH_OUTPUT.md | 16 | 360 KB |
| `jason-os` | complete | L0 (brainstorm) | Brainstormed JASON-OS distribution models (A–F); chose B→F template-to-platform; named sync as #1 risk | BRAINSTORM.md | 1 | 10 KB |
| `jason-os-mvp` | complete (v1.2 post-gap-pursuit) | L1 | Identified minimum viable SoNash→JASON-OS delta; produced layered porting plan; corrected 5 critical errors via Phase 3.97 gap pursuit | RESEARCH_OUTPUT.md + PHASE_3_95_PLAN.md | 33 | 658 KB |
| `sync-mechanism` | active (Piece 1 in progress) | L0 brainstorm + L1 in progress | Converged on 5-piece library-catalog architecture for bidirectional sync; Piece 1 discovery scan executing now | BRAINSTORM.md | 18 (growing) | 227 KB |

**Total file count across all sessions:** 68 (including in-progress D7 output)
**Confirmed top-level entries:** 4

---

## Session Profiles

### `file-registry-portability-graph` (R-frpg)

- **Date:** 2026-04-17
- **Agent count:** 14 (8 D-agents + 1 synthesizer + 2 verifiers + 1 contrarian + 1 OTB + Gemini cross-model)
- **Claims:** 116 | **Sources:** 106
- **Confidence:** HIGH 65 / MEDIUM 45 / LOW 6 / UNVERIFIED 0
- **Recommendation:** Option D — minimum-viable JSONL + PostToolUse hook + scope-tags (overturned initial Option B recommendation after contrarian + OTB + Gemini challenge)
- **Key finding:** Scope enum (universal / user / project / machine / ephemeral) is novel and immediately actionable; no existing tool provides this
- **Schema note:** predates canonical deep-research JSONL schema (`schemaVersion: sonash-pre-canonical-v0`); 222 JSONL records require field-mapping when a consumer exists
- **Dependency role:** Foundation for sync-mechanism Piece 2 schema design — scope enum and Option D are binding inputs

### `jason-os` (Early Brainstorm)

- **Date:** 2026-04-01 (revisited 2026-04-03)
- **Structure:** Single file only — no findings/, no claims.jsonl, no sources.jsonl
- **Session type:** Pure brainstorm; no formal agent dispatch
- **Key output:** Direction B→F chosen; sync named as #1 risk; 7 open questions routed to future research/planning
- **Dependency role:** Seeds the conceptual framing that jason-os-mvp and sync-mechanism built on

### `jason-os-mvp`

- **Date:** 2026-04-15
- **Agent count:** 26 (12 D + 4 V + 1 contrarian + 1 OTB + 6 G-gap + 2 GV-gap)
- **Claims:** 67 (20 added via gap pursuit) | **Sources:** 63
- **Confidence:** HIGH 63 / MEDIUM 4 / LOW 0 / UNVERIFIED 0
- **Synthesis version:** 1.2 (post-gap-pursuit Phase 3.97)
- **Critical corrections from gap pursuit:** git-utils.js absent (not present as G4 claimed), post-write-validator has 13 validators not 10, loop-detector wires to PostToolUseFailure not PostToolUse, /todo port estimate 1.5h not 3-4h, AgentSkills claim resolved to HIGH confidence
- **Unresolved strategic question:** SQ-1 — extract-from-SoNash vs design-from-scratch (deferred to deep-plan)
- **Schema note:** same sonash-pre-canonical-v0 schema as R-frpg; metadata.json adds consumerHints and debtCandidates arrays (schema extensions worth canonicalizing)
- **Notable:** Session crossed into planning territory — PHASE_3_95_PLAN.md lives alongside RESEARCH_OUTPUT.md

### `sync-mechanism` (Active)

- **Date:** 2026-04-18 (active)
- **Status:** BRAINSTORM.md converged; Piece 1 discovery scan in progress
- **Architecture committed:** 5-piece system (discovery scan → schema design → labeling mechanism → manifest + event logs → sync engine)
- **Key decision:** symmetric, self-propagating — code + manifest live in both repos; event logs local per repo
- **Session model:** JASON-OS first (current session), SoNash second (separate Claude Code instance)
- **R-frpg dependency:** BRAINSTORM.md explicitly cites R-frpg scope enum and Option D as inputs to Piece 2

---

## Learnings for Methodology

### Agent sizing

4 sessions handled at summary-level by one agent. Right-sized: each session required reading 1-2 files (RESEARCH_OUTPUT.md or BRAINSTORM.md + metadata.json). Summary-level was achievable because the main output docs were well-written and self-contained. The `jason-os` session was trivial (single file). The `jason-os-mvp` session was the heaviest — RESEARCH_OUTPUT.md at 79 KB required selective reading (first 100 lines captured the executive summary; metadata.json provided the structured stats). One agent for 4 sessions is appropriate when sessions are summary-level. For SoNash's 20 sessions, D7-equivalent work would benefit from 2-3 agents splitting the load (7-10 sessions each).

### File-type observations

Sessions with formal deep-research runs share a consistent structure: RESEARCH_OUTPUT.md, claims.jsonl, sources.jsonl, metadata.json, findings/, challenges/. The `jason-os` brainstorm session is the outlier — no JSONL, no subdirectories, just BRAINSTORM.md. The `jason-os-mvp` session adds PHASE_3_95_PLAN.md (planning crossed into research session). The `sync-mechanism` active session has only BRAINSTORM.md at top-level (research files are in piece-1a-discovery-scan-jason-os/). Structure is consistent for formal sessions; brainstorm-only sessions are minimal.

### Classification heuristics

Research artifacts fit `project` scope cleanly — they are specific to JASON-OS's questions and cannot be directly reused. `portability_hint: sanitize-then-portable` is accurate in theory (insights and methodologies port, specific findings don't), but in practice these are "project-specific for JASON-OS"; calling them sanitize-then-portable overstates portability. A more accurate field value might be `insights-portable` or `methodology-portable` — the findings themselves are project-locked but the research methodology (agent counts, schema approach, gap pursuit protocol) is portable.

### Dependency extraction

The R-frpg → sync-mechanism dependency was identified by two signals: (1) BRAINSTORM.md Section 3.2 explicitly references the scope enum produced by R-frpg D7 agent as an input, and (2) RESEARCH_OUTPUT.md Section 10 names "Option D" as the binding recommendation, which the sync-mechanism BRAINSTORM.md adopts as its starting point. The jason-os → jason-os-mvp dependency was identified because jason-os BRAINSTORM.md's 7 open questions map directly to jason-os-mvp's reframed research question. Dependency extraction from brainstorm documents is reliable when open questions route explicitly to subsequent work. Without that routing, dependencies would require content matching across sessions.

### Schema-field candidates

Research sessions have unique attributes not well-served by the generic file schema. Candidates for dedicated fields in a research-session schema:

- `status` (complete / active / archived) — already in D7 output; essential for filtering
- `depth` (L0-brainstorm / L1 / L2 / L3 / L4) — differentiates brainstorm from formal research
- `session_type` (brainstorm / deep-research / deep-plan / hybrid) — `jason-os-mvp` is hybrid research+planning
- `finding_count` — integer; useful for gauging session weight without reading findings/
- `output_doc` — primary human-readable file; needed for summary-level reads
- `agent_count` + `claim_count` + `source_count` — metadata.json provides these for formal sessions; absent for brainstorm-only sessions
- `schema_version` — `sonash-pre-canonical-v0` is present in both complete sessions; important for JSONL consumer compatibility
- `consumer_hints` — jason-os-mvp metadata.json's consumerHints object (hasStackClaims, hasPitfallClaims, etc.) is a high-value pattern worth standardizing
- `debt_candidates` — jason-os-mvp's debtCandidates array surfaced 10 action items; a standard field here would make debt routing automatic

### Adjustments recommended for SoNash research scan

SoNash has 20 research sessions with 6858 files. Recommendations:

1. **Use SoNash's research-index.jsonl as primary input** — if it exists and is current, read it first and only drop to individual session reads for sessions missing from the index or flagged as stale.
2. **Split across 2-3 agents** — 7-10 sessions per agent is the right load at summary-level (4 sessions/agent as done here was comfortable but could handle 2x).
3. **Prioritize sessions by recency and relevance** — for sync-mechanism Piece 2, the most relevant SoNash sessions are any that touch portability classification, file-registry patterns, or sync tooling. Read those first; deprioritize app-specific research sessions.
4. **Flag schema version mismatches early** — both complete JASON-OS sessions use `sonash-pre-canonical-v0`. SoNash likely has the same. Any consumer (Piece 2 schema design) needs to map old field names before trusting structured data.
5. **Brainstorm-only sessions are trivial** — a single Read call handles them. Don't allocate agent slots for brainstorm-only sessions when the file is < 15 KB.
6. **Look for PHASE_*.md files** — `jason-os-mvp`'s PHASE_3_95_PLAN.md indicates session crossed into planning. SoNash sessions may have similar hybrid artifacts worth flagging separately.
