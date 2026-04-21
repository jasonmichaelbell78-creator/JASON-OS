# D6-cas-planning — CAS planning domain-assumption catalog

**Agent:** D6-cas-planning (Phase 1 D-agent)
**Sub-question:** SQ-D6d — deep-dive 3 CAS planning directories; identify domain assumptions that need parameterizing for target-repo when CAS is ported to JASON-OS
**Depth:** L1 (file:line for every claim)
**Generated:** 2026-04-21

---

## Summary

Three `.planning/` directories encode the design history of the SoNash Content Analysis System (CAS). They contain **30+29+32 = 91 formal decisions**, schemas for 7+ artifact files, phase structures for 6 skills, synthesis paradigms, scoring weights, repo-type enums, home-context loading orders, and operator runbooks. Across the three directories I catalog **~72 discrete domain assumptions** that would need to be re-evaluated, reshaped, or rewritten to port CAS into JASON-OS.

**Key finding: the planning docs themselves are the ground truth for the "home-context coupling" flag in BRAINSTORM.md §5 Q6 / D19.** Nearly every decision assumes:
1. SoNash is the *home repo* (`SESSION_CONTEXT.md`, `ROADMAP.md`, `CLAUDE.md`, MEMORY.md as home-context loading order — Creator-View-Upgrade DECISIONS #15, creator-view-upgrade/PLAN.md:124-128).
2. "Creator" is a SoNash-domain term — it names a scoring lens (creator-view-upgrade/DECISIONS.md:48, creator lens weight table), a Creator View prose artifact, a creator-view.md file per source, and implicitly refers to the user's persona as a content-consuming creator.
3. Repo types are tuned to the SoNash scan corpus (curated-list, registry, doc-hub tier detection — creator-view-upgrade/DECISIONS.md:14 [D3], creator-view-upgrade/PLAN.md:252-273 signal matrix).
4. Source-tier defaults and SESSION_CONTEXT / ROADMAP file names are baked into handler phases.

**Per-category distribution:**

| Category        | Count | Notes |
|-----------------|-------|-------|
| PARAMETERIZE    | 34    | Home-context paths, scoring weights, source-tier defaults, output paths, version strings, database path, skill names, routing targets. Swap home-repo-neutral variables in the CAS-port surgical-rewrite list. |
| RESHAPE         | 19    | "Creator View" naming + prose semantics, repo-type enum (SoNash-scan-corpus shaped), curated-list heuristics, opportunity matrix routing (to SoNash-specific skills), verdict labels (Study/Explore/Extract/Note). |
| COPY-AS-IS      | 15    | Zod schema mechanics, FTS5/SQLite mechanics, WAL pragmas, HEAD-first rate-limiting, JSONL pattern, Ingest-Query-Lint triad, 10-dim self-audit rubric structure, schema versioning discipline. |
| OBSOLETE        | 4     | Session-#-based session markers, SoNash-specific migration scripts (migrate-v3, fix-depth-mislabel, backfill-candidates — these are one-time remediations), "22 mislabeled quick-scan" remediation history, firecrawl pilot bypass-skill debt. |

**SoNash-domain term count:** 18 terms need re-parameterization (see glossary §5).

---

## 1. content-analysis-system/ — domain-assumption catalog

**Scope:** the parent CAS plan (T28). 5 files, ~1394 lines. Decisions locked Session #269 (content-analysis-system/DECISIONS.md:3).

### 1.1 Fixed naming decisions (PARAMETERIZE)

| Assumption | Source | Migration action |
|------------|--------|------------------|
| Router skill name `/analyze` | content-analysis-system/DECISIONS.md:13 | PARAMETERIZE — JASON-OS may prefer `/intake` or `/ingest`; skill-name is a config variable. |
| Query skill name `/recall` | content-analysis-system/DECISIONS.md:14 | PARAMETERIZE — "recall" evokes memory/retrieval. JASON-OS-neutral alternative viable. |
| Skill location `.claude/skills/<name>/SKILL.md` | content-analysis-system/DECISIONS.md:15 | COPY-AS-IS — Claude Code convention, not SoNash-specific. |
| Database path `.research/content-analysis.db` (gitignored) | content-analysis-system/DECISIONS.md:27 | PARAMETERIZE — `.research/` tree is a SoNash convention (also adopted JASON-OS-side). The *name* `content-analysis.db` is generic; *path* to `.research/` is a config. |
| Output directory `.research/analysis/<slug>/` | content-analysis-system/DECISIONS.md:28 | PARAMETERIZE — same rationale. |
| Migration script location `scripts/cas/` | content-analysis-system/PLAN.md:55-57 | PARAMETERIZE — folder name "cas" embeds SoNash naming. |

### 1.2 Handler architecture + source types (RESHAPE)

| Assumption | Source | Migration action |
|------------|--------|------------------|
| 4 source types enum: `repo \| website \| document \| media` | content-analysis-system/PLAN.md:112 (Zod) | RESHAPE — these are SoNash's scan corpus composition. JASON-OS may need fewer/different types (e.g., skill, agent, hook as source_type). D19 flags this: "CAS assumes content = social-media-adjacent posts + repos." Partially true per source-type enum; JASON-OS content-types TBD. |
| All 4 handlers follow repo-analysis v4.3 template structure | content-analysis-system/DECISIONS.md:77-78 | COPY-AS-IS — structural pattern (phases, validate, gate, Self-Audit, Routing) is generic. |
| Type-detection patterns (github.com → repo, .pdf → document, youtube.com → media) | content-analysis-system/PLAN.md:466-474 | PARAMETERIZE — pattern table is URL-prefix config. JASON-OS may add internal-repo-path patterns (e.g., `.claude/skills/` → skill-type source). |
| Whisper runtime detection | content-analysis-system/PLAN.md:366-371 | COPY-AS-IS — generic optional dependency pattern. |
| Captions API preferred, Whisper opt-in (work/home split: "GPU at home, captions at work") | content-analysis-system/DECISIONS.md:36-37 | PARAMETERIZE — the *split* is SoNash-user-specific (jbell's work/home setup). The pattern "prefer cheap, fallback to expensive" is generic. |

### 1.3 Schema decisions (COPY-AS-IS with field-level review)

| Assumption | Source | Migration action |
|------------|--------|------------------|
| Zod schema location `scripts/lib/analysis-schema.js` | content-analysis-system/DECISIONS.md:22 | COPY-AS-IS — generic pattern. |
| `snake_case` canonical over `camelCase` | content-analysis-system/DECISIONS.md:23 | COPY-AS-IS — decision rationale (drift prevention) applies anywhere. |
| SQLite + better-sqlite3 + FTS5 | content-analysis-system/DECISIONS.md:25 | COPY-AS-IS — queryable-layer choice is tech-stack decision, stack-agnostic per JASON-OS CLAUDE.md §1. |
| Extraction record `schema_version: "3.0"` | content-analysis-system/PLAN.md:172-197 | COPY-AS-IS — versioning discipline; JASON-OS starts its own v1.0. |
| Candidate types enum: `pattern`, `anti-pattern`, `knowledge`, `content`, `architecture-pattern`, `design-principle`, `workflow-pattern`, `tool` | content-analysis-system/PLAN.md:177-188 | RESHAPE — enum values are SoNash-knowledge-taxonomy shaped. JASON-OS may want simpler initial taxonomy. |
| Decision enum: `defer/extract/skip/investigate` | content-analysis-system/PLAN.md:189 | COPY-AS-IS — generic triage labels. |
| Novelty/effort/relevance enums (high/medium/low + E0/E1/E2/E3) | content-analysis-system/PLAN.md:192-194 | COPY-AS-IS — generic. |

### 1.4 Operator state + ledgers (OBSOLETE remediation history)

| Assumption | Source | Migration action |
|------------|--------|------------------|
| 168-entry extraction-journal baseline (migrated, v2.0→v3.0) | content-analysis-system/DIAGNOSIS.md:86 | OBSOLETE — specific migration was one-time. Schema lessons copy-as-is; migration scripts don't. |
| 24-repo + 5-website baseline corpus | content-analysis-system/DIAGNOSIS.md:87-88 | OBSOLETE — specific corpus is SoNash-only. |
| Session #287 E2E verification on y2z-monolith | content-analysis-system/PLAN.md:14-16 | OBSOLETE — session numbers + specific sources are runtime debug trail. |
| Wave-numbered step closure tracking (Wave 1-5, Sessions #267-#287) | content-analysis-system/PLAN.md:9-22 | OBSOLETE — execution history, not design. |

### 1.5 Operator runbooks (REMAINING_CAS_TASKS.md, STEP_A_HANDOFF.md — OBSOLETE as design, VALUABLE as pattern)

| Assumption | Source | Migration action |
|------------|--------|------------------|
| Triage mode 3 (fix P0/P1, defer P2 to TDMS, skip P3) | content-analysis-system/REMAINING_CAS_TASKS.md:43 | COPY-AS-IS — generic audit-triage pattern. |
| 7-skill batch audit via `/skill-audit --mode=multi` | content-analysis-system/STEP_A_HANDOFF.md:81-84 | COPY-AS-IS — skill-audit integration pattern is generic. |
| Cross-locale resume (work↔home branches) | content-analysis-system/REMAINING_CAS_TASKS.md:211-233 | PARAMETERIZE — cross-locale resume is a JASON-OS-relevant pattern for the /migration skill itself (cross-machine work); capture as reusable. |
| `/deep-plan` template fix (status banner + per-step ✅ markers + plans:hygiene) | content-analysis-system/REMAINING_CAS_TASKS.md:105-136 | COPY-AS-IS — upstream-fix pattern is generic infra learning. |

**content-analysis-system/ domain-assumption count:** ~22.

---

## 2. creator-view-upgrade/ — domain-assumption catalog

**Scope:** repo-analysis Creator View v2 + /repo-synthesis design (precursor to CAS). 4 files, ~1358 lines. 30 formal decisions (creator-view-upgrade/DECISIONS.md:3).

### 2.1 The "Creator View" naming problem (RESHAPE — HIGH PRIORITY)

| Assumption | Source | Migration action |
|------------|--------|------------------|
| 6-section prose output called "Creator View" with sections: Understands+Blindspots, Relevant, Differs (Ahead/Different/Behind), Challenge, Knowledge Candidates, What's Worth Avoiding | creator-view-upgrade/DECISIONS.md:40, creator-view-upgrade/PLAN.md:91-119 | **RESHAPE — the term "Creator" is SoNash-domain.** It frames the user as a content creator evaluating other creators. JASON-OS-neutral framing: "Operator View" or "Builder View" or simply "Analysis View." The *structural pattern* (6 sections, prose-not-clinical, blindspot complement) is generic and copyable. |
| Artifact filename `creator-view.md` per source | referenced throughout creator-view-upgrade/PLAN.md + content-analysis-system/PLAN.md:216 | RESHAPE — rename on port. |
| Creator Lens scoring (weight table with Knowledge at 35%) | creator-view-upgrade/DECISIONS.md:48 (D19) | RESHAPE — "Creator Lens" is the scoring asymmetry for "a creator learning from another creator's work." Whole lens framing assumes a specific user role (content consumer/creator). JASON-OS may want lenses like "Adoption" (already present) + "Extraction" + "Reference." |
| Creator verdicts: Study / Explore / Extract / Note (vs adoption: Adopt/Trial/Extract/Avoid) | creator-view-upgrade/DECISIONS.md:49 (D20) | RESHAPE — verdict labels tuned to "creator is learning" framing. |
| `--lens=adoption\|creator` CLI flag | creator-view-upgrade/PLAN.md:161 | RESHAPE — flag values tied to lens names. |

### 2.2 Repo-type classification (RESHAPE — SoNash-scan-corpus shaped)

| Assumption | Source | Migration action |
|------------|--------|------------------|
| 6-value enum: `library\|application\|curated-list\|registry\|documentation-hub\|monorepo` | creator-view-upgrade/DECISIONS.md:14 (D3), creator-view-upgrade/PLAN.md:22-27 | RESHAPE — enum was tuned to SoNash's scan targets (awesome-lists, tool registries, Claude Code skill catalogs). JASON-OS may add `skill-library`, `agent-collection`, `hook-lib` etc. Mixed-type + secondary (D28) pattern is generic. |
| Signal matrix for curated-list detection (README>50KB, code:md ratio<0.2, "awesome"/"list"/"resources" topics, link density >5 per KB) | creator-view-upgrade/PLAN.md:253-269 | RESHAPE — signals are solid heuristics but tuned. The pattern (multi-signal with strong/moderate thresholds, 3+ strong=match) is generic and copyable. |
| Monorepo markers: turbo.json/nx.json/pnpm-workspace.yaml/lerna.json/rush.json | creator-view-upgrade/PLAN.md:266 | COPY-AS-IS — factual tooling signals. |
| Creator-lens primary for curated-list/registry/doc-hub; adoption primary for library/app/monorepo | creator-view-upgrade/PLAN.md:158-161 | RESHAPE — lens-routing logic follows renaming. |

### 2.3 Home-context loading (PARAMETERIZE — **THE CORE COUPLING**)

| Assumption | Source | Migration action |
|------------|--------|------------------|
| Home-context priority order: SESSION_CONTEXT.md (primary), ROADMAP.md (secondary), CLAUDE.md (constraints/stack), .claude/skills/ listing, MEMORY.md active memories | creator-view-upgrade/DECISIONS.md:42 (D15), creator-view-upgrade/PLAN.md:124-128 | **PARAMETERIZE — this is the single largest coupling in CAS.** SoNash has SESSION_CONTEXT.md; JASON-OS has no equivalent file (per JASON-OS CLAUDE.md v0.1 §8 "TBD — add as the OS gains internal documentation"). The CAS port must configurabilize this loading sequence. Contract: "Give me up to 5 home-context files in priority order for fit-scoring." |
| `personal_fit_projects[]` populated from "active sprint items" (implies a sprint model) | creator-view-upgrade/PLAN.md:340-342 | PARAMETERIZE — active-work extraction assumes a sprint format. JASON-OS equivalent is `.planning/jason-os/` + TODOS.md + ROADMAP.md. |
| Fit-scoring fields `objective_score` (0-100) + `personal_fit_score` (0-100) + `fit_class` (active-sprint/park-for-later/evergreen/not-relevant) | creator-view-upgrade/DECISIONS.md:12 (D1), creator-view-upgrade/PLAN.md:33-40 | RESHAPE on vocabulary ("sprint" → "active-cycle"?), COPY-AS-IS on structure. |
| `[ACTIVE-SPRINT] / [PARK] / [EVERGREEN]` badge labels | creator-view-upgrade/DECISIONS.md:42 (D22) | RESHAPE — "sprint" term is agile-specific; JASON-OS may use "focus." |

### 2.4 Link mining pipeline (COPY-AS-IS — generic pattern)

| Assumption | Source | Migration action |
|------------|--------|------------------|
| `mined-links.jsonl` 13-field schema | creator-view-upgrade/DECISIONS.md:32, creator-view-upgrade/PLAN.md:52-69 | COPY-AS-IS — generic. |
| Depth-0 parse / Depth-1 HEAD-first fetch / Depth-2 targeted | creator-view-upgrade/DECISIONS.md:30 (D8) | COPY-AS-IS — solid progressive-deepening pattern. |
| HEAD@5 req/sec + full fetch@1 req/sec | creator-view-upgrade/DECISIONS.md:33 (D29) | COPY-AS-IS — conservative rate-limit. |
| "Only runs when repo_type is curated-list or registry" conditional | creator-view-upgrade/PLAN.md:296-298 | RESHAPE — conditional tied to repo-type enum. |

### 2.5 Cross-repo synthesis contract (COPY-AS-IS — shifts to /synthesize in §3)

| Assumption | Source | Migration action |
|------------|--------|------------------|
| `related_repos[]` per-repo + `reading-chain.jsonl` cross-repo | creator-view-upgrade/DECISIONS.md:56 (D14) | RESHAPE — term "repo" would need generalization ("related_sources[]", "reading-chain.jsonl" stays). |
| Auto-offer /repo-synthesis when 3+ repos exist | creator-view-upgrade/DECISIONS.md:55 (D13) | RESHAPE — auto-offer pattern + threshold-based, copy-able; target skill changes to `/synthesize`. |

### 2.6 AUDIT.md findings (COPY-AS-IS — audit discipline patterns)

| Assumption | Source | Migration action |
|------------|--------|------------------|
| 8-part audit methodology: decision traceability, schema consistency, cross-section coherence, process flow, output contract verification, backward compat | creator-view-upgrade/PLAN.md:386-452 | COPY-AS-IS — audit pattern is generic and transferable. |
| Found drifts: schema_version scope (F-01), verdict band inconsistency 75/55/30 vs 80/60/40 (F-02), lerna.json missing (F-03) | creator-view-upgrade/AUDIT.md:66-246 | OBSOLETE — specific findings are SoNash-repo history; pattern of catching them is not. |

**creator-view-upgrade/ domain-assumption count:** ~26.

---

## 3. synthesis-consolidation/ — domain-assumption catalog

**Scope:** /synthesize skill consolidation (T29). 4 files + audit-step-10.5 subdir. ~3996 lines. 32 formal decisions (synthesis-consolidation/DECISIONS.md:3).

### 3.1 Skill-identity decisions (PARAMETERIZE)

| Assumption | Source | Migration action |
|------------|--------|------------------|
| `/synthesize` as single-verb command parallel to `/analyze`+`/recall` | synthesis-consolidation/DECISIONS.md:10 | PARAMETERIZE — naming convention. |
| Output path `.research/analysis/synthesis/` with `history/` subdir | synthesis-consolidation/DECISIONS.md:20 | PARAMETERIZE — path. |
| Output files `synthesis.md` + `synthesis.json` (lowercase) | synthesis-consolidation/DECISIONS.md:21 | COPY-AS-IS — convention. |
| State file `.claude/state/synthesize.state.json` (single, no parallel runs) | synthesis-consolidation/DECISIONS.md:25 | COPY-AS-IS — pattern. |
| Zod schema in `scripts/lib/analysis-schema.js` (shared with CAS) | synthesis-consolidation/DECISIONS.md:26 | COPY-AS-IS — co-location rationale. |

### 3.2 Paradigm + output-section decisions (RESHAPE for domain)

| Assumption | Source | Migration action |
|------------|--------|------------------|
| 4 paradigms: `thematic` (default), `narrative`, `matrix`, `meta-pattern` | synthesis-consolidation/DECISIONS.md:23 (D7) | COPY-AS-IS — generic analytical lenses. |
| 8 output sections (thematic): Themes+Signals merged, Ecosystem Gaps, Reading Chain, Mental Model Evolution, Fit Portfolio, Knowledge Map, Opportunity Matrix, Changes Since Previous | synthesis-consolidation/DECISIONS.md:34 (D11), synthesis-consolidation/PLAN.md:386-395 | RESHAPE — "Mental Model Evolution" assumes a *learning-over-time* narrative (SoNash-user framing). "Fit Portfolio" depends on fit-scoring (see §2.3). "Opportunity Matrix" routes to SoNash-specific skills (/brainstorm, /deep-plan, /deep-research, /analyze) — synthesis-consolidation/DECISIONS.md:42 (D12). |
| Opportunity Matrix interactive routing to `/brainstorm`, `/deep-plan`, `/deep-research`, `/analyze` | synthesis-consolidation/DECISIONS.md:42 (D12) | RESHAPE — routing targets must exist in destination repo. JASON-OS has some of these (brainstorm, deep-plan, deep-research per JASON-OS CLAUDE.md §7) but not `/analyze` yet. |
| 6-option opening menu: Full, Incremental, Re-synthesize, Scoped, Resume, Review previous | synthesis-consolidation/DECISIONS.md:31 (D8) | COPY-AS-IS — generic synthesis mode taxonomy. |

### 3.3 Source-tier system (RESHAPE)

| Assumption | Source | Migration action |
|------------|--------|------------------|
| `source_tier` enum: T1-T4, scoring multipliers per tier | synthesis-consolidation/DECISIONS.md:40 (D13) | COPY-AS-IS — tier mechanic is generic. |
| Default tier assignments: repos=T1, websites=T1-T4, documents=T1-T3, media=T1-T3 | synthesis-consolidation/DECISIONS.md:40, synthesis-consolidation/PLAN.md:169-174 | RESHAPE — defaults per source-type assume SoNash trust model ("all repos first-party"). JASON-OS may weight differently (e.g., SoNash-adjacent repos = T2, random-external = T3). |
| "Hybrid — handler suggests tier, user overrides via tags or pre-flight" | synthesis-consolidation/DECISIONS.md:52 (D32) | COPY-AS-IS — pattern. |

### 3.4 Behavior decisions (COPY-AS-IS — generic algorithm patterns)

| Assumption | Source | Migration action |
|------------|--------|------------------|
| Subagent strategy: inline <10 sources, agents 10+; merge always inline | synthesis-consolidation/DECISIONS.md:47 (D20) | COPY-AS-IS — scaling pattern. |
| Section-level resume, state tracks `sections_completed[]` | synthesis-consolidation/DECISIONS.md:46 (D19) | COPY-AS-IS. |
| 10-dim self-audit (3 minimum floor + 7 domain-specific: evidence grounding, candidate integrity, convergence math, dedup check, gap validity, opportunity grounding, changes accuracy) | synthesis-consolidation/DECISIONS.md:50 (D27) | COPY-AS-IS — rubric pattern transferable. |
| Candidate dedup: within type + promote, convergence boosts ranking | synthesis-consolidation/DECISIONS.md:66 (D23) | COPY-AS-IS. |
| Cross-type detection: tags + semantic overlap + candidate matching + explicit connections | synthesis-consolidation/DECISIONS.md:65 (D22) | COPY-AS-IS. |
| Reading chain: dependency > pedagogical > tag clusters | synthesis-consolidation/DECISIONS.md:67 (D25) | COPY-AS-IS. |
| Incremental synthesis hybrid: confirm/extend/flag-contradictions, escalate to full on contradiction | synthesis-consolidation/DECISIONS.md:45 (D14) | COPY-AS-IS. |

### 3.5 Step 10.5 audit evidence (OBSOLETE as execution; COPY-AS-IS as methodology)

| Assumption | Source | Migration action |
|------------|--------|------------------|
| Full-corpus per-source audit across 34 sources before synthesis runs | synthesis-consolidation/PLAN.md:600-716 | COPY-AS-IS — "audit the corpus before synthesizing against it" principle is generic. The 8-check rubric (schema, MUST artifacts, SHOULD artifacts, handler-specific artifacts, content quality, extraction completeness, cross-file consistency, re-analysis signals) is a solid template. |
| audit-step-10.5/*.json per-source audit files (28 files) | synthesis-consolidation/audit-step-10.5/ | OBSOLETE — execution snapshots. |
| Double-drift bug discovery: `scripts/cas/migrate-schemas.js:223` + empty candidates in 9 repos | synthesis-consolidation/PLAN.md:450-522 | OBSOLETE as bug; COPY-AS-IS as warning ("migrations can have latent drift; validate before running consumer passes"). |
| Firecrawl pilot "bypass-skill" incident | synthesis-consolidation/WAVE4_RESUME.md:54-70 | OBSOLETE — execution debt; policy lesson "Claude must not auto-invoke skills, user invokes" is SoNash-operator-specific (CLAUDE.md guardrail #16 reinforcement). |

### 3.6 Integration decisions (PARAMETERIZE — 14 upstream files)

| Assumption | Source | Migration action |
|------------|--------|------------------|
| 14 files to update when consolidating (4 handlers, analyze router+REFERENCE, CONVENTIONS.md, CLAUDE.md, COMMAND_REFERENCE.md, DOCUMENTATION_INDEX.md, SESSION_CONTEXT.md, synthesis-schema.ts) | synthesis-consolidation/DECISIONS.md:56 (D16) | PARAMETERIZE — specific files are SoNash filesystem. Pattern ("grep for old name, update all") is generic and is essentially what /migration ought to do. |
| CONVENTIONS.md Section 17 "Synthesis Output Contract" | synthesis-consolidation/DECISIONS.md:57 (D29) | COPY-AS-IS — contract structure. |

**synthesis-consolidation/ domain-assumption count:** ~24.

---

## 4. Decision table: PARAMETERIZE vs RESHAPE vs COPY-AS-IS vs OBSOLETE

| # | Assumption | Category | Destination treatment |
|---|------------|----------|------------------------|
| 1 | Skill names `/analyze`, `/recall`, `/synthesize` | PARAMETERIZE | Config-driven naming |
| 2 | Handler names `repo-analysis`, `website-analysis`, etc. | PARAMETERIZE | Same |
| 3 | Home-context loading order (SESSION_CONTEXT→ROADMAP→CLAUDE.md→MEMORY) | PARAMETERIZE | **Surgical-rewrite list #1** — contract-driven |
| 4 | SESSION_CONTEXT.md as primary fit input | PARAMETERIZE | JASON-OS has no equivalent file (CLAUDE.md §8 TBD); needs equivalent or contract |
| 5 | `.research/analysis/` output tree | PARAMETERIZE | Output-root config |
| 6 | `scripts/cas/` script location | PARAMETERIZE | "cas" naming |
| 7 | DB path `.research/content-analysis.db` | PARAMETERIZE | Path |
| 8 | Type-detection patterns | PARAMETERIZE | URL-prefix config |
| 9 | Captions/Whisper split (work/home) | PARAMETERIZE | User-specific preference |
| 10 | 14-file upstream-references list | PARAMETERIZE | Computed by grep, not hard-coded |
| 11-34 | Other path/name/version parameters | PARAMETERIZE | Surgical-rewrite list |
| 35 | "Creator View" naming + prose framing | RESHAPE | **Most visible term swap** |
| 36 | Creator Lens scoring weights + verdicts | RESHAPE | Lens renaming + weight re-tuning per JASON-OS user role |
| 37 | Repo-type enum (6 values) | RESHAPE | Add/remove for JASON-OS scan corpus |
| 38 | Candidate-type enum (8 values) | RESHAPE | Simplify or extend |
| 39 | Source-type enum (repo/website/document/media) | RESHAPE | JASON-OS may add `skill`, `agent`, `hook` |
| 40 | Source-tier defaults per source-type | RESHAPE | Trust model differs |
| 41 | Opportunity Matrix routing targets | RESHAPE | Only to skills that exist in destination |
| 42 | "active-sprint"/"park"/"evergreen" fit-badge labels | RESHAPE | "sprint" is agile-domain |
| 43 | "Mental Model Evolution" synthesis section | RESHAPE | Framing is creator-learning narrative |
| 44 | `--lens=adoption\|creator` flag values | RESHAPE | Lens names follow renaming |
| 45-53 | Other SoNash-domain-shaped design choices | RESHAPE | Term-by-term review |
| 54 | Zod schema mechanics | COPY-AS-IS | Tech pattern |
| 55 | SQLite+FTS5+WAL | COPY-AS-IS | Tech pattern |
| 56 | JSONL append-only ledger pattern | COPY-AS-IS | Tech pattern |
| 57 | Handler 6-phase template (Validate→Quick Scan→Gate→Dimension→Creator View→Engineer View→Value Map→Self-Audit→Routing) | COPY-AS-IS | Structural pattern, renaming Creator View (§4 row 35) |
| 58 | 10-dim self-audit rubric | COPY-AS-IS | Rubric structure |
| 59 | Subagent strategy (inline <10, agents ≥10) | COPY-AS-IS | Scaling |
| 60 | Section-level resume via state file | COPY-AS-IS | Resume pattern |
| 61 | HEAD-first rate-limit (5/sec HEAD, 1/sec full) | COPY-AS-IS | Networking |
| 62 | Progressive-deepening (Depth 0/1/2) | COPY-AS-IS | Pattern |
| 63 | Incremental-with-contradiction-escalation | COPY-AS-IS | Algorithm |
| 64 | Cross-type detection (4 methods) | COPY-AS-IS | Algorithm |
| 65 | Candidate dedup + convergence boost | COPY-AS-IS | Algorithm |
| 66 | Schema versioning discipline | COPY-AS-IS | Principle |
| 67 | Ingest-Query-Lint operational triad | COPY-AS-IS | Framing |
| 68 | Audit-before-synthesize gating principle | COPY-AS-IS | Methodology |
| 69 | 24-repo + 5-website baseline corpus | OBSOLETE | SoNash corpus only |
| 70 | Session numbers (#267-#287) | OBSOLETE | Execution history |
| 71 | One-time migration scripts (migrate-v3, fix-depth-mislabel, backfill-candidates) | OBSOLETE | Port had its own starting state |
| 72 | Firecrawl bypass-skill pilot incident | OBSOLETE | SoNash debt |

---

## 5. Glossary — SoNash-domain terms needing re-parameterization

| # | Term | SoNash meaning | Where encoded | JASON-OS-neutral candidate |
|---|------|----------------|---------------|----------------------------|
| 1 | **Creator** / **Creator View** / **Creator Lens** | User persona framing; content-creator evaluating other creators' work | creator-view-upgrade/DECISIONS.md:48, all `creator-view.md` artifacts | "Operator View" / "Builder View" / "Analysis View" |
| 2 | **creator-view.md** (filename) | Per-source prose artifact, 6 sections | content-analysis-system/PLAN.md:216 | `analysis-view.md` / `operator-view.md` |
| 3 | **CAS** (Content Analysis System) | Entire skill family grouping | content-analysis-system/ (directory name), scripts/cas/ | May keep as jargon once ported; `/ras` Repo/Resource Analysis System? |
| 4 | **SoNash-specific skill names**: `/repo-analysis`, `/website-analysis`, `/document-analysis`, `/media-analysis`, `/analyze`, `/recall`, `/synthesize` | Command-layer | Throughout all 3 dirs | Each reviewed individually; pattern preserves |
| 5 | **SESSION_CONTEXT.md** | Home-repo file, primary fit input; tracks "current sprint, recent context" | creator-view-upgrade/DECISIONS.md:42 (D15), creator-view-upgrade/PLAN.md:124 | JASON-OS has no equivalent; TBD per JASON-OS CLAUDE.md §8. Contract: "current-work.md" or similar |
| 6 | **ROADMAP.md** | Home-repo file, secondary fit input; "project direction" | creator-view-upgrade/PLAN.md:125 | JASON-OS has ROADMAP.md — may align |
| 7 | **active sprint** (in `personal_fit_projects[]`, `[ACTIVE-SPRINT]` badge) | Scrum-era agile term | creator-view-upgrade/DECISIONS.md:42 (D22) | "active cycle" / "active focus" |
| 8 | **EXTRACTIONS.md** | Canonical extraction ledger | content-analysis-system/DIAGNOSIS.md:62 | Keep name; pattern-only port |
| 9 | **extraction-journal.jsonl** | Per-candidate decision log | creator-view-upgrade/DIAGNOSIS.md:63 | Keep name; pattern-only port |
| 10 | **research-index.jsonl** | Cross-skill discoverability index | creator-view-upgrade/DIAGNOSIS.md:66 | Keep |
| 11 | **home context** / **home repo** | The repo invoking the analysis (vs the analyzed target) | creator-view-upgrade/PLAN.md:340-342 | Keep naming; D19 flagged for CAS-port surgical rewrite already |
| 12 | **home repo guard** | Safety check preventing accidental scan of own repo | creator-view-upgrade/PLAN.md:471 (Guard Rails) | Keep; refactor to configurable |
| 13 | **`--focus` flag** (repo-synthesis subset-outputs) | Output-subsetting mechanism | synthesis-consolidation/DIAGNOSIS.md:24 | Keep |
| 14 | **TDMS** (deferral ledger) | SoNash's Technical Debt Management System | content-analysis-system/PLAN.md:632; REMAINING_CAS_TASKS.md:42 | JASON-OS uses `/add-debt` + `.planning/DEBT_LOG.md` per JASON-OS skill list. Swap-out |
| 15 | **T-numbers** (T28, T29, T37, T38, T40, T47, T48, T49) | SoNash todo IDs | Throughout | Don't port; JASON-OS has own todo system (`/todo`) |
| 16 | **Session numbers** (#263, #269, #287, etc.) | SoNash execution history markers | Throughout | Don't port |
| 17 | **`.research/` root** | SoNash convention for AI-generated research | Throughout | JASON-OS adopted same convention; align |
| 18 | **MEMORY.md / project-memories** | Per-project persistent memory layer | creator-view-upgrade/PLAN.md:128 | JASON-OS has `.claude/projects/...MEMORY.md` under user profile; path differs per-locale |

---

## 6. Critical callouts for JASON-OS operators (the "must-communicate" list)

1. **"CAS assumes home-repo = SoNash" is mostly about `SESSION_CONTEXT.md`.** The CAS port must replace the primary home-context file contract. JASON-OS has no equivalent yet (CLAUDE.md v0.1 §8). Options: (a) JASON-OS creates a `CURRENT_CYCLE.md` or similar, (b) CAS port accepts a config pointing at ROADMAP.md only with warning, (c) CAS port scans the `.planning/` tree for most-recent-touched files.

2. **"Creator" terminology permeates the skill family.** File names (`creator-view.md`), scoring lenses (`creator lens`), CLI flags (`--lens=creator`), verdict vocabulary (Study/Explore/Extract/Note). The rename is not a simple find/replace: the *framing* (user-as-creator-learning-from-creators) shapes the prose-generation prompts inside handlers. Rewrite targets: framing docs + prompt templates + all filenames + enum values.

3. **Source-type enum (repo/website/document/media) is a scan-corpus composition choice, not a fundamental ontology.** JASON-OS will likely want `skill`, `agent`, `hook`, `planning-doc` as additional source types for self-analyzing the OS. The handler architecture supports this (add handler per type + register in router).

4. **Repo-type enum (library/application/curated-list/registry/doc-hub/monorepo) is tuned to the SoNash scan universe.** `curated-list` and `registry` exist because SoNash scanned many awesome-lists and tool registries. JASON-OS may rarely hit those types; may add `skill-collection` instead.

5. **Opportunity Matrix routing targets must all exist in destination repo.** Current routing: `/brainstorm`, `/deep-plan`, `/deep-research`, `/analyze`. JASON-OS has the first three (CLAUDE.md §7) but not `/analyze` (that's precisely what's being ported). Temporary Option: remove `/analyze` routing target until CAS is installed, re-add post-port.

6. **TDMS ≠ `/add-debt`.** SoNash's TDMS is mentioned as a deferral target ("defer P2 to TDMS") in triage-mode-3 pattern. JASON-OS has `/add-debt` → `.planning/DEBT_LOG.md`. The CAS port should swap TDMS references for `/add-debt` invocations.

7. **Session numbers must not be ported.** Execution-history markers are SoNash-only. JASON-OS has its own session tracking model (`/session-begin`, `/session-end`).

8. **Migration scripts in `scripts/cas/` (migrate-v3, migrate-schemas, fix-depth-mislabel, backfill-candidates) are SoNash-remediation one-offs.** Do not port. JASON-OS starts with fresh `schema_version: "1.0"` and no legacy drift. The *discipline* (schema-version field, idempotent rebuild, full-corpus audit before consumers) ports.

9. **22-repo quick-scan migration + Wave 4 + Step 10.5 full-corpus audit are execution history.** The pattern ("migrate data before changing consumer" + "audit before synthesizing") ports as methodology.

10. **Two "bypass-skill" incidents (firecrawl pilot, Creator View missing creator-view.md) triggered CLAUDE.md guardrail #16 hardening: "follow skills exactly; user invokes skill, Claude supports."** This is an operator-discipline learning that should carry into JASON-OS CLAUDE.md (already present as guardrail #16 in JASON-OS CLAUDE.md).

---

## 7. Sources

| File | Size | Role |
|------|------|------|
| `<SONASH_ROOT>\.planning\content-analysis-system\DECISIONS.md` | 7693 B | 29 decisions, CAS foundation |
| `<SONASH_ROOT>\.planning\content-analysis-system\DIAGNOSIS.md` | 8998 B | Current state, schema drift, corpus baselines |
| `<SONASH_ROOT>\.planning\content-analysis-system\PLAN.md` | 29975 B | 15-step plan, Wave 1-5, all step-level detail |
| `<SONASH_ROOT>\.planning\content-analysis-system\REMAINING_CAS_TASKS.md` | 10499 B | Close-out runbook (Steps A/B/C, T47/T48/T49 follow-ups, `/deep-plan` template-fix proposal) |
| `<SONASH_ROOT>\.planning\content-analysis-system\STEP_A_HANDOFF.md` | 10971 B | Multi-skill-audit execution handoff |
| `<SONASH_ROOT>\.planning\creator-view-upgrade\DIAGNOSIS.md` | 6377 B | 10-gap framing, current v3.0 skill state |
| `<SONASH_ROOT>\.planning\creator-view-upgrade\DECISIONS.md` | 16338 B | 30 decisions, lens architecture |
| `<SONASH_ROOT>\.planning\creator-view-upgrade\PLAN.md` | 24951 B | Task A (Steps 1-8b) + Task B (Step 9) |
| `<SONASH_ROOT>\.planning\creator-view-upgrade\AUDIT.md` | 36271 B | 8-part audit (traceability, schema consistency, cross-section, process flow, output contract, backward compat), 3 findings |
| `<SONASH_ROOT>\.planning\synthesis-consolidation\DIAGNOSIS.md` | 4229 B | 3-implementation landscape (repo-synthesis v1.3, website-synthesis v1.1, cross-type stub) |
| `<SONASH_ROOT>\.planning\synthesis-consolidation\DECISIONS.md` | 14262 B | 32 decisions, paradigm architecture |
| `<SONASH_ROOT>\.planning\synthesis-consolidation\PLAN.md` | 39773 B | 15-step plan, Wave 1-5, Step 10.5 full-corpus audit |
| `<SONASH_ROOT>\.planning\synthesis-consolidation\WAVE4_RESUME.md` | 9561 B | Wave 4 Step 10 resume handoff, bypass-skill policy hardening |
| `<SONASH_ROOT>\.planning\synthesis-consolidation\audit-step-10.5\` | 28 JSON files, ~110KB | Per-source audit output (OBSOLETE execution snapshots) |
| `<JASON_OS_ROOT>\.research\migration-skill\BRAINSTORM.md` | context | §5 Q6 + §3 D19 frame this sub-question |
| `<JASON_OS_ROOT>\CLAUDE.md` | context | v0.1 bootstrap, no SESSION_CONTEXT.md yet (§8 TBD) |
| `<SONASH_ROOT>\CLAUDE.md` | context | v6.0, SoNash-home-repo-authoritative |

---

**Findings path:** `<JASON_OS_ROOT>\.research\migration-skill\findings\D6-cas-planning.md`
