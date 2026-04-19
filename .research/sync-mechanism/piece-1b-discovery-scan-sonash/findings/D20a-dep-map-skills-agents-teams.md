# D20a — Dependency Map: Skills + Agents + Teams

**Agent:** D20a
**Profile:** codebase
**Date:** 2026-04-18
**Scope:** All 81 skills + 40 agents + 2 teams from Wave 1 (D1a-f, D2a-b)

---

## Summary Metrics

| Metric | Count |
|--------|-------|
| Total edges | 430 |
| Unique source nodes | 99 |
| Unique target nodes | 172 |
| Nodes mentioned in graph | 194 |
| Hubs (>=4 inbound edges) | 35 |
| Orphan candidates (0 in, 0 out) | 18 |
| Missing-target edges | 7 |
| Connected components | 9 |

---

## Edge Count by Type

| Edge Type | Count | Description |
|-----------|-------|-------------|
| `depends` | 174 | Skill/agent uses another unit's output or functionality |
| `uses` | 76 | Skill invokes a script (active_scripts[]) |
| `spawns` | 76 | Skill dispatches agent/agent-type via Task tool |
| `consumed_by` | 72 | Reverse — unit's output is consumed by named unit |
| `context` | 32 | `skills: [sonash-context]` injection into all 32 project-scoped agents |

---

## Top 10 Hubs (Most Inbound Edges)

| Rank | Name | Type | Inbound Edges | Role |
|------|------|------|---------------|------|
| 1 | `add-debt` | skill | 15 | Universal TDMS intake sink — every skill with deferred findings points here |
| 2 | `deep-research` | skill | 15 | Upstream research entry point + spawner of 8 agent types |
| 3 | `write-invocation.ts` | script | 14 | SoNash invocation tracking script — called by every major skill at closure |
| 4 | `intake-audit.js` | script | 14 | TDMS audit intake script — called by every audit-* skill |
| 5 | `convergence-loop` | skill | 10 | Verification hub — called by deep-plan, skill-creator, synthesize, pr-retro, brainstorm, debt-runner, create-audit, skill-audit |
| 6 | `synthesize` | skill | 9 | CAS synthesis — consumed by analyze, all 4 CAS handlers, recall |
| 7 | `deep-plan` | skill | 9 | Downstream from research; upstream from execution |
| 8 | `skill-creator` | skill | 9 | Skill authoring hub; depends on skill-audit, convergence-loop, _shared |
| 9 | `Explore` | agent | 9 | Most-spawned agent type — read-only codebase discovery |
| 10 | `_shared/AUDIT_TEMPLATE.md` | skill | 9 | Shared boilerplate consumed by all single-session audit-* skills |

Full hub list (35 units with >=4 inbound edges): add-debt, deep-research, write-invocation.ts, intake-audit.js, convergence-loop, synthesize, deep-plan, skill-creator, Explore, _shared/AUDIT_TEMPLATE.md, comprehensive-ecosystem-audit, analyze, deep-research-synthesizer, _shared/ecosystem-audit/CRITICAL_RULES.md, _shared/ecosystem-audit/COMPACTION_GUARD.md, _shared/ecosystem-audit/FINDING_WALKTHROUGH.md, _shared/ecosystem-audit/SUMMARY_AND_TRENDS.md, _shared/ecosystem-audit/CLOSURE_AND_GUARDRAILS.md, alerts, brainstorm, general-purpose, skill-ecosystem-audit, code-reviewer, website-analysis, deep-research-searcher, skill-audit, pr-review, _shared/TAG_SUGGESTION.md, shared/CONVENTIONS.md, repo-analysis, document-analysis, media-analysis, contrarian-challenger, security-auditor, debugger.

---

## Orphan List (Zero Inbound AND Zero Outbound — 18 units)

These units appear in Wave 1 records but have no edges in the graph built from
the explicit `dependencies[]`, `agent_types_spawned[]`, `active_scripts[]`, and
`context_skills[]` fields.

| Name | Type | Notes |
|------|------|-------|
| `artifacts-builder` | skill | Standalone React/HTML artifact tool; no inter-skill deps |
| `audit-health` | skill | SoNash-specific meta-audit; no callers/dependencies in Wave 1 scope |
| `code-reviewer-skill` | skill | Note: name collision with code-reviewer agent; skill is D1e record |
| `content-research-writer` | skill | Self-contained writing skill; depends only on examples.md companion |
| `data-effectiveness-audit` | skill | No callers found in Wave 1; internal lifecycle scripts only |
| `developer-growth-analysis` | skill | Depends on Rube MCP (external); no Wave 1 callers |
| `docs-maintain` | skill | Depends on npm scripts only; no inter-skill edges |
| `excel-analysis` | skill | Self-contained Python reference card; no inter-skill edges |
| `frontend-design` | skill | Behavioral/aesthetic guidance; no scripts, no callers |
| `gsd-debugger` | agent | Global GSD agent; no explicit inbound edges from Wave 1 skills |
| `gsd-integration-checker` | agent | Global GSD agent; spawned by /gsd:verify-integration (GSD skill not in Wave 1 scope) |
| `system-test` | skill | SoNash product-specific; no callers in Wave 1 scope |
| `test-suite` | skill | SoNash Playwright test orchestration; no callers in Wave 1 scope |
| `ui-design-system` | skill | Self-contained Python design token tool; no callers |
| `using-superpowers` | skill | Behavioral skill injected at session start; no edge-forming deps |
| `ux-researcher-designer` | skill | Self-contained Python persona tool; no callers |
| `validate-claude-folder` | skill | Self-contained .claude folder validator; no callers |
| `webapp-testing` | skill | Self-contained Playwright Python toolkit; no callers |

**Interpretation:** Most orphans are intentional leaf skills (standalone reference tools, behavioral guides) or SoNash-product-specific audits with no portable callers. They are not dead code — they have clear purposes but operate independently. Only `data-effectiveness-audit` and `audit-health` are candidates for review as potentially stranded infrastructure.

---

## Missing-Target Edges (7 edges — to-be-resolved by D20b/c)

Edges where the dependency target was NOT found in any Wave 1 record:

| Source | Target | Edge Type | Notes |
|--------|--------|-----------|-------|
| `market-research-reports` | `research-lookup` | depends | MISSING skill — likely in a deleted/unindexed `skills/` directory |
| `market-research-reports` | `scientific-schematics` | depends | MISSING skill — same pattern |
| `market-research-reports` | `generate-image` | depends | MISSING skill — same pattern |
| `market-research-reports` | `peer-review` | depends | MISSING skill — same pattern |
| `market-research-reports` | `citation-management` | depends | MISSING skill — same pattern |
| `systematic-debugging` | `superpowers:test-driven-development` | depends | SoNash `superpowers:` namespace skill — not in Wave 1 scope |
| `systematic-debugging` | `superpowers:verification-before-completion` | depends | SoNash `superpowers:` namespace skill — not in Wave 1 scope |

**Pattern:** The `market-research-reports` skill references 5 skills via a `skills/` path (without `.claude/` prefix) that does not exist in the SoNash `.claude/skills/` directory. These may be from a deprecated external skills directory. The `superpowers:` namespace references are likely GSD global skills not captured in D2a-b scope — D20b/c should check `.claude/agents/global/` for these.

---

## Clusters

Connected components among skill/agent/team nodes only (scripts excluded):

### Cluster 1 — The Main Graph (125 nodes)

The overwhelming majority of all skills, agents, and teams form one giant connected component. This confirms the SoNash skill ecosystem is heavily integrated with very few isolated units. Key sub-clusters within this mega-cluster:

**The Deep-Research Pipeline** (10 nodes, tightly coupled):
`deep-research` → spawns → `deep-research-searcher`, `deep-research-synthesizer`, `deep-research-verifier`, `contrarian-challenger`, `otb-challenger`, `dispute-resolver`, `deep-research-gap-pursuer`, `deep-research-final-synthesizer` + uses `research-plan-team`

**The CAS Cluster** (7 nodes):
`analyze` → `repo-analysis`, `website-analysis`, `document-analysis`, `media-analysis`, `synthesize`, `recall`
All share `_shared/TAG_SUGGESTION.md` and `shared/CONVENTIONS.md` as context.

**The Audit Family** (20+ nodes):
`comprehensive-ecosystem-audit` → orchestrates all 8 `*-ecosystem-audit` skills
`audit-comprehensive` → orchestrates all 9 `audit-*` domain skills
Both feed into `add-debt` and `intake-audit.js` as terminal sinks.

**The Session Lifecycle** (5 nodes):
`session-begin` → uses `alerts`, `github-health`
`session-end` → uses `ecosystem-health`, `session-begin`, `checkpoint`

**The Shared Libraries Cluster**:
`_shared/AUDIT_TEMPLATE.md` (9 inbound), `_shared/ecosystem-audit/` (5 modules × 6 inbound each), `_shared/SKILL_STANDARDS.md`, `_shared/SELF_AUDIT_PATTERN.md`

**The sonash-context Injection Fan** (32 edges, all `context` type):
`sonash-context` skill → 32 project-scoped agents. This is a unique structural pattern: a skill used purely as a context injection mechanism, not called via `/` slash command.

### Cluster 2 — GSD Plan-Execute Cluster (6 nodes)
`gsd-phase-researcher` → `gsd-planner` → `gsd-plan-checker` → `gsd-executor` → `gsd-verifier`
plus `gsd-codebase-mapper` (feeds gsd-planner). These global agents form their own connected pipeline.

### Cluster 3 — GSD New-Project Research Cluster (3 nodes)
`gsd-project-researcher` (×4 parallel) → `gsd-research-synthesizer` → `gsd-roadmapper`
Separate from Cluster 2 because the new-project and plan-execute pipelines don't cross.

### Singleton/Stub Clusters (6 clusters)
The remaining 6 components are single nodes or deprecated redirect pairs:
- `gsd-integration-checker` (isolated GSD agent — spawner not in Wave 1)
- `gsd-debugger` (isolated GSD agent)
- Deprecated stubs: `deployment-engineer` → `fullstack-developer`, `devops-troubleshooter` → `debugger`, `error-detective` → `debugger`, `penetration-tester` → `security-auditor`, `security-engineer` → `security-auditor`, `react-performance-optimization` → `performance-engineer`, `markdown-syntax-formatter` → `technical-writer`, `prompt-engineer` → `technical-writer`/`skill-creator`

---

## Notable Structural Patterns

1. **`add-debt` is the universal debt sink.** 15 inbound edges from skills spanning every tier. It is the most-depended-on skill in the ecosystem. Its JASON-OS stub replacement is a critical gap.

2. **`write-invocation.ts` is a non-skill hub.** 14 inbound edges to a SoNash-specific TypeScript script (`scripts/reviews/write-invocation.ts`). This script does NOT exist in JASON-OS. Every skill that references it will need a no-op stub or removal at port time.

3. **`intake-audit.js` is the audit system's nerve center.** 14 inbound edges from all `audit-*` skills. This script is the entry point for the TDMS pipeline (MASTER_DEBT.jsonl). Not portable without TDMS.

4. **`convergence-loop` is THE verification hub.** 10 inbound edges. It is the only skill with a programmatic integration protocol (not just a slash command reference). 8 confirmed callers. This is the highest-value portable skill in the ecosystem after `deep-research`.

5. **`sonash-context` creates a 32-edge fan.** Every project-scoped agent loads `sonash-context` as a context injection. This mechanism is portable; the content is not. JASON-OS would need a `jason-os-context` equivalent.

6. **Deprecated stubs form 8 redirect edges.** All deprecated agents have exactly one outbound `depends` edge pointing to their consolidation target. These are safe to skip during porting — only the consolidation targets matter.

7. **GSD global agents are isolated.** The GSD family (Cluster 2, Cluster 3) is NOT connected to the main cluster via Wave 1 edges. The GSD skills that spawn them (`gsd:plan-phase`, `gsd:execute-phase`, etc.) are not in the Wave 1 scope, creating an artificial disconnection.

---

## Leaf Sources (22 units — outbound only, no callers)

Units that send edges but receive none. These are mostly entry-point skills and deprecated stubs:

`decrypt-secrets`, `deployment-engineer` (deprecated), `devops-troubleshooter` (deprecated), `error-detective` (deprecated), `find-skills`, `gsd-codebase-mapper`, `gsd-phase-researcher`, `gsd-project-researcher`, `markdown-syntax-formatter` (deprecated), `market-research-reports`, `mcp-builder`, `multi-ai-audit`, `penetration-tester` (deprecated), `prompt-engineer` (deprecated), `react-performance-optimization` (deprecated), `repo-synthesis` (deprecated), `schemas`, `security-engineer` (deprecated), `sonash-context`, `task-next`, `todo`, `website-synthesis` (deprecated)

Note: `sonash-context` appearing here is an artifact of it being the *source* of context edges but not being the *target* of any — confirming it is a pure injection source.

---

## Terminal Sinks (23 units among Wave 1 — inbound only)

Units that receive edges but generate none. These are mostly domain-specialist agents (consumers, not initiators) and the ecosystem-audit shared library modules:

`_shared/ecosystem-audit/` (5 modules), `backend-architect`, `checkpoint`, `database-architect`, `dependency-manager`, `documentation-expert`, `frontend-developer`, `fullstack-developer`, `git-flow-manager`, `gsd-roadmapper`, `gsd-verifier`, `mcp-expert`, `nextjs-architecture-expert`, `plan`, `pr-test-analyzer`, `quick-fix`, `silent-failure-hunter`, `technical-writer`, `ui-ux-designer`

---

## Learnings for Methodology

1. **`agent_types_spawned[]` is not type-safe.** The field stores free-text labels (e.g., "dimension-agents", "subagent (one per ecosystem audit)", "general-purpose") rather than canonical agent names. D20 had to normalize these to map to actual agent records. Future scans should add a normalization pass.

2. **`skills: [field]` in agent frontmatter creates a class of edges not in any standard field.** The 32 `sonash-context` injection edges came from a non-standard YAML frontmatter field. The SCHEMA_SPEC does not have a `context_skills` field — this was surfaced as a pattern unique to agents. D22 (schema surveyor) should consider adding `context_skills: array` to Section 3B.

3. **Script hubs (`write-invocation.ts`, `intake-audit.js`) have more inbound edges than most skills.** A purely skill-to-skill edge graph would miss the key structural bottlenecks. Skill-to-script edges are essential for understanding porting risk.

4. **Deprecated redirect stubs add noise but also convey consolidation history.** The 8 deprecated agents with single redirect edges tell a clear consolidation story (debugger absorbed 3, security-auditor absorbed 2, technical-writer absorbed 2, fullstack-developer absorbed 1). This pattern should be preserved in synthesis — it explains current agent count vs historical count.

5. **GSD global agents are structurally disconnected from the main Wave 1 graph** because the GSD skills that spawn them are not in D1a-f scope. A Wave 3 GSD-skill agent (D20b/c candidate) should connect these clusters.

6. **The `superpowers:` namespace** (`superpowers:test-driven-development`, `superpowers:verification-before-completion`) appears in `systematic-debugging` dependencies but no Wave 1 agent matches. These likely live in `.claude/agents/global/` or are an external skill namespace. Flag for D20b investigation.

7. **`market-research-reports` depends on 5 MISSING skills** that reference a `skills/` path (no `.claude/` prefix). This broken dependency cluster is not recoverable from Wave 1 data alone — needs directory enumeration to confirm the path is truly absent.

8. **The main connected component (125 nodes) shows SoNash has a monolithic skill ecosystem.** Almost everything is reachable from `deep-research` or `audit-comprehensive` within 3 hops. This is both a portability risk (high coupling) and a quality indicator (intentional orchestration).

---

## Gaps and Missing References

1. **GSD skills not scanned:** `/gsd:*` skills are referenced as spawners of the 11 GSD global agents but were not included in D1a-f scope. The GSD global agents (Cluster 2, Cluster 3) are floating without their spawner edges.

2. **`superpowers:` namespace unresolved:** 2 missing-target edges. Needs directory enumeration of `.claude/agents/global/` beyond what D2b captured.

3. **`dimension-agents` in `repo-analysis` agent_types_spawned:** This agent type label is non-canonical. No agent named `dimension-agents` exists in D2a-b. Likely refers to dynamically-named explore subagents.

4. **Shared library consumers not exhaustive:** The `_shared/ecosystem-audit/` modules are confirmed consumed by 8 ecosystem audits, but `notes_type` fields in D1f indicate there may be additional consumers. This analysis used confirmed consumption patterns only.

5. **Context injection consumers:** All 32 project-scoped agents have `skills: [sonash-context]` but the D2a-b records note this as a non-standard field. The count may be higher if agents outside D2a-b scope also use this pattern.

6. **`schemas` skill:** Classified by D1f as likely `type: script-lib` rather than `type: skill` — it has no SKILL.md. The 2 outbound edges from `schemas` point to `scripts/lib/` files. This unit may be misclassified in the source data.
