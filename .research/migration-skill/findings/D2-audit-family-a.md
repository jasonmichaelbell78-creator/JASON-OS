# FINDINGS — D2-audit-family-a

**Date:** 2026-04-21
**Agent:** Phase 1 D-agent D2-audit-family-a
**Scope:** Audit-* cluster part A (7 skills)
**Mode:** Read-only. No SoNash files modified.

---

## Summary

Inventoried 7 SoNash audit-* skills (`audit-agent-quality`, `audit-aggregator`, `audit-ai-optimization`, `audit-code`, `audit-comprehensive`, `audit-documentation`, `audit-engineering-productivity`) for `/migration`'s integration surface.

**Coupling distribution:**
- **none:** 0
- **light:** 2 (`audit-agent-quality`, `audit-documentation`)
- **medium:** 3 (`audit-aggregator`, `audit-ai-optimization`, `audit-comprehensive`)
- **heavy:** 2 (`audit-code`, `audit-engineering-productivity`)

**Key finding:** Every audit skill in this batch consumes the TDMS/FALSE_POSITIVES/MASTER_DEBT + `docs/audits/...` + `scripts/debt/*.js` stack. `/migration` will NOT call any of these as subcommands during the 7-phase arc — it is not an auditor. However, **`/migration` IS a subject OF these skills**: Phase 5 (Execute) transformations (sanitize/reshape/rewrite) will produce artifacts that an SoNash operator may later audit via `/audit-code`, `/audit-comprehensive`, or `/audit-ai-optimization`. `/migration` also has **meta-consumption** of `audit-aggregator`'s JSONL schema as a reference format for its own ripple-inventory / verdict-assignment output, and of `audit-comprehensive`'s orchestration pattern (staged waves + agent-team fallback + MASTER_DEBT dedup) as a design precedent.

None of these 7 are likely to be **called** by `/migration` in any of its 7 phases. All 7 produce migration-relevant output in the **destination** (SoNash) side when the destination is SoNash, but that's post-migration auditing invoked by the user, not by `/migration`. For `/migration` direction JASON-OS → SoNash, the operator may run `/audit-code` after execute to confirm landed-code health — this is an advisory invocation, not a `/migration` callout.

Two skills have SoNash-intrinsic scope that makes them **not portable to JASON-OS as-is**: `audit-code` (hardcoded Next.js/React/Firebase file paths, `npm run patterns:check`, SonarCloud MCP integration) and `audit-engineering-productivity` (hardcoded `lib/firebase.ts`, Firebase IndexedDB persistence, `functions/src/**/*.ts`, Sentry integration). These would need heavy reshape/rewrite (D23 `rewrite`) before living in JASON-OS.

---

## Skill integration table

| Skill | Does-what | Coupling | /migration phase that calls it | Invocation shape | D23 verdict | Evidence file:line |
|-------|-----------|----------|-------------------------------|------------------|-------------|-------------------|
| audit-agent-quality | Hybrid (structural + behavioral) audit of `.claude/agents/*.md` across 13 quality categories; 3 stages + Stage 2.5 implementation/testing + Stage 4 built-in optimization | light — agents/categories/CL/TDMS patterns are generic; only couplings are `npm run patterns:check`, `data/ecosystem-v2/invocations.jsonl`, `scripts/debt/*.js` pipeline | **no** — not in 7-phase arc. Operator may run it independently AFTER `/migration` lands agents into destination, but `/migration` does not call it. | n/a (operator-invoked post-migration) | **reshape** — generic agent-quality concept, but coupling to `npm run patterns:check` (SKILL.md:261), `data/ecosystem-v2/invocations.jsonl` (SKILL.md:425), and SoNash TDMS pipeline requires reshape for JASON-OS if ported | SKILL.md:1-7, 260-261, 369-374, 410-413, 425 |
| audit-aggregator | Merge + deduplicate findings from 9 domain audit reports into `COMPREHENSIVE_AUDIT_REPORT.md` + `comprehensive-findings.jsonl`; priority ranking; MASTER_DEBT cross-ref; interactive review; TDMS intake | medium — deeply coupled to the 9-domain TDMS universe (`FALSE_POSITIVES.jsonl`, `MASTER_DEBT.jsonl`, `scripts/debt/*.js`), schema is generic JSONL (fingerprint/severity/effort) | **no** — not in 7-phase arc. `/migration` may REFERENCE aggregator JSONL schema when designing its own ripple-inventory / verdict-ledger output, but does not invoke it. | n/a (schema reference only — "read output" pattern at design time, not runtime) | **reshape** — schema is reusable, but orchestration assumes 9-SoNash-domain world + TDMS pipeline; reshape into JASON-OS-schema aggregator if ported | SKILL.md:1-8, 11-13, 18, 34, 45-50, 133-139, 160-167, 207 |
| audit-ai-optimization | 11-agent, 3-stage audit of AI infrastructure (SKILL.md bloat, hook latency, MCP config, context optimization, token waste) across 12 domains | medium — audits `.claude/skills/`, `.claude/hooks/`, `.claude/mcp.json`, `MEMORY.md`, `session-begin`/`session-end` which exist in BOTH JASON-OS and SoNash; couples to `docs/audits/single-session/ai-optimization/`, `FALSE_POSITIVES.jsonl`, `scripts/debt/intake-audit.js` | **no** — not in 7-phase arc. Could be run by operator AFTER `/migration` ports skills/hooks INTO JASON-OS to validate no AI-optimization debt introduced. `/migration` does not call it. | n/a (operator-invoked post-migration, advisory) | **sanitize** — domain list (SKILL.md/CLAUDE.md/hooks/MCP/memory) is JASON-OS-portable; mostly TDMS path/command sanitization needed. Closest to copy-as-is of the batch. | SKILL.md:1-8, 54-69, 86-102, 141-143, 283-299, 348-350, 467-469 |
| audit-code | 7-category code-review audit (Hygiene/Types/Framework/Testing/Security/AICode/Debugging) across 3 parallel agents | **heavy** — hardcoded Next.js app router paths (`app/**/*.tsx`, `components/**/*.tsx`, `hooks/**/*.ts`), Cloud Functions (`functions/src/**/*.ts`), `lib/auth*.ts`, `middleware.ts`; requires `npm run patterns:check`, `npm run lint`, `npm test`; SonarCloud MCP baseline of 778 issues; Next.js/React/TypeScript stack references | **no** — not in 7-phase arc. Operator may invoke after `/migration` lands code changes in SoNash, to confirm no regressions. Cannot be applied to JASON-OS code (no React/Next app). | n/a (SoNash-side post-migration, operator-invoked) | **rewrite** — so SoNash-specific (React/Next.js/Firebase stack baked into agent scope and commands) that porting to JASON-OS requires complete rewrite against JASON-OS idioms (bash/node-scripts/.claude). | SKILL.md:1-8, 44-75, 181-193, 195-204, 217-220, 233-257, 283-286 |
| audit-comprehensive | Orchestrator: spawns 9 specialized audit agents in 4 stages (Technical Core → Supporting → Meta/Enhancement → Aggregation) with team-mode fallback; MASTER_DEBT dedup + interactive review + TDMS intake | medium — stack-coupled via agent list (includes `audit-code` heavy-coupled and `audit-security` heavy-coupled siblings), `firebase.json`/`functions/` appear only in TRIAGE_GUIDE examples (reference/TRIAGE_GUIDE.md:566, 586, 607) and App Check example (SKILL.md:272); orchestration pattern is generic | **no** — not in 7-phase arc. But its orchestration pattern (staged waves, team+subagent modes, mandatory dedup, interactive review, compaction-safe decision tracking) is a **design precedent** for `/migration`'s own Phase 2 (Discovery) + Phase 5 (Execute) orchestration. | n/a (pattern reference at design time; `/migration` inherits staged-wave + user-gate + compaction-resilience patterns conceptually) | **reshape** — 9-domain list is SoNash-specific; orchestration scaffold + team mode + MASTER_DEBT/interactive-review patterns are portable with domain-list reshape | SKILL.md:1-8, 11-18, 37-49, 56-98, 107-148, 174-179, 260-302 |
| audit-documentation | 18-agent, 6-stage parallel documentation audit (inventory, link-validation, content-quality, format/structure, placement/lifecycle, synthesis) | light — audits `.md` files + link graph, which is format-agnostic; references `docs/technical-debt/`, `docs/audits/`, `scripts/debt/validate-schema.js`, `docs/templates/DOCUMENTATION_STANDARDS.md` but no React/Firebase/SoNash-business-logic coupling | **no** — not in 7-phase arc. Docs produced or touched by `/migration` (e.g., ROADMAP entries, BRAINSTORM/PLAN files updated during a migration) are candidates for later docs-audit — user-invoked, not `/migration`-invoked. | n/a (operator-invoked post-migration) | **sanitize** — most portable of the batch. Markdown lint / link validation / freshness / structure all apply to JASON-OS docs equally. Path sanitization + TDMS unbinding only. | SKILL.md:1-8, 31-37, 54-91, 156-166, 186-194, 199-203, 244-248 |
| audit-engineering-productivity | 3-agent parallel DX / debugging-ergonomics / offline-support audit | **heavy** — hardcoded Firebase IndexedDB persistence (`enableIndexedDbPersistence`), `lib/firebase.ts`, `functions/src/**/*.ts` for Cloud Functions logging, `components/status/offline-indicator.tsx`, `lib/offline-queue.ts`, `public/sw.js`, Sentry integration assumption, LocalStorage/IndexedDB/Dexie search patterns — all SoNash-runtime-specific | **no** — not in 7-phase arc. Would audit SoNash runtime DX, not `/migration` output. `/migration` porting a DX script from SoNash to JASON-OS may encounter these patterns but would not CALL the audit. | n/a (operator-invoked post-migration, scoped to SoNash) | **rewrite** — tooling is portable but focus-area files (firebase, offline sw, indexedDB, Sentry) are SoNash-runtime-exclusive. For JASON-OS analogue, rewrite against CLI-tool / hook-runtime DX concerns. | SKILL.md:1-8, 44-54, 75-93, 98-126, 200-201 |

---

## Top integration points

Of the 7, `/migration` is most likely to **reference** (not call) 2-3 as design precedent, in this rank order:

1. **`audit-comprehensive`** (SKILL.md:56-148) — its 4-stage wave orchestration with agent-teams fallback, MASTER_DEBT dedup gate, mandatory interactive review, and compaction-safe decision tracking (`${AUDIT_DIR}/REVIEW_DECISIONS.md`, SKILL.md:326-329) is the cleanest precedent for `/migration`'s own Phase 2 (Discovery) and Phase 5 (Execute) orchestration. D8 (nothing silent) aligns exactly with its "Do NOT present findings for review until cross-referenced" (SKILL.md:260-263) and "Do NOT ingest findings into TDMS until user has reviewed them" (SKILL.md:307) invariants. `/migration` should adopt the same compaction-safe user-gate pattern.

2. **`audit-aggregator`** (SKILL.md:68-104, 133-139) — its JSONL finding schema (`{fingerprint, severity, effort, confidence, category, files, why_it_matters, suggested_fix, acceptance_tests}`) is a natural reference for `/migration`'s ripple-inventory and per-unit verdict-ledger output. The deduplication logic (worst severity, highest effort, combine domain labels, SKILL.md:68-77) is a direct template for `/migration`'s cross-unit ripple merging. The MASTER_DEBT classification (`Already Tracked` / `New` / `Possibly Related`, SKILL.md:133-139) maps to `/migration`'s verdict-assignment (copy-as-is / sanitize / reshape / rewrite / skip / blocked-on-prereq — per D23).

3. **`audit-ai-optimization`** (SKILL.md:54-69, 283-299) — among these 7, it is the most portable to JASON-OS (closest to copy-as-is per the verdict table above) and its Domain 8 "Skill overlap" + Domain 9 "Agent prompt quality" work directly surfaces `/migration`-relevant artifacts: if SoNash skill X has >30% shared scope with JASON-OS skill Y, that's a merge-candidate for a future migration. `/migration` may CONSUME an ai-optimization report's output JSONL as an input signal to Phase 2 Discovery (which skills in SoNash are migration candidates?). This is a "read output" invocation, not a subcommand call.

**Critical null finding:** No audit skill in this batch is in the `/migration` runtime call-path for any of the 7 phases. All three "top integration points" are **reference/consumption** integrations (read schema; read output; adopt pattern), not invocation integrations. This aligns with D27 (cross-skill integration expansion) as design-time references rather than runtime dependencies.

---

## Sources

### Skill files inventoried (7 SKILL.md + 4 companions)
- `C:\Users\jbell\.local\bin\sonash-v0\.claude\skills\audit-agent-quality\SKILL.md` (438 lines)
- `C:\Users\jbell\.local\bin\sonash-v0\.claude\skills\audit-agent-quality\REFERENCE.md`
- `C:\Users\jbell\.local\bin\sonash-v0\.claude\skills\audit-aggregator\SKILL.md` (225 lines)
- `C:\Users\jbell\.local\bin\sonash-v0\.claude\skills\audit-aggregator\examples.md`
- `C:\Users\jbell\.local\bin\sonash-v0\.claude\skills\audit-ai-optimization\SKILL.md` (499 lines)
- `C:\Users\jbell\.local\bin\sonash-v0\.claude\skills\audit-code\SKILL.md` (369 lines)
- `C:\Users\jbell\.local\bin\sonash-v0\.claude\skills\audit-comprehensive\SKILL.md` (496 lines)
- `C:\Users\jbell\.local\bin\sonash-v0\.claude\skills\audit-comprehensive\reference\WAVE_DETAILS.md`
- `C:\Users\jbell\.local\bin\sonash-v0\.claude\skills\audit-comprehensive\reference\TRIAGE_GUIDE.md`
- `C:\Users\jbell\.local\bin\sonash-v0\.claude\skills\audit-comprehensive\reference\RECOVERY_PROCEDURES.md`
- `C:\Users\jbell\.local\bin\sonash-v0\.claude\skills\audit-documentation\SKILL.md` (248 lines)
- `C:\Users\jbell\.local\bin\sonash-v0\.claude\skills\audit-documentation\prompts.md`
- `C:\Users\jbell\.local\bin\sonash-v0\.claude\skills\audit-engineering-productivity\SKILL.md` (354 lines)

### Context
- `C:\Users\jbell\.local\bin\JASON-OS\.research\migration-skill\BRAINSTORM.md` §3 (D19, D23, D24, D27), §5 Q2
- SoNash `CLAUDE.md` (stack versions, security rules, Agent/Skill Triggers table)

### Key SoNash-coupling evidence (grep hits)
- `firebase` / `Firestore` / `httpsCallable` / `App Check`: found in audit-engineering-productivity:82,102,109,117,173,201; audit-code:74; audit-comprehensive:272; audit-comprehensive/reference/TRIAGE_GUIDE.md:566,586,607
- `npm run patterns:check`: audit-agent-quality:261,370; audit-code:189
- `scripts/debt/intake-audit.js`: audit-agent-quality:371; audit-aggregator:163; audit-ai-optimization:468; audit-documentation:194; audit-engineering-productivity:320
- `MASTER_DEBT.jsonl`: audit-aggregator:136; audit-comprehensive:268; audit-documentation:156 (all mandatory)
- `data/ecosystem-v2/invocations.jsonl`: audit-agent-quality:425
- `SonarCloud MCP`: audit-code:195-204
