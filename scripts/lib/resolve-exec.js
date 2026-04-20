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

function isExecutableFile(candidate) {
  let stats;
  try {
    stats = fs.statSync(candidate);
  } catch {
    return false;
  }
  if (!stats.isFile()) return false;
  if (process.platform !== "win32") {
    // POSIX `which` semantics — the file must be marked executable by the
    // current user. Without this check we can return a non-executable
    // match and trigger EACCES at spawn time.
    try {
      fs.accessSync(candidate, fs.constants.X_OK);
    } catch {
      return false;
    }
  }
  return true;
}

function resolveExecutable(name) {
  if (typeof name !== "string" || name.length === 0) return null;

  // If caller already passed a path (relative or absolute), don't PATH-walk
  // — that would produce garbage like `<PATH_entry>/C:\...\git.exe`. Stat
  // the provided path directly; return its absolute form if it's a real
  // executable file, null otherwise.
  if (/[\\/]/.test(name)) {
    return isExecutableFile(name) ? path.resolve(name) : null;
  }

  const pathEnv = process.env.PATH || "";
  const sep = process.platform === "win32" ? ";" : ":";
  const rawExts = process.platform === "win32"
    ? (process.env.PATHEXT || ".COM;.EXE;.BAT;.CMD").split(";")
    : [""];
  const exts = rawExts.map((e) => e.trim()).filter((e) => e.length > 0 || process.platform !== "win32");

  // If the caller's name already ends with a known PATHEXT on Windows
  // (e.g. "claude.cmd"), don't double-append — check the name as-is
  // against each PATH entry.
  const lowerName = process.platform === "win32" ? name.toLowerCase() : name;
  const hasKnownExt =
    process.platform === "win32" &&
    exts.some((e) => e.length > 0 && lowerName.endsWith(e.toLowerCase()));

  const dirs = pathEnv
    .split(sep)
    .map((d) => d.trim().replace(/^"(.*)"$/, "$1"))
    .filter(Boolean);

  for (const dir of dirs) {
    if (hasKnownExt) {
      const candidate = path.join(dir, name);
      if (isExecutableFile(candidate)) return candidate;
      continue;
    }
    for (const ext of exts) {
      const candidate = path.join(dir, name + ext);
      if (isExecutableFile(candidate)) return candidate;
    }
  }
  return null;
}

module.exports = { resolveExecutable };
