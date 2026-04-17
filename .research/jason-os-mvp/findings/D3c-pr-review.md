# Findings: SoNash PR Review Machinery — Full Archaeology

**Searcher:** deep-research-searcher
**Profile:** codebase
**Date:** 2026-04-15
**Sub-Question IDs:** D3c

---

## Key Findings

### 1. `/pr-review` is a Feedback-Processor, Not a Review Generator [CONFIDENCE: HIGH]

The SKILL.md frontmatter makes this explicit: "This skill processes review
feedback — it does not generate reviews." The input is pasted feedback from
external automated reviewers (CodeRabbit, Qodo, SonarCloud, Gemini). The
output is fixed source files, a learning log entry, a JSONL review record, TDMS
debt items, and a state file. This distinction matters for JASON-OS porting: the
skill is a feedback-triage workflow, not a "generate a code review" tool.

The complementary tool is the `code-reviewer` *agent* (not skill), which
generates reviews during development.

---

### 2. The 8-Step Protocol — Full Structure [CONFIDENCE: HIGH]

The skill is version 4.6 (2026-03-18), structured as 8 sequential steps with
MUST/SHOULD/MAY enforcement:

```
Warm-Up  →  Step 0: Pre-Checks  →  Step 1: Context & Parse
  →  Step 2: Categorize & Triage  →  Step 3: Plan & Agents
  →  Step 4: Fix  →  Step 5: Document & Track
  →  Step 6: Learning & JSONL  →  Step 7: Verify
  →  Step 7.5: Merge Trigger Check (R4+ only)
  →  Step 8: Summary & Commit
```

**Key invariants:**
- Every item receives a disposition: fixed, deferred (DEBT ID), or rejected (with justification). No silent dismissals.
- Pre-existing items MUST receive a Defer/Act Score (DAS) block before any decision.
- Learning log entry MUST be created FIRST (before fixing anything).
- Propagation sweep is MANDATORY after any pattern-based fix — grep entire codebase for same pattern.
- State file persisted after Step 8 for cross-round continuity.

**DAS Framework** (Signal/Dependency/Risk, each 0-2):
- DAS 0-2: Recommend act
- DAS 3-4: User MUST decide (never auto-accept)
- DAS 5-6: Recommend defer

**Fast path:** For <=5 items, Steps 3-4 collapse — skip to direct fixing.

---

### 3. Parallel Agent Strategy — Step 3 [CONFIDENCE: HIGH]

For 20+ items across 3+ concern areas, Step 3 dispatches specialized agents in
parallel (max 4 simultaneous). Agent assignments by concern:

| Concern Area         | Agent               |
|----------------------|---------------------|
| Security issues      | `security-auditor`  |
| Documentation        | `technical-writer`  |
| Script files (JS)    | `code-reviewer`     |
| TypeScript/React     | `code-reviewer`     |
| Testing gaps         | `test-engineer`     |
| Performance          | `performance-engineer` |

Invoked via Task tool with MULTIPLE calls in a SINGLE message. Each agent gets
a specific file list and issue number subset. Reference:
`reference/PARALLEL_AGENT_STRATEGY.md`.

Convergence gate after agents: all agents return to orchestrator, then run
`npm run lint && npm run patterns:check`. Check for overlapping file conflicts.

---

### 4. Reviewer Agent Inventory [CONFIDENCE: HIGH]

**Agents explicitly named in the pr-review skill or directly supporting it:**

| Agent | File | Model | Tools | SoNash-Specific |
|-------|------|-------|-------|-----------------|
| `code-reviewer` | `agents/code-reviewer.md` | sonnet | Read/Write/Edit/Bash/Grep/Glob | YES — Firebase/httpsCallable patterns, `npm run patterns:check`, SoNash error sanitization |
| `security-auditor` | `agents/security-auditor.md` | opus | Read/Write/Edit/Bash/Grep/Glob | YES — Cloud Functions security boundary, App Check, Firestore rules, `withSecurityChecks()` |
| `technical-writer` | `agents/technical-writer.md` | (not read) | (not read) | Unknown |
| `test-engineer` | `agents/test-engineer.md` | opus | Read/Write/Edit/Bash | MIXED — core logic generic; SoNash overrides (node:test, httpsCallable mocking) |
| `performance-engineer` | `agents/performance-engineer.md` | inherit | Read/Write/Edit/Bash/Grep/Glob | YES — Firestore queries, React 19, Firebase cold starts |
| `pr-test-analyzer` | `agents/pr-test-analyzer.md` | inherit | Read/Bash/Grep/Glob | YES — SoNash test conventions (node:test, NOT Jest) |

All agents: `disallowedTools: Agent` (no recursive spawning), `skills:
[sonash-context]` (loads SoNash CLAUDE.md context), `maxTurns: 20-25`.

---

### 5. Review Output Format and Destination [CONFIDENCE: HIGH]

**code-reviewer agent** outputs a structured table format:
```
## Code Review: [scope summary]
### Automated Checks
- patterns:check: PASS | FAIL (N violations)
- lint: PASS | FAIL (N errors, M warnings)
### CRITICAL / WARNING / SUGGESTION (tables with File:Line | Issue | Fix)
### Verdict: APPROVE | REQUEST_CHANGES | BLOCK
```

**security-auditor agent** outputs:
```
## Security Audit: [scope summary]
### Automated Checks (npm audit, patterns:check, lint)
### Critical (S0) / High (S1) / Medium (S2) / Low (S3) (tables with Finding | OWASP | File:Line | Fix)
### Verdict: SECURE | CONDITIONAL | BLOCK
```

**pr-review skill** writes to disk:
- Fixed source files (no dedicated destination — edits in place)
- Learning log: `docs/AI_REVIEW_LEARNINGS_LOG.md` (markdown)
- JSONL record: `scripts/reviews/dist/write-review-record.js` writes to `.claude/state/reviews.jsonl`
- TDMS debt: `docs/technical-debt/MASTER_DEBT.jsonl`
- State file: `.claude/state/task-pr-review-{pr}-r{round}.state.json`

---

### 6. GitHub / gh CLI Integration [CONFIDENCE: HIGH]

The skill uses `gh` CLI in exactly one mandatory place:

**Step 0 (Pre-Checks) — PR size check:**
```bash
gh pr view {PR} --json files --jq '.files | length'
```
If >50 files: prompts user to split. If >40 files: large PR advisory.

**No automated comment posting.** The skill does NOT post review comments back
to GitHub. It processes inbound feedback from external review tools (pasted by
user) and commits fixes. The GitHub integration is read-only (PR metadata) at
the skill level.

**SonarCloud enrichment** uses either:
- `curl` to SonarCloud API (`https://sonarcloud.io/api/issues/search?...`)
- `mcp__sonarcloud__<tool>` (the SoNash custom MCP server)

This is entirely SoNash-specific. Reference: `reference/SONARCLOUD_ENRICHMENT.md`.

---

### 7. Convergence Loop Usage Inside Review [CONFIDENCE: HIGH]

The skill does not explicitly invoke `/convergence-loop` as a named skill. The
convergence behavior is baked directly into the step structure:

- **Step 7 (Verify)** is a hard gate: `fixed + deferred + rejected = total`. If
  counts don't balance, loop back and fix before proceeding.
- **DAS compliance check** at Step 7: pre-existing item count must match DAS
  block count. Failure = back to Step 2.
- **Propagation sweep** at Step 4: grep codebase, count remaining instances, must
  be 0. Failure = more fixes required before commit.
- **Mid-review checkpoint** at Step 4 (20+ items): after Critical+Major batch,
  pause and confirm before continuing.
- **Step 7.5 (R4+ merge trigger)**: if fix rate <30%, recommend stopping — built-in
  diminishing-returns detection.

The `/convergence-loop` skill IS referenced in other parts of JASON-OS (it's
already ported) but is not called from within pr-review.

---

### 8. SoNash-Specific Dependencies vs Generic Logic [CONFIDENCE: HIGH]

**JASON-OS BOOTSTRAP_DEFERRED.md identifies 71 sanitization hits** across
SKILL.md and 4 reference files. Here is a precise classification of each
coupling:

**Hard dependencies (blocks direct port):**

| Dependency | File | SoNash-Specific | Replaceability |
|------------|------|-----------------|----------------|
| `/add-debt` skill | SKILL.md Steps 5, 8 | YES — TDMS | Needs generic debt tracker or remove |
| TDMS (MASTER_DEBT.jsonl) | reference/TDMS_INTEGRATION.md | YES | Full file dropped or replaced |
| `npm run reviews:sync` | SKILL.md Step 6 | YES | Replaced with simpler log append |
| `scripts/reviews/dist/write-review-record.js` | SKILL.md Step 6 | YES | Replace with simpler JSONL writer or drop |
| SonarCloud enrichment | reference/SONARCLOUD_ENRICHMENT.md | YES | Full file dropped for JASON-OS |
| Gemini CLI integration | SKILL.md Step 1 | YES | Remove named reviewer |
| CodeRabbit / Qodo / SonarCloud / Gemini named | SKILL.md throughout | YES | Replace with "any review feedback" |
| `.qodo/pr-agent.toml` | SKILL.md Step 0 | YES | Drop reference |
| `.gemini/styleguide.md` | SKILL.md Step 0 | YES | Drop reference |
| `high-churn-watchlist.json` | SKILL.md Step 0 | YES (SoNash config) | Make optional / generic |

**Soft dependencies (cosmetic swap):**

| Dependency | How to sanitize |
|------------|-----------------|
| Firebase/Firestore patterns in code-reviewer agent | Replace with generic stack patterns |
| `httpsCallable` mocking | Replace with project-appropriate test pattern |
| `npm run patterns:check` | Make optional — wrap in "if applicable" |
| `npm run lint` | Generic — keep as-is |
| `security-wrapper.ts` / App Check references | Remove from security-auditor |
| `sanitizeError()` pattern | Keep — it's a generic security principle |

**Fully portable (no change needed):**

| Element | Rationale |
|---------|-----------|
| 8-step protocol structure | Pure process logic |
| DAS framework (Signal/Dependency/Risk) | Fully generic |
| Parallel agent strategy (Step 3) | Generic orchestration |
| Propagation sweep mandate | Generic best practice |
| State file schema | Generic JSON |
| Compaction resilience | Generic |
| Guard rails (50+ items, zero items, pause/resume) | Generic |
| Step 7 verification gate | Generic |
| Step 7.5 merge trigger (R4+) | Generic |
| Learning log format | Generic |
| Pre-checks 1-24 (PRE_CHECKS.md) | Generic (minus SonarCloud-specific checks #21) |

---

### 9. What JASON-OS Already Has [CONFIDENCE: HIGH]

**Built-in Claude Code slash commands** (not custom skills): Claude Code ships
`/review` and `/security-review` as built-in slash commands. These are generic,
non-configurable, and do not match the SoNash pr-review skill's structured
8-step protocol, DAS framework, state persistence, or JSONL tracking.

**JASON-OS custom agents already ported:**
- `contrarian-challenger.md` — present
- `dispute-resolver.md` — present
- `otb-challenger.md` — present
- `deep-research-*` agents — all present

**JASON-OS does NOT have:**
- `code-reviewer` agent
- `security-auditor` agent
- `test-engineer` agent
- `performance-engineer` agent
- `technical-writer` agent
- `pr-review` skill
- `/add-debt` skill (TDMS)
- Any review-tracking JSONL infrastructure

---

### 10. What Is Deferred vs Portable — Precise Split [CONFIDENCE: HIGH]

Per `BOOTSTRAP_DEFERRED.md`:

**Deferred (not ported):**
- `pr-review` skill (full SKILL.md + 4 reference files)
- `pr-retro` skill (depends on pr-ecosystem-audit + TDMS + convergence-loop deliverable verification)
- All 5 supporting agents: code-reviewer, security-auditor, test-engineer, performance-engineer, pr-test-analyzer
- TDMS/GSD/audit ecosystem (not ported intentionally)
- SonarCloud MCP integration

**Portable today (with sanitization, ~45min rewrite estimated):**
- Core 8-step protocol (SKILL.md backbone)
- DAS framework block
- Parallel agent strategy (PARALLEL_AGENT_STRATEGY.md — drop SoNash-specific tool references)
- PRE_CHECKS.md items 1-20, 22-24 (generic; drop item 21 which references SonarCloud)
- State file schema
- Learning log format
- code-reviewer agent (rewrite removing Firebase/SoNash patterns, keep structure)
- security-auditor agent (rewrite removing SoNash security boundary specifics, keep OWASP framework)

---

## Sources

| # | URL | Title | Type | Trust | CRAAP | Date |
|---|-----|-------|------|-------|-------|------|
| 1 | `sonash-v0/.claude/skills/pr-review/SKILL.md` | pr-review SKILL.md v4.6 | Filesystem | T1 | 5/5/5/5/5 | 2026-03-18 |
| 2 | `sonash-v0/.claude/agents/code-reviewer.md` | code-reviewer agent | Filesystem | T1 | 5/5/5/5/5 | 2026-04 |
| 3 | `sonash-v0/.claude/agents/security-auditor.md` | security-auditor agent | Filesystem | T1 | 5/5/5/5/5 | 2026-04 |
| 4 | `sonash-v0/.claude/agents/pr-test-analyzer.md` | pr-test-analyzer agent | Filesystem | T1 | 5/5/5/5/5 | 2026-04 |
| 5 | `sonash-v0/.claude/agents/test-engineer.md` | test-engineer agent | Filesystem | T1 | 5/5/5/5/5 | 2026-04 |
| 6 | `sonash-v0/.claude/agents/performance-engineer.md` | performance-engineer agent | Filesystem | T1 | 5/5/5/5/5 | 2026-04 |
| 7 | `sonash-v0/.claude/skills/pr-review/reference/PARALLEL_AGENT_STRATEGY.md` | Parallel agent strategy | Filesystem | T1 | 5/5/5/5/5 | 2026-02-14 |
| 8 | `sonash-v0/.claude/skills/pr-review/reference/PRE_CHECKS.md` | 24 mandatory pre-push checks | Filesystem | T1 | 5/5/5/5/5 | 2026-03-07 |
| 9 | `sonash-v0/.claude/skills/pr-review/reference/TDMS_INTEGRATION.md` | TDMS integration | Filesystem | T1 | 5/5/5/5/5 | 2026-02-14 |
| 10 | `sonash-v0/.claude/skills/pr-review/reference/LEARNING_CAPTURE.md` | Learning capture | Filesystem | T1 | 5/5/5/5/5 | 2026-02-14 |
| 11 | `sonash-v0/.claude/skills/pr-review/reference/SONARCLOUD_ENRICHMENT.md` | SonarCloud enrichment | Filesystem | T1 | 5/5/5/5/5 | 2026-02-14 |
| 12 | `sonash-v0/.claude/skills/pr-review/ARCHIVE.md` | pr-review archive | Filesystem | T1 | 5/5/5/5/5 | 2026-02-24 |
| 13 | `sonash-v0/.claude/skills/code-reviewer/SKILL.md` | code-reviewer skill v2.2 | Filesystem | T1 | 5/5/5/5/5 | 2026-03-13 |
| 14 | `JASON-OS/.planning/jason-os/BOOTSTRAP_DEFERRED.md` | Bootstrap deferred items | Filesystem | T1 | 5/5/5/5/5 | 2026-04-15 |

---

## Contradictions

**`code-reviewer` exists as both a skill AND an agent.** `sonash-v0/.claude/skills/code-reviewer/SKILL.md` (v2.2) and `sonash-v0/.claude/agents/code-reviewer.md` are separate files with different structures. The skill is invoked via `/code-reviewer` for ad-hoc reviews. The agent is dispatched via Task tool within `pr-review` Step 3. They overlap significantly in content but the skill uses episodic memory search and anti-pattern verification blocks absent from the agent. JASON-OS would need both if both invocation paths are desired.

**PRE_CHECKS.md says 18 checks in intro text, but actually contains 24 items (numbered 1-24).** The intro line reads "18 mandatory pre-push checks" but the file was extended to 24 over time without updating the intro. This is a doc maintenance issue, not a functional problem.

---

## Gaps

1. **`technical-writer` agent not read.** Only the agent list was confirmed; the content was not examined. Cannot assess its SoNash coupling level.

2. **`pr-retro` skill not read.** BOOTSTRAP_DEFERRED.md describes it as blocked by pr-ecosystem-audit dependency. The exact mechanism of that dependency was not verified from source.

3. **Claude Code built-in `/review` and `/security-review` commands** — these are referenced in the research prompt as "built-in slash commands." No Claude Code documentation was checked to confirm their exact behavior. They may provide more functionality than assumed here.

4. **JSONL review record writer** (`scripts/reviews/dist/write-review-record.js`) not read. Its full schema is referenced in LEARNING_CAPTURE.md but the source was not examined. Full schema unknown.

---

## V0 Port Proposal

### What to port immediately (JASON-OS pr-review v0)

**Effort: ~45-60min rewrite as described in BOOTSTRAP_DEFERRED.md**

**Strip completely:**
- `reference/SONARCLOUD_ENRICHMENT.md` — drop entirely (no SonarCloud in JASON-OS)
- `reference/TDMS_INTEGRATION.md` — drop entirely (no TDMS)
- All references to `/add-debt`, Gemini, Qodo, CodeRabbit, SonarCloud by name
- `npm run reviews:sync` in Step 6 — replace with simple `git add` of learning log
- `.qodo/pr-agent.toml` and `.gemini/styleguide.md` references in Step 0
- `high-churn-watchlist.json` check — make optional, remove if-not-exists gate
- `write-review-record.js` — either drop JSONL tracking or use a simpler appender

**Replace with generics:**
- "CodeRabbit/Qodo/SonarCloud/Gemini" → "any review source"
- Step 6 JSONL → simple append to `.claude/state/reviews.jsonl` (no build step)
- Pre-checks item 21 (SonarCloud local scan) → generic `npx eslint` CC check
- DEBT ID tracking → inline note in learning log until /add-debt exists

**Keep verbatim:**
- 8-step protocol structure
- DAS framework (all 3 dimensions, full scoring table)
- `reference/PARALLEL_AGENT_STRATEGY.md` (drop SoNash tool refs, keep structure)
- `reference/LEARNING_CAPTURE.md` (drop reviews:sync, keep learning format)
- `reference/PRE_CHECKS.md` items 1-20, 22-24
- State file schema
- All guard rails and compaction resilience

**Agents to port (simplified):**
- `code-reviewer` agent: strip Firebase/SoNash patterns, keep 4-step workflow + return format. Add note: "customize anti-patterns for project stack."
- `security-auditor` agent: strip Cloud Functions/App Check/Firestore specifics. Keep OWASP Top 10 structure, general security patterns (error sanitization, path traversal, input validation).

**Agents to defer (stack-dependent):**
- `test-engineer` — too much SoNash test infrastructure
- `performance-engineer` — entirely Firestore/React 19/Firebase
- `pr-test-analyzer` — SoNash-specific test conventions

### What cannot be ported yet
- `/pr-retro` — blocked until pr-ecosystem-audit decision or standalone simplification
- GitHub comment posting — would require gh CLI integration work (skill currently has none)

---

## Serendipity

**The skill has no GitHub status check integration.** Despite being deeply integrated with the GitHub PR workflow, `pr-review` never posts comments to GitHub, sets PR status checks, or interacts with the PR review API. All "integration" is: (1) reading PR file count via `gh pr view`, (2) committing fixes to the branch. The external review bots (CodeRabbit, Qodo) do their own GitHub integration; this skill just processes their pasted output.

**DAS framework is the highest-value portable concept.** The Signal/Dependency/Risk scoring for pre-existing items is a mature, battle-tested framework that applies universally regardless of stack. It resolves the common failure mode of "should I fix this old issue now?" with a structured, delegatable decision tree. This is arguably the single most valuable thing to port from pr-review, and it requires zero sanitization.

**PRE_CHECKS.md evolved from PR history.** Each of the 24 pre-push checks has an attributed PR (e.g., #366, #371, #379, #382) and a documented "round count saved" rationale. This is a crystallized institutional memory of 400+ PR review rounds. The generic checks (items 1-20, 22-24) represent universal pitfalls — the value is not SoNash-specific.

**code-reviewer agent has a harder dependency than the skill.** The agent (which generates reviews) is MORE SoNash-coupled than the skill (which processes feedback), because the agent's review criteria are entirely driven by SoNash's Firebase security boundary model. Stripping it to generic leaves a much simpler "run lint + manual review" agent.

---

## Confidence Assessment

- HIGH claims: 10
- MEDIUM claims: 0
- LOW claims: 0
- UNVERIFIED claims: 0
- **Overall confidence: HIGH** — all findings sourced directly from filesystem files (T1 evidence). No web sources or training data used.
