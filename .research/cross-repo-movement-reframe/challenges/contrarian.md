# CONTRARIAN CHALLENGE — cross-repo-movement-reframe, Direction D

**Date:** 2026-04-23 (Session 18)
**Target:** Direction D — migration-v2 architecture extended to all four movement
scopes, understanding-primary, ledger-tracked
**Persona:** contrarian-challenger (Free-MAD protocol)
**Method:** steel-man per challenge, pre-mortem framing, evidence from prior
research artifacts. No back-down from high-confidence claims.
**Prior challenge status (migration contrarian.md):** noted below per challenge;
not repeated wholesale.

---

## Prior challenge inventory — what still applies, what doesn't, what's new

The migration contrarian (8 challenges) targeted the `/migration`-only v1
design. Under Direction D that design is absorbed and extended to four scopes.
Here's the mapping:

- **Migration Challenge 3 (bootstrap circular dep):** Still applies and is
  *upgraded* in severity — Direction D adds three more scopes, and the
  bootstrap problem now encompasses ALL four movement types, not just CAS.
  Addressed as Challenge 5 below.
- **Migration Challenge 6 (D16 bidirectional asymmetry):** Partially dissolved
  — Direction D explicitly covers sync-back (slice 2) as a first-class scope.
  But the design-work to handle JASON-OS → SoNash transformations correctly
  is still unspecified; the asymmetry hasn't been solved, just promoted to
  "acknowledged scope." Absorbed into Challenge 3 below.
- **Migration Challenge 2 (CAS auth/network):** Largely dissolved. D19' made
  CAS a peer tool, not a substrate. Direction D covers inbound extraction from
  unowned repos in CAS-as-research mode (slice 3), but explicitly does NOT
  write into unowned repos. The gh api / git clone network surface is still
  there in slice 3 if CAS-as-research means cloning remote repos. This
  becomes a narrower concern absorbed into Challenge 6 below.
- **Migration Challenge 1 (decomposition middle-ground):** No longer directly
  applicable — Direction D is not presenting a "router + ancillaries" vs
  "monolith" choice; it's a single skill. Dissolved.
- **Migration Challenges 4, 5, 7, 8:** Absorbed into their counterparts in
  the new challenges below. Not repeated.

New challenges that Direction D introduces (not covered by migration contrarian):
Challenges 1, 2, 4, 7, 8 below are net-new failure modes that arise specifically
from the four-scope extension and the supersedes-five-plans ambition.

---

## Challenge 1 — Ledger drift is structurally inevitable; "built incrementally, stays small" is wishful

**Severity:** Critical

**Steel-man:** The ledger-as-feature design explicitly rejected Direction E
(ledger-as-protagonist) precisely because pre-population was what broke G.1.
The incremental ledger starts empty, gains one record per movement, and grows
only as real work happens. This is the correct lesson from the 30+ field
universal schema failure: stop designing from evidence, stop pre-populating,
let the record accumulate naturally. A ledger that starts at zero and grows
one record at a time cannot suffer the same collapse as a 461-record
agent-fleet back-fill.

**Why this could fail:** The ledger-stays-small claim assumes movements are
rare. But Direction D covers four scopes including local-context sync (slice
4, which covers memories, tenets, CLAUDE.md, settings.local, env, keybindings,
git config overrides, husky local, status-line config). That list has roughly
ten categories of file. Local-context sync is not a one-off event — it runs
every time the user works across machine contexts. If the ledger records every
local-context sync event, and local-context sync happens once per session on a
two-machine setup, the ledger accumulates ~720 records per year just from slice
4 alone, before any actual migration work.

More structurally: what field schema does a ledger record carry? The state file
flags this as an open question ("exact shape of the lineage ledger — fields,
persistence, multi-repo edges, repo-rename/file-split handling"). That open
question has not been resolved. Every prior attempt to resolve a similar
question (what does a catalog record carry? what does a sync record carry?)
has produced field-count growth under pressure. The mechanism that drove
30+ universal fields + 41 per-type extensions was not "designing from evidence"
as an ideology — it was the entirely reasonable pressure of discovering that
each new movement type needs a few new fields to make its record legible.
Direction D has four movement scopes. Four scopes means four different record
shapes trying to share one ledger data structure. That exact pressure
will re-emerge the first time the planner sits down to design the ledger schema.

The claim "seeded only from prior ports" is also ambiguous. If "prior ports"
means the commits and PR history on the branch, seed derivation requires
understanding git history — which is non-trivial and exactly the kind of work
that produced the agent-fleet failure last time.

**Evidence:**
- PHASE_0_LANDSCAPE.md lines 48-51: "Schema field count is the actual root
  cause of today's pain... Today's 30+ universal fields plus 41 per-type
  extensions is the direct cause of the 2,452 needs_review entries."
- State file open_questions[0]: ledger shape, persistence, multi-repo edges,
  repo-rename/file-split handling are all explicitly unresolved.
- State file open_questions[5]: "UX of 'check what's out of sync' when ledger
  is sparse or empty" — acknowledges the empty-ledger case but defers it.
- SESSION_CONTEXT.md lines 50-56: scale metrics from G.1 — four movement
  scopes with different record shapes is the same structural pressure that
  produced those metrics.

**Recommendation:** Resolve the ledger schema before /deep-plan begins, not
inside it. Specifically: enumerate the maximum field set a ledger record
needs to serve all four movement scopes, then prune to the minimum that makes
each scope's records legible. If the minimum field set for all four scopes
exceeds twelve fields, that is a strong signal Direction D's unified ledger
is doing too much and scope separation is needed at the data layer even if
the user surface stays unified. Mitigation would not change Direction D's
shape but would hard-cap the ledger schema before design begins — which is
a meaningful architectural constraint.

---

## Challenge 2 — Four scopes look coherent at the noun level but collide at the verb level

**Severity:** Critical

**Steel-man:** The four scopes were not arbitrary additions — they were
surfaced by examining the actual movement work the user does across repos.
Slice 1 (one-time port) and slice 2 (sync-back for evolved ports) are
genuinely the same operation in two directions; folding them together is
correct. Slice 3 (inbound extraction from unowned repos) is just slice 1
with a read-only destination constraint and CAS-as-research replacing full
understanding. Slice 4 (local-context sync) is the lightest-weight case:
known source, known destination, well-defined file set, no transformation
needed. A single conversational surface covering all four is coherent as
long as the internal routing is clean.

**Why this could fail:** Sit with the verb each scope requires and notice
where the seams break.

Slice 1 (one-time port): the verb is "transform and land." Source file
exists; destination idioms must be inferred or discovered; transformation
plan is nontrivial; gates include destination-repo's CI, hooks, review
infrastructure. The understanding layer does substantial work.

Slice 2 (sync-back for evolved ports): the verb is "diff and re-apply." The
destination now has a version that was transformed from source. Source has
evolved. The operation is not re-running the original port — it is a three-way
merge where the transformation delta and the evolution delta must be reconciled.
This verb requires knowing what changed in source since the last sync, what
changed in destination since the last sync, and which changes conflict. That's
a completely different operation from "transform and land." The ledger has to
carry enough state to support this diff. The understanding layer reasoning for
sync-back is fundamentally different — it's not "what does this file mean in
the destination idiom" but "which of source's changes should flow through to
destination and which should be overridden by destination's local evolution."

Slice 3 (inbound extraction from unowned repos): the verb is "observe and
distill." You don't write to the source. The extraction goal is abstracting
a pattern or file, not executing a transformation plan. The understanding layer
is doing research work, not transformation work. The mechanical layer's recipe
library is largely irrelevant — you have no catalog of "how to extract from
unowned repos" recipes because every unowned repo has its own structure.

Slice 4 (local-context sync): the verb is "diff and copy with scope rules."
This doesn't need the understanding layer at all in the common case. The files
are known (memories, tenets, CLAUDE.md), the destination is known, the
transformation is zero (or near-zero — maybe path rewriting). The entire
two-layer architecture is overhead for this case. A 30-line script would
handle it.

These four verbs are not a family with a shared skeleton. They are four
distinct operations that share a surface-level concept ("move things between
repos") but diverge completely in what they need from the internal machinery.
The ONE TOOL framing forces a design that serves all four verbs through the
same two-layer architecture. Under design pressure, the understanding layer
will grow to handle the sync-back three-way merge case, the recipe library
will acquire extraction-oriented recipes, and the local-context sync path
will either be implemented as a degenerate case of the full architecture
(over-engineered) or as a special case that bypasses most of it (in which
case it's a second tool hiding inside the first).

**Evidence:**
- State file meta_principles[2]: "Four movement scopes cleanly separated in
  design but one conversational surface" — acknowledges the design tension but
  resolves it by fiat rather than by demonstrating the separation is tractable.
- BRAINSTORM_v2.md lines 37-42: the understanding layer produces "structured
  answers about what the unit IS, how it WORKS, what its DEPENDENCIES are, what
  the DESTINATION'S equivalent shape looks like, and how the source concept MAPS
  to destination shape." None of these questions apply to slice 4 local-context
  sync. All four questions have completely different answers for slice 3
  inbound-extraction vs slice 1 one-time port.
- Migration BRAINSTORM_v2.md lines 87-96: the seven-phase arc was designed for
  slice 1 only. Slices 2, 3, and 4 were not in scope when the arc was designed.
  The arc is being extended to three additional verb-shapes it was not designed
  for.

**Recommendation:** Before /deep-plan begins, run a concrete verb analysis
per scope: for each of the four scopes, write one sentence naming the verb and
one paragraph naming what the understanding layer does and what the mechanical
layer does. If any scope's paragraph reads "understanding layer is not
involved" or "mechanical layer is not involved," that scope does not share the
two-layer architecture and should be implemented as a named sub-flow or a
companion script, not as an equal peer in the same architecture. This would
change Direction D only in that it might demote slice 4 from "fourth scope of
the main architecture" to "lightweight companion that shares the conversational
surface but not the internals." The direction survives; the architecture claim
becomes more precise.

---

## Challenge 3 — Understanding-primary is heavier per invocation than the common case warrants

**Severity:** Major

**Steel-man:** The inversion from "mechanical as fast path, understanding as
fallback" to "understanding as primary, mechanical as optimization" is
architecturally correct. Mechanical recipes are fragile without understanding
context — a recipe that blindly renames all instances of "SoNash" to
"JASON-OS" will corrupt files where that substitution is wrong. Running
understanding first means the recipe is applied only when the understanding
layer has confirmed it is safe and correct. This is the lesson of the G.1
failure: running mechanical operations on files without genuine comprehension
produces 100% needs_review output. Understanding-primary prevents that.

**Why this could fail:** Understanding-primary is correct for high-stakes
transformations. But the four-scope design includes cases where understanding
is both unnecessary and expensive.

Consider the common case: the user has already ported a skill family from
SoNash to JASON-OS. They've done it three times. The recipe library has
accumulated exact recipes for this family type. The user wants to port the
next skill in the family — same shape, same idiom delta, same transformation
pattern. Under understanding-primary, the understanding layer still runs first,
still invokes model dispatch to comprehend the new skill, still produces a
concept map and an idiom-mapping before the recipe library gets consulted.
That's one to three extra model round-trips for a case where the answer is
already in the recipe cache.

The migration v2 design (BRAINSTORM_v2.md lines 99-137) describes the
understanding layer as running "model-powered comprehension" and "absorbing
research patterns from /deep-research." In the common repeated-port case, that
is direct overhead on the path the user is already trying to accelerate with
the recipe library. The mechanical layer "accumulates value over time" but
under understanding-primary, that value is never accessed as a fast path —
the understanding layer runs every time regardless.

The deeper structural issue: understanding-primary assumes the understanding
layer is cheap enough to run on every invocation without annoying the user.
Model dispatch for deep comprehension is not cheap — it takes wall-clock time,
it costs tokens, and for a repeated familiar port it produces an answer the
recipe library already has. The user who is doing their tenth local-context
sync of the week (slice 4) does not want to wait for the understanding layer
to comprehend a canonical memory file it has comprehended nine times before.

**Evidence:**
- BRAINSTORM_v2.md lines 99-115: understanding layer produces "structured
  answers about what the unit IS, purpose, contract, invariants, collaboration
  with neighbors, dependencies, destination equivalent shape, conceptual
  mapping." This is a substantial model task.
- BRAINSTORM_v2.md lines 128-137: "The understanding layer accumulates pattern
  recognition — after many ports, the skill has seen many conceptual mappings."
  This describes learning over time — but it does not describe a mechanism
  where accumulated learning shortens the understanding-layer invocation. It
  implies the understanding layer runs fully every time.
- State file open_questions[2]: "Dividing line inside the tool between
  understanding-layer-handles-it and mechanical-recipe-handles-it — what data
  drives the decision" — this is explicitly unresolved.

**Recommendation:** Define an explicit "recipe-first with understanding gate"
mode for recognized patterns. When the understanding layer detects it is looking
at a file type for which the recipe library has high-confidence matches, it
should emit a fast verdict ("recipe library covers this; invoke recipes without
full comprehension pass") rather than running full model dispatch. This is a
design detail, not a Direction D change — but it must be resolved in /deep-plan
or the tool will have a speed profile that frustrates repeated-port workflows.
The mitigation is achievable without changing the direction.

---

## Challenge 4 — Superseding five plans in a single /deep-plan deliverable is structurally at risk of silent scope loss

**Severity:** Critical

**Steel-man:** The five prior plans are not five independent systems — they are
five slices of what was always one system, cut by the wrong incision. The
sync-mechanism plan was Pieces 1-5 of building a labeling and sync engine.
The schema-design plan was the data layer for that engine. The labeling-mechanism
plan was the operational layer. The structural-fix plan was a correction of the
labeling-mechanism plan's output. The migration-skill plan was a parallel tool
that was going to consume the sync engine. Superseding them is not combining
five disparate things — it is replacing five wrong slices with one correct
whole. A single /deep-plan deliverable is exactly the right shape for this.

**Why this could fail:** "Supersedes" is a scope declaration, not a content
declaration. What it does not answer is: which specific decisions from each of
the five plans survive into Direction D and which are discarded? Without an
explicit inventory of surviving vs. discarded decisions, the /deep-plan will
silently be incomplete in one of two ways: either it re-discovers decisions
that were already made and resolved (wasting planning time and introducing
contradictions), or it skips decisions that were made and resolved because
the planner assumes "superseded" means "handled" when actually it means
"overwritten without replacement."

The scope of what is being superseded is substantial. The sync-mechanism
brainstorm alone produced a five-piece architecture with its own decisions.
The structural-fix plan has fourteen decision categories (D1.1-D14.4),
nine phases (A through I), and eight commits of already-executed work. The
migration-skill brainstorm has 38 decisions (D1-D38). The schema-design plan
has Pieces 1-2's worth of decisions plus the v1.3 schema that is currently
in production on the branch. Commit 1b2afb4 on the live branch includes
apply-arbitration.js, aggregate-findings.js, synthesize-findings.js — generic
infrastructure that was explicitly called out as surviving the reframe. Does
the single /deep-plan deliverable preserve those artifacts? Does it know to
preserve them?

The 200+ item plan collapse risk is real. Migration-skill v2 alone, if taken
to /deep-plan without the reframe, would produce a substantial plan. Adding
three more scopes and a ledger design and target-process-profile discovery
and local-context sync and the supersession of four more plans will not
reduce that. It will produce a plan whose breadth exceeds what a single
/deep-plan execution can coherently deliver in one session sequence.

**Evidence:**
- BRAINSTORM_v2.md lines 290-305: implementation consequences from D36-D38
  alone include a new /recipe-audit skill, a retrofit of /deep-research, and
  adding SCOPE sections to fourteen existing skills. None of these appear in
  Direction D's sketch or the state file. Are they in or out?
- SESSION_CONTEXT.md lines 67-78: the in-flight changes table lists eight files
  from the structural-fix work that are uncommitted. Those changes represent
  work that was executed but never promoted. They exist in a state of
  "superseded by reframe but physically on disk." The /deep-plan either
  accounts for them or silently loses them.
- PHASE_0_LANDSCAPE.md lines 86-89: "Survives unchanged — architecture-fix
  from this session (commit 1b2afb4): applyArbitration, apply-arbitration.js,
  aggregate-findings.js, synthesize-findings.js, plain-language-reminder hook."
  These are named as surviving. But how the /deep-plan knows they survive, and
  what their role is in the new design, is unspecified.
- State file anti_goals[3]: "NOT a multi-piece sequential architecture" —
  but the migration-skill v2 explicitly has a seven-phase arc with internal
  sequencing. The anti-goal rules out the architecture of the superseded plans;
  it does not prevent a complex single-plan internal structure from emerging.

**Recommendation:** Before /deep-plan begins, produce a one-page decision
register that explicitly marks each decision from each of the five plans as:
(A) survives unchanged in Direction D, (B) superseded with named replacement,
or (C) discarded with rationale. This register becomes the handoff document
from the brainstorm to the /deep-plan. Without it, the /deep-plan author is
working from incomplete information and the "supersedes all prior plans" claim
will produce a plan with gaps. This is a pre-/deep-plan deliverable, not a
Direction D change.

---

## Challenge 5 — Bootstrap paradox is unresolved and worse under Direction D than under migration v2

**Severity:** Critical

**Steel-man:** Migration v2 already resolved the bootstrap paradox for
migration-skill specifically via D30 (v0.5 scaffold) and D19' (CAS is a peer,
not a substrate). The v0.5 scope (file + workflow unit-types) is small enough
to build without the tool needing to port itself. The first real use of the
tool is a real but small port — not 143 hours of CAS. The bootstrap is broken
into "build the tool minimally, then use it for real work, then grow it." That
is a credible resolution for the migration-skill case.

**Why this could fail:** Direction D is not just migration-skill. It is four
scopes plus a ledger plus target-process-profile discovery plus local-context
sync. The bootstrap question for Direction D is: which scope does the user use
to move Direction D's own skill files into SoNash when Direction D is ready?

This is not a rhetorical question. Direction D explicitly supersedes the
migration-skill plan. The migration-skill plan had D31 as its v0.5 acceptance
criterion: port one real skill end-to-end. Under Direction D, the "one real
skill" that the tool should dogfood against is the tool itself — or at minimum
the skill files that constitute Direction D's implementation. Those skill files
live in JASON-OS. They need to go to SoNash at some point. The tool has to
be able to move them.

But the skill files can only be moved once the tool works. And the tool doesn't
work until the skill files are complete and tested. The v0.5 scaffold approach
breaks this for migration-skill only because the file and workflow unit-types
are simpler than the full architecture. Under Direction D, the local-context
sync scope (slice 4) is the simplest scope — but the skill files for a
four-scope tool are not simpler than the skill files for a one-scope tool.

The second bootstrap problem: target-process-profile discovery requires the
tool to write into SoNash at least once to learn SoNash's gates and guardrails.
That first write is the riskiest write — the one where the tool's discovery
logic is being validated for the first time. Under Direction D, discovery is
"focused on gates/guardrails as primary, shape-expectations as secondary" and
is "cached per-repo." The cache does not exist until the first write happens.
The first write cannot be validated against the cache. This is not a bootstrap
paradox per se, but it is a cold-start problem where the most dangerous
operation (first write into a repo whose process-profile is unknown) is also
the operation that builds the safety net for all subsequent operations.

**Evidence:**
- State file sketch: "Target-process-profile discovered on first write into
  each owned repo and cached." First write is both discovery and execution —
  no pre-validation is possible.
- Migration contrarian Challenge 3 (bootstrap circular dep): explicitly named
  this as CRITICAL for migration-only scope. Direction D extends the scope,
  which cannot reduce the severity.
- PHASE_0_LANDSCAPE.md lines 54-55: "Bootstrap circularity is a real failure
  mode... The resolution is an explicit v0.5 scaffold that does file + workflow
  movement without the harder unit-types." This v0.5 scaffold was for
  migration-skill. Direction D's equivalent bootstrap resolution is unnamed.

**Recommendation:** Name the Direction D bootstrap scaffold explicitly —
equivalent to migration-skill's v0.5. The scaffold should cover exactly one
scope (the simplest: likely local-context sync or file-only one-time port)
with the ledger disabled or minimal and target-process-profile discovery run
in read-only mode (observation without write). The tool's self-dogfood
criterion (moving its own skill files to SoNash) should be explicitly deferred
until after the scaffold proves the file unit-type works end-to-end. This is
a design constraint for /deep-plan, not a Direction D rejection.

---

## Challenge 6 — The conventions-as-guardrails reframe discards shape-expectations prematurely

**Severity:** Major

**Steel-man:** The reframe from "shape-expectations" (directory layout, naming
conventions, structural patterns) to "gates-and-guardrails" (hooks, CI,
review infrastructure) is correct as a prioritization of what matters most
when writing into another repo. Gates are the things that will actually reject
or accept your work — a file in the wrong directory might not trigger any
gate, but a file that fails a lint check will block the PR. Discovering gates
first ensures the tool produces work that passes the destination's automated
checks. Shape-expectations can be inferred from the file system after the gate
profile is known.

**Why this could fail:** Gates tell you whether work passes; they don't tell
you where to put it. The scenario this reframe fails is: the tool emits a new
skill into SoNash's skill directory structure. All gates pass — the file is
valid syntax, tests pass, CI is green, the hook doesn't reject it. But the
file is in the wrong directory because the tool inferred shape from a single
example rather than from the actual directory convention. SoNash's skill
directory convention is not enforced by any gate (you can't write a CI check
that detects "this skill is in the wrong subdirectory" without knowing what
subdirectory it should be in). The output is technically gate-compliant but
structurally wrong, and the only person who notices is a human reviewer.

More concretely: JASON-OS skills live in `.claude/skills/<slug>/SKILL.md`.
SoNash may have a different convention — skills nested by category, or with a
different naming scheme, or with required companion files (SCOPE.md,
EXAMPLES.md) that JASON-OS doesn't require. None of these are CI-detectable
if the destination doesn't have a lint rule for them. Target-process-profile
discovery that focuses on hooks and CI will not discover these shape
requirements. The tool will emit work that looks correct to all gates and is
structurally wrong to any human who reads it.

Shape-expectations were not demoted because they turned out to be unimportant.
They were demoted because the prior research over-invested in them (the
seven-phase arc's Phase 3 idiom mapping was shape-expectations made primary).
The correct move is to keep both in the profile, with gates as the
machine-checkable layer and shape as the human-legible layer.

**Evidence:**
- State file sketch: "Discovery focuses on gates/guardrails (hooks, CI, review
  infrastructure) as primary, shape-expectations as secondary." "Secondary"
  does not mean "excluded" — but under implementation pressure, secondary
  concerns tend to be implemented incompletely or deferred.
- BRAINSTORM_v2.md lines 99-115: migration v2's understanding layer explicitly
  addresses "destination's equivalent shape" as one of five structured questions.
  That understanding work was demoted to "secondary" in Direction D without a
  design change that covers the demotion.
- PHASE_0_LANDSCAPE.md lines 60-69: "scrapped or radically simplified" list
  includes "41 per-type extension fields" — those fields existed partly to
  carry shape information. Scrapping them without a replacement for shape
  discovery leaves a gap.

**Recommendation:** Restore shape-expectations to a named (not "secondary")
component of the target-process-profile. Specifically: after gate discovery,
the profile should include a minimum shape record: directory convention for
each unit type the tool will emit, required companion files per unit type, and
naming scheme. This does not require the 41-field schema — three fields per
unit type is sufficient. The mitigation is additive to Direction D, not a
direction change.

---

## Challenge 7 — The first over-engineering failure is the conversational dashboard trying to do too much

**Severity:** Major

**Steel-man:** The conversational dashboard is the correct surface for this
tool. The anti-goal "NOT --flag-driven CLI" is well-grounded — the prior
research showed that conversational + mechanical interweaved is both what the
user wants and what the tool's comprehension-heavy work demands. A dashboard
that presents the user with a unit-type-driven menu, explains what it is
about to do, confirms before each gate, and reports results in plain language
is the right user-experience design for a tool that is doing genuinely complex
cross-repo work.

**Why this could fail:** The conversational dashboard is doing too many jobs
simultaneously: it is the routing layer (decide which scope and unit-type
applies), the briefing layer (explain what is about to happen), the
confirmation layer (get approval before each gate), the progress layer (show
what is happening), the error layer (explain what went wrong), and the summary
layer (here is what was done). For four scopes with different internal
architectures, each of those layers needs different content depending on which
scope is active.

The first over-engineering failure will be the discovery phase of the
dashboard. When the user says "move this skill to SoNash," the dashboard has
to determine: which scope (slice 1? slice 2 if it was already ported?), which
unit type (single file? family?), what the target-process-profile says about
SoNash, whether the ledger has a record for this skill, and what the
understanding layer comprehended about the skill. All of that happens before
the dashboard has anything coherent to show the user.

The result is a multi-step discovery sequence that the user experiences as
"the tool is figuring out what I asked." For simple, repeated operations (the
tenth local-context sync, the second skill in a family that was already
scoped), this discovery overhead becomes visible latency that turns a
simple operation into a ceremony. The dashboard becomes the over-engineering
failure point because it cannot distinguish "I need full discovery" from
"I already know what this is" without running the discovery first.

The meta-principle "thorough and complete without over-engineering" will be
violated not by adding unnecessary features but by the overhead of
comprehensiveness on every invocation, including the ones that don't need it.

**Evidence:**
- State file meta_principles[0]: "Thoroughness and completeness balanced
  against not-over-engineering" — this is a confirmed tension the brainstorm
  recognized, but recognition is not resolution.
- State file anti_goals[1]: "NOT hook-driven in v1 (conversational and
  direct-invocation only)" — conversational-only means the dashboard is the
  only execution path. There is no lightweight "just do it" path that bypasses
  the dashboard for known-simple cases.
- BRAINSTORM_v2.md lines 87-96: the seven phases include Phase 0 (context
  load), Phase 1 (target pick), Phase 2 (discovery + comprehension) — these
  three phases execute before any transformation happens. For a
  repeated familiar port, all three phases produce output the user already
  knows.

**Recommendation:** Design an explicit "fast path" for recognized patterns:
when the dashboard identifies a known unit type with high-confidence recipe
coverage and a clean ledger record, it should offer the user a one-step
confirmation ("I recognize this as the same pattern as the last three skill
ports; here is the recipe plan; confirm to proceed") rather than running the
full seven-phase arc. This fast path is not a bypass of the dashboard — it is
a mode of the dashboard for recognized cases. This is achievable within
Direction D's design and would prevent the over-engineering failure mode without
reducing capability.

---

## Challenge 8 — Local-context sync is a forced fit; it is a simpler tool hidden inside a complex one

**Severity:** Major

**Steel-man:** Local-context sync (memories, tenets, CLAUDE.md, settings.local,
env, keybindings, git config overrides, husky local, status-line config) is a
legitimate cross-repo movement problem. The user has JASON-OS on two machines
and SoNash on one of them. When tenets evolve, they need to propagate.
Including it in the ONE TOOL is consistent with the framing: different things
move differently, but the user shouldn't have to invoke a different tool for
each. The conversational surface handles it via a named scope; the user
experience is unified even if the internals are simpler.

**Why this could fail:** Local-context sync was added to the brainstorm
after the other three scopes were settled. It was added to the brainstorm
directly — not derived from the prior research. None of the prior plans
(sync-mechanism, schema-design, labeling-mechanism, structural-fix,
migration-skill) treated it as part of the tool's scope. The migration v2
BRAINSTORM explicitly lists its anti-goal as "NOT a second /sync" — and
local-context sync is precisely the continuous bidirectional sync pattern
that /sync was designed to cover.

The test of whether local-context sync belongs in Direction D or in a
separate tool is: what does local-context sync share with the other three
scopes at the implementation level?

Slice 1 (one-time port) uses: understanding layer, recipe library,
ledger, target-process-profile, seven-phase arc.
Slice 4 (local-context sync) uses: a file list (known, static),
scope-tag enum (universal/user/project/machine/ephemeral — already
built and validated), diff logic (did the file change?), copy logic
(copy if changed). It does not use: understanding layer, recipe library,
phase arc, target-process-profile discovery.

The shared surface between slice 4 and slices 1-3 is: the conversational
dashboard surface, the ledger (maybe), and the security infrastructure.
Everything else is different. This is not a scope that shares internals
with the other three — it shares the user's mental model and the UI surface
only.

A separate `/context-sync` skill would be: ~60 lines, built on the
scope-tag enum already in production, straightforward diff-and-copy logic,
no model dispatch needed, no recipe library, no ledger complexity. It
would be shippable in a single session. Including it in Direction D means
it either gets the full architecture overhead (over-engineered), or it gets
a special-cased implementation path (complexity hidden inside the unified
tool), or it gets deferred to v2 (which would be the honest result of
scope pressure).

**Evidence:**
- State file open_questions[1]: "Concrete item list of local-context sync
  sources" is explicitly unresolved. The list already includes ~ten file
  categories. This is not a small scope.
- State file open_questions[6]: "Whether local-context sync runs
  across-the-board or per-category selectable" — this is a local-context-sync
  specific question that the other three scopes don't need to ask.
- Migration BRAINSTORM_v2.md anti_goals: "NOT a second /sync" — local-context
  sync IS a sync operation. Including it in Direction D reopens the
  anti-goal that migration v2 explicitly closed.
- PHASE_0_LANDSCAPE.md lines 72-73: "/sync vs /migration boundary itself.
  Dissolved." The dissolution is correct for slices 1-3. For slice 4, the
  dissolution reintroduces everything the /sync design was trying to handle,
  inside a tool that wasn't designed for it.

**Recommendation:** If the ONE TOOL framing must hold, implement slice 4 as
a named companion skill (`/context-sync`) that shares the conversational
surface pattern and the ledger format but is not architecturally unified with
slices 1-3. The user sees one tool family; the implementation is two clean
tools that share a ledger schema but not an architecture. This would change
Direction D: the four scopes become three scopes in the core tool plus one
lightweight companion. The supersedes-five-plans ambition is unaffected.

---

## Steel-man: the best honest defense of Direction D

Direction D is not the wrong direction — it is the correct synthesis of what
the prior research kept arriving at without naming. Here is the honest case
for it against all eight challenges above.

On ledger drift (Challenge 1): every prior architecture had a worse
version of this problem. The 30+ field schema failed because it was designed
top-down from a field-inventory. An incremental ledger designed to hold only
movement records — not catalog metadata — is structurally different. The
failure mode in Challenge 1 requires local-context sync to generate very high
record volume (720/year estimate) and requires the ledger schema to expand
under four-scope pressure. Both of these are preventable with explicit
up-front constraints. The direction is defensible if the schema is capped
before design begins.

On verb collision (Challenge 2): the four scopes do have different verbs,
but the conversational surface genuinely unifies them in a way the user
experiences as one tool. The internal separation is achievable if each scope
gets its own clearly bounded implementation path. The failure mode is
allowing the architecture to force unification at the implementation level
when only user-level unification was required. Direction D's own meta-principle
("four movement scopes cleanly separated in design") is already the correct
mitigation — it just needs to be honored in implementation.

On understanding-primary overhead (Challenge 3): the fast path for recognized
patterns is a design detail that does not require changing the direction.
Understanding-primary is the correct default. The overhead only becomes a
problem if no fast path is ever built. Direction D can accommodate a fast
path without changing its architecture.

On supersedes-five-plans (Challenge 4): the collapse is correct. Five plans
were wrong because they were sliced wrong, not because they were too complex.
A single plan can cover everything if it is organized by the correct seam
(unit-type-driven movement) rather than the wrong seam (sync vs migrate vs
schema vs labels). The silent scope loss risk is real but preventable via the
decision register recommendation.

On bootstrap (Challenge 5): the v0.5 scaffold approach is proven to work
from migration v2. Direction D needs its own named bootstrap scaffold, but
the pattern is already designed. This is a planning detail, not a direction
problem.

On shape-expectations demotion (Challenge 6): the claim is that gates are
primary and shape is secondary, not that shape is absent. The direction
survives if shape discovery is kept as a named (and implemented) component
of the target-process-profile.

On dashboard over-engineering (Challenge 7): the fast path is achievable
within the direction. The over-engineering failure is avoidable by design
decisions that recognize the heavy path vs. the recognized-pattern path.

On local-context sync (Challenge 8): this is the strongest challenge. The
case for separation is concrete and the case for unification is thin (shares
UI, shares ledger format, shares almost nothing else). But Direction D's
"four scopes cleanly separated in design" principle, taken seriously, would
permit local-context sync to be a companion skill that shares the surface
without sharing the architecture. The direction survives if this separation
is explicit.

The direction is defensible. Four of the eight challenges (1, 4, 5, 6) are
solvable with pre-/deep-plan work that does not change the direction. Two
(3, 7) are fast-path design details that /deep-plan must include but don't
change the architecture. One (2) requires scope honesty about implementation
boundaries. One (8) requires either an explicit companion-skill separation or
a compelling argument for full unification that has not been made yet.

---

## What I'd build instead — if the pre-mortem changes the direction

Direction D survives its pre-mortem. I am not proposing a different direction.

But the ONE constraint that most needs to be honored in /deep-plan to prevent
the failure modes is this:

**Scope separation must be enforced at the implementation level, not just
declared at the design level.** Every challenge above (ledger drift, verb
collision, dashboard over-engineering, local-context sync forced fit) has
the same root cause: Direction D's "one surface but four scopes cleanly
separated" principle is easy to honor at the brainstorm level and hard to
honor at the implementation level. The natural pressure in /deep-plan is to
find shared abstractions across scopes and build toward them — which is
exactly what produced the 30+ field schema and the 41 per-type extensions
from the wrong side.

The /deep-plan deliverable must include, for each of the four scopes, an
explicit implementation boundary document that names: what this scope uses
from the shared infrastructure, what it does NOT share with the other scopes,
and what would indicate that the scope's implementation is leaking into
another scope's territory. Without this, the "cleanly separated" principle
is aspirational at implementation time, and the brainstorm's elegant
four-scope design will produce the same architecture collapse that the five
prior plans produced.

If the /deep-plan author applies that one constraint consistently, Direction
D is buildable, coherent, and likely to survive its first six months.

---

## Summary table

| Challenge | Severity | Pre-mortem mechanism | Direction D change? |
|---|---|---|---|
| 1 — Ledger drift | Critical | Four scopes × field pressure = schema creep | No — but ledger schema must be capped before /deep-plan |
| 2 — Verb collision | Critical | Four scopes have different internal architectures; forced unification hides seams | Minor — "cleanly separated" must mean implementation boundaries, not just UI boundaries |
| 3 — Understanding overhead | Major | Fast path absent; common-case invocations run full comprehension | No — fast path is a /deep-plan design detail |
| 4 — Supersedes-five-plans | Critical | Silent decision loss without explicit decision register | No — pre-/deep-plan decision register required |
| 5 — Bootstrap paradox | Critical | First write into SoNash has no target-process-profile yet; Direction D needs its own v0.5 scaffold | No — but bootstrap scaffold must be named explicitly |
| 6 — Shape-expectations demotion | Major | Gate-compliant output can be structurally wrong; shape not discovered = wrong-directory emissions | No — shape must remain a named profile component |
| 7 — Dashboard over-engineering | Major | No fast path = full ceremony on every invocation including simple repeated operations | No — fast path is a /deep-plan design detail |
| 8 — Local-context sync forced fit | Major | Slice 4 shares almost no implementation with slices 1-3; unification is cosmetic | Possible — companion skill separation is the honest resolution |

---

**End contrarian challenge report.**
