/**
 * scope-matcher.js — Tiny glob matcher for `scope.json` include/exclude lists.
 *
 * Avoids a runtime `minimatch` dep (no runtime deps policy, CLAUDE.md §1).
 * Supports:
 *   - `*`  — match anything except `/`
 *   - `**` — match anything including `/`
 *   - `?`  — match single non-slash character
 *   - literal `.` `$` `+` `(` `)` `|` `[` `]` `{` `}` via regex escape
 *
 * Paths are normalized to forward-slash form before matching.
 * A path is IN scope if it matches ≥1 include pattern AND 0 exclude patterns.
 */

const fs = require("node:fs");
const path = require("node:path");

const REPO_ROOT_SENTINEL = path.join(__dirname, "..", "..", "..", "..");
const DEFAULT_SCOPE_PATH = path.join(
  REPO_ROOT_SENTINEL,
  ".claude",
  "sync",
  "label",
  "scope.json"
);

const MAX_GLOB_LENGTH = 200;
const MAX_PATH_LENGTH = 2048;

/**
 * Reject pathological glob inputs before we build a RegExp from them.
 * Scope config is repo-controlled (commit-gated at scope.json), but the
 * regex engine is still a DoS target if someone writes a catastrophic
 * pattern — fail fast rather than spin the event loop.
 * @param {string} glob
 */
function validateGlob(glob) {
  if (glob.length > MAX_GLOB_LENGTH) {
    throw new Error(
      `scope-matcher.globToRegex: glob exceeds ${MAX_GLOB_LENGTH} chars`
    );
  }
  if (/\*{3,}/.test(glob)) {
    throw new Error(
      "scope-matcher.globToRegex: 3+ consecutive '*' is not a supported pattern"
    );
  }
  if (/[\x00-\x1f]/.test(glob)) {
    throw new Error(
      "scope-matcher.globToRegex: control characters are not allowed in globs"
    );
  }
}

/**
 * Convert a glob pattern into an anchored RegExp.
 * @param {string} glob
 * @returns {RegExp}
 */
function globToRegex(glob) {
  if (typeof glob !== "string") {
    throw new TypeError("scope-matcher.globToRegex: glob must be a string");
  }
  validateGlob(glob);
  const normalized = glob.replace(/\\/g, "/");
  let out = "^";
  let i = 0;
  while (i < normalized.length) {
    const c = normalized[i];
    if (c === "*") {
      if (normalized[i + 1] === "*") {
        // `**` matches any sequence (including /)
        out += ".*";
        i += 2;
        // Skip a following `/` so `**/*.md` works correctly against `a.md`
        // at root. The `.*` already consumes the optional slash.
        if (normalized[i] === "/") i += 1;
      } else {
        out += "[^/]*";
        i += 1;
      }
    } else if (c === "?") {
      out += "[^/]";
      i += 1;
    } else if (/[.$+()|\[\]{}^]/.test(c)) {
      out += `\\${c}`;
      i += 1;
    } else {
      out += c;
      i += 1;
    }
  }
  out += "$";
  return new RegExp(out);
}

/**
 * Compile a scope config into a pre-built matcher.
 * @param {{include?: string[], exclude?: string[]}} scope
 * @returns {{matches: (relPath: string) => boolean}}
 */
function compileScope(scope) {
  const include = Array.isArray(scope && scope.include) ? scope.include : [];
  const exclude = Array.isArray(scope && scope.exclude) ? scope.exclude : [];
  const includeRes = include.map(globToRegex);
  const excludeRes = exclude.map(globToRegex);

  return {
    matches(relPath) {
      if (typeof relPath !== "string") return false;
      if (relPath.length > MAX_PATH_LENGTH) return false;
      const normalized = relPath.replace(/\\/g, "/").replace(/^\.\//, "");
      if (normalized.length === 0) return false;
      if (!includeRes.some((re) => re.test(normalized))) return false;
      if (excludeRes.some((re) => re.test(normalized))) return false;
      return true;
    },
  };
}

let cachedMatcher = null;
let cachedScopePath = null;

/**
 * Load scope.json from disk. Cached per-path for repeated calls within one
 * process (hook-level caching). Re-invoke with a different path to refresh.
 * @param {string} [scopePath=DEFAULT_SCOPE_PATH]
 * @returns {{matches: (relPath: string) => boolean}}
 */
function loadScope(scopePath = DEFAULT_SCOPE_PATH) {
  if (cachedMatcher && cachedScopePath === scopePath) return cachedMatcher;
  let scope;
  try {
    scope = JSON.parse(fs.readFileSync(scopePath, "utf8"));
  } catch (err) {
    // Fail-closed: if scope.json is unreadable, NOTHING is in scope. The
    // hook observer will see this and surface a warning via D15 path 1.
    const empty = { matches: () => false };
    empty.loadError = err;
    return empty;
  }
  // compileScope → globToRegex → validateGlob can throw on pathological
  // input (my R1 hardening). Fail-closed rather than crashing the hook.
  // (Qodo Sugg#6 R5 — R1 created a new throw path loadScope didn't catch.)
  try {
    cachedMatcher = compileScope(scope);
    cachedScopePath = scopePath;
    return cachedMatcher;
  } catch (err) {
    const empty = { matches: () => false };
    empty.loadError = err;
    return empty;
  }
}

module.exports = {
  DEFAULT_SCOPE_PATH,
  globToRegex,
  compileScope,
  loadScope,
};
