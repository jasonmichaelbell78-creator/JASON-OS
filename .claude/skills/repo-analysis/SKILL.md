---
name: repo-analysis
description: >-
  Dual-lens repo analysis: Creator View (knowledge, insights, home-repo
  comparison) + Engineer View (health, security, process). Two user-invokable
  depths (Standard / Deep); Quick Scan is triage-only. Link mining for curated
  lists. Fit separation via dual scoring lenses. Outputs to
  .research/analysis/<repo-slug>/.
---

<!-- prettier-ignore-start -->
**Document Version:** 1.0
**Last Updated:** 2026-04-25
**Status:** ACTIVE
<!-- prettier-ignore-end -->

**Shared conventions:** See `.claude/skills/shared/CONVENTIONS.md`

# Repo Analysis

Dual-lens analysis of external GitHub repositories. **Creator View** surfaces
what the repo understands, how it compares to your work, and where you should be
challenged. **Engineer View** assesses health, security, process, and adoption
fitness. Both views are always produced; Creator View comes first.

## Warm-up (shown at invocation)

Before any work begins, display:

```
/repo-analysis <target>
  depth:         <quick | standard | deep>  (default: standard)
  phases:        PHASE N of M  (M = 9 Standard, 10 Deep, 1 Quick)
  est. time:     Standard ~8-15 min | Deep ~20-30 min | Quick <30s
  output:        .research/analysis/<slug>/
  prior feedback: {replay per CONVENTIONS §18 if prior state file exists}
```

## Routing Guide

| You want to…                             | Use this                |
| ---------------------------------------- | ----------------------- |
| Analyze one external GitHub repo         | `/repo-analysis` (here) |
| Research a domain or technology broadly  | `/deep-research`        |
| Explore design space before planning     | `/brainstorm`           |

## Critical Rules (MUST follow)

1. **Standard is the default user depth.** Full artifact set: clone + repomix
   - dimension wave + Deep Read + Content Eval + Creator View + Engineer View
   - Value Map + Coverage Audit + Tag Suggestion + Retro + Routing Menu. Deep
     adds the History Wave. **Quick Scan (`--depth=quick`) is triage state, not
     a peer user tier** — Standard and Deep are the user-invokable depths.
2. **Write-to-disk-first.** Every phase writes its output file before
   proceeding. Orchestrator verifies file existence, not return values.
3. **Bands over numbers.** Display categorical bands with score in parens.
4. **No silent skips.** After every SHOULD step, verify the expected output
   exists. If missing: retry once with mitigation, then report to user.
5. **Home repo guard.** If target matches
   `jasonmichaelbell78-creator/JASON-OS`, error with explanation: home-repo
   audit is not yet ported to JASON-OS — analyze a different repo, or run
   home-repo introspection manually until a dedicated audit skill lands.
6. **Rate limit safety.** Check `gh api rate_limit` before every API batch.
   Abort if `remaining < 200`.
7. **State file on every phase transition.** Long analyses WILL hit compaction.
8. **Creator View is mandatory** for Standard/Deep. Quick Scan includes a
   lightweight creator lens. The creator lens captures what the repo KNOWS, not
   just its health.
9. **Conversational, not clinical.** Creator View MUST be written in
   conversational prose. Anti-goal: must NOT read like a technical manual.
10. **Coverage Audit is hard-gated; relevance-based skips are FORBIDDEN.**
    Coverage decisions are user-locked scope authority. The skill MUST present
    every deferred item to the user. Skip reasons MUST be budget-based (file
    size, time pressure user signaled, content demonstrably out of scope per
    the repo's own framing). "Low relevance to home repo" / "we don't use this
    technology" / "doesn't transfer" / "out of scope for our work" is NEVER a
    valid skip reason — relevance is a POST-READ judgment that belongs in
    value-map AFTER reading the artifact, not a PRE-READ filter. The whole
    point of analyzing external repos is to surface things the home repo
    doesn't already have; pre-read relevance filters defeat that purpose.
    Exception: if Coverage Audit identifies zero deferred items, skip the user
    prompt silently — the gate only fires when there is something to decide.

## When to Use

- User invokes `/repo-analysis` with a GitHub URL
- Evaluate an external repo for adoption, learning, or inspiration
- Understand what a repo knows or teaches
- Structured health report for a dependency decision
- Triage of multiple candidates (Quick Scan each, then promote to Standard)

## When NOT to Use

- Domain / technology research → `/deep-research`
- Quick dependency check → `gh api` directly
- Home repo audit → not yet ported to JASON-OS; manual introspection until a dedicated audit skill lands

> See [REFERENCE.md](./REFERENCE.md) for dimension catalog, tool stack, output
> schemas, absence patterns, Creator View specification (§14), process details
> (§15), and full guard rails (§9).

## Input

**Argument:** `/repo-analysis <github-url>`

**Flags:** `--depth=standard` (default) | `--depth=quick` | `--depth=deep` |
`--lens=adoption|creator` (override auto-detected primary lens)

**Output:** `.research/analysis/<repo-slug>/` — analysis.json (unified schema
v1.0, validated by `scripts/lib/analysis-schema.js`), findings.jsonl,
value-map.json, creator-view.md, summary.md, deep-read.md,
coverage-audit.jsonl. Handler-specific: repomix-output.txt (gitignored),
trends.jsonl (re-analysis comparison).

**Schema contract:** analysis.json MUST validate against the unified Zod schema
in `scripts/lib/analysis-schema.js`. See CONVENTIONS.md §12.

---

## Process Overview

Standard (default) and Deep share the main pipeline; Quick is standalone triage.
There is no interactive gate between Quick and Standard/Deep — depth is picked
up-front via the `--depth` flag.

**Standard flow (M=9):**

```
VALIDATE    Guards         -> Home repo? Archived? Rate limits? Fork? Prior feedback replay (§18)?
PHASE 1 of 9  Clone+Repomix   -> Blobless clone, generate repomix IMMEDIATELY, verify
PHASE 2 of 9  Dimension Wave  -> Inline (<20 files) or agents (large repos)
PHASE 2b of 9 Deep Read       -> Read internal artifacts beyond code
PHASE 3.5 of 9 Content Eval   -> Evaluate embedded content (links, APIs, refs) — BEFORE Creator View
PHASE 4 of 9   Creator View   -> Load home context + Deep Read + Content Eval, compare, challenge
PHASE 5 of 9   Engineer View  -> Merge dimensions, compute bands, dual-lens scoring
PHASE 6 of 9   Value Map      -> Pattern / knowledge / architecture-pattern / design-principle / workflow-pattern / tool candidates (per analysis-schema.js)
PHASE 6b of 9  Coverage Audit -> Scan for unexplored content (interactive)
PHASE 6c of 9  Tag Suggestion -> Per shared/TAG_SUGGESTION.md
SELF-AUDIT + ROUTING
```

**Deep flow (M=10):** inserts `PHASE 3 of 10 History Wave` (12-month temporal
analysis) between Phase 2b and Phase 3.5.

**Quick flow (M=1):**

```
VALIDATE   Guards       -> Home repo? Archived? Rate limits? Fork? Prior feedback?
PHASE 0 of 1 Quick Scan -> API-only, <30s, 18 dimensions + lightweight creator lens
ROUTING                 -> Queue for Standard | Extract | Done
```

---

## Quick Scan (Phase 0 — `--depth=quick` only)

API-only, under 30 seconds. 18 dimensions (QS-01 through QS-18). See
REFERENCE.md §1.1. Quick is triage, not a user tier.

**Process:** Validate → 3 parallel API batches → classify repo type (§5b) →
compute dimensions → score 6 summary bands → absence pattern classifier → write
artifacts → present inline.

**Lightweight creator lens (MUST):** After computing health dimensions, read the
repo description and README (Contents API, first 200 lines). Write 2-3
sentences: "This repo appears to understand/demonstrate/teach X." Teaser only,
not full Creator View.

<!-- source_tier removed in JASON-OS port (PORT_DECISIONS.md Batch 5 #1). -->
<!-- Replaced by port-priority labels on Knowledge Candidates per Batch 2 #9d. -->


**Done when:** analysis.json exists AND creator lens sentences written.

---

## Clone + Repomix (Phase 1 of M)

1. Clone: `git clone --filter=blob:none --depth=1 <url>` to `/tmp/`
2. **Generate repomix IMMEDIATELY (MUST).** Run
   `mkdir -p ".research/analysis/<repo-slug>" && npx --no-install repomix --compress --output ".research/analysis/<repo-slug>/repomix-output.txt"`
   from the cloned directory. `--no-install` forces use of the
   project-installed version (declared as a dev dep in `package.json`); do
   NOT use `@latest` — that introduces nondeterminism on upstream releases.
   The `mkdir -p` and quoting protect against missing parent dirs and paths
   with spaces. Verify file exists before proceeding. If repomix fails:
   retry once, then report. Do NOT silently skip — repomix is required for
   Extract routing.
3. For Deep: `git fetch --unshallow` or `--shallow-since="1 year ago"`.
4. Update state file.

**Done when:** clone path recorded AND repomix-output.txt exists and is
non-empty.

> See REFERENCE.md §15.1 for LFS, monorepo detection, tool availability.

---

## Dimension Wave (Phase 2 of M)

**Small repos (<20 files):** Analyze inline via Bash. Subagents cannot access
temp directories.

**Large repos (20+ files):** Copy clone to project workspace
(`.research/analysis/<slug>/source/`), spawn up to 4 concurrent agents. Verify
each agent's output file exists after completion; on 0-byte or missing, capture
task-notification result text and write it to the dimension file.

**Dimensions:** Security audit, architecture analysis, documentation quality,
test infrastructure. See REFERENCE.md §1.2.

**Done when:** all dimension files exist and are non-empty, with agent failures
logged (if any).

---

## Deep Read (Phase 2b of M — MUST for Standard/Deep)

A repo's knowledge lives in docs, examples, guides, notebooks, and referenced
resources — not just code. Skipping these is like reviewing a library by looking
at the building and ignoring the books.

**Artifact discovery (MUST):** Scan the clone for:

- Guide/tutorial documents (`guides/`, `docs/`, `examples/`, non-README `*.md`)
- Notebooks (`.ipynb` — methodology, not just code)
- Embedded SKILL.md / instruction files (monorepos with per-module docs)
- SOP/methodology documents (HARNESS.md, CONTRIBUTING.md details, architecture
  docs)
- Referenced external resources (arXiv papers, linked repos, datasets) —
  cataloged for Phase 3.5 evaluation
- **JASON-OS-shape patterns** (PORT_DECISIONS.md Batch 6 #3) — additional
  globs for Claude Code skill collections and JASON-OS-style targets:
  `.planning/<topic>/`, `.claude/skills/<skill>/`, `.research/<topic>/`,
  `MEMORY.md`, `BOOTSTRAP_DEFERRED.md`. Cost negligible — patterns no-op
  when irrelevant.

**Output:** `deep-read.md` listing what was found, read, and cataloged for Phase
3.5. For each read artifact, note knowledge not visible from code.

**Feed forward:** Deep Read findings feed into Creator View (Phase 4). The
Creator View's "What's Relevant To Your Work" section MUST reference specific
internal artifacts, not category-level observations.

**Done when:** deep-read.md exists AND all internal artifacts are cataloged
(read or deferred to Phase 3.5).

---

## History Wave (Phase 3 of 10 — Deep only)

12-month temporal analysis: commit velocity, contributor health, churn hotspots.
See REFERENCE.md §1.4 and §7 for temporal fingerprint spec.

**Done when:** history.jsonl exists AND temporal fingerprint written to
analysis.json.

---

## Content Evaluation (Phase 3.5 of M — MUST for Standard/Deep)

Evaluate the repo's embedded content for specific relevance to home context.
Runs BEFORE Creator View and feeds into it. A repo's value often lives in its
references, not its code.

Applies to ALL repo types (not just curated-list). For curated-list repos,
content IS the repo; for framework/library repos, content is internal docs; for
research repos, content is external papers and datasets.

Writes `content-eval.jsonl` (or `mined-links.jsonl` for curated-list) with one
entry per evaluated item:
`{category, name, url, relevance, applicability, home_connection}`. This output
feeds Creator View §2.

**Done when:** content-eval.jsonl (or mined-links.jsonl) exists AND every item
has a relevance rating AND the "feed to Creator View §2" handoff is ready.

> **Full detail** — depth tiers, structured-metadata filtering, fetch failure
> handling, per-type evaluation rubrics — see REFERENCE.md §15.4.

---

## Creator View (Phase 4 of M — MUST for Standard/Deep)

The primary analytical output. Written in conversational prose, not tables.
Informed by THREE upstream inputs: home repo context, Deep Read artifacts (Phase
2b), and Content Eval results (Phase 3.5). Do not write Creator View until Phase
3.5 completes.

**Home repo context loading (MUST):** `SESSION_CONTEXT.md`, `ROADMAP.md`,
`CLAUDE.md`, `.claude/skills/`, MEMORY.md entries. See REFERENCE.md §14.2.

**6 MUST-produce sections** (Section 2b required only for product repos):

1. What This Repo Understands (+ Blindspots)
2. What's Relevant To Your Work
   - 2b. Use-As-Is Verdict (product repos only —
     full-mirror/experimental-subset/cherry-pick/don't-port-from)
3. Where Your Approach Differs (Ahead / Different / Behind)
4. The Challenge
5. Knowledge Candidates (port-now / port-when-needed / note-only)
6. What's Worth Avoiding

Write output to `creator-view.md`. **Self-verify:** re-read generated Creator
View; verify each home repo claim references something that exists.

**Done when:** creator-view.md exists AND all MUST sections written AND Section
2 references specific items from Deep Read + Content Eval.

> **Full specification** — style guide, section prompts, fit-badge derivation,
> anti-pattern rules — see REFERENCE.md §14.

---

## Engineer View (Phase 5 of M)

Health tables, scoring bands, absence patterns, adoption assessment. 6 summary
dimensions: Security, Reliability, Maintainability, Documentation, Process,
Velocity. Adoption verdict labels:
full-mirror/experimental-subset/cherry-pick/don't-port-from.

Two scoring lenses computed (adoption + creator); both shown, primary marked.
Override with `--lens`. See REFERENCE.md §4.

**Done when:** engineer-view.md OR summary.md contains all 6 bands + absence
pattern verdict + adoption classification.

---

## Value Map (Phase 6 of M)

Generate `value-map.json` with the candidate types defined by the analysis
schema (`scripts/lib/analysis-schema.js` `candidateTypeEnum`). JASON-OS port
prunes `content` and `anti-pattern` per `PORT_DECISIONS.md` Batch 2 #6 and
#10; the schema enforces this. Output that includes those types fails Zod
validation in self-audit.

The six valid candidate types in JASON-OS v0.1:

- **`pattern`** — code, architecture, or tooling to extract.
- **`knowledge`** — understanding, methodology, insights to learn (E0–E1).
- **`architecture-pattern`** — higher-level structural pattern (multi-module,
  cross-system).
- **`design-principle`** — operating principle the repo embodies (e.g.,
  format-longevity, two-tier separation).
- **`workflow-pattern`** — process / discipline / writing-pattern (e.g.,
  rule-why-apply feedback format, dual-mode docs).
- **`tool`** — concrete tool/utility worth knowing about.

All six use the same ranking fields (novelty, effort, relevance). Optional
`url` for any candidate. Knowledge candidates typically use E0–E1.

**Anti-pattern observations** (cautionary lessons from Creator View §6) do
NOT become candidates in JASON-OS v0.1 — they live inside `creator-view.md`
§6 only. The schema does not carry them.

**Content references** from `content-eval.jsonl` (e.g., specific tutorials,
APIs, guides, papers) feed Creator View §2 "What's Relevant To Your Work"
prose; they do not promote to candidates as a separate type.

**Scope-explosion prompt:** For curated-list repos with **>100 entries**,
prompt:
`"Curated list has N entries. Evaluate all / top 50 by signal / custom scope?"`.
Soft user-confirmation; never hard-block.

**Done when:** value-map.json exists AND candidates conform to the
`candidateTypeEnum` (validation enforced by self-audit Step 2).

---

## Coverage Audit (Phase 6b of M — MUST for Standard/Deep)

After all artifacts are written, scan for content that exists in the repo but
was NOT analyzed. The safety net that catches edge cases.

**Hard-gated user prompt (per Critical Rule 10).** If any items were deferred
during the main passes, the skill MUST present them to the user with the
proposed skip reason for each, and wait for an explicit user decision per item
(or a blanket "analyze all" / "skip the budget-based ones / read the rest").
Default-skip is FORBIDDEN when items are present. The only silent path is when
Coverage Audit finds zero deferred items.

**Skip-reason discipline.** Skip reasons MUST be budget-based, never
relevance-based. Acceptable: "file is 50K+ lines / would blow time budget,"
"identical to a sibling already read," "binary / generated artifact." Not
acceptable: "we don't use this technology," "low expected relevance to home
repo," "doesn't transfer to our stack." The whole point of analyzing external
repos is to surface things the home repo doesn't already have.

Record user decision in `coverage-audit.jsonl` — never silently discard.

**Done when:** coverage-audit.jsonl exists AND every item has a `user_decision`
field (`analyze` / `skip`) or `status: "analyzed"` AND no skip reason contains
relevance-language (verified by Self-Audit check 11).

> **Full detail** — categories scanned, output format, re-analysis triggering —
> see REFERENCE.md §15.5.

---

## Tag Suggestion (Phase 6c of M — MUST for Standard/Deep)

Follow the canonical protocol in
[`.claude/skills/shared/TAG_SUGGESTION.md`](../shared/TAG_SUGGESTION.md). Per
CONVENTIONS §14: at least 3 semantic tags per entry, 8 categories, no upper
bound.

**Signal sources for repo-analysis**: `creator-view.md`, entry `notes`,
`engineer-view.md`, `mined-links.jsonl`, top dependencies from repomix output.

**Done when:** user-approved tags written to `analysis.json.tags`.

---

## Delegation & Defaults

At every interactive gate, a default applies if the user does not choose. Record
the default explicitly in state so self-audit can verify.

| Gate                             | Default                                     |
| -------------------------------- | ------------------------------------------- |
| `--depth` unspecified            | `standard`                                  |
| Coverage Audit unanswered        | **BLOCK — present each item to user** (per Critical Rule 10; default-skip is forbidden when items are present; silent only when zero items deferred) |
| Tag Suggestion unanswered        | **never auto-approve** — block with prompt  |
| Scope-explosion prompt           | `top 50 by signal`                          |
| Routing menu unanswered          | `7. Done` (cleanup + invocation track)      |
| Prior Feedback Replay (CONV §18) | `continue unchanged` (logged as shown)      |

Auto-approve is forbidden for Tag Suggestion — tags require explicit user
judgment (CONVENTIONS §14.6).

---

## Per-Phase Artifact Gate (MUST)

After every phase, verify the output file exists and is non-empty before
proceeding. If a Write is rejected by a hook (security hook false positive on
analysis prose), immediately retry via Bash/Python heredoc.

**Verification:**
`[ -s ".research/analysis/<slug>/<artifact>" ] && echo PASS || echo FAIL`

---

## Guard Rails (top 5)

1. **Rate limit safety** — `gh api rate_limit` before every API batch; abort if
   `remaining < 200`.
2. **Home repo guard** — target matches
   `jasonmichaelbell78-creator/JASON-OS` → error with explanation: home-repo
   audit not yet ported to JASON-OS; analyze a different repo or use manual
   introspection until a dedicated audit skill lands.
3. **Large repo safety** — >5000 files or >500MB clone → confirm with user
   before proceeding.
4. **Fork detection** — archive + fork + low stars → flag as low-signal before
   Deep.
5. **Write-rejection bypass** — hook-rejected prose writes → retry via
   Bash/Python, never silently skip.

> **Full guard catalog** — LFS, monorepo, clone safety, framework detection,
> error handling — see REFERENCE.md §9.

---

## Self-Audit (MUST, before routing)

Run minimum floor per CONVENTIONS §8 plus domain checks:

1. Artifact presence (analysis.json, findings.jsonl, value-map.json,
   creator-view.md, summary.md, deep-read.md, coverage-audit.jsonl)
2. Schema contract — analysis.json validates
3. Completeness — all ran phases produced output
4. Schema drift — `skillVersion` matches expected
5. Regression check — compare finding count delta vs prior analysis
6. REFERENCE.md contract — structure matches
7. Tags populated — `analysis.json.tags` non-empty (user-approved)
8. Coverage audit decisions — every item has `user_decision` or `analyzed`
9. Phase ordering — state file `phases_completed` shows
   `phase-3.5-content-eval` before `phase-4-creator-view`, `phase-6c-tags`
   before `self-audit`
10. Prior feedback replay — `prior_feedback_shown: true` if prior state existed
    (CONVENTIONS §18)
11. **Coverage Audit relevance-skip check (per Critical Rule 10).** Scan
    `coverage-audit.jsonl` for skip reasons containing relevance-language —
    "low relevance", "doesn't apply", "we don't use", "out of scope",
    "doesn't transfer", "not applicable to home", "low expected relevance".
    Any match = REQUIRES_USER_REVIEW. Block routing until each flagged item
    is either re-classified with a budget-based reason or moved to
    `analyze` and the artifact actually read.

Report failures to user before routing.

---

## Routing Menu

Presented after Standard or Deep. 7 options:

| Option              | Action                                                                                                                                |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| 1. Extract value    | Load repomix + value-map. Present candidates.                                                                                         |
| 2. Deep-plan this   | Inject analysis as research context.                                                                                                  |
| 3. Save to memory   | Persist key findings as project memory.                                                                                               |
| 4. Adoption verdict | Full WR-01 through WR-06 assessment.                                                                                                  |
| 5. Explore insights | Deeper conversation about Creator View.                                                                                               |
| 6. Done             | Cleanup, confirm artifacts, track invocation.                                                                                         |
| 7. Promote to /port | `/port not yet built — analysis output saved to .research/analysis/<slug>/, run /port manually when available`. Stub errors helpfully. |

---

## State File & Resume

State file: `.claude/state/repo-analysis.<repo-slug>.state.json`

Update after every phase. On re-invocation: offer Resume/Re-run/Compare. See
REFERENCE.md §8 for schema.

## Compaction Resilience

Artifacts as checkpoints: analysis.json, findings.jsonl, summary.md,
value-map.json, dimension files all persist independently. State file enables
phase-level resume.

## Integration

- **Upstream:** `/deep-research`, `/brainstorm`
- **Downstream:** `/deep-plan`, `/port` (stub — see Routing Menu option 7),
  project memory
- **Neighbors:** dimension agents
- **Cross-skill contract:** MUST preserve cross-skill placeholder fields on
  `analysis.json` when writing — these are set by sibling skills (which do not
  yet exist) and must not be dropped by handler re-runs. Authoritative list
  lives in `.claude/skills/shared/CONVENTIONS.md` §12: `last_extracted_at` (set
  by `/port`), `last_ported_to` (set by `/port`), `last_sync_back_at` (set by
  `/sync-back`), `last_synced_at` (set by `/context-sync`).
- **References:** [REFERENCE.md](./REFERENCE.md), [ARCHIVE.md](./ARCHIVE.md),
  [shared/TAG_SUGGESTION.md](../shared/TAG_SUGGESTION.md)

## Retro & Prior Feedback Replay

**Retro (per CONVENTIONS §10):** Before presenting the routing menu, ask: "What
worked well? What would you change next time?" Save to `process_feedback` in the
state file. Optional structured dimensions: `worked_well`, `would_change`,
`longest_phase`, `signal_quality`.

**Prior Feedback Replay (per CONVENTIONS §18):** On re-invocation for the same
target, replay prior `process_feedback` during VALIDATE and ask whether to
adjust approach. Log `prior_feedback_shown: true` in the new state file.

**Invocation tracking** — on Done routing, append a single JSONL row to
`.claude/state/invocations.jsonl` via `safeAppendFileSync` from
`scripts/lib/safe-fs.js` (JASON-OS-native; replaces the SoNash
`scripts/reviews/write-invocation.ts` mechanic per PORT_DECISIONS.md
Batch 6 #7):

```js
const path = require("node:path");
const { safeAppendFileSync } = require("./scripts/lib/safe-fs.js");

const row = {
  timestamp: new Date().toISOString(),
  skill: "repo-analysis",
  target: TARGET_REPO,           // e.g. "owner/name"
  depth: DEPTH,                   // "quick" | "standard" | "deep"
  success: true,
  decisions_count: DECISION_COUNT,
  candidates_count: CANDIDATE_COUNT,
};

safeAppendFileSync(
  path.join(".claude", "state", "invocations.jsonl"),
  JSON.stringify(row) + "\n"
);
```

Any future analytics tool can consume the JSONL stream incrementally; the
file is git-tracked (state-pattern) and survives session boundaries.

---

_v1.1 | 2026-04-27 | Coverage Audit hard-gate + relevance-skip prohibition
(Critical Rule 10) + self-audit check 11. Surfaced by Session 23 smoke-test
of `jdpolasky/ai-chief-of-staff` — relevance-based skips collapsed the
Coverage Audit safety net. SKILL.md hardens the gate so future runs cannot
default-skip on relevance grounds._

## Version History

| Version | Date       | Description                                                                                |
| ------- | ---------- | ------------------------------------------------------------------------------------------ |
| 1.0     | 2026-04-25 | Initial port from SoNash repo-analysis v5.0 (PORT_DECISIONS.md disposition applied).       |
| 1.1     | 2026-04-27 | Coverage Audit hard-gate + relevance-skip prohibition (Critical Rule 10, self-audit 11).  |
