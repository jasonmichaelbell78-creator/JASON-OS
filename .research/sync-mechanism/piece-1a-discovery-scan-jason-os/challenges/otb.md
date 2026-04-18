# OTB Challenge — sync-mechanism Piece 1a

**Role:** Out-of-the-box challenger, Phase 3
**Date:** 2026-04-18
**Input consumed:** RESEARCH_OUTPUT.md, BRAINSTORM.md, D13-schema-candidates.md
**Capture note:** OTB agent lacks Write tool; content delivered inline, captured and persisted here by orchestrator.

---

## What the research explored (solution-space boundary)

The research built a 5-scope enum classification system (universal/user/project/machine/ephemeral) with a 3-value portability enum, 12-field MVP schema per unit, flat JSONL records, dependency arrays as strings, and composites as a special type. The BRAINSTORM committed to: scan-first evidence-based schema design, symmetric self-propagating architecture, two-layer storage (TOML manifest + JSONL events), manual conflict resolution, and a /sync skill as the execution layer. External tools evaluated previously: Copybara, git-subrepo, Dagster skip-label patterns.

**Boundaries of what was NOT searched:**
- How other file-lifecycle systems handle classification (chezmoi, npm, Nx)
- Whether per-file metadata is the right granularity for labeling
- Whether the dependency graph, not the flat registry, is the right primary artifact
- Whether a binary sync decision beats a 5-value enum for the actual workflow
- Whether the census JSONL files themselves can serve as the registry (no separate manifest)
- Whether the schema conflates two distinct concepts that K8s solved by splitting

---

## Alternative 1: chezmoi Template-in-File Model for Sanitization

**Type:** adjacent-domain | **Relevance:** HIGH | **Feasibility:** MEDIUM

**Core idea:** Instead of `sanitize_fields: ["SONAR_PROJECT_KEY", "project_name"]` in a JSONL record, the skill file itself contains `{{PROJECT_NAME}}` placeholders where project-specific values appear. The sync engine's sanitization is a template render with a per-repo values file. No external field list to maintain separately from content.

**Why better:** Solves known drift risk — `sanitize_fields` in registry WILL get out of sync with file content over time. Template markers make it impossible to miss a sanitization point. Also would make the content-bleed problem (finding 5.1 — `user_expertise_profile.md` containing JASON-OS-specific content inside a user-scoped file) visible at authoring time.

**Why not:** SKILL.md files are read as instructions by Claude; embedding `{{...}}` syntax creates rendering-intermediary concern. Adds friction for no-code authoring.

**Recommendation:** Investigate for the sanitize_fields maintenance problem specifically. Hybrid: template markers in files that need it, `sanitize_fields` as the machine-readable signal "this file has templates."

**Rating: WORTH-CONSIDERING**

---

## Alternative 2: Directory Convention as Classification Signal

**Type:** simpler | **Relevance:** HIGH | **Feasibility:** HIGH

**Core idea:** Move portable-as-is skills to `.claude/skills/portable/`, sanitize-then-portable to `.claude/skills/sanitize/`, project-specific to `.claude/skills/project/`. Sync engine's decision becomes `path.startsWith(...)` — zero registry parsing. Go's `internal/`, Linux's `bin/`/`etc/`, Android's `src/main/`/`src/test/` all use this pattern.

**Why better:** Zero ongoing maintenance. No registry drift. Git mv is the reclassification act (atomic, reviewable). 50-file canonical-memory gap (finding 5.2) would be visible as directory structure gap.

**Why not:** Claude Code resolves `.claude/skills/<name>/SKILL.md` by convention — can't move skills to subdirectories without breaking resolution OR symlinks. Same for `.claude/canonical-memory/`, `.claude/hooks/`. Platform-owned directory structure limits adoption.

**Recommendation:** Adopt for project-controlled paths only (`.research/`, `scripts/`, `tools/`). Keep per-file metadata for Claude Code-owned paths.

**Rating: WORTH-CONSIDERING (scoped to project-controlled directories)**

---

## Alternative 3: Binary Sync Decision With Conditions Escape Hatch

**Type:** simpler | **Relevance:** HIGH | **Feasibility:** HIGH

**Core idea:** Collapse 5-scope enum + 3-value portability into `sync: yes | user-only | no | conditional`. The `conditional` opens a `conditions` field. Rationale: of 190 units, ~75% universal, ~5% user, and machine+project+ephemeral (~20%) all resolve to identical sync behavior ("stay local"). Three values for one behavior adds indirection.

**Why better:** Lower cognitive overhead for backfill (D4b found 84% canonical gap — the classification is a blocker). No-code orchestrator answers concrete "does this travel?" rather than abstract category. Reduces schema-stabilization risk (BRAINSTORM Risk #1).

**Why not:** Loses external validation (5 independent systems converged on 5-scope per R-frpg). User vs universal distinction is meaningful in practice (user memories are one-user-correct; universal memories are anyone-correct). `conditional` escape hatch could become dumping ground.

**Recommendation:** Presentation-layer simplification while keeping 5-scope internally. The labeling UI and backfill workflow presents binary + conditions; sync engine maps to computed fields.

**Rating: WORTH-CONSIDERING (as UX layer, not schema replacement)**

---

## Alternative 4: Kubernetes Label/Annotation Split

**Type:** adjacent-domain | **Relevance:** MEDIUM | **Feasibility:** HIGH

**Core idea:** K8s discovered schema fields fall into two operationally different categories:
- **Labels:** indexed, queryable, affect behavior (e.g., Service selector), kept small
- **Annotations:** non-indexed, arbitrary size, human notes + tool metadata

The 12-field MVP mixes both. `scope`, `portability`, `status`, `type`, `dependencies`, `sanitize_fields` are labels (engine queries them). `purpose`, `notes`, `lineage`, `originSessionId` are annotations (humans read them).

**Why better:** Solves indexing problem as registry grows to 300+ SoNash units. Makes schema self-documenting.

**Why not:** Structural change (nested `labels: {}` + `annotations: {}`) breaks backward compat with Wave 1 JSONL. More complex to explain.

**Recommendation:** Document the split conceptually for MVP; adopt structurally for v2.

**Rating: INTERESTING-BUT-OVERKILL for MVP; WORTH-CONSIDERING for v2 evolution**

---

## Alternative 5: Census JSONL Files AS the Registry

**Type:** inverted | **Relevance:** HIGH | **Feasibility:** MEDIUM

**Core idea:** The BRAINSTORM committed to manifest + event-log as separate from census. But D1a–D13 already produced JSONL records with the 12 MVP fields. Inverted framing: the census IS the registry. When it needs updating, re-run relevant discovery agents. Analogous to `cargo metadata --format-version 1`.

**Why better:** Eliminates double-maintenance problem (registry drifting from census). The Wave 1 JSONL files already contain almost everything the sync engine needs.

**Why not:** Census schema was designed for discovery, not sync operation. Missing `sanitize_fields`, operational event-log. Census isn't immutable — re-running would overwrite registry history.

**Recommendation:** Adopt census JSONL schema as the BASELINE for the TOML manifest format. Manifest is a curated, human-editable subset of census data plus sync-rules fields. Collapses Piece 2's schema design problem.

**Rating: WORTH-CONSIDERING (schema inheritance, not full adoption)**

---

## Alternative 6: npm `files` Allowlist Model

**Type:** adjacent-domain | **Relevance:** MEDIUM | **Feasibility:** MEDIUM

**Core idea:** npm's publishing uses a `files` allowlist in `package.json`. Nx uses project-level `tags`. Applied to JASON-OS: maintain a manifest-level allowlist per destination:

```toml
[destinations.sonash]
include = [".claude/skills/brainstorm/**", ".claude/agents/**", "scripts/lib/**"]
exclude = [".claude/state/**", ".planning/**", "*.local.*"]
```

Per-unit classification becomes implicit in whether the path matches an include pattern.

**Why better:** Census found portability is highly consistent within categories (all 9 agents portable, all 5 hook-libs portable). One rule covers a directory vs requiring 190 per-file labels. Naturally handles new-file case. TOML allowlist is readable by no-code orchestrator.

**Why not:** Can't handle within-directory exceptions without confusing negation. No way to express sanitize transforms. Doesn't track provenance.

**Recommendation:** Adopt as a LAYER ON TOP of per-file labels, not as replacement. Allowlist provides default; per-file labels override. Reduces backfill burden for 90% case.

**Rating: WORTH-CONSIDERING (as manifest layer over per-file labels)**

---

## Alternative 7: Graph-First Architecture

**Type:** reframing | **Relevance:** MEDIUM | **Feasibility:** LOW-MEDIUM

**Core idea:** The dependency graph IS the primary artifact. Classification is graph-coloring, not per-node metadata. npm's resolver doesn't ask "what's lodash's scope?" — it asks "what does my root depend on?" If you sync `/deep-research`, engine asks "what nodes are reachable from this root?" Answer is the 25-component composite.

**Why better:** D12's composites-as-correct-unit finding naturally maps to graph edges. Edge weights express hardness. `cache.go` source_scope vs runtime_scope encoded in edges, not split fields.

**Why not:** Graph tooling + graph query complexity. D11 had MEDIUM/LOW confidence on 26 of 204 edges — sync engine making decisions from low-confidence edges could make wrong decisions. D12's `component_units` field achieves the same outcome with simpler structure.

**Recommendation:** Future consideration for v2. Immediate value: use D11 graph as a VALIDATION INPUT (before syncing, check all dependencies are also sync candidates).

**Rating: INTERESTING-BUT-OVERKILL for current scope**

---

## Rating Summary

| # | Alternative | Type | Rating |
|---|---|---|---|
| 1 | chezmoi template-in-file for sanitization | adjacent-domain | **WORTH-CONSIDERING** (scoped to sanitize_fields problem) |
| 2 | Directory convention as classification signal | simpler | **WORTH-CONSIDERING** (project-controlled paths only) |
| 3 | Binary sync decision with conditions escape hatch | simpler | **WORTH-CONSIDERING** (UX layer, not schema replacement) |
| 4 | K8s label/annotation split | adjacent-domain | **INTERESTING-BUT-OVERKILL** for MVP; **WORTH-CONSIDERING** v2 |
| 5 | Census JSONL AS the registry | inverted | **WORTH-CONSIDERING** (schema inheritance) |
| 6 | npm allowlist model | adjacent-domain | **WORTH-CONSIDERING** (manifest layer over per-file labels) |
| 7 | Graph-first architecture | reframing | **INTERESTING-BUT-OVERKILL** |

---

## Highest-Priority Signals for Piece 2

**Alternative 1 (chezmoi template markers)** directly solves the sanitize_fields drift risk the research identified but didn't fully address. Piece 2 should consider whether `sanitize_fields` is a machine-readable index of template markers (authoring-time guarantees) rather than a manually curated list (drift-prone).

**Alternative 5 (census as schema inheritance)** reduces Piece 2 scope: manifest record format should inherit census JSONL schema, not be designed independently. Collapses two schema-design problems into one.
