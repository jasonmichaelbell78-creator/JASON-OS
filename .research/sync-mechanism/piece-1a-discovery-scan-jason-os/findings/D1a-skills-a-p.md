# D1a Skills Inventory: JASON-OS Skills A-P

**Agent:** D1a
**Scan date:** 2026-04-18
**Skills covered:** add-debt, brainstorm, checkpoint, convergence-loop, deep-plan, deep-research, pr-review (7 of 7 assigned)
**Files read:** 15 total (7 SKILL.md + 5 REFERENCE.md + 3 pr-review/reference/*.md)

---

## Summary Table

| Skill | Size (bytes) | Scope | Portability | Purpose (1-line) |
|---|---|---|---|---|
| add-debt | 3,568 | universal | sanitize-then-portable | Append a debt row to .planning/DEBT_LOG.md (v0 stub for /deep-research Phase 5 routing) |
| brainstorm | 20,084 | universal | portable | Socratic creative discovery producing BRAINSTORM.md that feeds /deep-plan or /deep-research |
| checkpoint | 4,336 | universal | sanitize-then-portable | Save session state to local files and optionally MCP memory for compaction recovery |
| convergence-loop | 29,879 | universal | portable | Multi-pass claim verification primitive with composable behaviors and T20 tallies |
| deep-plan | 28,173 | universal | sanitize-then-portable | Discovery-first planning via exhaustive Q&A producing DECISIONS.md + PLAN.md artifacts |
| deep-research | 72,181 | universal | sanitize-then-portable | Multi-agent research engine with synthesis, verification, challenges, and downstream adapters |
| pr-review | 35,337 | universal | sanitize-then-portable | Process Qodo + SonarCloud PR feedback via 8-step protocol with DAS scoring and debt tracking |

---

## Learnings for Methodology

### Agent sizing

7 skills × avg ~2.1 files per skill = 15 files total read. This felt right-sized for one agent. The depth of reading required per skill varied enormously: `add-debt` took ~2 minutes to internalize; `deep-research` (SKILL.md + 1405-line REFERENCE.md) took ~15 minutes. The byte-size spread (3.5KB to 72KB) is a better proxy for agent load than file count. A flat "N files per agent" allocation will misfire on JASON-OS/SoNash skill inventories.

**Recommendation for SoNash:** Allocate by estimated byte-size, not file count. A 72KB skill + REFERENCE is roughly equivalent to 20 small skills. Treat skills above ~30KB as 2 units for sizing purposes.

Estimated time for this batch: ~90 minutes reading + ~30 minutes writing. Actual felt close to that.

### File-type observations

`pr-review` is structurally different from all other skills: it has a `reference/` subdirectory containing 2 standalone .md files rather than a single REFERENCE.md at the skill root. The other 5 skills with companions put REFERENCE.md at the same level as SKILL.md. This is worth noting as a schema field (see Schema-field candidates below).

`deep-research` REFERENCE.md is 22 sections / 1405 lines — effectively a second SKILL.md in content volume. The split between SKILL.md (<300 lines) and REFERENCE.md (everything else) is an explicit design decision in this skill's version history.

`convergence-loop` REFERENCE.md is similarly substantial (behavior definitions, agent prompt templates, slicing templates, state schema, integration notes). The two skills that are "primitives" (convergence-loop) or "engines" (deep-research) push all detail into REFERENCE.md; the skills that are simpler workflows (checkpoint, add-debt) have no REFERENCE.md at all.

### Classification heuristics

**scope_hint enum coverage:** All 7 skills are `universal`. No exceptions encountered. This is expected for foundational OS skills that have no project-specific logic baked in. The `user` and `project` values would appear in skills that encode personal preferences or a single project's conventions respectively — none of these 7 do that.

**portability_hint distinctions observed:**

- `portable` (2 skills): brainstorm, convergence-loop. These reference no external services, no project-specific file paths beyond standard .claude/ and .research/ conventions, and no environment variables. They work as-is in SoNash.

- `sanitize-then-portable` (5 skills): The issues are mild and consistent across skills:
  - References to SoNash-specific skill names in routing tables (/gsd:new-project, /gsd:plan-phase, /repo-analysis, using-superpowers) — these are documentation cross-references only, not execution dependencies, but a reader in SoNash might expect those skills to exist
  - .research/EXTRACTIONS.md and .research/extraction-journal.jsonl referenced in deep-plan and brainstorm Phase 0 — these are SoNash artifacts that JASON-OS doesn't generate yet
  - Env var SONAR_PROJECT_KEY in pr-review is project-specific
  - pr-review's SKILL.md hardcodes "Qodo + SonarCloud" as the only reviewers, which is a documented JASON-OS trimming decision (D22/D23) — SoNash source includes CodeRabbit and Gemini
  - checkpoint's MCP memory integration requires the memory MCP server to be configured

**Borderline portability call — checkpoint:** The local-file path (default mode) is fully portable. The --mcp path requires a memory MCP server. I classified it `sanitize-then-portable` because the MCP server name/tools referenced (mcp__memory__*) would need to be verified as matching the target environment's MCP configuration. If the target environment has no memory MCP server, the --mcp flag silently becomes a no-op — that's acceptable but worth documenting.

### Dependency extraction

Dependencies were easy to find where explicitly named in Integration sections (brainstorm, deep-plan, convergence-loop, deep-research all have explicit Integration sections with neighbor lists). For skills without Integration sections (add-debt, checkpoint, pr-review), deps required reading the full step-by-step procedure to find tool calls and skill references.

**Dependency density pattern:**
- `deep-research` references the most agents by far: 8+ named subagent types (searcher, synthesizer, verifier, contrarian-challenger, otb-challenger, dispute-resolver, gap-pursuer, final-synthesizer). It is the hub of the research pipeline.
- `convergence-loop` is the most-referenced-by-others: 4 other skills in this set call it (brainstorm, deep-plan, deep-research, and it self-references for skill-audit/skill-creator integration). It is the infrastructure primitive.
- `add-debt` and `checkpoint` are near-standalone (0-1 dependencies). They are consumed by others but don't call others.
- `pr-review` has only 1 hard skill dependency (add-debt) despite being a complex 8-step workflow.

### Schema-field candidates

Beyond scope/portability, the following attributes emerged as potentially deserving their own fields:

1. **`reference_layout`**: `"flat"` (REFERENCE.md at skill root) vs `"subdirectory"` (pr-review's reference/ dir). Affects tooling that auto-discovers companion docs.

2. **`has_state_file`**: boolean + state file path pattern. 5 of 7 skills write named state files to .claude/state/. Knowing this upfront is useful for sync: state files need to stay project-local, not travel with the skill.

3. **`stub_level`**: `"production"` vs `"stub"` vs `"planned"`. add-debt is explicitly a v0 stub with a documented upgrade trigger. This is a distinct portability concern — stubs may need full replacement in SoNash rather than copy-forward.

4. **`lineage`**: SoNash source skill + version. pr-review documents this explicitly in frontmatter (Lineage field). Other skills don't have it yet, but it would be valuable for every ported skill to track where it came from and at what version.

5. **`companion_files`**: list of non-SKILL.md files (REFERENCE.md, reference/*.md, domain yaml files). Currently embedded in notes. A structured field would let tooling count and locate companion docs automatically.

6. **`agent_types_spawned`**: list of subagent_type values the skill dispatches. deep-research spawns 8+ named agent types; brainstorm spawns 3; checkpoint spawns 0. This is important for "does this skill work in this environment" assessment — an environment without a contrarian-challenger agent definition can't run deep-research Phase 3.

7. **`external_services`**: already in the schema as `external_refs`, but the current enum-free format loses whether the dependency is hard (required) vs soft (graceful degradation). Should distinguish: `required`, `optional-graceful-degradation`, `optional-enhanced`. Gemini CLI in deep-research is optional-graceful-degradation; SonarCloud API in pr-review is optional-enhanced; memory MCP in checkpoint is optional-graceful-degradation.

8. **`output_artifacts`**: structured list of files/directories the skill writes (path pattern + description + retained-vs-gitignored). deep-research's output structure is complex (4 retained files + gitignored findings/ and challenges/ dirs). This is important for sync: gitignored intermediates must stay gitignored in the target repo.

### Adjustments recommended for SoNash skill scan

SoNash has 81 skills vs JASON-OS's 13 (and 7 assigned here). Specific adjustments:

1. **Split into ~5 agents of ~16 skills each, but weight by byte-size.** Targeting equal byte-load per agent rather than equal skill count. Recommend ~120-150KB per agent as a starting target based on this batch's experience.

2. **Pre-scan for outliers before splitting.** Run a quick byte-count pass on all 81 skill directories first. Any skill above 50KB should be assigned as a solo item within an agent's batch. The equivalent of deep-research in SoNash (if it exists) would need its own agent.

3. **The REFERENCE.md subdirectory pattern** (pr-review style) may appear in more SoNash skills. Glob pattern should be `**/*.md` at 2+ depth, not just `*/REFERENCE.md`.

4. **Domain yaml files** are referenced by deep-research and live at `.claude/skills/deep-research/domains/`. Check if SoNash has more domain yaml files — these are not .md files and won't be caught by the standard md glob.

5. **Lineage tracking** will be more important for SoNash: JASON-OS skills are often ports from SoNash, so the reverse — scanning SoNash originals — needs the lineage field to distinguish "native SoNash" from "ported back from JASON-OS". Add `lineage` as a schema field before the SoNash scan.

6. **Stub detection** matters more in SoNash because there may be stubs that have since been superseded or upgraded. The SKILL.md frontmatter `version` field alone isn't sufficient; look for stub-language keywords in the description ("v0 stub", "placeholder", "deferred") to catch these.

7. **Agent type inventory** is a SoNash-specific concern: SoNash likely has more named agent types (code-reviewer, technical-writer, security-focused are mentioned as excluded from JASON-OS v0). The SoNash scan should extract `agent_types_spawned` per skill to produce a full map of agent type dependencies.
