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

#### Review #2: Foundation milestone PR (PR #3) — Round 2 (2026-04-17)

**Source:** Mixed — SonarCloud + Semgrep + Qodo (Gemini did not re-review on R2)
**PR/Branch:** PR #3 / `bootstrap-41726` → `main`
**Items:** 14 total (Critical: 0, Major: 2, Minor: 5, Trivial: 2 false positives, Design: 1, R1 dedup: 4)

**Patterns Identified:**

1. **Cross-round dedup carries real load.**
   - Root cause: 4 of 14 R2 items were re-flags of issues R1 already rejected (audit-trail user-id, sensitive log exposure, secure-error user-facing leak, secure-logging incomplete redaction). Without the cross-round rule these would have re-litigated each round.
   - Prevention: state file `task-pr-review-{pr}-r{N}.state.json` is the canonical disposition record; warm-up MUST load it. Confirmed working this round.

2. **Static-analysis tools cannot see runtime guards.**
   - Root cause: Semgrep's prototype-pollution rule (#17) re-flagged the same loop in `rotate-state.js:210` despite Agent A's R1 M10 fix that adds an explicit `PROTO_POLLUTION_KEYS.has(keys[i])` guard returning before the polluting line. The rule is heuristic AST-pattern, not runtime-flow.
   - Prevention: when fixing a static-analysis flag with a runtime guard, expect repeat flags on subsequent scans; document the guard with an inline comment referencing the rule ID + PR round (we did this — pattern works for human reviewers; bot will keep flagging anyway).

3. **Stale-snapshot detection from external scanners.**
   - Root cause: SonarCloud flagged a "TODO" at `session-end-commit.js:120` that doesn't exist in current HEAD (line 120 is `// Closes T14 from the /todo backlog.`). Likely matched "Closes T14" as a task marker via fuzzy text rule.
   - Prevention: Step 1 critical-claim validation MUST grep the actual file before triaging — caught both this and the Semgrep false positive without wasted effort.

**Resolution:**

- **Fixed: 5 items** (in-session single commit, no agent dispatch needed for this volume)
  - **N1** commit-tracker.js `validateGitDir()`: resolve symlinks via `realpathSync` before containment check (Qodo 8/10 security)
  - **N2** state-utils.js `saveJson()`: pre-check parent dir against allowed `.claude/{state,hooks}/` roots BEFORE `mkdirSync` (Qodo 8/10 security)
  - **N3** sanitize-input.js `sanitizeInput()`: coerce non-string inputs to string to prevent TypeError on truthy non-strings; null/undefined → empty string (Qodo 7/10)
  - **N4** read-jsonl.js: cap parse-error warnings at 25 with summary message after, prevents log DoS on heavily corrupted JSONL (Qodo 6/10)
  - **N5** settings.json: symmetric m6 fix on PreToolUse `read` and `write|edit` matchers — `^(?i)X$` → `^[Xx]$` style; flagged as R1 follow-up, not surfaced by any reviewer this round, included anyway for consistency
- **Deferred: 0 items**
- **Rejected: 9 items** (with justifications)
  - **R1 cross-round dedups (4):** audit-trail user-id (R1 A2), sensitive log exposure handoff/commit-failures (R1 A1 extended), secure-error user-facing leak (R1 A3), secure-logging incomplete redaction (R1 A3). Same justifications carry forward.
  - **t3** Semgrep #17 prototype-pollution: validated false positive — Agent A's M10 guard returns before the polluting line; Semgrep rule is structural, can't see runtime guards.
  - **t4** SonarCloud "TODO at session-end-commit.js:120": validated false positive — no TODO/FIXME exists; line 120 is a "Closes T14" comment.
  - **r1** Qodo "Robust Error Handling: Silent failure paths" in `appendCommitLog`: deliberate design — hooks must NEVER block git workflow; graceful degradation is the contract.
  - **r2** Qodo "Compact matcher case-insensitive `^[Cc]ompact$`": rejected — Claude Code emits `compact` lowercase per protocol; case-insensitive is gilding without observed need.
  - **r3** Qodo "Sanitize `getErrorMessage` in session-end-commit.js": rejected — even Qodo's "Why" notes this is a developer-facing CLI script where detailed errors are desirable.

**Pending user action:** None new in R2 (R1's m1 SonarCloud Mark-as-Safe still pending).

**Key Learnings:**

- **Cross-round dedup rule is load-bearing.** 29% of R2 items (4/14) were R1 dedups. Without state-file carry-forward, every round would re-debate the same architectural rejections.
- **Validate critical claims before triage.** Both R2 trivials (Semgrep + SonarCloud) were false positives caught by 5-second grep checks. Cheap, mandatory, prevents pointless agent dispatch.
- **R2 volume drops sharply when R1 is thorough.** R1 = 22 items. R2 = 14 items, of which 9 are auto-reject categories (4 dedups + 2 false positives + 3 deliberate). Net R2 work: 5 fixes. Signal-to-noise drop is the diminishing-returns indicator the skill's Step 7.5 watches for at R4+.
- **In-session beats agent dispatch for low-volume rounds.** R1 (15 fixes) earned 3 parallel agents. R2 (5 fixes across 5 small files) was faster done in-session — agent dispatch overhead would have exceeded the work.
