# PR Review Learnings

#### Review #1: Foundation milestone PR (PR #3) — Round 1 (2026-04-17)

**Source:** Mixed — SonarCloud + Semgrep + Gemini Code Assist + Qodo
**PR/Branch:** PR #3 / `bootstrap-41726` → `main`
**Items:** 22 total (Critical: 0, Major: 10, Minor: 7, Trivial: 2, INFO/Architectural: 3)

**Patterns Identified:**

1. **SoNash → JASON-OS port carries forward latent defects.**
   - Root cause: copy-as-is ports inherit pre-existing bugs and compliance gaps from SoNash 41526 (raw `node:fs` use, rmSync-then-renameSync atomicity gap, prototype-pollution loop, unredacted commit-message persistence). Per-skill self-audit (MI-5) does not catch them.
   - Prevention: future ports MUST treat external review (Qodo + SonarCloud + Semgrep) as a required gate after the per-skill audit, not a nice-to-have. Flag every fixed item as a SoNash backport candidate.

2. **rmSync-then-renameSync atomicity anti-pattern across ≥5 functions.**
   - Root cause: same pattern in `commit-tracker.js:saveLastHead`, `rotate-state.js:rotateJsonl`, plus 4 sibling functions in rotate-state. Each creates a crash window where state is lost.
   - Prevention: standardized on `safeAtomicWriteSync` (atomic) + a `backupSwap` helper (with rollback). Any future state-write must use one of those, not raw rm+rename.

3. **Helper-bypass discipline (CLAUDE.md §5) is honor-only without an enforcement gate.**
   - Root cause: 3 ported files used raw `node:fs` despite `scripts/lib/safe-fs.js` existing.
   - Prevention: `grep -E "fs\.\w+Sync\(" .claude/hooks/ scripts/ --include="*.js"` at PR-time should yield zero hits in primary code paths (fallback shims acceptable). Candidate for a new ESLint rule when stack lands.

4. **Multi-source convergence rule (Step 2) does real work.**
   - Two items were elevated by the rule (M1 session-end format mismatch: Gemini high + Qodo bug #3; M2/M3 atomicity: Gemini medium + Qodo bug #5). Both elevated to MAJOR in this round and got fixed in this PR rather than deferred. Without the rule, M1 would have stayed as the deferred T14 backlog item.

5. **Reviewer false positives are real and validation matters.**
   - Semgrep #16 ("SonarQube Docs API Key" in RESUME.md:61) was a false positive — the string is the public SHA pin for `SonarSource/sonarqube-scan-action@v5.0.0`, also present in `.github/workflows/sonarcloud.yml:39`. Caught by Step 1 critical-claim validation before the item entered triage.

**Resolution:**

- **Fixed: 17 items** (16 via 3 parallel `general-purpose` agents + 1 in-session m4; 1 of those — m1 — is pending user UI Mark-as-Safe in SonarCloud)
- **Deferred: 0 items**
- **Rejected: 5 items** (with justification):
  - **A1** Sensitive state persistence in `handoff.json`: file is gitignored, local-only, never published. Redaction concern is operational (workspace-sharing hygiene), not application-level. Acceptable v0 risk.
  - **A2** Audit trails missing user ID: `commit-log.jsonl` already captures `%an` (git committer name), which IS the user identifier. A separate `user_id` field would duplicate.
  - **A3** Hook output echoed to stderr: `reportCommitFailure` already redacts at the boundary (`USER_PATH`, GitHub PAT patterns, Bearer/secret regexes). "What other tools may write to hook-output.log" is unbounded and out of scope.
  - **t1** Semgrep "SonarQube Docs API Key" in RESUME.md:61: false positive (validated). Public SHA pin, not a secret.
  - **t2** Qodo #8 ESM scripts lack module marker: pre-existing in JASON-OS as **T1** in `/todo` backlog (P3 polish). No change this round per backlog deferral.

**Pending user action:**
- **m1** — SonarCloud UI: mark the 5 `S4036` PATH-search hotspots in `scripts/session-end-commit.js` as Reviewed-Safe with a single batch justification ("Standard Node practice; PATH integrity is operational concern not application vulnerability in controlled developer environment").

**Open follow-ups for next round (R2 if needed):**
- Symmetric m6 fix: Agent C only fixed `^(?i)bash$` matchers; the same inline-flag pattern remains on PreToolUse `^(?i)read$` and `^(?i)(write|edit)$` matchers in `.claude/settings.json`. Apply `^[Rr]ead$` and `^[Ww]rite|[Ee]dit$` style for consistency.

**Key Learnings:**

- **External review is necessary, not optional.** Per-skill self-audits caught format/structure issues but missed every one of the 22 items here. The MI-5 audit pattern is sufficient for skill structure, not for security/correctness/compliance.
- **Parallel `general-purpose` agents with file-disjoint scopes are reliable.** Three concurrent agents touched 9 distinct files with zero merge conflicts and zero git-index races. Pattern is now confirmed (Step 4 + PR #3 R1 fixes both clean).
- **Worktree isolation routinely doesn't activate.** Both Step 4 dispatches and this round's dispatches resulted in agents bypassing locked worktrees and writing to the main checkout. As long as scope files are disjoint, this is fine; document the pattern explicitly so future dispatch isn't surprised.
- **Convergence-loop the cross-source signal at Step 2.** When Gemini and Qodo both flag the same defect, the convergence-elevation rule earns its place. Without it, M1 (session-end format) would have shipped to a customer who immediately hit the bug.
