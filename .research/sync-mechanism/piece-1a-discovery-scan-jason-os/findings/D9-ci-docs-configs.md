# D9 Inventory: CI Workflows, Root Docs, and Configs

**Agent:** D9
**Date:** 2026-04-18
**Scope:** `.github/workflows/` (7 files), root *.md (3 files), configs (root + `.claude/` non-hooks + `.husky/`)
**Total units inventoried:** 20

---

## CI Workflows (`.github/workflows/`)

| # | Name | Size | Trigger | Portability | Required Secret | External Service | Notes |
|---|------|------|---------|------------|-----------------|-----------------|-------|
| 1 | `auto-merge-dependabot.yml` | 963 B | PR to main (dependabot actor) | portable | `GITHUB_TOKEN` (built-in) | GitHub Actions, Dependabot | Auto-merge minor/patch only |
| 2 | `cleanup-branches.yml` | 2567 B | Schedule (Mon 6am) + dispatch | portable | `GITHUB_TOKEN` (built-in) | GitHub Actions | Deletes merged branches >7 days |
| 3 | `codeql.yml` | 1406 B | Push/PR to main + weekly | portable | none (security-events implicit) | GitHub CodeQL | Language hardcoded: javascript-typescript |
| 4 | `dependency-review.yml` | 708 B | PR to main | portable | `GITHUB_TOKEN` (built-in) | GitHub Actions | Fails on critical severity |
| 5 | `scorecard.yml` | 1584 B | Push to main + weekly | portable | none (id-token:write) | OpenSSF Scorecard | Publishes to OpenSSF REST API |
| 6 | `semgrep.yml` | 1374 B | Push/PR to main + weekly | portable | none | Semgrep Docker Hub | Container pinned by tag (not SHA) |
| 7 | `sonarcloud.yml` | 1757 B | Push/PR to main + dispatch | sanitize-then-portable | `SONAR_TOKEN` (required) | SonarCloud | Reads `sonar-project.properties` |

**Key observation:** 6 of 7 workflows are fully portable. Only `sonarcloud.yml` requires a project-specific secret (`SONAR_TOKEN`) and companion properties file. All GitHub Actions are SHA-pinned for supply-chain hygiene, with one exception: Semgrep's Docker image is pinned by tag (`:1.95.0`), not by digest — noted in the file as a known limitation.

---

## Root Docs

| # | Name | Size | Scope | Portability | Notes |
|---|------|------|-------|------------|-------|
| 1 | `CLAUDE.md` | 7724 B | project | sanitize-then-portable | Primary AI context — JASON-OS-specific content; strip project name + SoNash refs before porting |
| 2 | `SESSION_CONTEXT.md` | 3979 B | project | not-portable | Session state file; schema (counter, status, goals) is reusable, content is ephemeral |
| 3 | `LICENSE` | 1086 B | project | sanitize-then-portable | MIT; update copyright holder + year |

**Note on count discrepancy:** The assignment anticipated 2 root docs; 3 were found (`CLAUDE.md`, `SESSION_CONTEXT.md`, `LICENSE`). LICENSE was not flagged by earlier agents because it is not project-specific AI context but was present in the root `ls`. Included for completeness.

---

## Configs (Root + `.claude/` non-hooks + `.husky/`)

| # | Name | Path | Size | Scope | Portability | Key Dependencies | Notes |
|---|------|------|------|-------|------------|-----------------|-------|
| 1 | `settings.json` (non-hooks) | `.claude/settings.json` | 2819 B | project | sanitize-then-portable | MCP server names, statusline-command.sh | MCP server names must match consuming project's config |
| 2 | `package.json` | `package.json` | 486 B | project | sanitize-then-portable | husky ^9 | Update `name` field; rest portable |
| 3 | `package-lock.json` | `package-lock.json` | 798 B | project | portable | package.json | Auto-generated lockfile; regenerated on npm install |
| 4 | `.nvmrc` | `.nvmrc` | 4 B | universal | portable | Node.js 22 | Single value; copy as-is or bump LTS version |
| 5 | `.gitignore` | `.gitignore` | 918 B | project | sanitize-then-portable | none | Sanitize: remove tools/statusline/ entries if not using statusline |
| 6 | `.gitattributes` | `.gitattributes` | 1131 B | universal | portable | none | LF-normalization policy; copy as-is |
| 7 | `sonar-project.properties` | `sonar-project.properties` | 867 B | project | sanitize-then-portable | sonarcloud.yml, SONAR_TOKEN | Must update projectKey + organization |
| 8 | `_shared.sh` | `.husky/_shared.sh` | 2092 B | universal | portable | `.git/hook-output.log` | POSIX sh; sanitized from SoNash; copy as-is |
| 9 | `pre-commit` | `.husky/pre-commit` | 1370 B | universal | portable | _shared.sh, gitleaks binary | Foundation minimum; 14+ checks planned |
| 10 | `pre-push` | `.husky/pre-push` | 5169 B | universal | portable | _shared.sh, node, .claude/hook-warnings.json | Largest hook; inline Node.js escalation-gate + block-main |

---

## Portability Summary

| Category | portable | sanitize-then-portable | not-portable |
|----------|----------|----------------------|-------------|
| CI Workflows (7) | 6 | 1 (sonarcloud.yml) | 0 |
| Root Docs (3) | 0 | 2 (CLAUDE.md, LICENSE) | 1 (SESSION_CONTEXT.md) |
| Configs (10) | 5 (.nvmrc, .gitattributes, package-lock.json, _shared.sh, pre-commit, pre-push) | 4 (settings.json, package.json, .gitignore, sonar-project.properties) | 0 |
| **Total (20)** | **11** | **7** | **2** |

---

## Settings.json Non-Hook Coverage

D3 owns the hooks section (lines 35-113). This inventory covers the remaining sections:

- **`permissions.allow`** (16 entries): Edit, Write, Bash(*), WebSearch, WebFetch, Skill, 5 MCP tool patterns
- **`permissions.deny`** (4 entries): force-push, push-to-main, reset-hard, rm-rf — the four destructive operations blocked at the permission layer
- **`env`**: `CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1` (enables team agents), `CLAUDE_CODE_GLOB_TIMEOUT_SECONDS=60`
- **`enableAllProjectMcpServers: true`**: auto-enables any MCP server in project config
- **`disabledMcpjsonServers: []`**: none disabled
- **`statusLine`**: `{ type: "command", command: "bash .claude/statusline-command.sh", padding: 2 }`

**Sanitization requirement for settings.json:** MCP server names in `permissions.allow` are bound to the user's personal MCP config (sonarcloud, memory, sequential-thinking, context7, episodic-memory). A consuming project must enumerate the MCP tools they have configured.

---

## Learnings for Methodology

### Agent sizing
This assignment (CI workflows + root docs + configs including husky) was appropriately sized for a single agent. Total 20 files across three sub-categories. Read time was bounded — the only large file was `pre-push` (5169 B, 124 lines) which remained manageable. For SoNash with 17 CI workflows (2.4x) + 16 root docs (8x) + a much larger settings.json (317 lines vs 114 here), splitting into D9a (CI workflows) and D9b (docs + configs) would be prudent.

### File-type observations
- **YAML CI workflows:** Straightforward to parse. Key fields to extract: `on:` (triggers), `permissions:`, secrets referenced in `env:` blocks, `uses:` (external actions with pinned SHAs). All 7 parsed cleanly.
- **JSON configs (settings.json, package.json):** JSON is the cleanest format to inventory — no ambiguity. The hooks section boundary in settings.json required careful scoping (stop before `"hooks":` key).
- **Shell scripts (.husky/):** Required reading the full file to find all dependencies. The inline Node.js block in `pre-push` was the most complex unit — its dependencies (`.claude/hook-warnings.json`, `.claude/state/hook-warnings-ack.json`) are not visible from the script header and only emerge in the body.
- **`.properties` file (sonar-project.properties):** Simple key=value format, easy to parse. The project-specific fields (`sonar.projectKey`, `sonar.organization`) are immediately obvious.
- **Dotfiles without extensions (.nvmrc, .gitignore, .gitattributes):** file_type field should note the actual format (plain text / gitignore syntax / gitattributes syntax) rather than leave empty. Recommend adding a `format` field or using the filename as file_type for dotfiles.

### Classification heuristics
The `scope_hint` and `portability_hint` enums covered the three sub-categories cleanly with one nuance:

- **scope_hint `universal` vs `project`**: The universal/project distinction mapped well to CI workflows (mostly universal) vs config files (mostly project). The `user` scope was not needed for any file in this set — all files are committed to the repo, not machine-local.
- **portability_hint `sanitize-then-portable`**: This was the most frequently used distinction for configs. The sanitization requirement is predictable: project name fields, secret/org names, and exclusion paths are the recurring patterns.
- **External tool references (GitHub Actions, SonarCloud, etc.):** The `external_refs` array works well for cataloguing these. Recommended addition: a `required_secrets` field distinct from `dependencies` — secrets have a different porting concern (they require operator action in GitHub Settings, not just file edits). CI workflows especially benefit from this distinction.

### Dependency extraction
- **CI workflow action SHAs:** All 7 workflows use pinned SHA references, making dependency extraction unambiguous. The pattern `uses: owner/action@SHA # vX.Y.Z` is consistent across all files. Easy to extract with a regex on `uses:`.
- **Secret references:** Found by scanning `${{ secrets.XXX }}` patterns. GITHUB_TOKEN (built-in, no setup) vs SONAR_TOKEN (must provision) is a critical distinction not captured in the current schema.
- **`.husky/pre-commit` → gitleaks:** The external binary dependency is declared in the script as `command -v gitleaks` — easy to find when reading, but would require body-read for automated extraction.
- **`.husky/pre-push` → .claude/hook-warnings.json:** Only discoverable by reading the inline Node.js body. Recommend schema field `body_deps` for dependencies found in script bodies, distinct from header-level imports.

### Schema-field candidates
**CI-specific fields worth adding:**
- `trigger_events: ["push", "pull_request", "schedule", "workflow_dispatch"]` — enables filtering by when a workflow runs
- `required_secrets: ["SONAR_TOKEN"]` — distinct from `dependencies`; these require GitHub Settings operator action
- `runner_os: "ubuntu-latest"` — all 7 use ubuntu-latest; useful for cross-OS portability analysis
- `action_pins: [{"action": "actions/checkout", "sha": "...", "tag": "v6.0.2"}]` — structured extraction of pinned actions

**Config-specific fields worth adding:**
- `secret_bearing: true|false` — flags configs that reference or consume secrets (sonar-project.properties, settings.json)
- `sanitize_fields: ["sonar.projectKey", "sonar.organization", "name"]` — explicit list of fields needing replacement on port
- `env_specific: true|false` — flags files with machine/environment-specific overrides (settings.local.json pattern)

### Adjustments recommended for SoNash CI+configs scan

**SoNash has 17 CI workflows (2.4x):**
- Split into D9a (security/quality workflows) and D9b (automation/ops workflows) — same grouping used by CLAUDE.md: security pipeline vs operational automation
- The schema `trigger_events` field will be especially valuable for SoNash to distinguish PR-gate workflows from scheduled/cron ones

**SoNash has 16 root docs (8x):**
- 16 root docs almost certainly includes versioned docs, changelogs, and contributing guides — these need sub-categories (governance docs, onboarding docs, session state files, architecture docs)
- Assign a dedicated agent (D9b or D9c) for root docs alone given the 8x volume

**SoNash has a larger settings.json (317 lines vs 114):**
- At 317 lines, a single agent reading settings.json holistically risks the "stalling pattern" (16+ files / dense content). Consider splitting: D9-settings-permissions (allow/deny/env) and D9-settings-hooks (hooks section, though D3 equivalent will own that in SoNash too)
- The MCP permission entries in SoNash's settings.json will be far more numerous — the `sanitize_fields` schema addition becomes critical to flag every MCP-specific entry

**General SoNash adjustment:**
- Add `version_history` as a standard schema field — `scorecard.yml` already self-documents version history in a comment table; SoNash files may do this more consistently
- The `notes` field in JSONL should explicitly flag "REQUIRES OPERATOR ACTION" for any `required_secrets` items — this is the most common porting failure point
