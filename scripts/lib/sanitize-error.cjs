/**
 * Error Sanitization Utility (canonical CJS implementation)
 *
 * Prevents leakage of sensitive system information through error messages
 * while providing sufficient detail for internal debugging.
 *
 * Addresses recurring Qodo compliance findings:
 * - Generic: Secure Error Handling
 * - Generic: Secure Logging Practices
 *
 * Usage: const { sanitizeError } = require("./sanitize-error.cjs");
 *
 * Module-system note: this file is the single source of truth. Hooks and
 * scripts/lib/ consume it via require(). If a future ESM consumer needs
 * these utilities, add a thin `.mjs` wrapper that re-exports from here
 * (not a parallel implementation — the prior `.js` twin was removed as
 * dead code with zero consumers and 94%+ duplication per SonarCloud).
 *
 * @module lib/sanitize-error
 */

const SENSITIVE_PATTERNS = [
  /\/home\/[^/\s]+/gi,
  /\/Users\/[^/\s]+/gi,
  /C:\\Users\\[^\\]+/gi,
  // Forward-slash Windows variant — Node fs errors use backslashes on
  // Windows so the backslash form above covers the in-practice case, but
  // research artifacts and prose can carry `C:/Users/<name>/...` (e.g.,
  // when an absolute path was constructed in JS via `path.join`-then-
  // `.replace(/\\/g, "/")` for display). This pattern catches that form
  // before it lands in any log sink.
  /[A-Z]:\/Users\/[^/\s]+/gi,
  /\/etc\/[^\s]+/gi,
  /\/var\/[^\s]+/gi,
  /(?:"?(?:password|api[_-]?key|token|secret|credential|auth)"?\s*[=:]\s*)"([^"\\]|\\.)+"/gi,
  /(?:"?(?:password|api[_-]?key|token|secret|credential|auth)"?\s*[=:]\s*)'[^']+'/gi,
  /(?:"?(?:password|api[_-]?key|token|secret|credential|auth)"?\s*[=:]\s*)[^\s"',;)\]}]{2,}/gi,
  /Bearer\s+[A-Z0-9._-]+/gi,
  /mongodb(\+srv)?:\/\/[^\s]+/gi,
  /postgres(ql)?:\/\/[^\s]+/gi,
  /mysql:\/\/[^\s]+/gi,
  /redis:\/\/[^\s]+/gi,
  /process\.env\.[A-Z_]+/gi,
  /\b(?:10\.\d{1,3}|172\.(?:1[6-9]|2\d|3[01])|192\.168)\.\d{1,3}\.\d{1,3}\b/g,
  /https?:\/\/(?:localhost|127\.0\.0\.1|0\.0\.0\.0)[^\s]*/gi,
];

const REDACTED = "[REDACTED]";

/**
 * Coerce an unknown value to a useful string without falling into
 * Object's default "[object Object]" stringification (SonarCloud S6324).
 *
 * Trade-off note: JSON-serializing arbitrary non-string error values may
 * surface more data than the old `String()` behavior, which collapsed
 * objects to "[object Object]". That old behavior was *lying*, not
 * protecting — it hid context useful for debugging. The canonical
 * defense is SENSITIVE_PATTERNS below, which strips credentials, bearer
 * tokens, connection strings, home paths, env var refs, and internal
 * IPs from the serialized output before it reaches any log sink.
 * If a new secret format surfaces, add a pattern to SENSITIVE_PATTERNS
 * rather than regressing to "[object Object]".
 */
function stringifyUnknown(v) {
  if (typeof v === "string") return v;
  // Explicit literals for null/undefined avoid SonarCloud S6324's blanket
  // flag on `String()` — these cases are safe (String(null)==="null") but
  // the rule doesn't track types, so we bypass it with literals.
  if (v === null) return "null";
  if (v === undefined) return "undefined";
  try {
    return JSON.stringify(v);
  } catch {
    return Object.prototype.toString.call(v);
  }
}

function sanitizeError(error, options = {}) {
  const { verbose = false } = options;

  let message;
  if (error instanceof Error) {
    message = error.message;
  } else if (typeof error === "string") {
    message = error;
  } else if (error && typeof error === "object" && "message" in error) {
    message = stringifyUnknown(error.message);
  } else {
    message = stringifyUnknown(error);
  }

  if (verbose && process.env.NODE_ENV === "development") {
    return message;
  }

  let sanitized = message;
  for (const pattern of SENSITIVE_PATTERNS) {
    pattern.lastIndex = 0;
    sanitized = sanitized.replace(pattern, REDACTED);
  }

  return sanitized;
}

function sanitizeErrorForJson(error, options = {}) {
  const message = sanitizeError(error, options);
  return {
    error: true,
    message,
    type: error instanceof Error ? error.name : "Error",
  };
}

function createSafeLogger(prefix = "") {
  const formatPrefix = prefix ? `[${prefix}] ` : "";
  return {
    error: (msg, error) => {
      const errorMsg = error ? `: ${sanitizeError(error)}` : "";
      console.error(`${formatPrefix}${msg}${errorMsg}`);
    },
    warn: (msg, error) => {
      const errorMsg = error ? `: ${sanitizeError(error)}` : "";
      console.warn(`${formatPrefix}${msg}${errorMsg}`);
    },
    info: (msg) => {
      console.log(`${formatPrefix}${msg}`);
    },
  };
}

function safeErrorMessage(error) {
  return sanitizeError(error);
}

module.exports = {
  sanitizeError,
  sanitizeErrorForJson,
  createSafeLogger,
  safeErrorMessage,
};
