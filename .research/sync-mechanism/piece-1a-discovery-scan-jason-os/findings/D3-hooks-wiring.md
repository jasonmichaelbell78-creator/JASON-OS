# D3 — JASON-OS Hook Wiring Census

**Agent:** D3  
**Date:** 2026-04-18  
**Scope:** `.claude/hooks/` + `.claude/hooks/lib/` + `.claude/settings.json` hooks section  
**Files read:** 13 (8 hook files + 5 lib helpers + settings.json)

---

## Hook Summary Table

| Hook File | Event | Matcher / Condition | Purpose | continueOnError | Portability |
|---|---|---|---|---|---|
| `check-mcp-servers.js` | SessionStart | (none — fires always) | Print available MCP server names from .mcp.json | true | portable |
| `compact-restore.js` | SessionStart | `^compact$` | Inject post-compaction recovery context from handoff.json | true | portable |
| `block-push-to-main.js` | PreToolUse | `^[Bb]ash$` + `if: Bash(git push *)` | Block pushes to main/master | **false** (blocking) | portable |
| `large-file-gate.js` | PreToolUse | `^[Rr]ead$` | Block reads of files >5 MB; warn >500 KB | true | portable |
| `settings-guardian.js` | PreToolUse | `^([Ww]rite|[Ee]dit)$` | Block removal of critical hooks from settings.json | **false** (blocking) | sanitize-then-portable |
| `pre-compaction-save.js` | PreCompact | (none — fires always) | Snapshot full session state to handoff.json before compaction | true | portable |
| `commit-tracker.js` | PostToolUse | `^[Bb]ash$` | Track commits to commit-log.jsonl; log failures; surface hook output | true | portable |
| `run-node.sh` | (launcher — not an event) | N/A | Resolve Node.js binary cross-platform and exec hook scripts | N/A | portable |

---

## Lib Helpers Summary Table

| Helper | Purpose | Used By | scripts/lib deps |
|---|---|---|---|
| `git-utils.js` | Project dir resolution + gitExec() wrapper | commit-tracker, pre-compaction-save | none |
| `rotate-state.js` | JSONL/JSON rotation: rotateJsonl, pruneJsonKey, expireByAge, archiveRotateJsonl | commit-tracker, (indirect) | safe-fs, security-helpers, parse-jsonl-line |
| `sanitize-input.js` | Strip control chars + redact secret patterns + truncate | commit-tracker, compact-restore | none |
| `state-utils.js` | loadJson + saveJson with atomic write + symlink guard | commit-tracker, pre-compaction-save, compact-restore | safe-fs, symlink-guard |
| `symlink-guard.js` | isSafeToWrite() — checks file + all ancestor dirs for symlinks | state-utils, rotate-state, large-file-gate, settings-guardian | none |

---

## scripts/lib Helper Usage Matrix

| Hook | sanitize-error.cjs | security-helpers.js | safe-fs.js | parse-jsonl-line |
|---|---|---|---|---|
| block-push-to-main.js | - | - | - | - |
| check-mcp-servers.js | - | - | - | - |
| commit-tracker.js | - | YES (via security-helpers) | YES | - |
| compact-restore.js | - | YES | - | - |
| large-file-gate.js | YES (hard require) | - | YES | - |
| pre-compaction-save.js | - | - | - | YES |
| settings-guardian.js | YES (hard require) | - | YES | - |
| run-node.sh | - | - | - | - |
| lib/rotate-state.js | - | YES | YES | YES |
| lib/state-utils.js | - | - | YES | - |

**Gaps vs CLAUDE.md §2 policy:**
- `block-push-to-main.js` — no file I/O, no error logging to disk; gap is acceptable.
- `check-mcp-servers.js` — implements its own output sanitizer inline rather than using `sanitize-input.js` from lib/; functional but diverges from single-source-of-truth pattern.
- `compact-restore.js` — uses `fs.readFileSync` directly (not via `safe-fs`) on the handoff.json read path. The write path (pre-compaction-save.js) is properly guarded; this read-side gap is lower severity but worth noting.
- `pre-compaction-save.js` — does not import `sanitize-error.cjs` or `security-helpers.js` from scripts/lib directly; error handling is try/catch-silent. Adequate for a fail-open hook but less consistent.

---

## Critical Wiring Notes

1. **Two hooks are hard-blocking (continueOnError absent/false):** `block-push-to-main.js` and `settings-guardian.js`. These will prevent the triggering tool call from executing on exit 2. All others are fail-open.

2. **Only one `if:` condition in the entire settings.json:** `block-push-to-main.js` uses `if: Bash(git push *)`. `commit-tracker.js` has NO `if:` condition — it fires on every Bash call and does an internal fast-bail regex check (~1 ms overhead per call).

3. **run-node.sh is the universal launcher:** Every hook command is `bash .claude/hooks/run-node.sh <script>`. The shell script itself performs path-traversal guards, symlink rejection, and Windows/macOS/Linux node resolution.

4. **settings-guardian.js CRITICAL_HOOKS list is hardcoded:** `['block-push-to-main.js', 'settings-guardian.js']`. When porting to SoNash, this list must be reviewed and potentially extended.

5. **SessionStart dual-entry pattern:** SessionStart has two separate hook blocks — one fires always (check-mcp-servers), one fires only on the `^compact$` matcher (compact-restore). This is the only event with multiple entries.

6. **No Stop or SubagentStop hooks are wired.** These are available events but unused in JASON-OS.

---

## Learnings for Methodology

### Agent sizing
8 hook files + 5 lib helpers + 1 settings.json = 14 entities read fully. Took approximately 10 tool calls in two batches (parallel reads). Right-sized — one D3 agent handled cleanly. SoNash at 25 hooks would need 2-3 agents or explicit batching to stay within context limits.

### File-type observations
- `.js` hooks are the primary format; `.sh` appears only for the launcher shim. This pattern (shell launcher + Node scripts) is consistent and well-justified for cross-platform node resolution.
- settings.json hook wiring uses regex matchers on tool names — case-insensitive via `[Bb]ash` patterns, which suggests Claude Code tool names may vary in capitalization across versions. Worth flagging for SoNash comparison.
- The `if:` condition field in settings.json is used extremely sparingly (once out of 7 hook entries). Most filtering is done inside the hook scripts via fast-bail regexes.

### Classification heuristics
- `scope_hint` enum (universal/user/project/machine/ephemeral) covers hooks cleanly. `check-mcp-servers.js` is the only one classified as `project` because it reads a project-specific `.mcp.json`; its logic is generic but its output is project-bound.
- `portability_hint` is mostly `portable`. The one `sanitize-then-portable` case (`settings-guardian.js`) captures the only hardcoded-names issue cleanly. If a hook had hardcoded project paths it would be `not-portable`.
- The `lib/` helpers are all `universal` + `portable` — zero project-specific references.

### Dependency extraction
- **Hook-to-settings wiring** extracted cleanly from settings.json. The schema captures: event name, matcher regex, if_condition (tool invocation pattern), continueOnError, and statusMessage. The `existing_metadata` field in the JSONL schema handles this well.
- **Hook-to-lib-helper dependencies** required reading each file fully — no grep shortcut. Import paths are always relative (`require('./lib/...')` or `require('../../scripts/lib/...')`), so they were unambiguous.
- **Soft vs hard requires** mattered: several hooks use `try { require(...) } catch { fallback }` — these are soft dependencies with graceful degradation. The schema's `dependencies` array doesn't distinguish hard vs soft; a `dependency_type: "hard|soft"` sub-field would add value.

### Schema-field candidates
Hooks have dimensions the current schema `existing_metadata` encodes as a freeform object. Dedicated fields worth considering for the Piece 2 schema:

| Candidate field | Rationale |
|---|---|
| `continue_on_error: boolean` | Load-bearing for porting decisions — blocking vs fail-open is a critical distinction |
| `event_type: string` | Already in `existing_metadata.event` but should be a first-class field for indexing |
| `matcher_regex: string\|null` | Tool name filter; null = fires on all invocations of that event |
| `if_condition: string\|null` | Additional filter beyond matcher; rare but important |
| `exit_code_action: "block"\|"warn"\|"allow"` | Maps exit code semantics (0=allow, 2=block); not captured today |
| `async_spawn: boolean` | commit-tracker spawns mid-session-alerts.js asynchronously — this is an unusual pattern worth flagging |
| `kill_switch_env: string\|null` | SKIP_GATES=1 pattern appears in large-file-gate and settings-guardian; a standard field would enable audit of which hooks are bypassable |
| `state_files_written: string[]` | Which .claude/state/ files each hook writes to — essential for dependency mapping across hooks |

### Adjustments recommended for SoNash hook scan

1. **Split into 2-3 agents.** SoNash has ~25 hooks (3x JASON-OS). A single agent reading 25 files fully risks context exhaustion. Suggested split: Agent A reads hooks A-I, Agent B reads hooks J-R, Agent C reads hooks S-Z + lib/ + settings.

2. **Flag all `CRITICAL_HOOKS` lists.** SoNash likely has more hooks protected by settings-guardian or equivalent. Catalog every hardcoded hook-name list.

3. **Expect more `if:` conditions.** JASON-OS uses only one. SoNash with 3x the hooks likely has more granular filtering — the `if_condition` field is more important there.

4. **Check for session-counter coupling.** Two JASON-OS hooks read `SESSION_CONTEXT.md` for a session counter. SoNash may have the same coupling or a different state file convention. Flag all `SESSION_CONTEXT.md` references.

5. **Enumerate Stop/SubagentStop hooks.** JASON-OS has none; SoNash may use them. Add these event types to the census template.

6. **Track async subprocess spawns explicitly.** The `execFile` pattern in commit-tracker is easy to miss. Grep for `execFile` / `spawn` / `fork` across all SoNash hooks during the scan.

7. **Note per-hook state file footprint.** SoNash with 25 hooks likely writes to many more `.claude/state/` files. Building a state-file-to-hook ownership map will be essential for Piece 2 schema design.

8. **Check for event-type gaps.** JASON-OS has no Stop, SubagentStop, or Notification hooks. Verify whether SoNash has wired any of these.
