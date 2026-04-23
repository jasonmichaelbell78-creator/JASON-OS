# `hooks/` — Label-mechanism hooks

Claude Code hooks that implement D2 + D11 + D15 — sync partial writes, async
understanding-field fill, and in-the-moment failure surfacing.

**Built in:** S3–S5 (Plan §S3–§S5).

## Hooks (planned)

| Hook | Event | Purpose | Size |
| --- | --- | --- | --- |
| `post-tool-use-label.js` | `PostToolUse` (`Edit` / `Write` matcher) | Step 0 surfacing of past failures, then sync partial write + async fill on new/major edits | M |
| `user-prompt-submit-label.js` | `UserPromptSubmit` | D15 path 2 — prepend pending-failure warning to user prompts until acknowledged | S |
| `notification-label.js` | `Notification` | D15 path 3 — OS desktop notification on failure (node-notifier primary, platform shell fallback) | S |

## Registration

All three are invoked via thin delegators committed under `.claude/hooks/`:

- `.claude/hooks/label-post-tool-use.js` → `hooks/post-tool-use-label.js`
- `.claude/hooks/label-user-prompt-submit.js` → `hooks/user-prompt-submit-label.js`
- `.claude/hooks/label-notification.js` → `hooks/notification-label.js`

The delegator pattern bridges `run-node.sh`'s HOOKS_DIR confinement to
the sync/label tree (structural-fix D7.1/D7.4). Registration in
`.claude/settings.json` is pending re-run catalog promotion
(structural-fix Phase G.3 / commit 7). `UserPromptSubmit` and
`Notification` are new event types for JASON-OS.

## Must-haves

- Never block the user's Edit/Write on success path.
- Step 0 surfacing in the PostToolUse hook exits non-zero **only** for
  unresolved pending failures — not for fresh work.
- All I/O via `scripts/lib/safe-fs.js`; all errors via `sanitize-error.cjs`.
