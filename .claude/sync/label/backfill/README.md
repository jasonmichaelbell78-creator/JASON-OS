# `backfill/` — Back-fill orchestrator + agent templates

Implements D7 + D8 + D9 + D10 — pure agent fleet, multi-agent cross-check,
checkpoint / preview / re-run.

**Built in:** S8. Schema v1.3 structural-fix overlay in Phase B + Phase C
of `.planning/piece-3-labeling-mechanism/structural-fix/PLAN.md`.

## Contents

| File | Purpose | Status |
| --- | --- | --- |
| `orchestrate.js` | Scan → byte-weighted split → primary + secondary dispatch → cross-check → checkpoint → synthesis → preview gate → approve/reject | Built S8 |
| `prompts.js` | Template renderer with `{{INCLUDE:shared-partial}}` substitution + 5 runtime guards (`applyRuntimeGuards`) per D6.8 | v1.3 Phase C |
| `verify.js` | Schema + sanity + statistical verification harness; strip-before-validate REMOVED (D5.6) | v1.3 Phase C |
| `cross-check.js` | Field-by-field primary/secondary cross-check; emits `confidence: {field: 0..1}` preview object | Built S8 |
| `scan.js`, `batches.js`, `checkpoint.js`, `preview.js` | Scanner, byte-weighted batcher, checkpoint I/O, preview rename | Built S8 |
| `agent-primary-template.md` | Prompt for primary derivation agents; uses `{{INCLUDE:agent-instructions-shared.md}}` | Dedup'd Phase B |
| `agent-secondary-template.md` | Prompt for independent secondary agents (cross-check); same include pattern | Dedup'd Phase B |
| `agent-instructions-shared.md` | **NEW Phase B (D5.2)** — canonical v1.3 field-rules body shared by primary + secondary templates. Single source of truth for schema/field shapes. | v1.3 Phase B |
| `synthesis-agent-template.md` | Prompt for findings-synthesis agent | Built S8 |

## Checkpoint + preview artifacts

- `.claude/state/label-backfill-checkpoint.jsonl` — resume-safe state
- `.claude/sync/label/preview/s10-run-1-attempt/` — paused S10 run
  (gitignored; will be renamed + discarded in structural-fix Phase F.2)
- `.claude/sync/label/preview/shared.jsonl` + `preview/local.jsonl` —
  next preview catalog (produced by structural-fix Phase G re-run; atomic
  rename on approve)

## Failure handling (D15)

Spawn fails, empty agent output (Windows 0-byte bug), batch timeouts, and
preview-rename failures all route through D15 paths — no silent skips.
