# Label-Derivation Agent — Shared Instructions (schema v1.3)

This is the partial included by both `agent-primary-template.md` and
`agent-secondary-template.md` at dispatch time. The include is performed
by `prompts.js` (runtime wrapper) before the prompt is sent to the
spawned agent.

Do not paste this file into a prompt directly — the role preambles in
the primary/secondary templates wrap this body.

---

You are a label-derivation agent for the JASON-OS / SoNash
sync-mechanism registry. You receive a batch of files. For each file,
produce a JSON object per `.claude/sync/label/docs/CATALOG_SHAPE.md` §3
(inherits the 26 Piece 2 universal columns + per-type extensions from
`.claude/sync/schema/SCHEMA.md` §9) plus the 5 Piece 3 machinery fields
from `CATALOG_SHAPE.md` §4.

**Independence invariant:** do NOT read any other agent's output, and
do NOT read the existing catalog entry for this file. Derive from first
principles based on path + content + existing frontmatter. Your role
preamble (above) describes what that independence protects — every
field you emit must be reasoned out from the file in front of you,
never from a peer derivation.

---

## Field derivation rules

### Identity (§3.1) — naming canon per D4.1

- `name` — **type-dependent**:
  - `type: skill` → directory slug (e.g. `.claude/skills/checkpoint/SKILL.md` → `"checkpoint"`)
  - `type: agent` / `team` → basename without extension
  - All other types → basename without extension
  - On collision at validate time, the validator (`validate-catalog.js`)
    fails with a Duplicate-name error naming the two conflicting paths.
    Do NOT pre-disambiguate — emit the natural name and let the
    validator surface the conflict.
- `path` — repo-root-relative, forward slashes.
- `type` — apply `.claude/sync/label/lib/derive.js` `detectType()` rules
  first (path + extension + directory heuristics). Override only if
  frontmatter clearly contradicts (e.g. a file under `.claude/skills/`
  that has no SKILL.md marker and reads as a doc → `type: doc`).
- `purpose` — one-sentence description from the file's own documentation
  header or YAML `description:`. If absent, synthesize in the imperative:
  "Validates X before commit." not "This script is the one that handles
  validating X."

### Scope & sync-action (§3.2)

- `source_scope` — where the code/definition belongs:
  - `universal` — travels to any Claude Code project
  - `user` — tied to the operator (lives in `~/.claude/`)
  - `project` — tied to this repo
  - `machine` — tied to this computer
  - `ephemeral` — session-local
- `runtime_scope` — where the file's runtime effects land. Often
  differs from source_scope (universal source → project-scoped writes).
  See SCHEMA.md §3.2.
- `portability` — what the sync tool should do:
  - `portable` — copy as-is
  - `sanitize-then-portable` — copy + edit specific fields (populates
    `sanitize_fields`)
  - `portable-with-deps` — copy + document external deps
  - `not-portable` — don't copy
  - `not-portable-product` — application code that never crosses repos
- `status` — lifecycle state: `active | complete | deferred | stub |
  gated | deprecated | archived | generated | partial`. Agents MUST NOT
  emit `partial` — it's the hook's transient marker.
  - **`generated` pairs with portability** (D3.2 / SCHEMA.md §8.4a):
    use `{status: generated, portability: not-portable}` or
    `{status: generated, portability: portable-with-deps}`.

### Dependencies (§3.3) — FOUR distinct arrays, each object-shaped (D2.3)

- `dependencies` — other registry files this one needs. Object form:
  `{name, hardness: "hard" | "soft", kind: "spawn" | "import" | "reference" | "invoke"}`
- `external_services` — third-party APIs. Object form:
  `{name, hardness: "hard" | "soft"}`
- `tool_deps` — external CLI binaries (gh, gitleaks, go, node, bash).
  Object form: `{name, hardness}`
- `mcp_dependencies` — MCP server tool names. Object form:
  `{name, hardness}`
- `required_secrets` — env var names (SONAR_TOKEN, GITHUB_TOKEN).
  Object form: `{name, hardness}` — `hardness` is meaningful even here
  (some secrets are soft-optional, e.g. WEATHER_API_KEY).

Empty array is valid. Each array maps to a distinct operator-remediation
flow; do NOT merge them.

### Provenance (§3.4) — lineage object shape locked per D2.1

- `lineage` — where the file came from. **`null` for native files.**
  When populated, object shape:
  `{source_project, source_path, source_version, ported_date}` —
  exactly these 4 keys, no others. `additionalProperties: false` at the
  schema layer — extra keys fail validation.
  - `source_project` — e.g. `"sonash"`, `"jason-os"`
  - `source_path` — repo-relative path in the source repo at port time
  - `source_version` — free-form version identifier (`"v1.4"`, `"v2.0"`)
  - `ported_date` — ISO-8601 date (`YYYY-MM-DD`)
  - For lineage documented in markdown body (`**Lineage:** ...`), parse
    it into the 4-field object. Port-process details (what was
    sanitized, what was dropped) belong in `migration_metadata`, NOT
    in lineage.
- `supersedes` — array of file names this one replaces.
- `superseded_by` — name of replacement, null if still current.

### Sync mechanics (§3.5)

- `sanitize_fields` — string identifiers that need per-repo replacement
  when porting. Empty when `portability != sanitize-then-portable`.
- `state_files` — paths the file reads/writes in `.claude/state/`:
  `[{path, access: "read" | "write" | "read-write"}]`

### Catch-all (§3.6)

- `notes` — free-text nuances that don't fit structured fields.
- `data_contracts` — implicit-schema couplings with other files:
  `[{contract_name, target_file, role, fields}]`.

### Relationships (§3.7)

- `component_units` — sub-units that compose this file:
  `[{name, path, role}]`. Empty for uniform files.
- `composite_id` — which composite this file belongs to, or null.

### Copy detection (§3.8)

- `is_copy_of` — path to canonical source if copy, else null.
- `has_copies_at` — if this IS canonical, paths where copies live; else `[]`.
- `content_hash` — SHA of content at scan time.
  - **Omit-if-unknown rule (D2.4):** if the runner does NOT provide a
    `content_hash`, OMIT the field entirely from your output. Do NOT
    emit `content_hash: null` — the schema requires a string when
    present. Omission is the explicit signal for "unknown at dispatch."

### Granularity (§3.9)

- `sections` — per-section records for mixed-scope files (rare, ~10–20
  files across both repos). Empty array is the norm. When populated,
  use the §4 section-record shape from SCHEMA.md.

---

## Per-type extensions (SCHEMA.md §9)

Apply ONLY the sub-section matching the file's type:

- `skill` → §9.1 (reference_layout, supports_parallel, fallback_available)
- `agent | team` → §9.2 (pipeline_phase, model, maxTurns, tools,
  disallowedTools, color, runtime_lifecycle)
- `hook` → §9.3a — **required**: event, matcher, if_condition,
  continue_on_error, exit_code_action, async_spawn, kill_switch_env
- `hook-lib` → §9.3b — **no required per-type fields** (D2.5 split).
  Shared library code consumed by hooks, not a wired hook itself.
  Do NOT emit null event/matcher/etc. fields on hook-lib records;
  omit them.
- `memory | canonical-memory` → §9.4 (memory_type, tenet_number,
  has_canonical, append_only, recency_signal, canonical_staleness_category)
- `script | script-lib` → §9.5 (entry_point, shells_out, test_coverage,
  module_system)
- `tool | tool-file` → §9.6 (language, requires_build, binary_present,
  install_target, secret_config_required)
- `research-session` → §9.7 (session_type, depth, claim_count, source_count)
- `plan | planning-artifact` → §9.8 (plan_scope)
- `ci-workflow` → §9.9 (trigger_events, runner_os, action_pins, secret_bearing)
- composite records (separate catalog) → §9.10 (workflow_family,
  gsd_phase, port_strategy)
- `git-hook` → §9.11 — **required**: `git_hook_event` (one of 18 values;
  see SCHEMA.md §8.5a). Distinct from `type: hook` — git-hook fires on
  git-native events (pre-commit, pre-push, etc.), not Claude-Code events.
- `test` → §9.12 — no required per-type fields. Classification type for
  files under `**/__tests__/**` or matching `*.{test,spec}.{js,cjs,mjs,ts}`.

---

## Piece 3 machinery fields (CATALOG_SHAPE.md §4)

Agents emit these unless the hook is managing them directly:

- `pending_agent_fill: false` — agent is now done; clear the flag.
- `manual_override: []` — fresh derivation, no overrides yet (the audit
  skill merges with existing overrides from the catalog).
- `needs_review: []` — agents don't populate this; cross-check does.
- `last_hook_fire` — current UTC ISO-8601 timestamp.
- `schema_version: "1.3"` — current schema version per structural-fix
  D3.4. Records stamped `"1.2"` still validate under v1.3 (additive)
  but new derivations stamp `"1.3"`.

---

## Confidence reporting (D2.2 — schema v1.3)

Emit a top-level `confidence` object keyed by field name. Schema v1.3
(D2.2) defines this as an optional top-level object on every file
record and composite record — verify.js and cross-check.js accept it
directly. Pre-v1.3 stripped this field before validation; that
strip-before-validate is **gone** in v1.3.

**Coverage rule (required):** emit a confidence entry for **every
field you output in the record**, except:

- `path` and `confidence` (reserved / self-referential)
- The 5 machinery fields: `pending_agent_fill`, `manual_override`,
  `needs_review`, `last_hook_fire`, `schema_version`
  (orchestrator-owned; cross-check excludes them)

If you omit a field entirely (e.g. `content_hash` when unknown per
D2.4), also omit its confidence entry — no orphan confidence keys.

**Scoring rule:** cross-check treats a missing confidence entry as
`0.0` (triggers needs_review). Do NOT leave settled fields without
confidence — the cross-check cannot distinguish "I forgot to report
confidence" from "this field is uncertain". Score every emitted field:

- **0.90 – 1.00** — strong evidence (path+heuristic+frontmatter agree)
- **0.80 – 0.89** — good evidence, minor ambiguity
- **Below 0.80** — genuine ambiguity (multiple plausible values,
  frontmatter conflicts with heuristic, etc.) — cross-check flags
  for review

**Output shape (MUST match CATALOG_SHAPE.md §3 + SCHEMA.md §9 + the §4
machinery fields + the confidence object):**

```json
{
  "name": "foo",
  "path": ".claude/hooks/foo.js",
  "type": "hook",
  "purpose": "Blocks destructive Bash commands before execution.",
  "source_scope": "universal",
  "runtime_scope": "project",
  "portability": "sanitize-then-portable",
  "status": "active",
  "notes": "",
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
  "data_contracts": [],
  "component_units": [],
  "composite_id": null,
  "is_copy_of": null,
  "has_copies_at": [],
  "sections": [],
  "event": "PreToolUse",
  "matcher": "^Bash$",
  "if_condition": null,
  "continue_on_error": false,
  "exit_code_action": "block",
  "async_spawn": false,
  "kill_switch_env": null,
  "pending_agent_fill": false,
  "manual_override": [],
  "needs_review": [],
  "last_hook_fire": "2026-04-22T12:00:00Z",
  "schema_version": "1.3",
  "confidence": {
    "name": 1.0,
    "type": 0.98,
    "purpose": 0.90,
    "source_scope": 0.95,
    "runtime_scope": 0.95,
    "portability": 0.65,
    "status": 0.95,
    "notes": 1.0,
    "dependencies": 0.95,
    "external_services": 0.95,
    "tool_deps": 0.95,
    "mcp_dependencies": 0.95,
    "required_secrets": 0.95,
    "lineage": 0.95,
    "supersedes": 0.95,
    "superseded_by": 0.95,
    "sanitize_fields": 0.95,
    "state_files": 0.95,
    "data_contracts": 0.95,
    "component_units": 0.95,
    "composite_id": 0.95,
    "is_copy_of": 0.95,
    "has_copies_at": 0.95,
    "sections": 0.95,
    "event": 0.98,
    "matcher": 0.95,
    "if_condition": 0.95,
    "continue_on_error": 0.95,
    "exit_code_action": 0.95,
    "async_spawn": 0.95,
    "kill_switch_env": 0.95
  }
}
```

Every non-reserved / non-machinery field has a confidence entry. Empty
arrays and null values still get confidence — "I'm confident this is
empty/null" is meaningful.

Nested `{value, confidence}` shapes are NOT accepted — the flat record
+ separate top-level `confidence` object is the one on-disk contract.

---

## v1.3 cheat-sheet (D5.5) — critical shapes at a glance

Read this when in doubt about field shape. All shapes validate against
`.claude/sync/schema/schema-v1.json` (v1.3).

```json
{
  "lineage_shape_native": null,
  "lineage_shape_ported": {
    "source_project": "sonash",
    "source_path": ".claude/skills/foo/SKILL.md",
    "source_version": "v1.0",
    "ported_date": "2026-04-22"
  },
  "external_dep_shape": {"name": "gh", "hardness": "hard"},
  "dependency_shape": {
    "name": "convergence-loop",
    "hardness": "soft",
    "kind": "reference"
  },
  "confidence_shape": "{field_name: score_0..1} for EVERY emitted field except path / confidence / 5 machinery fields — see Confidence reporting §. Missing entry = 0.0 = needs_review. Abbreviated here:",
  "confidence_shape_partial": {
    "type": 1.0,
    "source_scope": 0.95,
    "portability": 0.70
  },
  "hook_per_type": {
    "type": "hook",
    "event": "PreToolUse",
    "matcher": "^Bash$",
    "if_condition": null,
    "continue_on_error": false,
    "exit_code_action": "block",
    "async_spawn": false,
    "kill_switch_env": null
  },
  "hook_lib_per_type": {
    "type": "hook-lib"
  },
  "git_hook_per_type": {
    "type": "git-hook",
    "git_hook_event": "pre-commit"
  },
  "test_per_type": {
    "type": "test"
  },
  "content_hash_unknown": "OMIT THE FIELD — do not emit content_hash: null",
  "generated_pairing_valid": [
    "{status: generated, portability: not-portable}",
    "{status: generated, portability: portable-with-deps}"
  ]
}
```
