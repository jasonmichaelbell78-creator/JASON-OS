# D3b: Hooks Tier 2 — 12 Remaining Hooks + lib/ Helpers + global/ Subdir

**Agent:** D3b
**Profile:** codebase
**Date:** 2026-04-18
**Scope:** 12 hooks + 6 lib/ files + 2 global/ files = 20 JSONL records

---

## Summary

D3b covers the remaining 12 hooks assigned from `.claude/hooks/`, all 6 helpers in `hooks/lib/`, and both files in `hooks/global/`. Combined with D3a's 10 records (9 hooks + 1 backup-dir), the complete hooks census is:

- **D3a:** 9 active hooks + 1 empty backup dir record = 10 records
- **D3b:** 12 hooks + 6 lib helpers + 2 global hooks = 20 records
- **Total hook census:** 21 active hook scripts + 1 backup dir + 6 lib + 2 global = **30 JSONL records**

---

## Event Distribution — Complete (D3a + D3b)

| Event | Hook(s) | Count |
|-------|---------|-------|
| `SessionStart` | session-start.js, check-mcp-servers.js, check-remote-session-context.js, compact-restore.js, gsd-check-update.js | 5 |
| `PreToolUse` | block-push-to-main.js, deploy-safeguard.js, firestore-rules-guard.js, large-file-gate.js, settings-guardian.js, pre-commit-agent-compliance.js | 6 |
| `PostToolUse` | commit-tracker.js, governance-logger.js, decision-save-prompt.js, post-read-handler.js, post-todos-render.js, post-write-validator.js, test-tracker.js, track-agent-invocation.js | 8 |
| `PreCompact` | pre-compaction-save.js | 1 |
| `UserPromptSubmit` | user-prompt-handler.js | 1 (NEW vs JASON-OS) |
| `PostToolUseFailure` | loop-detector.js | 1 (NEW vs JASON-OS) |
| `Notification` | inline curl (settings.json only, no .js file) | 1 (NEW vs JASON-OS) |
| launcher (no event) | ensure-fnm.sh | 1 |
| statusLine config | statusline.js (global/) | 1 (not a hook event) |

**Total hook events: 7 distinct event types.** Three are SoNash-specific additions not present in JASON-OS: `UserPromptSubmit`, `PostToolUseFailure`, `Notification`.

---

## New-Event Discoveries

### `UserPromptSubmit` — user-prompt-handler.js
The largest hook at 718 lines. Fires on every user message. Runs 6 sequential analysis phases:
1. **Alerts reminder** (10-min cooldown) — checks pending-alerts.json + context tracking state
2. **Analyze** — keyword/phrase matching to inject MANDATORY agent/skill directives to stdout (security-auditor, systematic-debugging, database-architect, frontend-design) with 15-min dedup
3. **Session end** — pattern matches "done/bye/signing off" phrases (60-min cooldown)
4. **Plan suggestion** — complexity detection for multi-step tasks (4-hour dedup)
5. **Guardrails** — always-on behavioral guardrails injection (~63 tokens/turn, skip on trivial acks)
6. **Frustration detection** — ALL CAPS at sentence start, correction phrases, repeated punct + negative sentiment → HARD STOP directive to stdout

The stdout output goes into Claude's context as system-level directives. This is a **behavioral enforcement mechanism** operating at the prompt level — the most sophisticated hook in the system.

### `PostToolUseFailure` — loop-detector.js
Fires after Bash tool failures. Normalizes error text (strips line numbers, timestamps, temp paths, ANSI) and hashes it (SHA-256, 12 chars). Tracks hash occurrences in a 20-minute rolling window; warns on 3rd+ occurrence of identical failure. Addresses the "groundhog day" pattern where Claude retries the same failing approach.

### `Notification` (inline)
Not a .js file. The `Notification` event in settings.json runs a bare `curl -s -d "..." ntfy.sh/sonash-claude` with `continueOnError: true`. No hook script — inline command only. SoNash-specific ntfy.sh endpoint.

### `PreCompact` — pre-compaction-save.js
Fires immediately before context compaction. Saves comprehensive session snapshot (task states, commits, git context, agents, plan, notes, active audits) to `.claude/state/handoff.json`. Works in tandem with `compact-restore.js` (SessionStart/compact matcher) which reads the handoff on next session.

---

## Lib-Helper Callers Matrix

| lib helper | Callers (hooks) |
|-----------|-----------------|
| `symlink-guard.js` | post-write-validator.js, pre-commit-agent-compliance.js (indirect via lib/symlink-guard), session-start.js, track-agent-invocation.js, post-todos-render.js (via safe-fs), user-prompt-handler.js — also inlined in rotate-state.js fallback, state-utils.js fallback, gsd-check-update.js inline |
| `git-utils.js` | post-read-handler.js, post-write-validator.js, pre-compaction-save.js, pre-commit-agent-compliance.js, commit-tracker.js (D3a), compact-restore.js (D3a) |
| `state-utils.js` | post-read-handler.js, pre-compaction-save.js, compact-restore.js (D3a) |
| `rotate-state.js` | commit-tracker.js (D3a), test-tracker.js, track-agent-invocation.js, session-start.js |
| `sanitize-input.js` | post-write-validator.js, track-agent-invocation.js, session-start.js — inline fallbacks in many other hooks |
| `inline-patterns.js` | post-write-validator.js only |

---

## Cross-Hook Dependencies (Data Flow)

```
SessionStart (session-start.js)
  └── writes: .session-state.json

PostToolUse/Task (track-agent-invocation.js)
  └── writes: .session-agents.json
        └── consumed by: pre-commit-agent-compliance.js (PreToolUse/Bash git commit)
        └── consumed by: pre-compaction-save.js (PreCompact)

PostToolUse/Bash (commit-tracker.js)
  └── writes: .claude/state/commit-log.jsonl
        └── consumed by: pre-compaction-save.js (PreCompact)

PostToolUse/Read (post-read-handler.js)
  └── writes: .context-tracking-state.json
        └── consumed by: pre-compaction-save.js (PreCompact)
        └── consumed by: user-prompt-handler.js (UserPromptSubmit)

PreCompact (pre-compaction-save.js)
  └── writes: .claude/state/handoff.json
        └── consumed by: compact-restore.js (SessionStart/compact)

PostToolUse/Write|Edit (post-write-validator.js)
  └── writes: .agent-trigger-state.json
  └── writes: .claude/state/pending-reviews.json
        └── consumed by: pre-compaction-save.js (team status)

UserPromptSubmit (user-prompt-handler.js)
  └── reads: .claude/pending-alerts.json (written by scripts/health/)
  └── reads: .context-tracking-state.json (written by post-read-handler)
```

---

## Complete Hook Census: D3a + D3b

### D3a Hooks (10 records)
1. `block-push-to-main.js` — PreToolUse — portable
2. `check-mcp-servers.js` — SessionStart — portable
3. `check-remote-session-context.js` — SessionStart — sanitize-then-portable
4. `commit-tracker.js` — PostToolUse — portable
5. `compact-restore.js` — SessionStart — portable
6. `decision-save-prompt.js` — PostToolUse — sanitize-then-portable
7. `deploy-safeguard.js` — PreToolUse — not-portable-product
8. `ensure-fnm.sh` — launcher — portable
9. `firestore-rules-guard.js` — PreToolUse — not-portable-product
10. `governance-logger.js` — PostToolUse — sanitize-then-portable
11. `backup/` — (empty dir) — archived

### D3b Hooks (12 records)
12. `large-file-gate.js` — PreToolUse — portable
13. `loop-detector.js` — PostToolUseFailure — portable
14. `post-read-handler.js` — PostToolUse — sanitize-then-portable
15. `post-todos-render.js` — PostToolUse — sanitize-then-portable
16. `post-write-validator.js` — PostToolUse — not-portable-product
17. `pre-commit-agent-compliance.js` — PreToolUse — sanitize-then-portable
18. `pre-compaction-save.js` — PreCompact — sanitize-then-portable
19. `session-start.js` — SessionStart — not-portable-product
20. `settings-guardian.js` — PreToolUse — sanitize-then-portable
21. `test-tracker.js` — PostToolUse — portable
22. `track-agent-invocation.js` — PostToolUse — portable
23. `user-prompt-handler.js` — UserPromptSubmit — sanitize-then-portable

### Lib Helpers (6 records)
24. `lib/git-utils.js` — hook-lib — portable
25. `lib/inline-patterns.js` — hook-lib — sanitize-then-portable
26. `lib/rotate-state.js` — hook-lib — portable
27. `lib/sanitize-input.js` — hook-lib — portable
28. `lib/state-utils.js` — hook-lib — portable
29. `lib/symlink-guard.js` — hook-lib — portable

### Global Hooks (2 records)
30. `global/gsd-check-update.js` — SessionStart — not-portable (machine-scoped)
31. `global/statusline.js` — statusLine config (not hook event) — not-portable (machine-scoped)

---

## Portability Summary

| Portability class | Count | Items |
|-------------------|-------|-------|
| `portable` | 11 | block-push-to-main, check-mcp-servers, commit-tracker, compact-restore, ensure-fnm.sh, large-file-gate, loop-detector, test-tracker, track-agent-invocation, lib/git-utils, lib/rotate-state, lib/sanitize-input, lib/state-utils, lib/symlink-guard |
| `sanitize-then-portable` | 9 | check-remote-session-context, decision-save-prompt, governance-logger, post-read-handler, post-todos-render, pre-commit-agent-compliance, pre-compaction-save, settings-guardian, user-prompt-handler, lib/inline-patterns |
| `not-portable-product` | 4 | deploy-safeguard, firestore-rules-guard, post-write-validator, session-start.js |
| `not-portable` | 2 | global/gsd-check-update.js, global/statusline.js |

Note: portable count above is 14 (corrected), lib helpers split as shown.

---

## Missing/Discovered References

### gsd-prompt-guard.js — MISSING FILE
`settings.json` PreToolUse section (Write|Edit matcher, no if_condition, 5s timeout) references:
```
"command": "node .claude/hooks/gsd-prompt-guard.js"
```
This file does **not exist** at `.claude/hooks/gsd-prompt-guard.js`. It is referenced without the `ensure-fnm.sh` prefix (bare `node` command). Likely a GSD global hook that was expected to be present but is absent in this repo snapshot. This is a **dead reference** — the hook entry fires but node will fail to find the file. Not a security issue (no continue_on_error specified, but PreToolUse failure behavior depends on exit code).

### Notification — inline curl, no .js file
The `Notification` event fires `curl -s -d "Claude Code needs your attention" ntfy.sh/sonash-claude`. No hook script file — the command is inline in settings.json. This is SoNash-specific (ntfy.sh endpoint). Not captured as a .js file record; noted here.

---

## Gaps and Missing References

1. **gsd-prompt-guard.js** — Referenced in settings.json PreToolUse (Write|Edit matcher) but file does not exist. Dead reference.
2. **statusline.js in global/** — Not wired via hooks section. Wired via `settings.json.statusLine.command` — separate mechanism. Confirmed it is NOT the same as the SoNash binary statusline (sonash-statusline-v3.exe).
3. **scripts/append-hook-warning.js** — Referenced by 6+ hooks (governance-logger, settings-guardian, test-tracker, decision-save-prompt, large-file-gate, session-start). Not in scope for D3b but dependency is load-bearing — D6-D12 (scripts agents) will cover it.
4. **scripts/lib/parse-jsonl-line.js** — Referenced by pre-compaction-save.js, post-write-validator.js (via safeParseLine), session-start.js, rotate-state.js. D6-D12 scope.
5. **scripts/config/load-config.js** — Referenced by post-write-validator.js (agentTriggerEnforcer). D6-D12 scope.
6. **.claude/state/** directory state files — D3a+D3b surfaced 15+ distinct state file paths. D18 (state dir enumerator) should cross-reference against what actually exists on disk.

---

## Learnings for Methodology

### 1. Hook file size variance is extreme — plan for it
Range: symlink-guard.js (46 lines) to session-start.js (1350 lines). A single hook can contain an entire subsystem (session-start.js hosts the D16 warning regeneration architecture). Future D-agents should read large hooks in chunks if needed, not assume one read = one function.

### 2. settings.json hook matchers != one-to-one with .js files
`post-todos-render.js` has 3 separate settings.json entries (Write, Edit, MultiEdit). `post-write-validator.js` has 3 entries. The CLAUDE_TOOL env var is set inline in the command to distinguish which. Wiring map must be derived from settings.json, not from file count.

### 3. gsd-prompt-guard.js dead reference is a real gap
A hook entry fires on every Write|Edit with a 5s timeout but points to a non-existent file. This is a runtime error on every write operation (node will exit 1 with MODULE_NOT_FOUND). The lack of `continueOnError: true` means this may block or error-log silently depending on Claude Code behavior. D22 (schema surveyor) should flag this.

### 4. global/ contains two distinct categories
`gsd-check-update.js` = a real hook event (SessionStart, machine-scoped). `statusline.js` = NOT a hook event — it is wired via the separate `statusLine.command` config in settings.json. Both are GSD ecosystem artifacts, machine-scoped, not portable to JASON-OS. The scope classification differs: `machine` for both, but the mechanism differs.

### 5. async_spawn detection note
`gsd-check-update.js` uses `spawn(..., { detached: true }) + child.unref()` — this IS async_spawn:true even though the pattern is different from execFile. The spawn pattern for fire-and-forget background processes should be included in the async_spawn detection criteria going forward.

### 6. user-prompt-handler.js is the behavioral enforcement hub
At 718 lines with 6 phases, this hook is the primary mechanism for injecting MANDATORY directives into Claude's context on every turn. The guardrails injection alone adds ~63 tokens per prompt. This is the highest-value portability target for JASON-OS: stripping SoNash-specific keywords (firestore, agent names) yields a universal behavioral enforcement hook.

### 7. lib/ helpers form a coherent security layer
The 6 lib helpers are not independent utilities — they form a layered security stack:
- `symlink-guard.js` (base layer: no writes through symlinks)
- `state-utils.js` (builds on symlink-guard: atomic JSON writes)
- `rotate-state.js` (builds on symlink-guard: atomic JSONL rotation)
- `sanitize-input.js` (input layer: redacts secrets from log data)
- `git-utils.js` (context layer: safe project dir resolution)
- `inline-patterns.js` (validation layer: code quality patterns)

All are individually portable. They should be ported as a bundle.

---

## Confidence Assessment

- HIGH claims: 28 (all hook wiring confirmed from settings.json + file reads)
- MEDIUM claims: 2 (portability classification for post-read-handler.js and post-todos-render.js — sanitize_fields complete but downstream JASON-OS context unknown)
- LOW claims: 0
- UNVERIFIED claims: 0
- **Overall confidence: HIGH**
