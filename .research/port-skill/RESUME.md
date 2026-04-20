# RESUME — /port brainstorm (home-session pickup)

**You started this at work on 2026-04-20. This file is how you (or a fresh Claude Code session) pick it up at home.**

---

## TL;DR

You're in the middle of `/brainstorm port-skill` — designing a `/port` skill that migrates files / workflows / concepts from SoNash to JASON-OS. Phase 1 (Diverge) is substantially complete; you paused before answering the last two questions (Q11: bi-directional path, Q12: directions to add). Phase 2 (Evaluate) is the next thing to do.

The skill will be blocked on `/sync` (sync-mechanism Piece 5) landing before it can execute real ports, but the design proceeds now because it tells `/sync` what to expose.

---

## State of the brainstorm

- **Phase reached:** Phase 1 (Diverge) — direction generation complete
- **Leading direction chosen (tentatively):** Hybrid "/port" = Direction 1 bones (six phases) + Direction 2/3/4 freedoms (unit tracks, menu-at-gates, research-scales-with-unit)
- **Directions surviving to Phase 2:** 1, 2, 3, 4 (Direction 5 dropped — user: "this will be heavy-lifting")
- **Open questions:** Q11 (bi-directional path — i / ii / iii) and Q12 (directions to add)
- **15 decisions locked** (see [BRAINSTORM_WIP.md §2](./BRAINSTORM_WIP.md))

---

## How to resume at home

### Step 1 — pull the branch

```bash
cd ~/.local/bin/JASON-OS
git fetch origin
git checkout piece-3-labeling-mechanism
git pull --ff-only
```

(Scope note: the brainstorm artifacts were committed to `piece-3-labeling-mechanism` because that's the branch you were on. They live under `.research/port-skill/` and don't interfere with piece-3 labeling work. If you want them on a dedicated branch later, cherry-pick is trivial.)

### Step 2 — re-read the three files in order

1. [RESUME.md](./RESUME.md) — this file (already reading it)
2. [BRAINSTORM_WIP.md](./BRAINSTORM_WIP.md) — decisions ledger + leading direction + open questions
3. [TRANSCRIPT.md](./TRANSCRIPT.md) — verbatim session if you want full context

### Step 3 — re-enter the brainstorm

Two ways to continue:

**Option A (recommended) — invoke `/brainstorm port-skill`**

The skill's own duplicate-check (Phase 0) will offer to resume. If the state file `.claude/state/brainstorm.port-skill.state.json` exists on this machine, the skill picks up there. If not (because state files are gitignored and don't travel across machines), say *resume* when prompted and paste the BRAINSTORM_WIP.md contents or just point at the directory.

**Option B — direct continuation**

Tell a fresh Claude Code session:

> Resuming the `/port` skill brainstorm. Context is at `.research/port-skill/` — read RESUME.md, BRAINSTORM_WIP.md, then TRANSCRIPT.md in that order. Pick up at Q11 (bi-directional path) and Q12 (directions to add), then proceed to Phase 2 (Evaluate) per the `/brainstorm` skill.

---

## Outstanding questions you need to answer

### Q11 — Bi-directional path

You said you want to discuss this, and flagged that self-dogfooding (using `/port` on `/port` itself to carry it back to SoNash) might be the proof-out strategy. Pick one or propose an alternative:

- **(i) Directional v1, bidirectional v2** — build SoNash→JASON-OS only first; dogfood later via `/sync` or one-off
- **(ii) Directional core, reverse mode gated** — scaffold `--reverse` from day one, reverse minimal-and-growing
- **(iii) True bidirectional from v1** — both directions first-class

Four challenges already on the table (see BRAINSTORM_WIP.md §5) — asymmetric work, `/sync` overlap, verdict-legend divergence, label-meaning flip.

### Q12 — Any direction to re-open or add

Default: no, proceed to Phase 2 with current four directions.

---

## After Q11 / Q12: Phase 2 work

Per `/brainstorm` skill:

1. **Tradeoff analysis** of the leading hybrid vs. Directions 1/2/3/4 as baselines — strengths, weaknesses, assumptions, feasibility
2. **Contrarian checkpoint** — I may dispatch a `contrarian-challenger` agent to stress-test the hybrid (4 directions counts as complex enough to warrant it)
3. **Anti-goal violation check** — confirm the hybrid doesn't trip any locked anti-goal
4. **Grounding check** — dispatch agents to verify any unverified premises the direction rests on

Then Phase 3 (Converge) — you pick final direction + rationale + open downstream questions; Phase 4 (Crystallize) — final BRAINSTORM.md written + convergence-loop verification + routing menu.

---

## Machine-crossing notes

- **Committed, will travel:** `.research/port-skill/TRANSCRIPT.md` + `BRAINSTORM_WIP.md` + `RESUME.md`
- **Local-only, will NOT travel:** `.claude/state/brainstorm.port-skill.state.json` (state files are gitignored). Home machine will start with a fresh state if it needs one, or continue purely from the committed artifacts.
- **Memory (auto-memory):** auto-memory files live under `~/.claude/projects/C--Users-jbell--local-bin-JASON-OS/memory/` and are also local-only / not shared across machines. A memory entry has been added (`project_port_skill_brainstorm.md`) on this machine; if the home machine has its own auto-memory, it'll pick up the project pointer naturally on next session — but the authoritative source is these three committed files.

---

**Written:** 2026-04-20 at the end of the work-machine session, before commit + push.
