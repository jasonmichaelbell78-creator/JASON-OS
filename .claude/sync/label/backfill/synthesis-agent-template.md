# Synthesis Agent — Back-fill Summary

You receive the cross-check output from N primary/secondary pairs produced
by the back-fill orchestrator (PLAN §S8). Group findings by severity and
produce a user-facing preview summary.

Severity groups follow `.claude/skills/label-audit/reference/DISAGREEMENT_RESOLUTION.md`:

- **Case A** (both agree, confident) → silent success — not shown
- **Case B** (both agree, at least one under-confident) → low-severity
  `needs_review`
- **Case C / G** (scalar disagreement, type mismatch) → mid-severity
  disagreements — both candidates surfaced
- **Case D** (array disagreement) → mid-severity, set-union preview with
  per-source attribution
- **Case E** (one null XOR other value) → mid-severity gap
- **Case F** (both null) → coverage gap — listed separately

---

## Input

The orchestrator hands you the consolidated findings object below. It
already reflects field-by-field cross-check results per
`confidence.scoreField` + `confidence.extractNeedsReview`.

```json
{{FINDINGS_JSON}}
```

---

## Output contract

Emit a markdown report with these sections, in order:

### Agreement rate

One line of the form `Agreement rate: <pct>% across <N> records / <M> fields`.
Compute from the findings object's `agreement_rate` if present; otherwise
aggregate from per-record comparisons.

### Disagreement list (grouped by field)

For every field that was flagged as a disagreement across any record,
produce one subsection:

```
#### <field_name> — <count> records

- `<path>` — primary: `<value>` (conf <c1>), secondary: `<value>` (conf <c2>)
- ...
```

Group by `field_name` first so the user can triage by column rather than
by file. Include confidence scores so the user can see where the
cross-check was close vs. far apart.

### Novel composites

List any `composite_id` values that the agents proposed but that do not
yet exist in the composites catalog. One bullet per composite, with the
member files the agents grouped under it. Empty section is fine —
render as `_None detected._`

### Sections detected

List any file that the agents populated a non-empty `sections` array for
(rare — mixed-scope files only). Include the section count per file.
Empty section is fine — render as `_None detected._`

### Coverage gaps

List every record where **both** primary and secondary agents returned
`null` for a field that should have a value (Case F from
DISAGREEMENT_RESOLUTION.md). Grouped by field, same shape as the
disagreement list. These are NOT disagreements — they are derivation
gaps that need human attention before the record can promote.

---

## Approve / reject gate

End the report with the user-facing gate language verbatim:

> **Approve or reject?**
>
> - **Approve:** I will atomically rename the preview catalogs
>   (`.claude/sync/label/preview/shared.jsonl` + `preview/local.jsonl`)
>   into the real catalog paths. Records with non-empty `needs_review`
>   arrays will still block pre-commit per D3 until resolved
>   conversationally or via `/label-audit`.
>
> - **Reject:** Annotate any corrections inline and I will re-run the
>   back-fill with your corrections injected into the agent prompts
>   (D9a cycle). The preview catalogs are preserved; no real catalog
>   state is touched.

Do **not** auto-advance past this gate. Wait for an explicit user answer.
