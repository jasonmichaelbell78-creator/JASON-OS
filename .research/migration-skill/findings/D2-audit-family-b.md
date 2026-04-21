# D2 — Audit Family (Part B): /migration Integration Inventory

**Agent:** D2-audit-family-b
**Phase:** 1 (deep-research)
**Scope:** 6 SoNash `audit-*` skills — integration surfaces against `/migration`
**Depth:** L1 (file-level, line-cited)
**Date:** 2026-04-21
**Source root:** `C:\Users\jbell\.local\bin\sonash-v0\.claude\skills\`

---

## Summary

Six SoNash "horizontal" audit skills inventoried. All six are **heavy-coupled** to SoNash
infrastructure — Firebase, Next.js, `scripts/debt/intake-audit.js` (TDMS), `npm run`
scripts, `docs/technical-debt/MASTER_DEBT.jsonl`, SonarCloud MCP, and an episodic-memory
MCP plugin. None is currently portable to JASON-OS as-written.

Coupling distribution (per D23 reshape verdicts):
- **Heavy / rewrite:** 4 (`audit-enhancements`, `audit-process`, `audit-refactoring`,
  `audit-security`) — deep stack assumptions (Next.js, Firebase, SonarCloud,
  TDMS, `scripts/debt/*`, `scripts/audit/*`).
- **Heavy / reshape-then-rewrite-partials:** 1 (`audit-performance`) — structurally same
  shape but the whole "focus areas" surface is Next.js/React/Firebase-specific.
- **Medium / reshape:** 1 (`audit-health`) — thin meta-skill; the shape (run a set of
  scripts, tabulate ecosystem coverage) ports cleanly, but every `node scripts/audit/…`
  call is SoNash-unique and must be rebuilt against JASON-OS's audit inventory.

**Top-line verdict for /migration:** This cluster is a P2/P3 (after CAS + `/sync` +
`/pr-review`) and is likely to be *primary callers* of `/migration` rather than *called
by* it. `/migration` would be invoked **as a post-synthesis tool**, not as a step inside
these audits — the audit finishes, surfaces "these N findings are ports/migrations",
user invokes `/migration` per-item.

The more interesting near-term integration is the **inverse direction**: porting these
six skills themselves into JASON-OS is exactly the kind of multi-unit, reshape-and-
rewrite job that `/migration` should dogfood-validate (alongside CAS). Each of the six
is a good test case for a different verdict path: `audit-health` for `reshape`,
`audit-performance` for `reshape`→`rewrite` mix, the other four for `rewrite`.

---

## Skill integration table

| Skill | One-line | SoNash coupling | File:line evidence | /migration call likelihood | Phase | Invocation shape | D23 reshape verdict |
|---|---|---|---|---|---|---|---|
| **audit-enhancements** | 4-phase, 8-agent "find things that could be better" audit across entire project (code, UX, content, infra, meta-tooling) | **Heavy** — `package.json`, `npm test`, `npm run lint`, `npm run patterns:check`, Firebase config, `next.config.*`, `functions/`, `docs/technical-debt/*`, `scripts/debt/intake-audit.js`, `docs/audits/single-session/*`, TDMS `category: enhancements` contract, app directory structure (`app/`, `components/`, `lib/`, `hooks/`, `types/`) | `SKILL.md:91-99` (npm baseline calls), `:99-108` (TDMS paths), `:183-193` (Firebase files), `:350-360` (`scripts/debt/intake-audit.js`), `:483-487` (TDMS category contract) | **Low as caller** (audit surfaces migration candidates but doesn't itself port). **Medium as port target** — good test for multi-unit `rewrite` | Phase 4 (after audit completes, user may route findings into `/migration` per-item) | User-invoked post-audit: `/migration` called once per accepted "portable" finding, unit-type = `file` or `concept` | **rewrite** — stack-specific scanner domains (Firebase, Next.js, TDMS) need full re-authoring against JASON-OS's stack-agnostic posture; only the 4-phase arc + honesty guardrails pattern is reusable |
| **audit-health** | Meta-check on audit-system health — runs diagnostics on domain audits and ecosystem audits, suggests next audits | **Medium** — `node scripts/audit/audit-health-check.js`, `scripts/audit/count-commits-since.js`, `scripts/audit/validate-templates.js`, `scripts/audit/pre-audit-check.js`; references 7 SoNash-specific ecosystem audits (hook-, session-, tdms-, pr-, skill-, doc-, script-ecosystem-audit) | `SKILL.md:46-48`, `:56-58`, `:66-68`, `:76-78` (all four `scripts/audit/*` invocations), `:94-102` (ecosystem audit table — all SoNash-specific names) | **Low** — too meta, too small, too SoNash-wired. Unlikely `/migration` call site | Phase 0 or Phase 2 (inventory / discovery context only — tells `/migration` which SoNash audits exist and their freshness) | Read-only context source; `/migration` could grep `scripts/audit/audit-health-check.js` output for "stale" audit buckets | **reshape** — the meta-ledger + tabulate pattern is clean and portable; the list of scripts and the ecosystem-audit name list must be rewritten for JASON-OS; no Firebase/Next.js coupling |
| **audit-performance** | Single-session performance audit: bundle size, rendering, data fetching, memory, Core Web Vitals, offline, AI-performance-patterns | **Heavy** — Next.js (`app/**/*.tsx`, `next.config.mjs`, `<img>` vs `next/image`, Server/Client components, `use client`/`use server`), React (`useEffect`, `React.memo`), Firebase (`onSnapshot`, Firestore queries, `limit()`), episodic-memory MCP plugin | `SKILL.md:44-52` (bundle/rendering files list), `:60-66` (data/memory files), `:104-117` (episodic-memory MCP calls), `:170-186` (bundle-size/Server-vs-Client/useEffect/onSnapshot baselines), `:249-254` (Firestore queries-without-limit patterns), `:331-333` (TDMS intake) | **Low as caller**. **Medium as port target** — bundle-and-rendering + data-and-memory agents are tightly Next.js/Firebase-scoped; reshape-then-rewrite split | Phase 4 (post-audit routing) | Same as audit-enhancements — per-finding user-invoked `/migration` | **reshape → rewrite** (hybrid): two-agent parallel architecture reshapes cleanly; every *focus area* ("Bundle Size", "Core Web Vitals", "onSnapshot cleanup") is stack-specific and needs rewrite. For JASON-OS this becomes "Node.js hook performance + script-runtime performance" |
| **audit-process** | Comprehensive 22-agent / 7-stage automation audit across 16 automation types × 12 categories | **Heavy** — 16 SoNash automation types including Next.js, Firebase Cloud Functions, Firebase Scheduled Jobs, Firebase Rules, `mcp.json`, `eslint.config.mjs`, Husky-v9 hooks, npm scripts, lint-staged; `scripts/debt/intake-audit.js`, `scripts/validate-audit.js`, `scripts/reset-audit-triggers.js`, `scripts/debt/validate-schema.js`, `scripts/debt/generate-views.js`; episodic-memory MCP plugin | `SKILL.md:65-84` (the 16 types table — 12 of 16 are SoNash-specific), `:148-156` (episodic memory), `:220-223` (`intake-audit.js`), `:265-275` (post-audit script-ladder), `:345-347` (TDMS path refs) | **Low as caller**. **High as port target** — this skill was probably a direct inspiration for `/migration`'s 7-phase arc (`.research/migration-skill/BRAINSTORM.md` §2) | Phase 2 (discovery) — if `/migration` scans JASON-OS process artifacts, it may want to consume the `stage-1-inventory.md` format | Agent-produced JSONL + stage inventory MD; `/migration`'s discovery phase could borrow the "stages write to files, never rely on conversation" pattern (D24 execution rigor) | **rewrite** — the automation-type census is SoNash-specific (Firebase x4 rows, mcp.json row, lint-staged row); JASON-OS's equivalent census is much smaller (`hooks/`, `scripts/`, `scripts/lib/`, `.github/workflows/`, `.husky/`, a `package.json` with husky-only deps per `JASON-OS/CLAUDE.md` §1). The 7-stage skeleton is reusable; the inventory is not |
| **audit-refactoring** | Single-session refactoring audit: god objects, duplication, cognitive complexity, architecture violations, tech-debt markers | **Heavy** — Next.js/React source scope (`app/`, `components/`, `lib/`, `hooks/`, `functions/`), `npm run deps:circular`, `npm run deps:unused`, `npm run tdms:metrics`, SonarCloud MCP (`mcp__sonarcloud__get_issues`), hardcoded SonarCloud baseline ("778 issues, 47 CRITICAL"), episodic-memory MCP, TDMS paths | `SKILL.md:43-45` (source scope), `:183-207` (episodic memory), `:232-244` (npm run baselines), `:249-260` (SonarCloud MCP), `:292-295` (hardcoded baseline), `:391` (TDMS path) | **Low as caller**. **Medium as port target** — shape is highly reusable (the 5 categories generalize); SonarCloud + `deps:*` are stack-specific hooks | Phase 2 (discovery — `/migration` discovery could borrow this skill's file-scanning patterns) | None direct; shape-borrow only | **rewrite** — SonarCloud baselines, npm script dependencies, and the Next.js source scope all need rewrite; JASON-OS lacks a SonarCloud integration at v0 per `JASON-OS/CLAUDE.md` §2 (CI security pipeline lists SonarCloud as future, and no `deps:*` npm scripts exist in JASON-OS's minimal `package.json`) |
| **audit-security** | Single-session, 4-agent parallel security audit: vulnerability scanner, supply-chain, framework-security (Firebase/Next.js), AI-code security | **Heavy** — Next.js (`app/api/**/*.ts`, `middleware.ts`, `next.config.mjs`, `NEXT_PUBLIC_`), Firebase (Firestore rules, Cloud Functions, App Check, rate-limiting, `lib/firebase*.ts`), SonarCloud MCP (`mcp__sonarcloud__get_security_hotspots`, `…get_issues`), `npm audit`, `npm run patterns:check`, OWASP Top 10 baked into category list, `.claude/` prompt-injection scanning, episodic-memory MCP | `SKILL.md:46-54` (vulnerability-scanner file list — all Next.js), `:77-82` (framework-security — all Firebase/Next.js), `:170-191` (episodic memory), `:216-234` (`npm audit` + `patterns:check`), `:236-248` (SonarCloud MCP), `:335-352` (security-sensitive files list — all Firebase/Next.js) | **Medium as caller** for JASON-OS's actual security posture: the 4-agent shape maps cleanly to JASON-OS's CI security pipeline (gitleaks, semgrep, codeql, dependency-review, scorecard per `JASON-OS/CLAUDE.md` §2). **High as port target** — security posture *must* travel with any port | Phase 2 (discovery — audit-security's `.claude/` prompt-injection scan overlaps with `/migration`'s sanitize verdict); Phase 5 (execution — `/migration` may auto-invoke a security scan on reshaped output before gate) | Could be called by `/migration` Phase 5 (Execute/Prove) on rewritten files as a pre-gate sanity check — if the ported skill writes security-sensitive patterns, block | **rewrite** — vulnerability-scanner + framework-security are Next.js/Firebase-only; supply-chain and AI-code-security are mostly reusable. In JASON-OS, the 4-agent shape collapses to 2-3 (supply-chain via `npm audit` + `dependency-review`, AI-code via `.claude/` scan + gitleaks, no framework-security because there's no framework in v0) |

---

## Top integration points

Ordered by likely-utility to `/migration` design. These are the cross-skill hooks
`/migration` design must decide about:

### 1. Post-synthesis "port this" routing (Phase 4 of each audit)

All six skills end with an Interactive Review phase (per `AUDIT_TEMPLATE.md`
references at `audit-enhancements/SKILL.md:416-441`, `audit-performance/SKILL.md:322-328`,
`audit-process/SKILL.md:252-260`, `audit-refactoring/SKILL.md:404-410`,
`audit-security/SKILL.md:418-424`). Any of those accepted findings that are
"SoNash has X, JASON-OS should too" (or reverse) are natural `/migration` trigger
points. **Design implication:** `/migration` should accept a JSONL row as input shape
(finding → unit conversion), not just a file path. Per D23, each finding becomes a
unit with its own verdict (sanitize / reshape / rewrite).

### 2. TDMS intake contract as shared vocabulary

All six skills converge on `scripts/debt/intake-audit.js` with `--source "audit-{skill}-{date}"`
(`audit-enhancements/SKILL.md:359-360, 484`; `audit-performance/SKILL.md:331-333`;
`audit-process/SKILL.md:220-222`; `audit-refactoring/SKILL.md:413-416`;
`audit-security/SKILL.md:428-430`). `MASTER_DEBT.jsonl` is the shared debt store
(`audit-process/SKILL.md:244-250, 346-347`). `/migration` should **not** re-implement
TDMS but should consume MASTER_DEBT for cross-referencing — any migration candidate
that's already tracked as debt gets a skip verdict or a "resolve via /migration" path.
**Blocker:** TDMS is a SoNash-only thing; JASON-OS has no equivalent at v0 per
`JASON-OS/CLAUDE.md` (no `docs/technical-debt/` dir, no `scripts/debt/`). `/migration`
must either port a minimal TDMS or route debt tracking through `/add-debt` v0 stub.

### 3. Episodic-memory MCP as pre-migration context signal

3 of 6 skills (`audit-performance:104-117`, `audit-process:148-156`,
`audit-refactoring:183-207`, `audit-security:170-191`) do a mandatory episodic-memory
search at Step 0 / pre-audit. `/migration` BRAINSTORM §3 D22 ("Gate memory aids recall;
never replaces confirmation") suggests `/migration` should do the same for *resume*
semantics but not for *verdict gating*. **Design implication:** `/migration` Phase 0
context should include an episodic-memory search for "prior migration of {unit}", but
past findings are advisory only — always re-confirm.

### 4. 4-phase and 7-stage arcs as prior art for /migration's 7-phase arc

`audit-enhancements/SKILL.md:43-62` (4-phase adaptive model) and
`audit-process/SKILL.md:28-38` (7-stage approach with parallel agents) are the closest
in-SoNash prior art for BRAINSTORM §2's "seven-phase internal arc". Both already handle:
- Broad scan → deep dive → synthesis → review (same shape as `/migration`'s
  Context → Target pick → Discovery → Research → Plan → Execute → Prove)
- Parallel agent dispatch (per D4's agent-approach open question)
- Stage verification / 0-byte recovery (`audit-process/SKILL.md:42-62`, Windows fallback
  — **directly relevant to /migration** given JASON-OS `CLAUDE.md` §4 rule 15 "never
  accept empty agent results silently")

`/migration`'s agent-approach decision (D4) should borrow `audit-process`'s parallel-
dispatch pattern wholesale; the Windows 0-byte recovery pattern at
`audit-process/SKILL.md:52-62` is a direct gate/file-verify template for `/migration`'s
Phase 5 execution.

### 5. SonarCloud MCP as "reshape idiom" data source

`audit-refactoring:249-260` and `audit-security:236-248` query SonarCloud MCP for
baseline counts and issue lists. For `/migration`'s reshape verdict (D23/D24: reshape =
structural rewrites against destination idioms), a SonarCloud-equivalent for the
destination could supply concrete "this is what the destination's idioms look like"
data — but JASON-OS has no SonarCloud integration at v0 (per `JASON-OS/CLAUDE.md` §2
CI pipeline, SonarCloud is listed but needs `SONAR_TOKEN` not yet configured per
user-memory). **Design implication:** reshape research (BRAINSTORM Q5) for
JASON-OS-as-destination cannot rely on SonarCloud; must rely on grep-pattern
extraction from JASON-OS source itself (`scripts/lib/` helpers, `scripts/lib/sanitize-error.cjs`,
`.husky/pre-commit`, etc.).

### 6. Pre-commit compatibility escape hatches

`audit-enhancements/SKILL.md:467-476` calls out `SKIP_AUDIT_VALIDATION=1` for enhancement
JSONL (non-strict schema). Per JASON-OS `CLAUDE.md` §4 rule 14 ("Never set SKIP_REASON
autonomously"), `/migration` must never set such flags itself. **Design implication:**
if `/migration`'s Phase 5 writes audit-style output that pre-commit will reject, it
must surface that and let the user authorize the skip, not set it silently. This is a
direct inheritance from `audit-enhancements`'s pattern but with stricter user-auth.

### 7. Script-dependency blast radius per port

A rough script-dependency count (skills → SoNash-specific scripts):
- `audit-enhancements` → 1 (`intake-audit.js`)
- `audit-health` → 4 (`audit-health-check.js`, `count-commits-since.js`,
  `validate-templates.js`, `pre-audit-check.js`)
- `audit-performance` → 1 (`intake-audit.js`) + `npm run build`, `npm run lint`
- `audit-process` → 5 (`intake-audit.js`, `validate-audit.js`, `reset-audit-triggers.js`,
  `validate-schema.js`, `generate-views.js`)
- `audit-refactoring` → 1 (`intake-audit.js`) + 3 npm scripts (`deps:circular`,
  `deps:unused`, `tdms:metrics`)
- `audit-security` → 1 (`intake-audit.js`) + `npm audit`, `npm run patterns:check`

**Design implication for /migration:** each of these is a "unit with dependencies"
case that `/migration` must surface during Phase 2 discovery (ripple analysis). Porting
`audit-process` in particular is a multi-unit migration (skill + 5 scripts), which maps
to BRAINSTORM Q7 (skill decomposition) — this cluster is the strongest argument for
`/migration` needing multi-unit batching / `MIGRATION_PLAN.md` with unit grouping.

---

## Cross-cluster patterns (all six)

- **Shared template ref:** all six cite `.claude/skills/_shared/AUDIT_TEMPLATE.md`
  (e.g., `audit-enhancements/SKILL.md:417-418`, `audit-performance/SKILL.md:322-324`).
  This is a shared dependency `/migration` must treat as a single port-once artifact,
  not duplicate per-skill. Classic reshape candidate.
- **Shared prompt protocol:** all six use the "CRITICAL RETURN PROTOCOL:
  COMPLETE: [agent-id] wrote N findings to [path]" pattern
  (`audit-enhancements/SKILL.md:275-279`, `audit-performance/SKILL.md:77-83`,
  `audit-refactoring/SKILL.md:136-143`, `audit-security/SKILL.md:110-117`). This is a
  portable pattern; `/migration` should adopt it for Phase 5 agent dispatch.
- **Shared severity scale:** S0/S1/S2/S3 + E0/E1/E2/E3 used uniformly
  (`audit-enhancements/SKILL.md:286-298`, `audit-performance/SKILL.md:241-244`,
  `audit-refactoring/SKILL.md:329-332`, `audit-security/SKILL.md:329-331`). `/migration`
  verdict-plus-severity should adopt the same vocabulary to be TDMS-compatible.

---

## Sources

### Primary files inventoried
1. `C:\Users\jbell\.local\bin\sonash-v0\.claude\skills\audit-enhancements\SKILL.md` (v1.2, 2026-02-23, 506 lines)
2. `C:\Users\jbell\.local\bin\sonash-v0\.claude\skills\audit-health\SKILL.md` (v1.1, 2026-02-24, 148 lines)
3. `C:\Users\jbell\.local\bin\sonash-v0\.claude\skills\audit-performance\SKILL.md` (v1.0, 2026-02-25, 348 lines)
4. `C:\Users\jbell\.local\bin\sonash-v0\.claude\skills\audit-process\SKILL.md` (v2.5, 2026-04-03, 355 lines)
5. `C:\Users\jbell\.local\bin\sonash-v0\.claude\skills\audit-process\prompts.md` (companion, not inventoried in detail — noted as dependency)
6. `C:\Users\jbell\.local\bin\sonash-v0\.claude\skills\audit-refactoring\SKILL.md` (v1.0, 2026-02-25, 431 lines)
7. `C:\Users\jbell\.local\bin\sonash-v0\.claude\skills\audit-security\SKILL.md` (v1.0, 2026-02-25, 444 lines)

### Cross-references
- `C:\Users\jbell\.local\bin\JASON-OS\.research\migration-skill\BRAINSTORM.md` — §2 seven-phase arc; §3 D23 (verdict legend), D24 (Phase 5 content), D19 (CAS foreign-repo), D27 (research-scope expansion); §5 Q2 (cross-skill inventory)
- `C:\Users\jbell\.local\bin\sonash-v0\CLAUDE.md` — stack versions, §2 security rules, §7 agent/skill triggers
- `C:\Users\jbell\.local\bin\JASON-OS\CLAUDE.md` — §1 stack-agnostic posture, §2 security pipeline (gitleaks/semgrep/codeql/dep-review/scorecard/SonarCloud/Qodo), §4 rule 14/15 (SKIP_REASON auth, empty-agent-result rule)
- Referenced but not inventoried: `.claude/skills/_shared/AUDIT_TEMPLATE.md` (SoNash shared audit template — shared dependency for all six skills)

### Not inventoried (out of scope)
- `scripts/audit/audit-health-check.js` and the other 4 `scripts/audit/*.js` called by audit-health (Node.js implementations, cited by path only)
- `scripts/debt/intake-audit.js`, `scripts/debt/validate-schema.js`, `scripts/debt/generate-views.js`, `scripts/debt/resolve-item.js` (TDMS pipeline — cited by path only)
- `docs/audits/multi-ai/templates/*.md` (cross-model audit templates — companion artifacts)
- `audit-process/prompts.md` (22-agent prompt specifications — companion; would add ~1500 lines, not needed for L1 inventory)

---

**Skill count:** 6
**Coupling distribution:** 4 heavy/rewrite · 1 heavy/reshape-rewrite-mix · 1 medium/reshape · 0 light · 0 none
**Top 3 integration points for /migration:** (1) post-synthesis routing of audit findings into per-item `/migration` invocations; (2) TDMS intake contract as shared vocabulary that `/migration` must consume (not re-implement); (3) `audit-process`'s 7-stage + parallel-agent + Windows-0-byte-recovery pattern as direct prior art for `/migration`'s 7-phase arc and agent-approach (D4).
