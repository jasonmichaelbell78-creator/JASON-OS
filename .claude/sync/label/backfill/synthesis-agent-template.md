# Synthesis Agent — Back-fill Summary + Arbitration Proposal

You receive the cross-check output from N primary/secondary pairs produced
by the back-fill orchestrator. Your job is two things at once:

1. **A human-readable summary** that lets the user understand what's in the
   preview catalog (agreement rate, disagreements grouped by field,
   coverage gaps, novel composites).
2. **A structured arbitration proposal** the user can review and turn into
   a final arbitration package. That package — once user-approved — feeds
   `preview.applyArbitration()`, which rewrites the preview catalog
   in-place so it can clear the `verify.js` gate before promotion.

Without the arbitration step, the preview catalog cannot pass `verify.js`:
every record in a fresh G.1 run carries at least one `needs_review` entry
because the cross-check stage flags every field where the two agents
disagreed or where either agent emitted `null`. `verify.js` (commit-time
rule 2 in `validate-catalog.js`) rejects any record with a non-empty
`needs_review`. The synthesis stage is what closes that loop.

Severity groups follow `.claude/skills/label-audit/reference/DISAGREEMENT_RESOLUTION.md`:

- **Case A** (both agree, confident) → silent success — not surfaced
- **Case B** (both agree, at least one under-confident) → low-severity
  `needs_review` — propose auto-confirm of the agreed value
- **Case C / G** (scalar disagreement, type mismatch) → mid-severity
  disagreement — surface as an open arbitration question
- **Case D** (array disagreement) → mid-severity — propose a set-union
  auto-merge with per-source attribution; user can override
- **Case E** (one null XOR other value) → mid-severity gap — propose the
  non-null value with low-confidence flag; user confirms
- **Case F** (both null) → coverage gap — surface as an unresolved gap;
  do NOT propose a value

---

## Input

```json
{{FINDINGS_JSON}}
```

The findings object already reflects field-by-field cross-check results
per `confidence.scoreField` and `confidence.extractNeedsReview`.

---

## Output contract — Part 1: Markdown report

Emit a markdown report with these sections, in order. Use plain English
throughout — this is the user-facing summary, not an internal report.
JASON-OS conversational-explanatory tenet applies: explain the WHY
alongside the WHAT, give rationale per option, and lead with concepts
not codes.

### Agreement rate

One line of the form `Agreement rate: <pct>% across <N> records / <M> fields`.
Compute from the findings object's `agreement_rate` if present, otherwise
aggregate from per-record comparisons. Follow with one short sentence
explaining what that number means in practice (e.g., "high agreement on
structural fields like type and source_scope; low agreement on purpose
and notes wording — expected, since those are free-text").

### Auto-merge proposals (Case B + D + E)

For every field where the agents agreed in substance and a clear
mechanical merge is possible, propose an auto-merge. Group by case type
so the user can scan-and-batch-approve. One subsection per group:

```
#### Auto-confirm agreed values — <count> records, <field>
Both agents emitted the same value with at least one low-confidence flag.
Proposing to confirm with confidence 0.9 unless you override.

- `<path>` — value: `<value>`
```

```
#### Auto-merge array set-union — <count> records, <field>
Each agent proposed a partial array; union preserves both contributions.

- `<path>` — primary: `[a, b]`, secondary: `[b, c]`, merged: `[a, b, c]`
```

```
#### Auto-promote non-null sibling — <count> records, <field>
One agent emitted a value, the other null. Proposing the non-null value
with confidence 0.7 (since only one agent could derive it).

- `<path>` — value (from <primary|secondary>): `<value>`
```

### Open arbitration questions (Case C + G)

For every field where the two agents emitted conflicting non-null values,
surface as a question the user must answer. One subsection per field, then
one bullet per record:

```
#### <field> — <count> conflicts
<plain-English description of why this conflict matters and what each
option implies>

- `<path>`
  - Option 1 (primary, confidence <c1>): `<value>`
  - Option 2 (secondary, confidence <c2>): `<value>`
  - Recommendation: <plain-English rationale, including weakness of the
    recommended option>
```

### Coverage gaps (Case F)

Records where BOTH agents returned `null` for a field that should have
one. These are NOT disagreements — they are derivation gaps. Group by
field; do NOT propose values. The user decides whether to defer (gap
survives, blocks future commits on that record), assign manually, or
trigger a narrower re-run with sharpened prompts.

```
#### <field> — <count> records with no value
<one sentence on why these were ungettable — e.g., "agent context didn't
include enough of the file to infer purpose">

- `<path>`
```

### Novel composites

List any `composite_id` values the agents proposed that don't exist in
the composites catalog yet. One bullet per composite + member files.
Render `_None detected._` if empty.

### Sections detected

List any file the agents populated a non-empty `sections` array for
(rare — mixed-scope files only). Include section count per file. Render
`_None detected._` if empty.

---

## Output contract — Part 2: Structured arbitration proposal

After the markdown report, emit a single fenced JSON block tagged
`arbitration-proposal`. This is the machine-readable shape of everything
in the markdown report; downstream tooling (or the user's chat reply)
turns it into a final arbitration package the runtime can apply.

```arbitration-proposal
{
  "schema_version": "1.0",
  "auto_merge_proposals": [
    {
      "path": "<repo-relative path>",
      "field": "<field name>",
      "case": "B" | "D" | "E",
      "proposed_value": <any JSON value>,
      "proposed_confidence": <0.0–1.0>,
      "rationale": "<one-line plain-English why>"
    }
  ],
  "open_arbitration_questions": [
    {
      "path": "<repo-relative path>",
      "field": "<field name>",
      "case": "C" | "G",
      "options": [
        { "source": "primary",   "value": <any>, "confidence": <0.0–1.0> },
        { "source": "secondary", "value": <any>, "confidence": <0.0–1.0> }
      ],
      "recommendation": { "source": "primary" | "secondary", "rationale": "<plain-English>" }
    }
  ],
  "coverage_gaps": [
    { "path": "<repo-relative path>", "field": "<field name>" }
  ],
  "novel_composites": [
    { "composite_id": "<id>", "member_paths": ["<path>", "..."] }
  ]
}
```

---

## Final arbitration package shape (what the runtime actually applies)

The user's reply turns the proposal into a final package. The runtime
(`preview.applyArbitration`) accepts this shape:

```json
{
  "schema_version": "1.0",
  "decisions": [
    {
      "path": "<repo-relative path>",
      "field": "<field name>",
      "resolved_value": <any JSON value, including null>,
      "confidence": <0.0–1.0, optional, default 0.95>,
      "reason": "<optional plain-English provenance>",
      "source": "auto-merge" | "user-decision" | "agent-rerun"
    }
  ],
  "unresolved_coverage_gaps": [
    { "path": "<repo-relative path>", "field": "<field name>" }
  ]
}
```

Each decision sets `record[field] = resolved_value`, clears `field` from
`record.needs_review`, and stamps `record.confidence[field]` with the
given confidence (default 0.95 — high, because the source of truth is
now a human, not an agent). Records named in `unresolved_coverage_gaps`
are intentionally NOT touched; their `needs_review` entries survive,
which means `verify.js` will keep failing on them. That's the point: the
gate makes the unresolved set explicit, so the user has to address
them (or accept the failure) before promotion.

---

## Approve / reject gate

End the report with the user-facing gate language verbatim. Do NOT
auto-advance past this gate.

> **What I need from you, in this order:**
>
> 1. **Auto-merge proposals** — I have <N> proposals (Case B/D/E). Reply
>    "approve all auto-merges" to accept the batch, or call out specific
>    ones to override.
> 2. **Open arbitration questions** — there are <M> conflicts (Case C/G)
>    that need your call. You can answer in bulk per field
>    ("for type conflicts on `.research/.../findings/*.md`, use
>    `research-session`") or per record.
> 3. **Coverage gaps** — there are <P> fields that neither agent could
>    derive. For each, tell me: assign a value, defer (blocks future
>    commits on that record), or trigger a narrower re-run.
>
> Once you answer, I will assemble a final arbitration package, run
> `applyArbitration()` against the preview catalogs, then run
> `verify.js` as the hard gate. If verify is clean, we move to the
> `/label-audit` dogfood and your final approval before promote.
