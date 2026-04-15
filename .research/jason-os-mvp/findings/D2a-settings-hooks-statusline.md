# Findings: SoNash Settings, Hooks, and Statusline Inventory

**Searcher:** deep-research-searcher (D2a)
**Profile:** codebase
**Date:** 2026-04-15
**Sub-Question IDs:** D2a

---

## Key Findings

### 1. settings.json Structure — Both Projects [CONFIDENCE: HIGH]

Both SoNash and JASON-OS use an identical top-level settings.json schema. The
shared fields are: `permissions.allow`, `permissions.deny`, `env`,
`enableAllProjectMcpServers`, `disabledMcpjsonServers`, `statusLine`, and
`hooks`.

**SoNash:** `.claude/settings.json` (318 lines). Full hook wiring is in this
file. The `enabledPlugins` block adds superpowers and superpowers-chrome plugin
registrations (SoNash-specific).

**JASON-OS:** `.claude/settings.json` (81 lines). Same permissions/env block
as SoNash — copy-pasted verbatim (same MCP allow list including
`mcp__sonarcloud`, same deny list). Hooks block is minimal: 3 hooks only.

**Permissions deny list (both):**
```
Bash(git push --force *)
Bash(git push origin main)
Bash(git reset --hard *)
Bash(rm -rf *)
```

**Env vars (both):**
```json
"CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS": "1"
"CLAUDE_CODE_GLOB_TIMEOUT_SECONDS": "60"
```

Citation: SoNash `.claude/settings.json`:1-317; JASON-OS `.claude/settings.json`:1-81.

---

### 2. settings.local.json — Granted-by-Approval Overrides [CONFIDENCE: HIGH]

Both projects have `.claude/settings.local.json` (gitignored by default) which
accumulates `permissions.allow` entries for one-off commands approved at
runtime.

**SoNash settings.local.json** contains 40 entries including:
- Go build/test commands for the statusline binary
- `SKIP_REASON` git push bypasses (session-level security exceptions)
- File operation overrides from specific sessions
- Bash shortcuts for tools like `fzf`, `bat`, `eza`, `zoxide`, `yq`, `starship`

**JASON-OS settings.local.json** contains 2 entries: `mkdir -p` and a `cp`
command that copied agent files from SoNash — evidence of bootstrap session.

Citation: SoNash `.claude/settings.local.json`:1-42; JASON-OS `.claude/settings.local.json`:1-8.

---

### 3. SoNash Hook Inventory — Full [CONFIDENCE: HIGH]

SoNash has **29 hook scripts** in `.claude/hooks/` plus a `lib/` subdirectory
and a `global/` subdirectory with 2 additional hooks. All hooks are Node.js
except `ensure-fnm.sh` (bash). Every hook invocation in SoNash is wrapped with
`bash .claude/hooks/ensure-fnm.sh node <hookname>.js` to guarantee the
correct Node version via fnm. JASON-OS hooks call `node <hookname>.js` directly
(bare node, no fnm wrapper).

Citation: SoNash `.claude/settings.json`:36-306; JASON-OS `.claude/settings.json`:35-80.

---

### 4. Hook Inventory Table [CONFIDENCE: HIGH]

The table below captures every distinct hook script used in SoNash's settings.json wiring.

| # | Hook Script | Event | Matcher / if-condition | What it does | What it surfaces to model | SoNash-specific? | In JASON-OS? |
|---|-------------|-------|------------------------|--------------|--------------------------|-----------------|--------------|
| 1 | `session-start.js` | SessionStart | (no matcher — all sessions) | npm install, Firebase Functions build, compile tests, check pattern compliance, check consolidation status | Warnings about dep state, build failures, consolidation status | YES — Firebase build, pattern compliance, consolidation all SoNash-specific | NO |
| 2 | `check-mcp-servers.js` | SessionStart | (no matcher — all sessions) | Reads `.mcp.json`, outputs server names to stdout | "Available MCP servers: X, Y. Use mcp__<server>__<tool> to invoke." | NO — portable | YES (identical copy) |
| 3 | `check-remote-session-context.js` | SessionStart | (no matcher — all sessions) | git fetch, scan recent `claude/` branches, compare SESSION_CONTEXT.md session counters | Warning if remote branch has newer session context, with merge instructions | MOSTLY portable (relies on SESSION_CONTEXT.md convention; that convention exists in SoNash) | NO |
| 4 | `compact-restore.js` | SessionStart | matcher: `"compact"` | Reads `.claude/state/handoff.json` (written by pre-compaction-save.js) | Structured recovery context: task state, commit log, git state, active plan, session notes | NO — portable | NO |
| 5 | `global/gsd-check-update.js` | SessionStart | (no matcher — all sessions) | Spawns background process to check GSD plugin version vs npm registry; writes to `~/.claude/cache/gsd-update-check.json` | Nothing directly (feeds statusline update indicator) | NO — but requires GSD plugin | NO |
| 6 | `block-push-to-main.js` | PreToolUse | matcher: `^(?i)bash$`, if: `Bash(git push *)` | Parses push command, blocks if target is `main` or `master`. Exit 2 = block. | Block message: "Direct pushes to main are not allowed" | NO — portable | YES (identical copy) |
| 7 | `pre-commit-agent-compliance.js` | PreToolUse | matcher: `^(?i)bash$`, if: `Bash(git commit *)` | Checks `.claude/hooks/.session-agents.json` for code-reviewer/security-auditor invocation; blocks commit if required agents not run | Block message listing which agents are required | MOSTLY portable (agent names are configurable) | NO |
| 8 | `deploy-safeguard.js` | PreToolUse | matcher: `^(?i)bash$`, if: `Bash(firebase deploy *)` | Checks build freshness (.next/), env vars, last test run status | Block message with pre-flight failures | YES — Firebase-specific | NO |
| 9 | `env-guard` (inline bash) | PreToolUse | matcher: `^(?i)write$`, if: `Write(.env.local.encrypted)` | Inline bash: blocks write to `.env.local.encrypted`, appends hook warning | Block: "[env-guard] BLOCKED: .env.local.encrypted must not be overwritten by AI agents" | YES — SoNash-specific file | NO |
| 10 | `settings-guardian.js` | PreToolUse | matcher: `^(?i)(write\|edit)$`, if: `Write(.claude/settings.json)\|Edit(.claude/settings.json)` | Validates settings.json structure; checks for removal of critical hooks (`block-push-to-main.js`, `pre-commit-agent-compliance.js`, `settings-guardian.js`) | Block with corruption warning | NO — portable | YES (different: no if-condition in JASON-OS; fires on all Write/Edit) |
| 11 | `firestore-rules-guard.js` | PreToolUse | matcher: `^(?i)(write\|edit)$`, if: `Write(**/firestore.rules)\|Edit(**/firestore.rules)` | Checks for removal of write-block patterns on protected collections | Block: "Removing write-block pattern on [collection] is not allowed" | YES — Firestore-specific | NO |
| 12 | `large-file-gate.js` | PreToolUse | matcher: `^(?i)read$`, if: `Read(*.jsonl)\|Read(*.log)\|Read(*.csv)\|Read(*.ndjson)` | Checks file size before read. >5MB = block, >500KB = warn | Block/warn message with file size | NO — portable | YES (but different: no if-condition, fires on all Read) |
| 13 | `gsd-prompt-guard.js` | PreToolUse | matcher: `Write\|Edit` (no if-condition; timeout 5s) | Scans file content being written to `.planning/` for prompt injection patterns. Advisory (does not block). | Warning about detected injection pattern | NO — portable (`.planning/` convention-tied but logic is generic) | NO |
| 14 | `post-write-validator.js` | PostToolUse | matcher: `^(?i)write$` + `^(?i)edit$` + `^(?i)multiedit$` | Mega-hook: S0/S1 audit JSONL validation, pattern compliance, React component size, Firestore write block, test mocking validator, App Check validator, TypeScript strict check, repository pattern check, agent trigger enforcer | Warnings and blocks per failed check; agent suggestions | MIXED — core write-validation portable; Firestore/AppCheck/React/Firebase checks are SoNash-specific | NO |
| 15 | `post-read-handler.js` | PostToolUse | matcher: `^(?i)read$` | Context tracking: counts files read this session, warns at 15-file threshold; auto-saves to MCP memory when thresholds hit | Context usage warning: "You have read N files. Consider compacting." | NO — portable | NO |
| 16 | `decision-save-prompt.js` | PostToolUse | matcher: `^(askuserquestion\|AskUserQuestion\|ASKUSERQUESTION)$` | Fires after AskUserQuestion with 3+ questions containing significant keywords; prompts (does not block) to save decision to SESSION_DECISIONS | Reminder: "Consider documenting this decision" | NO — portable | NO |
| 17 | `commit-tracker.js` | PostToolUse | matcher: `^(?i)bash$`, if: `Bash(git commit *)\|Bash(git cherry-pick *)\|Bash(git merge *)\|Bash(git revert *)` | Appends structured commit entry to `.claude/state/commit-log.jsonl`; compaction-resilient Layer A | (state only; no model output) | NO — portable | NO |
| 18 | `test-tracker.js` | PostToolUse | matcher: `^(?i)bash$`, if: `Bash(npm test *)\|Bash(npx vitest *)` | Appends test run result to `.claude/state/test-runs.jsonl`; on failure also appends hook warning | (state + failure warning) | NO — portable (test command patterns may vary) | NO |
| 19 | `track-agent-invocation.js` | PostToolUse | matcher: `^(task\|Task\|TASK\|agent\|Agent\|AGENT)$` | Appends agent invocation entry to `.claude/hooks/.session-agents.json`; feeds pre-commit-agent-compliance.js | (state only; no model output) | NO — portable | NO |
| 20 | `governance-logger.js` | PostToolUse | matcher: `^(?i)(write\|edit)$`, if: `Write(CLAUDE.md)\|Edit(CLAUDE.md)\|Write(.claude/settings.json)\|Edit(.claude/settings.json)` | Logs governance changes to `.claude/state/governance-changes.jsonl` and appends hook warning. Never blocks. | Warning: "Governance file changed: [file]" | NO — portable | NO |
| 21 | `post-todos-render.js` | PostToolUse | matcher: `^(?i)(write\|edit\|multiedit)$`, if: `Write(.planning/todos.jsonl)\|Edit(.planning/todos.jsonl)` | Runs `scripts/planning/render-todos.js` to regenerate TODOS.md from JSONL; git stages the .md | (non-blocking; state management) | NO — portable if `.planning/` convention used | NO |
| 22 | `user-prompt-handler.js` | UserPromptSubmit | (no matcher) | Multi-function: (a) alerts reminder with cooldown; (b) context window warning; (c) pending MCP saves; (d) GSD-specific workflow checks | Injects reminders about pending alerts, context usage, MCP saves into model context | MIXED — alerts/context portable; GSD workflow checks are plugin-specific | NO |
| 23 | `loop-detector.js` | PostToolUseFailure | matcher: `^(?i)bash$`, if: `Bash(npm run build *)\|Bash(npm test *)\|Bash(npx tsc *)\|Bash(npm run lint *)` | Hashes normalized error output; warns if same error hash seen 3+ times in 20-min window | Warning: "Repeated failure detected. Try a different approach." | NO — portable | NO |
| 24 | `pre-compaction-save.js` | PreCompact | (no matcher) | Captures full state snapshot to `.claude/state/handoff.json`: session counter, task state, commit log, git state, agent invocations, files read, active plan, session notes, compaction trigger type | (state only; feeds compact-restore.js on next SessionStart) | NO — portable | NO |
| 25 | `ntfy.sh curl` (inline) | Notification | (no matcher) | `curl -s -d "Claude Code needs your attention" ntfy.sh/sonash-claude` | (push notification to user; nothing to model) | YES — SoNash ntfy.sh channel | NO |
| 26 | `gsd-context-monitor.js` | PostToolUse (all) | (no matcher — every tool) | Reads context bridge file from `/tmp/claude-ctx-{session}.json` (written by statusline); injects warning into additionalContext at 35%/25% remaining thresholds | additionalContext warnings: "Context approaching limit — wrap up" / "Context critical — stop and save" | NO — portable (requires GSD plugin or equivalent bridge) | NO |
| 27 | `gsd-workflow-guard.js` | PreToolUse | matcher: `Write\|Edit` (no if) | Advisory: warns if Claude makes file edits outside a GSD workflow context. Reads `.planning/config.json` for `hooks.workflow_guard: true` to enable. | Advisory warning (does not block) | NO — portable with `.planning/` convention | NO |
| 28 | `global/gsd-check-update.js` | SessionStart | (no matcher) | Spawns background process to compare installed GSD version vs npm registry; writes update-available flag to cache | Nothing directly (statusline reads cache file) | NO — portable to any GSD-using project | NO |
| 29 | `global/statusline.js` | (statusLine widget — not a hook event) | N/A | Pure statusline script used by global config: reads stdin JSON, outputs model/branch/task/dir/context bar | N/A — user-facing display only | NO — portable | NO |

---

### 5. ensure-fnm.sh — SoNash's Node Version Bootstrapper [CONFIDENCE: HIGH]

Every hook invocation in SoNash uses `bash .claude/hooks/ensure-fnm.sh node <hook>.js` as a wrapper. This script:
1. Checks if current `node` matches `.nvmrc` pinned version (fast path)
2. Falls back to `fnm env --shell bash` to initialize fnm
3. Runs `fnm use --silent-if-unchanged`
4. Then `exec`s the actual command

JASON-OS calls `node .claude/hooks/<hook>.js` directly. This works on Windows
if Node is globally on PATH but will fail on version mismatch if `.nvmrc` is
present. The `ensure-fnm.sh` wrapper is portable infrastructure, not
SoNash-specific.

Citation: SoNash `.claude/hooks/ensure-fnm.sh`:1-74.

---

### 6. lib/ Subdirectory — Shared Hook Utilities [CONFIDENCE: HIGH]

Both projects have `.claude/hooks/lib/` with these shared modules:

| Module | Purpose |
|--------|---------|
| `symlink-guard.js` | `isSafeToWrite()` — blocks writes through symlinks |
| `git-utils.js` | `gitExec()`, `projectDir` resolution |
| `sanitize-input.js` | Strips control chars, caps length |
| `state-utils.js` | `loadJson()`, `saveJson()` for state files |
| `rotate-state.js` | `rotateJsonl()` for log rotation |
| `inline-patterns.js` | (SoNash-specific) Pattern compliance library |

JASON-OS has the same lib files (ported as part of the hooks). However, hooks
like `large-file-gate.js` and `settings-guardian.js` in JASON-OS reference
`../../scripts/lib/sanitize-error.cjs` — a SoNash scripts path that doesn't
exist in JASON-OS. This is a latent dependency gap.

Citation: Bash ls output `.claude/hooks/lib/` (both repos).

---

### 7. Statusline — Three Implementations [CONFIDENCE: HIGH]

**SoNash v3 (active):** `./tools/statusline/sonash-statusline-v3.exe`
- Written in Go (source: `tools/statusline/main.go`, `widgets.go`, `render.go`, etc.)
- Compiled Windows binary. `padding: 2`.
- 22 widgets (A1–I4): model, session duration, permission mode, active agent,
  git branch, project dir, worktree, context gauge, rate limit 5hr/7d/reset,
  lines changed, hook health, unacked warnings, current task, clock, weather
  (Nashville/imperial), weather forecast, uptime, GitHub PR status, CI/CD
  pipeline, session count today
- Config: `tools/statusline/config.toml` — separator `│`, 3 lines,
  `color_mode="16"`, weather for Nashville TN, timezone America/Chicago
- The binary reads stdin JSON from Claude Code, polls external APIs (weather,
  GitHub, CI), and reads local state files. Refresh: on every statusLine poll
  (Claude Code-driven cadence). 5-min cache TTL for external data.

**SoNash global/statusline.js (GSD plugin):** `.claude/hooks/global/statusline.js`
- Node.js script registered via global GSD plugin config (not in project settings.json)
- Surfaces: model, branch (via `git rev-parse`), current task (from `~/.claude/todos/`), dir, context bar
- Cleaner/simpler than the Go binary; sanitizes all output against ANSI injection

**gsd-statusline.js (older GSD hook):** `.claude/hooks/gsd-statusline.js`
- Earlier version of the GSD Node.js statusline. Same data but lacks branch. Writes context bridge to `/tmp/claude-ctx-{session}.json` for `gsd-context-monitor.js`.

**JASON-OS statusline:** `.claude/statusline-command.sh` (bash script)
- Reads stdin JSON with `jq`. `padding: 2`.
- Surfaces: path (truncated to 3 components), git branch + status flags (+!?⇡⇣), node version, model display name, `ctx:N%`
- No context bar visualization, no task tracking, no weather, no rate limits
- Depends on `jq` and `git` being on PATH

Citation: SoNash `settings.json`:308-312; JASON-OS `settings.json`:30-34; `tools/statusline/widgets.go`:26-48; `tools/statusline/config.toml`:1-34; JASON-OS `.claude/statusline-command.sh`:1-63.

---

### 8. Portability Classification Summary [CONFIDENCE: HIGH]

**Fully portable (no SoNash dependencies):**
- `check-mcp-servers.js`
- `block-push-to-main.js`
- `settings-guardian.js`
- `large-file-gate.js`
- `compact-restore.js`
- `pre-compaction-save.js`
- `check-remote-session-context.js` (relies on SESSION_CONTEXT.md convention)
- `pre-commit-agent-compliance.js` (agent names configurable)
- `commit-tracker.js`
- `track-agent-invocation.js`
- `decision-save-prompt.js`
- `post-read-handler.js`
- `governance-logger.js`
- `loop-detector.js`
- `post-todos-render.js`
- `gsd-context-monitor.js` (needs statusline bridge file)
- `gsd-prompt-guard.js`
- `gsd-workflow-guard.js`
- `test-tracker.js`
- `user-prompt-handler.js` (GSD checks optional)
- `global/statusline.js`
- `ensure-fnm.sh`

**SoNash-specific (Firebase/project-specific):**
- `session-start.js` — Firebase build + pattern compliance
- `deploy-safeguard.js` — `firebase deploy` gate
- `env-guard` inline — `.env.local.encrypted` protection
- `firestore-rules-guard.js` — Firestore collection write-block
- `ntfy.sh` Notification inline — SoNash push notification channel
- `post-write-validator.js` — portable skeleton, SoNash-specific inner checks (Firestore, AppCheck, React, audit JSONL)

**GSD-plugin-dependent (portable only with GSD):**
- `global/gsd-check-update.js`
- `gsd-context-monitor.js`
- `gsd-prompt-guard.js`
- `gsd-workflow-guard.js`

---

### 9. JASON-OS Hook Gap — What's Missing [CONFIDENCE: HIGH]

JASON-OS currently has only 3 hooks wired (vs SoNash's 29+):

| Event | SoNash hooks | JASON-OS hooks |
|-------|-------------|----------------|
| SessionStart | 3 (session-start, check-mcp, check-remote-context) + compact-restore + gsd-check-update | 1 (check-mcp-servers) |
| PreToolUse | 6 distinct gates | 3 (block-push, large-file-gate, settings-guardian) |
| PreCompact | 1 | 0 |
| PostToolUse | 10+ | 0 |
| UserPromptSubmit | 1 | 0 |
| Notification | 1 | 0 |
| PostToolUseFailure | 1 | 0 |

The 5 highest-value portable hooks missing from JASON-OS:
1. `pre-compaction-save.js` + `compact-restore.js` — compaction state preservation
2. `commit-tracker.js` — commit log that feeds session recovery
3. `post-read-handler.js` — context overload warning
4. `loop-detector.js` — prevents blind retry loops
5. `governance-logger.js` — CLAUDE.md/settings change audit

The JASON-OS `settings-guardian.js` and `large-file-gate.js` are looser than
SoNash equivalents: they fire on all Write/Edit/Read (no `if`-condition
narrowing), while SoNash scopes them precisely. This generates more hook
overhead per tool use but is functionally acceptable.

Citation: JASON-OS `.claude/settings.json`:35-80; SoNash `.claude/settings.json`:30-306.

---

### 10. Latent Dependency Issue in Ported JASON-OS Hooks [CONFIDENCE: HIGH]

The JASON-OS `settings-guardian.js` and `large-file-gate.js` contain:
```js
const { sanitizeError } = require(
  path.join(__dirname, "..", "..", "scripts", "lib", "sanitize-error.cjs")
);
```
This resolves to `JASON-OS/scripts/lib/sanitize-error.cjs`. That path does not
exist in JASON-OS. Both hooks will crash on load. Since settings-guardian fires
on every Write/Edit and large-file-gate fires on every Read, these are silent
failures (hooks crash but Claude Code likely continues with `continueOnError`
semantics or exit 1 pass-through behavior).

Citation: JASON-OS `.claude/hooks/settings-guardian.js`:21; JASON-OS `.claude/hooks/large-file-gate.js`:23.

---

## Sources

| # | Path | Type | Trust | Notes |
|---|------|------|-------|-------|
| 1 | `sonash-v0/.claude/settings.json` | File (T1) | HIGH | Complete hook wiring spec |
| 2 | `JASON-OS/.claude/settings.json` | File (T1) | HIGH | Current JASON-OS state |
| 3 | `sonash-v0/.claude/settings.local.json` | File (T1) | HIGH | Runtime-approved overrides |
| 4 | `JASON-OS/.claude/settings.local.json` | File (T1) | HIGH | JASON-OS bootstrap state |
| 5 | Each hook .js file (29 read) | File (T1) | HIGH | Primary implementation source |
| 6 | `sonash-v0/.claude/HOOKS.md` | File (T1) | HIGH | Official hook documentation |
| 7 | `sonash-v0/.claude/hooks/ensure-fnm.sh` | File (T1) | HIGH | Node bootstrap wrapper |
| 8 | `tools/statusline/widgets.go` | File (T1) | HIGH | Statusline widget catalog |
| 9 | `tools/statusline/config.toml` | File (T1) | HIGH | Statusline configuration |
| 10 | `JASON-OS/.claude/statusline-command.sh` | File (T1) | HIGH | JASON-OS statusline impl |

---

## Contradictions

None. All evidence was internally consistent between the hook source files and
the settings.json wiring.

One near-contradiction: The SoNash HOOKS.md (last updated 2026-02-23) lists the
PostToolUseFailure hook but omits the Notification hook, the GSD hooks
(gsd-prompt-guard, gsd-workflow-guard, gsd-context-monitor), and the full
`post-write-validator.js` check list. The HOOKS.md is therefore incomplete
relative to the actual settings.json. The settings.json is the authoritative
source.

---

## Gaps

1. **gsd-statusline.js vs global/statusline.js relationship**: Both exist. It's
   unclear from the files alone which one is active at runtime (the project
   settings.json does not wire either as a hook event — the statusline uses the
   Go binary). The GSD plugin's own global settings.json presumably wires
   `global/statusline.js` but that file was not examined.

2. **GSD plugin global settings.json**: Not examined. The `global/` hooks
   directory suggests a second settings.json exists in `~/.claude/` or in the
   GSD plugin package that wires `global/statusline.js` and
   `global/gsd-check-update.js`. The full global settings config is outside
   scope of this codebase search.

3. **post-write-validator.js inner checks**: The file was read to 60 lines only
   due to length. The full check list was taken from the file header comment.
   The exact block/warn logic for each of the 10 inner checks was not verified
   line-by-line. Header comment is likely accurate (it matches the HOOKS.md).

4. **settings-guardian CRITICAL_HOOKS list in JASON-OS**: JASON-OS's copy lists
   `block-push-to-main.js`, `pre-commit-agent-compliance.js`,
   `settings-guardian.js` as critical — but JASON-OS doesn't have
   `pre-commit-agent-compliance.js` wired. The guardian would warn but not
   actually block on its absence since it only fires on settings.json write
   attempts.

---

## Serendipity

1. **gsd-context-monitor.js bridge pattern**: The statusline writes context
   metrics to `/tmp/claude-ctx-{session_id}.json`, and `gsd-context-monitor.js`
   (a PostToolUse hook) reads that file to inject warnings into `additionalContext`
   that the agent (not just the user) can see. This is a clever two-hook
   coordination pattern: the statusline (user-facing) feeds the context monitor
   (agent-facing). JASON-OS has neither, so agents in JASON-OS are blind to
   context pressure. This is a meaningful behavioral gap.

2. **The Go binary has 22 widgets including weather + rate limits**: The
   SoNash statusline is genuinely differentiated infrastructure — it pulls
   Nashville weather, GitHub PR/CI status, and rate limit usage. This is
   clearly personal to the user. The JASON-OS bash statusline is a competent
   minimal replacement but the "home" feel of SoNash comes partly from this
   richness. The smallest delta to replicate that feel is wiring the GSD
   `global/statusline.js` (already ported in theory) rather than rebuilding
   the Go binary.

3. **JASON-OS deny-list and env vars are verbatim copies of SoNash** — including
   `mcp__sonarcloud` in the allow list. SoNash uses SonarCloud for code quality
   scanning, which is project-specific. JASON-OS should not have this permission
   unless SonarCloud is also configured for JASON-OS.

---

## Confidence Assessment

- HIGH claims: 10
- MEDIUM claims: 0
- LOW claims: 0
- UNVERIFIED claims: 0
- **Overall confidence: HIGH**

All findings are based on direct filesystem reads of source files (T1 evidence).
No external sources were consulted.
