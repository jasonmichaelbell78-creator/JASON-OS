# FINDINGS — D1-agents-jason-os

**Searcher:** D1-agents-jason-os (Phase 1 D-agent)
**Profile:** codebase
**Date:** 2026-04-21
**Sub-Question:** SQ-D1a — Inventory existing Claude Code agents in JASON-OS at `.claude/agents/`; assess reusability for `/migration`'s seven phases (0-6); flag gaps.
**Depth:** L1 (exhaustive)

---

## Summary

- **8 agents total** live in `<JASON_OS_ROOT>\.claude\agents\` — all Sonnet-backed, all built specifically to serve the `/deep-research` pipeline (seven of eight) plus one reused by `/brainstorm` (`contrarian-challenger`). [HIGH]
- Every existing agent is **research/adjudication-oriented** — they read, investigate, challenge, synthesize. **Zero** of them are transformation-oriented; none hold Edit/MultiEdit grants. This is the single largest reusability gap for `/migration`. [HIGH]
- Existing agents are **strong fits for `/migration` Phases 2 (Discovery), 3 (Research — verdict-conditional), and parts of 6 (Prove)** — particularly `deep-research-searcher` (profile-switchable), `deep-research-verifier` (dual-path codebase/external verification), `contrarian-challenger`, `otb-challenger`, and `dispute-resolver`. [HIGH]
- **No existing agent fits Phase 5 (Execute)** — sanitize/reshape/rewrite (D23/D24) is active transformation against destination idioms, which requires Edit/Write grants plus verdict-aware state and gate handshakes that no current agent implements. [HIGH]
- **No existing agent fits Phase 4 (Plan write) cleanly** — the two synthesizer agents (`deep-research-synthesizer`, `deep-research-final-synthesizer`) produce RESEARCH_OUTPUT.md with a fixed template and metadata/claims reconciliation; `MIGRATION_PLAN.md` has different required sections (verdict ledger, unit-type tracks, direct-apply vs plan-export mode per D26, gate checkpoints). A repurposing layer is feasible but not zero-cost. [MEDIUM]
- CLAUDE.md §7 lists two additional **built-in Claude Code agents** (`Explore`, `Plan`) invoked via the Task tool rather than via `subagent_type` against local `.claude/agents/*.md`. Those are first-class reusable candidates for Phase 0 context-load and Phase 2 discovery ripple. [HIGH]

---

## Claims

### C1. The JASON-OS agent roster is exactly 8 files, all in `.claude/agents/`

**Confidence:** HIGH
**Evidence:** Glob of `<JASON_OS_ROOT>\.claude\agents\*.md` returns exactly:

1. `contrarian-challenger.md`
2. `deep-research-final-synthesizer.md`
3. `deep-research-gap-pursuer.md`
4. `deep-research-searcher.md`
5. `deep-research-synthesizer.md`
6. `deep-research-verifier.md`
7. `dispute-resolver.md`
8. `otb-challenger.md`

### C2. Per-agent inventory (name, model, description, tools, invoker)

**Confidence:** HIGH (all fields drawn from each agent's YAML frontmatter).

| # | Name                           | Model  | Tools                                                                                                                          | Disallowed | maxTurns | Primary invoker (skill)                                                                   |
|---|--------------------------------|--------|--------------------------------------------------------------------------------------------------------------------------------|------------|----------|-------------------------------------------------------------------------------------------|
| 1 | `deep-research-searcher`       | sonnet | Read, Write, Bash, Grep, Glob, WebSearch, WebFetch, mcp__context7__resolve-library-id, mcp__context7__query-docs               | —          | —        | `/deep-research` Phase 1 (`.claude/skills/deep-research/REFERENCE.md:965`); `/brainstorm` Phase discovery (`.claude/skills/brainstorm/SKILL.md:131`) |
| 2 | `deep-research-synthesizer`    | sonnet | Read, Write, Bash, Grep, Glob                                                                                                  | —          | —        | `/deep-research` Phase 2 (`.claude/skills/deep-research/SKILL.md:233`)                    |
| 3 | `deep-research-verifier`       | sonnet | Read, Write, Bash, Grep, Glob, WebSearch, WebFetch                                                                             | Agent      | 30       | `/deep-research` Phases 2.5 + 3.9 (`.claude/skills/deep-research/SKILL.md:241, 322`)     |
| 4 | `contrarian-challenger`        | sonnet | Read, Write, Bash, Grep, Glob, WebSearch, WebFetch                                                                             | Agent      | 25       | `/deep-research` Phase 3 (`.claude/skills/deep-research/SKILL.md:268`); `/brainstorm` stress-test (`.claude/skills/brainstorm/SKILL.md:227`) |
| 5 | `otb-challenger`               | sonnet | Read, Write, Bash, Grep, Glob, WebSearch, WebFetch                                                                             | Agent      | 25       | `/deep-research` Phase 3 (`.claude/skills/deep-research/SKILL.md:269`)                    |
| 6 | `dispute-resolver`             | sonnet | Read, Write, Bash, Grep, Glob                                                                                                  | Agent      | 20       | `/deep-research` Phase 3.5 (`.claude/skills/deep-research/SKILL.md:283`)                  |
| 7 | `deep-research-gap-pursuer`    | sonnet | Read, Write, Bash, Grep, Glob, WebSearch, WebFetch, mcp__context7__resolve-library-id, mcp__context7__query-docs               | Agent      | 30       | `/deep-research` Phase 3.95 (`.claude/skills/deep-research/SKILL.md:307`)                 |
| 8 | `deep-research-final-synthesizer` | sonnet | Read, Write, Bash, Grep, Glob                                                                                                  | Agent      | 30       | `/deep-research` Phase 3.97 (`.claude/skills/deep-research/SKILL.md:330`)                 |

Citations:
- `deep-research-searcher` frontmatter: `.claude/agents/deep-research-searcher.md:1-16`
- `deep-research-synthesizer` frontmatter: `.claude/agents/deep-research-synthesizer.md:1-13`
- `deep-research-verifier` frontmatter: `.claude/agents/deep-research-verifier.md:1-14`
- `contrarian-challenger` frontmatter: `.claude/agents/contrarian-challenger.md:1-13`
- `otb-challenger` frontmatter: `.claude/agents/otb-challenger.md:1-13`
- `dispute-resolver` frontmatter: `.claude/agents/dispute-resolver.md:1-14`
- `deep-research-gap-pursuer` frontmatter: `.claude/agents/deep-research-gap-pursuer.md:1-14`
- `deep-research-final-synthesizer` frontmatter: `.claude/agents/deep-research-final-synthesizer.md:1-13`

### C3. Typical invocation pattern is `Agent(subagent_type="<agent-name>", prompt="...")`

**Confidence:** HIGH
**Evidence:** `/deep-research` SKILL.md uses this pattern verbatim — e.g. `Agent(subagent_type="deep-research-verifier")` (`.claude/skills/deep-research/SKILL.md:241`), `Agent(subagent_type="contrarian-challenger")` (`.claude/skills/deep-research/SKILL.md:268`), `Agent(subagent_type="otb-challenger")` (`.claude/skills/deep-research/SKILL.md:269`), `Agent(subagent_type="dispute-resolver")` (`.claude/skills/deep-research/SKILL.md:283`), `Agent(subagent_type="deep-research-gap-pursuer")` (`.claude/skills/deep-research/SKILL.md:307`), `Agent(subagent_type="deep-research-final-synthesizer")` (`.claude/skills/deep-research/SKILL.md:330`). The full spawn prompt example is at `.claude/skills/deep-research/REFERENCE.md:963-989`.

### C4. Every agent except `deep-research-searcher` and `deep-research-synthesizer` explicitly disallows recursive agent spawning

**Confidence:** HIGH
**Evidence:** `disallowedTools: Agent` appears in 6 of 8 frontmatters (`deep-research-final-synthesizer.md:10`, `contrarian-challenger.md:10`, `deep-research-gap-pursuer.md:11`, `deep-research-verifier.md:10`, `dispute-resolver.md:10`, `otb-challenger.md:10`). The two without the disallow — `deep-research-searcher` and `deep-research-synthesizer` — can recursively spawn but do not in their execution flow. Implication for `/migration`: orchestration must live at the skill level (like `/deep-research` does), not inside a parent agent.

### C5. Zero existing agents have Edit or MultiEdit tool grants

**Confidence:** HIGH
**Evidence:** Audited the `tools:` lists in all 8 frontmatters. Every agent receives `Read, Write, Bash, Grep, Glob` at minimum; the research/verification agents add `WebSearch, WebFetch` and/or Context7 MCP; none grant `Edit` or `MultiEdit`. Every agent that writes, writes NEW files (FINDINGS.md, challenges/*.md, G<N>-<scope>.md, RESEARCH_OUTPUT.md, claims.jsonl, sources.jsonl, metadata.json). None modify existing files in place. This is a structural mismatch for Phase 5 sanitize/reshape/rewrite, which IS surgical in-place transformation.

### C6. All existing agents are read/research/challenge/synthesize roles — none are transformation roles

**Confidence:** HIGH
**Evidence:** Role declarations per agent:
- `deep-research-searcher`: "investigate assigned sub-questions... write structured FINDINGS.md files" (`.claude/agents/deep-research-searcher.md:18-28`)
- `deep-research-synthesizer`: "read findings from multiple searcher agents and combine them into a coherent... research report" (`.claude/agents/deep-research-synthesizer.md:25-29`)
- `deep-research-verifier`: "validate claims extracted by searcher agents against ground truth" (`.claude/agents/deep-research-verifier.md:16-17`)
- `contrarian-challenger`: "stress-test research findings by assuming they will be wrong" (`.claude/agents/contrarian-challenger.md:16-18`)
- `otb-challenger`: "identify approaches that the research did NOT consider" (`.claude/agents/otb-challenger.md:15-16`)
- `dispute-resolver`: "adjudicate... determine the most likely truth" (`.claude/agents/dispute-resolver.md:16-20`)
- `deep-research-gap-pursuer`: "pursue these gaps until they are filled" (`.claude/agents/deep-research-gap-pursuer.md:16-21`)
- `deep-research-final-synthesizer`: "produce the definitive RESEARCH_OUTPUT.md by integrating all findings" (`.claude/agents/deep-research-final-synthesizer.md:15-20`)

No agent says "apply changes," "transform," "rewrite", "port", "migrate", "sanitize", or "reshape". The dispute-resolver even forbids it: "Do NOT modify research files — you only resolve disputes, never write findings" (`.claude/agents/dispute-resolver.md:95`). Verifier similarly: "Do NOT modify any research files — you only verify, never write findings" (`.claude/agents/deep-research-verifier.md:130`).

### C7. `deep-research-searcher` is the most reusable agent for `/migration` Phases 2 and 3 (Discovery + Research)

**Confidence:** HIGH
**Evidence:** The searcher is profile-switchable (`web | docs | codebase | academic`, `.claude/agents/deep-research-searcher.md:129-190`), writes FINDINGS.md with confidence levels, and already has the toolset needed to investigate destination-repo idioms (Context7 MCP, WebSearch/WebFetch, Grep/Glob/Read). Already reused by `/brainstorm` for domain questions (`.claude/skills/brainstorm/SKILL.md:131`), demonstrating the reuse pattern works outside `/deep-research`. For `/migration` Phase 3 (verdict-conditional reshape/rewrite research per D25), this agent can investigate destination idioms without modification — just a different spawn prompt scoped to "find destination's idiomatic pattern for X".

### C8. `deep-research-verifier` is structurally well-suited to `/migration` Phase 6 (Prove)

**Confidence:** HIGH
**Evidence:** The verifier's dual-path methodology (filesystem for codebase claims, web for external claims; `.claude/agents/deep-research-verifier.md:27-54`) maps directly onto Phase 6 "embedded convergence-loop verification" per BRAINSTORM.md §2. Its 4-verdict taxonomy (VERIFIED / REFUTED / UNVERIFIABLE / CONFLICTED; `.claude/agents/deep-research-verifier.md:56-64`) is nearly the same shape as `/migration`'s verdict legend (D23: copy-as-is / sanitize / reshape / rewrite / skip / blocked-on-prereq) — different semantics, same pattern. Tweak needed: reframe "claim" as "post-migration assertion" (e.g., "file X in destination conforms to idiom Y"). Still no modification rights needed — verifier is purely read+report.

### C9. `contrarian-challenger` + `otb-challenger` map cleanly to `/migration`'s gate-review posture and D8 "Nothing silent, ever"

**Confidence:** MEDIUM
**Evidence:** D8 requires explicit user confirmation at every verdict / sanitization / reshape / rewrite / ripple / commit (BRAINSTORM.md §3 row D8). `contrarian-challenger` produces severity-tagged challenges (CRITICAL/MAJOR/MINOR per `.claude/agents/contrarian-challenger.md:89-96`); `otb-challenger` surfaces unconsidered approaches (`.claude/agents/otb-challenger.md:26-40`). At a `/migration` gate — especially reshape/rewrite gates in Phase 5 — invoking one of these on the proposed transformation would let the user see "what could break" before approving. Reusable-with-tweaks: prompts need migration-specific framing ("what could fail about this reshape?") rather than research framing ("what could be wrong about this finding?"). MEDIUM rather than HIGH because the fit is conceptual and neither agent has been tested in a non-research context yet.

### C10. `dispute-resolver`'s DRAGged 5-type conflict taxonomy is directly applicable to `/migration` when source and destination idioms disagree

**Confidence:** MEDIUM
**Evidence:** The 5 conflict types (No Conflict / Complementary / Conflicting Opinions / Freshness / Misinformation; `.claude/agents/dispute-resolver.md:30-38`) applied to `/migration`: when SoNash's idiom for X differs from JASON-OS's idiom for X, the resolver's evidence-weight hierarchy (T1 filesystem ground truth → T4 forums, `.claude/agents/dispute-resolver.md:42-55`) tells the migration which one to honor in the destination. Plus the mandatory dissent record (`.claude/agents/dispute-resolver.md:57-62`) aligns with `/migration`'s never-silent posture — the losing idiom is preserved for future reconsideration. Tweak: replace "source URLs and tiers" with "source-repo convention vs destination-repo convention" plus filesystem evidence on both sides.

### C11. Synthesizer agents do not map cleanly to Phase 4 (MIGRATION_PLAN.md writing)

**Confidence:** MEDIUM
**Evidence:** Both synthesizers are shaped specifically for RESEARCH_OUTPUT.md — fixed template (`.claude/agents/deep-research-synthesizer.md:178-192`; `.claude/agents/deep-research-final-synthesizer.md:66-111`), mandatory claims.jsonl/sources.jsonl/metadata.json reconciliation (`.claude/agents/deep-research-final-synthesizer.md:136-172`), themes-not-concatenation philosophy (`.claude/agents/deep-research-synthesizer.md:51-70`). MIGRATION_PLAN.md per BRAINSTORM.md has different required structure: verdict ledger per unit (D23), unit-type tracks (file/workflow/concept per D1/D10), output mode selection (direct-apply vs plan-export per D26), gate checkpoints, ripple map. Reusing a synthesizer would require a parallel template and bypassing the claims/sources reconciliation — at which point it's effectively a new agent. Verdict: reuse-with-tweaks is possible but close to write-new.

### C12. `deep-research-gap-pursuer` is a possible model for "re-port/diff-port" (BRAINSTORM Q9) but not directly reusable for primary Phase 5

**Confidence:** MEDIUM
**Evidence:** The gap-pursuer identifies missing sub-questions, low-confidence areas, and unresolved contradictions, then profile-switches to pursue them (`.claude/agents/deep-research-gap-pursuer.md:25-70`). For `/migration`'s re-port / fix-only-pull use case (BRAINSTORM §5 Q9), a similar agent could identify "what changed since last port" and classify by migration-verdict rather than research-gap-type. The scaffold is right (identification + profile-switched pursuit + diminishing-returns signal, `.claude/agents/deep-research-gap-pursuer.md:98-116`). But it cannot apply changes — reuse as a scout, not an executor.

### C13. CLAUDE.md §7 names two Claude Code built-in agents (`Explore`, `Plan`) invoked via the Task tool

**Confidence:** HIGH
**Evidence:** `CLAUDE.md:154-155`:
```
| Exploring unfamiliar code       | `Explore` agent        | Task  |
| Multi-step implementation       | `Plan` agent           | Task  |
```
These are NOT files in `.claude/agents/` — they are built-in Claude Code agents dispatched via the Task tool, as distinguished by the `Tool` column ("Task" vs "Skill"). Both are referenced operationally by other skills: `/brainstorm` uses `Explore` for codebase questions (`.claude/skills/brainstorm/SKILL.md:130`, `.claude/skills/brainstorm/SKILL.md:335`); `/deep-plan` uses `Explore` for broad codebase exploration (`.claude/skills/deep-plan/SKILL.md:133`). `Explore` is a clean fit for `/migration` Phase 0 (Context) and Phase 2 (Discovery ripple). `Plan` is a partial candidate for Phase 4 but again it's a research/planning agent — it won't execute Phase 5 writes.

### C14. `/brainstorm` demonstrates the cross-skill agent reuse pattern that `/migration` can follow

**Confidence:** HIGH
**Evidence:** `/brainstorm` reuses THREE agents built originally for `/deep-research`:
- `deep-research-searcher` (domain investigation, `.claude/skills/brainstorm/SKILL.md:37, 131, 335`)
- `contrarian-challenger` (direction stress-test, `.claude/skills/brainstorm/SKILL.md:227, 336`)
- `Explore` (codebase questions — Claude Code built-in, `.claude/skills/brainstorm/SKILL.md:130, 335`)

This shows that the agents-are-reusable-across-skills model is already established in JASON-OS. `/migration` can follow the same playbook for Phases 0/2/3/6 without adding agent inventory.

### C15. `convergence-loop` skill spawns domain-appropriate agents via generic subagent_type

**Confidence:** HIGH
**Evidence:** `.claude/skills/convergence-loop/SKILL.md:140` — "the Agent tool with subagent_type appropriate to the domain". This suggests `/migration` Phase 6 could invoke `convergence-loop` with a migration-claims preset rather than call agents directly — reusing an already-built verification engine. Phase 6 is explicitly "embedded convergence-loop verification" per BRAINSTORM §2 Phase 6 and D20/D22 gate rules.

### C16. `pre-commit-fixer` uses `subagent_type: "general-purpose"` for transformation work

**Confidence:** HIGH
**Evidence:** `.claude/skills/pre-commit-fixer/SKILL.md:168` and `:170` — "Task({subagent_type: 'general-purpose', prompt: 'Fix these ESLint errors...'})" — this is the ONLY place in the JASON-OS codebase where an agent is dispatched to apply file changes, and it uses the built-in `general-purpose` agent (not a custom one) with a scoped fix prompt. Implication for `/migration` Phase 5: the existing precedent for transformation dispatch is `general-purpose` + carefully-scoped prompt, NOT a custom agent. A dedicated `/migration` transformation agent might be warranted but is not established practice.

---

## Reusability matrix

Legend: ✅ = reuse-as-is · 🔧 = reuse-with-tweaks · 🆕 = need-new · — = not applicable

| Phase                                           | `deep-research-searcher` | `deep-research-verifier` | `contrarian-challenger` | `otb-challenger` | `dispute-resolver` | `deep-research-gap-pursuer` | `deep-research-synthesizer` | `deep-research-final-synthesizer` | `Explore` (built-in) | `Plan` (built-in) | `general-purpose` (built-in) |
|-------------------------------------------------|:------------------------:|:------------------------:|:-----------------------:|:----------------:|:------------------:|:---------------------------:|:---------------------------:|:---------------------------------:|:--------------------:|:-----------------:|:----------------------------:|
| **0 Context** (sync registry + JASON-OS load)   | —                        | —                        | —                       | —                | —                  | —                           | —                           | —                                 | ✅                   | —                 | —                            |
| **1 Target pick** (menu routing)                | —                        | —                        | —                       | —                | —                  | —                           | —                           | —                                 | —                    | —                 | —                            |
| **2 Discovery** (ripple + candidate ID)         | 🔧 (codebase profile)    | —                        | —                       | —                | —                  | —                           | —                           | —                                 | ✅                   | —                 | —                            |
| **3 Research** (verdict-conditional, D25)       | ✅                        | 🔧 (pre-change verify)   | 🔧                      | 🔧               | 🔧                 | 🔧                          | —                           | —                                 | ✅                   | —                 | —                            |
| **4 Plan** (writes MIGRATION_PLAN.md)           | —                        | —                        | 🔧 (plan review)        | 🔧 (plan review) | —                  | —                           | 🔧                          | 🔧                                | —                    | 🔧                | —                            |
| **5 Execute** (sanitize/reshape/rewrite, D23/D24)| —                        | —                        | 🔧 (pre-gate review)    | —                | 🔧 (idiom conflicts)| —                           | —                           | —                                 | —                    | —                 | 🔧 (per `pre-commit-fixer` precedent) — **🆕 preferred: dedicated migration-executor** |
| **6 Prove** (embedded convergence-loop)         | —                        | ✅                        | —                       | —                | —                  | 🔧 (post-change gap scan)   | —                           | —                                 | —                    | —                 | —                            |

One-line reuse verdict per phase:

- **Phase 0:** reuse `Explore` as-is.
- **Phase 1:** orchestration-only; no agent needed.
- **Phase 2:** reuse `Explore` as-is for ripple + `deep-research-searcher` (codebase profile) with migration-scoped prompt.
- **Phase 3:** reuse `deep-research-searcher` as-is (strongest fit in the roster) — already profile-switchable; `/brainstorm` precedent confirms cross-skill use.
- **Phase 4:** reuse-with-tweaks at best; MIGRATION_PLAN.md template is distinct enough from RESEARCH_OUTPUT.md that a dedicated writer is likely warranted — **🆕 `migration-plan-writer`**.
- **Phase 5:** **biggest gap** — no existing agent applies changes. Precedent (`pre-commit-fixer`) uses `general-purpose`, but `/migration`'s verdict-gated transformation (D23/D24) plus nothing-silent posture (D8) plus sanitize+reshape+rewrite distinctions warrants a **🆕 `migration-executor`**.
- **Phase 6:** reuse `deep-research-verifier` as-is (dual-path verification shape already matches); optionally pair with a post-change variant of `gap-pursuer`.

---

## Gaps

Agent types `/migration` needs that do NOT currently exist:

1. **`migration-executor` (🆕 critical).** Active-transformation agent for Phase 5. Required tool grants: `Read, Write, Edit, MultiEdit, Bash, Grep, Glob`. Must honor verdict legend (sanitize regex-only; reshape structural-rewrite-against-destination-idioms; rewrite may dispatch mid-execute research per D24). Must emit gate checkpoints (D8 nothing-silent; D20 state-machine tracks gates only). No equivalent exists — every current agent is read-only toward its subject material, write-only toward new files. The `pre-commit-fixer` `general-purpose` dispatch pattern (`.claude/skills/pre-commit-fixer/SKILL.md:168-170`) is the closest precedent but is fix-scoped, not migration-scoped.

2. **`migration-plan-writer` (🆕 likely).** MIGRATION_PLAN.md author. Existing synthesizers (`deep-research-synthesizer`, `deep-research-final-synthesizer`) are tightly coupled to RESEARCH_OUTPUT.md template + claims.jsonl/sources.jsonl/metadata.json reconciliation. MIGRATION_PLAN.md shape (verdict ledger per unit, unit-type tracks, output mode direct-apply/plan-export per D26, gate checkpoints, ripple map) is sufficiently different that repurposing approaches write-new cost.

3. **`migration-verdict-assigner` (🆕 possible).** Phase 2 → Phase 4 bridge: given a candidate unit + destination profile, assign one of six verdicts (copy-as-is / sanitize / reshape / rewrite / skip / blocked-on-prereq per D23). Could be rolled into the plan-writer or handled at the skill-orchestrator level (analogous to how `/deep-research` handles dispatch routing). Research Q5 calls this out as a design open question ("verdict-assignment heuristics... what does this layer LOOK like operationally?" — BRAINSTORM §5 Q5). Decision deferrable; flagging for visibility.

4. **`migration-rollback-executor` (🆕 possible).** BRAINSTORM §5 Q8 asks about Phase 5 mid-execute failure recovery (partial-rollback, checkpoint-per-gate, per-file vs per-batch isolation). No existing agent rolls back — even on failure, they report and halt. If rollback is in scope, it needs its own agent with git-aware tool grants and state-machine awareness. Could alternatively be skill-level orchestration using `general-purpose` with rollback prompts.

5. **`migration-scanner` (🆕 optional).** For D2 proactive-scan trigger mode. Walk source repo, produce migration-candidate inventory with pre-assigned verdicts. Could reuse `deep-research-searcher` with a scan-specific spawn prompt — MEDIUM confidence this doesn't need a new agent, just a new invocation recipe.

Also worth noting: the 6-of-8 `disallowedTools: Agent` convention means any `/migration` orchestration that needs to spawn sub-agents must either (a) run at the skill layer (like `/deep-research`), or (b) be implemented as one of the two agents without that restriction (searcher or synthesizer), or (c) create a new agent without the restriction. Path (a) is the established pattern.

---

## Sources

Codebase (all under `<JASON_OS_ROOT>\`):

- `.claude/agents/contrarian-challenger.md:1-13, 89-96` (frontmatter, severity taxonomy)
- `.claude/agents/deep-research-final-synthesizer.md:1-13, 15-20, 66-111, 136-172` (frontmatter, role, template, reconciliation)
- `.claude/agents/deep-research-gap-pursuer.md:1-14, 16-21, 25-70, 98-116` (frontmatter, role, gap types, profile switching, diminishing-returns signal)
- `.claude/agents/deep-research-searcher.md:1-16, 18-28, 129-190` (frontmatter, role, tool strategy with 4 profiles)
- `.claude/agents/deep-research-synthesizer.md:1-13, 25-29, 51-70, 178-192` (frontmatter, role, philosophy, template)
- `.claude/agents/deep-research-verifier.md:1-14, 16-17, 27-54, 56-64, 130` (frontmatter, role, dual-path methodology, 4-verdict taxonomy, anti-pattern)
- `.claude/agents/dispute-resolver.md:1-14, 16-20, 30-38, 42-55, 57-62, 95` (frontmatter, role, 5 conflict types, evidence-weight hierarchy, dissent record, anti-pattern)
- `.claude/agents/otb-challenger.md:1-13, 15-16, 26-40` (frontmatter, role, blind-spot categories)
- `.claude/skills/deep-research/SKILL.md:233, 241, 268, 269, 283, 307, 322, 330` (subagent_type spawn references)
- `.claude/skills/deep-research/REFERENCE.md:963-989` (Phase 1 spawn prompt example)
- `.claude/skills/brainstorm/SKILL.md:37, 130, 131, 227, 335, 336` (cross-skill agent reuse: searcher, contrarian, Explore)
- `.claude/skills/brainstorm/REFERENCE.md:141, 177` (contrarian agent invocation)
- `.claude/skills/deep-plan/SKILL.md:133, 316, 368` (Explore agent, subagent dispatch routing)
- `.claude/skills/pre-commit-fixer/SKILL.md:168-170` (general-purpose subagent dispatch for fixes — only transformation precedent)
- `.claude/skills/convergence-loop/SKILL.md:140` (generic subagent_type dispatch pattern)
- `CLAUDE.md:154-155` (§7 Agent/Skill Triggers table — `Explore`, `Plan` as Task-dispatched built-ins)

Brainstorm context (all under `<JASON_OS_ROOT>\.research\migration-skill\`):

- `BRAINSTORM.md:22-32` (§2 seven-phase arc)
- `BRAINSTORM.md:56, 82-85, 120-143` (§3 decisions D4, D23, D24, D26; §5 Q1, Q5, Q8, Q9)

## Contradictions

None surfaced. The evidence is frontmatter + in-file role statements + skill references — all internally consistent.

## Serendipity

- **Observation 1:** `/deep-research` and `/brainstorm` already model the cross-skill agent reuse pattern `/migration` will want. `/migration` doesn't need to invent a new invocation protocol — follow `Agent(subagent_type="<name>", prompt="<scoped>")` at the skill orchestrator layer.
- **Observation 2:** The `general-purpose` built-in agent used by `pre-commit-fixer` is the ONLY existing in-code precedent for transformation-oriented agent dispatch in JASON-OS. Whether `/migration` should lean on `general-purpose` with careful prompting (cheaper, zero new agent inventory) vs build a dedicated `migration-executor` (more typed, clearer gate handshakes) is a real design decision that feeds BRAINSTORM Q1's "custom agents or reuse of existing" question.
- **Observation 3:** The verifier's FIRE model (Freshness/Independence/Reliability/Evidence, `.claude/agents/deep-research-verifier.md:45-50`) and the dispute-resolver's DRAGged 5-type taxonomy are well-designed and domain-generic enough that `/migration` reframing them for source-vs-destination-idiom conflicts will be near-zero-cost work.
- **Observation 4:** `deep-research-final-synthesizer` has an unusually detailed "MANDATORY" reconciliation pass (metadata.json, claims.jsonl, sources.jsonl; `.claude/agents/deep-research-final-synthesizer.md:136-172`). If `/migration` writes analogous post-execution state files (e.g., a verdict-ledger, a ripple-map, a gate-history), this agent's reconciliation pattern is a solid template.

## Confidence Assessment

- HIGH claims: C1, C2, C3, C4, C5, C6, C7, C8, C13, C14, C15, C16
- MEDIUM claims: C9, C10, C11, C12
- LOW claims: 0
- UNVERIFIED claims: 0

Overall confidence: **HIGH**. Every codebase claim has a direct path:line citation against frontmatter or explicit role text. MEDIUM claims are conceptual-fit judgments (reuse-with-tweaks assessments), not factual claims about the codebase.
