---
name: feedback_code_review_patterns
description:
  Code review and PR workflow learnings — rejection policy, description
  quality, bot sequencing
type: feedback
status: active
---

- Never reject items as "pre-existing" — always present fix-or-track options
- PR descriptions must be detailed and narrative — context, per-change
  details, testing, scope
- Create PR AFTER session close-out so review bots see final diff
- Review bot sequencing: commit all rounds locally before pushing
- **Why:** Reviewers (whichever bots are configured) use PR description to
  understand intent. Sparse descriptions produce worse reviews.
- **Apply:** Before creating PRs, check description quality. Before pushing,
  verify all review rounds are committed.
