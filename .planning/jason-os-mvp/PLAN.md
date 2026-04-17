# JASON-OS Foundation — Implementation Plan

**Date:** 2026-04-16
**Topic:** JASON-OS Foundation (research slug: `jason-os-mvp`)
**Scope:** Framework / underpinnings so the real work can begin. **Not** a shippable product.
**Effort:** L (~14-20h firm commitment; gated Layers 2/3/4 add ~6-10h if all engaged)
**Branch:** `startup-41526` (retained per Diagnosis)
**References:** [DIAGNOSIS.md](./DIAGNOSIS.md), [DECISIONS.md](./DECISIONS.md), `.research/jason-os-mvp/RESEARCH_OUTPUT.md`

---

## Summary

Foundation lands in two zones: **firm commitment** (Layers 0+, 0, 1 + pre-push mini-phase) runs end-to-end with one up-front approval (D34). **Gated layers** (2, 3, 4) each re-approve at a feels-like-home gate (D19) after the validation session (D20). Work ends with handoff to `/brainstorm sync-mechanism` (D14, MI-3).

Every port of a SoNash file runs pre-analysis first (MI-1) → central `PORT_ANALYSIS.md` ledger (D13). Each port is its own commit (D18). Layer 0+ runs manually; Layer 0/1 ports dispatch to port-agents (D17).

---

## How To Use This Plan

1. Read **DECISIONS.md** first (35 + 3 decisions, 6 meta-instructions). Every step cites decisions by ID.
2. Each **port step** lists: source path, target path, pre-analysis output row, dependencies, commit message, done-when.
3. **Audit checkpoints** at each layer boundary (D29).
4. **Deferrals** live at the bottom until `/todo` is operational (D9 completes), then migrate into `/todo` as backlog (MI-6).
5. **User-action steps** are flagged `⚠️ USER ACTION`: installs, signups, auth flows (per memory `feedback_user_action_steps.md`).
6. `/skill-name` references in this plan are **tool calls** (per memory `feedback_skills_in_plans_are_tool_calls.md`), not prose.

---

## Meta-Instruction Quick Reference

| ID | Rule |
|----|------|
| MI-1 | Pre-analysis before every port → PORT_ANALYSIS.md ledger |
| MI-2 | Deferrals in plan have explicit trigger conditions |
| MI-3 | Post-Foundation = `/brainstorm sync-mechanism` (backwards-sync first, forward prep) |
| MI-4 | Pre-push PR review required before first PR (Qodo + SonarCloud; no CodeRabbit) |
| MI-5 | Per-skill self-audit scripted from `skill-audit` base (refresh from SoNash feature branch first) |
| MI-6 | `/todo` graduation: migrate Post-Foundation Deferrals into `/todo` backlog once operational |

See `DECISIONS.md` Meta-Instructions table for full rule text.

---

## Pre-Analysis Template (MI-1, D13, D21)

### Extended sanitization + upstream/downstream scan regex (D21)

```
(sonash|SoNash|firebase|Firebase|firestore|httpsCallable|sonarcloud|SonarCloud|MASTER_DEBT|TDMS|tdms|/add-debt|Qodo|qodo|CodeRabbit|coderabbit|Gemini|npm run (patterns:check|session:gaps|hooks:health|session:end|reviews:sync|skills:validate|docs:index)|write-invocation\.ts|session-end-commit|hasDebtCandidates|pr-ecosystem-audit)
```

### `PORT_ANALYSIS.md` row schema (D13)

```
| # | Source (SoNash) | Target (JASON-OS) | Refs Found | Upstream Callers | Downstream Deps | Verdict | Port Date | Commit SHA |
```

**Verdicts:** `copy-as-is` / `sanitize-then-copy` / `redesign` / `skip` / `blocked-on-prereq`.

### Port-agent template (D17)

Each port step dispatches to a subagent with:
1. Run extended regex on source file; count matches per category.
2. `grep -r` for `require.*<basename>` / `import.*<basename>` in SoNash to identify upstream callers.
3. Read source file's `require`/`import` statements to identify downstream deps.
4. Write row to `PORT_ANALYSIS.md`.
5. Execute the port per verdict (copy, sanitize, redesign, or skip).
6. Commit with message: `feat(layer-N/port): <target path> — <verdict>`.

---

## Step 1 — Initialize Port Ledger

**Purpose:** Create `PORT_ANALYSIS.md` at plan output location with the schema above and initial header row.

**Files:**
- Create `.planning/jason-os-mvp/PORT_ANALYSIS.md`

**Done when:** file exists with schema header; initial commit `feat(foundation): initialize port analysis ledger`.

**Depends on:** Plan approval.

---

## Step 2 — Auto-Discover `skill-audit` Feature Branch in SoNash (D31, MI-5)

**Purpose:** Identify the SoNash branch carrying the latest `skill-audit` upgrade so Layer 0+ item `0f` can refresh from it.

**Steps:**
1. Run `git -C C:/Users/jbell/.local/bin/sonash-v0/ log --all --oneline --since=30.days -- .claude/skills/skill-audit/`.
2. Identify branch: look for most recent non-main commit touching `skill-audit/`; extract branch via `git branch --contains <sha>`.
3. Propose branch name to user.
4. ⚠️ **USER ACTION:** Confirm branch name before pull.

**Done when:** branch name confirmed; recorded in `PORT_ANALYSIS.md` notes row for item `0f`.

**Depends on:** Step 1.

---

## Layer 0+ — Zero-to-Low-Cost Wins

**Purpose:** Ship 10 items that address research-flagged gaps at zero infrastructure cost. Runs manually in main session (D17); no port-agents.

**Execution mode:** Interleaved with Layer 0 (D16 parallel-where-possible). Items 0a, 0b, 0c, 0d, 0e, 0i, 0j have no dependencies; 0f depends on Step 2; 0g requires user-action steps; 0h creates the husky scaffold that future items extend.

**Effort:** ~3.5-4.5h total including pre-analysis (0j adds ~20-30 min).

### 0a — PROACTIVELY clauses on all 8 agents (D8, G4)

**Files to modify:**
- `.claude/agents/deep-research-searcher.md`
- `.claude/agents/deep-research-synthesizer.md`
- `.claude/agents/deep-research-verifier.md`
- `.claude/agents/deep-research-final-synthesizer.md`
- `.claude/agents/deep-research-gap-pursuer.md`
- `.claude/agents/contrarian-challenger.md`
- `.claude/agents/otb-challenger.md`
- `.claude/agents/dispute-resolver.md`

**Change:** Add `PROACTIVELY` clause to each agent's frontmatter `description` field per the 8 draft clauses in research G4 output. Source: `.research/jason-os-mvp/findings/G4-governance-annotations.md` (section "PROACTIVELY clauses ready-to-paste").

**Done when:** `grep -c PROACTIVELY .claude/agents/*.md` returns 8+; commit `feat(agents): add PROACTIVELY clauses per D8 item 0a`.

### 0b — `.nvmrc` (D8, G5-G20)

**File:** `.nvmrc` (new, at repo root)
**Content:** `22`
**Done when:** file exists; commit `chore(node): add .nvmrc per D8 item 0b`.

### 0c — Strip `write-invocation.ts` sections from 9 ported skills (D8, G2)

**Files to modify:** every `SKILL.md` under `.claude/skills/` (9 files: brainstorm, checkpoint, convergence-loop, deep-plan, deep-research, session-begin, skill-audit, skill-creator, todo).

**Change:** Remove any section titled "Invocation Tracking" or containing the `cd scripts/reviews && npx tsx write-invocation.ts` command. These call a SoNash-specific analytics script not in JASON-OS.

**Done when:** `grep -l write-invocation.ts .claude/skills/**/SKILL.md` returns no files; commit `chore(skills): strip write-invocation.ts sections per D8 item 0c`.

### 0d — GATE/BEHAVIORAL annotations on CLAUDE.md §4 (D8, G4 Item G12)

**File:** `CLAUDE.md`
**Change:** Add bracketed annotations to each of 16 guardrails per research G4 16-row table. Summary: 1 `[GATE]` (§4.7 push guard), 1 `[MIXED]` (§4.14 settings guardian), 14 `[BEHAVIORAL: honor-only]`.

Source: `.research/jason-os-mvp/findings/G4-governance-annotations.md` (section "GATE/BEHAVIORAL annotation table").

**Done when:** each of 16 `§4.N` headings carries a bracketed annotation; commit `docs(claude): add GATE/BEHAVIORAL annotations per D8 item 0d`.

### 0e — AgentSkills field hygiene on 9 skills (D8, G6)

**Files to modify:** every `SKILL.md` under `.claude/skills/` (9 files).

**Change:** Add two frontmatter fields per AgentSkills standard:
```yaml
compatibility: agentskills-v1
metadata:
  version: <per-skill-version>
```

Source: `.research/jason-os-mvp/findings/G6-agentskills-feasibility.md`. Per research, required fields (`name`, `description`) already present; this adds optional fields for cross-tool recognition.

**Done when:** `grep -l "compatibility: agentskills-v1" .claude/skills/**/SKILL.md | wc -l` returns 9; commit `feat(skills): add AgentSkills compatibility + metadata.version per D8 item 0e`.

### 0f — Refresh `skill-audit` from SoNash feature branch (D30, MI-5)

**Depends on:** Step 2 (branch identified).

**Steps:**
1. ⚠️ **USER ACTION:** Pull SoNash locally onto identified branch (I will propose exact command).
2. Run pre-analysis on `C:/Users/jbell/.local/bin/sonash-v0/.claude/skills/skill-audit/SKILL.md` + any companion files.
3. Log row in `PORT_ANALYSIS.md`. Verdict likely `sanitize-then-copy` (skill-audit likely references SoNash skill names in examples).
4. Replace JASON-OS `.claude/skills/skill-audit/` contents with sanitized SoNash version.
5. ⚠️ **USER ACTION:** **Restart Claude Code session** to reload skill registry per memory `feedback_agent_hot_reload.md`.

**Done when:** JASON-OS `.claude/skills/skill-audit/SKILL.md` frontmatter matches SoNash feature-branch version; commit `feat(skills/skill-audit): refresh from SoNash feature branch per D30 MI-5`.

### 0g — PR-review integrations infrastructure (D22, D23, MI-4)

**Scope:** Qodo + SonarCloud only (CodeRabbit excluded per D23; Gemini deferred).

**Steps:**
1. ⚠️ **USER ACTION:** Sign up for SonarCloud, connect the JASON-OS GitHub repo.
2. ⚠️ **USER ACTION:** Install Qodo GitHub App on the JASON-OS repo.
3. ⚠️ **USER ACTION:** Create GitHub secret `SONAR_TOKEN` with SonarCloud project token.
4. Create `sonar-project.properties` at repo root with minimal config:
   ```properties
   sonar.projectKey=jasonmichaelbell78-creator_JASON-OS
   sonar.organization=jasonmichaelbell78-creator
   sonar.sources=.
   sonar.exclusions=.research/**,.planning/**,node_modules/**
   ```
5. Create `.github/workflows/sonarcloud.yml` (SonarCloud scan on push + PR).
6. Optional: create `.qodo.yaml` at repo root with any project-specific Qodo config.

**Done when:** SonarCloud scan runs on next push; Qodo comments on test PR; commit `feat(ci): wire Qodo + SonarCloud per D22 D23 MI-4`.

### 0h — Husky scaffold (D36-revised)

**Purpose:** Create the husky layer so future pre-commit/pre-push checks are single-line additions (MI-6 migration target from `/todo` backlog).

**Files:**
- Create `package.json` (minimal — dev deps only):
  ```json
  {
    "name": "jason-os",
    "version": "0.0.1",
    "private": true,
    "scripts": {
      "prepare": "husky || echo 'Husky not available'"
    },
    "devDependencies": {
      "husky": "^9"
    },
    "engines": {
      "node": ">=22"
    }
  }
  ```
- Create `.husky/_shared.sh` — minimal shared helpers (log target, skip reason helpers). Source pattern: SoNash `.husky/_shared.sh`, sanitized.
- Create `.husky/pre-commit`:
  - gitleaks secrets scan (blocking if gitleaks installed)
  - advisory warning if gitleaks missing
- Create `.husky/pre-push`:
  - escalation-gate stanza (checks for `.claude/hook-warnings.json` error-severity with ack-file comparison — port from SoNash pre-push lines 36-108)
  - wrapper around existing block-push-to-main behavior

**⚠️ USER ACTION:** `npm install` after committing to initialize husky; install gitleaks (`winget install Gitleaks.Gitleaks` on Windows).

**Done when:** `.husky/pre-commit` + `.husky/pre-push` exist and fire on test commit; commit `feat(husky): scaffold pre-commit + pre-push per D36-revised`.

### 0j — CLAUDE.md §1 + §2 fill-in (D3, D4, D24)

**Purpose:** Land the stack declaration (D3) and lightweight security section (D24) decided in discovery. §3 Architecture stays deferred (D4, Post-Foundation Deferrals).

**File to modify:** `CLAUDE.md`

**§1 Stack replacement:**

Replace the `_TBD — stack not yet chosen. Add versions here once decided._` block under `## 1. Stack` with:

```markdown
## 1. Stack

**Project stack:** agnostic / per-user. JASON-OS does not impose a stack on
downstream projects. The repo that consumes JASON-OS chooses its own language
and tooling.

**Claude Code infrastructure:** Node.js 22 (pinned via `.nvmrc`). All hooks,
scripts under `scripts/`, `scripts/lib/`, and husky infrastructure are
Node.js-only. This is the minimum required to run Claude Code hooks and the
/todo skill; downstream projects are not required to use Node.js themselves.

**Package manager:** `npm` (minimal `package.json` exists solely for husky +
dev dependencies; no runtime deps).
```

**§2 Security Rules replacement:**

Replace the `_TBD — populated when the stack and integration points are chosen._` block under `## 2. Security Rules` with:

```markdown
## 2. Security Rules

### Helpers at file-I/O boundaries

All shell scripts, hooks, and any Node.js code touching file I/O, CLI args,
or error output MUST use the project helpers in `scripts/lib/`:

- `scripts/lib/sanitize-error.cjs` — never log raw `error.message`
- `scripts/lib/security-helpers.js` — path traversal, input validation
- `scripts/lib/safe-fs.js` — file reads with try/catch wrapping

See §5 Anti-Patterns for the specific patterns to avoid.

### CI security pipeline

Every PR runs through the following security gates before merge:

- **Gitleaks** (pre-commit + CI) — secrets detection
- **Semgrep** (CI, `.github/workflows/semgrep.yml`) — static analysis
- **CodeQL** (CI, `.github/workflows/codeql.yml`) — deep semantic analysis
- **Dependency Review** (CI, `.github/workflows/dependency-review.yml`) —
  new-dep vulnerability check on PRs
- **Scorecard** (CI, `.github/workflows/scorecard.yml`) — supply chain
  posture scoring
- **SonarCloud** (CI, `.github/workflows/sonarcloud.yml` per Layer 0+ item
  0g) — quality gate + security hotspots
- **Qodo** (GitHub App per Layer 0+ item 0g) — AI PR review

### Secrets

No secrets in the repo. Secrets live only in GitHub Actions secrets or the
operator's local env. `.env.local` pattern if any such file becomes needed;
never committed.
```

**§3 Architecture:** UNCHANGED (stays `_TBD — populated as the OS structure solidifies._`). §3 fill-in is in Post-Foundation Deferrals with trigger "post-sync-mechanism-research architecture emergence."

**Done when:** both `## 1. Stack` and `## 2. Security Rules` sections have real content replacing the `_TBD_` placeholders; §3 stays TBD; commit `docs(claude): fill §1 stack + §2 security per D3 D4 D24 item 0j`.

### 0i — Pattern registry seed (D37-new)

**File:** `scripts/config/propagation-patterns.seed.json`

**Content:** Seed JSON containing the 4 CLAUDE.md §5 anti-patterns formatted for future `check-pattern-compliance.js` consumption:
```json
{
  "version": "0.1-seed",
  "patterns": [
    {
      "id": "error-sanitization",
      "severity": "high",
      "anti": "raw error.message in logs",
      "preferred": "scripts/lib/sanitize-error.cjs",
      "file_patterns": ["scripts/**/*.js", ".claude/hooks/**/*.js"]
    },
    {
      "id": "path-traversal-check",
      "severity": "critical",
      "anti": "rel.startsWith('..')",
      "preferred": "/^\\.\\.(?:[\\\\/]|$)/.test(rel)",
      "file_patterns": ["scripts/**/*.js", ".claude/hooks/**/*.js"]
    },
    {
      "id": "file-read-try-catch",
      "severity": "high",
      "anti": "readFileSync without try/catch after existsSync",
      "preferred": "always wrap in try/catch — existsSync race condition",
      "file_patterns": ["scripts/**/*.js", ".claude/hooks/**/*.js"]
    },
    {
      "id": "exec-loop-global-flag",
      "severity": "critical",
      "anti": ".exec() loop without /g flag",
      "preferred": "regex must use /g flag in exec() loops",
      "file_patterns": ["scripts/**/*.js", ".claude/hooks/**/*.js"]
    }
  ]
}
```

**Done when:** file exists and validates as JSON; commit `feat(patterns): seed pattern registry from CLAUDE.md §5 per D37-new`.

### Layer 0+ Audit Checkpoint (D29)

After all 10 items land:
1. Run built-in `code-reviewer` agent (or manual code-reviewer pass) on all modified files.
2. Verify each done-when check.
3. Confirm commits follow D18 bundling (Layer 0+ cosmetic items should be ~3-5 commits total; ports are their own commits).

**Gate:** continue to Layer 0. Stop if any audit issue surfaces.

---

## Layer 0 — Immediate Repairs

**Purpose:** Fix the 2 remaining research-flagged bugs (Bug 1 C-015 and Bug 4 C-037 were refuted).

**Execution mode:** Port-agent dispatched (D17). May run parallel with Layer 0+ (D16).

**Effort:** ~2h total including pre-analysis.

### 0.1 — `/todo` full port (D9)

**Source files (SoNash):**
- `C:/Users/jbell/.local/bin/sonash-v0/scripts/planning/todos-cli.js`
- `C:/Users/jbell/.local/bin/sonash-v0/scripts/planning/render-todos.js`
- `C:/Users/jbell/.local/bin/sonash-v0/scripts/planning/todos-mutations.js`

**Target files (JASON-OS):**
- `scripts/planning/todos-cli.js`
- `scripts/planning/render-todos.js`
- `scripts/planning/todos-mutations.js`

**Hard deps already present in JASON-OS** (verified in research): `scripts/lib/safe-fs.js`, `scripts/lib/sanitize-error.cjs` (CJS wrapper for hook/CJS consumers; `.js` is the ESM canonical), `scripts/lib/parse-jsonl-line.js`. MI-1 pre-analysis must re-verify for current state.

**Port-agent steps:**
1. Run pre-analysis on all 3 source files → 3 rows in `PORT_ANALYSIS.md`.
2. Verify hard deps exist at target paths.
3. Copy all 3 files (likely `copy-as-is` if pre-analysis clean; else `sanitize-then-copy`).
4. Remove Invocation Tracking section from `.claude/skills/todo/SKILL.md` (already handled in 0c).
5. Test: run `/todo` on a test item; verify it writes to `.planning/todos.jsonl` and renders to `.planning/TODOS.md`.

**Commit:** `feat(todo): full port of 3 scripts per D9` (single commit for all 3 scripts since they're a unit).

**Done when:** `/todo` skill works end-to-end; test item persists across session.

**🟢 MI-6 Migration Checkpoint:** Once `/todo` proven working (this step completes + test passes), create a migration task at the end of Layer 1 to move Post-Foundation Deferrals into `/todo` backlog.

### 0.2 — `/add-debt` stub (D10)

**Source:** No direct SoNash source — this is a new minimal stub.

**Target:** `.claude/skills/add-debt/SKILL.md` (~60 lines)

**Content skeleton:**
```markdown
---
name: add-debt
description: Log a debt item to .planning/DEBT_LOG.md as a markdown row. Stub v0.
compatibility: agentskills-v1
metadata:
  version: 0.1-stub
---

# add-debt (v0 stub)

Stub skill: logs a single debt item to `.planning/DEBT_LOG.md` as a markdown table row.
Invoked by deep-research Phase 5 via the hasDebtCandidates routing.

## When to use
- /deep-research Phase 5 reports hasDebtCandidates=true.
- User wants to file a tech-debt item without opening the full debt system.

## Steps
1. Prompt user for: title, severity (S0/S1/S2/S3), category, notes.
2. Append a row to .planning/DEBT_LOG.md (create if missing).
3. Echo the filed row to the user.

## Upgrade trigger
When real debt tracking system is needed, migrate to full TDMS-style schema.
```

**Port-agent steps:**
1. Write the stub SKILL.md at target path.
2. Test: invoke `/add-debt` with a fake entry; verify `.planning/DEBT_LOG.md` appends.

**Commit:** `feat(skills/add-debt): minimal stub per D10`.

**Done when:** `/add-debt` skill invokable; Phase 5 routing from `/deep-research` no longer errors.

### Layer 0 Audit Checkpoint (D29)

1. `code-reviewer` on `scripts/planning/*.js` (the 3 ported files).
2. Verify `/todo` and `/add-debt` both invokable.
3. Verify `PORT_ANALYSIS.md` has rows for all 3 todo scripts with port dates + commit SHAs.

**Gate:** continue to Layer 1 prereq.

---

## Layer 1 Prereq — `hooks/lib` copy (D11, research G1)

**Purpose:** MUST land before any Layer 1 hook wiring (CH-C-003 sequencing).

**Source (SoNash):** `C:/Users/jbell/.local/bin/sonash-v0/.claude/hooks/lib/` — specifically:
- `git-utils.js`
- `state-utils.js`
- `sanitize-input.js`
- `rotate-state.js`

**Target (JASON-OS):** `.claude/hooks/lib/` (alongside existing `symlink-guard.js`)

**Port-agent steps:**
1. Pre-analyze all 4 files → 4 rows in `PORT_ANALYSIS.md`. Research claimed "zero SoNash coupling"; MI-1 requires verification.
2. If any file has unexpected coupling, redesign or skip that file (and surface to user).
3. Copy all clean files.

**Commit:** `feat(hooks/lib): copy 4 prereq files per D11` (single commit).

**Done when:** 4 new files in `.claude/hooks/lib/`; PORT_ANALYSIS.md has 4 new rows with `copy-as-is` verdict (or escalation if not).

---

## Layer 1 — Session Rhythm

**Purpose:** SESSION_CONTEXT.md + session-end + compaction defense + commit-tracker. Makes sessions feel bounded and continuous (research Criteria 1 + 2).

**Effort:** ~4-5h total including pre-analysis.

### 1.1 — Create `SESSION_CONTEXT.md` at repo root (D12)

**File:** `SESSION_CONTEXT.md` (new, at repo root)

**Format:** SoNash 5-field contract exactly (D12). Bootstrap stub per research G1:
```markdown
# Session Context — JASON-OS

## Current Session Counter
0

## Uncommitted Work
No

## Last Updated
2026-04-16

## Quick Status
Foundation bootstrap initiated. Layer 0+/0/1 complete, ready for validation session.

## Next Session Goals
- Run `/session-begin` — verify counter increments
- Execute a real small task — observe hook behavior
- Run `/session-end` — verify clean close
```

**Done when:** file exists; `session-begin` skill reads it cleanly without errors; commit `feat(session): bootstrap SESSION_CONTEXT.md per D12`.

### 1.2 — Port `session-end` v0 (research Layer 1 item 5, BOOTSTRAP_DEFERRED.md)

**Source (SoNash):**
- `.claude/skills/session-end/SKILL.md` + companions
- `scripts/session-end-commit.js` (zero SoNash deps per research)

**Target (JASON-OS):**
- `.claude/skills/session-end/SKILL.md`
- `scripts/session-end-commit.js`

**Port-agent steps:**
1. Pre-analyze SKILL.md + session-end-commit.js (expect high SoNash coupling in SKILL.md; low in script).
2. SKILL.md: strip Phase 3 entirely (references `npm run reviews:sync`, `run-ecosystem-health.js`, `scripts/debt/consolidate-all.js`, `scripts/debt/generate-metrics.js`).
3. SKILL.md Step 3: adapt to write `.planning/jason-os-mvp/PLAN.md` (D33).
4. SKILL.md: remove references to `SESSION_HISTORY.md` and `ROADMAP.md` (absent in JASON-OS).
5. session-end-commit.js: copy likely as-is (research confirmed zero SoNash deps).
6. Log rows in PORT_ANALYSIS.md.
7. Generate per-skill self-audit for session-end (MI-5) from refreshed `skill-audit` base.

**Commit:** `feat(skills/session-end): port v0 per Layer 1 item 5` (single commit including SKILL.md + script + self-audit).

**Done when:** `/session-end` invokable; writes to `SESSION_CONTEXT.md` and the current plan file.

### 1.3 — Wire `pre-compaction-save.js` (research Layer 1 item 6)

**Source (SoNash):** `.claude/hooks/pre-compaction-save.js`
**Target (JASON-OS):** `.claude/hooks/pre-compaction-save.js`

**Port-agent steps:**
1. Pre-analyze; depends on `hooks/lib/git-utils.js` (now present via Layer 1 prereq).
2. Copy (likely `copy-as-is`).
3. Edit `.claude/settings.json` to add `PreCompact` event matcher:
   ```json
   "PreCompact": [
     {
       "hooks": [
         {
           "type": "command",
           "command": "node .claude/hooks/pre-compaction-save.js",
           "continueOnError": true
         }
       ]
     }
   ]
   ```
4. Log PORT_ANALYSIS.md row.

**Commit:** `feat(hooks/pre-compaction-save): wire per Layer 1 item 6`.

**Done when:** hook fires on compaction; `handoff.json` gets written (per CH-C-003 — first session will be sparse; that's expected).

### 1.4 — Wire `compact-restore.js` (research Layer 1 item 6)

**Source (SoNash):** `.claude/hooks/compact-restore.js`
**Target (JASON-OS):** `.claude/hooks/compact-restore.js`

**Port-agent steps:**
1. Pre-analyze; copy.
2. Edit `.claude/settings.json` SessionStart matcher to add a compact sub-matcher:
   ```json
   "SessionStart": [
     { "hooks": [{ "type": "command", "command": "node .claude/hooks/check-mcp-servers.js", "statusMessage": "Checking MCP availability...", "continueOnError": true }] },
     {
       "matcher": "compact",
       "hooks": [{ "type": "command", "command": "node .claude/hooks/compact-restore.js", "continueOnError": true }]
     }
   ]
   ```
3. Log PORT_ANALYSIS.md row.

**Commit:** `feat(hooks/compact-restore): wire on SessionStart compact matcher per Layer 1 item 6`.

**Done when:** post-compaction session restores `handoff.json` context.

### 1.5 — Wire `commit-tracker.js` (research Layer 1 item 7)

**Source (SoNash):** `.claude/hooks/commit-tracker.js`
**Target (JASON-OS):** `.claude/hooks/commit-tracker.js`

**Port-agent steps:**
1. Pre-analyze; copy.
2. Edit `.claude/settings.json` PostToolUse to add Bash matcher for commit:
   ```json
   "PostToolUse": [
     {
       "matcher": "^(?i)bash$",
       "hooks": [
         {
           "type": "command",
           "if": "Bash(git commit *)",
           "command": "node .claude/hooks/commit-tracker.js",
           "continueOnError": true
         }
       ]
     }
   ]
   ```
3. Log PORT_ANALYSIS.md row.

**Commit:** `feat(hooks/commit-tracker): wire PostToolUse Bash commit per Layer 1 item 7`.

**Done when:** `git commit` events append to `.claude/state/commit-log.jsonl`.

### Layer 1 Audit Checkpoint (D29)

1. `code-reviewer` on all 5 new/modified files.
2. Verify each done-when via manual test (run a commit, compact, restart).
3. Validate settings.json is still valid JSON (`node -e "JSON.parse(require('fs').readFileSync('.claude/settings.json','utf8'))"`).

**Gate:** continue to MI-6 migration.

---

## Step 3 — MI-6 Migration: Post-Foundation Deferrals → `/todo` Backlog

**Purpose:** Move deferred items from PLAN.md's Post-Foundation Deferrals section into `/todo` as first-class tracked items. Prevents deferred-but-forgotten.

**Trigger:** `/todo` proven working (Layer 0 item 0.1 done + tested through at least one session).

**Steps:**
1. For each item in the Post-Foundation Deferrals section below:
   - Invoke `/todo` to create a new entry.
   - Note the trigger condition as a comment/tag on the entry.
2. Replace the PLAN.md Post-Foundation Deferrals section contents with a pointer: "See /todo backlog (filter: tag=foundation-deferral)".
3. Commit: `chore(deferrals): migrate Post-Foundation Deferrals to /todo backlog per MI-6`.

**Done when:** Post-Foundation Deferrals section is a 1-line pointer; `/todo` backlog contains all migrated items.

---

## Step 4 — Pre-Push Mini-Phase (D22, MI-4)

**Purpose:** Land the `pr-review` SKILL.md port (trimmed) + `pre-commit-fixer` skill port before first PR from Foundation.

**Effort:** ~2-3h including heavy pre-analysis on pr-review.

### 4.1 — `pr-review` SKILL.md port (trimmed)

**Source (SoNash):** `.claude/skills/pr-review/SKILL.md` + 4 reference files (71 SoNash hits per BOOTSTRAP_DEFERRED.md).

**Target (JASON-OS):** `.claude/skills/pr-review/SKILL.md` + trimmed reference files.

**Port-agent steps:**
1. Pre-analyze SKILL.md — expect `sanitize-then-copy` or `redesign` verdict.
2. Drop: Firebase references, TDMS integration references, `/add-debt` references (we have the stub now), CodeRabbit references (D23 excluded), Gemini references (deferred).
3. Keep: 8-step flow, Qodo integration (generic, not the SoNash-specific custom comments), SonarCloud integration (generic quality-gate read).
4. Generate per-skill self-audit (MI-5).
5. Log PORT_ANALYSIS.md rows.

**Commit:** `feat(skills/pr-review): trimmed port for JASON-OS Qodo+SonarCloud per D22 MI-4`.

**Done when:** `/pr-review` invokable; no references to Firebase/TDMS/CodeRabbit/Gemini; reference files removed or trimmed.

### 4.2 — `pre-commit-fixer` skill port (research Layer 4 item 16)

**Source (SoNash):** `.claude/skills/pre-commit-fixer/` (~70% portable per research G5 Item G18).

**Target (JASON-OS):** `.claude/skills/pre-commit-fixer/`

**Port-agent steps:**
1. Pre-analyze. Expect moderate sanitization needed.
2. Strip SoNash-specific fix recipes (pattern-compliance, propagation, etc.); keep generic recipes (ESLint, Prettier, gitleaks, tsc).
3. Adapt to the husky scaffold (0h): reference `.husky/pre-commit` as the hook target.
4. Generate per-skill self-audit (MI-5).

**Commit:** `feat(skills/pre-commit-fixer): port per D22 Layer 4 item 16`.

**Done when:** `/pre-commit-fixer` invokable; references the JASON-OS husky scaffold.

### Pre-Push Mini-Phase Audit Checkpoint (D29)

1. `code-reviewer` on both ported skills.
2. Manual test: trigger a pre-commit failure (stage a secrets violation); confirm `/pre-commit-fixer` guidance.
3. Manual test: submit a dry-run PR to verify Qodo and SonarCloud post reviews.

**Gate:** continue to end-to-end validation.

---

## Step 5 — End-to-End Validation Session (D20)

**Purpose:** Subjective feels-like-home verification (per CH-C-006).

**Execution:** Run a real (small) work session using Foundation features. Not a plan step to execute mechanically — an actual work session with Foundation active.

**Protocol:**
1. Start with `/session-begin`. Verify:
   - Counter increments from 0 to 1.
   - `SESSION_CONTEXT.md` reads cleanly.
   - Health checks don't error (some may skip due to stack-agnostic state).
2. Do a real (small) task — add a new skill, fix a typo, anything that exercises Write/Edit.
3. Observe hooks firing:
   - `settings-guardian` on settings changes (existing).
   - `commit-tracker` on commits (new, Layer 1).
4. Force or reach compaction; after resume, verify `compact-restore` injected handoff context.
5. Run `/session-end`. Verify:
   - `SESSION_CONTEXT.md` updated.
   - Counter incremented correctly.
   - Commit step works.

**Done when:** User reports "feels like home" (or names specifically what doesn't). Retro captured per D35.

### Retro (D35)

In the same session after validation:
1. **Plan got right?** (what actually delivered as scoped)
2. **Plan missed?** (what surfaced during execution that wasn't in the plan)
3. **Do differently?** (what would shorten or sharpen the plan)

Capture in state file `process_feedback` field.

**Gate:** User decides whether to engage Layer 2/3/4 (D5 staged + D19 feels-like-home).

---

## Layer 2 — Ambient Intelligence (GATED — D5, D19)

**Engagement trigger:** User confirms "Yes, add Layer 2" after validation session.

**Re-approval required:** Yes (D34 staged approval).

**Effort:** ~3-4h including pre-analysis.

Contents (plan details filled out at time of engagement; summary now):

- **2.1** `user-prompt-handler.js` Phase A extraction — copy hook, stub `runAnalyze()` per D25 (full parameterized with `analyze-directives.json` + env var), create `pending-alerts.json` stub, wire UserPromptSubmit event.
- **2.2** `post-read-handler.js` — PostToolUse Read matcher.
- **2.3** `loop-detector.js` — add new `PostToolUseFailure` event section in settings.json (per research correction: NOT PostToolUse).
- **2.4** `governance-logger.js` — PostToolUse Write/Edit matcher on CLAUDE.md / settings.json.
- **2.5** `pre-commit-agent-compliance.js` + `track-agent-invocation.js` prerequisite (D38).

Each sub-step follows the standard port-agent flow: pre-analysis → PORT_ANALYSIS.md row → port → commit → per-skill self-audit where applicable.

**Audit checkpoint:** after Layer 2 completes.

---

## Layer 3 — Navigation Documents (GATED — D5, D19)

**Engagement trigger:** User confirms "Yes, add Layer 3" after Layer 2 lands (or after validation if skipping 2).

**Effort:** ~3-4h.

- **3.1** `AI_WORKFLOW.md` (D28) — ~180-220 lines; encodes brainstorm→research→plan→execute chain + Navigation Map + PR-review section (D22) + canonical-memory `cp` onboarding step (D27).
- **3.2** `.claude/COMMAND_REFERENCE.md` (D32) — 9 skills + 4 wired hooks + deny rules + `[PLANNED]` rows.
- **3.3** `.claude/skills/SKILL_INDEX.md` (D7, D26, D32) — 6-col schema: name, description, portability_status, source_path, source_version, last_synced; 9 rows initially. Also add the 4 frontmatter fields to each of the 9 ported skill files.
- **3.4** `.claude/HOOKS.md` (D32) — current 4 wired hooks + `[PLANNED]` rows for commit-tracker, pre-compaction-save, compact-restore, user-prompt-handler, loop-detector, governance-logger, post-read-handler, pre-commit-agent-compliance, track-agent-invocation.

**Audit checkpoint:** after Layer 3.

---

## Layer 4 — Quality Skills (GATED — D5, D19)

**Engagement trigger:** User confirms.

**Effort:** ~2-3h (note: `pre-commit-fixer` already ported in Step 4).

- **4.1** `systematic-debugging` port (Value: 9/10 per research, portable).
- **4.2** `validate-claude-folder` port (Value: 8/10 per research, portable).
- **4.3** `research-plan-team.md` port (`.claude/teams/`, ~20-30 min adapt from SoNash).

**Audit checkpoint:** after Layer 4.

---

## Step 6 — Post-Foundation Handoff (D14, MI-3)

**Purpose:** Route to the next project.

**Steps:**
1. Write `deep-plan` invocation tracking record (per skill self-audit requirement).
2. Final retro if any gated layers ran (D35 one-retro-after-firm-layers already done at Step 5; if gated layers add to it, update state file).
3. Ensure PORT_ANALYSIS.md is complete (one row per ported file).
4. Verify MI-6 migration is complete (Post-Foundation Deferrals section is a 1-line pointer to `/todo` backlog).
5. Invoke `/brainstorm sync-mechanism` — starts the next chain (brainstorm → deep-research → deep-plan → execute per memory `feedback_workflow_chain.md`).

**Brainstorm seed inputs** (pre-populated to shorten brainstorm):
- Direction: backwards sync first (SoNash → JASON-OS), forward prep for JASON-OS → downstream.
- Must be easily expandable (per MI-3).
- Anti-goal: security risk in bidirectional auto-sync (per CH-C-010).
- Open question: pattern cognition & propagation subsystem (D37) pairs here — sync-of-fixes and sync-of-config may share mechanism.

**Done when:** `/brainstorm sync-mechanism` executed; Foundation plan is archived.

---

## Audit Checkpoints Summary (D29)

| Boundary | Audit scope |
|----------|-------------|
| After Layer 0+ | 10 items across agents, CLAUDE.md (§4 annotations + §1/§2 fill-in), skills, workflow YAML, husky, registry seed |
| After Layer 0 | 3 todo scripts + add-debt stub |
| After Layer 1 prereq | 4 hooks/lib files |
| After Layer 1 | SESSION_CONTEXT.md + session-end port + 3 hook wirings + settings.json validation |
| After MI-6 migration | PLAN.md Deferrals reduced to pointer; /todo backlog populated |
| After Pre-push mini-phase | 2 skill ports |
| After validation session + retro | State file updated with retro |
| After Layer 2 | 5 hook wirings + settings.json validation |
| After Layer 3 | 4 nav docs + 9 skill frontmatter updates |
| After Layer 4 | 3 skill ports |

Each audit uses built-in `code-reviewer` agent or manual code-review pass on modified files.

---

## Post-Foundation Deferrals

**Migrated to `/todo` backlog 2026-04-17 per MI-6** (triggered by Layer 0 item 0.1 completion and Layer 0 audit PASS). Filter the live list with the `#foundation-deferral` tag. Items T3–T13 in `.planning/todos.jsonl` / `.planning/TODOS.md`:

| Todo | Title | Priority | Source |
|---|---|---|---|
| T3 | CLAUDE.md §3 Architecture fill-in | P3 | D4 |
| T4 | Memory bidirectional sync | P2 | CH-C-010 |
| T5 | Port `_shared/SELF_AUDIT_PATTERN.md` + `SKILL_STANDARDS.md` from SoNash | P2 | 0f finding 2026-04-17 |
| T6 | Port or rewrite `npm run skills:validate` refs in skill-audit | P3 | 0f finding 2026-04-17 |
| T7 | Gemini CLI integration in `/pr-review` | P3 | D23 |
| T8 | `pr-retro` skill port | P3 | BOOTSTRAP_DEFERRED |
| T9 | `synthesize` + `recall` skill ports from SoNash | P2 | Step 2 finding 2026-04-17 |
| T10 | `runAnalyze` mandatory mode flip | P3 | D6, D25 |
| T11 | Husky pre-commit enrichment (14 deferred checks) | P3 | D36-revised |
| T12 | Husky pre-push enrichment (11 deferred checks) | P3 | D36-revised |
| T13 | Pattern cognition & propagation subsystem — full port | P2 | D37 |

Trigger conditions preserved in each todo's description. Run `/todo` to review or update state. The PLAN.md Deferrals section is kept as this pointer for historical traceability; the backlog itself is `/todo`.

---

## Convergence-loop plan-verify (Phase 3.5 self-audit, done during writing)

Claims this plan makes that were verified at plan-draft time:
- ✅ JASON-OS `.claude/hooks/lib/` contains only `symlink-guard.js` (DIAGNOSIS convergence check).
- ✅ SoNash `.husky/` contains `pre-commit`, `pre-push`, `post-commit`, `_shared.sh` (verified 2026-04-16 during D36 revision).
- ✅ SoNash pattern-compliance subsystem has 8 scripts (verified by `ls scripts/` grep pattern/compliance/propagat).
- ✅ SoNash `package.json` has 7 `patterns:*` npm scripts (verified in D36 revision).
- ✅ JASON-OS `.claude/agents/` has 8 agent files; 0 PROACTIVELY clauses (DIAGNOSIS convergence check).
- ✅ JASON-OS has 9 skills in `.claude/skills/` (DIAGNOSIS convergence check).
- ✅ SoNash `scripts/planning/todos-cli.js` + siblings exist (implicit from research D9; to re-verify in Layer 0 step 0.1 pre-analysis).

Convergence: PASS on plan-assumptions.

---

## Effort Summary

| Phase | Firm / Gated | Estimate |
|-------|-------------|----------|
| Step 1-2: setup | Firm | 15-30 min |
| Layer 0+ (10 items) | Firm | ~3.5-4.5h |
| Layer 0 (2 items) | Firm | ~2h |
| Step 3: MI-6 migration | Firm | ~30 min |
| Layer 1 prereq + Layer 1 (6 items) | Firm | ~4-5h |
| Step 4: Pre-push mini-phase | Firm | ~2-3h |
| Step 5: validation + retro | Firm | ~1h + real session time |
| **Firm subtotal** | | **~13-16h** |
| Layer 2 (if engaged) | Gated | ~3-4h |
| Layer 3 (if engaged) | Gated | ~3-4h |
| Layer 4 (if engaged) | Gated | ~2-3h |
| Step 6: Handoff | Firm | ~30 min |

**All-in if all layers engaged:** ~22-28h. Budget conservatively.

---

## References

- `.planning/jason-os-mvp/DIAGNOSIS.md` — ROADMAP alignment, prior work, verification spot-checks, strategic open questions
- `.planning/jason-os-mvp/DECISIONS.md` — 38 decisions + 6 meta-instructions + open items + caveats
- `.planning/jason-os-mvp/PORT_ANALYSIS.md` — *(created at Step 1)* central ledger of every ported file
- `.research/jason-os-mvp/RESEARCH_OUTPUT.md` — research v1.2 with 3-layer MVP scope, full findings
- `.research/jason-os-mvp/findings/G1-G6.md` + `GV1-GV2.md` — gap-pursuit specifics cited in Layer 0+ items
- `CLAUDE.md` §4 (guardrails), §5 (anti-patterns seed for D37 Layer 0+ item `0i`)
- `.planning/jason-os/BOOTSTRAP_DEFERRED.md` — deferred items from bootstrap (some now addressed: session-end, pr-review; others still deferred: pr-retro, CI, copilot-instructions)
- `C:/Users/jbell/.local/bin/sonash-v0/` — SoNash source for all port steps
- User memories: `feedback_workflow_chain.md`, `feedback_user_action_steps.md`, `feedback_parallel_agents_for_impl.md`, `feedback_pre_analysis_before_port.md`, `feedback_per_skill_self_audit.md`, `feedback_todo_graduation.md`, `reference_pr_review_integrations.md`.
