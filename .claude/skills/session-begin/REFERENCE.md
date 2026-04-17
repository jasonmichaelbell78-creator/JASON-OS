<!-- prettier-ignore-start -->
**Document Version:** 1.0
**Last Updated:** 2026-04-15
**Status:** ACTIVE
<!-- prettier-ignore-end -->

# Session Begin Reference

Supporting reference material for the session-begin skill. This content is
informational — consult during the session, not executed as part of the
pre-flight checklist.

---

## Skill Routing

For the canonical skill/agent trigger table, see **CLAUDE.md Section 7**.
Quick reference:

| Situation                    | Skill/Agent                 |
| ---------------------------- | --------------------------- |
| Creative exploration         | `brainstorm` skill          |
| Thorough planning            | `deep-plan` skill           |
| Domain/technology research   | `deep-research` skill       |
| Exploring unfamiliar code    | `Explore` agent             |
| Multi-step implementation    | `Plan` agent                |
| PR code review feedback      | `/pr-review` skill          |
| Retro on a merged PR         | `/pr-retro` skill           |
| Multi-step task tracking     | Use tasks to track progress |

---

## Code Review Handling

When external code review feedback arrives (any origin — bot, reviewer, CI
linter), always route through `/pr-review`. Ad-hoc processing causes gaps:
items get silently dismissed, patterns don't propagate, learnings don't
accumulate.

---

## Anti-Pattern Awareness

For the full anti-pattern list, see **CLAUDE.md Section 5**.

Key patterns to keep in mind:

- **Read before edit** — always read files before attempting to edit
- **Regex performance** — avoid greedy `.*`; use bounded `[\s\S]{0,N}?`
- **exec() with /g** — `/g` flag REQUIRED on regex used in replace loops
- **Path traversal** — `/^\.\.(?:[\\/]|$)/.test(rel)`, not `startsWith('..')`
- **Error sanitization** — use `scripts/lib/sanitize-error.cjs` before logging

---

## Planning Awareness

- Check any active plans before starting new work
- Align new work with project roadmap if one exists
