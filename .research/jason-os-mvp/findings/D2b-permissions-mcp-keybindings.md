# Findings: Permissions, MCP Servers, and Keybindings Inventory

**Searcher:** deep-research-searcher
**Profile:** codebase
**Date:** 2026-04-15
**Sub-Question IDs:** D2b

---

## Key Findings

### 1. Permission Architecture: Three-Layer Model [CONFIDENCE: HIGH]

SoNash uses a three-layer permission model. JASON-OS has inherited the first two layers with the third partially populated.

**Layer 1 — Project settings.json (committed, generic safety floor)**
Both repos share identical `permissions` blocks in their `.claude/settings.json`. This is the core safety floor.

**Layer 2 — settings.local.json (gitignored, session-specific overrides)**
Both repos have a `.claude/settings.local.json` that carries one-time or environment-specific allow grants.

**Layer 3 — ~/.claude/settings.json (user-global, cross-project)**
The global file carries only environment bootstrap permissions (curl, unzip, powershell, etc.) plus `additionalDirectories`.

---

### 2. Permission Rules — SoNash/JASON-OS Project settings.json [CONFIDENCE: HIGH]

The following table is sourced directly from `.claude/settings.json` in both SoNash and JASON-OS. The two files are **identical** in the permissions block.

**ALLOW rules:**

| Rule | Purpose | Generic/Project-specific | In JASON-OS |
|------|---------|--------------------------|-------------|
| `Edit` | Allow all file edits without prompt | Generic | YES (identical) |
| `Write` | Allow all file writes without prompt | Generic | YES (identical) |
| `Bash(*)` | Allow all shell commands (wildcard) | Generic (strong) | YES (identical) |
| `WebSearch` | Allow internet searches | Generic | YES (identical) |
| `WebFetch` | Allow URL fetching | Generic | YES (identical) |
| `Skill` | Allow Skill tool invocations | Generic | YES (identical) |
| `mcp__sonarcloud` | Allow SonarCloud MCP tool calls | Project-specific (SoNash has SonarCloud) | YES (present, but no active SonarCloud in JASON-OS) |
| `mcp__memory` | Allow memory MCP read/write | Generic | YES (identical) |
| `mcp__sequential-thinking__sequentialthinking` | Allow sequential thinking MCP | Generic | YES (identical) |
| `mcp__context7__resolve-library-id` | Allow Context7 library lookup | Generic | YES (identical) |
| `mcp__context7__query-docs` | Allow Context7 doc queries | Generic | YES (identical) |
| `mcp__plugin_episodic-memory_episodic-memory__search` | Allow episodic memory plugin search | Generic (plugin-provided) | YES (identical) |

**DENY rules:**

| Rule | Purpose | Generic/Project-specific | In JASON-OS |
|------|---------|--------------------------|-------------|
| `Bash(git push --force *)` | Block force push (any remote) | Generic safety | YES (identical) |
| `Bash(git push origin main)` | Block direct push to main | Generic safety | YES (identical) |
| `Bash(git reset --hard *)` | Block hard reset | Generic safety | YES (identical) |
| `Bash(rm -rf *)` | Block recursive force delete | Generic safety | YES (identical) |

**Permission philosophy observed:** The allow list grants `Bash(*)` globally — maximum shell freedom — then the deny list adds a short, explicit hard-stop list for the most destructive git and filesystem operations. The user feedback note "permission rules are the real lever, not shell aliases" is exactly reflected here: the deny rules are what actually constrain behavior, not any bash alias or wrapper.

---

### 3. Permission Rules — SoNash settings.local.json (gitignored) [CONFIDENCE: HIGH]

SoNash's local overrides are a living history of session-specific grants. Key patterns:

| Pattern | Purpose | Notes |
|---------|---------|-------|
| `Bash(xargs grep:*)`, `Bash(source .env.local)`, etc. | One-time grants for specific shell invocations | Accumulated over time |
| `Bash(SKIP_REASON=... SKIP_REVIEWER=1 git push *)` (×4) | Authorized push bypasses with documented reason | Reflects `SKIP_REASON` policy from CLAUDE.md |
| `Bash(go version:*)`, `Bash(go build:*)`, `Bash(go test:*)` | Go toolchain access | SoNash-specific |
| `Bash(./tools/statusline/sonash-statusline.exe)` | Statusline binary execution | SoNash-specific |
| `Bash(fzf --version)`, `Bash(bat:*)`, `Bash(eza --oneline --icons=never .)`, etc. | CLI tool access grants | Could be generic |
| `Bash(zoxide *)`, `Bash(yq *)`, `Bash(starship *)`, `Bash(difft *)`, `Bash(htmlq *)` | Tool-specific grants | Could be generic |
| `Bash(rm -f .claude/hooks/.session-agents.json ...)` | Specific cleanup commands | SoNash-specific paths |
| `Bash(cp /c/Users/jbell/Downloads/memory/... ~/.claude/...)` | One-time memory file copy | User-specific, not portable |

**JASON-OS settings.local.json** has only a single entry: a grant for the `cp` command used to bootstrap agents from SoNash to JASON-OS. This is a setup artifact.

---

### 4. Permission Rules — ~/.claude/settings.json (User-Global) [CONFIDENCE: HIGH]

| Rule | Purpose | Notes |
|------|---------|-------|
| `Bash(curl *)` | Allow curl commands | Bootstrap/install tooling |
| `Bash(unzip *)` | Allow unzip | Bootstrap tooling |
| `Bash(export *)` | Allow export commands | Environment setup |
| `Bash(powershell *)` | Allow PowerShell invocation | Windows-specific |
| `Bash(cmd.exe *)` | Allow cmd.exe invocation | Windows-specific |
| `Bash(env *)` | Allow env commands | Environment inspection |
| `additionalDirectories: ["C:\\Users\\jbell"]` | Grant access to home dir outside project | Cross-project access |

Also notable: `CLAUDE_CODE_DISABLE_ADAPTIVE_THINKING: "1"` (env), model fixed to `opus[1m]`, `autoDreamEnabled: true`, `effortLevel: high`.

---

### 5. MCP Servers — Full Inventory [CONFIDENCE: HIGH]

MCP servers come from three sources: `.mcp.json` (project-root, loaded by Claude Code), plugin-provided auto-discovery, and user-global `~/.claude/mcp.json` (absent in this environment).

**Source 1: SoNash `.mcp.json` (project-root dotfile)**

| Server Name | Command | Purpose | Portable | In JASON-OS |
|-------------|---------|---------|---------|-------------|
| `memory` | `cmd /c npx -y @modelcontextprotocol/server-memory` | In-session key-value memory store | YES (npx, no secrets) | NO (.mcp.json absent) |
| `sonarcloud` | `node --env-file=.env.local scripts/mcp/sonarcloud-server.js` | SonarCloud code quality API integration | NO (custom script + .env.local secrets) | NO |

Note from .mcp.json: "Firebase, GitHub, Context7 are auto-discovered by Claude Code plugins. Only non-auto-discovered MCP servers need entries here."

**Source 2: Plugin-provided MCPs (auto-discovered via enabledPlugins)**

These are registered via the plugin system, not .mcp.json. Referenced in settings.json allow list:

| Permission Target | Plugin Source | Purpose | Portable |
|-------------------|--------------|---------|---------|
| `mcp__context7__resolve-library-id` | `context7@claude-plugins-official` | Look up library ID for docs | YES |
| `mcp__context7__query-docs` | `context7@claude-plugins-official` | Query library documentation | YES |
| `mcp__sequential-thinking__sequentialthinking` | Plugin (exact source unclear) | Structured step-by-step reasoning | YES |
| `mcp__plugin_episodic-memory_episodic-memory__search` | `episodic-memory@superpowers-marketplace` | Cross-session memory search | YES (plugin-provided) |

**Source 3: SoNash .vscode/mcp.json (VS Code IDE servers, not Claude Code)**

| Server | Purpose | Portable |
|--------|---------|---------|
| `io.github.upstash/context7` | Context7 for VS Code (requires API key via input prompt) | YES (with API key) |
| `puppeteer` | Browser automation for VS Code | YES (npx) |
| `playwright` | Cross-browser testing for VS Code | YES (npx) |

These are VS Code-IDE-specific and not consumed by Claude Code CLI directly.

**SoNash mcp.global-template.json (recommended global additions, not yet in ~/.claude/mcp.json):**

| Server | Purpose | Portable |
|--------|---------|---------|
| `ccusage` | Claude Code usage tracking | YES (bunx) |
| `playwright` | Browser automation | YES (npx) |

**~/.claude/mcp.json**: Does not exist on this machine. No user-global MCP servers are registered outside the project and plugin system.

**JASON-OS MCP status**: No `.mcp.json` exists. Only plugin-provided MCPs from the shared allow list would be active, but the plugins themselves are not installed (installed_plugins.json shows `"plugins": {}`).

---

### 6. Keybindings — No keybindings.json Exists [CONFIDENCE: HIGH]

Exhaustive search found:
- No `~/.claude/keybindings.json`
- No `.claude/keybindings.json` in SoNash
- No `.claude/keybindings.json` in JASON-OS
- No keybinding files in the plugin cache
- No keybinding configuration in any settings file

The superpowers plugin definition (plugin.json) does not define keybindings. No slash commands in the codebase are mapped to keyboard shortcuts.

**Conclusion**: Keybindings are not a configured organ in SoNash. Operator interaction is entirely through slash commands (`/skill`, `/deep-plan`, etc.) and Claude Code's built-in terminal UI shortcuts (Ctrl+C, etc.), none of which are project-configured.

---

### 7. env Flags as a Hidden Permission Layer [CONFIDENCE: HIGH]

Both SoNash and JASON-OS settings.json carry:

```json
"env": {
  "CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS": "1",
  "CLAUDE_CODE_GLOB_TIMEOUT_SECONDS": "60"
}
```

These are capability-enabling flags, not permissions per se, but they shape what Claude can do:
- `CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS: "1"` — enables parallel agent team spawning
- `CLAUDE_CODE_GLOB_TIMEOUT_SECONDS: "60"` — extends glob operation timeout for large repos

The global settings also set `CLAUDE_CODE_DISABLE_ADAPTIVE_THINKING: "1"` which disables automatic extended thinking, likely for cost control.

---

## Sources

| # | Source | Title | Type | Trust | CRAAP | Date |
|---|--------|-------|------|-------|-------|------|
| 1 | `/c/Users/jbell/.local/bin/sonash-v0/.claude/settings.json` | SoNash project settings | Filesystem | T1 | 5/5/5/5/5 | 2026-04 |
| 2 | `/c/Users/jbell/.local/bin/JASON-OS/.claude/settings.json` | JASON-OS project settings | Filesystem | T1 | 5/5/5/5/5 | 2026-04 |
| 3 | `/c/Users/jbell/.claude/settings.json` | User-global settings | Filesystem | T1 | 5/5/5/5/5 | 2026-04 |
| 4 | `/c/Users/jbell/.local/bin/sonash-v0/.mcp.json` | SoNash MCP server config | Filesystem | T1 | 5/5/5/5/5 | 2026-04-09 |
| 5 | `/c/Users/jbell/.local/bin/sonash-v0/.claude/mcp.global-template.json` | Global MCP template | Filesystem | T1 | 5/5/5/5/5 | 2026-04 |
| 6 | `/c/Users/jbell/.local/bin/sonash-v0/.claude/settings.global-template.json` | Global settings template with enabledPlugins | Filesystem | T1 | 5/5/5/5/5 | 2026-04 |
| 7 | `/c/Users/jbell/.local/bin/sonash-v0/.claude/REQUIRED_PLUGINS.md` | Plugin inventory documentation | Filesystem | T1 | 5/5/4/5/5 | 2026-04 |
| 8 | `/c/Users/jbell/.local/bin/sonash-v0/.vscode/mcp.json` | VS Code MCP servers | Filesystem | T1 | 5/5/5/5/5 | 2026-04 |
| 9 | `/c/Users/jbell/.local/bin/JASON-OS/.claude/settings.local.json` | JASON-OS local settings | Filesystem | T1 | 5/5/5/5/5 | 2026-04 |
| 10 | `/c/Users/jbell/.local/bin/sonash-v0/.claude/settings.local.json` | SoNash local settings | Filesystem | T1 | 5/5/5/5/5 | 2026-04 |
| 11 | `/c/Users/jbell/.claude/plugins/installed_plugins.json` | Global installed plugins | Filesystem | T1 | 5/5/5/5/5 | 2026-04-15 |

---

## Contradictions

**JASON-OS settings.json includes MCP allow rules for servers that don't exist in JASON-OS.** The allow list includes `mcp__sonarcloud`, `mcp__memory`, `mcp__sequential-thinking__sequentialthinking`, `mcp__context7__resolve-library-id`, `mcp__context7__query-docs`, and `mcp__plugin_episodic-memory_episodic-memory__search` — but JASON-OS has no `.mcp.json` and no installed plugins. These allow rules are harmless but dead weight until the corresponding servers are actually registered.

**enabledPlugins absent from JASON-OS settings.json but referenced.** SoNash settings.json has `"enabledPlugins": {"superpowers@claude-plugins-official": true, "superpowers-chrome@superpowers-marketplace": true}`. JASON-OS settings.json has no `enabledPlugins` key, yet the permissions allow list references plugin-provided tools like `mcp__plugin_episodic-memory_episodic-memory__search`.

**installed_plugins.json shows no plugins installed** despite the plugin cache containing a superpowers 5.0.7 download. The cache exists but the plugin is not registered as installed.

---

## Gaps

1. **No active ~/.claude/mcp.json found.** The global MCP layer is effectively empty. It is unknown whether MCPs like `sequential-thinking` are provided by a currently-active plugin or by some other registration mechanism not visible in the filesystem.

2. **Plugin-to-MCP mapping not fully traceable from filesystem alone.** The permissions allow list references `mcp__sequential-thinking__sequentialthinking` but no config file in either repo or the plugin cache explicitly registers this server under that name. It may be registered by the Claude Code application layer directly via an installed plugin, but the plugin shows as not installed.

3. **Keybindings are genuinely absent** as a configured layer — this is not a gap in research but a confirmed absence. Claude Code CLI does not appear to use a keybindings.json file at all in this configuration.

4. **SoNash has a custom sonarcloud MCP server** (`scripts/mcp/sonarcloud-server.js`) that is project-specific. Its actual implementation was not read — its full capabilities are unknown.

---

## Serendipity

**The deny list is the real security spine, not the allow list.** `Bash(*)` makes the allow list nearly irrelevant for shell commands. The four deny rules (`git push --force`, `git push origin main`, `git reset --hard`, `rm -rf`) are what actually constrain destructive behavior. This matches the user's stated philosophy: "permission rules are the real lever." The allow list exists mainly to pre-authorize MCP tool calls without per-session prompts.

**settings.local.json as a policy log.** SoNash's settings.local.json is 40 entries of accumulated one-time grants. It functions as an implicit log of every time a user authorized an exceptional operation (especially SKIP_REASON push bypasses). JASON-OS has only 1 entry. This delta tells a story: SoNash is a mature, well-exercised system; JASON-OS is day-one.

**CLAUDE_CODE_DISABLE_ADAPTIVE_THINKING in global settings.** This is set to "1" globally, meaning extended thinking is disabled across all projects including JASON-OS. This is an invisible capability constraint that isn't in either project's settings.json.

---

## Confidence Assessment

- HIGH claims: 7
- MEDIUM claims: 0
- LOW claims: 0
- UNVERIFIED claims: 0
- **Overall confidence: HIGH** — all claims sourced directly from filesystem files (T1 evidence). No web sources or training data used.
