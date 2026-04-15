# Findings: SoNash `/session-end` Archaeology

**Searcher:** deep-research-searcher (D3a)
**Profile:** codebase
**Date:** 2026-04-15
**Sub-Question IDs:** D3a — session-end-archaeology

---

## Key Findings

### 1. Full SKILL.md Structure: 4 Phases, 10+ Steps [CONFIDENCE: HIGH]

The session-end skill (`~/.local/bin/sonash-v0/.claude/skills/session-end/SKILL.md`, v2.2,
2026-03-13) is a linear pipeline in 4 named phases. No sub-skills, no companion REFERENCE.md —
just the single SKILL.md file.

**Phase 1: Context Preservation (Steps 1-3) — MUST**

- Step 1: `git log --oneline -10` — reconstruct what was done
- Step 2: Update SESSION_CONTEXT.md — ALL THREE sections mandatory (recent session summaries,
  quick status table, next session goals). Archive older summaries to SESSION_HISTORY.md.
  Keep SESSION_CONTEXT.md under ~300 lines.
- Step 3: ROADMAP.md hygiene — mark completed items `[x]` (SHOULD, skip if no feature work)

**Phase 2: Compliance Review (Steps 4-6) — SHOULD**

- Step 4: Agent compliance check — read `.claude/hooks/.session-agents.json` and
  `.claude/hooks/.agent-trigger-state.json`, compare `agentsInvoked` against suggestions
- Step 4b: Agent invocation summary — read `.claude/state/agent-invocations.jsonl`,
  group by agent/skill, show counts + success rates
- Step 4c: Planning data summary — read `.planning/system-wide-standardization/decisions.jsonl`
  and `changelog.jsonl`, surface changes in last 7 days
- Step 5: Override audit — `node scripts/log-override.js --list`; flag unjustified overrides
- Step 5b: Hook learning synthesizer — reads `.claude/state/override-log.jsonl`,
  `.claude/state/hook-warnings-log.jsonl`, `.claude/state/health-score-log.jsonl` to surface
  top 3 recurring hook issues over 7 days
- Step 6: Update session state — `npm run hooks:health -- --end` (writes `lastEnd` timestamp
  to `.claude/hooks/.session-state.json`)

**Phase 3: Metrics & Data Pipeline (Step 7) — MUST**

Four scripts run sequentially; failures are logged but do not stop the pipeline:

| # | Command | Output artifact | SoNash-specific? |
|---|---------|-----------------|-----------------|
| 7a | `npm run reviews:sync -- --apply` | `reviews.jsonl` | YES — reviews system |
| 7b | `node .claude/skills/ecosystem-health/scripts/run-ecosystem-health.js` | `ecosystem-health-log.jsonl` | YES — not ported |
| 7c | `node scripts/debt/consolidate-all.js` | `MASTER_DEBT.jsonl` | YES — TDMS |
| 7d | `node scripts/debt/generate-metrics.js` | `metrics.json`, `METRICS.md` | YES — TDMS |

Also includes: ecosystem health triage check (7c.triage), hook data summary (7f),
commit analytics from `commit-log.jsonl` (7g).

**Phase 4: Cleanup & Closure (Steps 8-10) — MUST**

- Step 8: Delete ephemeral state files — `.session-agents.json`, `.agent-trigger-state.json`,
  `pending-reviews.json`. Conditionally delete `handoff.json` if no in-progress tasks.
- Step 9: Pre-commit review — `git status`, dirty tree check, script pass/fail summary.
  Gate: ask user "Ready to commit and push? [Y/n]"
- Step 10: `npm run session:end` — runs `scripts/session-end-commit.js` which commits
  SESSION_CONTEXT.md and pushes. Unless `--no-push` flag was passed.

**Learning loop (after Step 10):** Generate 2-3 auto-learnings to
`memory/session-end-learnings.md`. Optional user feedback. Surface on next startup.

**Warm-up announcement:** "Session-end pipeline: context preservation, compliance review,
metrics capture, and final commit. 4 phases, ~2-3 minutes."

**Duplicate detection:** Check if SESSION_CONTEXT.md was already updated today and if the
checklist already ran this conversation. If yes, warn and skip redundant steps.

---

### 2. The `npm run session:end` Script Is Portable [CONFIDENCE: HIGH]

`scripts/session-end-commit.js` is self-contained and has ZERO SoNash-specific dependencies.
What it does:

1. Validates it's inside a git repo (`git rev-parse --show-toplevel`)
2. Validates SESSION_CONTEXT.md was meaningfully updated (checks diff for Quick Status,
   Next Session Goals, Session Summary sections)
3. Patches SESSION_CONTEXT.md: `"**Uncommitted Work**: Yes"` → `"**Uncommitted Work**: No"`
4. Commits with `git commit --only -m "docs: session end - mark complete"` — only
   SESSION_CONTEXT.md, using `--only` to avoid accidentally sweeping staged files
5. Pushes to current branch with `git push -u origin <branch>`

Security model: `execFileSync` with args arrays throughout (no command injection). Calls
`scripts/log-override.js` for audit trail of the doc-check skips. Requires `scripts/lib/safe-fs`
(safe atomic writes).

**Portability verdict: HIGH.** The only coupling is to `SESSION_CONTEXT.md` existing at the
repo root and `scripts/lib/safe-fs.js`. Both are generic enough to port directly.

---

### 3. Hook Architecture: No Stop Hook for Session-End [CONFIDENCE: HIGH]

SoNash has zero `Stop` hooks registered in `.claude/settings.json`. Session-end is
**entirely skill-invoked** — there is no automatic trigger when Claude stops.

However, there IS a **soft nudge mechanism** in the `UserPromptSubmit` hook
(`user-prompt-handler.js`): it detects farewell phrases (`"bye"`, `"signing off"`,
`"that's all"`, `"thanks"` < 15 chars, etc.) and injects into stdout:
`"SESSION ENDING: User may be wrapping up. Suggest /session-end if appropriate."`
It also prints a stderr reminder listing the four key checklist items. Cooldown: once per
60 minutes per `.claude/hooks/.session-end-cooldown.json`.

The **cross-session tracking loop** is anchored to `.claude/hooks/.session-state.json`
with two timestamps: `lastBegin` (written by SessionStart hook) and `lastEnd` (written by
`npm run hooks:health -- --end` in Step 6). On next SessionStart, if `lastEnd < lastBegin`,
the hook emits a `session-end-missing` warning.

The `check-hook-health.js` script is the dual authority for this: it reads the same state
file and can report "Previous session completed normally" or warn about a long session gap.

---

### 4. Artifact Manifest — What Gets Written [CONFIDENCE: HIGH]

| File | Location | Step | Read/Write | SoNash-only? |
|------|----------|------|------------|--------------|
| SESSION_CONTEXT.md | repo root | 2, 10 | R/W | No — generic |
| SESSION_HISTORY.md | docs/ | 2 | W (archive) | No — generic |
| ROADMAP.md | repo root | 3 | R/W | No — generic |
| .session-agents.json | .claude/hooks/ | 4, 8 | R/D | No — generic |
| .agent-trigger-state.json | .claude/hooks/ | 4, 8 | R/D | No — generic |
| pending-reviews.json | .claude/state/ | 4, 8 | R/D | No — generic |
| agent-invocations.jsonl | .claude/state/ | 4b | R | No — generic |
| decisions.jsonl | .planning/system-wide-standardization/ | 4c | R | Partially — naming |
| changelog.jsonl | .planning/system-wide-standardization/ | 4c | R | Partially — naming |
| override-log.jsonl | .claude/state/ | 5, 7f | R | No — generic |
| hook-warnings-log.jsonl | .claude/state/ | 5b | R | No — generic |
| health-score-log.jsonl | .claude/state/ | 5b, 7f | R | No — generic |
| .session-state.json | .claude/hooks/ | 6 | W | No — generic |
| .session-end-cooldown.json | .claude/hooks/ | (user-prompt) | R/W | No — generic |
| reviews.jsonl | root | 7a | W | YES — reviews system |
| ecosystem-health-log.jsonl | .claude/state/ | 7b | W | YES — ecosystem-health script |
| MASTER_DEBT.jsonl | root | 7c | W | YES — TDMS |
| metrics.json | root | 7d | W | YES — TDMS |
| METRICS.md | root | 7d | W | YES — TDMS |
| commit-log.jsonl | .claude/state/ | 7g | R | No — written by commit-tracker hook |
| handoff.json | .claude/state/ | 8 | D (conditional) | No — generic |

---

### 5. SoNash-Specific Dependencies (The Blockers) [CONFIDENCE: HIGH]

The BOOTSTRAP_DEFERRED.md correctly identified the blockers. Full dependency map:

**Phase 3 — ALL four commands are SoNash-specific:**

1. `npm run reviews:sync -- --apply` — The reviews system is a SoNash-internal v1/v2
   JSONL pipeline for tracking code-review cycles. No equivalent exists in JASON-OS.
   The SKILL.md notes this is marked DEPRECATED in favor of `reviews:lifecycle` but still
   called here.

2. `node .claude/skills/ecosystem-health/scripts/run-ecosystem-health.js` — The
   ecosystem-health skill was NOT ported to JASON-OS (confirmed: not in
   `~/.local/bin/JASON-OS/.claude/skills/`). Produces the health score dashboard that the
   session-end rules say MUST be shown to the user.

3. `node scripts/debt/consolidate-all.js` — TDMS (Technical Debt Management System).
   Not ported. Produces MASTER_DEBT.jsonl.

4. `node scripts/debt/generate-metrics.js` — TDMS. Not ported. Produces metrics.json
   and METRICS.md.

**Step 10 dependency:**

- `npm run session:end` calls `scripts/session-end-commit.js` which needs
  `scripts/lib/safe-fs.js`. This IS portable and self-contained (see Finding #2).

**Step 3 soft dependency:**

- ROADMAP.md — SoNash has this; JASON-OS has `.planning/jason-os/PLAN.md` but no
  root-level ROADMAP.md. Would need a naming decision.

**Context files expected by session-begin (the consumer):**

- SESSION_CONTEXT.md with specific section headers (Session Summaries, Quick Status Table,
  Next Session Goals). Format contract between session-end and session-begin.

---

### 6. The "Ritual" — Operator Experience [CONFIDENCE: HIGH]

The operator flow when running `/session-end`:

1. **Announcement:** "Session-end pipeline: context preservation, compliance review, metrics
   capture, and final commit. 4 phases, ~2-3 minutes."
2. **Git review:** AI reads `git log --oneline -10` and summarizes what was done
3. **Context update:** AI rewrites all three sections of SESSION_CONTEXT.md interactively
   (describes what was accomplished, references commits, sets next goals)
4. **Roadmap tick:** AI marks completed items `[x]` in ROADMAP.md if feature work was done
5. **Agent audit:** AI surfaces any skills that were triggered but not invoked, any pending
   reviews in the queue
6. **Hook learnings:** 3-line digest of recurring hook issues (top patterns from 7 days of
   state logs)
7. **Metrics pipeline:** Four scripts run automatically; user sees health score dashboard
   and velocity summary; script failures are flagged but don't stop the pipeline
8. **State cleanup:** Ephemeral JSON files deleted silently
9. **Pre-commit gate:** AI presents `git status`, lists which scripts passed/failed, asks
   "Ready to commit and push? [Y/n]" — user must explicitly confirm
10. **Commit + push:** `npm run session:end` commits only SESSION_CONTEXT.md with a canonical
    commit message, pushes to current branch
11. **Learning capture:** AI generates 2-3 insights from this session-end run (any steps
    skipped? any failures?), saves to auto-memory
12. **Feedback prompt:** "Any steps to add, remove, or reorder?" — accepts empty/none

The ritual's psychological weight comes from Steps 3 and 9: the AI actively rewrites your
context document with you watching, then gates on your explicit Y/n before committing.
This is the "home feel" — the session ends on *your* terms with a human moment of
review before close.

---

### 7. Why Deferred — Root Cause Analysis [CONFIDENCE: HIGH]

BOOTSTRAP_DEFERRED.md states the blocker as Phase 3 (Steps 7a-7d) and Step 10's
`npm run session:end`. The actual dependency tree:

**Hard blockers (prevent the skill from running at all without errors):**
- `npm run reviews:sync` — script doesn't exist in JASON-OS
- `ecosystem-health/scripts/run-ecosystem-health.js` — skill not ported
- `scripts/debt/consolidate-all.js` — not ported
- `scripts/debt/generate-metrics.js` — not ported

**Soft blockers (skill runs but outputs are wrong/empty):**
- No SESSION_CONTEXT.md at JASON-OS repo root (skill creates context docs as output;
  JASON-OS would need one bootstrapped first)
- No ROADMAP.md at repo root (Step 3 silently skips, but the artifact chain breaks)
- No `scripts/lib/safe-fs.js` (needed by session-end-commit.js for Step 10)

**Not a blocker (confirmed portable):**
- `.session-state.json` mechanism — pure JSON, no SoNash coupling
- The pre-commit gate logic (Step 9) — pure git commands
- The ephemeral file cleanup (Step 8) — pure `rm -f`
- The learning loop — pure auto-memory writes
- The user-prompt farewell detector — pure string matching

---

### 8. Proposed v0 Session-End for JASON-OS [CONFIDENCE: MEDIUM]

A stripped v0 that captures the "home feel" without SoNash dependencies:

**Preserve (no changes needed):**
- Phase 1 entirely (Steps 1-3): `git log`, SESSION_CONTEXT.md update, ROADMAP check
- Phase 2 compliance review skeleton (Steps 4, 4b, 4c): read state files if they exist,
  skip silently if missing
- Step 5b hook learning synthesizer: reads generic state logs — portable
- Step 8 cleanup: `rm -f` the three ephemeral JSON files
- Step 9 pre-commit gate: git status + Y/n confirmation

**Replace:**
- Step 6 (`npm run hooks:health -- --end`) → inline the state write directly:
  write `lastEnd` timestamp to `.claude/hooks/.session-state.json` via a simple Node
  one-liner or inline bash. Removes the npm script dependency.
- Step 10 (`npm run session:end`) → inline the commit directly:
  `git add SESSION_CONTEXT.md && git commit --only -m "docs: session end - mark complete" -- SESSION_CONTEXT.md && git push -u origin <branch>`
  Port `scripts/session-end-commit.js` as-is (it has no SoNash deps) or inline.

**Drop entirely (Phase 3):**
- 7a `npm run reviews:sync` — no reviews system in JASON-OS
- 7b ecosystem-health script — not ported
- 7c `scripts/debt/consolidate-all.js` — TDMS not ported
- 7d `scripts/debt/generate-metrics.js` — TDMS not ported
- Steps 7f (hook data summary) and 7g (commit analytics) — depend on state logs that
  the hooks write; can include as best-effort reads if `.claude/state/` files exist

**JASON-OS bootstrap prerequisites for v0:**
1. SESSION_CONTEXT.md at repo root with the three required sections
2. `scripts/lib/safe-fs.js` (or inline the atomic write pattern)
3. `.claude/hooks/.session-state.json` initialized by the SessionStart hook

**v0 operator experience (what remains after stripping):**
- Announcement banner
- Git review + SESSION_CONTEXT.md rewrite (the core ritual — preserved)
- ROADMAP/PLAN.md check (adapt path to `.planning/jason-os/PLAN.md`)
- Agent compliance check (best-effort from state files)
- Hook learning digest (best-effort from state logs)
- Ephemeral file cleanup
- Pre-commit gate (Y/n confirmation — preserved)
- Commit + push SESSION_CONTEXT.md (preserved, just inlined)
- Learning loop (preserved)

**Estimated SKILL.md complexity for v0:** ~200 lines (vs 450 in SoNash). Phase 3 drops
to a single note: "Metrics pipeline: not yet configured. Skip." The ritual feel is
fully intact — the SESSION_CONTEXT.md rewrite and the Y/n gate are the emotional core,
not the metrics pipeline.

---

## Sources

| # | Path | Title | Type | Trust | Date |
|---|------|-------|------|-------|------|
| 1 | `~/.local/bin/sonash-v0/.claude/skills/session-end/SKILL.md` | session-end SKILL.md v2.2 | filesystem | HIGH | 2026-03-13 |
| 2 | `~/.local/bin/sonash-v0/scripts/session-end-commit.js` | npm run session:end implementation | filesystem | HIGH | 2026-01-29 |
| 3 | `~/.local/bin/sonash-v0/.claude/hooks/session-start.js` | SessionStart hook (cross-session validation) | filesystem | HIGH | 2026-03-xx |
| 4 | `~/.local/bin/sonash-v0/.claude/hooks/pre-compaction-save.js` | PreCompact hook | filesystem | HIGH | 2026-03-xx |
| 5 | `~/.local/bin/sonash-v0/.claude/hooks/user-prompt-handler.js` | UserPromptSubmit hook (farewell detector) | filesystem | HIGH | 2026-03-xx |
| 6 | `~/.local/bin/sonash-v0/.claude/settings.json` | Hook registrations (Stop, SessionStart, PostToolUse, etc.) | filesystem | HIGH | 2026-04-xx |
| 7 | `~/.local/bin/sonash-v0/scripts/check-hook-health.js` | hooks:health script (session state R/W) | filesystem | HIGH | 2026-03-xx |
| 8 | `~/.local/bin/sonash-v0/.claude/skills/session-begin/SKILL.md` | session-begin SKILL.md v2.0 | filesystem | HIGH | 2026-03-16 |
| 9 | `~/.local/bin/sonash-v0/.claude/skills/checkpoint/SKILL.md` | checkpoint SKILL.md v1.0 | filesystem | HIGH | 2026-02-25 |
| 10 | `~/.local/bin/sonash-v0/.claude/skills/todo/SKILL.md` | todo SKILL.md v1.2 | filesystem | HIGH | 2026-04-10 |
| 11 | `~/.local/bin/JASON-OS/.planning/jason-os/BOOTSTRAP_DEFERRED.md` | JASON-OS deferred items doc | filesystem | HIGH | 2026-04-15 |
| 12 | `~/.local/bin/sonash-v0/package.json` | npm scripts registry | filesystem | HIGH | 2026-04-xx |

---

## Contradictions

**None.** The BOOTSTRAP_DEFERRED.md analysis is accurate and internally consistent with
what the filesystem shows. All four Phase 3 commands are confirmed absent from JASON-OS.
The `scripts/session-end-commit.js` is confirmed as self-contained (no SoNash deps) —
which slightly contradicts BOOTSTRAP_DEFERRED's framing of "Step 10 also relies on
`npm run session:end`" as a hard blocker. It relies on it only as a script name, not
on any SoNash-specific system. The script itself can be ported as-is.

---

## Gaps

1. **`scripts/lib/safe-fs.js` contents not verified.** This is required by
   `session-end-commit.js`. Not confirmed whether it has SoNash deps. If it uses
   Firebase or SoNash-specific paths, Step 10 would need an inline replacement.

2. **SESSION_CONTEXT.md format contract.** The exact section headers that
   `session-end` writes and `session-begin` parses were not extracted. The session-begin
   SKILL.md v2.0 mentions "Session #N" counter increments and a "Last Updated" field
   but doesn't show the full schema. A portability risk if JASON-OS's SESSION_CONTEXT.md
   schema diverges.

3. **`scripts/log-override.js`** — used in the session-end-commit.js for audit trail.
   Not verified for SoNash coupling. Minor risk: if absent in JASON-OS, the commit step
   will emit a non-fatal error but continue.

4. **No `session-end` companion REFERENCE.md.** Unlike `session-begin` (which references
   a REFERENCE.md) and `pr-review` (which has 4 reference files), session-end is a
   standalone SKILL.md. No hidden companion files to find.

5. **`npm run hooks:health`** (Step 6) — the full `check-hook-health.js` behavior was
   sampled but not fully read. The `--end` flag write was confirmed; other side effects
   (health score grading, hook syntax validation) were not fully audited.

---

## Serendipity

**The farewell detector is a hidden gem.** The `user-prompt-handler.js` hook actively
monitors for goodbye phrases and injects a session-end reminder into the AI's context
stream. This is the hook that makes the AI *notice* when a session is ending organically,
before the user explicitly says `/session-end`. JASON-OS already has the SKILL but not
this behavioral nudge. The nudge is 100% portable — it's pure string regex matching with
no SoNash deps. Porting it would complete the ritual feel even before session-end is
fully wired up.

**The `--no-push` flag exists.** `/session-end --no-push` runs Steps 1-8 (context +
compliance + metrics + cleanup) but skips the commit. Useful for mid-day saves that
aren't final closures. This variant is entirely portable (all SoNash deps are in Phase 3
which you'd already be skipping in v0).

**todo skill has a session-end integration point.** todo/SKILL.md specifies:
"Before closure, the session-end skill SHOULD read `todos.jsonl` and prompt: 'You have N
open todos. Review before closing? (y/n/skip)'". This isn't in the current session-end
SKILL.md — it's a planned integration that exists only in the todo skill's own spec. A
v0 session-end could implement this cheaply since JASON-OS already has the todo skill ported.

**Session-end v2.0 was a full rewrite from skill-audit.** The version history shows v2.0
(2026-03-07) applied 32 decisions from a skill-audit pass, increasing the score from 51→73+.
The current skill is already an audited, mature form. v0 for JASON-OS doesn't need to re-audit
— just strip Phase 3 and inline the two npm scripts.

---

## Confidence Assessment

- HIGH claims: 7
- MEDIUM claims: 1
- LOW claims: 0
- UNVERIFIED claims: 0
- Overall confidence: HIGH

All findings sourced directly from filesystem files (T1 evidence). No web search or
training-data inference used.
