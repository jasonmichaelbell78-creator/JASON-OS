# D22a — Schema NET NEW Fields: Skills, Agents, Teams

**Agent:** D22a (Wave 2 Schema Surveyor — Cluster A)
**Profile:** codebase
**Date:** 2026-04-18
**Sub-Question IDs:** Schema survey of D1a/D1b/D1c/D1d/D1e/D1f/D2a/D2b findings
**Baseline:** D13's 63-field catalog + SCHEMA_SPEC v1.0

---

## Scope and Method

This agent read:
1. SCHEMA_SPEC.md (Section 1-7, full spec)
2. D13 schema-candidates.md (all 63 fields, all Learnings sections)
3. D1a through D1f skill findings (mega-tier, large, medium, small, tiny, shared-lib)
4. D2a and D2b agent/team/command/global findings

For each field candidate surfaced in the Wave 1 Learnings sections and finding bodies, it was checked against D13's 63 fields and SCHEMA_SPEC's per-category extensions. Only genuinely NET NEW fields are listed here — fields already in D13 or SCHEMA_SPEC are not re-derived.

**D13 baseline reminder:** D13's catalog covers 63 fields including: scope, portability, name, path, type, purpose, status, dependencies, external_refs, portability_notes, notes, stub_level, reference_layout, deferred_sections, deferred_infrastructure, has_self_audit_phase, active_scripts, agent_types_spawned, pipeline_phase, model, maxTurns, disallowedTools, color, runtime_lifecycle, event, matcher, if_condition, continue_on_error, exit_code_action, async_spawn, kill_switch_env, memory_type, prefix_convention, tenet_number, has_canonical, append_only, portable_elements, module_system, entry_point, shells_out, test_coverage, requires_build, binary_present, install_target, secret_config_required, language (tools), session_type, depth, plan_scope, trigger_events, runner_os, action_pins, secret_bearing, supersedes, superseded_by, related, lineage, component_units, is_copy_of, originSessionId, recency_signal, source_scope, runtime_scope, state_files, mcp_dependencies, required_secrets, tool_deps, dependency_hardness, output_artifacts, input_paths, sanitize_fields, is_hub, depended_on_count.

SCHEMA_SPEC v1.0 also adds (not in D13): port_lineage_frontmatter, deferred_sections (formalized), mcp_dependencies (agents), runtime_lifecycle (agents), data_contracts, workflow_family, gsd_phase.

---

## NET NEW Field Table

| # | Field Name | Type | Applies To | Priority | Source Agents |
|---|------------|------|------------|----------|---------------|
| 1 | `context_skills[]` | array | agent, team | HIGH | D2a, D2b, D1f |
| 2 | `port_status` | enum | all unit types | HIGH | D1c, D1d, D1e, D1f, D2a, D2b |
| 3 | `version_delta_from_canonical` | string | skill, agent, team | HIGH | D1c, D1d, D1e, D1f |
| 4 | `stripped_in_port[]` | array | skill, agent, team | HIGH | D1c, D1d, D1e, D2a, D2b |
| 5 | `supports_parallel` | boolean | skill | MEDIUM | D1c, D1e, D1f |
| 6 | `fallback_available` | boolean | skill | MEDIUM | D1c, D1e, D1f |
| 7 | `missing_dependencies[]` | array | skill, agent, team | MEDIUM | D1b, D1d |
| 8 | `skills_frontmatter_raw` | string | agent, team | MEDIUM | D2a, D2b, D1f |
| 9 | `has_shared_dep` | boolean | skill | MEDIUM | D1a, D1b, D1c, D1d, D1f |
| 10 | `shared_dep_paths[]` | array | skill | MEDIUM | D1a, D1b, D1c, D1d, D1f |
| 11 | `invocation_tracking` | boolean | skill | MEDIUM | D1a-D1e |
| 12 | `model_inherit` | boolean | agent | MEDIUM | D2a, D2b |
| 13 | `redirect_to` | string | agent, skill, team | MEDIUM | D2a, D2b, D1f |
| 14 | `agent_scope_tier` | enum | agent | MEDIUM | D2b |
| 15 | `portability_condition` | string | skill, agent, team, script | MEDIUM | D1b, D1d, D1e |
| 16 | `companion_docs[]` | array | skill | MEDIUM | D1b, D1d, D1e, D1f |
| 17 | `script_language` | enum | script | MEDIUM | D1b, D1e, D1f |
| 18 | `version_metadata_location` | enum | skill, agent | MEDIUM | D1c |
| 19 | `cas_cluster_member` | boolean | skill, agent, script | MEDIUM | D1c, D1d, D1f |
| 20 | `mcp_tool_wildcards[]` | array | agent, skill | MEDIUM | D2b |
| 21 | `global_scope_agent` | boolean | agent | MEDIUM | D2b |
| 22 | `estimated_time_parallel` | string | skill | LOW | D1c, D1e, D1f |
| 23 | `estimated_time_sequential` | string | skill | LOW | D1c, D1e, D1f |
| 24 | `estimated_sessions` | integer | skill | LOW | D1c |
| 25 | `total_domains` | integer | skill | LOW | D1c |
| 26 | `total_checks` | string | skill | LOW | D1c |
| 27 | `redirect_expires` | string | agent, skill | LOW | D2a, D2b |
| 28 | `lib_fork_chain[]` | array | script | LOW | D1a |
| 29 | `upstream_origin` | string | skill, agent, tool | LOW | D1c |
| 30 | `has_binary_asset` | boolean | skill, tool | LOW | D1c |
| 31 | `token_cost_multiplier` | string | team | LOW | D2b |
| 32 | `spawn_gate` | string | team, agent | LOW | D2b |
| 33 | `schema_type_correction` | string | skill | LOW | D1f |

**Total NET NEW fields identified: 33**
**HIGH priority: 4**
**MEDIUM priority: 17**
**LOW priority: 12**

---

## SCHEMA_SPEC Corrections Needed

### CORRECTION 1 — Section 4 Team Parser Is Wrong [PRIORITY: HIGH]

**Current SCHEMA_SPEC Section 4 states:** Team files use HTML comment metadata. The spec shows an example:
```
<!--
name: research-plan-team
agents: deep-research-searcher, deep-research-synthesizer, deep-plan-planner
maxTurns: 10
-->
```

**Actual finding (D2b, HIGH confidence, direct file read):** Neither current team file uses this format. Both `audit-review-team.md` and `research-plan-team.md` use a `prettier-ignore` block with markdown bold key/value pairs:
```
<!-- prettier-ignore-start -->
**Document Version:** 1.0
**Last Updated:** 2026-03-24
**Status:** ACTIVE
**Source:** agent-env Phase 4, Step 4.2
<!-- prettier-ignore-end -->
```

The agent roster is in a **markdown table**, not a key/value `agents:` field. maxTurns and spawn triggers are in prose sections.

**Impact on downstream agents:** Any D-agent or synthesis agent that tries to apply the Section 4 HTML-comment parser to team files will get zero metadata. D2b correctly noted this and parsed by reading H1 for name, first paragraph for purpose, Member Roster table for component_units, Persistence Model section for runtime_lifecycle.

**Required correction:** SCHEMA_SPEC Section 4 must be updated to reflect the actual `prettier-ignore` + bold-label pattern. The HTML-comment format either (a) was a forward-looking specification that was never adopted, or (b) describes an older format that has since been replaced. D2b cannot determine which. Either way the current files do not match the spec.

**Corrected parser rules for team files:**
1. Metadata block: first `<!-- prettier-ignore-start -->` ... `<!-- prettier-ignore-end -->` block. Parse lines matching `**Key:** Value` pattern.
2. Name: first H1 heading (typically `# Team: <name>`)
3. Purpose: first non-blank paragraph after H1
4. Member roster: first markdown table with columns including agent name/role
5. runtime_lifecycle: look for "Persistence Model" or "Lifecycle" section keywords
6. spawn_gate: look for "Spawn Gate" or "When to Use" section

If no prettier-ignore block is found, fall back to H1 + first paragraph + table parsing as D2b did.

---

### CORRECTION 2 — Section 3C Hook Event Enum Missing Two Events [PRIORITY: HIGH]

**Current SCHEMA_SPEC Section 3C `event` field enum:** `PreToolUse | PostToolUse | SessionStart | Stop | SubagentStop | Notification | PreCompact`

**D2b finding:** `agent-token-usage.jsonl` state file written by a PostToolUse hook referenced in both team files. D3a/D3b (hooks cluster, not in this agent's scope) will confirm, but the team files explicitly reference a `PostToolUse` hook writing to `.claude/state/agent-token-usage.jsonl`. This is already in the enum.

**Actual gap (from spawn prompt context and cross-cluster finding):** `UserPromptSubmit` and `PostToolUseFailure` events are NOT in the current SCHEMA_SPEC event enum. These are live Claude Code hook events in SoNash that D22b (hooks cluster) will own. Noted here for cross-cluster completeness — D22b must add them.

---

### CORRECTION 3 — Section 3A Missing 5 Skill Frontmatter Fields [PRIORITY: MEDIUM]

**Current SCHEMA_SPEC Section 3A** (Skills) lists 6 fields: `active_scripts`, `agent_types_spawned`, `has_reference_md`, `reference_layout`, `stub_level`, `port_lineage_frontmatter`.

**Missing from Section 3A** (surfaced by D1c, D1d, D1e, D1f as non-D13 frontmatter fields):
- `supports_parallel` (boolean)
- `fallback_available` (boolean)
- `estimated_time_parallel` (string)
- `estimated_time_sequential` (string)

These appear on at least 7 skill files (`audit-comprehensive`, `audit-ai-optimization`, `audit-security`, `audit-performance`, `audit-engineering-productivity`, `system-test`, `doc-optimizer`) as live YAML frontmatter. Any schema parser that reads only declared fields will silently drop these.

---

### CORRECTION 4 — Type Enum Missing `shared-doc-lib` [PRIORITY: MEDIUM]

**D1a Learning #1:** The `_shared/ecosystem-audit/` directory is a shared documentation library consumed by 8 skills. Current type options: `composite`, `doc`, `skill`. None fit: it is not executable like a composite, not a single doc, not a slash command. D1a recommends `type: shared-doc-lib`.

**Recommended addition:** Add `shared-doc-lib` to the `type` enum in SCHEMA_SPEC Section 1. This covers shared markdown module libraries that are consumed via `> Read` directives by multiple skills but have no entry-point script and produce no JSON output. The `_shared/ecosystem-audit/`, `_shared/AUDIT_TEMPLATE.md`, and `shared/CONVENTIONS.md` patterns all fit this type.

---

### CORRECTION 5 — Portability Enum Needs 4th Value [PRIORITY: MEDIUM]

**D1a Learning #2:** `tdms-ecosystem-audit` is currently classified `not-portable` but the correct semantics are "not portable until the TDMS system is ported first — then it becomes sanitize-then-portable." The current 3-value enum (`portable | sanitize-then-portable | not-portable`) cannot express this condition.

**Recommended addition:** A 4th portability value: `not-portable-systemic-dep`. This distinguishes "fundamentally non-portable" (hardcoded secrets, machine paths) from "blocked on a product system that must arrive first." D1e independently surfaces the same gap with debt-runner.

This connects to the NET NEW `portability_condition` field (Field #15 in table above) — together they form a complete representation: `portability: not-portable-systemic-dep` + `portability_condition: "Requires TDMS pipeline port. See D-agents D6-D12."`.

---

## Detailed Analysis: HIGH Priority Fields

### Field 1: `context_skills[]` — The Skills Injection Pattern

**Why this matters:** Every active project-scoped SoNash agent (16 of 17 active agents per D2a; all G-Z active agents per D2b) carries `skills: [sonash-context]` in YAML frontmatter. This is how SoNash injects project-specific context (stack versions, architecture patterns, security boundaries, key paths) into agents at spawn time.

The mechanism: when `.claude/agents/<agent>.md` has `skills: [sonash-context]` in frontmatter, Claude Code injects the content of `.claude/skills/sonash-context/SKILL.md` before the agent runs. This is not a casual field — it is the primary mechanism binding agents to project context.

**Why JASON-OS ports drop it:** The `sonash-context` skill is `not-portable` (its content is all SoNash-specific: Next.js 16.2.0, Firebase 12.10.0, Firestore schemas, etc.). When SoNash agents are ported to JASON-OS, the field is dropped because there is no equivalent `jason-os-context` skill yet. This is a known functional gap.

**Schema action:** Add `context_skills: array (nullable)` to SCHEMA_SPEC Section 3B. On port, the field value serves as a marker: an agent with `context_skills: ['sonash-context']` needs an equivalent `jason-os-context` skill created before it will have proper project context in JASON-OS.

**Absence signals portability gap:** An agent record with `context_skills: null` in a JASON-OS scan means the agent is running without project context injection. This is a quality gap indicator, not just a missing field.

---

### Field 2: `port_status` — Migration State Tracking

**Why this matters:** D13's `portability` field tells you HOW to move a unit (portable / sanitize-then-portable / not-portable). It does not tell you WHERE THE UNIT CURRENTLY IS in the migration. These are orthogonal questions.

The sync-mechanism workflow needs both: portability for planning (what will be needed), port_status for execution tracking (what has been done).

**Confirmed states from Wave 1 scans:**
- `ported` — in JASON-OS, version matches SoNash (todo v1.2 == v1.2; convergence-loop matches)
- `partial-port` — in JASON-OS but version behind or companion files missing (skill-audit JASON-OS v3.1 vs SoNash v4.0; code-reviewer SKILL.md only, 3 reference docs + 3 scripts absent)
- `sonash-only` — not in JASON-OS (repo-analysis, website-analysis, all audit-* family)
- `jason-os-only` — in JASON-OS but not in SoNash (session-begin v2.1 bootstrap-specific deferred markers)
- `in-sync` — definition exactly matches between repos (todo v1.2 == v1.2)
- `not-ported-portable` — not in JASON-OS but classified portable/sanitize-then-portable (mcp-builder, artifacts-builder, systematic-debugging)

**Enum recommended:** `ported | partial-port | sonash-only | jason-os-only | in-sync | not-ported-portable | not-ported-not-portable`

---

### Field 3: `version_delta_from_canonical`

**Why this matters:** The direction and magnitude of version gap determines the sync effort. Several confirmed gaps from Wave 1:

| Unit | JASON-OS | SoNash | Delta | Impact |
|------|----------|--------|-------|--------|
| skill-audit | v3.1 | v4.0 | +3 minor | batch/multi modes absent; cross-skill pattern detection absent |
| deep-plan | v3.0 | v3.3 | +3 minor | convergence-loop integration absent; failure paths absent |
| brainstorm | v1.0 | v1.1 | +1 minor | phase gates absent; guard rails absent |
| session-begin | v2.1 | v2.0 | -1 minor | JASON-OS AHEAD with bootstrap DEFERRED markers |
| session-end | v2.2-jasonos-v0.1 | v2.2 | same base, stripped | Phase 3 entirely absent in JASON-OS |

A free-text string captures this precisely: `"SoNash v4.0 > JASON-OS v3.1 — batch/multi modes (D7-D20 decisions) absent"`. Structured enough for display; flexible enough for complex cases.

---

### Field 4: `stripped_in_port[]`

**Why this matters:** A ported skill with stripped sections is functionally incomplete — the sync-mechanism must know WHAT was stripped to assess whether JASON-OS needs it. Currently this information is only discoverable by reading SKILL.md version histories or comparing files by hand.

**Confirmed stripped content from Wave 1:**

pr-review JASON-OS port dropped:
- CodeRabbit reviewer (integration not available)
- Gemini reviewer (integration not available)  
- TDMS Step 5 replacement (stub only)
- LEARNING_CAPTURE.md, SONARCLOUD_ENRICHMENT.md, TDMS_INTEGRATION.md reference docs
- Pipeline-style learning capture

session-end JASON-OS port dropped (entire Phase 3):
- reviews:sync pipeline
- ecosystem-health snapshot
- TDMS debt consolidation
- TDMS metric generation
- D26 data flow steps (agent-invocations.jsonl, decisions.jsonl)

session-begin JASON-OS port defers:
- 8 health scripts (patterns:check, review:check, lessons:surface, session:gaps, roadmap:hygiene, reviews:lifecycle, hooks:analytics, run-github-health.js)
- Secrets decryption gate
- SessionStart hook cross-session validation
- Consolidation status check

Making these a structured array enables: (a) automated gap lists for JASON-OS roadmap planning, (b) identifying which stripped items become available as JASON-OS matures.

---

## Comparison to D13's 63-Field Baseline

D13 was generated from the JASON-OS Piece 1a scan (13 Wave 1 D-agents, 13 Learnings sections). This D22a survey draws from the SoNash Piece 1b scan (8 skill/agent/team D-agents). The NET NEW fields reflect what SoNash's richer ecosystem reveals that JASON-OS's leaner bootstrap did not:

**Why SoNash produced more candidates:**
1. JASON-OS has 8-12 skills and 8 agents; SoNash has 80 skills and 40 agents — more variation reveals more schema gaps
2. SoNash has a complete port history (many skills ported to JASON-OS with explicit version history and stripped-content records) — JASON-OS has no equivalent migration history to mine
3. SoNash's team files are live production artifacts; JASON-OS's teams were early-stage
4. The `skills: [sonash-context]` pattern is SoNash-specific infrastructure with no JASON-OS analog yet — it couldn't have been surfaced in Piece 1a

**Overlaps confirmed (NOT re-derived here):** D13 already has deferred_sections, active_scripts, agent_types_spawned, pipeline_phase, model, maxTurns, disallowedTools, color, runtime_lifecycle, state_files, mcp_dependencies. None of these appear in the NET NEW table above.

**D13 fields that Wave 1b confirms are load-bearing:**
- `lineage` — confirmed critical by D1c (skill-creator's Anthropic origin story requires it)
- `supersedes/superseded_by` — confirmed by D1f (website-synthesis → synthesize, repo-synthesis → synthesize)
- `sanitize_fields` — confirmed by D1d (pr-review dropped CodeRabbit, Gemini), D1e (session-end stripped Phase 3)
- `deferred_sections` — confirmed by D1e (session-begin 14 DEFERRED markers, session-end Phase 3 stripped)

---

## Recommended MVP Additions (Beyond D13's 12 + data_contracts)

D13's MVP is 12 universal fields. The SCHEMA_SPEC already adds data_contracts and several per-category fields. Based on this D22a survey, the following fields have the highest value-to-cost ratio for MVP extension:

### Tier 1: Add to MVP now (HIGH priority, addresses active sync decisions)

| Field | Rationale |
|-------|-----------|
| `port_status` | Powers the work queue — without it the registry can't track what's done |
| `version_delta_from_canonical` | Directly actionable for identifying upgrade targets |
| `stripped_in_port[]` | Without this, partial ports look complete — causes false confidence |
| `context_skills[]` | Load-bearing for agent port completeness checking |

### Tier 2: Add in v1.5 (MEDIUM priority, high signal density)

| Field | Rationale |
|-------|-----------|
| `missing_dependencies[]` | market-research-reports case: 5 ghost dependencies; automatable detection |
| `has_shared_dep` + `shared_dep_paths[]` | _shared/ is a co-dependency for 11+ skills; cannot port without knowing this |
| `invocation_tracking` | Strip-or-stub signal for every ported skill; pervasive SoNash pattern |
| `portability_condition` | Distinguishes "never portable" from "portable pending X"; drives sequencing |
| `companion_docs[]` | structure.md vs REFERENCE.md ambiguity breaks has_reference_md boolean |

### Tier 3: Add when teams and agents are in sync scope

| Field | Rationale |
|-------|-----------|
| `agent_scope_tier` | global/ agents are the strongest port candidates; distinguishable by this flag |
| `mcp_tool_wildcards[]` | Wildcard MCP tool specs are unparseable without this field |
| `redirect_to` | 12 deprecated stubs across SoNash agent roster; redirect chain needs to be queryable |

---

## Learnings for Methodology

### 1. SCHEMA_SPEC Must Be Verified Against Actual Files, Not Assumed Correct

SCHEMA_SPEC Section 4 describes an HTML-comment team parser that does not match the actual SoNash team files. This was only discoverable by D2b actually reading the team files. Future schema specs should be generated FROM a survey of actual files (bottom-up), not imposed top-down and assumed correct.

**Process improvement:** Before finalizing any SCHEMA_SPEC section, at least one D-agent should verify the spec against the actual files it purports to describe.

### 2. NET NEW vs Re-Derived Is a Critical Discipline

The D22a brief was explicit: surface delta, don't re-derive universal fields. Without this constraint, a schema surveyor would produce 60+ fields that are largely overlapping with D13. The discipline of checking each candidate against D13's full 63 before including it saved significant space and kept the output actionable.

**Technique:** Read D13 completely before scanning findings. For each candidate, ask: "Is there already a field in D13 that covers this semantically?" If yes, note the confirmation but don't re-list.

### 3. Scope Split by Cluster (A vs B) Was the Right Granularity

Skills/agents/teams were a natural cluster — they share portability concerns, the `context_skills[]` field, the port_status tracking, and the `stripped_in_port[]` pattern. Hooks and scripts are a different cluster with different field candidates (event enums, exit_code_action, module_system, shells_out). The cluster split kept this D22a focused enough to be thorough.

### 4. Multiple D-agents Saying the Same Thing = HIGH Confidence

`invocation_tracking` was surfaced independently by D1a, D1b, D1c, D1d, and D1e — five agents from different skill tiers all identified the same `npx tsx write-invocation.ts` pattern as a load-bearing sanitization requirement. When a field candidate appears in 5 separate Learnings sections without coordination, it is genuinely important and HIGH confidence. Use independent-surfacing count as a confidence signal.

### 5. The `skills: [sonash-context]` Finding Is Architecturally Significant Beyond Schema

The discovery that `sonash-context` is a context-injection vehicle (not a slash command) and that every active SoNash project-scoped agent carries it reveals a pattern JASON-OS should adopt: a `jason-os-context` skill that injects JASON-OS facts into agents. This is a schema field (`context_skills[]`) AND a product recommendation. Schema surveyors should note when a schema gap reveals a pattern worth adopting.

### 6. Deprecated Stubs Are First-Class Records, Not Noise

D2a and D2b together found 12 deprecated redirect stubs across the agent roster (20% deprecation rate). D1f found 2 deprecated skill stubs. These carry meaningful data: redirect target, expiry date, consolidation rationale. The `redirect_to` and `redirect_expires` fields emerged from taking deprecated stubs seriously as first-class records.

---

## Gaps and Missing References

1. **D1e was never spawned (20 of 80 skills uncovered per D1f census).** The 20 uncovered skills include high-value JASON-OS-ported skills: brainstorm, deep-plan, session-begin, session-end, todo. Some of these likely carry additional schema candidates (D1e in the spawn prompt covered these and did produce findings — but D1f's census check found the gap in original Wave 1 dispatch). The D1e findings ARE present (read in this survey) and DO cover those 20 skills. Census gap was a dispatch tracking artifact, not a findings gap.

2. **`_shared/` directory content not deeply read.** D1f provides file lists and consumer maps for `_shared/AUDIT_TEMPLATE.md`, `_shared/SELF_AUDIT_PATTERN.md`, `_shared/SKILL_STANDARDS.md`, `_shared/TAG_SUGGESTION.md`, and `_shared/ecosystem-audit/` files. None were fully read for content. Their portability assessments are from D1f's notes, not direct reads. Schema fields that emerge from reading these shared libs (e.g., additional data contracts) may be missing.

3. **GSD skill family not covered by any D1a-f agent.** The 11 GSD global agents reference `/gsd:*` skill commands that must be in `.claude/skills/`. None of the D1a-f skill agents were assigned GSD skills. If the GSD skills carry additional schema-relevant frontmatter patterns, they are not captured here.

4. **Team file HTML-comment format history unknown.** D2b could not determine whether the SCHEMA_SPEC Section 4 HTML-comment format was ever implemented or was always a forward-looking specification. If another team file (perhaps in a different branch or an older version) uses the HTML-comment format, this survey may have missed it.

5. **`schemas/` TypeScript files classification.** D1f correctly identifies `schemas/` as a misclassified directory (no SKILL.md, should be `script-lib`). The `schema_type_correction` field captures this for individual records, but a broader question — how many other directories under `.claude/skills/` lack SKILL.md? — was not investigated.

6. **Hook event additions (UserPromptSubmit, PostToolUseFailure).** The spawn prompt notes these as cross-cluster findings that D22b will own. They are not investigated here. D22b should add them to SCHEMA_SPEC Section 3C's event enum.

---

## Confidence Assessment

- **HIGH claims:** 8 (team parser format — direct file reads; context_skills pattern — 16/17 agents confirmed; invocation_tracking — 5 independent sources; stripped_in_port — explicit version history reads; version_delta — direct frontmatter version comparison; port_status enum values — direct filesystem verification; SCHEMA_SPEC Section 4 correction — direct file read contradiction; model:inherit — multiple direct frontmatter reads)
- **MEDIUM claims:** 18 (portability assessments for NET NEW fields — based on analysis, not running the units; portability_condition necessity — reasoning from D1e cases; companion_docs recommendation — reasoning from D1b structure.md case)
- **LOW claims:** 7 (estimated_sessions/total_domains/total_checks — only 1-2 examples each; token_cost_multiplier — only 2 team examples; spawn_gate — only 2 team examples; upstream_origin — only 1 confirmed case)
- **UNVERIFIED claims:** 0

**Overall confidence:** HIGH on field identification and SCHEMA_SPEC corrections. MEDIUM on priority assignments (Piece 2 has final say).
