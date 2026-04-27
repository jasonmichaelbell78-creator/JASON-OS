# JASON-OS Discovery Scan — Piece 1a Research Output

**Date:** 2026-04-18
**Session:** #5 (sync-mechanism-41826 branch)
**Topic:** What exists in JASON-OS that needs classification for bidirectional sync with SoNash?
**Depth:** L1 Exhaustive (internal codebase census — adapted from external-research L1)
**Agent count:** 16 D-agents (13 inventory + 3 analysis)

---

## Executive Summary

This document is the authoritative census of all JASON-OS artifacts as of 2026-04-18, produced by 16 discovery agents (D1a through D13) and synthesized in Phase 2. The census catalogued approximately 190 discrete units across 9 inventory categories: 13 skills, 9 agents/teams, 13 hooks/lib-helpers, 74 memories (12 canonical + 62 user-home), 13 scripts, 13 tool files, 4 research sessions, 13 planning artifacts, and 20 CI/docs/configs. Wave 2 analysis then extracted 204 dependency edges, identified 15 composite workflows/processes, and consolidated 73 schema-field candidates from all 13 inventory agents.

The most consequential structural finding is the canonical-memory gap: only 12 of 62 user-home memories have canonical counterparts, leaving approximately 50 portable behavioral rules untracked by git. Of those 50, the vast majority are universally applicable feedback memories requiring no sanitization — they simply have not been promoted. A secondary memory finding compounds this: two user-type memory files (`user_expertise_profile.md`, `feedback_no_broken_widgets.md`) carry JASON-OS or SoNash-specific content embedded inside files classified as universal scope, creating a content-bleed problem that automated sync cannot detect without body inspection.

The dependency analysis revealed a three-tier hub structure. Tier 1 hubs — `scripts/lib/safe-fs.js` (14 inbound edges), `scripts/lib/sanitize-error.cjs` (10), `skills/convergence-loop` (9), and `skills/deep-research` (9) — are load-bearing infrastructure that must be present and unmodified before any dependent unit can function. Tier 2 hubs (`hooks/run-node.sh`, `hooks/lib/symlink-guard.js`, `skills/add-debt`, `SESSION_CONTEXT.md`) each serve as cross-category connectors. Three gaps exist: `scripts/log-override.js`, `init_skill.py`, and `.claude/statusline-command.sh` are referenced but not found in the inventory — the first two appear to be absent files, the last was missed in the scan scope.

The composite entity analysis (D12) identified 15 end-to-end workflows and processes, the most important being that these composites — not individual files — are the correct unit of analysis for sync. You cannot sync `/deep-research` by copying one skill file; you must copy or verify all 25 component units. The D13 schema-field surveyor consolidated 73 field candidates and proposed a 12-field MVP schema sufficient to drive sync decisions for any unit type. The schema's two most novel contributions are the `lineage` object field (bidirectional provenance without data loss) and the `supersedes`/`superseded_by` pair (memory evolution tracking currently invisible to automated tooling).

The primary downstream consumer of this document is Piece 2 (schema design). Section 4 provides the 73 consolidated candidates with D13's MVP recommendation. Section 7 provides explicit methodology adjustments for the SoNash scan (Piece 1b). Section 5 identifies the five critical findings that Piece 2 cannot afford to miss. The census confirms that JASON-OS is a coherent, well-layered OS with clear portability profiles for all major unit categories — the sync project has a solid foundation to build on.

---

## Section 1: Inventory by Category

### 1.1 Skills (13 total)

**Sources:** D1a (7 skills), D1b (6 skills)

| Skill | Scope | Portability | Size (bytes) |
|-------|-------|-------------|-------------|
| add-debt | universal | sanitize-then-portable | 3,568 |
| brainstorm | universal | portable | 20,084 |
| checkpoint | universal | sanitize-then-portable | 4,336 |
| convergence-loop | universal | portable | 29,879 |
| deep-plan | universal | sanitize-then-portable | 28,173 |
| deep-research | universal | sanitize-then-portable | 72,181 |
| pr-review | universal | sanitize-then-portable | 35,337 |
| pre-commit-fixer | universal | sanitize-then-portable | ~8,000 |
| session-begin | project | sanitize-then-portable | ~10,000 |
| session-end | project | sanitize-then-portable | 17,000 |
| skill-audit | universal | portable | 65,000 |
| skill-creator | universal | sanitize-then-portable | 55,000 |
| todo | universal | sanitize-then-portable | ~12,000 |

**Portability breakdown:** 2 portable (brainstorm, convergence-loop), 9 sanitize-then-portable, 0 not-portable, 2 project-scoped (session-begin, session-end).

**Key patterns:**

- **Byte spread is 20x** (3.5 KB to 72 KB). Flat file-count agent splits will give unbalanced scanning agents. D1a recommends byte-weighted splits targeting ~120-150 KB per agent for SoNash's 81 skills.
- **2 of 13 are project-scoped** (session-begin, session-end). These are universal in intent but anchored to SESSION_CONTEXT.md's 5-field contract and JASON-OS-specific plan targets. D1b coined the useful label "project-flavored-universal" for this pattern.
- **add-debt is an explicit v0 stub.** Its upgrade trigger is documented in the SKILL.md. SoNash has a full TDMS system that this stub is designed to eventually absorb — a copy-forward of the stub would leave a known architectural gap.
- **skill-audit's SKILL.md is 599 lines** — exceeding the 300-line limit the skill itself enforces on other skills. Intentional given its 3-mode complexity, but worth flagging.
- **pr-review is structurally different:** it has a `reference/` subdirectory with 2 files rather than a single REFERENCE.md at the root. Any glob for skill companion docs must use `**/*.md` at 2+ depth, not just `*/REFERENCE.md`.
- **skill-creator references several absent files:** `init_skill.py` (Phase 4.2 scaffold), `docs/agent_docs/SKILL_AGENT_POLICY.md`, and the `/create-audit` skill — none are present in JASON-OS v0.

**Sanitization themes for sanitize-then-portable skills:** Cross-references to SoNash-specific skill names in routing tables (/gsd:new-project, /repo-analysis, using-superpowers) are documentation references, not execution dependencies. Environment variable `SONAR_PROJECT_KEY` in pr-review is project-specific. The MCP memory integration in checkpoint requires the memory MCP server to be configured.

---

### 1.2 Agents, Teams, Commands (9 total; 0 commands)

**Source:** D2

| Unit | Type | Scope | Portability | Pipeline Phase |
|------|------|-------|-------------|----------------|
| contrarian-challenger | agent | universal | portable | Phase 3 |
| deep-research-final-synthesizer | agent | universal | portable | Phase 3.97 |
| deep-research-gap-pursuer | agent | universal | portable | Phase 3.95 |
| deep-research-searcher | agent | universal | portable | Phase 1 |
| deep-research-synthesizer | agent | universal | portable | Phase 2 |
| deep-research-verifier | agent | universal | portable | Phase 2.5, 3.9 |
| dispute-resolver | agent | universal | portable | Phase 3.5 |
| otb-challenger | agent | universal | portable | Phase 3 |
| research-plan-team | team | universal | portable | research-to-plan pipeline |

**Commands directory:** empty — 0 command files.

**All 9 units are universal and portable as-is.** No project-specific paths or credentials.

**Notable structural observations:**
- 6 of 8 agents declare `disallowedTools: Agent`; 2 do not (deep-research-searcher and deep-research-synthesizer — the only ones that could theoretically spawn sub-agents, though neither does in practice).
- deep-research-searcher references MCP tools (`mcp__context7__resolve-library-id`, `mcp__context7__query-docs`) in its YAML `tools:` field — a dependency on an external MCP server distinct from agent-to-agent dependencies.
- The team file uses HTML comment metadata, not YAML frontmatter. Any parser treating teams as agents will fail on metadata extraction.
- 3 agents have no `maxTurns` field (deep-research-searcher, deep-research-synthesizer, research-plan-team) — unbounded invocations, a cost and safety signal.

---

### 1.3 Hooks and Hook-Lib Helpers (13 total)

**Source:** D3

**Hooks (8):**

| Hook | Event | Matcher | continueOnError | Portability |
|------|-------|---------|-----------------|-------------|
| check-mcp-servers.js | SessionStart | none (always fires) | true | portable |
| compact-restore.js | SessionStart | `^compact$` | true | portable |
| block-push-to-main.js | PreToolUse | `^[Bb]ash$` + if-condition | **false** | portable |
| large-file-gate.js | PreToolUse | `^[Rr]ead$` | true | portable |
| settings-guardian.js | PreToolUse | `^([Ww]rite|[Ee]dit)$` | **false** | sanitize-then-portable |
| pre-compaction-save.js | PreCompact | none (always fires) | true | portable |
| commit-tracker.js | PostToolUse | `^[Bb]ash$` | true | portable |
| run-node.sh | launcher | N/A | N/A | portable |

**Hook-lib helpers (5):** git-utils.js, rotate-state.js, sanitize-input.js, state-utils.js, symlink-guard.js — all universal and portable.

**Critical wiring facts:**
- Two hooks are hard-blocking (`continueOnError: false`): block-push-to-main.js and settings-guardian.js. All others are fail-open.
- `run-node.sh` is the universal launcher for all hooks. No hook fires without it.
- `settings-guardian.js` CRITICAL_HOOKS list is hardcoded: `['block-push-to-main.js', 'settings-guardian.js']`. This list must be reviewed and extended when porting to SoNash.
- No Stop, SubagentStop, or Notification hooks are wired in JASON-OS.
- `commit-tracker.js` uses the only `async_spawn` pattern in the codebase (spawns `mid-session-alerts.js` asynchronously) — the target file is absent (HIGH severity gap per D11).

**Compliance gaps vs CLAUDE.md §2 policy:**
- `compact-restore.js` uses `fs.readFileSync` directly (not via `safe-fs`) on its read path.
- `check-mcp-servers.js` implements its own inline output sanitizer rather than using `sanitize-input.js`.
- `pre-compaction-save.js` uses try/catch-silent error handling rather than importing `sanitize-error.cjs`.

---

### 1.4 Canonical Memory (12 files)

**Source:** D4a

| File | memory_type | scope | portability |
|------|-------------|-------|-------------|
| MEMORY.md (index) | index | universal | sanitize-then-portable |
| feedback_agent_teams_learnings | feedback | user | portable |
| feedback_code_review_patterns | feedback | user | portable |
| feedback_convergence_loops_mandatory | feedback | user | portable |
| feedback_execution_failure_recovery | feedback | user | portable |
| feedback_no_preexisting_rejection | feedback | user | portable |
| feedback_parallel_agents_for_impl | feedback | user | portable |
| feedback_verify_not_grep | feedback | user | portable |
| session-end-learnings | project | project | not-portable |
| user_communication_preferences | user | user | portable |
| user_decision_authority | user | user | portable |
| user_expertise_profile | user | user | portable* |

*`user_expertise_profile.md` carries JASON-OS-specific content ("Stack for this project (JASON-OS) is intentionally TBD") — a content-bleed issue requiring body inspection to detect.

**Key observations:**
- `feedback_verify_not_grep` in canonical vs `feedback_grep_vs_understanding` in user-home — same concept, different filenames. D4a flagged this as a naming divergence where a `supersedes` field would make the relationship explicit and machine-parseable.
- `session-end-learnings.md` is the only project-type canonical memory — an append-only log. Cannot be ported.
- Canonical MEMORY.md index is stale: does not list `session-end-learnings.md` under any section.
- Three frontmatter generations observed across the corpus (minimal / extended / fully-attributed), indicating schema drift.

---

### 1.5 User-Home Memory (62 files across 3 agents)

**Sources:** D4b-1 (files 1-21), D4b-2 (files 22-42), D4b-3 (files 43-62)

**Type distribution:**
- feedback: 51 files
- user: 4 files (communication_preferences, creation_mindset, decision_authority, expertise_profile)
- project: 3 files (cross_locale_config, jason_os, sync_mechanism_principles)
- reference: 2 files (pr_review_integrations, t3_convergence_loops)
- index: 1 file (MEMORY.md)
- other: 1 file (t3_convergence_loops — tenet convention)

**Canonical coverage breakdown:**

| Batch | Files | has_canonical=true | Gap rate |
|-------|-------|--------------------|----------|
| D4b-1 (1-21) | 21 | 5 | 76% |
| D4b-2 (22-42) | 21 | 2 | 90% |
| D4b-3 (43-62) | 20 | 3 | 85% |
| **Total** | **62** | **10** | **~84%** |

Only 10 of 62 user-home memories have canonical counterparts. Approximately 50 portable behavioral rules are git-untracked.

**Portability distribution across all 62:**
- portable: ~44 (the bulk of feedback memories)
- sanitize-then-portable: ~5 (MEMORY.md index, feedback_no_broken_widgets, feedback_commit_hook_state_files, feedback_per_skill_self_audit, feedback_statusline_rebuild_safety)
- not-portable: 3 (project_cross_locale_config, project_jason_os, project_sync_mechanism_principles)
- machine-scoped: 1 (feedback_agent_output_files_empty — Windows-specific)

**Notable findings:**
- **Redundancy cluster:** feedback_ack_requires_approval, feedback_interactive_gates, feedback_never_bulk_accept — all cover the "wait for user input" rule. Same incident appears in multiple files. Consolidation candidate.
- **`t3_convergence_loops.md`** uses a unique `t3_` tenet-numbering prefix convention. D4b-3 infers this represents Tenet #3. The file has `type: reference` in frontmatter but is semantically distinct — a design-philosophy tenet, not a lookup table. Sibling tenets t1_, t2_ may exist or may not yet have been written (LOW confidence on siblings).
- **`originSessionId` inconsistency:** present in ~40% of files. Those that have it use either UUIDs or human-readable session labels (e.g., "Session #245") — two incompatible formats requiring normalization.
- **`recency_signal`:** system-reminder staleness annotations ("This memory is 2 days old") appear on 2 user-home files but are not captured in any schema field.
- **`user_creation_mindset.md`** is explicitly referenced by name in `project_sync_mechanism_principles.md`'s Memory links section — making it load-bearing for the current project design. Its absence from canonical-memory is the highest-priority gap in D4b-3's batch.

---

### 1.6 Scripts (13 files)

**Source:** D5

| File | Subdir | Portability | is_helper | Module system |
|------|--------|-------------|-----------|---------------|
| session-end-commit.js | scripts/ | sanitize-then-portable | no | CJS |
| propagation-patterns.seed.json | scripts/config/ | portable | no | — |
| sanitize-error.cjs | scripts/lib/ | portable | yes | CJS |
| sanitize-error.d.ts | scripts/lib/ | portable | yes | — |
| security-helpers.js | scripts/lib/ | portable | yes | CJS |
| safe-fs.js | scripts/lib/ | portable | yes | CJS |
| parse-jsonl-line.js | scripts/lib/ | portable | yes | CJS |
| read-jsonl.js | scripts/lib/ | portable | yes | CJS |
| todos-mutations.js | scripts/lib/ | portable | yes | CJS |
| package.json | scripts/planning/ | portable | no | — |
| render-todos.js | scripts/planning/ | portable | no | ESM |
| todos-cli.js | scripts/planning/ | portable | no | ESM |
| read-jsonl.js | scripts/planning/lib/ | portable | yes | ESM |

**Critical observations:**
- `scripts/log-override.js` is referenced by `session-end-commit.js` but does not exist. The call is inside a try/catch with "non-blocking" comment — silent failure at runtime. Likely a SoNash file not yet ported or dead code.
- `read-jsonl.js` exists at TWO paths (`scripts/lib/` and `scripts/planning/lib/`) with different implementations. The planning variant is strictly more capable. The lib variant appears to be a legacy predecessor not yet retired.
- `safe-fs.js` self-documents that it is "copied verbatim into `.claude/skills/*/scripts/lib/safe-fs.js`" — an intra-repo copy propagation pattern. Census tooling must account for these copies.
- CJS/ESM boundary: `scripts/planning/` is ESM (via its own package.json with `"type":"module"`). Everything else in `scripts/` is CJS. The boundary is crossed via `createRequire`.

---

### 1.7 Tools (13 files — statusline binary)

**Source:** D6

| File | Scope | Portability | Language |
|------|-------|-------------|----------|
| main.go | universal | portable | Go |
| config.go | universal | portable | Go |
| render.go | universal | portable | Go |
| widgets.go | universal | sanitize-then-portable | Go |
| cache.go | machine | sanitize-then-portable | Go |
| statusline_test.go | universal | portable | Go |
| go.mod | universal | portable | Go |
| go.sum | universal | portable | Go |
| build.sh | universal | portable | bash |
| config.toml | project | sanitize-then-portable | TOML |
| config.local.toml.example | user | portable | TOML |
| config.local.toml | machine | not-portable | TOML |
| jason-statusline-v2.exe | machine | not-portable | binary |

**Critical schema insight from D6:** `cache.go` is the canonical example for why a single `scope` field is insufficient. The source code is universal/portable, but its runtime behavior writes to `~/.claude/statusline/cache-jason-os/` — a machine-specific path. D6 recommends splitting the schema into `source_scope` + `runtime_scope` for tools and hooks.

**External dependencies:** github.com/BurntSushi/toml v1.6.0 (sole third-party Go dep), `gh` CLI (PR/CI data), `git` CLI (branch name), OpenWeatherMap API (weather, requires API key in gitignored config.local.toml).

**Cache dir isolation:** `~/.claude/statusline/cache-jason-os/` is explicitly isolated from any SoNash statusline instance — no cross-contamination between repos.

---

### 1.8 Research Sessions (4 sessions, 68 files)

**Source:** D7

| Session | Depth | Status | Agent count | Key output |
|---------|-------|--------|-------------|------------|
| file-registry-portability-graph | L1 | complete | 14 | RESEARCH_OUTPUT.md (116 claims, 106 sources) |
| jason-os | L0 brainstorm | complete | 0 | BRAINSTORM.md only |
| jason-os-mvp | L1 | complete | 26 | RESEARCH_OUTPUT.md + PHASE_3_95_PLAN.md |
| sync-mechanism | L0+L1 in progress | active | growing | BRAINSTORM.md + Piece 1a artifacts |

**Key observations:**
- Both complete L1 sessions use the `sonash-pre-canonical-v0` schema — a pre-canonical schema that will require field-mapping before any downstream consumer can use the structured data.
- `jason-os-mvp` crossed into planning territory — its PHASE_3_95_PLAN.md indicates a session_type of `hybrid` (research + planning), a category not captured by pure session type enumeration.
- R-frpg → sync-mechanism dependency confirmed: BRAINSTORM.md Section 3.2 explicitly cites R-frpg's scope enum as an input. The scope enum and Option D are binding inputs to Piece 2 schema design.

---

### 1.9 Planning Artifacts (13 units)

**Source:** D8

| Name | Type | Status | Portability |
|------|------|--------|-------------|
| PR_REVIEW_LEARNINGS.md | learnings-doc | active | sanitize-then-portable |
| TODOS.md | todo-log | active | not-portable |
| todos.jsonl | todo-log | active | not-portable |
| jason-os/ (dir) | planning-artifact | active | not-portable |
| jason-os/PLAN.md | plan | active | not-portable |
| jason-os/BOOTSTRAP_DEFERRED.md | planning-artifact | active | not-portable |
| jason-os-mvp/ (dir) | planning-artifact | complete | not-portable |
| jason-os-mvp/PLAN.md | plan | complete | not-portable |
| jason-os-mvp/PORT_ANALYSIS.md | planning-artifact | complete | not-portable |
| jason-os-mvp/DECISIONS.md | planning-artifact | complete | not-portable |
| jason-os-mvp/DIAGNOSIS.md | planning-artifact | complete | not-portable |
| jason-os-mvp/HANDOFF.md | planning-artifact | complete | not-portable |
| jason-os-mvp/RESUME.md | planning-artifact | complete | not-portable |

**Key structural note:** `PORT_ANALYSIS.md` (53 KB, 33+ rows) is the most structurally significant artifact for sync-mechanism schema design. It directly models a file registry with per-file dependency and portability metadata — the schema that the sync-mechanism project must now formalize and extend. T19 in todos.jsonl explicitly notes a schema-reroll risk: do not design SKILL_INDEX.md before sync-mechanism brainstorm produces the canonical registry schema.

**New artifact type identified:** `RESUME.md` is a session bookmark — carries git SHA, what-done summary, what-is-next pointer, and outstanding user actions. A reusable inter-session communication pattern worth formalizing as `plan_scope: session-bookmark`.

**todos.jsonl:** 22 records (17 pending, 5 completed). 4 todos tagged `#sync-mechanism` (T2/T4/T9/T13). The `context.files` array per record tracks affected filesystem paths — directly useful for dependency tracing.

---

### 1.10 CI, Root Docs, and Configs (20 units)

**Source:** D9

**CI Workflows (7):** 6 portable, 1 sanitize-then-portable (sonarcloud.yml — requires SONAR_TOKEN and sonar-project.properties).

**Root Docs (3):** CLAUDE.md (sanitize-then-portable), SESSION_CONTEXT.md (not-portable — ephemeral session state), LICENSE (sanitize-then-portable — update copyright holder).

**Configs (10):** 5 portable (.nvmrc, .gitattributes, package-lock.json, _shared.sh, pre-commit, pre-push), 4 sanitize-then-portable (settings.json, package.json, .gitignore, sonar-project.properties).

**settings.json non-hook sections:**
- `permissions.allow`: 16 entries including Edit, Write, Bash(*), WebSearch, WebFetch, Skill, 5 MCP tool patterns
- `permissions.deny`: force-push, push-to-main, reset-hard, rm-rf
- `env`: `CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1`, `CLAUDE_CODE_GLOB_TIMEOUT_SECONDS=60`
- `statusLine.command`: `"bash .claude/statusline-command.sh"` (target file not found in scan — see Section 6 Gaps)

**Qodo confirmed** as a GitHub App (not a YAML workflow) per CLAUDE.md §2. Its presence is not visible in `.github/workflows/`.

**Semgrep is pinned by tag** (`:1.95.0`), not by digest — noted in the file as a known limitation. All other GitHub Actions use SHA-pinned references.

---

## Section 2: Dependency Structure

**Source:** D11 (204 total edges: 178 HIGH confidence, 24 MEDIUM, 2 LOW)

### 2.1 Tier 1 Hubs (10+ inbound edges — critical infrastructure)

| Unit | Inbound Edges | Role |
|------|--------------|------|
| `scripts/lib/safe-fs.js` | 14 | Universal safe I/O layer — mandatory at all file-I/O boundaries per CLAUDE.md §2 |
| `scripts/lib/sanitize-error.cjs` | 10 | Single source of truth for error sanitization; hard-required by security-critical hooks |
| `skills/convergence-loop` | 9 | Behavioral verification primitive embedded by brainstorm, deep-plan, deep-research, skill-audit, skill-creator |
| `skills/deep-research` | 9 | Hub in both directions: spawns 9 agents and is referenced by 4+ other skills as upstream/downstream |

These four units are the load-bearing infrastructure of JASON-OS. Any sync operation must confirm these exist and are unmodified in the target environment before copying any dependent unit.

### 2.2 Tier 2 Hubs (5-9 inbound edges)

| Unit | Inbound Edges | Role |
|------|--------------|------|
| `hooks/run-node.sh` | 7 | Universal hook launcher — no hook fires without it |
| `scripts/lib/security-helpers.js` | 6 | Mandatory per CLAUDE.md §2 for file-I/O code |
| `hooks/lib/symlink-guard.js` | 5 | Foundational write-safety primitive; the ONE cross-boundary import (hooks/lib → scripts/lib) |
| `skills/add-debt` | 4 | Debt routing hub: deep-research Phase 5, pr-review Step 5, pre-commit-fixer, todo skill |
| `agents/deep-research-synthesizer` | 4 | Central data producer for the research pipeline |
| `SESSION_CONTEXT.md` | 4 | Session-continuity artifact read/written by 4 units across hooks and skills |
| `.claude/state/hook-warnings-log.jsonl` | 4 | Cross-hook state channel: written by 2 hooks, read by session-begin and session-end |
| `skills/deep-plan` | 4 | Referenced by convergence-loop, research-plan-team, brainstorm, and skill-creator |
| `CLAUDE.md` | 4 | Policy root: mandates security libs, documents CI workflows, behavioral guardrails |

### 2.3 Cross-Category Dependency Clusters

**Cluster A — Skills → Agents (spawn pipeline):** deep-research spawns all 8 research pipeline agents in strict phase order. brainstorm also spawns deep-research-searcher and contrarian-challenger conditionally.

**Cluster B — Hooks → scripts/lib (security layer):** Every hook doing file I/O flows through scripts/lib/safe-fs.js. The two hard-blocking hooks (large-file-gate, settings-guardian) both hard-require sanitize-error.cjs specifically.

**Cluster C — scripts/lib internal chain:** safe-fs.js and security-helpers.js both import hooks/lib/symlink-guard.js — the one cross-boundary import in the security cluster. This cross-boundary dependency means symlink-guard.js cannot be moved without updating both scripts/lib consumers.

**Cluster D — Todo skill pipeline (deepest chain):** skills/todo → todos-cli.js → safe-fs.js + sanitize-error.cjs + todos-mutations.js → render-todos.js → planning/lib/read-jsonl.js → safe-fs.js + sanitize-error.cjs. Four levels deep; all paths converge on safe-fs and sanitize-error.

**Cluster E — Session lifecycle:** skills/session-begin ↔ skills/session-end (bidirectional). session-end → session-end-commit.js. The `.claude/state/` directory functions as a shared message bus between hooks and session skills — 6+ state files crossing this boundary.

**Cluster F — CLAUDE.md as policy root:** CLAUDE.md mandates 3 security libs and documents 5 CI workflows. It is both a policy document (outbound mandates) and a required-reading target (inbound from session-begin, pre-commit-fixer, research-plan-team).

**Cluster G — Research session lineage:** jason-os brainstorm → jason-os-mvp (L1) → planning/jason-os-mvp/ (implementation) → sync-mechanism (active). R-frpg also feeds sync-mechanism directly via scope enum and Option D adoption. Clean DAG topology.

### 2.4 Orphans and Near-Orphans

**True leaf nodes** (no outbound deps, inbound only): hooks/lib/sanitize-input.js, hooks/lib/git-utils.js, scripts/lib/parse-jsonl-line.js. These are pure utility leaves by design.

**Suspicious near-orphans:**
- `scripts/lib/read-jsonl.js` (root level): no callers identified in Wave 1. May be a residual file. The planning variant (`scripts/planning/lib/read-jsonl.js`) is strictly more capable.
- `scripts/config/propagation-patterns.seed.json`: mirrors CLAUDE.md §5 exactly but its consumer script was not found. Detector likely not yet built.

---

## Section 3: Composite Entities

**Source:** D12 (15 composites: 8 workflows + 6 processes + 1 memory system)

### 3.1 Workflows (User-Invoked)

| # | Composite | Orchestrator | Component Count | Scope | Portability |
|---|-----------|-------------|-----------------|-------|-------------|
| 1 | `/deep-research` | skills/deep-research | 25 | universal | sanitize-then-portable |
| 2 | `/deep-plan` | skills/deep-plan | 11 | universal | sanitize-then-portable |
| 3 | `/brainstorm` | skills/brainstorm | 9 | universal | portable |
| 4 | `/session-begin` | skills/session-begin | 10 | project | sanitize-then-portable |
| 5 | `/session-end` | skills/session-end | 14 | project | sanitize-then-portable |
| 6 | `/pr-review` | skills/pr-review | 12 | universal | sanitize-then-portable |
| 7 | `/pre-commit-fixer` | skills/pre-commit-fixer | 7 | universal | sanitize-then-portable |
| 8 | `/todo` | skills/todo | 10 | universal | sanitize-then-portable |

`/deep-research` is the largest workflow at 25 components spanning 12 phases. It is the only workflow with optional cross-model verification (gemini-cli) and MCP tool dependencies (context7).

### 3.2 Processes (Hook-Driven or Automatic)

| # | Composite | Trigger | Gate strength | Portability |
|---|-----------|---------|---------------|-------------|
| 9 | Pre-commit security gate | git commit | blocking (gitleaks) | portable |
| 10 | Pre-push escalation gate | git push (dual layer: husky + Claude Code hook) | blocking (both layers) | portable |
| 11 | Compaction state preservation | PreCompact + SessionStart | fail-open | portable |
| 12 | Commit tracking and health alert | PostToolUse (every Bash) | fail-open | portable |
| 13 | Settings and hook integrity protection | PreToolUse (Write/Edit + Read) | **hard-blocking** (settings-guardian) | sanitize-then-portable |
| 14 | CI security pipeline | GitHub Actions (PR/push/schedule) | PR gate | sanitize-then-portable |

The pre-push escalation gate has a dual-layer enforcement design (husky + Claude Code hook). Both layers independently block the operation. This closes gaps where a single layer could be bypassed.

### 3.3 Memory System (Cross-Cutting Data Flow)

| # | Composite | Trigger | Portability |
|---|-----------|---------|-------------|
| 15 | Memory sync and canonical-memory flow | Automatic load on every session | sanitize-then-portable |

The memory system is the only composite with no hook-based trigger — Claude Code natively injects MEMORY.md into the system prompt. Canonical promotion from user-home to canonical-memory is entirely manual. There is no automated sync hook.

### 3.4 Critical Insight from D12

D12 identified `data_contracts[]` as an overlooked load-bearing schema field. Three units have implicit schema contracts that are currently undocumented: SESSION_CONTEXT.md (5-field contract), RESEARCH_OUTPUT.md (structured output format), and handoff.json (compaction-bridge schema). These contracts are the true coupling points between composites — a composite that writes one of these files must produce the exact schema that the reading composite expects.

---

## Section 4: Schema-Field Candidates

**Source:** D13 (73 consolidated candidates from 13 Wave 1 agents)

### 4.1 Field Count by Category

| Category | Candidates | Source agents |
|----------|-----------|---------------|
| Universal (all types) | 11 | All 13 |
| Skills | 7 | D1a, D1b |
| Agents | 6 | D2 |
| Hooks | 7 | D3 |
| Memory | 6 | D4a, D4b-1/2/3 |
| Scripts | 4 | D5 |
| Tools | 5 | D6 |
| Research sessions | 2 | D7 |
| Planning artifacts | 1 | D8 |
| CI workflows | 4 | D9 |
| Relationship fields | 6 | D4a, D4b-1/3, D1a/b, D11 |
| Metadata/bookkeeping | 4 | D4a, D4b-2/3, D2, D6 |
| Operational/security | 9 | D1a, D3, D5, D6, D9, D11 |
| **Total** | **73** | — |

### 4.2 D13 MVP Schema Proposal (12 Fields)

These 12 fields are sufficient to answer "should this unit be synced, and how?" for every unit type. D13's recommendation; Piece 2 has final say.

| Field | Type | Priority | Why |
|-------|------|----------|-----|
| `name` | string | HIGH | Identity |
| `path` | string | HIGH | Lookup key |
| `type` | enum (20+ values) | HIGH | Enables per-type field applicability |
| `scope` | enum (universal / user / project / machine / ephemeral) | HIGH | Primary sync filter |
| `portability` | enum (portable / sanitize-then-portable / not-portable) | HIGH | Sync action |
| `status` | enum (active / deferred / archived / deprecated / stub / gated / complete) | HIGH | Skip stale units |
| `purpose` | string | HIGH | Human-readable context |
| `dependencies` | array of strings | HIGH | Dependency graph |
| `lineage` | object {source_project, source_path, source_version, ported_date} | HIGH | Provenance for bidirectional sync |
| `supersedes` | string | HIGH | Version evolution — highest-priority gap per D4a |
| `superseded_by` | string | HIGH | Inverse provenance |
| `sanitize_fields` | array of strings | HIGH | Operationalizes portability=sanitize-then-portable |
| `notes` | string | HIGH | Escape hatch for nuance |

Note: `supersedes` + `superseded_by` + `notes` brings the count to 13, but D13 treats the supersedes pair as one logical field and notes as a standing catch-all.

### 4.3 Next-Tier Fields (v1.5 / v2)

Priority-ordered additions if MVP proves insufficient:

1. `state_files` — hook/skill state files must stay local, not travel
2. `has_canonical` — memory-gap analysis
3. `agent_types_spawned` — compatibility checking before skill sync
4. `component_units` — needed for multi-file tool and composite sync
5. `required_secrets` — needed before CI workflow sync
6. `source_scope` + `runtime_scope` — split needed for tools and hooks (cache.go problem)
7. `data_contracts` — implicit schema contracts between composites (D12 finding)

### 4.4 Fields Deferred to v2+

61 of 73 candidates are deferred. Notable ones: `mcp_dependencies`, `tool_deps`, `trigger_events` (CI), `deferred_sections`, `pipeline_phase`, `model` (agents), `memory_type`, `append_only`, `module_system`, `requires_build`, `install_target`, `origin_session_id`, `recency_signal`.

---

## Section 5: Critical Findings

These five findings are the items Piece 2 schema design cannot afford to miss or defer.

### 5.1 Content Bleed in User-Scoped Memory Files

`user_expertise_profile.md` (type: user, scope: user) contains JASON-OS-specific content that is incorrect in SoNash: "Stack for this project (JASON-OS) is intentionally TBD." `feedback_no_broken_widgets.md` embeds SoNash dashboard specifics (Tabs 5 and 6, velocity-log, commit-log) inside what appears to be a universal feedback rule. The `scope` field alone cannot detect this problem — body inspection is required. The schema must accommodate a `portability_notes` field or equivalent mechanism that flags specific lines/sections requiring replacement, not just the file-level classification.

### 5.2 50-File Canonical-Memory Gap

Only 12 of 62 user-home memories are git-tracked in `.claude/canonical-memory/`. Approximately 50 portable behavioral rules — including the full library of skill-operational memories (deep_plan_research_check, deep_research_phases_mandatory, etc.) and agent-behavior memories — exist only in `~/.claude/projects/C--Users-<user>-.../memory/`. These files are session-memory only: they load during sessions but are not version-controlled, cannot be diffed, and cannot be reviewed. The sync mechanism must have a canonical-promotion workflow as a first-class feature, not an afterthought.

### 5.3 source_scope vs runtime_scope Split Required

`cache.go` in the statusline tool is the canonical example: its source code is universal and fully portable, but its runtime behavior writes to `~/.claude/statusline/cache-jason-os/` — a machine-specific path. The current single `scope` field conflates two distinct concepts that have different sync implications. The schema must split `scope` into `source_scope` (where the unit's definition lives) and `runtime_scope` (what environments the unit's behavior touches). This affects tools and hooks most critically; skills and agents are typically consistent between the two.

### 5.4 data_contracts[] is a Missing Load-Bearing Field

D12 identified that SESSION_CONTEXT.md, RESEARCH_OUTPUT.md, and handoff.json each have implicit schema contracts that are the true coupling points between composites. A composite that reads SESSION_CONTEXT.md expects exactly 5 fields in a specific format. If session-begin writes a version with a different field name than session-end expects, the coupling breaks silently. These data contracts are currently undocumented — they exist only in the body text of the respective skill/hook files. The schema must represent `data_contracts[]` as a first-class field on composites (and on the files that carry those contracts), or sync will be unable to verify schema compatibility between JASON-OS and SoNash.

### 5.5 Cache Directory Naming Convention Establishes Isolation Pattern

`~/.claude/statusline/cache-jason-os/` explicitly uses the repo name as a namespace suffix. This is the established pattern for per-repo isolation of machine-local artifacts in a shared user home. The sync mechanism must adopt this convention consistently: any artifact that writes to `~/.claude/` must use a repo-name-suffixed directory to prevent cross-contamination between JASON-OS and SoNash running on the same machine. The schema's `install_target` field must capture this namespace suffix as a structured value, not a free-text note.

---

## Section 6: Gaps and Missing References

**Source:** D11 (primary), D1b, D5

### 6.1 Missing Files (Referenced but Not Found)

| Missing Target | Referencing Unit | Severity | Notes |
|----------------|-----------------|----------|-------|
| `scripts/log-override.js` | `scripts/session-end-commit.js` | HIGH | Silent fail in try/catch. Dead code or unported SoNash file. |
| `init_skill.py` | `skills/skill-creator` | HIGH | Phase 4.2 scaffold script. Not present in JASON-OS v0. |
| `.claude/statusline-command.sh` | `configs/settings.json` (statusLine.command) | MEDIUM | settings.json references it; not found in any Wave 1 scan scope. |
| `scripts/health/lib/mid-session-alerts.js` | `hooks/commit-tracker.js` | MEDIUM | Optional async spawn; silently skipped if absent. |
| `scripts/skills/skill-audit/self-audit.js` | `skills/skill-audit` | MEDIUM | Per-skill self-audit scripts; scripts/skills/ was not inventoried in D5 scope. |
| `docs/agent_docs/SKILL_AGENT_POLICY.md` | `skills/skill-creator` | MEDIUM | Referenced but not found in D9 root-doc scan. |
| `/create-audit skill` | `skills/skill-creator` | MEDIUM | Not in skill inventory; may be SoNash-only or deferred. |
| `skills/_shared/SKILL_STANDARDS.md` | `skills/skill-audit`, `skills/skill-creator` | LOW | Referenced but not explicitly inventoried as a standalone unit. |
| `.research/EXTRACTIONS.md` | brainstorm, deep-plan, skill-creator | LOW | Absent in fresh JASON-OS install; graceful if-missing handling. |
| `skills/task-next` | `skills/todo` | LOW | Not in skill inventory; SoNash-only or deferred. |
| `skills/systematic-debugging` | `skills/convergence-loop` | LOW | Planned caller not yet ported. |
| `ROADMAP.md` | `skills/skill-creator` | LOW | Not present in JASON-OS v0. |
| `external/gemini-cli` | deep-research, memory files | INFO | External tool; graceful degradation if unavailable. |

### 6.2 Data Quality Issues

- **`originSessionId` inconsistency:** ~40% of user-home memories have this field; those that do use either UUIDs or human-readable labels (Session #NNN) — two incompatible formats. Normalization required before this field can be used programmatically.
- **`recency_signal` not schema-captured:** system-reminder staleness annotations appear on user-home memory files but are nowhere in any schema field. Present in D4b-2's JSONL output but not defined in the Wave 1 JSONL schema spec.
- **Version inconsistency in skill-audit:** frontmatter says v3.1, version history table says v4.0. Minor but worth flagging for automated version-tracking.
- **Canonical MEMORY.md stale:** does not index `session-end-learnings.md` (the only project-type canonical memory). The index file is behind its own contents.
- **`feedback_verify_not_grep` vs `feedback_grep_vs_understanding`:** same concept, two filenames, no machine-readable relationship between them. The highest-priority schema gap per D4a — resolved only by adding a `supersedes` field and annotating the relationship.

### 6.3 Scan Scope Gaps

The following directories were within the repo but outside any Wave 1 agent's explicit scope:
- `scripts/skills/` — referenced by skill-audit and skill-creator but not inventoried by D5 (which only scanned `scripts/`, `scripts/lib/`, `scripts/planning/`, `scripts/config/`).
- `docs/` — referenced by skill-creator's SKILL.md but not scanned in D9's root-doc scope.

---

## Section 7: Learnings for SoNash (Piece 1b Preparation)

This section is the primary deliverable feeding piece-1b planning. Every item below is a concrete methodology adjustment drawn from the aggregate learnings of the 16 D-agents.

### 7.1 Agent Sizing and Splitting

**Byte-weighted splits, not file-count splits.** D1a confirmed the skill byte-spread is 20x (3.5 KB to 72 KB). A flat N-files-per-agent allocation will give unbalanced agents. For SoNash's 81 skills, target ~120-150 KB per agent; treat any skill above 50 KB as 2 units.

**REFERENCE.md line count as pre-filter.** Run `wc -l .claude/skills/*/REFERENCE.md` before splitting. Skills with REFERENCE.md > 500 lines should be assigned solo or in pairs.

**Memory split: 4 agents of ~21 files each** (not 3×28). The 21-file ceiling, established by D4b-1/2/3, kept composition clean and avoid context pressure. SoNash has 83 user-home memories — use D4b-1 through D4b-4.

**Hooks: 2-3 agents.** SoNash has ~25 hooks (3x JASON-OS). A single agent would risk context exhaustion reading 25 files fully.

**Research: 2-3 agents at 7-10 sessions each.** SoNash has 20 research sessions with 6,858 files. Use the research-index.jsonl as primary input if it exists and is current.

**Planning: split by session type.** Group agents by: (a) research-program sessions, (b) implementation/port sessions, (c) feature-specific sessions. PORT_ANALYSIS.md files deserve dedicated agents (53 KB each in JASON-OS; SoNash likely larger).

**CI + docs + configs: split into D9a (CI + security workflows) and D9b (root docs + configs).** SoNash has 17 CI workflows (2.4x) and 16 root docs (8x) — a single agent would be oversized.

**Schema surveyor: 2 agents for SoNash** (D13a for skills+agents+teams; D13b for hooks+scripts+tools+CI+planning+research+docs). Use this document's 73 candidates as the baseline — the SoNash surveyor should only surface NET NEW fields.

**Dependency mapper: 3 agents for SoNash** (DM-A: skills+agents+teams, DM-B: hooks+scripts/lib, DM-C: CI+config+memory). Then one DM-merge agent for cross-cluster edges.

**Composite identifier: 3 agents** (D12-workflows-a-m, D12-workflows-n-z, D12-processes). SoNash likely has 40-60 composites vs JASON-OS's 15, plus an entire GSD cluster and TDMS system not present in JASON-OS.

### 7.2 Schema Adjustments Before SoNash Scan

Add these schema fields to the JSONL spec before dispatching SoNash agents (currently captured only in notes fields and will be lost without structured extraction):

1. **`lineage`** — Most important addition. SoNash originals need `{source_project: "sonash", ...}`. JASON-OS ports need the reverse. Without this, the bidirectional sync cannot track provenance.
2. **`source_scope` + `runtime_scope`** — The cache.go problem. Tools and hooks need both fields; skills and agents can use single `scope`.
3. **`deferred_sections`** — session-begin and session-end have substantial deferred infrastructure. SoNash likely has the live implementations. Flag all DEFERRED markers explicitly.
4. **`originSessionId`** — Add to schema with normalization note: UUID or Session #NNN, must normalize before use.
5. **`module_system`** — CJS vs ESM cannot be inferred from extension alone when package.json sets "type":"module". Load-bearing for script sync.
6. **`version_lineage`** — Track whether a unit is "upstream" (native SoNash), "jason-os-port", or "original". JASON-OS's 3/6 skill lineage patterns suggest SoNash will have many originals to classify.
7. **`data_contracts`** — Add for composite-type entries before composite scan.

### 7.3 File-Type and Format Observations

**Team files use HTML comment metadata, not YAML frontmatter.** Any parser treating teams as agents will fail. Build a separate team parser.

**MCP tool refs in agent YAML `tools:` field** are not tool names but MCP server references. Treat as `mcp_dependencies`, not `tools`.

**`.cjs` extension is load-bearing** (forces CommonJS resolution in otherwise-ESM contexts). Do not normalize to `.js` during scan.

**Go test files in the same package as source** (Go whitebox testing convention). Do not treat as separate units from the source they test.

**PR-review `reference/` subdirectory pattern** may appear in more SoNash skills. Glob must be `**/*.md` at 2+ depth.

**Domain YAML files** (`.claude/skills/deep-research/domains/`) are not .md files and won't be caught by standard md globs. Add explicit yaml glob.

**Binary files:** inventory by metadata only (name, size, gitignored, install location). Never read a binary.

### 7.4 Classification Heuristics

**"Project-flavored-universal" pattern:** session-begin and session-end are universal in intent but project-anchored in implementation (SESSION_CONTEXT.md 5-field contract). This sub-label is useful for SoNash scanning — skills that are universal in intent but project-anchored in contracts.

**Project memories in SoNash.** Anticipate 10-15 project-scoped memories that are not-portable to JASON-OS — flag these clearly and exclude from canonical gap analysis.

**`type: reference` does not distinguish tenets from lookup tables.** The `t3_` prefix is the only reliable signal for tenet files. Any `tN_`-prefixed file in SoNash should be classified as tenet type, not reference.

**Stub detection.** Look for stub-language keywords ("v0 stub", "placeholder", "deferred") in SKILL.md descriptions, not just the `version` field.

**Research sessions: flag `session_type: hybrid`** for any session that produced both RESEARCH_OUTPUT.md and PLAN.md (like jason-os-mvp).

### 7.5 Dependency Extraction Techniques

**Memory cross-references are PROSE** in notes fields, not structured. A separate extraction pass for memory graph edges will be needed — string-matching alone will miss them.

**`createRequire` pattern in ESM files** bridges to CJS modules. Static grep for `import` will miss these dependencies. Require reading the file body.

**Soft vs hard requires.** Several hooks use `try { require(...) } catch { fallback }`. The `dependencies` array should distinguish `dependency_hardness: "hard | soft"`. At SoNash scale (25 hooks), soft dependencies are easy to mistake for hard ones from the JSONL alone.

**Session-counter coupling.** Two JASON-OS hooks read SESSION_CONTEXT.md for a session counter. Flag all SESSION_CONTEXT.md references in SoNash hooks during the scan.

**`async_spawn` pattern.** Grep for `execFile` / `spawn` / `fork` across all SoNash hooks. The async subprocess pattern is easy to miss without full file reads.

**Pre-scanning before splitting.** Before dispatching agents, run a quick byte-count pass on all skill directories. Any skill above 50 KB should be a solo item within an agent's batch.

### 7.6 SoNash-Specific Expectations

**SoNash likely has 40-60 composite workflows** vs JASON-OS's 15. The GSD system alone (repo-analysis, gsd:new-project, gsd:plan-phase, etc.) is probably 5-10 composites. The TDMS debt system adds more.

**SoNash settings.json is 317 lines** (vs 114 in JASON-OS). At this size, splitting the settings.json read (permissions vs hooks) is prudent. The MCP permission entries will be far more numerous.

**SoNash has Stop and SubagentStop hooks** potentially — JASON-OS has none. Enumerate these events in the census template.

**SoNash research-index.jsonl** — if it exists and is current, use it as the primary input for the research scan and only drop to per-session reads when needed.

**Edge types to watch for in SoNash dep-mapping** not seen in JASON-OS: `tdms-writes`, `gsd-routes`, `firebase-reads/writes`, `audit-triggers`. The JASON-OS edge vocabulary is a floor.

---

## Section 8: Recommended Next Actions

### 8.1 Immediate (Piece 2 — Schema Design)

1. **Use D13's 12-field MVP schema as the starting point.** Do not begin with the full 73-field candidate list. The MVP covers all unit types and addresses all primary sync decisions. Defer the 61 remaining candidates to v1.5+.
2. **Add `data_contracts[]` as a 13th MVP field for composite-type entries.** D12 identified this as a load-bearing oversight that becomes critical when composites reference each other's output schemas.
3. **Decide on `source_scope` + `runtime_scope` split vs single `scope`.** D6 and D2 provide the canonical cases. If the MVP uses a single field, the cache.go problem must be documented as a known limitation with a v2 upgrade path.
4. **Design canonical-memory promotion workflow first.** The 50-file gap is the most acute operational problem. The schema needs a `has_canonical` field and a canonical-promotion trigger before any sync can happen for memories.
5. **Formalize the `supersedes`/`superseded_by` pair.** Without these fields, the `feedback_verify_not_grep` vs `feedback_grep_vs_understanding` divergence is an invisible bug that will silently sync the wrong file.

### 8.2 Before Piece 1b (SoNash Scan Dispatch)

1. **Update Wave 1 JSONL schema spec** to include `lineage`, `originSessionId`, `source_scope`, `runtime_scope`, `deferred_sections`, `module_system`, and `data_contracts` before dispatching SoNash agents. These fields are currently in notes and will be lost without structured extraction.
2. **Apply all Section 7 methodology adjustments** to the SoNash scan dispatch prompt. Do not reuse the JASON-OS Wave 1 prompt verbatim.
3. **Pre-check SoNash for research-index.jsonl.** If present and current, use it as primary input for the research scan.
4. **Build a team-parser** for HTML comment metadata before the SoNash agent/team scan. The YAML frontmatter parser used for agents will fail on team files.

### 8.3 Deferred Items

The following were observed in the census but deferred beyond Piece 2 scope:
- Canonical-memory promotion automation (requires the memory sync component of the sync engine — Piece 4+).
- Schema cleanup of `feedback_verify_not_grep` vs `feedback_grep_vs_understanding` naming divergence (requires human decision before `supersedes` annotation).
- `scripts/log-override.js` gap resolution — determine whether this is a planned file, dead code from SoNash, or should be removed from session-end-commit.js.
- Redundancy cluster consolidation for ack/interactive-gates/bulk-accept memories.
- `recency_signal` field standardization (requires understanding Claude Code's memory system staleness mechanism before designing schema capture).

---

## Confidence Assessment

| Category | Confidence | Basis |
|----------|-----------|-------|
| Inventory counts (per category) | HIGH | Direct file reads by dedicated agents |
| Portability classifications | HIGH | 13 independent agents applied consistent 3-value enum |
| Dependency edges (178/204) | HIGH | Explicit dependency arrays in Wave 1 JSONL |
| Dependency edges (24/204) | MEDIUM | Inferred from notes fields and body text |
| Dependency edges (2/204) | LOW | Ambiguous conditional spawning |
| Hub rankings | HIGH | Computed from confirmed edge counts |
| Gap identifications (missing files) | HIGH | Cross-referenced across multiple agents |
| t3_ tenet numbering interpretation | MEDIUM | Inferred from context; no explicit documentation |
| t1_, t2_ sibling tenet existence | LOW | Speculative from naming pattern |
| Schema MVP recommendation | MEDIUM | D13 judgment; Piece 2 has final say |
| SoNash composite count estimate (40-60) | LOW | Extrapolated from 81-skill count + JASON-OS ratio |

---

## Sources

All sources are internal codebase readings by discovery agents on 2026-04-18. No external web research was conducted.

**Tier 1 — Wave 2 Analysis Agents (synthesize from Wave 1):**
- D11: Dependency map (204 edges from 13 Wave 1 JSONL files)
- D12: Composite entities (15 composites from 13 Wave 1 JSONL files + 4 direct skill reads)
- D13: Schema-field surveyor (73 candidates from 13 Wave 1 MD Learnings sections + R-frpg RESEARCH_OUTPUT.md)

**Tier 2 — Wave 1 Inventory Agents (direct file reads):**
- D1a: Skills A-P (15 files: 7 SKILL.md + 5 REFERENCE.md + 3 pr-review/reference/*.md)
- D1b: Skills P-T (11 files: 6 SKILL.md + 4 REFERENCE.md + 1 other)
- D2: Agents + Teams + Commands (9 files)
- D3: Hooks + Hook-lib + Settings wiring (14 files)
- D4a: Canonical memory (12 files)
- D4b-1: User-home memories 1-21 (21 files)
- D4b-2: User-home memories 22-42 (21 files)
- D4b-3: User-home memories 43-62 (20 files)
- D5: Scripts (13 files)
- D6: Tools/statusline (11 non-binary files)
- D7: Research sessions (4 sessions, summary-level reads)
- D8: Planning artifacts (13 units, 15 files)
- D9: CI workflows + root docs + configs (20 files)

**Supporting context:**
- `.research/sync-mechanism/piece-1a-discovery-scan-jason-os/LEARNINGS.md` — real-time methodology learnings from orchestrator

---

## Methodology

**Phase 1 (Wave 1 — Inventory):** 13 dedicated agents dispatched in 4 waves (Wave 1A: skills + hooks, Wave 1B: memories, Wave 1C: scripts + tools + research + planning, Wave 1D: CI + docs + configs). Each agent read assigned files directly and produced JSONL + MD findings. No agent exceeded 21 units. Total elapsed: ~13 agent invocations across ~4 waves.

**Phase 2 (Wave 2 — Analysis):** 3 dedicated analysis agents dispatched in parallel (D11, D12, D13). Each read all 13 Wave 1 JSONL files. D12 additionally read 4 SKILL.md files directly. D11 produced a 204-edge dependency graph. D12 identified 15 composite entities. D13 consolidated 73 schema-field candidates.

**Phase 3 (Synthesis):** This document. Synthesizer read all 16 MD findings files and LEARNINGS.md. Deduplicated findings across agents. Extracted themes by conceptual grouping, not by source agent. Produced RESEARCH_OUTPUT.md + claims.jsonl + sources.jsonl + metadata.json.

**Total agent invocations:** 16 D-agents + 1 synthesizer = 17 agents.
**Total files read by all agents:** ~170+ direct file reads across the repo.
**No external web research was conducted.** All findings are from direct codebase inspection.
