# D8 — Phase 5 Failure / Recovery Semantics for `/migration`

**Agent:** Phase 1 D-agent D8-failure-recovery
**Depth:** L1
**Sub-question:** SQ-D8 (BRAINSTORM.md §5 Q8)
**Date:** 2026-04-21
**Scope:** Phase 5 (active transformation) mid-execute failure modes, recovery, atomicity, resume, comparable patterns.

---

## Summary

Phase 5 is the only phase of `/migration` that writes to the destination. Under D8 ("nothing silent") and D22/R3 (gate memory never replaces confirmation), every failure must surface to the user and every resume must re-ask gates. Under D29 (local-only), all state lives on the local filesystem — there is no remote transaction to roll back, but there is also no remote as a canonical source of truth, so the state file IS the truth.

The core recommendation is **per-verdict-unit atomicity** (not per-file, not per-phase) with a checkpoint-per-gate state file (`MIGRATION_STATE.json`) and **one-commit-per-unit** on direct-apply mode. This mirrors Alembic/Flyway's per-migration-record model but adds gate-level granularity for interactive confirmation. Eleven failure modes are enumerated below; nine have deterministic recovery strategies, two (unforeseen idiom, mid-flow denial) route back to earlier phases by design.

`/migration` does NOT need to invent checkpointing — the existing `/checkpoint` skill's `.claude/state/task-{name}.state.json` pattern and `/pre-commit-fixer`'s `.claude/state/pre-commit-fixer-state.json` both provide local precedent. Best practice synthesis from the comparable-patterns catalog: **Alembic's per-version stamp + Flyway's repair semantics + dbt retry's point-of-failure resume + git rebase's `--continue / --abort / --skip` trio + terraform's `-replace` atomic operation.**

---

## 1. Failure taxonomy

Eleven modes (the 8 prompted + 3 surfaced by research). "Atomicity" column reads as: the smallest unit that either fully succeeds or fully rolls back on this failure.

| # | Mode | Detection | Recovery strategy | Atomicity | State to preserve |
|---|------|-----------|-------------------|-----------|-------------------|
| F1 | Unforeseen destination idiom surfaces mid-transform | Agent/user notices pattern not in verdict plan | Halt unit; re-enter Phase 3 (research) for that unit only (D28 iterative re-entry); amend `MIGRATION_PLAN.md` with new verdict; re-gate | Per-verdict-unit | Unit ID, original verdict, new idiom observation, partial transforms applied |
| F2 | Pre-commit hook rejection (direct-apply) | `git commit` exits non-zero | Hand off to `/pre-commit-fixer` (CLAUDE.md #9); on fix, re-stage + re-commit for the same unit; do NOT advance state cursor until commit hash recorded | Per-commit (= per-unit) | Unit ID, staged file list, hook category, attempt count (guardrail #9: stop after 2) |
| F3 | Detached HEAD / rebase in progress / dirty worktree in destination | Pre-flight `git status` at Phase 5 entry + before each unit commit | Halt; surface to user; options: (a) user cleans up destination, (b) switch to plan-export mode (D26), (c) abort migration | Per-phase-entry (gate) | Destination branch, HEAD ref, git-state snapshot, `.git/` sentinel files (`rebase-merge/`, `MERGE_HEAD`, `CHERRY_PICK_HEAD`) |
| F4 | Mid-flow user denial at a gate | User answers "no" at confirmation gate | Roll back only the uncommitted staged changes for the current unit (`git restore --staged .` + discard worktree edits for unit's files); state advances to "unit skipped, reason recorded"; continue to next unit or halt per user choice | Per-verdict-unit | Unit ID, denial reason (free-text), files that were staged, rollback confirmation |
| F5 | Agent timeout (Phase 5 subagent invocation) | No `<result>` or exit after timeout; per CLAUDE.md #15 (Windows 0-byte bug) | Treat as failure; do NOT advance cursor; state retries allowed ≤ 2 (per guardrail #9 analog); on persistent, escalate to user with partial output surfaced | Per-agent-invocation (nested within unit) | Unit ID, agent name, invocation ID, attempt count, elapsed, partial output bytes |
| F6 | Windows 0-byte file write | Post-write size check returns 0 bytes; CLAUDE.md #15 | MUST fail loudly — do NOT silently accept. Re-try write; on second 0-byte, halt and surface | Per-file (nested within unit) | Unit ID, file path, attempted byte count, attempt count |
| F7 | Encoding / CRLF corruption | `git diff --check` OR deliberate BOM/LF sniff post-write | Halt unit; surface diff-of-diffs; re-write with explicit encoding (UTF-8 no-BOM per Windows PS default); do NOT advance cursor | Per-file | Unit ID, file path, expected encoding, observed encoding, byte-level diff sample |
| F8 | Partial MIGRATION_PLAN.md execution (some units done, some failed) | State file cursor mid-plan AND at least one unit in `failed` status | Resume via next `/migration` invocation reads `MIGRATION_STATE.json`; completed units are skipped (their commit hashes recorded); failed units replayed; user re-confirms at each gate (R3) | Per-verdict-unit | Unit list with per-unit status `{pending \| in-progress \| done \| failed \| skipped \| denied}`, commit hashes for done, last gate answered |
| F9 | Session crash mid-Phase-5 (no Ctrl-C, just gone) | On next `/migration` invocation, state file exists with `phase=5` and `status != complete` | Same as F8 resume path, with extra step: verify `git status` matches recorded state (worktree diff expected if in-progress unit was mid-write); present divergence if any | Per-verdict-unit | All F8 fields + last-heartbeat timestamp + last-recorded git SHA |
| F10 | Commit succeeded but state-write failed (split-brain) | Next run: `MIGRATION_STATE.json` says "in-progress" but `git log` shows the commit | Reconcile on resume: parse recent commits for `Migration-Unit:` trailer; mark matching units as `done` with user confirmation (R3 requires confirmation, not silent auto-heal) | Per-verdict-unit | Trailer-based unit ID in commit message, SHA, state-file timestamp, git-log timestamp |
| F11 | State file corruption / missing | `MIGRATION_STATE.json` fails JSON parse OR absent but `git log` shows migration commits | Halt; surface; offer rebuild-from-git-log option (parse `Migration-Unit:` trailers) OR restart migration from Phase 1 with re-scan | Per-migration-run | All done-unit SHAs discoverable via `git log --grep='Migration-Unit:'` |

**Failure mode count: 11.**

---

## 2. Atomicity boundaries

### Recommendation: **per-verdict-unit** is the atomic boundary.

A verdict-unit = one entry in `MIGRATION_PLAN.md` = one source artifact with its assigned verdict (`copy-as-is` / `sanitize` / `reshape` / `rewrite` / `skip` / `blocked-on-prereq`). This is typically one source file but may be one source concept mapped to multiple destination files.

**Why not per-file:** Reshape verdicts frequently require multi-file edits (e.g., split one source file into three destination files, or update imports across six files when renaming). Per-file atomicity would leave the destination in a half-reshaped state that no commit can represent cleanly.

**Why not per-phase:** Phase 5 may process dozens of units. A phase-level atomic boundary means one failure invalidates all prior work — unacceptable under D8 (every unit confirmed) and wasteful on resume.

**Why not per-batch:** Batches are a UX grouping (D26 menu-at-every-gate). Atomicity = one confirmed verdict applied = one commit.

### Git-commit cadence: **one-commit-per-unit** in direct-apply mode.

- Each unit's commit message includes a `Migration-Unit: <unit-id>` trailer.
- Plan-export mode (D26): no commits; writes `MIGRATION_PLAN.md` + emitted transforms to a portable artifact; state file still tracks unit-level progress so a partial export can resume.
- Batch-commit-at-end is rejected: conflicts with R3 (user confirmation per gate) and F8 resume (can't tell which units committed).

### Nested levels

```
Phase 5 run
  └── Verdict-unit  ← ATOMIC BOUNDARY (1 commit, 1 state entry)
        └── File op (F6/F7 detect here, but failure rolls back the whole unit)
              └── Agent invocation (F5 detects here; unit retries ≤ 2)
```

---

## 3. Checkpoint design proposal

### State file: `.research/migration-skill/state/MIGRATION_STATE.json`

Lives in JASON-OS (the workshop, per D18) regardless of direction. Naming convention mirrors `/checkpoint` `.claude/state/task-{name}.state.json` but scoped to the active migration run (one file per run; archive old runs to `state/archive/`).

```json
{
  "schemaVersion": 1,
  "runId": "2026-04-21T14-30-00_sonash-to-jasonos",
  "direction": "in",
  "otherEndpoint": "<SONASH_ROOT>",
  "mode": "direct-apply",
  "phase": 5,
  "phaseStatus": "in-progress",
  "lastHeartbeat": "2026-04-21T14:47:22Z",
  "destinationGit": {
    "branch": "port/cas-skill",
    "startSHA": "abc123...",
    "lastCommitSHA": "def456...",
    "worktreeClean": true
  },
  "planPath": ".research/migration-skill/MIGRATION_PLAN.md",
  "planChecksum": "sha256:...",
  "gates": [
    { "id": "phase-5-entry", "answeredAt": "2026-04-21T14:30:05Z", "answer": "proceed", "reDisplayOnResume": true }
  ],
  "units": [
    {
      "id": "U001",
      "source": ".claude/skills/analyze/SKILL.md",
      "verdict": "sanitize",
      "status": "done",
      "commitSHA": "aaa111",
      "gateAnswers": { "sanitize-confirm": "proceed" },
      "filesWritten": [".claude/skills/analyze/SKILL.md"],
      "attempts": 1,
      "startedAt": "...",
      "completedAt": "..."
    },
    {
      "id": "U002",
      "source": ".claude/skills/recall/SKILL.md",
      "verdict": "reshape",
      "status": "in-progress",
      "gateAnswers": { "reshape-plan-confirm": "proceed" },
      "filesStaged": [".claude/skills/recall/SKILL.md"],
      "attempts": 1,
      "startedAt": "2026-04-21T14:47:00Z",
      "failureMode": null
    },
    { "id": "U003", "source": "scripts/cas/ingest.js", "verdict": "rewrite", "status": "pending" }
  ],
  "rollbackLog": [],
  "lastError": null
}
```

### State-preservation fields: **13 top-level + 11 per-unit = 24 total.**

Top-level: `schemaVersion`, `runId`, `direction`, `otherEndpoint`, `mode`, `phase`, `phaseStatus`, `lastHeartbeat`, `destinationGit`, `planPath`, `planChecksum`, `gates`, `units`, `rollbackLog`, `lastError` (15 if counting generously; 13 load-bearing).

Per-unit: `id`, `source`, `verdict`, `status`, `commitSHA`, `gateAnswers`, `filesWritten` or `filesStaged`, `attempts`, `startedAt`, `completedAt`, `failureMode` (11).

### Commit trailer convention

```
reshape(analyze): align with JASON-OS SKILL format

Migration-Unit: U001
Migration-Run: 2026-04-21T14-30-00_sonash-to-jasonos
Migration-Verdict: sanitize
```

Enables F10/F11 recovery via `git log --grep='Migration-Unit:'`.

### Write order (crash-safety)

1. Stage files (`git add`)
2. **Write `MIGRATION_STATE.json` with unit `status: "in-progress"`** (fsync)
3. `git commit` (with trailer)
4. **Write `MIGRATION_STATE.json` with unit `status: "done"` and commit SHA** (fsync)

Crash between 3 and 4 → F10 reconciliation path handles it. Crash between 2 and 3 → F9 resume re-asks gate, user either re-confirms and re-runs or denies and we roll back staged changes.

---

## 4. Resume semantics

### Entry path on `/migration` re-invocation

1. **Detect existing run:** Scan `.research/migration-skill/state/` for `MIGRATION_STATE.json` where `phaseStatus != "complete"` and `lastHeartbeat` within 30 days (tunable). Multiple candidate runs → menu per D26.
2. **Integrity check:**
   - JSON parse → F11 if fail
   - `planPath` checksum match → halt if plan edited mid-run; offer re-plan
   - `destinationGit.branch` still exists + `startSHA` reachable → halt if destination rewrote history; offer abort or re-baseline
3. **Reconcile state with git:** Walk `git log <startSHA>..HEAD --grep='Migration-Run: <runId>'`; any commit whose unit-id is not `done` in state file → F10 path (ask user to confirm auto-heal).
4. **Display resume context (R3-compliant):**
   ```
   Resuming migration-run 2026-04-21T14-30-00_sonash-to-jasonos
     Phase: 5 (active transformation)
     Units: 7 done, 1 in-progress, 12 pending, 0 failed
     Last gate answered: reshape-plan-confirm (U002)
     [prior answers shown for recall; confirmation will be re-asked]
   Continue? [Y / restart phase 5 / abort migration]
   ```
5. **Re-ask gate for in-progress unit (R3, never auto-advance):** Even though gate-memory shows prior "proceed," user must re-confirm.
6. **Roll forward** from the in-progress unit; all pending units replayed normally.

### Idempotency requirement

A resumed unit MUST be a no-op if already committed (per idempotent-pipeline best practice from Flink/dbt). Implementation: before applying transforms, diff staged content vs recorded `commitSHA` — if identical, skip with "already applied" message.

---

## 5. Comparable-patterns catalog

Seven best-in-class recovery UX patterns. Each row notes what `/migration` should borrow.

| System | Atomicity | State store | Resume primitive | Failure UX | What to borrow |
|--------|-----------|-------------|------------------|------------|----------------|
| **Alembic** | Per-revision (one migration file = one revision hash) | `alembic_version` table in DB (one row, current head) | `alembic upgrade <rev>` from current head; `alembic stamp <rev>` for manual reconciliation | Partial failure leaves DB inconsistent — user fixes manually, `stamp`s to last-good, fixes migration file, re-runs. No automatic rollback across multiple migrations. | Per-unit = per-revision; commit-trailer = `alembic_version` analog; stamp-to-last-good = F11 rebuild path |
| **Flyway** | Per-migration file (V1__, V2__, …) | `flyway_schema_history` table with `success` flag | `flyway migrate` skips `success=1` rows | `flyway repair` removes failed rows + realigns checksums. Known issue: repair clobbers repeatable-migration rows — cautionary tale for auto-heal. | Explicit `repair` command analog for F11; NEVER auto-heal without confirmation (R3) |
| **Rails migrations** | Per-migration timestamp | `schema_migrations` table | `db:migrate` runs pending; `db:migrate:status` lists up/down; `db:rollback STEP=n` | `********** NO FILE **********` warning when state-row references deleted migration — surfaces drift without auto-fixing. | Explicit status command for `/migration` (`/migration --status`); drift-surface-not-auto-fix posture |
| **git rebase** | Per-commit (cherry-pick atomic) | `.git/rebase-merge/` or `.git/rebase-apply/` directory with `todo`, `done`, `stopped-sha`, `orig-head` files | `git rebase --continue` / `--skip` / `--abort` trio | On conflict, halts with explicit instructions; user resolves, `git add`, `--continue`. Never silent. | **Strongest direct analog.** `/migration --continue / --skip / --abort` verb set; state dir mirrors `.git/rebase-merge/`; stopped-unit pointer = `stopped-sha` analog |
| **dbt retry** | Per-node (model/test/seed) | `target/run_results.json` manifest | `dbt retry` re-runs only `error`/`skipped` nodes from last invocation | Resumes from point-of-failure without re-running upstream. `--defer --state <path>` lets partial runs use production for unchanged deps. | Per-unit retry mechanism; `run_results.json` → `MIGRATION_STATE.json.units[].status` |
| **Terraform apply** | Per-resource | `terraform.tfstate` (JSON) | `terraform apply -replace=<addr>` atomic force-recreate; `-target=<addr>` for partial | Partial failure leaves state file with partial creations; `taint` was deprecated in 0.15.2 because state-mutate-then-apply was two-step and race-prone. `-replace` is atomic. | Prefer atomic one-shot commands (`/migration --replace-unit U007`) over state-mutation-then-action patterns |
| **Flink checkpointing** | Per-barrier (distributed snapshot) | Durable checkpoint store (S3, HDFS, local fs) | Restart from latest checkpoint; exactly-once semantics | Periodic async snapshots; on failure, restore state + replay from offset. Idempotent sink required. | Idempotency requirement for resumed units (§4); heartbeat + periodic state writes |

**Synthesis for `/migration`:**

- **Verbs from git rebase:** `--continue`, `--skip`, `--abort` are the clearest UX for user resume; adopt verbatim naming to leverage muscle memory.
- **State-as-single-source from Alembic/Flyway:** one JSON file, append-only where possible, never silently edit.
- **Point-of-failure resume from dbt retry:** completed units skipped by default; `--rerun-all` only on explicit user flag.
- **Drift surfaces from Rails:** `/migration --status` command shows done/pending/failed + any divergence between state and git log; never auto-fix.
- **Atomic replace from terraform:** `/migration --replace-unit U007` for redo-single-unit flows; avoids two-step state-edit-then-action.
- **Idempotency from Flink:** every re-applied unit MUST be a no-op if already at target state.

---

## 6. Interaction with D22/R3 and D8

- **R3 (gate memory aids, never replaces):** On resume, prior gate answers are SHOWN for recall but confirmation is RE-ASKED. The state file stores answers in `gateAnswers` for display only; the state-machine transition still requires a new confirmation.
- **D8 (nothing silent):** Every failure mode above surfaces to the user. No silent rollback, no silent skip, no silent auto-heal. F10 (split-brain) explicitly requires user confirmation even though the "right answer" is obvious.
- **D29 (local-only):** State file is the canonical truth; git history is the verification cross-check. No remote reconciliation logic needed.

---

## 7. Open questions for `/deep-plan`

1. Should plan-export mode (D26) also emit a `MIGRATION_STATE.json` template for the destination to fill in as it executes? Gives cross-repo resume at the cost of coupling.
2. `/migration --abort` semantics: `git reset --hard startSHA`? Risky per CLAUDE.md guardrails on destructive git ops. Alternative: leave commits, mark run `aborted`, let user `git reset` manually.
3. Agent retry budget per unit (currently proposed ≤ 2 per CLAUDE.md #9 analog) — is 2 the right number for reshape/rewrite agents, or should reshape get 3 given higher complexity?
4. Heartbeat frequency in `MIGRATION_STATE.json` — every unit? every N seconds during a unit? Matters for F9 stale-detection.
5. Commit-trailer parsing as sole F11 recovery path — robust enough, or should we mirror state to a second location (e.g., per-unit sidecar JSON in `state/units/U007.json`) for belt-and-suspenders?

---

## 8. Sources

**Local precedent (JASON-OS):**
- `<JASON_OS_ROOT>\.research\migration-skill\BRAINSTORM.md` §3 (D8, D22, D24, D26, D28, D29), §5 (Q8)
- `<JASON_OS_ROOT>\.claude\skills\checkpoint\SKILL.md` (state-file shape, local/MCP split)
- `<JASON_OS_ROOT>\.claude\skills\pre-commit-fixer\SKILL.md` (F2 handoff, `.claude/state/pre-commit-fixer-state.json`, 2-attempt rule, regression detection)
- `<JASON_OS_ROOT>\CLAUDE.md` §4 guardrails #9, #13, #14, #15 (failure-on-agent-empty, post-commit review, SKIP_REASON, 0-byte writes)

**Web:**
- Alembic failure recovery: https://github.com/sqlalchemy/alembic/issues/755 ; https://alembic.sqlalchemy.org/en/latest/tutorial.html
- Flyway repair: https://www.red-gate.com/hub/product-learning/flyway/flyways-repair-command-explained-simply ; https://www.red-gate.com/hub/product-learning/flyway/dealing-with-failed-sql-migrations-in-mariadb-or-mysql ; https://github.com/flyway/flyway/issues/2987 (repair corruption caveat)
- git rebase state: https://git-scm.com/docs/git-rebase ; https://www.atlassian.com/git/tutorials/rewriting-history/git-rebase
- Terraform taint/replace: https://developer.hashicorp.com/terraform/cli/state/taint ; https://developer.hashicorp.com/terraform/cli/commands/untaint ; https://spacelift.io/blog/terraform-taint
- dbt retry + defer: https://docs.getdbt.com/reference/commands/retry ; https://docs.getdbt.com/reference/node-selection/defer ; https://dbtc.dpguthrie.com/0.2/guide/restart_from_failure/
- Rails schema_migrations: https://guides.rubyonrails.org/active_record_migrations.html ; https://medium.com/@imrohitkushwaha2001/understanding-how-rails-tracks-migration-status-using-the-schema-migrations-table-968c3979cc3c
- Pipeline idempotency + checkpointing: https://nightlies.apache.org/flink/flink-docs-master/docs/dev/datastream/fault-tolerance/checkpointing/ ; https://www.prefect.io/blog/the-importance-of-idempotent-data-pipelines-for-resilience ; https://apxml.com/courses/intro-data-lake-architectures/chapter-3-ingestion-pipelines/idempotency-in-pipelines

---

**END D8-failure-recovery.md**
