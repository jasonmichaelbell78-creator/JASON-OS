# FINDINGS — D6-cas-scripts-deep

**Agent:** Phase 1 D-agent D6-cas-scripts-deep
**Sub-question:** SQ-D6b — Deep-dive `scripts/cas/` (12 files, 4368 lines). Produce a surgical-rewrite list for porting into JASON-OS.
**Scope:** Read-only against SoNash. Findings only. No code moved.
**Target repo:** `C:\Users\jbell\.local\bin\sonash-v0\scripts\cas\`

---

## Summary

- **Files:** 12 (`backfill-candidates.js`, `backfill-tags.js`, `fix-depth-mislabel.js`, `generate-extractions-md.js`, `migrate-schemas.js`, `migrate-v3.js`, `promote-firecrawl-to-journal.js`, `rebuild-index.js`, `recall.js`, `retag.js`, `self-audit.js`, `update-index.js`)
- **Total lines:** 4368 (measured via `wc -l *.js`)
- **Total coupling sites catalogued:** **68** (SoNash-shape hardcoded constants, planning/convention cross-refs, one-shot dates/slugs, SoNash home-repo allowlist, `.claude/state/handler.slug.state.json` pipeline assumption, better-sqlite3 native-module dep, legacy-dir assumptions `repo-analysis/` and `website-analysis/`, `.research/EXTRACTIONS.md` file name, session-number / T29 history in comments).
- **Verdict distribution:** copy-as-is **0** / sanitize **4** (`fix-depth-mislabel.js`, `migrate-schemas.js`, `promote-firecrawl-to-journal.js`, `backfill-candidates.js` — all are one-shot SoNash-state migrations, not ongoing CAS behavior) / reshape **6** (`backfill-tags.js`, `generate-extractions-md.js`, `migrate-v3.js`, `rebuild-index.js`, `recall.js`, `update-index.js`) / rewrite **1** (`self-audit.js` — SoNash home-repo ref allowlist + handler→skill map + `.claude/state/` pipeline assumption require genuine rewrite) / skip **1** (`fix-depth-mislabel.js` is a candidate-skip — fixes specific SoNash repos, nothing to port; conservative verdict: **sanitize to doc-only** or **skip**) / blocked-on-prereq **0**.
  - **Adjusted distribution (final):** sanitize 3 (`migrate-schemas.js`, `promote-firecrawl-to-journal.js`, `backfill-candidates.js`), reshape 6, rewrite 2 (`self-audit.js`, `retag.js`), skip 1 (`fix-depth-mislabel.js`).
- **Dominant coupling axes:** (1) `PROJECT_ROOT = path.resolve(__dirname, "../..")` anchored to home repo in every file (12/12); (2) `.research/analysis/` + `.research/extraction-journal.jsonl` + `.research/content-analysis.db` paths hardcoded (11/12); (3) legacy `.research/repo-analysis/` and `.research/website-analysis/` dir fallbacks (3/12); (4) `.planning/`, `CONVENTIONS.md §14`, `T29 Wave 4 Step 8.5`, session-# breadcrumbs in headers (9/12 docblocks); (5) `better-sqlite3` native module (3/12 hard dep).
- **Lib dependency surface:** 10 helpers under `scripts/lib/` — `security-helpers.js`, `safe-fs.js`, `safe-cas-io.js`, `parse-jsonl-line.js`, `analysis-schema.js`, `read-jsonl.js`, `retag-mutations.js`, plus transitive (`sanitize-error.cjs`, `validate-paths.js`, `normalize-*`). These must be ported first (or in the same wave) — see dependency graph.

---

## Per-file walkthrough

### 1. `backfill-candidates.js` (285 lines)

**Purpose:** One-shot. Repopulates `analysis.json.candidates` arrays from `extraction-journal.jsonl` entries for 9 specific SoNash repos where v2→v3 migration left `candidates: []` empty. Maps journal entry fields → candidate schema fields.

**SoNash-coupling sites:**
- L4–9: "Session #273 self-audit discovered…" — SoNash session-history narrative in docblock.
- L17: "Scope: the same 9 repos fixed by scripts/cas/fix-depth-mislabel.js, plus…" — refers to sibling SoNash-shape script.
- L19: `"aws-media-extraction is excluded per Step 8.5 scoping notes"` — one-shot scope carve-out specific to SoNash repo catalogue.
- L42–44: `PROJECT_ROOT = path.resolve(__dirname, "../..")`; `ANALYSIS_DIR = .research/analysis`; `JOURNAL_PATH = .research/extraction-journal.jsonl` — home-repo assumptions.
- L50–60: `STEP_85_SLUGS` hardcoded array of 9 slugs from SoNash repo corpus (`bedrock-summarize-audio-video-text`, `bulk-transcribe-youtube-playlist`, `codecrafters-io-build-your-own-x`, `hkuds-cli-anything`, `karpathy-autoresearch`, `public-apis_public-apis`, `teng-lin_notebooklm-py`, `viktoraxelsen-memskill`, `youtube-transcript-api`).
- L118, L165–172: PR #505 / Qodo-finding breadcrumbs in comments.
- L228–229: `already has ${data.candidates.length} candidates` skip gate — CAS-shape, not SoNash-shape (OK).

**Port verdict: sanitize** — core mapping logic (`journalEntryToCandidate`, `mapAndValidateCandidates`, `backfillOne`, `indexJournalBySource`) is generic and reusable; SoNash-specific scope (the 9 slugs + narrative) is entirely removable. Ported form is a **generic "rehydrate candidates from journal" utility** parameterized by `{analysisDir, journalPath, slugList?}`.

**Dependencies:**
- Lib: `security-helpers.js` (`sanitizeError`), `safe-fs.js` (`safeWriteFileSync`, `isSafeToWrite`), `safe-cas-io.js` (`safeReadJson`, `safeReadText`, `validateCandidate`), `analysis-schema.js` (`validate`), `parse-jsonl-line.js` (`safeParseLineWithError`).
- Data: `analysis.json` + `extraction-journal.jsonl` (CAS canon).
- `.planning/`: no direct reads but header docblock references `.planning/synthesis-consolidation/PLAN.md`.

---

### 2. `backfill-tags.js` (152 lines)

**Purpose:** Walks `extraction-journal.jsonl`, finds entries with empty `tags`, looks up the source's `analysis.json` (across current + legacy dirs) and copies source-level tags onto the entry. Uses fuzzy slugified matching.

**SoNash-coupling sites:**
- L11: `@see .claude/skills/shared/CONVENTIONS.md (Section 14: Tag Conventions)` — cross-skill refs.
- L20–26: `PROJECT_ROOT = ../..`; `JOURNAL_PATH`; `ANALYSIS_DIR`; `LEGACY_DIRS = [repo-analysis, website-analysis]` — legacy-dir fallbacks are SoNash history (repo-analysis/website-analysis were predecessors to unified `analysis/`).
- L31–69: `findTagsForSource` fuzzy matcher — generic logic (slug containment) but anchored to the legacy-dir history above.

**Port verdict: reshape** — the fuzzy-match algorithm is useful. The **LEGACY_DIRS** list must be parameterized or dropped (JASON-OS has no v2 history). Cross-ref to `CONVENTIONS.md §14` needs to retarget a JASON-OS-equivalent tag-convention doc (or be removed if JASON-OS doesn't inherit §14).

**Dependencies:**
- Lib: `security-helpers.js` (`sanitizeError`, `validatePathInDir`, `slugify`), `safe-fs.js` (`safeWriteFileSync`, `isSafeToWrite`, `readTextWithSizeGuard`), `parse-jsonl-line.js` (`safeParseLine`).
- Data: journal + analysis.json across three dirs.

---

### 3. `fix-depth-mislabel.js` (179 lines)

**Purpose:** One-shot. Flips `depth: "quick"` → `"standard"` on 9 SoNash analysis.json records where `migrate-schemas.js:223` fallback-chain missed legacy v2 `scanDepth` (camelCase). Has an aws-media-extraction exclusion.

**SoNash-coupling sites:**
- Entire header docblock (L3–29) is SoNash forensic narrative: "Session #272 pre-Wave-4 audit", "Root cause: scripts/cas/migrate-schemas.js:223", "aws-media-extraction was EXCLUDED", etc.
- L44–54: `MISLABELED_SLUGS` array — same 9 SoNash-specific slugs as backfill-candidates.
- L56–64: `REQUIRED_STANDARD_ARTIFACTS` — **generic** CAS contract (findings.jsonl, summary.md, …) not SoNash-specific.
- L103 ("this script only fixes the specific known mislabeling") — self-admits one-shot scope.

**Port verdict: skip** — this is a corrective one-shot for a bug already patched in `migrate-v3.js:218-253` (depth self-heal). JASON-OS never had v2, never had the bad `migrate-schemas.js:223` default, so there is nothing to heal. The `isValidArtifactFile`-driven artifact-count logic IS worth keeping — it lives in `migrate-v3.js` already. **Do not port; the self-heal in migrate-v3 covers the same logic generically.**

**Dependencies:**
- Lib: `security-helpers.js`, `safe-fs.js`, `analysis-schema.js`, `safe-cas-io.js`.
- Exports `hasFullStandardArtifacts`, `REQUIRED_STANDARD_ARTIFACTS` — **if** any future script wants the artifact-count check, lift those into `safe-cas-io.js` or a new `cas-artifacts.js` helper.

---

### 4. `generate-extractions-md.js` (248 lines)

**Purpose:** Generates `.research/EXTRACTIONS.md` (a TOC + per-source markdown tables) from `extraction-journal.jsonl`. Atomic write. Renderer-independent anchor IDs (Qodo #3 breadcrumb).

**SoNash-coupling sites:**
- L12: `@see .claude/skills/repo-analysis/SKILL.md (Cross-Repo Extraction Tracking)` — cross-skill ref.
- L21–23: `PROJECT_ROOT`; `JOURNAL_PATH`; `OUTPUT_PATH = .research/EXTRACTIONS.md` — home-repo constants; **`EXTRACTIONS.md` is a well-known filename referenced from CLAUDE.md and agent triggers in SoNash**, so this is a convention surface, not a raw coupling.
- L196–198: "Atomic rewrite: tmp file + rename. Propagation of the Qodo 'Retag rewrites non-atomic' finding from retag.js" — PR breadcrumb (harmless; sanitize out or keep as narrative).
- L236–237: `run: node scripts/cas/backfill-tags.js` — embedded sibling-path reference (will still be valid post-port if dir structure preserved).

**Port verdict: reshape** — core logic (group, sort, escape, TOC + sections, atomic write) is 100% portable. Reshape targets:
- Parameterize `JOURNAL_PATH` and `OUTPUT_PATH`.
- Reassess whether `EXTRACTIONS.md` is the JASON-OS convention name (likely yes if CAS keeps its name, but worth confirming).
- Drop SoNash PR-history narrative from comments.

**Dependencies:**
- Lib: `security-helpers.js` (`sanitizeError`), `safe-fs.js` (`safeAtomicWriteSync`, `isSafeToWrite`), `read-jsonl.js`.

---

### 5. `migrate-schemas.js` (374 lines)

**Purpose:** **Historic** v2→v3 migration — normalizes legacy SoNash analysis.json shapes (v2 lenses, camelCase `scanDepth`, `summary_bands`, `creatorLens`, etc.) into unified schema v3.0. Chains to `rebuild-index.js` after.

**SoNash-coupling sites:**
- L12: `@see .planning/content-analysis-system/DECISIONS.md (Decision #29)` — planning ref.
- L22–23: `PROJECT_ROOT`; `ANALYSIS_DIR`.
- L44–75 (`generateAnalysisSummary`), L99–122 (`extractScoring`), L157–175 (`extractCandidates` with v2 `patternCandidates`/`knowledgeCandidates`/…), L182–198 (`generateTags` with `ecosystem_tags`/`repo_type`/camelCase `repoType`), L222–230 (depth fallback chain including `scanDepth` camelCase) — all of this is **v2 legacy-shape archaeology for SoNash records**. No v2 exists in JASON-OS.
- L225–230: extended comment explaining the Session #272 mislabel bug (same narrative as fix-depth-mislabel.js).
- L258–274: preserves original fields as type-specific extensions via spread — generic pattern, reusable.
- L361–370: chains to `require("node:child_process").execFileSync(process.execPath, [path.join(__dirname, "rebuild-index.js")])` — direct sibling-call, robust to port if dir structure preserved.

**Port verdict: sanitize** — **keep as a v2→v3 artifact ONLY if JASON-OS will ever ingest v2-era SoNash records**; otherwise drop. If kept, the reshape is trivial: remove SoNash planning/session narrative, parameterize `ANALYSIS_DIR`, keep all shape-archaeology fallbacks untouched (they're the whole point). Effectively this is a **self-contained SoNash-to-v3 migrator**; porting is about **shipping it alongside the CAS port run so SoNash analysis records can be imported once, then retiring it**.

**Dependencies:**
- Lib: `security-helpers.js`, `analysis-schema.js`, `safe-cas-io.js`, `safe-fs.js` (lazy-required inside processEntry).
- Spawns: `rebuild-index.js` (sibling script).
- Planning: `.planning/content-analysis-system/DECISIONS.md`, `.planning/synthesis-consolidation/PLAN.md` (docblock only — no runtime read).

---

### 6. `migrate-v3.js` (348 lines)

**Purpose:** Idempotent fixer for partial v3.0 migrations — fills missing fields, handles v2 scoring→v3 conversion, generates tags, runs depth self-heal (the generic version of `fix-depth-mislabel.js`), validates against Zod. Safe to run repeatedly.

**SoNash-coupling sites:**
- L19–20: `PROJECT_ROOT`; `ANALYSIS_DIR`.
- L208–217: `source_tier` default logic — T29 D#13/D#32 planning decision embedded in code (default repo=T1, else=T2). Comment cites `.planning/`.
- L218–253: depth self-heal block — legacy `scanDepth` detection, comment references Session #272, PR #505 Qodo narrative, `migrate-schemas.js` bug cross-ref. Logic itself (artifact-count-based heal) is generic.
- L226–234: `standardArtifacts = [...]` duplicates `REQUIRED_STANDARD_ARTIFACTS` from `fix-depth-mislabel.js` — candidate for lifting into shared helper during port.

**Port verdict: reshape** — keep; most useful of the migration trio. Reshape:
- Strip Session #272 / PR #505 narrative from comments.
- Lift `standardArtifacts` constant into `scripts/lib/cas-artifacts.js` (new) shared with `self-audit.js`.
- Make `source_tier` defaulting configurable (JASON-OS may not have T-tier decisions).
- Drop the `scanDepth` camelCase check only if JASON-OS never had v2 (likely safe to drop, but cheap to keep as inert defense).

**Dependencies:**
- Lib: `security-helpers.js`, `safe-fs.js`, `analysis-schema.js`, `safe-cas-io.js`.

---

### 7. `promote-firecrawl-to-journal.js` (220 lines)

**Purpose:** One-shot. Promotes 21 value-map.json candidates for a SINGLE source (`mendableai/firecrawl`) into `extraction-journal.jsonl`. Not idempotent — has a duplicate guard.

**SoNash-coupling sites:**
- L4–24: docblock is entirely SoNash narrative (Session #273, `feedback_skills_in_plans_are_tool_calls`, `feedback_extractions_are_canon`).
- L32–40: `PROJECT_ROOT`; `VALUE_MAP_PATH = .research/analysis/firecrawl/value-map.json`; `JOURNAL_PATH`.
- L43–45: **hardcoded `SOURCE = "mendableai/firecrawl"`, `SOURCE_TYPE = "repo"`, `DECISION_DATE = "2026-04-10"`** — pure one-shot.
- L202: `Next: node scripts/cas/generate-extractions-md.js` — sibling-path log.

**Port verdict: sanitize** — the pattern (value-map → journal promotion) is genuinely useful as a general CAS tool when a Standard analysis is built manually and its candidates never landed in the journal. Generalize to `promote-valuemap-to-journal.js --slug=<slug>` with `SOURCE`/`DECISION_DATE` derived from the slug's `analysis.json`. Drop all firecrawl-specific narrative.

**Dependencies:**
- Lib: `security-helpers.js`, `safe-fs.js`, `safe-cas-io.js`, `parse-jsonl-line.js`.

---

### 8. `rebuild-index.js` (399 lines)

**Purpose:** Idempotent full rebuild of the SQLite search index (`content-analysis.db`) from `analysis/*/analysis.json` + `extraction-journal.jsonl`. Drops and recreates DB. FTS5 virtual tables.

**SoNash-coupling sites:**
- L11: `@see .planning/content-analysis-system/DECISIONS.md (Decisions #9, #10, #24)`.
- L16: `require("better-sqlite3")` — **native-module hard dep**. Must be in JASON-OS package.json.
- L21–26: `DB_PATH`, `ANALYSIS_DIR`, `REPO_ANALYSIS_DIR`, `WEBSITE_ANALYSIS_DIR`, `JOURNAL_PATH` — legacy-dir fallbacks include the SoNash v2 history.
- L35–109: schema (tables + FTS5) — **generic; portable verbatim**.
- L112–117, L155–202: `extractSourceRecord` + `bandFromScore` — v2-aware ("ecosystemTags", `creatorLens`, `summary_bands`) fallbacks, same v2-archaeology tax as migrate-schemas.

**Port verdict: reshape** — schema is reusable as-is. Reshape:
- Drop `REPO_ANALYSIS_DIR` + `WEBSITE_ANALYSIS_DIR` fallbacks (JASON-OS never had those).
- Strip v2-only field fallbacks in `extractSourceRecord` (or keep inert).
- Confirm `better-sqlite3` lands in JASON-OS deps (prerequisite for the entire query surface).

**Dependencies:**
- Lib: `security-helpers.js` (`sanitizeError`), `safe-fs.js` (`isSafeToWrite`), `read-jsonl.js`.
- npm: `better-sqlite3` (native).

---

### 9. `recall.js` (476 lines)

**Purpose:** CLI query interface over the SQLite index. FTS5 free-text, tag/type/source/sort filters, `--stats` mode with vocab diagnostics, tag classification (semantic/taxonomic/orphan) via `tag-vocabulary.json`.

**SoNash-coupling sites:**
- L19: `@see .planning/content-analysis-system/DECISIONS.md (Decisions #11, #27)`.
- L24: `require("better-sqlite3")`.
- L33–35: `PROJECT_ROOT`; `DB_PATH`; `VOCAB_PATH = .research/tag-vocabulary.json`.
- L89–116: tag classifier cites CONVENTIONS.md §14 (`Per CONVENTIONS.md §14`).
- L415–430: `refuseSymlinkWithParents` + `lstat` defense — generic security posture.

**Port verdict: reshape** — core CLI + SQL is fully portable. Reshape:
- Parameterize DB/VOCAB paths.
- Retarget or drop the CONVENTIONS.md §14 reference (same decision as backfill-tags.js).
- The vocab-stats block (`computeVocabularyByCategory`, `computeTopTagsByCategory`, `attachVocabStats`) presumes a `tag-vocabulary.json` with `{ tags, synonyms, forbidden, categories }` shape — JASON-OS either inherits this schema or the block degrades gracefully (`return` on missing vocab).

**Dependencies:**
- Lib: `security-helpers.js` (`sanitizeError`, `validatePathInDir`, `refuseSymlinkWithParents`), `safe-fs.js` (`readTextWithSizeGuard`).
- npm: `better-sqlite3`.
- Data: `content-analysis.db`, `tag-vocabulary.json`.

---

### 10. `retag.js` (415 lines, 0755)

**Purpose:** CAS tag-quality CLI — `apply --batch-file <path>` and `validate [--strict]` subcommands. Applies batch retagging under vocabulary rules, atomic write of journal + vocab, regression guard, rebuild-index follow-on.

**SoNash-coupling sites:**
- L8–9: `Part of T40 CAS tag quality plan — see .claude/skills/shared/CONVENTIONS.md §14.` — T40 is SoNash-specific plan ID.
- L37–40: `PROJECT_ROOT`, `JOURNAL_PATH`, `VOCAB_PATH`, `REBUILD_INDEX_SCRIPT` — sibling-path coupling.
- L216–245: `runRebuildIndex` spawns `process.execPath` with absolute path to sibling script — robust pattern, survives port if dir structure preserved.
- L253–254: PR history comment — `Recurring pattern across PRs #374/#388/#389/#448`.
- Dep on `retag-mutations.js` library for batch-shape validation, classification, entry-keying, regression-assertion.

**Port verdict: rewrite** — most of the subcommand orchestration is fine, but:
- The §14-tied shape (batch file schema, "semantic ≥3" rule at L142, L154, L324) is a SoNash convention that has to be reconfirmed or replaced as a JASON-OS convention. If JASON-OS accepts the same §14 rules, this becomes a **reshape**; if not, substantive logic rewrite.
- `retag-mutations.js` (scripts/lib) carries the bulk of the decision logic. Its shape is the real port target.
- PR-history comments must be scrubbed.

**Dependencies:**
- Lib: `security-helpers.js`, `safe-fs.js` (including `withLock`, `safeAtomicWriteSync`, `readTextWithSizeGuard`), `parse-jsonl-line.js`, `retag-mutations.js`.
- Spawns: `rebuild-index.js`.

---

### 11. `self-audit.js` (814 lines)

**Purpose:** The heaviest script. Validates any handler's output directory against `CONVENTIONS.md §13` (Handler Output Contract). MUST/SHOULD artifacts, Zod validation, extraction-count parity vs. value-map, EXTRACTIONS.md section check, tag-consistency, home-repo ref verification, state-file / retro-feedback check, media-specific checks, trends.jsonl re-analysis signal, citation-density check.

**SoNash-coupling sites:**
- L6, L16: docblock cites `CONVENTIONS.md §13`.
- L30–33: `PROJECT_ROOT`; `ANALYSIS_DIR`; `JOURNAL_PATH`; `EXTRACTIONS_MD_PATH`.
- L37–75: citation constants — generic, reusable.
- L78–98: MUST/SHOULD artifact lists — **CAS convention constants; need JASON-OS review but mostly generic**.
- L321–336: `checkBehavioral` — `handlerMap = {repo, website, document, media}` maps source_type → skill directory name (`repo-analysis`, etc.). `stateDir = .claude/state`. `stateFile = .claude/state/${handler}.${slug}.state.json`. **This is the deepest SoNash coupling** — presumes the `.claude/state/*.state.json` pipeline-tail convention (CONVENTIONS §16).
- L369–372: `T29 Session #277` comments.
- L481–505: **`HOME_REPO_PREFIXES` + `HOME_REPO_FILES`** — hardcoded SoNash home-repo allowlist (`.claude/`, `.research/`, `scripts/cas/`, `scripts/lib/`, `scripts/reviews/`, `scripts/debt/`, `scripts/docs/`, `docs/agent_docs/`, `functions/src/`, `functions/lib/`, plus `CLAUDE.md`, `ROADMAP.md`, `AI_WORKFLOW.md`, `SESSION_CONTEXT.md`, `firebase.json`, `firestore.rules`, `package.json`, `tsconfig.json`). This is the home-context coupling Agent 1 flagged per BRAINSTORM §3 D19.
- L552–581: `check5cHomeRepoRefs` — the check itself that consumes the allowlist. Pure SoNash-shape.
- L603–626: `check6bExtractionsMdSection` — depends on `EXTRACTIONS.md` existing at home-repo path.

**Port verdict: rewrite** — self-audit is the script with the highest "configurable target-repo parameters" need per BRAINSTORM D19. Rewrite axes:
- `HOME_REPO_PREFIXES` / `HOME_REPO_FILES` must become config loaded from a `repo-profile.json` (per research Q6/Q7 on skill decomposition and repo-profile).
- `handlerMap` + `stateDir` + `stateFile` must move to a `pipeline-profile` abstraction (JASON-OS may not adopt the `.claude/state/handler.slug.state.json` convention).
- Artifact MUST/SHOULD lists should either be inherited from a CAS convention JSON or hardcoded but documented.
- Extended checks 5a/5c/6a/6b/6c/7b/7c/8 are mostly generic; check 5c and check 6b have home-repo coupling.
- Media-specific `transcript_source` + `transcript.md` checks are CAS-media-handler-specific — probably fine to carry over verbatim.

**Dependencies:**
- Lib: `security-helpers.js` (`sanitizeError`, `validatePathInDir`, `refuseSymlinkWithParents`, `slugify`), `safe-cas-io.js` (`safeReadText`, `safeReadJson`, `isValidArtifactFile`), `parse-jsonl-line.js`, `analysis-schema.js` (lazy-required).
- Assumes: `.research/analysis/<slug>/{analysis.json, value-map.json, creator-view.md, findings.jsonl, summary.md, deep-read.md, content-eval.jsonl, coverage-audit.jsonl, transcript.md}`, `.research/extraction-journal.jsonl`, `.research/EXTRACTIONS.md`, `.claude/state/<handler>.<slug>.state.json`.

---

### 12. `update-index.js` (459 lines)

**Purpose:** Incremental single-source index update — called by `/analyze` router after a handler completes. Upserts the source row + syncs extractions for that source. Auto-creates DB if missing (with full schema). Matches journal entries by `source_analysis_id` OR `source_type+source`.

**SoNash-coupling sites:**
- L13: `@see .planning/content-analysis-system/DECISIONS.md (Decision #28)`.
- L23–28: `DB_PATH`, `ANALYSIS_DIR`, `REPO_ANALYSIS_DIR`, `WEBSITE_ANALYSIS_DIR`, `JOURNAL_PATH` — same legacy-dir tax as rebuild-index.
- L290–357: **duplicated schema DDL** (same as rebuild-index.js:36-109). Port-time candidate for extraction into a shared `cas-schema.js`.
- L251: `CLAUDE.md §5` ref in comment.

**Port verdict: reshape** — very close sibling of rebuild-index.js. Same parameterization work, plus:
- Extract schema DDL into shared helper used by both rebuild-index + update-index.
- Drop legacy-dir fallbacks.
- Retarget `CLAUDE.md §5` comment (now `JASON-OS/CLAUDE.md §2/§5`).

**Dependencies:**
- Lib: `security-helpers.js` (`sanitizeError`, `validatePathInDir`), `safe-fs.js` (`safeWriteFileSync`, `isSafeToWrite`), `parse-jsonl-line.js`.
- npm: `better-sqlite3`.

---

## Dependency graph

### Cas scripts → external SoNash deps

```
                                      +-----------------------------+
                                      |  scripts/lib/ (10 helpers)  |
                                      +-----------------------------+
                                          ^  ^  ^  ^  ^  ^  ^
                                          |  |  |  |  |  |  |
  +---------------------+                 |  |  |  |  |  |  |
  | backfill-candidates | --security-helpers, safe-fs, safe-cas-io, analysis-schema, parse-jsonl-line
  | backfill-tags       | --security-helpers, safe-fs, parse-jsonl-line
  | fix-depth-mislabel  | --security-helpers, safe-fs, safe-cas-io, analysis-schema
  | generate-xctns-md   | --security-helpers, safe-fs, read-jsonl
  | migrate-schemas     | --security-helpers, safe-fs, safe-cas-io, analysis-schema  --> spawns rebuild-index.js
  | migrate-v3          | --security-helpers, safe-fs, safe-cas-io, analysis-schema
  | promote-firecrawl   | --security-helpers, safe-fs, safe-cas-io, parse-jsonl-line
  | rebuild-index       | --security-helpers, safe-fs, read-jsonl                    --> npm:better-sqlite3
  | recall              | --security-helpers, safe-fs                                --> npm:better-sqlite3
  | retag               | --security-helpers, safe-fs, parse-jsonl-line, retag-mutations --> spawns rebuild-index.js
  | self-audit          | --security-helpers, safe-cas-io, parse-jsonl-line, analysis-schema
  | update-index        | --security-helpers, safe-fs, parse-jsonl-line              --> npm:better-sqlite3
  +---------------------+

Filesystem deps (all scripts):
  PROJECT_ROOT = path.resolve(__dirname, "../..")         -- SoNash home-repo assumption
  .research/analysis/                                     -- 10/12
  .research/extraction-journal.jsonl                      -- 9/12
  .research/content-analysis.db                           -- 3/12 (rebuild, recall, update)
  .research/tag-vocabulary.json                           -- 2/12 (recall, retag)
  .research/EXTRACTIONS.md                                -- 2/12 (generate, self-audit)
  .research/repo-analysis/       (LEGACY)                 -- 3/12 (backfill-tags, rebuild, update)
  .research/website-analysis/    (LEGACY)                 -- 3/12 (backfill-tags, rebuild, update)
  .claude/state/<handler>.<slug>.state.json               -- 1/12 (self-audit only; CONVENTIONS §16)

Planning/convention cross-refs (docblock, no runtime read):
  .planning/content-analysis-system/DECISIONS.md          -- migrate-schemas, rebuild-index, recall, update-index
  .planning/synthesis-consolidation/PLAN.md               -- migrate-schemas, migrate-v3 (via comment)
  .claude/skills/shared/CONVENTIONS.md §13                -- self-audit
  .claude/skills/shared/CONVENTIONS.md §14                -- backfill-tags, recall, retag
  .claude/skills/shared/CONVENTIONS.md §16                -- self-audit (state file + process_feedback)
  .claude/skills/repo-analysis/SKILL.md                   -- generate-extractions-md

One-shot SoNash-specific data:
  9-slug allowlist STEP_85_SLUGS / MISLABELED_SLUGS       -- backfill-candidates, fix-depth-mislabel
  SOURCE = "mendableai/firecrawl"                         -- promote-firecrawl
  HOME_REPO_PREFIXES + HOME_REPO_FILES allowlist          -- self-audit (largest single home-coupling site)
```

### Internal cas-script call graph

```
retag.js apply ----spawns---> rebuild-index.js
migrate-schemas.js (after migrate) ----spawns---> rebuild-index.js
update-index.js  (no spawns; called BY /analyze router)
```

All other cas scripts are leaves (no sibling invocations). retag.js is the only one that calls rebuild-index.js from user-space ops; migrate-schemas.js chains rebuild-index.js as a historic-migration tail.

---

## Port order (bottom-up)

Prerequisites come first. Each row below assumes the previous row is green.

1. **Port `scripts/lib/` helpers** (out of scope for D6, but the whole dir is the blocking prerequisite). Must land: `security-helpers.js` (+ transitive `validate-paths.js`, `normalize-*`), `sanitize-error.cjs`, `safe-fs.js`, `safe-cas-io.js`, `parse-jsonl-line.js`, `read-jsonl.js`, `analysis-schema.js`, `retag-mutations.js`. See D-agent `D6a-lib-helpers-deep` (sibling finding file, if present) for its own port list.
2. **`rebuild-index.js`** — foundational; every read-side script (recall, update-index) depends on the DB + schema + FTS5 virtual tables that this builds. Also the target of the `.execFileSync` sibling call from retag + migrate-schemas. Schema DDL is the most important artifact to land correctly. (**top-1**)
3. **`update-index.js`** — mirror of rebuild-index with incremental semantics. Lift schema into shared helper at this point so rebuild + update agree. (**top-2**)
4. **`generate-extractions-md.js`** — simple reshape, no chain to anything; safe early win. (**top-3**)
5. **`recall.js`** — read-only; depends on rebuild-index having run at least once. Reshape + vocab-schema decision.
6. **`backfill-tags.js`** — reshape; drops legacy-dirs.
7. **`migrate-v3.js`** — reshape; keep depth self-heal; lift REQUIRED_STANDARD_ARTIFACTS into `scripts/lib/cas-artifacts.js`.
8. **`retag.js` + `retag-mutations.js`** — rewrite axis is whether JASON-OS adopts §14 vocabulary rules. Gate this on the repo-profile / CAS-convention decision (research Q7).
9. **`self-audit.js`** — the heaviest rewrite; port LAST because (a) it consumes almost every other CAS piece, (b) the home-repo-refs + pipeline-state couplings need a parameterized `repo-profile.json` shape that is itself a research decision.
10. **`migrate-schemas.js`** (sanitize) — optional one-shot; port only if JASON-OS will re-ingest v2 SoNash records. Otherwise retire.
11. **`promote-firecrawl-to-journal.js`** (sanitize → generalize) — rename to `promote-valuemap-to-journal.js`, parameterize by slug. Nice-to-have.
12. **`backfill-candidates.js`** (sanitize → generalize) — pair with the generalized promote-valuemap tool.
13. **`fix-depth-mislabel.js`** — SKIP.

**Top-3 summary:** `rebuild-index.js`, `update-index.js`, `generate-extractions-md.js`.

---

## Sources

- `C:\Users\jbell\.local\bin\sonash-v0\scripts\cas\backfill-candidates.js` (285 lines)
- `C:\Users\jbell\.local\bin\sonash-v0\scripts\cas\backfill-tags.js` (152 lines)
- `C:\Users\jbell\.local\bin\sonash-v0\scripts\cas\fix-depth-mislabel.js` (179 lines)
- `C:\Users\jbell\.local\bin\sonash-v0\scripts\cas\generate-extractions-md.js` (248 lines)
- `C:\Users\jbell\.local\bin\sonash-v0\scripts\cas\migrate-schemas.js` (374 lines)
- `C:\Users\jbell\.local\bin\sonash-v0\scripts\cas\migrate-v3.js` (348 lines)
- `C:\Users\jbell\.local\bin\sonash-v0\scripts\cas\promote-firecrawl-to-journal.js` (220 lines)
- `C:\Users\jbell\.local\bin\sonash-v0\scripts\cas\rebuild-index.js` (399 lines)
- `C:\Users\jbell\.local\bin\sonash-v0\scripts\cas\recall.js` (476 lines)
- `C:\Users\jbell\.local\bin\sonash-v0\scripts\cas\retag.js` (415 lines)
- `C:\Users\jbell\.local\bin\sonash-v0\scripts\cas\self-audit.js` (814 lines)
- `C:\Users\jbell\.local\bin\sonash-v0\scripts\cas\update-index.js` (459 lines)
- `C:\Users\jbell\.local\bin\sonash-v0\scripts\lib\` (listing only — 21 files including `security-helpers.js`, `safe-fs.js`, `safe-cas-io.js`, `analysis-schema.js`, `parse-jsonl-line.js`, `read-jsonl.js`, `retag-mutations.js`, `sanitize-error.cjs`, `validate-paths.js`, `normalize-category.js`, `normalize-file-path.js`, plus 10 others)
- `C:\Users\jbell\.local\bin\JASON-OS\.research\migration-skill\BRAINSTORM.md` §3 D19, §5 Q6
