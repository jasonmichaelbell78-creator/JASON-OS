# D2 — Skill-Infrastructure / Utility Cluster (Phase 1 D-agent)

**Scope:** BRAINSTORM §5 Q2 cross-skill integration inventory (D27 expansion), with D19 (foreign-repo CAS), D23 (expanded verdicts), D24 (Phase 5 active transformation) kept in view.
**Date:** 2026-04-21
**Depth:** L1 surface inventory, with slightly deeper read on `skill-creator` + `skill-audit`.
**Agent:** D2-skill-infra
**Source repo:** `<SONASH_ROOT>\.claude\skills\`

---

## 1. Summary

14 skills inventoried at surface level; 4 additional skills marked out-of-scope with one-line notes. The cluster is **infrastructure + meta-layer** — almost none of these skills are *consumed* by `/migration` at runtime; instead, they define the **skill-authoring contract** that `/migration` itself must satisfy, or they sit next to `/migration` as peers addressing orthogonal concerns.

**Key integration shape:** `/migration` is a **product of** skill-creator + skill-audit (it must be authored and audited by them) more than it is a **consumer of** them. The one surprising find is how load-bearing `_shared/SKILL_STANDARDS.md` + `_shared/SELF_AUDIT_PATTERN.md` are — `/migration`'s Phase 6 (Prove) design and its own completeness-verification script are directly prescribed by this shared infra.

**Coupling distribution (14 in-scope skills):**

| Coupling | Count | Meaning |
|---|---|---|
| Structural (authoring contract for /migration) | 4 | skill-creator, skill-audit, _shared, shared |
| Meta / indirect | 3 | find-skills, create-audit, schemas |
| Peer (independent, may co-run) | 4 | using-superpowers, systematic-debugging, debt-runner, multi-ai-audit |
| Orthogonal (no expected interaction) | 3 | decrypt-secrets, quick-fix, ui-design-system |

Out-of-scope-4 (skimmed only): frontend-design, ux-researcher-designer, alerts, artifacts-builder — all domain-specific (UI/UX/artifacts/health), **no expected `/migration` interaction**.

---

## 2. Skill Integration Table

| # | Skill | Coupling | Role relative to /migration | Migration-relevance signal |
|---|---|---|---|---|
| 1 | **skill-creator** | Structural (authoring) | `/migration` MUST be authored via skill-creator's 7-phase discovery-first workflow. No "port" mode exists — see §3. | **HIGH** — defines how /migration comes into being; also a Phase 6 self-dogfood concern |
| 2 | **skill-audit** | Structural (authoring) | `/migration` MUST pass `/skill-audit` before being considered complete. 12-category behavioral rubric incl. T25 convergence-loop + Category 12 completion-verification. | **HIGH** — direct Phase 6 gate per BRAINSTORM Q10 |
| 3 | **find-skills** | Meta / indirect | Skill-discovery tool for users ("is there a skill for X"). Searches skills.sh + plugin marketplaces via `scripts/search-capabilities.js`. Not relevant for /migration internals. | LOW — /migration is a local built skill, not discoverable externally |
| 4 | **create-audit** | Meta / indirect | Specialized scaffold for audit-type skills. /migration is NOT an audit, so not the right scaffold. Routing guide explicitly sends non-audit skills to `/skill-creator`. | LOW — but see §3 for "could /migration borrow its multi-agent CL discovery model?" |
| 5 | **_shared** | Structural (authoring) | Contains SKILL_STANDARDS.md (v3.0, 426 lines — canonical structural rules), SELF_AUDIT_PATTERN.md (v1.0, 332 lines — reusable self-audit script shape), AUDIT_TEMPLATE.md, TAG_SUGGESTION.md, and an `ecosystem-audit/` subdir. | **HIGH** — the authoring contract. /migration's Phase 6 "Prove" likely needs a `scripts/skills/migration/self-audit.js` per this pattern |
| 6 | **shared** | Structural (partial authoring) | Different from `_shared`. Contains CONVENTIONS.md (595 lines) — conventions for the **analysis/synthesis skill family** specifically (`/analyze`, `/repo-analysis`, `/website-analysis`, `/document-analysis`, `/media-analysis`, `/synthesize`). Scope-limited to CAS. | MEDIUM — /migration is NOT in that family, so CONVENTIONS.md doesn't apply. BUT: phase-marker format (`========== PHASE N: [NAME] ==========`) and write-to-disk-first principle are worth mirroring |
| 7 | **schemas** | Meta / indirect | Zod schemas for CAS outputs: `analysis-schema.ts`, `findings-schema.ts`, `validate-artifact.ts`. Exported contract for what analysis/findings JSON look like. | LOW — /migration doesn't consume CAS output directly (CAS is ported per D19), but MIGRATION_PLAN.md may want its own schema in a parallel `schemas/` location |
| 8 | **using-superpowers** | Peer | Meta-skill that tells the AI to invoke the Skill tool before any response. Affects whether /migration gets invoked at all by default. | LOW — /migration is explicitly user-directed (D2 trigger mode); using-superpowers doesn't affect its internal design |
| 9 | **systematic-debugging** | Peer | 5-phase bug-investigation skill with iron-law "no fixes without root cause." Independent of /migration. | LOW — could be invoked **within** /migration Phase 5 if a reshape/rewrite uncovers a destination-side bug mid-execute, but that's user-directed, not orchestrated |
| 10 | **debt-runner** | Peer | TDMS orchestrator (7 modes: verify/sync/plan/health/dedup/validate/cleanup). Convergence-loop-verified at every stage. Owns `MASTER_DEBT.jsonl` staging. | LOW for /migration runtime. NOTE: /migration's own "Prove" phase could emit debt rows if it defers work (e.g., "reshape candidate skipped by user — /add-debt") — worth checking in Phase 3 of /deep-research |
| 11 | **multi-ai-audit** | Peer | Multi-AI consensus audit orchestrator with category-by-category user-controlled progression. Writes to TDMS. | LOW — not an expected /migration consumer. `templates.md` companion may inform /migration's own template shape for `MIGRATION_PLAN.md` export mode |
| 12 | **decrypt-secrets** | Orthogonal | Decrypts `.env.local.encrypted` → `.env.local` via AES-256-GCM passphrase. Remote-session only. | **NONE** — no /migration interaction. Could be incidentally needed if /migration self-dogfood runs in a remote session that needs SONAR_TOKEN etc. |
| 13 | **quick-fix** | Orthogonal | Auto-suggest ESLint/Prettier/pattern-compliance/TS fixes. Pre-commit-failure companion. | LOW — only peripheral relevance: if /migration's direct-apply mode triggers pre-commit in the destination, quick-fix could chain. But `/pre-commit-fixer` is the primary partner there, not quick-fix |
| 14 | **ui-design-system** | Orthogonal | Python design-token + component-doc generator for UI designers. | **NONE** |

### Out-of-scope-4 (one-line notes)

| Skill | One-line |
|---|---|
| **frontend-design** | React/Tailwind/shadcn artisan UI generator; no /migration interaction. |
| **ux-researcher-designer** | Python UX research toolkit (persona generation, journey mapping); no /migration interaction. |
| **alerts** | Lightweight 18/42-category health signal; consumer of health-ecosystem-audit. Peer to /migration's Phase 0 context only if /migration surfaces health signals (it doesn't). |
| **artifacts-builder** | React/TS/Vite HTML-artifact bundler for claude.ai artifacts; no /migration interaction. |

---

## 3. Deep note: skill-creator + skill-audit roles for /migration

### Q: Could `/migration` be invoked via skill-creator's "port existing skill" mode?

**Answer: NO — no such mode exists.**

skill-creator's `When to Use` (SKILL.md lines 36-38) lists only:
- "Creating a new skill from scratch"
- "Updating or improving an existing skill (major changes)"
- "User explicitly invokes `/skill-creator`"

Phase 1 step 4 ("Extraction context") scans `.research/EXTRACTIONS.md` + `extraction-journal.jsonl` for prior art from **analyzed external sources** — but these are **design-input patterns**, not portable skill artifacts. There is no transformation step, no source-repo SKILL.md read, no sanitize/reshape/rewrite pipeline. Updates operate on **locally-existing** skills in `.claude/skills/` only.

**Implication for /migration:** skill-creator is **not a substitute** for /migration when the user wants to port a skill from SoNash into JASON-OS. The two address different problems:
- skill-creator: discovery-first authoring of a new-or-updated skill in *this* repo
- /migration: cross-repo active transformation of any artifact (incl. skills) between JASON-OS and external endpoint

**Opportunity flagged:** /migration could eventually become skill-creator's missing "port" mode — when user asks skill-creator to create a skill that is a port of an existing external skill, skill-creator could route to `/migration` (unit-type=concept or unit-type=file batch, direction=in). This is a **future cross-invocation** worth naming as a research thread, not v1 work.

### Q: Is skill-audit a Phase 6 gate for /migration self-dogfood (per BRAINSTORM Q10)?

**Answer: YES — mandatory, by skill-creator's own Phase 6 rule.**

skill-creator SKILL.md line 24: *"Skill-audit is mandatory — MUST run `/skill-audit` on every created skill before considering it complete."*
skill-creator Phase 6 (lines 306-310): *"Run `/skill-audit <skill-name>` on the created skill. The audit verifies behavioral quality that structural validation cannot catch. Done when: Skill-audit complete, findings addressed."*

This means **/migration itself, once authored, MUST be skill-audited** — and the 12-category rubric (incl. Category 11 convergence-loop / T25 and Category 12 completion-verification) is the behavioral gate. skill-audit has three modes (single/batch/multi per Phase 1.0) — `/migration` would use `single` mode given its complexity.

**BRAINSTORM Q10 self-dogfood criteria — concrete bindings:**

| Q10 candidate criterion | skill-audit binding |
|---|---|
| "produces own MIGRATION_PLAN.md targeting SoNash" | Category 8 (Integration) + Phase 2.5 Operational Deps Check C (file reads/writes match) |
| "resulting plan executes cleanly in SoNash" | Phase 5.2 Evidence-Based Decision Verification (grep + diff mapping) |
| "ported /migration in SoNash runs and produces structurally identical results" | Category 12 Completion Verification + Phase 5.0 self-audit script comparison |

So skill-audit is NOT just a Phase 6 quality gate for /migration — its 12 categories provide **the observable definition** of "successful self-dogfood" the brainstorm Q10 is asking for. This is a **promotion candidate**: Q10 can be partially answered by referencing skill-audit's rubric directly rather than inventing parallel criteria.

### Q: Does skill-audit's Phase 2.5 Operational Dependency Check apply to /migration?

**YES, critically.** /migration ships with (expected): state file, MIGRATION_PLAN.md writer, verdict-conditional Phase 3 dispatcher, Phase 5 active-transformation scripts. Every one of those is a Phase 2.5 check target (Scripts MUST run without error, Data files MUST have writers + readers paired, Contracts MUST match downstream consumers). Phase 2.5 will catch wiring gaps between /migration and `/sync`, `/deep-research`, `/convergence-loop` more rigorously than integration-table inspection alone.

### Q: /migration's own self-audit.js?

Per skill-creator Phase 4.3 + `_shared/SELF_AUDIT_PATTERN.md`: /migration MUST scaffold `scripts/skills/migration/self-audit.js`, following the CAS reference (`scripts/cas/self-audit.js`, 814 lines). This is **Phase 6 "Prove" infrastructure** for /migration — convergence-loop embedded verification per D6 maps to the 9 mandatory dimensions in SKILL_STANDARDS.md §Self-Audit. This is a meaningful implementation surface for /deep-plan to claim, not just a behavioral footnote.

---

## 4. Top Integration Points

Ranked by load-bearing weight for /migration's design + build:

1. **`_shared/SKILL_STANDARDS.md` (v3.0, 426 lines)** — defines required SKILL.md sections, attention-management, MUST/SHOULD/MAY hierarchy, 9-dimension self-audit contract. /migration inherits all of this. **Non-optional.**
2. **`_shared/SELF_AUDIT_PATTERN.md` (v1.0, 332 lines)** — prescribes shape of `scripts/skills/migration/self-audit.js`. References `scripts/cas/self-audit.js` as reference impl (814 lines). CAS will be ported into JASON-OS per D19 → the CAS self-audit comes with it and becomes a natural template.
3. **skill-creator Phase 6 + skill-audit** — authoring + quality gate. /migration's Phase 6 "Prove" is partially skill-audit's 12-category rubric applied to self-dogfood, per Q10.
4. **skill-audit Phase 2.5 Operational Dependency Check** — mechanical validation of /migration's scripts, data files, contracts. Catches wiring gaps to `/sync`, `/deep-research`, `/convergence-loop` automatically.
5. **`shared/CONVENTIONS.md` phase-marker format** — `========== PHASE N: [NAME] ==========` — worth mirroring in /migration for visual consistency with CAS family, even though CONVENTIONS.md technically scopes only to analysis/synthesis skills.
6. **`schemas/` precedent** — `/migration` may want a parallel `schemas/migration-plan.ts` (Zod) for MIGRATION_PLAN.md validation, especially for plan-export mode (D26) where the plan crosses a repo boundary.
7. **debt-runner/add-debt** — when /migration defers a reshape/rewrite ("user skipped, defer to later"), it SHOULD route through `/add-debt` rather than inventing its own deferral ledger. Consistent with D8 "nothing silent."
8. **find-skills** — NOT an integration for v1, but naming collision risk: find-skills searches marketplaces for `migration`-named skills; verify there's no conflict before lock-in. (Surface check only.)

### Unexpected relevances / flags

- **Multi-ai-audit's `templates.md`** may be informative for `MIGRATION_PLAN.md` template design (D26 plan-export mode) — it handles cross-boundary template output for external AI systems, which rhymes with plan-export needing to be runnable in the destination repo.
- **create-audit's multi-agent convergence-loop discovery (Phase 2.2)** is a richer discovery pattern than skill-creator's default; if /migration's Phase 2 Discovery turns out to need parallel Explore agents + a convergence-loop pass (likely for reshape-candidate identification per D24), **create-audit is a better template than skill-creator** for that specific phase — even though /migration is not an audit. Worth noting for /deep-plan.
- **`using-superpowers` + D2 trigger-mode interaction:** using-superpowers mandates "check for skills BEFORE ANY RESPONSE." /migration's proactive-scan trigger (D2) must not conflict with this — likely fine since scan mode is user-invoked, but worth stating explicitly in /migration's "When to Use" section.

---

## 5. Sources

All paths absolute, all reads SKILL.md-surface unless noted deeper:

- `<SONASH_ROOT>\.claude\skills\skill-creator\SKILL.md` (381 lines, full read)
- `<SONASH_ROOT>\.claude\skills\skill-creator\REFERENCE.md` (grep for port/migrate only — not found)
- `<SONASH_ROOT>\.claude\skills\skill-creator\scripts\init_skill.py` (existence only)
- `<SONASH_ROOT>\.claude\skills\skill-audit\SKILL.md` (591 lines, full read)
- `<SONASH_ROOT>\.claude\skills\find-skills\SKILL.md` (166 lines)
- `<SONASH_ROOT>\.claude\skills\create-audit\SKILL.md` (398 lines)
- `<SONASH_ROOT>\.claude\skills\_shared\SKILL_STANDARDS.md` (426 lines — partial: first 80)
- `<SONASH_ROOT>\.claude\skills\_shared\SELF_AUDIT_PATTERN.md` (332 lines — partial: first 60)
- `<SONASH_ROOT>\.claude\skills\_shared\AUDIT_TEMPLATE.md` (234 lines — not read, existence + line count)
- `<SONASH_ROOT>\.claude\skills\_shared\TAG_SUGGESTION.md` (118 lines — not read, existence + line count)
- `<SONASH_ROOT>\.claude\skills\shared\CONVENTIONS.md` (595 lines — partial: first 80)
- `<SONASH_ROOT>\.claude\skills\schemas\analysis-schema.ts` (partial: first 40)
- `<SONASH_ROOT>\.claude\skills\using-superpowers\SKILL.md` (105 lines, full)
- `<SONASH_ROOT>\.claude\skills\systematic-debugging\SKILL.md` (partial: first 80)
- `<SONASH_ROOT>\.claude\skills\debt-runner\SKILL.md` (partial: first 80)
- `<SONASH_ROOT>\.claude\skills\multi-ai-audit\SKILL.md` (partial: first 80)
- `<SONASH_ROOT>\.claude\skills\decrypt-secrets\SKILL.md` (73 lines, full)
- `<SONASH_ROOT>\.claude\skills\quick-fix\SKILL.md` (141 lines, full)
- `<SONASH_ROOT>\.claude\skills\ui-design-system\SKILL.md` (partial: first 40)
- `<SONASH_ROOT>\.claude\skills\frontend-design\SKILL.md` (partial: first 30, out-of-scope)
- `<SONASH_ROOT>\.claude\skills\ux-researcher-designer\SKILL.md` (partial: first 30, out-of-scope)
- `<SONASH_ROOT>\.claude\skills\alerts\SKILL.md` (partial: first 40, out-of-scope)
- `<SONASH_ROOT>\.claude\skills\artifacts-builder\SKILL.md` (partial: first 30, out-of-scope)

BRAINSTORM anchors referenced: §5 Q2 (cross-skill inventory), §5 Q10 (self-dogfood criteria), §3 D19 (CAS port), D23 (6-verdict legend), D24 (Phase 5 active transformation), D27 (research-scope expansion).
