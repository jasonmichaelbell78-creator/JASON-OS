# G3 — Hooks Extraction (Gap Pursuit)

**Gap type:** missing-sub-question + low-confidence
**Profile used:** codebase
**Confidence:** HIGH (G3 user-prompt-handler), MEDIUM (G4 post-write-validator partial)

## Summary

`user-prompt-handler.js` is 718 LOC with 6 sub-functions. Four are fully portable
with only path/config edits; one (`runAlerts`) is partially portable pending a
stub for `pending-alerts.json`; one (`runAnalyze`) is SoNash-coupled in its
directive table but the coupling is confined to ~60 lines and the dispatch
infrastructure is generic and parameterizable. Among the 5 PostToolUse hooks
in scope, 3 are fully portable (`governance-logger`, `loop-detector`,
`post-read-handler`), 1 is conditionally portable pending a `/todo` stub
(`post-todos-render`), and 1 (`post-write-validator`, 1205 LOC) splits cleanly
into a generic core (7 validators) and a SoNash-specific plugin (3 validators)
— investigation of 3 validators was incomplete and is noted below.

---

## Detailed Findings

### Item G3: user-prompt-handler.js Extraction

#### Source file
`sonash-v0/.claude/hooks/user-prompt-handler.js` — 718 LOC (confirmed)

#### Top-level structure
- Lines 1–43: stdin/argv bootstrap, prompt normalization, `stdoutParts` array
- Lines 44–142: `runAlerts()`
- Lines 145–439: `runAnalyze()`
- Lines 442–516: `runSessionEnd()`
- Lines 519–641: `runPlanSuggestion()`
- Lines 644–654: `runGuardrails()`
- Lines 657–700: `runFrustrationDetection()`
- Lines 703–718: `main()` — calls all 6 in order

#### Single shared dependency
`require("./lib/symlink-guard")` — `isSafeToWrite` used by cooldown/state writes
in runAlerts, runAnalyze, runSessionEnd, runPlanSuggestion.

**Status in JASON-OS:** `.claude/hooks/lib/symlink-guard.js` EXISTS. This
dependency is already satisfied.

No other lib imports. No Firebase, no TDMS, no Firestore, no npm script calls.
The bootstrap is pure Node.js stdlib (fs, path, stdin).

---

#### Sub-function portability audit

**1. `runGuardrails()` — lines 644–654 — FULLY PORTABLE**

What it does: Injects 5 behavioral rules as stdout context on every non-trivial
turn. Skips short acknowledgments ("ok", "yes", "thanks").

External dependencies: None. Pure string push to `stdoutParts`.

Coupling: The guardrail text references SKILL.md — that file exists in JASON-OS.
No agent names. No file reads/writes. No state files.

Extraction effort: Zero edits required. Copy as-is.

LOC: ~11 active lines.

---

**2. `runFrustrationDetection()` — lines 657–700 — FULLY PORTABLE**

What it does: Detects ALL-CAPS prompts, correction phrases ("did you just",
"revert", "undo"), and repeated punctuation with negative sentiment. Emits
`HARD STOP` directive to stdout.

External dependencies: None. Regex matching against `userPrompt`/`requestLower`.
No file I/O.

Coupling: Zero SoNash references. The detection patterns are behavioral, not
project-specific.

Extraction effort: Zero edits required. Copy as-is.

LOC: ~44 active lines.

---

**3. `runSessionEnd()` — lines 442–516 — FULLY PORTABLE**

What it does: Pattern-matches closure phrases ("that's all", "done for now",
"goodbye", etc.) against `requestLower`. Emits `SESSION ENDING` stdout
directive and a stderr banner. Uses a 60-minute cooldown state file at
`.claude/hooks/.session-end-cooldown.json`.

External dependencies:
- Writes `.claude/hooks/.session-end-cooldown.json` (auto-created, no prior setup needed)
- Uses `isSafeToWrite` from symlink-guard (already in JASON-OS)

Coupling: The stderr banner mentions `/session-end` skill. JASON-OS does not
have this skill yet (it is a Layer 1 item), but the hook fires harmlessly —
it just reminds the user to run a skill. The hook is not blocked by skill
absence; it degrades gracefully to a no-op suggestion.

Extraction effort: Zero edits required. The `/session-end` reference in the
banner is advisory, not a hard dependency.

LOC: ~75 active lines including cooldown logic.

---

**4. `runPlanSuggestion()` — lines 519–641 — FULLY PORTABLE**

What it does: Detects multi-step complexity (impl keywords + structural
complexity patterns + word count > 50). Emits `MULTI-STEP TASK DETECTED`
stdout directive and stderr banner. Uses 4-hour per-complexity-signature
dedup via `.claude/hooks/.multistep-dedup.json`.

External dependencies:
- Writes `.claude/hooks/.multistep-dedup.json` (auto-created)
- Uses `isSafeToWrite` from symlink-guard

Coupling: The stderr banner mentions "Plan mode" and `/deep-plan`. Both exist
in JASON-OS. Zero SoNash-specific content.

Extraction effort: Zero edits required.

LOC: ~123 active lines.

---

**5. `runAlerts()` — lines 44–142 — PARTIALLY PORTABLE**

What it does: Checks `pending-alerts.json` vs `alerts-acknowledged.json` for
unacknowledged alerts. Also checks `.context-tracking-state.json` for 20+
files read and `pending-mcp-save.json` for pending MCP saves. Emits combined
warnings. Uses 10-minute cooldown.

External dependencies:
- Reads `.claude/pending-alerts.json` — ABSENT in JASON-OS
- Reads `.claude/alerts-acknowledged.json` — ABSENT in JASON-OS
- Reads `.claude/hooks/.context-tracking-state.json` — written by `post-read-handler.js`; absent until that hook is wired
- Reads `.claude/pending-mcp-save.json` — absent until MCP save workflow exists
- Writes `.claude/hooks/.alerts-cooldown.json` (auto-created)
- Uses `isSafeToWrite`

Coupling: The alert-count sub-path is SoNash-workflow-specific. The
context/MCP-save sub-path is fully portable (references generic "save to MCP
memory" pattern that JASON-OS already uses).

Behavior if files absent: All reads are try/catch with silent fallback. If
`pending-alerts.json` doesn't exist, the alerts block is skipped. If
`.context-tracking-state.json` doesn't exist, `contextFilesRead` is 0 and
the MCP-save nudge is skipped. The function degrades gracefully to a no-op
with zero errors.

Extraction effort: Can wire as-is. Create stub `pending-alerts.json` with
`{"alerts":[]}` to silence the code path cleanly. The context-tracking path
activates automatically once `post-read-handler.js` is wired.

LOC requiring edits: 0 lines need editing; 1 stub file needed.

---

**6. `runAnalyze()` — lines 145–439 — PARTIALLY PORTABLE (needs targeted edits)**

What it does: Keyword-matching NLP scan over the user prompt. Dispatches
`PRE-TASK: MUST use [X]` directives to stdout via `emitDirective()`. Uses
15-minute per-directive dedup. Also emits advisory `suggestStderr()` hints
(4-hour dedup). Total 7 priority tiers.

**Every agent/skill name emitted — full inventory:**

| Priority | Keywords that trigger | Directive emitted | Type |
|----------|----------------------|-------------------|------|
| 1 (strong) | security, authentication, xss, vulnerability, etc. | `PRE-TASK: MUST use security-auditor agent` | MANDATORY |
| 1 (weak+context) | auth, token, secret + security/login/protect | `PRE-TASK: MUST use security-auditor agent` | MANDATORY |
| 1 (weak alone) | auth, token, secret (no security context) | `Hint: ...consider using security-auditor agent` | ADVISORY stderr |
| 2 (strong) | bug, broken, crash, debug, stack trace | `PRE-TASK: MUST use systematic-debugging skill FIRST` | MANDATORY |
| 2 (phrases) | "fix bug", "fix error", "failing test" | `PRE-TASK: MUST use systematic-debugging skill FIRST` | MANDATORY |
| 3 (strong) | database, migration, sql, postgres, mysql, mongodb | `PRE-TASK: MUST use database-architect agent` | MANDATORY |
| 3 (firestore) | firestore + query/rule/index/schema | `PRE-TASK: MUST use database-architect agent` | MANDATORY |
| 4 (strong) | frontend, css, styling, layout, tailwind | `PRE-TASK: MUST use frontend-design skill` | MANDATORY |
| 4 (component) | component/button/form + create/build/add | `PRE-TASK: MUST use frontend-design skill` | MANDATORY |
| 5 | architect, implement-feature, new-feature | `Hint: Consider using Plan agent for multi-step work` | ADVISORY stderr |
| 6 | "explore the", "understand how", "walk me through" | `Hint: Consider using Explore agent` | ADVISORY stderr |
| 7 | "write test", jest, cypress, playwright | `Hint: Consider using test-engineer agent` | ADVISORY stderr |

**Cross-reference against JASON-OS `.claude/agents/`:**

| Agent/skill referenced | Exists in JASON-OS? |
|------------------------|---------------------|
| `security-auditor` agent | NO — not in agents dir |
| `systematic-debugging` skill | NOT CONFIRMED (not in agents dir; may be a SKILL.md) |
| `database-architect` agent | NO |
| `frontend-design` skill | NOT CONFIRMED |
| `Plan` agent | NO — not in agents dir |
| `Explore` agent | NO — not in agents dir |
| `test-engineer` agent | NO |
| `code-reviewer` (suggestStderr, indirect) | NO |

JASON-OS agents dir contains only: `contrarian-challenger.md`,
`deep-research-final-synthesizer.md`, `deep-research-gap-pursuer.md`,
`deep-research-searcher.md`, `deep-research-synthesizer.md`,
`deep-research-verifier.md`, `dispute-resolver.md`, `otb-challenger.md`.
All 8 are deep-research pipeline agents, not workflow agents.

**Portability consequence:** Wiring `runAnalyze()` as-is emits mandatory
`PRE-TASK: MUST use security-auditor agent` directives for agents that do not
exist. Claude receives these as system context before responding and may
attempt to invoke nonexistent agents. This is CH-C-004's core concern —
confirmed by line-level inspection.

**Can it be parameterized?**

Yes. The dispatch table is driven by 7 priority blocks. The agent/skill names
appear in ~8 `emitDirective()` and ~6 `suggestStderr()` call sites between
lines 299 and 438. The matching keywords are already plain arrays (`securityStrong`,
`bugStrong`, `dbStrong`, `uiStrong`) that could be externalized. The
`emitDirective()`/`suggestStderr()` calls are the hardcoded coupling points.

Parameterization approach: Replace the 7 priority blocks with a config-driven
loop reading from `.claude/hooks/analyze-directives.json`. Each entry would
specify: `{ priority, keywords[], phrases[], matchType, directive, type }`.
This would reduce `runAnalyze()` from ~295 LOC to ~80 LOC of dispatch logic +
a config file. The config file can be JASON-OS-specific with only the agents
that exist.

Effort to parameterize: ~2-3 hours. Alternatively, a near-term stub approach
(see extraction plan below) costs ~30 minutes.

---

#### Extraction Plan

**Phase A — Wire now (< 1 hour total):**
Port `runGuardrails`, `runFrustrationDetection`, `runSessionEnd`,
`runPlanSuggestion`. These 4 sub-functions are copy/paste portable. Wire the
UserPromptSubmit hook in `settings.json`. Create stub
`.claude/pending-alerts.json` with `{"alerts":[]}` so `runAlerts()` degrades
cleanly. Wire all 5 (excluding `runAnalyze`) plus the bootstrap harness.

Stub `runAnalyze` in the extracted file:
```js
function runAnalyze() {
  // STUB: Directive table not yet configured for JASON-OS agents.
  // Wire analyze-directives.json once workflow agents exist.
  // See .research/jason-os-mvp/findings/G3-hooks-extraction.md
}
```

**Phase B — Wire runAlerts fully (< 30 min):**
Once `post-read-handler.js` is wired (writes `.context-tracking-state.json`),
`runAlerts()` context-tracking path activates automatically. No code changes
needed — just wire `post-read-handler.js`.

**Phase C — Parameterize runAnalyze (2-3 hours, defer until agents exist):**
Create `analyze-directives.json` with only agents that exist in JASON-OS.
Replace the 7 hardcoded priority blocks with a config-driven loop. As new
agents are added to JASON-OS, add entries to the config file without touching
the hook logic. This directly addresses CH-C-008: during exploratory phase,
keep the config file empty or advisory-only (`type: "hint"` vs `type: "mandatory"`).

**Feature flag for CH-C-008:**
Add `ANALYZE_ENFORCEMENT=advisory|mandatory` env var (or state file entry) that
gates whether `emitDirective()` pushes to stdout (mandatory) or stderr
(advisory). Default `advisory` during sessions 1-10. Flip to `mandatory` once
workflow is stable. This addresses the enforcement-vs-exploratory tension
directly without preventing the hook from being wired.

**LOC to edit in the extracted file:**
- Stub `runAnalyze()`: replace 295 LOC with ~5 LOC stub = net -290 LOC from SoNash source
- Extracted file total: ~425 LOC (down from 718)
- New stub files needed: 1 (`pending-alerts.json`), 1 (`analyze-directives.json` — empty initially)
- Lib files needed: `symlink-guard.js` — already present in JASON-OS

**Test surface:**
- Unit-testable: frustration detection regex (no file I/O)
- Integration-testable: session-end cooldown (writes state file)
- Behavioral smoke test: pipe sample prompts through the hook, verify stdout

---

### Item G4: PostToolUse Tripwire Web (5 hooks in scope)

Hooks in scope: `governance-logger.js`, `loop-detector.js`, `post-read-handler.js`,
`post-todos-render.js`, `post-write-validator.js`.
Excluded per brief: `commit-tracker.js`, `compact-restore.js`, `pre-compaction-save.js`.

Line counts confirmed:
- `governance-logger.js`: 300 LOC
- `loop-detector.js`: 323 LOC
- `post-read-handler.js`: 392 LOC
- `post-todos-render.js`: 235 LOC
- `post-write-validator.js`: 1205 LOC

SoNash PostToolUse wiring (from `sonash-v0/.claude/settings.json`):
- Write → `post-write-validator.js $ARGUMENTS` (CLAUDE_TOOL=write)
- Edit → `post-write-validator.js $ARGUMENTS` (CLAUDE_TOOL=edit)
- MultiEdit → `post-write-validator.js $ARGUMENTS` (CLAUDE_TOOL=multiedit)
- Read → `post-read-handler.js $ARGUMENTS`
- Write/Edit CLAUDE.md or settings.json → `governance-logger.js` (no $ARGUMENTS, uses stdin)
- Write/Edit `.planning/todos.jsonl` → `post-todos-render.js $ARGUMENTS`
- PostToolUseFailure (Bash errors) → `loop-detector.js` (stdin)

Note: `loop-detector.js` is wired as `PostToolUseFailure`, not `PostToolUse`.
The prior research table listed it under PostToolUse; its actual event type is
the failure variant. This distinction matters for wiring in `settings.json`.

---

#### governance-logger.js (300 LOC) — FULLY PORTABLE

**What it does:** Fires on Write/Edit to `CLAUDE.md` or `.claude/settings.json`.
Gets git diff of changed file, appends structured JSONL entry to
`.claude/state/governance-changes.jsonl`. Also calls
`scripts/append-hook-warning.js` to append a summary to
`hook-warnings-log.jsonl`. Reads `SESSION_CONTEXT.md` for session counter
(graceful fallback if absent). Always exits 0 — pure logger, never blocks.

**Dependencies:**
- `scripts/lib/safe-fs.js` — EXISTS in JASON-OS at `scripts/lib/safe-fs.js`
- `scripts/lib/sanitize-error.cjs` — EXISTS in JASON-OS at `scripts/lib/sanitize-error.cjs`
- `./lib/rotate-state.js` (hooks/lib) — ABSENT in JASON-OS (only `symlink-guard.js` present)
- `scripts/append-hook-warning.js` — ABSENT in JASON-OS
- `SESSION_CONTEXT.md` — ABSENT in JASON-OS (but gracefully handled)
- git (execFileSync) — present everywhere

**Coupling analysis:** GOVERNANCE_FILES hardcoded as `["CLAUDE.md", ".claude/settings.json"]`
— correct for JASON-OS. Log paths (`.claude/state/governance-changes.jsonl`,
`hook-warnings-log.jsonl`) are generic. No Firebase, no TDMS, no Firestore.

**Missing deps resolution:**
- `rotate-state.js`: used for log rotation. Copy from SoNash hooks/lib/ — 1 file, pure Node.js.
- `append-hook-warning.js`: used to write a summary warning. Can be stubbed as
  a no-op: `module.exports = () => {};` — the hook continues without the warning log.
  Full port later.

**Portability verdict:** FULLY PORTABLE with 2 minor deps (1 copy, 1 stub).
Effort: ~30 min.

**Settings.json matcher needed:**
```json
{
  "matcher": "^(?i)(write|edit)$",
  "if": "Write(CLAUDE.md) || Edit(CLAUDE.md) || Write(.claude/settings.json) || Edit(.claude/settings.json)",
  "hooks": [{ "type": "command", "command": "node .claude/hooks/governance-logger.js", "continueOnError": true }]
}
```

---

#### loop-detector.js (323 LOC) — FULLY PORTABLE

**What it does:** Fires on `PostToolUseFailure` (not PostToolUse). Reads error
text from stdin JSON. Normalizes + hashes the error (SHA-256, 12-char prefix).
Maintains a 20-minute rolling window state file at
`.claude/state/error-loop-tracker.json`. On 3rd occurrence of same error hash,
emits `Loop detected: same error N times` to stdout. Appends to
`.claude/state/hook-warnings-log.jsonl`. Always exits 0.

**Dependencies:**
- `scripts/lib/sanitize-error.cjs` — EXISTS in JASON-OS
- `scripts/lib/safe-fs.js` (via safeAppendFileSync) — EXISTS in JASON-OS
- `crypto` (Node.js stdlib) — present everywhere
- State files auto-created on first run

**Coupling analysis:** Zero SoNash-specific content. No agent names, no
Firebase, no app-specific patterns. Hash-based error normalization is
completely generic. The 3-occurrence threshold and 20-minute window are
configurable constants (lines 51–52).

**Portability verdict:** FULLY PORTABLE, zero edits required.
Effort: Copy file, wire `PostToolUseFailure` in settings.json.

**Settings.json entry needed:**
```json
"PostToolUseFailure": [
  {
    "matcher": "^(?i)bash$",
    "hooks": [{ "type": "command", "command": "node .claude/hooks/loop-detector.js", "continueOnError": true }]
  }
]
```

**Value:** High. Loop detection during exploratory phase is universally useful
regardless of stack. No enforcement risk (CH-C-008 does not apply — this is
observational only).

---

#### post-read-handler.js (392 LOC) — FULLY PORTABLE

**What it does:** Fires on every Read tool use. Two phases:
1. **Context tracking:** Counts files read in session (rolling 30-min window).
   Warns at 5000-line single files and at 15+ files per session. Writes state
   to `.claude/hooks/.context-tracking-state.json`.
2. **Auto-save nudge:** At 20+ files read, emits warning to save context to
   MCP memory. Reads `docs/SESSION_DECISIONS.md` to include recent decisions
   in a suggested save payload (graceful fallback if absent).

**Dependencies:**
- `./lib/git-utils.js` — ABSENT in JASON-OS hooks/lib (only symlink-guard.js present)
- `./lib/state-utils.js` — ABSENT in JASON-OS hooks/lib
- `scripts/lib/security-helpers.js` — EXISTS in JASON-OS

**Coupling analysis:** `docs/SESSION_DECISIONS.md` is referenced (line 69) for
recent decisions extract — absent in JASON-OS, but the read is try/catch and
degrades gracefully. The MCP-save suggestion path references `/save-context`
skill — not confirmed in JASON-OS but the reference is advisory. The core
context-tracking phase is fully generic.

**Missing deps resolution:**
- `lib/git-utils.js`: resolves projectDir via git. Copy from SoNash hooks/lib/ —
  1 file. Alternatively, inline `git rev-parse --show-toplevel` (5 lines).
- `lib/state-utils.js`: provides `loadJson`/`saveJson` helpers. Has fallback
  already defined in the hook (lines 42–44): `loadJson = () => null; saveJson = () => false`.
  Hook works without it — context tracking degrades to write-only (no load).
  Low priority to port; the fallback is functional.

**Portability verdict:** FULLY PORTABLE. Copy `git-utils.js` from SoNash,
accept `state-utils.js` fallback.
Effort: ~45 min (including `git-utils.js` copy and test).

**Strategic value:** CRITICAL. `post-read-handler.js` writes
`.context-tracking-state.json` which `runAlerts()` in user-prompt-handler reads
to trigger the "20 files read" MCP-save nudge. These two hooks form a
read→alert pipeline. Wire `post-read-handler.js` before fully enabling `runAlerts()`.

---

#### post-todos-render.js (235 LOC) — CONDITIONALLY PORTABLE

**What it does:** Fires on Write/Edit to `.planning/todos.jsonl`. Validates the
file path is the canonical todos JSONL (symlink-safe, containment check). Calls
`node scripts/planning/render-todos.js` to regenerate `TODOS.md`. Then
`git add .planning/TODOS.md` to stage the rendered file atomically. Non-blocking
on all failures.

**Dependencies:**
- `scripts/planning/render-todos.js` — ABSENT in JASON-OS
- `scripts/lib/sanitize-error.cjs` — EXISTS in JASON-OS
- `.planning/todos.jsonl` — ABSENT in JASON-OS (directory exists as `.planning/jason-os/`)
- `.planning/TODOS.md` — ABSENT
- git (execFileSync) — present

**Coupling analysis:** The hook logic itself is fully generic — it watches one
specific path and calls a renderer. The coupling is entirely in the renderer
(`render-todos.js`) and the JSONL schema. The hook wraps the renderer; it is
not the renderer.

**Dependency on /todo skill (G2 scope):** `render-todos.js` is the backend of
the `/todo` skill. If `/todo` is stubbed (G2 agent's scope), two options:
1. Wire `post-todos-render.js` with a stub renderer: `console.log("ok")` — hook
   fires but doesn't render. No value but no harm.
2. Defer wiring until `/todo` and `render-todos.js` are ported.

Option 2 is recommended. This hook has zero standalone value without the renderer.

**Portability verdict:** CONDITIONALLY PORTABLE — depends on render-todos.js
which is G2 territory. Port as a bundle with `/todo` skill.
Effort once renderer exists: ~15 min (copy hook, verify path constant).

---

#### post-write-validator.js (1205 LOC) — PARTIALLY PORTABLE (split recommended)

**What it does:** Fires on Write/Edit/MultiEdit. Runs a sequence of validators
(blocking first, then warn, then suggest) against the written file path and
content.

**INVESTIGATION INCOMPLETE — see caveat at end of this section.**

**Complete validator inventory (13 named + 1 removed):**

| # | Name | Type | LOC approx | Classification |
|---|------|------|------------|----------------|
| 5 | `firestoreWriteBlock` | BLOCK | lines 200–270 | NOT PORTABLE — SoNash-specific |
| 6 | `testMockingValidator` | BLOCK | lines 274–311 | NOT PORTABLE — SoNash-specific |
| 2 | `auditS0S1` | WARN/BLOCK | lines 424–468 | NOT PORTABLE — SoNash audit workflow |
| 3 | `patternCheck` | WARN | lines 478–525 | PARTIALLY PORTABLE |
| 4 | `componentSizeCheck` | WARN | lines 529–557 | NOT PORTABLE — TSX/React-specific |
| 7 | `appCheckValidator` | WARN | lines 561–616 | NOT PORTABLE — Firebase App Check |
| 8 | `typescriptStrictCheck` | WARN | lines 620–675 | PARTIALLY PORTABLE |
| 9 | `repositoryPatternCheck` | WARN | lines 679–763 | NOT PORTABLE — Firestore/React pattern |
| 1 | `checkRequirements` | (REMOVED) | — | n/a |
| 12 | `markdownFenceCheck` | WARN | lines 772–797 | FULLY PORTABLE |
| 13 | `jsonSyntaxCheck` | WARN | lines 801–868 | FULLY PORTABLE |
| 10 | `agentTriggerEnforcer` | SUGGEST | lines 992–1100 | PARTIALLY PORTABLE |
| 11 | `testRegistryReminder` | SUGGEST | lines 1138–1202 | NOT PORTABLE — SoNash test registry |

**Detailed notes on each classification:**

`firestoreWriteBlock` (NOT PORTABLE): Blocks direct writes to SoNash's
protected Firestore collections (`journal`, `daily_logs`, `inventoryEntries`,
`goals`, `reflections`, `users`). Pattern-matches Firebase SDK calls.
JASON-OS has no Firestore. Remove entirely.

`testMockingValidator` (NOT PORTABLE): Blocks `vi.mock("firebase/firestore")`
and `jest.mock("firebase/firestore")`. Firebase-specific. Remove entirely.

`auditS0S1` (NOT PORTABLE): Validates that written files have S0/S1 audit
JSONL entries in `.claude/state/`. This is SoNash's code-review audit pipeline.
JASON-OS has no such pipeline. Remove entirely.

`patternCheck` (PARTIALLY PORTABLE): Calls `checkInlinePatterns()` from
`./lib/inline-patterns.js`. The inline-patterns lib is ABSENT in JASON-OS.
If that lib is ported (it contains SoNash-specific anti-patterns), this
validator works generically. Without the lib, the fallback `() => []` makes
it a no-op. Can be wired as no-op initially; activate once inline-patterns.js
is reviewed for JASON-OS relevance.

`componentSizeCheck` (NOT PORTABLE): Enforces 300-line TSX component limit for
`app/` and `components/` paths. JASON-OS has no React. Remove for now; the
LOC-limit concept is portable but the path matchers and TSX gate are not.

`appCheckValidator` (NOT PORTABLE): Firebase App Check enforcement for Cloud
Functions. Disabled in SoNash itself (line 563: "suppressed... avoid wallpaper
warnings"). Remove — doubly irrelevant.

`typescriptStrictCheck` (PARTIALLY PORTABLE): Warns on `: any`, `as any`,
`<any>` in `.ts` files. The check is generic. The path filters (skip
`scripts/`, `.test.ts`, `.d.ts`) are reasonable defaults. JASON-OS has no
TypeScript stack yet (stack TBD), but this validator is zero-cost when no `.ts`
files exist (early-exit guard at line 621). Can be included in the generic core
and will be a no-op until TypeScript is adopted.

`repositoryPatternCheck` (NOT PORTABLE): Warns on Firestore query methods
(`getDocs`, `collection`, etc.) in React TSX components. Enforces
lib/firestore-service.ts pattern. Remove entirely.

`markdownFenceCheck` (FULLY PORTABLE): Counts ``` markers in .md files, warns
on odd count (unclosed fence). Zero dependencies. Language-agnostic. No
SoNash content.

`jsonSyntaxCheck` (FULLY PORTABLE): Parses JSON files, warns on syntax errors.
Handles trailing-comma JSONC. Zero dependencies. Universally useful.

`agentTriggerEnforcer` (PARTIALLY PORTABLE): Loads agent list from
`scripts/config/agent-triggers.json`. In SoNash, this contains 3 entries:
`code-reviewer`, `security-auditor` (twice). The config file is the coupling
point, not the validator logic itself. With an empty or JASON-OS-specific
`agent-triggers.json`, the validator is a no-op (line 996: early exit if
`AGENT_TRIGGERS.length === 0`). Also reads `scripts/config/load-config.js`
(absent in JASON-OS) — but fallback at line 65–70 defaults to empty triggers.
Can be included with zero changes; only activates when config file is populated.

`testRegistryReminder` (NOT PORTABLE): Checks new test files against
`data/ecosystem-v2/test-registry.jsonl`. SoNash-specific registry path.
Remove entirely.

**Split recommendation — Generic Core vs. SoNash Plugin:**

Generic core (5 validators, keep for JASON-OS):
1. `markdownFenceCheck` — zero deps, universal
2. `jsonSyntaxCheck` — zero deps, universal
3. `typescriptStrictCheck` — no-op until TS adopted, generic when active
4. `agentTriggerEnforcer` — no-op without config, fully parameterized
5. `patternCheck` — no-op without inline-patterns.js, activates when lib ported

SoNash-specific (remove or replace with JASON-OS equivalents when relevant):
- `firestoreWriteBlock`, `testMockingValidator`, `auditS0S1`, `componentSizeCheck`,
  `appCheckValidator`, `repositoryPatternCheck`, `testRegistryReminder`

Extracted file LOC estimate: ~350 LOC (down from 1205 by removing 7 validators).

**Shared infrastructure needed (always portable):**
- `./lib/git-utils.js` — copy from SoNash
- `./lib/symlink-guard.js` — EXISTS in JASON-OS
- `./lib/sanitize-input.js` — ABSENT; used for input sanitization in validator
  output. Copy from SoNash hooks/lib/. Fallback would be identity function.
- `scripts/lib/sanitize-error.cjs` — EXISTS in JASON-OS
- `scripts/lib/safe-fs.js` — EXISTS in JASON-OS
- `scripts/config/agent-triggers.json` — create empty `{"agentTriggers":[],"reviewChangeThreshold":5}`

**INVESTIGATION INCOMPLETE CAVEAT:**
The `auditS0S1` validator (lines 424–468, ~45 LOC of logic plus helpers at
lines 334–423) was not fully read. The summary above is based on the validator
name, type annotation, and the helper function signatures (`validateS0S1Finding`,
`loadAuditFindings`, `validateVerificationSteps`). The SoNash audit JSONL
workflow is confirmed SoNash-specific from prior research (D1b), so the
NOT PORTABLE classification is high-confidence despite incomplete read.
Full read would confirm no hidden generic utility in the helpers.

The `agentTriggerEnforcer` config loading path (`scripts/config/load-config.js`)
was not read. The fallback behavior (empty agentTriggers) was confirmed at
lines 65–70. The config mechanism is parameterizable as described above.

---

#### G4 Summary: Portability Ranking by Effort × Value

| Hook | Portability | Effort (hrs) | Value | Priority |
|------|------------|--------------|-------|----------|
| `loop-detector.js` | FULLY PORTABLE | 0.5 | HIGH (catch fix loops immediately) | 1 |
| `governance-logger.js` | FULLY PORTABLE | 0.5 | HIGH (audit CLAUDE.md changes) | 2 |
| `post-read-handler.js` | FULLY PORTABLE | 0.75 | HIGH (enables runAlerts pipeline) | 3 |
| `post-write-validator.js` (generic core) | PARTIALLY PORTABLE | 2.0 | MEDIUM (markdown/JSON/TS checks) | 4 |
| `post-todos-render.js` | CONDITIONAL | 0.25 (after G2) | MEDIUM (auto-render TODOS.md) | 5 (after G2) |

**Note on `loop-detector.js` event type:** It wires to `PostToolUseFailure`,
not `PostToolUse`. JASON-OS `settings.json` currently has no `PostToolUseFailure`
section. This section must be added.

---

## Gaps

**G3-gap-1:** `runAnalyze()` advisory vs. mandatory toggle not implemented.
Phase A extraction plan (stub runAnalyze) is described but the feature-flag
mechanism (`ANALYZE_ENFORCEMENT` env var or state file) was not fully spec'd.
A concrete implementation design (which env var, what default, how runGuardrails
integrates with it) requires ~30 min of design work before coding.

**G3-gap-2:** `inline-patterns.js` content not audited. `patternCheck` calls
this lib for its violation list. Whether the patterns inside are SoNash-specific
(e.g., Firebase import anti-patterns) or generic (e.g., console.log in
production code) was not determined. The lib is 1 file in SoNash `hooks/lib/`.
Audit would take ~15 min and determine whether `patternCheck` is truly
"partially portable" or should be reclassified as NOT PORTABLE.

**G3-gap-3:** `auditS0S1` helpers (lines 334–423) not fully read. Classified
NOT PORTABLE based on name and context. Full read would confirm. Low priority —
this validator is being removed from JASON-OS regardless.

**G3-gap-4:** `post-read-handler.js` Phase 2 (auto-save context, lines 228+)
not fully read. The auto-save path reads `docs/SESSION_DECISIONS.md` and calls
MCP tools. Whether any SoNash-specific MCP entity schemas are embedded was not
confirmed. The core context-tracking Phase 1 is fully audited and portable.

**G3-gap-5:** JASON-OS `.planning/` structure mismatch. SoNash hooks reference
`.planning/todos.jsonl` and `.planning/TODOS.md` at repo root. JASON-OS has
`.planning/jason-os/` as its planning subdirectory. `post-todos-render.js`
uses a hardcoded `TODOS_JSONL = ".planning/todos.jsonl"` constant (line 17).
Whether JASON-OS's `/todo` port will use the same path or a different one was
not determined. This affects the wiring constant.

---

## Serendipity

**S1 — `loop-detector.js` is `PostToolUseFailure`, not `PostToolUse`.** Prior
research (D1b table) listed it under PostToolUse. The actual SoNash wiring
(settings.json line 293) shows `PostToolUseFailure` as the event type. This
means JASON-OS needs a new event section in settings.json, not just a new
matcher in the existing PostToolUse block. Small but critical wiring detail.

**S2 — `agentTriggerEnforcer` is already config-file-driven.** The prior
concern (CH-C-004) about hardcoded agent names in `runAnalyze()` applies there.
But `agentTriggerEnforcer` in `post-write-validator.js` already externalizes
agent names to `scripts/config/agent-triggers.json` — it is already the
parameterized design that `runAnalyze()` should be refactored toward. This is
the correct pattern template for the `runAnalyze()` redesign.

**S3 — post-read-handler feeds runAlerts.** The `.context-tracking-state.json`
file written by `post-read-handler.js` is the same file read by `runAlerts()`
in `user-prompt-handler.js` (line 97). These two hooks are intentionally
coupled: Read → track → alert. Wire order matters: `post-read-handler.js` must
be active before the MCP-save path in `runAlerts()` becomes meaningful.

**S4 — `post-write-validator.js` shared infrastructure is already in JASON-OS.**
`safe-fs.js`, `sanitize-error.cjs`, `security-helpers.js` are all present. The
missing pieces (`git-utils.js`, `symlink-guard.js` already present,
`sanitize-input.js`) are small utilities. The JASON-OS scripts/lib is more
complete than expected for a bootstrap repo.

**S5 — governance-logger reads SESSION_CONTEXT.md for session counter.** This
creates an implicit ordering dependency: `governance-logger.js` emits richer
log entries (with session number) once `SESSION_CONTEXT.md` exists. It works
without it (session counter defaults to 0 or "unknown"), but the log becomes
more useful after Layer 1 session-end work creates `SESSION_CONTEXT.md`. Not
a blocker — just a "better together" note for sequencing.
