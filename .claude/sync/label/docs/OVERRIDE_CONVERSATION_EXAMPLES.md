# Conversational Override — Examples & Runbook

Implements D12a: the catalog is Claude-editable via normal Edit/Write tools,
and conversational correction is the **primary** override mechanism. This
document tells a future Claude session how to recognize an override request,
execute it correctly, and leave a clean audit trail.

**Sibling docs:** `CATALOG_SHAPE.md` §4.3 (`manual_override`), §4.4
(`needs_review`), §4.5 (`last_hook_fire`). Plan §S8 back-fill orchestrator
(produces `needs_review` items); Plan §S9 this document.

---

## 1. Purpose

The label catalog lives in two JSONL files:
- `.claude/sync/label/shared.jsonl` — universal + user-scoped records
- `.claude/sync/label/local.jsonl` — project + machine + ephemeral records

Records are produced by automation (PostToolUse hook on write; back-fill
orchestrator on bulk runs) and corrected by humans via conversation with
Claude. There is **no separate override UI** — when a derived field is
wrong, the user tells Claude, and Claude applies the fix through ordinary
tool calls.

The user is the source of truth for overrides. Automation must never
silently re-derive a field the user has explicitly set (this is the whole
point of `manual_override`).

---

## 2. Recognition patterns

Treat any of these phrasings as an **override request**. Do not require
exact wording — match on intent.

| Pattern                                             | Example                                                             |
| --------------------------------------------------- | ------------------------------------------------------------------- |
| "For [path], [field] should be [value]"             | "For lib/derive.js, type should be script-lib"                      |
| "[path]'s [field] is wrong, it's [value]"           | "derive.js's type is wrong, it's script-lib not script"             |
| "Override [field] on [path] to [value]"             | "Override portability on lib/sanitize.js to portable"               |
| "Change [field] to [value] for [path]"              | "Change status to deprecated for old-hook.js"                       |
| "[path]: [field] = [value]"                         | "notify-desktop.js: type = script"                                  |

**Paths** may be given as repo-relative (`scripts/foo.js`), basename
(`foo.js`), or partial (`lib/derive`). When ambiguous, ask which record the
user means — do not guess across records.

**Values** may be bare (`script-lib`), quoted (`"script-lib"`), or
described (`it's a library, not a script`). Resolve description → enum
value yourself before writing. If no enum value fits, surface the mismatch;
do **not** invent one.

### Patterns that are NOT overrides

- Questions ("what's the type on derive.js?") → read-only; do not mutate.
- Observations without correction ("I notice type is script") → do not
  mutate; ask if the user wants to change it.
- Hook-produced `needs_review` acknowledgement ("I'll look at those
  later") → do not mutate.

---

## 3. Claude's action sequence

Execute **every** step. Skipping the audit row or the `manual_override`
update will cause the next hook sweep to re-derive the field and overwrite
the user's value.

### 3.1 Steps

1. **Locate the catalog file.** `source_scope` determines which JSONL:
   - `project` / `machine` / `ephemeral` → `local.jsonl`
   - `universal` / `user` → `shared.jsonl`
   - Unknown → read both; the record will be in exactly one.

2. **Read the current record** via `catalog-io.findRecord(catalogPath, path)`.
   If the record is missing, the override is invalid — tell the user and
   stop. Never create a brand-new record from an override alone; records
   are created by the hook or back-fill orchestrator.

3. **Update the specified field(s)** in memory.

4. **Append each overridden field name to `manual_override`** (idempotent —
   if already present, do not duplicate).

5. **Remove each overridden field from `needs_review`** (if present).

6. **Update `last_hook_fire`** to `new Date().toISOString()`. Conversational
   overrides count as a "hook fire" for freshness purposes — the record
   was just touched.

7. **Append an audit row** to `.claude/state/label-override-audit.jsonl`
   (format below).

8. **Atomic writeback** via `catalog-io.updateRecord(catalogPath, path,
   updater)`. Do not open the JSONL with Edit/Write — `updateRecord`
   handles the lock + atomic rename.

### 3.2 Audit row format

One JSON object per line:

```json
{
  "ts": "2026-04-20T18:12:34.056Z",
  "path": ".claude/sync/label/lib/derive.js",
  "fields_overridden": ["type"],
  "values": { "type": { "from": "script", "to": "script-lib" } },
  "user_message": "type on derive.js should be script-lib, not script",
  "claude_action": "updated record; added 'type' to manual_override; removed from needs_review"
}
```

- `ts` — UTC ISO-8601 (`new Date().toISOString()`).
- `path` — exact primary key from the catalog record.
- `fields_overridden` — array of field names touched in this override.
- `values` — per-field `{ from, to }` so an auditor can see what changed
  without diffing the catalog.
- `user_message` — the user's verbatim override utterance (one turn of
  chat). Never include other conversation turns.
- `claude_action` — one-line summary of what Claude did. Mirrors the
  commit-message style: imperative past tense, semicolon-separated when
  multiple actions occurred.

### 3.3 Acknowledgement

After writeback, confirm in one line:

> Updated type → script-lib for lib/derive.js. Added to manual_override,
> removed from needs_review, logged to override-audit.

Do **not** restate the audit row in chat. Do not ask for confirmation on
the next override in the same turn — each override runs its own full
sequence.

---

## 4. Worked examples

### 4.1 Single correction

> **User:** "type on .claude/sync/label/lib/derive.js should be script-lib, not script"

Claude reads `shared.jsonl`, finds the record, updates `type: "script-lib"`,
appends `"type"` to `manual_override`, removes `"type"` from `needs_review`,
updates `last_hook_fire`, appends the audit row, writes back. Replies:

> Updated type → script-lib for lib/derive.js. Added to manual_override,
> removed from needs_review, logged to override-audit.

### 4.2 Multiple corrections in one message

> **User:** "For notify-label.js, type should be script and portability
> should be sanitize-then-portable. Also purpose is wrong — it should say
> 'Fire OS toast when a label run needs attention.'"

Claude treats this as **three overrides on one record**. Read once, mutate
all three fields in memory, append all three field names to
`manual_override`, remove all three from `needs_review` if present, write
one audit row with `fields_overridden: ["type", "portability", "purpose"]`
and a combined `values` object, atomic-write once. Acknowledge:

> Updated type → script, portability → sanitize-then-portable, purpose
> for notify-label.js. All three added to manual_override; removed from
> needs_review (purpose was present); logged.

**Rule:** one writeback per record per message, even if the message
touches multiple fields. Multi-write under the same lock is wasteful and
increases race surface.

### 4.3 Corrections spanning multiple files

> **User:** "Fix these: hook-x.js type is script-lib, and hook-y.js type
> is also script-lib, and both of their portabilities are portable."

Claude treats this as **four overrides across two records**. Process
file-by-file: complete the full action sequence for hook-x.js (two
overrides, one writeback, one audit row), then for hook-y.js (two
overrides, one writeback, one audit row). Each file gets its own audit
row. Acknowledge once at the end:

> Updated type → script-lib and portability → portable for both hook-x.js
> and hook-y.js. 4 overrides added to manual_override across 2 records;
> 2 audit rows logged.

### 4.4 Revoking a prior override

> **User:** "Actually, let it auto-derive type on derive.js again."

Claude reads the record, **removes** `"type"` from `manual_override`, does
**not** modify the current `type` value (the user didn't say what it
should be — they said "let it re-derive"). The next hook fire will
re-derive `type` and may produce the same or different value; that's the
intent.

Audit row:

```json
{
  "ts": "…",
  "path": "…/derive.js",
  "fields_overridden": [],
  "values": {},
  "user_message": "Actually, let it auto-derive type on derive.js again.",
  "claude_action": "removed 'type' from manual_override; did not mutate value"
}
```

`fields_overridden: []` because no field value changed; only the override
flag was cleared. Acknowledge:

> Removed type from manual_override on derive.js. Next hook fire will
> re-derive it.

### 4.5 Ambiguous path

> **User:** "For sanitize.js, type should be script-lib."

There are (hypothetically) two files named `sanitize.js` — one under
`.claude/sync/label/lib/` and one under `scripts/lib/`. Claude stops and
asks:

> Two records match "sanitize.js": `.claude/sync/label/lib/sanitize.js`
> and `scripts/lib/sanitize-error.cjs`. Which one?

Do **not** guess. Do **not** apply the override to both. Wait for the
disambiguation, then run the full sequence on the chosen record only.

### 4.6 Non-existent path

> **User:** "For old-helper.js, type should be deleted."

If no record with that path exists in either catalog:

> No record found for old-helper.js in shared.jsonl or local.jsonl.
> Overrides can only modify existing records. If this file should be
> tracked, the PostToolUse hook will create a record on the next write to
> it.

Do **not** create a placeholder record. Do **not** add the override to a
queue. The hook is the record-creation path.

---

## 5. What Claude does NOT do

- **Re-derivation guarding is the hook's job, not Claude's.** Once a field
  is in `manual_override`, the hook skips it. Claude does not need to
  monitor this or add defensive checks.
- **Never edit a catalog JSONL directly with Write/Edit.** Always route
  through `catalog-io.updateRecord`. Raw JSONL edits bypass the lock and
  risk race corruption.
- **Never skip the audit trail.** No exceptions for "minor" overrides,
  quick fixes, or "just a one-liner". The audit row is the record that
  `manual_override` was user-sourced, not hook-sourced.
- **Never acknowledge still-pending `needs_review` items without action.**
  If the user mentions a `needs_review` field without providing the
  correct value, ask what value they want; do not remove it from
  `needs_review` until a value is set (and logged).
- **Never bulk-override without reading records.** Even when the user
  gives many corrections, read each affected record before mutating —
  blind writes to a stale record can clobber a concurrent hook update.
- **Never invent enum values.** If the user's intended value doesn't
  match the schema enum (per `.claude/sync/schema/SCHEMA.md` §9 +
  `enums.json`), stop and surface the mismatch. The escape hatch is
  `type: other` per EVOLUTION.md §7 — do not silently coerce.

---

## 6. Cross-references

- `CATALOG_SHAPE.md` §4.3 — `manual_override` invariants
- `CATALOG_SHAPE.md` §4.4 — `needs_review` invariants
- `CATALOG_SHAPE.md` §4.5 — `last_hook_fire` semantics
- `.claude/skills/label-audit/SKILL.md` Phase 6 — conversational
  resolution during an audit run
- `.claude/skills/label-audit/reference/DISAGREEMENT_RESOLUTION.md`
  §Manual-override interaction — how `/label-audit` agents treat
  overrides
- `.claude/sync/label/lib/catalog-io.js` — `updateRecord` is the atomic
  write API
- `.claude/state/label-override-audit.jsonl` — the append-only audit log
- Plan §S8 back-fill orchestrator — produces the `needs_review` items
  that overrides resolve
- Plan §S9 — this document
