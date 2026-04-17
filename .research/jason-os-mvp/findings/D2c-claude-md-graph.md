# Findings: CLAUDE.md Ecosystem Map — SoNash vs JASON-OS

**Searcher:** deep-research-searcher
**Profile:** codebase
**Date:** 2026-04-15
**Sub-Question IDs:** D2c

---

## Key Findings

### 1. SoNash CLAUDE.md: Section-by-Section Anatomy [CONFIDENCE: HIGH]

SoNash CLAUDE.md v6.0 (updated 2026-04-12) is 192 lines long.
File: `sonash-v0/CLAUDE.md:1-192`.

**Purpose statement** (lines 9-13): Explicitly declares itself "minimal (~135 lines) to
reduce token waste." Situational guidance is exiled to on-demand reference docs.
This is the founding design principle: CLAUDE.md = always-on skeleton, not a reference
encyclopedia.

**Section 1 — Stack Versions** (lines 17-27): A pinned version table for Next.js,
React, Firebase, Tailwind, Zod. Opens with `DO NOT flag these as invalid - they're
newer than your training cutoff` — a pre-emptive guard against AI hallucination about
library versions. Purpose: facts that must survive every turn without re-lookup.

**Section 2 — Security Rules** (lines 29-40): Three rules, each tagged with an
enforcement annotation in backtick inline code:
- `[GATE: patterns:check + Cloud Functions runtime]`
- `[GATE: Cloud Functions runtime enforcement]`
- `[BEHAVIORAL: code-reviewer check only]`

This is a critical design pattern: rules are annotated with HOW they are enforced
(automated gate vs. behavioral-only). Not every rule can be automated; the annotation
tells the AI reader which rules have teeth and which rely on AI honesty.

**Section 3 — Architecture** (lines 43-47): One paragraph. Repository pattern, a file
path (`lib/firestore-service.ts`), and two directives. Intentionally sparse — a
pointer, not a tutorial.

**Section 4 — Behavioral Guardrails** (lines 49-74): 16 numbered rules under a
`[!CAUTION]` admonition. These are stack-agnostic, framed as non-negotiable. No
enforcement annotations — these are purely behavioral. They were copied verbatim into
JASON-OS CLAUDE.md v0.1.

**Section 5 — Critical Anti-Patterns** (lines 76-103): A 6-row table with `[GATE]`
annotations on every row. Followed by three pointer links to on-demand reference docs:
- `docs/agent_docs/CODE_PATTERNS.md` — "consult only when writing scripts or hooks"
- `docs/agent_docs/SECURITY_CHECKLIST.md` — "Check BEFORE writing scripts..."
- `docs/agent_docs/PRE_GENERATION_CHECKLIST.md` — "consult before writing new code"

Then three app-specific one-liners. The structure is: compressed rule + where to go
for depth.

**Section 6 — Coding Standards** (lines 109-121): Five bullets, each with an
inline enforcement annotation (`[GATE: tsconfig strict + CI build]`,
`[BEHAVIORAL: code-reviewer]`, `[BEHAVIORAL: no automated enforcement]`).
Followed by a two-sentence pointer to `CODING_TOOLS_REFERENCE.md`.

**Section 7 — Agent/Skill Triggers** (lines 123-169): Two tables.
- PRE-TASK table (15 rows): trigger → action → tool type. Labeled
  `[BEHAVIORAL: no automated enforcement]`.
- POST-TASK table (4 rows): labeled `[GATE: pre-commit hook + code-reviewer]`.

Post-task IS gatekept by the `pre-commit-agent-compliance.js` hook. Pre-task is not
automated — it relies entirely on AI compliance with the trigger table.

Footer prose references: teams directory, 34 specialized agents beyond the table, and
a pointer to `AGENT_ORCHESTRATION.md`.

**Section 8 — Reference Docs** (lines 171-180): A 5-row table:
| Doc | Purpose |
|-----|---------|
| AI_WORKFLOW.md | Session startup, navigation |
| ROADMAP.md | Planned vs completed features |
| SESSION_CONTEXT.md | Current sprint, recent context |
| docs/agent_docs/AGENT_ORCHESTRATION.md | Agent parallelization, teams |
| docs/agent_docs/CONTEXT_PRESERVATION.md | Compaction safety, state persistence |

These are the only docs CLAUDE.md officially declares as on-demand references. The
actual reference ecosystem is larger (see Finding 3).

---

### 2. Sub-CLAUDE.md Files: None Exist in SoNash [CONFIDENCE: HIGH]

`find /c/Users/jbell/.local/bin/sonash-v0 -name "CLAUDE.md" -not -path "*/node_modules/*"`
returned exactly one result: the root `CLAUDE.md`. File: `b3` bash output.

There are no subdirectory CLAUDE.md files in SoNash. The layering is achieved
through explicit pointers in the root CLAUDE.md, not through directory-scoped
CLAUDE.md files. JASON-OS similarly has only one CLAUDE.md.

---

### 3. The Full Reference Doc Graph [CONFIDENCE: HIGH]

CLAUDE.md Section 8 is the official reference table (5 docs). But the full
reachable graph — following all intra-document links — is significantly larger.

**Tier 1: Declared in CLAUDE.md Section 8** (always loaded on demand)
- `AI_WORKFLOW.md` — session startup, navigation, deliverable audit procedure
- `ROADMAP.md` — milestone priorities
- `SESSION_CONTEXT.md` — current sprint, recent completions, blockers
- `docs/agent_docs/AGENT_ORCHESTRATION.md` — parallelization, teams, capacity
- `docs/agent_docs/CONTEXT_PRESERVATION.md` — compaction safety, state persistence

**Tier 2: Linked from CLAUDE.md body text** (on-demand, triggered by task type)
- `docs/agent_docs/CODE_PATTERNS.md` — 180+ patterns distilled from 347 AI reviews
  (CLAUDE.md S5, line 93)
- `docs/agent_docs/SECURITY_CHECKLIST.md` — pre-write checklist for scripts
  (CLAUDE.md S5, line 96)
- `docs/agent_docs/PRE_GENERATION_CHECKLIST.md` — behavioral checklist before
  generating code (CLAUDE.md S5, line 100)
- `docs/agent_docs/CODING_TOOLS_REFERENCE.md` — LSP and CLI tool preferences
  (CLAUDE.md S6, line 121)

**Tier 3: Linked from AI_WORKFLOW.md** (the navigation hub that Section 8 points to)
- `docs/GLOBAL_SECURITY_STANDARDS.md` — MANDATORY before coding (AI_WORKFLOW.md:97)
- `docs/audits/multi-ai/COORDINATOR.md` — session counter, health dashboard
- `docs/audits/AUDIT_TRACKER.md` — 9-category audit threshold tracking
- `ARCHITECTURE.md` — system design
- `DEVELOPMENT.md` — dev procedures, git hooks, CI/CD
- `.claude/HOOKS.md` — all hooks documented
- `.claude/CROSS_PLATFORM_SETUP.md` — Windows CLI and Web setup
- `.claude/REQUIRED_PLUGINS.md` — plugin installation
- `docs/PR_WORKFLOW_CHECKLIST.md` — PR implementation workflow
- `docs/AI_REVIEW_PROCESS.md` — CodeRabbit review processing
- `docs/SLASH_COMMANDS_REFERENCE.md` — slash command reference
- `docs/DOCUMENTATION_STANDARDS.md` — doc tiers and templates

**Tier 4: Implicit reference from agent ecosystem**
- `.research/EXTRACTIONS.md` — 343 extraction candidates from 33 sources (referenced
  in CLAUDE.md S7 PRE-TASK trigger: "Scan .research/EXTRACTIONS.md for prior art")
- `.claude/agents/*.md` — 58 agent definitions
- `.claude/skills/*/SKILL.md` — 81 skill files
- `.claude/teams/*.md` — 2 team definitions (audit-review-team, research-plan-team)

**Total reachable docs**: ~25 named documents plus the full skill/agent/team corpus.
CLAUDE.md itself declares 5; the actual graph is 5x larger when you follow one hop.

---

### 4. Enforcement Graph: Which CLAUDE.md Sections Have Hooks [CONFIDENCE: HIGH]

SoNash uses inline enforcement annotations (`[GATE: X]` vs `[BEHAVIORAL: Y]`) as a
first-class design pattern. The mapping:

| CLAUDE.md Section | Rule Type | Enforcement Mechanism |
|---|---|---|
| S2 Rule 1 (no direct writes) | GATE | `patterns:check` (session-start.js runs it) + Cloud Functions runtime |
| S2 Rule 2 (App Check) | GATE | Cloud Functions runtime |
| S2 Rule 3 (rate limiting) | BEHAVIORAL | code-reviewer agent check only |
| S5 (anti-patterns table) | GATE | `npm run patterns:check` on every SessionStart |
| S6 TypeScript strict | GATE | `tsconfig strict + CI build` |
| S6 Components/Styling/State | BEHAVIORAL | code-reviewer agent |
| S7 PRE-TASK triggers | BEHAVIORAL | no automated enforcement |
| S7 POST-TASK triggers | GATE | `pre-commit-agent-compliance.js` hook |

Key hooks implementing CLAUDE.md enforcement:
- `session-start.js` — runs `patterns:check` (enforces S5 anti-patterns)
- `pre-commit-agent-compliance.js` — enforces S7 POST-TASK agent requirements
- `post-write-validator.js` — references CLAUDE.md S2 (Firestore direct write
  guard) and S3 (architecture) in its error messages (lines 266, 742, 760)
- `block-push-to-main.js` — enforces S4 guardrail #7 (no push without approval)
- `settings-guardian.js` — enforces S4 guardrail #14 (never set SKIP_REASON
  autonomously)
- `firestore-rules-guard.js` — enforces S2 security rules

The `PRE_GENERATION_CHECKLIST.md` explicitly states it "derives from CLAUDE.md
Section 4 behavioral guardrails" and assigns proxy metrics and enforcement levels to
each item. This is the bridge layer: CLAUDE.md states the rule, the reference doc
operationalizes it.

---

### 5. The "Intentional Feel" — Design Patterns That Make SoNash CLAUDE.md Work [CONFIDENCE: HIGH]

Five structural choices make SoNash CLAUDE.md feel like an authored system rather
than an accumulation of notes:

**A. Explicit enforcement tagging**: Every rule that can be automated is tagged
`[GATE: mechanism]`. Rules that cannot be automated are tagged `[BEHAVIORAL: method]`.
No rule is left ambiguous about whether a machine or an AI is holding it. JASON-OS
currently has no `[GATE]` or `[BEHAVIORAL]` annotations anywhere.

**B. The compression discipline**: The purpose statement declares a 135-line target.
Depth is deliberately offloaded to Tier 2/3 docs. The CLAUDE.md itself says "consult
only when writing scripts" before linking to CODE_PATTERNS.md. This is active token
management — the always-on doc is kept shallow so depth is triggered contextually.

**C. Stack truth pinning**: Section 1 exists entirely to prevent AI hallucination
about library versions. The `DO NOT flag these as invalid` instruction is the hook.
Without this, an AI trained on older data would confidently "correct" correct version
numbers. JASON-OS S1 is `TBD`.

**D. Session lifecycle owned in CLAUDE.md S7**: The trigger tables make the session
contract visible: what fires before a task, what fires after. The separation into
PRE-TASK / POST-TASK with enforcement labels (`[BEHAVIORAL]` vs `[GATE]`) tells the
AI reader exactly which promises the environment will keep and which it must keep
itself.

**E. Version history and evolution**: CLAUDE.md's footer cites version 6.0 and links
to `docs/SESSION_HISTORY.md`. This signals the doc is living and managed — not static
boilerplate. JASON-OS v0.1 has no version history link.

---

### 6. JASON-OS Current State: What Is Present [CONFIDENCE: HIGH]

JASON-OS CLAUDE.md v0.1 (`/c/Users/jbell/.local/bin/JASON-OS/CLAUDE.md:1-108`):

- Sections 1-3: Skeleton placeholders (`_TBD_`)
- Section 4: Full guardrail set (16 rules) — copied from SoNash v6.0
- Section 5: Partial anti-pattern table (5 rows, missing Test mocking row)
- Section 5: No pointers to CODE_PATTERNS.md, SECURITY_CHECKLIST.md, PRE_GENERATION_CHECKLIST.md
- Section 6: Stub (language-agnostic defaults, no enforcement annotations)
- Section 7: PRE-TASK only (5 triggers vs SoNash 15); no POST-TASK table; no agent team references
- Section 8: `_TBD_`

JASON-OS `.claude/` structure:
- 9 skills (vs 81 in SoNash)
- 8 agents (vs 58 in SoNash)
- 5 hooks (vs 29 in SoNash)
- 0 teams (vs 2 in SoNash)
- 0 reference docs in `docs/agent_docs/` (none created)
- 0 `AI_WORKFLOW.md` / `SESSION_CONTEXT.md` / `ROADMAP.md`
- settings.json: 3 hooks (block-push, large-file-gate, settings-guardian) vs SoNash's 15+ configured hooks

---

### 7. Delta Table: JASON-OS vs SoNash CLAUDE.md Graph [CONFIDENCE: HIGH]

| Component | SoNash | JASON-OS | Gap |
|---|---|---|---|
| CLAUDE.md S1 Stack versions | Pinned table, anti-hallucination guard | `_TBD_` | No stack yet — not a bug, but no framework for when to populate |
| CLAUDE.md S2 Security | 3 rules with `[GATE]`/`[BEHAVIORAL]` tags | `_TBD_` | Missing enforcement annotation pattern entirely |
| CLAUDE.md S3 Architecture | Repo pattern + file path | `_TBD_` | Missing |
| CLAUDE.md S4 Guardrails | 16 rules | 16 rules (identical) | No gap |
| CLAUDE.md S5 Anti-Patterns | 6-row table with `[GATE]` + 3 on-demand doc pointers | 5-row table (no Test mocking), no pointers | Missing enforcement tags; missing doc pointers |
| CLAUDE.md S6 Coding Standards | Inline `[GATE]`/`[BEHAVIORAL]` tags + CODING_TOOLS_REFERENCE link | Stub, no tags, no link | Missing enforcement annotations; missing tools reference |
| CLAUDE.md S7 PRE-TASK | 15 triggers (5 skill, 4 agent, 3 team, 3 other) | 5 triggers (skill only) | Missing: POST-TASK table, agent triggers, team references, prior art scan |
| CLAUDE.md S7 POST-TASK | 4 triggers with `[GATE: pre-commit hook]` | Absent | Entire POST-TASK table missing |
| CLAUDE.md S8 Reference Docs | 5 declared docs (navigates to Tier 3 ecosystem) | `_TBD_` | No reference doc ecosystem exists |
| AI_WORKFLOW.md | Full session startup guide, navigation map | Absent | No session startup document |
| SESSION_CONTEXT.md | Session-to-session handoff (v8.35, updated each session) | Absent | No session context file |
| ROADMAP.md | Feature roadmap | Absent | No roadmap file |
| docs/agent_docs/ | 11 reference docs | Absent | Entire reference doc layer missing |
| .research/EXTRACTIONS.md | 343 candidates, prior-art lookup system | Absent | No knowledge base |
| Hooks (SessionStart) | session-start.js runs patterns:check + MCP + remote check | check-mcp-servers.js only | Missing: patterns check, compact restore, context check |
| Hooks (PreToolUse) | 5 hooks: push guard, commit compliance, deploy guard, env guard, settings guard | 3 hooks: push guard, large-file-gate, settings guard | Missing: pre-commit-agent-compliance, deploy-safeguard, firestore guard |
| Hooks (PostToolUse) | post-write-validator, commit-tracker, track-agent-invocation, decision-save-prompt | None | Entire PostToolUse layer missing |
| Hooks (PreCompact) | pre-compaction-save | None | Missing |
| Skills | 81 | 9 | 72 skills missing (code-reviewer, session-end, debug, audit suite, etc.) |
| Agents | 58 | 8 | 50 agents missing (code-reviewer, security-auditor, explore, plan, etc.) |
| Teams | 2 (audit-review, research-plan) | 0 | Teams layer absent |
| Enforcement annotations | `[GATE]`/`[BEHAVIORAL]` on every rule | None | Design pattern entirely absent |

---

## Sources

| # | File Path | Content | Type | Trust | Date |
|---|---|---|---|---|---|
| 1 | `sonash-v0/CLAUDE.md` | Root CLAUDE.md v6.0, all 8 sections | filesystem | HIGH | 2026-04-12 |
| 2 | `sonash-v0/AI_WORKFLOW.md` | Session startup guide v2.0, full navigation hub | filesystem | HIGH | 2026-02-23 |
| 3 | `sonash-v0/.claude/hooks/session-start.js` | SessionStart hook implementation | filesystem | HIGH | 2026-04 |
| 4 | `sonash-v0/.claude/hooks/pre-commit-agent-compliance.js` | POST-TASK gate hook | filesystem | HIGH | 2026-04 |
| 5 | `sonash-v0/.claude/hooks/post-write-validator.js` | PostToolUse validator, CLAUDE.md S2/S3 refs at lines 266, 742, 760 | filesystem | HIGH | 2026-04 |
| 6 | `sonash-v0/.claude/HOOKS.md` | Hooks documentation v2.0 | filesystem | HIGH | 2026-02-23 |
| 7 | `sonash-v0/.claude/settings.json` | All configured hooks, 15+ entries | filesystem | HIGH | 2026-04 |
| 8 | `sonash-v0/docs/agent_docs/AGENT_ORCHESTRATION.md` | Agent parallelization reference v1.0 | filesystem | HIGH | 2026-02-10 |
| 9 | `sonash-v0/docs/agent_docs/CONTEXT_PRESERVATION.md` | Compaction safety reference v1.0 | filesystem | HIGH | 2026-02-10 |
| 10 | `sonash-v0/docs/agent_docs/CODE_PATTERNS.md` | Code patterns reference v4.2 | filesystem | HIGH | 2026-02-26 |
| 11 | `sonash-v0/docs/agent_docs/SECURITY_CHECKLIST.md` | Security checklist v1.3 | filesystem | HIGH | 2026-03-12 |
| 12 | `sonash-v0/docs/agent_docs/PRE_GENERATION_CHECKLIST.md` | Behavioral checklist v1.1 | filesystem | HIGH | 2026-03-14 |
| 13 | `sonash-v0/docs/agent_docs/CODING_TOOLS_REFERENCE.md` | CLI/LSP tools reference v1.0 | filesystem | HIGH | 2026-04-12 |
| 14 | `sonash-v0/.claude/teams/audit-review-team.md` | Team definition v2.0 | filesystem | HIGH | 2026-04-14 |
| 15 | `sonash-v0/.claude/teams/research-plan-team.md` | Team definition v1.0 | filesystem | HIGH | 2026-03-24 |
| 16 | `sonash-v0/docs/agent_docs/SKILL_AGENT_POLICY.md` | Skill/agent usage policy v1.2 | filesystem | HIGH | 2026-02-23 |
| 17 | `sonash-v0/.research/EXTRACTIONS.md` | Extraction candidates index, 343 entries | filesystem | HIGH | 2026-04 |
| 18 | `JASON-OS/CLAUDE.md` | Root CLAUDE.md v0.1 | filesystem | HIGH | 2026-04-15 |
| 19 | `JASON-OS/.claude/settings.json` | JASON-OS hook configuration | filesystem | HIGH | 2026-04-15 |

---

## Contradictions

None. SoNash and JASON-OS are clearly in a parent-child relationship. JASON-OS
CLAUDE.md v0.1 explicitly acknowledges it is a "sanitized extraction from SoNash
CLAUDE.md v6.0." The gaps are intentional bootstrap gaps, not contradictions.

One tension worth noting: JASON-OS CLAUDE.md S4 guardrail #9 says "On pre-commit
failure, use `/pre-commit-fixer`" but JASON-OS has no `pre-commit-fixer` skill.
JASON-OS also references `/session-end` and `/pr-review` as "deferred" in the footer
note but has no session-end skill. These are forward references to things that don't
exist yet.

---

## Gaps

- `SESSION_CONTEXT.md` in SoNash was too large to read fully (>10,000 tokens).
  The first 40 lines were read. Its internal structure (sections: current sprint,
  next goals, blockers, recent completions) was not fully mapped.
- `docs/GLOBAL_SECURITY_STANDARDS.md` in SoNash was not read — it is Tier 3
  (reached via AI_WORKFLOW.md), and its content was sufficiently described by
  AI_WORKFLOW.md.
- The full 29-hook SoNash hook inventory was not individually read. Five hooks were
  read; the rest were named from directory listing and HOOKS.md.
- SoNash `.claude/skills/` has 81 entries. The skills not ported to JASON-OS were
  not individually audited for portability — this is a separate sub-question.

---

## Serendipity

**The enforcement annotation pattern (`[GATE]` vs `[BEHAVIORAL]`) is the most
underrated design element in SoNash CLAUDE.md.** It makes the CLAUDE.md honest:
instead of claiming every rule is enforced, it precisely marks which rules have
automated teeth and which rely on AI self-compliance. This meta-transparency probably
reduces AI drift because the AI can distinguish "I will be caught" from "I'm on my
honor." JASON-OS has zero enforcement annotations — its rules have no declared
enforcement level, which means every rule implicitly reads as `[BEHAVIORAL]` even
when hooks exist to enforce it. Adding `[GATE]` annotations to JASON-OS S4 guardrails
7 (push guard hook), 9 (pre-commit hook), and S5 anti-patterns (settings-guardian,
large-file-gate) would immediately improve the document's precision without adding
content.

**The S7 PRE-TASK trigger `.research/EXTRACTIONS.md` lookup** (SoNash CLAUDE.md
line 133) is a knowledge-continuity mechanism: every build task begins with "scan
prior art." JASON-OS has no equivalent. This is the gap that would accumulate the
fastest — without it, every new thing gets built from scratch rather than reusing
extracted patterns from previous research.

---

## Confidence Assessment

- HIGH claims: 7
- MEDIUM claims: 0
- LOW claims: 0
- UNVERIFIED claims: 0
- Overall confidence: HIGH

All findings are grounded in direct filesystem reads of both codebases. No web
search was needed. Every citation points to a specific file with line numbers
where the evidence was observed.
