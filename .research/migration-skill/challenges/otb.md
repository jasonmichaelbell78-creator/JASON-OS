# OUTSIDE-THE-BOX CHALLENGE — /migration skill research

**Persona:** otb-challenger (see `.claude/agents/otb-challenger.md`)
**Date:** 2026-04-21
**Scope:** Phase 3 OTB pass over RESEARCH_OUTPUT.md + 35 D-findings + 4 V-findings + 29 locked decisions.
**Mode:** Constructive expansion of the solution space — not critique of what was found.

---

## Summary

The structured 12-question research converged very quickly on a particular
shape: **heavy-lifting monolithic skill with internal phase arc, modeled
on `/deep-research`, built on top of codemod-style primitives**. That shape
is well-defended inside its own frame. But the research never actually
stepped outside the frame. Nine concrete outside-the-frame angles surface
after re-reading the inputs:

1. The **codemod-ecosystem precedent** was cited for transformation
   primitives (P6/P7) but never examined *as an architectural
   alternative* — a library-of-recipes + thin-runner shape that could
   replace most of `/migration`'s phase arc.
2. **CAS-port-as-first-job (D19) is treated as axiomatic** when it's
   actually the single most expensive decision in the entire plan
   (~143h). The research never seriously asked "what if JASON-OS skills
   don't need CAS at all, or need only 10% of it?"
3. **The silent-refactoring cost in SoNash itself** to make things
   port-friendly is never priced. /migration changes SoNash too — and
   probably forces at least 6-8 `_shared/` extractions to make the port
   work.
4. **The unit hierarchy (file/workflow/concept) missed a level above
   skill**: the *project* or *family*. sync-mechanism's 5 pieces, the
   11-skill ecosystem-audit family — these are natural migration units
   that don't fit any of the three declared unit types.
5. **D23's verdict legend has a hole**: it enumerates `copy-as-is /
   sanitize / reshape / rewrite / skip / blocked-on-prereq` but has no
   verdict for "port is the wrong answer — rebuild greenfield in
   JASON-OS idioms from concept only." That's a *seventh* verdict,
   `greenfield-clone`, and its absence forces every
   reshape/rewrite/blocked-on-prereq to pretend it's salvageable when
   sometimes it isn't.
6. **The LLM-native refactoring-tool precedent (Aider, Cursor multi-file
   edits, Devin, Copilot Workspaces, Anysphere's Cascade, Cognition's
   Devin, Sourcegraph Cody's Batch Changes) is entirely absent** from
   the source catalog. These tools solve overlapping problems and have
   architectural lessons (model-tool boundaries, partial-commit UX,
   repo-map context) that /migration should inherit from or explicitly
   reject.
7. **D28's "re-entry as norm" is stated but never propagated into
   structural requirements for the skills themselves.** If loops are
   normal, the skills need idempotency, convergence-on-fixed-points,
   and loop-stability properties — a "loop theory" layer the research
   didn't design.
8. **The "self-dogfood" framing is a specific case of a more general
   bootstrap problem** (rustc, GHC, go compiler, nix eval). The
   research cites rustc stage2 but doesn't mine the bootstrap
   literature for what ACTUALLY goes wrong in self-hosting — the
   second-system trap, the "compiler that miscompiles itself and now
   all diagnostics lie" failure mode, reproducibility requirements.
9. **Second-order effects on the 5-piece sync-mechanism project and the
   broader JASON-OS bootstrap critical path** are unmodeled. If
   `/migration` ships last (Tier 4) but is needed to port CAS which is
   needed by half the ecosystem, the critical path may be inverted and
   the research doesn't notice.

These nine angles suggest ~14-18 new claims worth adding, 3-4 new research
themes, and at least 9 adjacent-domain sources the source catalog should
have touched.

---

## OTB insights (numbered)

### OTB-1 — /migration may be the wrong primitive; a "recipe library + thin runner" is what the codemod ecosystem actually does

**Angle:** simpler / adjacent-domain / reframing
**Relevance:** HIGH
**Feasibility of alternative:** MEDIUM-HIGH

**What it questions:**
The research frames `/migration` as a heavy-lifting 7-phase skill with 11
transformation primitives, 9 signal detectors, gate budgets, state machines,
and a 5-8 new-agent roster. OpenRewrite, jscodeshift, and Rector — cited as
"primitive P6/P7 inspiration" — actually solve the overall problem
*differently*: a **library of declarative recipes + thin runner**. Recipes
are the atoms; composition is the skill. There is no plan/apply arc, no
verdict router, no state machine. Drift surfaces through `recipe not
applicable` returns, not through a "reshape verdict" phase.

The research treated these tools as sources of *transformation syntax* but
never as an *architectural alternative*. OpenRewrite ships ~2,000 recipes
for exactly the kinds of transformations /migration's rewrite verdict
handles (framework upgrades, idiom shifts, deprecations). Rector ships
~300 rules for PHP. The thing all three have is ecosystem — the user
base contributes recipes; the vendor ships new ones per release.

**Reframe:** what if `/migration` v1 is just *one recipe-library + one
runner*, and recipes *are* the unit? Every D23 verdict becomes "no recipe
matched" vs "recipe N matched." User-facing invocation drops to one verb:
"apply recipes." The monolithic 7-phase arc shrinks to roughly two
phases: discover (which recipes match) + apply (run them, gate per-unit).

**What's lost if we take this path:** the discovery/proactive-scan mode
(D2) needs to become "recipe-match scan" which is less expressive than
the full heuristic router; the reshape-vs-rewrite verdict distinction
collapses into "complex recipe vs simple recipe"; research-dispatch-
mid-execute (P11) becomes harder to express declaratively.

**Why this is constructive, not destructive:**
Even if v1 keeps the 7-phase arc, the *primitive unit* could still become
the recipe — a YAML-described declarative transformation that can be
invoked directly by the runner, composed by reshape/rewrite, and
contributed by users. `verdicts/*.yaml` in the current research already
hints at this; OTB-1 says make it the architectural center, not a
peripheral config.

**Relevance evidence:** D5-reshape-pipeline cites OpenRewrite/jscodeshift/
Rector 3 times as inspiration for individual primitives. Never once for
architecture. That gap is the opening.

**New claims suggested:**
- C-121 (MEDIUM): The three codemod-ecosystem tools (OpenRewrite,
  jscodeshift, Rector) constitute a *library+runner* architectural
  pattern that is a genuine alternative to `/migration`'s
  7-phase-heavy-skill shape, not merely a source for transformation
  primitives.
- C-122 (MEDIUM): `verdicts/*.yaml` (D7-other-multi-skill-families'
  proposal) is latent recipe-library architecture; promoting it from
  "optional config" to "architectural center" shrinks the skill surface
  area by ~40% without sacrificing D23's verdict expressiveness.
- C-123 (MEDIUM-LOW): The proactive-scan trigger mode (D2) maps more
  naturally to "recipe-match scan across repo" than to "heuristic
  discovery with 9 signal detectors" — the codemod-ecosystem precedent
  suggests the heuristic router is over-engineered for the primary
  scan-mode use case.

---

### OTB-2 — D19 "port CAS into JASON-OS" may be an unexamined premise; the real question is "does JASON-OS need content analysis at all?"

**Angle:** inverted / reframing
**Relevance:** HIGH
**Feasibility of alternative:** MEDIUM

**What it questions:**
D19 locks "Foreign-repo understanding = Locally-ported CAS." The research
accepts this and spends **~143 person-hours (~3-4 calendar weeks)** on
the CAS port. This is by far the largest single cost in the entire plan,
and it is built on a premise that is never stress-tested: that JASON-OS
skills need SQL-backed content analysis semantics.

**Look at CAS's actual SoNash functions:** analyze router, document-
analysis, media-analysis, recall, repo-analysis, synthesize. These
solve "make sense of arbitrary files the operator dumped in the repo."
**JASON-OS is not that kind of repo.** JASON-OS is a curated skill
library with ~14 skills, ~8 agents, ~54 hooks/lib files. It's a small,
known-shape artifact — not an ever-growing content pile.

The research's own Theme 3 notes "JASON-OS has 14 skills (11 built, 3
partial)." Theme 7 notes `D2-content-analysis-adjacent: all 6 live CAS
skills are pre-port-dependent for /migration execution beyond trivial
file-copy — concept unit-type blocked-on-prereq in v1-MVP until CAS
ported.` That framing begs the inversion: **what if concept unit-type
is the 10% case and v1 doesn't block on it?**

**Alternative framing:**
- JASON-OS v1 needs "foreign-repo understanding" only to the depth of
  "what skills/scripts/agents exist and how do they reference each
  other" — which is 90% grep/glob/frontmatter-parsing, not CAS.
- CAS's SQLite + Zod schemas + embedding/classifier infrastructure is
  **SoNash's domain** — SoNash has 400KB of content DBs already; JASON-OS
  may never have more than 1-5 MB of skill files.
- A ~20-line `repo-profile.mjs` script (walk `.claude/skills/`, parse
  frontmatter, emit JSON) replaces what the research says is a 143h CAS
  port, for the subset of operations `/migration` actually needs at v1.

**What's lost if we skip CAS:**
- Concept-level unit-type (D1) loses the semantic-similarity back-end
  that would let "concept X from SoNash" map to "closest-analog in
  JASON-OS."
- The `/recall` "have we seen this before?" shortcut (Theme 7) goes
  away for Phase 0/2.
- Self-dogfood example shifts — if CAS port isn't the first job, what
  is? (Answer: the seed trio + `/convergence-loop` port; both ~0.5 to
  3 days, not weeks.)

**What's gained:**
- ~140h back, shifts v1 acceptance by ~3-4 weeks.
- Removes the biggest execution blocker (Theme 3 #2).
- `/migration` v1 can ship with file + workflow unit types only; concept
  unit type deferred to v1.1 when actual demand surfaces.

**Risk:** The brainstorm already decided this in D19. Over-riding a
locked decision is out of scope for research. But this OTB note exists
to surface the cost nobody priced: D19 doubles `/migration` v1's
delivery timeline, and it may be wrong.

**New claims suggested:**
- C-124 (MEDIUM): D19 "port CAS into JASON-OS" is a load-bearing
  assumption, not a forced conclusion — JASON-OS's curated-skill-library
  shape does not obviously need SQL-backed content-analysis semantics
  the way SoNash's growing-content-repo shape does.
- C-125 (MEDIUM-HIGH): The concept unit-type is the only unit-type
  that strictly requires CAS; file + workflow unit-types (D1) can be
  served by a ~20-line `repo-profile.mjs` that walks `.claude/skills/`
  and parses frontmatter, deferring concept unit-type to v1.1.
- C-126 (MEDIUM): CAS port as "/migration`'s first real job" is a
  self-dogfood narrative, not a requirements-driven one; the seed trio
  + `/convergence-loop` port is a lighter self-dogfood target that
  still validates both directions (D16) and round-trip (C6).

---

### OTB-3 — /migration changes SoNash too; the research didn't price the silent refactoring cost in the source repo

**Angle:** second-order effect
**Relevance:** HIGH
**Feasibility:** HIGH (the cost exists regardless; the question is whether we budget for it)

**What it questions:**
Theme 6's CAS port table says "3 hardcoded `jasonmichaelbell78-creator/
sonash-v0` home-repo guard strings must rewrite together to a
`HOME_REPO_URL` config." That rewrite **happens in SoNash during the
port**, not in JASON-OS after the port. Similarly, "7 cites across 4
skills must adopt a new `HOME_CONTEXT_FILES[]` config contract" —
again, the adoption happens in SoNash's files as they're being ported.

Multiplied across the research's full port inventory, this is a **large
silent SoNash refactoring cost** the research never tallied:

- Theme 7 `D2-hooks-lib`: "safe-fs.js is byte-identical (24,810 bytes)
  across 3 audit families. The `_shared/` extraction stopped at
  protocol docs — code was not extracted. Known half-done refactor."
  → Porting any of the 3 audit families forces completing this
  extraction in SoNash first, or all three copies drift.
- Theme 7 `D2-content-analysis-adjacent`: "DDL duplicated across
  rebuild-index.js (L37-112) and update-index.js (L291-350)." → Porting
  `/repo-analysis` means fixing the DDL split in SoNash, not just
  JASON-OS.
- The "byte-identical CAS DB aliases" finding (Unexpected Findings
  §1) is a SoNash-side cleanup that /migration either drags in or
  leaves as a landmine.

**The pattern:** every reshape/rewrite verdict with a
"config-ify hardcoded thing X" shape forces a pre-port refactor in
SoNash to expose X as configurable. That's a cost the research treated
as invisible.

**Aviator blog post on LLM-driven code migration** (cited in research
[75]) explicitly flags this as the #1 real-world cost: "to migrate
code, first make the code migratable." That citation is in the source
list but its lesson is not in any claim.

**Second-order question:** Does /migration need a **"source-side
prep"** phase before Phase 0? A Phase `-1` where the user is guided
through `_shared/` extractions, config-ification of hardcoded paths,
and DDL-split repairs in SoNash *before* the port runs? Without it,
every port either silently mutates SoNash or delivers brittle JASON-OS
code.

**New claims suggested:**
- C-127 (MEDIUM-HIGH): The CAS port's 3 home-repo guard cites, 7
  HOME_CONTEXT_FILES cites, safe-fs.js triple-copy reconciliation, and
  DDL-split repair all represent **source-side (SoNash) refactoring
  work** that the research's 143h estimate does not include; realistic
  estimate is 143h JASON-OS + ~20-40h SoNash.
- C-128 (MEDIUM): `/migration`'s 7-phase arc is missing a **Phase -1
  "source-side prep"** gate, without which every non-trivial port
  either silently mutates the source repo or delivers brittle
  destination code.
- C-129 (MEDIUM): Aviator's "to migrate, first make migratable"
  principle ([75] in sources but un-mined) is a first-class /migration
  design constraint, not an aside — recommends a dedicated "pre-port
  refactor candidate" verdict or phase.

---

### OTB-4 — The unit hierarchy (file/workflow/concept) is missing a level above skill: *project* or *family*

**Angle:** simpler / reframing
**Relevance:** HIGH
**Feasibility of alternative:** HIGH

**What it questions:**
D1 locks "migration unit = multi-level: file / workflow / concept."
Throughout the research, the de-facto unit is *skill* — every inventory
is skill-by-skill, every verdict is assigned skill-by-skill, every port
estimate is skill-by-skill. CAS is 6 skills; the research treats those
as 6 port-units with per-skill verdicts.

But CAS is a **family**: 6 skills that only make sense together, sharing
a database schema, a 5-table DDL, 4 handler-level contracts, and one
router. Porting `/analyze` without `/repo-analysis` is nonsense. Porting
3 of 6 handlers delivers broken software.

Same shape: the 11-skill ecosystem-audit family (Theme 7), the 5-piece
sync-mechanism project (Brainstorm Dependencies §6), the audit-family-
a+b (13 skills across 2 D-agents). These are all **natural migration
units** above the skill level. The research doesn't acknowledge the
level.

**Why it matters:**
- **Verdict coherence:** a family where 3 skills are `reshape` and 3
  are `rewrite` has one *family-level* verdict ("port this family
  cohesively") that the current router can't express.
- **Dependency ordering:** Theme 6 says "strict bottom-up order (schemas
  → lib → scripts/cas/ → handler skills → router LAST)" — that's a
  family-scope ordering, not a skill-scope one. The skill-level unit
  forces the research to articulate family-scope concerns by
  enumerating skill-by-skill prerequisites, which is lossy.
- **Self-dogfood:** C6 round-trip (JASON-OS → SoNash → JASON-OS
  idempotent) is family-scoped: you don't round-trip one `/analyze`
  skill; you round-trip the whole CAS family. The research conflates
  "unit" with "skill" and the self-dogfood criteria wobble as a result.

**Alternative framing:**
Add *family* (or *project*) as a fourth unit-type:
- `file` → single file (obvious)
- `workflow` → single skill or script (currently de-facto mapped to
  "skill")
- `family` → cohesive multi-skill/multi-script unit with shared
  contracts (CAS, ecosystem-audit, sync-mechanism)
- `concept` → unimplemented idea with no direct source files (existing
  definition; least-used in practice)

With family as a first-class unit, the CAS port becomes **one** family-
level migration with an internal 6-skill dependency DAG, not 6 skill-
level migrations with ambient coordination. The MIGRATION_PLAN.md
schema gains a `family_id` field. The bottom-up order becomes
self-documenting within the family.

**Trade-off:**
Adds one more case to Phase 1 "target pick" menu, which the research
deliberately kept to 5 items. But the current 5 items (file / workflow
/ concept / proactive-scan / resume) mix unit-types with modes —
"proactive-scan" and "resume" are not unit-types, they're modes. So
there's already menu hygiene to fix, and adding `family` is less
disruptive than it looks.

**New claims suggested:**
- C-130 (HIGH): The D1 unit-type hierarchy (file/workflow/concept) is
  missing a **family/project** level that is the de-facto natural unit
  for CAS, ecosystem-audit, sync-mechanism, and every multi-skill
  cohesive port in the research inventory; treating family-ports as
  N skill-ports loses dependency coherence.
- C-131 (MEDIUM-HIGH): The Phase 1 target-pick menu conflates
  unit-types (file/workflow/concept) with modes (proactive-scan/
  resume) — cleaning that up and adding `family` as a fourth unit-type
  is strictly a clarification, not a feature bloat.
- C-132 (MEDIUM): Self-dogfood C6 (round-trip) is family-scoped in
  practice; CAS round-trip means all 6 skills, not any one skill —
  the research's C6 criterion needs a family-unit to be observable.

---

### OTB-5 — D23's verdict legend has a hole: "greenfield clone" is a missing seventh verdict

**Angle:** inverted
**Relevance:** HIGH
**Feasibility:** HIGH

**What it questions:**
D23 expanded verdicts from 5 to 6: `copy-as-is / sanitize / reshape /
rewrite / skip / blocked-on-prereq`. Every verdict assumes the
destination file is **derived from the source file**. The anti-goal
D14 says "Not mandatory — user can /sync a file without ever invoking
/migration."

But there's a third option the verdict set doesn't name: **"the port
is the wrong answer; rebuild this greenfield in JASON-OS idioms from
concept only, ignoring the source implementation entirely."**

This is not `skip` (which means "don't port this file at all") and it
is not `rewrite` (which still assumes line-by-line or structural
derivation from the source). It's a distinct verdict that says "the
concept is worth taking; the implementation is not." It belongs in the
set.

**When it applies:**
- `sanitize-error.cjs` vs SoNash's equivalent: JASON-OS already has a
  bespoke version. Don't port — adopt JASON-OS's pattern and treat the
  SoNash version as a historical datapoint for comparison only.
- Any skill where SoNash's implementation is heavily coupled to
  Firebase/Next.js infra that JASON-OS refuses to adopt (Theme 7
  `session-start.js` 47KB — "rewrite" is the current verdict; should
  be `greenfield-clone`).
- Concept unit-type migrations almost by definition (there's no source
  file to port; you're implementing the idea fresh in JASON-OS).

**Why the verdict matters structurally:**
- `rewrite` carries a gate budget of 4 including P11 research-dispatch-
  mid-execute. If it's actually a greenfield clone, most of those gates
  are theater — there's no source-derivation to research.
- `greenfield-clone` should route to `/skill-creator` or
  `/deep-plan` not to /migration's Phase 5 execute. That's a different
  call graph.
- The MIGRATION_PLAN.md schema's "preconditions" (Theme 5) differ:
  greenfield clone has no BASE SHA, no diff-port path, no "restore from
  source" rollback mode.

**D23 implicit assumption:** "every unit has a source in the source
repo." D14 breaks that for proactive-scan outputs. Concept unit-type
breaks it for ideation. D23 doesn't acknowledge the break.

**New claims suggested:**
- C-133 (MEDIUM-HIGH): D23's verdict legend is missing a
  `greenfield-clone` verdict for cases where the concept is worth
  taking but the implementation is not source-derivation-worthy;
  current research forces these into `rewrite` which muddies the
  gate budget and rollback semantics.
- C-134 (MEDIUM): `greenfield-clone` verdict routes to `/skill-creator`
  or `/deep-plan`, not to Phase 5 execute — this is a distinct call
  graph the research didn't design for.
- C-135 (MEDIUM): Concept unit-type (D1) is **always** a
  `greenfield-clone` verdict in practice (by definition — no source
  file), which further implies concept-unit-type v1-MVP support is
  free once the verdict exists (it's just "/skill-creator on the
  concept").

---

### OTB-6 — LLM-native refactoring tools (Aider, Cursor, Devin, Copilot Workspaces, Sourcegraph Batch Changes) are absent from the source catalog

**Angle:** adjacent-domain
**Relevance:** MEDIUM-HIGH
**Feasibility for lessons-adoption:** HIGH

**What it questions:**
The research cites exactly **one** LLM-driven refactoring precedent:
[75] Aviator blog post + [76] arxiv diff-port paper. That's the entire
LLM-native refactoring-tools source base across 76 citations. Meanwhile
the adjacent-domain landscape is rich:

- **Aider** — paired-editor, multi-file-coherent edits, commit-per-
  transaction UX, `/ask`+`/code`+`/architect` mode split (directly
  analogous to `/migration` verdict routing), repo-map context
  (analogous to D2 idiom detection).
- **Cursor multi-file edits + Composer** — long-horizon transformation
  with checkpoint-per-step UX and "accept all / reject all" batch
  controls (directly relevant to Theme 5 batch-confirm gates).
- **Devin** (Cognition Labs) — agentic long-horizon task execution,
  planner+executor split (the two-agent pattern the research's D1
  roster dances around but doesn't commit to).
- **Copilot Workspaces** (GitHub) — issue-to-PR flow with explicit
  plan surface before code changes (directly analogous to D3
  plan-then-execute + D26 plan-export).
- **Sourcegraph Batch Changes** — repo-spanning change application
  via declarative campaign spec (directly analogous to OTB-1's
  recipe-library-plus-runner reframe AND to D26 plan-export across
  many destinations).
- **Anthropic's own Claude Code plan mode** — exit_plan_mode tool,
  ApplyPatch tool — these are live precedent IN THE HARNESS
  /migration runs in, and the research never cites them as pattern
  sources.
- **Anysphere's Cascade / Continue.dev** — repo-context injection
  patterns for LLM editing workflows.
- **Jetbrains AI Assistant's "Refactor" action** — narrow, deterministic
  LLM-refactor per-scope precedent.

**What the research misses by not mining these:**

1. **Model-tool boundary design** — all six LLM-native tools have
   made deliberate choices about which edits the LLM does vs which
   edits are deterministic tool calls. The research's 11 primitives
   conflate these (regex-replace is deterministic; domain-rewrite is
   LLM-driven). A clean boundary reduces model-call cost and audit
   surface.
2. **Repo-map context injection** — Aider's repo-map is a known-good
   pattern for "give the LLM just enough codebase context to
   transform coherently." The research's "idiom detection 3-source
   hybrid" is a partial reinvention of this; repo-map precedent
   would tighten it.
3. **Partial-commit UX** — Aider's per-edit commit is the pattern
   the research ends up recommending ("per-verdict-unit atomicity +
   one-commit-per-unit + Migration-Unit trailer") — but the research
   re-derives it from git rebase/Alembic/Flyway/dbt/Terraform/Flink.
   Citing Aider directly would be stronger.
4. **Plan-surface-before-edits** — Copilot Workspaces' explicit plan
   surface before code change is directly D3 plan-then-execute.
   Citing Copilot Workspaces validates D3 as industry-standard, not
   bespoke.
5. **Batch-change declarative spec** — Sourcegraph Batch Changes'
   YAML campaign spec is directly the MIGRATION_PLAN.md plan-export
   pattern (D26) with real-world ergonomics to steal.

**Adjacent-domain tools to add to sources:**
- Aider (https://aider.chat/docs/) — architect mode, repo-map, edit formats
- Cursor Composer (https://docs.cursor.com/en/composer) — multi-file edits
- Devin (https://cognition.ai/blog/swe-bench-technical-report) — agentic planner/executor
- Copilot Workspaces (https://github.blog/2024-04-29-introducing-github-copilot-workspace/) — plan-surface pattern
- Sourcegraph Batch Changes (https://sourcegraph.com/docs/batch-changes) — declarative campaign spec
- Continue.dev (https://docs.continue.dev/) — repo-context injection
- Anysphere Cascade (https://www.cursor.com/cascade) — session-coherent edits
- Claude Code plan mode docs (https://docs.claude.com/en/docs/claude-code/plan-mode) — ExitPlanMode tool / ApplyPatch tool
- JetBrains AI Assistant refactor (https://www.jetbrains.com/help/idea/ai-assistant.html) — IDE-integrated LLM refactor

**New claims suggested:**
- C-136 (MEDIUM-HIGH): The model-tool boundary (which edits are
  LLM-driven vs deterministic tool calls) is a design axis the
  research's 11-primitive catalog conflates; LLM-native tools
  (Aider, Cursor, Devin) have explicit design choices here that
  `/migration` should adopt before inventing its own.
- C-137 (MEDIUM): Aider's repo-map is a direct precedent for the
  "idiom detection 3-source hybrid" (D5 §3); citing Aider tightens
  the rationale and gives an implementation template.
- C-138 (MEDIUM): Sourcegraph Batch Changes' YAML campaign-spec is
  a direct precedent for MIGRATION_PLAN.md plan-export (D26) — the
  research's 9-precedent catalog (Terraform/Alembic/Ansible/dbt/
  EF Core/Cookiecutter/Kustomize/Flyway) is DB/IaC-biased and
  misses the repo-spanning-code-change precedent that matches
  /migration's actual domain.
- C-139 (MEDIUM-LOW): Copilot Workspaces' "issue → plan → code" flow
  validates D3 plan-then-execute as an industry-standard LLM-refactor
  pattern, not a bespoke choice — this is a confidence-raising cite,
  not a design-changing one.

---

### OTB-7 — D28 "re-entry as norm" demands a loop-theory layer the research didn't design

**Angle:** unknown-unknown / reframing
**Relevance:** HIGH
**Feasibility:** MEDIUM (it's prescriptive work, not infrastructure work)

**What it questions:**
D28 says brainstorm/research/plan re-entry is the **norm**, not the
exception. The research responds with one structural change: a
lightweight `ITERATION_LEDGER.md` (Theme 10). That's a good answer for
*recording* loops. It doesn't answer the structural question D28
raises for the skills themselves.

**If loops are normal, the skills need:**

1. **Idempotency** — running the same skill twice on the same input
   must converge on the same output (or explicitly flag divergence).
   The research names this for self-dogfood C7 (zero-drift: second
   run on unchanged source = empty plan) but only for `/migration`,
   not for `/brainstorm` or `/deep-research` or `/deep-plan`. If D28
   is a loop, all four nodes need the property.
2. **Fixed-point detection** — the loop needs to stop. "Re-enter
   brainstorm on material reframe" without a termination criterion
   is a livelock hazard. Rustc stage2-matches-stage1 is the
   precedent the research cited for C6 self-dogfood; the same
   precedent applies to the loop itself: run the loop until iter N
   matches iter N+1, then stop.
3. **Convergence properties on touched decisions** — if iteration 3
   of brainstorm touches D19 and iteration 4 re-entry touches D19
   again, the ledger should be able to detect oscillation (D19
   flipped between two values three times). That's anti-
   convergence and a loop-exit signal: "you're in a cycle; escalate."
4. **Monotone-narrowing guarantees** — each re-entry should *reduce*
   the open-decision set (or produce an explicit "widened scope"
   marker). Without this, re-entry is a freedom to expand scope
   indefinitely, which is the inverse of the D28 intent.

**The research offers `ITERATION_LEDGER.md` as a recording tool.**
**What's missing is the loop-control protocol.** Candidate protocol:

- Every re-entry writes a ledger row with `touches`, `source-iter`,
  and a new `delta` field (added-decisions minus resolved-decisions).
- Running sum of `delta` is the open-decision backlog.
- If backlog increases for 3 consecutive re-entries → emit livelock
  warning, suggest pivot-to-execute with current best.
- If backlog is zero and latest re-entry touched no new decisions →
  convergence signal, ready for execute.
- If the same decision ID is touched in 3+ different re-entries with
  differing values → oscillation, escalate.

**Precedent:**
- **Fixed-point iteration in dataflow analysis** (Kildall's algorithm,
  abstract interpretation) — the canonical stop-when-stable pattern.
- **Belief propagation convergence** (ML/graphical models) —
  oscillation detection via damping.
- **Nix eval reproducibility** — the "same inputs produce same
  outputs" guarantee at the skill level.
- **Terraform apply → plan → zero-changes** — the research cites this
  for self-dogfood but doesn't generalize it to the loop itself.
- **Kubernetes controller reconciliation loops** — the declarative-
  target + observe-diff + act-to-reduce-diff pattern is literally
  D28 at infrastructure scale, and it has decades of operational
  learnings the research didn't touch.

**New claims suggested:**
- C-140 (MEDIUM): D28 "re-entry as norm" is stated as process
  expectation but not propagated into skill design constraints;
  skills participating in D28 loops (brainstorm/deep-research/
  deep-plan/migration) need idempotency, fixed-point detection, and
  convergence properties the research doesn't specify.
- C-141 (MEDIUM): `ITERATION_LEDGER.md` as currently designed
  (Theme 10) is a recording tool; the missing companion is a
  **loop-control protocol** with explicit backlog math, oscillation
  detection, and livelock signaling.
- C-142 (MEDIUM-LOW): Kubernetes controller reconciliation loops
  and Nix eval reproducibility are adjacent-domain precedents for
  D28 loop stability that the research did not mine; K8s in
  particular has ~10 years of operational learning on exactly this
  convergence problem.
- C-143 (LOW): Self-dogfood C7 zero-drift (deferred to v1.1)
  becomes a v1 must-have if C-140 lands — the property is required
  for loop stability, not just for self-hosting demonstration.

---

### OTB-8 — Self-dogfood is a specific case of the bootstrap problem; the research cites rustc stage2 but mines none of its failure modes

**Angle:** adjacent-domain / reframing
**Relevance:** MEDIUM-HIGH
**Feasibility:** HIGH

**What it questions:**
Theme 9 C6 cites "rustc stage2-matches-stage1 compiler-fixpoint test"
and V4 spot-checks it live. That's a good cite for the *success*
criterion. What the research doesn't mine is the bootstrap literature's
rich catalog of *failure modes* for self-hosting systems:

- **The second-system trap** (Brooks). Once the first-version compiler
  compiles itself, the team piles features into version 2 that
  version 1 can't handle, and the bootstrap breaks. /migration risk:
  v1 works; v1.1 adds features that /migration v1 can't port to
  SoNash; the round-trip stops working silently.
- **The "compiler that miscompiles itself" failure**. If /migration v1
  has a bug that produces subtly-wrong MIGRATION_PLAN.md, and v1 is
  used to port itself to SoNash, the SoNash copy inherits the bug and
  now **both copies are wrong in the same way**. The test can't catch
  it because both reference each other. Rustc solves this with
  **reproducible builds across independent toolchains** (crater, nix);
  /migration has no analog.
- **Diagnostic-quality decay** — when the compiler lies about its own
  bugs because the bugs affect diagnostics. /migration risk: Phase 6
  (Prove) runs on output produced by a broken Phase 5 (Execute), and
  the prove phase has the same bug → convergence-loop reports
  "success" on broken output.
- **Reproducibility-across-machines requirement** (nix, bazel). Same
  inputs must produce byte-identical outputs across machines. The
  research's atomicity is per-verdict-unit; there's no claim that
  running /migration on machine A vs machine B with the same inputs
  produces the same MIGRATION_PLAN.md. Should it?
- **Escape-hatch to independent validator** — rustc ships miri + a
  separate MIR interpreter as independent validators. /migration's
  Phase 6 prove is `/convergence-loop` — which is *part of the same
  skill ecosystem*. Bootstrap risk: the validator shares failure
  modes with the thing it validates.

**Constructive implication:**
v1 should ship **with a third-party validator** — e.g. a standalone
script that reads MIGRATION_PLAN.md and reports "plan references
files that don't exist at source SHA" or "plan's verdict=copy-as-is
units are actually byte-different." That validator must NOT share
implementation with Phase 5 or Phase 6 — its whole job is to be
different enough to catch shared-failure-mode bugs.

**New claims suggested:**
- C-144 (MEDIUM): Self-dogfood C6 round-trip (Theme 9) cites rustc
  stage2 but does not mine rustc's failure modes (second-system
  trap, miscompile-self, diagnostic decay, reproducibility) — each
  is a direct risk for /migration and deserves explicit mitigation.
- C-145 (MEDIUM): The research's Phase 6 Prove is implemented via
  `/convergence-loop`, which is part of the same skill ecosystem
  /migration is trying to validate; a bootstrap hazard recommends
  adding an **independent validator** script that does not share
  implementation with Phases 5 or 6.
- C-146 (LOW): Cross-machine reproducibility (same inputs → byte-
  identical MIGRATION_PLAN.md on two operators' machines) is
  unstated in the research but is a reasonable v1.1 correctness
  property to target.

---

### OTB-9 — Second-order: the port order (seed trio → convergence-loop → CAS → sync → /migration) may be inverted at the critical path

**Angle:** second-order effect
**Relevance:** MEDIUM-HIGH
**Feasibility:** N/A (this is a critical-path observation, not an alternative)

**What it questions:**
Recommendation 2 locks "Tier 0 seed trio → Tier 1 `/convergence-loop`
→ Tier 2 CAS port as self-dogfood → Tier 3 `/sync` Piece 5 → Tier 4
`/migration` itself." This is defended as bottom-up.

**But look at what uses what:**
- Tier 2 CAS port uses `/migration`. `/migration` is at Tier 4. So
  Tier 2 depends on Tier 4.
- Tier 3 `/sync` engine is needed by `/migration` Phase 0. So Tier 4
  depends on Tier 3.
- Tier 3 `/sync` also has Pieces 3.5 and 4 upstream (Theme 3 #1).

The "Tier 4 ships last" ordering is therefore **logically incoherent**
unless `/migration` has a pre-v1 scaffolding ("v0.5") that runs with
stubbed `/sync` and manual CAS-port. That scaffold is what performs
Tier 2 (CAS port). But the research never names it.

**The actual critical path appears to be:**

```
Tier 0  seed trio                            (~0.5 day)
Tier 1  /convergence-loop port               (~2-3 days)
Tier 2  /migration v0.5 scaffold             (?? — never estimated)
         (file+workflow unit-types only,
          no /sync dep, no CAS dep, no concept)
Tier 3  Use v0.5 to port CAS                 (~143h)
Tier 4  /sync Piece 5 (parallel track)       (~unknown)
Tier 5  /migration v1                        (~??)
```

The research didn't price **Tier 2 /migration v0.5**. That's the skill
that actually does Tier 3 CAS port. Without it, Tier 3 CAS port is
manual (just like PORT_ANALYSIS.md today) — defeating D19 premise.

**Implication:**
- `/migration v0.5` is not optional scaffolding; it's the linchpin of
  the whole plan.
- Its scope is file + workflow unit-types only (no CAS for
  concept-type; no `/sync` for Phase 0 state).
- Its delivery sits between Tier 1 and Tier 3 and is the single most
  important delivery the research identifies, but it's not named in
  the milestone ladder.
- The M0-M5 milestone table (Theme 9) should insert `M1.5:
  /migration v0.5 scaffold` between M1 and M2 — without it, M2 has
  no implementation vehicle.

**New claims suggested:**
- C-147 (HIGH): The M0-M5 milestone ladder (Theme 9) is missing an
  explicit **M1.5 `/migration v0.5` scaffold milestone** between
  `/convergence-loop` port (M1) and CAS port (M2) — M2 needs an
  implementation vehicle that M0+M1 alone do not provide.
- C-148 (MEDIUM): `/migration v0.5` scope is file + workflow
  unit-types only, no `/sync` Phase 0 dependency, no CAS concept-
  unit dependency; this is consistent with OTB-2 (CAS may not be
  needed) and OTB-5 (greenfield-clone verdict covers what concept-
  unit pretends to).
- C-149 (MEDIUM): The research's "bottom-up port order" framing
  obscures a genuine critical-path circularity (Tier 2 CAS port
  needs Tier 4 `/migration`) that a v0.5-scaffold concept resolves.

---

## New themes not in research

### NT-1 — Recipe-library architecture (OTB-1)

The codemod ecosystem's library+runner shape is an architectural
alternative, not just a source for primitives. Should be a Theme
of its own in a re-entry research pass.

### NT-2 — Source-side refactoring cost (OTB-3)

Every non-trivial port forces a pre-port refactor in the source
repo. This cost is systematically absent from the research's port
estimates. A Theme should enumerate the source-side refactor
inventory (extractions, config-ifications, DDL-split repairs)
and put a dollar-cost on it.

### NT-3 — Unit-hierarchy above skill: family/project (OTB-4)

The family unit-type is the de-facto natural unit for CAS,
ecosystem-audit, and sync-mechanism. Missing from D1.

### NT-4 — Loop-theory / convergence properties (OTB-7)

D28 re-entry-as-norm demands structural loop-control protocol on
the skills, not just a recording ledger. K8s controller loops and
Nix reproducibility are the adjacent-domain precedents.

### NT-5 — LLM-native refactoring adjacent domain (OTB-6)

Aider, Cursor, Devin, Copilot Workspaces, Sourcegraph Batch
Changes, Anthropic Claude Code plan mode, Continue.dev,
JetBrains AI refactor. ~0 citations in source catalog. Needs a
whole search pass.

### NT-6 — Bootstrap-problem failure modes (OTB-8)

Rustc stage2 cited for success criterion; rustc/GHC/go-compiler
failure-mode literature (second-system trap, miscompile-self,
diagnostic decay, reproducibility) not mined at all.

---

## New sources or references

Adjacent-domain tools and precedents that should be in sources.jsonl
for follow-up research depth:

| # | Title | URL | Why |
|---|---|---|---|
| NS-1 | Aider docs | https://aider.chat/docs/ | Repo-map / architect mode / commit-per-edit UX — directly relevant to D5 idiom detection + Theme 4 atomicity. |
| NS-2 | Cursor Composer docs | https://docs.cursor.com/en/composer | Multi-file-coherent edits + checkpoint UX — relevant to Theme 5 batch-confirm + per-unit atomicity. |
| NS-3 | Cognition Devin technical report | https://cognition.ai/blog/swe-bench-technical-report | Agentic long-horizon planner+executor split — direct precedent for D1 agent roster. |
| NS-4 | GitHub Copilot Workspaces | https://github.blog/2024-04-29-introducing-github-copilot-workspace/ | Issue-to-plan-to-code flow — precedent for D3 plan-then-execute + D26 plan-export. |
| NS-5 | Sourcegraph Batch Changes | https://sourcegraph.com/docs/batch-changes | Declarative YAML campaign spec — precedent for MIGRATION_PLAN.md (better than the current DB/IaC-biased catalog). |
| NS-6 | Claude Code plan mode + ApplyPatch tool | https://docs.claude.com/en/docs/claude-code/plan-mode | Live in-harness precedent the research did not cite once. |
| NS-7 | Sourcegraph Cody | https://sourcegraph.com/cody | Repo-context injection for LLM edits — alternative idiom-detection lens. |
| NS-8 | Continue.dev docs | https://docs.continue.dev/ | Repo-context injection patterns. |
| NS-9 | JetBrains AI Assistant "Refactor" | https://www.jetbrains.com/help/idea/ai-assistant.html | IDE-integrated narrow LLM-refactor precedent. |
| NS-10 | Kubernetes controller reconciliation loop | https://kubernetes.io/docs/concepts/architecture/controller/ | Direct adjacent-domain precedent for D28 loop stability; ~10 years of operational learning. |
| NS-11 | Nix reproducibility guarantees | https://nix.dev/manual/nix/2.18/introduction | Cross-machine reproducibility precedent for OTB-8 C-146. |
| NS-12 | Kildall fixed-point iteration (abstract interpretation) | https://en.wikipedia.org/wiki/Data-flow_analysis#An_iterative_algorithm | Canonical convergence-detection algorithm for OTB-7 C-141. |
| NS-13 | Ghostty / GHC bootstrapping notes | https://downloads.haskell.org/ghc/latest/docs/users_guide/bootstrapping.html | Bootstrap failure-modes for OTB-8 C-144. |
| NS-14 | go compiler self-hosting ("bootstrapping Go") | https://go.dev/doc/install/source#bootstrap | Simpler bootstrap than rustc; useful counterpoint. |
| NS-15 | Aviator "LLM agents for code migration" (already in [75]) | https://www.aviator.co/blog/llm-agents-for-code-migration-a-real-world-case-study/ | Cited but the "to migrate, first make migratable" lesson is not in any claim — OTB-3 mines it. |
| NS-16 | OpenRewrite recipe architecture overview | https://docs.openrewrite.org/concepts-and-explanations/recipes | Library+runner architecture (OTB-1) — re-read, not just P4/P6 syntax. |
| NS-17 | Anthropic prompt engineering guide on refactoring | https://docs.claude.com/en/docs/build-with-claude/prompt-engineering | Model-tool boundary design guidance. |
| NS-18 | Brooks "Mythical Man-Month" second-system trap | N/A (print) | OTB-8 C-144 second-system-trap framing. |

---

## Claims to add

Summary of the new claims across all 9 OTB insights, with proposed
confidence and phase ownership:

| Claim | OTB | Short form | Confidence |
|-------|-----|-----|-----|
| C-121 | 1 | Codemod ecosystem = library+runner architectural pattern, not just primitive inspiration | MEDIUM |
| C-122 | 1 | `verdicts/*.yaml` promoted to architectural center shrinks skill surface ~40% | MEDIUM |
| C-123 | 1 | Proactive-scan maps to recipe-match more naturally than to 9-signal heuristic | MEDIUM-LOW |
| C-124 | 2 | D19 CAS-port-as-first-job is axiomatic, not derived — may be wrong | MEDIUM |
| C-125 | 2 | file+workflow unit-types don't need CAS; 20-LOC repo-profile.mjs suffices | MEDIUM-HIGH |
| C-126 | 2 | CAS port as self-dogfood is narrative-driven, not requirements-driven | MEDIUM |
| C-127 | 3 | 143h CAS port estimate excludes ~20-40h SoNash-side pre-port refactor | MEDIUM-HIGH |
| C-128 | 3 | 7-phase arc needs a Phase -1 "source-side prep" gate | MEDIUM |
| C-129 | 3 | Aviator's "to migrate, first make migratable" is a first-class design constraint | MEDIUM |
| C-130 | 4 | D1 unit-types missing family/project level | HIGH |
| C-131 | 4 | Phase 1 target-pick menu conflates unit-types with modes | MEDIUM-HIGH |
| C-132 | 4 | C6 round-trip is family-scoped in practice | MEDIUM |
| C-133 | 5 | D23 missing `greenfield-clone` verdict | MEDIUM-HIGH |
| C-134 | 5 | greenfield-clone routes to /skill-creator not Phase 5 Execute | MEDIUM |
| C-135 | 5 | Concept unit-type is always greenfield-clone verdict by definition | MEDIUM |
| C-136 | 6 | Model-tool boundary is a design axis /migration primitives conflate | MEDIUM-HIGH |
| C-137 | 6 | Aider's repo-map is direct precedent for idiom-detection 3-source hybrid | MEDIUM |
| C-138 | 6 | Sourcegraph Batch Changes YAML is direct precedent for MIGRATION_PLAN.md | MEDIUM |
| C-139 | 6 | Copilot Workspaces validates D3 plan-then-execute as industry-standard | MEDIUM-LOW |
| C-140 | 7 | D28 re-entry-as-norm requires skill-level loop-control protocol not just ledger | MEDIUM |
| C-141 | 7 | ITERATION_LEDGER.md missing companion loop-control protocol (backlog math, oscillation detection) | MEDIUM |
| C-142 | 7 | K8s controller loops + Nix reproducibility are un-mined loop-stability precedents | MEDIUM-LOW |
| C-143 | 7 | C7 zero-drift may be v1 must-have (not v1.1 deferred) for loop stability | LOW |
| C-144 | 8 | Rustc stage2 cited for success, but bootstrap failure modes un-mined | MEDIUM |
| C-145 | 8 | Phase 6 Prove shares implementation with skills it validates — bootstrap hazard | MEDIUM |
| C-146 | 8 | Cross-machine reproducibility (byte-identical MIGRATION_PLAN.md) is a v1.1 target | LOW |
| C-147 | 9 | M0-M5 ladder missing M1.5 `/migration v0.5` scaffold milestone | HIGH |
| C-148 | 9 | v0.5 scope = file+workflow only, no /sync, no CAS-concept | MEDIUM |
| C-149 | 9 | "Bottom-up port order" obscures Tier 2↔Tier 4 critical-path circularity | MEDIUM |

**Total new claims proposed: 29** (matches nicely with the existing 29
locked decisions — coincidence, but a fitting one).

**Highest-leverage claims (should trigger a BRAINSTORM re-entry per
D28):**
1. **C-130** (family unit-type) — structural gap in D1, easy fix
2. **C-133** (greenfield-clone verdict) — structural gap in D23, easy fix
3. **C-147** (M1.5 v0.5 scaffold milestone) — fixes critical-path
   incoherence; must land before any execute-phase commitment
4. **C-127** (source-side refactoring cost) — unblocks realistic
   143h → ~180h estimate; affects calendar planning
5. **C-140** (loop-control protocol) — makes D28 operational rather
   than aspirational

---

## Close

Nine OTB angles surveyed. Research was strong within its frame; the
frame itself had blind spots in 6 directions (adjacent-domain,
inverted, simpler, second-order, unknown-unknown, reframing). None
of the OTB insights refute the research's core recommendations —
they expand the space around the recommendations, surface cost
items the research priced at zero, and identify structural gaps
(family unit-type, greenfield-clone verdict, v0.5 scaffold) that a
BRAINSTORM re-entry per D28 would resolve in an hour or two.

Recommendation: treat OTB-4, OTB-5, OTB-9 as **must-resolve before
PLAN** (structural gaps that break the plan); treat OTB-1, OTB-2,
OTB-7 as **worth a BRAINSTORM re-entry** (premise-shifters); treat
OTB-3, OTB-6, OTB-8 as **cost-adjustment and citation-depth work**
during plan assembly.

— otb-challenger

**Findings file:** `C:\Users\jbell\.local\bin\JASON-OS\.research\migration-skill\challenges\otb.md`
