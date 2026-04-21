# BRAINSTORM_WIP — /migration skill

> **SUPERSEDED 2026-04-20 session 2 Phase 4** by [BRAINSTORM.md](./BRAINSTORM.md). This WIP is preserved as the session-by-session ledger including reframe history (`/port` → `/migration`, foreign-mode antithesis, CAS examination, etc.). The canonical decision set (D1–D29 + R1–R4) and the 12 deep-research questions live in BRAINSTORM.md.

**Status:** WIP — Phase 1 (Diverge) substantively complete; preparing to exit Phase 1 into a light Phase 2 (Evaluate) with the caveat that `/deep-research` may reframe material decisions and a second brainstorm pass is permitted if needed.
**Date started:** 2026-04-20 (work locale, as `/port`)
**Renamed to `/migration`:** 2026-04-20 (home locale, session 2)
**Slug:** `migration-skill`
**Branch at capture:** `piece-3-labeling-mechanism`
**Companion files:** [TRANSCRIPT.md](./TRANSCRIPT.md) (verbatim session 1, uses old `/port` name), [RESUME.md](./RESUME.md) (updated to reflect current state)
**Prior todo now subsumed:** T28 (`/migrate skill` — named-target port) — same skill, earlier seed. T28 is being unified into this brainstorm.

---

## 1. Topic & origin

**Topic (user phrasing, session 1):** "a skill that identifies or is directed to a file, process, workflow, etc. in sonash in order to migrate it over to jason-os. what it entails, what resources (like the plan we're currently working on) it uses, research scope within the skill, agent use (custom possibly?), interactivity, etc."

**Reframes through the sessions:**

- **Session 1 Turn 2:** sync engine integral — `/sync` layer = information, this skill = decision + execution layer (WHO, WHAT, HOW).
- **Session 1 Turn 3:** renamed "migration" → **`/port`** (user: "this is a porting agent; migration just sounds sexier").
- **Session 2 Turn 5:** skill is **repo-agnostic** (not hardcoded SoNash↔JASON-OS), JASON-OS is always one endpoint, full bidirectional from v1.
- **Session 2 Turn 7:** "foreign mode" is antithetical — migration is **active transformation** (sanitize + **reshape** + **rewrite**), not passive description. Destination-idiom-adaptation is the skill's core work.
- **Session 2 Turn 8:** renamed back from `/port` → **`/migration`** (user: "migration is the name. change all references"). "This is heavy lifting" — matches the transformation-depth framing.

**Blocking dependencies (for execution, NOT for design/research/plan):**

- `/sync` engine (sync-mechanism Piece 5, unbuilt) — supplies known-pair data for JASON-OS↔SoNash migrations.
- **CAS port into JASON-OS** (not yet done) — supplies foreign-repo understanding machinery when migrating between JASON-OS and arbitrary external repos.
- **Other cross-skill integration points** (TBD — `/deep-research` must inventory).

Design proceeds now because `/migration`'s shape tells `/sync`, the CAS port, and other integrations what to expose.

---

## 2. Locked decisions

### Pre-CAS-examination (Session 1, Q1–Q10)

| #   | Axis                | Decision                                                                                                                    | Source        |
| --- | ------------------- | --------------------------------------------------------------------------------------------------------------------------- | ------------- |
| D1  | Migration unit      | **Multi-level**: file / workflow / concept, via interactive menu + conversational prose                                     | Q1 = d        |
| D2  | Trigger mode        | **Both** user-directed AND proactive-scan (menu offers both)                                                                | Q2 = c        |
| D3  | Interactivity shape | **Plan-then-execute** — planning artifact produced before any write                                                         | Q3 = a        |
| D4  | Agent approach      | Open — deferred to a follow-on `/deep-research` layer after this brainstorm                                                 | Q4 = open     |
| D5  | Research scope      | **In-house, no route-out** — pull elements of `/deep-research`, `/deep-plan`, `/convergence-loop` inward                    | Q5            |
| D6  | Success criteria    | **All four co-equal**: plan + research + execute + prove                                                                    | Q6            |
| D7  | Name (final)        | **`/migration`** — reopened from `/port`; migration better matches transformation-depth framing                              | Q7 → reopened |
| D8  | Hard rule           | **Nothing silent, EVER** — every verdict, sanitization, reshape, rewrite, ripple, commit requires explicit user confirmation | Q7            |
| D9  | Relation to `/sync` | **Consumer + side-by-side** — never re-implements sync's batch/bidirectional/label work                                     | Q7            |
| D10 | Unit-type handling  | **Separation** — research and plan are different levels per unit type; tracks live inside shared phase structure            | Q8            |
| D11 | Dropped direction   | **Direction 5 (thin wrapper) is out** — heavy-lifting work, not orchestration-only                                          | Q9            |
| D12 | Leading direction   | Hybrid with **Direction 1 bones** + freedoms from Directions 2 / 3 / 4                                                      | Q9            |
| D13 | Anti-goal (e)       | Not a replacement for `/deep-plan` or `/deep-research` at their own call-sites                                              | Q10e          |
| D14 | Anti-goal (f)       | Not mandatory — user can `/sync` a file without ever invoking `/migration`                                                  | Q10f          |
| D15 | Anti-goal (h)       | Works on unlabeled files (labels help, don't gate) — but route through `/sync` whenever `/sync` can supply data             | Q10h          |

### Session 2 additions (Q11 reframe + post-CAS)

| #   | Axis                               | Decision                                                                                                                                                                                                                | Source                     |
| --- | ---------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------- |
| D16 | Direction symmetry                 | **Full both-direction build from v1.** No "minimal reverse, grow with use." Self-dogfood is a test, not a design crutch.                                                                                                | Q11 answer                 |
| D17 | Endpoint scope                     | **Endpoint-bounded repo-agnostic.** JASON-OS is always one endpoint. Other endpoint = anything external. Not "any two repos." Parameters: `direction` (in/out) + `other-endpoint` (repo path or URL).                   | Q11 reframe                |
| D18 | Workshop posture                   | **JASON-OS is always the workshop AND always one endpoint.** `/migration` runs from here; artifacts (`MIGRATION_PLAN.md`, state) live here centrally regardless of direction.                                           | Q11 reframe + confirm      |
| D19 | Foreign-repo understanding         | **Locally-ported CAS** (with home-context assumptions reshaped-during-port into configurable target-repo params). No `--foreign-mode` flag. Additional blockers/integration points TBD by research.                     | Q11 CAS examination        |
| D20 | State rule R1                      | State machine tracks gates only; conversational prose is ephemeral commentary and does not drive state transitions.                                                                                                      | Q12 weave                  |
| D21 | Phase rule R2                      | Canonical arc = seven phases (0–6). Unit-type scoped skips/loops are documented behavior, not arc violations.                                                                                                            | Q12 weave                  |
| D22 | Confirmation rule R3               | Gate memory aids recall but never replaces confirmation. On resume, prior answers are shown as context; confirmation is always re-required.                                                                              | Q12 weave                  |
| D23 | Verdict legend (expanded)          | Six verdicts: `copy-as-is` / `sanitize` / **`reshape`** / **`rewrite`** / `skip` / `blocked-on-prereq`. `reshape` and `rewrite` are the active-transformation (heavy-lifting) verdicts.                                  | Reframe Turn 7             |
| D24 | Phase 5 content                    | Phase 5 (Execute) includes **active transformation**, not just file movement. Sanitize = regex + confirmation; reshape = structural rewrites against destination idioms (gated); rewrite may dispatch research mid-exec. | Reframe Turn 7             |
| D25 | Rule R4 (verdict-conditional skip) | Phase 3 skip is verdict-conditional. `copy-as-is` / `sanitize` may skip Phase 3. `reshape` / `rewrite` cannot — destination-idiom research is required regardless of unit type.                                          | Reframe Turn 7             |
| D26 | Output modes                       | Two modes, user-selected at a gate: **direct-apply** (edit destination repo directly, for simple ports to owned repos) / **plan-export** (write portable `MIGRATION_PLAN.md` for invocation from destination repo).     | Q11 caveat Turn 8          |
| D27 | Research scope expansion           | `/deep-research` following this brainstorm must inventory **all cross-skill integration points** across the SoNash ecosystem, not just CAS + `/sync`. Candidates from T28: `/pr-review`, `/label-audit`, S8 back-fill, `sanitize-error.cjs`. | Turn 8 + T28 context       |
| D28 | Iterative re-entry as norm         | **Brainstorm / deep-research / deep-plan re-entry is the norm, not the exception.** Triggers: research surfaces reframe → re-enter brainstorm; plan surfaces unknowns → re-enter research; execution surfaces design gaps → re-enter plan or brainstorm. Not a sequential pipeline; a loop. | Turn 10                    |
| D29 | v1 authority scope = local-only    | v1 is local-filesystem only — no remote-PR creation, no GitHub API, no cross-machine auth. Both endpoints must be locally-cloned. Research Q12 investigates local-auth shape. Remote/PR-creation explicitly future-scope. | Turn 10                    |

### Rules (R1–R4, reiterated)

| Rule   | Statement                                                                                                                                                                                                                                  |
| ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **R1** | Prose is ephemeral commentary; only gates change state. (D20)                                                                                                                                                                              |
| **R2** | Canonical arc + unit-scoped depth variation. (D21)                                                                                                                                                                                          |
| **R3** | Gate memory aids, never replaces, confirmation. (D22)                                                                                                                                                                                        |
| **R4** | Phase 3 skip is verdict-conditional (copy-as-is / sanitize may skip; reshape / rewrite may not). (D25)                                                                                                                                      |

---

## 3. Leading direction — Hybrid `/migration` (bones + freedoms + transformation layer)

**Bones (Direction 1):** seven-phase internal arc —

| Phase | Purpose                                                                                                              |
| ----- | -------------------------------------------------------------------------------------------------------------------- |
| 0     | Context — pull `/sync` registry + load JASON-OS context                                                              |
| 1     | Target pick — menu: file / workflow / concept / proactive-scan / resume                                              |
| 2     | Discovery — pre-migration analysis, ripple, sanitize/reshape/rewrite candidate identification                         |
| 3     | Research — conditional (R4): runs for reshape/rewrite verdicts and for unit types needing destination-idiom research |
| 4     | Plan — writes `MIGRATION_PLAN.md` artifact                                                                           |
| 5     | Execute — active transformation (sanitize + reshape + rewrite), staged, verdict gates (D24)                          |
| 6     | Prove — embedded convergence-loop verification                                                                       |

**Freedoms:**

- Unit-type tracks inside the shared phase structure (file / workflow / concept at different depths)
- Menu front door + menu-at-every-gate + conversational prose between gates (D3 gate catalog)
- Research posture scales with unit type AND verdict (R4)

**Output modes (D26):** direct-apply / plan-export, per-migration user choice.

**Component pieces integrated (all 15, per Q12 weave):**

- From D1: 1a seven-phase arc / 1b MIGRATION_PLAN.md / 1c CL in Prove / 1d gates require confirmation
- From D2: 2a menu front door / **2b state-machine transitions** (back-button, mid-state resume, gate memory) / 2c menu at every gate
- From D3: 3a conversational prose between gates / 3b menu + prose coexist / 3c named gate catalog (target-pick, verdict, sanitize, reshape, rewrite, ripple-accept, commit-accept, prove-report-accept) — **gate catalog expanded from 7 → 8 by splitting sanitize and reshape/rewrite into distinct gates under D23/D24**
- From D4: 4a unit-scaled research / 4b file-skip-Phase-3 (conditional under R4) / 4c workflow-deps-in-Discovery / 4d concept-multi-agent-loop / 4e Phase-3-loop-allowed

**Data dependencies (consumed from other JASON-OS surfaces once they exist):**

- `/sync` registry (Piece 5, pending) — inventory + labels + deps + scopes for JASON-OS↔SoNash
- Ported CAS (D19, pending) — foreign-repo understanding for arbitrary external repos
- Piece 3 catalog + `/label-audit` — pre/post state verification (T28 hint)
- `/pr-review` — cross-repo PR coordination (T28 hint)
- `scripts/lib/sanitize-error.cjs` — sanitization helper (T28 hint)
- `MIGRATION_PLAN.md` row schema + verdict legend (new D23) — canonical artifact format
- MI-1 pre-port analysis spec (`feedback_pre_analysis_before_port.md`) — inherited rule
- Discovery inventories: `.research/sync-mechanism/piece-1a-discovery-scan-jason-os/` + `piece-1b-discovery-scan-sonash/`
- Whichever `/deep-plan` is active when `/migration` is invoked — current plan context

---

## 4. Directions considered

| #   | Name                                   | Survives? | Role                                        |
| --- | -------------------------------------- | --------- | ------------------------------------------- |
| 1   | Deep-plan-shaped phases                | YES       | Bones of leading direction                  |
| 2   | Menu-driven wizard (state-machine)     | YES       | Contributes UX + state-machine freedoms     |
| 3   | Hybrid (menu + conversational)         | YES       | Contributes gate/conversation interleave    |
| 4   | Research-first                         | YES       | Contributes unit-scaled research posture    |
| 5   | Thin composition layer                 | DROPPED   | Not heavy-lifting enough (D11)              |

Phase 2 will do a LIGHT tradeoff evaluation of the leading hybrid vs. 1/2/3/4 baselines — not a final convergence. Research may reframe; re-entering brainstorm after `/deep-research` is explicitly permitted.

---

## 5. Resolved open questions

### Q11 — Bi-directional path

**Resolved:** Full both-direction build-out (D16). Endpoint-bounded agnostic (D17). Reframe: migration is active transformation, not passive copy (D23/D24/D25).

### Q12 — Any direction to re-open or add?

**Resolved:** No new direction added. Instead, decomposed Directions 1–4 into 15 component pieces and integrated all (pre-tick list in §3). Three weave tensions identified and resolved by Rules R1/R2/R3. Verdict-conditional Phase 3 skip captured as R4. Reframe later added verdict-legend expansion + Phase 5 transformation content (D23/D24) without disturbing the 15-component integration.

---

## 6. Anti-goals (locked)

- NOT a second `/sync` (no batch / bidirectional / continuous / label-driven work as `/sync`'s job)
- NEVER silent — every decision requires explicit user confirmation (D8)
- NEVER reshapes or rewrites without permission (strengthened by D23/D24)
- Not a replacement for `/deep-plan` or `/deep-research` at their own call-sites (D13)
- Not mandatory — `/sync` alone is allowed (D14)
- Not a dumping ground — stays focused on migration work; no creep into debt tracking / general refactoring
- Works on unlabeled files, but always routes through `/sync` when `/sync` can supply data (D15)
- NOT a foreign-mode wrapper around CAS — CAS gets reshaped during its own port into JASON-OS (D19)

---

## 7. Next actions

### Phase 2 (light Evaluate) — THIS SESSION

Per the caveat that research may reframe: run tradeoff analysis at a brainstorm level only (strengths / weaknesses / assumptions / feasibility per direction, contrarian checkpoint, grounding check). Do NOT treat Phase 2 as final.

- Dispatch `contrarian-challenger` agent on the leading hybrid (complexity justifies it: 5+ directions considered, foreign dependencies, active-transformation semantics).
- Anti-goal violation check on the hybrid.
- Grounding check — verify any unverified premises.

### Phase 3 (Converge) — THIS SESSION

User selects final direction for THIS brainstorm layer (not eternally). Captured rationale + explicit list of questions to route to `/deep-research`.

### Phase 4 (Crystallize) — THIS SESSION

Final `BRAINSTORM.md` replacing this WIP. Convergence-loop verify. Routing menu — primary recommendation will be `/deep-research` first, then possibly return to brainstorm, then `/deep-plan`.

### Deep-research scope (12 questions — final list, also in BRAINSTORM.md §5)

1. Agent approach (D4 deferred) — custom vs. reuse of `deep-research-searcher` / `Explore` / `contrarian-challenger` / `Plan`. Parallel-dispatch patterns for reshape research.
2. Full cross-skill integration inventory (D27) — every SoNash skill `/migration` may call on. Seeds: `/pr-review`, `/label-audit`, S8 back-fill, `sanitize-error.cjs`.
3. Complete blocker inventory for JASON-OS execution readiness. CAS + `/sync` known; find the rest. Rank by shift-risk.
4. Direct-apply vs. plan-export mechanics (D26) — how a portable plan is generated and how it gets invoked from the destination repo.
5. Reshape / rewrite pipeline (D23/D24) — verdict-assignment heuristics, idiom detection, transformation primitives, gate design.
6. CAS port scope — surgical-rewrite list to convert CAS home-context coupling into configurable target-repo parameters.
7. **Skill decomposition analysis** — monolithic vs. primary+ancillary (CAS-style). Candidate decompositions: `/migration` + `/migration-scan` + `/migration-reshape` + `/migration-prove`; or `/migration` + `/repo-profile` + `/migration-export`. Invocation-contract design.
8. **Failure / recovery semantics for active transformation** — Phase 5 mid-execute failure modes (unforeseen idiom, pre-commit rejection, weird branch state, mid-flow user denial). Partial-rollback, checkpoint-per-gate, per-file vs. per-batch failure isolation.
9. **Re-port / diff-port semantics** — once X is ported in then improved, how do improvements flow back? Fresh `/migration` or diff-port mode? Same for fix-only-pull.
10. **Self-dogfood concrete success criteria** — what does "successful `/migration` on `/migration`" observably mean? Specify the actual checks.
11. **Process meta-ledger** — given D28, is BRAINSTORM_WIP / RESEARCH_OUTPUT / PLAN enough to keep multi-loop iterations coherent, or do we need a meta-ledger above them tracking which-iteration-decided-what?
12. **Authority + permissions model (local scope per D29)** — local filesystem write semantics; worktree handling; Windows-ACL specifics; credential-manager interaction; dirty-destination-state behavior.

### Permitted re-entry

If `/deep-research` surfaces findings that materially reframe these decisions, re-enter `/brainstorm migration-skill` before `/deep-plan`. User-confirmed at Turn 8: "if we need to come back into brainstorm after deep-research, thats fine, if its necessary."

---

**See also:**

- [TRANSCRIPT.md](./TRANSCRIPT.md) — verbatim session 1 (uses old `/port` name)
- [RESUME.md](./RESUME.md) — updated resume pointer for any future sessions
- `.planning/todos.jsonl` — T28 (subsumed; update pending)
- `.planning/jason-os-mvp/PORT_ANALYSIS.md` — existing manual ledger (prior art; name should stay PORT_ANALYSIS per MI-1 feedback convention, not be renamed to MIGRATION_ANALYSIS)
- `.research/sync-mechanism/BRAINSTORM.md` — 5-piece architecture (upstream context)
- `.research/sync-mechanism/piece-1a-discovery-scan-jason-os/` + `piece-1b-discovery-scan-sonash/` — data sources
- SoNash CAS ecosystem (`C:\Users\jason\Workspace\dev-projects\sonash-v0\.claude\skills\{analyze,document-analysis,media-analysis,recall,repo-analysis,synthesize}`, `.research/content-analysis.db`, `scripts/cas/`, `.planning/{content-analysis-system,creator-view-upgrade,synthesis-consolidation}/`) — the candidate port target underlying D19
