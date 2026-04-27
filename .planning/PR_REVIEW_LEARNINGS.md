# PR Review Learnings

#### Review #20: PR #12 Round 2 — repo-wide PII sweep + Qodo R2 follow-ups (2026-04-27)

**Source:** Qodo (Compliance + PR Code Suggestions)
**PR/Branch:** PR #12 / `fixes-42226` → `main`
**Items:** 11 unique total — 1 critical (operator-PII / absolute-path leak; Qodo flagged 1 file in PR diff, sweep surfaced 37 files repo-wide), 2 verification compliance items (`sanitizeError` audit), 8 code suggestions (importance 3-7).

**Patterns Identified:**

1. **Reviewer scope is the PR diff, but PII patterns are repo-wide.**
   Qodo flagged exactly one file (`D9-context-sync-inventory.md`)
   because that's what PR #12's diff contained. A propagation sweep
   for the same `C:/Users/<username>/...` shape surfaced **37 files
   and 550 occurrences** across `.research/` and `.planning/`,
   accumulated over multiple prior sessions. The lesson: when a
   reviewer flags PII in a research artifact, never assume the
   flagged file is the boundary of the leak — committed research
   directories accumulate operator-state references invisibly. A
   one-shot redaction script + git-ls-files walk catches the whole
   set in seconds; hand-editing one file misses 36.
   - Root cause: research-agent output captures absolute paths from
     filesystem walks verbatim. There's no sanitization step between
     "agent found this absolute path" and "agent writes it into a
     committed JSONL/MD".
   - Prevention: when porting / adapting research-output skills (deep-
     research, repo-analysis, sync-mechanism scans), require absolute
     paths to pass through a placeholder pass before write. The
     `<user>` placeholder convention is mechanical and reversible
     for any operator-local re-resolution.

2. **`sanitizeError`'s Windows pattern only covered the backslash
   form.** The regex set covered `C:\Users\<name>\` (backslashes,
   matching Node fs error output on Windows) but not the
   forward-slash variant `C:/Users/<name>/`. In practice the
   Windows-fs error path uses backslashes so this wasn't an active
   vulnerability — but research artifacts and prose carry the
   forward-slash form (created via `path.join`-then-display
   conversions). Adding the `[A-Z]:\/Users\/[^/\s]+` pattern is a
   non-disruptive hardening that closes the gap before some
   future error-message path constructs the forward-slash form.
   - Root cause: the sanitizer was written for the in-practice error
     surface (Node fs); it didn't anticipate the prose/display
     surface where the same path takes a different shape.
   - Prevention: when adding/auditing sanitization patterns, list
     every shape the same secret/path can take in different
     contexts (errors, logs, stdout prose, JSON, JSONL) and add
     all of them.

3. **Pre-existing port-time documentation drift clusters together.**
   Three of the eight Qodo R2 suggestions were doc-only fixes to
   `repo-analysis/REFERENCE.md`: `schema_version` cell said `"3.0"`
   but the JASON-OS port schema is `"1.0"`; the auth guard rule said
   "always authenticate, never unauthenticated API calls" but the
   same section listed deps.dev as legitimately unauthenticated;
   the example output used a verdict label `Trial` that doesn't
   appear in our schema's verdict enum. **All three were leftovers
   from the SoNash → JASON-OS port that survived because no one
   reads documentation top-to-bottom during a port.** They surface
   only when a reviewer like Qodo specifically cross-references
   prose against schema/code.
   - Root cause: port process trims and adapts content but doesn't
     re-validate every example/cell/rule against the post-port
     reality.
   - Prevention: add a port-time linter pass that grabs every quoted
     value (`"3.0"`, `Trial`, version strings) from REFERENCE.md and
     verifies they appear in the corresponding schema/enum. Scoped
     for post-Foundation tooling, not blocking now.

4. **`npx --no-install` enforces "use the project-installed dep".**
   Markdown commands like `npx repomix --compress ...` look
   deterministic but silently fall through to network install if
   the local install is missing. Adding `--no-install` makes the
   failure visible at exec time instead of producing a wrong-version
   output that looks correct. Same principle applies to any other
   `npx`-invoked tool the skills call.

**Resolution:**

- Fixed: 8 items + 2 verified-PASS (no fix needed)
  - C-1 (PII / absolute-path leak): repo-wide sweep via
    `scripts/one-shot/redact-operator-username.js`. Replaced the
    operator username `jason` with `<user>` in 37 files / 550
    occurrences (all path-shaped contexts only — Windows
    forward-slash, backslash, git-bash, Unix `/Users/`, and Claude
    project-hash forms). Project name `jason-os`/`JASON-OS`,
    user's email, and prose mentions preserved. Added forward-
    slash variant to `sanitizeError`'s SENSITIVE_PATTERNS so
    future error paths in that shape get scrubbed automatically.
    Redaction script kept under `scripts/one-shot/` for
    reproducibility from history.
  - V-1, V-2 (Generic: Secure Error Handling + Secure Logging
    Practices): VERIFIED no fix needed. `sanitizeError` actively
    redacts Linux/macOS home paths, Windows backslash paths,
    credentials, bearer tokens, DB connection strings, env-var
    refs, and internal IPs. Recorded as PASS in this entry.
  - Q-S1 (self-audit unknown source_type fallback):
    `checkBehavioral` now skips state-file lookup entirely with a
    clear warn message instead of probing
    `unknown.<slug>.state.json`.
  - Q-S2 + Q-S4 (repomix command hardening): added `--no-install`,
    `mkdir -p`, and quoted output paths in both SKILL.md (Phase 1)
    and REFERENCE.md (§15.1).
  - Q-S3 (analyzed_at optional default): chained
    `.optional().default(null)` after the existing
    `trim().min(1).nullable()`.
  - Q-S5 (schema_version doc cell): `"3.0"` → `"1.0"` in
    REFERENCE.md.
  - Q-S6 (auth guard wording): clarified to apply to GitHub API
    calls only.
  - Q-S8 (verdict label example): `Trial` → `experimental-subset`.
- Deferred: 0 items.
- Rejected: 1 item — Q-S7 (`superRefine` for candidate-count
  enforcement) with rationale: schema-level enforcement here would
  couple the schema to a depth-specific business rule that already
  lives in `self-audit.js`'s `checkCandidateCount`. Schema's job is
  structural validity; the depth-specific candidate rule is the
  audit's job and produces a clearer pass/fail message there.
  Qodo's own importance score (3) reflects the same trade-off.

**Key Learnings:**

- **A reviewer-flagged PII finding is the start of the propagation
  sweep, not the end.** Qodo only saw 1 file because the PR diff
  only included 1 file. The same pattern lived in 36 others. A
  single regex + `git ls-files` walk found them all. This is the
  pattern for any PII finding in committed research artifacts.
- **Port-time doc drift hides until a reviewer cross-references
  prose against schema.** Three independent doc fixes in
  REFERENCE.md were all leftovers from the SoNash port. Worth a
  port-time linter pass when post-Foundation tooling allows.
- **Idempotent one-shot scripts under `scripts/one-shot/` are the
  right mechanism for repo-wide mechanical replacements.** The
  redaction is reproducible from history (anyone can re-run it),
  the regex is reviewable, and the patterns can be extended as
  new variants surface (case variants, trailing-anchor variants
  surfaced in two retry passes during this round).
- **`npx --no-install` is a small, free win** for any markdown
  command that's claimed to use a project-installed dep. Failure
  modes become visible instead of silent.
- **Sanitization patterns need to enumerate every shape of the
  same secret.** The Windows forward-slash variant slipped past
  `sanitizeError` not because the code was wrong but because the
  pattern set didn't enumerate the prose/display shape of the
  same path.

---

#### Review #19: Sessions 19-23 cross-repo-movement-reframe + repo-analysis port (PR #12) — Round 1 (2026-04-27)

**Source:** Mixed (SonarCloud + Qodo + Gemini)
**PR/Branch:** PR #12 / `fixes-42226` → `main`
**Items:** 24 unique total — SonarCloud 3 (cognitive complexity), Qodo Code Review 4, Qodo PR Compliance 3 (custom-rule failures), Qodo Suggestions 5, Gemini 9. All this-PR origin (no DAS scoring needed). After triage: 22 fixed, 1 deferred via /add-debt (G-2: SKILL.md exceeds 500-line limit), 1 rejected with technical justification (Q-4: uuid override out-of-range — intentional Dependabot resolution).

**Patterns Identified:**

1. **Cognitive-complexity hotspots cluster in main + checkArtifacts +
   checkSchema in CLI scripts.** SonarCloud flagged three functions in
   `scripts/cas/self-audit.js` with cognitive complexity scores of 24,
   21, 16 against a 15-allowed cap. The shape was the same in all three:
   one function held both the "iterate over a static config list of
   things to check" outer loop AND the "decide the verdict + format the
   pass/fail/warn message" inner branching. Splitting by **what gets
   evaluated** (per-MUST-artifact, per-SHOULD-artifact, per-WRONG-name
   for checkArtifacts; loadAnalysisOrFail / checkSchemaVersion /
   runZodValidation / checkCandidateCount / checkMediaSpecific for
   checkSchema; validateSlug / resolveAnalysisDir / readAnalysisMetadata
   / aggregateResults / printAggregate for main) dropped each well below
   15 without touching behavior. The win comes from factoring **the
   per-item verdict into its own helper** — once the loop body is one
   function call, the complexity collapses.
   - Root cause: scripts grew incrementally — one config list at a
     time. Each addition added a new branch to the same function rather
     than extracting because "it's still small."
   - Prevention: when a script's per-item-evaluation function reaches
     more than two distinct verdict shapes (pass / fail / warn /
     special-case), eagerly extract `evaluateOne(...)`. This pattern
     transfers to all CAS handler scripts and any future linter-style
     pipelines.

2. **Schema-validator strictness gap: required strings accepted empty +
   whitespace.** `analysis-schema.js` declared every required identifier
   field as `z.string()` with no `.min(1)` / `.trim()`. The Zod
   schema accepted `""` and `"   "` for `id`, `slug`, `title`,
   `summary`, `creator_view`, etc., which would only surface downstream
   when a self-audit assertion or human reader hit the empty value.
   Pattern for any Zod schema: required string fields that act as
   identifiers or content MUST chain `.trim().min(1)` so the validator
   rejects whitespace-only content at the boundary, not three layers
   deeper.
   - Root cause: schema written greenfield with the assumption "writers
     populate these correctly" — true for the happy path but not for
     coercion edge cases.
   - Prevention: add `.trim().min(1)` to every required string in
     analysis-schema.js as part of port hardening; check the same
     pattern when porting/writing future schemas (extraction journal,
     synthesis ledger, etc.).

3. **Path-handling security debt clusters around four
   primitives.** Qodo and SonarCloud's security pass on
   `scripts/cas/self-audit.js` independently surfaced four related
   gaps: (a) absolute path leaked in error message → use slug instead;
   (b) `existsSync` in `findBrokenHomeRefs` follows symlinks → use
   `refuseSymlinkWithParents` + `lstatSync`; (c) `fs.existsSync(dir)`
   on the analysis directory check is TOCTOU + symlink-following → use
   `lstatSync` + `isDirectory` in one call; (d) `safeReadText` did not
   verify regular-file before delegating to readUtf8Sync. **All four
   reduce to: at every filesystem boundary, refuse symlinks AND verify
   file type AND avoid leaking absolute paths in user-facing
   strings.** The four feel separate but are one pattern.
   - Root cause: scripts used the JASON-OS safe I/O helpers but only
     in the obvious read paths — auxiliary paths (existence checks,
     error messages, parent-directory checks) drifted to raw `fs.*`
     calls.
   - Prevention: when porting scripts, audit every `fs.existsSync`
     and every error-message-with-path string. The grep for both is
     30 seconds and catches this whole pattern at once.

4. **DAS framework + delegated-accept worked as designed.** All 24
   items were this-PR origin, so DAS scoring was only needed for the
   single Gemini structural deferral (G-2 / DEBT D3). DAS = 2
   (Recommend act) + user delegation = filed cleanly to debt log
   without further interaction. The split between "fix now" and "track
   as debt" stayed crisp because the debt entry preserved DAS scoring
   in the notes field for future reviewers.

**Resolution:**

- Fixed: 22 items
  - SonarCloud cognitive-complexity refactor (S-1, S-2, S-3) — split
    `checkArtifacts`, `checkSchema`, `main` in `scripts/cas/self-audit.js`
    into focused helpers; complexity scores all under 15 now.
  - Qodo Q-1 (error swallowing in getDepth) → main now reads metadata
    once and surfaces non-ENOENT errors via `console.error`.
  - Qodo Q-2 (zod missing as production dep) → already moved to
    `dependencies` via `npm install zod`; lockfile updated.
  - Qodo Q-3 (candidate-type prose drift) → SKILL.md Phase 6 prose
    aligned with `analysis-schema.js` enum (six types listed: pattern,
    knowledge, architecture-pattern, design-principle,
    workflow-pattern, tool).
  - Qodo Q-4 (uuid override out-of-range) → REJECTED: uuid v14 is
    API-compatible with v8 for node-notifier's `uuid.v4()` usage; the
    semver mismatch is the intentional cost of resolving Dependabot
    alert #1.
  - Qodo Compliance QC-1 (abs-path leak) → main prints
    `slug` not `dir`.
  - Qodo Compliance QC-2 (process_feedback content logged) → only
    length is logged now.
  - Qodo Compliance QC-S1 (state-file path containment) →
    `validatePathInDir(STATE_DIR, stateRel)` before the join.
  - Qodo Suggestions QS-1 (strict slug validation) → `SLUG_RE`
    regex + `.`/`..` rejection at entry.
  - Qodo Suggestions QS-2 (existsSync follows symlinks) →
    `pathExistsRefusingSymlinks` helper.
  - Qodo Suggestions QS-3 (race-safe directory check) →
    `refuseSymlinkWithParents` + `lstatSync` + `isDirectory` in
    `resolveAnalysisDir`.
  - Qodo Suggestions QS-4 (safeReadText regular-file enforcement) →
    `lstatSync` + `isFile` check before `readUtf8Sync`.
  - Qodo Suggestions QS-5 (schema strictness) → `.trim().min(1)` on
    every required string + nested array of strings in
    `analysisRecordCore` and `candidateSchema`.
  - Gemini G-1 (`.research/analysis/*/source/` not in .gitignore) →
    rule added.
  - Gemini G-3 (SKILL.md repomix command) → corrected to
    `npx repomix --compress --output <slug>/repomix-output.txt`.
  - Gemini G-4 (REFERENCE.md repomix command) → same fix.
  - Gemini G-5 (`_shared/` path drift in active skills) → propagation
    sweep across `deep-plan`, `skill-audit`, `skill-creator`,
    `repo-analysis` — all `_shared/` references corrected to
    `shared/`.
  - Gemini G-6 (Invocation Tracking section in SKILL_STANDARDS.md)
    → rewritten to JASON-OS-native `safeAppendFileSync` pattern.
  - Gemini G-7 (`_shared/` in AUDIT_TEMPLATE.md) → fixed.
  - Gemini G-8 (MASTER_DEBT cross-reference DEFERRED) → marker added
    pointing at `.planning/DEBT_LOG.md` as the v0 stub.
  - Gemini G-9 (TDMS Intake DEFERRED) → marker added; v0 close-out
    uses `/add-debt` per accepted finding.
- Deferred: 1 item — DEBT D3 (G-2: SKILL.md exceeds soft line cap, 590
  vs ~500 target). DAS = 2, user delegated.
- Rejected: 1 item — Q-4 (UUID semver override) with technical
  justification: uuid v14 is API-compatible with v8 for the
  `uuid.v4()` call shape that node-notifier uses; the override is the
  intentional resolution of Dependabot alert #1.

**Key Learnings:**

- **Cognitive-complexity refactors are mostly mechanical when the
  loop body becomes a helper.** All three S-* items reduced cleanly
  by extracting the per-item verdict logic. No semantic changes,
  no behavior changes — just reshape. This is the pattern for any
  CAS handler script that grows past 200 lines.
- **Run propagation sweeps before committing path-rename fixes.**
  G-7 surfaced because the `_shared/` rename hit two files in the
  initial fix but four others in active skills. The Critical Rule 7
  propagation sweep caught the rest in 30 seconds via one Grep call.
  Without it, the next /skill-audit invocation would have hit a
  broken link.
- **Filesystem boundary hardening clusters into one pattern.** The
  four QS-* security items (QS-2, QS-3, QS-4, plus QC-1's
  abs-path leak) all reduce to: refuse symlinks, verify type,
  hide absolute paths from output. When porting CAS scripts that
  use `fs.existsSync` or print paths in errors, audit all four
  patterns simultaneously rather than treating them as separate.
- **Zod schemas need `.trim().min(1)` on identifier strings as a
  default.** The `analysisRecordCore` change validated against the
  smoke-test artifact without breaking the existing record — this
  is non-disruptive hardening that should be the porting default,
  not a post-review patch.
- **DAS framework + delegated-accept handled the structural debt
  cleanly.** G-2 was the only deferral and the DAS score (2,
  Recommend act, user delegated) plus debt entry preserved the
  reasoning for the next refactor pass.

---

#### Review #18: Sessions 15-18 structural-fix + back-fill machinery (PR #11) — Round 1 (2026-04-23)

**Source:** Mixed (Qodo + Gemini)
**PR/Branch:** PR #11 / `fixes-42226` → `main`
**Items:** 13 unique (Critical: 2, Major: 5, Minor: 5, Architectural: 1).
After triage: 11 fixed, 1 deferred (D2), 1 rejected.

**Patterns Identified:**

1. **Untrusted-input plumbing missing at agent → filesystem boundary.**
   The back-fill pipeline ingests structured JSON from primary +
   secondary derivation agents, but the layers between agent output and
   on-disk mutation lacked confinement guards in three places: dep-name
   `existsSync` probe in `applyRuntimeGuards` (path traversal),
   `applyArbitration`'s `rec[field] = …` assignment (prototype pollution
   + arbitrary field overwrite), and the synthesize/aggregate CLIs that
   resolve user-supplied paths through raw `fs.writeFileSync`. The
   pattern: **anywhere agent output flows into a filesystem call OR a JS
   property accessor, the value is untrusted and needs a confinement /
   allowlist guard.** Verify.js + derive.toRepoRelative had the
   precedent; the synthesis-side code didn't reuse it.
   - Root cause: piece-3 added new agent-flow paths (S8 back-fill
     orchestrator, S10 arbitration apply) that didn't inherit the
     verify.js confinement pattern because they live in different files
     and were written sequentially without a security-pass dedicated to
     "where does agent output land?"
   - Prevention: when adding new agent-receiving code, run a one-pass
     audit answering "where does this value flow?" — any reach into
     `fs.*`, `path.resolve`, or `obj[varKey]` needs a guard. Could be a
     hook (PreToolUse on Write/Edit) that flags `fs.writeFileSync(`
     outside `scripts/lib/` and prompts for safe-fs migration.

2. **`isPathShaped` heuristic used POSIX-only path detection.**
   `dep.name.includes("/")` missed Windows-style absolute paths like
   `C:\Windows\System32\cmd.exe`, so adding `validatePathInDir` in front
   wasn't enough — the absolute path slipped past the heuristic and
   never reached the guard. Extended to also check `path.isAbsolute()`
   and backslash. Future similar heuristics should default to "if it
   could be a path on any OS, treat it as path-shaped."

3. **Empty arrays vs null is a real schema distinction the synthesis
   layer collapsed.** Schema v1.3 lets `dependencies` / `tool_deps` /
   `external_services` be `[]` legitimately, but `isMissingValue([])
   → true` pushed agreed-empty fields into Case F coverage gaps. The
   downstream effect: mechanical merge proposals that should have
   sailed through were blocked, inflating the user-decision queue.
   Schema-aware classification needs to treat the empty case separately
   from the null case.

4. **Property-order-sensitive dedup keys leak duplicates from LLMs.**
   `setUnion` used `JSON.stringify(v)` as the seen-set key. LLM-emitted
   objects don't share canonical key order between primary and
   secondary agents, so the same semantic value produces different
   strings and dedupe fails. Pattern: any time an LLM-produced object
   array gets deduplicated, the key must be order-stable. Added
   `stableStringify` helper.

5. **Disagreement records dropped path on successful cross-checks.**
   cross-check emits `{ path }` for unreachable records and
   `{ preview: { path }, disagreements: [...] }` for successful ones.
   `aggregate-findings` read `r.path` for both — every disagreement on
   a successful record shipped with `path: undefined`, breaking
   downstream synthesis which keys off path. Two-shape outputs always
   need fallback access patterns.

**Resolution:**

- Fixed: 11 items
  - Commit 1 (CRITICAL): items 4 (path confinement) + 6 (proto
    pollution) + bundled 2 (unresolved-gap gate) + 9 (undefined coerce).
  - Commit 2 (MAJOR + opportunistic MINOR): items 1 (safe-fs migration)
    + 5 (empty array) + 10 (disagreement path) + propagation sweep
    catching aggregate-findings.js + orchestrate.js writes; piggy-backed
    items 3 (JSON parse logging), 11 (stableStringify), 12 (conditional
    0% prose) since they touched the same files.
  - Commit 3 (MINOR + docs): item 13 (multi-language test detection in
    derive.js) + this learning entry + state file.
- Deferred: 1 item — D2 (audit trail for `applyArbitration`).
  Architectural call: defer until JASON-OS has a real audit/observability
  subsystem so we don't ship a one-off format. User chose option B.
- Rejected: 1 item — Qodo compliance "Unstructured log output" on
  synthesize-findings.js stderr writes. v0 foundation-stage CLI with no
  log consumer; structured logs would be over-engineering before the
  observability subsystem lands. Revisit when consumer exists.

**Key Learnings:**

- **Security threat model in Step 0 caught the cluster.** Pre-paste
  threat-model pass flagged the three vectors (path traversal, proto
  pollution, helper-bypass) before triage — when the reviewers' items
  arrived they slotted directly into the threat categories rather than
  needing per-item severity arguments. Cheap pre-step, big triage win.

- **Propagation sweep saved a follow-up review round.** Qodo flagged
  raw `fs.writeFileSync` in synthesize-findings.js only; grep across
  `.claude/sync/label/backfill/` found the same pattern in
  aggregate-findings.js + orchestrate.js. Fixed all three in one
  commit. Without the sweep, R2 would have gotten "same issue in sibling
  CLI" items.

- **Cross-batch overlap is real.** Items 8 (JSON parse log), 11
  (setUnion dedup), 12 (conditional 0% prose) were MINOR but lived in
  the same file as MAJOR fixes. Bundling them into the MAJOR commit
  rather than waiting for a MINOR pass produced one logical commit
  instead of two opening-and-closing the same file.

- **Existing tests can encode wrong behavior.** The smoke test asserted
  `tools/statusline/statusline_test.go` → `tool-file` (documenting the
  Go test miss). Multi-language fix had to update that assertion. When
  fixing a heuristic, audit existing assertions for the OLD behavior
  before declaring victory.

- **Pre-existing failure visibility matters.** A pre-existing
  `buildSynthesisPrompt` test failure ("Approve or reject?" gate
  language missing from synthesis-agent-template.md) showed up in every
  test run. Confirmed via `git stash` that it predates this PR. Should
  surface as a separate /todo entry rather than getting lost in the
  noise of PR-review test cycles.

---

#### Review #17: Piece 3 structural-fix + migration-skill deep-research (PR #10) — Round 2 (2026-04-21)

**Source:** Qodo (Gemini did not post on R2)
**PR/Branch:** PR #10 / `piece-3-labeling-mechanism` → `main`
**Items:** 11 unique (Critical: 1, Major: 0, Minor: 4, Trivial: 0, + 2 R1 dedups, + 4 Qodo-self-rejected)

**Patterns Identified:**

1. **Absolute user-path PII leak across research artifacts (repo-wide).**
   Qodo flagged `C:\Users\jbell\.local\bin\JASON-OS\...` paths in
   `D6-cas-skills-deep.md` and `RESEARCH_OUTPUT.md`. Propagation sweep
   showed the same pattern in 60 files with 782 total occurrences —
   spanning `.research/migration-skill/` (this PR), `.research/jason-os-
   mvp/` (prior PR), `.research/file-registry-portability-graph/`
   (prior PR), and `.planning/piece-2-schema-design/PLAN.md`.
   - Root cause: research findings include source-provenance blocks
     that were serialized with absolute paths from the author's
     workstation, across both operator locales (`jbell` and `jason`)
     and both bin layouts (`.local/bin/` and `Workspace/dev-projects/`).
   - Prevention: deep-research output serialization should use
     placeholders (`<JASON_OS_ROOT>`, `<SONASH_ROOT>`,
     `<JASON_OS_CLAUDE_SESSION_ROOT>`) from the start — store the
     operator's working directory resolved against the placeholder set,
     never the raw `process.cwd()`. Candidate gate: pre-commit regex
     refusing `C:\\Users\\\w+\\` in tracked artifacts (honor-only until
     implemented).

2. **Qodo self-rejecting suggestions are a distinct disposition class.**
   Four R2 suggestions had Qodo-authored rationale arguing AGAINST
   applying them (importance 1-2, with prose like "arbitrary
   alteration," "redundant with gapPursuitRefs," "using magic strings
   is an anti-pattern"). These are not false positives — Qodo flagged
   the anomaly AND flagged that the proposed fix is wrong. Correct
   disposition is REJECT with Qodo's own rationale cited. Observed
   four times in a single round (C-147b, C-150b, C-138 UNREGISTERED,
   C-143b).
   - Prevention: add an implicit "if Qodo importance ≤ 2 AND Qodo
     self-explanation argues against the fix, auto-REJECT with Qodo
     rationale" rule to `/pr-review` Step 2. Avoids wasted triage
     cycles on items Qodo itself doesn't endorse.

3. **Cross-round stale-diff dedup working as designed.** Two R2
   "compliance WHITE" items (Secure Error Handling, Secure Logging
   Practices) are exact file+rule dupes of R1 items 4 and 5 — both
   already rejected with full technical justification. Auto-rejected
   without re-triage cycles. Saved a round of investigation.

4. **Qodo technical claim verification still matters.** Qodo's
   "unrestricted file read path" item (WHITE) claimed the CLI
   positional-arg heuristic could misidentify a flag value as the
   JSONL path. Traced the normalization logic: after `--flag=VALUE`
   expands to `[--flag, VALUE]`, the heuristic `prev.startsWith("--")`
   correctly skips VALUE. The attack scenario Qodo described cannot
   trigger. Rejected with technical justification rather than
   applied-without-thinking. R1 Learning #5 (validate critical claims)
   reaffirmed.

5. **Off-by-one introduced during R1 constant extraction.** R1 commit
   a6685a0 renamed `records.length > 3` to `records.length >
   MIN_RECORDS_FOR_DEGENERATE_CHECK` (keeping `>`), but the constant
   name ("MINIMUM records to trigger") reads as "`>=` semantics." Qodo
   caught the name/operator mismatch. Fixed to `>=` and added a
   boundary test at exactly 3 records. Minor behavior change: now
   fires at 3 records (previously needed 4). Alignment with constant
   name > behavior preservation here because the original `> 3` was a
   quiet bug.
   - Prevention: when extracting magic numbers, re-read the operator
     against the new name — `MIN_*` almost always wants `>=`, `MAX_*`
     almost always wants `<=` or `<`.

**Resolution:**

- **Fixed: 3 items**
  - CRITICAL: PII path scrub (60 files, 782 replacements)
  - MINOR: degenerate-check operator (`>` → `>=`) + boundary test
  - MINOR: C-140b confidence "HIGH (v1.1 only)" → `confidence:"HIGH"` + `confidenceNote:"v1.1 only"`
- **Deferred: 0 items**
- **Rejected: 8 items** (with justification):
  - **Secure Error Handling (R1 item 4 dup):** cross-round dedup.
    `sanitize()` routes through canonical `scripts/lib/sanitize-
    error.cjs` with SENSITIVE_PATTERNS redaction.
  - **Secure Logging Practices (R1 item 5 dup):** cross-round dedup.
    `formatReport` printing record paths IS the verifier's core
    function.
  - **Unrestricted file read path:** technical claim incorrect —
    normalization makes the positional heuristic correct; deeper
    "CLI jsonlPath not repo-root-bounded" concern is outside the
    operator-invoked debug-CLI trust model (matches safe-fs.js
    TRUST MODEL).
  - **C-147b HIGH+empty sourceIds (Qodo self-rejects):** Qodo's own
    rationale — "arbitrary alteration; evidence field already
    contains detailed justification."
  - **C-150b id split (Qodo self-rejects):** Qodo's own rationale —
    "string identifiers like `C-150b` are standard, lexicographically
    sortable; splitting adds unnecessary schema complexity."
  - **Cache validators at module level:** `getValidators()` already
    caches via `cachedValidator` at `validate-catalog.js:45`. Qodo
    acknowledged this possibility in its own importance-6-but-low
    rating.
  - **C-138 S-UNREGISTERED placeholder (Qodo self-rejects):** Qodo's
    own rationale — "adding a dummy value like `S-UNREGISTERED` is
    an anti-pattern; `gapPursuitRefs` already captures this."
  - **C-143b unregisteredSourceIds (Qodo self-rejects):** Qodo's own
    rationale — "redundant with `gapPursuitRefs` which already
    tracks `G1`."

**Commit breakdown:**

- `088a077` CRITICAL: PII path scrub across 60 files
- `<commit-B>` MINOR: off-by-one + C-140b normalization + learning log

**Key Learnings:**

- **PII in research output is a repo-wide concern, not a per-PR one.**
  60 files with 782 occurrences across 3 PRs' worth of research
  artifacts. Fixed all in one sweep because partial scrubbing would
  just re-surface the same finding on the next unrelated PR. Generalize:
  repo-wide security fixes should not be deferred to "later" — the
  reviewer bot will re-file on every subsequent PR touching the same
  trees.
- **Qodo self-rejection is a legitimate signal.** Low-importance
  suggestions with Qodo-authored prose explaining why the fix is
  wrong should skip manual triage entirely. Four instances in one
  round — likely a pattern across all Qodo-reviewed repos.
- **R1 fix quality matters for R2 noise.** The off-by-one caught here
  was introduced by R1's own constant-rename commit. Qodo's
  incremental-suggestion mode caught it because the constant NAME
  made the OPERATOR wrong. Lesson: constant-extraction should re-read
  the comparison operator against the new name, not just swap in the
  symbol.
- **Cross-round dedup saves real effort.** Two R1-rejected items
  re-filed on R2 by Qodo (stale-diff); auto-rejected with prior
  justification reference. Skill v4.6 dedup logic is doing load-
  bearing work — keep it.

**Source:** Mixed — Qodo + Gemini Code Assist
**PR/Branch:** PR #10 / `piece-3-labeling-mechanism` → `main`
**Items:** 13 total (Critical: 1, Major: 2, Minor: 6, Trivial: 4)

**Patterns Identified:**

1. **Trust-boundary code skipping helper stack (recurring).** `verify.js` is
   a verifier at the agent-output trust boundary, yet it did ad-hoc
   `process.argv` parsing and raw `fs.readFileSync` — exactly the pattern
   flagged in Review #1 on the bootstrap port. The per-skill self-audit
   pattern (MI-5) still does not catch helper-bypass in new files.
   - Root cause: `scripts/lib/` helpers are discoverable-by-convention only;
     authors default to `node:fs` when sketching a verifier.
   - Prevention: this is the second PR surfacing the exact same anti-pattern
     (PR #3 R1 L1, PR #10 R1 Qodo #1). Candidate for an ESLint `no-restricted-
     imports` rule banning `node:fs`/`process.argv` in `.claude/**/*.js` and
     `scripts/**/*.js` once the lint stack lands — honor-only discipline is
     losing this bet.

2. **Path-traversal at agent-output boundary (new pattern).** `record.path`
   is agent-supplied relative path; prior code did `path.join(repoRoot,
   record.path)` then ran `fs.existsSync/statSync/readFileSync` on the
   result with no traversal guard. Fixed by adding `validatePathInDir`
   from security-helpers BEFORE any fs ops. Hoisting the abs resolution
   meant both 2a (existence) and 2b (type heuristic) share one guard.
   - Prevention: for any future trust-boundary code reading paths from
     agent output, `validatePathInDir` MUST run first. Add to the
     security-helpers usage doc.

3. **Multi-source convergence rule fired again.** Qodo #3 (existsSync +
   swallowed catch) and Gemini inline comment on lines 127-129 both flagged
   the same block. Second PR where multi-source convergence pointed at a
   real reliability issue (Review #1 had M1/M2/M3 elevations). The rule is
   paying its keep.

4. **Branch divergence across locales was a pre-edit blocker.** Local
   `piece-3-labeling-mechanism` HEAD was 8 commits behind remote (work done
   on another locale and pushed). `verify.js` did not exist locally despite
   being in the PR diff. Detected via `gh pr view --json files` showing
   ADDED files absent from working tree, then `git fetch` + fast-forward
   merge. Fast-forward was clean (no conflicts, no lost work) because local
   had zero divergent commits — the cross-locale pattern works when each
   locale pulls before pushing.
   - Prevention: PR-review Step 0 should include `git fetch origin
     <branch> && git status -uno` to detect behind-remote state before any
     fs operation. Current skill assumes working tree matches the PR diff.

5. **Non-destructive content normalization via scripted transformer.**
   User accepted items 6-8 (claims.jsonl edits) with the constraint "fix
   as long as it's not destructive." Solved via a one-shot Node transformer
   that: (a) normalized `"MEDIUM-HIGH"` → `"MEDIUM"` preserving the
   downgrade narrative in the `evidence` field, (b) split `G1`/`GV1` gap-
   pursuit refs out of `sourceIds` into a new `gapPursuitRefs` sibling
   field (all info preserved, none dropped), (c) added `supersededBy` to
   C-091 without deleting the superseded claim. 21 of 156 claims touched;
   0 information loss. Backup `.bak` kept during the run, deleted after
   verification.

6. **Gemini IS in the active reviewer set** (D23 stale). pr-review skill
   v4.6-jasonos-v0.1 scope note claims CodeRabbit + Gemini excluded; user
   confirmed Gemini runs on every review. Memory updated.

**Resolution:**

- **Fixed: 13 items** (across 3 commits — CRITICAL separate, MAJOR batch,
  MINOR+TRIVIAL+content batch)
- **Deferred: 0 items**
- **Rejected: 2 items** (with justification):
  - **Qodo compliance #4** (speculative `sanitize(err)` leak in CLI stderr):
    `sanitize()` routes through canonical `scripts/lib/sanitize-error.cjs`
    which applies SENSITIVE_PATTERNS redaction (home paths, credentials,
    bearer tokens, DB connection strings, env var refs, internal IPs).
    Not a raw-message leak. The Qodo finding was conditional on impl;
    verified impl is correct.
  - **Qodo compliance #5** (speculative `formatReport` record-path logging):
    Printing record paths IS the verifier's core function — the whole point
    is to show which records failed verification and why. Paths are the
    identification unit for human operators triaging bad agent output.
    Repo-relative paths, not filesystem-absolute.

**Commit breakdown:**

- `8a65129` CRITICAL: path traversal guard (item 2)
- `11cac84` MAJOR: scripts/lib helpers for CLI + content read (items 1, 3)
- `<commit-C>` MINOR + TRIVIAL + content (items 4/5 rejected, 6-10, 12-14)

**Key Learnings:**

- **Second confirmation that external review catches helper-bypass that
  self-audit misses.** Same verify.js author wrote safe-fs.js consumers
  correctly in other files but reverted to `node:fs` here. The anti-pattern
  isn't a knowledge gap — it's a vigilance gap. Mechanical enforcement
  (ESLint) is the lever; docs and self-audits aren't.
- **Cross-locale divergence is a quiet PR-review failure mode.** "Fast-
  forward from remote first" should be in Step 0, not discovered at edit
  time when Edit/Read errors surface a missing file.
- **Content transforms on research output need a tight non-destructive
  contract.** Adding fields, renaming enum values when narrative preserved
  elsewhere, and marking supersession relationships are all safe. Dropping
  claims, overwriting evidence text, or inventing S-NNN mappings (Qodo
  suggested the latter for item 7) would be destructive and were refused.
  Codify this for any future `/pr-review` round touching `.research/*.jsonl`.
- **Oversize-file test needs an in-repo >256 KB candidate.** First pass
  skipped the test; second pass found `.research/sync-mechanism/.../D20d-
  dep-map-merged.jsonl`. Worth documenting in REFERENCE for future
  verifier test authors.


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
   `C:/Users/<user>/` across the repo surfaced 6 instances in
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
  absolute `C:/Users/<user>/Workspace/dev-projects/sonash-v0/...` with
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

#### Review #15: PR #9 — Round 3 (2026-04-20)

**Source:** Qodo (only)
**PR/Branch:** PR #9 / `piece-3-labeling-mechanism` → `main`
**Items:** 10 unique after dedup (Minor: 7, Compliance: 3; 0 Critical / 0 Major / 0 Trivial)

**Resolution:**

- Fixed: 6 items (1 commit — MINOR batch)
  - R3-Q1/Q2 machinery field count "6 → 5" (propagation: 2 templates + DERIVATION_RULES.md)
  - R3-Q4 undefined → null normalization in cross-check.js
  - R3-Q5 prompts.js `sanitizeError(string)` misuse
  - R3-Q6 audit failed promotion attempts (try/catch + failure row)
  - R3 PII compliance — hash operator_id with SHA-256 (replaces R2's plain username)
- Rejected: 4 items
  - **Path traversal writes** / **Path trust contract** — cross-round dedup ≡ R1 Q4/Q5 + R2 path-injection
    (3rd iteration of same speculative concern; trust model docblock already explains)
  - **R3-Q3 RESUME.md port-skill paths** — **STALE**: paste was from an earlier file version; current RESUME.md already uses `migration-skill` in instruction text; remaining `port-skill` references are intentional rename-documentation (lines 53-55) and historical transcript notes
  - **R3 Partial audit coverage** — architecturally scoped: promote has explicit JSONL audit (this PR); override audit is documented in `OVERRIDE_CONVERSATION_EXAMPLES.md` as Claude-runtime behavior (not code to commit); hook writes ARE the catalog (the record IS the audit; no secondary log needed)

**Patterns Identified:**

1. **Reviewer contradicts itself across rounds.** R2 Qodo asked to add
   `operator_id` to the audit row (Comprehensive Audit Trails). R3 Qodo
   flagged the same `operator_id` as PII risk. Both are valid concerns
   from different angles; the fix is to do BOTH (actor identity +
   non-reversible). SHA-256 hash with explicit `sha256:` prefix
   satisfies: same actor → same hash (forensic signal preserved) AND
   username never leaks. Key learning: when reviewer round-over-round
   concerns look contradictory, check if the underlying
   compliance objectives can be harmonized before rejecting either. A
   hash is often the bridge.

2. **Stale reviewer diffs persist even within active PR rounds.** R3-Q3
   flagged `port-skill` paths in RESUME.md that the user had already
   corrected. Qodo was reviewing an earlier version of the file than
   current HEAD. My stale-HEAD check (skill MUST) caught it, but only
   after I started investigating. Pre-Step-2 would have been faster.
   Consider: for every code-snippet item, grep current HEAD for the
   flagged pattern BEFORE triaging — if absent, auto-classify as stale.

3. **Speculative-attacker concerns recur across rounds despite explicit
   rejection.** Path traversal / path trust has now been flagged on
   R1 / R2 / R3. Each rejection documented a specific trust model.
   Each round Qodo re-surfaces the same underlying advisory. The
   skill's cross-round dedup correctly auto-rejects, but the reviewer
   cycle costs attention. Candidate mitigation: a project-local
   `.qodo/` suppression config entry that silences the rule for the
   specific files whose trust model is documented. Would require
   operator authorization (not a code change). /todo candidate.

4. **Word-count inaccuracies in LLM-prompt text are high-impact.** R3-Q1
   ("6 machinery fields" → "5") is rated 9/10 by Qodo. The reasoning:
   the prompt goes to derivation agents, and an inaccurate field count
   can cause the agent to hallucinate a missing field. Prevention:
   when updating schema counts in code (e.g. T27 added 5 machinery
   fields), grep for every text reference that mentions the count —
   `grep -rn "N Piece 3"` after any schema-adjacent change.

5. **`undefined` has lossy JSON serialization.** R3-Q4 caught a subtle
   bug: my cross-check field-read assumed `hasOwnProperty` implied
   non-undefined, but a record with an explicit `foo: undefined`
   property passes hasOwnProperty and carries `undefined` forward.
   `JSON.stringify` drops `undefined` values → the field silently
   vanishes during serialization. Always normalize `undefined → null`
   at the boundary when the target format is JSON. Worth adding to
   project anti-patterns if recurrent.

**Key learnings to promote to memory (candidates):**

- "Reviewer concerns that look contradictory can sometimes harmonize via
  hashing / tokenization" → process learning.
- "Stale-HEAD pre-check: grep the flagged snippet at current HEAD before
  triaging" → `/pr-review` Step 1 enhancement candidate.
- "Prompt-text word-count inaccuracies are high-impact — LLMs infer
  structure from the count" → document in sync-mechanism prompt-
  engineering notes when they exist.
