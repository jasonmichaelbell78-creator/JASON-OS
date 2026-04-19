# D20c — Dependency Map: CI Workflows, Root Configs, Memories, Research, Planning, Tools, Product

**Agent:** D20c
**Wave:** 2 — Dependency Mapper (Cluster C)
**Date:** 2026-04-18
**Source JSONL:** D20c-dep-map-ci-config-memory.jsonl
**Edge count:** 240 total (E001–E240)

---

## Edge Count Summary

| Category | Edge IDs | Count |
|---|---|---|
| Memory → Memory | E001–E030, E208–E213, E218–E220, E228–E231, E239 | ~42 |
| Memory → Skill/Agent | E031–E048, E066–E068, E075, E077, E084–E085, E210, E212 | ~28 |
| Memory → Script/Artifact | E049–E083 (non-skill/agent subset) | ~25 |
| CI → Script/Config/Product | E086–E111, E191–E195, E205–E207, E216, E221–E222, E226 | ~35 |
| Config → Script/Hook/Artifact | E112–E139, E195–E196, E201, E217, E227, E234–E235, E237 | ~30 |
| Root Doc → Skill/Script/Artifact | E140–E158, E199–E200, E233, E236 | ~22 |
| Tool → State/CLI/Script/Settings | E159–E167, E202–E204 | ~12 |
| Research → Planning/Memory/Other | E168–E178, E215, E224–E225, E232, E238, E240 | ~14 |
| Planning → Memory/Skill/Research/Planning | E179–E190, E214 | ~12 |

Total: **240 edges**

---

## Memory Graph Summary

*Note: Deep canonical drift analysis deferred to D23 (dedicated memory analysis agent). This section covers structural edges only.*

### Memory Corpus Structure

The SoNash memory corpus has two layers with significant drift:

- **User-home** (`~/.claude/projects/.../memory/`): ~Session #269 vintage. Source of truth for current behavior. 83+ files across `feedback_`, `project_`, `user_`, `reference_`, `tN_`, and anomalous `sws_` prefixes.
- **Canonical** (`.claude/memory/`): ~Session #225 vintage. 44 sessions behind. Contains 2 orphan files not in user-home (`feedback_parallel_agents_for_impl`, `feedback_verify_not_grep`) and at least one critically wrong record (`user_expertise_profile` says "Node.js expert" — user is a no-code orchestrator).

### Memory Cross-Reference Density

The `related` inline field is sparsely used (D20c note: "D23 will do dedicated extraction pass" per SCHEMA_SPEC). Confirmed inline cross-references found:

- `feedback_deep_plan_qa_format` → 3 targets (workflow_chain, research_check, no_unnecessary_brainstorming)
- `project_t28_content_intelligence` → 2 targets (scope_drift_deep_research, no_silent_deferrals_execution)
- `project_active_initiatives` → 5 targets (full project tracking list)
- `reference_statusline_architecture` → `feedback_statusline_rebuild_safety`
- `user_decision_authority` → `user_communication_preferences`
- `feedback_tdms_intake_path` → `reference_tdms_systems`
- `sws_session221_decisions` ↔ `feedback_sws_is_meta_plan`, `project_hook_contract_canon`

### Memory → Skill Behavioral Encoding

The most significant dependency cluster: 28+ edges where feedback memories encode behavioral constraints that govern how skills are used. These are the mechanism by which behavioral learning persists across compaction — if memories are lost or not loaded, skill behavior degrades. Critical chain:

```
feedback_workflow_chain → brainstorm → deep-research → deep-plan → gsd
feedback_deep_research_phases_mandatory → deep-research SKILL.md (Phases 3-5 mandatory)
feedback_deep_plan_research_check → deep-plan SKILL.md (Phase 0 Step 3 mandatory)
t3_convergence_loops → convergence-loop, deep-plan, systematic-debugging, pr-review
```

### MEMORY.md as Hub Node

`MEMORY.md` is the highest-degree node in the memory graph: it indexes all 70+ downstream memory files. Every memory is reachable from MEMORY.md. It also serves as the canonical taxonomy namespace definition (prefixes: `feedback_`, `project_`, `user_`, `reference_`, `tN_`).

---

## CI → Script Mapping Table

| Workflow | Scripts/Configs Called | Portability |
|---|---|---|
| `ci.yml` | check-pattern-compliance.js, security-check.js, generate-test-registry.js, validate-phase-completion.js, debt/validate-schema.js, debt/sync-roadmap-refs.js, debt/generate-views.js, .gitleaks.toml, codecov.yml, package.json | sanitize-then-portable (debt scripts SoNash-specific) |
| `semgrep.yml` | .semgrep/rules/correctness/ (7), .semgrep/rules/security/ (8), .semgrep/rules/style/ (5) | sanitize-then-portable (correctness rules Firebase-specific) |
| `sonarcloud.yml` | sonar-project.properties | sanitize-then-portable (project key) |
| `codeql.yml` | .github/codeql/ | portable |
| `dependency-review.yml` | .github/dependency-review-config.yml | portable |
| `scorecard.yml` | (repo-wide scan) | portable |
| `auto-merge-dependabot.yml` | gh CLI | portable |
| `cleanup-branches.yml` | (GitHub API via gh) | portable |
| `auto-label-review-tier.yml` | scripts/assign-review-tier.js | sanitize-then-portable |
| `docs-lint.yml` | scripts/check-docs-light.js | sanitize-then-portable |
| `pattern-compliance-audit.yml` | scripts/check-pattern-compliance.js, scripts/security-check.js | sanitize-then-portable |
| `resolve-debt.yml` | scripts/debt/resolve-bulk.js → MASTER_DEBT.jsonl | not-portable (TDMS SoNash-specific) |
| `review-check.yml` | scripts/check-review-needed.js, .pr-agent.toml, .qodo/pr-agent.toml | sanitize-then-portable |
| `sync-readme.yml` | scripts/update-readme-status.js → ROADMAP.md | sanitize-then-portable |
| `backlog-enforcement.yml` | scripts/check-backlog-health.js, scripts/security-check.js | not-portable (SoNash backlog structure) |
| `validate-plan.yml` | scripts/validate-phase-completion.js, INTEGRATED_IMPROVEMENT_PLAN.md | not-portable (SoNash plan structure) |
| `deploy-firebase.yml` | functions/, firestore.rules | not-portable-product |

**Shared scripts** (called by multiple workflows — need single source of truth in JASON-OS):
- `scripts/check-pattern-compliance.js` — used by ci.yml AND pattern-compliance-audit.yml
- `scripts/security-check.js` — used by ci.yml AND backlog-enforcement.yml AND pattern-compliance-audit.yml
- `scripts/validate-phase-completion.js` — used by ci.yml AND validate-plan.yml

**Action pinning:** All 17 workflows use `actions/checkout` pinned to SHA `de0fac2e4500dabe0009e67214ff5f5447ce83dd` (v6.0.2). This is a security best practice that JASON-OS should preserve.

---

## Config → Consumer Matrix

| Config File | Consumers | Notes |
|---|---|---|
| `.claude/settings.json` | All 15+ .claude/hooks/ scripts, statusline binary path | Master hook registry. Changing this affects all Claude Code behavior. |
| `.mcp.json` | scripts/mcp/sonarcloud-server.js | Single MCP server. JASON-OS MCP config will differ. |
| `.husky/pre-commit` | _shared.sh, scripts/resolve-hook-warnings.js | Entry point for git commit hooks. |
| `.husky/pre-push` | _shared.sh, scripts/resolve-hook-warnings.js | Entry point for git push hooks. |
| `.husky/post-commit` | scripts/resolve-hook-warnings.js | Post-commit warning resolution. |
| `.husky/_shared.sh` | pre-commit, pre-push | Shared library with SKIP_CHECKS/SKIP_REASON infrastructure. Most valuable husky artifact. |
| `eslint.config.mjs` | eslint-plugin-sonash/index.js, scripts/lib/safe-fs.js, scripts/lib/parse-jsonl-line.js | Tightly coupled to eslint-plugin-sonash. Plugin must be sanitized or replaced. |
| `sonar-project.properties` | sonarcloud.yml | Must be updated with JASON-OS project key for port. |
| `.gitleaks.toml` | ci.yml (gitleaks step) | Portable — secrets detection rules are universal. |
| `codecov.yml` | ci.yml (coverage upload) | Portable. |
| `package.json` | scripts/planning/render-todos.js, scripts/docs/generate-doc-index.js, scripts/docs/generate-llms-txt.js, all scripts/ entries | Hub for npm run commands. |
| `tools/statusline/config.toml` | config.go (loader), build.sh (installer) | Installed by build.sh to ~/.claude/statusline/. |
| `tools/statusline/config.local.toml` | config.go (loader) | Local machine overrides. gitignored. |
| `tool-configs/ntfy.conf` | .claude/hooks/notification/ntfy-notify.sh | Topic name `sonash-claude` must be renamed per project. |
| `tool-configs/starship.toml` | setup-cli-tools.sh → ~/.config/starship.toml | Fully portable. |
| `tool-configs/.gitconfig-delta` | setup-cli-tools.sh (reference only — runs `git config --global` commands) | Fully portable. |
| `tool-configs/zoxide-init.sh` | setup-cli-tools.sh → ~/.bashrc | Fully portable. |
| `.pr-agent.toml` | review-check.yml (Qodo) | One of three Qodo config files — 5 suppression rules. |
| `.pr_agent.toml` | (Qodo app reads) | One of three Qodo config files — 29 rules. |
| `.qodo/pr-agent.toml` | (Qodo app canonical) | Canonical per Qodo docs. 29+ rules. All three coexist. |

---

## Learnings

### L1: Memory IS the behavioral layer
The feedback memory corpus (50+ files) is the mechanism by which behavioral corrections survive compaction. The edges `feedback_* → skill SKILL.md` are not just documentation — they are the only thing enforcing correct skill usage after a session boundary. If memories are not loaded, skills will behave in their default (uncorrected) state. JASON-OS sync must treat memory portability with the same priority as skill portability.

### L2: Three-file Qodo config is an ambiguity hazard
SoNash has three Qodo config files (`.pr-agent.toml`, `.pr_agent.toml`, `.qodo/pr-agent.toml`) with different rule counts (5, 29, 29+) and conflicting naming conventions. The canonical one per Qodo docs is `.qodo/pr-agent.toml`, but all three coexist and may produce unexpected behavior. JASON-OS port should consolidate to `.qodo/pr-agent.toml` only.

### L3: Script reuse creates hidden CI dependencies
Three scripts (`check-pattern-compliance.js`, `security-check.js`, `validate-phase-completion.js`) are called by multiple CI workflows independently. If any of these scripts is updated, all consuming workflows are affected. JASON-OS should document these shared scripts explicitly.

### L4: Research → Planning → Memory is the canonical knowledge path
The dependency chain `.research/X/` → `.planning/X/` → `project_X.md` memory appears consistently across 6+ initiative pairs. This is the established knowledge transfer pipeline in SoNash. The sync-mechanism work follows this exact pattern.

### L5: file-registry-portability-graph is the direct intellectual ancestor
The current sync-mechanism research was seeded by `.research/file-registry-portability-graph/` v1.1 (E178). That session's Option D conclusion (JSONL + PostToolUse hook + scope-tags) is reflected in the current sync-mechanism JSONL schema design and the `file-registry-updater.js` PostToolUse hook registration in `.claude/settings.json` (E195).

### L6: Tools have a source/runtime scope split
`tools/statusline/cache.go` is the canonical example: source lives in the repo, runtime state writes to `~/.claude/statusline/cache/` (machine-local). This pattern (source=project-scoped, runtime=machine-scoped) applies to several other artifacts (ntfy.conf topic → ntfy app device subscription; config.local.toml → gitignored machine overrides). JASON-OS sync design must handle this source/runtime duality.

### L7: Action pinning is consistent and should be preserved
All 17 CI workflows pin `actions/checkout` to SHA `de0fac2e4500dabe0009e67214ff5f5447ce83dd`. This is an intentional security posture from CLAUDE.md §2 CI security pipeline. JASON-OS ports should maintain SHA pinning, not revert to tag references.

---

## Gaps

### G1: Memory inline `related` fields — sparse data
The `related` field in D4a-D4d records is mostly empty. D23 (dedicated canonical promotion / memory analysis agent) is assigned a dedicated extraction pass. D20c cannot reliably enumerate all memory-to-memory edges from current data.

### G2: D20a/D20b edge boundaries
D20c was explicitly assigned everything NOT covered by D20a (skills/agents/teams) and D20b (hooks/scripts). Without visibility into D20a/D20b output, there may be edge duplication at the boundary (e.g., skill.md → hook edges that span both territories). Synthesizer should check for overlap.

### G3: .claude/hooks/ full registration list
D17b notes "15+ hooks registered" in settings.json but the exact list was not fully enumerated. D20b (hooks/scripts) covers the full hook inventory. D20c includes representative settings.json → hooks edges only (E112-E116, E195-E196).

### G4: eslint-plugin-sonash internal graph
The `eslint-plugin-sonash/index.js` and its 32 rules were not individually analyzed for downstream dependencies. The plugin's internal graph (rule → specific script patterns it enforces) is a gap.

### G5: .planning/ bookmark/ephemeral artifacts excluded
RESUME.md, STEP_A_HANDOFF.md, WAVE4_RESUME.md and similar ephemeral session bookmark files have no persistent dependency edges. They point forward in time to plan steps but are not consumed by any other artifact. D15b notes these are "ephemeral" — excluded from edge mapping by design.

### G6: TDMS workflow portability analysis incomplete
The TDMS (Tech Debt Management System) is SoNash-specific and will not be ported to JASON-OS. Edges involving `scripts/debt/`, `MASTER_DEBT.jsonl`, and TDMS-related CI workflows were mapped for completeness but portability analysis of their internal graph was not pursued.

---

## Confidence Assessment

- **HIGH claims:** Edge enumeration from D16, D17a, D17b, D13, D15a source JSONL (directly extracted) — ~180 edges
- **MEDIUM claims:** Memory cross-reference edges inferred from D4a-D4d inline fields — ~40 edges
- **LOW claims:** Planning → Research reverse edges inferred from naming correspondence — ~20 edges
- **UNVERIFIED:** 0 claims made without source support
- **Overall confidence:** HIGH for CI/config/tools cluster, MEDIUM for memory cluster (sparse inline data, D23 needed for full extraction)
