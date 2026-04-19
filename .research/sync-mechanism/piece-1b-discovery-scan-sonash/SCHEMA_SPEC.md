# Wave 1 JSONL Schema Spec — Piece 1b SoNash Discovery Scan

**Version:** 1.0
**Date:** 2026-04-18 (Session 7)
**Status:** ACTIVE — every Wave 1 agent MUST emit JSONL conforming to this spec.

This is the contract. If you are a D-agent reading this, your JSONL output must
use these field names and enums. Undeclared fields go in `notes` (catch-all).
Do NOT invent new top-level fields — if you surface one, note it in your
`## Learnings for Methodology` section and D22 (schema surveyor) will decide.

---

## Section 1: Core Fields (emit for EVERY unit, all types)

These 13 fields are load-bearing. Every JSONL record MUST have all 13 (values
may be null/empty-array but the key must be present).

| Field | Type | Enum / Notes |
|-------|------|--------------|
| `agent_id` | string | Your agent ID (e.g., "D1a", "D3b"). |
| `type` | enum | `skill \| agent \| team \| command \| hook \| hook-lib \| memory \| canonical-memory \| script \| script-lib \| tool \| tool-file \| research-session \| plan \| planning-artifact \| learnings-doc \| todo-log \| config \| ci-workflow \| doc \| composite \| product-code` |
| `name` | string | Canonical identifier (usually filename slug). |
| `path` | string | Relative path from SoNash repo root. |
| `scope` | enum | `universal \| user \| project \| machine \| ephemeral`. Primary sync filter. |
| `portability` | enum | `portable \| sanitize-then-portable \| not-portable \| not-portable-product` (product dirs get the -product suffix). |
| `status` | enum | `active \| deferred \| archived \| deprecated \| stub \| gated \| complete`. |
| `purpose` | string | One-sentence human-readable description. |
| `dependencies` | array | Other unit names this depends on. |
| `external_refs` | array | External services, APIs, CLIs, MCP servers. |
| `lineage` | object | `{source_project, source_path, source_version, ported_date}` or `null` for SoNash natives. Use `{source_project: "sonash", ...}` for SoNash-originals, `{source_project: "jason-os"}` for back-ports, `null` for unknown. |
| `sanitize_fields` | array | Specific field names requiring project-specific replacement (for `sanitize-then-portable` items). |
| `notes` | string | Free-text catch-all. Use for nuances that don't fit structured fields. |

---

## Section 2: Schema Additions Over Piece 1a (6 new top-level fields)

These are the 6 new top-level fields beyond Piece 1a's JSONL schema
(`lineage` is already in the core fields above; `data_contracts` is in
Section 3 per-category). Capture alongside core fields where relevant.

| Field | Type | When to Emit |
|-------|------|--------------|
| `originSessionId` | string (nullable) | Memory files, planning artifacts, research sessions. Normalize: accept `Session #NNN` OR UUID; preserve as-written. |
| `source_scope` | enum (same 5 values as `scope`) | Tools + hooks. When source code scope differs from runtime scope. Default: same as `scope`. |
| `runtime_scope` | enum (same 5 values as `scope`) | Tools + hooks. Where the unit's RUNTIME behavior writes/reads. `cache.go` canonical example: source=universal, runtime=machine. |
| `deferred_sections` | array of strings | Skills. Named phases/steps/infrastructure marked DEFERRED within the unit (extract from body text). |
| `module_system` | enum | Scripts only: `cjs \| esm \| none`. CANNOT infer from .js extension alone — check nearest package.json `"type"` field or explicit `require()`/`import` usage. `.cjs`/`.mjs` extensions force their respective mode. |
| `supersedes` | string (nullable) | Memory files + skills. Name of prior unit this replaces. |
| `superseded_by` | string (nullable) | Inverse of `supersedes`. |

---

## Section 3: Per-Category Extensions

Emit these ONLY when the unit type matches. If emitting, include all listed
fields for that category (null values OK, missing keys not OK).

### 3A: Skills (`type: skill`)

| Field | Type | Notes |
|-------|------|-------|
| `active_scripts` | array | Scripts actually invoked (per D1b — more useful than `dependencies` for sync risk). |
| `agent_types_spawned` | array | `subagent_type` values dispatched (e.g., "contrarian-challenger"). |
| `has_reference_md` | boolean | Companion REFERENCE.md exists? |
| `reference_layout` | enum | `none \| flat \| subdirectory` — subdir layout requires `**/*.md` 2+ depth glob. |
| `stub_level` | enum | `production \| stub \| planned`. |
| `port_lineage_frontmatter` | string | Raw `Lineage:` frontmatter if present (pr-review pattern). Preserve verbatim. |

### 3B: Agents (`type: agent`) + Teams (`type: team`)

| Field | Type | Notes |
|-------|------|-------|
| `pipeline_phase` | string | Phase number/label if part of sequential pipeline. |
| `model` | string | LLM model identifier. |
| `maxTurns` | integer (nullable) | Null = unbounded. |
| `tools` | array | Allowed tools (YAML frontmatter). |
| `disallowedTools` | array (nullable) | `null \| [] \| ["Agent"]`. Preserve distinction. |
| `color` | string (nullable) | UI color. |
| `mcp_dependencies` | array | MCP server tool names (these are NOT generic tools, handle distinctly from `tools`). |
| `runtime_lifecycle` | enum | `per-invocation \| per-session \| persistent \| ephemeral`. |

**Team files:** see Section 4 parser rules. Emit `type: team` and capture
HTML-comment metadata as if it were YAML frontmatter.

### 3C: Hooks (`type: hook` / `hook-lib`)

| Field | Type | Notes |
|-------|------|-------|
| `event` | enum | `PreToolUse \| PostToolUse \| SessionStart \| Stop \| SubagentStop \| Notification \| PreCompact`. **Stop and SubagentStop are SoNash-specific — JASON-OS has neither.** |
| `matcher` | string (nullable) | Tool regex. Null = fires on all. |
| `if_condition` | string (nullable) | Additional filter beyond matcher. |
| `continue_on_error` | boolean | Fail-open (true) vs fail-closed (false). |
| `exit_code_action` | enum | `block \| warn \| allow`. |
| `async_spawn` | boolean | Grep `execFile \| spawn \| fork` — easy to miss. |
| `kill_switch_env` | string (nullable) | Env var that disables (e.g., `SKIP_GATES=1`). |
| `state_files` | array | Path patterns the hook reads/writes in `.claude/state/`. |

### 3D: Memories (`type: memory` / `canonical-memory`)

| Field | Type | Notes |
|-------|------|-------|
| `memory_type` | enum | `user \| feedback \| project \| reference \| tenet \| index`. |
| `prefix_convention` | string | `feedback_ \| project_ \| reference_ \| user_ \| tN_`. |
| `tenet_number` | integer (nullable) | For `tN_` prefix files. |
| `has_canonical` | boolean | For user-home memories: does `.claude/canonical-memory/` equivalent exist? |
| `append_only` | boolean | E.g., `session-end-learnings.md`. |
| `portable_elements` | string | Prose: extractable portable principles in otherwise non-portable units. |
| `related` | array | Cross-referenced memory names. **D23 will do a dedicated extraction pass for the full graph — do your best inline but D23 is canonical.** |
| `recency_signal` | string (nullable) | system-reminder staleness annotations if observed. |

### 3E: Scripts (`type: script` / `script-lib`)

| Field | Type | Notes |
|-------|------|-------|
| `entry_point` | boolean | Invoked directly vs library-only. |
| `shells_out` | boolean | `execFile \| spawn \| fork \| exec`. |
| `test_coverage` | boolean | Corresponding test files exist. |
| `is_copy_of` | string (nullable) | If file is a copy of canonical source (e.g., `safe-fs.js` in skill subdirs). |
| `tool_deps` | array | External CLIs required (gh, gitleaks, node, etc.). |

### 3F: Tools (`type: tool` / `tool-file`)

| Field | Type | Notes |
|-------|------|-------|
| `language` | enum | `go \| javascript \| bash \| yaml \| toml \| json \| markdown`. |
| `requires_build` | boolean | Must compile before use. |
| `binary_present` | boolean | Pre-built artifact exists (typically gitignored). |
| `install_target` | string | Path where binary installs. For `~/.claude/*` targets, capture repo-name suffix (e.g., `cache-sonash`). |
| `secret_config_required` | boolean | Needs gitignored secret config file. |

### 3G: Research Sessions (`type: research-session`)

| Field | Type | Notes |
|-------|------|-------|
| `session_type` | enum | `brainstorm \| deep-research \| deep-plan \| hybrid`. Flag `hybrid` for sessions producing both RESEARCH_OUTPUT.md AND PLAN.md. |
| `depth` | enum | `L0-brainstorm \| L1 \| L2 \| L3 \| L4`. |
| `claim_count` | integer | From RESEARCH_OUTPUT metadata if present. |
| `source_count` | integer | Same. |

### 3H: Planning Artifacts (`type: plan` / `planning-artifact`)

| Field | Type | Notes |
|-------|------|-------|
| `plan_scope` | enum | `milestone \| research-program \| deferral-registry \| session-bookmark \| port-ledger \| execution-handoff \| backlog \| cross-pr-learning`. |

### 3I: CI Workflows (`type: ci-workflow`)

| Field | Type | Notes |
|-------|------|-------|
| `trigger_events` | array | `push \| pull_request \| schedule \| workflow_dispatch \| ...`. |
| `runner_os` | string | `ubuntu-latest \| windows-latest \| macos-latest`. |
| `action_pins` | array of objects | `{action, sha, tag}` per pinned Action reference. |
| `secret_bearing` | boolean | References secrets beyond GITHUB_TOKEN. |
| `required_secrets` | array | Secret names (e.g., SONAR_TOKEN). |

### 3J: Composites (`type: composite`) — emitted by D21 (workflow identifier)

| Field | Type | Notes |
|-------|------|-------|
| `component_units` | array of objects | `{name, path, role}`. Role examples: `companion-doc`, `lib-dep`, `entry-point`, `source-file`, `config`, `test`, `hook`, `skill`, `agent`. |
| `data_contracts` | array of objects | Schema contracts between components. `{file_path, contract_key: <name>, fields: [...], producers: [...], consumers: [...]}`. **Load-bearing per Piece 1a §5.4.** |
| `workflow_family` | string (nullable) | If part of a named family (e.g., "gsd", "deep-research", "session-lifecycle"). |
| `gsd_phase` | string (nullable) | For GSD composites only. |

---

## Section 4: Team File Parser Rules (HTML-Comment Metadata)

Team files (`.claude/teams/*.md`) use HTML comment metadata instead of YAML
frontmatter. A standard YAML parser will fail.

**Extraction rule:** Parse the first HTML comment block at the top of the
file. Each line inside `<!-- ... -->` matching the pattern `^\s*(\w+):\s*(.+)$`
is a key/value. Arrays are comma-separated or newline-separated within the
value. Example:

```markdown
<!--
name: research-plan-team
description: 3-agent team for research → plan routing
agents: deep-research-searcher, deep-research-synthesizer, deep-plan-planner
maxTurns: 10
-->
# Team: research-plan-team
...
```

Emit: `type: team`, `name: "research-plan-team"`, etc. Treat
`agents` as `component_units` with role `member`.

**If HTML metadata is absent**, fall back to the first H1 for `name` and
first paragraph for `purpose`, and flag in `notes`: `"Team file lacks
HTML metadata — needs normalization"`.

---

## Section 5: SoNash Top-Level Dir Coverage Matrix

Every git-tracked top-level dir MUST be covered by at least one D-agent.
This matrix is the contract.

| Top-level dir | Primary D-agent | Secondary |
|---------------|-----------------|-----------|
| `.agent/` | D18 | — |
| `.agents/` | D18 | — |
| `.claude/skills/` | D1a-e | — |
| `.claude/agents/` | D2a-b | — |
| `.claude/teams/` | D2a-b | — |
| `.claude/commands/` | D2a-b | — |
| `.claude/hooks/` | D3a-b | — |
| `.claude/canonical-memory/` | D5 | — |
| `.claude/state/` | D3a-b (referenced) | D18 (enumerate) |
| `.claude/` other | D17a-b | — |
| `.gemini/` | D17a-b | — |
| `.github/` | D16 | — |
| `.husky/` | D17a-b | — |
| `.planning/` | D15a-b | — |
| `.qodo/` | D17a-b | — |
| `.research/` | D14a-c | — |
| `.semgrep/` | D16 | — |
| `.vscode/` | D17a-b | — |
| `analysis/` | D19a | — |
| `app/` | D19a | — |
| `components/` | D19a | — |
| `config/` | D19a | — |
| `data/` | D19a | — |
| `dataconnect/` | D19a | — |
| `docs/` | D19a | — |
| `eslint-plugin-sonash/` | D19a | — |
| `functions/` | D19b | — |
| `hooks/` (product dir, NOT `.claude/hooks/`) | D19b | — |
| `lib/` | D19b | — |
| `public/` | D19b | — |
| `scripts/` | D6-D12 | — |
| `src/` | D19b | — |
| `styles/` | D19b | — |
| `test/` | D19b | — |
| `tests/` | D19b | — |
| `tool-configs/` | D18 | — |
| `tools/` | D13 | — |
| `types/` | D19b | — |

**User-home memories** (`~/.claude/projects/C--Users-jason-Workspace-dev-projects-sonash-v0/memory/`):
D4a-d.

**Root-level files:** 17 .md files + ~35 config files + CLAUDE.md: D17a-b.

**Gitignored working-tree dirs** (node_modules/, .next/, out/, coverage/,
dist-tests/, .worktrees/, .tmp/, .firebase/, --version/,
consolidation-output/, run/): NOT scanned. Flag any references from scanned
units in `notes`.

---

## Section 6: Every Agent MUST Include `## Learnings for Methodology`

Append this section at the end of your findings MD file. Capture anything
that should inform future cross-repo scans: agent sizing (was my scope too
big?), file-type surprises, classification edge cases, dependency-extraction
techniques, JSONL schema gaps you surfaced.

**This is how cross-scan methodology evolves.** Piece 1a had D-agent
Learnings aggregated into a master LEARNINGS.md. Piece 1b will do the same
— maintain it at `.research/sync-mechanism/piece-1b-discovery-scan-sonash/LEARNINGS.md`.

---

## Section 7: Product-Code Dir Inventory Protocol (D19a-b ONLY)

D19a-b scan product dirs (app/, components/, lib/, src/, etc.) to satisfy
NO FILE OUT OF SCOPE. **Do NOT deep-read files.** Per-dir output:

- Top-level dir path
- File count (recursive, excluding node_modules/)
- Total size bytes
- File-type histogram (top 5 extensions)
- Named subdirs (1 level down)
- Any Claude-Code-adjacent files observed (CLAUDE.md, .claude-*, hook-like patterns) — these get promoted to other D-agents
- Classification: `runtime_scope: project`, `portability: not-portable-product`

If a product dir contains Claude Code infrastructure artifacts (e.g., a
`hooks/` product dir that turns out to be a plugin hook system), flag in
`notes` and cross-reference the appropriate D-agent for deep scan.

---

## Version History

| Version | Date | Description |
|---------|------|-------------|
| 1.0 | 2026-04-18 | Initial spec for Piece 1b dispatch. 13 core + 6 new + per-category extensions + team parser + coverage matrix. |
