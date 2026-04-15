# JASON-OS MVP Research Output

**Re-synthesized:** 2026-04-15 post-verification+challenges. See changelog at bottom.

**Date:** 2026-04-15
**Version:** 1.1
**Session:** 1
**Topic:** JASON-OS MVP
**Depth:** L1
**Agent count:** 18 (12 D-agents + 4 V-agents + 1 contrarian + 1 OTB)
**Reframed question:** What spine + organs make SoNash feel like home, and what is the smallest JASON-OS delta that replicates that feel?

---

## Executive Summary

SoNash feels like home because it has three interlocking properties that JASON-OS currently lacks in large measure: session continuity (every session starts and ends with a structured ritual that preserves state across compaction and time), ambient intelligence (hooks fire on every prompt, every write, every failure, providing a layer of behavioral enforcement and awareness that operates below the operator's attention), and knowledge accumulation (a reference graph, memory system, skill index, and session context document that together mean Claude never starts from zero).

JASON-OS has transplanted the behavioral skeleton of SoNash — the 16 guardrail rules, the four permission deny rules, the core planning skills (brainstorm, deep-plan, deep-research, checkpoint, todo), and the memory system structure — but has not yet wired the nervous system that makes those bones move. Out of SoNash's 28 hook scripts, JASON-OS has 4 active (across 2 event types: SessionStart and PreToolUse). Out of 80 skills, JASON-OS has 9. The gap is not in declared intent; it is in operating wiring.

**Post-verification corrections:** Two initially HIGH-severity bugs were refuted. `scripts/lib/sanitize-error.cjs` EXISTS at the correct path in JASON-OS (C-015 REFUTED). JASON-OS `settings-guardian.js` CRITICAL_HOOKS was already trimmed to only `block-push-to-main.js` and `settings-guardian.js` — the false-positive guard condition does not exist (C-037 REFUTED). This reduces Layer 0 from 3 items to 2. Challenges raised one CRITICAL strategic question that deep-plan must resolve before scoping work.

The MVP question is not "what should JASON-OS eventually become" but "what is the minimum set of changes that makes working in JASON-OS feel like working in SoNash." The answer has three layers. Layer 0 (immediate repairs, updated): fix 2 remaining broken things (not 3). Layer 1 (session rhythm): port `session-end` v0, create `SESSION_CONTEXT.md`, wire compaction defense. Layer 2 (ambient intelligence): add PROACTIVELY clauses to existing agents (30 min, zero infra — highest-leverage single action), then selectively wire hooks. One CRITICAL strategic question is unresolved and must be named in deep-plan: whether to extract-from-SoNash or design-from-scratch.

---

## Strategic Open Questions

*Raised by CH-C-001 (CRITICAL) and CH-O-003 (HIGH novelty). These are decisions for deep-plan, not conclusions from research.*

### SQ-1: Extract-from-SoNash vs. Design-from-Scratch (CRITICAL — CH-C-001)

The synthesis frames JASON-OS as "SoNash minus app coupling." This is an assumed direction, not a named decision. The contrarian challenge frames it clearly: JASON-OS is stack-TBD (CLAUDE.md §1-3 blank). SoNash's patterns — cross-hook state loop, agent tracking, pre-commit compliance — presuppose 17 defined agents with PROACTIVELY clauses and a settled TypeScript/Node workflow. JASON-OS has 0 matching agents and no settled stack. Extracting evolved patterns from session #281 into a session #1 context risks "SoNash-in-a-trench-coat" — semantically coupled artifacts inside syntactically scrubbed files.

**Decision required in deep-plan:** Is extract-from-SoNash the right strategy, or should JASON-OS be designed from scratch using SoNash as one reference? This is not assumed direction — it is an open strategic question with material consequences for every porting decision in the scope.

### SQ-2: Workflow Chain as Product vs. Artifact Port (CH-O-003)

An alternative reading of the MVP: the workflow chain itself (brainstorm → deep-research → deep-plan → execute) is the actual portable product; hooks and skills are scaffolding. Under this frame, JASON-OS MVP is not "port N hooks/M skills" but "document and encode the orchestration pattern so any operator can replicate the PROCESS." This aligns more directly with the user's own framing: "if someone who doesn't code can build a 67-skill infrastructure through pure orchestration, that infrastructure should be portable."

Layer 3 (Navigation Documents) and Layer 4 (Quality Skills) may be better served by this reframe than mechanical porting. `AI_WORKFLOW.md` should encode PROCESS, not just catalog artifacts.

---

## (a) "Home Feel" Criteria — What Architectural Properties Constitute the Feeling

This section answers sub-question D5. The home-feel criteria are derived by cross-referencing what SoNash has that JASON-OS lacks, filtered for which gaps produce observable behavioral differences in daily use.

**Caveat (CH-C-006):** These criteria are structurally derived, not user-validated. Derivation answers "what SoNash has that JASON-OS doesn't," which is not the same as "what makes SoNash feel like home to Jason." Jason's home feel may come from a subset of these properties — possibly SESSION_CONTEXT.md containing goals/history, or the session counter incrementing, rather than PostToolUse hook cascades. `SESSION_CONTEXT.md` + `session-end v0` should be sequenced first and validated against subjective home feel before committing to Layer 2 scope.

### Criterion 1: Sessions Have Boundaries

SoNash sessions begin with a pre-flight ritual (`/session-begin`): duplicate detection, context loading from `SESSION_CONTEXT.md`, health script output, and a goal-selection prompt that announces "Session #N started." They end with a matching closure ritual (`/session-end`): git log review, context document rewrite, compliance audit, and a Y/n gate before commit. The session counter incrementing and the AI reading your previous session's goals are the moment-to-moment signal that the system knows who you are and where you left off. [D1a-1, D1a-2, D3a-6]

JASON-OS has `session-begin` (identical to SoNash) but has no `SESSION_CONTEXT.md` to read, so the context-loading phase is structurally empty. It has no `session-end` at all. Sessions currently have no structured exit ritual. [D1a-1, D1a-2]

**Smallest delta:** Create `SESSION_CONTEXT.md` at repo root with the three required sections. Port `session-end` v0 (strip Phase 3 SoNash scripts, inline the commit step). Estimated effort per D3a: ~200-line SKILL.md. **Revised estimate: 2-3 hours including dependency resolution** (log-override.js stub, safe-fs.js verification, decision on Phase 2 compliance review scope) — not 45 minutes. See CH-C-009.

### Criterion 2: Compaction Does Not Mean Amnesia

SoNash runs a 3-layer compaction defense. Layer A (`commit-tracker.js`) logs every git commit so `session-begin` can detect gap sessions. Layer B (`pre-compaction-save.js`) fires immediately before compaction and writes a comprehensive `handoff.json` snapshot. Layer C (`compact-restore.js`) fires on compact-resume and reads that snapshot back into context. The combined effect is that after compaction, the AI picks up within one or two turns with full task context. [D1a-5, D1b-7, D1b-8]

JASON-OS has only the `checkpoint` skill (manual Layer B equivalent). There is no automatic pre-compaction save, no compact-restore on resume, no commit log. Compaction means starting over unless the operator remembered to run `/checkpoint`. [D1a-5]

**Smallest delta:** Wire `pre-compaction-save.js` (PreCompact event) and `compact-restore.js` (SessionStart compact matcher). Wire `commit-tracker.js` (PostToolUse Bash commit). All three are confirmed fully portable. [D2a-8]

**Caveat (CH-C-003):** Compaction defense is structurally wired at Layer 1, but operationally effective ONLY after the first full session with session-end completing. At MVP, `pre-compaction-save.js` captures from: SESSION_CONTEXT.md (not created until Layer 1 item 4), `.session-agents.json` (no tracking hooks), `.planning/` (broken), git log. All inputs empty at session #1. Do not represent "Compaction Does Not Mean Amnesia" as an MVP-delivered property — it is a wired mechanism that becomes effective after state exists.

### Criterion 3: Every Prompt Is an Opportunity

SoNash's `user-prompt-handler.js` fires on every user message and dispatches six sub-functions: guardrails injection, frustration detection, alerts reminder, skill/agent directive emission, session-end nudge, and multi-step complexity detection. The effect is that the system is proactive on every turn — it surfaces unacknowledged alerts, suggests the right skill before Claude responds, and catches the operator saying "that's all" to remind them to close the session properly. [D1b-2, D1a-9]

This is the mechanism that turns the CLAUDE.md PRE-TASK trigger table from advisory to enforced: `runAnalyze()` emits mandatory `PRE-TASK: MUST use [skill]` directives as stdout context Claude reads before responding. Without this hook, the trigger table is consulted only if Claude remembers to check. [D1b-2]

JASON-OS has no UserPromptSubmit hook. [D1a-9, D1b-1]

**Caveat (CH-C-004):** Portability confidence for `user-prompt-handler.js` is MEDIUM, not HIGH. `runAnalyze()` emits directives for agents (code-reviewer, security-auditor, frontend-developer) that do not exist in JASON-OS — requires line-level extraction before wiring. Wiring as-is emits mandatory directives for nonexistent agents, which is worse than no enforcement. The alerts sub-function also references `pending-alerts.json` (absent in JASON-OS).

**Caveat (CH-C-008):** During the exploratory JASON-OS phase (stack-TBD, sessions #1-#10), hook enforcement that emits `PRE-TASK: MUST use [skill]` BEFORE Claude can respond may be inappropriate — it bypasses Claude's judgment at exactly the phase when discovering workflow needs adaptation. Advisory CLAUDE.md rules may be more appropriate than mandatory hook enforcement until workflow is settled. Port only `runGuardrails`, `runFrustrationDetection`, `runSessionEnd` in the near term. Defer `runAnalyze()` enforcement until workflow is stable.

**Smallest delta (revised):** Add PROACTIVELY clauses to existing agents (30 min, zero infra — see CH-O-006 in Unconsidered Approaches). Then extract portable sub-functions from `user-prompt-handler.js`, strip GSD-specific directives from `runAnalyze()`, and wire. This is a meaningful rewrite, not copy/configure.

### Criterion 4: The System Watches Itself

SoNash's PostToolUse hooks create a web of tripwires: `governance-logger.js` audits every CLAUDE.md/settings.json change, `loop-detector.js` hashes build failures and warns after three identical ones, `track-agent-invocation.js` logs every agent call and feeds the pre-commit compliance gate. The system enforces its own rules without requiring the operator to remember to check. [D1a-10, D1b-3, D1b-5]

JASON-OS has zero PostToolUse hooks. [D2a-9]

**Smallest delta for self-watch:** Add `governance-logger.js` (PostToolUse/Write+Edit on CLAUDE.md and settings.json) and `loop-detector.js` (PostToolUseFailure). These are the two highest-value PostToolUse hooks with zero SoNash dependencies.

### Criterion 5: Claude Knows What's Available

SoNash provides the AI with a structured catalog of what exists: `COMMAND_REFERENCE.md` (indexed skills), `AI_WORKFLOW.md` (session navigation), `SKILL_INDEX.md` (skill catalog), and `SESSION_CONTEXT.md` (current state). The AI navigates by consulting documents, not by guessing or filesystem enumeration. The `.research/EXTRACTIONS.md` lookup ensures prior art is checked before building anything new. [D4-5, D4-6, D2c-3]

JASON-OS has none of these navigation documents. The AI must enumerate the `.claude/skills/` directory to know what skills exist. [D2c-6, D4-5]

**Smallest delta:** Create a minimal `AI_WORKFLOW.md` stub at the repo root (encoding PROCESS, not just cataloging artifacts — see SQ-2) and port `.claude/COMMAND_REFERENCE.md` (scrubbed of SoNash-specific entries). Add `SKILL_INDEX.md` to `.claude/skills/` (zero-cost port, just remove non-portable entries). Include version + last-synced dates in SKILL_INDEX.md to address the maintenance trap (CH-C-005).

### Criterion 6: Memory Knows What Jason Is Working On

JASON-OS's memory index is richer than SoNash's in feedback entries (25 vs 37), meaning the system already knows HOW to work with Jason. But JASON-OS has almost no project memory — 1 project file vs 27 in SoNash. The result is that every new session knows behavioral rules but not what Jason is actually building. [D1a-7, D2d-8]

**Note on memory counts (C-006, CONFLICTED):** SoNash has 37 feedback entries (not 11 as originally stated — a 3x undercount). JASON-OS has 25 feedback entries (correct). The behavioral insight holds: JASON-OS knows HOW to work but not WHAT it is working on.

**Smallest delta:** Create three memory files: `project_active_initiatives.md` (what JASON-OS is building), `reference_ai_capabilities.md` (permission rules, hook inventory, skill count), and update the project memory entry to reflect the current JASON-OS state.

**Caveat (CH-C-010):** The 3-file fix is session-local (goes to `~/.claude/`). For a "portable Claude Code OS," this does not survive a machine change. Architecture decision (adopt `.claude/canonical-memory/` pattern so memory is git-tracked) is deferred to deep-plan. Do not represent 3-file fix as solving portability.

---

## (b) Spine + Organs Map

### The Spine (Always-On Primitives)

| Primitive | Event | Produces | SoNash | JASON-OS | Status |
|---|---|---|---|---|---|
| `session-begin` skill | Manual | Pre-flight: context load, goal selection, counter increment | v2.0 | v2.0 (identical) | Present |
| `SESSION_CONTEXT.md` | Read by session-begin | Session counter, branch, goals, blockers, recovery block | v8.35 | Absent | MISSING |
| `CLAUDE.md` §4 guardrails | Every turn | 16 behavioral rules | v6.0 | v0.1 (identical rules) | Present |
| `MEMORY.md` + topic files | Every turn | User patterns, corrections, project state | 77 files | 31 files | Present (thinner) |
| `session-end` skill | Manual | Context preservation, compliance, final commit | v2.2 | Absent (deferred) | MISSING |
| Deny rules (4) | Every Bash | Block force push, rm -rf, hard reset | Both | Both (identical) | Present |
| `check-mcp-servers.js` | SessionStart | MCP server availability announcement | Present | Present (identical) | Present |
| `block-push-to-main.js` | PreToolUse Bash | Block push to main | Present | Present (identical) | Present |

### The Organs (Conditional Intelligence)

**Hook Organs — Firing Events and What They Produce:**

| Hook | Event | Produces | SoNash | JASON-OS |
|---|---|---|---|---|
| `user-prompt-handler.js` | UserPromptSubmit | Guardrails, alerts, skill directives, frustration detection, farewell nudge | ~720 LOC | ABSENT |
| `pre-compaction-save.js` | PreCompact | `handoff.json` full state snapshot | Present | ABSENT |
| `compact-restore.js` | SessionStart (compact) | Compaction recovery context injection | Present | ABSENT |
| `commit-tracker.js` | PostToolUse Bash commit | `commit-log.jsonl` for gap detection | Present | ABSENT |
| `post-read-handler.js` | PostToolUse Read | Context file-read counter, overflow warning | Present | ABSENT |
| `loop-detector.js` | PostToolUseFailure | Warns on 3 identical failures in 20 min | Present | ABSENT |
| `governance-logger.js` | PostToolUse Write/Edit (CLAUDE.md) | Audit trail in `governance-changes.jsonl` | Present | ABSENT |
| `track-agent-invocation.js` | PostToolUse Task | `.session-agents.json` for pre-commit gate | Present | ABSENT |
| `pre-commit-agent-compliance.js` | PreToolUse Bash commit | Blocks commit if required agents not invoked | Present | ABSENT |
| `gsd-context-monitor.js` | PostToolUse (all) | Injects context pressure warnings to Claude | Present | ABSENT |
| `settings-guardian.js` | PreToolUse Write/Edit | Guards settings.json critical hooks | Present | Present (working) |
| `large-file-gate.js` | PreToolUse Read | Warns on large structured data files | Present | Present (working) |
| `decision-save-prompt.js` | PostToolUse AskUserQuestion | Prompts to document decisions | Present | ABSENT |
| `post-todos-render.js` | PostToolUse Write/Edit todos.jsonl | Auto-regenerates TODOS.md | Present | ABSENT |
| `gsd-statusline.js` + bridge | statusLine | Context bar, active task, update check, bridge file | Rich (22 widgets) | Partial (no bridge, no task) |

**Skill Organs (by tier):**

| Tier | SoNash | JASON-OS | Gap |
|---|---|---|---|
| Planning | brainstorm, deep-plan, deep-research, convergence-loop | All present | None |
| Session | session-begin, session-end, checkpoint, todo | session-begin, checkpoint, todo (broken), session-end ABSENT | session-end missing, todo broken |
| Quality | pre-commit-fixer, systematic-debugging, gh-fix-ci, code-reviewer, quick-fix | None | Entire tier absent |
| Meta | skill-creator, skill-audit, validate-claude-folder, find-skills, using-superpowers | skill-creator, skill-audit | 3 of 5 absent |
| Research | analyze, document-analysis, recall, synthesize | None | Entire tier absent |
| Audit | 11 audit skills (needs sanitization) | None | Entire tier absent |

**Agent Organs:**

| Category | SoNash | JASON-OS | Gap |
|---|---|---|---|
| Deep research team | All 8 variants | All 8 variants (identical) | None — but 0 PROACTIVELY clauses in JASON-OS |
| Code quality | code-reviewer, security-auditor, test-engineer, performance-engineer | None | Absent |
| Navigation | explore, plan | None | Absent |
| Specialized | 40+ others | None | Absent |

### The Delta (What JASON-OS Needs to Feel Like Home)

**Layer 0 — Immediate Repairs (nothing works correctly until these are fixed):**

1. ~~Fix `scripts/lib/sanitize-error.cjs` missing path~~ — REFUTED. File exists at correct path. Hooks are working. [C-015 REFUTED by V1b]
2. Port `scripts/planning/todos-cli.js` + `render-todos.js` + `todos-mutations.js` + create `.planning/todos.jsonl` (todo skill is fully broken). **Alternative:** Stub `/todo` as markdown-file skill in `.planning/TODOS.md` — unblocks in 30 min vs 3-4h (CH-O-008). Port full stack when concurrency is real.
3. Remove or stub the `hasDebtCandidates` dead-end in `deep-research` Phase 5 until `/add-debt` exists
4. **[CH-O-006 — HIGHEST-LEVERAGE SINGLE ACTION]** Add PROACTIVELY clauses to JASON-OS agent frontmatter. Cost: 30 minutes, zero infra (pure text edits). Return: ambient intelligence without hook infrastructure. At minimum: convergence-loop (iterative improvement) and deep-research (domain/tech research). This addresses C-012 and partially C-013 without porting user-prompt-handler.js.

**Layer 1 — Session Rhythm (feel of bounded, continuous sessions):**

5. Create `SESSION_CONTEXT.md` at repo root with required sections
6. Port `session-end` v0 (strip Phase 3, inline commit step, resolve deps). **Revised estimate: 2-3h**, not 45 min.
7. Wire `pre-compaction-save.js` + `compact-restore.js` (PreCompact + SessionStart compact). Effective only after state exists; see Criterion 2 caveat.
8. Wire `commit-tracker.js` (PostToolUse Bash commit)

**Layer 2 — Ambient Intelligence (every prompt and every failure watched):**

9. Wire `user-prompt-handler.js` (UserPromptSubmit) — but ONLY after line-level extraction of portable sub-functions. Strip GSD-specific directives from `runAnalyze()`. Consider deferring `runAnalyze()` enforcement until workflow is settled (CH-C-008). Port `runGuardrails`, `runFrustrationDetection`, `runSessionEnd` first.
10. Wire `post-read-handler.js` (PostToolUse Read) — feeds user-prompt-handler overflow logic
11. Wire `loop-detector.js` (PostToolUseFailure) — prevents infinite retry loops
12. Wire `governance-logger.js` (PostToolUse Write/Edit CLAUDE.md) — governance audit trail

**Layer 3 — Navigation Documents:**

13. Create `AI_WORKFLOW.md` stub at repo root — encode PROCESS, not just catalog artifacts
14. Port `.claude/COMMAND_REFERENCE.md` (scrubbed of SoNash entries)
15. Port `.claude/skills/SKILL_INDEX.md` with version + last-synced dates (addresses CH-C-005 maintenance trap)
16. Create `.claude/HOOKS.md` documenting the 4 currently wired hooks + any newly wired

**Layer 4 — Quality Skills (enables feedback loops):**

17. Port `pre-commit-fixer` (Value: 9/10, portable, no deps) — referenced in CLAUDE.md §4.9 but missing
18. Port `systematic-debugging` (Value: 9/10, portable) — core cognitive discipline
19. Port `validate-claude-folder` (Value: 8/10, portable) — prevents config rot

---

## (c) Critical Findings — Latent Bugs, Dead-Ends, Missing Enforcement

### ~~Bug 1: `sanitize-error.cjs` path is broken in two active hooks [REFUTED — NOT A BUG]~~

**REFUTED by V1b (C-015).** `scripts/lib/sanitize-error.cjs` EXISTS at the correct path in JASON-OS. Both `settings-guardian.js` and `large-file-gate.js` are functioning. The path resolution from `.claude/hooks/` via `../..` to `JASON-OS/scripts/lib/sanitize-error.cjs` is correct and the file is present. This item has been removed from Layer 0. The executive summary reference has been corrected.

### Bug 2: `/todo` skill is completely non-functional [SEVERITY: HIGH — UNCHANGED]

The ported todo skill mandates invocation of `scripts/planning/todos-cli.js` for every mutation. This script does not exist in JASON-OS. Neither does `render-todos.js`, `todos-mutations.js`, or `.planning/todos.jsonl`. The skill will fail on first use. This is the skill listed in CLAUDE.md §7 as the cross-session tracking primitive, and it appears in session-begin's health check. [D4-1, D1a-8]

**Alternate path (CH-O-008):** Stub `/todo` as a plain-markdown skill writing to `.planning/TODOS.md`. No concurrency risk at JASON-OS session #1 with single operator. Stub in 30 min; port full stack when need is real. SKILL.md should explicitly declare the stub version.

### Bug 3: `deep-research` Phase 5 routes to a nonexistent skill [SEVERITY: MEDIUM — UNCHANGED]

The `deep-research` skill shows a `hasDebtCandidates` menu item in Phase 5 that routes to `/add-debt`. `/add-debt` does not exist in JASON-OS. The routing will trigger a skill-not-found error. The bug is low-severity because it is the last menu item and does not block the primary research output. However, it is a confusing failure mode that every research session will surface. [D3b-5]

### ~~Bug 4: `settings-guardian.js` references a hook that is not wired [REFUTED — NOT A BUG]~~

**REFUTED by V2b (C-037).** JASON-OS's `settings-guardian.js` CRITICAL_HOOKS array (lines 36-39) contains only `"block-push-to-main.js"` and `"settings-guardian.js"`. `pre-commit-agent-compliance.js` is NOT in the ported CRITICAL_HOOKS list — the ported version was already cleaned up. This false-positive guard condition does not exist in JASON-OS. Item removed from debt tracking.

### Dead-End 1: Workflow chain is advisory, not enforced [SEVERITY: MEDIUM — NUANCED]

The `brainstorm → deep-research → deep-plan → execute` workflow chain is stated in CLAUDE.md and in user memory (`feedback_workflow_chain.md`) but has no hook enforcement in JASON-OS. In SoNash, `user-prompt-handler.js` `runAnalyze()` emits mandatory `PRE-TASK: MUST use [skill]` directives when trigger keywords appear. Without this, the chain is an advisory convention Claude can (and will) skip under context pressure. [D1b-11]

**Nuance (CH-C-008):** During the exploratory phase (JASON-OS sessions #1-#10, stack TBD), advisory enforcement may be correct. Mandatory hook enforcement that fires before Claude responds presupposes a settled workflow. Consider adding PROACTIVELY clauses to agents (Layer 0, 30 min) as a softer enforcement path that doesn't bypass Claude's judgment.

### Dead-End 2: Agent PROACTIVELY clauses are absent from all JASON-OS agents [SEVERITY: MEDIUM]

JASON-OS's 8 agents (all deep-research team) have no PROACTIVELY clauses in their frontmatter. In SoNash, 17 agents use PROACTIVELY conditions to self-dispatch when their expertise matches the task. Without these clauses, JASON-OS agents will never self-dispatch — they must always be explicitly invoked. [D1b-6]

**This is the highest-leverage single Layer 0 action (CH-O-006).** Text edits to existing files, no hook wiring, no dependency resolution.

### Dead-End 3: `session-begin` health scripts reference tools that don't exist [SEVERITY: LOW]

The session-begin SKILL.md (identical between SoNash and JASON-OS) references scripts like `npm run patterns:check`, `npm run session:gaps`, and `npm run hooks:health` in its Phase 3 health check step. None of these npm scripts exist in JASON-OS. Session-begin will either fail noisily on these steps or skip them. The core ritual (context loading, goal selection) is unaffected, but the health check phase produces errors. [D1a finding on partial functionality]

### Missing Enforcement: CLAUDE.md has no `[GATE]` or `[BEHAVIORAL]` annotations [SEVERITY: LOW]

SoNash's CLAUDE.md tags every rule with `[GATE: mechanism]` or `[BEHAVIORAL: method]` to signal to Claude which rules have automated enforcement and which rely on AI self-compliance. JASON-OS CLAUDE.md v0.1 has no enforcement annotations. Every rule implicitly reads as behavioral-only even when hooks exist (e.g., the push guard hook exists but §4.7 says "Never push without explicit approval" with no [GATE] tag). SoNash CLAUDE.md Section 8 has 11 declared reference docs (not 5 as originally stated — C-022 CONFLICTED); JASON-OS Section 8 remains TBD with no reference doc ecosystem. [D2c-5]

### Maintenance Trap: 32 Portable Skills With No Sync Primitive [SEVERITY: MEDIUM — NEW, CH-C-005]

Research identifies ~32 "fully portable" skills from SoNash's 80. No version columns. No last-synced tracking. SoNash is at `SESSION_CONTEXT.md` v8.35 — 280+ sessions of per-skill improvement that JASON-OS's ported copies will not receive. Within 6 months: deep-research in JASON-OS = bootstrap version; SoNash running a significantly improved version. Operator notices behavior differences, cannot identify cause.

This was the #1 stated risk from the brainstorm and is currently unaddressed.

**Required:** Deep-plan MUST include a sync primitive — `SKILL_INDEX.md` with version + last-synced dates, plus a skill-staleness-audit trigger that checks against SoNash. Without this, 32 ported skills become a growing liability rather than an asset.

---

## (d) MVP Scope — Three Categories

*Reframed from 18-item linear backlog. Source: CH-C-002. "Minimum for home feel ≠ minimum viable product."*

**Important framing:** Jason creates for joy, not shipping. This is not a delivery backlog. It is three distinct decisions about different kinds of work.

### Category 1 — Fixes (must-do regardless, est. ~1.5-2h)

These are broken things that produce errors on first use.

1. Stub or port `/todo` skill script stack. Stub path: 30 min (SKILL.md rewrite + `.planning/TODOS.md`). Full port: 3-4h. Stub recommended first (CH-O-008).
2. Remove or stub `hasDebtCandidates` routing in `deep-research` Phase 5 (30 min)
3. **[30-min zero-infra win]** Add PROACTIVELY clauses to existing agents (CH-O-006). Not a bug fix, but costs nothing and should be done first.

### Category 2 — Home Feel Organs (the actual MVP question, est. 6-9h including revised estimates)

These items produce the lived experience of being home.

4. Create `SESSION_CONTEXT.md` at repo root
5. Port `session-end` v0 (2-3h with dependency resolution — log-override.js stub, safe-fs.js verification, Phase 2 scoping decision)
6. Wire `pre-compaction-save.js` + `compact-restore.js` (mechanism, effective after state exists)
7. Wire `commit-tracker.js`
8. Wire selected `user-prompt-handler.js` sub-functions (after line-level extraction — `runGuardrails`, `runFrustrationDetection`, `runSessionEnd` only in exploratory phase)

**Recommended sequence:** SESSION_CONTEXT.md + session-end v0 first. Run one full session cycle. Validate subjective home feel before committing to remaining Layer 1-2 items.

### Category 3 — Craft Extensions (as joy permits, no urgency)

These items improve the experience but have zero functional dependency on Categories 1-2.

9. Create `AI_WORKFLOW.md` stub (encode process, not just catalog)
10. Port `.claude/COMMAND_REFERENCE.md` (scrubbed)
11. Port `.claude/skills/SKILL_INDEX.md` with version + last-synced dates
12. Create `.claude/HOOKS.md`
13. Port `pre-commit-fixer` skill
14. Port `systematic-debugging` skill
15. Port `validate-claude-folder` skill
16. Wire `governance-logger.js`
17. Wire `loop-detector.js`
18. Wire `post-read-handler.js`

**Note:** Layer 3 items (9-12) may be better served by the "workflow chain as product" reframe (SQ-2) than by mechanical porting.

### Not in MVP Scope (confirmed deferrals)

- Full TDMS (`/add-debt`, `debt-runner`, 28 scripts) — SoNash-specific infrastructure
- `pr-review`, `pr-retro` skills — need sanitization + agent ports first
- `code-reviewer`, `security-auditor` agents — need stack decisions
- SoNash Go statusline binary — not portable; JASON-OS bash statusline is adequate
- `ci.yml` main build workflow — no build step in JASON-OS yet
- Full audit skill suite (11 skills) — needs sanitization, lower urgency
- `canonical-memory/` architecture — deferred to deep-plan (CH-C-010)
- `runAnalyze()` enforcement in user-prompt-handler.js — deferred until workflow settled (CH-C-008)

---

## Unconsidered Approaches

*Raised by OTB agent. Included for deep-plan awareness — not directives.*

### AgentSkills Open Standard (CH-O-001, HIGH novelty)

Anthropic published AgentSkills as an open standard on 2025-12-18. As of 2026-03, supported by 16+ tools: Claude Code, Cursor, OpenAI Codex, Gemini CLI, GitHub Copilot, VS Code, JetBrains Junie, OpenHands, Goose. The standard defines a portable directory format any compliant tool can load. Research exclusively compared SKILL.md as Claude Code artifacts and did not evaluate whether JASON-OS skills should target the open standard.

**Why it matters:** If compatible, JASON-OS skills become natively cross-tool at zero additional cost. The brainstorm's cross-tool anti-goal was stated before 16-tool coverage existed.

**Recommendation:** 2-hour feasibility spike before deep-plan finalizes skill-authoring conventions. Determine whether AgentSkills is a superset, subset, or orthogonal to SKILL.md. If superset-compatible, upside is enormous at near-zero cost.

**Sources:** agentskills.io/home; anthropic.com/engineering/equipping-agents-for-the-real-world-with-agent-skills

### Dotfile Tools for Portability Sync (CH-O-002, HIGH novelty)

The "portable setup replicating across machines/projects" is the dotfiles problem — solved at industrial scale by chezmoi, YADM, GNU Stow, Dotbot. Research found the template-divergence problem and concluded a custom CLI (Direction F) is the only solution. Dotfile tools ARE that CLI.

Key properties: chezmoi init + apply = zero-infra install story; host-specific overrides via templating; `chezmoi update` solves SoNash → JASON-OS drift without custom tooling; bidirectional with `chezmoi re-add`.

**Blocker to investigate:** Dotfile tools target `~/`, not project-level `.claude/` — path mapping unclear. If chezmoi can target arbitrary dirs, Direction F CLI build effort may be eliminated.

### PROACTIVELY Clauses — Highest-Leverage Single Action (CH-O-006, confirmed for adoption)

17 SoNash agents have PROACTIVELY clauses; 0 JASON-OS agents do. Adding them requires NO new scripts, NO hook wiring, NO dependency resolution — pure text edits to existing agent frontmatter files. MVP scope treats hook wiring as equivalent-weight to PROACTIVELY clause additions. They are not equivalent.

**For no-code orchestrator: transformative.** Ambient intelligence without hook infrastructure. Converts agents from "tools to remember" to "colleagues who self-dispatch."

**Status: Adopt at Layer 0.** Cost 30 min. Minimum: add to convergence-loop and deep-research agents.

### Stub /todo vs Full Port (CH-O-008)

Full port of todos-cli.js + render-todos.js + todos-mutations.js is 3-4h. A stub writing to `.planning/TODOS.md` (plain markdown) unblocks the skill in 30 min. No concurrency risk at JASON-OS session #1. SKILL.md should declare the stub version explicitly to prevent confusion. Port full stack when concurrency is real.

---

## Challenges and Limitations

### Contrarian Challenges Summary (10 challenges, 1 CRITICAL + 7 MAJOR + 2 MINOR)

| ID | Challenge | Severity | Resolution in This Synthesis |
|---|---|---|---|
| CH-C-001 | Extract strategy path-dependent for stack-TBD | CRITICAL | Added as Strategic Open Question SQ-1 — named decision for deep-plan |
| CH-C-002 | 18-item MVP is scope inflation | MAJOR | MVP scope reframed into 3 categories; "minimum for home feel ≠ MVP" |
| CH-C-003 | Compaction defense empty-inputs at MVP | MAJOR | Caveat added to Criterion 2; mechanism/effectiveness distinction made explicit |
| CH-C-004 | user-prompt-handler.js not line-extracted | MAJOR | Portability downgraded to MEDIUM on C-009, C-013, C-025; runAnalyze caveat added |
| CH-C-005 | Maintenance trap unaddressed | MAJOR | New "Maintenance Trap" finding added; sync primitive required in deep-plan |
| CH-C-006 | Home-feel criteria not user-validated | MAJOR | Caveat added to §(a) header; sequence recommendation to validate before Layer 2 |
| CH-C-007 | Refuted claims remain in MVP scope | MAJOR | Layer 0 reduced to 2 items (from 3); both refuted bugs removed from active scope |
| CH-C-008 | Hook enforcement wrong for exploratory phase | MAJOR | Advisory vs mandatory enforcement distinction added; runAnalyze deferred |
| CH-C-009 | Session-end v0 estimate undercounts deps | MINOR | Estimate revised 45 min → 2-3h throughout |
| CH-C-010 | Memory portability fix is session-local | MINOR | Caveat added to Criterion 6; canonical-memory decision deferred to deep-plan |

### OTB Challenges Summary (8 challenges, 3 HIGH + 4 MEDIUM + 1 LOW novelty)

| ID | Challenge | Novelty | Action |
|---|---|---|---|
| CH-O-001 | AgentSkills open standard | HIGH | Added to Unconsidered Approaches; feasibility spike recommended |
| CH-O-002 | Dotfile tools (chezmoi/YADM) | HIGH | Added to Unconsidered Approaches |
| CH-O-003 | Workflow chain as product | HIGH | Added as Strategic Open Question SQ-2 |
| CH-O-004 | Emergent MVP | MEDIUM | Adopted as sequencing principle for Layers 3-4; not replaced Layers 0-1 |
| CH-O-005 | git subtree sync | MEDIUM | Noted for Direction F future consideration |
| CH-O-006 | PROACTIVELY clauses | MEDIUM | Adopted — Layer 0, highest-leverage single action |
| CH-O-007 | Canonical-memory as primitive | MEDIUM | Deferred to deep-plan pending SoNash divergence investigation |
| CH-O-008 | Stub /todo vs full port | LOW | Adopted — stub recommended first |

### Unresolved Limitations

1. **Stack decision (CLAUDE.md §1-3 TBD)** remains the single largest blocker to confident porting decisions. Many portability classifications may be incorrect once stack is chosen.
2. **AgentSkills compatibility** unknown. If SKILL.md is incompatible with the open standard, every porting decision is potentially revisable.
3. **Subjective home feel not user-validated.** Home-feel criteria are structurally derived; actual Jason preferences not tested.
4. **sanitize-error.cjs refutation:** Both refuted bugs (C-015, C-037) understated JASON-OS correctness. Structural pressure of gap-analysis framing ("what does SoNash have that JASON-OS lacks?") may have produced other overstatements not caught by verification. A follow-on "confirm what works" pass is warranted before deep-plan scoping.

---

## Contradictions and Open Questions

### Contradictions Found

| ID | Contradiction | Resolution |
|---|---|---|
| CON-1 | `hasDebtCandidates` location in `metadata.json`: REFERENCE.md places it only in `consumerHints`; actual metadata.json files place it both at top-level and in `consumerHints` | Write both locations. Top-level for easy parsing; consumerHints for spec compliance. [D3b-5] |
| CON-2 | `pr-retro` BOOTSTRAP_DEFERRED.md says "routing table doesn't function without pr-ecosystem-audit." Actual SKILL.md shows pr-ecosystem-audit appears only in routing header, not in any step. | pr-ecosystem-audit is a routing alternative, not a called dependency. The 9-step pipeline runs independently. Deferred status still appropriate due to 30 sanitization hits, but functional dependency is weaker than implied. [D3d-5] |
| CON-3 | `pr-retro` TDMS: verification criteria requires TDMS entries; REFERENCE.md says "DEBT is NOT an option unless user explicitly requests it" | TDMS is user-gated in practice. 71 retros.jsonl entries show many full-completeness retros with zero DEBT entries. The verification criteria overstates the requirement. [D3d contradictions] |
| CON-4 | SoNash HOOKS.md (last updated 2026-02-23) omits the Notification hook, GSD hooks, and full post-write-validator check list. | `settings.json` is the authoritative source. HOOKS.md is incomplete relative to actual wiring. [D2a contradictions] |
| CON-5 | JASON-OS `settings.json` includes MCP allow rules for servers that don't exist in JASON-OS (no `.mcp.json`, no installed plugins) | Allow rules are harmless dead weight until servers are registered. Not a functional failure. [D2b contradictions] |

### Open Questions

1. **What is JASON-OS's Node.js version convention?** The hooks call `node` directly (no fnm wrapper). Without `.nvmrc`, a new environment could use the wrong version silently.
2. **Will JASON-OS adopt the `SESSION_CONTEXT.md` convention or use a different name?** The format contract between `session-end` (writer) and `session-begin` (reader) must be established before either skill can fully function.
3. **Should `canonical-memory/` be version-controlled in JASON-OS?** SoNash version-controls memory in `.claude/canonical-memory/`. JASON-OS uses only the user-local memory location. For a "portable OS," this is a deliberate architecture decision that has not yet been made.
4. **What is the JASON-OS stack?** CLAUDE.md §1-3 are TBD stubs. Many portability decisions (Node.js scripts, test runner patterns, code-reviewer content) depend on this.
5. **Is extract-from-SoNash the right strategy?** See Strategic Open Question SQ-1.
6. **Is AgentSkills compatible with SKILL.md?** 2-hour feasibility spike recommended before deep-plan finalizes skill-authoring conventions.
7. **What does subjective home feel actually require for Jason?** Structurally-derived criteria may not match actual preferences.

---

## (e) Confidence Summary

| Category | Confidence | Note |
|---|---|---|
| SoNash hook inventory and wiring | HIGH | Direct filesystem reads of settings.json and hook source files |
| JASON-OS hook gaps | HIGH | Direct filesystem inspection confirms absence |
| Skills portability classification | MEDIUM | Grep-based reference counting (syntactic) — may miss semantic coupling (CH-C-001) |
| session-end portability analysis | HIGH | Full SKILL.md read + script inspection |
| Memory system behavior | MEDIUM | Filesystem + official docs + prior research. Auto-injection mechanism UNVERIFIABLE from filesystem (C-039) |
| /todo broken state | HIGH | SKILL.md mandates script; confirmed absent |
| sanitize-error.cjs path | CONFIRMED WORKING | REFUTED — file exists at correct path. Both hooks functional. |
| settings-guardian CRITICAL_HOOKS | CONFIRMED CORRECT | REFUTED — already trimmed in JASON-OS ported version |
| `hasDebtCandidates` dead-end | HIGH | Confirmed in both SKILL.md and skill directory |
| pr-review and pr-retro scope | HIGH | Full skill reads |
| TDMS portability | HIGH | Script directory + skill reads |
| user-prompt-handler.js portability | MEDIUM (downgraded from HIGH) | runAnalyze() emits directives for agents that don't exist in JASON-OS — requires line-level extraction before wiring (CH-C-004) |
| Home feel criteria (D5) | MEDIUM (downgraded from HIGH) | Structurally derived, not user-validated (CH-C-006) |
| MVP scope sketch (D6) | MEDIUM | Reframed; requires SQ-1 decision before confident scoping |

**Overall confidence: MEDIUM-HIGH.** All primary claims grounded in direct filesystem inspection. Two HIGH-severity findings refuted. Portability confidence for key items (user-prompt-handler.js, home-feel criteria, skills classification) downgraded to MEDIUM based on challenge review.

---

## (f) Open Gaps

1. **`session-start.js` full behavior not audited.** The SessionStart hook in SoNash is 500+ lines. Only the first 80 lines and the settings.json wiring were read. Portability assessment is HIGH confidence for described behaviors but incomplete for potential hidden SoNash deps.

2. **`scripts/lib/safe-fs.js` not verified for SoNash deps.** D3a identifies this as required by `session-end-commit.js`. The file exists in JASON-OS `scripts/lib/` but its contents were not read. This is one of the unresolved dependencies in the 2-3h session-end estimate.

3. **`post-write-validator.js` inner checks not fully audited.** The consolidator has 10 sub-checks; 5-6 are SoNash-specific (Firestore, App Check, React, audit JSONL). The portable subset for a JASON-OS write validator has not been scoped.

4. **JASON-OS stack decision (§1-3 TBD).** All hooks and scripts assume Node.js. If JASON-OS adopts a different scripting convention, the entire script layer is affected. This is a pre-condition for multiple Layer 1 and 2 items.

5. **`user-prompt-handler.js` GSD-specific sub-functions not fully isolated.** The portable subset (guardrails, frustration detection, alerts, session-end nudge, plan complexity detection) has been identified but not line-by-line extracted. `runAnalyze()` requires rewrite before wiring.

6. **SoNash skill versions vs JASON-OS versions not cross-checked.** The 9 ported JASON-OS skills may be earlier versions than current SoNash. No staleness audit was performed.

7. **AgentSkills compatibility not assessed.** No agent tasked with evaluating SKILL.md against the AgentSkills open standard. Must precede skill authoring convention decisions.

8. **SoNash canonical-memory divergence cause not investigated.** 23-file divergence between canonical and auto-memory in SoNash may indicate the pattern is abandoned. Impacts decision to adopt for JASON-OS.

---

## Claim Registry

| ID | Claim | Verification Status | Confidence | Category |
|---|---|---|---|---|
| C-001 | session-begin identical to SoNash v2.0 but SESSION_CONTEXT.md absent | VERIFIED | HIGH | pitfalls |
| C-002 | session-end absent; BOOTSTRAP_DEFERRED records Phase 3 npm dependency | VERIFIED | HIGH | pitfalls |
| C-003 | SoNash has 28 hooks across 7 event types; JASON-OS has 4 hooks across 2 event types (SessionStart + PreToolUse) | PARTIALLY REFUTED (parenthetical "PreToolUse only" was wrong; core gap confirmed) | HIGH | architecture |
| C-004 | SoNash Go statusline writes bridge file; two-hook coordination absent from JASON-OS | VERIFIED | HIGH | architecture |
| C-005 | SoNash has 3-layer compaction defense; JASON-OS has none | VERIFIED | HIGH | architecture |
| C-006 | JASON-OS has 25 feedback entries (SoNash has 37, not 11 as originally stated); 1 project file vs 27 | CONFLICTED (counts corrected) | HIGH | general |
| C-007 | /todo and /checkpoint skills identical; JASON-OS lacks session-start hook for todo count | VERIFIED | HIGH | features |
| C-008 | SoNash has 6 trigger strata; JASON-OS has 2 | VERIFIED | HIGH | architecture |
| C-009 | user-prompt-handler.js ~720 LOC dispatches 6 sub-functions | VERIFIED | MEDIUM (portability downgraded) | features |
| C-010 | SoNash PostToolUse has 10 matchers; cross-hook state loop confirmed | VERIFIED | HIGH | architecture |
| C-011 | loop-detector.js hashes failures, warns after 3 in 20 min; JASON-OS has none | VERIFIED | HIGH | features |
| C-012 | 17 SoNash agents have PROACTIVELY clauses; 0 JASON-OS agents do | VERIFIED | HIGH | architecture |
| C-013 | Workflow chain advisory in JASON-OS; enforced in SoNash via runAnalyze() | VERIFIED | MEDIUM (portability caveat added) | pitfalls |
| C-014 | Both settings.json carry identical deny rules and env vars | VERIFIED | HIGH | architecture |
| C-015 | sanitize-error.cjs path crashes two active hooks | REFUTED — file exists at correct path | — | pitfalls |
| C-016 | SoNash has 29 hook scripts; JASON-OS has 4 wired; 5 highest-value missing identified | VERIFIED | HIGH | features |
| C-017 | SoNash wraps every hook with ensure-fnm.sh; JASON-OS calls node directly | VERIFIED | HIGH | pitfalls |
| C-018 | SoNash statusline has 22 widgets; JASON-OS bash statusline has 5 data points | VERIFIED | HIGH | features |
| C-019 | JASON-OS settings.json MCP allow list references 5 non-existent servers | VERIFIED | HIGH | pitfalls |
| C-020 | No keybindings.json in either repo | VERIFIED | HIGH | general |
| C-021 | SoNash CLAUDE.md has [GATE]/[BEHAVIORAL] annotations; JASON-OS has zero | VERIFIED | HIGH | architecture |
| C-022 | SoNash CLAUDE.md Section 8 has 11 declared docs (not 5); JASON-OS Section 8 is TBD | CONFLICTED (count corrected to 11) | HIGH | architecture |
| C-023 | SoNash 80 skills; JASON-OS 9; 9 already ported | VERIFIED | HIGH | features |
| C-024 | session-end v2.2 has 4 phases; Phase 3 has all SoNash-specific blockers; Phases 1/2/4 portable | VERIFIED | HIGH | features |
| C-025 | user-prompt-handler.js farewell detector is portable pure string regex | VERIFIED | MEDIUM (portability of full handler downgraded) | features |
| C-026 | /todo skill completely non-functional; entire script stack absent | VERIFIED | HIGH | pitfalls |
| C-027 | JASON-OS has no .claude/teams/ directory | VERIFIED | HIGH | pitfalls |
| C-028 | deep-research Phase 5 routes to /add-debt which does not exist | VERIFIED | HIGH | pitfalls |
| C-029 | hasDebtCandidates should be written to both top-level and consumerHints | VERIFIED | HIGH | architecture |
| C-030 | pr-review v4.6 is feedback-processor; core protocol portable; SoNash coupling in tool integrations | VERIFIED | HIGH | features |
| C-031 | pr-retro v4.8 has hard gate (Critical Rule #10); retros.jsonl has 71 records | VERIFIED | HIGH | features |
| C-032 | pr-ecosystem-audit dependency in BOOTSTRAP_DEFERRED.md overstated; pipeline runs independently | VERIFIED | HIGH | pitfalls |
| C-033 | JASON-OS scripts/lib has 7 of ~21 SoNash lib entries; key missing items identified | VERIFIED | HIGH | pitfalls |
| C-034 | AI_WORKFLOW.md (31KB) absent from JASON-OS | VERIFIED | HIGH | pitfalls |
| C-035 | JASON-OS has no .nvmrc; hooks call node directly with no version guarantee | VERIFIED | HIGH | pitfalls |
| C-036 | AutoDream active; JASON-OS inherits from global config | VERIFIED | HIGH | general |
| C-037 | settings-guardian.js CRITICAL_HOOKS false-positive for pre-commit-agent-compliance.js | REFUTED — ported version already trimmed | — | pitfalls |
| C-038 | session-begin Phase 3 health scripts reference npm commands that don't exist in JASON-OS | VERIFIED | HIGH | pitfalls |
| C-039 | Memory system auto-injects MEMORY.md and CLAUDE.md every turn; creates home-feel consistency | UNVERIFIABLE (injection mechanism internal to Claude Code runtime) | MEDIUM (downgraded from HIGH) | architecture |
| C-040 | SoNash CLAUDE.md has prior art scan trigger; JASON-OS has no EXTRACTIONS.md | VERIFIED | HIGH | pitfalls |
| C-041 | pre-commit-fixer referenced in CLAUDE.md §4.9 but does not exist in JASON-OS | VERIFIED | HIGH | pitfalls |
| C-042 | SoNash TDMS: 28 scripts, 8505-item MASTER_DEBT.jsonl, 2 skills | VERIFIED | HIGH | features |
| C-043 | gsd-statusline.js pulls from ~/.claude/todos/; /todo writes to .planning/todos.jsonl — different stores | VERIFIED | HIGH | architecture |
| C-044 | SoNash settings.local.json has ~40 entries; JASON-OS has 1 bootstrap entry | VERIFIED | HIGH | general |
| C-045 | governance-logger.js fully portable, zero SoNash deps; absent from JASON-OS | VERIFIED | HIGH | features |
| C-G1 | AgentSkills open standard (16-tool coverage, Dec 2025) not evaluated; may be compatible with SKILL.md at zero additional cost | NEW (OTB gap) | UNVERIFIED | architecture |
| C-G2 | PROACTIVELY clauses are highest-leverage single porting action — pure text edits to existing agent frontmatter, no hook wiring required, 30-minute cost | NEW (OTB gap) | HIGH | features |

---

## Sources

### Tier 1 — Direct Filesystem Evidence (all T1, HIGH trust)

| S-ID | Path | What It Evidences |
|---|---|---|
| S-001 | `C:/Users/jbell/.local/bin/sonash-v0/.claude/settings.json` | Full SoNash hook wiring (317 lines) |
| S-002 | `C:/Users/jbell/.local/bin/JASON-OS/.claude/settings.json` | JASON-OS current hook wiring (81 lines) |
| S-003 | `C:/Users/jbell/.local/bin/sonash-v0/.claude/hooks/user-prompt-handler.js` | UserPromptSubmit NLP dispatcher (~720 LOC) |
| S-004 | `C:/Users/jbell/.local/bin/sonash-v0/.claude/hooks/pre-compaction-save.js` | PreCompact state snapshot hook |
| S-005 | `C:/Users/jbell/.local/bin/sonash-v0/.claude/hooks/compact-restore.js` | SessionStart compact-resume recovery hook |
| S-006 | `C:/Users/jbell/.local/bin/sonash-v0/.claude/hooks/commit-tracker.js` | PostToolUse commit log |
| S-007 | `C:/Users/jbell/.local/bin/sonash-v0/.claude/hooks/loop-detector.js` | PostToolUseFailure loop guard |
| S-008 | `C:/Users/jbell/.local/bin/sonash-v0/.claude/hooks/governance-logger.js` | CLAUDE.md/settings audit trail |
| S-009 | `C:/Users/jbell/.local/bin/sonash-v0/.claude/hooks/gsd-context-monitor.js` | Context pressure injection via bridge file |
| S-010 | `C:/Users/jbell/.local/bin/sonash-v0/.claude/hooks/gsd-statusline.js` | Statusline bridge file writer |
| S-011 | `C:/Users/jbell/.local/bin/JASON-OS/.claude/statusline-command.sh` | JASON-OS bash statusline |
| S-012 | `C:/Users/jbell/.local/bin/sonash-v0/SESSION_CONTEXT.md` | SoNash session context document (v8.34) |
| S-013 | `C:/Users/jbell/.local/bin/JASON-OS/.planning/jason-os/BOOTSTRAP_DEFERRED.md` | Explicit record of deferral decisions |
| S-014 | `C:/Users/jbell/.local/bin/sonash-v0/.claude/skills/session-end/SKILL.md` | session-end SKILL.md v2.2 |
| S-015 | `C:/Users/jbell/.local/bin/sonash-v0/.claude/skills/session-begin/SKILL.md` | session-begin SKILL.md v2.0 |
| S-016 | `C:/Users/jbell/.local/bin/JASON-OS/.claude/skills/todo/SKILL.md` | todo skill (broken — missing scripts) |
| S-017 | `C:/Users/jbell/.local/bin/sonash-v0/.claude/hooks/pre-commit-agent-compliance.js` | Pre-commit agent gate |
| S-018 | `C:/Users/jbell/.local/bin/sonash-v0/.claude/hooks/track-agent-invocation.js` | PostToolUse agent tracker |
| S-019 | `C:/Users/jbell/.local/bin/sonash-v0/.claude/hooks/post-write-validator.js` | Consolidated write validator (10 checks) |
| S-020 | `C:/Users/jbell/.local/bin/sonash-v0/.claude/hooks/post-read-handler.js` | PostToolUse Read context counter |
| S-021 | `C:/Users/jbell/.local/bin/sonash-v0/.claude/hooks/ensure-fnm.sh` | Node version bootstrapper |
| S-022 | `C:/Users/jbell/.local/bin/sonash-v0/CLAUDE.md` | SoNash CLAUDE.md v6.0 |
| S-023 | `C:/Users/jbell/.local/bin/JASON-OS/CLAUDE.md` | JASON-OS CLAUDE.md v0.1 |
| S-024 | `C:/Users/jbell/.local/bin/sonash-v0/.claude/hooks/settings-guardian.js` | Settings guardian hook |
| S-025 | `C:/Users/jbell/.local/bin/JASON-OS/.claude/hooks/settings-guardian.js` | JASON-OS settings guardian (confirmed working) |
| S-026 | `C:/Users/jbell/.local/bin/JASON-OS/.claude/hooks/large-file-gate.js` | JASON-OS large file gate (confirmed working) |
| S-027 | `C:/Users/jbell/.local/bin/sonash-v0/.claude/skills/add-debt/SKILL.md` | add-debt skill v2.0 |
| S-028 | `C:/Users/jbell/.local/bin/sonash-v0/.claude/skills/debt-runner/SKILL.md` | debt-runner skill v1.1 |
| S-029 | `C:/Users/jbell/.local/bin/sonash-v0/.claude/skills/pr-review/SKILL.md` | pr-review skill v4.6 |
| S-030 | `C:/Users/jbell/.local/bin/sonash-v0/.claude/skills/pr-retro/SKILL.md` | pr-retro skill v4.8 |
| S-031 | `C:/Users/jbell/.local/bin/sonash-v0/.claude/state/retros.jsonl` | 71 PR retro records |
| S-032 | `C:/Users/jbell/.local/bin/sonash-v0/.claude/skills/` (directory listing) | 80 skills inventory |
| S-033 | `C:/Users/jbell/.local/bin/JASON-OS/.claude/skills/` (directory listing) | 9 skills inventory |
| S-034 | `C:/Users/jbell/.local/bin/sonash-v0/.claude/agents/` (directory listing + spot reads) | 58 agents, PROACTIVELY clause inventory |
| S-035 | `C:/Users/jbell/.local/bin/JASON-OS/.claude/agents/` (directory listing) | 8 agents, no PROACTIVELY clauses |
| S-036 | `C:/Users/jbell/.local/bin/sonash-v0/.claude/skills/SKILL_INDEX.md` | Skill catalog v2.6 |
| S-037 | `C:/Users/jbell/.local/bin/sonash-v0/AI_WORKFLOW.md` | Session navigation hub (31KB) |
| S-038 | `C:/Users/jbell/.local/bin/sonash-v0/.claude/COMMAND_REFERENCE.md` | Indexed skills/commands catalog |
| S-039 | `~/.claude/projects/C--Users-jbell--local-bin-JASON-OS/memory/MEMORY.md` | JASON-OS memory index (31 files) |
| S-040 | `C:/Users/jbell/.local/bin/sonash-v0/.claude/canonical-memory/MEMORY.md` | SoNash memory index (77 files) |
| S-041 | `C:/Users/jbell/.local/bin/JASON-OS/.claude/settings.local.json` | JASON-OS local settings (bootstrap artifact) |
| S-042 | `C:/Users/jbell/.local/bin/sonash-v0/.claude/settings.local.json` | SoNash local settings (40-entry policy log) |
| S-043 | `C:/Users/jbell/.local/bin/sonash-v0/scripts/session-end-commit.js` | npm run session:end implementation |
| S-044 | `C:/Users/jbell/.local/bin/sonash-v0/.claude/hooks/lib/` (directory listing) | Shared hook utilities |
| S-045 | `C:/Users/jbell/.local/bin/JASON-OS/scripts/lib/` (directory listing) | JASON-OS lib scripts (7 of ~21 present) |
| S-046 | `C:/Users/jbell/.local/bin/sonash-v0/.claude/teams/` (directory listing + reads) | Two team definitions |
| S-047 | `C:/Users/jbell/.local/bin/sonash-v0/.github/workflows/` (directory listing) | 10 workflows vs JASON-OS 6 |
| S-048 | `C:/Users/jbell/.local/bin/sonash-v0/docs/technical-debt/MASTER_DEBT.jsonl` (head) | TDMS debt store (8,505 items) |
| S-049 | `C:/Users/jbell/.local/bin/sonash-v0/tools/statusline/` (Go binary + config) | SoNash statusline v3 (22 widgets) |
| S-050 | `C:/Users/jbell/.local/bin/sonash-v0/.claude/tool-manifest.json` | 14-tool CLI preference registry |

### Tier 2 — Prior Research and Secondary Sources

| S-ID | Source | What It Evidences |
|---|---|---|
| S-051 | `sonash-v0/.research/multi-layer-memory/RESEARCH_OUTPUT.md` | AutoDream behavior, memory system verification |
| S-052 | https://code.claude.com/docs/en/memory | Official Claude Code memory mechanism |
| S-053 | Dream consolidation prompt (Piebald-AI extracted) | Memory consolidation behavior |
| S-054 | https://agentskills.io/home | AgentSkills open standard home (referenced by CH-O-001) |
| S-055 | https://anthropic.com/engineering/equipping-agents-for-the-real-world-with-agent-skills | Anthropic AgentSkills engineering post (referenced by CH-O-001) |

---

## Methodology

**Research conducted:** 2026-04-15
**Approach:** 12 parallel codebase-profile searcher agents, each assigned a focused sub-question. All agents performed direct filesystem inspection of both `sonash-v0/` and `JASON-OS/` repositories. No web search was used for primary findings. All primary sources are T1 (direct file reads).

**Phase 2.5 verification:** 4 verifier agents (V1a, V1b, V2a, V2b) independently verified all 45 claims. Result: 39 VERIFIED, 2 REFUTED (C-015, C-037), 2 CONFLICTED (C-006, C-022), 1 UNVERIFIABLE (C-039), 1 PARTIAL REFUTATION (C-003 parenthetical).

**Phase 3 challenges:** 1 contrarian agent (10 challenges: 1 CRITICAL, 7 MAJOR, 2 MINOR) and 1 OTB agent (8 challenges: 3 HIGH, 4 MEDIUM, 1 LOW novelty). All 18 challenges addressed in synthesis.

**Agents and sub-questions:**
- D1a (rhythm-spine): Always-on session primitives
- D1b (rhythm-triggers): Conditional hooks and trigger architecture
- D2a (settings/hooks/statusline): Full hook and settings inventory
- D2b (permissions/MCP/keybindings): Permission model, MCP servers, keybinding state
- D2c (CLAUDE.md graph): Reference document ecosystem
- D2d (auto-memory): Memory system mechanics and delta
- D2e (skills-loaded): Skills inventory and portability classification
- D3a (session-end archaeology): Session-end full anatomy and port analysis
- D3b (debt-tracking): TDMS system and hasDebtCandidates dead-end
- D3c (pr-review): PR review machinery and port analysis
- D3d (pr-retro): PR retrospective system and learning loop
- D4 (hidden-gaps diff): Structural gaps not covered by other agents

---

## Changelog

| Version | Date | Changes |
|---|---|---|
| 1.0 | 2026-04-15 | Initial synthesis: 12 D-agents, 45 claims, 53 sources |
| 1.1 | 2026-04-15 | Post-verification + challenge re-synthesis. 2 claims REFUTED (C-015, C-037), 2 CONFLICTED (C-006, C-022), 1 UNVERIFIABLE (C-039). Portability confidence downgraded on C-009/C-013/C-025 (MEDIUM). Layer 0 reduced 3→2 items. MVP scope reframed into 3 categories. 2 Strategic Open Questions added (SQ-1 CH-C-001, SQ-2 CH-O-003). Unconsidered Approaches section added (CH-O-001, CH-O-002, CH-O-006, CH-O-008). Maintenance trap finding added (CH-C-005). Session-end estimate revised 45min→2-3h. 10 contrarian + 8 OTB challenges fully resolved. 2 new gap claims added (C-G1, C-G2). 2 new sources added (S-054, S-055). |
