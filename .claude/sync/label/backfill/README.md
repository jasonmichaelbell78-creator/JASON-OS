# `backfill/` — Back-fill orchestrator + agent templates

Implements D7 + D8 + D9 + D10 — pure agent fleet, multi-agent cross-check,
checkpoint / preview / re-run.

**Built in:** S8 (Plan §S8).

## Planned contents

| File | Purpose |
| --- | --- |
| `orchestrate.js` | Scan → byte-weighted split → primary + secondary dispatch → cross-check → checkpoint → synthesis → preview gate → approve/reject |
| `agent-primary-template.md` | Prompt template for primary derivation agents |
| `agent-secondary-template.md` | Prompt template for independent secondary agents (cross-check) |
| `synthesis-agent-template.md` | Prompt template for findings-synthesis agent |

## Checkpoint + preview artifacts

- `.claude/state/label-backfill-checkpoint.jsonl` — resume-safe state
- `.claude/sync/label/preview/shared.jsonl` + `preview/local.jsonl` —
  preview catalog pending user approval (atomic rename on approve)

## Failure handling (D15)

Spawn fails, empty agent output (Windows 0-byte bug), batch timeouts, and
preview-rename failures all route through D15 paths — no silent skips.
