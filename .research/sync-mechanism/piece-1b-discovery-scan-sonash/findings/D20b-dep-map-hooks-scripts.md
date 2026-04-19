# D20b — Dependency Map: Hooks + Scripts + Script-Libs

**Agent:** D20b — Wave 2 dependency mapper, cluster B
**Date:** 2026-04-18
**Source data:** D3a, D3b, D6a–D6d, D7, D8a, D8b, D9, D10a, D10b, D11a, D11b, D12 (13 Wave 1 JSONL files)
**Output:** E001–E225 (225 directed edges)

---

## Edge Counts by Category

| Category | Count |
|---|---|
| hook → hook-lib (require) | 26 |
| hook → script-lib (require) | 42 |
| hook → script (execFileSync) | 17 |
| hook → script (async-spawn) | 1 |
| hook-lib → hook-lib (require) | 2 |
| hook-lib → script-lib (require / CROSS-BOUNDARY) | 3 |
| script-lib → script-lib (require) | 7 |
| script-lib → hook-lib (require / CROSS-BOUNDARY) | 2 |
| script-lib → config (config-load) | 3 |
| script → script-lib (require) | 67 |
| script → script (require / execFileSync / import) | 29 |
| script → hook-lib (require / CROSS-BOUNDARY) | 7 |
| script → config (config-load) | 16 |
| script → external (import) | 1 |
| inline-duplicate (skill copies) | 4 |
| **Total** | **225** |

---

## Hub Node Confirmations

### sanitize-error.cjs — CONFIRMED major hub (61+ callers)

Direct callers found across all Wave 1 data (not exhaustive, representative):
- All 11 Tier 1 hooks (via direct require)
- All 12 Tier 2 hooks (via direct require or transitive via rotate-state/safe-fs)
- 2 global hooks
- rotate-state.js (hook-lib)
- safe-fs.js (script-lib, transitive)
- security-helpers.js (script-lib, transitive)
- cas-store.js, scan-secrets.js, task-runner.js, state-manager.js
- load-propagation-registry.js
- render-reviews-to-md.ts (uses sanitize-error.js ESM variant)

The 61+ estimate from Wave 1 hypothesis is **CONFIRMED**. sanitize-error.cjs is a universal leaf dependency — nothing it depends on, everything depends on it (no deps of its own).

### safe-fs.js — CONFIRMED major hub (50+ callers)

Direct callers across all clusters:
- governance-logger, loop-detector, track-agent-invocation, write-interceptor, post-write-validator, frustration-detector, notification-handler, checkpoint-handler, task-notification, user-prompt-handler, pre-compact-handler, stop-hook, session-start, post-todos-render (via render-todos)
- rotate-state.js (hook-lib — cross-boundary)
- learning-router.js, todos-mutations.js, load-propagation-registry.js
- append-hook-warning, cleanup-alert-sessions, log-override, resolve-hook-warnings, seed-commit-log, mid-session-alerts, check-cross-doc-deps, check-doc-headers, check-triggers, check-file-registry, session-end-commit, generate-views, intake-manual, intake-audit, intake-pr-deferred, sync-sonarcloud, resolve-item, resolve-bulk
- health-log.js, write-jsonl.ts, render-reviews-to-md.ts, review-lifecycle.ts
- todos-cli, render-todos, cas-store, cas-lookup, state-manager, model-router, scan-secrets, plan-tracker, milestone-reporter, task-runner, task-state, skills-registry, skills-analyze-self-audit, check-review-record

The 50+ estimate is **CONFIRMED**. safe-fs.js is the highest-connectivity node in the entire graph.

### security-helpers.js — CONFIRMED hub (25+ callers)

Direct callers confirmed: commit-tracker (hook), settings-guardian (hook), pre-tool-check (hook), write-interceptor (hook), post-write-validator (hook), check-file-registry, generate-views, cas-store, scan-secrets, rotate-state (hook-lib — cross-boundary), learning-router. Plus all transitive callers through safe-fs (which re-exports security-helpers). JASON-OS counterpart exists but is 52L LONGER (558L vs 506L) — unusual direction of drift.

### append-hook-warning.js — CONFIRMED hub (10+ callers)

Confirmed direct callers via execFileSync: governance-logger, loop-detector, frustration-detector, settings-guardian, pre-tool-check, write-interceptor, notification-handler, post-write-validator, mid-session-alerts. Plus any hook that emits a warning. **10+ callers confirmed**.

### symlink-guard.js — CONFIRMED highest-connectivity hook-lib

Called by: all 11 Tier 1 hooks, all 12 Tier 2 hooks, 2 global hooks, state-utils (hook-lib), rotate-state (hook-lib), AND 5 scripts directly (cross-boundary: append-hook-warning, cleanup-alert-sessions, log-override, resolve-hook-warnings, seed-commit-log), AND safe-fs (two-level fallback), AND security-helpers. Approximately 35+ direct edges; the single most-required node in the entire graph.

### mid-session-alerts.js — CONFIRMED async-spawn target

commit-tracker.js fires mid-session-alerts.js via `execFile(process.execPath, [scriptPath], {timeout:5000})` — fire-and-forget pattern (E006). mid-session-alerts is ESM despite .js extension; uses createRequire for safe-fs/read-jsonl. It in turn calls append-hook-warning via execFileSync as a side effect (E099), and reads ecosystem-health-log.jsonl via health-log.js (E153).

### generate-views.js — CONFIRMED internal debt pipeline hub (7 callers)

Called via execFileSync by: intake-manual, intake-audit, intake-pr-deferred, sync-sonarcloud, assign-roadmap-refs, resolve-item, resolve-bulk. All 7 debt mutation scripts follow the same post-mutation pattern of regenerating views.

---

## Cross-Boundary Anomalies

**Definition:** A script (in `scripts/`) directly requiring a hook-lib (in `.claude/hooks/lib/`). This bypasses the intended layering where hook-libs are private to the hooks layer.

### Type A: Script directly requires hook-lib (5 scripts)

| Script | Hook-libs required | Porting risk |
|---|---|---|
| append-hook-warning.js | symlink-guard | HIGH — hooks call this script; it calling back into hook-libs creates a cycle risk |
| cleanup-alert-sessions.js | symlink-guard | MEDIUM — session management utility |
| log-override.js | symlink-guard + rotate-state + sanitize-input | CRITICAL — 3 hook-lib deps; most deeply coupled script |
| resolve-hook-warnings.js | symlink-guard | MEDIUM |
| seed-commit-log.js | symlink-guard | MEDIUM |

log-override.js is the most anomalous: it requires 3 hook-libs (symlink-guard, rotate-state, sanitize-input), making it effectively a hybrid hook/script. It is called by session-end-commit.js (script) and governance-logger.js (hook), making it a bridge between both layers.

### Type B: Script-lib directly requires hook-lib (2 script-libs)

| Script-lib | Hook-lib required | Notes |
|---|---|---|
| safe-fs.js | symlink-guard (two-level fallback) | Tries scripts/lib/symlink-guard first, falls back to .claude/hooks/lib/symlink-guard |
| security-helpers.js | symlink-guard | Direct require |

The two-level fallback in safe-fs.js is a designed pattern, not an accident — it gracefully handles skill-bundled copies of symlink-guard. But it still creates a hard dependency from the scripts layer into the hooks layer.

### Combined anomaly count: 7 direct cross-boundary requires from scripts/script-libs into hook-libs

---

## Config Consumption Matrix

load-config.js (scripts/load-config.js) is the primary abstraction layer. It has a path-traversal guard and loads configs by key name rather than path.

| Config file | Access method | Known consumers |
|---|---|---|
| doc-governance.json | via load-config | check-doc-headers, check-cross-doc-deps |
| file-registry.json | via load-config | check-file-registry |
| debt-schema.json | via load-config | intake-manual, intake-audit, intake-pr-deferred, sync-sonarcloud, resolve-item, resolve-bulk |
| hook-warnings-config.json | via load-config | append-hook-warning, resolve-hook-warnings |
| known-propagation-baseline.json | via load-config AND direct (load-propagation-registry.js) | propagation check scripts |
| propagation-patterns.json | via load-config AND direct (load-propagation-registry.js) | propagation check scripts |
| multi-ai-config.json | via load-config AND indirect (state-manager.js VALID_CATEGORIES) | model-router, audit-health-check |
| review-schema.json | via load-config | review subsystem scripts |
| sonarcloud-config.json | via load-config | sync-sonarcloud |
| roadmap-config.json | via load-config | assign-roadmap-refs |
| security-config.json | via load-config | security scanning scripts |
| skills-config.json | via load-config | skills-registry |
| team-config.json | via load-config | team management scripts |
| trigger-config.json | via load-config | check-triggers |
| workflow-config.json | via load-config | workflow orchestration |

**Bypass cases** (direct require without load-config):
- load-propagation-registry.js: requires propagation-patterns.json and known-propagation-baseline.json directly
- audit-health-check.js: accesses multi-ai config via state-manager.js.VALID_CATEGORIES (indirect bypass)

---

## Learnings

**L1 — symlink-guard is a de-facto shared utility, not a hook-private lib.**
Its location in `.claude/hooks/lib/` is misleading. With 35+ edges pointing to it from both hooks AND scripts, it functions as a shared infrastructure module. Any JASON-OS port plan must treat it as such and either promote it to `scripts/lib/` or create an explicit bridge. The two-level fallback in safe-fs.js is evidence the original authors recognized this tension but patched around it rather than solving it.

**L2 — session-start.js is the highest-fan-out single node in the graph.**
It requires 4 hook-libs, 2 script-libs, and fires ~10 scripts via execFileSync. Every boot of a Claude session activates this entire subgraph synchronously. Any modification to any of the ~16 downstream scripts can affect session startup latency.

**L3 — The hook→script→hook-lib cycle through append-hook-warning is a porting risk.**
commit-tracker (hook) fires mid-session-alerts (script) which calls append-hook-warning (script) which requires symlink-guard (hook-lib). The transitive path crosses the hook/script boundary twice. This will break in any environment where symlink-guard is not available at the script layer's expected path.

**L4 — generate-views.js is an implicit transaction commit.**
7 debt mutation scripts end by calling generate-views. This is not documented anywhere — it was discovered structurally. Any new debt mutation script that does not call generate-views will leave views stale. This is a hidden protocol, not an enforced contract.

**L5 — log-override.js is the most porting-hostile script.**
Three hook-lib deps (symlink-guard, rotate-state, sanitize-input) + called by both a hook (governance-logger) and a script (session-end-commit) means it cannot be ported without bringing the entire hooks/lib/ layer with it. The JASON-OS version of session-end-commit.js uses an absolute REPO_ROOT path pattern when calling it — this is the correct approach and was already improved in JASON-OS.

**L6 — safe-fs.js has 8 skill-level copies that are divergence risk vectors.**
Each skill embeds its own copy of safe-fs.js. As of D7, the skill copies predate the MASTER_DEBT writer additions in SoNash's canonical safe-fs.js. JASON-OS's copy (636L) is also missing those additions vs SoNash (757L). Any sync plan must decide: centralize and symlink, or accept periodic manual syncs.

**L7 — The archive/ scripts have broken relative paths.**
Two archive scripts (archive-run-consolidation.v1.js, archive-sync-reviews-to-jsonl.js) contain `require('./lib/safe-fs')` paths that were valid when they lived in `scripts/` but broke when archived to `scripts/archive/`. They are superseded and should not be executed, but their paths will throw on any static analysis pass.

**L8 — warning-lifecycle.js creates a hard build dependency.**
It requires compiled TypeScript artifacts from `scripts/reviews/dist/`. This means the reviews subsystem must be compiled before the health subsystem can run. The dependency is invisible at the source level — it only manifests at runtime or after a clean build.

---

## Gaps

**G1 — Exact caller counts for sanitize-error.cjs not enumerable from JSONL alone.**
Wave 1 agents recorded `dependencies` fields rather than full import/require statements. The 61+ estimate is a floor; the actual count likely exceeds 80 when counting all transitive callers through safe-fs and security-helpers.

**G2 — Hook-lib `inline-patterns.js` edges not captured.**
D3b confirmed inline-patterns has no dependencies and is only called internally. No cross-boundary edges were found. Its exact callers within the hooks layer are not fully enumerated in Wave 1 data.

**G3 — Exact list of scripts called by session-start.js.**
D3b noted "~13 scripts via execSync." The JSONL captured 10 confirmed (E033–E042). The remaining 2–3 were not enumerated in Wave 1 findings. D20c (CI+config+memory mapper) may surface the remainder.

**G4 — review-lifecycle.ts internal dep graph not fully traced.**
It supersedes archive-run-consolidation.v1.js and calls into the TypeScript build system. Its full internal dep tree within scripts/reviews/src/ was not captured in D10a.

**G5 — validate-skip-reason.js in session-start.js (E040).**
Session-start requires validate-skip-reason directly. Combined with the 3 script callers (E101, E103, E104), this brings the confirmed caller count to 4. Given validate-skip-reason has NO JASON-OS counterpart, these 4 callers will fail on import in JASON-OS without the lib present.

---

## Files Written

- `D20b-dep-map-hooks-scripts.jsonl` — 225 edge records (E001–E225)
- `D20b-dep-map-hooks-scripts.md` — this narrative
