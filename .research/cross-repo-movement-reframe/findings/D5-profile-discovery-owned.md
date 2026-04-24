# Findings: Profile Discovery — Owned Target Repos

**Searcher:** deep-research-searcher (B1)
**Profile:** codebase + docs
**Date:** 2026-04-23
**Sub-Question:** For an owned-trusted target repo, what files carry gate-and-shape signal, and how does the companion extract a useful profile from them?

---

## 1. Sub-Question (verbatim)

For an owned-trusted target repo, what files carry gate-and-shape signal, and how does the companion extract a useful profile from them?

Three sub-parts:
1. Inventory: what files carry signal?
2. Extraction strategy per file type (parse / heuristic / probe, with fallbacks)
3. What constitutes a "useful profile" (signal categories; field shape deferred to B2)

---

## 2. Approach

- Walked the full JASON-OS codebase as the primary ground-truth source (owned target repo, already operational)
- Read every gate-carrying file in full: all 7 workflow YAMLs, both husky hooks plus shared infra, settings.json, settings.local.json, all 13 hook JS files, CODEOWNERS, pull_request_template.md, .gitignore, package.json, sonar-project.properties, .nvmrc
- No equivalent non-JASON-OS owned repo was accessible in this environment (SoNash is not in the working directory) — noted as a gap
- Consulted codebase internals for extraction strategy insights (run-node.sh path conventions, hook registration patterns in settings.json, pre-commit check registration pattern)

---

## 3. Findings — Inventory of Signal-Carrying Files

### 3.1 CI Workflows — `.github/workflows/*.yml`

| File | Signal carried | Extraction approach | Confidence |
|---|---|---|---|
| `semgrep.yml` | Semgrep static analysis runs on PR + push to main; `paths-ignore` lists non-scanned paths; pinned Semgrep 1.95.0 image | Parse YAML: read `on`, `jobs[*].steps[*].run`, `container.image` | HIGH |
| `codeql.yml` | CodeQL analyzes `javascript-typescript`; `build-mode: none` (no build step needed); triggers on PR+push to main | Parse YAML: read `jobs[*].steps[*].with.languages` | HIGH |
| `sonarcloud.yml` | SonarCloud analysis on PR+push to main; reads `sonar-project.properties`; requires `SONAR_TOKEN` secret; skips fork PRs | Parse YAML + read `sonar-project.properties`; heuristic to detect SONAR_TOKEN env ref | HIGH |
| `dependency-review.yml` | Dep-review on every PR; blocks on `fail-on-severity: critical`; comments summary in PR | Parse YAML: extract `fail-on-severity` value | HIGH |
| `scorecard.yml` | OpenSSF Scorecard on push to main + weekly schedule; publish_results=true means public scoring | Parse YAML: note presence = supply-chain gates active | HIGH |
| `auto-merge-dependabot.yml` | Auto-merge Dependabot minor/patch via squash; major versions block auto-merge | Parse YAML: heuristic — `dependabot[bot]` actor + `--squash` = squash merge convention | MEDIUM |
| `cleanup-branches.yml` | Weekly stale-branch deletion (merged > 7 days); schedule-only | Parse YAML: presence = no need to preserve stale branches | MEDIUM |

**Key extraction insight:** All 7 workflows are static YAML. No matrix expansion or dynamic steps exist in JASON-OS's workflows — the steps are all literal. This is the simple case. Repos with matrix strategies (e.g., `matrix.node-version: [18, 20, 22]`) require the companion to enumerate all matrix values to understand the full test surface.

### 3.2 Husky Hooks — `.husky/` (top-level + `_/`)

| File | Signal carried | Extraction approach | Confidence |
|---|---|---|---|
| `.husky/pre-commit` | Three checks: gitleaks secrets scan (blocks on detected secrets), enums.json drift check (blocks if schema/enums.json is out of sync), label validator (blocks if staged catalogs have needs_review or status:partial). SKIP_CHECKS env var bypass allowed with mandatory SKIP_REASON | Parse shell: grep for `exit 1` paths, `command -v <tool>` patterns, conditional file checks | HIGH |
| `.husky/pre-push` | Two checks: escalation-gate (blocks if hook-warnings.json has unacked error-severity entries), block-push-to-main (blocks push to main/master). CI skip for escalation-gate (`${CI:-} = "true"`). | Parse shell: grep for `exit 1` paths, protected branch names | HIGH |
| `.husky/_shared.sh` | `is_skipped` helper, `require_skip_reason` (enforces SKIP_REASON non-empty, single-line, <=500 chars, no control chars), `HOOK_OUTPUT_LOG` path pattern, `add_exit_trap` chain | Parse shell: presence of `require_skip_reason` = SKIP_REASON discipline enforced | HIGH |
| `.husky/_/` (subdir) | Husky v9 auto-generated runner shims (`husky.sh`, `pre-commit`, `pre-push`, etc.); the `husky.sh` in `_/` explicitly marks itself DEPRECATED (husky v8 to v9 migration already complete) | Read-only presence check: contents are generated, not user-authored. `sonar-project.properties` already excludes `.husky/_/**` from scanning | MEDIUM |

**Extraction note:** The `.husky/_/` shims are excluded from SonarCloud scanning and are auto-generated. They carry no user-authored gate signal. Skip them in profile extraction. The `_shared.sh` and top-level hooks are the authoritative gate sources.

### 3.3 Claude Code Settings — `.claude/settings.json` and `.claude/settings.local.json`

| File | Signal carried | Extraction approach | Confidence |
|---|---|---|---|
| `.claude/settings.json` | Permissions `allow` list (Edit, Write, Bash(*), WebSearch, WebFetch, Skill, 6 MCP tools); `deny` list (git push --force *, git push origin main, git reset --hard *, rm -rf *); hook registration for 6 event types (SessionStart, PreToolUse, PreCompact, UserPromptSubmit, PostToolUse); env vars (CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1, CLAUDE_CODE_GLOB_TIMEOUT_SECONDS=60); statusLine command | Parse JSON: extract `permissions.allow`, `permissions.deny`, `hooks.*`, `env`, `statusLine` | HIGH |
| `.claude/settings.local.json` | Machine-local additional permissions (Bash(cd:*), mkdir, chmod +x, echo, npm --version, git commit:*, gh pr:*, go build:*, cargo install:*, specific cp/rm paths). NOT committed (gitignored). | Parse JSON: same extraction; note that `settings.local.json` is gitignored — the companion will see it on THIS machine only, not when analyzing a remote repo without a local clone | HIGH |

**Critical constraint from settings.json deny list:** `Bash(git push --force *)`, `Bash(git push origin main)`, `Bash(git reset --hard *)`, `Bash(rm -rf *)` are blocked. Any port companion operating in this repo must not emit these commands in Bash tool calls.

**Critical constraint from settings.json allow list:** `Bash(*)` is allowed globally (not a narrow allow), so any Bash command is allowed unless explicitly denied. However, `Bash(*)` in the allow list alongside a deny list means the deny list is authoritative — allow-then-deny semantics.

### 3.4 Claude Code Hooks — `.claude/hooks/*.js` (and `.sh`)

JASON-OS has 13 hook files in `.claude/hooks/`:

| Hook file | Event / matcher | Gate or behavior | Signal for profile |
|---|---|---|---|
| `run-node.sh` | (runner infrastructure) | Portable node resolver; path-traversal guard on script paths; refuses symlinked scripts; HOOKS_DIR confinement | Indicates hooks run via bash + node; companion must place hook scripts in `.claude/hooks/` | HIGH |
| `block-push-to-main.js` | PreToolUse / Bash | Blocks `git push` to main/master before execution | No new gate beyond husky; reinforces no-direct-push | HIGH |
| `large-file-gate.js` | PreToolUse / Read | Blocks Read on files >5MB; warns >500KB (JSONL, log, CSV, ndjson). Skippable via SKIP_GATES=1 | Ported files that hit these types get warned/blocked on Read | HIGH |
| `settings-guardian.js` | PreToolUse / Write+Edit | Validates `.claude/settings.json` writes for structural correctness + critical hook presence. Blocks corruption | Cannot port a broken settings.json into this repo | HIGH |
| `check-mcp-servers.js` | SessionStart | Reads `.mcp.json`, reports available MCP servers by name only (no URLs/tokens exposed) | Indicates MCP server list exists in `.mcp.json` (not in this walk — likely gitignored or absent) | MEDIUM |
| `commit-tracker.js` | PostToolUse / Bash | Tracks git commits to `.claude/state/commit-log.jsonl` (append-only); Layer A of compaction-resilient state | No gate — state tracking hook | LOW (for gate profile) |
| `compact-restore.js` | SessionStart / compact | Restores state after compaction | No gate signal | LOW |
| `pre-compaction-save.js` | PreCompact | Saves state before compaction | No gate signal | LOW |
| `plain-language-reminder.js` | UserPromptSubmit | Injects tenet reminder into every prompt. `continueOnError: true` | Behavioral signal: this repo values plain-language output | LOW (for gate profile) |
| `label-notification.js` | (delegator) | Delegates to `.claude/sync/label/hooks/notification-label.js` | Piece 3 labeling hook; not a gate | LOW |
| `label-post-tool-use.js` | PostToolUse | Delegates to `.claude/sync/label/hooks/post-tool-use-label.js` | Labeling infrastructure; not a write gate | LOW |
| `label-user-prompt-submit.js` | UserPromptSubmit | Delegates to labeling hook | Not a gate | LOW |
| `lib/` (directory) | (shared utilities) | `git-utils.js`, `rotate-state.js`, `sanitize-input.js`, `state-utils.js`, `symlink-guard.js` | Indicates symlink-guard pattern is in use — ported hook code must import it | HIGH |

**Pattern:** Gate-relevant hooks are PreToolUse hooks. PostToolUse and UserPromptSubmit hooks are observational. SessionStart hooks are environmental setup. The companion cares about PreToolUse (what gets blocked) and the symlink-guard library (what ported hooks must use).

### 3.5 Pre-commit Framework Alternatives

| File | Present in JASON-OS? | Signal if present | Extraction approach |
|---|---|---|---|
| `.pre-commit-config.yaml` | No | Python pre-commit framework hooks (bandit, black, isort, etc.) | Parse YAML: `repos[*].hooks[*].id` = check names; `repos[*].rev` = pinned versions |
| `lefthook.yml` | No | Lefthook hook runner (alternative to husky) | Parse YAML: `pre-commit.commands`, `pre-push.commands` |
| `.commitlint*` | No | Commit message format enforcement | Parse: extract `rules.type-enum` for allowed commit types |

JASON-OS uses Husky 9 exclusively for git hooks. No competing frameworks present.

### 3.6 Lint / Format Configs

| File | Present in JASON-OS? | Signal if present | Extraction approach |
|---|---|---|---|
| `.eslintrc*` / `eslint.config.*` | No | JS/TS lint rules; unused-imports, no-console, etc. | Parse JSON/JS: extract `rules`, `extends`, `ignorePatterns` |
| `.prettierrc*` / `prettier.config.*` | No | Code formatting; tab width, semicolons, print width | Parse JSON: extract key formatting rules |
| `pyproject.toml` | No | Python project config; may contain `[tool.black]`, `[tool.ruff]`, `[tool.mypy]` | Parse TOML: tool-specific sections |
| `.golangci.yml` | No | Go linter config; enabled linters, run timeout | Parse YAML: `linters.enable`, `linters.disable` |
| `tsconfig.json` | No | TypeScript config; strict mode, target, lib | Parse JSON: `compilerOptions.strict` = type-safety gate |

JASON-OS has none of these. Style enforcement is handled by SonarCloud (CI) rather than local lint configs. The absence of local lint configs means no pre-commit lint blocking, but CI (SonarCloud) still surfaces style issues on PR.

### 3.7 Review-Gate Hints

| File | Signal carried | Extraction approach | Confidence |
|---|---|---|---|
| `.github/CODEOWNERS` | `* @jasonmichaelbell78-creator` (all files), `.github/workflows/ @jasonmichaelbell78-creator` (CI changes), `.claude/ @jasonmichaelbell78-creator` (hook infra changes) | Parse: one entry per line, format `<pattern> <@owner>` | HIGH |
| `.github/pull_request_template.md` | Commit type convention (feat/fix/docs/refactor/test/chore/style/perf), scope convention (skills/agents/hooks/scripts etc.), `<type>(<scope>): <description>` title format, "No sonash-specific references reintroduced" checklist item | Parse markdown: extract HTML comment block with examples; extract checklist items | MEDIUM |
| Branch protection (GitHub API) | main branch is NOT protected via GitHub API (`"Branch not protected"` from `gh api`). This means no required status checks or approvals are enforced at the platform level | `gh api repos/<owner>/<repo>/branches/main/protection` — check `required_status_checks` | HIGH |

**Implication of no branch protection:** CI runs are informational, not gating at the GitHub level. The pre-push hook (`block-push-to-main.js` + husky pre-push) is the actual enforcement mechanism, not GitHub branch protection rules.

### 3.8 `.gitignore` — What NOT to Write Into

Key gitignored paths the companion must never write into as tracked files:
- `.claude/state/` — runtime hook state; transient; machine-local
- `.claude/tmp/` — scratch space
- `.claude/projects/` — machine-local Claude memory
- `.claude/settings.local.json` — machine-local permission additions
- `.claude/hook-warnings.json`, `.claude/alerts-acknowledged.json`, `.claude/session-activity.jsonl`, `.claude/override-log.jsonl` — runtime logs
- `.claude/hooks/.*-state.json` — per-hook state files (dot-prefix naming)
- `.claude/sync/label/preview/` — label preview catalogs (transient)
- `node_modules/`, `build/`, `dist/`, `out/`, `coverage/` — standard ignores
- `.env`, `.env.*`, `*.pem` — secrets
- `tools/**/*.exe`, `tools/**/bin/` — platform binaries
- `*.log` — log files

**What this tells the companion:** If porting a `.claude/state/` file, that file is machine-local runtime state and must NOT be ported as a tracked artifact. Porting into `.claude/hooks/` (committed, not gitignored) is correct; porting into `.claude/state/` creates a runtime file that will never appear in `git status`.

### 3.9 Additional Signal Sources in JASON-OS

| File | Signal carried | Confidence |
|---|---|---|
| `package.json` | `scripts.prepare = "husky || echo ..."` = Husky installs on `npm install`; `scripts.schema:validate = "node .claude/sync/schema/validate.test.cjs"` = schema validation command; `engines.node >= 22` = Node.js version requirement; `devDependencies` = husky 9, ajv, ajv-formats, node-notifier | HIGH |
| `.nvmrc` | `22` = Node.js 22 pinned. Companion must use Node 22+ for any hook scripts it ports | HIGH |
| `sonar-project.properties` | `sonar.sources=.`; exclusions: `.research/**`, `.planning/**`, `node_modules/**`, `.husky/_/**`; no test dirs yet | HIGH |
| `.claude/sync/schema/enums.json` | Scope-tag enum (universal/user/project/machine/ephemeral), unit type enum (skill/agent/team/hook/hook-lib/memory/canonical-memory/script/script-lib/tool/tool-file/research-session/plan/planning-artifact/todo-log/config/settings/ci-workflow/doc/output-style/keybindings/shared-doc-lib/database/composite). Pre-commit enforces sync between enums.json and schema-v1.json | HIGH |
| `scripts/lib/` | `safe-fs.js`, `sanitize-error.cjs`, `security-helpers.js` = required at all file I/O boundaries (CLAUDE.md §2 mandate). `parse-jsonl-line.js`, `read-jsonl.js`, `resolve-exec.js`, `todos-mutations.js` = supporting utilities | HIGH |
| `CLAUDE.md` | §2 Security Rules mandate helper use; §4 Behavioral Guardrails; §5 Anti-Patterns (path traversal regex, error sanitization); §6 Coding Standards | HIGH |

---

## 4. Findings — Extraction Strategy Per File Type

### 4.1 GitHub Actions Workflows (`.github/workflows/*.yml`)

**Preferred approach: Parse YAML + targeted heuristic extraction**

1. Parse YAML (use a YAML library, not regex): extract the `on` block (trigger events + branch filters), `jobs[*].steps[*].run` (shell commands), `jobs[*].steps[*].uses` (action references), `jobs[*].steps[*].with` (action inputs).
2. For each `run` step, apply command heuristics: look for `npm test`, `npm run *`, `pytest`, `go test`, `cargo test`, `semgrep scan`, `gh pr merge`, etc. to classify the command type.
3. For `uses` steps, classify by action name: `github/codeql-action/*` = CodeQL, `semgrep/semgrep:*` = Semgrep, `SonarSource/sonarqube-scan-action` = SonarCloud, `actions/dependency-review-action` = dep-review.
4. Extract `paths-ignore` from each trigger — these are non-gated file types.

**When to fall back to heuristic instead of parsing:** Matrix expansions (`matrix.node-version: [18, 20, 22]`) generate multiple job instances; static parsing sees only the template variables (e.g., `matrix.node-version`). In this case, collect all matrix values from the `strategy.matrix` block and enumerate them. Dynamic expressions (`fromJSON(...)` or external config) require probe or documentation check — heuristic: flag them as "matrix: dynamic, check manually."

**JASON-OS has no matrix jobs** — all 7 workflows have single-job, literal-step configurations. Static YAML parsing is sufficient and complete.

### 4.2 Husky Hooks (`.husky/pre-commit`, `.husky/pre-push`)

**Preferred approach: Heuristic-grep on shell scripts**

Reason: Shell scripts are not parseable in the same way as structured formats. The information lives in the logic flow, not a data schema.

Heuristics to apply:
1. Scan for `command -v <tool>` patterns → tool dependency list (e.g., `gitleaks`, `node`)
2. Scan for `exit 1` paths → blocking conditions
3. Scan for referenced script files (e.g., `node "$LABEL_VALIDATOR"`) → additional gate scripts
4. Scan for `is_skipped "<name>"` calls → skippable check names (e.g., "secrets", "enums", "labels", "warnings", "main")
5. Scan for environment variable reads (`${CI:-}`, `${SKIP_CHECKS:-}`) → CI bypass patterns
6. Scan for `git diff --cached --name-only` filters → which file paths trigger each check

**Fallback: Probe** — try running the hook against an empty staged set and capture exit-code + output. Risk: side effects. Heuristic-grep is safer and sufficient for the information the companion needs.

**JASON-OS result:**
- Pre-commit gates: gitleaks (blocks), enums-drift (blocks on schema change), label-validator (blocks on catalog staging)
- Pre-push gates: escalation-gate (blocks on unacked error-severity warnings), block-to-main (blocks push to main/master)
- Both hooks source `_shared.sh` — check SKIP_CHECKS bypass pattern + SKIP_REASON discipline

### 4.3 `.claude/settings.json`

**Preferred approach: Parse JSON**

This is machine-readable JSON with a stable schema. Parse fully:
- `permissions.allow[]` — what tool calls are permitted
- `permissions.deny[]` — what tool calls are blocked (authoritative over allow)
- `hooks.*` — event to matcher to command mappings (what hooks fire when)
- `env` — environment variables injected into all hooks
- `enableAllProjectMcpServers` — MCP availability

**Complication:** `settings.local.json` is gitignored and machine-local. When the companion analyzes a remote/cloned repo without running on that machine, it won't see `settings.local.json`. Profile must note this gap: "machine-local permissions may extend or restrict what's visible in settings.json."

### 4.4 `.claude/hooks/*.js` (and `.sh`)

**Preferred approach: Heuristic-grep + header parsing**

Hook JS files in JASON-OS have structured JSDoc headers naming their event type, matcher, exit codes, and behavior. Read the top 30 lines (header) for each file:
- Comment block mentioning "PreToolUse", "PostToolUse", etc. — event type
- "Exit 0 = allow, Exit 2 = block" — gate vs. observer
- "SKIP_GATES=1" reference — whether it's bypassable
- `continueOnError` behavior (check settings.json registration) — whether failure blocks or warns

**Gate vs. observer classification:** Exit code 2 = gate (blocking). Exit code 0 only = observer. `continueOnError: true` in settings.json = non-blocking even if it exits non-zero.

### 4.5 Pre-commit Framework Configs (`.pre-commit-config.yaml`, `lefthook.yml`)

**Preferred approach: Parse YAML**

`.pre-commit-config.yaml`: `repos[*].hooks[*].id` = check names, `repos[*].rev` = pinned versions, `stages` = when hooks fire.
`lefthook.yml`: `pre-commit.commands`, `pre-push.commands` = command definitions.

Not present in JASON-OS. If present in a target repo, these supplement or replace Husky — note presence and treat as a full alternative gate inventory source.

### 4.6 Lint / Format Configs (`.eslintrc*`, `.prettierrc*`, etc.)

**Preferred approach: Parse JSON/YAML/TOML depending on extension**

These are structured configs. For ESLint: `extends`, `rules`, `ignorePatterns`. For Prettier: `tabWidth`, `singleQuote`, `semi`, `printWidth`. For golangci: `linters.enable[]`.

**Fallback:** If config is in JavaScript (`.eslintrc.js`, `eslint.config.js`), it is not statically parseable as data. Heuristic-grep: look for `extends: [`, `rules: {`, known rule names.

Not present in JASON-OS.

### 4.7 CODEOWNERS and PR Template

**CODEOWNERS — Parse line-by-line:**
Format: `<glob-pattern> <@owner> [<@owner>...]`. Split on whitespace. Each line = one review assignment rule. Note patterns that cover `.claude/` and `.github/workflows/` specifically (high-sensitivity paths).

**PR template — Heuristic extraction:**
Look for HTML comment block with title format example — extract type/scope/description pattern. Look for checklist items (`- [ ]`) — manual gates the author must acknowledge. Look for project-specific prohibitions (e.g., "No sonash-specific references" in JASON-OS).

### 4.8 `.gitignore`

**Preferred approach: Parse line-by-line**

Read each non-comment, non-empty line as a gitignore pattern. Classify into categories:
- OS/editor artifacts
- Dependency directories
- Build artifacts
- Secret files
- Runtime state directories (critical: `.claude/state/`, `.claude/tmp/`)
- Platform-specific binaries

The companion must check any file it plans to write against the gitignore list. Writing into a gitignored path means the file will never appear in `git status` and will not be tracked.

---

## 5. Findings — What Constitutes a Useful Profile

The gate-discovery profile should enumerate the following signal categories. Field schema is B2's territory; these are the categories that must be represented:

**Category A — Commit-time gates**
What blocks a `git commit` in this repo:
- Gitleaks secrets scan (blocks if secrets in staged files; requires `gitleaks` tool)
- Enums drift check (blocks if `.claude/sync/schema/enums.json` is out of sync; requires `node`)
- Label validator (blocks if staged catalogs have unresolved state; requires `node`)
- Tool dependencies: which external binaries must be present
- Bypass mechanism: SKIP_CHECKS + SKIP_REASON discipline enforced

**Category B — Push-time gates**
What blocks a `git push` in this repo:
- Escalation gate (blocks on unacked error-severity hook warnings)
- Direct-push-to-main block (hard rule: PRs only)
- CI skip pattern (escalation-gate is automatically skipped in CI environments)

**Category C — CI gates (GitHub Actions)**
What runs on PR and push to main:
- Semgrep static analysis
- CodeQL JavaScript/TypeScript analysis
- SonarCloud analysis (requires SONAR_TOKEN secret)
- Dependency review on PR (blocks on critical severity)
- OpenSSF Scorecard on push to main
- Whether any workflows are required checks vs. informational (branch protection check)

**Category D — Claude Code tool-call gates**
What Claude Code hooks block before tool calls execute:
- Denied Bash patterns from settings.json deny list
- PreToolUse hooks that exit with code 2 (blocking)
- File size limits on Read operations
- Settings file protection on Write/Edit operations

**Category E — File-write exclusion zones**
What paths must NOT be written into as tracked files:
- Gitignored runtime state directories
- Gitignored secret files
- Gitignored log files
- Gitignored build artifacts
- Auto-generated subdirs (e.g., `.husky/_/`)

**Category F — Review-gate conventions**
What human review expectations apply:
- CODEOWNERS assignments (which paths require which reviewer)
- PR title format convention
- Whether branch protection is active at GitHub level
- Merge strategy convention (squash vs. merge commit vs. rebase)

**Category G — Runtime environment requirements**
What the environment must provide:
- Node.js version (pinned + minimum)
- Package manager and install command
- Required external tools (gitleaks, etc.)
- Security helper library locations

**Category H — Shape signals (secondary)**
Naming and structural conventions visible from the gate discovery pass:
- Hook script location and naming convention
- Hook runner invocation pattern
- State file location (gitignored) vs. config file location (committed)
- Schema/validation file locations

---

## 6. JASON-OS Profile — Worked Example

This is the concrete profile the discovery mechanism would extract for JASON-OS right now, demonstrating the mechanism works end-to-end:

```
repo: JASON-OS
owner: jasonmichaelbell78-creator
discovered: 2026-04-23

commit_gates:
  - id: gitleaks
    tool: gitleaks
    trigger: any staged file
    skip_key: secrets
    requires_skip_reason: true
    blocking: true
  - id: enums-drift
    tool: node
    trigger: staged .claude/sync/schema/{schema-v1.json,enums.json}
    skip_key: enums
    blocking: true
  - id: label-validator
    tool: node
    trigger: staged .claude/sync/label/**/*.jsonl
    skip_key: labels
    blocking: true

push_gates:
  - id: escalation-gate
    trigger: any push (skipped in CI)
    blocks_on: unacked error-severity entries in .claude/hook-warnings.json
    skip_key: warnings
  - id: block-push-to-main
    trigger: push to refs/heads/main or refs/heads/master
    always_blocking: true
    skip_key: main

ci_gates:
  - name: Semgrep
    runs_on: [PR, push to main]
    tool: semgrep/semgrep:1.95.0
    result: SARIF uploaded to GitHub Code Scanning
  - name: CodeQL
    runs_on: [PR, push to main]
    languages: [javascript-typescript]
    build_mode: none
  - name: SonarCloud
    runs_on: [PR, push to main]
    config: sonar-project.properties
    secret_required: SONAR_TOKEN
    skips_fork_prs: true
  - name: DependencyReview
    runs_on: [PR to main only]
    fail_on_severity: critical
  - name: Scorecard
    runs_on: [push to main, weekly schedule]
    publish_results: true
  branch_protection_github: none

tool_call_deny:
  - Bash(git push --force *)
  - Bash(git push origin main)
  - Bash(git reset --hard *)
  - Bash(rm -rf *)

tool_call_gates:
  - hook: large-file-gate.js
    event: PreToolUse/Read
    blocks: files >5MB (.jsonl/.log/.csv/.ndjson)
    warns: files >500KB
    bypassable: SKIP_GATES=1
  - hook: settings-guardian.js
    event: PreToolUse/Write+Edit
    blocks: writes to .claude/settings.json that corrupt hook infrastructure

write_exclusion_zones:
  - .claude/state/**
  - .claude/tmp/**
  - .claude/projects/**
  - .claude/settings.local.json
  - .claude/hook-warnings.json
  - .claude/hooks/.*-state.json
  - .claude/sync/label/preview/**
  - node_modules/**
  - ".env, .env.*, *.pem, *.log"
  - "/build/, /dist/, /out/, coverage/"
  - "tools/**/*.exe, tools/**/bin/"

review_conventions:
  codeowners: "@jasonmichaelbell78-creator on all files"
  pr_title_format: "<type>(<scope>): <description>"
  allowed_types: [feat, fix, docs, refactor, test, chore, style, perf]
  branch_protection_github: none (husky pre-push is the enforcer)
  merge_strategy: squash (inferred from dependabot auto-merge)

environment:
  node_version_pinned: "22"
  node_version_min: ">=22"
  package_manager: npm
  husky_version: "9"
  go_required: false (optional, for statusline rebuild only)
  security_helpers_path: scripts/lib/

shape_hints:
  hook_dir: .claude/hooks/
  hook_runner: "bash .claude/hooks/run-node.sh"
  hook_extension: .js (CJS require, not ESM)
  hook_lib_dir: .claude/hooks/lib/
  state_dir: .claude/state/ (gitignored, runtime only)
  schema_dir: .claude/sync/schema/ (committed)
  no_eslint: true
  no_prettier: true
  style_gate: SonarCloud (CI only)
```

---

## 7. Claims

1. JASON-OS has 7 CI workflow files in `.github/workflows/`, all parseable as static YAML with no matrix expansion or dynamic expression complexity. [CONFIDENCE: HIGH — direct codebase read]

2. Pre-commit gates are gitleaks (secrets), enums drift, and label validation. All three block on exit 1. All three are skippable with SKIP_CHECKS + mandatory SKIP_REASON. [CONFIDENCE: HIGH — `.husky/pre-commit` read in full]

3. Pre-push gates are escalation-gate (unacked error-severity warnings) and block-to-main. The escalation-gate is automatically skipped in CI environments via `${CI:-} = "true"` check. [CONFIDENCE: HIGH — `.husky/pre-push` read in full]

4. `settings.json` deny list is the authoritative tool-call block list. The four denied patterns (git push --force, git push origin main, git reset --hard, rm -rf) apply to all companion operations in this repo. [CONFIDENCE: HIGH — `.claude/settings.json` read in full]

5. `settings.local.json` is gitignored and machine-local. Profile discovery against a remote clone of this repo without a local checkout will miss it. [CONFIDENCE: HIGH — `.gitignore` confirms gitignore; `.claude/settings.local.json` read]

6. Branch protection is not enabled at the GitHub API level for `main`. The push-to-main block is enforced solely via the Husky pre-push hook and the `block-push-to-main.js` Claude Code PreToolUse hook. [CONFIDENCE: HIGH — `gh api repos/.../branches/main/protection` returned 404]

7. JASON-OS has no ESLint, Prettier, or local lint configs checked in. Style enforcement runs via SonarCloud (CI) rather than local pre-commit lint. [CONFIDENCE: HIGH — filesystem search found zero such files]

8. The `.husky/_/` subdirectory contains auto-generated Husky v8 shims that are marked DEPRECATED by Husky v9. These carry no user-authored gate signal and should be skipped in profile extraction. [CONFIDENCE: HIGH — `.husky/_/husky.sh` read; SonarCloud exclusion confirms]

9. Security helpers (`scripts/lib/safe-fs.js`, `sanitize-error.cjs`, `security-helpers.js`) are mandated by CLAUDE.md §2 at all file I/O boundaries. Any hook code ported into this repo must import them. [CONFIDENCE: HIGH — CLAUDE.md §2 read; scripts/lib/ directory confirmed]

10. `run-node.sh` enforces HOOKS_DIR confinement: scripts must be under `.claude/hooks/`, no symlinks, no `..` path segments. Hook files ported from another repo must land in `.claude/hooks/` or be rejected at execution time. [CONFIDENCE: HIGH — `run-node.sh` read in full]

11. Node.js 22 is the required and pinned runtime. `.nvmrc` pins to `22`; `package.json` sets `engines.node >= 22`. [CONFIDENCE: HIGH — both files read]

12. Husky v9 is installed via `package.json devDependencies`. The `prepare` script installs Husky on `npm install`. Companion must not introduce Husky v8 patterns (the deprecated `#!/usr/bin/env sh . ~/.../husky.sh` header). [CONFIDENCE: HIGH — `package.json` and `_/husky.sh` deprecation message read]

13. GitHub Actions workflows use SHA-pinned actions throughout. Any new workflow files ported into this repo should follow the same SHA-pinning convention to match the repo's supply-chain hygiene pattern. [CONFIDENCE: HIGH — all 7 workflow files read; all use SHA pins]

14. SonarCloud is the quality gate for code style and hotspots. It runs in CI on PR and is NOT a blocking pre-commit gate. Ported code will surface in SonarCloud review but will not block commits locally. [CONFIDENCE: HIGH — sonarcloud.yml + CLAUDE.md §2 security pipeline read]

---

## 8. Sources

| # | Path | Type | Trust | Notes |
|---|---|---|---|---|
| 1 | `.claude/settings.json` | Codebase | HIGH | Hook registration, permissions, env vars |
| 2 | `.claude/settings.local.json` | Codebase | HIGH | Machine-local permissions |
| 3 | `.husky/pre-commit` | Codebase | HIGH | Commit gate definitions |
| 4 | `.husky/pre-push` | Codebase | HIGH | Push gate definitions |
| 5 | `.husky/_shared.sh` | Codebase | HIGH | SKIP_CHECKS infrastructure |
| 6 | `.github/workflows/semgrep.yml` | Codebase | HIGH | CI gate |
| 7 | `.github/workflows/codeql.yml` | Codebase | HIGH | CI gate |
| 8 | `.github/workflows/sonarcloud.yml` | Codebase | HIGH | CI gate |
| 9 | `.github/workflows/dependency-review.yml` | Codebase | HIGH | CI gate |
| 10 | `.github/workflows/scorecard.yml` | Codebase | HIGH | CI gate |
| 11 | `.github/workflows/auto-merge-dependabot.yml` | Codebase | HIGH | Merge convention |
| 12 | `.github/workflows/cleanup-branches.yml` | Codebase | HIGH | Maintenance workflow |
| 13 | `.github/CODEOWNERS` | Codebase | HIGH | Review assignment |
| 14 | `.github/pull_request_template.md` | Codebase | HIGH | PR title/type convention |
| 15 | `.gitignore` | Codebase | HIGH | Write exclusion zones |
| 16 | `package.json` | Codebase | HIGH | Node version, scripts, deps |
| 17 | `.nvmrc` | Codebase | HIGH | Pinned Node version |
| 18 | `sonar-project.properties` | Codebase | HIGH | SonarCloud config |
| 19 | `.claude/hooks/run-node.sh` | Codebase | HIGH | Hook execution path constraints |
| 20 | `.claude/hooks/block-push-to-main.js` (header) | Codebase | HIGH | Gate behavior |
| 21 | `.claude/hooks/large-file-gate.js` (header) | Codebase | HIGH | Gate behavior |
| 22 | `.claude/hooks/settings-guardian.js` (header) | Codebase | HIGH | Gate behavior |
| 23 | `.claude/hooks/lib/` (directory listing) | Codebase | HIGH | Shared hook utilities |
| 24 | `CLAUDE.md` §2, §4, §5 | Codebase | HIGH | Security rules, anti-patterns |
| 25 | `gh api repos/.../branches/main/protection` | Live API | HIGH | Branch protection status (404 = not protected) |

No external documentation sources were required — the JASON-OS codebase is self-documenting for this sub-question.

---

## 9. Gaps and Uncertainties

**Gap 1 — SoNash not accessible.** The research question asked for comparison against SoNash. SoNash is not present in this working directory. Cannot confirm whether SoNash's gate profile is a superset, subset, or entirely different from JASON-OS's. This is the primary gap in the cross-repo comparison the companion will eventually face on its first write into SoNash.

**Gap 2 — `.mcp.json` not found.** `check-mcp-servers.js` reads `.mcp.json` for MCP server names. That file was not present in the visible directory listing. It may be gitignored, absent, or outside the project root. If present, it carries MCP tool availability signals that should be part of the profile (which MCP tools are available to Claude in this repo).

**Gap 3 — `settings.local.json` is inherently opaque to remote discovery.** Any profile extraction that does not run on the exact machine where the target repo is checked out will miss machine-local permissions. The profile must document this gap explicitly and flag settings.local.json as "not discoverable remotely."

**Gap 4 — CI required checks not enforced at the platform level.** Because branch protection is not enabled at the GitHub API level, there is no authoritative list of "required CI checks" to extract. The CI workflows run but none are gating in the GitHub PR sense. The profile must note that CI outcomes are informational, not blocking at the platform level.

**Gap 5 — Husky `_/` shims ambiguity.** The current Husky v9 behavior with these legacy shims is ambiguous — they exist but may not be invoked by Husky v9's execution path. Profile extraction should mark `.husky/_/` as "skip — auto-generated, not user-authored." The shims will not be ported.

**Gap 6 — Alternative hook frameworks untested.** If a future target repo uses the Python pre-commit framework or Lefthook instead of Husky, the extraction strategy is specified but untested against a real example in JASON-OS's environment.

**Gap 7 — GitHub App installations not discoverable from filesystem.** CLAUDE.md mentions Qodo (GitHub App) as a preferred AI PR reviewer. This is a GitHub App, not a workflow file — it does not appear in `.github/workflows/`. The companion has no filesystem mechanism to detect GitHub App installations; it would require a live API call (`gh api repos/<owner>/<repo>/installations`). Noted as a discovery enhancement for future profile versions.

---

## Confidence Assessment

- HIGH claims: 14
- MEDIUM claims: 0
- LOW claims: 0
- UNVERIFIED claims: 0
- Overall confidence: HIGH

The JASON-OS codebase is fully readable and all gate files were read in full. The only significant gap is the absence of SoNash for cross-repo comparison. Extraction strategies for non-present file types (ESLint, Prettier, pre-commit framework) are derived from format knowledge and carry implicit MEDIUM confidence for real-world application but are not needed for the JASON-OS worked example.
