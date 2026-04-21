# D2 — Code / PR / GH Cluster Inventory for /migration

**Sub-question:** SQ-D2-code-pr-gh (Phase 1 deep-research)
**Scope:** 7 SoNash skills in the code-review / PR-pipeline / GitHub-ops cluster.
**Goal:** Identify which skills /migration should CALL during Phase 6 (Prove),
which are incompatible with v1's local-only posture (D29), and deep-dive
`pre-commit-fixer` (expected high relevance to Phase 5 transformation).
**Depth:** L1 (SKILL.md read, file:line citations).

---

## Summary

All 7 skills are SoNash-local (live under
`<SONASH_ROOT>\.claude\skills\`). Only **one skill
(`pre-commit-fixer`)** is a direct structural fit for /migration's active
transformation phase (Phase 5) because /migration v1 is **local-only, no remote
PR creation, no network** (D29). The remaining six skills split into two bands:

- **Post-migration candidates (Phase 6 Prove, advisory only):**
  `code-reviewer` — offline, behavioral-only, safe to invoke against the
  migration diff as a quality gate before the user hand-commits. (See
  `code-reviewer\SKILL.md:38-40, 98-146`.)
- **Incompatible with v1 (network / external service coupled):** `pr-review`,
  `pr-retro`, `gh-fix-ci`, `github-health`, `sonarcloud` — all require gh CLI
  auth, GitHub REST/Actions API, or `SONAR_TOKEN`. /migration v1 explicitly
  MUST NOT invoke these per BRAINSTORM §5 Q2 + D29.

**Brainstorm seed `/pr-review` is NOT a Phase 6 integration point.** It
processes *external reviewer output* (CodeRabbit, Qodo, SonarCloud, Gemini) and
requires a live PR — structurally impossible in local-only mode. It remains
relevant as **downstream-only**: after the user manually pushes the migration
branch and opens a PR, they may then invoke `/pr-review`. /migration should
*mention* `/pr-review` as a next step in its Phase 7 handoff message but
**must not call it**.

**Counts:**

- Skills inventoried: **7**
- D29-compat distribution: **1 works-offline** (pre-commit-fixer) /
  **1 mixed** (code-reviewer — offline but suggests `npm run lint/test`) /
  **5 needs-network** (pr-review, pr-retro, gh-fix-ci, github-health,
  sonarcloud).
- Phase 6 call candidates: **0 hard dependencies**, **1 advisory optional**
  (code-reviewer via Task agent).
- Phase 5 deep-integration: **1** (pre-commit-fixer — see §"Pre-commit-fixer
  Deep Dive").

---

## Skill Integration Table

| Skill                | Purpose                                                                                  | Network dep                        | /migration phase  | Integration role                                                                 | Citations                                                   |
| -------------------- | ---------------------------------------------------------------------------------------- | ---------------------------------- | ----------------- | -------------------------------------------------------------------------------- | ----------------------------------------------------------- |
| `code-reviewer`      | Ad-hoc code-review subagent for Next.js/TS/Firebase; pattern & security checklist        | None (local lint/test only)        | **Phase 6 Prove** | Optional advisory Task-agent against migration diff SHA range                     | `code-reviewer\SKILL.md:5-9, 38-40, 42-59, 98-146, 225-236` |
| `pr-review`          | 8-step protocol to process external reviewer feedback (CodeRabbit/Qodo/SonarCloud)       | **Heavy** (gh CLI, reviewer feeds) | **Not v1**        | Handoff only — mention in Phase 7 summary after user pushes                      | `pr-review\SKILL.md:1-9, 97-115, 177-199, 478-482`          |
| `pr-retro`           | Retrospective analysis of a merged PR's review cycle                                     | **Heavy** (`gh pr list`, JSONL)    | **Not v1**        | None — post-merge only                                                            | `pr-retro\SKILL.md:1-13, 70-73`                             |
| `gh-fix-ci`          | Inspect PR checks with `gh`, pull failing Actions logs, plan fix                          | **Heavy** (gh, GH Actions API)     | **Not v1**        | None — /migration doesn't push or open PRs                                        | `gh-fix-ci\SKILL.md:1-11, 35-73`                            |
| `github-health`      | 7-phase GH platform health (alerts, CI, deps, config, releases, insights, PRs)           | **Heavy** (gh + REST API scopes)   | **Not v1**        | None                                                                              | `github-health\SKILL.md:1-8, 22-27, 77-80`                  |
| `sonarcloud`         | Fetch/sync/report SonarCloud issues to TDMS; decrypts `SONAR_TOKEN`                      | **Heavy** (SonarCloud API)         | **Not v1**        | None                                                                              | `sonarcloud\SKILL.md:1-9, 48-64`                            |
| `pre-commit-fixer`   | Diagnose & fix `.git/hook-output.log` failures; classify → fix → report → confirm       | None (fully local)                 | **Phase 5**       | **PRIMARY integration** — /migration Phase 5 commits *will* trigger hook fails   | `pre-commit-fixer\SKILL.md:1-8, 60-90, 103-112, 237-247`    |

---

## D29 Compatibility Matrix (works-offline / mixed / needs-network)

D29 (BRAINSTORM §3): /migration v1 is **local-only**. It MUST NOT call remote
APIs, MUST NOT push, MUST NOT open PRs. Network-coupled skills are out-of-band.

| Skill              | Offline | Mixed | Network-required | Coupling evidence                                                                                                      |
| ------------------ | ------- | ----- | ---------------- | ---------------------------------------------------------------------------------------------------------------------- |
| `pre-commit-fixer` | YES     |       |                  | Reads local `.git/hook-output.log`, writes `.claude/tmp/pre-commit-fixer-state.json`; zero `gh`/HTTP (`SKILL.md:60-76, 242-243`) |
| `code-reviewer`    |         | YES   |                  | Offline checklist + `npm run lint/test` (`SKILL.md:225-236`). No `gh`/HTTP. Classed "mixed" only because it invokes local build tools. |
| `pr-review`        |         |       | YES              | `gh pr view {PR} --json files` (`SKILL.md:97-99`); Qodo/SonarCloud feed parsing (`SKILL.md:1-8, 177`)                    |
| `pr-retro`         |         |       | YES              | `gh pr list --state merged` (`SKILL.md:70-72`)                                                                          |
| `gh-fix-ci`        |         |       | YES              | `gh auth status`, `gh pr checks`, `gh run view --log`, `gh api` (`SKILL.md:35-73`)                                       |
| `github-health`    |         |       | YES              | MUST check `gh auth status` scopes (`SKILL.md:22-27, 77-80`)                                                             |
| `sonarcloud`       |         |       | YES              | Requires `SONAR_TOKEN`, calls SonarCloud REST API (`SKILL.md:48-64`)                                                     |

**Distribution: 1 / 1 / 5.**

**Qodo refs:** `pr-review` references `.qodo/pr-agent.toml` suppression
categories (`SKILL.md:114-115`) — further evidence it is downstream/external
and not a v1 call target.

**SONAR_TOKEN refs:** `sonarcloud\SKILL.md:50-53` requires decrypt via
`scripts/secrets/decrypt-secrets.js`. Local memory confirms token **not yet
configured**, which doubly rules out v1 use.

---

## Pre-Commit-Fixer Deep-Dive (Phase 5 Integration Shape)

### Why Phase 5 /migration will trigger it

Per D29 and brainstorm §5 Q2, /migration v1 performs **active local
transformation**: file moves, content rewrites, hook path fixes, and eventually
`git add` + `git commit`. SoNash's pre-commit hook runs eight+ gate
categories (see `scripts/config/hook-checks.json`, referenced from
`SKILL.md:76`) including ESLint, oxlint, pattern compliance, propagation
checks, doc headers, cross-doc deps, doc-index, skill validation, debt/schema
validation, tsc, and prettier/lint-staged. A bulk migration commit is
**statistically guaranteed** to trip one or more. Per CLAUDE.md guardrail #9
(`sonash-v0\CLAUDE.md:74-76`), the correct response is to route to
`pre-commit-fixer` — not to re-commit blindly.

### Invocation shape for /migration

1. /migration Phase 5 ends with `git commit` on the migration branch.
2. On hook failure, /migration **must not** re-commit or `--no-verify`.
3. /migration hands control to `/pre-commit-fixer` via the Skill tool with
   category context from `.git/hook-output.log`
   (`pre-commit-fixer\SKILL.md:60-76`).
4. `pre-commit-fixer` classifies errors against the 12-category table
   (`SKILL.md:77-91`), presents the warm-up (`SKILL.md:103-112`), gates on user
   confirmation (Critical Rule 1, `SKILL.md:22-24`), executes fixes inline or
   via subagents (`SKILL.md:125-163`), and re-commits only after user "go"
   (`SKILL.md:165-187`).
5. On success, control returns to /migration Phase 6 (Prove).

### Key constraints /migration must honor

- **Never set SKIP_REASON autonomously** — CLAUDE.md #14 + `SKILL.md:25-27`.
  /migration cannot bypass gates by forcing `SKIP_REASON`; must route through
  this skill.
- **2-attempt cap per category** (`SKILL.md:32-33`) — /migration should not
  loop indefinitely; after 2 failures on the same category it must escalate to
  the user.
- **Regression detection** (`SKILL.md:202-205`) — if /migration's fix
  introduces *new* errors, the skill flags and stops. /migration's design must
  accept this as a legitimate halt point.
- **State location** — `.claude/tmp/pre-commit-fixer-state.json`
  (`SKILL.md:242-243`). /migration's own state directory (per D27 seed) should
  not collide; this is in SoNash's `.claude/tmp/`, not JASON-OS's
  `.research/migration-skill/`.
- **Scope** — works-offline per D29. No gh, no API, no token. Safe for v1.
  (`SKILL.md` entire workflow; only external commands are `git`, `npm`, and the
  Agent tool.)
- **Session-end coupling** — appends to `hook-runs.jsonl` (`SKILL.md:244-245`).
  /migration should expect this side-effect on SoNash state.

### Classifier table summary (what /migration can expect to hit)

From `SKILL.md:77-91`, the categories most likely triggered by a bulk
filesystem + content migration commit:

- **Document headers** (inline fix, cheap) — migration likely moves/renames
  docs.
- **Cross-doc dependencies** (inline fix) — missing `git add` on referenced
  files.
- **Doc index stale** (inline fix, `npm run docs:index`) — adding/removing
  docs invalidates `DOCUMENTATION_INDEX.md`.
- **Pattern compliance** (subagent) — if migration touches scripts.
- **ESLint / oxlint / tsc** (subagent) — if migration touches JS/TS.
- **Prettier / lint-staged** (inline, auto-fixed by hook itself) — low risk,
  usually just re-stage.

`Secrets (gitleaks)` is the one category that MUST halt (`SKILL.md:81`) — if
the migration payload accidentally contains secrets, the workflow aborts and
asks the user. /migration must surface this explicitly.

### Integration recommendation

/migration Phase 5 post-commit hook failure handler should:

```
on hook-fail:
  Skill({ skill: "pre-commit-fixer" })   # not a Task agent call
  # control returns here only after user confirms re-commit or aborts
  if skill returned aborted: escalate to user via Phase 5 halt
  else: proceed to Phase 6
```

**Do not** treat `pre-commit-fixer` as callable from inside a subagent —
its critical rules (#1, #2) require interactive user confirmation. /migration
must keep it on the main thread.

---

## Sources

All paths absolute.

- `<SONASH_ROOT>\.claude\skills\code-reviewer\SKILL.md`
  (lines 1-9 metadata, 38-40 scope exclusion, 42-59 subagent dispatch
  pattern, 98-146 anti-pattern gate, 225-236 commands)
- `<SONASH_ROOT>\.claude\skills\pr-review\SKILL.md`
  (lines 1-9 metadata, 32-46 scope, 97-99 gh CLI dep, 114-115 Qodo coupling,
  177 multi-source reviewers, 478-482 integration)
- `<SONASH_ROOT>\.claude\skills\pr-retro\SKILL.md`
  (lines 1-13, 28-36, 70-72 `gh pr list`)
- `<SONASH_ROOT>\.claude\skills\gh-fix-ci\SKILL.md`
  (lines 1-11 metadata, 16-24 scope, 35-73 gh workflow steps)
- `<SONASH_ROOT>\.claude\skills\github-health\SKILL.md`
  (lines 1-8, 22-27 critical rules, 60-70 modes, 77-80 token-scope check)
- `<SONASH_ROOT>\.claude\skills\sonarcloud\SKILL.md`
  (lines 1-12 metadata, 37-45 modes, 48-64 prerequisites incl. SONAR_TOKEN)
- `<SONASH_ROOT>\.claude\skills\pre-commit-fixer\SKILL.md`
  (lines 1-8 metadata, 21-36 critical rules, 60-90 steps 1-2, 103-112 warm-up,
  125-163 fix execution, 165-205 report/recommit, 237-247 integration)
- `<SONASH_ROOT>\CLAUDE.md` (lines 74-76 guardrail #9
  routing to pre-commit-fixer; line 90 guardrail #14 SKIP_REASON ban)
- `<SONASH_ROOT>\scripts\config\hook-checks.json`
  (canonical check list referenced by pre-commit-fixer SKILL.md:76)
- `<SONASH_ROOT>\.husky\pre-commit` (present — confirms
  hook scaffold)
- `<JASON_OS_ROOT>\.research\migration-skill\BRAINSTORM.md`
  §3 D27/D29, §5 Q2 (referenced as task context; not re-read)

---

**File:** `<JASON_OS_ROOT>\.research\migration-skill\findings\D2-code-pr-gh.md`
