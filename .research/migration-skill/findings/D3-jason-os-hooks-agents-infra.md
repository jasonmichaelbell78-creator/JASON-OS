# FINDINGS — D3-jason-os-hooks-agents-infra

**Agent:** Phase-1 deep-research D-agent D3b (JASON-OS infra half of Q3)
**Sub-question:** SQ-D3b — Scan JASON-OS infrastructure (`.claude/hooks/`, `.claude/agents/`, `.planning/`, `.research/sync-mechanism/`, repo-level infra) for `/migration` execution blockers; rank by shift risk. D3a owns skills/scripts; this D3b agent stays to hooks/agents/planning/sync/infra.
**Depth:** L1. File:line citations on every status claim.
**Date:** 2026-04-21

---

## Summary

JASON-OS's hook + agent + planning surface is a **shallow execution substrate** for what `/migration` needs. The 8 wired hooks cover git safety, compaction, and settings integrity — but **every one of the CLAUDE.md §4 rules that /migration D8 ("nothing silent") leans on is still `[BEHAVIORAL: honor-only]` or explicitly `NEEDS_GATE` pending hooks that do not exist** (CLAUDE.md:62-91). There is **no gate-memory store, no reshape primitive, no shared text-transformation helper**, and the only sanitize helper is an **error-log scrubber** (`scripts/lib/sanitize-error.cjs`) — not a content-sanitizer for files crossing repos. The 8 agents present are exclusively `/deep-research`-pipeline agents (no migration-shaped agents). The sync-mechanism the brainstorm names as a hard dependency (Piece 5 `/sync`) is **three pieces away from existing** (Piece 3 still executing S8–S14, Pieces 3.5/4/5 unbuilt).

**Blocker totals (my scope):**
- Hook-layer blockers: **5 critical** (4 NEEDS_GATE + 1 honor-only with no gate named)
- Planning-gap blockers: **4 deferred items** that must resolve before `/migration` can execute (T18 Layer-2 hooks, T19 Layer-3 nav, sync-mechanism Pieces 3.5/4/5, bootstrap-deferred `pr-review` + `session-end`)
- Sync-mechanism pieces: **3 of 5 DONE** (1a/1b/2) — Piece 3 in-flight (S1–S7 done, S8–S14 pending), **Pieces 3.5/4/5 unbuilt**
- Repo-level infra gaps: **4** (no transform primitive, no reshape engine, no gate-memory store, no content-level sanitize helper)

---

## Hooks inventory

Source files: `.claude/hooks/*.js`, `.claude/settings.json` hook wiring, CLAUDE.md §4.

| Hook | Status | /migration need | Shift-risk | Evidence |
|---|---|---|---|---|
| `block-push-to-main.js` | WIRED, hard-blocking | D29 — local-only v1, so push guard is an incidental safety net, not a blocker | 5 (stable) | `.claude/hooks/block-push-to-main.js:1-30`; `settings.json:43-52` (`continueOnError` absent = blocking) |
| `check-mcp-servers.js` | WIRED, fail-open SessionStart | Not directly needed by /migration | 5 | `.claude/hooks/check-mcp-servers.js:1-30`; `settings.json:32-41` |
| `compact-restore.js` | WIRED, SessionStart `^compact$` | /migration state machine (D20 R1) **depends** on mid-state resume after compaction — this hook reloads `handoff.json` but does not know about `MIGRATION_PLAN.md` state files | 3 (needs extension, shape stable) | `.claude/hooks/compact-restore.js:1-40` |
| `commit-tracker.js` | WIRED, fail-open PostToolUse Bash | /migration Phase 5/6 commits surface through this; per CLAUDE.md §4.13 "Review hook summary after every commit/push" is `[BEHAVIORAL: honor-only]` — **no gate exists** to force acknowledgment of the hook summary | 1 (high — §4.13 silent-fail is exactly what D8 prohibits) | `.claude/hooks/commit-tracker.js:1-60`; CLAUDE.md:85 |
| `large-file-gate.js` | WIRED, fail-open PreToolUse Read | /migration Phase 2 may read large source artifacts; current 5MB hard block could legit trip | 4 | `.claude/hooks/large-file-gate.js:1-30` |
| `pre-compaction-save.js` | WIRED, fail-open PreCompact | Writes `.claude/state/handoff.json` — **only captures session-counter/commits/plans, no skill-specific state keys**. /migration's gate-memory (D22 R3) needs per-invocation state outside this handoff | 2 (needs augmentation) | `.claude/hooks/pre-compaction-save.js:1-40` |
| `settings-guardian.js` | WIRED, hard-blocking PreToolUse Write/Edit | Relevant for §4.14 "Never set SKIP_REASON autonomously" — `[MIXED]` — already covers `settings.json` writes but NOT git push args | 3 | `.claude/hooks/settings-guardian.js:1-30`; CLAUDE.md:86 |
| `run-node.sh` | WIRED, launcher | n/a | 5 | `.claude/hooks/run-node.sh` (exists; 5278 bytes) |
| **user-prompt-handler.js / frustrationDetection** | **MISSING — NEEDS_GATE per CLAUDE.md §4.5** | /migration D8 ("nothing silent, ever") + R3 ("gate memory aids, never replaces, confirmation") cannot detect user frustration/confirmation-drift without this | **1 (high — core D8 enforcement)** | CLAUDE.md:66 `NEEDS_GATE: user-prompt-handler frustrationDetection`; `.planning/todos.jsonl` T18 item 2.1 (unbuilt, "D19 closed with SKIP") |
| **loop-detector.js** (PostToolUseFailure) | **MISSING — NEEDS_GATE per CLAUDE.md §4.9** | /migration Phase 5 retry/rollback (research Q8) can't detect a stuck loop; /pre-commit-fixer "after 2 attempts, ask" rule is honor-only | **1** | CLAUDE.md:72 `NEEDS_GATE: loop-detector.js`; T18 item 2.3 (unbuilt) |
| **track-agent-invocation.js + result-size check** | **MISSING — NEEDS_GATE per CLAUDE.md §4.15** | /migration dispatches research agents (per Q1) — **Windows 0-byte bug already bit Piece 1b** (see todos T23/T24 completed fix). No gate = recurrence risk for /migration's own agent dispatch | **1** | CLAUDE.md:88 `NEEDS_GATE: track-agent-invocation.js result-size check`; `.planning/todos.jsonl` T23-T24; T18 item 2.5 (unbuilt) |
| **post-read-handler.js** (D13 hook summary) | **MISSING — honor-only** | /migration gates require forced acknowledgment; §4.6/§4.13 `[BEHAVIORAL: honor-only]` with NO gate named | **2 (high, but no concrete design yet)** | CLAUDE.md:68, 85; T18 item 2.2 (unbuilt) |
| **governance-logger.js** | MISSING | Capture rule: CLAUDE.md + settings.json writes. Feeds sync-mechanism per T18.2.4 | 3 | T18 item 2.4 unbuilt |
| **pre-commit-agent-compliance.js** | MISSING | Enforces §4.15 agent-result-non-empty on commit path | 2 | T18 item 2.5 unbuilt |
| `commit-tracker.js` hook summary surfacing to user | WIRED but fail-open + advisory | §4.13 rule is honor-only — commit-tracker writes to `hook-warnings-log.jsonl` but **nothing forces review** | 2 | `.claude/hooks/commit-tracker.js` (file exists 21KB but no downstream acknowledgment-gate); CLAUDE.md:85 |

**Piece 3 labeling hooks (separate tree — dormant):** `.claude/sync/label/hooks/post-tool-use-label.js`, `notification-label.js`, `user-prompt-submit-label.js` — all three exist in code but per `.planning/piece-3-labeling-mechanism/PLAN.md:15-27` (Steps S3/S4/S5 done **but** "Settings.json wiring DEFERRED to post-S11 user-approval gate"). Dormant hook count: 3.

---

## Planning gaps

### BOOTSTRAP_DEFERRED.md items blocking /migration

Source: `.planning/jason-os/BOOTSTRAP_DEFERRED.md`

| Deferred item | BOOTSTRAP_DEFERRED ref | Blocks /migration because | Shift-risk |
|---|---|---|---|
| `session-end` skill | lines 12-29 | /migration Phase 6 prove-and-close needs it; coupled to TDMS + debt system | 2 |
| `pr-review` skill (full) | lines 34-55 | /migration Research Q2 names `/pr-review` as a cross-skill integration; JASON-OS only has the v0 stub | 3 (skill exists in v0 — `skills/pr-review/`) |
| `pr-retro` skill | lines 58-69 | Not directly required by /migration v1 | 5 |
| Custom statusline (Go) | lines 104-115 | Not a blocker | 5 |
| Agents directory expansion | lines 119-126 | "Revisit when JASON-OS has a chosen stack and specific agent needs surface" — **/migration's Research Q1 on agent roster is exactly the trigger** | **1** |
| GSD/TDMS/audit ecosystem | lines 131-141 | Not ported; /migration does NOT depend | 5 |

### todos.jsonl signals (migration-critical only)

Source: `.planning/todos.jsonl` (JSONL line numbers, 1-indexed by file row):

| ID | Title | /migration relevance | Shift-risk |
|---|---|---|---|
| T28 | `/migration` skill — unified brainstorm in flight | **THIS research's tracking todo.** References future `scripts/lib/sanitize-error.cjs`, `.claude/sync/label/`, `.claude/sync/schema/` as deps | N/A (self) — todos.jsonl:28 |
| T18 | Layer 2 — Ambient Intelligence (5 hook wirings) | **Single largest hook-layer blocker** — contains the 5 NEEDS_GATE hooks /migration D8 needs | **1** — todos.jsonl:18 |
| T19 | Layer 3 — Navigation Documents | SKILL_INDEX.md + HOOKS.md + COMMAND_REFERENCE.md needed for /migration discoverability; schema-reroll risk (3.3 must wait for sync-mechanism) | 2 — todos.jsonl:19 |
| T2 | SoNash file registry — full migration-opportunity map | /migration proactive-scan mode (D2) needs this data to exist | 2 — todos.jsonl:2 |
| T13 | Pattern cognition & propagation subsystem port (D37) | /migration reshape verdict (D23) leans on patterns | 3 — todos.jsonl:15 |
| T22 | /deep-research per-category line-count allocation | Affects /migration's own research sub-agents (Research Q1) | 3 — todos.jsonl:18 |
| T26 | Schema v1.1 mirror for Piece 5.5 | /migration's CAS-port + sync-bridge story (D19) | 2 — todos.jsonl:20 |
| T27 | Schema v1.1 → v1.2 for Piece 3 machinery fields | Same chain | 2 — todos.jsonl:21 |
| T31 | node-notifier supply-chain | Piece 3 dep; transitively /migration | 4 — todos.jsonl:24 |

### `.planning/jason-os/` vs `.planning/jason-os-mvp/` split

- `.planning/jason-os/` (ls output above) — 5 docs: DECISIONS.md, DEPENDENCIES.md, PLAN.md, RESEARCH_ROADMAP.md, SYNTHESIS.md, BOOTSTRAP_DEFERRED.md. Bootstrap-era.
- `.planning/jason-os-mvp/` — 6 docs including 43KB PLAN.md + 53KB PORT_ANALYSIS.md. This is the **live** MVP plan where Layer-2/3/4 gating lives.

### DEBT_LOG.md

Source: `.planning/DEBT_LOG.md:1-8` — **only one debt entry** (D1 schema refactor). The `/add-debt` skill is a v0 stub per skills dir. /migration Phase 6 may want to file debt on reshape deferrals; stub may be adequate.

---

## Sync-mechanism piece status

Source: `.planning/jason-os/BOOTSTRAP_DEFERRED.md:161-176` (the progress table) + `.planning/piece-3-labeling-mechanism/PLAN.md:12-29`.

| Piece | Status | Artifacts (evidence) | /migration impact |
|---|---|---|---|
| **1a — Discovery (JASON-OS)** | ✅ DONE | `.research/sync-mechanism/piece-1a-discovery-scan-jason-os/RESEARCH_OUTPUT.md` (53KB), `claims.jsonl` (32KB), findings/, LEARNINGS.md (8KB) | Input available |
| **1b — Discovery (SoNash)** | ✅ DONE | `.research/sync-mechanism/piece-1b-discovery-scan-sonash/RESEARCH_OUTPUT.md` (37KB), SCHEMA_SPEC.md, claims.jsonl, findings/ | Input available |
| **2 — Schema** | ✅ DONE | `.claude/sync/schema/` — SCHEMA.md (26KB), schema-v1.json (22KB), enums.json, EVOLUTION.md, EXAMPLES.md (64KB), `.validate-test.cjs`. Plan in `.planning/piece-2-schema-design/` | Canonical schema ready; v1.1 live, v1.2 pending T27 |
| **3 — Labeling mechanism** | 🟡 **PARTIAL** — S0-S7 done, S8-S14 pending | `piece-3-labeling-mechanism/PLAN.md:12-27`. Code exists for lib/, hooks/, skill/, backfill/ (`.claude/sync/label/` tree). S8 backfill orchestrator **executed experimentally** per S10_LEARNINGS.md but marked "IN PROGRESS" | **/migration's /label-audit integration (D15) partially available** |
| **3.5 — Mass back-fill** | 🟡 In-flight — S10 started Apr 21 Session 12 | `S10_LEARNINGS.md:1-10` ("IN PROGRESS"); `.claude/state/s10-prompts/` + `s10-results/` populated (B01-B03 batches visible) | Catalog partially populated — /migration can't rely on complete labels yet |
| **4 — Registry (manifest+event logs)** | ❌ NOT STARTED | BOOTSTRAP_DEFERRED.md:169 "After 3.5" | **Blocker for /migration** — no manifest means no way to query "what's shared" |
| **5 — Sync engine (`/sync`)** | ❌ NOT STARTED | BOOTSTRAP_DEFERRED.md:170 "After 4"; migration BRAINSTORM §6 names this as "Unbuilt in JASON-OS" | **Hard blocker — /migration D9 is `/sync` consumer** |

**Piece 3 exception:** `.claude/sync/label/backfill/verify.js` (16KB) was touched 2026-04-21 06:40 (most recent mutation in the tree) — S10 run live mid-session.

---

## Infrastructure gaps

### Sanitize / transform helpers

Searched `scripts/lib/` (exhaustive): `parse-jsonl-line.js`, `read-jsonl.js`, `resolve-exec.js`, `safe-fs.js` (24KB), `sanitize-error.cjs` (4KB), `sanitize-error.d.ts`, `security-helpers.js` (17KB), `todos-mutations.js` (12KB).

| Capability /migration needs | Exists? | Closest thing | Gap severity |
|---|---|---|---|
| **Content sanitizer** (strip sonash/Firebase/TDMS refs from files crossing into JASON-OS) | ❌ NO | `sanitize-error.cjs` is an **error-log scrubber** (SENSITIVE_PATTERNS: paths, tokens, bearer, DB URLs) per `sanitize-error.cjs:22-39` — not a content transformer. `.claude/hooks/lib/sanitize-input.js` same shape (hook-input scrubber). `.claude/sync/label/lib/sanitize.js` is a thin wrapper around the error lib. | **1 (high — /migration sanitize verdict has no helper)** |
| **Reshape primitive** (AST / structural transform) | ❌ NO | None. No babel/jscodeshift/TS-API tooling. | **1** |
| **Rewrite primitive** (idiom-aware rewrites) | ❌ NO | Same — no toolchain | **1** |
| **Gate-memory state store** (D22 R3 — prior answers aid recall) | ❌ NO — no per-skill persistent store | `.claude/state/` has per-task `task-*.state.json` (e.g., `task-pr-review-8-r1.state.json`) — ad-hoc convention per skill. `/checkpoint` writes there too (`brainstorm.port-skill.state.json` 5KB, `deep-plan.jason-os-mvp.state.json` 38KB). No schema. | **2 (convention exists; no primitive)** |
| **State rotation/pruning** | ✅ YES | `.claude/hooks/lib/rotate-state.js` (16KB) — rotateJsonl, pruneJsonKey, expireByAge, archiveRotateJsonl | 5 |
| **Atomic JSON write** | ✅ YES | `.claude/hooks/lib/state-utils.js:119-164` — `saveJson` with tmp+backup strategy + symlink guard | 5 |
| **Safe FS wrapper** | ✅ YES | `scripts/lib/safe-fs.js` (24KB) — CLAUDE.md §2 mandated | 5 |
| **Path-traversal check** | ✅ YES | `security-helpers.js` (17KB) — CLAUDE.md §5 anti-pattern row 2 enforced | 5 |
| **Git exec wrapper** | ✅ YES | `.claude/hooks/lib/git-utils.js` — `gitExec`, `projectDir` | 5 |
| **Cross-repo file copy / worktree handling** (/migration Q12) | ❌ NO | No helper. Each skill would roll its own. | **2** |
| **Label catalog I/O** | ✅ YES | `.claude/sync/label/lib/catalog-io.js`, `derive.js`, `validate-catalog.js` | 3 (per-piece-3 state) |

### Agents

Exactly 8 agents in `.claude/agents/`, all `/deep-research` pipeline:
- `contrarian-challenger.md` (4KB)
- `deep-research-final-synthesizer.md` (7KB)
- `deep-research-gap-pursuer.md` (6KB)
- `deep-research-searcher.md` (15KB)
- `deep-research-synthesizer.md` (13KB)
- `deep-research-verifier.md` (5KB)
- `dispute-resolver.md` (6KB)
- `otb-challenger.md` (3KB)

**Obviously missing for /migration (per BRAINSTORM §5 Q1 + Q5 + Q8):**
- No **reshape agent** — idiom-aware structural rewriting is a new agent shape
- No **sanitize-verdict agent** — PORT_ANALYSIS.md does this by hand in SoNash work (`.planning/jason-os-mvp/PORT_ANALYSIS.md` 53KB)
- No **migration-scan agent** — proactive-scan mode (D2) has no ready agent
- No **ripple-impact agent** — Phase 2 discovery
- No execution/apply agent distinct from synthesizer

All 8 agents use `tools: Read, Write, Bash, Grep, Glob, WebSearch, WebFetch` + `disallowedTools: Agent` (`.claude/agents/contrarian-challenger.md:9-10`; `.claude/agents/otb-challenger.md:9-10`) — none have Edit. /migration's active-transformation work (D24) needs an agent shape with Edit.

### Skills present (14)

`add-debt, brainstorm, checkpoint, convergence-loop, deep-plan, deep-research, label-audit, pre-commit-fixer, pr-review, session-begin, session-end, skill-audit, skill-creator, todo`

Per BOOTSTRAP_DEFERRED.md:12-29 + 34-55, both `session-end` and `pr-review` are **stub/v0** — `/migration` D27 seeds name `pr-review` as integration point and `session-end` as Phase-6 candidate.

---

## Top 5 critical blockers ranked by shift risk

1. **T18.2.1 user-prompt-handler / frustrationDetection hook is missing** (shift-risk 1). Maps to CLAUDE.md:66 `NEEDS_GATE`. /migration D8 "nothing silent, ever" + R3 "gate memory aids, never replaces, confirmation" have **zero enforcement primitive**. Without this, /migration's hard rule is aspirational. **Unlocks:** every "force user acknowledgment" beat in Phases 2–5.

2. **Piece 5 `/sync` engine is unbuilt and 2 pieces (3.5 + 4) away** (shift-risk 1). BRAINSTORM §6 names this as the #1 execution dependency. /migration D9 is "Consumer + side-by-side" to `/sync` — the consumer cannot exist before the producer. **The schema and labeling pieces have shifted shape once already** (v1.0 → v1.1 mid-Piece-3 per `.planning/piece-3-labeling-mechanism/PLAN.md:18`); Pieces 4-5 will shift more.

3. **No content-sanitize / reshape / rewrite primitive exists in the repo** (shift-risk 1). Searched `scripts/lib/` exhaustively. `sanitize-error.cjs` is error-log scrubber, not content transformer. `/migration` verdicts `sanitize`/`reshape`/`rewrite` (D23) have no backing code. PORT_ANALYSIS.md (53KB) does this by hand today. **Unlocks:** Phase 5 entire active-transformation layer.

4. **T18.2.3 loop-detector + T18.2.5 track-agent-invocation are missing** (shift-risk 1). Windows 0-byte agent-result bug (CLAUDE.md:88) already bit Piece 1b discovery work — fixed by T23/T24 but **no structural gate**. /migration's Research Q1 dispatches multiple agents per phase; recurrence = silent-empty-result a user cannot catch. Pre-commit-fixer's "after 2 attempts, ask" (CLAUDE.md:72) is similarly honor-only.

5. **No gate-memory store primitive + 8 agents are all `/deep-research`-shaped (no migration-shaped agent)** (shift-risk 2). /migration Phase-5 state + D22 gate-memory need a per-invocation store with a schema; today `.claude/state/` holds ad-hoc `task-*.state.json` files per skill with no common shape. And none of the 8 agents can Edit files — /migration's execute phase needs an agent that can. **Combined gap:** storage + dispatch shape.

---

## Sources

File paths, all absolute:

- `C:\Users\jbell\.local\bin\JASON-OS\CLAUDE.md` (lines 62-91: §4 Behavioral Guardrails with `[BEHAVIORAL: honor-only]` / `NEEDS_GATE` annotations)
- `C:\Users\jbell\.local\bin\JASON-OS\.claude\hooks\` (8 files; sizes+mtimes in first directory listing)
- `C:\Users\jbell\.local\bin\JASON-OS\.claude\hooks\lib\` (5 files: git-utils, rotate-state, sanitize-input, state-utils, symlink-guard)
- `C:\Users\jbell\.local\bin\JASON-OS\.claude\settings.json` (hook wiring — SessionStart×2, PreToolUse×3, PreCompact×1, PostToolUse×1)
- `C:\Users\jbell\.local\bin\JASON-OS\.claude\agents\` (8 agents — all `/deep-research` pipeline)
- `C:\Users\jbell\.local\bin\JASON-OS\.claude\skills\` (14 skills — directory listing)
- `C:\Users\jbell\.local\bin\JASON-OS\.claude\sync\` (schema/, label/ subtrees)
- `C:\Users\jbell\.local\bin\JASON-OS\.claude\sync\label\lib\sanitize.js` (lines 1-58 — confirms thin wrapper around error-log sanitizer, not a content transformer)
- `C:\Users\jbell\.local\bin\JASON-OS\.claude\state\` (14 state files; per-skill ad-hoc convention)
- `C:\Users\jbell\.local\bin\JASON-OS\scripts\lib\` (8 files; `sanitize-error.cjs:22-39` sensitive-patterns list — error-log scope not content scope)
- `C:\Users\jbell\.local\bin\JASON-OS\.planning\jason-os\BOOTSTRAP_DEFERRED.md` (lines 12-145 deferred items; lines 161-176 sync-mechanism progress pointer)
- `C:\Users\jbell\.local\bin\JASON-OS\.planning\DEBT_LOG.md` (single entry D1)
- `C:\Users\jbell\.local\bin\JASON-OS\.planning\TODOS.md` (23 active, 8 completed)
- `C:\Users\jbell\.local\bin\JASON-OS\.planning\todos.jsonl` (lines 2, 14-21, 28 — T2/T18/T19/T22/T26/T27/T28/T31)
- `C:\Users\jbell\.local\bin\JASON-OS\.planning\piece-3-labeling-mechanism\PLAN.md` (lines 12-27 progress log — S0-S7 done, S8-S14 pending)
- `C:\Users\jbell\.local\bin\JASON-OS\.planning\piece-3-labeling-mechanism\S10_LEARNINGS.md` (lines 1-60 — S10 backfill IN PROGRESS)
- `C:\Users\jbell\.local\bin\JASON-OS\.research\sync-mechanism\BRAINSTORM.md` (lines 1-245 — 5-piece architecture)
- `C:\Users\jbell\.local\bin\JASON-OS\.research\sync-mechanism\piece-1a-discovery-scan-jason-os\findings\D3-hooks-wiring.md` (lines 1-80 — prior hook census)
- `C:\Users\jbell\.local\bin\JASON-OS\.research\migration-skill\BRAINSTORM.md` (§5 Q1/Q2/Q3, §6 dependencies table)

**Findings file:** `C:\Users\jbell\.local\bin\JASON-OS\.research\migration-skill\findings\D3-jason-os-hooks-agents-infra.md`
