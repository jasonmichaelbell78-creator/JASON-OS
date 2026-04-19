# D2b Findings: Agents G-Z, Teams, Commands, global/

**Agent:** D2b
**Profile:** codebase
**Date:** 2026-04-18
**Scope:** 19 agents (G-Z), 2 teams, 1 command README, 11 global/ agents

---

## Summary Counts

| Category | Count |
|---|---|
| Agents (G-Z, project-scoped) | 19 |
| Teams | 2 |
| Commands (README only, no .md commands) | 1 |
| Agents (global/ subdir) | 11 |
| **JSONL records total** | **33** |

Active agents (G-Z): 12
Deprecated redirect stubs (G-Z): 7 (markdown-syntax-formatter, penetration-tester, prompt-engineer, react-performance-optimization, security-engineer — plus 3 from D2a = 8 total across full roster)
Teams active: 2
Commands deprecated: 1 (folder emptied, README is redirect notice)
Global agents active: 11 (all GSD family)

---

## Agent Taxonomy (G-Z)

### Category 1: Deep-Research Pipeline Agents (portable)

- **otb-challenger** — Phase 3 OTB alternative finder. Sibling to contrarian-challenger. Entirely project-agnostic. `portability: portable`.

Both Phase 3 agents (contrarian-challenger from D2a, otb-challenger from D2b) are portable and are the clearest port candidates alongside the full deep-research pipeline agents.

### Category 2: Domain Specialists — SoNash-Coupled (sanitize-then-portable)

- **performance-engineer** — Firestore/React/Next.js/Firebase performance. `model: inherit`. Consolidation target from react-performance-optimization.
- **security-auditor** — OWASP + SoNash security patterns. `model: opus`. Consolidation target from penetration-tester + security-engineer. Most SoNash-coupled security content of any agent.
- **pr-test-analyzer** — node:test, httpsCallable mocking. `model: inherit`. SoNash override agent for PR test analysis.
- **silent-failure-hunter** — sanitizeError() patterns. `model: inherit`. Core patterns are portable; import paths need update.
- **mcp-expert** — SoNash MCP infrastructure specialist. `model: inherit`. MCP lifecycle knowledge portable; SoNash server names not.
- **nextjs-architecture-expert** — Next.js App Router expertise. Generic content; single example reference to SoNash.
- **media-analyst** — Creator/Engineer View analysis. Depends on CONVENTIONS.md Sections 3+4.
- **technical-writer** — SoNash doc standards. `model: inherit`. Consolidation target from markdown-syntax-formatter + prompt-engineer.
- **test-engineer** — `model: opus`. Massive template agent (~1000 lines). SoNash Overrides section supersedes generic Jest examples. Internal contradiction: body uses Jest but overrides mandate node:test.
- **ui-ux-designer** — Generic UX methodology. Minimal sanitization. Single example block is SoNash product feature.

### Category 3: Infrastructure / Process Agents (sanitize-then-portable)

- **plan** — Implementation planning specialist. READ-ONLY. `disallowedTools: Agent, Write, Edit`. SoNash Architecture Context section is entirely SoNash-specific. Plan return format is portable. Already exists in JASON-OS.
- **git-flow-manager** — Git Flow automation. `portability: portable`. One of the most portable active agents in the entire roster. Project-agnostic Git Flow methodology.
- **general-purpose** — SoNash context injection agent. `model: inherit`. Body is entirely SoNash-specific constraints. `portability: not-portable`. No JASON-OS equivalent needed (JASON-OS does not have SoNash-specific constraints to encode).

### Category 4: Deprecated Redirect Stubs (not-portable)

7 deprecated stubs in G-Z batch:
- **markdown-syntax-formatter** → technical-writer
- **penetration-tester** → security-auditor
- **prompt-engineer** → technical-writer or /skill-creator
- **react-performance-optimization** → performance-engineer
- **security-engineer** → security-auditor

Plus 3 from D2a (deployment-engineer, devops-troubleshooter, error-detective) = **8 total deprecated stubs** across the 40-agent roster = 20% deprecation rate.

**Consolidation pattern**: All removals happened on 2026-04-01. Two agents consolidate into security-auditor (penetration-tester + security-engineer). Three agents consolidate into technical-writer (markdown-syntax-formatter + prompt-engineer + documentation-expert context). One consolidates into performance-engineer (react-performance-optimization). Three consolidate into debugger (devops-troubleshooter + error-detective). One absorbs deployment-engineer responsibilities (fullstack-developer).

---

## Team Parsing — Did HTML-Comment Pattern Hold?

**SCHEMA_SPEC Section 4 HTML-comment pattern did NOT apply to either team.**

Both team files use a different metadata format: a `prettier-ignore` block containing key/value pairs as markdown bold text pairs (not HTML comment syntax). Example from research-plan-team.md:

```
<!-- prettier-ignore-start -->
**Document Version:** 1.0
**Last Updated:** 2026-03-24
**Status:** ACTIVE
**Source:** agent-env Phase 4, Step 4.2
<!-- prettier-ignore-end -->
```

This is NOT the HTML comment pattern described in SCHEMA_SPEC Section 4 (`<!-- name: value -->`). The Section 4 example showed:
```
<!--
name: research-plan-team
agents: deep-research-searcher, deep-research-synthesizer, deep-plan-planner
-->
```

**Neither team uses the canonical HTML-comment-with-key-value format.** Instead:
- Metadata is in a prettier-ignore block with markdown bold labels
- Agent roster is in a markdown table, not a key/value `agents:` field
- maxTurns and spawn triggers are in prose sections

**Parsing method used**: Read H1 for name, first paragraph for purpose, Member Roster table for component_units, Persistence Model section for runtime_lifecycle, full body for all other fields.

**Anomaly for D22 (schema surveyor)**: The SCHEMA_SPEC Section 4 HTML-comment format may describe the INTENDED format for future team files, not the actual current format. Current team files pre-date or diverged from the spec. D22 should investigate whether the HTML-comment format was ever implemented or if it was a forward-looking spec.

### Team Findings

**audit-review-team (v2.0)**:
- 2 members: reviewer (analyst, sonnet, read-only) + fixer (executor, sonnet, read-write)
- Ephemeral. Token cost: ~3x solo
- Decoupled from /skill-audit in v2.0 — /skill-audit now uses mode=multi natively
- Spawn gate: 3+ artifacts OR /audit-comprehensive
- Includes: cross-target pattern accumulation after 3+ targets (systemic pattern detection)
- 5-6 task max per teammate (hard limit from Session #225 learnings)

**research-plan-team (v1.0)**:
- 3 members: researcher (sonnet) + planner (OPUS) + verifier (sonnet)
- Ephemeral. Token cost: ~4x solo
- Opus for planner only (Decision #18: plan quality is highest-leverage output)
- Progressive handoff pattern: researcher sends after each sub-question converges
- Spawn gate: BOTH deep-research + deep-plan on same topic, L/XL complexity, multi-session plan
- Includes: comparative table (Subagent approach vs Team approach) — valuable governance tool

**Key insight**: Both teams share the token cost awareness pattern and the "no nested teams" constraint. Both write to `.claude/state/agent-token-usage.jsonl`. The research-plan-team has more sophisticated coordination (direct inter-agent messaging eliminates lead relay latency).

---

## agents/global/ Subdir Finding

**What's there**: 11 files, all in the GSD (Get Stuff Done) agent family:

| File | Size | Color | Model | Tools |
|---|---|---|---|---|
| gsd-codebase-mapper.md | 15,738 | cyan | sonnet | Read, Bash, Grep, Glob, Write |
| gsd-debugger.md | 37,960 | orange | sonnet | Read, Write, Edit, Bash, Grep, Glob, WebSearch |
| gsd-executor.md | 21,335 | yellow | sonnet | Read, Write, Edit, Bash, Grep, Glob |
| gsd-integration-checker.md | 12,563 | blue | sonnet | Read, Bash, Grep, Glob |
| gsd-phase-researcher.md | 19,646 | cyan | sonnet | Read, Write, Bash, Grep, Glob, WebSearch, WebFetch, mcp__context7__* |
| gsd-plan-checker.md | 20,742 | green | sonnet | Read, Bash, Glob, Grep |
| gsd-planner.md | 44,624 | green | sonnet | Read, Write, Bash, Glob, Grep, WebFetch, mcp__context7__* |
| gsd-project-researcher.md | 24,308 | cyan | sonnet | Read, Write, Bash, Grep, Glob, WebSearch, WebFetch, mcp__context7__* |
| gsd-research-synthesizer.md | 7,367 | purple | sonnet | Read, Write, Bash |
| gsd-roadmapper.md | 16,866 | purple | sonnet | Read, Write, Bash, Glob, Grep |
| gsd-verifier.md | 22,592 | green | sonnet | Read, Bash, Grep, Glob |

**Key findings**:

1. **No `skills: [sonash-context]` on any global agent** — confirms these agents are NOT loaded with SoNash project context. This is the defining structural difference from project-scoped agents.

2. **Scope classification**: `.claude/agents/global/` maps to Claude Code's user-level agent directory (global install, not project-scoped). Scope = `user` (available across projects, not limited to SoNash).

3. **GSD is a complete standalone workflow system**: The 11 agents form the full GSD (Get Stuff Done) pipeline:
   - New project: project-researcher(x4) → research-synthesizer → roadmapper
   - Plan phase: phase-researcher → planner → plan-checker
   - Execute phase: executor
   - Verify: verifier + integration-checker
   - Debug: debugger
   - Map: codebase-mapper

4. **MCP wildcard pattern**: Three agents (gsd-phase-researcher, gsd-planner, gsd-project-researcher) use `mcp__context7__*` (wildcard) in their tools list. This is different from the project-scoped agents which list specific MCP tools. The wildcard pattern means any Context7 tool is allowed without enumerating them.

5. **All sonnet model**: No opus in GSD family. Contrast with project-scoped agents where security-auditor, database-architect, test-engineer use opus for high-stakes outputs.

6. **Color coding is consistent**: cyan = researcher/mapper agents, green = planning/verification agents, yellow = executor, orange = debugger, purple = synthesis/roadmap agents.

7. **Is it in scope for sync?** YES. These are portable, SoNash-context-free agents that represent a complete parallel workflow system. They are stronger port candidates than most project-scoped agents because they have zero SoNash coupling. They depend only on the GSD skill family (gsd:* commands) which must be inventoried by D1a-e or a separate agent.

---

## Comparison: SoNash Agent Ecosystem vs JASON-OS

| Dimension | SoNash | JASON-OS |
|---|---|---|
| Total agents (.claude/agents/) | 40 | ~8 |
| Deprecated stubs | 8 (20%) | 0 |
| Active project-scoped | 32 | ~8 |
| Teams | 2 | 1 (deep-research-team or equivalent) |
| commands/ | Deprecated (skills replaced) | Empty/not-used |
| global/ agents | 11 (GSD family) | 0 |
| Model diversity | sonnet + opus + inherit | sonnet |
| disallowedTools usage | Consistent (most active agents) | Inconsistent |
| `skills: [context]` field | All project-scoped agents | Not observed |
| Color field usage | Partial (deep-research, GSD families) | Partial |

**Key JASON-OS gaps relative to SoNash G-Z agents**:

1. No `git-flow-manager` (portable, high value for any Git project)
2. No `otb-challenger` (portable, already noted as Phase 3 deep-research agent)
3. No `general-purpose` context agent (by design — JASON-OS has no SoNash-specific context to encode)
4. No `plan` agent with SoNash context (JASON-OS plan.md exists but is context-free)
5. No GSD agent family at all (11 agents, fully portable, complete workflow system)
6. No team for research-plan pipeline (research-plan-team is in SoNash; JASON-OS may have an equivalent)

**Items already ported or equivalent**:
- contrarian-challenger (D2a confirmed ported)
- deep-research-searcher, synthesizer, verifier, gap-pursuer, final-synthesizer (full deep-research pipeline ported)
- otb-challenger (identified as portable in D2a)
- explore (D2a confirmed exists in JASON-OS)
- plan (mentioned in JASON-OS CLAUDE.md Section 7)

---

## Learnings for Methodology

### L1: Team file HTML-comment format is not implemented

SCHEMA_SPEC Section 4 describes an HTML-comment metadata format that neither current team file uses. The actual format is a `prettier-ignore` block with markdown bold key/value pairs. D22 (schema surveyor) should clarify whether:
- The spec was forward-looking (prescribing a format not yet adopted)
- The spec was based on a different version of the team files
- The current format is a deliberate variation

**Implication for other D-agents**: Do not assume SCHEMA_SPEC Section 4 parser applies to team files. Read the actual file format before parsing.

### L2: agents/global/ is a structurally distinct tier

The `agents/global/` subdirectory is not just a different path — it represents a fundamentally different scope tier. The absence of `skills: [sonash-context]` is the load-bearing signal. These agents are designed to work in any project. This tier had no precedent in D2a's scope and required on-the-fly scope classification.

**Implication**: Any discovery scan of a project with global agent infrastructure should enumerate and classify agents/global/ separately from project-scoped agents. The global tier is the strongest port candidate.

### L3: MCP wildcard tool spec (mcp__context7__*) needs handling

Three GSD agents use `mcp__context7__*` as a tools entry. This is NOT enumerable via standard YAML parsing as a specific tool list. The SCHEMA_SPEC treats `tools` as an array of specific tool names, but the wildcard form represents a permission class rather than a specific tool. D22 should decide how to represent this in the schema — options: keep as string value in tools array, add a separate `mcp_tool_wildcards` field, or expand to all known Context7 tools.

### L4: Deprecated stub pattern is a first-class data type

8 of 40 agents are redirect stubs (20% of roster). These are not failures — they are intentional architecture. They preserve CLI compatibility while consolidating agents. The stub pattern carries information: which agent was removed, where it redirects, when it expires. D22 should consider whether `portability: not-portable` + `status: deprecated` is sufficient or if a dedicated `redirect_to` field would be more expressive.

### L5: model: inherit is a coordination mechanism, not a model choice

Several SoNash agents use `model: inherit` (general-purpose, mcp-expert, performance-engineer, pr-test-analyzer, silent-failure-hunter, technical-writer, debugger). This means the agent inherits the model of its spawner. In practice, this allows orchestrators to control the model budget by choosing which model spawns these agents. For JASON-OS ports, `model: inherit` should be preserved as-is — do not substitute with a hardcoded model without understanding the spawner relationship.

### L6: test-engineer has an internal contradiction

The test-engineer body uses Jest (`jest.fn()`, `npx jest`) in its main technical content (TestSuiteManager class, jest.config.js) while the "SoNash Overrides" section explicitly mandates node:test. This is a pattern-collision artifact — the agent body appears to be a scaffolded generic template with project-specific overrides appended. When porting, the override section takes precedence. This pattern may recur in other heavily-templated agents.

### L7: Token cost governance is embedded in team docs

Both team files include explicit token cost estimates (3x and 4x solo respectively) with justification thresholds. This is a form of embedded governance that helps the orchestrator decide when teams are worth spawning. For JASON-OS, this governance pattern should be preserved in any team files created. The audit-review-team even references the specific session where token cost data was gathered (Session #225).

### L8: The GSD system is a complete parallel workflow vs deep-research pipeline

The GSD system (11 global/ agents + associated gsd:* skills) is a full alternative to the deep-research → deep-plan → execute workflow. It takes a different approach: roadmap-first, phase-by-phase execution with before/after verification gates, atomic commits per task. Whether JASON-OS should port GSD as an alternative to the existing workflow system requires a deliberate architectural decision, not just a mechanical port. Flag for synthesis review.

---

## Gaps and Missing References

1. **GSD skill family not inventoried**: The 11 GSD agents reference `/gsd:map-codebase`, `/gsd:plan-phase`, `/gsd:execute-phase`, `/gsd:new-project`, `/gsd:new-milestone`, `/gsd:debug`, `/gsd:verify-phase`, `/gsd:research-phase`, `/gsd:verify-integration` skills. These are NOT in the .claude/agents/ or .claude/agents/global/ directories — they must be in .claude/skills/. D1a-e agents are responsible for skills, but the GSD skill family should be cross-referenced.

2. **CONVENTIONS.md dependency unresolved**: media-analyst and document-analyst both depend on CONVENTIONS.md Sections 3 and 4. This file is likely in docs/ or root level. D19a or D17a-b should inventory this file.

3. **agent-token-usage.jsonl state file**: Both team files reference `.claude/state/agent-token-usage.jsonl` for token monitoring via PostToolUse hook. D3a-b (hooks) should verify whether this hook exists and is wired to this file path.

4. **`skills: [sonash-context]` field not in SCHEMA_SPEC**: 100% of active project-scoped agents have `skills: [sonash-context]` in frontmatter. This field is not a standard Claude Code frontmatter key and is not defined in SCHEMA_SPEC Section 3B. D22 (schema surveyor) should add it. D2a flagged it; D2b confirms it is universal across project-scoped agents. Its absence from global/ agents confirms it is a project-scoping mechanism.

5. **DOCUMENTATION_INDEX.md**: Referenced by technical-writer and documentation-expert agents. Auto-generated by `npm run docs:index`. D17a-b or D19a should confirm this file exists and its location.

6. **scripts/config/doc-header-config.json and cross-doc-deps.json**: Referenced by technical-writer. Likely in scripts/ scope (D6-D12 agents).

7. **GSD .planning/ directory convention**: All GSD agents read/write to `.planning/` (STATE.md, codebase/, research/, PLAN.md, SUMMARY.md, VERIFICATION.md, RESEARCH.md). This directory is NOT in the SCHEMA_SPEC coverage matrix (Section 5). D15a-b covers `.planning/` — they should be aware of the GSD output files within that directory.

---

## Confidence Assessment

- HIGH claims: 29 (all based on direct file reads)
- MEDIUM claims: 3 (scope classification for global/ agents, GSD system interpretation)
- LOW claims: 1 (whether HTML-comment team format was ever implemented)
- UNVERIFIED: 0

Overall confidence: HIGH. All JSONL records based on direct filesystem reads of source files.
