# G4 — Governance & Annotations (Gap Pursuit)

**Gap type:** missing-sub-question (G5, G8, G12) | scope-gap (G17)
**Profile used:** codebase
**Confidence:** HIGH

---

## Summary

Four governance gaps were investigated: the pre-commit agent-compliance gate (G5),
PROACTIVELY clauses for all 8 JASON-OS agents (G8), GATE/BEHAVIORAL annotations for
the 16 guardrails (G12), and the statusline bridge write (G17). G8 is the highest-
leverage item — 8 concrete draft clauses are ready to paste. G12 produces a complete
16-row classification table. G5 confirms the hook is portable but requires
`track-agent-invocation.js` as a prerequisite (no state file = hook always passes).
G17 is definitively deferred: the bridge write was in the older GSD statusline that
does not exist in SoNash's codebase, and no consumer hook is ported.

---

## Detailed Findings

### Item G5: Pre-Commit Agent-Compliance Gate

**Source:** `C:\Users\jason\Workspace\dev-projects\sonash-v0\.claude\hooks\pre-commit-agent-compliance.js`

#### What the hook does

`pre-commit-agent-compliance.js` fires on `PreToolUse / Bash` with
`if: Bash(git commit *)`. It:

1. Runs `git diff --cached --name-only` to get staged files.
2. Reads `.claude/hooks/.session-agents.json` — written by
   `track-agent-invocation.js` (PostToolUse/Task).
3. Checks two rules:
   - If staged files match `CODE_PATTERNS` (`*.ts|*.tsx|*.js|*.jsx`) and
     `code-reviewer` is not in `state.agentsInvoked` → block.
   - If staged files match `SECURITY_PATTERNS`
     (`firestore.rules|middleware.ts|functions/src/**|lib/auth*|security-wrapper`)
     and `security-auditor` is not invoked → block.
4. Exits 2 (block) with the missing-agent list; exits 0 (allow) otherwise.

The "required agents" contract lives entirely in the hook source (lines 25–28,
64–77) — not in CLAUDE.md or a config file. The exclusion list
(`*.test.*|__tests__|node_modules|.claude/`) prevents test files from triggering
the code-reviewer requirement.

**State file path:** `ROOT/.claude/hooks/.session-agents.json`
- Written by `track-agent-invocation.js` (PostToolUse / Task tool).
- Schema: `{ sessionId, sessionStart, agentsInvoked: [{agent, description, timestamp}], agentsSuggested, filesModified }`.
- Session boundary reset: when `state.sessionId !== currentSessionId`, the array
  is cleared. Session ID comes from `CLAUDE_SESSION_ID` env var.

**Source lines:**
- `pre-commit-agent-compliance.js:25-28` — CODE_PATTERNS, SECURITY_PATTERNS
- `pre-commit-agent-compliance.js:50-62` — reads `.session-agents.json`
- `pre-commit-agent-compliance.js:64-78` — compliance check logic
- `track-agent-invocation.js:200-231` — state file write

#### Porting assessment

**Dependencies:**
1. `track-agent-invocation.js` (PostToolUse/Task) — **prerequisite**. Without it,
   `.session-agents.json` never exists, the compliance hook reads an empty array,
   and every commit is allowed. The gate is silently inert without the tracker.
2. `sanitize-error` — available at `JASON-OS/scripts/lib/sanitize-error.cjs`.
   The hook references `../../scripts/lib/sanitize-error` which resolves correctly
   if the hook lives at `.claude/hooks/pre-commit-agent-compliance.js`.
3. `./lib/git-utils` — already present in `JASON-OS/.claude/hooks/lib/git-utils.js`.

**JASON-OS agent name adaptation required:**
SoNash checks for `code-reviewer` and `security-auditor` by agent name (lines 71–75).
JASON-OS has no agents with those names. The porting plan must either:
- (A) Keep the hook dormant until `code-reviewer` and `security-auditor` agents are
  added to JASON-OS (the hook passes harmlessly if no code/security files are staged
  against non-existent agents); or
- (B) Change the `CODE_PATTERNS` check to require `deep-research-searcher` or some
  JASON-OS-relevant agent — but this is semantically wrong (the hook guards
  code reviews, not research quality).

**Verdict:** Port `track-agent-invocation.js` first (low risk, portable, needed
anyway for session observability). Port `pre-commit-agent-compliance.js` second
but leave the agent names as `code-reviewer` / `security-auditor` — the hook
will simply always pass until those agents are added. Do not change the agent
names to JASON-OS research agents; that would create a false compliance signal.

**Effort:** 1–2 hours. Both hooks are self-contained. The agent-name TBD issue
is low-risk: the gate is lenient (fails open on any error, including missing state
file).

**SECURITY_PATTERNS note:** The Firestore-specific patterns in line 27 are
SoNash-specific. For JASON-OS, remove `firestore.rules|functions/src/` and
keep only `middleware|auth[/-]|security-wrapper` as a minimal portable set.
Alternatively, delete the `hasSecurityFiles` check entirely until a security
agent exists.

---

### Item G8: PROACTIVELY Clauses (8 JASON-OS Agents — Draft Clauses)

**Source:** SoNash agent pattern from:
- `code-reviewer.md:4-6`: "Use PROACTIVELY after writing or modifying code"
- `explore.md:4-7`: "Use PROACTIVELY when navigating new subsystems, tracing data flows"
- `plan.md:4-7`: "Use PROACTIVELY when a task involves 3+ sequential steps"
- `security-auditor.md:5-7`: "Use PROACTIVELY for security reviews, auth flows"
- `debugger.md:5-8`: "Use PROACTIVELY when encountering issues, analyzing stack traces"
- `documentation-expert.md:5-7`: "Use PROACTIVELY for creating or improving internal project documentation"

**Pattern extracted:** The PROACTIVELY clause always appears at the END of the
description field (not beginning), uses a trigger-condition sentence starting with
"Use PROACTIVELY when/for/after...", and is 1–2 sentences. It names a concrete
situation (not a vague capability statement).

#### JASON-OS agents: current descriptions and proposed PROACTIVELY clauses

**Agent 1: deep-research-searcher**
Current description (line 4-9 of searcher.md):
> "General-purpose web researcher spawned by the /deep-research skill. Executes
> search queries, fetches and analyzes sources, extracts findings with confidence
> levels, and writes structured FINDINGS.md files. Receives a search profile
> (web, docs, codebase, academic) at spawn time."

Draft PROACTIVELY clause to append:
> "Use PROACTIVELY when a domain question, technology decision, or implementation
> approach requires evidence from external sources before work begins."

---

**Agent 2: deep-research-synthesizer**
Current description (line 4-9):
> "Combines findings from multiple searcher agents into a coherent research report
> with inline citations, confidence levels, and structured machine-parseable output.
> Spawned by the /deep-research skill after all searcher agents complete."

Draft PROACTIVELY clause:
> "Use PROACTIVELY after multiple FINDINGS.md files have been written to a research
> topic directory and need to be combined into a single coherent output."

---

**Agent 3: deep-research-verifier**
Current description (line 4-9):
> "Verification agent for deep-research pipeline. Validates claims via dual-path
> verification (filesystem for codebase claims, web search for external claims).
> Produces per-claim verdicts with 4-type taxonomy."

Draft PROACTIVELY clause:
> "Use PROACTIVELY when research output contains HIGH-stakes claims about codebase
> state, API behavior, or architectural decisions that will drive implementation."

---

**Agent 4: deep-research-gap-pursuer**
Current description (line 4-9):
> "Gap pursuit agent for deep-research pipeline. Identifies missing sub-questions,
> low-confidence areas, and unresolved contradictions, then pursues them with
> profile-switched search strategies."

Draft PROACTIVELY clause:
> "Use PROACTIVELY when synthesized research contains MEDIUM or LOW confidence
> claims, unresolved contradictions, or scope gaps that would undermine a planning
> decision."

---

**Agent 5: deep-research-final-synthesizer**
Current description (line 4-9):
> "Final synthesis agent for deep-research pipeline. Produces versioned
> RESEARCH_OUTPUT.md with mode-aware behavior (post-verification, post-gap-pursuit,
> full-resynthesis)."

Draft PROACTIVELY clause:
> "Use PROACTIVELY after verification and gap pursuit phases complete to produce
> the final versioned RESEARCH_OUTPUT.md before deep-plan begins."

---

**Agent 6: contrarian-challenger**
Current description (line 4-9):
> "Adversarial agent for deep-research pipeline. Challenges research findings
> using pre-mortem framing and steel-man critique. Produces structured challenges
> with severity levels."

Draft PROACTIVELY clause:
> "Use PROACTIVELY after initial synthesis when the research findings will drive
> an irreversible architectural or tooling decision — not for routine findings."

---

**Agent 7: otb-challenger**
Current description (line 4-9):
> "Out-of-the-box challenger for deep-research pipeline. Identifies unconsidered
> approaches, adjacent-domain solutions, and alternative framings."

Draft PROACTIVELY clause:
> "Use PROACTIVELY when research has converged on a single approach and no
> alternatives were considered — especially for infrastructure, tooling, or
> architecture questions."

---

**Agent 8: dispute-resolver**
Current description (line 4-9):
> "Dispute resolution agent for deep-research pipeline. Resolves conflicting
> claims using DRAGged 5-type classification, evidence-weight hierarchy, and
> dissent records."

Draft PROACTIVELY clause:
> "Use PROACTIVELY when two or more research findings directly contradict each
> other and the contradiction affects a claim that will be cited in the final
> research output."

---

#### Implementation note

The clause should be appended to the `description:` field, not added as a new
field. In multi-line YAML block scalar format (the `>-` style used by all 8
JASON-OS agents), append it as the final sentence of the block:

```yaml
description: >-
  [existing text]. Use PROACTIVELY when [condition].
```

All 8 agents use `description: >-` (folded block, strip trailing newline). The
append does not require reformatting the rest of the file. Total edit time: 15–20
minutes for all 8.

---

### Item G12: GATE/BEHAVIORAL Annotations (16-Row Table)

**Source:** SoNash CLAUDE.md annotations at lines 35, 37, 39, 85–90, 111–117, 127, 147.
**Pattern:** `[GATE: mechanism]` = automated hook/CI enforcement exists.
`[BEHAVIORAL: method]` = honor-based, no automated block.
`[MIXED]` = partially gated (some sub-conditions automated, others not).
**Decision criterion:** A rule is `[GATE]` if and only if a currently wired hook in
`JASON-OS/.claude/settings.json` blocks or warns on violation.
Current wired hooks: `block-push-to-main.js` (PreToolUse/Bash/push), `large-file-gate.js`
(PreToolUse/Read), `settings-guardian.js` (PreToolUse/Write+Edit).

| # | Rule (JASON-OS §4) | Proposed Annotation | Rationale |
|---|--------------------|---------------------|-----------|
| 1 | Ask on first confusion, not fourth. Don't guess-and-retry. | `[BEHAVIORAL: honor-only]` | No hook detects retry loops in reasoning. `loop-detector.js` catches tool failures, not reasoning confusion. BEHAVIORAL until loop-detector is ported. |
| 2 | Never implement without explicit approval. Present plan, wait for "go." | `[BEHAVIORAL: honor-only]` | No hook blocks Write/Edit without an approval signal. GATE would require a planning gate hook that doesn't exist. |
| 3 | Read SKILL.md before following any skill format. | `[BEHAVIORAL: honor-only]` | No hook enforces skill file reads. Would require PostToolUse/Read tracking. BEHAVIORAL only. |
| 4 | "Stop and ask" = hard stop. No action until clarification received. | `[BEHAVIORAL: honor-only]` | Purely conversational constraint, not tool-enforceable. |
| 5 | One correction = full stop. Stop, ask, confirm, then proceed. | `[BEHAVIORAL: honor-only]` | `user-prompt-handler.js` `runFrustrationDetection()` is the SoNash gate. Not ported to JASON-OS. BEHAVIORAL until that hook is wired. |
| 6 | All surfaced data must force acknowledgment. No fire-and-forget warnings. | `[BEHAVIORAL: honor-only]` | Conversational constraint. No hook enforces acknowledgment before next action. |
| 7 | Never push without explicit approval. `commit` is fine; `push` requires user say-so. | `[GATE: block-push-to-main.js]` | `block-push-to-main.js` is wired (PreToolUse/Bash). Blocks direct push to main/master. Partial gate: doesn't block push to feature branches, but the hard case is covered. `[MIXED]` more precise — branch push not gated, main push is. |
| 8 | Respect declared platform/shell. Check system prompt before shell commands. | `[BEHAVIORAL: honor-only]` | No hook audits shell command platform compatibility. |
| 9 | On pre-commit failure, use `/pre-commit-fixer`. After 2 attempts, ask. | `[BEHAVIORAL: honor-only]` | No hook triggers skill dispatch on pre-commit failure. SoNash's `loop-detector.js` catches repeated Bash failures but doesn't dispatch `/pre-commit-fixer` by name. BEHAVIORAL until loop-detector ported. NEEDS_TO_BECOME_GATE once loop-detector is wired. |
| 10 | Question batches: 5-8 max (unless `/deep-plan` exhaustive mode). | `[BEHAVIORAL: honor-only]` | No hook counts questions in a single response. Purely self-policing. |
| 11 | Verify no untracked files before PR, branch completion, or `/session-end`. | `[BEHAVIORAL: honor-only]` | No hook runs `git status` automatically before these triggers. Would require a pre-commit or pre-push hook with untracked-file check. |
| 12 | Verify file state against filesystem, not docs/memory/conversation. | `[BEHAVIORAL: honor-only]` | No hook validates that Claude used Read before claiming file state. Purely honor-based. |
| 13 | Review hook summary after every commit/push. Present warnings with remediation options. | `[BEHAVIORAL: honor-only]` | Hook output IS surfaced to Claude — but no hook forces Claude to review and present it. The act of reviewing is BEHAVIORAL. |
| 14 | Never set SKIP_REASON autonomously. User must authorize exact wording. | `[MIXED: settings-guardian.js blocks settings.json write; SKIP_REASON in git push not blocked]` | `settings-guardian.js` protects settings.json from unauthorized changes. `block-push-to-main.js` blocks main push but does not parse `SKIP_REASON` git push args. The SKIP_REASON clause in git commands is not gated. Partial gate. |
| 15 | Never accept empty agent results silently. Windows 0-byte bug — check `<result>` field. | `[BEHAVIORAL: honor-only]` | No hook validates Task tool result size. Would require a PostToolUse/Task hook that checks result length. NEEDS_TO_BECOME_GATE (low-effort: add check in track-agent-invocation.js once ported). |
| 16 | Follow skills exactly. Never skip steps without explicit user approval. | `[BEHAVIORAL: honor-only]` | No hook verifies skill step completion. Purely self-policing. |

**Summary counts:**
- `[GATE]` (fully wired): 1 rule (§4.7 — push guard)
- `[MIXED]` (partially gated): 1 rule (§4.14 — settings guardian covers one vector)
- `[BEHAVIORAL: honor-only]`: 14 rules
- `NEEDS_TO_BECOME_GATE` notes: §4.9 (loop-detector), §4.15 (task result check)

**Annotation format recommendation for JASON-OS CLAUDE.md:**

Append inline after each rule on the same line (matching SoNash style):

```markdown
7. **Never push without explicit approval.** `commit` is fine; `push` requires
   user say-so. `[GATE: block-push-to-main.js]`

14. **Never set SKIP_REASON autonomously.** User must authorize exact wording.
    `[MIXED: settings-guardian.js (settings.json write); git push args BEHAVIORAL]`

[all others] `[BEHAVIORAL: honor-only]`
```

This is a ~30-minute mechanical edit to CLAUDE.md. It makes the document honest:
14 of 16 guardrails are explicitly labeled as honor-based, which is accurate and
reduces the risk that Claude treats them as enforced when they are not.

---

### Item G17: Statusline → Hook Bridge

#### (a) JASON-OS statusline — confirmed no bridge write

`C:\Users\jason\Workspace\dev-projects\jason-os\.claude\statusline-command.sh`
(64 lines, read in full). The script reads stdin JSON via `cat`, extracts fields
with `jq`, runs `git status --porcelain`, runs `node --version`, and assembles
output with `printf`. There is no file write anywhere in the script. Confirmed:
no bridge write exists.

Source: `statusline-command.sh:1-64` — zero `echo >`, `write`, `tee`, or `cat >`
operations.

#### (b) SoNash statusline bridge write — location and behavior

The bridge write referenced in D2a serendipity item 1 (`/tmp/claude-ctx-{session}.json`)
was described as being in `gsd-statusline.js`. However, `gsd-statusline.js` does
NOT exist in `sonash-v0/.claude/hooks/` — the hooks directory contains only
`global/statusline.js` (the newer GSD edition).

The `global/statusline.js` (122 lines, read in full) writes NO bridge file. It
reads stdin JSON, computes branch via `git rev-parse`, finds the current task
from `~/.claude/todos/`, and writes only to stdout. There is no `/tmp/claude-ctx`
write.

`gsd-context-monitor.js` (referenced as the bridge consumer) also does not exist
in `sonash-v0/.claude/hooks/` — it is absent from the directory listing entirely.

**Conclusion:** The `/tmp/claude-ctx-{session}.json` bridge is in the GSD plugin
package itself (not in the sonash-v0 repo). It was the older architecture where
the statusline wrote a bridge file for `gsd-context-monitor.js` to read. In the
current SoNash codebase, this architecture has been superseded. The bridge pattern
is a legacy detail of the GSD plugin, not something present in the portability
surface.

#### (c) Should JASON-OS adopt the bridge pattern now?

**Recommendation: Defer — no consumer, no value.**

The bridge pattern requires two co-existing pieces: a writer (statusline) and
a reader (hook). The reader (`gsd-context-monitor.js`) is not ported to JASON-OS
and is not in the priority queue. Wiring the writer without the reader produces
dead code with filesystem side effects (a `/tmp/` write on every statusline poll).

The JASON-OS bash statusline already exposes `ctx:N%` in the status bar (line 61:
`"ctx:$(printf '%.0f' "$used_pct")%"`). The user can see context pressure. The
missing capability is agent-side context awareness — but that requires
`gsd-context-monitor.js`, not the bridge file.

**When to revisit:** At the time `gsd-context-monitor.js` is being ported. At
that point, add the bridge write to `statusline-command.sh` in the same PR.
Bridge write is ~5 lines of bash:

```bash
# Bridge write for gsd-context-monitor.js (add before final printf)
session_id=$(echo "$input" | jq -r '.session_id // ""')
if [ -n "$session_id" ] && [ -n "$used_pct" ]; then
  bridge_file="/tmp/claude-ctx-${session_id}.json"
  printf '{"remaining_percentage":%s}' "$used_pct" > "$bridge_file" 2>/dev/null || true
fi
```

Do not add this now. The infrastructure investment is negligible but the dead code
and confusion risk are not worth it without the consumer.

---

## Gaps

**G5 residual:** The exact `SECURITY_PATTERNS` regex for a JASON-OS-appropriate
version was not determined — this requires a decision about what constitutes
"security-sensitive" files in a stack-TBD project. The portable fallback (delete
the security check entirely until a security agent exists) is recommended.

**G8 residual:** None. All 8 clauses are ready. The only risk is wrong trigger
frequency — the contrarian and OTB clauses deliberately scope to "irreversible
decisions" and "no alternatives considered" to avoid over-invocation. This is a
judgment call that can be tuned after first use.

**G12 residual:** §4.5 (frustration detection) and §4.9 (pre-commit-fixer) could
become GATE with specific hooks. Both are noted as `NEEDS_TO_BECOME_GATE` above.
Classification is accurate for JASON-OS's current wiring state.

**G17 residual:** None. The bridge pattern source is confirmed to be in the
closed-source GSD plugin, not in sonash-v0. The conclusion is definitive.

---

## Serendipity

**G12 reveals a structural honesty problem:** With 14 of 16 guardrails as
`[BEHAVIORAL: honor-only]`, the CLAUDE.md §4 caution block ("Non-negotiable.
Violating these wastes the user's time.") creates false expectations. Rules labeled
"non-negotiable" but with zero enforcement infrastructure are actually strongly
negotiable — they rely entirely on Claude's in-context compliance. Adding the
`[BEHAVIORAL: honor-only]` labels makes this honest and paradoxically may improve
compliance: Claude can see exactly which rules it is solely responsible for
holding.

**G5 reveals a dependency graph:** `track-agent-invocation.js` → `.session-agents.json`
→ `pre-commit-agent-compliance.js` is a three-node dependency chain. In SoNash,
`pre-compaction-save.js` reads `.session-agents.json` too (line 423 in that file).
This means the agent-tracking state is shared across three hooks. If JASON-OS ports
any one of them without the others, the state file either never gets written (no
tracker) or never gets used (no compliance gate, no pre-compaction read). Port all
three together or none.

**The global/statusline.js in SoNash is superior to JASON-OS's bash version in one
material way:** it reads active todos from `~/.claude/todos/` and surfaces the
current task in the statusline. JASON-OS has no task display. This is a 0-dependency
port opportunity: copy `global/statusline.js`, replace the bash script reference in
`settings.json`, and gain current-task visibility. The only dependency is `node` on
PATH (already required by JASON-OS hooks). Effort: 30 minutes. This is unrelated to
the bridge question — the GSD statusline works fine without the bridge file.
