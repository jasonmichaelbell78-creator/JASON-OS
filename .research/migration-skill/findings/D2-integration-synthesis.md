# FINDINGS — D2-integration-synthesis

**Agent:** D2-integration-synthesis (Phase 1 D-agent)
**Date:** 2026-04-21
**Method:** Top-down cross-family synthesis of the /migration 7-phase arc
(BRAINSTORM.md §2) against the SoNash skill/hook/script ecosystem. Per-family
scans owned by sibling D2-* agents; this agent identifies the highest-value
callees per phase and builds the shared-dependency ripple graph.
**Depth:** L1 — every concrete claim carries a file:line.

---

## Summary

/migration is a **consumer** skill (BRAINSTORM D9: "consumer + side-by-side
to /sync") and consequently its integration surface is **wide but shallow**:
it leans on existing planning/research/verification infrastructure rather
than re-implementing it, and its heaviest lifting (discovery, idiom
detection, transformation) sits on top of the same stack /deep-plan and
/skill-creator already ride.

Across phases 0–6, **~24 unique SoNash surface artifacts** recur
(18 skills, 3 hooks, 3 shared scripts). Nine of those recur in **3+ phases**
— those are the load-bearing dependencies whose JASON-OS ports must land
before /migration is executable, and whose own upstream deps dominate the
port order.

**Three recurring structural patterns emerge:**

1. **The planning trio** — `brainstorm` → `deep-research` → `deep-plan` —
   already cite each other as routing neighbors
   (`<SONASH_ROOT>\.claude\skills\brainstorm\SKILL.md:278-281`;
   `<SONASH_ROOT>\.claude\skills\deep-plan\SKILL.md:370-378`;
   `<SONASH_ROOT>\.claude\skills\deep-research\SKILL.md:355-398`).
   /migration's phases 2–4 ride entirely on this trio.
2. **The verification spine** — `convergence-loop` — is cited by
   deep-research, deep-plan, brainstorm, and skill-creator as their
   "programmatic verify" step
   (`<SONASH_ROOT>\.claude\skills\convergence-loop\SKILL.md:240-259`;
   `<SONASH_ROOT>\.claude\skills\deep-plan\SKILL.md:151-154`,
   `277`;
   `<SONASH_ROOT>\.claude\skills\brainstorm\SKILL.md:271-272`).
   /migration's Phase 6 ("Prove") is defined as an *embedded* convergence
   loop (BRAINSTORM.md line 32) — direct reuse, not a parallel build.
3. **The safety lib triad** — `sanitize-error`, `safe-fs`, `security-helpers`
   — already lives under every hook that touches file I/O or errors
   (30 files, 83 occurrences:
   `<SONASH_ROOT>\.claude\hooks\compact-restore.js:1`,
   `deploy-safeguard.js:3`, `governance-logger.js:2`,
   `large-file-gate.js:3`, `loop-detector.js:2`,
   `post-read-handler.js:1`, `post-todos-render.js:7`,
   `pre-commit-agent-compliance.js:1`, `post-write-validator.js:1`,
   `settings-guardian.js:1`, `session-start.js:2`, `test-tracker.js:2`,
   `track-agent-invocation.js:2`, `commit-tracker.js:1`,
   `firestore-rules-guard.js:3`, `lib/rotate-state.js:3`). JASON-OS CLAUDE.md
   §2 already enshrines the same contract
   (`<JASON_OS_ROOT>\CLAUDE.md:38-46`). /migration
   Phase 5 ("sanitize" verdict per D23) **must** route through these
   helpers or it will violate JASON-OS guardrails at its own hook gates.

**Key synthesis observations for the parent synthesizer:**

- /migration is more "router over existing planning stack" than "new
  engine" — matching the BRAINSTORM D5 decision (in-house, no route-out).
- Phase 0's `/sync` dependency is the **only** piece genuinely unbuilt
  in JASON-OS (BRAINSTORM §6). Every other recurring dep is "port, don't
  invent."
- Per BRAINSTORM D19, CAS itself is ported-through-/migration, so CAS does
  **not** appear as a Phase-2/3 Discovery integrand for /migration's v1 — it
  appears as /migration's *first real job*. Any `analyze`/`recall`/`synthesize`
  citation below is future-scope (post-CAS-port, not v1-blocker).

---

## Per-phase integration table

Format: **Candidate** — type — reason (file:line evidence). Candidates
ordered top-to-bottom by likely importance for that phase.

### Phase 0 — Context (pull /sync registry + JASON-OS context)

| # | Candidate | Type | Reason / evidence |
|---|-----------|------|-------------------|
| 1 | `/sync` (unbuilt) | skill | D9: consumer of sync registry. Sync is the single hard blocker per BRAINSTORM.md §6 ("`/sync` engine (sync-mechanism Piece 5) — Unbuilt in JASON-OS"). Phase 0 IS the sync-registry pull. |
| 2 | `sonash-context`-analog (JASON-OS context injector) | skill | SoNash pattern at `<SONASH_ROOT>\.claude\skills\sonash-context\SKILL.md:3-14` — "SoNash project context injected into agent definitions via skills: field." /migration's Phase 0 needs the equivalent for JASON-OS context (stack, constraints). Port-through-/migration candidate. |
| 3 | `session-begin` | skill | JASON-OS CLAUDE.md §7 names it as the session-boundary anchor (`<JASON_OS_ROOT>\CLAUDE.md:165`). Shares pattern of "load context, surface warnings, gate on ack" that Phase 0 literally is. Precedent at `<SONASH_ROOT>\.claude\skills\session-begin\SKILL.md:141,218`. |
| 4 | `scripts/lib/load-propagation-registry.js` | script | Concrete precedent for a registry-loader with schema validation, symlink-refusal, and regex safety (`<SONASH_ROOT>\scripts\lib\load-propagation-registry.js:1-115`). /sync's registry loader will likely mirror this. Phase 0 consumes its output. |
| 5 | `find-skills` | skill | Phase 0 may need skill-discovery when user's target is a workflow whose components are scattered. `<SONASH_ROOT>\.claude\skills\find-skills\SKILL.md:18-28` — "discover and install skills... from both skills.sh ecosystem and Claude Code plugin marketplaces." Low priority — dodgeable in v1. |

**Phase 0 count: 5.**

### Phase 1 — Target pick (menu: file / workflow / concept / proactive-scan / resume)

| # | Candidate | Type | Reason / evidence |
|---|-----------|------|-------------------|
| 1 | `todo` | skill | Resume-mode candidate source of suspended migration jobs. JSONL persistence + menu pattern directly mirrors /migration's multi-level unit picker. `<SONASH_ROOT>\.claude\skills\todo\SKILL.md:11-27` — "JSONL is source of truth", "render-todos.js runs automatically." |
| 2 | `checkpoint` | skill | State-resume plumbing for mid-state recovery. `<SONASH_ROOT>\.claude\skills\checkpoint\SKILL.md` exists. BRAINSTORM.md §2 freedoms: "State machine tracks gates, mid-state resume, gate memory aids confirmation" — checkpoint is the canonical pattern. |
| 3 | `find-skills` | skill | When unit-type = "workflow" or "concept", need to enumerate candidate skills/hooks that express the workflow. `<SONASH_ROOT>\.claude\skills\find-skills\SKILL.md:73` ("INSTALLED — local skills") is the listing-source. |
| 4 | `hooks/commit-tracker.js` + `.session-state.json` | hook+state | Proactive-scan mode needs a "what changed since last migration" signal. `<SONASH_ROOT>\.claude\hooks\commit-tracker.js:1` already tracks commits and stores `.commit-tracker-state.json` — proactive-scan can diff against it. |
| 5 | `brainstorm` (light re-entry) | skill | When user picks "concept" as unit type and the concept is under-specified, Phase 1 may need a micro-brainstorm gate. `<SONASH_ROOT>\.claude\skills\brainstorm\SKILL.md:40-51` defines the trigger ("let's brainstorm"/"I have an idea"). Matches BRAINSTORM D28 (iterative re-entry as norm). |

**Phase 1 count: 5.**

### Phase 2 — Discovery (pre-migration analysis, ripple, candidate identification)

| # | Candidate | Type | Reason / evidence |
|---|-----------|------|-------------------|
| 1 | `convergence-loop` (discovery preset) | skill | `<SONASH_ROOT>\.claude\skills\convergence-loop\SKILL.md:33` — "Discovery phases in any skill (T25 — deep-plan, skill-audit, ecosystem audits)." /migration Phase 2 is literally a discovery phase. T25 integration is precedent, not invention. |
| 2 | `Explore` agent | agent | JASON-OS CLAUDE.md §7 lists it as the canonical "Exploring unfamiliar code" tool (`<JASON_OS_ROOT>\CLAUDE.md:128`). Ripple analysis = exploration. |
| 3 | `scripts/lib/load-propagation-registry.js` + `propagation-intentional-divergence.json` | script+config | Ripple analysis needs the existing propagation rules. `<SONASH_ROOT>\.claude\config\propagation-intentional-divergence.json:1-15` — "Functions that exist in multiple files but are INTENTIONALLY not kept in sync." /migration must not reshape across these boundaries. |
| 4 | `deep-research` (Phase-2 feed) | skill | When Discovery flags `reshape`/`rewrite` verdicts, Phase 2 produces the research-queue that Phase 3 consumes. Citation-chain precedent: `<SONASH_ROOT>\.claude\skills\deep-plan\SKILL.md:125-130` — "research before I can ask informed questions. Run `/deep-research` first?" |
| 5 | `find-skills` / `repo-analysis` | skill | For workflow-level discovery (multi-skill unit), enumerate the ecosystem. `<SONASH_ROOT>\.claude\skills\repo-analysis\SKILL.md` + `find-skills` complement each other. Lower priority, shows up heavily only if ported-workflow covers 3+ skills. |

**Phase 2 count: 5.**

### Phase 3 — Research (verdict-conditional R4, for reshape/rewrite)

| # | Candidate | Type | Reason / evidence |
|---|-----------|------|-------------------|
| 1 | `deep-research` | skill | **Single most important integration** for Phase 3. BRAINSTORM.md §5 Q1 explicitly names its reuse: "Custom agents or reuse of existing (`deep-research-searcher`, `Explore`, `contrarian-challenger`, `Plan`)?" `<SONASH_ROOT>\.claude\skills\deep-research\SKILL.md:84,237,311,334` — full agent roster (`deep-research-searcher`, `-synthesizer`, `-verifier`, `-gap-pursuer`, `-final-synthesizer`). |
| 2 | `convergence-loop` (research-claims preset) | skill | `<SONASH_ROOT>\.claude\skills\convergence-loop\SKILL.md:66` — "`research-claims` | verify-sources -> cross-reference -> temporal-check -> completeness-audit -> bias-check -> synthesis-fidelity." Phase 3 outputs must be claim-verified before Phase 4 consumes them. |
| 3 | `brainstorm` (re-entry for reframes) | skill | D28 in BRAINSTORM: "brainstorm/deep-research/deep-plan re-entry is the norm, not the exception. Triggers: research surfaces material reframe → re-enter brainstorm." `<SONASH_ROOT>\.claude\skills\brainstorm\SKILL.md:278-281` shows the back-edge exists. |
| 4 | `sonash-context`-analog | skill | When researching destination idioms for "rewrite" verdict, need destination project-context primer. `<SONASH_ROOT>\.claude\skills\sonash-context\SKILL.md:9-14` pattern. For foreign-repo destination (D17 endpoint-bounded), this is where a parameterized context-loader slots in. |
| 5 | `deep-research-searcher` agent (direct) | agent | For tight-scope single-question research within Phase 3, bypass the full skill and spawn the agent directly. Precedent in brainstorm: `<SONASH_ROOT>\.claude\skills\brainstorm\SKILL.md:128,223` — "dispatch `deep-research-searcher` agents with…". |

**Phase 3 count: 5.**

### Phase 4 — Plan (writes MIGRATION_PLAN.md)

| # | Candidate | Type | Reason / evidence |
|---|-----------|------|-------------------|
| 1 | `deep-plan` | skill | Canonical plan-authoring skill. `<SONASH_ROOT>\.claude\skills\deep-plan\SKILL.md:91` — "PHASE 3: Plan → Steps with 'Done when:' + audit checkpoints." MIGRATION_PLAN.md should inherit deep-plan's template pattern verbatim. DECISIONS.md template: `deep-plan\REFERENCE.md`. |
| 2 | `convergence-loop` (plan-claims / Phase 3.5) | skill | `<SONASH_ROOT>\.claude\skills\deep-plan\SKILL.md:277` — "integration points) via convergence-loop quick preset. Plans built on wrong assumptions cascade." Phase 4 MUST verify MIGRATION_PLAN.md claims before user approval gate. Direct reuse, same preset. |
| 3 | `checkpoint` | skill | Plan-gate state needs durable save. `deep-plan\SKILL.md:195-198` — "`.claude/state/deep-plan.<topic-slug>.state.json` with task name, current". /migration state files follow same pattern. |
| 4 | `add-debt` | skill | When Plan identifies "blocked-on-prereq" verdict items (D23), the prereq becomes a debt entry. `<SONASH_ROOT>\.claude\skills\add-debt\SKILL.md` is the v0 stub. JASON-OS has its own fork. Migration Plan → debt backlog linkage. |
| 5 | `todo` | skill | Plan-export mode (D26) may generate a destination-side todo queue. `<SONASH_ROOT>\.claude\skills\todo\SKILL.md:11-20` — JSONL + render pipeline already designed for cross-session capture. |

**Phase 4 count: 5.**

### Phase 5 — Execute (active transformation: sanitize + reshape + rewrite, staged)

| # | Candidate | Type | Reason / evidence |
|---|-----------|------|-------------------|
| 1 | `scripts/lib/sanitize-error.cjs` + `.js` | script | **Primary sanitize-verdict engine's backbone.** BRAINSTORM D27 explicitly names it as seed candidate. JASON-OS CLAUDE.md §2 makes it mandatory: `<JASON_OS_ROOT>\CLAUDE.md:40` — "`scripts/lib/sanitize-error.cjs` — never log raw `error.message`." Both .js and .cjs exist at `<SONASH_ROOT>\scripts\lib\sanitize-error.js` + `.cjs` + `.d.ts`. |
| 2 | `scripts/lib/safe-fs.js` + `security-helpers.js` | script | Every write in Phase 5 must route through these. 83 existing occurrences across 30 SoNash files proves the contract. JASON-OS CLAUDE.md §2 re-enshrines it. Without these, Phase 5 writes will trip `post-write-validator.js` (see hook list below). |
| 3 | `pre-commit-fixer` | skill | Staged-write commits will hit pre-commit hooks. `<SONASH_ROOT>\.claude\skills\pre-commit-fixer\SKILL.md:97,111,175,213-219,235,241` — full failure-recovery flow. JASON-OS CLAUDE.md §4 rule 9 hardcodes `/pre-commit-fixer` after 1st failure (`<JASON_OS_ROOT>\CLAUDE.md:122`). |
| 4 | `hooks/post-write-validator.js` + `post-read-handler.js` + `loop-detector.js` | hook | Phase 5 writes trigger these. `loop-detector.js:2` already uses `sanitize-error`. If /migration loops on a failing reshape, loop-detector catches it. `post-write-validator.js:1` validates post-write. These are GATES not callees — but /migration must **respect** them. |
| 5 | `convergence-loop` (mid-execute verification) | skill | D24: "Rewrite may dispatch research mid-execute." Same pattern dispatches verification mid-execute. Batch-boundary claim check before advancing gates. |

**Phase 5 count: 5.**

### Phase 6 — Prove (embedded convergence-loop verification)

| # | Candidate | Type | Reason / evidence |
|---|-----------|------|-------------------|
| 1 | `convergence-loop` | skill | **Explicitly cited in BRAINSTORM.md line 32**: "Phase 6: Prove — embedded convergence-loop verification." Not a candidate, a definitional dependency. `<SONASH_ROOT>\.claude\skills\convergence-loop\SKILL.md:107,129,142,240-259` — full programmatic-mode integration surface. |
| 2 | `pr-review` (via /sync-cousin role) | skill | When direct-apply mode commits and a PR exists downstream, pr-review's 8-step protocol handles external-feedback reconciliation. BRAINSTORM D27 seeds it explicitly. `<SONASH_ROOT>\.claude\skills\pr-review\SKILL.md:356,388,429,449` — state-file + TDMS sync already wired. Post-migration PR-review loop. |
| 3 | `pr-retro` | skill | Post-execute lessons-captured hook. `<SONASH_ROOT>\.claude\skills\pr-retro\SKILL.md:5,367` — "convergence-loop deliverable verification, interactive findings walkthrough." Same shape as Phase 6's "prove" deliverable verification. Feed-forward of migration-lessons-learned into next /migration call. |
| 4 | `skill-audit` | skill | If Phase 6's unit-type was "skill" (ported a whole skill), post-port quality-gate it. Precedent: `skill-audit` runs 12-category behavioral audit. Auto-triggerable from /migration success. |
| 5 | `session-end` | skill | End-of-migration context-save. JASON-OS CLAUDE.md §7 acknowledges it's deferred (`<JASON_OS_ROOT>\CLAUDE.md:166`). When landed, Phase 6's final handoff gate mirrors session-end's "capture + commit" flow. |

**Phase 6 count: 5.**

**Total per-phase candidate slots filled: 35 (7 phases × 5 candidates).**

---

## Shared-dependency DAG

Text-rendered. `->` = "depends on / invokes". Cross-phase recurrence count
in brackets `[Nx]` where N≥2 marks the node as "load-bearing across
/migration phases."

```
                         /migration (7 phases)
                              |
           +------------------+------------------+---------------------+
           |                  |                  |                     |
           v                  v                  v                     v
   [PLANNING TRIO]    [VERIFICATION]      [TRANSFORMATION]        [RIPPLE/STATE]
           |                  |                  |                     |
   brainstorm [3x]      convergence-loop   sanitize-error [1x-crit]  todo [2x]
   deep-research [3x]   [5x - phases             |                     |
   deep-plan [1x]       2,3,4,5,6]         safe-fs [1x-crit]     checkpoint [2x]
           |                  |                  |                     |
           |                  |            security-helpers      commit-tracker (hook)
           v                  v            [1x-crit]                   |
   (self-cited as            |                  |                     v
    routing neighbors)       |            pre-commit-fixer [1x]   .session-state.json
           |                  |                  |
           |                  +--> Agent(deep-research-*)  [Phase 3]
           |                  +--> Agent(Explore)          [Phase 2]
           v                  +--> Agent(Plan)             [Phase 4]
    sonash-context-analog                                  |
    [2x - phases 0,3]                                      v
           |                                         post-write-validator (hook)
           v                                               |
    find-skills [2x - phases 0,1]                    loop-detector (hook)
                                                           |
                                                           v
                                                    [JASON-OS guardrails - CLAUDE.md §2]
                                                     sanitize-error + safe-fs + security-helpers
```

### Ripple count (nodes by recurrence across phases)

| Node | Type | Phases | Recurrence |
|------|------|--------|------------|
| `convergence-loop` | skill | 2,3,4,5,6 | **5x** (load-bearing) |
| `sanitize-error` / `safe-fs` / `security-helpers` | scripts/lib triad | 5 (and gates hooks at every other phase boundary) | **1x direct, ∞x transitive** |
| `deep-research` | skill | 2,3,(4 transitively) | **3x** |
| `brainstorm` | skill | 1,3 (re-entry per D28) | **2x** |
| `deep-plan` | skill | 4 (and pattern-lender elsewhere) | **1x direct, 3x pattern** |
| `checkpoint` | skill | 1,4 | **2x** |
| `todo` | skill | 1,4 | **2x** |
| `find-skills` | skill | 0,1,2 | **3x** |
| `sonash-context`-analog | skill | 0,3 | **2x** |
| `pre-commit-fixer` | skill | 5 | **1x** (but mandatory per CLAUDE.md rule 9) |
| `pr-review` | skill | 6 | **1x** |
| `Explore` agent | agent | 2 | **1x** (gateway to deep-research searchers) |
| `deep-research-searcher` agent | agent | 3 | direct-spawn pattern |
| `load-propagation-registry.js` | script | 0,2 | **2x** |

**Unique cross-phase dependencies: 24** (18 skills + 3 hooks
(post-write-validator, loop-detector, commit-tracker) + 3 shared scripts
(sanitize-error, safe-fs, security-helpers)).

### Second-order (dep-of-dep) ripple

Where each top-tier dep pulls in:

- **`convergence-loop`** self-declares integrations into deep-plan + skill-creator
  (`<SONASH_ROOT>\.claude\skills\convergence-loop\SKILL.md:251-259`). So porting convergence-loop is necessary for porting deep-plan to its full shape.
- **`brainstorm`** spawns `deep-research-searcher` agents
  (`brainstorm\SKILL.md:128,223`). Brainstorm isn't standalone — it transitively depends on the deep-research agent pool.
- **`deep-research`** spawns 5 agent subtypes (
  `deep-research\SKILL.md:237,245,311,326,334`). Requires full agent-infra in JASON-OS.
- **`deep-plan`** requires `convergence-loop` for Phase 0 diagnosis-verify + Phase 3.5 plan-verify (`deep-plan\SKILL.md:151-154,277,370`).
- **`skill-creator`** requires `convergence-loop` (`skill-creator\SKILL.md:244-246,281,358`) — so porting /migration via /skill-creator (natural bootstrap) pulls convergence-loop forward.
- **every hook** uses `sanitize-error` (16 hook files, 35 occurrences) — porting **any** hook requires the shared-libs triad landing first.
- **`pre-commit-fixer`** references `add-debt` and `hook-ecosystem-audit` (`pre-commit-fixer\SKILL.md:213-219,235,241`) — pre-commit-fixer is fractionally heavier than its Phase-5 role suggests.

---

## Port order recommendation

Bottom-up: land the leaves before the composites. /migration is the top of
the composite stack — it lands last.

### Tier 0 — Shared primitives (port FIRST; 0 intra-/migration deps)

1. **`scripts/lib/sanitize-error.cjs`** (+ `.js` + `.d.ts`) — single file, zero deps, referenced by JASON-OS CLAUDE.md §2 as mandatory. Foundation for everything.
2. **`scripts/lib/safe-fs.js`** — file-read/write wrapper. Self-contained.
3. **`scripts/lib/security-helpers.js`** — path-traversal + CLI sanitization. Self-contained.

*These three are port-order priority #1. Nothing below works without them.*

### Tier 1 — Verification spine (port SECOND)

4. **`/convergence-loop` skill** — the 5x-recurrence workhorse. No intra-planning deps; depends only on Tier 0 libs. Porting it unblocks deep-plan, deep-research, brainstorm, skill-creator, and /migration Phase 6.

### Tier 2 — Planning trio (port THIRD, parallelizable among themselves)

5. **`/brainstorm`** — depends on Tier 1 (convergence-loop) + `deep-research-searcher` agent.
6. **`/deep-research`** — depends on Tier 1 + the 5 searcher/synthesizer/verifier agents.
7. **`/deep-plan`** — depends on Tier 1 + optionally on /deep-research output feed.

### Tier 3 — Supporting skills (port alongside Tier 2)

8. **`/checkpoint`** — state-file skill, Tier 0 deps only.
9. **`/todo`** — JSONL + render pipeline, Tier 0 deps.
10. **`/pre-commit-fixer`** — depends on the hook ecosystem (port hooks first or alongside).
11. **`/find-skills`** — minimal deps; slots in wherever.
12. **Hooks triad:** `post-write-validator`, `loop-detector`, `commit-tracker` — each depends on Tier 0. Port as a bundle.

### Tier 4 — /sync (prerequisite for /migration Phase 0 only)

13. **`/sync`** — per BRAINSTORM §6, the hard blocker. Sync-mechanism brainstorm already exists (piece 1a/1b discovery scans in `.research/sync-mechanism/`). **This is /migration's ONLY genuinely unbuilt upstream.**

### Tier 5 — /migration itself (port LAST)

14. **`/migration`** — the composite skill, with all upstream deps now available.

### Top 3 port-order recommendations (from above)

1. **`scripts/lib/sanitize-error.cjs` + `safe-fs.js` + `security-helpers.js`** — three-file batch, the fastest unlock for every subsequent port. (~half-day port, per the JASON-OS CLAUDE.md §2 contract already being in place.)
2. **`/convergence-loop`** skill — single biggest unlock for the composite stack. 5x recurrence across /migration phases; prerequisite for deep-plan + deep-research + brainstorm + skill-creator.
3. **`/sync`** (sync-mechanism Piece 5) — /migration's sole genuinely-unbuilt upstream dep. Must be scheduled before /migration can reach Phase 0 sign-off. Its sync-mechanism brainstorm is independent of this /migration brainstorm and can proceed in parallel.

---

## Sources

- **BRAINSTORM context:** `<JASON_OS_ROOT>\.research\migration-skill\BRAINSTORM.md` lines 22-33 (7-phase arc), 58 (D9 consumer role), 82-85 (D23/D24 verdicts + Phase 5 content), 86 (D27 cross-skill seeds), 92-93 (D28/D29 re-entry + local scope), 147-152 (dep table).
- **JASON-OS guardrails:** `<JASON_OS_ROOT>\CLAUDE.md` lines 38-46 (shared-lib mandate), 122 (pre-commit-fixer rule), 125-137 (agent/skill triggers), 165-166 (session-begin/end).
- **SoNash top-level skill set:** `<SONASH_ROOT>\.claude\skills\` — 81 skill directories enumerated (see glob results).
- **SoNash hooks set:** `<SONASH_ROOT>\.claude\hooks\` — 30+ hooks, 16 use sanitize-error.
- **SoNash scripts/lib:** `<SONASH_ROOT>\scripts\lib\` — 21 modules, including the `sanitize-error` / `safe-fs` / `security-helpers` / `load-propagation-registry` triad+.
- **Key SKILL.md invocation evidence (per-phase):** `brainstorm\SKILL.md:128,223,271-281`, `deep-research\SKILL.md:84,237,245,311,326,334,355,398`, `deep-plan\SKILL.md:91,125-130,151-154,195-198,277,370-378`, `convergence-loop\SKILL.md:33,66,107,129,142,240-259`, `pr-review\SKILL.md:70,319,356,388,429,449`, `pre-commit-fixer\SKILL.md:40,97,111,175,213-219,235,241`, `todo\SKILL.md:11-47`, `session-begin\SKILL.md:141,218`, `find-skills\SKILL.md:18-96`, `sonash-context\SKILL.md:3-65`, `pr-retro\SKILL.md:5,367`, `skill-creator\SKILL.md:244-246,281,358`.
- **Propagation registry:** `<SONASH_ROOT>\.claude\config\propagation-intentional-divergence.json:1-40`, `scripts\lib\load-propagation-registry.js:1-249`.
- **Sibling D2-* agents:** Per-family deep inventories (skills a-p, skills p-t, agents/teams/commands, hooks-wiring, scripts, etc.) owned by other D2-* agents. This agent's outputs **overlap** with theirs on individual skill-file claims; synthesizer should dedupe on `file:line` matches. Areas most likely to overlap: any D2-skills-* agent's per-skill invocation citations; D2-hooks-wiring overlap on the sanitize-error hook roster.

---

**Note to synthesizer:** This file is a **lens** on the full SoNash picture
from /migration's perspective, not a full inventory. Per-family scans (D2-*
siblings) are authoritative on completeness per family; this file is
authoritative on **prioritization and port order for /migration-readiness.**
When they disagree on a specific claim, trust the family scan for
completeness and this file for per-phase relevance ranking.
