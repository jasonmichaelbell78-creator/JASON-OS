# Findings: D1 — Minimum Viable Ledger Record Shape

**Searcher:** deep-research-searcher (A1)
**Profile:** web + docs (codebase-primary, outside-survey for shape inspiration)
**Date:** 2026-04-23
**Sub-Question IDs:** A1 (three sub-parts)

> **Orchestrator note:** This file was captured via the Windows 0-byte
> agent-output fallback (Critical Rule 4) — the agent returned full
> structured content but did not write to disk. Content below is the
> agent's verbatim return.

---

## Sub-question

What is the minimum viable ledger record shape for the lineage ledger that
serves all four movement verbs (port, sync-back, extract, context-sync)?
Three sub-parts: (1) field set with hard cap ≤12 fields; (2) movement =
single record vs append-only event log; (3) schema-versioning of the ledger
itself.

---

## Approach

Read the four authoritative codebase files first: `BRAINSTORM.md`,
`PHASE_0_LANDSCAPE.md`, `SCHEMA.md`, `enums.json`, `schema-v1.json`, and
`EVOLUTION.md`. These gave the existing scope-tag enum, schema-versioning
rules, and the existing four-field lineage object that JASON-OS already
uses inside the Piece 2 schema.

For outside survey, fetched: git-subrepo's `.gitrepo` field set (from
source), Nix derivation `.drv` format (from official Nix reference manual),
Nx project.json dependency tracking (official docs), vcpkg manifest
versioning fields (Microsoft Learn), and Yocto recipe metadata fields
(official docs). Turborepo's internal cache-descriptor shape is not
publicly documented at field level — confirmed after three search
reformulations.

All external survey was for shape inspiration only. Source authority:
codebase files are HIGH (ground truth). Fetched official docs are HIGH.
Web search summaries are MEDIUM.

---

## Sub-Part 1 — Field Set

### Maximum candidate set (before pruning)

Working from what all four verbs actually need at runtime, the maximum
candidate field set is:

1. `record_id` — unique stable identifier for this ledger entry (UUID or slug)
2. `verb` — which movement operation this record represents (port, sync-back, extract, context-sync)
3. `source_project` — originating repo name
4. `source_path` — repo-root-relative path of the thing that was moved, at time of movement
5. `dest_project` — destination repo name
6. `dest_path` — repo-root-relative path in the destination after movement
7. `source_version` — version/commit reference of the source at time of movement
8. `moved_at` — ISO-8601 timestamp of the movement event
9. `unit_type` — what kind of thing was moved (file, family/composite, memory, context-artifact, etc.)
10. `scope_tag` — from the existing enum (universal/user/project/machine/ephemeral); the scope at which this item travels
11. `verdict` — what transformation happened (copy-as-is, sanitize, reshape, rewrite, greenfield-clone, skip, etc.)
12. `ledger_schema_version` — which ledger schema version this record was written under
13. `parent_record_id` — for sync-back: points to the original port record this is reconciling against
14. `status` — lifecycle state of this movement record (active, superseded, abandoned)
15. `notes` — free-text catch-all for verb-specific details that don't fit the structured fields

15 candidates. Cap is 12. Three must fall.

### Aggressive pruning

**`parent_record_id`** (field 13) — exclusively a `/sync-back` concern.
Zero of the other three verbs use it. In an append-only log, ordering
already provides the temporal link. Rejected.

**`status`** (field 14) — in an append-only log records are never mutated;
"current state" is implicit in the event sequence (a later `sync-back`
record supersedes an earlier `port` record for the same source-path/
dest-path pair). Rejected.

**`notes`** (field 15) — free-text catch-all is the lesson from Piece 2's
G.1 collapse: agents that can't answer set it to `null` universally;
becomes a landing pad for information that should have been structured or
not stored. Rejected.

### The 12-field minimum

**Identity (2 fields)**
- `record_id`: string — UUID or slug. Universal scope. Every verb uses it for reference + dedup.
- `verb`: string (enum: port, sync-back, extract, context-sync) — Universal scope. Every companion writes a record tagged with its own verb; orchestrator routes dashboard queries on it.

**Source and destination (4 fields)**
- `source_project`: string — Project scope.
- `source_path`: string — Project scope. Repo-root-relative path of the thing at time of movement.
- `dest_project`: string — Project scope.
- `dest_path`: string — Project scope. Repo-root-relative path after movement. For extract (read-only), the local distillation landing path.

**Version anchor (1 field)**
- `source_version`: string — Project scope. Commit SHA or version tag for the source at time of movement. The anchor `/sync-back` uses for three-way diff.

**Timestamp (1 field)**
- `moved_at`: string (ISO-8601) — Written once, never updated. Primary sort key in append-only log.

**Classification (2 fields)**
- `unit_type`: string (enum: file, family, memory, context-artifact, concept) — Universal scope.
- `scope_tag`: string (enum: universal/user/project/machine/ephemeral — existing) — Universal scope. Context-sync uses it to decide whether to cross locale boundaries.

**Transformation record (1 field)**
- `verdict`: string (enum: copy-as-is, sanitize, reshape, rewrite, greenfield-clone, skip, blocked, observe-only) — Universal scope. Future ports of the same unit type to the same target can use this as a fast-path signal.

**Schema self-description (1 field)**
- `ledger_schema_version`: string — Universal scope. Per-record stamp matching the existing JASON-OS file-record schema-versioning approach.

**Total: 12 fields exactly. Cap met.**

---

## Sub-Part 2 — Single Record vs Append-Only Event Log

**Recommendation: append-only event log. Not a hybrid.**

A mutable single-record design destroys history needed by `/sync-back`
(three-way diff requires the original port record intact). Append-only
preserves full movement history, eliminates a class of race conditions
(a partially-complete update can't corrupt the current-state view), and
makes "current state" derivable as `most-recent record per
(source_project, source_path, dest_project) triple`.

**Storage growth:** for a personal two-repo setup at 12 fields per record
in JSONL, hundreds of movements over years stays well under 1 MB.

**The `parent_record_id` concern resolved:** in an append-only log,
`/sync-back` queries the log for the most recent `verb: port` record
matching the unit's identity tuple and reads `source_version` from that
record. Ordering provides the link without a dedicated field.

**git-subrepo (negative example):** stores one mutable block per subrepo;
cannot answer "what did this subrepo look like three syncs ago?"

**Nix derivation (positive example):** each `.drv` is permanent immutable;
lineage built by following the `inputDrvs` chain. We want this immutability
property without the content-addressing complexity.

---

## Sub-Part 3 — Schema-Versioning of the Ledger Itself

**Recommendation: mirror the existing JASON-OS schema-versioning approach
with one simplification.**

The existing approach (per `EVOLUTION.md`):
- Each record carries its own `schema_version` stamp
- Optional field with default = minor non-breaking bump
- Required field or removed/renamed field = breaking major bump with migration plan
- Schema document, enum file, and validation spec kept in sync as external meta
- "Prefer additive alternatives" principle (§6) governs

The ledger should mirror this exactly. The `ledger_schema_version` field
in every record provides the per-record stamp. Ledger schema spec lives as
external meta at e.g. `.claude/state/ledger-schema.md` + optional
`ledger-schema-v1.json`, NOT as a ledger record.

**One simplification:** the file-catalog has 26 universal + 41 per-type
extension fields and is expensive to evolve. The ledger has 12 flat
fields and no per-type extensions, so the minor/major rule is simpler:
addition with a default = minor; addition that requires re-reading
existing records to fill = major.

**What diverges from the file-catalog approach:** the file catalog is
mirrored identically to SoNash (EVOLUTION.md §8 mirror rule). The lineage
ledger is NOT mirrored — it tracks movements between repos and lives in
one canonical location. The mirror obligation does not apply to the
ledger schema.

---

## Proposed Minimum Field Set

| Field | Type | Scope-tag | Which verb needs it | Confidence |
|---|---|---|---|---|
| `record_id` | string (UUID or slug) | universal | all four | HIGH |
| `verb` | string (enum) | universal | all four | HIGH |
| `source_project` | string | project | all four | HIGH |
| `source_path` | string | project | all four | HIGH |
| `dest_project` | string | project | port, sync-back, context-sync, extract | HIGH |
| `dest_path` | string | project | port, sync-back, context-sync, extract | HIGH |
| `source_version` | string | project | port (writes), sync-back (reads) | HIGH |
| `moved_at` | string (ISO-8601) | ephemeral at write | all four | HIGH |
| `unit_type` | string (enum) | universal | orchestrator, port, sync-back | MEDIUM |
| `scope_tag` | string (enum existing) | universal | context-sync, port | HIGH |
| `verdict` | string (enum) | universal | port, sync-back, context-sync | MEDIUM |
| `ledger_schema_version` | string | universal | all four (meta) | HIGH |

---

## Fields Considered and Rejected

| Field | Why rejected |
|---|---|
| `parent_record_id` | Sync-back-only. Append-ordering + identity tuple provides the back-reference without a dedicated field. |
| `status` | Redundant with event ordering in append-only log. Mutable status in an immutable log is a contradiction. |
| `notes` | Free-text catch-all gets null-filled by agents (G.1 lesson). Verb-specific details belong in-session, not the persistent ledger. |
| `dest_version` | Derivable by dashboard at query time via git history. Stored value drifts immediately. |
| `sanitize_fields` | Per-port detail belongs in the port companion's transcript, not the thin ledger. Grows unboundedly. |
| `dropped_in_port` / `stripped_in_port` | Migration-phase detail; goes stale, becomes misleading. |
| `purpose` | One-sentence description derivable from the unit itself; storing means it drifts. |
| `content_hash` | Persistence/locking concern that A3 should address rather than baking into the universal record. Add later as minor bump if needed. |

---

## Outside Prior Art Survey

**git-subrepo `.gitrepo`** — fields: `remote`, `commit`, `branch`,
`parent`, `method`, `version`. Inherit naively: mutable single-record
design that loses history. Do NOT inherit: the mutable update pattern.

**Nx project.json** — fields: `implicitDependencies`, `dependsOn`, `tags`.
Inherit naively: graph-edge design good for dependency tracking but no
timestamp/version-anchor/transformation record. Do NOT inherit: treating
the ledger as a static graph snapshot.

**Nix derivation `.drv`** — fields: `inputDrvs`, `inputSrcs`, `outputs`,
`name`, `system`, `builder`, `env`. Inherit naively: content-addressable
immutability + DAG of derivations — powerful but requires content store
JASON-OS doesn't have. Do NOT inherit: content-addressing architecture.

**vcpkg manifest** — fields: `builtin-baseline`, `version`/`version-semver`
/`version-date`, `version>=` constraints. Inherit: a single commit SHA as
baseline is stronger than free-form version string. Do NOT inherit:
constraint-resolution semantics.

**Yocto recipe** — fields: `SRC_URI`, `SRCREV`, `SRC_URI[sha256sum]`.
Inherit: `SRCREV` (= `source_version`) is load-bearing for reproducibility,
must be captured at fetch time. Do NOT inherit: two-phase recipe/build
separation.

---

## Claims

1. **The 12-field minimum is sufficient for all four verbs.** [HIGH] All 12 fields walked against each verb's runtime needs. Source: codebase analysis of BRAINSTORM.md + this document.
2. **Append-only event log is the correct model.** [HIGH] `/sync-back`'s three-way diff demands the original port record be preserved intact. Source: BRAINSTORM.md sync-back description, git-subrepo (negative), Nix .drv (positive).
3. **`parent_record_id` is unnecessary in an append-only log.** [HIGH] Temporal ordering + identity tuple provides the back-reference. Derived from claim 2.
4. **The existing JASON-OS scope-tag enum applies without modification.** [HIGH] enums.json:39-47, validated across five systems per PHASE_0_LANDSCAPE.md.
5. **The existing JASON-OS schema-versioning approach should be mirrored for the ledger.** [HIGH] Documented in EVOLUTION.md, applied successfully through three schema versions (v1.0 → v1.3).
6. **The mirror rule from EVOLUTION.md §8 does NOT apply to the ledger.** [MEDIUM] File catalog is mirrored across repos; ledger lives in one canonical location. Confidence MEDIUM because A3 owns the canonical location decision.
7. **`source_version` should be free-form string, not enforced semver.** [MEDIUM] Existing `lineage.source_version` in schema-v1.json is free-form; some units (CLAUDE.md sections, tenets, memories) lack a clean commit SHA.
8. **The `unit_type` and `verdict` field enum values need a planning decision before lock.** [MEDIUM] Migration-v2 unit types + verdict legend are documented as survivors but context-sync adds `context-artifact` and extract adds `observe-only`. Exact enum values not fully locked here.

---

## Sources

| # | URL / Path | Title | Type | Trust | Date |
|---|---|---|---|---|---|
| 1 | `.research/cross-repo-movement-reframe/BRAINSTORM.md` | BRAINSTORM | Codebase (authoritative) | HIGH | 2026-04-23 |
| 2 | `.research/cross-repo-movement-reframe/PHASE_0_LANDSCAPE.md` | Phase 0 Landscape | Codebase (authoritative) | HIGH | 2026-04-23 |
| 3 | `.claude/sync/schema/SCHEMA.md` | Sync-Mechanism Registry Schema v1.3 | Codebase (authoritative) | HIGH | 2026-04-22 |
| 4 | `.claude/sync/schema/enums.json` | enums.json v1.3 | Codebase (authoritative) | HIGH | 2026-04-22 |
| 5 | `.claude/sync/schema/schema-v1.json` | schema-v1.json validation spec | Codebase (authoritative) | HIGH | 2026-04-22 |
| 6 | `.claude/sync/schema/EVOLUTION.md` | Schema Evolution Rules v1.0 | Codebase (authoritative) | HIGH | 2026-04-22 |
| 7 | https://github.com/ingydotnet/git-subrepo/blob/master/lib/git-subrepo | git-subrepo source (`.gitrepo` field set) | Official source | HIGH | fetched 2026-04-23 |
| 8 | https://nix.dev/manual/nix/2.18/command-ref/new-cli/nix3-derivation-show | Nix Reference Manual — derivation show | Official docs | HIGH | 2026-04-23 |
| 9 | https://nx.dev/docs/reference/project-configuration | Nx Project Configuration Reference | Official docs | HIGH | 2026-04-23 |
| 10 | https://learn.microsoft.com/en-us/vcpkg/users/versioning | vcpkg Versioning Reference | Official docs (Microsoft) | HIGH | 2026-04-23 |
| 11 | https://docs.yoctoproject.org/dev-manual/new-recipe.html | Yocto Project Dev Manual — Writing a New Recipe | Official docs | HIGH | 2026-04-23 |
| 12 | https://github.com/NixOS/nix/pull/11749 | Store path provenance tracking PR #11749 | Official GitHub PR | HIGH | 2026-04-23 |

---

## Gaps and Uncertainties

1. **Turborepo cache-descriptor internal field shape** — not publicly documented at field level. Doesn't affect the ledger schema since Turborepo's hash-keyed model isn't analogous to a cross-repo movement ledger.
2. **`unit_type` enum final values** — synthesis from BRAINSTORM survivors + four-verb architecture. Exact enum not locked; planning should confirm whether `memory`, `config`, `keybindings` should be separate unit types vs collapsed into `context-artifact`.
3. **`verdict` enum for context-sync** — `copy-as-is` may be misleading if scope-tag filtering is always applied. Consider `scope-filtered-copy` as alternative.
4. **Whether `/context-sync` needs the ledger at all** — A4's domain. If A4 says no, `verb: context-sync` records may be unused for that companion.
5. **Canonical ledger location and locking** — A3's domain.
6. **Cross-machine scope-tag handling** — `machine` scope-tag means a machine-scoped record shouldn't be acted on from a different machine. Mechanism for detecting "same machine" from a JSONL record not specified. Could add `machine_id` (would push to 13 fields). Worth surfacing to planning.

---

## Serendipity

EVOLUTION.md's "prefer additive alternatives" tenet (§6) maps directly
onto the ledger versioning problem — it names the exact failure mode
(dual-schema read windows) that a naively-versioned ledger would have
to solve.
