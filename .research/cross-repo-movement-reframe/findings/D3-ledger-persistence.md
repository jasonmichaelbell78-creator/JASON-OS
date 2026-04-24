# Findings: D3 — Ledger Persistence Format, Physical Location, Locking, and Rollback

**Searcher:** deep-research-searcher (A3)
**Profile:** web + codebase
**Date:** 2026-04-23
**Sub-Question IDs:** A3 (D3)

> **Orchestrator note:** This file was captured via the Windows 0-byte
> agent-output fallback (Critical Rule 4). Content below is the agent's
> verbatim return.

---

## Sub-question

What is the right persistence format, physical location, locking semantics,
and rollback strategy for the lineage ledger? Four sub-parts: persistence
format, physical location, single file vs sharded, locking + rollback
semantics.

---

## Approach

Read the two context docs first to understand the lineage ledger's
requirements and the Direction D' architecture. Then read all six relevant
`scripts/lib/` files (`safe-fs.js`, `parse-jsonl-line.js`, `read-jsonl.js`)
and the `preview.js` rollback precedent. Sampled existing
`.claude/state/*.jsonl` files for shape and size. Ran four targeted web
searches on append-only log patterns, SQLite vs flat-file tradeoffs, JSONL
sharding thresholds, and torn-line crash recovery. Cross-referenced
codebase evidence against web findings.

---

## Findings — Persistence Format

### Comparison

**JSONL (append-only line-delimited JSON)**

- Read-query performance: O(n) full scan. For a ledger expected to hold hundreds of movement records, acceptable. `safe-fs.streamLinesSync` (`scripts/lib/safe-fs.js:327-364`) handles this without loading the whole file into memory.
- Concurrent-write safety: requires advisory locking per write. `safe-fs.withLock` already exists and handles single-user CLI concurrency.
- Conflict resolution if git-tracked: merge conflicts on JSONL are painful — decisive argument against tracking the ledger in git.
- Inspectability: `cat`/`grep`/`jq` directly. Same shape as `commit-log.jsonl`, etc.
- Pre-existing pattern: all six state files in `.claude/state/` are JSONL. All needed primitives (`read-jsonl.js`, `parse-jsonl-line.js`, `streamLinesSync`, `safeAppendFileSync`, `safeAtomicWriteSync`) are written and tested.

**SQLite**

- Read-query performance: indexed queries are faster on large datasets. Overkill at expected ledger volumes.
- Concurrent-write safety: WAL mode handles concurrent readers + one writer. Requires `sqlite3` installed on operator's machine — breaks JASON-OS's "no runtime deps" contract in `package.json`.
- Conflict resolution if git-tracked: binary file, completely unmergeable.
- Inspectability: requires `sqlite3` CLI or GUI. User cannot `cat` it.
- Pre-existing pattern: zero usage anywhere in JASON-OS.

**Content-addressed directories (one file per record, named by hash)**

- Read-query performance: directory listing + N file reads. Worst for "what's out of sync" command on Windows NTFS at hundreds of entries.
- Concurrent-write safety: each record atomic; no lock for independent records, but breaks when read-then-write multiple records atomically.
- Conflict resolution if git-tracked: merges cleanly. Only format that survives git-tracking. But see location analysis — git-tracking declined.
- Inspectability: directory + file readable, but "what's the ledger?" is not a single `cat`.
- Pre-existing pattern: zero usage.

### Recommendation: JSONL

**Pick JSONL.** Decision is not close. Every JASON-OS state primitive is
already JSONL. All read/write/parse/lock helpers are written and tested
for JSONL. Inspectability argument is decisive. SQLite's query advantage
does not emerge at realistic ledger volumes (hundreds of records, not
millions). Content-addressed dirs have a theoretical advantage for
git-tracking that is explicitly being declined.

**What we are giving up:** O(log n) indexed queries. If the ledger ever
reaches tens of thousands of records (very unlikely — each record is a
human-initiated movement), full scan becomes slow. Sharding is the
mitigation if that threshold approaches.

**Confidence: HIGH**

---

## Findings — Physical Location

### Four options evaluated

**Option 1: `.claude/state/ledger.jsonl` (gitignored, per-locale)**

Matches the existing convention exactly. Already gitignored in
`.gitignore:47`. Per-locale means home and work machines have separate
ledgers. Cross-machine reality: movements at home not visible on work
machine until explicit sync — gap, not fatal. Files themselves are source
of truth; ledger is a convenience cache.

- Strength: zero new convention, zero git-tracking complexity, no merge conflicts.
- Weakness: per-locale blind spot for "check what's out of sync" on a machine that didn't perform the movements.

**Option 2: `.claude/sync/ledger/` (tracked in git, shared across machines)**

- Solves cross-machine blind spot.
- Fatal: every append produces a merge conflict at the file end on sync. JSONL merges genuinely (not auto-resolvable).
- Additional: tracks path/content data in git, hitting CLAUDE.md §2 security constraints.
- Not recommended.

**Option 3: Per-repo (each owned repo carries its own ledger)**

- Each repo's ledger travels with the repo.
- Problem: orchestrator has to discover all owned repos on each machine. Querying "what's out of sync across all repos" requires opening N files.
- Contradicts BRAINSTORM.md: ledger lives in JASON-OS as a shared internal.
- Not recommended.

**Option 4: Central (single ledger across all owned repos, in JASON-OS)**

This is Option 1 made explicit. Matches BRAINSTORM.md.

### Recommendation: `.claude/state/ledger.jsonl` (Option 1 = Option 4)

One central ledger in JASON-OS's gitignored state directory.

**Cross-machine gap mitigation:** add `ledger.jsonl` to `/context-sync`'s
managed set. The ledger is itself a user-scoped artifact recording the
user's movement history. Not a special-case mechanism — a direct use of
the tool being built.

**Confidence: HIGH**

---

## Findings — Single File vs Sharded

### Size threshold

`commit-log.jsonl`: 68 records, 39,813 bytes (~39 KB). Each commit-log
record is moderately large. Ledger record similar (~500–800 bytes).

`readTextWithSizeGuard` enforces 2 MiB ceiling default (`safe-fs.js:265`).
At 800 bytes/record: ~2,621 records. At 500 bytes: ~4,194.

User-driven movement rates: 5/session × 3 sessions/week = 780 records/year.
Single file stays under 2 MiB for years. `streamLinesSync` removes the
ceiling for streaming readers anyway.

**Sharding not needed at launch.** Trigger for sharding: crossing 2,000
records (conservative). 3–5 years of heavy use.

### Sharding strategy if reached

Year-based sharding: `ledger.2026.jsonl`, `ledger.2027.jsonl`, etc. Active
shard is `ledger.jsonl` (current year). Year-based has the clearest split
rule (timestamp decides). Per-companion or per-repo sharding complicates
the "what's out of sync" scan more.

**Confidence: HIGH**

---

## Findings — Locking + Rollback

### Concurrent writes

Concurrency model: multiple companions invoked sequentially within one
session, possibly nested (BRAINSTORM.md: "a port companion invokes
`/context-sync` as a sub-step"). Strictly parallel concurrent writes from
separate processes are not the threat — single-user CLI tool.

`safe-fs.withLock` (`scripts/lib/safe-fs.js:614-621`) is the right
primitive:
- Creates `ledger.jsonl.lock` containing `{ pid, timestamp, hostname }`
- Spins up to 5,000 ms (configurable) waiting for existing lock
- Auto-breaks stale locks via PID liveness check (`isLockHolderAlive`, line 442-456)
- Uses `Atomics.wait` to spin without busy-loop (line 377-379)
- Already tested in production against commit-log and hook-warnings-log writes

**Recommended locking scope: whole-file, coarse.** Per-record locking
would require complex lock-management and a different storage format.
Coarse file-level locking via `withLock` is correct because: (1) write
operations are short (microseconds), (2) nested companion invocations are
sequential in practice, (3) 5 s timeout is generous.

For atomic read-then-write: both read and write inside the same `withLock`
call. Standard pattern: `withLock(ledgerPath, () => { read(); compute();
write(); })`.

**Confidence: HIGH**

### Rollback for half-applied movements

Precedent: `preview.js:promotePreview()` and `preview.js:applyArbitration()`.
Pattern:
1. Read all data up-front before any write
2. Snapshot existing state into memory before touching disk
3. Apply writes in sequence; on later failure, restore from in-memory snapshot
4. Surface both primary error and any rollback failure together

Applied to ledger writes during a port:
- Companion writes N files into destination, then appends one ledger record
- The ledger record is always the last step. If any file write fails before the ledger append, the ledger is untouched — no rollback needed
- If the ledger append itself fails after all N files are written, the files exist but the ledger has no record. Known gap, not torn state. Next "check what's out of sync" detects orphans

Use `safeAppendFileSync` inside a `withLock` call. On failure: catch, log
explicitly, surface to user with the specific path. Do not silently
swallow.

**Confidence: HIGH**

### Crash recovery (torn line)

If the process crashes mid-record-write, `safeAppendFileSync` will have
written a partial JSON object — torn line that fails `JSON.parse`.

`scripts/lib/parse-jsonl-line.js:33-42` (`safeParseLine`) returns `null`
for blank or malformed lines without throwing. `read-jsonl.js:43-48` skips
malformed lines with a console warning (line number + filename).

Torn line is non-fatal: warning + skip. Outcome: same as failed append
(unregistered movement → orphan detection on next scan).

**Optional hardening:** startup `validateLedger` step that calls
`read-jsonl.js` in warning mode and prints any torn lines, prompting user
to accept skip or run a repair pass. Not needed at launch but named
future step if usage grows.

`safeAtomicWriteSync` (tmp + rename) is NOT applicable to append
operations — rewrites the whole file, expensive for a growing log. Use
`safeAppendFileSync` inside `withLock` instead.

**Confidence: HIGH**

---

## Recommended infra reuse

| Primitive | Location | Use for ledger |
|---|---|---|
| `safeAppendFileSync` | `scripts/lib/safe-fs.js:109-115` | Append new ledger records |
| `withLock` | `scripts/lib/safe-fs.js:614-621` | Wrap every read+write or atomic append |
| `acquireLock` / `releaseLock` | `scripts/lib/safe-fs.js:547-603` | Direct use if `withLock`'s try/finally is too coarse |
| `streamLinesSync` | `scripts/lib/safe-fs.js:327-364` | Full-ledger scans — no 2 MiB ceiling |
| `readTextWithSizeGuard` | `scripts/lib/safe-fs.js:279-288` | Acceptable for ledgers under 2 MiB; `streamLinesSync` preferred for forward compat |
| `safeParseLine` | `scripts/lib/parse-jsonl-line.js:33-42` | Line parsing in ledger library's read function |
| `safeParseLineWithError` | `scripts/lib/parse-jsonl-line.js:55-67` | Startup validation / torn-line detection |
| `readJsonl` | `scripts/lib/read-jsonl.js:31-52` | Convenience wrapper for full ledger loads if < 2 MiB |
| snapshot + restore pattern | `.claude/sync/label/backfill/preview.js:183-233` | Reference for any multi-file write rollback |

**Extensions needed (new):**
- `ledger-io.js` library in `scripts/lib/` (analogous to `catalog-io.js`) wrapping `safeAppendFileSync` + `withLock` + `streamLinesSync` + `safeParseLine` into named operations: `appendRecord`, `scanRecords`, `findByPath`, `validateLedger`. Keeps lock scope and file path consistent across all callers.
- Startup validation call in orchestrator that runs `safeParseLineWithError` across the ledger and reports any torn lines since last run.

---

## Claims

1. **JSONL is the correct persistence format.** [HIGH] All six existing `.claude/state/` files are JSONL. All read/write/parse/lock helpers in `scripts/lib/` are JSONL-native.
2. **SQLite is not appropriate.** [HIGH] No SQLite dependency in `package.json`. Adding violates minimal-dep posture. Query-perf advantage doesn't emerge at realistic volumes.
3. **The ledger should live at `.claude/state/ledger.jsonl`.** [HIGH] Existing convention. Path already gitignored.
4. **The ledger must not be git-tracked.** [HIGH] JSONL produces real merge conflicts on independent appends. No JSONL merge driver auto-resolves.
5. **Cross-machine sync handled by `/context-sync`, not git.** [MEDIUM] `/context-sync` is the bootstrap companion syncing user-scoped/machine-scoped artifacts. `ledger.jsonl` fits that category. Architecturally clean but requires `/context-sync` to include ledger in managed set — design decision for planning.
6. **Single file appropriate at launch; sharding threshold ~2,000 records.** [HIGH] `safe-fs.js:265` DEFAULT_READ_MAX_BYTES = 2 MiB. At 800 bytes/record: ~2,621. Realistic rates: hundreds/year.
7. **Year-based sharding is the right strategy if threshold reached.** [MEDIUM] Clear unambiguous split rule.
8. **`withLock` (coarse whole-file) is the right locking primitive.** [HIGH] Short writes (microseconds), sequential nested invocations, 5 s timeout generous, auto-breaks stale locks.
9. **Ledger record should be the last step of a movement, not the first.** [HIGH] Files-first then ledger; failed file write leaves ledger untouched. Failed ledger append after files leaves orphans (detectable).
10. **Torn lines from mid-write crashes are non-fatal and skipped by existing helpers.** [HIGH] `safeParseLine` returns `null`; `readJsonl` warns + skips. Outcome (unregistered movement) caught by orphan detection.
11. **`safeAtomicWriteSync` (tmp + rename) is NOT appropriate for append.** [HIGH] Rewrites whole file. Use `safeAppendFileSync` inside `withLock`.

---

## Sources

| # | URL / Path | Title | Type | Trust | Date |
|---|---|---|---|---|---|
| 1 | `scripts/lib/safe-fs.js` | Atomic write, locking, streaming, symlink guards | Codebase | HIGH | 2026 |
| 2 | `scripts/lib/parse-jsonl-line.js` | `safeParseLine`, `safeParseLineWithError` — torn-line recovery | Codebase | HIGH | 2026 |
| 3 | `scripts/lib/read-jsonl.js` | `readJsonl` — full-file JSONL reader | Codebase | HIGH | 2026 |
| 4 | `.claude/sync/label/backfill/preview.js` | `applyArbitration`, `promotePreview` — snapshot+rollback precedent | Codebase | HIGH | 2026 |
| 5 | `.claude/state/commit-log.jsonl` | Measured: 68 records, 39 KB — baseline for size estimates | Codebase | HIGH | 2026 |
| 6 | `.gitignore:47` | `.claude/state/` is gitignored — confirms per-locale location | Codebase | HIGH | 2026 |
| 7 | https://learn.microsoft.com/en-us/azure/architecture/patterns/event-sourcing | Event Sourcing Pattern — append-only write semantics | Official docs | MEDIUM | 2024 |
| 8 | https://sqlite.org/whentouse.html | SQLite appropriate uses | Official docs | HIGH | 2024 |
| 9 | https://news.ycombinator.com/item?id=23064905 | HN: "you don't want to use SQLite for logs" | Community | MEDIUM | 2020 |
| 10 | https://github.com/sumant1122/agentlog | AgentLog — append-only JSONL for multi-agent event buses | Community | MEDIUM | 2024 |

---

## Contradictions

None significant. Web search confirmed community consensus on SQLite-vs-flat-
file tradeoffs (HN, sqlite.org) which aligns with codebase evidence. One
mild tension: SQLite's official docs endorse it for single-user CLI; the
counter is that JASON-OS already has a working JSONL stack and no SQLite
dependency, making the switching cost entirely unjustified.

---

## Gaps and Uncertainties

1. **`/context-sync` ledger inclusion** — Whether the ledger file gets included in `/context-sync`'s managed set. BRAINSTORM open question #8 applies. Belongs in planning.
2. **Orphan detection mechanism** — Rollback strategy relies on "orphan detection on next scan" as recovery for failed ledger append. The mechanics of that scan are not defined here. A1's scope (field shape determines what makes a record matchable) and planning scope.
3. **`ledger-io.js` API spec** — Recommended creating the wrapper but didn't specify internal API beyond naming four operations. Exact signatures depend on A1's field shape.
4. **Multi-machine clock skew** — If the user syncs the ledger from home to work and timestamps disagree, record ordering in JSONL could be misleading. Minor at human-invocation rates but worth noting.

---

## Confidence Assessment

- HIGH: 7 claims
- MEDIUM: 3 claims
- LOW: 0
- UNVERIFIED: 0
- Overall: HIGH

Persistence format and locking grounded entirely in existing codebase.
Physical location follows from gitignore and state directory convention.
Rollback pattern is direct application of `preview.js` precedent. Only
cross-machine sync (claim 5) and sharding strategy (claim 7) carry
MEDIUM confidence — both involve design decisions not yet locked.

---

## Serendipity

The `preview.js` rollback pattern is more directly applicable to the
ledger than expected. The "ledger record last" ordering rule (claim 9)
is already implicit in how `applyArbitration` structures its writes — the
ledger's rollback case is strictly simpler than the two-file preview
rollback (no second file to undo).
