# Resume Notes — cross-repo-movement-reframe

Pending amendments to fold into the plan when state-file recovery completes
and `/deep-plan cross-repo-movement-reframe` resumes.

**Why this file exists:** state files are gitignored and machine-local
(`.claude/state/deep-plan.<topic>.state.json`), so any new instruction issued
between machines while the state is en route would be lost otherwise. This
file is git-tracked under `.planning/` and travels with the rest of the plan
artifacts.

**Resume contract:** on resume, read this file FIRST, present the listed
amendments to the user, fold accepted ones into the appropriate batch (re-open
or prepend), then continue normal phase progression.

---

## A1 — Gitignored file analysis as a `/context-sync` responsibility

**Status:** RESOLVED 2026-04-25 — folded into Batch 2c (6 decisions, Q2C-1 through
Q2C-6). Q10 drift-record field count revised 7 → 8; Q18 machine-exclude mechanism
reframed as classifier-input. Cumulative decision count 35 → 41. See state file
`batch_2c_locked` and `batch_2c_meta` sections for the full decision record.

**Added:** Session 22 (2026-04-25)
**Source:** user instruction, after Session 22 hit the cross-locale state-file
gap firsthand.

**Trigger context:** Session 22 began with the user wanting to resume Phase 1
Batch 4. The canonical 35-decision state file
(`.claude/state/deep-plan.cross-repo-movement-reframe.state.json`) was missing
on the resume locale — it's gitignored, so it never moved when prior commits
were pushed. The cross-locale state gap that this entire plan exists to close
is the same gap blocking the planning of it. Recovery underway via manual
state-file transfer from the source locale.

**Instruction:** `/context-sync` plan must include analysis of gitignored
files — at minimum, surface what's there and classify each item, even if
the syncing decision for any given class is deferred to v1.1 or later.

**Concrete scope additions:**

1. **Inventory pass** — `/context-sync` enumerates all gitignored content
   reachable from the project root (respecting `.gitignore`, `.git/info/exclude`,
   and any nested ignore files). No "out of scope" framing per the
   `feedback_no_file_out_of_scope_sync_scans` tenet.
2. **Classification** — each gitignored item gets a class:
   - **machine-local-by-design** (e.g., logs that capture machine-specific
     state, `node_modules/`, build outputs, secrets)
   - **should-sync** (e.g., long-lived plan state files, decision records that
     happened to be gitignored, machine-local notes the user does want shared)
   - **ambiguous** (anything that doesn't cleanly fall into the first two)
3. **Surfacing rule** — ambiguous items MUST surface to the user; the
   existing "ask-on-new" mechanism from Batch 2 extends to cover them.
4. **Decision deferred to Phase 1 reopen:** does the actual syncing of
   should-sync items land in v1 (alongside the existing scan/normalize/sync
   pipeline) or v1.1 (analysis-only at v1, sync mechanism deferred)?

**Likely scope:** this re-opens Batch 2 (`/context-sync` specifics), since it
extends the data the companion is responsible for. It is NOT just a Batch 4
question. Re-opening implies the 14-field drift record schema and exclusion
rules from Batch 2 may need adjustment — specifically the
"machine-exclude via convention + explicit list + ask-on-new" decision needs
an inventory/analysis step ahead of it, and the drift-record fields may need
to capture gitignore-class.

**Affected decisions to revisit at resume:**
- Batch 2 decision on machine-exclude mechanism (does inventory/analysis
  precede exclusion?)
- Batch 2 drift-record 7 fields (does a gitignore-class field need to join,
  pushing toward 8?)
- Possibly Batch 3 ledger fields (does the 14-field ledger need a
  gitignored-source flag, or is gitignored-status purely a `/context-sync`
  concern?)

**Why this matters (the deeper why):** treating gitignored content as
"automatically machine-local" was the conceptual seam that broke in Session
22. A sync companion that only handles git-tracked stuff is a tool that
solves the easy half of the problem. The hard half is exactly the case Session
22 demonstrated: long-lived, decision-bearing, gitignored-by-historical-default
files that should travel but don't. Closing that seam is the difference
between `/context-sync` being a working companion and a half-tool.

**Bridge action taken in Session 22:** user is exploring a `.gitignore`
exception (`!.claude/state/deep-plan.*.state.json`) as a near-term workaround
to surface long-lived plan state files via git directly. If that bridge
lands, `/context-sync` retiring it becomes a closeout-phase task and a
/todo. If the bridge is rejected in favor of waiting for `/context-sync`,
this amendment becomes the canonical mechanism for handling these files.
Either way, the analysis pass is non-negotiable.
