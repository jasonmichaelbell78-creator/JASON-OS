# D21c — Composite Processes: Narrative Findings

**Agent:** D21c (Piece 1b SoNash Discovery Scan — Wave 2)
**Profile:** codebase
**Date:** 2026-04-18
**Scope:** Recurring cross-component collaboration patterns not formally named as workflows
**JSONL output:** `D21c-processes.jsonl`

---

## Pre-Work Notes

**D21b status:** D21b output files are absent from the findings directory. This agent
proceeded using D21a and Wave 1 findings (D1a-D1f, D2a-D2b, D3a-D3b, D5, D6a-D6d,
D7, D9, D13, D17a-D17b, D20a) as the source corpus.

**SCHEMA_SPEC.md Section 3J reviewed.** All records emit `type: composite`,
`workflow_family: process`, `gsd_phase: null`.

---

## Overview

13 composite processes identified. Each describes a recurring collaboration pattern
that emerges from cross-component interaction — not a formally named skill or workflow,
but a real behavioral circuit that any sync or porting effort must account for.

**Process count:** 13
**Unique data_contracts defined:** 28
**Most-connected process:** `hook-warning-escalation-process` (10 component_units, 3 data contracts)

**JASON-OS port status summary:**

| Process | JASON-OS Status |
|---------|-----------------|
| error-sanitization-process | PARTIAL (sanitize-error.cjs ported; ESM twin absent) |
| state-file-lifecycle-process | PARTIAL (pre-compaction-save, compact-restore ported; session-start not portable) |
| hook-warning-escalation-process | PARTIAL (append-hook-warning.js ported; sync-warnings-ack.js missing) |
| canonical-memory-promotion-process | ACTIVE (process exists; tooling absent in both repos) |
| skill-registry-update-process | PARTIAL (llms.txt exists; regeneration scripts may not be ported) |
| mcp-server-registration-process | ACTIVE (manual process; .mcp.json.example pattern not ported) |
| agent-spawn-pipeline-process | PORTED (agents ported; sonash-context injection missing from JASON-OS agents) |
| build-and-install-tools-process | PORTED (16/22 widgets; cache namespace collision latent bug) |
| debt-escalation-process | NOT PORTED (add-debt v0.1 stub only; full TDMS pipeline absent) |
| cross-model-gemini-check-process | PORTED (deep-research v2.0 ported; .gemini/ config absent in JASON-OS) |
| qodo-sonarcloud-feedback-loop-process | PARTIAL (pr-review ported; sonarcloud skill not-portable) |
| session-counter-coupling-process | ACTIVE (SESSION_CONTEXT.md convention exists in JASON-OS) |
| self-audit-regeneration-process | NOT PORTED (audit skill family absent; _shared/ lib absent) |

---

## Process 1: Error Sanitization Process

**Workflow family:** error-safety
**JASON-OS port status:** PARTIAL

### Architecture

```
New code touching errors
        │
        ▼ (manual discipline — no gate)
require/import sanitize-error.cjs
  ├── sanitizeError(err) — strips home paths, credentials, tokens
  ├── sanitizeErrorForJson(err) — JSON-safe version
  ├── createSafeLogger() — logger factory with sanitization baked in
  └── safeErrorMessage(err) — string extraction
        │
        ▼ safe error message → log/user output
```

```
Full safety stack (3 layers):
  Layer 1: sanitize-error.cjs    — scrub error message content
  Layer 2: safe-fs.js            — safe file writes (no raw fs.writeFileSync)
  Layer 3: security-helpers.js   — path traversal, input validation, PII masking
```

### Data Contracts

**`sanitize-error-api`:** exports `sanitizeError`, `sanitizeErrorForJson`, `createSafeLogger`,
`safeErrorMessage`. 61+ unique callers confirmed (46 scripts/ + 15 .claude/). This is the
highest-caller-count contract in the entire codebase.

### Key Architecture Note

The process is purely behavioral — there is no CI gate that blocks code that uses
`error.message` directly instead of calling `sanitizeError`. CLAUDE.md §5 documents the
anti-pattern and §2 references the helpers, but enforcement depends on developer discipline
and Semgrep/SonarCloud catches.

**Divergence alert (D7):** SoNash `sanitize-error.cjs` calls itself "CJS wrapper for .js
ESM twin." JASON-OS calls the same file "canonical CJS implementation" (removed the .js twin).
The JASON-OS consolidation is arguably cleaner. This is a direction-of-drift that Piece 2
reconciliation must handle: JASON-OS may be ahead here.

### JASON-OS Port Considerations

- `sanitize-error.cjs` — PORTED, header diverged (LOW risk)
- `sanitize-error.d.ts` — PORTED, identical
- `sanitize-error.js` (ESM twin) — NOT PORTED; only needed if JASON-OS ever has ESM scripts that cannot use `require()`
- `safe-fs.js` — PORTED but DIVERGED: SoNash 757L vs JASON-OS 636L (MEDIUM risk — SoNash has MASTER_DEBT writers)
- `security-helpers.js` — PORTED but DIVERGED: JASON-OS 558L vs SoNash 506L (HIGH risk — JASON-OS is 52 lines LONGER, direction unknown)

---

## Process 2: State-File Lifecycle Process

**Workflow family:** session-lifecycle
**JASON-OS port status:** PARTIAL

### Architecture

```
PreCompact event fires (any cause: compaction or restart)
        │
        ▼
pre-compaction-save.js
  ├── reads: .claude/state/commit-log.jsonl (from commit-tracker.js)
  ├── reads: .claude/hooks/.session-agents.json (from track-agent-invocation.js)
  ├── reads: .claude/hooks/.context-tracking-state.json (from post-read-handler.js)
  ├── reads: .claude/state/pending-reviews.json (from post-write-validator.js)
  └── writes: .claude/state/handoff.json (snapshot)
        │
Next session (any cause):
        │
        ▼
compact-restore.js (SessionStart/compact)
  ├── reads: .claude/state/handoff.json
  └── injects recovery context into Claude's context window

Manual alternative:
/checkpoint → writes same handoff.json format
```

### Data Contracts

**`handoff-snapshot` (.claude/state/handoff.json):**
Fields: `task_states`, `commits`, `git_context`, `agent_summaries`, `active_plan`,
`session_notes`, `active_audits`, `saved_at`. Shared between pre-compaction-save.js,
checkpoint skill, compact-restore.js, and session-begin. This is the most critical
cross-component state contract in the system.

**`session-state` (.claude/hooks/.session-state.json):**
Fields: `lastHead`, `sessionStartTime`. Written by session-start.js; read by
pre-compaction-save.js and commit-tracker.js.

**`session-agents` (.claude/hooks/.session-agents.json):**
Fields: `agents[]`, `invocationCount`, `lastInvocation`. Written by track-agent-invocation.js;
read by pre-commit-agent-compliance.js and pre-compaction-save.js.

### Two-Tier Architecture

D17b documents this explicitly in STATE_SCHEMA.md:
- **Tier 1 (.claude/hooks/.*):** Ephemeral, per-session, hidden dot-files. Reset on each session.
- **Tier 2 (.claude/state/*):** Persistent, survives compaction and session restarts.

STATE_SCHEMA.md self-annotates as covering only 15 of 113 actual state files in SoNash.
This undocumented state proliferation is a JASON-OS portability risk: if new state files
accumulate the same way, JASON-OS's STATE_SCHEMA.md will similarly fall behind.

---

## Process 3: Hook Warning Escalation Process

**Workflow family:** hook-warning-lifecycle
**JASON-OS port status:** PARTIAL (1 of 3 trio scripts ported)

### Architecture

```
Hook fires (any of 10 caller files, 25+ call-sites)
  └── execFileSync("node", ["scripts/append-hook-warning.js", "--type=...", "--severity=..."])
        │
        ├── writes: .claude/hook-warnings.json (rolling store, max 50 entries)
        ├── writes: .claude/state/hook-warnings-log.jsonl (append-only audit trail)
        └── cross-session dedup via log scan + severity escalation (5+ occurrences->promote)
              │
              ▼
User acknowledges (via /alerts or session-begin):
        │
        ▼
sync-warnings-ack.js (THE MISSING FLUSH OPERATION)
  ├── reads: .claude/hook-warnings.json
  ├── reads: .claude/state/hook-warnings-ack.json
  └── writes: .claude/state/hook-warnings-ack.json (bumps lastCleared if all types acked)
        │
git push attempt:
        │
        ▼
.husky/pre-push (git-layer gate)
  ├── reads: .claude/hook-warnings.json
  └── BLOCKS push if any error-severity warnings are unacknowledged

block-push-to-main.js (Claude Code layer gate)
  └── BLOCKS push to main/master (redundant enforcement)
```

### Data Contracts

**`hook-warnings-store` (.claude/hook-warnings.json):**
Fields: `id`, `timestamp`, `hook`, `type`, `severity`, `message`, `acknowledged`, `count`.
Produced by append-hook-warning.js; consumed by sync-warnings-ack.js, pre-push gate,
run-alerts.js, session-begin. This is the highest-traffic state contract — 25+ write call-sites.

**`hook-warnings-ack` (.claude/state/hook-warnings-ack.json):**
Fields: `acknowledged` (map type → last_ack_timestamp), `lastCleared` (timestamp).
The `lastCleared` field drives the statusline D5 widget unacked count display.
Without sync-warnings-ack.js, `lastCleared` never advances and the statusline shows
stale unread counts even after the user has acknowledged all warning types.

**`hook-warnings-log` (.claude/state/hook-warnings-log.jsonl):**
Append-only audit trail. Fields: `id`, `timestamp`, `type`, `severity`, `message`,
`actor`, `user`, `outcome`. Used for cross-session dedup, occurrence counting, and
recurrence analysis by analyze-learning-effectiveness.js.

### JASON-OS Gap

`sync-warnings-ack.js` is NOT in JASON-OS. This means JASON-OS statusline D5 widget
(if ever ported) will never show accurate unacked counts. The trio must be ported together:
`append-hook-warning.js` (DONE) + `resolve-hook-warnings.js` + `sync-warnings-ack.js`.

---

## Process 4: Canonical Memory Promotion Process

**Workflow family:** memory-lifecycle
**JASON-OS port status:** ACTIVE (no tooling; manual process in both repos)

### Architecture

```
Session-end (any session):
  └── new learnings added to user-home memory
        │ (ad hoc, no trigger)
        │
        ▼
Manual diff:
  operator diffs user-home/*.md vs .claude/canonical-memory/*.md
        │
        ▼
Manual promote (selective):
  operator copies updated content to canonical-memory/
  operator updates canonical MEMORY.md index
  operator git commits canonical-memory/
        │
        ▼
Next session (another locale):
  canonical-memory/ is git-pulled
  user-home is NOT synced (not git-tracked)
```

### Data Contracts

**`canonical-memory-index` (.claude/canonical-memory/MEMORY.md):**
Fields: `name`, `description`, `link`, `section (User|Feedback|Project|Reference)`.
This is the only cross-locale-portable view of the memory state. Must be updated
whenever canonical files are promoted.

**`user-home-memory-index`:**
Same structure but NOT git-tracked — diverges freely between locales. D5 found
10 files unlisted in user-home MEMORY.md (index lags actual dir contents).

### Gap Analysis (D5 findings)

- 60 of 82 user-home memories have no canonical counterpart (73.2% gap)
- All 23 shared files differ — zero byte-identical matches
- 3 operationally wrong canonical files (stale commands, wrong user framing, completed work shown as in-progress)
- 2 canonical-only orphaned files (need retirement)

### SCHEMA CRUX for Piece 2

This is the clearest illustration of the sync problem: the canonical set is a point-in-time
snapshot that diverges from user-home with every session. A sync mechanism must handle:
1. File additions (60 gap files to evaluate)
2. File renames (feedback_verify_not_grep → feedback_grep_vs_understanding)
3. File merges (parallel_agents absorbed into agent_teams)
4. Content drift (all 23 shared files differ)
5. Status rot (project-type memories go stale within weeks)

---

## Process 5: Skill Registry Update Process

**Workflow family:** skill-lifecycle
**JASON-OS port status:** PARTIAL

### Architecture

```
New skill added to .claude/skills/<name>/SKILL.md
        │
        ▼ (manual trigger — no automation)
scripts/validate-skill-config.js
  ├── reads: scripts/config/skill-config.json (allowed fields, required sections)
  └── validates SKILL.md against schema
        │
        ▼
scripts/generate-skill-registry.js (164L, CJS, sanitize-then-portable)
  ├── scans: .claude/skills/
  └── writes: .claude/llms.txt (skill discovery registry)
        │
        ▼
scripts/generate-documentation-index.mjs (1147L, native ESM .mjs, NOT PORTABLE AS-IS)
  ├── scans: all docs dirs
  └── writes: DOCUMENTATION_INDEX.md
```

### Data Contracts

**`skill-registry` (.claude/llms.txt):**
Fields: `skill_name`, `path`, `description`, `version`, `tags`.
Consumed by Claude Code skill discovery, session-begin skill lookup, find-skills skill.
This is the LLM-readable index for all available skills.

**`doc-index` (DOCUMENTATION_INDEX.md):**
Fields: `category`, `title`, `path`, `description`.
Human navigation index. Also consumed by check-doc-headers.js health checker.

### Key Architecture Note

`generate-documentation-index.mjs` is the largest script in all of scripts/ root at
1147 lines and uses native ESM (`.mjs` extension). It hardcodes SoNash dir structure
and is rated not-portable. Any JASON-OS port requires structural refactoring to make
the scanned directory list configurable.

The regeneration scripts must run together after any skill addition — they are not
triggered automatically. If either is skipped, the llms.txt and DOCUMENTATION_INDEX.md
diverge from the actual skill set.

---

## Process 6: MCP Server Registration Process

**Workflow family:** mcp-lifecycle
**JASON-OS port status:** ACTIVE (manual process; .mcp.json.example pattern not ported to JASON-OS)

### Architecture

```
Decision to add MCP server:
        │
        ▼
Option A — Auto-discovery (preferred for supported servers):
  Claude Code plugin system auto-discovers:
  Firebase, GitHub, Context7, Playwright, Episodic Memory
  (These do NOT need .mcp.json entries)
        │
Option B — Manual registration:
  Edit .mcp.json: add mcpServers.<name>.command + args + env
        │
        ▼
Restart Claude Code session
        │
        ▼
New mcp__<server>__<tool> tools appear in Claude's tool set
        │
        ▼
Edit .claude/settings.json permissions.allow[] if tools need explicit permit
        │
        ▼
check-mcp-servers.js (SessionStart) validates MCP server health
```

### Data Contracts

**`mcp-server-manifest` (.mcp.json):**
Fields: `mcpServers.<name>.command`, `mcpServers.<name>.args`, `mcpServers.<name>.env`.
The active SoNash .mcp.json has only 2 explicit entries (memory + sonarcloud) because
the rest are auto-discovered. The .mcp.json.example has 9 servers with inline docs.

**`mcp-permissions` (.claude/settings.json):**
The permissions.allow/deny lists gate which mcp__ tool calls Claude Code will execute
without a per-turn prompt. This is the enforcement layer for the MCP registration.

### JASON-OS Gap

D17b confirms JASON-OS lacks the .mcp.json.example pattern. The SoNash `.mcp.json.example`
uses empty-string placeholders for secrets (never real values) and includes `_description`
and `_setup` inline commentary per server — this is the right template for JASON-OS.

---

## Process 7: Agent Spawn Pipeline Process

**Workflow family:** agent-lifecycle
**JASON-OS port status:** PORTED (agents ported; sonash-context injection missing)

### Architecture

```
Skill invokes Task tool:
  Task({
    agent: "deep-research-searcher",
    context_skills: ["sonash-context"],
    description: "Research sub-question SQ-001..."
  })
        │
        ▼
Claude Code loads agent from .claude/agents/<name>.md:
  ├── frontmatter: model, tools[], disallowedTools[], maxTurns, skills[]
  ├── skills[] → injects named skill context files into agent's context window
  └── body: agent instructions
        │
        ▼
Agent executes with constrained tool set
  └── track-agent-invocation.js (PostToolUse/Task) logs to .session-agents.json
        │
        ▼
Result text returned to spawning skill
        │
        ▼ (on git commit)
pre-commit-agent-compliance.js reads .session-agents.json
  └── validates agent usage against compliance rules
```

### Data Contracts

**`session-agents-log` (.claude/hooks/.session-agents.json):**
Fields: `agents[]`, `invocationCount`, `lastInvocation`, `agentName`, `taskDescription`.
Produced by track-agent-invocation.js; consumed by pre-commit-agent-compliance.js
and pre-compaction-save.js. This is the session's agent accountability log.

**`agent-spawn-contract` (agent frontmatter):**
Fields: `name`, `model`, `tools[]`, `disallowedTools[]`, `maxTurns`, `skills[]`, `description`.
This is the schema D20a found in all 40 agents. The `skills: [sonash-context]` injection
is the key pattern that JASON-OS agent ports are missing.

### Key Architecture Note

D20a confirms 76 spawns edges across the dependency graph. D2a confirms all 32
project-scoped SoNash agents have `skills: [sonash-context]` in frontmatter — providing
SoNash-specific project context to every spawned agent. JASON-OS agents lack this
(no equivalent jason-context skill exists yet). Without it, spawned agents operate with
generic context rather than project-aware context.

---

## Process 8: Build-and-Install-Tools Process

**Workflow family:** tool-lifecycle
**JASON-OS port status:** PORTED (16/22 widgets; latent cache namespace collision)

### Architecture

```
Source files in tools/statusline/ (Go)
        │
        ▼
bash tools/statusline/build.sh
  1. go test -v ./... (gate — must pass)
  2. go build [-a] -o <project>-statusline-v<N>[.exe] .
  3. copy binary + config.toml to ~/.claude/statusline/
  4. test render with inline JSON sample
        │
        ▼ (operator updates manually)
.claude/settings.local.json
  └── statusLine.command = ~/.claude/statusline/<project>-statusline-v<N>[.exe]
        │
        ▼ (at runtime — per Claude Code turn)
statusline binary reads stdin (Claude Code data)
  └── refreshCacheIfStale() writes to ~/.claude/statusline/cache/
```

### Data Contracts

**`statusline-command` (.claude/settings.local.json):**
Field: `statusLine.command`. The path to the installed binary. Updated manually by
operator after build. This is machine-scoped — gitignored.

**`weather-cache` (~/.claude/statusline/cache/weather.json):**
Fields: `temp`, `condition`, `high`, `low`, `fetched_at`.
Machine-scoped cache files. Per D13: SoNash and JASON-OS binaries share this cache dir
on the same machine — project-agnostic filenames get overwritten by whichever binary
ran most recently (cache namespace collision, latent bug for multi-project operators).

**`api-backoff-state` (~/.claude/statusline/cache/backoff.json):**
Tracks per-source failure counts and next-retry timestamps. Machine-scoped.

### Key Architecture Note

Version suffix in binary name (e.g., `jason-statusline-v2`) is the "statusline rebuild
safety" protocol implementation: never overwrite the running binary; bump version suffix,
then update the settings.local.json pointer. The Go `build.sh` `-a` flag (force full
rebuild) was added in JASON-OS but not SoNash — JASON-OS is ahead here.

---

## Process 9: Debt Escalation Process

**Workflow family:** tdms
**JASON-OS port status:** NOT PORTED (add-debt v0.1 stub only)

### Architecture

```
Source events (4 intake paths):
  A. Audit findings → scripts/debt/extract-audits.js → raw/
  B. SonarCloud issues → scripts/debt/sync-sonarcloud.js → raw/
  C. PR-deferred items → scripts/debt/intake-pr-deferred.js → raw/
  D. Manual items → scripts/debt/intake-manual.js → raw/
        │
        ▼ Layer 2: Normalization
normalize-all.js → raw/normalized-all.jsonl
        │
        ▼ Layer 3: Deduplication (6-pass)
dedup-multi-pass.js → raw/deduped.jsonl
        │
        ▼ Layer 4: Master storage
generate-views.js --ingest → MASTER_DEBT.jsonl (DEBT-XXXX IDs assigned)
        │
        ▼ Layer 5: Resolution / escalation
/debt-runner (triage-batch | fix-sprint | resolve-verified | metrics-refresh)
  └── severity escalation: S0 → block; S1+ → queue for triage
        │
        ▼ Auto-escalation side-channel:
log-override.js C3-G3
  └── 15+ bypasses in 14d → auto-generates DEBT entry in MASTER_DEBT.jsonl
```

### Data Contracts

**`master-debt-schema` (docs/technical-debt/MASTER_DEBT.jsonl):**
30+ field schema including: `debt_id (DEBT-XXXX)`, `content_hash` (SHA256 dedup key),
`title`, `category`, `severity (S0-S3)`, `effort (E0-E3)`, `status`, `source`,
`source_id`, `created_at`, `updated`, `files[]`, `why_it_matters`, `suggested_fix`,
`acceptance_tests`, `cluster_id` (for systemic patterns).
This is the highest-stakes data contract in SoNash — 4500+ items, 30+ fields.

**`tdms-staging` (docs/technical-debt/staging/):**
Intermediate JSONL files between normalization and master promotion. The "never write
MASTER directly" rule is enforced by routing all mutations through staging first.

### Key Architecture Note

D20a confirms add-debt has 15 inbound dependency edges — more than any other skill
except deep-research (also 15). The TDMS is not just debt tracking; it is the SINK
for every audit, review, and override escalation in the system. JASON-OS's v0.1 stub
cannot receive these escalations — they go to `.planning/DEBT_LOG.md` instead.

---

## Process 10: Cross-Model Gemini Check Process

**Workflow family:** deep-research
**JASON-OS port status:** PORTED (deep-research v2.0 ported; .gemini/ absent in JASON-OS)

### Architecture

```
deep-research Phase 3 (challenger pass complete):
        │
        ▼
Operator invokes Gemini CLI externally:
  gemini --model gemini-2.5-pro
  "Review these research claims: [paste from claims.jsonl]"
        │
        ▼
If Gemini diverges materially from Claude's claims:
        │
        ▼
dispute-resolver (Phase 3.5)
  ├── reads: .research/<slug>/claims.jsonl
  ├── applies DRAG protocol (Disagreement Resolution Across Grounds)
  └── produces mandatory dissent record
        │
        ▼
deep-research-final-synthesizer (Phase 3.97)
  └── re-synthesizes incorporating dispute resolution outcome
```

### Data Contracts

**`claims-schema` (.research/<slug>/claims.jsonl):**
Fields: `claim_id`, `claim_text`, `confidence`, `sources[]`, `contradictions[]`,
`challenger_notes`, `verifier_verdict`.
Produced by deep-research-synthesizer; consumed by dispute-resolver,
deep-research-verifier, deep-research-final-synthesizer.

**`gemini-config` (.gemini/config.yaml):**
Fields: `severity_threshold`, `max_comments`, `skip_drafts`, `memory_enabled`, `ignore_patterns[]`.
D17b confirms JASON-OS lacks .gemini/ entirely. The Gemini cross-check is behaviorally
available but unconfigured for project-scoped styleguide in JASON-OS.

### Key Architecture Note

The cross-model check is a behavioral process, not a data pipeline — it relies on the
operator manually invoking the Gemini CLI (an external tool, not an MCP server).
The feedback memory `feedback_deep_research_phases_mandatory.md` (BEHAVIORAL gate):
"Phases 3-5 are MANDATORY — never skip CL verification, cross-model checks, self-audit,
or presentation." This is the enforcement mechanism.

---

## Process 11: Qodo / SonarCloud Feedback Loop Process

**Workflow family:** pr-review
**JASON-OS port status:** PARTIAL (pr-review skill ported; sonarcloud skill not-portable)

### Architecture

```
PR created (after ALL planned work complete — PR timing discipline):
        │
        ▼
Wait for bot reviews:
  - Qodo (GitHub App) → posts AI review comments to PR
  - SonarCloud → posts quality gate + hotspot findings
        │
        ▼ (NEVER use gh to fetch — gh truncates collapsed sections)
User pastes bot review content into Claude context
        │
        ▼
/pr-review skill — DAS framework (Disaggregate → Assess → Sequence):
  ├── Step 0: Security Threat Model pass
  ├── Step 1: Disaggregate into atomic action items
  ├── Step 2: Assess each item (accept/reject/defer)
  ├── Step 3-7: Fix cycle (implement → test → commit → push)
  └── Step 8: Round complete → request next review
        │
        ▼ SonarCloud hotspots specifically:
Code fix alone does NOT clear hotspot — operator must manually
mark as Safe/Fixed in SonarCloud UI
        │
        ▼
/pr-retro (post-merge retrospective — SoNash-only, not ported)
```

### Data Contracts

**`pr-review-input` (user paste — no file):**
Content: bot review comment text, file path, line number, severity, recommendation.
The paste-not-fetch protocol is load-bearing: MEMORY confirms `gh pr view` truncates
collapsed sections. The paste IS the data source.

**`pr-review-state` (.claude/state/pr-review-round-N.json):**
Fields: `round`, `items_total`, `items_resolved`, `items_deferred`, `pushed_at`.
Per D1d: SoNash pr-review state files persist per-round counts for compaction resilience.
MEMORY confirms: pr-review must persist per-round counts in state files to survive
compaction/clear.

### Key Architecture Note

D17b confirms .qodo/ exists in SoNash. The MEMORY `reference_pr_review_integrations.md`
documents preferred integrations: Qodo + SonarCloud (+ Gemini later). CodeRabbit
excluded (noise/overlap). D1d confirms JASON-OS pr-review dropped CodeRabbit and Gemini
reviewer in the port — aligned with the memory preference.

---

## Process 12: Session Counter Coupling Process

**Workflow family:** session-lifecycle
**JASON-OS port status:** ACTIVE (SESSION_CONTEXT.md convention exists; format partially diverged)

### Architecture

```
Session begins:
  session-begin → writes SESSION_CONTEXT.md (session number incremented)
        │
        ▼
Throughout session, hooks read session number as correlation key:
        │
  commit-tracker.js (PostToolUse/Bash git commit):
    reads SESSION_CONTEXT.md → tags commit-log.jsonl entry with session #
        │
  governance-logger.js (PostToolUse/Write CLAUDE.md or settings.json):
    reads SESSION_CONTEXT.md → tags governance-changes.jsonl entry with session #
        │
  check-remote-session-context.js (SessionStart):
    reads SESSION_CONTEXT.md → compares with remote branch SESSION_CONTEXT.md
    → warns if out-of-sync (cross-locale drift detection)
        │
  log-session-activity.js:
    writes .claude/session-activity.jsonl with session context fields
        │
        ▼
Session ends:
  session-end-commit.js:
    reads SESSION_CONTEXT.md
    updates 'Uncommitted Work' field
    commits SESSION_CONTEXT.md as the session closure record
```

### Data Contracts

**`session-context-schema` (SESSION_CONTEXT.md):**
Fields (by convention, not enforced): `session_number (Session #NNN)`, `Uncommitted Work`,
`Active Plan`, `Last Commit`, `Session Notes`. No formal schema document — maintained
by regex in consuming scripts.

**Format divergence (JASON-OS ahead):** session-end-commit.js JASON-OS supports BOTH:
- Legacy SoNash inline-bold format: `**Uncommitted Work**: Yes`
- JASON-OS D12 5-field heading format: `## Uncommitted Work\nYes`

SoNash session-end-commit.js handles legacy format only. JASON-OS is ahead here.

### Key Architecture Note

The session counter is the spine that correlates: `commit-log.jsonl`,
`governance-changes.jsonl`, `override-log.jsonl`, `session-activity.jsonl`,
and `hook-warnings-log.jsonl`. Without the counter, cross-session log correlation
is impossible. The convention is not gated — if a downstream port omits SESSION_CONTEXT.md
or changes the format, all hooks return null gracefully (D3a confirms this graceful
degradation pattern).

---

## Process 13: Self-Audit Regeneration Process

**Workflow family:** ecosystem-audit
**JASON-OS port status:** NOT PORTED (_shared/ecosystem-audit/ and audit skill family absent)

### Architecture

```
/hook-ecosystem-audit (or any audit skill)
        │
        ▼ Phase 1: Script execution
run-{domain}-ecosystem-audit.js
  ├── 5-6 checker scripts (domain-specific)
  ├── 6 shared lib files (safe-fs.js copy, parse-jsonl-line.js copy, etc.)
  ├── reads: _shared/ecosystem-audit/*.md (shared protocol — 5 files)
  └── writes: .claude/tmp/{domain}-audit-progress.json (compaction guard)
        │
        ▼ Phase 2-4: Interactive walkthrough
User reviews findings one-by-one:
  accept → skill update issued
  defer → /add-debt intake
        │
        ▼ Phase 5: Convergence-loop verification
/convergence-loop (quick preset)
  └── verifies fixes applied
        │
        ▼ State written:
.claude/state/{domain}-ecosystem-audit-history.jsonl (trend log)
```

### Data Contracts

**`audit-progress-guard` (.claude/tmp/{domain}-audit-progress.json):**
Fields: `phase`, `completed_items`, `pending_items`, `session_id`.
Compaction guard consumed by pre-compaction-save.js. If compaction occurs mid-audit,
this file allows resumption.

**`audit-history-trend` (.claude/state/{domain}-ecosystem-audit-history.jsonl):**
Fields: `session`, `grade`, `category_scores`, `findings_count`, `timestamp`.
Consumed by health-ecosystem-audit (trend analysis) and alerts skill (Test Health category).
This is the CROSS-PROCESS data contract that links self-audit results into the health
monitoring pipeline.

### Copy-Not-Import Pattern (Maintenance Hazard)

D7 confirms 8 copies of safe-fs.js embedded in skill scripts/lib/ dirs (one per
audit mega-skill). All copies identical at scan time. Any future fix to the canonical
`scripts/lib/safe-fs.js` must manually propagate to all 8 copies or they diverge.
This is the most concrete maintenance debt in the audit family architecture.

---

## Cross-Process Dependencies

```
session-lifecycle (processes 2 + 12)
  ├── state-file-lifecycle ──────────────────────────► handoff.json
  └── session-counter-coupling ──────────────────────► SESSION_CONTEXT.md
        both feed into:
          ├── compact-restore.js (session recovery)
          └── pre-compaction-save.js (session snapshot)

hook-warning-lifecycle (process 3)
  └── feeds into:
        ├── alerts skill (session-begin integration)
        ├── statusline D5 widget (unacked count)
        └── .husky/pre-push escalation gate

debt-escalation (process 9)
  └── receives from:
        ├── self-audit-regeneration (deferred findings)
        ├── qodo-sonarcloud-feedback-loop (PR-deferred items)
        └── log-override.js C3-G3 auto-escalation (override pattern detection)

error-sanitization (process 1)
  └── cross-cuts all 12 other processes
        └── any process touching file I/O, errors, or user input
            uses sanitize-error.cjs + safe-fs.js + security-helpers.js

deep-research (process 10)
  └── feeds into:
        ├── deep-plan (Phase 0 prior-art check)
        ├── skill-creator adapter
        └── add-debt adapter (deferred findings)
```

---

## Learnings

### 1. Processes Are the Hardest Category to Discover

Unlike workflows (which have named skills) or composites A-M (which have clear entry
points), processes emerge only from cross-referencing hook callers against script
consumers against state file readers. The hook-warning-escalation process was not
visible from any individual file — only the pattern of 10 callers all invoking
`append-hook-warning.js` via `execFileSync` revealed it. This is the core value of
the composite pass: patterns invisible to unit-level scanning.

### 2. The CLI-Contract Coupling Pattern

D6a learning #5: hooks call scripts via `execFileSync("node", ["scripts/xxx.js", "--arg=..."])`
not via `require()`. This means the coupling is CLI-contract-based, not API-based.
For sync planning, the CLI interface IS the contract to preserve. Any port that changes
argument names or exit codes breaks the process without breaking the import graph.

### 3. JASON-OS Is Ahead on Some Contracts

Three clear cases where JASON-OS has evolved beyond SoNash:
1. `session-end-commit.js` — JASON-OS supports dual SESSION_CONTEXT.md formats
2. `security-helpers.js` — JASON-OS is 52 lines longer (D7; direction unknown)
3. `sanitize-error.cjs` — JASON-OS consolidated (removed ESM twin, calls itself canonical)

The sync mechanism must be bidirectional. "SoNash is authoritative" is not always true.

### 4. Data Contracts Are the Sync Mechanism's Load-Bearing Elements

The handoff.json contract (shared by 4 components), MASTER_DEBT.jsonl (30+ fields,
4500+ items), hook-warnings.json (25+ write sites), and SESSION_CONTEXT.md (no formal
schema, regex-parsed) are the contracts that define what any sync tool must preserve.
A JSONL sync that moves files without understanding these contracts will corrupt state.

### 5. The 60-File Canonical Memory Gap Is a Process Failure

The canonical-memory-promotion-process exists but has no tooling. The 73.2% gap rate
(60 of 82 user-home memories without canonical counterparts) is not a one-time backlog
— it is the steady-state output of a process that has no automation. Piece 2's sync
mechanism must address this or the gap will regrow within weeks of any manual promotion.

### 6. Copy-Not-Import Creates Hidden Maintenance Debt

8 copies of safe-fs.js embedded in audit skill dirs (D7). This is intentional for
self-contained deployment but creates a class of invisible staleness: copies can
diverge from canonical without any import graph catching it. The sync mechanism needs
an explicit "copy cohort" concept — when canonical changes, all copies in the cohort
must be updated.

### 7. The Session Counter Has No Schema Guard

SESSION_CONTEXT.md is the correlation spine for 5 JSONL log files, but its format is
maintained by convention and parsed by regex. No validation script enforces the format.
Any deviation (e.g., `Session 001` instead of `Session #001`) causes silent null returns
across all consumers. This is a JASON-OS portability risk: if the format is not precisely
documented, ports will implement it differently.

### 8. Missing D21b: No Gap for Identified Processes

D21b scope (N-Z composite workflows: pr-review-workflow, pre-commit-security-gate,
session-begin-workflow, session-end-workflow, statusline-tool-workflow, todo-workflow)
was unexecuted at time of D21c dispatch. Some of these workflows overlap with D21c
processes (session-lifecycle family, statusline, hook-warnings). If D21b runs later,
its records should be cross-referenced against D21c records for consistency. Specifically:
session-begin-workflow and session-end-workflow will add data_contracts to the
session-lifecycle family that D21c processes reference.

---

## Gaps

### 1. generate-skill-registry.js Port Status Unverified

D6d confirms the script exists in SoNash and is `sanitize-then-portable`. Whether it
exists in JASON-OS was not confirmed in Wave 1 findings. The llms.txt file's generation
pipeline in JASON-OS is unverified.

### 2. _shared/ecosystem-audit/ File Contents Not Read

The 6 shared lib files in `.claude/skills/_shared/ecosystem-audit/` were referenced in
D1a but not individually read. Their exact content is unknown. D21c classified them as
component_units in the self-audit-regeneration process but cannot confirm their schemas.

### 3. session-begin Skill Not Deep-Read in D21c Scope

The session-begin skill is a consumer of multiple D21c process contracts (handoff.json,
hook-warnings.json, session counter). D21c relied on indirect Wave 1 references. If D21b
executes session-begin-workflow, that record will be more authoritative than D21c's
indirect references.

### 4. .claude/plans/ vs .planning/ Structural Divergence

D17b confirms SoNash uses `.claude/plans/` while JASON-OS uses `.planning/` at project
root. The state-file-lifecycle process references `.planning/<slug>/PLAN.md` (JASON-OS
path). This structural divergence is unresolved — any sync mechanism must handle the
path difference.

### 5. MCP Auto-Discovery Mechanism Not Fully Documented

D17b notes that Context7, Firebase, GitHub, Playwright, and Episodic Memory are
auto-discovered via the plugin system — they do NOT appear in .mcp.json. The mechanics
of this auto-discovery were not read in Wave 1. D21c classified this as a known gap in
the mcp-server-registration-process data contracts.

### 6. debt-escalation-process Dedup Levenshtein Implementation Not Read

The 6-pass dedup in dedup-multi-pass.js was documented from D9's architectural summary
but not from direct code read. The Levenshtein distance threshold (>80% near match,
>90% semantic) and the cross-source correlation logic are described but not verified
against the actual implementation.

---

## Confidence Assessment

- HIGH claims: 11 (all process architectures derived from direct Wave 1 findings with
  multiple corroborating sources)
- HIGH claims: data contracts for hook-warning-escalation, state-file-lifecycle,
  debt-escalation (directly confirmed by D3a/D3b/D6a/D6d/D9)
- MEDIUM claims: 6 (skill-registry-update-process port status; mcp auto-discovery
  mechanics; self-audit shared lib contents; session-begin integration details;
  D21b-scope workflow overlaps)
- LOW claims: 2 (generate-skill-registry.js JASON-OS port status; dedup implementation
  details not directly read)
- UNVERIFIED claims: 0
- Overall confidence: HIGH for architecture and data contracts; MEDIUM for JASON-OS
  port status of skill-registry and some session-lifecycle details
