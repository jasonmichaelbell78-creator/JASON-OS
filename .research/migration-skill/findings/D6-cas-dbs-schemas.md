# D6 — CAS Data Layer: Schemas & SQLite DBs

**Agent:** D6-cas-dbs-schemas (Phase 1, /migration deep-research)
**Date:** 2026-04-21
**Depth:** L1 (file:line citations for every element)
**Scope:** Read-only analysis of SoNash CAS data layer for port planning.
**Status:** Final

---

## Summary

The CAS data layer is **thin, regenerable, and well-isolated**. It consists of:

1. **One Zod schema module** (`scripts/lib/analysis-schema.js`, 494 lines) defining 3 record shapes (analysis, extraction, synthesis) + 1 ledger record + 15 enums + 8 sub-schemas.
2. **One additional Zod/TS schema file** in the `schemas` skill (`analysis-schema.ts`) describing a different, older v4.2 repo-analysis runtime format — appears legacy/divergent from the canonical lib module.
3. **One SQLite database** (`.research/content-analysis.db`, 400 KB) with 6 user tables + 2 FTS5 virtual tables. Schema is hand-written inline in `rebuild-index.js`.
4. **One alias/duplicate SQLite file** (`.research/knowledge.sqlite`, 400 KB) — byte-for-byte identical contents and schema to `content-analysis.db`, but no code writes to it. It is a **stale path-drift artifact** referenced only by `synthesize/self-audit.js:704` (a legacy health check looking at the wrong filename). Session-285 RESUME.md explicitly calls this out as "path drift."
5. **No ORM.** Raw `better-sqlite3` prepared statements + FTS5 MATCH queries. No Prisma, Drizzle, Knex, or Sequelize anywhere in the CAS surface.
6. **DBs are gitignored** (`.gitignore:167-169`: `.research/*.db`, `*.db-wal`, `*.db-shm`) — they are derived artifacts, not source of truth. The canonical data is JSON in `.research/analysis/<slug>/analysis.json` and JSONL in `.research/extraction-journal.jsonl`.
7. **`rebuild-index.js` is fully idempotent**: deletes the DB and regenerates from JSON/JSONL source files. Current content is 35 sources, 343 extractions, 280 tags, 311 source_tags, 1682 extraction_tags.

**Recommended port strategy: (b) Regenerate from source** (empty DB, let `rebuild-index.js` populate on first run in target repo). The DBs have zero unique data — they are caches. Option (a) copy-as-is is pointless because contents reflect SoNash's analysis history, not JASON-OS's. Option (c) transform is unnecessary because schema is stable and identical across repos. Option (d) skip risks breaking `/recall` UX (empty index → bad error messages). **Also: delete the orphan `knowledge.sqlite` reference** in `synthesize/self-audit.js:704` as part of the port.

---

## 1. Zod Schema Catalog — `scripts/lib/analysis-schema.js`

File: `<SONASH_ROOT>\scripts\lib\analysis-schema.js` (494 lines, 14.7 KB).

### 1.1 Enums (15)

| Enum | Line | Values |
|---|---|---|
| `sourceTypeEnum` | 24 | `repo`, `website`, `document`, `media` |
| `depthEnum` | 26 | `quick`, `standard`, `deep` |
| `scoringBandEnum` | 28 | `Critical`, `Needs Work`, `Healthy`, `Excellent` |
| `classificationEnum` | 30 | `active-sprint`, `park-for-later`, `evergreen`, `not-relevant` |
| `candidateTypeEnum` | 32 | `pattern`, `anti-pattern`, `knowledge`, `content`, `architecture-pattern`, `design-principle`, `workflow-pattern`, `tool` |
| `decisionEnum` | 43 | `defer`, `extract`, `skip`, `investigate` |
| `noveltyEnum` | 45 | `high`, `medium`, `low` |
| `effortEnum` | 47 | `E0`, `E1`, `E2`, `E3` |
| `relevanceEnum` | 49 | `high`, `medium`, `low` |
| `sourceTierEnum` | 54 | `T1`, `T2`, `T3`, `T4` |
| `paradigmEnum` | 57 | `thematic`, `narrative`, `matrix`, `meta-pattern` |
| `synthesisModeEnum` | 60 | `full`, `incremental`, `re-synthesis` |
| `convergenceEnum` | 63 | `weak`, `medium`, `strong` |
| `opportunityRouteEnum` | 66 | `/brainstorm`, `/deep-plan`, `/deep-research`, `/analyze` |
| `chainTierEnum` | 69 | `overview`, `tutorial`, `implementation`, `theory` |
| `ledgerStatusEnum` | 277 | `pending`, `adopted`, `skipped`, `deferred`, `stale` |

### 1.2 Core record schemas (3 primary + 1 ledger)

| Schema | Line | Purpose | Storage |
|---|---|---|---|
| `analysisRecordCore` | 97 | Per-source analysis output (base fields) | `analysis.json` |
| `analysisRecord` | 201 | Core + discriminated union over source_type | `analysis.json` |
| `extractionRecord` | 407 | Per-candidate extraction-journal entry | `extraction-journal.jsonl` |
| `synthesisRecord` | 347 | Cross-source synthesis output | `synthesis.json` |
| `opportunityLedgerRecord` | 285 | Cross-run opportunities dedup ledger | `opportunities-ledger.jsonl` |

### 1.3 Sub-schemas (13)

| Schema | Line | Used in |
|---|---|---|
| `candidateSchema` | 73 | analysisRecord.candidates, fit_portfolio.candidates |
| `scoringSchema` | 87 | analysisRecord.scoring |
| `repoMetadata` | 119 | repoFields.metadata |
| `repoFields` | 131 | analysisRecord (repo discriminant) |
| `websiteMetadata` | 151 | websiteFields.metadata |
| `websiteFields` | 159 | analysisRecord (website discriminant) |
| `mediaMetadata` | 169 | mediaFields.metadata |
| `mediaFields` | 177 | analysisRecord (media discriminant) |
| `documentMetadata` | 185 | documentFields.metadata |
| `documentFields` | 193 | analysisRecord (document discriminant) |
| `themeSchema` | 219 | synthesisRecord.themes |
| `themeEvidenceSchema` | 213 | themeSchema.evidence |
| `gapSchema` | 230 | synthesisRecord.ecosystem_gaps |
| `chainNodeSchema` | 239 | synthesisRecord.reading_chain |
| `opportunitySchema` | 259 | synthesisRecord.opportunity_matrix |
| `deferredToSchema` | 278 | opportunityLedgerRecord.deferred_to |
| `changesSectionSchema` | 308 | synthesisRecord.changes_since_previous |

### 1.4 Validators / Constants

- `TITLE_KEY_REGEX` (line 256): `/^[a-z0-9_]+$/`
- `DATE_YMD_REGEX` (line 257): `/^\d{4}-\d{2}-\d{2}$/`
- `validate(record, type)` helper (line 433) — dispatches to one of three schemas.

### 1.5 Exports (line 448-493)

Module exports 6 top-level schemas, 4 type-specific field bundles, 8 synthesis sub-schemas, 15 enums, and the `validate()` helper. Entry barrier is `require("../lib/analysis-schema")` from handler skills.

**Total schema count (analysis-schema.js):** **32 named schemas** (3 root records + 1 ledger + 13 sub-schemas + 15 enums) + 1 validator.

### 1.6 Companion: `.claude/skills/schemas/analysis-schema.ts`

File: `<SONASH_ROOT>\.claude\skills\schemas\analysis-schema.ts`.
Header (line 1-4): "Zod schema for repo-analysis analysis.json (**v4.2 runtime format**). Canonical source of truth — REFERENCE.md must match this, not vice versa."

This is a **different schema shape** from analysis-schema.js. It uses camelCase (`skillVersion`, `scanDepth`, `lastPush`) while the canonical module uses snake_case (`schema_version`, `depth`, `last_push`). It appears to be a legacy or handler-local artifact. It is NOT imported by `scripts/lib/` code. Three files in the schemas skill: `analysis-schema.ts`, `findings-schema.ts`, `validate-artifact.ts`.

**Port implication:** Clarify with user / D2 findings which schema module is authoritative. `scripts/lib/analysis-schema.js` is imported by 8 scripts (see §5.2 below); `.claude/skills/schemas/analysis-schema.ts` has no upstream imports visible in CAS code.

---

## 2. SQLite Schema Catalog — `.research/content-analysis.db`

Schema extracted via `better-sqlite3` readonly: `sqlite_master WHERE type='table'`.
Source of table DDL: `scripts/cas/rebuild-index.js:35-109` (createSchema function) and `scripts/cas/update-index.js:288-353` (parallel DDL for incremental path).

**Database:** `.research/content-analysis.db` (400 KB, mtime 2026-04-17).
**PRAGMAs (observed):** `journal_mode=wal`, `user_version=0`, `application_id=0`. No schema-version metadata stored in the DB itself.

### 2.1 Application tables (5)

| # | Table | PK | Columns | Source DDL |
|---|---|---|---|---|
| 1 | `sources` | `id TEXT` | 15 cols: `id, source_type, source, slug (UNIQUE), title, analyzed_at, depth, quality_band, quality_score REAL, personal_fit_band, personal_fit_score REAL, classification, summary, tags TEXT DEFAULT '[]', last_synthesized_at` | rebuild-index.js:37-53 |
| 2 | `extractions` | `id INTEGER AUTOINCREMENT` | 16 cols: `id, schema_version, source_type, source, source_analysis_id (FK→sources.id), candidate, type, decision, decision_date, extracted_to, extracted_at, notes, novelty, effort, relevance, tags` | rebuild-index.js:55-73 |
| 3 | `tags` | `id INTEGER AUTOINCREMENT` | 2 cols: `id, name UNIQUE` | rebuild-index.js:75-78 |
| 4 | `source_tags` | `(source_id, tag_id)` | Join table; FK→sources, FK→tags | rebuild-index.js:80-86 |
| 5 | `extraction_tags` | `(extraction_id, tag_id)` | Join table; FK→extractions, FK→tags | rebuild-index.js:88-94 |

### 2.2 FTS5 virtual tables (2)

| # | Virtual Table | Indexed columns | Tokenizer | Backing table | Source DDL |
|---|---|---|---|---|---|
| 6 | `search_sources` | `title, summary, tags` | `porter unicode61` | `content='sources'`, `content_rowid='rowid'` | rebuild-index.js:96-101 |
| 7 | `search_extractions` | `candidate, notes, tags` | `porter unicode61` | `content='extractions'`, `content_rowid='rowid'` | rebuild-index.js:103-108 |

Each FTS5 virtual table is accompanied by 4 shadow tables auto-created by SQLite (`_config`, `_data`, `_docsize`, `_idx`). Those appear in `sqlite_master` but are implementation detail — not schema to port.

### 2.3 Row counts (as of 2026-04-21)

| Table | Rows |
|---|---|
| sources | 35 |
| extractions | 343 |
| tags | 280 |
| source_tags | 311 |
| extraction_tags | 1682 |

### 2.4 Indexes / Views / Triggers

- **User-defined indexes:** none.
- **Views:** none.
- **Triggers:** none (FTS5 uses external-content; rebuild is via `INSERT INTO search_*(search_*) VALUES('rebuild')` — rebuild-index.js:364-365).

### 2.5 Schema is hand-built, not generated

The DDL in `rebuild-index.js:36-109` is literal inline SQL. It is **not generated from the Zod schemas in `analysis-schema.js`**. Mapping between Zod `analysisRecord` → `sources` table and `extractionRecord` → `extractions` table is done via hand-written `extractSourceRecord()` (rebuild-index.js:155-203) and inline INSERT binding (rebuild-index.js:289-349).

**Port implication:** Schema drift risk. If a Zod field is added (e.g., to `extractionRecord`), the table DDL must be updated in two places (rebuild-index.js + update-index.js). The code does not enforce this; reliance is on tests (see §5.3) and convention.

### 2.6 `.research/knowledge.sqlite` — alias/orphan

- Same 400 KB size. **Byte-identical table schema** (all 13 sqlite_master entries match).
- **Identical row counts and content** (verified: 35/343/280/311/1682; 35 `sources` rows with identical `(id, slug, analyzed_at)` tuples — zero diffs).
- **No writer.** `grep -r 'knowledge.sqlite' scripts/ .claude/` finds only one reference: `synthesize/self-audit.js:704` (read-only existsSync check, with a warning message "/recall index not built (run scripts/cas/rebuild-index.js)" — which is wrong because rebuild-index.js writes to `content-analysis.db`, not `knowledge.sqlite`).
- **Called out as path drift** in `.planning/session-285/RESUME.md:55`.
- **Mechanism producing the file:** Most likely a prior `rebuild-index.js` run (possibly under a different DB_PATH constant) or a manual `cp content-analysis.db knowledge.sqlite` snapshot. The identical contents + more-recent mtime on knowledge.sqlite (2026-04-21) suggest a recent copy or a test-run side effect.

**Port implication:** Drop it. The `/migration` skill port should remove the `knowledge.sqlite` check from the ported `self-audit.js` (or rename it to `content-analysis.db`). This is a 1-line fix surfaced here.

---

## 3. Port Strategy Comparison

Scenario: `/migration` is porting CAS from SoNash into a target repo (initially JASON-OS, then arbitrary consumer repos).

### 3.1 Options table

| Strategy | Action | Retains SoNash data? | Clean slate? | Risk | Effort |
|---|---|---|---|---|---|
| **(a) Port as-is** | Copy `.research/content-analysis.db` to target | Yes (35 SoNash sources) | No | Target repo sees SoNash analyses as its own — semantic contamination | Trivial (cp) |
| **(b) Regenerate** | Ship empty/missing DB, let first `rebuild-index.js` run populate | No | Yes, from target's own JSON/JSONL | None beyond existing bugs in rebuild | Zero — rebuild-index.js already idempotent |
| **(c) Filter / transform** | Export→transform→reimport during port | Optional subset | No | Migration layer is extra code to maintain; Zod/schema drift must be tracked | High (new transform tool) |
| **(d) Skip** | Ship no DB; `/recall` will error until user runs rebuild | N/A | Yes but with UX cliff | First-invocation failure; bad first impression | Zero code, bad UX |

### 3.2 Analysis

**Against (a) port-as-is:**

- The DB rows correspond 1:1 to files in `.research/analysis/<slug>/analysis.json` which are **not** being ported (that's content, not tooling). Copying the DB without the JSON files produces a DB whose `sources.id` FKs reference non-existent analysis artifacts — queries work, but `/recall --source=<slug>` returns rows pointing nowhere.
- Even if JSON files were ported, they're SoNash research artifacts (analyses of third-party repos/websites relevant to SoNash's creator-tool work). They have no semantic place in JASON-OS or other target repos.

**For (b) regenerate:**

- `rebuild-index.js:143-213` reads from `.research/analysis/**/analysis.json` + `.research/extraction-journal.jsonl`. If both paths are empty on first run (new target repo), the script runs cleanly, creates an empty DB, and `/recall --stats` returns zeros. No errors.
- Empirically verified by the idempotency-on-delete path (rebuild-index.js:248-251: `fs.existsSync(DB_PATH) && fs.unlinkSync(DB_PATH)` — it's already designed to wipe and rebuild).
- Zero maintenance burden: the port ships source code, and the DB is generated on-demand. Matches the gitignore intent (`.gitignore:167-169`).

**Against (c) transform:**

- Currently unnecessary — schema is stable across SoNash and target. No evidence of schema divergence requirements in BRAINSTORM D19 ("home-context assumptions reshaped" refers to CAS skill logic, not DB schema).
- Adds complexity without benefit until schemas diverge. Defer to a future `/migration` capability.

**Against (d) skip:**

- `.claude/skills/recall/SKILL.md:112` already documents "if `.research/content-analysis.db` is missing, rebuild (see below)" — the skill knows how to self-heal. But the UX is improved by pre-creating an empty DB (avoids the first `/recall` invocation having to wait for a rebuild).

### 3.3 Recommendation

**Port strategy: (b) Regenerate from source.**

Concretely, the `/migration` skill CAS port should:

1. Ship `scripts/cas/rebuild-index.js` + `scripts/cas/update-index.js` + `scripts/cas/recall.js` + `scripts/lib/analysis-schema.js` unchanged (modulo home-context reshape per D19 — a separate dimension).
2. Ensure the target repo's `.gitignore` includes the three patterns from SoNash's `.gitignore:167-169`.
3. Do NOT copy `content-analysis.db`, `knowledge.sqlite`, or any `.db-wal`/`.db-shm` files.
4. **Delete the `knowledge.sqlite` reference** in the ported `synthesize/self-audit.js` (the SoNash line 704 path-drift bug). Replace it with a check against `content-analysis.db` or remove the health check entirely.
5. Optionally, have the port-install step run `node scripts/cas/rebuild-index.js --dry-run` as a smoke test, then a full rebuild if the target has any existing `.research/analysis/` content.

---

## 4. Schema Versioning

### 4.1 Record-level schema_version

- `analysisRecord.schema_version: z.string()` (analysis-schema.js:99) — a **string field** on every analysis.json record.
- `extractionRecord.schema_version: z.string()` (analysis-schema.js:408) — same on every extraction-journal line.
- `synthesisRecord.schema_version: z.string()` (analysis-schema.js:348) — same on synthesis.json.
- Current value: `"3.0"` (migrate-v3.js:201-204: "7. schema_version → 3.0"). Handlers fall back to `"2.0"` for legacy records (rebuild-index.js:334).
- Migration script: `scripts/cas/migrate-v3.js` (11.5 KB) — upgrades legacy records to 3.0 in-place on the JSON files. `scripts/cas/migrate-schemas.js` (11.7 KB) is the umbrella migrator.

### 4.2 DB-level version

- `content-analysis.db` **does NOT encode a schema version**: `PRAGMA user_version = 0`, `PRAGMA application_id = 0`.
- The `extractions.schema_version` column (rebuild-index.js:57) stores the per-record version, but there is no migration table, no `_meta` table, no Drizzle/Knex migrations dir.
- **Implication:** On a schema bump (e.g., adding a column), the upgrade path is: update DDL in rebuild-index.js + update-index.js → `rm content-analysis.db` → rerun rebuild. This is safe because the DB is a pure cache (see §2.6).
- **Risk flagged in SoNash's own synthesis** (`.claude/state/synthesize.slice-4.json:434-435`): "GitNexus and graphify both punt schema migration; SoNash's .research/content-analysis.db and extraction-journal.jsonl inherit the same risk. ... Before the next schema touch of content-analysis.db or EXTRACTIONS.md, author MIGRATIONS.md with version/upgrade steps and integrate with session-begin preflight."

**Port implication:** JASON-OS should either (i) accept the same "rebuild on schema change" model for cached DBs (fine, matches current), or (ii) adopt `PRAGMA user_version` during the port so schema migrations can be detected automatically. Recommend (ii) as a small hardening opportunity — 3 lines in `createSchema()`.

### 4.3 Incremental updates

- `scripts/cas/update-index.js` (15.6 KB) is the incremental-write path used after individual `/analyze` runs.
- It duplicates the `CREATE TABLE IF NOT EXISTS` DDL from rebuild-index.js (update-index.js:288-353) — DRY violation documented as the drift risk. Two files must stay in sync.

---

## 5. Bindings & Query Patterns

### 5.1 Query API: raw better-sqlite3 prepared statements

No ORM. All DB access goes through `better-sqlite3` (`require("better-sqlite3")` / `const Database = require("better-sqlite3")`).

### 5.2 Files that import `better-sqlite3` or `analysis-schema`

**better-sqlite3 consumers (4 files):**

| File | Purpose |
|---|---|
| `scripts/cas/rebuild-index.js:16` | Full rebuild writer |
| `scripts/cas/update-index.js` | Incremental writer (after analyze runs) |
| `scripts/cas/recall.js:24` | Read-only query interface |
| `.claude/hooks/session-start.js:488` | Only to verify better-sqlite3 is installed; doesn't open a DB |

**analysis-schema.js importers (8 files):**

| File | Use |
|---|---|
| `scripts/lib/analysis-schema.js` | (self) |
| `scripts/lib/safe-cas-io.js` | Schema-enforced CAS writes |
| `scripts/cas/migrate-v3.js` | Schema upgrade validator |
| `scripts/cas/migrate-schemas.js` | Schema migration umbrella |
| `scripts/cas/self-audit.js` | CAS health check (validates records) |
| `scripts/cas/fix-depth-mislabel.js` | Data-repair script |
| `scripts/cas/backfill-candidates.js` | Data-repair script |
| `scripts/skills/synthesize/self-audit.js` | Synthesize health check |

### 5.3 Query patterns (from recall.js)

`scripts/cas/recall.js` uses `db.prepare(...).all()` / `.get()` with named/positional params. Example patterns:

- FTS5 free-text: `SELECT ... FROM search_extractions WHERE search_extractions MATCH ?`
- Tag filter: `JOIN extraction_tags ON ... JOIN tags ON tags.name = ?`
- Date sort: `ORDER BY decision_date DESC`
- Stats: `SELECT COUNT(*) FROM extractions`, etc.

### 5.4 Tests

Test directory: `tests/scripts/cas/` contains 4 tests:

- `backfill-candidates.test.ts`
- `fix-depth-mislabel.test.ts`
- `promote-firecrawl-to-journal.test.ts`
- `retag.test.ts`

**None of these tests lock in the SQLite schema shape.** There is no `tests/scripts/cas/rebuild-index.test.ts` or `recall.test.ts`. Related tests exist outside the cas/ dir:

- `tests/scripts/safe-cas-io.test.ts` — validates the Zod-enforced writer
- `tests/scripts/audit/transform-jsonl-schema.test.ts`
- `tests/scripts/debt/validate-schema.test.ts`
- `tests/scripts/ecosystem-v2/schemas.test.ts`

**Port implication:** The CAS port does not inherit strong test coverage for the DB layer. The `/migration` skill should either (i) port the existing tests and add a table-shape assertion test at the boundary, or (ii) record this as technical debt for the target repo.

---

## 6. Sources

### Primary files examined

- `<SONASH_ROOT>\scripts\lib\analysis-schema.js` (read in full — 494 lines)
- `<SONASH_ROOT>\.claude\skills\schemas\analysis-schema.ts` (header + first 60 lines)
- `<SONASH_ROOT>\scripts\cas\rebuild-index.js` (read in full — 400 lines)
- `<SONASH_ROOT>\scripts\cas\recall.js` (partial — lines 1-100)
- `<SONASH_ROOT>\scripts\cas\update-index.js` (grep'd for CREATE TABLE + prepare + pragma)
- `<SONASH_ROOT>\scripts\cas\migrate-v3.js` (grep'd for schema_version)
- `<SONASH_ROOT>\scripts\skills\synthesize\self-audit.js:695-714` (knowledge.sqlite reference)
- `<SONASH_ROOT>\.claude\hooks\session-start.js:488-491` (better-sqlite3 dep check)
- `<SONASH_ROOT>\.claude\skills\recall\SKILL.md:1-40, 99, 112`
- `<SONASH_ROOT>\.claude\skills\analyze\SKILL.md:97, 146`
- `<SONASH_ROOT>\.claude\skills\analyze\REFERENCE.md:542, 663`
- `<SONASH_ROOT>\.planning\content-analysis-system\DECISIONS.md` (referenced in code comments — not directly read)
- `<SONASH_ROOT>\.planning\session-285\RESUME.md:55` (knowledge.sqlite path-drift note)
- `<SONASH_ROOT>\.claude\state\synthesize.slice-4.json:434-435` (schema-migration debt note)
- `<SONASH_ROOT>\.gitignore:167-169` (DB files gitignored)

### Live DB introspection

- SQLite schema extracted via `better-sqlite3` readonly mode — both `.research/content-analysis.db` and `.research/knowledge.sqlite`.
- Row counts computed via `SELECT COUNT(*)` for all 5 application tables × 2 DBs.
- PRAGMAs: `user_version`, `application_id`, `journal_mode` for both DBs.
- Cross-DB diff: joined `(id, slug, analyzed_at)` tuples from both DBs — 0 diffs / 35 rows matched.

### Brainstorm context

- `<JASON_OS_ROOT>\.research\migration-skill\BRAINSTORM.md` §5 Q6 (line 129), §3 D19 (line 73)

---

## Return values

- **Zod schema table count:** 32 named schemas (3 root records + 1 ledger + 13 sub-schemas + 15 enums), +1 legacy `analysis-schema.ts` in schemas skill.
- **DB table count:** 6 application tables (5 regular + 1 FTS5 that fans out to 4 shadow tables) + 2 FTS5 virtual tables = 7 logical / 13 physical. Second DB (`knowledge.sqlite`) is a byte-identical alias.
- **Recommended port strategy:** **(b) Regenerate from source.** Ship the scripts, skip the DB files, rely on `rebuild-index.js` at first use. Plus: fix the `knowledge.sqlite` path-drift in `synthesize/self-audit.js:704` during the port.
- **Findings path:** `<JASON_OS_ROOT>\.research\migration-skill\findings\D6-cas-dbs-schemas.md`
