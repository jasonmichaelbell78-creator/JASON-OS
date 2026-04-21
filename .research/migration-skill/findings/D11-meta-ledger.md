# FINDINGS — D11-meta-ledger

**Phase 1 D-agent:** D11-meta-ledger
**Sub-question (SQ-D11):** Given D28 (brainstorm ↔ research ↔ plan re-entry is the norm), does the existing `BRAINSTORM_WIP.md` / `RESEARCH_OUTPUT.md` / `PLAN.md` artifact triad provide enough cross-iteration coherence, or is a META-LEDGER needed above it — tracking which-iteration-decided-what with re-entry triggers made explicit?
**Depth:** L1
**Date:** 2026-04-21

---

## Summary

**Recommendation: LIGHTWEIGHT meta-ledger — YES, but as a single thin append-only file (`ITERATION_LEDGER.md`), not a parallel heavyweight artifact system.**

The existing triad is **nearly** enough for linear one-shot flows (and that's what the skills were designed for). It breaks down precisely on the loop-ful flow D28 describes because three specific coherence failures are already visible in the migration-skill artifacts after only **two** iterations. A heavyweight ADR-per-decision system is overkill; a simple append-only ITERATION_LEDGER.md (one row per skill re-entry, capturing trigger, source iteration, decisions touched, status delta) fills the gap at <5% of the cost.

Key numbers:
- 5 precedents cataloged (ADR supersede, RFC-bis, Microsoft Decision Log, Spotify engineering ADRs, TLA+ stepwise refinement)
- 29 decisions already accumulated in BRAINSTORM.md after 2 sessions; D-number provenance maintained but re-entry-vs-original provenance is **not** distinguishable
- 1 confirmed D-number collision in the raw artifact set (session-1 D11 `Dropped direction` in BRAINSTORM_WIP.md line 53 vs. research Q11 "Process meta-ledger" — same number, different semantic axis, no cross-file canonical registry)

---

## Current artifact coherence analysis

### What works in the current triad

**BRAINSTORM.md (crystallized) is clean-enough:** `C:\Users\jbell\.local\bin\JASON-OS\.research\migration-skill\BRAINSTORM.md` organizes D1–D29 under three thematic tables (Skill-shape / Direction+endpoint / Weave+reframe / Process+scope) with a clear "Session 2 additions" sub-header at line 66. Reader can trace which session birthed which decision. This is an implicit-but-working meta-ledger inside the artifact.

**BRAINSTORM_WIP.md is surprisingly clean as a session-ledger.** Line 22-26 (`Reframes through the sessions`) is a five-bullet chronological reframe log — exactly the "decision-evolution narrative" an ADR supersede chain provides. Line 39-76 preserves the D1–D15 / D16–D29 session split. The document **explicitly marks itself SUPERSEDED at the top** (line 3) — the ADR pattern applied correctly.

**Brainstorm SKILL.md has an embryonic meta-ledger pattern:** `C:\Users\jbell\.local\bin\JASON-OS\.claude\skills\brainstorm\SKILL.md:134-136` Phase 0 step 6 (Duplicate check → offer resume/start-fresh/rename). This enforces re-entry awareness but does NOT record re-entry metadata — the skill detects the loop-return situation but has no artifact slot to log it.

**Deep-research has post-challenge re-synthesis:** `C:\Users\jbell\.local\bin\JASON-OS\.claude\skills\deep-research\SKILL.md:291-294` Phase 3.9 "Re-synthesize if >20% of claims changed" is **within-iteration** re-synthesis. Line 328-333 Phase 3.97 "Final Re-Synthesis" mandates an **edit**, not rewrite, of RESEARCH_OUTPUT.md — explicitly preserving prior-state diff. This is the closest existing pattern to a meta-ledger, but it's scoped to one research run, not cross-skill loops.

**Deep-plan DECISIONS.md is already standalone (Critical Rule 5):** `C:\Users\jbell\.local\bin\JASON-OS\.claude\skills\deep-plan\SKILL.md:35, 226` — DECISIONS.md is explicitly not embedded in the plan. This is an ADR-style separation.

### What breaks under D28 loop re-entry

**Three specific failures are already visible after only two iterations:**

1. **D-number collision / namespace overload.** `BRAINSTORM_WIP.md:53` defines D11 = "Dropped direction" (Direction 5 thin wrapper is out). Research question #11 in both `BRAINSTORM.md:134` and `BRAINSTORM_WIP.md:201` is "Process meta-ledger." This sub-question file is literally named "D11-meta-ledger" — so the tag D11 means *two different things* in two different scopes (decision-number vs. research-question-number). A meta-ledger would force a cross-scope registry (e.g., `DEC-11` vs. `RQ-11` vs. `D-AGENT-11`).

2. **Re-entry provenance is implicit.** BRAINSTORM.md line 66 ("Direction + endpoint decisions (Session 2)") groups D16–D19 by session header prose, not by structured field. There is no field per-decision saying "born session N, modified session M, triggered-by: CAS reframe." When the 3rd iteration lands (post-research re-entry, as D28 expects), the narrative prose doesn't scale — you'd need a 4th sub-section header, then a 5th. After 5 loops this is unreadable.

3. **Cross-artifact coherence is narrative-only.** The relationship between `BRAINSTORM.md` D28 ("re-entry is norm") and the 12 research questions in §5 is only explicit inside the prose of §5 and §7. If research-iteration-1 reframes D19 (foreign-repo understanding), which decision is now stale? There's no back-pointer, no "affects:" field on research questions, no "invalidates:" pointer on new decisions. The iteration-bookkeeping is entirely in the author's head.

**Verdict on current triad:** works for 1-2 iterations (the migration-skill is proof); projected to degrade fast at iteration 3+. `BRAINSTORM_WIP.md`'s self-supersede pattern (line 3) is the right instinct but requires manual hand-rolling per iteration and doesn't capture cross-artifact edges.

---

## Precedent catalog

| # | Precedent | URL | Date | Key mechanism |
|---|-----------|-----|------|---------------|
| 1 | **ADR supersede chain** — accepted ADRs never reopened; new ADR supersedes, old one stays as historical record with explicit link. Each decision has status field (proposed/accepted/superseded). | https://adr.github.io/ | Accessed 2026-04-21 (site ongoing since ~2017) | Append-only per-decision files with forward/back supersede pointers. Collection = decision log. |
| 2 | **IETF RFC-bis / Internet-Draft versioning** — published RFCs never modified; "bis" revisions supersede explicitly; Internet-Drafts versioned (e.g., `draft-ietf-netmod-yang-module-versioning-15`); six-month timeout restarts on new draft. | https://datatracker.ietf.org/doc/html/rfc2026 | 1996 (still authoritative); draft versioning draft ongoing 2026 | Monotonic version counter per spec; supersede graph between specs; draft-state vs. final-state distinction. |
| 3 | **Microsoft Engineering Playbook Decision Log** — Markdown table of executive summaries of decisions in ADRs, with status field (proposed/approved/implemented/reversed) for traceability across review cycles. | https://microsoft.github.io/code-with-engineering-playbook/design/design-reviews/decision-log/ | Accessed 2026-04-21 | Table-of-contents meta-document *above* the per-ADR files — the "meta-ledger" pattern exactly. |
| 4 | **Spotify Engineering ADR practice** — one decision per ADR, markdown in repo, supersede via new ADR; ADRs strengthen tooling around decision records in support of agile and iterative/incremental engineering processes. | https://engineering.atspotify.com/2020/04/when-should-i-write-an-architecture-decision-record | 2020-04 | Same as #1 but with explicit "when to write" heuristics — useful for defining re-entry triggers. |
| 5 | **TLA+ stepwise refinement** — Amazon writes prose design doc first, incrementally refines parts into PlusCal/TLA+; TLA models refined by adding detail in prescribed way such that additional detail doesn't break original model. | https://lamport.azurewebsites.net/tla/formal-methods-amazon.pdf | 2014 (Lamport et al.) | "Refinement relation" — new spec is provably a refinement of prior spec; prior spec remains valid. Analog: a 3rd-iteration BRAINSTORM.md must be a refinement of the 2nd, not a rewrite. |

**Bonus (non-cataloged precedent):** Wikipedia / Wikimedia revision history — every edit is an append-only diff with author, timestamp, reason. Closest real-world analog to a zero-friction meta-ledger. Mentioned for completeness, not counted in the 5.

---

## Recommendation

**LIGHTWEIGHT meta-ledger — YES.**

A full ADR-per-decision system (one file per D-number with supersede pointers) is overkill for a skill-design process where decisions cluster thematically and the artifact count is already pushing reader overhead (BRAINSTORM.md is 196 lines). But zero meta-ledger is visibly breaking already (see "D-number collision" above).

**The proposal: one file, append-only, <1 row per ~30 minutes of work.**

File: `.research/<topic-slug>/ITERATION_LEDGER.md` — sits beside BRAINSTORM.md / RESEARCH_OUTPUT.md / PLAN.md in the existing triad. Authored by whichever skill is re-entering (brainstorm / deep-research / deep-plan). Read by all three on re-entry as canonical "what happened before this loop" context.

**Not:** individual ADR files. Not a database. Not a state-machine. One markdown table, appended to on every skill re-entry. Fits the JASON-OS aesthetic of single-file-per-concept ledgers (`BRAINSTORM_WIP.md`, `TRANSCRIPT.md`, `PORT_ANALYSIS.md`).

---

## If YES: proposed schema

### File location & naming
`.research/<topic-slug>/ITERATION_LEDGER.md` (co-located with other research artifacts).

### Header (once, at top)
```
# ITERATION LEDGER — <topic-slug>
Append-only. One row per skill re-entry. Never reorder; never delete rows.
Supersede by appending a new row with a back-pointer, never by editing a prior row.
```

### Row schema (markdown table)

| Field | Type | Required | Purpose |
|-------|------|----------|---------|
| `iter` | monotonic int (1, 2, 3, ...) | Y | Stable handle for cross-references. |
| `date` | ISO-8601 | Y | Chronology. |
| `skill` | enum: brainstorm / deep-research / deep-plan / execute | Y | Which phase of the loop. |
| `trigger` | short prose (1 line) | Y | Why this re-entry. E.g., "research Q5 surfaced unknown idiom-detection primitives — reframe needed" |
| `source-iter` | int or "seed" | Y | Which prior iteration this one responds to. "seed" for iter 1. |
| `touches` | list of decision-IDs (D1, D7, D19...) | Y | Which prior decisions this iteration revisits. Empty = purely additive. |
| `outcome` | enum: new-decisions / reframe / confirm-existing / abandoned | Y | What the iteration produced. |
| `new-ids` | list of fresh IDs (D30, D31, RQ13...) | N | Created by this iteration. |
| `artifact` | file path + git-SHA | Y | Which version of BRAINSTORM.md / RESEARCH_OUTPUT.md / PLAN.md is canonical after this row. |
| `supersedes-row` | iter int | N | If this row fully replaces a prior iter's work. |
| `notes` | free prose, ≤2 lines | N | One-liner context. |

### Example row (how migration-skill iter 1 would look retroactively)

| 1 | 2026-04-20 | brainstorm | "Seed: `/migration` skill design" | seed | — | new-decisions | D1–D15 | `BRAINSTORM_WIP.md` @ session-1 commit | — | Session 1, `/port` name era |
| 2 | 2026-04-20 | brainstorm | "Home-locale re-entry: CAS examination + repo-agnostic reframe" | 1 | D7, D12 | reframe | D16–D29, R1–R4 | `BRAINSTORM.md` @ post-session-2 commit | 1 (in spirit; supersede marker in WIP header) | Name reverted `/port`→`/migration`; reshape/rewrite verdict legend added |

### Re-entry triggers (canonical enum, for the `trigger` column prose starter)

Per D28 plus this research:
- **RESEARCH-SURFACED-REFRAME** — research finding invalidates a brainstorm decision (triggers brainstorm re-entry)
- **PLAN-SURFACED-UNKNOWN** — planning exposes a gap requiring research (triggers research re-entry)
- **EXECUTE-SURFACED-GAP** — execution reveals design flaw (triggers brainstorm or plan re-entry)
- **USER-REDIRECT** — user explicitly asks to revisit (any direction)
- **EXTERNAL-CHANGE** — dependency or context changes (e.g., `/sync` ships and changes foreign-repo story)

Prose column should pick the starter keyword then append specifics.

### Retention policy
- **Never** edit a past row. Append only.
- **Never** reorder. iter monotonic.
- When a row is effectively superseded, next row's `supersedes-row` field points back; old row stays verbatim as history.
- If `ITERATION_LEDGER.md` exceeds ~50 rows (unlikely for most skills), split into `ITERATION_LEDGER_1.md` / `_2.md` but never rewrite row-1.
- Git already gives free file-level history; the markdown table is the fast-path human read.

### Skill integration
- **Brainstorm Phase 0 step 6** (existing duplicate-check) → extend: read ITERATION_LEDGER.md if present; summarize N prior iterations in landscape presentation.
- **Brainstorm Phase 4** (crystallize) → append new row if this was a re-entry (iter > 1).
- **Deep-research Phase 0** → read ledger; `trigger` prose informs research scope framing.
- **Deep-research Phase 4/self-audit** → append row on completion.
- **Deep-plan Phase 0** → read ledger; prior decisions + their iteration context shape question batches.
- **Deep-plan Phase 2 (DECISIONS.md)** → DECISIONS.md stays authoritative per decision; ITERATION_LEDGER.md is one-row-per-pass summary.

No new skill needed. All three existing skills get one-row read + one-row append hook.

---

## Risks

### Risks of adding a META-LEDGER (the YES path)

| Risk | Likelihood | Mitigation |
|------|-----------|------------|
| **Ledger drift** — authors forget to append; ledger lies about state. | MED | Skills enforce append in their Phase 0 / Phase 4 hooks. Convergence-loop verify ledger↔artifact consistency as a claim type. |
| **Redundancy with git log** — git already shows file-level history. | LOW-MED | The ledger's value is cross-file *semantic* history (which artifact is canonical, why the re-entry happened). Git log can't answer "which version of BRAINSTORM.md reflects iter 3." |
| **Schema over-engineering** — 10 fields today, 20 tomorrow. | MED | Schema hard-locked at 11 fields. Any expansion requires its own brainstorm. |
| **Cognitive overhead on small brainstorms** — ledger for a 1-iteration skill is pure tax. | HIGH for simple cases | File is optional for iter=1. Only created on first re-entry (brainstorm Phase 0 step 6 detects pre-existing artifacts → creates ledger retroactively with seed row + current row). |
| **Two sources of truth** — ledger says X, BRAINSTORM.md says Y. | MED | Rule: BRAINSTORM.md / RESEARCH_OUTPUT.md / PLAN.md are authoritative for *content*; ledger is authoritative for *chronology + cross-iteration edges*. No content duplicated into ledger. |
| **D-number collision doesn't go away** — ledger tracks iterations, not ID namespaces. | HIGH unless fixed | Separate issue; recommend also adding an ID-prefix convention (DEC-N, RQ-N, D-AG-N) alongside the ledger. Flagged as the **KEY RISK**. |

**KEY RISK FLAGGED: Without fixing the D-number namespace, the ledger improves cross-iteration coherence but cannot prevent the DEC-vs-RQ-vs-D-AGENT ID collision that's already present. Recommend a companion decision (separate research question or brainstorm decision) to introduce ID prefixes.**

### Risks of NOT adding a META-LEDGER (the NO path)

| Risk | Likelihood | Severity |
|------|-----------|----------|
| **Implicit session-header prose scales poorly past ~3 iterations** (already visible at 2). | HIGH | MED — readability erodes but artifact still usable |
| **Re-entry triggers are unrecorded** — six months later, "why did we reframe D19?" is a git-archaeology task. | HIGH | MED-HIGH for long-lived skills |
| **Cross-artifact edges are author's-head-only.** When research reframes D19, no artifact says "this invalidates BRAINSTORM.md decision D19" — user has to re-read both to catch it. | MED | HIGH if author changes or skill lives >3 months |
| **Each iteration's BRAINSTORM.md risks losing prior session's reasoning** — the Session 2 crystallization in migration-skill kept Session 1 reframe history (line 22-26) but only because author was careful. No skill rule mandates it. | MED | HIGH in compaction-heavy workflows |
| **D28 is a behavioral rule with no artifact support** — declaring "re-entry is the norm" without giving re-entry its own data structure is a design half-measure. | HIGH | MED — lives as aspirational rule until broken |

### Risks of going FULL heavyweight ADR-per-decision (the maximal alternative, rejected)

| Risk | Severity |
|------|---------|
| File proliferation — 29 decisions × 1 file = 29 new files on day 1. | HIGH |
| Friction on every small decision — author discouraged from capturing micro-decisions. | HIGH |
| Duplicates existing BRAINSTORM.md content — DECISIONS.md already near-ADR. | HIGH |
| Wrong aesthetic fit for skill-design (skill decisions are highly thematic/clustered, not one-off like architectural picks). | MED |

Rejected.

---

## Sources

**Codebase (file:line):**
- `C:\Users\jbell\.local\bin\JASON-OS\.research\migration-skill\BRAINSTORM.md:66` — session-header session-2-additions separator
- `C:\Users\jbell\.local\bin\JASON-OS\.research\migration-skill\BRAINSTORM.md:92` — D28 iterative re-entry decision
- `C:\Users\jbell\.local\bin\JASON-OS\.research\migration-skill\BRAINSTORM.md:134` — research Q11 "Process meta-ledger" (this sub-question's origin)
- `C:\Users\jbell\.local\bin\JASON-OS\.research\migration-skill\BRAINSTORM.md:161-167` — §7 loop diagram
- `C:\Users\jbell\.local\bin\JASON-OS\.research\migration-skill\BRAINSTORM_WIP.md:3` — SUPERSEDED marker (the manual ADR pattern)
- `C:\Users\jbell\.local\bin\JASON-OS\.research\migration-skill\BRAINSTORM_WIP.md:22-26` — session reframes bullet log
- `C:\Users\jbell\.local\bin\JASON-OS\.research\migration-skill\BRAINSTORM_WIP.md:53` — D11 `Dropped direction` (collision anchor)
- `C:\Users\jbell\.local\bin\JASON-OS\.research\migration-skill\BRAINSTORM_WIP.md:75` — D28 row with `Turn 10` source
- `C:\Users\jbell\.local\bin\JASON-OS\.claude\skills\brainstorm\SKILL.md:134-136` — Phase 0 duplicate-check offer-resume pattern (embryonic meta-ledger awareness)
- `C:\Users\jbell\.local\bin\JASON-OS\.claude\skills\deep-research\SKILL.md:291-294` — Phase 3.9 post-challenge re-synthesis (in-iteration precedent)
- `C:\Users\jbell\.local\bin\JASON-OS\.claude\skills\deep-research\SKILL.md:328-333` — Phase 3.97 final re-synthesis: edits not rewrites
- `C:\Users\jbell\.local\bin\JASON-OS\.claude\skills\deep-plan\SKILL.md:35, 226` — DECISIONS.md is standalone (ADR-style separation already in place)

**Web (URL + date):**
- https://adr.github.io/ — ADR central resource, supersede chain pattern. Accessed 2026-04-21.
- https://datatracker.ietf.org/doc/html/rfc2026 — RFC 2026 Internet Standards Process. 1996.
- https://microsoft.github.io/code-with-engineering-playbook/design/design-reviews/decision-log/ — Microsoft Decision Log table-of-ADRs pattern. Accessed 2026-04-21.
- https://engineering.atspotify.com/2020/04/when-should-i-write-an-architecture-decision-record — Spotify ADR practice. 2020-04.
- https://lamport.azurewebsites.net/tla/formal-methods-amazon.pdf — Amazon/AWS formal methods w/ TLA+, stepwise refinement from prose design. 2014.
- https://martinfowler.com/bliki/ArchitectureDecisionRecord.html — Fowler on ADRs: "Once an ADR is accepted, it should never be reopened or changed." Accessed 2026-04-21.
- https://datatracker.ietf.org/doc/draft-ietf-netmod-yang-module-versioning/ — modern IETF versioning (semver-for-specs). Accessed 2026-04-21.
- https://plane.so/blog/decision-log-what-it-is-why-teams-use-it-and-template — decision log as iteration-aware artifact. Accessed 2026-04-21.
- https://brunoscheufler.com/blog/2020-07-04-documenting-design-decisions-using-rfcs-and-adrs — RFC vs. ADR distinction. 2020-07.
- https://kieranpotts.com/rfcs — RFCs as chronological ledger of major decisions. Accessed 2026-04-21.
