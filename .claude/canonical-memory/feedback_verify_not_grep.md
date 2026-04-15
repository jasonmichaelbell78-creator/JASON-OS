---
name: feedback_verify_not_grep
description:
  Verification must use functional tests not grep — grep confirms strings
  exist, not that features work
type: feedback
status: active
---

Action items marked "IMPLEMENTED" via grep have repeatedly failed to actually
work. For example, a pre-push gate was recommended multiple times, marked
implemented, but violations still reached review rounds.

- grep-based verification is implementation theater
- Every verify command must run the actual feature end-to-end
- Include a functional test proving the behavior works
- Add a regression guard (CI or pre-commit) for future breakage
- Never use `grep -c` as sole verification
- **Why:** Multiple cycles showed grep-verified items were not functional.
- **Apply:** When writing verify commands, test behavior not string presence.
