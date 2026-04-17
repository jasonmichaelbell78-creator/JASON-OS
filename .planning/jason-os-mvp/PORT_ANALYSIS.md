# PORT_ANALYSIS.md — JASON-OS Foundation Port Ledger

**Purpose:** Central ledger for every file ported from SoNash to JASON-OS
during the Foundation implementation (PLAN.md Steps 1–6, Layers 0+/0/1/2/3/4).
One row per ported file. Per **MI-1** (pre-analysis before every port) and
**D13** (central ledger schema).

**Plan reference:** [PLAN.md](./PLAN.md) — Pre-Analysis Template section.
**Decisions reference:** [DECISIONS.md](./DECISIONS.md) — D13 (schema), D21
(extended regex), MI-1 (rule), D17 (port-agent template).

**Usage:** Every port step — whether manual in main session (Layer 0+) or
dispatched to a port-agent (Layer 0/1/Step-4/gated layers) — MUST:

1. Run the extended regex below on the source file; count matches per
   category.
2. `grep -r` for `require.*<basename>` / `import.*<basename>` in the SoNash
   tree to identify upstream callers.
3. Read source file's `require` / `import` statements for downstream deps.
4. Append a row to this ledger before the port executes.
5. After the port commits, backfill the Port Date and Commit SHA columns on
   the row.

No file is ported without a row here first (MI-1).

---

## Extended Pre-Analysis Regex (D21)

Single regex used for category (a) — sanitization scan — across every source
file:

```
(sonash|SoNash|firebase|Firebase|firestore|httpsCallable|sonarcloud|SonarCloud|MASTER_DEBT|TDMS|tdms|/add-debt|Qodo|qodo|CodeRabbit|coderabbit|Gemini|npm run (patterns:check|session:gaps|hooks:health|session:end|reviews:sync|skills:validate|docs:index)|write-invocation\.ts|session-end-commit|hasDebtCandidates|pr-ecosystem-audit)
```

Categories (b) upstream callers and (c) downstream deps are gathered via
separate `grep` / `require|import` parse — see PLAN.md Port-Agent Template
Step 1–3.

---

## Verdict Legend (D13)

| Verdict | Meaning |
|---|---|
| `copy-as-is` | Zero hits across (a)/(b)/(c) that require edits; byte-copy acceptable. |
| `sanitize-then-copy` | Hits found but all replaceable by string substitution or section strip; semantics preserved. |
| `redesign` | Coupling or references that require rewriting the file's approach before porting. |
| `skip` | Not portable; do not port; record why and surface to user. |
| `blocked-on-prereq` | Cannot port until an earlier port lands (e.g., depends on `hooks/lib/*` not yet copied). |

---

## Row Schema (D13)

```
| # | Source (SoNash) | Target (JASON-OS) | Refs Found | Upstream Callers | Downstream Deps | Verdict | Port Date | Commit SHA |
```

Column semantics:

- **#** — monotonic counter; matches PLAN.md step numbering where applicable
  (e.g., row `0f` = Layer 0+ item `0f`).
- **Source (SoNash)** — absolute path under
  `C:/Users/jbell/.local/bin/sonash-v0/` (or relative under that root).
- **Target (JASON-OS)** — path under
  `C:/Users/jbell/.local/bin/JASON-OS/` (or relative under that root).
- **Refs Found** — regex-category summary, e.g. `sonash: 3, firestore: 0,
  Qodo: 2` or `none` if zero hits.
- **Upstream Callers** — who in SoNash `require`s/`import`s this file;
  surfaces whether callers also need porting or whether breakage risk exists.
- **Downstream Deps** — what this file itself `require`s/`import`s;
  surfaces `hooks/lib/*` / `scripts/lib/*` prereqs that must already be
  present at target.
- **Verdict** — from the legend above.
- **Port Date** — ISO date the port commit landed (`YYYY-MM-DD`).
- **Commit SHA** — short SHA of the port commit (D18: one commit per port;
  some logical bundles group multiple scripts under one commit — use the
  same SHA on all rows in that bundle).

---

## Notes Section

Free-form notes for items that don't fit the row schema (e.g., Step 2
skill-audit branch identification, Layer 2 settings.json schema changes,
audit checkpoint findings).

### Step 2 — SoNash `skill-audit` feature branch

*(To be populated when Step 2 completes — see PLAN.md Step 2 and Layer 0+
item `0f`. Recorded fields: branch name, tip SHA, files carried,
confirmation-from-user date.)*

---

## Ledger

| # | Source (SoNash) | Target (JASON-OS) | Refs Found | Upstream Callers | Downstream Deps | Verdict | Port Date | Commit SHA |
|---|---|---|---|---|---|---|---|---|
| *(no rows yet — first port row lands at Step 2 notes / Layer 0+ item `0f`)* | | | | | | | | |

---

## Row Count Invariants (for audit checkpoints)

At each PLAN.md audit checkpoint (D29), expected minimum row counts:

| Checkpoint | Minimum rows |
|---|---|
| After Layer 0+ | 1 (`0f` skill-audit refresh; 0g+0h+0i+0j not ports so no rows) |
| After Layer 0 | 4 total (0f + 3 todos; add-debt is a new stub, no row) |
| After Layer 1 prereq | 8 total (+ 4 `hooks/lib/*`) |
| After Layer 1 | 12 total (+ session-end SKILL.md + session-end-commit.js + pre-compaction-save + compact-restore + commit-tracker = 5 more) — wait: 12? recount → 8 + 5 = 13; SESSION_CONTEXT.md is new-stub, no row. So minimum **13**. |
| After Pre-push mini-phase | 17–20 total (+ pr-review SKILL.md + ~3 reference files + pre-commit-fixer SKILL.md + companions) |
| After Layer 2 | +6 (if engaged) |
| After Layer 3 | +0 (all new docs, not ports) |
| After Layer 4 | +3 (if engaged) |

Audits verify the ledger row count is ≥ the minimum for the layers that have
landed.
