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

All three will be wired in `.claude/settings.json` as part of their respective
build steps. `UserPromptSubmit` and `Notification` are new event types for
JASON-OS.

## Must-haves

- Never block the user's Edit/Write on success path.
- Step 0 surfacing in the PostToolUse hook exits non-zero **only** for
  unresolved pending failures — not for fresh work.
- All I/O via `scripts/lib/safe-fs.js`; all errors via `sanitize-error.cjs`.
