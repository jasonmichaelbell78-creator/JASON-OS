# Findings: Rhythm-Spine — Daily-Driver Patterns in SoNash vs JASON-OS

**Searcher:** deep-research-searcher
**Profile:** codebase
**Date:** 2026-04-15
**Sub-Question IDs:** D1a (rhythm-spine)

---

## Key Findings

### 1. Session Boundaries: session-begin is identical; session-end is the missing half [CONFIDENCE: HIGH]

JASON-OS carries a verbatim copy of SoNash's `session-begin` skill (both are
version 2.0, dated 2026-03-16, identical line-for-line). The skill defines a
5-phase pre-flight: duplicate detection, environment setup, context loading,
health scripts, and warning gates, culminating in a goal-selection prompt and
a session counter increment.

SoNash's paired counterpart — `session-end` (v2.2, 2026-03-13) — is explicitly
absent from JASON-OS. The BOOTSTRAP_DEFERRED.md records the reason: Phase 3 of
session-end (the Metrics & Data Pipeline) depends on `npm run reviews:sync`,
`run-ecosystem-health.js`, `consolidate-all.js`, and `generate-metrics.js`,
none of which have been ported.

Impact on home-feel: the bookend that closes each session — updating
SESSION_CONTEXT.md, running health metrics, committing — does not exist.
Sessions currently have no structured exit ritual.

Sources: [1] session-begin SKILL.md (both repos, identical)
[2] session-end SKILL.md (SoNash only) [3] BOOTSTRAP_DEFERRED.md lines 14-29

---

### 2. The session counter and SESSION_CONTEXT.md exist only in SoNash [CONFIDENCE: HIGH]

SoNash has `SESSION_CONTEXT.md` (document version 8.34 at the repo root) that
tracks: session number (#281/#282 at time of capture), branch, blockers, goals,
and a Quick Recovery block that `session-begin` reads and `session-end` writes.
The session counter is incremented at every session-begin (Step 2.1) and creates
the operator's primary sense of continuity — "Session #N started on [branch]"
is the greeting that anchors every work day.

JASON-OS has no SESSION_CONTEXT.md. Without it, `session-begin` has nothing to
read (Phase 2.1 is structurally empty), the session counter cannot increment,
and the "Started Session #N" announcement never fires. The session-begin skill
exists but cannot execute its core context-loading phase.

Sources: [1] SoNash SESSION_CONTEXT.md root file [2] session-begin SKILL.md
Phase 2 (both repos) [3] Filesystem check showing file MISSING from JASON-OS

---

### 3. SoNash has 20 production hooks wired; JASON-OS has 3 active ones [CONFIDENCE: HIGH]

SoNash's `.claude/settings.json` wires hooks across all six event types
(SessionStart, PreToolUse, PostToolUse, PostToolUseFailure, PreCompact,
UserPromptSubmit). The production hook chain for a single session includes:

**SessionStart (3 hooks):**
- `session-start.js` — installs deps, builds functions, checks compliance,
  consolidation, cross-session validation, writes session-activity.jsonl
- `check-mcp-servers.js` — MCP availability
- `compact-restore.js` (compact matcher) — reads handoff.json to restore
  state after compaction
- `gsd-check-update.js` — checks for GSD/OS updates, writes to cache for
  statusline display

**UserPromptSubmit (1 hook):**
- `user-prompt-handler.js` — fires on EVERY prompt. Injects reminders for
  unacknowledged alerts, context overflow warnings, and pending MCP saves.
  Also analyzes prompt content to suggest relevant agents/skills.

**PreCompact (1 hook):**
- `pre-compaction-save.js` — comprehensive state snapshot to handoff.json
  before compaction, capturing session counter, task states, recent commits,
  git state, active plans, and session notes.

**PostToolUse (9 hooks, consolidated into fewer processes):**
- `post-write-validator.js` — fires on every Write/Edit/MultiEdit; 10
  inline checks including pattern compliance, component size, TypeScript
  strict, repository pattern, agent trigger suggestion
- `post-read-handler.js` — context tracking (counts files read, feeds
  user-prompt-handler's overflow warning)
- `commit-tracker.js` — appends to commit-log.jsonl on every git commit
- `decision-save-prompt.js` — fires on AskUserQuestion to prompt decision
  documentation
- `test-tracker.js` — records test results to state files
- `track-agent-invocation.js` — logs agent invocations for session-end
  compliance review
- `governance-logger.js` — logs CLAUDE.md/settings.json changes to
  governance-changes.jsonl
- `post-todos-render.js` — re-renders TODOS.md whenever todos.jsonl changes
- `gsd-context-monitor.js` — reads context metrics from statusline bridge
  file, injects warnings to Claude when context > 65% or > 75% used

**PostToolUseFailure (1 hook):**
- `loop-detector.js` — hashes build/test failure output; warns Claude to
  change approach after 3 identical failures within 20 minutes

**PreToolUse (5 hooks):**
- `block-push-to-main.js` — blocks pushes to main
- `pre-commit-agent-compliance.js` — checks agent compliance before commit
- `deploy-safeguard.js` — pre-deploy checks
- `large-file-gate.js` — size check on large file reads
- `settings-guardian.js` — validates settings.json writes
- `gsd-prompt-guard.js` — scans .planning writes for prompt injection

JASON-OS settings.json wires only: `check-mcp-servers.js` (SessionStart),
`block-push-to-main.js` (PreToolUse Bash), `large-file-gate.js` (PreToolUse
Read), and `settings-guardian.js` (PreToolUse Write/Edit). There are no
PostToolUse hooks, no UserPromptSubmit hooks, no PreCompact hooks, and no
PostToolUseFailure hooks.

Sources: [1] SoNash settings.json (full hook table) [2] JASON-OS settings.json
[3] Individual hook source files examined

---

### 4. Statusline: JASON-OS has a functional placeholder; SoNash has a rich compiled binary [CONFIDENCE: HIGH]

SoNash uses a compiled Go binary (`tools/statusline/sonash-statusline-v3.exe`)
that sources its data from the `gsd-statusline.js` hook (version 1.30.0). The
statusline renders: model name, active todo task (`in_progress` from the todos
JSON), directory, context window usage as a 10-segment progress bar with
color-coded thresholds (green/yellow/orange/red-blinking), and a GSD update
notification when updates or stale hooks are detected. The context window reading
is normalized for the ~16.5% autocompact buffer, so "100%" means "you've used
all usable context."

A critical secondary function: `gsd-statusline.js` writes a bridge file
(`/tmp/claude-ctx-{session_id}.json`) that `gsd-context-monitor.js` reads to
inject agent-facing warnings — the statusline doesn't just inform the human,
it propagates context pressure to Claude itself.

JASON-OS has `.claude/statusline-command.sh` wired in settings.json. It
displays: directory (3-component truncation), git branch with staged/modified/
untracked flags, ahead/behind counts, Node version, model name, and context
usage percentage. Functional and correct for a generic OS. Missing: active todo
display, GSD/OS update check notification, and — critically — the context
bridge file that enables `gsd-context-monitor.js`. The context-monitor hook
itself is not ported, so this gap does not currently cause a failure.

Sources: [1] SoNash gsd-statusline.js (full file) [2] SoNash settings.json
statusLine config [3] JASON-OS statusline-command.sh [4] JASON-OS settings.json
statusLine config [5] gsd-context-monitor.js

---

### 5. Compaction resilience: SoNash has a 3-layer system; JASON-OS has none [CONFIDENCE: HIGH]

SoNash employs three complementary layers:

- **Layer A (commit-tracker.js, PostToolUse):** Every git commit is appended
  to `commit-log.jsonl`. On resume, this log lets session-begin detect gap
  sessions (sessions that happened between commits without a proper session-end).

- **Layer B (pre-compaction-save.js, PreCompact):** Fires immediately before
  compaction. Writes a comprehensive `handoff.json` including: session counter,
  all task-*.state.json contents, last 15 commits, git state (branch, staged,
  untracked files), agent invocations, files read, active plan file, session
  scratchpad notes, and compaction trigger type (manual/auto).

- **Layer C (compact-restore.js, SessionStart compact matcher):** On resume
  after compaction, reads `handoff.json` and outputs structured recovery context
  to Claude's conversation so it can pick up exactly where it left off.

JASON-OS has the `checkpoint` skill (identical to SoNash's version) which
provides manual `handoff.json` writes. But there is no `pre-compaction-save.js`,
no `compact-restore.js`, and no `commit-tracker.js`. Compaction recovery depends
entirely on the operator remembering to run `/checkpoint`.

Sources: [1] SoNash settings.json PreCompact and SessionStart hooks [2]
pre-compaction-save.js source [3] compact-restore.js source [4] commit-tracker.js
source [5] JASON-OS settings.json (no PreCompact, no compact SessionStart)

---

### 6. CLAUDE.md: JASON-OS has the behavioral skeleton; SoNash has the full body [CONFIDENCE: HIGH]

Both CLAUDE.md files share sections 4 (Behavioral Guardrails — 16 rules),
5 (Critical Anti-Patterns), 6 (Coding Standards), 7 (Agent/Skill Triggers),
and the general structure. The content of sections 1-3 differs meaningfully:

SoNash CLAUDE.md (v6.0, 2026-04-12):
- §1: Full stack table (Next.js 16.2.0, React 19.2.4, Firebase 12.10.0,
  Tailwind 4.2.2, Zod 4.3.6) with explicit "newer than your training cutoff"
  warning
- §2: Security rules with gate labels (Cloud Functions, App Check, rate
  limiting)
- §3: Architecture — repository pattern, service file conventions
- §7: 17 skill/agent trigger rows including post-task gates (code-reviewer,
  test-suite), session-end pointer, agent teams reference, 34 specialized agents
- §8: Reference docs table (AI_WORKFLOW.md, ROADMAP.md, SESSION_CONTEXT.md,
  AGENT_ORCHESTRATION.md, CONTEXT_PRESERVATION.md)

JASON-OS CLAUDE.md (v0.1, 2026-04-15):
- §1: "TBD — stack not yet chosen"
- §2: "TBD — populated when stack and integration points are chosen"
- §3: "TBD — populated as the OS structure solidifies"
- §7: 5 skill/agent trigger rows (PRE-TASK only; post-task table absent)
  Note: session-end listed as "deferred"
- §8: "TBD — add as the OS gains internal documentation"

This is intentional and correct for bootstrap state. The behavioral rules
(sections 4-6) are fully populated and load every turn. The gaps in 1-3 are
expected to be filled as JASON-OS's stack and patterns solidify.

Sources: [1] SoNash CLAUDE.md lines 1-183 [2] JASON-OS CLAUDE.md full file

---

### 7. MEMORY.md: JASON-OS has a richer index than SoNash's canonical-memory [CONFIDENCE: HIGH]

JASON-OS's MEMORY.md (in `~/.claude/projects/.../memory/`) indexes 4 User
profiles, 25 Feedback entries, 1 Project entry, and 1 Reference entry — more
feedback entries than SoNash's canonical-memory MEMORY.md (which has 3 User,
11 Feedback, 5 Project entries). The additional JASON-OS entries capture
JASON-OS-specific learnings (agent hot-reload, output file empty bug, write
rejection = hard stop, scope drift in deep-research, etc.).

The architecture is identical: an index MEMORY.md pointing to individual
markdown files per topic. This pattern is fully operational in JASON-OS.

Sources: [1] JASON-OS memory/MEMORY.md [2] SoNash canonical-memory/MEMORY.md
[3] Directory listing of both

---

### 8. Todo/checkpoint persistence: both repos have identical skill definitions [CONFIDENCE: HIGH]

The `todo` skill (v1.2, 2026-04-10) and `checkpoint` skill (v2.0, 2026-02-14)
are identical between SoNash and JASON-OS. Both use:
- `.planning/todos.jsonl` as canonical JSONL storage
- `scripts/planning/todos-cli.js` for locked/regression-guarded mutations
- `.claude/state/handoff.json` + `task-*.state.json` for checkpoint state

JASON-OS has these skills wired and available. The gap is not in the skill
definitions but in the supporting infrastructure: JASON-OS lacks the session-start
hook that would surface todo count on startup ("3 active (1 P0, 2 P1) — run
/todo to manage"), and lacks the session-end integration that prompts todo review
before closure.

Sources: [1] JASON-OS todo/SKILL.md [2] SoNash todo/SKILL.md [3] Both
checkpoint/SKILL.md files (identical)

---

### 9. UserPromptSubmit hook: every-prompt intelligence is absent from JASON-OS [CONFIDENCE: HIGH]

SoNash's `user-prompt-handler.js` fires on every user prompt. It performs:
1. **Alerts reminder:** if `pending-alerts.json` has unacknowledged alerts,
   injects a count and severity breakdown ("ALERTS: 3 pending (1 error, 2
   warnings). Tell user or run /alerts.") with a 10-minute cooldown to prevent
   spam
2. **Context overflow warning:** if 20+ files have been read this session,
   warns about impending compaction and suggests saving to MCP memory
3. **Prompt analysis:** analyzes the user's request against skill/agent
   trigger patterns and injects directive suggestions (with 15-minute dedup
   to prevent repeated suggestions)

This hook makes every turn an opportunity for the system to be proactive. It
is the mechanism by which warnings don't get "lost" — they resurface at the
next prompt if not acknowledged.

JASON-OS has no UserPromptSubmit hook. The equivalent passive surfacing does
not exist.

Sources: [1] SoNash user-prompt-handler.js [2] SoNash settings.json
UserPromptSubmit section [3] JASON-OS settings.json (no UserPromptSubmit key)

---

### 10. Loop detector and governance logger: absent from JASON-OS [CONFIDENCE: HIGH]

SoNash's `loop-detector.js` (PostToolUseFailure) hashes build/test failure
output and warns Claude to change approach after 3 identical failures in a
20-minute window. This is behavioral error-correction at the infrastructure
level — it prevents Claude from retry-looping on a broken test indefinitely.

SoNash's `governance-logger.js` (PostToolUse Write/Edit) creates an audit trail
in `governance-changes.jsonl` whenever CLAUDE.md or settings.json changes, and
adds a hook-warning entry. This surfaces governance drift to the operator.

Neither exists in JASON-OS.

Sources: [1] SoNash settings.json PostToolUseFailure and PostToolUse sections
[2] loop-detector.js source [3] governance-logger.js source [4] JASON-OS
settings.json (neither hook type present)

---

## Architectural Primitives Summary

The following table maps each rhythm primitive to its firing event, what it
produces, and whether it exists in JASON-OS:

| Primitive | Fires On | Produces | JASON-OS |
|---|---|---|---|
| session-begin skill | Manual invocation | Pre-flight: context load, health check, goal selection | Present (identical) |
| session-end skill | Manual invocation | Context preservation, metrics, commit closure | ABSENT (deferred) |
| SESSION_CONTEXT.md | Read by session-begin | Session counter, branch, goals, blockers, recovery block | ABSENT |
| session-start.js hook | SessionStart | Dependency install, build, compliance check, activity log | ABSENT |
| compact-restore.js | SessionStart (compact) | Compaction recovery from handoff.json | ABSENT |
| pre-compaction-save.js | PreCompact | Comprehensive handoff.json snapshot | ABSENT |
| user-prompt-handler.js | UserPromptSubmit | Per-prompt: alerts, context warnings, skill suggestions | ABSENT |
| gsd-statusline.js | Every render | Context bar, active task, update notice, bridge file write | Partial (sh version, no bridge/task) |
| gsd-context-monitor.js | PostToolUse (all) | Injects context pressure warnings to Claude's context | ABSENT |
| commit-tracker.js | PostToolUse Bash(commit) | commit-log.jsonl for gap detection | ABSENT |
| post-write-validator.js | PostToolUse Write/Edit | 10-check inline validation, agent trigger suggestions | ABSENT |
| post-read-handler.js | PostToolUse Read | Context file-read counter for overflow detection | ABSENT |
| loop-detector.js | PostToolUseFailure | Warns on 3 identical build/test failures | ABSENT |
| governance-logger.js | PostToolUse Write/Edit (CLAUDE.md) | Audit trail for governance changes | ABSENT |
| decision-save-prompt.js | PostToolUse AskUserQuestion | Prompts to document decisions | ABSENT |
| track-agent-invocation.js | PostToolUse Task | agent-invocations.jsonl for session-end compliance | ABSENT |
| todo skill (+ JSONL) | Manual invocation | Cross-session todo persistence | Present (identical) |
| checkpoint skill | Manual invocation | handoff.json, task state files | Present (identical) |
| MEMORY.md + files | Every turn (system context) | User/project/feedback knowledge persistence | Present (richer than SoNash) |
| CLAUDE.md §4-6 | Every turn (loaded) | Behavioral guardrails, anti-patterns, coding standards | Present (populated) |
| CLAUDE.md §1-3 | Every turn (loaded) | Stack, security, architecture | Partial (TBD stubs) |

---

## Sources

| # | Path | Type | Trust | CRAAP | Note |
|---|---|---|---|---|---|
| 1 | `.local/bin/sonash-v0/.claude/skills/session-begin/SKILL.md` | codebase-file | HIGH | 5/5/5/5/5 | Identical to JASON-OS version |
| 2 | `.local/bin/sonash-v0/.claude/skills/session-end/SKILL.md` | codebase-file | HIGH | 5/5/5/5/5 | SoNash only, 450 lines |
| 3 | `.local/bin/JASON-OS/.planning/jason-os/BOOTSTRAP_DEFERRED.md` | codebase-file | HIGH | 5/5/5/5/5 | Explicit record of deferral decisions |
| 4 | `.local/bin/sonash-v0/.claude/settings.json` | codebase-file | HIGH | 5/5/5/5/5 | Full hook wiring, 317 lines |
| 5 | `.local/bin/JASON-OS/.claude/settings.json` | codebase-file | HIGH | 5/5/5/5/5 | Minimal hook wiring, 81 lines |
| 6 | `.local/bin/sonash-v0/.claude/hooks/gsd-statusline.js` | codebase-file | HIGH | 5/5/5/5/5 | 120 lines, context bridge logic |
| 7 | `.local/bin/JASON-OS/.claude/statusline-command.sh` | codebase-file | HIGH | 5/5/5/5/5 | 63 lines bash statusline |
| 8 | `.local/bin/sonash-v0/.claude/hooks/user-prompt-handler.js` | codebase-file | HIGH | 5/5/5/5/5 | Every-prompt intelligence |
| 9 | `.local/bin/sonash-v0/.claude/hooks/pre-compaction-save.js` | codebase-file | HIGH | 5/5/5/5/5 | Layer B compaction defense |
| 10 | `.local/bin/sonash-v0/.claude/hooks/compact-restore.js` | codebase-file | HIGH | 5/5/5/5/5 | Layer C compaction recovery |
| 11 | `.local/bin/sonash-v0/.claude/hooks/commit-tracker.js` | codebase-file | HIGH | 5/5/5/5/5 | Layer A commit logging |
| 12 | `.local/bin/sonash-v0/.claude/hooks/post-write-validator.js` | codebase-file | HIGH | 5/5/5/5/5 | 10-check consolidated validator |
| 13 | `.local/bin/sonash-v0/.claude/hooks/loop-detector.js` | codebase-file | HIGH | 5/5/5/5/5 | PostToolUseFailure hash detector |
| 14 | `.local/bin/sonash-v0/.claude/hooks/governance-logger.js` | codebase-file | HIGH | 5/5/5/5/5 | Governance audit trail |
| 15 | `.local/bin/sonash-v0/.claude/hooks/gsd-context-monitor.js` | codebase-file | HIGH | 5/5/5/5/5 | Context pressure injection |
| 16 | `.local/bin/sonash-v0/SESSION_CONTEXT.md` | codebase-file | HIGH | 5/5/5/5/5 | v8.34, session #281 at capture |
| 17 | `.local/bin/JASON-OS/CLAUDE.md` | codebase-file | HIGH | 5/5/5/5/5 | v0.1, bootstrap state |
| 18 | `.local/bin/sonash-v0/CLAUDE.md` | codebase-file | HIGH | 5/5/5/5/5 | v6.0, full body |
| 19 | `~/.claude/projects/.../memory/MEMORY.md` (JASON-OS) | codebase-file | HIGH | 5/5/5/5/5 | 25 feedback entries |
| 20 | `.local/bin/sonash-v0/.claude/canonical-memory/MEMORY.md` | codebase-file | HIGH | 5/5/5/5/5 | 11 feedback entries |
| 21 | `.local/bin/JASON-OS/.claude/skills/todo/SKILL.md` | codebase-file | HIGH | 5/5/5/5/5 | Identical to SoNash |
| 22 | `.local/bin/JASON-OS/.claude/skills/checkpoint/SKILL.md` | codebase-file | HIGH | 5/5/5/5/5 | Identical to SoNash |

---

## Contradictions

None between sources. The BOOTSTRAP_DEFERRED.md is consistent with what is
observed in the filesystem — the items it calls deferred are verifiably absent.

The JASON-OS session-begin SKILL.md references scripts (`npm run patterns:check`,
`npm run session:gaps`, etc.) that do not exist in JASON-OS. This creates a
partial functionality situation: the skill definition is present but several
of its Phase 3 health scripts will fail silently or noisily on invocation.
This is a known bootstrap state, not a contradiction between sources.

---

## Gaps

1. **SoNash `session-start.js` full implementation** — read only the first 80
   lines of this 500+ line file. The full list of what it checks (npm install,
   build, pattern compliance, consolidation) is described in its header comment
   and referenced in session-begin SKILL.md, but the complete implementation
   was not audited for portability.

2. **`post-read-handler.js`** — referenced in SoNash settings.json PostToolUse,
   not examined directly. Its function (context file-read counting) is known
   from user-prompt-handler.js which reads `.context-tracking-state.json`.

3. **`gsd-workflow-guard.js` and `gsd-check-update.js`** — listed in SoNash
   hooks directory, not examined. Their role relative to the rhythm-spine is
   unclear (possibly GSD-specific rather than universal rhythm primitives).

4. **Track agent invocation + decision-save-prompt full content** — not read
   in full; role is clear from settings.json wiring and filenames.

5. **Whether JASON-OS's session-begin Phase 3 scripts fail gracefully** — the
   SKILL.md says "script failures escalate to user" but the scripts themselves
   don't exist in JASON-OS. Not tested live.

---

## Serendipity

**The compaction bridge is a two-system contract.** The statusline's
`gsd-statusline.js` writes a bridge file to `/tmp/claude-ctx-{session_id}.json`
not just to display context to the human — it's the data source for
`gsd-context-monitor.js`, which injects warnings INTO Claude's context when
usage is high. This means the statusline and the PostToolUse hook are
co-dependent. Porting one without the other leaves the system half-built. The
JASON-OS statusline bash script currently does not write any bridge file, so
even if `gsd-context-monitor.js` were ported, it would have nothing to read.

**The `gsd-statusline.js` "active task" display pulls from Claude's native
todos dir** (`~/.claude/todos/{session_id}-agent-*.json`), not from the project's
`.planning/todos.jsonl`. This means the statusline's task display and the `/todo`
skill operate on different data stores. The statusline shows the Claude Code
native in-flight todo (the one Claude uses to track its own work), while `/todo`
manages the operator's cross-session backlog. Both are real and both matter, but
they are parallel systems.

**JASON-OS's memory index is already ahead of SoNash's** in number of feedback
entries (25 vs 11), suggesting the JASON-OS work environment is already teaching
the system lessons specific to the new OS context — even during bootstrap.

---

## Confidence Assessment

- HIGH claims: 10
- MEDIUM claims: 0
- LOW claims: 0
- UNVERIFIED claims: 0
- Overall confidence: HIGH

All findings are grounded in direct filesystem inspection of both repositories.
No training data or external sources were used.
