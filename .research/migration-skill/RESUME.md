# RESUME — /migration brainstorm (pickup guide)

**Updated:** 2026-04-20 session 2 (home locale). Supersedes the session-1 resume guide (which pointed at the then-pending Q11/Q12 pause).

---

## TL;DR — current state

Skill was renamed `/port` → **`/migration`** on 2026-04-20 session 2 per D7 reopening. Phase 1 (Diverge) is substantively complete (27 decisions locked across D1–D27, four rules R1–R4). Outgoing state from this session: either

- entered Phase 2 / 3 / 4 and routed to `/deep-research`, or
- paused before Phase 2 for another reason — check `BRAINSTORM_WIP.md` §7 and any completed `BRAINSTORM.md` for signal.

---

## If picking up mid-brainstorm

### Step 1 — ensure branch + files

```bash
cd <your-JASON-OS-locale>
git fetch origin
git checkout piece-3-labeling-mechanism  # unless already merged
git pull --ff-only
```

### Step 2 — read in order

1. `BRAINSTORM_WIP.md` — 27 locked decisions, hybrid direction, Phase 2 plan, deep-research scope
2. This file (RESUME.md) — current state + pickup instructions
3. `TRANSCRIPT.md` — verbatim session-1 conversation (uses old `/port` name; preserved as historical record)

### Step 3 — know the blocker posture

**Execution blockers (do not block design/research):**

- `/sync` (Piece 5 of sync-mechanism) — unbuilt in JASON-OS
- CAS port into JASON-OS — unbuilt (CAS lives in SoNash)
- Other cross-skill integrations — TBD by `/deep-research`

Design, research, and planning of `/migration` proceed without these being built. Execution waits.

### Step 4 — re-enter

**Option A — if a `BRAINSTORM.md` exists in this dir:** Phase 4 has run. Route is captured in that file's closing menu. Either kick off `/deep-research` per the routing, or re-enter brainstorm if research-findings have surfaced a reframe.

**Option B — if only `BRAINSTORM_WIP.md` exists:** Phase 2/3/4 pending. Invoke `/brainstorm migration-skill` — the skill's Phase 0 duplicate-check will offer resume. Or say explicitly: "resume migration-skill brainstorm at Phase 2 (light) per BRAINSTORM_WIP.md §7."

---

## Renamed references

- Directory: `.research/port-skill/` → **`.research/migration-skill/`**
- Skill invocation: `/port` → **`/migration`**
- Slug: `port-skill` → **`migration-skill`**
- Related todo T28 (`/migrate skill`) — unified into this brainstorm; title updated to `/migration`
- Memory entry `project_port_skill_brainstorm.md` (if present on any locale) — to be updated / replaced with `project_migration_skill_brainstorm.md`

Names kept (not renamed — different concept):

- `.planning/jason-os-mvp/PORT_ANALYSIS.md` — the manual pre-port ledger, stays PORT_ANALYSIS per MI-1 feedback convention
- MI-1 rule `feedback_pre_analysis_before_port.md` — stays; "pre-port analysis" is the existing feedback-memory name for the inherited rule

---

## Deep-research scope (if routing there next)

Per BRAINSTORM_WIP.md §7:

1. Agent approach (D4 deferred)
2. Full cross-skill integration inventory (D27) — all SoNash skills `/migration` may call on
3. Complete blocker inventory for JASON-OS
4. Direct-apply vs. plan-export mechanics (D26)
5. Reshape / rewrite pipeline design (D23/D24)
6. CAS port scope — what changes during its own port into JASON-OS

---

## Machine-crossing notes

- **Committed, travels:** `.research/migration-skill/{BRAINSTORM_WIP.md,RESUME.md,TRANSCRIPT.md}`, and eventually `BRAINSTORM.md`
- **Local-only, does not travel:** `.claude/state/brainstorm.migration-skill.state.json` (if created)
- **Memory:** `~/.claude/projects/.../memory/` is local-only; the authoritative source across locales is the committed files here

---

**Written:** 2026-04-20 session 2 (home locale).
