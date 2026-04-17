# Parallel Agent Strategy (Step 3)

<!-- prettier-ignore-start -->
**Document Version:** 1.0 (JASON-OS port v0.1)
**Last Updated:** 2026-04-17
**Status:** ACTIVE
**Lineage:** SoNash `pr-review/reference/PARALLEL_AGENT_STRATEGY.md` v1.0 → JASON-OS port
<!-- prettier-ignore-end -->

Detailed guidance for parallel agent execution when processing 20+ review
items.

## When to Parallelize

Trigger: 20+ items spanning 3+ concern areas (security, scripts,
documentation, tests, etc.). Below that threshold the orchestration
overhead exceeds the speedup.

## Step 1 — Group issues by concern area

```
Security Issues:      [1, 5, 12]   → security-focused agent
Documentation Issues: [3, 8]       → technical-writer agent
Script Files:         [2, 4, 6]    → code-reviewer agent (scripts)
TypeScript Files:     [7, 9-11]    → code-reviewer agent (TS/React)
```

> **Foundation note (JASON-OS v0):** `code-reviewer`, `technical-writer`,
> and `security-focused` are example role labels — JASON-OS Foundation
> ships only `general-purpose` plus the deep-research agent suite. Read the
> v0 caveat at the bottom of this file before invoking these by name; for
> now, dispatch `general-purpose` with role-specific prompts.

## Step 2 — Create parallel batches

- Batch by file type OR concern area (whichever produces fewer batches)
- Maximum 4 parallel agents at once (avoid context overload)
- Each agent gets: a specific file list + the issue numbers it owns + a
  pointer to this skill so it speaks the same triage vocabulary

## Step 3 — Launch agents in parallel

Use the Task tool with MULTIPLE invocations in a SINGLE message:

```
Agent 1: security-focused reviewer
- Prompt: "Fix security issues [1, 5, 12] in files: <list>
  Issues: SSRF vulnerability, timeout validation, ..."

Agent 2: code-reviewer
- Prompt: "Fix code-quality issues [2, 4, 6] in files: <list>
  Issues: Regex precedence, exclusion gap, ..."

Agent 3: technical-writer
- Prompt: "Fix documentation issues [3, 8] in file: SKILL.md
  Issues: Shell redirection order, code fence syntax, ..."
```

## Step 4 — Collect and verify results

- All agents return to the orchestrator when complete
- Run project verification (`npm run lint`, `npm run test`, or equivalent)
- Check for any merge conflicts in overlapping files

## Parallel Execution Benefits

| Metric     | Sequential        | Parallel (4 agents) |
| ---------- | ----------------- | ------------------- |
| Speed      | N issues × T time | ~N/4 × T time       |
| Accuracy   | Context fatigue   | Fresh context each  |
| Expertise  | Generalist        | Domain specialists  |
| Throughput | ~20 items/session | ~80+ items/session  |

## When NOT to Parallelize

- Issues have dependencies (fix A before B)
- All issues in a single file (one agent is sufficient)
- User requests sequential processing
- Critical security issues (need focused, single-threaded attention)

## Notes for JASON-OS v0

JASON-OS Foundation does not yet ship a `code-reviewer` agent — that's a
post-Foundation deferral (Layer 4 candidate). Use whatever review-style
agent the host project has available, or fall back to single-threaded
fixing if no specialized agents exist.
