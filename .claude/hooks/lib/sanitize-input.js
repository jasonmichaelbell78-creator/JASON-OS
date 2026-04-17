/* global module */
/**
 * sanitize-input.js - Shared input sanitization for hook scripts
 *
 * Provides sanitizeInput() and SECRET_PATTERNS for consistent
 * input cleaning across log-override.js, commit-failure-reporter.js,
 * and other hook scripts that write to JSONL state files.
 */

// Patterns that look like secrets - redact these from logs
// Refined to reduce false positives (e.g., SHA hashes, file paths)
const SECRET_PATTERNS = [
  // Likely secret tokens: 24+ chars, must contain both letters and digits (reduces SHA/word false positives)
  /\b(?=[A-Za-z0-9_-]{24,}\b)(?=[A-Za-z0-9_-]*[A-Za-z])(?=[A-Za-z0-9_-]*\d)[A-Za-z0-9_-]+\b/g,
  // Bearer tokens
  /bearer\s+[A-Z0-9._-]+/gi,
  // Basic auth
  /basic\s+[A-Z0-9+/=]+/gi,
  // Key=value patterns with sensitive names (handles JSON "key": "val", key="val", key='val', key=val)
  /(?:"?(?:api[_-]?key|token|secret|password|auth|credential)"?\s*[=:]\s*)"([^"\\]|\\.)+"/gi,
  /(?:"?(?:api[_-]?key|token|secret|password|auth|credential)"?\s*[=:]\s*)'[^']+'/gi,
  /(?:"?(?:api[_-]?key|token|secret|password|auth|credential)"?\s*[=:]\s*)[^\s"',;)\]}]{2,}/gi,
];

/**
 * Sanitize and truncate input to prevent log injection and secret leakage.
 * @param {string} value - Input string to sanitize
 * @param {number} [maxLength=500] - Maximum output length
 * @returns {string} Sanitized string
 */
function sanitizeInput(value, maxLength = 500) {
  // PR #3 R2 (N3): coerce non-string inputs to string to prevent TypeError on
  // truthy non-string values (numbers, objects). null/undefined → empty string.
  if (value == null) return "";
  const input = typeof value === "string" ? value : String(value);
  if (!input) return input;

  // Remove control characters except newlines (\n=10), tabs (\t=9), and carriage return (\r=13)
  // Using character code filtering instead of regex to avoid no-control-regex lint error
  let sanitized = "";
  for (let i = 0; i < input.length && i < maxLength * 2; i++) {
    const code = input.charCodeAt(i);
    // Allow printable ASCII (32-126), tab (9), newline (10), carriage return (13)
    if ((code >= 32 && code <= 126) || code === 9 || code === 10 || code === 13) {
      sanitized += input[i];
    }
  }

  // Redact patterns that look like secrets
  for (const pattern of SECRET_PATTERNS) {
    sanitized = sanitized.replace(pattern, "[REDACTED]");
  }

  // Truncate to prevent log bloat
  if (sanitized.length > maxLength) {
    return sanitized.slice(0, maxLength) + "...[truncated]";
  }
  return sanitized;
}

module.exports = { sanitizeInput, SECRET_PATTERNS };
