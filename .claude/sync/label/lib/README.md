# `lib/` — Label derivation library

Pure functions used by hooks, back-fill, and the `/label-audit` skill. Single
source of truth for label-derivation logic.

**Built in:** S2 (Plan §S2).

## Modules (planned)

| Module | Purpose |
| --- | --- |
| `derive.js` | Cheap-field + understanding-field derivation entry points, type detection, frontmatter + body-text Lineage parsing, heuristic section / composite detection |
| `fingerprint.js` | SHA-256 fingerprint over normalized content (trim trailing whitespace, normalize line endings, keep comments) |
| `confidence.js` | Confidence scoring; emits `needs_review` when any field scores below threshold (default 0.80) |
| `catalog-io.js` | Atomic JSONL read/write (temp-file + rename); wraps `scripts/lib/safe-fs.js` |
| `agent-runner.js` | Spawns derivation agents with timeout; structured result or sanitized error |
| `sanitize.js` | Thin Piece-3 wrapper around `scripts/lib/sanitize-error.cjs` |
| `validate-catalog.js` | Pre-commit validator — loads `schema-v1.json` via ajv, enforces `needs_review`-empty + `status != partial` rules |

## Security rules

- Path traversal: `/^\.\.(?:[\\/]|$)/.test(rel)`, never `startsWith('..')`.
- Every file read wrapped in try/catch.
- Every `exec(...)` loop regex carries `/g`.
- Never log raw `error.message` — always route through `sanitize.js`.
