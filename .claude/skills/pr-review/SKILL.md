---
name: pr-review
description: |
  Process external PR code review feedback (Qodo, SonarCloud) through a
  structured 8-step protocol. Parses all items, categorizes by severity and
  origin, fixes in priority order, tracks deferred items via /add-debt, and
  captures learnings. This skill processes review feedback — it does not
  generate reviews.
compatibility: agentskills-v1
metadata:
  short-description: Process external PR review feedback into fixes, deferrals, and learnings
  version: 4.6-jasonos-v0.1
---

<!-- prettier-ignore-start -->
**Document Version:** 4.6 (JASON-OS port v0.1)
**Last Updated:** 2026-04-17
**Status:** ACTIVE (Foundation-scoped)
**Lineage:** SoNash `pr-review` v4.6 → JASON-OS v0.1 trimmed port
<!-- prettier-ignore-end -->

# PR Code Review Processor

Process external code review feedback into fixes, deferrals, and learnings.
Every item is either fixed or tracked — no silent dismissals.

**JASON-OS v0 scope:** Foundation port targets **Qodo + SonarCloud** only
(per D22 / D23). CodeRabbit and Gemini integrations were excluded from the
JASON-OS reviewer set. The pipeline-style learning capture (JSONL writers,
auto-consolidation, archival cron) is also out of scope; v0 keeps the
markdown learning entry pattern only and treats it as the source of truth.

## Critical Rules (MUST follow)

1. **NEVER silently ignore** — every item gets a disposition: fixed, deferred
   (with debt ID via `/add-debt`), or rejected (with specific justification).
2. **NEVER skip trivial items** — fix everything, including typos and style.
3. **ALWAYS create learning entry FIRST** — before fixing any items.
4. **ALWAYS read files before editing** — no blind edits.
5. **ALWAYS verify fixes** — re-read modified files after applying changes.
6. **NEVER dismiss as "pre-existing"** — every pre-existing item MUST get a
   Defer/Act Score (DAS) block and explicit user choice. See Step 2 for the DAS
   framework. Never auto-decide on DAS 3-4 items. Never skip the DAS block.
7. **Propagation is MANDATORY** — after fixing a pattern-based issue, grep the
   entire codebase for the same pattern and fix ALL instances in one commit.

## When to Use

- Processing formal PR gate review feedback (Qodo, SonarCloud, mixed)
- User explicitly invokes `/pr-review`
- Multi-round review cycles on open PRs

## When NOT to Use

- Ad-hoc development review or self-review
- Generating reviews (this skill processes feedback, doesn't generate it)
- Security-specific audit — use a dedicated security review pass

## Parameters

- `--pr <number>` — PR number (SHOULD provide; used for state file)
- `--round <N>` — Review round (R1, R2, R3+). Enables repeat-item detection.
- `--resume` — Resume interrupted review from state file.

---

## Process Overview

```
Step 1: CONTEXT & PARSE  →  Step 2: CATEGORIZE & TRIAGE  →  Step 3: PLAN
  →  Step 4: FIX  →  Step 5: DOCUMENT & TRACK  →  Step 6: LEARNING
  →  Step 7: VERIFY  →  Step 8: SUMMARY & COMMIT
```

**Artifacts:** Fixed source files, learning log entry, debt-log entries (if
deferred), state file.

## Warm-Up (MUST — before Step 1)

**State file lookup (MUST for R2+):** Before displaying the warm-up, read
prior round state files to get accurate counts. Check for state files in
descending round order: `.claude/state/task-pr-review-{pr}-r{N}.state.json`
where N < current round. Extract `total`, `fixed`, `deferred`, `rejected`
from each.

```
PR Review: #{pr} Round {round}
Source: [Qodo/SonarCloud/Mixed]
[If R2+: Previous rounds from state files:
  R1: fixed N, deferred M, rejected K
  R2: fixed N, deferred M, rejected K
  ...]
Ready to receive review feedback. Paste it below.
```

---

## Step 0: Pre-Checks (MUST — before parsing)

**PR size advisory (MUST):** Check file count before starting review:

```bash
gh pr view {PR} --json files --jq '.files | length'
```

If >50 changed files: "This PR has N files. Large PRs produce noisy review
cycles. Consider splitting before review. Continue anyway? [Y/split]"

**Large PR Advisory (MUST — >40 files):** If the PR has >40 changed files,
display the following advisory before proceeding:

> "Large PR ({N} files) — expect SonarCloud first-scan volume. Recommend
> batch-acknowledgment for known false-positive categories before detailed
> triage."

Cross-reference any project-local Qodo or SonarCloud suppression configs
(if present at `.qodo/`, `sonar-project.properties`, etc.) for batch
acknowledgment. Apply suppressions before individual item triage to reduce
noise.

**First-scan detection (MUST for R1):** If SonarCloud items >100 on R1 OR the
PR is primarily research/state/docs files (>80% of files under `.research/`,
`.claude/state/`, `docs/`), most items are likely first-scan noise on new
files (not bugs introduced by the PR). Offer batch acknowledgment:
"SonarCloud flagged N items on R1. This appears to be first-scan volume on
new files. Batch-acknowledge known-safe patterns (S5852, S4036, S106 in
scripts/tests)? [Y/review individually]" Apply existing suppression patterns,
triage only remaining items individually.

**Security Threat Model (MUST — conditional):** When the PR touches files
under `scripts/`, `.claude/hooks/`, or other security-related paths (auth,
crypto, validation, sanitization), populate the following threat model
checklist before proceeding to Step 1.

```
Security Threat Model Checklist:
- [ ] Injection vectors: shell injection, SQL injection, log injection, terminal escape injection
- [ ] TOCTOU race conditions: time-of-check vs time-of-use on file operations or state checks
- [ ] Symlink/path traversal risks: symlink following, directory traversal via ../ or encoded variants
- [ ] Sanitization boundaries: where untrusted input enters, where sanitization occurs, where output exits
- [ ] PII/credential exposure: error messages, logs, API responses, or config files leaking sensitive data
- [ ] Control character risks: terminal escape sequences, null bytes, unicode direction overrides in output
```

Each item should be marked as: N/A (not applicable to this PR), Clear
(reviewed, no risk), or Flag (risk identified — must address before
proceeding). If any item is flagged, it becomes a CRITICAL-severity item in
Step 2 triage.

---

## Step 1: Context & Parse (MUST)

> (SHOULD) Read `reference/PRE_CHECKS.md` for generic pre-push checks. Run
> ALL applicable checks before first CI push.

**Context (SHOULD):** Load `CLAUDE.md` and any project-local pattern docs.
For R2+: load previous round's state file, auto-detect repeat items (same
rule ID + file = repeat-rejected).

**Parse (MUST):**

1. Identify source (Qodo, SonarCloud, Mixed)
2. **Multi-pass extraction (MUST for >200 lines):** Pass 1: scan for item
   headers/markers. Pass 2: extract details, code snippets, line refs. Pass 3:
   cross-reference for missed items, validate completeness.
3. Announce: "Identified **N total items** from [source]"
4. Validate critical claims via `git log --all --grep` / `git log --follow`
5. Stale HEAD check — if reviewer is 2+ commits behind, batch-reject

**Qodo stale diff note:** Qodo reviews the original PR diff, not the current
HEAD after fix commits. Expect stale items on R2+ that were already fixed in
prior rounds. Cross-round dedup (Step 2) handles this automatically.

**Input validation:** If zero items parsed, warn and ask user to verify
content.

**SonarCloud enrichment (MAY):** When `javascript:S####` or `typescript:S####`
rule IDs are detected and snippets are missing, fetch them via the SonarCloud
API for the configured project key:

```bash
SONAR_PROJECT_KEY=${SONAR_PROJECT_KEY:-"<your-project-key>"}
curl -fsSL "https://sonarcloud.io/api/issues/search?componentKeys=${SONAR_PROJECT_KEY}&rules=<rule_id>&ps=100" \
  | jq '.issues[] | {file: .component, line: .line, message: .message, rule: .rule}'
```

This is optional convenience; pasted feedback is the source of truth.

**Effort estimate (MUST):** "**N items** (C critical, M major, m minor, T
trivial). Estimated effort: [small <=5 | medium 6-15 | large 16-30 | XL 30+]."

**Fast path (<=5 items):** Skip Steps 3-4, proceed directly to fixing.

**Done when:** All items parsed, count announced, effort estimated.

---

## Step 2: Categorize & Triage (MUST)

**Severity (MUST):** CRITICAL (security/data loss) | MAJOR (bugs/perf) | MINOR
(style/tests) | TRIVIAL (typos). Fix ALL levels.

**Origin (MUST):**

| Origin            | Action                                       |
| ----------------- | -------------------------------------------- |
| **This-PR**       | MUST fix — no DAS needed                     |
| **Pre-existing**  | Score with DAS, present choice block to user |
| **Architectural** | Present to user with impact + recommendation |

### Defer/Act Score (DAS) — MUST for all pre-existing items

Three dimensions, each scored 0-2. Replaces time-based effort estimates.

| Dimension      | 0 (Act now)                                        | 1 (Gray zone)                                | 2 (Defer)                                     |
| -------------- | -------------------------------------------------- | -------------------------------------------- | --------------------------------------------- |
| **Signal**     | Multi-source OR repeat finding from prior PR       | Single source, first occurrence              | Single source, low confidence (<60)           |
| **Dependency** | Blocks CI/PRs OR fix stays within PR-changed files | Doesn't block, no other workstream covers it | Another workstream already plans this fix     |
| **Risk**       | Fix is isolated, tests exist                       | Fix touches shared code, tests exist         | Fix requires cross-system changes or no tests |

**DAS = Signal + Dependency + Risk** (range 0-6)

| Score | Action                                                              |
| ----- | ------------------------------------------------------------------- |
| 0-2   | **Recommend act** — present choice, auto-accept if user delegates   |
| 3-4   | **User decides** — MUST wait for explicit choice, never auto-decide |
| 5-6   | **Recommend defer** — present choice, auto-accept if user delegates |

**Required format block (MUST appear for every pre-existing item):**

```
[PRE-EXISTING] {title}
  Signal:     {0|1|2} — {reason}
  Dependency: {0|1|2} — {reason}
  Risk:       {0|1|2} — {reason}
  DAS:        {N}/6 → {Recommend act | User decides | Recommend defer}
  ▶ [A] Fix now  [B] Defer to debt log  [C] Need more context
```

**Enforcement:** If a pre-existing item appears in the triage table without a
DAS block, the triage is incomplete. Step 7 verification MUST check that
pre-existing item count matches DAS block count.

**Delegation:** If user says "you decide on clear items," auto-accept
recommendations for DAS 0-2 and 5-6. DAS 3-4 items MUST always be presented.

**Cross-round dedup (MUST for R2+):** Before investigating any item, check
prior round dispositions for the same PR. Auto-reject items that match a
prior rejection (same rule ID + same file). Reference the prior round:
"Already rejected in R{N} — same justification applies." This applies to ALL
reviewers (Qodo, SonarCloud), not just one source.

**Multi-source convergence (SHOULD for R2+):** If 2+ reviewer sources flag
the same file+pattern in the same round, auto-elevate to next severity tier.
Multi-source agreement is strong signal.

**Stale HEAD check (MUST):** When a SonarCloud item references a file already
modified in the current fix commit, flag as potentially stale. Verify against
current HEAD before investigating: `git show HEAD:{file} | grep -n "pattern"`.
Mark confirmed stale items as "Stale (fixed in R{N} commit {hash})."

**Triage summary (non-blocking):** Show breakdown, auto-proceed. User MAY
interrupt. For architectural items: state finding, impact, recommendation,
wait.

**Re-triage:** If an item proves more complex during fixing, re-classify and
notify: "Re-triaged [item] from MINOR to MAJOR — [reason]."

**Done when:** All items categorized, triage summary shown.

---

## Step 3: Plan & Agents (SHOULD — skip for <=5 items)

Track ALL issues. Learning log entry (`#TBD` stub) is ALWAYS the FIRST task.

For 20+ items across 3+ concerns, dispatch specialized agents in parallel.
See [reference/PARALLEL_AGENT_STRATEGY.md](reference/PARALLEL_AGENT_STRATEGY.md).

**Done when:** Task list created, agents dispatched (if applicable).

---

## Step 4: Fix (MUST — in priority order)

**Fix order:** CRITICAL (separate commit) > MAJOR (batch related) > MINOR
(batch by file) > TRIVIAL (batch all).

**Per fix:** Read file, understand context, apply.

**Propagation sweep (MUST — NEVER skip):** After every pattern-based fix,
grep the entire codebase for the same pattern and fix ALL instances before
committing. Do NOT commit a fix until all instances are addressed:

```bash
# Search for the same anti-pattern across the codebase
grep -rn "PATTERN" scripts/ .claude/hooks/ tests/ --include="*.js" --include="*.ts"
# Verify: count remaining instances (must be 0)
grep -rc "PATTERN" scripts/ .claude/hooks/ tests/ --include="*.js" --include="*.ts" | grep -v ':0$'
```

**Verify (MUST):** Re-read modified files, run any project-local lint/test
commands available (e.g. `npm run lint`, `npm run test`), and cross-reference
original items.

**Mid-review checkpoint (20+ items):** After critical+major batch:
"Completed C+M fixes. N remaining. Continue?" Progress: every 5 fixes show
"N of M (X%)."

**Done when:** All fixable items addressed, verification passes.

---

## Step 5: Document & Track (MUST)

Every non-fixed item MUST have a disposition:

- **Deferred:** debt entry via `/add-debt` + DAS score justification
- **Rejected:** Specific technical justification (not "seems fine")
- **Architectural:** User-approved disposition

**Debt entry (MUST for deferred):** Use `/add-debt`. Map review severity to
debt severity:

| Review severity | `/add-debt` severity |
| --------------- | -------------------- |
| CRITICAL        | S0 (Blocker)         |
| MAJOR           | S1 (High)            |
| MINOR           | S2 (Normal)          |
| TRIVIAL         | S3 (Nit)             |

Use category `pr-review` and reference the PR + round in the notes field.

**DAS compliance (MUST):** Every deferred pre-existing item must have a DAS
block from Step 2 with user-approved disposition. Deferrals without DAS
blocks are process violations.

**Approval gate (MUST):** Present deferred items for approval: "Deferring N
items to the debt log: [list with DAS scores]. Approve? [Y/modify]"

**Delegation:** User says "you decide" → auto-accept DAS 0-2 (act) and DAS
5-6 (defer) recommendations. DAS 3-4 items MUST still be presented. Record as
`delegated-accept`.

**Done when:** All items have dispositions, deferred items approved.

---

## Step 6: Learning (MUST)

Append a learning entry to the project's review-learnings log. v0 default
path: `.planning/PR_REVIEW_LEARNINGS.md`. Create the file with a single
`# PR Review Learnings` heading if missing.

**Entry template:**

```markdown
#### Review #N: <Brief Description> (YYYY-MM-DD)

**Source:** Qodo / SonarCloud / Mixed
**PR/Branch:** <branch name or PR number>
**Items:** X total (Critical: X, Major: X, Minor: X, Trivial: X)

**Patterns Identified:**

1. [Pattern name]: [Description]
   - Root cause: [Why this happened]
   - Prevention: [What to add/change]

**Resolution:**

- Fixed: X items
- Deferred: X items (debt IDs: D…)
- Rejected: X items (with justification)

**Key Learnings:**

- <Learning 1>
- <Learning 2>
```

**Review numbering:** Count existing `#### Review #` headers in
`.planning/PR_REVIEW_LEARNINGS.md`; add 1 to assign the next number. Replace
any `#TBD` placeholders inserted in Step 3 with the final number.

**Done when:** Learning entry appended with final review number.

---

## Step 7: Verify (MUST — gate before summary)

1. **Count check:** fixed + deferred + rejected = total parsed items
2. **No orphans:** every item from Step 1 has a disposition
3. **Debt sync:** every deferred item has a debt-log ID
4. **DAS compliance:** pre-existing item count matches DAS block count (no
   skipped blocks). All DAS 3-4 items have explicit user choice recorded.
5. **Learning entry:** complete (not `#TBD`)

If any check fails, fix before continuing. **Done when:** All 5 checks pass.

---

## Step 7.5: Merge Trigger Check (SHOULD — R4+ only)

If this is round 4 or later, check the fix rate:

- **Fix rate < 30%:** Recommend merging. Remaining items become follow-up
  debt entries, not more review rounds. Signal: "Fix rate dropped to N% —
  diminishing returns. Recommend merging and tracking N remaining items as
  debt."
- **Fix rate 30-50%:** Flag: "Fix rate is N%. Consider one more round
  maximum."
- **Fix rate > 50%:** Continue normally.

Signal-to-noise typically drops sharply after R4-R5.

---

## Step 8: Summary & Commit (MUST)

```
PR Review Complete: #{pr} R{round}
Items: {total} ({fixed} fixed, {deferred} deferred, {rejected} rejected)
Severity: {critical}C / {major}M / {minor}m / {trivial}T
Files modified: [list] | Learning: #{N} | Debt: [debt IDs or "none"]

Key Decisions:
- [Deferred] D…: [reason]
- [Rejected] [item]: [justification]
```

**Commit (MUST):** Prefix `fix:` or `docs:`. Body: reference review source.
Separate commits for Critical fixes.

**Persist state file (MUST):** After commit, write the round's state file to
`.claude/state/task-pr-review-{pr}-r{round}.state.json` with the schema shown
in Compaction Resilience. This is the source of truth for future rounds'
warm-up.

**Done when:** Summary shown, committed, state file written.

---

## Guard Rails

- **50+ items:** Suggest splitting into severity batches
- **Zero items:** Warn, ask user to verify pasted content
- **Pause/resume:** Save state + exit. Resume: `/pr-review --resume --pr N`
- **Contradictions:** Defer to user (except safety items)

## Compaction Resilience

State file: `.claude/state/task-pr-review-{pr}-r{round}.state.json`. Updated
after each step. On `--resume`, read state and skip completed steps. Retained
after completion as a review record.

**State file schema (MUST persist after Step 8):**

```json
{
  "pr": 432,
  "round": 3,
  "review_number": 12,
  "source": "mixed",
  "total": 7,
  "fixed": 6,
  "deferred": 0,
  "rejected": 1,
  "severity": { "critical": 0, "major": 2, "minor": 3, "trivial": 2 },
  "completed_steps": [1, 2, 3, 4, 5, 6, 7, 8],
  "status": "complete",
  "commit_sha": "abcdef12",
  "completed_at": "2026-04-17T23:55:00Z"
}
```

**Why:** Warm-Up for R2+ reads prior round state files to show accurate
previous-round counts. Without persisted state, context clearing or
compaction loses this data and warm-up shows inaccurate or missing counts.
The state file is the source of truth for cross-round history within a PR.

## Integration

**Upstream:** Manual invocation only (user pastes feedback).
**Downstream:** `/add-debt` for deferred items.
**Neighbors:** None in JASON-OS v0 (PR retrospective + ecosystem audit
skills are post-Foundation deferrals).

---

## Version History

| Version          | Date       | Description                                                                                                                                                                                                |
| ---------------- | ---------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 4.6-jasonos-v0.1 | 2026-04-17 | JASON-OS trimmed port. Drop CodeRabbit + Gemini reviewers (D23). Drop pipeline-style learning capture (JSONL writers, auto-consolidation). Replace external debt system with `/add-debt` stub mapping. Drop ecosystem-audit + pr-retro neighbor refs (post-Foundation). Reference set trimmed to 2 files (PRE_CHECKS, PARALLEL_AGENT_STRATEGY). Lineage preserved from SoNash 4.6 source. |
| 4.6              | 2026-03-18 | Step 0: high-churn watchlist check (upstream).                                                                                                                                                             |
| 4.5              | 2026-03-18 | Step 0: Security Threat Model checklist + Large PR Advisory at >40 files (upstream).                                                                                                                       |
| 4.4              | 2026-03-16 | DAS framework: Signal/Dependency/Risk scoring. Required format block (upstream).                                                                                                                           |
| 4.3              | 2026-03-14 | State file persistence across compaction (upstream).                                                                                                                                                       |
| 4.0              | 2026-03-07 | Full rewrite into 8 sequential steps (upstream).                                                                                                                                                           |
