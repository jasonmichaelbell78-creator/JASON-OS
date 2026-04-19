# D22b — Schema NET NEW Fields: Hooks, Scripts, Memories, Research, Planning, CI, Tools, Product

**Agent:** D22b (Wave 2 Schema Surveyor — Cluster B)
**Profile:** codebase
**Date:** 2026-04-18
**Sub-Question IDs:** Schema survey of D3a/D3b (hooks), D4a-D4d/D5 (memories), D6a-D6d/D7/D8a-b/D9/D10a-b/D11a-b/D12 (scripts), D13 (tools), D14a-c (research), D15a-b (planning), D16 (CI), D17a-b (root docs/configs), D18 (sonash-specific), D19a-b (product)
**Baseline:** D13's 63-field catalog + SCHEMA_SPEC v1.0 + D22a's 33 NET NEW fields (skills/agents/teams cluster)

---

## Scope and Method

This agent read:
1. SCHEMA_SPEC.md (full spec, v1.0)
2. D13 schema-candidates.md (all 63 fields, all Learnings sections — JASON-OS Piece 1a baseline)
3. D22a findings (33 NET NEW fields from skills/agents/teams cluster — to avoid re-derivation)
4. All 19 Wave 1 D-agent findings from the assigned cluster B scope, reading Learnings sections, Gaps sections, and finding bodies

For each field candidate, it was checked against D13's 63 fields, SCHEMA_SPEC's per-category extensions, AND D22a's 33 NET NEW fields. Only genuinely NET NEW fields are listed — already-cataloged fields are not re-derived.

**Combined baseline reminder:** D13 (63) + D22a (33) = 96 cataloged fields before this survey.

---

## NET NEW Fields Table

| # | Field Name | Type | Applies To | Priority | Source Agents |
|---|------------|------|------------|----------|---------------|
| 1 | `event_enum_UserPromptSubmit` | enum addition | hook | HIGH | D3a, D3b, D17b |
| 2 | `event_enum_PostToolUseFailure` | enum addition | hook | HIGH | D3b, D22a-xref |
| 3 | `behavioral_guardrail_injection` | boolean | hook | MEDIUM | D3b |
| 4 | `hook_state_location` | enum | hook, hook-lib | MEDIUM | D3a, D3b |
| 5 | `dead_reference` | boolean | hook, script, config | MEDIUM | D3b |
| 6 | `supersedes_filename` | string | memory, canonical-memory | HIGH | D5, D4a |
| 7 | `canonical_staleness_category` | enum | memory, canonical-memory | HIGH | D5 |
| 8 | `orphan_status` | enum | memory, canonical-memory | MEDIUM | D5 |
| 9 | `session_id_format` | enum | memory, research-session, planning-artifact | MEDIUM | D4a, D5 |
| 10 | `drift_type` | enum | memory, canonical-memory | MEDIUM | D5 |
| 11 | `cross_boundary_deps` | array | script, hook, script-lib | MEDIUM | D6b |
| 12 | `dual_export` | boolean | script | LOW | D6b |
| 13 | `has_write_side_effects` | boolean | script | MEDIUM | D6b |
| 14 | `has_copies_at` | array | script-lib, script, hook-lib | MEDIUM | D7 |
| 15 | `module_system_note` | string | script, script-lib | LOW | D7 |
| 16 | `generated_status` | enum addition | script, script-lib, tool-file, config | MEDIUM | D10b, D17a |
| 17 | `test_consumes` | enum | script | LOW | D10b, D8b, D12 |
| 18 | `build_pipeline` | string | script, script-lib, tool | MEDIUM | D10b, D13 |
| 19 | `module_system_subdir_override` | boolean | script, script-lib, config | MEDIUM | D11b |
| 20 | `migration_complete` | boolean | script, planning-artifact | MEDIUM | D12 |
| 21 | `test_type` | enum | script | LOW | D12, D10b |
| 22 | `index_schema_variant` | enum | research-session | MEDIUM | D14a, D14b |
| 23 | `index_drift` | object | research-session | HIGH | D14a, D14c |
| 24 | `has_pre_research_decisions` | boolean | research-session | LOW | D14a |
| 25 | `partial_completion` | object | research-session, plan, composite | MEDIUM | D14c, D14b |
| 26 | `brainstorm_questions_answered` | integer | research-session | LOW | D14c |
| 27 | `session_type_hybrid_subtype` | string | research-session | LOW | D14c, D14b |
| 28 | `type_database` | enum addition | research-session, config | MEDIUM | D14b |
| 29 | `document_role` | enum | planning-artifact, plan, research-session | MEDIUM | D15a |
| 30 | `handoff_sub_type` | enum | planning-artifact | LOW | D15b, D15a |
| 31 | `dropped_in_port` | array | skill, agent, composite, tool | HIGH | D21b, D21a |
| 32 | `suppression_engine` | enum | config, ci-workflow | MEDIUM | D16 |
| 33 | `three_config_ambiguity` | boolean | config | MEDIUM | D16 |
| 34 | `action_pin_pattern` | enum | ci-workflow | LOW | D16 |
| 35 | `namespace_collision_risk` | boolean | tool, tool-file | MEDIUM | D13 |
| 36 | `version_binary_name_pattern` | string | tool | LOW | D13 |
| 37 | `auto_generated_from` | string | script, config, tool-file | LOW | D19a, D17a, D10b |
| 38 | `secret_bearing_public` | boolean | config, ci-workflow, tool-file | MEDIUM | D17b |
| 39 | `methodology_portability` | enum | skill, composite, planning-artifact, research-session | MEDIUM | D21b, D21a |

**Total NET NEW fields identified (Cluster B): 39**
(Note: `upstream_origin_confirmed` (#40 in JSONL) is a D22b confirmation of D22a's `upstream_origin` field — not a new field. Excluded from count.)

**HIGH priority: 6**
**MEDIUM priority: 20**
**LOW priority: 13**

---

## SCHEMA_SPEC Corrections Needed

### CORRECTION 1 — Section 3C Hook Event Enum Missing Two Events [PRIORITY: HIGH]

**Current SCHEMA_SPEC Section 3C `event` field enum:**
`PreToolUse | PostToolUse | SessionStart | Stop | SubagentStop | Notification | PreCompact`

**D3a/D3b finding (HIGH confidence, direct settings.json + file reads):**
SoNash wires two additional events that are completely absent from the SCHEMA_SPEC enum:

| Event | Hook | Size | Description |
|-------|------|------|-------------|
| `UserPromptSubmit` | user-prompt-handler.js | 718 lines | Fires on every user message; 6-phase behavioral enforcement |
| `PostToolUseFailure` | loop-detector.js | ~200 lines | Fires after Bash tool failures; detects error loops |

D17b independently confirms `UserPromptSubmit` in HOOKS.md. D22a §Correction 2 cross-references from the skills/agents cluster.

**`Notification` event status:** Already in SCHEMA_SPEC but fires an inline curl command in settings.json (no .js file). D3b confirms this is active.

**Required action:** Add `UserPromptSubmit` and `PostToolUseFailure` to the `event` enum in SCHEMA_SPEC Section 3C.

**Updated enum should be:**
`PreToolUse | PostToolUse | PostToolUseFailure | SessionStart | Stop | SubagentStop | Notification | PreCompact | UserPromptSubmit`

---

### CORRECTION 2 — Status Enum Missing `generated` Value [PRIORITY: MEDIUM]

**Current SCHEMA_SPEC Section 1 `status` enum:**
`active | deferred | archived | deprecated | stub | gated | complete`

**D10b finding:** dist/ compiled TypeScript artifacts need `status: generated` — they ARE active (CI runs them) but should NEVER be synced (always regenerate from source). The current enum has no way to capture "active but generated artifact — port the source instead."

**D17a finding:** llms.txt is auto-generated from the skills directory — same semantics.

**Required action:** Add `generated` to the `status` enum. Definition: "This file is a build artifact or auto-generated output. The authoritative source is elsewhere (captured in `auto_generated_from`). Do not port this file — regenerate from source in the target environment."

---

### CORRECTION 3 — Type Enum Missing `database` Value [PRIORITY: MEDIUM]

**Current SCHEMA_SPEC Section 1 `type` enum:**
`skill | agent | team | command | hook | hook-lib | memory | canonical-memory | script | script-lib | tool | tool-file | research-session | plan | planning-artifact | learnings-doc | todo-log | config | ci-workflow | doc | composite | product-code`

**D14b finding:** SQLite databases (knowledge.sqlite, content-analysis.db) exist in .research/ and do not fit any current type. `config` is wrong (databases are not configuration). `tool-file` is wrong (they are data stores, not tool source). No current type fits.

**Required action:** Add `database` to the type enum. Definition: "A structured data store (SQLite, large JSONL corpus, data archive) that is a unit-level artifact. Never port content; port schema definition only; always regenerate data in the target environment."

---

### CORRECTION 4 — Section 5 Coverage Matrix Gap: `.claude/plans/` [PRIORITY: LOW]

**D17b Learning #4:** SoNash stores plans in `.claude/plans/` while JASON-OS uses `.planning/` at project root. SCHEMA_SPEC Section 5 coverage matrix assigns `.planning/` to D15a-b but has no entry for `.claude/plans/`. It falls under "`.claude/` other: D17a-b" by default. This is coverage but not explicit.

**Required action:** Add `.claude/plans/` row to Section 5 coverage matrix explicitly, assigned to D17a-b or promoted to D15a-b depending on plan scope.

---

## HIGH Priority Additions for MVP v1.5

Six fields warrant HIGH priority addition beyond D22a's four HIGH fields:

### 1. `event_enum_UserPromptSubmit` and `event_enum_PostToolUseFailure` — SCHEMA_SPEC corrections

These are not new fields — they are corrections to the existing `event` enum. Without them, the schema misrepresents SoNash's actual hook architecture. Any D-agent that reads the SCHEMA_SPEC will classify UserPromptSubmit hooks as having an invalid event type. The SCHEMA_SPEC must be updated before any downstream hook classification tooling is built.

**Impact:** 2 hooks (user-prompt-handler.js, loop-detector.js) — two of the most architecturally significant hooks in SoNash — are currently misclassified.

### 2. `supersedes_filename` — Memory rename tracking

D5 identifies the feedback_verify_not_grep → feedback_grep_vs_understanding rename as "the hardest gap type" in canonical-gap analysis. A filename-match gap analysis detects it as a missing file on both sides when it is actually a rename. A sync mechanism that doesn't track this will attempt to port both files, creating duplicates. This field directly enables the semantic deduplication step that prevents duplicate-memory imports.

**Impact:** Without it, ~5-8 rename cases in SoNash's 83-memory ecosystem will create false gaps and potential duplicate imports.

### 3. `canonical_staleness_category` — Prevents harmful sync operations

D5 Part 4 documents 3 files with `operationally-wrong` staleness: one references a removed npm command (would cause a hard failure), one has the wrong user expertise profile (would cause tools to be recommended by language stack instead of ease/quality), one shows completed work as in-progress (would cause re-execution of done work).

A sync mechanism that promotes canonical to user-home without checking this field would import harmful instructions. This is the highest-risk finding in the memories cluster.

**Impact:** 3 operationally-wrong canonical files that must NOT be synced as-is.

### 4. `index_drift` — Research session reliability guard

D14a confirms the research-index.jsonl has a 45% error rate across its dimensions (5/11 path, 4/11 status, 2/11 depth, 1/11 claim count). Any sync tooling that trusts the index without verification will make incorrect decisions for nearly half of all indexed sessions.

**Impact:** Without `index_drift`, the sync mechanism cannot automatically distinguish "trust this session's index metadata" from "verify against metadata.json."

### 5. `dropped_in_port` — Port completeness tracking

D21b Learning #3 identifies three composites with trimmed ports: pr-review (3 reference files), session-end (Phase 3), skill-audit (v3.1 vs v4.0). The existing `deferred_sections` field only captures what is deferred within a unit; `dropped_in_port` captures what was excluded during the port itself. Without this, the JASON-OS registry shows these composites as complete when they are materially incomplete.

**Impact:** 3+ composites appear complete but have significant capability gaps in JASON-OS.

---

## Unit Types That Need the Most Schema Work

By count of NET NEW fields surfaced, the unit types with the largest schema gaps are:

| Unit Type | NET NEW Fields | Key Gaps |
|-----------|----------------|----------|
| memory / canonical-memory | 5 | supersedes_filename, canonical_staleness_category, orphan_status, drift_type, session_id_format |
| script / script-lib | 9 | cross_boundary_deps, dual_export, has_write_side_effects, has_copies_at, module_system_note, generated_status, test_consumes, build_pipeline, module_system_subdir_override |
| research-session | 6 | index_schema_variant, index_drift, has_pre_research_decisions, partial_completion, brainstorm_questions_answered, session_type_hybrid_subtype |
| hook / hook-lib | 4 | event_enum additions, behavioral_guardrail_injection, hook_state_location, dead_reference |
| planning-artifact / plan | 3 | document_role, handoff_sub_type, migration_complete |
| ci-workflow / config | 4 | suppression_engine, three_config_ambiguity, action_pin_pattern, secret_bearing_public |
| tool / tool-file | 4 | build_pipeline, namespace_collision_risk, version_binary_name_pattern, auto_generated_from |

**Scripts** have the most net new fields because SoNash's 312-file scripts ecosystem revealed structural patterns (TypeScript compilation, subdir ESM overrides, cross-boundary imports, dual-export patterns) that JASON-OS's lean scripts/ didn't surface in Piece 1a.

**Memories** have the most critical fields — the canonical_staleness_category and supersedes_filename fields directly prevent harmful sync operations.

---

## Final MVP Recommendation

### Starting Point Recap

- D13 MVP: 12 universal fields (name, path, type, scope, portability, status, purpose, dependencies, lineage, supersedes+superseded_by, sanitize_fields, notes)
- D13 §8.1.2 adds: `data_contracts` = 13
- D22a recommends adding 4 HIGH fields: port_status, version_delta_from_canonical, stripped_in_port[], context_skills[] = 17

### D22b Additions for MVP v1.5

From cluster B's HIGH priority findings, the following should be added:

| Field | Rationale | Unit Types |
|-------|-----------|------------|
| `dropped_in_port[]` | Port completeness tracking — without it, partial ports appear complete | skill, agent, composite, tool |
| `canonical_staleness_category` | Prevents importing operationally-wrong canonical memories | memory, canonical-memory |
| `supersedes_filename` | Enables semantic deduplication for renamed memories | memory, canonical-memory |
| `index_drift` | Flags unreliable index entries for research sessions | research-session |

**Recommended MVP at v1.5: 17 fields (D22a) + 4 (D22b HIGH) = 21 fields**

### SCHEMA_SPEC Enum Corrections (not new fields, but required)

These must be applied regardless of MVP scope:

1. Add `UserPromptSubmit` and `PostToolUseFailure` to the hook `event` enum (Section 3C)
2. Add `generated` to the `status` enum (Section 1)
3. Add `database` to the `type` enum (Section 1)

Without these corrections, the SCHEMA_SPEC misrepresents live SoNash data. Any tooling built on the uncorrected spec will produce wrong classifications.

### What to Defer to v2.0

The following MEDIUM priority fields are genuinely valuable but add complexity before the core sync workflow is proven:

- Scripts cluster (cross_boundary_deps, has_write_side_effects, has_copies_at, build_pipeline, module_system_subdir_override): Add when scripts sync is in scope
- Memory cluster (orphan_status, drift_type, session_id_format): Add when canonical-memory sync is designed
- Research cluster (partial_completion, index_schema_variant): Add when research sync is in scope
- Config cluster (suppression_engine, three_config_ambiguity, secret_bearing_public): Add when CI sync is in scope

---

## Combined NET NEW Summary (D22a + D22b)

| Cluster | Fields | HIGH | MEDIUM | LOW |
|---------|--------|------|--------|-----|
| D22a: Skills, Agents, Teams | 33 | 4 | 17 | 12 |
| D22b: Hooks, Scripts, Memories, Research, Planning, CI, Tools, Product | 39 | 6 | 20 | 13 |
| **Total NET NEW** | **72** | **10** | **37** | **25** |

Grand total schema candidates: D13 (63) + SCHEMA_SPEC extensions (13 per-category) + D22a (33) + D22b (39) = **148 distinct candidates**

The 21-field MVP recommendation represents a curated 14% of the full 148-field candidate space — the minimum viable set for actionable sync decisions.

---

## Learnings for Methodology

### 1. Cluster B Is Structurally More Diverse Than Cluster A

Skills/agents/teams (D22a) share portability concerns and the port_status tracking pattern. Cluster B spans 9 unit types with fundamentally different concerns: hooks (event lifecycle, behavioral injection), memories (canonical drift, rename tracking), scripts (build pipelines, module system complexity), research sessions (index reliability, completion state). The schema candidates are correspondingly more heterogeneous. Future schema surveyors should expect higher variance in cluster B equivalents.

### 2. The "Operationally Wrong" Staleness Category Is Underappreciated

D5 identified 3 files where canonical content would actively harm Claude's behavior if imported. The schema field `canonical_staleness_category` exists specifically to surface these before a sync operation executes. The distinction between `formatting-only` (safe to automated merge), `content-addition` (manual review needed), and `operationally-wrong` (must not sync as-is) is load-bearing for any memory sync workflow. This field should be validated and populated BEFORE any canonical-to-user-home sync is attempted.

### 3. SCHEMA_SPEC Enum Corrections Have Higher Impact Than New Fields

Two of the three SCHEMA_SPEC corrections identified (hook event enum, status generated enum) affect current D-agents that may have emitted wrong classifications. Any Wave 1 hook records that classified UserPromptSubmit events will have `event: null` or `event: [invalid]` in their JSONL. The enum correction doesn't just update the spec — it requires re-verifying that D3a/D3b records have correct event values for those two hooks.

### 4. Scripts Cluster Schema Gaps Reveal Architectural Complexity

SoNash's scripts/ has: TypeScript compilation pipelines (D10), per-subdirectory package.json module overrides (D11b), cross-boundary imports (D6b), dual-export scripts (D6b), data integrity tests alongside unit tests (D12). None of these patterns existed in JASON-OS's lean scripts/. The schema gap is proportional to the architectural gap: JASON-OS scripts are simple CJS Node.js scripts; SoNash scripts are a multi-language, multi-build-pipeline, TypeScript-centric ecosystem.

**Implication for Piece 2:** The scripts schema fields are necessary but may be overkill for JASON-OS's current scale. The MVP for scripts sync can start with just `module_system`, `entry_point`, `shells_out`, `test_coverage`, and `build_pipeline` (the 5 most operationally impactful fields). The others (cross_boundary_deps, dual_export, has_write_side_effects, has_copies_at, etc.) become relevant as JASON-OS scripts grow in complexity.

### 5. `dropped_in_port` and D22a's `stripped_in_port[]` Are Complementary, Not Redundant

D22a's `stripped_in_port[]` captures what was removed FROM the SoNash source WHEN porting to JASON-OS (perspective: "what did this SoNash unit have that JASON-OS didn't take?"). D22b's `dropped_in_port` captures the same information but from the composite perspective and is the recommended field name per D21b. These are the same semantic concept — Piece 2 should choose ONE field name and use it consistently. Recommendation: `dropped_in_port` (D22b/D21b naming) because it appears on both individual units AND composites.

### 6. The Memory Rename Problem Is Systematic

D5 documents only one confirmed rename case (verify_not_grep → grep_vs_understanding) but the pattern is systematic: as behavioral rules evolve, memory files are renamed to better reflect their generalized scope. Any memory sync workflow that does filename-match gap analysis will systematically misclassify renamed memories as gaps. The `supersedes_filename` field is the structural fix, but the methodology implication is: filename-match is a necessary first pass, not a sufficient final analysis.

---

## Gaps and Missing References

1. **D4b-D4d memories not individually read.** D4a (21 memories) was read for schema patterns. D4b/D4c/D4d were not directly read (only patterns derived from D5's cross-cutting gap analysis). The schema candidates for memories are derived from D5 + D4a, not from the full 83-memory corpus. D4b-D4d may have additional memory-type schema candidates not surfaced here.

2. **D18 (SoNash-specific dotdirs) Learnings not read.** D18 covers .agent/, .agents/, tool-configs/, and .claude/state/ enumeration. Its Learnings section was not read in this scan. Any schema candidates from state file taxonomy, .agent/ vs .agents/ distinction, or tool-configs/ patterns are not captured here.

3. **D20a-D20c-D20d (dependency maps) Learnings not read.** These agents built the dependency graph. They may have surfaced graph-level schema candidates (e.g., `is_hub`, `depended_on_count` re-confirmation, new edge types) not captured by D22b's cluster B scope.

4. **D21c (processes) and D21d (GSD cluster) not read.** These composites agents may have additional schema candidates from the process taxonomy and GSD workflow patterns. GSD skills are explicitly flagged in D13 §7 as likely introducing `workflow_family` and `gsd_phase` fields — these are already in SCHEMA_SPEC Section 3J but D21d may surface additional GSD-specific field candidates.

5. **`.claude/state/` full file census not read.** D17b notes 127 state files vs 15 documented — a 8x documentation gap. The state file taxonomy (what types of state exist, naming conventions, schema patterns) was not inventoried as a schema source. A dedicated STATE_SCHEMA.md analysis pass would likely surface additional `state_files` sub-typing candidates.

6. **`docs/schemas/agent-token-usage.schema.json` not read.** D19b flags this as potentially relevant to hook-level state files. Its JSON Schema content was not captured. May surface additional data contract fields.

7. **Cross-locale config patterns not extracted as schema fields.** D17b documents override-log.jsonl entries containing `C:\\Users\\Owner\\workspace\\sonash` (different machine user). Machine-specific path contamination in audit trails is a systematic risk. A `machine_path_contamination_risk: boolean` field would enable filtering of files whose content includes absolute machine paths before sync.

---

## Confidence Assessment

- HIGH claims: 15 (SCHEMA_SPEC enum corrections confirmed by direct hook file + settings.json reads; canonical_staleness_category from D5 direct read; supersedes_filename from D5 direct analysis; index_drift from D14a direct index-vs-filesystem comparison; dropped_in_port from D21b direct composite analysis)
- MEDIUM claims: 19 (most field candidates derived from Learnings section recommendations across multiple agents; field boundaries are judgment calls)
- LOW claims: 5 (single-source candidates: has_pre_research_decisions D14a only; brainstorm_questions_answered D14c only; session_type_hybrid_subtype D14c/D14b; version_binary_name_pattern D13 only; action_pin_pattern D16 only)
- UNVERIFIED claims: 0

**Overall confidence:** HIGH for SCHEMA_SPEC corrections (direct evidence). MEDIUM for field prioritization (Piece 2 has final say). MEDIUM for completeness (D4b-d, D18, D20, D21c-d not fully read).
