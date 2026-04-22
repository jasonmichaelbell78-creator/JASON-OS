# `docs/` — Piece 3 documentation

Specs + operator guides written during Piece 3 execution. Schema v1.3
structural-fix overlay in Session #15.

## Contents

| File | Purpose | Status |
| --- | --- | --- |
| `CATALOG_SHAPE.md` | Records Piece 3 writes: 26 universal columns + per-type extensions (incl. v1.3 `git-hook` §9.11 + `test` §9.12) + Piece 3 additions (`status`, `pending_agent_fill`, `manual_override`, `needs_review`, `last_hook_fire`, `schema_version: "1.3"`) + optional top-level `confidence` (D2.2) + Piece 4 interface section | S1 + Phase B refresh (v0.3) |
| `OVERRIDE_CONVERSATION_EXAMPLES.md` | Conversational-override pattern (D12a) — recognition phrasings, Claude's action sequence, edge cases, audit trail | S9 |

## Staging artifact (produced in Phase H of structural fix)

| File | Purpose | Status |
| --- | --- | --- |
| `SONASH_MIRROR_DELTA.md` (in `.planning/piece-3-labeling-mechanism/structural-fix/`) | Cross-repo staging doc for Piece 5.5 mirror. Universal artifacts that cross (schema files, templates, library) + project-scoped ones that don't (scope.json, settings.json, .husky/pre-commit). | Produced in Phase H (commit 8) |

The earlier `SONASH_HANDOFF.md` name has been replaced by
`SONASH_MIRROR_DELTA.md` in the structural-fix plan. The staging artifact
lives under `.planning/`, not under `docs/`, because it's a
one-shot coordination document rather than a long-lived reference.
