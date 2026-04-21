# PLAN — piece-2-schema-design

**Date:** 2026-04-19 (Session #8)
**Topic:** Classification schema for sync-mechanism registry
**Source of decisions:** DECISIONS.md (same directory), 32 decisions (D1–D32)
**Effort estimate:** **L** (~4–6 hours active work across one session; Piece 3 planning can start immediately after)
**Status:** Ready to execute

---

## Goal

Produce the authoritative schema artifacts for the sync-mechanism registry,
codifying the 32 decisions in DECISIONS.md as machine-readable specs that Piece
3 (labeling mechanism), Piece 4 (registry), and Piece 5 (sync engine) can
consume without re-deriving the design.

---

## Artifacts this plan produces

| Path | Purpose |
|---|---|
| `.claude/sync/schema/SCHEMA.md` | Human-readable master spec. The primary reference document. |
| `.claude/sync/schema/enums.json` | Machine-readable enum definitions (type, scope, portability, status, etc.). |
| `.claude/sync/schema/schema-v1.json` | Full machine-readable schema (JSON-schema style) covering universal + per-type + sections + migration-metadata + composites. |
| `.claude/sync/schema/EVOLUTION.md` | Enum-evolution rules, versioning policy, adding-a-new-type process. |
| `.claude/sync/schema/EXAMPLES.md` | Worked examples — one record per type-group with realistic fills. |
| `.planning/BOOTSTRAP_DEFERRED.md` (update) | Remove any Piece 2 items if listed; add pointer to Piece 3 as the next step. |
| Mirror to SoNash | Same 5 files at equivalent paths in SoNash (mirrored architecture per BRAINSTORM §3.3). |

---

## Step structure

Each step: concrete file paths, implementation detail, "Done when:" criteria.

---

### Step 1 — Create directory structure

**Path:** `.claude/sync/schema/`

Create the directory (and parent `.claude/sync/` if needed). This will host all
schema artifacts. Also serves as the target location for future sync-mechanism
code.

**Done when:**
- `.claude/sync/schema/` exists in JASON-OS
- Directory is empty and ready for artifacts
- Does NOT create any .gitkeep or placeholder — actual files arrive in Step 2

**Depends on:** none
**Effort:** S (1 min)

---

### Step 2 — Write SCHEMA.md (human-readable master spec)

**Path:** `.claude/sync/schema/SCHEMA.md`

The canonical document. Content structure:

1. **Header** — Schema version (v1.0), last updated, status, cross-reference to DECISIONS.md
2. **§1 Purpose and scope** — What this schema describes (registry records for files + composites), what it doesn't describe (sync engine behavior, labeling mechanism — those are Pieces 3–5)
3. **§2 Record types** — File records (main `files.jsonl` catalog) vs composite records (separate `composites.jsonl` catalog)
4. **§3 Universal file-level columns** — All 26 columns from DECISIONS.md §1–6, §8, §9, in table form with type, description, example value, required/optional, rationale cross-reference
5. **§4 Sections** — The `sections[]` structure (D17–D19). Include heading identification rule (heading + last_known_lines hint).
6. **§5 Migration-metadata** — The optional sub-object (D32)
7. **§6 Per-type extensions** — 9 subsections, one per type-group. Each lists the per-type fields with type/description/example.
8. **§7 Composites** — How composite records work (D31). Separate catalog. Composite-specific fields. `composite_id` back-reference on file records.
9. **§8 Enums** — All enums listed inline with all legal values. Cross-reference to `enums.json`.
10. **§9 Evolution** — Brief summary, full detail in `EVOLUTION.md`.
11. **§10 Version history** — v1.0 entry.

Use tables for field listings. Cite D-numbers from DECISIONS.md for every rationale.

**Done when:**
- File exists at the path
- All 26 universal columns documented
- All 41 per-type extensions documented in 9 subsections
- Migration-metadata section documented
- Composites section documents the separate catalog
- Every enum lists every legal value
- Version number (v1.0) in header and version-history table
- Cross-references to DECISIONS.md are correct

**Depends on:** Step 1
**Effort:** L (~1.5–2 hours)

---

### Step 3 — Write enums.json (machine-readable enum reference)

**Path:** `.claude/sync/schema/enums.json`

Every enum defined in one place, machine-queryable:

```json
{
  "schema_version": "1.0",
  "enums": {
    "type": {
      "values": ["skill", "agent", "team", "hook", "hook-lib", "memory",
                 "canonical-memory", "script", "script-lib", "tool",
                 "tool-file", "research-session", "plan", "planning-artifact",
                 "todo-log", "config", "settings", "ci-workflow", "doc",
                 "output-style", "keybindings", "shared-doc-lib", "database",
                 "other"],
      "description": "File type classification",
      "decision_ref": "D15"
    },
    "source_scope": {
      "values": ["universal", "user", "project", "machine", "ephemeral"],
      "description": "Where the file's code/definition belongs",
      "decision_ref": "D20"
    },
    "runtime_scope": { "...": "same values as source_scope" },
    "portability": {
      "values": ["portable", "sanitize-then-portable", "portable-with-deps",
                 "not-portable", "not-portable-product"],
      "description": "What the sync tool does with this file",
      "decision_ref": "D21"
    },
    "status": { "...": "8 values per D22" },
    "hook_event": { "...": "9 values per D(Group P3)" },
    "dependency_hardness": { "values": ["hard", "soft"], "decision_ref": "D23" },
    "dependency_kind": { "values": ["spawn", "import", "reference", "invoke"], "decision_ref": "D23" },
    "state_file_access": { "values": ["read", "write", "read-write"], "decision_ref": "D28" },
    "data_contract_role": { "values": ["producer", "consumer", "read-write"], "decision_ref": "D30" },
    "agent_runtime_lifecycle": { "values": ["per-invocation", "per-session", "persistent", "ephemeral"], "decision_ref": "Group P2" },
    "reference_layout": { "values": ["none", "flat", "subdirectory"], "decision_ref": "Group P1" },
    "memory_type": { "values": ["user", "feedback", "project", "reference", "tenet", "index"], "decision_ref": "Group P4" },
    "canonical_staleness_category": { "values": ["fresh", "formatting-only", "semantic-drift", "operationally-wrong", "intentional-scope-difference"], "decision_ref": "Group P4 / contrarian #4" },
    "module_system": { "values": ["cjs", "esm", "none"], "decision_ref": "Group P5 scripts" },
    "tool_language": { "values": ["go", "javascript", "bash", "yaml", "toml", "json", "markdown"], "decision_ref": "Group P5 tools" },
    "session_type": { "values": ["brainstorm", "deep-research", "deep-plan", "hybrid"], "decision_ref": "Group P6" },
    "research_depth": { "values": ["L0-brainstorm", "L1", "L2", "L3", "L4"], "decision_ref": "Group P6" },
    "plan_scope": { "values": ["milestone", "diagnosis", "decisions", "roadmap", "research-program", "deferral-registry", "session-bookmark", "port-ledger", "execution-handoff", "backlog", "cross-pr-learning", "learnings"], "decision_ref": "Group P6" },
    "exit_code_action": { "values": ["block", "warn", "allow"], "decision_ref": "Group P3" },
    "port_strategy": { "values": ["atomic", "partial-ok"], "decision_ref": "D31" },
    "port_status": { "values": ["ported", "partial-port", "sonash-only", "jason-os-only", "in-sync", "not-ported-portable", "not-ported-not-portable"], "decision_ref": "D32" }
  }
}
```

**Done when:**
- File is valid JSON
- Every enum from SCHEMA.md appears here with full value list
- Every enum has a `decision_ref` pointing to DECISIONS.md
- JSON parses without errors (validate with `node -e "JSON.parse(fs.readFileSync('.claude/sync/schema/enums.json'))"`)

**Depends on:** Step 2 (source of enum definitions)
**Effort:** M (~30 min)

---

### Step 4 — Write schema-v1.json (machine-readable full schema)

**Path:** `.claude/sync/schema/schema-v1.json`

JSON-schema-style specification of a file record AND a composite record.
Validates individual records, enumerates required vs optional, references
`enums.json` for enum values.

Structure (sketch):

```json
{
  "$schema": "https://json-schema.org/draft-07/schema",
  "version": "1.0",
  "records": {
    "file_record": {
      "type": "object",
      "required": ["name", "path", "type", "purpose", "source_scope",
                   "runtime_scope", "portability", "status", "notes"],
      "properties": {
        "name": { "type": "string" },
        "path": { "type": "string" },
        "type": { "$ref": "enums.json#/enums/type" },
        "...": "..."
      }
    },
    "composite_record": { "...": "..." },
    "section_record": { "...": "..." },
    "migration_metadata": { "...": "..." }
  }
}
```

Include:
- All 26 universal file-record fields (properties)
- Required vs optional (required: name, path, type, purpose, source_scope, runtime_scope, portability, status, notes — core identity/sync fields)
- Sub-schemas for nested types (`dependencies[]` entry shape, `lineage` object, `section_record`, `migration_metadata`, `data_contract` entry, `state_file` entry, `component_unit` entry, `action_pin` for CI)
- Per-type conditional extensions (use JSON Schema `if/then` patterns keyed on `type` field)
- Composite record separate schema with its 3 extra fields

**Done when:**
- File is valid JSON Schema draft-07
- Every required field from DECISIONS.md is marked required
- Every per-type extension is conditionally applied based on `type` value
- Schema can validate a hand-written example record (test in Step 7)
- Validates as valid JSON Schema via any standard validator

**Depends on:** Steps 2, 3
**Effort:** L (~1 hour)

---

### Step 5 — Write EVOLUTION.md

**Path:** `.claude/sync/schema/EVOLUTION.md`

Documents the schema-change process. Content:

1. **Versioning policy.** Semver-lite: major.minor. v1.0 is current.
2. **Adding a new enum value** — minor bump, non-breaking. Example walkthrough (what changes where: enums.json, SCHEMA.md, schema-v1.json, EXAMPLES.md if relevant).
3. **Adding a new universal column** — minor bump, non-breaking IF optional with default. Breaking IF required.
4. **Adding a new per-type extension field** — minor bump, non-breaking.
5. **Adding a new type value** — minor bump. Rule: files in `other` that match the new type are upgraded automatically by the next sync scan.
6. **Removing a value or field** — breaking. Major bump. Explicit migration plan required.
7. **Renaming** — breaking. Major bump. Migration plan required.
8. **Schema itself is NOT a registry record** (D20 Phase-1 Q4).
9. **Mirror rule:** any change to schema in one repo must be applied to the mirror repo before the next sync cycle.

**Done when:**
- All rules documented
- Example walkthrough for "add a new enum value" included
- Example walkthrough for "add a new type value" included
- Mirror rule documented

**Depends on:** Step 2 (cross-references to SCHEMA.md)
**Effort:** M (~30 min)

---

### Step 6 — Write EXAMPLES.md

**Path:** `.claude/sync/schema/EXAMPLES.md`

Realistic worked examples. For each major type-group, provide one complete
record showing every relevant field filled in. This is the "how do I write a
record" reference for humans and the Piece 3 labeling mechanism.

Examples to include:

1. `skill` — `checkpoint` (simple, uniform, no sections)
2. `skill` — `deep-research` (complex, composite member, dependencies list multiple agents)
3. `agent` — one of the deep-research agents (shows agent-specific fields, composite_id)
4. `team` — `research-plan-team` (shows HTML-metadata parsing note, composite_id)
5. `hook` — `block-push-to-main.js` (shows event, matcher, continue_on_error, state_files)
6. `hook-lib` — `symlink-guard.js` (shows the cross-boundary import pattern)
7. `memory` — `feedback_no_broken_widgets` (MIXED-content file, showing `sections[]` usage with 2 sections)
8. `canonical-memory` — a git-tracked counterpart
9. `script` + `script-lib` — `session-end-commit.js` + `safe-fs.js` (safe-fs shows `has_copies_at` populated)
10. `tool` — `statusline-binary` (source_scope=universal, runtime_scope=machine, requires_build=true)
11. `research-session` — Piece 1a discovery-scan session (directory-record)
12. `planning-artifact` — DIAGNOSIS.md from THIS plan (plan_scope: diagnosis)
13. `doc` — CLAUDE.md (MIXED-content file, `sections[]` with 4+ sections for Section 1 project stack vs Section 5 universal anti-patterns etc.)
14. `config` vs `settings` — `.nvmrc` and `.claude/settings.json` side-by-side
15. `ci-workflow` — `.github/workflows/semgrep.yml` (shows trigger_events, action_pins)
16. `output-style` — (use a hypothetical/template if neither repo has one yet)
17. `composite` — `deep-research-workflow` (shows separate catalog, 3 composite-specific fields, component_units listing)
18. `composite` — `ecosystem-audit-workflow` (from SoNash, validates `shared-doc-lib` usage, atomic port)
19. A file WITH migration-metadata populated (e.g. JASON-OS `checkpoint` ported from SoNash)
20. A file with `migration_metadata: null` (native)

**Done when:**
- 20 worked examples present
- Each example shows the correct core + per-type + migration_metadata + sections (where applicable) fields
- At least 2 examples exercise the `sections[]` structure
- At least 2 examples show composites (1 record from files.jsonl perspective + 1 full composite record)
- Every example has a short "what this illustrates" header

**Depends on:** Steps 2, 3, 4
**Effort:** L (~1.5 hours)

---

### Step 7 — Validate the schema with a test record

**Run command:**
```bash
# Pseudo-validation: write one test record as JSON, run it through the
# schema-v1.json validator.
node -e "
const schema = require('./.claude/sync/schema/schema-v1.json');
const record = {
  name: 'checkpoint',
  path: '.claude/skills/checkpoint/SKILL.md',
  type: 'skill',
  purpose: 'Save session state for recovery after compaction or failures.',
  source_scope: 'universal',
  runtime_scope: 'project',
  portability: 'portable',
  status: 'active',
  dependencies: [],
  external_services: [],
  tool_deps: [],
  mcp_dependencies: [],
  required_secrets: [],
  lineage: null,
  supersedes: [],
  superseded_by: null,
  sanitize_fields: [],
  state_files: [],
  notes: '',
  data_contracts: [],
  component_units: [],
  sections: [],
  is_copy_of: null,
  has_copies_at: [],
  content_hash: 'sha256:(to-be-computed-by-scan)',
  composite_id: null,
  migration_metadata: null,
  reference_layout: 'none',
  supports_parallel: true,
  fallback_available: false
};
// use ajv or similar
const Ajv = require('ajv');
const ajv = new Ajv();
const validate = ajv.compile(schema.records.file_record);
if (!validate(record)) {
  console.error(JSON.stringify(validate.errors, null, 2));
  process.exit(1);
}
console.log('PASS');
"
```

**Done when:**
- Test record for a `skill` validates without errors
- Test record for a `hook` with state_files populated validates
- Test record for a `memory` with `sections[]` populated validates
- Test record for a file with `migration_metadata` populated validates
- Test composite record validates against the composite_record sub-schema
- At least 1 failing test record (e.g. missing `name`) fails validation with a clear error

**Depends on:** Steps 4, 6
**Effort:** M (~30 min — includes writing the test harness)

---

### Step 8 — Update BOOTSTRAP_DEFERRED.md

**Path:** `.planning/jason-os/BOOTSTRAP_DEFERRED.md`

Remove any Piece 2 schema items listed as deferred (if present — the bootstrap
was scoped before Piece 2 started). Add a pointer forward to Piece 3 (labeling
mechanism) as the next sync-mechanism step.

**Done when:**
- BOOTSTRAP_DEFERRED.md references Piece 2 as COMPLETE
- Points forward to `/deep-plan piece-3-labeling-mechanism` as the next step
- Lists the schema artifacts' paths as reference material for Piece 3

**Depends on:** Steps 2–7
**Effort:** S (5 min)

---

### Step 9 — Mirror to SoNash

**Target:** SoNash equivalent paths.

Per BRAINSTORM §3.3 symmetric architecture, the schema MUST live in both
repos. Copy all 5 files from `.claude/sync/schema/` into SoNash at the same
relative path. Mirror commit per Session 6 T23 / Session 7 T24 precedent —
requires explicit user approval before touching SoNash.

**Done when:**
- `.claude/sync/schema/SCHEMA.md` exists in SoNash at equivalent path
- `.claude/sync/schema/enums.json` exists in SoNash
- `.claude/sync/schema/schema-v1.json` exists in SoNash
- `.claude/sync/schema/EVOLUTION.md` exists in SoNash
- `.claude/sync/schema/EXAMPLES.md` exists in SoNash
- SoNash commit message notes "JASON-OS mirror" per prior precedent
- No JASON-OS-specific content leaked (example values should be generic; if they reference JASON-OS paths as examples, adjust to show both-repo perspective or generic paths)

**User gate:** this step requires explicit user approval before proceeding — writing to SoNash is never autonomous per project memory.

**Depends on:** Step 8
**Effort:** S (10 min once approved)

---

### Step 10 — Audit checkpoint (code-reviewer on new/modified files)

Per deep-plan skill audit requirement: run the code-reviewer agent on all new
files from Steps 2–6.

**Files to review:**
- `.claude/sync/schema/SCHEMA.md`
- `.claude/sync/schema/enums.json`
- `.claude/sync/schema/schema-v1.json`
- `.claude/sync/schema/EVOLUTION.md`
- `.claude/sync/schema/EXAMPLES.md`
- Updated `.planning/jason-os/BOOTSTRAP_DEFERRED.md`

**Focus areas for review:**
- Consistency between SCHEMA.md and schema-v1.json (every field in one appears in the other)
- Every DECISIONS.md D-number referenced has a real entry
- enums.json values match what SCHEMA.md lists
- EXAMPLES.md records validate against schema-v1.json

**Done when:**
- code-reviewer agent runs against the files
- No CRITICAL findings remain
- Any MEDIUM/LOW findings are addressed or explicitly deferred with rationale

**Depends on:** Steps 2–8
**Effort:** M (~30 min including fixups)

---

### Step 11 — Commit

Single atomic commit bundling all schema artifacts.

**Commit message:**
```
feat(sync-mechanism): Piece 2 schema design — 32 decisions codified

Adds the authoritative classification schema for the sync-mechanism registry.

What landed:
- .claude/sync/schema/SCHEMA.md — human-readable master spec (26 universal
  columns, 41 per-type fields, migration-metadata section, composites catalog)
- .claude/sync/schema/enums.json — machine-readable enum reference
- .claude/sync/schema/schema-v1.json — JSON-schema validation spec
- .claude/sync/schema/EVOLUTION.md — versioning and enum-evolution rules
- .claude/sync/schema/EXAMPLES.md — 20 worked examples across type-groups

Decisions: 32 logged in .planning/piece-2-schema-design/DECISIONS.md (D1–D32).
Contrarian challenges addressed: #1 migration-metadata section, #4
intentional-scope-difference enum value, #5 is_copy_of/has_copies_at/
content_hash columns. OTB #1 composite_id universal column.

Addresses Piece 1a Findings #5.1 (sections[] for content bleed), #5.3
(source_scope/runtime_scope split), #5.4 (data_contracts), #5.5
(install_target captures repo-name suffix).

Next: /deep-plan piece-3-labeling-mechanism

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
```

**Done when:**
- Commit created
- Pre-commit hooks pass
- Working tree clean after commit
- Commit visible in `git log`

**Depends on:** Steps 1–10
**Effort:** S (5 min)

---

## Convergence-loop verification requirement

Per deep-plan skill Phase 3.5: plans of L/XL size MUST verify codebase
assumptions via convergence-loop. This plan's codebase claims:

1. `.claude/sync/` does not currently exist → Step 1 creates it
2. `.claude/sync/schema/` does not currently exist → Step 1 creates it
3. `.planning/jason-os/BOOTSTRAP_DEFERRED.md` exists → referenced in Step 8
4. DECISIONS.md at `.planning/piece-2-schema-design/DECISIONS.md` exists → referenced throughout
5. SoNash repo at `<SONASH_ROOT>\` is accessible → referenced in Step 9

**Verification plan:** run quick filesystem checks before starting Step 1.

---

## Execution routing (handoff guidance per deep-plan Phase 4)

This plan has 11 steps, 3 independent within Steps 2–6 (SCHEMA.md, EVOLUTION.md,
EXAMPLES.md can be drafted in parallel). Suggested route:

- **Route:** Subagent-driven execution
- **Parallelization:** Steps 2–6 can run as 3 parallel subagents after Step 1
  completes (SCHEMA.md, enums.json+schema-v1.json combined, EVOLUTION.md+EXAMPLES.md
  combined — adjust as needed)
- **Serial gate:** Step 7 (validation) must run after 4+6; Step 10 (audit) after
  all others; Step 11 (commit) last

Alternative route: Manual execution one step at a time if you prefer to review
each artifact as it's written. Lower throughput, higher control.

---

## Effort summary

| Step | Size | Notes |
|---|---|---|
| 1 | S | Directory creation |
| 2 | L | SCHEMA.md — the main artifact |
| 3 | M | enums.json |
| 4 | L | schema-v1.json — JSON Schema |
| 5 | M | EVOLUTION.md |
| 6 | L | EXAMPLES.md — 20 examples |
| 7 | M | Validation harness |
| 8 | S | BOOTSTRAP_DEFERRED update |
| 9 | S | SoNash mirror (user-gated) |
| 10 | M | Audit checkpoint |
| 11 | S | Commit |

**Total:** L overall (~4–6 hours active work). Parallelization in Steps 2–6 can
compress the wall-clock significantly.

---

## Post-execution next step

After this plan executes, the next sync-mechanism plan is:

**`/deep-plan piece-3-labeling-mechanism`** — How labels actually get attached to
files. Covers: in-file frontmatter vs external manifest vs hybrid; hook behavior
on file write; first-pass content-analysis agent for sections; mass back-fill
strategy.

Piece 3 consumes:
- `.claude/sync/schema/SCHEMA.md` (the schema this plan produces)
- `.claude/sync/schema/schema-v1.json` (for labeling tool validation)
- DECISIONS.md (for context on why the schema looks the way it does)

---

## Sign-off

Plan ready for approval. Upon approval: Phase 4 complete, routing to
execution (subagent-driven recommended).
