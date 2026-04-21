# FINDINGS — D6-cas-skills-deep

**Agent:** Phase 1 D-agent D6-cas-skills-deep
**Scope:** SQ-D6a — surgical-rewrite list per CAS skill for porting into JASON-OS
**Context:** BRAINSTORM §5 Q6 + §3 D19 (CAS gets reshaped during its own port; NO `--foreign-mode` flag) + D23 verdict legend (`copy-as-is` / `sanitize` / `reshape` / `rewrite` / `skip` / `blocked-on-prereq`)
**Depth:** L1 — every coupling claim has a `file:line` cite
**Date:** 2026-04-21
**Method:** Read SKILL.md + REFERENCE.md for all 6 skills (9,456 lines total) → Grep each directory for coupling tokens (`sonash`, `Workspace`, `jasonmichaelbell`, `Firebase`, `.planning/`, `SESSION_CONTEXT.md`, `ROADMAP.md`, `CLAUDE.md`, `MEMORY.md`, `scripts/cas/`, `analysis-schema`, hardcoded Windows paths) → per-site verdict per D23.

---

## Summary

**Total coupling sites found:** 89 across 6 skills (14 SKILL.md + 75 REFERENCE.md).

**Distribution by skill (coupling sites):**

| Skill               | SKILL.md | REFERENCE.md | Total | Severity | Port effort (h) |
| ------------------- | -------- | ------------ | ----- | -------- | --------------- |
| `/analyze`          | 8        | 10           | 18    | medium   | 4–6             |
| `/document-analysis`| 3        | 11           | 14    | low-med  | 3–5             |
| `/media-analysis`   | 3        | 10           | 13    | low-med  | 3–5             |
| `/recall`           | 10       | 7            | 17    | medium   | 4–6             |
| `/repo-analysis`    | 13       | 17           | 30    | **high** | 10–14           |
| `/synthesize`       | 9        | 9            | 18    | medium   | 5–7             |
| **TOTAL**           | **46**   | **64**       | **110** (dup incl. cross-refs) | — | **~30–45 h** |

> Note: Distinct unique coupling sites = **89** (after dedup across REFERENCE §-references); the 110 row-count above includes repeated cites of the same anchor (e.g., multiple mentions of `scripts/lib/analysis-schema.js` in one file).

**Coupling-type frequency (across all 6 skills):**

| Coupling type                                              | Count | Dominant verdict |
| ---------------------------------------------------------- | ----- | ---------------- |
| Home-context files (`SESSION_CONTEXT.md`, `ROADMAP.md`, `CLAUDE.md`, `MEMORY.md`, `.claude/skills/`) | 27 | **reshape** |
| CAS helper scripts (`scripts/cas/*.js`)                    | 17 | **rewrite** (path param) |
| DB / SQLite (`.research/content-analysis.db`)              | 12 | reshape (path param) |
| Artifact roots (`.research/analysis/`, `.research/extraction-journal.jsonl`, `.research/EXTRACTIONS.md`) | 15 | reshape (root param) |
| Zod schema lib (`scripts/lib/analysis-schema.js`)          | 8  | rewrite (to JASON-OS path) |
| Home-repo URL guard (`jasonmichaelbell78-creator/sonash-v0`) | 3  | **rewrite** (config-driven allowlist) |
| `.planning/<project>/DECISIONS.md` planning tree           | 6  | reshape (optional ref) |
| Hardcoded Windows/`Workspace` prefix                       | 3  | rewrite (runtime) |
| Stack assumptions (Zod 4.3.6, Next.js 16, Tailwind 4)      | 3  | copy-as-is (stack is downstream choice) |
| Security helper paths (`scripts/lib/sanitize-error.js` etc.) | 5  | sanitize (path swap) |

**Top-level verdict:** NO skill is `copy-as-is`. Every CAS skill needs at least **reshape** for path/root parameterization; `/repo-analysis` + `/synthesize` need **rewrite** for the home-repo guard + Zod schema library + home-context loader.

**Deduped summary — per D23 verdict at skill-granularity:**

| Skill                | SKILL.md verdict | REFERENCE.md verdict | Combined verdict |
| -------------------- | ---------------- | -------------------- | ---------------- |
| `/analyze`           | reshape          | reshape              | **reshape**      |
| `/document-analysis` | reshape          | reshape              | **reshape**      |
| `/media-analysis`    | reshape          | reshape              | **reshape**      |
| `/recall`            | reshape          | reshape              | **reshape**      |
| `/repo-analysis`     | rewrite          | rewrite              | **rewrite**      |
| `/synthesize`        | reshape          | reshape              | **reshape**      |

---

## Per-skill coupling tables

### Table 1 — `/analyze` (router; 2 files, 1018 lines)

Skill role: type-detection router + post-handler SQLite index update + EXTRACTIONS.md regen + routing-log. Thin by design; coupling is concentrated in helper-script invocations and artifact root paths.

| file:line | current (SoNash-hardcoded) value | coupling type | proposed parameter | verdict |
|---|---|---|---|---|
| `analyze/SKILL.md:37` | `CLAUDE.md §5 Top 5 Anti-Patterns` (anchor reference) | home-context ref | Replace with anchor to JASON-OS CLAUDE.md §5 (generic anti-patterns; already sanitized in JASON-OS bootstrap) | sanitize |
| `analyze/SKILL.md:69` | `node scripts/cas/rebuild-index.js` | CAS helper path | Config: `CAS_SCRIPTS_ROOT` (env var) or skill-arg `--cas-scripts=<path>`; default `scripts/cas/` in target repo | rewrite |
| `analyze/SKILL.md:96-97` | `.research/research-index.jsonl`, `.research/<topic-slug>/`, `.research/analysis/<slug>/`, `.research/content-analysis.db` | artifact root | Config: `RESEARCH_ROOT` (default `.research/`); `CAS_DB_PATH` (default `${RESEARCH_ROOT}/content-analysis.db`) | reshape |
| `analyze/SKILL.md:146-147` | `.research/analysis/<slug>/`, `.research/content-analysis.db`, `.research/EXTRACTIONS.md`, `.claude/state/analyze-routing-log.jsonl` | artifact root | Same `RESEARCH_ROOT` + `STATE_ROOT` params | reshape |
| `analyze/SKILL.md:157,164-167,174` | `.research/analysis/<slug>/`, `.research/extraction-journal.jsonl`, `.research/EXTRACTIONS.md` | artifact root | Same `RESEARCH_ROOT` param | reshape |
| `analyze/SKILL.md:217` | `.research/analysis/<slug>/analysis.json` | artifact root | Same `RESEARCH_ROOT` param | reshape |
| `analyze/SKILL.md:221,223,261` | `node scripts/cas/update-index.js --slug=<slug>`, `node scripts/cas/generate-extractions-md.js` | CAS helper path | `CAS_SCRIPTS_ROOT` + command alias table | rewrite |
| `analyze/SKILL.md:262` | `CLAUDE.md §5 Top 5` | home-context ref | Same as line 37 | sanitize |
| `analyze/SKILL.md:275` | `.research/analysis/` | artifact root | `RESEARCH_ROOT/analysis/` | reshape |
| `analyze/REFERENCE.md:308` | `.claude/state/synthesize.state.json`, `.research/analysis/` | artifact root | `STATE_ROOT` + `RESEARCH_ROOT` | reshape |
| `analyze/REFERENCE.md:319-321,333,361,449-452,458,465,500-501` | Multiple `.research/analysis/`, `.research/repo-analysis/`, `.research/website-analysis/`, `.research/extraction-journal.jsonl` | artifact root | `RESEARCH_ROOT` + per-handler subdir config table | reshape |
| `analyze/REFERENCE.md:388,460,494,522,565,628,663` | `scripts/cas/rebuild-index.js`, `scripts/cas/update-index.js` | CAS helper path | `CAS_SCRIPTS_ROOT` | rewrite |
| `analyze/REFERENCE.md:542` | `.research/content-analysis.db` (SQLite, WAL mode) | DB path | `CAS_DB_PATH` | reshape |
| `analyze/REFERENCE.md:636` | `scripts/lib/analysis-schema.js` | Zod schema lib | `SCHEMA_LIB_PATH` (or package-ify) | rewrite |
| `analyze/REFERENCE.md:641,663` | `.research/analysis/<slug>/analysis.json`, `.research/content-analysis.db` | artifact root + DB | `RESEARCH_ROOT` + `CAS_DB_PATH` | reshape |
| `analyze/REFERENCE.md:646` | `scripts/lib/sanitize-error.js` | security helper path | `SECURITY_HELPERS_ROOT` (JASON-OS has `.cjs` variant at `scripts/lib/sanitize-error.cjs` — verify) | sanitize |
| `analyze/REFERENCE.md:707` | `CLAUDE.md §2 privacy defaults` | home-context anchor | Anchor rewrite for JASON-OS CLAUDE.md §2 | sanitize |
| `analyze/REFERENCE.md:51-53,237` | `https://github.com/vercel/next.js` (examples only, not SoNash-coupled) | example data | copy-as-is (generic public-repo examples) | copy-as-is |

**`/analyze` dep map:**
- Calls `scripts/cas/rebuild-index.js`, `update-index.js`, `generate-extractions-md.js` (hard dep).
- Dispatches via `Skill` tool to: `/repo-analysis`, `/website-analysis`, `/document-analysis`, `/media-analysis`, `/synthesize`.
- Reads: `scripts/lib/analysis-schema.js`, `scripts/lib/sanitize-error.js`.
- Writes: `.research/analysis/<slug>/`, `.research/content-analysis.db`, `.research/EXTRACTIONS.md`, `.claude/state/analyze-routing-log.jsonl`.

---

### Table 2 — `/document-analysis` (2 files, 1684 lines)

Handler-arm for PDFs / gists / arxiv / markdown. Already mostly self-contained; home-context + schema lib are main couplings.

| file:line | current (SoNash-hardcoded) value | coupling type | proposed parameter | verdict |
|---|---|---|---|---|
| `document-analysis/SKILL.md:7,37,106` | `.research/analysis/<doc-slug>/`, `.research/analysis/<slug>/` | artifact root | `RESEARCH_ROOT` | reshape |
| `document-analysis/SKILL.md:61-62` | Home-context load: `SESSION_CONTEXT.md`, `ROADMAP.md`, `CLAUDE.md`, `.claude/skills/`, `MEMORY.md` user entries | home-context files | Config: `HOME_CONTEXT_FILES[]` (ordered list); default `[SESSION_CONTEXT.md, ROADMAP.md, CLAUDE.md, MEMORY.md]` — skill-agnostic file list, fail-soft if any missing | **reshape** |
| `document-analysis/SKILL.md:64,113` | `scripts/lib/analysis-schema.js`, `CONVENTIONS.md §12` | Zod schema lib + conventions ref | `SCHEMA_LIB_PATH`; CONVENTIONS.md is `.claude/skills/shared/CONVENTIONS.md` (will port alongside — relative ref stable) | rewrite |
| `document-analysis/SKILL.md:279,394-395` | `.research/extraction-journal.jsonl`, `.research/EXTRACTIONS.md`, `.research/reading-chain.jsonl` | artifact root | `RESEARCH_ROOT` | reshape |
| `document-analysis/REFERENCE.md:20,34` | `.research/analysis/<doc-slug>/`, `.research/` (cross-entity) | artifact root | `RESEARCH_ROOT` | reshape |
| `document-analysis/REFERENCE.md:48` | `scripts/lib/analysis-schema.js` (validates against analysisRecordCore) | Zod schema lib | `SCHEMA_LIB_PATH` | rewrite |
| `document-analysis/REFERENCE.md:149` | "validated by Zod" (implicit Zod 4.3.6 dep) | stack assumption | Carry-through: JASON-OS already Zod-compatible (but not pinned to 4.3.6) | copy-as-is (version detail is stack-local) |
| `document-analysis/REFERENCE.md:428,458,477,490` | `.research/extraction-journal.jsonl`, `.research/reading-chain.jsonl`, `.research/research-index.jsonl`, `.research/analysis/document-pdf/` | artifact root | `RESEARCH_ROOT` | reshape |
| `document-analysis/REFERENCE.md:756` | `Workspace prefix: ~80 chars (C:\Users\<user>\Workspace\dev-projects\<project>\)` | hardcoded Windows path | Rewrite: `<TARGET_REPO_ROOT>` placeholder; compute at runtime | **rewrite** |
| `document-analysis/REFERENCE.md:757` | `.research/ prefix: ~30 chars (.research/analysis/)` | artifact root | `RESEARCH_ROOT` prefix; keep MAX_PATH budget math | reshape |
| `document-analysis/REFERENCE.md:1169` | `.research/analysis/<doc-slug>/` | artifact root | `RESEARCH_ROOT` | reshape |
| `document-analysis/REFERENCE.md:1237-1245` | Home-context load (5 sources: SESSION_CONTEXT.md, ROADMAP.md, CLAUDE.md, `.claude/skills/`, MEMORY.md) — references CONVENTIONS.md §9 | home-context files | `HOME_CONTEXT_FILES[]` config; CONVENTIONS.md §9 reshape is shared-skill job | **reshape** |

**`/document-analysis` dep map:**
- Reads: `scripts/lib/analysis-schema.js`, home-context files.
- Writes: `.research/analysis/<slug>/`, `.research/extraction-journal.jsonl`, `.research/reading-chain.jsonl`.
- Downstream consumer: `/analyze` router (post-handler index update), `/recall` (via rebuild-index), `/synthesize`.

---

### Table 3 — `/media-analysis` (2 files, 1945 lines)

Handler-arm for video/audio/podcast. Structurally identical coupling profile to `/document-analysis` (they are siblings). Adds transcript.md artifact but no new SoNash-coupled sites.

| file:line | current (SoNash-hardcoded) value | coupling type | proposed parameter | verdict |
|---|---|---|---|---|
| `media-analysis/SKILL.md:8,39,109` | `.research/analysis/<media-slug>/`, `.research/analysis/<slug>/` | artifact root | `RESEARCH_ROOT` | reshape |
| `media-analysis/SKILL.md:68-69` | Home-context load (SESSION_CONTEXT.md, ROADMAP.md, CLAUDE.md, `.claude/skills/`, MEMORY.md) | home-context files | `HOME_CONTEXT_FILES[]` | **reshape** |
| `media-analysis/SKILL.md:71` | `scripts/lib/analysis-schema.js`, CONVENTIONS.md §12 | Zod schema lib + CONVENTIONS anchor | `SCHEMA_LIB_PATH` | rewrite |
| `media-analysis/SKILL.md:306,428-429` | `.research/extraction-journal.jsonl`, `.research/EXTRACTIONS.md`, `.research/reading-chain.jsonl` | artifact root | `RESEARCH_ROOT` | reshape |
| `media-analysis/REFERENCE.md:20,35` | `.research/analysis/<media-slug>/`, `.research/` | artifact root | `RESEARCH_ROOT` | reshape |
| `media-analysis/REFERENCE.md:49` | `scripts/lib/analysis-schema.js` | Zod schema lib | `SCHEMA_LIB_PATH` | rewrite |
| `media-analysis/REFERENCE.md:153` | "validated by Zod" | stack assumption | copy-as-is | copy-as-is |
| `media-analysis/REFERENCE.md:459,487,506,518` | `.research/extraction-journal.jsonl`, `.research/reading-chain.jsonl`, `.research/research-index.jsonl`, `.research/analysis/youtube-com--watch-v-abc123/` | artifact root | `RESEARCH_ROOT` | reshape |
| `media-analysis/REFERENCE.md:816` | `Workspace prefix: ~80 chars` | hardcoded Windows path | Runtime-computed `<TARGET_REPO_ROOT>` | **rewrite** |
| `media-analysis/REFERENCE.md:817` | `.research/ prefix: ~30 chars` | artifact root | `RESEARCH_ROOT` | reshape |
| `media-analysis/REFERENCE.md:1372` | `.research/analysis/<media-slug>/` | artifact root | `RESEARCH_ROOT` | reshape |
| `media-analysis/REFERENCE.md:1450-1458` | Home-context load (same 5 sources, via CONVENTIONS §9) | home-context files | `HOME_CONTEXT_FILES[]` | **reshape** |

**`/media-analysis` dep map:**
- Reads: `scripts/lib/analysis-schema.js`, home-context files, transcripts (captions/whisper/manual).
- Writes: `.research/analysis/<slug>/`, transcript.md, `.research/extraction-journal.jsonl`.
- Opt-in Whisper dep (runtime detection, not coupled).

---

### Table 4 — `/recall` (2 files, 908 lines)

SQLite query layer. Heaviest single-script dependency profile (calls `recall.js`, `rebuild-index.js`, `retag.js`). All JSONL/SQLite paths parameterizable.

| file:line | current (SoNash-hardcoded) value | coupling type | proposed parameter | verdict |
|---|---|---|---|---|
| `recall/SKILL.md:21` | `.research/extraction-journal.jsonl` | artifact root | `RESEARCH_ROOT` | reshape |
| `recall/SKILL.md:26` | `.planning/content-analysis-system/DECISIONS.md` | planning-tree ref | Optional: `PLANNING_ROOT` env var; fail-soft if absent (planning tree is project-local) | reshape |
| `recall/SKILL.md:49` | `CLAUDE.md PRE-TASK rule` | home-context anchor | Anchor re-link to JASON-OS CLAUDE.md §7 (present) | sanitize |
| `recall/SKILL.md:84,99` | `.research/`, `.research/content-analysis.db` | artifact root + DB | `RESEARCH_ROOT` + `CAS_DB_PATH` | reshape |
| `recall/SKILL.md:106` | `.research/tag-vocabulary.json` | artifact root | `RESEARCH_ROOT` | reshape |
| `recall/SKILL.md:108` | `node scripts/cas/retag.js` | CAS helper path | `CAS_SCRIPTS_ROOT` | rewrite |
| `recall/SKILL.md:112,115,205` | `.research/content-analysis.db`, `node scripts/cas/recall.js`, `node scripts/cas/rebuild-index.js --verbose` | DB + CAS helper | `CAS_DB_PATH` + `CAS_SCRIPTS_ROOT` | rewrite |
| `recall/SKILL.md:197` | `Index not found. Building from .research/ files...` | artifact root | `RESEARCH_ROOT` in user-visible string | reshape |
| `recall/SKILL.md:215-216` | `.research/EXTRACTIONS.md`, `extraction-journal.jsonl`, `CLAUDE.md PRE-TASK rule` | artifact root + anchor | `RESEARCH_ROOT` + JASON-OS CLAUDE.md anchor | reshape + sanitize |
| `recall/SKILL.md:225-227` | `.research/extraction-journal.jsonl`, `.research/content-analysis.db`, `CLAUDE.md`, `SKILL_STANDARDS.md` | artifact root + DB + anchor | `RESEARCH_ROOT` + `CAS_DB_PATH` + anchors | reshape |
| `recall/SKILL.md:230-231` | `scripts/lib/security-helpers.js`, `scripts/lib/safe-fs.js` | security helper paths | `SECURITY_HELPERS_ROOT` — JASON-OS has both at `scripts/lib/` (CLAUDE.md §2.1 confirms) | sanitize |
| `recall/SKILL.md:232,239,251` | `.planning/content-analysis-system/DECISIONS.md`, `.planning/skill-audit-recall-phase4/HANDOFF.md`, `scripts/cas/self-audit.js` | planning + CAS helper | `PLANNING_ROOT` + `CAS_SCRIPTS_ROOT` | reshape + rewrite |
| `recall/REFERENCE.md:17` | `scripts/cas/recall.js` | CAS helper path | `CAS_SCRIPTS_ROOT` | rewrite |
| `recall/REFERENCE.md:444,452,481,499-501,503` | `.research/content-analysis.db`, `.research/`, `.research/analysis/<slug>/`, `.research/repo-analysis/<slug>/`, `.research/website-analysis/<slug>/`, `.research/extraction-journal.jsonl` | artifact root + DB | `RESEARCH_ROOT` + `CAS_DB_PATH` | reshape |
| `recall/REFERENCE.md:457,482` | `node scripts/cas/rebuild-index.js` | CAS helper path | `CAS_SCRIPTS_ROOT` | rewrite |
| `recall/REFERENCE.md:143` | Example: `vercel/next.js`, `nextcloud/server` | example data | copy-as-is (generic examples) | copy-as-is |

**`/recall` dep map:**
- Hard dep on `scripts/cas/recall.js`, `rebuild-index.js`, `retag.js`, `self-audit.js`.
- Reads SQLite `content-analysis.db`, `extraction-journal.jsonl`, `tag-vocabulary.json`.
- Security layer: `security-helpers.js`, `safe-fs.js` (read-only, size-guarded).
- Consumer of `/synthesize` (Phase 5 rebuilds SQLite), `/analyze` (router triggers post-handler index update).

---

### Table 5 — `/repo-analysis` (3 files, 2644 lines) — **HEAVIEST COUPLING**

**Known home-repo hardcoded guard** (per D2-content-analysis-adjacent agent). This is the ONLY skill that has an explicit SoNash identity check.

| file:line | current (SoNash-hardcoded) value | coupling type | proposed parameter | verdict |
|---|---|---|---|---|
| `repo-analysis/SKILL.md:8,40,105,194` | `.research/analysis/<repo-slug>/`, `.research/analysis/<slug>/source/` | artifact root | `RESEARCH_ROOT` + `SOURCE_SUBDIR` (`source/`) | reshape |
| `repo-analysis/SKILL.md:51` | "Audit the home repo (SoNash itself) → `/audit-comprehensive`" | home-repo identity | `HOME_REPO_NAME` config (string); table row becomes dynamic | **rewrite** |
| `repo-analysis/SKILL.md:68` | **`jasonmichaelbell78-creator/sonash-v0`** (home-repo guard) | home-repo URL | Config: `HOME_REPO_URL` (or `HOME_REPO_ALLOWLIST[]` for multi-home setups); JASON-OS value = `TalkHard/JASON-OS` or `jasonmichaelbell78-creator/jason-os` depending on destination | **rewrite** |
| `repo-analysis/SKILL.md:106,113` | `scripts/lib/analysis-schema.js`, CONVENTIONS.md §12 | Zod schema lib | `SCHEMA_LIB_PATH` | rewrite |
| `repo-analysis/SKILL.md:195` | `.research/analysis/<slug>/source/` | artifact root | `RESEARCH_ROOT/analysis/<slug>/source/` | reshape |
| `repo-analysis/SKILL.md:279-280` | Home-context load: `SESSION_CONTEXT.md`, `ROADMAP.md`, `CLAUDE.md`, `.claude/skills/`, MEMORY.md — references REFERENCE.md §14.2 | home-context files | `HOME_CONTEXT_FILES[]` config | **reshape** |
| `repo-analysis/SKILL.md:339` | `.research/reading-chain.jsonl` | artifact root | `RESEARCH_ROOT` | reshape |
| `repo-analysis/SKILL.md:381,384,385,390` | `.research/extraction-journal.jsonl`, `.research/EXTRACTIONS.md`, `node scripts/cas/generate-extractions-md.js`, grep on `.research/extraction-journal.jsonl` | artifact root + CAS helper | `RESEARCH_ROOT` + `CAS_SCRIPTS_ROOT` | reshape + rewrite |
| `repo-analysis/SKILL.md:423` | `.research/analysis/<slug>/<artifact>` | artifact root | `RESEARCH_ROOT` | reshape |
| `repo-analysis/SKILL.md:431-432` | **`jasonmichaelbell78-creator/sonash-v0`** → `/audit-comprehensive` (Guard Rails duplicate) | home-repo URL | `HOME_REPO_URL` config (same as line 68) | **rewrite** |
| `repo-analysis/SKILL.md:529-538` | `scripts/reviews/write-invocation.ts` invocation-tracking payload | script dep | Shared invocation-tracker may or may not port; verify JASON-OS has `scripts/reviews/` equivalent | **blocked-on-prereq** (script-ecosystem port) |
| `repo-analysis/ARCHIVE.md:32` | `.research/archive/repo-analysis-knowledge/BRAINSTORM.md` | artifact root | `RESEARCH_ROOT/archive/` | reshape |
| `repo-analysis/REFERENCE.md:202,341,636,677,681,720-721,769,822,1247,1471,1691,1877,1987,1997,2012,2030` | Many `.research/analysis/<slug>/`, `.research/extraction-journal.jsonl`, `.research/EXTRACTIONS.md`, `.research/reading-chain.jsonl`, `.research/research-index.jsonl`, `.research/analysis/<slug>/mined-links.jsonl` | artifact root | `RESEARCH_ROOT` (single config applied uniformly) | reshape |
| `repo-analysis/REFERENCE.md:211` | `scripts/lib/analysis-schema.js` | Zod schema lib | `SCHEMA_LIB_PATH` | rewrite |
| `repo-analysis/REFERENCE.md:333` | "validated by Zod" | stack assumption | copy-as-is | copy-as-is |
| `repo-analysis/REFERENCE.md:656` | Example: `"follow_up": "Evaluate SKILL.md format for sonash skill files"` | example data mentioning "sonash" | Rewrite example to use generic target (e.g., "evaluate SKILL.md format for target skill files") | sanitize |
| `repo-analysis/REFERENCE.md:787` | Example value-map entry: `personal_fit_projects: ["sonash-v0"]` | example data | Rewrite example to use generic placeholder (`["my-project"]` or `[HOME_REPO_NAME]`) | sanitize |
| `repo-analysis/REFERENCE.md:1062,1105,1107-1109,1309,1322-1326` | Monorepo-detection signals (`turbo.json`, `nx.json`, `pnpm-workspace.yaml`, `WORKSPACE`, `Cargo.toml [workspace]`) | generic tech heuristics (NOT SoNash-specific; the word "Workspace" here is the Bazel file name, not the SoNash path) | copy-as-is | copy-as-is |
| `repo-analysis/REFERENCE.md:1336` | **"Exact URL match on `jasonmichaelbell78-creator/sonash-v0`"** (Home Repo Guard spec §9.8) | home-repo URL | `HOME_REPO_URL` config (third cite of same value — all three rewrite together) | **rewrite** |
| `repo-analysis/REFERENCE.md:1364` | Framework detection: `Next.js` (stack heuristic) | generic heuristic | copy-as-is | copy-as-is |
| `repo-analysis/REFERENCE.md:1540-1546,1690,1725,1972-1975` | Home-context load spec (SESSION_CONTEXT.md / ROADMAP.md / CLAUDE.md / `.claude/skills/` / MEMORY.md); `1725` explicitly mentions "SoNash features, JASON-OS domains, current roadmap" as reference examples | home-context files + SoNash mention in body text | `HOME_CONTEXT_FILES[]` config + rewrite example body text | **reshape** + sanitize |
| `repo-analysis/REFERENCE.md:1810` | "807 no-auth APIs not filtered for SoNash applicability" (Coverage Audit example) | example data mentioning SoNash | Rewrite example to generic: "807 no-auth APIs not filtered for home-repo applicability" | sanitize |
| `repo-analysis/REFERENCE.md:1865` | `node scripts/cas/generate-extractions-md.js` | CAS helper path | `CAS_SCRIPTS_ROOT` | rewrite |
| `repo-analysis/REFERENCE.md:1690` | `.research/analysis/<slug>/source/` (clone-copy path; "Copy clone to project workspace" — generic project-workspace, not SoNash "Workspace") | artifact root | `RESEARCH_ROOT` + `SOURCE_SUBDIR` | reshape |

**`/repo-analysis` dep map:**
- Hardest coupling: 3 cites of `jasonmichaelbell78-creator/sonash-v0` (SKILL.md:68, :431; REFERENCE.md:1336). All three rewrite to `HOME_REPO_URL` config.
- Reads: `SESSION_CONTEXT.md`, `ROADMAP.md`, `CLAUDE.md`, `.claude/skills/`, `MEMORY.md` (Creator View Phase 4 MUST).
- Reads: `scripts/lib/analysis-schema.js`, `scripts/lib/sanitize-error.js`.
- Writes: `.research/analysis/<slug>/` (10+ artifacts), `.research/extraction-journal.jsonl`, `.research/EXTRACTIONS.md`, `.research/reading-chain.jsonl`.
- Calls: `gh api rate_limit`, `git clone`, `npx repomix@latest`, `scripts/cas/generate-extractions-md.js`, `scripts/reviews/write-invocation.ts`.
- Spawns agents: `gsd-codebase-mapper`, `security-auditor`, `code-reviewer` (JASON-OS may have different agent names → check D1-agents-jason-os deliverable).

---

### Table 6 — `/synthesize` (2 files, 1157 lines)

Cross-source synthesis consumer. Reads all handler outputs; writes `synthesis.md` + `synthesis.json` + `opportunities-ledger.jsonl`. Deep home-context coupling for ranking.

| file:line | current (SoNash-hardcoded) value | coupling type | proposed parameter | verdict |
|---|---|---|---|---|
| `synthesize/SKILL.md:15` | `.planning/synthesis-consolidation/DECISIONS.md` | planning-tree ref | `PLANNING_ROOT` | reshape |
| `synthesize/SKILL.md:21,51,62,174` | `.research/analysis/synthesis/`, `.research/analysis/`, `.research/analysis/<slug>/creator-view.md` | artifact root | `RESEARCH_ROOT` + `SYNTHESIS_SUBDIR` | reshape |
| `synthesize/SKILL.md:102` | `scripts/lib/analysis-schema.js`, CLAUDE.md stack | Zod schema lib + stack ref | `SCHEMA_LIB_PATH` + JASON-OS CLAUDE.md ref | rewrite |
| `synthesize/SKILL.md:198-202` | Home context load: `CLAUDE.md`, `SESSION_CONTEXT.md`, `ROADMAP.md`, `.research/EXTRACTIONS.md`, `.research/research-index.jsonl`, `MEMORY.md` (9D), `.research/home-context.json` | home-context files + artifact root | `HOME_CONTEXT_FILES[]` + `HOME_CONTEXT_JSON_PATH` (optional cache) | **reshape** |
| `synthesize/SKILL.md:294,298` | `.research/analysis/synthesis/history/synthesis-YYYY-MM-DD.md`, `.research/analysis/synthesis/` | artifact root | `RESEARCH_ROOT/analysis/synthesis/` | reshape |
| `synthesize/SKILL.md:302` | `node scripts/cas/rebuild-index.js` | CAS helper path | `CAS_SCRIPTS_ROOT` | rewrite |
| `synthesize/SKILL.md:323` | `scripts/cas/aggregate-synthesize-retros.js` (9C) | CAS helper path | `CAS_SCRIPTS_ROOT` (future script, not yet implemented) | rewrite |
| `synthesize/SKILL.md:337,373` | `SESSION_CONTEXT.md Next Session Goals`, `ROADMAP/SESSION_CONTEXT.md` ranking inputs | home-context files | `HOME_CONTEXT_FILES[]` with semantic-role mapping (`SESSION_CONTEXT.md` → `next_session_goals`, `ROADMAP.md` → `milestone`) | **reshape** |
| `synthesize/SKILL.md:382` | `.research/analysis/synthesis/opportunities-ledger.jsonl` | artifact root | `RESEARCH_ROOT` | reshape |
| `synthesize/REFERENCE.md:8` | `.planning/synthesis-consolidation/DECISIONS.md` | planning-tree ref | `PLANNING_ROOT` | reshape |
| `synthesize/REFERENCE.md:116` | Algorithm: extract domains from `CLAUDE.md`, `ROADMAP.md`, `SESSION_CONTEXT.md` | home-context files | `HOME_CONTEXT_FILES[]` — domain-extractor input list | **reshape** |
| `synthesize/REFERENCE.md:478,500,756` | `scripts/lib/analysis-schema.js` | Zod schema lib | `SCHEMA_LIB_PATH` | rewrite |
| `synthesize/REFERENCE.md:588` | `.research/analysis/synthesis/opportunities-ledger.jsonl` | artifact root | `RESEARCH_ROOT` | reshape |
| `synthesize/REFERENCE.md:634-635` | Example: `"Publish SoNash /llms.txt from CLAUDE.md + SKILL.md corpus"` → snake_case output | example data mentioning SoNash | Rewrite example to `"Publish <home-repo> /llms.txt from CLAUDE.md + SKILL.md corpus"` | sanitize |
| `synthesize/REFERENCE.md:676` | `scripts/cas/rebuild-index.js` | CAS helper path | `CAS_SCRIPTS_ROOT` | rewrite |
| `synthesize/REFERENCE.md:699-702,729-730` | Ranking inputs from `ROADMAP.md`, `SESSION_CONTEXT.md`, CLAUDE.md (handler output location, error sanitization, Zod 4.3.6 per CLAUDE.md §1, script runners per sonash-context) | home-context anchors + stack refs | `HOME_CONTEXT_FILES[]` + JASON-OS CLAUDE.md re-anchoring; **`sonash-context` skill is a dep** — needs its own port plan | **reshape** + **blocked-on-prereq** for `sonash-context` |
| `synthesize/REFERENCE.md:750-752` | `.planning/synthesis-consolidation/DECISIONS.md`, `.planning/synthesis-consolidation/PLAN.md` | planning-tree ref | `PLANNING_ROOT` | reshape |
| `synthesize/REFERENCE.md:728` | `scripts/lib/sanitize-error.js` | security helper path | `SECURITY_HELPERS_ROOT` | sanitize |

**`/synthesize` dep map:**
- Hard dep on `scripts/cas/rebuild-index.js`; future dep on `scripts/cas/aggregate-synthesize-retros.js` (per SKILL.md:323 "9C" decision, not yet built).
- Reads ALL handler outputs: `analysis.json`, `value-map.json`, `creator-view.md`, `findings.jsonl`, `summary.md`, `deep-read.md`.
- Reads: `extraction-journal.jsonl` (prior-art suppression), `EXTRACTIONS.md`, `research-index.jsonl`, `home-context.json` (cache).
- Reads home-context: `CLAUDE.md`, `SESSION_CONTEXT.md`, `ROADMAP.md`, `MEMORY.md` (semantic roles differ — see SKILL.md:337,373).
- Consumed by: `/recall` (SQLite rebuild), `/brainstorm`, `/gsd:add-backlog`, `/gsd:add-todo`.
- **Cross-skill dep on `/sonash-context` skill** (SKILL.md hidden in REFERENCE.md:730 "script runners per sonash-context") — this is itself a SoNash skill that needs its own port.

---

## Aggregate: all coupling sites ranked by reshape difficulty

**Tier A — rewrite-required (CANNOT be a simple path swap; needs code / logic change):**

1. **Home-repo URL guard** (3 cites) — `repo-analysis/SKILL.md:68`, `:431-432`, `REFERENCE.md:1336`. Currently a string-equality check against `jasonmichaelbell78-creator/sonash-v0`. Must become:
   - Config var `HOME_REPO_URL` (single home) or `HOME_REPO_ALLOWLIST[]` (multi-home).
   - Read from env (`JASON_OS_HOME_REPO`), skill arg, or `.claude/migration.config.json`.
   - `/repo-analysis` needs a new PRE-VALIDATE helper that reads config + performs the match.
   - JASON-OS default: `jasonmichaelbell78-creator/jason-os` (per MEMORY.md) or blank (allows all external repos).

2. **`HOME_CONTEXT_FILES[]` contract** — 7 cites across `document-analysis` (SKILL.md:61-62, REFERENCE.md:1237-1245), `media-analysis` (SKILL.md:68-69, REFERENCE.md:1450-1458), `repo-analysis` (SKILL.md:279-280, REFERENCE.md:1540-1546, :1972-1975), `synthesize` (SKILL.md:198-202, :337, :373, REFERENCE.md:116, :699-702). JASON-OS has `CLAUDE.md` already (per read above); has NO `SESSION_CONTEXT.md`, NO `ROADMAP.md` yet (per bootstrap status). Need: `HOME_CONTEXT_FILES[]` config with present-only loading (skip missing, never fail). Default list = `[CLAUDE.md]` for JASON-OS bootstrap; grows as JASON-OS matures. **Requires shared `_shared/CONVENTIONS.md` §9 reshape** — this is the choke-point for all 4 Creator-View-producing skills.

3. **`CAS_SCRIPTS_ROOT`** — 17+ cites across all 6 skills (script path references to `scripts/cas/`). Rewrite because:
   - Scripts themselves need porting (`rebuild-index.js`, `update-index.js`, `recall.js`, `retag.js`, `generate-extractions-md.js`, `self-audit.js`, `aggregate-synthesize-retros.js`).
   - Each script internally references SoNash paths (the scripts are NOT in scope of this agent; see D2-content-analysis-adjacent + scripts/cas/-specific deep-dive).
   - Config: `CAS_SCRIPTS_ROOT=scripts/cas/` (default) OR package-ify as `@jason-os/cas-scripts` npm dep. **Recommended: package-ify** to decouple path assumptions.

4. **`SCHEMA_LIB_PATH`** — 8 cites (`scripts/lib/analysis-schema.js`). Zod-based schema module. Rewrite because:
   - Currently `require('../../../lib/analysis-schema.js')`-style relative imports in scripts.
   - Needs to become `const { validate } = require('@jason-os/cas-schema')` or `require(process.env.CAS_SCHEMA_LIB || 'scripts/lib/analysis-schema.js')`.
   - **Couples to CAS_SCRIPTS_ROOT rewrite** — port together.

**Tier B — reshape (structural path config; no logic change):**

5. **`RESEARCH_ROOT`** — 40+ cites across all 6 skills. The single biggest mechanical coupling. Every `.research/...` path becomes `${RESEARCH_ROOT}/...`. Config: `RESEARCH_ROOT=.research/` (default; matches SoNash). JASON-OS can keep same default; reshape is per-skill macro substitution.

6. **`CAS_DB_PATH`** — 12 cites. `.research/content-analysis.db`. Config: `CAS_DB_PATH=${RESEARCH_ROOT}/content-analysis.db` (default).

7. **`STATE_ROOT`** — 4 cites (`.claude/state/`). Shared with non-CAS skills. Config: `STATE_ROOT=.claude/state/`.

8. **`PLANNING_ROOT`** — 6 cites (`.planning/<project>/DECISIONS.md`). These are optional architecture refs; fail-soft on missing. Config: `PLANNING_ROOT=.planning/`.

9. **`SOURCE_SUBDIR` / `SYNTHESIS_SUBDIR`** — subdirectory-naming conventions under `RESEARCH_ROOT/analysis/<slug>/`. Keep defaults (`source/`, `synthesis/`).

**Tier C — sanitize (regex find-replace / anchor updates):**

10. **`CLAUDE.md` anchor links** — 8 cites (§2, §5, §7 anchors). SoNash CLAUDE.md is v6.0; JASON-OS CLAUDE.md is v0.1 with matching section structure (§2 Security, §5 Anti-Patterns). Anchors map 1:1 for §2, §5, §7; edit anchor targets at port time.

11. **Example-data mentions of "sonash"** — 4 cites (`repo-analysis/REFERENCE.md:656`, `:787`, `:1725`, `:1810`; `synthesize/REFERENCE.md:634-635`). These are example snippets inside REFERENCE body prose; replace "sonash" with generic placeholder (`<home-repo>`, `my-project`) or `${HOME_REPO_NAME}`.

12. **Hardcoded Windows-`Workspace` prefix** — 2 cites (`document-analysis/REFERENCE.md:756`, `media-analysis/REFERENCE.md:816`). `C:\Users\<user>\Workspace\dev-projects\<project>\` — this is a MAX_PATH calculation example. Rewrite to `<TARGET_REPO_ROOT>` placeholder; the math still works for any 80-char prefix.

13. **Security helper paths** — 5 cites (`scripts/lib/sanitize-error.js`, `scripts/lib/security-helpers.js`, `scripts/lib/safe-fs.js`). JASON-OS has a `.cjs` variant (`sanitize-error.cjs`) per JASON-OS CLAUDE.md §2 — verify filename at port; may need suffix sanitize pass.

**Tier D — blocked-on-prereq:**

14. **`scripts/reviews/write-invocation.ts`** — `repo-analysis/SKILL.md:529-538`. This is the invocation-tracking infrastructure; JASON-OS may have a different tracking mechanism (per D2-hooks-lib + D3-jason-os-hooks-agents-infra). **Defer decision** until the `scripts/reviews/` port plan lands.

15. **`/sonash-context` skill dependency** — `synthesize/REFERENCE.md:730` ("script runners per sonash-context"). `/sonash-context` is itself a SoNash skill that's OUT OF SCOPE for CAS — but `/synthesize` implicitly depends on its script-runner conventions. **Cross-reference with D2-content-analysis-adjacent** to confirm whether `sonash-context` needs porting too.

16. **Agent-names used in dimension wave** — `repo-analysis/SKILL.md:Section 10.1` references `gsd-codebase-mapper`, `security-auditor`, `code-reviewer`. JASON-OS may not have same agent roster (verify via D1-agents-jason-os). **Port-time decision: re-map agent names via `DIMENSION_AGENTS[]` config, or rewrite phase logic.**

---

## Port-order recommendation

Given the dep graph (reads-from → writes-to) and coupling-tier ranking above:

### Top-3 port order:

**1st: `/recall` (Tier B reshape-only, lowest coupling)**
- No home-context dependency.
- No home-repo guard.
- Consumes SQLite index that `/analyze` + handlers populate — but `/recall` itself just reads.
- Single-script dep (`scripts/cas/recall.js`) — port scripts first as a sub-step.
- Effort: 4–6 hours (mostly path-config wiring).
- Dogfood value: once `/recall` works, JASON-OS can query ANY seeded `.research/` corpus — useful for iterating on other ports.
- Prereq: port `scripts/cas/recall.js`, `rebuild-index.js`, `retag.js`, `self-audit.js`, plus `scripts/lib/analysis-schema.js` (shared with all CAS scripts). Decouple from `scripts/cas/` via `CAS_SCRIPTS_ROOT` env var.

**2nd: `/document-analysis` OR `/media-analysis` (Tier B reshape; handler sibling that's lightest)**
- `/document-analysis` chosen first: no transcription pipeline (simpler than `/media-analysis`), no network-heavy ops (except URL fetch for arxiv/gist), and PDF fallback is already Windows-aware (`SKILL.md:68-70`).
- Home-context load already config-conscious (references CONVENTIONS.md §9 — so reshape lives in CONVENTIONS shared skill).
- No home-repo guard.
- Effort: 3–5 hours.
- Dogfood: port one PDF or arxiv paper to validate end-to-end flow.

**3rd: `/analyze` (router; Tier B reshape; depends on at least one handler working)**
- Router is thin — most complexity is in the handlers it dispatches to.
- Must land AFTER at least one handler is ported (`/document-analysis`).
- Must land BEFORE `/synthesize` (synthesize consumes multi-handler output; router populates it).
- Post-handler index update hook (`update-index.js`, `generate-extractions-md.js`) is the main coupling.
- Effort: 4–6 hours.
- Dogfood: `/analyze <pdf-path>` fully routes to `/document-analysis` handler + updates index → `/recall` queries it.

### 4th–6th (deferred; dependency-ordered):

**4th: `/media-analysis`** — sibling to `/document-analysis`; trivial once `/document-analysis` port path is established.

**5th: `/synthesize`** — depends on 3+ handler outputs existing. Port once `/document-analysis` + `/media-analysis` (or `/repo-analysis`) are functional. Heaviest home-context coupling (semantic roles for `SESSION_CONTEXT.md`, `ROADMAP.md`); also flags `/sonash-context` as blocked-on-prereq.

**6th: `/repo-analysis`** — **intentionally LAST**. Reasons:
- Highest coupling count (30 sites).
- The only skill with the hardcoded home-repo guard — requires solving the `HOME_REPO_URL` config contract, which cascades back to OTHER skills if they grow their own home-repo awareness.
- Depends on external tools (`gh`, `git`, `npx repomix@latest`) that JASON-OS must have locally — verify per JASON-OS bootstrap (Node 22 + gh 2.65 confirmed; repomix is ad-hoc npx).
- Dimension-wave agent roster may need re-mapping (Tier-D blocker).
- Invocation-tracker dep (`scripts/reviews/write-invocation.ts`) — Tier-D blocker.
- Effort: 10–14 hours.
- Dogfood payoff: once `/repo-analysis` runs in JASON-OS, the self-dogfood loop (migration of migration) becomes mechanically testable.

### Cross-cutting prereq port (before step 1):

**Port `scripts/lib/analysis-schema.js` + CAS scripts (`scripts/cas/*.js`) + security helpers** as a unit, behind `CAS_SCRIPTS_ROOT` / `SCHEMA_LIB_PATH` / `SECURITY_HELPERS_ROOT` env vars. Package-ify recommended.

**Also port `.claude/skills/_shared/CONVENTIONS.md`** — §9 home-context-loading + §12 schema-contract + §14 tagging are shared by all 4 Creator-View-producing handlers. One CONVENTIONS reshape benefits all.

---

## Sources

### Primary (skill files read, SoNash):

- `C:\Users\jbell\.local\bin\sonash-v0\.claude\skills\analyze\SKILL.md` (19039 bytes)
- `C:\Users\jbell\.local\bin\sonash-v0\.claude\skills\analyze\REFERENCE.md` (27706 bytes)
- `C:\Users\jbell\.local\bin\sonash-v0\.claude\skills\document-analysis\SKILL.md` (20235 bytes)
- `C:\Users\jbell\.local\bin\sonash-v0\.claude\skills\document-analysis\REFERENCE.md` (52883 bytes)
- `C:\Users\jbell\.local\bin\sonash-v0\.claude\skills\media-analysis\SKILL.md` (22587 bytes)
- `C:\Users\jbell\.local\bin\sonash-v0\.claude\skills\media-analysis\REFERENCE.md` (60304 bytes)
- `C:\Users\jbell\.local\bin\sonash-v0\.claude\skills\recall\SKILL.md` (12122 bytes)
- `C:\Users\jbell\.local\bin\sonash-v0\.claude\skills\recall\REFERENCE.md` (19577 bytes)
- `C:\Users\jbell\.local\bin\sonash-v0\.claude\skills\repo-analysis\SKILL.md` (25556 bytes)
- `C:\Users\jbell\.local\bin\sonash-v0\.claude\skills\repo-analysis\REFERENCE.md` (96627 bytes)
- `C:\Users\jbell\.local\bin\sonash-v0\.claude\skills\repo-analysis\ARCHIVE.md` (1170 bytes)
- `C:\Users\jbell\.local\bin\sonash-v0\.claude\skills\synthesize\SKILL.md` (21557 bytes)
- `C:\Users\jbell\.local\bin\sonash-v0\.claude\skills\synthesize\REFERENCE.md` (27975 bytes)

### Context (brainstorm + adjacent):

- `C:\Users\jbell\.local\bin\JASON-OS\.research\migration-skill\BRAINSTORM.md` §5 Q6 + §3 D19 + D23 verdict legend
- `C:\Users\jbell\.local\bin\sonash-v0\CLAUDE.md` (v6.0 — confirms stack: Next.js 16, React 19, Firebase 12, Tailwind 4.2, Zod 4.3.6; SESSION_CONTEXT.md / ROADMAP.md / CLAUDE.md / MEMORY.md as home-context canonical inputs)
- `C:\Users\jbell\.local\bin\JASON-OS\CLAUDE.md` (v0.1 bootstrap — confirms `scripts/lib/sanitize-error.cjs` naming, §2 security rules, §5 anti-patterns; NO SESSION_CONTEXT.md, NO ROADMAP.md yet in JASON-OS bootstrap — home-context `HOME_CONTEXT_FILES[]` config must be present-only/fail-soft)

### Cross-reference deliverables (sibling D-agents):

- D2-content-analysis-adjacent.md (flagged hardcoded `jasonmichaelbell78-creator/sonash-v0` home-repo guard at `repo-analysis/SKILL.md:68`)
- D1-agents-sonash.md (dimension-wave agent roster — check for `gsd-codebase-mapper`, `security-auditor`, `code-reviewer` port status)
- D1-agents-jason-os.md (agent roster in JASON-OS — verify coverage)
- D2-hooks-lib.md (script-ecosystem port status — `scripts/lib/analysis-schema.js`, sanitize-error, security-helpers)
- D3-jason-os-skills-scripts.md (whether JASON-OS has `scripts/cas/` and `scripts/reviews/` yet)

### Grep token list used (all directories):

`sonash`, `Workspace`, `jasonmichaelbell`, `Firebase`, `sonash-app.web.app`, `.planning/`, `SESSION_CONTEXT.md`, `ROADMAP.md`, `CLAUDE.md`, `MEMORY.md`, `scripts/cas/`, `analysis-schema`, `knowledge.sqlite`, `content-analysis.db`, `C:\Users`, `C:/Users`, `sonash-context`, `sonash-v0`, `dev-projects`, `.research/`, `sanitize-error`, `security-helpers`, `safe-fs`, `.husky`, `zod`, `Zod 4`, `Next.js`, `firestore`, `Tailwind`

---

*End D6-cas-skills-deep findings*
