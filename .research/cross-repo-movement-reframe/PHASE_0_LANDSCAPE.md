# Phase 0 Landscape — cross-repo-movement-reframe brainstorm

**Date:** 2026-04-23 (Session 17)
**Status:** Phase 0 complete; Phase 1 (Diverge) is the next step
**Author:** Claude (synthesized from 11+ prior research/planning artifacts read in full this session)
**Purpose:** Pickup-cold landscape for the next session. Read this in full before entering Phase 1.

---

## How this brainstorm started

Mid-session pivot during Phase G.2 execution of the structural-fix plan. The G.1 back-fill produced 461 records with 100% needs_review entries and 2,452 fields needing arbitration. User judgment: "the whole sync process has become this behemoth of problems." Initial reframe was "unify the adjacent brainstorms and plans." Then the user crystallized it further.

## The user's actual reframe (what we're brainstorming toward)

**ONE TOOL.** A single skill — large is fine, can have outside components like helper skills or scripts — that runs from a single interactive dashboard. Conversational and mechanical interweaved. Avoid `--flags` when possible.

**Movement-by-unit-type, not sync-vs-migrate.** Different things being moved have different patterns. A single skill file moves differently than a family of related skills. A canonical-memory file moves differently than a user-home memory. An npm-package GSD agent moves differently than a hand-coded JASON-OS agent. The tool's surface should reflect that the unit type drives the movement, not that two separate operations exist (sync + migrate).

**Open to scrapping anything.** The sync mechanism may not be necessary at all. Previous decisions are open to being overturned. Final plan supersedes ALL prior plans (sync-mechanism, schema-design, labeling-mechanism, structural-fix, migration-skill).

**Final output.** A single `/deep-plan` deliverable that can be executed end-to-end. Not five sequential pieces, not parallel skills, not a multi-month roadmap.

## What the cumulative research already supports

Despite never being framed this way, the prior research consistently surfaces patterns that point in this direction. The user's reframe is not against the grain — it's the conclusion the research kept circling without naming.

**The original R-frpg conclusion was deliberately tiny.** The file-registry-portability-graph research (the seed of all this work) finished with binding recommendation Option D: minimum-viable JSONL plus PostToolUse hook plus scope-tags. Defer the graph engine until proven need. The first action was thirty minutes of frontmatter tagging. Cross-model verification with Gemini reached the same conclusion independently. Everything since has expanded beyond that recommendation, and the expansion is what got us to today's pain.

**The migration brainstorm v2 already split mechanical from understanding.** Two-layer architecture: an understanding layer (model-powered, derived per-port in context) plus a mechanical layer (declarative recipe library). The understanding layer absorbs research and challenge patterns from `/deep-research` rather than handing off. This is the same conversational-plus-mechanical interweave the user is describing, just applied to migration only — generalizing it to all cross-repo movement is the next step.

**Migration v2 added "family" as a unit-type.** The original D1 had file/workflow/concept. Research showed most real ports are groupings of related things. Family was added as the fourth unit-type. The user's "different terms based on what we're syncing" extends this principle: every unit type may need its own movement pattern.

**Migration v2 added "greenfield-clone" as a verdict.** The original verdict legend (copy-as-is, sanitize, reshape, rewrite, skip, blocked-on-prereq) assumed every port derives from a source file. Greenfield-clone fills the gap where the concept is worth taking but the implementation isn't. The user's "complete restructure" framing suggests there may be more verdict-types worth surfacing.

**OTB-1 from migration research explicitly proposed library + thin runner.** The codemod ecosystem (OpenRewrite, jscodeshift, Rector) was cited only as inspiration for individual transformation primitives — but OTB-1 named it as an architectural alternative. A library of declarative recipes plus a thin runner. One verb: "apply recipes." The 7-phase arc collapses to roughly two phases. This is essentially the user's ONE TOOL framing applied to migration specifically.

**OTB-2 questioned the CAS port premise.** The migration brainstorm assumed CAS would be `/migration`'s first big job — about 143 person-hours of work. OTB-2 pointed out this is axiomatic, not derived. JASON-OS's curated-skill-library shape may not need SQL-backed content analysis the way SoNash's growing-content-pile shape does. A 20-line `repo-profile.mjs` script may suffice for what migration actually needs.

**OTB-9 named the missing v0.5 scaffold.** The "bottom-up port order" framing in migration research has a critical-path circularity (CAS port needs `/migration`; `/migration` needs CAS ported). OTB-9 said the resolution is an explicit `/migration v0.5` scaffold milestone — file and workflow unit-types only, no `/sync` dependency, no CAS dependency. The user's "ONE TOOL that ships" framing aligns directly.

**Migration anti-goal "NOT a second /sync" needs to be revisited.** The migration brainstorm v2 explicitly locks this anti-goal. Under the new frame — ONE TOOL covering both ongoing sync and one-time porting — that decision gets reopened. The honest move is "not a second /sync because there's NO separate /sync — it's all one tool."

## What the cumulative research warns about

These warnings should constrain whatever direction we pick.

**Schema field count is the actual root cause of today's pain.** Piece 1b contrarian flagged this in writing eleven days ago: *"21-field MVP is a migration schema, not a sync schema. Fields like context_skills[], dropped_in_port[], stripped_in_port[] are migration tracking — perpetually null in steady state. Piece 2 risks rebuilding in 6 months."* Piece 2 partially addressed this with a migration-metadata sub-object but the rest of the schema kept growing. Today's 30+ universal fields plus 41 per-type extensions is the direct cause of the 2,452 needs_review entries we're stuck on.

**The agents punted on free-text fields.** 100% of records have null `purpose` and null `notes` because the agent prompts allowed `null` plus low confidence as a valid output. Cross-check Case F (both agree on null) was patched to legitimize this mid-G.1. The whole "agent fleet derives 30+ fields per file" approach is fundamentally fragile when the fields require deep file reading the agents don't reliably do.

**Loop-control is structurally missing.** Migration Theme 12 (gap-pursuit round 1) added a loop-control protocol: idempotency contract (I1-I5), 5-layer termination guard stack, Kildall monotone-lattice convergence proof. Any conversational interactive tool with iterative re-entry needs these properties. Without them, the loop can ascend forever.

**Bootstrap circularity is a real failure mode.** Migration contrarian Challenge 3 (CRITICAL): self-dogfood that requires the thing to work first creates a chicken-and-egg. The resolution is an explicit v0.5 scaffold that does file + workflow movement without the harder unit-types. Same lesson applies to whatever ONE TOOL we design.

**The scope-tag enum (5 values) is well-validated.** Universal/user/project/machine/ephemeral converged from five independent systems (chezmoi, VSCode, Nx, XDG, Agent Skills). R-frpg, Piece 1a, Piece 1b, Piece 2 all use it. Whatever we build, this enum should survive.

**Foundation security infrastructure is non-negotiable.** safe-fs.js, sanitize-error.cjs, security-helpers.js, symlink-guard.js — the seed trio plus symlink-guard form the security envelope. CLAUDE.md §2 mandates them at every file I/O boundary. Survives any reframe.

## What gets revisited or scrapped (preliminary; final list emerges in Phase 2)

**Likely scrapped or radically simplified:**

- The 30+ field universal schema (Piece 2 §3). Too much catalog metadata; most fields aren't sync-essential.
- The 41 per-type extension fields (Piece 2 §10). Some survive; most belong in migration-time understanding, not catalog.
- The agent fleet back-fill design (Piece 3 D7). Failed in execution; produced unusable output.
- The 5-piece sync-mechanism architecture as a phase sequence. Collapses into one tool.
- The migration anti-goal "NOT a second /sync". Explicitly revisited.
- The 7-phase migration arc as separate phases. May become internal phases of the dashboard, not user-facing structure.
- The /sync vs /migration boundary itself. Dissolved.

**Likely survives in some form:**

- The 5-value scope-tag enum (universal/user/project/machine/ephemeral).
- The sanitize/lineage/portability concepts (just simpler schema).
- The two-layer architecture pattern (understanding + mechanical).
- The greenfield-clone verdict (and possibly more verdict types).
- The unit-type hierarchy (file/family/workflow/concept), maybe extended.
- The loop-control protocol (idempotency, termination guards, monotone ledger).
- The Foundation security infrastructure (seed trio + symlink-guard).
- The R-frpg Option D shape as the substrate (JSONL + PostToolUse hook + scope tags).
- Most of the discovery work (Piece 1a/1b inventories are still valid landscape data, just not catalog-bound).

**Survives unchanged:**

- The architecture-fix from this session (commit 1b2afb4): applyArbitration, apply-arbitration.js, aggregate-findings.js, synthesize-findings.js, plain-language-reminder hook. All generic enough to work for any record shape.
- All tenets and memories (in-house-over-handoff, conversational-explanatory, scope-definition, resolve-before-gate).
- The convergence-loop, deep-plan, deep-research, brainstorm, skill-creator, skill-audit skills.
- Foundation libs, security pipeline, scan.js, derive.js, validate-catalog.js.

## Three candidate directions to seed Phase 1 (Diverge)

These are starting points for divergent exploration, not options to converge on. Phase 1 should generate three or more genuinely-different framings before evaluation.

### Direction A — One tool over R-frpg Option D substrate

The simplest possible shape. Adopt R-frpg's binding conclusion: minimum-viable JSONL registry plus PostToolUse hook plus scope-tags. Build ONE conversational tool on top whose dashboard is unit-type-driven (move-a-file, move-a-skill-family, move-a-memory, etc.). Each unit-type gets its own internal movement pattern. The catalog stays tiny (5-8 fields tops). Rich understanding is derived in-context per movement, never stored as catalog metadata.

**Strengths:** Tiny scaffold, fast to ship, validated by cross-model verification, scope-tag schema already proven in five independent systems.
**Weaknesses:** Punts the cross-repo deduplication problem entirely (no graph engine); doesn't capture relationships between files; some of the rich metadata genuinely useful for the migration use case gets lost.

### Direction B — Two-layer tool with recipe library + understanding layer

Apply migration v2's two-layer pattern to all cross-repo movement. Mechanical layer is a declarative recipe library (each unit-type has recipes for moving it; OpenRewrite-style). Understanding layer is model-powered comprehension invoked per-movement. The dashboard is the user-facing surface; recipes and understanding are internal. ONE TOOL with two cleanly-separated internals.

**Strengths:** Already partially designed in migration v2; recipes accumulate value over time; understanding handles the cases recipes can't; conversational dashboard is a natural fit for the user-facing layer.
**Weaknesses:** Recipe library has to be built from scratch; OpenRewrite ships 2000 recipes — JASON-OS would start with zero; understanding layer needs careful prompt design to avoid the punt-to-null pattern that broke G.1.

### Direction C — Move as a verb, unit-type as the sentence subject

Reframe even more aggressively. The tool isn't named after `/sync` or `/migration` or `/move` — it's a conversational dashboard where you point at a thing and the tool figures out everything else. "Move this skill to SoNash." "Make sure this memory is in both repos." "Pull SoNash's audit family into here." The tool's job is to recognize what you pointed at, classify it, route it through the right movement pattern, and confirm conversationally before each gate. No flags. Possibly no even-explicit unit-type selection at the surface — the tool figures it out.

**Strengths:** Cleanest UX; matches conversational-explanatory tenet at the surface level; movement patterns are internal implementation, never user-facing structure; ONE TOOL framing taken to its conclusion.
**Weaknesses:** Internal complexity is high (every input has to be classified before routing); harder to test exhaustively; the dashboard is doing a lot of work that needs to be reliable; if classification is wrong, the wrong movement pattern fires.

### Other directions worth surfacing in Phase 1

- A direction that keeps the R-frpg Option D substrate but layers a separate `/repo-profile.mjs` script (per OTB-2) for the lightweight discovery JASON-OS actually needs — punt on CAS entirely.
- A direction that goes maximally minimal: just adopt R-frpg Option D exactly as specified, ship that, and revisit when something demands more. Defer ALL the cross-repo movement work to that future revisit.
- A direction that splits the tool's user-facing surface from its execution: dashboard for planning + confirmation, separate sub-skills/scripts for execution (helper components per the user's framing).

## Anti-goals to surface in Phase 1

These should be explicitly captured early so the design space is constrained correctly.

- NOT another five-piece architecture with sequential pieces.
- NOT a `--flag`-driven CLI surface.
- NOT a multi-month roadmap; one focused execution plan from one `/deep-plan`.
- NOT designing the schema from evidence first (that's what produced today's pain — schema-from-evidence yielded 73 candidate fields).
- NOT requiring all moveable units to be back-filled with catalog metadata before the tool works.
- NOT separating /sync and /migration as distinct user-facing surfaces.
- NOT requiring CAS to be ported first for the tool to work.
- NOT silent failures (per existing tenet).
- NOT manual steps for ongoing maintenance (per Piece 3 hard constraint).

## Open questions for Phase 1 to surface

These don't need answers in Phase 1 — they need to be raised so the directions account for them.

- Does the tool live in BOTH repos (mirrored, per sync-mechanism brainstorm §3.3) or in just one with cross-repo write access?
- What's the trigger model? Hook-based for ongoing sync, conversational for one-off moves, or both?
- How does the tool know what's already been moved? A movement ledger? Lineage frontmatter? Cross-project hash matching?
- What's the minimal schema for the catalog (if there even is a catalog)? 5 fields? 8? Just frontmatter scope tags and nothing else?
- How does the tool handle composites (multi-file groupings)? As a unit-type? As a flag on individual files? Different question entirely?
- How does it handle the home/work locale dance (the user has both repos cloned on multiple machines)?
- What survives from the architecture-fix work this session? The applyArbitration pattern is generic; could it apply to this tool's "user reviews proposed moves before commit" flow?

## What's queued and waiting (don't lose track of these)

- **Phase G.2 of the structural-fix is paused** at G.2.2 (user arbitration). The architecture-fix commit 1b2afb4 is on the branch. If the brainstorm-driven plan supersedes the structural-fix work, Phase G.2 may never resume. If not, it picks up where it stopped.
- **The JASON-OS preview catalogs** at `.claude/sync/label/preview/{shared,local}.jsonl` exist but are gitignored. They represent the G.1 + G.1.5 agent run output. Likely discarded under any meaningful reframe.
- **The aggregated G.1 findings** at `.claude/state/g1-findings.json` (3.3 MB) and the synthesized arbitration package at `.claude/state/g1-arbitration-proposal.json` are ready if the structural-fix work resumes. Likely discarded.
- **Thread B sync-mechanism scoping** (FIRST_PASS_ASSESSMENT.md from yesterday) is awaiting menu picks. Becomes moot if the unified tool replaces /sync entirely.

## Phase 1 entry conditions

Confirmed when the user replies to the gate at the end of Phase 0 (next session). Phase 1 starts with:

1. Re-confirm the reframe stands (user has had context-clear, may want to adjust).
2. Generate three or more genuinely-different directions, including the seeds above and any new ones the conversation surfaces.
3. Anti-goals captured per the "Anti-goals to surface" section.
4. Open questions captured per the "Open questions" section.
5. Phase gate at end of Phase 1: user confirms ready to evaluate (no premature convergence).

## Pointers (read these as needed during Phase 1)

- This file: `.research/cross-repo-movement-reframe/PHASE_0_LANDSCAPE.md`
- State file: `.claude/state/brainstorm.cross-repo-movement-reframe.state.json`
- Migration brainstorm v2 (the most recent prior thinking): `.research/migration-skill/BRAINSTORM_v2.md`
- Migration OTB challenges (rich source of premise-shifters that align with new frame): `.research/migration-skill/challenges/otb.md`
- R-frpg binding conclusion (the original minimum-viable proposal): `.research/file-registry-portability-graph/RESEARCH_OUTPUT.md` Section 10
- Sync-mechanism BRAINSTORM (the 5-piece architecture being superseded): `.research/sync-mechanism/BRAINSTORM.md`
- Piece 2 schema decisions (what's being radically simplified): `.planning/piece-2-schema-design/DECISIONS.md`
- Piece 3 labeling decisions (what's being scrapped or absorbed): `.planning/piece-3-labeling-mechanism/DECISIONS.md`
- Structural-fix DECISIONS Cat 14 (the architecture-fix from this session that survives): `.planning/piece-3-labeling-mechanism/structural-fix/DECISIONS.md`
- Live tenets: `~/.claude/projects/.../memory/tenet_*.md` — in-house-over-handoff, conversational-explanatory, scope-definition, resolve-before-gate

## Closing note

The user's reframe is not a departure from the prior research. It's the conclusion the prior research kept arriving at without ever naming directly. R-frpg said "ship the small thing first." Migration v2 said "two layers, recipes plus understanding." Migration OTB said "library plus runner is the architectural alternative; CAS may be unnecessary; v0.5 scaffold is the missing milestone." The user's framing pulls these threads together: ONE TOOL, conversational dashboard, unit-type-driven, scrap what doesn't fit.

Phase 1 should treat the prior research as a friend, not a constraint. The honest decisions are mostly already documented somewhere — they just haven't been combined into a single coherent design.
