# G5 — Navigation & Skill Infrastructure (Gap Pursuit)

**Gap type:** scope-gap | missing-sub-question | verification-gap
**Profile used:** codebase
**Confidence:** HIGH (all items verified against filesystem ground truth)

## Summary

Six infrastructure gaps were investigated across JASON-OS's skill and navigation
layers. The most actionable findings: `/add-debt` should be replaced with a
minimal markdown stub (not a full TDMS port) and the Phase 5 routing logic
preserved; three SoNash navigation documents are portably useful but heavily
SoNash-specific and require JASON-OS-tailored rewrites rather than copies;
`research-plan-team.md` exists in SoNash but was not needed for the 18-agent
run just completed and only earns its keep when deep-research feeds directly
into deep-plan in the same session; EXTRACTIONS.md is a 343-candidate scripted
system that has no value at 1 completed session but should be seeded manually
at 3-5 sessions; `/pre-commit-fixer` is largely portable with one
SoNash-specific table to trim; and `.nvmrc` is a one-line fix that JASON-OS
simply lacks.

---

## Detailed Findings

### Item G7: /add-debt Routing Dead-End

**Gap type:** missing-sub-question / verification-gap
**Confidence:** HIGH

#### What exists in JASON-OS

The deep-research SKILL.md Phase 5 menu (line 332-333) reads:

```
If metadata.json `hasDebtCandidates: true`, present: "Research identified N
debt candidates. Route to `/add-debt`? [Y/review/skip]"
```

The `hasDebtCandidates` flag is set in `metadata.json` under
`consumerHints.hasDebtCandidates` (REFERENCE.md line 535). There is no skill
that populates this flag — the synthesizer agent sets it directly in the JSON
when it identifies claims that belong in a debt tracker rather than in the
research output. The flag is a boolean; N is inferred from the claim list.

Source: `.claude/skills/deep-research/SKILL.md:332-333`,
`.claude/skills/deep-research/REFERENCE.md:532-538`

#### What `/add-debt` does in SoNash

SoNash has a full `/add-debt` skill (SKILL.md v2.0, last updated 2026-03-20)
at `.claude/skills/add-debt/SKILL.md`. It writes items to
`docs/technical-debt/MASTER_DEBT.jsonl` — a TDMS (Technical Debt Management
System) pipeline backed by `scripts/debt/intake-audit.js`. The skill handles
two workflows: PR-deferred debt (keyed by PR number) and manual ad-hoc debt
discovery. Both write to a canonical `.jsonl` schema with fields: file, line,
title, severity (S0-S3), category, source ID, reason.

This is entirely SoNash-specific. JASON-OS has no TDMS, no `MASTER_DEBT.jsonl`,
no `scripts/debt/` directory.

Source: `sonash-v0/.claude/skills/add-debt/SKILL.md:1-60`

#### Recommendation: minimal stub, not full TDMS port

**Remove the Phase 5 routing** is the wrong fix. The `hasDebtCandidates`
flag is useful: when research surfaces items that need tracking (broken tooling,
known gaps, deferred decisions), surfacing them at Phase 5 is the right
behavior. Removing the option removes signal.

**Port the full TDMS** is premature. JASON-OS has no defined stack, no
`MASTER_DEBT.jsonl` schema, and no debt workflow yet. Porting 200+ lines of
SoNash debt infrastructure into a stack-TBD project creates SoNash-in-a-
trench-coat coupling (per SQ-1).

**Recommended fix:** Create a minimal stub skill at
`.claude/skills/add-debt/SKILL.md`. The stub's only job:

1. Accept one or more debt items (description, severity, location)
2. Append them as markdown rows to `.planning/DEBT_LOG.md`
3. Confirm with the user and exit

No JSONL, no intake script, no schema beyond: `| Date | Item | Severity | Location | Status |`.
Estimated effort: 30-45 minutes, ~60-line SKILL.md. The Phase 5 routing
continues to work. When JASON-OS eventually grows a TDMS, the stub is replaced
rather than wired.

**Claims:**
- **[C-G5-01]** JASON-OS deep-research SKILL.md references `/add-debt` at
  Phase 5 but the skill does not exist in JASON-OS. Every research session
  surfaces a dead-end routing option. (confidence: HIGH)
- **[C-G5-02]** SoNash's `/add-debt` writes to `MASTER_DEBT.jsonl` via a
  `scripts/debt/intake-audit.js` pipeline — fully SoNash-TDMS-specific, not
  directly portable. (confidence: HIGH)
- **[C-G5-03]** A minimal stub writing to `.planning/DEBT_LOG.md` is the
  right bridge fix: preserves Phase 5 signal, avoids premature TDMS coupling,
  estimated 30-45 min effort. (confidence: HIGH)

---

### Item G9: Navigation Document Ecosystem

**Gap type:** scope-gap
**Confidence:** HIGH

#### SoNash navigation document inventory

| Document | Location | Size | Purpose |
|----------|----------|------|---------|
| `AI_WORKFLOW.md` | `sonash-v0/AI_WORKFLOW.md` | 879 lines | Master session guide. Read first every session. Session startup checklist, documentation hierarchy, standard procedures, navigation map, capability discovery, common scenarios, deliverable audit procedure. |
| `COMMAND_REFERENCE.md` | `sonash-v0/.claude/COMMAND_REFERENCE.md` | 197 lines | Lightweight index of all skills, system commands, agents, MCP servers, hooks (trimmed from 109KB to index-only in AI-5.1). Each entry is one-line with link to source. |
| `SKILL_INDEX.md` | `sonash-v0/.claude/skills/SKILL_INDEX.md` | ~180 lines | 64 skills organized by category with one-line descriptions. Used for capability discovery. |
| `HOOKS.md` | `sonash-v0/.claude/HOOKS.md` | ~155 lines | Catalogs all hook files by event type, purpose, configuration. Documents how to add new hooks. |

Source: heading extractions from each file; line counts from `wc -l`.

#### SoNash-specific content in each document

**AI_WORKFLOW.md** (879 lines): Approximately 60% is SoNash-specific. The
session startup checklist references `GLOBAL_SECURITY_STANDARDS.md`,
`docs/audits/multi-ai/COORDINATOR.md`, `docs/audits/AUDIT_TRACKER.md`, Firebase
health scripts, and 9-category audit thresholds — none of which exist in
JASON-OS. The "Common Scenarios" section mentions CodeRabbit review processing,
which is SoNash-specific. The "Available AI Capabilities" section lists 80
SoNash skills. The deliverable audit procedure (lines ~661-765) is fully
portable as a pattern. Estimated portable fraction: 40%.

**COMMAND_REFERENCE.md** (197 lines): 90% SoNash-specific by content —
references all 80 skills that don't exist in JASON-OS. The structural pattern
(lightweight index table with descriptions, one entry per skill/agent/hook) is
100% portable. JASON-OS has 9 skills; a JASON-OS version would be ~50 lines
initially.

**SKILL_INDEX.md** (~180 lines): SoNash lists 64 skills in 10 categories.
JASON-OS has 9 skills. The format (categories + table with one-line
descriptions + Quick Reference by Task + Maintenance section) is fully
portable. A JASON-OS version would be ~50-60 lines initially.

**HOOKS.md** (~155 lines): The hook catalog (event types, file names, purposes)
is SoNash-specific content. The structural pattern — table per event type,
"How to Add New Hooks" section, version history — is portable. JASON-OS
currently has 4 hooks across 2 event types; a JASON-OS version would be ~60
lines initially.

#### CH-O-003 reframe: PROCESS over catalog

Per the RESEARCH_OUTPUT.md SQ-2 reframe: `AI_WORKFLOW.md` in SoNash is a
session navigation map but also implicitly encodes process: "start with
`/session-begin`, end with `/session-end`, use the decision matrix before
acting, run the deliverable audit at milestone completion." JASON-OS's version
should encode the orchestration pattern (brainstorm → deep-research → deep-plan
→ execute → session-end) explicitly, not just catalog 9 skills.

The "Navigation Map" section in SoNash AI_WORKFLOW.md (lines 365-410) — "I
need to know about..." → which doc to read — is the highest-value portable
section. JASON-OS has no such navigation aid at all.

#### JASON-OS-tailored outlines

**`AI_WORKFLOW.md` (new, ~150 lines)**
- AI Instructions (5 lines: what to do at start / during / end of session)
- Purpose & Scope (10 lines)
- Quick Start (5 lines: `/session-begin` → work → `/session-end`)
- Session Startup Checklist (15 lines: automated checks + manual checks)
- Orchestration Patterns (20 lines: brainstorm → deep-research → deep-plan → execute chain)
- Navigation Map: "I need to know about..." (20 lines: pointer table to other docs)
- Available Capabilities (15 lines: skills list with one-liner each)
- PRE-TASK Checklist (10 lines: mirrors CLAUDE.md §7 trigger table)
- Common Scenarios (30 lines: 3-4 scenarios covering primary workflows)
- Best Practices (10 lines)

Estimated size: 150 lines. SoNash has 879; JASON-OS starts lean, grows as
workflow crystallizes. Effort to write: 1-2 hours.

**`COMMAND_REFERENCE.md` (new, ~50 lines)**
- Preamble (links to source SKILL.md files)
- Skills table (9 rows initially: brainstorm, deep-plan, deep-research, checkpoint, todo, session-begin, session-end — plus stubs as they arrive)
- System Commands section (Claude Code built-ins)
- Hooks section (4 hooks currently active)

Estimated size: 50 lines growing with each skill port. Effort: 30 min.

**`SKILL_INDEX.md` (new, ~60 lines)**
- Same format as SoNash: categories, table, Quick Reference by Task
- Initial categories: Planning & Research (3), Session Management (2+),
  Infrastructure (as hooks arrive)
- Quick Reference by Task: 4-5 scenarios mapping task type to skill

Estimated size: 60 lines. Effort: 20 min. Note: may be redundant with
COMMAND_REFERENCE.md at JASON-OS's current scale — worth deferring until
skill count reaches ~15.

**`HOOKS.md` (new, ~60 lines)**
- Purpose and configuration location
- Active hooks table by event type (4 hooks: 2 SessionStart, 2 PreToolUse)
- How to add new hooks (generic, fully portable from SoNash)
- Planned hooks section (pre-compaction-save, compact-restore, etc.)

Estimated size: 60 lines. Effort: 20 min. High value immediately: there is
currently no doc explaining what JASON-OS's 4 hooks do.

**Claims:**
- **[C-G5-04]** SoNash has 4 navigation documents (AI_WORKFLOW.md 879 lines,
  COMMAND_REFERENCE.md 197 lines, SKILL_INDEX.md ~180 lines, HOOKS.md ~155
  lines). JASON-OS has none. (confidence: HIGH)
- **[C-G5-05]** AI_WORKFLOW.md is ~40% portable by content; COMMAND_REFERENCE.md,
  SKILL_INDEX.md, and HOOKS.md have portable structure but SoNash-specific
  content requiring full rewrites. (confidence: HIGH)
- **[C-G5-06]** JASON-OS-tailored versions of all four documents can be written
  at a combined ~320 lines initial size (vs SoNash's ~1,500 lines). Total
  effort estimate: 3-4 hours. (confidence: MEDIUM — depends on scope decisions)
- **[C-G5-07]** The highest-value single addition is AI_WORKFLOW.md's Navigation
  Map section ("I need to know about..." pointer table) — JASON-OS currently
  has no equivalent at all. (confidence: HIGH)

---

### Item G11: `.claude/teams/` Coordination Layer

**Gap type:** scope-gap
**Confidence:** HIGH

#### What SoNash has

Two team files: `research-plan-team.md` and `audit-review-team.md`.

**`research-plan-team.md`** (290 lines, v1.0, 2026-03-24): Coordinates
deep-research → deep-plan pipeline when a single topic flows through both
phases. Three members: researcher (sonnet, web tools), planner (opus, write
tools), verifier (sonnet, read-only). Spawn trigger: research complexity L/XL
AND plan will drive multi-session implementation AND `/deep-research` is
followed by `/deep-plan` in same session. Uses Claude Code's `TeamCreate` /
`SendMessage` / `TeamDelete` API for direct inter-agent messaging (progressive
handoff, adversarial verification).

**`audit-review-team.md`** (v2.0, 2026-04-14): Coordinates reviewer-fixer loop
for audit contexts where reviewer and fixer benefit from shared context across
multiple targets. Not relevant to current JASON-OS scope.

Source: `sonash-v0/.claude/teams/research-plan-team.md:1-290`

#### Team file format

Plain markdown with YAML-style frontmatter comment block (prettier-ignore
delimiters), then: Purpose, Member Roster table, Why N Members rationale, Token
Cost Justification, Spawn Trigger (with explicit do-NOT cases), Coordination
Model (ASCII diagram + phase-by-phase), Inter-Agent Communication Benefits,
Persistence Model + Lifecycle, Example Invocation (TeamCreate call, task
assignments, teardown), Constraints and Guardrails, Integration Points,
Comparison table (Team vs Subagent).

The format is generic — no SoNash-specific fields. The spawn trigger and
member roster are the only content that varies per team.

#### Was the team needed for the 18-agent run just completed?

No. The 18-agent run (12 D-agents + 4 V-agents + 1 contrarian + 1 OTB) was
executed as parallel subagents dispatched by the orchestrator, not as a team
with inter-agent messaging. This is the pattern the `research-plan-team.md`
explicitly says NOT to use when the team is better: "With subagents, this would
require the lead to relay, doubling latency and losing context." The run worked
because there was no research-to-plan handoff in the same session — it was
pure research with no `/deep-plan` follow-up within the session.

The team earns its keep specifically when: researcher findings need to feed
directly to planner mid-stream (progressive handoff), and planner needs to ask
researcher clarification questions directly (not via relay), and verifier needs
to challenge planner in an adversarial exchange. None of those applied in the
current session.

#### Does JASON-OS need it now?

Not immediately. Spawn criteria require all three: `/deep-research` + `/deep-plan`
on same topic in same session, complexity L/XL, plan drives multi-session
implementation. This combination has not occurred in JASON-OS yet. Given that
JASON-OS's next step is deep-plan on the MVP findings, the combination COULD
occur in the very next session if that plan feeds research questions.

**Recommendation:** Port `research-plan-team.md` as a lightweight adaptation
(remove SoNash agent name refs that don't exist, preserve spawn criteria and
coordination model). Estimated effort: 20-30 min. Skip `audit-review-team.md`
— no audit skills in JASON-OS. Creating `.claude/teams/` directory costs
nothing.

**Claims:**
- **[C-G5-08]** SoNash's `research-plan-team.md` uses `TeamCreate`/`SendMessage`
  API for direct inter-agent messaging, enabling progressive handoff and
  adversarial planner-verifier exchange not possible with subagents alone.
  (confidence: HIGH)
- **[C-G5-09]** The team was not needed for the 18-agent deep-research session
  because no research-to-plan handoff occurred within the session. (confidence: HIGH)
- **[C-G5-10]** The team file format is generic (not SoNash-specific) and
  portable in ~20-30 min. The spawn trigger conditions may be met in the very
  next session if deep-plan follows this research in the same session.
  (confidence: HIGH)

---

### Item G13: `.research/EXTRACTIONS.md` Prior-Art Lookup

**Gap type:** missing-sub-question
**Confidence:** HIGH

#### What SoNash has

`.research/EXTRACTIONS.md` is a 343-candidate, auto-generated document
produced by `scripts/cas/generate-extractions-md.js` from a source file
`extraction-journal.jsonl`. The header reads: "Auto-generated from
`extraction-journal.jsonl` by `scripts/cas/generate-extractions-md.js`. Do not
edit directly — run `node scripts/cas/generate-extractions-md.js` to rebuild."

The schema: one section per source (repo, website, media). Each section is a
table with columns: Candidate, Type (pattern/knowledge/anti-pattern/content),
Decision (defer/investigate/extract/skip), Date, Novelty, Effort (E0-E3),
Relevance, Extracted To, Notes. Decision values: 343 total — 319 defer, 2
investigate, 20 extract, 2 skip.

Source: `sonash-v0/.research/EXTRACTIONS.md:1-50`

The system is backed by a Content Analysis System (CAS) that generates journal
entries during `/analyze` skill execution. SoNash has 33 analyzed sources. The
document is the UI layer over the journal; the journal is the source of truth.

JASON-OS has no EXTRACTIONS.md, no `extraction-journal.jsonl`, no CAS
infrastructure.

Source: `sonash-v0/.research/EXTRACTIONS.md:1-5`

#### How it's maintained

Scripted: `node scripts/cas/generate-extractions-md.js` rebuilds from journal.
The journal is written by the `/analyze` skill on each analysis run. Not manual.

#### Is it worth seeding for JASON-OS now?

No. At 1 completed research session, an EXTRACTIONS.md would have at most a
few rows. The value of prior-art lookup is proportional to the number of past
sessions: it answers "did we already research this?" and "what did we find
last time?" With one session that answer is: "yes, JASON-OS MVP, see
RESEARCH_OUTPUT.md." That lookup doesn't need an index.

The primitive earns its keep at approximately 3-5 sessions when the operator
can no longer remember what each session found. JASON-OS CLAUDE.md §7 currently
references "scan EXTRACTIONS.md for prior art" as a trigger, which is a dead
reference at session #1.

**Recommendation:** Seed a minimal manual EXTRACTIONS.md at session #3, when
there are at least 2 prior research sessions to reference. Format: simple
markdown table, not the auto-generated schema. The CAS scripting is SoNash-
specific and not worth porting at MVP.

The CLAUDE.md §7 trigger referencing EXTRACTIONS.md should be annotated as
"(deferred until session #3)" or the trigger removed until the file exists.

**Claims:**
- **[C-G5-11]** SoNash's EXTRACTIONS.md is script-generated from
  `extraction-journal.jsonl` via the Content Analysis System — the scripting
  infrastructure is SoNash-specific and not portable at MVP. (confidence: HIGH)
- **[C-G5-12]** The EXTRACTIONS.md primitive has near-zero value at 1 session;
  earns its keep at 3-5 sessions. Seeding should be deferred to session #3.
  (confidence: HIGH)
- **[C-G5-13]** CLAUDE.md §7's trigger "scan EXTRACTIONS.md for prior art"
  is a dead reference at JASON-OS session #1 and should be annotated or removed
  until the file exists. (confidence: HIGH)

---

### Item G18: `/pre-commit-fixer` Skill

**Gap type:** verification-gap
**Confidence:** HIGH

#### What SoNash has

SoNash's `/pre-commit-fixer` (SKILL.md v2.0, 2026-03-22) is a 266-line skill
at `.claude/skills/pre-commit-fixer/SKILL.md`. Workflow: 7 steps (Read Hook
Output → Classify Failures → Warm-Up Report → Execute Fixes → Report and
Confirm → Re-commit → Closure). Key properties:

- Language-agnostic process (read log → classify → fix → confirm → recommit)
- Failure category table is SoNash-specific: references ESLint, oxlint, pattern
  compliance, propagation checks, TypeScript errors, `docs/agent_docs/CODE_PATTERNS.md`,
  `scripts/config/hook-checks.json`, `known-debt-baseline.json`
- Inline fix examples reference `npm run docs:index` and TypeScript specifics
- Subagent prompts reference SoNash-specific agents and file paths
- The 7-step structure, guard rails, and confirmation gates are fully portable

Source: `sonash-v0/.claude/skills/pre-commit-fixer/SKILL.md:1-266`

#### Portability audit

| Component | Portable? | Notes |
|-----------|-----------|-------|
| 7-step workflow structure | YES | Fully generic |
| Failure category table | PARTIAL | Categories are generic; detection patterns + fix types are SoNash-specific |
| Guard rails (scope explosion, regression, disengagement) | YES | Fully generic |
| Inline fix examples | PARTIAL | Doc header format generic; `npm run docs:index` SoNash-specific |
| Subagent prompts | PARTIAL | Agent type names portable; CODE_PATTERNS.md path SoNash-specific |
| Integration points | PARTIAL | `hook-runs.jsonl`, `hook-checks.json` don't exist in JASON-OS |
| `/add-debt` routing | YES (once stub exists) | Works once G7 stub is in place |
| Critical Rules 1-6 | YES | All generic guardrails |

Estimated portability: 70% portable as-is, 30% requiring SoNash-specific
reference removal or substitution.

#### JASON-OS adaptation needed

1. Replace the failure category table with a JASON-OS version that lists only
   the 2 active pre-commit hooks (settings-guardian, block-push-to-main) and
   generic categories (lint/format, test, secret scan if added)
2. Remove references to `hook-checks.json`, `known-debt-baseline.json`,
   CODE_PATTERNS.md
3. Replace SoNash inline fix examples with generic equivalents
4. Replace `hook-runs.jsonl` state persistence with a simpler
   `.claude/tmp/pre-commit-fixer-state.json` reference (already in SoNash,
   portable)
5. Keep all guard rails, critical rules, confirmation gates verbatim

**Effort estimate:** 30-40 minutes to create a stripped JASON-OS version. Not
a rewrite — a trim. The 7-step skeleton is the value; all that changes is the
category table and SoNash-specific file references.

**Draft SKILL.md outline for JASON-OS:**
```
---
name: pre-commit-fixer
description: |
  Diagnose and fix pre-commit hook failures with user confirmation at each step.
---
# Pre-Commit Fixer
## Critical Rules (6 rules, verbatim from SoNash)
## When to Use / When NOT to Use
## Workflow
  Step 1: Read Hook Output
  Step 2: Classify Failures
    [Table: 4-6 generic categories + JASON-OS's 2 active hooks]
  Step 3: Warm-Up Report
  Step 4: Execute Fixes
  Step 5: Report and Confirm
  Step 6: Re-commit
  Step 7: Closure
## Guard Rails (verbatim from SoNash)
## Integration (updated paths for JASON-OS)
## Anti-Patterns (verbatim from SoNash)
## Version History
```

Estimated size: ~130 lines (vs SoNash 266 lines).

**Claims:**
- **[C-G5-14]** SoNash `/pre-commit-fixer` is ~70% portable. The 7-step
  workflow, 6 critical rules, and guard rails are language-agnostic. The
  failure category table and integration points are SoNash-specific (ESLint,
  oxlint, TypeScript, SoNash file paths). (confidence: HIGH)
- **[C-G5-15]** A JASON-OS-adapted version can be produced in 30-40 minutes
  at ~130 lines by trimming SoNash-specific table entries and file references.
  (confidence: HIGH)

---

### Item G20: Missing `.nvmrc`

**Gap type:** verification-gap
**Confidence:** HIGH

#### Confirmation

SoNash `.nvmrc` contains: `22`
JASON-OS has no `.nvmrc` file.
SoNash has no `ensure-fnm.sh` in its `scripts/` directory — the reference in
the gap description may be from an older version or a different project.

Source: `sonash-v0/.nvmrc` (1 line, value: `22`); confirmed absence in
`jason-os/.nvmrc` via filesystem check.

#### Recommendation

Create `.nvmrc` at repo root with content `22`. This is a one-line file.

On Windows with fnm: `fnm use` reads `.nvmrc` automatically. On macOS/Linux
with nvm: `nvm use` reads it. The file has no downside and pins Node version
for any developer (or CI) running the repo.

JASON-OS currently has no `package.json` or scripts, so no Node tooling is
active — but the scripts directory exists (`scripts/lib/sanitize-error.cjs`,
`scripts/lib/safe-fs.cjs`) and future hooks will require Node. Pinning now
prevents the "what Node version?" question later.

**No `ensure-fnm.sh` is needed.** SoNash doesn't have one. The session-start
hook can reference Node version as a health check, but that's a separate item
from the `.nvmrc` pin.

**Exact file contents:**
```
22
```

Path: `C:\Users\jason\Workspace\dev-projects\jason-os\.nvmrc`

**Claims:**
- **[C-G5-16]** SoNash pins Node 22 via a single-line `.nvmrc` containing `22`.
  JASON-OS has no `.nvmrc`. (confidence: HIGH)
- **[C-G5-17]** No `ensure-fnm.sh` exists in SoNash — the pairing mentioned
  in the gap description is not present in the source repo. `.nvmrc` alone is
  sufficient. (confidence: HIGH)
- **[C-G5-18]** Creating `.nvmrc` with value `22` is a one-line fix with no
  downside and prevents Node version ambiguity as JASON-OS's scripts layer
  grows. (confidence: HIGH)

---

## Gaps

The following items remain open after this investigation:

**G7 partial:** The exact shape of the `hasDebtCandidates: true` setting
mechanism — specifically, which synthesizer agent in the deep-research pipeline
is responsible for setting it and what heuristics it uses — was not investigated
(REFERENCE.md Section 16-17 was not read). This matters for understanding
whether the flag will ever fire in JASON-OS sessions. Low priority: the stub
fix is correct regardless.

**G9 partial:** The AI_WORKFLOW.md "deliverable audit procedure" section
(lines 661-765) was not fully read. It may contain a portable quality gate
pattern worth extracting into JASON-OS's version independently. Low priority
at MVP.

**G11 partial:** The `audit-review-team.md` v2.0 content was only sampled
(first 30 lines). Not relevant to current JASON-OS scope.

---

## Serendipity

**COMMAND_REFERENCE.md was trimmed from 109KB to 197 lines in SoNash AI-5.1.**
This is instructive for JASON-OS: start thin (index format, link to source
SKILL.md), never let the reference doc grow to 109KB by hosting full content.
The index pattern is the right default.

**`research-plan-team.md` uses opus for the planner only** (per SoNash
Decision #18: "lean opus for high-stakes output"). Researcher and verifier run
sonnet. This is a token-cost optimization that JASON-OS should carry into any
team files it creates.

**The `add-debt` skill in SoNash explicitly routes pre-existing errors found
during `/pre-commit-fixer` to debt tracking.** This creates a closed loop:
pre-commit failure → classify → pre-existing errors → `/add-debt`. Once JASON-OS
has both stubs, this loop works. The two items (G7 and G18) are coupled and
should be ported together.

**EXTRACTIONS.md auto-generation from `extraction-journal.jsonl`** demonstrates
a principle applicable to JASON-OS's research index: even at session #1, writing
a minimal `extraction-journal.jsonl` entry for the JASON-OS MVP research session
would give the auto-gen script something to work with when it eventually gets
ported. This is a 5-minute manual seed, not a system port.

---

## Claims Summary

| Claim | Summary | Confidence |
|-------|---------|------------|
| C-G5-01 | `/add-debt` dead-end exists in deep-research Phase 5 | HIGH |
| C-G5-02 | SoNash `/add-debt` is TDMS-coupled, not portable directly | HIGH |
| C-G5-03 | Minimal stub writing to `.planning/DEBT_LOG.md` is correct bridge fix | HIGH |
| C-G5-04 | JASON-OS has none of the 4 SoNash navigation documents | HIGH |
| C-G5-05 | AI_WORKFLOW.md ~40% portable; other 3 docs require full rewrites | HIGH |
| C-G5-06 | Combined ~320-line JASON-OS versions achievable in 3-4 hours | MEDIUM |
| C-G5-07 | AI_WORKFLOW.md Navigation Map is highest-value single addition | HIGH |
| C-G5-08 | `research-plan-team.md` enables progressive handoff not possible with subagents | HIGH |
| C-G5-09 | Team not needed for completed 18-agent session (no research-plan handoff) | HIGH |
| C-G5-10 | Team file portable in 20-30 min; may be needed in next session | HIGH |
| C-G5-11 | EXTRACTIONS.md auto-generation is SoNash-CAS-specific, not portable at MVP | HIGH |
| C-G5-12 | EXTRACTIONS.md earns its keep at 3-5 sessions; defer seeding to session #3 | HIGH |
| C-G5-13 | CLAUDE.md §7 EXTRACTIONS.md trigger is a dead reference at session #1 | HIGH |
| C-G5-14 | `/pre-commit-fixer` 70% portable; failure category table is SoNash-specific | HIGH |
| C-G5-15 | JASON-OS adaptation in 30-40 min at ~130 lines | HIGH |
| C-G5-16 | SoNash `.nvmrc` = `22`; JASON-OS has none | HIGH |
| C-G5-17 | No `ensure-fnm.sh` in SoNash; `.nvmrc` alone is sufficient | HIGH |
| C-G5-18 | `.nvmrc` with value `22` is a one-line fix with no downside | HIGH |
