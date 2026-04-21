# GAP — G2-sonash-source-side-refactoring-cost

**Agent:** Phase 3.95 gap-pursuer G2 (deep-research-gap-pursuer persona)
**Sub-question:** SQ-G2 — What silent refactoring cost does /migration impose on SoNash itself?
**Depth:** L1 (file:line citations for SoNash evidence)
**Date:** 2026-04-21
**Context:** BRAINSTORM §5 Q6 + D19 reshape-during-port; OTB NT-2 (challenges/otb.md:745-751) flagged source-side refactor cost as systematically absent from the port estimates; new claim C-127 already sized it at "~20-40h SoNash" (otb.md:820).

---

## Summary

The /migration skill imposes a **silent source-side (SoNash) refactoring bill** that the 143-hour CAS port estimate in D6 findings does not contain. Every PARAMETERIZE / RESHAPE / sanitize verdict that invokes an env-var, config contract, or abstract naming forces a matching refactor in SoNash to expose that knob — OR the coupling lives on in SoNash forever while /migration does extra work at port-time.

**Six refactoring categories identified** across 4 scopes (naming, separation-of-concerns, hardcoded paths, cross-repo coordination) with a **total effort envelope of 24–44 person-hours** for a minimal "port-friendly" pass over SoNash.

**Core evidence:**
- **89 coupling sites across 6 CAS skills** (D6-cas-skills-deep.md:14) of which the mechanical portions (~60 path/DB/root cites) compress to ~8 env-var contracts. Every one of those contracts requires SoNash to plumb the env-var through — not just JASON-OS to read it. This is the hidden SoNash-side cost.
- **18 SoNash-domain terms** in D6-cas-planning.md §5 (e.g. `creator` / `Creator View` / `CAS` / `session_context` / `TDMS`) that permeate file names, CLI flag values, enum values, prose prompts, and filename slugs. Source-side neutralization = rename-and-redirect pass.
- **68 coupling sites across 12 CAS scripts** (D6-cas-scripts-deep.md:14) — every file has `PROJECT_ROOT = path.resolve(__dirname, "../..")` as a hard SoNash anchor, and legacy-dir fallbacks (`.research/repo-analysis/`, `.research/website-analysis/`) carry SoNash v2→v3 history that JASON-OS never had.
- **New hardcoded references found beyond the 18-term glossary** (not enumerated in prior D-agent work):
  - `jasonmichaelbell78-creator_sonash-v0` — SonarCloud project key, appears in 5 SoNash files: `.claude/canonical-memory/reference_external_systems.md:13,15`, `.claude/skills/pr-review/reference/SONARCLOUD_ENRICHMENT.md:27`, `.claude/skills/sonarcloud/SKILL.md:269,270,277,331`.
  - `jasonmichaelbell78` — SonarCloud org default, `.claude/skills/sonarcloud/SKILL.md:54,332`.
  - `sonash-app` — Firebase project ID (`.env.production:7`, `.env.local.example:32`, `.github/workflows/deploy-firebase.yml:67`). Repo-analysis skill does NOT reach this but deploy/safeguard hook does (`.claude/hooks/deploy-safeguard.js:81`).
  - **595 "sonash"-matching lines across 146 `.claude/` files**, **254 in `.claude/` alone at count level**, **111 in `scripts/`** (`C:\Users\jbell\.local\bin\sonash-v0\.claude\**` grep counts) — most are benign prose (agent descriptions like "SoNash-specific test analyzer") but SONAR/agent hardcodes + code-reviewer's 20 Firestore/httpsCallable references constitute real coupling.
- SoNash CLAUDE.md v6.0 already acknowledges three SoNash-specific ports of truth (`SESSION_CONTEXT.md`, `ROADMAP.md`, `CLAUDE.md` itself) at line 183 ("Before refactoring: Check SESSION_CONTEXT.md and ROADMAP.md first") and three SoNash-specific app-level rules at §2 and §5 (`migrateAnonymousUserData`, `COOP/COEP headers`, `httpsCallable` mocking). These are NOT currently sandboxed as SoNash-local by a contract; they live in the "universal guardrails" section.

---

## Refactoring categories + estimated effort

### Category 1 — Naming conventions (config-driven vocab)

**What's coupled:**
- 18 SoNash-domain terms in D6-cas-planning.md §5 glossary: `Creator`/`Creator View`/`Creator Lens`, `creator-view.md` filename, `CAS`, 7 SoNash-specific skill names, `SESSION_CONTEXT.md`, `ROADMAP.md`, `active sprint`, `EXTRACTIONS.md`, `extraction-journal.jsonl`, `research-index.jsonl`, `home context`, `home repo guard`, `--focus`, `TDMS`, T-numbers, Session-numbers, `.research/`, `MEMORY.md`.
- Verdict categories from D6-cas-planning.md §4: 34 PARAMETERIZE + 19 RESHAPE entries (total 53) touch vocabulary.
- `creator-view.md` filename alone appears in `.claude/skills/synthesize/SKILL.md:174`, `repo-analysis/SKILL.md:195`, and downstream artifact catalogs — renaming is a 30+ file cascade.

**Source-side cost to neutralize:**
- **Option A (aggressive):** Rename everything in SoNash right now — `creator-view.md` → `analysis-view.md`, `Creator Lens` → `Primary Lens`, `active sprint` → `active cycle`, `TDMS` → debt-log abstraction. **Cost: 12–18 hours.** Breaks muscle memory, breaks prose in ~50 SKILL/REFERENCE lines, requires migration of existing `.research/analysis/**/creator-view.md` files (24 repos × creator-view.md), breaks links in `DOCUMENTATION_INDEX.md` + `ROADMAP.md` body text. Offers nothing to SoNash operators in exchange.
- **Option B (minimal — alias layer):** Keep SoNash names; add a CONVENTIONS.md §20 "Portable Vocabulary" table that maps SoNash-term → neutral-term and declares the neutral form canonical at port-time. /migration reads the table, renames during port. **Cost: 2–4 hours.** SoNash behavior unchanged; table is ~30 rows.
- **Option C (hybrid — rename the 5 most-offending):** Rename only `creator-view.md` → `analysis-view.md` (already called out as "most visible" in D6-cas-planning §6 callout 2), swap `active sprint` → `active cycle` (agile-term callout), rest stay. **Cost: 4–6 hours.**

**Recommendation: Option B** for /migration v1. The rename pressure is real but no JASON-OS downstream demands it yet; pay when the second destination-repo demands it.

---

### Category 2 — Separation of concerns (domain vs repo-specific vs skill scaffolding)

**What's coupled (from D6-cas-skills-deep.md:34-44 coupling-type frequency):**
- 27 home-context-file cites (SESSION_CONTEXT.md, ROADMAP.md, CLAUDE.md, MEMORY.md, `.claude/skills/`) embedded directly in SKILL.md + REFERENCE.md bodies of 4 Creator-View-producing handlers. SoNash-side cost: extract the load sequence to `.claude/skills/_shared/CONVENTIONS.md §9` (exists per D6 note), THEN replace all inline cites with a one-line reference to §9. The §9 abstraction already exists; the SKILL/REFERENCE bodies still duplicate the list.
- 17 CAS-helper-script path cites (`scripts/cas/*.js`) — D6-cas-scripts-deep.md:17 finds `PROJECT_ROOT = path.resolve(__dirname, "../..")` in **12 of 12** scripts. SoNash-side cost: introduce a `CAS_SCRIPTS_ROOT` / `RESEARCH_ROOT` env layer that scripts honor. Currently they all compute root from `__dirname`.
- code-reviewer agent has **20 Firestore/Cloud Functions references** mixed with generic code-review concerns (`.claude/agents/code-reviewer.md`, grep count). Per prior research D5-internal-delta-analysis.md:191-209 (SoNash-side existing finding): "10 of the 10 documented patterns all need replacement or generalization." That's already known but unfunded; /migration turns it from "nice-to-have" to "blocker for code-reviewer port."
- CLAUDE.md itself mixes §1 stack versions (SoNash-specific) with §4-5 guardrails + anti-patterns (generic). JASON-OS has already extracted the generic portion (JASON-OS CLAUDE.md v0.1 is a "Sanitized extraction from SoNash CLAUDE.md v6.0" per its v0.1 footer) — so the extraction already happened once; the question is whether SoNash back-ports the cleaned split.

**Source-side cost:**
- **Extract home-context loader to `_shared/CONVENTIONS.md §9`** and replace 27 inline cites with refs: **3–5 hours**. (Cross-check: D6-cas-skills-deep.md already notes "One CONVENTIONS reshape benefits all.")
- **Introduce `CAS_SCRIPTS_ROOT` / `RESEARCH_ROOT` / `CAS_DB_PATH` env layer in 12 cas scripts** (replace `PROJECT_ROOT = path.resolve(__dirname, "../..")` with env-aware helper). D6-cas-scripts-deep.md:17 confirms this is the dominant coupling axis: **4–6 hours**.
- **Split `CLAUDE.md` into `CLAUDE.md` (generic guardrails) + `CLAUDE.sonash.md` (stack + app-specific rules)**: **2–3 hours**, plus ~1 hour to update all references. Risky — muscle memory says "check CLAUDE.md," not "check CLAUDE.sonash.md."
- **Generalize code-reviewer agent** (extract SoNash-specific rules to separate agent `sonash-reviewer` or to a config file): **3–5 hours**, per D5-internal-delta-analysis existing analysis.

**Subtotal: 12–19 hours.** Highest-leverage: the `CONVENTIONS.md §9` extraction + env-layer in cas scripts. Both are already identified as needed in D6 findings.

---

### Category 3 — Hardcoded-path removal (pre-port hygiene pass)

**What's coupled (beyond the 18-term glossary, from this G2 agent's grep):**

| Hardcoded value | Where | Count | SoNash-side action |
|---|---|---|---|
| `jasonmichaelbell78-creator/sonash-v0` | `repo-analysis/SKILL.md:68,431`, `REFERENCE.md:1336` | 3 | Replace with `HOME_REPO_URL` env / config lookup |
| `jasonmichaelbell78-creator_sonash-v0` | `canonical-memory/reference_external_systems.md:13,15`, `sonarcloud/SKILL.md:269,270,277,331`, `pr-review/reference/SONARCLOUD_ENRICHMENT.md:27` | 7 | Config: `SONAR_PROJECT_KEY` env (already partially parametrized per SONARCLOUD_ENRICHMENT.md:27 default) |
| `jasonmichaelbell78` (SonarCloud org) | `sonarcloud/SKILL.md:54,332` | 2 | Config: `SONAR_ORG` (already parametrized per L54 default) |
| `sonash-app` (Firebase project) | `.env.production:7`, `.env.local.example:32`, `.github/workflows/deploy-firebase.yml:67` | 3 | Already env-var (`NEXT_PUBLIC_FIREBASE_PROJECT_ID`) — the hardcoded default is in `.env.production` which is SoNash-specific-config anyway; JASON-OS downstream never touches this. **No action needed.** |
| `C:\Users\<user>\Workspace\dev-projects\<project>\` (MAX_PATH example) | `document-analysis/REFERENCE.md:756`, `media-analysis/REFERENCE.md:816` | 2 | Rewrite example to `<TARGET_REPO_ROOT>` placeholder |
| `SoNash-specific` prose mentions in examples | `repo-analysis/REFERENCE.md:656,787,1725,1810`, `synthesize/REFERENCE.md:634-635` | 5 | Replace with `<home-repo>` placeholder |
| `creator-view.md` filename | Multiple per-skill + `.research/analysis/**/creator-view.md` | 30+ | See Category 1 |
| `SESSION_CONTEXT.md` / `ROADMAP.md` hard-cited | 520 occurrences across 120 `.claude/` files (grep count) | 520 | Bulk: abstract via `HOME_CONTEXT_FILES[]` config — see Category 2 |
| `TDMS` (SoNash's Technical Debt Management System) | 210 occurrences across 30 `.claude/` files (grep count) | 210 | Abstract to `DEBT_LOG_TOOL` / keep SoNash name but treat as SoNash-only |
| T-numbers (T28, T29, T47…) + Session-numbers (#267–#287) | Scattered in `.planning/` docblocks + D6-cas-planning §4 entries 70–72 | many | Per D6-cas-planning OBSOLETE verdict — strip at port time, no SoNash-side action |

**Source-side cost:**
- Replace 3 cites of `jasonmichaelbell78-creator/sonash-v0` home-repo guard with env/config lookup: **1–2 hours** (code + test).
- Already-parametrized SonarCloud values — verify defaults are the only hardcode; remove defaults or make them env-resolved-first: **1 hour**.
- Rewrite 5 SoNash-specific prose examples to generic placeholders: **1 hour**.
- Rewrite 2 Windows-path examples to `<TARGET_REPO_ROOT>` placeholder: **0.5 hours**.
- Bulk abstract `HOME_CONTEXT_FILES[]` is already in Category 2.

**Subtotal (unique to this category): 3–5 hours.**

---

### Category 4 — Cross-repo coordination (who owns SoNash refactors when /migration runs FROM JASON-OS?)

**D14 axiom (BRAINSTORM.md:63):** "Not mandatory — user can `/sync` a file without ever invoking `/migration`."

**Implication:** SoNash-side refactoring **must not be a blocker for /sync or for /migration itself to land.** SoNash refactors are an optional "prep pass" that the operator can elect to run from JASON-OS (or from SoNash locally) as a distinct session. They should NOT be rolled into a /migration run silently.

**Three coordination patterns:**

1. **SoNash-local pass — operator runs the refactors in SoNash with SoNash's own tools** (code-reviewer agent, skill-audit, manual Grep). No /migration involvement. SoNash commits land in `jasonmichaelbell78-creator/sonash-v0` main. This is D14-clean: /sync can keep doing its job; /migration can later pull from cleaned SoNash.
2. **JASON-OS-driven pass — /migration in "prep mode" makes cross-repo edits to SoNash.** OTB C-128 proposes a Phase `-1` "source-side prep" gate (otb.md:267-270). **Risk per D14**: this makes /migration mandatory for proper porting, which D14 explicitly rejects. **Recommendation: DO NOT build Phase `-1` into /migration v1.** Instead, /migration v1 emits `SONASH_REFACTOR_CANDIDATES.md` — a read-only inventory the operator can execute later from SoNash.
3. **Hybrid — /migration detects refactor-debt and reports without mutating.** /migration v1 during Phase 2 Discovery writes a "source-hygiene score" to the MIGRATION_PLAN.md. Operator decides whether to act on it in SoNash before committing the port. This is the **recommended v1 shape**: /migration stays observational on the source side; SoNash owns its own refactors.

**Who owns the SoNash refactors?** Per D14, the operator (jbell) owns them. /migration can RECOMMEND but never SILENTLY MUTATE SoNash. The ownership boundary is sharp: /migration writes to JASON-OS (destination); SoNash is read-only to /migration except when /sync is invoked for a specific file and the operator approves.

**Source-side cost specific to coordination:** 0 direct hours (it's a policy decision, not work). Downstream cost: the operator does the Cat 1/2/3 work in SoNash as separate sessions.

---

### Category 5 — Estimation — total SoNash-side refactoring effort

| Category | Min (h) | Max (h) | Notes |
|---|---|---|---|
| 1 — Naming (Option B: alias table) | 2 | 4 | Recommended |
| 1 — Naming (Option C: rename 5 most-offending) | 4 | 6 | If operator wants less alias-mapping burden |
| 2 — Separation of concerns | 12 | 19 | Highest-value category |
| 3 — Hardcoded-path removal | 3 | 5 | Narrow beyond what Cat 2 already touches |
| 4 — Cross-repo coordination | 0 | 0 | Policy, not work |
| **Total (Cat 1 Option B)** | **17** | **28** | Minimal port-friendly pass |
| **Total (Cat 1 Option C)** | **19** | **30** | Hybrid rename pass |
| **Total (Cat 1 Option A — full rename)** | **27** | **42** | Aggressive; not recommended |

**Reconciliation with OTB C-127:** C-127 estimated "~20-40h SoNash-side pre-port refactor" (otb.md:820). This G2 finding sharpens that to **17–28 h for the minimal pass** (Option B), **27–42 h if the full rename is done** (Option A). C-127 was directionally correct; this decomposition gives the menu.

**Unsized risk: code-reviewer generalization.** D5-internal-delta-analysis.md:209 flags "10 of the 10 documented patterns all need replacement or generalization" — already counted in Category 2's 3–5h. But D5 was itself a shallow estimate; real number could be higher (8–15h) if the agent's SonarCloud/Firestore knowledge has to be re-templated rather than cut. This is upside on the range.

---

## Refactor-sonash-vs-absorb-in-migration tradeoff

Two architectural alternatives to pricing SoNash refactors directly:

**Alternative A — Refactor SoNash.** The 17–28h Option-B pass above. Pay the cost once; every future port from SoNash is cheaper. Naming aliases + env-var plumbing + CONVENTIONS §9 extraction + code-reviewer generalization become permanent SoNash assets.

**Alternative B — Absorb the messiness in /migration.** /migration v1 ships with:
- A vocab-translation table built into its own config (SoNash-term → neutral-term mapping; 18 rows).
- A path-rewriting engine (already planned per Aider/OpenRewrite recipes research OTB-1) that handles `PROJECT_ROOT = __dirname + ../..` patterns at port-time.
- A home-repo-guard stripper that rewrites `jasonmichaelbell78-creator/sonash-v0` literals to a `<HOME_REPO>` placeholder at port-time.
- A pre-port linter that flags the 595 "sonash" references and asks the operator "keep / rewrite / skip" per file.

**Tradeoff analysis:**

| Axis | Refactor-SoNash | Absorb-in-/migration |
|---|---|---|
| Up-front cost | 17–28 h SoNash + 0 h /migration | 0 h SoNash + 15–25 h /migration (larger codemod surface) |
| Per-port cost (future ports) | Near-zero (already clean) | Medium (codemod rules must grow with each new coupling) |
| Breakage risk to SoNash | Medium (rename pass touches 30+ files) | Zero (SoNash unchanged) |
| D14 compliance | Neutral (operator can choose to refactor or not) | **Fully compliant** (SoNash never forced to change) |
| D19 compliance (CAS reshape during CAS port) | Compatible — refactor SoNash pre-port, CAS port is then clean | Compatible — CAS port carries codemod rules instead |
| Second-destination-repo payoff | HIGH (any future destination benefits) | LOW (every destination re-runs the same codemods) |
| Reversibility | LOW (undoing a SoNash rename is a commit revert + cascade) | HIGH (disable codemod rule, next port comes through raw) |
| Self-dogfood coherence | Better — dogfoods clean sources | Worse — dogfoods codemod-patched output |

**Decision point:** If JASON-OS is the ONLY destination /migration will ever serve, Alternative B (absorb) is cheaper short-term — the codemod rules only have to be built once, and the SoNash codebase keeps its accumulated history unchanged. If there will be a **second destination** (a future "JASON-OS v2", a teammate's clone, a public extraction), Alternative A (refactor SoNash) wins because every second-destination port skips the codemod reconstruction.

**Current-world assessment:** JASON-OS is the only declared destination. Alternative B is the cheaper short-term path **for v1**. Move to Alternative A incrementally as specific pain accumulates (e.g., operator hits the `HOME_REPO_URL` hardcode 3 times in 3 separate port sessions → then refactor it in SoNash).

---

## Recommendation for /migration v1

**Adopt a HYBRID strategy: absorb-in-/migration as default, emit a SONASH_REFACTOR_CANDIDATES.md to invite optional SoNash-side hygiene.**

Concrete shape:

1. **/migration v1 is observational on SoNash.** Phase 2 Discovery reads SoNash, never writes. Phase 5 Execute writes only to JASON-OS. This preserves D14 (user can /sync without /migration) and D19 (CAS reshape during port, not pre-port).

2. **/migration v1 carries codemod rules internally** for the top 10 most-common patterns (derived from this G2 inventory):
   - `jasonmichaelbell78-creator/sonash-v0` → `<HOME_REPO_URL>` placeholder
   - `jasonmichaelbell78-creator_sonash-v0` (SonarCloud) → `<SONAR_PROJECT_KEY>` placeholder
   - `PROJECT_ROOT = path.resolve(__dirname, "../..")` → `PROJECT_ROOT = process.env.PROJECT_ROOT || path.resolve(__dirname, "../..")`
   - `.research/` → `${RESEARCH_ROOT}/` (env-templated)
   - `SESSION_CONTEXT.md` / `ROADMAP.md` hard-cites → `HOME_CONTEXT_FILES[]` config lookup
   - `scripts/cas/` → `${CAS_SCRIPTS_ROOT}/`
   - `creator-view.md` filename → `analysis-view.md` OR alias-preserve (operator choice at port-time)
   - `SoNash` prose mentions in examples → `<home-repo>` placeholder
   - `C:\Users\...\Workspace\dev-projects\` MAX_PATH examples → `<TARGET_REPO_ROOT>` placeholder
   - `TDMS` references → `<DEBT_LOG_TOOL>` placeholder OR strip

3. **Phase 2 Discovery emits `SONASH_REFACTOR_CANDIDATES.md`** — a read-only inventory flagging:
   - How many files needed codemod work (what /migration had to absorb).
   - Which patterns recurred 3+ times (candidate for SoNash-side permanent refactor).
   - Rough effort estimate if operator runs the refactor in SoNash directly.
   This is the "you might want to fix these upstream" report without mandating anything.

4. **Operator-owned SoNash refactor pass** becomes a separate workflow the operator chooses to run from SoNash (not from /migration). The candidates file is the seed.

5. **Defer Phase `-1` "source-side prep" gate (C-128)** to /migration v1.5+ if, empirically, the codemod rules grow unwieldy. Decision criterion: if /migration's codemod ruleset exceeds ~25 rules OR if operator has to re-run the same codemod 3+ times for the same target, promote the top offenders to SoNash-side refactors.

6. **Naming: Category 1 Option B** (alias table in CONVENTIONS) is the v1 approach. Option C (rename `creator-view.md` + `active sprint`) deferred; revisit after first real port completes.

**Estimated SoNash-side cost for /migration v1 acceptance: 0 hours** (operator defers to candidate file).
**Estimated SoNash-side cost if operator chooses to act on the candidate file: 17–28 hours** (Category 1 Option B total).
**Estimated /migration-side cost to carry the codemod rules: 15–25 hours** (added to /migration's existing 143h CAS-port envelope, bringing realistic total to ~160–170h).

This recommendation preserves D14 (non-mandatory), D19 (reshape-during-port not pre-port), and C-128's insight (source-side prep is real) while avoiding Phase `-1` mandates that would break the "user can /sync without /migration" axiom.

---

## Sources

**Primary — this agent's own SoNash grep evidence:**
- `C:\Users\jbell\.local\bin\sonash-v0\.claude\canonical-memory\reference_external_systems.md:10-15` (GitHub URL, SonarCloud project key, SonarCloud URL — 4 hardcoded lines)
- `C:\Users\jbell\.local\bin\sonash-v0\.claude\skills\pr-review\reference\SONARCLOUD_ENRICHMENT.md:27` (`SONAR_PROJECT_KEY` default)
- `C:\Users\jbell\.local\bin\sonash-v0\.claude\skills\sonarcloud\SKILL.md:54,269,270,277,331,332` (SonarCloud project key + org hardcodes)
- `C:\Users\jbell\.local\bin\sonash-v0\.claude\skills\repo-analysis\SKILL.md:68,431` + `REFERENCE.md:1336` (home-repo guard triple-cite)
- `C:\Users\jbell\.local\bin\sonash-v0\.env.production:7`, `.env.local.example:32`, `.github/workflows/deploy-firebase.yml:67` (Firebase `sonash-app` project ID — already env-var'd)
- Grep counts: 520 `SESSION_CONTEXT.md|ROADMAP.md|CLAUDE.md|MEMORY.md` cites across 120 `.claude/` files; 497 `creator.view|creator lens|creator-view\.md|/repo-analysis|/synthesize|/recall|/analyze` across 24 skill files; 233 `scripts/cas/|content-analysis\.db|\.research/` across 31 skill files; 210 `TDMS|MASTER_DEBT|technical-debt` across 30 `.claude/` files; 595 "sonash" matches across 146 `.claude/` files; 111 "sonash" matches across 37 `scripts/` files; 159 Firestore/Cloud-Functions/httpsCallable/NEXT_PUBLIC/firebase.json/App-Check references across 20 `.claude/` files (20 in `code-reviewer.md` alone).
- `C:\Users\jbell\.local\bin\sonash-v0\CLAUDE.md:183` (existing "Check SESSION_CONTEXT.md and ROADMAP.md" acknowledgment).

**Cross-reference — prior D-agent findings:**
- `C:\Users\jbell\.local\bin\JASON-OS\.research\migration-skill\findings\D6-cas-planning.md:12-29` (~72 domain assumptions, 18-term glossary, 34 PARAMETERIZE + 19 RESHAPE verdict counts).
- `C:\Users\jbell\.local\bin\JASON-OS\.research\migration-skill\findings\D6-cas-skills-deep.md:14,30-44,255-305` (89 coupling sites; coupling-type frequency; Tier-A-B-C-D reshape-difficulty ranking).
- `C:\Users\jbell\.local\bin\JASON-OS\.research\migration-skill\findings\D6-cas-scripts-deep.md:14-17` (68 coupling sites in 12 scripts; PROJECT_ROOT anchor in 12/12; lib dependency surface).
- `C:\Users\jbell\.local\bin\JASON-OS\.research\migration-skill\findings\D2-content-analysis-adjacent.md:67-78` (all 6 CAS skills pre-port-dependent).
- `C:\Users\jbell\.local\bin\sonash-v0\.research\archive\repo-analysis-value-extraction\findings\D5-internal-delta-analysis.md:191-209` (prior SoNash-side finding: code-reviewer has 10 SoNash-specific patterns needing replacement or generalization — direct input to Category 2).

**Challenge / OTB source (the gap motivation):**
- `C:\Users\jbell\.local\bin\JASON-OS\.research\migration-skill\challenges\otb.md:240-275,745-751,820-822,853-856` (OTB-3 NT-2: source-side refactoring cost systematically absent; C-127 ~20-40h estimate; C-128 Phase -1 gate proposal; C-129 Aviator "to migrate, first make migratable").

**Context — JASON-OS CLAUDE.md + BRAINSTORM axioms:**
- `C:\Users\jbell\.local\bin\JASON-OS\CLAUDE.md` v0.1 §1-8 (bootstrap, explicitly "Sanitized extraction from SoNash CLAUDE.md v6.0" per footer — confirms the extraction split already started; SoNash back-port not yet done).
- `C:\Users\jbell\.local\bin\JASON-OS\.research\migration-skill\BRAINSTORM.md:63-64,73,108-115` (D14 non-mandatory, D15 unlabeled-files, D19 CAS-reshape-during-port).

**Web — port-friendly design + migration-cost estimation:**
- [Aviator — How to Manage Code in a Large Codebase](https://www.aviator.co/blog/how-to-manage-code-in-a-large-codebase/) — coupling reduction as primary refactor goal; interface insertion to decouple components.
- [Aviator — LLM agents for code migration](https://www.aviator.co/blog/llm-agents-for-code-migration-a-real-world-case-study/) (already in sources.jsonl [75]; otb.md:800 NS-15) — "to migrate, first make migratable" core principle.
- [Mike Cvet — Migrations: Refactoring for Your System](https://mikecvet.medium.com/migrations-8f1b0273abfa) — migration as continuous refactoring practice; iterative cost control.
- [Gartner Peer Community — migration refactoring cost control](https://www.gartner.com/peer-community/post/if-application-migration-strategy-involves-significant-refactoring-re-architecting-best-way-to-control-costs) — "migrate one component and extrapolate" cost-estimation heuristic (matches /migration v1's "port CAS first as pilot" D19 axiom).
- [FreeCodeCamp — How to Refactor Complex Codebases](https://www.freecodecamp.org/news/how-to-refactor-complex-codebases/) — decoupling interdependent code as a refactoring primary; matches Category 2 of this finding.
- [Red Hat — Developing your code migration strategy](https://www.redhat.com/en/blog/modernization-developing-your-code-migration-strategy) — phased migration with candidate inventory (matches Phase 2 SONASH_REFACTOR_CANDIDATES.md recommendation).

---

**Findings path:** `C:\Users\jbell\.local\bin\JASON-OS\.research\migration-skill\findings\G2-sonash-source-cost.md`
