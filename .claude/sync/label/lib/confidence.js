/**
 * confidence.js — Field-level confidence scoring + needs_review extraction.
 *
 * Derivation produces a confidence score in [0.0, 1.0] for each understanding
 * field. Fields below the threshold (default 0.80 per PLAN §S2) get added to
 * the record's `needs_review` list, which the pre-commit validator (§S6)
 * rejects as non-empty.
 *
 * Two primary signal sources contribute to a field's score:
 *   1. Primary-agent confidence self-report (agent writes "confidence": 0.92)
 *   2. Cross-check agreement — primary vs. secondary (Plan §S8 back-fill)
 *
 * Rules:
 *   - If only primary score available → that score IS the confidence
 *   - If primary + secondary scores available AND they agree on the value →
 *     min(primary, secondary) (the cautious floor)
 *   - If primary + secondary disagree on the value → 0.0 (forces review)
 */

const DEFAULT_THRESHOLD = 0.8;

/**
 * Clamp x into [0, 1]. Non-numbers collapse to 0.
 * @param {unknown} x
 * @returns {number}
 */
function clamp01(x) {
  const n = Number(x);
  if (!Number.isFinite(n)) return 0;
  if (n < 0) return 0;
  if (n > 1) return 1;
  return n;
}

/**
 * Combine primary and optional secondary scores for a single field.
 *
 * @param {object} input
 * @param {number} input.primary - Primary agent's self-reported confidence in [0, 1]
 * @param {number} [input.secondary] - Secondary agent's confidence in [0, 1] (optional)
 * @param {boolean} [input.agree=true] - Whether primary and secondary VALUES agree
 * @returns {number} Combined confidence in [0, 1]
 */
function scoreField({ primary, secondary, agree = true }) {
  const p = clamp01(primary);
  if (secondary === undefined || secondary === null) return p;
  if (!agree) return 0;
  const s = clamp01(secondary);
  return Math.min(p, s);
}

/**
 * Given a record of { fieldName: confidenceScore }, return the list of field
 * names whose score is below threshold. Preserves insertion order.
 *
 * @param {Record<string, number>} fieldScores
 * @param {number} [threshold=0.80]
 * @returns {string[]} Field names needing review
 */
function extractNeedsReview(fieldScores, threshold = DEFAULT_THRESHOLD) {
  if (fieldScores === null || typeof fieldScores !== "object") return [];
  const t = clamp01(threshold);
  const out = [];
  for (const [field, score] of Object.entries(fieldScores)) {
    if (clamp01(score) < t) out.push(field);
  }
  return out;
}

/**
 * Merge a new needs_review list into an existing one, preserving any entries
 * already present from a prior pass (set-union semantics). Stable order —
 * existing entries stay in their original positions; new entries appended.
 *
 * @param {string[]} existing
 * @param {string[]} additions
 * @returns {string[]}
 */
function mergeNeedsReview(existing, additions) {
  const seen = new Set(Array.isArray(existing) ? existing : []);
  const out = Array.isArray(existing) ? [...existing] : [];
  if (!Array.isArray(additions)) return out;
  for (const field of additions) {
    if (typeof field === "string" && !seen.has(field)) {
      seen.add(field);
      out.push(field);
    }
  }
  return out;
}

module.exports = {
  DEFAULT_THRESHOLD,
  clamp01,
  scoreField,
  extractNeedsReview,
  mergeNeedsReview,
};
