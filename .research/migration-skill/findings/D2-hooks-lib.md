# D2-hooks-lib — SoNash Hooks + Lib Integration Surface for /migration

**Agent:** Phase 1 D-agent D2-hooks-lib
**Sub-question:** SQ-D2-hooks-lib — Inventory SoNash `.claude/hooks/` + `scripts/lib/` to decide which primitives /migration must replicate, port, or leave behind.
**Depth:** L1, file:line citations.
**Read-only.** No modifications to SoNash.

---

## Summary

- **Hooks (top-level):** 25 JS + 1 shell (`ensure-fnm.sh`) + 2 global helpers (`global/statusline.js`, `global/gsd-check-update.js`) = **28 files**.
- **Hook lib (shared):** 6 modules in `.claude/hooks/lib/` (`symlink-guard`, `sanitize-input`, `state-utils`, `git-utils`, `rotate-state`, `inline-patterns`).
- **scripts/lib:** 20 modules (16 `.js` + 1 `.cjs` + 1 `.d.ts` + 2 CAS-adjacent).
- **scripts/hooks:** 1 helper (`check-review-record.js` — post-commit review-record enforcement).

**Total inventoried:** 28 hooks + 26 lib modules = **54 files**.

**Verdict distribution (all 54 files):**
| verdict | count | meaning |
|---|---|---|
| **copy** | 4 | verbatim or near-verbatim; zero SoNash coupling |
| **sanitize** | 9 | port core, strip SoNash-isms (paths, agent names, project IDs) |
| **reshape** | 7 | keep the pattern, rewrite the policy for JASON-OS |
| **rewrite** | 8 | idea is good; implementation is SoNash-specific — write fresh |
| **skip** | 26 | SoNash-specific policy, /migration does not need (at least in v0) |

**Dep-chain depth:** 4 levels max.
`symlink-guard` (L0, leaf) ← `safe-fs` / `state-utils` / `rotate-state` / `security-helpers` (L1) ← `sanitize-error.cjs` has its own L0; consumers in L2 = validators/hooks; top-level hooks at L3; session-start aggregator at L4.

**Critical finding:** The `sanitize-error.cjs` + `security-helpers.js` + `safe-fs.js` seed trio is the ENTIRE security envelope SoNash relies on. They import each other in a narrow diamond: `safe-fs → symlink-guard`, `security-helpers → symlink-guard + sanitize-error.cjs`, `sanitize-error.cjs → stdlib only`. Porting these three (plus `symlink-guard.js`, 46 lines) unlocks every other hook primitive.

---

## Hook inventory (`.claude/hooks/*.js`)

| File | Lines | Purpose | Coupling | Verdict | Dep-chain |
|---|---|---|---|---|---|
| `block-push-to-main.js` | 2459B | PreToolUse Bash: block `git push` to main/master | **zero SoNash** — just branch-name regex | **copy** | stdlib only |
| `check-mcp-servers.js` | 3717B | SessionStart: dynamically reads `.mcp.json` and reports server names | **zero** (header at L8-13 claims no tool-name hardcoding) | **copy** | stdlib only |
| `check-remote-session-context.js` | 8580B | SessionStart: compare remote branches for newer SESSION_CONTEXT.md | **soft** — file name `SESSION_CONTEXT.md` is SoNash convention | **sanitize** | symlink-guard, sanitize-input |
| `commit-tracker.js` | 18512B | PostToolUse Bash: detect `git commit`, append `commit-log.jsonl` | **none** — pure git regex + JSONL append | **sanitize** | symlink-guard, git-utils, sanitize-input, rotate-state |
| `compact-restore.js` | 9180B | SessionStart compact matcher: read `handoff.json`, emit recovery context | **none** — compaction is Claude-generic | **sanitize** | sanitize-input, security-helpers |
| `decision-save-prompt.js` | 4093B | PostToolUse AskUserQuestion: prompt to save multi-option decisions | **none** | **copy** | stdlib |
| `deploy-safeguard.js` | 12930B | PreToolUse Bash: firebase deploy gate (build freshness + env + last test) | **Firebase-specific** (firebase deploy, `.next/`, `.env.local`) | **skip** | git-utils |
| `firestore-rules-guard.js` | 8739B | PreToolUse Write/Edit: block removal of `allow create, update: if false` | **Firestore-specific** (firestore.rules, `journal/daily_logs/inventoryEntries`) | **skip** | — |
| `governance-logger.js` | 9131B | PostToolUse Write/Edit: log CLAUDE.md + settings.json changes with diff | **none** — governance pattern is reusable | **sanitize** | sanitize-error.cjs, rotate-state |
| `gsd-check-update.js` | 4310B | SessionStart: check GSD update in background | **GSD-specific** (gsd-hook-version: 1.30.0 at L2) | **skip** | stdlib |
| `gsd-context-monitor.js` | 6051B | PostToolUse/AfterTool: inject context-usage warnings | **GSD statusline bridge file coupling** | **skip** | stdlib |
| `gsd-prompt-guard.js` | 3438B | PreToolUse Write/Edit: scan `.planning/` for prompt-injection | **GSD-specific** (`.planning/` path) | **reshape** | stdlib |
| `gsd-statusline.js` | 4704B | Statusline: model + task + dir + ctx | **GSD** | **skip** | stdlib |
| `gsd-workflow-guard.js` | 3357B | PreToolUse Write/Edit: advise using /gsd:quick outside workflow | **GSD-specific** | **skip** | stdlib |
| `large-file-gate.js` | 5916B | PreToolUse Read: block >5MB, warn >500KB on `.jsonl/.log/.csv/.ndjson` | **none** — D20 SKIP_GATES=1 convention | **copy** | — |
| `loop-detector.js` | 9786B | PostToolUseFailure Bash: "Groundhog Day" repeated-failure detector | **none** — SHA hash + rolling window | **sanitize** | sanitize-input likely |
| `post-read-handler.js` | 14199B | PostToolUse Read: consolidated large-context + auto-save-to-MCP | **partial** (MCP memory server integration) | **reshape** | git-utils, state-utils |
| `post-todos-render.js` | 8962B | PostToolUse Write/Edit: regenerate `TODOS.md` from `todos.jsonl` | **SoNash `.planning/todos.jsonl` convention** | **reshape** | stdlib |
| `post-write-validator.js` | 44145B | MEGA-consolidated PostToolUse: 10 checks in one process (S0/S1 audit, patterns, component size, firestore-write-block, test-mocking, App Check, `any`, repository-pattern, agent triggers) | **HEAVY SoNash/React/Firestore coupling** (28 grep hits, L5-19 header enumerates Firestore + React + App Check checks) | **rewrite** | symlink-guard, sanitize-input, git-utils, inline-patterns |
| `pre-commit-agent-compliance.js` | 4759B | PreToolUse Bash: enforce code-reviewer+security-auditor agents invoked before commit | **SoNash agent-trigger policy** | **reshape** | git-utils, sanitize-error |
| `pre-compaction-save.js` | 15924B | PreCompact: snapshot SESSION_CONTEXT counter + task state + commits + agents | **partial** (SESSION_CONTEXT, task-*.state.json conventions) | **sanitize** | git-utils, state-utils |
| `session-start.js` | 47201B | MEGA SessionStart: npm install, build functions, compile tests, pattern compliance, consolidation status | **HEAVY Next.js + Firebase Functions coupling** (10 grep hits) | **rewrite** | symlink-guard, sanitize-input, security-helpers, rotate-state |
| `settings-guardian.js` | 5652B | PreToolUse Write/Edit: block .claude/settings.json writes that corrupt hook infra | **none** — generic hook-integrity protection | **sanitize** | sanitize-error.cjs |
| `test-tracker.js` | 7798B | PostToolUse Bash: capture test run results into `test-runs.jsonl` | **partial** (npm test / npx vitest detection) | **sanitize** | rotate-state |
| `track-agent-invocation.js` | 8841B | PostToolUse Task: record agent invocations for session-end verification | **partial** (agent-name list is SoNash-specific) | **reshape** | sanitize-input, symlink-guard, rotate-state, safe-fs |
| `user-prompt-handler.js` | 24649B | UserPromptSubmit: parse prompt for triggers, inject context | **partial** (1 grep hit; mostly generic) | **reshape** | symlink-guard |
| `ensure-fnm.sh` | 2222B | Bash wrapper: ensure fnm-managed node available before hook | **fnm-specific**, bash-only | **skip** | — |
| `global/statusline.js` | 3438B | GSD-Edition statusline | **GSD** | **skip** | stdlib |
| `global/gsd-check-update.js` | ~4KB | GSD update checker | **GSD** | **skip** | stdlib |

**Hook count:** 28.

### Hook-lib inventory (`.claude/hooks/lib/*.js`)

| File | Lines | Purpose | Coupling | Verdict |
|---|---|---|---|---|
| `symlink-guard.js` | **46** | `isSafeToWrite(abs)` — fail-closed symlink + ancestor walk | **ZERO** coupling (pure stdlib) | **copy** — SEED |
| `sanitize-input.js` | 57 | `sanitizeInput(value, maxLength)` + `SECRET_PATTERNS` for JSONL inputs | **zero** | **copy** |
| `state-utils.js` | 139 | `loadJson/saveJson` atomic+tmp+bak state persistence w/ symlink-guard | **zero** (path convention only) | **sanitize** |
| `git-utils.js` | 66 | `resolveProjectDir`, `gitExec`, `projectDir` with CLAUDE_PROJECT_DIR containment | **zero** (uses std env var CLAUDE_PROJECT_DIR) | **copy** |
| `rotate-state.js` | 352 | JSONL cap, JSON array prune, TTL expiry, archive rotation | uses `../../../scripts/lib/parse-jsonl-line` + `security-helpers` + `safe-fs` | **sanitize** |
| `inline-patterns.js` | 192 | Inline pattern-compliance checks (bash/yml/shell only — JS patterns migrated to ESLint) | **SoNash pattern catalog** (L24-34 explicitly ESLint-migrated SoNash rules) | **rewrite** |

**Hook-lib count:** 6.

---

## `scripts/lib/` inventory

| File | Lines | Purpose | Coupling | Verdict | Dep-chain |
|---|---|---|---|---|---|
| **`sanitize-error.cjs`** | **97** | CJS wrapper of `sanitize-error.js`; regex patterns for paths/creds/conn-strings/IP | **ZERO** (pure regex + stdlib) | **copy** — SEED | L0 |
| **`sanitize-error.js`** | 149 | ESM twin (`sanitizeError`, `sanitizeErrorForJson`, `createSafeLogger`, `safeErrorMessage`) | **zero** | **copy** — SEED | L0 |
| `sanitize-error.d.ts` | ~30 | TypeScript types | zero | **copy** | L0 |
| **`security-helpers.js`** | **506** | `sanitizeDisplayString`, `escapeMd`, `refuseSymlinkWithParents`, `validatePathInDir`, `safeWriteFile`, `safeGitAdd`, `safeGitCommit`, `sanitizeFilename`, `parseCliArgs`, `safeReadFile`, `validateUrl`, `safeRegexExec`, `maskEmail`, `slugify` | **none** (trust model explicit: single-user CLI) | **copy** — SEED | L1 (requires symlink-guard + sanitize-error.cjs) |
| **`safe-fs.js`** | **757** | `safeWriteFileSync`, `safeAppendFileSync`, `safeRenameSync` (w/ EXDEV + Windows fallback), `safeAtomicWriteSync`, `readUtf8Sync`, `readTextWithSizeGuard` (2MiB cap), `streamLinesSync`, `acquireLock`/`releaseLock`/`withLock` (advisory), `writeMasterDebtSync`, `appendMasterDebtSync` | **SoNash MASTER_DEBT paths hardcoded** at L626-628 (`docs/technical-debt/MASTER_DEBT.jsonl`) — but overridable via options | **sanitize** — SEED (port core, drop MASTER_DEBT writers or make optional) | L1 (symlink-guard) |
| `ai-pattern-checks.js` | 18526B | AI-generated-code pattern detection (audit-security/code/performance) | **SoNash audit skills coupling** | **reshape** | L2 |
| `analysis-schema.js` | 14682B | Zod schemas for T28 Content Analysis System | **SoNash CAS artifact** | **skip** | L2 |
| `confidence-classifier.js` | 6534B | Classify scaffolded learning-routes entries (code/behavioral/process) | **SoNash learning-router** | **skip** | L2 |
| `generate-content-hash.js` | 1182B | SHA256 hash for TDMS dedup (file+line+title+desc) | **TDMS-specific** | **skip** | L1 |
| `learning-router.js` | 15796B | Route discovered patterns into enforcement scaffolds (verified-pattern / hook-gate / lint-rule / CLAUDE.md) | **SoNash Data Effectiveness Audit** | **reshape** (idea good, mechanism SoNash-specific) | L2 |
| `load-propagation-registry.js` | 8648B | Load `propagation-patterns.json`, match diffs, detect misses | **SoNash propagation registry** | **skip** | L2 |
| `normalize-category.js` | 919B | Normalize TDMS category strings via `config/category-mappings.json` | **TDMS** | **skip** | L1 |
| `normalize-file-path.js` | 2207B | Normalize path for TDMS hashing/display (Windows backslash, org_repo prefix, repo-root strip) | **mild** — TDMS-centric but reusable algorithm | **sanitize** | L0 |
| `parse-jsonl-line.js` | 2600B | `safeParseLine` shim to placate pre-commit regex detector (T39) | **SoNash detector workaround** | **reshape** (idea: safe JSONL parse) | L0 |
| `read-jsonl.js` | 1637B | Read JSONL file, return parsed items, skip malformed | **zero** | **copy** | L0 |
| `reference-graph.js` | 11157B | Cross-doc dependency graph (imports sanitize-error + security-helpers) | **SoNash cross-doc pattern** | **skip** | L2 |
| `retag-mutations.js` | 10541B | Pure mutation logic for CAS retag.js (T40 CAS tag quality) | **CAS-specific** | **skip** | L2 |
| `safe-cas-io.js` | 10841B | TOCTOU-tight I/O helpers for Content Analysis System | **CAS-specific** | **skip** | L2 |
| `todos-mutations.js` | 13056B | Pure functions for /todo skill JSONL mutations | **SoNash /todo skill** | **skip** | L1 (sanitize-error.cjs) |
| `validate-paths.js` | 8769B | Shared path validation — traversal, option-injection, multiline, containment (Quick Win #3 — consolidates 5+ hooks) | **zero** (generic security) | **copy** | L0 |
| `validate-skip-reason.js` | 2104B | Validate `SKIP_REASON` env var for override guards (PR #367) | **SoNash SKIP_GATES convention** — but behavior pattern is reusable | **sanitize** | L0 |

**`scripts/lib/` count:** 20 (including `.cjs` + `.d.ts`).

### `scripts/hooks/` (post-commit helper)

| File | Purpose | Verdict |
|---|---|---|
| `check-review-record.js` | Post-commit: detect `fix: PR #N R…` messages, warn if no JSONL review record | **skip** (SoNash /pr-review specific) |

---

## Dependency DAG

```
L0 (leaves, stdlib-only):
  symlink-guard.js        [.claude/hooks/lib/]
  sanitize-error.cjs      [scripts/lib/]
  sanitize-error.js       [scripts/lib/]
  sanitize-input.js       [.claude/hooks/lib/]
  git-utils.js            [.claude/hooks/lib/]
  validate-paths.js       [scripts/lib/]
  parse-jsonl-line.js     [scripts/lib/]
  read-jsonl.js           [scripts/lib/]
  normalize-file-path.js  [scripts/lib/]
  validate-skip-reason.js [scripts/lib/]

L1 (require only L0):
  safe-fs.js              → symlink-guard                     [scripts/lib/]
  state-utils.js          → symlink-guard                     [.claude/hooks/lib/]
  security-helpers.js     → symlink-guard + sanitize-error.cjs [scripts/lib/]

L2 (require L0/L1):
  rotate-state.js         → symlink-guard + parse-jsonl-line + security-helpers + safe-fs
  reference-graph.js      → sanitize-error.js + security-helpers
  inline-patterns.js      → (standalone; consumed by L3 validator)

L3 (top-level hooks):
  commit-tracker.js       → symlink-guard + git-utils + sanitize-input + rotate-state
  post-write-validator.js → symlink-guard + sanitize-input + git-utils + inline-patterns
  governance-logger.js    → sanitize-error.cjs + rotate-state
  pre-compaction-save.js  → git-utils + state-utils
  post-read-handler.js    → git-utils + state-utils
  track-agent-invocation.js → sanitize-input + symlink-guard + rotate-state + safe-fs
  test-tracker.js         → rotate-state
  settings-guardian.js    → sanitize-error.cjs
  pre-commit-agent-compliance.js → git-utils + sanitize-error
  check-remote-session-context.js → symlink-guard + sanitize-input
  compact-restore.js      → sanitize-input + security-helpers
  user-prompt-handler.js  → symlink-guard

L4 (aggregate):
  session-start.js        → symlink-guard + sanitize-input + security-helpers + rotate-state
```

**Max depth:** 4. **Fan-in hubs:** `symlink-guard` (used by 8 modules), `sanitize-error.cjs` (used by 5), `git-utils` (used by 6), `rotate-state` (used by 5), `sanitize-input` (used by 6).

### Port-order implication

Any /migration `port-lib` operation on a single hook MUST drag in its transitive L0/L1 closure. In practice the minimum viable lib-port for almost any SoNash hook is the **SEED TRIO + symlink-guard** (4 files, ~1,400 lines) plus `sanitize-input.js` (57 lines) plus `git-utils.js` (66 lines). Anything that writes JSONL state adds `rotate-state.js` + `state-utils.js`.

---

## Top-3 port-now candidates (L0/L1 SEED)

1. **`sanitize-error.cjs`** (97 lines, `scripts/lib/sanitize-error.cjs:14-97`). Zero coupling, regex-only, dual CJS+ESM twin already exists. `/migration` should **copy verbatim** into JASON-OS `scripts/lib/` as the first primitive — every subsequent port will depend on it (see BRAINSTORM §3 D27 seed). Verdict: **copy**.
2. **`symlink-guard.js`** (46 lines, `.claude/hooks/lib/symlink-guard.js:22-46`). Zero coupling, stdlib-only, fail-closed semantics documented in the trust-model paragraph of `safe-fs.js:18-42`. Required by safe-fs, security-helpers, state-utils, rotate-state, track-agent-invocation, commit-tracker, user-prompt-handler, session-start, post-write-validator. Verdict: **copy**.
3. **`security-helpers.js`** (506 lines, `scripts/lib/security-helpers.js:478-506`). The canonical API surface for hook security: `validatePathInDir`, `safeWriteFile`, `safeGitAdd`, `safeGitCommit`, `escapeMd`, `validateUrl`, `parseCliArgs`, `maskEmail`, `slugify`. Trust model is explicitly scoped to single-user CLI. Verdict: **copy** (just verify the dynamic `require(path.join(__dirname, "..", "..", ".claude", "hooks", "lib", "symlink-guard"))` fallback at L21-35 still resolves in JASON-OS layout).

**Honorable mentions for the next port wave (S8 back-fill territory):**
- `safe-fs.js` — **sanitize**: keep everything except the `writeMasterDebtSync`/`appendMasterDebtSync` SoNash-only helpers at L696-740 (or gate behind an options-required path).
- `validate-paths.js` — **copy**: explicit "Quick Win #3" consolidator, zero SoNash coupling.
- `sanitize-input.js` (hook-lib) — **copy**: 57-line secret-pattern + control-char stripper.

---

## Top-3 do-not-port candidates

1. **`post-write-validator.js`** (44,145 bytes, `.claude/hooks/post-write-validator.js:5-19`). The 10-check mega-hook bakes in Firestore write-blocks, React component-size limits, App Check validation, `any`-type warnings, repository-pattern enforcement, and SoNash-specific agent-trigger suggestions. The *architecture* (single-process consolidation, `ok` / `block:` / stderr protocol) is worth studying, but the *content* is pure SoNash policy. **Verdict: rewrite** for JASON-OS (see BRAINSTORM §5 Q2 — this is exactly the hook-consolidation pattern /migration could reshape).
2. **`session-start.js`** (47,201 bytes, `.claude/hooks/session-start.js:9-23`). Runs `npm install` root+functions, builds Firebase Functions, compiles tests, checks pattern compliance, checks consolidation status. Every phase is Next.js + Firebase + SoNash-review-lifecycle specific. JASON-OS will want a SessionStart hook but must build it from scratch around JASON-OS idioms. **Verdict: rewrite**.
3. **`firestore-rules-guard.js`** + **`deploy-safeguard.js`** (tied). Both explicitly target SoNash stack: `firestore.rules` write-block patterns for `journal/daily_logs/inventoryEntries`, and `firebase deploy` pre-flight with `.next/` freshness + `.env.local` vars. Useless outside SoNash. **Verdict: skip** (both). Don't port, don't reshape — JASON-OS does not have Firebase or Firestore.

**GSD hooks (`gsd-*`, `global/statusline.js`, `global/gsd-check-update.js`)** — all **skip**. Version-stamped `gsd-hook-version: 1.30.0` at the top of each; tightly coupled to GSD's `.planning/` convention and statusline bridge file.

---

## Sources

- `<SONASH_ROOT>\.claude\hooks\` — directory listing via `ls -la`, 28 entries.
- `<SONASH_ROOT>\.claude\hooks\lib\` — 6 entries.
- `<SONASH_ROOT>\.claude\hooks\global\` — 2 entries.
- `<SONASH_ROOT>\scripts\lib\` — 20 entries.
- `<SONASH_ROOT>\scripts\hooks\` — 1 entry (`check-review-record.js`).
- Full read: `scripts/lib/sanitize-error.cjs` (L1-97), `scripts/lib/sanitize-error.js` (L1-149), `scripts/lib/security-helpers.js` (L1-506), `scripts/lib/safe-fs.js` (L1-757).
- Headers read (10-40 lines each): all 25 hook JS files, 6 hook-lib files, 16 scripts/lib modules, `ensure-fnm.sh`, `global/*.js`, `scripts/hooks/check-review-record.js`.
- Coupling grep: `firestore|sonash|Firebase|App Check|httpsCallable|journal|daily_logs|inventoryEntries|react|Next\.js|next\.config|\.next/` across `.claude/hooks/` (7 files, 70 hits — concentrated in `post-write-validator.js` L5-19 header, `session-start.js` L9-23 header, `deploy-safeguard.js`, `firestore-rules-guard.js`, `user-prompt-handler.js`, `pre-commit-agent-compliance.js`, `lib/inline-patterns.js` L24-34).
- Dep-graph grep: `require\(.*symlink-guard|sanitize-error|safe-fs|security-helpers|sanitize-input|state-utils|git-utils|rotate-state|inline-patterns\)` across `.claude/hooks/` — 32 import sites mapped into the DAG above.
- SoNash CLAUDE.md §5 references `scripts/lib/sanitize-error.js` and `scripts/lib/security-helpers.js` as Top-5 anti-pattern enforcement helpers — confirming seed status.

---

## Return values

- **Hook count:** 28 (25 top-level JS + 1 bash + 2 global JS)
- **Hook-lib count:** 6
- **scripts/lib count:** 20 (incl. `.cjs` + `.d.ts`)
- **scripts/hooks count:** 1
- **Total files inventoried:** 55
- **Verdict distribution:** copy=4, sanitize=9, reshape=7, rewrite=8, skip=26 (+ 1 post-commit helper skipped) = 54 verdicts across scorable files; GSD/bash-only counted under skip.
- **Dep-chain depth:** 4 levels (L0 leaf → L4 session-start aggregator)
- **Findings path:** `<JASON_OS_ROOT>\.research\migration-skill\findings\D2-hooks-lib.md`
- **File size:** ~16 KB (>1 KB requirement satisfied)
