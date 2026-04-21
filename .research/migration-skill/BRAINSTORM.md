# BRAINSTORM — /migration skill

**Status:** Phase 4 crystallized. Direction converged on Hybrid (form to be resolved by `/deep-research` and possibly a re-entry to brainstorm).
**Date:** 2026-04-20 (session 2 home locale; supersedes session-1 `/port` brainstorm)
**Slug:** `migration-skill`
**Companion files:** [BRAINSTORM_WIP.md](./BRAINSTORM_WIP.md) (full session-by-session ledger), [TRANSCRIPT.md](./TRANSCRIPT.md) (verbatim session-1, `/port`-era), [RESUME.md](./RESUME.md) (pickup guide)

---

## 1. Topic

A heavy-lifting skill `/migration` that moves files / workflows / concepts between **JASON-OS and any external repo** (always with JASON-OS as one endpoint). Migration is **active transformation** — sanitize + reshape + rewrite — adapting source artifacts to fit the destination's idioms, not passive copy.

Origin: SoNash → JASON-OS porting need. Generalized through brainstorm to repo-agnostic-but-endpoint-bounded.

---

## 2. Chosen direction — Hybrid

The Hybrid `/migration` integrates four direction families plus the active-transformation reframe layer. Form to be resolved by research; bones agreed.

### Bones (from Direction 1) — seven-phase internal arc

| Phase | Purpose                                                                                                            |
| ----- | ------------------------------------------------------------------------------------------------------------------ |
| 0     | **Context** — pull `/sync` registry + load JASON-OS context                                                        |
| 1     | **Target pick** — menu: file / workflow / concept / proactive-scan / resume                                        |
| 2     | **Discovery** — pre-migration analysis, ripple, sanitize/reshape/rewrite candidate identification                  |
| 3     | **Research** — verdict-conditional (R4); runs for reshape/rewrite verdicts and unit types needing destination idioms |
| 4     | **Plan** — writes `MIGRATION_PLAN.md` artifact                                                                     |
| 5     | **Execute** — active transformation (sanitize + reshape + rewrite), staged, verdict gates                          |
| 6     | **Prove** — embedded convergence-loop verification                                                                 |

### Freedoms

- Unit-type tracks live inside the shared phase structure (file / workflow / concept at different depths)
- Menu front door + menu-at-every-gate + conversational prose between gates
- Research posture scales with unit type AND verdict
- Two output modes: direct-apply (edit destination) / plan-export (write portable plan invocable in destination)
- State machine tracks gates, mid-state resume, gate memory aids confirmation

---

## 3. Locked decisions (D1–D29)

### Skill-shape decisions

| #     | Axis                  | Decision                                                                                                                                                                                                |
| ----- | --------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| D1    | Migration unit         | Multi-level: file / workflow / concept                                                                                                                                                                  |
| D2    | Trigger mode          | Both user-directed AND proactive-scan                                                                                                                                                                   |
| D3    | Interactivity shape   | Plan-then-execute — planning artifact (`MIGRATION_PLAN.md`) before any write                                                                                                                            |
| D4    | Agent approach        | OPEN — deferred to research                                                                                                                                                                             |
| D5    | Research scope        | In-house, no route-out — pull from `/deep-research`, `/deep-plan`, `/convergence-loop` inward                                                                                                            |
| D6    | Success criteria      | Plan + research + execute + prove, all four co-equal                                                                                                                                                    |
| **D7**| **Name**              | **`/migration`** — final (reopened from `/port`; matches transformation-depth framing)                                                                                                                  |
| D8    | Hard rule             | Nothing silent, ever — every verdict, sanitization, reshape, rewrite, ripple, commit requires explicit user confirmation                                                                                |
| D9    | Relation to `/sync`   | Consumer + side-by-side — never re-implements sync's batch / bidirectional / continuous / label work                                                                                                    |
| D10   | Unit-type handling    | Separation — research and plan are different levels per unit type; tracks live inside shared phase structure                                                                                            |
| D11   | Dropped direction     | Direction 5 (thin wrapper) is out — heavy-lifting work, not orchestration-only                                                                                                                          |
| D12   | Leading direction     | Hybrid (Direction 1 bones + Directions 2/3/4 freedoms)                                                                                                                                                  |
| D13   | Anti-goal             | Not a replacement for `/deep-plan` or `/deep-research` at their own call-sites                                                                                                                          |
| D14   | Anti-goal             | Not mandatory — user can `/sync` a file without ever invoking `/migration`                                                                                                                              |
| D15   | Anti-goal             | Works on unlabeled files (labels help, don't gate); routes through `/sync` whenever `/sync` can supply data                                                                                             |

### Direction + endpoint decisions (Session 2)

| #     | Axis                          | Decision                                                                                                                                                                                                |
| ----- | ----------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **D16** | Direction symmetry          | **Full both-direction build from v1** — both directions first-class. Self-dogfood is a test, not a design crutch.                                                                                        |
| **D17** | Endpoint scope              | **Endpoint-bounded repo-agnostic** — JASON-OS is always one endpoint; other endpoint is anything external. Parameters: `direction` (in/out) + `other-endpoint` (path or URL).                            |
| **D18** | Workshop posture            | JASON-OS is always the workshop AND always one endpoint. `/migration` runs from here; artifacts (`MIGRATION_PLAN.md`, state) live here centrally regardless of direction.                               |
| **D19** | Foreign-repo understanding  | Locally-ported CAS (with home-context assumptions reshaped during the CAS port itself into configurable target-repo parameters). **No `--foreign-mode` flag.** Other blockers TBD by research.          |

### Weave + reframe rules

| #     | Axis                              | Decision                                                                                                                                                                                              |
| ----- | --------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| D20   | State rule R1                     | State machine tracks gates only; conversational prose is ephemeral commentary and does not drive state transitions.                                                                                    |
| D21   | Phase rule R2                     | Canonical arc = seven phases (0–6). Unit-type scoped skips/loops are documented behavior, not arc violations.                                                                                          |
| D22   | Confirmation rule R3              | Gate memory aids recall; never replaces confirmation. On resume, prior answers shown as context; confirmation is always re-required.                                                                    |
| **D23** | Verdict legend (expanded 5→6)   | `copy-as-is` / `sanitize` / **`reshape`** / **`rewrite`** / `skip` / `blocked-on-prereq`. `reshape` and `rewrite` are the active-transformation verdicts.                                              |
| **D24** | Phase 5 content                 | Phase 5 includes active transformation, not just file movement. Sanitize = regex + confirmation. Reshape = structural rewrites against destination idioms (gated). Rewrite may dispatch research mid-execute. |
| D25   | Verdict-conditional skip R4       | Phase 3 skip is verdict-conditional. `copy-as-is` / `sanitize` may skip. `reshape` / `rewrite` may not — destination-idiom research required regardless of unit type.                                  |
| **D26** | Output modes                    | Two modes user-selected at a gate: **direct-apply** (edit destination directly, for simple owned-repo ports) / **plan-export** (write portable `MIGRATION_PLAN.md` for invocation in destination).      |
| D27   | Research scope expansion          | Deep-research must inventory all cross-skill integration points across SoNash, not just CAS + `/sync`. Seed candidates: `/pr-review`, `/label-audit`, S8 back-fill, `sanitize-error.cjs`.               |

### Process + scope decisions (this turn)

| #     | Axis                              | Decision                                                                                                                                                                                              |
| ----- | --------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **D28** | Iterative re-entry              | **Brainstorm / deep-research / deep-plan re-entry is the norm, not the exception.** Triggers: research surfaces material reframe → re-enter brainstorm; plan surfaces unknowns → re-enter research; execution surfaces design gaps → re-enter plan or brainstorm. Not a sequential pipeline; a loop. |
| **D29** | v1 authority scope              | **v1 is local-filesystem only** — no remote-PR creation, no GitHub API, no cross-machine auth. Both endpoints must be locally-cloned. Research question 12 investigates the local-auth shape (filesystem permissions, worktree handling, credential-manager interaction). Remote/PR-creation modes are explicitly future-scope. |

### Summary rules

| Rule   | Statement                                                                                                                                              |
| ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **R1** | Prose is ephemeral commentary; only gates change state. (D20)                                                                                           |
| **R2** | Canonical 7-phase arc + unit-scoped depth variation. (D21)                                                                                              |
| **R3** | Gate memory aids, never replaces, confirmation. (D22)                                                                                                    |
| **R4** | Phase 3 skip is verdict-conditional (copy-as-is / sanitize may skip; reshape / rewrite may not). (D25)                                                  |

---

## 4. Anti-goals (locked)

- NOT a second `/sync` (no batch / bidirectional / continuous / label-driven work as `/sync`'s job)
- NEVER silent — every decision requires explicit user confirmation (D8)
- NEVER reshapes or rewrites without permission (strengthened by D24)
- Not a replacement for `/deep-plan` or `/deep-research` at their own call-sites (D13)
- Not mandatory — `/sync` alone is allowed (D14)
- Not a dumping ground — stays focused on migration work; no creep into debt tracking / general refactoring
- Works on unlabeled files; routes through `/sync` when `/sync` can supply data (D15)
- NOT a foreign-mode wrapper around CAS — CAS gets reshaped during its own port into JASON-OS (D19)
- NOT a remote / PR-creation tool in v1 — local-filesystem only (D29)

---

## 5. Open questions for `/deep-research`

Twelve questions, scoped for the deep-research engine. Numbered for traceability.

1. **Agent approach** (D4 deferred). Custom agents or reuse of existing (`deep-research-searcher`, `Explore`, `contrarian-challenger`, `Plan`)? Parallel-dispatch patterns for reshape research? Per-phase agent roster?
2. **Cross-skill integration inventory** (D27 expansion). Every SoNash skill `/migration` may call on, not just CAS + `/sync`. Seeds: `/pr-review`, `/label-audit`, S8 back-fill, `sanitize-error.cjs`. Map the full ecosystem.
3. **Complete blocker inventory** for JASON-OS execution readiness. CAS + `/sync` are known. What else must exist or be ported in before `/migration` can execute? Rank by likely-shift risk per the contrarian flag.
4. **Direct-apply vs. plan-export mechanics** (D26). For plan-export: technically how is a portable `MIGRATION_PLAN.md` generated such that it can be invoked from the destination repo? Self-contained? Dependent on `/migration` existing in destination too?
5. **Reshape / rewrite pipeline design** (D23/D24). Verdict-assignment heuristics. Idiom detection. Transformation primitives. Gate design for user oversight. What does this layer LOOK like operationally?
6. **CAS port scope.** What changes during CAS's own port into JASON-OS to resolve the home-context coupling Agent 1 flagged? Configurable target-repo parameters where home-repo assumptions currently are. What's the surgical-rewrite list?
7. **Skill decomposition analysis.** Monolithic `/migration` vs. primary router + ancillary skills (CAS-style). Candidate decompositions: `/migration` + `/migration-scan` + `/migration-reshape` + `/migration-prove`; or `/migration` + `/repo-profile` + `/migration-export`. CAS as precedent — what works, what breaks. Invocation-contract design for primary→ancillary.
8. **Failure / recovery semantics for active transformation.** Phase 5 mid-execute failure modes: unforeseen destination idiom, pre-commit rejection, weird destination-branch state, mid-flow user denial. Partial-rollback? Checkpoint-per-gate? Per-file vs. per-batch failure isolation?
9. **Re-port / diff-port semantics.** Once X is ported in once, then improvements happen on either side, then those improvements should flow back. Is this a fresh `/migration` invocation or a "diff-port" mode? Same question for fix-only-pull (SoNash fixes a bug in X, JASON-OS wants only the fix). Likely use case from session 2 reframe.
10. **Self-dogfood concrete success criteria.** `/migration` on `/migration` was framed as proof-out in session 1. After research surfaces implementation shape, what does "successful self-dogfood" observably mean? Candidate criteria: produces own MIGRATION_PLAN.md targeting SoNash; resulting plan executes cleanly in SoNash; ported `/migration` in SoNash runs and produces structurally identical results to JASON-OS sibling. Specify the actual checks.
11. **Process meta-ledger.** Given D28 (iterative re-entry as norm), is the existing BRAINSTORM_WIP / RESEARCH_OUTPUT / PLAN structure enough to keep multi-loop iterations coherent? Or do we need a META-LEDGER above them tracking which-iteration-decided-what, with re-entry triggers explicit? JASON-OS-meta question that surfaces because of `/migration`'s expected back-and-forth.
12. **Authority + permissions model (local scope per D29).** Local filesystem write between two locally-cloned repos. What permission shape: read-source + write-destination? Worktree handling (working on a worktree vs. main checkout)? Windows-ACL specifics? Interaction with credential managers (does direct-apply need any auth at all if everything is local)? What happens on dirty destination state?

### Research caveats (per user direction)

- **Don't cap agent counts** — allocation formula is a floor, not a ceiling (per `feedback_no_research_caps`).
- **Verify all premises** — Phases 3-5 of `/deep-research` are mandatory (per `feedback_deep_research_phases_mandatory`).
- **Re-entry to brainstorm is permitted and expected** if research surfaces material reframes (D28).

---

## 6. Dependencies + blockers

**For execution (NOT for design / research / plan):**

| Dependency                                | Status                  | Owner                                                             |
| ----------------------------------------- | ----------------------- | ----------------------------------------------------------------- |
| `/sync` engine (sync-mechanism Piece 5)   | Unbuilt in JASON-OS     | sync-mechanism multi-piece project (own brainstorm exists)         |
| Ported CAS in JASON-OS                    | Unbuilt; CAS in SoNash   | The CAS port may itself be `/migration`'s first big real job (self-dogfood variant) OR a precursor milestone — research to recommend |
| Other cross-skill integrations            | TBD                     | Research question 2 (D27 inventory)                                |

**For design / research / plan:** **None.** Design proceeds now; the shape of `/migration` informs what `/sync`, the CAS port, and other dependencies must expose.

---

## 7. Process expectations (D28)

The path from here is a loop, not a pipeline:

```
brainstorm (this) → /deep-research → [optional re-entry to brainstorm if reframe] → /deep-plan → [optional re-entry to research if unknowns] → execute
                                                                                                                                                  ↓
                                                                                                                              [optional re-entry to plan or brainstorm if execution surfaces gaps]
```

Each re-entry is normal. Update this BRAINSTORM.md (or write a successor with version suffix) on re-entry; never silently shift decisions.

---

## 8. Routing — recommended next action

```
1. /deep-research migration-skill   ← RECOMMENDED — run all 12 questions
2. Direct to /deep-plan              — only if you want to skip research and plan against current decisions (NOT recommended; 5 of 29 decisions are research-deferred)
3. Both, then re-enter brainstorm    — research → decide if a brainstorm reframe is needed → /deep-plan
4. Save and continue later           — committed artifacts persist; resume via /brainstorm migration-skill
```

**Strong recommendation: option 1.** The skill design has too many research-flagged uncertainties (D4, D19, D27, plus questions 4-12) to plan well without research first. After research, re-evaluate whether a brainstorm re-entry is warranted before `/deep-plan`.

---

## 9. Pointers

- [BRAINSTORM_WIP.md](./BRAINSTORM_WIP.md) — full session-by-session ledger with reframe history
- [TRANSCRIPT.md](./TRANSCRIPT.md) — verbatim session 1 (`/port`-era)
- [RESUME.md](./RESUME.md) — pickup guide for next session
- `.planning/todos.jsonl` T28 — original `/migrate` todo, now unified into this brainstorm
- `.planning/jason-os-mvp/PORT_ANALYSIS.md` — manual prior-art ledger (existing concept; unrelated to `/migration` skill name)
- `.research/sync-mechanism/BRAINSTORM.md` — 5-piece architecture; Piece 5 = `/sync`
- `.research/sync-mechanism/piece-1a-discovery-scan-jason-os/` + `piece-1b-discovery-scan-sonash/` — discovery inventories ready for research
- SoNash CAS ecosystem: `<SONASH_ROOT>\.claude\skills\{analyze,document-analysis,media-analysis,recall,repo-analysis,synthesize}`, `.research/{content-analysis.db,knowledge.sqlite}`, `scripts/cas/`, `.planning/{content-analysis-system,creator-view-upgrade,synthesis-consolidation}/`
