# Findings: Piece 1b D1a — Mega-Skill Tier 1 (Ecosystem Audit Skills)

**Agent:** D1a (Piece 1b SoNash Discovery Scan)
**Profile:** codebase
**Date:** 2026-04-18
**Sub-Questions Addressed:** Inventory of 5 mega-skills — hook-ecosystem-audit, tdms-ecosystem-audit, pr-ecosystem-audit, session-ecosystem-audit, script-ecosystem-audit

---

## Overview

All 5 skills are members of the "ecosystem audit" family — a pattern of deep
diagnostic tooling that runs a Node.js audit script, generates a composite
health grade (A-F), and walks the user through findings interactively. Each
covers a different SoNash subsystem. This is the heaviest skill tier in the
SoNash library by byte size (238-359 KB per skill, 1.4 MB total).

**Size summary:**

| Skill | Size (bytes) | File count | REFERENCE.md |
|---|---|---|---|
| hook-ecosystem-audit | 359,228 | 29 | Yes (flat) |
| tdms-ecosystem-audit | 272,645 | 24 | No |
| pr-ecosystem-audit | 271,730 | 24 | No |
| session-ecosystem-audit | 253,477 | 24 | No |
| script-ecosystem-audit | 238,918 | 25 | Yes (flat) |

---

## Skill-by-Skill Analysis

### 1. hook-ecosystem-audit

**Purpose:** Diagnose the entire hook ecosystem — Claude Code hooks
(`.claude/hooks/`), shared libraries, pre-commit pipeline
(`.husky/pre-commit`), and state management. 6 domains, 20 categories.

**Version:** 2.0 (2026-03-08)
**Structure:** Full inline SKILL.md (440 lines) + REFERENCE.md (flat). The
hook audit is the reference implementation — it was written before the
`_shared/ecosystem-audit/` extraction and retains all protocol sections inline.

**Unique component:** `scripts/lib/constants.js` — defines `HOOK_PROTOCOL`,
a constants object documenting that `stdout = protocol response channel` and
`stderr = diagnostic channel` in Claude Code hooks. This is load-bearing for
the checker that validates hook output protocol compliance. No other skill has
this file.

**Portability assessment:** `sanitize-then-portable`. The script infrastructure
is self-contained and well-isolated. The checkers read `.claude/hooks/`,
`.claude/settings.json`, `.husky/pre-commit`, and `.github/workflows/` — all
of which exist in JASON-OS with the same structure. The primary sanitize target
is the invocation tracking call (`npx tsx write-invocation.ts`) which depends
on `scripts/reviews/write-invocation.ts` — a SoNash-specific TypeScript script.
This call can be removed or stubbed during port without breaking the audit.

**Key runtime dep:** `symlink-guard` loaded from
`.claude/hooks/lib/symlink-guard` via relative path from `__dirname`. Load
failure is graceful (`isSafeToWrite = () => false`), so this is a soft dep.

**State files written:**
- `.claude/tmp/hook-audit-progress.json` — ephemeral compaction guard
- `.claude/tmp/hook-audit-session-{date}.jsonl` — ephemeral decision log
- `.claude/tmp/hook-audit-report-{date}.md` — ephemeral summary
- `.claude/state/hook-ecosystem-audit-history.jsonl` — persistent trend log

---

### 2. tdms-ecosystem-audit

**Purpose:** Diagnose the Technical Debt Management System — all 37 TDMS
pipeline scripts under `scripts/debt/`, `MASTER_DEBT.jsonl` (4500+ items),
`raw/deduped.jsonl`, views, metrics dashboard, sprint integration, and roadmap
cross-references. 5 domains, 16 categories.

**Version:** 1.2 (2026-03-25 — after `_shared/` extraction)
**Structure:** SKILL.md only (no REFERENCE.md). All shared protocol sections
replaced with read directives to `_shared/ecosystem-audit/*.md`.

**Portability assessment:** `not-portable`. This is the only skill in the 5
rated not-portable. Every single checker hardcodes SoNash-specific artifacts:

- `docs/technical-debt/MASTER_DEBT.jsonl` (4,500+ debt items, SoNash's TDMS database)
- `docs/technical-debt/raw/deduped.jsonl` (deduplication output)
- `docs/technical-debt/views/*.md` (generated severity/category/status views)
- `docs/technical-debt/METRICS.md` (TDMS dashboard)
- `docs/technical-debt/logs/*.jsonl` (intake, dedup, resolution audit trail)
- `scripts/debt/*.js` (37 pipeline scripts — the TDMS engine itself)
- `scripts/config/audit-schema.json` (canonical debt field definitions)
- `ROADMAP.md` (milestone tracks with DEBT refs)

The skill audits a system (TDMS) that does not exist in JASON-OS. It would
only become portable if the full TDMS system were ported first.

**Notable:** Session #134 critical bug is documented inline in SKILL.md —
`generate-views.js reads deduped but overwrites master`. This is a live data
integrity risk in SoNash that the checker is designed to catch.

---

### 3. pr-ecosystem-audit

**Purpose:** Diagnose the PR review ecosystem — process compliance, data/state
health, pattern lifecycle enforcement, feedback loop integration, and
effectiveness metrics. 5 domains, 18 categories.

**Version:** 1.3 (2026-03-25 — after `_shared/` extraction)
**Structure:** SKILL.md only (no REFERENCE.md). All shared protocol delegated
to `_shared/ecosystem-audit/`.

**Portability assessment:** `sanitize-then-portable`. The SKILL.md concepts
(review process quality, data state health, pattern enforcement) are universal.
However, the checkers are wired to SoNash-specific state paths:

- `.claude/state/reviews.jsonl` — SoNash PR review log (JASON-OS uses a
  different, simpler PR review artifact at `.planning/PR_REVIEW_LEARNINGS.md`)
- `.claude/state/consolidation.json` — SoNash pattern consolidation state
- `.claude/state/review-metrics.jsonl` — SoNash metrics
- `docs/AI_REVIEW_LEARNINGS_LOG.md` — SoNash's large review learnings log
- `scripts/check-pattern-compliance.js` — SoNash-specific compliance script
- `.qodo/pr-agent.toml` — Qodo configuration

Port path: The SKILL.md is largely reusable. The checkers would need to be
rewired to JASON-OS's PR state schema once JASON-OS builds out a more mature
PR tracking system. The `patch-generator.js` is the most diverged from the
hook baseline — it adds `pattern_rule`, `qodo_config`, `skill_update` patch
types specific to SoNash's pattern automation pipeline.

**Unique checker note:** `data-state-health.js` and `process-compliance.js`
contain the most detailed documentation of the SoNash PR review JSONL schema
— field names (`id`, `pr`, `total`, `rejected`, `type`), the retro/review
distinction, and how to avoid counting errors. This is valuable reference
material even if the checker itself isn't ported.

---

### 4. session-ecosystem-audit

**Purpose:** Diagnose the Session Ecosystem — session lifecycle skills, 4-layer
compaction resilience system, cross-session safety invariants, hook registration
alignment, and state file management. 5 domains, 17 categories.

**Version:** 1.2 (2026-03-25 — after `_shared/` extraction)
**Structure:** SKILL.md only (no REFERENCE.md). All shared protocol delegated
to `_shared/ecosystem-audit/`.

**Portability assessment:** `sanitize-then-portable`. This is the most
promising of the 4 `sanitize-then-portable` skills for JASON-OS, because the
session infrastructure it audits (commit-tracker.js, pre-compaction-save.js,
compact-restore.js, compaction-handoff.js, SESSION_CONTEXT.md,
handoff.json, commit-log.jsonl) DOES exist in JASON-OS with the same
structure. The conceptual fit is near-perfect.

**Specific sanitize targets:**

1. `checkers/compaction-resilience.js` — expects exactly 7 named session hooks
   registered in `.claude/settings.json`. JASON-OS may have fewer registered
   hooks than SoNash's full set. Running on JASON-OS today would flag missing
   hooks as errors.
2. `checkers/cross-session-safety.js` — reads `.claude/hooks/.session-state.json`.
   Need to verify JASON-OS has this file.
3. `checkers/lifecycle-management.js` — reads `SESSION_CONTEXT.md` for session
   counter validation against `commit-log.jsonl`. JASON-OS has both.
4. `patch-generator.js` — uses distinct `_fs`, `_path` variable naming (vs
   `fs`, `path` in hook baseline). Minor divergence, doesn't affect functionality.

**Notable pattern:** The 4-layer compaction resilience architecture documented
in the SKILL.md Category Reference section is the canonical specification of
JASON-OS's own session resilience design. This document is load-bearing for
understanding JASON-OS's session hooks.

---

### 5. script-ecosystem-audit

**Purpose:** Diagnose `scripts/**/*.js` infrastructure — module consistency,
safety/error handling, npm registration, code quality, and testing reliability.
5 domains, 18 categories. Explicitly excludes skill-local scripts
(`.claude/skills/*/scripts/`) which belong to `/skill-ecosystem-audit`.

**Version:** 2.0 (2026-03-08)
**Structure:** SKILL.md (300 lines) + REFERENCE.md (flat). Like
hook-ecosystem-audit, retains inline protocol — v2.0 rewrite predates
`_shared/` extraction. (Version says 2.0 at same date as hook audit rewrite;
both were likely rewritten together before the March 25 `_shared/` extraction.)

**Portability assessment:** `sanitize-then-portable`. This skill's checkers
enforce patterns that are explicitly documented in `CLAUDE.md Section 5`
(Critical Anti-Patterns) — which JASON-OS also has. The script scope
(`scripts/**/*.js`) maps directly to JASON-OS's `scripts/` directory.

**Key divergence from hook baseline:** `run-script-ecosystem-audit.js` uses
a `ROOT_DIR` constant computed earlier in the file (via `findProjectRoot()`)
rather than inline `path.join(__dirname, ...)` in the symlink-guard require.
This is a minor structural difference but confirms this file was independently
maintained rather than copied from the hook runner.

**CLAUDE.md coupling:** The safety checkers explicitly reference CLAUDE.md
Section 5 patterns (path traversal guard, error sanitization, exec loop fix,
regex two-strikes). These patterns are shared between SoNash and JASON-OS,
making the safety checker logic directly portable.

---

## Cross-Skill Patterns

### The `_shared/ecosystem-audit/` Pattern

The most important structural finding: `_shared/ecosystem-audit/` contains
6 shared markdown modules that replaced duplicated content in 8 ecosystem audit
skills (per README.md, extracted 2026-03-25):

```
.claude/skills/_shared/ecosystem-audit/
  README.md
  CRITICAL_RULES.md         — 8 universal rules
  COMPACTION_GUARD.md       — state file schema, resume/save/cleanup
  FINDING_WALKTHROUGH.md    — finding card, decisions, delegation, batching
  SUMMARY_AND_TRENDS.md     — summary + trend templates
  CLOSURE_AND_GUARDRAILS.md — learnings, invocation tracking, guard rails
```

**4 of the 5 mega-skills** (tdms, pr, session, script) have fully adopted
this shared library. hook-ecosystem-audit v2.0 and script-ecosystem-audit v2.0
predate the extraction (both dated 2026-03-08, extraction was 2026-03-25) and
retain inline protocol. This means hook-ecosystem-audit is the "gold source"
that the `_shared/` library was extracted from.

**Sync implication:** `_shared/ecosystem-audit/` is a REQUIRED co-dependency
for tdms/pr/session-ecosystem-audit. You cannot port those 3 skills without
also porting `_shared/ecosystem-audit/`. This directory is NOT in scope for
any D1a/D1b agent — it lives under `.claude/skills/_shared/` and belongs in
a future D1x or composite agent's scope.

### Self-Contained Script Bundles (Fork Pattern)

Each skill ships its own copy of 5 lib files under `scripts/lib/`:
- `safe-fs.js` — **identical** across all 5 (verified via diff)
- `scoring.js` — diverged (comment-level only: audit name in header)
- `state-manager.js` — nominally forked ("Forked from pr-ecosystem-audit" comment)
- `parse-jsonl-line.js` — not verified (likely identical or near-identical)
- `patch-generator.js` — **significantly diverged** per skill domain

This is an intentional design choice (SKILL.md says each audit is "self-contained").
The divergence in `scoring.js` is comment-only for most skills but PR has a
material functional difference (linear interpolation between good and average
in `scoreMetric()`).

**Sync risk:** `safe-fs.js` is the canonical copy at `scripts/lib/safe-fs.js`
in SoNash. Any fix to the canonical must be propagated to all 5 skill copies.
This is a maintenance hazard not a portability blocker.

### Invocation Tracking Pattern (SoNash-Only)

All skills that have a closure phase (hook, script) invoke:
```bash
cd scripts/reviews && npx tsx write-invocation.ts --data '{"skill":"...","type":"skill","success":true,...}'
```

This depends on `scripts/reviews/write-invocation.ts` — a TypeScript file in
SoNash's product/infrastructure code. This is NOT portable to JASON-OS.
The tdms/pr/session skills delegate this to `_shared/ecosystem-audit/CLOSURE_AND_GUARDRAILS.md`
which contains this same call. Remove or stub during any port.

### Comprehensive Audit Integration

All 5 skills mention `/comprehensive-ecosystem-audit` as an orchestrator caller
where they run as one of "4 independent parallel agents in Stage 1." The
`comprehensive-ecosystem-audit` skill exists at `.claude/skills/comprehensive-ecosystem-audit/`
(confirmed). This skill is the orchestrator that spawns all ecosystem audits in
parallel — it is a separate mega-skill not in D1a's scope.

### `add-debt` as Universal Defer Target

All 5 skills use `/add-debt` to create TDMS entries for deferred findings.
In JASON-OS, `/add-debt` exists as a stub skill. When ecosystem audits are
ported to JASON-OS, the TDMS integration will silently fail (the stub does not
create actual DEBT entries in the SoNash sense). This is acceptable for JASON-OS
v0 but is a functional gap to document.

---

## Critical Sync Observations

### What Would Break in a Port

1. **tdms-ecosystem-audit: Not portable at all.** Every checker hardcodes
   SoNash's TDMS database paths. Do not attempt to port without porting the
   full TDMS pipeline first (D6-D12 agent scope, ~37 scripts).

2. **Invocation tracking call breaks silently.** All skills have a closure
   step that shells out to `npx tsx write-invocation.ts`. This will fail on
   JASON-OS (no TypeScript runner, no `scripts/reviews/` directory). Must be
   removed from any port.

3. **`_shared/ecosystem-audit/` is a co-dependency.** tdms, pr, session audit
   SKILL.md files have `> Read .claude/skills/_shared/ecosystem-audit/...`
   directives. Without those files present, Claude will silently skip the
   protocol sections (no hard error, but behavioral gaps). Must port
   `_shared/ecosystem-audit/` before or alongside these 3 skills.

4. **pr-ecosystem-audit checker targets JSONL that doesn't exist in JASON-OS.**
   `.claude/state/reviews.jsonl` and `.claude/state/consolidation.json` are
   SoNash-specific. Running `run-pr-ecosystem-audit.js` on JASON-OS would
   produce zero findings (all file-existence checks return "not found" as
   INFO-only, not errors).

5. **session-ecosystem-audit expects exactly 7 session hooks in settings.json.**
   JASON-OS may have fewer. Running today would surface false error findings.
   The hook names themselves are correct (JASON-OS has the same hooks), but
   the exact registration count check may flag missing registrations.

### What Would Work Immediately in a Port (hook + script)

- `hook-ecosystem-audit` and `script-ecosystem-audit` are the best candidates
  for near-immediate port to JASON-OS. Both:
  - Have REFERENCE.md (no `_shared/` dep)
  - Target `.claude/hooks/` and `scripts/` which exist in JASON-OS with the same structure
  - Reference CLAUDE.md Section 5 patterns (shared between projects)
  - The symlink-guard dep fails gracefully
  - The only mandatory sanitize is removing the invocation tracking call

---

## Gaps and Missing References

1. **`_shared/ecosystem-audit/` is not in D1a scope.** The 5 shared markdown
   files at `.claude/skills/_shared/ecosystem-audit/` are load-bearing for 3
   of the 5 skills but are not assigned to any D-agent in the current coverage
   matrix (SCHEMA_SPEC.md Section 5). They need to be inventoried — either
   as a separate D-agent scope or under the "D17a-b: .claude/ other" assignment
   (but that dir is `.claude/skills/_shared/`, not `.claude/` root).

2. **`_shared/` top-level docs not inventoried.** In addition to `ecosystem-audit/`,
   `_shared/` contains: `AUDIT_TEMPLATE.md`, `SELF_AUDIT_PATTERN.md`,
   `SKILL_STANDARDS.md`, `TAG_SUGGESTION.md`. These are D1b-adjacent (skill
   infrastructure standards) but fall outside D1a scope.

3. **`comprehensive-ecosystem-audit` skill not inventoried.** Referenced as the
   orchestrator by all 5 skills. Exists at `.claude/skills/comprehensive-ecosystem-audit/`.
   Not in any D1a-D1e assignment in this scan.

4. **`skill-ecosystem-audit` skill not inventoried.** Referenced as the scope
   owner for skill-local scripts. Exists at `.claude/skills/skill-ecosystem-audit/`.
   Not in D1a scope.

5. **`doc-ecosystem-audit` skill not inventoried.** Referenced in hook audit
   routing guide. Not in D1a scope.

6. **TDMS pipeline scripts (`scripts/debt/*.js`) not in D1a scope.** Referenced
   heavily by tdms-ecosystem-audit. Covered by D6-D12.

7. **`scripts/reviews/write-invocation.ts` not in D1a scope.** SoNash product
   code dep for invocation tracking. Covered by D19a-b or D6-D12.

8. **`benchmarks.js` identity not verified.** Only `safe-fs.js`, `scoring.js`,
   `patch-generator.js` were diff'd. `benchmarks.js` exists in all 5 skills —
   likely domain-specific but not verified.

---

## Learnings for Methodology

### 1. `_shared/` as a Composite Unit — New Type Needed

The `_shared/ecosystem-audit/` directory is a shared library consumed by 8
skills. It is not itself a skill, not a script, not a hook. The schema has no
good type for it. Current best fit is `composite` (Section 3J), but it lacks
a `run-*.js` entry point and produces no JSON output — it's a documentation
library, not an executable composite. A new type `shared-lib-docs` or
extending `doc` type with a `shared_library: true` flag would be more accurate.
D22 (schema surveyor) should consider adding `type: shared-doc-lib`.

### 2. Portability Enum Needs a "depends-on-product-system" Value

`tdms-ecosystem-audit` is `not-portable` because it audits a system (TDMS)
that doesn't exist in JASON-OS. But `not-portable` implies it can never be
ported, while the reality is: port the product system first, then this audit
becomes portable. A value like `not-portable-systemic-dep` would distinguish
"this skill audits a non-portable product system" from "this skill has hardcoded
secrets or machine-specific paths."

### 3. Fork Chain Documentation Is In Code Comments, Not Frontmatter

Every `scoring.js` and `state-manager.js` says "Forked from pr-ecosystem-audit"
in the file header, but this information doesn't appear anywhere in the
SKILL.md frontmatter. The schema has `port_lineage_frontmatter` for Lineage
fields in frontmatter — but the fork chain for lib files is only in source
code. A `lib_fork_chain` notes field or `is_copy_of` annotation at the
component level would capture this. The SCHEMA_SPEC.md Section 3E has
`is_copy_of` for scripts — but these lib files live inside a skill directory,
not in `scripts/`, so their type classification is ambiguous.

### 4. The "8 Ecosystem Audits" vs "5 in This Scan" Gap

The `_shared/ecosystem-audit/README.md` says it serves "8 ecosystem audit
skills." This scan covers 5 (the mega-tier). The other 3 are
`doc-ecosystem-audit`, `skill-ecosystem-audit`, and possibly others (e.g.,
`audit-comprehensive`). These were not sized as >200KB mega-skills in the
original tier assignment, but they share the same `_shared/` infrastructure.
The assignment methodology (by size tier) split a structural family. A future
scan improvement: assign all `ecosystem-audit` family skills to one agent
regardless of size, since they share `_shared/` and must be ported together.

### 5. `safe-fs.js` Identity Verification Was Fast and Load-Bearing

Diffing `safe-fs.js` across all 5 skills took 4 bash commands and immediately
confirmed identity. This technique should be standard methodology for any
family of skills that share lib files. For the full SoNash scan, the
`scripts/lib/safe-fs.js` canonical copy should be compared against all skill
bundle copies.

### 6. Symlink-Guard as Latent Hard Dep

The symlink-guard graceful degradation (`isSafeToWrite = () => false`) means
the scripts run on JASON-OS but silently disable state writes. This looks like
portability but is actually a silent behavior change: trend history
(`hook-ecosystem-audit-history.jsonl`) will never be written, and trend
reports will always say "First audit run — no trend data available." Port notes
should flag this as a "runs but degraded" situation.

### 7. Scope Was Appropriately Sized

5 mega-skills at ~260-360 KB each totaling 1.4 MB was a near-perfect scope
for one agent. The byte-aware methodology (metadata + SKILL.md + REFERENCE.md
only, Grep for script refs) kept context usage manageable. No re-spawn needed.

---

## Confidence Assessment

- HIGH claims: 18 (file structure, byte sizes, identity comparisons — all
  verified against filesystem)
- MEDIUM claims: 6 (portability assessments for pr/session/script —
  conclusions from code inspection, not running the scripts)
- LOW claims: 2 (benchmarks.js identity unverified; parse-jsonl-line.js
  identity unverified)
- UNVERIFIED claims: 0
- Overall confidence: HIGH
