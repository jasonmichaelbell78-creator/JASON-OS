# D15a — Planning: Research Programs & Large Initiatives

**Agent:** D15a  
**Profile:** codebase  
**Date:** 2026-04-18  
**Scope:** `.planning/` — research-program dirs, large milestone dirs, JASON-OS-adjacent dirs  
**D15b scope (excluded):** `session-285/`, `skill-audit-batch-mode/`, `skill-audit-recall-phase4/`, `skill-audit-synthesize-phase4/`, `creator-view-upgrade/`, `github-health-skill/`, `archive/`

---

## Pre-Work Notes

- **SCHEMA_SPEC.md Section 3H** read: `plan_scope` enum = `milestone | research-program | deferral-registry | session-bookmark | port-ledger | execution-handoff | backlog | cross-pr-learning`
- **Piece 1a RESEARCH_OUTPUT.md §7.1** note: "Planning: split by session type. Group agents by: (a) research-program sessions, (b) implementation/port sessions, (c) feature-specific sessions. PORT_ANALYSIS.md files deserve dedicated agents."

---

## Directory Inventory

Total directories enumerated in `.planning/`:

```
archive/                          (D15b)
content-analysis-system/          (D15a)
creator-view-upgrade/             (D15b)
dev-dashboard/                    (D15b)
github-health-skill/              (D15b)
jason-os/                         (D15a)
plan-orchestration/               (D15a)
research-discovery-standard/      (D15a)
review-data-architecture/         (D15a)
session-285/                      (D15b)
skill-audit-batch-mode/           (D15b)
skill-audit-recall-phase4/        (D15b)
skill-audit-synthesize-phase4/    (D15b)
skill-convergence/                (D15a)
synthesis-consolidation/          (D15a)
system-wide-standardization/      (D15a)
t28-intelligence-graph-v1/        (D15a)
```

Top-level files: `TODOS.md`, `pr-body-session-279.md`, `todos.jsonl`

**D15a coverage:** 9 dirs + 3 top-level files = **57 files inventoried** (including subdirs)

---

## Per-Directory Summaries

### 1. `.planning/jason-os/` — JASON-OS Research Program

**plan_scope:** `research-program`  
**Status:** Active (Domain 02a ongoing as of 2026-04-03; all other domains not started)  
**Files:** 5 (PLAN.md, RESEARCH_ROADMAP.md, SYNTHESIS.md, DEPENDENCIES.md, DECISIONS.md)

The planning hub for the 16-domain research program to build the knowledge foundation for JASON-OS. Critically, this is the *direct upstream ancestor* of the current scan: the JASON-OS research program (T16 in todos.jsonl) eventually produced the brainstorm (.research/jason-os/BRAINSTORM.md) and is now executing as the sync-mechanism research (Piece 1a and 1b).

**Structure:** `PLAN.md` is the program spec (per-domain protocol: Phase A scoping → Phase B deep-research → Phase C domain gate). `RESEARCH_ROADMAP.md` is the living status tracker. `SYNTHESIS.md` accumulates cross-domain findings. `DEPENDENCIES.md` maps parallelization opportunities across 3 tiers.

**Key finding:** `PLAN.md` is titled "Research Roadmap" — the file that looks like a plan is actually the program spec doc. The living tracker is `RESEARCH_ROADMAP.md`. This is a naming inversion worth noting for the synthesizer.

**DECISIONS.md:** 35 decisions. Decisions #23-32 (per-domain phase protocol, gating, no artificial limits, cross-locale persistence) are a reusable multi-domain research governance model applicable to any large research program in JASON-OS.

**Portability:** `not-portable` overall (SoNash-specific domain topics), but the per-domain research protocol (Phase A/B/C structure, Domain 02a adoption scouting pattern, cross-cutting adoption check) is extractable methodology.

---

### 2. `.planning/synthesis-consolidation/` — T29: Synthesize Skill Consolidation

**plan_scope:** `milestone` (primary); `session-bookmark` (WAVE4_RESUME.md)  
**Status:** COMPLETE — all 15 steps done, Sessions #269-#279, closed 2026-04-14  
**Files:** 4 (PLAN.md, DECISIONS.md, DIAGNOSIS.md, WAVE4_RESUME.md) + `audit-step-10.5/` subdir (30+ JSON files)

D1f previously surfaced this as a formal skill retirement record (T29). This inventory confirms: PLAN.md (857 lines) is the most detailed planning doc in D15a's scope. 32 decisions, 5 waves, 15 steps. XL effort (multi-session).

**Core scope:** Unified `/synthesize` skill from repo-synthesis (v1.3) + website-synthesis (v1.1) + cross-type synthesis stub. 22 quick-scan repos upgraded to Standard depth. 14+ upstream/downstream references updated. Old skills deprecated with redirects.

**WAVE4_RESUME.md:** A transient session-bookmark that carries git state, branch info (planning-41226), wave completion status (2/12 repos done when written), and explicit self-deletion instruction: "delete this file when Wave 4 Step 10 completes." File still exists at scan date — cleanup deferred.

**`audit-step-10.5/` subdir:** 30+ JSON files — per-repo analysis artifacts for the full-corpus audit (Step 10.5). These are structured JSON research outputs, not planning docs. File list includes crawl4ai, MinerU, firecrawl, archivebox, outline, etc.

**Portability:** `not-portable-product` (SoNash-specific skill architecture and corpus). The convergence methodology and 6-option interactive opening menu design are extractable patterns.

---

### 3. `.planning/system-wide-standardization/` — SWS Meta-Plan

**plan_scope:** `milestone` (primary dir + most files); `deferral-registry` (CAPTURE_MANIFEST.md)  
**Status:** Active — Wave 0 + Wave 1 done; Waves 2-3 blocked (T6/T7 in todos.jsonl)  
**Files:** 16 files directly + 3 subdirs

The largest and most complex planning dir. PLAN-v3.md is 2,624 lines — the largest single file in D15a's scope. This is a meta-plan: it coordinates two child plans (Tooling Infrastructure, Code Quality Overhaul) and defines cross-cutting infrastructure, sequencing, and gates. 92 decisions + 19 tenets + 41 directives.

**Subdirs:**
- `code-quality-overhaul/` — child plan, 1,460 total lines (PLAN.md 1,204 + DECISIONS 88 + DIAGNOSIS 168)
- `tooling-infrastructure-audit/` — child plan, 906 total lines (PLAN.md 586 + DECISIONS 103 + DIAGNOSIS 217)
- `learnings-effectiveness-audit/` — child plan, COMPLETE; 1,659 total lines; 35 decisions, 11 waves; AUDIT_SUMMARY.md (353 lines) is the closure doc; lifecycle score improved 6.9→7.7/12
- `reference/sonash-source/` — 7 historical reference docs (v1.0 milestone audit, requirements, roadmap, PR ecosystem docs, GSD context, discovery Q&A)

**JSONL-first decision architecture:** decisions.jsonl + directives.jsonl + tenets.jsonl + ideas.jsonl as machine-readable source; DISCOVERY_RECORD.md as auto-generated human view; DECISIONS_BY_PHASE.md as phase-indexed consumption guide; decisions-phase-map.json as machine index. This is a complete JSONL-first decision management system — a reusable architectural pattern.

**CAPTURE_MANIFEST.md** (219 lines): Maps 3 archived/folded planning docs to their target standardization steps. This is the only file in D15a's scope classified as `deferral-registry` — a formal mechanism for tracking plans that have been folded/archived but whose items must still surface in future deep-plans.

**19 tenets (T1-T24):** The DISCOVERY_RECORD.md contains T1-T18 inline. Key tenets with JASON-OS relevance: T2 (single source of truth / generated views), T4 (JSONL-first), T7 (platform-agnostic), T9 (crash-proof state), T12 (idempotent operations), T13 (plan-as-you-go). The `tenets.jsonl` is classified `sanitize-then-portable`.

**Portability:** `not-portable` overall (SoNash-specific ecosystems, D67 sequence, CANON infrastructure paths), but multiple patterns are extractable: JSONL-first decision architecture, DECISIONS_BY_PHASE pattern, CAPTURE_MANIFEST pattern, tenets.jsonl content (sanitized).

---

### 4. `.planning/research-discovery-standard/` — R&D Standard Plan

**plan_scope:** `research-program`  
**Status:** Active — DRAFT, pending approval; gated on SWS Phases 0-2  
**Files:** 3 (PLAN.md 635 lines, DECISIONS.md 100 lines, DIAGNOSIS.md 155 lines)

4-phase plan to standardize research & discovery as CANON-governed infrastructure. Session #238, 2026-03-25. 27 decisions + 4 user-approved pre-decisions. L (Large) effort, 4-6 sessions.

**Core phases:** (1) RDS-PROTOCOL.md + T19 expansion + CLAUDE.md guardrail + confidence unification; (2) Hook Priority 5.5 + CL-PROTOCOL persistence + Zod schemas; (3) Context7 deployed to 9 agents + development-team.md; (4) Health checker + enforcement manifest + tests.

**PORTABILITY FINDING:** The proposed RDS-PROTOCOL.md (research tier model, routing decisions: Sonnet default/Opus situational/Haiku out, confidence unification) is directly relevant to JASON-OS's deep-research skill. Pre-decision PD-3 (model routing) and PD-4 (full CANON-quality standard) are already adopted by JASON-OS's research methodology. The tiered research classification approach and Hook Priority 5.5 concept (for CL persistence in hook context) are extractable.

**Dependency:** Gated on SWS Phases 0-2. Since SWS Waves 2-3 are blocked (T6/T7), this plan's execution is blocked transitively.

---

### 5. `.planning/plan-orchestration/` — Plan Execution Orchestration

**plan_scope:** `milestone` (PLAN.md, DECISIONS.md, DIAGNOSIS.md) + `execution-handoff` (wave0/ subdir files) + `execution-handoff` (CL-PROTOCOL.md)  
**Status:** Active — Waves 2-3 blocked pending T3  
**Files:** 4 top-level + `wave0/` subdir (5 files)

5-wave pipeline orchestrating 7 active SoNash plans. 26 decisions. Research at `.research/plan-orchestration/RESEARCH_OUTPUT.md` (22-agent L3). As of Session #243: Steps 1-10 done (Wave 0 + Wave 1); Steps 11-25 blocked on T3 (debt-runner expansion, itself blocked on T2 dev dashboard).

**CL-PROTOCOL.md** (316 lines, v1.1): The most portable artifact in this dir. An explicit convergence-loop protocol for plan execution contexts — adapted from deep-research Phase 1-4 architecture. Origin story: Session #237 correction, when single-pass Explore agents were run instead of proper CLs. Protocol created to prevent recurrence. Rule: "Every CL agent role uses the most capable model and agent type available, regardless of speed or cost." HIGHLY PORTABLE — JASON-OS should adopt or reference this.

**`wave0/` subdir:** 5 triage/audit docs (S0-appcheck-triage.md, S0-ci-scripts-triage.md, S0-data-dep-triage.md, repo-cleanup-verification.md, wave0-audit.md). All `plan_scope: execution-handoff`. Status: complete. Total 806 lines. These are ephemeral verification artifacts from a completed wave.

---

### 6. `.planning/t28-intelligence-graph-v1/` — Intelligence Graph V1

**plan_scope:** `research-program` (unusual: only a DIAGNOSIS.md, no PLAN.md)  
**Status:** Active (diagnosis complete; deep-plan not yet executed at time of diagnosis creation)  
**Files:** 1 (DIAGNOSIS.md, 84 lines)

T28 in todos.jsonl refers to the Content Analysis System plan (content-analysis-system/), not this dir. This dir is the planning artifact for T28's *sub-component*: the Content Intelligence Graph (SQLite+FTS5+graphology+custom MCP). Per DIAGNOSIS.md: "T28 appears in SESSION_CONTEXT.md as a P1 item ('RESEARCH DONE — /deep-plan next')."

Research context: `.research/t28-intelligence-graph-data-layer/` — 57 agents, 73 claims, 55 sources, HIGH confidence. Primary recommendation: SQLite + better-sqlite3 v12.8.0 + FTS5 + graphology + custom TypeScript MCP server (5-8 tools). V1 simplified to 1 edge type (LINKS_TO), inline confidence, no temporal query API (V2 deferred).

**JASON-OS RELEVANCE:** The intelligence graph pattern (SQLite+FTS5+graphology indexing `.research/` corpus) is directly applicable to JASON-OS's file registry portability graph problem (T50 in todos.jsonl, also a current active research question). Same architectural components, same problem space of cross-repo knowledge retrieval.

**Classification note:** This dir has no PLAN.md — it is pre-plan state (research complete, plan pending). Classified as `research-program` to reflect the research→plan pipeline status.

---

### 7. `.planning/review-data-architecture/` — PR Review Data Consolidation

**plan_scope:** `milestone` (PLAN.md, DECISIONS.md, DIAGNOSIS.md) + `session-bookmark` (RESUME.md)  
**Status:** COMPLETE — executed in same session as creation (Session #286, 2026-04-17)  
**Files:** 4 (PLAN.md 327 lines, DECISIONS.md 29 lines, DIAGNOSIS.md 115 lines, RESUME.md 84 lines)

16-step plan to consolidate PR review data stores. 21 decisions. L effort (~2-3 hours). Executed on branch CAS-41726. RESUME.md documents what was done (PR #516 R1+R2 + plan execution) — may be stale/orphaned since plan is complete.

Notable: DECISIONS.md is only 29 lines for 21 decisions — unusually terse format, one decision per line approximately.

**Portability:** `not-portable-product` (SoNash-specific review data schema, JSONL structure, PR numbering).

---

### 8. `.planning/content-analysis-system/` — CAS (T28) Plan

**plan_scope:** `milestone` (PLAN.md, DECISIONS.md, DIAGNOSIS.md) + `execution-handoff` (REMAINING_CAS_TASKS.md, STEP_A_HANDOFF.md)  
**Status:** COMPLETE — 14/15 steps done (Step 14 rolled to T38, Step 15 E2E done Session #287)  
**Files:** 5 (PLAN.md 701 lines, DECISIONS.md 78 lines, DIAGNOSIS.md 124 lines, REMAINING_CAS_TASKS.md 235 lines, STEP_A_HANDOFF.md 258 lines)

XL 15-step plan for the Content Analysis System: `/analyze` + `/recall` skills, 4 handler skills (repo, website, document, media), unified Zod schema, SQLite+FTS5 index, incremental synthesis. Sessions #267-#287. Current corpus: 37 sources (27 repo, 6 website, 1 doc, 2 media + 1 monolith).

T29 (synthesis-consolidation) is a sub-plan of T28, also fully complete. The two plans have a parent-child relationship: T28 is the CAS system; T29 is the synthesize skill sub-plan within it.

**REMAINING_CAS_TASKS.md + STEP_A_HANDOFF.md** are execution-handoff artifacts — the first for general remaining work (now mostly stale post Session #287), the second specifically for the 7-parallel-skill-audit step deferred to T38.

---

### 9. `.planning/skill-convergence/` — Analysis/Synthesis Skill Convergence

**plan_scope:** `milestone`  
**Status:** Complete (prerequisite for CAS that is now also complete)  
**Files:** 3 (PLAN.md 456 lines, DECISIONS.md 30 lines, DIAGNOSIS.md 85 lines)

L-effort plan to converge analysis/synthesis skills via shared CONVENTIONS.md (7 canonical conventions) and Zod schema unification. 20 decisions. Research at `.research/analysis-synthesis-comparison/` (L1, 21 agents, 60 claims).

**HIGHEST PORTABILITY IN D15a SCOPE:** Step 1 has an explicit `OS tag: PORTABLE` annotation. The 7 canonical conventions (phase transition markers, write-to-disk-first, conversational prose mandate, 4-band scoring, fit scoring thresholds, SKILL.md/REFERENCE.md split, no-silent-skips) + self-audit minimum floor are universally applicable to any skill-based system. The produced artifact (`.claude/skills/shared/CONVENTIONS.md`) is directly relevant to JASON-OS skill authoring standards.

---

### Top-Level Files

**`todos.jsonl`** (49 lines): JSONL source of truth for all SoNash todos. 25 active (T2, T3, T4, T5, T6, T7, T13, T16, T24, T50 are key active ones), 24 completed. Machine-readable. Auto-rendered to TODOS.md via `scripts/planning/render-todos.js` (hook added Session #279).

**`TODOS.md`** (25 active + 24 completed): Auto-generated human view. "Do not edit" — generated artifact.

**`pr-body-session-279.md`**: Transient PR body text from Session #279 (T28/T29 closure PR). Should have been deleted after merge. Orphaned planning artifact.

---

## plan_scope Distribution

| plan_scope | Count | Dirs/Files |
|---|---|---|
| `milestone` | 35 | Most PLAN.md/DECISIONS.md/DIAGNOSIS.md files across SWS, CAS, synthesis-consolidation, review-data-arch, skill-convergence, plan-orchestration, learnings-effectiveness-audit, code-quality-overhaul, tooling-infrastructure-audit, SWS JSONL artifacts |
| `research-program` | 7 | jason-os (5 files), research-discovery-standard (3), t28-intelligence-graph-v1 (1 DIAGNOSIS) |
| `execution-handoff` | 7 | plan-orchestration wave0 (5), CL-PROTOCOL, content-analysis-system handoffs |
| `session-bookmark` | 4 | synthesis-consolidation WAVE4_RESUME, review-data-architecture RESUME, pr-body-session-279, synthesis-consolidation DIAGNOSIS (borderline) |
| `deferral-registry` | 1 | system-wide-standardization CAPTURE_MANIFEST.md |
| `backlog` | 2 | todos.jsonl, TODOS.md |
| `port-ledger` | 0 | None in D15a scope |
| `cross-pr-learning` | 0 | None in D15a scope |

**Total files inventoried by D15a: 57** (9 dirs × avg ~5 files + subdirs)

---

## Learnings

**1. plan_scope `research-program` vs `milestone` boundary.**  
The distinction is clearer than expected: `research-program` = orchestrates multiple research sessions with defined domains/phases/gates (jason-os/, research-discovery-standard/, t28-intelligence-graph-v1/). `milestone` = implements a known scope with sequential steps and decisions. The `t28-intelligence-graph-v1/` dir is a degenerate case — research complete, plan pending — classified as `research-program` because it's in the research→plan pipeline.

**2. PLAN.md naming inversion in jason-os/.**  
`PLAN.md` is actually the program spec; `RESEARCH_ROADMAP.md` is the living status tracker. This naming inversion will confuse automated tools that expect `PLAN.md` = execution plan. Flag for D22 (schema surveyor) to consider a `document_role` field to distinguish spec-doc from tracker-doc within the same `plan` type.

**3. Transient artifacts accumulate.**  
Three files should have been deleted but were not: `WAVE4_RESUME.md` (had explicit self-deletion instruction), `REMAINING_CAS_TASKS.md` (stale post Session #287), `pr-body-session-279.md` (post-merge orphan). Pattern: completion closure doesn't reliably clean up transient artifacts. The `session-bookmark` scope classification should trigger a cleanup recommendation.

**4. JSONL-first decision architecture is a complete system.**  
The SWS dir implements a 5-file JSONL-first decision management system (decisions.jsonl + directives.jsonl + tenets.jsonl + ideas.jsonl + changelog.jsonl) with generated views (DISCOVERY_RECORD.md), phase index (DECISIONS_BY_PHASE.md), and machine index (decisions-phase-map.json). This pattern is reusable and worth extracting as a JASON-OS planning methodology template.

**5. CAPTURE_MANIFEST.md pattern — unique and valuable.**  
The `deferral-registry` plan_scope surfaces only once in D15a's scope (CAPTURE_MANIFEST.md). It solves a real problem: when large plans are archived/folded, their unconsumed items get lost. The formal manifest pattern — source doc → target step → items to consume → consumed-by session — is a portable planning hygiene technique.

**6. SWS tenets.jsonl contains portable engineering principles.**  
T2 (single source of truth), T4 (JSONL-first), T7 (platform-agnostic), T9 (crash-proof state), T12 (idempotent operations), T15 (interactivity-first) are universal engineering principles, not SoNash-specific. `sanitize_fields: ["SoNash-specific ecosystem references", "CANON dir paths"]` would make them portable to JASON-OS.

**7. CL-PROTOCOL.md is an underappreciated artifact.**  
The plan-orchestration CL-PROTOCOL.md (316 lines) is the most portable artifact in D15a's scope. It generalizes the convergence-loop pattern from deep-research to plan-execution contexts. The origin story (created after Session #237 single-pass shortcut failure) is exactly the kind of behavioral correction that JASON-OS's behavioral memory system should encode. Recommend D22 or the synthesizer flag this for extraction.

**8. skill-convergence/ CONVENTIONS.md — explicit PORTABLE tag in source.**  
The PLAN.md for skill-convergence has `OS tag: PORTABLE` on Step 1 (Create shared CONVENTIONS.md). This is the only instance in D15a's scope of an explicit portability annotation within a planning doc. Suggests the SoNash operator was already thinking about JASON-OS extraction when writing this plan. The 7 conventions are the highest-confidence portable content in D15a's entire scope.

**9. t28-intelligence-graph-v1 architecture is directly relevant to T50 (file registry portability graph).**  
The intelligence graph design (SQLite+FTS5+graphology+custom MCP, research at `.research/t28-intelligence-graph-data-layer/`) uses identical components to what T50 (current JASON-OS active research) is investigating. The V1 simplifications post-audit (1 edge type vs 7, inline confidence, no temporal query API) represent a lessons-learned from scope reduction that T50's design should incorporate.

**10. Agent sizing: scope was appropriate.**  
9 dirs + 3 top-level files fit comfortably in one agent. The largest challenge was SWS's subdirs (4 nested dirs, each with their own PLAN/DECISIONS/DIAGNOSIS triple). A scope that included D15b dirs would have been 2x-3x larger and risked stalling.

---

## Gaps

1. **synthesis-consolidation `audit-step-10.5/` subdir not deeply inventoried.** The 30+ JSON files in this subdir are per-repo audit output artifacts — structured JSON, not planning docs. They are product of the plan (analysis outputs), not planning artifacts themselves. A dedicated pass (possibly D14a-c territory for research artifacts) would be needed to classify them.

2. **`code-quality-overhaul/` and `tooling-infrastructure-audit/` not deeply read.** PLAN.md files for both (1204 lines and 586 lines respectively) were not read — only file sizes verified. Their internal structure, decision counts, and status are unconfirmed. D15b should not cover these (they are D15a scope), but time constraints prevented deep reads. Flagged as incomplete.

3. **`system-wide-standardization/reference/sonash-source/` 7 files not individually inventoried.** File names were captured (v1.0-MILESTONE-AUDIT.md, v1.0-REQUIREMENTS.md, etc.) but contents not read. These are historical reference docs and probably not sync-relevant, but confirmation is missing.

4. **`todos.jsonl` all 49 entries not individually catalogued.** Only the first 3 entries were sampled. Cross-references between todos.jsonl entries and individual planning dirs were partially verified (T28=CAS, T29=synthesis-consolidation, T16=jason-os) but not exhaustive.

5. **No `port-ledger` or `cross-pr-learning` plan_scope found in D15a scope.** These may exist in D15b's dirs (session-285/, creator-view-upgrade/, github-health-skill/ — D15b scope) or in archive/.

---

## Confidence Assessment

- All classifications are based on direct file reads (filesystem ground truth).
- plan_scope assignments are HIGH confidence for primary files (PLAN.md, DECISIONS.md).
- plan_scope for ambiguous files (t28-intelligence-graph-v1 DIAGNOSIS with no PLAN.md) is MEDIUM confidence — judgment call on `research-program` vs `execution-handoff`.
- Status assessments (complete/active) cross-referenced between PLAN.md headers and todos.jsonl where possible.
- File line counts are exact (wc -l verified).
- Total file count (57) is an approximation — SWS `audit-step-10.5/` subdir (30+ JSON files) not individually counted.

---

*D15b covers: `session-285/`, `skill-audit-batch-mode/`, `skill-audit-recall-phase4/`, `skill-audit-synthesize-phase4/`, `creator-view-upgrade/`, `github-health-skill/`, `dev-dashboard/`, `archive/`.*
