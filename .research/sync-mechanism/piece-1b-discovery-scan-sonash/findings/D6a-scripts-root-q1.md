# D6a Scripts Root Q1 — SoNash `scripts/` Positions 1-20

**Agent:** D6a
**Date:** 2026-04-18
**Scope:** `scripts/` root-level files, alphabetical positions 1-20
**Files inventoried:** 20
**Profile:** codebase

---

## Script Inventory Summary Table

| # | Filename | Lines (est.) | module_system | entry_point | shells_out | portability | test_coverage |
|---|----------|-------------|--------------|-------------|------------|-------------|---------------|
| 1 | aggregate-audit-findings.js | ~1200+ | esm | yes | no | not-portable | yes |
| 2 | analyze-learning-effectiveness.js | ~1390 | cjs | yes | no | not-portable | yes |
| 3 | append-hook-warning.js | 452 | cjs | yes | no | portable | yes |
| 4 | archive-doc.js | 799 | esm | yes | no | sanitize-then-portable | yes |
| 5 | assign-review-tier.js | ~200+ | esm | yes | no | not-portable | yes |
| 6 | check-agent-compliance.js | ~120+ | esm | yes | yes | sanitize-then-portable | yes |
| 7 | check-backlog-health.js | ~150+ | esm (mixed) | yes | no | sanitize-then-portable | yes |
| 8 | check-cc.js | ~400+ | esm (mixed) | yes | yes | portable | yes |
| 9 | check-content-accuracy.js | ~200+ | esm | yes | yes | sanitize-then-portable | yes |
| 10 | check-cross-doc-deps.js | ~300+ | cjs | yes | yes | not-portable | yes |
| 11 | check-cyclomatic-cc.js | ~250+ | cjs | yes | yes | portable | yes |
| 12 | check-doc-headers.js | ~200+ | cjs | yes | yes | sanitize-then-portable | yes |
| 13 | check-doc-placement.js | ~300+ | esm | yes | yes | sanitize-then-portable | yes |
| 14 | check-docs-light.js | ~300+ | esm | yes | no | sanitize-then-portable | yes |
| 15 | check-document-sync.js | ~200+ | esm | yes | no | not-portable | yes |
| 16 | check-external-links.js | ~250+ | esm | yes | no | portable | yes |
| 17 | check-hook-health.js | ~200+ | cjs | yes | yes | sanitize-then-portable | yes |
| 18 | check-pattern-compliance.js | ~400+ | esm (mixed) | yes | yes | not-portable | yes |
| 19 | check-pattern-sync.js | ~150+ | cjs | yes | no | not-portable | yes |
| 20 | check-propagation-staged.js | ~300+ | cjs | yes | yes | sanitize-then-portable | yes |

**All 20 are entry points** (invoked directly, not library modules).
**All 20 have test coverage** in `tests/scripts/*.test.ts`.

---

## Script Taxonomy

### Naming Pattern Distribution

- **check-* (15 scripts):** Positions 6-20. These are validators, linters, and pre-commit/pre-push gates. The `check-` prefix is the dominant pattern in this batch.
- **Non-check (5 scripts):** Positions 1-5.
  - `aggregate-*`: one-off aggregator script
  - `analyze-*`: analysis/dashboard script
  - `append-*`: utility called by other systems
  - `archive-*`: operational doc management
  - `assign-*`: classification script

### Functional Groups

**Pre-commit/pre-push gates (invoked by husky):**
- check-agent-compliance.js
- check-backlog-health.js (pre-push)
- check-cc.js (pre-push, cognitive complexity)
- check-cross-doc-deps.js (pre-commit, blocking)
- check-cyclomatic-cc.js (pre-push)
- check-doc-headers.js (pre-commit, blocking)
- check-propagation-staged.js (pre-commit, blocking)

**Documentation health checks (run manually or via npm scripts):**
- check-content-accuracy.js
- check-doc-placement.js
- check-docs-light.js
- check-document-sync.js
- check-external-links.js
- check-hook-health.js

**Pattern/learning enforcement:**
- check-pattern-compliance.js (core learning gate)
- check-pattern-sync.js (consistency validator)
- analyze-learning-effectiveness.js (analysis dashboard)

**Infrastructure utilities:**
- append-hook-warning.js (hub utility)

**One-off/operational:**
- aggregate-audit-findings.js (historical aggregation)
- archive-doc.js (doc lifecycle management)
- assign-review-tier.js (PR workflow)

---

## Module System Distribution

| module_system | count | scripts |
|--------------|-------|---------|
| cjs | 8 | analyze-learning-effectiveness, append-hook-warning, check-cross-doc-deps, check-cyclomatic-cc, check-doc-headers, check-hook-health, check-pattern-sync, check-propagation-staged |
| esm | 9 | aggregate-audit-findings, archive-doc, assign-review-tier, check-agent-compliance, check-content-accuracy, check-doc-placement, check-docs-light, check-document-sync, check-external-links |
| esm (mixed) | 3 | check-backlog-health (esm + createRequire), check-cc (esm + createRequire), check-pattern-compliance (esm + createRequire) |

**Key observation:** No root `package.json` `"type": "module"` directive exists in SoNash. The default is CJS for `.js` files. Scripts that use `import` have adopted ESM despite this — they work because they use `import()` or have internal ESM patterns that Node.js resolves. The mixed-ESM scripts explicitly use `createRequire(import.meta.url)` to load CJS libs (safe-fs.js, sanitize-error.cjs) from within ESM context. This is a common pattern in this codebase — D6 agents should expect it frequently.

---

## External Tool Dependencies

| Tool | Scripts that require it |
|------|------------------------|
| `git` | check-agent-compliance, check-cc, check-content-accuracy, check-cross-doc-deps, check-cyclomatic-cc, check-doc-headers, check-doc-placement, check-pattern-compliance, check-propagation-staged |
| `acorn` (npm) | check-cc |
| `eslint` (npm) | check-cyclomatic-cc |
| `minimatch` (npm) | check-propagation-staged |
| `gray-matter` (npm) | archive-doc |
| `node` (process.execPath) | check-hook-health |

**git is the dominant external tool** — 9 of 20 scripts invoke it. Most use `execFileSync("git", [...])` rather than shell strings, which is correct per security best practices.

---

## Hub Script: `append-hook-warning.js` Deep-Dive

### Summary

`append-hook-warning.js` is the **most load-bearing script** in the SoNash hook ecosystem. Every hook warning that surfaces at session start flows through this script.

### Call Graph (confirmed)

**From `.claude/hooks/` (6 hook files):**
- `check-remote-session-context.js` — spawns it for remote context warnings
- `decision-save-prompt.js` — spawns it for decision save warnings
- `governance-logger.js` — spawns it per D13 wiring for governance events
- `session-start.js` — routes session-start warnings through it (prior code used fs.appendFileSync directly, bypassing dedup; this was fixed by routing through append-hook-warning.js)
- `settings-guardian.js` — spawns it for settings mutation warnings
- `test-tracker.js` — spawns it for test failure warnings per D13

**From `.husky/pre-commit` (10+ invocation sites):**
- pr-creep warning (3 variants: default, info, warning tier)
- missing-tool warning (2 variants)
- pattern-error warning
- propagation-staged warning (BLOCK and WARN variants)
- skill validation warning
- cognitive-complexity warning
- doc-index warning
- agent compliance warning
- JSONL-MD sync warning

**From `.husky/pre-push` (7+ invocation sites):**
- pattern compliance warning
- code-reviewer bypass warning
- propagation bypass/warnings
- hook tests failure warning
- security warnings
- npm audit warning
- network error warning
- trigger warnings

**Total: 8 hook files + 2 husky scripts = 10 unique caller files, ~25+ individual call-sites**

### Architecture

The script manages three state files:

1. **`.claude/hook-warnings.json`** — cache/view of active warnings (max 50 entries, rolling). This is the file Claude reads at session start. It is cleared by `--clear=true`. This is a cache view only — acknowledgment state does NOT live here (D30 refactor).

2. **`.claude/state/hook-warnings-log.jsonl`** — JSONL audit trail. Append-only. Every warning ever emitted is logged here with `actor`, `user`, `outcome` fields. Used for:
   - Cross-session dedup (deduplicate within an ack cycle)
   - Occurrence counting (escalation logic)
   - Recurrence analysis by analyze-learning-effectiveness.js

3. **`.claude/state/hook-warnings-ack.json`** — Acknowledgment state. Contains `acknowledged` map (type -> last ack timestamp) and `lastCleared` timestamp (D30 refactor). This file tracks when warnings were last acknowledged per type.

### Key Behaviors

**Severity escalation:** If a warning type has occurred 5+ times in the last 7 days (from the JSONL log), `info` severity auto-promotes to `warning`. At 15+ occurrences, severity promotes to `error`. Exception: `pr-creep` type is permanently exempt from escalation (stays at declared severity) per T39 R1 policy.

**Cross-session dedup:** Same type+message within an ack cycle (since `lastCleared`) is deduplicated across sessions. Fast path: in-memory cache check (same-session, 1-hour window). Slow path: JSONL log scan for cross-session dedup.

**`count` field:** Optional field for metrics where a varying number would defeat dedup (e.g., "10 commits on branch" — the number changes but you still want to dedup the type+message). Count is stored separately so dedup on type+message still works.

**Atomic write:** Writes to `.json` files via temp-file-then-rename pattern. Windows compatibility: `rmSync` before rename.

**Dependencies that must co-port:**
- `scripts/lib/safe-fs.js` (safeWriteFileSync, safeRenameSync, safeAppendFileSync)
- `scripts/lib/parse-jsonl-line.js` (safeParseLine)
- `.claude/hooks/lib/symlink-guard` (isSafeToWrite) — if unavailable, script refuses to write

### Portability Assessment

**Rated: portable.** No SoNash-specific business logic. The warning schema is generic (hook, type, severity, message, action, files, pattern, count). The state file paths use conventional `.claude/` layout. The only coupling is to `scripts/lib/` helpers and `.claude/hooks/lib/symlink-guard`, all of which must co-port. This script + its three dependencies form a complete, portable warning persistence subsystem.

---

## Copy-Not-Import Instances

None found in this batch. All 20 scripts reference their dependencies via `require()`/`import` from their actual source locations. No evidence of copied lib files. The `is_copy_of` field is `null` for all 20 records.

Note: `archive-doc.js` defines its own `safeWriteFile` function (line 231) despite importing `safeWriteFileSync` from `scripts/lib/safe-fs.js`. This is NOT a copy — it's a wrapper that adds dry-run support and additional symlink checking on top of the safe-fs primitive.

---

## Dependencies on `scripts/config/` (SoNash-Specific Config Loader)

Four scripts depend on `scripts/config/load-config.js`:
- check-cross-doc-deps.js
- check-doc-headers.js
- check-pattern-compliance.js
- (+ check-backlog-health.js reads `scripts/config/` indirectly)

The `scripts/config/` directory contains 15 JSON config files including `propagation-patterns.json`, `doc-header-config.json`, `skill-config.json`, `verified-patterns.json`, etc. This is a SoNash-specific configuration system with its own loader. Any script depending on `load-config.js` is `not-portable` or `sanitize-then-portable` depending on whether the config content is SoNash-specific.

---

## Dependencies on `scripts/lib/validate-skip-reason.js`

Two scripts depend on `scripts/lib/validate-skip-reason.js`:
- check-cross-doc-deps.js
- check-doc-headers.js

This library is NOT present in JASON-OS (`scripts/lib/`). It is a SoNash-specific skip-reason validator (validates the `SKIP_REASON` env var format). Any script depending on it cannot port without also porting or re-implementing this library.

---

## Portability Distribution

| portability | count | scripts |
|------------|-------|---------|
| portable | 4 | append-hook-warning, check-cc, check-cyclomatic-cc, check-external-links |
| sanitize-then-portable | 9 | archive-doc, check-agent-compliance, check-backlog-health, check-content-accuracy, check-doc-headers, check-doc-placement, check-docs-light, check-hook-health, check-propagation-staged |
| not-portable | 7 | aggregate-audit-findings, analyze-learning-effectiveness, assign-review-tier, check-cross-doc-deps, check-document-sync, check-pattern-compliance, check-pattern-sync |

**Most valuable portable scripts for JASON-OS:**
1. `append-hook-warning.js` — forms the core of a portable hook warning pipeline
2. `check-cc.js` — portable cognitive complexity gate (SonarSource spec, no SoNash deps)
3. `check-cyclomatic-cc.js` — portable cyclomatic complexity gate (ESLint-based)
4. `check-external-links.js` — portable URL validator for docs

---

## `append-hook-warning.js` — Cross-Component Dependency Map

```
.claude/hooks/check-remote-session-context.js ──┐
.claude/hooks/decision-save-prompt.js ──────────┤
.claude/hooks/governance-logger.js ─────────────┤
.claude/hooks/session-start.js ─────────────────┼──► append-hook-warning.js
.claude/hooks/settings-guardian.js ─────────────┤     ├── scripts/lib/safe-fs.js
.claude/hooks/test-tracker.js ──────────────────┤     ├── scripts/lib/parse-jsonl-line.js
.husky/pre-commit ───────────────────────────────┤     └── .claude/hooks/lib/symlink-guard
.husky/pre-push ─────────────────────────────────┘
                                                        ↓ writes to
                                                  .claude/hook-warnings.json
                                                  .claude/state/hook-warnings-log.jsonl
                                                  .claude/state/hook-warnings-ack.json
                                                        ↓ read by
                                                  analyze-learning-effectiveness.js
                                                  (reads hook-warnings-log.jsonl)
```

---

## Learnings for Methodology

**1. "Mixed ESM" is a common third category.** The SCHEMA_SPEC says `cjs | esm | none` but the codebase has a significant population of files that use `import` at the top but also `createRequire(import.meta.url)` to load CJS modules. These are ESM files, but the distinction matters for port planning (they have CJS deps they cannot import directly). The `module_system: "esm"` value is still correct per spec, but the notes field should flag `createRequire` usage. Consider whether D22 should add an `esm-mixed` sub-type or a `has_createRequire: boolean` field.

**2. The `scripts/config/` dependency tree is a hidden portability blocker.** Four scripts in this batch alone depend on `scripts/config/load-config.js` and associated JSON configs. This dependency is invisible from the script file itself — you have to grep for `require("./config/load-config")`. D-agents covering scripts Q2-Q4 should watch for this pattern.

**3. `scripts/lib/validate-skip-reason.js` is a porting dependency gap.** Not in JASON-OS. Two scripts in this batch need it. Future agents should flag it consistently.

**4. All 20 scripts have tests.** SoNash test coverage is high — every script tested via `tests/scripts/*.test.ts`. Note: `check-cyclomatic-cc.js` maps to `check-cc-gate.test.ts` (not `check-cyclomatic-cc.test.ts`) — the test filename slug diverges from the script name. D-agents checking test coverage should not rely purely on name matching; a glob scan is safer.

**5. Hook-to-script coupling pattern: spawn, not import.** None of the hooks `require()` or `import` the scripts. They all invoke them via `execFileSync("node", ["scripts/append-hook-warning.js", "--arg=..."])` or equivalent. This means the coupling is CLI-contract-based, not API-based. Port planning should treat the CLI interface as the contract to preserve.

**6. Agent scope was correctly sized.** 20 scripts across ~8 read operations with full deep-reads for large files was manageable. Recommend keeping D6b-D6d at ~20 scripts each.

---

## Gaps and Missing References

1. **`scripts/lib/validate-skip-reason.js`** — depended on by check-cross-doc-deps.js and check-doc-headers.js, not found in JASON-OS. Needs a dedicated entry in the sync inventory by another D-agent (D7+ scripts/lib coverage).

2. **`scripts/config/load-config.js`** and its 15 sibling JSON files — these are a config subsystem depended on by multiple check-* scripts. Not in JASON-OS. Needs D-agent coverage (likely D7-D8 range covering scripts/config/).

3. **`check-cyclomatic-cc.js` test mapping anomaly** — test file is named `check-cc-gate.test.ts`, not `check-cyclomatic-cc.test.ts`. The reason for the naming divergence is not visible from the script alone. Another agent may want to read the test file to understand why.

4. **`aggregate-audit-findings.js` file size** — exceeded the 25k token read limit. The last 200 lines were read separately. The file is a large ESM script; full analysis required two reads. Total line count not confirmed (est. 1200+).

5. **`archive-doc.js` `safeWriteFile` wrapper** — this script defines its own `safeWriteFile` (line 231) as a wrapper over the imported `safeWriteFileSync`. Whether this wrapper should be extracted to a shared lib or whether it's intentionally local is not clear from the code alone.
