# PLAN — Piece 3 Structural Fix + Scope Expansion + Re-run + Mirror Prep

**Session started:** 13 (2026-04-21)
**Parent plan:** `.planning/piece-3-labeling-mechanism/PLAN.md`
**Pickup:** `.planning/piece-3-labeling-mechanism/S10_HANDOFF.md`
**Diagnosis:** `./DIAGNOSIS.md`
**Decisions (canonical):** `./DECISIONS.md`
**Effort estimate:** XL — ~6–8 hours of focused work plus ~90 min back-fill re-run
**Commit boundaries:** 8 logical-group commits per D8.1

---

## Execution overview

Nine phases grouped into 8 commits. Phases A–E prepare the fixed foundation.
Phase F cleans up stale state. Phase G runs the 429-file re-run and the
promotion gate. Phase H patches downstream artifacts and stages the SoNash
mirror. Phase I closes with a full-scope audit.

Per D8.1 commit boundaries:

1. **Commit 1 — Schema foundation** (Phase A)
2. **Commit 2 — Templates + doc-shape reconciliation** (Phase B)
3. **Commit 3 — derive.js + validation tooling** (Phase C)
4. **Commit 4 — scope.json + hooks + settings** (Phase D)
5. **Commit 5 — READMEs + override docs** (Phase E)
6. **Commit 6 — `.validate-test.cjs` rename** (Phase F.1 standalone per D8.1)
7. **Commit 7 — Re-run preview promotion** (Phase G.3)
8. **Commit 8 — PLAN patches + SONASH_MIRROR_DELTA** (Phase H)

Audit checkpoints at phase boundaries (A, C, D, G.promote, I).

---

## Phase A — Schema v1.3 foundation (commit 1)

### Step A.1 — Update `schema-v1.json` per Batch 2 + 3 decisions

**File:** `.claude/sync/schema/schema-v1.json`
**Decisions:** D2.1, D2.2, D2.3, D2.4, D2.5, D2.6, D3.1, D3.2, D3.3, D3.4, D3.5

Changes:

- `enum_type`: append `"git-hook"`, `"test"` (D3.1)
- Add new `enum_git_hook_event`:
  ```json
  "enum_git_hook_event": {
    "type": "string",
    "enum": ["applypatch-msg", "pre-applypatch", "post-applypatch",
             "commit-msg", "pre-commit", "pre-merge-commit", "pre-rebase",
             "post-commit", "post-checkout", "post-merge", "pre-push",
             "pre-receive", "update", "post-receive", "post-update",
             "push-to-checkout", "pre-auto-gc", "post-rewrite"]
  }
  ```
- Add `confidence` as optional top-level on `file_record` + `composite_record`:
  ```json
  "confidence": {
    "type": "object",
    "additionalProperties": { "type": "number", "minimum": 0, "maximum": 1 }
  }
  ```
  (D2.2)
- `allOf` branches: split §9.3 into two:
  - `type: hook` → requires the 7 fields (unchanged)
  - `type: hook-lib` → requires none of them (D2.5)
- `allOf` branch: `type: git-hook` → requires `git_hook_event: enum_git_hook_event` (D3.3)
- `lineage_object`: unchanged (already matches D2.1)
- `content_hash`: unchanged (stays `{"type": "string"}`, D2.4)
- `additionalProperties: false` preserved throughout (D2.6)
- Description field: bump "v1.2" → "v1.3"; note "additive; v1.2 records validate under v1.3" (D3.7)

**Depends on:** —
**Done when:**
- ajv compiles schema-v1.json with no errors
- `node .claude/sync/schema/validate.test.cjs` passes (after rename Step F.1, but a pre-rename dry run works)

### Step A.2 — Auto-generate `enums.json` (new build script) per D3.5

**Files:** `.claude/sync/schema/enums.json` (output), `.claude/sync/schema/build-enums.js` (new)

Write `build-enums.js`:

- Reads `schema-v1.json`
- Walks `definitions` for keys starting with `enum_`
- Emits `enums.json` with shape `{ enum_type: [...], enum_scope: [...], ... }`
- Executable via `node .claude/sync/schema/build-enums.js`

**Depends on:** Step A.1
**Done when:**
- `build-enums.js` runs without error
- Newly-generated `enums.json` contains the 2 new type values + git_hook_event enum
- `git diff enums.json` shows only expected additions

### Step A.3 — EVOLUTION.md v1.3 entry per D3.6

**File:** `.claude/sync/schema/EVOLUTION.md`

Append entry in existing v1.0/v1.1/v1.2 pattern. Sections:

- Version, date, drivers
- Additive changes list (6 items: confidence, git-hook type, test type, git_hook_event, §9.3 split, build-enums script)
- Backward-compat posture (D3.7 gradual)
- SoNash mirror obligation (points at `SONASH_MIRROR_DELTA.md` when Step H.4 produces it)
- Migration notes (v1.2 → v1.3: stamp-only bump; no data migration needed)

**Depends on:** Step A.1
**Done when:** EVOLUTION.md opens cleanly and the entry visibly matches v1.2 entry structure

### Step A.4 — Update EXAMPLES.md for v1.3 shapes

**File:** `.claude/sync/schema/EXAMPLES.md`

Update any example blocks using v1.2 shapes to v1.3:

- Lineage examples use `{source_project, source_path, source_version, ported_date}` (D2.1)
- External-dep examples use object form (D2.3)
- Add one `type: git-hook` worked example
- Add one `type: test` worked example
- Add one `type: hook-lib` with no event (D2.5)
- Add one record with `confidence` object (D2.2)

**Done when:** every example validates against the updated `schema-v1.json`

### Step A.5 — Update SCHEMA.md for new types + lineage doc bug

**File:** `.claude/sync/schema/SCHEMA.md`

- §8.1: add `git-hook`, `test` to type enum documentation
- §9: add new §9.11 `git-hook` (references `enum_git_hook_event`), §9.12 `test` (minimal extension)
- §9.3: rewrite to distinguish `hook` (7 fields required) from `hook-lib` (no extras required)
- §3: fix the "§4 for lineage" pointer that actually points at Section Records (S10_LEARNINGS B02)
- Add new section (§4 or §5 renumbered) specifically for Lineage Records
- Add §8.4a note: `status: generated` pairs with `portability: not-portable` OR `portability: portable-with-deps` (D3.2)

**Depends on:** Step A.1
**Done when:** SCHEMA.md renders cleanly; all §-references resolve to real sections

### Step A.6 — Audit checkpoint 1 (Phase A)

Run validate against corpus:

- `node .claude/sync/schema/validate.test.cjs` (after A.1 via Step F.1 rename — or dry-run from current path)
- Validate all 5 EXAMPLES.md blocks against schema
- Eyeball SCHEMA.md cross-references

**Done when:** validator green; EXAMPLES green; no §-pointer bugs surface

---

## Phase B — Templates + doc-shape reconciliation (commit 2)

### Step B.1 — Create `agent-instructions-shared.md` per D5.2

**File (new):** `.claude/sync/label/backfill/agent-instructions-shared.md`

Extract from primary + secondary templates the 6 schema/field sections:

- Identity (§3.1) including the naming canon from D4.1
- Dependencies (§3.3) with the object form per D2.3
- Provenance (§3.4) with the `{source_project, source_path, source_version, ported_date}` shape per D2.1
- Sync mechanics + catch-all + relationships (§3.5–§3.7)
- Per-type extensions with updated §9.3 split (hook vs hook-lib) per D2.5 and new §9.11 git-hook
- Confidence reporting — now an explicit top-level object per D2.2

Include the v1.3 cheat-sheet JSON block per D5.5 (~40 lines covering lineage, confidence, external_deps, hook vs hook-lib, type=git-hook, type=test).

**Done when:** primary + secondary templates can reference this file and the dispatch wrapper concatenates it cleanly.

### Step B.2 — Update `agent-primary-template.md` per D5.1

**File:** `.claude/sync/label/backfill/agent-primary-template.md`

- Role preamble (independence invariant for primary) stays inline
- Replace the 6 inline schema/field-rule sections with a `{{INCLUDE:agent-instructions-shared.md}}` marker
- Dispatch wrapper (`prompts.js`, updated in Step C.x) will substitute the marker at spawn time
- Keep batch-files section + hard-constraints section inline (not shared)

**Depends on:** Step B.1
**Done when:** template reads cleanly top-to-bottom; `{{INCLUDE}}` marker present in exactly one place

### Step B.3 — Update `agent-secondary-template.md` per D5.1

**File:** `.claude/sync/label/backfill/agent-secondary-template.md`

Same treatment as Step B.2 but secondary role preamble (cross-check purpose) stays inline.

**Done when:** secondary template parallels primary structurally

### Step B.4 — Update `synthesis-agent-template.md`

**File:** `.claude/sync/label/backfill/synthesis-agent-template.md`

Reconcile any shape references to v1.3. The current synthesis template is
mostly about report structure (agreement rate, disagreement list, coverage
gaps) — minimal schema-shape drift. Audit and patch only where drift exists.

**Done when:** any schema-shape language matches v1.3

### Step B.5 — Update `CATALOG_SHAPE.md` per D5.3

**File:** `.claude/sync/label/docs/CATALOG_SHAPE.md`

- §4.6: bump `schema_version` stamp reference from `"1.2"` to `"1.3"`
- §3: add `git-hook` and `test` to per-type extension list (point at SCHEMA.md §9.11 / §9.12)
- §9: add version history entry 0.3 — 2026-04-21 — "Schema v1.3 + structural fix"

**Done when:** CATALOG_SHAPE.md internal references stay consistent with SCHEMA.md

### Step B.6 — Full audit: `DERIVATION_RULES.md` + `DISAGREEMENT_RESOLUTION.md` per D5.4

**Files:**
- `.claude/skills/label-audit/reference/DERIVATION_RULES.md`
- `.claude/skills/label-audit/reference/DISAGREEMENT_RESOLUTION.md`

Read top-to-bottom. Reconcile each rule against Batch 2–4 decisions:

- Naming rule references → align with D4.1
- Type-detection rules → align with D4.5, D4.6 (test, git-hook)
- Dependency resolution → align with D4.4
- Lineage handling → align with D2.1
- Confidence semantics → align with D2.2
- External-dep shapes → align with D2.3

**Done when:** both docs read as coherent references against schema v1.3 and derive.js (post Step C.1)

---

## Phase C — derive.js + validation tooling (commit 3)

### Step C.1 — Extend `derive.js` per Category 4 decisions

**File:** `.claude/sync/label/lib/derive.js`

- Add 5 new rules to `detectType()` per D4.5 (husky + .sh + .validate-test.cjs). Ordering: most-specific first.
- Add test-detection rule per D4.6 (regex match on both `**/__tests__/**` and suffix form).
- Update `.name` emission to match naming canon D4.1 — type-dependent rule:
  - `skill` → directory slug (`.claude/skills/<slug>/SKILL.md` → `<slug>`)
  - others → basename without ext
- Extend `__tests__/smoke.test.js` cases: test detection, git-hook detection, hook-lib under `.claude/hooks/lib/**`, naming canon for skill, naming canon for non-skill

**Done when:** all tests green; `node -e "require('./derive.js').detectType('.husky/pre-commit')"` returns `"git-hook"`

### Step C.2 — Rename `.validate-test.cjs` → `validate.test.cjs` per D4.7 (commit 6 per D8.1)

**File:** `.claude/sync/schema/.validate-test.cjs` → `validate.test.cjs`

Use `git mv` to preserve history. Update any invocation references:

- package.json scripts (if any point at it)
- CI workflows (grep for `.validate-test`)
- SCHEMA.md / EVOLUTION.md references

**Note:** per D8.1 this gets its own commit (6) for traceability.

**Done when:** `node .claude/sync/schema/validate.test.cjs` passes; no broken references

### Step C.3 — Update `verify.js` per D5.6

**File:** `.claude/sync/label/backfill/verify.js`

- Remove the `confidence`-strip block (`delete record.confidence` or equivalent)
- Point schema path at v1.3 (same filename; version just changed internally)
- Update SANITY-layer checks that assumed v1.2-only shapes

**Done when:** `verify.js` validates a known-good v1.3 agent output (including `confidence` object) without stripping

### Step C.4 — Update `cross-check.js` per D5.7

**File:** `.claude/sync/label/backfill/cross-check.js`

Parallel to Step C.3 — remove any strip-before-validate code.

**Done when:** cross-check validates v1.3 agent output directly

### Step C.5 — Update `validate-catalog.js` per D5.8 + D4.3

**File:** `.claude/sync/label/lib/validate-catalog.js`

- Single-path validation against v1.3 (remove any v1.1 `extendStatusEnum` fallback code that's now dead)
- **Add name-uniqueness enforcement:** build an index `{name → path}` at read time; on collision, emit error `Duplicate .name "X" between <path1> and <path2>` and exit non-zero
- `schema_version` is informational — log records stamped non-v1.3 but don't fail

**Done when:**
- Two-record test corpus with duplicate names fails validation with the exact error shape
- Two-record corpus with unique names + one v1.2 stamp + one v1.3 stamp passes

### Step C.6 — Integrate `build-enums.js` into pre-commit (anchored to Step A.2 + D3.5)

Verify that running `.husky/pre-commit` regenerates `enums.json` if `schema-v1.json` changed. Either:

- Add a shell step in `.husky/pre-commit`: `node .claude/sync/schema/build-enums.js` + `git diff --exit-code enums.json` (failing if drift), OR
- Make `build-enums.js` idempotent and re-run it; if output differs from on-disk, fail with "run build-enums; commit the result"

Pick the less-intrusive option after reading `.husky/pre-commit` current structure.

**Done when:** editing `schema-v1.json` without regenerating `enums.json` blocks commit

### Step C.7 — Codify runtime guards in `prompts.js` per D6.8

**File:** `.claude/sync/label/backfill/prompts.js`

Move the 6 S10 mid-run dispatch fixes into permanent dispatch logic. Schema-shape rules (D2.1–D2.3, D3.1–D3.3) live in `agent-instructions-shared.md` (Step B.1). Runtime guards that require filesystem or per-record awareness live here:

- **Exists-check before `hard` dep:** before an agent-output record emits a dep with `hardness: "hard"`, the dispatcher (or a post-agent pass) verifies the referenced file exists on disk. If not, downgrade to `hardness: "soft"` and append to `notes`: `"dep <name> not found at <expected path>; downgraded hard→soft on dispatch"`.
- **`content_hash` omit-if-unknown:** if the agent-runner cannot compute `content_hash` at dispatch time, the emitted record must OMIT the field entirely (per D2.4) — never emit `null`. Dispatcher enforces this before passing to verify.js.
- **Schema-ref-by-version:** prompts.js references `schema-v1.json` v1.3 shapes explicitly so re-runs don't inherit a stale in-code shape.
- **No-`portability: generated` guard** — if an agent emits this (legacy behavior), dispatcher rewrites to `portability: not-portable` + logs to `needs_review` for human disambiguation (D3.2 pairs `status: generated` with a valid portability value).
- **Git-hook event disambiguation** — if an agent emits `type: git-hook` but leaves `event` populated (legacy path), dispatcher rewrites to use `git_hook_event` per D3.3.

Update `__tests__/prompts.test.js` with cases for each guard.

**Depends on:** Step C.1 (derive.js), Step C.5 (validate-catalog name uniqueness — dispatcher may share the index build)
**Done when:**
- 5 unit-test cases green (one per guard)
- Manual spot-check: feed a known-bad agent output (dangling hard dep, content_hash null, portability:generated) through dispatcher → output is schema-clean

### Step C.8 — Audit checkpoint 2 (Phase C)

- All tests green (derive, validate-catalog, verify, cross-check, rename smoke, build-enums, **prompts runtime guards**)
- `code-reviewer` or `Plan`-style review (Agent tool) of Phase C diffs
- Manual spot-check: validate 5 records of varied types against schema, both ends (verify.js + validate-catalog.js)

**Done when:** review passes; no residual strip-before-validate code anywhere; all runtime guards armed

---

## Phase D — scope.json + hooks + settings (commit 4)

### Step D.1 — Rewrite `scope.json` per D1.1–D1.7

**File:** `.claude/sync/label/scope.json`

New shape:

```json
{
  "version": 2,
  "philosophy": "committable-is-in-scope",
  "description": "See .planning/piece-3-labeling-mechanism/structural-fix/DECISIONS.md §Category 1 for the canonical rule.",
  "include": ["**/*"],
  "exclude": [
    "**/node_modules/**",
    ".git/**",
    ".claude/state/**",
    ".claude/hooks/.session-agents.json",
    ".claude/sync/label/*.jsonl",
    ".claude/sync/label/preview/**",
    ".claude/sync/schema/*.jsonl"
  ],
  "comments": {
    "rule": "If a file is committable to git, it is in scope. Generated files get status: generated.",
    "excludes": "Only gitignored-like + session-state paths. .research/ and **/__tests__/** are explicitly in-scope now (structural fix D1.2, D1.3)."
  }
}
```

**Depends on:** —
**Done when:** `scope.json` parses as JSON; version=2; philosophy field present

### Step D.2 — Verify / update `scope-matcher.js` for negative-space + dotfiles

**File:** `.claude/sync/label/lib/scope-matcher.js`

Read the current implementation. Verify:

- `**/*` pattern matches dotfiles (`.github/**`, `.husky/**`). Likely requires `minimatch({dot: true})`.
- Exclude patterns override includes (current behavior, preserve)
- If matcher can't handle dotfile includes under `**/*`, patch it or change scope.json include to `["**/*", "**/.*"]`

**Depends on:** Step D.1
**Done when:** `node -e "const m = require('./scope-matcher.js'); console.log(m.isInScope('.github/CODEOWNERS'))"` returns `true`; returns `false` for `.git/HEAD` and `.claude/state/foo.json`

### Step D.3 — Wire 3 label hooks in `.claude/settings.json` per D7.1–D7.4

**File:** `.claude/settings.json`

Add under `hooks.PostToolUse`:

```jsonc
{
  "matcher": "^(Edit|Write|MultiEdit)$",
  "hooks": [
    { "type": "command",
      "command": "bash .claude/hooks/run-node.sh ../sync/label/hooks/post-tool-use-label.js",
      "continueOnError": true,
      "statusMessage": "Updating label catalog..." }
  ]
}
```

Add similar entries under `hooks.UserPromptSubmit` for `user-prompt-submit-label.js` and `hooks.Notification` for `notification-label.js`. Command paths adjusted per actual hook script locations (may need to be `.claude/sync/label/hooks/...` absolute or an entrypoint script in `.claude/hooks/` that delegates).

**Decision to make in-flight:** Claude hook scripts must live under `.claude/hooks/` typically — if the runner can't reach `.claude/sync/label/hooks/*.js` directly, create thin delegator files under `.claude/hooks/` that `require()` the sync/label ones. Ask user when executing if the runner setup isn't obvious from reading `run-node.sh`.

**Depends on:** re-run promotion (Step G.3) — so this wiring only lands when the catalog is clean.
**Done when:** settings.json parses; a test Edit on an in-scope file triggers the hook (logs to `.claude/state/hook-warnings-log.jsonl` or similar)

### Step D.4 — Activate pre-commit catalog validator per D7.5 (BLOCKING)

**File:** `.husky/pre-commit`

Add (after gitleaks block):

```sh
# Catalog validation (Piece 3 structural fix, D7.5 — blocking)
node .claude/sync/label/lib/validate-catalog.js || {
  echo "Catalog validation failed. Fix invalid records or unresolved needs_review before committing." >&2
  exit 1
}
```

Respect the existing `SKIP_CHECKS` + `SKIP_REASON` pattern already in `_shared.sh` (Rule 14 of CLAUDE.md forbids autonomous `SKIP_REASON` setting — the validator itself doesn't set it).

**Depends on:** catalog exists (Step G.3 promotion)
**Done when:** a commit with an invalid record is blocked; a commit with all-green records proceeds

### Step D.5 — Audit checkpoint 3 (Phase D)

- `scope.json` parses
- scope-matcher test passes on dotfile + exclusion corpus
- settings.json parses; hooks wired correctly (only verifiable post re-run promotion — defer to Step I.1)
- pre-commit runs validate-catalog (smoke test with a known-good and known-bad record)

**Done when:** scope infra verified in isolation; hook + pre-commit verified after re-run promotion

---

## Phase E — Documentation sync (commit 5)

### Step E.1 — Full audit of 7 orphan READMEs per D8.7

**Files (each audited top-to-bottom):**

1. `.claude/sync/label/README.md`
2. `.claude/sync/label/backfill/README.md`
3. `.claude/sync/label/docs/README.md`
4. `.claude/sync/label/hooks/README.md`
5. `.claude/sync/label/lib/README.md`
6. `.claude/sync/label/skill/README.md`
7. `.claude/sync/label/docs/OVERRIDE_CONVERSATION_EXAMPLES.md`

For each:

- Schema-shape language → v1.3
- Naming references → D4.1 canon
- `scope.json` references → D1.x (if any)
- Hook wiring references → D7.x (if any)
- Cross-refs to SCHEMA.md / CATALOG_SHAPE.md → verify still correct

**Done when:** each file reads as a coherent reference against the v1.3 / negative-space state

---

## Phase F — Pre-run cleanup (commit 6 covers F.1; F.2/F.3 are pre-work to Phase G)

### Step F.1 — Rename `.validate-test.cjs` → `validate.test.cjs` (already covered in Step C.2)

Committed standalone per D8.1 (commit 6).

### Step F.2 — Rename existing preview + state to `s10-run-1-attempt/` per D6.2

- `mv .claude/sync/label/preview/shared.jsonl .claude/sync/label/preview/s10-run-1-attempt/shared.jsonl`
- `mv .claude/sync/label/preview/local.jsonl .claude/sync/label/preview/s10-run-1-attempt/local.jsonl`
- `mv .claude/state/s10-results/ .claude/state/s10-run-1-attempt/s10-results/`
- `mv .claude/state/s10-prompts/ .claude/state/s10-run-1-attempt/s10-prompts/`

All these are gitignored, so no commit. Just file-system moves before Phase G dispatches.

**Done when:** `ls .claude/sync/label/preview/` shows only the `s10-run-1-attempt/` directory (no top-level shared/local); state dirs renamed similarly.

---

## Phase G — Full re-run + promotion gate

### Step G.1 — Run full back-fill per D6.1, D6.4, D6.5, D6.6, D6.7, D6.8

Claude-driven invocation (per PLAN §S10 existing flow):

- Scan scope → ~429 files (verify count)
- Byte-weighted batching at 50KB target → expect ~45 batches
- **Sequential execution** — one batch at a time (D6.5)
- For each batch: spawn primary agent + secondary agent (same prompt, shared instructions via `agent-instructions-shared.md` per D5.2); 5-min per-agent timeout with auto-retry-narrower on timeout (D6.7); cross-check; write per-batch output to `.claude/state/s10-results/B<NN>/{primary,secondary,crosschecked}.json`; checkpoint after each batch
- Dispatch wrapper (`prompts.js`) handles runtime guards: verify-dep-exists-before-hard, omit content_hash if unknown (D6.8)
- Between batches: operator (Claude) inspects cross-check output; if systematic drift observed, patches prompts.js or `agent-instructions-shared.md` and re-dispatches FROM the current batch (not the start) — this is the mid-run-correction window sequential execution enables

Target: ~90 min wall-clock for 45 sequential batches at ~2 min each.

**Depends on:** Phase A–E complete, Step F.2 done
**Done when:** all batches returned; verify.js passes on consolidated preview; cross-check agreement rate reported

### Step G.2 — Promotion gate (D6.3 + Category 14 / Session 17 revision)

The original D6.3 gate ran `verify.js` first and three steps total. After
the D6.5 mid-run patches normalized null-emission for low-confidence
fields, that ordering became impossible to clear: 100% of post-G.1
records carry `needs_review` entries by design, and `validate-catalog`
rule 2 rejects any non-empty `needs_review`. Category 14 (D14.1–D14.4)
documents the architectural pivot: synthesis is an arbitration stage,
not a summary-only step, and `verify.js` runs AFTER user decisions are
applied to records, not before. Seven sub-steps now sit between G.1 and
G.3.

#### G.2.1 — Synthesis agent runs over G.1 output

Spawn one synthesis agent against the consolidated cross-check output
per `synthesis-agent-template.md`. The agent emits two artifacts in one
response: a markdown report (agreement rate, auto-merge proposals,
open arbitration questions, coverage gaps, novel composites) and a
fenced JSON block tagged `arbitration-proposal` carrying the same
content in machine-readable shape. The markdown report is what the
user reads; the JSON proposal is what becomes the input to the next
sub-step.

**Done when:** synthesis report reads cleanly in plain English (per the
JASON-OS conversational-explanatory tenet) and the JSON proposal block
parses.

#### G.2.2 — User arbitrates conversationally

Present the markdown report. The user replies in three parts:

- **Auto-merges** — approve the batch, or call out specific overrides.
- **Open arbitration questions** — answer in bulk per field where the
  same convention applies across many records (e.g., "for type
  conflicts on `.research/.../findings/*.md`, use `research-session`")
  or per record where the call is record-specific.
- **Coverage gaps** — for each, choose: assign a value, defer (with the
  consequence that subsequent commits touching that record will be
  blocked by `validate-catalog` rule 2 until resolved), or trigger a
  narrower agent re-run with sharpened prompts.

**Done when:** every auto-merge, question, and gap from the synthesis
proposal has an explicit user response.

#### G.2.3 — Assemble final arbitration package

Translate the user's replies into the runtime arbitration package shape
(see `synthesis-agent-template.md` Part 3 — final package shape). Each
user decision becomes a `decisions[]` entry; coverage gaps the user
explicitly defers go into `unresolved_coverage_gaps[]`. Save the
package to `.claude/state/g2-arbitration.<UTC-timestamp>.json` for
audit trail (gitignored).

**Done when:** the saved JSON file parses and counts match what was
promised to the user in step G.2.2.

#### G.2.4 — Apply arbitration to preview

```sh
node .claude/sync/label/backfill/apply-arbitration.js \
  .claude/state/g2-arbitration.<timestamp>.json
```

Rewrites both preview jsonls in place: clears named `needs_review`
entries, sets resolved values, stamps `confidence[field]` per
decision. Prints a JSON summary — surface it to the user.

**Done when:** CLI exits 0 (or exits 1 with `errors[]` that the user
explicitly accepts as expected — e.g., a path renamed between G.1 and
G.2). Records named in `unresolved_coverage_gaps[]` are intentionally
left with their `needs_review` entries intact.

#### G.2.5 — verify.js hard-gate (now reachable)

```sh
node .claude/sync/label/backfill/verify.js .claude/sync/label/preview/shared.jsonl
node .claude/sync/label/backfill/verify.js .claude/sync/label/preview/local.jsonl
```

Both must exit 0. If either fails:

- If the failure points only at records named in
  `unresolved_coverage_gaps[]`, surface and confirm the user accepts
  the post-promotion commit-block consequence per D14.3. If accepted,
  proceed; if not, route back to G.2.2.
- If the failure points at records the user thought were resolved,
  abort per D7.6 and diagnose conversationally — applyArbitration may
  have hit an edge case the test corpus didn't cover.

**Done when:** both verify runs exit 0, OR remaining failures are an
explicitly-accepted subset confined to deferred coverage gaps.

#### G.2.6 — `/label-audit` dogfood on preview

Invoke the audit skill against `.claude/sync/label/preview/{shared,local}.jsonl`.
Any drift, low-confidence, or disagreement finding aborts per D7.6 and
routes back to conversational resolution.

**Done when:** audit reports clean, OR the user explicitly accepts the
flagged findings (rare).

#### G.2.7 — Final user approval

Present a one-page summary: verify counts, audit summary, arbitration
package size, list of deferred coverage gaps with their
post-promotion consequence. The user types final approval. Then
proceed to Step G.3.

**Done when:** explicit user approval is captured.

**Depends on:** Step G.1
**Audit trail:** the arbitration package JSON lives in `.claude/state/`
(gitignored), and the synthesis markdown report is included verbatim
in the Step G.3 promotion commit body so future sessions can
reconstruct the decisions without the gitignored state file.

### Step G.3 — Atomic promote (commit 7)

Rename `.claude/sync/label/preview/shared.jsonl` → `.claude/sync/label/shared.jsonl`; same for `local.jsonl`. Composite catalogs similarly. Remove `.claude/sync/label/preview/*` after (keep `s10-run-1-attempt/` untouched).

Commit: "Piece 3 / S10: promote re-run catalog (429 files, schema v1.3)".

**Depends on:** Step G.2
**Done when:**
- Catalogs at canonical paths
- `git ls-files .claude/sync/label/*.jsonl` returns the 2 (or 4 including composites) files
- validate-catalog.js green against the promoted catalogs
- Hook wiring (Step D.3) + pre-commit validator (Step D.4) activate on this commit

---

## Phase H — PLAN patches + staging artifact (commit 8)

### Step H.1 — Patch `.planning/piece-3-labeling-mechanism/PLAN.md` §S11 per D8.2

Expand audit scope to cover all files changed in Phases A–E + the re-run output itself. Note the new scope (429 files) affects the per-file `code-reviewer` strategy.

**Done when:** §S11 references the structural fix + re-run + the new scope count

### Step H.2 — Patch PLAN.md §S12 per D8.2 + D8.3

- Fixture list updated for v1.3 shapes (external_dep objects, lineage, confidence, name canon) per D8.3
- Test matrix T1–T9 checked: any test that depended on v1.2 shape OR 169-file scope needs updating
- Expand test coverage to include new rules (type: git-hook, type: test, hook-lib without event, naming collision fallback)

**Done when:** §S12 fixture list + test matrix compile against v1.3

### Step H.3 — Patch PLAN.md §S13 per D8.2 + cross-reference to `SONASH_MIRROR_DELTA.md`

- §S13 mirror artifact list updated per D8.5 (universal artifacts only)
- Add pointer: "The authoritative mirror delta for the structural fix lives at `.planning/piece-3-labeling-mechanism/structural-fix/SONASH_MIRROR_DELTA.md` (D8.6)"
- Note that Piece 5.5 session consumes that delta and performs the cross-repo write (D8.4)

**Done when:** §S13 delegates to the staging artifact + points at the Piece 5.5 execution window

### Step H.4 — Produce `SONASH_MIRROR_DELTA.md` per D8.5 + D8.6

**File (new):** `.planning/piece-3-labeling-mechanism/structural-fix/SONASH_MIRROR_DELTA.md`

Sections:

- **§1 Purpose** — staging doc for Piece 5.5 cross-repo mirror
- **§2 Artifacts that cross** (per D8.5):
  - Schema: schema-v1.json, enums.json, SCHEMA.md, EVOLUTION.md, EXAMPLES.md
  - Templates: agent-primary-template.md, agent-secondary-template.md, synthesis-agent-template.md, agent-instructions-shared.md
  - Label docs: CATALOG_SHAPE.md
  - Audit skill reference: DERIVATION_RULES.md, DISAGREEMENT_RESOLUTION.md
  - Label lib: derive.js, validate-catalog.js, fingerprint.js (if shape-relevant), sanitize.js (if shape-relevant)
  - Backfill: verify.js, cross-check.js
  - Schema tools: build-enums.js
- **§3 Artifacts that do NOT cross** (per D8.5):
  - scope.json (project-scoped — SoNash maintains its own committable set)
  - .claude/settings.json hook wiring (project-scoped)
  - .husky/pre-commit (project-scoped)
  - .research/ directory (project-scoped)
  - .claude/state/ (ephemeral)
- **§4 Cross order + dependencies** — schema first; templates + lib second; backfill + tools third
- **§5 Porting notes** — SoNash-specific sanitizations (look for SONASH_ROOT anchors, project-name references; universal files likely have none but confirm per-file during Piece 5.5 execution)
- **§6 Validation after cross** — SoNash runs validate-catalog.js against SoNash's existing catalog + re-derives any records that changed schema shape
- **§7 Backward-compat obligation** — SoNash v1.2 records validate under v1.3 (D3.7); no hard cutover

**Done when:** delta document is a self-contained reference Piece 5.5 can execute from

---

## Phase I — Closeout audit (part of commit 8 or standalone)

### Step I.1 — S11-style code-reviewer audit on ALL structural-fix changes

Dispatch `code-reviewer` agent (or `Plan` agent) against the diff from the start of this fix through commit 8. Focus:

- Schema changes — ajv strictness, enum additions
- derive.js heuristic rules — ordering, edge cases
- Validation tooling — no residual strip-before-validate, name-uniqueness correctness
- Hook wiring — matcher correctness, continueOnError posture
- scope.json — negative-space soundness, exclusion completeness
- Template changes — shared-partial include contract with dispatcher

Per memory `feedback_parallel_agents_for_impl` — can be split into 3-4 parallel agents:

- Agent α: schema + enums + EVOLUTION + EXAMPLES + SCHEMA.md
- Agent β: templates + shared partial + CATALOG_SHAPE + reference docs
- Agent γ: derive.js + validation tooling + build-enums
- Agent δ: scope.json + scope-matcher + hooks + pre-commit

**Done when:** all agents report; issues triaged + addressed (conversationally per D12a where schema judgment is involved)

### Step I.2 — Post-promotion smoke tests

- Edit an in-scope file → PostToolUse hook fires (check `.claude/state/hook-warnings-log.jsonl` or hook-internal state files)
- Attempt a commit with a deliberately-invalid catalog record → pre-commit blocks
- Invoke `/label-audit --recent` → returns clean or flagged findings as expected

**Done when:** all three smoke tests pass

### Step I.3 — Session closure (via `/session-end` or explicit handoff)

Update `SESSION_CONTEXT.md`:

- Counter 13 → 14 (next session)
- Quick Status: "Piece 3 structural fix + re-run + promotion complete; SONASH_MIRROR_DELTA staged; next session either Piece 5 /sync or Piece 5.5 mirror execution"
- Next Session Goals: decide Piece 5 vs Piece 5.5 start

Carry-forwards to close: the "D19-skipped Foundation layers" and other queued items in the parent SESSION_CONTEXT.

---

## Effort + timing estimate

| Phase | Description                               | Estimated time |
| ----- | ----------------------------------------- | -------------- |
| A     | Schema v1.3 foundation                    | 60 min         |
| B     | Templates + doc reconciliation            | 60 min         |
| C     | derive.js + validation tooling + prompts.js runtime guards | 105 min         |
| D     | scope.json + hooks + settings             | 30 min         |
| E     | Documentation sync (7 READMEs + OVERRIDE) | 60 min         |
| F     | Pre-run cleanup (rename + state moves)    | 15 min         |
| G     | Full re-run + promotion                   | ~90 min (agent wall-clock) + ~30 min human review |
| H     | PLAN patches + SONASH_MIRROR_DELTA        | 45 min         |
| I     | Closeout audit + smoke tests              | 45 min         |

**Total:** ~6–7 hours of focused work + ~90 min re-run wall-clock. Spans 2–3 sessions realistically.

---

## Parallelizable work

- Phases A, B can run with A as a prerequisite for B (templates need to reference schema shapes)
- Phase E (docs) can run in parallel with C + D once A+B land
- Phase I audit agents run in parallel (Step I.1 α, β, γ, δ)

---

## References

- **Decisions (canonical):** `./DECISIONS.md`
- **Diagnosis:** `./DIAGNOSIS.md`
- **Handoff:** `../S10_HANDOFF.md`
- **Learnings:** `../S10_LEARNINGS.md`
- **Parent plan:** `../PLAN.md`
- **Schema:** `.claude/sync/schema/SCHEMA.md`
- **Catalog shape:** `.claude/sync/label/docs/CATALOG_SHAPE.md`
