# D17b Findings: Root Config Files + Dotdirs

**Agent:** D17b
**Profile:** codebase
**Date:** 2026-04-18
**Scope:** Root-level config files (~37 files), .husky/, .vscode/, .gemini/, .claude/ root-level docs and JSON state files

---

## SECURITY FLAGS (Read First)

Two files contain live credentials and must be addressed:

**FLAG 1 — CRITICAL: `firebase-service-account.json`**
- Contains a live RSA private key and Google service account for the `sonash-app` Firebase project.
- The file IS listed in `.gitignore` (`firebase-service-account.json` and `serviceAccountKey.json` both listed).
- Verification needed: confirm the file has never been committed on any branch. Run `git log --all -- firebase-service-account.json` to verify.
- The private_key_id is `9ac5842e...` — if this was ever committed, the service account key MUST be rotated in the Firebase console.
- Do NOT port or include this file in any sync. Not portable.

**FLAG 2 — HIGH: `.env.local`**
- Contains live GitHub PAT, SonarCloud token, and Context7 API key.
- File IS gitignored (`.env*.local` pattern in `.gitignore`).
- These are real working tokens — verify they have not appeared in any commit via `git log --all --follow -p .env.local`.

**FLAG 3 — MEDIUM: `.env.production`**
- Contains live Firebase API key (`AIzaSyD...`) and App ID for the production `sonash-app` project.
- NEXT_PUBLIC_ prefix means these are client-exposed by design in Firebase/Next.js architecture.
- If the repo ever goes public, these should be rotated (they are tied to Firebase App Check and security rules).

---

## Config Taxonomy

### Lint + Format Configs (portable or sanitize-then-portable)

| File | Purpose | Portability |
|------|---------|-------------|
| `.markdownlint.json` | Permissive MD rules (25 disabled) for Claude skill doc compatibility | portable |
| `.markdownlintignore` | Ignores docs/archive, .claude dirs, node_modules | sanitize-then-portable |
| `.prettierrc` | Standard formatting (semi, double-quotes, 100 chars, LF) | portable |
| `.prettierignore` | Ignores build, Firebase, lock files, .research/ | sanitize-then-portable |
| `.oxlintrc.json` | Oxlint fast-linter — 6 generic rules + ignorePatterns | sanitize-then-portable |
| `eslint.config.mjs` | Full ESLint flat config with custom `sonash/*` plugin rules | not-portable-product |

**JASON-OS port note:** `.markdownlint.json`, `.prettierrc` are drop-in portable. `eslint.config.mjs` requires porting the `eslint-plugin-sonash` package — the 20+ rule taxonomy (no-raw-error-log, no-unguarded-file-read, no-path-startswith, etc.) directly maps to JASON-OS security anti-patterns and should be factored as a portable ESLint plugin.

### Firebase Configs (not-portable-product)

| File | Purpose |
|------|---------|
| `.firebaserc` | Project alias: default → sonash-app |
| `firebase.json` | Hosting (static export), Functions (nodejs22), Firestore rules, Storage rules with security headers |
| `firestore.rules` | Row-level security: owner-scoped reads, Cloud Function-only writes for sensitive collections |
| `firestore.indexes.json` | 12 composite indexes + 4 field overrides across SoNash collections |
| `storage.rules` | Deny-by-default, user-owned /users/{uid}/ files |

**Notable:** `firebase.json` contains a well-designed security headers block (HSTS, X-Frame-Options DENY, X-Content-Type-Options, Permissions-Policy) that is reusable as a reference pattern for any static hosting deployment.

**Notable:** `firestore.rules` security model (all writes `allow create, update: if false` for sensitive collections, forcing Cloud Function path) is a strong security pattern worth documenting as a methodology reference.

### MCP Configs (sanitize-then-portable)

Three MCP-related files exist at root (plus `.mcp.json.bak`):

| File | Format | Key Content |
|------|--------|-------------|
| `.mcp.json` | Active | memory + sonarcloud servers. Note: auto-discovered MCPs not listed. |
| `.mcp.json.bak` | Backup | Uses `${SONAR_TOKEN}` env-var substitution pattern |
| `.mcp.json.example` | Full template | 9 servers with inline docs, empty-string secret placeholders |
| `mcp.json.example` | Older template | Same 9 servers, less documentation |

**Duplication:** `.mcp.json.example` and `mcp.json.example` overlap. Two example files for the same purpose. Consolidation opportunity.

**Portable pattern:** `.mcp.json.example` is the best model for JASON-OS's own `.mcp.json.example` — it uses empty-string placeholders for secrets (never real values), includes inline `_description` and `_setup` commentary per server, and covers the full set of useful MCP servers.

**Portability note:** The active `.mcp.json` has only 2 entries because Claude Code auto-discovers Firebase, GitHub, Context7, Playwright, and Episodic Memory via the plugin system — they don't need explicit entries. This distinction (auto-discovered vs. manually-registered) is important for JASON-OS's own MCP setup documentation.

### TypeScript/Build Configs (not-portable-product)

| File | Notes |
|------|-------|
| `tsconfig.json` | Next.js strict mode, bundler resolution, @/* path alias |
| `tsconfig.test.json` | Extends base, CommonJS output, explicit test file includes |
| `tsconfig.tsbuildinfo` | Auto-generated incremental cache (gitignored) |
| `next-env.d.ts` | Auto-generated Next.js types (gitignored) |
| `next.config.mjs` | Static export mode, dotenv .env.local load |
| `postcss.config.mjs` | @tailwindcss/postcss (Tailwind v4) |
| `components.json` | shadcn/ui new-york style, lucide icons |
| `framer-motion.d.ts` | Type shim for framer-motion v12 + React 19 |
| `web-speech-api.d.ts` | Web Speech API TypeScript declarations |

### Other Configs

| File | Type | Notes |
|------|------|-------|
| `.nvmrc` | Node version pin | `22`. Directly matches JASON-OS. |
| `.lsp.json` | LSP config | typescript-language-server for .ts/.tsx/.js/.jsx |
| `.gitattributes` | Line endings | text=auto + LF for *.sh + .husky/*. Portable. |
| `.gitignore` | Ignore rules | See section below. |
| `.test-baseline.json` | Tech debt registry | 80+ scripts without test coverage. SoNash-specific. |
| `knip.json` | Dead code detection | Next.js entry points, 24 ignored deps |
| `geocoding_cache.json` | Product data cache | Nashville address → lat/lng. Not portable. |
| `package.json` | NPM manifest | 90+ scripts, Next.js/Firebase dep graph |
| `package-lock.json` | NPM lockfile | Not portable |

---

## .gitignore Analysis

The `.gitignore` contains both portable Claude Code infrastructure patterns and SoNash product patterns interleaved. Key portable sections for JASON-OS:

```gitignore
# Claude Code ephemeral state
.claude/state/session-notes.json
.claude/state/handoff.json
.claude/state/hook-runs.jsonl
.claude/state/commit-failures.jsonl

# Claude Code hook cache files (ephemeral)
.claude/hooks/.context-tracking-state.json
.claude/hooks/.agent-trigger-state.json
# ... 8 more hook state files

# Claude Code session runtime
.claude/tmp/
.claude/session-activity*.jsonl
.claude/multi-ai-audit/

# Claude Code local settings
.claude/settings.local.json

# GSD plugin (local-only)
.claude/agents/gsd-*.md
.claude/commands/gsd/
# etc.

# Git worktrees
.worktrees/
.claude/worktrees/

# Research artifacts (all committed — Decision 2026-04-02)
# [explicitly NOT ignoring .research/**]

# Session alert state
.claude/pending-alerts.json
.claude/pending-mcp-save.json
.claude/hooks/.auto-save-state.json
```

**Notable:** The `# Research artifacts — all committed for traceability (Decision 2026-04-02)` comment explicitly explains a decision to commit all research artifacts. JASON-OS follows this pattern.

**Notable:** `nul` (Windows artifact from command redirects) is explicitly gitignored — cross-platform awareness baked in.

---

## .husky/ Comparison: SoNash vs. JASON-OS

### File counts

| Repo | Files | Complexity |
|------|-------|------------|
| SoNash | 4 files: `_shared.sh` (10KB), `pre-commit` (39KB), `pre-push` (33KB), `post-commit` (1KB) | Very complex |
| JASON-OS | 3 files: `_shared.sh` (2KB), `pre-commit` (1.4KB), `pre-push` (5KB) | Simple |

Both also have `.husky/_/` (husky v9 internals, auto-generated).

### Key SoNash .husky capabilities JASON-OS lacks

1. **`_shared.sh` — SKIP_CHECKS infrastructure:** Single `SKIP_CHECKS="check1,check2"` variable consolidates all check bypasses. Validated with SKIP_REASON (min 10 chars, max 500 chars, single-line only, no control chars). JASON-OS has SKIP_REASON validation but not the consolidated SKIP_CHECKS CSV.

2. **pre-commit — HOOK_OUTPUT_LOG:** Redirects all hook output to `.git/hook-output.log` so failures are visible in CI/agent contexts where stderr is invisible.

3. **pre-commit — Wave 3 timing:** `date +%s%N` nanosecond timing per check, writes `hook-runs.jsonl` telemetry. JASON-OS has no timing.

4. **pre-commit — add_exit_trap:** POSIX-safe EXIT trap chaining that captures `HOOK_EXIT` before any command overwrites `$?`. Fixes a subtle shell bug where cleanup traps fire before failure capture.

5. **post-commit — warning resolver:** `scripts/resolve-hook-warnings.js` runs after every commit to auto-clear stale hook warnings. Prevents pre-push escalation gate from blocking on warnings that the commit just fixed.

6. **pre-push — Escalation gate (Wave 0):** Blocks push on any unacknowledged `error`-level warnings in `.claude/hook-warnings.json`. No equivalent in JASON-OS.

### Recommendation for JASON-OS

Port in order of priority:
1. `_shared.sh` SKIP_CHECKS/SKIP_REASON infrastructure (highest value, hooks into all checks)
2. `add_exit_trap` pattern (prevents $? clobber bug)
3. `HOOK_OUTPUT_LOG` pattern (CI visibility)
4. `post-commit` warning resolver (if JASON-OS adopts hook-warnings.json)

---

## .vscode/ Analysis

Two files, both tracked (despite .prettierignore ignoring .vscode/):

| File | Content | Portability |
|------|---------|-------------|
| `settings.json` | SonarLint connected mode (project-specific), git.ignoreLimitWarning, claudeCode.useTerminal:true | sanitize-then-portable |
| `mcp.json` | VS Code MCP: context7, puppeteer, playwright via ensure-fnm.sh | sanitize-then-portable |

**Note:** `.vscode/mcp.json` is listed in `.gitignore` as gitignored, but the listing command showed it exists in the working tree. It may be a file that was tracked before the gitignore rule was added. Status unclear — the file is present but should be gitignored.

**Portable pattern:** VS Code `mcp.json` uses a `promptString` input for `CONTEXT7_API_KEY` — this is the VS Code-native way to handle secrets without committing them, equivalent to Claude Code's env-file pattern.

---

## .gemini/ Analysis

| File | Content | Portability |
|------|---------|-------------|
| `config.yaml` | Gemini Code Assist config — MEDIUM severity threshold, unlimited comments, skip drafts, memory enabled | sanitize-then-portable |
| `styleguide.md` | SoNash-specific code review guide — stack versions, architecture rules, anti-patterns | not-portable-product |

**JASON-OS port gap:** JASON-OS does not have `.gemini/` configured. The `config.yaml` structure (severity threshold, comment limits, draft behavior) is fully portable after stripping SoNash-specific ignore patterns.

**Styleguide pattern:** The `.gemini/styleguide.md` format (explicit stack versions with "do NOT flag as outdated" instruction, critical anti-patterns with severity labels, security model section) is an excellent template for JASON-OS's own Gemini styleguide, even though the content is product-specific.

---

## .claude/ Root-Level Docs

### COMMAND_REFERENCE.md (v6.1, 2026-04-15)
- **Purpose:** Lightweight index of all skills and commands (109KB → index format per AI-5.1 optimization)
- **Portability:** The index-over-duplication pattern is portable. The content (100+ SoNash-specific skills) is not.
- **JASON-OS:** JASON-OS needs its own COMMAND_REFERENCE.md. The trimmed-index format is the right approach.

### CROSS_PLATFORM_SETUP.md
- **Status:** Partially deprecated — references `scripts/sync-claude-settings.js` which was removed 2026-02-23.
- **Portability:** The problem it addresses (Windows CLI vs Linux web consistency) is directly relevant to JASON-OS. The manual merge pattern (merge `settings.global-template.json` into `~/.claude/settings.json`) is the current correct approach.
- **JASON-OS:** Should adopt a similar doc but without the deprecated sync script references.

### HOOKS.md (v2.0, 2026-02-23)
- **Content:** Documents all hook event types and configurations from settings.json.
- **Notable:** Lists 5 event types including `UserPromptSubmit` — SCHEMA_SPEC only lists PreToolUse, PostToolUse, SessionStart, Stop, SubagentStop, Notification, PreCompact. `UserPromptSubmit` is a SoNash-specific or newer event type not in the schema spec.
- **Portability:** Hook documentation methodology is portable. Event types and hook scripts are SoNash-specific.

### REQUIRED_PLUGINS.md
- **Content:** 21 `claude-code-workflows` plugins + episodic memory + serena (disabled).
- **Status:** References removed sync script. Plugin list is SoNash's recommendation.
- **JASON-OS:** Should have its own REQUIRED_PLUGINS.md. The document pattern is portable; the specific plugin list is a user preference.

### STATE_SCHEMA.md (v1.3, 2026-04-05)
- **Status explicitly STALE:** "covers ~15 of 113 files." The doc itself acknowledges incompleteness.
- **Two-tier architecture documented:** `.claude/hooks/.*` (ephemeral, per-session) vs `.claude/state/*` (persistent, survives compaction). This architecture distinction is highly portable for JASON-OS.
- **JASON-OS:** Should adopt the two-tier state architecture and document it from the start, avoiding the 113-file drift SoNash experienced.

---

## .claude/ Root-Level JSON State Files

| File | Scope | Status | Notes |
|------|-------|--------|-------|
| `settings.json` | project | active | Full hook wiring, permission allow/deny lists |
| `settings.global-template.json` | user | active | Template for ~/.claude/settings.json |
| `settings.local.json` | machine | active | Gitignored, Windows Go binary permissions |
| `tool-manifest.json` | project | active | 14 modern CLI tools, fully portable |
| `alerts-acknowledged.json` | project | active | Alert system session state |
| `hook-warnings.json` | project | active | Active warnings (1 TDMS S0 debt warning) |
| `mcp.global-template.json` | user | active | Template for ~/.claude/mcp.json |
| `override-log.jsonl` | project | active | Gate bypass audit trail |
| `session-activity.jsonl` | project | gitignored | Session start telemetry |

**settings.json deny list (directly portable to JASON-OS):**
```json
"deny": [
  "Bash(git push --force *)",
  "Bash(git push origin main)",
  "Bash(git reset --hard *)",
  "Bash(rm -rf *)"
]
```

**tool-manifest.json** — fully portable. JASON-OS should adopt this directly to inform hook preference for modern CLI tools.

---

## JASON-OS Port Gaps

Priority-ordered based on value:

| Item | Priority | Action |
|------|----------|--------|
| `settings.json` deny list | HIGH | Port allow/deny lists to JASON-OS settings.json |
| `tool-manifest.json` | HIGH | Port directly as-is |
| `.husky/_shared.sh` SKIP_CHECKS infrastructure | HIGH | Port to JASON-OS _shared.sh |
| `.husky/post-commit` pattern | HIGH | Add post-commit warning resolver |
| `.markdownlint.json` | MEDIUM | Port directly |
| `.prettierrc` | MEDIUM | Port directly |
| `.gitignore` Claude Code section | MEDIUM | Merge portable Claude Code patterns |
| `.gemini/config.yaml` | MEDIUM | Create JASON-OS version |
| `.mcp.json.example` pattern | MEDIUM | Create JASON-OS .mcp.json.example |
| `STATE_SCHEMA.md` methodology | MEDIUM | Document two-tier state architecture from start |
| `COMMAND_REFERENCE.md` index format | LOW | Create JASON-OS version as skills grow |
| `.gitattributes` LF enforcement | LOW | Already in JASON-OS |
| `eslint-plugin-sonash` (via eslint.config.mjs) | LOW | Port as package when JASON-OS needs linting |
| `.gemini/styleguide.md` pattern | LOW | Create JASON-OS styleguide template |

---

## Learnings for Methodology

1. **Security sweep should be first read, not last.** `firebase-service-account.json` was read first per instructions — this was correct. The two-step: (a) check gitignore for the file, (b) verify it hasn't been committed on any branch, should be explicit steps in the methodology.

2. **`.env.production` is a medium-severity flag class**: NEXT_PUBLIC_ values are client-exposed by Firebase design, so they're not "secrets" in the traditional sense. But they're real project identifiers that constrain rotation if leaked. The distinction between "client-safe public config" and "genuine secret" needs a classification in the schema — possibly a `secret_bearing_public` flag for NEXT_PUBLIC_ style env vars.

3. **Duplicate example files are a red flag for methodology drift.** `.mcp.json.example` (at root dot) and `mcp.json.example` (at root no-dot) have diverged in quality — the dot version has better inline documentation. Future scans should check for duplicate-purpose files and flag consolidation opportunities.

4. **`.claude/plans/` vs `.planning/` divergence:** SoNash stores plans in `.claude/plans/` while JASON-OS uses `.planning/` at project root. This is a structural divergence that D22 (schema surveyor) should track. The SCHEMA_SPEC coverage matrix assigns `.planning/` to D15a-b but has no entry for `.claude/plans/` — it falls under "`.claude/` other: D17a-b" which is what we're covering here.

5. **`UserPromptSubmit` event type is not in SCHEMA_SPEC.** HOOKS.md lists it as a 5th hook event type (SessionStart, PreToolUse, PreCompact, PostToolUse, UserPromptSubmit). D22 should update the schema spec enum for hook `event` field.

6. **127 state files vs. 15 documented** is a technical debt indicator pattern worth tracking cross-repo. The STATE_SCHEMA.md explicitly self-annotates as STALE. This level of documentation drift is predictable when state files accumulate faster than documentation. JASON-OS should enforce a rule: every new state file requires a STATE_SCHEMA.md entry.

7. **The override-log.jsonl contains a historical user/path leak.** Entries reference `C:\\Users\\Owner\\workspace\\sonash` (a different machine user). This is expected for a committed audit trail but is something to note when porting: the audit trail carries machine-specific paths. Sanitization rule for cross-locale portability.

8. **.vscode/ gitignore conflict:** `mcp.json` in `.vscode/` is listed in `.gitignore` but the file is present. This could indicate it was tracked before the rule, or the gitignore pattern is incorrect. Worth verifying with `git check-ignore -v .vscode/mcp.json`.

9. **Scope sizing was correct.** 37 root config files + 3 dotdirs + 9 .claude/ state files + 5 .claude/ docs = ~54 items. This was a full-day scope appropriate for one agent. A split into D17b-root and D17b-dotdirs would have been reasonable but not necessary.

---

## Gaps and Missing References

1. **firebase-service-account.json commit history not verified.** Read permission confirmed the file exists and contains live credentials. Git log `--all` check not run (would require bash). This should be explicitly verified by the operator.

2. **.vscode/mcp.json gitignore status unverified.** The file exists but should be gitignored. `git check-ignore` not run.

3. **.claude/projects/ internal structure not fully read.** Only listed top-level dir (`C--Users-<user>-Workspace-dev-projects-sonash-v0/`). Contents likely mirror user-home memory structure. D18 or D23 should investigate.

4. **.claude/config/ file contents not individually read.** Three files listed (high-churn-watchlist.json, hook-audit-suppressions.json, propagation-intentional-divergence.json) but only enumerated, not read. Their schemas may be relevant to D22's data contract analysis.

5. **`.claude/plans/` plan files not individually read.** Enumerated: archive/, automation-gap-closure/, learning-system-overhaul/, hook-systems-audit-implementation.md, learning-effectiveness-analyzer.md, pr-ecosystem-audit-plan.md. These overlap with .planning/ covered by D15a-b — potential double-coverage or gap.

6. **package-lock.json** not checked for security issues. Assumed auto-generated and not portable per instructions.

---

## Confidence Assessment

- HIGH claims: 28 (file contents directly read)
- MEDIUM claims: 8 (inferences from content patterns)
- LOW claims: 2 (unverified state: .vscode/mcp.json gitignore, firebase-service-account.json git history)
- UNVERIFIED claims: 0
- Overall confidence: HIGH
