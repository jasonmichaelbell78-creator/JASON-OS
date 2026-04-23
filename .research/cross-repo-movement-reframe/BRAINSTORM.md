# BRAINSTORM — cross-repo-movement-reframe

**Date:** 2026-04-23 (Session 18)
**Status:** Phase 4 complete — chosen direction + routing locked
**Supersedes:** sync-mechanism, schema-design, labeling-mechanism (parent + structural-fix), migration-skill — as a single planning deliverable
**Predecessor:** `PHASE_0_LANDSCAPE.md` (this directory)
**Stress-test:** `challenges/contrarian.md` (this directory)

---

## The reframe in one paragraph

A single conversational tool for all cross-repo movement between the user's
owned repos. Primary job is one-time ports; secondary scopes cover sync-back
of evolved ports, inbound extraction from unowned repos in research mode, and
local-context sync across owned project contexts on the user's machines. The
framing starts from what's being moved (different unit types move differently)
rather than from how it's being moved (sync vs. migrate as distinct
operations). The final shape is not one skill containing everything — it's
one user-facing orchestrator that routes to companion skills per movement
verb, with a shared data backbone. Sync-mechanism framing is dropped as a
starting point. Sync is a roadmap capability that fills in as migrations
teach the tool what sync patterns actually look like.

---

## Phase 0 — Landscape (summary; full doc at PHASE_0_LANDSCAPE.md)

Mid-session pivot during Phase G.2 of the labeling-mechanism structural-fix.
G.1 produced 461 records with 100% `needs_review` entries and 2,452 fields
needing arbitration. User judgment: the sync process had become a behemoth
of problems. Phase 0 synthesized eleven prior research/planning artifacts
and established that the user's reframe was not a departure from prior
research but the conclusion the research kept arriving at without naming:
ship the small thing first (R-frpg Option D), two layers of understanding +
mechanical (migration v2), CAS may not be a prerequisite (OTB-2), v0.5
scaffold resolves bootstrap (OTB-9), and migration's "NOT a second /sync"
anti-goal was explicitly eligible for revisit under a unified framing.

Survivors identified in Phase 0: the five-value scope-tag enum (universal,
user, project, machine, ephemeral — validated across five independent
systems, present in `.claude/sync/schema/enums.json`), foundation security
helpers (`scripts/lib/safe-fs.js`, `sanitize-error.cjs`,
`security-helpers.js`), the architecture-fix commit `1b2afb4` (generic
infrastructure: `applyArbitration`, `apply-arbitration.js`,
`aggregate-findings.js`, `synthesize-findings.js`, plain-language-reminder
hook).

Scrapped: the 30+ field universal schema with 41 per-type extensions from
Piece 2, the five-piece sync-mechanism phase sequence, the agent-fleet
back-fill design from Piece 3, the migration "NOT a second /sync"
anti-goal, the sync-mechanism-as-starting-framing.

---

## Phase 1 — Diverge (directions surfaced and their disposition)

Six candidate directions were on the table at the end of Phase 0 (three
main seeds plus three variants). Phase 1 pressure-tested them against the
user's actual framing and produced three final-form directions.

**Direction D (anchor) — Migration-v2 architecture extended to four
movement scopes, understanding-primary, ledger-tracked.** Two-layer
internals inherited from migration v2 (understanding layer + mechanical
recipe library), with understanding as the primary decision-maker and
mechanical as its cached-optimization path rather than a parallel fast-path
layer. Scope extended to cover four movement slices: one-time ports (the
primary job), sync-back for evolved ports, inbound extraction from unowned
repos in CAS-as-research mode, and local-context sync across owned project
contexts (memories, tenets, CLAUDE.md local tweaks, settings.local, env,
and related user-scoped / machine-scoped artifacts). Lineage ledger built
incrementally as movements happen. Target-process-profile (gates,
guardrails, hooks, CI, review infrastructure) discovered on first write
into each owned target repo and cached. Conversational only; no hooks in
v1. Convention-following is best-effort, not blocking.

**Direction E — Lineage-ledger-first, movement as graph operations.**
Evaluated and absorbed. Ledger-as-protagonist framing risks repeating the
schema-sprawl failure pattern from Piece 2. Ledger-as-feature survives
inside Direction D, built incrementally rather than pre-populated.

**Direction F — The tool IS the research layer.** Evaluated and absorbed.
Collapsing movement and research into one skill is too extreme as
standalone — it makes every invocation heavier than needed and bloats
scope. The underlying insight (mechanical recipes alone are insufficient,
context is king, knowing when to go mechanical vs. when to invoke
understanding is a first-class decision made per-move) gets absorbed into
Direction D as an explicit design principle.

---

## Phase 2 — Evaluate (tradeoffs, contrarian checkpoint)

Direction D survived its tradeoff analysis provided four constraints are
honored in planning. Independent contrarian stress-test (via
`contrarian-challenger` agent, output at `challenges/contrarian.md`)
concurred that Direction D survives its pre-mortem and produced eight
challenges (four Critical, four Major) against it.

The contrarian's strongest finding — one I under-weighted in my own read —
was that the four scopes look coherent at the noun level but collide at
the verb level. Slice 1 transforms-and-lands, slice 2 does three-way
merge, slice 3 observes-and-distills (never writes into source), slice 4
diffs-and-copies-with-scope-rules. Forced unification at the implementation
layer would produce the same architecture collapse that the five prior
plans produced. "Cleanly separated in design" had to become *structural*,
not just declared.

The user's response to that finding refined Direction D into its final
form: **Direction D' — orchestrator + companion skills.** The main skill
is a lightweight orchestrator (conversation, routing, two-mode guidance
depending on whether the user wants to be guided or wants to lead);
companion skills hold the verb-specific implementations; shared internals
(ledger, profile cache, understanding-layer invocation pattern, security
helpers, scope-tag enum) are used by orchestrator and companions alike.
The companion architecture enforces implementation-level scope separation
by construction — each scope is literally a separate file and a separate
skill manifest.

This refinement structurally resolves four of the eight challenges (verb
collision, understanding-primary overhead, dashboard over-engineering,
local-context sync forced fit) rather than mitigating them in planning.
Three remain open as pre-/deep-plan work (ledger drift requires a schema
hard-cap, supersedes-five-plans requires a decision register, bootstrap
paradox requires a named scaffold — which D' resolves naturally by
shipping `/context-sync` first). One (shape-expectations demotion)
requires restoring shape as a named profile component during planning.

---

## Phase 3 — Converge

**Chosen direction: Direction D' — orchestrator + companion skills.**

**Rationale (user's words, verbatim from convergence turn):** "I want a
one-stop-shop for the build-out of this project. I don't mind it being a
wrapper/orchestrator but I want it to be my behind-the-scenes agent who
guides me when I need guiding and follows my lead when I want to lead."

**How D' resolves what was on the table:** It keeps the ONE-SURFACE
constraint the user actually cares about (one conversation, one user-facing
entry point, one mental model for cross-repo movement) while letting each
companion be sized for its own verb. Local-context sync ships first as the
simplest case and serves as the bootstrap scaffold. Future companions are
built out as real movements teach the tool what each verb needs. The
meta-principle ("thorough and complete without over-engineering") is
honored structurally — no scope is forced into an architecture it doesn't
need.

---

## Architecture: orchestrator + companions

### Main orchestrator skill

Conversational dashboard. Routes user requests to the right companion
based on unit-type / verb / scope. Two-mode operation: user-led (user
knows what they want; orchestrator confirms minimally and delegates) and
tool-led (user is uncertain; orchestrator engages the discovery layer,
presents groupings and options, walks the user through). Coordinates
ledger reads/writes across companion invocations. Surfaces "check what's
out of sync" as a dashboard command that walks the ledger and compares
against current filesystem. Does not contain any movement logic itself.

### Companion skills

**`/context-sync`** — local-context sync across owned project contexts.
Memories (`~/.claude/projects/.../memory/`), tenets, CLAUDE.md local
tweaks, `settings.local.json`, env variables, slash-command aliases,
keybindings (`~/.claude/keybindings.json`), git config overrides, husky
local (`.husky/_/`), status-line config, and related user-scoped /
machine-scoped artifacts. Simplest verb (diff-and-copy with scope rules).
Does not use the understanding layer. Minimal ledger involvement (may not
need full lineage tracking — open question for planning). Ships first. Is
the bootstrap scaffold.

**`/port`** (name TBD — possibly `/migrate-unit` or similar) — one-time
port between owned repos. Full understanding layer invocation. Primary
user of the recipe library. Inherits the migration-v2 two-layer
architecture. The heaviest companion.

**`/sync-back`** (or folded into `/port` with a mode distinction —
decision for planning, not now) — reconciliation when a previously-ported
unit has evolved on both sides. Three-way diff across source-since-last-sync,
destination-since-last-sync, and the ledger record of the original port.

**`/extract`** (or `/research-port` — name TBD) — inbound extraction from
unowned repos, CAS-as-research mode. Observes and distills; never writes
into the unowned source. Formally depends on CAS being ported to JASON-OS;
implemented initially as a shim that knows it's blocked. Last companion to
ship.

### Shared internals (libraries / files, not skills)

- **Ledger library** — read/write primitives for the lineage ledger.
  Single capped schema. Used by orchestrator and all companions.
- **Target-process-profile cache** — one profile per owned target repo.
  Written by whichever companion first writes into that repo, read by all
  subsequent writes. Profile contains gate-and-guardrail discovery
  (primary) plus shape-expectations (secondary, named explicitly per
  Challenge 6 resolution).
- **Understanding-layer invocation helper** — reusable pattern for
  "call the model to comprehend a unit." Used by companions that need it;
  ignored by ones that don't (e.g., `/context-sync`).
- **Security helpers** (existing, unchanged) — `scripts/lib/safe-fs.js`,
  `scripts/lib/sanitize-error.cjs`, `scripts/lib/security-helpers.js`.
- **Scope-tag enum** (existing, unchanged) — universal / user / project /
  machine / ephemeral, already in `.claude/sync/schema/enums.json`.

### Companions calling other skills

Per the in-house-over-handoff tenet, companions use the broader JASON-OS
skill surface as their internal tools the same way the orchestrator does.
A port companion invokes `/deep-research` when it needs genuine
understanding of an unfamiliar unit, `/convergence-loop` when it needs to
verify claims about the target repo, `/skill-creator` or `/skill-audit`
when what it's porting is itself a skill. Companions can also invoke each
other — a port operation that needs to move related memory files might
invoke `/context-sync` as a sub-step. The ledger makes nested invocations
safe by recording each companion's operations at its own granularity.

---

## Anti-goals (final)

The tool deliberately does NOT:

- Present `/sync` and `/migration` as distinct user-facing surfaces.
- Fire hooks in v1. Conversational and direct-invocation only. Drift
  detection runs on explicit invocation of "check what's out of sync."
- Use `--flag`-driven CLI arguments where conversation can carry the
  meaning.
- Architect as a multi-piece sequential system with separate
  sync/migrate/schema/labeling plans.
- Derive a large schema from evidence at the start. The 30+ field
  universal + 41 per-type extensions pattern that produced the G.1
  needs_review flood is explicitly rejected.
- Require all movable units to be back-filled with catalog metadata before
  the tool works.
- Require CAS to be ported to JASON-OS before v1 can ship. CAS port is a
  separate eventuality; `/extract` companion is designed-in but shim-blocked
  until CAS lands.
- Write into repos the user does not own. Reading from unowned repos (in
  CAS-as-research mode for inbound extraction) is the only interaction
  allowed.
- Operate silently. No fire-and-forget state changes. All surfaced data
  requires acknowledgment.
- Require manual steps for ongoing maintenance (existing Piece 3 hard
  constraint, carried forward).
- Over-engineer. The meta-principle confirmed this session — thoroughness
  and completeness balanced against not-over-engineering — is a named
  design force and applies to every architectural decision in planning.

---

## Pre-/deep-plan deliverables (required before planning begins)

Contrarian identified four pieces of work that must exist before
`/deep-plan` starts. Attempting to derive them inside planning under time
pressure risks the same expansion patterns that produced the G.1 collapse.

**1. Ledger schema hard-cap.** Enumerate the maximum field set a single
ledger record needs to serve all four movement scopes, then prune to the
minimum. If the pruned minimum exceeds twelve fields, that's a structural
signal that the unified-ledger idea is under-delivering and the scopes
need data-layer separation even if the user surface stays unified. Cap
the schema up front.

**2. Per-scope verb analysis.** For each scope, one sentence naming its
verb and one paragraph naming what the understanding layer does and what
the mechanical layer does. If any scope's paragraph reads "understanding
layer not involved" or "mechanical layer not involved," that scope does
not share the two-layer architecture and its implementation should be
bounded accordingly. (Companion architecture already enforces this — the
verb analysis confirms it.)

**3. Decision register.** A one-page document marking each material
decision from the five prior plans as *survives unchanged*, *superseded
with named replacement*, or *discarded with rationale*. Covers
sync-mechanism Pieces 1a/1b decisions, schema-design Piece 2 decisions
(32 total), labeling-mechanism parent decisions (21 total), structural-fix
14 decision categories, and migration-skill v2 decisions (38 total). Also
names disposition of the uncommitted structural-fix in-flight files and
the architecture-fix commit `1b2afb4` (which survives unchanged per
PHASE_0_LANDSCAPE.md).

**4. Named bootstrap scaffold.** `/context-sync` serves this role under
D' — it ships first, alone, with the orchestrator initially routing only
to it. Ledger may be disabled or minimal for the scaffold. Target-process-
profile discovery runs in observation-only mode (no writes yet). The
tool's self-dogfood criterion (moving its own skill files to SoNash) is
explicitly deferred until after `/context-sync` proves the simplest verb
end-to-end.

---

## /deep-plan design constraints (travel with the direction into planning)

Three constraints the /deep-plan deliverable must honor:

**1. Recipe-first fast path for recognized patterns.** When the
understanding layer detects it is looking at a file type with
high-confidence recipe coverage plus a clean ledger record, emit a fast
verdict ("recipe library covers this; invoke recipes without full
comprehension pass") instead of running full model dispatch. Not a bypass
of the dashboard — a mode of it. Prevents the understanding-primary
overhead and dashboard over-engineering failure modes simultaneously.

**2. Shape-expectations restored as a named profile component.** After
gate discovery, the target-process-profile must include minimum shape
information: directory convention for each unit type the tool will emit,
required companion files per unit type, and naming scheme. Three fields
per unit type is sufficient. Prevents gate-compliant-but-structurally-wrong
output.

**3. Implementation-level scope separation.** Companion architecture
provides this structurally. The /deep-plan must include, per companion, an
explicit scope manifest naming what it uses from shared infrastructure,
what it does NOT share with other companions, and what would indicate
scope leakage.

---

## Open questions (for Phase 5 / scoped deep-research)

Questions that need answers before planning can lock. User's routing
decision from Phase 1 was to run tight scoped `/deep-research` on these
topics before `/deep-plan` begins.

1. **Lineage ledger shape.** What fields, what persistence format, how
   multi-repo edges are represented, how repo-rename / file-split /
   file-merge events are handled. Subject to the hard-cap from pre-plan
   deliverable #1.
2. **Target-process-profile discovery mechanism.** How to read another
   repo's `.github/workflows/`, `.husky/`, `.claude/settings.json`, CI
   config, pre-commit hooks, and review gates, and extract a useful
   directive profile. Gate-discovery primary, shape-discovery secondary
   but named.
3. **Local-context sync mechanism specifics.** How `/context-sync`
   actually walks user-scoped and machine-scoped surfaces, detects drift,
   and moves only what should move without false positives. Whether it
   needs the full ledger or a lightweight drift record.
4. **Concrete item list of local-context sync sources.** Initial set:
   canonical memories, tenets (user + project), CLAUDE.md local tweaks,
   settings.local.json, env variables, slash-command aliases,
   keybindings, git config overrides, husky local, status-line config.
   Final set to be confirmed.
5. **Understanding-vs-mechanical dividing line.** What data the tool uses
   to decide whether a movement needs full comprehension or can go
   straight to recipes. Cache-key shape: same unit-type? same target?
   same verdict? same convention profile?
6. **Orchestrator-to-companion routing mechanism.** Static list? Manifest
   scan? `.claude/skills/` walk with a marker frontmatter field
   identifying movement-companion status?
7. **Ledger physical location.** JASON-OS `.claude/state/ledger.jsonl`?
   Single file or sharded? Locking semantics.
8. **Whether `/context-sync` needs the ledger at all.** Its file set is
   known-static; a lightweight drift record may suffice.
9. **"Check what's out of sync" UX when ledger is sparse or empty.** How
   the tool behaves on first invocation or first run for a newly-tracked
   category.
10. **Whether local-context sync runs across-the-board or per-category
    selectable.** Single "sync everything" invocation vs. per-category
    fine-grain.
11. **Cross-machine home/work locale handling.** User has both repos on
    multiple machines; some user-scoped content may be machine-specific
    even when scope-tagged "user." How the tool distinguishes.
12. **Decision register contents.** What disposition each decision from
    the five prior plans receives. Pre-plan deliverable #3 produces this.

---

## Routing (Phase 4 output)

**Chosen route: scoped `/deep-research` on the open questions above, then
`/deep-plan cross-repo-movement-reframe`.**

The user selected this route in Phase 1 — "tight scoped research before
/deep-plan" — based on the reasoning that several open questions (lineage
ledger shape especially) are load-bearing for the architecture and have
been failure points historically when deferred to planning-time
discovery.

Research scope for the pending `/deep-research` pass:

- Lineage ledger shape, persistence, and multi-repo edge handling
  (priority: highest — ledger-as-datastructure has broken before).
- Target-process-profile discovery mechanism (reading other repos'
  gates and shape expectations).
- Local-context sync mechanism specifics (walking user/machine surfaces
  without false positives).

Expected research output feeds into `/deep-plan cross-repo-movement-reframe`,
which produces the single planning deliverable that supersedes
sync-mechanism, schema-design, labeling-mechanism, structural-fix, and
migration-skill plans.

**Handoff artifacts for /deep-plan (once research returns):**

- This document (`BRAINSTORM.md`)
- `PHASE_0_LANDSCAPE.md` (landscape context)
- `challenges/contrarian.md` (stress-test)
- Research output (forthcoming)
- Pre-plan deliverables 1–4 (ledger schema cap, verb analysis, decision
  register, bootstrap scaffold definition — produced either as part of
  the research pass or in a short dedicated step between research and
  planning)

---

## What gets paused or deleted

- **Phase G.2 of the structural-fix** is paused and almost certainly
  superseded under Direction D'. The architecture-fix commit `1b2afb4`
  survives unchanged (generic infrastructure). The in-flight structural-
  fix files on the branch need disposition in the decision register
  (pre-plan deliverable #3). The G.1 preview catalogs
  (`.claude/sync/label/preview/{shared,local}.jsonl`) and the aggregated
  G.1 findings (`.claude/state/g1-findings.json`) are candidates for
  deletion once the decision register confirms they're superseded.
- **Thread B sync-mechanism first-pass assessment**
  (`.research/sync-mechanism/FIRST_PASS_ASSESSMENT.md`) is superseded.
  Its content may contribute context to the decision register but it is
  no longer a standalone planning input.
- **The five prior plans** (sync-mechanism, schema-design,
  labeling-mechanism parent, structural-fix, migration-skill) are
  formally superseded by the /deep-plan deliverable that will be
  produced after research completes. Their decision artifacts remain
  as inputs to the decision register (pre-plan deliverable #3).
  **Formal deprecation requirement (user-specified, Session 18):**
  once the new /deep-plan deliverable is complete, the five prior
  plans must be formally deprecated as planning artifacts — not left
  in an ambiguous "superseded in spirit" state. Deprecation
  mechanics (DEPRECATED banner at top of each plan doc, pointer to
  new plan, archival of planning state files, cleanup of gitignored
  state) are part of the new plan's closeout phase. Prior
  artifacts remain readable for historical reference but are not
  authoritative for any future work.

---

## Meta-principle confirmed this session

**Thoroughness and completeness balanced against not-over-engineering.**

Quoted as a design constraint with the same weight as the anti-goals.
Every architectural decision in /deep-plan must pass the test: does this
add weight that earns its place, or is it being added because it feels
complete? Named explicitly in the user's words to carry forward as a gate
during planning.

---

**End of Phase 4. Routing: scoped `/deep-research` → `/deep-plan
cross-repo-movement-reframe`.**
