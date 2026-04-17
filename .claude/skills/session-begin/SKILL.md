---
name: session-begin
description: >-
  Pre-flight checklist for work sessions — loads context, checks hook state,
  surfaces warnings, and gates on acknowledgment before work begins.
compatibility: agentskills-v1
metadata:
  version: 2.1
---

# Session Begin Pre-Flight

Pre-flight checklist that orients the session: loads context, validates
environment, surfaces warnings, and hands off to the user with a goal-selection
prompt.

**Time budget:** Session-begin SHOULD complete in under 3 minutes. If script
issues or staleness require extended remediation, present findings and defer
fixes to user decision.

**JASON-OS v0.1 scope note:** This skill was ported from SoNash and trimmed
for bootstrap. Sections referencing infrastructure JASON-OS doesn't have yet
(health scripts, override/health-score logs, technical-debt index,
consolidation pipeline, secrets-decryption gate) are marked DEFERRED inline
with a pointer to re-wire them when the corresponding systems land. See
[BOOTSTRAP_DEFERRED.md](../../../.planning/jason-os/BOOTSTRAP_DEFERRED.md) for
the broader deferral ledger.

## Critical Rules (MUST follow)

1. **Duplicate detection first** — MUST check before any action (see below).
2. **Never double-increment** — MUST verify the session counter wasn't already
   incremented in this conversation or after compaction before incrementing.
3. **Announce session number** — MUST output "Session #N started on [branch]"
   after incrementing.
4. **Script failures escalate to user** — MUST present failures with options
   (fix now / defer / ignore). Do not decide unilaterally. (Vacuous in
   bootstrap — no health scripts wired yet; restore when Phase 3 lands.)
5. **Stale docs are a user decision** — MUST present discrepancies and ask
   "Update now or defer?" Do not auto-fix.
6. **Scope explosion guard** — if 3+ scripts failed or 3+ actionable findings
   surfaced, MUST present a triage list before acting on any.

## Duplicate Detection (MUST — before anything)

Check all three:

1. Have I already completed this checklist in the current conversation?
2. Was SESSION_CONTEXT.md "Last Updated" modified today? (date-only field —
   sub-day relies on checks #1 and #3)
3. Did I already increment the session counter in this conversation?

**If ANY true:** "Session #N already active. What would you like to work on?"
**If ALL false:** Proceed with full checklist.

## When to Use

- Start of every AI work session
- User explicitly invokes `/session-begin`

## When NOT to Use

- Session closure → `/session-end`
- State snapshot → `/checkpoint`
- Already ran this session → duplicate detection catches it

## Hook Boundary

The **SessionStart hook** in JASON-OS v0.1 runs only `check-mcp-servers.js`
(and `compact-restore.js` after compactions). Consolidation, cross-session
validation, dependency install, and build are NOT handled by the hook yet —
when those hooks land, update this section and remove the corresponding
manual steps below.

---

## Warm-Up (MUST — first output after duplicate detection passes)

"Starting Session #N pre-flight on [branch]. Will load context, check hook
state, and surface any warnings."

---

## Phase 1: Environment Setup (MUST)

### 1.1 Secrets Decryption Check (DEFERRED)

JASON-OS bootstrap has no `scripts/secrets/` infrastructure. When an
`.env.local.encrypted` + decrypt pipeline lands, restore the SoNash-style gate
here (passphrase-via-stdin, never logged).

### 1.2 Cross-Session Validation (DEFERRED)

SessionStart hook does not yet do cross-session validation. When that hook
work lands, restore the prior-session-missed-`/session-end` check here.

---

## Phase 2: Context Loading (MUST)

### 2.1 Load Session Context (MUST)

- Read [SESSION_CONTEXT.md](../../../SESSION_CONTEXT.md) — status, blockers,
  goals
- Increment session counter (MUST — verify not already incremented first)
- Output: "Session #N started on [branch]"

(ROADMAP.md read is DEFERRED — JASON-OS v0.1 does not have ROADMAP.md yet.
Next Session Goals live in SESSION_CONTEXT.md for now.)

### 2.2 Branch Validation (MUST)

Report the current branch from `git branch --show-current` in the session
announcement. If SESSION_CONTEXT.md documents a different branch (in Quick
Status or Next Session Goals), warn the user before proceeding.

### 2.3 Stale Documentation Check (MUST)

```bash
git log --oneline -15
```

Compare recent commits against SESSION_CONTEXT.md's "Next Session Goals" and
"Quick Status." If discrepancies found, present them: "Docs appear stale:
[specifics]. Update now or defer?"

Let the user decide. Do not auto-update.

### 2.4–2.6 (DEFERRED)

Session-gap detection, consolidation status, and prior-research surface all
depend on infrastructure not yet in JASON-OS (`npm run session:gaps`,
`scripts/run-consolidation.js`, `.research/research-index.jsonl`). Restore
when those land.

---

## Phase 3: Health Scripts (DEFERRED — JASON-OS v0.1)

JASON-OS bootstrap does not yet wire any `npm run` health scripts. When any of
`patterns:check`, `review:check`, `lessons:surface`, `session:gaps`,
`roadmap:hygiene`, `reviews:sync`, `reviews:check-archive`, `reviews:archive`,
`hooks:analytics`, `crossdoc:check`, or the velocity/task-dependency reports
land, restore the SoNash-style block here and flip the script-failure-
escalation rule (Critical Rule 4) from vacuous to live.

Until then: note "Health scripts: not yet wired (JASON-OS v0.1)" in the
summary.

---

## Phase 4: Warning Gates (MUST)

### 4.1 Hook Anomaly Gate (MUST)

Check `.claude/state/hook-warnings-log.jsonl`. If 10+ entries in last 7 days
→ warn. If fewer, skip silently.

(SoNash override-trend and health-score-drop sub-checks are DEFERRED —
`.claude/override-log.jsonl` and `.claude/state/health-score-log.jsonl` do
not exist in JASON-OS v0.1. Restore when those logs land.)

### 4.2 Warning Acknowledgment Gate (DEFERRED)

No `.claude/hook-warnings.json` or `scripts/sync-warnings-ack.js` in JASON-OS
v0.1. When the warning-acknowledgment pipeline lands, restore the gate here.

### 4.3 Infrastructure Failure Gate (DEFERRED)

No `.claude/state/session-start-failures.json`, `pending-test-registry.json`,
or `decision-documentation` hook-warnings entries yet. Restore when those
systems land.

### 4.4 Technical Debt Snapshot (DEFERRED)

No `docs/technical-debt/INDEX.md` in JASON-OS v0.1. Restore when a tech-debt
index lands (or adapt to a JASON-OS-native debt surface).

---

## Phase 5: Summary & Goal Selection (MUST)

### Summary Template

Present using this format:

```
Session #N — Pre-Flight Summary
Branch: [branch]
Working tree: [clean / N uncommitted]

Health scripts: not yet wired (JASON-OS v0.1)
Hook warnings: [none / N new entries in last 7d]
Deferred infrastructure: see BOOTSTRAP_DEFERRED.md

Next Goals (from SESSION_CONTEXT.md):
  [list ALL goals from the "Next Session Goals" section —
   do not truncate or cap the list]
```

### Goal Selection (MUST)

After the summary: "Which goal would you like to focus on, or something else?"
Reference the surfaced goals — do not use a generic open-ended prompt.

### Closure Signal (MUST)

"Session #N pre-flight complete. Ready to work."

**Done when:** Session counter incremented, context loaded, hook state
checked, goal selected.

---

## Guard Rails

- **Scope explosion:** If 3+ scripts failed or 3+ findings surfaced, present a
  triage list: "Multiple issues found. Which to address now vs defer?" Do not
  auto-fix multiple issues.
- **Disengagement:** If user says "skip" or "let's work" mid-checklist, stop
  immediately. Present what's completed vs remaining. Proceed to goal selection.
- **Compaction recovery:** If compaction occurs mid-session-begin, re-read
  SESSION_CONTEXT.md. If counter was already incremented, do not re-increment.
  Resume from the last unfinished phase.

---

## Integration

- **Neighbors:** `session-end` (receives session context), `checkpoint`
  (mid-session state)
- **Handoff to session-end:** SESSION_CONTEXT.md updated with session number
  and current work.
- **Reference material:** See [REFERENCE.md](./REFERENCE.md) for skill routing,
  code review procedures, and anti-pattern guidance.

---

## Version History

| Version | Date       | Description                                                  |
| ------- | ---------- | ------------------------------------------------------------ |
| 2.1     | 2026-04-17 | JASON-OS bootstrap trim: DEFERRED markers for unwired infra  |
| 2.0     | 2026-03-16 | Skill-audit rewrite: 31 decisions, 51→73 score               |
| 1.0     | 2026-02-25 | Initial implementation                                       |
