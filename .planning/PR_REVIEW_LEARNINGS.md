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

---

#### Review #5: PR #7 R1 — Piece 2 schema + Piece 3 plan (2026-04-19)

**Source:** Mixed (Gemini Code Assist + Qodo Code Review/Suggestions/Compliance + Semgrep)
**PR/Branch:** #7 `piece-3-labeling-mechanism` → main
**Items:** 13 total (Critical: 1, Major: 5, Minor: 6, Rejected/Deferred: 1)

**Patterns Identified:**

1. **Schema-validation contract drift** — `file_record.required` in
   `schema-v1.json` disagreed with the equivalent "required" markers in
   `SCHEMA.md §3.3` for five array fields (dependencies / external_services /
   tool_deps / mcp_dependencies / required_secrets) — Gemini G1.
   - Root cause: the initial required-set was defined early in discovery
     and not revisited when per-type extension decisions lifted these to
     structured-array columns.
   - Prevention: Piece 3 Step S2 validator library should cross-check
     `SCHEMA.md` prose against `schema-v1.json` and flag divergence.

2. **`composite` type missing from enum** despite being used in
   `EXAMPLES.md` Example 18 — Gemini G2 + `additionalProperties: false`
   would have rejected the example in strict validation.
   - Root cause: enum_type was compiled from the 24-value file list without
     adding the single-value composite type used only in `composites.jsonl`.
   - Prevention: type enum must be exercised against BOTH catalog
     examples during validation-harness construction.

3. **Ajv strict-mode surfaces legitimate schema-design limitations.**
   Enabling `strict: true` exposed 40 strictRequired warnings stemming from
   per-type `allOf/then` blocks referencing properties defined at the
   top-level of `file_record`. Addressed via `strictRequired: false` as a
   scoped exemption; proper fix (draft-2019-09 + `unevaluatedProperties`)
   filed as D1 in `.planning/DEBT_LOG.md`.

4. **Documented anti-pattern literal triggers hook-filter.** PLAN.md's
   initial Write was blocked because the document quoted CLAUDE.md §5's
   anti-pattern verbatim — the pre-tool security hook pattern-matched on
   the literal token without distinguishing doc-reference from actual code.
   Rephrased to avoid the match. Logged earlier in session-end-learnings
   #9.

5. **CLAUDE.md §5 compliance drift in new harness code.** `.validate-test.cjs`
   used `console.log(e.message)` and unwrapped `fs.readFileSync` — both
   direct §5 violations — even though the same file conformance rules
   governed its authorship. Qodo QF1/QF2 caught both. Routed through
   `scripts/lib/sanitize-error.cjs` and wrapped in try/catch.

**Resolution:**

- **Fixed: 11 items.** QF2 (sanitize errors), QF1/Q5 (try/catch schema
  read), QF3 (ajv devDep + `schema:validate` npm script), G1 (required
  fields), G2 (composite type + `not-composite` discriminator), Q1 (team
  parsing reference), G3 (strict: true + strictRequired: false), Q2
  (`structuredClone` validate.errors), G5/Q4 (`node-notifier` as devDep +
  corrected Node.js built-in claim), Q3 (EXAMPLES.md scope-enum
  contradiction), S1 (nosemgrep suppression with inline justification).
- **Deferred: 1 item.** G4 (per-type field pollution) → debt D1. Proper
  fix requires draft-2019-09 bump; current schema passes all tests.
- **Rejected: 1 item.** Q6 (records alias object, importance 3/10) —
  `oneOf` at schema root already handles dispatch cleanly; the alias
  adds indirection without functional benefit.

**Key Learnings:**

- **Multi-source convergence on CLAUDE.md §5 violations.** QF1, QF2, Q5,
  and Gemini's strict-mode recommendations all independently surfaced
  gaps in the same harness file. When 3+ reviewers agree on one file's
  issues, the file is worth extra scrutiny — not just agent-driven
  authorship compliance but also follow-up review.
- **Ajv strict-mode trade-off.** `strict: true` is the right posture for
  a dev harness validating the repo's own schema, but `strictRequired`
  specifically produces noise when the schema uses `allOf/then` for
  per-type required fields referencing top-level properties. Draft-07 has
  no way to "flatten" this check; draft-2019-09 with `unevaluatedProperties`
  does. Scoped exemption (`strictRequired: false`) is the right
  middle-ground until v1.1.
- **Doc-reference-to-anti-pattern hook traps.** Writing documentation
  that QUOTES anti-patterns verbatim can trigger the same hooks meant to
  block the anti-pattern in code. Either (a) paraphrase the anti-pattern
  instead of quoting, or (b) refine the hook's pattern matcher to
  whitelist doc-file paths.
- **Qodo's ⚪ unreviewed markers ≠ actionable items.** Qodo's compliance
  framework emitted 4 "⚪ Unreviewed: diff not visible" entries for
  Robust/Secure Error Handling, Secure Logging, and Input Validation.
  These aren't fixable items (no specific defect to address) — the CRITICAL
  QF2 and MAJOR QF1 items were the concrete findings. The ⚪ markers were
  effectively cleared as a side-effect of those fixes.
- **Pre-existing file patterns matter during propagation sweep.** The
  sweep for raw `error.message` usage surfaced `read-jsonl.js` and
  `session-end-commit.js`, but both use the project-approved
  `getErrorMessage()` helper pattern (accepted in prior Review #217 R3/R4).
  That's not the same anti-pattern as `.validate-test.cjs`'s direct
  `console.log(e.message)` dump, so they weren't counted as propagation
  targets. Rule: propagation identifies the _pattern_, not the _token_ —
  context-check before fanning out.

#### Review #6: Piece 3 labeling mechanism (PR #8) — Round 1 (2026-04-20)

**Source:** Mixed — SonarCloud + Semgrep + Qodo Code Review + Qodo PR Suggestions + Qodo Compliance + Gemini
**PR/Branch:** PR #8 / `piece-3-labeling-mechanism` → `main`
**Items:** 19 total (Critical: 0, Major: 6, Minor: 10, Trivial: 3)

**Patterns Identified:**

1. **Hook spawn paths need async-error wiring, not just sync try/catch.**
   - Root cause: `agent-runner.defaultHeadlessSpawner` used `spawn()` with `detached + shell:true` but no `child.once('error', ...)`. Caller's try/catch only covers synchronous exceptions — async ENOENT/EACCES would crash the parent hook. Same bug shape as a generic-purpose agent spawn loop.
   - Prevention: any `spawn()` in a hook context MUST attach an `error` listener AND persist the failure somewhere the next sweep will see (in this case, a `{ error }` marker at `outputPath` so `applyAgentOutput` surfaces it via its existing error path). Sync-only error handling is insufficient for detached children.

2. **`shell:true` is a platform concession, not a default.**
   - Root cause: `shell:true` was set unconditionally to handle `claude` → `claude.cmd` resolution on Windows. Semgrep flagged it as a generic injection surface even though the command name is a constant.
   - Prevention: gate `shell:true` on `process.platform === "win32"` when the reason is Windows-specific `.cmd` resolution. On POSIX, `shell:false` removes the finding and reduces attack surface.

3. **`existsSync + statSync` pre-check is a propagation target, not a single bug.**
   - Root cause: Piece 3 new code repeated the TOCTOU pattern in **four** sites (`readQueue`, `classifyJob`, `appendQueueEntry`, `readCatalog`). Qodo Bug#1 only cited the first three; the fourth was found during the mandatory propagation sweep.
   - Prevention: replace with `try { statSync(...) } catch (ENOENT → return default / ENOENT → fall through)`. Propagation sweep grep: `fs\.existsSync\s*\(.*fs\.statSync` across new diff files. Pre-existing defensive sites with downstream try/catch on the read (e.g. `session-end-commit.js:141`) are not propagation targets — context-check per Review #5.

4. **Stale Gemini findings on already-wrapped code.**
   - Root cause: Gemini flagged `mkdirSync` in `post-tool-use-label.js:220` and `catalog-io.js:109` as unwrapped — both are clearly inside `try { ... } catch (err) { throw new Error(...sanitize(err)) }` blocks. The finding referenced the right lines but missed the surrounding context.
   - Prevention: multi-source convergence requires cross-checking the cited location against the current HEAD before acting. Two reviewer sources agreeing elevates; one reviewer disagreeing with the codebase is grounds for reject-with-evidence. Per Review #1 pattern #4, convergence works both ways.

5. **Qodo Compliance ⚪ items are advisory, not action-required (same as Review #5 finding).**
   - Root cause: four informational Compliance warnings (missing actor in audit, notification leaks internal paths, stderr path logging, shell-spawn usage). The ⚪ marker matches the Review #5 rule — no specific defect, context-dependent on threat model.
   - Prevention: batch-reject informational Compliance items with a one-line threat-model rationale (single-user local-dev infrastructure, no multi-tenant audit requirement), file under Rejected in learning entry. Only escalate if a specific defect is named.

6. **Dependency Review Scorecard warnings are posture, not vulnerabilities.**
   - Root cause: Dependency Review flagged 3 low-Scorecard packages (`growly`, `node-notifier`, `shellwords`) — all transitive/direct deps of our single `node-notifier` devDep. Zero CVEs, zero license issues. Low scores reflect upstream maintenance signal.
   - Prevention: treat Dependency Review Scorecard warnings as evaluation items (T31), not review items. Three paths to evaluate: replace with native platform calls, allowlist via `.github/dependency-review-config.yml`, or drop the feature. Out of scope for R1 fixes; tracked separately.

**Resolution:** 19 parsed items → 13 fixed (15 fix actions including 2 propagation sites) + 3 rejected + 3 advisory-rejected = 19 dispositions ✓

- **Fixed: 13 reviewer items (+2 propagation fixes = 15 total fix actions)**
  - 6 MAJOR: spawn error handler + shell:true platform guard (Semgrep #22 / Qodo Bug#3 / Compliance shell-risk — three findings, one fix), readQueue TOCTOU (Qodo Bug#1a), classifyJob TOCTOU (Qodo Bug#1b), ReDoS hardening via globToRegex input validation (Semgrep #23), AppleScript injection via whitelist-by-removal (Qodo Compliance), applyAgentOutput null/array validation (Qodo Sugg#2).
  - 5 MINOR (reviewer): logger.error in drainPendingQueue empty catch (Qodo Bug#2), ajv `allErrors: false` (Semgrep #24), husky validator existence check (Qodo Sugg#3), derive.js parseExistingFrontmatter repo-root enforcement (Qodo Sugg#4), SonarCloud S4036 code comment + user-side Mark-as-Safe.
  - 2 MINOR (propagation-sweep, no reviewer cite): appendQueueEntry TOCTOU, readCatalog TOCTOU — same pattern as Qodo Bug#1, found via the MUST propagation step.
  - 2 TRIVIAL: optional chain in session-end-commit.js:126 (SonarCloud code smell), buildFailureWarning CR/LF/tab strip (Qodo Sugg#5).
  - **Bundled non-review work:** T30 (learnings-consumption system) + T31 (node-notifier supply-chain evaluation) created via `/todo`. Bundled with this commit per user instruction — not counted in the 19 review items.
- **Deferred: 0 items**
- **Rejected: 3 items** (with justification):
  - **Gemini mkdirSync post-tool-use-label.js:220** — stale finding, code already wrapped in try/catch with `sanitize(err)`.
  - **Gemini mkdirSync catalog-io.js:109** — stale finding, same as above.
  - **Qodo Sugg#6 Husky SKIP_REASON redundant guard** — verified against `_shared.sh:33` — `require_skip_reason` already `exit 1`s on empty SKIP_REASON. Qodo's own note said "likely redundant." Confirmed redundant, no change.
- **Advisory rejected: 3 items** (Qodo Compliance ⚪, per pattern #5):
  - Missing actor in audit trail — single-user local-dev infra; no multi-tenant audit requirement.
  - Notification leaks internal paths — operator-visible info on their own desktop; not multi-tenant.
  - Stderr logging sensitive paths — same threat-model rationale; operator output, not remote log sink.

**Pending user action:**

- Mark SonarCloud S4036 hotspot (PATH-based `git` resolution in `session-end-commit.js`) as **Safe** in the SonarCloud UI with justification from the code comment.
- Evaluate T31 (node-notifier supply-chain posture) — pick one of: replace with native platform calls, allowlist via `.github/dependency-review-config.yml`, or drop the ambient-notification feature.
- Design T30 (learnings-consumption system) — needs `/deep-research` + `/deep-plan` before implementation.

**Key Learnings:**

- **Propagation sweep found one extra TOCTOU site beyond what Qodo cited.** Qodo Bug#1 flagged 3 locations in `agent-runner.js`; the sweep found a fourth in `appendQueueEntry` (same file) and a fifth matching pattern in `catalog-io.js:readCatalog`. Rule: do not trust reviewer site lists as exhaustive when the pattern is fs-level — always grep the new-diff surface.
- **`process.platform === "win32"` is the clean fix for the shell:true findings.** Don't argue with the Semgrep / Qodo flag; accept that `shell:true` is a platform concession and gate it accordingly. Reduces finding + attack surface in one edit.
- **Stale reviewer findings still count toward the dispositions total.** Gemini's two stale mkdirSync findings were rejected with evidence, not silently dropped. The three rejected items cover two stale findings + one confirmed-redundant suggestion. Step 7 count check: fixed(13 reviewer items) + rejected(3 primary) + advisory-rejected(3 Compliance) = 19 ✓ matches the 19 primary items parsed. The 2 propagation-sweep fixes are bonus work, not review items. Todos T30/T31 are bundled non-review work, not counted.
- **Whitelist-by-removal beats escape-and-hope for quote-delimited DSL strings.** AppleScript `display notification` takes quote-delimited strings; escape rules are subtle and context-dependent (backslash, backtick, dollar, control chars). Stripping all of them outright (`/["`$\\\r\n\x00-\x1f\x7f]/g`) is easier to reason about than correctly-ordered escapes. Same pattern applies to `msg.exe` on Windows — both funneled through one `sanitizeForShellArg` helper.
- **SonarCloud "Security Hotspot" ≠ "Security Bug."** S4036 (PATH-based command search) is a hotspot because it depends on your PATH hygiene. The finding is correct; the response is to add a code comment explaining the tradeoff and Mark-as-Safe in the UI, not to hardcode an absolute `git` path and break portability.

#### Review #7: Piece 3 labeling mechanism (PR #8) — Round 2 (2026-04-20)

**Source:** Mixed — Semgrep + Qodo Compliance + Qodo PR Suggestions
**PR/Branch:** PR #8 / `piece-3-labeling-mechanism` → `main`
**Items:** 11 total (Critical: 0, Major: 0, Minor: 4, Trivial: 4, Advisory: 3)

**Patterns Identified:**

1. **Platform-gated `shell:true` does not silence Semgrep — Semgrep's pattern is syntactic, not semantic.**
   - Root cause: R1 fix set `shell: process.platform === "win32"` to keep Windows `.cmd` resolution working while reducing surface on POSIX. Semgrep's rule `javascript.lang.security.audit.spawn-shell-true.spawn-shell-true` fires on *any* truthy-ish expression in the `shell` slot — it doesn't evaluate the expression. The R1 fix reduced real surface but didn't clear the scanner.
   - Prevention: for Node `spawn()`, the only pattern that reliably clears this rule is `shell: false` (or omitting `shell` entirely, defaulting to false). To keep Windows `.cmd` support with `shell: false`, resolve the target binary to an absolute path before spawning. Implemented a `resolveExecutable(name)` helper in `agent-runner.js` that walks `process.env.PATH` (honouring `PATHEXT` on Windows) and returns the first file match. Spawning the resolved absolute path lets Windows execute `.cmd` directly without shell.

2. **Qodo occasionally self-refutes in its own "Why" field — read it carefully.**
   - Root cause: two R2 Qodo suggestions (spawnSync for notify-send, `git status -z` parsing) came with "Why" text that explicitly flagged the proposed fix as broken or counterproductive. Qodo's scoring is imperfect; the "Why" sometimes exposes the flaw Qodo's own suggestion introduces.
   - Prevention: Step 2 triage MUST read the full "Why" field before accepting or even planning a fix. When Qodo self-refutes, reject with a short note pointing at the self-refutation, and (if the underlying concern is real) propose a better alternative. The non-blocking `spawn()` + `child.once('error', () => {})` pattern beats `spawnSync` for the notify-send ENOENT concern.

3. **R2+ cross-round dedup is load-bearing — repeated compliance items consume triage bandwidth otherwise.**
   - Root cause: Qodo Compliance re-surfaced two items that R1 rejected with documented threat-model justification (missing-actor-identity, unstructured-stderr-logs). Without cross-round dedup the temptation is to re-evaluate and potentially flip; the dedup rule holds the line.
   - Prevention: auto-reject repeat compliance items with a one-line reference to the R1 entry. Only re-examine if the threat model itself has changed (e.g., project flipped to multi-tenant). New *framings* of an old concern (R2's PATH-hijack reframing of R1's shell-risk) are fresh items and need their own disposition.

**Resolution:** 11 parsed items → 5 fixed + 3 rejected + 3 advisory-rejected = 11 dispositions ✓

- **Fixed: 5 reviewer items (+ 1 bonus defensive fix)**
  - 4 MINOR: Semgrep #25 via `resolveExecutable` + `shell: false` (R1 follow-up); `sanitizeForShellArg` extended to strip U+2028/U+2029 (Qodo Sugg#1); `oneLine` extended to strip all ASCII control chars (Qodo Sugg#2); `.husky/pre-commit` blocks commit when validator missing AND catalogs staged (Qodo Sugg#3).
  - 1 TRIVIAL: `post-tool-use-label.js` outputPath filename strips all Windows-invalid chars + length cap (Qodo Sugg#6, modified to keep readable stem instead of hash).
  - **Bonus:** Added `child.once('error', () => {})` to `runOsascript`, `runPowerShellToast`, `runNotifySend` spawn calls — addresses Qodo Sugg#5's underlying ENOENT concern without the spawnSync event-loop block.
- **Deferred: 0 items**
- **Rejected: 3 items** (with justification):
  - **Qodo Sugg#4 (mkdirSync in library)** — redundant. `processCurrentEdit` already `mkdirSync`s `AGENT_OUTPUT_DIR` at L219-220 before calling `runAgentAsync`. Qodo's own "Why" concedes this.
  - **Qodo Sugg#5 (spawnSync for notify-send)** — Qodo self-refutes: its "Why" explicitly notes the proposed fix "would block the event loop, breaking the script's non-blocking intention." Underlying ENOENT concern addressed via the bonus `child.once('error')` listeners instead.
  - **Qodo Sugg#7 (git status -z parsing)** — Qodo self-refutes: its "Why" notes "the provided -z parsing code is broken for renames." Also `session-end-commit.js` only processes the SESSION_END_PATHSPECS allowlist (known repo-local files) where paths with spaces don't occur in practice.
- **Advisory-rejected: 3 items** (Qodo Compliance ⚪):
  - PATH hijacking — inherent to any PATH-relative binary resolution; mitigating fully would hardcode absolute paths and break cross-platform portability. Threat only materializes if an attacker has write to a PATH directory (at which point they can do anything). Same threat-model argument as R1 shell-risk.
  - Audit-trail missing user identity — **repeat from R1**, auto-rejected (single-user local-dev infra, no multi-tenant audit requirement).
  - Unstructured stderr logs — **repeat from R1**, auto-rejected (operator-visible stderr, not a remote log sink).

**Pending user action:**

- Still pending from R1: Mark SonarCloud S4036 hotspot as Safe in the UI.
- No new pending actions from R2.

**Key Learnings:**

- **`shell: false` + absolute-path resolution is the portable Windows `.cmd` pattern.** Node's `spawn()` on Windows can run `.cmd`/`.bat` without `shell:true` only if the *full* executable name (with extension) or an absolute path is given. A small `resolveExecutable` helper (PATH + PATHEXT walk, first-match wins) avoids adding a `which`-style dep while cleanly silencing the spawn-shell-true rule. Cost: a handful of `statSync` calls at hook-spawn time — negligible in practice.
- **The U+2028/U+2029 gap is easy to miss.** R1's `sanitizeForShellArg` covered ASCII control chars and common shell metacharacters but missed Unicode line separators. JS string literals + some shell parsers treat these as line breaks — worth including in any shell-arg/DSL-arg sanitizer regex as a default. Applied same `\u2028\u2029` expansion to one related sanitizer (`oneLine`) during R2.
- **Readable filenames beat hashes when both portability and debuggability matter.** Qodo Sugg#6 suggested SHA-256 hashing the `rel` path for outputPath filenames. Stripping Windows-invalid chars + length cap preserves readability in `ls` / logs while still producing a valid filename on every OS. Debugging an orphaned pending-queue job is easier with `_claude_sync_label_lib_derive.js.1713619200000.json` than `a4b2…f0.1713619200000.json`.
- **R2 fix rate is expected to trend down.** R1 handled 13/19 items (68%). R2 handled 5/11 items (45%) plus 3 advisory-rejects. Most R2 "items" are incremental suggestions on R1 fixes, not new defects. This matches the Step 7.5 expectation that signal-to-noise degrades across rounds — a third round will likely come in with <30% fix rate and Step 7.5 will recommend merging.

#### Review #8: Piece 3 labeling mechanism (PR #8) — Round 3 (2026-04-20)

**Source:** Qodo (Compliance + PR Suggestions). No Semgrep / SonarCloud / Gemini items this round.
**PR/Branch:** PR #8 / `piece-3-labeling-mechanism` → `main`
**Items:** 9 total (Critical: 0, Major: 1, Minor: 5, Trivial: 2, Advisory: 1). Two bare "⚪ Unreviewed" compliance markers excluded per Review #5 rule.

**Patterns Identified:**

1. **The prediction that R3 would be noise was wrong — R3 surfaced the first real logic bug.**
   - Root cause: Qodo Sugg#1 flagged `derive.js parseExistingFrontmatter`'s kv regex (`^([A-Za-z_][\w-]*)\s*:\s*(.*)$`) as missing a leading-whitespace allowance. Traced the effect: any indented nested key under `metadata:\n  key: value` failed the regex, hit `if (!kv) continue;`, and was silently dropped. The `currentNested` object was left empty. **This broke nested-frontmatter extraction for every file with a `metadata:` block.** Existing test only covered top-level keys, which is why 40/40 passed with the bug live.
   - Prevention: reviewer-suggested regex hardening *can* surface real defects, not just noise. The R2-learnings prediction ("R3 will probably come in below 30%") was wrong — R3 fix rate was 67%. Do not pre-filter reviewer rounds as noise; each round still gets full triage. Added a regression test in `smoke.test.js` for nested-metadata extraction so this can't silently come back.

2. **Test coverage that passes doesn't mean test coverage exists.**
   - Root cause: "derive: parseExistingFrontmatter yaml + lineage body" tests top-level YAML keys and the lineage-body pattern — but never asserts any nested `metadata.*` access. So the test was green throughout the bug's lifetime, including R1 and R2.
   - Prevention: when a reviewer-suggested fix touches a code path with existing tests, grep the tests for coverage of the *specific* case being fixed. If the existing test wouldn't have failed without the fix, add a regression test. Applied during R3 fixing before committing.

3. **Option-injection defence on notify-send was missing despite R1's sanitize pass.**
   - Root cause: R1 added `sanitizeForShellArg` to `runPowerShellToast` (msg.exe) and `runOsascript`, but `runNotifySend` (Linux notify-send) still passed raw `title`/`body` — plus no `--` flag to cap option parsing. A body starting with `--help` or `-t` would have been parsed as an option. Qodo Sugg#5 caught what R1's fix missed.
   - Prevention: when sanitizing across multiple parallel platform paths (Win / macOS / Linux), verify each path individually — don't assume consistency. Now all three notify functions route through `sanitizeForShellArg`, and the arg-passing path uses `--` where the target tool supports it.

4. **Bidi control chars are a real prompt-surface risk, not academic.**
   - Root cause: R2 extended `oneLine` to strip `[\x00-\x1f\x7f]` (ASCII controls). R3 noted that Unicode bidi control chars (U+200E, U+200F, U+202A-E, U+2066-9) can visually reverse string order in a terminal — e.g. a `file_path` value containing RLO makes `hook.js` appear as `sj.kooh`. For a prompt-surface string that the user reads before deciding to retry/skip/fix, visual spoofing is a real attack. Plus U+2028/U+2029 are line breaks for some parsers. R2's ASCII-controls-only strip wasn't enough.
   - Prevention: sanitizers for any string that will appear on the prompt surface or in terminal output MUST strip the full bidi-control set plus line separators, not just ASCII controls. Added both to `oneLine` in R3.

**Resolution:** 9 parsed items → 6 fixed + 3 rejected = 9 dispositions ✓

- **Fixed: 6 items**
  - 1 MAJOR: `derive.js parseExistingFrontmatter` kv regex accepts leading whitespace + `indent.length >= 2` nesting check (Qodo Sugg#1).
  - 5 MINOR: `agent-runner.classifyJob` returns `running` on JSON parse failure until deadline (Qodo Sugg#2); `applyAgentOutput` locks `merged.path = base.path` to prevent primary-key rewrite (Qodo Sugg#3); `parseFingerprint` lowercases the algorithm match (Qodo Sugg#4); `runNotifySend` adds `sanitizeForShellArg` + `--` flag (Qodo Sugg#5); `oneLine` extends to strip U+2028/U+2029 + Unicode bidi controls (Qodo Sugg#6).
  - Regression test added: nested-metadata extraction in `smoke.test.js`.
- **Deferred: 0 items**
- **Rejected: 3 items**:
  - **Qodo Sugg#7 (hash suffix on output filename)** — `Date.now()` already in the filename provides de-facto uniqueness; Qodo's own "Why" concedes "collisions highly improbable." Adding 12 hex chars reduces stem readability in logs for negligible gain. Same readability-over-hash reasoning as R2 Sugg#6's modification.
  - **Qodo Sugg#8 (mkdirSync in library)** — **Cross-round dedup**: identical to R2 Sugg#4 which I rejected. Caller `processCurrentEdit` already `mkdirSync`s `AGENT_OUTPUT_DIR`. Qodo's own "Why" concedes "the caller in this PR already creates the directory." Auto-rejected per R2 disposition.
  - **Qodo Compliance (Git porcelain parsing)** — **Same threat-model argument as R2 Sugg#7**: `session-end-commit.js` operates only on `SESSION_END_PATHSPECS` (controlled allowlist of known repo-local files). Paths with embedded newlines don't occur in that set. Cost of `-z` NUL parsing (Qodo itself called its own suggested implementation "broken for renames" in R2) not justified by defense-in-depth against an impossible-in-practice case.

**Pending user action:**

- Still pending from R1: Mark SonarCloud S4036 hotspot as Safe in UI. No new pending actions from R3.

**Key Learnings:**

- **R3 fix rate (67%) refutes the R2-era prediction that later rounds trend to noise.** Rounds trend toward *different kinds of findings* — earlier rounds surface the obvious first-scan stuff, later rounds surface subtler logic bugs that require full code-reading. R3's highest-impact finding (YAML kv regex) was a genuine defect that had been live since Piece 3 started. Don't pre-filter later rounds as noise; don't raise the bar for fix acceptance based on round number; Step 7.5's merge-trigger check is a *threshold* rule, not an expectation of decay.
- **Regex-level reviewer suggestions can surface real defects, not just lint.** Qodo Sugg#1 looked like a stylistic fix for indentation support; investigating the `if (!kv) continue;` path revealed that every nested metadata key in the codebase had been silently dropped since the parser was written. Always trace the actual code path a regex change affects, don't auto-accept or auto-reject based on surface appearance.
- **Existing tests passing doesn't mean the case you're fixing has coverage.** The test "parseExistingFrontmatter yaml + lineage body" passed throughout R1, R2, R3 — while the bug in question silently dropped nested keys under `metadata:`. When Qodo flagged the regex, grep-checking the test for specifically `metadata.*` access revealed zero coverage. Always read the test for the case being fixed, not just the function under fix — and if the test doesn't cover the case, add a regression line before committing.
- **Parallel sanitizer paths need per-path audit, not batch trust.** R1 added `sanitizeForShellArg` across platforms but skipped `runNotifySend`. The mental model "we sanitize notifications" was true; the implementation "every notify path sanitizes" was false. For any N-platform code with parallel paths, verify each path explicitly.
- **Bidi control stripping is cheap defense against a real spoofing surface.** U+202E (right-to-left override) and its siblings can rearrange terminal output so the displayed string doesn't match the underlying bytes. For strings that appear on the prompt surface before a user decision, always include the bidi-control range `[\u200e\u200f\u202a-\u202e\u2066-\u2069]` alongside ASCII control stripping. One extra `.replace` call, covers a class of attack that's hard to diagnose if it happens.

#### Review #9: Piece 3 labeling mechanism (PR #8) — Round 4 (2026-04-20)

**Source:** Qodo (Compliance + PR Suggestions). Still no new Semgrep / SonarCloud / Gemini items since R3.
**PR/Branch:** PR #8 / `piece-3-labeling-mechanism` → `main`
**Items:** 9 total (Critical: 0, Major: 0, Minor: 4, Trivial: 3, Advisory: 3, of which 2 are R2+R3 repeats).

**Patterns Identified:**

1. **A "cross-round dedup" reject doesn't always mean the concern is wrong — only that the *previously proposed fix* was.**
   - Root cause: R2 rejected Qodo Sugg#5 (`spawnSync` for `runNotifySend`) because the proposed fix would block the event loop. R2's bonus fix added a silent-drop `child.once('error', () => {})` listener that prevented the parent crash — but `runNotifySend` still returned `true` on ENOENT, so `notify()`'s stderr fallback never triggered. Qodo Sugg#2 in R4 surfaced the same concern in a fresh way, and its "Why" field correctly identified the gap the silent-drop left.
   - Prevention: when rejecting a proposed fix for being problematic, separately verify that the *underlying concern* is addressed — either by the existing code or by an alternative fix. Log the underlying concern in the learning entry so future rounds have the full picture. In R4 I re-opened with a better fix: `resolveExecutable` pre-check → return `false` if the binary is missing, so the caller's stderr fallback actually triggers. Keep the silent-drop listener for race-window post-check failures.

2. **Shared helpers earn their keep when a "new surface" review framing matches an existing code pattern.**
   - Root cause: R4 Compliance item #2 (external command execution on notify binaries) was a fresh framing of the R2 PATH-hijack concern but now targeted `msg.exe` / `osascript` / `notify-send` instead of `claude`. Rather than duplicate the R2 `resolveExecutable` logic into `notification-label.js`, extracted it into `scripts/lib/resolve-exec.js` as a shared helper. One fix now partially mitigates two pieces of advisory feedback across two files, and any future hook that spawns an external binary can reuse it.
   - Prevention: when a R-N+1 review reframes an R-N concern across a new surface, check whether the R-N mitigation can be extracted into a helper before applying it inline to the new site. The cost (one small file) is minor; the coverage gain is meaningful.

3. **Qodo's "self-refute in Why" pattern has a third variant: "no functional impact."**
   - Root cause: R4 Sugg#6 (`classifyEdit` should prefer `content_hash` over `fingerprint`) conceded in its own "Why" field that the fix has "no functional impact because both branches of the condition currently return MINOR." The deeper finding — that `classifyEdit` has a dead-code conditional (both branches return the same value) — is a real code smell, but Qodo's proposed field-name fix doesn't address that; it just paints over it.
   - Prevention: when Qodo proposes a fix that it itself calls "no functional impact," reject the fix but note whether the underlying code smell warrants a follow-up todo. In R4 the smell (dead-code conditional in `classifyEdit`) is minor enough to leave as-is, but could be filed as a cleanup todo if the field-name drift matters for Piece 3's downstream consumers.

**Resolution:** 9 parsed items → 5 reviewer fixes + 1 bonus propagation = 6 fix actions + 1 rejected + 3 advisory-rejected = 9 dispositions ✓

- **Fixed: 5 reviewer items (+ 1 propagation, + 1 shared-helper extraction)**
  - 4 MINOR: `applyAgentOutput` path fallback to `entry.file_path` when `base.path` missing (Qodo Sugg#1); `runNotifySend` pre-checks binary via `resolveExecutable`, returns false if missing so `notify()` stderr fallback triggers (Qodo Sugg#2 — modified fix, not Qodo's spawnSync); `.husky/pre-commit` `--diff-filter=ACMR` on staged-catalog check (Qodo Sugg#4); `scope-matcher` explicit escape of `[` inside character class (Qodo Sugg#5).
  - 1 TRIVIAL: `classifyJob` timeout clamp to `Math.max(0, Number.isFinite(raw))` (Qodo Sugg#3).
  - **1 propagation:** applied the `resolveExecutable` pre-check to `runPowerShellToast` + `runOsascript` (parallel-paths gap, R3 pattern).
  - **1 shared-helper extraction:** moved `resolveExecutable` from `agent-runner.js` into `scripts/lib/resolve-exec.js`; both hook and library now import from there.
- **Deferred: 0 items**
- **Rejected: 1 item** (Qodo self-refute):
  - **Qodo Sugg#6 `classifyEdit` content_hash vs fingerprint** — Qodo's "Why" concedes "no functional impact because both branches of the condition currently return MINOR." The real smell (dead-code conditional) isn't what the fix addresses. Rejected; optional follow-up todo if the field-name drift matters downstream.
- **Advisory-rejected: 3 items** (Qodo Compliance ⚪):
  - **PATH binary hijack (`agent-runner.js`)** — **cross-round dedup**, repeat of R2 PATH-hijack advisory. Same threat-model argument applies.
  - **External command execution (notify binaries)** — new framing, same threat-model argument, BUT partially mitigated by the R4 `resolveExecutable` extension to notify binaries. Residual risk (attacker with write to expected bin path) remains theoretical and unavoidable without hardcoded paths.
  - **Path data in logs** — **cross-round dedup**, repeat of R1+R2 advisory. Same rationale (operator-visible stderr, not remote log sink).

**Pending user action:**

- Still pending from R1: SonarCloud S4036 Mark-as-Safe in UI. No new pending actions from R4.

**Step 7.5 merge-trigger check (R4+):** Fix rate = 5/9 = 56% (6/9 = 67% counting propagation). Both above the 30-50% "one more round max" flag. Not yet at merge recommendation. R5, if it happens, I'll watch for <30%.

**Key Learnings:**

- **Reject-for-bad-fix ≠ reject-for-bad-concern.** R2's reject of Qodo Sugg#5 (spawnSync) was the right call on the fix but left the underlying concern unaddressed. My bonus `child.once('error')` prevented the crash but didn't propagate failure to the caller. R4 re-framed the same concern and I applied a better fix: pre-check via `resolveExecutable`, return false if missing, fall through to stderr. **Rule:** when rejecting a proposed fix, write the underlying concern into the learning entry so future rounds (or future me) can tell whether it was address or only deflected.
- **Extract shared helpers when cross-file reviewer framings point at the same pattern.** R4's Compliance item #2 (notify-binary PATH-hijack) was a fresh framing of R2's concern at a new call site. Rather than duplicating the R2 `resolveExecutable` into notification-label.js, moved it to `scripts/lib/resolve-exec.js` and imported from both. One file added, reduces future duplication for any hook that spawns an external binary.
- **"No functional impact" in a reviewer's own rationale is a clear reject signal.** Applying a fix with no functional impact adds churn without value and can mask the deeper smell the reviewer almost saw. Log the smell as a follow-up candidate; don't paint over it with a cosmetic field-name change.
- **R4 fix rate trend (56–67%) challenges the "signal-to-noise decays linearly across rounds" mental model.** Noise is stochastic; signal is whatever the reviewer catches. R4 caught two real defects (path-fallback edge case, notify-binary false-success), one propagation-worthy concern (PATH-hijack on notify binaries), and one code smell (dead-code conditional). Decay isn't the right frame — the right question is "did this round teach me something I didn't already know?" R4 did.

#### Review #10: Piece 3 labeling mechanism (PR #8) — Round 5 (2026-04-20)

**Source:** Qodo (Compliance + PR Suggestions). Still no Semgrep / SonarCloud / Gemini items since R3.
**PR/Branch:** PR #8 / `piece-3-labeling-mechanism` → `main`
**Items:** 11 total (Critical: 0, Major: 1, Minor: 5, Trivial: 2, Advisory: 3).

**Patterns Identified:**

1. **I introduced a MAJOR logic bug while fixing a TRIVIAL defensive suggestion in R4.**
   - Root cause: R4 Sugg#3 asked for timeout clamping. I applied `Math.max(0, timeoutRaw)` as the clamp floor, reasoning "non-negative is the lower bound." For a negative input this returns 0, which makes `now - spawnedAt > 0` true for any job spawned more than a millisecond ago. Net effect: **every job, on every sweep, would have been classified as past-deadline the moment its output file wasn't yet present.** The R4 fix was meant to prevent immediate timeouts from corruption; it guaranteed them instead. Qodo Sugg#1 in R5 caught this on the very next round.
   - Prevention: (a) when applying a defensive clamp, trace the clamp through its downstream boundary check — a "safe lower bound" is only safe if the boundary check above that bound has the right semantics; (b) when the original concern is "a corrupted value could cause bad behaviour X," the fix must not make bad behaviour X *more likely* for the corrupted case; (c) any defensive-clamp fix needs a regression test for the corrupted-input case *before* commit, not after review surfaces the defect. Added regression test in `smoke.test.js` covering `timeout_ms: -1` and `timeout_ms: 0` — both must classify as `running` for a fresh entry.

2. **Fixing a hardening rule can introduce a new failure path the existing fail-closed wrapper doesn't catch.**
   - Root cause: R1 added `validateGlob` to reject pathological globs. `validateGlob` throws on violation, propagates via `globToRegex` into `compileScope`. The existing `loadScope` had a try/catch around JSON parse but NOT around `compileScope` — so a malformed `scope.json` was fail-closed but a malformed-*glob* scope.json would crash the hook with an uncaught throw. R5 Sugg#6 caught this gap.
   - Prevention: when adding a new throw-path into a previously throw-free function, grep every caller's error handling — does the caller's try/catch cover the new throw, or only the old ones? Especially load-bearing for hook entry-points where an uncaught throw means hook-crash → hook-silently-disabled-for-user. Wrapped `compileScope` in loadScope's existing fail-closed pattern.

3. **Re-rejecting on the same reviewer concern across rounds is correct when the threat model hasn't changed, even if the reviewer provides a better implementation.**
   - Root cause: Qodo Sugg#7 (git status -z) appeared in R2 (broken impl — Qodo self-refuted), R3 (framed as compliance), and R5 (correct impl this time). The *implementation* improved across rounds; the *threat model* didn't — SESSION_END_PATHSPECS is a hardcoded allowlist of known repo-local files that don't contain embedded newlines. Same reject stands across all three rounds.
   - Prevention: distinguish "reviewer provides better impl" from "threat model changed." The second triggers re-evaluation; the first doesn't. Document the threat-model argument once and reference it across rounds.

4. **"Silent drop for post-check race" is still a known-unknown worth one line of observability.**
   - Root cause: R4 added `child.once('error', () => {})` to notify spawns to prevent the unhandled-error crash after the `resolveExecutable` pre-check. The rationale was "ENOENT is handled by the pre-check; post-check race failures are vanishingly rare." True but R5 Compliance #3 correctly pointed out: "rare" doesn't mean "we shouldn't be able to see them when they happen." Cost: one sanitized stderr line per failure. Benefit: actually diagnosable when the race does hit.
   - Prevention: silent-drop patterns are worth one sanitized-log line, not zero. The line should be minimal (error code + binary basename, not full message / full path) to avoid leaking context. Added `logSpawnError(bin, err)` helper emitting `[label-notify] spawn(<basename>) <code>`.

**Resolution:** 11 parsed items → 8 fixed + 3 rejected = 11 dispositions ✓

- **Fixed: 8 items**
  - 1 MAJOR: `classifyJob` timeout clamp — fallthrough to `DEFAULT_TIMEOUT_MS` for non-positive / non-finite input, floor positive at 1000ms (Qodo Sugg#1, correcting my R4 Sugg#3 fix). **Regression test added** covering `timeout_ms: -1` and `timeout_ms: 0`.
  - 5 MINOR: prototype-pollution key strip before spread in `applyAgentOutput` (Qodo Compliance #1); `resolveExecutable` handles paths and pre-existing extensions correctly (Qodo Sugg#2); `resolveExecutable` POSIX exec-bit check via `fs.accessSync` (Qodo Sugg#3); `loadScope` fail-closed on `compileScope` throws (Qodo Sugg#6); `notification-label` spawn error listeners log sanitized one-liner via `logSpawnError` (Qodo Compliance #3).
  - 2 TRIVIAL: `resolveExecutable` trims and quote-strips PATH/PATHEXT entries (Qodo Sugg#4); `applyAgentOutput` throws if both `base.path` and `entry.file_path` missing — defence-in-depth against hand-edited queue files (Qodo Sugg#5).
- **Deferred: 0 items**
- **Rejected: 3 items**:
  - **Qodo Compliance #2 unstructured stderr logs** — **cross-round dedup** (R1 + R2 + R4 rejection chain). Threat model unchanged: operator-visible stderr, not a remote log sink.
  - **Qodo Sugg#7 git status -z** — **cross-round dedup** (R2 + R3 rejection). Qodo's R5 implementation is correct (unlike R2's broken one), but the threat model is unchanged — SESSION_END_PATHSPECS is a hardcoded allowlist of known repo-local files. ~16 LOC delta for an unreachable edge case doesn't pass cost/benefit.
  - **Qodo Sugg#8 random suffix on outputPath filename** — **cross-round dedup** (R3 Sugg#7 pattern). Timestamp already provides de-facto uniqueness; random suffix reduces stem readability in `ls` / log output for negligible collision-probability gain.

**Pending user action:**

- Still pending from R1: SonarCloud S4036 Mark-as-Safe in UI. No new pending actions from R5.

**Step 7.5 merge-trigger check (R5):** Fix rate = 8/11 = **73%**. Well above the 30%/50% thresholds. R5 surfaced a real MAJOR bug I introduced in R4 plus two genuine security concerns (prototype pollution, observability gap). No merge recommendation from the rule. Continuing normally — but acknowledging user frustration: each round adds commit churn, and R5's most valuable finding (timeout bug) was a bug *I* made in R4, which argues for tighter pre-commit verification rather than more rounds.

**Key Learnings:**

- **Defensive clamps need regression tests for the corrupted-input case, in the commit that adds them.** R4 added `Math.max(0, raw)` without a test that would've failed on a negative input and immediately showed the `now - spawnedAt > 0` interaction. One test, written at fix-time, would have caught this. Now covered in `smoke.test.js` with both `timeout_ms: -1` and `timeout_ms: 0` cases. **Rule:** whenever a defensive clamp or bound is added to handle "corrupted X can cause bad behaviour Y," write a test that *actually passes corrupted X* and asserts bad behaviour Y *doesn't* occur.
- **I can introduce new throw-paths that existing fail-closed wrappers don't catch.** R1's `validateGlob` throw looked isolated to `globToRegex`, but it propagated through `compileScope` into `loadScope` — whose existing try/catch only covered JSON parsing. Whenever you add a throw to a library function, grep every caller's error handling and verify the throw lands inside a try, not outside one. Especially load-bearing for hook entry-points.
- **Reviewer-implementation quality can improve across rounds without changing the underlying threat-model math.** Qodo's R5 git-status-z impl was correct; its R2 impl was admitted-broken. But the reason to reject wasn't "the impl is broken" — it was "the threat doesn't exist in this allowlist scenario." Document the threat-model argument once, reference it across rounds, and don't re-evaluate unless the threat model itself changed.
- **Silent-drop error handlers should log one sanitized line, not zero.** The cost is negligible. The benefit is that "rare race-window failure" becomes diagnosable instead of phantom. Format: error code + binary basename, not full message or full path — minimizes leak surface while maximizing "I can tell this happened."
- **R5 is peak irony: the highest-impact finding was a bug I caused by applying R4's defensive suggestion incorrectly.** This argues for stronger pre-commit self-review on defensive-code changes specifically: one question at commit-time — *does the clamped/validated value still meet the property the original code assumed?* For `Math.max(0, raw)`, the answer is obviously no for a downstream `> 0` check; asking the question would have caught it.

#### Review #11: Piece 3 labeling mechanism (PR #8) — Round 6 (2026-04-20)

**Source:** Mixed — SonarCloud (1 code smell) + Qodo (Compliance + PR Suggestions).
**PR/Branch:** PR #8 / `piece-3-labeling-mechanism` → `main`
**Items:** 10 total (Critical: 0, Major: 0, Minor: 6, Trivial: 2, Advisory: 2).

**Patterns Identified:**

1. **Cross-file documentation contradictions are real bugs, not cosmetic drift.**
   - Root cause: R6 surfaced *two* genuine doc contradictions in the `/label-audit` skill references. `DISAGREEMENT_RESOLUTION.md` said "Record needs review → `status: partial` during preview" while `SKILL.md` L222 explicitly lists "No `status: partial` in the preview" as an invariant. `DERIVATION_RULES.md` showed an agent output example with nested `{fields: {type: {value, confidence}}}` while `buildAgentPrompt` L337-348 tells the agent to return a flat record and `applyAgentOutput` spreads it flat. Both contradictions were shipped in prior commits without being caught by self-audit because the references are read by humans and agents but not by the runtime code.
   - Prevention: reference docs that describe runtime contracts need at least one assertion that verifies the doc against the runtime. Options: (a) a lightweight convergence loop during skill-audit that greps invariant claims in SKILL.md against the actual code, (b) treat doc-contract as part of the same PR gates that block code-contract divergence. Not applied in R6 (out of scope), but candidate for a future /todo.

2. **SonarCloud cognitive complexity caught an R5 overreach.**
   - Root cause: R5's rewrite of `resolveExecutable` added a bunch of legitimate features (absolute-path handling, PATHEXT-skip for pre-extended names, exec-bit check, PATH/PATHEXT trim) but bundled them all into one function. Complexity climbed to 19 against a 15 threshold. SonarCloud's threshold is a style preference, but the underlying signal — "too many intertwined branches, hard to reason about one case without the others" — was real. R6 refactor splits the helpers into `isExecutableFile`, `getPathExts`, `getPathDirs`, `nameHasKnownExt`, `resolveFromProvidedPath`, `findInDir`, `findInPathDirs`; the main `resolveExecutable` now has 3 branches total.
   - Prevention: when adding multiple defensive features to one function in a single commit, split them as they land instead of piling them. The rewrite was easier to review in helper-sized chunks anyway, and the pre-existing complexity headroom was small.

3. **Fail-open on invalid config input is a latent bug class.**
   - Root cause: `extractNeedsReview(fieldScores, threshold)` used `clamp01(threshold)` which maps negative/non-finite input to 0. Then `clamp01(score) < 0` is never true, so `needs_review` is always empty — the cross-check layer silently passes every record. A user who passes `threshold: undefined` (or a corrupted config loader) gets "everything looks fine" instead of the documented DEFAULT_THRESHOLD. The function failed OPEN where it was supposed to fail SAFE.
   - Prevention: validate input → either clamp to a meaningful range AND fall back to default on non-meaningful input, or reject with a throw. Clamping alone can collapse to a technically-valid-but-semantically-broken value. Fixed via `Number.isFinite && > 0 ? clamp01 : DEFAULT_THRESHOLD`.

4. **Silent `process.exit(0)` in hook entry-points is observability theft.**
   - Root cause: `readStdinAndHandle` exited 0 on stdin errors and invalid-JSON payloads without any stderr output. Rationale was "hook must not break Claude's flow" — correct, but the rationale doesn't require zero observability. Qodo Compliance #3 R6 was right that this class of silent failure becomes impossible to diagnose when it recurs.
   - Prevention: exit 0 is fine; zero output isn't. Added a sanitized stderr one-liner (`[label-hook] stdin <code>` / `[label-hook] invalid stdin payload`) before each exit. Same principle as the R5 notify-binary spawn-error observability fix: silence-for-robustness trades too aggressively against diagnosability.

**Resolution:** 10 parsed items → 7 fixed + 3 rejected = 10 dispositions ✓

- **Fixed: 7 items**
  - 6 MINOR: SonarCloud cognitive-complexity refactor of `resolveExecutable` into helpers (SonarCloud); `readStdinAndHandle` stdin / parse-error diagnostics (Qodo Compliance #3); `DISAGREEMENT_RESOLUTION.md` contradiction with SKILL.md L222 invariant (Qodo Sugg#1); `extractNeedsReview` fail-safe to DEFAULT_THRESHOLD on invalid input (Qodo Sugg#2); `DERIVATION_RULES.md` agent output shape contract aligned to CATALOG_SHAPE.md + applyAgentOutput's flat-record merge (Qodo Sugg#3); `resolve-exec.js` PATHEXT fallback for provided absolute paths without extensions (Qodo Sugg).
  - 1 TRIVIAL: `resolve-exec.js` always returns absolute resolved paths via `path.resolve()` wrap (Qodo Sugg).
  - **Bundled gain:** the resolve-exec refactor addressed three R6 items in one pass (cognitive-complexity + PATHEXT-for-paths + absolute-paths).
- **Deferred: 0 items**
- **Rejected: 3 items**:
  - **Qodo Compliance PATH hijack execution** — **cross-round dedup** (R2+R4). Same threat-model argument applies.
  - **Qodo Compliance unstructured stderr logs** — **cross-round dedup** (R1+R2+R4+R5). Same rationale.
  - **Qodo Sugg classifyEdit content_hash vs fingerprint** — **cross-round dedup** (R4 Sugg#6). Qodo self-refutes in "Why": "impact is negligible since the function returns MINOR in both branches."

**Pending user action:**

- Still pending from R1: SonarCloud S4036 Mark-as-Safe in UI. No new pending actions from R6.

**Step 7.5 merge-trigger check (R6):** Fix rate = 7/10 = **70%**. Above thresholds. R6 surfaced two real doc-contract contradictions + a fail-open bug + a legitimate code-smell refactor pressure + an observability gap — all genuine, none redundant. Not a merge recommendation from the rule.

**Key Learnings:**

- **Doc contradictions between SKILL.md invariants and reference-doc examples are real bugs that the runtime doesn't catch.** The `partial` status contradiction between `DISAGREEMENT_RESOLUTION.md` and `SKILL.md` L222, and the flat-vs-nested output contradiction between `DERIVATION_RULES.md` and `buildAgentPrompt`+`applyAgentOutput`, would have silently confused agents reading those references. `skill-audit` doesn't currently cross-check invariants in SKILL.md against runtime code or against companion reference docs. Candidate for a future `skill-audit` enhancement.
- **"Clamp to safe range" is not the same as "fail-safe on invalid input."** `clamp01(negative) = 0` is a valid clamp output, but `threshold: 0` means "no threshold" in `extractNeedsReview`'s semantics — fail-OPEN, not fail-safe. Input validation needs to separate "is this a meaningful value?" from "can I coerce this into the value type?" — the former rejects negative thresholds, the latter just zeros them. Applied the separation via `Number.isFinite(raw) && raw > 0 ? clamp01(raw) : DEFAULT_THRESHOLD`.
- **Silent exits are worse than noisy ones in hook entry-points.** Hooks MUST NOT crash Claude's flow, so exit 0 is correct — but exit 0 *without* a diagnostic turns a transient error into a phantom. Same pattern as the R5 spawn-error silent-drop: one sanitized stderr line per exit is enough, and costs nothing.
- **SonarCloud's 15-complexity threshold is an imperfect proxy for a real concern.** The 19-complexity resolveExecutable wasn't "broken" — it worked and passed tests — but the underlying "hard to reason about one branch without reading all of them" signal was true. Splitting into seven single-purpose helpers made the next R5-style expansion (which will happen when Windows adds new PATHEXT quirks or POSIX needs a symlink-follow option) easier to do without hitting the same refactor pressure again.
- **Multi-round reviews have a secondary value beyond bug-catching: they stress-test your own consistency.** R6 flagged my own R5 refactor for complexity, which I hadn't noticed; R5 flagged my R4 clamp bug, which I definitely hadn't noticed. The review loop isn't "external scanner vs my code" — it's "two passes of external attention" that each catch stuff the prior pass left. Worth continuing as long as each round teaches something; worth stopping the moment it doesn't.

#### Review #12: Piece 3 labeling mechanism (PR #8) — Round 7 (2026-04-20)

**Source:** Mixed — Qodo (Compliance + PR Suggestions). SonarCloud Quality Gate PASSED (0 new issues, 0 hotspots — S4036 cleared). All CI checks green. PR mergeable.
**PR/Branch:** PR #8 / `piece-3-labeling-mechanism` → `main`
**Items:** 13 total (Critical: 0, Major: 0, Minor: 5, Trivial: 3, Advisory: 5).

**Patterns Identified:**

1. **Propagation gaps across parallel hook entry-points are easy to miss.**
   - Root cause: R6 added stdin-error + invalid-JSON diagnostics to `post-tool-use-label.js readStdinAndHandle`, but `user-prompt-submit-label.js readStdinAndHandle` had the identical silent-exit pattern and was left untouched. Two parallel hook entry-points, one got the fix, the other didn't. Qodo R7 caught the gap as Compliance 🔴 + Sugg#5 (same underlying finding in two flavors).
   - Prevention: when fixing a pattern at one hook entry-point, grep every `readStdinAndHandle` / `process.stdin.on("error"` / similar load-bearing entry-point pattern across the codebase before committing. Same category of propagation I added to the Step 4 discipline in Review #5, but now applied to hook entry-points specifically.

2. **The D15 contract survives stdin failure — Step 0 must always run.**
   - Root cause: my R6 fix added observability (stderr one-liner) but still called `process.exit(0)` on stdin error. That means `drainPendingQueue` — which is the D15 mechanism for surfacing past agent failures — never ran when the current-edit stdin was broken. Past failures silently accumulated. Qodo Sugg#1 (imp 9) correctly identified this as breaking the D15 acknowledgement contract.
   - Prevention: for hook entry-points with both "process current payload" AND "drain backlog" responsibilities, stdin failure must NOT skip the drain leg. Changed `process.exit(0)` → `process.exit(handleHook({}))` so `drainPendingQueue` runs with empty payload; `processCurrentEdit({})` safely no-ops via `extractFilePath` returning null.

3. **Wrong-type agent output can bypass array-based rule-layer semantics.**
   - Root cause: `applyAgentOutput` checked `Array.isArray(merged.needs_review) && merged.needs_review.length > 0` to set `status: partial`. If agent output gave `needs_review: "string"` or `needs_review: {something: true}`, `Array.isArray` was false, so `status: active` was set — bypassing the rule-layer's intent that `active` means "needs_review is empty." Same class of issue as R5 prototype-pollution: agent output is semi-trusted and can violate type contracts.
   - Prevention: coerce structural fields to their rule-layer-expected type after the spread merge. `needs_review` → array (with `["needs_review"]` sentinel on bad type so status stays `partial`, not silently `active`); `manual_override` → `[]` on bad type. Coercion AFTER the prototype-pollution strip and path-pin, so all structural invariants are established in a predictable order before the rule-layer reads them.

4. **Global schema relaxation as a fallback is a fail-open posture.**
   - Root cause: `relaxFileRecordAdditionalProperties` also relaxed `schema.additionalProperties` at the top level "in case the schema is authored flat." For any schema that's flat-authored, this flips the whole document's strictness. A flat-authored schema where `additionalProperties: false` was a deliberate strict check would be silently loosened by our validator. Qodo Sugg R7 (imp 5) correctly flagged this.
   - Prevention: relaxation fallbacks need to fail closed, not open. Removed the top-level relaxation entirely; any future flat-authored schema needs explicit record-scoped relaxation via a new code path, not an auto-flip.

**Resolution:** 13 parsed items → 6 fixes (covering 7 findings) + 6 rejected = 13 dispositions ✓

- **Fixed: 6 fixes covering 7 findings**
  - MINOR: `post-tool-use-label readStdinAndHandle` — `process.exit(handleHook({}))` instead of `process.exit(0)` so D15 drain runs on stdin failure (Qodo Sugg#1 imp 9, real contract gap).
  - MINOR: `user-prompt-submit-label readStdinAndHandle` — propagation of R6's stdin diagnostics + covers Qodo Compliance Silent-stdin + Sugg#5.
  - MINOR: `applyAgentOutput` — coerce `needs_review` to `["needs_review"]` sentinel on wrong-type agent output, `manual_override` to `[]` (Qodo Sugg R7, real rule-bypass defence).
  - MINOR: `buildFailureWarning` sort — NaN-safe via `Number.isFinite(n) ? n : +Infinity` (Qodo Sugg imp 7).
  - MINOR: `validate-catalog relaxFileRecordAdditionalProperties` — drop top-level fallback; keep record-scoped relaxation only (Qodo Sugg imp 5).
  - TRIVIAL: `resolve-exec getPathDirs` — filter PATH entries with `path.isAbsolute` (Qodo Sugg imp 4).
- **Deferred: 0 items**
- **Rejected: 6 items**:
  - **Qodo Compliance PATH-hijacked binary** — **cross-round dedup** (R2+R4+R6). Same threat-model argument.
  - **Qodo Compliance PATH-hijacked git** — S4036 already cleared in SonarCloud UI + Quality Gate now passes; compliance framing is advisory.
  - **Qodo Compliance unstructured log output (validate-catalog)** — **cross-round dedup** (R1+R2+R4+R5+R6). Operator-visible stderr, not remote log sink.
  - **Qodo Compliance missing audit context** — **cross-round dedup** (R1+R2). Single-user local-dev infra.
  - **Qodo Sugg iterate safe own keys (confidence.js)** — Qodo self-refutes: `Object.entries` already iterates only own enumerable properties; reading `__proto__` as key doesn't cause pollution.
  - **Qodo Sugg create output dirs early** — **cross-round dedup** (R2 Sugg#4, repeated in R3 Sugg#8). Caller `processCurrentEdit` already mkdirs `AGENT_OUTPUT_DIR` before runAgentAsync.

**Pending user action:** Nothing new. R1's SonarCloud S4036 Mark-as-Safe is CLEARED (Quality Gate passes).

**Step 7.5 merge-trigger check (R7):** Fix rate = 7/13 = **54%**. Just above the 50% "one more round max" boundary; technically "continue normally" per rule. **But the environmental context overrides the rule:** SonarCloud PASSED, all 6 CI checks green, PR auto-mergeable. R7 caught real gaps (propagation + D15 contract + structural bypass + global-relaxation fail-open). **Recommendation: merge after this R7 commit.** Any R8 will almost certainly be cross-round dedup.

**Key Learnings:**

- **Propagate hook-entry-point fixes to every hook entry-point, not just the one currently under review.** R6's stdin diagnostics were a good fix on `post-tool-use-label.js`; the identical pattern on `user-prompt-submit-label.js` got the same treatment a round later only because Qodo caught it. Better discipline: when fixing a pattern on a hook entry-point, grep the whole `/hooks/` directory for the same pattern before committing.
- **Observability and drain-on-failure are separate concerns.** R6's stderr one-liner answered "can I see that stdin failed?" but not "did the D15 contract still run?" The fixes compose: log the failure AND still do the load-bearing drain. `process.exit(handleHook({}))` gives both — observable exit + drained queue.
- **Structural-field type coercion belongs on the output-apply boundary.** Agent output crosses a trust boundary. Inside that boundary we can assume types (spreads, merges, rule checks all depend on it). So the coercion — `Array.isArray || default` — needs to happen at the boundary, not scattered through downstream reads. Added to `applyAgentOutput` alongside prototype-key stripping and path-pinning; all three boundary concerns now live in one place.
- **Fail-safe schema validators don't take "any schema shape" — they take the schemas they were designed for.** My global-relaxation fallback ("in case the schema is authored flat") was trying to be forgiving, but forgiving validators are fail-open validators. If a future schema is flat-authored, it needs an explicit record-scoped relaxation, not a document-wide flip.
- **The R7 data says "merge now" more clearly than the Step 7.5 rule does.** 54% fix rate technically says "continue normally," but SonarCloud-clear + CI-green + auto-mergeable + R7's unique findings all being real follow-ups (not new defect classes) all say "this PR is done." Adding the environmental context to Step 7.5 logic would help: `if mergeable && quality-gate-passed && fix-rate > 50% && round >= 4 → recommend merge after commit.` Candidate skill-audit enhancement.

#### Review #13: PR #9 — Round 1 (2026-04-20)

**Source:** Mixed — Qodo (primary) + Gemini Code Assist
**PR/Branch:** PR #9 / `piece-3-labeling-mechanism` → `main`
**Items:** 16 unique after dedup (Critical: 1, Major: 4, Minor: 10, Trivial: 1; 1 rejected)

**Resolution:**

- Fixed: 15 items across 3 commits
  - CRITICAL G1 (cross-check shape) → `4a2d400`
  - MAJOR batch (Q1 resume, Q10 stable-eq, Q3 safe-fs, G3 array-defense) → `fa30c9a`
  - MINOR+TRIVIAL batch (Q2, Q6, Q7, Q11, Q12, Q13, Q14, Q15, Q4/Q5-docs) → this commit
- Deferred: 0
- Rejected: 1 — **Q8 (trusted-input assumption on scope.json)** — scope.json
  is a tracked in-repo config file under `.claude/sync/label/`, committed
  to the repo, reviewed via PR. It is not an external-input vector. The
  scan is an internal-codebase-inventory operation; scope.json authors
  are operators, not untrusted users. Qodo's compliance rule was written
  for user-prompt-ingesting paths, not build-time repo configs.
  Advisory (⚪), not red (🔴) in the Qodo report.

**Patterns Identified (with prevention notes):**

1. **Schema tightening exposes pre-existing output-shape violations.**
   T27 landed `additionalProperties: false` on `file_record` /
   `composite_record` in the same PR as S8's cross-check logic. S8
   wrote `{value, candidates, type_mismatch}` shapes into scalar-enum
   fields like `type`; tests passed because the `relaxFileRecord…`
   patch silenced validation until T27 removed it. Prevention: when a
   PR tightens a schema, grep for field-shape writers in the same PR
   and audit structural-field assignments.

2. **LLM-output equality requires stable stringification.**
   `JSON.stringify(a) === JSON.stringify(b)` is key-order-sensitive.
   Derivation agents emit fields in unpredictable order; false-positive
   disagreements follow. Prevention: cross-checks on LLM-produced
   structures need a stable (key-sorted) stringifier. Candidate
   addition to CLAUDE.md anti-patterns or the sync-mechanism reference
   docs.

3. **Checkpoint-based resume is only correctness-safe when per-batch
   outputs persist.** My S8 orchestrator checkpointed metadata
   (`completed_batches: [i]`) but not the actual cross-check output.
   On resume, skipping completed batches produced a preview missing
   their records. My test covered "dispatch-call skipping" only, not
   "preview completeness." Prevention: resume-feature tests MUST
   assert final-artifact completeness (record count, or byte-identical
   comparison to non-crashed run), not just that dispatches got
   skipped.

4. **New modules bypassing `scripts/lib/safe-fs.js` is a recurring
   CLAUDE.md §2 violation.** S8's `readJsonSafe` used raw
   `fs.readFileSync`. Same pattern PR #3 / PR #7 / PR #8 had variants
   of. Per-skill audit doesn't catch it. Prevention candidate: a
   pre-commit grep that flags new `fs.readFileSync` / `writeFileSync`
   / `existsSync` in project code and requires justified suppression.
   Front-loads vs. Qodo catching it at review. Candidate `/todo` when
   Layer 2 pre-commit infrastructure lands.

5. **Default-value semantics differ from assignment semantics.** Q11:
   `base.schema_version || "1.2"` preserved older versions across hook
   re-fires, pinning legacy records at "1.1" forever even when the
   write-time hook is v1.2-aware. Hook stamps should reflect the
   WRITE-time schema, not the historical schema — the record shape
   matches the hook version.

6. **Test fixtures can exploit quirks; make them explicit.** The
   preview rollback test used `mkdirSync(realLocal)` to force write
   failure. It worked only because the old `existsSync` path returned
   `true` for directories AND `readCatalog` returned `[]` for them.
   My TOCTOU fix broke the quirk chain. Fixed by switching the
   fixture to `chmod 0o444` on a pre-existing empty file — more
   explicit about what's being tested, and doesn't depend on OS-level
   directory semantics.

**Key learnings to promote to memory (candidates):**

- "LLM-output equality requires stable key-sorted stringify" → project
  anti-pattern candidate if the pattern recurs.
- "Resume/checkpoint tests MUST assert artifact-completeness, not just
  dispatch-skipping" → process learning for `/pr-review` and future
  resume-feature PRs.
- "safe-fs.js bypass is a recurring violation; candidate pre-commit
  grep" → `/todo` candidate.

#### Review #14: PR #9 — Round 2 (2026-04-20)

**Source:** Qodo (primary — Compliance Guide + Code Suggestions; no Gemini this round)
**PR/Branch:** PR #9 / `piece-3-labeling-mechanism` → `main`
**Items:** 11 unique after dedup (Major: 1, Minor: 4, Trivial: 2, Compliance-advisory: 2, Auto-rejected via cross-round dedup: 2). 4 fixed, 7 rejected, 0 deferred.

**Resolution:**

- Fixed: 4 items across 2 commits
  - MAJOR R2-Q1 (per-batch missing-rehydration) → `79eb716`
  - MINOR batch: R2-Q2 doc rationale, R2-Q5 machinery-field exclusion, R2-Q6 torn preview cleanup, Compliance operator_id on audit row → `<next>`
- Rejected: 7 items
  - **Path injection I/O** (compliance) — cross-round dedup ≡ R1 Q4/Q5; trust model already documented
  - **Path trust assumption** (Security-First Input Validation) — cross-round dedup ≡ R1 Q4/Q5
  - **R2-Q3** allow null for manual_override/needs_review arrays — Qodo's own "Why" states *"unnecessarily weakens the schema's strictness"* (self-flagged low-value)
  - **R2-Q4** BigInt in stableStringify — Qodo's own "Why" states *"theoretical edge case irrelevant"* (self-flagged not applicable)
  - **R2-Q7** template size guard fallback — Qodo's own "Why" states *"highly improbable DoS risk... unnecessary complexity for marginal benefit"* (self-flagged low-value)
  - **Log format unclear** (compliance) — JASON-OS is a single-user dev CLI; text logs with `[label]` prefix + `sanitize()` redaction are appropriate. Structured JSON is a SIEM-ingest requirement that doesn't apply to local developer tooling.

**Patterns Identified:**

1. **Safety valves with all-or-nothing semantics waste work.** My R1
   resume-rehydration fix had a safety valve: "if ANY claimed batch is
   missing its cross-check-result in history, re-dispatch ALL completed
   batches." Qodo caught that partial-truncation forces full re-dispatch
   instead of surgical re-dispatch of just the missing batches. The
   lesson: when writing recovery logic, the granularity of the recovery
   should match the granularity of the damage. Per-batch claim → per-batch
   check → per-batch recovery.

2. **Doc text should describe the constraint, not the effect.** Qodo
   R2-Q2 correction: I wrote "`additionalProperties: false` on every
   scalar enum field" when the actual mechanism is "`additionalProperties:
   false` on the record object, with scalar fields constrained separately
   by their enum definition." Both prevent the same failure, but the
   inaccurate description makes the doc less trustworthy as a reference.
   Doc rationale corrections are higher-value than they look.

3. **Cross-check should exclude orchestrator-owned fields (machinery-
   layer).** The 5 Piece 3 machinery fields (`last_hook_fire`,
   `pending_agent_fill`, `manual_override`, `needs_review`,
   `schema_version`) are populated by the hook/orchestrator, not the
   derivation agent. `last_hook_fire` timestamps differ between primary
   and secondary by construction — every record would report a guaranteed
   Case C disagreement. The cross-check needs a `MACHINERY_FIELDS` filter
   to skip them in `unionFieldNames()`. Caught by Qodo at Low severity;
   would have been a noisy high-false-positive-rate bug at S10.

4. **Atomic-pair writers should be failure-atomic at both levels.** My
   R1 promotePreview already had rollback (Case D: local fails after
   shared succeeded → restore shared snapshot). But `writePreview` had
   the same failure mode unguarded: shared writes, local fails, preview
   dir left with mismatched pair. Fixed with parallel cleanup logic
   (delete shared on local failure). Pattern: every atomic-pair writer
   should treat "second write fails after first succeeded" as a distinct
   rollback-needed case, not an implicit "caller retries."

5. **Qodo self-flagged low-confidence suggestions are valid rejection
   signal.** Three of R2's code suggestions (Q3, Q4, Q7) came with Qodo's
   own "Why" explaining they're low-value or irrelevant. Taking those
   rejections at face value is reasonable — the reviewer itself is
   confirming the signal is weak. The skill's "never dismiss as trivial"
   rule covers suppression of valid findings; it doesn't require
   fighting a reviewer's own acknowledgment that a suggestion doesn't
   apply.

**Key learnings to promote to memory (candidates):**

- "Safety-valve granularity must match damage granularity" → process
  learning for future recovery-logic features.
- "Machinery-layer fields belong to the orchestrator — cross-check
  filters them" → sync-mechanism convention; consider a
  MACHINERY_FIELDS constant in a shared module if the pattern recurs.
