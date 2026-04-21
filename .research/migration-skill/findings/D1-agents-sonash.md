# FINDINGS — D1-agents-sonash

**Sub-question:** SQ-D1b — Inventory existing Claude Code agents in SoNash at
`C:\Users\jbell\.local\bin\sonash-v0\.claude\agents\`. Identify
SoNash-coupled vs. portable, and catalogue parallel-dispatch patterns used by
SoNash skills that `/migration` may want to adopt (both-direction build per
D16, so SoNash agents matter for reverse-direction migrations too).

**Depth:** L1 **Search profile:** codebase **Date:** 2026-04-21

---

## Summary

SoNash ships **57 top-level agent definitions** in `.claude/agents/` plus
**11 GSD variants** in `.claude/agents/global/` (divergent copies of the
top-level gsd-* set — each `global/` file is a distinct file, not a hardlink;
`diff` of `gsd-planner.md` vs `global/gsd-planner.md` returns "1,1354c1,1477",
proving independent divergence). **8 of the 57 top-level files are deprecated
redirect stubs** (removed 2026-04-01, redirect expires 2026-06-01) — they
contain only a "REMOVED — use X instead" block and are not live agents.
Live active agent count at top level: **49**.

Coupling split (live top-level only):

- **Heavily SoNash-coupled (unsafe to port without rewrite):** 16 agents —
  declare `skills: [sonash-context]` AND reference SoNash-specific paths
  (`lib/firestore-service.ts`, `functions/src/schemas.ts`,
  `scripts/lib/sanitize-error.js`), stack labels (Next.js 16 / React 19 /
  Firebase 12 / Tailwind 4 / Zod 4), or domain prose ("sobriety tracking",
  "SoNash application") in the role body.
- **Thin-coupled (port by stripping `skills: [sonash-context]` and Firebase
  examples):** 8 deep-research pipeline agents — mechanics are domain-neutral
  but declare `skills: [sonash-context]` for stack-version assertions and
  have embedded Firebase/Firestore examples in prose.
- **Fully portable (pure mechanics, no SoNash references):** 12 GSD agents +
  GSD global variants — mechanics live inside the gsd- namespace, don't
  declare `sonash-context`, don't name the app.
- **Removed stubs:** 8 files (skip entirely).
- **Other:** general-purpose (SoNash-coupled but trivial to de-couple),
  document-analyst + media-analyst (SoNash-coupled via
  `document-analysis`/`media-analysis` skills — skip; these belong to CAS and
  port via the CAS port per D19).

Portable : coupled ratio (live, 49 agents): **20 portable** (GSD 12 + 8
thin-coupled post-strip) : **29 coupled** — roughly **1:1.45**. If
thin-coupled count as "portable after sanitization" (per the /migration
active-transformation reframe, D23/D24), the ratio becomes **20:21**, i.e.
essentially half of the live SoNash agent surface is reachable for /migration.

Dispatch patterns: SoNash skills use **5 distinct parallel-dispatch shapes**
(wave-based with 4-agent concurrency cap, claim-split verification,
parallel adversarial pairs, domain-sliced convergence, and inventory-by-area
`Task()` fan-out). Context exhaustion is handled by an explicit "immediate
re-spawn across 2+ smaller agents splitting the scope" rule (deep-research
SKILL.md:46-48, Critical Rule 8) plus a Windows-specific 0-byte-output
fallback (SKILL.md:220-223, 255-266) — both directly relevant to /migration's
Phase 5 active transformation failure modes (brainstorm §5 Q8).

---

## Agent inventory

### Pipeline agents — thin-coupled (mechanics portable; strip
`sonash-context` + 1 Firebase example line per file)

| name                            | model   | tools                                                                         | portable/coupled | coupling evidence                                                                                                     |
| ------------------------------- | ------- | ----------------------------------------------------------------------------- | ---------------- | --------------------------------------------------------------------------------------------------------------------- |
| deep-research-searcher          | sonnet  | Read, Write, Bash, Grep, Glob, WebSearch, WebFetch, context7-*                | thin-coupled     | `deep-research-searcher.md:4` `skills: [sonash-context]`; example at :389-400 uses "Firebase Functions v2 cold start" |
| deep-research-synthesizer       | sonnet  | Read, Write, Bash, Grep, Glob                                                 | thin-coupled     | `deep-research-synthesizer.md:4` `skills: [sonash-context]`; role prose at :24-28 is domain-neutral                   |
| deep-research-verifier          | sonnet  | Read, Write, Bash, Grep, Glob, WebSearch, WebFetch (disallowedTools: Agent)   | thin-coupled     | `deep-research-verifier.md:10` `skills: [sonash-context]`; methodology lines :27-29 neutral                           |
| deep-research-gap-pursuer       | sonnet  | Read, Write, Bash, Grep, Glob, WebSearch, WebFetch, context7-* (disallowed Agent) | thin-coupled | `deep-research-gap-pursuer.md:12` `skills: [sonash-context]`; example at :34 names "Firebase Functions"               |
| deep-research-final-synthesizer | sonnet  | Read, Write, Bash, Grep, Glob (disallowedTools: Agent)                        | thin-coupled     | `deep-research-final-synthesizer.md:11` `skills: [sonash-context]`                                                    |
| contrarian-challenger           | sonnet  | Read, Write, Bash, Grep, Glob, WebSearch, WebFetch (disallowedTools: Agent)   | thin-coupled     | `contrarian-challenger.md:9` `skills: [sonash-context]`; no SoNash prose in role (verified 0 matches)                 |
| otb-challenger                  | sonnet  | Read, Write, Bash, Grep, Glob, WebSearch, WebFetch (disallowedTools: Agent)   | thin-coupled     | `otb-challenger.md:9` `skills: [sonash-context]`; no SoNash prose in role (verified 0 matches)                        |
| dispute-resolver                | sonnet  | Read, Write, Bash, Grep, Glob                                                 | thin-coupled     | `dispute-resolver.md:10` `skills: [sonash-context]`                                                                   |

### GSD agents — fully portable (mechanics only; zero SoNash refs)

| name                        | model    | tools                                                     | portable/coupled | coupling evidence                                                                                  |
| --------------------------- | -------- | --------------------------------------------------------- | ---------------- | -------------------------------------------------------------------------------------------------- |
| gsd-advisor-researcher      | inherit  | Read, Bash, Grep, Glob, WebSearch, WebFetch, context7-*   | portable         | `gsd-advisor-researcher.md:1-6` — no `sonash-context`, no SoNash names                             |
| gsd-assumptions-analyzer    | inherit  | Read, Bash, Grep, Glob                                    | portable         | `gsd-assumptions-analyzer.md:1-6` — no SoNash refs                                                  |
| gsd-codebase-mapper         | inherit  | Read, Bash, Grep, Glob, Write                             | portable         | `gsd-codebase-mapper.md:1-5`                                                                       |
| gsd-debugger                | inherit  | Read, Write, Edit, Bash, Grep, Glob                       | portable         | top-level file                                                                                      |
| gsd-executor                | inherit  | Read, Write, Edit, Bash, Grep, Glob                       | portable         | top-level file                                                                                      |
| gsd-integration-checker     | inherit  | Read, Bash, Grep, Glob                                    | portable         | top-level file                                                                                      |
| gsd-nyquist-auditor         | inherit  | Read, Write, Edit, Bash, Glob, Grep                       | portable         | `gsd-nyquist-auditor.md:1-15`                                                                      |
| gsd-phase-researcher        | inherit  | Read, Bash, Grep, Glob, WebSearch, WebFetch               | portable         | top-level file                                                                                      |
| gsd-plan-checker            | inherit  | Read, Bash, Grep, Glob                                    | portable         | top-level file                                                                                      |
| gsd-planner                 | inherit  | Read, Write, Bash, Glob, Grep, WebFetch, context7-*       | portable         | `gsd-planner.md:1-12`                                                                               |
| gsd-project-researcher      | inherit  | Read, Bash, Grep, Glob                                    | portable         | top-level file                                                                                      |
| gsd-research-synthesizer    | inherit  | Read, Write, Bash                                         | portable         | top-level file                                                                                      |
| gsd-roadmapper              | inherit  | Read, Write, Bash, Grep, Glob                             | portable         | top-level file                                                                                      |
| gsd-ui-auditor              | inherit  | Read, Write, Bash, Grep, Glob                             | portable         | `gsd-ui-auditor.md:1-12`                                                                           |
| gsd-ui-checker              | inherit  | Read, Bash, Grep, Glob                                    | portable         | top-level file                                                                                      |
| gsd-ui-researcher           | inherit  | Read, Bash, Grep, Glob, WebSearch, WebFetch               | portable         | top-level file                                                                                      |
| gsd-user-profiler           | inherit  | Read                                                      | portable         | `gsd-user-profiler.md:1-11`                                                                        |
| gsd-verifier                | inherit  | Read, Bash, Grep, Glob                                    | portable         | top-level file                                                                                      |

(Note: `.claude/agents/global/` holds 11 divergent copies of gsd-* — treat as a
second variant set; `diff gsd-planner.md global/gsd-planner.md` shows
independent content (1354 vs 1477 lines).)

### SoNash-coupled (stack/architecture coupling — port requires rewrite)

| name                          | model   | tools                                                 | portable/coupled | coupling evidence                                                                                                           |
| ----------------------------- | ------- | ----------------------------------------------------- | ---------------- | --------------------------------------------------------------------------------------------------------------------------- |
| explore                       | sonnet  | Read, Bash, Grep, Glob (disallowed Agent/Write/Edit)  | coupled          | `explore.md:11` `skills: [sonash-context]`; :15-30 names Next.js 16, describes `app/`, `components/`, `lib/firestore-service.ts` |
| plan                          | sonnet  | Read, Bash, Grep, Glob (disallowed Agent/Write/Edit)  | coupled          | `plan.md:11-12, :15-30` — Next.js/React/Firebase stack prose; `httpsCallable` constraint at :27-29                          |
| general-purpose               | inherit | (no explicit tools — inherits)                        | coupled          | `general-purpose.md:7, :13-16, :20-32` — Firebase-specific constraints, `lib/firestore-service.ts`, `httpsCallable`         |
| code-reviewer                 | sonnet  | Read, Write, Edit, Bash, Grep, Glob                   | coupled          | `code-reviewer.md:10, :14-15` — "SoNash project (Next.js 16...)" prose                                                       |
| debugger                      | inherit | Read, Write, Edit, Bash, Grep, Glob                   | coupled          | `debugger.md:11, :16-20` — "SoNash application", Firebase/Firestore errors, httpsCallable                                    |
| silent-failure-hunter         | inherit | Read, Bash, Grep, Glob                                | coupled          | `silent-failure-hunter.md:9, :14-18, :20-25` — uses `sanitizeError()` from `scripts/lib/sanitize-error.js`                   |
| security-auditor              | opus    | Read, Write, Edit, Bash, Grep, Glob                   | coupled          | `security-auditor.md:10, :14-15` — "SoNash application security"                                                             |
| test-engineer                 | opus    | Read, Write, Edit, Bash                               | coupled          | `test-engineer.md:9` `skills: [sonash-context]` — node:test vs Jest constraint                                               |
| frontend-developer            | sonnet  | Read, Write, Edit, Bash                               | coupled          | `frontend-developer.md:9, :12-14` — Next.js 16.2.0, Framer Motion 12, Tailwind 4.2.2                                         |
| fullstack-developer           | opus    | Read, Write, Edit, Bash                               | coupled          | `fullstack-developer.md:9`                                                                                                   |
| backend-architect             | sonnet  | Read, Write, Edit, Bash                               | coupled          | `backend-architect.md:9, :46-56` — example uses `httpsCallable`, Zod validation in `functions/src/schemas.ts`                |
| database-architect            | opus    | Read, Write, Edit, Bash                               | coupled          | `database-architect.md:9` `skills: [sonash-context]`                                                                         |
| nextjs-architecture-expert    | sonnet  | Read, Write, Edit, Bash, Grep, Glob                   | coupled          | `nextjs-architecture-expert.md:9, :12-14` — Next.js App Router specialty                                                     |
| performance-engineer          | inherit | Read, Write, Edit, Bash, Grep, Glob                   | coupled          | `performance-engineer.md:10, :15-17` — Firestore query opt, Firebase Functions cold starts                                   |
| pr-test-analyzer              | inherit | Read, Bash, Grep, Glob                                | coupled          | `pr-test-analyzer.md:3-6, :9` — "SoNash override", node:test vs Jest                                                         |
| documentation-expert          | sonnet  | Read, Write, Edit, Grep                               | coupled          | `documentation-expert.md:10, :13-14` — "SoNash, a Next.js 16.2 / React 19.2 / Firebase 12.10 sobriety tracking application" |
| technical-writer              | inherit | Read, Write, Edit, Grep, Glob (disallowed Agent)      | coupled          | `technical-writer.md:4-7, :10` — "SoNash documentation specialist... SoNash doc standards"                                  |
| mcp-expert                    | inherit | Read, Write, Edit, Bash, Grep                         | coupled          | `mcp-expert.md:3-7, :10` — "SoNash MCP integration specialist", names memory/sonarcloud/context7 active servers             |
| git-flow-manager              | sonnet  | Read, Bash, Grep, Glob, Edit, Write                   | coupled          | `git-flow-manager.md:9`                                                                                                       |
| dependency-manager            | sonnet  | Read, Bash, Grep                                      | coupled          | `dependency-manager.md:8` — "functions/package.json dependency trees" (SoNash-specific path)                                |
| ui-ux-designer                | sonnet  | Read, Write, Edit                                     | coupled          | `ui-ux-designer.md:9`                                                                                                        |
| document-analyst              | sonnet  | Read, Write, Bash, Grep, Glob (disallowed Agent)      | coupled (CAS)    | `document-analyst.md:4, :10` — spawned by `/document-analysis` skill (part of CAS ecosystem per D19)                         |
| media-analyst                 | sonnet  | Read, Write, Bash, Grep, Glob (disallowed Agent)      | coupled (CAS)    | `media-analyst.md:4, :10` — spawned by `/media-analysis` (CAS ecosystem)                                                     |

### Removed-stub files (skip entirely)

`deployment-engineer.md`, `devops-troubleshooter.md`, `error-detective.md`,
`markdown-syntax-formatter.md`, `penetration-tester.md`, `prompt-engineer.md`,
`react-performance-optimization.md`, `security-engineer.md` — each is a 10-14
line "REMOVED — use X instead" stub. Redirect expires 2026-06-01. Do not port
(8 files).

---

## Dispatch patterns

SoNash skills use five distinct patterns for spawning agents in parallel.
Each is a concrete, file:line-citable pattern `/migration` can adopt.

### Pattern 1 — Wave-based fan-out with 4-agent concurrency cap

**Where:** `.claude/skills/deep-research/SKILL.md:121-124` (Phase 1 entry)
and `:207-217` (Phase 1 detail).

**Mechanics:**
- Spawn D searcher agents (`D + 3 + floor(D/5)` floor per Critical Rule 7).
- **Cap concurrency at 4 agents**: "Respect 4-agent concurrency" (:213). If
  more are needed, process in waves.
- Report wave progress: `"Wave N/M complete. X answered, Y remaining."`
  (SKILL.md:123, :1254-1255 in REFERENCE.md).
- Timeout 5 min per searcher; on failure → user checkpoint ("proceed or
  re-run?" :213-214).

**Relevance to /migration:** Phase 2 discovery and Phase 3 research
(brainstorm §5 Q1) have the same shape — N sub-questions per migration
unit, each dispatched as parallel searchers, waved against the 4-cap.

### Pattern 2 — Context-exhaustion re-spawn (claim-splitting)

**Where:** `.claude/skills/deep-research/SKILL.md:46-48` (Critical Rule 8)
and `:243-247` (Phase 2.5 application).

**Mechanics:**
- **Rule 8** (SKILL.md:46-48): "Context exhaustion = immediate re-spawn.
  If any agent fails to write complete findings, re-spawn across 2+ smaller
  agents splitting the scope. Never accept partial output."
- Applied in Phase 2.5 verification: L1 (2 agents), L2 (2), L3 (3), L4 (4+);
  "Split claims across agents to avoid context exhaustion. Re-spawn per
  Critical Rule 8" (:245-247).
- **Windows 0-byte fallback** (CRITICAL for Windows-only JASON-OS):
  SKILL.md:220-223 — post-agent, check `wc -c`; if 0, write
  task-notification `<result>` text to the expected file via Write tool.
  SKILL.md:255-266 defines the "persistence safety net" applied to every
  spawn across Phases 2.5, 3, 3.5, 3.9, 3.96 — re-spawn max 1 retry then
  escalate to user.

**Relevance to /migration:** Phase 5 active transformation (brainstorm D24)
dispatches research mid-execute for rewrite verdicts. Re-spawn on
context exhaustion maps directly to per-file vs per-batch failure
isolation (brainstorm §5 Q8). The Windows 0-byte fallback is MANDATORY
for JASON-OS given CLAUDE.md Critical Rule 15.

### Pattern 3 — Parallel adversarial pair (contrarian + OTB simultaneously)

**Where:** `.claude/skills/deep-research/SKILL.md:270-281` (Phase 3).

**Mechanics:**
- `Agent(subagent_type="contrarian-challenger")` and
  `Agent(subagent_type="otb-challenger")` spawned **in parallel**
  (SKILL.md:272-273).
- Scaling: L1-L2 (1+1), L3 (2+2), L4 (3+3 + red team + pre-mortem).
- Each writes to a distinct directory:
  `challenges/contrarian-<N>.md` and `challenges/otb-<N>.md` (:274-275).
- Outputs: independent adversarial stress-tests of the same synthesis.

**Relevance to /migration:** Useful in Phase 2 discovery (reshape-verdict
stress test) and Phase 6 prove (is the migration result genuinely
equivalent, or did we introduce silent loss?).

### Pattern 4 — Domain-sliced convergence (shared context + parallel verify)

**Where:** `.claude/skills/convergence-loop/SKILL.md:148-175` (Loop step)
and `REFERENCE.md:194-236` (slicing templates).

**Mechanics:**
- Setup (`SKILL.md:135-147`): min 2, default 3-5, max 8 agents. Scale to
  claims volume. `subagent_type` chosen per domain (e.g., `general-purpose`
  for docs, `code-reviewer` for code claims — SKILL.md:137-138).
- Each agent gets: (a) its domain slice of claims, (b) behavior instructions
  for this pass, (c) required output format, (d) prior pass tally
  (EXCEPT `fresh-eyes` which gets nothing — SKILL.md:150-154).
- Slicing templates (`REFERENCE.md:194-236`): path-based (`src/components/**`
  vs `lib/**` vs `scripts/**`), concern-based (security / performance /
  architecture / testing), doc-based (ROADMAP vs CLAUDE.md vs .planning),
  severity-based (S0+S1 / S2 / S3).
- Output validation (`SKILL.md:156-160`): if agent returns <3 findings for
  slice of >10 claims, or findings lack claim IDs, flag as degraded;
  re-dispatch once; second failure → mark "unverifiable".
- **Minimum 2 passes enforced** (`SKILL.md:17`).

**Relevance to /migration:** Phase 6 Prove embeds convergence-loop
verification per brainstorm bones. Slicing templates give concrete
shapes for splitting verification work across unit types.

### Pattern 5 — Inventory-by-area `Task()` fan-out

**Where:** `.claude/skills/audit-process/prompts.md:16-145` (Agents 1A-1E)
and `.claude/skills/audit-ai-optimization/SKILL.md:123, :149, :175, :226`.

**Mechanics:**
- Fire-and-forget parallel `Task(subagent_type="Explore", prompt="""...""")`
  blocks, one per inventory domain.
- `audit-process/prompts.md`:
  - Agent 1A: Hooks inventory (:19)
  - Agent 1B: Scripts inventory (:50)
  - Agent 1C: Skills & commands inventory (:81)
  - Agent 1D: CI & config inventory (:111)
  - Agent 1E: Firebase inventory (:143)
- Each agent is given a numbered 1-N list of "list every X, one-line
  description each". Results re-aggregated by orchestrator.
- `audit-ai-optimization/SKILL.md`: 4+ `Task(subagent_type="Explore")` calls
  for dead-doc audit, fragile-parsing audit, instruction-efficiency audit,
  etc.

**Relevance to /migration:** Phase 1 target-pick and Phase 2 discovery
(ripple analysis per brainstorm bones) have exactly this shape — parallel
inventory of SoNash subsystems to identify migration candidates.

### Notes on context exhaustion handling (explicit mechanisms found)

1. **Pre-emptive split** — deep-research Phase 2.5 splits claims across
   2-4+ agents up front so no single agent holds the full claim set
   (SKILL.md:245-247).
2. **Post-hoc re-spawn** — Rule 8: any incomplete write → re-spawn across
   2+ smaller agents (SKILL.md:46-48).
3. **Persistence safety net** — orchestrator verifies non-empty
   `findings/<file>` after every spawn; on failure, captures agent's
   `<result>` text and writes as fallback; max 1 retry then escalate
   (SKILL.md:255-266).
4. **Agent-definition `maxTurns`** — explicit per-agent limits
   (contrarian-challenger `maxTurns: 25`, verifier `maxTurns: 30`, searcher
   no cap, silent-failure-hunter `maxTurns: 20`).
5. **`disallowedTools: Agent`** on every pipeline agent (searcher, both
   challengers, verifier, gap-pursuer, final-synthesizer, dispute-resolver,
   document-analyst, media-analyst, explore, plan, code-reviewer,
   debugger, security-auditor, performance-engineer, silent-failure-hunter,
   technical-writer, mcp-expert, pr-test-analyzer) — prevents recursive
   agent-in-agent context blowup.

---

## Recommendations for /migration

### Agents to port into JASON-OS (Phase-by-phase match)

| /migration phase                    | Port from SoNash                                                                                 | Port shape                                                                                                                             |
| ----------------------------------- | ------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------- |
| Phase 2 Discovery (ripple + scan)   | `deep-research-searcher` (thin-coupled)                                                          | Strip `skills: [sonash-context]`, strip Firebase example at :389-400 → JASON-OS already has this agent extracted (confirm via D1a)     |
| Phase 3 Research (reshape/rewrite)  | Full deep-research pipeline: `deep-research-synthesizer`, `deep-research-verifier`, `deep-research-gap-pursuer`, `deep-research-final-synthesizer`, `dispute-resolver` | All thin-coupled. Same strip procedure. Already present as the D1a companion inventory in JASON-OS (per D27 expansion).             |
| Phase 3 Challenges                  | `contrarian-challenger`, `otb-challenger`                                                        | Verified 0 SoNash refs in role body; strip `skills: [sonash-context]` only.                                                            |
| Phase 5 Execute (active transform)  | No direct agent equivalent in SoNash — needs NEW JASON-OS-native `migration-executor` agent      | Design new; borrow tool-grant shape from `explore` (Read/Bash/Grep/Glob) plus Write/Edit gated per gate.                                |
| Phase 6 Prove                       | `convergence-loop` skill + `general-purpose` / `code-reviewer` subagent_types                    | `general-purpose` and `code-reviewer` are coupled — port as NEW JASON-OS-native variants. Alternatively: dispatch through convergence-loop using stack-agnostic prompts. |

### Patterns to adopt (by priority)

1. **Pattern 2 (context-exhaustion re-spawn + Windows 0-byte fallback)** —
   MANDATORY per JASON-OS CLAUDE.md §4 guardrail #15. Import the
   "persistence safety net" verbatim from deep-research SKILL.md:255-266
   into /migration SKILL.md.
2. **Pattern 1 (wave-based 4-agent concurrency)** — for Phase 2 discovery
   fan-out. /migration should respect the same 4-cap and report
   `"Wave N/M complete"` progress.
3. **Pattern 4 (domain-sliced convergence)** — Phase 6 Prove directly maps
   to `convergence-loop` with a slicing strategy chosen per migration unit
   type (file-path slicing for file units, concern slicing for workflow
   units, section slicing for concept units).
4. **Pattern 5 (inventory-by-area Task fan-out)** — Phase 1 target-pick
   proactive-scan mode (brainstorm D2) is exactly this shape.
5. **Pattern 3 (adversarial pair)** — useful but OPTIONAL; use only when
   reshape/rewrite verdict is contested and user opts into a challenge gate.

### Coupling-port heuristics

- **Never port `skills: [sonash-context]` directly** — JASON-OS has no
  equivalent (and per CLAUDE.md §1 is stack-agnostic). Replace with either
  (a) no skills declaration, or (b) a future `jason-os-context` skill if
  one is introduced.
- **`model: inherit`** is the safe default for ported agents — GSD agents
  use it exclusively. Pipeline agents use `model: sonnet` which is fine
  (model family-agnostic).
- **`disallowedTools: Agent`** on every migration-sub-agent — adopt this
  uniformly to prevent recursive-agent context blowup (same reason
  SoNash adopts it).
- **`maxTurns`** explicit caps — adopt per-agent; deep-research uses 20-30.
- **Skip the 8 removed stubs** — no value.
- **Treat `document-analyst` / `media-analyst` as out of scope** — these
  belong to CAS (D19) and port via the CAS port, not via /migration's own
  agent roster.
- **GSD agents are the cleanest port precedent** — they declare no SoNash
  coupling and form a coherent 12-agent multi-phase research/plan/verify
  pipeline that matches /migration's 7-phase arc very closely. If a full
  port of the GSD pipeline is feasible, that's the highest-leverage
  portable block in the SoNash agent tree.

---

## Sources

### SoNash agent definitions (live, 49)

- `C:\Users\jbell\.local\bin\sonash-v0\.claude\agents\deep-research-searcher.md`
- `C:\Users\jbell\.local\bin\sonash-v0\.claude\agents\deep-research-synthesizer.md`
- `C:\Users\jbell\.local\bin\sonash-v0\.claude\agents\deep-research-verifier.md`
- `C:\Users\jbell\.local\bin\sonash-v0\.claude\agents\deep-research-gap-pursuer.md`
- `C:\Users\jbell\.local\bin\sonash-v0\.claude\agents\deep-research-final-synthesizer.md`
- `C:\Users\jbell\.local\bin\sonash-v0\.claude\agents\contrarian-challenger.md`
- `C:\Users\jbell\.local\bin\sonash-v0\.claude\agents\otb-challenger.md`
- `C:\Users\jbell\.local\bin\sonash-v0\.claude\agents\dispute-resolver.md`
- `C:\Users\jbell\.local\bin\sonash-v0\.claude\agents\explore.md`
- `C:\Users\jbell\.local\bin\sonash-v0\.claude\agents\plan.md`
- `C:\Users\jbell\.local\bin\sonash-v0\.claude\agents\general-purpose.md`
- `C:\Users\jbell\.local\bin\sonash-v0\.claude\agents\code-reviewer.md`
- `C:\Users\jbell\.local\bin\sonash-v0\.claude\agents\debugger.md`
- `C:\Users\jbell\.local\bin\sonash-v0\.claude\agents\silent-failure-hunter.md`
- `C:\Users\jbell\.local\bin\sonash-v0\.claude\agents\security-auditor.md`
- `C:\Users\jbell\.local\bin\sonash-v0\.claude\agents\test-engineer.md`
- `C:\Users\jbell\.local\bin\sonash-v0\.claude\agents\frontend-developer.md`
- `C:\Users\jbell\.local\bin\sonash-v0\.claude\agents\fullstack-developer.md`
- `C:\Users\jbell\.local\bin\sonash-v0\.claude\agents\backend-architect.md`
- `C:\Users\jbell\.local\bin\sonash-v0\.claude\agents\database-architect.md`
- `C:\Users\jbell\.local\bin\sonash-v0\.claude\agents\nextjs-architecture-expert.md`
- `C:\Users\jbell\.local\bin\sonash-v0\.claude\agents\performance-engineer.md`
- `C:\Users\jbell\.local\bin\sonash-v0\.claude\agents\pr-test-analyzer.md`
- `C:\Users\jbell\.local\bin\sonash-v0\.claude\agents\documentation-expert.md`
- `C:\Users\jbell\.local\bin\sonash-v0\.claude\agents\technical-writer.md`
- `C:\Users\jbell\.local\bin\sonash-v0\.claude\agents\mcp-expert.md`
- `C:\Users\jbell\.local\bin\sonash-v0\.claude\agents\git-flow-manager.md`
- `C:\Users\jbell\.local\bin\sonash-v0\.claude\agents\dependency-manager.md`
- `C:\Users\jbell\.local\bin\sonash-v0\.claude\agents\ui-ux-designer.md`
- `C:\Users\jbell\.local\bin\sonash-v0\.claude\agents\document-analyst.md`
- `C:\Users\jbell\.local\bin\sonash-v0\.claude\agents\media-analyst.md`
- `C:\Users\jbell\.local\bin\sonash-v0\.claude\agents\gsd-advisor-researcher.md`
- `C:\Users\jbell\.local\bin\sonash-v0\.claude\agents\gsd-assumptions-analyzer.md`
- `C:\Users\jbell\.local\bin\sonash-v0\.claude\agents\gsd-codebase-mapper.md`
- `C:\Users\jbell\.local\bin\sonash-v0\.claude\agents\gsd-debugger.md`
- `C:\Users\jbell\.local\bin\sonash-v0\.claude\agents\gsd-executor.md`
- `C:\Users\jbell\.local\bin\sonash-v0\.claude\agents\gsd-integration-checker.md`
- `C:\Users\jbell\.local\bin\sonash-v0\.claude\agents\gsd-nyquist-auditor.md`
- `C:\Users\jbell\.local\bin\sonash-v0\.claude\agents\gsd-phase-researcher.md`
- `C:\Users\jbell\.local\bin\sonash-v0\.claude\agents\gsd-plan-checker.md`
- `C:\Users\jbell\.local\bin\sonash-v0\.claude\agents\gsd-planner.md`
- `C:\Users\jbell\.local\bin\sonash-v0\.claude\agents\gsd-project-researcher.md`
- `C:\Users\jbell\.local\bin\sonash-v0\.claude\agents\gsd-research-synthesizer.md`
- `C:\Users\jbell\.local\bin\sonash-v0\.claude\agents\gsd-roadmapper.md`
- `C:\Users\jbell\.local\bin\sonash-v0\.claude\agents\gsd-ui-auditor.md`
- `C:\Users\jbell\.local\bin\sonash-v0\.claude\agents\gsd-ui-checker.md`
- `C:\Users\jbell\.local\bin\sonash-v0\.claude\agents\gsd-ui-researcher.md`
- `C:\Users\jbell\.local\bin\sonash-v0\.claude\agents\gsd-user-profiler.md`
- `C:\Users\jbell\.local\bin\sonash-v0\.claude\agents\gsd-verifier.md`

### Removed-stub files (8, skip)

- deployment-engineer.md, devops-troubleshooter.md, error-detective.md,
  markdown-syntax-formatter.md, penetration-tester.md, prompt-engineer.md,
  react-performance-optimization.md, security-engineer.md

### `.claude/agents/global/` — 11 divergent gsd-* variants

- `global/gsd-codebase-mapper.md`, `global/gsd-debugger.md`,
  `global/gsd-executor.md`, `global/gsd-integration-checker.md`,
  `global/gsd-phase-researcher.md`, `global/gsd-plan-checker.md`,
  `global/gsd-planner.md`, `global/gsd-project-researcher.md`,
  `global/gsd-research-synthesizer.md`, `global/gsd-roadmapper.md`,
  `global/gsd-verifier.md`

### Dispatch-pattern sources

- `C:\Users\jbell\.local\bin\sonash-v0\.claude\skills\deep-research\SKILL.md:46-48,121-124,207-217,220-223,237,243-247,255-266,270-281,287,311,326,334`
- `C:\Users\jbell\.local\bin\sonash-v0\.claude\skills\deep-research\REFERENCE.md:820-881,953-990,1248-1255`
- `C:\Users\jbell\.local\bin\sonash-v0\.claude\skills\convergence-loop\SKILL.md:17,135-175`
- `C:\Users\jbell\.local\bin\sonash-v0\.claude\skills\convergence-loop\REFERENCE.md:1-80,194-236`
- `C:\Users\jbell\.local\bin\sonash-v0\.claude\skills\skill-creator\REFERENCE.md:73-74`
- `C:\Users\jbell\.local\bin\sonash-v0\.claude\skills\audit-process\prompts.md:16-145`
- `C:\Users\jbell\.local\bin\sonash-v0\.claude\skills\audit-ai-optimization\SKILL.md:121-226`

### Cross-reference

- `C:\Users\jbell\.local\bin\sonash-v0\.claude\skills\sonash-context\SKILL.md:1-60` — definition of the coupling skill, names exact SoNash constraints injected into every coupled agent.
- `C:\Users\jbell\.local\bin\sonash-v0\CLAUDE.md` §7 — the 34-agent count claim in CLAUDE.md is stale versus the filesystem reality (57 top-level files, 49 live).
- `C:\Users\jbell\.local\bin\JASON-OS\.research\migration-skill\BRAINSTORM.md` §3 D16, §3 D19, §5 Q1, §5 Q8 — direct cross-reference to migration-skill decisions this research feeds.
