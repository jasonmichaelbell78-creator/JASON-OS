# D7d — Primary → Ancillary Invocation Contracts (assuming /migration decomposes)

**Agent:** D7-invocation-contracts (Phase 1 D-agent)
**Depth:** L1 (exhaustive, file:line citations)
**Date:** 2026-04-21
**Scope:** Design contracts for `/migration` (router) ↔ `/migration-scan` (ancillary) ↔ `/convergence-loop` (sub-skill), assuming decomposition (D7c's commit-or-don't is out of scope here).

---

## Summary

Five contract-design decisions, synthesizing patterns from three working precedents in SoNash: `/analyze` → 4 handler skills (the cleanest router → handler contract we have — `C:\Users\jbell\.local\bin\sonash-v0\.claude\skills\analyze\SKILL.md:100-126`), `/deep-research` → subagent orchestration (parallel agent dispatch with state-file spine — `.../deep-research/SKILL.md:121-165`), and `/convergence-loop` as a skill-as-callee (with explicit "Programmatic Mode" contract — `.../convergence-loop/SKILL.md:237-263`).

**Headline recommendations:**

1. **State passing:** Hybrid — state-file as canonical spine (`.claude/state/migration.<topic>.state.json`) + file-based artifacts for large outputs (`MIGRATION_PLAN.md`, inventory JSONs) + handoff payload JSON via Skill-tool args (mirroring `/analyze` Handoff Contract v1.2). The Skill tool itself is fire-and-return with a text result; it does NOT support structured return values, so disk is the contract surface.
2. **Gate memory across skills:** Gate memory is stored in the state file and the ancillary MUST load it on entry, render it as "prior answers" context, and STILL re-prompt. D22 holds across skill boundaries — confirmation is never inherited from the router, even when the router just confirmed something 5 seconds ago.
3. **Convergence-loop role:** Programmatic Mode (already documented at `.../convergence-loop/SKILL.md:237-263`) — `/migration` Phase 6 reads convergence-loop's workflow and implements it inline rather than dispatching `/convergence-loop` via Skill tool. This is the pattern `/deep-plan` uses for diagnosis verification (`.../deep-plan/SKILL.md:149-155`).
4. **Sub-skill lifecycle:** Dual-mode — standalone-callable AND coupled. Each ancillary (`/migration-scan`, `/migration-reshape`, `/migration-prove`) has its own SKILL.md with a "When invoked by /migration" section adding the state-file handoff contract. Enforced via in-SKILL documentation + state-file schema validation, not runtime coupling.
5. **Re-entry across decomposition (D28):** Reframes bubble UP to `/migration` router. Ancillary writes a `reframe_flag` to state file + returns with routing hint; router reads it, decides whether to trigger `/brainstorm` re-entry at the router level. Ancillary does NOT call `/brainstorm` directly — keeps re-entry authority at the top.

---

## §1 — State Passing: How does /migration hand state to /migration-scan and get results back?

### Mechanisms available in Claude Code

From the Skill tool schema (this agent's own tool list) and SoNash precedent:

| Mechanism | Description | Writable surface | Return surface |
|-----------|-------------|-----------------|----------------|
| **File-based artifacts** | Skill writes markdown / JSON to disk at agreed path | Any file Skill has Write permission for | Agreed filesystem location |
| **State JSON spine** | `.claude/state/<skill>.<topic>.state.json` — updated after every state-changing event | Single file, JSON-parseable | Readable by subsequent invocation |
| **Skill-tool return value** | Text output from `Skill(skill=..., args=...)` call | N/A (Skill runs to completion; harness returns synthesized text) | Unstructured markdown text |
| **MCP memory** | Cross-session persistence via MCP memory server | MCP tools | MCP tools |
| **Skill-tool args** | Pass topic / payload via `args` string parameter | One string (can serialize JSON) | N/A (input only) |

### Precedent: /analyze → handler

`.../analyze/SKILL.md:100-126` (Handoff Contract v1.2) defines a JSON payload passed conceptually to the handler:

```json
{
  "target": "<raw input the user provided>",
  "auto_detected_type": "repo|website|document|media",
  "flags": { "depth": "...", "type": "..." }
}
```

Key quote (`:117-118`): "the main session invokes the handler skill via the `Skill` tool. Control returns to this router when the handler's invocation ends."

Return path is **disk**: handler writes `.research/analysis/<slug>/analysis.json`; router reads via `Step 4.5 — Validate handler artifacts` (`:216-218`). No structured return — the router shells out to `node scripts/cas/update-index.js --slug=<slug>` after the handler quits.

### Precedent: /deep-research state spine

`.../deep-research/SKILL.md:202` creates `.claude/state/deep-research.<slug>.state.json` during Phase 0.9. Every phase is allowed to read and update this file. On compaction (`:388-391`), resume reads the state file, validates JSON, skips completed phases. This is the canonical "state-file-as-spine" pattern in SoNash.

### Recommendation for /migration decomposition

**Hybrid pattern.** Use all three of:

1. **Skill-tool args for call-site handshake.** Router serializes a minimal JSON `{topic, phase, direction, unit_type, target, mode}` into the `args` string when invoking `Skill(skill="migration-scan", args=...)`. This is the fresh-call payload (analog to `/analyze` Handoff Contract).
2. **State-file spine for cross-phase and cross-skill persistence.** `.claude/state/migration.<topic>.state.json` tracks gates, decisions, verdicts, gate memory, and a `sub_skill_handoffs` array recording which ancillary was invoked with what payload and what it returned. Ancillary MUST read this file on entry before re-prompting (§2).
3. **File-based artifacts for large outputs.** `MIGRATION_PLAN.md`, ripple inventories, sanitize-candidate lists — on disk, referenced by path. The state file stores the path, not the contents. Return surface after Skill-tool call is: (a) the Skill's text return (advisory only), (b) the updated state file (authoritative), (c) the artifact files (the substance).

**Why not rely on Skill-tool return text?** The Skill tool is fire-and-return — the harness synthesizes a text summary. This is fine for "did it work?" but cannot carry structured verdicts, per-file decisions, or gate states reliably. Disk is the only trustworthy surface. This matches what `/analyze` does at SKILL.md:216-218 (validate artifacts on disk, not return text).

**Why not MCP memory?** MCP memory is cross-session persistent but requires MCP server to be running. JASON-OS CLAUDE.md (`C:\Users\jbell\.local\bin\JASON-OS\CLAUDE.md:11-18`) pins the OS to minimal Node.js infrastructure; adding an MCP dependency just for same-session state passing violates the minimality principle. MCP memory is appropriate for cross-session checkpoints (e.g., `/checkpoint --mcp`), not intra-flow state handoff.

---

## §2 — Gate Memory Across Skills

### D22 constraint recap

From `BRAINSTORM.md:81`: "Gate memory aids recall; never replaces confirmation. On resume, prior answers shown as context; confirmation is always re-required."

The hard question: when the ROUTER just confirmed "user approves reshape on file X," and 30 seconds later the router invokes `/migration-reshape` which itself has a confirmation gate for the same decision, does the ancillary re-prompt?

### Verdict: YES. Ancillary MUST re-prompt, with prior answer shown as context.

**Rationale:**

- D22 is not "confirm once per session"; it's "confirm once per gate." The router's "approve reshape" is a router-level gate (it confirms we enter Phase 5); the ancillary's "proceed with this specific reshape" is an ancillary-level gate (it confirms a specific transformation). These are different gates, even if they semantically overlap.
- Crossing a skill boundary is itself a re-entry event (D28: "Re-entry as norm"). D22's resume language applies — "prior answers shown as context; confirmation is always re-required."
- The alternative — "router's confirmation is inherited by ancillary" — creates a silent-action risk (D8: "Nothing silent, ever"). If the user assumed the router's confirmation applied only to "enter Phase 5 on this file," but the ancillary interpreted it as "proceed with the reshape transformation," a no-turn-back write happens on a confirmation the user didn't think they gave.

### Gate memory boundary proposal

State-file schema must include a `gates` array:

```json
{
  "gates": [
    {
      "gate_id": "phase-5-enter",
      "skill": "migration",
      "question": "Enter Phase 5 (active transformation) for <target>?",
      "answer": "yes",
      "timestamp": "2026-04-21T12:34:56Z",
      "scope": "router"
    },
    {
      "gate_id": "reshape-file-x-confirm",
      "skill": "migration-reshape",
      "question": "Proceed with reshape on <path>? Preview: …",
      "answer": null,
      "scope": "ancillary",
      "parent_gate": "phase-5-enter"
    }
  ]
}
```

**Ancillary entry protocol:**

1. Read state file.
2. Find gates with `scope: "router"` relevant to this ancillary's phase (traverse `parent_gate` links).
3. Render as "For context, you previously approved: <list of prior answers>" to the user.
4. Re-prompt the ancillary-scoped gate. User may say "yes (I already told you)" — recorded as answer, but the re-prompt happened.

**This is the single hardest contract rule to hold,** because the LLM will be tempted to skip re-prompts for efficiency. SKILL.md for each ancillary MUST include a Critical Rule at MUST level: "Gate memory aids; never replaces. Re-prompt every ancillary-scoped gate even if parent gate was just confirmed." Mirrors CLAUDE.md §4 Behavioral Guardrail #4 ("Stop and ask = hard stop" — `C:\Users\jbell\.local\bin\JASON-OS\CLAUDE.md:91`).

---

## §3 — Convergence-Loop Role: How does /migration delegate to /convergence-loop?

### Two integration patterns exist

`.../convergence-loop/SKILL.md:237-263` explicitly documents both:

**Pattern A: Skill-tool dispatch.** Call `Skill(skill="convergence-loop", args=<claims-file-path>)`. CL runs as a top-level skill, produces convergence report + state file, returns. Caller reads state file / report.

**Pattern B: Programmatic Mode.** Caller reads CL's SKILL.md workflow and implements Setup → Loop → Report inline in the caller's own phase. CL SKILL.md:239-244 explicitly documents this:
> "Other skills reference this skill's workflow without invoking `/convergence-loop` directly. To integrate: 1. Read this SKILL.md's Workflow section. 2. Implement the Setup -> Loop -> Report sequence in your skill's relevant phase. 3. Use the T20 tally format. 4. Reference REFERENCE.md for behavior definitions and slicing templates."

### Precedent: /deep-plan uses Pattern B

`.../deep-plan/SKILL.md:149-155` (Phase 0 step 10):
> "**Convergence-loop verify DIAGNOSIS** (MUST for L/XL tasks, SHOULD for S/M) — if DIAGNOSIS.md makes 5+ claims about codebase state (claims = testable assertions about codebase state, per `/convergence-loop` SKILL.md), verify via convergence-loop quick preset. … See `/convergence-loop` SKILL.md 'Programmatic Mode' for the integration contract."

`/deep-plan` doesn't dispatch `/convergence-loop` via Skill tool — it implements CL's workflow inline, in Phase 0 of its own process. Same at Phase 3.5 (`:275-279`).

### Recommendation for /migration

**Pattern B (Programmatic Mode) for Phase 6.** `/migration` Phase 6 "Prove" runs CL inline against the claims generated during execution (e.g., "File X was sanitized," "Import Y was rewritten to match destination idiom Z"). The benefits:

- No cross-skill dispatch overhead (no Skill-tool invocation, no state-file handoff).
- CL's output lives inside the /migration state file under `phase_6.convergence_report`, naturally co-located with other phase state.
- Matches `/deep-plan` and `/brainstorm` (`.../brainstorm/SKILL.md:271-272` references CL verification inline) precedent.

**Input contract for Pattern B:**
- Claims array: generated from Phase 5 execution log. Each claim: `{id, claim_text, source_file, evidence_path}`.
- Preset: `standard` (source-check → verification → fresh-eyes — `.../convergence-loop/SKILL.md:61`). Use `thorough` if `reshape`/`rewrite` verdicts ran in Phase 5 (higher stakes).
- Domain slicing: by unit-type. File-level claims get one slice, workflow-level another, concept-level a third.
- State: stored in the /migration state file's `phase_6` object. No separate `.claude/state/convergence-loop-*.state.json` file — this is the programmatic-mode convention.

**When Pattern A is still appropriate:** if the user explicitly wants a standalone CL pass on /migration artifacts AFTER /migration completes ("audit my last migration"). Then `/convergence-loop <path-to-MIGRATION_PLAN.md>` runs as a top-level skill, separate invocation.

---

## §4 — Sub-Skill Lifecycle: Does /migration-scan stand on its own?

### Trade-off framing

- **Standalone-callable:** User can invoke `/migration-scan <target>` directly without /migration. Pro: discoverability (SKILL.md listed in `.claude/skills/`; auto-loaded as tool). Pro: composability (a power-user can chain scan → custom-plan → prove without the router). Con: the standalone call lacks router-level state; the ancillary must handle the "no parent state" case gracefully.
- **Coupled-only:** `/migration-scan` is only callable from `/migration`. Pro: simpler invariants (always has router context). Con: reduces composability, hides useful tools.

### Precedent: /analyze handlers

`.../analyze/SKILL.md:50-57`:
> "Source type is already known → use the handler directly (`/repo-analysis`, `/website-analysis`, `/document-analysis`, `/media-analysis`) for slightly faster dispatch with no detection step"

All 4 CAS handlers are standalone-callable. The router is an optional front door, not a mandatory gatekeeper. And `.../analyze/SKILL.md:119-122`:
> "**Handler responsibilities:** Run the full pipeline per its SKILL.md. The handler treats the call as if invoked directly (`/repo-analysis <target> --depth=…`); `auto_detected_type` is informational."

The contract: handler behavior is identical whether called via router or directly. Router-provided fields are informational enrichment, never structural requirements.

### Verdict: Standalone-callable (dual-mode)

All /migration ancillaries should be dual-mode: callable via `/migration` (passed state + Handoff Contract payload), OR callable directly (start fresh, no parent state).

**Enforcement mechanism:**
- Each ancillary's SKILL.md has a "When to use" section listing both: "invoked by `/migration` Phase N" AND "directly when you already have <precondition>."
- SKILL.md "Input" section documents: "If invoked via /migration, state file `.claude/state/migration.<topic>.state.json` exists with parent context (read on entry); otherwise, start from scratch, prompt the user for anything the router would have supplied."
- A state-file schema validator script (`scripts/lib/validate-migration-state.js` — analog to `scripts/cas/update-index.js`) checks payload shape and rejects malformed handoffs with a specific error. This is the closest we get to "enforce coupling" without runtime gates the harness doesn't expose.

**Discoverability preserved** because every ancillary's SKILL.md is indexed by Claude Code's skill loader — they appear in the skill list like any other skill.

**Risk mitigation:** the router and each ancillary need to clearly document in their SKILL.md which state-file keys they READ vs WRITE so the boundaries are inspectable. This is just like the Handler Output Contract at `.claude/skills/shared/CONVENTIONS.md:190-213`.

---

## §5 — Re-entry Across Decomposition (D28)

### The question

If `/migration-scan` discovers a reframe (e.g., "this file isn't a file-unit port, it's actually a concept-unit port with ripple into 14 places"), where does re-entry happen? Inside the ancillary? At the router? Bubble all the way to `/brainstorm`?

### D28 recap

`BRAINSTORM.md:92`: "Brainstorm / deep-research / deep-plan re-entry is the norm, not the exception. Triggers: research surfaces material reframe → re-enter brainstorm; plan surfaces unknowns → re-enter research; execution surfaces design gaps → re-enter plan or brainstorm. Not a sequential pipeline; a loop."

### Recommendation: Bubble UP to the router; router decides.

**Mechanics:**

1. Ancillary detects reframe condition (configurable per ancillary, e.g., /migration-scan flags "ripple count > 10" or "unit type mismatch" as potential reframes).
2. Ancillary writes to state file: `reframe_request: {detected_by: "migration-scan", reason: "...", suggested_re_entry: "brainstorm" | "deep-research" | "deep-plan" | null, evidence_path: "..."}`.
3. Ancillary returns early with a clear text return like: "Reframe condition detected. Details in state file. Returning to router."
4. Router reads state file on ancillary return. Checks `reframe_request`. If present:
   a. Present to user: "Ancillary /migration-scan surfaced a potential reframe: <reason>. Options: (1) re-enter /brainstorm for this topic, (2) re-enter /deep-research for question X, (3) override reframe and continue, (4) abort."
   b. User picks.
   c. Router invokes the chosen upstream skill (e.g., `Skill(skill="brainstorm", args=<topic-slug>)`) — which in turn triggers the resume path of that skill (brainstorm.<slug>.state.json exists, offers resume).

**Why router-level, not ancillary-level:**

- **Authority preservation.** The router is the user's primary interface. Re-entering /brainstorm from inside /migration-scan silently would violate D8 ("Nothing silent, ever") — the user didn't ask /migration-scan, they asked /migration, and now suddenly they're in brainstorm without an explicit gate.
- **Gate model consistency.** Re-entry is a major decision. Major decisions route through gates. Gates live at the router's level of the stack.
- **Loop visibility.** D28 treats re-entry as a first-class loop. If the ancillary could silently re-enter, the loop becomes opaque. Router-level re-entry means the state file's gate log shows the full re-entry history, which is what D28's "not a sequential pipeline; a loop" requires for traceability.

**Edge case:** what if the ancillary surfaces a reframe that's scoped tightly to the ancillary's own work (e.g., /migration-scan's detection heuristic picked the wrong unit type, and just switching the type is enough)? The router's gate should include option (5): "don't re-enter upstream; re-run /migration-scan with the corrected unit type." This keeps the re-entry gate informed without forcing all reframes into /brainstorm.

---

## State-Passing Mechanism Table (Pros/Cons)

| Mechanism | Pros | Cons | Use for |
|---|---|---|---|
| **File-based artifact** (`MIGRATION_PLAN.md`, ripple inventory JSON, sanitize candidate list) | Durable, inspectable, survives compaction, matches all SoNash precedent (CAS analysis.json at `.../analyze/SKILL.md:144-148`, deep-research at `.../deep-research/SKILL.md:363-368`), large content OK | Path coordination needed; readers must validate existence + non-emptiness (Windows 0-byte bug per deep-research Critical Rule 4) | Substantive content (plans, inventories, verdicts, convergence reports) |
| **State-file JSON spine** (`.claude/state/migration.<topic>.state.json`) | Central, structured, compaction-safe, supports resume, enables gate log, mirrors `/deep-research` (`:202`) and `/deep-plan` (`:351-364`) | Single file = contention risk if parallel sub-skills; requires schema discipline | Gates, phase markers, skill handoff log, reframe flags, all state the harness needs for resume |
| **Skill-tool `args` string** | In-context, no disk round-trip, matches Skill tool schema | One string only; must serialize JSON; not readable by the ancillary's future resume — only fresh call | Minimal handshake payload on router→ancillary dispatch |
| **Skill-tool return text** | Easy; what the Skill tool naturally produces | Unstructured; LLM-synthesized summary; unreliable for structured data; CLAUDE.md §4 Guardrail #15 ("Never accept empty agent results silently" — `C:\Users\jbell\.local\bin\JASON-OS\CLAUDE.md:111-113`) flags the Windows 0-byte bug for anything treating agent return as primary | Advisory only; confirm success; read state file / artifact for substance | Advisory signal only |
| **MCP memory** | Cross-session persistent, structured, searchable | MCP dependency (JASON-OS minimality principle at CLAUDE.md:11-18 argues against); same-session slower than state file | Cross-session checkpoints only (e.g., `/checkpoint --mcp`) — NOT intra-flow state |

**Recommendation stack:** state-file as spine + disk artifacts for substance + Skill-tool args for handshake + return text as advisory. Skip MCP memory for intra-/migration use.

---

## Gate Memory Boundary Proposal (concrete)

**State-file schema additions:**

```json
{
  "version": "1.0",
  "topic": "migration-skill",
  "current_phase": 5,
  "direction": "in",
  "unit_type": "file",
  "output_mode": "direct-apply",
  "gates": [
    { "gate_id": "...", "skill": "migration", "scope": "router",
      "question": "...", "answer": "...", "timestamp": "...",
      "parent_gate": null }
  ],
  "sub_skill_handoffs": [
    { "handoff_id": "h1", "from": "migration", "to": "migration-scan",
      "phase": 2, "invoked_at": "...", "returned_at": "...",
      "payload": { /* JSON passed via Skill args */ },
      "return_text": "...", "artifacts_written": ["..."],
      "reframe_request": null }
  ],
  "reframe_history": [],
  "artifacts": { "plan": "...", "ripple": "...", "sanitize_candidates": "..." }
}
```

**Ancillary MUST protocol:**

1. On entry, read state file (if coupled mode) or start empty (if standalone).
2. Locate all parent-scope gates relevant to current phase.
3. Render "For context, you previously approved: <list>" before the first ancillary gate.
4. Every ancillary gate is a new gate with its own `gate_id` and `scope: "ancillary"`, with `parent_gate` pointing to the router gate it derives from.
5. User response is recorded; user may say "same as before" — that's a valid answer, but the gate was still asked.

**Verdict:** Gate memory crosses the boundary as READ-ONLY context. Confirmation authority does NOT cross the boundary. Each skill's SKILL.md must have this as an explicit Critical Rule at MUST level.

---

## Convergence-Loop Integration Shape (concrete)

**Pattern:** Programmatic Mode (`.../convergence-loop/SKILL.md:237-263`).

**/migration Phase 6 recipe:**

```
Phase 6: Prove
  6.1 Collect claims from Phase 5 execution log
      - Each claim: { id, text, source_path, evidence_type, evidence_path }
  6.2 Select preset (standard for copy/sanitize; thorough for reshape/rewrite)
  6.3 Select domain slicing (by unit type; 2-4 agents default)
  6.4 Inline-implement CL Setup → Loop → Report from CL SKILL.md §"Workflow"
      - Agent dispatch: Task tool with general-purpose subagent_type
      - T20 tally per pass (Confirmed / Corrected / Extended / New)
      - User gate before convergence declaration (CL Critical Rule 3)
      - Save tally to state file .phase_6.passes[] after each pass
  6.5 Generate convergence report: .research/migration/<topic>/CONVERGENCE_REPORT.md
      or embed in MIGRATION_PLAN.md if plan-export mode
  6.6 Gate: user reviews report, declares converged / not-converged / abort
```

**Input contract to programmatic CL:**
- `claims`: JSONL at `<state-dir>/phase_5_claims.jsonl` (one claim per line)
- `preset`: `"standard"` or `"thorough"` (ancillary chooses based on verdict mix)
- `slicing_strategy`: `"by-unit-type"` (default) or user override
- `max_passes`: 5 (CL default at `.../convergence-loop/SKILL.md:193-197`)
- `state_file_embed`: path to /migration state file (CL writes its passes array into `.phase_6.passes[]` rather than creating a separate CL state file — programmatic-mode convention)

**Output contract from programmatic CL:**
- `verified_claims_set` (corrected/extended in place in the claims JSONL)
- `convergence_status`: `"CONVERGED"` | `"UNCONVERGED"` | `"USER_ABORTED"`
- `confidence_score`: `"HIGH"` | `"MEDIUM"` | `"LOW"` (CL definitions at `.../convergence-loop/SKILL.md:97-99`)
- `report_path`: `CONVERGENCE_REPORT.md`

---

## Sub-Skill Lifecycle Decision

**Verdict: Standalone-callable (dual-mode).**

Each `/migration-*` ancillary:
- Has its own SKILL.md in `.claude/skills/migration-<suffix>/SKILL.md`.
- Appears in the skill discovery list (indexed automatically by Claude Code's skill loader).
- Is invokable two ways:
  1. Via `/migration` router (Handoff Contract payload + state file pre-populated)
  2. Directly by user (no parent state; the ancillary starts fresh, may prompt for anything the router would have supplied)
- Documents both paths explicitly in its SKILL.md "Input" and "When to Use" sections.

**Enforcement:** in-SKILL documentation + state-file schema validator (`scripts/lib/validate-migration-state.js`). No runtime coupling gates; Claude Code doesn't expose a way to restrict skill invocation. This matches `/analyze`'s approach at `.../analyze/SKILL.md:50-57`.

**Risk:** discoverability for ancillaries might confuse users ("should I use /migration or /migration-scan directly?"). Mitigation: each ancillary's "When to Use" section explicitly states "Most users should invoke /migration; use /migration-scan directly only if <specific condition>." This is the pattern `/repo-analysis` uses vs. `/analyze`.

---

## Re-entry Mechanics (concrete flow)

```
/migration Phase 2 (discovery) invokes /migration-scan
  ↓
/migration-scan runs, detects reframe condition
  ↓
/migration-scan writes state-file entry:
  sub_skill_handoffs[N].reframe_request = {
    detected_by: "migration-scan",
    reason: "ripple count 14 exceeds file-unit heuristic threshold of 5",
    suggested_re_entry: "brainstorm",
    evidence_path: ".research/migration-skill/scan-ripple.json"
  }
  ↓
/migration-scan returns (text return: "Reframe condition surfaced. Details in state file.")
  ↓
/migration router reads state file, sees reframe_request populated
  ↓
/migration router GATE:
  "Scan detected potential reframe: <reason>
   Evidence: <path>
   Options:
   1. Re-enter /brainstorm for migration-skill (recommended per suggested_re_entry)
   2. Re-enter /deep-research on specific question
   3. Override reframe; re-run /migration-scan with corrected unit_type=concept
   4. Proceed to Phase 3 without re-entry
   5. Abort /migration

   Choose 1-5:"
  ↓
User picks (e.g., 1). Router invokes Skill(skill="brainstorm", args="migration-skill")
  ↓
/brainstorm sees existing BRAINSTORM.md, offers resume, user provides reframe context
  ↓
/brainstorm completes; /migration state file updated with reframe_history[N] entry
  ↓
/migration resumes: user chooses to restart from Phase 0 or continue from updated Phase 2
```

**Key invariant:** the ancillary never invokes /brainstorm, /deep-research, or /deep-plan directly. Only the router does. This keeps re-entry authority centralized and gate log clean.

---

## Sources

- `C:\Users\jbell\.local\bin\JASON-OS\.research\migration-skill\BRAINSTORM.md:79-92` — R1/R3/D28 source
- `C:\Users\jbell\.local\bin\sonash-v0\.claude\skills\analyze\SKILL.md:100-126` — router → handler Handoff Contract v1.2
- `C:\Users\jbell\.local\bin\sonash-v0\.claude\skills\analyze\SKILL.md:213-230` — Router Flow Steps 3-5, Skill-tool dispatch mechanism
- `C:\Users\jbell\.local\bin\sonash-v0\.claude\skills\analyze\SKILL.md:50-57` — "handler directly" — standalone-callable precedent
- `C:\Users\jbell\.local\bin\sonash-v0\.claude\skills\deep-research\SKILL.md:202` — state-file creation; `:388-392` — compaction resilience / resume from state
- `C:\Users\jbell\.local\bin\sonash-v0\.claude\skills\deep-research\SKILL.md:37-40` — Critical Rule 4 on Windows 0-byte bug — disk-first state
- `C:\Users\jbell\.local\bin\sonash-v0\.claude\skills\convergence-loop\SKILL.md:237-263` — Programmatic Mode contract
- `C:\Users\jbell\.local\bin\sonash-v0\.claude\skills\convergence-loop\SKILL.md:61-67` — preset definitions
- `C:\Users\jbell\.local\bin\sonash-v0\.claude\skills\convergence-loop\SKILL.md:97-99` — confidence scoring
- `C:\Users\jbell\.local\bin\sonash-v0\.claude\skills\deep-plan\SKILL.md:149-155` — Pattern B (programmatic CL) precedent in Phase 0
- `C:\Users\jbell\.local\bin\sonash-v0\.claude\skills\deep-plan\SKILL.md:275-279` — Pattern B at Phase 3.5
- `C:\Users\jbell\.local\bin\sonash-v0\.claude\skills\deep-plan\SKILL.md:351-364` — topic-keyed state file pattern
- `C:\Users\jbell\.local\bin\sonash-v0\.claude\skills\brainstorm\SKILL.md:271-272` — brainstorm's programmatic CL use at Phase 4
- `C:\Users\jbell\.local\bin\sonash-v0\.claude\skills\shared\CONVENTIONS.md:190-213` — Handler Output Contract precedent
- `C:\Users\jbell\.local\bin\JASON-OS\CLAUDE.md:91` — Behavioral Guardrail #4 "Stop and ask = hard stop" (applies to gate re-prompting)
- `C:\Users\jbell\.local\bin\JASON-OS\CLAUDE.md:111-113` — Guardrail #15 on empty agent results (underpins "disk as authoritative surface")
- `C:\Users\jbell\.local\bin\JASON-OS\CLAUDE.md:11-18` — Stack minimality (rules out MCP for intra-flow state)
- Skill tool schema (this agent's tool list) — confirms fire-and-return semantics, `args` as single string, text-only return
