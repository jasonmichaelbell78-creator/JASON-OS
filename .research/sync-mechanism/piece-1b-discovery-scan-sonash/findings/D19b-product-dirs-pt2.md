# D19b: Product Dirs Part 2 — SoNash Discovery Scan

**Agent:** D19b
**Profile:** codebase
**Date:** 2026-04-18
**Sub-Question IDs:** D19b scope (SCHEMA_SPEC Section 5 coverage matrix)
**Scope:** functions/, hooks/, eslint-plugin-sonash/, analysis/, docs/, tests/, test/, config/, lib/, public/, src/, styles/, types/

---

## Per-Dir Summary Table

| Dir | Files | Size | Top Extensions | Subdirs | Subproject? | Claude-Adjacent? |
|-----|------:|-----:|----------------|---------|-------------|-----------------|
| `functions/` | 35 | 1.1M | .map(9), .js(9), .ts(8), .json(4), .nvmrc(1) | src/, lib/ | YES (own pkg.json/tsconfig/.gitignore) | None |
| `hooks/` (product) | 4 | 40K | .ts(4) | none | No | None |
| `eslint-plugin-sonash/` | 34 | 164K | .js(34) | rules/, lib/ | Partial (no pkg.json) | None |
| `analysis/` | 16 | 416K | .md(15), .csv(1) | none | No | None |
| `docs/` | 353 | 38M | .md(218), .jsonl(113), .json(10), .gitkeep(8), .txt(1) | 11 subdirs | No | None (but contains AI workflow docs — see notes) |
| `tests/` | 232 | 2.2M | .ts(220), .js(12) | 9 subdirs | No | None |
| `test/` | 11 | 21K | .json(11) | fixtures/ | No | None |
| `config/` | 1 | 4.0K | .json(1) | none | No | None |
| `lib/` | 34 | 249K | .ts(33), .tsx(1) | 8 subdirs | No | None |
| `public/` | 37 | 12M | .jpg(20), .png(10), .woff2(2), .svg(2), .json(1) | fonts/, images/, leaflet-icons/ | No | None |
| `src/` | 15 | 136K | .json(5), .md(4), .js(4), .ts(2) | dataconnect-generated/ | No | None |
| `styles/` | 1 | 8.0K | .css(1) | none | No | None |
| `types/` | 1 | 4.0K | .ts(1) | none | No | None |

---

## tests/ vs test/ Resolution

**RESOLVED: Both are active. They serve different purposes.**

- **`tests/`** (232 files, 2.2M) — The primary test suite. Contains .ts and .js spec files organized by domain: scripts/ (181 files, dominant), hooks/ (22), utils/ (6), semgrep/ (3), integration/ (2), e2e/ (1), enforcement/ (1), perf/ (1), security/ (1). Plus 14 root-level test files covering auth, collections, ESLint plugin, Firestore, etc.

- **`test/`** (11 files, 21K) — A fixtures-only companion directory. Contains exclusively JSON fixture files under `fixtures/ecosystem-v2/`: deferred-item-{full,partial,stub}.json, invocation-full.json, retro-{full,partial,stub}.json, review-{full,partial,stub}.json, warning-full.json. These are schema test fixtures, not spec files.

**Interpretation:** The naming split is deliberate — `tests/` holds executable specs, `test/` holds static data fixtures. Both are git-tracked and active. Neither is deprecated.

---

## hooks/ Product-Dir Disambiguation

**RESOLVED: React custom hooks — product code only.**

The top-level `hooks/` directory contains exactly 4 TypeScript files:
- `use-daily-quote.ts`
- `use-geolocation.ts`
- `use-journal.ts`
- `use-speech-recognition.ts`

These are React hooks following the `use-*` naming convention. This is **product application code**, not git hooks and not Claude Code infrastructure.

There is NO overlap with `.claude/hooks/` (covered by D3a-b). The product-dir `hooks/` is entirely unrelated to Claude Code infrastructure.

**Note:** A second React hooks location exists at `lib/hooks/` (contains `use-tab-refresh.ts`) — also product code, covered under the `lib/` entry.

---

## eslint-plugin-sonash/ Subproject Notes

This is a standalone ESLint plugin packaged within the monorepo:

- **Entry point:** `index.js` — registers all 32 rules
- **Rules directory:** `rules/` — 32 individual rule files (all .js)
- **Utility library:** `lib/ast-utils.js` — shared AST helpers

**No package.json** — the plugin is referenced directly from the root `eslint.config.mjs` rather than published as an npm package. This is an internal plugin.

**32 rules inventoried:**
no-async-component, no-callback-in-effect-dep, no-catch-console-error, no-div-onclick-no-role, no-effect-missing-cleanup, no-empty-path-check, no-hallucinated-api, no-hardcoded-secrets, no-index-key, no-math-max-spread, no-missing-error-boundary, no-non-atomic-write, no-object-assign-json, no-path-startswith, no-raw-error-log, no-shell-injection, no-sql-injection, no-stat-without-lstat, no-state-update-in-render, no-test-mock-firestore, no-toctou-file-ops, no-trivial-assertions, no-unbounded-array-in-state, no-unbounded-regex, no-unescaped-regexp-input, no-unguarded-file-read, no-unguarded-loadconfig, no-unsafe-division, no-unsafe-error-access, no-unsafe-innerhtml, no-unsafe-spread, no-writefile-missing-encoding.

**Portability assessment:** HIGH portability value — the security-focused rules (no-hardcoded-secrets, no-path-startswith, no-shell-injection, no-raw-error-log, etc.) mirror JASON-OS's own `security-helpers.js` patterns. Sanitization needed: plugin name `eslint-plugin-sonash` → `eslint-plugin-<project>`, and any rules referencing SoNash-specific APIs.

Tests exist: `tests/eslint-plugin-sonash.test.js` (root), `tests/scripts/skills/` directory.

---

## functions/ Subproject Boundary

`functions/` is a **full Firebase Cloud Functions subproject** with its own:
- `package.json` (name: "functions", node: 22 engine)
- `tsconfig.json` + `tsconfig.dev.json`
- `.gitignore` (excludes `lib/**/*.js` — compiled output)
- Own `node_modules/` (gitignored)

**Source files (functions/src/):** admin.ts, firestore-rate-limiter.ts, index.ts, jobs.ts, recaptcha-verify.ts, schemas.ts, security-logger.ts, security-wrapper.ts

**Compiled output (functions/lib/):** gitignored, not tracked. Contains .js + .map files.

**Dependencies:** firebase-admin, firebase-functions v7, @sentry/node v10, google-auth-library, zod v4.

---

## docs/ Classification

`docs/` is a **mixed developer + AI-workflow documentation hub** — the largest directory in scope at 38MB, 353 files.

**Developer-facing:** CLI_USER_GUIDE.md, GITHUB_GUIDE.md, DEVELOPMENT docs, SECURITY.md, MCP_SETUP.md, testing checklists, PR workflow docs.

**AI-workflow / Claude-adjacent (not Claude Code artifacts, but referenced by Claude):** `docs/agent_docs/` (12 files) contains AGENT_ORCHESTRATION.md, SKILL_AGENT_POLICY.md, CODING_TOOLS_REFERENCE.md, TOKEN_MONITORING.md — these are guidance documents that feed into Claude's context. They are NOT hooks/agents/skills but may be referenced by SoNash's CLAUDE.md.

**Audit records:** `docs/audits/` (119 files) — AI review sessions, audit results, multi-AI comparisons.

**Technical debt tracking:** `docs/technical-debt/` (32 files).

**Archived decisions:** `docs/archive/` (133 files) — largest subdir, historical.

**Note for D-agent cross-reference:** `docs/schemas/agent-token-usage.schema.json` — a JSON schema for agent token usage tracking. This may relate to hook-level state files. Flag for D21 (workflow identifier) and D22 (schema surveyor).

---

## src/ Note: Gitignored Directory

`src/` is **NOT git-tracked**. The `.gitignore` file excludes `src/dataconnect-generated`. The directory exists on disk (15 files, 136K — auto-generated Firebase DataConnect types) but is a gitignored working-tree artifact. It should NOT be included in sync scope. Listed in SCHEMA_SPEC coverage matrix as D19b scope — inventory complete, portability = not-portable-product, status = not tracked.

---

## Final Census: Top-Level Git-Tracked Dirs vs D-Agent Coverage

All top-level git-tracked directories per `git ls-tree --name-only HEAD`:

| Top-level Dir | Assigned D-agent | Status |
|---------------|-----------------|--------|
| `.agent/` | D18 | Covered |
| `.agents/` | D18 | Covered |
| `.claude/` (skills, agents, teams, commands, hooks, canonical-memory, state, other) | D1a-f, D2a-b, D3a-b, D5, D17a-b | Covered |
| `.gemini/` | D17a-b | Covered |
| `.github/` | D16 | Covered |
| `.husky/` | D17a-b | Covered |
| `.planning/` | D15a-b | Covered |
| `.qodo/` | D17a-b | Covered |
| `.research/` | D14a-c | Covered |
| `.semgrep/` | D16 | Covered |
| `.vscode/` | D17a-b | Covered |
| `analysis/` | D19b (this agent) | Covered |
| `app/` | D19a | Covered per SCHEMA_SPEC matrix |
| `components/` | D19a | Covered per SCHEMA_SPEC matrix |
| `config/` | D19b (this agent) | Covered |
| `data/` | D19a | Covered per SCHEMA_SPEC matrix |
| `dataconnect/` | D19a | Covered per SCHEMA_SPEC matrix |
| `docs/` | D19b (this agent) | Covered |
| `eslint-plugin-sonash/` | D19b (this agent) | Covered |
| `functions/` | D19b (this agent) | Covered |
| `hooks/` (product) | D19b (this agent) | Covered |
| `lib/` | D19b (this agent) | Covered |
| `public/` | D19b (this agent) | Covered |
| `scripts/` | D6a-d, D7, D8a-b, D9, D10a-b, D11a-b, D12 | Covered |
| `src/` | D19b (this agent) | Covered (gitignored, noted) |
| `styles/` | D19b (this agent) | Covered |
| `test/` | D19b (this agent) | Covered |
| `tests/` | D19b (this agent) | Covered |
| `tool-configs/` | D18 | Covered |
| `tools/` | D13 | Covered |
| `types/` | D19b (this agent) | Covered |

**Root-level files** (ROADMAP.md, ROADMAP.md.bak, CHANGELOG.md, CLAUDE.md, AI_WORKFLOW.md, ARCHITECTURE.md, CODE_OF_CONDUCT.md, CONTRIBUTING.md, DEVELOPMENT.md, DOCUMENTATION_INDEX.md, LICENSE, META_ROADMAP.md, README.md, ROADMAP_FUTURE.md, ROADMAP_LOG.md, SECURITY.md, SESSION_CONTEXT.md, release-notes.md, geocoding_cache.json, framer-motion.d.ts, web-speech-api.d.ts, next-env.d.ts, mcp.json.example, llms.txt + ~15 config dotfiles): Covered by D17a-b.

**CENSUS VERDICT: PASS** — Every git-tracked top-level directory is covered by at least one D-agent per the SCHEMA_SPEC Section 5 coverage matrix. No uncovered directories found.

**Note on SCHEMA_SPEC matrix discrepancy:** The SCHEMA_SPEC Section 5 matrix lists `analysis/`, `app/`, `components/`, `config/`, `data/`, `dataconnect/`, `docs/`, `eslint-plugin-sonash/` under D19a, but this agent (D19b) has inventoried `analysis/`, `docs/`, `eslint-plugin-sonash/`, and `config/` in addition to its primary D19b dirs. This reflects the actual assignment in the spawn prompt, which overrides the matrix for these 4 dirs.

---

## Learnings for Methodology

1. **tests/ vs test/ naming split is semantically deliberate in SoNash.** Future codebase scans should not assume two test directories means one is deprecated — check content type (specs vs fixtures) before classifying.

2. **React hooks dir naming collision.** `hooks/` at repo root looks like it could be git hooks or Claude hooks — filename inspection (use-*.ts pattern) immediately disambiguates. This 2-second check should be part of the D19 methodology for any repo with a `hooks/` product dir.

3. **lib/ contains its own hooks/ subdir.** SoNash has React hooks in two places: `hooks/` (top-level, 4 files) and `lib/hooks/` (1 file). A comprehensive product code scan must recurse lib/ to surface this.

4. **src/ gitignore trap.** SCHEMA_SPEC coverage matrix includes `src/` as a D19b dir, but `src/` is entirely gitignored (auto-generated DataConnect output). Agents must always cross-check filesystem dirs against git ls-tree to avoid treating gitignored dirs as product code to sync.

5. **eslint-plugin-sonash portability is an underrated finding.** This 32-rule security plugin has strong overlap with JASON-OS's security-helpers.js concerns. It should be evaluated for port as part of the sync-mechanism, not just cataloged as "not portable."

6. **functions/ is a proper subproject.** It has its own package.json, tsconfig, .gitignore, and node_modules. Sync treatment: the source TypeScript files in functions/src/ are portable in structure; the compiled lib/ is gitignored and not portable. Deployment via Firebase CLI is project-specific.

7. **docs/ is the largest single directory at 38MB.** The .jsonl files (113 files) appear to be structured audit/aggregation output — these may have data contract relevance (flag for D22). docs/agent_docs/ contains AI guidance docs that should be reviewed for JASON-OS relevance in the port phase.

8. **analysis/ appears to be output of a prior AI workflow** (multi-pass inventory/analysis). This pattern — AI generating analysis artifacts into a dedicated dir — is reusable methodology. Consider whether JASON-OS sync-mechanism should produce similar output.

9. **D19a/D19b split across SCHEMA_SPEC matrix was reassigned.** The spawn prompt gave D19b responsibility for dirs listed under D19a in the SCHEMA_SPEC matrix (analysis, docs, eslint-plugin-sonash, config). This indicates the SCHEMA_SPEC matrix was a pre-dispatch draft; actual agent assignments diverged. D22 should reconcile the coverage matrix against actual coverage.

---

## Gaps and Missing References

1. **D19a output does not exist** — no D19a-product-dirs-pt1.md was found in the findings directory at scan time. This agent cannot cross-reference format or verify what app/, components/, data/, dataconnect/ covered. If D19a ran, its output was not committed or was placed elsewhere. This is a gap that should be resolved before synthesis.

2. **docs/agent_docs/ contains workflow guidance** — SKILL_AGENT_POLICY.md, AGENT_ORCHESTRATION.md, CODING_TOOLS_REFERENCE.md. These were not deep-read (per Section 7 protocol). They may duplicate or extend .claude/skills/ documentation. Flagged for deeper review in sync phase.

3. **docs/schemas/agent-token-usage.schema.json** — Not deep-read. May represent a data contract between hooks and state files. Flagged for D21 (composite workflow identifier) and D22 (schema surveyor).

4. **tests/scripts/ (181 files)** — By far the dominant subdir. Internal structure has 15+ subdirectories. Not deep-read per Section 7. Coverage relationship to the scripts/ D6-D12 agents is not mapped here.

5. **eslint-plugin-sonash package.json absence** — The plugin has no package.json. It's consumed via root eslint.config.mjs. Whether there was ever a published npm version is unknown.
