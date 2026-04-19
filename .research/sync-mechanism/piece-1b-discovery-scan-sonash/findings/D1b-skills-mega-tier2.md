# D1b — Skills Mega Tier 2: 4 Ecosystem Audits + Alerts

**Agent:** D1b
**Profile:** codebase
**Date:** 2026-04-18
**Sub-questions addressed:** Inventory of 5 SoNash mega-skills:
doc-ecosystem-audit, skill-ecosystem-audit, market-research-reports,
health-ecosystem-audit, alerts

---

## Overview of Each Skill

### 1. doc-ecosystem-audit (232 KB total)

16-category documentation health diagnostic across 5 weighted domains:

- D1 Index & Registry Health (20%)
- D2 Link & Reference Integrity (25%)
- D3 Content Quality & Compliance (20%)
- D4 Generation Pipeline Health (20%)
- D5 Coverage & Completeness (15%)

6-phase workflow: Run & Parse -> Dashboard -> Walkthrough -> Summary -> Trend
Report -> Self-Audit. SKILL.md (12471 bytes) is a thin orchestration shell —
all shared logic delegated to `.claude/skills/_shared/ecosystem-audit/` (5
shared module files: CRITICAL_RULES.md, COMPACTION_GUARD.md,
FINDING_WALKTHROUGH.md, SUMMARY_AND_TRENDS.md, CLOSURE_AND_GUARDRAILS.md).

Key file layout: 24 files total — entry-point script, 5 checker modules, 6 lib
modules, 4 top-level tests, 6 checker-level tests (in checkers/__tests__/), 1
lib property test. State files written to `.claude/tmp/` (progress, session
log) and `.claude/state/` (history JSONL). Version 1.1 (2026-03-25, when shared
extraction happened from 1.0 of 2026-02-24).

### 2. skill-ecosystem-audit (230 KB total)

21-category skill ecosystem health diagnostic across 5 weighted domains:

- D1 Structural Compliance (20%)
- D2 Cross-Reference Integrity (25%)
- D3 Coverage & Consistency (20%)
- D4 Staleness & Drift (15%)
- D5 Agent Orchestration Health (20%)

Structurally identical to doc-ecosystem-audit: same 6-phase workflow, same
_shared delegation pattern, same 24-file layout. Two distinguishing features:
(1) extended compaction guard fields `currentDomain` + `domainsCompleted` for
domain-chunked processing, (2) Domain 5 checks team config in
`.claude/settings.json` — the only ecosystem audit that reads settings.json
directly.

Data sources include SKILL_INDEX.md, `.claude/settings.json`,
`docs/agent_docs/FIX_TEMPLATES.md`, and `docs/agent_docs/CODE_PATTERNS.md` —
all SoNash-project-specific paths. SKILL.md is 13392 bytes (largest of the 3
doc/skill/health audit SKILL.mds).

### 3. market-research-reports (213 KB total)

An outlier in this batch — not an ecosystem audit at all. Generates 50+ page
professional market research reports in LaTeX/PDF format, consulting-firm style
(McKinsey/BCG/Gartner). Multi-framework analysis: Porter's Five Forces, PESTLE,
SWOT, TAM/SAM/SOM, BCG Matrix.

9 files total: SKILL.md + structure.md (19348 bytes, serves REFERENCE.md role
under a different name) + 3 references/ MD files (total ~82KB) + 2 LaTeX assets
(template + style package) + FORMATTING_GUIDE.md + generate_market_visuals.py
(Python, not Node.js).

CRITICAL DEPENDENCY PROBLEM: 5 skills are hard-referenced (research-lookup,
scientific-schematics, generate-image, peer-review, citation-management) but
NONE exist anywhere in the SoNash `.claude/skills/` directory. The paths used
(`skills/research-lookup/scripts/...`) use a non-`.claude`-prefixed pattern
suggesting a separate top-level `skills/` directory that either no longer exists
or was never created. This skill cannot function without that external
dependency cluster.

Unique frontmatter: the only skill in this batch with an `allowed-tools` field
(Read, Write, Edit, Bash). No compatibility field.

### 4. health-ecosystem-audit (208 KB total)

26-category health monitoring system diagnostic across 6 weighted domains:

- D1 Checker Infrastructure & Reliability (22%)
- D2 Scoring Pipeline Integrity (18%)
- D3 Data Persistence & Concurrency (20%)
- D4 Consumer Integration & Versioning (18%)
- D5 Coverage & Completeness (12%)
- D6 Mid-Session Alert System (10%)

8-phase workflow — more elaborate than the 6-phase doc/skill pattern. Unique
features: Warm-Up phase with explicit user confirmation gate; Phase 1b Live
Test Execution (runs `npm test`); Phase 8 Closure with invocation tracking via
`scripts/reviews/write-invocation.ts` (TypeScript, invoked via `npx tsx`).

Has REFERENCE.md (14387 bytes) unlike doc/skill-ecosystem-audits. SKILL.md is
only 8897 bytes — thinnest shell of the four, with REFERENCE.md absorbing all
template/schema/benchmark detail. 21 total files: checkers lack their own
`__tests__/` subdirectory — all tests consolidated in `scripts/__tests__/`
(contrast with doc/skill audits which have nested checker test dirs).

Bidirectional coupling with alerts: health-ecosystem-audit Phase 8 appends to
`.claude/state/health-ecosystem-audit-history.jsonl`, which alerts reads to
populate its Test Health category. The two skills are co-dependent at the state
file level.

### 5. alerts (173 KB total)

Lightweight health signal — the smallest skill in this batch (3 files: SKILL.md
10215b, REFERENCE.md 15510b, run-alerts.js 148112b). The mass is inverted:
148KB entry-point script vs 10KB SKILL.md. This is the opposite of the
ecosystem-audit pattern where the script is ~15KB and the skill files carry the
complexity.

Default mode: 18 categories (--limited); full mode: 42 categories (--full).
Called from session-begin with --limited. 7-phase workflow. Key unique features:
suppression management system (`.claude/state/alert-suppressions.json`),
suppression reason validation (15-char minimum), volume spike guard,
delegation protocol for bulk-accept, convergence loop in Phase 5 fix
verification, cross-boundary state sharing with session-begin via
`hook-warnings-ack.json`.

Is explicitly a CONSUMER of the health-ecosystem-audit ecosystem — not an
audit itself. Measures project/codebase health, NOT infrastructure/server
health (explicitly documented). Version 3.1 — most actively maintained skill
in this batch.

---

## Sync Observations Per Skill

### doc-ecosystem-audit

**Portability verdict: sanitize-then-portable.**

The _shared/ecosystem-audit/ module system is the portability key: if JASON-OS
ports the _shared/ modules, the doc-ecosystem-audit SKILL.md follows cheaply.
The blocker is the data sources — DOCUMENTATION_INDEX.md, docs/**/*.md,
AI_WORKFLOW.md, scripts/check-cross-doc-deps.js, and the doc-optimizer skill
are all SoNash-specific. Any port requires either (a) adapting checker scripts
to the target repo's doc structure or (b) treating doc-ecosystem-audit as a
configurable audit where target paths are injected.

State paths (.claude/tmp/, .claude/state/) are portable conventions. TDMS via
/add-debt — add-debt exists in JASON-OS already (D1a confirmed).

**Sync risk:** The 6 checker scripts deep-read SoNash's doc structure. They
need rewriting or significant configuration for each target repo.

### skill-ecosystem-audit

**Portability verdict: sanitize-then-portable.**

The skill-ecosystem-audit is arguably the MOST self-applicable skill in the
batch: it audits skill ecosystems, including potentially JASON-OS's own skills.
However, it hardcodes paths to SKILL_INDEX.md and docs/agent_docs/ which JASON-OS
does not have in its current form.

Domain 5 reads `.claude/settings.json` for team config health — JASON-OS's
settings.json structure may differ from SoNash's. The checker scripts look for
`docs/agent_docs/FIX_TEMPLATES.md` and `CODE_PATTERNS.md` which are
SoNash-specific reference docs not present in JASON-OS.

**Sync priority:** Medium-high — this skill audits JASON-OS's own skill system
once JASON-OS has enough skills to audit, but requires _shared/ first and
SKILL_INDEX.md equivalent.

### market-research-reports

**Portability verdict: sanitize-then-portable (but broken without dependencies).**

The skill content (SKILL.md, structure.md, references/, assets/) is
project-agnostic — market research methodology doesn't depend on SoNash's
codebase. However, the 5 dependency skills (research-lookup, scientific-schematics,
generate-image, peer-review, citation-management) are referenced but absent from
SoNash itself.

**Sync risk: HIGH for missing dependencies.** Do not port without resolving
where those Python-based skills live or whether they need to be created from
scratch. The generate_market_visuals.py script requires a Python environment
with those tools available. LaTeX toolchain (xelatex, bibtex) is a separate
heavy dependency.

**Sync priority:** Low — this is a specialized content creation skill, not
infrastructure. Port only when market research capability is actively needed.

### health-ecosystem-audit

**Portability verdict: sanitize-then-portable.**

The most SoNash-specific audit in the batch: it audits `scripts/health/`
checkers, `data/ecosystem-v2/` JSONL stores, and the `npm test` suite — none
of which exist in JASON-OS currently. The 6 checker scripts (alert-system.js,
checker-infrastructure.js, consumer-integration.js, coverage-completeness.js,
data-persistence.js, scoring-pipeline.js) all target SoNash's health monitoring
infrastructure.

The invocation tracking system (`scripts/reviews/write-invocation.ts`, TypeScript
via npx tsx) is entirely SoNash-specific.

**Sync priority:** Low — this skill's value depends on having a health monitoring
ecosystem to audit. Port only after JASON-OS builds its own health monitoring
infrastructure.

### alerts

**Portability verdict: sanitize-then-portable.**

The concept is highly portable (lightweight health check triggered from
session-begin), but the implementation is tightly coupled to SoNash's state
file ecosystem: `.claude/hook-warnings.json`, `hook-warnings-ack.json`,
`alert-suppressions.json`, `scripts/sync-warnings-ack.js`,
`scripts/health/run-health-check.js`, `health-ecosystem-audit-history.jsonl`.

The 148KB run-alerts.js script contains the full 42-category checker logic
inline — this means the entire health check system is embedded in one file
rather than distributed across checker modules. Porting requires either:
(a) adapting the 42 checker categories to JASON-OS's health signals, or
(b) building a new JASON-OS-specific checker script from scratch.

**Sync priority:** Medium — the session-begin integration pattern is valuable
and the skill design (limited/full modes, suppression management, convergence
loop) is worth porting. But the 148KB script is effectively a complete health
monitoring system that must be rebuilt for JASON-OS's signals.

---

## Cross-Skill Patterns: The 4 Ecosystem Audits

Comparing doc-ecosystem-audit, skill-ecosystem-audit, health-ecosystem-audit,
and (from D1a context) the ecosystem-audit family in general:

### Pattern 1: Shared Module Extraction (v1.1)

Doc and skill ecosystem audits at v1.1 (2026-03-25) underwent a shared
extraction where common protocol was moved to `_shared/ecosystem-audit/`.
Health-ecosystem-audit at v1.0 (2026-03-10) did NOT undergo this extraction —
it uses a REFERENCE.md instead, absorbing what _shared covers for the others.
This suggests health-ecosystem-audit represents the pre-extraction pattern, and
doc/skill represent the post-extraction pattern.

**Implication for sync:** The `_shared/ecosystem-audit/` module is a prerequisite
for doc and skill audits. Health-ecosystem-audit is self-contained (REFERENCE.md
handles what _shared handles for others) but at the cost of redundancy if other
audits were to use it.

### Pattern 2: Script Architecture Contrast

| Skill | Entry-point size | Checker structure | Test layout |
|-------|-----------------|-------------------|-------------|
| doc-ecosystem-audit | 14873b | 5 checkers + checkers/__tests__/ | Nested |
| skill-ecosystem-audit | 15392b | 5 checkers + checkers/__tests__/ | Nested |
| health-ecosystem-audit | 16576b | 6 checkers, NO checker tests | Flat |
| alerts | 148112b | None (monolithic) | N/A |

Doc and skill audits use distributed checker architecture with nested test
directories. Health-ecosystem-audit uses distributed checkers but consolidates
all tests in `scripts/__tests__/`. Alerts is fully monolithic — all 42 checker
categories inside a single 148KB script. The monolithic approach trades
maintainability for deployability (1 file = 1 skill).

### Pattern 3: Shared Lib Files

All 4 ecosystem-audits (doc, skill, health) and alerts share an identical
`scripts/lib/` kit: benchmarks.js, parse-jsonl-line.js, patch-generator.js,
safe-fs.js, scoring.js, state-manager.js. These 6 files appear verbatim (or
near-verbatim) in each skill's directory. This is a copy-not-symlink pattern
— D1a's D6-D12 agents (scripts/) should confirm whether a canonical source
exists in `scripts/lib/` or `scripts/lib-shared/`. The safe-fs.js in each
skill's lib/ parallels `scripts/lib/safe-fs.js` referenced in CLAUDE.md.

**Sync implication:** These lib files are the most portable components — they
should be treated as a shared library, not per-skill copies. JASON-OS already
has `scripts/lib/safe-fs.js` (referenced in CLAUDE.md). The skills copy a
local version to avoid import path complexity — an intentional design choice
or tech debt to resolve.

### Pattern 4: TDMS Debt Integration

All 4 ecosystem audits mandate TDMS entries (via /add-debt) for deferred
findings. This is a hard Critical Rule (#7: "Create TDMS entries (MUST)").
JASON-OS has add-debt skill (D1a confirmed, v0.1-stub). The full TDMS
integration depends on SoNash's debt management system which JASON-OS has only
stubbed.

### Pattern 5: State File Convergence

All ecosystem audits write to `.claude/tmp/` (session progress) and
`.claude/state/` (history JSONL). The naming convention is consistent:
`{skill-name}-progress.json`, `{skill-name}-session-{date}.jsonl`,
`{skill-name}-history.jsonl`. The `.claude/state/` directory shows all 4
history files exist in SoNash (confirmed: doc-ecosystem-audit-history.jsonl,
skill-ecosystem-audit-history.jsonl, health-ecosystem-audit-history.jsonl in
`.claude/state/`).

### Pattern 6: Domain Weights Are Skill-Specific

Each audit has different domain weights reflecting its priorities:
- doc-ecosystem-audit: Link integrity heaviest (D2=25%)
- skill-ecosystem-audit: Cross-reference integrity heaviest (D2=25%)
- health-ecosystem-audit: Checker infrastructure heaviest (D1=22%), 6 domains total

This means the checker/scoring scripts are NOT interchangeable even though the
lib/ stack is shared.

---

## How `alerts` Differs from the Audit Pattern

Alerts is architecturally and conceptually distinct from the 3 ecosystem audits:

| Dimension | Ecosystem Audits | Alerts |
|-----------|-----------------|--------|
| Role | OWNER (audits its domain) | CONSUMER (reads health data) |
| Script size | ~15KB | 148KB |
| Checker distribution | 5-6 separate .js files | All inline in run-alerts.js |
| Test files | 10-11 per skill | 0 |
| REFERENCE.md | Only health has one | Yes (15510b) |
| Session integration | Standalone invocation | Called from session-begin |
| State complexity | Progress + history | Progress + suppressions + baseline + history + ack |
| Version history | 1.0-1.1 only | 3.1 (most evolved) |
| Category count | 16-26 | 18 (limited) / 42 (full) |
| Suppression system | None | Full suppression with reason validation |

The core conceptual difference: ecosystem audits are DEEP periodic diagnostic
tools run when something seems wrong or as a health check ritual. Alerts is a
LIGHTWEIGHT always-on signal integrated into session startup. The ecosystem
audits produce detailed per-category findings with patch suggestions. Alerts
produces actionable triage decisions with suppression management.

The monolithic script pattern in alerts reflects its different deployment context:
it needs to run fast, be invoked programmatically from session-begin, and
contain all necessary logic in one file for reliability. The ecosystem audits
can afford distributed architecture because they're long-running interactive
sessions.

---

## Learnings for Methodology

### 1. `_shared/` Modules Are Invisible to Per-Skill Scans

The `_shared/ecosystem-audit/` directory is NOT within any individual skill's
directory. A scan of `doc-ecosystem-audit/` or `skill-ecosystem-audit/` finds
references to `_shared/` but not the files themselves. D-agents scoping to
individual skills MUST check for `_shared/` references and either:
(a) include `_shared/` in their scope, or
(b) flag it explicitly for a separate `_shared/`-focused agent.

This batch D1b scope did not include `_shared/ecosystem-audit/` — its 6 files
(CRITICAL_RULES.md, COMPACTION_GUARD.md, FINDING_WALKTHROUGH.md,
SUMMARY_AND_TRENDS.md, CLOSURE_AND_GUARDRAILS.md, README.md) need their own
JSONL records. Recommend: assign `_shared/` to a dedicated D-agent or expand
a future D1x agent's scope to include it.

### 2. Monolithic vs Distributed Script Pattern Creates Classification Challenge

Alerts' 148KB run-alerts.js is functionally equivalent to an ecosystem audit
PLUS all its checker scripts, but packaged as a single file. The
`active_scripts` field captures this correctly but `component_units` loses the
sub-module structure. For monolithic scripts, consider noting the embedded
category count or estimated internal module count in `notes`.

### 3. Dependency Skills That Don't Exist Are a Critical Finding Category

market-research-reports references 5 skills that do not exist in the SoNash
`.claude/skills/` directory. The JSONL `dependencies` field captures the names
but the `[MISSING]` annotation is in `notes`. Future schema iterations should
consider a `missing_dependencies` array as a first-class field, separate from
the `dependencies` array, to make broken dependency detection automatable.

### 4. The `structure.md` vs `REFERENCE.md` Naming Ambiguity

market-research-reports uses `structure.md` where other skills use `REFERENCE.md`.
The SCHEMA_SPEC field `has_reference_md` is boolean — it cannot represent the
`structure.md` case. For this record, `has_reference_md: false` and
`reference_layout: subdirectory` captures the file structure (references/ subdir
contains companion docs), but the semantic role of `structure.md` as a
"reference-equivalent" is in notes only. Recommend: add `companion_docs` array
field to skill schema, distinct from `has_reference_md` boolean, listing all
companion doc filenames.

### 5. Python Skills Are Structurally Different from Node.js Skills

market-research-reports has a Python script (`generate_market_visuals.py`) while
all other skills in this batch use Node.js. The `module_system` field is CJS/ESM/none
— it doesn't cover Python. The SCHEMA_SPEC scripts section should include a
`language` field for skill scripts (parallel to the tool `language` field in 3F).
For now: captured `language: python` in notes.

### 6. LaTeX Toolchain Is an Implicit Heavy Dependency

The market-research-reports skill requires xelatex and bibtex but these don't
appear in `external_refs` in any obvious way — they're only in the SKILL.md
workflow steps. The `external_refs` field should capture CLI toolchain deps even
when they're embedded in bash commands rather than explicit dependency declarations.

### 7. Invocation Tracking via TypeScript Is a Cross-Skill Pattern

health-ecosystem-audit Phase 8 uses `npx tsx scripts/reviews/write-invocation.ts`.
This TypeScript-based invocation registry is NOT captured in the skills' own
dependency graph — it's a SoNash-specific shared infrastructure. Any port of
health-ecosystem-audit (or any skill using this pattern) needs to either adapt
the invocation tracking or remove that phase. This pattern likely appears in
other ecosystem audits too — worth flagging for future D1c-e agents.

### 8. Scope Sizing: 5 Large Skills Was Correct, But Time-Consuming

Each of these 5 skills has 10-24 files and 170-230KB on disk. The scope was
right-sized for one agent run, though health-ecosystem-audit's REFERENCE.md
required careful partial reading to extract category structure without full
deep-read. Future D1x agents with similarly large skills should budget for
REFERENCE.md partial reads even when the rule says "SKILL.md + REFERENCE.md
body only" — sometimes the body is essential for accurate classification.

---

## Gaps and Missing References

### Missing Dependency Skills (market-research-reports)

These 5 skills are referenced in market-research-reports SKILL.md but do NOT
exist anywhere in the SoNash repository's `.claude/skills/` directory or any
other discoverable location:

- `skills/research-lookup/` (Python skill)
- `skills/scientific-schematics/` (Python skill)
- `skills/generate-image/` (Python skill)
- `skills/peer-review/` (skill)
- `skills/citation-management/` (skill)

The path prefix `skills/` (without `.claude/`) suggests these may have been
designed for a separate top-level `skills/` directory that was never created,
has been removed, or exists in a different branch/worktree. These are BLOCKING
dependencies — market-research-reports cannot function without them.

### `_shared/ecosystem-audit/` Not in D1b Scope

The 6 files in `.claude/skills/_shared/ecosystem-audit/` are critical
dependencies for doc-ecosystem-audit and skill-ecosystem-audit but were not
assigned to D1b. They need JSONL records. Assign to D1c-e or a dedicated
`_shared/` agent.

### Full `_shared/` Tree

Beyond `ecosystem-audit/`, `_shared/` contains 4 more files
(AUDIT_TEMPLATE.md, SELF_AUDIT_PATTERN.md, SKILL_STANDARDS.md, TAG_SUGGESTION.md).
These are not in D1b scope.

### alerts: 42-Category Schema Not Fully Enumerated

The full list of 42 alert categories (18 limited + 24 full) is in
REFERENCE.md and the 148KB run-alerts.js but not read deeply here per the
"metadata + SKILL.md + REFERENCE.md body only" rule for large skills. The
synthesizer may want to know the category list for cross-referencing with
health-ecosystem-audit's 26 categories and understanding overlap.

### invocation tracking pattern scope

The `scripts/reviews/write-invocation.ts` invocation tracking pattern appears
in health-ecosystem-audit but likely appears in other ecosystem audits and
skills as well. This cross-skill pattern needs a dedicated tracking mechanism —
not captured by any existing D1x scope.

### doc-ecosystem-audit: doc-optimizer skill dependency

doc-ecosystem-audit Domain 4 checks the doc-optimizer pipeline
(`.claude/skills/doc-optimizer/`). Existence of this skill was not verified
in this scan. If doc-optimizer does not exist in JASON-OS, Domain 4 scores
will degrade. Needs confirmation.

---

## Confidence Assessment

- HIGH claims: file counts, byte sizes, directory structure (verified from
  filesystem directly)
- HIGH claims: dependency skill absence (verified via ls on all referenced paths)
- HIGH claims: module system (CJS — verified via require() in script headers,
  confirmed no package.json type field in SoNash root)
- MEDIUM claims: portability classification (inferred from data sources and path
  patterns; full checker script reads would be needed to confirm all SoNash-specific
  hardcoding)
- MEDIUM claims: market-research-reports dependency skills location theory
  (inferred from path patterns; no definitive source found)
- LOW claims: invocation tracking pattern frequency across other skills (not
  checked in this pass)
