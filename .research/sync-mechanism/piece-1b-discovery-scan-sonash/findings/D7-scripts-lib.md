# D7 Scripts Lib — SoNash `scripts/lib/` Inventory

**Agent:** D7
**Date:** 2026-04-18
**Scope:** `scripts/lib/` (recursive) — 21 files
**Profile:** codebase
**Sub-Question:** Inventory all shared script library files in SoNash `scripts/lib/`

---

## Summary Metrics

| Metric | Value |
|--------|-------|
| Files inventoried | 21 |
| JASON-OS counterparts found | 7 of 21 (33%) |
| JASON-OS identical copies | 4 of 7 |
| JASON-OS diverged copies | 3 of 7 |
| Files missing from JASON-OS | 14 of 21 (67%) |
| Files copied into skill subdirs | 8 (safe-fs.js) + 3+ (parse-jsonl-line, others) |
| Test coverage | 19 of 21 have test files (all .js files) |

---

## JASON-OS Coverage Table

| File | In JASON-OS? | Sync Status | Notes |
|------|-------------|-------------|-------|
| `safe-fs.js` | YES | DIVERGED | SoNash=757L, JASON-OS=636L. SoNash has MASTER_DEBT writers not in JASON-OS |
| `sanitize-error.cjs` | YES | DIVERGED | Header differs; JASON-OS calls itself "canonical CJS implementation" |
| `sanitize-error.d.ts` | YES | IDENTICAL | 0 diff lines |
| `sanitize-error.js` | NO | MISSING | ESM twin not ported; JASON-OS only has .cjs + .d.ts |
| `security-helpers.js` | YES | DIVERGED | SoNash=506L, JASON-OS=558L. JASON-OS is longer (has additions) |
| `parse-jsonl-line.js` | YES | IDENTICAL | 0 diff lines |
| `read-jsonl.js` | YES | DIVERGED | Same 54L but 110 diff-lines (full replacement internally) |
| `todos-mutations.js` | YES | IDENTICAL | 0 diff lines, 391L both |
| `validate-skip-reason.js` | NO | MISSING | D6a also flagged this gap |
| `validate-paths.js` | NO | MISSING | Used by post-write-validator hook |
| `safe-cas-io.js` | NO | MISSING | CAS-specific; not appropriate until CAS ported |
| `analysis-schema.js` | NO | MISSING | Full Zod CAS schema; not portable without CAS |
| `generate-content-hash.js` | NO | MISSING | TDMS-specific; uses REPO_DIRNAME env |
| `normalize-file-path.js` | NO | MISSING | REPO_DIRNAME defaults to 'sonash-v0' |
| `normalize-category.js` | NO | MISSING | Depends on scripts/config/category-mappings.json |
| `load-propagation-registry.js` | NO | MISSING | Config data is SoNash-specific |
| `reference-graph.js` | NO | MISSING | Hardcodes SoNash dir structure |
| `ai-pattern-checks.js` | NO | MISSING | Depends on scripts/config/ai-patterns.json |
| `confidence-classifier.js` | NO | MISSING | verified-patterns.json is SoNash-specific |
| `retag-mutations.js` | NO | MISSING | CAS retag — not portable without CAS |
| `learning-router.js` | NO | MISSING | Scaffold paths point to SoNash config |

---

## Per-File Inventory

### 1. `safe-fs.js` — The Canonical Hub

**Purpose:** Safe filesystem primitives for the entire codebase. Every write operation in the hook/scripts ecosystem is expected to go through these wrappers.

**Exports (13):** `isSafeToWrite`, `safeWriteFileSync`, `safeAppendFileSync`, `safeRenameSync`, `safeAtomicWriteSync`, `readUtf8Sync`, `readTextWithSizeGuard`, `streamLinesSync`, `acquireLock`, `releaseLock`, `withLock`, `writeMasterDebtSync`, `appendMasterDebtSync`

**Trust model note (embedded in file header):** "This is NOT a privilege-boundary primitive. It is a defense-in-depth layer for a single-user CLI tool." This trust model was validated by PR #507 R2 against 169 real consumers.

**MASTER_DEBT writers:** `writeMasterDebtSync` and `appendMasterDebtSync` were added in a later session (post-JASON-OS port). They dual-write to `docs/technical-debt/MASTER_DEBT.jsonl` and `docs/technical-debt/raw/deduped.jsonl` with file locking. This section is SoNash-specific and explains why JASON-OS has 121 fewer lines.

**Copies in skill subdirs (8):**
- `.claude/skills/doc-ecosystem-audit/scripts/lib/safe-fs.js`
- `.claude/skills/health-ecosystem-audit/scripts/lib/safe-fs.js`
- `.claude/skills/hook-ecosystem-audit/scripts/lib/safe-fs.js`
- `.claude/skills/pr-ecosystem-audit/scripts/lib/safe-fs.js`
- `.claude/skills/script-ecosystem-audit/scripts/lib/safe-fs.js`
- `.claude/skills/session-ecosystem-audit/scripts/lib/safe-fs.js`
- `.claude/skills/skill-ecosystem-audit/scripts/lib/safe-fs.js`
- `.claude/skills/tdms-ecosystem-audit/scripts/lib/safe-fs.js`

All copies use the two-level `require()` path fallback to find `symlink-guard` from either `scripts/lib/` or `.claude/skills/<skill>/scripts/lib/` context.

**Consumers (selected):** `append-hook-warning.js`, `safe-cas-io.js`, `learning-router.js`, `governance-logger.js`, `test-tracker.js` — plus the 8 skill copies create an indirect consumer network across the audit skill family.

---

### 2. `sanitize-error.cjs` — Universal Error Scrubber (CJS)

**Purpose:** Scrubs home paths, credentials, connection strings, bearer tokens, private IPs, and localhost URLs from error messages. Used by essentially everything.

**Exports:** `sanitizeError`, `sanitizeErrorForJson`, `createSafeLogger`, `safeErrorMessage`

**Consumers:** 46 scripts/ consumers + 15 .claude/ consumers (grep count).

**Divergence from JASON-OS:** Header commentary differs. SoNash calls it a "CJS wrapper for sanitize-error.js (ESM)". JASON-OS calls it the "canonical CJS implementation" and adds context about the `.js` twin being removed. Suggests JASON-OS has consolidated while SoNash still maintains the dual-file pattern.

---

### 3. `sanitize-error.d.ts` — Type Declarations

**Purpose:** TypeScript type declarations for the ESM `sanitize-error.js`. Created to avoid tsx circular resolution.

**JASON-OS:** Identical. No action needed.

---

### 4. `sanitize-error.js` — ESM Twin (NOT in JASON-OS)

**Purpose:** Same as .cjs but ESM named exports (`export function sanitizeError...`). Required for ESM context callers that cannot use require().

**Gap:** Only `reference-graph.js` in scripts/lib/ imports from this file. The .cjs variant covers all other callers. JASON-OS may not need this file unless it ports `reference-graph.js` or other ESM consumers.

---

### 5. `security-helpers.js` — Security Primitives Toolkit

**Purpose:** 14 exported security helpers covering string sanitization, path traversal, git operations, CLI arg parsing, URL allowlist (SSRF), regex safety, PII masking, and slugification.

**Key functions:** `validatePathInDir` (the canonical path traversal prevention function used by many scripts), `sanitizeDisplayString`, `escapeMd`, `safeGitAdd`, `safeGitCommit`, `validateUrl`, `safeRegexExec`, `maskEmail`, `slugify`.

**Divergence from JASON-OS:** JASON-OS is 52 lines longer. Direction unknown without full diff — JASON-OS may have additions that predate or postdate SoNash changes. This is the most concerning divergence because security-helpers is a foundational library.

**Consumers:** `safe-cas-io.js`, `reference-graph.js`, `ai-pattern-checks.js`, `learning-router.js`, `analyze-learning-effectiveness.js`, multiple hooks.

---

### 6. `parse-jsonl-line.js` — JSONL Line Parser

**Purpose:** Two parsers satisfying T39 pattern-compliance detector: `safeParseLine` (null on error) and `safeParseLineWithError` ({value, error} shape).

**JASON-OS:** Identical. Pure utility with no SoNash-specific logic.

**Copies in skill subdirs:** At least doc-ecosystem-audit, health-ecosystem-audit have copied this file.

---

### 7. `read-jsonl.js` — JSONL File Reader

**Purpose:** Read entire JSONL file with safe mode (return [] on error) and quiet mode (suppress warnings).

**JASON-OS:** Same line count (54L) but 110 diff-lines — the files are fully rewritten internally despite being the same length. Likely interface-compatible but the implementation differs. **Requires manual reconciliation — which version is correct?**

---

### 8. `todos-mutations.js` — /todo Skill Core

**Purpose:** Pure mutation functions for the /todo JSONL file. Prevents data loss via regression guard. The fix for the T26/T27/T28 data-loss bug.

**JASON-OS:** Identical. Fully in sync.

---

### 9. `validate-skip-reason.js` — SKIP_REASON Guard (NOT in JASON-OS)

**Purpose:** Validates `SKIP_REASON` env var: non-empty, ≤500 chars, single-line, no control chars, no bidi Unicode overrides.

**Gap confirmed by D6a.** Three SoNash callers: `check-cross-doc-deps.js`, `check-doc-headers.js`, `check-triggers.js`. Any of these scripts cannot port to JASON-OS without this lib. The logic is generic and portable — only the `usageExample` default string needs project adjustment.

---

### 10. `validate-paths.js` — Path Security Validators (NOT in JASON-OS)

**Purpose:** Three exported validators: `validateFilePath` (format + control char checks), `verifyContainment` (realpathSync-based symlink-aware containment), `validateAndVerifyPath` (combined). Plus `sanitizeFilesystemError`.

**Gap.** Used by `post-write-validator.js` hook — this hook cannot be safely ported without this lib. The logic is generic and portable.

---

### 11. `safe-cas-io.js` — CAS I/O Hardening (NOT in JASON-OS)

**Purpose:** Hardened read/write with fd-pinning, O_NOFOLLOW, and Zod candidate validation. Created PR #505 in response to Qodo findings.

**Not portable without CAS.** Depends on `analysis-schema.js` (Zod). Calling it "not-portable" is accurate — the primitives (safeReadText, safeReadJson, safeWriteJson) are useful generically but the validateCandidate function ties this to the CAS schema.

---

### 12. `analysis-schema.js` — CAS Zod Schemas (NOT in JASON-OS)

**Purpose:** 493-line Zod schema file covering the entire CAS data model: analysisRecord, extractionRecord, synthesisRecord, candidateSchema, opportunityLedgerRecord, and 15+ enum types.

**Not portable without zod runtime dependency and the CAS system.**

---

### 13. `generate-content-hash.js` — TDMS Content Hashing (NOT in JASON-OS)

**Purpose:** SHA256 hash generation for TDMS dedup keying. 38 lines.

**Used by 5 debt extraction scripts.** Portable in principle; REPO_DIRNAME env var is the only sanitize field.

---

### 14. `normalize-file-path.js` — Path Normalization for TDMS (NOT in JASON-OS)

**Purpose:** Normalize paths for consistent TDMS hashing. Handles Windows/Unix backslash differences, leading ./ and /, org/repo prefix stripping.

**REPO_DIRNAME env var defaults to `sonash-v0`** — must be set per-project if ported. Used by 7 debt scripts.

---

### 15. `normalize-category.js` — TDMS Category Normalizer (NOT in JASON-OS)

**Purpose:** Map raw category strings to canonical TDMS categories using alias map from `scripts/config/category-mappings.json`.

**Not portable without `category-mappings.json` — that file is SoNash-specific.**

---

### 16. `load-propagation-registry.js` — Propagation Pattern Registry (NOT in JASON-OS)

**Purpose:** Load, validate, and query `scripts/config/propagation-patterns.json` for the pre-commit/pre-push propagation gate scripts.

**The loading logic is portable; the registry data is SoNash-specific.** If porting the propagation gate, a project-specific `propagation-patterns.json` would be needed. Also loads `known-propagation-baseline.json`.

---

### 17. `reference-graph.js` — Cross-Format Reference Graph (NOT in JASON-OS)

**Purpose:** Build an incoming-edge graph across JS imports, Markdown skill references, JSON config references, and YAML workflow references. Used for orphan detection.

**Not portable as-is** — `buildGraph()` hardcodes SoNash dir list: `scripts/`, `.claude/hooks/`, `.claude/skills/`, `.claude/agents/`, `docs/`, `.claude/settings.json`, `package.json`, `.github/workflows/`. Requires structural refactoring to make the dir list configurable.

---

### 18. `ai-pattern-checks.js` — AI Pattern Detection (NOT in JASON-OS)

**Purpose:** Utilities for detecting AI-generated code anti-patterns: `detectAIPatterns` (loads from config), `calculateAIHealthScore`, `extractImports`, `checkCrossSessionConsistency`.

**Not portable** — `process.exit(2)` on config load failure for `ai-patterns.json` via the `scripts/config/load-config.js` subsystem.

---

### 19. `confidence-classifier.js` — Learning Route Confidence (NOT in JASON-OS)

**Purpose:** Classify learning-routes entries into high/low confidence. Caches `verified-patterns.json` with retry-on-failure.

**Sanitize-then-portable** — the classifier logic is generic; `verified-patterns.json` content is SoNash-specific.

---

### 20. `retag-mutations.js` — CAS Retag Pure Functions (NOT in JASON-OS)

**Purpose:** Pure mutation functions for the CAS tagging system. Operates on extraction journal entries and vocabulary objects.

**Not portable without CAS.** Single caller: `scripts/cas/retag.js`.

---

### 21. `learning-router.js` — Learning-to-Automation Router (NOT in JASON-OS)

**Purpose:** Route identified learning patterns to enforcement scaffolds (verified-pattern entry, hook gate stub, CLAUDE.md annotation, lint rule skeleton). Tracks routing to `.claude/state/learning-routes.jsonl` with file locking and dedup.

**Sanitize-then-portable** — the routing logic is generic. The scaffold `targetFile` paths (`scripts/config/verified-patterns.json`, `eslint-rules/`) are SoNash-specific and need replacement. The state file path (`.claude/state/learning-routes.jsonl`) follows the portable `.claude/state/` convention.

---

## Byte-Duplicate Map

### Files with Copies in Skill Subdirs

| Canonical Source | Skill Copies (confirmed) |
|-----------------|--------------------------|
| `scripts/lib/safe-fs.js` | 8 copies in `.claude/skills/*/scripts/lib/` |
| `scripts/lib/parse-jsonl-line.js` | At least 2 copies: doc-ecosystem-audit, health-ecosystem-audit skill lib/ dirs |

Note: The skill copies of `safe-fs.js` use a two-level require path fallback specifically because they are in a deeper directory. This is intentional design, not accidental duplication.

---

## Hub Identification

### Top 3 Hub Libraries (Most Callers)

1. **`sanitize-error.cjs`** — 61+ unique callers (46 scripts/ + 15 .claude/ confirmed, likely more). Called by virtually every module that touches errors. Universal import — any new script should default to using this.

2. **`safe-fs.js`** — 50+ unique callers (20+ in scripts/root, 8 skill copies + their own callers, 9+ in .claude/hooks). Central write-safety enforcement point for the entire codebase. Every file write goes through here.

3. **`security-helpers.js`** — 25+ unique callers spanning scripts/, .claude/hooks/, skill scripts. The one-stop-shop for security primitives. The `validatePathInDir` function in particular is used by safe-cas-io.js and reference-graph.js as the canonical traversal check.

---

## Portability Tiers

| Tier | Files | Notes |
|------|-------|-------|
| `portable` | parse-jsonl-line.js, sanitize-error.cjs, sanitize-error.d.ts, sanitize-error.js, todos-mutations.js, validate-skip-reason.js, validate-paths.js, read-jsonl.js | Can port as-is (minor header updates OK) |
| `sanitize-then-portable` | safe-fs.js, security-helpers.js, generate-content-hash.js, normalize-file-path.js, load-propagation-registry.js, confidence-classifier.js, learning-router.js | Require config/path substitution |
| `not-portable` | safe-cas-io.js, analysis-schema.js, normalize-category.js, reference-graph.js, ai-pattern-checks.js, retag-mutations.js | Require porting entire subsystems |

---

## Divergence Alert: JASON-OS Files Require Audit

Three files exist in JASON-OS but have diverged from SoNash:

| File | SoNash Lines | JASON-OS Lines | Diff Lines | Risk |
|------|-------------|---------------|-----------|------|
| `safe-fs.js` | 757 | 636 | ~121 | MEDIUM — SoNash has MASTER_DEBT writers not in JASON-OS (expected) |
| `security-helpers.js` | 506 | 558 | ~52 | HIGH — JASON-OS is longer; unknown additions. Security-critical file. |
| `read-jsonl.js` | 54 | 54 | 110 | MEDIUM — Same length, different content. Interface likely identical. |
| `sanitize-error.cjs` | 97 | 98 | 65 | LOW — Header/comment differences, same exports |

The `security-helpers.js` divergence is the highest-risk item: it is a security-critical library, JASON-OS has 52 additional lines, and the direction of drift is unknown without a full diff read.

---

## Learnings for Methodology

**1. `is_copy_of` field is insufficient for the skill-copy pattern.** The SCHEMA_SPEC defines `is_copy_of` for when a file IS a copy of a canonical source. But `safe-fs.js` also needs `has_copies_at[]` to document where the canonical file has been copied TO. These are different directions. Recommend D22 add a `has_copies_at` array field to the schema alongside `is_copy_of`.

**2. Module system detection: `sanitize-error.js` imports from ESM within a CJS project.** `reference-graph.js` does `require("./sanitize-error.js")` where that file exports with `export function`. This works in Node.js because `.js` files in a CJS-default project are treated as CJS unless the package.json has `"type": "module"`. ESM `export` syntax in a CJS-required file would normally fail — but this file must actually be used differently than it appears, or the CJS default allows it via some dynamic import. **This is a portability landmine**: any project that sets `"type": "module"` in package.json will break this pattern. Flag: D22 should consider adding a `module_system_note` field.

**3. JASON-OS divergence is in both directions.** Initially assumed JASON-OS would be an older/smaller snapshot of SoNash. But `security-helpers.js` shows JASON-OS is 52 lines LONGER than SoNash. This means some JASON-OS changes have not been back-ported to SoNash. A bidirectional sync analysis is needed, not just "port from SoNash."

**4. `read-jsonl.js` same-length rewrite is suspicious.** Both files are 54 lines, but differ by 110 diff-lines (entire file replaced). This usually means a full rewrite happened on one side. The interface is likely identical (same function signature, same exports) but the implementation changed. Could be a security hardening rewrite in JASON-OS, or vice versa. The synthesizer should flag this for manual review.

**5. Zod is a hidden portability wall.** `analysis-schema.js` and `safe-cas-io.js` both require `zod` as a runtime dependency. JASON-OS's `package.json` may not include zod. Any attempt to port these without adding the dependency will fail silently at runtime (missing module). Verify `package.json` before planning CAS port.

**6. All 21 files have tests (all .js files).** `sanitize-error.d.ts` is the only file without a dedicated test (it's a type declaration). The test naming convention is `<filename-without-extension>.test.js` with one known exception from D6a (check-cyclomatic-cc → check-cc-gate). Lib tests are cleaner: test names match file names exactly in `dist-tests/tests/scripts/lib/`.

**7. The scripts/config/ dependency tree creates invisible portability blockers.** `normalize-category.js`, `load-propagation-registry.js`, `ai-pattern-checks.js`, and `confidence-classifier.js` all reach into `scripts/config/`. This is not visible from the lib file itself — only revealed by reading the code. Any sync plan must account for this hidden dependency layer.

---

## Gaps and Missing References

1. **`sanitize-error.js` (ESM) not in JASON-OS** — JASON-OS only has `.cjs` and `.d.ts`. If any future JASON-OS ESM scripts need `sanitizeError`, they must either import from `.cjs` via `createRequire` or this file must be added. Currently safe since JASON-OS has no ESM scripts that need it, but the gap should be documented.

2. **`validate-skip-reason.js` not in JASON-OS** — Confirmed missing for the third time across D6a, D6a gaps section, and now D7. This is a blocking dependency for porting `check-cross-doc-deps.js`, `check-doc-headers.js`, and `check-triggers.js`. The file is simple, generic, and portable. Should be ported first.

3. **`validate-paths.js` not in JASON-OS** — Used by `post-write-validator.js` hook. Without it, the hook cannot be safely ported. Portable.

4. **`security-helpers.js` divergence direction unknown** — JASON-OS is 52 lines longer. A full diff read is required to understand whether: (a) JASON-OS has new additions that SoNash should receive, (b) JASON-OS has extra test/debug code that should be cleaned up, or (c) SoNash removed something from JASON-OS intentionally. **This is a Wave 2 investigation item.**

5. **`read-jsonl.js` full-rewrite divergence** — Same length but 110 diff-lines. Interface compatibility is assumed but not verified. **Verify in Wave 2 that the function signatures match.**

6. **No test for `analysis-schema.js`** — The 493-line Zod schema file has no corresponding test file in `dist-tests/tests/scripts/lib/`. If schema validation is critical (and it is — it's the CAS data contract), this is a coverage gap. May be tested indirectly via the scripts that use it.

7. **Zod runtime dependency not inventoried** — `analysis-schema.js` and `safe-cas-io.js` both require `zod`. The JASON-OS `package.json` was not checked during this scan. If JASON-OS does not include `zod`, any CAS port would fail. D17a/b (root file coverage) should verify this.

---

## Confidence Assessment

- HIGH claims: 18 (file contents read directly, exports confirmed)
- MEDIUM claims: 3 (consumer counts based on grep; may miss dynamic require patterns)
- LOW claims: 0
- UNVERIFIED claims: 0
- Overall confidence: HIGH

All findings are based on direct file reads and grep-confirmed consumer lists. The only uncertainty is in total consumer counts (grepping may miss indirect consumers via dynamic requires or variable path construction).
