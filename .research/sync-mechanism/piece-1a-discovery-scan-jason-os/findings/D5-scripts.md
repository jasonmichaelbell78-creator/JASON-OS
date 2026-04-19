# D5 Scripts Inventory — JASON-OS `scripts/`

**Agent:** D5  
**Date:** 2026-04-18  
**Scope:** `scripts/` and all subdirs (`scripts/config/`, `scripts/lib/`, `scripts/planning/`, `scripts/planning/lib/`)  
**Total files inventoried:** 13  
**Total bytes:** 92,517

---

## Directory Tree

```
scripts/
  session-end-commit.js          (9,571 bytes)   — CJS entry-point
  config/
    propagation-patterns.seed.json (1,097 bytes) — data config
  lib/
    sanitize-error.cjs           (4,484 bytes)   — CJS helper [CORE]
    sanitize-error.d.ts            (985 bytes)   — TS declarations
    security-helpers.js         (17,804 bytes)   — CJS helper [CORE]
    safe-fs.js                  (23,670 bytes)   — CJS helper [CORE]
    parse-jsonl-line.js          (2,600 bytes)   — CJS helper
    read-jsonl.js                (1,691 bytes)   — CJS helper
    todos-mutations.js          (13,056 bytes)   — CJS helper
  planning/
    package.json                   (351 bytes)   — ESM boundary marker
    render-todos.js              (5,393 bytes)   — ESM dual-mode script
    todos-cli.js                 (9,124 bytes)   — ESM entry-point
    lib/
      read-jsonl.js              (2,691 bytes)   — ESM helper
```

---

## Summary Table

| Filename | Subdir | Purpose | Portability | is_helper |
|---|---|---|---|---|
| session-end-commit.js | scripts/ | Session-end auto-commit and push for SESSION_CONTEXT.md | sanitize-then-portable | no |
| propagation-patterns.seed.json | scripts/config/ | Seed data for security anti-pattern detector (4 patterns) | portable | no |
| sanitize-error.cjs | scripts/lib/ | Canonical error sanitization — strips secrets/paths from log output | portable | yes |
| sanitize-error.d.ts | scripts/lib/ | TypeScript declarations for sanitize-error.cjs | portable | yes |
| security-helpers.js | scripts/lib/ | Comprehensive security utility library (path traversal, git ops, SSRF, PII masking) | portable | yes |
| safe-fs.js | scripts/lib/ | Symlink-guarded fs ops, atomic write, streaming JSONL reader, advisory locking | portable | yes |
| parse-jsonl-line.js | scripts/lib/ | Pattern-compliance helper for safe single-line JSON.parse | portable | yes |
| read-jsonl.js | scripts/lib/ | Simple whole-file JSONL reader (CJS, no streaming) | portable | yes |
| todos-mutations.js | scripts/lib/ | Pure CJS mutation ops for /todo JSONL — testable, no CLI side effects | portable | yes |
| package.json | scripts/planning/ | ESM boundary marker for planning/ subdirectory | portable | no |
| render-todos.js | scripts/planning/ | Generates TODOS.md from todos.jsonl; dual-mode (script + importable) | portable | no |
| todos-cli.js | scripts/planning/ | /todo mutation CLI with locking, integrity checks, atomic write | portable | no |
| read-jsonl.js | scripts/planning/lib/ | ESM streaming JSONL parser with comment support and error cap | portable | yes |

---

## Dependency Graph

```
session-end-commit.js
  └── scripts/lib/safe-fs.js
  └── scripts/log-override.js  [ABSENT — not found in tree]

security-helpers.js
  └── scripts/lib/sanitize-error.cjs
  └── .claude/hooks/lib/symlink-guard  [optional, cross-module]

safe-fs.js
  └── .claude/hooks/lib/symlink-guard  [optional, two fallback paths]

todos-mutations.js
  └── scripts/lib/sanitize-error.cjs

todos-cli.js  [ESM]
  └── scripts/lib/safe-fs.js
  └── scripts/lib/sanitize-error.cjs  [via createRequire]
  └── scripts/lib/todos-mutations.js  [via createRequire]
  └── scripts/planning/render-todos.js

render-todos.js  [ESM]
  └── scripts/lib/safe-fs.js
  └── scripts/planning/lib/read-jsonl.js

scripts/planning/lib/read-jsonl.js  [ESM]
  └── scripts/lib/safe-fs.js  [via createRequire]
  └── scripts/lib/sanitize-error.cjs  [via createRequire]

scripts/lib/read-jsonl.js  [CJS, standalone]
  (no internal deps)

parse-jsonl-line.js  [CJS, pure]
  (no deps)
```

---

## Notable Observations

**Missing file:** `scripts/log-override.js` is referenced by `session-end-commit.js` but does not exist in the directory. The call is inside a try/catch with `/* non-blocking */`, so it fails silently at runtime. This is either a planned future file, a file from SoNash not yet ported, or dead code from a removed feature.

**Duplicate name:** `read-jsonl.js` exists at two paths:
- `scripts/lib/read-jsonl.js` — CJS, whole-file, minimal hardening
- `scripts/planning/lib/read-jsonl.js` — ESM, streaming via safe-fs, sanitize-error-aware, comment-aware

The planning variant is strictly more capable. The lib variant appears to be a legacy predecessor that has not been retired.

**CJS/ESM split:** The `scripts/planning/` subtree is ESM (via its own `package.json` with `"type":"module"`). Everything else in `scripts/` is CJS. The planning scripts bridge between them using `createRequire`.

**safe-fs.js is a copy artifact:** The file's own docstring states it is "copied verbatim into `.claude/skills/*/scripts/lib/safe-fs.js` as a per-skill helper." The census will need to handle this duplication when inventorying skills/.

---

## Learnings for Methodology

### Agent sizing
13 files, ~92 KB total. All were read in 3 parallel batches. Right-sized for a single agent — no stalling. If SoNash has 98 top-level entries, a single agent would stall; batching by subdir or file-type is needed.

### File-type observations
The `.cjs` extension is load-bearing, not cosmetic — it forces CommonJS resolution even in a project that could otherwise default to ESM. The `.d.ts` file is a pure type artifact with no runtime behavior; the schema could flag it as `runtime: none`. Distinguishing `.js` (CJS-by-default) from `.js` (ESM-by-package.json) requires reading the nearest `package.json`, not just the file extension — the same `.js` extension has different semantics in `scripts/` vs `scripts/planning/`.

### Classification heuristics
`scope_hint` and `portability_hint` covered the scripts cleanly with one exception: `session-end-commit.js` is flagged `sanitize-then-portable` because it assumes the SESSION_CONTEXT.md convention — this is the right call, but the flag could be more specific (e.g., `portable-after-convention-removal`). The `is_helper` field cleanly separated library modules from entry-point scripts.

### Dependency extraction
`require()` and `import` statements were easy to extract by reading files. Cross-module dependencies (`.claude/hooks/lib/symlink-guard`) required recognizing the path string inside `require(path.join(...))` calls rather than a plain require literal — a static grep for `require(` would miss these. The mixed `createRequire` pattern in ESM files (todos-cli.js, planning/lib/read-jsonl.js) also requires reading the file body, not just import declarations.

External tool shelling: `session-end-commit.js` and `security-helpers.js` both shell out to `git` via `execFileSync`. These are the only files that invoke external processes.

### Schema-field candidates
Scripts have dimensions not fully captured by the current schema:
- **`module_system`**: `"cjs" | "esm" | "none"` — critical given the mixed environment
- **`entry_point`**: `true | false` — distinguishes scripts invoked directly from library-only modules
- **`shells_out`**: `true | false` — flags files that spawn subprocesses (relevant for security audit)
- **`test_coverage`**: flag if there are corresponding test files (todos-mutations.js was extracted specifically for testability)

### Adjustments recommended for SoNash scripts scan
SoNash has 98 top-level entries and 3,835 total files, many generated. Recommendations:

1. **Pre-filter generated files** before dispatching agents. Generated files (build artifacts, compiled output, node_modules) should be excluded via `.gitignore` intersection, not discovered by agents.
2. **Subdir-level agent batching** — one agent per major subdir cluster, not one per file type. SoNash likely has multiple functional clusters (hooks, scripts, lib, skills, etc.).
3. **Add `module_system` field** to the JSONL schema before the SoNash scan — the CJS/ESM distinction is architecturally significant and can't be inferred from extension alone.
4. **Flag duplicate-name files explicitly** — `read-jsonl.js` appearing at two paths with different behaviors is a schema gap. Add a `duplicate_name_warning` boolean or note in the `notes` field.
5. **Index cross-module refs** — the `.claude/hooks/lib/symlink-guard` dependency appears in both `security-helpers.js` and `safe-fs.js`. A dependency index would reveal how central that module is without re-reading files.
6. **Handle the copy-artifact pattern** — `safe-fs.js` documents that it is copied verbatim into skill subdirs. A `copy_source` or `canonical_location` field would prevent treating skill copies as distinct entries.
