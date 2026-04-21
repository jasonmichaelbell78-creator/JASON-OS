# FINDINGS — D1-dispatch-patterns

**Sub-question:** SQ-D1d — parallel-dispatch patterns for `/migration` Phase 3
(verdict-conditional research) and Phase 5 (mid-execute reshape triggering fresh
destination-idiom research).
**Search profile:** codebase + docs + web
**Depth:** L1
**Date:** 2026-04-21
**Agent:** D1-dispatch-patterns

---

## Summary

Eight concrete dispatch patterns are in active use across the JASON-OS and
SoNash skill ecosystems, and the runtime enforces a hard ceiling independent of
what any skill claims. Findings that matter for `/migration`:

1. The Claude Code runtime caps parallelism at **10 concurrent Task-tool
   spawns** with an eager queue — NOT the "4-agent concurrency" that
   `deep-research` SKILL.md:209 states. The skill-stated number is a
   self-imposed budget guard, not a runtime enforcement.
2. The Windows 0-byte output bug (issue #17147 — the currently-tracked
   upstream issue for this symptom, not #39791 which returns no results)
   remains **OPEN** as of 2026-04. Workaround requires Developer Mode or a
   task-notification fallback capture (both already encoded in
   deep-research SKILL.md:38-43 and CLAUDE.md §4 rule 15).
3. Two distinct batching strategies exist: **fixed-wave** (comprehensive-
   ecosystem-audit — 5+3 agents in 2 stages) and **byte-weighted packing**
   (label-audit — ~120-150 KB per batch, 2x agents for primary+secondary
   cross-check).
4. `TeamCreate` is a separate primitive (requires
   `CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1`) with peer-to-peer messaging
   and dependency tracking — reserved for L4 / interdependent sub-questions
   in deep-research SKILL.md:211.
5. Context exhaustion handling is codified as Critical Rule 8 in
   deep-research: **re-spawn across 2+ smaller agents**, never accept
   partial output. Re-synthesized findings append to the same file
   (REFERENCE.md:1072-1074).

For `/migration` the recommendations diverge: Phase 3 can use a single-wave
fixed-count dispatch keyed off verdict count; Phase 5 needs a smaller,
incremental dispatch pattern (1-2 agents at a time) because each reshape
reveals further idiom needs mid-execute — fixed up-front waves don't fit.

---

## Pattern catalog

### Pattern 1: Fixed-wave staged dispatch (comprehensive-ecosystem-audit)

**Source:** `C:\Users\jbell\.local\bin\sonash-v0\.claude\skills\comprehensive-ecosystem-audit\SKILL.md:64-96`

Stage 1: 5 parallel agents (hook / session / TDMS / PR / health). Stage 2:
3 parallel agents (skill / doc / script). Stage 3: sequential aggregation.
Each agent writes JSON to `.claude/tmp/ecosystem-{name}-result.json` and
returns a fixed-format short string to avoid context pollution.

**Key features:**
- Hard-coded agent count per stage — no dynamic sizing.
- Progress file (`.claude/tmp/comprehensive-ecosystem-audit-progress.json`)
  for compaction resume (SKILL.md:46-59).
- "COMPLETE: {audit-name} grade {grade}…" return protocol to keep
  orchestrator context clean (SKILL.md:36).
- Partial failure handling: a failed audit does NOT block the others
  (SKILL.md:136-138).

**Fit for /migration:** Phase 3 verdict-conditional research — analogous
scale (small N of reshape/rewrite units), known up-front from Phase 2
output.

### Pattern 2: Byte-weighted batching with primary+secondary cross-check (label-audit)

**Source:** `C:\Users\jbell\.local\bin\JASON-OS\.claude\skills\label-audit\SKILL.md:132-167`

Target per batch: **120-150 KB of file content**; files >50 KB count as 2
units; small files pack tightly. Each batch spawns **2 independent agents**
(primary + secondary) that never see each other's output — cross-check
enforces D8 agent-independence rule.

**Key features:**
- Byte-weighted packing replaces "N files per batch" (SKILL.md:135-136).
- 2x agent multiplier for disagreement-based confidence (SKILL.md:149-155).
- Synthesis agent (third role) aggregates findings (SKILL.md:169-179).
- Self-audit Phase 8 with coverage / invariant / empty-output /
  promotion / ledger checks (SKILL.md:204-262).

**Fit for /migration:** Phase 5 reshape transformations where correctness
is load-bearing and disagreements between two independent derivations
signal risk.

### Pattern 3: Wave-with-queue via allocation formula (deep-research Phase 1)

**Source:** `C:\Users\jbell\.local\bin\JASON-OS\.claude\skills\deep-research\SKILL.md:203-222` + `REFERENCE.md:843-856`

Formula: `D + 3 + floor(D/5)` (Critical Rule 7, SKILL.md:47-48) where D =
sub-question count. Agents dispatched in waves, "Respect 4-agent
concurrency" (SKILL.md:209). State-file tracks per-wave status:
`wave_1: {status, agents}`, `wave_N: ...`.

**Key features:**
- Allocation formula is a FLOOR with user override (SKILL.md:45-48).
- Wave progress report after each wave ("Wave N/M complete. X answered,
  Y remaining.") SKILL.md:120.
- Timeout 5 min per searcher; user checkpoint on failures (SKILL.md:210-212).
- Pre-synthesis validation: verify all expected FINDINGS.md non-empty
  before spawning synthesizer (SKILL.md:228-232).

**Fit for /migration:** Phase 3 when verdict-conditional research spans
many sub-questions (e.g. reshape unit + ripple + idiom + precedent).

### Pattern 4: Scaling-by-depth (verification + challenges)

**Source:** `C:\Users\jbell\.local\bin\JASON-OS\.claude\skills\deep-research\SKILL.md:239-277`

Verification agents: L1=2, L2=2, L3=3, L4=4+. Contrarian+OTB challenges:
L1-L2 (1+1), L3 (2+2), L4 (3+3 + red team + pre-mortem). Always spawn
contrarian+OTB **in parallel** (SKILL.md:268).

**Key features:**
- Depth is the dispatch scaling knob, not sub-question count.
- Split claims across agents to avoid context exhaustion (SKILL.md:242).
- Apply persistence safety net to every spawn (SKILL.md:252-263).

**Fit for /migration:** Phase 5 rewrite-verdict dispatching — scale
challenge/verification agents by risk tier of the rewrite, not by count.

### Pattern 5: Conditional gap pursuit with capped fan-out

**Source:** `C:\Users\jbell\.local\bin\JASON-OS\.claude\skills\deep-research\REFERENCE.md:1232-1254`

Formula: `ceil(G/2)` gap agents where G = actionable gap count.
Depth caps: L1=4, L2=4, L3=6, L4=10. **One round only** (Critical Rule 9
— no recursive gap chasing).

**Key features:**
- Cluster related gaps by theme when G exceeds cap (REFERENCE.md:1244-1247).
- Respect 4-agent concurrency via waves (REFERENCE.md:1253-1254).
- Skip entire 3.96-3.97 phases if 0 actionable gaps (SKILL.md:310).

**Fit for /migration:** Phase 5 mid-execute "fresh idiom research" — if a
rewrite reveals N new destination idioms, cap dispatch at ceil(N/2) with
a hard ceiling, one round only, skip phase if none surface.

### Pattern 6: Context-exhaustion re-spawn (Critical Rule 8)

**Source:** `C:\Users\jbell\.local\bin\JASON-OS\.claude\skills\deep-research\SKILL.md:49-51`, applied at REFERENCE.md:1069-1074

> "Context exhaustion = immediate re-spawn. If any agent fails to write
> complete findings, re-spawn across 2+ smaller agents splitting the
> scope. Never accept partial output."

Split strategy: each replacement writes to the same output file (append,
not overwrite) — REFERENCE.md:1072-1074.

**Fit for /migration:** Rewrite verdicts (largest units) are highest
risk for context exhaustion. Must pre-plan a scope-splitting strategy
before dispatch, not after failure.

### Pattern 7: Windows 0-byte fallback capture (Critical Rule 4)

**Source:** `C:\Users\jbell\.local\bin\JASON-OS\.claude\skills\deep-research\SKILL.md:37-43`, `216-219`, `250-263`

After each agent completes:
1. `wc -c` the expected FINDINGS.md path.
2. If 0 bytes, capture the task-notification `<result>` text.
3. Write that text to the expected output path using the Write tool.
4. If BOTH agent-write AND fallback are empty, re-spawn once, then
   escalate to user. Never proceed silently.

Applied to verifier, challenger, dispute-resolver, and (per T24 gap) all
async agents via the "persistence safety net" (SKILL.md:252-263).

**Fit for /migration:** Every Phase 5 spawn — reshape and rewrite outputs
are load-bearing for the commit, cannot tolerate a silent empty.

### Pattern 8: TeamCreate for interdependent sub-questions (L4 only)

**Source:** `C:\Users\jbell\.local\bin\JASON-OS\.claude\skills\deep-research\SKILL.md:211` + web docs

SKILL.md:211: "**L4:** TeamCreate for interdependent sub-questions."

From the Claude Code agent-teams docs, TeamCreate is a separate primitive:
a team lead coordinates teammates that can **peer-to-peer message each
other** (not just report back to parent), with **dependency tracking** on
a shared task list and **file locking** to prevent conflicts. Gated
behind `CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1` environment variable per
code.claude.com/docs/en/agent-teams (accessed 2026-04-21).

**Trade-off:** Agent teams solve inter-agent communication but cost more
coordination overhead. Docs guidance: use subagents for independent
workers reporting back; use teams only when teammates must share findings
and challenge each other. Not recommended for same-file edits or
heavily-sequential tasks.

**Fit for /migration:** Phase 5 rewrite of a unit that touches multiple
files with dependencies between them (e.g. reshape ModuleA's export
schema first, then ModuleB's import usage). Likely too heavyweight for
most migration units; reserve for multi-file refactor verdicts only.

---

## Wave-size recommendations for /migration

### Phase 3 — verdict-conditional research (reshape + rewrite)

**Recommended pattern:** Pattern 1 (fixed-wave) + Pattern 3 (formula-based
sizing), capped at **4 agents per wave**.

**Rationale:**
- Phase 2 (Discovery) produces a known-at-dispatch-time set of reshape /
  rewrite verdicts. Count is discoverable up-front → fixed-wave is safe.
- Each unit's research is independent (destination idiom for file A
  doesn't block idiom for file B) → no TeamCreate needed.
- Respect the skill-stated 4-agent concurrency (deep-research
  SKILL.md:209) even though runtime allows 10 — this is about **context
  discipline** (orchestrator's ability to track progress + handle
  failures), not a hard runtime cap.
- Use `D + 3 + floor(D/5)` formula as floor for total agent budget, where
  D = reshape+rewrite verdict count.
- **Wave size: 4.** Wave count: `ceil(D_reshape_rewrite / 4)`.
- Per-wave timeout: 5 min/agent per deep-research convention.
- Persistence safety net on every spawn (Pattern 7).

**Example:** 7 reshape verdicts + 3 rewrite verdicts = 10 units.
Formula: `10 + 3 + floor(10/5)` = 15 agents. Waves: `ceil(10/4)` = 3
waves of research agents (4 + 4 + 2), plus support agents in later
phases.

### Phase 5 — mid-execute reshape / rewrite triggering fresh idiom research

**Recommended pattern:** Incremental dispatch of **1-2 agents at a time**
via Pattern 5 (conditional fan-out) + Pattern 6 (context-exhaustion
re-spawn) + Pattern 2 (byte-weighted batching) for the transformation
work itself.

**Rationale:**
- Phase 5 is **reactive**: a rewrite uncovers a destination idiom the
  Phase 3 research didn't cover (D24 in BRAINSTORM.md §2). Number of
  fresh idiom questions is NOT known at Phase 5 start.
- User-gate per D8 means every reshape/rewrite requires explicit
  confirmation — a large wave can't proceed past its first gate anyway.
- A 4-agent wave mid-execute would create context pressure on the
  orchestrator that's simultaneously tracking commit state, pre-commit
  output, and per-file verdict status.
- Fresh idiom research is a Phase 3.95 (gap pursuit) analogue — use
  `ceil(G/2)` with hard cap of 2 for Phase 5 (tighter than deep-research's
  L1 cap of 4 because the orchestrator is doing more work simultaneously).
- If rewrite touches multiple interdependent files: **escalate to
  TeamCreate** (Pattern 8) per the L4 precedent. Otherwise keep single-
  agent sequential.

**Wave size: 1-2.** Dispatch cadence: **one fresh-idiom research agent per
mid-execute surprise**; batch up to 2 only if two surprises surface
simultaneously (same file, multiple idiom gaps).

**Checkpoint behavior:** Per-file checkpoint after each rewrite batch
commits, so Phase 5 can resume cleanly if a mid-execute agent fails
(BRAINSTORM.md §2 D8 + ONQ#8).

---

## Windows 0-byte bug status

**Status as of 2026-04-21: OPEN, workaround-only.**

The issue number cited in deep-research SKILL.md:39 (`anthropics/claude-code#39791`)
returns no content on GitHub search and may be a stale or superseded
reference. The currently-tracked upstream issue for this symptom is
[#17147](https://github.com/anthropics/claude-code/issues/17147) — "Background
agents output files remain empty (0 bytes) — run_in_background=true broken".

**Root cause** (per WebFetch of issue #39791 — the URL does resolve to the
symptom report even if search doesn't index it):
1. `run_in_background=true` on Windows attempts to create a **symlink**
   from the output file to the agent's `.jsonl` log file.
2. Symlink creation on Windows requires `SeCreateSymbolicLinkPrivilege` —
   only admins or Developer Mode users have this.
3. On `EPERM`, a fallback creates an empty file and closes it — leaving
   a permanently 0-byte output.

**Workaround (primary):** Enable Windows Developer Mode
(Settings → Update & Security → For developers → Developer Mode: ON).
This grants symlink privilege to the current user.

**Workaround (orchestrator-side, already encoded in JASON-OS):**
deep-research SKILL.md:37-43, CLAUDE.md §4 rule 15, label-audit
SKILL.md:232-238 — after each spawn, `wc -c` the expected output;
on 0 bytes capture the task-notification `<result>` text and
`Write` it to the expected path. Max 1 retry, then escalate.

**Suggested fix in upstream issue:** Replace symlink with `fs.link()`
(hardlinks don't need the privilege) or write directly to the file as
the agent produces it (matches `local_bash` task behavior). Not yet
implemented per 2026-04 issue thread.

**Implication for /migration:** Every Phase 5 spawn is load-bearing for
commits. Orchestrator MUST apply the persistence safety net
(Pattern 7) to every reshape/rewrite agent, every fresh-idiom research
agent, every verification agent. No exceptions.

---

## Concurrency model

Two distinct meanings for "concurrency" in this ecosystem — they are
frequently conflated, and the confusion is load-bearing for sizing
Phase 3 and Phase 5:

### Runtime cap (hard): 10 concurrent Task-tool spawns

Per `code.claude.com/docs/en/sub-agents` and community testing (amux.io,
mindstudio.ai, claudefa.st — all accessed 2026-04-21):

> "The parallelism caps at 10 concurrent operations — you can queue more,
> but only 10 Tasks or subagents run simultaneously."

Behavior: the harness accepts >10 Task tool calls in a single assistant
response; 10 run concurrently, the rest queue. There's a community
observation (claudefa.st) that the **queue doesn't drain dynamically** —
the harness waits for the full batch to finish before starting the next
batch. This is important: dispatching 20 tasks doesn't mean 10 run now
and 10 run-as-slots-free; it means 10 run, then 10 run.

[FEATURE request #15487](https://github.com/anthropics/claude-code/issues/15487)
asks for a `maxParallelAgents` config setting — not yet implemented as
of 2026-04.

### Skill-stated cap (soft): 4-agent concurrency

Per `deep-research` SKILL.md:209 and REFERENCE.md:1253:

> "Respect 4-agent concurrency. Wave progress after each wave."

This is **NOT** a runtime limit. It's a self-imposed budget for **context
discipline**:
- Orchestrator tracks per-agent FINDINGS.md writes → more parallel
  agents = more state to track simultaneously.
- Each agent's `<result>` return adds to orchestrator context → 10 parallel
  returns can exhaust orchestrator's context before Phase 2 synthesizer
  gets dispatched.
- 5-min-per-agent timeout means 4 concurrent = 5 min of real-time;
  10 concurrent = still 5 min of real-time, but 2.5x the failure surface.

### Implication for /migration

- Phase 3: follow skill-stated 4-agent cap (orchestrator already juggling
  verdict-tracking + research + user gates).
- Phase 5: tighter — cap at **2 concurrent** for fresh-idiom research
  because orchestrator is ALSO managing commit state, pre-commit output,
  per-file checkpoint resume data.
- Never approach the runtime 10-cap. That's the **absolute** ceiling, not
  the operational target.

---

## Sources

### Codebase (file:line)

- `C:\Users\jbell\.local\bin\JASON-OS\.claude\skills\deep-research\SKILL.md:37-43` — Windows 0-byte fallback (Critical Rule 4)
- `C:\Users\jbell\.local\bin\JASON-OS\.claude\skills\deep-research\SKILL.md:49-51` — Context exhaustion re-spawn (Critical Rule 8)
- `C:\Users\jbell\.local\bin\JASON-OS\.claude\skills\deep-research\SKILL.md:209-211` — 4-agent concurrency + TeamCreate L4
- `C:\Users\jbell\.local\bin\JASON-OS\.claude\skills\deep-research\SKILL.md:216-219` — Post-completion 0-byte check
- `C:\Users\jbell\.local\bin\JASON-OS\.claude\skills\deep-research\SKILL.md:250-263` — Persistence safety net (cross-phase)
- `C:\Users\jbell\.local\bin\JASON-OS\.claude\skills\deep-research\SKILL.md:268-274` — Parallel contrarian+OTB dispatch
- `C:\Users\jbell\.local\bin\JASON-OS\.claude\skills\deep-research\REFERENCE.md:843-856` — Waves schema in state file
- `C:\Users\jbell\.local\bin\JASON-OS\.claude\skills\deep-research\REFERENCE.md:1232-1254` — Gap agent scaling, depth caps, clustering
- `C:\Users\jbell\.local\bin\JASON-OS\.claude\skills\deep-research\REFERENCE.md:1069-1074` — Context exhaustion split + append
- `C:\Users\jbell\.local\bin\JASON-OS\.claude\skills\convergence-loop\SKILL.md:129-180` — Min 2 passes, graduated convergence, agent dispatch
- `C:\Users\jbell\.local\bin\JASON-OS\.claude\skills\label-audit\SKILL.md:132-167` — Byte-weighted batching + primary/secondary
- `C:\Users\jbell\.local\bin\JASON-OS\.claude\skills\label-audit\SKILL.md:204-262` — Self-audit Phase 8 coverage checks
- `C:\Users\jbell\.local\bin\JASON-OS\.claude\skills\label-audit\SKILL.md:232-238` — Empty-output detection (Windows bug applied)
- `C:\Users\jbell\.local\bin\sonash-v0\.claude\skills\comprehensive-ecosystem-audit\SKILL.md:30-42` — Critical rules (return protocol)
- `C:\Users\jbell\.local\bin\sonash-v0\.claude\skills\comprehensive-ecosystem-audit\SKILL.md:64-96` — Stage 1 (5 parallel) + Stage 2 (3 parallel)
- `C:\Users\jbell\.local\bin\sonash-v0\.claude\skills\comprehensive-ecosystem-audit\SKILL.md:136-138` — Partial failure handling
- `C:\Users\jbell\.local\bin\JASON-OS\.research\migration-skill\BRAINSTORM.md:12,28-31,57,73,82-84,102` — Migration scope (D8/D19/D23/D24/D25, R4)
- `C:\Users\jbell\.local\bin\JASON-OS\CLAUDE.md §4 rule 15` — Never accept empty agent results silently

### Web (URL + date accessed 2026-04-21)

- [Issue #17147 — Background agents output files remain empty](https://github.com/anthropics/claude-code/issues/17147) — OPEN
- [Issue #39791 — cited by deep-research SKILL.md](https://github.com/anthropics/claude-code/issues/39791) — OPEN, symlink root cause, workaround = Windows Developer Mode
- [Issue #15487 — maxParallelAgents feature request](https://github.com/anthropics/claude-code/issues/15487) — OPEN, not yet implemented
- [Orchestrate teams of Claude Code sessions (agent-teams)](https://code.claude.com/docs/en/agent-teams) — TeamCreate primitive, `CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1`
- [Create custom subagents — Claude Code Docs](https://code.claude.com/docs/en/sub-agents) — subagent_type, Task tool
- [Subagents in the SDK — Claude API Docs](https://platform.claude.com/docs/en/agent-sdk/subagents) — SDK-level subagent contract
- [Claude Code Subagents: The Complete Guide 2026 — amux](https://amux.io/guides/claude-code-subagents/) — 10-concurrent-max documented
- [Claude Code Sub-Agents: Parallel vs Sequential Patterns — claudefa.st](https://claudefa.st/blog/guide/agents/sub-agent-best-practices) — queue-doesn't-drain-dynamically observation
- [What Is Claude Code Agent Teams — MindStudio](https://www.mindstudio.ai/blog/claude-code-agent-teams-parallel-agents) — peer-to-peer messaging, shared task list
- [Claude Code Agent Teams 2026 — LaoZhang AI](https://blog.laozhang.ai/en/posts/claude-code-agent-teams) — team-lead / teammate architecture

---

## Gaps

- Exact behavior of the **queue-drain** pattern (does it dynamically pull
  from queue or batch-wait?) is community-observed, not official docs —
  worth a direct harness test before Phase 5 final design.
- No found precedent for **mid-execute research dispatch** specifically.
  Closest analogue is deep-research Phase 3.95 (gap pursuit) which is
  post-synthesis, not mid-execute. Pattern 5 is the best inference, not
  a direct precedent.
- `TeamCreate` dependency-tracking semantics (how does it enforce file
  locking? what happens to locked-file conflicts?) not researched deeply
  — only relevant if /migration decides to pursue team-mode for L4-
  equivalent rewrites.

## Serendipity

- The `comprehensive-ecosystem-audit` "COMPLETE: {name} grade {g}" return
  format is a strong candidate for Phase 5 reshape/rewrite spawn returns
  — keeps orchestrator context clean while per-agent details live in
  result JSON files. Consider adopting for `/migration` Phase 5.
- `label-audit`'s byte-weighted batching + primary+secondary pattern is
  directly applicable to reshape verdicts where correctness is load-
  bearing — the D8 rule ("Nothing silent, ever") maps cleanly to the
  D8 rule in label-audit Phase 3.
- The actual Windows 0-byte issue number tracked upstream appears to be
  **#17147**, not #39791 as cited in deep-research SKILL.md:39. This is
  worth a follow-up edit to the cited issue number in deep-research
  SKILL.md for accuracy (noted as possible doc drift — not a finding
  against this research question, just a flag for future cleanup).
