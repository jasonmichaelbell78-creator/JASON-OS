# Dimension: Test Infrastructure

## What ships

**Nothing executable.** No `tests/`, `test_*.py`, `pytest.ini`, `package.json`, no CI test workflow.

The repo is a Markdown template + one Python utility (`smart_search.py` — content-eval will look inside). Skills are prose, not code; "testing" them means running them in a Claude Code session against a real vault.

## Why this is acceptable for the shape

- The deliverable is a calibrated set of instructions. Behavior is verified by the operator across real sessions, not by unit tests.
- The author explicitly grounds the rules in "lived-in for over a hundred sessions against real client work and a public platform build." That's the test suite.
- Comparable repos in the same April-2026 wave (Karpathy LLM Wiki, ADAM, claudia) ship the same pattern — markdown + skills, no automated tests.

## Where it would matter if added

- `setup/SKILL.md` does file writes and could regression-test against a fixture vault.
- `smart_search.py` is the one piece of code that could carry a test.
- No version tagging / release process means there's no checkpoint where "the system as-of-X works."

## Findings

| ID     | Severity | Finding                                                                                          |
| ------ | -------- | ------------------------------------------------------------------------------------------------ |
| TEST-1 | Info     | No automated tests. Acceptable for a prose-instruction template; would matter at any scale.      |
| TEST-2 | Info     | No release/version checkpoint. Operators cloning today vs. six months from now get different state. |

## Band

**Healthy (60)** — the shape doesn't demand tests, but absence of any version pin or fixture means it scores below "Excellent." Appropriate floor for a template repo.
