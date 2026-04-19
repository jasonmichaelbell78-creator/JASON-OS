# D13 — Schema-Field Candidates for Classification Schema

**Agent:** D13 (schema-field surveyor, Wave 2 analysis)
**Date:** 2026-04-18
**Input sources:** 13 Wave 1 MD Learnings sections + 13 JSONL files + R-frpg RESEARCH_OUTPUT.md
**Total unique candidate fields:** 65
**After deduplication:** 63 (2 absorbed: related_memories → related; port_lineage/version_lineage → lineage)

---

## Summary

This document consolidates every schema-field candidate surfaced across 13 Wave 1 discovery agents. It is the primary input to Piece 2 schema design. Piece 2 will decide which fields to include; D13's job is to surface everything worth considering without dropping candidates.

Fields are organized into 6 sections. Section 6 contains the recommended MVP schema subset (~12 fields) for Piece 2 to start with.

---

## Section 1: Universal Fields

These fields apply to ALL unit types (skill, agent, hook, memory, script, tool, research-session, plan, workflow, config, ci-workflow, doc). Every registry record should have these.

### 1.1 `scope` [PRIORITY: HIGH]

**Type:** enum — `universal | user | project | machine | ephemeral`

The portability scope of the unit relative to user, project, machine, and session contexts. The 5-value enum from R-frpg, confirmed as load-bearing across all 13 Wave 1 agents. Five independent systems (chezmoi, VSCode, Nx, XDG, Agent Skills) converge on these same values, providing strong external validation.

**Why it matters for sync:** Only `universal` and `user` files travel cross-project; `project`, `machine`, and `ephemeral` stay local. This is the primary filter that determines whether a unit is even a sync candidate.

**Source agents:** R-frpg, all 13 Wave 1 agents
**Conflicts with:** source_scope, runtime_scope (see Section 2 for those per-category variants)

---

### 1.2 `portability` [PRIORITY: HIGH]

**Type:** enum — `portable | sanitize-then-portable | not-portable`

Actionability of the unit for cross-project sync. Separate from scope: a `universal` unit may still need sanitization before it can be moved. User Q4 explicitly flagged portability as separate from scope.

**Why it matters for sync:** `portable` = copy as-is. `sanitize-then-portable` = copy + edit (specific fields listed in `sanitize_fields`). `not-portable` = do not copy. All three values saw clean usage across all 13 agents with no edge cases requiring a 4th value.

**Source agents:** R-frpg, all 13 Wave 1 agents

---

### 1.3 `name` [PRIORITY: HIGH]

**Type:** string

Human-readable canonical identifier, matching the filename slug where applicable. D4a confirmed that frontmatter name matches filename slug in all JASON-OS cases, making automated parsing reliable.

**Source agents:** All 13 Wave 1 agents

---

### 1.4 `path` [PRIORITY: HIGH]

**Type:** string

Relative path to the unit's primary file or directory from the repo root. Fundamental lookup key for sync tooling. Already present in all Wave 1 JSONL records.

**Source agents:** All 13 Wave 1 agents

---

### 1.5 `type` [PRIORITY: HIGH]

**Type:** enum — `skill | agent | team | command | hook | hook-lib | memory | script | script-lib | tool | tool-file | research-session | plan | planning-artifact | learnings-doc | todo-log | config | ci-workflow | doc | composite`

Primary category of the unit within the JASON-OS taxonomy. Load-bearing for per-category field applicability — which Section 2 fields are relevant depends on type. D2 flagged `team` as structurally distinct from `agent` (HTML comment metadata vs YAML frontmatter).

**Source agents:** All 13 Wave 1 agents

---

### 1.6 `purpose` [PRIORITY: HIGH]

**Type:** string

One-sentence human-readable description of what the unit does. Already present in all Wave 1 JSONL records. Essential for human-readable synthesis and search.

**Source agents:** All 13 Wave 1 agents

---

### 1.7 `status` [PRIORITY: HIGH]

**Type:** enum — `active | deferred | archived | deprecated | stub | gated | complete`

Lifecycle state of the unit. Surfaced across multiple agents in different forms (D4a: `active`, D7: `complete/active/archived`, D8: `active/complete/deferred/gated`, D1a: `stub_level` concept). Consolidated here into a single field — `stub` subsumes D1a's `stub_level` concept.

**Why it matters for sync:** `deprecated` units should not be promoted; `stub` units may need full replacement in the target rather than copy-forward; `deferred` units may depend on infrastructure that doesn't exist yet.

**Source agents:** D4a, D4b-1, D4b-2, D7, D8
**Conflicts with:** stub_level (absorbed into status.stub)

---

### 1.8 `dependencies` [PRIORITY: HIGH]

**Type:** array of strings

List of other registry units this unit directly calls or depends on at runtime. Core of the dependency graph. D3 noted the current schema doesn't distinguish hard vs soft dependencies — see `dependency_hardness` in Section 5.

**Source agents:** All 13 Wave 1 agents

---

### 1.9 `external_refs` [PRIORITY: HIGH]

**Type:** array of strings

External services, APIs, CLIs, or MCP servers this unit depends on. Already in Wave 1 JSONL schema. D2 recommended splitting into mcp_dependencies vs external_services; D9 recommended required_secrets as a separate field — see Section 5 for those finer-grained variants.

**Source agents:** D1a, D1b, D2, D3, D6, D9

---

### 1.10 `portability_notes` [PRIORITY: MEDIUM]

**Type:** string

Free-text explanation of WHY a unit requires sanitization or is not portable. Currently embedded in the unstructured `notes` field. A dedicated field enables automated extraction of sanitization rationale.

**Source agents:** D4a

---

### 1.11 `notes` [PRIORITY: HIGH]

**Type:** string

Free-text catch-all for observations, caveats, or nuances not captured by structured fields. Already present in all Wave 1 JSONL records. Important to preserve even as more structured fields are added — some nuances require prose.

**Source agents:** All 13 Wave 1 agents

---

## Section 2: Per-Category Fields

These fields are relevant for specific unit types only.

### 2A: Skills

#### `stub_level` [PRIORITY: MEDIUM]

**Type:** enum — `production | stub | planned`

Whether this skill is a production implementation, a v0 stub with documented upgrade trigger, or a planned placeholder. D1a: "add-debt is explicitly a v0 stub with a documented upgrade trigger. Stubs may need full replacement in SoNash rather than copy-forward." **Note:** Consolidatable into the `status` field as the 'stub' value — Piece 2 to decide.

**Source agents:** D1a | **Conflicts with:** status

---

#### `reference_layout` [PRIORITY: LOW]

**Type:** enum — `none | flat | subdirectory`

How companion documentation files are organized relative to the main SKILL.md. D1a: "flat (REFERENCE.md at skill root) vs subdirectory (pr-review's reference/ dir). Affects tooling that auto-discovers companion docs." Subdirectory layout requires `**/*.md` at 2+ depth glob, not just `*/REFERENCE.md`.

**Source agents:** D1a | **Conflicts with:** component_units (partially overlaps)

---

#### `deferred_sections` [PRIORITY: MEDIUM]

**Type:** array of strings

Named phases, steps, or infrastructure items explicitly marked DEFERRED within this skill. D1b: "session-begin and session-end have significant deferred surfaces; knowing this upfront signals sync risk." A skill with many deferred sections may depend on infrastructure that doesn't exist in the target environment.

**Source agents:** D1b

---

#### `deferred_infrastructure` [PRIORITY: LOW]

**Type:** array of strings

Specific systems or hooks the skill waits on that have not yet been implemented. Distinct from `deferred_sections` (which are internal deferred steps) — these are external blockers.

**Source agents:** D1b | **Conflicts with:** deferred_sections (related but distinct)

---

#### `has_self_audit_phase` [PRIORITY: LOW]

**Type:** boolean

Whether this skill includes a self-audit script or phase. D1b: "signals a quality tier distinction." Skills with self-audit phases are more mature with better automated quality gates.

**Source agents:** D1b

---

#### `active_scripts` [PRIORITY: MEDIUM]

**Type:** array of strings

Node.js or Python scripts actually invoked by this skill (not just conceptual neighbors). D1b: "more useful than dependencies for sync risk assessment." If the script doesn't exist in the target environment, the skill breaks.

**Source agents:** D1b | **Conflicts with:** dependencies (more specific)

---

#### `agent_types_spawned` [PRIORITY: HIGH]

**Type:** array of strings

Named agent types (subagent_type values) that this skill dispatches. D1a: "An environment without a contrarian-challenger agent definition can't run deep-research Phase 3." Enables automated compatibility checking before sync.

**Source agents:** D1a, D2

---

### 2B: Agents

#### `pipeline_phase` [PRIORITY: MEDIUM]

**Type:** string

For agents that are part of a sequential pipeline, the phase number or label (e.g., "Phase 2.5", "Phase 3.97"). D2: "the primary sort key for pipeline sequencing."

**Source agents:** D2

---

#### `model` [PRIORITY: MEDIUM]

**Type:** string

LLM model identifier used by this agent. D2: "sonnet vs opus directly affects token cost." Opus agents are disproportionately expensive and worth flagging in sync cost analysis.

**Source agents:** D2

---

#### `maxTurns` [PRIORITY: MEDIUM]

**Type:** integer

Maximum turns allowed per invocation. D2: "Absence means unbounded" — a cost and safety control gap. Null vs integer has meaningful distinction.

**Source agents:** D2

---

#### `disallowedTools` [PRIORITY: MEDIUM]

**Type:** array of strings

Tools this agent is explicitly prevented from using. D2: "null vs [] vs ['Agent'] to distinguish: not declared / explicitly none / explicitly blocked." `disallowedTools:['Agent']` prevents nested spawning; absence allows it.

**Source agents:** D2

---

#### `color` [PRIORITY: LOW]

**Type:** string

Visual color identifier in Claude Code UI. Appears on 2 of 8 JASON-OS agents. Cosmetic but worth preserving on sync to maintain UI identity.

**Source agents:** D2

---

#### `runtime_lifecycle` [PRIORITY: MEDIUM]

**Type:** enum — `per-invocation | per-session | persistent | ephemeral`

The temporal persistence of this unit's runtime instances. D2: "should distinguish between a unit's definition scope (universal) and its runtime lifecycle (ephemeral). Current R-frpg enum conflates these." Agent definitions are universal; agent instances are ephemeral.

**Source agents:** D2 | **Conflicts with:** scope (for runtime aspect)

---

### 2C: Hooks

#### `event` [PRIORITY: HIGH]

**Type:** enum — `PreToolUse | PostToolUse | SessionStart | Stop | SubagentStop | Notification`

Claude Code hook event type. D3: "should be a first-class field for indexing." Already extracted into existing_metadata but needs promotion. Load-bearing for hook sync.

**Source agents:** D3

---

#### `matcher` [PRIORITY: HIGH]

**Type:** string (nullable)

Tool name regex filter for the hook event. Null means fires on all invocations. D3: "load-bearing for porting decisions." A hook with matcher=null has very different blast radius than one with `matcher='^[Bb]ash$'`.

**Source agents:** D3

---

#### `if_condition` [PRIORITY: MEDIUM]

**Type:** string (nullable)

Additional filter condition beyond matcher, expressed as a tool call pattern string. D3: "rare but important." Used once in JASON-OS; more frequent in SoNash's 25+ hooks.

**Source agents:** D3

---

#### `continue_on_error` [PRIORITY: HIGH]

**Type:** boolean

Whether the hook allows Claude to continue when it exits non-zero (fail-open) or blocks (fail-closed). D3: "Load-bearing for porting decisions — blocking vs fail-open is a critical distinction."

**Source agents:** D3

---

#### `exit_code_action` [PRIORITY: MEDIUM]

**Type:** enum — `block | warn | allow`

Semantics of the hook's exit codes: what the hook intends to signal. Distinct from `continue_on_error` (which is what Claude Code does in response). D3: "not captured today."

**Source agents:** D3

---

#### `async_spawn` [PRIORITY: MEDIUM]

**Type:** boolean

Whether this hook spawns a subprocess asynchronously (fire-and-forget). D3: "commit-tracker spawns mid-session-alerts.js asynchronously — an unusual pattern worth flagging." Async spawns don't block the Claude Code turn but introduce race conditions.

**Source agents:** D3

---

#### `kill_switch_env` [PRIORITY: MEDIUM]

**Type:** string (nullable)

Environment variable name that disables this hook when set (e.g., SKIP_GATES=1). Null if no kill switch exists. D3: "enables audit of which hooks are bypassable." Security-relevant.

**Source agents:** D3

---

### 2D: Memory Files

#### `memory_type` [PRIORITY: HIGH]

**Type:** enum — `user | feedback | project | reference | tenet | index`

Sub-type of memory file within the memory taxonomy. D4a established the 4-type taxonomy; D4b-3 identified the `tenet` convention (t[N]_ prefix, semantically distinct from reference despite `type:reference` frontmatter); D4b-1 noted index files need their own sub-type.

**Source agents:** D4a, D4b-1, D4b-2, D4b-3

---

#### `prefix_convention` [PRIORITY: MEDIUM]

**Type:** string — `feedback_ | project_ | reference_ | user_ | tN_`

Filename prefix category. D4b-3: "The type field alone is insufficient — t3_ has type:reference but is semantically distinct from reference_pr_review_integrations.md." The prefix encodes a convention the type field cannot capture.

**Source agents:** D4b-3 | **Conflicts with:** memory_type (partially overlapping)

---

#### `tenet_number` [PRIORITY: LOW]

**Type:** integer

For tenet files (t[N]_ prefix), the numeric tenet identifier. D4b-3: "t3 prefix appears to indicate Tenet #3." Only relevant for the t[N]_ memory convention. Could be derived from prefix_convention.

**Source agents:** D4b-3 | **Conflicts with:** prefix_convention (derivable from)

---

#### `has_canonical` [PRIORITY: HIGH]

**Type:** boolean

Whether a canonical counterpart to this user-home memory exists in `.claude/canonical-memory/`. D4b-1: 76% gap rate (16/21 memories missing from canonical). D4b-2: 90% gap rate. Primary input to sync gap analysis.

**Source agents:** D4b-1, D4b-2, D4b-3

---

#### `append_only` [PRIORITY: MEDIUM]

**Type:** boolean

Whether this unit is an append-only log that should never be overwritten during sync. D4a: "true for session-end-learnings.md. Would guide sync behavior (never overwrite, only append)."

**Source agents:** D4a

---

#### `portable_elements` [PRIORITY: LOW]

**Type:** string

Free-text description of extractable portable principles in an otherwise non-portable unit. D4b-3: "Two project memories contain portable elements — the classification framework is a portable methodology even though the specific file list is project-specific."

**Source agents:** D4b-3

---

### 2E: Scripts

#### `module_system` [PRIORITY: MEDIUM]

**Type:** enum — `cjs | esm | none`

JavaScript module system used. D5: "Critical given the mixed environment. The CJS/ESM distinction can't be inferred from extension alone." A .js file may be CJS or ESM depending on nearest package.json.

**Source agents:** D5

---

#### `entry_point` [PRIORITY: MEDIUM]

**Type:** boolean

Whether this script is invoked directly vs only imported by other scripts (library module). D5: "distinguishes scripts invoked directly from library-only modules." Entry-point scripts need different sync handling than libraries.

**Source agents:** D5

---

#### `shells_out` [PRIORITY: MEDIUM]

**Type:** boolean

Whether this unit spawns external processes via exec, execFile, spawn, etc. D5: "flags files that spawn subprocesses (relevant for security audit)." D3 noted the `execFile` pattern is easy to miss without reading the full file body.

**Source agents:** D5, D3

---

#### `test_coverage` [PRIORITY: LOW]

**Type:** boolean

Whether corresponding test files exist for this unit. D5: "flag if there are corresponding test files." A unit with test coverage is safer to sync than one without.

**Source agents:** D5

---

### 2F: Tools

#### `requires_build` [PRIORITY: HIGH]

**Type:** boolean

Whether this unit's source must be compiled/built before it is operational. D6: "Go source requires go build; scripts do not. Critical for sync decisions."

**Source agents:** D6

---

#### `binary_present` [PRIORITY: MEDIUM]

**Type:** boolean

Whether a pre-built binary artifact exists on disk (typically gitignored). D6: "Knowing whether a pre-built binary exists matters for is-this-tool-usable-right-now assessment." Computed at scan time.

**Source agents:** D6

---

#### `install_target` [PRIORITY: MEDIUM]

**Type:** string

Path where the tool installs or copies itself at build/install time. Different from `path` (source location). D6: "Sync must understand install targets to know what to rebuild after pulling."

**Source agents:** D6

---

#### `secret_config_required` [PRIORITY: MEDIUM]

**Type:** boolean

Whether this unit requires a gitignored secret config file to be operational. D6: "Would prevent false-positive ready-to-use assessments during sync."

**Source agents:** D6 | **Conflicts with:** required_secrets (related but distinct — this is a file, not a GitHub secret)

---

#### `language` [PRIORITY: MEDIUM]

**Type:** enum — `go | javascript | bash | yaml | toml | json | markdown`

Primary programming language. D6: "worth promoting to top-level for tools. Go vs bash vs toml are fundamentally different handling requirements."

**Source agents:** D6

---

### 2G: Research Sessions

#### `session_type` [PRIORITY: MEDIUM]

**Type:** enum — `brainstorm | deep-research | deep-plan | hybrid`

Whether this session is brainstorm-only, formal deep-research, deep-plan, or hybrid. D7: "jason-os-mvp is hybrid research+planning." Session type determines what fields to expect.

**Source agents:** D7

---

#### `depth` [PRIORITY: MEDIUM]

**Type:** enum — `L0-brainstorm | L1 | L2 | L3 | L4`

Research depth level. D7: "differentiates brainstorm from formal research." L0 brainstorm sessions produce one file; L1 exhaustive sessions produce 50+ claims.

**Source agents:** D7

---

### 2H: Planning Artifacts

#### `plan_scope` [PRIORITY: MEDIUM]

**Type:** enum — `milestone | research-program | deferral-registry | session-bookmark | port-ledger | execution-handoff | backlog | cross-pr-learning`

Sub-type of planning artifact. D8: "A RESUME.md (session-bookmark) has completely different sync semantics than a PLAN.md (milestone)." Enables plan-type-specific sync rules.

**Source agents:** D8

---

### 2I: CI Workflows

#### `trigger_events` [PRIORITY: HIGH]

**Type:** array — `push | pull_request | schedule | workflow_dispatch | ...`

CI workflow trigger events. D9: "enables filtering by when a workflow runs." PR-gate workflows must be ported; scheduled cron workflows are optional.

**Source agents:** D9

---

#### `runner_os` [PRIORITY: LOW]

**Type:** string — `ubuntu-latest | windows-latest | macos-latest`

OS runner used. D9: "all 7 JASON-OS workflows use ubuntu-latest; useful for cross-OS portability analysis."

**Source agents:** D9

---

#### `action_pins` [PRIORITY: LOW]

**Type:** array of objects `{action: string, sha: string, tag: string}`

Pinned GitHub Actions references with SHA and human-readable tag. D9: "structured extraction of pinned actions." Enables SHA currency checks at sync time.

**Source agents:** D9

---

#### `secret_bearing` [PRIORITY: MEDIUM]

**Type:** boolean

Whether this config or workflow references secrets beyond GITHUB_TOKEN. D9: "flags configs that reference or consume secrets." A secret-bearing config requires operator provisioning during sync.

**Source agents:** D9 | **Conflicts with:** required_secrets (related — required_secrets is the list, secret_bearing is the flag)

---

---

## Section 3: Relationship Fields

Fields that express relationships between units in the registry graph.

### 3.1 `supersedes` [PRIORITY: HIGH]

**Type:** string (unit name)

Reference to a prior unit that this unit replaces. D4a identified this as "the highest-priority schema gap" — the `feedback_verify_not_grep` vs `feedback_grep_vs_understanding` naming divergence is invisible without this field.

**Source agents:** D4a, D4b-1

---

### 3.2 `superseded_by` [PRIORITY: HIGH]

**Type:** string (unit name)

The inverse of supersedes: what unit replaced this one. Both directions needed for graph traversal. A deprecated memory file with `superseded_by` set can be auto-excluded from sync candidates.

**Source agents:** D4a, D4b-1

---

### 3.3 `related` [PRIORITY: MEDIUM]

**Type:** array of strings

Conceptually linked units that are not dependencies or supersession relationships. D4a: "feedback_explain_before_decide cross-references 3 other memories inline — making this structured enables graph traversal." Surfaced as `related_memories` in D4a/D4b-1; generalized here to all unit types.

**Previously named:** related_memories (D4a, D4b-1)
**Source agents:** D4a, D4b-1, D4b-3

---

### 3.4 `lineage` [PRIORITY: HIGH]

**Type:** object — `{source_project: string, source_path: string, source_version: string, ported_date: string}`

Origin tracking: where the unit was ported from and at what version. D1a: "pr-review documents this explicitly in frontmatter (Lineage field). Would be valuable for every ported skill." Enables bidirectional sync without losing provenance.

**Previously named:** port_lineage (D1a), version_lineage (D1b) — consolidated here
**Source agents:** D1a, D1b, D4b-3

---

### 3.5 `component_units` [PRIORITY: HIGH]

**Type:** array of objects — `{name: string, path: string, role: string}`

Sub-units that compose this composite unit, each with a role label. Generalizes D1a's `companion_files`, D3's hook-to-lib-helper relationships, and D6's multi-file Go tool into a single structured field.

**Role examples:** `companion-doc`, `lib-dep`, `entry-point`, `source-file`, `config`, `test`
**Previously named:** companion_files (D1a) — absorbed here
**Source agents:** D1a, D3, D6, D11

---

### 3.6 `is_copy_of` [PRIORITY: MEDIUM]

**Type:** string (path to canonical source)

For units that are copies of another canonical unit (e.g., `safe-fs.js` copied into skill subdirs), the path to the canonical source. D5: "prevents treating skill copies as distinct entries."

**Source agents:** D5 | **Conflicts with:** lineage (related but lineage is cross-project; is_copy_of is within-repo)

---

---

## Section 4: Metadata and Bookkeeping Fields

Fields that track lifecycle, provenance, and temporal information.

### 4.1 `originSessionId` [PRIORITY: MEDIUM]

**Type:** string

Identifier of the Claude Code session in which this unit was created or last significantly modified. D4b-1: "enables tracing a memory to its originating session for audit/context." D4b-2 flagged inconsistent values — UUIDs in some files, human-readable Session #NNN labels in others. Normalization needed.

**Source agents:** D4a, D4b-1, D4b-2, D4b-3

---

### 4.2 `recency_signal` [PRIORITY: LOW]

**Type:** string

Staleness indicator from the Claude Code memory system (e.g., system-reminder annotations like "This memory is 2 days old"). D4b-2: "captures the system-reminder staleness flag." This is a platform-observed property, not user-authored metadata.

**Source agents:** D4b-2

---

### 4.3 `source_scope` [PRIORITY: MEDIUM]

**Type:** enum — `universal | user | project | machine | ephemeral`

Portability scope of the unit's source code / definition, independent of runtime behavior. D6: "cache.go source is universal/portable, but its runtime behavior writes to a machine-specific path." D2: "agent team definitions are universal at definition time but ephemeral at runtime."

**Source agents:** D2, D6 | **Conflicts with:** scope (replaces or supplements)

---

### 4.4 `runtime_scope` [PRIORITY: MEDIUM]

**Type:** enum — `universal | user | project | machine | ephemeral`

Portability scope of the unit's runtime behavior — what paths it touches, what state it writes, what credentials it needs during execution. Companion to source_scope.

**Source agents:** D2, D6 | **Conflicts with:** scope (replaces or supplements)

---

---

## Section 5: Operational Fields

Fields that describe runtime requirements, capabilities, and security posture.

### 5.1 `state_files` [PRIORITY: HIGH]

**Type:** array of strings (path patterns)

File paths this unit reads from or writes to in `.claude/state/` or similar persistent state locations. D1a: "5 of 7 skills write named state files to .claude/state/ — knowing this upfront is useful for sync: state files need to stay project-local." D3: "essential for dependency mapping across hooks."

**Previously named:** state_files_written (D3), has_state_file (D1a) — consolidated here
**Source agents:** D1a, D1b, D3

---

### 5.2 `mcp_dependencies` [PRIORITY: MEDIUM]

**Type:** array of strings

MCP server tool names this unit requires. Separate from `external_refs`: MCP dependencies fail silently if the server isn't configured. D2: "worth flagging as a category distinct from agent-to-agent dependencies." An environment without the memory MCP server cannot run `checkpoint --mcp`.

**Source agents:** D2, D3 | **Conflicts with:** external_refs (more specific split-out)

---

### 5.3 `required_secrets` [PRIORITY: HIGH]

**Type:** array of strings

Secret names (e.g., SONAR_TOKEN) that must be provisioned in the target environment. D9: "these require GitHub Settings operator action, not just file edits." GITHUB_TOKEN (built-in) vs SONAR_TOKEN (must provision) is a critical distinction.

**Source agents:** D9 | **Conflicts with:** external_refs (more specific split-out)

---

### 5.4 `tool_deps` [PRIORITY: MEDIUM]

**Type:** array of strings

External CLI tools or binaries required at runtime (e.g., gh, gitleaks, go, node, bash). D3: gitleaks binary. D6: go and bash. Currently mixed into external_refs.

**Source agents:** D3, D5, D6, D9 | **Conflicts with:** external_refs (more specific split-out)

---

### 5.5 `dependency_hardness` [PRIORITY: MEDIUM]

**Type:** enum (per dependency) — `hard | soft`

Whether each dependency is required (will fail without it) or soft (graceful degradation if absent). D3: "several hooks use `try { require(...) } catch { fallback }` — the schema's dependencies array doesn't distinguish hard vs soft." Critical for portability assessment: a soft dependency on gitleaks means the hook degrades gracefully; a hard dependency means it breaks.

**Note for Piece 2:** This would require the `dependencies` array to become an array of objects rather than strings.
**Source agents:** D3

---

### 5.6 `output_artifacts` [PRIORITY: MEDIUM]

**Type:** array of objects — `{path_pattern: string, description: string, gitignored: boolean}`

Files or directories this unit writes as outputs. D1a: "deep-research output structure is complex (4 retained files + gitignored intermediates). This is important for sync: gitignored intermediates must stay gitignored." D2 recommended output_paths as a first-class field.

**Source agents:** D1a, D2

---

### 5.7 `input_paths` [PRIORITY: MEDIUM]

**Type:** array of strings

Paths/files this unit reads as runtime data inputs (not static dependencies). D2: "key for sync dependency graph." D8 named this `research_inputs` for planning artifacts. Currently inferred from reading full file bodies — expensive at scale.

**Source agents:** D2, D8

---

### 5.8 `sanitize_fields` [PRIORITY: HIGH]

**Type:** array of strings

Explicit list of config keys or field names that must be replaced with project-specific values when porting. D9: "sonar.projectKey, sonar.organization, name." A pre-computed list enables automated find-replace at sync time.

**Source agents:** D9 | **Conflicts with:** portability_notes (more specific)

---

### 5.9 `is_hub` [PRIORITY: MEDIUM]

**Type:** boolean

Whether this unit is depended upon by many other units (hub in the dependency graph). D1a noted convergence-loop as "the infrastructure primitive" with 4+ callers. Hub units have higher sync priority — breaking a hub breaks many dependents. Computed field derived from `depended_on_count`.

**Source agents:** D11 (expected) | **Conflicts with:** depended_on_count (derived from)

---

### 5.10 `depended_on_count` [PRIORITY: LOW]

**Type:** integer

Raw count of how many other units depend on this unit. Used to compute is_hub. D1a noted the density pattern: convergence-loop has 4+ callers; add-debt and checkpoint have 0-1.

**Source agents:** D11 (expected) | **Conflicts with:** is_hub (derives to)

---

---

## Section 6: Recommended MVP Schema

The MVP schema is what Piece 2 should start with for v1. The goal: actually usable, not exhaustive. ~12 fields that cover all unit types and address the core sync decisions.

**Piece 2 has final say. This is D13's opinion.**

### MVP Schema: 12 Universal Fields

Every registry record should have these. They are sufficient to answer "should this unit be synced, and how?"

| Field | Type | Rationale |
|-------|------|-----------|
| `name` | string | Identity |
| `path` | string | Lookup key |
| `type` | enum | Category — enables per-type field applicability |
| `scope` | enum (5 values) | Primary sync filter: universal/user → sync candidates |
| `portability` | enum (3 values) | Sync action: copy-as-is / copy+edit / skip |
| `status` | enum (7 values) | Skip deprecated/archived units |
| `purpose` | string | Human-readable context |
| `dependencies` | array | Dependency graph (needed before syncing anything) |
| `lineage` | object | Provenance for bidirectional sync without data loss |
| `supersedes` + `superseded_by` | string pair | Version evolution tracking |
| `sanitize_fields` | array | What to edit when portability=sanitize-then-portable |
| `notes` | string | Escape hatch for nuances |

**Counting as one field each** — 12 fields. State files and external_refs round out a comfortable v1 if Piece 2 wants 14-15.

### Why These 12?

1. **name + path + type:** Identity and taxonomy. Without these nothing else is queryable.
2. **scope + portability:** The two fields from User Q4. Together they answer "does this travel?" and "how do I move it?"
3. **status:** Prevents syncing stale/deprecated units. Already in frontmatter on most files.
4. **purpose:** Human readability. Makes the registry navigable without reading source files.
5. **dependencies:** Graph edges. Can't design a sync order without them.
6. **lineage:** Provenance. Without this, a JASON-OS skill that drifts from its SoNash origin becomes untrackable.
7. **supersedes + superseded_by:** The highest-priority gap per D4a. Memory evolution is broken without these.
8. **sanitize_fields:** Operationalizes portability=sanitize-then-portable. Without a field list, sanitization is manual.
9. **notes:** Preserves nuances that don't fit in structured fields. Non-negotiable.

### What Got Cut and Why

**Cut from MVP:**
- `state_files`: Important but derivable from notes for now; promote to v2 when hooks are in scope.
- `mcp_dependencies`, `required_secrets`, `tool_deps`: Subsume into external_refs for MVP; split in v2.
- `has_canonical`: Memory-specific; add when memory sync design is ready.
- `component_units`: Hooks and tools need it; skills mostly don't. Add in v2 per unit type.
- `agent_types_spawned`: Skills only; add in v2 when compatibility checking is implemented.
- `deferred_sections`, `deferred_infrastructure`: Nice to have but not load-bearing for sync decisions.
- All ci-workflow-specific fields (trigger_events, runner_os, action_pins): Add when CI sync is in scope.
- `runtime_lifecycle`, `source_scope`, `runtime_scope`: The source/runtime scope split is correct but adds schema complexity. Start with single `scope` field; promote the split in v2 for tools and hooks.

### Next Tier for Piece 2 (v1.5 / v2)

If MVP proves insufficient, these are the highest-value additions in priority order:

1. `state_files` — hooks and skills write state that must not travel
2. `has_canonical` — memory gap analysis
3. `agent_types_spawned` — compatibility checking for skill sync
4. `component_units` — needed once multi-file tools are in registry
5. `required_secrets` — needed before CI workflow sync
6. `source_scope + runtime_scope` — needed when tools/hooks are synced

---

## Section 7: Learnings for Methodology

### Field-Consolidation Technique

**Total unique candidates surfaced:** 65 raw mentions across 13 Wave 1 agents.

**After deduplication:** 63 distinct candidates (2 name-collisions resolved):
- `related_memories` (D4a, D4b-1) → consolidated to `related` as unit-type-agnostic
- `port_lineage` (D1a) + `version_lineage` (D1b) → consolidated to `lineage` with object type

**Fraction that were clear duplicates:** ~7 (11%) — mostly portability field variants and the lineage names.

**Subtle variants that needed adjudication (not dropped):**
- `stub_level` vs `status.stub`: same concept, different granularity. Both listed; Piece 2 decides whether to merge.
- `state_files` vs `state_files_written` vs `has_state_file`: three names for the same concept from three agents (D1a, D1b, D3). Consolidated to `state_files`.
- `sanitize_fields` vs `portability_notes`: adjacent but distinct — sanitize_fields is a machine-parseable list, portability_notes is prose. Both retained.
- `related_memories` vs `related`: related_memories is memory-only; related is unit-type-agnostic. Generalized to related.
- `is_hub` vs `depended_on_count`: derived relationship, both kept for clarity.

**Gaps where agents didn't surface a field but should exist:**
1. **`format`** for dotfiles without extensions (.nvmrc, .gitignore): D9 flagged this but didn't name it as a schema candidate explicitly. Worth adding as a LOW priority candidate for config/doc types.
2. **`last_modified_date`**: No agent surfaced a creation/modification date field. Git log is the source but no agent recommended schema-izing it. Probably belongs in v2.
3. **`consumers`**: D1a noted dependency density (convergence-loop is most-referenced-by-others) but no agent recommended a `consumers` array (the inverse of `dependencies`). D11's hub analysis will compute this — worth flagging for Piece 2.

---

### Schema-Complexity vs Usability Tension

**MVP is 12 fields.** Full catalog is 63 fields. The 51-field gap is real — not artificial trimming.

**What got cut and why:**
- All "computed" fields (is_hub, depended_on_count, binary_present, recency_signal): These are observational, not declarative. They'd be computed at registry scan time, not authored by humans. Piece 2 should decide whether the registry stores computed fields or keeps only human-authored fields.
- All unit-type-specific fields (12+ fields for agents, hooks, memory, CI): MVP needs to work for all types with the same schema. Per-type fields inflate the schema before the type system is even designed.
- Sub-splits of external_refs (mcp_dependencies, required_secrets, tool_deps): The split is correct but premature. Start with external_refs; split when sync tooling needs to distinguish them.

**Next tier that Piece 2 might need if MVP proves insufficient:**
If the first sync attempt hits problems, the most likely failure modes are:
1. "The sync tool doesn't know which secrets to provision" → add `required_secrets`
2. "Synced a skill whose agent isn't in the target environment" → add `agent_types_spawned`
3. "Synced a tool but forgot to rebuild" → add `requires_build` + `install_target`
4. "State files traveled with the hook" → add `state_files`

These are the four most likely first-pass failures, and the four fields to add first when MVP proves insufficient.

---

### Adjustments Recommended for SoNash Schema-Surveyor

**Does one surveyor suffice for SoNash?** No.

At SoNash scale (estimated 81 skills, 40 agents, 25 hooks, 83 memories, 98 scripts, 16 CI workflows, 21 planning dirs), a single D13-equivalent agent would need to process inputs from 18-25 Wave 1 agents rather than 13. The consolidation task scales with Wave 1 agent count, not with raw unit count.

**Recommended split for SoNash schema-surveyor:**

Option A: **Split by unit category.** Two agents:
- D13a: Skills + agents + commands + teams
- D13b: Hooks + scripts + tools + CI + planning + research + docs/configs

This maps to how Wave 1 agents were grouped and keeps related schema candidates together.

Option B: **One agent, wider context budget.** The SoNash Wave 1 will produce more verbose Learnings sections (5x candidates expected). A single surveyor may stall reading 18-25 MD files serially. Parallel reads of all Learnings sections first, then composition, would keep it manageable — but only if the JSONL schema is stable (so the surveyor doesn't need to re-read JSONL for existing_metadata patterns).

**Recommendation:** Option A if SoNash Wave 1 has >18 agents; Option B if ≤18. Use the JASON-OS schema catalog (this document) as the baseline — SoNash surveyor should only surface NET NEW fields, not re-derive the universal ones.

**Key SoNash-specific candidates to watch for:**
- Workflow-specific fields from GSD skills (repo-analysis, gsd:new-project, etc.) — likely introduce fields like `workflow_family` or `gsd_phase`
- Status-page/statusline-specific tool fields if SoNash's statusline has more widgets
- SonarCloud-specific CI fields (hotspot workflow steps) not present in JASON-OS

---

## Confidence Assessment

- All findings based on direct reads of 13 MD Learnings sections + JSONL samples + R-frpg RESEARCH_OUTPUT.md
- Field consolidation decisions (what to merge, what to keep separate) are D13's judgment calls — HIGH confidence on the identification of candidates, MEDIUM confidence on the deduplication decisions (Piece 2 may want to re-split some merged candidates)
- MVP schema section is D13's opinion — LOW-MEDIUM confidence (Piece 2 has final say and more context on downstream requirements)
- Overall confidence on raw candidate completeness: HIGH (all 13 agents read, all Learnings sections extracted, JSONL existing_metadata patterns sampled)
