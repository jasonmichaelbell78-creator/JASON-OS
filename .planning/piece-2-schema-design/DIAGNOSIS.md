# DIAGNOSIS — piece-2-schema-design

**Date:** 2026-04-19 (Session #8)
**Topic:** Classification schema for sync-mechanism registry (Piece 2 of 5-piece library-catalog system)
**Status:** Phase 0 — presented for user confirmation before Discovery
**Preceding work:** BRAINSTORM.md (sync-mechanism), Piece 1a discovery scan (JASON-OS, 17 agents), Piece 1b discovery scan (SoNash, 52 agents)

---

## 1. What Piece 2 Is

Design the classification schema (field set + enum values + per-category
extensions) that every registry record will conform to. The schema is the
contract that:

- Drives sync decisions ("should this travel? how? where to?")
- Enables dependency/composite/lineage reasoning across 519+ nodes
- Lives in BOTH repos (mirrored, per BRAINSTORM §3.3)
- Must handle bidirectional traffic (JASON-OS ↔ SoNash), not just one-way port

**Piece 2 does NOT decide** (those are downstream pieces):

- How labels get attached to files (frontmatter vs external manifest vs hybrid) → Piece 3
- Storage format for the registry (JSONL / TOML / hybrid / SQLite cache) → Piece 4
- Sync engine behavior, conflict resolution UX → Piece 5
- Mass back-fill of labels → Piece 3.5

**Piece 2 DOES decide** (schema design only):

- Which fields are in the schema
- Enum values for each enum field
- Which fields are universal (all types) vs per-category extensions
- Schema versioning approach
- Relationship-field design (supersedes, lineage, component_units, related)
- How to handle migration-phase vs steady-state fields
- How composites (multi-file atomic-port units) are represented
- How source_scope vs runtime_scope are resolved
- What `data_contracts[]` looks like as a first-class field

---

## 2. ROADMAP Alignment

**Aligned.** JASON-OS v0.1 has no ROADMAP.md; BRAINSTORM.md establishes
sync-mechanism as the sole active priority and lays out the 5-piece sequence
with Piece 2 = schema design as the direct successor to Pieces 1a/1b. This
task is the documented next step, not a detour.

---

## 3. Prior Research Context

### 3.1 Piece 1a — JASON-OS Census (17 agents, 2026-04-18)

- **Inventory:** ~47 portable skills identified; 204-edge dependency graph (178 HIGH / 24 MEDIUM / 2 LOW); 15 composites (8 workflows, 6 processes, 1 memory system); 73 schema-field candidates consolidated.
- **D13's 12-field MVP proposal:** name, path, type, scope, portability, status, purpose, dependencies, lineage, supersedes+superseded_by, sanitize_fields, notes.
- **5 Critical Findings for schema:**
  1. Content bleed in user-scoped memory (body inspection required, not just file-level classification)
  2. 50-file canonical-memory gap (73% of portable rules only in user-home, not git-tracked)
  3. source_scope vs runtime_scope split required (cache.go canonical example)
  4. `data_contracts[]` is a missing load-bearing field (SESSION_CONTEXT.md, RESEARCH_OUTPUT.md, handoff.json have implicit schemas)
  5. Cache directory naming convention (repo-name-suffixed) must be captured in `install_target`

### 3.2 Piece 1b — SoNash Census (52 agents, 2026-04-18)

- **Scale:** 519 unique dependency nodes, 884 edges; 26 composites; 72 NET NEW fields over Piece 1a; 93% VERIFIED post-dispute.
- **D22 21-field MVP proposal:** D22a HIGH 17 + D22b HIGH 4 = 21 fields plus the 5 SCHEMA_SPEC corrections.
- **5 SCHEMA_SPEC corrections blocking Piece 2** (already in SCHEMA_SPEC v1.0 but need verification/codification):
  1. Team parser format: prettier-ignore + bold + table (HTML-comment was WRONG)
  2. Hook event enum: +UserPromptSubmit, +PostToolUseFailure
  3. Section 3A missing 4 frontmatter fields (supports_parallel, fallback_available, estimated_time_parallel, estimated_time_sequential)
  4. Type enum: +shared-doc-lib, +database
  5. Portability enum: +not-portable-systemic-dep (→ 5 values total); status enum: +generated
- **Security flags (3 formal + 1 precautionary):** firebase-service-account.json (CRITICAL), .env.local (HIGH), .env.production (MEDIUM), config.local.toml (precautionary). All gitignored; git history verification pending for #1.
- **3 operationally-wrong canonical files:** user_expertise_profile, feedback_stale_reviews_dist, project_agent_env_analysis — must correct before any memory sync.
- **3 back-port candidates (JASON-OS → SoNash):** session-begin v2.1, session-end-commit.js process.execPath, deep-research T23 safety net.

### 3.3 Challenges Raised Against Piece 1b Findings

**Contrarian HIGH (5):**
1. **21-field MVP is a migration schema, not a sync schema.** Fields like `context_skills[]`, `dropped_in_port[]`, `stripped_in_port[]` become null in steady state. **Recommendation:** split schema into migration-phase + steady-state sections, or time-box migration fields.
2. **Back-port session-begin v2.1 is mostly DEFERRED markers, not real improvements.** Real improvement is `process.execPath` in session-end-commit.js only.
3. **"Install GSD via npm" needs pinning + upgrade review gate.** Unpinned npm update propagates breaking changes globally across `~/.claude/`.
4. **73% canonical-memory gap may be feature, not bug.** Canonical vs user-home curation is deliberate; only 3 operationally-wrong files are unambiguous. Schema should distinguish "sync gap" vs "intentional scope difference."
5. **Copy-not-import for safe-fs.js is architecture, not debt.** Self-containment over DRY is a conscious trade-off (like Docker, Go statically-linked binaries). Keep copies + add `has_copies_at[]` + hash drift detection.

**OTB alternatives (8; 3 HIGH-impact):**
1. **Behavior-as-unit (`composite_id` field).** Cheapest highest-leverage schema addition.
2. **Explicit copy + diff for Foundation layer, no sync engine for simple cases.** Shrinks Piece 2 scope.
3. **`@jason-os/foundation` npm package.** Collapses 10 safe-fs.js copies into single versioned dep. GSD plugin precedent proves this works in the same codebase.
4. Dotfiles-style template markers (chezmoi/yadm).
5. Plugin registry / init()-based pattern (Composio).
6. git-subtree or git-submodule for shared layer.
7. (+ 2 more in otb-1.md; 3 LOW feasibility, deferred)

### 3.4 Existing SCHEMA_SPEC v1.0 (from Piece 1b)

Already codified at `.research/sync-mechanism/piece-1b-discovery-scan-sonash/SCHEMA_SPEC.md`. Contents:

- **Section 1 — 13 core fields:** agent_id, type, name, path, scope, portability, status, purpose, dependencies, external_refs, lineage, sanitize_fields, notes.
- **Section 2 — 6 Piece-1b additions:** originSessionId, source_scope, runtime_scope, deferred_sections, module_system, supersedes+superseded_by.
- **Section 3 — per-category extensions** (3A skills, 3B agents+teams, 3C hooks, 3D memories, 3E scripts, 3F tools, 3G research-sessions, 3H planning-artifacts, 3I CI-workflows, 3J composites).
- **Sections 4-7:** team parser rules, dir coverage matrix, learnings protocol, product-dir census protocol.

**This is the starting point for Piece 2.** Piece 2 will either adopt-and-amend it or propose a different structure, informed by challenges and the 21-field-vs-12-field tension.

---

## 4. Schema Design Tensions to Resolve in Discovery

| # | Tension | Options |
| --- | --- | --- |
| T1 | MVP size: 12 fields (D13) vs 21 fields (D22a+D22b HIGH) vs SCHEMA_SPEC v1.0 (13+6+per-cat) | Adopt one or blend |
| T2 | Migration-phase vs steady-state schema | Split sections / time-box / unified |
| T3 | Single `scope` vs `source_scope`+`runtime_scope` split | One / both / tool-and-hook-only |
| T4 | `data_contracts[]` as first-class composite field | Yes / defer to v2 |
| T5 | Composite representation: new field `composite_id` or new type `composite`? | Field / type / both |
| T6 | Per-category extensions: how many, gated how? | Full SCHEMA_SPEC v1.0 / trim / start flat |
| T7 | Computed vs declarative fields (is_hub, depended_on_count, recency_signal) | Store / compute on demand / both |
| T8 | Foundation-layer carve-out: treat as sync-candidate or npm-package / subtree candidate? | Sync / npm / subtree / hybrid |
| T9 | Copy-detection: `has_copies_at[]` + hash vs centralize | Detection / centralize / npm |
| T10 | Canonical-memory framing: `has_canonical` gap or `intentional-scope-difference` enum? | Binary / enum / both |
| T11 | Schema versioning: semver at field level / file level / none? | Decide versioning model |
| T12 | Enum evolution: how is a new enum value added post-v1? | Decide governance |
| T13 | Portability enum values: 3 (original) / 4 (+not-portable-systemic-dep) / 5 (+not-portable-product) | Align with SCHEMA_SPEC v1.0 |
| T14 | Type enum size: 20 (Piece 1a) / 22 (Piece 1b +shared-doc-lib +database) / more | Decide canonical set |
| T15 | Relationship-field design: `supersedes`/`superseded_by`/`related`/`component_units`/`lineage`/`is_copy_of`/`has_copies_at` — all, subset, consolidated? | Decide which |
| T16 | Security-flag surfacing in schema: `contains_secrets` bool or pattern-based? | Field or exclusion-list |
| T17 | Canonical-promotion workflow representation in schema (D23 cross-refs, MEMORY.md index) | Schema field(s) or out-of-band process |
| T18 | Sanitization representation: `sanitize_fields[]` list vs transform-spec vs template-markers | List / regex / chezmoi-style |
| T19 | Schema must-fit requirement: universal set (all types) or type-agnostic-base + per-type subclasses | Decide inheritance model |
| T20 | Schema's own self-description: is the schema itself a registry record? | Yes (meta) / no (external) |

---

## 5. Downstream Implications

Schema decisions cascade into Pieces 3/4/5:

- **Piece 3 (labeling):** where labels live depends on schema size and typing. A 12-field schema fits in YAML frontmatter; a 30+-field schema probably needs external manifest.
- **Piece 4 (registry):** storage primitive choice follows schema structure. Flat universal schema → JSONL. Type-hierarchical schema → SQLite/TOML may be better.
- **Piece 5 (sync engine):** conflict resolution logic depends on whether `lineage` + `supersedes` + `version_delta_from_canonical` are present as structured fields.

**Implication:** Piece 2 should NOT over-commit to fields that anchor Piece 3/4/5 decisions that haven't been made yet. But it MUST include the fields that any downstream piece will need or those pieces cannot begin.

---

## 6. Proposed Approach to Discovery

Based on the 20 tensions above and the research depth, discovery will likely need **4-6 batches** (~30-40 questions) covering:

- **Batch A — Scope & Philosophy:** MVP size, migration-vs-steady-state, what-belongs-where-in-schema (tensions T1, T2, T19, T20)
- **Batch B — Core Fields & Enums:** type enum, scope enum, portability enum, status enum, value alignments with SCHEMA_SPEC v1.0 (T13, T14)
- **Batch C — Relationship Fields:** supersedes, lineage, component_units, related, is_copy_of, has_copies_at (T15, T9)
- **Batch D — Scope Split & Composites:** source_scope/runtime_scope, data_contracts, composite_id vs composite-type (T3, T4, T5)
- **Batch E — Per-Category Extensions & Computed Fields:** skills/agents/hooks/memories/scripts/tools/research/planning/CI extensions, computed vs declarative (T6, T7)
- **Batch F — Governance, Versioning, Edge Cases:** schema versioning, enum evolution, security flags, canonical-promotion, sanitization representation (T11, T12, T16, T17, T18)
- **Batch G — Foundation carve-out & OTB alternatives:** whether Foundation layer is in scope of this schema at all, or treated as npm/subtree/copy+diff (T8, contrarian #5, OTB #2/3)

This is a floor estimate. Questions that generate follow-ups may push higher.

---

## 7. Reframe Check — Is This What It Appears to Be?

**Yes, with one nuance:**

The task appears to be "design a 12-or-21-field schema and move on." The research shows the real task is **"design a schema that (a) acknowledges the 5 HIGH contrarian challenges to the D22 MVP, (b) reconciles migration vs steady-state tension, (c) defines a versioning / evolution path so the schema can grow without rewrites, and (d) answers whether the Foundation layer is inside or outside this schema at all."**

The nuance matters because the contrarian challenges are not edge cases — they are load-bearing framing issues. If Piece 2 adopts the 21-field MVP unchanged, there's a 6-month rewrite risk (contrarian HIGH #1). If Piece 2 treats canonical-memory gap as pure deficit, it corrupts a working curation system (HIGH #4). Discovery must surface these as explicit user decisions, not sweep them under MVP adoption.

---

## 8. Verification Status of This DIAGNOSIS

All claims above cite Piece 1a/1b research outputs read directly in this
session (not derived from memory). Convergence-loop verification of DIAGNOSIS
claims is **deferred to user confirmation step** — if the user confirms the
diagnosis as written, we proceed to Phase 1. If the user flags any claim as
inaccurate, we re-verify before Discovery.

**Key verifiable claims:**

| # | Claim | Source |
| --- | --- | --- |
| C1 | Piece 1a has 73 schema-field candidates | D13-schema-candidates.md |
| C2 | D13 recommends 12-field MVP | D13 §6, RESEARCH_OUTPUT §4.2 |
| C3 | Piece 1b identified 72 NET NEW fields; 21-field MVP | RESEARCH_OUTPUT §Theme 11 |
| C4 | 5 SCHEMA_SPEC corrections flagged as blocking for Piece 2 | RESEARCH_OUTPUT §Schema Corrections |
| C5 | 519 nodes, 884 edges in SoNash dep graph | RESEARCH_OUTPUT §Executive Summary |
| C6 | Contrarian produced 5 HIGH challenges | challenges/contrarian-1.md (count) |
| C7 | OTB produced 8 alternatives | challenges/otb-1.md (count) |
| C8 | 5 Critical Findings in Piece 1a §5 | RESEARCH_OUTPUT §5 |

---

## 9. Files This Plan Will Produce

- `.planning/piece-2-schema-design/DIAGNOSIS.md` — this file
- `.planning/piece-2-schema-design/DECISIONS.md` — standalone decision record from Phase 1 Q&A
- `.planning/piece-2-schema-design/PLAN.md` — implementation plan for schema file(s)
- `.claude/state/deep-plan.piece-2-schema-design.state.json` — session state

**Schema files themselves (the artifact this plan implements)** will likely
live at `.claude/sync/schema/SCHEMA.md` + `.claude/sync/schema/enums.jsonl`
(or similar) — exact path is a Phase 1 decision.

---

**Status:** Presented for user confirmation. Do NOT proceed to Discovery until
user confirms diagnosis or reframes the task.
