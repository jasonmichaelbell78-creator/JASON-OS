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

#### Review #3: Session 4 — R-frpg research + 4.3 team port + D19 closure (PR #5) — Round 1 (2026-04-18)

**Source:** Mixed — Qodo + Gemini Code Assist
**PR/Branch:** #5 / `bootstrap-41726`
**Items:** 7 total (Critical: 0, Major: 2, Minor: 5, Trivial: 0)

**Patterns Identified:**

1. **"Copy-as-is" research ports inherit upstream data inconsistencies.**
   The R-frpg port picked up 3 distinct SoNash-side inconsistencies that hadn't
   been caught because the MI-1 pre-analysis regex scans for sanitization
   keywords, not cross-file consistency: (a) `metadata.json agentCount: 9`
   contradicts RESEARCH_OUTPUT.md line 15's enumeration of 14 agents;
   (b) `metadata.json claimCount: 120` disagrees with the actual 116 records
   in claims.jsonl; (c) `topThemes` still cited "44 JASON-OS memory files"
   despite Section 10.1 V1 verification correcting this to 80+. All three
   were inherited silently through copy-as-is.
   - Root cause: MI-1 regex catches project-coupling keywords (sonash, firebase,
     TDMS) but has no check for intra-bundle consistency.
   - Prevention: future copy-as-is research ports should run a consistency
     sweep as part of pre-analysis — at minimum, verify
     `metadata.json.claimCount == wc -l claims.jsonl` and cross-check
     agentCount against the agent enumeration in RESEARCH_OUTPUT.md's
     intro block.

2. **JSONL schema divergence between research bundles was silent until
   externally flagged.** R-frpg's claims.jsonl uses `{id, text, confidence,
   source_url, source_agent, sub_question}`; the canonical deep-research
   REFERENCE.md documents `{id, claim, evidence, sourceIds, category,
   subQuestionId, routing, confidence}`. The repo already had two schemas
   coexisting (jason-os-mvp bundle uses canonical; R-frpg uses SoNash
   pre-canonical) but nothing surfaced this until Qodo ran.
   - Root cause: no consumer of the canonical schema exists yet in JASON-OS,
     so divergence had no observable effect.
   - Prevention: annotate non-canonical bundles with `schemaVersion` +
     `schemaNote` fields documenting the field mapping. This is the
     "document-or-convert" middle path Qodo's own remediation prompt offered
     for cases where full record conversion is too risky.

3. **Propagation sweep surfaces peer-bundle hygiene issues.** Grepping for
   `C:/Users/jason/` across the repo surfaced 6 instances in
   `.research/jason-os-mvp/` (sources.jsonl, G1-session-rhythm-infra.md,
   GV1-codebase-claims.md) — out of this PR's scope but same
   absolute-local-path anti-pattern.
   - Root cause: original research capture did not sanitize local paths in
     audit-evidence records.
   - Prevention: different category from PORT_ANALYSIS.md's single "Source:"
     line (which was prose, easily generalized). Research audit records
     encode "I looked at file X at path Y" — sanitizing would erase evidence
     of what was actually checked. Options: (a) accept as-is, (b) rewrite
     to repo-relative where possible (most could be `./.claude/hooks/lib/`
     style), (c) sidecar note. Flag as follow-up.

**Resolution:**

- Fixed: 7 items
- Deferred: 0 items
- Rejected: 0 items

**Fixes applied:**

- **Item 1 (Qodo, MAJOR — claims count):** `metadata.json` claimCount 120→116,
  confidenceDistribution recomputed from claims.jsonl (HIGH: 65, MEDIUM: 45,
  LOW: 6, UNVERIFIED: 0 — matches actual records), added `claimCountNote`
  explaining the 4-claim v1.1 narrative delta is discussed in Section 10 but
  not individually enumerated as JSONL records.
- **Item 2 (Qodo, MAJOR — schema mismatch):** Light-touch fix per Qodo's
  own "avoid silent divergence" middle path. Added `schemaVersion:
  "sonash-pre-canonical-v0"` + `schemaNote` to metadata.json documenting
  the field mapping to the canonical schema. Did NOT convert 222 records
  (risk > reward — no consumer, would break audit integrity).
- **Item 3 (Qodo, MINOR — local path leak):** `PORT_ANALYSIS.md` replaced
  absolute `C:/Users/jason/Workspace/dev-projects/sonash-v0/...` with
  `<local SoNash checkout>/...` generic placeholder.
- **G1 (Gemini, MINOR — team header stale):** `research-plan-team.md`
  example header "state management migration" → "cross-project sync
  mechanism" to match sanitized body.
- **G2 (Gemini, MINOR — agentCount):** `metadata.json` agentCount 9→14 +
  added `agentBreakdown` field enumerating the team.
- **G3 (Gemini, MINOR — memory count in topThemes):** `metadata.json`
  topTheme "44 JASON-OS memory files" → "80+" with inline note about
  V1 correction.
- **G4 (Gemini, MINOR — memory count in PORT_ANALYSIS):** Downstream utility
  bullet "44 JASON-OS memory files" → "80+" with V1-correction note.

**Scope decision — historical research text NOT modified:** "44 JASON-OS
memory files" still appears in `RESEARCH_OUTPUT.md` §1/§5/§6 (superseded
v1.0 sections), `claims.jsonl` C-071 (v1.0 claim record), and
`challenges/contrarian-1.md`. These are historical audit trail — the
research captures its own v1.0→v1.1 correction arc in Section 10.1.
Rewriting would erase evidence of the research process.

**Provenance header updated:** `RESEARCH_OUTPUT.md` provenance block now
documents BOTH the initial port (copy-as-is with single provenance block)
AND the R1 review metadata edits. Keeps the audit trail honest about what
was modified when.

**Pending user action:** None new. (m1 SonarCloud Mark-as-Safe from R1 of
PR #3 still pending across all subsequent PRs — not a PR #5 blocker.)

**Key Learnings:**

- **MI-1 pre-analysis needs a cross-file consistency sub-step.** Sanitization
  regex alone caught zero of the 3 metadata-vs-reality discrepancies in R-frpg.
  Worth adding: `jq '.claimCount' metadata.json == $(wc -l < claims.jsonl)`
  style assertions as a pre-analysis gate for future research bundle ports.
  Candidate for Layer 3 `validate-claude-folder` (T21) scope expansion or a
  new research-bundle-validator skill.
- **"Silent divergence" is a real anti-pattern for shared schemas with no
  current consumer.** The R-frpg schema mismatch had zero operational impact
  (nothing parses the JSONLs) but created a future-trap. `schemaVersion`
  markers with explicit deltas are the cheap way to prevent "discovered 6
  months later when someone builds a parser."
- **Qodo's own remediation prompt frequently offers a middle path.** For
  Item 2, Qodo explicitly suggested "document/encode that this bundle is an
  external-schema exception, but avoid silent divergence" as an alternative
  to full record conversion. Reading the remediation prompt tail, not just
  the summary, often surfaces lower-risk options.
- **Propagation sweep scope decision matters.** Same anti-pattern in a peer
  research bundle may be out of this PR's scope AND in a different category
  (audit evidence vs prose). Don't blanket-propagate across categories;
  document the decision in the learning log so future reviewers don't
  re-debate.
- **Research bundle ports should include an intra-bundle consistency check
  in the port notes.** The PORT_ANALYSIS.md row for R-frpg noted "16 files,
  384K, 49 regex hits" but didn't verify metadata.json fields against the
  actual bundle state. Add a consistency assertion line to the standard
  PORT_ANALYSIS row for future research ports.

#### Review #4: PR #6 R1 — sync-mechanism discovery phase + T23/T24 infra (2026-04-18)

**Source:** Mixed (Qodo + SonarCloud + Semgrep OSS + Gemini + github-advanced-security)
**PR/Branch:** #6 / `sync-mechanism-41826`
**Items:** 16 total (Critical: 0, Major: 4, Minor: 3, Trivial: 9)

**Patterns Identified:**

1. **Pattern regex false-positives on git action SHAs in research JSONL.**
   Semgrep's `generic.secrets.security.detected-sonarqube-docs-api-key` rule
   matches 40-char hex strings. The `action_pins[].sha` field in D9/D16 CI-workflow
   inventories records these pinned SHAs verbatim. Two FPs on `.research/` files.
   - Root cause: Secret-detection regex shape overlaps with git SHA shape; no
     path-scoped exclusion for research/inventory artifacts.
   - Prevention: Add `.research/**` to Semgrep path-ignore for secret-detection
     rules, OR annotate JSONL `action_pins` field with a semgrep-nosec marker.
     Deferred — current approach is dismiss-as-FP per occurrence.

2. **Hardcoded platform-specific paths in cross-platform scripts.**
   `.claude/statusline-command.sh` hardcoded `.exe` extension (Qodo Bug #2,
   3-source convergence with Gemini + Qodo-compliance). The shim worked only on
   Windows even though `build.sh` gates `.exe` append on `GOOS=windows`.
   - Root cause: Copy-from-local-Windows pattern — ported from a dev path
     without cross-platform probe logic.
   - Prevention: Cross-platform scripts MUST probe both extension-less and
     `.exe` variants. Add to CLAUDE.md §5 Anti-Patterns.

3. **Silent-failure file-I/O anti-pattern (Go).**
   `config.go loadConfig()` used `os.Stat` existence check followed by
   `toml.DecodeFile()` with ignored error return. TOCTOU window + malformed
   config silently falls back to defaults (Qodo Bug #1).
   - Root cause: Checklist-as-try/catch translation was literal rather than
     idiomatic. In Go: inspect DecodeFile's returned err; classify
     `errors.Is(err, os.ErrNotExist)` as expected.
   - Prevention: CLAUDE.md §5 already flags "File reads: Wrap ALL in try/catch
     (existsSync race condition)" — extend to Go's `os.Stat` + `DecodeFile`
     equivalent pattern.

4. **Unguarded index into user-editable slice.**
   `cache.go recordFailure()` indexed `backoffMinutes[idx]` without `len(..)>0`
   guard. `retry_backoff` comes from user-editable TOML; `[]` panics with
   index-out-of-range (Qodo Bug #3).
   - Root cause: Implicit assumption of non-empty config-derived slices.
   - Prevention: Audit all TOML-slice indexers for empty-slice guards. Add
     unit tests with empty inputs to every user-config-touching path.

5. **Config field consumed but not reflected in display.**
   `widgetWeatherCurrent()` passed `cfg.Weather.Units` to the API request but
   hardcoded `°F` in the display (Qodo Bug #4).
   - Root cause: Units field threaded into fetch path during initial
     implementation but display side was hardcoded from a Fahrenheit-default
     dev session.
   - Prevention: When a config field affects data, grep for the FIELD NAME
     in all consumers and verify each read/write path.

6. **SonarCloud "TODO" rule false-positives on function names.**
   `findLatestTodoFile`/`findInProgressTask` matched SonarCloud's TODO-comment
   rule (2 FPs on widgets.go L344/L375). Not actionable TODOs — just function
   names containing "todo" (the statusline's todo-widget feature).
   - Root cause: Rule regex matches substring "todo" in comments without
     disambiguating code vs TODO-marker context.
   - Prevention: Mark-FP in SonarCloud UI; no code change needed.

**Resolution:**

- **Fixed: 8 items** (4 MAJOR bugs + 1 MINOR SKILL.md generalization + 1 MINOR
  merge-if + 2 LOW suggestions).
- **Unit tests added:** `TestRecordFailureEmptyBackoff`,
  `TestRecordFailurePopulatedBackoff`, `TestTemperatureUnitSuffix`.
- **Deferred: 0 items.**
- **User-action UI dismissals: 8 items** (no debt-log entries):
  - 4 × SonarCloud S4036 PATH hotspots → **Mark Reviewed-Safe** in SonarCloud UI
    (dev-tool exec.Command with hardcoded args; no user input flows to command)
  - 2 × Semgrep FP `detected-sonarqube-docs-api-key` → **Dismiss as False
    Positive** on GitHub alerts (matches git action SHAs in JSONL)
  - 2 × SonarCloud "TODO" INFO → **Mark Won't Fix / False Positive** in UI
    (function names, not actionable TODOs)
- **Rejected: 0 items.**

**Key Learnings:**

- Multi-source convergence (Bug #2: Qodo + Gemini + Qodo-compliance) auto-
  elevates priority — fixed in same commit regardless of individual severity.
- 16 items on a 179-file PR is GOOD signal density — first-scan on 90%-research
  PR could have generated hundreds of FPs but Qodo/Gemini stayed focused on the
  15% real-code surface (statusline + SKILL.md).
- The SKILL.md persistence-safety-net description was NOT caught by T23 (Session
  6) or T24 (Session 7) — Gemini caught it in R1 review. Cross-cutting
  documentation generalizations are hard to see from inside the change; external
  reviewers add value here.
- User memory `feedback_sonarcloud_mark_as_safe` applies — code changes alone
  don't clear To-Review hotspots; user must click through the UI.
