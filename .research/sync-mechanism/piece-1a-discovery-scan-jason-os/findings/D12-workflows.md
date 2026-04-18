# D12: Composite Entities — Workflows, Processes, and Cross-Cutting Systems

**Agent:** D12
**Wave:** 2 (Analysis)
**Date:** 2026-04-18
**Source data:** 13 Wave 1 JSONL files (D1a, D1b, D2, D3, D4a, D4b-1, D4b-2, D4b-3, D5, D6, D7, D8, D9)
**Additional source reads:** .claude/skills/deep-research/SKILL.md, .claude/skills/session-begin/SKILL.md, .claude/skills/session-end/SKILL.md, .claude/skills/pre-commit-fixer/SKILL.md
**Total composites identified:** 15

---

## Section 1: Workflows (User-Invoked Slash Commands)

These composites are activated by the user typing a slash command. Each is a
skill-as-orchestrator with one or more agents, helpers, state files, and output
directories cooperating across a multi-phase process.

---

### 1. `/deep-research` workflow

**Trigger:** `/deep-research "<topic>"` | also spawned by deep-plan, skill-creator, research-plan-team

**End-to-end description:** Decomposes a topic into MECE sub-questions, dispatches
parallel searcher agents (Phase 1), synthesizes findings (Phase 2), verifies
claims (Phase 2.5), challenges via adversarial agents (Phase 3), resolves disputes
(Phase 3.5), pursues gaps (Phase 3.95), re-synthesizes (Phase 3.97), self-audits,
and presents a routing menu with downstream adapters.

**Orchestrator:** `.claude/skills/deep-research/SKILL.md`

| Component | Role |
|-----------|------|
| `.claude/skills/deep-research/SKILL.md` | orchestrator |
| `.claude/skills/deep-research/REFERENCE.md` | config (1405 lines, 22 sections) |
| `.claude/skills/deep-research/domains/technology.yaml` | config (domain module) |
| `.claude/agents/deep-research-searcher.md` | agent (Phase 1, parallel) |
| `.claude/agents/deep-research-synthesizer.md` | agent (Phase 2) |
| `.claude/agents/deep-research-verifier.md` | agent (Phase 2.5, 3.9) |
| `.claude/agents/contrarian-challenger.md` | agent (Phase 3) |
| `.claude/agents/otb-challenger.md` | agent (Phase 3, parallel) |
| `.claude/agents/dispute-resolver.md` | agent (Phase 3.5) |
| `.claude/agents/deep-research-gap-pursuer.md` | agent (Phase 3.95) |
| `.claude/agents/deep-research-final-synthesizer.md` | agent (Phase 3.97) |
| `.claude/skills/convergence-loop/SKILL.md` | helper (Phase 0.5 + Phase 3) |
| `.claude/state/deep-research.<slug>.state.json` | state-file |
| `.research/<topic-slug>/findings/` | output-dir |
| `.research/<topic-slug>/challenges/` | output-dir |
| `.research/<topic-slug>/RESEARCH_OUTPUT.md` | output-dir |
| `.research/<topic-slug>/claims.jsonl` | output-dir |
| `.research/<topic-slug>/sources.jsonl` | output-dir |
| `.research/<topic-slug>/metadata.json` | output-dir |
| `.research/strategy-log.jsonl` | state-file (cross-session) |
| `.research/source-reputation.jsonl` | state-file (cross-session) |
| `.research/research-index.jsonl` | state-file (cross-session, enables recall) |
| `.claude/teams/research-plan-team.md` | config (optional large-topic path) |
| `gemini-cli` | helper (cross-model verification — optional) |
| `mcp:context7` | helper (docs-profile searchers) |

**Scope:** universal | **Portability:** sanitize-then-portable
**External deps:** gemini-cli (optional), mcp:context7

**Notes:** Largest workflow by component count (25 units). 12 phases. Searchers receive
domain config from `domains/<domain>.yaml`. Windows 0-byte agent output bug has
documented mitigation (Critical Rule 4). `research-index.jsonl` enables recall/refresh
across sessions.

---

### 2. `/deep-plan` workflow

**Trigger:** `/deep-plan "<topic>"` | invoked by research-plan-team

**End-to-end description:** Discovery-first planning via exhaustive Q&A. Phase 0 checks for
prior brainstorm and research. Produces DIAGNOSIS.md + DECISIONS.md + PLAN.md. Phase 3.5
runs convergence-loop verification on the plan. Routes to execution or skill-creator.

**Orchestrator:** `.claude/skills/deep-plan/SKILL.md`

| Component | Role |
|-----------|------|
| `.claude/skills/deep-plan/SKILL.md` | orchestrator |
| `.claude/skills/deep-plan/REFERENCE.md` | config |
| `.claude/skills/convergence-loop/SKILL.md` | helper (Phase 0 DIAGNOSIS verify + Phase 3.5 plan verify) |
| `.claude/agents/deep-research-searcher.md` | agent (Phase 0 codebase exploration) |
| `.claude/teams/research-plan-team.md` | config (optional — large research-to-plan pipelines) |
| `.claude/state/deep-plan.<slug>.state.json` | state-file |
| `.planning/<topic-slug>/DIAGNOSIS.md` | output-dir |
| `.planning/<topic-slug>/DECISIONS.md` | output-dir |
| `.planning/<topic-slug>/PLAN.md` | output-dir |
| `.research/EXTRACTIONS.md` | state-file (optional — may not exist) |
| `.research/extraction-journal.jsonl` | state-file (optional — may not exist) |

**Scope:** universal | **Portability:** sanitize-then-portable
**External deps:** none

---

### 3. `/brainstorm` workflow

**Trigger:** `/brainstorm "<topic>"`

**End-to-end description:** Structured ideation via Socratic dialogue. Multi-direction
evaluation with mandatory contrarian checkpoint (conditional agent spawn). Phase 4 runs
convergence-loop verification. Produces BRAINSTORM.md that feeds downstream into
deep-plan or deep-research.

**Orchestrator:** `.claude/skills/brainstorm/SKILL.md`

| Component | Role |
|-----------|------|
| `.claude/skills/brainstorm/SKILL.md` | orchestrator |
| `.claude/skills/brainstorm/REFERENCE.md` | config |
| `.claude/skills/convergence-loop/SKILL.md` | helper (Phase 4 CL verify) |
| `.claude/agents/contrarian-challenger.md` | agent (conditional — Phase 3 stress-test) |
| `.claude/agents/deep-research-searcher.md` | agent (domain investigation) |
| `.claude/state/brainstorm.<topic-slug>.state.json` | state-file |
| `.research/<topic-slug>/BRAINSTORM.md` | output-dir |
| `.research/EXTRACTIONS.md` | state-file (optional) |
| `.research/extraction-journal.jsonl` | state-file (optional) |

**Scope:** universal | **Portability:** portable
**External deps:** none

---

### 4. `/session-begin` workflow

**Trigger:** `/session-begin` command | automatically on session start (hooks layer fires regardless)

**End-to-end description:** Two-layer composite. The automatic hook layer fires on every
SessionStart: check-mcp-servers.js inspects `.mcp.json`, compact-restore.js injects
handoff.json context after compaction. The skill layer (manual or user-triggered) loads
SESSION_CONTEXT.md, increments session counter, checks branch, checks hook anomaly log,
surfaces stale-doc warnings, and presents goal-selection prompt.

**Orchestrator:** `.claude/skills/session-begin/SKILL.md` (skill layer) | `.claude/settings.json` (hook wiring)

| Component | Role |
|-----------|------|
| `.claude/skills/session-begin/SKILL.md` | orchestrator (skill layer) |
| `.claude/skills/session-begin/REFERENCE.md` | config |
| `.claude/hooks/check-mcp-servers.js` | hook (SessionStart, automatic) |
| `.claude/hooks/compact-restore.js` | hook (SessionStart/compact, automatic) |
| `.claude/hooks/run-node.sh` | helper (launcher for all hooks) |
| `.claude/settings.json` | config (hook wiring) |
| `SESSION_CONTEXT.md` | state-file (5-field contract) |
| `.claude/state/hook-warnings-log.jsonl` | state-file |
| `.claude/state/handoff.json` | state-file (compact-restore reads) |
| `.mcp.json` | config (check-mcp-servers.js reads) |

**Scope:** project | **Portability:** sanitize-then-portable
**External deps:** none

**Notes:** Many phases DEFERRED in JASON-OS v0.1 pending Layer 2 hooks. SESSION_CONTEXT.md
5-field contract is the key data boundary.

---

### 5. `/session-end` workflow

**Trigger:** `/session-end` or `/session-end --no-push`

**End-to-end description:** Session closure pipeline. Reads git log, updates SESSION_CONTEXT.md
(all 5 fields), checks plan file currency, runs compliance review (mostly Layer-2-gated),
invokes session-end-commit.js for final git commit + push, captures learnings to
session-end-learnings.md.

**Orchestrator:** `.claude/skills/session-end/SKILL.md`

| Component | Role |
|-----------|------|
| `.claude/skills/session-end/SKILL.md` | orchestrator |
| `scripts/session-end-commit.js` | helper (git commit + push) |
| `scripts/lib/safe-fs.js` | helper |
| `SESSION_CONTEXT.md` | state-file |
| `.claude/canonical-memory/session-end-learnings.md` | state-file (append-only retro log) |
| `.claude/hooks/.session-agents.json` | state-file (Layer 2 — skip if absent) |
| `.claude/state/pending-reviews.json` | state-file (Layer 2 — skip if absent) |
| `.claude/state/handoff.json` | state-file |
| `.claude/state/agent-invocations.jsonl` | state-file (Layer 2 — skip if absent) |
| `.claude/state/override-log.jsonl` | state-file (Layer 2 — skip if absent) |
| `.claude/state/hook-warnings-log.jsonl` | state-file |
| `.claude/state/health-score-log.jsonl` | state-file (Layer 2 — skip if absent) |
| `.claude/state/commit-log.jsonl` | state-file |
| `.planning/<topic-slug>/PLAN.md` | state-file |
| `/todo skill` | helper (cross-reference) |

**Scope:** project | **Portability:** sanitize-then-portable
**External deps:** none

**Notes:** Phase 3 (metrics pipeline) stripped for v0. Phase 2 (compliance) mostly gated.
Hard-coded plan target `.planning/jason-os-mvp/PLAN.md` per D33 — needs updating when
second plan dir exists.

---

### 6. `/pr-review` workflow

**Trigger:** User pastes review content and invokes `/pr-review`; external triggers are
GitHub Actions (sonarcloud.yml) and Qodo GitHub App on PR events

**End-to-end description:** Processes pasted PR review content (Qodo, SonarCloud) through
8 steps: parse, DAS-score, categorize, fix in priority order, defer via add-debt, report,
capture learnings, update state files. State files persist per-PR+round for cross-session
and cross-compaction durability.

**Orchestrator:** `.claude/skills/pr-review/SKILL.md`

| Component | Role |
|-----------|------|
| `.claude/skills/pr-review/SKILL.md` | orchestrator |
| `.claude/skills/pr-review/reference/PARALLEL_AGENT_STRATEGY.md` | config |
| `.claude/skills/pr-review/reference/PRE_CHECKS.md` | config |
| `.claude/skills/add-debt/SKILL.md` | helper (deferred item routing) |
| `.github/workflows/sonarcloud.yml` | hook (external trigger, produces review content) |
| `sonar-project.properties` | config (SonarCloud project key) |
| `.claude/state/task-pr-review-{pr}-r{round}.state.json` | state-file |
| `.planning/PR_REVIEW_LEARNINGS.md` | state-file |
| `Qodo (GitHub App)` | helper (external — produces review content) |
| `SonarCloud (cloud service)` | helper (external — produces review content) |
| `gh CLI` | helper (PR size check — gh pr view, structural metadata only) |

**Scope:** universal | **Portability:** sanitize-then-portable
**External deps:** Qodo GitHub App, SonarCloud (SONAR_TOKEN), gh CLI

**Notes:** User paste is the required source of truth — gh pr view truncates and loses
collapsed sections. State files must be committed with each review round fix commit for
cross-locale durability.

---

### 7. `/pre-commit-fixer` workflow

**Trigger:** Pre-commit hook failure OR explicit `/pre-commit-fixer` invocation; CLAUDE.md guardrail #9 mandates this skill on failure

**End-to-end description:** Classify → fix → structured-report → user-confirm → re-commit
cycle for pre-commit failures. Reads hook output log, classifies failure category (currently
only gitleaks in v0.1), fixes or routes to add-debt, presents structured report, waits for
explicit user confirmation before re-committing.

**Orchestrator:** `.claude/skills/pre-commit-fixer/SKILL.md`

| Component | Role |
|-----------|------|
| `.claude/skills/pre-commit-fixer/SKILL.md` | orchestrator |
| `.husky/pre-commit` | hook (source of failure being fixed) |
| `.husky/_shared.sh` | helper |
| `gitleaks (external binary)` | helper |
| `.claude/skills/add-debt/SKILL.md` | helper (unfixable item routing) |
| `.git/hook-output.log` | state-file |
| `CLAUDE.md §4.9 + §4.13 + §4.14` | config (behavioral constraints) |

**Scope:** universal | **Portability:** sanitize-then-portable
**External deps:** gitleaks

---

### 8. `/todo` workflow

**Trigger:** `/todo` with subcommand (add/edit/complete/progress/delete/reprioritize/archive/list)

**End-to-end description:** Cross-session todo management. All mutations route through
todos-cli.js (advisory-locked CLI) which validates integrity pre/post, runs the mutation
op, atomically writes the JSONL, then re-renders TODOS.md. Regression guard (assertRegressionGuard)
prevents silent data loss from context compaction.

**Orchestrator:** `.claude/skills/todo/SKILL.md`

| Component | Role |
|-----------|------|
| `.claude/skills/todo/SKILL.md` | orchestrator |
| `scripts/planning/todos-cli.js` | helper (locked CLI, all mutations) |
| `scripts/planning/render-todos.js` | helper (TODOS.md renderer) |
| `scripts/planning/lib/read-jsonl.js` | helper |
| `scripts/lib/safe-fs.js` | helper |
| `scripts/lib/sanitize-error.cjs` | helper |
| `scripts/lib/todos-mutations.js` | helper (pure mutation ops, regression guard) |
| `scripts/planning/package.json` | config (ESM boundary declaration) |
| `.planning/todos.jsonl` | state-file (canonical source of truth) |
| `.planning/TODOS.md` | output-dir (rendered view) |

**Scope:** universal | **Portability:** sanitize-then-portable
**External deps:** none

---

## Section 2: Processes (Hook-Driven or Automatic)

These composites fire without user typing a command. They are wired into Claude Code
lifecycle events (SessionStart, PreToolUse, PostToolUse, PreCompact) or into git hooks
(pre-commit, pre-push).

---

### 9. Pre-commit security gate process

**Trigger:** Every `git commit` — automatic, fires before commit is written

**End-to-end description:** Gitleaks scans staged files for secrets. If secrets found, commit
is blocked. Advisory degradation if gitleaks not installed. SKIP_CHECKS/SKIP_REASON discipline
enforced by _shared.sh.

| Component | Role |
|-----------|------|
| `.husky/pre-commit` | orchestrator |
| `.husky/_shared.sh` | helper (EXIT trap, SKIP_CHECKS, SKIP_REASON) |
| `package.json (prepare script)` | config (npm install wires husky) |
| `gitleaks (external binary)` | helper |
| `.git/hook-output.log` | state-file |
| `CLAUDE.md §2` | config (security policy) |

**Scope:** universal | **Portability:** portable
**External deps:** gitleaks, husky, npm

**Notes:** 14+ additional checks planned as post-Foundation deferrals. Each is a
single-line addition to `.husky/pre-commit`.

---

### 10. Pre-push escalation gate process

**Trigger:** Every `git push` — automatic at two layers: .husky/pre-push (git layer) and block-push-to-main.js (Claude Code PreToolUse layer)

**End-to-end description:** Two parallel enforcement layers. Git layer: (1) escalation-gate
blocks push if unacknowledged error-severity warnings exist; (2) blocks direct push to
main/master. Claude Code layer: block-push-to-main.js intercepts Bash git push * calls.
Together they close the gap where a single layer could be bypassed.

| Component | Role |
|-----------|------|
| `.husky/pre-push` | orchestrator (git layer) |
| `.husky/_shared.sh` | helper |
| `.claude/hooks/block-push-to-main.js` | hook (Claude Code layer, PreToolUse) |
| `.claude/hooks/run-node.sh` | helper |
| `.claude/settings.json` | config (hook wiring) |
| `.claude/hook-warnings.json` | state-file |
| `.claude/state/hook-warnings-ack.json` | state-file |

**Scope:** universal | **Portability:** portable
**External deps:** node (inline escalation gate script)

---

### 11. Compaction state preservation process

**Trigger:** Context compaction event (PreCompact hook — automatic); recovery fires on SessionStart with 'compact' matcher

**End-to-end description:** Two-step: pre-compaction-save.js captures comprehensive state
snapshot to handoff.json before compaction. On resume, compact-restore.js reads handoff.json
and injects structured recovery context into Claude's context window.

| Component | Role |
|-----------|------|
| `.claude/hooks/pre-compaction-save.js` | orchestrator (save step) |
| `.claude/hooks/compact-restore.js` | orchestrator (restore step) |
| `.claude/hooks/run-node.sh` | helper |
| `.claude/hooks/lib/git-utils.js` | helper |
| `.claude/hooks/lib/state-utils.js` | helper |
| `.claude/hooks/lib/sanitize-input.js` | helper |
| `.claude/hooks/lib/rotate-state.js` | helper |
| `.claude/settings.json` | config (event wiring) |
| `.claude/state/handoff.json` | state-file (primary artifact) |
| `.claude/state/task-*.state.json` | state-file |
| `.claude/state/commit-log.jsonl` | state-file |
| `.claude/hooks/.session-agents.json` | state-file |
| `.claude/hooks/.session-state.json` | state-file |
| `.claude/hooks/.context-tracking-state.json` | state-file |
| `SESSION_CONTEXT.md` | state-file |
| `.claude/state/session-notes.json` | state-file |
| `.claude/plans/*.md` | state-file |
| `.claude/tmp/*-audit-progress.json` | state-file |

**Scope:** universal | **Portability:** portable
**External deps:** none

**Notes:** Stale handoff (>60 min) silently skipped. The /checkpoint skill is the manual
variant — it writes handoff.json explicitly mid-session.

---

### 12. Commit tracking and health alert process

**Trigger:** Every Bash tool call (PostToolUse hook) — automatic; internally fast-bails on non-commit calls

**End-to-end description:** Fires on every Bash call, fast-bails via regex if not a commit.
On new commits: appends structured metadata to commit-log.jsonl, logs failures to
commit-failures.jsonl, surfaces pre-commit hook output, conditionally spawns mid-session
health alerts.

| Component | Role |
|-----------|------|
| `.claude/hooks/commit-tracker.js` | orchestrator |
| `.claude/hooks/run-node.sh` | helper |
| `.claude/hooks/lib/git-utils.js` | helper |
| `.claude/hooks/lib/sanitize-input.js` | helper |
| `.claude/hooks/lib/rotate-state.js` | helper |
| `.claude/hooks/lib/symlink-guard.js` | helper |
| `scripts/lib/safe-fs.js` | helper |
| `scripts/lib/security-helpers.js` | helper |
| `.claude/state/commit-log.jsonl` | state-file (Layer A compaction resilience) |
| `.claude/state/commit-failures.jsonl` | state-file |
| `SESSION_CONTEXT.md` | state-file |
| `scripts/health/lib/mid-session-alerts.js` | helper (optional — silently skipped if absent) |
| `.git/hook-output.log` | state-file |

**Scope:** universal | **Portability:** portable
**External deps:** none

---

### 13. Settings and hook integrity protection process

**Trigger:** Write/Edit tool call on settings.json (settings-guardian.js); Read tool call on any file (large-file-gate.js) — both PreToolUse

**End-to-end description:** Two guard processes. settings-guardian.js is a hard-blocking
gate (continueOnError:false) that prevents removal of critical hooks from settings.json.
large-file-gate.js warns and blocks reads of files >5MB. Both log to hook-warnings-log.jsonl.

| Component | Role |
|-----------|------|
| `.claude/hooks/settings-guardian.js` | orchestrator (settings protection) |
| `.claude/hooks/large-file-gate.js` | orchestrator (read protection) |
| `.claude/hooks/run-node.sh` | helper |
| `.claude/hooks/lib/symlink-guard.js` | helper |
| `scripts/lib/sanitize-error.cjs` | helper |
| `scripts/lib/safe-fs.js` | helper |
| `.claude/settings.json` | config (protected resource) |
| `.claude/state/hook-warnings-log.jsonl` | state-file |

**Scope:** universal | **Portability:** sanitize-then-portable
**External deps:** none

**Notes:** CRITICAL_HOOKS list in settings-guardian.js is hardcoded — must be updated
when porting if hook names change. SKIP_GATES=1 env var bypasses large-file-gate.

---

### 14. CI security pipeline process

**Trigger:** GitHub PR creation/update or push to main (automatic GitHub Actions); Scorecard and cleanup on weekly schedule

**End-to-end description:** 6 independent GitHub Actions workflows forming a security
and quality gate: CodeQL (semantic), Semgrep (static), SonarCloud (quality + hotspots),
dependency-review (vulnerability scan), Scorecard (supply-chain), plus Dependabot auto-merge
for minor/patch updates and branch cleanup.

| Component | Role |
|-----------|------|
| `.github/workflows/codeql.yml` | hook |
| `.github/workflows/semgrep.yml` | hook |
| `.github/workflows/sonarcloud.yml` | hook |
| `.github/workflows/dependency-review.yml` | hook |
| `.github/workflows/scorecard.yml` | hook |
| `.github/workflows/auto-merge-dependabot.yml` | hook |
| `.github/workflows/cleanup-branches.yml` | hook |
| `sonar-project.properties` | config |
| `CLAUDE.md §2` | config (declares this pipeline as part of security posture) |

**Scope:** universal | **Portability:** sanitize-then-portable
**External deps:** GitHub Actions, SonarCloud (SONAR_TOKEN), CodeQL, Semgrep Docker image, OpenSSF Scorecard, Qodo GitHub App

---

## Section 3: Memory/Research/Planning Systems

Cross-cutting data flows that persist state across sessions.

---

### 15. Memory sync and canonical-memory flow

**Trigger:** Automatic load on every session (user-home MEMORY.md injected into system prompt); explicit write via Claude memory operations

**End-to-end description:** Two-tier memory system. Canonical tier (.claude/canonical-memory/,
12 files) is the curated authoritative source. User-home tier (~/.claude/projects/<project>/memory/,
60+ files) is the active working set loaded each session. No automated sync hook — promotion
from user-home to canonical is manual. session-end-learnings.md is the only project-scoped
file in canonical-memory. /session-end triggers learning capture to session-end-learnings.md.

| Component | Role |
|-----------|------|
| `.claude/canonical-memory/` | state-file (authoritative curated tier) |
| `.claude/canonical-memory/MEMORY.md` | state-file (index) |
| `~/.claude/projects/<project>/memory/MEMORY.md` | state-file (active index, injected each session) |
| `~/.claude/projects/<project>/memory/*.md` | state-file (working set) |
| `.claude/skills/session-end/SKILL.md` | helper (triggers learning capture) |
| `.claude/canonical-memory/session-end-learnings.md` | state-file (append-only retro log) |

**Scope:** user | **Portability:** sanitize-then-portable
**External deps:** none

**Notes:** The canonical-memory/ directory (12 files) is a SUBSET of the user-home memory
directory (60+ files). ~48 additional feedback memories exist in user-home that have not
been promoted to canonical. This gap is a known schema divergence — the sync mechanism
project must account for it. No automated sync hook currently exists. The loading mechanism
is built into Claude Code (MEMORY.md in system-reminder — not a custom hook).

---

## Section 4: Shared Infrastructure

Utilities used across multiple composites. These are not composites themselves but are
components in many of the above.

### `scripts/lib/` security helper layer

Used by: commit-tracker.js (safe-fs, security-helpers), large-file-gate.js (sanitize-error,
safe-fs), settings-guardian.js (sanitize-error, safe-fs), session-end-commit.js (safe-fs),
todos-cli.js (safe-fs, sanitize-error), rotate-state.js (safe-fs, security-helpers).

| Unit | Exported capabilities |
|------|----------------------|
| `scripts/lib/sanitize-error.cjs` | sanitizeError, sanitizeErrorForJson, createSafeLogger |
| `scripts/lib/security-helpers.js` | path traversal, symlink guards, safe writes, SSRF validation |
| `scripts/lib/safe-fs.js` | atomic writes, BOM-stripping reads, advisory locking, JSONL streaming |
| `scripts/lib/parse-jsonl-line.js` | safeParseLine, safeParseLineWithError |
| `scripts/lib/todos-mutations.js` | all /todo CRUD ops + regression guard |

CLAUDE.md §2 mandates these helpers at all file-I/O boundaries. They form the security
baseline shared across hooks, scripts, and skills.

### `.claude/hooks/lib/` hook utility layer

Used by: commit-tracker.js, pre-compaction-save.js, compact-restore.js, state-utils.js,
rotate-state.js.

| Unit | Purpose |
|------|---------|
| `lib/git-utils.js` | resolveProjectDir(), gitExec() — shared git helpers |
| `lib/sanitize-input.js` | control char strip, secret redaction, truncation |
| `lib/state-utils.js` | loadJson, saveJson (atomic, restricted to .claude/) |
| `lib/symlink-guard.js` | isSafeToWrite() — symlink-chain detection |
| `lib/rotate-state.js` | JSONL rotation, expiry, archive |

### `.claude/hooks/run-node.sh`

Universal launcher for all Claude Code hooks. Cross-platform Node.js resolver (PATH, fnm,
nvm-windows, Homebrew, system). Path-traversal guard on script arg. Used as the command
prefix in every hook entry in settings.json.

---

## Section 5: Learnings for Methodology

### Composite-identification technique

**What made composites easy to identify:**
- Skills with explicit `dependencies` arrays in D1a/D1b JSONL entries provided direct
  component lists. These could be cross-referenced against D2 (agents) and D3 (hooks)
  to build the full component set.
- Hooks with `event` metadata (SessionStart, PreToolUse, PostToolUse, PreCompact) made
  their role in composites immediately clear — you know which lifecycle events trigger them.
- The SKILL.md files for deep-research and session-begin explicitly name every agent and
  helper they interact with in their process overviews — high-fidelity component enumeration
  from primary sources.

**What made composites hard to identify:**
- The memory system has no obvious trigger or orchestrator — it is a data flow, not an
  invocation flow. Identifying it required noticing that user-home MEMORY.md is injected
  by Claude Code natively (not a custom hook), and that session-end has a side-effect of
  updating session-end-learnings.md.
- The two-layer push gate (husky + Claude Code hook) was initially invisible from either
  D3 or D9 alone — it required cross-referencing both to see the dual enforcement design.
- The CI security pipeline looks like 7 independent files in D9, but they are architecturally
  one composite gate because CLAUDE.md §2 treats them as a unit.

**Boundaries — what's part of a workflow vs a separate entity:**
- Rule applied: if a unit is in the `dependencies` list of the orchestrator skill, or is
  explicitly named in the skill's process overview, it is part of the composite. If it is
  merely a recommended downstream route (like add-debt being a "may" option in pr-review),
  it is listed but noted as conditional.
- The convergence-loop skill is a helper in multiple composites (brainstorm, deep-research,
  deep-plan) — it is NOT itself a composite because it is a utility primitive, not an
  end-to-end workflow.
- The `add-debt` skill appears as a helper in pr-review and pre-commit-fixer but is not
  a composite — it is a single-step utility.

---

### Schema-field candidates from composite analysis

**Fields seen in the composite data that the per-unit schema does not capture:**

1. **`trigger_kind`** — distinguish: user-command | hook-event | external-event | scheduled. This is more precise than the current `trigger` free-text field.
2. **`component_units[]`** — the components array in D12-workflows.jsonl is the critical new structure. Each entry needs: `unit` (path/name), `role` (orchestrator | agent | hook | helper | state-file | config | output-dir).
3. **`orchestrator_unit`** — the single unit that drives the composite. Currently embedded in components as role=orchestrator, but should probably be a top-level field for fast lookup.
4. **`gate_strength`** — for hook-driven composites: blocking (continueOnError:false) vs advisory (true). Matters for portability assessment.
5. **`deferred_components[]`** — components that exist in the design but are not yet wired in JASON-OS v0.1. Several composites have planned future members that should be tracked.
6. **`data_contracts[]`** — explicit data format agreements between components (e.g., SESSION_CONTEXT.md 5-field contract, RESEARCH_OUTPUT.md schema, handoff.json schema). These are load-bearing interface specs.
7. **`enforcement_layer`** — for security processes: git-layer | claude-code-layer | ci-layer. The dual-layer push gate shows that enforcement can span multiple technical layers.

**Should composites be FIRST-CLASS schema entries or derived views?**

Recommendation: **first-class entries**. Several reasons:
- Composites are the sync unit that matters most — you cannot sync `/deep-research` by copying
  one file. You need to know all 25 components.
- Composites have their own portability assessment (which may differ from any individual component's
  assessment).
- Composites have their own `depends_on_external` profile.
- A derived view computed from per-unit labels would require traversing dependency graphs —
  complex and error-prone.

The schema should have a `composites` collection alongside `units`, with explicit cross-references.

---

### Cross-category patterns

**Observation:** Every non-trivial workflow spans at least 3 of these categories:
skill + agent + state-file + helper. The `/deep-research` workflow spans all 6
categories (skill + agent + hook + helper + state-file + config + output-dir).

**Implication for schema:** The unit-level `category` field (skill/agent/hook/script/memory/etc.)
is insufficient for understanding or syncing the system. The schema needs:

- **`involved_in_composites: []`** — per-unit field listing composites this unit participates in
- **`role_in_composites: {}`** — per-unit field mapping composite name → role
- Alternatively, these can be derived from the composite's `components[]` array via an index build

**Pattern observed:** Several composites have a "dual enforcement" design (pre-push gate uses
both husky and Claude Code hook; settings protection uses both settings-guardian.js and
settings.json CRITICAL_HOOKS). The schema should be able to express that two units at
different layers enforce the same invariant.

---

### Adjustments recommended for SoNash composite scan

**SoNash has 81+ skills vs JASON-OS's ~12.** This implies:

1. **Proportionally more composites:** Estimate 40-60 composites in SoNash vs 15 in JASON-OS.
   A single D12-equivalent agent could stall (the D4b agent stalling pattern with 16+ files).
   Recommend splitting into: D12-workflows-a-m (skills a-m) and D12-workflows-n-z (skills n-z),
   plus D12-processes (automatic processes only).

2. **SoNash has more automated processes:** The BOOTSTRAP_DEFERRED.md notes that SoNash has
   consolidation pipeline, sessions:gaps, TDMS debt system, reviews:sync, ecosystem-health —
   none of these are in JASON-OS. Each is likely its own composite. Plan for 15-25 additional
   process composites in SoNash.

3. **GSD system is a major composite cluster:** SoNash has a GSD (Get Stuff Done) workflow
   system that JASON-OS references but does not port. This is likely 5-10 composites on its own.

4. **Memory system will be larger:** SoNash likely has automated sync hooks between canonical-memory
   and user-home (JASON-OS has none). The memory composite in SoNash may include actual hook
   wiring, not just manual promotion.

5. **TDMS debt system:** SoNash has a Technical Debt Management System with consolidation pipelines.
   The add-debt stub in JASON-OS is a placeholder for this. In SoNash, this becomes its own
   composite (or cluster of composites).

6. **Recommended agent split for SoNash:** Use 3 D12-equivalent agents: (a) skills a-m workflows,
   (b) skills n-z workflows, (c) automatic processes + data flows + CI. Each agent reads its
   assigned slice of Wave 1 files plus spot-reads skill source files as needed.
