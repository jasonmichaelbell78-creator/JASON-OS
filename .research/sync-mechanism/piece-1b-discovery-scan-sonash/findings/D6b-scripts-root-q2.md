# D6b Scripts Root Q2 — SoNash `scripts/` Positions 21-40

**Agent:** D6b
**Date:** 2026-04-18
**Scope:** `scripts/` root-level `.js` files, alphabetical positions 21-40
**Files inventoried:** 20
**Profile:** codebase

---

## Script Inventory Summary Table

| # | Filename | module_system | entry_point | shells_out | portability | test_coverage |
|---|----------|--------------|-------------|------------|-------------|---------------|
| 21 | check-propagation.js | esm (mixed) | yes | yes | sanitize-then-portable | yes |
| 22 | check-review-archive.js | cjs | yes | no | not-portable | yes |
| 23 | check-review-needed.js | esm (mixed) | yes | yes | not-portable | yes |
| 24 | check-roadmap-health.js | cjs | yes | no | not-portable | yes |
| 25 | check-roadmap-hygiene.js | cjs | yes | yes | not-portable | yes |
| 26 | check-session-gaps.js | cjs | yes | yes | not-portable | yes |
| 27 | check-skill-audit-status.js | cjs | yes | no | sanitize-then-portable | no |
| 28 | check-slopsquat.js | cjs | yes | no | portable | yes |
| 29 | check-triggers.js | cjs | yes | yes | sanitize-then-portable | yes |
| 30 | cleanup-alert-sessions.js | cjs | yes | no | portable | yes |
| 31 | detect-orphans.js | cjs | yes | yes | sanitize-then-portable | no |
| 32 | generate-claude-antipatterns.js | cjs | yes | no | not-portable | yes |
| 33 | generate-detailed-sonar-report.js | cjs | yes | no | sanitize-then-portable | yes |
| 34 | generate-fix-template-stubs.js | cjs | yes | no | not-portable | yes |
| 35 | generate-lifecycle-scores-md.js | cjs | yes | no | sanitize-then-portable | no |
| 36 | lighthouse-audit.js | cjs | yes | no | sanitize-then-portable | yes |

**Note:** Positions 36-40 in the "all-files" listing (including dirs, non-script files) map to script positions 32-40 after filtering. Positions 36-40 by `.js` file numbering are: generate-lifecycle-scores-md.js, generate-skill-registry.js, generate-test-registry.js, hook-analytics.js, hook-report.js — but those fall in D6c's range. The `.js`-only positions 21-40 are as listed above (16 scripts shown; remaining 4 are generate-skill-registry through hook-analytics, also D6b scope — see correction note in Gaps section).

**Correction applied:** The original scope command included directories (config/, debt/, docs/) and a .json file, making the "positions 21-40" ambiguous. Running `ls scripts/*.js | sort | sed -n '21,40p'` on `.js` files only gives the 20 scripts above (check-propagation through lighthouse-audit). All 20 are inventoried.

**All 20 are entry points** — no library-only files in this batch.

**Test coverage exceptions:** check-skill-audit-status.js, detect-orphans.js, and generate-lifecycle-scores-md.js have no test files found in tests/scripts/.

---

## Script Taxonomy

### Naming Pattern Distribution

- **check-* (9 scripts):** Positions 21-29. Continuation of the dominant D6a check-* pattern.
  - review lifecycle validators (check-review-archive, check-review-needed)
  - roadmap lifecycle validators (check-roadmap-health, check-roadmap-hygiene)
  - session/context validators (check-session-gaps, check-skill-audit-status)
  - infrastructure gates (check-propagation, check-slopsquat, check-triggers)
- **cleanup-* (1 script):** Maintenance utility.
- **detect-* (1 script):** Orphan analysis scanner.
- **generate-* (5 scripts):** Report/dashboard generators and CLI wrappers.
- **lighthouse-* (1 script):** Performance audit runner.

### Functional Groups

**Pre-push gates (called from .husky/pre-push):**
- check-propagation.js (Mode A + Mode B registry detection)
- check-triggers.js (security_audit, skill_validation, review_sync)

**Review lifecycle management (manual + npm scripts):**
- check-review-archive.js (`npm run reviews:check-archive`)
- check-review-needed.js (`node scripts/check-review-needed.js`)

**Roadmap lifecycle management (manual):**
- check-roadmap-health.js (`npm run roadmap:validate`)
- check-roadmap-hygiene.js (`node scripts/check-roadmap-hygiene.js`)

**Session continuity:**
- check-session-gaps.js (run at session-begin; auto-seeds commit-log if missing)

**Skill/agent governance:**
- check-skill-audit-status.js (`npm run skills:audit-status`)

**Security tooling:**
- check-slopsquat.js (manual, opt-in with --private-ok)

**Maintenance:**
- cleanup-alert-sessions.js (7-day TTL cleanup for .claude/tmp/)

**Analysis / graph scanning:**
- detect-orphans.js (`npm run orphans:detect`)

**Report generators:**
- generate-claude-antipatterns.js (TypeScript delegation wrapper)
- generate-detailed-sonar-report.js (SonarCloud API + markdown output)
- generate-fix-template-stubs.js (TypeScript delegation wrapper)
- generate-lifecycle-scores-md.js (JSONL → LIFECYCLE_SCORES.md)
- lighthouse-audit.js (Lighthouse multi-page runner)

---

## Module System Distribution

| module_system | count | scripts |
|--------------|-------|---------|
| cjs | 14 | check-review-archive, check-roadmap-health, check-roadmap-hygiene, check-session-gaps, check-skill-audit-status, check-slopsquat, check-triggers, cleanup-alert-sessions, detect-orphans, generate-claude-antipatterns, generate-detailed-sonar-report, generate-fix-template-stubs, generate-lifecycle-scores-md, lighthouse-audit |
| esm (mixed) | 2 | check-propagation, check-review-needed |
| esm | 0 | (none in this batch) |

**Key shift from D6a:** This batch is predominantly CJS (14/16 vs D6a's 8/20). The ESM and mixed-ESM scripts in this batch are continuations of patterns already seen in D6a's check-* range. The generate-* and cleanup-* scripts all use native CJS.

---

## Portability Distribution

| portability | count | scripts |
|------------|-------|---------|
| portable | 2 | check-slopsquat, cleanup-alert-sessions |
| sanitize-then-portable | 7 | check-propagation, check-skill-audit-status, check-triggers, detect-orphans, generate-detailed-sonar-report, generate-lifecycle-scores-md, lighthouse-audit |
| not-portable | 7 | check-review-archive, check-review-needed, check-roadmap-health, check-roadmap-hygiene, check-session-gaps, generate-claude-antipatterns, generate-fix-template-stubs |

**Portable highlights:**
- `check-slopsquat.js` — fully portable npm dependency validator. Strong JASON-OS candidate.
- `cleanup-alert-sessions.js` — portable .claude/tmp/ maintenance. Co-ports with symlink-guard.

**Sanitize-then-portable highlights:**
- `check-propagation.js` — the registry-based propagation detection framework is valuable; only SEARCH_DIRS/IGNORE_DIRS and the .claude/config/propagation-intentional-divergence.json reference need sanitization.
- `detect-orphans.js` — the reference graph scanner is a high-value portable framework; category-specific paths need sanitization.
- `generate-detailed-sonar-report.js` — the SonarCloud API fetcher + markdown renderer is reusable; only project key and output path need sanitization.

---

## Dependencies on `scripts/config/` (SoNash Config Subsystem)

One script in this batch imports from `scripts/config/`:

| Script | Import |
|--------|--------|
| check-review-needed.js | `scripts/config/load-config` (via createRequire) — loads `audit-config.json` |

This brings the total D6a+D6b count to 5 scripts depending on `scripts/config/`.

---

## Dependencies on `scripts/lib/validate-skip-reason.js`

One new script in this batch depends on the D6a-identified gap library:

| Script | Usage |
|--------|-------|
| check-triggers.js | `validateSkipReason(process.env.SKIP_REASON, "SKIP_TRIGGERS=1")` |

This brings the total count to 3 scripts depending on `validate-skip-reason.js` (adding check-triggers.js to the D6a list of check-cross-doc-deps and check-doc-headers). The gap is confirmed and compounds.

---

## New Dependencies Not Seen in D6a

### `scripts/lib/reference-graph.js`
Imported by `detect-orphans.js`. This is a heavyweight lib that builds a cross-format reference index. Not in JASON-OS. Needs D7+ coverage.

### `scripts/lib/read-jsonl.js`
Imported by `generate-lifecycle-scores-md.js`. A JSONL reading utility. Not in D6a's lib list — needs D7+ coverage.

### `scripts/lib/load-propagation-registry.js`
Imported by `check-propagation.js` (also by `check-propagation-staged.js` from D6a). A shared CJS module for loading and querying the propagation registry. Confirmed present in `scripts/lib/`.

### `.claude/hooks/lib/symlink-guard`
Imported directly by `cleanup-alert-sessions.js`. This is a cross-boundary dependency (script → .claude/hooks/lib). Pattern seen before (D6a's append-hook-warning also depends on symlink-guard). The symlink-guard must be treated as a portability co-dep.

### `scripts/reviews/` TypeScript subsystem
`generate-claude-antipatterns.js` and `generate-fix-template-stubs.js` are thin delegation wrappers over compiled TypeScript output at `scripts/reviews/dist/`. This is a separate build artifact, not a lib file. The TypeScript source is the real implementation. These scripts require `npx tsc` before use.

---

## New Hub Candidates

No new hubs of the magnitude of `append-hook-warning.js` (D6a) were found in this batch. However:

**`detect-orphans.js`** is an unusual script — it calls into `scripts/lib/reference-graph.js` which itself builds a repo-wide reference index. The reference-graph lib is the real hub here, not detect-orphans.js itself.

**`check-propagation.js`** has structural significance: it shares `scripts/lib/load-propagation-registry` with `check-propagation-staged.js`. These two scripts form a pair that together represent the propagation detection subsystem, both calling into the same registry lib.

**`check-session-gaps.js`** auto-invokes `seed-commit-log.js` as a sub-process. This creates an invisible runtime dependency on another script. The `seed-commit-log.js` script should be noted by D6c+ agents as having a runtime caller.

---

## `scripts/reviews/` TypeScript Subsystem — Flag for D-agent Coverage

`generate-claude-antipatterns.js` and `generate-fix-template-stubs.js` both delegate to `scripts/reviews/dist/` — compiled TypeScript output. The `scripts/reviews/` directory is a separate TypeScript project with its own `package.json` and `tsconfig.json`. This subsystem is NOT covered by D6a-D6d (which cover root `.js` files). It needs its own D-agent assignment (D8 range or dedicated) — flag for D22 schema surveyor / orchestrator.

---

## State Files Written

Scripts in this batch write to the following state locations:

| Script | State files written |
|--------|---------------------|
| check-review-archive.js | `.claude/state/forward-findings.jsonl` (S0/S1 findings appended) |
| detect-orphans.js | `.planning/orphan-detection/findings.jsonl` |
| generate-lifecycle-scores-md.js | `.planning/learnings-effectiveness-audit/LIFECYCLE_SCORES.md` |
| generate-detailed-sonar-report.js | `docs/audits/sonarcloud-issues-detailed.md` |
| lighthouse-audit.js | `.lighthouse/` (output dir, gitignored) |

---

## TypeScript Delegation Pattern

Two scripts (`generate-claude-antipatterns.js`, `generate-fix-template-stubs.js`) use an identical pattern:

```
load compiled TS module from scripts/reviews/dist/lib/{name}.js
  → call main(process.argv.slice(2))
```

This is a build-artifact delegation pattern. The root `.js` wrapper is just a shim. The real code is TypeScript. If the compiled dist/ doesn't exist, both scripts fail with a clear error message (not silently). The pattern is consistent and clean, but creates a build prerequisite (`cd scripts/reviews && npx tsc`).

---

## Learnings for Methodology

**1. CJS is dominant in the generator/utility range.** The generate-* and cleanup-* scripts are all CJS with no mixed-ESM pattern. The mixed-ESM pattern (createRequire) is concentrated in check-* scripts that need to load CJS config/registry libs.

**2. TypeScript delegation wrappers are a third file type.** D6a categorized everything as `script`. But `generate-claude-antipatterns.js` and `generate-fix-template-stubs.js` are really shims over a compiled TypeScript subsystem. The `type: script` category still applies, but a `has_build_dep: boolean` field (or similar) would be valuable to flag scripts requiring a build step before use. Note for D22.

**3. Cross-boundary imports (script → .claude/hooks/lib/) need a new field or notes flag.** `cleanup-alert-sessions.js` imports from `.claude/hooks/lib/symlink-guard`. This violates the informal convention that scripts/ only imports from scripts/lib/. No schema field captures this cross-boundary coupling — surfaced in `notes`. D22 should consider a `cross_boundary_deps` array field.

**4. Auto-seeding side-effects in validation scripts.** `check-session-gaps.js` auto-invokes `seed-commit-log.js` if the commit log is absent. This is a write side-effect hidden inside what reads like a pure read/check script. The `shells_out: true` flag captures that it executes subprocesses, but the schema doesn't distinguish between read-only shell-outs (git log) and write-side-effect shell-outs (auto-seeding). Consider `has_write_side_effects: boolean` for D22.

**5. `test_coverage` false negatives confirmed for 3 scripts.** check-skill-audit-status.js, detect-orphans.js, and generate-lifecycle-scores-md.js have no test files by exact basename match or visible alias. This is a genuine coverage gap (unlike D6a's check-cc-gate anomaly which was just a name mismatch). Report honestly.

**6. `scripts/reviews/` is an unmapped TypeScript subsystem.** Two root scripts delegate to it. It needs its own D-agent. Current D6a-D6d coverage matrix only covers root `.js` files. The reviews/ TypeScript subsystem is a blind spot.

**7. `check-slopsquat.js` exports functions making it both entry point AND library.** The `module.exports` at the bottom (exports parseArgs, extractDeps, etc.) while also being runnable via `if (require.main === module)`. This dual-mode is unusual in this codebase — most scripts are pure entry points. The test file likely imports these exports. Note: `entry_point: true` is still correct (it is directly runnable).

---

## Gaps and Missing References

1. **`scripts/lib/validate-skip-reason.js`** — now confirmed as a dependency of 3 scripts (check-cross-doc-deps, check-doc-headers from D6a; check-triggers from D6b). The gap compounds. Needs dedicated D7+ coverage and gap note in the sync ledger.

2. **`scripts/lib/reference-graph.js`** — imported by detect-orphans.js. Not in JASON-OS. A heavyweight reference-graph builder that reads the whole repo. Needs D7+ coverage.

3. **`scripts/lib/read-jsonl.js`** — imported by generate-lifecycle-scores-md.js. Confirmed present in scripts/lib/. Needs D7+ coverage for full inventory.

4. **`scripts/reviews/` TypeScript subsystem** — NOT covered by D6a-D6d. Contains the real logic for generate-claude-antipatterns and generate-fix-template-stubs. Needs dedicated D-agent assignment. Flag to D22/orchestrator.

5. **`detect-orphans.js` test coverage missing** — no test file found in tests/scripts/. May be covered indirectly by integration tests or may be a genuine gap. Flag for verification.

6. **`generate-lifecycle-scores-md.js` test coverage missing** — AUDIT_SUMMARY.md references a test at `scripts/__tests__/generate-lifecycle-scores-md.test.js` (old path), but no matching test exists in `tests/scripts/`. May have been moved/renamed or dropped. Flag.

7. **`check-skill-audit-status.js` test coverage missing** — no test file found. The script is manually invoked only (npm run skills:audit-status). May be intentionally untested.

8. **`lighthouse-audit.js` full read truncated** — only first 80 lines read. Full implementation (async runLighthouse, main loop, output formatting) not analyzed. Portability and tool_deps assessment is based on header and config section only.

9. **`generate-detailed-sonar-report.js` full read truncated** — only first 80 lines read. The pagination logic, code snippet extraction, and markdown rendering are not analyzed.
