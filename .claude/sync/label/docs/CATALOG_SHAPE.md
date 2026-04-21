# CATALOG_SHAPE.md — Records Piece 3 Writes

**Piece:** 3 — Labeling Mechanism
**Status:** ACTIVE (S1 scaffolding)
**Last Updated:** 2026-04-20 (Session #10)
**Plan:** `.planning/piece-3-labeling-mechanism/PLAN.md` §S1
**Decisions:** `.planning/piece-3-labeling-mechanism/DECISIONS.md`
**Upstream schema:** `.claude/sync/schema/SCHEMA.md` (Piece 2)

---

## §1 Purpose

This document is the contract between Piece 3 (hooks + pre-commit + audit
skill + back-fill orchestrator) and Piece 4 (registry / storage). It
specifies the shape of every record the Piece 3 machinery writes into the
JSONL catalogs — including the Piece 3 augmentations on top of the Piece 2
schema.

Piece 3 does **not** own the record schema — Piece 2 does. Piece 3 adds a
small number of machinery-level fields that track the derivation pipeline
state (async fills, manual overrides, low-confidence flags, hook firing
history, schema version). Those fields are the focus here.

Piece 4 will later decide final catalog paths and file format. Piece 3
assumes JSONL at the paths listed in §5; `catalog-io.js` (Plan §S2) is the
single point of change when Piece 4 moves things.

---

## §2 Primary Key

**`path`** — repo-root-relative path to the file.

Invariants:

- Unique within a given catalog file (one record per file per catalog).
- Stable across sync — the same `path` in JASON-OS and SoNash refers to the
  same logical file when both repos carry it (follows Piece 2's mirror
  contract).
- Forward slashes always. Writers normalize `\` → `/` on ingest.

All Piece 3 reads/writes go through `catalog-io.js` and use `path` as the
lookup key.

---

## §3 Record Fields — Inheritance from Piece 2

Every record Piece 3 writes carries:

1. **All 26 universal file-level columns** from Piece 2 `SCHEMA.md` §3:
   - §3.1 Identity: `name`, `path`, `type`, `purpose`
   - §3.2 Scope / sync-action: `source_scope`, `runtime_scope`,
     `portability`, `status` (but see §4.1 below — Piece 3 extends the
     `status` enum)
   - §3.3 What the file needs: `dependencies`, `external_services`,
     `tool_deps`, `mcp_dependencies`, `required_secrets`
   - §3.4 Provenance: `lineage`, `supersedes`, `superseded_by`
   - §3.5 Sync mechanics: `sanitize_fields`, `state_files`
   - §3.6 Catch-all + coupling: `notes`, `data_contracts`
   - §3.7 Relationships: `component_units`, `composite_id`
   - §3.8 Copy detection: `is_copy_of`, `has_copies_at`, `content_hash`
   - §3.9 Content granularity: `sections`

2. **Per-type extensions** from Piece 2 `SCHEMA.md` §9 (NOT §10 —
   §10 is evolution rules). The per-type extension set applied depends on
   `type`:
   - `skill` → §9.1
   - `agent | team` → §9.2
   - `hook | hook-lib` → §9.3
   - `memory | canonical-memory` → §9.4
   - `script | script-lib` → §9.5
   - `tool | tool-file` → §9.6
   - `research-session` → §9.7
   - `plan | planning-artifact` → §9.8
   - `ci-workflow` → §9.9
   - Composite records → §9.10 (in the composites catalogs, not file
     catalogs)

3. **Optional `migration_metadata`** sub-object per Piece 2 `SCHEMA.md` §6 —
   `null` for native (non-ported) files.

Piece 3's derivation library (Plan §S2 `derive.js`) produces these fields
per the logic in each subsection. The audit skill (Plan §S7) re-runs
derivation on demand to detect drift.

---

## §4 Piece 3 Additions

Six machinery-level fields that every record carries on top of the Piece 2
universals. All writes through `catalog-io.js`.

### §4.1 `status` — enum extension

Piece 2's `status` enum has 8 values: `active`, `complete`, `deferred`,
`stub`, `gated`, `deprecated`, `archived`, `generated` (SCHEMA.md §8.4).

Piece 3 adds **one** new value: **`partial`** — a transient state meaning
"the sync partial record has been written, but the async understanding-field
fill is still pending." Used by the PostToolUse write hook (Plan §S3) for
the ~milliseconds-to-seconds window before the async agent returns.

`stub` is already in the Piece 2 enum — no action needed for that value.

**Schema-bump status (2026-04-20):** ✓ **LANDED.** Schema v1.0 → v1.1 →
v1.2. v1.1 added the `partial` status enum; v1.2 added the 5 Piece 3
machinery fields (`pending_agent_fill`, `manual_override`, `needs_review`,
`last_hook_fire`, `schema_version`) as typed optional columns on both
`file_record` and `composite_record`, replacing the earlier
`relaxFileRecordAdditionalProperties` patch. Every record Piece 3 writes
should stamp `schema_version: "1.2"`. The in-memory `extendStatusEnum`
fallback in `validate-catalog.js` is retained as belt-and-suspenders so
older schema files still validate cleanly during cross-repo sync windows.

Per Piece 2 `EVOLUTION.md` §8 (mirror rule): SoNash must receive both the
v1.1 (status:partial) and v1.2 (machinery fields) bumps when Piece 2 is
ported there (Piece 5.5 and onward). Tracked in `/todo` backlog (T26 +
T27 mirror).

**Invariant:** `status: partial` records are **rejected at commit time** by
the pre-commit validator (Plan §S6, D3). They are valid in the live catalog
between derivation and async completion, but must never appear in a commit.

### §4.2 `pending_agent_fill` — boolean

`true` iff an async derivation agent is still running for this record.
Cleared to `false` when the agent returns (success or failure).

Writers:

- Set `true` by the PostToolUse hook (Plan §S3) when it spawns an async job
- Set `false` by the same hook's Step 0 sweep when it sees the job finished
- Also cleared by the audit skill (Plan §S7) if a manual re-derivation
  settles the record

**Invariant:** `status: partial` ⇒ `pending_agent_fill: true`. The pre-commit
validator enforces this via `status: partial` rejection alone.

### §4.3 `manual_override` — array of strings

List of field names the user explicitly set via conversational override (D12a
+ Plan §S9). Example: `["type", "portability"]` means the user told Claude
these two fields have specific values that should not be re-derived.

**Consumer:** the PostToolUse hook MUST skip fields listed here when
re-deriving. The derivation library reads `manual_override` before running
each field's derivation step.

**Revocation:** user can say "let it auto-derive again" — Claude removes the
field name from `manual_override` per Plan §S9 "Edge cases" section.

**Default:** empty array `[]`.

**Audit trail:** every `manual_override` mutation is logged to
`.claude/state/label-override-audit.jsonl` (Plan §S9).

### §4.4 `needs_review` — array of strings

List of field names whose derivation produced low confidence or unresolved
cross-check disagreement (D3, D8 + Plan §S8). Example: `["type", "purpose"]`
means confidence on those two fields fell below threshold (default 0.80) or
the primary/secondary back-fill agents disagreed.

**Invariant:** `needs_review` is **non-empty ⇒ pre-commit validator blocks
the commit** (D3 + Plan §S6). The user must either:

1. Manually resolve via conversational override (sets `manual_override`
   and clears the corresponding entry from `needs_review`)
2. Re-run `/label-audit` on the file and accept the new derivation
3. Skip with `SKIP_CHECKS=labels SKIP_REASON="..."` (intentional, logged)

**Default:** empty array `[]`.

### §4.5 `last_hook_fire` — ISO 8601 timestamp string

Most recent timestamp at which any hook touched this record. Used by
fingerprint-triggered re-check logic (D6 path 2, Plan §S3) and by the audit
skill's `--recent` filter (Plan §S7 invocation pattern).

Format: `YYYY-MM-DDTHH:mm:ss.sssZ` (UTC, millisecond precision).

### §4.6 `schema_version` — string

Semver-compatible version of the schema this record conforms to. Examples:
`"1.0"`, `"1.1"`.

**Why per-record:** D16 migration strategy (eager atomic schema migration)
uses this field to determine whether a record needs an upgrade pass. When a
new schema version ships, the migration tool reads `schema_version` on each
record, applies the delta, and writes the new value.

**Writer contract:** every writer (hooks, back-fill, audit skill) stamps
`schema_version` to the current schema version at write time. Never back-dated.

---

## §5 Catalog Files (per D14)

Piece 3 writes four JSONL files under `.claude/sync/label/`:

| File | Scope | Contents |
| --- | --- | --- |
| `shared.jsonl` | Mirrored identically across JASON-OS and SoNash | File records with `source_scope ∈ {universal, user}` (per repo's mirror policy). One record per line. |
| `local.jsonl` | Per-repo, never mirrored | File records with `source_scope ∈ {project, machine, ephemeral}`. One record per line. |
| `composites-shared.jsonl` | Mirrored | Composite records whose every component is in `shared.jsonl`. |
| `composites-local.jsonl` | Per-repo | Composite records with any component in `local.jsonl`. |

**Preview artifacts (Plan §S8):** back-fill orchestration writes to
`.claude/sync/label/preview/shared.jsonl` + `preview/local.jsonl` and flips
atomically to the real paths only after user approval (D9c).

**Atomicity guarantee:** `catalog-io.js` (Plan §S2) writes via temp-file +
rename — crash-safe; partial writes never land on disk.

---

## §6 Piece 4 Interface

> **Piece 4 owns final catalog path + format decisions.** The JSONL layout
> and paths documented in §5 are Piece 3's interim assumption, not a
> commitment binding on Piece 4.

If Piece 4 moves the catalog to TOML, SQLite, a different directory, or
merges shared/local into a single file with a scope column:

- **Single point of change:** `.claude/sync/label/lib/catalog-io.js` (Plan
  §S2). All Piece 3 reads and writes go through this layer.
- **No downstream change required** in hooks, pre-commit validator, audit
  skill, or back-fill orchestrator — they all call
  `readCatalog(path) → records[]` and `writeCatalog(path, records) → void`.
- **Record shape is invariant across storage formats.** The 26 universal
  columns + 6 Piece 3 additions + per-type extensions are the contract;
  how they serialize is Piece 4's call.

**Piece 4 MAY renegotiate:**

- Catalog path and filename (moves from `.claude/sync/label/` to anywhere)
- Storage format (JSONL → TOML, SQLite, Parquet, etc.)
- Shared/local split (could become a single table with a scope discriminator)
- Composite catalog split (could merge into file catalog with a record-type
  discriminator)

**Piece 4 MUST NOT renegotiate without a schema bump:**

- The 26 universal columns (Piece 2 owns)
- The 6 Piece 3 additions documented in §4 (Piece 3 owns; major bump to
  remove any of them)
- The `path`-as-primary-key invariant (§2)

---

## §7 Example Record (JSONL line)

Minimal illustrative record — Piece 3 fields highlighted. Real records carry
all 26 universal columns plus any per-type extensions per Piece 2 §9.

```json
{
  "name": "derive",
  "path": ".claude/sync/label/lib/derive.js",
  "type": "script-lib",
  "purpose": "Entry point for cheap + understanding-field derivation.",
  "source_scope": "universal",
  "runtime_scope": "project",
  "portability": "portable",
  "status": "active",
  "dependencies": [],
  "external_services": [],
  "tool_deps": [{"name": "node", "hardness": "hard"}],
  "mcp_dependencies": [],
  "required_secrets": [],
  "lineage": null,
  "supersedes": [],
  "superseded_by": null,
  "sanitize_fields": [],
  "state_files": [],
  "notes": "",
  "data_contracts": [],
  "component_units": [],
  "composite_id": null,
  "is_copy_of": null,
  "has_copies_at": [],
  "content_hash": "sha256:abc123...",
  "sections": [],
  "entry_point": false,
  "shells_out": true,
  "test_coverage": false,
  "module_system": "cjs",
  "pending_agent_fill": false,
  "manual_override": [],
  "needs_review": [],
  "last_hook_fire": "2026-04-20T15:42:18.123Z",
  "schema_version": "1.2"
}
```

---

## §8 Cross-References

- **Piece 2 schema authority:** `.claude/sync/schema/SCHEMA.md`
- **Piece 2 enums (machine):** `.claude/sync/schema/enums.json`
- **Piece 2 validation schema:** `.claude/sync/schema/schema-v1.json`
- **Piece 2 evolution rules:** `.claude/sync/schema/EVOLUTION.md`
- **Piece 2 worked examples:** `.claude/sync/schema/EXAMPLES.md`
- **Piece 3 plan:** `.planning/piece-3-labeling-mechanism/PLAN.md`
- **Piece 3 decisions:** `.planning/piece-3-labeling-mechanism/DECISIONS.md`

---

## §9 Version History

| Version | Date | Description |
| --- | --- | --- |
| 0.1 | 2026-04-20 | Initial draft — S1. Piece 3 additions documented; schema-v1.0 → v1.1 enum bump flagged for S2 landing. |
| 0.2 | 2026-04-20 | Schema v1.0 → v1.1 bump landed (added `status: partial`) across enums.json + schema-v1.json + SCHEMA.md. §4.1 updated to reflect landed state + SoNash mirror obligation. |
