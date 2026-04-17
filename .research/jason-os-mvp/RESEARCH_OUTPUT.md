# JASON-OS MVP Research Output

**Re-synthesized:** 2026-04-15 post-gap-pursuit (Phase 3.97). See changelog at bottom.

**Date:** 2026-04-15
**Version:** 1.2
**Session:** 1
**Topic:** JASON-OS MVP
**Depth:** L1
**Agent count:** 26 (12 D-agents + 4 V-agents + 1 contrarian + 1 OTB + 6 G-agents + 2 GV-agents)
**Reframed question:** What spine + organs make SoNash feel like home, and what is the smallest JASON-OS delta that replicates that feel?

---

## Phase 3.95-3.97 Updates (Gap Pursuit + Verification)

*Added in v1.2. Summarizes what changed from v1.1. Read this section first if you have already read v1.1.*

**Critical corrections (MUST incorporate into all downstream planning):**

- **git-utils.js is ABSENT from JASON-OS — G4 was wrong (HIGH severity).** G4 Item G5 claimed `git-utils.js` is "already present in JASON-OS/.claude/hooks/lib/". It is not. Filesystem confirms only `symlink-guard.js` in that directory. G1 and G3 were correct all along: git-utils.js is a REQUIRED prerequisite that must be copied from SoNash before any compaction-defense or pre-commit-compliance work. This changes the pre-commit-agent-compliance.js port plan: 3 dependencies, 1 present (sanitize-error.cjs), 1 absent but needed (git-utils.js), 1 already present (symlink-guard.js). Failure to copy git-utils.js causes silent exit (not a crash) — zero operator feedback.

- **post-write-validator.js has 13 active named validators, not 10** (GV2 CONTRA-2). G3 read the full 1205-LOC file and produced the authoritative count. D1b/D2a undercounted because they acknowledged incomplete reads. Split: 5 generic validators keep, 7 SoNash-specific remove, 1 already removed. Generic core ~350 LOC (not estimated from the 10-check figure).

- **loop-detector.js wires to PostToolUseFailure, not PostToolUse** (GV1 V5). G3 is correct. JASON-OS `settings.json` needs a new `PostToolUseFailure` section added — not just a new matcher in the existing PostToolUse block. Note: G3's serendipity note that "D1b listed it under PostToolUse" is incorrect — D1b had it right. Retain the wiring implication, drop the misattribution.

- **/todo full port estimate revised to 1.5h, not 3-4h** (G2, GV2). The hard dependencies (safe-fs.js, sanitize-error.js, parse-jsonl-line.js) are already present in JASON-OS. Only 3 scripts remain to copy (todos-cli.js, render-todos.js, todos-mutations.js). CH-O-008's 3-4h assumed missing hard deps. Stub estimate (30 min) unchanged. Both paths are now close enough to do in one sitting once stack is decided.

- **C-G1 AgentSkills claim RESOLVED to HIGH confidence** (G6, GV1 V10). Standard confirmed at agentskills.io/specification. Two required fields (`name`, `description`) are already present in all JASON-OS SKILL.md files. Zero breaking changes needed. 30-minute field hygiene pass adds optional `compatibility` and `metadata.version` fields. 14-26 tools adopted within 4 months. GitHub Copilot automatically recognizes `.claude/skills/` already. Confidence: UNVERIFIED → HIGH.

**Key new findings from gap pursuit:**

- **SESSION_CONTEXT.md has a 5-field format contract** the compaction hooks depend on (G1): `Current Session Counter`, `Uncommitted Work`, `Last Updated`, `Quick Status` section, `Next Session Goals` section. Bootstrap stub provided.
- **hooks/lib 4-file copy is a REQUIRED prerequisite** before compaction defense or pre-commit compliance: `git-utils.js`, `state-utils.js`, `sanitize-input.js`, `rotate-state.js`. All four are pure Node.js, zero SoNash coupling, copy as-is.
- **user-prompt-handler.js extraction plan clarified** (G3): 4 sub-functions are copy/paste portable with zero edits (runGuardrails, runFrustrationDetection, runSessionEnd, runPlanSuggestion). `runAlerts` works if a stub `pending-alerts.json` is created. `runAnalyze` needs a stub or 2-3h parameterization. Phase A extraction (<1h) unblocks 5 of 6 sub-functions immediately.
- **GATE/BEHAVIORAL annotation table produced** (G4): 14 of 16 CLAUDE.md guardrails are `[BEHAVIORAL: honor-only]`. Only §4.7 (push guard) is fully gated. §4.14 (settings guardian) is `[MIXED]`. Adding these labels is a ~30-min mechanical edit that makes the document honest.
- **All 8 JASON-OS agent PROACTIVELY clauses drafted** (G4): ready-to-paste text for each of the 8 agents. Total edit time: 15-20 minutes.
- **Navigation documents require JASON-OS-tailored rewrites, not copies** (G5): AI_WORKFLOW.md is ~60% SoNash-specific; all 4 nav docs need fresh content at ~320 lines combined. JASON-OS-tailored versions estimated at 3-4h.
- **Memory portability architecture confirmed** (G2): JASON-OS canonical-memory (11 files, commit 1d7fc0c) and global memory are currently identical — perfect sync at session 1. SoNash sync is manual `cp`, no automation. Option C (canonical-first with explicit promotion) is correct for JASON-OS.
- **`write-invocation.ts` coupling in all ported skills** (G2): Every skill that has an "Invocation Tracking" section calls `npx tsx write-invocation.ts` — a SoNash analytics script not portable to JASON-OS. This section should be removed from all 9 ported skills.

---

## Executive Summary

SoNash feels like home because it has three interlocking properties that JASON-OS currently lacks in large measure: session continuity (every session starts and ends with a structured ritual that preserves state across compaction and time), ambient intelligence (hooks fire on every prompt, every write, every failure, providing a layer of behavioral enforcement and awareness that operates below the operator's attention), and knowledge accumulation (a reference graph, memory system, skill index, and session context document that together mean Claude never starts from zero).

JASON-OS has transplanted the behavioral skeleton of SoNash — the 16 guardrail rules, the four permission deny rules, the core planning skills (brainstorm, deep-plan, deep-research, checkpoint, todo), and the memory system structure — but has not yet wired the nervous system that makes those bones move. Out of SoNash's 28 hook scripts, JASON-OS has 4 active (across 2 event types: SessionStart and PreToolUse). Out of 80 skills, JASON-OS has 9. The gap is not in declared intent; it is in operating wiring.

**Post-verification corrections:** Two initially HIGH-severity bugs were refuted. `scripts/lib/sanitize-error.cjs` EXISTS at the correct path in JASON-OS (C-015 REFUTED). JASON-OS `settings-guardian.js` CRITICAL_HOOKS was already trimmed to only `block-push-to-main.js` and `settings-guardian.js` — the false-positive guard condition does not exist (C-037 REFUTED). This reduces Layer 0 from 3 items to 2. Challenges raised one CRITICAL strategic question that deep-plan must resolve before scoping work.

The MVP question is not "what should JASON-OS eventually become" but "what is the minimum set of changes that makes working in JASON-OS feel like working in SoNash." The answer has three layers. Layer 0 (immediate repairs, updated): fix 2 remaining broken things (not 3), plus new zero-cost Layer 0+ items from gap pursuit. Layer 1 (session rhythm): port `session-end` v0, create `SESSION_CONTEXT.md`, wire compaction defense — but FIRST copy the 4 prerequisite hooks/lib files. Layer 2 (ambient intelligence): add PROACTIVELY clauses to existing agents (15-20 min, zero infra — highest-leverage single action), then selectively wire hooks. One CRITICAL strategic question is unresolved and must be named in deep-plan: whether to extract-from-SoNash or design-from-scratch.

---

## Strategic Open Questions

*Raised by CH-C-001 (CRITICAL) and CH-O-003 (HIGH novelty). These are decisions for deep-plan, not conclusions from research.*

### SQ-1: Extract-from-SoNash vs. Design-from-Scratch (CRITICAL — CH-C-001)

The synthesis frames JASON-OS as "SoNash minus app coupling." This is an assumed direction, not a named decision. The contrarian challenge frames it clearly: JASON-OS is stack-TBD (CLAUDE.md §1-3 blank). SoNash's patterns — cross-hook state loop, agent tracking, pre-commit compliance — presuppose 17 defined agents with PROACTIVELY clauses and a settled TypeScript/Node workflow. JASON-OS has 0 matching agents and no settled stack. Extracting evolved patterns from session #281 into a session #1 context risks "SoNash-in-a-trench-coat" — semantically coupled artifacts inside syntactically scrubbed files.

**Decision required in deep-plan:** Is extract-from-SoNash the right strategy, or should JASON-OS be designed from scratch using SoNash as one reference? This is not assumed direction — it is an open strategic question with material consequences for every porting decision in the scope.

**Gap pursuit update (G5):** The navigation document finding reinforces this question. AI_WORKFLOW.md at ~60% SoNash-specific content confirms that even "infrastructure" documents need JASON-OS-tailored rewrites. The extract path is viable but requires systematic sanitization, not copy-and-configure.

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

**Smallest delta:** Create `SESSION_CONTEXT.md` at repo root with the five required fields (Current Session Counter, Uncommitted Work, Last Updated, Quick Status section, Next Session Goals section). Port `session-end` v0 (strip Phase 3 SoNash scripts, inline the commit step, copy session-end-commit.js which has zero SoNash deps). Estimated effort per D3a and G1: ~2-3 hours including dependency resolution. See CH-C-009 and G1 for full dependency graph and bootstrap stub format.

### Criterion 2: Compaction Does Not Mean Amnesia

SoNash runs a 3-layer compaction defense. Layer A (`commit-tracker.js`) logs every git commit so `session-begin` can detect gap sessions. Layer B (`pre-compaction-save.js`) fires immediately before compaction and writes a comprehensive `handoff.json` snapshot. Layer C (`compact-restore.js`) fires on compact-resume and reads that snapshot back into context. The combined effect is that after compaction, the AI picks up within one or two turns with full task context. [D1a-5, D1b-7, D1b-8]

JASON-OS has only the `checkpoint` skill (manual Layer B equivalent). There is no automatic pre-compaction save, no compact-restore on resume, no commit log. Compaction means starting over unless the operator remembered to run `/checkpoint`. [D1a-5]

**Smallest delta:** FIRST copy 4 hooks/lib files from SoNash (git-utils.js, state-utils.js, sanitize-input.js, rotate-state.js) — all pure Node.js, zero SoNash coupling, copy as-is. Without git-utils.js, pre-compaction-save.js exits silently at line 39 with no handoff.json written. Then wire `pre-compaction-save.js` (PreCompact event), `compact-restore.js` (SessionStart compact matcher), and `commit-tracker.js` (PostToolUse Bash commit). [G1, G2]

**Caveat (CH-C-003, confirmed by G1):** Compaction defense is structurally wired at Layer 1, but operationally effective ONLY after the first full session with session-end completing. At session #1, pre-compaction-save produces a valid-but-sparse handoff containing only live git state. All other fields (session counter, task states, agent summary, commit log) are empty/null. The mechanism is functional; operational value accrues after the first session-end run. Do not represent "Compaction Does Not Mean Amnesia" as an MVP-delivered property.

### Criterion 3: Every Prompt Is an Opportunity

SoNash's `user-prompt-handler.js` fires on every user message and dispatches six sub-functions: guardrails injection, frustration detection, alerts reminder, skill/agent directive emission, session-end nudge, and multi-step complexity detection. The effect is that the system is proactive on every turn — it surfaces unacknowledged alerts, suggests the right skill before Claude responds, and catches the operator saying "that's all" to remind them to close the session properly. [D1b-2, D1a-9]

This is the mechanism that turns the CLAUDE.md PRE-TASK trigger table from advisory to enforced: `runAnalyze()` emits mandatory `PRE-TASK: MUST use [skill]` directives as stdout context Claude reads before responding. Without this hook, the trigger table is consulted only if Claude remembers to check. [D1b-2]

JASON-OS has no UserPromptSubmit hook. [D1a-9, D1b-1]

**G3 extraction update:** The hook is 718 LOC with 6 sub-functions. Four are fully portable with zero edits: `runGuardrails` (11 LOC), `runFrustrationDetection` (44 LOC), `runSessionEnd` (75 LOC, needs only a `.session-end-cooldown.json` auto-created state file), `runPlanSuggestion` (123 LOC, needs `.multistep-dedup.json` auto-created). `runAlerts` (98 LOC) works if a stub `pending-alerts.json` is created. `runAnalyze` (295 LOC) requires a 2-3h parameterization (config-driven dispatch table) or can be stubbed in 5 LOC. The single shared dependency `symlink-guard.js` already exists in JASON-OS. Phase A extraction (<1h) wires 5 of 6 sub-functions.

**Caveat (CH-C-004):** Portability confidence for `user-prompt-handler.js` as a whole is MEDIUM. `runAnalyze()` emits mandatory directives for agents (code-reviewer, security-auditor, database-architect, frontend-design, Plan, Explore, test-engineer) that do not exist in JASON-OS — requires line-level extraction before wiring. Wiring as-is emits mandatory directives for nonexistent agents, which is worse than no enforcement.

**Caveat (CH-C-008):** During the exploratory JASON-OS phase (stack-TBD, sessions #1-#10), advisory CLAUDE.md rules may be more appropriate than mandatory hook enforcement. Port `runGuardrails`, `runFrustrationDetection`, `runSessionEnd`, `runPlanSuggestion` first. Stub `runAnalyze()`. Parameterize it (2-3h) once workflow agents exist.

**Smallest delta (revised by G3):** Phase A extraction: copy hook, stub `runAnalyze()`, create `pending-alerts.json`, wire UserPromptSubmit. Total <1h. This is a meaningful improvement over the "meaningful rewrite" framing in v1.1 — the actual extraction is simpler than anticipated.

### Criterion 4: The System Watches Itself

SoNash's PostToolUse hooks create a web of tripwires: `governance-logger.js` audits every CLAUDE.md/settings.json change, `loop-detector.js` hashes build failures and warns after three identical ones, `track-agent-invocation.js` logs every agent call and feeds the pre-commit compliance gate. The system enforces its own rules without requiring the operator to remember to check. [D1a-10, D1b-3, D1b-5]

JASON-OS has zero PostToolUse hooks, and zero PostToolUseFailure hooks. [D2a-9]

**Smallest delta for self-watch:** Add `loop-detector.js` (PostToolUseFailure — note: requires a new `PostToolUseFailure` section in settings.json, NOT a new matcher in PostToolUse) and `governance-logger.js` (PostToolUse Write/Edit on CLAUDE.md and settings.json). Both are fully portable: loop-detector requires zero edits; governance-logger requires copying rotate-state.js from hooks/lib and optionally stubbing append-hook-warning.js. Total: ~1h for both.

### Criterion 5: Claude Knows What's Available

SoNash provides the AI with a structured catalog of what exists: `COMMAND_REFERENCE.md` (indexed skills), `AI_WORKFLOW.md` (session navigation), `SKILL_INDEX.md` (skill catalog), and `SESSION_CONTEXT.md` (current state). The AI navigates by consulting documents, not by guessing or filesystem enumeration. The `.research/EXTRACTIONS.md` lookup ensures prior art is checked before building anything new. [D4-5, D4-6, D2c-3]

JASON-OS has none of these navigation documents. The AI must enumerate the `.claude/skills/` directory to know what skills exist. [D2c-6, D4-5]

**G5 update:** All four SoNash navigation documents require JASON-OS-tailored rewrites, not copies. AI_WORKFLOW.md is ~60% SoNash-specific (879 lines); a JASON-OS version starts at ~150 lines encoding the brainstorm → deep-research → deep-plan → execute process. COMMAND_REFERENCE.md, SKILL_INDEX.md, and HOOKS.md each need ~50-60 line JASON-OS versions. Combined ~320 lines, 3-4h total. The Navigation Map section ("I need to know about...") in AI_WORKFLOW.md is the highest-value single addition. EXTRACTIONS.md has near-zero value at 1 session; seed manually at session #3. The CLAUDE.md §7 trigger referencing EXTRACTIONS.md is a dead reference that should be annotated until the file exists.

**Smallest delta:** Create a minimal `AI_WORKFLOW.md` stub at the repo root (150 lines, encoding PROCESS with Navigation Map section — see SQ-2). Port `.claude/COMMAND_REFERENCE.md` (JASON-OS-tailored, ~50 lines). Add `SKILL_INDEX.md` to `.claude/skills/` with portability_status, source_version, and last_synced columns (not just descriptions — addresses maintenance trap). Include version + last-synced dates in SKILL_INDEX.md to address the maintenance trap (CH-C-005).

### Criterion 6: Memory Knows What Jason Is Working On

JASON-OS's memory index is richer than SoNash's in feedback entries (25 vs 37), meaning the system already knows HOW to work with Jason. But JASON-OS has almost no project memory — 1 project file vs 27 in SoNash. The result is that every new session knows behavioral rules but not what Jason is actually building. [D1a-7, D2d-8]

**Note on memory counts (C-006, CONFLICTED):** SoNash has 37 feedback entries (not 11 as originally stated — a 3x undercount). JASON-OS has 25 feedback entries (correct). The behavioral insight holds: JASON-OS knows HOW to work but not WHAT it is working on.

**G2 update:** JASON-OS canonical-memory (11 files, commit 1d7fc0c) and global memory are currently identical — perfect sync at session 1. SoNash's sync is manual `cp` with no hook or automation. Option C (canonical-first with explicit promotion) is the correct architecture: keep canonical-memory as the bootstrap kit (already done), document the `cp` onboarding step, and consider a future `/session-end` step for promotion. The bidirectional sync option has security risks and is over-engineered at current scale. Note: every ported skill's "Invocation Tracking" section calls `write-invocation.ts` (SoNash-specific) and should be removed from all 9 skills.

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
| `user-prompt-handler.js` | UserPromptSubmit | Guardrails, alerts, skill directives, frustration detection, farewell nudge | ~718 LOC, 6 sub-functions | ABSENT |
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

**Layer 0+ — Newly Surfaced Zero-to-Low-Cost Wins (from gap pursuit, do these first):**

0a. **PROACTIVELY clauses on all 8 agents** (G4). Draft clauses ready to paste. 15-20 minutes. Zero infra. Pure text edits. All 8 agents covered.

0b. **`.nvmrc` one-line file** (G5 Item G20). Create at repo root with content `22`. One-line fix. No downside. Prevents Node version ambiguity as hook scripts grow.

0c. **Remove `write-invocation.ts` Invocation Tracking sections from 9 ported skills** (G2). Each calls `npx tsx write-invocation.ts` — a SoNash-specific analytics script. Will produce errors if the section runs. Remove from all 9 skills. ~20 minutes.

0d. **GATE/BEHAVIORAL annotations to CLAUDE.md §4** (G4 Item G12). 16-row table produced. ~30 min mechanical edit. Makes behavioral-only rules honest. 14 of 16 are `[BEHAVIORAL: honor-only]`.

0e. **AgentSkills field hygiene on 9 skills** (G6). Add `compatibility` and `metadata.version` fields. 30 minutes. Unlocks native cross-tool install story.

**Layer 0 — Immediate Repairs (nothing works correctly until these are fixed):**

1. ~~Fix `scripts/lib/sanitize-error.cjs` missing path~~ — REFUTED. File exists at correct path. Hooks are working. [C-015 REFUTED by V1b]
2. Port `/todo` skill. **Stub path (30 min):** Rewrite SKILL.md to declare v0-stub writing to `.planning/TODOS.md` (markdown, no CLI). Must include explicit rule override for Critical Rule 6 and upgrade trigger declaration. **Full port path (~1.5h, revised down from 3-4h by G2):** Copy todos-cli.js, render-todos.js, todos-mutations.js (hard deps safe-fs.js, sanitize-error.js, parse-jsonl-line.js already present). Remove invocation tracking section. Both paths viable; stub recommended until stack confirmed as Node.js.
3. **Create minimal `/add-debt` stub** (G5 Item G7): 60-line SKILL.md writing markdown rows to `.planning/DEBT_LOG.md`. Preserves Phase 5 signal. 30-45 min. Alternative: just remove the `hasDebtCandidates` routing from deep-research Phase 5, but this loses useful signal.

**Layer 1 — Session Rhythm (feel of bounded, continuous sessions):**

PREREQUISITE (must do before any Layer 1 items): Copy `hooks/lib/git-utils.js`, `hooks/lib/state-utils.js`, `hooks/lib/sanitize-input.js`, `hooks/lib/rotate-state.js` from SoNash to JASON-OS `.claude/hooks/lib/`. All four are pure Node.js, zero SoNash coupling. Without git-utils.js, pre-compaction-save exits silently with no output.

4. Create `SESSION_CONTEXT.md` at repo root (5 required fields — see bootstrap stub in G1)
5. Port `session-end` v0: strip Phase 3 entirely, inline or port session-end-commit.js (zero SoNash deps), adapt Step 3 to `.planning/jason-os/PLAN.md`. **Estimate: 2-3h** (confirmed by G1).
6. Wire `pre-compaction-save.js` + `compact-restore.js` (PreCompact + SessionStart compact). Effective only after state exists; see Criterion 2 caveat.
7. Wire `commit-tracker.js` (PostToolUse Bash commit) — self-bootstrapping, can be wired immediately.

**Layer 2 — Ambient Intelligence (every prompt and every failure watched):**

8. Wire `user-prompt-handler.js` Phase A extraction (UserPromptSubmit): stub `runAnalyze()`, create `pending-alerts.json`, copy 4 portable sub-functions, wire. <1h (revised from "meaningful rewrite" by G3).
9. Wire `post-read-handler.js` (PostToolUse Read) — prerequisite for `runAlerts()` MCP-save path to activate. Copy `git-utils.js` first (already in prerequisite step above).
10. Wire `loop-detector.js` (PostToolUseFailure) — add new `PostToolUseFailure` section to settings.json. Fully portable, zero edits.
11. Wire `governance-logger.js` (PostToolUse Write/Edit CLAUDE.md) — copy rotate-state.js from hooks/lib (already in prerequisite), optionally stub append-hook-warning.js. ~30 min.

**Layer 3 — Navigation Documents:**

12. Create JASON-OS-tailored `AI_WORKFLOW.md` (~150 lines, encode orchestration process + Navigation Map pointer table — see G5 outline)
13. Create JASON-OS-tailored `.claude/COMMAND_REFERENCE.md` (~50 lines, 9 skills initially)
14. Create `.claude/skills/SKILL_INDEX.md` with `portability_status`, `source_version`, `last_synced` columns (addresses CH-C-005 maintenance trap — see G2 schema)
15. Create `.claude/HOOKS.md` documenting the 4 currently wired hooks + planned hooks

**Layer 4 — Quality Skills (enables feedback loops):**

16. Port `pre-commit-fixer` (~70% portable, ~130-line JASON-OS version, 30-40 min — see G5 Item G18 outline)
17. Port `systematic-debugging` (Value: 9/10, portable) — core cognitive discipline
18. Port `validate-claude-folder` (Value: 8/10, portable) — prevents config rot
19. Port `research-plan-team.md` (.claude/teams/) — 20-30 min adapt from SoNash; may be needed in next session if deep-plan follows research in same session

---

## (c) Critical Findings — Latent Bugs, Dead-Ends, Missing Enforcement

### ~~Bug 1: `sanitize-error.cjs` path is broken in two active hooks [REFUTED — NOT A BUG]~~

**REFUTED by V1b (C-015).** `scripts/lib/sanitize-error.cjs` EXISTS at the correct path in JASON-OS. Both `settings-guardian.js` and `large-file-gate.js` are functioning. The path resolution from `.claude/hooks/` via `../..` to `JASON-OS/scripts/lib/sanitize-error.cjs` is correct and the file is present. This item has been removed from Layer 0. The executive summary reference has been corrected.

### Bug 2: `/todo` skill is completely non-functional [SEVERITY: HIGH — REVISED ESTIMATE]

The ported todo skill mandates invocation of `scripts/planning/todos-cli.js` for every mutation. This script does not exist in JASON-OS. Neither does `render-todos.js`, `todos-mutations.js`, or `.planning/todos.jsonl`. The skill will fail on first use. This is the skill listed in CLAUDE.md §7 as the cross-session tracking primitive, and it appears in session-begin's health check. [D4-1, D1a-8]

**Revised estimate (G2):** Full port is ~1.5h (not 3-4h). Hard dependencies (safe-fs.js, sanitize-error.js, parse-jsonl-line.js) already present. Only 3 scripts remain. The invocation tracking section (`write-invocation.ts` call) must be removed from SKILL.md. No programmatic caller of /todo currently exists in JASON-OS — the skill is manual-invocation only. Stub path remains 30 min and is still recommended until stack is confirmed.

### Bug 3: `deep-research` Phase 5 routes to a nonexistent skill [SEVERITY: MEDIUM — REVISED FIX]

The `deep-research` skill shows a `hasDebtCandidates` menu item in Phase 5 that routes to `/add-debt`. `/add-debt` does not exist in JASON-OS. The routing will trigger a skill-not-found error. [D3b-5]

**Revised fix (G5):** Rather than removing the routing (which loses useful signal), create a minimal stub `/add-debt` skill (~60 lines, writes to `.planning/DEBT_LOG.md`). The Phase 5 routing continues to work. The stub and the pre-commit-fixer stub are coupled — port together (30-45 min each).

### ~~Bug 4: `settings-guardian.js` references a hook that is not wired [REFUTED — NOT A BUG]~~

**REFUTED by V2b (C-037).** JASON-OS's `settings-guardian.js` CRITICAL_HOOKS array contains only `"block-push-to-main.js"` and `"settings-guardian.js"`. `pre-commit-agent-compliance.js` is NOT in the ported CRITICAL_HOOKS list — the ported version was already cleaned up. This false-positive guard condition does not exist in JASON-OS. Item removed from debt tracking.

### Dead-End 1: Workflow chain is advisory, not enforced [SEVERITY: MEDIUM — NUANCED]

The `brainstorm → deep-research → deep-plan → execute` workflow chain is stated in CLAUDE.md and in user memory (`feedback_workflow_chain.md`) but has no hook enforcement in JASON-OS. In SoNash, `user-prompt-handler.js` `runAnalyze()` emits mandatory `PRE-TASK: MUST use [skill]` directives when trigger keywords appear. Without this, the chain is an advisory convention Claude can (and will) skip under context pressure. [D1b-11]

**Nuance (CH-C-008, G3 update):** During the exploratory phase (JASON-OS sessions #1-#10, stack TBD), advisory enforcement may be correct. The `runAnalyze()` dispatch table is already parameterizable — the pattern is to externalize it to `analyze-directives.json` (a JASON-OS config file). Default to `advisory` mode (stderr hints only) during sessions 1-10; flip to `mandatory` once workflow is stable. This addresses the enforcement-vs-exploratory tension without preventing the hook from being wired.

### Dead-End 2: Agent PROACTIVELY clauses are absent from all JASON-OS agents [SEVERITY: MEDIUM — RESOLVED BY G4]

JASON-OS's 8 agents (all deep-research team) have no PROACTIVELY clauses in their frontmatter. In SoNash, 17 agents use PROACTIVELY conditions to self-dispatch when their expertise matches the task. Without these clauses, JASON-OS agents will never self-dispatch — they must always be explicitly invoked. [D1b-6]

**G4 resolution:** All 8 draft clauses are ready-to-paste (see Layer 0+ item 0a above). 15-20 minutes. This dead-end is resolved at Layer 0+, not Layer 2.

### Dead-End 3: `session-begin` health scripts reference tools that don't exist [SEVERITY: LOW]

The session-begin SKILL.md (identical between SoNash and JASON-OS) references scripts like `npm run patterns:check`, `npm run session:gaps`, and `npm run hooks:health` in its Phase 3 health check step. None of these npm scripts exist in JASON-OS. Session-begin will either fail noisily on these steps or skip them. The core ritual (context loading, goal selection) is unaffected, but the health check phase produces errors. [D1a finding on partial functionality]

### Missing Enforcement: CLAUDE.md has no `[GATE]` or `[BEHAVIORAL]` annotations [SEVERITY: LOW — G4 PRODUCED TABLE]

SoNash's CLAUDE.md tags every rule with `[GATE: mechanism]` or `[BEHAVIORAL: method]` to signal to Claude which rules have automated enforcement and which rely on AI self-compliance. JASON-OS CLAUDE.md v0.1 has no enforcement annotations. Every rule implicitly reads as behavioral-only even when hooks exist.

**G4 update:** The complete 16-row annotation table is now available (see Layer 0+ item 0d). Summary: 1 rule `[GATE]` (§4.7 push guard), 1 rule `[MIXED]` (§4.14 settings guardian), 14 rules `[BEHAVIORAL: honor-only]`. With 14 of 16 guardrails honor-only, the CLAUDE.md §4 caution block ("Non-negotiable") creates false expectations — adding the annotations makes the document honest and may paradoxically improve compliance.

### Maintenance Trap: 32 Portable Skills With No Sync Primitive [SEVERITY: MEDIUM — G2 PROPOSED SOLUTION]

Research identifies ~32 "fully portable" skills from SoNash's 80. No version columns. No last-synced tracking. SoNash is at `SESSION_CONTEXT.md` v8.35 — 280+ sessions of per-skill improvement that JASON-OS's ported copies will not receive. Within 6 months: deep-research in JASON-OS = bootstrap version; SoNash running a significantly improved version.

**G2 proposed solution:** Add `portability_status` (synced/forked/local-only), `source_version`, `source_path`, and `last_synced` frontmatter fields to each ported skill (5 lines × 9 skills = 45 lines, 20 minutes). Create `SKILL_INDEX.md` with version+sync columns (see Layer 3 item 14). All 9 JASON-OS skills are currently at parity with SoNash as of 2026-04-15 — divergence clock starts now. Note: SoNash itself has no skill version-sync mechanism; JASON-OS would have more robust tracking than its source.

---

## (d) MVP Scope — Three Categories

*Reframed from 18-item linear backlog. Source: CH-C-002. "Minimum for home feel ≠ minimum viable product."*

**Important framing:** Jason creates for joy, not shipping. This is not a delivery backlog. It is three distinct decisions about different kinds of work.

### Category 1 — Fixes (must-do regardless, est. ~1-2h total)

These are broken things that produce errors on first use.

1. Stub or port `/todo` skill. Stub path: 30 min (SKILL.md rewrite + `.planning/TODOS.md`). Full port: ~1.5h (revised down). Stack decision gates which path to take.
2. Create minimal `/add-debt` stub writing to `.planning/DEBT_LOG.md` (30-45 min)
3. **[Layer 0+ wins — do alongside fixes]** PROACTIVELY clauses, `.nvmrc`, write-invocation.ts removal, GATE/BEHAVIORAL annotations: ~1.5h total for all four. Zero infra.

### Category 2 — Home Feel Organs (the actual MVP question, est. 7-9h including revised estimates)

These items produce the lived experience of being home.

PREREQUISITE: Copy 4 hooks/lib files first (git-utils, state-utils, sanitize-input, rotate-state). ~15 min copy, ~30 min verify.

4. Create `SESSION_CONTEXT.md` at repo root (bootstrap stub provided in G1)
5. Port `session-end` v0 (2-3h with dependency resolution confirmed by G1)
6. Wire `pre-compaction-save.js` + `compact-restore.js` (mechanism, effective after state exists)
7. Wire `commit-tracker.js` (self-bootstrapping, can start immediately)
8. Wire `user-prompt-handler.js` Phase A extraction (<1h revised by G3): stub `runAnalyze()`, 4 portable sub-functions, wire.

**Recommended sequence:** hooks/lib prerequisite copy → SESSION_CONTEXT.md + session-end v0 first. Run one full session cycle. Validate subjective home feel before committing to remaining Layer 2 items.

### Category 3 — Craft Extensions (as joy permits, no urgency)

These items improve the experience but have zero functional dependency on Categories 1-2.

9. Create JASON-OS-tailored `AI_WORKFLOW.md` (~150 lines, encode process)
10. Create JASON-OS-tailored `.claude/COMMAND_REFERENCE.md` (~50 lines)
11. Create `.claude/skills/SKILL_INDEX.md` with version + last-synced + portability_status columns
12. Create `.claude/HOOKS.md`
13. Port `pre-commit-fixer` skill (~130-line JASON-OS version, 30-40 min)
14. Port `systematic-debugging` skill
15. Port `validate-claude-folder` skill
16. Wire `governance-logger.js`
17. Wire `loop-detector.js`
18. Wire `post-read-handler.js`
19. Port `research-plan-team.md` (.claude/teams/) — 20-30 min, may be needed sooner

**Note:** Layer 3 items (9-12) may be better served by the "workflow chain as product" reframe (SQ-2) than by mechanical porting.

### Not in MVP Scope (confirmed deferrals)

- Full TDMS (`/add-debt` full port, `debt-runner`, 28 scripts) — SoNash-specific infrastructure
- `pr-review`, `pr-retro` skills — need sanitization + agent ports first
- `code-reviewer`, `security-auditor` agents — need stack decisions
- SoNash Go statusline binary — not portable; JASON-OS bash statusline is adequate
- `ci.yml` main build workflow — no build step in JASON-OS yet
- Full audit skill suite (11 skills) — needs sanitization, lower urgency
- `canonical-memory/` architecture — deferred to deep-plan (CH-C-010)
- `runAnalyze()` enforcement in user-prompt-handler.js — deferred until workflow settled (CH-C-008)
- `post-todos-render.js` wiring — conditional on /todo full port (render-todos.js must exist first)
- `track-agent-invocation.js` + `pre-commit-agent-compliance.js` — port as a pair; dormant without code-reviewer/security-auditor agents; port when those agents are added
- EXTRACTIONS.md — seed manually at session #3; scripted CAS is SoNash-specific

---

## Unconsidered Approaches

*Raised by OTB agent. Included for deep-plan awareness — not directives.*

### AgentSkills Open Standard (CH-O-001, HIGH novelty — RESOLVED to adopt)

Anthropic published AgentSkills as an open standard on 2025-12-18. As of 2026-03, supported by 14-26 tools: Claude Code, Cursor, OpenAI Codex, Gemini CLI, GitHub Copilot, VS Code, JetBrains Junie, OpenHands, Goose, Windsurf, Kiro, and others. The standard defines a portable directory format any compliant tool can load. JASON-OS skills are already structurally compliant — both required fields (`name`, `description`) present and valid. Zero breaking changes needed.

**G6 finding: adopt now via 30-min field hygiene pass.** The 2-hour feasibility spike is unnecessary — compatibility is confirmed. GitHub Copilot automatically recognizes `.claude/skills/` already. Adding `compatibility` and `metadata.version` fields to all 9 skills unlocks the install story and community registry. C-G1 confidence upgraded: UNVERIFIED → HIGH.

**Sources:** agentskills.io/specification; github.blog/changelog/2025-12-18-github-copilot-now-supports-agent-skills/

### Dotfile Tools for Portability Sync (CH-O-002, HIGH novelty)

The "portable setup replicating across machines/projects" is the dotfiles problem — solved at industrial scale by chezmoi, YADM, GNU Stow, Dotbot. Research found the template-divergence problem and concluded a custom CLI (Direction F) is the only solution. Dotfile tools ARE that CLI.

Key properties: chezmoi init + apply = zero-infra install story; host-specific overrides via templating; `chezmoi update` solves SoNash → JASON-OS drift without custom tooling; bidirectional with `chezmoi re-add`.

**Blocker to investigate:** Dotfile tools target `~/`, not project-level `.claude/` — path mapping unclear. If chezmoi can target arbitrary dirs, Direction F CLI build effort may be eliminated.

### PROACTIVELY Clauses — Highest-Leverage Single Action (CH-O-006, adopted at Layer 0+)

17 SoNash agents have PROACTIVELY clauses; 0 JASON-OS agents do. Adding them requires NO new scripts, NO hook wiring, NO dependency resolution — pure text edits to existing agent frontmatter files.

**G4 update: all 8 draft clauses ready-to-paste.** 15-20 minutes. Not 30 minutes as originally estimated. Moved from Layer 0 to Layer 0+ (a dedicated pre-layer for zero-cost wins).

**Status: Adopt at Layer 0+.** Minimum: add to all 8 existing deep-research agents. Expand as new agents are added.

### Stub /todo vs Full Port (CH-O-008, revised by G2)

Full port of todos-cli.js + render-todos.js + todos-mutations.js is now ~1.5h (not 3-4h). Hard deps already present. Stub remains 30 min. The gap between stub and full port is narrower than originally estimated — at 1.5h total, doing both in one sitting is sensible once stack is confirmed as Node.js.

---

## Challenges and Limitations

### Contrarian Challenges Summary (10 challenges, 1 CRITICAL + 7 MAJOR + 2 MINOR)

| ID | Challenge | Severity | Resolution in This Synthesis |
|---|---|---|---|
| CH-C-001 | Extract strategy path-dependent for stack-TBD | CRITICAL | Added as Strategic Open Question SQ-1 — named decision for deep-plan |
| CH-C-002 | 18-item MVP is scope inflation | MAJOR | MVP scope reframed into 3 categories; "minimum for home feel ≠ MVP" |
| CH-C-003 | Compaction defense empty-inputs at MVP | MAJOR | Confirmed by G1: at session #1, handoff is valid-but-sparse (git only). Caveat updated. |
| CH-C-004 | user-prompt-handler.js not line-extracted | MAJOR | G3 produced full extraction plan: Phase A (<1h), Phase B (post-read-handler), Phase C (parameterized runAnalyze). |
| CH-C-005 | Maintenance trap unaddressed | MAJOR | G2 proposed solution: portability_status frontmatter + SKILL_INDEX sync columns. All 9 skills at parity now. |
| CH-C-006 | Home-feel criteria not user-validated | MAJOR | Caveat added to §(a) header; sequence recommendation to validate before Layer 2 |
| CH-C-007 | Refuted claims remain in MVP scope | MAJOR | Layer 0 reduced to 2 items (from 3); both refuted bugs removed from active scope |
| CH-C-008 | Hook enforcement wrong for exploratory phase | MAJOR | G3 advisory/mandatory toggle design: ANALYZE_ENFORCEMENT env var, default advisory, flip to mandatory at session ~10. |
| CH-C-009 | Session-end v0 estimate undercounts deps | MINOR | G1 confirmed 2-3h. Full dependency graph available. |
| CH-C-010 | Memory portability fix is session-local | MINOR | G2 confirmed canonical-memory architecture. Caveat preserved; onboarding step documented. |

### OTB Challenges Summary (8 challenges, 3 HIGH + 4 MEDIUM + 1 LOW novelty)

| ID | Challenge | Novelty | Action |
|---|---|---|---|
| CH-O-001 | AgentSkills open standard | HIGH | RESOLVED — adopt via 30-min field hygiene pass. C-G1 upgraded HIGH. |
| CH-O-002 | Dotfile tools (chezmoi/YADM) | HIGH | Added to Unconsidered Approaches |
| CH-O-003 | Workflow chain as product | HIGH | Added as Strategic Open Question SQ-2 |
| CH-O-004 | Emergent MVP | MEDIUM | Adopted as sequencing principle for Layers 3-4; not replaced Layers 0-1 |
| CH-O-005 | git subtree sync | MEDIUM | Noted for Direction F future consideration |
| CH-O-006 | PROACTIVELY clauses | MEDIUM | Adopted — Layer 0+, all 8 draft clauses ready |
| CH-O-007 | Canonical-memory as primitive | MEDIUM | G2 confirmed architecture. Deferred to deep-plan pending promotion workflow design. |
| CH-O-008 | Stub /todo vs full port | LOW | Revised: both options viable, full port now ~1.5h (not 3-4h). |

### Unresolved Limitations

1. **Stack decision (CLAUDE.md §1-3 TBD)** remains the single largest blocker to confident porting decisions. Many portability classifications may be incorrect once stack is chosen.
2. **Subjective home feel not user-validated.** Home-feel criteria are structurally derived; actual Jason preferences not tested.
3. **sanitize-error.cjs refutation:** Both refuted bugs (C-015, C-037) understated JASON-OS correctness. Structural pressure of gap-analysis framing ("what does SoNash have that JASON-OS lacks?") may have produced other overstatements not caught by verification. A follow-on "confirm what works" pass is warranted before deep-plan scoping.
4. **AgentSkills long-term governance undefined.** Stable enough to adopt (14-26 tools, critical mass), but no published version number or changelog cadence. LOW risk given adoption trajectory.

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
| CON-6 | G4 claimed git-utils.js "already present in JASON-OS/.claude/hooks/lib/" | REFUTED by GV1 R1 and GV2 INTER-1. Filesystem confirms only symlink-guard.js present. G1 and G3 were correct: git-utils.js is ABSENT and is the critical missing dependency for compaction defense. |
| CON-7 | G3 serendipity note claimed D1b "listed loop-detector under PostToolUse" | REFUTED by GV2 CONTRA-1. D1b explicitly listed loop-detector under PostToolUseFailure. G3's correction to D1b was spurious; the wiring implication (need a new PostToolUseFailure section) is correct regardless. |
| CON-8 | D1b/D2a stated post-write-validator has "10 sub-checks"; G3 produced 13 named validators + 1 removed | G3 is the authoritative count (full read of 1205-LOC file). D1b/D2a undercounted from incomplete reads (acknowledged at time). Split: 5 keep (generic), 7 remove (SoNash-specific), 1 already removed. |

### Open Questions

1. **What is JASON-OS's Node.js version convention?** The hooks call `node` directly (no fnm wrapper). `.nvmrc` is a one-line fix (Layer 0+).
2. **Will JASON-OS adopt the `SESSION_CONTEXT.md` convention or use a different name?** The format contract between `session-end` (writer) and `session-begin` (reader) must be established before either skill can fully function.
3. **Should `canonical-memory/` be version-controlled in JASON-OS?** Already implemented (commit 1d7fc0c). Open question: promotion workflow for live memory → canonical.
4. **What is the JASON-OS stack?** CLAUDE.md §1-3 are TBD stubs. Many portability decisions depend on this.
5. **Is extract-from-SoNash the right strategy?** See Strategic Open Question SQ-1.
6. **What does subjective home feel actually require for Jason?** Structurally-derived criteria may not match actual preferences.
7. **When should `runAnalyze()` enforcement flip from advisory to mandatory?** G3 proposes sessions 1-10 advisory, then mandatory. Needs operator decision.

---

## (e) Confidence Summary

| Category | Confidence | Note |
|---|---|---|
| SoNash hook inventory and wiring | HIGH | Direct filesystem reads of settings.json and hook source files |
| JASON-OS hook gaps | HIGH | Direct filesystem inspection confirms absence |
| Skills portability classification | MEDIUM | Grep-based reference counting (syntactic) — may miss semantic coupling (CH-C-001) |
| session-end portability analysis | HIGH | Full SKILL.md read + script inspection; G1 confirmed full dependency graph |
| Memory system behavior | MEDIUM | Filesystem + official docs + prior research. Auto-injection mechanism UNVERIFIABLE from filesystem (C-039) |
| /todo broken state | HIGH | SKILL.md mandates script; confirmed absent. G2 confirmed no programmatic callers either. |
| sanitize-error.cjs path | CONFIRMED WORKING | REFUTED — file exists at correct path. Both hooks functional. |
| settings-guardian CRITICAL_HOOKS | CONFIRMED CORRECT | REFUTED — already trimmed in JASON-OS ported version |
| `hasDebtCandidates` dead-end | HIGH | Confirmed in both SKILL.md and skill directory. G5 produced stub fix. |
| pr-review and pr-retro scope | HIGH | Full skill reads |
| TDMS portability | HIGH | Script directory + skill reads |
| user-prompt-handler.js portability | MEDIUM → extraction plan HIGH | runAnalyze() emits directives for agents that don't exist (CH-C-004); G3 produced full sub-function audit — Phase A extraction (<1h) is HIGH confidence |
| Home feel criteria (D5) | MEDIUM | Structurally derived, not user-validated (CH-C-006) |
| MVP scope sketch (D6) | MEDIUM | Reframed; requires SQ-1 decision before confident scoping |
| AgentSkills compatibility | HIGH (upgraded from UNVERIFIED) | G6 confirmed via live spec fetch. Zero breaking changes. |
| hooks/lib 4-file portability | HIGH | G1/G3 confirmed all four are pure Node.js, copy as-is |
| /todo full port estimate | HIGH | G2 revised to ~1.5h; hard deps confirmed present |

**Overall confidence: MEDIUM-HIGH.** All primary claims grounded in direct filesystem inspection. Two HIGH-severity findings refuted in Phase 2.5. One HIGH-severity inter-G contradiction resolved (git-utils.js). AgentSkills claim upgraded. Portability confidence for key items (user-prompt-handler.js overall, home-feel criteria, skills classification) remains MEDIUM; extraction sub-plans are HIGH.

---

## (f) Open Gaps

1. **`session-start.js` full behavior not audited.** The SessionStart hook in SoNash is 500+ lines. Only the first 80 lines and the settings.json wiring were read. Portability assessment is HIGH confidence for described behaviors but incomplete for potential hidden SoNash deps.

2. **`inline-patterns.js` content not audited** (G3 gap). `patternCheck` in post-write-validator calls this lib. Whether patterns inside are SoNash-specific (Firebase import anti-patterns) or generic (console.log in production) was not determined. The lib lives in SoNash `hooks/lib/` — ~15 min to audit.

3. **JASON-OS stack decision (§1-3 TBD).** All hooks and scripts assume Node.js. If JASON-OS adopts a different scripting convention, the entire script layer is affected. This is a pre-condition for multiple Layer 1 and 2 items.

4. **`user-prompt-handler.js` `runAnalyze()` full parameterization not designed.** The 7 priority blocks, keyword arrays, and dispatch infrastructure are understood. The `analyze-directives.json` config schema and `ANALYZE_ENFORCEMENT` env var mechanism need ~30 min of design work before coding.

5. **SoNash skill versions vs JASON-OS versions not cross-checked.** The 9 ported JASON-OS skills are at parity as of 2026-04-15 (G2 confirmed). Divergence clock starts now. First check recommended at ~30 days.

6. **`post-read-handler.js` Phase 2 (auto-save context, lines 228+) not fully audited** (G3 gap). MCP entity schemas may be embedded. Core Phase 1 context-tracking is fully audited and portable.

7. **`normalize-file-path.js` and `normalize-category.js` in SoNash scripts/lib not read** (G1 gap). Assessed as low-urgency normalizers with no known JASON-OS consumers. Could have hidden portability value.

8. **PROACTIVELY clause trigger frequency calibration not verified.** G4's contrarian and OTB clauses scope to "irreversible decisions" and "no alternatives considered" — judgment call that may need tuning after first use.

---

## Claim Registry

| ID | Claim | Verification Status | Confidence | Category |
|---|---|---|---|---|
| C-001 | session-begin identical to SoNash v2.0 but SESSION_CONTEXT.md absent | VERIFIED | HIGH | pitfalls |
| C-002 | session-end absent; BOOTSTRAP_DEFERRED records Phase 3 npm dependency | VERIFIED | HIGH | pitfalls |
| C-003 | SoNash has 28 hooks across 7 event types; JASON-OS has 4 hooks across 2 event types (SessionStart + PreToolUse) | PARTIALLY REFUTED (parenthetical "PreToolUse only" was wrong; core gap confirmed) | HIGH | architecture |
| C-004 | SoNash Go statusline writes bridge file; two-hook coordination absent from JASON-OS | VERIFIED (G4: bridge is in closed-source GSD plugin, not ported to SoNash codebase) | HIGH | architecture |
| C-005 | SoNash has 3-layer compaction defense; JASON-OS has none | VERIFIED | HIGH | architecture |
| C-006 | JASON-OS has 25 feedback entries (SoNash has 37, not 11 as originally stated); 1 project file vs 27 | CONFLICTED (counts corrected) | HIGH | general |
| C-007 | /todo and /checkpoint skills identical; JASON-OS lacks session-start hook for todo count | VERIFIED | HIGH | features |
| C-008 | SoNash has 6 trigger strata; JASON-OS has 2 | VERIFIED | HIGH | architecture |
| C-009 | user-prompt-handler.js ~718 LOC dispatches 6 sub-functions | VERIFIED (G3: 718 LOC confirmed, all 6 sub-function line numbers exact) | MEDIUM (portability downgraded) | features |
| C-010 | SoNash PostToolUse has 10 matchers; cross-hook state loop confirmed | VERIFIED | HIGH | architecture |
| C-011 | loop-detector.js hashes failures, warns after 3 in 20 min; JASON-OS has none | VERIFIED | HIGH | features |
| C-012 | 17 SoNash agents have PROACTIVELY clauses; 0 JASON-OS agents do | VERIFIED | HIGH | architecture |
| C-013 | Workflow chain advisory in JASON-OS; enforced in SoNash via runAnalyze() | VERIFIED | MEDIUM (portability caveat; G3 extraction plan reduces effort) | pitfalls |
| C-014 | Both settings.json carry identical deny rules and env vars | VERIFIED | HIGH | architecture |
| C-015 | sanitize-error.cjs path crashes two active hooks | REFUTED — file exists at correct path | — | pitfalls |
| C-016 | SoNash has 29 hook scripts; JASON-OS has 4 wired; 5 highest-value missing identified | VERIFIED | HIGH | features |
| C-017 | SoNash wraps every hook with ensure-fnm.sh; JASON-OS calls node directly | VERIFIED (G5: no ensure-fnm.sh in SoNash either — hooks call node directly) | HIGH | pitfalls |
| C-018 | SoNash statusline has 22 widgets; JASON-OS bash statusline has 5 data points | VERIFIED | HIGH | features |
| C-019 | JASON-OS settings.json MCP allow list references 5 non-existent servers | VERIFIED | HIGH | pitfalls |
| C-020 | No keybindings.json in either repo | VERIFIED | HIGH | general |
| C-021 | SoNash CLAUDE.md has [GATE]/[BEHAVIORAL] annotations; JASON-OS has zero | VERIFIED (G4: 16-row annotation table produced for JASON-OS) | HIGH | architecture |
| C-022 | SoNash CLAUDE.md Section 8 has 11 declared docs (not 5); JASON-OS Section 8 is TBD | CONFLICTED (count corrected to 11) | HIGH | architecture |
| C-023 | SoNash 80 skills; JASON-OS 9; 9 already ported | VERIFIED | HIGH | features |
| C-024 | session-end v2.2 has 4 phases; Phase 3 has all SoNash-specific blockers; Phases 1/2/4 portable | VERIFIED (G1: full dependency graph confirmed) | HIGH | features |
| C-025 | user-prompt-handler.js farewell detector is portable pure string regex | VERIFIED | MEDIUM (portability of full handler downgraded) | features |
| C-026 | /todo skill completely non-functional; entire script stack absent | VERIFIED (G2: no programmatic callers in JASON-OS; manual-invocation only) | HIGH | pitfalls |
| C-027 | JASON-OS has no .claude/teams/ directory | VERIFIED | HIGH | pitfalls |
| C-028 | deep-research Phase 5 routes to /add-debt which does not exist | VERIFIED (G5: stub fix recommended over routing removal) | HIGH | pitfalls |
| C-029 | hasDebtCandidates should be written to both top-level and consumerHints | VERIFIED | HIGH | architecture |
| C-030 | pr-review v4.6 is feedback-processor; core protocol portable; SoNash coupling in tool integrations | VERIFIED | HIGH | features |
| C-031 | pr-retro v4.8 has hard gate (Critical Rule #10); retros.jsonl has 71 records | VERIFIED | HIGH | features |
| C-032 | pr-ecosystem-audit dependency in BOOTSTRAP_DEFERRED.md overstated; pipeline runs independently | VERIFIED | HIGH | pitfalls |
| C-033 | JASON-OS scripts/lib has 7 of ~21 SoNash lib entries; key missing items identified | VERIFIED (G1: full comparison table produced) | HIGH | pitfalls |
| C-034 | AI_WORKFLOW.md (31KB) absent from JASON-OS | VERIFIED (G5: all 4 nav docs absent; JASON-OS rewrites ~320 lines combined) | HIGH | pitfalls |
| C-035 | JASON-OS has no .nvmrc; hooks call node directly with no version guarantee | VERIFIED (G5: one-line fix; no ensure-fnm.sh needed) | HIGH | pitfalls |
| C-036 | AutoDream active; JASON-OS inherits from global config | VERIFIED | HIGH | general |
| C-037 | settings-guardian.js CRITICAL_HOOKS false-positive for pre-commit-agent-compliance.js | REFUTED — ported version already trimmed | — | pitfalls |
| C-038 | session-begin Phase 3 health scripts reference npm commands that don't exist in JASON-OS | VERIFIED | HIGH | pitfalls |
| C-039 | Memory system auto-injects MEMORY.md and CLAUDE.md every turn; creates home-feel consistency | UNVERIFIABLE (injection mechanism internal to Claude Code runtime) | MEDIUM | architecture |
| C-040 | SoNash CLAUDE.md has prior art scan trigger; JASON-OS has no EXTRACTIONS.md | VERIFIED (G5: EXTRACTIONS.md near-zero value at 1 session; seed at session #3) | HIGH | pitfalls |
| C-041 | pre-commit-fixer referenced in CLAUDE.md §4.9 but does not exist in JASON-OS | VERIFIED (G5: ~70% portable, ~130-line JASON-OS version, 30-40 min) | HIGH | pitfalls |
| C-042 | SoNash TDMS: 28 scripts, 8505-item MASTER_DEBT.jsonl, 2 skills | VERIFIED | HIGH | features |
| C-043 | gsd-statusline.js pulls from ~/.claude/todos/; /todo writes to .planning/todos.jsonl — different stores | VERIFIED | HIGH | architecture |
| C-044 | SoNash settings.local.json has ~40 entries; JASON-OS has 1 bootstrap entry | VERIFIED | HIGH | general |
| C-045 | governance-logger.js fully portable, zero SoNash deps; absent from JASON-OS | VERIFIED (G3: confirmed fully portable, ~30 min with rotate-state.js copy) | HIGH | features |
| C-G1 | AgentSkills open standard (16-tool coverage, Dec 2025) not evaluated; may be compatible with SKILL.md at zero additional cost | VERIFIED (G6: confirmed published, 14-26 tools, both required fields already present, zero breaking changes) | HIGH (upgraded from UNVERIFIED) | architecture |
| C-G2 | Adding PROACTIVELY clauses to JASON-OS agent frontmatter is highest-leverage single porting action | VERIFIED (G4: all 8 draft clauses produced, 15-20 min total) | HIGH | features |
| C-G3 | SESSION_CONTEXT.md requires 5 specific fields for full system compatibility: Current Session Counter, Uncommitted Work, Last Updated, Quick Status section, Next Session Goals section | NEW (G1) | HIGH | architecture |
| C-G4 | hooks/lib is missing 4 files (git-utils.js, state-utils.js, sanitize-input.js, rotate-state.js); without git-utils.js, pre-compaction-save exits silently at line 39 with no handoff.json written | NEW (G1, GV1) | HIGH | pitfalls |
| C-G5 | All 4 missing hooks/lib files (git-utils.js, state-utils.js, sanitize-input.js, rotate-state.js) have only Node.js built-in dependencies and are fully portable copy-as-is | NEW (G1) | HIGH | features |
| C-G6 | user-prompt-handler.js has 4 fully-portable sub-functions (runGuardrails, runFrustrationDetection, runSessionEnd, runPlanSuggestion) extractable with zero edits; shared dependency symlink-guard.js already present in JASON-OS | NEW (G3, GV1) | HIGH | features |
| C-G7 | runAnalyze() dispatches mandatory PRE-TASK directives for 7 agent/skill targets (security-auditor, systematic-debugging, database-architect, frontend-design, Plan, Explore, test-engineer); none of these exist in JASON-OS; wiring as-is causes mandatory directives for nonexistent agents | NEW (G3) | HIGH | pitfalls |
| C-G8 | post-write-validator.js has 13 active named validators (not 10 as D1b/D2a stated); split: 5 generic validators (markdownFenceCheck, jsonSyntaxCheck, typescriptStrictCheck, agentTriggerEnforcer, patternCheck), 7 SoNash-specific to remove, 1 already removed | NEW (G3, GV2) | HIGH | architecture |
| C-G9 | loop-detector.js is wired to PostToolUseFailure, not PostToolUse; JASON-OS settings.json needs a new PostToolUseFailure section added, not a new matcher in the existing PostToolUse block | VERIFIED (G3 serendipity, GV1 V5, GV2 CONTRA-1) | HIGH | pitfalls |
| C-G10 | /todo full port requires only 3 scripts (todos-cli.js, render-todos.js, todos-mutations.js); hard dependencies (safe-fs.js, sanitize-error.js, parse-jsonl-line.js) already present; revised effort ~1.5h not 3-4h | NEW (G2, GV2) | HIGH | features |
| C-G11 | No programmatic caller of /todo exists in JASON-OS today; session-start.js (which surfaces todo counts) has not been ported; the skill is manual-invocation only | NEW (G2) | HIGH | architecture |
| C-G12 | write-invocation.ts invocation tracking section in all 9 ported JASON-OS skills calls a SoNash-specific analytics script and will produce errors if executed | NEW (G2) | HIGH | pitfalls |
| C-G13 | JASON-OS canonical-memory (11 files, commit 1d7fc0c) and global memory are currently identical — perfect sync at session 1; SoNash sync is manual cp with no automation | NEW (G2) | HIGH | general |
| C-G14 | 14 of 16 CLAUDE.md §4 guardrails are [BEHAVIORAL: honor-only]; only §4.7 (push guard) is fully gated; §4.14 (settings guardian) is [MIXED] | NEW (G4) | HIGH | architecture |
| C-G15 | PROACTIVELY clause drafts for all 8 JASON-OS agents are ready to paste; total edit time 15-20 minutes | NEW (G4) | HIGH | features |
| C-G16 | SoNash navigation documents require JASON-OS-tailored rewrites not copies: AI_WORKFLOW.md ~60% SoNash-specific; all 4 docs (~320 lines JASON-OS) estimated 3-4h combined | NEW (G5) | HIGH | architecture |
| C-G17 | AgentSkills spec at agentskills.io/specification requires exactly name and description as required fields; all other fields optional; JASON-OS SKILL.md files already compliant with zero breaking changes needed | VERIFIED (G6, GV1 V10) | HIGH | architecture |
| C-G18 | GitHub Copilot automatically recognizes skills in .claude/skills/ without any configuration changes; JASON-OS skills are de facto Copilot-compatible today | NEW (G6) | HIGH | features |
| C-G19 | SoNash .nvmrc contains 22; JASON-OS has no .nvmrc; one-line fix needed | VERIFIED (G5, GV1 V9) | HIGH | pitfalls |
| C-G20 | research-plan-team.md (SoNash) enables progressive handoff via TeamCreate/SendMessage API not possible with subagents; portable in 20-30 min; may be needed if deep-plan follows this research in same session | NEW (G5) | HIGH | features |
| C-G21 | EXTRACTIONS.md has near-zero value at 1 completed session; earns its keep at 3-5 sessions; CLAUDE.md §7 trigger is a dead reference at session #1 | NEW (G5) | HIGH | pitfalls |
| C-G22 | pre-commit-fixer is ~70% portable; 7-step workflow, 6 critical rules, guard rails are language-agnostic; ~130-line JASON-OS adaptation in 30-40 min | NEW (G5) | HIGH | features |

---

## Sources

### Tier 1 — Direct Filesystem Evidence (all T1, HIGH trust)

| S-ID | Path | What It Evidences |
|---|---|---|
| S-001 | `C:/Users/jbell/.local/bin/sonash-v0/.claude/settings.json` | Full SoNash hook wiring (317 lines) |
| S-002 | `C:/Users/jbell/.local/bin/JASON-OS/.claude/settings.json` | JASON-OS current hook wiring (81 lines) |
| S-003 | `C:/Users/jbell/.local/bin/sonash-v0/.claude/hooks/user-prompt-handler.js` | UserPromptSubmit NLP dispatcher (718 LOC confirmed) |
| S-004 | `C:/Users/jbell/.local/bin/sonash-v0/.claude/hooks/pre-compaction-save.js` | PreCompact state snapshot hook |
| S-005 | `C:/Users/jbell/.local/bin/sonash-v0/.claude/hooks/compact-restore.js` | SessionStart compact-resume recovery hook |
| S-006 | `C:/Users/jbell/.local/bin/sonash-v0/.claude/hooks/commit-tracker.js` | PostToolUse commit log |
| S-007 | `C:/Users/jbell/.local/bin/sonash-v0/.claude/hooks/loop-detector.js` | PostToolUseFailure loop guard (not PostToolUse) |
| S-008 | `C:/Users/jbell/.local/bin/sonash-v0/.claude/hooks/governance-logger.js` | CLAUDE.md/settings audit trail |
| S-009 | `C:/Users/jbell/.local/bin/sonash-v0/.claude/hooks/gsd-context-monitor.js` | Context pressure injection via bridge file |
| S-010 | `C:/Users/jbell/.local/bin/sonash-v0/.claude/hooks/gsd-statusline.js` | Statusline bridge file writer |
| S-011 | `C:/Users/jbell/.local/bin/JASON-OS/.claude/statusline-command.sh` | JASON-OS bash statusline (63 lines, no bridge write) |
| S-012 | `C:/Users/jbell/.local/bin/sonash-v0/SESSION_CONTEXT.md` | SoNash session context document (v8.34) |
| S-013 | `C:/Users/jbell/.local/bin/JASON-OS/.planning/jason-os/BOOTSTRAP_DEFERRED.md` | Explicit record of deferral decisions |
| S-014 | `C:/Users/jbell/.local/bin/sonash-v0/.claude/skills/session-end/SKILL.md` | session-end SKILL.md v2.2 |
| S-015 | `C:/Users/jbell/.local/bin/sonash-v0/.claude/skills/session-begin/SKILL.md` | session-begin SKILL.md v2.0 |
| S-016 | `C:/Users/jbell/.local/bin/JASON-OS/.claude/skills/todo/SKILL.md` | todo skill (broken — missing scripts) |
| S-017 | `C:/Users/jbell/.local/bin/sonash-v0/.claude/hooks/pre-commit-agent-compliance.js` | Pre-commit agent gate (hardcodes code-reviewer:71, security-auditor:74-75) |
| S-018 | `C:/Users/jbell/.local/bin/sonash-v0/.claude/hooks/track-agent-invocation.js` | PostToolUse agent tracker |
| S-019 | `C:/Users/jbell/.local/bin/sonash-v0/.claude/hooks/post-write-validator.js` | Consolidated write validator (13 active named validators) |
| S-020 | `C:/Users/jbell/.local/bin/sonash-v0/.claude/hooks/post-read-handler.js` | PostToolUse Read context counter (392 LOC) |
| S-021 | `C:/Users/jbell/.local/bin/sonash-v0/.claude/hooks/ensure-fnm.sh` | Node version bootstrapper wrapper |
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
| S-036 | `C:/Users/jbell/.local/bin/sonash-v0/.claude/skills/SKILL_INDEX.md` | Skill catalog v2.6 (descriptions only, no version-sync) |
| S-037 | `C:/Users/jbell/.local/bin/sonash-v0/AI_WORKFLOW.md` | Session navigation hub (879 lines, ~60% SoNash-specific) |
| S-038 | `C:/Users/jbell/.local/bin/sonash-v0/.claude/COMMAND_REFERENCE.md` | Indexed skills/commands catalog (197 lines) |
| S-039 | `~/.claude/projects/C--Users-jbell--local-bin-JASON-OS/memory/MEMORY.md` | JASON-OS memory index (31 files) |
| S-040 | `C:/Users/jbell/.local/bin/sonash-v0/.claude/canonical-memory/MEMORY.md` | SoNash memory index (77 files) |
| S-041 | `C:/Users/jbell/.local/bin/JASON-OS/.claude/settings.local.json` | JASON-OS local settings (bootstrap artifact) |
| S-042 | `C:/Users/jbell/.local/bin/sonash-v0/.claude/settings.local.json` | SoNash local settings (40-entry policy log) |
| S-043 | `C:/Users/jbell/.local/bin/sonash-v0/scripts/session-end-commit.js` | npm run session:end implementation (zero SoNash deps) |
| S-044 | `C:/Users/jbell/.local/bin/sonash-v0/.claude/hooks/lib/` (directory listing) | Shared hook utilities |
| S-045 | `C:/Users/jbell/.local/bin/JASON-OS/scripts/lib/` (directory listing) | JASON-OS lib scripts (7 of ~21 present) |
| S-046 | `C:/Users/jbell/.local/bin/sonash-v0/.claude/teams/` (directory listing + reads) | Two team definitions |
| S-047 | `C:/Users/jbell/.local/bin/sonash-v0/.github/workflows/` (directory listing) | 10 workflows vs JASON-OS 6 |
| S-048 | `C:/Users/jbell/.local/bin/sonash-v0/docs/technical-debt/MASTER_DEBT.jsonl` (head) | TDMS debt store (8,505 items) |
| S-049 | `C:/Users/jbell/.local/bin/sonash-v0/tools/statusline/` (Go binary + config) | SoNash statusline v3 (22 widgets) |
| S-050 | `C:/Users/jbell/.local/bin/sonash-v0/.claude/tool-manifest.json` | 14-tool CLI preference registry |
| S-056 | `C:/Users/jbell/.local/bin/sonash-v0/.claude/hooks/loop-detector.js` (settings.json line 293) | Confirms PostToolUseFailure wiring (not PostToolUse) |
| S-057 | `C:/Users/jbell/.local/bin/JASON-OS/.claude/hooks/lib/` (directory listing) | Confirms only symlink-guard.js present; git-utils.js ABSENT |
| S-058 | `C:/Users/jbell/.local/bin/sonash-v0/.claude/skills/pre-commit-fixer/SKILL.md` | pre-commit-fixer SKILL.md v2.0 (266 lines, ~70% portable) |
| S-059 | `C:/Users/jbell/.local/bin/sonash-v0/.claude/teams/research-plan-team.md` | Research-plan team coordination file (290 lines, v1.0) |
| S-060 | `C:/Users/jbell/.local/bin/sonash-v0/.nvmrc` | SoNash Node version pin (value: 22) |
| S-061 | `C:/Users/jbell/.local/bin/JASON-OS/.claude/canonical-memory/` (directory listing) | JASON-OS canonical memory (11 files, commit 1d7fc0c) |

### Tier 2 — Prior Research and Secondary Sources

| S-ID | Source | What It Evidences |
|---|---|---|
| S-051 | `sonash-v0/.research/multi-layer-memory/RESEARCH_OUTPUT.md` | AutoDream behavior, memory system verification |
| S-052 | https://code.claude.com/docs/en/memory | Official Claude Code memory mechanism |
| S-053 | Dream consolidation prompt (Piebald-AI extracted) | Memory consolidation behavior |
| S-054 | https://agentskills.io/home | AgentSkills open standard home (referenced by CH-O-001) |
| S-055 | https://anthropic.com/engineering/equipping-agents-for-the-real-world-with-agent-skills | Anthropic AgentSkills engineering post (referenced by CH-O-001) |
| S-062 | https://agentskills.io/specification | AgentSkills specification (live fetch, G6 verified: 2 required fields confirmed) |
| S-063 | https://github.blog/changelog/2025-12-18-github-copilot-now-supports-agent-skills/ | GitHub Copilot AgentSkills adoption (confirms .claude/skills/ auto-recognized) |

---

## Methodology

**Research conducted:** 2026-04-15
**Approach:** 12 parallel codebase-profile searcher agents, each assigned a focused sub-question. All agents performed direct filesystem inspection of both `sonash-v0/` and `JASON-OS/` repositories. No web search was used for primary findings. All primary sources are T1 (direct file reads).

**Phase 2.5 verification:** 4 verifier agents (V1a, V1b, V2a, V2b) independently verified all 45 claims. Result: 39 VERIFIED, 2 REFUTED (C-015, C-037), 2 CONFLICTED (C-006, C-022), 1 UNVERIFIABLE (C-039), 1 PARTIAL REFUTATION (C-003 parenthetical).

**Phase 3 challenges:** 1 contrarian agent (10 challenges: 1 CRITICAL, 7 MAJOR, 2 MINOR) and 1 OTB agent (8 challenges: 3 HIGH, 4 MEDIUM, 1 LOW novelty). All 18 challenges addressed in synthesis.

**Phase 3.95 gap pursuit:** 6 gap pursuit agents (G1-G6) investigated 18 gap items identified by the Phase 3.95 scan. Produced 84 new claim-level findings, ~30 net-new distinct claims after deduplication.

**Phase 3.96 gap verification:** 2 gap verifier agents (GV1, GV2). GV1 spot-verified 13 high-stakes G-claims: 10 VERIFIED, 1 REFUTED (G4 git-utils.js error), 1 PARTIALLY VERIFIED, 1 UNVERIFIABLE (budget). GV2 cross-checked all 6 G-files: 1 HIGH-severity intra-G contradiction resolved (git-utils.js), 1 LOW-severity misattribution resolved (loop-detector event type), 1 genuine undercount corrected (post-write-validator sub-checks: 10→13).

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
- G1 (session-rhythm-infra): Session-end dependency graph, compaction defense input sources, lib gap
- G2 (knowledge-arch): /todo viability, skills maintenance trap, memory portability architecture
- G3 (hooks-extraction): user-prompt-handler sub-function audit, PostToolUse tripwire web
- G4 (governance-annotations): pre-commit compliance gate, PROACTIVELY clause drafts, GATE/BEHAVIORAL table, statusline bridge
- G5 (navigation-skill-infra): /add-debt fix, navigation docs, teams, EXTRACTIONS.md, pre-commit-fixer, .nvmrc
- G6 (agentskills-feasibility): AgentSkills spec verification, JASON-OS compatibility confirmation
- GV1 (codebase-claims): Spot-verification of 13 high-stakes G-claims
- GV2 (cross-consistency): Cross-file consistency check across all 6 G-files

---

## Changelog

| Version | Date | Changes |
|---|---|---|
| 1.0 | 2026-04-15 | Initial synthesis: 12 D-agents, 45 claims, 53 sources |
| 1.1 | 2026-04-15 | Post-verification + challenge re-synthesis. 2 claims REFUTED (C-015, C-037), 2 CONFLICTED (C-006, C-022), 1 UNVERIFIABLE (C-039). Portability confidence downgraded on C-009/C-013/C-025 (MEDIUM). Layer 0 reduced 3→2 items. MVP scope reframed into 3 categories. 2 Strategic Open Questions added (SQ-1 CH-C-001, SQ-2 CH-O-003). Unconsidered Approaches section added (CH-O-001, CH-O-002, CH-O-006, CH-O-008). Maintenance trap finding added (CH-C-005). Session-end estimate revised 45min→2-3h. 10 contrarian + 8 OTB challenges fully resolved. 2 new gap claims added (C-G1, C-G2). 2 new sources added (S-054, S-055). |
| 1.2 | 2026-04-15 | Post-gap-pursuit re-synthesis (Phase 3.97). 6 G-agents + 2 GV-agents. 1 HIGH-severity intra-G contradiction resolved (git-utils.js ABSENT, G4 refuted). post-write-validator sub-check count corrected 10→13 (G3 authoritative). loop-detector confirmed PostToolUseFailure wiring; D1b serendipity misattribution dropped. /todo full port revised 3-4h→1.5h (G2). C-G1 AgentSkills upgraded UNVERIFIED→HIGH (G6 confirmed). 20 new claims added (C-G3 through C-G22). Layer 0+ pre-layer added for zero-cost wins. New sources S-056 through S-063 added. Phase 3.95-3.97 Updates section added. hooks/lib prerequisite step clarified as required before all Layer 1 items. Navigation docs strategy changed from copy to JASON-OS-tailored rewrites. |
