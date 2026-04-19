# DECISIONS — piece-2-schema-design

**Date:** 2026-04-19 (Session #8)
**Topic:** Classification schema for sync-mechanism registry
**Status:** FINAL — approved for PLAN.md implementation
**Preceding:** DIAGNOSIS.md (same directory), Piece 1a + 1b research outputs

This is the standalone decision record for Piece 2. Every decision below was
confirmed during the Phase 1 Discovery column-by-column walkthrough. PLAN.md
references these by ID (D1–D32).

---

## Section 1 — Identity columns

| # | Column | Choice | Rationale |
|---|---|---|---|
| D1 | `name` | IN. String. | Canonical identifier for cross-referencing (dependencies, supersedes, component_units). |
| D2 | `path` | IN. String. | Tells sync tool where to copy FROM and TO. Disambiguates same-name files in different directories. |
| D16 | `purpose` | IN. String. | One-sentence human-readable description. Makes registry navigable without opening source files. |

---

## Section 2 — Type enum (Column 3)

**D3 — Remove `command`.** Deprecated in SoNash (`.claude/commands/README.md`, Session #120, 2026-01-31). Skills are the canonical replacement. JASON-OS doesn't have the directory.

**D4 — Add `other` escape-valve.** Temporary holding cell for unclassifiable files. Rule: if ~3 files accumulate in `other`, add a real type value.

**D5 — Enum-evolution rule.** Adding a new type value = schema minor version bump (non-breaking). Files in `other` auto-upgrade when a matching type lands. Removing/renaming = breaking change, explicit migration.

**D6 — Claude Code ecosystem research outcome.** Added 3 types (`output-style`, `keybindings`, `settings`). Skipped 7 recommendations that either overlap existing types or fall under ephemeral/enterprise scope that won't sync.

**D7 — config/settings rename (option a).** Keep `config` for generic dotfiles (`.nvmrc`, `.gitignore`, `package.json`). Add `settings` for Claude Code `settings.json` variants (permissions/hooks/env).

**D8 — Group 1 kept (skill, agent, team).** `command` cut per D3. Triad is "things you invoke."

**D9 — Group 2 kept (hook, hook-lib).** Executable hook-helpers included in `hook-lib` (no third bucket).

**D10 — Group 3 kept (memory, canonical-memory).** Split load-bearing for 73% canonical-gap finding. Index-ness handled by a separate boolean flag, not a third type.

**D11 — Group 4 kept (script, script-lib, tool, tool-file).** Parallels hook-lib split. Tool-internal executables classify as `tool-file`.

**D12 — Group 5 kept 4 of 5.** `research-session`, `plan`, `planning-artifact`, `todo-log`. Cut `learnings-doc` (folded into `planning-artifact` with `plan_scope: learnings`).

**D13 — Group 6 kept all 6** (`config`, `settings`, `ci-workflow`, `doc`, `output-style`, `keybindings`). `output-style` kept distinct from `doc` because it modifies Claude behavior (config-like, not prose).

**D14 — Group 7 kept 3 of 5.** `shared-doc-lib`, `database`, `other`. Dropped `composite` (handled via universal `composite_id` column + separate composites catalog per D31). Dropped `product-code` (handled by `portability: not-portable-product` enum value).

**D15 — Final type enum (24 values):** skill, agent, team, hook, hook-lib, memory, canonical-memory, script, script-lib, tool, tool-file, research-session, plan, planning-artifact, todo-log, config, settings, ci-workflow, doc, output-style, keybindings, shared-doc-lib, database, other.

---

## Section 3 — Scope and sync-action columns

**D20 — Split `scope` into `source_scope` + `runtime_scope`.** Piece 1a Finding #5.3: source code and runtime footprint often diverge (cache.go = universal source, machine runtime; hooks = universal source, project runtime). Both required, both use the same 5-value enum: `universal | user | project | machine | ephemeral`. Sections inherit source_scope. Sections do NOT have runtime_scope.

**D21 — `portability` enum, 5 values, one renamed.** Original 3 plus 2 from Piece 1b (with rename). Final: `portable | sanitize-then-portable | portable-with-deps | not-portable | not-portable-product`. Renamed `not-portable-systemic-dep` → `portable-with-deps` (user correction — files ARE portable, just dependency-gated). Sections can override file-level portability per-section.

**D22 — `status` enum, 8 values.** `active | deferred | archived | deprecated | stub | gated | complete | generated`. All 8 map to meaningfully different lifecycle states. `active`/`complete` kept distinct (ongoing vs finished). `deferred`/`stub`/`gated` kept distinct (3 different reasons for not-yet-ready).

---

## Section 4 — What the file needs

**D23 — `dependencies` structured.** Array of objects: `[{name, hardness, kind}]`. Hardness: `hard | soft` (captures `try { require } catch { fallback }` pattern). Kind: `spawn | import | reference | invoke` (absorbs what SCHEMA_SPEC v1.0 called `active_scripts` and `agent_types_spawned` as skill-specific — now universal via kind).

**D24 — External dependencies split into 4 columns.** Each is `[{name, hardness}]`. Separate columns because each maps to distinct operator-remediation flow:
- `external_services` — provision accounts, get API keys
- `tool_deps` — install CLIs
- `mcp_dependencies` — configure MCP servers
- `required_secrets` — set env vars / GitHub secrets

---

## Section 5 — Provenance and evolution

**D25 — `lineage` object-or-null.** 4 sub-fields: `source_project`, `source_path`, `source_version`, `ported_date`. Native files (no external origin) = `lineage: null`. Enables bidirectional sync without data loss (back-ports from JASON-OS → SoNash record symmetrically).

**D26 — `supersedes` + `superseded_by` pair.**
- `supersedes`: array of names (captures merger case — one file replacing several)
- `superseded_by`: single name (a file has at most one replacement)
- Both null when no replacement relationship

Enables bidirectional traversal of version chains. D4a flagged as highest-priority schema gap.

---

## Section 6 — Sync mechanics and catch-all

**D27 — `sanitize_fields` as array of strings.** Identifiers that need per-repo-specific replacement. Empty when portability ≠ `sanitize-then-portable`. Deliberately simple — how-to-replace logic lives in Piece 5 (sync engine); per-repo mapping values stay out of mirrored schema.

**D28 — `state_files` structured.** Array of objects: `[{path, access: read | write | read-write}]`. Prevents silent-fail sync (hook lands, writes to missing state path, crashes). Read vs write matters for remediation (read-only tolerates missing state; writers need path guaranteed).

**D29 — `notes` as string.** Free-text escape hatch. Sections also carry notes.

**D30 — `data_contracts` structured array.** `[{contract_name, target_file, role, fields}]`. Role: `producer | consumer | read-write`. Captures implicit-schema coupling (SESSION_CONTEXT.md 5-field contract, RESEARCH_OUTPUT.md, handoff.json). Universal because any file can produce/consume a contract. Piece 1a Finding #5.4.

---

## Section 7 — Content granularity (sections)

**D17 — `sections[]` as OPTIONAL universal field.** Empty array valid for uniform files. Only mixed-scope files populate it. Estimated ~10–20 files across both repos will use sections. Addresses Piece 1a Finding #5.1 (content bleed) without per-file overhead.

**D18 — Section record carries 6 fields.** `heading`, `scope`, `portability`, `purpose`, `sanitize_fields`, `notes`. No per-section `status` (file-level status suffices).

**D19 — Section identified by heading + line-range hint.** Option 3: `heading` (primary, stable across line edits) + `last_known_lines` (self-healing snapshot refreshed each scan). When heading renames, tool locates approximate position and flags for review.

---

## Section 8 — Copy detection (contrarian HIGH #5)

**D30-supplement** (from Group P5):

- `is_copy_of` — string or null. Path to canonical source if this file is a copy.
- `has_copies_at` — array of strings. Paths where copies exist. Empty for most files.
- `content_hash` — SHA of file content at scan time. Drives drift detection without reopening files.

Endorses the "self-containment over DRY" pattern (10 copies of `safe-fs.js` in skill subdirs). Detection rather than centralization.

---

## Section 9 — Composites (Group P7)

**D31** (composite handling):
- Add universal `composite_id` column — string or null. Which composite, if any, this file belongs to.
- Separate `composites.jsonl` catalog — each composite gets one record.
- Composite records reuse most universal columns PLUS 3 composite-specific fields:
  - `workflow_family` — string or null (e.g. `deep-research`, `gsd`, `ecosystem-audit`, `session-lifecycle`, `tdms`)
  - `gsd_phase` — string or null (for GSD composites only)
  - `port_strategy` — `atomic | partial-ok`

**Confirmed composite examples from both repos:**
- `deep-research-workflow` (1 skill + 8 agents + state)
- `ecosystem-audit-workflow` (1 orchestrator + 8 member audit skills + `_shared/ecosystem-audit` doc-lib + tests) — SoNash
- `gsd` (11 agents + plugin manifest + shared state)
- `tdms` (28 scripts + MASTER_DEBT.jsonl + audit skills) — SoNash
- `session-lifecycle` (session-begin + session-end + SESSION_CONTEXT.md contract + commit script)

---

## Section 10 — Per-type extensions

### Skills (3 fields)
- `reference_layout` — enum: `none | flat | subdirectory`
- `supports_parallel` — boolean
- `fallback_available` — boolean

(Cut `active_scripts`, `agent_types_spawned`, `has_reference_md`, `stub_level`, `port_lineage_frontmatter` as absorbed into universal columns or covered by other decisions. Cut `estimated_time_*` as schema-creep.)

### Agents + Teams (7 fields)
- `pipeline_phase` — string or null
- `model` — string (sonnet / opus / haiku)
- `maxTurns` — integer or null
- `tools` — array of strings
- `disallowedTools` — array or null (null ≠ [] ≠ explicit-block)
- `color` — string or null
- `runtime_lifecycle` — enum: `per-invocation | per-session | persistent | ephemeral`

Teams use prettier-ignore + bold + table metadata format (parser choice is Piece 3 territory; schema fields identical).

### Hooks (7 fields)
- `event` — enum (9 values): `PreToolUse | PostToolUse | PostToolUseFailure | SessionStart | Stop | SubagentStop | Notification | PreCompact | UserPromptSubmit`
- `matcher` — string or null
- `if_condition` — string or null
- `continue_on_error` — boolean
- `exit_code_action` — enum: `block | warn | allow`
- `async_spawn` — boolean
- `kill_switch_env` — string or null

(Cut `state_files` — universal per D28.)

### Memories (6 fields)
- `memory_type` — enum: `user | feedback | project | reference | tenet | index`
- `tenet_number` — integer or null
- `has_canonical` — boolean
- `append_only` — boolean
- `recency_signal` — string or null
- `canonical_staleness_category` — enum: `fresh | formatting-only | semantic-drift | operationally-wrong | intentional-scope-difference`

(Cut `prefix_convention` — derivable from `name`. Cut `portable_elements` — sections cover content granularity. Cut `related` — absorbed into `dependencies.kind = reference`.)

### Scripts (4 fields)
- `entry_point` — boolean
- `shells_out` — boolean
- `test_coverage` — boolean
- `module_system` — enum: `cjs | esm | none`

### Tools (5 fields)
- `language` — enum: `go | javascript | bash | yaml | toml | json | markdown`
- `requires_build` — boolean
- `binary_present` — boolean (observational, recomputed each scan)
- `install_target` — string (captures repo-name suffix per Piece 1a Finding #5.5)
- `secret_config_required` — boolean

### Research sessions (4 fields)
- `session_type` — enum: `brainstorm | deep-research | deep-plan | hybrid`
- `depth` — enum: `L0-brainstorm | L1 | L2 | L3 | L4`
- `claim_count` — integer
- `source_count` — integer

### Planning artifacts (1 field)
- `plan_scope` — enum (12 values): `milestone | diagnosis | decisions | roadmap | research-program | deferral-registry | session-bookmark | port-ledger | execution-handoff | backlog | cross-pr-learning | learnings`

### CI workflows (4 fields)
- `trigger_events` — array: `push | pull_request | schedule | workflow_dispatch | ...`
- `runner_os` — string: `ubuntu-latest | windows-latest | macos-latest`
- `action_pins` — array of objects: `{action, sha, tag}`
- `secret_bearing` — boolean

### Composites (3 composite-specific fields — see Section 9)

---

## Section 11 — Migration-metadata section

**D32 — Migration-metadata as optional sub-object.** Null for native files. When present, contains 5 fields:
- `context_skills` — array of strings (context injections to strip on port)
- `dropped_in_port` — array of strings (features removed during port)
- `stripped_in_port` — array of strings (specific sanitized content removed)
- `version_delta_from_canonical` — string (semver distance at last port)
- `port_status` — enum (7 values): `ported | partial-port | sonash-only | jason-os-only | in-sync | not-ported-portable | not-ported-not-portable`

Addresses contrarian HIGH #1 (migration vs steady-state schema tension) by segregating port-phase fields into a separate section instead of polluting the core schema.

---

## Section 12 — Schema-level architecture

- **Schema lives at:** `.claude/sync/schema/` (exact filenames decided in PLAN.md)
- **Schema itself is NOT a registry record** (external meta, per D20 Phase-1 Q4)
- **Two catalogs:** `files.jsonl` (one record per file) + `composites.jsonl` (one record per composite)
- **Mirrored in both repos** per BRAINSTORM §3.3 symmetric architecture
- **Schema version:** starts at v1.0. Evolution rule per D5.

---

## Summary totals

| Count | Category |
|---|---|
| 26 | Universal file-level columns |
| 6 | Section record fields |
| 41 | Per-type extension fields (across 9 type-groups) |
| 3 | Composite-specific fields |
| 5 | Migration-metadata fields |

**Total decisions logged:** 32 (D1–D32, including sub-decisions within groups).

---

## Cross-cutting corrections addressed (from challenges)

| Challenge | Addressed by |
|---|---|
| Contrarian HIGH #1 (migration-vs-steady-state) | Migration-metadata as separate section (D32) |
| Contrarian HIGH #4 (canonical-memory gap framing) | `canonical_staleness_category` enum value `intentional-scope-difference` (Section 10 memories) |
| Contrarian HIGH #5 (copy-not-import architecture) | `is_copy_of`, `has_copies_at`, `content_hash` universal columns (Section 8) |
| OTB #1 (behavior-as-unit / composite_id) | Universal `composite_id` column + composites catalog (D31) |
| Piece 1a Finding #5.1 (content bleed) | `sections[]` structure (D17-D19) |
| Piece 1a Finding #5.3 (source vs runtime scope) | Split into `source_scope` + `runtime_scope` (D20) |
| Piece 1a Finding #5.4 (data_contracts) | Universal `data_contracts` column (D30) |
| Piece 1a Finding #5.5 (cache-dir naming) | Captured in `install_target` field for tools (Section 10 tools) |
| Piece 1b 5 SCHEMA_SPEC corrections | All applied: team parser (Piece 3 concern), hook event enum (+UserPromptSubmit, +PostToolUseFailure), type enum additions, portability rename, status +generated |

---

## Final verdict

Schema is complete and internally consistent. No deferred-to-later items remain.
Ready for PLAN.md implementation.
