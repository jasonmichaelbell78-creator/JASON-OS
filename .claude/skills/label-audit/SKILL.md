---
name: label-audit
description: >-
  Audit + refresh the JASON-OS / SoNash label catalogs. Dispatches primary +
  secondary derivation agents in byte-weighted batches, cross-checks their
  output, and presents drift / low-confidence / disagreement findings for
  conversational resolution (D12a). Supplementary skill per D4 + D19 —
  catalogs remain correct via the PostToolUse hook (§S3) + pre-commit
  validator (§S6) even if this skill is never invoked.
compatibility: agentskills-v1
metadata:
  version: 0.2
  short-description: Audit + refresh label catalogs
---

<!-- prettier-ignore-start -->
**Document Version:** 0.2
**Last Updated:** 2026-04-20 (Session #10)
**Status:** ACTIVE (scaffolded in Piece 3 S7; real agent fleet wiring lands in §S8)
**Lineage:** native — JASON-OS Piece 3
<!-- prettier-ignore-end -->

# `/label-audit` — Catalog Audit & Refresh

Consolidated skill covering drift detection, section re-analysis, composite
detection, and disagreement resolution across the label catalogs
(`shared.jsonl`, `local.jsonl`, `composites-shared.jsonl`,
`composites-local.jsonl`).

## Purpose & Scope

The PostToolUse hook (`.claude/sync/label/hooks/post-tool-use-label.js`)
keeps the catalogs approximately-correct incrementally — one file at a time,
on each Edit/Write. The pre-commit validator (§S6) catches anything that
slipped through at commit time. `/label-audit` is the **batch refresh**
skill: it re-derives records in parallel, cross-checks via independent
agents, and surfaces findings for user arbitration.

Per **D4 + D19**: this skill is **supplementary, never primary**. If the
skill is never invoked, the catalog stays correct via the hook + pre-commit
layers. Skill absence never breaks label-system correctness — only
postpones drift detection until a commit trips the validator.

## Invocation — flag form AND conversational

Both work. Flags are just the machine-readable sugar; Claude parses
natural-language requests into the same scope set.

### Flag form

```
/label-audit                    # all in-scope files in both catalogs
/label-audit --recent           # files edited in last N days (default 7)
/label-audit --path=<glob>      # scoped audit (glob passed to scope matcher)
/label-audit --stub-only        # records with status == "stub"
/label-audit --pending-only     # records with pending_agent_fill == true
/label-audit --composites       # composite detection pass only
/label-audit --sections         # section re-detection pass only
/label-audit --days=<N>         # override the --recent window
/label-audit --dry-run          # produce findings + preview, do NOT promote
```

Flags are combinable: `/label-audit --recent --path=".claude/hooks/**/*.js"`.

### Conversational form

Claude MUST recognize these phrasings as `/label-audit` invocations and
parse them into the equivalent flag set:

| User says | Flags derived |
| --- | --- |
| "audit the labels" / "refresh the catalogs" | `/label-audit` (full pass) |
| "audit recent changes" / "check what I edited this week" | `--recent` |
| "check the hooks for drift" / "audit the hooks" | `--path=.claude/hooks/**/*` (path derived from the named area) |
| "check skills edited in the last 3 days" | `--recent --days=3 --path=.claude/skills/**/*` |
| "are there any stubs lingering?" / "audit stubs" | `--stub-only` |
| "what's pending agent fill?" / "check pending" | `--pending-only` |
| "find new composites" / "look for composite candidates" | `--composites` |
| "re-check sections in CLAUDE.md" | `--sections --path=CLAUDE.md` |
| "preview the audit without promoting" | `--dry-run` |

**Disambiguation rule:** if the user's request is ambiguous — e.g., "audit
the scripts" could mean `scripts/**/*` or just the `script` type — ask
ONE clarifying question before dispatching agents. Never assume when an
agent fleet spin-up is at stake.

**Mid-flow course-correction:** the user can redirect at any phase:

- During Phase 1 (scope) → "actually just the hooks" → reset and re-scope
- During Phase 2 (batch preview) → "16 agents is too many, cap it at 4"
  → repack with tighter TARGET_KB_PER_AGENT
- During Phase 5 (synthesis) → "skip the composite findings for now" →
  defer composite arbitration to a follow-up invocation
- During Phase 6 (arbitration) → "change my mind, auto-derive type on
  derive.js again" → remove `type` from that record's `manual_override`

Treat the skill as an interactive partner, not a CLI. The flag form is
a precision fallback for when you want to bypass the dialogue.

## When to Use

- **After a large refactor** that touched 20+ files — incremental hook
  updates are correct per-file, but cross-file signals (new composites,
  section splits) need a batch pass.
- **Before a release / mirror sync** — catch lingering `needs_review`
  items, validate that pre-commit wasn't bypassed.
- **When a DEFERRED hook wiring just landed** — back-fill a cohort of
  records that accumulated between hook-dormancy and wiring.
- **On explicit user request** — quality audit, second-opinion pass.

## When NOT to Use

- **Mid-edit** — let the PostToolUse hook handle incremental derivation
  first; run this when you reach a natural checkpoint.
- **Pre-commit error triage for a single file** — direct conversational
  override (D12a) is faster than re-dispatching the agent fleet.
- **Infrastructure hasn't landed yet** — if the hooks aren't wired
  (current Piece 3 MVP state), this skill still works but has no
  incremental deltas to compare against — every file looks new.

## Behavior (when invoked)

### Phase 1 — Scope & inventory

1. Parse flags + resolve the target file set.
2. For `--recent`, default N=7 days via
   `git log --since="<N> days ago" --name-only --pretty=format:`.
3. For `--stub-only` / `--pending-only`, read catalogs and filter by field.
4. Print the target count + estimated batch split.

### Phase 2 — Byte-weighted batching

Apply the Piece 1a discovery-scan pattern (see
`reference/BYTE_WEIGHTED_SPLITS.md`):

- Target per batch: **~120–150 KB of file content**.
- Files **>50 KB count as 2 units** against the target.
- Small files pack tightly; large files get their own batch when necessary.
- Produce the batch manifest with total agent count.

**If the scan looks undersized** (per `feedback_no_research_caps` + T22
learnings): surface the count pass — "N target files, split into M
batches, dispatching 2×M agents (primary + secondary)". Confirm with the
user that the allocation is right before dispatch.

### Phase 3 — Dispatch primary + secondary (D8 cross-check)

For each batch, spawn two independent agents:

- **Primary** (`reference/DERIVATION_RULES.md`) — derives full records
  from scratch; never sees prior agent output, never sees the existing
  catalog entry. Independent derivation is the whole point of D8.
- **Secondary** — same rules, same input, different agent instance. Does
  NOT see the primary's output.

Both agents return structured JSON per `CATALOG_SHAPE.md` §3.

### Phase 4 — Cross-check + disagreement resolution (D12)

For each file, compare primary vs. secondary field-by-field per
`reference/DISAGREEMENT_RESOLUTION.md`:

- Agreement on field → high confidence, value committed into the preview.
- Disagreement on field → `needs_review` grows by that field name; preview
  stores both candidates + agent reasoning for user arbitration.
- Missing-from-one / different-type → counts as disagreement.

### Phase 5 — Synthesis agent

A third synthesis agent groups findings by severity and presents them to
the user in a single conversational summary:

```
/label-audit summary (37 files, 8 batches, 16 agents)
  ✓ 33 records clean, no drift
  ⚠ 3 records with needs_review (type field on 2; composite_id on 1)
  ⚠ 1 new composite candidate: skill-audit-workflow (6 files)
  ✗ 0 records unreachable
```

### Phase 6 — Conversational resolution (D12a)

For each `needs_review` item the user arbitrates conversationally:

> User: "type on .claude/sync/label/lib/derive.js should be script-lib, not script"

Claude's response sequence (per `.claude/sync/label/docs/OVERRIDE_CONVERSATION_EXAMPLES.md`):

1. Read the current catalog record.
2. Update the specified field.
3. Append the field name to `manual_override` (idempotent — dedupe).
4. Remove the field from `needs_review`.
5. Update `last_hook_fire` to the current UTC timestamp.
6. Append an audit row to `.claude/state/label-override-audit.jsonl`.
7. Atomic write back via `catalog-io.js`.

### Phase 7 — Writeback + preview-to-real (D9c)

Like the back-fill orchestrator (§S8), `/label-audit` writes its resolved
output to `.claude/sync/label/preview/` first. On user approval, the
preview atomically promotes into the real catalog via `catalog-io.js`.

### Phase 8 — Self-audit (MUST)

Before declaring done, verify the run produced what it promised. Each
item is a hard check — any failure blocks closure and surfaces via D15.

**Coverage checks:**

- [ ] **Every targeted file has an outcome.** The scoped target set
      (Phase 1) equals the set of files that appear in the synthesis
      summary. Missing files = silent drop = hard fail.
- [ ] **No silent skips.** Every file is either `clean` / `needs_review` /
      `unreachable` (D15-surfaced). There is no fourth state.
- [ ] **Byte-weighted split within bounds.** Every batch's total weight
      is ≥ 50 KB and ≤ 200 KB (outside the 120-150 target is fine; 0-byte
      or huge-single-batch is not).

**Invariant checks:**

- [ ] **No `status: partial` in the preview.** `partial` is a transient
      hook state; audit output must resolve to `active` / `stub` / etc.
- [ ] **`manual_override` + `needs_review` are disjoint.** A field cannot
      be both user-overridden AND flagged for review.
- [ ] **Every arbitrated field has an audit-trail entry.**
      `.claude/state/label-override-audit.jsonl` grew by exactly the
      number of fields the user resolved in Phase 6.
- [ ] **Agent independence preserved.** No agent's output references
      another agent's output. (Verified by inspecting agent prompts +
      the absence of cross-agent context in the input envelopes.)

**Empty-output detection** (Windows 0-byte bug, per
`feedback_agent_output_files_empty`):

- [ ] **Zero agents returned a 0-byte output file.** Any that did were
      retried once via task-notification result; persistent empties got
      filed as `unreachable`.

**Promotion checks** (if not `--dry-run`):

- [ ] **Preview → real was atomic.** `catalog-io.safeRenameSync`
      succeeded; no partial catalog state on disk.
- [ ] **Real catalog passes `validate-catalog.js`.** Run the validator
      against the promoted catalog; non-zero exit blocks closure.

**Ledger check:**

- [ ] **The agent-runner pending queue (`.claude/state/label-pending-
      failures.jsonl`) has no NEW entries** from this run. Audit-skill
      agents run inline (via the Task tool), not via the hook's detached
      subprocess path — they should not touch the pending queue.

Self-audit output format (append to the Phase 5 synthesis summary):

```
Self-audit
  ✓ coverage: 37/37 files accounted for
  ✓ invariants: status clean, overrides disjoint, trail complete (2 rows)
  ✓ empty-output: 0 retries needed
  ✓ promotion: atomic rename succeeded, validator clean
  ✓ pending queue: no new entries
  VERDICT: PASS
```

Any `✗` → VERDICT: FAIL → surface via D15, do NOT promote, present the
failure list to the user with decision options (retry / rollback / defer
the failing files).

## Arguments reference

| Flag | Default | Effect |
| --- | --- | --- |
| (none) | — | Every in-scope file in both catalogs. |
| `--recent` | 7 days | Files edited in the last N days (git log). |
| `--path=<glob>` | — | Glob passed to `scope-matcher.loadScope().matches()`. |
| `--stub-only` | — | Records with `status == "stub"`. |
| `--pending-only` | — | Records with `pending_agent_fill == true`. |
| `--composites` | — | Composite detection pass only (skips section + per-file re-derivation). |
| `--sections` | — | Section re-detection only (for mixed-scope files per SCHEMA.md §4). |
| `--days=<N>` | 7 | Override the `--recent` window. |
| `--dry-run` | false | Produce findings + preview, do NOT promote. |

## Inputs

- Existing catalogs: `.claude/sync/label/{shared,local,composites-*}.jsonl`
- Scope config: `.claude/sync/label/scope.json`
- Schema: `.claude/sync/schema/schema-v1.json` + `enums.json`
- Helpers: `.claude/sync/label/lib/*` (derive, catalog-io, agent-runner,
  scope-matcher, confidence, sanitize)

## Outputs

- Preview catalogs (pending approval): `.claude/sync/label/preview/*.jsonl`
- Audit trail: `.claude/state/label-override-audit.jsonl`
- On-screen summary (Phase 5 synthesis)

## Failure Modes (D15)

All three D15 paths apply:

- **Agent spawn fail** → exit non-zero from the dispatching hook context
  with sanitized stderr; Claude must surface before proceeding.
- **Empty agent output (Windows 0-byte bug)** → retry once via
  task-notification result; on second empty, flag as a failure.
- **Preview-to-real rename fail** → preview stays on disk; surface via D15
  path 1; user can re-attempt promotion.

No silent skips — every targeted file either has a finding or is explicitly
confirmed clean.

## Anti-Patterns

- **Running with a stale catalog** — re-run back-fill (§S8) first if the
  last back-fill is more than a release cycle old.
- **Skipping Phase 7 on intent-to-commit** — the preview promotion is the
  whole point; never promote silently.
- **Guessing the per-category line count** — per T22 learnings, internal
  codebase scans need an actual count pass before agent sizing.

## Reference Material

- [`DERIVATION_RULES.md`](./reference/DERIVATION_RULES.md) — how primary +
  secondary agents should derive each field.
- [`DISAGREEMENT_RESOLUTION.md`](./reference/DISAGREEMENT_RESOLUTION.md) —
  how cross-check conflicts route to `needs_review` vs. auto-accept.
- [`BYTE_WEIGHTED_SPLITS.md`](./reference/BYTE_WEIGHTED_SPLITS.md) — Piece
  1a-derived batching heuristic.

## Integration

- **Upstream:** PostToolUse hook (§S3) writes incremental records; this
  skill audits that stream.
- **Downstream:** pre-commit validator (§S6) catches any
  `needs_review`-non-empty record this skill produced + left unresolved.
- **Sibling:** back-fill orchestrator (§S8) is the bulk-population
  counterpart — use it for *population*; use this skill for *refresh*.

## Version History

| Version | Date | Description |
| --- | --- | --- |
| 0.1 | 2026-04-20 | Initial scaffold — invocation patterns, phases, reference-file layout. Agent-fleet wiring lives in the back-fill orchestrator (§S8); this skill will import from there once §S8 lands. |
| 0.2 | 2026-04-20 | Added conversational-invocation recognition table + mid-flow course-correction contract. Added Phase 8 self-audit (MUST) with coverage / invariant / empty-output / promotion / ledger checks + PASS/FAIL verdict shape. |
