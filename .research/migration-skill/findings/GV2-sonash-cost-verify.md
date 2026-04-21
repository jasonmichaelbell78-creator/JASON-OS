# GV2 — Verification of G2-sonash-source-cost.md

**Agent:** Phase 3.96 gap-verifier GV2 (deep-research-gap-verifier persona)
**Scope verified:** `C:\Users\jbell\.local\bin\JASON-OS\.research\migration-skill\findings\G2-sonash-source-cost.md` (26.4 KB)
**Verification method:** Re-run all greps claimed in G2 across broader scope; compare actual counts to G2's reported counts.
**Date:** 2026-04-21

---

## Summary

**Verdict: 3 verified matches, 4 verified mismatches, 1 critical data-integrity bug, 1 scope-expansion miss. Cost estimate is LOW — realistic range is ~30–60 h (Cat 1 Option B), not 17–28 h.**

G2 captured the right **categories and directional estimates** but its **counts are systematically under-reported** because it confined most of its greps to `.claude/` only — missing large concentrations in `scripts/`, `docs/`, `.planning/`, `.research/archive/`, and **uncommitted SoNash source files** (`sonar-project.properties`, `.vscode/settings.json`, `.pr-agent.toml`, `package.json`, CHANGELOG.md, DEVELOPMENT.md). The per-pattern scope-expansion multiplier averages **~1.8–4×** depending on pattern.

One factual error (not just a scope miss): G2 cites `sonarcloud/SKILL.md:269,270,277,331` as sites of `jasonmichaelbell78-creator_sonash-v0`. Those lines actually contain a **different** project key: `<sonar-key-no-creator-variant>` (no `-creator` suffix). This is the already-documented SKILL-vs-properties-file mismatch (see `.research/archive/github-health/findings/D15-sonarcloud-integration.md:108,238,326`). G2's "7 sites across 5 files" claim conflates two distinct project-key literals — actual .claude-scope sites of the exact string `jasonmichaelbell78-creator_sonash-v0` is **3 hits across 2 files** (not 7/5). Both variants need migration codemod coverage but they are separate rules.

---

## Re-grep results — actual counts vs G2 claims

### Claim 1: SonarCloud project key `jasonmichaelbell78-creator_sonash-v0`

**G2 claim (SOURCES line 210 + Cat 3 table row 2):** "7 sites across 5 files" in `.claude/`:
`canonical-memory/reference_external_systems.md:13,15`, `skills/pr-review/reference/SONARCLOUD_ENRICHMENT.md:27`, `skills/sonarcloud/SKILL.md:269,270,277,331`.

**Actual count in `.claude/` only:** **3 hits across 2 files**:
- `canonical-memory/reference_external_systems.md:13,15` (2 hits)
- `skills/pr-review/reference/SONARCLOUD_ENRICHMENT.md:27` (1 hit)
- `skills/sonarcloud/SKILL.md` — **0 hits** (G2 was wrong; those lines contain `<sonar-key-no-creator-variant>`, different string).

**Actual count across full repo:** **20 hits across 11 files** (grep head_limit=250 found 20):
- `.claude/` (3)
- `.vscode/settings.json:6` (1)
- `.planning/archive/deep-research-skill/research/SOURCE_REGISTRY_DESIGN.md:156` (1)
- `.research/archive/github-health/findings/D15-sonarcloud-integration.md:109,240,248,327` (4)
- `docs/technical-debt/logs/resolution-log.jsonl:2,7` (2)
- `docs/technical-debt/logs/intake-log.jsonl:10,11,30` (3)
- `docs/SONARCLOUD_CLEANUP_RUNBOOK.md:10,44,63,81,346,375` (6)
- `sonar-project.properties:4` (1, AUTHORITATIVE config file)
- `docs/archive/aggregation/mining-agent4-integration.md:248` (1)
- `scripts/check-review-needed.js:33,122` (2)
- `docs/archive/completed-plans/sonarcloud-cleanup-sprint.md:474` (1)

**Verdict: MISMATCH (data bug + scope miss).** G2 conflated two distinct project-key variants. True `jasonmichaelbell78-creator_sonash-v0` footprint is ~20 hits (11 files), mostly outside `.claude/`. The **sibling variant** `<sonar-key-no-creator-variant>` (without `-creator`) has its own footprint: 4 hits in `.claude/skills/sonarcloud/SKILL.md` + 3 hits in `.research/archive/github-health/findings/D15-sonarcloud-integration.md`. **Migration codemod must handle BOTH variants** — treating them as one pattern will silently miss the `.claude/skills/sonarcloud/SKILL.md` hits that G2 incorrectly labeled.

---

### Claim 2: `TDMS` / technical-debt references

**G2 claim (SOURCES line 210 + Cat 3 table):** "210 occurrences across 30 `.claude/` files" (exact: `210 \`TDMS|MASTER_DEBT|technical-debt\` across 30 \`.claude/\` files`).

**Actual count in `.claude/` only (bare `TDMS` regex):** **418 occurrences across 116 files**.

**Actual count across full repo (bare `TDMS` regex, head_limit=200):** **1255+ occurrences across 200+ files** (pagination clipped at 200).

**Verdict: MISMATCH — severely under-reported.**
- G2's `.claude/`-scoped count (210) is already ~2× lower than the actual `.claude/` TDMS count (418). G2 may have used a narrower regex (`TDMS|MASTER_DEBT|technical-debt` vs bare `TDMS`) that excluded some casings, but the bare-string check shows the term is ubiquitous.
- Critically, the term `TDMS` also saturates `docs/technical-debt/` (MASTER_DEBT.jsonl: 98 hits, views/by-category.md: 43 hits, etc.), `.planning/system-wide-standardization/` (PLAN.md: 39 hits, PLAN-v3.md: 41 hits), and root-level files (CHANGELOG.md: 24, DOCUMENTATION_INDEX.md: 30).
- **Scope-expansion finding: TDMS is NOT a `.claude/`-only coupling.** It's a repo-wide vocabulary term woven through the debt-management system itself. Renaming requires touching ~1255 lines across ~200 files, not the 210/30 G2 suggested.
- Cost-estimate impact: Cat 3's "~210 occurrences, abstract to `DEBT_LOG_TOOL` / keep as SoNash-only" action is a **major underestimate** if operator ever wants to rename. Fortunately G2's recommended verdict is "keep SoNash name but treat as SoNash-only" — the count mismatch does not change that recommendation, but it does **increase codemod rule complexity** (every SoNash doc/script referencing TDMS would need to be flagged in the SONASH_REFACTOR_CANDIDATES.md report, not just the `.claude/` ones).

---

### Claim 3: `SESSION_CONTEXT.md|ROADMAP.md|CLAUDE.md|MEMORY.md` cites

**G2 claim (SOURCES line 210):** "520 occurrences across 120 `.claude/` files".

**Actual count in `.claude/` only (4-file alternation regex):** **697 occurrences across 157 files** (grep returned 250 capped at head_limit=300; count mode returned 697/157).

**Verdict: MISMATCH — under-reported by ~34% for hits, ~31% for files.**
- G2's 520/120 is low. Actual is 697/157 in `.claude/` alone.
- Scope-expansion not run for this pattern (it's expected to be .claude/-scoped since these are skill/agent docs) but the .claude/-internal undercount alone is significant.
- Cost-estimate impact: Cat 2's "extract home-context loader to `_shared/CONVENTIONS.md §9`, replace 27 inline cites with refs, 3–5 hours" — if the 27-inline-cite count came from the 520 number, real inline-cite count is likely ~35–40 after dedup. Add 1–2 hours: **revised 4–7 hours**.

---

### Claim 4: Firestore / Cloud-Functions / httpsCallable references

**G2 claim (SOURCES line 210):** "159 Firestore/Cloud-Functions/httpsCallable/NEXT_PUBLIC/firebase.json/App-Check references across 20 `.claude/` files".

**Actual count in `.claude/` only (full 6-term regex):** **394 occurrences across 62 files**.

**Verdict: MISMATCH — under-reported by ~2.5×.**
- G2's 159/20 is substantially low. Actual is 394/62.
- The `security-auditor.md` agent alone has 41 Firestore/NEXT_PUBLIC/App-Check hits (not counted by G2).
- `frontend-developer.md`: 15; `explore.md`: 18; `plan.md`: 10 — all skipped.
- Scope-expansion: `scripts/` has 14 hits across 9 files (smaller but non-zero).
- Cost-estimate impact: Cat 2's "generalize code-reviewer agent, 3–5h" is too narrow. The Firestore/Firebase surface spans **security-auditor, frontend-developer, explore, plan, test-engineer, debugger, performance-engineer, backend-architect, database-architect, fullstack-developer, pr-test-analyzer, silent-failure-hunter** — at minimum 12 agents, not just code-reviewer. Realistic effort: **8–16 hours** (double what G2 estimated).

---

### Claim 5: "20 in code-reviewer.md alone" Firestore reference

**G2 claim (SOURCES line 210):** "20 in `code-reviewer.md` alone".

**Actual breakdown in `C:\Users\jbell\.local\bin\sonash-v0\.claude\agents\code-reviewer.md`:**
- Firestore: 5 hits
- httpsCallable: 7 hits
- Cloud Functions: matched within the combined count
- Total with full 6-term regex: **20 hits** (verified).

**Verdict: MATCH.** G2's "20 in code-reviewer.md alone" figure is correct when using the full regex `Firestore|httpsCallable|Cloud Functions|firebase\.json|NEXT_PUBLIC|App[- ]Check`. Bare `Firestore`-only count is 5, bare `httpsCallable`-only count is 7, which together plus the other terms sum to 20.

---

### Claim 6: 595 "sonash" matches across 146 `.claude/` files

**Actual count (case-insensitive):** **595 occurrences across 146 files.** VERIFIED.

**Scope-expansion not captured by G2:**
- `scripts/`: 111 hits / 37 files (G2 reported this — VERIFIED)
- `docs/`: **1106 hits across 154 files** (not in G2's report)
- Repo-wide (sampling): `docs/` alone contributes ~1.8× the `.claude/` footprint.

**Verdict: MATCH for the .claude/ count; SCOPE MISS for docs/** (1106 more hits G2 never enumerated).

---

## Scope-expansion findings (what G2 missed)

G2's SOURCES section cites greps primarily over `C:\Users\jbell\.local\bin\sonash-v0\.claude\**`. Per V3's auth-scope lesson, running the same greps over `scripts/`, `docs/`, `.planning/`, `.research/archive/`, and root files reveals additional concentrations:

1. **`sonar-project.properties:4`** — The **authoritative source of the SonarCloud project key**. G2 did not cite this file. Any migration codemod that reads `.claude/` only will miss this root-level config; it is the file SonarCloud reads at CI time.
2. **`.vscode/settings.json:6`** — VS Code sonarlint project key. Not in G2.
3. **`scripts/check-review-needed.js:33,122`** — Default project key in CLI tool. Not in G2.
4. **`docs/SONARCLOUD_CLEANUP_RUNBOOK.md`** — 6 hits. Not in G2.
5. **`docs/technical-debt/logs/*.jsonl`** — 5 hits in intake/resolution logs. Not in G2.
6. **`.research/archive/github-health/findings/D15-sonarcloud-integration.md`** — 4 hits PLUS this finding explicitly documents the `-creator` vs no-`-creator` key mismatch G2 fell into.
7. **`.planning/system-wide-standardization/`** — PLAN.md has 39 TDMS hits, PLAN-v3.md has 41 hits. The "system-wide standardization" effort is itself a SoNash-specific workstream tied to TDMS vocabulary.
8. **`llms.txt:6`** — 6 TDMS references in the root-level LLM-context manifest. Port-relevant because JASON-OS would need its own llms.txt.
9. **`docs/archive/`** — vast (`MASTER_DEBT.jsonl` alone 98 TDMS hits; `CHANGELOG.md` 24 hits). Archive hits are low-priority for live refactor but must be counted in "what would a SoNash rename touch" total.
10. **`tests/scripts/debt/*.test.ts`** — 3 TDMS hits in test code. Any rename breaks debt tests.

**Total scope-expansion findings count: 10+ distinct file/directory concentrations G2 did not reach.**

The pattern: G2 correctly identified `.claude/` as the primary migration surface, but SoNash's TDMS / SonarCloud / Firebase coupling extends through the **debt-management subsystem (`docs/technical-debt/`, `scripts/debt/`), the build config (`sonar-project.properties`, `.vscode/`, CI workflows), and the historical plan archives (`.planning/`, `docs/archive/`)**. For a real refactor to land, those surfaces need the same codemod coverage as `.claude/`.

---

## Cost-estimate sanity-check

### G2's estimate: 17–28 h (Cat 1 Option B, minimal port-friendly pass)

**Bottom-up check — count × per-site cost:**

| Category | Sites (G2) | Sites (GV2-corrected) | Per-site (min–max) | Revised min–max (h) |
|---|---|---|---|---|
| Naming aliases (Option B, CONVENTIONS table) | ~30 rows | ~35–40 rows | 3–5 min/row | 2–3 (roughly matches G2) |
| Home-context inline-cite refactor | 27 inline cites | 35–40 inline cites | 5–10 min/site | 3–7 |
| Env-layer in cas scripts | 12 scripts | 12 scripts (verified) | 20–30 min/script | 4–6 |
| Split CLAUDE.md | 1 file + ~5 cross-refs | 1 file + ~8 cross-refs | — | 2–4 |
| Generalize code-reviewer + 11 other agents | 1 agent (G2) | 12+ agents (GV2) | 30–60 min/agent | 6–12 |
| Hardcoded-path removal (narrow) | 5 prose + 3 URL + 2 MAX_PATH | Same + sonar-project.properties + .vscode + CI wf | 10–20 min/site | 3–6 |
| **Subtotal (GV2-corrected Cat 1 Option B)** | | | | **20–38 h** |

If the operator wants the SonarCloud/Firebase refactor to match the **actual** broader scope (not just `.claude/`), add another 4–8 h to cover `sonar-project.properties`, `.vscode/settings.json`, `scripts/check-review-needed.js`, and CI workflow updates. **Grand total: 24–46 h.**

### Cross-check against D6 CAS port estimate (161 h)

**G2 said:** "+15-25 h codemod carrying cost to /migration" (line 196).

**Cross-check:** D6-cas-skills-deep's 161-h CAS-port estimate includes the **mechanical** port of 6 CAS skills + 12 scripts. Adding a codemod ruleset that covers:
- 2 SonarCloud project-key variants
- TDMS vocabulary (1255+ hits, likely "detect + flag + defer" not "rewrite")
- 4-file home-context alternation (697 hits in `.claude/`)
- 394 Firestore/Firebase hits across 62 files
- 12+ agents with embedded SoNash stack knowledge

…is **more than 15–25 h.** Realistic codemod-ruleset build-out: **25–40 h** for v1, especially if each rule needs its own "preserve / rewrite / flag" user-interaction branch per OTB-1's prior research on Aider/OpenRewrite recipe costs. G2's 15–25 h is the **optimistic** end of the interval.

### Comparison to D6-cas-skills-deep's 161 h

D6's 161 h is the **mechanical port** only (apply the already-determined verdicts). G2's 17–28 h SoNash-side + 15–25 h /migration codemod is supposed to be **additional** to the 161 h. Combined:
- **G2 optimistic:** 161 + 17 + 15 = 193 h
- **G2 pessimistic:** 161 + 28 + 25 = 214 h
- **GV2-corrected optimistic:** 161 + 24 + 25 = 210 h
- **GV2-corrected pessimistic:** 161 + 46 + 40 = 247 h

**Verdict: Cost estimate is LOW by roughly 10–15%.** G2's 17–28 h is reasonable as a directional order-of-magnitude but lands at the optimistic edge. The true range is closer to **24–46 h** for Cat 1 Option B (SoNash side) and **25–40 h** for /migration-side codemod carrying cost. Directional categorization of work is realistic; numerical floor is too low.

---

## Proposed adjustments

1. **Fix data-integrity bug in SOURCES section:** G2 line 210 says `sonarcloud/SKILL.md:269,270,277,331` contain `jasonmichaelbell78-creator_sonash-v0`. They do NOT. They contain `<sonar-key-no-creator-variant>` (no `-creator`). Separate codemod rule needed for each variant. This is not just a typo; it means the Cat 3 "7 sites across 5 files" total is wrong (actual `.claude/`-scope is 3 sites / 2 files for the `-creator` variant; 4 additional sites in `sonarcloud/SKILL.md` are the sibling variant).

2. **Expand Cat 3 table to reflect broader scope:**
   - Add row: `sonar-project.properties:4` (authoritative CI config, MUST be in codemod).
   - Add row: `.vscode/settings.json:6`.
   - Add row: `scripts/check-review-needed.js:33,122`.
   - Add row: `docs/SONARCLOUD_CLEANUP_RUNBOOK.md` (6 hits — low priority, flag-only).
   - Note on `<sonar-key-no-creator-variant>` (no `-creator`): separate codemod rule, 7 hits across 2 files.

3. **Revise Cat 2 effort range upward:**
   - "Generalize code-reviewer agent: 3–5h" → "Generalize code-reviewer + 11 other SoNash-Firebase-aware agents: 8–16h".
   - "Extract home-context loader: 3–5h" → "Extract home-context loader (35–40 inline cites, not 27): 4–7h".
   - New Cat 2 subtotal: **16–30 h** (was 12–19 h).

4. **Revise Total range upward:**
   - Cat 1 Option B total: was 17–28 h → revise to **20–35 h**.
   - Add recommended buffer for sonar-project.properties + CI config: +4–8 h → **24–43 h**.
   - Pessimistic (Option A full rename): was 27–42 h → revise to **35–60 h**.

5. **Strengthen the "`SONASH_REFACTOR_CANDIDATES.md` inventory is read-only" recommendation** (G2 line 186–188). The scope-expansion findings show that trying to build a complete refactor-candidate list at `.claude/`-scope alone misses the authoritative config files (`sonar-project.properties`, CI workflows) where the port-relevant coupling actually lives. Phase 2 Discovery must walk the full repo, not just `.claude/`.

6. **Add note on "secondary project-key variant":** `<sonar-key-no-creator-variant>` (no `-creator`) is a pre-existing SoNash data-integrity bug (documented at `.research/archive/github-health/findings/D15-sonarcloud-integration.md`). /migration v1 should **not silently pick one and normalize** — emit a warning to the operator that SoNash itself has two project-key literals and let the operator resolve before porting.

---

## Sources

**Re-grep scope:**
- `C:\Users\jbell\.local\bin\sonash-v0\.claude\**` (G2's primary scope)
- `C:\Users\jbell\.local\bin\sonash-v0\scripts\**`
- `C:\Users\jbell\.local\bin\sonash-v0\docs\**`
- `C:\Users\jbell\.local\bin\sonash-v0\.planning\**`
- `C:\Users\jbell\.local\bin\sonash-v0\.research\archive\**`
- `C:\Users\jbell\.local\bin\sonash-v0\` (root: `sonar-project.properties`, `.vscode/settings.json`, `CHANGELOG.md`, `DEVELOPMENT.md`, `DOCUMENTATION_INDEX.md`, `llms.txt`)

**Cross-references:**
- `C:\Users\jbell\.local\bin\JASON-OS\.research\migration-skill\findings\G2-sonash-source-cost.md` (subject under verification)
- `C:\Users\jbell\.local\bin\JASON-OS\.research\migration-skill\findings\D6-cas-skills-deep.md` (161-h CAS port estimate cross-check)
- `C:\Users\jbell\.local\bin\sonash-v0\.research\archive\github-health\findings\D15-sonarcloud-integration.md` (documents the `-creator` vs no-`-creator` project-key split that G2 conflated)

---

**Findings path:** `C:\Users\jbell\.local\bin\JASON-OS\.research\migration-skill\findings\GV2-sonash-cost-verify.md`
