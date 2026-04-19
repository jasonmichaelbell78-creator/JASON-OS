# D6c Scripts Root Q3 — SoNash `scripts/` Positions 41-60

**Agent:** D6c
**Date:** 2026-04-18
**Scope:** `scripts/` root-level files, alphabetical positions 41-60
**Files inventoried:** 20
**Profile:** codebase
**PIECE 1A GAP STATUS:** log-override.js — FOUND (position 43)

---

## Script Inventory Summary Table

| # | Filename | module_system | entry_point | shells_out | portability | test_coverage |
|---|----------|--------------|-------------|------------|-------------|---------------|
| 41 | install-cli-tools.sh | none (bash) | yes | yes | sanitize-then-portable | no |
| 42 | lighthouse-audit.js | cjs | yes | no | not-portable-product | yes |
| 43 | **log-override.js** | cjs | yes | yes | **portable** | yes |
| 44 | log-session-activity.js | cjs | yes | yes | **portable** | yes |
| 45 | normalize-canon-ids.js | esm (mixed) | yes | no | not-portable | yes |
| 46 | phase-complete-check.js | esm | yes | yes | sanitize-then-portable | yes |
| 47 | promote-patterns.js | cjs | yes | no | not-portable | yes |
| 48 | ratchet-baselines.js | cjs | yes | yes | not-portable | yes |
| 49 | reclassify-learning-routes.js | cjs | yes | no | not-portable | no |
| 50 | refine-scaffolds.js | cjs | yes | no | not-portable | yes |
| 51 | render-orphan-report.js | cjs | yes | no | sanitize-then-portable | no |
| 52 | reset-audit-triggers.js | esm | yes | no | not-portable | yes |
| 53 | resolve-hook-warnings.js | cjs | yes | yes | **portable** | no |
| 54 | review-lifecycle.js | cjs | yes | yes | not-portable | yes |
| 55 | route-enforcement-gaps.js | cjs | yes | no | not-portable | yes |
| 56 | route-lifecycle-gaps.js | cjs | yes | no | not-portable | yes |
| 57 | run-consolidation.js | cjs | yes | yes | not-portable | yes |
| 58 | run-github-health.js | cjs | yes | yes | **sanitize-then-portable** | yes |
| 59 | search-capabilities.js | cjs | yes | yes | sanitize-then-portable | yes |
| 60 | security-check.js | esm | yes | yes | **portable** | yes |

---

## PIECE 1A GAP: `log-override.js` — Deep Analysis

### Status

**FOUND** at position 43. This file was surfaced in Piece 1a §6.1 as a Piece 1a gap (JASON-OS missing it). It exists in SoNash and has now been fully analyzed.

### What It Does

`log-override.js` is the **override accountability subsystem** for SoNash's blocking check infrastructure. When an operator sets `SKIP_TRIGGERS=1`, `SKIP_PATTERNS=1`, or similar env vars to bypass a hook gate, this script logs the bypass to `.claude/override-log.jsonl` as a JSONL audit trail. Without this, bypasses are invisible.

### Architecture

**JSONL target:** `.claude/override-log.jsonl`

**Override entry schema:**
```json
{
  "timestamp": "2026-04-18T...",
  "check": "triggers",
  "reason": "Already ran security-auditor this session",
  "user": "redacted",
  "cwd": "redacted",
  "git_branch": "main"
}
```
Note: `user` and `cwd` are redacted at write time — privacy-by-design.

**Dual rotation strategy:**
1. Size-based: at 50KB, rename to timestamped backup
2. Entry-based: at 64KB+, call `rotateJsonl(path, 100, 60)` via `.claude/hooks/lib/rotate-state.js` (keep 60 of last 100 entries)

**C3-G3 Auto-DEBT escalation:**
If a check type is bypassed 15+ times in 14 days, script auto-generates a DEBT entry in `docs/technical-debt/MASTER_DEBT.jsonl` and `docs/technical-debt/raw/deduped.jsonl`. Deduplicates against existing MASTER_DEBT before writing. This integrates with SoNash's technical debt tracking system.

**Modes:**
- `--check=X --reason="Y"` — log override (main mode)
- `--quick` — silent log + exit (for shell hooks)
- `--list` — show last 10 entries
- `--clear` — archive and clear log
- `--analytics [--days=N] [--json]` — trend analytics with per-check 7-day rolling windows

**Exports (programmatic API):** `logSkip`, `logOverride`, `computeAnalytics`, `readEntries`

### Dependencies That Must Co-Port

| Dependency | JASON-OS Status |
|-----------|----------------|
| `scripts/lib/safe-fs.js` | EXISTS |
| `scripts/lib/parse-jsonl-line.js` | EXISTS |
| `.claude/hooks/lib/symlink-guard` | EXISTS |
| `.claude/hooks/lib/rotate-state.js` | UNKNOWN — needs D3 check |
| `.claude/hooks/lib/sanitize-input` | UNKNOWN — needs D3 check |

### Portability Assessment

**Rated: portable.** No SoNash-specific business logic. The check names (triggers, patterns, tests) are generic. The DEBT integration uses a path (`docs/technical-debt/`) that would need a project decision, but it is guarded by try/catch and best-effort. The core audit trail function ports cleanly.

### JASON-OS Gap Confirmed

Neither `log-override.js` nor `.claude/override-log.jsonl` exists in JASON-OS. This is a **high-priority port candidate** — it is the canonical source that JASON-OS hooks reference for override logging. Any JASON-OS hook that supports SKIP_ env vars should call this script to maintain accountability.

---

## JSONL Log Writers in This Batch

Two scripts write JSONL logs. Both are portable.

| Script | JSONL Target | Rotation | Exports |
|--------|-------------|----------|---------|
| `log-override.js` | `.claude/override-log.jsonl` | size (50KB) + entry (64KB→60/100) | logSkip, logOverride, computeAnalytics, readEntries |
| `log-session-activity.js` | `.claude/session-activity.jsonl` | size (100KB) only | none |

**Key distinction:** `log-session-activity.js` uses `security-helpers.js::isSafeToWrite` (not symlink-guard directly); `log-override.js` uses `.claude/hooks/lib/symlink-guard::isSafeToWrite`. These are the same conceptual guard but different implementations — both must be present in JASON-OS.

`log-session-activity.js` has a full secret redaction pipeline on all logged values (regex patterns for bearer tokens, API keys, basic auth, key=value). This is more sophisticated than `log-override.js`'s approach (which simply redacts user/cwd at write time).

---

## Portable Scripts — Port Priority

| Script | Priority | Reason |
|--------|----------|--------|
| `log-override.js` | HIGH | Piece 1a gap; override accountability subsystem |
| `log-session-activity.js` | HIGH | Session lifecycle tracking; no SoNash deps |
| `security-check.js` | HIGH | Generic security pattern checker; no SoNash deps |
| `resolve-hook-warnings.js` | MEDIUM | Companion to append-hook-warning.js (already flagged as portable in D6a) |
| `run-github-health.js` | MEDIUM | Sanitize repo slug only; generic health check pattern |
| `phase-complete-check.js` | MEDIUM | Phase gate concept portable; npm script names need update |
| `install-cli-tools.sh` | LOW | Useful toolchain installer; tool list is the config point |
| `search-capabilities.js` | LOW | Blocked by scripts/config/load-config.js dep |

---

## Module System Distribution

| module_system | count | scripts |
|--------------|-------|---------|
| cjs | 13 | lighthouse-audit, log-override, log-session-activity, promote-patterns, ratchet-baselines, reclassify-learning-routes, refine-scaffolds, render-orphan-report, resolve-hook-warnings, review-lifecycle, route-enforcement-gaps, route-lifecycle-gaps, run-consolidation, run-github-health, search-capabilities |
| esm | 4 | phase-complete-check, reset-audit-triggers, security-check (fileURLToPath/import.meta pattern), normalize-canon-ids |
| esm (mixed) | 1 | normalize-canon-ids (import at top + createRequire for lib deps) |
| none | 1 | install-cli-tools.sh (bash) |

Note: This batch is more heavily CJS than Q1 (Q1 was ~split 50/50). The dominant pattern in Q3 is CJS with defensive guarded imports.

---

## Portability Distribution

| portability | count | scripts |
|------------|-------|---------|
| portable | 4 | log-override, log-session-activity, resolve-hook-warnings, security-check |
| sanitize-then-portable | 5 | install-cli-tools, phase-complete-check, render-orphan-report, run-github-health, search-capabilities |
| not-portable | 10 | normalize-canon-ids, promote-patterns, ratchet-baselines, reclassify-learning-routes, refine-scaffolds, reset-audit-triggers, review-lifecycle, route-enforcement-gaps, route-lifecycle-gaps, run-consolidation |
| not-portable-product | 1 | lighthouse-audit |

---

## Test Coverage Analysis

**13 of 20 have test coverage** (65%). Lower than Q1 (100%) due to several SoNash-specific migration/one-off scripts having no dedicated tests:
- `reclassify-learning-routes.js` — one-time migration, no test
- `render-orphan-report.js` — no test found (tests/ or __tests__)
- `resolve-hook-warnings.js` — no test found
- `install-cli-tools.sh` — no test (bash script, expected)
- `reclassify-learning-routes.js` — no test

Notable: `ratchet-baselines.js` has tests in BOTH locations — `tests/scripts/ratchet-baselines.test.ts` AND `scripts/__tests__/ratchet-baselines.test.js`. Two test suites for the same script. `review-lifecycle.js`, `route-enforcement-gaps.js`, and `route-lifecycle-gaps.js` have tests in `scripts/__tests__/` (not `tests/scripts/`) — these are co-located JS tests, not TypeScript.

---

## External Tool Dependencies

| Tool | Scripts that require it |
|------|------------------------|
| `git` | log-override, log-session-activity, resolve-hook-warnings, security-check |
| `gh` (GitHub CLI) | resolve-hook-warnings, run-github-health |
| `chrome-launcher / lighthouse` | lighthouse-audit |
| `winget` | install-cli-tools.sh |
| `curl` | install-cli-tools.sh |
| `npx (tsc)` | promote-patterns (compiles TS sub-project) |
| `node` | install-cli-tools.sh (reads tool-manifest.json) |

---

## Porting Dependency Gaps Surfaced

1. **`.claude/hooks/lib/rotate-state.js`** — used by `log-override.js` for entry-based rotation. Not confirmed in JASON-OS. D3 agents should flag.
2. **`.claude/hooks/lib/sanitize-input`** — used by `log-override.js` for arg sanitization. Not confirmed in JASON-OS.
3. **`scripts/lib/confidence-classifier.js`** — used by `refine-scaffolds.js`. Present in SoNash, NOT in JASON-OS. SoNash-specific; only needed if the learning system is ported.
4. **`scripts/lib/sanitize-error.js`** — used by `render-orphan-report.js` (`.js` extension, not `.cjs`). JASON-OS has `sanitize-error.cjs` — check if `.js` is an alias or separate file in SoNash.

---

## Serendipitous Discoveries

**`review-lifecycle.js` deprecation note (2026-04-17):** The reviews-archive.jsonl file was merged into reviews.jsonl the day before this scan. The script retains backward-compat dedup logic but the archive path is now effectively dead. This is a very recent change — any JASON-OS port decision should use the current (post-merge) schema.

**`phase-complete-check.js` is deeply security-hardened:** symlink traversal protection with `realpathSync` canonicalization on both the project root AND the archive directory, `lstatSync` before `statSync`, and output sanitization that strips ANSI escape sequences and home directory paths from CI logs. The security review count (198+ PR reviews referenced in comments) shows this file went through an unusually rigorous review cycle. JASON-OS should port this level of hardening as a pattern reference.

**`ratchet-baselines.js` dual-test anomaly:** Two test suites covering the same script at different paths (`tests/scripts/ratchet-baselines.test.ts` TypeScript AND `scripts/__tests__/ratchet-baselines.test.js` JavaScript). This may be a legacy artifact of a test infrastructure migration. The D22 (schema surveyor) or whoever does test inventory should flag this.

**`log-override.js` exports a programmatic API (`logSkip`):** This means other scripts can `require('scripts/log-override.js')` and call `logSkip(check, reason)` without spawning a child process. This is more efficient than the hook pattern (which uses `execFileSync("node", ["scripts/log-override.js", "--quick", ...])`). Any JASON-OS hook that skips checks should use `logSkip` directly if running in Node.js context.

---

## Learnings for Methodology

**1. Dual-test coverage is possible.** One script (`ratchet-baselines.js`) has tests in both `tests/scripts/*.test.ts` (TypeScript Vitest) and `scripts/__tests__/*.test.js` (JavaScript). D-agents checking test coverage must scan both locations. A simple glob on `tests/scripts/` is insufficient.

**2. Guarded import pattern is the dominant CJS style in Q3.** Most CJS scripts in this batch use a `try { dep = require(...) } catch { fallback }` pattern for each dependency. This is a defensive pattern that avoids hard crashes when optional deps are missing. It also means the module graph is harder to determine statically — dynamic require() in catch blocks can be missed.

**3. The `sanitize-error.js` vs `sanitize-error.cjs` distinction matters.** `render-orphan-report.js` uses `require('./lib/sanitize-error.js')` (no .cjs). `run-github-health.js` explicitly uses `require('./lib/sanitize-error.cjs')` with a comment explaining why (ESM source can't be require()d in CJS context). D-agents covering scripts/lib/ should clarify whether these are two different files or the same file with two extensions.

**4. One-time migration scripts are `not-portable` and untested.** `reclassify-learning-routes.js` is a dated (2026-04-07) migration script with no tests. This is a pattern — migration scripts don't get tests because they're run once. Future D-agents should classify such scripts as `status: complete` if the migration already ran.

**5. The scripts/reviews/ TypeScript sub-project is a dependency sink.** `promote-patterns.js` and `review-lifecycle.js` both depend on compiled TypeScript from `scripts/reviews/dist/`. This sub-project requires its own compilation step (`cd scripts/reviews && npx tsc`). Any port of the review lifecycle must include this TS sub-project or replace it. D7+ agents covering scripts/reviews/ should scope this.

**6. Q3 batch scope was correctly sized.** 20 scripts with 8 deep reads + 12 partial reads (header + 60 lines) completed in one pass. The previous agents' guidance to keep batches at ~20 remains valid.
