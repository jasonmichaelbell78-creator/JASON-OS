# Findings: D9 — `/context-sync` Source Inventory, Scope-Tags, and Secrets/PII Handling

**Searcher:** deep-research-searcher (C2)
**Profile:** codebase + reasoning
**Date:** 2026-04-23
**Sub-Question IDs:** C2 (D9)

---

## 1. Sub-Question

What is the concrete, complete inventory of `/context-sync` source items,
classified by scope-tag, with secrets/PII handling rules?

Three sub-parts:
1. Confirm and extend the brainstorm's named source list with actual on-disk paths
2. Surface secrets/PII handling rules per category
3. Confirm scope-tag assignment per category, surface mixed-scope splits

---

## 2. Approach

Walked the full JASON-OS filesystem at `.claude/`, `~/.claude/`, `.husky/`,
`tools/statusline/`, and related paths. Read:

- `.claude/canonical-memory/*.md` — frontmatter shape, type field values
- `~/.claude/projects/C--Users-<user>-Workspace-dev-projects-JASON-OS/memory/` — user-level memory shape
- `.claude/settings.local.json` — confirmed absolute-path content
- `~/.claude/settings.json` — user-level env block
- `.claude/settings.json` — project-level env block
- `.claude/sync/schema/enums.json` — existing scope-tag enum (scope confirmed: universal/user/project/machine/ephemeral)
- `.claude/sync/schema/SCHEMA.md` — scope semantics (source_scope + runtime_scope split)
- `~/.claude/commands/gsd/`, `~/.claude/commands/sc/` — slash command directory layout
- `~/.claude/agents/` — user-level agents
- `.claude/agents/` — project-level agents
- `.claude/skills/` — project-level skills
- `.husky/_/`, `.husky/_shared.sh` — husky lib files
- `.claude/statusline-command.sh`, `~/.claude/statusline/config.toml`, `~/.claude/statusline/config.local.toml` — statusline config
- `~/.gitconfig`, `.git/config` — git config layers
- `scripts/lib/sanitize-error.cjs` — SENSITIVE_PATTERNS regex set (existing secrets detection)
- `.husky/pre-commit` — gitleaks integration point
- VSCode/Cursor `keybindings.json` paths — checked for existence
- `~/.claude/` root — checked for user-level CLAUDE.md (not found)

Reasoning applied for secrets classification: cross-referenced brainstorm anti-goals
("no fire-and-forget state changes"), existing SENSITIVE_PATTERNS in sanitize-error.cjs,
and gitleaks configuration in pre-commit hook.

---

## 3. Findings — Confirmed Source Inventory

Each row from the brainstorm's named list, located on disk, and classified.

| # | Category name | Source path (on-disk) | Destination path | Exists today? | Scope-tag (primary) | Notes |
|---|---|---|---|---|---|---|
| 1 | **Canonical memories** | `.claude/canonical-memory/*.md` (JASON-OS repo, git-tracked) | `~/.claude/projects/<project-hash>/memory/*.md` (user-level, per-project) | YES — 12 files in canonical-memory; 60+ files in user project memory | `user` | Frontmatter `type` field classifies: `user`, `feedback`, `project`, `reference`, `tenet`, `index`. Most are `user` or `feedback`. |
| 2 | **Tenets (user + project)** | No dedicated path — tenets live IN the memory dirs. Identified by filename prefix (`t3_*`) or `type: tenet` frontmatter. `t3_convergence_loops.md` found in user project memory. | Same memory dir as canonical memories | YES — at least one confirmed (`t3_convergence_loops.md`). No `type: tenet` found in frontmatter (type is `reference`). | `user` (user tenets); `project` (project tenets) | Tenet identity comes from naming convention (`t3_`) not frontmatter `type: tenet`. BRAINSTORM mentions `type: tenet` as distinguishing; not yet in `memory_type` enum values. See §4 below. |
| 3 | **CLAUDE.md local tweaks** | `CLAUDE.md` in each consumer project root (the per-project override sections) | Other consumer project's `CLAUDE.md` | YES — JASON-OS `CLAUDE.md` is present and git-tracked | `project` | The CLAUDE.md body is mixed-scope (universal shared sections + project-specific overrides). See §6 for split treatment. |
| 4 | **`settings.local.json`** | `.claude/settings.local.json` (project root, gitignored) | Consumer project's `.claude/settings.local.json` | YES — confirmed at `.claude/settings.local.json` with absolute-path Bash allow rules | `machine` | Contains absolute Windows paths (e.g., `C:/Users/<user>/Workspace/...`). Inherently machine-specific. |
| 5 | **Env variables** | `settings.json` `env` block (project root, git-tracked); `~/.claude/settings.json` `env` block (user-level) | Consumer project's `settings.json` env block | YES — `env` block exists in `.claude/settings.json` with `CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS` and `CLAUDE_CODE_GLOB_TIMEOUT_SECONDS`. `~/.claude/settings.json` has no `env` block currently. | `user` (general env flags); `machine` (locale-specific tokens/paths) | Mixed-scope: experiment flags are user-scoped; API keys and locale paths are machine-scoped. See §6. |
| 6 | **Slash-command aliases** | `~/.claude/commands/gsd/` (user-level, per-skill subdirs); `~/.claude/commands/sc/` (user-level) | Another locale's `~/.claude/commands/` | YES — confirmed `gsd/` and `sc/` subdirectories with command `.md` files inside | `user` | Iteration unit is the directory (one entry per command subdir). No project-level commands directory found in JASON-OS. |
| 7 | **Keybindings (Claude Code)** | `~/.claude/keybindings.json` | Same path on other locale | NOT FOUND — no `~/.claude/keybindings.json` exists on this machine | `user` | May only exist when user has customized. Walk must handle absent-file case. |
| 8 | **Git config overrides** | `~/.gitconfig` (global user-level) — confirmed present with user identity, delta pager, LFS config. Local repo additions in `.git/config` (e.g., `hooksPath = .husky/_`, branch tracking). | Other locale's `~/.gitconfig` + target repo's `.git/config` | YES — both layers confirmed present | Mixed: `user` (identity, pager prefs) / `machine` (credential helpers, signing keys, safe directories with absolute paths) | See §6 for split treatment. |
| 9 | **Husky local (`.husky/_/`)** | `.husky/_/` (generated by `npm install` — contains `husky.sh`, all git hook stubs) AND `.husky/_shared.sh` (hand-authored, committed) | Consumer project's `.husky/_/` and `_shared.sh` | YES — `.husky/_/` fully populated; `_shared.sh` hand-authored and committed | `project` for `_shared.sh`; `ephemeral` (generated) for `.husky/_/` contents | `.husky/_/` is generated by husky npm install; not user-authored. `_shared.sh` is the real library file. See §4. |
| 10 | **Status-line config** | `tools/statusline/config.toml` (JASON-OS repo, source of truth); `~/.claude/statusline/config.toml` (user-level installed copy); `~/.claude/statusline/config.local.toml` (machine-specific overrides, contains API key) | `~/.claude/statusline/config.toml` on other locale | YES — both `config.toml` and `config.local.toml` found; `config.local.toml` contains `weather_api_key` | `user` for `config.toml`; `machine` for `config.local.toml` (contains API key + absolute path) | Binary itself (`jason-statusline-v2.exe`) is machine-specific (gitignored); sync config only, not binary. |

---

## 4. Findings — Items Added or Surfaced (Missing from Brainstorm List)

### 4.1 `~/.claude/CLAUDE.md` (user-level CLAUDE.md)

**Status: NOT PRESENT on this machine.** Checked at `/c/Users/<user>/.claude/CLAUDE.md` — file does not exist. Anthropic Claude Code supports a user-level `CLAUDE.md` at `~/.claude/CLAUDE.md` that loads for every project. This is distinct from project CLAUDE.md. It is a valid sync source **in principle** — if the user creates one, it carries user-level behavioral tenets that should travel across locales.

**Disposition:** Add as a reserved category. Source: `~/.claude/CLAUDE.md`. Destination: same path on other locale. Scope-tag: `user`. Not yet present — walk must handle absent-file gracefully (treat as NEW when first written).

### 4.2 `~/.claude/agents/` (user-level subagents)

**Status: PRESENT — confirmed on this machine.** Contains 12 GSD-specific agent files (`gsd-codebase-mapper.md`, `gsd-planner.md`, etc.). These are user-level agents visible across all projects on this machine.

**Disposition:** The brainstorm lists "agents" but implies project-level only (`.claude/agents/`). The user-level agents at `~/.claude/agents/` are a separate and distinct sync source. Scope-tag: `user`. Should be included in inventory as a separate row from project-level agents.

**Source path:** `~/.claude/agents/`
**Destination path:** Same path on other locale
**Exists today:** YES

### 4.3 `.claude/agents/` (project-level subagents)

**Status: PRESENT — confirmed.** Contains project-level agent definitions (`contrarian-challenger.md`, `deep-research-searcher.md`, etc.).

**Disposition:** This is the counterpart to `~/.claude/agents/`. Scope-tag: `project`. The brainstorm's "agents" likely means this layer. Include explicitly with path clarification.

**Source path:** `.claude/agents/` (JASON-OS repo)
**Destination path:** Consumer project's `.claude/agents/`
**Exists today:** YES

### 4.4 `.claude/skills/` (project-level skills)

**Status: PRESENT — confirmed.** Contains all JASON-OS skills organized as subdirectories (`brainstorm/`, `checkpoint/`, `convergence-loop/`, `deep-plan/`, `deep-research/`, etc.). The brainstorm doesn't explicitly list skills as a `/context-sync` category — they're mentioned as a `/port` target. But they exist on disk and are a sync-relevant surface.

**Disposition:** Skills are a `/port` target (one-time port companion), not a `/context-sync` target. They require the understanding layer. `/context-sync` should NOT include skills. Note explicitly so planning doesn't inadvertently include them.

### 4.5 `~/.claude/skills/` (user-level skills)

**Status: EMPTY on this machine.** `ls` returned no output. No user-level skills installed outside the GSD package. No action needed today.

**Disposition:** Reserved path. If ever populated, scope-tag would be `user`. Currently irrelevant for `/context-sync`.

### 4.6 `~/.gitconfig` (global git config — distinct from `.git/config`)

**Status: PRESENT.** The brainstorm lists "git config overrides" but conflates global user config with repo-local config additions. These are two distinct layers:

- `~/.gitconfig` — global user identity, pager settings, LFS config, safe directories. Confirmed present with `user.name`, `user.email`, `[delta]` pager, `[filter "lfs"]` configuration.
- `.git/config` — per-repo: `hooksPath = .husky/_`, branch tracking, remote URL.

**Disposition:** Separate into two rows in the inventory table. Global gitconfig is `user`-scoped (identity, prefs) but contains `machine`-scoped content (safe directories with absolute paths, credential helpers if present). Per-repo `.git/config` is `project`-scoped and NOT a sync target (it contains machine-specific remote URLs and branch tracking — should never be synced). See §6.

### 4.7 `~/.npmrc` / `~/.yarnrc`

**Status: NOT PRESENT.** Checked `~/.npmrc` and `~/.yarnrc` — neither exists on this machine. The brainstorm candidate list mentioned these. No action needed.

**Disposition:** Remove from consideration. Not present; JASON-OS uses npm but the user has no custom npmrc configured.

### 4.8 `.husky/_shared.sh` (hand-authored lib file, distinct from generated `_/`)

**Status: PRESENT.** Confirmed at `.husky/_shared.sh`. This is user-authored (SKIP_CHECKS helpers, EXIT trap chaining) and committed to the repo. It is NOT generated. The brainstorm lists "husky local (`.husky/_/`)" but this conflates two different things:

- `.husky/_/` — generated by `npm install`, should never be synced (ephemeral)
- `.husky/_shared.sh` — hand-authored shared lib, scope `project`

**Disposition:** Split the brainstorm's "husky local" category into two:
- `.husky/_shared.sh` → scope `project`, sync-eligible
- `.husky/_/` → scope `ephemeral` (generated), NOT sync-eligible

### 4.9 Status-line binary (`~/.claude/statusline/jason-statusline-v2.exe`)

**Status: PRESENT.** Binary exists at `~/.claude/statusline/`. The brainstorm mentions "status-line config" but doesn't call out the binary explicitly.

**Disposition:** Binary is machine-specific (compiled Go binary, platform-specific). It is NOT a sync target. Only the config files (`config.toml`, `config.local.toml`) are sync-eligible. The source config lives in `tools/statusline/config.toml` (JASON-OS repo). Note: `config.local.toml` contains `weather_api_key` — a real secret. See §5.

### 4.10 VSCode / Cursor IDE keybindings

**Status: PRESENT for both VSCode and Cursor.**
- VSCode: `C:/Users/<user>/AppData/Roaming/Code/User/keybindings.json` — confirmed present (shift+enter terminal sequence binding)
- Cursor: `C:/Users/<user>/AppData/Roaming/Cursor/User/keybindings.json` — confirmed present

**Disposition:** The brainstorm lists "keybindings (`~/.claude/keybindings.json`)" but this appears to mean Claude Code keybindings specifically. IDE keybindings (VSCode/Cursor) are a separate surface. They are valid sync candidates if the user uses the same IDE on both locales. Scope-tag: `user` (IDE-personal preference) but path is deeply machine-specific on Windows (AppData paths). Add as an optional/advisory category. NOT a core `/context-sync` item; it should be an opt-in category.

### 4.11 `~/.claude/` hooks (`~/.claude/hooks/`)

**Status: PRESENT.** Contains `gsd-check-update.js`, `gsd-context-monitor.js`, `gsd-statusline.js`. These are user-level GSD hooks distinct from JASON-OS project hooks in `.claude/hooks/`.

**Disposition:** These are GSD-specific hooks, not JASON-OS hooks. They belong to the GSD skill layer. Include as a possible sync category (scope: `user`) but flag as GSD-specific — may not apply on a fresh JASON-OS locale without GSD. Low priority for v1 of `/context-sync`.

### 4.12 `~/.claude/` security_warnings_state files

**Status: PRESENT — 34+ files.** Format: `security_warnings_state_<UUID>.json`. These are Claude Code internal state files, not user-authored.

**Disposition:** Ephemeral Claude Code internal state. NOT a sync target. Scope: `ephemeral`. No action needed.

### 4.13 MCP configuration (`~/.claude/mcp.json` equivalent, `.claude/mcp.json`)

**Status: PRESENT via `.claude/settings.json` `mcpServers` equivalent.** The `~/.claude/mcp.json.bak` file suggests an MCP config existed. JASON-OS project `.claude/settings.json` has no `mcpServers` block (uses `enableAllProjectMcpServers: true` instead). The user-level `~/.claude/settings.json` does have `hooks` and plugin config.

**Disposition:** MCP server configuration is embedded in `settings.json` (project and user-level). It is partially captured by the "settings.local.json" and "env variables" categories already. However, the `mcpServers` block in `~/.claude/settings.json` (user-level) is a distinct sync surface not called out in the brainstorm. Add as a note under the settings category. Scope: `user` (MCP servers the user uses across projects) or `machine` (if server commands use absolute paths).

---

## 5. Findings — Secrets/PII Handling Per Category

The existing gitleaks pre-commit hook and `sanitize-error.cjs` SENSITIVE_PATTERNS set define the project's existing secrets detection approach. SENSITIVE_PATTERNS includes:
- `/home/[^/\s]+/gi` — Unix home paths
- `/Users/[^/\s]+/gi` — macOS home paths  
- `C:\\Users\\[^\\]+/gi` — Windows user paths
- `(?:password|api[_-]?key|token|secret|credential|auth)` patterns — credential values

These patterns apply to error sanitization at runtime. Context-sync needs analogous detection at **sync-time** (before writing to destination).

| # | Category | Can carry secrets? | Detection mechanism | Sync action when detected | Drift-record path storage rule |
|---|---|---|---|---|---|
| 1 | **Canonical memories** | SOMETIMES — memory files record decisions; could inadvertently capture project codenames, API patterns, or operator details in prose. `type: user` and `type: feedback` files: low risk. `type: project` files: SOMETIMES (project names, internal URLs). | Gitleaks-style pattern scan (SENSITIVE_PATTERNS) on content before sync. Flag on match. | Warn + hold — surface matched pattern to user, require explicit confirmation before syncing. Do not auto-skip. | Path itself (e.g., `memory/feedback_ack_requires_approval.md`) is NOT sensitive — generic filenames. Safe to store path in drift record. |
| 2 | **Tenets** | RARELY — tenets are behavioral rules, not credentials. Risk is project codenames in project-scoped tenets. | Same SENSITIVE_PATTERNS scan. | Same: warn + hold. | Path safe. |
| 3 | **CLAUDE.md local tweaks** | SOMETIMES — project-specific override sections can reference internal service names, internal URLs, project codenames. | SENSITIVE_PATTERNS scan on the tweak block content only (not the whole file). | Warn + hold per tweak block. | Path (`CLAUDE.md`) is not sensitive. Section slug stored in path field is safe. |
| 4 | **`settings.local.json`** | YES — confirmed on this machine: contains absolute Windows paths (`C:/Users/<user>/Workspace/dev-projects/jason-os/...`) in Bash allow rules. Could also contain credential helpers or operator-specific paths. | SENSITIVE_PATTERNS path-pattern scan PLUS: check every string value in the JSON for path-like content (`C:\\`, `/home/`, `/Users/`). | Block by default. Before syncing, strip known-absolute-path values and replace with placeholder or require user to confirm path remapping. The `machine_exclude = true` flag is the correct mechanism: ask once, always exclude. | Path (`.claude/settings.local.json`) is NOT sensitive. BUT: the `src_hash` and `dst_hash` in the drift record hash the whole file content — which includes the absolute paths. Hashes do not expose the paths themselves, but confirm that the file with those paths was processed. Safe to store hash; do not store file content. |
| 5 | **Env variables** | YES — env vars can be API keys, tokens, secrets. Even the `env` block in git-tracked `settings.json` currently only has `CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS` (safe), but the sync mechanism cannot assume this. `~/.claude/settings.json` could carry user-level env with tokens. | SENSITIVE_PATTERNS scan on each env key-value pair. Keys matching `token`, `key`, `secret`, `password`, `auth`, `credential` patterns → flag immediately. | Block on matched key. Require user to explicitly mark env var as machine-local (`machine_exclude = true`) or confirm it's safe to sync. Never auto-sync an env var whose key matches a secrets pattern. | Env var keys stored as path field (e.g., `env/CLAUDE_CODE_GLOB_TIMEOUT_SECONDS`) expose variable names. This is generally acceptable — key names are not secrets. But keys matching secrets patterns should be stored with a redacted marker in the path field (e.g., `env/REDACTED_KEY_3`) rather than the literal key name. |
| 6 | **Slash-command aliases** | SOMETIMES — command bodies (`.md` files in command dirs) could embed server URLs, project-specific identifiers, or (rarely) secrets hardcoded in command text. | SENSITIVE_PATTERNS scan on command file contents. | Warn + hold. User must confirm before syncing command files with flagged content. | Path field (e.g., `commands/gsd/execute-phase.md`) is safe — generic names. |
| 7 | **Keybindings (Claude Code)** | NO — key binding definitions are key sequences and command identifiers. No credentials. | No secrets scan needed. | Direct sync with hash comparison only. | Path (`~/.claude/keybindings.json`) is safe. |
| 8 | **Git config (global `~/.gitconfig`)** | YES — can contain `[credential]` helper config referencing credential manager, GPG signing key fingerprints (`signingkey`), and `[safe]` directory entries with absolute machine paths. On this machine: LFS config, delta pager, user identity (name + email = PII). | SENSITIVE_PATTERNS scan PLUS: parse `[credential]`, `[gpg]`, `[commit]` sections explicitly. Any `signingkey`, `helper`, or absolute path entry in `[safe]` must be flagged. | Two-tier: (a) identity fields (`user.name`, `user.email`) — sync as-is if user confirms they're the same on both locales; (b) credential/signing/safe-dir blocks — `machine_exclude = true` by default, never auto-sync. | Path (`~/.gitconfig`) is safe. But: section identifiers stored in path field (e.g., `gitconfig/[safe]`) could reveal absolute paths embedded in the section name (e.g., `[safe] directory = C:/Users/...`). The path field should store the SECTION NAME ONLY, not the value. Content stays in hashes only. |
| 9 | **Husky `_shared.sh`** | NO — SKIP_CHECKS helpers and EXIT trap chaining. Pure shell logic with no secrets. | No secrets scan needed. | Direct sync. | Path (`.husky/_shared.sh`) is safe. |
| 10 | **Status-line config (`config.toml`)** | NO — `config.toml` contains location (Nashville, TN, US), units, timezone, thresholds. No secrets. | No secrets scan needed. | Direct sync. | Path safe. |
| 10b | **Status-line config (`config.local.toml`)** | YES — `config.local.toml` contains a real `weather_api_key` value (32-hex-char secret; verbatim value REDACTED from this document per security protocol). ALSO contains `paths.binary_dir` with absolute machine path. | SENSITIVE_PATTERNS scan will catch `api_key` pattern. Additionally: TOML key-value scan for keys matching secrets patterns. | BLOCK this file from sync entirely. `machine_exclude = true` by default — set at registration, not on first run. `config.local.toml` is machine-specific by design (per CLAUDE.md §1: "The installed binary lives at `~/.claude/statusline/jason-statusline-v2.exe` and is machine-specific (gitignored)"). | Path (`config.local.toml`) is not itself sensitive, but the existence of a drift record for it would confirm API key presence. Use `machine_exclude = true` at record creation — this prevents any drift record entry from being written for the file's content. |
| 11 | **User-level agents (`~/.claude/agents/`)** | SOMETIMES — agent `.md` files could embed project-specific system prompts or internal URLs. GSD agents currently appear to be generic. | SENSITIVE_PATTERNS scan on agent file contents. | Warn + hold on match. | Path field (agent filename) is generally safe. |
| 12 | **Project-level agents (`.claude/agents/`)** | SOMETIMES — same risk as user-level. Project-scoped agent prompts may embed project-specific identifiers. | SENSITIVE_PATTERNS scan on agent file contents. | Warn + hold on match. | Path field safe. |

### Cross-cutting: Drift-record path leakage

One specific risk identified: if a memory file is named after a project codename (e.g., `memory/project_thunderbolt_plans.md`), the `path` field in the drift record exposes the codename even though the file content itself isn't stored. This is LOW risk for the current JASON-OS setup (memory filenames are generic: `project_jason_os.md`, `feedback_*`, `user_*`). However, the planning spec should note:

**Rule:** Before writing a drift-record entry, check the `path` value against a project-codename blocklist or against SENSITIVE_PATTERNS. If matched, hash the path and store `path_hash` instead of the raw path, with a `path_redacted: true` marker. The walk can reconstruct the actual path from its source enumeration — the drift record doesn't need the literal path for correctness, only for identification across invocations.

---

## 6. Findings — Scope-Tag Classification

Using the existing enum: `universal | user | project | machine | ephemeral`.

| # | Category | Primary scope-tag | Secondary/split | Split rationale |
|---|---|---|---|---|
| 1 | **Canonical memories** | `user` (for `type: user`, `type: feedback`) | `project` (for `type: project`), `user` (for `type: reference`, `type: tenet`) | The memory `type` frontmatter field determines scope-tag per file, not per category. The category as a whole is NOT uniform-scope. Split at the FILE level using `type` field. |
| 2 | **Tenets** | `user` (user behavioral tenets) | `project` (project-specific tenets) | Tenet identity is by naming convention (`t3_*`) or prose content — not frontmatter `type: tenet` (confirmed: `t3_convergence_loops.md` has `type: reference`). Scope is determined by tenet subject: universal behavioral rules → `user`; project-specific workflow rules → `project`. |
| 3 | **CLAUDE.md local tweaks** | `project` | `universal` (shared sections should be identical everywhere) | CLAUDE.md is mixed-scope. The upstream shared sections are `universal`. The per-project override sections are `project`. This is the CLAUDE.md section-level iteration design from C1's walk strategy — iteration unit is the named override section, not the whole file. Each section gets its own scope-tag. |
| 4 | **`settings.local.json`** | `machine` | — | Pure machine scope. Absolute paths make it inherently non-portable. Not splittable — the whole file is machine-specific. |
| 5 | **Env variables** | `user` (experiment flags, behavior flags) | `machine` (API tokens, locale paths, machine-specific values) | Env var scope must be determined per-key. A key like `CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1` is `user`-scoped (same behavior wanted everywhere). A key like `OPENAI_API_KEY=sk-...` is `machine`-scoped (locale credential). Classification rule: keys matching SENSITIVE_PATTERNS patterns → `machine`; keys with non-secret values recognizable as flags/settings → `user`. Ambiguous → ask user at first-sync. |
| 6 | **Slash-command aliases** | `user` | — | Command definitions are user workflow tools, not machine-specific or project-specific. Same commands wanted on all locales. |
| 7 | **Keybindings (Claude Code `~/.claude/keybindings.json`)** | `user` | — | Personal key binding preferences, not machine-specific. |
| 8 | **Git config (`~/.gitconfig`)** | `user` (identity, pager prefs, tool settings) | `machine` (credential helpers, signing keys, safe directory absolute paths) | HARD split: `[user]`, `[core]` pager, `[interactive]`, `[delta]`, `[filter "lfs"]` → `user`. `[credential]`, `[gpg]`, `[commit] gpgsign`, `[safe] directory = <abs-path>` → `machine`. The sync tool must parse by section and apply different scope-tags per section, or exclude the machine sections via `machine_exclude`. |
| 9 | **Husky `_shared.sh`** | `project` | — | Committed to the JASON-OS repo; project-specific implementation of SKIP_CHECKS helpers. Portable to other owned projects as a sync target (it's generic enough), but still `project` scope — it lives in the project repo. |
| 10 | **Husky `_/` (generated)** | `ephemeral` | — | Generated by `npm install`. Not user-authored. Should NEVER be synced — it will be regenerated on `npm install` at the destination. Remove from sync inventory. |
| 11 | **Status-line `config.toml`** | `user` | — | Location, timezone, thresholds — user preferences that travel across locales. |
| 11b | **Status-line `config.local.toml`** | `machine` | — | Contains API key and absolute binary path. Machine-specific by design. |
| 12 | **User-level agents (`~/.claude/agents/`)** | `user` | — | User-level GSD agents — intended to work on all this user's machines. |
| 13 | **Project-level agents (`.claude/agents/`)** | `project` | — | JASON-OS project agents — travel with the project. |
| 14 | **`~/.claude/CLAUDE.md`** (reserved) | `user` | — | User-level behavioral context, applies across all projects on a locale. |
| 15 | **IDE keybindings** (VSCode/Cursor) | `user` | `machine` (Windows AppData path is machine-specific) | Content is user-preference; physical path is machine-OS-specific. Cross-platform sync is complex (path differs by OS). Mark as optional/advisory category. |

### Hard-to-classify categories

**Memory files (category 1):** The scope varies PER FILE based on the `type` frontmatter field. The category "canonical memories" is not uniformly `user`-scoped. The walk must read each file's `type` field and apply scope-tag accordingly. No one scope-tag fits the category as a whole.

**Env variables (category 5):** Cannot be classified at category level — must classify per-key. Two-pass approach required: scan all env keys, apply SENSITIVE_PATTERNS → `machine`; remainder → `user`. Ambiguous keys ask user once.

**Global git config (category 8):** Section-level split is required. No uniform scope across the whole file.

---

## 7. Recommendation Summary

**Final inventory for planning** (18 categories including splits and additions):

| # | Category | Source path | Scope-tag | Sync-eligible | Secrets-handling |
|---|---|---|---|---|---|
| 1 | Canonical memories (user/feedback type) | `.claude/canonical-memory/*.md` | `user` | YES | Warn+hold on SENSITIVE_PATTERNS match |
| 2 | Canonical memories (project type) | `.claude/canonical-memory/*.md` | `project` | YES (to matching project locale) | Warn+hold |
| 3 | Canonical memories (reference/tenet type) | `.claude/canonical-memory/*.md` | `user` | YES | Warn+hold |
| 4 | CLAUDE.md override sections | `CLAUDE.md` (named section blocks) | `project` | YES | Warn+hold |
| 5 | `settings.local.json` | `.claude/settings.local.json` | `machine` | machine_exclude=true by default | BLOCK — absolute paths always present |
| 6 | Env vars (non-secret keys) | `.claude/settings.json` env block | `user` | YES | Pattern-scan per key |
| 7 | Env vars (secret keys) | `.claude/settings.json` env block | `machine` | machine_exclude=true | BLOCK on secrets-pattern match |
| 8 | Slash-command aliases | `~/.claude/commands/gsd/`, `~/.claude/commands/sc/` | `user` | YES | Warn+hold on SENSITIVE_PATTERNS in body |
| 9 | Claude Code keybindings | `~/.claude/keybindings.json` | `user` | YES (when present) | No secrets scan needed |
| 10 | Git config (identity/prefs sections) | `~/.gitconfig` `[user]`, `[core]`, `[delta]`, `[filter]` sections | `user` | YES | Identity (name/email) = PII → confirm once |
| 11 | Git config (credential/signing/safe sections) | `~/.gitconfig` `[credential]`, `[gpg]`, `[safe]` sections | `machine` | machine_exclude=true | BLOCK |
| 12 | Husky `_shared.sh` | `.husky/_shared.sh` | `project` | YES | No secrets needed |
| 13 | Status-line `config.toml` | `~/.claude/statusline/config.toml` (source: `tools/statusline/config.toml`) | `user` | YES | No secrets scan needed |
| 14 | Status-line `config.local.toml` | `~/.claude/statusline/config.local.toml` | `machine` | machine_exclude=true at registration | BLOCK — confirmed API key present |
| 15 | User-level agents | `~/.claude/agents/` | `user` | YES | Warn+hold on SENSITIVE_PATTERNS in body |
| 16 | Project-level agents | `.claude/agents/` | `project` | YES | Warn+hold on SENSITIVE_PATTERNS in body |
| 17 | `~/.claude/CLAUDE.md` (user-level) | `~/.claude/CLAUDE.md` | `user` | YES (when present) | Warn+hold |
| 18 | IDE keybindings (VSCode/Cursor) | OS-specific AppData paths | `user` | OPTIONAL / advisory | No secrets; path resolution is complex cross-platform |

**Categories removed from brainstorm list:**
- `.husky/_/` (generated — ephemeral, never sync)
- `~/.npmrc` / `~/.yarnrc` (not present on this machine)
- Status-line binary (machine-specific compiled artifact, not a config)
- `~/.claude/` security_warnings_state files (Claude Code internal ephemeral state)

**Categories added beyond brainstorm list:**
- `~/.claude/CLAUDE.md` (user-level CLAUDE.md — reserved path)
- User-level agents `~/.claude/agents/` (separate from project-level)
- Project-level agents `.claude/agents/` (explicit path)
- Status-line `config.local.toml` split from `config.toml` (different scopes/secrets rules)
- Git config section-level split (user vs. machine sections)
- IDE keybindings (optional advisory category)

---

## 8. Claims

1. **`.claude/settings.local.json` contains absolute Windows paths.** [HIGH] Direct filesystem read — file contains `"C:/Users/<user>/Workspace/dev-projects/jason-os/..."` in Bash allow rules. Confirms machine scope and secrets risk.

2. **`~/.claude/statusline/config.local.toml` contains a real API key (`weather_api_key`).** [HIGH] Direct filesystem read confirmed the key is present and well-formed; the verbatim value is REDACTED from this document per security protocol. This file must be excluded by default, not just warned about.

3. **Memory scope-tag is per-file (via `type` frontmatter), not per-category.** [HIGH] Confirmed by reading multiple memory files: `type: user` (user_expertise_profile.md), `type: project` (project_jason_os.md), `type: reference` (t3_convergence_loops.md, reference_pr_review_integrations.md). The category "canonical memories" is NOT uniformly `user`-scoped.

4. **No `type: tenet` value exists in the `memory_type` enum or in observed files.** [HIGH] Enum values in `enums.json` are: `user, feedback, project, reference, tenet, index`. The value `tenet` exists in the schema but no file currently uses it — `t3_convergence_loops.md` uses `type: reference`. Tenet identification is by naming convention only.

5. **`.husky/_/` is generated by npm install, not user-authored.** [HIGH] Confirmed by filesystem: contains `husky.sh` and all git hook stubs. Should never be a sync target. Only `.husky/_shared.sh` is the user-authored library file.

6. **User-level agents at `~/.claude/agents/` exist and are distinct from project-level `.claude/agents/`.** [HIGH] Both directories confirmed present. `~/.claude/agents/` contains 12 GSD agents. `.claude/agents/` contains JASON-OS research/workflow agents.

7. **`~/.claude/keybindings.json` does not exist on this machine.** [HIGH] Direct check returned not-found. Walk must handle absent-file as NEW state when first created.

8. **VSCode and Cursor IDE keybindings both exist at OS-specific AppData paths.** [HIGH] Confirmed both `C:/Users/<user>/AppData/Roaming/Code/User/keybindings.json` and `C:/Users/<user>/AppData/Roaming/Cursor/User/keybindings.json`. These are valid sync candidates but path resolution is platform-specific.

9. **`~/.gitconfig` contains user identity (PII: name + email) alongside machine-specific content (`[safe] directory` with absolute paths).** [HIGH] Direct read confirmed. Section-level split is required; no single scope-tag fits the whole file.

10. **`~/.npmrc` and `~/.yarnrc` are not present.** [HIGH] Both checked, neither found. Remove from inventory.

11. **`~/.claude/CLAUDE.md` (user-level) does not currently exist on this machine.** [HIGH] Direct check. Valid reserved sync category for when the user creates one.

12. **The `sanitize-error.cjs` SENSITIVE_PATTERNS set is the correct starting point for context-sync secrets detection.** [HIGH] Patterns cover Windows/Unix home paths and credential-pattern key=value pairs. Direct code read confirms. Extend with TOML key-name matching for config.local.toml.

13. **Drift-record `path` field could leak codenames if memory files are named after sensitive projects.** [MEDIUM] Current filenames are generic (no codenames observed). Risk is prospective. Mitigation: hash-or-redact path on SENSITIVE_PATTERNS match before writing drift record entry.

14. **Slash-command aliases are directory-structured, not flat files.** [HIGH] Confirmed: `~/.claude/commands/gsd/` and `~/.claude/commands/sc/` contain `.md` files. Iteration unit is the subdirectory. Confirmed by A4 and C1 findings — consistent.

15. **`.claude/settings.json` env block is git-tracked and currently contains only safe experiment flags.** [HIGH] Direct read: `CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1`, `CLAUDE_CODE_GLOB_TIMEOUT_SECONDS=60`. No secrets currently. Sync mechanism must still apply per-key secrets scan — cannot assume future env vars are safe.

16. **Per-repo `.git/config` is NOT a sync target.** [HIGH] Contains `hooksPath = .husky/_`, remote URLs, branch tracking — all machine+project specific. Should be excluded from all sync operations.

17. **`~/.claude/skills/` is empty on this machine; no user-level skills present.** [HIGH] Direct check returned no output. Reserved path, irrelevant for v1.

18. **Project-level skills in `.claude/skills/` belong to `/port` companion, not `/context-sync`.** [HIGH] Skills require the understanding layer (transformation, adaptation). The brainstorm explicitly assigns skills to the `/port` companion. Including them in `/context-sync` would be scope leakage.

---

## 9. Sources

| # | Location | Title | Type | Trust | CRAAP avg | Date |
|---|---|---|---|---|---|---|
| 1 | `.claude/canonical-memory/*.md` | Canonical memory files — frontmatter shape | Codebase ground truth | HIGH | 5.0 | 2026 |
| 2 | `~/.claude/projects/C--Users-<user>-Workspace-dev-projects-JASON-OS/memory/*.md` | User project memory files | Codebase ground truth | HIGH | 5.0 | 2026 |
| 3 | `.claude/settings.local.json` | Machine-specific settings (Bash allow rules) | Codebase ground truth | HIGH | 5.0 | 2026 |
| 4 | `.claude/settings.json` | Project settings (env block) | Codebase ground truth | HIGH | 5.0 | 2026 |
| 5 | `~/.claude/settings.json` | User-level settings (hooks, plugins, model) | Codebase ground truth | HIGH | 5.0 | 2026 |
| 6 | `.claude/sync/schema/enums.json` | Scope-tag enum (source_scope values) | Codebase ground truth | HIGH | 5.0 | 2026 |
| 7 | `.claude/sync/schema/SCHEMA.md` | Scope semantics (source_scope + runtime_scope split) | Codebase ground truth | HIGH | 5.0 | 2026 |
| 8 | `~/.claude/statusline/config.toml` | Statusline general config | Codebase ground truth | HIGH | 5.0 | 2026 |
| 9 | `~/.claude/statusline/config.local.toml` | Statusline machine-local config (API key confirmed) | Codebase ground truth | HIGH | 5.0 | 2026 |
| 10 | `~/.gitconfig` | Global git config | Codebase ground truth | HIGH | 5.0 | 2026 |
| 11 | `.git/config` | Per-repo git config | Codebase ground truth | HIGH | 5.0 | 2026 |
| 12 | `scripts/lib/sanitize-error.cjs` | SENSITIVE_PATTERNS regex set | Codebase ground truth | HIGH | 5.0 | 2026 |
| 13 | `.husky/pre-commit` | Gitleaks integration | Codebase ground truth | HIGH | 5.0 | 2026 |
| 14 | `.husky/_shared.sh` | Husky shared lib (user-authored) | Codebase ground truth | HIGH | 5.0 | 2026 |
| 15 | `~/.claude/agents/` listing | User-level agents | Codebase ground truth | HIGH | 5.0 | 2026 |
| 16 | `.claude/agents/` listing | Project-level agents | Codebase ground truth | HIGH | 5.0 | 2026 |
| 17 | `.research/cross-repo-movement-reframe/BRAINSTORM.md` | Context-sync source list (brainstorm) | Internal planning | HIGH | 5.0 | 2026-04-23 |
| 18 | `.research/cross-repo-movement-reframe/findings/D4-context-sync-ledger-need.md` | A4 findings — per-category memory shape, slash-cmd layout, memory types | Internal research | HIGH | 5.0 | 2026-04-23 |
| 19 | `.research/cross-repo-movement-reframe/findings/D8-drift-detection.md` | C1 findings — walk strategy per category | Internal research | HIGH | 5.0 | 2026-04-23 |

---

## 10. Gaps and Uncertainties

1. **`~/.claude/keybindings.json` format unknown.** File does not exist on this machine. The walk strategy must handle absent-file as NEW state. Format can be inferred from Claude Code conventions when the file first appears.

2. **Tenet identification mechanism is ambiguous.** BRAINSTORM says `type: tenet` in frontmatter identifies tenets; `enums.json` memory_type enum includes `tenet`; but no file currently uses it. The one tenet file found (`t3_convergence_loops.md`) uses `type: reference`. Planning must decide: adopt `type: tenet` as the canonical identifier and backfill existing tenets, OR use naming convention (`t[N]_` prefix) as the identification mechanism.

3. **`~/.claude/CLAUDE.md` behavior when present.** The file does not exist on this machine. It is documented as user-level context that applies across all Claude Code projects. When it exists, how Claude Code merges it with project CLAUDE.md is not confirmed from the codebase — only inferred from Anthropic's documented behavior.

4. **Cross-locale project-path hash resolution.** The `~/.claude/projects/` directory name is derived from the project's absolute path (e.g., `C--Users-<user>-Workspace-dev-projects-JASON-OS`). On a second locale with a different absolute path for the same repo (e.g., different username or drive letter), the hash will differ. C3 owns this; noted here as a gap that affects the walk strategy for memory destination paths.

5. **MCP configuration sync scope.** The `mcpServers` block in `~/.claude/settings.json` was not explicitly called out in the brainstorm. It is partially relevant to context-sync (MCP servers the user uses across projects). However, MCP server commands often contain absolute paths or secrets (API keys passed as env vars). This category needs deeper analysis before including it in v1.

6. **IDE keybindings path resolution is platform-specific.** On Windows: `AppData/Roaming/Code/User/keybindings.json`. On macOS: `~/Library/Application Support/Code/User/keybindings.json`. The sync mechanism would need OS detection to resolve the correct path on each locale. This makes IDE keybindings a non-trivial sync category for a cross-platform tool. Recommend: mark as optional/advisory, not core v1.

7. **GSD user-level hooks (`~/.claude/hooks/`) classification.** These are GSD-specific (`gsd-context-monitor.js`, `gsd-statusline.js`). They are not JASON-OS hooks. Whether they should be in `/context-sync` scope depends on whether JASON-OS's `/context-sync` is meant to manage GSD's user-level surface or only JASON-OS's own context. Left as open question for planning.

8. **Env var per-key iteration UX.** C1 noted tension between per-key iteration (finer control) and whole-file hash (simpler). This gap remains. The secrets handling rules above assume per-key iteration (needed for selective machine_exclude on secret keys). Planning must resolve.

---

## Confidence Assessment

- HIGH claims: 16
- MEDIUM claims: 2
- LOW claims: 0
- UNVERIFIED claims: 0
- Overall confidence: HIGH

All primary findings are grounded in direct filesystem reads of the JASON-OS codebase, confirmed against the brainstorm and sibling research files. No claims rely on training data alone.

---

## Serendipity

**`config.local.toml` contains a real live API key.** This was not anticipated at the level of detail the brainstorm captured — it mentioned "status-line config" as a sync category without flagging that the LOCAL config variant contains actual credentials. This is not just an abstract risk; it's a confirmed live secret in the sync-candidate set. The planning spec should use this as the canonical example for "category that must be machine_exclude=true at registration, not first-run." This is the most concrete secrets-handling finding in the entire inventory.

**Memory type enum is richer than brainstorm assumed.** The `memory_type` enum (`user, feedback, project, reference, tenet, index`) provides a natural scope-classification mechanism for memory files — if scope-tag assignment follows `type` field values, no per-file manual classification is needed. But the mapping between `memory_type` values and scope-tags is not yet defined. This is a clean planning deliverable: define the `memory_type → scope-tag` mapping table once; the walk uses it automatically.
