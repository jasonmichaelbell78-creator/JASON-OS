/**
 * fingerprint.js — SHA-256 content fingerprint for drift detection.
 *
 * Normalization rules (per PLAN §S2):
 *   1. Normalize line endings CRLF / CR → LF
 *   2. Strip trailing whitespace on every line
 *   3. Collapse trailing blank lines to a single terminal LF
 *   4. Do NOT strip comments — comment changes count as semantic drift
 *
 * Returns "sha256:<hex>" so the prefix distinguishes future hash algorithms
 * (D16 schema migration compatibility). Content hashes are a primary drift
 * signal for the PostToolUse hook and /label-audit skill.
 */

const { createHash } = require("node:crypto");

/**
 * Normalize content for fingerprint comparison.
 * @param {string} content
 * @returns {string}
 */
function normalize(content) {
  if (typeof content !== "string") {
    throw new TypeError("fingerprint.normalize: content must be a string");
  }
  const unifiedEol = content.replace(/\r\n?/g, "\n");
  const trimmedLines = unifiedEol
    .split("\n")
    .map((line) => line.replace(/[ \t]+$/g, ""))
    .join("\n");
  // Collapse >1 trailing blank line to a single terminal LF. If content is
  // all blank or empty, treat as empty string.
  const stripped = trimmedLines.replace(/\n+$/g, "");
  return stripped.length === 0 ? "" : `${stripped}\n`;
}

/**
 * SHA-256 fingerprint of normalized content.
 * @param {string} content
 * @returns {string} "sha256:<64 hex>"
 */
function fingerprint(content) {
  const normalized = normalize(content);
  const hex = createHash("sha256").update(normalized, "utf8").digest("hex");
  return `sha256:${hex}`;
}

/**
 * Parse a "sha256:<hex>" fingerprint string. Returns null on malformed input.
 * @param {string} fp
 * @returns {{algorithm: string, hex: string} | null}
 */
function parseFingerprint(fp) {
  if (typeof fp !== "string") return null;
  const match = /^(sha256):([a-f0-9]{64})$/i.exec(fp);
  return match
    ? { algorithm: match[1].toLowerCase(), hex: match[2].toLowerCase() }
    : null;
}

/**
 * Hamming-like delta between two fingerprints. SHA-256 is a cryptographic
 * hash so small-content-change ↔ fingerprint-similarity is NOT preserved —
 * this helper exists only for exact-match checks and for callers that want
 * a single boolean "same fingerprint".
 * @param {string} a
 * @param {string} b
 * @returns {boolean}
 */
function sameFingerprint(a, b) {
  const pa = parseFingerprint(a);
  const pb = parseFingerprint(b);
  return pa !== null && pb !== null && pa.algorithm === pb.algorithm && pa.hex === pb.hex;
}

module.exports = {
  normalize,
  fingerprint,
  parseFingerprint,
  sameFingerprint,
};
