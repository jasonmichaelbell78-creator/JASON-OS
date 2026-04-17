# Auto Memory - jason-os

## User

- [Communication preferences](user_communication_preferences.md) — Concise
  responses, batch questions 5-8, delegation pattern, push protocol, two-locale
  awareness
- [Expertise profile](user_expertise_profile.md) — Node.js/scripting/tooling
  expert, frontend needs guidance, solo developer
- [Decision authority](user_decision_authority.md) — What Claude decides
  (naming, implementation) vs what user retains (architecture, security, scope)

## Feedback

- [Convergence loops mandatory](feedback_convergence_loops_mandatory.md) — Every
  significant pass must loop internally until converged. Shortcuts cascade.
- [No pre-existing rejection](feedback_no_preexisting_rejection.md) — Never
  dismiss PR review items as pre-existing. Always present fix-or-track options.
- [Execution failure recovery](feedback_execution_failure_recovery.md) —
  Stop-diagnose-confirm before retrying. No blind retries or destructive
  shortcuts.
- [Verify not grep](feedback_verify_not_grep.md) — Verification must use
  functional tests not grep. Grep confirms strings exist, not that features
  work.
- [Parallel agents for impl](feedback_parallel_agents_for_impl.md) — Use
  parallel agents with convergence loops for implementation, not
  single-threaded work.
- [Agent teams learnings](feedback_agent_teams_learnings.md) — Explore agents
  are read-only, idle floods, token cost 3-7x, team sizing, subagent vs team
  rules.
- [Code review patterns](feedback_code_review_patterns.md) — PR description
  quality, rejection policy, review bot sequencing, commit rounds before
  pushing.
