# Dimension: Security

## Posture

This is a doc-and-skill template repo, not a service. The threat surface is correspondingly narrow: there are no servers, no databases, no auth flows, no external API calls in the shipped code, and no long-running processes.

**One Python script** is shipped (`scripts/smart_search.py`) — not read in detail in this dimension pass; flagged for content-eval.

**No CI security pipeline.** No `.github/workflows/`, no Gitleaks, Semgrep, CodeQL, dependency review, Scorecard, SonarCloud, or Qodo configuration. For a public MIT-licensed template that ships executable Python and is intended to be cloned + run on operator machines, this is a meaningful gap.

**No secrets are present in repo.** Verified by repomix's built-in security check (reports "No suspicious files detected"). MCP authentication tokens are documented as living outside the repo.

**File-write surface in setup skill.** `setup/SKILL.md` writes to user-supplied vault path. Mitigations present in skill prose: validate parent-dir exists, do a test-write before populating, refuse to proceed if write fails. No path-traversal sanitization beyond "expand `~` first" — a malicious vault path string isn't a real concern (operator supplies their own), but worth noting.

## Findings

| ID    | Severity | Finding                                                                                                       |
| ----- | -------- | ------------------------------------------------------------------------------------------------------------- |
| SEC-1 | Low      | No CI security pipeline. Public template with executable Python; minimum bar would be Gitleaks + Dependabot.  |
| SEC-2 | Info     | `.claude/settings.json` ships empty `{}`. No hook surface to harden, but also no hook-level guardrails.       |
| SEC-3 | Info     | `smart_search.py` not yet code-reviewed in this pass — content-eval will catch it.                            |

## Band

**Healthy (62)** — narrow threat surface offsets missing CI. Score reflects "appropriate for an instruction-template repo," not "production-grade."
