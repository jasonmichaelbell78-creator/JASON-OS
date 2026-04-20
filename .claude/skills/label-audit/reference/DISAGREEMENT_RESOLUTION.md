# Disagreement Resolution — cross-check routing

How `/label-audit` (§S7) and the back-fill orchestrator (§S8) route
primary/secondary disagreements into `needs_review` vs. auto-accept.

---

## Field-level cross-check

For each file record, compare primary and secondary outputs **field by
field**. Each comparison falls into one of the cases below.

### Case A — Both agents agree on the value AND both confident

**Trigger:** `primary.value === secondary.value` AND `min(confidences) >= 0.80`.

**Action:**
- Commit the value to the preview record
- Combined confidence = `min(primary.confidence, secondary.confidence)`
  (cautious floor — implemented in `confidence.js:scoreField`)
- Field is NOT added to `needs_review`

### Case B — Both agents agree, BUT at least one is under-confident

**Trigger:** `primary.value === secondary.value` AND `min(confidences) < 0.80`.

**Action:**
- Commit the value to the preview record (agreement is a strong signal)
- BUT the field IS added to `needs_review` (per the
  `confidence.extractNeedsReview` contract)
- User arbitration in Phase 6 decides whether to confirm or override

### Case C — Agents disagree on a scalar value

**Trigger:** `primary.value !== secondary.value`, both values non-null, the
field is a simple scalar (type, status, source_scope, etc.).

**Action:**
- Preview stores BOTH candidates under a discriminated shape:
  ```json
  "type": {
    "value": null,
    "candidates": [
      {"source": "primary",   "value": "script-lib", "confidence": 0.92},
      {"source": "secondary", "value": "script",     "confidence": 0.88}
    ]
  }
  ```
- Field IS added to `needs_review`
- Per `confidence.scoreField({primary, secondary, agree: false})`, the
  combined score drops to **0.0** — disagreement forces review.
- Synthesis Phase 5 surfaces the disagreement in the summary.

### Case D — Agents disagree on an array field

**Trigger:** `primary.value` and `secondary.value` are arrays with distinct
contents.

**Action:**
- Use **set-union semantics** as the preview value — any dep either agent
  found is retained (false negatives on missing deps are worse than false
  positives on extra deps)
- Field is STILL added to `needs_review` so the user confirms the union
  is right
- Preview's `candidates` records which source contributed which elements

### Case E — One agent returns null / missing, the other returns a value

**Trigger:** `primary.value == null XOR secondary.value == null`.

**Action:**
- Treat as disagreement (Case C semantics)
- Preview value is the non-null candidate, but `needs_review` flags it
- The missing side's reasoning (if captured) is included in the
  disagreement record for user context

### Case F — Both agents return null / missing

**Trigger:** `primary.value == null && secondary.value == null` for a field
that should have a value.

**Action:**
- Preview stores `null`
- Field IS added to `needs_review` — likely an under-derived case
- The audit skill will surface this as a "gap" rather than a
  "disagreement" in the synthesis summary

### Case G — Type mismatch (e.g., one returns string, other returns object)

**Trigger:** `typeof primary.value !== typeof secondary.value`.

**Action:**
- Treat as hard failure (Case C but more severe)
- Preview stores BOTH candidates with a `type_mismatch: true` marker
- `needs_review` includes the field with a note
- Synthesis summary flags this prominently — it usually indicates one
  agent misunderstood the schema

---

## Record-level outcomes

After every field has been resolved:

- **Record clean** (`needs_review: []`) → `status: active`, ready to
  promote to the real catalog on user approval.
- **Record needs review** (`needs_review: [...]`) → `status: active`
  during preview. Preview records MUST NOT carry `status: partial` —
  per SKILL.md §Invariants L222, `partial` is reserved for the live
  PostToolUse transient async-fill window only; the `/label-audit`
  preview is a synthesis artifact, not a live transient. User arbitrates
  each field in `needs_review`; resolved fields get removed; when empty
  the record is promotable.
- **Record unreachable** (both agents threw / timed out / returned
  empty) → record is dropped from the preview and flagged as a failure
  for D15-path-1 surfacing.

---

## Manual-override interaction (D12a)

Fields present in an existing record's `manual_override` array are
**NOT re-derived** by either agent in the audit pass:

- The audit skill reads the existing catalog record before agent dispatch.
- For each file, it sends agents a version of the prompt that excludes
  `manual_override` field names from the derivation scope.
- After derivation, the overridden values are merged back into the
  preview record untouched.
- The user can explicitly revoke an override via conversational
  correction ("let it auto-derive `type` again") — at which point the
  audit skill removes the field from `manual_override` and re-derives on
  the next pass.

---

## Writing disagreement records to the preview

Preview records MAY carry `candidates` sub-objects as shown in Case C.
Once the user arbitrates, the `candidates` array is dropped and the
chosen value is inlined:

```json
"type": "script-lib"
```

Audit-trail of the arbitration lands in
`.claude/state/label-override-audit.jsonl` (atomic-append via
`safeAppendFileSync`):

```json
{
  "ts": "2026-04-20T18:12:34.056Z",
  "path": ".claude/sync/label/lib/derive.js",
  "field": "type",
  "chose": "script-lib",
  "dropped": ["script"],
  "user_message": "type on derive.js should be script-lib, not script",
  "claude_action": "updated record; added 'type' to manual_override"
}
```

---

## Cross-references

- `confidence.js` — `scoreField`, `extractNeedsReview`, `mergeNeedsReview`
- `CATALOG_SHAPE.md` §4.3 — `manual_override` invariants
- `CATALOG_SHAPE.md` §4.4 — `needs_review` invariants
- `DERIVATION_RULES.md` — what agents produce
- Plan §S8 — back-fill orchestrator Phase 5 cross-check
- Plan §S9 — conversational override docs
