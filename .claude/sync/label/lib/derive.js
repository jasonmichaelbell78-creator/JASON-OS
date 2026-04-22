/**
 * derive.js — Cheap + understanding-field derivation entry points.
 *
 * Per PLAN §S2:
 *   - deriveCheapFields(filePath)            → synchronous, pure
 *   - deriveUnderstandingFields(filePath, content) → Promise, agent-backed
 *   - detectType(filePath)                   → typeEnum per Piece 2 §8.1
 *   - parseExistingFrontmatter(filePath)     → YAML + Lineage body pattern
 *   - detectSectionsHeuristic(content)       → MVP: [] (agents fill via §S7/S8)
 *   - detectCompositesHeuristic(files)       → MVP: [] (agents fill)
 *
 * All path checks use `/^\.\.(?:[\\/]|$)/` regex per CLAUDE.md §5.
 * All file reads wrapped in try/catch (existsSync race condition).
 */

const fs = require("node:fs");
const path = require("node:path");

const REPO_ROOT_SENTINEL = path.join(__dirname, "..", "..", "..", "..");
const { readTextWithSizeGuard } = require(
  path.join(REPO_ROOT_SENTINEL, "scripts", "lib", "safe-fs.js")
);
const { fingerprint } = require("./fingerprint");
const { sanitize } = require("./sanitize");

const PATH_TRAVERSAL_RE = /^\.\.(?:[\\/]|$)/;

/**
 * Normalize any path to forward-slash form and make it repo-relative if it's
 * absolute and inside the repo. Throws on parent-traversal.
 * @param {string} filePath
 * @param {string} [repoRoot=REPO_ROOT_SENTINEL]
 * @returns {string}
 */
function toRepoRelative(filePath, repoRoot = REPO_ROOT_SENTINEL) {
  if (typeof filePath !== "string" || filePath.length === 0) {
    throw new TypeError("derive.toRepoRelative: filePath required");
  }
  const absRoot = path.resolve(repoRoot);
  const abs = path.isAbsolute(filePath) ? filePath : path.resolve(absRoot, filePath);
  const rel = path.relative(absRoot, abs);
  if (PATH_TRAVERSAL_RE.test(rel)) {
    throw new Error(`derive.toRepoRelative: path escapes repo root: ${path.basename(filePath)}`);
  }
  return rel.split(path.sep).join("/");
}

/**
 * Cheap synchronous fields — derivable from path + content alone, no agent.
 * @param {string} filePath
 * @param {object} [options]
 * @param {string} [options.repoRoot=REPO_ROOT_SENTINEL]
 * @returns {{name: string, path: string, type: string, fingerprint: string, module_system: string, file_size: number}}
 */
function deriveCheapFields(filePath, options = {}) {
  const repoRoot = options.repoRoot ?? REPO_ROOT_SENTINEL;
  const rel = toRepoRelative(filePath, repoRoot);
  const abs = path.resolve(repoRoot, rel);

  let stat;
  let content = "";
  try {
    stat = fs.statSync(abs);
  } catch (err) {
    throw new Error(`derive.deriveCheapFields: stat failed: ${sanitize(err)}`);
  }
  try {
    content = readTextWithSizeGuard(abs);
  } catch (err) {
    // Binary / oversized files: still derivable without content — hash on
    // whatever we can read, or fall back to a stat-based fingerprint marker.
    content = "";
  }

  const type = detectType(rel, content);
  return {
    name: deriveName(rel, type),
    path: rel,
    type,
    fingerprint: content.length > 0 ? fingerprint(content) : `sha256:empty-or-binary-${stat.size}`,
    module_system: detectModuleSystem(rel, content),
    file_size: stat.size,
  };
}

/**
 * D4.1 naming canon — type-dependent:
 *   skill → directory slug (`.claude/skills/<slug>/SKILL.md` → `<slug>`)
 *   others → basename without extension
 * Collisions surface at validate time (D4.3) — this helper does NOT
 * disambiguate.
 *
 * @param {string} filePath - Repo-relative, forward-slashed
 * @param {string} type - Resolved type enum value
 * @returns {string}
 */
function deriveName(filePath, type) {
  if (type === "skill") {
    const m = /^\.claude\/skills\/([^/]+)\/SKILL\.md$/i.exec(filePath);
    if (m) return m[1];
  }
  return path.basename(filePath, path.extname(filePath));
}

/**
 * Understanding-field derivation. Async because it defers to a derivation
 * agent. In this MVP it returns a skeleton; real fill happens via
 * agent-runner in S3 hook + S8 back-fill.
 *
 * @param {string} filePath
 * @param {string} [content]
 * @returns {Promise<object>} Partial record skeleton keyed by understanding
 *   field names. Fields not populated here get `needs_review` treatment
 *   until an agent returns structured output.
 */
async function deriveUnderstandingFields(filePath, content = "") {
  // Best-effort extraction of frontmatter / Lineage-body hints so the
  // skeleton isn't completely empty. Full derivation happens via agents.
  const frontmatter = parseExistingFrontmatter(filePath, content);
  return {
    purpose: frontmatter?.description ?? frontmatter?.purpose ?? "",
    lineage: frontmatter?.lineage ?? null,
    source_scope: null,
    runtime_scope: null,
    portability: null,
    dependencies: [],
    external_services: [],
    tool_deps: [],
    mcp_dependencies: [],
    required_secrets: [],
    supersedes: [],
    superseded_by: null,
    sanitize_fields: [],
    state_files: [],
    notes: "",
    data_contracts: [],
    component_units: [],
    composite_id: null,
  };
}

// =========================================================
// Type detection
// =========================================================

/**
 * Map a repo-relative path to a Piece 2 `type` enum value.
 * Rules ordered most-specific first.
 *
 * @param {string} filePath - Repo-relative
 * @param {string} [content] - Optional file content for ambiguous cases
 * @returns {string} Type enum value from Piece 2 §8.1
 */
function detectType(filePath, content = "") {
  const rel = typeof filePath === "string" ? filePath.replace(/\\/g, "/") : "";
  const base = path.basename(rel);
  const ext = path.extname(rel).toLowerCase();

  // --- Piece 3 structural-fix additions (D4.5 + D4.6) ---
  // Ordered most-specific first. Tests precede everything because a
  // `*.test.js` file anywhere (including inside .claude/hooks/ or
  // scripts/) should classify as `test`, not as its directory-type.

  // Tests (D4.6) — both suffix form and __tests__ dir form
  if (/\.(test|spec)\.(js|cjs|mjs|ts)$/i.test(rel)) return "test";
  if (/(?:^|\/)__tests__\/[^/]+\.(js|cjs|mjs|ts)$/i.test(rel)) return "test";

  // .husky/_/ shims → git-hook (D4.5e). Caller stamps status:generated.
  if (/^\.husky\/_\//i.test(rel)) return "git-hook";
  // .husky/_shared.sh + .husky/husky.sh → hook-lib (D4.5c)
  if (/^\.husky\/(_shared|husky)\.sh$/i.test(rel)) return "hook-lib";
  // .husky/<name> (no ext, top-level, not under _/) → git-hook (D4.5d)
  if (/^\.husky\/[^/]+$/i.test(rel) && ext === "") return "git-hook";

  // .claude/hooks/**/*.sh → hook-lib (D4.5 a+b — run-*.sh and any other
  // .sh under the hooks tree). Must precede the `.js` Hooks rule below.
  if (/^\.claude\/hooks\/.*\.sh$/i.test(rel)) return "hook-lib";

  // --- Existing rules ---

  // Skills
  if (/^\.claude\/skills\/[^/]+\/SKILL\.md$/i.test(rel)) return "skill";
  // Agents
  if (/^\.claude\/agents\/[^/]+\.md$/i.test(rel)) return "agent";
  // Teams
  if (/^\.claude\/teams\/[^/]+\.md$/i.test(rel)) return "team";
  // Hook libs (.claude/hooks/lib/**)
  if (/^\.claude\/hooks\/lib\//i.test(rel)) return "hook-lib";
  // Hooks (.claude/hooks/**/*.{js,cjs,mjs})
  if (/^\.claude\/hooks\//i.test(rel) && (ext === ".js" || ext === ".cjs" || ext === ".mjs")) {
    return "hook";
  }
  // Script libs
  if (/^scripts\/lib\//i.test(rel)) return "script-lib";
  // Scripts
  if (
    /^scripts\//i.test(rel) &&
    (ext === ".js" || ext === ".cjs" || ext === ".mjs" || ext === ".sh")
  ) {
    return "script";
  }
  // Canonical memories
  if (/^\.claude\/canonical-memory\//i.test(rel)) return "canonical-memory";
  // CI workflows
  if (/^\.github\/workflows\//i.test(rel) && (ext === ".yml" || ext === ".yaml")) {
    return "ci-workflow";
  }
  // Settings
  if (/^\.claude\/settings(\.local)?\.json$/i.test(rel)) return "settings";
  // Keybindings
  if (base === "keybindings.json") return "keybindings";
  // Research sessions — whole directory is the unit, but single-file scans
  // classify individual files under it as the session type for record-keeping
  if (/^\.research\/[^/]+\//i.test(rel)) return "research-session";
  // Todo log
  if (/todos\.jsonl$/i.test(base)) return "todo-log";
  // Planning artifacts
  if (/^\.planning\//i.test(rel)) {
    if (/^PLAN\.md$/i.test(base)) return "plan";
    if (ext === ".md" || ext === ".jsonl") return "planning-artifact";
  }
  // Tools — tools/<name>/** is a tool-file
  if (/^tools\/[^/]+\//i.test(rel)) return "tool-file";
  // Shared doc libs (SoNash pattern; JASON-OS may grow one)
  if (/^\.claude\/skills\/_shared\//i.test(rel)) return "shared-doc-lib";
  // Configs
  if (
    base === "package.json" ||
    base === "package-lock.json" ||
    base === ".nvmrc" ||
    base === ".gitignore" ||
    base === ".gitattributes" ||
    base === ".editorconfig"
  ) {
    return "config";
  }
  // Output styles (Claude output-style convention: *.md with specific frontmatter)
  if (/^\.claude\/output-styles\//i.test(rel)) return "output-style";
  // Docs
  if (ext === ".md") {
    if (/^CLAUDE\.md$/i.test(base) || /^README\.md$/i.test(base)) return "doc";
    // Default markdown in root or misc location
    return "doc";
  }
  // DB files
  if (ext === ".db" || ext === ".sqlite" || ext === ".sqlite3") return "database";

  return "other";
}

/**
 * Detect module system for JS files.
 * @param {string} filePath - Repo-relative
 * @param {string} content
 * @returns {"cjs" | "esm" | "none"}
 */
function detectModuleSystem(filePath, content = "") {
  const ext = path.extname(filePath).toLowerCase();
  if (ext === ".cjs") return "cjs";
  if (ext === ".mjs") return "esm";
  if (ext !== ".js") return "none";
  // .js — infer from content. esm signals: `import ` at start of line,
  // `export ` at start of line. cjs signals: `require(`, `module.exports`.
  // Prefer esm if both present (newer style); fall back to cjs.
  const hasEsm = /^(?:import|export)\s/m.test(content);
  const hasCjs = /\brequire\s*\(|module\.exports\b|exports\.\w/.test(content);
  if (hasEsm) return "esm";
  if (hasCjs) return "cjs";
  return "none";
}

// =========================================================
// Frontmatter parsing
// =========================================================

/**
 * Parse any frontmatter + body-level metadata from a file.
 * Supports:
 *   - YAML frontmatter: `---\n<yaml>\n---\n` at file start (skills, agents, memories)
 *   - `**Lineage:** …` markdown body line (pr-review pattern; CL claim 12)
 *   - (TODO §S7) team roster format — prettier-ignore fenced table
 *
 * @param {string} filePath
 * @param {string} [content]
 * @returns {object | null} Parsed fields, or null if nothing found
 */
function parseExistingFrontmatter(filePath, content) {
  let text = content;
  if (typeof text !== "string") {
    try {
      // Route through toRepoRelative to reject paths that escape the repo
      // root before we hand them to the reader. Belt-and-braces: callers
      // already supply repo-relative paths, but defence-in-depth here
      // prevents regressions from a future caller reaching in with an
      // absolute or traversal path.
      const rel = toRepoRelative(filePath);
      const abs = path.resolve(REPO_ROOT_SENTINEL, rel);
      text = readTextWithSizeGuard(abs);
    } catch {
      return null;
    }
  }
  if (text.length === 0) return null;

  const result = {};
  const yaml = extractYamlFrontmatter(text);
  if (yaml !== null) Object.assign(result, yaml);
  const lineage = extractLineageBody(text);
  if (lineage !== null) result.lineage = lineage;

  return Object.keys(result).length === 0 ? null : result;
}

/**
 * Extract YAML frontmatter (the `---`-fenced block at file start).
 * Minimal parser — flat `key: value` pairs, `key: | …` blocks, and
 * `metadata:` nested one level. Full YAML fidelity is not required for
 * Piece 3's derivation needs; agents handle edge cases.
 *
 * @param {string} text
 * @returns {object | null}
 */
function extractYamlFrontmatter(text) {
  // Use a global regex with lastIndex reset to avoid stateful-regex bugs
  // (CLAUDE.md §5 anti-pattern row 4). A global isn't strictly needed here
  // since we only match once, but staying explicit.
  const re = /^---\n([\s\S]*?)\n---\s*(?:\n|$)/;
  const match = re.exec(text);
  if (!match) return null;
  const body = match[1];
  const out = {};
  let currentNested = null;
  let blockKey = null;
  let blockBuffer = [];

  for (const rawLine of body.split("\n")) {
    if (blockKey !== null) {
      // Continuation of a multi-line block (`key: |`); any line that starts
      // with 2+ spaces belongs to the block.
      if (/^\s{2,}/.test(rawLine) || rawLine === "") {
        blockBuffer.push(rawLine.replace(/^\s{2}/, ""));
        continue;
      }
      out[blockKey] = blockBuffer.join("\n").trim();
      blockKey = null;
      blockBuffer = [];
    }
    if (rawLine.trim().length === 0) continue;
    // Allow leading whitespace in the key capture so indented nested keys
    // (e.g. under `metadata:`) actually match. Without the `(\s*)` prefix
    // the kv regex would fail on any indented line and silently drop the
    // nested data, leaving `currentNested` as an empty {} (Qodo Sugg#1 R3).
    const kv = /^(\s*)([A-Za-z_][\w-]*)\s*:\s*(.*)$/.exec(rawLine);
    if (!kv) continue;
    const [, indent, key, rawValue] = kv;
    const value = rawValue.trim();
    const isIndented = indent.length >= 2;
    if (value === "|" || value === ">-" || value === "|-" || value === ">") {
      blockKey = key;
      blockBuffer = [];
      currentNested = null;
      continue;
    }
    if (value === "") {
      // Nested block header (e.g. `metadata:\n  key: val`)
      currentNested = {};
      out[key] = currentNested;
      continue;
    }
    // Inline value — strip matching quotes if present
    const stripped = /^"(.*)"$/.exec(value) ?? /^'(.*)'$/.exec(value);
    const clean = stripped ? stripped[1] : value;
    if (currentNested !== null && isIndented) {
      currentNested[key] = clean;
    } else {
      out[key] = clean;
      currentNested = null;
    }
  }
  if (blockKey !== null) out[blockKey] = blockBuffer.join("\n").trim();
  return Object.keys(out).length === 0 ? null : out;
}

/**
 * Extract `**Lineage:** …` body-text pattern (pr-review skill pattern per
 * CL claim 12). Returns the trimmed value string (caller can structure it
 * further), or null if absent.
 *
 * @param {string} text
 * @returns {string | null}
 */
function extractLineageBody(text) {
  const re = /\*\*Lineage:\*\*\s*(.+)/g;
  const match = re.exec(text);
  return match ? match[1].trim() : null;
}

// =========================================================
// Heuristic stubs (real fill via agents in S7/S8)
// =========================================================

/**
 * MVP — returns an empty array. Real section detection runs via the
 * `/label-audit --sections` agent pass. Left callable so downstream code
 * can stay static.
 *
 * @param {string} _content
 * @returns {Array}
 */
function detectSectionsHeuristic(_content) {
  return [];
}

/**
 * MVP — returns an empty array. Composite detection runs via `/label-audit
 * --composites` agent pass + back-fill synthesis.
 *
 * @param {object[]} _files
 * @returns {Array}
 */
function detectCompositesHeuristic(_files) {
  return [];
}

module.exports = {
  PATH_TRAVERSAL_RE,
  toRepoRelative,
  deriveCheapFields,
  deriveName,
  deriveUnderstandingFields,
  detectType,
  detectModuleSystem,
  parseExistingFrontmatter,
  detectSectionsHeuristic,
  detectCompositesHeuristic,
};
