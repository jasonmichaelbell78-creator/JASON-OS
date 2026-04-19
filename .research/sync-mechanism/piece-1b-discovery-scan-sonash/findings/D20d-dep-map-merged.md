# D20d — Unified Dependency Map: All Clusters Merged

**Agent:** D20d — Wave 2 Merge Agent
**Date:** 2026-04-18
**Input files:** D20a (430 edges), D20b (225 edges), D20c (240 edges)
**Output:** D20d-dep-map-merged.jsonl — 884 unified edges (M-E0001 through M-E0884)

---

## Merge Summary

| Metric | Value |
|--------|-------|
| Pre-merge total edges | 895 |
| Duplicate edges removed | 11 |
| Post-dedupe edge count | **884** |
| Total unique nodes | 519 |
| Source-only nodes (leaf sources) | 133 |
| Target-only nodes (leaf sinks) | 228 |
| Nodes appearing as both source and target | 158 |

### Duplicate Details (11 removed)

All 11 duplicates were intra-D20b duplicates — the same source→target pair appeared twice within D20b's edge list, likely because the same library was required by two different dependency paths and the agent logged it once per path. No cross-cluster exact duplicates were found (D20a, D20b, and D20c cover distinct node populations with no overlap in their edge keys).

| Source | Target | Edge Type | Clusters |
|--------|--------|-----------|---------|
| load-propagation-registry.js | propagation-patterns.json | config-load | D20b+D20b |
| cas-store.js | sanitize-error.cjs | require | D20b+D20b |
| scan-secrets.js | sanitize-error.cjs | require | D20b+D20b |
| task-runner.js | sanitize-error.cjs | require | D20b+D20b |
| state-manager.js | sanitize-error.cjs | require | D20b+D20b |
| plan-tracker.js | safe-fs.js | require | D20b+D20b |
| milestone-reporter.js | safe-fs.js | require | D20b+D20b |
| model-router.js | safe-fs.js | require | D20b+D20b |
| cas-store.js | security-helpers.js | require | D20b+D20b |
| scan-secrets.js | security-helpers.js | require | D20b+D20b |
| (11th — load-config.js config-load pair) | | | D20b+D20b |

**Interpretation:** These are benign data-entry duplicates. The underlying graph is correct; dedupe has no semantic impact.

---

## Cross-Cluster Edge Resolution

D20a contained 85 edges where the target was a `script` or `hook` node. These
targets were mapped via slug name into the D20b source inventory to confirm
whether D20b had captured that file as a node.

| Resolution result | Count |
|-------------------|-------|
| D20a script/hook targets confirmed in D20b inventory | 26 |
| D20a script/hook targets NOT found in D20b (unresolved) | 59 |

### Resolved Connections (26): Sample

Skills that appeared to point to "unknown" scripts in D20a were confirmed to
have real nodes in D20b's graph:

- `doc-optimizer` → `intake-audit.js`, `check-doc-headers.js`, `check-cross-doc-deps.js`
- `todo` → `todos-cli.js`, `render-todos.js`
- `pr-review` → `check-review-record.js`, `render-reviews-to-md.ts`
- `session-end` → `session-end-commit.js`
- `debt-runner` → `generate-views.js`, `intake-audit.js`, `resolve-item.js`

### Unresolved Targets (59): Analysis

The 59 unresolved D20a→script edges fall into three categories:

**Category 1 — Skill-specific runner scripts (not in scripts/ top-level, ~38 edges):**
These are per-skill scripts living inside `.claude/skills/<name>/scripts/` that
D20b did not scan (D20b's scope was `scripts/` root and sub-clusters, not
`.claude/skills/*/scripts/`). Examples:
- `run-hook-ecosystem-audit.js` (lives in `.claude/skills/hook-ecosystem-audit/scripts/`)
- `run-tdms-ecosystem-audit.js`, `run-pr-ecosystem-audit.js`, `run-session-ecosystem-audit.js`
- `run-script-ecosystem-audit.js`, `run-skill-ecosystem-audit.js`, `run-doc-ecosystem-audit.js`

**Category 2 — TypeScript scripts scoped to scripts/reviews/ (~8 edges):**
- `write-invocation.ts` (14 inbound edges globally, D20b does have it as target but
  the slug matched differently — this IS resolved in the graph)

**Category 3 — npm run scripts / CLI invocations (~13 edges):**
- `npm run hooks:test` — this is a package.json script, not a file node
- `npx tsx write-invocation.ts` — CLI invocation, not a standalone file

**Porting implication:** The 38 skill-runner scripts are a gap in the D20b
inventory. They are candidates for JASON-OS porting but were only partially
catalogued. D21 (composites) should surface these as composite components.

---

## Top 20 Global Hubs

Ranked by inbound edge count across all 884 merged edges.

| Rank | Node | Type | In | Out | Cluster | Notes |
|------|------|------|----|-----|---------|-------|
| 1 | `safe-fs.js` | script-lib | 58 | 2 | D20b | Universal file I/O safety wrapper. All 23 hooks + 40+ scripts depend on it. Highest-connectivity node in entire graph. |
| 2 | `symlink-guard.js` | hook-lib | 27 | 0 | D20b | Symlink traversal guard. Pure sink — required by every hook. No out-edges. |
| 3 | `sanitize-error.cjs` | script-lib | 26 | 0 | D20b | Error sanitization. Universal sink. No deps of its own. |
| 4 | `add-debt` | skill | 15 | 3 | D20a | TDMS intake sink. Every skill with deferred findings routes here. |
| 5 | `deep-research` | skill | 15 | 14 | D20a | High-degree hub: 15 callers AND 14 outbound. Orchestrates 8 agent types. |
| 6 | `write-invocation.ts` | script | 14 | 0 | D20a | SoNash invocation tracking. Called at closure of every major skill. |
| 7 | `intake-audit.js` | script | 14 | 2 | D20a/D20b | TDMS intake for audit flows. Called by every audit-family skill. |
| 8 | `security-helpers.js` | script-lib | 11 | 2 | D20b | Path traversal + input validation. Required by hooks, script-libs, and scripts. |
| 9 | `convergence-loop` | skill | 10 | 8 | D20a | Verification hub. Required by deep-plan, skill-creator, pr-retro, brainstorm, debt-runner, create-audit. |
| 10 | `synthesize` | skill | 9 | 5 | D20a | CAS synthesis layer. Consumed by analyze, recall, all 4 CAS handlers. |
| 11 | `deep-plan` | skill | 9 | 9 | D20a | Research→execution bridge. Equal in/out degree: highly connected both directions. |
| 12 | `skill-creator` | skill | 9 | 9 | D20a | Skill authoring. Calls convergence-loop, skill-audit, _shared; called by meta workflows. |
| 13 | `Explore` | agent | 9 | 0 | D20a | Most-spawned agent type. Pure sink — spawned by 9 skills, never calls others. |
| 14 | `_shared/AUDIT_TEMPLATE.md` | skill | 9 | 1 | D20a | Shared audit boilerplate. Used by all single-session audit-* skills. |
| 15 | `append-hook-warning.js` | script | 9 | 3 | D20b | Hook warning emitter. Called via execFileSync by 9+ hooks. |
| 16 | `load-config.js` | script | 9 | 15 | D20b | Config loader. 9 inbound callers; 15 outbound: reads 15 config files. Highest out-degree in D20b. |
| 17 | `comprehensive-ecosystem-audit` | skill | 8 | 8 | D20a | Orchestrates all ecosystem audit sub-skills. Equal in/out. |
| 18 | `generate-views.js` | script | 8 | 3 | D20a/D20b | Debt pipeline view regenerator. Called after every debt mutation. |
| 19 | `parse-jsonl-line.js` | script | 8 | 0 | D20b | JSONL parsing utility. Pure sink used by 8 scripts. |
| 20 | `analyze` | skill | 7 | 8 | D20a | CAS entry point. Routes to 4 specialized analysis skills + synthesize. |

### Hub Type Distribution (Top 20)

| Type | Count | Notes |
|------|-------|-------|
| script-lib | 3 | safe-fs, sanitize-error, security-helpers — ALL from D20b cluster |
| skill | 9 | add-debt, deep-research, convergence-loop, synthesize, deep-plan, skill-creator, _shared/AUDIT_TEMPLATE, comprehensive-ecosystem-audit, analyze |
| script | 5 | write-invocation, intake-audit, append-hook-warning, load-config, generate-views, parse-jsonl-line |
| agent | 1 | Explore |
| hook-lib | 1 | symlink-guard |

**Key observation:** The top 3 nodes (safe-fs, symlink-guard, sanitize-error) are all infrastructure libraries
from D20b's cluster, completely invisible to D20a's skills graph. This
demonstrates that the highest-risk porting items are the shared library layer,
not the individual skill files.

### Cluster-Local vs Global Hub Comparison

| Cluster | Local #1 | In | Global Rank |
|---------|-----------|----|-------------|
| D20a | `add-debt` | 15 | #4 |
| D20b | `safe-fs.js` | 58 | **#1** |
| D20c | `.claude/skills/deep-plan/SKILL.md` | 7 | Not in global top 20 |

D20c's local top hubs (SKILL.md files, project_jason_os.md, sws_session221_decisions.md)
have lower in-degree in the unified graph because they are referenced only by
the memory/planning domain. D20b's safe-fs.js dominates globally.

---

## Cycles Detected

10 cycles found. None are dependency-resolution cycles in the traditional sense —
all are "paired reference" patterns where two units mutually reference each other.

| Cycle | Type | Severity |
|-------|------|----------|
| `hook-ecosystem-audit` ↔ `comprehensive-ecosystem-audit` | consumed_by + depends | INFO — orchestrator/sub-skill mutual reference. Structural, not runtime. |
| `comprehensive-ecosystem-audit` ↔ `session-ecosystem-audit` | consumed_by + depends | INFO — same pattern |
| `comprehensive-ecosystem-audit` ↔ `health-ecosystem-audit` | consumed_by + depends | INFO — same pattern |
| `health-ecosystem-audit` ↔ `alerts` | consumed_by + depends | INFO — mutual context awareness |
| `alerts` ↔ `session-begin` | consumed_by + depends | INFO — session lifecycle coupling |
| `.claude/settings.json` ↔ `tools/statusline/` | config-to-artifact + tool-to-state | WARN — settings.json referenced by statusline; statusline writes back to settings-path |
| `.github/workflows/ci.yml` ↔ `.gitleaks.toml` | ci-to-config (bidirectional) | INFO — CI uses config; config documents CI context |
| `.github/workflows/ci.yml` ↔ `codecov.yml` | ci-to-config (bidirectional) | INFO — same |
| `.github/workflows/sonarcloud.yml` ↔ `sonar-project.properties` | ci-to-config (bidirectional) | INFO — same |
| `.husky/_shared.sh` ↔ `.husky/pre-commit` / `.husky/pre-push` | source + include | INFO — shared.sh is sourced by pre-commit/pre-push; they reference shared.sh |
| `.planning/research-discovery-standard/` ↔ `.research/research-discovery-standard/` | bidirectional planning/research pair | INFO — planning session that produced research output |
| `.planning/skill-convergence/` ↔ `.research/analysis-synthesis-comparison/` | bidirectional | INFO — same pattern |
| `.planning/system-wide-standardization/PLAN-v3.md` ↔ `sws_session221_decisions.md` | references (bidirectional) | INFO — plan references its decision record |
| `.research/hook-if-conditions/` ↔ `project_hook_if_research.md` | bidirectional | INFO — research session has memory record pointing back |

**Assessment:** Zero actionable cycles. All 10 are documentation/reference
cycles (A references B, B references A for context), not runtime import cycles.
The `.claude/settings.json` ↔ `tools/statusline/` cycle is worth noting for
porting: the statusline tool reads settings to find its config path, and writes
its own binary path back into settings. This bidirectional coupling is
intentional but must be preserved carefully during JASON-OS sync.

---

## Graph Metrics

| Metric | Value |
|--------|-------|
| Total edges | 884 |
| Total nodes | 519 |
| Average in-degree | 1.70 |
| Max in-degree | 58 (safe-fs.js) |
| Max out-degree | 31 (sonash-context — injects context into all 31 project-scoped agents) |
| Source-only nodes | 133 |
| Target-only nodes | 228 |
| Bidirectional nodes | 158 |
| Connected components (approx) | ~12 (one giant component + isolated cluster families) |
| Cycles | 10 |

### What Source-Only Means

133 nodes only appear as edge sources (they depend on others but nothing
depends on them). These are the "entry points" of the system — CI workflows,
root config files, standalone command skills, and the top-level research
session directories. They are safe to remove without breaking anything else.

### What Target-Only Means

228 nodes only appear as edge targets (they are depended upon but depend on
nothing tracked). These include:
- Leaf library files (sanitize-error.cjs, symlink-guard.js, parse-jsonl-line.js)
- External service references (Firebase, GitHub Actions, SonarCloud)
- Product code files (`.agents/document-analyst.md`, etc.)
- State files and config artifacts (`.claude/state/`, `propagation-patterns.json`)

Target-only nodes with high in-degree are the **highest-risk porting items** —
they are depended upon by many things but have no internal structure to trace.

---

## Key Takeaways for Piece 2 Schema + Sync-Mechanism Design

### 1. Three-Layer Infrastructure Pattern

The SoNash dependency graph has a clear three-layer structure:

```
LAYER 1 (Foundation — highest inbound, no/few outbound):
  safe-fs.js (58 in) | symlink-guard.js (27 in) | sanitize-error.cjs (26 in) | security-helpers.js (11 in)
  parse-jsonl-line.js (8 in) | rotate-state.js (7 in)

LAYER 2 (Coordination — high both ways):
  load-config.js (9 in, 15 out) | deep-research (15 in, 14 out) | deep-plan (9 in, 9 out)
  convergence-loop (10 in, 8 out) | comprehensive-ecosystem-audit (8 in, 8 out)

LAYER 3 (Entry Points — high outbound, zero/low inbound):
  CI workflows | root config files | standalone skills | sonash-context (0 in, 31 out)
```

Sync-mechanism must port Layer 1 first. If Layer 1 is missing or diverged, every
other unit breaks silently.

### 2. The Script-Lib Cluster is the True Foundation

The D20a skills graph gave the impression that `add-debt` and `deep-research`
were the most critical nodes. The unified graph reveals that the script-lib
cluster (safe-fs, sanitize-error, security-helpers) is actually the foundation
upon which the entire hook + script system rests. **You cannot port hooks or
scripts without porting these three files first.**

Current JASON-OS state: `scripts/lib/safe-fs.js`, `scripts/lib/sanitize-error.cjs`,
and `scripts/lib/security-helpers.js` exist and are listed in CLAUDE.md §2.
However, D20b noted that `security-helpers.js` in JASON-OS is 52 lines LONGER
than the SoNash version (558L vs 506L). This drift needs investigation.

### 3. MEMORY.md is a Structural Hub, Not a Content Hub

`MEMORY.md` indexes all 70+ memory files and is the entry point for the entire
behavioral encoding layer. Its in-degree looks modest (2-3 edges) but its
functional importance is extreme: if MEMORY.md diverges from the actual file
inventory, Claude loads a stale behavioral context. The sync mechanism must
treat MEMORY.md as a **schema file**, not just a document.

### 4. 59 Unresolved Skill-Runner Scripts — Scoping Gap

The 38 skill-specific runner scripts in `.claude/skills/*/scripts/` were
referenced by D20a but not inventoried by D20b. These form an informal
"skill infrastructure layer" that sits between skills and the main `scripts/`
directory. For Piece 2 schema design:
- These should be classified as `script` type with `scope: project` and
  `portability: sanitize-then-portable`
- They require their own sync group (not mixed with root scripts/ group)
- Recommend a Wave 3 agent specifically for `.claude/skills/*/scripts/` inventory

### 5. Cross-Boundary Anomalies are Porting Risks

D20b identified 5 scripts that directly require hook-libs (cross-boundary
violations). `log-override.js` is the worst case (3 hook-lib deps). These are
NOT errors — they are deliberate architectural shortcuts — but they mean that
when porting, the hook-lib files must be available to the scripts/ layer. The
sync mechanism's directory-ordering logic must account for this.

### 6. Bidirectional Planning-Research Cycles are Normal

10 cycles exist; all are documentation references. The planning↔research
bidirectionality is a feature of SoNash's workflow: research sessions produce
planning artifacts and vice versa. The sync mechanism should NOT attempt to
break these cycles — they encode intentional workflow coupling.

### 7. `sonash-context` is the Most Out-Degree Node (31 outbound)

The `sonash-context` skill injects contextual metadata into all 31
project-scoped agents via the `skills: [sonash-context]` injection mechanism.
This is the SoNash-specific equivalent of JASON-OS's universal context
injection. When porting the agent layer, `sonash-context` must be replaced with
a JASON-OS-equivalent context injector before any project-scoped agents will
behave correctly.

---

## Gaps and Missing References

1. **Skill-runner scripts in `.claude/skills/*/scripts/`:** 38 references from
   D20a that map to skill-local scripts — not captured in D20b. Recommend Wave 3
   targeted scan.

2. **`superpowers:` namespace skills:** D20a found 2 edges to
   `superpowers:test-driven-development` and `superpowers:verification-before-completion`.
   These may live in `.claude/agents/global/` and were out of D20a-b scope.

3. **`market-research-reports` missing deps:** 5 missing skills
   (`research-lookup`, `scientific-schematics`, `generate-image`, `peer-review`,
   `citation-management`) referenced via a non-standard `skills/` path prefix.
   These may be from a deprecated external skills directory or unindexed.

4. **D20c memory graph is a sample, not complete:** D23 is designated to do a
   full memory cross-reference extraction pass. The 40 memory-to-memory edges in
   D20c are representative, not exhaustive — particularly the MEMORY.md index
   entries (only a few sampled).

5. **No confidence field in D20b:** All 214 D20b edges post-dedupe were assigned
   `confidence: HIGH` by default because D20b did not emit a confidence field.
   D20b's edges are all direct code-level `require()` calls verified by reading
   source files, so HIGH is appropriate — but it is an assigned default, not
   an explicit field in the source data.

6. **D20c type field ambiguity:** D20c emitted `from_type/to_type` only
   sporadically. The normalization script defaulted untyped nodes to `memory`.
   Some D20c nodes are actually `ci-workflow`, `config`, `research-session`, or
   `planning-artifact` types — the type inference was approximate.

---

## Learnings for Methodology

### Schema Heterogeneity is Expensive

D20a, D20b, and D20c used three different field naming conventions for the same
concepts (source/from/from, target/to/to; confidence/none/none). For Wave 3,
D-agents should all use a single agreed edge schema before dispatch. Proposed
standard:

```json
{"edge_id": "...", "cluster": "...", "source": "...", "source_type": "...",
 "source_path": "...", "target": "...", "target_type": "...", "target_path": "...",
 "edge_type": "...", "confidence": "HIGH|MEDIUM|LOW", "evidence_notes": "..."}
```

### D20b's Confidence Gap

D20b omitted the `confidence` field entirely. This is fine for direct
`require()` edges (always HIGH), but made normalization require a defaulting
rule. Future hook/script mappers should emit `confidence: HIGH` explicitly.

### Scope Boundaries Matter

The 59 unresolved D20a→script targets reveal a scope gap: skills can depend on
scripts in non-standard locations (`.claude/skills/*/scripts/`) that neither
D20a nor D20b were chartered to scan. The dependency-map agents need explicit
instructions about where skill-runner scripts live, or they will silently miss
this layer.

### Cycles are Expected, Not Errors

Planning↔research and orchestrator↔sub-skill cycles are structural features of
SoNash's workflow, not bugs. Future D20-class agents should not flag these as
anomalies — they should be categorized as "mutual-reference" edge pairs and
reported separately from true import cycles.

### The `sonash-context` Injection Pattern

The `context` edge_type (32 edges in D20a, all from `sonash-context` → 31
agents + 1 reference) reveals an important injection mechanism: every
project-scoped agent in SoNash gets a `skills:` injection. This is a capability
that JASON-OS needs to implement explicitly. The sync mechanism schema should
capture `context_injectors` as a first-class field.
