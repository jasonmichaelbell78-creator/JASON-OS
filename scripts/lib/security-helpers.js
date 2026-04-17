/* global __dirname */
/**
 * Security Helpers Library
 *
 * Reusable secure implementations for common operations.
 * Use these instead of implementing security patterns from scratch.
 *
 * Pattern references are from CODE_PATTERNS.md
 *
 * @module security-helpers
 */

const { existsSync, lstatSync, writeFileSync, unlinkSync } = require("node:fs");
const path = require("node:path");
const { execFileSync } = require("node:child_process");
const { tmpdir } = require("node:os");

// Re-export isSafeToWrite from symlink-guard for convenience
// (scripts that import from security-helpers don't need to know the hook path)
let isSafeToWrite;
try {
  ({ isSafeToWrite } = require(
    path.join(__dirname, "..", "..", ".claude", "hooks", "lib", "symlink-guard")
  ));
} catch {
  // Fallback: create isSafeToWrite from refuseSymlinkWithParents
  isSafeToWrite = (filePath) => {
    try {
      refuseSymlinkWithParents(filePath);
      return true;
    } catch {
      return false;
    }
  };
}

const { sanitizeError } = require("./sanitize-error.cjs");

/**
 * Sanitize display strings (for logs, console output)
 * Pattern: #34 (relative path logging)
 *
 * @param {string} str - String to sanitize
 * @param {number} maxLength - Maximum length (default 100)
 * @returns {string} Sanitized string
 */
function sanitizeDisplayString(str, maxLength = 100) {
  if (!str) return "";

  const sanitized = String(str)
    .replaceAll(/```[\s\S]*?```/g, "[CODE]")
    .replaceAll(/`[^`]+`/g, "[CODE]")
    .replaceAll(/C:\\Users\\[^\s]+/gi, "[PATH]")
    .replaceAll(/\/home\/[^\s]+/gi, "[PATH]")
    .replaceAll(/\/Users\/[^\s]+/gi, "[PATH]")
    .replaceAll(/\s+/g, " ")
    .trim();

  return sanitized.length > maxLength ? sanitized.substring(0, maxLength) + "..." : sanitized;
}

/**
 * Escape Markdown metacharacters to prevent injection
 * Pattern: #33, #35 (Markdown injection prevention)
 *
 * @param {string} str - String to escape
 * @param {number} maxLength - Maximum length (default 100)
 * @returns {string} Escaped string safe for Markdown
 */
function escapeMd(str, maxLength = 100) {
  const sanitized = sanitizeDisplayString(str, maxLength);
  // Escape all Markdown metacharacters including backslash
  return sanitized.replaceAll(/[\\[\]()_*`#>!-]/g, String.raw`\$&`);
}

/**
 * Check if path or any parent directory is a symlink
 * Pattern: #36, #39 (symlink protection including parents)
 *
 * @param {string} filePath - Path to check
 * @throws {Error} If path or any parent is a symlink
 */
function refuseSymlinkWithParents(filePath) {
  let current = path.resolve(filePath);

  while (true) {
    if (existsSync(current)) {
      const st = lstatSync(current);
      if (st.isSymbolicLink()) {
        throw new Error(`Refusing to write through symlink: ${current}`);
      }
    }

    const parent = path.dirname(current);
    if (parent === current) break;
    current = parent;
  }
}

/**
 * Validate that a path is within an allowed directory
 * Pattern: #17, #18, #41 (path traversal prevention)
 *
 * @param {string} baseDir - Base directory (must be within this)
 * @param {string} userPath - User-provided path to validate
 * @returns {string} Validated relative path
 * @throws {Error} If path escapes baseDir
 */
function validatePathInDir(baseDir, userPath) {
  // Reject empty/falsy paths upfront
  if (!userPath || typeof userPath !== "string" || userPath.trim() === "") {
    throw new Error(`Path must be within ${path.basename(baseDir)}/`);
  }

  const resolved = path.resolve(baseDir, userPath);
  const rel = path.relative(baseDir, resolved);

  if (rel === "" || /^\.\.(?:[\\/]|$)/.test(rel) || path.isAbsolute(rel)) {
    throw new Error(`Path must be within ${path.basename(baseDir)}/`);
  }

  return rel;
}

/**
 * Safely write a new file with security hardening
 * Pattern: #32, #36, #39 (exclusive creation, symlink protection)
 *
 * @param {string} filePath - Path to write
 * @param {string} content - Content to write
 * @param {object} options - Additional options
 * @param {boolean} options.allowOverwrite - Allow overwriting existing files
 * @throws {Error} If file exists (unless allowOverwrite) or symlink detected
 */
function safeWriteFile(filePath, content, options = {}) {
  refuseSymlinkWithParents(filePath);

  if (options.allowOverwrite) {
    // For overwrites, recheck symlink status immediately before write (TOCTOU mitigation)
    if (existsSync(filePath)) {
      const stat = lstatSync(filePath);
      if (stat.isSymbolicLink()) {
        throw new Error(`Refusing to write through symlink: ${filePath}`);
      }
    }
    writeFileSync(filePath, content, {
      encoding: "utf-8",
      flag: "w",
      mode: 0o600,
    });
  } else {
    // For new files, use atomic wx flag (fails if file exists)
    try {
      writeFileSync(filePath, content, {
        encoding: "utf-8",
        flag: "wx",
        mode: 0o600,
      });
    } catch (error) {
      if (error.code === "EEXIST") {
        throw new Error(`Refusing to overwrite existing file: ${filePath}`);
      }
      throw error;
    }
  }
}

/**
 * Safely stage a file with git add
 * Pattern: #31, #38, #40, #41 (git security)
 *
 * @param {string} repoRoot - Repository root directory
 * @param {string} filePath - Path to stage (relative to repo)
 * @throws {Error} If path is invalid or outside repo
 */
function safeGitAdd(repoRoot, filePath) {
  // Block pathspec magic (Pattern #40)
  if (filePath.startsWith(":")) {
    throw new Error("Git pathspec magic is not allowed");
  }

  // Validate path is within repo (Pattern #41)
  const validPath = validatePathInDir(repoRoot, filePath);

  // Use -- terminator to prevent option injection (Pattern #31).
  // SonarCloud S4036 (PATH search for "git"): accepted. This helper is
  // invoked only from local Claude Code hooks running in the operator's
  // own user environment. PATH is part of the operator's shell config,
  // not attacker-controlled. An attacker who can shadow `git` on PATH
  // already owns the user account. No realistic threat model here.
  execFileSync("git", ["add", "--", validPath], { cwd: repoRoot });
}

/**
 * Safely create a git commit with temp file handling
 * Pattern: #32 (temp file security)
 *
 * @param {string} repoRoot - Repository root directory
 * @param {string} message - Commit message
 * @returns {boolean} True if commit succeeded
 */
function safeGitCommit(repoRoot, message) {
  const msgFile = path.join(tmpdir(), `COMMIT_MSG_${process.pid}_${Date.now()}.txt`);

  try {
    // Sanitize message content
    const safeMessage = sanitizeDisplayString(message, 5000);

    writeFileSync(msgFile, safeMessage, {
      encoding: "utf-8",
      flag: "wx",
      mode: 0o600,
    });

    // SonarCloud S4036 (PATH search for "git"): accepted — same rationale
    // as safeGitAdd above. Hook-only code running in operator user space;
    // PATH not attacker-controlled.
    execFileSync("git", ["commit", "-F", msgFile], { cwd: repoRoot });
    return true;
  } catch (error) {
    console.warn("Could not create commit:", sanitizeError(error));
    return false;
  } finally {
    try {
      unlinkSync(msgFile);
    } catch {
      // Ignore cleanup failures
    }
  }
}

/**
 * Sanitize a user-provided name for use as filename
 * Pattern: #31, #37 (filename sanitization)
 *
 * @param {string} name - User-provided name
 * @param {object} options - Options
 * @param {number} options.maxLength - Maximum length (default 60)
 * @param {string} options.fallback - Fallback if empty (default "UNNAMED")
 * @returns {string} Safe filename component
 */
function sanitizeFilename(name, options = {}) {
  const { maxLength = 60, fallback = "UNNAMED" } = options;

  const safe = String(name || "")
    .replaceAll(/[/\\]/g, "_") // Remove path separators
    .replaceAll(/\s+/g, "_") // Spaces to underscores
    .replaceAll(/[^a-zA-Z0-9_.-]/g, "") // Remove special chars
    .replaceAll(/^-+/g, "") // Strip leading dashes (Pattern #31)
    .slice(0, maxLength);

  return safe || fallback;
}

/**
 * Parse CLI arguments with validation
 * Pattern: CLI validation from PR #310 R5-R6
 *
 * @param {string[]} args - Command line arguments
 * @param {object} schema - Schema defining expected arguments
 * @returns {object} Parsed and validated options
 *
 * Schema format:
 * {
 *   "--flag": { type: "boolean" },
 *   "--option": { type: "string", required: false },
 *   "--count": { type: "number", min: 1, max: 100 }
 * }
 */
/**
 * Seed options dict with schema defaults (boolean=false, or explicit
 * `default` value when defined).
 */
function initCliDefaults(schema) {
  const options = {};
  for (const [flag, def] of Object.entries(schema)) {
    if (def.type === "boolean") {
      options[flag] = false;
    } else if (def.default !== undefined) {
      options[flag] = def.default;
    }
  }
  return options;
}

/**
 * Parse + validate a number-typed CLI argument value against its schema
 * (type=number, optional min/max). Returns {value} on success or {error}.
 *
 * @param {string} arg - The flag name (for error message phrasing).
 * @param {string} next - The raw value string from argv.
 * @param {{min?: number, max?: number}} def - Schema entry for this flag.
 * @returns {{value: number}|{error: string}}
 */
function parseCliNumber(arg, next, def) {
  // Strict match: allow optional minus + digits only. Number.parseInt would
  // silently accept "10px" → 10 or "10.5" → 10 (truncating), and the schema
  // contract is integers, so reject anything non-integer upfront.
  if (!/^-?\d+$/.test(next)) return { error: `${arg} must be a number` };
  const num = Number(next);
  // Guard against overflow silently producing NaN/Infinity on extreme inputs.
  if (!Number.isSafeInteger(num)) return { error: `${arg} must be a number` };
  if (def.min !== undefined && num < def.min) return { error: `${arg} must be >= ${def.min}` };
  if (def.max !== undefined && num > def.max) return { error: `${arg} must be <= ${def.max}` };
  return { value: num };
}

/**
 * Walk the schema and return a list of error messages for any `required`
 * flag that is still undefined after arg parsing.
 */
function validateRequiredCliArgs(schema, options) {
  const errors = [];
  for (const [flag, def] of Object.entries(schema)) {
    if (def.required && options[flag] === undefined) {
      errors.push(`${flag} is required`);
    }
  }
  return errors;
}

function parseCliArgs(args, schema) {
  const options = initCliDefaults(schema);
  const errors = [];

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    const def = schema[arg];
    if (!def) {
      // Fail loudly on unknown --flags so typos surface at parse time
      // instead of silently defaulting. Non-flag tokens are left alone;
      // callers that support positional args can layer their own handling.
      if (arg.startsWith("--")) errors.push(`Unknown option: ${arg}`);
      continue;
    }

    if (def.type === "boolean") {
      options[arg] = true;
      continue;
    }

    const next = args[++i]; // Consume next arg (the value)
    if (!next || next.startsWith("--")) {
      errors.push(`Missing value for ${arg}`);
      continue;
    }

    if (def.type === "number") {
      const parsed = parseCliNumber(arg, next, def);
      if (parsed.error) {
        errors.push(parsed.error);
        continue;
      }
      options[arg] = parsed.value;
    } else {
      options[arg] = next;
    }
  }

  errors.push(...validateRequiredCliArgs(schema, options));

  if (errors.length > 0) {
    throw new Error(`CLI argument errors:\n  - ${errors.join("\n  - ")}`);
  }

  return options;
}

/**
 * TOCTOU-safe file read
 * Pattern: File reads with try/catch (avoids existsSync race condition)
 *
 * @param {string} filePath - Path to read
 * @param {string} description - Description for error messages
 * @returns {{success: boolean, content?: string, error?: string}}
 */
function safeReadFile(filePath, description) {
  try {
    const content = require("node:fs").readFileSync(filePath, "utf-8");
    return { success: true, content };
  } catch (error) {
    if (error.code === "ENOENT") {
      return { success: false, error: `${description} not found` };
    }
    return { success: false, error: sanitizeError(error) };
  }
}

/**
 * Validate URL against SSRF allowlist
 * Pattern: SSRF allowlist (explicit hostname + protocol enforcement)
 *
 * @param {string} urlString - URL to validate
 * @param {string[]} allowedHosts - List of allowed hostnames
 * @returns {{valid: boolean, url?: URL, error?: string}}
 */
function validateUrl(urlString, allowedHosts) {
  try {
    const url = new URL(urlString);

    if (url.protocol !== "https:") {
      return { valid: false, error: "Only HTTPS URLs allowed" };
    }

    // Block localhost/loopback bypasses (SSRF hardening)
    const hostname = url.hostname.toLowerCase();
    const blockedPatterns = [
      "localhost",
      "127.0.0.1",
      "0.0.0.0",
      "::1",
      "[::1]",
      "0177.0.0.1", // Octal
      "2130706433", // Decimal
    ];
    if (blockedPatterns.some((p) => hostname === p || hostname.endsWith("." + p))) {
      return { valid: false, error: "Localhost/loopback not allowed" };
    }

    // Block IP addresses (only allow domain names)
    if (/^(\d{1,3}\.){3}\d{1,3}$/.test(hostname) || hostname.startsWith("[")) {
      return { valid: false, error: "IP addresses not allowed - use domain names" };
    }

    // Exact hostname match only (no subdomain bypass)
    if (!allowedHosts.some((allowed) => hostname === allowed.toLowerCase())) {
      return { valid: false, error: `Host ${hostname} not in allowlist` };
    }

    return { valid: true, url };
  } catch {
    return { valid: false, error: "Invalid URL" };
  }
}

/**
 * Safely execute regex in loop with proper state management
 * Pattern: Regex state leak prevention (reset lastIndex)
 *
 * @param {RegExp} pattern - Pattern with /g flag
 * @param {string} content - Content to search
 * @returns {RegExpExecArray[]} All matches
 */
function safeRegexExec(pattern, content) {
  if (!pattern.global) {
    throw new Error("Pattern must have /g flag for safe iteration");
  }

  pattern.lastIndex = 0;
  const matches = [];
  let match;

  while ((match = pattern.exec(content)) !== null) {
    matches.push(match);

    // Prevent infinite loops on zero-length matches
    if (match[0].length === 0) {
      pattern.lastIndex = Math.min(pattern.lastIndex + 1, content.length);
    }
  }

  return matches;
}

/**
 * Mask PII for logging
 * Pattern: PII masking (privacy in logs)
 *
 * @param {string} email - Email to mask
 * @returns {string} Masked email like u***@d***.com
 */
function maskEmail(email) {
  if (!email || typeof email !== "string") return "[REDACTED]";

  const parts = email.split("@");
  if (parts.length !== 2) return "[REDACTED]";

  const [local, domain] = parts;
  if (!local || !domain) return "[REDACTED]";

  const domainParts = domain.split(".");

  // Handle edge cases: empty local, single-part domain
  const maskedLocal = local.length > 0 ? local.charAt(0) + "***" : "***";

  // Domain must have at least one dot for valid email
  if (domainParts.length < 2) {
    return `${maskedLocal}@[REDACTED]`;
  }

  // Mask the main domain (second-to-last part), keep subdomains and TLD visible
  // e.g., user@subdomain.example.com -> u***@subdomain.e***.com
  let maskedDomain;
  if (domainParts.length > 2) {
    const subdomains = domainParts.slice(0, -2);
    const mainDomain = domainParts.at(-2);
    const tld = domainParts.at(-1);
    const maskedMainDomain = mainDomain.charAt(0) + "***";
    maskedDomain = [...subdomains, maskedMainDomain, tld].join(".");
  } else {
    // Simple domain like example.com
    const maskedMainDomain = domainParts[0].charAt(0) + "***";
    maskedDomain = maskedMainDomain + "." + domainParts[1];
  }

  return `${maskedLocal}@${maskedDomain}`;
}

/**
 * Normalize a string to a URL-safe slug (lowercase, hyphens only).
 * Shared across CAS scripts for consistent source matching.
 *
 * SonarCloud S5852 (slow regex): accepted — NOT vulnerable to ReDoS.
 * Both regexes are atomic with no shared-prefix alternation:
 *   /[^a-z0-9]+/g     — negated character class + greedy +; no
 *                       backtracking possible (each char matches or
 *                       doesn't; no sub-pattern to retry).
 *   /^-+|-+$/g        — two alternatives anchored to opposite ends of
 *                       the string (^ vs $), with only a literal char
 *                       repeated; no overlap, no catastrophic backtrack.
 * Worst-case complexity is linear in input length. Safe.
 */
function slugify(s) {
  return String(s)
    .toLowerCase()
    .replaceAll(/[^a-z0-9]+/g, "-")
    .replaceAll(/^-+|-+$/g, "");
}

module.exports = {
  // Error/string handling
  sanitizeError,
  sanitizeDisplayString,
  escapeMd,

  // File operations
  isSafeToWrite,
  refuseSymlinkWithParents,
  validatePathInDir,
  safeWriteFile,
  safeReadFile,

  // Git operations
  safeGitAdd,
  safeGitCommit,

  // Input sanitization
  sanitizeFilename,
  parseCliArgs,

  // Security utilities
  validateUrl,
  safeRegexExec,
  maskEmail,

  // String utilities
  slugify,
};
