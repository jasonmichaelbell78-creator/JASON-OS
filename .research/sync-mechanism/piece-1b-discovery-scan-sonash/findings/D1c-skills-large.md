# D1c Findings — Large Skills Inventory (11 skills, 50–150KB)

**Agent:** D1c  
**Date:** 2026-04-18  
**Profile:** codebase  
**Scope:** `.claude/skills/` — 11 large skills  

---

## Per-Skill Summaries

### 1. mcp-builder (150KB)

**Port status:** SoNash-only (not ported to JASON-OS)

4-phase MCP server development guide supporting both Python (FastMCP) and
Node/TypeScript (MCP SDK). Covers agent-centric design principles, evaluation-driven
development, and a companion evaluation harness with Python scripts.

**Frontmatter:** Minimal — `name`, `description`, `license` only. No `version`,
`compatibility`, `tools`, or `skills:` field.

**Component units:** 11 files. Reference layout is subdirectory
(`reference/mcp_best_practices.md`, `reference/python_mcp_server.md`,
`reference/node_mcp_server.md`, `reference/evaluation.md`). Scripts in Python
(`connections.py`, `evaluation.py`) plus `requirements.txt`. Notable: a binary
tar.gz (`scripts/shadcn-components.tar.gz`) is bundled inside the skill directory
— unusual for a skill repo.

**Active scripts:** Python evaluation harness (`connections.py`, `evaluation.py`).
SKILL.md instructs loading live URLs via WebFetch during Phase 1 (MCP spec, SDK
READMEs) — network dependency baked into the workflow.

**No `_shared/` dependencies.** No TDMS references. No invocation tracking.

**Agent types spawned:** None.

---

### 2. repo-analysis (125KB)

**Port status:** SoNash-only (not ported to JASON-OS)

Dual-lens GitHub repo analysis at Quick/Standard/Deep depths. 9-phase pipeline
(clone+repomix → dimension wave → deep read → content eval → creator view →
engineer view → value map → coverage audit → tag suggestion). The `/analyze`
router dispatches to this skill for repo targets. Version 5.0 with a breaking
phase renumber (phase 4b→3.5).

**Frontmatter:** Name + description only (no version/tools in YAML). Version
metadata lives in HTML comment block above the H1 (`Document Version: 5.0`).

**`_shared/` dependencies:**
- `../_shared/TAG_SUGGESTION.md` — canonical tag protocol (3 references)

**`shared/` reference (different directory!):**
- `.claude/skills/shared/CONVENTIONS.md` — shared conventions (the `shared/`
  directory exists at `.claude/skills/shared/` containing only `CONVENTIONS.md`;
  this is distinct from `_shared/`)

**Active scripts:**
- `scripts/cas/generate-extractions-md.js` — regenerates EXTRACTIONS.md from
  extraction-journal.jsonl (MUST not edit manually)
- `scripts/reviews/write-invocation.ts` (npx tsx) — invocation tracking

**Sanitize fields for portability:**
- `jasonmichaelbell78-creator/sonash-v0` hardcoded in Critical Rule 5 and Guard
  Rail 2 (home repo guard) — must be removed or made configurable
- TDMS references (routing menu option 2 + extraction tracking)
- Scripts paths (scripts/cas/, scripts/reviews/, scripts/lib/)

**Agent types spawned:** Unnamed "dimension agents" (up to 4 concurrent for large
repos). No subagent_type declared — dispatched inline via Bash.

**Cross-skill contracts:**
- `analysis.json` MUST preserve `last_synthesized_at` field (v2.0 contract,
  Session #284) — shared with website-analysis, media-analysis, document-analysis
- `scripts/lib/analysis-schema.js` validates analysis.json (shared CAS schema)

---

### 3. website-analysis (123KB)

**Port status:** SoNash-only (not ported to JASON-OS)

Creator-first website analysis with compliance pre-flight (robots.txt, Anthropic
UA check), superpowers-chrome as primary extractor, and multi-mode operation
(Page/Site/Expedition/Cross-site). Mirrors repo-analysis architecture.

**`_shared/` dependencies:**
- `../_shared/TAG_SUGGESTION.md`

**`shared/` reference:**
- `.claude/skills/shared/CONVENTIONS.md`

**Active scripts:** `scripts/reviews/write-invocation.ts` (npx tsx)

**Key sanitize fields:**
- `superpowers-chrome` MCP tool — SoNash-installed browser MCP, not in JASON-OS.
  Fallback path (WebFetch + Playwright MCP + curl) is documented and usable.
- JASON-OS Domain 02a consumer reference — remove for port
- invocation tracking

**Agent types spawned:** `code-reviewer` dispatched during self-audit Phase 6
step 6 on creator-view.md. This is the only CAS handler that explicitly names a
code-reviewer dispatch in the self-audit.

**Cross-skill contract:** Same `last_synthesized_at` field requirement as
repo-analysis.

---

### 4. system-test (118KB)

**Port status:** SoNash-only — **NOT portable**

23-domain interactive audit of the SoNash codebase. Domains cover SoNash-specific
product concerns: Cloud Functions, Firestore Rules, Auth, PWA, TDMS Integrity,
Sentry, Admin Panel, etc. The interactive per-finding review framework (with
suggestion + counter-argument + severity options) is methodology-portable, but
the domain definitions are wholly SoNash-specific.

**Frontmatter:** Richer than most — includes `version: "4.0"`,
`supports_parallel: false`, `estimated_sessions: 6`, `total_domains: 23`,
`total_checks: "~100"`. No `skills:` field.

**Component units:** 5 files — SKILL.md, domains.md (full 23-domain test plan),
plus 3 reference docs (WORKFLOW.md, RECOVERY_PROCEDURES.md, TRIAGE_GUIDE.md).

**Active scripts:** `node scripts/reset-audit-triggers.js`, `npm run review:check`,
`npm run patterns:check`, `npm test`, `npm run lint`.

**TDMS dependency:** Critical — all findings sync to `MASTER_DEBT.jsonl`
(`docs/technical-debt/`). Domain 16 is literally "TDMS Integrity".

**Deferred sections:** 5 Future Enhancement items (Incremental Audits, Custom
Audit Subset, Confidence Scoring, Trend Analysis, Auto-Issue Creation).

**Agent types spawned:** None — fully sequential interactive skill.

---

### 5. media-analysis (84KB)

**Port status:** SoNash-only (not ported to JASON-OS)

Transcription-first video/audio analysis. Supports YouTube (oEmbed API + captions),
TikTok, podcast RSS, and local audio/video files. Whisper is opt-in and
runtime-detected. 10-phase pipeline mirrors repo-analysis architecture.

**`_shared/` dependencies:**
- `../_shared/TAG_SUGGESTION.md`

**`shared/` reference:**
- `.claude/skills/shared/CONVENTIONS.md`

**Active scripts:** `scripts/reviews/write-invocation.ts` (npx tsx), Python
runtime checks for `youtube-transcript-api` and `faster-whisper`.

**Notable design decisions:**
- `transcript.md` explicitly flagged as a non-CAS reusable artifact — downstream
  consumers can use it directly (quote, cite).
- Windows Python bootstrap detail (embedded Python `._pth` edit) deferred to
  REFERENCE.md §3.1 — Windows-specific complexity properly isolated.
- Duration scope-explosion soft prompt at >60 min — no hard block.

**Agent types spawned:** None.

---

### 6. audit-comprehensive (80KB)

**Port status:** SoNash-only — **NOT portable**

Orchestrator skill spawning 9 audit sub-skills (audit-code, audit-security,
audit-performance, audit-documentation, audit-refactoring, audit-process,
audit-engineering-productivity, audit-enhancements, audit-ai-optimization).
Two orchestration modes: Agent Teams (requires experimental env flag) and
Subagent Mode (default).

**Frontmatter:** Includes `supports_parallel: true`, `fallback_available: true`,
`estimated_time_parallel: 65 min`, `estimated_time_sequential: 180 min`.

**Dependencies beyond the 9 sub-skills:**
- `mcp__plugin_episodic-memory__search` — episodic memory MCP for pre-flight
  context from past audit sessions. SoNash-specific MCP not in JASON-OS.
- `CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1` env flag for teams mode
- `MASTER_DEBT.jsonl` + `AUDIT_TRACKER.md` (SoNash product paths)

**Active scripts:** `node scripts/reset-audit-triggers.js`, `npm run review:check`.

**Reference subdir:** 3 docs all at v1.0 from 2026-02-16, significantly older than
SKILL.md v3.2. Potential staleness gap.

**Deferred sections:** 5 Future Enhancement items explicitly listed.

**Agent types spawned:** 9 audit sub-skills as subagents, or 4 teammates in teams
mode.

---

### 7. deep-research (75KB)

**Port status:** PORTED TO JASON-OS — v2.0 (current, matched)

The flagship research engine. 12-phase orchestration pipeline dispatching 8
distinct agent types. JASON-OS port is at the same document version (2.0,
2026-04-05). SoNash version lacks the `agentskills-v1 compatibility` and
`metadata.version` frontmatter fields that JASON-OS adds.

**`_shared/` dependencies:** None (uses `domains/` subdirectory directly).

**Structural differences SoNash vs JASON-OS:**
- SoNash: GSD routing options (`/gsd:new-project`, `/gsd:research-phase`)
  present in routing table
- JASON-OS: GSD options removed (as expected)
- Both share identical SKILL.md content otherwise

**Component units:** 5 files — SKILL.md, REFERENCE.md (22 sections, v1.5),
`domains/technology.yaml`, `domains/academic.yaml`, `domains/business.yaml`.

**Agent types spawned (8 types):** `deep-research-searcher`,
`deep-research-synthesizer`, `deep-research-verifier`, `contrarian-challenger`,
`otb-challenger`, `dispute-resolver`, `deep-research-gap-pursuer`,
`deep-research-final-synthesizer`.

**Critical note:** Phase 2.5 persistence safety net (T23 fix) is documented in
SKILL.md and addresses the Windows 0-byte agent output bug — this fix was
authored during piece-1a-discovery-scan-jason-os and is reflected in SoNash v2.0.

**No `scripts/reviews/` invocation tracking** — unlike the CAS handler quartet,
deep-research does not invoke write-invocation.ts.

---

### 8. document-analysis (73KB)

**Port status:** SoNash-only (not ported to JASON-OS)

Analysis of PDFs, GitHub gists, arxiv papers, articles, markdown files, and
meeting notes. 9-phase pipeline mirrors repo-analysis architecture. Created in
Session #269 as part of the T28 CAS initiative alongside media-analysis.

**`_shared/` dependencies:**
- `../_shared/TAG_SUGGESTION.md`

**`shared/` reference:**
- `.claude/skills/shared/CONVENTIONS.md`

**Active scripts:** `scripts/reviews/write-invocation.ts` (npx tsx).

**Notable Windows-specific logic:**
- PDF fallback: if `pdftoppm not found`, use `pdfjs-dist` via Node.js
  (`require('pdfjs-dist/legacy/build/pdf.mjs')`); permanent fix via
  `winget install poppler`.
- Scope-explosion soft prompt at >100 pages PDF.

**Agent types spawned:** None.

**Cross-skill contract:** Same `last_synthesized_at` field requirement.

---

### 9. skill-audit (65KB)

**Port status:** PARTIALLY PORTED — JASON-OS at v3.1, SoNash at v4.0

The behavioral quality audit skill. JASON-OS has the v3.1 single-mode
interactive version. SoNash v4.0 added batch/multi modes (D7-D20 decisions) —
these are SoNash-only features not yet ported:

**SoNash v4.0 additions not in JASON-OS v3.1:**
- `mode=batch` — produce all 12 category findings at once to a tmp file
- `mode=multi` — audit multiple skills in one cohesive run with Shape Y orchestration
- Phase 2.A — cross-skill pattern detection (3+ skills threshold)
- Phase 2.B — decoupled decision collection
- Batched Phase 3 crosscheck (ONCE across batch, not N times)
- Parallel Phase 5 self-audit.js dispatch for multi mode
- Decouple from `audit-review-team` (D19)

**`_shared/` dependencies:**
- `../_shared/SELF_AUDIT_PATTERN.md` (referenced in REFERENCE.md and SKILL.md)

**Active scripts:**
- `node scripts/skills/skill-audit/self-audit.js` — Phase 5.0 mechanical
  self-audit (deterministic grep+diff verification; LLM agent layer removed
  Session #281)
- `scripts/reviews/write-invocation.ts` (npx tsx)
- `npm run skills:validate`

**Agent types spawned:** None (removed code-reviewer agent layer in v4.0 D11).

---

### 10. artifacts-builder (65KB)

**Port status:** SoNash-only (not ported to JASON-OS)

Shell-script-driven workflow for building self-contained claude.ai HTML artifacts
using React + TypeScript + Vite + Parcel + Tailwind CSS + shadcn/ui.

**Frontmatter:** Minimal — `name`, `description`, `license` only. No version,
compatibility, or `skills:` field.

**Component units:** 5 files. Two shell scripts plus a binary tar.gz
(`shadcn-components.tar.gz` — pre-bundled 40+ shadcn/ui components).

**No `_shared/` dependencies.** No TDMS references. No invocation tracking.
No state file. No self-audit phase. Simplest skill in the D1c set.

**Active scripts:** `scripts/init-artifact.sh`, `scripts/bundle-artifact.sh`.

**Agent types spawned:** None.

**Notable:** Anti-AI-slop design note ("avoid excessive centered layouts, purple
gradients, uniform rounded corners, Inter font") is a useful portable principle.

---

### 11. skill-creator (56KB)

**Port status:** PORTED TO JASON-OS — v3.4 (current, matched)

7-phase structured skill creation workflow. JASON-OS port is at the same version
as SoNash (v3.4). SoNash SKILL.md lacks the `agentskills-v1 compatibility`
frontmatter that JASON-OS adds. v1.0 changelog note says "Anthropic skill,
Apache 2.0" — this skill originated outside SoNash.

**`_shared/` dependencies:**
- `../_shared/SKILL_STANDARDS.md` (Phase 5 content checklist)
- `../_shared/SELF_AUDIT_PATTERN.md` (Phase 4.3 scaffold + Phase 5 verify)

**Active scripts:**
- `scripts/skill-creator/init_skill.py` — scaffold new skill directory
- `scripts/skill-creator/package_skill.py`
- `scripts/skill-creator/quick_validate.py`
- `scripts/reviews/write-invocation.ts` (npx tsx)
- `npm run skills:validate`

**Agent types spawned:** `Explore agents` (Phase 2 codebase scan for Complex
tier), convergence-loop quick preset (Phase 5 codebase claims verify).

**SoNash-specific sanitize fields:** `docs/agent_docs/SKILL_AGENT_POLICY.md`
reference (SoNash product docs path), ROADMAP.md check (project-specific),
EXTRACTIONS.md / extraction-journal.jsonl context scan (Phase 1).

---

## JASON-OS Port Status Summary

| Skill | Port Status | JASON-OS Version | SoNash Version | Gap |
|-------|-------------|-----------------|----------------|-----|
| deep-research | Ported — current | 2.0 | 2.0 | GSD routing removed (expected) |
| skill-creator | Ported — current | 3.4 | 3.4 | Minor: extra frontmatter fields in JOS |
| skill-audit | Partially ported | 3.1 | 4.0 | Batch/multi modes missing in JOS |
| repo-analysis | SoNash-only | — | 5.0 | Home repo guard, TDMS, scripts deps |
| website-analysis | SoNash-only | — | 2.0 | superpowers-chrome, invocation tracking |
| document-analysis | SoNash-only | — | 2.0 | Scripts deps, invocation tracking |
| media-analysis | SoNash-only | — | 2.0 | Scripts deps, invocation tracking |
| audit-comprehensive | SoNash-only | — | 3.2 | TDMS, episodic memory MCP, 9 sub-skills |
| system-test | SoNash-only | — | 4.0 | Deeply SoNash-product-specific |
| mcp-builder | SoNash-only | — | 1.0 | Portable but not yet ported |
| artifacts-builder | SoNash-only | — | 1.0 | Portable, simple shell scripts |

**Ported:** 2 (deep-research, skill-creator)  
**Partially ported:** 1 (skill-audit — v3.1 vs v4.0 gap)  
**SoNash-only, portable:** 5 (mcp-builder, artifacts-builder, repo-analysis, website-analysis, document-analysis, media-analysis — conditionally with sanitization)  
**SoNash-only, not portable:** 2 (audit-comprehensive, system-test)

---

## Shared-Library Reuse Patterns

### `_shared/` directory (`/.claude/skills/_shared/`)

Four files: `AUDIT_TEMPLATE.md`, `SELF_AUDIT_PATTERN.md`, `SKILL_STANDARDS.md`,
`TAG_SUGGESTION.md`, plus `ecosystem-audit/` subdirectory.

**Usage across the 11 large skills:**

| `_shared/` File | Skills Referencing It |
|---|---|
| `TAG_SUGGESTION.md` | repo-analysis, website-analysis, media-analysis, document-analysis (4 of 11) |
| `SELF_AUDIT_PATTERN.md` | skill-audit, skill-creator (2 of 11) |
| `SKILL_STANDARDS.md` | skill-creator (1 of 11) |
| `AUDIT_TEMPLATE.md` | Not referenced by D1c skills |

All 4 CAS handler siblings (repo-analysis, website-analysis, media-analysis,
document-analysis) reference TAG_SUGGESTION.md identically — it is the canonical
tag protocol for all content analysis handlers.

### `shared/CONVENTIONS.md` — Separate directory

repo-analysis, website-analysis, media-analysis, and document-analysis all
reference `.claude/skills/shared/CONVENTIONS.md` (note: `shared/`, not
`_shared/`). The `shared/` directory exists at `.claude/skills/shared/` and
contains only `CONVENTIONS.md`. This is a different directory from `_shared/`.

**Important:** This creates a naming inconsistency — `_shared/` is the main
shared library with 4+ files, `shared/` is a single-file CONVENTIONS directory.
D22 schema surveyor should note this as a potential normalization candidate.

### `scripts/reviews/write-invocation.ts` — Invocation tracking

6 of the 11 skills invoke `scripts/reviews/write-invocation.ts` via `npx tsx`
for invocation tracking. This is a SoNash-specific script not present in
JASON-OS. The CAS quartet (repo-analysis, website-analysis, media-analysis,
document-analysis), plus skill-audit and skill-creator all depend on it.

### `scripts/lib/analysis-schema.js` — CAS schema validation

4 CAS handler skills (repo-analysis, website-analysis, media-analysis,
document-analysis) validate `analysis.json` against `scripts/lib/analysis-schema.js`.
This is a runtime external dependency requiring the script to exist at that path.

### `scripts/cas/generate-extractions-md.js` — Extractions regeneration

repo-analysis requires this script to regenerate EXTRACTIONS.md. A one-skill
dependency on a SoNash-specific CAS utility script.

### No copy-not-import pattern found

No `safe-fs.js`, `sanitize-error.cjs`, or other `scripts/lib/*.js` files were
copied inside any skill's subdirectory. The `scripts/lib/` dependencies are
referenced by path to the project root — not copied in.

---

## `skills:` Field Usage

**None of the 11 skills have a `skills:` frontmatter field.** D2a surfaced this
as a universal SoNash pattern in agents/teams — but it does not appear in any of
the 11 large skills surveyed here. This field appears to be agent/team-specific,
not skill-specific.

---

## `_shared/` vs `shared/` Path Inconsistency

This is a notable finding. The CAS skills use two different `shared` prefixes:

- `_shared/` — main library with SELF_AUDIT_PATTERN.md, SKILL_STANDARDS.md,
  TAG_SUGGESTION.md, AUDIT_TEMPLATE.md
- `shared/` — single-file directory containing only CONVENTIONS.md

repo-analysis references `shared/CONVENTIONS.md` inline in its SKILL.md header
but `_shared/TAG_SUGGESTION.md` in the body. This is an inconsistency within
a single skill. The leading underscore convention (`_shared/`) appears to be
the primary pattern adopted later; `shared/` may be a legacy location.

---

## Learnings for Methodology

1. **`skills:` frontmatter field is NOT a skill pattern.** The D2a finding about
   `skills: [sonash-context]` is an agent/team pattern only. None of 11 large
   skills have it. Future agents scanning skills can skip checking for `skills:`.

2. **Shared directory naming inconsistency is a real finding.** The `shared/`
   vs `_shared/` split in `.claude/skills/` warrants a dedicated D22 note.
   Agents should check BOTH paths when looking for shared skill dependencies.

3. **Version metadata lives outside YAML frontmatter for some skills.** The CAS
   quartet (repo-analysis, website-analysis, media-analysis, document-analysis)
   stores `Document Version:` in an HTML comment block immediately below the YAML
   frontmatter, not as a YAML field. A parser using only YAML frontmatter will
   miss version/date/status for these 4 skills.

4. **`scripts/reviews/write-invocation.ts` is a pervasive invisible dependency.**
   6 of 11 skills depend on it via `npx tsx` invocation. It is SoNash-only and
   a sanitize requirement for every skill that calls it. JASON-OS skills that were
   ported (deep-research, skill-creator) do not appear to have this tracking — or
   may have had it stripped. Worth verifying during sync.

5. **Binary assets (tar.gz) inside skill dirs are uncommon but exist.** Both
   mcp-builder and artifacts-builder have binary content in their `scripts/`
   subdirectory. Sync tooling needs to handle non-text files.

6. **Reference subdirectory vs flat REFERENCE.md are both used.** 4 skills use
   `reference/` subdirectory layout (mcp-builder, audit-comprehensive, system-test,
   repo-analysis uses flat but... actually repo-analysis uses flat REFERENCE.md).
   Correction: mcp-builder, audit-comprehensive, and system-test use subdirectory
   layout; the rest use flat REFERENCE.md or none.

7. **Port version gaps matter for skill-audit.** The D1c scan revealed skill-audit
   is v3.1 in JASON-OS but v4.0 in SoNash — a significant functional gap (batch/
   multi modes). The sync-mechanism must handle "partially ported" as a distinct
   status, not just "ported vs not-ported."

8. **system-test and audit-comprehensive are fundamentally non-portable.** These
   two skills encode SoNash product domain knowledge in their core content. Any
   "port" would require a full rewrite of domain definitions for the target
   codebase. They should be classified as `not-portable` in the sync schema,
   with a note that the orchestration pattern (staged waves, interactive review)
   is portable methodology.

9. **The CAS handler quartet (repo-analysis, website-analysis, media-analysis,
   document-analysis) share architecture, phase numbering, cross-skill contracts,
   and shared dependencies as a family.** A sync decision for one likely implies
   the same decision for all four. They should be treated as a composite unit
   for sync planning.

10. **skill-creator's Anthropic origin** (v1.0 note: "Anthropic skill, Apache 2.0")
    is significant for lineage tracking. The `source_project` in the JSONL says
    `sonash` (SoNash is the holding repo), but the ultimate origin is external to
    SoNash. D22 may want a `upstream_origin` field for externally-originated skills
    that were adopted into SoNash.

---

## Gaps and Missing References

1. **`shared/CONVENTIONS.md` content not read.** The file at
   `.claude/skills/shared/CONVENTIONS.md` was identified but not read in full.
   Its §10 (retro), §12 (schema contract), §13.3 (transcript), §14 (tag
   suggestion), §18 (prior feedback replay) are referenced heavily by CAS skills.
   D22 or a dedicated agent should inventory it.

2. **`_shared/TAG_SUGGESTION.md` not fully read.** Referenced by 4 CAS skills as
   the canonical tag protocol. Content not read.

3. **`_shared/SKILL_STANDARDS.md` and `_shared/SELF_AUDIT_PATTERN.md` not read.**
   These are runtime dependencies for skill-creator and skill-audit. D22 should
   read them.

4. **9 audit sub-skills (audit-code, audit-security, etc.) are out of D1c scope.**
   audit-comprehensive depends on them as spawned agents. They are smaller skills
   not included in D1c's 11-skill scope. They need inventory by another agent.

5. **`scripts/reviews/write-invocation.ts` not inventoried.** This is a
   SoNash-specific invocation tracking script referenced by 6 of 11 skills.
   D-agents covering `scripts/` should capture it.

6. **`scripts/lib/analysis-schema.js` not inventoried.** CAS schema validation
   dependency for 4 skills. Should be covered in `scripts/` D-agents.

7. **`scripts/cas/generate-extractions-md.js` not inventoried.** Required by
   repo-analysis EXTRACTIONS.md regeneration. `scripts/` D-agents scope.

8. **`docs/agent_docs/SKILL_AGENT_POLICY.md` not inventoried.** Referenced by
   skill-creator. `docs/` D-agents scope.

9. **`audit-comprehensive reference/` staleness.** The 3 reference docs are all
   at v1.0 from 2026-02-16 while SKILL.md is at v3.2. Whether the reference docs
   are stale or simply stable could not be verified without reading them fully.

10. **skill-audit v4.0 batch state schema.** The "parent batch state schema" is
    documented in REFERENCE.md but was only spot-read (50 lines). The full schema
    for multi-skill batch coordination was not captured.
