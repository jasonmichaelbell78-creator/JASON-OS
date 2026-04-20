/**
 * sanitize.js — Piece 3 error-sanitization wrapper
 *
 * Thin wrapper around `scripts/lib/sanitize-error.cjs` so Piece 3 code has
 * a short, local import path and a Piece-3-specific logger prefix. Never lets
 * raw `error.message` escape (CLAUDE.md §5 anti-pattern row 1).
 *
 * Usage:
 *   const { sanitize, getErrorMessage, logger } = require("./sanitize");
 *   try { ... } catch (err) { console.error(sanitize(err)); }
 */

const path = require("node:path");

const REPO_ROOT_SENTINEL = path.join(__dirname, "..", "..", "..", "..");
const { sanitizeError, sanitizeErrorForJson, createSafeLogger } = require(
  path.join(REPO_ROOT_SENTINEL, "scripts", "lib", "sanitize-error.cjs")
);

/**
 * Return a sanitized error message string. Safe to log.
 * @param {unknown} err
 * @returns {string}
 */
function sanitize(err) {
  return sanitizeError(err);
}

/**
 * Backwards-compat alias — older Piece 3 call sites may prefer this name.
 * @param {unknown} err
 * @returns {string}
 */
function getErrorMessage(err) {
  return sanitizeError(err);
}

/**
 * JSON-shaped error record for structured logs / hook queues.
 * @param {unknown} err
 * @returns {{error: boolean, message: string, type: string}}
 */
function toJson(err) {
  return sanitizeErrorForJson(err);
}

/**
 * Piece-3-prefixed logger. Routes all error logging through `sanitize` so
 * raw `error.message` never reaches stderr.
 */
const logger = createSafeLogger("label");

module.exports = {
  sanitize,
  getErrorMessage,
  toJson,
  logger,
};
