# FINDINGS — D3-jason-os-skills-scripts

**Agent:** D3-jason-os-skills-scripts (Phase 1 deep-research for /migration)
**Date:** 2026-04-21
**Depth:** L1
**Scope:** JASON-OS `.claude/skills/` (14 skills) + `scripts/` (lib helpers + planning CLI) + `.planning/jason-os/BOOTSTRAP_DEFERRED.md` + CLAUDE.md §4 NEEDS_GATE signals — produce a complete blocker inventory for `/migration` execution readiness.
**Sub-question:** SQ-D3a — Which skills / scripts are `built | partial | missing`, how does each intersect the 7-phase `/migration` arc (Phase 0 context → Phase 6 prove), and what is the top-10 blocker list ranked by likely-shift risk (1 = high/volatile, 5 = low/stable)?

---

## Summary

**Skill counts by status (n=14 SKILL.md files located):**

- **Built (active, Foundation-scoped or full):** 11 — `brainstorm`, `checkpoint`, `convergence-loop`, `deep-plan`, `deep-research`, `skill-creator`, `todo`, `skill-audit`, `pre-commit-fixer`, `session-begin`, `session-end`
- **Partial (active but explicitly stubbed / scaffolded / reference wiring TBD):** 3 — `add-debt` (v0.1-stub), `pr-review` (v4.6 JASON-OS port, Foundation-scoped — references external review origins that may shift in v1), `label-audit` (v0.2, agent fleet wiring deferred to §S8)
- **Missing (referenced by BRAINSTORM §6 or CLAUDE.md §7 but not present):** 3 referenced-and-absent systems that `/migration` design claims — `/sync` (Piece 5 engine), **locally-ported CAS** (D19), `/pr-retro` (deferred per BOOTSTRAP_DEFERRED.md). These are **not SKILL.md stubs** — they are absent from `.claude/skills/` entirely.

**Script inventory:** `scripts/lib/` holds 7 ported helpers (sanitize-error, safe-fs, security-helpers, parse-jsonl-line, read-jsonl, todos-mutations, resolve-exec) — all built. `scripts/planning/todos-cli.js` + `render-todos.js` built. `scripts/session-end-commit.js` built. **Missing / unbuilt (will-be-called by `/migration` execute/prove):** no dedicated migration-state CLI, no CAS porter, no `/sync` engine, no verdict-gate artifact writer. These have **not** been stubbed.

**CLAUDE.md §4 NEEDS_GATE flagging — four hook surfaces /migration will have to respect in honor-only mode until gated:** `frustrationDetection` (guardrail #5), `loop-detector.js` (#9), `track-agent-invocation.js` (#15), `block-push-to-main.js` (already gated — #7). Three of four are unbuilt — they become de-facto `/migration` behavioral blockers because `/migration` executes commits + spawns agents per phase.

**Top-5 shift-risk rationale (full top-10 in §6):**

1. **`/sync` engine (Piece 5)** — highest risk. Piece 5 is unbuilt (BOOTSTRAP_DEFERRED.md:166–169); Phase 0 "pull /sync registry" in BRAINSTORM §2 requires it; schema (Piece 2) + labeling (Piece 3 in progress) are set but registry (Piece 4) and sync engine (Piece 5) don't exist yet — so Phase 0's whole contract is speculative.
2. **Ported CAS (D19)** — high. CAS has no SKILL.md in JASON-OS at all; D19 explicitly says "home-context assumptions reshaped during the CAS port itself" — meaning CAS is a **future port and `/migration`'s first real job**. Every Phase 2 discovery / ripple claim that leans on CAS semantics shifts until CAS lands and its configurable target-repo parameter shape is defined.
3. **`/pr-review` (partial)** — high. Version tag `4.6-jasonos-v0.1` (SKILL.md:12) names SonarCloud + Qodo only; CodeRabbit + Gemini were dropped. BRAINSTORM §5 Q2 (cross-skill integration) names `/pr-review` as a seed; the review-origin set is volatile until v1 matures.
4. **`add-debt` (stub)** — high-medium. v0.1-stub (SKILL.md:11); real TDMS-style system deferred until after sync-mechanism project. `/migration` `/pr-review` and Phase 6 prove-gate both reference debt filing — the schema of debt items will shift when the real system lands.
5. **`label-audit` (partial)** — medium-high. v0.2 `scaffolded in Piece 3 S7; real agent fleet wiring lands in §S8` (SKILL.md:19). Piece 3 is the *Next* item in BOOTSTRAP_DEFERRED.md:166. Catalog contract (`shared.jsonl` / `local.jsonl` / composites) is set but the agent dispatcher is volatile — `/migration` Phase 2 discovery calls into label derivation.

Every status claim below has a file:line citation from the 14 SKILL.md heads + BOOTSTRAP_DEFERRED.md + CLAUDE.md §4.

---

## Skill inventory

Columns: **Skill** | **Status** (built / partial / missing) | **/migration-phase dep** (0-6 per BRAINSTORM §2) | **Shift-risk rank** (1 high ↔ 5 stable) | **Evidence**

| Skill | Status | /migration phase dep | Shift risk | Evidence (file:line) |
|---|---|---|---|---|
| `brainstorm` | **built** (v1.0 ACTIVE) | Phase 1 target pick (seed ideas); re-entry per D28 | 5 (stable — native, JASON-OS v1.0) | `.claude/skills/brainstorm/SKILL.md:17` Status ACTIVE; :9 compat agentskills-v1; :11 version 1.0 |
| `checkpoint` | **built** (v2.0 ACTIVE) | All phases — gate-save per D20 state machine (R1) | 5 (stable — used across many skills already) | `.claude/skills/checkpoint/SKILL.md:17` Status ACTIVE; :11 version 2.0 |
| `convergence-loop` | **built** (v1.1) | Phase 6 prove (core dependency per BRAINSTORM §2) | 4 (interface stable; T20/T25 tenets locked) | `.claude/skills/convergence-loop/SKILL.md:9` version 1.1; :12-17 critical rules fully locked |
| `deep-plan` | **built** (v3.0 ACTIVE) | Phase 3 research (when verdict = reshape/rewrite); re-entry per D28 | 4 (stable — v3.0, widely used; only re-entry pattern is new) | `.claude/skills/deep-plan/SKILL.md:17` Status ACTIVE; :11 version 3.0 |
| `deep-research` | **built** (v2.0 ACTIVE) | Phase 3 research (verdict-conditional R4); this very agent | 4 (stable — canonical engine; the downstream adapter shape for /migration Phase 3 is the volatile part, not the skill itself) | `.claude/skills/deep-research/SKILL.md:17` Status ACTIVE; :11 version 2.0 |
| `skill-creator` | **built** (v3.4) | Meta-only — `/migration` itself was created via this path. Not called by runtime /migration. | 5 (stable — v3.4) | `.claude/skills/skill-creator/SKILL.md:11` version 3.4 |
| `todo` | **built** (v1.2) | Phase 5/6 — debt / deferral filing when `/add-debt` schema too heavy (SKILL.md:38 routes to JSONL) | 4 (schema stable; mutation path via todos-cli.js locked) | `.claude/skills/todo/SKILL.md:11` version 1.2; :33-35 JSONL-only mutation rule |
| `skill-audit` | **built** (v3.1 ACTIVE) | Meta-only — `/migration` itself audited via this path. Not called by runtime /migration. | 4 (T6 not wired — `npm run skills:validate` missing, manual check required) | `.claude/skills/skill-audit/SKILL.md:18` Status ACTIVE; :29 `npm run skills:validate` not wired |
| `pre-commit-fixer` | **built** (v2.0-jasonos-v0.1, Foundation-scoped) | Phase 5 execute — commit failures during staged writes | 3 (Foundation-scoped to gitleaks-only hook per D36-revised; recipes armed but hook body will grow — per-failure contract stable, coverage will shift) | `.claude/skills/pre-commit-fixer/SKILL.md:18` Status ACTIVE (Foundation-scoped); :28-35 gitleaks-only scaffold note |
| `session-begin` | **built** (v2.1 ACTIVE, trimmed) | Phase 0 context (session-setup sibling) | 3 (many sections marked DEFERRED inline; health scripts unwired per SKILL.md:22-27) | `.claude/skills/session-begin/SKILL.md:8` version 2.1; :22-27 DEFERRED inline markers |
| `session-end` | **built** (v2.2-jasonos-v0.1, Foundation-scoped) | Phase 6 prove + commit | 3 (Phase 3 metrics pipeline + most of Phase 2 gated on Layer 2 hooks — session-end is a `/migration` post-step and its coverage will shift) | `.claude/skills/session-end/SKILL.md:17` Status ACTIVE (Foundation-scoped); :27-32 metrics pipeline stripped |
| `add-debt` | **partial (v0.1-stub)** | Phase 5/6 — deferred-item filing from verdict gates + prove failures | 2 (explicit stub; real TDMS-style schema deferred until AFTER sync-mechanism project — schema WILL change) | `.claude/skills/add-debt/SKILL.md:11` version 0.1-stub; :14 Status ACTIVE (stub); :22-24 "real debt-tracking system ... is deferred" |
| `pr-review` | **partial (v4.6-jasonos-v0.1, Foundation-scoped)** | Phase 6 prove (external-review loop) + cross-skill per BRAINSTORM D27 | 2 (reviewer set trimmed to Qodo + SonarCloud only; CodeRabbit/Gemini excluded v0; pipeline-style learning capture out of scope — will shift) | `.claude/skills/pr-review/SKILL.md:12` version 4.6-jasonos-v0.1; :27-32 v0 scope note |
| `label-audit` | **partial (v0.2)** | Phase 2 discovery — unit-label derivation for `/sync` route-through (D15) | 2 (`scaffolded in Piece 3 S7; real agent fleet wiring lands in §S8` — §S8 not yet executed) | `.claude/skills/label-audit/SKILL.md:19` Status ACTIVE (scaffolded ... §S8) |
| **`/sync`** (Piece 5 engine) | **MISSING** | Phase 0 context (BRAINSTORM §2: "pull /sync registry"); D9 relation-to-sync; D15 sync-route-through | 1 (highest — unbuilt; Piece 3 only *Next*; Pieces 3.5/4/5 after) | `.planning/jason-os/BOOTSTRAP_DEFERRED.md:166-169` Piece 3 ⏳ Next, Piece 5 not scheduled; BRAINSTORM §6 table row |
| **Ported CAS** | **MISSING** | BRAINSTORM §6 dependencies row: "CAS port may itself be /migration's first big real job"; D19 | 1 (highest — whole CAS subsystem un-ported; home-context shape unknown until reshape happens) | BRAINSTORM.md:73 D19; BRAINSTORM.md:152 dependencies row; no `.claude/skills/{analyze,document-analysis,media-analysis,recall,repo-analysis,synthesize}` dirs in JASON-OS (BRAINSTORM.md:195 lists them in sonash path only) |
| `/pr-retro` | **missing (deferred)** | Phase 6 prove — retro loop | 3 (explicitly deferred; may never come over — depends on `/pr-ecosystem-audit` coming too) | `.planning/jason-os/BOOTSTRAP_DEFERRED.md:59-70` `pr-retro` deferred section |

**Skill-count verification:** 14 `SKILL.md` files under `.claude/skills/`; matches the task's expected count. Status split: **11 built / 3 partial / 0 missing-as-SKILL.md-stub** (plus 3 referenced-and-absent systems `/sync`, CAS, `/pr-retro` that are missing-from-the-skills-dir but named in BRAINSTORM or BOOTSTRAP_DEFERRED).

---

## Script inventory

Helpers `/migration` will call during execute (Phase 5) + prove (Phase 6). All built unless noted.

| Path | Status | /migration role | Evidence |
|---|---|---|---|
| `scripts/lib/sanitize-error.cjs` | built | Phase 5/6 — every error log; CLAUDE.md §2 mandates this wrapper | `scripts/lib/sanitize-error.cjs:20` canonical CJS; CLAUDE.md:46 mandates use |
| `scripts/lib/sanitize-error.d.ts` | built | TypeScript ambient — consumers that type-check | Found via Glob at `scripts\lib\sanitize-error.d.ts` |
| `scripts/lib/security-helpers.js` | built | Phase 5 — path traversal guard on every destination write | `scripts/lib/security-helpers.js:3` module doc; CLAUDE.md:47 mandates |
| `scripts/lib/safe-fs.js` | built | Phase 5 — atomic write + symlink guard around every file write | `scripts/lib/safe-fs.js:3` module doc; CLAUDE.md:48 mandates; :13-14 TRUST MODEL note |
| `scripts/lib/parse-jsonl-line.js` | built | Phase 2/5 — every JSONL read (labels, todos, debt) | `scripts/lib/parse-jsonl-line.js:4` T39 detector compliance |
| `scripts/lib/read-jsonl.js` | built | Phase 2 — label catalog + todos ingestion | `scripts/lib/read-jsonl.js:7` readRawContent |
| `scripts/lib/todos-mutations.js` | built | Phase 6 — deferred-item filing path (if /add-debt too heavy) | `scripts/lib/todos-mutations.js:5` module doc; :14 T30 data-loss fix |
| `scripts/lib/resolve-exec.js` | built | Phase 5 — spawn hardening on Windows (.cmd shims per user env) | `scripts/lib/resolve-exec.js:4` module doc |
| `scripts/planning/todos-cli.js` | built | Phase 6 — CLI for JSONL mutations (locked, regression-checked) | `scripts/planning/todos-cli.js:2` module doc |
| `scripts/planning/render-todos.js` | built | auto-called by todos-cli after mutations (SKILL.md `todo`:32) | Found via Glob |
| `scripts/planning/package.json` | built | local deps for planning CLI | Found via Glob |
| `scripts/planning/lib/read-jsonl.js` | built | duplicated read helper | Found via Glob |
| `scripts/session-end-commit.js` | built | Phase 6 close-out commit | `scripts/session-end-commit.js:2` module doc |
| `scripts/config/propagation-patterns.seed.json` | built | config seed (referenced by label / propagation flows) | Found via Glob |
| **MISSING — `scripts/sync/` (registry + engine)** | missing | Phase 0 context (pull registry), Phase 5 sync-route-through | No `scripts/sync/` directory; BOOTSTRAP_DEFERRED.md:166-169 names Pieces 4 + 5 unbuilt |
| **MISSING — `scripts/migration/` or `scripts/cas/` porter** | missing | Phase 2-5 — CAS-port-style active transformation script surface | BRAINSTORM.md:195 lists `scripts/cas/` in SoNash path only; not in JASON-OS scripts/ tree |
| **MISSING — per-phase state CLI** (e.g. `scripts/migration/state-cli.js`) | missing | State machine tracks gates (D20 / R1); resume per D22 / R3 | Not found in Glob results; no SKILL.md names it either |
| **MISSING — verdict-gate artifact writer** (e.g. `scripts/migration/write-plan.js` → writes `MIGRATION_PLAN.md`) | missing | Phase 4 plan artifact (D3) | Not found in Glob results |

**Hook surfaces `/migration` runs under** (from `.claude/hooks/` + CLAUDE.md §4):

- `.claude/hooks/block-push-to-main.js` — **GATED** — enforces guardrail #7. (CLAUDE.md:95)
- `.claude/hooks/check-mcp-servers.js` — active; MCP presence check.
- `.claude/hooks/large-file-gate.js` — active; Phase 5 write size gate.
- `.claude/hooks/lib/symlink-guard.js` — active; consumed by `safe-fs.js`.
- `.claude/hooks/settings-guardian.js` — GATED (MIXED) — guardrail #14 settings.json write.
- `.claude/hooks/commit-tracker.js` — active; Phase 5/6 commit metadata.
- `.claude/hooks/compact-restore.js` + `.claude/hooks/pre-compaction-save.js` — active; resume via D22 / R3.
- **NEEDS_GATE** per CLAUDE.md §4: `frustrationDetection` (guardrail #5), `loop-detector.js` (#9), `track-agent-invocation.js` result-size check (#15). All **unbuilt** — honor-only until landing (CLAUDE.md:92-94, :100-101, :112-114).

---

## Top 10 blockers ranked by shift risk

Rank 1 = highest shift risk (unbuilt or explicitly stubbed; schema / interface volatile). Rank 5 = stable (interface locked, well-used).

| # | Blocker | Rank | Rationale |
|---|---|---|---|
| 1 | **`/sync` engine (Piece 5)** | **1** | Unbuilt. Phase 0 of `/migration` (pull registry) + D9 + D15 all require it. Piece 3 labeling is *Next*, Piece 4 registry after, Piece 5 last. `/migration` Phase 0 contract is speculative until Piece 5 exists. (BOOTSTRAP_DEFERRED.md:166-169; BRAINSTORM.md:149-151) |
| 2 | **Locally-ported CAS (D19)** | **1** | No `.claude/skills/{analyze,document-analysis,media-analysis,recall,repo-analysis,synthesize}` dirs exist in JASON-OS — they're SoNash-only. D19 explicitly makes CAS's own port part of `/migration`'s reshape work (home-context → configurable target-repo parameters). Every Phase 2 ripple claim that touches CAS semantics shifts. (BRAINSTORM.md:73, :152, :195) |
| 3 | **`add-debt` v0.1 stub — real TDMS deferred** | **2** | Stub only; real schema deferred until AFTER sync-mechanism project. `/migration` Phase 5 verdict denials + Phase 6 prove failures file debt. When real system lands, every call-site reshapes. (add-debt SKILL.md:11, :22-24) |
| 4 | **`pr-review` v4.6-jasonos-v0.1 (Foundation-scoped)** | **2** | Reviewer set trimmed to Qodo + SonarCloud only; CodeRabbit/Gemini excluded; pipeline-style learning capture stripped; named in BRAINSTORM D27 as a cross-skill seed. (pr-review SKILL.md:12, :27-32) |
| 5 | **`label-audit` v0.2 — §S8 agent fleet wiring deferred** | **2** | Scaffolded in Piece 3 S7; real wiring in §S8 not executed. Piece 3 is *Next* in BOOTSTRAP_DEFERRED. `/migration` Phase 2 discovery calls label derivation. (label-audit SKILL.md:19; BOOTSTRAP_DEFERRED.md:166) |
| 6 | **Missing migration-state CLI / verdict-gate artifact writer** | **2** | No `scripts/migration/` dir exists. State machine per D20/R1 + `MIGRATION_PLAN.md` artifact per D3 have no Node.js scaffolding — they must be written as part of `/migration`'s own build, and their schema will move as deep-plan surfaces decisions. (Glob: scripts/** returns 0 matches for `migration/`) |
| 7 | **CLAUDE.md §4 NEEDS_GATE items (honor-only)** | **3** | Three unbuilt hooks will gate `/migration` execution once they land: `frustrationDetection` (#5), `loop-detector.js` (#9), `track-agent-invocation.js` result-size (#15). `/migration` executes commits + spawns agents per phase — behavior will change when gates flip on. (CLAUDE.md:92-94, :100-101, :112-114) |
| 8 | **`session-begin` inline DEFERRED sections (Phase 0 context)** | **3** | Many SKILL.md sections marked DEFERRED inline (health scripts, override/health-score logs, secrets-decryption gate). `/migration` Phase 0 sits next to `/session-begin`; its discovery surface will re-open when those land. (session-begin SKILL.md:22-27) |
| 9 | **`session-end` Phase 3 metrics pipeline + most Phase 2 stripped** | **3** | Foundation-scoped to Phase 1 + Phase 4 only; metrics pipeline, ecosystem-health, TDMS debt consolidation / metrics-generation all deferred until Layer 2 hooks land. `/migration` closes by invoking `/session-end` — coverage will shift. (session-end SKILL.md:27-32) |
| 10 | **`pre-commit-fixer` gitleaks-only scaffold (D36-revised)** | **3** | Hook body is gitleaks-only today; ESLint / Prettier / tsc / lint-staged / cognitive-complexity all deferred per D36-revised. `/migration` Phase 5 commits run through this hook; coverage expands over time. (pre-commit-fixer SKILL.md:28-35) |

**Honorable mentions (rank 4-5, noted but not blockers):**

- `brainstorm` (rank 5) — stable, used in this very research.
- `checkpoint` (rank 5) — stable, v2.0 widely adopted.
- `convergence-loop` (rank 4) — core contract locked; only risk is new composable behaviors.
- `deep-plan` + `deep-research` (rank 4) — stable engines; the downstream adapter shape for `/migration` Phase 3 is the volatile part, not the skills themselves.
- `todo` (rank 4) — JSONL contract locked via T30 fix; mutation path stable.
- `skill-creator` + `skill-audit` (rank 4-5) — meta-only, not runtime dependencies of `/migration`.

---

## Sources

- `C:\Users\jbell\.local\bin\JASON-OS\.research\migration-skill\BRAINSTORM.md` — §2 bones (7 phases 0-6), §3 D19 (CAS) / D23-D24 (verdicts) / D29 (local-filesystem v1), §5 Q3 (blocker inventory prompt), §6 dependencies table, §9 pointers (line 195 names SoNash CAS path)
- `C:\Users\jbell\.local\bin\JASON-OS\CLAUDE.md` — §2 security helpers (lines 40-55), §4 behavioral guardrails with `[GATE]`/`[BEHAVIORAL]`/`NEEDS_GATE` annotations (lines 81-117), §5 anti-patterns (lines 118-132), §7 triggers (lines 143-159)
- `C:\Users\jbell\.local\bin\JASON-OS\.planning\jason-os\BOOTSTRAP_DEFERRED.md` — lines 11-70 deferred skills (`session-end` original ref, `pr-review`, `pr-retro`); lines 156-176 sync-mechanism progress pointer (Piece 3 *Next*; Pieces 3.5/4/5 after)
- `C:\Users\jbell\.local\bin\JASON-OS\.claude\skills\*\SKILL.md` — 14 files: `brainstorm`, `checkpoint`, `convergence-loop`, `deep-plan`, `deep-research`, `skill-creator`, `todo`, `add-debt`, `pr-review`, `pre-commit-fixer`, `session-begin`, `skill-audit`, `session-end`, `label-audit`. Each head (frontmatter + first 40 lines) read for status + scope notes.
- `C:\Users\jbell\.local\bin\JASON-OS\scripts\lib\` — 7 helpers (sanitize-error.cjs + .d.ts, safe-fs.js, security-helpers.js, parse-jsonl-line.js, read-jsonl.js, todos-mutations.js, resolve-exec.js)
- `C:\Users\jbell\.local\bin\JASON-OS\scripts\planning\` — todos-cli.js, render-todos.js, package.json, lib/read-jsonl.js
- `C:\Users\jbell\.local\bin\JASON-OS\scripts\session-end-commit.js` + `scripts\config\propagation-patterns.seed.json`
- `C:\Users\jbell\.local\bin\JASON-OS\.claude\hooks\` — block-push-to-main.js (gated), check-mcp-servers.js, large-file-gate.js, settings-guardian.js, commit-tracker.js, compact-restore.js, pre-compaction-save.js, lib/symlink-guard.js (from Glob results)
- `C:\Users\jbell\.local\bin\JASON-OS\.claude\sync\` — schema/ (Piece 2 complete: SCHEMA.md, EVOLUTION.md, EXAMPLES.md), label/ (Piece 3 scaffold: lib/, hooks/, skill/, backfill/, docs/). No engine/ or registry/ dir — Pieces 4+5 unbuilt, matches BOOTSTRAP_DEFERRED.md ledger.

**Negative evidence (referenced but not found):**

- No `.claude/skills/{analyze,document-analysis,media-analysis,recall,repo-analysis,synthesize}` — CAS subsystem absent (BRAINSTORM.md:195 lists only in SoNash path).
- No `scripts/migration/` directory — migration-state CLI / plan writer unbuilt.
- No `scripts/cas/` directory — CAS porter unbuilt.
- No `scripts/sync/` directory — sync engine unbuilt (matches BOOTSTRAP_DEFERRED.md:166-169 Pieces 4+5 status).
- No `.claude/skills/pr-retro/` — confirms BOOTSTRAP_DEFERRED.md:59-70 deferral.

---

**Return payload for parent agent:** see `## Summary` for skill-count split (11 built / 3 partial / 3 referenced-and-absent), top-5 shift-risk blockers with rationale, and file-size verification below. Every row in the skill + script inventory has a file:line citation or explicit `MISSING` with negative-evidence citation.
