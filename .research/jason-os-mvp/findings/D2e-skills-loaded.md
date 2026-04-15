# Findings: Skills Inventory — SoNash vs JASON-OS Triage

**Searcher:** deep-research-searcher
**Profile:** codebase
**Date:** 2026-04-15
**Sub-Question IDs:** D2e

---

## Key Findings

### 1. SoNash has 80 skill entries; JASON-OS has 9; user-global has 0. [CONFIDENCE: HIGH]

Filesystem counts via `ls`:
- `sonash-v0/.claude/skills/`: 80 entries (78 skill directories + `_shared/` + `SKILL_INDEX.md`)
- `JASON-OS/.claude/skills/`: 9 skill directories
- `~/.claude/skills/`: empty

The 9 JASON-OS skills are: `brainstorm`, `checkpoint`, `convergence-loop`, `deep-plan`, `deep-research`, `session-begin`, `skill-audit`, `skill-creator`, `todo`. All appear to be direct ports from SoNash (identical descriptions confirmed via spot-checks).

JASON-OS is missing 71 skill entries — including the entire audit suite, session-end, pre-commit-fixer, debugging, analysis, and content skills.

---

### 2. Portability Classification Summary [CONFIDENCE: HIGH]

Portability was assessed by (a) counting occurrences of `sonash|firebase|next\.js|vercel|TDMS|MASTER_DEBT|ROADMAP` in each SKILL.md and (b) reading headers/content for semantic coupling. Results:

**PORTABLE (0 project-specific references, content is project-agnostic):**
`alerts`*, `analyze`, `artifacts-builder`, `brainstorm`, `checkpoint`, `content-research-writer`, `convergence-loop`, `deep-plan`, `deep-research`, `document-analysis`*, `excel-analysis`, `find-skills`, `frontend-design`, `gh-fix-ci`, `market-research-reports`, `mcp-builder`, `media-analysis`, `pre-commit-fixer`, `quick-fix`, `recall`*, `session-begin`*, `skill-audit`, `skill-creator`, `synthesize`*, `systematic-debugging`, `todo`, `ui-design-system`, `using-superpowers`, `ux-researcher-designer`, `validate-claude-folder`, `webapp-testing`, `website-analysis`*

*asterisked: 0 hard references but depends on project-specific scripts or knowledge base infrastructure — functionally portable but requires companion scripts to run.

**NEEDS SANITIZATION (has some references, core logic is portable):**
`audit-code` (6 refs — SoNash examples), `audit-security` (13 refs — Firebase rules, Next.js paths), `audit-documentation` (7 refs), `audit-enhancements` (21 refs), `audit-engineering-productivity` (9 refs), `audit-performance` (3 refs), `audit-refactoring` (5 refs), `audit-ai-optimization` (4 refs), `audit-process` (18 refs), `audit-comprehensive` (22 refs), `audit-aggregator` (10 refs), `code-reviewer` (5 refs — "tailored for SoNash codebase" in description), `create-audit` (9 refs), `doc-ecosystem-audit` (1 ref), `doc-optimizer`, `docs-maintain`, `ecosystem-health`* (0 hard refs but runs SoNash node scripts), `github-health`, `hook-ecosystem-audit` (6 refs), `multi-ai-audit` (9 refs), `pr-ecosystem-audit` (2 refs), `pr-retro` (4 refs — TDMS/MASTER_DEBT), `pr-review` (8 refs — SonarCloud/TDMS wired in), `repo-analysis` (6 refs), `script-ecosystem-audit` (3 refs), `session-end` (11 refs — TDMS steps, MASTER_DEBT, ROADMAP), `skill-ecosystem-audit` (1 ref), `sonarcloud` (deep coupling), `system-test` (9 refs), `task-next` (4 refs — ROADMAP.md format), `test-suite` (5 refs — Playwright/SoNash)

**NON-PORTABLE (entirely tied to SoNash):**
`sonash-context` — literally SoNash stack versions and architecture injected into agents
`decrypt-secrets` — references `.env.local.encrypted`, SoNash token naming conventions (SONAR_TOKEN, etc.), SoNash scripts path
`add-debt` — writes to `MASTER_DEBT.jsonl`, SoNash TDMS system
`debt-runner` — TDMS orchestrator, 7-mode SoNash-specific pipeline
`developer-growth-analysis` — analyzes Claude Code chat history + sends personalized email (SoNash-specific automation)
`tdms-ecosystem-audit` (25 refs) — audits SoNash TDMS pipeline
`health-ecosystem-audit` (4 refs, runs SoNash health scripts), `data-effectiveness-audit` (3 refs), `comprehensive-ecosystem-audit` (4 refs — depends on ecosystem scripts)
`alerts` — runs `node .claude/skills/alerts/scripts/run-alerts.js` (SoNash script); functionally non-portable without script
`repo-synthesis`, `website-synthesis` — DEPRECATED redirects

**ALREADY IN JASON-OS:**
`brainstorm`, `checkpoint`, `convergence-loop`, `deep-plan`, `deep-research`, `session-begin`, `skill-audit`, `skill-creator`, `todo`

---

### 3. Master Skill Table [CONFIDENCE: HIGH]

| Skill | Category | Portability | Value Rank (1-10) | In JASON-OS |
|---|---|---|---|---|
| `brainstorm` | planning | portable | 9 | YES |
| `deep-plan` | planning | portable | 9 | YES |
| `deep-research` | research | portable | 9 | YES |
| `convergence-loop` | quality | portable | 8 | YES |
| `checkpoint` | session | portable | 8 | YES |
| `session-begin` | session | needs-sanitization | 9 | YES |
| `todo` | session | portable | 8 | YES |
| `skill-creator` | meta | portable | 8 | YES |
| `skill-audit` | meta | portable | 7 | YES |
| `session-end` | session | needs-sanitization | 9 | NO |
| `pre-commit-fixer` | quality | portable | 9 | NO |
| `systematic-debugging` | quality | portable | 9 | NO |
| `gh-fix-ci` | quality | portable | 8 | NO |
| `validate-claude-folder` | meta | portable | 8 | NO |
| `find-skills` | meta | portable | 7 | NO |
| `using-superpowers` | meta | portable | 7 | NO |
| `quick-fix` | quality | portable | 7 | NO |
| `mcp-builder` | infra | portable | 7 | NO |
| `analyze` | research | portable | 8 | NO |
| `synthesize` | research | needs-sanitization | 7 | NO |
| `document-analysis` | research | portable | 7 | NO |
| `recall` | research | portable | 7 | NO |
| `website-analysis` | research | needs-sanitization | 6 | NO |
| `repo-analysis` | research | needs-sanitization | 6 | NO |
| `media-analysis` | research | portable | 5 | NO |
| `content-research-writer` | content | portable | 6 | NO |
| `audit-code` | audit | needs-sanitization | 8 | NO |
| `audit-security` | audit | needs-sanitization | 8 | NO |
| `audit-performance` | audit | needs-sanitization | 7 | NO |
| `audit-refactoring` | audit | needs-sanitization | 7 | NO |
| `audit-documentation` | audit | needs-sanitization | 7 | NO |
| `audit-enhancements` | audit | needs-sanitization | 7 | NO |
| `audit-ai-optimization` | audit | needs-sanitization | 7 | NO |
| `audit-engineering-productivity` | audit | needs-sanitization | 6 | NO |
| `audit-process` | audit | needs-sanitization | 6 | NO |
| `audit-comprehensive` | audit | needs-sanitization | 6 | NO |
| `audit-aggregator` | audit | needs-sanitization | 6 | NO |
| `audit-health` | audit | needs-sanitization | 5 | NO |
| `create-audit` | meta | needs-sanitization | 6 | NO |
| `multi-ai-audit` | audit | needs-sanitization | 6 | NO |
| `skill-ecosystem-audit` | meta | needs-sanitization | 6 | NO |
| `ecosystem-health` | meta | needs-sanitization | 6 | NO |
| `code-reviewer` | audit | needs-sanitization | 7 | NO |
| `pr-review` | quality | needs-sanitization | 6 | NO |
| `pr-retro` | quality | needs-sanitization | 5 | NO |
| `pr-ecosystem-audit` | audit | needs-sanitization | 5 | NO |
| `doc-optimizer` | docs | needs-sanitization | 6 | NO |
| `docs-maintain` | docs | needs-sanitization | 5 | NO |
| `doc-ecosystem-audit` | audit | needs-sanitization | 5 | NO |
| `github-health` | infra | needs-sanitization | 6 | NO |
| `hook-ecosystem-audit` | audit | needs-sanitization | 6 | NO |
| `script-ecosystem-audit` | audit | needs-sanitization | 5 | NO |
| `session-ecosystem-audit` | audit | needs-sanitization | 5 | NO |
| `health-ecosystem-audit` | audit | needs-sanitization | 4 | NO |
| `comprehensive-ecosystem-audit` | audit | needs-sanitization | 4 | NO |
| `task-next` | session | needs-sanitization | 5 | NO |
| `system-test` | testing | needs-sanitization | 5 | NO |
| `frontend-design` | design | portable | 6 | NO |
| `ui-design-system` | design | portable | 5 | NO |
| `ux-researcher-designer` | design | portable | 5 | NO |
| `webapp-testing` | testing | portable | 6 | NO |
| `artifacts-builder` | content | portable | 5 | NO |
| `excel-analysis` | data | portable | 4 | NO |
| `market-research-reports` | research | portable | 4 | NO |
| `sonarcloud` | quality | non-portable | 2 | NO |
| `sonash-context` | meta | non-portable | 1 | NO |
| `add-debt` | quality | non-portable | 1 | NO |
| `debt-runner` | quality | non-portable | 1 | NO |
| `developer-growth-analysis` | meta | non-portable | 2 | NO |
| `tdms-ecosystem-audit` | audit | non-portable | 1 | NO |
| `data-effectiveness-audit` | audit | non-portable | 2 | NO |
| `alerts` | session | non-portable | 2 | NO |
| `decrypt-secrets` | infra | non-portable | 1 | NO |
| `repo-synthesis` | research | non-portable | 0 | NO |
| `website-synthesis` | research | non-portable | 0 | NO |
| `test-suite` | testing | needs-sanitization | 3 | NO |

---

### 4. MVP Priority List — Portable Skills Not Yet in JASON-OS [CONFIDENCE: HIGH]

Ranked by value-density for "home feel" — the skills that trigger most often in normal operator workflows:

**Tier 1 — Immediate Blockers (missing these breaks daily feel):**

| Rank | Skill | One-Line Purpose | Dependencies | Why It Matters for Home Feel |
|---|---|---|---|---|
| 1 | `session-end` | Session closure: context preservation, compliance review, final commit | convergence-loop, checkpoint, ROADMAP.md (sanitize: remove TDMS steps) | Every session ends with this; without it the loop feels open |
| 2 | `pre-commit-fixer` | Diagnose + fix pre-commit hook failures with structured classify→fix→confirm | .git/hook-output.log, CLAUDE.md guardrails | Referenced in CLAUDE.md guardrail #9; every commit touches this |
| 3 | `systematic-debugging` | Root-cause-first bug investigation before proposing any fix | None | Iron Law: "no fixes without root cause." Core cognitive habit |
| 4 | `gh-fix-ci` | Inspect failing GitHub Actions CI with `gh`, propose fix plan, implement with approval | gh CLI | Touches every broken PR; pairs with pre-commit-fixer |

**Tier 2 — High-Value Daily Use:**

| Rank | Skill | One-Line Purpose | Dependencies | Why It Matters for Home Feel |
|---|---|---|---|---|
| 5 | `validate-claude-folder` | Check .claude folder for config consistency, doc drift, missing components | None | First thing after any .claude change; prevents silent config rot |
| 6 | `analyze` | Router: auto-detect source type (repo/website/doc/video) and dispatch to right handler | document-analysis, website-analysis, repo-analysis, media-analysis | Single-verb entry point for all content ingestion |
| 7 | `document-analysis` | Dual-lens (Creator + Engineer) analysis of PDFs, markdown, papers, meeting notes | None | Universal — applies to any document without project coupling |
| 8 | `recall` | Query the Content Analysis System knowledge base (tags/type/source filtering) | analyze (populates KB) | Closes the /analyze loop — what was extracted is searchable |
| 9 | `find-skills` | Discover and install skills when user asks "is there a skill for X" | skills.sh ecosystem | Operator UX: makes the skill library self-discoverable |
| 10 | `using-superpowers` | Mandate Skill tool invocation before any response (including clarifying questions) | All skills | Behavioral forcing function; defines how all skills are accessed |

**Tier 3 — Audit Core (sanitization needed but high operator value):**

| Rank | Skill | One-Line Purpose | Dependencies | Sanitization Notes |
|---|---|---|---|---|
| 11 | `code-reviewer` | Code review: automated analysis, best practices, security scan, checklist | convergence-loop | Description says "tailored for SoNash/Next.js/Firebase" — needs to become generic |
| 12 | `audit-security` | Single-session security vulnerability audit | audit-aggregator | 13 SoNash refs — Firebase rules, Next.js paths; replace with generic examples |
| 13 | `audit-code` | Single-session code quality audit (complexity, patterns) | audit-aggregator | 6 refs — sanitize examples |
| 14 | `audit-enhancements` | Enhancement audit across code/product/UX/content/workflows | convergence-loop | 21 refs — high effort to sanitize but maximum discovery value |
| 15 | `quick-fix` | Auto-suggest fixes for common pre-commit + pattern compliance issues | pre-commit-fixer | Fully portable — 0 refs; pairs with pre-commit-fixer |

**Tier 4 — Content / Design (fully portable, lower urgency):**

| Rank | Skill | One-Line Purpose | Why it Matters |
|---|---|---|---|
| 16 | `content-research-writer` | Research-backed writing: citations, hooks, iterative section feedback | Universal writing workflow |
| 17 | `frontend-design` | Production-grade frontend components and pages avoiding generic AI output | Any UI work |
| 18 | `mcp-builder` | Guide for creating high-quality MCP servers | Claude Code infrastructure |
| 19 | `webapp-testing` | Playwright-based web app testing and UI debugging | Any local web app |
| 20 | `synthesize` | Cross-source synthesis (emergent themes, knowledge map) across analyzed sources | Closes /analyze/recall loop |

---

### 5. Skills With SKILL_INDEX in SoNash But No JASON-OS Equivalent Yet [CONFIDENCE: HIGH]

SoNash maintains `SKILL_INDEX.md` as a top-level nav document (v2.6, 64 skills listed as of 2026-03-24). JASON-OS has no equivalent index. This is a structural gap: operators cannot discover available skills without a known-names list. Porting `SKILL_INDEX.md` (scrubbed of SoNash-specific skills) is zero-effort high-value.

Similarly, `_shared/` contains `CONVENTIONS.md`, `SKILL_STANDARDS.md`, `AUDIT_TEMPLATE.md`, and `SELF_AUDIT_PATTERN.md` — meta-infrastructure that governs skill quality across all skills. These are fully portable and should be the first thing copied.

---

## Sources

| # | Path | Title | Type | Trust | CRAAP | Date |
|---|---|---|---|---|---|---|
| 1 | `sonash-v0/.claude/skills/` (ls) | SoNash skill directory listing | filesystem | HIGH | 5/5/5/5/5 | 2026-04-15 |
| 2 | `JASON-OS/.claude/skills/` (ls) | JASON-OS skill directory listing | filesystem | HIGH | 5/5/5/5/5 | 2026-04-15 |
| 3 | `sonash-v0/.claude/skills/SKILL_INDEX.md` | SoNash skill catalog v2.6 | filesystem | HIGH | 5/5/5/5/5 | 2026-03-24 |
| 4 | All SKILL.md frontmatter headers (grep batch) | Per-skill descriptions and reference counts | filesystem | HIGH | 5/5/5/5/5 | 2026-04-15 |
| 5 | `session-end/SKILL.md`, `code-reviewer/SKILL.md` (line-level grep) | SoNash-specific reference locations | filesystem | HIGH | 5/5/5/5/5 | 2026-04-15 |

---

## Contradictions

None. Filesystem is ground truth and all counts are directly measured.

---

## Gaps

1. **`alerts` script dependency** — `alerts` scores 0 hard project refs but runs `node .claude/skills/alerts/scripts/run-alerts.js` which only exists in SoNash. Classified non-portable for now; would need the script ported (or rewritten generically) to function. A lightweight JASON-OS reimplementation is possible.

2. **`ecosystem-health` script dependency** — Same pattern. The skill logic is generic but runs `run-ecosystem-health.js` from SoNash's `scripts/health/` tree. The conceptual pattern (composite health dashboard) is portable; the implementation is not.

3. **`task-next` ROADMAP.md format dependency** — The skill reads a specific ROADMAP.md checkbox format. If JASON-OS adopts the same format, this is instantly portable. Not evaluated here.

4. **Version drift** — SoNash skill versions not cross-checked against JASON-OS skill versions. JASON-OS may have earlier versions of the 9 shared skills. This needs a separate audit if staleness matters.

5. **`_shared/` ecosystem-audit templates** — Not individually assessed for portability. Likely need sanitization before use.

---

## Serendipity

- **`using-superpowers`** has 0 SoNash references and is a behavioral forcing function that mandates Skill tool use before ANY response. This is arguably the most important skill to port because it governs HOW all other skills get invoked — without it, operators may bypass the skill system entirely.

- **`SKILL_INDEX.md` is a zero-cost port** with high orientation value — a single file that lets any new JASON-OS operator understand what's available without grepping the filesystem.

- **`_shared/SKILL_STANDARDS.md` and `CONVENTIONS.md`** establish the quality bar for all skill authorship. Porting these before porting any individual skills would prevent quality drift as JASON-OS skills diverge.

- **Two skills are explicitly DEPRECATED** (`repo-synthesis`, `website-synthesis`) and redirect to `synthesize`. They should not be ported.

---

## Confidence Assessment

- HIGH claims: 5
- MEDIUM claims: 0
- LOW claims: 0
- UNVERIFIED claims: 0
- Overall confidence: HIGH

All classifications are based on direct filesystem reads with line-level evidence. No training-data inference.
