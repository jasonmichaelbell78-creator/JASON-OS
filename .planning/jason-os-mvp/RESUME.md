# Foundation — Resume Pointer

**Status (2026-04-17):** Layer 0+ complete and merged. Layer 0 is the next
concrete step.

This file exists so future-me can pick up the thread after a context clear
without re-reading the full conversation history. Treat PLAN.md as the plan
of record; this is just the "where we are" bookmark.

---

## Where we are

| Field | Value |
|---|---|
| Branch | `bootstrap-41726` (off `main` @ `1eb0479`) |
| Previous branch | `startup-41526` (squash-merged via PR #2, remote + local deleted) |
| `main` tip | `1eb0479 feat(foundation): Layer 0+ complete + SonarCloud baseline cleanup (#2)` |
| Deep-plan state | `.claude/state/deep-plan.jason-os-mvp.state.json` (gitignored) — `current_phase: phase-5-executing-layer-0-next` |
| Resume skill | `/deep-plan jason-os-mvp` (recovers from state file + skips completed phases) |

## What's done

**Step 1 + Step 2 + Layer 0+ (all 10 items) + SonarCloud baseline + Layer 0+ audit PASS.**

The squash-merged PR #2 collapsed 30 branch commits into one `main` commit
(`1eb0479`); the per-item SHAs are preserved in the deep-plan state file's
`execution_progress.completed` tree for traceability.

Layer 0+ highlights (full detail in PLAN.md + state file):
- 8 agents gained PROACTIVELY clauses (0a, G4)
- `.nvmrc` = 22 (0b)
- 5 SKILL.md files stripped of SoNash-only `write-invocation.ts` refs (0c)
- CLAUDE.md §4 annotated (1 GATE + 1 MIXED + 14 BEHAVIORAL + 3 NEEDS_GATE) (0d)
- 9 skills got AgentSkills `compatibility` + `metadata.version` fields (0e)
- skill-audit refreshed from SoNash 41526 (roundtrip no-op — validated port logic) (0f)
- PR review wired: Qodo GitHub App + SonarCloud workflow (0g, SHA-pinned)
- Husky scaffold — pre-commit (gitleaks) + pre-push (escalation-gate + block-main) (0h)
- Pattern registry seeded from CLAUDE.md §5 (0i)
- CLAUDE.md §1 Stack + §2 Security filled (§3 stays deferred per D4) (0j)

SonarCloud baseline cleanup (10 findings):
- 3 security hotspots documented + Marked as Safe in UI
- 7 code smells fixed (2 CC refactors + 3 low-prio + semgrep image pin + L65)
- Duplication blocker resolved by deleting `sanitize-error.js` (zero consumers;
  `.cjs` is now canonical)
- S7637 fix: `sonarqube-scan-action` SHA-pinned to `0303d6b62e310685c0e34d0b9cde218036885c4d`
- Action deprecation swap: `sonarcloud-github-action` → `sonarqube-scan-action`

## What's next — Layer 0 (in order)

1. **0.1 `/todo` full port (D9)** — port 3 scripts from SoNash 41526:
   - `scripts/planning/todos-cli.js`
   - `scripts/planning/render-todos.js`
   - `scripts/planning/todos-mutations.js`
   Port-agent dispatched (D17). Read via `git show 41526:<path>`. Pre-analysis
   required (MI-1) → 3 rows in PORT_ANALYSIS.md. Hard deps already present:
   `scripts/lib/{safe-fs.js, sanitize-error.cjs, parse-jsonl-line.js}`.
   Commit target: `feat(todo): full port of 3 scripts per D9`.
   Done-when: `/todo` invokable end-to-end, test item persists across session.

2. **0.2 `/add-debt` stub (D10)** — new `.claude/skills/add-debt/SKILL.md`
   (~60 lines, stub only). Commit target: `feat(skills/add-debt): minimal
   stub per D10`.

3. **Layer 0 audit checkpoint (D29)** — manual code-reviewer pass; verify
   done-when; confirm PORT_ANALYSIS.md has 3 todo rows + commit SHAs.

4. **Step 3: MI-6 migration** — once `/todo` works, migrate PLAN.md
   Post-Foundation Deferrals into `/todo` backlog; PLAN.md section becomes a
   1-line pointer.

After that: Layer 1 prereq (hooks/lib copy), Layer 1 (SESSION_CONTEXT + session-end
+ 3 hook wirings), audit, Step 4 pre-push mini-phase, Step 5 validation session,
gated Layers 2/3/4 per D34, Step 6 handoff to `/brainstorm sync-mechanism`.

## Outstanding user actions

1. **SonarCloud S7637 Mark as Fixed** — URL:
   https://sonarcloud.io/project/security_hotspots?id=jasonmichaelbell78-creator_JASON-OS
   Rationale to paste: "Pinned to commit SHA 0303d6b62e310685c0e34d0b9cde218036885c4d
   per S7637; tag kept as trailing comment for readability."

2. **SonarCloud Automatic Analysis — disable** if the workflow is still
   hitting exit 3 on `main`: https://sonarcloud.io/project/configuration?id=jasonmichaelbell78-creator_JASON-OS&analysisMode=GitHubActions
   — pick GitHub Actions, save, re-run the workflow check on the merge commit.

## To resume after context clear

1. `/deep-plan jason-os-mvp` — skill recovers from the state file, skips all
   completed phases, and surfaces the next concrete action (Layer 0 item 0.1).
2. If the skill doesn't pick up the state file, read `PLAN.md` (Layer 0
   section) and `.claude/state/deep-plan.jason-os-mvp.state.json`
   (`execution_progress.next_concrete_action`) manually.

## References

- [PLAN.md](./PLAN.md) — full implementation plan (Post-Foundation Deferrals
  live at the bottom until MI-6 migrates them into `/todo`)
- [HANDOFF.md](./HANDOFF.md) — execution order + user-action previews
- [DECISIONS.md](./DECISIONS.md) — 38 decisions + 6 meta-instructions
- [PORT_ANALYSIS.md](./PORT_ANALYSIS.md) — MI-1 ledger (Step 2 notes + 0f rows
  + Layer 0+ audit record)
- `.claude/state/deep-plan.jason-os-mvp.state.json` — authoritative execution
  state (gitignored; this file is the git-tracked mirror of its essentials)
