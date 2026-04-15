# Findings: SoNash /pr-retro Deep Dive — Learning Loop Closure

**Searcher:** deep-research-searcher
**Profile:** codebase
**Date:** 2026-04-15
**Sub-Question IDs:** D3d

---

## Key Findings

### 1. What pr-retro IS — Complete Skill Overview [CONFIDENCE: HIGH]

`/pr-retro` is a post-merge PR retrospective skill (SKILL.md v4.8, last updated
2026-03-18). It is explicitly on-demand, not automated. Trigger condition: "User
invokes `/pr-retro` AND PR is merged." It is NOT a post-review hook; it is
separate from `/pr-review` (which processes active review feedback) and
`/code-reviewer` (which generates reviews).

**Three invocation modes:**
- `/pr-retro` — Dashboard mode: finds all merged PRs that lack a retro,
  displays table, asks which to process
- `/pr-retro <PR#>` — Single PR retro
- `/pr-retro <PR#> --resume` — Resume from saved state (compaction resilience)

**9-step pipeline:**

| Step | Name | Gate |
|------|------|------|
| 0 | Detect mode | — |
| Dashboard | Missing retro triage | User selects PRs |
| 1 | Deliverable verification (convergence-loop) | MUST (if 3+ commits/files) |
| 2 | Gather review data | MUST |
| 3 | Analyze churn + warm-up | MUST |
| 4 | Interactive findings walkthrough | MUST — one finding at a time |
| 5 | Validate completeness | MUST — 9 mandatory sections |
| 6 | Action item implementation | MUST — BLOCKING HARD GATE |
| 7 | Final verification | MUST |
| 8 | Save to log | MUST |
| 9 | Suppressions + learning + closure | MUST |

**Critical rules (10 of them):** The hardest gate is Critical Rule #10: "MUST
implement accepted action items — retro is blocked until every item is done or
user explicitly says 'defer' or 'create DEBT'. No implicit deferral." This is
the mechanism that makes retro findings materialize as real code changes.

---

### 2. Questions Asked — Interactive Findings Walkthrough [CONFIDENCE: HIGH]

Each finding is presented individually with a structured template (from
REFERENCE.md). Every finding requires:

- **Category** (Ping-Pong, Recurring Pattern, Process Gap, Rejection Analysis,
  Scope Creep, etc.)
- **Evidence** tagged [Observed] or [Inferred]
- **Severity** (High/Medium/Low)
- **Integration field** (which downstream files need updating)
- **Options A/B/C** with rationale
- **Verify command** — MUST be a functional shell command, not a grep
- User decision with progress indicator `[N/M findings | K action items]`

After all findings: "Anything the analysis didn't surface?" — user can inject
additional findings.

The 9 mandatory retro sections that must be covered:
1. Review Cycle Summary
2. Per-Round Breakdown
3. Ping-Pong Chains
4. Rejection Analysis
5. Recurring Patterns
6. Previous Retro Audit + Cross-PR Systemic Analysis
7. Skills/Templates to Update
8. Process Improvements
9. Verdict

---

### 3. Output Destinations — What Gets Written [CONFIDENCE: HIGH]

Four categories of artifact:

**Primary storage — `.claude/state/retros.jsonl`:**
The authoritative JSONL ledger. One record per PR, written by
`scripts/reviews/write-retro-record.ts`. Schema includes: pr, date,
completeness, top_wins, top_misses, process_changes, action_items (per-item
with verify_cmd + status), score (1-10), metrics (total_findings, fix_rate,
pattern_recurrence, hook_health), process_feedback, deliverable_verification.
As of 2026-04-15, retros.jsonl has 71 entries spanning PR #367 through #500.

**Markdown append — `docs/AI_REVIEW_LEARNINGS_LOG.md`:**
Human-readable retro content appended after every completed retro. Older
entries live in `docs/archive/REVIEWS_*.md`.

**State file — `.claude/state/task-pr-retro.state.json`:**
Per-finding decision log for compaction resilience. Updated after every
finding decision, action item approval, and step completion. Includes
`finding_decisions` array with implementation_status and verify_result per item.

**Invocation record — via `scripts/reviews/write-invocation.ts`:**
Written to `.claude/state/` to log that the skill ran (duration, success,
context with PR number).

**Suppression syncs (SHOULD, conditional):**
Items rejected 2+ times trigger suppressions added to `.gemini/styleguide.md`
("Do NOT Flag" section) and mirrored to `.qodo/pr-agent.toml`.

**Sync — `npm run reviews:sync -- --apply`:**
After JSONL write, runs a sync pipeline to propagate retro data to downstream
consumers.

---

### 4. How It Feeds Back — The Learning Loop [CONFIDENCE: HIGH]

This is the core value. pr-retro closes the loop in four distinct mechanisms:

**Mechanism 1: Pattern escalation to CRITICAL.**
REFERENCE.md D7: When a pattern recurs 3+ times across all retros (fuzzy
keyword matching across top_misses, action_items, process_changes), the current
session auto-tags those findings CRITICAL. This forces them to the top of the
implementation queue.

**Mechanism 2: pr-review backward flow.**
pr-review SKILL.md Step 0 reads last 3 retros' `action_items[]` from
retros.jsonl. Any pattern appearing in a current review that matches a prior
retro action item gets auto-elevated to MAJOR severity and flagged as
"REPEAT PATTERN from retro PR #NNN." This is the mechanism by which retro
learnings gate future PRs.

**Mechanism 3: Pattern lifecycle — graduation to automation.**
Known churn patterns progress: Discovered → Confirmed (2+ PRs) → Resolved
(permanent check exists) → Graduated (archived, check in
`check-pattern-compliance.js`). Once graduated, the pattern can never silently
recur — the pre-commit hook will catch it. This is how retro findings become
guardrails at the infrastructure level.

**Mechanism 4: Direct CLAUDE.md / skill updates.**
Cross-skill integration table (REFERENCE.md) maps finding types to specific
target files:
- New automation candidate → `check-pattern-compliance.js`
- New fix template → `FIX_TEMPLATES.md`
- Pre-push check missing → `pr-review SKILL.md` Step 0.5
- Hook override abuse → `override-log.jsonl`
- Systemic issue → TDMS via `/add-debt`

Real examples from retros.jsonl: PR #407 retro (score 4.5, 50% avoidable
rounds, 436 findings, pattern_recurrence 6) generated CRITICAL action to
implement CC pre-push check. That action appeared as verified in the PR #480
bulk retro where "CC check now runs pre-commit" was confirmed. The feedback
loop between retro → pr-review → pre-commit hook was observed in the actual data.

**Mechanism 5: Process feedback field.**
Users can provide free-text feedback on the retro process itself
(`process_feedback` field in JSONL). This feeds into future retro skill
improvements.

---

### 5. Dependencies on SoNash-Specific Systems [CONFIDENCE: HIGH]

BOOTSTRAP_DEFERRED.md lists the deferred reason as "30 hits, plus structural
dependency on `pr-ecosystem-audit`." Full dependency map:

**Hard dependencies (skill won't function without them):**

| Dependency | What it does | Portable? |
|-----------|--------------|-----------|
| `npm run reviews:sync -- --apply` | Syncs JSONL retro records to downstream consumers | No — npm script, SoNash-specific |
| `scripts/reviews/write-retro-record.ts` (TypeScript) | Writes JSONL records with validated schema | Partial — logic portable, but needs TS build |
| `scripts/reviews/write-invocation.ts` | Writes invocation log entry | Partial |
| `docs/AI_REVIEW_LEARNINGS_LOG.md` | Primary markdown log | Portable — just a file |
| `.claude/state/retros.jsonl` | Retro ledger | Portable — just a JSONL file |

**Soft dependencies (SHOULD steps, skill degrades gracefully without them):**

| Dependency | Used for | Portable? |
|-----------|----------|-----------|
| `/pr-ecosystem-audit` | Routing table (mentioned in description and routing header); not called inside the skill steps themselves | No |
| `docs/technical-debt/MASTER_DEBT.jsonl` + `/add-debt` | Creating DEBT entries for systemic issues | No — TDMS not ported |
| `.claude/state/review-metrics.jsonl` | Step 2.4 enrichment (fix_ratio, round count) | Partial — file format is portable |
| `.claude/state/hook-runs.jsonl`, `hook-warnings-log.jsonl`, `override-log.jsonl` | Step 2.4 hook health enrichment | Portable — these files exist in JASON-OS |
| `check-pattern-compliance.js` | Graduation target for known patterns | No — SoNash-specific script |
| `.gemini/styleguide.md`, `.qodo/pr-agent.toml` | Suppression sync targets | No — SoNash uses these reviewers |
| `FIX_TEMPLATES.md` | Fix template library | No — SoNash-specific |
| `SESSION_CONTEXT.md`, `ROADMAP.md` | Claim extraction in Step 1 | No — but only used for deliverable verification |

**TDMS coupling points:**
- Step 2.3: `grep "pr-review" docs/technical-debt/MASTER_DEBT.jsonl`
- Step 6: `/add-debt` for systemic issues (but REFERENCE.md says "DEBT is NOT
  an option unless user explicitly requests it" — it's a user-gated path, not
  mandatory)
- REFERENCE.md verification criteria checks for TDMS entries created
- Session integration notes: `/session-end` verifies TDMS entries created during retro

**pr-ecosystem-audit dependency:**
BOOTSTRAP_DEFERRED.md says "routing table and dashboard features don't function"
without it. Actual SKILL.md examination shows pr-ecosystem-audit appears only in
the routing header at the top (`"Process health" -- /pr-ecosystem-audit`) — it
is a routing alternative, not called internally. The 30 hits in BOOTSTRAP_DEFERRED
refer to the full skill file including REFERENCE.md.

---

### 6. What the Actual retros.jsonl Data Reveals [CONFIDENCE: HIGH]

71 entries, PR #367 through #500. Evolution visible in the data:

- **Early entries (PR #367–394):** All `completeness: "stub"` — backfilled via
  `backfill-reviews.ts`, missing top_wins/top_misses/process_changes. These are
  skeleton records from pre-skill-formalization.
- **First full records (PR #396–397):** First entries with completeness "full",
  scores (7 and 6), action items with verify_cmds.
- **Maturation (bulk retros, 2026-03):** Bulk retros covering 13-17 PRs in one
  session. Action items array with per-item status and functional verify commands.
- **Latest records (PR #480, 500):** Full deliverable_verification field
  populated; action_items showing verified/deferred status.

**Score distribution from full records:** Range 4.5 (PR #407, "50% avoidable
rounds") to 10 (PR #416, zero review rounds). PR #414 scored 9.5 (docs-only,
single round). Average appears to be ~7.5.

**Pattern recurrence tracking works:** PR #480 bulk retro shows
pattern_recurrence: 7 — highest observed. This triggered CC pre-commit check
implementation (verified in same session).

---

## Sources

| # | Path | Type | Trust | Date |
|---|------|------|-------|------|
| 1 | `sonash-v0/.claude/skills/pr-retro/SKILL.md` | Filesystem (T1) | HIGH | 2026-03-18 |
| 2 | `sonash-v0/.claude/skills/pr-retro/REFERENCE.md` | Filesystem (T1) | HIGH | 2026-03-18 |
| 3 | `sonash-v0/.claude/skills/pr-retro/ARCHIVE.md` | Filesystem (T1) | HIGH | 2026-02-24 |
| 4 | `sonash-v0/.claude/state/retros.jsonl` | Filesystem (T1) | HIGH | 2026-04-08 (latest entry) |
| 5 | `sonash-v0/.claude/state/task-pr-retro.state.json` | Filesystem (T1) | HIGH | 2026-03-18 |
| 6 | `JASON-OS/.planning/jason-os/BOOTSTRAP_DEFERRED.md` | Filesystem (T1) | HIGH | 2026-04-15 |
| 7 | `sonash-v0/.claude/skills/pr-review/SKILL.md` (sampled) | Filesystem (T1) | HIGH | 2026-03-18 |

---

## Contradictions

**pr-ecosystem-audit dependency severity.**
BOOTSTRAP_DEFERRED.md says "routing table and dashboard features don't function"
without pr-ecosystem-audit. The actual SKILL.md shows pr-ecosystem-audit appears
only in the routing header, not in any step's procedural content. The "routing
table" referenced may refer to an earlier version of the skill that has since
been refactored. The 9-step pipeline is independently executable. Verdict:
pr-ecosystem-audit is a routing *alternative* (tells users when to prefer it
over pr-retro), not a called dependency. The deferred status is still
appropriate given the 30 sanitization hits, but the functional dependency is
weaker than BOOTSTRAP_DEFERRED.md implies.

**TDMS as "required" vs "user-gated."**
The verification criteria in REFERENCE.md lists "TDMS entries created for all
approved items via `/add-debt`" as a process compliance check. But REFERENCE.md
Implementation Detail explicitly says "DEBT is NOT an option unless the user
explicitly requests it." These are in tension: the verification criteria could
fail if no TDMS entries were created even when that was the right call. In
practice, the retros.jsonl data shows many full-completeness retros with zero
DEBT entries, suggesting TDMS is not enforced in practice.

---

## Gaps

1. The `AI_REVIEW_LEARNINGS_LOG.md` content was not read — it's the markdown
   accumulation of all retro outputs and would show the actual prose format.
   Not critical for spec extraction.

2. The `write-retro-record.ts` source was not read — would confirm exact JSONL
   schema validation rules. The schema is fully documented in REFERENCE.md.

3. How learnings feed back into CLAUDE.md guardrails specifically was not
   directly traceable in code — the connection appears to be manual: retro
   surfaces a pattern, action item is "update CLAUDE.md Section N," and a human
   approves it. There is no automated CLAUDE.md writer.

4. The `pr-ecosystem-audit` SKILL.md was not read — only its existence confirmed.
   Its role relative to pr-retro is unclear beyond the routing header.

---

## Serendipity

**The feedback loop is bidirectional and explicit.**
pr-review reads retros.jsonl (backward flow: retro findings gate future reviews).
pr-retro reads reviews.jsonl (forward flow: review patterns inform retro
analysis). This mutual dependency is documented and intentional — it means
neither skill is fully standalone.

**retros.jsonl is queryable institutional memory.**
71 records, each with score, metrics, action_items with verify_cmds and
implementation status. This is not just documentation — it's a queryable
database. The pattern_recurrence field is computed from ALL prior retros, not
just recent ones. A JASON-OS v0 retro skill that writes to a simple JSONL file
(without the npm sync pipeline) would preserve 80% of this value.

**The "implement before closing" rule (Critical Rule #10) is the key innovation.**
Most retro systems produce recommendations that get filed and forgotten. The
hard gate in Step 6 — "retro is blocked until every item is done or user says
defer" — is what separates pr-retro from a documentation exercise. The retros.jsonl
data confirms this works: action_items with status "complete" dominate later entries.

**Verify command quality is explicitly enforced.**
v4.8 added the requirement that verify commands be functional tests (exit 0/1),
not grep-based string checks. Good/bad examples included in SKILL.md. This is
a lesson that was learned from experience (grep proved inadequate) and
institutionalized as a skill rule.

---

## JASON-OS v0 Proposal

Based on the analysis, a JASON-OS v0 `/pr-retro` that preserves the essential
feel requires:

**What to keep (core value):**
- The 9-step pipeline structure (Steps 0-9)
- Interactive one-finding-at-a-time walkthrough (Critical Rule #2)
- The BLOCKING implementation gate (Critical Rule #10)
- Functional verify commands requirement
- retros.jsonl as the ledger (schema-compatible with SoNash for future migration)
- AI_REVIEW_LEARNINGS_LOG.md markdown append
- compaction state file
- pattern recurrence map from retros.jsonl

**What to stub/defer:**
- `npm run reviews:sync` → stub with a note "sync not yet implemented"
- `write-retro-record.ts` TypeScript build → replace with direct JSON.stringify
  write to retros.jsonl (no TypeScript dependency)
- TDMS / `/add-debt` → drop entirely; replace with "add to SESSION_CONTEXT.md"
  or "create DEBT" as a user-named option
- `.gemini/styleguide.md`, `.qodo/pr-agent.toml` suppression sync → drop
  (SoNash-specific reviewers)
- `check-pattern-compliance.js` graduation target → replace with a note
- pr-ecosystem-audit routing → keep the routing header but note skill is not ported

**Sanitization estimate:**
The BOOTSTRAP_DEFERRED.md says "30 hits." Given that TDMS coupling is
user-gated (not in the main flow), and pr-ecosystem-audit is routing-only, the
real blocking hits are likely the `npm run reviews:sync` call (Step 8) and the
TypeScript build invocation. A targeted rewrite of Step 8 plus suppression
targets in Step 9 would cover the majority. Estimated: 45-60 minutes, not the
"requires pr-ecosystem-audit" blocker originally assessed.

---

## Confidence Assessment

- HIGH claims: 6
- MEDIUM claims: 0
- LOW claims: 0
- UNVERIFIED claims: 0
- **Overall confidence: HIGH** — all findings from direct filesystem inspection
  of SKILL.md, REFERENCE.md, ARCHIVE.md, retros.jsonl (71 entries), and
  BOOTSTRAP_DEFERRED.md.
