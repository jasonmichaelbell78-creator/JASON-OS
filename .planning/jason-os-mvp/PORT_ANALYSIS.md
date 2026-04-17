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

**Confirmed:** 2026-04-17 (user).
**Pull from:** SoNash branch `41526` (NOT `main`).
**Tip commit on branch:** `03bd6b7e docs(skills): synthesize v2.0 propagation — /recall + 4 handlers + /session-end` (2026-04-17 working state).
**Latest skill-audit-touching commit on branch:** `138661e0 fix(skill-audit): MAJOR review fixes — Qodo bugs, regex DoS, doc lint, CC`.
**Files carried by branch for skill-audit refresh:** `.claude/skills/skill-audit/SKILL.md`, `.claude/skills/skill-audit/REFERENCE.md` (2 files).

**Why 41526 over main:**

- `git diff main..41526 -- .claude/skills/skill-audit/` = **empty** — skill-audit files are byte-identical between the two branches, so 41526 loses nothing for the `0f` refresh.
- `41526` is *ahead of* main by 10 commits on **other** skills that Foundation later ports (session-end metrics pipeline, synthesize v2.0 propagation, post-todos-render fixes). Pulling from 41526 anchors downstream ports (Layer 1 item 1.2 session-end in particular) to newer baselines than main offers.
- `main` is ahead by 1 commit: `e190f548` hono dep bump — unrelated to JASON-OS.
- SoNash is already checked out on `41526` in this locale; no branch switch needed for the port-agent's `grep -r` scans.

**Pre-port doc-hygiene observation** (to handle during Layer 0+ item `0f` pre-analysis, not now): SKILL.md frontmatter declares `Document Version: 3.0 (2026-03-06)` but commit `eb258803` was titled "Wave 3 SKILL.md v4.0 bump". Reconcile the version string during the port — likely a commit-message-vs-content mismatch to correct on import.

**Resolved during 0f port (2026-04-17):** The v3.0 declaration is what SoNash 41526 currently carries — no content mismatch in the files themselves. Commit `eb258803`'s "v4.0 bump" label appears to have been either reverted subsequently or overstated in the message. JASON-OS adopts v3.0 as declared to match source of truth. If SoNash later updates to v4.0 and JASON-OS wants to re-sync, the sync-mechanism research (MI-3) will carry it.

**0f port details (2026-04-17):**

- **Sanitization applied:** Invocation Tracking block stripped from SKILL.md (mirrors 0c's strip on the pre-refresh file — the block re-appeared when SoNash content was pulled in; re-strip preserves 0c's invariant that JASON-OS skills don't reference `write-invocation.ts`).
- **AgentSkills fields restored:** `compatibility: agentskills-v1` + `metadata.version: 3.0` re-added to frontmatter (these were present on pre-refresh JASON-OS file via 0e; overwriting with SoNash content would have removed them).
- **Retained as advisory (flagged for later):** 5 `npm run skills:validate` references in SKILL.md. The SoNash `skills:validate` script is not ported to JASON-OS and is not in any Foundation layer. Users running the refreshed skill-audit will see these pointers and get a missing-npm-script error if they execute them. The skill remains functional — these are advisory "if you have this command, run it" prompts, not hard steps. Flagged for follow-up: either port `skills:validate` or rewrite the prompts.
- **Dead links flagged (not in Foundation scope):** Both SKILL.md (6 refs) and REFERENCE.md (1 ref) reference `_shared/SELF_AUDIT_PATTERN.md` and `_shared/SKILL_STANDARDS.md`. Neither `_shared/` dir nor its contents exist in JASON-OS. These refs are dead links that will render broken when followed. Options for later:
  1. Port `_shared/SELF_AUDIT_PATTERN.md` + `_shared/SKILL_STANDARDS.md` — pairs naturally with MI-5 (per-skill self-audit work) and Layer 3 SKILL_INDEX infrastructure.
  2. Rewrite refs in skill-audit to drop `_shared/` paths (content duplication).
  Recommendation: Option 1, handled as a Layer 3 scope addition — log as Post-Foundation Deferral / migration-to-/todo candidate.
- **User-action step outstanding:** ⚠️ After this commit lands, user should restart Claude Code session to reload the skill registry (per memory `feedback_agent_hot_reload.md`). NOT required immediately — the refreshed skill-audit is only invoked starting at MI-5 "per-skill self-audit" sub-steps during Layer 0 /todo port and beyond. Restart can be deferred to Layer 0+ completion boundary (after 0g and 0h), which is a natural session edge.

- **Outcome — no-op-verified (2026-04-17):** The port-agent node operation ran to completion and wrote `.claude/skills/skill-audit/{SKILL.md,REFERENCE.md}` with sanitized SoNash 41526 content + restored AgentSkills fields. However, `git diff HEAD~1 HEAD -- .claude/skills/skill-audit/` against the 0e commit is **empty** — the generated bytes are byte-identical to the pre-refresh JASON-OS state. Interpretation: JASON-OS's original bootstrap extraction of skill-audit was already from the same SoNash skill-audit content (post-Wave-4 + MAJOR review fixes); the subsequent 0c strip + 0e AgentSkills fields had already produced exactly what 0f's refresh logic generates. The "refresh" is therefore a roundtrip validation rather than an update. The workflow is correct — future 0f-style refreshes (e.g., when SoNash ships v4.0 or further skill-audit work) will apply real changes. The ⚠️ session-restart user-action is still advisable since the port step "touched" the files even though their bytes are unchanged; however, it can be safely skipped for this particular refresh since no content differs.

**Process miss noted:** initial analysis misread `git merge-base --is-ancestor main 41526 → NO` as "41526 lacks the skill-audit commits." The ancestor check doesn't answer that — `branch --contains <sha>` does. Future port pre-analyses must use `--contains` directly, not ancestor inference, to avoid wrong-file-ported bugs.

---

### Deferred — SoNash synthesize + recall skills (forward-looking, not in Foundation scope)

**Flag raised:** 2026-04-17 (user, during Step 2 confirmation).

**What:** `synthesize` and `recall` skills in SoNash are being actively upgraded in uncommitted work (currently in a second locale — not dirty in the Windows locale's SoNash checkout as of Step 2). Neither skill is currently present in JASON-OS `.claude/skills/` (which holds 9 skills: brainstorm, checkpoint, convergence-loop, deep-plan, deep-research, session-begin, skill-audit, skill-creator, todo). Neither is in the Foundation firm layers or the gated Layers 2/3/4.

**Why it matters now:** if JASON-OS later ports `synthesize` or `recall`, pulling them at the "current" SoNash tip would miss the in-flight upgrades. The port must wait for the upgrade work to commit upstream first.

**Planned home for this deferral:** PLAN.md Post-Foundation Deferrals section (see "Skills / integrations" subsection in PLAN.md — entry added alongside this Step 2 commit). Migrates to `/todo` backlog via MI-6 once `/todo` is operational (Layer 0 item 0.1 lands).

**Trigger to revisit:**
1. SoNash upstream commits land for synthesize + recall (user will signal).
2. JASON-OS scope expands to include either skill (post-Foundation; probably coupled to sync-mechanism research per MI-3, since synthesize specifically touches the propagation pipeline).

---

## Ledger

| # | Source (SoNash) | Target (JASON-OS) | Refs Found | Upstream Callers | Downstream Deps | Verdict | Port Date | Commit SHA |
|---|---|---|---|---|---|---|---|---|
| 0f-a | `41526:.claude/skills/skill-audit/SKILL.md` | `.claude/skills/skill-audit/SKILL.md` | `write-invocation.ts: 2` (stripped), `npm run skills:validate: 5` (retained as advisory — see notes) | 20+ SoNash skills cross-reference; for JASON-OS only `skill-creator/SKILL.md` cross-refs | `_shared/SELF_AUDIT_PATTERN.md`, `_shared/SKILL_STANDARDS.md` (6 refs; **dead links in JASON-OS** — no `_shared/` dir) | `sanitize-then-copy` → **no-op-verified** | 2026-04-17 | `afb7270` |
| 0f-b | `41526:.claude/skills/skill-audit/REFERENCE.md` | `.claude/skills/skill-audit/REFERENCE.md` | 0 regex hits | Companion to SKILL.md (referenced from its Steps / Closure) | `_shared/SELF_AUDIT_PATTERN.md` (1 ref; **dead link in JASON-OS**) | `copy-as-is` → **no-op-verified** | 2026-04-17 | `afb7270` |

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
