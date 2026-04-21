# D2-mcp-testing — SoNash MCP/Testing/Validation Skill Cluster Inventory

**Agent:** Phase 1 D-agent D2-mcp-testing
**Parent question:** BRAINSTORM §5 Q2 (cross-skill integration inventory, D27 expansion)
**Depth:** L1 (file:line)
**Date:** 2026-04-21
**Scope:** 7 skills — mcp-builder, system-test, webapp-testing, test-suite, validate-claude-folder, sonash-context, add-debt
**Lens:** Each skill's /migration integration surface per D23 verdicts — does-what, coupling, phase, invocation shape, verdict.

---

## Summary

Seven skills inventoried in SoNash's `.claude/skills/`. The cluster splits cleanly by coupling:

- **Generic (copy-as-is / sanitize):** `mcp-builder`, `webapp-testing` — both vendored Anthropic skills with NO SoNash references. Pure how-to content.
- **Heavily SoNash-coupled (rewrite):** `system-test`, `test-suite`, `sonash-context`, `add-debt` — hard-wired to SoNash domains, Firestore, MASTER_DEBT.jsonl, Cloud Functions, `/admin`, `/journal`.
- **Reshape candidate:** `validate-claude-folder` — structure is generic but checks are SoNash-specific (`COMMAND_REFERENCE.md`, `SONAR_TOKEN`, specific hook names, encrypted secrets).

**Key /migration findings:**

1. **`mcp-builder` is NOT a Phase 5 transformation helper for /migration.** It builds standalone MCP servers from API specs — zero overlap with moving files between JASON-OS and external repos. Port-as-is candidate; /migration does NOT call it.
2. **`webapp-testing` is the strongest Phase 6 "Prove" candidate** — Playwright-based, fully generic, no SoNash coupling. But only useful when the migrated unit is a web UI feature. Low likelihood of general /migration invocation; opportunistic.
3. **`test-suite` is SoNash-specific** — runs Playwright against `sonash-app.web.app`, feature protocols in `.claude/test-protocols/`, assertions tied to SoNash routes (`/admin`, `/journal`, `/notebook`, `/meetings/all`). NOT usable by generic /migration. Could become a template for `/test-suite` in JASON-OS after `.claude/test-protocols/` exists.
4. **`system-test` is SoNash-specific** — 23 domains hardwired to SoNash (Firestore Rules, Cloud Functions, Admin Panel, PWA, Sentry, Firebase env/config). Not a /migration Phase 6 gate for generic units. Rewrite candidate for a JASON-OS-flavored `/system-test` post-port.
5. **`validate-claude-folder` has high Phase 6 value** as a structural gate on JASON-OS's own `.claude/` after /migration writes new skills/hooks/commands. Needs reshape — drop `.env.local.encrypted`, `SONAR_TOKEN`, specific hook list. Strong candidate for a /migration "post-write integrity check."
6. **`sonash-context` is a clearly SoNash-coupled context injection** consumed by agents with `skills: [sonash-context]`. Direct JASON-OS equivalent is needed (`jason-os-context`). NOT invoked by /migration, but /migration-written agents MAY declare `skills: [jason-os-context]` in their frontmatter — so /migration's reshape transformations need to rewrite `sonash-context` → `jason-os-context` references in ported agents (Phase 5 rewrite target).
7. **`add-debt` is a tracker** (MASTER_DEBT.jsonl), not an active-transformation helper. Useful as /migration's Phase 5/6 outlet for deferred items ("migration surfaced technical debt we didn't fix this run"). Thin coupling to SoNash (MASTER_DEBT.jsonl path, category options) — mostly reshape-to-DEBT_LOG.md.

**Coupling distribution:** 2 generic, 1 reshape, 4 rewrite-or-SoNash-specific.
**Phase 6 Prove candidates:** `webapp-testing` (opportunistic, UI only), `validate-claude-folder` (structural, after reshape).
**Active /migration callers:** `add-debt` (Phase 5 deferred-item outlet), `validate-claude-folder` (Phase 6 integrity gate after reshape). The rest are migration TARGETS, not callers.

---

## Skill Integration Table

| Skill | Does-what | Coupling level | /migration phase | Invocation shape | Verdict (per D23) | Evidence |
|-------|-----------|----------------|------------------|------------------|-------------------|----------|
| **mcp-builder** | Guide for building high-quality MCP servers (Python FastMCP / TS SDK). 4 phases: Research, Implement, Review, Evaluate. | **Generic** — zero SoNash refs. Pure vendored Anthropic skill. | **None** (/migration does NOT call it). It's a TARGET if JASON-OS wants MCP-building capability. | User-invoked `/mcp-builder`; not scripted. | **copy-as-is** — vendored content, license preserved. | SKILL.md:2-9 description is API-building guide. SKILL.md:1-430 zero mentions of sonash/firebase/tokens. License at `mcp-builder/LICENSE.txt`. |
| **system-test** | 23-domain interactive audit of SoNash codebase (Firestore Rules, Cloud Functions, Admin Panel, PWA, Sentry, TDMS, Firebase env). 6 sessions, per-finding review, syncs to MASTER_DEBT.jsonl. | **Heavy SoNash** — 58 matches for sonash/firebase/firestore/httpsCallable in domains.md. | **Not directly callable by /migration.** It's a TARGET — rewrite candidate for a JASON-OS `/system-test`. Phase 6 role only after JASON-OS's own domains exist. | `/system-test [--resume] [--domain N] [--from N --to M]`. Output: `docs/audits/system-test/audit-YYYY-MM-DD/`. | **rewrite** — architecture reusable, every domain needs re-authoring against JASON-OS stack. | SKILL.md:7 "23-domain interactive system/repo test plan"; SKILL.md:196-222 domain list (Firestore Rules, Cloud Functions, Sentry, Admin Panel, PWA); SKILL.md:226-233 TDMS sync to MASTER_DEBT.jsonl; SKILL.md:97-101 output path `docs/audits/system-test/`. |
| **webapp-testing** | Vendored Anthropic skill for Playwright browser automation of local webapps. `scripts/with_server.py` manages server lifecycle. | **Generic** — zero SoNash refs. License-carrying vendored skill. | **Phase 6 Prove (opportunistic)** — only when migrated unit produces a web UI. Low likelihood for file/workflow/concept migrations. | `python scripts/with_server.py --server "npm run dev" --port 5173 -- python your_automation.py`. Called as external script. | **copy-as-is** — no reshape needed. | SKILL.md:1-8 vendored description; SKILL.md:12-22 helper script is black-box; SKILL.md:55-71 Playwright examples are stack-agnostic. |
| **test-suite** | Multi-phase Playwright/Chrome Extension testing for SoNash: smoke, feature protocols, security, performance. Hardcoded to `sonash-app.web.app` and routes `/admin /journal /notebook /meetings/all`. | **Heavy SoNash** — URL fallback, routes, protocol paths all SoNash. | **Phase 6 Prove (SoNash only)**. NOT /migration-callable for generic units. TARGET for rewrite to JASON-OS `/test-suite` if JASON-OS gains a web-app endpoint. | `/test-suite [scope] [--url=TARGET] [--protocol=NAME] [--chrome]`. Scopes: `--smoke --feature --security --performance --full`. | **rewrite** — hardcoded URLs/routes, feature protocols SoNash-specific, but pipeline shape (5 phases) reusable. | SKILL.md:56 `https://sonash-app.web.app` fallback; SKILL.md:76 route list `/notebook /admin /journal /meetings/all`; SKILL.md:112 `.claude/test-protocols/*.protocol.json` scan; SKILL.md:155 redirect-to-login check on `/admin`. |
| **validate-claude-folder** | Structural validator for `.claude/` folder: MCP config, hook file existence, skill/command alignment, doc freshness, secrets config, agent frontmatter. | **Mixed** — structure generic; checks reference SoNash-specific files (`COMMAND_REFERENCE.md`, `SONAR_TOKEN`, specific hook name list, `.env.local.encrypted`). | **Phase 6 Prove — integrity gate** after /migration writes new skills/hooks/commands into JASON-OS. Best post-migration verification primitive in the cluster after reshape. | `/validate-claude-folder` — reports summary table (MCP/Hooks/Skills/Docs/Secrets/Agents pass/fail). | **reshape** — drop SONAR_TOKEN, drop encrypted-secrets probe, parameterize hook list, drop SoNash COMMAND_REFERENCE.md ref. Checks are valuable; probes need JASON-OS targets. | SKILL.md:40-50 hardcoded hook list (`session-start check-mcp-servers check-write-requirements check-edit-requirements pattern-check analyze-user-request`); SKILL.md:74-84 `SONAR_TOKEN`, `.env.local.encrypted`; SKILL.md:66-68 references `.claude/COMMAND_REFERENCE.md` and `HOOKS.md`. |
| **sonash-context** | Context-injection skill consumed by agents via `skills: [sonash-context]` frontmatter. Provides stack versions (Next.js 16, React 19, Firebase 12), security boundaries (httpsCallable, App Check, sanitizeError), and SoNash file paths. | **Heavy SoNash** — entire payload is SoNash facts (stack versions, Firestore collections, Cloud Functions path, `firebase.json`). | **Not invoked by /migration directly.** BUT: ported agents may declare `skills: [sonash-context]`, and /migration Phase 5 (rewrite verdict) must transform those references to `skills: [jason-os-context]` or strip them. | Passive — declared in agent frontmatter, Claude auto-loads. | **rewrite** — every field changes. JASON-OS needs its own `jason-os-context` skill with agnostic stack, JASON-OS security boundaries, JASON-OS paths. | SKILL.md:1-4 "skills: field" injection; SKILL.md:27-34 stack versions; SKILL.md:46-55 SoNash security boundaries (httpsCallable, App Check, sanitize-error.js); SKILL.md:58-68 SoNash paths. |
| **add-debt** | Appends technical-debt items to MASTER_DEBT.jsonl via two workflows: PR-deferred (with PR number) or manual. Writes through `scripts/debt/intake-pr-deferred.js` / `intake-manual.js`. | **Medium SoNash** — depends on MASTER_DEBT.jsonl path, intake scripts in `scripts/debt/`, category enum. Structure and field schema are generic. | **Phase 5 outlet** — when /migration defers a ripple/issue it cannot fix in-flow. **Phase 6 outlet** — prove surfaces deferred findings. Mirrors JASON-OS v0 stub that already exists per skills list. | `add-debt` with fields: file, line, title, severity (S0-S3), category. Optional pr_number for deferred. Runs `node scripts/debt/intake-*.js`. | **reshape** — JASON-OS v0 stub already exists (writes to `.planning/DEBT_LOG.md`). /migration integration: call the JASON-OS stub with migration-context reason. | SKILL.md:40 "Output Location: docs/technical-debt/MASTER_DEBT.jsonl"; SKILL.md:147-155 runs `node scripts/debt/intake-manual.js`; SKILL.md:265-275 category options. JASON-OS stub present per skills list: "add-debt: Log a technical-debt item to .planning/DEBT_LOG.md". |

---

## Top Integration Points for /migration

Ranked by value-per-unit-of-reshape-effort:

### 1. `validate-claude-folder` — Phase 6 integrity gate (HIGH value, LOW effort)

After /migration writes new skills, agents, hooks, or commands into JASON-OS's `.claude/`, it needs a structural integrity check. `validate-claude-folder` is the right shape: 6 checks (MCP / hooks / skill-command alignment / docs / secrets / agents) producing a summary table. Reshape needed (drop SONAR_TOKEN probe; parameterize hook list; point docs check at JASON-OS docs) but the pipeline is exactly what /migration needs.

**Invocation shape for /migration:** After Phase 5 execute completes, /migration calls a reshaped `/validate-claude-folder` pointed at JASON-OS root. Results feed into Phase 6 convergence-loop tally. Checks that MUST pass: agent frontmatter valid; skill-command alignment; hook files referenced in settings.json exist. Checks that are advisory: docs freshness (staleness detection).

**Evidence:** `validate-claude-folder/SKILL.md:40-50` (hook existence check pattern); `:86-96` (agent frontmatter check — reusable as-is).

### 2. `add-debt` — Phase 5/6 deferred-item outlet (HIGH value, ALREADY PORTED as v0 stub)

The JASON-OS v0 stub exists (per system skill list: "Log a technical-debt item to .planning/DEBT_LOG.md"). /migration uses this when it hits a ripple or reshape it cannot fix in-flow, per D8 (nothing silent): every deferred item gets a DEBT record. Integration is direct: /migration Phase 5 reshape/rewrite gate with user choice "defer → /add-debt".

**Invocation shape for /migration:** `/add-debt --title "Migration deferred: X" --severity S2 --category engineering-productivity --source migration-<unit-id>` or equivalent JASON-OS-stub arg shape. Reason field: "Deferred during /migration of <unit> — cross-ref MIGRATION_PLAN.md".

**Evidence:** SoNash `add-debt/SKILL.md:161-185` intake script invocation shape; JASON-OS v0 stub already present.

### 3. `webapp-testing` — Phase 6 Prove (opportunistic, LOW invocation rate)

Only fires when a migrated unit is a web UI feature. For file/workflow/concept migrations in a non-web repo, this is dormant. But when it matches, it's pure Playwright against whatever the destination runs — no SoNash ties. Copy-as-is port.

**Invocation shape for /migration:** Only when D23 verdict output unit is UI. Phase 6 runs `python scripts/with_server.py --server "<destination-dev-cmd>" --port <N> -- python <migration-smoke.py>`. The migration-smoke.py is generated by /migration based on the ported UI's expected routes/selectors.

**Evidence:** `webapp-testing/SKILL.md:56-71` server-helper invocation (fully parameterized); no SoNash refs.

### 4. `sonash-context` — Phase 5 rewrite TARGET (not a caller; transform it)

When /migration ports a SoNash agent declaring `skills: [sonash-context]`, Phase 5 rewrite must transform that frontmatter line. Two paths: (a) rewrite to `skills: [jason-os-context]` if a JASON-OS-context skill exists; (b) strip the skills field if JASON-OS has not yet built one. This is a concrete sanitize/reshape primitive for agent frontmatter migration.

**Evidence:** `sonash-context/SKILL.md:1-4` "consumed by agent definitions via skills: field" — identifies the exact rewrite target.

### 5. `system-test` and `test-suite` — TARGETS, not /migration callers

Both are Phase 6 candidates in principle but so SoNash-coupled they require full rewrite. /migration will likely NOT invoke them at run-time. Instead they're future `/migration` JOBS — rewrite them against JASON-OS once JASON-OS has Firestore-equivalents / UI routes. After rewrite, the JASON-OS variants might become /migration Phase 6 gates, but v1 /migration cannot rely on them.

**Evidence:** `system-test/SKILL.md:196-222` (23-domain list all SoNash-specific); `test-suite/SKILL.md:56` (sonash-app.web.app hardcoded); `test-suite/SKILL.md:76` (SoNash route list).

### 6. `mcp-builder` — Not a /migration caller, not a Phase 5 helper

**Question from brief: "is `mcp-builder` a Phase 5 transformation helper (builds MCP servers per migration)?"** — **No.** `mcp-builder` builds MCP servers wrapping external APIs (Slack, GitHub, Drive). That's orthogonal to /migration's active-transformation work (sanitize / reshape / rewrite source-repo artifacts to destination idioms). The two domains don't intersect. `mcp-builder` is a port-as-is target.

**Evidence:** `mcp-builder/SKILL.md:13-29` (domain is "integrate external APIs or services"); no mention of artifact transformation, file movement, repo-to-repo work.

---

## Special-Focus Answers (from Brief)

**Q: Is `mcp-builder` a Phase 5 transformation helper?**
A: **No.** Unrelated domain (API → MCP server). Zero overlap with /migration's sanitize/reshape/rewrite pipeline. Port-as-is candidate; /migration never calls it.

**Q: Is `system-test` / `webapp-testing` / `test-suite` useful for Phase 6 (Prove)?**
A: **Mixed.**
- `webapp-testing` — YES, opportunistic (only for UI migrations). Copy-as-is.
- `system-test` — NO for v1 /migration; rewrite-target for future JASON-OS `/system-test`.
- `test-suite` — NO for v1 /migration; rewrite-target for future JASON-OS `/test-suite` pending a JASON-OS web-app endpoint.

**Q: Is `validate-claude-folder` a Phase 6 gate?**
A: **YES, after reshape.** Strong candidate — pipeline shape is exactly right (6 structural checks producing summary table). Needs reshape to drop SoNash-specific probes (SONAR_TOKEN, specific hook list, COMMAND_REFERENCE.md path). Post-reshape, it's the highest-value Phase 6 integrity gate in this cluster for non-UI migrations.

**Q: `sonash-context` — clearly SoNash-coupled?**
A: **Confirmed.** Entire payload is SoNash facts. Flagged. NOT a /migration caller, BUT /migration Phase 5 rewrite must handle `skills: [sonash-context]` → `skills: [jason-os-context]` transformation in ported agent frontmatter.

---

## Coupling Distribution

| Coupling level | Count | Skills |
|----------------|-------|--------|
| Generic (copy-as-is, vendored or stack-agnostic) | 2 | `mcp-builder`, `webapp-testing` |
| Reshape (structure reusable, probes need retargeting) | 2 | `validate-claude-folder`, `add-debt` (v0 stub already exists) |
| Rewrite / SoNash-specific (needs full re-authoring) | 3 | `system-test`, `test-suite`, `sonash-context` |

---

## Sources

- `<SONASH_ROOT>\.claude\skills\mcp-builder\SKILL.md` (lines 1-430)
- `<SONASH_ROOT>\.claude\skills\mcp-builder\LICENSE.txt` (vendored Anthropic)
- `<SONASH_ROOT>\.claude\skills\mcp-builder\reference\` (dir: mcp_best_practices.md, python_mcp_server.md, node_mcp_server.md, evaluation.md)
- `<SONASH_ROOT>\.claude\skills\system-test\SKILL.md` (lines 1-295)
- `<SONASH_ROOT>\.claude\skills\system-test\domains.md` (62KB; 58 SoNash-coupling matches)
- `<SONASH_ROOT>\.claude\skills\webapp-testing\SKILL.md` (lines 1-132)
- `<SONASH_ROOT>\.claude\skills\webapp-testing\LICENSE.txt` (vendored Anthropic)
- `<SONASH_ROOT>\.claude\skills\test-suite\SKILL.md` (lines 1-329)
- `<SONASH_ROOT>\.claude\skills\validate-claude-folder\SKILL.md` (lines 1-133)
- `<SONASH_ROOT>\.claude\skills\sonash-context\SKILL.md` (lines 1-91)
- `<SONASH_ROOT>\.claude\skills\add-debt\SKILL.md` (lines 1-311)
- `<JASON_OS_ROOT>\.research\migration-skill\BRAINSTORM.md` §3 D23 (verdict legend), D24 (Phase 5 content), D27 (integration inventory scope); §5 Q2 (integration question)
- JASON-OS system skill list (user-visible skills roster) confirming `add-debt` v0 stub at `.planning/DEBT_LOG.md`

---

**Findings complete.** Caller should batch this with sibling D2-* agents (audit-family-a/b, code-pr-gh, content-analysis-adjacent, content-other, core-orchestration, ecosystem-audits-a/b) for full Q2 integration inventory.
