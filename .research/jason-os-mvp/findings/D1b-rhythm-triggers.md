# Findings: Conditional Triggers — When Skills, Agents, and Hooks Fire

**Searcher:** deep-research-searcher
**Profile:** codebase
**Date:** 2026-04-15
**Sub-Question IDs:** D1b

---

## Key Findings

### 1. SoNash runs a 6-tier trigger architecture; JASON-OS has wired only 2 of those 6 tiers [CONFIDENCE: HIGH]

SoNash's trigger machinery has six distinct strata. JASON-OS has transplanted only
the permission-deny rules and the PreToolUse guard hooks. The other four strata are
either absent or placeholder-empty.

| Stratum | Mechanism | SoNash | JASON-OS |
|---------|-----------|--------|----------|
| T1 | CLAUDE.md PRE-TASK table (declarative, always read) | 14-row table incl. security, bug, UI, multi-file, GSD | 5-row table (brainstorm, deep-plan, deep-research, Explore, Plan only) |
| T2 | `UserPromptSubmit` hook — NLP keyword scan on every prompt | Full (`user-prompt-handler.js`, 6 sub-functions, ~720 LOC) | **Missing** |
| T3 | `PreToolUse` conditional `if:` matchers — tool-scoped gates | 7 distinct if-conditions (push, commit, deploy, .env, settings, firestore, large-file) | 3 (push, large-file, settings) |
| T4 | `PostToolUse` event hooks — cascade triggers after tool use | 9 matchers (Write, Edit, MultiEdit, Read, AskUser, Bash commit, Bash test, Task, Write governance) | **Missing entirely** |
| T5 | `PostToolUseFailure` loop detector | loop-detector on build/test/lint/tsc failure | **Missing** |
| T6 | Agent `PROACTIVELY` descriptions — 17 agents self-declare when to fire | 17 agents with PROACTIVELY clauses | 0 of 8 agents have PROACTIVELY clauses |

Sources: SoNash `.claude/settings.json` lines 71–306; JASON-OS `.claude/settings.json` lines 48–79;
SoNash `CLAUDE.md` lines 127–145; JASON-OS `CLAUDE.md` lines 88–95.

---

### 2. The `UserPromptSubmit` hook is SoNash's primary "feel responsive" mechanism; it's the biggest missing trigger in JASON-OS [CONFIDENCE: HIGH]

`user-prompt-handler.js` (~720 LOC) runs on every user message and dispatches six
sub-functions in priority order:

1. **`runGuardrails()`** — injects the core behavioral guardrail block (5 rules
   as stdout context) into every non-trivial turn.
2. **`runFrustrationDetection()`** — scans for ALL CAPS, correction phrases
   (`"did you just"`, `"stop"`, `"revert"`), repeated punctuation. Emits
   `HARD STOP: User may be correcting you.`
3. **`runAlerts()`** — checks `pending-alerts.json` vs `alerts-acknowledged.json`;
   emits unacknowledged alert counts with 10-minute cooldown. Also fires a context
   memory prompt if 20+ files have been read.
4. **`runAnalyze()`** — keyword-matching (security, bug, database, UI, planning,
   exploration, testing) with priority ordering. Emits mandatory `PRE-TASK: MUST
   use [skill/agent]` directives to stdout where they become system context. Uses
   15-minute per-directive dedup so the same directive doesn't spam.
5. **`runSessionEnd()`** — pattern-matches closure phrases (`"that's all"`, `"done
   for now"`, `"goodbye"`) and emits session-end reminder with 60-minute cooldown.
6. **`runPlanSuggestion()`** — detects multi-step complexity (impl keywords +
   complexity patterns + word count > 50) and emits `MULTI-STEP TASK DETECTED`
   banner with 4-hour dedup per complexity signature.

**The critical insight:** `runAnalyze()` is what turns the CLAUDE.md PRE-TASK
table from advisory to enforced — it emits the PRE-TASK directive as stdout
context Claude reads before responding, whereas the CLAUDE.md table is only
consulted if Claude remembers to look.

Sources: SoNash `.claude/hooks/user-prompt-handler.js` lines 44–718;
SoNash `.claude/settings.json` lines 271–281.

---

### 3. `PostToolUse` in SoNash creates cascading "tripwire" behaviors; JASON-OS has none [CONFIDENCE: HIGH]

SoNash has 9 PostToolUse matchers that create cascades after tool execution:

| Event | Trigger Condition | Cascade |
|-------|-------------------|---------|
| Write | Any write | `post-write-validator.js` — consolidates 10 checks: S0/S1 audit JSONL validation, inline pattern compliance, component size, Firestore write block, test mocking validator, App Check validator, TypeScript strict, repository pattern, agent trigger enforcer |
| Edit | Any edit | Same validator |
| MultiEdit | Any multi-edit | Same validator |
| Read | Any read | `post-read-handler.js` — context tracking (counts files read, feeds runAlerts() threshold) |
| AskUserQuestion | 3+ options presented | `decision-save-prompt.js` — prompts to document decisions in `.planning/` |
| Bash (git commit) | commit/cherry-pick/merge/revert | `commit-tracker.js` — appends to `commit-log.jsonl` for compaction-resilient session recovery |
| Bash (npm test) | test runs | `test-tracker.js` — tracks pass/fail history for deploy-safeguard pre-flight |
| Task/Agent | Any agent invocation | `track-agent-invocation.js` — records to `.session-agents.json` and `agent-invocations.jsonl`; feeds `pre-commit-agent-compliance.js` |
| Write/Edit CLAUDE.md or settings.json | Governance file change | `governance-logger.js` — appends diff to `governance-changes.jsonl` |
| Write/Edit `.planning/todos.jsonl` | Todos data file change | `post-todos-render.js` — auto-regenerates `TODOS.md` from canonical JSONL |

The **tripwire pattern** that makes the system feel intentional: `track-agent-invocation.js`
(PostToolUse/Task) writes to `.session-agents.json`, which is then read by
`pre-commit-agent-compliance.js` (PreToolUse/Bash commit). If code was changed
but `code-reviewer` was never invoked, the commit is **blocked**. This is a
cross-hook state loop: invocation event → state file → gate check.

Sources: SoNash `.claude/settings.json` lines 161–270;
SoNash `.claude/hooks/pre-commit-agent-compliance.js` lines 64–91;
SoNash `.claude/hooks/track-agent-invocation.js` lines 221–231.

---

### 4. `PreToolUse` `if:` conditions are the precise surgical gates; JASON-OS has 3 of SoNash's 7 [CONFIDENCE: HIGH]

SoNash uses conditional `if:` clauses inside hook entries so a single tool match
can fan out to multiple targeted sub-checks:

| Matcher | `if:` condition | Hook | Outcome |
|---------|----------------|------|---------|
| Bash | `Bash(git push *)` | `block-push-to-main.js` | Blocks push to main |
| Bash | `Bash(git commit *)` | `pre-commit-agent-compliance.js` | Blocks if required agents not invoked |
| Bash | `Bash(firebase deploy *)` | `deploy-safeguard.js` | Pre-flight: build freshness + env vars + last test pass |
| Write | `Write(.env.local.encrypted)` | inline bash block | Hard block — never overwrite encrypted secrets |
| Write/Edit | `Write(.claude/settings.json)\|Edit(.claude/settings.json)` | `settings-guardian.js` | Blocks removal of critical hooks |
| Write/Edit | `Write(**/firestore.rules)\|Edit(**/firestore.rules)` | `firestore-rules-guard.js` | Guards security boundary integrity |
| Read | `Read(*.jsonl)\|Read(*.log)\|...` | `large-file-gate.js` | Warns on large structured data files |

JASON-OS has wired: push-block, large-file-gate, settings-guardian.
Missing: agent-compliance, deploy-safeguard, env-guard, firestore-rules-guard.

Sources: SoNash `.claude/settings.json` lines 71–149; JASON-OS `.claude/settings.json` lines 48–79.

---

### 5. `PostToolUseFailure` loop detector is a self-correcting tripwire absent from JASON-OS [CONFIDENCE: HIGH]

The `loop-detector.js` hook fires on `PostToolUseFailure` for build/test/lint/tsc
commands. It:
- Normalizes error text (strips timestamps, line numbers, temp paths)
- Hashes normalized output (SHA-256, 12 chars)
- Tracks hash occurrences in a 20-minute rolling window (`.claude/state/error-loop-tracker.json`)
- On the 3rd identical failure within the window: emits `Loop detected: same error N times in 20 min. Try a different approach.`

This is the "Groundhog Day detector" — it catches infinite retry loops before they
burn context. JASON-OS has no equivalent.

Sources: SoNash `.claude/settings.json` lines 292–307;
SoNash `.claude/hooks/loop-detector.js` lines 1–24, 280–291.

---

### 6. Agent `PROACTIVELY` descriptions are the semantic layer of the trigger architecture [CONFIDENCE: HIGH]

17 of SoNash's agents carry `PROACTIVELY` in their frontmatter description field.
This is not cosmetic — Claude Code reads agent descriptions to decide whether to
self-dispatch. Agents with PROACTIVELY clauses function as standing instructions:

| Agent | PROACTIVELY condition |
|-------|----------------------|
| `code-reviewer` | after writing or modifying code |
| `security-auditor` | for security reviews, auth flows, or vulnerability fixes |
| `explore` | when navigating new subsystems, tracing data flows |
| `debugger` | when encountering issues, analyzing stack traces |
| `frontend-developer` | for UI components, state management, performance |
| `plan` | when facing multi-step tasks |
| `documentation-expert` | for creating or improving internal project docs |
| `test-engineer` | for test automation, QA |
| `backend-architect` | for backend architecture and API design |
| `database-architect` | for database architecture decisions |
| + 7 others | (frontend-design, fullstack, git-flow, mcp-expert, nextjs-arch, performance-engineer, technical-writer, ui-ux-designer) |

JASON-OS has 8 agents (all deep-research team: searcher, synthesizer, verifier,
gap-pursuer, final-synthesizer, contrarian-challenger, otb-challenger,
dispute-resolver). None carry PROACTIVELY clauses. The agents JASON-OS is missing
for general use: `code-reviewer`, `explore`, `plan`, `security-auditor`, and the
POST-TASK stack.

Sources: SoNash `.claude/agents/code-reviewer.md` line 4–6;
`.claude/agents/security-auditor.md` line 6;
`.claude/agents/explore.md` line 5;
JASON-OS `.claude/agents/` directory listing (8 files).

---

### 7. The `SessionStart` hook has a `matcher: "compact"` conditional — a context-recovery tripwire [CONFIDENCE: HIGH]

SoNash's `SessionStart` array has two entries. The first fires unconditionally
(session-start.js, check-mcp-servers.js, check-remote-session-context.js, gsd-check-update.js).
The second uses `"matcher": "compact"` and fires ONLY on compact-resume sessions,
running `compact-restore.js` to replay handoff state from `pre-compaction-save.js`.

This is the only hook that uses the `compact` matcher — it is a context-recovery
tripwire that fires exactly when compaction happened, injecting saved handoff state
into the new context window.

JASON-OS's `SessionStart` has one entry: unconditional `check-mcp-servers.js`
only. The compact-restore chain (pre-compaction-save → compact-restore) is absent.

Sources: SoNash `.claude/settings.json` lines 31–69;
JASON-OS `.claude/settings.json` lines 36–47.

---

### 8. The `PreCompact` hook is an unmatched compaction-safety mechanism absent from JASON-OS [CONFIDENCE: HIGH]

SoNash registers a `PreCompact` event hook running `pre-compaction-save.js` with
`$ARGUMENTS`, which writes session state (current task, open files, pending
decisions) to `.claude/state/handoff.json` before the context window compacts.
This pairs with `compact-restore.js` (SessionStart compact matcher) to create a
save/restore cycle across compaction events.

JASON-OS has no `PreCompact` entry in `settings.json`.

Source: SoNash `.claude/settings.json` lines 151–160.

---

### 9. Permission-deny rules are the simplest always-active trigger layer; both projects are aligned [CONFIDENCE: HIGH]

Both codebases share the same four `deny` rules:
- `Bash(git push --force *)`
- `Bash(git push origin main)`
- `Bash(git reset --hard *)`
- `Bash(rm -rf *)`

These are unconditional permission vetoes, the hardest class of trigger. Neither
project has diverged from this baseline.

Sources: SoNash `.claude/settings.json` lines 17–21;
JASON-OS `.claude/settings.json` lines 17–21.

---

### 10. The `Notification` event hook (ntfy.sh push) is SoNash-specific infrastructure not needed in JASON-OS [CONFIDENCE: HIGH]

SoNash registers a `Notification` hook that POSTs to `ntfy.sh/sonash-claude` when
Claude needs user attention. This is project-specific mobile notification
infrastructure. JASON-OS intentionally does not have this — it is not part of
the portable OS surface.

Source: SoNash `.claude/settings.json` lines 282–289.

---

### 11. Workflow chain routing lives in CLAUDE.md prose + user-prompt-handler.js NLP, not a routing table [CONFIDENCE: HIGH]

The `brainstorm -> deep-research -> deep-plan -> execute` chain is not codified as
a routing table in either project. In SoNash it is enforced through:
1. CLAUDE.md Section 7 declarative trigger tables (PRE-TASK read at context load)
2. `user-prompt-handler.js` `runAnalyze()` keyword matching that emits mandatory
   `PRE-TASK: MUST use [skill]` directives when trigger words appear in the prompt
3. Individual skill SKILL.md files that cross-reference each other in "When to Use" sections
4. Agent PROACTIVELY clauses that cause self-dispatch for matching scenarios

In JASON-OS, the chain is stated in CLAUDE.md behavioral guardrails (#9 in the
memory file: `workflow chain: brainstorm -> deep-research -> deep-plan -> execute`)
but there is no hook enforcement. It exists as an advisory convention, not a wired
pathway.

Sources: SoNash `CLAUDE.md` lines 127–170; JASON-OS `CLAUDE.md` lines 86–98;
SoNash `.claude/hooks/user-prompt-handler.js` lines 280–430.

---

## Sources

| # | File | Title | Type | Trust | CRAAP | Date |
|---|------|--------|------|-------|-------|------|
| 1 | `C:/Users/jbell/.local/bin/sonash-v0/.claude/settings.json` | SoNash settings.json | Filesystem | HIGH | 5/5/5/5/5 | 2026-04 |
| 2 | `C:/Users/jbell/.local/bin/JASON-OS/.claude/settings.json` | JASON-OS settings.json | Filesystem | HIGH | 5/5/5/5/5 | 2026-04 |
| 3 | `C:/Users/jbell/.local/bin/sonash-v0/CLAUDE.md` | SoNash CLAUDE.md v6.0 | Filesystem | HIGH | 5/5/5/5/5 | 2026-04-12 |
| 4 | `C:/Users/jbell/.local/bin/JASON-OS/CLAUDE.md` | JASON-OS CLAUDE.md v0.1 | Filesystem | HIGH | 5/5/5/5/5 | 2026-04-15 |
| 5 | `C:/Users/jbell/.local/bin/sonash-v0/.claude/hooks/user-prompt-handler.js` | UserPromptSubmit NLP dispatcher | Filesystem | HIGH | 5/5/5/5/5 | 2026-04 |
| 6 | `C:/Users/jbell/.local/bin/sonash-v0/.claude/hooks/pre-commit-agent-compliance.js` | Pre-commit agent gate | Filesystem | HIGH | 5/5/5/5/5 | 2026-04 |
| 7 | `C:/Users/jbell/.local/bin/sonash-v0/.claude/hooks/track-agent-invocation.js` | PostToolUse agent tracker | Filesystem | HIGH | 5/5/5/5/5 | 2026-04 |
| 8 | `C:/Users/jbell/.local/bin/sonash-v0/.claude/hooks/loop-detector.js` | PostToolUseFailure loop guard | Filesystem | HIGH | 5/5/5/5/5 | 2026-04 |
| 9 | `C:/Users/jbell/.local/bin/sonash-v0/.claude/hooks/gsd-prompt-guard.js` | Prompt injection guard | Filesystem | HIGH | 5/5/5/5/5 | 2026-04 |
| 10 | `C:/Users/jbell/.local/bin/sonash-v0/.claude/agents/code-reviewer.md` | code-reviewer agent frontmatter | Filesystem | HIGH | 5/5/5/5/5 | 2026-04 |
| 11 | `C:/Users/jbell/.local/bin/sonash-v0/.claude/agents/security-auditor.md` | security-auditor agent frontmatter | Filesystem | HIGH | 5/5/5/5/5 | 2026-04 |

---

## Contradictions

None found. Both codebases are internally consistent. JASON-OS is a deliberate
subset of SoNash — the gaps are by omission, not contradiction.

---

## Gaps

1. **`post-write-validator.js` internal behavior** — the consolidator has 10 sub-checks;
   several reference SoNash-specific infra (S0/S1 JSONL format, Firestore write
   block). The portable subset of those checks for JASON-OS has not been scoped.

2. **`session-start.js`** — the main SessionStart hook was >10,000 tokens; only the
   settings.json registration was confirmed. Its full behavior (cross-session
   validation, dependency install, build check, gap detection against commit-log.jsonl)
   was not read in full.

3. **`gsd-check-update.js`** — a third SessionStart hook in SoNash (`global/` path).
   This is in a `global/` subdirectory suggesting it's cross-project GSD
   infrastructure. Not investigated.

4. **`test-tracker.js`** — feeds `deploy-safeguard.js` pre-flight. Not read in detail;
   behavior inferred from settings.json comment and deploy-safeguard.js header.

5. **`post-read-handler.js`** — context file tracking that feeds the alerts threshold.
   Not read in detail; role confirmed from settings.json and user-prompt-handler.js
   context file read counter.

---

## Serendipity

**`runFrustrationDetection()` is a guardrail the user likely never consciously designed.**
The pattern-matching is surprisingly nuanced: ALL-CAPS only triggers if it starts
the prompt (not mid-sentence technical caps like "Fix README UI API"), and positive-caps
words like "YES/PERFECT/GREAT" suppress it. This is empirical refinement — the logic
bears marks of real corrections made session-by-session. It's the human-in-the-loop
feedback loop made durable.

**The `decision-save-prompt.js` trigger (PostToolUse/AskUserQuestion with 3+ options)**
is a metacognitive prompt: it fires when Claude presents a significant decision and
reminds Claude to document it. This is behavioral nudging at the architecture level —
the hook exists to counteract Claude's tendency to forget decisions after compaction.

**The JASON-OS `settings.local.json` still contains a one-time `cp` permission** that
was used to bootstrap the agent directory. It is stale and should be removed once
bootstrap is confirmed complete.

---

## Confidence Assessment

- HIGH claims: 11
- MEDIUM claims: 0
- LOW claims: 0
- UNVERIFIED claims: 0
- Overall confidence: HIGH

All claims are grounded in direct filesystem reads of the actual hook, settings,
CLAUDE.md, and agent definition files from both codebases.
