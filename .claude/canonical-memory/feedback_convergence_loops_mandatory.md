---
name: feedback_convergence_loops_mandatory
description:
  Every pass of significant work must loop internally until converged.
  Shortcuts cascade.
type: feedback
status: active
---

Every pass of significant work MUST use internal convergence loops. Do NOT
default to single-pass work.

**Why:** In prior work, skipping loops cascaded into 5 compounding errors:
skipped loops entirely, proposed loops without internal loops, dropped
end-to-end verification pass, single-pass state saving without verification,
misdiagnosed errors and used --no-verify. User: "when you start doing things
like this it begins to cascade."

**How to apply:** Every pass loops internally (min 2 iterations). Default
disposition for claims is VERIFY, not TRUST. Verify state saves captured
everything. Verify diagnoses before acting. SLOW DOWN when noticing shortcuts.
