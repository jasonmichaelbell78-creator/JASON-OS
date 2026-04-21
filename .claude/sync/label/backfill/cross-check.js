/**
 * cross-check.js — Field-level primary vs. secondary disagreement routing.
 *
 * Implements the 7 cases (A–G) from
 * `.claude/skills/label-audit/reference/DISAGREEMENT_RESOLUTION.md` and the
 * record-level "unreachable" outcome. Consumes scoring primitives from
 * `../lib/confidence.js` — does NOT re-implement confidence math.
 *
 * Inputs per record (both `primary` and `secondary`) follow the
 * DERIVATION_RULES.md output contract:
 *   {
 *     path: "rel/path.js",
 *     <field>: <value>, ...,
 *     confidence: { <field>: <score 0..1>, ... }
 *   }
 *
 * Output:
 *   {
 *     preview: { path, ...committedFields, needs_review, confidence },
 *     needsReview: string[],
 *     disagreements: [{ field, case, primary, secondary }]
 *   }
 * OR record-level short-circuit:
 *   { preview: null, needsReview: [], disagreements: [], unreachable: true }
 */

const {
  scoreField,
  extractNeedsReview,
  mergeNeedsReview,
  DEFAULT_THRESHOLD,
} = require("../lib/confidence");
const { sanitize } = require("../lib/sanitize");

/**
 * Extract the set of field names to cross-check — union of primary &
 * secondary keys, excluding reserved slots (`path`, `confidence`).
 * @param {object} primary
 * @param {object} secondary
 * @returns {string[]}
 */
function unionFieldNames(primary, secondary) {
  const reserved = new Set(["path", "confidence"]);
  const seen = new Set();
  const out = [];
  for (const src of [primary, secondary]) {
    if (!src || typeof src !== "object") continue;
    for (const key of Object.keys(src)) {
      if (reserved.has(key)) continue;
      if (!seen.has(key)) {
        seen.add(key);
        out.push(key);
      }
    }
  }
  return out;
}

/**
 * Lookup a per-field confidence score from a record's `confidence` map.
 * Missing / malformed → 0.
 * @param {object} record
 * @param {string} field
 * @returns {number}
 */
function confOf(record, field) {
  if (!record || typeof record !== "object") return 0;
  const c = record.confidence;
  if (!c || typeof c !== "object") return 0;
  const n = Number(c[field]);
  return Number.isFinite(n) ? n : 0;
}

/**
 * Deep-equality helper for scalar / array / object field values. Uses JSON
 * shape for complex structures; cheap and deterministic for the primitive
 * + record shapes produced by derivation agents.
 * @param {unknown} a
 * @param {unknown} b
 * @returns {boolean}
 */
function deepEqual(a, b) {
  if (a === b) return true;
  if (a === null || b === null) return false;
  if (typeof a !== typeof b) return false;
  if (typeof a !== "object") return false;
  try {
    return JSON.stringify(a) === JSON.stringify(b);
  } catch (err) {
    // Circular refs / non-serializable → treat as unequal, log sanitized.
    // eslint-disable-next-line no-console
    console.error(`[label] cross-check deepEqual: ${sanitize(err)}`);
    return false;
  }
}

/**
 * Classify a value's top-level type for Case G detection.
 * Returns one of: "null", "array", "object", "string", "number", "boolean",
 * "undefined".
 * @param {unknown} v
 * @returns {string}
 */
function classify(v) {
  if (v === null) return "null";
  if (Array.isArray(v)) return "array";
  return typeof v;
}

/**
 * Build a disagreement candidate record (Case C / D / E / G preview payload).
 * @param {object} primary
 * @param {object} secondary
 * @param {string} field
 */
function candidatesFor(primary, secondary, field) {
  const out = [];
  if (primary && Object.prototype.hasOwnProperty.call(primary, field)) {
    out.push({
      source: "primary",
      value: primary[field],
      confidence: confOf(primary, field),
    });
  }
  if (secondary && Object.prototype.hasOwnProperty.call(secondary, field)) {
    out.push({
      source: "secondary",
      value: secondary[field],
      confidence: confOf(secondary, field),
    });
  }
  return out;
}

/**
 * Set-union of two arrays for Case D. Primitives dedupe by strict equality;
 * complex elements dedupe by JSON.stringify. Primary's element order wins
 * when both sides contributed a matching element.
 * @param {unknown[]} a
 * @param {unknown[]} b
 * @returns {unknown[]}
 */
function arrayUnion(a, b) {
  const seen = new Set();
  const out = [];
  const push = (el) => {
    let key;
    if (el !== null && typeof el === "object") {
      try {
        key = "J:" + JSON.stringify(el);
      } catch {
        key = "O:" + String(el);
      }
    } else {
      key = typeof el + ":" + String(el);
    }
    if (!seen.has(key)) {
      seen.add(key);
      out.push(el);
    }
  };
  for (const el of Array.isArray(a) ? a : []) push(el);
  for (const el of Array.isArray(b) ? b : []) push(el);
  return out;
}

/**
 * Cross-check a single primary/secondary record pair.
 *
 * @param {object} args
 * @param {object|null} args.primary
 * @param {object|null} args.secondary
 * @returns {object}
 */
function crossCheck({ primary, secondary } = {}) {
  // Record-level: either side missing / null = unreachable (D15 flag path).
  if (!primary || !secondary) {
    return {
      preview: null,
      needsReview: [],
      disagreements: [],
      unreachable: true,
    };
  }

  const path =
    primary.path || secondary.path || null;
  const fields = unionFieldNames(primary, secondary);

  const committed = {};
  const fieldScores = {};
  const disagreements = [];

  for (const field of fields) {
    const hasP = Object.prototype.hasOwnProperty.call(primary, field);
    const hasS = Object.prototype.hasOwnProperty.call(secondary, field);
    const pVal = hasP ? primary[field] : null;
    const sVal = hasS ? secondary[field] : null;
    const pConf = confOf(primary, field);
    const sConf = confOf(secondary, field);
    const pType = classify(pVal);
    const sType = classify(sVal);

    // Case F — both null/missing.
    if (pVal === null && sVal === null) {
      committed[field] = null;
      fieldScores[field] = 0;
      continue;
    }

    // Case E — exactly one side null (XOR).
    if ((pVal === null) !== (sVal === null)) {
      const nonNull = pVal === null ? sVal : pVal;
      committed[field] = nonNull;
      fieldScores[field] = 0;
      disagreements.push({
        field,
        case: "E",
        primary: { value: pVal, confidence: pConf },
        secondary: { value: sVal, confidence: sConf },
      });
      // Preview stores the non-null value directly (per Case E spec), but we
      // still need candidates in the disagreement record for synthesis.
      continue;
    }

    // Case G — type mismatch (string vs object, array vs object, etc.).
    // Only matters when both are non-null (Case E handled null asymmetry).
    //
    // R1 G1: preview value MUST stay schema-compliant (v1.2 enforces
    // additionalProperties: false). Store `null` in the preview record and
    // move candidates/type_mismatch onto the disagreements sidecar — the
    // synthesis agent reads that path for arbitration context.
    if (pType !== sType) {
      committed[field] = null;
      fieldScores[field] = 0;
      disagreements.push({
        field,
        case: "G",
        type_mismatch: true,
        candidates: candidatesFor(primary, secondary, field),
        primary: { value: pVal, confidence: pConf },
        secondary: { value: sVal, confidence: sConf },
      });
      continue;
    }

    // From here, pType === sType and both non-null.

    // Case D — array disagreement (set-union). Union value IS schema-
    // compliant (array of strings vs array of strings, etc.), so the
    // preview carries the merged array directly; candidates for which
    // agent contributed what go on the disagreements sidecar.
    if (pType === "array") {
      if (deepEqual(pVal, sVal)) {
        // Array agreement falls through to the A/B scalar-agreement branch.
      } else {
        committed[field] = arrayUnion(pVal, sVal);
        fieldScores[field] = scoreField({
          primary: pConf,
          secondary: sConf,
          agree: false,
        });
        disagreements.push({
          field,
          case: "D",
          candidates: candidatesFor(primary, secondary, field),
          primary: { value: pVal, confidence: pConf },
          secondary: { value: sVal, confidence: sConf },
        });
        continue;
      }
    }

    // Agreement branch (Case A / B) — covers scalars AND deep-equal objects
    // AND deep-equal arrays (fallthrough from Case D above).
    if (deepEqual(pVal, sVal)) {
      committed[field] = pVal;
      fieldScores[field] = scoreField({
        primary: pConf,
        secondary: sConf,
        agree: true,
      });
      // A vs B distinction is driven by the combined score vs. threshold —
      // extractNeedsReview handles it uniformly.
      continue;
    }

    // Case C — scalar / object disagreement, both non-null, same type.
    // Store null in the preview (cannot arbitrate automatically; user
    // picks via conversational override or /label-audit). Candidates
    // preserved on the disagreements sidecar, not inside the record.
    committed[field] = null;
    fieldScores[field] = scoreField({
      primary: pConf,
      secondary: sConf,
      agree: false,
    });
    disagreements.push({
      field,
      case: "C",
      candidates: candidatesFor(primary, secondary, field),
      primary: { value: pVal, confidence: pConf },
      secondary: { value: sVal, confidence: sConf },
    });
  }

  // Build needs_review from combined scores + force-include every field that
  // produced a disagreement (Case C/D/E/G) + Case F (both null).
  //
  // extractNeedsReview handles the below-threshold sweep (Cases B/C/D/E/F/G
  // all score < 0.80, since disagreements score 0 and F scores 0). Case A
  // fields score min(pConf, sConf) which is ≥ 0.80 by the Case A trigger,
  // so they are correctly excluded.
  let needsReview = extractNeedsReview(fieldScores, DEFAULT_THRESHOLD);

  // Defensive merge — guarantees every disagreement field lands in the list
  // even if a future confidence change briefly pushes a disagreement's
  // fieldScore ≥ threshold. Set-union; stable order.
  const forced = disagreements.map((d) => d.field);
  // Also force-include Case F (both null) — fieldScore 0 already qualifies,
  // but keep the invariant explicit.
  for (const [field, score] of Object.entries(fieldScores)) {
    if (score === 0 && !forced.includes(field)) forced.push(field);
  }
  needsReview = mergeNeedsReview(needsReview, forced);

  const preview = {
    path,
    ...committed,
    needs_review: needsReview,
    confidence: fieldScores,
  };

  return {
    preview,
    needsReview,
    disagreements,
  };
}

/**
 * Apply crossCheck to a batch of [{ path, primary, secondary }] pairs,
 * sequentially. Errors on individual pairs are caught and surfaced as
 * unreachable records so one bad pair doesn't sink the batch.
 *
 * @param {Array<{path: string, primary: object|null, secondary: object|null}>} pairs
 * @returns {Array<object>}
 */
function crossCheckBatch(pairs) {
  if (!Array.isArray(pairs)) return [];
  const out = [];
  for (const pair of pairs) {
    const path = pair && pair.path ? pair.path : null;
    try {
      const result = crossCheck({
        primary: pair ? pair.primary : null,
        secondary: pair ? pair.secondary : null,
      });
      out.push({ path, ...result });
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error(`[label] crossCheckBatch: ${sanitize(err)}`);
      out.push({
        path,
        preview: null,
        needsReview: [],
        disagreements: [],
        unreachable: true,
      });
    }
  }
  return out;
}

module.exports = {
  crossCheck,
  crossCheckBatch,
};
