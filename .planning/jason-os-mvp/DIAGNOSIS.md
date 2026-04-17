# JASON-OS Foundation — Diagnosis

**Date:** 2026-04-16
**Topic:** jason-os-mvp *(label retained for research-traceability; scope is the **Foundation** — framework / underpinnings so the real work can begin, not a shippable product)*
**Deep-plan state file:** `.claude/state/deep-plan.jason-os-mvp.state.json`
**Primary research input:** `.research/jason-os-mvp/RESEARCH_OUTPUT.md` v1.2 (26 agents, 67 claims, HIGH-MEDIUM confidence)

---

## Topic

Produce the implementation plan for the **JASON-OS Foundation** — the framework
and underpinnings that let the real work begin. Scope is defined by the
completed `.research/jason-os-mvp/` deep-research (Phases 1 → 4).

**"MVP" is a research-era label.** This is explicitly **not** a shippable
product, not a distributable template, not a platform — it is the foundation
those later deliverables will be built on. The "real work" (template,
distribution, sync mechanism, CLI, community) is the downstream 16-domain
research program (see Prior Work).

**Reframed from research:** *What spine + organs make SoNash feel like home, and
what's the smallest JASON-OS delta that replicates that feel?*

---

## Prior Work (Contributing Context)

**No `ROADMAP.md` exists at the repo root.** Project direction is established
across three prior artifacts that informed this plan. All three share the same
end-state vision (portable Claude Code OS, template → platform); they differ in
scope and execution status. This Foundation plan **builds on all three**, not
in place of them.

### 1. `.research/jason-os/BRAINSTORM.md` — Direction-Setting

**Status:** Complete. Documents the chosen direction and anti-goals.

- **Direction:** Template → Platform (B→F trajectory)
- **Operator identity:** No-code vibe coder — UX must work for orchestrators
- **#1 risk:** Sync/maintenance overhead between source repo and OS
- **Anti-goals:** Maintenance burden, rabbit holes, SoNash refs, dev-only,
  cross-tool at launch
- **Portability signal (surface scan):** ~47 portable skills, ~16 agents,
  ~5 hooks — later refined by MVP research (see C-023 caveat: structural
  upper bound).

**Feeds this plan:** operator identity, direction, anti-goals, initial scope
signal. Every Foundation scope decision must honor brainstorm anti-goals.

### 2. `.planning/jason-os/` — 16-Domain Research Roadmap

**Status:** Planned, not executed (SYNTHESIS.md: 0/16 domains completed).
**This is not failure** — it is a well-scoped program for the broader
template-→-platform work (sync mechanisms, extraction automation, onboarding
UX, CLI, community distribution). 35 decisions captured across research
purpose, 16 research domains, structure, and governance.

**Relationship to Foundation plan:** The 16-domain plan is **the real work
that begins AFTER the Foundation exists.** Its domains (sync, extraction,
template design, onboarding, CLI, UX, community, etc.) all presume the
foundation of "a dogfood repo that feels like home to work in." Without
the Foundation, those domains can be researched but not validated — there
is no working substrate to build/test against.

**Feeds this plan:**
- Identifies anti-goals to carry forward (no maintenance burden, no cross-tool
  ambition at launch, no UX neglect for non-developers).
- Defines the downstream roadmap so Foundation scope can stop at the right
  line: Foundation = "feels like home"; 16-domain work = "becomes a product."
- Surfaces sync/distribution as the #1 eventual pain point — Foundation should
  not accidentally design in ways that block later sync work.

### 3. `.research/jason-os-mvp/` — Completed Deep-Research (Primary Input)

**Status:** Complete through Phase 4 (26 agents, 67 claims, cross-model
verification). Produces the 3-layer scope model (Layer 0+ through Layer 4)
used below.

**Feeds this plan:** the concrete scope, verified current-state inventory,
dependency graph, and caveats. Directly sizes and sequences work.

### Direction Alignment Verdict

Foundation plan is **aligned** with all three prior artifacts. No conflict,
sequence: brainstorm (direction) → 16-domain plan (broader program scope,
unexecuted) → MVP research (Foundation scope, executed) → **this plan**
(Foundation implementation). The 16-domain plan remains live and resumable
once Foundation is in place. This plan explicitly does NOT include sync,
extraction automation, template distribution, CLI, or community — those are
the "real work" downstream.

**`CLAUDE.md` v0.1 §1-3** (Stack, Security Rules, Architecture) are TBD.
Whether Foundation fills these is a discovery question (G16).

---

## Prior Research Context (Primary Input)

`RESEARCH_OUTPUT.md` v1.2 frames the MVP as a **layered scope** (post-gap-pursuit,
post-cross-model):

| Layer  | Contents                                                                                                             | Estimate (from research) |
| ------ | -------------------------------------------------------------------------------------------------------------------- | ------------------------ |
| **0+** | Zero-cost wins: PROACTIVELY clauses (8 agents), `.nvmrc`, strip `write-invocation.ts` (9 skills), GATE/BEHAVIORAL annotations (CLAUDE.md), AgentSkills field hygiene (9 skills) | ~1.5h total              |
| **0**  | Immediate repairs: `/todo` stub-or-port, `/add-debt` stub                                                            | 30min–2h                 |
| **1**  | Session Rhythm: `hooks/lib` 4-file prereq → `SESSION_CONTEXT.md` → `session-end` v0 → pre-compaction-save + compact-restore → commit-tracker | 4–6h                     |
| **2**  | Ambient Intelligence: `user-prompt-handler` Phase A → `post-read-handler` → `loop-detector` (new `PostToolUseFailure` section) → `governance-logger` | 2–3h                     |
| **3**  | Navigation docs: `AI_WORKFLOW.md`, `COMMAND_REFERENCE.md`, `SKILL_INDEX.md` (with version/sync columns), `HOOKS.md` | 3–4h                     |
| **4**  | Quality skills: `pre-commit-fixer`, `systematic-debugging`, `validate-claude-folder`, `research-plan-team`           | 3–4h                     |

**Critical corrections applied during research** (do NOT repeat in plan):

- `sanitize-error.cjs` EXISTS (C-015 refuted) — don't plan to port it.
- `settings-guardian.js` CRITICAL_HOOKS already trimmed (C-037 refuted) — don't
  plan to fix it.
- `git-utils.js` is ABSENT (G4's "already present" claim REFUTED by GV1) — MUST
  be copied before any Layer 1 work.
- `post-write-validator.js` has 13 active validators, not 10.
- `loop-detector.js` wires to `PostToolUseFailure`, not `PostToolUse`.
- `/todo` full port is **1.5h** (not 3-4h) — hard deps already present.

---

## Relevant Existing Systems (Verified 2026-04-16)

Spot-checked 6 load-bearing claims against current filesystem. All verified.

| System                    | Current State                                                        | Research Claim                                                 | Verdict      |
| ------------------------- | -------------------------------------------------------------------- | -------------------------------------------------------------- | ------------ |
| `.claude/hooks/lib/`      | 1 file: `symlink-guard.js`                                           | git-utils.js ABSENT; need 4-file copy from SoNash               | ✅ Verified  |
| `SESSION_CONTEXT.md`      | Does not exist at repo root                                          | Missing — required for `session-begin` context-load to work    | ✅ Verified  |
| `.claude/skills/`         | 9 skills: brainstorm, checkpoint, convergence-loop, deep-plan, deep-research, session-begin, skill-audit, skill-creator, todo | 9 ported, `todo` broken, `session-end` absent                  | ✅ Verified  |
| `.claude/agents/`         | 8 agents (all deep-research team variants)                           | 8 agents, 0 PROACTIVELY clauses                                | ✅ Verified  |
| PROACTIVELY clauses       | 0 across all 8 agents (`rg` count)                                   | 0 — Layer 0+ item 0a is the highest-leverage 15-min fix        | ✅ Verified  |
| `settings.json` hooks     | 2 events wired: `SessionStart` (check-mcp-servers), `PreToolUse` (block-push-to-main, large-file-gate, settings-guardian) | 4 active hooks, no PostToolUse/UserPromptSubmit/PreCompact     | ✅ Verified  |

**Memory state:** JASON-OS canonical-memory at 11 files (commit 1d7fc0c). Global
memory at 31 files. Memory MEMORY.md says brainstorm COMPLETE (35 decisions, 17
domains), deep-research COMPLETE (67 claims), next = deep-plan.

**Research assets:** 4 git-tracked directories in `.research/`: `jason-os/`
(BRAINSTORM.md), `jason-os-mvp/` (completed deep-research, 24 files), plus
deep-research artifacts (FINDINGS.md × 18, CROSS_MODEL_GEMINI.md,
PHASE_3_95_PLAN.md, claims.jsonl, sources.jsonl, metadata.json, RESUME_STATE.json).

**Git state:** Branch `startup-41526`, 1 commit ahead of origin (the bookkeeping
refresh from earlier this session), clean working tree. Main at `63b6a1c`
(orphaned — MVP pivot happened on `startup-41526`).

**Gemini CLI:** v0.38.1 installed globally via npm, OAuth settings configured,
**auth flow not yet completed** on this locale (deferred by user).

---

## Strategic Open Questions (Deferred from Research to Deep-Plan)

These are **decisions**, not research gaps. The research surfaced them and
declined to resolve them — deep-plan's Phase 1 discovery MUST address each.

### SQ-1 — Extract-from-SoNash vs. Design-from-Scratch (CRITICAL)

**From CH-C-001.** The research synthesis assumes extract-from-SoNash. The
contrarian challenge frames the risk: SoNash's patterns (cross-hook state loop,
agent tracking, pre-commit compliance) presuppose 17 PROACTIVELY-clause'd agents
and a settled TypeScript/Node workflow. JASON-OS has 0 matching agents and
stack-TBD. Porting evolved session-#281 patterns into session-#1 context risks
"SoNash-in-a-trenchcoat." The navigation-docs finding (G5: `AI_WORKFLOW.md` is
~60% SoNash-specific) reinforces this: even "infrastructure" docs need tailored
rewrites, not copies.

**Decision needed:** Extract-primary (port SoNash, sanitize, accept semantic
coupling risk)? Design-primary (SoNash as reference, build clean)? Hybrid
(extract for infra, design for skills/agents)? **This decision shapes EVERY
scope decision in the plan.**

### SQ-2 — Workflow Chain as Product vs. Artifact Port (HIGH novelty)

**From CH-O-003.** An alternative framing: the *workflow chain* (brainstorm →
deep-research → deep-plan → execute) is the actual portable product; hooks and
skills are scaffolding. Under this frame, Layer 3 (navigation docs) and
Layer 4 (quality skills) might be better served as documented process, not
mechanically ported artifacts. Aligns with the user-memory framing: "if someone
who doesn't code can build infrastructure through pure orchestration, that
infrastructure should be portable."

**Decision needed:** Does the MVP encode the process (docs-first) or port the
artifacts (hooks/skills-first)? Affects Layer 3 approach and Layer 4 scope.

### G16 — Stack Decision

**Deferred from research Phase 3.95 scan.** CLAUDE.md §1 (Stack), §2 (Security
Rules), §3 (Architecture) are all TBD. The MVP's scope is **hook-heavy and
Node.js-leaning** (current hooks are all Node.js). `/todo` full-port assumes
Node.js. Any CI/test decisions assume a package manager. Continuing without
this decision risks writing plan steps that silently presume Node.js.

**Decision needed:** Is JASON-OS MVP a Node.js-only repo? Language-agnostic
repo with Node.js-hooks-only? Something else? Scope of CLAUDE.md §1-3 fill-in
(during MVP vs deferred)?

---

## Caveats to Carry into Discovery

From research verification + contrarian/OTB challenges. Deep-plan MUST honor
these; each is marked with the claim/challenge ID for traceability.

1. **C-023 (cross-model DISAGREE):** "32 of 80 portable skills" is a structural
   upper bound with known false-positives. Runtime-verified subset is smaller.
   Plan MUST NOT treat this figure as ground truth for scope sizing.
2. **CH-C-005 (maintenance trap):** 9 ported skills will drift from SoNash
   within months unless version/sync tracking exists. SKILL_INDEX.md must ship
   with `portability_status`, `source_version`, `source_path`, `last_synced`
   columns — not just descriptions.
3. **CH-C-010 (memory portability):** The "create 3 memory files" fix is
   session-local (`~/.claude/`). For a portable OS, memory must be
   git-trackable. Architecture decision (canonical-memory pattern) is part of
   this plan's scope.
4. **CH-C-003 (compaction defense activation):** Layer 1 compaction defense is
   functional after wiring but operationally empty until the first
   `session-end` run. Plan must sequence `SESSION_CONTEXT.md` + `session-end`
   BEFORE `pre-compaction-save` wiring for it to deliver value.
5. **CH-C-008 (advisory vs mandatory enforcement):** During sessions 1-10,
   advisory CLAUDE.md rules may outperform mandatory hook directives that point
   to nonexistent agents. `user-prompt-handler.js` `runAnalyze()` should ship
   in advisory mode; flip to mandatory later. Plan must encode this gradient.
6. **No-caps principle (user memory `feedback_no_research_caps.md`):** Don't
   cap discovery question count or plan step count to save time. Floor is ~15
   questions; no ceiling.
7. **Skills-in-plans-are-tool-calls (user memory):** Any `/skill-name`
   reference in PLAN.md is a Skill tool invocation, not prose.
8. **Project-scoped-over-global (user memory):** Config changes default to
   `.claude/` in the repo, not `~/.claude/`, unless explicitly approved.

---

## Reframe Check — RESOLVED (user input, 2026-04-16)

1. **Framing:** **Foundation** (framework / underpinnings so real work can
   begin), NOT "MVP" (not a shippable product). "MVP" label retained only in
   directory/state-file names for research-traceability; all content speaks
   to Foundation.

2. **Deliverable:** Implementation plan only. Execution is a separate,
   approval-gated step (CLAUDE.md §4.2).

3. **Branch:** `startup-41526` retained. No rename, no new branch for Foundation
   work. Removed from discovery question list.

4. **Prior-work integration:** Brainstorm + 16-domain plan are contributing
   context, not superseded. 16-domain plan is "the real work that begins
   after Foundation." Foundation must not design in ways that block it.

---

## What This Diagnosis Does NOT Contain

- **Scope decisions** — every Layer 0+/0/1/2/3/4 item is a candidate, not a
  commitment. Discovery will trim.
- **Stack commitments** — see G16.
- **Extract-vs-design direction** — see SQ-1.
- **Sequencing beyond research's "Layer 0+ → 0 → 1 → 2 → 3 → 4"** — discovery
  will confirm or reorder.

---

## Next

User confirms diagnosis (or reframes). On confirmation, begin **Phase 1
Discovery**. Estimated 4-5 batches, ~25-40 questions, front-loaded on SQ-1
(extract vs design) and G16 (stack) since they gate everything else.
