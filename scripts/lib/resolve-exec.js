/**
 * resolve-exec.js — Resolve an executable name to its absolute path via
 * $PATH walk (honouring $PATHEXT on Windows).
 *
 * Extracted from .claude/sync/label/lib/agent-runner.js (PR #8 R4) so
 * notification-label.js and agent-runner.js share one resolver instead of
 * duplicating the logic.
 *
 * Returning an absolute path lets callers spawn with `shell: false` on
 * every platform — Windows can resolve `.cmd` / `.bat` via the full name
 * when passed the absolute path, no shell needed. Closes the
 * spawn-shell-true scanner surface (Semgrep #25) without breaking
 * Windows portability.
 *
 * Null return when the name can't be found in any PATH entry; callers
 * decide what to do (fall back, log, skip).
 */

const fs = require("node:fs");
const path = require("node:path");

function resolveExecutable(name) {
  const pathEnv = process.env.PATH || "";
  const sep = process.platform === "win32" ? ";" : ":";
  const exts = process.platform === "win32"
    ? (process.env.PATHEXT || ".COM;.EXE;.BAT;.CMD").split(";")
    : [""];
  const dirs = pathEnv.split(sep).filter(Boolean);
  for (const dir of dirs) {
    for (const ext of exts) {
      const candidate = path.join(dir, name + ext);
      try {
        if (fs.statSync(candidate).isFile()) return candidate;
      } catch {
        // Not found in this dir, try next. Most PATH entries miss on any
        // given name — the throw-per-miss is the hot loop, not an error.
      }
    }
  }
  return null;
}

module.exports = { resolveExecutable };
