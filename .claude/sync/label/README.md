# `.claude/sync/label/` — Piece 3 Labeling Mechanism

**Piece 3 root.** Tooling for deriving, validating, and maintaining per-file
labels across JASON-OS (and eventually SoNash via Piece 5.5).

**Scaffolded:** Session #10 (S0.2) — refreshed Session #15 for schema v1.3
structural fix.
**Plan (parent):** `.planning/piece-3-labeling-mechanism/PLAN.md`
**Plan (structural fix):** `.planning/piece-3-labeling-mechanism/structural-fix/PLAN.md`
**Decisions (parent):** `.planning/piece-3-labeling-mechanism/DECISIONS.md`
(D1–D19 + D12a + D15a)
**Decisions (structural fix):** `.planning/piece-3-labeling-mechanism/structural-fix/DECISIONS.md`
(D1.1–D8.7 — scope v2, schema v1.3, naming canon, templates, orchestration)
**Schema contract:** `.claude/sync/schema/SCHEMA.md` + `schema-v1.json`
(v1.3) + `enums.json` (Piece 2 output, auto-generated via
`.claude/sync/schema/build-enums.js`)

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

## Hook wiring (dormant delegators in place; activation at re-run promotion)

Three thin delegator files are committed under `.claude/hooks/`:

- `label-post-tool-use.js` → requires `hooks/post-tool-use-label.js`
- `label-user-prompt-submit.js` → requires `hooks/user-prompt-submit-label.js`
- `label-notification.js` → requires `hooks/notification-label.js`

The delegators exist because `run-node.sh` enforces HOOKS_DIR confinement.
They are NOT yet registered in `.claude/settings.json` — registration
happens atomically with the re-run catalog promotion (structural-fix
Phase G.3 / commit 7), so a live hook never reads a catalog that
does not yet exist. See structural-fix D7.1/D7.4.

## Note on `skill/` vs `.claude/skills/label-audit/`

Reconciled Session #15: the invokable skill + reference docs
(DERIVATION_RULES.md, DISAGREEMENT_RESOLUTION.md) all live at
`.claude/skills/label-audit/`. The `.claude/sync/label/skill/` directory
is empty — retained as a placeholder per Plan §S0 tree; may be removed
in a later cleanup commit.

## Security contract (CLAUDE.md §2 + §5)

Every file under this tree that does I/O or handles errors MUST use
`scripts/lib/safe-fs.js` and `scripts/lib/sanitize-error.cjs`, follow the
path-traversal regex pattern, and carry the `/g` flag on any
repeated-match iteration regex.
