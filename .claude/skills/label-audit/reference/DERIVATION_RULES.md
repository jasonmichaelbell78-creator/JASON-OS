# Derivation Rules — `/label-audit` agent fleet

This document is the prompt-input contract for **both** primary and
secondary derivation agents dispatched by `/label-audit` (§S7) and the
back-fill orchestrator (§S8). Agents MUST NOT see each other's output —
that independence is the whole point of the D8 cross-check.

**Canonical derivation instructions live in
`.claude/sync/label/backfill/agent-instructions-shared.md`** (v1.3,
Piece 3 structural-fix D5.2). This document previously duplicated that
body verbatim; since structural-fix Session 15 it points at the shared
partial so the schema contract has a single source of truth.

---

## How `/label-audit` dispatches

The audit skill uses the same two-agent primary/secondary protocol as
the back-fill orchestrator:

1. Load the shared instructions (`agent-instructions-shared.md`).
2. Wrap them in either `agent-primary-template.md` (primary role
   preamble) or `agent-secondary-template.md` (secondary role preamble).
3. Append the audit-specific batch of files to re-derive.
4. Spawn the two agents independently; collect outputs.
5. Run cross-check via `confidence.js` + `cross-check.js`.
6. Surface disagreements per `DISAGREEMENT_RESOLUTION.md`.

Audit-specific differences from back-fill:

- **Input set:** a user-selected subset (specific files, `--recent`,
  `--type <T>`, `--scope <S>`) instead of the full 429-file sweep.
- **Merge policy:** audit re-derivations respect existing
  `manual_override` arrays — fields in `manual_override` are NOT
  re-derived, matching D12a's conversational-override contract.
- **Failure posture:** audit failures are conversational (D7.6) rather
  than gating — drift / low-confidence / disagreement findings are
  surfaced for the user to resolve, not auto-applied.

---

## Schema v1.3 key rules (reminder)

Full authority: `agent-instructions-shared.md` +
`.claude/sync/schema/SCHEMA.md`. This is a skimmable reminder only.

- **Naming canon (D4.1):** `type: skill` → directory slug;
  `agent | team` and all others → basename without extension.
  Collisions surface at validate time — do NOT pre-disambiguate.
- **Lineage shape (D2.1):** `{source_project, source_path, source_version, ported_date}` —
  exactly these 4 keys, `additionalProperties: false`. Null for native
  files. Port-process details belong in `migration_metadata`, not
  lineage.
- **External-dep shape (D2.3):** every `required_secrets`, `tool_deps`,
  `external_services`, `mcp_dependencies` entry is `{name, hardness}`.
- **Hook vs hook-lib split (D2.5):** `type: hook` requires the 7 fields
  (event, matcher, if_condition, continue_on_error, exit_code_action,
  async_spawn, kill_switch_env). `type: hook-lib` requires NONE of
  them — omit them from hook-lib records (don't emit null).
- **New v1.3 types (D3.1, D4.5, D4.6):** `git-hook` (pairs with
  `git_hook_event` per D3.3), `test` (matches `**/__tests__/**` or
  `*.{test,spec}.*`).
- **Confidence is first-class (D2.2):** optional top-level object on
  every file record and composite record; keys are free-form, values
  must be in `[0, 1]`. Pre-v1.3 strip-before-validate is GONE — emit
  directly, no stripping.
- **Content-hash unknown (D2.4):** omit the field entirely. Do NOT
  emit `content_hash: null`.
- **Generated pairing (D3.2):** `{status: generated, portability: not-portable}`
  or `{status: generated, portability: portable-with-deps}`.
- **Schema version stamp (D3.4):** new records stamp
  `schema_version: "1.3"`; older `"1.2"` stamps still validate under
  v1.3 (additive only).

---

## Disagreement handling (pointer)

Cross-check outcomes map to 7 cases (A–G) in
`DISAGREEMENT_RESOLUTION.md`. The audit skill surfaces mid-severity
cases (C/D/E/G) conversationally per D7.6; low-severity cases (A/B/F)
go into the structured audit report without user interrupt.

---

## Hard constraints (same as agent-instructions-shared.md)

- No hallucinated paths — every path must exist on disk.
- No fabricated lineage — native files emit `lineage: null`.
- No guessed enum values — emit `confidence: 0.0` on the field and
  let cross-check flag it; escape-valve is `type: other`.
- No silent elisions — every REQUIRED field in §3 must be present. The
  optional `content_hash` field is an explicit exception: omit when
  unknown (never null).

---

## Version history

| Version | Date | Description |
|---|---|---|
| 0.1 | 2026-04-20 | Initial — duplicated primary/secondary template body verbatim for `/label-audit` dispatch. |
| 0.2 | 2026-04-22 | **Structural-fix Phase B (D5.2 + D5.4).** Rewritten as a thin pointer to `agent-instructions-shared.md` (single source of truth for derivation rules); added v1.3 key-rule skimmable reminder + audit-specific dispatch context. Eliminates the triplication (primary template + secondary template + this doc) that previously held the same body 3x. |
