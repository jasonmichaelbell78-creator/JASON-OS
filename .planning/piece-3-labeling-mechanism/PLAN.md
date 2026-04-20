# PLAN — piece-3-labeling-mechanism

**Date:** 2026-04-19 (Session #9)
**Branch:** `piece-3-labeling-mechanism`
**Decisions:** `.planning/piece-3-labeling-mechanism/DECISIONS.md` (D1–D19 +
  D12a + D15a)
**Diagnosis:** `.planning/piece-3-labeling-mechanism/DIAGNOSIS.md`
**Effort:** L/XL — 3–5 execution sessions

## Progress log

| Step | Status | Session | Commit(s) | Notes |
| --- | --- | --- | --- | --- |
| S0 | ✓ DONE | 10 | `531c111` | ajv+node-notifier devDeps; `.claude/sync/label/` tree with 6 READMEs |
| S1 | ✓ DONE | 10 | `231c417` | `CATALOG_SHAPE.md` v0.2; Piece 4 interface pinned |
| S2 | ✓ DONE | 10 | `97e0045` | 7-module derivation library; 12 smoke tests |
| S3 | ✓ DONE | 10 | `c895900` | PostToolUse hook + scope.json + scope-matcher; 12 tests. **Settings.json wiring DEFERRED to post-S11 user-approval gate.** |
| (schema) | ✓ DONE | 10 | `4e42332` | Piece 2 schema v1.0 → v1.1 (added `status: partial`) |
| S4 | ✓ DONE | 10 | `a8505f6` | UserPromptSubmit backstop hook; 7 tests. **Wiring deferred.** |
| S5 | ✓ DONE | 10 | `334b9d1` | Notification desktop-toast hook; 9 tests. **Wiring deferred.** |
| S6 | ✓ DONE | 10 | `e69768c` | Pre-commit Check 2 wired live; validator `relax` patch for Piece 3 fields (T27 filed for proper v1.2 bump) |
| S7 | ✓ DONE | 10 | `ccf44e7`, `d119d7b` | `/label-audit` skill v0.2 + 3 reference docs; conversational invocation + Phase 8 self-audit |
| S8 | — PENDING | — | — | Back-fill orchestrator (L ~4-6h). Likely its own session. |
| S9 | — PENDING | — | — | OVERRIDE_CONVERSATION_EXAMPLES.md |
| S10 | — PENDING | — | — | Run JASON-OS back-fill |
| S11 | — PENDING | — | — | Audit checkpoint |
| S12 | — PENDING | — | — | End-to-end tests. **Settings.json hook wiring lands immediately before this.** |
| S13 | — PENDING | — | — | SoNash handoff prep |
| S14 | — PENDING | — | — | Cross-repo gate (user decision) |

**Test suite after Sessions A+B:** 40/40 passing (`node --test`).
**Dormant hook count:** 3 (PostToolUse, UserPromptSubmit, Notification).
**Open schema bump:** T27 v1.1 → v1.2 (machinery-fields as typed columns).

---

## Purpose

Execute Piece 3: build the labeling tooling, run JASON-OS back-fill, validate
end-to-end on JASON-OS. Per D18, cross-repo SoNash work is deferred to a
SoNash Claude Code session (Piece 5.5).

## Scope

**In-scope (this plan):**
- All tooling: hooks, pre-commit validator, consolidated audit skill, back-fill
  orchestrator, conversational-override doc
- JASON-OS back-fill + end-to-end validation
- Mirror preparation for SoNash (docs only — no writes to SoNash repo from
  this session)

**Out-of-scope (deferred):**
- SoNash bootstrap install → Piece 5.5
- SoNash back-fill → Piece 5.75
- First bidirectional sync → Piece 5.9
- Catalog file format / path finalization → Piece 4 (Piece 3 assumes JSONL
  layout as the interim)

## Tooling root

All Piece 3 artifacts live under `.claude/sync/label/`:

```
.claude/sync/label/
  lib/           — derivation + IO + confidence + sanitize
  hooks/         — PostToolUse + UserPromptSubmit + Notification
  skill/         — /label-audit
  backfill/      — orchestrator + agent templates
  docs/          — CATALOG_SHAPE.md, OVERRIDE_CONVERSATION_EXAMPLES.md,
                   SONASH_HANDOFF.md (written in S13)
  scope.json     — in-scope file patterns for hook
```

## References

- `.planning/piece-3-labeling-mechanism/DECISIONS.md`
- `.claude/sync/schema/SCHEMA.md`, `schema-v1.json`, `enums.json`
- `.planning/piece-2-schema-design/DECISIONS.md` (Piece 2 D1–D32)
- `scripts/lib/safe-fs.js`, `scripts/lib/sanitize-error.cjs` (CLAUDE.md §2)
- `.husky/_shared.sh` (skip-pattern helpers)

---

## Step S0 — Pre-flight

### S0.1: Declare ajv as devDependency

Per DECISIONS.md CL claim 11 finding — ajv is currently installed but flagged
`extraneous` (not declared in package.json).

```sh
npm install --save-dev ajv node-notifier
```

**Done when:** `package.json` has `"ajv": "^8.x"` and `"node-notifier": "^10.x"`
under `devDependencies`; `npm ls` shows no extraneous flags. (`ajv` already
landed in PR #7 R1; `node-notifier` is the execution-phase addition for S5.)

### S0.2: Create tooling directory structure

Create empty directories + placeholder READMEs at the Piece 3 root per the
tree above.

**Done when:** directory tree exists; each subdir has a placeholder README.md
documenting its purpose.

**Depends on:** none.
**Size:** S (~15 min).

---

## Step S1 — Catalog record shape spec

Define the records Piece 3 writes. Formalizes what Piece 4 inherits.

**File:** `.claude/sync/label/docs/CATALOG_SHAPE.md`

**Contents:**

- Primary key: `path` (unique per repo)
- Required fields per record: 26 universal columns from Piece 2 §3 + per-type
  extensions from Piece 2 Section 10
- **Piece 3 additions to every record:**
  - `status`: extend Piece 2's 8-value enum with Piece 3 values `partial`,
    `stub` (Piece 2 already has `stub` — confirm enum alignment with Piece 2
    EVOLUTION.md rules; if new value needed, treat as minor version bump per
    Piece 2 D5)
  - `pending_agent_fill: boolean` — async agent still pending
  - `manual_override: string[]` — field names set by conversational override;
    hook MUST skip these fields on re-derivation
  - `needs_review: string[]` — field names with low-confidence or unresolved
    disagreement; non-empty blocks commit per D3
  - `last_hook_fire: string (ISO timestamp)`
  - `schema_version: string` — for D16 migration
- **Catalog files per D14:**
  - `.claude/sync/label/shared.jsonl` — mirrored across repos
  - `.claude/sync/label/local.jsonl` — per-repo
  - `.claude/sync/label/composites-shared.jsonl`
  - `.claude/sync/label/composites-local.jsonl`
- **Interface to Piece 4:** Piece 4 owns final path + format decisions.
  Piece 3's interim assumption: JSONL at the paths above. If Piece 4 later
  moves to TOML or a different path, the `catalog-io.js` layer (S2) is the
  single point of change.

**Done when:** CATALOG_SHAPE.md written with all fields documented; Piece 2
enum extensions flagged explicitly; Piece 4 interface section clearly marked.

**Depends on:** S0.
**Size:** S (~30 min).

---

## Step S2 — Label-derivation library

Pure functions used by hooks, back-fill, and audit skill. Single source of
truth for derivation logic.

**Directory:** `.claude/sync/label/lib/`

**Modules:**

- `derive.js` — main exports
  - `deriveCheapFields(filePath) → {name, path, type, fingerprint, module_system, file_size}`
  - `deriveUnderstandingFields(filePath, fileContent) → Promise<object>` —
    agent-backed
  - `detectType(filePath) → typeEnum` — file extension + directory + any
    existing frontmatter
  - `parseExistingFrontmatter(filePath) → object | null` — handles YAML
    (skills/agents/memories), team roster format (prettier-ignore fenced
    Markdown table with bold headers per EXAMPLES.md Example 4 — NOT the
    HTML-comment pattern Piece 1a §5.2 originally guessed), `**Lineage:**`
    markdown body (pr-review pattern per CL claim 12)
  - `detectSectionsHeuristic(content) → sectionRecord[]` — D6 heuristic
    (headings + scope keywords)
  - `detectCompositesHeuristic(files) → compositeRecord[]` — D13 heuristic
- `fingerprint.js` — SHA-256 of normalized content; normalization strips
  trailing whitespace, normalizes line endings, does NOT strip comments
- `confidence.js` — scoring helpers; extracts `needs_review` field list when
  any field's confidence falls below threshold (default 0.80)
- `catalog-io.js` — atomic read/write for `.jsonl` files:
  - `readCatalog(path) → records[]`
  - `writeCatalog(path, records) → void` — temp-file + rename for atomicity
  - All I/O wrapped via `scripts/lib/safe-fs.js`
- `agent-runner.js` — spawns derivation agents with timeout; returns
  structured result or throws sanitized error (via
  `scripts/lib/sanitize-error.cjs`)
- `sanitize.js` — thin wrapper around `scripts/lib/sanitize-error.cjs` for
  Piece 3 error paths; never lets raw `error.message` escape
- `validate-catalog.js` — invoked by pre-commit (S6); loads `schema-v1.json`
  via ajv; validates records; enforces needs_review-empty and
  status-not-partial rules at commit time

**Security compliance (CLAUDE.md §5 anti-pattern table):**
- All path checks use `/^\.\.(?:[\\/]|$)/` regex, NOT `startsWith('..')`
- All file reads wrapped in try/catch (existsSync race condition)
- All regex in repeated-match iteration loops carry the global flag
  (missing global flag causes infinite loop)
- No raw `error.message` logs anywhere

**Done when:** all modules written with JSDoc; unit tests pass; CLAUDE.md §5
anti-patterns confirmed absent.

**Depends on:** S0, S1.
**Size:** M (~2–4h).
**Parallelizable:** Yes — sub-modules can be split across parallel sub-agents.

---

## Step S3 — PostToolUse write hook

Implements D2 + D11 — synchronous partial-record write + async
understanding-field fill + in-the-moment failure surfacing.

**File:** `.claude/sync/label/hooks/post-tool-use-label.js`

**Registration:** new entry in `.claude/settings.json` under
`hooks.PostToolUse` with matcher for `Edit` + `Write` tool types.

**Behavior:**

1. **Step 0 (BEFORE anything else):** read pending-agent queue at
   `.claude/state/label-pending-failures.jsonl`
2. Any completed-successfully async jobs → update catalog records silently,
   clear pending flags
3. Any failed/timed-out jobs → **exit non-zero** with failure details in
   stderr. Tool output surfaces to Claude; Claude must present to user per
   D15.
4. Step 1: match in-scope files against `scope.json` — skip if not in scope
5. Step 2: read current catalog record via `catalog-io.js`
6. Step 3: compute cheap fields (synchronous)
7. Step 4: classify event:
   - `oldRecord === null` → NEW file → trigger async fill
   - fingerprint diff >20% OR type changed → MAJOR edit → trigger async fill
   - else → MINOR edit → fingerprint-only update, no async
8. Step 5: write partial record with `status: partial` +
   `pending_agent_fill: true` if async triggered; else write updated record
   with `status: active`
9. Step 6: spawn async agent via `agent-runner.js`; record job in
   pending queue
10. Hook returns 0 (success path)

**Must-have properties:**
- Never blocks user's Edit/Write in success path
- Exits non-zero **only** on Step 0 pending-queue failures (surfaces past
  failures in-the-moment per D15)
- All errors via `sanitize-error.cjs`
- All file I/O via `safe-fs.js`

**Done when:** hook fires correctly on Edit/Write of in-scope files; partial
records written; async spawn works; Step 0 surfaces past failures per D15;
out-of-scope files ignored silently.

**Depends on:** S1, S2.
**Size:** M (~2–4h).

---

## Step S4 — UserPromptSubmit surfacing hook

Implements D15 path 2 — pending-failure warning injected into user prompts.

**File:** `.claude/sync/label/hooks/user-prompt-submit-label.js`

**Registration:** new `hooks.UserPromptSubmit` entry in
`.claude/settings.json` (this event type not yet registered in
JASON-OS — new addition).

**Behavior:**

1. Read pending-failures queue from `.claude/state/label-pending-failures.jsonl`
2. If empty: exit 0 silently (no prompt modification)
3. If any unresolved: prepend to user's prompt:

   ```
   [LABEL-SYSTEM — acknowledgement required]
   Unresolved failures (oldest first):
   - 2026-04-19T14:22Z: async agent failed on .claude/skills/foo/SKILL.md — [error detail]
   - 2026-04-19T14:30Z: malformed file rejected at .claude/hooks/bar.js — [error detail]
   Claude must present these with decision options (retry / fix / skip-with-reason) BEFORE proceeding with the user's request below.

   ===

   [original user prompt follows]
   ```

4. Claude in next response MUST open with the warning acknowledgement and
   decision options before touching user's actual request (behavioral
   enforcement via `feedback_ack_requires_approval`)

**Must-have:**
- State file read via `safe-fs.js`
- If state file read fails: inject its own warning ("label-hook state file
  unreadable") — the hook's own failure is non-silent

**Done when:** hook registered; fires on every UserPromptSubmit; prepends
warnings when pending failures exist; test confirms Claude addresses
warnings first.

**Depends on:** S3 (which writes to pending-failures queue).
**Size:** S (~1h).

---

## Step S5 — Notification hook

Implements D15 path 3 — OS-level desktop notification on failures.

**File:** `.claude/sync/label/hooks/notification-label.js`

**Registration:** new `hooks.Notification` entry in `.claude/settings.json`.

**Behavior:**

1. Fires on Notification event with label-system matcher
2. Sends OS-level desktop notification via `node-notifier` (devDependency
   declared in S0.1 — Node.js has no core desktop-notification API, so the
   library is required, not optional). Fallback path: platform-specific shell
   command (PowerShell toast on Windows, `osascript` on macOS, `notify-send`
   on Linux). If neither path is available, the hook writes a clearly-marked
   warning to stderr (sanitized via `sanitize-error.cjs`) so the failure
   surfaces via D15 path 1 instead of silently no-op'ing.
3. Notification content: failure type + file path + truncated error message
4. Never blocks anything

**Done when:** notification fires on simulated failure on operator's machine
(Windows test via test case T6).

**Depends on:** S3, S4.
**Size:** S (~1h).

---

## Step S6 — Pre-commit validator

Implements D3 + D5 — extend `.husky/pre-commit` with ajv validation + needs_review gate.

**File:** `.husky/pre-commit` (edit existing)

**Addition (after Check 1 gitleaks):**

```sh
# --- Check 2: label validation ---
if is_skipped "labels"; then
  require_skip_reason "SKIP_CHECKS=labels"
  echo "  label validation skipped (SKIP_REASON: $SKIP_REASON)"
elif command -v node >/dev/null 2>&1; then
  if ! node .claude/sync/label/lib/validate-catalog.js --staged; then
    echo "" >&2
    echo "  Commit blocked by label validator" >&2
    echo "  See error details above. Fix and re-commit." >&2
    echo "  Skip (only if intentional): SKIP_CHECKS=labels SKIP_REASON=\"...\" git commit" >&2
    exit 1
  fi
  echo "  labels: all records valid, no unresolved needs_review items"
else
  echo "  node not available — label validation skipped (advisory)" >&2
fi
```

**Validator responsibilities** (`validate-catalog.js`):

- Load `schema-v1.json` via ajv
- Validate every record in `shared.jsonl` + `local.jsonl` against schema
- Reject any record with non-empty `needs_review` — emit per-record error
  detail
- Reject any record with `status: partial` — user must resolve first
- Emit structured error output (per-record, per-field)
- Exit 0 if clean; exit 1 with details if invalid

**Done when:** pre-commit blocks a test record with `needs_review` set; clear
error messages shown; SKIP_CHECKS=labels with SKIP_REASON works (per
`.husky/_shared.sh`).

**Depends on:** S1, S2.
**Size:** S (~1h).

---

## Step S7 — Consolidated `/label-audit` skill

Implements D4 + D19 — single supplementary skill covering records + sections +
composites.

**Path:** `.claude/skills/label-audit/`

**Files:**
- `SKILL.md` — standard skill frontmatter (name, description, allowed-tools,
  version history), invocation guide, argument handling
- `reference/DERIVATION_RULES.md` — rules the audit agents apply
- `reference/DISAGREEMENT_RESOLUTION.md` — how conflicts are arbitrated
- `reference/BYTE_WEIGHTED_SPLITS.md` — from Piece 1a LEARNINGS (target
  ~120–150KB per agent, treat >50KB files as 2 units)

**Invocation patterns:**

```
/label-audit                    # all in-scope files
/label-audit --recent           # files edited in last N days (default 7)
/label-audit --path=glob        # scoped audit
/label-audit --stub-only        # status == stub
/label-audit --pending-only     # pending_agent_fill == true
/label-audit --composites       # just composite detection pass
/label-audit --sections         # just section re-detection pass
```

**Skill behavior:**

1. Scope files per argument
2. Byte-weighted batch splits (Piece 1a pattern)
3. Dispatch primary + secondary agent per batch (multi-agent cross-check per
   D8)
4. Each agent reports per file: drift / low-confidence / disagreements / new
   sections / new composite candidates
5. Synthesis agent groups findings by severity and presents to user in
   conversation
6. User arbitrates conversationally (per D12a) — skill writes back to catalog
   with `manual_override` as needed

**Must-have:**
- No silent skips — every file either has a finding or is explicitly confirmed
  clean
- Failure to reach any file surfaces via D15 paths

**Done when:** skill invokable with all argument forms; agent fleet runs;
synthesis presents findings clearly; conversational resolution writes back
correctly.

**Depends on:** S2.
**Size:** M (~2–3h).

**Per D4 / D19:** if this skill is never invoked, catalog remains correct via
S3 + S6. Never primary.

---

## Step S8 — Back-fill orchestrator

Implements D7 + D8 + D9 + D10 — pure agent fleet + multi-agent cross-check +
checkpoint/preview/re-run.

**File:** `.claude/sync/label/backfill/orchestrate.js`

**Sub-files:**
- `backfill/agent-primary-template.md` — prompt template for primary agents
- `backfill/agent-secondary-template.md` — prompt template for cross-check
  agents
- `backfill/synthesis-agent-template.md` — prompt template for synthesis

**Behavior:**

1. **Scan phase:** enumerate in-scope files (uses `scope.json` from S3); emit
   file inventory with byte weights
2. **Split phase:** byte-weighted batches targeting ~120–150KB per agent
   (per Piece 1a LEARNINGS); files >50KB count as 2 units
3. **Primary dispatch:** one primary agent per batch; each derives full
   records
4. **Secondary dispatch:** one secondary agent per batch (independent
   derivation; does not see primary's output)
5. **Cross-check:** compare primary vs secondary record-by-record:
   - Agreement on field → high-confidence, value committed
   - Disagreement on field → `needs_review` list grows by that field name;
     preview stores both candidates
6. **Checkpoint:** after each batch completes, write to
   `.claude/state/label-backfill-checkpoint.jsonl` (resume-safe on crash)
7. **Synthesis agent** runs when all primary+secondary batches done; groups
   findings by severity; emits preview summary (total records, agreement
   rate, disagreement list, novel composites, sections detected)
8. **Preview-to-real gate (D9c):** orchestrator writes to
   `.claude/sync/label/preview/shared.jsonl` + `preview/local.jsonl`; presents
   summary to user in conversation; waits for approve/reject
9. **Approve path:** atomic rename preview → real catalog
10. **Reject path:** user annotates corrections in conversation; orchestrator
    re-runs with corrections injected into agent prompts (D9a cycle)

**Failure modes per D15:**
- Agent spawn fail → hook exit non-zero, surfaces immediately
- Empty agent output (Windows 0-byte bug per
  `feedback_agent_output_files_empty`) → retry via task-notification result;
  if still empty, flag via D15
- Batch timeout → log batch, continue others, surface in synthesis
- Preview-to-real rename fail → atomic preservation; surface via D15

**Done when:** orchestrator runs end-to-end on a test fixture (<20 files);
preview accurate; approve writes real catalog; reject re-runs with
corrections; checkpoint recovery verified.

**Depends on:** S1, S2.
**Size:** L (~4–6h).

---

## Step S9 — Conversational override documentation

Implements D12a — documents the override pattern so Claude in future sessions
recognizes and executes it correctly.

**File:** `.claude/sync/label/docs/OVERRIDE_CONVERSATION_EXAMPLES.md`

**Content sections:**

1. **Purpose:** explain that the catalog is Claude-editable via normal
   Edit/Write tools; conversational corrections are the primary override
   mechanism per D12a.
2. **Recognition patterns** — phrasings Claude should treat as override
   requests:
   - "For [path], [field] should be [value]"
   - "[path]'s [field] is wrong, it's [value]"
   - "Override [field] on [path] to [value]"
3. **Claude's action sequence:**
   1. Read current record from catalog
   2. Update specified field(s)
   3. Add field names to `manual_override: [...]` (idempotent — already-present
      names not duplicated)
   4. Remove cleared fields from `needs_review: [...]`
   5. Update `last_hook_fire` timestamp
   6. Append audit entry to `.claude/state/label-override-audit.jsonl`:
      `{ts, path, fields_overridden, user_message, claude_action}`
   7. Atomic write via `catalog-io.js`
4. **Edge cases:** multiple corrections in one message; corrections spanning
   multiple files; revoking a prior override (user says "actually, let it
   auto-derive again" → remove field from `manual_override`)
5. **What Claude does NOT do:** ignore hook re-derivations (the hook respects
   `manual_override`; Claude doesn't need to); edit catalog without audit
   trail; skip acknowledgement of already-pending `needs_review` items

**Done when:** doc written; test scenario (T4) confirms Claude executes the
pattern correctly.

**Depends on:** S1.
**Size:** S (~1h).

---

## Step S10 — Run JASON-OS back-fill

Execute S8 against JASON-OS itself.

**Command:**

```sh
node .claude/sync/label/backfill/orchestrate.js --repo=jason-os
```

**Process:**

1. Orchestrator scans JASON-OS files (~187 units per Piece 1a census + any
   since added)
2. Byte-weighted splits produce ~6–8 batches (estimate)
3. Primary + secondary agents dispatched (~12–16 agents total)
4. Cross-check + synthesis runs
5. Preview presented to user in conversation with summary
6. User reviews, approves, or rejects-with-corrections
7. On approve: real catalog written

**Done when:**
- `.claude/sync/label/shared.jsonl` + `local.jsonl` exist
- Every JASON-OS in-scope file has exactly one record
- No records with `status: partial`
- No records with non-empty `needs_review`
- No records with `pending_agent_fill: true`
- Composites seeded from Piece 1a/1b identified ~15 composites (per D13c)

**Depends on:** S0–S9.
**Size:** M (~1–2h elapsed, mostly agent-compute + user review).

**User gate:** preview approval (D9).

---

## Step S11 — Audit checkpoint

Run code-reviewer on all new/modified files per SKILL.md Phase 3 rule 6.

**Agent:** `pr-review-toolkit:code-reviewer`

**Scope:**
- `.claude/sync/label/**/*` (all new)
- `.husky/pre-commit` (modified — Check 2 addition)
- `.claude/settings.json` (modified — new hook registrations)
- `package.json` (modified — ajv devDep)
- `.claude/skills/label-audit/**/*`

**Triage:**
- HIGH severity → fix immediately before S12
- MEDIUM → fix if time permits in this plan; otherwise `/add-debt`
- LOW / nits → `/todo` or close as acknowledged

**Done when:** code-reviewer run completes; HIGH/MEDIUM items resolved or
explicitly filed per severity policy.

**Depends on:** S0–S10.
**Size:** S (~30–60 min).

---

## Step S12 — JASON-OS end-to-end tests

Validate the mechanism works in practice. Test fixtures live in
`.claude/sync/label/test-fixtures/` and are cleaned up at end.

**T1 — New file creation**
- Create `test-fixtures/sample-new-file.md`
- Verify hook writes partial record (`status: partial`,
  `pending_agent_fill: true`)
- Wait for async completion
- Verify record flips to `status: active`, understanding fields populated
- Verify no silent state changes

**T2 — Minor edit**
- Edit with one-line change
- Verify fingerprint updates; no async re-fill; `status` unchanged

**T3 — Major edit**
- Edit with >20% content change
- Verify async re-fill triggers; `pending_agent_fill: true` then cleared;
  fields re-derived

**T4 — Low-confidence + conversational override**
- Create file designed to trigger ambiguity (content could be `script` or
  `script-lib`)
- Verify `needs_review: ["type"]` set
- Verify pre-commit blocks commit with clear error
- User tells Claude: "type for test-fixtures/sample-X should be script-lib"
- Verify Claude updates record, sets `manual_override: ["type"]`, clears
  `needs_review`
- Verify commit now passes

**T5 — Multi-agent disagreement during back-fill**
- Include a deliberately ambiguous file in back-fill run
- Verify primary and secondary disagree; preview shows disagreement; user
  arbitrates conversationally; resolution captured

**T6 — Hook failure surfacing (D15)**
- Introduce a malformed file (bad encoding)
- Verify hook exits non-zero; Claude surfaces in same turn
- Verify UserPromptSubmit backstop fires on next prompt if not resolved
- Verify OS notification fires (manual check)

**T7 — Pre-commit skip**
- Try commit with SKIP_CHECKS=labels, no SKIP_REASON → blocked
- Retry with SKIP_REASON="test skip" → passes with skip recorded

**T8 — Back-fill checkpoint resume**
- Start back-fill; kill mid-run after 2 batches complete
- Restart → verify resume from checkpoint; remaining batches run

**T9 — Preview rejection + re-run**
- Run back-fill; reject preview with one correction
- Verify re-run uses correction in agent prompts; produces updated preview

**Done when:** all 9 tests pass; test fixtures deleted; no residual state.

**Depends on:** S0–S11.
**Size:** M (~2–3h).

---

## Step S13 — Mirror preparation for SoNash (no cross-repo writes)

Prepare artifacts for eventual Piece 5.5 without writing to SoNash.

**File:** `.planning/piece-3-labeling-mechanism/SONASH_HANDOFF.md`

**Contents:**

1. **File manifest:** every file under `.claude/sync/label/` with path + SHA
2. **Settings.json delta:** new `hooks.PostToolUse`, `hooks.UserPromptSubmit`,
   `hooks.Notification` entries to add in SoNash
3. **Pre-commit delta:** Check 2 block to add to SoNash's `.husky/pre-commit`
4. **package.json delta:** `ajv` + `node-notifier` devDeps to add (SoNash may
   already have its own ajv dep; check before adding)
5. **Back-fill run instructions:** exact command + expected agent count
   based on SoNash's 5× larger surface
6. **Expected effort:** 1 session for bootstrap install, 1–2 sessions for
   SoNash back-fill (larger surface = more agents + longer elapsed)
7. **Cross-cutting concerns SoNash session must handle:**
   - SoNash has more file types (e.g., product-code per D14)
   - SoNash has auto-fire session-end hook (SESSION_CONTEXT Session 8 noted
     this) — Piece 5.5 must account for it
   - SoNash has GSD plugin skills not in JASON-OS — derivation agents may
     need expanded type detection

**Done when:** SONASH_HANDOFF.md written; complete manifest; explicit
instructions for Piece 5.5 session.

**Depends on:** S0–S12.
**Size:** S (~1h).

---

## Step S14 — USER GATE: cross-repo mirror decision

> **STOP: Cross-repo work requires explicit user decision per D18.**

Present to user in conversation:

> "Piece 3 complete on JASON-OS side. SONASH_HANDOFF.md prepared in
> .planning/piece-3-labeling-mechanism/. Two options:
>
> **(a) Approve JASON-OS-session mirror now.** Claude copies finalized
> `.claude/sync/label/` files to SoNash repo on a new SoNash branch and
> commits. Settings.json + pre-commit deltas applied. You still run SoNash
> back-fill in a new SoNash Claude Code session (that part can't be
> automated from here).
>
> **(b) Defer mirror entirely to SoNash session.** Close current session,
> open Claude Code in SoNash repo later, invoke `/bootstrap-piece-3` (a
> skill that reads SONASH_HANDOFF.md and performs the install). Nothing else
> happens from here.
>
> Option (a) saves you a step later but requires explicit approval for
> cross-repo write. Option (b) is fully deferred."

User chooses. Piece 3 plan is complete either way. If (a), cross-repo mirror
is executed as a final step. If (b), SONASH_HANDOFF.md is the only
cross-repo artifact from this session.

**Done when:** user has acknowledged and selected an option; selected path
executed if (a), or plan closed if (b).

**Depends on:** S13.
**Size:** Gate (user time only).

---

## Parallelization guide

- **S2 sub-modules** — sub-agents can write `derive.js`, `fingerprint.js`,
  `confidence.js`, `catalog-io.js` in parallel
- **S3, S4, S5 hooks** — parallel after S2 done
- **S7 skill files + S9 docs** — parallel after S2 done
- **S8 orchestrator + its sub-templates** — sub-templates parallel
- **S10 back-fill internally** — agent fleet inherently parallel

## Cross-repo STOP markers

- **Before S13 content:** S13 only prepares artifacts; does not touch SoNash
  files
- **At S14:** explicit "STOP: user decision required" gate per D18

## Effort summary

| Steps | Size | Time |
|---|---|---|
| S0 | S | ~15 min |
| S1 | S | ~30 min |
| S2 | M | ~2–4h (parallel-speedable) |
| S3 | M | ~2–4h |
| S4 | S | ~1h |
| S5 | S | ~1h |
| S6 | S | ~1h |
| S7 | M | ~2–3h |
| S8 | L | ~4–6h |
| S9 | S | ~1h |
| S10 | M | ~1–2h |
| S11 | S | ~30–60 min |
| S12 | M | ~2–3h |
| S13 | S | ~1h |
| S14 | Gate | — |
| **Total** | **L/XL** | **~20–30h Claude work + review time** |

Suggested session split:
- **Session A:** S0–S3 (foundation + write hook)
- **Session B:** S4–S7 (surfacing hooks + pre-commit + audit skill)
- **Session C:** S8 (back-fill orchestrator)
- **Session D:** S9–S12 (back-fill run + audit + tests)
- **Session E:** S13–S14 (handoff prep + user gate)

Between-session persistence: each session commits its work to the
`piece-3-labeling-mechanism` branch.

---

## Decision coverage map

Every DECISIONS.md entry (D1–D19 + D12a + D15a) is addressed:

| Decision | Plan step(s) |
|---|---|
| D1 (catalog + fingerprint) | S1, S2 (`fingerprint.js`) |
| D2 (write hook layer) | S3 |
| D3 (pre-commit layer) | S6 |
| D4 (audit skill layer, supplementary) | S7 |
| D5 (validation timing) | S6 |
| D6 (section detection 3 layers) | S2 (heuristic), S3 (fingerprint-triggered), S7 (agent audit) |
| D7 (pure agent fleet) | S8 |
| D8 (multi-agent cross-check) | S8 |
| D9 (checkpoint + preview + re-run) | S8 |
| D10 (back-fill in-scope of Piece 3) | S10 |
| D11 (two-phase hook + async failure surfacing) | S3 |
| D12 (automatic error discovery) | S2 (`confidence.js`), S6 (pre-commit gate), S8 (cross-check) |
| D12a (conversational correction) | S9 |
| D13 (composite detection 3 layers) | S2 (heuristic), S7 (audit), S10 (seed from Piece 1a/1b) |
| D14 (shared vs local catalogs) | S1, S2 (`catalog-io.js`) |
| D15 (three real-time surfacing paths) | S3 (exit code), S4 (prompt-submit), S5 (notification) |
| D15a (per-failure-type) | S3, S6, S8 (all enforce) |
| D16 (eager atomic migration) | Codified in CATALOG_SHAPE.md so future bumps follow the rule; first migration runs when schema v1.1 lands |
| D17 (full safety net) | Whole plan reflects this — all 3 layers + cross-check + atomic writes |
| D18 (cross-repo execution boundary) | S13, S14 (STOP gate) |
| D19 (ONE audit skill) | S7 |

CL findings:

| Finding | Plan step |
|---|---|
| ajv extraneous | S0.1 |
| Lineage is markdown not YAML | S2 (`parseExistingFrontmatter` handles body-text pattern) |

**Decision coverage: 21/21 (D1–D19 + D12a + D15a). All covered.**

---

## Plan self-audit

Checklist per SKILL.md Phase 3.5:

- Every DECISIONS.md entry maps to a plan step (see table above) — PASS
- Specific file paths throughout (not "somewhere in scripts/") — PASS
- Code snippets for pre-commit addition (S6) and override sequence (S9) — PASS
- No artificial size cap — plan is as long as it needs to be — PASS
- Parallelizable steps marked — PASS
- Audit checkpoint present (S11) on all new/modified files — PASS
- Effort estimate per step + overall (~20–30h, 3–5 sessions) — PASS
- DECISIONS.md referenced by ID throughout (not duplicated) — PASS
- DIAGNOSIS.md findings all addressed (hard constraint §3, CL findings §6,
  boundary §7) — PASS
- Convergence-loop verification of plan's codebase assumptions done
  (verified `_shared.sh` functions, `sanitize-error.cjs` existence,
  `settings.json` hook structure, existing hook event types) — PASS
- Cross-repo work explicitly gated (S14) per D18 — PASS
- No silent-failure paths anywhere — PASS
- Skills are supplementary only (S7 is the only skill; all primary work
  is in hooks/pre-commit/derivation) — PASS

**Self-audit verdict: PASS.**

---

## Ready for approval

Plan is complete. Awaiting user sign-off on Phase 4.
