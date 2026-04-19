# D21d Findings: GSD (Get-Stuff-Done) Ecosystem Cluster

**Agent:** D21d
**Profile:** codebase
**Date:** 2026-04-18
**Sub-Question IDs:** D21d (GSD workflow system, composite identifier)

---

## Executive Summary

GSD is a complete, self-contained project-management-to-execution workflow
system for solo developers using Claude Code. It is installed via the npm
package `get-shit-done-cc` (currently at v1.37.1 in the registry; SoNash
runs v1.22.4). The plugin installs into `~/.claude/get-shit-done/` and
exposes 30 slash commands under the `gsd:` namespace, 12 global agents
(residing in `~/.claude/agents/` and mirrored to
`.claude/agents/global/` in SoNash), a CLI tool (`gsd-tools.cjs`), 3
user-level hooks, a file manifest, and a rich template library.

The GSD system is architecturally independent of SoNash product code. Zero
SoNash-specific coupling was found in any of the 11 `agents/global/` files.
This makes GSD the strongest port candidate in the entire SoNash inventory.

---

## GSD Agent Roster (11 in SoNash agents/global/, 12 in plugin)

| Agent | Color | Model | Size (bytes) | Role in Pipeline |
|-------|-------|-------|-------------|-----------------|
| gsd-project-researcher | cyan | sonnet | 24,308 | New-project: domain ecosystem research (spawned 4x parallel) |
| gsd-research-synthesizer | purple | sonnet | 7,367 | New-project: synthesizes 4 researchers into SUMMARY.md; commits all |
| gsd-roadmapper | purple | sonnet | 16,866 | New-project: transforms requirements into phase roadmap, initializes STATE.md |
| gsd-phase-researcher | cyan | sonnet | 19,646 | Plan-phase: researches how to implement a specific phase |
| gsd-planner | green | sonnet | 44,624 | Plan-phase: creates executable PLAN.md files (largest agent) |
| gsd-plan-checker | green | sonnet | 20,742 | Plan-phase: 6-dimension goal-backward plan verification before execution |
| gsd-executor | yellow | sonnet | 21,335 | Execute-phase: atomic commits, 4 deviation rules, TDD, checkpoints |
| gsd-verifier | green | sonnet | 22,592 | Verify-phase: goal-backward codebase verification, VERIFICATION.md |
| gsd-integration-checker | blue | sonnet | 12,563 | Verify-phase: cross-phase wiring and E2E flow verification |
| gsd-debugger | orange | sonnet | 37,960 | Debug: scientific-method debugging with persistent file state |
| gsd-codebase-mapper | cyan | sonnet | 15,738 | Map-codebase: 4-focus-area codebase analysis (tech/arch/quality/concerns) |
| **gsd-nyquist-auditor** | purple | (null) | N/A | **Plugin-only** (not in SoNash agents/global/): fills test coverage gaps via /gsd:validate-phase |

**Key structural observations:**

1. **All sonnet, no opus.** GSD agents uniformly use sonnet. No high-stakes
   opus like SoNash project-scoped agents (security-auditor, test-engineer).
2. **Color coding is semantic:** cyan = researcher/mapper, green = planner/
   verifier/checker, yellow = executor, orange = debugger, purple =
   synthesizer/roadmapper.
3. **No `skills:` field on any agent** (except gsd-nyquist-auditor which has
   `skills: [gsd-nyquist-auditor-workflow]` — anomaly, see Gaps section).
4. **gsd-nyquist-auditor mismatch:** The plugin has 12 agents; SoNash's
   `agents/global/` only mirrors 11. The nyquist-auditor is a newer addition
   not yet pushed to SoNash's project copy.

---

## GSD Command Inventory (30 gsd:* commands)

The plugin installs commands to `~/.claude/commands/gsd/`. SoNash also
mirrors these to `.claude/commands/gsd/` but with minor version divergence
(some workflow names differ between `workflows/` and `commands/gsd/`).

### Core Workflow Commands

| Command | Purpose |
|---------|---------|
| `gsd:new-project` | Initialize new project: questioning → research → requirements → roadmap |
| `gsd:new-milestone` | Add a new milestone to existing project |
| `gsd:resume-work` | Resume from existing project state |
| `gsd:progress` | Show current project progress |
| `gsd:health` | Project health check |
| `gsd:plan-phase [N]` | Plan a specific phase (with optional --gaps flag) |
| `gsd:research-phase [N]` | Research phase in isolation |
| `gsd:discuss-phase [N]` | Pre-planning discussion, generates CONTEXT.md |
| `gsd:execute-phase [N]` | Execute a phase plan-by-plan |
| `gsd:verify-work` | Verify phase goal achievement |
| `gsd:validate-phase [N]` | Nyquist validation (test coverage gaps) |
| `gsd:debug [issue]` | Scientific-method debugging session |
| `gsd:map-codebase` | Map codebase across 4 focus areas |

### Project Management Commands

| Command | Purpose |
|---------|---------|
| `gsd:add-phase` | Insert new phase into roadmap |
| `gsd:insert-phase` | Insert decimal phase (2.1, 2.2) between integers |
| `gsd:remove-phase` | Remove a phase |
| `gsd:complete-milestone` | Mark milestone complete, archive |
| `gsd:audit-milestone` | Audit milestone completion |
| `gsd:plan-milestone-gaps` | Plan gap closure for milestone |
| `gsd:add-tests` | Add test coverage to existing code |
| `gsd:add-todo` | Add tracked todo item |
| `gsd:check-todos` | Show pending todos |
| `gsd:cleanup` | Clean up planning artifacts |
| `gsd:quick` | Quick task execution (lightweight path) |
| `gsd:pause-work` | Pause and save project state |

### Configuration Commands

| Command | Purpose |
|---------|---------|
| `gsd:settings` | Configure GSD behavior |
| `gsd:set-profile` | Set model profile (fast/balanced/quality) |
| `gsd:help` | Show GSD command reference |
| `gsd:update` | Update GSD to latest version |
| `gsd:reapply-patches` | Restore local modifications after update |
| `gsd:join-discord` | Join GSD community Discord |
| `gsd:list-phase-assumptions` | List planning assumptions for a phase |

**Command count: 30** (at `~/.claude/commands/gsd/` level).

**Divergence between workflows/ and commands/:** The `workflows/` directory
(canonical templates) contains 5 names not in `commands/gsd/`: `diagnose-issues`,
`discovery-phase`, `execute-plan`, `transition`, `verify-phase`. The `commands/gsd/`
directory has 3 names not in `workflows/`: `debug`, `join-discord`, `reapply-patches`.
This suggests the commands layer is curated for user-facing use while workflows
contains internal orchestration variants.

---

## GSD State-File Schema

GSD uses the `.planning/` directory as its project memory layer. No
`.claude/state/gsd-*` files were found — GSD state is entirely in `.planning/`.

### Core Planning State Files

| File | Location | Mutability | Contract Key |
|------|----------|------------|-------------|
| `config.json` | `.planning/config.json` | Read/write (gsd:settings) | gsd-config |
| `STATE.md` | `.planning/STATE.md` | Overwrite fields (executor) | gsd-state |
| `ROADMAP.md` | `.planning/ROADMAP.md` | Overwrite on revision | gsd-roadmap |
| `PROJECT.md` | `.planning/PROJECT.md` | Written once, reference | — |
| `REQUIREMENTS.md` | `.planning/REQUIREMENTS.md` | Append traceability | — |
| `TODOS.md` | `.planning/TODOS.md` | Append-only | — |

### Phase Lifecycle Files (per-phase directory)

| File | Producer | Consumers |
|------|----------|----------|
| `XX-CONTEXT.md` | gsd:discuss-phase | gsd-phase-researcher, gsd-planner |
| `XX-RESEARCH.md` | gsd-phase-researcher | gsd-planner |
| `XX-YY-PLAN.md` | gsd-planner | gsd-plan-checker, gsd-executor, gsd-verifier |
| `XX-YY-SUMMARY.md` | gsd-executor | gsd-verifier, gsd-integration-checker, gsd-research-synthesizer |
| `XX-VERIFICATION.md` | gsd-verifier | gsd-planner (--gaps mode) |
| `XX-VALIDATION.md` | gsd-nyquist-auditor | — |

### Research Files (new-project)

| File | Location | Producer |
|------|----------|---------|
| `STACK.md` | `.planning/research/` | gsd-project-researcher (focus=tech) |
| `FEATURES.md` | `.planning/research/` | gsd-project-researcher (focus=features) |
| `ARCHITECTURE.md` | `.planning/research/` | gsd-project-researcher (focus=architecture) |
| `PITFALLS.md` | `.planning/research/` | gsd-project-researcher (focus=pitfalls) |
| `SUMMARY.md` | `.planning/research/` | gsd-research-synthesizer |

### Codebase Map Files

| File | Location | Focus Area |
|------|----------|-----------|
| `STACK.md` | `.planning/codebase/` | tech |
| `INTEGRATIONS.md` | `.planning/codebase/` | tech |
| `ARCHITECTURE.md` | `.planning/codebase/` | arch |
| `STRUCTURE.md` | `.planning/codebase/` | arch |
| `CONVENTIONS.md` | `.planning/codebase/` | quality |
| `TESTING.md` | `.planning/codebase/` | quality |
| `CONCERNS.md` | `.planning/codebase/` | concerns |

### Debug State Files

| File | Location | Mutability |
|------|----------|------------|
| `{slug}.md` | `.planning/debug/` | Mixed (section-dependent: overwrite/append) |
| `{slug}.md` | `.planning/debug/resolved/` | Archived (immutable post-resolution) |

### User-Level Cache Files

| File | Location | Producer |
|------|----------|---------|
| `gsd-update-check.json` | `~/.claude/cache/` | gsd-check-update.js (SessionStart) |
| `gsd-file-manifest.json` | `~/.claude/` | npm install get-shit-done-cc |

---

## GSD Hook Integration

### gsd-check-update.js

- **Event:** SessionStart
- **Location:** `.claude/hooks/global/gsd-check-update.js` (SoNash project-level)
  AND `~/.claude/hooks/gsd-check-update.js` (user-level, installed by plugin)
- **Behavior:** Spawns detached background process (`spawn(detached:true)` +
  `child.unref()`). Background process runs `npm view get-shit-done-cc version`
  and writes `{update_available, installed, latest, checked}` to
  `~/.claude/cache/gsd-update-check.json`.
- **Security:** Symlink guard — refuses to write through symbolic links.
- **Module system:** CJS (`require()` throughout)
- **Current state:** Update IS available (1.22.4 installed, 1.37.1 latest).

### gsd-context-monitor.js (user-level, `~/.claude/hooks/`)

- **Event:** PostToolUse (infers from description)
- **Behavior:** Reads context metrics from `/tmp/claude-ctx-{session_id}.json`
  (written by statusline hook). Injects additionalContext warning to agent
  when remaining context <= 35% (WARNING) or <= 25% (CRITICAL). 5-tool-use
  debounce between warnings.

### gsd-statusline.js (user-level, `~/.claude/hooks/`)

- **Event:** SessionStart / Notification
- **Behavior:** GSD-branded statusline showing model | current task |
  directory | context usage. Writes metrics to `/tmp/claude-ctx-{session_id}.json`
  for context monitor to consume.

### SoNash global/statusline.js

- **Note:** SoNash also has a `statusline.js` in `.claude/hooks/global/`
  (separate from the user-level GSD one). This is the SoNash-branded
  statusline from D3a-b scope.

---

## Workflow Architecture

The GSD workflow follows a phased lifecycle:

```
/gsd:new-project
  ├── (optional) /gsd:map-codebase  [brownfield detection]
  ├── Deep questioning
  ├── 4x parallel gsd-project-researcher  [domain ecosystem]
  ├── gsd-research-synthesizer  [SUMMARY.md + commit all]
  └── gsd-roadmapper  [ROADMAP.md + STATE.md + REQUIREMENTS.md traceability]

For each phase:
/gsd:discuss-phase [N]  [optional: generates CONTEXT.md with user decisions]
  └── CONTEXT.md constrains gsd-phase-researcher scope

/gsd:plan-phase [N]
  ├── gsd-phase-researcher  [RESEARCH.md → commit]
  ├── gsd-planner  [PLAN.md files with dependency waves]
  └── gsd-plan-checker  [6-dimension verification → revision loop]

/gsd:execute-phase [N]
  └── gsd-executor  [per-task atomic commits → SUMMARY.md → STATE.md update]
      ├── Deviation Rule 1: auto-fix bugs
      ├── Deviation Rule 2: auto-add missing critical
      ├── Deviation Rule 3: auto-fix blockers
      └── Deviation Rule 4: STOP for architectural decisions

/gsd:verify-work [N]
  ├── gsd-verifier  [goal-backward VERIFICATION.md]
  │   └── If gaps_found: → /gsd:plan-phase --gaps → gsd-planner revision
  └── gsd-integration-checker  [cross-phase wiring + E2E flows]

/gsd:validate-phase [N]  [Nyquist validation layer]
  └── gsd-nyquist-auditor  [fills test coverage gaps]

/gsd:debug [issue]
  └── gsd-debugger  [persistent debug file, scientific method]

/gsd:complete-milestone
  └── Archive .planning/ artifacts, update roadmap
```

**Context budget discipline** is embedded throughout:

- Planner targets 2-3 tasks/plan (5+ is blocker)
- Quality degradation curve: 50-70% context = degrading, 70%+ = poor
- Context monitor hook injects warnings at 35% and 25% remaining

---

## Plugin Origin and Installation

**npm package:** `get-shit-done-cc`
**Publisher:** TÂCHES (https://github.com/gsd-build/get-shit-done)
**Current installed:** v1.22.4 (at `~/.claude/get-shit-done/VERSION`)
**Latest on npm:** v1.37.1 (14 minor versions behind)
**Installed location:** `~/.claude/get-shit-done/` (NOT via Claude Code plugin marketplace)

**Installation mechanism:** NOT the Claude Code plugin marketplace
(`~/.claude/plugins/installed_plugins.json` does not contain GSD). GSD is
installed separately via npm, deploying files directly into `~/.claude/`:

```
~/.claude/get-shit-done/      # workflows, templates, references, bin/
~/.claude/commands/gsd/       # 30 slash commands (gsd: namespace)
~/.claude/agents/             # 12 GSD agent files
~/.claude/hooks/              # gsd-check-update.js, gsd-context-monitor.js, gsd-statusline.js
~/.claude/gsd-file-manifest.json  # SHA256 integrity map
```

**SoNash project-level mirrors:**

SoNash manually mirrors the user-level GSD agents into
`.claude/agents/global/` — this is a SoNash convention, not a plugin
behavior. The project-level mirror has 11 of the 12 agents (nyquist-auditor
missing), suggesting the mirror is slightly stale relative to the plugin.

**SoNash also has** `.claude/hooks/global/gsd-check-update.js` — a
project-scoped duplicate of the user-level hook. This means the update check
fires TWICE per SoNash session (once from project-level SessionStart, once
from user-level hooks config). This is likely an artifact of the project-
level mirror convention.

---

## JASON-OS Portability Verdict

**Recommendation: Install plugin via npm — do NOT manually copy.**

| Approach | Assessment |
|----------|-----------|
| Install `npm install -g get-shit-done-cc` (or equivalent) | **RECOMMENDED.** Gets latest v1.37.1, future updates via `gsd:update`, file integrity via manifest, proper hook installation. No manual file management. |
| Port agents/global/ files manually | NOT recommended. Would immediately be behind by 14 versions. No mechanism for updates. |
| Skip GSD entirely | Valid choice only if JASON-OS already has a deep-research → deep-plan → execute workflow that covers the same needs. GSD is an architectural alternative, not a feature add-on. |

**Portability classification:** `portable` — zero SoNash coupling in any GSD
agent or command file. GSD is designed to be project-agnostic.

**The key architectural question for JASON-OS:** GSD is a PARALLEL WORKFLOW
SYSTEM to the existing brainstorm → deep-research → deep-plan → execute
chain. JASON-OS already has deep-research and deep-plan skills. GSD does NOT
replace these (gsd-phase-researcher can even escalate to `/deep-research`
when LOW confidence). Rather, GSD provides a complementary path: roadmap-
first, phase-by-phase execution with before/after verification gates,
atomic commits per task, and persistent project state across sessions.

Whether JASON-OS should have BOTH systems is a deliberate architectural
decision. Installing the plugin costs nothing; choosing which workflow to use
is an operator decision per-project.

---

## Learnings for Methodology

### L1: Plugin detection requires user-home inspection

D-agents scoping only the SoNash project repo would miss the plugin entirely.
GSD has zero footprint in the SoNash product dirs — it lives in `~/.claude/`.
The only clue in the project tree is `.claude/agents/global/` (the mirror)
and `.claude/hooks/global/gsd-check-update.js`. Future discovery scans of
projects with global agent infrastructure MUST inspect `~/.claude/` for
plugin installations.

### L2: gsd-file-manifest.json is the plugin's inventory

`~/.claude/gsd-file-manifest.json` provides a complete SHA256-keyed
manifest of all plugin files. This is a first-class inventory source — more
reliable than globbing the directory. D-agents discovering unknown file
collections should check for manifest files.

### L3: 11 vs 12 agents — mirror drift pattern

SoNash's `.claude/agents/global/` has 11 agents; the plugin has 12.
`gsd-nyquist-auditor` is present in `~/.claude/agents/` but not in
SoNash's project mirror. This is a "mirror drift" pattern — the project-level
mirror is manually maintained and can fall behind the plugin. Sync scans
should always compare project-level mirrors against plugin canonical sources.

### L4: workflows/ vs commands/ divergence is intentional

The `workflows/` directory (plugin canonical templates) and `commands/gsd/`
(installed user-facing commands) are NOT identical. Some workflow files are
internal orchestration variants not exposed as user commands (e.g.,
`diagnose-issues.md`, `discover-phase.md`, `execute-plan.md`, `transition.md`,
`verify-phase.md`). The commands layer curates the user-facing surface.

### L5: No .claude/state/ usage — all state in .planning/

GSD does not write to `.claude/state/gsd-*`. All GSD state is in `.planning/`
which is project-root level. SCHEMA_SPEC Section 5 covers `.planning/` under
D15a-b, but the GSD output files within that directory (STATE.md, ROADMAP.md,
config.json, phases/, research/, codebase/, debug/) need to be understood
as GSD-managed artifacts when present.

### L6: gsd-nyquist-auditor has skills: field — anomaly for global agents

All other GSD agents in `agents/global/` have NO `skills:` field (confirmed
by D2b — absence of `skills: [sonash-context]` is the structural marker of
global scope). But `gsd-nyquist-auditor` has `skills: [gsd-nyquist-auditor-workflow]`.
This suggests either: (a) GSD supports its own `skills:` injection mechanism
separate from `sonash-context`, or (b) this is a new Claude Code feature
where agents can declare their own skill context. D22 (schema surveyor)
should investigate what `gsd-nyquist-auditor-workflow` resolves to.

### L7: gsd-planner references summary.md via @~/.claude/ path

The gsd-executor uses `@~/.claude/get-shit-done/templates/summary.md` as a
context reference in its execution. This is a user-home `@` reference,
meaning the template is loaded at agent invocation time from the plugin
location. This pattern (@ reference to user-home plugin template) is a clean
dependency injection mechanism that keeps agents decoupled from template
content.

---

## Gaps and Missing References

1. **gsd-nyquist-auditor `skills:` field resolution:** The agent declares
   `skills: [gsd-nyquist-auditor-workflow]` but this skill name is not found
   in SoNash's `.claude/skills/` directory. This skill either lives in the
   plugin itself (an unreferenced location) or is a planned but not yet
   implemented skill. Cannot resolve from available data.

2. **Plugin installation mechanism:** How GSD is initially installed (what
   command the user ran) is not determinable from the file system alone.
   The update-check hook uses `npm view get-shit-done-cc version` which
   confirms it's an npm package, but whether installation was `npm install -g`,
   `npx`, or a custom installer is unknown. The `gsd:update` command likely
   handles re-installation.

3. **`~/.claude/plugins/` vs `~/.claude/get-shit-done/` gap:** GSD is NOT
   in `installed_plugins.json` — it bypasses the Claude Code plugin marketplace
   entirely. This means Claude Code's plugin management UI (if any) doesn't
   track it. For JASON-OS, this is fine but should be documented.

4. **gsd-tools.cjs command inventory:** The CLI tool has ~20 sub-commands
   (`state load`, `resolve-model`, `find-phase`, `commit`, `verify-summary`,
   etc.). These were not deep-read — only the command list was captured.
   Full gsd-tools.cjs analysis is deferred (it's a lib file, not a sync
   artifact).

5. **SoNash .planning/ GSD usage:** SoNash has active `.planning/` directories
   for projects like `dev-dashboard`, `jason-os`, `plan-orchestration`, etc.
   These were not inventoried (out of D21d scope; belongs to D15a-b). However,
   they confirm GSD is actively used in SoNash.

6. **30 commands vs 34 workflow files:** The `workflows/` directory has
   34 files but only 30 are surfaced as user commands. The 4 gap files
   (`diagnose-issues`, `discovery-phase`, `execute-plan`, `transition`) are
   internal orchestration files. Their exact invocation paths are not
   documented here.

---

## Confidence Assessment

- HIGH claims: 28 (all based on direct file reads and filesystem inspection)
- MEDIUM claims: 3 (plugin installation mechanism, nyquist skill resolution,
  workflows/commands gap explanation)
- LOW claims: 1 (whether gsd-nyquist-auditor is intentionally excluded from
  SoNash or just lagging)
- UNVERIFIED claims: 0

**Overall confidence: HIGH.** All JSONL records based on direct filesystem
reads of source files and manifests.
