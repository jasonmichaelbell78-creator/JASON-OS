# Byte-Weighted Batching — agent fleet sizing

The batch-split heuristic `/label-audit` (§S7) and the back-fill
orchestrator (§S8) use to divide a target file set across derivation
agents. Derived from the Piece 1a discovery-scan LEARNINGS and T22
(internal-scan allocation fix).

---

## The heuristic

```
TARGET_KB_PER_AGENT      = 135  # midpoint of 120–150 KB window
LARGE_FILE_THRESHOLD_KB  = 50   # files >50 KB count as 2 units
MAX_FILES_PER_BATCH      = 15   # per-batch file-count cap (stall defense)
```

### Step 1 — Gather sizes

Stat every target file. For each:

```
raw_kb   = fileSize / 1024
weighted = raw_kb > LARGE_FILE_THRESHOLD_KB ? raw_kb * 2 : raw_kb
```

### Step 2 — First-fit decreasing bin-packing

Sort files descending by `weighted`. Pack into bins:

- For each file, place in the first bin whose current total + weighted ≤
  `TARGET_KB_PER_AGENT` **AND** whose current file count is below
  `MAX_FILES_PER_BATCH`.
- If no bin fits, start a new bin.
- Bins ≈ batches; batch count = agent count (before doubling for
  primary/secondary).

The dual cap (bytes + file count) keeps dense small-file batches from
exceeding the `feedback_agent_stalling_pattern` ceiling: agents reading
16+ files silently stall, so we pack at most 15 files per bin even when
the byte budget could hold more. See "Why cap file count?" below.

### Step 3 — Apply the T22 count-pass gate

Before dispatching, print the allocation:

```
Target files: 37
Total bytes: 942 KB (weighted: 1121 KB with large-file doubling)
Batches: 9 (average 125 KB per batch)
Agents to dispatch: 18 (9 primary + 9 secondary)
```

**Confirm with the user.** Per T22 learnings, internal codebase scans
should never dispatch blindly — a quick confirmation catches mis-sizing
before 9–18 agents spin up.

---

## Why 120–150 KB?

Piece 1a discovery-scan learned that a single derivation agent with
~135 KB of input:

- Stays well within the effective context-window sweet spot
- Produces consistent per-file output quality
- Doesn't stall under the Windows 0-byte-output bug pattern
  (`feedback_agent_output_files_empty`) at this size

Below ~50 KB per agent, per-agent overhead dominates — too many agents,
too many concurrent spawns, higher coordination cost.

Above ~200 KB per agent, output quality drops measurably and timeouts
become likely. The 135 KB midpoint is a safety margin on both ends.

---

## Why cap file count at 15?

An agent's stall mode under the Windows 0-byte-output bug pattern
correlates with file count as well as byte count. The
`feedback_agent_stalling_pattern` memory captures this: "agents reading
16+ files silently stall; split into narrower scopes."

Without the cap, a dense batch of 30 × 2 KB memory files weighs only
60 KB (well under target) but handing it to one agent triggers the
stall. Capping at 15 files forces a split into two comfortable batches
that each stay below both thresholds.

The cap is a ceiling, not a quota: batches with 4 or 6 files are fine
when their bytes fit. Only applies when density would otherwise push a
bin above 15 files.

## Why double large files (>50 KB)?

A single 90 KB file needs roughly the same agent attention as two 45 KB
files — it's not the raw bytes, it's the structural complexity an agent
must traverse. Doubling the weighting forces the allocator to give a
large file its own batch (or pair it only with a small counterpart),
which keeps per-agent load balanced.

Edge case: a >135 KB file is a single-file batch at weight 2×. The
allocator accepts this even though it slightly exceeds
`TARGET_KB_PER_AGENT` when doubled — splitting a single file across
agents is worse than accepting the overflow.

---

## Example calculation

10 files:

| File | Size | Weighted |
| --- | --- | --- |
| big-skill.md | 80 KB | 160 KB |
| hook-lib.js | 40 KB | 40 KB |
| plan.md | 30 KB | 30 KB |
| derive.js | 20 KB | 20 KB |
| agent.md (×6) | 5 KB | 5 KB |

Total raw = 200 KB; total weighted = 280 KB.

With `TARGET_KB_PER_AGENT = 135`:

- **Batch 1** (135 KB): big-skill.md alone (160 KB; single-file overflow accepted)
- **Batch 2** (90 KB): hook-lib.js + plan.md + derive.js
- **Batch 3** (30 KB): 6× agent.md

3 batches → 6 agents dispatched (3 primary + 3 secondary).

---

## When to deviate

- **`--recent` scans on small windows** — if N < 5 files, skip the
  batching altogether; dispatch one primary + one secondary on the whole
  set.
- **`--composites` or `--sections` modes** — these re-derive a specific
  field family, not full records. Use a looser target (~250 KB per agent)
  since per-file output is smaller.
- **Files flagged `stub`** — usually very short; pack them tightly with
  `TARGET_KB_PER_AGENT = 200`.

---

## Cross-references

- Piece 1a LEARNINGS: `.research/sync-mechanism/piece-1a-discovery-scan-jason-os/RESEARCH_OUTPUT.md`
- T22 (deep-research allocation fix): `.planning/todos.jsonl`
- `feedback_agent_stalling_pattern` (memory): narrow scope per agent
- `feedback_no_research_caps` (memory): never cap agent counts artificially
- Plan §S8 Phase 2 — back-fill orchestrator batch phase
