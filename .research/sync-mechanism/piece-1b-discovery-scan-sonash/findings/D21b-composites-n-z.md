# D21b — Composite Workflows N-Z: Narrative Findings

**Agent:** D21b (Piece 1b SoNash Discovery Scan — Wave 2)
**Profile:** codebase
**Date:** 2026-04-18
**Scope:** Composite workflows alphabetically N-Z (pr-review through website-analysis)
**JSONL output:** `D21b-composites-n-z.jsonl`

---

## Overview

15 composite workflows identified and documented. Each record has `type: composite` per
SCHEMA_SPEC.md Section 3J. Sources: Wave 1 narrative findings from D1a-D1f (skills),
D2a-D2b (agents), D3a-D3b (hooks), D6a-D6d (scripts), D8a (health), D10a (reviews),
D13 (tools/statusline), and D17b (root configs including .husky/).

**JASON-OS port status summary:**

| Composite | Port Status |
|-----------|-------------|
| pr-review-workflow | PORTED (v4.6-jasonos-v0.1, trimmed) |
| pr-retro-workflow | SoNash-only |
| pre-commit-gate-workflow | PARTIAL (JASON-OS minimal Wave 0-1 only) |
| pre-push-gate-workflow | PARTIAL (block-push-to-main.js ported; escalation gate absent) |
| session-begin-workflow | PORTED (JASON-OS v2.1 > SoNash v2.0 — JASON-OS ahead) |
| session-end-workflow | PORTED (significant Phase 3 stripped) |
| skill-audit-workflow | PARTIAL (v3.1 in JASON-OS; SoNash at v4.0) |
| skill-creator-workflow | PORTED (v3.4, current in both) |
| statusline-tool-workflow | PORTED (16-widget port vs SoNash 22-widget) |
| synthesize-analyze-recall-workflow | SoNash-only (CAS cluster — all-or-nothing) |
| test-suite-workflow | SoNash-only (product-specific routes) |
| todo-workflow | PORTED (v1.2, fully in sync) |
| warning-ack-lifecycle-workflow | PARTIAL (append only; resolve+sync not confirmed) |
| website-analysis-workflow | SoNash-only (CAS cluster) |

**Note:** `repo-analysis-workflow` was considered but merged with the `cas-pipeline-workflow`
composite in D21a (repo-analysis is one of the 4 CAS handler skills in an all-or-nothing
bundle). It is not duplicated here.

**Ported/partial composites:** 8 of 15 (5 full, 3 partial)
**SoNash-only composites:** 7 of 15
**Unique data_contracts defined:** 26

---

## Cross-Reference to D21a

D21a (composites A-M) identified 12 composites across:
- alerts-workflow, audit-family-ecosystem-workflow, cas-pipeline-workflow (all-or-nothing),
  checkpoint-workflow, cross-repo-sync-meta-workflow, debt-runner-workflow,
  deep-plan-workflow, deep-research-workflow, ecosystem-audit-family-workflow,
  github-health-workflow, hook-warning-lifecycle-workflow, mcp-builder-workflow

D21b (composites N-Z) adds 15 composites. Cross-cutting dependencies:

```
convergence-loop ← used by: pr-review, pr-retro, skill-audit, skill-creator,
                             session-end (learning loop), synthesize

session-lifecycle cluster: session-begin ← checkpoint ← pre-compaction-save.js
                            session-begin → session-end (SESSION_CONTEXT.md contract)
                            session-begin → alerts (--limited call)
                            session-begin → github-health (Phase 3 DEFERRED in JASON-OS)

pre-commit-gate + pre-push-gate share: _shared.sh, hook-checks.json, SKIP_CHECKS infrastructure

warning-ack-lifecycle ← produced by: 6+ hooks (append-hook-warning.js)
                      ← consumed by: pre-push-gate (escalation), statusline D5, alerts, session-begin

CAS cluster (D21a + D21b):
  cas-pipeline-workflow (handlers) → synthesize-analyze-recall-workflow (query layer)
  Both share analysis.json contract, extraction-journal.jsonl, SQLite DB

write-invocation.ts ← consumed by: pr-review, pr-retro, skill-audit, skill-creator
                      (all stripped in JASON-OS ports — invocation tracking absent)
```

---

## Composite 1: pr-review-workflow

**Workflow family:** pr-review
**JASON-OS port status:** PORTED (v4.6-jasonos-v0.1, trimmed — 3 reference files dropped)

### Architecture

```
User invokes /pr-review (or /pr-retro routes here)
        │
        ▼ Step 0: Security Threat Model pre-check
  Threat model review (STRIDE framework)
        │
        ▼ Step 1: Parallel agent dispatch (PARALLEL_AGENT_STRATEGY.md)
  N × reviewer agents (parallel)
    each reviewer: DAS framework (Describe-Assess-Suggest)
        │
        ▼ Step 2: Finding synthesis
  Merge parallel findings, dedup, grade
        │
        ▼ Step 3: External reviewer integration (SoNash)
  ├── Qodo (GitHub App — automated review)
  └── SonarCloud (quality gate + hotspot check)
  [Gemini CLI cross-model review — deferred in JASON-OS]
  [CodeRabbit — dropped in JASON-OS port]
        │
        ▼ Step 4: Learning capture
  write-review-record.ts → .claude/state/reviews.jsonl
  write-invocation.ts → data/ecosystem-v2/invocations.jsonl [SoNash only]
        │
        ▼ Step 5: Deferred item intake
  write-deferred-items.ts → data/ecosystem-v2/deferred-items.jsonl
  /add-debt (stub in JASON-OS; full TDMS pipeline in SoNash)
```

### JASON-OS vs SoNash Delta

SoNash reference/ has 5 files (PRE_CHECKS.md, PARALLEL_AGENT_STRATEGY.md,
LEARNING_CAPTURE.md, SONARCLOUD_ENRICHMENT.md, TDMS_INTEGRATION.md).
JASON-OS port has 2 (PRE_CHECKS.md, PARALLEL_AGENT_STRATEGY.md only).

Dropped in JASON-OS port: CodeRabbit reviewer, Gemini cross-model review,
TDMS pipeline (replaced by /add-debt stub), invocation tracking,
3 reference docs (LEARNING_CAPTURE.md, SONARCLOUD_ENRICHMENT.md, TDMS_INTEGRATION.md).

Core preserved: DAS framework, Security Threat Model, 8-step protocol, parallel agent
strategy, Qodo + SonarCloud integration, reviews.jsonl data contract.

### Data Contracts

- `.claude/state/reviews.jsonl` — live write target for pr-review skill (ReviewRecord schema).
  DUAL-PATH SPLIT: `.claude/state/` is live writes; `data/ecosystem-v2/` is migration
  pipeline (pr-retro's backfill path). JASON-OS uses `.claude/state/` path only.
- `data/ecosystem-v2/deferred-items.jsonl` — DeferredItemRecord consumed by add-debt and
  intake-pr-deferred.js (TDMS pipeline — not present in JASON-OS).

---

## Composite 2: pr-retro-workflow

**Workflow family:** pr-review
**JASON-OS port status:** SoNash-only

### Architecture

```
/pr-retro invocation (or session-end learning loop)
        │
        ▼ Step 1: Cross-PR pattern analysis
  reads: .claude/state/reviews.jsonl (pr-review output)
        │
        ▼ Step 2: Pattern promotion pipeline
  promote-patterns.ts
    ├── recurrence detection (N reviews threshold)
    ├── writes: docs/agent_docs/CODE_PATTERNS.md (new category entries)
    └── updates: .claude/state/consolidation.json (idempotency)
        │
        ▼ Step 3: Automation artifacts
  generate-fix-template-stubs.ts → FIX_TEMPLATES.md
  generate-claude-antipatterns.ts → CLAUDE.md Section 4 (auto-update)
        │
        ▼ Step 4: Retro capture
  write-retro-record.ts → .claude/state/retros.jsonl
        │
        ▼ Step 5: Learning output
  render-reviews-to-md.ts → docs/AI_REVIEW_LEARNINGS_LOG.md
  /add-debt (deferred items intake)
```

### Critical Design: Auto-updating CLAUDE.md Section 4

The most significant architectural feature of pr-retro: `generate-claude-antipatterns.ts`
automatically writes to CLAUDE.md Section 4 (anti-patterns section) based on promoted
patterns. This is a self-improving feedback loop: each PR review → pr-retro → CODE_PATTERNS.md
→ CLAUDE.md behavioral rules. JASON-OS currently hand-edits CLAUDE.md Section 4; this
automation is blocked until the full pipeline is ported.

### JASON-OS Port Considerations

Minimum port footprint: write-retro-record.ts + write-review-record.ts + render-reviews-to-md.ts.
Full pipeline also needs promote-patterns.ts + generate-claude-antipatterns.ts.
TDMS components (intake-pr-deferred.js) remain blocked until TDMS is ported.

---

## Composite 3: pre-commit-gate-workflow

**Workflow family:** pre-commit-gate
**JASON-OS port status:** PARTIAL (minimal Wave 0-1 only; SoNash has full Wave 3)

### Architecture (SoNash full version)

```
git commit attempt → .husky/pre-commit fires
        │
        ▼ Wave 0: gitleaks secret detection (hard block)
        │
        ▼ Wave 1: Lint gates
  ├── oxlint (fast linter — SoNash-specific rules)
  ├── check-agent-compliance.js
  └── check-doc-headers.js
        │
        ▼ Wave 2: Validation gates (blocking)
  ├── check-propagation-staged.js (registry-based propagation)
  ├── check-cross-doc-deps.js (document sync)
  └── validate-hook-manifest.js (hook contract manifest)
        │
        ▼ Wave 3: Telemetry + audit gate
  ├── date +%s%N nanosecond timing per check
  ├── writes: .claude/state/hook-runs.jsonl (timing telemetry)
  ├── captures: .git/hook-output.log (HOOK_OUTPUT_LOG pattern)
  └── AUDIT_TRACKER.md threshold gate
```

### SKIP_CHECKS Infrastructure (absent in JASON-OS)

SoNash `_shared.sh` implements a consolidated bypass mechanism:
```bash
SKIP_CHECKS="check1,check2"  # CSV list of check IDs to bypass
SKIP_REASON="explanation"     # Required justification (10-500 chars, single-line)
```
This is significantly more robust than JASON-OS's SKIP_REASON-only approach: operators
can bypass specific checks without disabling the entire gate.

### hook-checks.json — The Check Contract Manifest

`scripts/config/hook-checks.json` is a canonical list of all pre-commit and pre-push
checks with their IDs, commands, and `reads_from` paths. Not present in JASON-OS.
This manifest enables `validate-hook-manifest.js` to verify the hook ecosystem's
own contracts — meta-validation of the hook system.

---

## Composite 4: pre-push-gate-workflow

**Workflow family:** pre-push-gate
**JASON-OS port status:** PARTIAL (block-push-to-main.js ported; escalation gate absent)

### Architecture (SoNash full version)

```
git push attempt → Two independent enforcement layers fire:
        │
        ├── Layer 1: .husky/pre-push (git layer)
        │     │
        │     ▼ Wave 0: Escalation gate (CRITICAL)
        │   reads: .claude/hook-warnings.json
        │   if ANY unacknowledged error-severity warnings → BLOCK
        │     │
        │     ▼ Wave 1: Registry validation
        │   check-propagation.js (Mode A + Mode B)
        │   check-triggers.js (security/skill thresholds)
        │     │
        │     ▼ Wave 2: Complexity gates
        │   check-cc.js (cognitive complexity)
        │   check-cyclomatic-cc.js
        │   check-backlog-health.js
        │
        └── Layer 2: block-push-to-main.js (Claude Code PreToolUse)
              fires when Claude executes: Bash(git push *)
              blocks push to main/master
              [PORTED to JASON-OS]

Parallel:
.husky/post-commit → resolve-hook-warnings.js (auto-clear stale warnings)
```

### Two-Layer Enforcement Pattern

The pre-push gate operates at two independent layers:
1. **Git layer** (`.husky/pre-push`): fires on any CLI `git push`, including manual
   terminal pushes outside Claude Code
2. **Claude Code layer** (`block-push-to-main.js` PreToolUse): fires when Claude
   Code's Bash tool executes a push command

JASON-OS has Layer 2 only. The absence of Layer 1's escalation gate means unacknowledged
hook warnings do not block manual terminal pushes in JASON-OS.

### post-commit warning resolver

SoNash runs `scripts/resolve-hook-warnings.js` after every commit (`.husky/post-commit`).
This auto-clears stale warnings that the commit just fixed, preventing the pre-push
escalation gate from blocking on already-resolved issues. Not present in JASON-OS — creates
a scenario where warnings accumulate without automatic cleanup.

---

## Composite 5: session-begin-workflow

**Workflow family:** session-lifecycle
**JASON-OS port status:** PORTED (JASON-OS v2.1 > SoNash v2.0 — unusual version inversion)

### Architecture

```
Session start (user opens Claude Code)
        │
        ▼ Phase 0: Automatic (implicit — hook fires before skill)
  compact-restore.js (SessionStart/compact matcher)
    reads: .claude/state/handoff.json → injects recovery context
        │
        ▼ User invokes /session-begin
        │
        ▼ Phase 1: Initialization
  ├── Duplicate detection (anti-repeat guard)
  ├── Session counter increment (SESSION_CONTEXT.md)
  ├── SESSION_CONTEXT.md load
  └── Phase 1.1: Secrets decryption [LIVE in SoNash; DEFERRED in JASON-OS]
        │
        ▼ Phase 2: Validation
  ├── Branch validation (main = risk flag)
  ├── Stale docs check (git log)
  ├── Phase 2.4: Session gap detection [LIVE in SoNash; DEFERRED in JASON-OS]
  └── Phase 2.6: Prior research surface (.research/research-index.jsonl) [SHOULD in SoNash; DEFERRED in JASON-OS]
        │
        ▼ Phase 3: Health battery (8 scripts in SoNash; ENTIRE PHASE DEFERRED in JASON-OS)
  ├── npm run patterns:check
  ├── npm run review:check
  ├── npm run lessons:surface
  ├── npm run session:gaps
  ├── npm run roadmap:hygiene
  ├── npm run reviews:lifecycle
  ├── npm run hooks:analytics
  └── scripts/run-github-health.js
        │
        ▼ Phase 4: Gate checks
  ├── Override trend analysis [DEFERRED in JASON-OS]
  ├── Warning gate (hook-warnings-log.jsonl 10+ check [LIVE in both])
  ├── Infra failure gate [DEFERRED in JASON-OS]
  └── Tech debt snapshot [DEFERRED in JASON-OS]
        │
        ▼ Phase 5: Goal selection
  [LIVE in both]
```

### JASON-OS Ahead Pattern

JASON-OS is v2.1 while SoNash is v2.0. JASON-OS incremented the version to document
the bootstrap DEFERRED markers. This is the only workflow family in the entire scan where
JASON-OS leads the version. Per D21a Learning #7: sync cannot be purely "SoNash is
authoritative" — JASON-OS can be ahead in specific areas.

---

## Composite 6: session-end-workflow

**Workflow family:** session-lifecycle
**JASON-OS port status:** PORTED (significant Phase 3 stripped; JASON-OS session-end-commit.js
is BETTER than SoNash version)

### Architecture

```
User invokes /session-end
        │
        ▼ Phase 1: Context preservation
  ├── SESSION_CONTEXT.md update (5-field contract)
  ├── Plan file check (.planning/<slug>/PLAN.md)
  └── State file cleanup (task-*.state.json, .claude/tmp/)
        │
        ▼ Phase 2: Compliance review [LIVE in both, though most steps DEFERRED in JASON-OS]
        │
        ▼ Phase 3: Metrics pipeline [LIVE in SoNash; STRIPPED in JASON-OS]
  ├── npm run reviews:sync (reviews.jsonl pipeline)
  ├── scripts/run-ecosystem-health.js (10-checker snapshot)
  ├── TDMS debt consolidation (scripts/debt/consolidate.js)
  └── TDMS metric generation (scripts/debt/generate-metrics.js)
        │
        ▼ Phase 4: Cleanup
  State file pruning, pre-commit summary
        │
        ▼ Final commit
  node scripts/session-end-commit.js
    ├── Updates SESSION_CONTEXT.md (dual-format regex: inline-bold + heading)
    ├── Invokes log-override.js subprocess via process.execPath (JASON-OS improvement)
    ├── Absolute path resolution for log-override.js (JASON-OS improvement)
    └── git commit --only SESSION_CONTEXT.md
        │
        ▼ Learning loop
  [LIVE in both]
```

### JASON-OS Improvement: session-end-commit.js

JASON-OS version is canonically BETTER than SoNash:
1. Uses `process.execPath` instead of string `"node"` → guarantees same Node.js binary
2. Absolute path resolution for log-override.js subprocess → robust cross-platform
3. Dual Uncommitted Work regex (supports both SoNash inline-bold AND JASON-OS heading format)

Recommendation: treat JASON-OS version as canonical. Back-port to SoNash.

---

## Composite 7: skill-audit-workflow

**Workflow family:** skill-audit
**JASON-OS port status:** PARTIAL (v3.1 in JASON-OS; SoNash at v4.0 — major gap)

### Architecture (SoNash v4.0)

```
/skill-audit (mode selection)
  ├── mode=single (v3.1 — JASON-OS has this)
  │     Phase 1: Skill selection
  │     Phase 2: 12-category interactive walkthrough
  │     Phase 3: Crosscheck vs SKILL_STANDARDS.md
  │     Phase 4: CL verification
  │     Phase 5: self-audit.js dispatch (deterministic grep+diff)
  │
  ├── mode=batch (v4.0 — SoNash only)
  │     Produce all 12 category findings at once → tmp file
  │     Phase 2.A: Cross-skill pattern detection (3+ skills threshold)
  │     Phase 2.B: Decoupled decision collection
  │     Batched Phase 3 crosscheck (ONCE across batch, not N times)
  │
  └── mode=multi (v4.0 — SoNash only)
        Audit multiple skills in one cohesive run
        Shape Y orchestration
        Parallel Phase 5 self-audit.js dispatch
        Decouple from audit-review-team (D19 decision)

self-audit.js (scripts/skills/skill-audit/):
  deterministic grep+diff verification
  12 quality categories checked mechanically
  LLM agent layer REMOVED in v4.0 D11 (Session #281)
```

### SoNash v4.0 Additions Not in JASON-OS v3.1

- `mode=batch` — parallel category finding production
- `mode=multi` — multi-skill audit in one session
- Phase 2.A cross-skill pattern detection
- Phase 2.B decoupled decision collection
- Batched Phase 3 crosscheck (O(1) vs O(N) for N skills)
- Parallel self-audit.js dispatch for multi mode
- Decoupling from `audit-review-team` team

---

## Composite 8: skill-creator-workflow

**Workflow family:** skill-creator
**JASON-OS port status:** PORTED (v3.4, current in both repos)

### Architecture

```
/skill-creator
        │
        ▼ Phase 1: Discovery + context
  reads: .research/EXTRACTIONS.md [SoNash; silently skips in JASON-OS]
        │
        ▼ Phase 2: Design Q&A
  (Complex tier: spawns Explore agent for codebase scan)
        │
        ▼ Phase 3: Scaffold
  python scripts/skill-creator/init_skill.py → new skill directory
  python scripts/skill-creator/quick_validate.py → SKILL.md structure check
        │
        ▼ Phase 4: Content authoring
  SKILL.md creation per SKILL_STANDARDS.md checklist
        │
        ▼ Phase 5: Self-audit + CL verification
  convergence-loop quick preset
  (self-audit via _shared/SELF_AUDIT_PATTERN.md)
        │
        ▼ Phase 6: Package + PR
  python scripts/skill-creator/package_skill.py
  npm run skills:validate
```

### Dependency Note: _shared/ required

`_shared/SKILL_STANDARDS.md` (16.7KB, v3.0) and `_shared/SELF_AUDIT_PATTERN.md` (14.6KB, v1.0)
are runtime dependencies — Phase 5 explicitly delegates to these files. Any port of
skill-creator that omits these shared libraries will produce skills that don't pass
the SKILL_STANDARDS.md compliance checklist in Phase 4-5.

### Origin Note

v1.0 changelog note states "Anthropic skill, Apache 2.0" — skill-creator originated
outside SoNash. The `source_project` is `sonash` (SoNash is the holding repo) but the
ultimate origin is external. D22 should consider an `upstream_origin` field.

---

## Composite 9: statusline-tool-workflow

**Workflow family:** statusline
**JASON-OS port status:** PORTED (16-widget port; SoNash at 22 widgets — 6 missing)

### Architecture

```
Claude Code session renders status bar
        │
        ▼ settings.json statusLine.command fires
  global/statusline.js → launches binary
        │
        ▼ Binary receives JSON stdin from Claude Code
  main.go
    ├── Parses stdin (model, branch, context %, tokens, agent, worktree, etc.)
    ├── Loads config (config.toml + config.local.toml merge via TOML)
    └── Calls refreshCacheIfStale() (synchronous post-render — goroutine approach failed)
        │
        ▼ widgets.go builds widget data
  16 widgets (JASON-OS) or 22 widgets (SoNash):
    Line 1: A1 A3 A4 B1 B2 [B3 dropped] C1
    Line 2: [D1 D5 dropped] H2 H3 C8 C5 C7 C6
    Line 3: weatherCluster F4 A3 [F15 dropped] [I4 dropped] E1
        │
        ▼ render.go assembles 3-line output
  ANSI colorize → stdout → Claude Code status bar

cache.go manages API-backed widgets:
  ~/.claude/statusline/cache/weather.json (F6/F7)
  ~/.claude/statusline/cache/github-pr.json (H2)
  ~/.claude/statusline/cache/github-ci.json (H3)
  ~/.claude/statusline/cache/backoff.json (failure backoff state)
  Strategy: synchronous post-render, backoff [1,2,5,10] min
```

### 6 Widgets in SoNash Not in JASON-OS (priority order for back-porting)

1. **D1 (hook health)** — reads `~/.claude/state/hook-runs.jsonl`; requires pre-commit telemetry
2. **D5 (unacked warnings)** — reads hook-warnings-log.jsonl + hook-warnings-ack.json; requires warning infrastructure
3. **A6 (active agent)** — pure stdin read, zero I/O; trivial back-port
4. **I4 (session count today)** — writes `~/.claude/statusline/sessions-today.json`; easy state file
5. **B3 (worktree name)** — pure stdin read; conditional (only useful if operator uses worktrees)
6. **F15 (system uptime)** — Windows-only shell out; low priority

### Cache Namespace Collision (active risk on this machine)

Both SoNash and JASON-OS binaries are running on the same machine. Both write to
`~/.claude/statusline/cache/github-pr.json` and `github-ci.json` with no project
namespace. The active project's cache OVERWRITES the other project's cached data on
every render cycle. This is a latent bug surfaced by D13.

### Source/Runtime Scope Split (cache.go canonical example per SCHEMA_SPEC §5.3)

`cache.go`: `source_scope: universal` (pure Go, no hardcoded paths) but `runtime_scope: machine`
(cacheDir resolves to `~/.claude/statusline/cache/` on the running machine). This is the
Piece 1b SCHEMA_SPEC canonical example for the scope split distinction.

---

## Composite 10: synthesize-analyze-recall-workflow

**Workflow family:** cas
**JASON-OS port status:** SoNash-only (CAS cluster all-or-nothing)

### Architecture

```
/analyze (router)
  ├── --synthesize flag → delegates to /synthesize
  ├── --query flag → delegates to /recall
  └── direct analysis → own pipeline

/synthesize
  reads: .research/<slug>/analysis.json (from handler skills)
  reads: .research/extraction-journal.jsonl
  Phase 1-4: extraction, insight mapping, synthesis
  Phase 2.5, 4.5: convergence-loop (quick preset) gates
  writes: .research/<slug>/EXTRACTIONS.md sections
  writes: extraction-journal.jsonl (new entries)

/recall
  reads: .research/content-analysis.db (SQLite via recall.js)
  reads: .research/EXTRACTIONS.md (for context)
  outputs: structured query results
  self-audit.js: scaffold — NOT YET WIRED (per D1d)

scripts/cas/generate-extractions-md.js:
  reads: .research/extraction-journal.jsonl
  writes: .research/EXTRACTIONS.md (full rebuild)
  NOTE: MUST NOT be manually edited

Shared dependency: .claude/skills/shared/CONVENTIONS.md (24.4KB)
  All 4-band scoring scale, tag vocabulary §14, phase marker format
```

### All-or-Nothing Constraint

synthesize, analyze, and recall cannot be ported in isolation:
- synthesize needs the analysis.json output from the handler skills
- recall needs the SQLite index from scripts/cas/update-index.js + rebuild-index.js
- analyze is a router with no independent value

Combined with the cas-pipeline-workflow from D21a, the complete CAS cluster is:
4 handler skills + 3 synthesis/query skills + 4 cas/ scripts + SQLite backend
= 12 components that must port together.

---

## Composite 11: test-suite-workflow

**Workflow family:** test-suite
**JASON-OS port status:** SoNash-only (product-specific routes embedded throughout)

### Architecture

```
/test-suite (phase selection)
  ├── Phase 1: Smoke (all routes return 200)
  │     uses: .claude/test-protocols/_base.protocol.json
  │     SoNash routes: /notebook, /admin, /journal, /meetings/all
  │
  ├── Phase 2: Feature Protocols
  │     uses: .claude/test-protocols/*.protocol.json (JSON test flow files)
  │     Playwright MCP or Chrome Extension
  │
  ├── Phase 3: Security
  │     auth redirect check, PII in network requests, security headers
  │
  ├── Phase 4: Performance
  │     load time, request count, page weight thresholds
  │
  └── Phase 5: Report
        writes: .claude/test-results/results.jsonl
        generates: .claude/test-results/report.md

test-tracker.js (PostToolUse/Bash):
  fires after test commands
  writes: .claude/state/test-runs.jsonl
  consumed by: deploy-safeguard.js (test-pass gate before deploy)
```

### Portable Methodology Despite Non-Portable Content

The protocol-driven architecture pattern (*.protocol.json files) is a portable methodology.
JASON-OS would need:
1. Playwright MCP or Chrome Extension access
2. JASON-OS-specific test protocol files
3. A non-SoNash test-tracker.js output target

The `_base.protocol.json` convention (common assertions across all protocols) is
particularly valuable — it provides a baseline test harness without protocol-specific
maintenance.

---

## Composite 12: todo-workflow

**Workflow family:** todo
**JASON-OS port status:** PORTED (v1.2, fully in sync — the only skill at full version parity)

### Architecture

```
User invokes /todo (add | list | done | delete | update)
        │
        ▼
todo/SKILL.md
  validates action + arguments
        │
        ▼
scripts/planning/todos-cli.js (locked, regression-guarded)
  7-step mutation flow:
    1. Acquire advisory file lock
    2. Read current todos.jsonl
    3. Validate mutation (schema check)
    4. Apply mutation (in-memory)
    5. Run regression guard (schema validate output)
    6. Write todos.jsonl (atomic write via temp file)
    7. Release lock
        │
        ▼ State: ~/.claude/todos/todos.jsonl (user-scope, cross-session)

Cross-feature integration:
  session-begin: surfaces pending high-priority todos
  statusline E1: reads ~/.claude/todos/ for in-progress task
  /deep-plan: references todo items in task breakdown
```

### Why todos-cli.js is Load-Bearing

The T30 fix (advisory file lock + regression guard) prevents data corruption when
concurrent processes (hook, skill, statusline) all read/write todos.jsonl simultaneously.
This is the only JSONL in the entire system with a dedicated locked CLI — all other
JSONLs use append-only patterns. The 7-step mutation flow ensures no write completes
without passing schema validation.

---

## Composite 13: warning-ack-lifecycle-workflow

**Workflow family:** hook-warning-lifecycle
**JASON-OS port status:** PARTIAL (append-hook-warning.js ported; resolve + sync NOT confirmed)

### Architecture

```
Hook fires (6+ hooks call append-hook-warning.js via execFileSync)
        │
        ▼
scripts/append-hook-warning.js
  writes: .claude/hook-warnings.json (live warning store)
  writes: .claude/state/hook-warnings-log.jsonl (telemetry)
        │
User or /alerts acknowledges warnings:
  writes per-type acks to hook-warnings-ack.json
  acknowledged[type] = {count, last_ack_at}
        │
        ▼
scripts/sync-warnings-ack.js (the "flush" operation)
  if EVERY active warning type has per-type ack:
    bump lastCleared timestamp in hook-warnings-ack.json
    → statusline D5 widget uses lastCleared for unread count
        │
        ▼
scripts/resolve-hook-warnings.js (individual warning resolution)
  marks specific warning IDs as resolved in hook-warnings.json
  auto-run by .husky/post-commit after every commit
```

### State Machine Model

The three scripts form a complete acknowledgment state machine:

```
                    [NEW]
append-hook-warning.js → hook-warnings.json
                              │
                    User/alerts acknowledges each type
                              │
sync-warnings-ack.js ──────→ lastCleared bumped
                    (if all types acked)     │
                                             ▼
                                      statusline D5 shows 0 unread

resolve-hook-warnings.js ──────→ individual WARNING_ID resolved
(called by post-commit)
```

Without `sync-warnings-ack.js`, the D5 statusline widget shows perpetual stale unread
counts even after full acknowledgment. This is the script identified by D6d as the
"missing link" — high priority port for any JASON-OS project using the statusline.

---

## Composite 14: website-analysis-workflow

**Workflow family:** cas
**JASON-OS port status:** SoNash-only (CAS cluster all-or-nothing)

### Architecture

```
/website-analysis (mode selection: Page/Site/Expedition/Cross-site)
        │
        ▼ Step 0: Compliance pre-flight
  robots.txt check
  Anthropic UA policy check
        │
        ▼ Step 1: Content extraction
  Primary: mcp__superpowers-chrome (SoNash-only)
  Fallback: WebFetch → Playwright MCP → curl
        │
        ▼ Steps 2-8: Analysis pipeline (mirrors repo-analysis architecture)
  dimension-wave, deep-read, content-eval, creator-view, engineer-view,
  value-map, coverage-audit
        │
        ▼ Step 6 self-audit: code-reviewer agent dispatch
  (creator-view.md specific — only CAS handler with explicit code-reviewer dispatch)
        │
        ▼ Phase 9: TAG_SUGGESTION + CAS integration
  writes: .research/<slug>/analysis.json (with last_synthesized_at — v2.0 contract)
  writes: .research/extraction-journal.jsonl
  validates: scripts/lib/analysis-schema.js
```

### Portability Notes

The compliance pre-flight (robots.txt + Anthropic UA check) is valuable portable
methodology — ethical web scraping discipline for any project. The WebFetch fallback
is fully operational without superpowers-chrome, making website-analysis potentially
portable once the CAS SQLite backend is ported.

---

## Cross-Composite Dependencies (N-Z + D21a)

```
SESSION LIFECYCLE CHAIN:
session-begin → alerts (--limited)
session-begin → github-health (Phase 3, DEFERRED JASON-OS)
pre-compaction-save.js → handoff.json → compact-restore.js → session-begin Phase 0
session-end → session-end-commit.js → SESSION_CONTEXT.md
checkpoint ← handoff.json → compact-restore.js [D21a]

PR REVIEW CHAIN:
pr-review → reviews.jsonl → pr-retro → CODE_PATTERNS.md → CLAUDE.md Section 4
pr-review → deferred-items.jsonl → add-debt / intake-pr-deferred.js

HOOK INFRASTRUCTURE CHAIN:
6+ hooks → append-hook-warning.js → hook-warnings.json
hook-warnings.json → pre-push-gate (escalation) → block on unacked errors
hook-warnings.json → warning-ack-lifecycle (resolve + sync)
warning-ack-lifecycle → statusline D5 (unread count)
pre-commit-gate → hook-runs.jsonl → statusline D1 (hook health)

CAS CLUSTER (spans D21a + D21b):
cas-pipeline (handler skills) → analysis.json → synthesize-analyze-recall (query layer)
cas-pipeline → extraction-journal.jsonl → generate-extractions-md.js → EXTRACTIONS.md
EXTRACTIONS.md ← deep-plan Phase 0, brainstorm Phase 0, session-end learning loop

SKILL QUALITY CHAIN:
skill-creator → _shared/SKILL_STANDARDS.md → skill-audit → self-audit.js
skill-audit → add-debt (findings routing — stub in JASON-OS)

TODO + STATUSLINE:
todo → todos.jsonl → statusline E1 (current task)
todo → todos-cli.js (7-step locked mutation flow)
```

---

## Learnings for Methodology

### 1. Version Inversion Is a Real Sync Direction Hazard

session-begin is JASON-OS v2.1 > SoNash v2.0. This is the most visible instance of
JASON-OS leading SoNash, but the same pattern may exist for session-end-commit.js
(JASON-OS version is objectively better). Any sync mechanism that treats "SoNash is
authoritative" as a universal rule will break on these cases. The sync engine needs
bidirectional comparison, not unidirectional pull-from-SoNash.

### 2. Two-Layer Enforcement Is an Architecture Pattern Worth Generalizing

The pre-push gate uses two independent enforcement layers (git + Claude Code). This
same dual-layer pattern appears in other composites: governance-logger + settings-guardian
both protect settings.json; block-push-to-main + .husky/pre-push both gate pushes.
The pattern is: for any critical invariant, enforce at both the git layer AND the Claude
Code layer so neither can be bypassed alone. D22 should add this as a methodology note.

### 3. Stripped Ports Need an Explicit Inventory

Three composites have "trimmed ports" in JASON-OS: pr-review (3 reference files dropped),
session-end (Phase 3 stripped), skill-audit (v3.1 vs v4.0 gap). In each case, what was
dropped is documented in the skill's SKILL.md version history BUT the omission is not
machine-readable. The `deferred_sections` JSONL field captures some of this, but a
`dropped_in_port` array field would make the inventory more precise. Note for D22.

### 4. The CLAUDE.md Auto-Update Pipeline Is the Highest-Value Non-Ported Feature

The pr-retro → promote-patterns → generate-claude-antipatterns → CLAUDE.md Section 4
auto-update pipeline creates a self-improving behavioral system. Currently JASON-OS
hand-edits CLAUDE.md Section 4. Porting this pipeline would make JASON-OS's behavioral
rules evolve automatically from PR review patterns — a significant capability upgrade.

### 5. The Warning Acknowledgment Trio Must Port as a Unit

append-hook-warning.js (already in JASON-OS), resolve-hook-warnings.js (absent), and
sync-warnings-ack.js (absent) form a state machine that only works when all three are
present. Porting only append without the resolve and sync scripts creates a system where
warnings accumulate indefinitely and the statusline D5 widget never clears. These three
must be ported atomically.

### 6. The "Portable Methodology vs Non-Portable Content" Pattern Is Common

Many non-portable composites have portable methodology but non-portable content:
- test-suite: protocol-driven architecture is portable; SoNash routes are not
- skill-audit: 12-category quality framework is portable; TDMS intake is not
- pre-commit-gate: SKIP_CHECKS CSV infrastructure is portable; oxlint rules are not

D22 (schema surveyor) should surface a methodology-portability field distinct from
content-portability — the current `portability` enum collapses these two concerns.

### 7. The Hook-Runs Telemetry + Statusline D1 Connection Is Load-Bearing

The pre-commit-gate's Wave 3 timing telemetry writes hook-runs.jsonl. The statusline D1
widget reads hook-runs.jsonl for the hook health indicator. The warning-ack-lifecycle
writes hook-warnings-log.jsonl. The statusline D5 widget reads hook-warnings-ack.json.
These connections mean the statusline's health indicators (D1 + D5) only work correctly
when BOTH the pre-commit telemetry AND the warning acknowledgment state machine are
fully ported. JASON-OS currently has neither — D1 and D5 were explicitly dropped from
the statusline port for this reason.

### 8. session-end-commit.js Is JASON-OS's Improvement Over SoNash

The JASON-OS version of session-end-commit.js is objectively superior: process.execPath
for subprocess, absolute path resolution, dual-format regex. This should be treated as
a BACK-PORT candidate from JASON-OS to SoNash, not the reverse. The sync mechanism
needs to handle this directionality correctly — "JASON-OS improvement" is a valid sync
direction that the schema should model.

---

## Gaps

### 1. pr-retro Reference Files Not Inventoried

D1d confirmed pr-retro has a REFERENCE.md but did not read it. The full retro reference
content (learning routes, pattern promotion thresholds, session classification) was not
captured. These details affect the data_contracts completeness for retros.jsonl.

### 2. pre-commit-gate Scripts/config/hook-checks.json Schema Not Read

D6d identified `scripts/config/hook-checks.json` as the check-contract manifest but
did not read the file. The exact schema (check IDs, commands, reads_from paths) is
undocumented here. The composite record lists it as a component_unit but without schema
field details.

### 3. skill-audit v4.0 Batch State Schema Not Fully Captured

D1c confirmed REFERENCE.md documents the "parent batch state schema" but only spot-read
50 lines. The full schema for multi-skill batch coordination in mode=multi was not
captured. This affects data_contracts completeness for the skill-audit composite.

### 4. session-start.js in session-begin-workflow Not Deep-Read

session-start.js is 1350 lines (largest hook). D3b describes it as containing the D16
warning regeneration architecture but the exact Phase 3 health script integration
wiring from session-start.js was not verified. The health script list may be in
session-start.js rather than solely in session-begin/SKILL.md.

### 5. Cache Namespace Collision Fix Not Scoped

D13 identified the `~/.claude/statusline/cache/github-pr.json` collision between SoNash
and JASON-OS on the same machine. No fix design is scoped. The composite records the
risk but a mitigation (project-namespaced cache dirs, e.g., `~/.claude/statusline/cache/
jason-os/`) is not yet designed.

### 6. todos-cli.js Lock Mechanism Not Verified Against JASON-OS

D1e confirmed both SoNash and JASON-OS are at todo v1.2 with the T30 fix. Whether the
JASON-OS version of `scripts/planning/todos-cli.js` is identical to SoNash or a trimmed
port was not verified via direct diff.

---

## Confidence Assessment

- HIGH claims: Composite identification, architecture from direct Wave 1 findings
- HIGH claims: Port status (D1c, D1d, D1e direct JASON-OS filesystem verification)
- HIGH claims: Data contract identification (from D10a, D6d direct code reads)
- MEDIUM claims: Data contract field sets (derived from skill descriptions + partial reads)
- MEDIUM claims: warning-ack JASON-OS port status (resolve + sync only "not confirmed")
- LOW claims: todos-cli.js lock mechanism JASON-OS version parity (not directly verified)
- Overall confidence: HIGH for architecture; MEDIUM-HIGH for data contract field completeness
