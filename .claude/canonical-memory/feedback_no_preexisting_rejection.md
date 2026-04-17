---
name: feedback_no_preexisting_rejection
description:
  Pre-existing is not a valid rejection reason in PR reviews — always present
  fix-or-track options to the user
type: feedback
status: active
---

Never dismiss PR review items as "pre-existing." This applies regardless of
how many codebase-wide instances exist.

**Why:** User corrected this multiple times in prior PR review rounds. "Too
many to fix" is not a rejection — it's an effort-estimation question for the
user.

**How to apply:** When triaging a review item that exists beyond this PR's
scope, present the user with: (a) Fix now + effort estimate, or (b) Track as
tech-debt. Never auto-dismiss based on origin or scale.
