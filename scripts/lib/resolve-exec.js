/**
 * resolve-exec.js — Resolve an executable name to its absolute path via
 * $PATH walk (honouring $PATHEXT on Windows).
 *
 * Shared helper used by agent-runner.js and notification-label.js so both
 * can spawn with `shell: false` on every platform — Windows resolves .cmd
 * / .bat via the full name when passed the absolute path, no shell
 * needed. Closes the spawn-shell-true scanner surface (Semgrep #25)
 * without breaking Windows portability.
 *
 * Null return when the name can't be found; callers decide what to do
 * (fall back, log, skip).
 *
 * R6 refactor: split into single-responsibility helpers to drop cognitive
 * complexity below SonarCloud's 15-threshold. Also now:
 *   - Returns absolute paths (path.resolve wrap) so callers don't
 *     inherit relative-PATH-entry quirks.
 *   - Handles Windows absolute paths without extensions (e.g.
 *     C:\path\to\claude where the real file is claude.cmd) by walking
 *     PATHEXT on the provided path when it doesn't match as-is.
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
    // POSIX `which` semantics: must be marked executable by the current
    // user. Skipping this lets spawn fail with EACCES mid-run.
    try {
      fs.accessSync(candidate, fs.constants.X_OK);
    } catch {
      return false;
    }
  }
  return true;
}

function getPathExts() {
  if (process.platform !== "win32") return [""];
  return (process.env.PATHEXT || ".COM;.EXE;.BAT;.CMD")
    .split(";")
    .map((e) => e.trim())
    .filter(Boolean);
}

function getPathDirs() {
  const pathEnv = process.env.PATH || "";
  const sep = process.platform === "win32" ? ";" : ":";
  return pathEnv
    .split(sep)
    .map((d) => d.trim().replace(/^"(.*)"$/, "$1"))
    .filter(Boolean)
    // Drop relative PATH entries (`.`, `./local/bin`). Relative entries
    // mean "resolve against cwd at spawn time" — which is the classic
    // PATH-hijack vector when cwd happens to be attacker-controlled.
    // Cheap hardening; absolute-path entries remain. (Qodo Sugg R7.)
    .filter((d) => path.isAbsolute(d));
}

function nameHasKnownExt(name, exts) {
  if (process.platform !== "win32") return false;
  const lower = name.toLowerCase();
  return exts.some((ext) => ext.length > 0 && lower.endsWith(ext.toLowerCase()));
}

function resolveFromProvidedPath(name) {
  const abs = path.resolve(name);
  if (isExecutableFile(abs)) return abs;
  // Windows edge case: caller passed an absolute path without an
  // extension (e.g. "C:\\bin\\claude" when the real file is "claude.cmd").
  // Walk PATHEXT on the provided path rather than failing outright.
  if (process.platform === "win32" && path.extname(abs) === "") {
    for (const ext of getPathExts()) {
      const candidate = abs + ext;
      if (isExecutableFile(candidate)) return candidate;
    }
  }
  return null;
}

function findInDir(dir, name, exts, skipExtAppend) {
  if (skipExtAppend) {
    const candidate = path.resolve(path.join(dir, name));
    return isExecutableFile(candidate) ? candidate : null;
  }
  for (const ext of exts) {
    const candidate = path.resolve(path.join(dir, name + ext));
    if (isExecutableFile(candidate)) return candidate;
  }
  return null;
}

function findInPathDirs(name) {
  const exts = getPathExts();
  const skipExtAppend = nameHasKnownExt(name, exts);
  for (const dir of getPathDirs()) {
    const hit = findInDir(dir, name, exts, skipExtAppend);
    if (hit) return hit;
  }
  return null;
}

function resolveExecutable(name) {
  if (typeof name !== "string" || name.length === 0) return null;
  // Caller already gave us a path (absolute or relative) — don't PATH-walk,
  // that would produce garbage like "<PATH_entry>/C:\\...\\git.exe".
  if (/[\\/]/.test(name)) return resolveFromProvidedPath(name);
  return findInPathDirs(name);
}

module.exports = { resolveExecutable };
