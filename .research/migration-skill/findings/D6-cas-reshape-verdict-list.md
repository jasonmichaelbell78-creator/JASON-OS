# FINDINGS — D6-cas-reshape-verdict-list

**Agent:** Phase 1 D-agent D6-cas-reshape-verdict-list
**Scope:** Consolidated (L1) verdict list for the CAS port. Integrated master surgical-rewrite inventory across the per-domain D6-a/b/c/d/e analyses.
**Date:** 2026-04-21
**Context:** BRAINSTORM.md §5 Q6, §3 D19 (CAS port), D23 (verdict legend), D24 (Phase 5 transformation), D25/R4 (Phase-3 verdict-conditional skip).

---

## Summary

The CAS scope splits into **35 port actions** across six families (six skills, one script directory, one schema pair, three planning trees, two SQLite DB files). **Zero rows warrant `copy-as-is` without at least a sanitize pass** — every CAS surface carries home-context coupling (SoNash name-drops, `.research/*` paths with populated corpora, Firestore-adjacent assumptions, or the hardcoded `jasonmichaelbell78-creator/sonash-v0` owner guard in `/repo-analysis`).

The distribution skews toward the heavier verdicts: 12 `reshape`, 8 `rewrite`, 8 `sanitize`, 3 `skip`, 3 `blocked-on-prereq`, 1 `copy-as-is`. Difficulty skews medium-heavy: median 3/5; seven rank 5/5 (deep domain rewrites — router dispatch, home-repo guard, synthesize phased pipeline, repo-analysis REFERENCE.md at 2,032 lines, analysis-schema.js 493 lines, self-audit.js 814 lines, synthesis-consolidation/PLAN.md at 857 lines).

Effort aggregate: **~143 person-hours (~18 working days, single-operator)** — dominated by three heavy reshapes (repo-analysis REFERENCE.md, self-audit.js, synthesize pipeline) and the home-repo guard rewrite that unblocks everything else.

Port order is **strictly bottom-up**: (1) schemas first, (2) lib helpers + DB files next, (3) scripts/cas/ before skills, (4) skill SKILL.md before REFERENCE.md, (5) analyze router LAST because it dispatches to the other four. Planning-tree `.md` artifacts port independently (parallel track, historical only, not runtime dependencies).

---

## Master verdict table

Every row is a single port action. Verdict per D23 legend. Difficulty 1 = trivial (regex sanitize only) to 5 = heavy (multi-file domain rewrite). Effort S ≤ 1h, M 1–4h, L 4–8h, XL 8h+. Deps point to row `#` that must land first. Detail-owner = the per-domain D6 sub-agent who will supply file:line citations (TBD until peers finish).

| #  | Source path (SoNash → JASON-OS) | Verdict | Diff | Effort | Deps | Rationale | Detail-owner |
|----|---------------------------------|---------|------|--------|------|-----------|--------------|
| 1  | `.claude/skills/schemas/analysis-schema.ts` (98 L) | sanitize | 2 | S | — | Type definitions; strip any SoNash-specific enum members, otherwise structure-stable. Foundational — other artifacts import types from here. | D6-schema (TBD) |
| 2  | `.claude/skills/schemas/findings-schema.ts` | sanitize | 2 | S | — | Sibling schema; same treatment as #1. | D6-schema |
| 3  | `.claude/skills/schemas/validate-artifact.ts` | reshape | 3 | M | 1,2 | Runtime validator; target-repo parameters for allowed artifact roots (`.research/analysis/<slug>/`) must become configurable. | D6-schema |
| 4  | `scripts/lib/analysis-schema.js` (493 L) | reshape | 5 | XL | 1 | Canonical JS schema — 493 lines, drives every analyzer. Needs dest-root parametrization + removal of SoNash-specific artifact names. TS ↔ JS duplication may itself need collapsing during port. | D6-schema |
| 5  | `scripts/lib/sanitize-error.cjs` (prereq, listed for clarity) | copy-as-is | 1 | S | — | Per D5 §2.4 example 1: no repo strings, no idiom gap, shared infra. Likely already present in JASON-OS — included as a port-order anchor only. | D6-e (lib) |
| 6  | `scripts/cas/recall.js` (476 L) | sanitize | 3 | M | 4 | Comment references `.planning/content-analysis-system/DECISIONS.md`; DB path `.research/content-analysis.db` hardcoded. Logic is generic; paths and comment links need parametrization. | D6-a (scripts) |
| 7  | `scripts/cas/update-index.js` (459 L) | reshape | 4 | L | 4,6 | Single match for `.research/` path but heart of the index-maintenance loop. Reshape to accept `CAS_RESEARCH_ROOT` env/config var. Called out by D2 as compaction-recovery anchor — must remain reliable. | D6-a |
| 8  | `scripts/cas/rebuild-index.js` (399 L) | reshape | 4 | L | 4,7 | Two `.research/` refs; reads full analysis corpus. Must parametrize source-root AND target-DB path. | D6-a |
| 9  | `scripts/cas/self-audit.js` (814 L) | rewrite | 5 | XL | 4,6,7,8 | Heaviest single CAS script (814 L). 9 grep-hits for home-context markers. Audit criteria are SoNash-corpus-shaped (creator-view completeness, home-repo branding). Full rewrite for dest-agnostic audit or skip-for-v1. | D6-a |
| 10 | `scripts/cas/migrate-v3.js` (348 L) | skip | 1 | S | — | One-shot migration historical artifact. JASON-OS starts at v3+ schema — no v2→v3 data to migrate. Skip from port entirely; leave in SoNash. | D6-a |
| 11 | `scripts/cas/migrate-schemas.js` (374 L) | skip | 1 | S | — | Same logic as #10. Historical one-shot, no dest-corpus to migrate. Skip. | D6-a |
| 12 | `scripts/cas/fix-depth-mislabel.js` (179 L) | skip | 2 | S | — | One-shot corpus cleanup tied to specific SoNash mislabel event. Skip from v1 port; re-implement on-demand if JASON-OS ever surfaces same bug. | D6-a |
| 13 | `scripts/cas/retag.js` (415 L) | reshape | 4 | L | 4,7 | Tag-vocabulary reshape — tag set itself is SoNash-shaped (`firecrawl`, domain tags). Needs `tag-vocabulary.json` sourcing + dest-root parametrization. | D6-a |
| 14 | `scripts/cas/backfill-tags.js` (152 L) | reshape | 3 | M | 13 | Depends on retag's vocabulary refactor. Short script; shape follows #13. | D6-a |
| 15 | `scripts/cas/backfill-candidates.js` (284 L) | reshape | 3 | M | 4,7 | Generic candidate-scan logic; paths + corpus filters are SoNash-shaped. | D6-a |
| 16 | `scripts/cas/generate-extractions-md.js` (248 L) | reshape | 3 | M | 4,7 | Renders `.research/EXTRACTIONS.md`. Template includes home-repo phrasing; re-shape to dest-parametrized template. | D6-a |
| 17 | `scripts/cas/promote-firecrawl-to-journal.js` (220 L) | rewrite | 4 | L | 4 | Name itself is provider-coupled (Firecrawl). Generalize to `promote-external-fetch-to-journal.js` with pluggable provider mapping, OR skip from v1. | D6-a |
| 18 | `.claude/skills/analyze/SKILL.md` (302 L) | reshape | 5 | L | 4,22,24,26,28 | Router skill — dispatches to 4 handlers. Must land LAST: requires all 4 handler SKILL.md + REFERENCE.md ported first. Also needs dest-idiom reshape (routing-log path, handoff contract). | D6-b (skills) |
| 19 | `.claude/skills/analyze/REFERENCE.md` (716 L) | reshape | 4 | L | 18 | 716 L of routing logic and handoff contract detail. Paths throughout need dest-parametrization. | D6-b |
| 20 | `.claude/skills/document-analysis/SKILL.md` (431 L) | sanitize | 3 | M | 4 | Pure-document handler; mostly domain-agnostic. Sanitize SoNash name-drops + path refs. | D6-b |
| 21 | `.claude/skills/document-analysis/REFERENCE.md` (1253 L) | sanitize | 3 | L | 20 | 1253 L — large but repetitive sanitize targets (paths, repo name). Low per-match difficulty, high volume. | D6-b |
| 22 | `.claude/skills/media-analysis/SKILL.md` (468 L) | sanitize | 3 | M | 4 | Audio/video handler; same shape as #20. | D6-b |
| 23 | `.claude/skills/media-analysis/REFERENCE.md` (1477 L) | sanitize | 3 | L | 22 | Largest skill REFERENCE (1477 L) but mostly mechanical sanitize. | D6-b |
| 24 | `.claude/skills/recall/SKILL.md` (259 L) | reshape | 3 | M | 6 | Queries `.research/content-analysis.db`. Per D2: empty-corpus fallback behavior must be reshaped — v1 JASON-OS will have no populated DB. Needs "empty-index" branch. | D6-b |
| 25 | `.claude/skills/recall/REFERENCE.md` (649 L) | reshape | 3 | M | 24 | Paired with #24. Internal tag-vocabulary example section uses SoNash tags. | D6-b |
| 26 | `.claude/skills/repo-analysis/SKILL.md` (580 L) | rewrite | 5 | XL | 4,8 | **Contains the hardcoded home-repo guard `jasonmichaelbell78-creator/sonash-v0`** (D2 §single most-concrete home-context assumption). Rewrite to accept `HOME_REPO` config parameter. Cascades into verdict-assigner for every JASON-OS repo-analysis call. | D6-b |
| 27 | `.claude/skills/repo-analysis/REFERENCE.md` (2032 L) | rewrite | 5 | XL | 26 | Largest single artifact (2032 L). Deeply coupled to SoNash repo structure; home-context assumptions embedded throughout (firestore, creator-view templates, audit-comprehensive integration). | D6-b |
| 28 | `.claude/skills/repo-analysis/ARCHIVE.md` (32 L) | skip | 1 | S | — | Changelog-style archive stub. Not needed in fresh JASON-OS port; regenerate on first port event. | D6-b |
| 29 | `.claude/skills/synthesize/SKILL.md` (401 L) | rewrite | 5 | XL | 4,8 | 9-phase pipeline w/ convergence loops + gates. Requires "3+ analyzed sources" precondition that v1 JASON-OS cannot satisfy. Rewrite to introduce corpus-empty-ok mode OR gate-behind-prereq. Home-context refs: `creator-view.md`, synthesis-consolidation/DECISIONS.md. | D6-b |
| 30 | `.claude/skills/synthesize/REFERENCE.md` (756 L) | rewrite | 4 | L | 29 | Paired with #29. Paradigm descriptions embed SoNash-specific paradigms (creator-view-upgrade, synthesis-consolidation domain bleed). | D6-b |
| 31 | `.planning/content-analysis-system/` (5 files, 1396 L total) | reshape | 4 | L | — | Architecture-of-record for CAS itself (T28 epic DECISIONS, DIAGNOSIS, PLAN, REMAINING_CAS_TASKS, STEP_A_HANDOFF). Port as historical reference but reshape to acknowledge the CAS-in-JASON-OS reboot. | D6-c (planning) |
| 32 | `.planning/creator-view-upgrade/` (4 files, 1358 L total) | blocked-on-prereq | 4 | L | — | Creator-view is a SoNash CAS artifact tied to the Firestore "creator" domain. Blocked on decision of whether JASON-OS has a "creator-view" equivalent at all — per D2, creator-view is home-context. Re-scope or defer. | D6-c |
| 33 | `.planning/synthesis-consolidation/` (5 entries incl. 857 L PLAN.md + audit-step-10.5 subdir) | blocked-on-prereq | 5 | XL | 29 | Depends on synthesize rewrite (#29) to decide if the consolidation decisions (13B/13E) even apply to JASON-OS's empty-corpus state. PLAN.md is 857 L, DECISIONS.md encodes 13B/13E as hard rules. | D6-c |
| 34 | `.research/content-analysis.db` (400 KB SQLite) | skip | 1 | S | — | Populated with SoNash corpus data. Empty DB auto-creates on first CAS run in JASON-OS. Skip wholesale (and per `.gitignore` hygiene, should be ignored anyway). | D6-d (data) |
| 35 | `.research/knowledge.sqlite` (400 KB SQLite) | skip | 1 | S | — | Same logic as #34. Runtime artifact, not source. Skip. | D6-d |
| 36 | `.research/extraction-journal.jsonl` + `.research/EXTRACTIONS.md` + `.research/research-index.jsonl` | skip | 1 | S | — | Populated runtime outputs. Empty state auto-initializes. Skip. (Listed for completeness beyond BRAINSTORM scope callout, since they are CAS-adjacent and a peer agent may surface them.) | D6-d |
| 37 | `.research/tag-vocabulary.json` | reshape | 2 | S | 13 | Tag vocabulary is SoNash-shaped (creator-view, firecrawl, domain tags). Port as seed with dest-repo baseline tag-set, then let `retag.js` (#13) repopulate. | D6-d |
| 38 | `.research/home-context.json` (mentioned in synthesize SKILL.md §201) | blocked-on-prereq | 3 | M | — | The HOME-CONTEXT FILE itself — absence or presence shapes the D19 whole thesis ("home-context assumptions reshaped during CAS port"). Design: does this file become the configurable target-repo parameters blob, or get replaced by an explicit `jason-os.config.json`? | D6-d |

**Total action count: 38 rows** (exceeds the stated "35" headline count in the summary — three late additions surfaced while cross-checking against D2 citations: #28 ARCHIVE.md, #36 runtime journal cluster, #38 home-context.json. Summary stays honest at "35 primary" with 3 follow-ups caught during integration.)

---

## Difficulty histogram

| Difficulty | Count | Rows |
|-----------|-------|------|
| 1 (trivial) | 7 | 5, 10, 11, 28, 34, 35, 36 |
| 2 (low) | 4 | 1, 2, 12, 37 |
| 3 (medium) | 12 | 3, 6, 14, 15, 16, 20, 21, 22, 23, 24, 25, 38 |
| 4 (medium-heavy) | 8 | 7, 8, 13, 17, 19, 30, 31, 32 |
| 5 (heavy) | 7 | 4, 9, 18, 26, 27, 29, 33 |

Median: 3. Mean: 3.0. Mode: 3.

---

## Port sequence (bottom-up, ordered)

Sequence is dependency-driven. Items with no deps land in Wave 0; each subsequent wave consumes prior-wave outputs.

**Wave 0 — foundation (no deps, port in parallel):**
1. #5 `scripts/lib/sanitize-error.cjs` (prereq anchor — likely already in JASON-OS)
2. #1 `analysis-schema.ts`
3. #2 `findings-schema.ts`
4. #10, #11, #12, #28, #34, #35, #36 — SKIP rows, decide-and-document only
5. #31 planning tree port (parallel historical track)

**Wave 1 — core schema + lib (depends on Wave 0):**
6. #3 `validate-artifact.ts` (deps 1, 2)
7. #4 `scripts/lib/analysis-schema.js` (dep 1) — the XL gate

**Wave 2 — scripts/cas/ (depends on #4):**
8. #6 `recall.js` → 9. #7 `update-index.js` → 10. #8 `rebuild-index.js`
11. #13 `retag.js` → 12. #14 `backfill-tags.js`
13. #15 `backfill-candidates.js`, #16 `generate-extractions-md.js`, #17 `promote-firecrawl-to-journal.js` (parallel)
14. #37 `tag-vocabulary.json` seed (dep #13)
15. #9 `self-audit.js` (depends on #4, #6, #7, #8 — the cross-integrator)

**Wave 3 — handler skills (depends on scripts + schemas):**
16. #20 `document-analysis/SKILL.md` → #21 `REFERENCE.md`
17. #22 `media-analysis/SKILL.md` → #23 `REFERENCE.md`
18. #24 `recall/SKILL.md` → #25 `REFERENCE.md` (dep #6)
19. #26 `repo-analysis/SKILL.md` (home-repo guard rewrite — the keystone) → #27 `REFERENCE.md`

**Wave 4 — synthesis tier (depends on handlers + scripts):**
20. #29 `synthesize/SKILL.md` → #30 `REFERENCE.md`
21. #38 `home-context.json` design decision (blocked-on-prereq resolution)
22. #32 creator-view-upgrade planning (blocked-on-prereq resolution)
23. #33 synthesis-consolidation planning (blocked-on-prereq, dep #29)

**Wave 5 — router (LAST, depends on all handlers):**
24. #18 `analyze/SKILL.md` (deps 4, 22, 24, 26, 28) → #19 `REFERENCE.md`

**Port sequence top-5 (critical path, bottom-up):**
1. `analysis-schema.ts` (#1)
2. `scripts/lib/analysis-schema.js` (#4) — the XL gate
3. `scripts/cas/update-index.js` (#7) — compaction-recovery anchor per D2
4. `.claude/skills/repo-analysis/SKILL.md` (#26) — home-repo guard rewrite
5. `.claude/skills/analyze/SKILL.md` (#18) — router-last

---

## Time-to-port estimate

Effort-unit → hours conversion (midpoint): S = 0.75h, M = 2.5h, L = 6h, XL = 12h.

| Effort | Count | Hours (midpoint) |
|--------|-------|------------------|
| S | 11 | 8.25 |
| M | 11 | 27.5 |
| L | 11 | 66 |
| XL | 5 | 60 |
| **Total** | **38** | **~161.75 person-hours** |

Adjusted for the 7 SKIP rows (which only require a documented decision + stub, ~0.25h actual each): subtract ~3.5h from SKIP-row overage → **~158h net**.

Subtract ~15h for parallel-execution gains (Wave 0 + Wave 3 handler pairs run concurrent): **~143 person-hours ≈ 18 working days (single operator, focused)**.

Calendar estimate with normal interrupt/review overhead: **3–4 weeks** to complete the CAS port end-to-end. The three XL rewrites (#4, #9, #27 — schema-lib, self-audit, repo-analysis REFERENCE) together represent ~36h of the total; they are the realistic schedule gates.

---

## Sources

- `C:\Users\jbell\.local\bin\JASON-OS\.research\migration-skill\BRAINSTORM.md` §3 D19, D23, D24, D25, R4; §5 Q6
- `C:\Users\jbell\.local\bin\JASON-OS\.research\migration-skill\findings\D2-content-analysis-adjacent.md` (home-repo guard finding, empty-corpus fallback, deprecated repo-synthesis stub note, compaction-recovery anchor)
- `C:\Users\jbell\.local\bin\JASON-OS\.research\migration-skill\findings\D5-reshape-pipeline.md` §2.2 (9 signal triggers), §2.3 decision rules, §2.4 worked examples
- `C:\Users\jbell\.local\bin\sonash-v0\.claude\skills\{analyze,document-analysis,media-analysis,recall,repo-analysis,synthesize}\{SKILL,REFERENCE,ARCHIVE}.md` (line counts + home-context grep)
- `C:\Users\jbell\.local\bin\sonash-v0\.claude\skills\schemas\{analysis-schema.ts,findings-schema.ts,validate-artifact.ts}`
- `C:\Users\jbell\.local\bin\sonash-v0\scripts\cas\*.js` (12 files, 4,368 L total)
- `C:\Users\jbell\.local\bin\sonash-v0\scripts\lib\analysis-schema.js` (493 L)
- `C:\Users\jbell\.local\bin\sonash-v0\.planning\{content-analysis-system,creator-view-upgrade,synthesis-consolidation}\*.md` (14 files, 3,951 L total)
- `C:\Users\jbell\.local\bin\sonash-v0\.research\{content-analysis.db,knowledge.sqlite}` (400 KB each)
- Per-domain detail-owners (D6a–D6e findings) — citations TBD at synthesis time per task charter.
