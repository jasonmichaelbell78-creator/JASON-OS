# Contrarian Challenges: JASON-OS MVP

**Challenger:** Contrarian Agent v1
**Date:** 2026-04-15
**Research reviewed:** RESEARCH_OUTPUT.md (12 D-agents, 45 claims, 4 V-agents)

---

## CH-C-001: Extract Strategy Is Path-Dependent — SoNash Patterns May Not Fit Stack-TBD Portable OS

- **Frame:** Path dependence
- **Severity:** CRITICAL
- **Targets:** C-008, C-016, C-023, §(b) Organs Map

**Steel-man:** SoNash = ~281 sessions of refinement; copying the evolved result is faster than re-deriving.

**Why it fails:** Synthesis frames JASON-OS as "SoNash minus app coupling." But JASON-OS is stack-TBD — CLAUDE.md §1-3 blank. SoNash's cross-hook state loop (agent tracking → pre-commit compliance) presupposes 17 defined agents with PROACTIVELY clauses. JASON-OS has 0. D2e portability classification uses grep-count (syntactic) — misses semantic coupling to a TypeScript/Node project. Pre-mortem: 6 months in, ported 15 skills, 8 hooks; stack is chosen (Python); 40% of ports reference `.planning/`, `.session-agents.json`, JS-specific workflows. Operator re-sanitizes "sanitized" items. Result: SoNash-in-a-trench-coat.

**Recommendation:** Downgrade portability confidence for any hook/skill whose BEHAVIOR depends on downstream skills/agents that don't exist in JASON-OS. Consider scratch-design informed-by-SoNash as a named decision in deep-plan rather than assumed direction.

---

## CH-C-002: 18-Item MVP Is Scope Inflation Wearing "Minimum" As Costume

- **Frame:** Sunk cost / under-aggressive simplification
- **Severity:** MAJOR
- **Targets:** §(d) Preliminary MVP Scope (Tiers A-E, 18 items), C-024

**Steel-man:** 18 items genuinely address observable gaps (broken /todo, missing session-end, no compaction defense).

**Why it fails:** User memory: "Creates for joy, not shipping. Frame as craft, not MVP/delivery." An 18-item MVP backlog is wrong frame. Synthesis bundles three different categories:
1. Bug fixes (Layer 0, 3 items) — must fix regardless
2. Home-feel features (Layers 1-2, 8 items) — actual MVP question
3. Polish (Layers 3-4, 7 items) — nice-to-have

Layer 3 has ZERO functional dependency on 0-2. Included because it exists in SoNash, not because it blocks home feel. Risk: 3 hours on COMMAND_REFERENCE.md before compaction defense wired.

**Recommendation:** Reframe as three decisions: Fixes (2h), Home Feel Organs (4h), Craft Extensions (as joy permits). Explicitly flag "minimum for home feel ≠ minimum viable product."

---

## CH-C-003: Compaction Defense Is Ported as Mechanism, Not Intent — Produces No Useful Output Until State Exists

- **Frame:** Implementation gap
- **Severity:** MAJOR
- **Targets:** C-005, Criterion 2, Layer 1 items 6-7

**Steel-man:** 3 scripts are genuinely portable, pure Node.js file I/O.

**Why it fails:** `pre-compaction-save.js` captures context FROM: SESSION_CONTEXT.md (not created until Layer 1 item 4), `.session-agents.json` (no tracking hooks), `.planning/` (broken), git log. At MVP, all inputs empty. `compact-restore.js` injects near-empty handoff. Mechanism works but produces nothing. Operator told defense is wired; loses context anyway on first compaction. False sense of security.

**Recommendation:** Ordering prerequisite — compaction defense structurally wired at Layer 1 but operationally effective ONLY after first full session with session-end completing. Don't claim "Compaction Does Not Mean Amnesia" as MVP-delivered property.

---

## CH-C-004: user-prompt-handler.js Is the Crown Jewel — But Its 720 LOC Was Not Line-By-Line Extracted

- **Frame:** Scope blindness
- **Severity:** MAJOR
- **Targets:** C-009, C-013, C-025, Criterion 3, Layer 2 item 8

**Steel-man:** The hook turns CLAUDE.md from advisory to enforced. Confirmed via filesystem with HIGH confidence.

**Why it fails:** Open Gap #5 explicitly: "GSD-specific sub-functions not line-by-line extracted." `runAnalyze()` emits `PRE-TASK: MUST use [skill/agent]` directives keyed to keywords. Directives reference SoNash agents: code-reviewer, security-auditor, frontend-developer, database workflow. ALL ABSENT from JASON-OS. Wiring as-is → mandatory directives for nonexistent agents. Worse than no enforcement — creates confusion. Alerts sub-function checks `pending-alerts.json` that doesn't exist (alerts skill non-portable per D2e).

**Recommendation:** Downgrade portability HIGH → MEDIUM. Deep-plan receives "extract portable sub-functions, strip GSD-specific directives from runAnalyze(), then wire" — not "wire user-prompt-handler.js." Effort becomes a meaningful rewrite, not copy/configure.

---

## CH-C-005: Maintenance Trap Unaddressed — 30+ Skills Diverge From SoNash Within Weeks

- **Frame:** Maintenance trap
- **Severity:** MAJOR
- **Targets:** C-023, §(b) Skill Organs tier table

**Steel-man:** Research correctly scopes, clearly defers most skills. Brainstorm notes #1 risk.

**Why it fails:** 32 "fully portable" skills with no provision for staying current. SoNash at SESSION_CONTEXT v8.35 (280+ sessions). Every SoNash session improves a skill whose JASON-OS copy does NOT receive. Open Gap #6: "JASON-OS skill versions not cross-checked for staleness." No version columns. No last-synced tracking. In 6 months: deep-research in JASON-OS = bootstrap version; SoNash running v2.3 with 30 sessions of improvements. Operator notices behavior difference, can't identify cause. Portable OS becomes stale fork.

**Recommendation:** Deep-plan MUST include sync primitive — SKILL_INDEX.md with versions + last-synced dates + skill-audit trigger that checks against SoNash. #1 stated risk from brainstorm; synthesis currently silent.

---

## CH-C-006: Home-Feel Criteria Are Subjective and Untested — Derived by Same Agents Doing Gap Analysis

- **Frame:** Survivorship bias
- **Severity:** MAJOR
- **Targets:** §(a) 6 home-feel criteria, C-039

**Steel-man:** Criteria derived from cross-cutting pattern in 12 findings; methodology sound.

**Why it fails:** Derivation answers "what SoNash has that JASON-OS doesn't," not "what makes SoNash feel like home to Jason." Different questions. SoNash evolved with specific app context (Next.js/Firebase/TDMS). Jason's home feel may come from a SUBSET unrelated to complexity the research measured. Possibilities:
- Session counter incrementing ("Session #281") > 3-layer compaction defense
- SESSION_CONTEXT.md containing Jason's goals/history > any hook
- Statusline context gauge > user-prompt-handler

Research has no user signal. Relies on structural inference: complex = valuable. User is "creates for joy" — home feel may come from rituals (session begin counter, session end gate) not architecture (PostToolUse cascades).

**Recommendation:** Add caveat — criteria structurally derived, not user-validated. Recommend deep-plan sequence SESSION_CONTEXT.md + session-end v0 BEFORE hooks; run one full session cycle to validate subjective home feel before committing to Layer 2 scope.

---

## CH-C-007: Two REFUTED Claims Overstated JASON-OS Dysfunction

- **Frame:** Verification corrections / survivorship bias
- **Severity:** MAJOR
- **Targets:** C-015 (REFUTED), C-037 (REFUTED), C-006 (CONFLICTED), C-022 (CONFLICTED)

**Steel-man:** Pipeline caught 2 REFUTED + 2 CONFLICTED claims — working as designed.

**Why it fails:** BOTH refuted claims cast JASON-OS as worse than it is:
- C-015: sanitize-error.cjs EXISTS at correct path. Bug 1 / Severity HIGH in executive summary. Remains Layer 0 item 1 despite being confirmed non-issue.
- C-037: settings-guardian already-trimmed in JASON-OS. False-positive condition doesn't exist.

Pattern: D-agents tasked "what does SoNash have that JASON-OS lacks?" — framing ensures every finding is a gap. No agent tasked with "what does JASON-OS have that works correctly." Structural pressure toward overstating dysfunction.

**Recommendation:** IMMEDIATE — Layer 0 reduced to 2 items, not 3. C-015 scope removed from deep-plan input. Add a follow-on "confirm what's already working" pass before scoping.

---

## CH-C-008: Hook Enforcement Presupposes Settled Workflow — Wrong for Exploratory Phase

- **Frame:** Enforcement vs behavioral
- **Severity:** MAJOR
- **Targets:** C-013, C-021, Criterion 3, Dead-End 1

**Steel-man:** Hook enforcement turns aspirational rules into actual constraints — especially valuable for no-code orchestrator.

**Why it fails:** User memory: "Never implement without explicit approval. Present plan, wait for 'go.'" Presupposes Claude exercising judgment and surfacing decisions. Hook enforcement that emits `PRE-TASK: MUST use [skill]` BEFORE Claude can respond bypasses Claude's judgment. SoNash session #281: workflow proven, shortcuts known failure modes — enforcement appropriate. JASON-OS session #1-#10, stack TBD, exploring what the OS should be — mandatory enforcement prevents discovering workflow needs adaptation. BOOTSTRAP_DEFERRED.md explicitly deferred session-end to wait for the right JASON-OS-native design. Same judgment not applied to hook enforcement.

**Recommendation:** Value of runAnalyze() enforcement inversely proportional to how settled JASON-OS workflow is. Port only runGuardrails, runFrustrationDetection, runSessionEnd (beneficial regardless). Defer runAnalyze() enforcement until workflow is stable. Meaningful scope reduction.

---

## CH-C-009: Session-End v0 Has Unresolved Phase 2+4 Dependencies — 45min Estimate Is Wrong

- **Frame:** Implementation gap
- **Severity:** MINOR
- **Targets:** C-024, Layer 1 item 5

**Steel-man:** Phase 3 (metrics) is only hard blocker. Phases 1/2/4 use git + file I/O + markdown.

**Why it fails:** Phase 2 reads:
- `.session-agents.json` (track-agent-invocation.js NOT ported)
- `.agent-trigger-state.json` (same dep)
- `agent-invocations.jsonl` (same dep)
- `.planning/system-wide-standardization/decisions.jsonl` (absent)
- `scripts/log-override.js` (absent per D4 Finding 3)

Phase 4 Step 10: session-end-commit.js requires log-override.js + safe-fs.js (unread). A "v0 stripping Phase 3" still has 4-5 unresolved dependencies. Estimate is for writing SKILL.md, not resolving deps.

**Recommendation:** Restate estimate: 45 min → 2-3h with dep resolution. Affects Tier B time in MVP scope.

---

## CH-C-010: Memory Portability Gap — 3-File Fix Is Session-Local, Not OS-Portable

- **Frame:** Scope blindness
- **Severity:** MINOR
- **Targets:** C-039, D4 Finding 10, C-006

**Steel-man:** JASON-OS inherits rich behavioral memory. The memory gap is project state (1 vs 27), which synthesis proposes to fix.

**Why it fails:** JASON-OS = "portable Claude Code operating system." Memory creating behavioral consistency lives in `~/.claude/projects/*/memory/` — machine-local, user-local. On a new machine, 25 feedback entries, expertise profile, decision authority — all absent. Synthesis's 3-file fix goes to `~/.claude/`, doesn't fix portability. D4 Finding 10: SoNash has canonical-memory/ version-controlled; memory travels with repo. JASON-OS does not.

**Recommendation:** Either (1) acknowledge 3-file fix is session-level, not portability solution — defer architecture decision to deep-plan, or (2) adopt `.claude/canonical-memory/` pattern so memory is git-tracked.

---

## Summary Table

| ID | Challenge | Frame | Severity | Primary Claims |
|---|---|---|---|---|
| CH-C-001 | Extract strategy path-dependent for stack-TBD | Path dependence | CRITICAL | C-008, C-016, C-023 |
| CH-C-002 | 18-item MVP is scope inflation | Sunk cost | MAJOR | §(d) |
| CH-C-003 | Compaction defense empty-inputs at MVP | Implementation gap | MAJOR | C-005, Criterion 2 |
| CH-C-004 | user-prompt-handler.js not line-extracted | Scope blindness | MAJOR | C-009, C-013, C-025 |
| CH-C-005 | Maintenance trap unaddressed | Maintenance trap | MAJOR | C-023, D2e |
| CH-C-006 | Home-feel criteria not user-validated | Survivorship bias | MAJOR | §(a), C-039 |
| CH-C-007 | Refuted claims remain in MVP scope | Verification | MAJOR | C-015, C-037 |
| CH-C-008 | Hook enforcement wrong for exploratory phase | Enforcement vs behavioral | MAJOR | C-013, C-021 |
| CH-C-009 | Session-end v0 estimate undercounts deps | Implementation gap | MINOR | C-024 |
| CH-C-010 | Memory-portability fix is session-local | Scope blindness | MINOR | C-039 |

---

## Most Urgent

- **CH-C-007** (immediately actionable): Remove already-resolved bug from Layer 0. Reduce scope from 3 to 2 items.
- **CH-C-004** (most consequential): Don't wire user-prompt-handler.js before runAnalyze() line-extraction. Emitting mandatory directives for nonexistent agents is worse than no enforcement.
- **CH-C-001** (most strategic): Make "extract from SoNash" a NAMED decision in deep-plan, not assumed direction.
