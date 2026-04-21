# BRAINSTORM_WIP — /port skill

**Status:** WIP — Phase 1 (Diverge) complete through direction-generation; awaiting Q11 / Q12 before Phase 2 (Evaluate)
**Date started:** 2026-04-20
**Slug:** `port-skill`
**Branch at capture:** `piece-3-labeling-mechanism`
**Companion files:** [TRANSCRIPT.md](./TRANSCRIPT.md) (verbatim session), [RESUME.md](./RESUME.md) (home-session pickup guide)

---

## 1. Topic & origin

**Topic (user phrasing):** "a skill that identifies or is directed to a file, process, workflow, etc. in sonash in order to migrate it over to jason-os. what it entails, what resources (like the plan we're currently working on) it uses, research scope within the skill, agent use (custom possibly?), interactivity, etc."

**Reframe during session:**
- **User Turn 2:** sync engine will be *integral* to this skill. `/sync` layer = the information; this skill = the decision + execution layer (WHO, WHAT, HOW).
- **User Turn 3:** rename from "migration" → **`/port`** (user: "this is a porting agent; migration just sounds sexier").

**Blocking dependency:** Skill cannot be *completed* until the `/sync` engine (sync-mechanism Piece 5) lands — but design can and should start now because `/port` tells `/sync` what it must expose.

---

## 2. Locked decisions (from Q1–Q10)

| # | Axis | Decision | Source |
|---|------|----------|--------|
| D1 | Migration unit | **Multi-level**: file / workflow / concept, via interactive menu + conversational prose | Q1 = d |
| D2 | Trigger mode | **Both** user-directed AND proactive-scan (menu offers both) | Q2 = c |
| D3 | Interactivity shape | **Plan-then-execute** — planning artifact produced before any write | Q3 = a |
| D4 | Agent approach | Open — deferred to a follow-on `/deep-research` layer after this brainstorm | Q4 = open |
| D5 | Research scope | **In-house, no route-out** — pull elements of `/deep-research`, `/deep-plan`, `/convergence-loop` *inward* | Q5 |
| D6 | Success criteria | **All four co-equal**: plan + research + execute + prove, in one skill | Q6 |
| D7 | Name | **`/port`** (not `/migrate`) — this is a porting skill | Q7 commentary |
| D8 | Hard rule | **Nothing silent, EVER** — every verdict, sanitization, redesign, ripple, commit requires explicit user confirmation | Q7 |
| D9 | Relationship to `/sync` | **Consumer + side-by-side** — never re-implements sync's batch/bidirectional/label work | Q7 |
| D10 | Unit-type handling | **Separation** — research and plan are *different levels* per unit type; tracks live inside shared phase structure | Q8 |
| D11 | Dropped direction | **Direction 5 (thin wrapper) is out** — this is heavy-lifting work, not orchestration-only | Q9 |
| D12 | Leading direction | Hybrid with **Direction 1 bones** + freedoms from Directions 2 / 3 / 4 | Q9 |
| D13 | Anti-goal (e) | Not a replacement for `/deep-plan` or `/deep-research` at their own call-sites | Q10e = true |
| D14 | Anti-goal (f) | Not mandatory — user can `/sync` a file without ever invoking `/port` | Q10f = true |
| D15 | Anti-goal (h) | Works on unlabeled files (labels help, don't gate) — **but route through `/sync` whenever `/sync` can supply the data** | Q10h = true-with-clause |

---

## 3. Leading direction — Hybrid `/port`

**Bones (from Direction 1):** six-phase internal arc inside the skill —

| Phase | Purpose |
|-------|---------|
| 0 | Context — pull `/sync` registry data; load current plan context |
| 1 | Target pick — menu: file / workflow / concept / proactive-scan / resume |
| 2 | Discovery — inline pre-port analysis, ripple, sanitization needs |
| 3 | Research — inline mini-research when equivalents are unclear |
| 4 | Plan — writes `PORT_PLAN.md` artifact for the target |
| 5 | Execute — staged, verdict gates per item |
| 6 | Prove — embedded convergence-loop verification |

**Freedoms:**

- **(from D2)** Unit-type tracks live *inside* the shared phase structure. Each phase runs at a different depth depending on unit:
  - File → Discovery = regex + grep + deps (minutes); Research often skipped.
  - Workflow → Discovery = multi-file dependency mapping; Research = equivalents for missing pieces.
  - Concept → Discovery = light; Research = multi-agent, possibly looped before Plan.
- **(from D3)** Menu front door + menu-at-every-gate + conversational prose between gates. Gates: target-pick, verdict, sanitization choice, redesign choice, ripple-accept, commit-accept, prove-report-accept.
- **(from D4)** Research posture scales with unit type — concept ports may loop Phase 3 before touching Phase 4; file ports may skip Phase 3 entirely.

**Data dependencies (consumed from other JASON-OS surfaces):**

- `/sync` registry (Piece 5) — inventory + labels + deps + scopes
- `PORT_ANALYSIS.md` row schema + verdict legend (`copy-as-is` / `sanitize-then-copy` / `redesign` / `skip` / `blocked-on-prereq`)
- MI-1 pre-port analysis spec (`feedback_pre_analysis_before_port.md`)
- Extended pre-analysis regex (D21 in jason-os-mvp DECISIONS)
- Discovery inventories: `.research/sync-mechanism/piece-1a-discovery-scan-jason-os/` + `piece-1b-discovery-scan-sonash/`
- Current plan context (whichever `/deep-plan` is active when `/port` is invoked)

---

## 4. Directions considered (for Phase 2 evaluation)

| # | Name | Survives to Phase 2? |
|---|------|----------------------|
| 1 | Deep-plan-shaped phases | YES — bones of leading direction |
| 2 | Menu-driven wizard (state-machine) | YES — influences menu-UX freedom |
| 3 | Hybrid (menu + conversational) | YES — influences gate-UX freedom |
| 4 | Research-first | YES — influences unit-scaled research posture |
| 5 | Thin composition layer | DROPPED (D11) — not heavy-lifting enough |

Phase 2 will evaluate the leading hybrid against 1/2/3/4 as baselines and run the contrarian checkpoint.

---

## 5. Open questions — not yet answered

### Q11 — Bi-directional path (was raised; user wants discussion)

User wrote: "g- we need to discuss the challenges in making it bi-directional because it sounds like a good idea in theory but building it out this way then using thsi skill on itself may be a way to prove it out."

**Three paths on the table:**

- **(i) Directional v1, bidirectional v2.** Build SoNash→JASON-OS only for v1. Dogfood via `/sync` or manual one-off. Cheapest v1; proof-out deferred.
- **(ii) Directional core, reverse mode gated.** Primary SoNash→JASON-OS; scaffold `--reverse` (or menu: "direction") flag from day one. Reverse starts minimal (self-dogfood), expands with learnings. Medium cost; early self-test.
- **(iii) True bidirectional from v1.** Both directions first-class; per-direction verdict legends, scan regexes, menus. Highest cost; highest asymmetry-risk; highest `/sync` overlap.

**Bi-directional challenges already surfaced (for the discussion):**

1. **Asymmetric work per direction.** SoNash→JASON-OS = *strip*; JASON-OS→SoNash = *inject*. Different verdict legends, different regexes, different research questions.
2. **`/sync` overlap tension.** `/sync` is already bidirectional; bidirectional `/port` on the JASON-OS→SoNash path competes with `/sync` most directly.
3. **Verdict-legend divergence.** Current verdicts are SoNash→JASON-OS specific. Reverse needs new vocabulary (`inject-specifics`, `re-couple`, `no-analog-yet`).
4. **Labels flip meaning.** "Universal" in JASON-OS may need de-universalization to land in SoNash.

### Q12 — Any direction to re-open or add before Phase 2?

Not yet answered. Default: proceed with Directions 1–4 as baselines + leading hybrid.

---

## 6. Anti-goals (locked)

- NOT a second `/sync` (no batch / bidirectional / continuous / label-driven work as `/sync`'s job)
- NEVER silent — every decision requires explicit user confirmation
- NEVER redesigns without permission
- Not a replacement for `/deep-plan` or `/deep-research` at their own call-sites (D13)
- Not mandatory — `/sync` alone is allowed (D14)
- Not a dumping ground — stays focused on porting; no creep into debt tracking / general refactoring
- Works on unlabeled files, but always routes through `/sync` when `/sync` can supply data (D15)

---

## 7. Next actions

1. User answers **Q11** (bi-directional path) and **Q12** (directions to re-open/add).
2. Skill proceeds to **Phase 2 (Evaluate)**: tradeoff analysis of leading hybrid vs. Directions 1/2/3/4; contrarian checkpoint (possibly dispatch `contrarian-challenger` agent given 4-direction evaluation); anti-goal violation check; grounding check.
3. **Phase 3 (Converge)**: user selects final direction + captures rationale + open questions for downstream.
4. **Phase 4 (Crystallize)**: final `BRAINSTORM.md` written (replacing this WIP), convergence-loop verification, routing menu presented.
5. Downstream follow-on: user has signaled a `/deep-research` layer after this brainstorm (specifically to cover agent approach — Q4, which was deferred).

---

**See also:**
- [TRANSCRIPT.md](./TRANSCRIPT.md) — verbatim session
- [RESUME.md](./RESUME.md) — pickup instructions for next Claude Code session
- `.planning/jason-os-mvp/PORT_ANALYSIS.md` — existing manual ledger (prior art)
- `.research/sync-mechanism/BRAINSTORM.md` — 5-piece architecture (upstream context)
- `.research/sync-mechanism/piece-1a-discovery-scan-jason-os/` + `piece-1b-discovery-scan-sonash/` — ready data sources
