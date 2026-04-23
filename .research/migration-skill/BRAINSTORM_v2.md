# BRAINSTORM — /migration skill (v2, re-entry revision)

**Status:** Phase 4 crystallized. Re-entry complete.
**Date:** 2026-04-22 (supersedes BRAINSTORM.md from 2026-04-20)
**Slug:** `migration-skill`
**Authorization for revision:** D28 (iterative re-entry as norm)
**Mode:** Scoped re-entry — addresses premise-shifters surfaced by
`/deep-research` completed 2026-04-21.

This revision supersedes the original [BRAINSTORM.md](./BRAINSTORM.md).
All 29 original decisions (D1–D29) remain in effect except where explicitly
revised below. New decisions D30–D35 added.

---

## What changed, in plain language

Four premise-shifters surfaced during research. Each is now resolved.

**The CAS question.** The original plan made CAS's port /migration's first
big job. Research showed that was circular (you'd need /migration to port
CAS, but /migration couldn't work without CAS). The resolution: CAS and
/migration aren't nested — they're peer tools. CAS understands content;
/migration plans and executes cross-repo transformations. Either can exist
without the other. /migration v0.5 ships with file and workflow migration
scope, not dependent on CAS. CAS stays on the JASON-OS roadmap; when it
arrives, /migration will route into and out of it for understanding-layer
work.

**The architecture question.** The original plan treated /migration as a
heavy skill with eleven built-in transformation primitives, nine signal
detectors, a state machine, and a seven-phase arc. Research hinted at a
simpler alternative (library of recipes + thin runner, the jscodeshift /
Rector / OpenRewrite pattern) but treated it as a source for individual
primitives rather than a real architectural option. The revised architecture
(Path C from this re-entry) keeps the seven-phase arc but restructures the
skill internally into two cooperating layers: an **understanding layer**
(model-powered comprehension of what source units ARE and how they should
look at the destination) and a **mechanical layer** (recipe library that
handles repetitive transformations once the understanding layer has decided
the port's shape). The phases orchestrate both. Understanding is the
primary mechanism of the skill; recipes are its mechanical arm.

**The unit-type gap.** The original D1 listed three unit-types (file,
workflow, concept) but research showed most real ports are *groupings* —
families of skills that only make sense together, systems of related
scripts with shared contracts. The revised D1 adds **family** as a
first-class fourth unit-type. The understanding layer produces
hierarchical concept maps for groupings the same way it produces flat
concept maps for single files.

**The greenfield-clone gap.** The original D23 listed five verdicts
(copy-as-is, sanitize, reshape, rewrite, skip — plus blocked-on-prereq).
Research showed a missing verdict for "the concept is worth taking but
the specific implementation is not — rebuild fresh in destination idioms."
The revised D23 adds **greenfield-clone** as a sixth verdict. /migration
owns greenfield-clone execution itself via Phase 5a conceptual execution;
it does NOT hand off to `/skill-creator` or `/deep-plan`. Those skills
may be invoked as internal tools when useful, but the port stays unified.

---

## 1. Topic (unchanged from v1)

A heavy-lifting skill `/migration` that moves files / workflows / families
/ concepts between **JASON-OS and any external repo** (always with JASON-OS
as one endpoint). Migration is **active transformation** — sanitize + reshape
+ rewrite — adapting source artifacts to fit the destination's idioms, not
passive copy.

/migration is a long-lived tool, not a one-shot SoNash-port utility. It
serves ongoing cross-repo work — adopting skills from external repos,
extracting work back out when sharing, keeping JASON-OS and SoNash aligned
as both evolve, project-to-project migration once JASON-OS is driving
full-stack builds, re-ports as /migration itself improves. Design optimizes
for the tool's whole life, not just the first job.

---

## 2. Chosen direction — Revised Path C

The Hybrid direction from v1 stands. The *internal architecture* of the
hybrid is now specified as two cooperating layers with phase orchestration
on top.

### Seven-phase arc (unchanged from v1)

| Phase | Purpose |
|---|---|
| 0 | **Context** — load /sync registry, read both endpoints' CLAUDE.md, gather ambient context |
| 1 | **Target pick** — menu: file / workflow / family / concept / proactive-scan / resume |
| 2 | **Discovery + Comprehension** — classical filesystem scan + understanding-layer comprehension producing a source concept map |
| 3 | **Idiom mapping** — understanding layer produces destination idiom profile, then the conceptual mapping (source concept X lands as destination shape Y because Z) |
| 4 | **Plan** — writes MIGRATION_PLAN.md with two sections: conceptual transformations (driven by mapping) and mechanical transformations (recipes that matched) |
| 5 | **Execute** — two-stage: 5a conceptual execution (model-powered content generation driven by mapping) + 5b mechanical execution (recipe runner applies matched recipes with gates) |
| 6 | **Prove** — convergence-loop verifies mechanical correctness AND conceptual correctness (does the ported unit DO what the source did?) |

### Two internal layers

**Understanding layer.** Model-powered comprehension. For any migration unit
— file, skill, family, concept — produces structured answers about what the
unit IS (purpose, contract, invariants), how it WORKS (collaboration with
neighbors), what its DEPENDENCIES are, what the DESTINATION'S equivalent
shape looks like, and how the source concept MAPS to destination shape.

The understanding layer absorbs research patterns from /deep-research
(searcher dispatch tuned for port-specific questions — idiom profiling,
destination fingerprinting, cross-repo coupling analysis) rather than
routing out to /deep-research. Contrarian / OTB / dispute-resolution
patterns absorbed from the same pipeline, applied to pressure-test
conceptual mappings before execution.

When CAS lives in JASON-OS, the understanding layer routes semantic-database
work to CAS. Before then, it does the work itself via model dispatch.

**Mechanical layer.** Recipe library. Declarative, composable units that
describe specific transformations (rename, path-rewrite, frontmatter-fix,
import-swap, section-reorder, helper-inject, etc.). Each recipe has
matchers, pre-conditions, post-conditions, a transformation type, and
optional composition with other recipes. Recipes are data, not code —
adding a new transformation pattern is a new recipe file, not a skill-code
change.

The mechanical layer handles the repetitive surface work once the
understanding layer has decided the port's shape. Recipes don't decide
what to port or how; they execute specific known transformations.

### What this buys over time

The understanding layer accumulates **pattern recognition** — after many
ports, the skill has seen many conceptual mappings and knows what kinds of
source shapes tend to map to what destination shapes. The mechanical layer
accumulates a **recipe library** — each transformation pattern figured out
once becomes reusable. Both compound. A growing recipe library means ports
of external repos someone shares (not just SoNash) become progressively
more automatic as the library covers more patterns.

---

## 3. Locked decisions

### Original decisions (D1–D29) from [BRAINSTORM.md](./BRAINSTORM.md)

All remain in effect except where revised below. See v1 for full text.

### Revised decisions

**D1 (revised).** Migration unit — multi-level: **file / workflow / family
/ concept**. Family added as first-class fourth unit-type. Family =
cohesive multi-skill or multi-script unit with shared contracts (CAS's
six skills, ecosystem-audit family, sync-mechanism pieces are all natural
families). Understanding layer produces hierarchical concept maps for
families; the internal dependency DAG is self-documenting within the
family rather than ambient coordination across skill-level units.

**D19 (revised → D19').** Foreign-repo understanding — **CAS and
/migration are peer tools, not nested.** CAS handles research and semantic
understanding ("what is this?"). /migration handles planning and execution
of cross-repo transformations ("move it there, transformed"). Both are on
the JASON-OS roadmap independently. /migration v0.5 and v1 do NOT depend
on CAS existing in JASON-OS. When CAS lands, /migration's understanding
layer routes semantic-database work to CAS via defined invocation contracts
(into CAS for "tell me what this is," out of CAS for source-material
understanding). Before CAS lands, the understanding layer does this work
itself via model dispatch. This supersedes the v1 D19 framing where CAS
was /migration's substrate.

**D23 (revised).** Verdict legend (expanded 6→7) — `copy-as-is` /
`sanitize` / `reshape` / `rewrite` / **`greenfield-clone`** / `skip` /
`blocked-on-prereq`. Greenfield-clone = "concept is worth taking but the
specific implementation is not; rebuild fresh in destination idioms."
/migration owns greenfield-clone execution itself (Phase 5a). Entry
scenarios: (a) unit has a source file whose implementation doesn't
translate (heavy Firebase/Next.js coupling, destination-incompatible
patterns) — understanding layer decides greenfield-clone; (b) unit has
no source file — concept unit-type always pairs with greenfield-clone
verdict.

### New decisions (D30–D35)

**D30.** /migration v0.5 is a named, shippable release. Scope = file +
workflow unit-types. Concept-level migration is committed to v1.1, not
"eventually." Family unit-type support falls within v0.5 capability
naturally because the understanding layer handles hierarchical concept
maps uniformly. CAS port is NOT a prerequisite for v0.5. v0.5 is not
scaffolding-to-be-hidden; it is the real release people can use for
cross-repo work immediately.

**D31.** /migration v0.5's acceptance criterion is: **successfully port
one real SoNash (or other external) skill or utility that JASON-OS
doesn't already have, end-to-end, with the port landing cleanly and
passing convergence-loop verification.** Specific first-target choice
is deferred to /deep-plan phase when current SoNash state can be
inspected (v1 of this brainstorm named specific targets that turned
out to already exist in JASON-OS — `sanitize-error.cjs`, `safe-fs.js`,
`security-helpers.js`, `/convergence-loop` were already ported; D31
corrected 2026-04-22 based on filesystem verification).

**D32.** Architecture — two-layer (understanding + mechanical) with
seven phases orchestrating both. Understanding is the primary mechanism
of the skill, not an escape hatch. Understanding layer ingests research +
challenge + planning patterns from /deep-research and /deep-plan rather
than routing out. Mechanical layer is a declarative recipe library.
Recipes don't decide; they execute.

**D33.** Conversational-explanatory tenet — core JASON-OS cross-cutting
design principle. Every user-facing surface (Claude's direct
communication, every skill's prompts, /migration's conceptual mapping
presentations, MIGRATION_PLAN.md, phase-gate prompts) must be
conversational (prose default, collaborator tone, not command-line
terse), plain-language (jargon only when unavoidable and always
explained inline), and explanatory (rationale with every option,
tradeoffs presented honestly including the preferred option's
weaknesses). Skill-audit rubric gains this as a check.

**D34.** In-house-over-handoff tenet — JASON-OS skill design principle.
When a skill can do something internally, do it internally. External
routing only for genuinely distinct domains (CAS for semantic database,
/sync for labeled file flow). Absorb patterns (research dispatch,
planning workflow, challenges, verification) rather than architecting
around handoffs. Self-contained skills are more coherent for the user
and accumulate specialized tuning over time. Applies to /migration
specifically: ingest research + planning + challenge patterns from
/deep-research and /deep-plan; invoke external skills only as internal
tools (CAS for understanding-layer work when CAS lands, /skill-creator
for fresh-skill scaffolding within Phase 5a); never hand off the port.

**D35.** Greenfield-clone ownership — /migration owns greenfield-clone
execution via Phase 5a conceptual execution. /skill-creator may be
invoked as an internal tool within Phase 5a when fresh-skill scaffolding
is useful, but /migration never hands off the port itself. Concept
unit-type (D1's fourth member) always pairs with greenfield-clone
verdict.

**D36 (/migration-specific).** Recipe curation process —
schema + validator + dedicated audit skill. Every recipe carries mandatory
frontmatter fields (id, description, matchers, pre-conditions,
post-conditions, transformation type, composition declarations, status).
A validator script runs in pre-commit and CI checking every recipe against
the schema. A `/recipe-audit` skill (architectural pattern inspired by the
existing `/label-audit` skill) runs on-demand or as part of /migration's
own self-audit — walks the library, checks recipes against declared
behavior, identifies overlaps, surfaces deprecated or unused recipes,
flags missing documentation. This keeps the library healthy as it grows
rather than letting drift accumulate until something breaks.

**D37 (JASON-OS-wide tenet).** Filesystem verification discipline —
research-sourced claims about codebase state must be verified against the
filesystem before decisions rest on them. Two mechanisms together:

- `/deep-research`'s verification phase MUST include filesystem
  verification of codebase claims as a standard step (not just web
  verification). Every claim asserting a file exists, a function behaves
  a certain way, a skill is present or absent, etc. gets checked against
  actual state.
- Claims in `claims.jsonl` carry a verification-status tag
  (`verified-filesystem`, `verified-web`, `unverified`, `N/A`) with an
  evidence pointer. Downstream skills that reference claims can consult
  the tag; decisions resting on `unverified` claims are flagged.

This discipline is what would have caught the D31 correction before it
became a correction — the research confidently named specific first-port
targets that already existed in JASON-OS.

**D38 (JASON-OS-wide tenet).** Scope definition process — every skill
declares its scope explicitly, via three coordinated mechanisms:

- **Scope manifest** — every SKILL.md includes a SCOPE section (or a
  SCOPE.md companion) with three lists: *in-scope* (what the skill owns
  and implements internally), *routes out to* (capabilities the skill
  uses but doesn't own, and which skill owns them), *not applicable*
  (things the skill explicitly does NOT do).
- **Criteria checklist** — when a new capability is considered for a
  skill, it runs through five questions in order: (1) Does another skill
  genuinely own this domain? (2) Would absorbing this duplicate that
  skill's core purpose? (3) Is the capability used in multiple phases of
  this skill? (4) Does absorbing require significant skill-specific
  tuning? (5) Does the user mental model suffer if routed out (tool-
  hopping)? First two bias toward routing out; last three bias toward
  absorbing.
- **Skill-audit enforcement** — skill-audit rubric gains a new category:
  scope discipline. Audit flags skills whose behavior diverges from
  declared scope; audit flags scope manifests that don't articulate
  clear routing criteria; audit flags in-house capabilities that should
  have been routed out and vice versa.

---

## 3a. Implementation consequences flowing from D36–D38

These decisions have execution work attached. Captured here so they
don't disappear when /deep-plan starts:

- D36 creates a new `/recipe-audit` skill. Work falls under /migration's
  implementation plan; patterns from `/label-audit` directly apply.
- D37 requires a change to `/deep-research` itself — its verification
  phase must filesystem-verify codebase claims. Claims-file schema gains
  verification-status tag. This is a retrofit of existing infrastructure,
  not new skill work.
- D38 requires adding a SCOPE section to every existing JASON-OS skill
  (fourteen skills currently). Bounded one-time cost. Also requires
  updating the skill-audit rubric to include scope discipline as a
  check category.

---

## 4. Anti-goals (updated)

All v1 anti-goals remain in effect. Updated list:

- NOT a second /sync (no batch / bidirectional / continuous / label-driven
  work as /sync's job)
- NEVER silent — every decision requires explicit user confirmation (D8)
- NEVER reshapes or rewrites without permission (D24)
- Not a replacement for /deep-plan or /deep-research at their own call-sites
  (D13) — but DOES absorb their patterns internally where migration-specific
  tuning is warranted (D34)
- Not mandatory — /sync alone is allowed (D14)
- Not a dumping ground — stays focused on migration work; no creep into
  debt tracking / general refactoring
- Works on unlabeled files; routes through /sync when /sync can supply
  data (D15)
- NOT a remote / PR-creation tool in v1 — local-filesystem only (D29)
- NOT a foreign-mode wrapper around CAS (v1 D19 — revised by D19' to
  clarify CAS and /migration are peers, not nested)
- NOT a tool that hands off mid-port — all seven phases complete inside
  /migration (D35)

---

## 5. Open questions status

The twelve research questions from v1 are resolved per
`.research/migration-skill/RESEARCH_OUTPUT.md` (2026-04-21). Two residual
implementation questions carry forward to /deep-plan rather than
re-opening research:

1. Recipe library physical location (inside /migration's folder vs.
   top-level shared vs. SoNash-homed-and-mirrored). Implementation-layer
   question; resolve during /deep-plan.
2. Understanding-layer agent composition (which new agents are needed
   specifically for /migration vs. which existing agents are reused with
   migration-scoped prompts). Implementation-layer question; resolve
   during /deep-plan.

---

## 6. Dependencies + blockers (updated)

**For execution:**

| Dependency | Status | Notes |
|---|---|---|
| /sync engine (Piece 5) | Unbuilt | Phase 0 context load uses it when available; /migration v0.5 works without it (operator-supplied registry for first ports) |
| /convergence-loop skill | **Available in JASON-OS** | Confirmed present 2026-04-22 — Phase 6 Prove works immediately |
| Seed trio (sanitize-error.cjs, safe-fs.js, security-helpers.js) | **Available in JASON-OS** | Confirmed present 2026-04-22 — no port needed |
| /deep-research and /deep-plan skills | **Available in JASON-OS** | Their patterns are absorbed, not invoked |
| CAS in JASON-OS | Unbuilt | **No longer a blocker** per D19' — /migration v0.5 and v1 do not depend on CAS |
| Cross-skill integrations (label-audit, add-debt, pr-review) | Partial/stub | Design-independent; implementation can adapt as these mature |

**For design / research / plan:** **None.** The revised architecture has
no blockers for entering /deep-plan.

---

## 7. Process expectations (D28 + D34 combined)

Path from here remains a loop, not a pipeline:

```
brainstorm (this) → /deep-plan → (optional re-entry) → execute
                                                         ↓
                                    (optional re-entry to plan or brainstorm
                                     if execution surfaces gaps)
```

D28 (iterative re-entry as norm) and D34 (in-house over handoff) together
shape the rhythm: each skill runs its own loops internally when possible,
re-enters sibling skills only when genuinely warranted.

---

## 8. Routing — recommended next action

```
1. /deep-plan migration-skill   ← RECOMMENDED — scope is clear enough to plan
2. Direct implementation         — not recommended; architecture needs a plan
3. Save and continue later       — artifacts persist; resume via /brainstorm migration-skill
```

**Strong recommendation: option 1.** Research is complete, architecture is
resolved, decisions are locked. /deep-plan phase addresses the remaining
two implementation-layer questions (recipe library location, understanding-
layer agent composition) alongside full implementation sequencing.

Note: migration-skill execution is still gated by /sync (when /migration's
Phase 0 context load wants the registry) but /sync's absence doesn't block
v0.5 — operator-supplied registry suffices for first ports. /deep-plan
can sequence around this.

---

## 9. Pointers

- [BRAINSTORM.md](./BRAINSTORM.md) — original v1 (2026-04-20); superseded
  by this revision
- [BRAINSTORM_WIP.md](./BRAINSTORM_WIP.md) — full session-by-session
  ledger with reframe history
- [TRANSCRIPT.md](./TRANSCRIPT.md) — verbatim session 1 (`/port`-era)
- [RESUME.md](./RESUME.md) — pickup guide
- [RESEARCH_OUTPUT.md](./RESEARCH_OUTPUT.md) — 733-line research output
  (2026-04-21, 156 claims, 119 sources, 12 themes)
- [challenges/contrarian.md](./challenges/contrarian.md) — 8 challenges
  (3 CRITICAL, 4 MAJOR, 1 MINOR)
- [challenges/otb.md](./challenges/otb.md) — 9 out-of-the-box angles
- `.claude/state/brainstorm.migration-skill.state.json` — re-entry state
- `.planning/todos.jsonl` T28 — original /migrate todo, unified into
  this brainstorm

---

## 10. Re-entry summary

Four premise-shifters resolved:

| Premise-shifter | Status | Resolution |
|---|---|---|
| CAS-port-as-first-job axiomatic | Resolved | D19' — peer tools; v0.5 scope independent of CAS |
| Codemod-library alternative | Resolved | D32 — two-layer architecture; understanding as primary, recipes as mechanical arm |
| D1 missing family/project unit-type | Resolved | D1 revised — family added as first-class fourth unit-type |
| D23 missing greenfield-clone verdict | Resolved | D23 revised + D35 — greenfield-clone added; /migration owns execution |

Nine new decisions (D30 v0.5 scope, D31 v0.5 acceptance, D32 two-layer
architecture, D33 conversational-explanatory tenet, D34 in-house-over-handoff
tenet, D35 greenfield-clone ownership, D36 recipe curation process,
D37 filesystem verification discipline, D38 scope definition process).

Two existing decisions revised (D1 family unit-type, D19 → D19' peer
relationship, D23 greenfield-clone verdict).

One correction flagged during crystallization: D31's original first-target
list (seed trio + /convergence-loop port) was based on research assumptions
that turned out to be wrong — those components already exist in JASON-OS.
Corrected via filesystem verification.

Ready for /deep-plan.
