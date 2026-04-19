# D11b: scripts/ Small Clusters Part 2

**Agent:** D11b
**Profile:** codebase
**Date:** 2026-04-18
**Scope:** scripts/planning/ (8 files), scripts/planning/lib/ (2 files), scripts/repo-analysis/ (2 files), scripts/research/ (1 file), scripts/secrets/ (2 files), scripts/skills/ (7 subdir × 1 file each), scripts/tasks/ (1 file), scripts/hooks/ (1 file), scripts/mcp/ (5 real files)

---

## Cluster 1: scripts/planning/ (6 scripts + lib)

### Architecture

The planning cluster implements a **JSONL-source-of-truth pattern** (T2/D79): JSONL files are the authoritative data store; MD files are generated views. The cluster has three layers:

1. **Generator scripts** — read JSONL, emit MD views:
   - `generate-decisions.js` — DECISIONS.md (the full implementation reference)
   - `generate-discovery-record.js` — DISCOVERY_RECORD.md (all decisions/tenets/directives)
   - `render-todos.js` — TODOS.md (active/completed/archived todo table)

2. **Mutation CLI** — safe JSONL mutation with integrity guards:
   - `todos-cli.js` — advisory-locked, regression-checked, pre/post integrity-validated mutations. Created specifically to prevent silent data loss due to compaction-race overwrites (T30). Dispatches 8 subcommands: add, edit, complete, progress, delete, reprioritize, archive, validate.

3. **Validation and maintenance:**
   - `validate-jsonl-md-sync.js` — pre-commit validator that runs generators in --dry-run mode and diffs output against disk; exits non-zero if any MD is stale. Enforced at pre-commit for planning JSONL changes (D84/D85).
   - `backfill-tenet-evidence.js` — maintenance script that backfills tenet evidence arrays by scanning all decision fields for T-ID references.

4. **Library** (`scripts/planning/lib/`):
   - `read-jsonl.js` — shared ESM JSONL parser + `escapeCell()` for MD table escaping. Wraps `safe-fs.streamLinesSync` for arbitrary file sizes. Distinct from the root-level `scripts/lib/read-jsonl` (CJS).
   - `package.json` — `{"type": "module"}` only, forces ESM resolution for the lib subdir.

**Portability:** All 6 scripts are `sanitize-then-portable`. The generator pattern (JSONL→MD) is highly portable; the specific section ranges (D1-D83, `.planning/system-wide-standardization` paths) are SoNash-specific and require replacement. `todos-cli.js` is the most portable intact — the mutex+regression-guard pattern should port directly to JASON-OS /todo skill.

**Module system:** All ESM (`import`/`export`). `backfill-tenet-evidence.js` uses a hybrid CJS wrapper (`createRequire`) to consume the older `scripts/lib/read-jsonl` (CJS) while being an ESM file itself.

---

## Cluster 2: scripts/repo-analysis/ (2 files)

### Architecture

Support scripts for the `/repo-analysis` skill. Created Session #257.

- `check-tools.js` — CJS tool manifest generator. Checks 13 external CLIs (7 Tier 1 core, 6 Tier 2 language-conditional) and outputs JSON manifest with availability/version/tier per tool. Supports `--pretty`. Used by `/repo-analysis` skill for D6 graceful degradation.
- `install-tools.sh` — bash installer with cross-platform fallback chains per tool: go install → brew → GitHub release download → npm global → pip. Non-fatal by design. Includes Zip Slip and Tar Slip path-traversal prevention before extraction. NPM packages version-pinned. Supports `--verify` to check-only without installing.

**Portability:** Both are `portable` — the tool list is skill-agnostic enough to reuse. The `install-tools.sh` is well-structured for adaptation.

---

## Cluster 3: scripts/research/ (1 file)

### Architecture

- `validate-research.js` — CJS. 8-check integrity validator for deep-research pipeline outputs across all `.research/` topics. Checks: source traceability, claim coverage, findings inventory count vs agentCount, confidence reconciliation, post-pipeline delta (claimCount vs JSONL lines), bidirectional claim-to-report, source freshness (>30 days), verification verdict persistence. Supports `--topic` filter and `--fix` mode (auto-corrects metadata counts). Writes validation state to `.claude/state/research-validation.jsonl`.

**Portability:** `sanitize-then-portable`. The 8-check model maps directly to the deep-research pipeline contract in JASON-OS. Paths need updating (`.research/` is the same convention). The `SKIP_TOPICS` set is project-specific.

---

## Cluster 4: scripts/secrets/ (2 files)

### Architecture

Operator-level tools for AES-256-GCM encryption of `.env.local` to `.env.local.encrypted` (committable).

- `encrypt-secrets.js` — CJS. Validates passphrase length ≥8, checks for actual token values before encrypting, atomic write via temp+rename, secure file mode 0o600.
- `decrypt-secrets.js` — CJS. Skips if `.env.local` already has tokens. Supports `--stdin`, `--quiet`, `SECRETS_PASSPHRASE` env var, TTY hidden input (setRawMode), and fallback for non-TTY.

**Crypto spec:** AES-256-GCM, PBKDF2 (100k iterations, sha256), salt=32B, iv=16B, tag=16B. Format: `salt | iv | tag | ciphertext`.

**Portability:** `portable`. Pattern is completely project-agnostic. Note: `encrypt-secrets.js` uses an inline `getErrorMessage` helper instead of `scripts/lib/sanitize-error.cjs` — a minor inconsistency vs the security standard.

**Scope:** `user` — operator-only tools, not part of the AI workflow.

---

## Cluster 5: scripts/skills/ (7 subdirs, 7 × self-audit.js)

### Architecture

Each of the 7 subdirs under `scripts/skills/` contains exactly one file: `self-audit.js`. These are per-skill verification scripts following the pattern documented in `.claude/skills/_shared/SELF_AUDIT_PATTERN.md`.

All are CJS, entry-point scripts, caller-invoked by skill workflows or manually.

### scripts/skills/ ↔ .claude/skills/ Cross-Reference Matrix

| scripts/skills/ subdir | .claude/skills/ counterpart | Match |
|---|---|---|
| `analyze/` | `.claude/skills/analyze/` | YES |
| `document-analysis/` | `.claude/skills/document-analysis/` | YES |
| `media-analysis/` | `.claude/skills/media-analysis/` | YES |
| `repo-analysis/` | `.claude/skills/repo-analysis/` | YES |
| `skill-audit/` | `.claude/skills/skill-audit/` | YES |
| `synthesize/` | `.claude/skills/synthesize/` | YES |
| `website-analysis/` | `.claude/skills/website-analysis/` | YES |

**7 of 7 scripts/skills/ subdirs have exact .claude/skills/ counterparts.**

### self-audit.js Differentiation

The scripts are NOT identical copies. Each is genuinely distinct, tuned to its skill's specific verification requirements:

- **`analyze/self-audit.js`** (382 lines): Router-specific checks — CAS floor, 4-handler Handoff Contract (checks SKILL.md headers for `auto_detected_type`), routing-log presence, extraction-journal, EXTRACTIONS.md mtime. Dims 1, 3, 5, 8, 9. Dim 6 N/A (deterministic router).
- **`skill-audit/self-audit.js`** (839 lines): Reference implementation per the pattern doc. All 9 MUST dimensions for Complex tier. State-file driven. Includes git-grep-based orphan detection (Dim 2), stub-marker scanning (Dim 3), YAML frontmatter validation (Dim 8), regression via previous_run comparison (Dim 7), cross-reference integrity replacing multi-agent check (Dim 6, Session #281 rework). Validates `npm run skills:validate`.
- **`document-analysis/`, `media-analysis/`, `repo-analysis/`, `synthesize/`, `website-analysis/`**: Handler-role self-audits. Appear to cover the CAS output contract dimensions for their respective handler roles (analysis.json, SQLite row, etc.) but were not read in full — scope is proportional.

**D8b carry-forward confirmed:** The pattern mirrors the hook-ecosystem-audit `scoring.js` approach — each skill owns its own verification script, co-located in `scripts/skills/<name>/`.

**Portability:** All are `sanitize-then-portable`. The dimension framework and exit-code contract are portable. Skill-specific paths and state file names require replacement per target skill.

---

## Cluster 6: scripts/tasks/ (1 file)

### Architecture

- `resolve-dependencies.js` — CJS. Dependency-aware task ordering for ROADMAP.md. Parses `[depends: X1, X2]` annotations, builds a DAG using Kahn's topological sort (BFS, O(1) dequeue), detects circular dependencies via DFS. Outputs ready/blocked/completed task lists. Supports `--all`, `--json`, `--blocked`. Handles multi-line depends blocks, CANON-XXXX and DEBT-XXXX ID patterns, and wrapped annotations on continuation lines. Regex DoS guards (bounded quantifiers, SonarCloud S5852).

**Portability:** `sanitize-then-portable`. ROADMAP.md path is project-specific; the DAG algorithm is fully portable.

---

## Cluster 7: scripts/hooks/ (1 file)

### Architecture

**Note: This is `scripts/hooks/`, NOT `.claude/hooks/` which D3 covered.**

- `check-review-record.js` — CJS post-commit hook utility. Detects fix-prefixed PR review commits matching pattern `fix(?:\([^)]*\))?:\s+PR #(\d+)\s+R(\d+)` and warns if no corresponding JSONL record exists in `.claude/state/reviews.jsonl`. Non-blocking (post-commit cannot reject). Exports helper functions for testing (`require.main` guard). Handles both canonical id format (`review-prN-rN`) and legacy `pr`/`round` fields, plus title round extraction.

Decision origin: D8/D18 from review-data-architecture deep-plan (2026-04-17). Qodo R1 refinements applied (prior regex was too broad — matched merge summaries referencing prior PRs).

**Portability:** `sanitize-then-portable`. The JSONL path and commit message pattern are portable in structure; `reviews.jsonl` is the SoNash PR review tracking format.

---

## Cluster 8: scripts/mcp/ (5 real files, excluding node_modules)

### Architecture

Self-contained MCP server package for SonarCloud integration.

**Real files:**
1. `sonarcloud-server.js` — ESM MCP server. Provides 4 tools via stdio transport using `@modelcontextprotocol/sdk`:
   - `get_security_hotspots` — paginated, filter by status
   - `get_issues` — paginated, filter by type/severity
   - `get_quality_gate` — project/PR status
   - `get_hotspot_details` — single hotspot deep detail
   Security: SSRF protection (allowlist: sonarcloud.io, sonarqube.com; optional localhost via SONAR_ALLOW_LOCAL), input validation (max 500 chars), error sanitization, 30s request timeout, pagination safety limit (100 pages). Proxy support via undici ProxyAgent.

2. `package.json` — NPM manifest. type:module, @modelcontextprotocol/sdk ^1.26.0, node >=18.
3. `manifest.json` — MCP manifest v0.3. 4 tools declared. SONAR_TOKEN as required+sensitive user_config field. Template refs: `${user_config.SONAR_TOKEN}`.
4. `package-lock.json` — dependency lockfile (not inventoried separately).
5. `sonarcloud.mcpb` — binary zip archive (3.2MB) containing manifest.json + packaged node_modules lock. MCP marketplace distribution artifact. Created 2026-01-10.

**Portability:** `sanitize-then-portable`. The server logic is completely portable; only the `author.name` ("SoNash Project") and project-key conventions need replacement. SONAR_TOKEN and SONAR_URL are user-supplied at runtime.

**Scope:** `user` — operator-installed, credentials via environment.

---

## Summary Table

| Cluster | Files | Records | Portable | Sanitize-then-portable | Not Portable |
|---|---|---|---|---|---|
| planning/ (scripts) | 6 | 6 | 0 | 6 | 0 |
| planning/lib/ | 2 | 2 | 1 | 0 | 0 |
| repo-analysis/ | 2 | 2 | 2 | 0 | 0 |
| research/ | 1 | 1 | 0 | 1 | 0 |
| secrets/ | 2 | 2 | 2 | 0 | 0 |
| skills/ (7 subdirs) | 7 | 7 | 0 | 7 | 0 |
| tasks/ | 1 | 1 | 0 | 1 | 0 |
| hooks/ (scripts/) | 1 | 1 | 0 | 1 | 0 |
| mcp/ | 5 | 5 | 0 | 4 | 0 |
| **TOTAL** | **27** | **27** | **5** | **20** | **0** |

Note: `planning/lib/package.json` and `mcp/package-lock.json` are configs counted in cluster totals but as `config` type in JSONL.

---

## scripts/skills/ ↔ .claude/skills/ Cross-Reference Count

**7 of 7** scripts/skills/ subdirs have exact .claude/skills/ counterparts. Cross-reference is complete with zero gaps.

No scripts/skills/ subdir exists without a .claude/skills/ counterpart, and all 7 counterparts were confirmed present in `.claude/skills/`.

---

## mcp/ Source File Purpose

The 5 real MCP files form a self-contained, distributable SonarCloud integration package:
- `sonarcloud-server.js` — server logic (stdio MCP transport, 4 tools)
- `package.json` — npm package manifest
- `manifest.json` — MCP registry/installer manifest declaring tools and user config
- `package-lock.json` — dependency lockfile
- `sonarcloud.mcpb` — binary distribution artifact (zip containing manifest + locked deps)

The `.mcpb` format is a Claude MCP marketplace packaging convention. This cluster is the only MCP server source code found in `scripts/` (the other MCP server is an external dependency via `.claude/settings.json`).

---

## Learnings for Methodology

1. **planning/ lib subdir pattern**: A `package.json` containing only `{"type": "module"}` is used to force ESM resolution in a subdirectory when the parent is CJS. Scanners must check for these mini-package.jsons in subdirs, not just at root level, to correctly classify `module_system`.

2. **Hybrid CJS/ESM in one file**: `backfill-tenet-evidence.js` is an `.js` ESM file (per package.json type:module) that uses `createRequire` to consume CJS modules. This pattern cannot be inferred from extension alone — must check both the nearest `package.json type` field AND explicit require/import usage, as the schema spec requires.

3. **self-audit.js naming pattern**: All per-skill self-audit scripts use the filename `self-audit.js` and live at `scripts/skills/<name>/self-audit.js`. This naming convention is enforced by the pattern doc. Future scan agents should know: if they see `scripts/skills/<name>/self-audit.js`, it is always a per-skill verification script, never a copy of a canonical.

4. **scripts/skills/ vs scripts/<name>/**: There is a namespace collision risk between `scripts/skills/repo-analysis/` (the self-audit) and `scripts/repo-analysis/` (check-tools + install-tools). These are genuinely different in purpose — future agents should not conflate them.

5. **scripts/hooks/ vs .claude/hooks/**: The schema spec coverage matrix and D3's scope covers `.claude/hooks/`. `scripts/hooks/` is a separate product-level utility cluster. One file (check-review-record.js) lives here. No overlap with .claude/hooks/ coverage.

6. **.mcpb format**: Confirmed as a zip archive. MCP bundle format for marketplace distribution. Contains manifest.json + node_modules lock. Binary, not text. Should be classified as `config` type (package artifact), not `script` or `tool`.

7. **sanitize-error inconsistency in secrets/**: `encrypt-secrets.js` uses an inline `getErrorMessage` helper instead of importing `scripts/lib/sanitize-error.cjs`. This is an inconsistency vs the project security standard (CLAUDE.md §5). Ports should normalize to the canonical helper.

8. **todos-cli.js as the strongest port candidate**: The advisory-lock + regression-guard + pre/post integrity-check pattern in todos-cli.js is the most directly portable item in this cluster to JASON-OS's /todo skill. It solves a real problem (compaction-race data loss, T30) that JASON-OS faces too.

---

## Gaps

1. **`document-analysis`, `media-analysis`, `synthesize`, `website-analysis` self-audit scripts were not fully read** — the cluster scope was large enough that after reading `analyze/self-audit.js` (382 lines) and `skill-audit/self-audit.js` (839 lines) in full, the remaining 4 were classified via header/first-200-lines inspection. Their exact dimension coverage is unconfirmed beyond "follows SELF_AUDIT_PATTERN.md". D21 (workflow identifier) may want to deep-read these.

2. **`mcp/package-lock.json`** was not inventoried as a separate JSONL record — it is a generated artifact. If future agents need dependency graphs from it, it should be explicitly inventoried.

3. **`planning/` dependency graph vs actual skills that call these scripts** — it is known that `/todo` skill calls `todos-cli.js` and generators are called by pre-commit hooks, but the full call graph is not inventoried here. D21 (workflow identifier / composites) should capture this.

4. **`scripts/mcp/node_modules` size and dependency tree** — excluded per scope. The `undici` dependency (for proxy support) is notable; other deps via @modelcontextprotocol/sdk. D21 or a tools agent may want this if JASON-OS plans to port the MCP server.
