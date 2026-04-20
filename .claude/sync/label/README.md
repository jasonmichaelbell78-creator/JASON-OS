# `.claude/sync/label/` — Piece 3 Labeling Mechanism

**Piece 3 root.** Tooling for deriving, validating, and maintaining per-file
labels across JASON-OS (and eventually SoNash via Piece 5.5).

**Scaffolded:** Session #10 (S0.2)
**Plan:** `.planning/piece-3-labeling-mechanism/PLAN.md`
**Decisions:** `.planning/piece-3-labeling-mechanism/DECISIONS.md` (D1–D19 +
D12a + D15a)
**Schema contract:** `.claude/sync/schema/SCHEMA.md` + `schema-v1.json` +
`enums.json` (Piece 2 output)

## Subdirectory map

| Dir | Purpose | Built in |
| --- | --- | --- |
| `lib/` | Derivation + IO + confidence + sanitize helpers | S2 |
| `hooks/` | PostToolUse + UserPromptSubmit + Notification hooks | S3–S5 |
| `skill/` | `/label-audit` skill assets | S7 (see note) |
| `backfill/` | Orchestrator + agent templates | S8 |
| `docs/` | `CATALOG_SHAPE.md`, `OVERRIDE_CONVERSATION_EXAMPLES.md`, `SONASH_HANDOFF.md` | S1, S9, S13 |

Top-level files added later:

| File | Purpose | Built in |
| --- | --- | --- |
| `scope.json` | In-scope file patterns used by the PostToolUse hook | S3 ✓ |
| `shared.jsonl` + `local.jsonl` | Primary catalog files (per D14) | S10 back-fill |
| `composites-shared.jsonl` + `composites-local.jsonl` | Composite catalogs (per D14) | S10 |
| `preview/` | Preview catalogs pending user approval (D9c gate) | S8 |

## Hook wiring (NOT YET LIVE)

`hooks/post-tool-use-label.js` lands in S3 as a fully-tested executable,
but **is not yet registered in `.claude/settings.json`**. Flipping the hook
live requires explicit user approval (per memory feedback on acknowledgment
and project-scoped config). The user will surface this at the appropriate
checkpoint; until then the hook is dormant code + unit tests only.

## Note on `skill/` vs `.claude/skills/label-audit/`

Plan §S0 tree lists `skill/` under this root; plan §S7 locates the invokable
skill at `.claude/skills/label-audit/`. The two paths likely have distinct
roles (reference material colocated with the mechanism vs. the user-invokable
skill definition). Reconciled at S7 — if `skill/` turns out redundant, it
gets removed with the S7 commit.

## Security contract (CLAUDE.md §2 + §5)

Every file under this tree that does I/O or handles errors MUST use
`scripts/lib/safe-fs.js` and `scripts/lib/sanitize-error.cjs`, follow the
path-traversal regex pattern, and carry the `/g` flag on any
repeated-match iteration regex.
