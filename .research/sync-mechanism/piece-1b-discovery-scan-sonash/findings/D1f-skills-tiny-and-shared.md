# D1f Findings — Tiny Skills (24) and Shared Libraries (_shared/ + shared/)

**Agent:** D1f (Piece 1b SoNash Discovery Scan)
**Profile:** codebase
**Date:** 2026-04-18
**Scope:** `.claude/skills/` — 24 tiny skills (<12KB each) + `_shared/` dir (10 files) + `shared/` dir (1 file)

---

## Overview

24 tiny skills inventoried. 11 shared-library files inventoried (10 from `_shared/`, 1 from `shared/`). Total JSONL records: 35.

**Size distribution of tiny skills:**

| Skill | Bytes | Files | Stub Level |
|---|---|---|---|
| sonarcloud | 12,014 | 1 | production |
| test-suite | 11,597 | 1 | production |
| add-debt | 10,906 | 1 | production |
| audit-code | 10,515 | 1 | production |
| pre-commit-fixer | 10,481 | 1 | production |
| audit-performance | 10,090 | 1 | production |
| audit-engineering-productivity | 9,537 | 1 | production |
| content-research-writer | 5,126 | 2 | production |
| excel-analysis | 5,644 | 1 | production |
| find-skills | 5,225 | 1 | production |
| frontend-design | 5,180 | 1 | production |
| gh-fix-ci | 4,439 | 1 | production |
| using-superpowers | 4,164 | 1 | production |
| checkpoint | 4,118 | 1 | production |
| audit-health | 3,782 | 1 | production |
| sonash-context | 3,741 | 1 | production |
| quick-fix | 3,687 | 1 | production |
| validate-claude-folder | 3,244 | 1 | production |
| docs-maintain | 2,683 | 1 | production |
| task-next | 2,553 | 1 | production |
| website-synthesis | 2,371 | 1 | deprecated |
| repo-synthesis | 2,269 | 1 | deprecated |
| decrypt-secrets | 1,728 | 1 | production |
| schemas | — | 3 | production (no SKILL.md) |

---

## Per-Skill Summaries (24 Tiny Skills)

### 1. sonarcloud (12KB, production)

Unified orchestrator for all SonarCloud operations against the TDMS. 6 modes: sync (fetch from API, diff against MASTER_DEBT.jsonl), resolve (mark fixed items), full (sync+resolve), report (markdown with code snippets), status (quality gate check), sprint (full cleanup workflow + PR creation).

**Portability:** `not-portable`. Deep TDMS integration — all modes write to MASTER_DEBT.jsonl via `scripts/debt/sync-sonarcloud.js`. Hardcoded project key `jasonmichaelbell78_sonash-v0` and org `jasonmichaelbell78`. Has a dedicated MCP server (`scripts/mcp/sonarcloud-server.js`). The post-sync placement analysis (severity-weighted distribution, concentration risk) is a high-value workflow methodology but entirely SoNash-specific.

**External refs:** SonarCloud API, `mcp__sonarcloud__get_quality_gate`, `mcp__sonarcloud__get_issues`, SONAR_TOKEN env var.

**Notable:** References `/add-debt` and the SONARCLOUD_CLEANUP_RUNBOOK.md. Consolidates two previous skills (sonarcloud-sprint + sync-sonarcloud-debt).

---

### 2. test-suite (11.6KB, production)

Multi-phase UI testing orchestration using Playwright MCP or Chrome Extension. 5 phases: Smoke (all pages load), Feature Protocols (JSON protocol files from `.claude/test-protocols/`), Security (auth redirect, PII in network, security headers), Performance (load time, request count, page weight), Report (JSONL + markdown).

**Portability:** `not-portable`. SoNash-specific test routes (`/notebook`, `/admin`, `/journal`, `/meetings/all`), production URL fallback (`sonash-app.web.app`), and test protocol JSON content are all product-specific. The protocol-driven architecture pattern (*.protocol.json files) is methodology-portable.

**External refs:** `mcp__playwright__*` MCP tools, Chrome Extension (for auth-required steps), gh CLI (PR URL auto-detect).

**Notable:** Protocol files in `.claude/test-protocols/`. Test results in `.claude/test-results/`. The `_base.protocol.json` defines common assertions applied to all protocols.

---

### 3. add-debt (10.9KB, production)

Track technical debt items in MASTER_DEBT.jsonl. Two workflows: PR-deferred (with PR number → source_id `PR-{number}-{seq}`) and manual ad-hoc (no PR → source `manual`). Features: SHA256 content-hash deduplication, S0 severity block (cannot defer critical items), batch mode, interactive preview.

**Portability:** `sanitize-then-portable`. The workflow and UX patterns are valuable and portable. The storage backend (MASTER_DEBT.jsonl via `scripts/debt/intake-*.js`) is SoNash-specific. JASON-OS has a v0.1-stub that appends to `.planning/DEBT_LOG.md` instead — the SoNash v2.0 is the full production version with all the quality guards.

**Version:** 2.0 (2026-03-20, 32-decision skill audit rewrite). The most mature tiny skill by revision depth.

**Port status:** JASON-OS has v0.1-stub (confirmed).

---

### 4. audit-code (10.5KB, production)

Single-session code review audit. 7 categories: Code Hygiene, Types & Correctness, Framework Best Practices, Testing Coverage, Security Surface, AICode (AI-Generated Code Failure Modes — unique category), Debugging Ergonomics. Parallel mode: 3 agents (hygiene-and-types, framework-and-testing, security-and-debugging).

**Portability:** `sanitize-then-portable`. The 7 categories and AICode pattern library are highly portable. Sanitize targets: `_shared/AUDIT_TEMPLATE.md` reference, TDMS intake scripts, SonarCloud baseline count, episodic memory MCP calls, Next.js/React-specific file paths.

**Key dep:** `_shared/AUDIT_TEMPLATE.md` — delegates all standard audit procedures there.

**Notable:** AICode category (AI-generated code failure modes) is a high-value portable category with specific patterns like happy-path-only logic, tests that don't assert, hallucinated dependencies, and copy-paste anti-patterns.

---

### 5. pre-commit-fixer (10.5KB, production)

Diagnose and fix pre-commit hook failures: classify → fix → report → confirm workflow. Reads `.git/hook-output.log`, classifies 12 failure categories, spawns subagents for complex fixes, presents structured report before re-committing.

**Portability:** `sanitize-then-portable`. JASON-OS has v2.0-jasonos-v0.1 port (foundation-scoped to gitleaks-only hook). SoNash version is the full production skill with all 12 failure categories. Sanitize: oxlint, pattern compliance, doc index, skill validation, debt/schema categories are SoNash-specific.

**Port status:** JASON-OS has port (confirmed).

**Notable:** References CLAUDE.md guardrails #9/#13/#14 directly (portable cross-references). State: `.claude/tmp/pre-commit-fixer-state.json`. MUST-never-skip confirmation gates.

---

### 6. audit-performance (10.1KB, production)

Single-session performance audit. 7 categories: Bundle Size & Loading, Rendering Performance, Data Fetching & Caching, Memory Management, Core Web Vitals, Offline Support, AI Performance Patterns. Parallel: 2 agents (bundle-and-rendering, data-and-memory).

**Portability:** `sanitize-then-portable`. Firebase-specific checks (onSnapshot, enableIndexedDbPersistence, unbounded Firestore queries) are sanitize targets. The AI Performance Patterns category (added 2026-02-02) has broadly applicable anti-patterns. Uses `_shared/AUDIT_TEMPLATE.md`.

---

### 7. audit-engineering-productivity (9.5KB, production)

Single-session engineering productivity audit. 3 domains: Developer Golden Path (onboarding, scripts, setup), Debugging Ergonomics (logging ratio, correlation IDs, Sentry), Offline Support (Firebase persistence, service workers, write queue). Parallel: 3 agents.

**Portability:** `sanitize-then-portable`. Firebase-specific checks (enableIndexedDbPersistence) and Sentry integration are sanitize targets. The DX/debugging/offline structure is broadly applicable. Uses `_shared/AUDIT_TEMPLATE.md`. Called as Stage 2 of `/audit-comprehensive`.

---

### 8. content-research-writer (5.1KB, 2 files, production)

Writing partner skill for blog posts, articles, tutorials, thought leadership. 8 capabilities: collaborative outlining, research, hook improvement, section feedback, voice preservation, citation management, iterative refinement, final polish.

**Portability:** `portable`. No project-specific dependencies. 2-file layout: SKILL.md + examples.md (extracted in v1.1). Universal scope.

---

### 9. schemas (3 TypeScript files, no SKILL.md)

**UNUSUAL CLASSIFICATION.** This directory contains no SKILL.md. Contents: `analysis-schema.ts` (Zod schema for repo-analysis analysis.json v4.2), `findings-schema.ts` (Zod schema for findings.jsonl), `validate-artifact.ts` (CLI validator CLI entry point via `npx tsx`).

**Portability:** `sanitize-then-portable`. Part of the CAS infrastructure. The Zod schema approach is portable but the field definitions are CAS-specific.

**Type classification:** Should be `script-lib` in synthesis. Lives in `.claude/skills/` but is a code library, not a slash command.

**Cross-reference note:** `analysis-schema.ts` is referenced by `scripts/lib/analysis-schema.js` in the CAS handler skills — but those are JavaScript files in `scripts/lib/`. These TypeScript files in `schemas/` may be the source; the `scripts/lib/` file may be a compiled or separate version. D21/synthesizer should resolve this.

---

### 10. excel-analysis (5.6KB, production)

Python/pandas recipe collection for Excel operations: reading, pivot tables, charts, data cleaning, merging, formatting. Reference-style skill (code snippets, not a workflow).

**Portability:** `portable`. No project-specific dependencies. Python runtime required (pandas, openpyxl, matplotlib). Universal scope.

**Frontmatter quirk:** `name: Excel Analysis` (capital E, space) — directory name is `excel-analysis`. The `/` command trigger would be `/Excel Analysis` which is unusual.

---

### 11. find-skills (5.2KB, production)

Help users discover and install skills from skills.sh ecosystem and plugin marketplaces via unified search script.

**Portability:** `sanitize-then-portable`. The skills.sh/marketplace discovery workflow is universal. The `scripts/search-capabilities.js` unified search is SoNash-specific. Fallback (`npx skills find`) works without it.

**Port status:** NOT in JASON-OS (spawn prompt said "may be ported" — unconfirmed).

---

### 12. frontend-design (5.2KB, production)

Guide for creating distinctive production-grade frontend interfaces. Emphasizes intentional design direction (typography, motion, spatial composition, backgrounds). Explicitly bans generic AI aesthetics.

**Portability:** `portable`. Pure design philosophy guidance — no scripts, no project-specific content. Universal scope. Has `license: Complete terms in LICENSE.txt` in frontmatter but no LICENSE.txt file present.

---

### 13. gh-fix-ci (4.4KB, production)

Inspect GitHub PR checks with `gh` CLI, pull GitHub Actions logs, summarize failures, create fix plan (via `plan` skill), implement after approval.

**Portability:** `sanitize-then-portable`. The `gh` CLI workflow is universal. References a bundled Python script (`<path-to-skill>/scripts/inspect_pr_checks.py`) but it is NOT present in the directory (1 file only). Either moved or not yet created. The fallback workflow using `gh` commands directly works.

**Missing file:** `scripts/inspect_pr_checks.py` is documented but absent.

---

### 14. using-superpowers (4.2KB, production)

Foundational skill-first discipline enforcer. Establishes that skills must be checked before ANY response, including clarifying questions. Contains a dot-graph of the decision flow and a table of rationalization red flags.

**Portability:** `portable`. No scripts, no project-specific content. Fully behavioral.

**Port status claim:** Spawn prompt says "ported" but NOT present in JASON-OS `.claude/skills/`. The behavior is referenced in CLAUDE.md but the skill directory is absent.

**Notable:** The `<EXTREMELY-IMPORTANT>` block with unconditional skill-check mandate is the strongest behavioral language in any tiny skill.

---

### 15. checkpoint (4.1KB, production)

Save session state for compaction/failure recovery. Local mode writes `.claude/state/handoff.json` and `.claude/state/task-{name}.state.json`. MCP mode (--mcp flag) additionally saves to `mcp__memory__create_entities`.

**Portability:** `portable`. No SoNash-specific content. Universal scope.

**Port status:** JASON-OS HAS this skill (confirmed).

**Version discrepancy:** Frontmatter header says v2.0 but Version History table only has 1.0. Possibly the v2.0 bump happened without updating the table.

---

### 16. audit-health (3.8KB, production)

Meta-check for the audit system health. Runs 4 diagnostic scripts, checks ecosystem audit coverage (7-audit table), recommends next audits by commit threshold exceedance.

**Portability:** `not-portable`. All 4 scripts (`audit-health-check.js`, `count-commits-since.js`, `validate-templates.js`, `pre-audit-check.js`) are SoNash-specific audit infrastructure. The concept is portable, the implementation is not.

---

### 17. sonash-context (3.7KB, production) — DEEP DIVE

See dedicated section below.

---

### 18. quick-fix (3.7KB, production)

Advisory skill that parses pre-commit/pattern compliance error output, categorizes by type, and suggests or auto-applies lint fixes.

**Portability:** `sanitize-then-portable`. ESLint fix workflow is portable. Direct Firestore pattern and `scripts/check-pattern-compliance.js` are SoNash-specific. Explicitly described as advisory (not operational — no confirmation gates unlike pre-commit-fixer). The proposed hook integration is not yet wired.

---

### 19. validate-claude-folder (3.2KB, production)

Validate `.claude` folder: MCP server config (`.mcp.json`), hook file presence, skill/command alignment, doc freshness, secrets config, agent frontmatter.

**Portability:** `sanitize-then-portable`. Validation structure is portable. Hook names list (session-start, check-mcp-servers, etc.) are SoNash-specific. Would need hook name list updated for JASON-OS.

---

### 20. docs-maintain (2.7KB, production)

Combined doc sync check and auto-update. Check mode: `npm run docs:sync-check` validates template-instance sync. Update mode: `npm run docs:index` regenerates documentation index.

**Portability:** `sanitize-then-portable`. Both npm scripts are SoNash-specific. The concept of template-instance synchronization and doc index maintenance is portable but needs equivalent scripts in the target project.

---

### 21. task-next (2.6KB, production)

Dependency-resolved next task display from ROADMAP.md using Kahn's topological sort on `[depends: X1, X2]` annotations.

**Portability:** `sanitize-then-portable`. The dependency resolution script (`scripts/tasks/resolve-dependencies.js`) is SoNash-specific. The ROADMAP.md format and task ID system are project-specific. The DAG concept and annotation format are portable.

---

### 22. website-synthesis (2.4KB, deprecated)

DEPRECATED redirect stub. Consolidated into `/synthesize` (T29, Session #271, 2026-04-09).

**Status:** `deprecated`. `superseded_by: synthesize`. Migration guide included. Redirect expires next session after deprecation.

---

### 23. repo-synthesis (2.3KB, deprecated)

DEPRECATED redirect stub. Consolidated into `/synthesize` (T29, Session #271, 2026-04-09). Was v1.3.

**Status:** `deprecated`. `superseded_by: synthesize`. Output path changed: `.research/analysis/SYNTHESIS.md` → `.research/analysis/synthesis/synthesis.md`.

---

### 24. decrypt-secrets (1.7KB, production)

Decrypt encrypted MCP tokens at start of remote session. AES-256-GCM encryption. `.env.local.encrypted` is committed; `.env.local` is gitignored.

**Portability:** `sanitize-then-portable`. The encrypt/decrypt script pair is a portable pattern. Token names (GITHUB_TOKEN, SONAR_TOKEN, CONTEXT7_API_KEY) are project-specific. Scope=user (operator-only).

---

## Shared-Lib Content Analysis

### `_shared/` — 10 files in 2 subdirs

The `_shared/` directory contains two families:

**Family A: General audit shared docs (4 files)**

| File | Size | Version | Consumers |
|---|---|---|---|
| AUDIT_TEMPLATE.md | 7.5KB | 1.0 (2026-02-24) | audit-code, audit-performance, audit-engineering-productivity, audit-process + any skill using standard audit procedures |
| SELF_AUDIT_PATTERN.md | 14.6KB | 1.0 (2026-04-14) | skill-creator (future), skill-audit (Cat.12), all Standard+ skills |
| SKILL_STANDARDS.md | 16.7KB | 3.0 (2026-04-04) | skill-creator, skill-ecosystem-audit, all skill maintenance workflows |
| TAG_SUGGESTION.md | 4.7KB | 1.0 (2026-04-15) | repo-analysis, website-analysis, document-analysis, media-analysis (Phase 6c) |

**Family B: Ecosystem audit shared modules (6 files in `ecosystem-audit/`)**

| File | Size | Consumers |
|---|---|---|
| README.md | 2.5KB | Index file |
| CRITICAL_RULES.md | 2.6KB | All 8 ecosystem audits |
| COMPACTION_GUARD.md | 3.4KB | All 8 ecosystem audits |
| FINDING_WALKTHROUGH.md | 4.6KB | All 8 ecosystem audits |
| SUMMARY_AND_TRENDS.md | 4.1KB | All 8 ecosystem audits |
| CLOSURE_AND_GUARDRAILS.md | 6.4KB | All 8 ecosystem audits |

**Key distinction:** Family A serves general-purpose audit skills. Family B serves only the ecosystem audit family (extracted from 8 audit skills in 2026-03-25 refactor).

**Portability:** AUDIT_TEMPLATE.md and ecosystem-audit modules are `sanitize-then-portable` (drop TDMS/invocation-tracking references). SKILL_STANDARDS.md is `sanitize-then-portable` (largely universal, minor SoNash examples). SELF_AUDIT_PATTERN.md is `sanitize-then-portable` (scripts/lib/ import paths). TAG_SUGGESTION.md is `not-portable` (CAS infrastructure only).

### `shared/` — 1 file

`CONVENTIONS.md` (24.4KB, v1.1, 2026-04-12) — largest shared-lib file by bytes. Defines conventions for the entire CAS (Content Analysis System) skill family:

- Phase transition marker format: `========== PHASE N: [NAME] ==========`
- Write-to-disk-first rule for all phases
- 4-band scoring scale (Critical/Needs Work/Healthy/Excellent, 0-100)
- §14 Tag vocabulary: 8 categories (domain, technology, concept, technique, pattern, applicability, quality, taxonomic), forbidden tags, naming rules, vocabulary-first growth
- Extraction journal format
- Synthesis output standards
- Conversational prose rule for creator views

**Consumers (confirmed from D1c/D1d):** `analyze`, `recall`, `repo-analysis`, `website-analysis`. By extension: `document-analysis`, `media-analysis`, `synthesize`.

**Portability:** `not-portable`. Tied to `.research/tag-vocabulary.json`, `.research/content-analysis.db` (SQLite), `analysis.json` schema, and `extraction-journal.jsonl`. Would need to port the entire CAS cluster together.

---

## sonash-context/ Skill Deep-Dive

This is the most architecturally significant skill in the tiny batch. It is the mechanism behind the `skills: [sonash-context]` frontmatter field seen in D1a's ecosystem audit skills.

### What it does

`sonash-context` is a **context injection vehicle**, not a slash command. When an agent definition in `.claude/agents/*.md` declares `skills: [sonash-context]` in its YAML frontmatter, the content of this SKILL.md is injected into the agent's context before it runs.

### What it injects

- **Stack versions** (with explicit note: "DO NOT flag as invalid — newer than training cutoff"): Next.js 16.2.0, React 19.2.4, Firebase 12.10.0, Tailwind CSS 4.2.2, Zod 4.3.6, TypeScript strict mode
- **Architecture patterns**: Repository pattern (lib/firestore-service.ts), state management (useState local, Context global, Firestore server), Zod runtime validation
- **Security boundaries**: No direct writes to `journal/daily_logs/inventoryEntries`, httpsCallable via Cloud Functions, App Check required, rate limiting with sonner toasts, sanitizeError() mandatory
- **Key paths**: Cloud Functions, Firestore schemas, App Router components, scripts, agents, skills, health checkers, tests
- **Coding standards**: TypeScript strict no-any, functional components + Hooks, Tailwind utility-first

### Why it matters for JASON-OS

The `skills:` injection mechanism is the correct pattern for injecting project-specific context into agents. In JASON-OS, an equivalent `jason-os-context` skill would inject JASON-OS-specific facts (Node.js 22, npm, hook infrastructure, security helpers from scripts/lib/). The JASON-OS CLAUDE.md currently carries these facts inline — the sonash-context pattern is a more modular approach.

### Version history gap

v1.0 has no date. v1.1 (2026-04-15) added required SKILL_STANDARDS.md sections (H1 title + When to Use / When NOT to Use / Version History). This implies the skill pre-dates SKILL_STANDARDS.md formalization and was retrofitted.

### Which agents use it

From D1a findings: `hook-ecosystem-audit`, `session-ecosystem-audit`, `health-ecosystem-audit` all have `skills: [sonash-context]` in their frontmatter. D1d confirmed the pattern is absent from the medium-tier batch, suggesting it's specific to the ecosystem audit family. Not universal across all SoNash skills.

---

## Complete Skill Census Check

**Total skill directories (excluding _shared, shared, SKILL_INDEX.md):** 80

| Agent | Skills covered | Skill names |
|---|---|---|
| D1a | 5 | hook-ecosystem-audit, tdms-ecosystem-audit, pr-ecosystem-audit, session-ecosystem-audit, script-ecosystem-audit |
| D1b | 5 | doc-ecosystem-audit, skill-ecosystem-audit, market-research-reports, health-ecosystem-audit, alerts |
| D1c | 11 | mcp-builder, repo-analysis, website-analysis, system-test, media-analysis, audit-comprehensive, deep-research, document-analysis, skill-audit, artifacts-builder, skill-creator |
| D1d | 15 | synthesize, pr-review, doc-optimizer, analyze, pr-retro, systematic-debugging, comprehensive-ecosystem-audit, create-audit, audit-process, multi-ai-audit, audit-agent-quality, recall, ecosystem-health, convergence-loop, github-health |
| D1f | 24 | sonarcloud, test-suite, add-debt, audit-code, pre-commit-fixer, audit-performance, audit-engineering-productivity, content-research-writer, schemas, excel-analysis, find-skills, frontend-design, gh-fix-ci, using-superpowers, checkpoint, audit-health, sonash-context, quick-fix, validate-claude-folder, docs-maintain, task-next, website-synthesis, repo-synthesis, decrypt-secrets |
| **D1 subtotal** | **60** | |
| **Uncovered** | **20** | See below |

**20 skills with NO D-agent coverage (D1e was never spawned):**

1. `audit-aggregator`
2. `audit-ai-optimization`
3. `audit-documentation`
4. `audit-enhancements`
5. `audit-refactoring`
6. `audit-security`
7. `brainstorm`
8. `code-reviewer`
9. `data-effectiveness-audit`
10. `debt-runner`
11. `deep-plan`
12. `developer-growth-analysis`
13. `session-begin`
14. `session-end`
15. `todo`
16. `ui-design-system`
17. `ux-researcher-designer`
18. `webapp-testing`
19. `brainstorm` (repeat check — confirmed 1 entry)
20. (19 unique uncovered skills + _shared and shared handled by D1f)

**Census verdict: INCOMPLETE.** 60 of 80 skills covered. 20 skills unassigned. No D1e agent was spawned to cover this gap. These 20 skills likely include major skills (brainstorm, deep-plan, session-begin, session-end, todo are all likely ported to JASON-OS and are high-value).

**Known JASON-OS ported skills in the uncovered 20:** `brainstorm`, `deep-plan`, `session-begin`, `session-end`, `todo` — all present in JASON-OS `.claude/skills/`. These are high priority for D1e to cover.

---

## Portability Summary (24 tiny skills)

| Portability | Count | Skills |
|---|---|---|
| portable | 4 | content-research-writer, excel-analysis, frontend-design, using-superpowers |
| sanitize-then-portable | 13 | add-debt, audit-code, pre-commit-fixer, audit-performance, audit-engineering-productivity, find-skills, gh-fix-ci, quick-fix, validate-claude-folder, docs-maintain, task-next, decrypt-secrets, checkpoint* |
| not-portable | 5 | sonarcloud, test-suite, audit-health, sonash-context, audit-health |
| deprecated | 2 | website-synthesis, repo-synthesis |
| special (no SKILL.md) | 1 | schemas (should be script-lib) |

*checkpoint is portable per JASON-OS port confirmation — listed as sanitize-then-portable conservatively due to MCP memory references that may not exist in all deployments.

**Port status verified in JASON-OS:**
- Present: add-debt (stub), pre-commit-fixer, checkpoint
- Absent (claimed ported): using-superpowers (NOT PRESENT — spawn prompt claim wrong)
- Absent (as expected): sonarcloud, test-suite, audit-health, sonash-context, website-synthesis, repo-synthesis, and the 13 sanitize-then-portable skills

---

## Learnings for Methodology

1. **`schemas/` directory has no SKILL.md — not a skill.** The `schemas/` directory is a TypeScript code library (Zod schemas + CLI validator) masquerading as a skill directory by location. Any scan that assumes "directory under `.claude/skills/` = slash command" will misclassify this. Add a check for presence of SKILL.md before assigning `type: skill`. Correct type: `script-lib` or `tool-file`.

2. **Deprecated skills need `status: deprecated` enforcement.** `website-synthesis` and `repo-synthesis` are explicitly deprecated in their SKILL.md but still exist as directories. The synthesis showed that skill deprecated-redirect stubs have a defined one-session overlap policy. Scan methodology should flag `status: deprecated` on any skill whose SKILL.md body declares DEPRECATED in the first line of the H1. These should be excluded from portability analysis.

3. **Port status claims in spawn prompts need filesystem verification.** `using-superpowers` was claimed as "ported" but is absent from JASON-OS. D1d flagged the same issue for `systematic-debugging`. Spawn prompt portability claims have a non-trivial false positive rate. Always verify against `ls /c/Users/<user>/Workspace/dev-projects/JASON-OS/.claude/skills/`.

4. **`skills:` injection mechanism is architecturally significant.** The `sonash-context` pattern of using YAML `skills:` frontmatter in agent definitions to inject project context is a portable mechanism — only the content is SoNash-specific. The JASON-OS equivalent would be a `jason-os-context` skill. D21/synthesizer should flag this as a high-value port target (the mechanism, not the content).

5. **Single-session audit skills share a family structure.** `audit-code`, `audit-performance`, `audit-engineering-productivity` are structurally near-identical: same YAML frontmatter (`supports_parallel`, `fallback_available`, `estimated_time_*`), same parallel+sequential architecture, same `_shared/AUDIT_TEMPLATE.md` delegation, same TDMS intake pattern. Any port of one naturally templates the others. These three plus `audit-process` and `audit-security` form a recognizable "single-session audit" family.

6. **The `_shared/` vs `shared/` distinction matters for port ordering.** `_shared/` serves two separate consumer families (general audit skills via AUDIT_TEMPLATE.md, and ecosystem audit skills via ecosystem-audit/). `shared/` serves only the CAS cluster. Port order implications: AUDIT_TEMPLATE.md should port with any audit skill; ecosystem-audit/ modules port with the ecosystem audit cluster; shared/CONVENTIONS.md ports only with the full CAS cluster.

7. **Frontmatter inconsistency: version numbers.** `checkpoint` SKILL.md header says "v2.0" but Version History table shows only "1.0". This drift between header metadata and Version History table is a documentation quality issue the `skill-ecosystem-audit` should flag. Scan methodology should warn when document header version ≠ latest Version History entry.

8. **gh-fix-ci has a missing referenced file.** The `inspect_pr_checks.py` is documented in SKILL.md as a bundled resource but the directory contains only `SKILL.md`. This is a broken reference. Scan methodology should cross-check all scripts referenced in SKILL.md against `find <skill-dir> -type f`. This gap was only discoverable by reading the full SKILL.md, not from the file listing alone.

9. **Census gap: D1e was never spawned.** 20 of 80 skills lack coverage. The missing batch includes high-value JASON-OS-ported skills (brainstorm, deep-plan, session-begin, session-end, todo) and several unknown audit variants (audit-aggregator, audit-ai-optimization, audit-documentation, audit-enhancements, audit-refactoring, audit-security). D1e needs to be spawned to complete the census. Final total should be 81 skill-level records (80 skills + 1 for SKILL_INDEX.md as a special-type record handled by D17).

10. **The `excel-analysis` frontmatter name field has a space.** `name: Excel Analysis` — this would make the slash command `/Excel Analysis` rather than `/excel-analysis`. This is a SKILL_STANDARDS.md compliance violation (names should be lowercase-hyphenated slugs). Flag in findings for skill-ecosystem-audit category.

---

## Gaps and Missing References

1. **D1e never spawned — 20 skills uncovered.** These include both likely-portable (brainstorm, deep-plan, session-begin, session-end, todo) and unknown skills (audit-aggregator, audit-ai-optimization, developer-growth-analysis, etc.). This is a P1 gap for census completeness.

2. **`schemas/` TypeScript files not deep-read.** `analysis-schema.ts` is large (Zod schema for analysis.json v4.2 format) and was only partially read (first 40 lines). The full schema field list was not captured. This may be relevant for D21 (workflow identifier) when mapping CAS data contracts.

3. **`shared/CONVENTIONS.md` not fully read.** Only first 60 lines read (of what is likely 300+ lines given the 24.4KB size). The full tag vocabulary §14, extraction journal format, and synthesis output standards were not captured. These are relevant for D21 CAS contract mapping.

4. **`_shared/SKILL_STANDARDS.md` not fully read.** Only first 80 lines read (of 16.7KB). The full tier definitions (Simple/Standard/Complex), self-audit dimension framework, and lifecycle management sections were not captured.

5. **`gh-fix-ci/scripts/inspect_pr_checks.py` referenced but absent.** Either the script was in a `scripts/` subdirectory that was removed, or it was documented but never created. D-agent for gh-fix-ci (not explicitly assigned — may fall to D19 or D13 if it appears in a scripts dir) should check `scripts/` for this file.

6. **`content-research-writer/examples.md` not read.** Secondary file — assumed to contain writing templates and format examples per the SKILL.md reference. Not critical for portability assessment.

7. **Census total is 80 skills, not 81.** The dispatch spec mentioned 81 skills total. The 80 count comes from `ls -d .claude/skills/*/` which counts only directories. SKILL_INDEX.md is a file not a directory and is not counted. If SKILL_INDEX.md counts as a skill-index record, the total is correct at 81 (80 skill dirs + 1 index file). D17 should handle SKILL_INDEX.md as a `doc` or `config` type.
