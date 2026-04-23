# `lib/` — Label derivation library

Pure functions used by hooks, back-fill, and the `/label-audit` skill. Single
source of truth for label-derivation logic.

**Built in:** S2 (Plan §S2). Schema v1.3 structural-fix overlay in
Phase C of `.planning/piece-3-labeling-mechanism/structural-fix/PLAN.md`.

## Modules

| Module | Purpose | Status |
| --- | --- | --- |
| `derive.js` | Cheap + understanding-field derivation entry points; `detectType()` + v1.3 `detectType` rules (D4.5 + D4.6 — test, git-hook, .husky/*, hook-lib .sh); `deriveName()` type-dependent canon (D4.1 — skill→dir slug, others→basename); frontmatter + body-text Lineage parsing; heuristic section / composite detection | v1.3 Phase C |
| `fingerprint.js` | SHA-256 fingerprint over normalized content (trim trailing whitespace, normalize line endings, keep comments) | Built S2 |
| `confidence.js` | Confidence scoring; emits `needs_review` when any field scores below threshold (default 0.80) | Built S2 |
| `catalog-io.js` | Atomic JSONL read/write (temp-file + rename); wraps `scripts/lib/safe-fs.js` | Built S2 |
| `agent-runner.js` | Spawns derivation agents with timeout; structured result or sanitized error | Built S2 |
| `sanitize.js` | Thin Piece-3 wrapper around `scripts/lib/sanitize-error.cjs` | Built S2 |
| `scope-matcher.js` | Tiny glob matcher for `scope.json` v2 negative-space `include: ["**/*"]` + explicit excludes (D1.1); handles dotfiles under `**/*` without minimatch | Built S2 |
| `validate-catalog.js` | Pre-commit validator — single-path v1.3 validation (D5.8 — `extendStatusEnum` fallback removed); enforces `needs_review`-empty + `status != partial` + `pending_agent_fill != true` + **D4.3 `.name` uniqueness** (duplicate names fail with both conflicting paths named in the error) | v1.3 Phase C |

## Security rules

- Path traversal: `/^\.\.(?:[\\/]|$)/.test(rel)`, never `startsWith('..')`.
- Every file read wrapped in try/catch.
- Every `exec(...)` loop regex carries `/g`.
- Never log raw `error.message` — always route through `sanitize.js`.
