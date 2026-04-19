# D3a Hook Inventory — Tier 1 (First 10 Hooks + backup/)

**Agent:** D3a
**Profile:** codebase
**Date:** 2026-04-18
**Scope:** `.claude/hooks/` — alphabetical first 10 + `backup/` subdir
**Sub-questions:** Hook wiring, exit semantics, async spawn, kill switches, state files, dependencies

---

## Hook Inventory with Event Assignments

All hooks are launched via `bash .claude/hooks/ensure-fnm.sh node <hook>` (or bare `bash .claude/hooks/ensure-fnm.sh <shell-script>` for ensure-fnm.sh itself as launcher). The old `run-node.sh` pattern from JASON-OS Piece 1a is **replaced** in SoNash by `ensure-fnm.sh`.

| # | Hook | Event | Matcher | if_condition | continueOnError | exit_code_action |
|---|------|-------|---------|--------------|-----------------|-----------------|
| 1 | `block-push-to-main.js` | `PreToolUse` | `^(?i)bash$` | `Bash(git push *)` | false | block (exit 2) |
| 2 | `check-mcp-servers.js` | `SessionStart` | null (fires on all SessionStart) | null | true | warn (exit 0 + stdout) |
| 3 | `check-remote-session-context.js` | `SessionStart` | null | null | true | warn (exit 0 + stderr) |
| 4 | `commit-tracker.js` | `PostToolUse` | `^(?i)bash$` | `Bash(git commit *)\|Bash(git cherry-pick *)\|Bash(git merge *)\|Bash(git revert *)` | true | warn (exit 0 + stderr) |
| 5 | `compact-restore.js` | `SessionStart` | `compact` | null | false (no continueOnError in entry) | allow (exit 0, outputs recovery context) |
| 6 | `decision-save-prompt.js` | `PostToolUse` | `^(askuserquestion\|AskUserQuestion\|ASKUSERQUESTION)$` | null | false (not specified, defaults false) | warn (exit 0 + stderr) |
| 7 | `deploy-safeguard.js` | `PreToolUse` | `^(?i)bash$` | `Bash(firebase deploy *)\|Bash(npx firebase deploy *)\|Bash(npm run deploy *)` | false | block (exit 2) or warn (exit 0) |
| 8 | `ensure-fnm.sh` | **N/A — launcher prefix** | — | — | — | allow/error (exit 0/1/2) |
| 9 | `firestore-rules-guard.js` | `PreToolUse` | `^(?i)(write\|edit)$` | `Write(**/firestore.rules)\|Edit(**/firestore.rules)` | false (not specified) | block (exit 2) |
| 10 | `governance-logger.js` | `PostToolUse` | `^(?i)(write\|edit)$` | `Write(CLAUDE.md)\|Edit(CLAUDE.md)\|Write(.claude/settings.json)\|Edit(.claude/settings.json)` | true | warn/allow (exit 0, logger only) |

**Notable wiring observations from settings.json:**

- SoNash uses `ensure-fnm.sh` as the universal node resolver (not `run-node.sh`). All 10 JS hooks share this launcher.
- `compact-restore.js` entry has no `continueOnError` key — defaults to false/blocking for this SessionStart(compact) matcher group. This is the only SessionStart hook that is fail-closed.
- `decision-save-prompt.js` and `governance-logger.js` entries also lack explicit `continueOnError` — both default to false, but since both always exit 0, this is effectively moot.
- `commit-tracker.js` wiring in SoNash is significantly more targeted than in Piece 1a: the `if` condition restricts it to git commit/cherry-pick/merge/revert only. In Piece 1a's JASON-OS, commit-tracker fired on ALL Bash calls with internal fast-bail. SoNash moves the filtering to the settings.json `if` condition — a meaningful architecture difference.
- `deploy-safeguard.js` has a **3-pattern OR** in `if_condition` covering firebase deploy, npx firebase deploy, and npm run deploy.
- SoNash introduces **three new event types** not present in JASON-OS: `UserPromptSubmit`, `PostToolUseFailure`, and expanded `PostToolUse` matchers for `AskUserQuestion`.
- No `Stop` or `SubagentStop` events wired in the hooks in this tier.

---

## Fail-Open vs Fail-Closed Breakdown

**Fail-closed (continueOnError: false or absent + can exit 2):**

| Hook | Rationale |
|------|-----------|
| `block-push-to-main.js` | Hard security gate — must block bad pushes |
| `compact-restore.js` | No continueOnError in entry — compact session recovery is critical |
| `decision-save-prompt.js` | No continueOnError — but always exits 0, so semantically fail-open |
| `deploy-safeguard.js` | Hard pre-deploy gate — blocks on build/env failures |
| `firestore-rules-guard.js` | Hard security gate — must block write-protection removal |

**Fail-open (continueOnError: true OR always exits 0):**

| Hook | Rationale |
|------|-----------|
| `check-mcp-servers.js` | Informational only — never blocks work |
| `check-remote-session-context.js` | Warning only — cross-branch context drift advisory |
| `commit-tracker.js` | Observability layer — must never block commits |
| `governance-logger.js` | Audit logger — must never block governance file edits |

**Summary:** 2 hard security gates (block-push, firestore-rules-guard), 1 pre-deploy gate (deploy-safeguard), 1 recovery hook (compact-restore), 6 fail-open observability/advisory hooks.

---

## Async-Spawn Patterns Observed

**Only 1 hook in this tier uses async spawn:**

### `commit-tracker.js` — `runMidSessionAlerts()`

```javascript
const { execFile } = require("node:child_process");
const alertScript = path.join(projectDir, "scripts", "health", "lib", "mid-session-alerts.js");
if (fs.existsSync(alertScript)) {
  execFile(process.execPath, [alertScript], { timeout: 5000, stdio: "pipe" }, () => {});
}
```

- Fire-and-forget with 5s timeout
- Silently skipped if `mid-session-alerts.js` is absent
- Callback is empty — result is discarded
- This is an **optional** dependency — the hook degrades gracefully without it

**Hooks using `execFileSync` (synchronous — not async_spawn):**

- `check-remote-session-context.js` — calls `scripts/append-hook-warning.js` via execFileSync
- `decision-save-prompt.js` — calls `scripts/append-hook-warning.js` via execFileSync
- `governance-logger.js` — calls `scripts/append-hook-warning.js` via execFileSync
- `deploy-safeguard.js` — calls `git ls-files` via execFileSync
- `governance-logger.js` — calls `git diff` via execFileSync

These are blocking but they're not `async_spawn` per the schema definition (which targets fire-and-forget patterns).

---

## Kill Switches Surfaced

| Hook | Kill Switch Env Var | Behavior |
|------|---------------------|----------|
| `deploy-safeguard.js` | `SKIP_GATES=1` | Bypasses all pre-deploy checks entirely (exit 0) |
| `firestore-rules-guard.js` | `SKIP_GATES=1` | Bypasses all firestore.rules protections |
| `firestore-rules-guard.js` | `ALLOW_RULES_EDIT=1` | Alternate bypass specific to rules editing |

**Hooks without kill switches (8 of 10):** block-push-to-main, check-mcp-servers, check-remote-session-context, commit-tracker, compact-restore, decision-save-prompt, ensure-fnm.sh, governance-logger.

The `SKIP_GATES=1` pattern is a shared namespace — both deploy-safeguard and firestore-rules-guard respond to it. Any project porting these hooks should document this shared namespace clearly so operators don't accidentally bypass both gates with a single env var.

---

## State-File Dependencies

| Hook | Reads | Writes |
|------|-------|--------|
| `commit-tracker.js` | `.claude/hooks/.commit-tracker-state.json` (lastHead), `.git/hook-output.log` | `.claude/state/commit-log.jsonl`, `.claude/state/commit-failures.jsonl`, `.claude/hooks/.commit-tracker-state.json` |
| `compact-restore.js` | `.claude/state/handoff.json`, `.claude/state/task-*.state.json` | (read-only) |
| `check-remote-session-context.js` | `.claude/hooks/.fetch-cache.json` | `.claude/hooks/.fetch-cache.json` (TTL cache) |
| `deploy-safeguard.js` | `.claude/state/test-runs.jsonl` | `.claude/state/hook-warnings-log.jsonl` |
| `firestore-rules-guard.js` | (stdin only) | `.claude/state/hook-warnings-log.jsonl` |
| `governance-logger.js` | `SESSION_CONTEXT.md` (session counter), git HEAD | `.claude/state/governance-changes.jsonl`, `.claude/state/hook-warnings-log.jsonl` |

**State files in `.claude/hooks/` root (hidden files observed at inventory time):**
- `.alerts-cooldown.json` — used by hooks in D3b scope (not tier 1)
- `.commit-tracker-state.json` — written by commit-tracker.js (lastHead tracking)
- `.context-tracking-state.json` — used by hooks in D3b scope
- `.directive-dedup.json` — used by hooks in D3b scope
- `.fetch-cache.json` — written by check-remote-session-context.js (5-min fetch TTL)
- `.multistep-dedup.json` — used by hooks in D3b scope
- `.session-end-cooldown.json` — used by hooks in D3b scope
- `.session-state.json` — used by hooks in D3b scope
- `.suggest-dedup.json` — used by hooks in D3b scope

State files in `.claude/hooks/` root with dot-prefix are runtime state, not source files. D3b should inventory the full dedup/cooldown state file ecosystem.

---

## Cross-Hook Dependencies (Shared Lib Helpers)

All lib helpers are under `.claude/hooks/lib/`. This tier uses:

| Lib File | Used By (tier 1 hooks) |
|----------|------------------------|
| `lib/symlink-guard.js` | commit-tracker.js, check-remote-session-context.js |
| `lib/sanitize-input.js` | commit-tracker.js, compact-restore.js, check-remote-session-context.js |
| `lib/git-utils.js` | commit-tracker.js |
| `lib/rotate-state.js` | commit-tracker.js (inline require), governance-logger.js (inline require) |
| `lib/state-utils.js` | (not used by tier 1 — used by pre-compaction-save.js in D3b) |

**scripts/lib dependencies in tier 1:**

| scripts/lib File | Used By (tier 1 hooks) |
|-----------------|------------------------|
| `scripts/lib/sanitize-error.cjs` | commit-tracker.js, compact-restore.js, deploy-safeguard.js, firestore-rules-guard.js, governance-logger.js |
| `scripts/lib/safe-fs.js` | deploy-safeguard.js, firestore-rules-guard.js, governance-logger.js |
| `scripts/lib/security-helpers.js` | commit-tracker.js, compact-restore.js |

All lib requires in hooks use **inline try/catch fallbacks** — if the lib is absent, a minimal inline equivalent is used. This means hooks degrade gracefully when lib files are missing, though security guarantees are weakened.

**Shared external child process pattern:** check-remote-session-context, decision-save-prompt, and governance-logger all call `scripts/append-hook-warning.js` via execFileSync. This is a common warning-persistence pattern that D3b should document as a composite workflow.

---

## backup/ Directory

The `backup/` directory (`created: 2026-04-05`) is **completely empty** — zero files. No archived hook versions, test harnesses, or deprecated scripts. The directory appears to be a placeholder. It was created on the same date as the initial hooks commit but never populated.

**Classification:** Directory only, no JSONL records emitted (nothing to enumerate). Status: `archived` (structurally present, contents absent).

---

## SoNash-Specific Events (JASON-OS Gap Analysis)

From settings.json review, SoNash wires hooks to events that **do not exist in JASON-OS**:

| Event | SoNash hooks | Status in JASON-OS |
|-------|-------------|-------------------|
| `UserPromptSubmit` | `user-prompt-handler.js` | MISSING — not in JASON-OS |
| `PostToolUseFailure` | `loop-detector.js` | MISSING — not in JASON-OS |
| `Stop` | (none in this tier) | Not wired in tier 1 |
| `SubagentStop` | (none in this tier) | Not wired in tier 1 |

`UserPromptSubmit` and `PostToolUseFailure` are events that JASON-OS does not wire at all. These are SoNash-specific lifecycle hooks that represent **high-value port candidates**:
- `user-prompt-handler.js` (47KB — largest hook file) fires on every user prompt and handles session management, GSD workflows, and agent directives
- `loop-detector.js` fires on build/test/lint failures and detects error loops

Both are in D3b's scope. Flag these as critical gaps for JASON-OS foundation.

---

## Notable Architecture Differences: SoNash vs JASON-OS Piece 1a

1. **Launcher:** SoNash uses `ensure-fnm.sh` as universal node resolver. JASON-OS Piece 1a used `run-node.sh`. Both achieve the same purpose but `ensure-fnm.sh` has stronger .nvmrc version matching (exact semver, MAJOR.MINOR, and major-only).

2. **commit-tracker wiring:** SoNash gates commit-tracker behind an `if` condition filtering to git commit/cherry-pick/merge/revert. Piece 1a wired it to all Bash calls with internal fast-bail. SoNash's approach reduces hook invocations and makes the filtering intent explicit in settings.json.

3. **PostToolUse surface area:** SoNash has ~10 PostToolUse hook entries vs ~1 in JASON-OS. Covers: write, edit, multiedit, read, AskUserQuestion, bash (commits), bash (tests), Task/Agent, Write/Edit (governance), Write/Edit (todos).

4. **if_condition syntax:** SoNash uses multi-value OR syntax (`Bash(A)|Bash(B)`) extensively. This pattern is absent in JASON-OS Piece 1a's settings.json.

---

## Learnings for Methodology

1. **ensure-fnm.sh replaces run-node.sh:** Piece 1a documented `run-node.sh` as the launcher. SoNash uses `ensure-fnm.sh` instead. Cross-repo scans must not assume launcher identity — always read settings.json command prefix.

2. **if_condition OR syntax is load-bearing:** The `|` separator in `if` values (`Bash(git commit *)|Bash(git cherry-pick *)`) is a multi-pattern OR — it's not a shell pipe. Must be preserved verbatim in portability analysis.

3. **continueOnError absence ≠ continueOnError:false semantics:** A hook entry with no `continueOnError` field and that always exits 0 is semantically fail-open even if it's technically treated as `false` by the runtime. Document both the field state and the behavioral reality.

4. **scripts/lib dependency path resolution:** SoNash hooks resolve scripts/lib via `path.join(__dirname, '..', '..', 'scripts', 'lib', ...)` — two levels up from `.claude/hooks/`. This is fragile: if a hook is moved or the directory structure changes, the relative path breaks. The alternative pattern (used in governance-logger.js) resolves via `path.resolve(projectDir, 'scripts', 'lib', ...)` — more robust.

5. **State files in .claude/hooks/ root:** Runtime state files (`.fetch-cache.json`, `.commit-tracker-state.json`, etc.) live as hidden dot-files in the hooks directory itself rather than `.claude/state/`. This creates two state directories to track: `.claude/state/` (canonical) and `.claude/hooks/.*.json` (hook-local). SCHEMA_SPEC.md §3C only mentions `.claude/state/` — the hook-local state pattern should be raised with D22.

6. **lib/rotate-state.js size discrepancy:** The filesystem shows `rotate-state.js` at 13,067 bytes but Piece 1a's D3 record shows 16,766 bytes. The file has been modified since Piece 1a (last modified Apr 13 vs Piece 1a's inventory). This is expected for an active codebase — future scans should normalize by size only at scan time, not compare cross-scan sizes.

7. **lib/inline-patterns.js is undocumented in Piece 1a:** The lib dir contains `inline-patterns.js` (7,675 bytes, last modified Apr 11) which does not appear in Piece 1a's D3 JSONL records. D3b must inventory this file — it may have been added after Piece 1a ran.

8. **backup/ empty directory:** The backup dir being empty is a valid finding — don't skip empty dirs. An empty backup dir with a creation date is meaningful evidence (was it cleared? reserved?).

9. **Async spawn detection needs execFile vs execFileSync distinction:** The schema field `async_spawn` should only be true for fire-and-forget `execFile` calls. Multiple hooks use `execFileSync` (blocking) for child processes — these are NOT async_spawn but still represent external process dependencies. Consider adding `sync_spawn` or noting in `external_refs` when blocking subprocess calls are present.

10. **deploy-safeguard portability rating:** A hook that is architecturally sound (the 3-check pattern is excellent) but hard-wired to Firebase/Next.js should get `not-portable-product` rather than `sanitize-then-portable` — the sanitization burden is too high (fundamentally different deploy paradigm). Port as a pattern template, not a direct copy.

---

## Gaps and Missing References

1. **`scripts/append-hook-warning.js`** — Referenced by check-remote-session-context.js, decision-save-prompt.js, governance-logger.js, and deploy-safeguard.js (via appendWarningJsonl). This is a high-frequency shared helper. It is NOT in `.claude/hooks/lib/` — it lives in `scripts/`. D6-D12 (scripts agents) must inventory it. Mark as a critical cross-boundary dependency.

2. **`scripts/health/lib/mid-session-alerts.js`** — Referenced by commit-tracker.js as an optional async spawn target. Not in hooks/lib/. Lives in scripts/. D6-D12 must cover it. Optional but important for session health alerting.

3. **`lib/inline-patterns.js`** — Present in `.claude/hooks/lib/` (7,675 bytes) but NOT referenced by any tier 1 hook in this scan. D3b must read and classify it — it may be used by tier 2 hooks (session-start, user-prompt-handler, post-write-validator).

4. **`.claude/state/test-runs.jsonl`** — Read by deploy-safeguard.js; written by `test-tracker.js` (a D3b hook). State file contract: `{passed: boolean}` last entry. Must be documented as a data contract between deploy-safeguard and test-tracker.

5. **`.claude/state/handoff.json`** and **`.claude/state/task-*.state.json`** — Read by compact-restore.js; written by pre-compaction-save.js (D3b). Data contract must be documented as a composite workflow.

6. **`.git/hook-output.log`** — Read by commit-tracker.js. Written by git pre-commit hooks (in `.husky/` or `.git/hooks/`). This is a cross-boundary dependency: hooks system reads from husky output. D17a-b (husky) must document the write side.

7. **`SESSION_CONTEXT.md` session counter convention** — Referenced by commit-tracker.js, check-remote-session-context.js, and governance-logger.js. This is a project convention (not a lib helper) that downstream ports must replicate or the counter returns null (gracefully). Should be documented as a portability prerequisite.

8. **`global/` subdir under `.claude/hooks/`** — The `ls` reveals a `global/` directory (containing `gsd-check-update.js`, referenced in settings.json SessionStart). This is outside D3a's scope — D3b should inventory it if not already assigned.
