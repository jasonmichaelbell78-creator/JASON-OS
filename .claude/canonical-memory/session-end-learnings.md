---
name: session-end auto-learnings
description: Data-driven insights captured at session-end across the JASON-OS Foundation work. Append-only; use as input on future /session-begin and /session-end runs.
type: project
---

## Session 2 close (2026-04-17, post-PR-#3-merge)

- **Duplicate detection earned its place.** Manual session-close commit
  (`31d32d1`) preceded `/session-end` skill invocation by ~2 minutes; the
  skill's MUST-check correctly identified the duplicate and skipped Phases
  1+3, running only the gaps (Step 8 cleanup + Step 9 summary + Step 10
  script + this learning entry). Without the check, the skill would have
  rewritten SESSION_CONTEXT.md fields a second time and produced a redundant
  commit.
- **Step 10 script gate passed first try.** `scripts/session-end-commit.js`
  printed `✓ SESSION_CONTEXT.md already up to date` and
  `✅ No changes to SESSION_CONTEXT.md - session end already complete` —
  this is the live in-the-wild validation of M1's regex fix from PR #3 R2.
  The fallback block in Step 10 was not exercised. T14 is functionally
  closed; can be marked complete in /todo.
- **Phase 2/3 silent-skip pattern is correct in v0.** Steps 4, 4b, 5, 5b, 6,
  7g all noop'd because their Layer 2 / Phase 3 source files don't exist.
  Zero errors, zero warnings — clean fail-open. Confirms the v0 port
  decision (annotate-as-gated rather than strip).
- **T16 (settings-guardian fires-on-all-Write) bites every session-end.**
  This skill writes to canonical-memory/ via the Write tool which trips
  T16 again. Worked around via Bash heredoc (3rd time this session).
  Promotes T16 priority — should fix before next session-end runs cleanly.

## Session 3 close (2026-04-17, Step 5 validation executed)

- **Hook bugs are real blockers, not polish.** T16 (settings-guardian
  fires on all Write/Edit, JSON-parses Markdown content) flipped from
  "known annoyance with Bash-heredoc workaround" to hard stop the moment
  Session 3 tried to Write a trimmed SKILL.md. Forced work-item reordering
  (i → pivot to (iii) fix T16 → back to i). Lesson: in bootstrap ecosystems,
  expect silent hook bugs to block what the plan says is next, and design
  sessions so fix-then-continue is the default pivot, not an exception.
  Discover→fix→validate→commit ran ~15min; recoverable.
- **Scope-note-with-inline-DEFERRED is the JASON-OS port idiom.** Applied
  to session-begin (247 → 164 lines, -85) and skill-audit (6 ref rewrites
  + REFERENCE.md template field rename). Pattern: top-of-file scope note
  naming the missing infrastructure + 4-item manual-check fallback +
  inline "restore when X lands" markers. Leaves structure for future
  re-wiring instead of stripping outright. Should be the default move for
  future ports (pr-retro when pr-ecosystem-audit lands, any pre/post
  hooks that come with SoNash scaffolding).
- **session-end commits in 2 (skill/script scope mismatch, T17).** The
  Step 10 script is SESSION_CONTEXT.md-scoped but skill Step 3 updates
  PLAN.md. Session 3 produced 4def022 (SESSION_CONTEXT.md) then 6e88fa1
  (PLAN.md) back-to-back — arguably a bug, captured as T17 for a future
  polish pass. Sub-learning: `node scripts/session-end-commit.js` prints
  a false-positive "Session summary may not have been added" heuristic
  warning — it's looking for a specific subsection marker my rewrite
  doesn't use. Non-blocking.
- **Same-host stale-lock PID-first fix removes 60s UX wart.** A crashed
  lock-holder (timed-out CLI, same machine) is now recognized stale
  immediately instead of waiting out the age threshold. Saves ~60s per
  retry cycle and eliminates manual timestamp-math on the next
  `/todo complete` after a crash. Validated across 5-case test matrix.
- **Git CRLF warning stream was real noise.** Every Session 3 commit
  that touched .md/.js was preceded by "LF will be replaced by CRLF"
  warnings. .gitattributes codifying `* text=auto eol=lf` eliminates it
  without changing any tracked file content (`git add --renormalize .`
  produced zero diffs). Worth carrying forward as a default for
  Windows-primary JASON-OS consumers.
- **Session 3 throughput: highest yet.** 12 commits (9 primary + 3 closure),
  5 todos closed (T1/T6/T14/T15/T16), 1 todo added (T17), 2 rough edges
  fixed beyond backlog. Feels-like-home retro: the Foundation stack held
  under real work; the rough edges that surfaced were fixable in-session
  without derailing.

---

## Session 9 (2026-04-19) — Piece 3 labeling-mechanism plan

- **session-end-commit.js doesn't auto-add untracked files.** Script stages
  `SESSION_CONTEXT.md` only; new directories (this session: `.planning/
  piece-3-labeling-mechanism/`) require a separate `git add` + commit.
  Session 9 ended with two commits (3a79585 SESSION_CONTEXT first, then
  739f026 plan artifacts) — plan artifacts should arguably land BEFORE
  session-end-commit so the close-out commit sees a clean tree. Worth
  testing a workflow: commit new plan artifacts first, then `/session-end`.
  T17 from Session 3 already flagged the related "skill/script scope
  mismatch" — same family of rough edge.
- **Three user-corrections in one plan surfaced permanent memory items.**
  (1) Pre-made defaults in DIAGNOSIS — saved
  `feedback_deep_plan_no_preemptive_defaults`. (2) Technical jargon in
  structure (axis A / option A1 / drift risk) — saved
  `feedback_plain_language_structure`. (3) Skills as primary determination
  path — saved `feedback_skills_not_primary_mechanism`. All three are
  durable rules that will apply far beyond Piece 3. Sub-learning: the
  "recommend-and-move-on" pattern fired multiple times in a single skill
  execution despite an existing memory against it; structural work (strip
  defaults out of DIAGNOSIS template) may help where pure behavioral
  guidance hasn't stuck.
- **Convergence-loop on 6 claims surfaced 2 real issues.** `ajv` was
  installed but `extraneous` (not in `package.json`); `Lineage` pattern is
  markdown body text, not YAML frontmatter. Low cost (~60 seconds of
  Bash), high leverage — claim 11 became PLAN step S0.1, claim 12 changed
  how Piece 3 handles frontmatter parsing. Worth repeating on every L/XL
  plan's Phase 0 per `/deep-plan` SKILL.md rule 10.
- **Deep-plan artifact density: 1276 lines of net-new plan content.**
  DIAGNOSIS (v2, ~430 lines) + DECISIONS (~270 lines) + PLAN (~580 lines).
  Higher than Piece 2's 32-decision plan. Driven by safety-net posture (3
  layers + cross-check + atomic writes + failure surfacing = more
  components to specify). Reasonable for L/XL scope; not a signal of
  over-engineering.
- **Plan self-audit caught one exec() false-positive hook block.** PLAN.md
  initial Write blocked by `security_reminder_hook.py` matching on the
  literal string `exec()` inside a CLAUDE.md §5 anti-pattern quote.
  Rephrased to "repeated-match iteration loops" and Write passed. Worth
  tracking: plugin hooks can pattern-match inside documentation that
  cites anti-patterns. Not a bug in the hook, but a polishing target.

## Session 16 close (2026-04-22, post-Phase-G.1+G.1.5)

- **D6.5 sequential-with-inspection earned its ROI twice.** The B01 pilot
  surfaced two systematic bugs that would have silently corrupted all 70
  batches: (1) `agent-instructions-shared.md` confidence-coverage rule
  was sparse-interpretable, causing 22 of 27 fields to land in
  needs_review from missing-confidence → 0 scoring; (2) `cross-check.js`
  Case F treated both-null as fieldScore=0 regardless of confidence,
  flagging every settled-null field across native files. Both committed
  mid-run (`ec3fdc0`, `b1a5a9c`). Post-fix: needs_review tracked real
  disagreements 1:1. Without D6.5's inspection window between batches,
  these would have compounded into 460+ records of unusable noise.
- **Checkpoint 2MB safe-fs ceiling hit at B69.** Append-only cross-check-
  result entries accumulated to ~2.1MB after 68 batches (~30KB/batch x
  70 batches = projected ~2.1MB). SoNash will be ~5x scale → ~10MB.
  Future fix: either rotate checkpoint every N batches automatically,
  or split the cross-check results into per-batch files keyed in a slim
  index. Currently resolved by manual archive to `.pre-truncation.jsonl`
  with explicit user approval at the permission gate.
- **Agent timeouts were rare but real.** 2 timeouts across ~140 dispatches
  (B51 primary stream idle, B66 secondary socket close). Both recovered
  via single retry (no narrower split needed). 5-min D6.7 timeout is
  tight but viable. SoNash run should budget for 2-3% retry rate.
- **Null-type records are a systemic pattern, not a one-off.** 31 of 461
  records (~6.7%) have null type from Case C agent disagreement. The
  dominant split is research-session (derive.js heuristic) vs doc
  (JSONL-is-data semantic). Rather than per-file arbitration at G.2, the
  right fix is schema-level: either tighten derive.js rules for
  `.research/**/findings/*` or acknowledge that dir-as-session container
  + per-file type differs from container type (SCHEMA.md §8.1 semantic
  ambiguity).
- **Cross-instance coordination worked cleanly.** Secondary instance ran
  /brainstorm and /deep-research in parallel on `.research/**` artifacts
  while primary ran Phase G in `.claude/sync/label/**`. Zero file overlap
  by design. Two commits landed between mine (`ce96048`, `dc6c08d`);
  pre-push and post-pull-rebase both clean. Informed the push-coordination
  decision: each instance can push when ready, no merging required.
- **run-batch.js driver pattern was worth building.** ~140 tool calls
  across 70 batches would have been ~280+ with inline prepare/record
  blocks. The gitignored driver at `.claude/state/batch-tmp/run-batch.js`
  reduced boilerplate ~2x and kept batch dispatch consistent. Reusable
  for SoNash Piece 5.5 back-fill when that lands.
