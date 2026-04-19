# D21a — Composite Workflows A-M: Narrative Findings

**Agent:** D21a (Piece 1b SoNash Discovery Scan — Wave 2)
**Profile:** codebase
**Date:** 2026-04-18
**Scope:** Composite workflows alphabetically A-M (alerts through mcp-builder)
**JSONL output:** `D21a-composites-a-m.jsonl`

---

## Overview

12 composite workflows identified and documented. Each record has `type: composite` per
SCHEMA_SPEC.md Section 3J. Sources: Wave 1 narrative findings from D1a-D1f (skills),
D2a-D2b (agents), D3a-D3b (hooks), D6a-D12 (scripts), D8a (health), D9 (TDMS), D10a
(reviews), and the Piece 1a D12-workflows.jsonl as the JASON-OS workflow identification
reference.

**JASON-OS port status summary:**

| Composite | Port Status |
|-----------|-------------|
| alerts-workflow | SoNash-only |
| audit-family-ecosystem | SoNash-only (TDMS-blocked) |
| cas-pipeline | SoNash-only (SQLite-blocked) |
| checkpoint | SoNash-only (portable, not yet ported) |
| cross-repo-sync-meta | JASON-OS-only (IS the sync research) |
| debt-runner | SoNash-only (TDMS-blocked) |
| deep-plan | PORTED (v3.0, 3 minor behind SoNash v3.3) |
| deep-research | PORTED (v2.0 — current) |
| ecosystem-audit-family | SoNash-only |
| github-health | SoNash-only (gh-fix-ci + Phase 3 absent) |
| hook-warning-lifecycle | PARTIAL (append-hook-warning.js ported; sync-warnings-ack.js unclear) |
| mcp-builder | SoNash-only (portable, not yet ported) |

**Ported/partial composites:** 3 of 12
**SoNash-only composites:** 9 of 12
**Unique data_contracts defined:** 21

---

## Composite 1: alerts-workflow

**Workflow family:** alerts
**JASON-OS port status:** SoNash-only

### Architecture

```
User/session-begin invocation
        │
        ▼
alerts/SKILL.md (orchestrator)
  ├── --limited flag (18 categories from session-begin)
  └── --full flag (42 categories, user-invoked)
        │
        ▼
run-alerts.js (148KB monolithic entry point)
  ├── reads: .claude/hook-warnings.json
  ├── reads: .claude/state/hook-warnings-ack.json
  ├── reads: .claude/state/alert-suppressions.json
  ├── reads: .claude/state/alerts-baseline.json
  ├── reads: .claude/state/health-ecosystem-audit-history.jsonl
  └── reads: scripts/health/run-health-check.js output
        │
        ▼
Phase 5: Fix Verification (convergence-loop quick preset)
        │
        ▼
User receives triage decisions + suppression management
```

### Data Contracts

- `.claude/state/alert-suppressions.json` — suppression records (category, reason, timestamps)
- `.claude/state/hook-warnings-ack.json` — acknowledgment journal shared with pre-push gate

### Key Architecture Note

alerts is a CONSUMER of the health ecosystem. The 148KB run-alerts.js is monolithic
(all 42 checker categories inline). This design trades maintainability for deployability
(1 file = 1 skill). SoNash health-ecosystem-audit produces the trend data alerts reads.
The co-dependency is bidirectional at the state file level.

### JASON-OS Port Considerations

The 148KB script is effectively a complete health monitoring system. Port requires either
(a) adapting the 42 checker categories to JASON-OS's health signals or (b) building a
new JASON-OS-specific checker from scratch. Priority: medium (session-begin integration
pattern is valuable).

---

## Composite 2: audit-family-ecosystem-workflow

**Workflow family:** audit-family
**JASON-OS port status:** SoNash-only (TDMS-blocked)

### Architecture

```
/audit-comprehensive (orchestrator)
  ├── Mode 1: Subagent (default)
  │     spawns 9 audit domain skills as subagents
  └── Mode 2: Teams (CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1)
              spawns as 4 agent teams

Each domain audit (hook/tdms/pr/session/script/doc/skill/health):
  ├── reads: _shared/AUDIT_TEMPLATE.md (shared protocol)
  ├── uses: mcp__plugin_episodic-memory (pre-audit context — SoNash)
  ├── runs: run-{domain}-ecosystem-audit.js (Node.js)
  │     ├── 5-6 checker scripts (domain-specific)
  │     └── 6 shared lib files (safe-fs, scoring, state-manager, etc.)
  ├── writes: .claude/tmp/{domain}-audit-progress.json
  ├── writes: .claude/state/{domain}-ecosystem-audit-history.jsonl
  └── produces: docs/audits/single-session/{domain}/findings.jsonl

/audit-aggregator (synthesis)
  ├── reads: all 9 domain findings.jsonl
  ├── applies: dedup + cross-domain pattern detection
  └── produces: consolidated report

/add-debt (TDMS intake)
  └── reads: consolidated report → MASTER_DEBT.jsonl
```

### Data Contracts

- `docs/audits/single-session/{domain}/findings.jsonl` — audit finding records (category,
  title, fingerprint, severity S0-S3, effort E0-E3, confidence, files, why_it_matters,
  suggested_fix, acceptance_tests)
- `docs/technical-debt/MASTER_DEBT.jsonl` — TDMS master storage (full schema in D9
  findings, 30+ fields)

### Cross-Dependencies

The `_shared/ecosystem-audit/` module (6 files) is a REQUIRED co-dependency for 6 of
the 9 audit skills. The other 3 (hook-ecosystem-audit, script-ecosystem-audit,
health-ecosystem-audit) are self-contained. Any port requires `_shared/ecosystem-audit/`
first.

### JASON-OS Port Considerations

Not portable as a family until TDMS pipeline is ported. Best immediate port candidates
are hook-ecosystem-audit and script-ecosystem-audit (self-contained, no `_shared/` dep,
JASON-OS hook and script directories have the same structure). Remove invocation tracking
from all ports (scripts/reviews/write-invocation.ts is SoNash-only).

---

## Composite 3: cas-pipeline-workflow

**Workflow family:** cas
**JASON-OS port status:** SoNash-only (SQLite-blocked)

### Architecture

```
Content input
  │
  ▼
Handler skill selection
  ├── /repo-analysis (GitHub repos — 9-phase pipeline)
  ├── /website-analysis (URLs — multi-mode: Page/Site/Expedition)
  ├── /document-analysis (PDFs, gists, arxiv, articles)
  └── /media-analysis (YouTube, TikTok, podcast, audio/video)
        │
        ▼ produces analysis.json (last_synthesized_at contract)
        │
        ▼
/synthesize skill
  ├── reads: analysis.json
  ├── reads: extraction-journal.jsonl
  └── writes: EXTRACTIONS.md
        │
        ▼
/analyze skill
  ├── --synthesize flag → delegates to /synthesize
  └── --query flag → delegates to /recall
        │
        ▼
/recall skill
  └── reads: content-analysis.db (SQLite index)

CAS Pipeline scripts (scripts/cas/):
  ├── update-index.js — incremental index update
  ├── rebuild-index.js — full rebuild from analysis.json files
  ├── recall.js — structured query interface
  └── generate-extractions-md.js — EXTRACTIONS.md regeneration

Shared contract:
  analysis-schema.js (Zod) validates all analysis.json files
```

### Data Contracts

- `.research/<slug>/analysis.json` — per-content analysis artifact with `last_synthesized_at`
  field (v2.0 contract, Session #284; all 4 handlers must preserve this)
- `.research/extraction-journal.jsonl` — extraction records consumed by generate-extractions-md.js
  and deep-plan Phase 0
- `.research/content-analysis.db` — SQLite full-text index

### All-or-Nothing Port Constraint

The CAS cluster is an all-or-nothing port: analyze, synthesize, recall cannot be usefully
ported in isolation. The SQLite backend + scripts/cas/ scripts are the shared substrate.
Any port decision should treat all 3 skills and all 4 handlers as a bundle.

### JASON-OS Port Considerations

Not currently useful as standalone ports. The `shared/CONVENTIONS.md` file is the CAS
family's conventions document (distinct from `_shared/` which is the audit family). Port
path: SQLite + scripts/cas/ → then all 7 skills together. The tag-vocabulary.json data
file also needs to travel with the port.

---

## Composite 4: checkpoint-workflow

**Workflow family:** session-lifecycle
**JASON-OS port status:** SoNash-only (portable, not yet ported)

### Architecture

```
User invokes /checkpoint (before risky operation)
        │
        ▼
checkpoint/SKILL.md
  ├── reads: SESSION_CONTEXT.md (current session state)
  ├── reads: .claude/state/task-*.state.json (active task states)
  ├── reads: .claude/plans/*.md (active plan)
  └── writes: .claude/state/handoff.json
        │
        ▼ (same format as pre-compaction-save.js output)
        │
        ▼
On next session (any cause — compaction or restart):
compact-restore.js (SessionStart/compact)
  └── reads: .claude/state/handoff.json → injects into context
```

### Data Contracts

- `.claude/state/handoff.json` — session snapshot (task_states, commits, git_context,
  agent_summaries, active_plan, session_notes, active_audits, saved_at). Contract shared
  with pre-compaction-save.js (same format, same consumer compact-restore.js).

### Key Design Pattern

checkpoint is the manual variant of the automatic compaction preservation. It writes the
same handoff.json that pre-compaction-save.js writes automatically on PreCompact event.
This means a user can create explicit save points mid-session via /checkpoint, and those
save points are consumed by the same compact-restore.js recovery mechanism.

### JASON-OS Port Considerations

Zero SoNash-specific content — fully portable. 4,118 bytes, no scripts. Can be ported
immediately as part of the session-lifecycle skill bundle.

---

## Composite 5: cross-repo-sync-meta-workflow

**Workflow family:** sync-mechanism
**JASON-OS port status:** JASON-OS-only (this IS the design work)

### Architecture

```
/brainstorm → BRAINSTORM.md
        │
        ▼
/deep-research (Piece 1a: JASON-OS discovery scan)
  ├── D1-D13 searcher agents → findings/*.jsonl + findings/*.md
  └── RESEARCH_OUTPUT.md (Piece 1a)
        │
        ▼
/deep-research (Piece 1b: SoNash discovery scan — current)
  ├── D1a-D19b searcher agents (Wave 1: enumeration)
  ├── D21a-D21e agents (Wave 2: composites + GSD phase)
  ├── D22 agent (schema surveyor)
  └── D23 agent (memory graph)
        │
        ▼
SCHEMA_SPEC.md (schema contract for all JSONL)
        │
        ▼
Synthesizer → RESEARCH_OUTPUT.md (Piece 1b)
        │
        ▼
/deep-plan → sync-mechanism PLAN.md
```

### Data Contracts

- `SCHEMA_SPEC.md` — the wave 1 JSONL schema (13 core fields + 6 new + per-category
  extensions). All D-agents MUST emit JSONL conforming to this spec.

### Unique Property

This workflow is meta — it IS the subject of the current research. The composite
documents the process being executed right now. The JASON-OS research infrastructure
(deep-research + searcher agents + synthesizer) is itself a composite workflow documented
in D21a (deep-research-workflow record above).

---

## Composite 6: debt-runner-workflow

**Workflow family:** tdms
**JASON-OS port status:** SoNash-only (TDMS-blocked)

### Architecture

```
/debt-runner (mode selection)
  ├── triage-batch: review MASTER_DEBT.jsonl S0/S1 items
  ├── fix-sprint: guided fix cycle with CL verification
  ├── resolve-verified: batch-mark VERIFIED items as RESOLVED
  ├── roadmap-align: cross-reference DEBT IDs with ROADMAP.md
  ├── metrics-refresh: run generate-metrics.js
  └── sprint-report: generate sprint progress report
        │
        ▼ (each mode uses staging files, never writes MASTER directly)
        │
        ▼
scripts/debt/ pipeline (selected subset per mode):
  ├── intake-manual.js / intake-audit.js / intake-pr-deferred.js
  ├── generate-views.js (after any write)
  ├── generate-metrics.js
  ├── resolve-item.js / resolve-bulk.js
  └── sync-roadmap-refs.js

/convergence-loop (verification at every mode stage)
/add-debt (stub in JASON-OS)
```

### Data Contracts

- `docs/technical-debt/MASTER_DEBT.jsonl` — canonical TDMS master (30+ field schema
  per D9 findings, DEBT-XXXX ID format, content_hash dedup)
- `docs/technical-debt/staging/` — intermediate staging files (never write MASTER directly)

### Port Path

1. Port TDMS pipeline (28 scripts/debt/*.js) → then debt-runner upgrades to
   sanitize-then-portable automatically. Per MEMORY.md, debt-runner is the TDMS upgrade
   target for JASON-OS's add-debt stub.

---

## Composite 7: deep-plan-workflow

**Workflow family:** deep-plan
**JASON-OS port status:** PORTED (v3.0 in JASON-OS; SoNash at v3.3 — 3 minor versions behind)

### Architecture

```
/deep-plan (trigger: user or research-plan-team)
        │
        ▼ Phase 0: Pre-flight
  ├── checks for prior /brainstorm output
  ├── checks for prior /deep-research output
  ├── reads .research/EXTRACTIONS.md (SoNash; silently skips in JASON-OS)
  └── offers optional research pass
        │
        ▼ Phase 1: Discovery Q&A
  spawns: Explore agent (optional — codebase scan)
  spawns: deep-research-searcher (optional — web research)
        │
        ▼ Phase 2: DECISIONS.md production
        │
        ▼ Phase 3: PLAN.md production
        │
        ▼ Phase 3.5: CL Verification (convergence-loop)
        │
        ▼ Phase 4: Routing
  ├── to /execute (direct)
  ├── via research-plan-team (team mode)
  └── via /gsd routing (SoNash-only; removed in JASON-OS)

Output artifacts:
  .planning/<slug>/DIAGNOSIS.md
  .planning/<slug>/DECISIONS.md
  .planning/<slug>/PLAN.md
  .claude/state/deep-plan.<slug>.state.json
```

### Data Contracts

- `.planning/<slug>/PLAN.md` — consumed by session-end (plan file check),
  pre-compaction-save.js (active plan snapshot), convergence-loop (Phase 3.5 verify)
- `.claude/state/deep-plan.<slug>.state.json` — compaction resilience artifact

### SoNash vs JASON-OS Delta

SoNash 3.1-3.3 added: code-state verification (UNVERIFIED flag), CL integration in Phase 0
and Phase 3.5, failure paths, and an Integration section. These are behavioral-only changes
(no new scripts). The gap is meaningful but low-risk to catch up on.

---

## Composite 8: deep-research-workflow

**Workflow family:** deep-research
**JASON-OS port status:** PORTED (v2.0 — current in both repos)

### Architecture

```
/deep-research (orchestrator, 12 phases)
        │
        ▼ Phase 0: Pre-flight + strategy
        │
        ▼ Phase 1: Parallel research dispatch
  spawns N × deep-research-searcher (parallel)
    each searcher:
      ├── profile: web|docs|codebase|academic
      ├── uses domain config (domains/{domain}.yaml)
      └── writes: .research/<slug>/findings/<sq>-FINDINGS.md
        │
        ▼ Phase 2: Synthesis
  spawns: deep-research-synthesizer
    writes: RESEARCH_OUTPUT.md, claims.jsonl, sources.jsonl, metadata.json
        │
        ▼ Phase 2.5: Verifier persistence safety net (T23 fix)
  spawns: deep-research-verifier
        │
        ▼ Phase 3: Adversarial challenge
  spawns: contrarian-challenger (steel-man + pre-mortem)
  spawns: otb-challenger
        │
        ▼ Phase 3.5: Dispute resolution
  spawns: dispute-resolver (DRAGged conflict resolution)
        │
        ▼ Phase 3.9: Verification (second pass)
  spawns: deep-research-verifier (second pass)
        │
        ▼ Phase 3.95: Gap pursuit
  spawns: deep-research-gap-pursuer
        │
        ▼ Phase 3.97: Final synthesis
  spawns: deep-research-final-synthesizer
        │
        ▼ Phase 4-5: Adapters
  ├── deep-plan adapter
  ├── skill-creator adapter
  └── add-debt adapter
```

### Data Contracts (4 key contracts)

1. `.research/<slug>/findings/*.md` — FINDINGS.md schema (Key Findings, Sources,
   Contradictions, Gaps, Serendipity, Confidence Assessment). Produced by searcher,
   consumed by synthesizer/verifier/gap-pursuer.
2. `.research/<slug>/RESEARCH_OUTPUT.md` — final deliverable consumed by deep-plan,
   skill-creator, add-debt, session-end.
3. `.research/<slug>/claims.jsonl` — structured claim records (claim_id, claim_text,
   confidence, sources, contradictions) consumed by verifier and dispute-resolver.
4. `.research/research-index.jsonl` — cross-session research registry consumed by
   session-begin and deep-plan Phase 0 recall.

### Windows 0-byte Bug Mitigation (T23)

Phase 2.5 persistence safety net directly addresses the Windows 0-byte agent output bug
(issue #39791). SKILL.md Critical Rule 4 documents the mitigation. This is a JASON-OS
platform concern that the SoNash skill adopted during the piece-1a scan.

---

## Composite 9: ecosystem-audit-family-workflow

**Workflow family:** ecosystem-audit
**JASON-OS port status:** SoNash-only

### Architecture

```
/hook-ecosystem-audit  \
/script-ecosystem-audit |  Self-contained (inline protocol)
                        |  ← best port candidates for JASON-OS
/doc-ecosystem-audit    \
/skill-ecosystem-audit   \
/pr-ecosystem-audit       } Require _shared/ecosystem-audit/ (6 files)
/session-ecosystem-audit  |
/health-ecosystem-audit  /
/tdms-ecosystem-audit   /  Not portable (audits TDMS system)

Each audit:
  ├── reads: _shared/ecosystem-audit/{5 protocol files}
  │           (except hook + script — inline)
  ├── runs: scripts/run-{audit}-ecosystem-audit.js
  │     ├── 5-6 checker scripts (domain-specific)
  │     └── 6 shared lib files (safe-fs, scoring, state-manager, etc.)
  ├── walks user through findings interactively
  ├── uses: /convergence-loop (Phase 5 verify)
  ├── defers via: /add-debt (TDMS intake — stub in JASON-OS)
  ├── writes: .claude/tmp/{audit}-audit-progress.json (compaction guard)
  └── writes: .claude/state/{audit}-ecosystem-audit-history.jsonl (trend)

/comprehensive-ecosystem-audit:
  └── orchestrates all 8 audits as parallel subagents or 4-team mode
```

### Data Contracts

- `.claude/state/{audit}-ecosystem-audit-history.jsonl` — trend data consumed by
  health-ecosystem-audit (D6 trend checker) and alerts skill (Test Health category)
- `.claude/tmp/{audit}-audit-progress.json` — compaction guard consumed by
  pre-compaction-save.js (active audits snapshot)

### Shared Library Architecture

Each audit ships 6 lib files as copies inside the skill directory (not imports from
scripts/lib/). The copy-not-symlink pattern enables self-contained deployment but creates
a maintenance hazard: any fix to scripts/lib/safe-fs.js must be propagated to all 8 skill
copies. Verified: all safe-fs.js copies are identical across the 5 mega-skills.

---

## Composite 10: github-health-workflow

**Workflow family:** github-health
**JASON-OS port status:** SoNash-only

### Architecture

```
session-begin Phase 3 (health scripts)
  └── scripts/run-github-health.js ← DEFERRED IN JASON-OS
          OR
/github-health (manual invocation)
        │
        ▼
github-health/SKILL.md
  ├── gh pr list --json → PR status
  ├── gh run list --json → CI status
  ├── gh issue list --json → issue backlog
  ├── reads: .planning/github-health-skill/DECISIONS.md (SoNash)
  ├── reads: ROADMAP.md (SoNash structure refs)
  └── uses: /gh-fix-ci (helper for CI failures)
        │
        ▼
/convergence-loop (verification)
        │
        ▼
.claude/state/github-health-report.json (output)
```

### JASON-OS Port Considerations

The core gh CLI queries are universally portable. The blocking dependency is gh-fix-ci
(absent in JASON-OS) and the session-begin Phase 3 integration (DEFERRED in JASON-OS v2.1).
The ROADMAP.md structure references need sanitization. Once gh-fix-ci is ported and
session-begin Phase 3 is un-deferred, this workflow can follow.

---

## Composite 11: hook-warning-lifecycle-workflow

**Workflow family:** hook-warning-lifecycle
**JASON-OS port status:** PARTIAL (append-hook-warning.js ported; sync status unclear)

### Architecture

```
Hook fires (check-remote-session-context / decision-save-prompt /
            governance-logger / deploy-safeguard / settings-guardian /
            large-file-gate / firestore-rules-guard)
        │
        ▼ (via execFileSync)
scripts/append-hook-warning.js
  └── appends to: .claude/hook-warnings.json
        │
        ▼ .claude/state/hook-warnings-log.jsonl (for health checkers)
        │
User reviews / acknowledges warnings:
        │
        ▼
scripts/sync-warnings-ack.js
  ├── reads: .claude/hook-warnings.json
  ├── reads: .claude/state/hook-warnings-ack.json
  └── reconciles: marks acknowledged warnings
        │
git push attempt:
        │
        ▼
.husky/pre-push (escalation gate — inline Node.js)
  ├── reads: .claude/hook-warnings.json
  └── BLOCKS push if unacknowledged error-severity warnings exist

Parallel:
block-push-to-main.js (PreToolUse hook)
  └── BLOCKS push to main/master (Claude Code layer gate)

Consumers:
  run-alerts.js → reads hook-warnings-ack.json (hook-warning alert category)
  session-begin → checks hook-warnings-log.jsonl (10+ entries threshold)
```

### Data Contracts

1. `.claude/hook-warnings.json` — live warning store (id, timestamp, hook, type, severity,
   message, acknowledged). Produced by append-hook-warning.js; consumed by sync-warnings-ack.js,
   pre-push escalation gate, run-alerts.js, session-begin.
2. `.claude/state/hook-warnings-ack.json` — acknowledgment journal. Produced by
   sync-warnings-ack.js + alerts/SKILL.md; consumed by pre-push escalation gate and run-alerts.js.

### Two-Layer Enforcement

Pre-push has two independent enforcement layers:
1. `.husky/pre-push` — git-layer gate (fires on any CLI push)
2. `block-push-to-main.js` (PreToolUse) — Claude Code layer gate (fires when Claude uses Bash)

Together they close the enforcement gap where a single-layer approach could be bypassed.

---

## Composite 12: mcp-builder-workflow

**Workflow family:** mcp-builder
**JASON-OS port status:** SoNash-only (portable, not yet ported)

### Architecture

```
/mcp-builder
        │
        ▼ Phase 1: Context Load
  ├── WebFetch: MCP specification (live URL)
  ├── WebFetch: Python SDK README (live URL)
  └── WebFetch: TypeScript SDK README (live URL)
        │
        ▼ Phase 2: Design
  reads: reference/mcp_best_practices.md
  reads: reference/{python|node}_mcp_server.md
        │
        ▼ Phase 3: Implementation
  (guided by reference docs + agent-centric design principles)
        │
        ▼ Phase 4: Evaluation
  uses: scripts/connections.py (Python evaluation harness)
  uses: scripts/evaluation.py
  references: scripts/mcp/sonarcloud-server.js (SoNash example)
```

### Notable Properties

- Network dependency baked into Phase 1 (WebFetch of live URLs)
- Binary tar.gz (shadcn-components.tar.gz) bundled inside skill directory — unusual
- Python evaluation harness (connections.py, evaluation.py) — only Python scripts in this
  composite
- The SoNash-specific sonarcloud-server.js is a Phase 4 reference example, not a runtime
  dependency

### JASON-OS Port Considerations

Highly portable — no SoNash-specific runtime dependencies. The sonarcloud-server.js
example should be replaced with a JASON-OS-appropriate example (e.g., statusline cache
server or health check MCP). Can be ported without any blocking dependencies.

---

## Cross-Composite Dependencies

```
convergence-loop ← used by: alerts, deep-plan, deep-research, debt-runner,
                             ecosystem-audit-family, github-health

add-debt ← used by: audit-family, debt-runner, ecosystem-audit-family
         (stub in JASON-OS)

session-begin ← uses: alerts (--limited), github-health, hook-warning-lifecycle
              ← depends on: checkpoint (handoff.json format)

deep-research ← used by: cross-repo-sync-meta, deep-plan (Phase 0)

TDMS pipeline ← required by: audit-family, debt-runner, ecosystem-audit-family
              (SoNash-only; not in JASON-OS)

_shared/ecosystem-audit/ ← required by: doc/skill/pr/session/tdms ecosystem audits
                         (must port before those 5 audits)

research-plan-team ← used by: deep-plan, deep-research (optional)

handoff.json contract ← shared between: checkpoint, pre-compaction-save.js,
                        compact-restore.js, session-begin
```

---

## Learnings for Methodology

### 1. Composite Boundaries Are Often Fuzzy

The most challenging categorization decision was distinguishing "composite workflow" from
"skill with associated scripts." The line I drew: a composite requires at minimum 2 of
the 4 component types (skill + agent + hook + script) AND has a user-facing multi-step
capability. Pure skills with local scripts (audit-ai-optimization) remained as `type: skill`
records in Wave 1; only workflows spanning multiple subsystems got `type: composite`.

### 2. The TDMS Pipeline Is a Composite Blocker for 3 Workflows

debt-runner, audit-family, and ecosystem-audit-family are all blocked on TDMS. They should
be treated as a dependency cluster: TDMS pipeline → all three composites unblock together.
D21b/d should note this as a cross-composite dependency pattern.

### 3. The CAS Cluster Is an All-or-Nothing Port

analyze, synthesize, recall, and the 4 handler skills cannot be usefully ported in
isolation. The SQLite backend + scripts/cas/ are the substrate. Treat all 7 as a single
port decision.

### 4. Data Contracts Were the Most Valuable Output

The `data_contracts` array in each composite record surfaced contracts that were not
obvious from individual unit records. The handoff.json contract (shared across checkpoint,
pre-compaction-save.js, compact-restore.js, and session-begin) is load-bearing but not
documented in any individual skill's SKILL.md. The RESEARCH_OUTPUT.md contract drives
deep-plan, skill-creator, and add-debt — making it a critical sync artifact.

### 5. Some "Composites" Have Only One Entry Point

The checkpoint workflow is architecturally a composite (skill + 2 hooks + multiple state
files) but the skill is just 4KB. The composite record captures the architecture correctly
even when the orchestrator is minimal. The data_contract (handoff.json) is what makes it
a composite, not the orchestrator size.

### 6. The Meta-Composite Is Load-Bearing for This Scan

The cross-repo-sync-meta-workflow composite (the sync-mechanism itself) is unique: it
documents the workflow being executed right now. Its SCHEMA_SPEC.md data contract governs
all other records in this scan. Including it as a composite is correct — it passes the
"skill + agents + hooks + output artifacts" test via the deep-research workflow it uses
as its execution engine.

### 7. JASON-OS-Ahead Pattern (session-begin v2.1 > SoNash v2.0)

checkpoint is a SoNash-only composite that JASON-OS needs but hasn't ported. However
session-begin JASON-OS is v2.1 while SoNash is v2.0 (JASON-OS added DEFERRED markers
and incremented version). This confirms the sync cannot be purely "SoNash is authoritative"
— JASON-OS can be ahead in specific areas. The composite methodology should flag both
directions.

### 8. The hook-warning-lifecycle Is Often Invisible

This composite emerges from cross-cutting calls: 4+ hooks all call the same
append-hook-warning.js via execFileSync. None of the individual hook records make this
pattern obvious — it only appears when cross-referencing the D3a/D3b hook findings against
the D6a script findings. This is exactly the value of the composite identification pass.

---

## Gaps and Missing References

### 1. D21a Scope Does Not Cover N-Z Workflows

Workflows alphabetically N-Z are D21b scope. Expected: pr-review-workflow,
pre-commit-security-gate, session-begin-workflow, session-end-workflow,
statusline-tool-workflow, todo-workflow. These are not covered here.

### 2. /comprehensive-ecosystem-audit as Composite Orchestrator

audit-comprehensive (80KB) is treated as a component_unit inside the ecosystem-audit-family
composite. It could also be its own composite record (it spawns 9 sub-skills as an
orchestrator). D21a scope covers A-M — "audit-comprehensive" starts with "audit" (A-range),
but since it's the orchestrator of the audit-family composite rather than a distinct user
workflow, it is embedded in the audit-family record rather than given its own composite.

### 3. `_shared/ecosystem-audit/` and `_shared/AUDIT_TEMPLATE.md` Not in Component_Units Index

The shared library directories are referenced as component_units in composites but don't
have their own `type: composite` or `type: shared-doc-lib` record. D22 (schema surveyor)
should decide whether to add a new type for shared documentation libraries.

### 4. sync-warnings-ack.js Port Status Uncertain

D6 scripts agents confirmed append-hook-warning.js exists in JASON-OS. Whether
sync-warnings-ack.js was ported is not confirmed from the Wave 1 findings. The
hook-warning-lifecycle composite is marked as PARTIAL pending verification.

### 5. github-health Phase 3 DEFERRED Details

The 8 health scripts listed in session-begin findings include `run-github-health.js` as
one of the absent scripts. The exact state of the github-health skill (does SKILL.md
exist in JASON-OS? is it a stub?) was not confirmed in Wave 1 agent findings.

### 6. Data Contracts for CAS handler analysis.json

The exact Zod schema fields for analysis.json are in scripts/lib/analysis-schema.js (not
read during this pass). D10a confirmed its existence and role. The contract fields listed
here are derived from CAS skill descriptions, not direct schema file reads.

---

## Confidence Assessment

- HIGH claims: Composite identification, component_unit membership, workflow architecture
  (all derived from direct Wave 1 findings)
- HIGH claims: Port status (derived from D1c, D1d, D1e direct JASON-OS filesystem verification)
- HIGH claims: Data contract identification (from D9, D10a direct code reads)
- MEDIUM claims: Data contract field sets for some composites (derived from skill descriptions,
  not direct schema file reads)
- LOW claims: sync-warnings-ack.js JASON-OS port status (not verified in Wave 1 findings)
- UNVERIFIED claims: github-health SKILL.md presence in JASON-OS
- Overall confidence: HIGH for architecture; MEDIUM-HIGH for data contract field completeness
