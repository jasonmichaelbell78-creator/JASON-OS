# Sync-Mechanism Registry Schema

**Version:** 1.3
**Last Updated:** 2026-04-22
**Status:** ACTIVE
**Source of decisions:**
- `.planning/piece-2-schema-design/DECISIONS.md` (D1–D32) — v1.0 foundation
- `.planning/piece-3-labeling-mechanism/DECISIONS.md` (D1–D19 + machinery) — v1.1/v1.2 Piece 3 additions
- `.planning/piece-3-labeling-mechanism/structural-fix/DECISIONS.md` (D1.1–D8.7) — v1.3 structural additions

---

## §1 Purpose and Scope

This schema is the contract that every record in the sync-mechanism registry
must conform to. The registry catalogs every file across JASON-OS and SoNash
that's in sync scope, and the schema's job is to answer, for each file:

- Who is it for? (scope)
- Does it travel between repos? (portability)
- What does it need? (dependencies, external refs)
- Where did it come from? (lineage, supersedes)
- What happens on sync? (sanitize_fields, portable-with-deps, migration-metadata)

**What this schema describes:**
- File records (one per file in sync scope)
- Composite records (one per multi-file atomic-port workflow)
- Section records (for mixed-scope files — optional)
- Migration-metadata records (port-phase tracking — optional)

**What this schema does NOT describe:**
- How labels get attached to files → Piece 3 (labeling mechanism)
- How the registry is stored/queried → Piece 4 (registry)
- How the sync engine acts on records → Piece 5 (sync engine)
- How sanitization transforms actually run → Piece 5

The schema is the catalog. Downstream pieces are the machinery.

---

## §2 Record Types

Two record types live in separate catalogs:

| Catalog | Record type | Purpose |
|---|---|---|
| `files.jsonl` | File record | One record per file in sync scope |
| `composites.jsonl` | Composite record | One record per composite (multi-file atomic-port unit) |

**Schema itself is NOT a registry record.** It lives as external meta at
`.claude/sync/schema/` and is referenced by tooling, not catalogued.

Both catalogs are mirrored identically in JASON-OS and SoNash per the
symmetric-architecture decision (BRAINSTORM.md §3.3). Catalog filenames
and paths are a Piece 4 decision; this schema only requires the two-catalog
split.

---

## §3 Universal File-Level Columns (26 + 5 machinery)

Every file record carries these 26 universal columns. Required columns must
be present with non-null values; optional columns may be null or empty.

Piece 3 adds 5 more universal fields — all optional — for the labeling
machinery that keeps the catalog fresh automatically. They are documented
in §3.10 below (details in `.claude/sync/label/docs/CATALOG_SHAPE.md` §4).

### §3.1 Identity (required)

| Column | Type | Description | Rationale |
|---|---|---|---|
| `name` | string | Canonical identifier used when referencing this file from elsewhere. Matches filename slug or `name:` frontmatter line where available. | D1 |
| `path` | string | Repo-root-relative path to the file. Disambiguates same-name files in different directories. | D2 |
| `type` | enum (26 values) | File-kind classification. See §8.1 for values. `git-hook` and `test` added in v1.3 per structural-fix D3.1. | D15; structural-fix D3.1 |
| `purpose` | string | One-sentence human-readable description of what the file does. | D16 |

### §3.2 Scope and sync-action (required)

| Column | Type | Description | Rationale |
|---|---|---|---|
| `source_scope` | enum (5 values) | Where the file's code/definition belongs. See §8.2. | D20 |
| `runtime_scope` | enum (5 values) | Where the file's runtime effects land. Same enum as source_scope. | D20 |
| `portability` | enum (5 values) | What the sync tool does with this file. See §8.3. | D21 |
| `status` | enum (8 values) | Lifecycle state. See §8.4. | D22 |

**Why the source/runtime split:** many files have universal source code but
runtime effects that touch machine-specific or project-specific paths. The
statusline `cache.go` source is universal; its runtime cache lives at a
machine path. Hooks have universal source; their state-file writes are
project-scoped. A single `scope` column conflated these two facts.

### §3.3 What the file needs (required)

| Column | Type | Description | Rationale |
|---|---|---|---|
| `dependencies` | array of `{name, hardness, kind}` | Other registry files this one needs. `hardness: hard \| soft`. `kind: spawn \| import \| reference \| invoke`. | D23 |
| `external_services` | array of `{name, hardness}` | Third-party services / APIs. | D24 |
| `tool_deps` | array of `{name, hardness}` | External CLI binaries needed at runtime (gh, gitleaks, go, node, bash). | D24 |
| `mcp_dependencies` | array of `{name, hardness}` | MCP server tool names. | D24 |
| `required_secrets` | array of `{name, hardness}` | Env var names that must be set (SONAR_TOKEN, GITHUB_TOKEN). | D24 |

Empty arrays are valid when the file needs nothing in a given category.

**Why four separate columns and not one `external_refs`:** each column maps
to a distinct operator-remediation flow (provision account, install CLI,
configure MCP, set env var). A lumped column loses the remediation signal.

### §3.4 Provenance and evolution

| Column | Type | Description | Rationale |
|---|---|---|---|
| `lineage` | object or null | Where the file came from. See §3.11 for the 4-field object shape. `null` for native files. | D25 |
| `supersedes` | array of names | Files this one replaces (array supports merger cases). | D26 |
| `superseded_by` | string or null | Name of the file that replaced this one. | D26 |

### §3.5 Sync mechanics

| Column | Type | Description | Rationale |
|---|---|---|---|
| `sanitize_fields` | array of strings | Identifiers that need per-repo-specific replacement. Empty when portability ≠ `sanitize-then-portable`. | D27 |
| `state_files` | array of `{path, access}` | Paths this file reads/writes in `.claude/state/` etc. `access: read \| write \| read-write`. | D28 |

### §3.6 Catch-all and coupling

| Column | Type | Description | Rationale |
|---|---|---|---|
| `notes` | string | Free-text catch-all for nuances that don't fit structured fields. | D29 |
| `data_contracts` | array of contract objects | Implicit-schema couplings with other files. See §5. | D30 |

### §3.7 Relationship fields

| Column | Type | Description | Rationale |
|---|---|---|---|
| `component_units` | array of `{name, path, role}` | Sub-units that compose this file (companion docs, lib deps, entry points, source files, configs, tests, hooks, skills, agents). Empty for uniform files. | D30-supplement |
| `composite_id` | string or null | Which composite (from `composites.jsonl`) this file belongs to. | D31 |

### §3.8 Copy detection

| Column | Type | Description | Rationale |
|---|---|---|---|
| `is_copy_of` | string or null | Path to canonical source if this file is a copy of another file. | D30-supplement |
| `has_copies_at` | array of strings | If this file IS the canonical, paths where copies exist. Empty otherwise. | D30-supplement |
| `content_hash` | string | SHA of file content at scan time. Enables drift detection without opening files. | D30-supplement |

**Why these fields:** the copy-not-import pattern (safe-fs.js has ~10 copies
across skill directories for self-containment) is architecture, not debt
(contrarian HIGH #5). These columns enable detection of drift between
canonical and copies without centralizing, preserving the self-contained
skill-port model.

### §3.9 Content granularity

| Column | Type | Description | Rationale |
|---|---|---|---|
| `sections` | array of section records (optional) | Per-section records for mixed-scope files. Empty array for uniform files. See §4. | D17 |

Only ~10–20 files across both repos have mixed content warranting sections
(CLAUDE.md, specific memory files flagged by Piece 1a Finding #5.1). For all
other files, `sections: []` is the norm.

### §3.10 Piece 3 machinery fields (optional, added in v1.2)

All 5 are optional. Defaults assumed when absent: `false`, `[]`, `[]`,
`null`, and the current schema string respectively.

| Column | Type | Description | Rationale |
|---|---|---|---|
| `pending_agent_fill` | boolean | Async-fill marker: `true` while the PostToolUse hook's derivation agent is still in flight for this record. Rejected at commit time (pre-commit validator). | Piece 3 D11 |
| `manual_override` | array of strings | Field names the user explicitly set via conversational override. The PostToolUse hook skips these fields when re-deriving. | Piece 3 D12a |
| `needs_review` | array of strings | Field names whose derivation produced low confidence or unresolved primary/secondary disagreement. Non-empty blocks the pre-commit validator. | Piece 3 D3 + D8 |
| `last_hook_fire` | ISO-8601 string or null | Most recent timestamp at which any hook touched this record. Used by fingerprint re-check and audit-skill `--recent` filter. | Piece 3 D6 |
| `schema_version` | string | Schema version under which this record was last derived/validated (e.g. `"1.2"`). Enables cross-version read during migration windows. | Piece 3 machinery |

Details — invariants, consumers, audit trail — live in
`.claude/sync/label/docs/CATALOG_SHAPE.md` §4.1 through §4.5. These fields
are mirrored on composite records so the same labeling machinery applies to
composites.

### §3.11 Lineage Records

The `lineage` column (§3.4) is either `null` for native files or a 4-field
object for ported files. Locked as the canonical shape in structural-fix
D2.1 (schema wins over prior template drift).

| Field | Type | Description |
|---|---|---|
| `source_project` | string | Originating repo (e.g. `"sonash"`, `"jason-os"`). |
| `source_path` | string | Repo-relative path in the source repo at port time. |
| `source_version` | string | Version identifier of the source file at port (e.g. `"v1.4"`, `"v2.0"`). Free-form — prior D25 expected semver-like strings but doesn't enforce. |
| `ported_date` | string | ISO-8601 date (`YYYY-MM-DD`) of the port. |

`additionalProperties: false` — lineage objects do not accept extra keys.
Native files set `lineage: null`; there is no "partial lineage" shape.

The adjacent `migration_metadata` object (§6) carries port-process
details (what was dropped, what was sanitized) — `lineage` is the
"where from + when" stamp only.

### §3.12 Confidence (optional, added in v1.3)

Optional top-level `confidence` object on every file record and composite
record. Added in structural-fix D2.2 to replace the pre-v1.3
strip-before-validate band-aid in `verify.js` + `cross-check.js`.

| Field | Type | Description |
|---|---|---|
| `confidence` | object or absent | Optional. Map of free-form axis names → numbers in `[0, 1]`. Schema enforces value range; axis keys are agent-defined. |

**Why this exists:** agent-primary / agent-secondary derivation emits
confidence alongside the record. Prior schema rejected the field via
`additionalProperties: false`, forcing verify.js to strip it before
validation — losing the signal and creating a divergence between "what
the agent said" and "what was stored." v1.3 makes the field explicit.

**Consumers:** `validate-catalog.js` passes confidence through
unchanged (treated as informational; `pending_agent_fill` +
`needs_review` remain the commit-time gates). Downstream readers (audit
skill, needs-review filter) can consult confidence to prioritize
review targets.

---

## §4 Section Records

Sections give per-section granularity on mixed-scope files. Each section
record carries 7 fields (the 6 fields from D18 plus `last_known_lines` added
per D19 as the self-healing identifier hint).

| Field | Type | Description |
|---|---|---|
| `heading` | string | The section's heading text (primary stable identifier). |
| `last_known_lines` | string | Line range at last scan (e.g. `"145-200"`). Self-healing hint; refreshed each scan. When heading renames, tool uses this to locate approximate position and flag for review. |
| `scope` | enum (5 values) | Source scope for this section (overrides file-level). |
| `portability` | enum (5 values) | Per-section sync action (overrides file-level). |
| `purpose` | string | One-sentence summary of section content. |
| `sanitize_fields` | array of strings | Per-section sanitize identifiers (may override or supplement file-level). |
| `notes` | string | Per-section free-text catch-all. |

Sections do NOT carry `status` — file-level status suffices.

Sections do NOT carry `runtime_scope` — runtime scope is a file-level concern,
not content-level.

---

## §5 Data Contracts

`data_contracts[]` captures implicit-schema coupling between files. Example:
`SESSION_CONTEXT.md` has a 5-field contract that multiple hooks/skills
produce and consume. Without this column, the sync tool can't detect when
a producer changes a field name and every consumer silently breaks.

### Contract object shape

| Field | Type | Description |
|---|---|---|
| `contract_name` | string | Handle for the contract (e.g. `"session-context-v5"`). |
| `target_file` | string | Name of the file whose format IS the contract. |
| `role` | enum | `producer \| consumer \| read-write` — what this file does w.r.t. the contract. |
| `fields` | array of strings | The specific field/key names in the contract. |

A file can have multiple contract entries (if it produces one and consumes
another).

---

## §6 Migration-Metadata

Optional sub-object on each file record. `null` for native files (files with
no port history — never ported from another repo). Tracks what happened
during the file's most recent cross-repo port.

| Field | Type | Description |
|---|---|---|
| `context_skills` | array of strings | Skill names required as context injection in the source repo (e.g. SoNash's `["sonash-context"]`). Stripped during port to JASON-OS. |
| `dropped_in_port` | array of strings | Features / sections removed during port. |
| `stripped_in_port` | array of strings | Specific sanitized content removed. |
| `version_delta_from_canonical` | string | Semver distance from source at last port (e.g. `"v1.2 → v1.2 (in-sync)"`). |
| `port_status` | enum (7 values) | `ported \| partial-port \| sonash-only \| jason-os-only \| in-sync \| not-ported-portable \| not-ported-not-portable` |

**Why a separate section:** migration fields would pollute the core schema
with values that go null or stale once the initial port is done. Segregation
keeps the core schema migration-agnostic while preserving the port story
(contrarian HIGH #1).

---

## §7 Composites and the Composites Catalog

Composites live in a separate catalog (`composites.jsonl`). File records
reference their composite via the universal `composite_id` column (§3.7).

### Composite records

A composite record reuses most universal columns (name, purpose,
source_scope, runtime_scope, portability, status, dependencies,
external_services, tool_deps, mcp_dependencies, required_secrets, lineage,
supersedes, superseded_by, notes, data_contracts, component_units) AND adds
3 composite-specific fields:

| Field | Type | Description |
|---|---|---|
| `workflow_family` | string or null | Named family (e.g. `"deep-research"`, `"gsd"`, `"ecosystem-audit"`, `"session-lifecycle"`, `"tdms"`). |
| `gsd_phase` | string or null | For GSD composites only — which GSD phase the composite belongs to. |
| `port_strategy` | enum | `atomic \| partial-ok` — whether all components must travel together. |

### Confirmed composite examples (from Piece 1a/1b scans)

| Composite | workflow_family | Components |
|---|---|---|
| `deep-research-workflow` | `deep-research` | 1 skill + 8 agents + state files |
| `ecosystem-audit-workflow` (SoNash) | `ecosystem-audit` | 1 orchestrator skill + 8 member skills + `_shared/ecosystem-audit` doc-lib + tests |
| `gsd` | `gsd` | 11 agents + plugin manifest + shared state |
| `tdms` (SoNash) | `tdms` | 28 scripts + MASTER_DEBT.jsonl + audit skills |
| `session-lifecycle` | `session-lifecycle` | session-begin + session-end + SESSION_CONTEXT.md contract + commit script |

---

## §8 Enums

All enum values live in `enums.json` (machine-readable) — this section is the
human-readable mirror.

### §8.1 `type` — 26 values

| Value | Description |
|---|---|
| `skill` | A thing the user invokes with `/name` |
| `agent` | A specialized worker a skill spawns |
| `team` | A named group of agents that coordinate |
| `hook` | Automated script fired on Claude Code events |
| `hook-lib` | Shared helper code used by hooks (includes executable helpers) |
| `memory` | Auto-memory file in user home (not git-tracked) |
| `canonical-memory` | Git-tracked counterpart to memory files |
| `script` | Standalone executable script |
| `script-lib` | Shared helper code used by scripts |
| `tool` | Multi-file program with its own build system |
| `tool-file` | Source file inside a tool |
| `research-session` | Whole `.research/<topic>/` directory |
| `plan` | Central PLAN.md from deep-plan |
| `planning-artifact` | Other planning docs (DIAGNOSIS.md, DECISIONS.md, ROADMAP.md, RESUME.md, LEARNINGS.md) |
| `todo-log` | Append-only JSONL todo log |
| `config` | Generic dotfile config (.nvmrc, .gitignore, package.json) |
| `settings` | Claude Code settings.json variants |
| `ci-workflow` | GitHub Actions workflow file |
| `doc` | Prose documentation for humans (CLAUDE.md, README.md) |
| `output-style` | Markdown file that overrides Claude's system-prompt tone/format |
| `keybindings` | Custom keyboard shortcut mapping (~/.claude/keybindings.json) |
| `shared-doc-lib` | Shared prose-library files used by multiple skills |
| `database` | Data files like SQLite databases |
| `composite` | Composite-record marker in `composites.jsonl` (not a file-record type). |
| `git-hook` | **v1.3** — Git-native hook (`.husky/<name>`, shims under `.husky/_/`, or `.git/hooks/<name>`). Distinct namespace from Claude-Code `type: hook`. Paired with `git_hook_event` (§9.11). Driven by structural-fix D3.1 + D4.5. |
| `test` | **v1.3** — Test files under `**/__tests__/**` or matching `*.{test,spec}.{js,cjs,mjs,ts}` per structural-fix D4.6. |
| `other` | Escape-valve for unclassified files (temporary; ~3-file threshold triggers real-type addition) |

**Evolution:** adding a new type value = schema minor version bump (non-breaking).
See EVOLUTION.md. Files in `other` auto-upgrade when a matching type lands.

### §8.2 `source_scope` / `runtime_scope` — 5 values

| Value | Description |
|---|---|
| `universal` | Travels everywhere. Lives identically in any Claude Code project. |
| `user` | Tied to the user, travels across their projects but is personal. |
| `project` | Tied to a specific project. Doesn't travel. |
| `machine` | Tied to a specific computer. Never travels via git. |
| `ephemeral` | Session-local. Gone after the conversation ends. |

### §8.3 `portability` — 5 values

| Value | Description |
|---|---|
| `portable` | Copy as-is. |
| `sanitize-then-portable` | Copy, edit specific fields, then works. |
| `portable-with-deps` | Copy as-is, but target needs external dependencies for runtime function. |
| `not-portable` | Don't copy — file is meaningless outside its repo. |
| `not-portable-product` | Don't copy — application code that never crosses repos by design. |

### §8.4 `status` — 9 values

| Value | Description |
|---|---|
| `active` | In use right now (ongoing). |
| `complete` | Work finished (not ongoing, but not retired — e.g. a milestone PLAN.md). |
| `deferred` | Intentionally planned for later. |
| `stub` | Placeholder in place; real implementation pending. |
| `gated` | Blocked by an external condition. |
| `deprecated` | Still works but shouldn't be used; slated for removal. |
| `archived` | Moved out of active use; kept for history. |
| `generated` | Auto-generated by tooling (never hand-edited). |
| `partial` | **v1.1 — Piece 3.** Transient: async understanding-field fill is still in flight. Valid in the live catalog, rejected at commit time by the pre-commit validator (Piece 3 D3 + D11). |

#### §8.4a `status: generated` portability pairing (D3.2)

`status: generated` is a classification signal, not a portability signal.
Each generated record MUST also carry one of:

- `portability: not-portable` — artifact is regenerated per repo and never
  crosses (e.g. `.husky/_/*` shims, `.research/research-index.jsonl`,
  `.planning/TODOS.md`).
- `portability: portable-with-deps` — generated content crosses but needs
  the generator present on the target side (e.g. `package-lock.json`).

Structural-fix D3.2 makes this pairing explicit — avoids adding a
`generated` value to `enum_portability` (which would have duplicated the
meaning across two enums).

### §8.5 `hook_event` — 9 values

Claude-Code hook events. Paired with `type: hook` (not `type: git-hook`).

`PreToolUse | PostToolUse | PostToolUseFailure | SessionStart | Stop | SubagentStop | Notification | PreCompact | UserPromptSubmit`

### §8.5a `git_hook_event` — 18 values (v1.3)

Git-native hook trigger. Paired with `type: git-hook` (§9.11). Distinct
semantic namespace from §8.5 per structural-fix D3.3.

`applypatch-msg | pre-applypatch | post-applypatch | commit-msg | pre-commit | pre-merge-commit | pre-rebase | post-commit | post-checkout | post-merge | pre-push | pre-receive | update | post-receive | post-update | push-to-checkout | pre-auto-gc | post-rewrite`

### §8.6 `dependency_hardness` — 2 values

`hard | soft`

### §8.7 `dependency_kind` — 4 values

`spawn | import | reference | invoke`

### §8.8 `state_file_access` — 3 values

`read | write | read-write`

### §8.9 `data_contract_role` — 3 values

`producer | consumer | read-write`

### §8.10 `agent_runtime_lifecycle` — 4 values

`per-invocation | per-session | persistent | ephemeral`

### §8.11 `reference_layout` — 3 values

`none | flat | subdirectory`

### §8.12 `memory_type` — 6 values

`user | feedback | project | reference | tenet | index`

### §8.13 `canonical_staleness_category` — 5 values

`fresh | formatting-only | semantic-drift | operationally-wrong | intentional-scope-difference`

### §8.14 `module_system` — 3 values

`cjs | esm | none`

### §8.15 `tool_language` — 7 values

`go | javascript | bash | yaml | toml | json | markdown`

### §8.16 `session_type` — 4 values

`brainstorm | deep-research | deep-plan | hybrid`

### §8.17 `research_depth` — 5 values

`L0-brainstorm | L1 | L2 | L3 | L4`

### §8.18 `plan_scope` — 12 values

`milestone | diagnosis | decisions | roadmap | research-program | deferral-registry | session-bookmark | port-ledger | execution-handoff | backlog | cross-pr-learning | learnings`

### §8.19 `exit_code_action` — 3 values

`block | warn | allow`

### §8.20 `port_strategy` — 2 values

`atomic | partial-ok`

### §8.21 `port_status` — 7 values

`ported | partial-port | sonash-only | jason-os-only | in-sync | not-ported-portable | not-ported-not-portable`

---

## §9 Per-Type Extensions

File records MAY carry additional fields based on their `type`. Each type
has a specific set of extension fields.

### §9.1 Skills (`type: skill`)

| Field | Type | Description |
|---|---|---|
| `reference_layout` | enum | `none \| flat \| subdirectory`. Tooling needs to know whether to glob `*/REFERENCE.md` or `**/*.md`. |
| `supports_parallel` | boolean | Can this skill run in parallel with others? |
| `fallback_available` | boolean | Does this skill have a fallback behavior if it fails? |

### §9.2 Agents + Teams (`type: agent | team`)

| Field | Type | Description |
|---|---|---|
| `pipeline_phase` | string or null | Phase label in a sequential pipeline (e.g. `"Phase 2.5"`). |
| `model` | string | LLM identifier (`sonnet`, `opus`, `haiku`). |
| `maxTurns` | integer or null | Max turns per invocation. Null = unbounded. |
| `tools` | array of strings | Allowed tool names from frontmatter. |
| `disallowedTools` | array or null | Explicitly-blocked tools. `null` ≠ `[]` ≠ explicit block. |
| `color` | string or null | UI color in Claude Code. |
| `runtime_lifecycle` | enum | `per-invocation \| per-session \| persistent \| ephemeral`. |

Teams use prettier-ignore + bold + table metadata (parser is a Piece 3
concern; schema fields identical to agents).

### §9.3 Hooks — split into `type: hook` vs `type: hook-lib` (v1.3, D2.5)

Pre-v1.3 both types required the 7 hook-wiring fields. v1.3 splits the
conditional: Claude-Code-wired hooks require them; library helpers used
BY hooks require none of them (a hook-lib is shared code, not a wired
hook of its own).

#### §9.3a `type: hook` — 7 required fields

| Field | Type | Description |
|---|---|---|
| `event` | enum | See §8.5 (9 Claude-Code event values). |
| `matcher` | string or null | Tool-name regex filter. Null = fires on all. |
| `if_condition` | string or null | Additional filter beyond matcher. |
| `continue_on_error` | boolean | Fail-open (true) vs fail-closed (false). |
| `exit_code_action` | enum | `block \| warn \| allow`. Semantics distinct from continue_on_error. |
| `async_spawn` | boolean | Fire-and-forget subprocess pattern. |
| `kill_switch_env` | string or null | Env var that disables this hook (e.g. `SKIP_GATES=1`). |

#### §9.3b `type: hook-lib` — none required

Hook-libs are shared helper code consumed by hooks (e.g.
`.claude/hooks/lib/symlink-guard.js`, `.husky/_shared.sh`,
`.husky/husky.sh`). They do not wire into any event themselves; the
7 fields above do not apply. Base `file_record` columns + dependency
graph carry the load.

Pre-v1.3 records that stamped these 7 fields as `null` on hook-libs
remain valid under v1.3 (schema is additive only) — but new hook-lib
records SHOULD omit them per this split.

### §9.4 Memories (`type: memory | canonical-memory`)

| Field | Type | Description |
|---|---|---|
| `memory_type` | enum | See §8.12 (6 values). |
| `tenet_number` | integer or null | For `tN_`-prefixed tenet files. |
| `has_canonical` | boolean | Does this user-home file have a git-tracked canonical counterpart? |
| `append_only` | boolean | Never-overwrite log pattern (e.g. `session-end-learnings.md`). |
| `recency_signal` | string or null | Platform staleness annotation from system-reminder. |
| `canonical_staleness_category` | enum | See §8.13 (5 values). Captures intentional curation (`intentional-scope-difference`) vs real drift (`operationally-wrong`, `semantic-drift`). |

### §9.5 Scripts (`type: script | script-lib`)

| Field | Type | Description |
|---|---|---|
| `entry_point` | boolean | Invoked directly vs library-only. |
| `shells_out` | boolean | Spawns subprocesses via exec/spawn/fork. |
| `test_coverage` | boolean | Corresponding test files exist. |
| `module_system` | enum | `cjs \| esm \| none`. Cannot infer from `.js` extension alone. |

### §9.6 Tools (`type: tool | tool-file`)

| Field | Type | Description |
|---|---|---|
| `language` | enum | See §8.15. |
| `requires_build` | boolean | Must compile before use. |
| `binary_present` | boolean | Pre-built artifact exists at scan time (observational). |
| `install_target` | string | Install path. Captures repo-name suffix for isolation (e.g. `~/.claude/statusline/cache-jason-os/`). |
| `secret_config_required` | boolean | Needs gitignored secret config file. |

### §9.7 Research Sessions (`type: research-session`)

| Field | Type | Description |
|---|---|---|
| `session_type` | enum | See §8.16. |
| `depth` | enum | See §8.17. |
| `claim_count` | integer | Total claims produced. |
| `source_count` | integer | Total sources cited. |

### §9.8 Planning Artifacts (`type: plan | planning-artifact`)

| Field | Type | Description |
|---|---|---|
| `plan_scope` | enum | See §8.18 (12 values). |

### §9.9 CI Workflows (`type: ci-workflow`)

| Field | Type | Description |
|---|---|---|
| `trigger_events` | array of strings | `push \| pull_request \| schedule \| workflow_dispatch \| ...`. |
| `runner_os` | string | `ubuntu-latest \| windows-latest \| macos-latest`. |
| `action_pins` | array of `{action, sha, tag}` | Pinned GitHub Actions references. |
| `secret_bearing` | boolean | References secrets beyond GITHUB_TOKEN. |

### §9.10 Composites (composite records in `composites.jsonl`)

| Field | Type | Description |
|---|---|---|
| `workflow_family` | string or null | See §7 examples. |
| `gsd_phase` | string or null | For GSD composites. |
| `port_strategy` | enum | `atomic \| partial-ok`. |

### §9.11 Git Hooks (`type: git-hook`) — v1.3

| Field | Type | Description |
|---|---|---|
| `git_hook_event` | enum | See §8.5a (18 values). Required — the schema's `allOf` conditional enforces presence when `type: git-hook`. |

Applies to `.husky/<name>` files, the shims under `.husky/_/*`, and any
direct `.git/hooks/<name>` entries (though the latter are project-local
and typically gitignored). Distinct from `type: hook` (Claude Code hook
events) — different invocation surface, different event namespace.

### §9.12 Tests (`type: test`) — v1.3

No per-type extensions. Base `file_record` fields carry the classification.
Applies to files matched by either convention:

- Directory form: `**/__tests__/**/*.{js,cjs,mjs,ts}`
- Suffix form:    `**/*.{test,spec}.{js,cjs,mjs,ts}`

Both conventions map to the single `test` type per structural-fix D4.6.
Runner information + dependency graph are captured via `tool_deps` +
`dependencies` (e.g. `{name: "node", hardness: "hard"}` for `node --test`
runners; `{name: "jest", hardness: "hard"}` for Jest projects).

---

## §10 Schema Evolution

Summary — full detail in `EVOLUTION.md`:

- **Add enum value** → minor version bump, non-breaking. Files in `other`
  auto-upgrade when matching type lands.
- **Add universal column** → minor bump if optional with default. Major bump
  (breaking) if required with no default.
- **Add per-type extension field** → minor bump, non-breaking.
- **Remove value or field** → major bump, breaking, needs migration plan.
- **Rename** → major bump, breaking.

**Mirror rule:** any schema change in one repo must be applied to the mirror
repo before the next sync cycle.

**Schema is NOT a registry record.** It's external meta.

---

## §11 Version History

| Version | Date | Description |
|---|---|---|
| 1.0 | 2026-04-19 | Initial release. 26 universal columns + 41 per-type fields + sections + migration-metadata + composites catalog. Decisions D1–D32 in `.planning/piece-2-schema-design/DECISIONS.md`. |
| 1.1 | 2026-04-20 | Added `status` value: `partial` (transient async-fill state, rejected at commit time). Driven by Piece 3 labeling mechanism — decisions D2, D3, D11 in `.planning/piece-3-labeling-mechanism/DECISIONS.md`; shape detail in `.claude/sync/label/docs/CATALOG_SHAPE.md` §4.1. |
| 1.2 | 2026-04-20 | Added 5 Piece 3 machinery fields as optional typed columns on both `file_record` and `composite_record`: `pending_agent_fill` (boolean), `manual_override` (string[]), `needs_review` (string[]), `last_hook_fire` (string\|null), `schema_version` (string). Replaces the `relaxFileRecordAdditionalProperties` patch in `validate-catalog.js` — schema now strictly enforces field shape. Minor bump per EVOLUTION.md §3 (optional with defaults); T27 in `.planning/todos.jsonl`. |
| 1.3 | 2026-04-22 | **Piece 3 structural fix.** Added `enum_type` values `git-hook` + `test` (D3.1, §8.1). Added new `enum_git_hook_event` (D3.3, §8.5a) + paired `allOf` conditional requiring `git_hook_event` on `type: git-hook`. Split old §9.3 `hook\|hook-lib` conditional: `type: hook` still requires the 7 hook-wiring fields; `type: hook-lib` now requires none (D2.5). Added optional top-level `confidence` object to both `file_record` and `composite_record` (D2.2, §3.12) — replaces the strip-before-validate pattern in `verify.js`/`cross-check.js`. Documented `status: generated` + `portability` pairing (D3.2, §8.4a) and the canonical 4-field `lineage` shape (D2.1, §3.11). Decisions D1.1–D8.7 in `.planning/piece-3-labeling-mechanism/structural-fix/DECISIONS.md`; EVOLUTION.md §11 carries the detailed changelog. Minor/additive — v1.2 records validate cleanly under v1.3. |

---

## Cross-references

- **Decisions (authoritative):** `.planning/piece-2-schema-design/DECISIONS.md`
- **Plan (implementation):** `.planning/piece-2-schema-design/PLAN.md`
- **Diagnosis (context):** `.planning/piece-2-schema-design/DIAGNOSIS.md`
- **Enums (machine-readable):** `./enums.json`
- **Validation schema:** `./schema-v1.json`
- **Evolution rules:** `./EVOLUTION.md`
- **Worked examples:** `./EXAMPLES.md`
- **Upstream research:** `.research/sync-mechanism/piece-1a-discovery-scan-jason-os/RESEARCH_OUTPUT.md`, `.research/sync-mechanism/piece-1b-discovery-scan-sonash/RESEARCH_OUTPUT.md`
- **Brainstorm context:** `.research/sync-mechanism/BRAINSTORM.md`
