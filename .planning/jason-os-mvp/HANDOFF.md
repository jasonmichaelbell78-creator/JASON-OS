# JASON-OS Foundation — Execution Handoff

**Date approved:** 2026-04-16
**Branch:** `startup-41526`
**Route:** Split execution (D17) — Layer 0+ manual in main session; Layers 0/1/Step-4 ports dispatched to port-agents
**Approval mode:** Staged (D34) — firm layers approved end-to-end; Layers 2/3/4 re-approve per-layer at engagement

---

## Inputs

- [DIAGNOSIS.md](./DIAGNOSIS.md) — context, prior work, strategic open questions, caveats
- [DECISIONS.md](./DECISIONS.md) — 38 decisions, 6 meta-instructions, Layer 0+ list, open items, caveats
- [PLAN.md](./PLAN.md) — full implementation plan
- [PORT_ANALYSIS.md](./PORT_ANALYSIS.md) — *(created at Step 1; MI-1 ledger)*
- State: `.claude/state/deep-plan.jason-os-mvp.state.json` *(local-only; gitignored)*

---

## Execution Order (firm commitment)

| # | Step / Layer | Mode | User-action required? |
|---|---|---|---|
| 1 | Initialize `PORT_ANALYSIS.md` | Main session | No |
| 2 | Auto-discover SoNash `skill-audit` feature branch | Main session | ⚠️ Confirm branch name before pull (0f prerequisite) |
| 3 | Layer 0+ (10 items) + Layer 0 (2 items) — interleaved | Layer 0+ manual; Layer 0 port-agent dispatched | ⚠️ Multiple — see below |
| 4 | Audit after Layer 0+ / Layer 0 | Main session | Review audit report |
| 5 | MI-6 migration (Post-Foundation Deferrals → `/todo`) | Main session (uses `/todo` which landed in 0.1) | No |
| 6 | Layer 1 prereq (4 `hooks/lib` files) | Port-agent dispatched | No |
| 7 | Layer 1 (5 items: SESSION_CONTEXT, session-end port, 3 hook wirings) | Port-agent dispatched + main-session settings edits | No |
| 8 | Audit after Layer 1 | Main session | Review audit report |
| 9 | Step 4 — Pre-Push Mini-Phase (`pr-review` + `pre-commit-fixer` ports) | Port-agent dispatched | No |
| 10 | Audit after pre-push mini-phase | Main session | Review audit report |
| 11 | **Step 5 — End-to-End Validation Session + Retro** | User-driven | ⚠️ Run a real session; subjective feels-like-home feedback |
| — | *Gate: user decides per-layer engagement for 2/3/4* | — | ⚠️ Decision |
| (12-14) | Layers 2/3/4 — *each re-approves at engagement* | Mixed | ⚠️ Per-layer approval |
| 15 | Step 6 — Handoff to `/brainstorm sync-mechanism` | Skill invocation | Ready when firm (or all) layers complete |

---

## User-Action Steps Preview

These come up during execution. Per memory `feedback_user_action_steps.md`, each will be PROMPTED when reached — not silently assumed.

| When | Action |
|------|--------|
| Step 2 | Confirm SoNash `skill-audit` feature branch name before pull |
| 0f (Layer 0+) | Pull SoNash branch; may require session restart after skill-audit refresh (per memory `feedback_agent_hot_reload.md`) |
| 0g (Layer 0+) | Sign up for SonarCloud, connect JASON-OS repo |
| 0g (Layer 0+) | Install Qodo GitHub App on JASON-OS repo |
| 0g (Layer 0+) | Create GitHub secret `SONAR_TOKEN` |
| 0h (Layer 0+) | `npm install` after husky scaffold commit |
| 0h (Layer 0+) | Install gitleaks (`winget install Gitleaks.Gitleaks` on Windows) |
| Step 5 | Run a real work session using Foundation features; give subjective feels-like-home feedback; participate in retro |
| Per gated layer | Re-approve Layer 2 / 3 / 4 engagement |

---

## Resume Protocol (if interrupted)

1. Read state file: `.claude/state/deep-plan.jason-os-mvp.state.json`
2. Re-invoke: `/deep-plan jason-os-mvp` — skill recovers from matching state file, skips completed phases
3. Check `PORT_ANALYSIS.md` for per-file port status if resuming mid-layer

---

## Invocation Tracking

Per memory `feedback_skills_in_plans_are_tool_calls.md`, `/deep-plan` is a skill invocation. The skill's standard tracking script is `scripts/reviews/write-invocation.ts`, which is **SoNash-specific and will be stripped from JASON-OS in Layer 0+ item 0c.** No JASON-OS equivalent exists.

**Tracking for this deep-plan invocation** is captured in:
- `.claude/state/deep-plan.jason-os-mvp.state.json` (phases, batches, decisions, timings)
- This HANDOFF.md (route, approval, execution order)
- Foundation plan artifacts themselves

---

## Completion Checklist (for end of execution)

Before declaring Foundation complete:

- [ ] All firm-layer steps landed (per execution order)
- [ ] `PORT_ANALYSIS.md` has a row for every ported file with commit SHA
- [ ] MI-6 migration complete: Post-Foundation Deferrals section in PLAN.md is a 1-line pointer to `/todo` backlog
- [ ] Step 5 end-to-end validation session done + retro captured in state file
- [ ] User decision on each gated layer (engage / defer)
- [ ] Gated layers that were engaged: complete with their audits
- [ ] Step 6 handoff executed: `/brainstorm sync-mechanism` invoked

---

## Next Tool Action (to begin execution)

Execute **Step 1** (initialize `PORT_ANALYSIS.md`) → **Step 2** (auto-discover skill-audit branch).

This plan is complete. Execution begins when you say go.
