---
name: pre-commit-fixer
description: |
  Diagnose and fix pre-commit hook failures with user confirmation at each step.
  Reads hook output, classifies failures by category, spawns targeted subagents
  for complex fixes, and presents a structured report before re-committing.
  Reduces context waste from manual fix-commit-retry cycles. JASON-OS v0:
  Foundation-scoped to the gitleaks-only `.husky/pre-commit` scaffold; generic
  recipes (ESLint, Prettier, tsc, lint-staged) stay armed for when their
  triggers earn their place in the hook.
compatibility: agentskills-v1
metadata:
  short-description: Diagnose + fix pre-commit hook failures with confirmation
  version: 2.0-jasonos-v0.1
---

<!-- prettier-ignore-start -->
**Document Version:** 2.0 (JASON-OS port v0.1)
**Last Updated:** 2026-04-17
**Status:** ACTIVE (Foundation-scoped)
**Lineage:** Upstream `pre-commit-fixer` v2.0 → JASON-OS v0.1 port
<!-- prettier-ignore-end -->

# Pre-Commit Fixer

Diagnose and fix pre-commit hook failures through a structured classify → fix
→ report → confirm workflow.

**JASON-OS v0 note:** The current `.husky/pre-commit` scaffold runs **only
gitleaks**. Per `D36-revised`, additional checks (ESLint, tests, lint-staged,
cognitive-complexity, etc.) are Post-Foundation Deferrals tracked in
`PLAN.md` and become single-line additions to the husky hook as each earns
its trigger. The recipe categories below stay armed so this skill keeps
working as the hook grows — but on a stock Foundation install you should
expect almost every failure to be a **secrets** finding.

## Critical Rules (MUST follow)

1. **Never re-commit without user confirmation.** Present the structured report
   and wait for explicit "go" before re-staging and re-committing.
2. **Never set `SKIP_REASON` autonomously.** Per CLAUDE.md guardrail #14,
   present three options: (a) fix now, (b) defer to `/add-debt`, (c) skip with
   user-provided reason for `SKIP_CHECKS=...`.
3. **Review hook output after every commit.** Per CLAUDE.md guardrail #13,
   check the hook summary for warnings/failures and present with remediation
   options.
4. **Only fix files in staged or working tree.** Skip errors in
   `node_modules`, generated files, and vendored code.
5. **After 2 fix attempts on the same category, stop and ask the user.** Per
   CLAUDE.md guardrail #9.
6. **Check feedback memory** for user preferences on report format and retry
   behavior before executing.

## When to Use

- `git commit` fails due to pre-commit hook errors
- User explicitly invokes `/pre-commit-fixer`
- CLAUDE.md guardrail #9 directs here on pre-commit failure

## When NOT to Use

- Bug investigation → `/systematic-debugging` (deferred port; for now: handle
  manually)
- Pre-push failures → out of scope (the `.husky/pre-push` escalation-gate +
  block-main checks have their own remediation paths in the hook output)
- Build failures (`npm run build`), CI failures, or test failures outside the
  pre-commit hook itself
- PR-review-time findings (post-push tooling) — those belong to whatever
  PR-review skill is active, not this one

## Arguments

- `--dry-run` — classify and report failures without fixing. Shows what would
  be fixed and estimated complexity, then exits.

## Workflow

### Step 1: Read Hook Output (MUST)

Capture the failure surface. The JASON-OS husky hook prints to stderr/stdout
during the failed `git commit`, so the primary source is the commit's
terminal output. If a hook output log is configured later (Post-Foundation),
read that first.

```bash
# Foundation: re-run the hook against staged content to recapture output
gitleaks protect --staged --redact --no-banner 2>&1
```

**Done when:** Full error output captured. If gitleaks isn't installed, fall
back to the original `git commit` stderr — the hook prints an advisory and
skips.

### Step 2: Classify Failures (MUST)

Parse the error output and classify ALL failure categories present.

**Failure categories (Foundation-armed):**

| Category               | Detection Pattern                | Fix Type                  |
| ---------------------- | -------------------------------- | ------------------------- |
| Secrets (gitleaks)     | `leaks found` / `Commit blocked` | MUST stop — user decision |
| ESLint errors          | `ESLint` + error output          | Subagent                  |
| Prettier formatting    | `prettier` / `lint-staged`       | Inline (auto-fixed)       |
| TypeScript (tsc)       | `error TS` in output             | Subagent                  |
| Lint-staged formatting | `lint-staged` runner errors      | Inline (auto-fixed)       |

**Categories NOT armed in JASON-OS Foundation** (will appear if upstream
hooks are added later — until then, treat any such match as suspicious and
ask the user):

- pattern-compliance
- propagation / propagation-staged
- audit-s0s1
- skill-validation
- debt-schema / cross-doc / doc-index / doc-headers
- cognitive-complexity / cyclomatic-CC

**Pre-existing detection (SHOULD):** Compare errors against the previous
clean state on the branch. Errors present before your changes are
pre-existing. Present separately: "N errors from your changes, M pre-existing."

- Pre-existing errors → offer: fix now or defer via `/add-debt`
- New errors → fix as part of this workflow

**Done when:** All failure categories identified with counts.

### Step 3: Present Warm-Up (MUST)

```
Pre-commit failure: N errors across M categories
  - [category]: N errors
  - [category]: N errors
Complexity: [Quick (<1 min) | Moderate (~3 min) | Complex (~5-10 min)]
[If pre-existing: M pre-existing errors detected separately]

Fix all? [Y / fix specific categories / defer all to /add-debt / abort]
```

**Scope threshold:** If >15 errors or >10 files affected, present and ask:
fix all, fix staged-only, or defer to `/add-debt`?

**Secrets-specific gate:** If the only category is `Secrets (gitleaks)`,
**do not propose autofixes**. The user must remove the secret from staging
or authorize a `SKIP_CHECKS=secrets SKIP_REASON="..."` override (CLAUDE.md
guardrail #14 — exact wording from user, never invented).

**Done when:** User confirms which categories to fix.

### Step 4: Execute Fixes (MUST)

Fix in priority order: secrets (user-driven, never auto) → TypeScript →
ESLint → formatting.

**Inline fixes (no subagent):**

```bash
# Lint-staged / Prettier formatting — already auto-fixed by the runner,
# just re-stage the touched files
git add <formatted-files>
```

**Subagent fixes:**

Spawn focused subagents using the Task tool with category-specific prompts:

- **ESLint:**
  `Task({subagent_type: "general-purpose", prompt: "Fix these ESLint errors. Error list: <errors>. Files: <list>. Do NOT create new files, do NOT add eslint-disable unless genuinely false positive."})`
- **TypeScript (tsc):**
  `Task({subagent_type: "general-purpose", prompt: "Fix these TypeScript errors. Errors: <list>. Only fix errors in staged/working files."})`

**Confidence flagging (SHOULD):** If a fix involves judgment (e.g.,
choosing between `eslint-disable` and code restructure), present options to
the user instead of deciding autonomously.

**Progress (MUST for multi-category):** "Category 1 of N: [type] — fixing..."

**Done when:** All accepted categories fixed and staged.

### Step 5: Report and Confirm (MUST)

Present the structured report. **Do NOT re-commit until user confirms.**

```
PRE-COMMIT FIX REPORT:
  Status: READY | PARTIAL
  Categories fixed: N/M
    - [category]: [description] ([files modified])
  Deferred (if any):
    - [category]: [description] → /add-debt
  Pre-existing (if any):
    - [category]: [description] → deferred / fixed
  Files modified: [list]
  Confidence: [all high | N items flagged for review]

  Re-commit? [Y / review changes first / abort]
```

**Delegation:** If user previously said "just fix it," present report but
auto-proceed. Record as delegated.

**Done when:** User confirms re-commit or aborts.

### Step 6: Re-commit (MUST)

```bash
git add <fixed-files>
git commit -F .git/COMMIT_EDITMSG
```

After commit, review the hook summary output (CLAUDE.md guardrail #13). If
new warnings appear, present them before continuing.

**On retry failure:** Classify the NEW errors (don't assume same category).
Present a new report. After 2 attempts on the same category, stop and ask.

**Regression detection (MUST):** If new errors appear that weren't in the
original failure, flag as regression. Do NOT auto-fix — present original vs
new and ask user.

**Done when:** Commit succeeds, or user decides to stop.

### Step 7: Closure (MUST)

```
Pre-commit fixer complete.
  Fixed: N categories, M individual errors
  Deferred: K items to /add-debt
  Files modified: [list]
  Commit: [hash]
  Post-fix check: Was this a root cause fix or symptom patch?
    [1] Root cause — done
    [2] Symptom — fix root cause now
    [3] Symptom — defer to /add-debt
```

**Done when:** User selects post-fix option and any follow-up is routed.

---

## Guard Rails

- **Scope explosion:** >15 errors or >10 files → ask before proceeding
- **Regression:** New errors after fix → flag, do not auto-fix
- **Disengagement:** User can say "stop" or "I'll handle it" at any
  confirmation gate. Present what was fixed so far, exit cleanly.
- **Persistent failure:** After 2 attempts on same category → ask user.
- **Routing out:** Can't fix → handle manually (the `/systematic-debugging`
  port is deferred). Architectural issue → `/add-debt`.
- **SKIP_CHECKS discipline:** The husky hook's skip mechanism
  (`SKIP_CHECKS=<check> SKIP_REASON="..." git commit`) requires the user to
  supply the exact `SKIP_REASON` text. Never invent one.

## Integration

- **Trigger:** CLAUDE.md guardrail #9 (on pre-commit failure → use this skill)
- **Hook target:** `.husky/pre-commit` (Foundation: gitleaks only; future
  checks land per Post-Foundation Deferrals in `PLAN.md`)
- **Neighbors:** `/add-debt` (deferral). Other neighbors
  (`/systematic-debugging`, `/quick-fix`, `/hook-ecosystem-audit`) are
  upstream skills not yet ported into JASON-OS Foundation.
- **State:** Saves progress to
  `.claude/state/pre-commit-fixer-state.json` (current categories, fixes
  applied, attempt count). On resume, skips already-fixed categories.

## Anti-Patterns

- **Do NOT** suppress ESLint rules with `// eslint-disable` unless genuinely
  false positive
- **Do NOT** add files to any path-exclude list unless verified false positive
- **Do NOT** commit partial fixes without presenting the partial status to
  the user
- **Do NOT** fix errors in `node_modules`, generated, or vendored files
- **Do NOT** invent a `SKIP_REASON` — the husky hook's
  `require_skip_reason` helper enforces non-empty values, and CLAUDE.md
  guardrail #14 requires explicit user wording

---

## Version History

| Version          | Date       | Description                                               |
| ---------------- | ---------- | --------------------------------------------------------- |
| 2.0-jasonos-v0.1 | 2026-04-17 | Initial JASON-OS port (D22 Layer 4 item 16). Foundation-scoped recipes; project-specific categories dropped; husky scaffold targeted. |
| 2.0              | 2026-03-22 | (Upstream) Skill-audit rewrite: 47 decisions, user gates  |
| 1.1              | 2026-02-14 | (Upstream) Schema/audit failure types added               |
| 1.0              | 2026-02-25 | (Upstream) Initial implementation                         |
