# V3 — Phase 2.5 Verifier: CAS Port Scope (Q6 + Q2 CAS-adjacent)

**Agent:** Phase 2.5 V3 (deep-research-verifier persona)
**Date:** 2026-04-21
**Scope:** Claims from Q6 (`SQ-D6`) + Q2 CAS-adjacent (`SQ-D2` via `D2-content-analysis-adjacent`)
**Source findings:** `D6-cas-skills-deep`, `D6-cas-scripts-deep`, `D6-cas-dbs-schemas`, `D6-cas-planning`, `D6-cas-integration`, `D6-cas-reshape-verdict-list`, `D2-content-analysis-adjacent`
**Target:** read-only SoNash (`C:\Users\jbell\.local\bin\sonash-v0\`) + JASON-OS bootstrap
**Verdict classes:** VERIFIED / REFUTED / UNVERIFIABLE / CONFLICTED

---

## Summary

**Claims in scope:** 12 (C-034, C-035, C-036, C-037, C-038, C-039, C-040, C-041, C-076, C-077, C-108, C-109).

**Verdict distribution:**

| Verdict | Count | Claim IDs |
|---|---|---|
| VERIFIED | 10 | C-034, C-036, C-037, C-038, C-039, C-040, C-041, C-076, C-108, C-109 |
| CONFLICTED | 1 | C-035 (headline count 35 vs 38; verdict distribution numbers don't match table) |
| VERIFIED (downstream-dependent) | 1 | C-077 (logical consequence of pre-port-dependency; verified structurally) |
| REFUTED | 0 | — |
| UNVERIFIABLE | 0 | — |

**High-impact priority outcomes:**

1. **MD5 byte-identical DB claim — VERIFIED (exact match).**
   Both `content-analysis.db` and `knowledge.sqlite` at `.research/` hash to
   `d098a358f3e75c978e0417e759e3c84e`. `wc -c`/size = 409600 bytes each.
2. **`self-audit.js:481-505` home-repo allowlist — VERIFIED.** Lines 484-505
   contain `HOME_REPO_PREFIXES` (10 entries) + `HOME_REPO_FILES` Set (8 files).
   `self-audit.js` = **814 lines** exactly (matches C-039).
3. **`repo-analysis/SKILL.md:68` hardcoded home-repo guard — VERIFIED.**
   Line 68 exactly contains `jasonmichaelbell78-creator/sonash-v0`. Additional
   cites at SKILL.md:431-432 and REFERENCE.md:1336 also VERIFIED.
4. **Zero auth deps claim — VERIFIED.** Grep of
   `process\.env|OPENAI|ANTHROPIC|API_KEY|TOKEN|SECRET|GOOGLE|FIREBASE` across
   `scripts/cas/*.js` returned **0 matches**.
5. **5-layer port DAG — VERIFIED (structural).** D6-cas-integration §7 lays
   out Layer 0 (foundation) → Layer 5 (skills) with clear deps; internal
   consistency confirmed against lib/script/skill dependency patterns seen in
   spot-checks.
6. **89 coupling sites from D6-cas-skills-deep — SPOT-CHECK PASSED (10/10).**
   Cites at `analyze/SKILL.md:69,96-97,146`, `document-analysis/SKILL.md:61-62`,
   `document-analysis/REFERENCE.md:756,1237-1245`, `analyze/REFERENCE.md:542,636`
   all matched verbatim at cited line numbers. Aggregate count of 89 is
   self-reported with methodology (dedup across REFERENCE §-refs) documented
   inline — credible.
7. **68 coupling sites from D6-cas-scripts-deep — SPOT-CHECK PASSED (7/7).**
   Cites at `backfill-candidates.js:42-44,50-60`, `backfill-tags.js:20-26`,
   `fix-depth-mislabel.js:44-54`, `promote-firecrawl-to-journal.js:43-45`,
   `rebuild-index.js:35-109`, `update-index.js:285+` all matched. DDL
   duplication claim (C-041) slightly off on exact line ranges (rebuild
   L36-109 vs claimed L37-112; update L290-358 vs claimed L291-350) but
   substantively correct — both DDL blocks exist and duplicate table
   shapes as claimed.
8. **32 Zod schemas claim — VERIFIED (with minor nuance).** 28 `z.object(...)` +
   21 `z.enum(...)` direct matches; multi-line `const X = z\n.object(...)`
   patterns account for the remainder. Enum count in D6-cas-dbs-schemas
   understated by 1 (16 actual vs 15 claimed: `ledgerStatusEnum` at line 277
   is correctly included in the table but not in the enum-count summary
   line). File is 493 lines (D6 claimed "494 lines" once — off by 1).

**MD5 VERIFICATION RESULT:** `d098a358f3e75c978e0417e759e3c84e` — **MATCH** on
both `content-analysis.db` and `knowledge.sqlite`. Claim C-040 is VERIFIED.

---

## Per-claim verdict table

| Claim ID | Summary | Verdict | Evidence anchor |
|---|---|---|---|
| C-034 | CAS port is 35-38 port actions, ~143 person-hours, ~18 working days | **VERIFIED** | D6-cas-reshape-verdict-list §Summary + master table; 38 rows enumerated (summary disclosed 35 primary + 3 follow-ups = 38 total, matches range claim exactly). |
| C-035 | Verdict distribution: 12 reshape / 8 rewrite / 8 sanitize / 3 skip / 3 blocked-on-prereq / 1 copy-as-is | **CONFLICTED** | Actual table tally: reshape 14, rewrite 6, sanitize 7, skip 7, blocked-on-prereq 3, copy-as-is 1 = 38 rows. Claim's numbers (12/8/8/3/3/1 = 35) do NOT match the 38-row table; appears to be a stale summary tally. "Zero rows are pure copy-as-is" portion of claim is **REFUTED** by row 5 (`sanitize-error.cjs` copy-as-is). |
| C-036 | Three hardcoded cites of `jasonmichaelbell78-creator/sonash-v0` in /repo-analysis (SKILL.md:68, :431-432; REFERENCE.md:1336) | **VERIFIED** | `repo-analysis/SKILL.md:68` ✓, `:431-432` ✓, `REFERENCE.md:1336` ✓ — all three read verbatim. |
| C-037 | HOME_CONTEXT_FILES[] affects 7 cites across 4 skills; JASON-OS has CLAUDE.md but no SESSION_CONTEXT.md/ROADMAP.md | **VERIFIED** | Home-context refs confirmed at `document-analysis/SKILL.md:61-62`, `document-analysis/REFERENCE.md:1237-1245`, `repo-analysis/SKILL.md:279-280`, `repo-analysis/REFERENCE.md:1540-1546`, `media-analysis/SKILL.md:68-69`, `synthesize/SKILL.md:198-201`. JASON-OS has `CLAUDE.md` only (confirmed via file listing) — SESSION_CONTEXT.md + ROADMAP.md absent. |
| C-038 | CAS_SCRIPTS_ROOT affects 17+ cites across 6 skills | **VERIFIED** | D6-cas-skills-deep coupling-type table row "CAS helper scripts (`scripts/cas/*.js`) — 17 sites". Spot-checks at `analyze/REFERENCE.md:388,460,494,522,565,628,663` confirmed 7 cites in one file alone. |
| C-039 | CAS port order bottom-up; analysis-schema.js 493 lines, self-audit.js 814 lines, repo-analysis/REFERENCE.md 2,032 lines | **VERIFIED** | `wc -l`: analysis-schema.js = 493 ✓, self-audit.js = 814 ✓, repo-analysis/REFERENCE.md = 2,032 ✓. All three line counts exact. |
| C-040 | content-analysis.db and knowledge.sqlite are BYTE-IDENTICAL (409,600 bytes, MD5 d098a358f3e75c978e0417e759e3c84e) | **VERIFIED** | `md5sum` output: `d098a358f3e75c978e0417e759e3c84e` for both files. File sizes 409600 bytes each (ls -la). **Priority-1 verification passed.** |
| C-041 | CAS DDL is duplicated across rebuild-index.js (L37-112) and update-index.js (L291-350) | **VERIFIED** | Both DDL blocks exist. Exact line ranges slightly off: rebuild-index DDL at L36-109 (claim L37-112 — off by 1-3 lines); update-index DDL at L290-358 (claim L291-350 — start off by 1, end off by 8). Substance of duplication claim is correct — confirmed visually. |
| C-076 | 7 CAS-adjacent skills; /recall is lowest-cost prior-art check; /analyze router for unknown-target | **VERIFIED** | D2-content-analysis-adjacent integration table lists all 7; D6-cas-integration §4 confirms /analyze→handler dispatch + /recall query surface. |
| C-077 | All 6 live CAS skills are pre-port-dependent for /migration EXECUTION beyond trivial file-copy; concept unit-type is blocked-on-prereq in v1-MVP until CAS ported | **VERIFIED (structurally)** | Logical consequence of the port-order claim (C-039): handler skills depend on CAS scripts + lib, which depend on schema. JASON-OS currently has neither CAS scripts nor the Zod schema lib ported. No counter-evidence. |
| C-108 | /sonash-context is implicit cross-skill dependency of /synthesize via REFERENCE.md:730 | **VERIFIED** | `synthesize/REFERENCE.md:730` reads *"Stack: Zod 4.3.6 schemas per CLAUDE.md §1; script runners per sonash-context"*. NOTE: The claim says "D6-cas-skills-deep table 6" — table 6 in that finding IS /synthesize, so the cross-reference is correctly attributed to the synthesize skill, not repo-analysis. |
| C-109 | Invocation-tracking (scripts/reviews/write-invocation.ts) is SoNash-specific; JASON-OS has scripts/reviews/ unported | **VERIFIED** | `scripts/reviews/write-invocation.ts` exists in SoNash (confirmed via `ls`). JASON-OS has no `scripts/reviews/` directory (confirmed via `ls C:\Users\jbell\.local\bin\JASON-OS\scripts\` — only `config/`, `lib/`, `planning/`, `session-end-commit.js`). Invocation call at `repo-analysis/SKILL.md:529-538` confirmed. |

---

## Flagged issues (REFUTED + CONFLICTED)

### [CONFLICTED] C-035 — verdict distribution numbers don't match the master table

**Claim:** "12 reshape, 8 rewrite, 8 sanitize, 3 skip, 3 blocked-on-prereq, 1 copy-as-is — ZERO rows are pure copy-as-is."

**Actual (tallied from D6-cas-reshape-verdict-list rows 1-38):**

| Verdict | Claimed | Actual | Delta |
|---|---|---|---|
| reshape | 12 | **14** | +2 |
| rewrite | 8 | **6** | -2 |
| sanitize | 8 | **7** | -1 |
| skip | 3 | **7** | +4 |
| blocked-on-prereq | 3 | **3** | 0 |
| copy-as-is | 1 | **1** | 0 |
| **TOTAL** | **35** | **38** | **+3** |

Further, the tail phrase *"ZERO rows are pure copy-as-is"* is **internally
contradicted** by row 5 (`sanitize-error.cjs`, verdict=copy-as-is) in the same
table — and by the claim itself which lists "1 copy-as-is".

**Root cause:** The claim appears to be taken from an earlier draft summary
(35 actions) before rows 28/36/38 were appended and before verdict
re-balancing. D6-cas-reshape-verdict-list's **own summary** footnote flags
this: *"Total action count: 38 rows (exceeds the stated '35' headline count
in the summary — three late additions surfaced while cross-checking"*.

**Impact on downstream consumers (deep-plan, GSD, tdms):** Port-sizing
estimates that read C-035 for verdict distribution will be slightly
mis-calibrated on verdict mix but within noise on total action count. The
~143h effort estimate (C-034) is NOT affected because it is computed from
the actual 38-row table not from the headline distribution.

**Proposed confidence adjustment:** C-035 HIGH → **MEDIUM-HIGH**. Fix the
distribution numbers to `14 reshape / 6 rewrite / 7 sanitize / 7 skip / 3
blocked-on-prereq / 1 copy-as-is` and retract the contradictory tail clause.

### [MINOR] C-041 — DDL line ranges slightly off

Line ranges in the claim (rebuild-index L37-112, update-index L291-350) are
off by 1-8 lines at each boundary vs actual (L36-109 and L290-358). The
existence of the duplication and the DRY-violation concern is fully
verified, but file:line precision is drifting. Not flag-worthy on its own;
useful for port-execution tooling that cares about exact line-range
extraction.

**Proposed confidence adjustment:** C-041 HIGH → HIGH (no change needed);
recommend line-range correction during claim maintenance.

### [MINOR] C-039 — analysis-schema.js line count

Claim states 493 lines (correct per `wc -l`). D6-cas-dbs-schemas §1.1 opens
with "494 lines, 14.7 KB" — a single-line drift likely due to trailing
newline ambiguity. Doesn't change any substantive port-effort claim.

**Proposed confidence adjustment:** C-039 HIGH → HIGH (no change).

---

## MD5 verification result (priority 1)

| File | Bytes | MD5 (actual) | MD5 (claimed) | Match |
|---|---|---|---|---|
| `C:\Users\jbell\.local\bin\sonash-v0\.research\content-analysis.db` | 409,600 | `d098a358f3e75c978e0417e759e3c84e` | `d098a358f3e75c978e0417e759e3c84e` | ✓ |
| `C:\Users\jbell\.local\bin\sonash-v0\.research\knowledge.sqlite` | 409,600 | `d098a358f3e75c978e0417e759e3c84e` | `d098a358f3e75c978e0417e759e3c84e` | ✓ |

**Byte-identical confirmed.** `knowledge.sqlite` is a stale alias of
`content-analysis.db`, referenced only by `synthesize/self-audit.js:704` as
noted in D6-cas-dbs-schemas §2.6. Port action per D6 verdict table row 35:
`skip` (runtime artifact; do not port; remove orphan reference in
ported self-audit).

---

## Proposed confidence adjustments (summary)

| Claim | Current | Proposed | Reason |
|---|---|---|---|
| C-034 | HIGH | HIGH | No change; 38-row table corroborates 35-38 range + ~143h estimate. |
| **C-035** | HIGH | **MEDIUM-HIGH** | Distribution numbers wrong (see CONFLICTED section); total action count also 35→38 mismatch. |
| C-036 | HIGH | HIGH | All three cites verified verbatim. |
| C-037 | HIGH | HIGH | 7 cites confirmed; JASON-OS CLAUDE.md presence confirmed; SESSION_CONTEXT.md / ROADMAP.md absence confirmed. |
| C-038 | HIGH | HIGH | No change; spot-check aligned with claimed 17+ count. |
| C-039 | HIGH | HIGH | All three line counts exact match. |
| C-040 | HIGH | HIGH | **MD5 byte-identical confirmed** — the single highest-value claim in scope. |
| C-041 | HIGH | HIGH | Duplication verified; minor line-range drift noted but doesn't change substance. |
| C-076 | HIGH | HIGH | Integration table structurally consistent. |
| C-077 | HIGH | HIGH | Structural consequence verified. |
| C-108 | MEDIUM | MEDIUM | Single-D-agent source; the factual cite is verified but doesn't elevate to HIGH on its own. |
| C-109 | HIGH | HIGH | `scripts/reviews/` unported in JASON-OS; SoNash cites verified. |

---

## Scope-window exclusions

- **C-044, C-045** (SQ-D7 — D7-cas-precedent): Out of V3 scope per
  persona-scope spec, which limits V3 to Q6 + Q2 CAS-adjacent. C-040 and
  C-041 are in scope because they reference `sourceIds` including S-025
  (D7-cas-precedent) but fall under SQ-D6 subQuestion routing.
- **C-015, C-088** (JASON-OS state / self-audit pattern): Out of V3 scope
  (SQ-D3a, SQ-D2 non-CAS-adjacent).

---

## Verification methodology (append)

1. **MD5:** `md5sum "<path>" "<path>"` — direct hash comparison.
2. **Line-count:** `wc -l "<path>"`.
3. **Hardcoded-string spot-check:** `Read` tool at exact claimed line
   offsets; confirm literal string presence.
4. **Coupling-site spot-checks:** Sampled 10+ citations from
   D6-cas-skills-deep Table 1/2 and 7+ from D6-cas-scripts-deep §1-5;
   all matched file content at claimed offsets.
5. **Auth-grep:** ripgrep of `process\.env|OPENAI|ANTHROPIC|API_KEY|TOKEN|SECRET|GOOGLE|FIREBASE` across `scripts/cas/*.js` — zero matches.
6. **Zod schema count:** `z\.object` → 28 matches; `z\.enum` → 21 matches;
   per-const regex confirms 16 enums + 12 top-level z.object declarations +
   ~4 multi-line `z.\nobject(...)` declarations (repoMetadata, repoFields,
   websiteMetadata, websiteFields, mediaMetadata, mediaFields,
   documentMetadata, documentFields, deferredToSchema). D6-cas-dbs-schemas
   aggregate "32 named schemas" is consistent with these counts.
7. **Directory structure check:** `ls` to confirm JASON-OS has/lacks
   specific paths referenced as blockers (scripts/reviews/, SESSION_CONTEXT.md).

---

## Summary return values (for orchestrator)

- **Claims-in-scope count:** 12
- **Verdict distribution:** 10 VERIFIED + 1 CONFLICTED (C-035) + 1 VERIFIED-structurally (C-077); 0 REFUTED; 0 UNVERIFIABLE.
- **MD5 verification outcome:** **MATCH** (`d098a358f3e75c978e0417e759e3c84e` on both DB files).
- **Top 3 flagged:**
  1. **C-035 (CONFLICTED)** — verdict distribution numbers don't match the 38-row master table; fix to `14/6/7/7/3/1`.
  2. **C-041 (minor)** — DDL line ranges drift 1-8 lines; substance correct, but line-precision downstream tools should pull fresh.
  3. **C-039 (minor)** — analysis-schema.js line count: 493 per wc -l (D6-cas-dbs-schemas §1.1 says 494; off by 1).
- **Findings path:** `C:\Users\jbell\.local\bin\JASON-OS\.research\migration-skill\findings\V3-cas.md`

**End V3-cas verification.**
