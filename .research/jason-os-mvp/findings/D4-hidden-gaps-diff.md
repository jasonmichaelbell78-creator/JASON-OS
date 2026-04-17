# Findings: Hidden Gaps Diff — SoNash vs JASON-OS Broad Structural Comparison

**Searcher:** deep-research-searcher
**Profile:** codebase
**Date:** 2026-04-15
**Sub-Question IDs:** D4 (catch-all hidden gaps diff)

---

## Key Findings

### 1. The `/todo` skill is fully broken — its entire script stack is missing [CONFIDENCE: HIGH]

The ported `/todo` skill (`JASON-OS/.claude/skills/todo/SKILL.md`) mandates a
specific script stack that does not exist in JASON-OS:

- `scripts/planning/todos-cli.js` — the mutation CLI the skill calls for every
  add/complete/edit/delete/archive operation
- `scripts/planning/render-todos.js` — auto-called after every mutation
- `scripts/lib/todos-mutations.js` — locked JSONL mutation library used by the CLI
- `.planning/todos.jsonl` — the JSONL data file (does not exist in JASON-OS)

The SKILL.md (line 27) is unambiguous: "All JSONL mutations MUST go through
`scripts/planning/todos-cli.js`. Bypassing it reintroduces the T26/T27/T28
data-loss bug." The skill will fail on first use. This is the highest-priority
script gap because `/todo` is a named skill in `CLAUDE.md §7` as a cross-session
tracking primitive.

### 2. `.claude/teams/` directory is entirely absent from JASON-OS [CONFIDENCE: HIGH]

SoNash has two team configs; JASON-OS has none:

| File | Purpose |
|------|---------|
| `audit-review-team.md` | Reviewer + fixer roles for audit/skill-audit workflows |
| `research-plan-team.md` | Researcher + planner + verifier for deep-research → deep-plan pipeline |

The `research-plan-team.md` is directly relevant to the JASON-OS workflow
chain (`brainstorm → deep-research → deep-plan → execute`). Without it, any
skill that spawns a team via the `teams/` config lookup will fail silently or
with an "agent team not found" error.

### 3. Thirteen scripts/planning utilities are missing; only 7 of 20 `scripts/lib` entries are ported [CONFIDENCE: HIGH]

JASON-OS `scripts/lib` has: `parse-jsonl-line.js`, `read-jsonl.js`, `safe-fs.js`,
`sanitize-error.cjs/.d.ts/.js`, `security-helpers.js`.

Missing from JASON-OS `scripts/lib` (present in SoNash):
- `todos-mutations.js` — referenced by `/todo` skill (HIGH impact)
- `validate-skip-reason.js` — used by SoNash hooks for `SKIP_REASON` enforcement (CLAUDE.md §4.14)
- `safe-cas-io.js` — compare-and-swap I/O for concurrent writes
- `validate-paths.js` — path validation helper
- `normalize-file-path.js` / `normalize-category.js` — normalization utilities
- `ai-pattern-checks.js`, `analysis-schema.js`, `confidence-classifier.js`,
  `generate-content-hash.js`, `learning-router.js`, `load-propagation-registry.js`,
  `reference-graph.js`, `retag-mutations.js` — SoNash-specific analytics infrastructure

The first four (todos-mutations, validate-skip-reason, safe-cas-io, validate-paths)
have potential impact on ported skills/hooks. The analytics group is SoNash-app-specific
and can be safely omitted from JASON-OS MVP.

Missing from JASON-OS `scripts/` root:
- `scripts/planning/todos-cli.js` (blocking — see Finding 1)
- `scripts/planning/render-todos.js` (blocking — see Finding 1)
- `scripts/log-override.js` — used for audit trail of doc-check skips; D3a
  identified this as required by `session-end-commit.js`
- `scripts/install-cli-tools.sh` / `scripts/setup-cli-tools.sh` — bootstrapping
  helpers for new environments

### 4. Ten CI/CD workflows exist in SoNash but not JASON-OS [CONFIDENCE: HIGH]

JASON-OS has 6 workflows (all security/maintenance oriented). Missing workflows
that carry "home feel" operational value:

| Workflow | Purpose | MVP relevance |
|----------|---------|---------------|
| `ci.yml` | Main build/test gate on push to main | HIGH — the heartbeat |
| `docs-lint.yml` | Lint all `.md` files on PR | MEDIUM — keeps docs clean |
| `validate-plan.yml` | Validate phase completion artifacts | LOW — JASON-OS has no phases yet |
| `review-check.yml` | Triggers review check on every PR | MEDIUM |
| `backlog-enforcement.yml` | Weekly backlog hygiene check | LOW |
| `sync-readme.yml` | Sync README status from ROADMAP changes | LOW |
| `auto-label-review-tier.yml` | Auto-label PRs by review tier | LOW |
| `pattern-compliance-audit.yml` | Run pattern compliance scripts | LOW |
| `resolve-debt.yml` | Automated debt resolution | LOW |
| `sonarcloud.yml` | SonarCloud static analysis | LOW (SoNash-specific) |

For JASON-OS MVP: `ci.yml` and `docs-lint.yml` are the only two that directly
support the portable OS workflow without app-specific dependencies.

### 5. Seven `.claude/`-level meta-documents are absent from JASON-OS [CONFIDENCE: HIGH]

These docs live in `.claude/` and are part of the "home feel" for AI navigation:

| File | Purpose | MVP impact |
|------|---------|-----------|
| `COMMAND_REFERENCE.md` | Indexed catalog of all skills/commands (v6.1, 197 lines) | HIGH — AI navigates via this |
| `HOOKS.md` | Documents all configured hooks and their event bindings | HIGH — hook discoverability |
| `STATE_SCHEMA.md` | Schema/inventory of `.claude/state/` files | MEDIUM |
| `CROSS_PLATFORM_SETUP.md` | Windows + Linux setup guide for new environments | MEDIUM |
| `REQUIRED_PLUGINS.md` | Plugin catalog with install instructions (34 plugins) | MEDIUM |
| `settings.global-template.json` | Template for `~/.claude/settings.json` with all plugins | HIGH |
| `mcp.global-template.json` | Template for global MCP servers (ccusage, playwright) | MEDIUM |

`COMMAND_REFERENCE.md` is the most impactful absence. SoNash's CLAUDE.md
references it as the master index; without it, AI navigates by memory rather
than filesystem. `settings.global-template.json` is the mechanism by which
plugins are portable across environments.

### 6. Root-level AI navigation documents are entirely absent [CONFIDENCE: HIGH]

SoNash has a 31KB `AI_WORKFLOW.md` at the root, explicitly structured as the
"master navigation guide for AI assistants." Its header instructs: "At session
start: ALWAYS read this document first." JASON-OS has no equivalent.

Additional missing root-level docs that contribute to project feel:

| File | Size | Home-feel relevance |
|------|------|-------------------|
| `AI_WORKFLOW.md` | 31KB | HIGHEST — session navigation contract for AI |
| `ARCHITECTURE.md` | 21KB | HIGH — structure reference |
| `DEVELOPMENT.md` | 49KB | MEDIUM — dev workflow reference |
| `CONTRIBUTING.md` | 3.5KB | MEDIUM — contribution norms |
| `SESSION_CONTEXT.md` | 43KB | MEDIUM — living session log |
| `SECURITY.md` | 3.7KB | LOW — security policy |
| `CHANGELOG.md` | 109KB | LOW — historical record |
| `ROADMAP.md` | 159KB | LOW for MVP |

For JASON-OS, `AI_WORKFLOW.md` and `ARCHITECTURE.md` are the MVP-relevant ones.
JASON-OS is itself an AI tool, so an `AI_WORKFLOW.md` equivalent (even a
minimal stub) is load-bearing for the "home feel" navigation contract.

### 7. Plugin ecosystem is not documented or templated for portability [CONFIDENCE: HIGH]

SoNash has a 34-plugin configuration across three marketplaces (claude-code-workflows,
claude-plugins-official, superpowers-marketplace) stored in `settings.global-template.json`.
JASON-OS has no `enabledPlugins` block in its `settings.json` and no
`REQUIRED_PLUGINS.md`.

The key plugins for JASON-OS workflow: `context7@claude-plugins-official` (used
in research), `superpowers@superpowers-marketplace` (includes deep-research
skills), `episodic-memory@superpowers-marketplace` (already referenced in
JASON-OS's `settings.json` permissions). Without a template, each new install
of JASON-OS loses the plugin configuration.

### 8. `tool-manifest.json` and CLI tool bootstrapping are absent [CONFIDENCE: HIGH]

SoNash has `.claude/tool-manifest.json` listing 14 CLI tools (fzf, bat, fd, delta,
zoxide, eza, rg, starship, yazi, lazygit, yq, gron, htmlq, difft) with install
checks and `prefer_over` mappings. Paired with `scripts/install-cli-tools.sh` and
`scripts/setup-cli-tools.sh`, this is the "new environment" bootstrapping story.
JASON-OS has none of this. For a "portable OS" project, this is a structural gap.

### 9. `session-activity.jsonl` and override-log infrastructure are missing [CONFIDENCE: HIGH]

SoNash has:
- `.claude/session-activity.jsonl` — session-by-session activity log written by hooks
- `.claude/override-log.jsonl` — audit trail of SKIP_REASON usage
- `scripts/log-override.js` — the script that writes to override-log.jsonl

JASON-OS has neither. D3a's findings confirm `log-override.js` is required by
`session-end-commit.js`. The session-activity log is the runtime record that makes
the SoNash `/session-end` → audit trail workflow feel coherent.

### 10. `.claude/canonical-memory/` (MEMORY.md + feedback files) exists in SoNash at project level; JASON-OS has equivalent only at user-global scope [CONFIDENCE: MEDIUM]

SoNash has `.claude/canonical-memory/` with 18 project-specific feedback files
and a `MEMORY.md`. JASON-OS relies on `~/.claude/projects/*/memory/MEMORY.md`
(the global memory location). The distinction matters: SoNash's canonical-memory
is version-controlled and repo-scoped, so it travels with the repo. JASON-OS's
memory is user-local and does not survive a new machine. For a "portable OS" this
is a structural gap, though it may be intentional (memory is user-specific by
design).

### 11. `.nvmrc` (Node version pin) is absent from JASON-OS [CONFIDENCE: HIGH]

SoNash pins Node 22 via `.nvmrc`. JASON-OS has no Node version pin. Since
JASON-OS scripts use Node (hooks, lib scripts), a new environment could silently
use the wrong Node version. Minimal one-line fix with outsized portability benefit.

---

## Ranked List: Things in SoNash That Contribute to "Home Feel" and Aren't Covered by Other D-Agents

Ranked by MVP impact for a portable Claude Code OS:

1. **`scripts/planning/todos-cli.js` + `render-todos.js` + `scripts/lib/todos-mutations.js` + `.planning/todos.jsonl`** — `/todo` skill is completely broken without these. Blocking.
2. **`.claude/teams/research-plan-team.md` + `audit-review-team.md`** — team-based agent coordination is a named capability; deep-research → deep-plan pipeline uses a team. Missing = broken.
3. **`AI_WORKFLOW.md` (root)** — the AI navigation contract. Every session starts here in SoNash. JASON-OS needs even a minimal stub version for the same session-start discipline.
4. **`.claude/COMMAND_REFERENCE.md`** — indexed catalog of all skills. Without it, AI must enumerate skills from filesystem each time rather than consulting an index.
5. **`.claude/settings.global-template.json`** — plugin portability. JASON-OS is supposed to be portable; without this template, plugin config is lost on each new install.
6. **`.claude/HOOKS.md`** — hook discoverability document. Without it, neither AI nor user knows what hooks are active without parsing `settings.json` manually.
7. **`scripts/log-override.js` + `.claude/override-log.jsonl`** — D3a confirmed `session-end-commit.js` requires this. Audit trail for SKIP_REASON is a CLAUDE.md §4.14 requirement.
8. **`.claude/tool-manifest.json` + `scripts/install-cli-tools.sh`** — new-environment bootstrapping story. Critical for a "portable OS."
9. **`.claude/REQUIRED_PLUGINS.md`** — plugin documentation. Human-readable complement to `settings.global-template.json`.
10. **`scripts/lib/validate-skip-reason.js`** — enforcement of SKIP_REASON discipline (CLAUDE.md §4.14). Used by hooks in SoNash; referenced by guardrail rules.
11. **`.nvmrc`** — one-line Node version pin. Portability fix with no cost.
12. **`.claude/CROSS_PLATFORM_SETUP.md`** — Windows + Linux onboarding guide. Directly relevant for a cross-platform OS.
13. **`ARCHITECTURE.md` (root)** — structural reference doc. JASON-OS needs its own version as the OS structure solidifies.
14. **`ci.yml` + `docs-lint.yml` (GitHub Actions)** — minimal CI: build gate + markdown linting. The rest of SoNash's 10 missing workflows are app-specific.
15. **`.claude/mcp.global-template.json`** — MCP server portability template (ccusage, playwright).
16. **`.claude/session-activity.jsonl`** — session audit trail. Needed for any meaningful session-end workflow.

---

## Sources

| # | Path | Type | Trust | Date |
|---|------|------|-------|------|
| 1 | `C:/Users/jbell/.local/bin/JASON-OS/.claude/skills/todo/SKILL.md` | codebase | HIGH (T1) | 2026-04-15 |
| 2 | `C:/Users/jbell/.local/bin/sonash-v0/.claude/teams/` | codebase | HIGH (T1) | 2026-04-14 |
| 3 | `C:/Users/jbell/.local/bin/sonash-v0/scripts/lib/` (full dir) | codebase | HIGH (T1) | 2026-04-13 |
| 4 | `C:/Users/jbell/.local/bin/sonash-v0/.github/workflows/` (full dir) | codebase | HIGH (T1) | 2026-04-15 |
| 5 | `C:/Users/jbell/.local/bin/sonash-v0/.claude/` (non-dir files) | codebase | HIGH (T1) | 2026-04-15 |
| 6 | `C:/Users/jbell/.local/bin/sonash-v0/AI_WORKFLOW.md` | codebase | HIGH (T1) | 2026-02-23 |
| 7 | `C:/Users/jbell/.local/bin/sonash-v0/.claude/REQUIRED_PLUGINS.md` | codebase | HIGH (T1) | N/A |
| 8 | `C:/Users/jbell/.local/bin/sonash-v0/.claude/settings.global-template.json` | codebase | HIGH (T1) | N/A |
| 9 | `C:/Users/jbell/.local/bin/sonash-v0/.claude/tool-manifest.json` | codebase | HIGH (T1) | N/A |
| 10 | `C:/Users/jbell/.local/bin/JASON-OS/.claude/settings.json` | codebase | HIGH (T1) | 2026-04-15 |
| 11 | `C:/Users/jbell/.local/bin/JASON-OS/scripts/lib/` (full dir) | codebase | HIGH (T1) | 2026-04-15 |

---

## Contradictions

None found. The gaps are clean absences — no case where JASON-OS has a
conflicting version of something SoNash has.

One nuance: `CROSS_PLATFORM_SETUP.md` in SoNash contains a deprecation notice
for `scripts/sync-claude-settings.js` (removed). The doc itself is partially
stale. If ported to JASON-OS, it would need updating before it serves as a
useful onboarding guide.

---

## Gaps

- Did not inspect SoNash's `docs/` subtree in detail (app-specific; unlikely to
  port). The `docs/decisions/` subdirectory may contain decision-log conventions
  worth reviewing — not investigated.
- Did not examine `scripts/research/`, `scripts/reviews/`, or other scripts/
  subdirs for utilities that might be referenced by ported skills (other than
  the planning/ subdir which was confirmed missing).
- Did not verify which of the 10 missing CI workflows are stack-agnostic vs
  SoNash-app-specific. The assessment above is based on workflow names and first-15-line
  inspection only.
- `validate-skip-reason.js` was identified as potentially used by hooks, but
  no JASON-OS hook was found referencing it. Could be a low-impact gap or may
  be covered implicitly by `security-helpers.js`.

---

## Serendipity

- **`tool-manifest.json` is a portable "preferred tool" registry** — it declares
  `bat` over `cat`, `fd` over `find`, `rg` over `grep`, etc. For a portable OS
  this is a first-class artifact, not just a nice-to-have. JASON-OS porting it
  would immediately improve AI tool selection behavior.
- **SoNash's `settings.global-template.json` includes a global `SessionStart`
  hook** that bootstraps `fnm` (Node version manager) before running any hook.
  JASON-OS has no equivalent Node bootstrap in its hooks. On a machine where
  the system Node ≠ `.nvmrc` version, hooks will silently use the wrong Node.
- **`.claude/canonical-memory/` is version-controlled in SoNash**, meaning
  memory travels with the repo. This is a philosophical stance JASON-OS has
  not taken — worth a deliberate decision rather than leaving it as a gap.
- **SoNash's `.github/instructions/` dir** contains `security.instructions.md`
  and `tests.instructions.md` — Copilot-style instruction files. Not relevant
  for JASON-OS (no Copilot), but signals that SoNash uses a dual-AI instruction
  pattern (CLAUDE.md for Claude, .github/instructions/ for Copilot).

---

## Confidence Assessment

- HIGH claims: 10
- MEDIUM claims: 1
- LOW claims: 0
- UNVERIFIED claims: 0
- Overall confidence: HIGH

All findings are based on direct filesystem inspection (T1 codebase sources).
No web search or training-data inference was used.
