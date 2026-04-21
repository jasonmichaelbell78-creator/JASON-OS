# D2 — Core Orchestration Skill Cluster — /migration Integration Surface

**Sub-question:** SQ-D2-core-orchestration — For the 9 SoNash core-orchestration
skills, inventory each for /migration's integration surface: does-what,
coupling-level, /migration call likelihood + phase, invocation shape, verdict
per D23.

**Depth:** L1 (file:line citations).
**Date:** 2026-04-21.
**Scope:** 9 skills — brainstorm, checkpoint, convergence-loop, deep-plan,
deep-research, session-begin, session-end, todo, task-next.
**Sources:** SoNash SKILL.md files + JASON-OS SKILL.md files (8 pairs, 1 SoNash-
only). Per D16, JASON-OS-side versions are the reference point for the
`in`-direction port; SoNash-side versions are what /migration pulls from for the
`out`-direction (JASON-OS → SoNash back-port) or sources for ports to JASON-OS
when the JASON-OS port has lagged.

---

## Summary

Out of 9 skills inventoried:

- **8 exist in both SoNash and JASON-OS** (brainstorm, checkpoint,
  convergence-loop, deep-plan, deep-research, session-begin, session-end, todo)
- **1 exists only in SoNash** (task-next) — port-candidate for /migration self-
  dogfood at a future phase (depends on JASON-OS gaining a ROADMAP.md, per
  JASON-OS session-begin §2.1 DEFERRED block).

All 8 dual-resident skills have diverged — the JASON-OS versions are sanitized
trims that drop SoNash-specific infra references (invocation tracking, TDMS,
ecosystem-health, ROADMAP.md, tech-debt index, override logs, health scripts).
This divergence count is load-bearing for /migration: bidirectional work (D16)
requires /migration to detect these divergences and offer reshape verdicts
(D23) rather than blind copy-as-is.

**Coupling distribution (likelihood /migration calls each skill):**

| Coupling level | Skills | Count |
| -------------- | ------ | ----- |
| **Very High** (called in >1 phase, core to arc) | deep-research, deep-plan, convergence-loop | 3 |
| **High** (called in a specific phase, spec'd in BRAINSTORM §2) | brainstorm, checkpoint | 2 |
| **Medium** (called at boundaries, optional) | session-begin, session-end, todo | 3 |
| **Low** (SoNash-only, port-deferred) | task-next | 1 |

**Divergence count:** 8/8 dual-resident skills diverge (100%). Divergences
cluster into five buckets — see §Divergence matrix below.

**Top integration points (see §Top integration points below):**
1. Phase 3 of /migration ALWAYS calls `/deep-research` (reshape/rewrite verdicts per D25 + R4).
2. Phase 4 of /migration produces `MIGRATION_PLAN.md` via delegation to or emulation of `/deep-plan`.
3. Phase 6 of /migration embeds `/convergence-loop` for prove-out (D6).
4. Phase 0 of /migration may re-enter `/brainstorm` on material reframe (D28).
5. Pre-execute gate of /migration calls `/checkpoint` before any destination write (D8 + R3).
6. `/migration` is an EXPECTED consumer AND an expected producer of divergence data for the 8 dual-resident skills — /migration's self-dogfood case (research Q10) is porting /migration itself, but every invocation on these 8 skills is also a divergence-resolution test.

---

## Skill integration table

Column key:
- **Phase** = which phase(s) of /migration's 7-phase arc (0–6) call this skill.
- **Coupling** = likelihood the skill is invoked when /migration runs against any migration unit.
- **Invocation shape** = subagent / skill-dispatch / programmatic-mode / artifact-consumption / embedded-behavior.
- **Verdict** = likely D23 verdict (copy-as-is / sanitize / reshape / rewrite / skip / blocked-on-prereq) when /migration is porting the SKILL itself (not when invoking it).

| # | Skill | Does-what | Coupling | /migration phase | Invocation shape | Verdict (if ported) |
|---|-------|-----------|----------|------------------|------------------|---------------------|
| 1 | brainstorm | Creative discovery phase → BRAINSTORM.md; 5-phase arc (warm-up, context, diverge, evaluate, converge, crystallize); dispatches `deep-research-searcher` and `contrarian-challenger` agents | **High** | Phase 0 context (loads existing BRAINSTORM.md per Phase 0 L131–135 of JASON-OS `deep-plan`); re-entry point on material reframe (D28) | Skill-dispatch (via `/brainstorm <slug>`); artifact-consumption (reads BRAINSTORM.md from `.research/<slug>/`) | **sanitize** — SoNash Invocation Tracking block (L289-293) must be dropped. Already done in JASON-OS v1.1. |
| 2 | checkpoint | Save session state to `.claude/state/handoff.json` + optional MCP memory entities; no phase arc — pure state-persistence operation | **High** | Gate before any destination write in Phase 5 execute (D8 never-silent + R3 gate-memory); also before /migration's own Phase 3 research dispatch when resource-heavy | Skill-dispatch (`/checkpoint` or `/checkpoint --mcp`); embedded-behavior (write `.claude/state/migration.<slug>.state.json`) | **copy-as-is** — JASON-OS version is content-identical (only CRLF line endings differ; L1-173 match). |
| 3 | convergence-loop | Multi-pass claim verification; 6 composable behaviors × 4 presets; T20 tally (Confirmed/Corrected/Extended/New); graduated convergence per-claim | **Very High** | Phase 2 discovery verify (ripple claims), Phase 4 plan verify, Phase 6 prove (mandatory per D6); research calls it Phase 0.5 and Phase 3.9 re-synth checks | Skill-dispatch; Programmatic Mode (JASON-OS L240–252) — other skills invoke without going through `/convergence-loop`, use T20 format + Setup→Loop→Report sequence directly | **copy-as-is** — content-identical between JASON-OS and SoNash (JASON-OS L1–301 match SoNash L1–298 except frontmatter compat). |
| 4 | deep-plan | Discovery-first plan with DIAGNOSIS.md + DECISIONS.md + PLAN.md; 7-phase arc (warm-up, context, discovery, user-discovery, decisions, plan, self-audit, approval, handoff); CL integration at Phase 0 + Phase 3.5 | **Very High** | Phase 4 of /migration (writes MIGRATION_PLAN.md) — either delegates to `/deep-plan --output <migration-artifacts>` or emulates its discovery-first arc inline | Skill-dispatch with output override (SoNash L78-80 / JASON-OS L74-76 accepts alternate output loc); Programmatic Mode pattern from convergence-loop | **reshape** — SoNash Critical Rule 7 PLAN.md-hygiene (L37-41) is dropped in JASON-OS v3.0; SoNash Invocation Tracking (L334-338) dropped. /migration porting deep-plan IN must decide whether to carry hygiene rule back. |
| 5 | deep-research | Multi-agent research engine; 12-phase arc (0, 1, 2, 2.5, 3, 3.5, 3.9, 3.95, 3.96, 3.97, 4, 5); decomposes into sub-questions with allocation floor `D + 3 + floor(D/5)`; contrarian + OTB mandatory; Windows 0-byte fallback (Critical Rule 4, L37-43) | **Very High** | Phase 3 of /migration (mandatory for reshape/rewrite verdicts per R4 / D25); may re-enter mid-execute per D28 when /migration Phase 5 surfaces unknown destination idiom | Skill-dispatch with `--auto` flag (Critical Rule 1) because /migration is the orchestrator; adapter writes to `.research/<migration-slug>/` | **copy-as-is** — SoNash L1-423 match JASON-OS L1-419 except frontmatter compat + condensed When-to-Use block (JASON-OS L57-65 vs SoNash L54-69). |
| 6 | session-begin | Pre-flight checklist; 5-phase arc; duplicate-detection gate; SessionStart hook boundary; JASON-OS v0.1 port has 8+ DEFERRED blocks for unwired infra | **Medium** | Optional — before a /migration run (Phase 0 context pull may coincide); NOT called mid-migration | Skill-dispatch (`/session-begin`); artifact-consumption (SESSION_CONTEXT.md) | **reshape** — JASON-OS v2.1 (L1-246) is the reshape target: DEFERRED markers for `scripts/secrets/`, cross-session validation, session-gap detection, consolidation status, prior-research surface, 8 health scripts (Phase 3), override-trend, health-score-drop, warning-acknowledgment, infrastructure-failure, technical-debt — SoNash v2.0 (L1-321) is what got reshaped. When porting infra, these DEFERRED sections reshape back. |
| 7 | session-end | Session-closure pipeline; 4-phase arc (Context / Compliance / Metrics / Cleanup); steps 1-10; auto-learnings loop; orphaned `/synthesize` state check | **Medium** | Optional — after a /migration run; may consume MIGRATION_PLAN.md artifact for summary | Skill-dispatch (`/session-end` or `--no-push`); state-file cleanup | **reshape** — JASON-OS v2.2-jasonos-v0.1 (L1-120+) is Foundation-scoped: strips Phase 3 entirely (reviews:sync, ecosystem-health, TDMS debt consolidation, metrics generation) and most of Phase 2 (agent invocation summary, override audit, hook warnings synthesizer). Labelled "Lineage: SoNash 41526 session-end v2.2 → JASON-OS v0.1 port" (L17-18). |
| 8 | todo | Cross-session task management; JSONL + CLI (`scripts/planning/todos-cli.js`); 8-option menu; context-capture on add; regression-guarded via advisory-locked CLI (Critical Rule 6 — prevents T26/T27/T28 data-loss bug) | **Medium** | Phase 1 target-pick menu of /migration may offer "add to todo" for blocked-on-prereq items; Phase 5 blocked items route to `/todo` or `/add-debt` per D28 back-entry | Skill-dispatch (`/todo`); CLI-call (`node scripts/planning/todos-cli.js ...`) — note: JASON-OS has this CLI; verify at `C:\Users\jbell\.local\bin\JASON-OS\scripts\planning\` | **sanitize** — SoNash Invocation Tracking (L340-360) is dropped in JASON-OS. Otherwise content-identical. |
| 9 | task-next | Dependency-resolved next-task selector from ROADMAP.md active sprint; calls `node scripts/tasks/resolve-dependencies.js`; Kahn's topological sort | **Low** (SoNash-only) | Not directly — but /migration Phase 1 target-pick menu may use it for resume-mode ("what unblocked since last migration?"); also possible consumer of it when porting CAS which has ROADMAP-style dependency graphs | N/A (skill absent in JASON-OS) | **blocked-on-prereq** — JASON-OS lacks ROADMAP.md (session-begin JASON-OS L108-109 "ROADMAP.md read is DEFERRED — JASON-OS v0.1 does not have ROADMAP.md yet"). Port-candidate after JASON-OS gains a roadmap substrate. Reshape during port: configurable source-doc param (target-repo-param per D19). |

---

## SoNash-vs-JASON-OS divergence matrix

Per D16 (bidirectional /migration first-class), detecting these divergences IS
/migration's verdict-assignment job for this cluster. Five divergence buckets
observed:

| # | Divergence bucket | Skills affected | Evidence | /migration verdict implication |
|---|-------------------|-----------------|----------|-------------------------------|
| **B1** | Invocation Tracking block removed | brainstorm, deep-plan, todo | SoNash brainstorm L289-293; SoNash deep-plan L334-338; SoNash todo L340-360 — all reference `cd scripts/reviews && npx tsx write-invocation.ts` that doesn't exist in JASON-OS | **sanitize** — regex-strip the Invocation Tracking block when porting SoNash→JASON-OS; ADD it when porting JASON-OS→SoNash (reverse direction). Clean candidate for /migration's sanitize primitive. |
| **B2** | Frontmatter compatibility + metadata.version | ALL 8 dual-resident | JASON-OS adds `compatibility: agentskills-v1` + `metadata: version: X.Y` line; SoNash uses plainer frontmatter (e.g., SoNash checkpoint L7-9 vs JASON-OS checkpoint L7-11) | **sanitize** (reshape if the destination's frontmatter schema itself differs). Trivial. |
| **B3** | DEFERRED infrastructure markers | session-begin (heavy), session-end (heavy), deep-plan (light — Critical Rule 7 missing) | JASON-OS session-begin L21-27, L86-95, L129-148 etc. (DEFERRED blocks); JASON-OS session-end L27-33 strips Phase 3 entirely; SoNash deep-plan Critical Rule 7 (L37-41 — PLAN.md hygiene) dropped in JASON-OS | **reshape** — these skills in JASON-OS are STUBS that await infra (hooks, scripts, CI). /migration porting SoNash→JASON-OS must preserve DEFERRED blocks; porting JASON-OS→SoNash must restore the full step content. The most semantically loaded divergence for /migration. |
| **B4** | Lineage / port-marker comment | session-end | JASON-OS session-end L17-18 literally says "Lineage: SoNash 41526 session-end v2.2 → JASON-OS v0.1 port" — a prior port's audit trail | **copy-as-is + extend** — /migration should write similar lineage comments into every reshape verdict output (this is a migration-ledger primitive, D28 meta-ledger). |
| **B5** | Minor content rewrite | deep-plan (L182 "TDMS uses S0-S3 severity" → "The existing debt system uses S0-S3 severity"), session-begin (time budget 5 min → 3 min), session-end description tweak | JASON-OS deep-plan L182 rewording away from TDMS (project-specific); JASON-OS session-begin L17 vs SoNash L14 | **reshape** — SoNash-specific idioms (TDMS, debt-runner references) become generic terms in JASON-OS. /migration's reshape primitive must handle idiom-replacement table (per D17 parametrized endpoints). |

**Divergence count total:** 8/8 dual-resident skills diverge (100%).
**Lines divergent per skill (approximation based on diffs):**
- brainstorm: ~8 lines (B1+B2)
- checkpoint: frontmatter only (~3 lines, B2) — line endings CRLF/LF dominate the diff
- convergence-loop: frontmatter only (~3 lines, B2)
- deep-plan: ~15 lines (B1+B2+B3, Critical Rule 7 removal)
- deep-research: ~10 lines (B2 + condensed When section)
- session-begin: ~75 lines (B2+B3 heavy, 8 DEFERRED blocks)
- session-end: ~120+ lines (B2+B3 heavy + B4 lineage comment + full Phase 3 removal)
- todo: ~22 lines (B1+B2)

**Key insight for /migration per D16:** session-begin and session-end are the
"loud" divergences — and they are loud in exactly the /migration endpoint that
/migration operates FROM (JASON-OS is workshop per D18). Running /migration
on either of these skills from JASON-OS out to SoNash would trigger a rewrite
verdict: the full infra substrate must exist or be reshaped in. Running in the
reverse (SoNash → JASON-OS) triggers sanitize+reshape because JASON-OS v0.1
lacks prerequisites — this is exactly the DEFERRED block pattern, and
/migration needs a `DEFERRED_PREREQ` marker-primitive to generate those blocks
automatically when it encounters a missing target-side dependency.

---

## Top integration points

Per the phase mapping in the integration table, /migration's highest-value
integration with this cluster is:

### IP-1 — Phase 3 hard dependency on `/deep-research`

Per R4 (D25), Phase 3 is verdict-conditional skip: copy-as-is / sanitize MAY
skip, but **reshape / rewrite MUST NOT** skip — destination-idiom research is
mandatory. This makes /deep-research a near-universal call for /migration
Phase 3 since the majority of real-world ports will involve some reshape.
Research must write to `.research/<migration-slug>/` (deep-research Critical
Rule 6, SoNash L46 / JASON-OS L45-46). The `--auto` flag (SoNash L90, JASON-OS
L90) is designed for exactly this skill-dispatch case.

### IP-2 — Phase 4 MIGRATION_PLAN.md via /deep-plan or emulation

/migration's Phase 4 produces MIGRATION_PLAN.md (per BRAINSTORM §2 Bones).
Three design options (to resolve in research Q4 / Q7):
(a) dispatch `/deep-plan <migration-slug> --output <migration-dir>` and consume
its DECISIONS.md + PLAN.md,
(b) emulate deep-plan's discovery-first arc inline inside /migration (preserves
single-skill shape per D11),
(c) decompose /migration into primary router + `/migration-plan` ancillary
(research Q7 decomposition question).

deep-plan's output override (SoNash L78-80) explicitly permits option (a).
deep-plan's Skill-type plans block (SoNash L327-332, JASON-OS L324-329) already
anticipates being called on skill-creation targets.

### IP-3 — Phase 6 embedded /convergence-loop for prove

Per BRAINSTORM §2 Bones Phase 6 "Prove — embedded convergence-loop
verification" and D6 "Plan + research + execute + prove co-equal",
/convergence-loop is /migration's prove engine. The Programmatic Mode contract
(convergence-loop JASON-OS L240-252, SoNash L237-249) is the exact integration
shape: /migration implements Setup→Loop→Report inline without invoking the
slash command, so Phase 6 is a subroutine not a sub-skill. Claims to verify
per migration unit: destination compiles, tests pass, no ripple regressions,
invariants maintained.

### IP-4 — Phase 0 re-entry to /brainstorm on material reframe (D28)

Per D28, brainstorm re-entry is expected, not exceptional. /migration Phase 0
context-pull reads existing BRAINSTORM.md (deep-plan JASON-OS L130-134
brainstorm-check). When /migration Phase 2 discovery surfaces a decision that
conflicts with a brainstorm decision (e.g., /migration discovers the unit type
is actually a workflow not a file), it must offer to re-enter /brainstorm —
this is the iteration loop of D28. Invocation shape: suggest routing, do not
silently dispatch.

### IP-5 — Pre-execute gate calls /checkpoint (D8, R3)

Every Phase 5 write is gated; D8 hard rule says nothing silent, R3 says gate
memory aids confirmation. /checkpoint is the state-capture primitive:
`.claude/state/handoff.json` + `.claude/state/migration.<slug>.state.json`
form the resume substrate. Per checkpoint SKILL.md Steps 1-3 (JASON-OS L38-
L90), the SESSION_CONTEXT.md Quick Recovery block plus the handoff JSON plus
the task-state JSON are the canonical resume artifacts. /migration should
write a migration-scoped state file alongside handoff.json on every phase gate
crossing.

### IP-6 — /todo as back-pressure for blocked-on-prereq verdict (D23)

The D23 `blocked-on-prereq` verdict (e.g., task-next can't port because no
ROADMAP.md exists in JASON-OS yet) needs a follow-up destination. /todo is the
cross-session ledger for these. /migration Phase 2 discovery or Phase 5
execute that hits a blocker should offer: "route to /todo as
#blocked-migration?" — the #foundation-deferral hashtag pattern exists in
JASON-OS session-end L31-32 already, so precedent is set. /todo's Critical
Rule 6 (SoNash + JASON-OS L30-34) forbids direct JSONL writes — /migration
MUST call the CLI, same contract as everywhere else.

### IP-7 — task-next self-dogfood opportunity

task-next is the one skill in this cluster that exists only in SoNash —
dogfood for /migration's out-direction (JASON-OS → SoNash back-port not needed;
the direction here is IN, SoNash → JASON-OS) as well as research Q10's self-
dogfood criterion. Porting task-next INTO JASON-OS is blocked-on-prereq
(needs ROADMAP.md + dependency annotation convention), so the port itself
becomes a D23 rewrite verdict with D28 re-entry potential (may need to
re-enter brainstorm on JASON-OS's task-tracking shape — ROADMAP.md vs
`.planning/todos.jsonl` vs both).

---

## Sources

File references (all absolute paths, L = line numbers observed):

**SoNash SKILL.md:**
- `C:\Users\jbell\.local\bin\sonash-v0\.claude\skills\brainstorm\SKILL.md` L1-349
- `C:\Users\jbell\.local\bin\sonash-v0\.claude\skills\checkpoint\SKILL.md` L1-171
- `C:\Users\jbell\.local\bin\sonash-v0\.claude\skills\convergence-loop\SKILL.md` L1-297
- `C:\Users\jbell\.local\bin\sonash-v0\.claude\skills\deep-plan\SKILL.md` L1-414
- `C:\Users\jbell\.local\bin\sonash-v0\.claude\skills\deep-research\SKILL.md` L1-423
- `C:\Users\jbell\.local\bin\sonash-v0\.claude\skills\session-begin\SKILL.md` L1-320
- `C:\Users\jbell\.local\bin\sonash-v0\.claude\skills\session-end\SKILL.md` L1-465
- `C:\Users\jbell\.local\bin\sonash-v0\.claude\skills\todo\SKILL.md` L1-368
- `C:\Users\jbell\.local\bin\sonash-v0\.claude\skills\task-next\SKILL.md` L1-97

**JASON-OS SKILL.md:**
- `C:\Users\jbell\.local\bin\JASON-OS\.claude\skills\brainstorm\SKILL.md` L1-346
- `C:\Users\jbell\.local\bin\JASON-OS\.claude\skills\checkpoint\SKILL.md` L1-173
- `C:\Users\jbell\.local\bin\JASON-OS\.claude\skills\convergence-loop\SKILL.md` L1-300
- `C:\Users\jbell\.local\bin\JASON-OS\.claude\skills\deep-plan\SKILL.md` L1-405
- `C:\Users\jbell\.local\bin\JASON-OS\.claude\skills\deep-research\SKILL.md` L1-419
- `C:\Users\jbell\.local\bin\JASON-OS\.claude\skills\session-begin\SKILL.md` L1-245
- `C:\Users\jbell\.local\bin\JASON-OS\.claude\skills\session-end\SKILL.md` L1-442
- `C:\Users\jbell\.local\bin\JASON-OS\.claude\skills\todo\SKILL.md` L1-350

**Reference docs used:**
- `C:\Users\jbell\.local\bin\JASON-OS\.research\migration-skill\BRAINSTORM.md` §2 Bones (7-phase arc), §3 D16-D19 endpoint, §3 D23-D26 verdicts + Phase 5 + output modes, §3 D27 research scope, §3 D28 iterative re-entry, §3 D29 v1 local-only
- `C:\Users\jbell\.local\bin\JASON-OS\CLAUDE.md` (JASON-OS operational stance; bootstrap status)
- `C:\Users\jbell\.local\bin\sonash-v0\CLAUDE.md` (SoNash context providing the invocation-tracking + TDMS + ecosystem-health patterns that diverge in JASON-OS ports)

**Verification commands run:**
- `wc -l` on all 17 SKILL.md files (line-count comparison)
- `diff -q` + full `diff` on checkpoint, convergence-loop, todo pairs (byte-level delta)
- `ls` on both `.claude/skills/` dirs (confirmed skill-presence list)

**Confidence note:** L1 depth — each claim anchored to file + line range.
REFERENCE.md companions (brainstorm, convergence-loop, deep-plan, deep-research,
session-begin, todo) were NOT read — only SKILL.md was in scope per L1 ceiling.
If deeper-detail integration contracts matter (e.g., deep-plan REFERENCE.md
Section 15 "deep-plan adapter"), a follow-up L2 pass on specific REFERENCE.md
sections is recommended.
