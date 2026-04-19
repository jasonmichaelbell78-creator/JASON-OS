# D2 Inventory: Agents, Teams, Commands
<!-- Agent: D2 | Scan: piece-1a-discovery-scan-jason-os | Date: 2026-04-18 -->

**Scope:** `.claude/agents/` (8 files), `.claude/teams/` (1 file), `.claude/commands/` (0 files — empty)
**Total units:** 9 (8 agents + 1 team + 0 commands)
**Total bytes read:** 76,395

---

## Summary Table

| # | Type | Name | Size (bytes) | Scope | Portability | Phase in Pipeline | Tools Count | color | maxTurns |
|---|------|------|-------------|-------|-------------|-------------------|-------------|-------|----------|
| 1 | agent | contrarian-challenger | 4,232 | universal | portable | Phase 3 | 4 (Read, Grep, Glob, WebSearch) | none | 25 |
| 2 | agent | deep-research-final-synthesizer | 7,348 | universal | portable | Phase 3.97 | 5 (Read, Write, Bash, Grep, Glob) | none | 30 |
| 3 | agent | deep-research-gap-pursuer | 5,778 | universal | portable | Phase 3.95 | 7 (Read, Write, Bash, Grep, Glob, WebSearch, WebFetch) | none | 30 |
| 4 | agent | deep-research-searcher | 15,400 | universal | portable | Phase 1 | 9 (+2 MCP tools) | cyan | none |
| 5 | agent | deep-research-synthesizer | 14,191 | universal | portable | Phase 2 | 3 (Read, Write, Bash) | purple | none |
| 6 | agent | deep-research-verifier | 5,819 | universal | portable | Phase 2.5 + 3.9 | 6 (Read, Bash, Grep, Glob, WebSearch, WebFetch) | none | 30 |
| 7 | agent | dispute-resolver | 6,309 | universal | portable | Phase 3.5 | 3 (Read, Grep, Glob) | none | 20 |
| 8 | agent | otb-challenger | 3,544 | universal | portable | Phase 3 | 4 (Read, Grep, Glob, WebSearch) | none | 25 |
| 9 | team | research-plan-team | 13,774 | universal | portable | research-to-plan pipeline | varies by member | N/A | N/A |
| 10 | command | (none — dir empty) | 0 | — | — | — | — | — | — |

### Pipeline Phase Map

```
Phase 1         : deep-research-searcher (parallel, N instances)
Phase 2         : deep-research-synthesizer
Phase 2.5       : deep-research-verifier (post-search verification)
Phase 3         : contrarian-challenger + otb-challenger (parallel)
Phase 3.5       : dispute-resolver (resolves CONFLICTED claims)
Phase 3.9       : deep-research-verifier (post-gap-pursuit verification)
Phase 3.95      : deep-research-gap-pursuer
Phase 3.97      : deep-research-final-synthesizer
Team (overlay)  : research-plan-team (wraps research + planning into 3-agent team)
```

### Key Structural Observations

- All 8 agents have `disallowedTools: Agent` except deep-research-searcher and deep-research-synthesizer (those two have no `disallowedTools` field — they are the only ones that could theoretically spawn sub-agents, though neither does so in practice)
- Two agents have a `color` field: deep-research-searcher (cyan) and deep-research-synthesizer (purple). The rest have no color.
- Three agents have no `maxTurns` field: deep-research-searcher, deep-research-synthesizer, and the team (N/A). All others cap between 20-30 turns.
- dispute-resolver has the most restricted toolset (Read, Grep, Glob only — no web, no write).
- deep-research-searcher is the largest agent file (15,400 bytes) due to embedded philosophy, tool strategy, source hierarchy, verification protocol, output format, and execution flow documentation.
- The team file has no YAML frontmatter — it uses an HTML comment block for metadata instead.
- research-plan-team example invocation uses "cross-project sync mechanism" as its concrete example — directly on-topic for this census scan.

---

## Learnings for Methodology

### Agent sizing

8 agents + 1 team + 0 commands = 9 units total. This is right-sized for a full deep-research pipeline. Every pipeline phase has a dedicated agent; no phase has more than one dedicated agent type (except Phase 3, which has two challenger agents running in parallel). The team is an overlay pattern, not an additional phase.

For SoNash (40 agents estimated), expect ~5x this inventory. D2-style parallel reads across all 40 will still be feasible in a single pass since all files can be read in parallel batches of ~8-10.

### File-type observations

All agent files are `.md` with YAML frontmatter. No parsing surprises. However:

- **Inconsistent field presence:** `color` appears on only 2 of 8 agents. `maxTurns` is absent on 2 of 8. `disallowedTools` is absent on 2 of 8. A schema that marks these fields optional but records their presence/absence is needed.
- **Team file uses HTML comments, not YAML frontmatter.** The team format is structurally different from agent format. Any parser treating teams as agents will fail on metadata extraction.
- **MCP tool refs in tools field:** deep-research-searcher lists `mcp__context7__resolve-library-id` and `mcp__context7__query-docs` as tool entries in the YAML `tools:` field. This is a dependency on an external MCP server — worth flagging as an `external_refs` category distinct from agent-to-agent dependencies.

### Classification heuristics

The universal/user/project/machine/ephemeral enum covered all 9 units cleanly — all agents and the team are `universal`. No edge cases. The team is explicitly `ephemeral` per its own Persistence Model section, but its *definition* as a unit is `universal` (it can be instantiated in any project context). The schema should distinguish between a unit's *definition scope* (universal) and its *runtime lifecycle* (ephemeral). Current R-frpg enum conflates these.

Portability: all 9 units are `portable` as-is. None contain project-specific paths, credentials, or hardcoded domain assumptions. The one quasi-concern is deep-research-searcher's reference to `.claude/skills/deep-research/` paths and the synthesizer's reference to `REFERENCE.md Section 5` — but these are relative paths that travel with the repo structure, not absolute machine-specific paths.

### Dependency extraction

**Method used:** Content reading, not frontmatter. Frontmatter `description` fields name the spawning skill and the phase number, which made it straightforward to assign `dependencies`. Cross-agent dependencies (which agents read which other agents' output) required reading the full body — specifically:

- Output path conventions (`.research/<topic>/challenges/` vs `.research/<topic>/findings/`) made data-flow dependencies clear
- Phase numbering in descriptions (Phase 2.5, Phase 3.5, Phase 3.95, Phase 3.97) established sequencing
- `disallowedTools: Agent` confirmed no nested spawning

**Implicit dependencies not declared in frontmatter:**

1. `deep-research-synthesizer` reads `REFERENCE.md` from `.claude/skills/deep-research/REFERENCE.md` Section 5 for the output template — this is an implicit skill-file dependency not captured in agent metadata
2. `deep-research-final-synthesizer` implicitly depends on all other pipeline agents having run (it reads `claims.jsonl`, `sources.jsonl`, `challenges/*.md`, `findings/*.md`) — but none of this is declared in its frontmatter
3. `research-plan-team` planner member uses opus model and references "Decision #18" from an internal decision log — implicit dependency on project decision history

### Schema-field candidates

Beyond the current schema, these fields warrant capture at schema level for SoNash:

| Field | Present on | Notes |
|-------|-----------|-------|
| `color` | 2/8 agents | Visual identity in Claude Code UI; worth preserving |
| `maxTurns` | 6/8 agents | Cost/safety control; absence means unbounded |
| `disallowedTools` | 6/8 agents | Security boundary declaration |
| `model` | 8/8 agents (in FM or body) | sonnet vs opus directly affects token cost |
| `pipeline_phase` | inferable from description | Not a formal field; should be extracted |
| `output_paths` | inferable from body | Where agent writes — key for sync dependency graph |
| `input_paths` | inferable from body | What agent reads — key for sync dependency graph |
| `runtime_lifecycle` | inferable (ephemeral/persistent) | Team doc makes this explicit; agents are implicitly per-session |
| `mcp_dependencies` | 1/8 agents | Separate from `tools` — external server requirement |

### Adjustments recommended for SoNash agent scan

1. **Batch reads of 8-10 files in parallel** — single-pass is feasible. At 40 agents, 5 parallel batches of 8 will cover the full inventory.

2. **Separate team-format parser** — SoNash likely has more teams. Team files use HTML comment metadata, not YAML frontmatter. The JSONL schema's `existing_metadata` field should record the comment-block values explicitly (document_version, last_updated, status, source).

3. **Capture `output_paths` and `input_paths` explicitly** — At 40 agents, inferring data-flow from body text is still feasible but error-prone. Adding these as explicit schema fields before the SoNash scan will produce a cleaner dependency graph without re-reading.

4. **Capture `pipeline_phase` as a numeric or string field** — With 40 agents potentially spanning many phases, the phase number in the description is the primary sort key for pipeline sequencing. Extracting it into a dedicated field makes downstream analysis faster.

5. **Flag MCP tool dependencies separately** — `external_refs` in the current schema is the right place, but for SoNash it should be split: `mcp_tools` (MCP server refs) vs `external_services` (APIs, auth systems). This distinction matters for portability analysis.

6. **Record `disallowedTools` absence explicitly** — Two JASON-OS agents lack `disallowedTools`. At SoNash scale, absence vs presence is a meaningful security posture signal. The schema should use `null` vs `[]` vs `["Agent"]` to distinguish: not declared / explicitly none / explicitly blocked.

7. **Check for `model: opus` agents** — In JASON-OS, only the team's planner member uses opus. At SoNash scale there may be more opus agents; these are disproportionately expensive and worth flagging in the inventory for sync cost analysis.
