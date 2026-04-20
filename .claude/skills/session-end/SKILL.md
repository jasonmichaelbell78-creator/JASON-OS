---
name: session-end
description: |
  Session closure pipeline — context preservation, optional compliance review,
  and final commit. Ensures the next session starts with accurate context.
  v0: Foundation-scoped; Phase 3 metrics pipeline and most Phase 2 compliance
  steps are gated on Layer 2 hooks landing.
compatibility: agentskills-v1
metadata:
  short-description: Session closure — context + commit
  version: 2.2-jasonos-v0.1
---

<!-- prettier-ignore-start -->
**Document Version:** 2.2 (JASON-OS port v0.1)
**Last Updated:** 2026-04-17
**Status:** ACTIVE (Foundation-scoped)
**Lineage:** SoNash 41526 `session-end` v2.2 → JASON-OS v0.1 port
<!-- prettier-ignore-end -->

# Session End Pipeline

Structured closure workflow that preserves session context for the next session
and commits all changes. Designed to prevent stale context — the #1 cause of
wasted time in subsequent sessions.

**JASON-OS v0 note:** The Foundation port strips Phase 3 (SoNash-specific
metrics pipeline: reviews:sync, ecosystem-health, TDMS debt consolidation /
metrics generation) and most of Phase 2 (gated on Layer 2 hooks: agent
invocation tracking, override audit, hook warnings synthesizer). Phase 1 + 4
run clean. Additional phases re-activate when their prerequisite hooks land
(see Post-Foundation Deferrals / `/todo` backlog `#foundation-deferral`).

## Critical Rules (MUST follow)

1. **MUST update `SESSION_CONTEXT.md`** — all five fields (Counter,
   Uncommitted Work, Last Updated, Quick Status, Next Session Goals). Skipping
   causes the next session to start with stale context.
2. **MUST show pre-commit summary** before pushing — `git status`, any script
   output, any warnings. Never push blind.
3. **MUST note script failures** — if any script fails, log it, continue with
   remaining steps, and flag in the pre-commit summary.
4. **MUST honor `--no-push`** — all prior steps still run; only the push is
   skipped. Context is preserved locally.

## When to Use

- End of work session (done for the day)
- Before closing Claude Code
- When switching to a different project
- User explicitly invokes `/session-end`

## When NOT to Use

- **Mid-session save** — use `/checkpoint` instead (preserves state without
  closure)
- **Quick break without pushing** — use `/session-end --no-push` (runs steps
  1–9, skips push in step 10)
- **Still actively working** — don't run yet; session-end is for closure

> **Routing:** `/session-end` = full closure (context + commit + push).
> `/checkpoint` = mid-session state preservation without closure.

## Inputs

This skill needs:

- **Conversation context** — what was accomplished this session
- **`SESSION_CONTEXT.md`** — current state to update (5-field SoNash format
  per D12)
- **State files** — best-effort: `.claude/hooks/.session-agents.json`,
  `.claude/state/pending-reviews.json`, `.claude/state/handoff.json`. These
  are Layer 2 outputs — skip silently if absent.

**Compaction recovery (MUST):** If conversation context is unavailable after
compaction, reconstruct from git commits — they are the most reliable context
source:

```bash
git log --oneline -20
git diff --stat HEAD~10
```

State files are secondary (may already be cleaned up by Step 7).

## Anti-Patterns

- **Running mid-task** — finish current work first, then close the session
- **Skipping Step 2** — stale SESSION_CONTEXT.md is the #1 session-start problem
- **Committing on wrong branch** — verify you're on the branch where session
  work was done
- **Running twice** — check duplicate detection before re-running

## Duplicate Detection (MUST)

Before running, check if session-end already ran this session:

1. Was `SESSION_CONTEXT.md` already updated today with a current session
   summary?
2. Did the conversation already complete this checklist?

If yes, skip redundant steps. Warn the user: "Session-end already ran this
session. Re-running would duplicate the session summary."

---

## Warm-Up (MUST — present at start)

```
Session-end pipeline: context preservation + commit. Foundation v0 scope —
Phases 1 + 4 fully wired; Phases 2–3 mostly gated on Layer 2 hooks.
```

---

## Phase 1: Context Preservation (Steps 1–3) — MUST

### Step 1. Review Session Work

Use git log to review what was done. This output feeds Step 2.

```bash
git log --oneline -10
git diff --stat HEAD~5..HEAD
```

### Step 2. Update `SESSION_CONTEXT.md` (MANDATORY — DO NOT SKIP)

> **Why this matters:** If you skip this step, the next session starts with
> stale context — wrong priorities, wrong status. Every field below must be
> updated.

Use the commit summary from Step 1 to update **all five fields** of the
SoNash 5-field contract (per D12):

1. **Current Session Counter** — increment by 1 (or set to `1` if bootstrap
   value was `0`).
2. **Uncommitted Work** — `No` after session-end (this skill's Step 10
   commits everything). `Yes` only if `--no-push` and an uncommitted diff
   remains.
3. **Last Updated** — today's ISO date (`YYYY-MM-DD`).
4. **Quick Status** — current reality: what was accomplished this session,
   what layer/phase of the active plan is in progress, any blockers. Keep
   concise; point to PORT_ANALYSIS.md / PLAN.md for detail.
5. **Next Session Goals** — rewrite based on what's **actually next**. Remove
   completed goals; add goals unlocked by this session's work.

Target: `SESSION_CONTEXT.md` stays under ~80 lines.

### Step 3. Plan Check (SHOULD — if plan work advanced)

If this session advanced a plan (`.planning/<topic-slug>/PLAN.md`), verify
the plan file reflects current status. Mark completed steps, update Effort
Summary if estimates drifted, record done-when verification in
`PORT_ANALYSIS.md` where applicable.

**v0 hard-coded target per D33:** `.planning/jason-os-mvp/PLAN.md` (the
current active plan). Convention-based plan-pointer resolution can be added
when a second `.planning/<topic-slug>/` directory exists.

Skip if no plan work advanced this session.

**Progress: Context preservation complete (1/2 live phases).**

---

## Phase 2: Compliance Review (Steps 4–6) — MOSTLY GATED ON LAYER 2

> **v0 state:** Most Phase 2 sub-steps depend on Layer 2 hook outputs
> (`track-agent-invocation.js` → `agent-invocations.jsonl`, override logger,
> hook warnings synthesizer). In v0, each sub-step follows the SoNash
> "skip silently if data source absent" pattern — so Phase 2 effectively
> no-ops until Layer 2 lands.

### Step 4. Agent Compliance Review (SHOULD — if state files present)

Check if agents suggested during the session were actually invoked:

```bash
cat .claude/hooks/.session-agents.json 2>/dev/null
cat .claude/state/pending-reviews.json 2>/dev/null
```

Compare `agentsInvoked` against suggestions. Report gaps. If
`pending-reviews.json` shows `queued: true` but no code-reviewer was invoked,
flag as a compliance gap.

**v0 note:** These state files are produced by Layer 2 hooks. In v0 they
typically don't exist — skip silently.

### Step 4b. Agent Invocation Summary (SHOULD — D26 data flow)

Read `.claude/state/agent-invocations.jsonl` to summarize agent activity:

1. Filter entries to current session (match session ID or today's date)
2. Group by agent/skill name
3. For each group, report invocation count, success/failure breakdown,
   total duration (if available)

If the file doesn't exist or has no current-session entries, skip silently
(typical in v0 pre-Layer-2).

### Step 5. Override Audit Review (SHOULD — if overrides were used)

If an override tracker exists in this project (`.claude/state/override-log.jsonl`
or equivalent), list current-session entries. For each override, ask: were
they justified? Did the skipped check pass later? Should the check be made
non-blocking?

**v0 note:** JASON-OS does not yet ship `scripts/log-override.js` — skip
this step until override logging lands (Layer 2 or later).

### Step 5b. Hook Learning Synthesizer (SHOULD — C3-G1)

Surface the top 3 recurring hook issues from the last 7 days. Read these
best-effort data sources (skip any that don't exist):

1. **Override log:** `.claude/state/override-log.jsonl` — group by `check`,
   count occurrences
2. **Hook warnings log:** `.claude/state/hook-warnings-log.jsonl` — group by
   `type`, count occurrences
3. **Health score log:** `.claude/state/health-score-log.jsonl` — find
   categories scoring below 70

Merge the top contributors from each source, deduplicate, rank by frequency,
present the top 3 as a one-liner each. If no data, skip silently.

### Step 6. Update Session State (SHOULD)

**v0 note:** SoNash's `npm run hooks:health -- --end` is not ported. Skip
this step until a hook-health script lands in JASON-OS (Layer 2 territory;
see `/todo` T11).

**Progress: Compliance review complete (skipped in v0 — 2/2 live phases so
far; Phase 3 stripped).**

---

## Phase 3: Metrics & Data Pipeline — STRIPPED IN V0

> **v0 note:** The SoNash Phase 3 metrics pipeline (reviews:sync,
> run-ecosystem-health.js, debt consolidate-all.js, debt generate-metrics.js)
> requires tooling that is not part of Foundation scope. Phase 3 returns when
> that tooling is ported (see `/todo` backlog — most relevant entries are
> T13 Pattern cognition & propagation, and post-sync-mechanism work).

No commands run in this phase in v0.

### Step 7g. Commit Analytics (SHOULD — if `commit-log.jsonl` exists)

Once Layer 1 item 1.5 (`commit-tracker.js`) is wired, `.claude/state/commit-log.jsonl`
will accumulate per-commit records. Read today's entries to surface commit
pattern insights:

- Count of commits this session
- Average files changed per commit
- Flag if session had 0 granular commits (only session-end)

**Format** (only include if notable):

```
Commit analytics: 5 commits, avg 3.2 files/commit
```

If the file doesn't exist or has only one entry, skip silently.

---

## Phase 4: Cleanup & Closure (Steps 8–10) — MUST

### Step 8. Clean Up State Files (MUST)

```bash
rm -f .claude/hooks/.session-agents.json
rm -f .claude/state/pending-reviews.json

if ! grep -q '"status": "in_progress"' .claude/state/task-*.state.json 2>/dev/null; then
  echo "No in-progress tasks found. Cleaning up handoff file."
  rm -f .claude/state/handoff.json
else
  echo "In-progress tasks found. Preserving handoff.json for session recovery."
fi
```

**Orphaned state check (generic):** If `.claude/state/<skill>.state.json` files
exist with non-terminal `status`, warn the user instead of auto-deleting.
Present options (resume via the skill's `--resume` flag, archive, or defer).
v0 applies to at minimum `deep-plan.<topic>.state.json`.

### Step 9. Pre-Commit Review (MUST)

Before committing, present a summary to the user:

1. Run `git status` — show all files that will be committed
2. **Dirty tree check:** If files outside session-end's expected output are
   staged, warn the user before proceeding
3. Note any script failures (Phase 2/3 skipped in v0 — nothing to fail)
4. Ask: **"Ready to commit and push? [Y/n]"**

**Expected v0 session-end output files:** `SESSION_CONTEXT.md`, the active
`PLAN.md` (if Step 3 touched it), and `PORT_ANALYSIS.md` (if Step 3 updated
ledger entries). Nothing else — extra staged files warrant the user's
attention.

### Step 10. Final Commit & Push (MUST — unless `--no-push`)

```bash
node scripts/session-end-commit.js
```

(Node-native equivalent of SoNash's `npm run session:end`. Ported as part of
Layer 1 item 1.2. Reads `SESSION_CONTEXT.md`, composes the commit message,
runs `git add` + `git commit`, and `git push origin HEAD` unless the
`--no-push` argument is present.)

**Script scope (T17):** The script's allowlist matches this skill's
"Expected v0 session-end output files" contract —
`SESSION_CONTEXT.md` + `.planning/<topic>/PLAN.md` +
`.planning/<topic>/PORT_ANALYSIS.md`. Plan-file edits made during Step 3
are staged and committed in the same atomic commit as `SESSION_CONTEXT.md`,
so no follow-up commit is needed. The `--only -- <paths>` scope keeps other
staged files out of the session-end commit (Step 9 pre-commit review still
catches anything outside the allowlist).

If `--no-push` was specified, skip the push; all prior steps still run —
context is preserved locally without pushing.

**Gate (MUST):** Confirm the script parsed `SESSION_CONTEXT.md` and produced
a commit. Specifically:

- The script printed `✓ Updated SESSION_CONTEXT.md (Uncommitted Work: No)`
  **or** `✓ SESSION_CONTEXT.md already up to date`, AND
- A new commit appears in `git log -1` (or the script reported
  "No changes to SESSION_CONTEXT.md - session end already complete").

If the script printed `⚠ Could not find Uncommitted Work field` and exited
without committing, treat Step 10 as **failed** and execute the fallback
below. Do not silently move on — the gate requires a successful close-out.

**Fallback (MUST if script fails):** Manually close the session.

```bash
git status
git add -A
git commit -m "chore: session end"
# push only if user approves and `--no-push` is NOT set
git push origin HEAD
```

After M1's heading-format fix landed in `scripts/session-end-commit.js`, the
script handles both the D12 5-field heading format and the legacy SoNash
inline-bold format, so this fallback should rarely trigger. Keep it as
belt-and-suspenders for unexpected `SESSION_CONTEXT.md` shapes.

**Progress: Cleanup & closure complete (2/2 live phases).**

---

## Done When

Session-end is complete when ALL of the following are true:

- [ ] `SESSION_CONTEXT.md` updated (all 5 fields)
- [ ] Active plan (`.planning/<topic>/PLAN.md`) reflects session work if
      applicable
- [ ] Pre-commit summary shown to user
- [ ] Final commit pushed (or `--no-push` acknowledged)

## Artifact Manifest

| File | Read/Write | Step | Purpose |
| --- | --- | --- | --- |
| `SESSION_CONTEXT.md` | R/W | 2 | 5-field session state (D12) |
| `.planning/<topic>/PLAN.md` | R/W | 3 | Plan status (D33) |
| `.planning/<topic>/PORT_ANALYSIS.md` | R/W | 3 | Port ledger if Step 3 touches |
| `.claude/hooks/.session-agents.json` | R/D | 4, 8 | Layer 2 — absent in v0 |
| `.claude/state/pending-reviews.json` | R/D | 4, 8 | Layer 2 — absent in v0 |
| `.claude/state/handoff.json` | R/D | 4, 8 | Optional — compact handoff, Layer 1+ |
| `.claude/state/agent-invocations.jsonl` | R | 4b | Layer 2 — absent in v0 |
| `.claude/state/override-log.jsonl` | R | 5, 5b | Layer 2 — absent in v0 |
| `.claude/state/hook-warnings-log.jsonl` | R | 5b | Layer 2 — absent in v0 |
| `.claude/state/health-score-log.jsonl` | R | 5b | Layer 2 — absent in v0 |
| `.claude/state/commit-log.jsonl` | R | 7g | Layer 1 item 1.5 output |

---

## Script Failure Handling

If any script fails during execution:

1. Note the error message and which script failed
2. Continue with remaining steps — do not stop the pipeline
3. Include the failure in the pre-commit summary (Step 9)

---

## Integration

- **Neighbors:** `session-begin` (reads what session-end writes),
  `/checkpoint` (mid-session alternative)
- **Input:** Conversation context, `SESSION_CONTEXT.md`, optional state files
- **Output:** Updated `SESSION_CONTEXT.md`, optional plan touch, final commit
- **Handoff:** `session-begin` will verify `SESSION_CONTEXT.md` freshness and
  any session gap between commits and last-session-end timestamp

**session-begin will verify:**

1. `SESSION_CONTEXT.md` "Last Updated" is current
2. Session counter is coherent (no backwards moves, no skipped numbers)
3. Session gaps (undocumented sessions between commits)
4. Plan hygiene — if a plan file in `.planning/<topic>/` has outdated
   "current_phase" vs. git history, flag it

---

## Learning Loop (MUST — after Step 10)

**Auto-learnings** (MUST): Generate 2–3 data-driven insights from the session
closure (steps skipped, steps that failed, duration patterns). Save to
auto-memory in the JASON-OS canonical pattern
(`memory/session-end-learnings.md`) — the canonical-first memory
architecture per D27 routes these through `.claude/canonical-memory/`.

**Optional user feedback** (SHOULD): "Any steps to add, remove, or reorder?"
Accept empty / "none" to proceed. If provided, persist to auto-memory.

**On next startup** (MUST): Surface previous auto-learnings and user feedback
so future invocations benefit from accumulated experience.

---

## Version History

| Version | Date | Description |
| --- | --- | --- |
| 2.2-jasonos-v0.2 | 2026-04-20 | T17: Step 10 note — session-end-commit.js now allowlists plan files (PLAN.md + PORT_ANALYSIS.md) alongside SESSION_CONTEXT.md so skill Step 3 edits land in the same atomic commit. Also wired `--no-push` argv parsing (skill already documented the flag; script now honors it). |
| 2.2-jasonos-v0.1 | 2026-04-17 | JASON-OS port. Phase 3 stripped (SoNash tooling not in Foundation). Phase 2 annotated as Layer-2-gated with silent skips. Step 3 adapted to plan-file target per D33. SESSION_HISTORY / ROADMAP / TDMS refs removed. `npm run session:end` → `node scripts/session-end-commit.js`. AgentSkills fields added. Lineage preserved back to SoNash 2.2. |
| 2.2 | 2026-03-13 | SoNash: Steps 4c (planning data) and 7g (commit analytics) — D26 Recall fixes |
| 2.1 | 2026-03-13 | SoNash: Step 4b agent invocation summary (D26 data flow) |
| 2.0 | 2026-03-07 | SoNash: Full rewrite from skill-audit (32 decisions applied) |
| 1.1 | 2026-03-01 | SoNash: Health score snapshot step (INTG-02) |
| 1.0 | 2026-02-25 | SoNash: Initial implementation |
