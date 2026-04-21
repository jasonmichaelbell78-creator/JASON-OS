# Phase 3.95 — Gap Pursuit Dispatch Plan

**Created:** 2026-04-15 (session pre-restart)
**Purpose:** Persist Phase 3.95 scan results + gap-agent dispatch prompts across session restart. After restart, the repo-local deep-research agent definitions in `.claude/agents/` will be harness-registered, enabling specialized `deep-research-gap-pursuer` / `deep-research-verifier` / `deep-research-final-synthesizer` subagent types.

---

## Resume protocol

1. Verify that after restart, `deep-research-gap-pursuer` appears in the Agent tool's available subagent_types list. If NOT, escalate before dispatching — something is wrong with agent registration.
2. Dispatch Wave 1 (4 parallel gap-pursuers) — prompts below.
3. After Wave 1 completes: verify each output file exists and is non-empty (Windows 0-byte bug per CLAUDE.md §4.15 + Critical Rule 4 in SKILL.md). If any is 0 bytes, capture the task-notification `<result>` text and Write it to the expected path.
4. Dispatch Wave 2 (2 parallel gap-pursuers).
5. Same 0-byte check.
6. Dispatch Phase 3.96 — 2 `deep-research-verifier` agents (GV1 codebase, GV2 cross-consistency).
7. Dispatch Phase 3.97 — 1 `deep-research-final-synthesizer` agent (edits RESEARCH_OUTPUT.md + jsonl + metadata.json).
8. Cross-model Gemini pass — 5 `echo ... | gemini -p ...` bash calls (candidates listed below).
9. Phase 4 self-audit — inline, T1 checks.
10. Phase 5 — menu + downstream routing.

---

## Phase 3.95 Scan — Summary

**Scanned:** 12 D-agent findings + 4 V-agent findings + 2 challenge files + claims.jsonl + RESEARCH_OUTPUT.md

**Output:** 20 actionable gap items (G1-G20) deduplicated from 6 source types per SKILL.md §22.1. G16 (stack decision) is strategic-not-researchable — deferred to deep-plan. Remaining 19 items cluster into 6 gap-pursuer agents across 2 waves (Option C: splits the two heaviest agents for rigor).

### Gap items G1-G20 — one-line descriptions

| ID | Title | Source priority |
|---|---|---|
| G1 | Session-end pipeline missing (no SESSION_CONTEXT.md, no session-end skill) | 1 |
| G2 | Compaction defense mechanisms wired but empty-input at MVP | 1 |
| G3 | `user-prompt-handler.js` (718 LOC) line-extraction + runAnalyze portability | 1 |
| G4 | PostToolUse tripwire web — 9 hooks absent (5 post our exclusions) | 1 |
| G5 | Pre-commit agent-compliance gate missing | 1 |
| G6 | `/todo` skill non-functional — 3 scripts + jsonl absent | 1 |
| G7 | Deep-research Phase 5 routes to nonexistent `/add-debt` | 1 |
| G8 | PROACTIVELY clauses on agents (17 SoNash have; 0 JASON-OS) | 4 |
| G9 | Navigation document ecosystem absent (AI_WORKFLOW, COMMAND_REFERENCE, SKILL_INDEX, HOOKS.md) | 1 |
| G10 | Skills maintenance trap — 32 ported skills will diverge from SoNash | 4 |
| G11 | `.claude/teams/` coordination layer absent | 1 |
| G12 | `[GATE]` / `[BEHAVIORAL]` annotations absent from CLAUDE.md rules | 1 |
| G13 | `.research/EXTRACTIONS.md` prior-art lookup missing | 1 |
| G14 | Portable utility scripts absent (log-override.js, validate-skip-reason.js, etc.) | 1 |
| G15 | Memory portability architecture unresolved (canonical-memory vs auto-memory sync) | 1 |
| G16 | Stack decision blocks portability assessment — **NOT PURSUABLE, defer to deep-plan** | 6 |
| G17 | Statusline → hook bridge coordination missing | 1 |
| G18 | Missing skills referenced in CLAUDE.md guardrails (pre-commit-fixer) | 1 |
| G19 | AgentSkills 16-tool open standard compatibility unknown | 4 |
| G20 | Node version management missing (no .nvmrc) | 1 |

### Cross-model verification candidates (for Phase 4 Gemini pass)

| Claim | Why external verification |
|---|---|
| C-023 | 80 skills / 32 portable classification accuracy |
| C-009 | `user-prompt-handler.js` `runAnalyze()` agent-name portability |
| C-039 | Auto-memory mechanism + 200-line limit (Anthropic doc verification) |
| C-031 | pr-retro hard gate produces real changes |
| C-G1 | AgentSkills standard spec vs SKILL.md constructs |

---

## Wave 1 — 4 parallel gap-pursuer agents

### Agent G1 — session-rhythm-infra (scan items: G1, G2, G14)

**subagent_type:** `deep-research-gap-pursuer`
**description:** Gap agent G1 — session-rhythm-infra

**Prompt:**

```
You are Gap Agent G1 in Phase 3.95 of the JASON-OS MVP deep-research. Investigate session-rhythm infrastructure gaps.

## Repo roots (IMPORTANT — two repos to reference)
- Target repo (JASON-OS): <JASON_OS_ROOT>
- Source repo (SoNash, read-only reference): <SONASH_ROOT>

## Context to load first
1. <JASON_OS_ROOT>\.research\jason-os-mvp\RESEARCH_OUTPUT.md — overall research state
2. .research\jason-os-mvp\findings\D1a-rhythm-spine.md, D1b-rhythm-triggers.md, D3a-session-end-archaeology.md, D4-hidden-gaps-diff.md
3. .research\jason-os-mvp\claims.jsonl — existing claims

## Gaps to investigate

### Item G1: Session-End Pipeline Incompleteness
- SoNash has session-end skill + SESSION_CONTEXT.md at repo root; JASON-OS has neither.
- Prior research says ~2-3h port effort (was estimated 45 min, corrected in CH-C-009 to include dependency resolution: log-override.js stub, safe-fs.js verification, Phase 2 compliance review scoping).
- Investigate: In SoNash .claude/skills/session-end/SKILL.md and scripts/lib/ — what is the full dependency graph? Which scripts are SoNash-coupled (Firebase, TDMS, npm scripts) vs portable? What is the SESSION_CONTEXT.md format contract (section headers, required fields)? Produce a concrete port plan: which files copy-as-is, which need sanitization, which to stub.

### Item G2: Compaction Defense Layer — Mechanism vs Useful Output at MVP
- SoNash: pre-compaction-save.js, compact-restore.js, commit-tracker.js (all confirmed portable in prior research).
- Contrarian challenge CH-C-003: at MVP, these mechanisms read from empty state (no SESSION_CONTEXT.md yet, no .session-agents.json, no decision-save log).
- Investigate: What are all input sources these 3 hooks depend on? Which are populated at session #1 vs empty? For each empty input, what populates it — which hooks/skills elsewhere in SoNash? Is there a correct wiring ORDER for JASON-OS (e.g., SESSION_CONTEXT.md before compact-restore, else it produces nothing)? Confirm the 3 hooks are portable with zero SoNash-specific code paths (re-verify by reading the JS).

### Item G14: Portable Utility Scripts Absent
- SoNash scripts/lib/ has utility scripts JASON-OS lacks. Prior research flagged: log-override.js, validate-skip-reason.js, todos-mutations.js (covered in separate G2 agent for /todo — EXCLUDE from your scope), safe-cas-io.js, validate-paths.js.
- Investigate: Compare C:\...\sonash-v0\scripts\lib\ vs C:\...\jason-os\scripts\lib\. Enumerate every script. For each missing script: size, purpose, dependencies (does it depend on other SoNash-specific files?), and whether it's needed by hooks/skills JASON-OS has ALREADY ported. Rank by portability (easy/medium/hard) and urgency (is anything JASON-OS already has broken without it?). EXCLUDE todos-mutations.js — that's in G2 agent scope.

## Discipline
- Grep-first, Read-targeted. Don't read a 700-line file when grep can locate the relevant 20 lines. When you do Read, use offset + limit on large files.
- Summarize, don't bulk-quote. 1-2 line quotes with file:line citations beat paragraph paste.
- Cite findings with file_path:line_number so the final synthesizer can verify.
- Your own gaps do NOT recurse (Critical Rule 9). List them but don't try to fill them.

## Output
Write to: <JASON_OS_ROOT>\.research\jason-os-mvp\findings\G1-session-rhythm-infra.md

Required format (per SKILL.md §22.3):
  # G1 — Session Rhythm Infrastructure (Gap Pursuit)
  ## Summary
  ## Detailed Findings
  ### Item G1: Session-End Pipeline
  ### Item G2: Compaction Defense
  ### Item G14: Portable Utility Scripts
  ## Gaps
  ## Serendipity

Target length: 400-700 lines. Tighter is better. Concrete file paths + line cites > prose.

CRITICAL (Windows 0-byte bug, CLAUDE.md §4.15): confirm your Write succeeded by reading back the first 5 lines of the file before you finish. If it's empty, re-Write.
```

### Agent G2 — knowledge-arch (scan items: G6, G10, G15)

**subagent_type:** `deep-research-gap-pursuer`
**description:** Gap agent G2 — knowledge-arch

**Prompt:**

```
You are Gap Agent G2 in Phase 3.95 of the JASON-OS MVP deep-research. Investigate knowledge-architecture gaps: /todo skill viability, skills version-sync infrastructure, and memory portability architecture.

## Repo roots
- Target repo (JASON-OS): <JASON_OS_ROOT>
- Source repo (SoNash): <SONASH_ROOT>

## Context to load first
1. <JASON_OS_ROOT>\.research\jason-os-mvp\RESEARCH_OUTPUT.md
2. Findings: D2d-auto-memory.md, D2e-skills-loaded.md, D4-hidden-gaps-diff.md, D3b-debt-tracking.md
3. Challenges: challenges/contrarian-v1.md (esp. CH-C-005 maintenance trap, CH-C-010 memory portability), challenges/otb-v1.md (esp. CH-O-007 canonical-memory, CH-O-008 /todo stub)

## Gaps to investigate

### Item G6: /todo Skill Non-Functional
- Ported SKILL.md mandates mutation via todos-cli.js / render-todos.js / todos-mutations.js, plus .planning/todos.jsonl. None exist in JASON-OS.
- Skill listed in CLAUDE.md §7 and called by session-begin health check. Will fail on first use.
- CH-O-008 recommended STUB (30 min markdown-only) vs full port (3-4h).
- Investigate: Read C:\...\jason-os\.claude\skills\todo\SKILL.md fully. What exactly does it require? In SoNash, read the three scripts + todos.jsonl format. Produce: (a) minimal-viable stub contract (what a markdown-only /todo that satisfies SKILL.md's critical rules would look like), (b) full port dependency graph + effort estimate, (c) recommendation with rationale. Also check: what calls /todo programmatically in JASON-OS (session-begin, any hooks)? Would a stub satisfy those callers?

### Item G10: Skills Maintenance Trap
- CH-C-005 flagged #1 unaddressed risk: 32 portable skills will diverge from SoNash within weeks without sync primitive.
- SoNash has version tracking via SESSION_CONTEXT.md (v8.35 baseline, 280+ sessions of skill evolution). JASON-OS has no version columns in ported skills.
- Investigate: (a) Survey ported JASON-OS skills — do any have Document Version, Last Updated, or similar frontmatter fields? List which do/don't. (b) Read SoNash's skill-audit skill — does it have a version-tracking mechanism that could be ported? (c) Propose minimum viable sync primitive: a SKILL_INDEX.md schema with skill name, version, last-synced-date, source file path in SoNash. What's the least-effort cadence for keeping it fresh (manual vs scripted)? (d) Is there a pattern in SoNash for marking skills as "forked / diverged from original"?

### Item G15: Memory Portability Architecture
- JASON-OS auto-memory lives in ~/.claude/projects/<project-slug>/memory/ (user-local, machine-local, NOT git-tracked).
- SoNash has .claude/canonical-memory/ which IS git-tracked (memory travels with repo).
- CH-C-010: "memory portability fix is session-local, not OS-portable."
- JASON-OS just committed a .claude/canonical-memory/ with sanitized seed content (commit 1d7fc0c), adopting sonash's pattern. But the auto-memory (global dir) is still machine-local.
- Investigate: Read C:\...\sonash-v0\.claude\canonical-memory\ structure vs the global <SONASH_CLAUDE_SESSION_ROOT>\memory\. Are they sync'd? How does sonash keep them consistent (manual copy, script, hook)? Is there a post-memory-write.js or similar hook? Then propose: for a "portable Claude Code OS", what is the right architecture — commit canonical-memory + auto-copy to global (bidirectional), one-way sync, or something else? Note trade-offs (security, per-user context pollution, merge conflicts).

## Discipline
- Grep-first, Read-targeted.
- Cite file_path:line_number.
- Your own gaps do NOT recurse.

## Output
Write to: <JASON_OS_ROOT>\.research\jason-os-mvp\findings\G2-knowledge-arch.md

Format:
  # G2 — Knowledge Architecture (Gap Pursuit)
  ## Summary
  ## Detailed Findings
  ### Item G6: /todo Skill Viability
  ### Item G10: Skills Maintenance Trap
  ### Item G15: Memory Portability Architecture
  ## Gaps
  ## Serendipity

Target length: 400-600 lines. Concrete > prose.

CRITICAL (Windows 0-byte bug): verify Write by reading back first 5 lines before finishing. Re-Write if empty.
```

### Agent G3 — hooks-extraction (scan items: G3, G4)

**subagent_type:** `deep-research-gap-pursuer`
**description:** Gap agent G3 — hooks-extraction

**Prompt:**

```
You are Gap Agent G3 in Phase 3.95 of the JASON-OS MVP deep-research. Investigate the two heaviest hook gaps: UserPromptSubmit extraction and the PostToolUse tripwire web.

## Repo roots
- Target (JASON-OS): <JASON_OS_ROOT>
- Source (SoNash): <SONASH_ROOT>

## Context to load first (minimum)
1. .research\jason-os-mvp\RESEARCH_OUTPUT.md
2. Findings: D1a-rhythm-spine.md, D1b-rhythm-triggers.md, D2a-settings-hooks-statusline.md
3. Challenges excerpt: challenges/contrarian-v1.md CH-C-004 and CH-C-008 (user-prompt-handler portability + hook enforcement during exploratory phase)
4. .claude\settings.json in JASON-OS (current hook wiring — 2 event types, 4 hooks active)

## Gaps to investigate

### Item G3: user-prompt-handler.js — Extraction and Portability
- SoNash file: C:\...\sonash-v0\.claude\hooks\user-prompt-handler.js (718 LOC, confirmed).
- 6 sub-functions per prior research: runGuardrails, runFrustrationDetection, runAlertsReminder, runAnalyze (emits PRE-TASK directives), runSessionEnd (farewell detector), runMultiStepComplexity.
- CH-C-004: runAnalyze() emits directives for agents (code-reviewer, security-auditor, frontend-developer) that DON'T exist in JASON-OS. Portability was downgraded HIGH→MEDIUM.
- CH-C-008: during JASON-OS's exploratory phase (stack-TBD, sessions #1-10), mandatory hook enforcement that bypasses Claude's judgment may be inappropriate.

Investigate:
1. Read the 6 sub-functions of user-prompt-handler.js. For EACH: list external dependencies (files it reads/writes, scripts it requires, agents it references by name). Classify per sub-function: FULLY PORTABLE / PARTIALLY PORTABLE (needs edits) / NOT PORTABLE (SoNash-coupled).
2. For runAnalyze specifically: list every agent name it emits directives about. Cross-reference against C:\...\jason-os\.claude\agents\ — which exist, which don't. Can the directive table be parameterized (agent list from config file) instead of hardcoded?
3. Produce a concrete extraction plan: which sub-functions port first, how to stub runAnalyze until more agents exist, whether to phase-gate the whole hook behind a feature flag until JASON-OS workflow is stable (per CH-C-008).
4. Quantify the extraction effort: LOC to edit, new stub files needed, test surface.

### Item G4: PostToolUse Tripwire Web (9 Hooks Absent)
- SoNash PostToolUse hooks per prior audit: commit-tracker.js, compact-restore.js, governance-logger.js, loop-detector.js, post-read-handler.js, post-todos-render.js, post-write-validator.js, pre-compaction-save.js, plus user-prompt-handler (UserPromptSubmit not PostToolUse — exclude from this count).
- EXCLUDE from your scope: commit-tracker.js, compact-restore.js, pre-compaction-save.js — those are covered by G1 agent (session-rhythm). Focus on the other 5.
- Prior research claimed 5 highest-value portable. Verify.

Investigate the remaining 5 (governance-logger.js, loop-detector.js, post-read-handler.js, post-todos-render.js, post-write-validator.js):
1. For each: full portability audit. What does it do? What SoNash-specific dependencies does it have (Firebase, TDMS, firestore, npm scripts, specific agent names)? How coupled is it to the PostToolUse matcher pattern (Bash, Write, Edit, etc.)?
2. Specifically for post-write-validator.js (44KB, the biggest): is it actually 10 sub-checks as prior research claims? Which sub-checks are generic (safety, syntax) vs SoNash-specific (Firebase rules, firestore schemas)? Can it be split into a generic core + sonash-specific plugin?
3. For post-todos-render.js: depends on /todo skill (G2 agent's scope). If /todo is stubbed, does this hook still function? Can it be stubbed alongside?
4. Rank the 5 by portability effort (hours of work) × value (impact on "home feel" per prior research).

## Discipline
- grep-first, Read-targeted with offset/limit. user-prompt-handler is 718 LOC, post-write-validator is 44KB — do NOT Read them in full. Use grep to locate function boundaries, then targeted Reads.
- Summarize, don't paste. Cite file_path:line_number.
- Your own gaps do NOT recurse.

## Output
Write to: <JASON_OS_ROOT>\.research\jason-os-mvp\findings\G3-hooks-extraction.md

Format:
  # G3 — Hooks Extraction (Gap Pursuit)
  ## Summary
  ## Detailed Findings
  ### Item G3: user-prompt-handler.js Extraction
  ### Item G4: PostToolUse Tripwire Web (5 hooks in scope)
  ## Gaps
  ## Serendipity

Target length: 500-800 lines. This is the heaviest agent — budget accordingly but stay disciplined.

CRITICAL (Windows 0-byte bug): verify Write by reading back first 5 lines before finishing. Re-Write if empty.
```

### Agent G4 — governance-annotations (scan items: G5, G8, G12, G17)

**subagent_type:** `deep-research-gap-pursuer`
**description:** Gap agent G4 — governance-annotations

**Prompt:**

```
You are Gap Agent G4 in Phase 3.95 of the JASON-OS MVP deep-research. Investigate governance and annotation gaps: pre-commit agent compliance, PROACTIVELY clauses on agents, GATE/BEHAVIORAL tags on CLAUDE.md rules, and the statusline→hook bridge.

## Repo roots
- Target (JASON-OS): <JASON_OS_ROOT>
- Source (SoNash): <SONASH_ROOT>

## Context to load first
1. .research\jason-os-mvp\RESEARCH_OUTPUT.md
2. C:\...\jason-os\CLAUDE.md (current — 16 guardrails, no GATE/BEHAVIORAL tags)
3. C:\...\sonash-v0\CLAUDE.md (for comparison — to see annotation style)
4. Findings: D1b-rhythm-triggers.md, D2a-settings-hooks-statusline.md, D2c-claude-md-graph.md
5. Challenges: otb-v1.md CH-O-006 (PROACTIVELY clauses = highest-leverage 30-min action)

## Gaps to investigate

### Item G5: Pre-Commit Agent-Compliance Gate
- SoNash has 7 PreToolUse if: conditions; JASON-OS has 3 (push-block, large-file-gate, settings-guardian). Missing: pre-commit-agent-compliance (blocks commit if required agents not invoked). Firebase-specific ones (deploy-safeguard, env-guard, firestore-rules-guard) are out of scope — correctly dropped.
- Investigate: Find SoNash pre-commit-agent-compliance implementation (probably .claude/hooks/pre-commit-agent-compliance.js or similar — grep for it). What triggers it? What's the "required agents" contract — where does the list live (CLAUDE.md? config file? state file)? Does it depend on agent-tracking state (.claude/hooks/.session-agents.json)? Could it be ported without the tracking-state hook (G4's post-tool tripwire, separate agent)? Produce porting plan: dependencies, effort, whether it can meaningfully function with JASON-OS's current 8 deep-research agents + built-ins.

### Item G8: PROACTIVELY Clauses on Agents
- CH-O-006: 17 SoNash agents have PROACTIVELY self-dispatch conditions; 0 JASON-OS agents do. Described as "highest-leverage single action — 30 min, zero infra."
- JASON-OS has 8 agents (all deep-research-* + contrarian-challenger + otb-challenger + dispute-resolver).
- Investigate: Read 3-5 SoNash agent frontmatter files (look for agents with rich PROACTIVELY clauses — e.g., .claude/agents/code-reviewer.md, convergence-loop-verifier.md or similar; grep for PROACTIVELY in SoNash agents dir). Extract the clause pattern: what goes in the description field, what triggers self-dispatch, how it interacts with the agent registry. Then for each of the 8 JASON-OS agents, propose a specific PROACTIVELY clause that matches its actual function. Deliverable: concrete draft clauses for all 8 agents ready to paste into frontmatter.

### Item G12: GATE / BEHAVIORAL Annotations on CLAUDE.md Rules
- SoNash CLAUDE.md tags every rule with [GATE] (automated enforcement) or [BEHAVIORAL] (honor-based). JASON-OS has neither.
- C-021 in claims.jsonl: SoNash tags 100% of rules; JASON-OS has 0%.
- Investigate: Grep sonash CLAUDE.md for [GATE] and [BEHAVIORAL] — count, sample 5-10 examples of each. Understand the pattern: does [GATE] mean "there's a hook that blocks violation" (concrete)? What's the decision criterion? Then for each of the 16 JASON-OS CLAUDE.md guardrails (§4.1 through §4.16), classify: GATE (wired hook exists) / BEHAVIORAL (honor-only) / MIXED / NEEDS_TO_BECOME_GATE. Produce a table of 16 rows with proposed annotation + rationale.

### Item G17: Statusline → Hook Bridge
- SoNash Go-based statusline writes /tmp/claude-ctx-{session}.json (or similar) for gsd-context-monitor.js hook to read.
- JASON-OS bash statusline (statusline-command.sh) has no bridge write.
- Prior research marked this LOW priority because gsd-context-monitor.js isn't ported anyway.
- Investigate: (a) Read JASON-OS's .claude/statusline-command.sh — 30 sec read, confirm it has no bridge. (b) Read SoNash's statusline bridge write logic (grep for tmp path or bridge in statusline + hook sources). (c) Is the bridge pattern worth adopting NOW (before any consumer hook exists) as infrastructure, or defer until a consumer hook is ported? Recommendation with rationale.

## Discipline
- grep-first. These gaps are small individually — don't over-read.
- Cite file_path:line_number.
- Your own gaps do NOT recurse.

## Output
Write to: <JASON_OS_ROOT>\.research\jason-os-mvp\findings\G4-governance-annotations.md

Format:
  # G4 — Governance & Annotations (Gap Pursuit)
  ## Summary
  ## Detailed Findings
  ### Item G5: Pre-Commit Agent-Compliance Gate
  ### Item G8: PROACTIVELY Clauses (8 JASON-OS agents, draft clauses)
  ### Item G12: GATE/BEHAVIORAL Annotations (16-row table)
  ### Item G17: Statusline → Hook Bridge
  ## Gaps
  ## Serendipity

Target length: 350-600 lines. Include the concrete PROACTIVELY draft clauses and GATE/BEHAVIORAL 16-row table verbatim in output.

CRITICAL (Windows 0-byte bug): verify Write by reading back first 5 lines before finishing. Re-Write if empty.
```

---

## Wave 2 — 2 parallel gap-pursuer agents

### Agent G5 — navigation-skill-infra (scan items: G7, G9, G11, G13, G18, G20)

**subagent_type:** `deep-research-gap-pursuer`
**description:** Gap agent G5 — navigation-skill-infra

**Prompt:**

```
You are Gap Agent G5 in Phase 3.95 of the JASON-OS MVP deep-research. Investigate navigation documents, skill/team infrastructure, and small portability fixes.

## Repo roots
- Target (JASON-OS): <JASON_OS_ROOT>
- Source (SoNash): <SONASH_ROOT>

## Context to load first
1. .research\jason-os-mvp\RESEARCH_OUTPUT.md
2. Findings: D2c-claude-md-graph.md, D2e-skills-loaded.md, D4-hidden-gaps-diff.md, D3b-debt-tracking.md
3. Challenges: otb-v1.md CH-O-003 (workflow chain as product vs artifact port)

## Gaps to investigate

### Item G7: Deep-Research Phase 5 /add-debt Routing Dead-End
- Phase 5 menu includes "Route to /add-debt?" option. /add-debt skill does NOT exist in JASON-OS. Every deep-research session surfaces a dead-end.
- Investigate: Grep .claude/skills/deep-research/ for /add-debt references and hasDebtCandidates logic. What does the synthesizer set hasDebtCandidates based on? What would a minimal stub /add-debt skill look like (record debt items to a markdown file, no TDMS)? Or: is the cleaner fix to remove the Phase 5 option entirely until TDMS is ported? Recommendation with rationale.

### Item G9: Navigation Document Ecosystem Absent
- SoNash has AI_WORKFLOW.md (31KB, session-start required reading), COMMAND_REFERENCE.md (indexed skill catalog), SKILL_INDEX.md, HOOKS.md. JASON-OS has none.
- CH-O-003 reframe: these should encode PROCESS, not just catalog artifacts.
- Investigate: Read SoNash's AI_WORKFLOW.md (full file — this is the spine), COMMAND_REFERENCE.md, SKILL_INDEX.md, HOOKS.md (or .claude/HOOKS.md, wherever it lives). Extract: (a) purpose of each doc, (b) how much is SoNash-specific (stack mentions, agent lists, Firebase refs), (c) how much is portable-pattern. Produce for each: JASON-OS-tailored outline. DO NOT write the full documents — that's for the planning phase. Just outline and size estimate.

### Item G11: .claude/teams/ Coordination Layer
- SoNash has .claude/teams/ with research-plan-team.md and audit-review-team.md. JASON-OS has no teams dir.
- Deep-research skill (§Integration in SKILL.md) references research-plan-team.md as spawned via triggers when complexity is L/XL.
- Investigate: Read SoNash's .claude/teams/ files. What is the team file format (frontmatter? members? coordination pattern)? What does research-plan-team do specifically? Is it needed for JASON-OS's current /deep-research usage (we just ran 18 agents without it)? Would a minimal teams dir + research-plan-team.md port unlock anything, or is it solving a problem JASON-OS doesn't have yet?

### Item G13: .research/EXTRACTIONS.md Prior-Art Lookup
- SoNash CLAUDE.md §7 has trigger: "for build tasks, scan EXTRACTIONS.md for prior art." JASON-OS has no such file.
- Without it, no connection between research sessions.
- Investigate: Find SoNash's .research/EXTRACTIONS.md (or similar name). What's the schema (rows of prior research, links to RESEARCH_OUTPUT.md files)? How is it maintained (manual? scripted?)? For JASON-OS with just 1 completed research session (this one), is it worth seeding now, or does the primitive only earn its keep at 5+ sessions?

### Item G18: /pre-commit-fixer Skill Missing
- CLAUDE.md §4.9 says "On pre-commit failure, use /pre-commit-fixer. After 2 attempts, ask." Skill doesn't exist in JASON-OS.
- Investigate: Is /pre-commit-fixer in SoNash? Read its SKILL.md. Is it generic (language-agnostic) or SoNash-specific? Portability audit + effort estimate. If portable in ~30 min, include draft SKILL.md outline.

### Item G20: Missing .nvmrc (Node Version Management)
- SoNash pins Node 22 via .nvmrc + ensure-fnm.sh. JASON-OS has no .nvmrc. One-line fix with outsized portability benefit.
- Investigate: Confirm by Read. Read SoNash's .nvmrc and ensure-fnm.sh. Does JASON-OS need both, or just .nvmrc? Recommend exact file contents.

## Discipline
- AI_WORKFLOW.md is 31KB — extract structure with grep first, then targeted reads.
- Small items (G20) may take 2 minutes each — don't gold-plate.
- Cite file_path:line_number.
- Your own gaps do NOT recurse.

## Output
Write to: <JASON_OS_ROOT>\.research\jason-os-mvp\findings\G5-navigation-skill-infra.md

Format:
  # G5 — Navigation & Skill Infrastructure (Gap Pursuit)
  ## Summary
  ## Detailed Findings
  ### Item G7: /add-debt Routing Dead-End
  ### Item G9: Navigation Document Ecosystem
  ### Item G11: .claude/teams/ Coordination Layer
  ### Item G13: .research/EXTRACTIONS.md Prior-Art Lookup
  ### Item G18: /pre-commit-fixer Skill
  ### Item G20: .nvmrc
  ## Gaps
  ## Serendipity

Target length: 500-800 lines (6 items, varied scope).

CRITICAL (Windows 0-byte bug): verify Write by reading back first 5 lines before finishing. Re-Write if empty.
```

### Agent G6 — agentskills-feasibility (scan item: G19)

**subagent_type:** `deep-research-gap-pursuer`
**description:** Gap agent G6 — agentskills-feasibility

**Prompt:**

```
You are Gap Agent G6 in Phase 3.95 of the JASON-OS MVP deep-research. Web research: evaluate AgentSkills open-standard compatibility.

## Repo roots
- Target (JASON-OS): <JASON_OS_ROOT>
- Source (SoNash): <SONASH_ROOT>

## Context to load first
1. .research\jason-os-mvp\RESEARCH_OUTPUT.md — section on "Unconsidered Approaches"
2. Challenges: otb-v1.md CH-O-001 (AgentSkills 16-tool standard, HIGH novelty)
3. Claims: C-G1 in claims.jsonl (UNVERIFIABLE, no filesystem evidence)

## Gap to investigate

### Item G19: AgentSkills Open-Standard Compatibility
- CH-O-001 references "AgentSkills open standard published 2025-12-18" — a 16-tool cross-tool skill format. CH-O-001 noted HIGH novelty and "2-hour feasibility spike required."
- Claim C-G1: UNVERIFIABLE (no filesystem evidence, external standard).
- Research profile: web + lightweight codebase check.

Investigate (web-heavy):
1. WebSearch/WebFetch: find the AgentSkills standard specification. Likely at agentskills.dev, agentskills.org, github.com/agentskills, or an Anthropic blog post. Confirm the publication date (Dec 2025 claimed) and publisher.
2. Read the spec (or the most definitive doc available). What is the schema? What fields are required vs optional? How does it compare structurally to Claude Code's SKILL.md format (frontmatter: name, description, type, status; body: markdown with specific sections)?
3. Identify compat gaps: what would need to change to make a JASON-OS SKILL.md compliant with AgentSkills? Is it additive (more fields), subtractive (drop something), or structurally different (breaking)?
4. Which of the 16 tools claimed to support AgentSkills are relevant to JASON-OS? (Claude Code is obvious; others?)
5. Risk: is the standard stable or still draft? Adoption numbers? Is there a risk of investing in compatibility only for the standard to evolve?

Codebase-check (lightweight):
6. Pick ONE JASON-OS SKILL.md (e.g., .claude/skills/brainstorm/SKILL.md or .claude/skills/deep-research/SKILL.md) and score it against the AgentSkills spec: compliant fields, missing fields, incompatible fields. This is a feasibility sample, not a full audit.

Recommendation:
- Is a 2-hour spike to convert JASON-OS skills to AgentSkills format worthwhile?
- If yes, what are the concrete steps?
- If no, why (e.g., standard is draft, adoption is 0, compat would require breaking changes)?

## Discipline
- This is primarily a WEB profile agent. Cite URLs for every external claim.
- Time-box web research: if after 20 minutes you can't find the AgentSkills spec, report that as the finding ("could not locate primary spec; standard may not be widely published or may be misattributed").
- Don't gold-plate the codebase check — one SKILL.md comparison is enough for feasibility.
- Your own gaps do NOT recurse.

## Output
Write to: <JASON_OS_ROOT>\.research\jason-os-mvp\findings\G6-agentskills-feasibility.md

Format:
  # G6 — AgentSkills Open-Standard Feasibility (Gap Pursuit)
  ## Summary
  ## Detailed Findings
  ### Spec location & publication verification
  ### Spec contents (schema, required fields, section structure)
  ### JASON-OS SKILL.md compatibility gap
  ### Risk & stability assessment
  ### Recommendation (adopt now / spike later / pass)
  ## Gaps
  ## Serendipity

Target length: 200-400 lines. Web research is citation-heavy but low-code.

CRITICAL (Windows 0-byte bug): verify Write by reading back first 5 lines before finishing. Re-Write if empty.
```

---

## Phase 3.96 — Gap Verification (2 agents, sequential after all gap agents complete)

### GV1 — codebase-claims verification

**subagent_type:** `deep-research-verifier`
**description:** Gap verifier GV1 — codebase-claims

**Prompt outline** (expand at dispatch time):

```
You are Gap Verifier GV1 in Phase 3.96. Verify all gap-pursuit codebase claims against filesystem.

Read: .research/jason-os-mvp/findings/G1-*.md through G6-*.md.

For each claim of form "SoNash file X has feature Y" or "JASON-OS lacks Z":
  - Verify by Read/Grep against the actual filesystem.
  - Mark VERIFIED (with file:line evidence), REFUTED (with what's actually there), or UNVERIFIABLE (e.g., web claims not in codebase — cross-check with G6's citations).

Write to: .research/jason-os-mvp/findings/GV1-codebase-claims.md
Format per SKILL.md §22.4.
```

### GV2 — cross-consistency verification

**subagent_type:** `deep-research-verifier`
**description:** Gap verifier GV2 — cross-consistency

**Prompt outline:**

```
You are Gap Verifier GV2 in Phase 3.96. Cross-check gap findings against original D-agent and V-agent findings.

Read: All .research/jason-os-mvp/findings/G*.md (new gap findings) and D*.md, V*.md (original findings).

Flag any contradictions: gap findings that say the opposite of original findings; gap findings that nullify REFUTED claims (C-015, C-037) by re-introducing those errors; gap findings that conflict with each other (cross-G conflicts).

Write to: .research/jason-os-mvp/findings/GV2-cross-consistency.md
Format per SKILL.md §22.4.
```

---

## Phase 3.97 — Final Re-Synthesis (1 agent)

### Final synthesizer

**subagent_type:** `deep-research-final-synthesizer`
**description:** Phase 3.97 final re-synthesis (post-gap-pursuit mode)

**Prompt outline:**

```
You are the final re-synthesis agent. Post-gap-pursuit mode.

Read ALL files in .research/jason-os-mvp/findings/ (D-agents + V-agents + challenges + G-agents + GV-agents) and current RESEARCH_OUTPUT.md.

EDIT the report — do NOT rewrite from scratch:
- Add new sections for gap-pursuit discoveries that introduce new themes
- Update existing claims with new evidence from gap pursuit
- Incorporate gap-verification corrections (REFUTED gap claims noted, not dropped)
- Add new sources discovered during gap pursuit
- Update confidence levels where gap pursuit provided additional evidence

Update claims.jsonl:
- New claims from gap pursuit use C-G* IDs (e.g., C-G2, C-G3, ...)
- Modified existing claims retain original IDs with updated confidence

Update sources.jsonl with any new sources discovered.

Update metadata.json:
- gapFillRounds: 1
- gapAgentCount: 6
- gapClaimsAdded: [count]
- totalClaimsPostGap: [total]
- gapSources: [array of source types that produced actionable gaps]

Apply CL-standard verification to final output.

See SKILL.md §22.5 for full template.
```

---

## Phase 4 — Cross-Model Verification + Self-Audit (inline)

### Gemini cross-model pass (5 bash calls, inline)

For each claim below, invoke:
```bash
echo 'Is the following claim accurate and current as of 2026-04-15?
Provide evidence for or against.

Claim: [CLAIM_TEXT]
Context: JASON-OS portable Claude Code OS extraction from SoNash

Respond with:
- AGREE or DISAGREE
- Evidence supporting your assessment
- Confidence level (HIGH/MEDIUM/LOW)' | gemini -p
```

Claims to verify:
1. **C-023** — SoNash has 80 skills; 32 are portable to JASON-OS
2. **C-009** — `user-prompt-handler.js` `runAnalyze()` portability is HIGH → MEDIUM after cross-reference against non-existent JASON-OS agents
3. **C-039** — Auto-memory mechanism and 200-line MEMORY.md limit are Claude Code guaranteed behaviors
4. **C-031** — pr-retro skill hard gate actually produces behavioral changes (not just retros-log entries)
5. **C-G1** — AgentSkills open standard, 16-tool cross-tool skill format, published 2025-12-18

Record results in `.research/jason-os-mvp/findings/CROSS_MODEL_GEMINI.md` (my write, not an agent's).

### Self-audit (inline, T1 checks)

Per SKILL.md Phase 4 T1: completeness, citations, confidence distribution, source diversity, contradictions, challenges. If issues found, ask user: "Fix and re-audit? [Y / present as-is]".

---

## Phase 5 — Presentation + Downstream Routing (inline)

Terminal summary. Menu:
1. deepen
2. /deep-plan
3. /skill-creator
4. GSD
5. /convergence-loop for LOW claims
6. save to memory
7. view report
8. done

Post-menu: cleanup, index entry, strategy log, source reputation, MCP memory (per SKILL.md §5).

---

## Locale fix

RESUME_STATE.json `output_dir` was written by the jbell locale:
```
<JASON_OS_ROOT>\\.research\\jason-os-mvp\\
```

Correct for current (jason) locale is:
```
<JASON_OS_ROOT>\\.research\\jason-os-mvp\\
```

Both state updates are in the companion update to RESUME_STATE.json (this session's next commit).
