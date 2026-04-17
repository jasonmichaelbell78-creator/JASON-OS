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

### 0.1 port details (2026-04-17)

**Plan-reality divergence.** PLAN.md D9 listed 3 scripts all under `scripts/planning/`, naming `todos-mutations.js` at `scripts/planning/todos-mutations.js`. Pre-analysis showed the real path in SoNash 41526 is `scripts/lib/todos-mutations.js` (top-level `scripts/lib/`, not under `planning/`). Target path corrected accordingly; ledger row `0.1-d` reflects the corrected target.

**New dep discovered during pre-analysis.** `scripts/planning/render-todos.js` imports `./lib/read-jsonl.js`, which is a *different* file from the broadly-used `scripts/lib/read-jsonl.js` in SoNash (the planning-local variant only deps on `streamLinesSync` from `safe-fs`; the top-level variant is a more elaborate validating reader). The planning-local variant was not mentioned in PLAN.md's 3-file list. It was added to this port as row `0.1-c`. Final port count: **4 files**, not 3.

**Sanitize-error rewrite.** JASON-OS canonicalized `scripts/lib/sanitize-error` on `.cjs` during the SonarCloud duplication cleanup in PR #2 (the `.js` twin was deleted). SoNash 41526's `todos-cli.js` still imports `../lib/sanitize-error.js`. Pre-port verified that `scripts/lib/sanitize-error.cjs` is ESM-importable via Node's interop layer (confirmed before port execution). Resolution A (user-approved 2026-04-17): rewrite line 47 of target `scripts/planning/todos-cli.js` from `sanitize-error.js` to `sanitize-error.cjs`. This is the **only** byte modification to the extracted source; every other byte is a 1:1 copy from SoNash 41526. `todos-mutations.js` (row `0.1-d`) already imports `.cjs` in source — no rewrite needed there.

**Test evidence.** Smoke test executed before commit on the empty-state JASON-OS `.planning/`:

- `node scripts/planning/todos-cli.js validate` → exit 0; output `Integrity OK: 0 todos, last id (empty)`.
- `node scripts/planning/todos-cli.js add --data '{"title":"port-0.1-smoke-test","priority":"P2","tags":["#test"]}'` → exit 0; output `Added T1: port-0.1-smoke-test (P2)`. Created `.planning/todos.jsonl` (one JSON line with T1 record) and regenerated `.planning/TODOS.md`.
- `node scripts/planning/todos-cli.js delete --id T1` → exit 0; output `Deleted T1: port-0.1-smoke-test`.
- Empty-state cleanup: both `.planning/todos.jsonl` and `.planning/TODOS.md` removed after the round-trip to keep the commit free of stray state. Node emitted `MODULE_TYPELESS_PACKAGE_JSON` warnings on the ESM scripts — cosmetic only (JASON-OS `package.json` does not set `"type": "module"`); scripts ran to completion with exit 0.

Round-trip verified: add → jsonl write + TODOS.md render → delete → clean state. All 4 ported files function correctly against the JASON-OS helpers (`safe-fs.js`, `sanitize-error.cjs`, `parse-jsonl-line.js` transitively via validation).

---

## Ledger

| # | Source (SoNash) | Target (JASON-OS) | Refs Found | Upstream Callers | Downstream Deps | Verdict | Port Date | Commit SHA |
|---|---|---|---|---|---|---|---|---|
| 0f-a | `41526:.claude/skills/skill-audit/SKILL.md` | `.claude/skills/skill-audit/SKILL.md` | `write-invocation.ts: 2` (stripped), `npm run skills:validate: 5` (retained as advisory — see notes) | 20+ SoNash skills cross-reference; for JASON-OS only `skill-creator/SKILL.md` cross-refs | `_shared/SELF_AUDIT_PATTERN.md`, `_shared/SKILL_STANDARDS.md` (6 refs; **dead links in JASON-OS** — no `_shared/` dir) | `sanitize-then-copy` → **no-op-verified** | 2026-04-17 | `afb7270` |
| 0f-b | `41526:.claude/skills/skill-audit/REFERENCE.md` | `.claude/skills/skill-audit/REFERENCE.md` | 0 regex hits | Companion to SKILL.md (referenced from its Steps / Closure) | `_shared/SELF_AUDIT_PATTERN.md` (1 ref; **dead link in JASON-OS**) | `copy-as-is` → **no-op-verified** | 2026-04-17 | `afb7270` |
| 0.1-a | `41526:scripts/planning/todos-cli.js` | `scripts/planning/todos-cli.js` | `/add-debt: 1` (comment-only reference to mirror pattern; non-functional) | None (top-level CLI entrypoint) | `../lib/safe-fs.js`, `../lib/sanitize-error.cjs` (rewritten from `.js`), `./render-todos.js`, `../lib/todos-mutations.js` — all resolve in JASON-OS | `sanitize-then-copy` (1 import-path rewrite `.js`→`.cjs`) | 2026-04-17 | `c329f2e` |
| 0.1-b | `41526:scripts/planning/render-todos.js` | `scripts/planning/render-todos.js` | none | `scripts/planning/todos-cli.js` (ported as 0.1-a) | `../lib/safe-fs.js`, `./lib/read-jsonl.js` — all resolve in JASON-OS | `copy-as-is` | 2026-04-17 | `c329f2e` |
| 0.1-c | `41526:scripts/planning/lib/read-jsonl.js` | `scripts/planning/lib/read-jsonl.js` | none | `scripts/planning/render-todos.js` (ported as 0.1-b); SoNash `generate-decisions.js` + `generate-discovery-record.js` not in Foundation scope | `../../lib/safe-fs` (`streamLinesSync`) — resolves in JASON-OS | `copy-as-is` | 2026-04-17 | `c329f2e` |
| 0.1-d | `41526:scripts/lib/todos-mutations.js` | `scripts/lib/todos-mutations.js` | `SonarCloud: 1` (comment-only reference to rule S3696; non-functional) | `scripts/planning/todos-cli.js` (ported as 0.1-a) | `./sanitize-error.cjs` (already `.cjs` in source; no rewrite) — resolves in JASON-OS | `copy-as-is` | 2026-04-17 | `c329f2e` |
| L1p-a | `41526:.claude/hooks/lib/git-utils.js` | `.claude/hooks/lib/git-utils.js` | 0 regex hits | SoNash hooks consume; JASON-OS hooks will consume at Layer 1 wiring | node builtins only (`child_process`, `fs`, `path`) | `copy-as-is` | 2026-04-17 | `81e04ac` |
| L1p-b | `41526:.claude/hooks/lib/state-utils.js` | `.claude/hooks/lib/state-utils.js` | 0 regex hits | SoNash hooks consume; JASON-OS hooks will consume at Layer 1 wiring | node builtins only (`fs`, `path`) | `copy-as-is` | 2026-04-17 | `81e04ac` |
| L1p-c | `41526:.claude/hooks/lib/sanitize-input.js` | `.claude/hooks/lib/sanitize-input.js` | 0 regex hits | SoNash hooks consume; JASON-OS hooks will consume at Layer 1 wiring | **no imports** (pure module) | `copy-as-is` | 2026-04-17 | `81e04ac` |
| L1p-d | `41526:.claude/hooks/lib/rotate-state.js` | `.claude/hooks/lib/rotate-state.js` | 0 regex hits | SoNash hooks consume; JASON-OS hooks will consume at Layer 1 wiring | node builtins (`fs`, `path`) + `../../../scripts/lib/parse-jsonl-line` (`safeParseLine` — verified present in JASON-OS) | `copy-as-is` | 2026-04-17 | `81e04ac` |
| 1.2-a | `41526:.claude/skills/session-end/SKILL.md` | `.claude/skills/session-end/SKILL.md` | 12 regex hits in source (mostly Phase 2/3 SoNash-specific: SESSION_HISTORY, ROADMAP, TDMS, reviews:sync, run-ecosystem-health, MASTER_DEBT, npm run hooks:health, npm run session:end). All functional refs removed; 4 annotations retained that **describe** what was stripped (intro note, Phase 3 gate, version history) | SoNash session-end skill has no internal callers (top-level skill); session-begin consumes its outputs (SESSION_CONTEXT.md 5 fields) | Skill doesn't directly require scripts — orchestrates Bash commands. v0 removes Phase 3 pipeline commands; Phase 2 commands gracefully skip when their state files are absent | `sanitize-then-copy` (heavy — 465→405 lines, Phase 3 stripped, Step 3 adapted to `.planning/jason-os-mvp/PLAN.md` per D33, Phase 2 annotated as Layer-2-gated, AgentSkills fields added, version bumped 2.2 → 2.2-jasonos-v0.1) | 2026-04-17 | `(see 1.2 commit)` |
| 1.2-b | `41526:scripts/session-end-commit.js` | `scripts/session-end-commit.js` | 0 regex hits | SoNash Step 10 invokes via `npm run session:end`; JASON-OS session-end SKILL.md Step 10 now invokes directly via `node scripts/session-end-commit.js` | node builtins + `./lib/safe-fs` (`safeWriteFileSync` — verified present in JASON-OS scripts/lib/safe-fs.js) | `copy-as-is` | 2026-04-17 | `(see 1.2 commit)` |

**Notes on 1.2 port (Layer 1 item 1.2, 2026-04-17):**

- **Scope:** SKILL.md substantially rewritten (465→405 lines). `scripts/session-end-commit.js` is byte-for-byte copy (272 lines, 0 sanitization hits).
- **Phase 3 strip:** Entire Phase 3 Metrics & Data Pipeline table (4 commands) removed per PLAN.md 1.2 explicit instruction. Replaced with a "STRIPPED IN V0" block explaining the rationale and pointing to `/todo` backlog for when it returns.
- **Phase 2 treatment:** Did not strip — kept SoNash's existing "skip silently if data source absent" defensive structure. In v0, Layer 2 state files don't exist yet, so Phase 2 auto-skips. Annotated with "v0 note" blocks on each sub-step.
- **Step 3 adapted:** From "Roadmap Check (ROADMAP.md)" → "Plan Check (`.planning/<topic>/PLAN.md`)", hard-coded to `jason-os-mvp/PLAN.md` per D33 rationale.
- **Step 10 adapted:** `npm run session:end` → `node scripts/session-end-commit.js`. Same behavior, Node-native.
- **AgentSkills frontmatter added:** `compatibility: agentskills-v1`, `metadata.short-description`, `metadata.version: 2.2-jasonos-v0.1`. Version explicitly preserves SoNash lineage.
- **session-end-commit.js:** Downstream dep verified (`safeWriteFileSync` in `scripts/lib/safe-fs.js`). `node --check` passed. Clean copy — no rewrite needed.
- **MI-5 per-skill self-audit:** DEFERRED to Layer 1 audit checkpoint. The refreshed skill-audit (0f) should run against this ported session-end/SKILL.md. Scheduled for the Layer 1 audit pass per D29.
- **Hot-reload note:** session-end appeared in the skill registry immediately after Write (no session restart needed), unlike agents which require restart per user memory `feedback_agent_hot_reload.md`.

---



**Notes on L1p-a..d (Layer 1 prereq, 2026-04-17):**

- Research's "zero SoNash coupling" claim (G1) verified empirically — 0 extended-regex hits across all 4 files.
- SoNash 41526 `.claude/hooks/lib/` contains one additional file not in scope: `inline-patterns.js`. Confirmed not referenced by any of the 4 ported files. Stays out of Foundation port scope; if needed later, re-port via a fresh PORT_ANALYSIS row.
- `symlink-guard.js` remains JASON-OS's pre-existing bootstrap version (unchanged by this port).
- Smoke-test: `require('./.claude/hooks/lib/<basename>.js')` succeeded for all 4; exported APIs match expectations (gitExec/projectDir; loadJson/saveJson; sanitizeInput/SECRET_PATTERNS; rotateJsonl/pruneJsonKey/expireByAge/expireJsonlByAge/archiveRotateJsonl).
- Executed in main session (not port-agent dispatched) — pre-analysis was complete enough to make dispatch overhead exceed the work. Consistent with 0.2 precedent where greenfield stubs ran in-session.

---

## Audit Checkpoints (D29)

### Layer 0+ Audit — PASS (2026-04-17)

**Method:** Manual code-reviewer pass (JASON-OS does not yet have a
`code-reviewer` agent; SoNash port deferred per Layer 4 candidacy — see
Post-Foundation Deferrals). Three steps per PLAN.md D29: (1) review
modified files, (2) verify each done-when, (3) confirm D18 bundling.

**Done-when verification:**

| # | Done-when | Result |
|---|---|---|
| 0a | `grep -c PROACTIVELY .claude/agents/*.md` ≥ 8 | PASS — 8 files, 1 clause each |
| 0b | `.nvmrc` exists | PASS — contains `22` |
| 0c | `grep -l write-invocation.ts .claude/skills/**/SKILL.md` → empty | PASS (exit 1) |
| 0d | Each §4.N rule has bracketed annotation | PASS — 1 GATE + 1 MIXED + 14 BEHAVIORAL + 3 NEEDS_GATE flags |
| 0e | `grep -l "compatibility: agentskills-v1" .claude/skills/**/SKILL.md \| wc -l` = 9 | PASS |
| 0f | skill-audit SKILL.md matches SoNash 41526 + commit landed | PASS — `afb7270` (roundtrip no-op, validates port logic) |
| 0g | sonar-project.properties + workflow YAML exist + secrets in repo | PASS — `f62e6ee`; first SonarCloud run already completed on initial import (baseline findings addressed in f9fc0ca/93a5a9e/ac58876/ea69efa) |
| 0h | `.husky/pre-commit` + `.husky/pre-push` exist + fire on test commit | PASS — pre-commit observed live on `fde851a` and every commit since (gitleaks output in commit stream) |
| 0i | `scripts/config/propagation-patterns.seed.json` exists + validates as JSON | PASS — `2c28c20`, 4 patterns, valid |
| 0j | §1 + §2 have real content; §3 stays `_TBD_` | PASS — lines 17 + 31 populated, line 65 still TBD |

**Code-review notes (manual pass on modified files):**

- **Agents (8 files):** PROACTIVELY clauses are scoped to *concrete*
  trigger conditions ("irreversible decisions" on contrarian-challenger,
  "no alternatives considered" on otb-challenger) rather than vague
  capability statements. Low over-invocation risk.
- **CLAUDE.md:** §4 annotations read cleanly with the intro explainer
  paragraph. NEEDS_GATE flags (§4.5 / §4.9 / §4.15) preserve forward
  guidance so Layer 2 hook-porting work knows which rules are waiting
  for enforcement infrastructure. §1 + §2 content matches PLAN.md
  verbatim; §3 correctly stays TBD per D4.
- **9 SKILL.md files:** AgentSkills fields (compatibility, metadata.version)
  applied uniformly. `checkpoint`'s pre-existing `metadata:` block
  correctly extended (short-description preserved + version added)
  rather than overwritten. Versions sourced from each SKILL.md's own
  Document Version / Version History row.
- **Husky scaffolds (4 new files):** all three shells pass `bash -n`;
  executable bits set; `core.hooksPath` wired to `.husky/_`; pre-commit
  + pre-push shims present. Pre-commit verified firing live on every
  subsequent commit. Pre-push not yet fired (no push authorized).
- **`scripts/config/propagation-patterns.seed.json`:** validates as JSON;
  schema matches future `check-pattern-compliance.js` consumer shape.
- **SonarCloud/Qodo wiring:** Actions pinned by SHA for supply-chain
  integrity; fork-PR skip guard in place; `permissions:` minimized to
  needed scopes. Exclusions cover `.research/`, `.planning/`,
  `node_modules/`, `.husky/_/`.
- **SonarCloud baseline fixes (4 follow-up commits):** all 10 findings
  addressed. Smoke tests passed for the two refactors: `parseCliArgs`
  covered by happy-path, defaults, required-missing, out-of-range, NaN,
  missing-value cases (all behave identically). `safeAtomicWriteSync`
  exports unchanged; `normalizeAtomicWriteOptions` module-private.

**D18 bundling check:** PASS. Each item is its own atomic revertible
unit (0a/0b/0c/0d/0e/0f/0g/0i/0j each single-commit, plus 0f ledger
backfill as a deliberate follow-up, plus 0h scaffold + package-lock as
a deliberate split). Nothing co-mingled.

**Issues surfaced during audit:**
1. *0f no-op finding* — documented above and in 0f notes; not a defect.
2. *SonarCloud first scan triggered by operator's initial repo import,
   not our workflow* — 10 baseline findings now addressed. Next push
   after this audit will trigger our workflow version for real + first
   re-scan to verify findings cleared.
3. *Missing `code-reviewer` agent* — noted as Layer 4 candidate rather
   than Foundation scope.
4. *Still-advisory `npm run skills:validate` + `_shared/` dead links
   in skill-audit* — flagged in 0f port details; non-blocking.

**Verdict: PASS. Layer 0+ closed. Layer 0 may open.**

**⚠️ USER ACTION for 0g follow-up:**
In SonarCloud UI, mark the 3 hotspots as Safe with the rationale summary
from commit `ea69efa`. Hotspots:
1. scripts/lib/security-helpers.js slugify regex (S5852 Medium)
2. scripts/lib/security-helpers.js safeGitAdd execFileSync (S4036 Low)
3. scripts/lib/security-helpers.js safeGitCommit execFileSync (S4036 Low)

**Status (2026-04-17 session):** User confirmed completed — SonarCloud S7637
Marked Fixed + Automatic Analysis disabled / GitHub Actions mode set.

---

### Layer 0 Audit — PASS (2026-04-17)

**Method:** Manual code-reviewer pass (JASON-OS still lacks `code-reviewer`
agent — Layer 4 candidate). Three steps per PLAN.md D29: (1) review
modified files, (2) verify each done-when, (3) confirm D18 bundling.

**Done-when verification:**

| # | Done-when | Result |
|---|---|---|
| 0.1 | `/todo` invokable end-to-end; test item persists across session | PASS — smoke test round-trip in `c329f2e`; integrity check under T1+T2 state confirms 2 todos, last id T2 |
| 0.2 | `/add-debt` skill invokable; /deep-research Phase 5 routing no longer errors | PASS (invokability) — skill appears in Skill-tool registry; frontmatter valid; Phase 5 integration deferred to next `/deep-research` run (stub is appendonly, cannot error the Phase 5 call path) |

**Code-review notes (manual pass on 5 new/modified files):**

- **`scripts/planning/todos-cli.js` (270 lines):** ESM entrypoint; sanitize-error
  import rewritten `.js` → `.cjs` (line 47) per resolution A. All other bytes
  match SoNash 41526. Dispatch table maps 10 subcommands; parseArgs uses simple
  argv tokenization. Lock acquired before mutation via `withLock` from safe-fs.
  Exit-code hygiene correct (0 / 1 user / 2 fatal).
- **`scripts/planning/render-todos.js` (177 lines):** Pure render; no mutation.
  Reads JSONL via `./lib/read-jsonl.js` (new dep); writes TODOS.md via
  `safeWriteFileSync`. Sort order priority → status — matches /todo SKILL.md
  spec.
- **`scripts/planning/lib/read-jsonl.js` (67 lines):** Streaming read via
  `streamLinesSync` (no 2 MiB whole-file ceiling). Handles CRLF, comments,
  empty lines, warn-but-continue parse errors. createRequire bridges ESM
  consumer to safe-fs CJS export.
- **`scripts/lib/todos-mutations.js` (391 lines):** Pure helpers — validation,
  regression guard, op* dispatchers. CJS require of sanitize-error.cjs
  already correct at source; no rewrite needed. SonarCloud comment-only
  reference (line 346) about rule S3696 preserved intact (non-functional).
- **`.claude/skills/add-debt/SKILL.md` (93 lines):** Frontmatter complete
  (name, description, compatibility: agentskills-v1, metadata.short-description +
  version: 0.1-stub). Body follows house style from checkpoint/todo skills —
  When to use / When NOT to use / Steps / Upgrade trigger / Guard rails /
  Storage / Version History. Line count well under 300-line SKILL_STANDARDS cap.

**Sanitization coverage:**

- Extended regex hits in ported files: 2 total (both comment-only)
  - `todos-cli.js:6` — `/add-debt` (doc pattern reference, non-functional)
  - `todos-mutations.js:346` — `SonarCloud` (rule-ID doc reference, non-functional)
- No firebase/firestore/TDMS/MASTER_DEBT/CodeRabbit/Gemini hits.
- `npm run` SoNash script references: none in ported files (previously
  documented concern for pr-review port is deferred to Step 4).

**D18 bundling check:** PASS.
- `c329f2e` — 0.1 port bundle (4 scripts as one logical unit; D18 explicitly
  groups "each port = 1 commit" and "bundles may group multiple scripts under
  one commit" — /todo stack is one unit).
- `99b6136` — ledger backfill (deliberate split to unblock commit-SHA column).
- `711fa03` — 0.2 add-debt stub (its own unit).
- `9a504d3` — initial /todo backlog (T1 + T2, separate scope from 0.2).

**Reachability check:** All 5 downstream dep paths resolve:
`scripts/lib/safe-fs.js` / `scripts/lib/sanitize-error.cjs` /
`scripts/planning/render-todos.js` / `scripts/lib/todos-mutations.js` /
`scripts/planning/lib/read-jsonl.js`.

**settings.json validation:** valid JSON, untouched by Layer 0 (no hook
wiring in this layer).

**Issues surfaced during audit:**

1. *Plan-reality divergence on 0.1 (3 scripts → 4 files)* — Plan said
   `scripts/planning/todos-mutations.js`; actual path is `scripts/lib/`.
   Also missed `scripts/planning/lib/read-jsonl.js` entirely. Documented
   in 0.1 port details notes section + captured in deep-plan state file.
   Not a defect — pre-analysis (MI-1) caught it before port.
2. *MODULE_TYPELESS_PACKAGE_JSON cosmetic warnings* — Node emits on every
   ESM script run because JASON-OS `package.json` lacks `"type":"module"`.
   Tracked as T1 in `/todo` backlog (P3 polish). SoNash carries
   `scripts/planning/lib/package.json` marker; JASON-OS should too.
3. *Phase 5 integration path for /add-debt unvalidated* — next `/deep-research`
   run will exercise it; stub is append-only, cannot error the call path.
4. *Still-deferred since Layer 0+*: `code-reviewer` agent port, advisory
   `npm run skills:validate` refs in skill-audit, `_shared/` dead links.
   Unchanged from Layer 0+ audit record.

**Row count invariant (updated 2026-04-17):** PLAN.md expected "After Layer 0 |
4 total (0f + 3 todos; add-debt is a new stub, no row)". Reality: **5 total**
(0f + 4 todos; add-debt still no row). Divergence driven by issue #1 above.
Row count invariants section below updated.

**Verdict: PASS. Layer 0 closed. MI-6 migration (Step 3) unblocked.**

---

## Row Count Invariants (for audit checkpoints)

At each PLAN.md audit checkpoint (D29), expected minimum row counts:

| Checkpoint | Minimum rows |
|---|---|
| After Layer 0+ | 1 (`0f` skill-audit refresh; 0g+0h+0i+0j not ports so no rows) |
| After Layer 0 | 5 total (0f + 4 todos — plan said 3, reality was 4 per 0.1 path-correction; add-debt is a new stub, no row) |
| After Layer 1 prereq | 9 total (+ 4 `hooks/lib/*` as L1p-a..d; row count invariant bumped from 8 to 9 to reflect Layer 0's +1 divergence) |
| After Layer 1 | 12 total (+ session-end SKILL.md + session-end-commit.js + pre-compaction-save + compact-restore + commit-tracker = 5 more) — wait: 12? recount → 8 + 5 = 13; SESSION_CONTEXT.md is new-stub, no row. So minimum **13**. |
| After Pre-push mini-phase | 17–20 total (+ pr-review SKILL.md + ~3 reference files + pre-commit-fixer SKILL.md + companions) |
| After Layer 2 | +6 (if engaged) |
| After Layer 3 | +0 (all new docs, not ports) |
| After Layer 4 | +3 (if engaged) |

Audits verify the ledger row count is ≥ the minimum for the layers that have
landed.
