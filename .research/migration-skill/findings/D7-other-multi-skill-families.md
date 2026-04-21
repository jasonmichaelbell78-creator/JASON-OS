# FINDINGS — D7-other-multi-skill-families

**Sub-question:** SQ-D7b — Comparative analysis of 5+ SoNash multi-file skill
families (excluding CAS, owned by sibling D7-cas-precedent) to inform
`/migration` decomposition.

**Depth:** L1. File-line citations throughout.

**Families in scope (6 total):** `deep-research`, `mcp-builder`, `skill-creator`,
`doc-ecosystem-audit`, `pr-ecosystem-audit`, `hook-ecosystem-audit`.

---

## Summary

Six multi-file SoNash skill families fall into **three distinct decomposition
shapes**:

1. **Monolith-with-ancillaries** (SKILL.md is the whole skill; extra files are
   passive lookup tables, templates, or language/domain variants loaded on
   demand). Examples: `deep-research`, `mcp-builder`, `skill-creator`.
2. **Shared-chassis audit family** (thin per-family SKILL.md + 5-6 shared
   protocol docs in `_shared/ecosystem-audit/` + a multi-checker runner script
   that owns the real work). Examples: `doc-ecosystem-audit`,
   `pr-ecosystem-audit`, `hook-ecosystem-audit`.
3. **Router-plus-ancillary-skills** is the *CAS* pattern (owned by D7a, not
   present in this set). None of the 6 families here route to sibling skills —
   they all keep orchestration internal.

**Top-fit pattern for `/migration`:** **hybrid monolith-with-ancillaries +
phased-pipeline orchestrator**, closest to `deep-research`. The 7-phase arc
(BRAINSTORM §2), multi-verdict gating (D23), and state-machine (D20) map almost
1:1 to `deep-research`'s 12 phases + state file + verification agents. The
audit-family shared-chassis pattern is instructive for `_shared/` extraction
once JASON-OS gains a *second* migration-like skill, but is overkill for v1
`/migration` alone.

**Top counter-fit:** `mcp-builder`-style "load a reference doc on demand" is a
useful *tactic* inside the skill (e.g., `direct-apply` vs `plan-export` as
reference docs), but is not a decomposition *shape* for `/migration`.

---

## Per-family analysis

### 1. `deep-research` (5 files — monolith orchestrator + domain configs +
reference)

**File inventory** (ls of
`C:\Users\jbell\.local\bin\sonash-v0\.claude\skills\deep-research\`):

- `SKILL.md` 21,482 bytes — the complete orchestration spec, 12 phases
  (Phase 0 Decomposition → Phase 5 Presentation/Routing), ~450 lines.
- `REFERENCE.md` 53,398 bytes — 22 sections (see SKILL.md TOC reference at
  `REFERENCE.md:15-38`): templates, schemas, decomposition protocol, budget
  heuristics, contrarian/OTB prompt templates, self-audit checklist, state
  schema, phase details, gap-pursuit, management commands, dispute resolution.
- `domains/academic.yaml` 727 bytes, `domains/business.yaml` 689 bytes,
  `domains/technology.yaml` 670 bytes — domain-specific `source_authority` +
  `verification_rules` + `staleness` configs loaded at Phase 0.2
  (`SKILL.md:179-181`: "Read `domains/<domain>.yaml`, pass
  `source_authority` + `verification_rules` to searchers").

**Decomposition shape:** **Monolith-with-companions + data-driven domain
extension.** `SKILL.md` is the single authoritative orchestrator; `REFERENCE.md`
is a pure read-on-demand library (no logic, only templates/schemas/prose).
`domains/*.yaml` are pure data configs read by Phase 0 and passed to spawned
sub-agents as context (`SKILL.md:208-211`: "Spawn searcher agents. Each
receives: sub-questions, search profile, output path, depth, domain, **domain
config**").

**State passing:** Orchestrator reads domain YAML and injects into agent spawn
prompts. No cross-file state handoff beyond that — state persists in
`.claude/state/deep-research.<slug>.state.json` and the output dir
`.research/<topic-slug>/`. Resume is supported via state file (`SKILL.md:202-204`).

**Decomposition of work** inside SKILL.md: 12 numbered phases (0, 1, 2, 2.5, 3,
3.5, 3.9, 3.95, 3.96, 3.97, 4, 5) dispatched to 5 distinct sub-agent types:
`deep-research-searcher`, `deep-research-synthesizer`, `deep-research-verifier`,
`contrarian-challenger`, `otb-challenger`, `dispute-resolver`
(`SKILL.md:237-291`). Each phase writes a named artifact into the output dir;
the next phase reads from disk.

**Strengths for /migration relevance:**
- **Phased arc parity** — 12 phases + state file + write-to-disk-between-phases
  is the *exact* shape BRAINSTORM §2 proposes for `/migration` (7 phases 0-6).
- **Domain-YAML as verdict-parameter carrier** — `/migration`'s D23 verdicts
  (`copy-as-is` / `sanitize` / `reshape` / `rewrite` / `skip` /
  `blocked-on-prereq`) could live in a YAML sidecar (`verdicts/*.yaml`) keyed
  by destination idiom, analogous to `domains/*.yaml`.
- **REFERENCE.md as overflow** — SKILL.md stays under a comprehension budget;
  schemas/templates/output-adapter contracts live in REFERENCE.md
  (`SKILL.md:15` "extract to REFERENCE.md if approaching the limit" — this is
  also a `skill-creator` MUST at `skill-creator/SKILL.md:26-27`).
- **Windows 0-byte fallback** is baked into orchestration
  (`SKILL.md:36-40`, `221-223`, `255-266`) — `/migration`'s active transformation
  phase will also spawn agents for `reshape`/`rewrite` research and needs the
  same persistence safety net.

**Weaknesses:**
- REFERENCE.md at 53K bytes is already hitting the "one-file-too-big" smell;
  `/migration` will likely hit the same.
- No sub-skill decomposition means everything runs *in* the `/deep-research`
  turn — long-running flows risk compaction (addressed by state file +
  resume, which `/migration` must replicate per D20/R1).

**Relevance to /migration:** **Highest of the 6.** Copy the phase + state +
domain-YAML + REFERENCE.md structure wholesale. Substitute:
- `phases 0-12` → `phases 0-6` (BRAINSTORM §2)
- `domains/*.yaml` → `verdicts/*.yaml` or `idioms/<destination>.yaml`
- `deep-research-searcher` → a `migration-reshape-researcher` agent
- `.research/<topic-slug>/` → `.migration/<unit-slug>/` or similar artifact dir

---

### 2. `mcp-builder` (10 files — monolith + LICENSE + language-variant
references + helper scripts)

**File inventory** (ls of
`C:\Users\jbell\.local\bin\sonash-v0\.claude\skills\mcp-builder\`):

- `SKILL.md` 14,112 bytes — 4-phase workflow (Phase 1 Research/Plan, Phase 2
  Implementation, Phase 3 Review, Phase 4 Evaluation).
- `LICENSE.txt` 11,558 bytes — Apache-style license (this skill is an upstream
  Anthropic import, not custom SoNash).
- `reference/mcp_best_practices.md` 29,243 bytes — core protocol guidelines,
  loaded always (`SKILL.md:96-98`).
- `reference/python_mcp_server.md` 27,158 bytes — **loaded only for Python
  builds** (`SKILL.md:100-105`).
- `reference/node_mcp_server.md` 27,158 bytes — **loaded only for Node/TS
  builds** (`SKILL.md:107-112`).
- `reference/evaluation.md` 21,826 bytes — Phase 4 harness doc.
- `scripts/connections.py` 5,026 bytes — helper.
- `scripts/evaluation.py` 12,952 bytes — the eval harness.
- `scripts/example_evaluation.xml` 1,216 bytes — example input.
- `scripts/requirements.txt` 31 bytes — Python deps.

**Decomposition shape:** **Monolith-with-variants.** SKILL.md is the
orchestration; `reference/*.md` are language/topic-specific doc bundles loaded
conditionally based on which path the user is on. `scripts/` is an executable
evaluation harness (the one piece of *code* that runs outside the LLM turn).

**State passing:** Almost none. The skill is a procedural workflow; state
exists only in the files the user creates (the MCP server project itself). No
progress file, no resume contract.

**Strengths:**
- **Conditional loading** of heavy reference docs (Python vs Node) is a clean
  way to keep context lean — a strong pattern for `/migration`'s
  direct-apply-vs-plan-export fork (D26).
- **Executable harness script** (`scripts/evaluation.py`) complements the
  prose-only SKILL.md — `/migration` equivalent would be a
  `scripts/apply-migration-plan.js` for Phase 5 execution.

**Weaknesses:**
- No state/resume. If the workflow is interrupted mid-Phase-2, the next session
  starts over. `/migration` cannot afford this (D22 gate memory) — must add
  state file like `deep-research` does.
- SKILL.md has no phase-completion signals or user-confirmation gates; it's
  prescription-heavy.

**Relevance to /migration:** **Medium.** Borrow the **conditional reference
loading** pattern for output modes (D26: direct-apply doc vs plan-export doc).
Borrow the **executable helper script** pattern for Phase 5. Do NOT borrow the
stateless flow.

---

### 3. `skill-creator` (6 files — discovery-driven orchestrator + REFERENCE +
LICENSE + 3 Python helpers)

**File inventory** (ls of
`C:\Users\jbell\.local\bin\sonash-v0\.claude\skills\skill-creator\`):

- `SKILL.md` 17,924 bytes — 7-phase workflow (WARM-UP + PHASE 1-7:
  Context/Discovery/Planning/Build/Validate/Audit/Closure;
  `skill-creator/SKILL.md:84-93`).
- `REFERENCE.md` 13,456 bytes — 6 discovery question categories (referenced at
  `SKILL.md:142-143`).
- `LICENSE.txt` 11,558 bytes.
- `scripts/init_skill.py` 5,472 bytes — scaffolding (`SKILL.md:217-218`: "Run
  `init_skill.py <name> --path .claude/skills` for new skills").
- `scripts/package_skill.py` 5,028 bytes — packaging helper.
- `scripts/quick_validate.py` 2,229 bytes — structural validator.

**Decomposition shape:** **Monolith-with-companions + scaffolding scripts.**
SKILL.md orchestrates; REFERENCE.md is a question-category data doc;
`scripts/*.py` are callable CLIs invoked *by* the skill during Phase 4 (build).

**State passing:** State file persisted per phase (`SKILL.md:30-31`: "Persist
state incrementally — save to state file after every phase. Long creation
sessions WILL hit compaction").

**Notable pattern — cross-references into `_shared/`:**
`skill-creator/SKILL.md:15` points at `../_shared/SKILL_STANDARDS.md` and
`_shared/SELF_AUDIT_PATTERN.md` (existence confirmed by
`ls C:\Users\jbell\.local\bin\sonash-v0\.claude\skills\_shared\`:
`AUDIT_TEMPLATE.md`, `SELF_AUDIT_PATTERN.md`, `SKILL_STANDARDS.md`,
`TAG_SUGGESTION.md`, `ecosystem-audit/`). This is a **shared-chassis** move for
cross-skill standards, not just audit-family.

**Strengths:**
- **Discovery-before-build gate** (`SKILL.md:19-22`) is a hard stop pattern
  that mirrors `/migration`'s "plan-then-execute" D3 decision.
- **Scaffolding scripts** — `init_skill.py` creates the file skeleton;
  `quick_validate.py` verifies structural correctness. `/migration`'s
  plan-export mode (D26) could have an analogous
  `init-migration-plan.py` + `validate-migration-plan.py`.
- **State file persistence** per phase — matches `/migration` R1/R3 gate
  memory.
- **`_shared/` referencing** is a mature idiom in SoNash, suggesting
  `/migration` can lean on `_shared/` if future migration-adjacent skills
  emerge.

**Weaknesses:**
- Python scripts embedded in a JavaScript-forward codebase (SoNash has
  shifted toward Node hooks). For JASON-OS, `/migration` helpers should be
  Node per JASON-OS/CLAUDE.md §1 ("Claude Code infrastructure: Node.js 22").

**Relevance to /migration:** **High.** `skill-creator`'s shape is the closest
*user-facing* analog: front-loaded discovery, plan-then-build, state file,
scaffolding scripts, `_shared/` extraction. Worth studying as a structural
template.

---

### 4. `doc-ecosystem-audit` (24 files — thin SKILL.md + shared-chassis protocol
docs + checkers/ + lib/ + __tests__/)

**File inventory** (ls of
`C:\Users\jbell\.local\bin\sonash-v0\.claude\skills\doc-ecosystem-audit\`):

- `SKILL.md` 12,471 bytes — 253 lines, 6 phases (Run&Parse → Dashboard →
  Walkthrough → Summary → Trend → Self-Audit).
- `scripts/run-doc-ecosystem-audit.js` 14,873 bytes — orchestrator.
- `scripts/checkers/` (5 files) — `content-quality.js`,
  `coverage-completeness.js`, `generation-pipeline.js`,
  `index-registry-health.js`, `link-reference-integrity.js` (ranges 13–18 KB
  each).
- `scripts/checkers/__tests__/` — checker-specific tests.
- `scripts/lib/` (6 files) — `benchmarks.js`, `parse-jsonl-line.js`,
  `patch-generator.js`, `safe-fs.js` (24,810 bytes — shared), `scoring.js`,
  `state-manager.js`.
- `scripts/lib/__tests__/` — lib tests.
- `scripts/__tests__/` (4 files) — integration + scoring + regression +
  state-manager tests.

**Crucial shared chassis:** `doc-ecosystem-audit/SKILL.md:45-47` says
"Read `.claude/skills/_shared/ecosystem-audit/CRITICAL_RULES.md` and follow
all 8 rules." The 8 rules live in
`_shared/ecosystem-audit/CRITICAL_RULES.md`
(`ls` showed: `CLOSURE_AND_GUARDRAILS.md`, `COMPACTION_GUARD.md`,
`CRITICAL_RULES.md`, `FINDING_WALKTHROUGH.md`, `README.md`,
`SUMMARY_AND_TRENDS.md`). SKILL.md is therefore a *thin consumer* of the
shared chassis; nearly all protocol-level instructions live in `_shared/`.

**Decomposition shape:** **Shared-chassis + multi-checker runner.** Three
layers:
1. Thin SKILL.md per audit family (doc / pr / hook) that defers to the shared
   chassis for 8 critical rules, compaction guard, walkthrough protocol,
   summary template.
2. `_shared/ecosystem-audit/*.md` — the real protocol library
   (6 files, one per concern: rules, compaction, walkthrough, closure, trends,
   README).
3. Per-family `scripts/` — `run-*-ecosystem-audit.js` orchestrator + 5-6
   domain-specific checkers + shared `lib/` (including a 24,810-byte
   `safe-fs.js` that's **literally duplicated** across doc/pr/hook —
   identical file size confirms copy).

**State passing:** Via JSON files — `.claude/tmp/{audit-name}-audit-progress.json`
(compaction guard), `.claude/tmp/{audit-name}-audit-session-{date}.jsonl`
(decision log), `.claude/state/{audit-name}-ecosystem-audit-history.jsonl`
(trend data). All file-based; no in-memory handoff.

**Strengths for /migration relevance:**
- **Extracted protocol** for the 8 repeating rules is a mature extraction
  pattern. Proves `_shared/` works at scale in SoNash.
- **Checker/ runner separation** — `run-*.js` calls each checker module; each
  checker returns findings; the runner aggregates. This is the **canonical
  multi-phase executable skill pattern**. `/migration` verdict dispatch
  (Phase 2 Discovery + Phase 5 Execute) could use the same split: per-verdict
  checker → aggregator.
- **Per-skill tests** in `__tests__/` give the audits an executable
  correctness guarantee that SKILL.md prose alone cannot provide.

**Weaknesses:**
- `safe-fs.js` (24,810 bytes) **duplicated** in three audit families. The
  `_shared/` extraction stopped at protocol docs; code was not extracted. This
  is a known half-done refactor.
- Thin SKILL.md means a reader must open 7+ files to understand the behavior
  end-to-end. Context cost is high.

**Relevance to /migration:** **Medium-high for Phase 5 (Execute) only.** The
multi-checker orchestrator pattern fits if `/migration` dispatches
verdict-specific handlers (`copy-as-is-handler.js`, `sanitize-handler.js`,
`reshape-handler.js`, `rewrite-handler.js`) under a top-level
`run-migration.js`. v1 is likely too small to warrant `_shared/` extraction,
but the shape is useful.

---

### 5. `pr-ecosystem-audit` (24 files — near-identical shape to
doc-ecosystem-audit)

**File inventory** (ls of
`C:\Users\jbell\.local\bin\sonash-v0\.claude\skills\pr-ecosystem-audit\`):

- `SKILL.md` 15,711 bytes — same 6-phase template as doc-audit.
- `scripts/run-pr-ecosystem-audit.js` 12,314 bytes.
- `scripts/checkers/` (5 files) — `data-state-health.js`,
  `effectiveness-metrics.js`, `feedback-integration.js`,
  `pattern-lifecycle.js`, `process-compliance.js` (20–29 KB each).
- `scripts/lib/` — identical file roster + sizes to doc-audit
  (`safe-fs.js` 24,810 bytes confirms byte-identical copy).
- `scripts/__tests__/` — 4 test files (checker-regression,
  integration, scoring, state-manager).
- `scripts/checkers/__tests__/` + `scripts/lib/__tests__/` — mirror
  doc-audit.

**Decomposition shape:** **Identical to doc-ecosystem-audit.** Same
shared-chassis reference (`pr-ecosystem-audit/SKILL.md:44-46`), same 8 rules,
same runner+checker+lib split, same state file conventions (just renamed:
`.claude/tmp/pr-audit-progress.json`).

**Relevance to /migration:** Confirms the pattern. No unique insight beyond
doc-ecosystem-audit.

---

### 6. `hook-ecosystem-audit` (29 files — the largest; same shared-chassis
shape + more domain checkers + CI/CD extension)

**File inventory** (ls of
`C:\Users\jbell\.local\bin\sonash-v0\.claude\skills\hook-ecosystem-audit\`):

- `SKILL.md` 16,151 bytes — 440 lines, **8 phases** (Warm-Up + 8 numbered
  phases) — more elaborate than doc/pr because it covers hooks + pre-commit +
  CI/CD (`SKILL.md:74-86`).
- `REFERENCE.md` 14,538 bytes — state schema, dashboard template, verification
  template, category reference, checker development guide
  (`SKILL.md:138` + scattered "See REFERENCE.md" refs).
- `scripts/run-hook-ecosystem-audit.js` 15,276 bytes.
- `scripts/checkers/` (**6 files** — one more than doc/pr) —
  `cicd-pipeline.js`, `code-quality-security.js`, `config-health.js`,
  `functional-correctness.js`, `precommit-pipeline.js`,
  `state-integration.js` (20–28 KB each).
- `scripts/lib/` (7 files) — adds `constants.js` (1,834 bytes) beyond the
  standard roster; `safe-fs.js` **still 24,810 bytes** (third byte-identical
  copy in the triple).
- `scripts/__tests__/` — 4 test files + `fixtures/` directory (unique to
  hook-audit: checker-regression tests are 31,826 bytes, the most elaborate).

**Decomposition shape:** **Shared-chassis + runner/checkers/lib + optional
REFERENCE.md.** Hook-audit is the first in the triple to add a per-skill
REFERENCE.md on top of `_shared/`, because it owns 20 categories across 6
domains vs doc's 16 across 5. When a family grows past a threshold, it
re-introduces a local REFERENCE.md.

**State passing:** Same file-based contract; adds `constants.js` for
cross-checker string literals.

**Strengths / weaknesses:** Same as doc/pr plus:
- `fixtures/` dir for regression tests — worth mirroring if `/migration`
  builds a test corpus of canonical
  file/workflow/concept migrations.
- `SKILL.md:139-141` explicitly documents: "This skill runs as a
  single-threaded sequential workflow. It does not spawn parallel agents
  internally." This is a deliberate contrast with `deep-research` and is a
  choice `/migration` must make (D4 — agent approach, research-deferred).
- `SKILL.md:146-150` documents **orchestrator return protocol** for when
  hook-audit is invoked by `/comprehensive-ecosystem-audit`:
  "Save JSON to `.claude/tmp/ecosystem-hook-result.json` and return ONLY:
  `COMPLETE: hook grade {grade} score {score} errors {N} warnings {N} info {N}`."
  This is a clean invocation contract for when a skill is a *subroutine* of
  another skill — directly relevant to `/migration`'s open question 7 about
  invocation contracts.

**Relevance to /migration:** **Medium-high, mostly for the contract
pattern.** The parent-skill invocation contract
(`hook-ecosystem-audit/SKILL.md:146-150`) is a direct precedent for the
`/migration` router-plus-ancillary question in BRAINSTORM §5 Q7.

---

## Decomposition-shape taxonomy

Taxonomy derived from the 6 families. For each shape: definition, families that
instantiate it, and the citation confirming the shape.

### Shape A — Monolith-with-companions (passive ancillaries)

**Definition:** One orchestrator SKILL.md contains all logic and phase
sequencing. Companion files are **passive**: reference docs (templates,
schemas, question categories), data configs (YAML), or LICENSE. The companions
are *read on demand* from within the orchestrator turn; they do not execute.

**Families:** `deep-research`, `mcp-builder`, `skill-creator`.

**Citations:**
- `deep-research/SKILL.md:179-181` — reads `domains/<domain>.yaml` and passes
  contents to agents; YAML is pure config.
- `mcp-builder/SKILL.md:96-112` — conditionally WebFetches + reads
  `reference/python_mcp_server.md` or `reference/node_mcp_server.md`.
- `skill-creator/SKILL.md:142-143` — refers reader to
  `.claude/skills/skill-creator/REFERENCE.md` for the 6 question categories.

### Shape B — Shared-chassis audit family

**Definition:** A thin SKILL.md per family that **defers to a shared protocol
library** in `_shared/<chassis>/`. The chassis owns the repeating rules;
SKILL.md owns only the family-specific details. Execution happens in a
runner script that invokes per-domain checker modules.

**Families:** `doc-ecosystem-audit`, `pr-ecosystem-audit`,
`hook-ecosystem-audit`.

**Citations:**
- `doc-ecosystem-audit/SKILL.md:45-47` — "Read
  `.claude/skills/_shared/ecosystem-audit/CRITICAL_RULES.md`".
- `pr-ecosystem-audit/SKILL.md:44-46` — identical reference.
- `hook-ecosystem-audit/SKILL.md:26-41` — summarizes the 8 rules inline and
  defers to `_shared/` implicitly via companion audits.
- `_shared/ecosystem-audit/CRITICAL_RULES.md:1-19` — self-documents its role:
  "Shared critical rules for all ecosystem audit skills. Referenced from each
  `*-ecosystem-audit/SKILL.md` to eliminate duplication."

**Sub-shape:** Within Shape B, **multi-checker runner** is the execution
pattern (`run-*-ecosystem-audit.js` calls N checkers; checkers write findings;
runner aggregates + scores + emits v2 JSON).

### Shape C — Phased pipeline

**Definition:** The skill is structured as N numbered phases with explicit
hand-offs, a state file for resume, and write-to-disk between phases. Not
exclusive with Shape A or B — it's an *orthogonal* organization axis.

**Families:** `deep-research` (12 phases, most elaborate),
`hook-ecosystem-audit` (8 phases), `doc-ecosystem-audit` (6 phases),
`pr-ecosystem-audit` (6 phases), `skill-creator` (7 phases + WARM-UP).

**Only non-phased:** `mcp-builder` (4 loosely numbered "phases" with no state
file, no resume, no inter-phase artifact contract).

**Citations:**
- `deep-research/SKILL.md:106-164` — explicit phase overview with phase
  markers and per-phase duration reporting.
- `hook-ecosystem-audit/SKILL.md:76-86` — numbered WARM-UP + Phase 1-8.
- `skill-creator/SKILL.md:84-93` — "WARM-UP / PHASE 1-7" with phase markers
  at `SKILL.md:95` (`Use phase markers: '======== PHASE N: [NAME] ========'`).

### Shape D — Router-plus-ancillary-skills

**Definition:** A parent skill *dispatches* to sibling skills as sub-skills
(not sub-agents, not sub-scripts — full peer skills with their own SKILL.md).
**Not instantiated in any of the 6 families examined.** This is the CAS
precedent (owned by D7a) — e.g., `/analyze` dispatching to `/recall` /
`/synthesize` / the repo-analysis / media-analysis / document-analysis family.

**Citations within this set:** None. All 6 families keep orchestration
internal. The closest move is `hook-ecosystem-audit`'s orchestrator-return
protocol (`SKILL.md:146-150`) which shows how a sub-skill behaves when invoked
by another skill, but the routing lives in the *parent*
(`/comprehensive-ecosystem-audit`), which is not in this set.

### Shape E — Scaffolding script helper (adjunct)

**Definition:** `scripts/` directory containing executable CLIs callable by
the skill (init, validate, package, evaluate).

**Families:** `mcp-builder` (`scripts/evaluation.py`,
`scripts/connections.py`), `skill-creator` (`scripts/init_skill.py`,
`package_skill.py`, `quick_validate.py`), `doc/pr/hook-ecosystem-audit`
(`scripts/run-*.js` + `scripts/checkers/` + `scripts/lib/`).

**Not scaffolded:** `deep-research` (all logic lives in SKILL.md + spawned
sub-agents; no local scripts).

---

## Relevance matrix for /migration

Matching each BRAINSTORM-locked decision against which family's shape fits
best.

| /migration axis | BRAINSTORM ref | Best-fit family | Shape | Why |
| --- | --- | --- | --- | --- |
| 7-phase canonical arc (D21) | §2 Bones | `deep-research` | Phased pipeline (C) | 12-phase arc + phase markers + per-phase state is the closest direct precedent. |
| State machine tracks gates only (D20/R1) | §3 | `deep-research` + `skill-creator` | Phased pipeline (C) | Both persist state file per phase for compaction resilience. |
| Gate memory aids confirmation (D22/R3) | §3 | `deep-research` | Phased pipeline (C) | Resume mode reads state file and re-prompts at gates. |
| Multi-verdict dispatch (D23: 6 verdicts) | §3 | `hook-ecosystem-audit` runner/checker | Shared-chassis (B) | Runner dispatches to 6 checkers; `/migration` dispatches to 6 verdict handlers. Analogy is nearly 1:1. |
| Active transformation at Phase 5 (D24) | §3 | `deep-research` phase 2.5–3.97 | Phased pipeline (C) | Deep-research does synthesis→verify→challenge→resolve→gap→re-synthesize. `/migration` needs sanitize→reshape→rewrite→re-verify. |
| Two output modes (D26: direct-apply / plan-export) | §3 | `mcp-builder` conditional reference loading | Monolith-with-companions (A) | `reference/python_mcp_server.md` vs `reference/node_mcp_server.md` as on-demand mode-specific docs is the cleanest precedent. |
| Research-verdict conditional (R4) | §3 | `deep-research` depth-scaled phases | Phased pipeline (C) | Phase 2.5 verifier count scales L1→L4; `/migration` Phase 3 scales by verdict. |
| Cross-skill integration inventory (D27) | §5 Q2 | `hook-ecosystem-audit` orchestrator return protocol | Shared-chassis (B) sub-pattern | `SKILL.md:146-150` shows the invocation contract a parent skill expects. |
| Invocation contract primary→ancillary (Q7) | §5 Q7 | **D7a CAS precedent** (not this set) | Router-plus-ancillaries (D) | Not present in any of the 6. Refer to sibling D7-cas-precedent. |
| Self-dogfood of /migration on /migration (Q10) | §5 Q10 | `skill-creator` Phase 6 + `hook-ecosystem-audit` Phase 5 | Monolith (A) + Phased (C) | Both have explicit self-audit phases that verify the skill's own process. |
| Iterative re-entry (D28) | §3 | `deep-research` Phase 3.9 re-synthesis + Phase 3.97 final re-synthesis | Phased pipeline (C) | Re-entry is built in via `>20% changed → re-synthesize`. `/migration` can mirror this as a re-run trigger. |

**Top-fit decomposition for v1 /migration:** **Monolith-with-companions (Shape
A) + Phased pipeline (Shape C)** — directly modeled on `deep-research`. Files:

- `SKILL.md` — 7-phase orchestrator, gate-first, state-aware.
- `REFERENCE.md` — output templates (MIGRATION_PLAN.md schema, verdict
  taxonomy, state file schema, invocation-contract for future ancillary
  routing).
- `verdicts/*.yaml` (or `idioms/<destination>.yaml`) — per-destination
  parameterization of reshape/rewrite rules. Mirrors `deep-research/domains/`.
- `scripts/apply-migration-plan.js` — executable helper for Phase 5
  (mirrors `mcp-builder/scripts/evaluation.py` and
  `skill-creator/scripts/init_skill.py`).
- Optional `scripts/checkers/` — per-verdict handlers if v1 scope demands
  modular dispatch; mirror `hook-ecosystem-audit/scripts/checkers/`.

**Explicitly deferred:**
- **Shape B (shared-chassis)** — premature for v1. Only worth extracting to
  `_shared/migration/` when a second migration-like skill emerges (D28
  re-entry, or a sibling `/sync` that reuses sanitize/reshape primitives).
- **Shape D (router-plus-ancillary-skills)** — the CAS precedent is
  investigated by D7a. Decision deferred until that finding lands.

**Why not other fits:**
- Pure `mcp-builder` shape — no state file, no resume, no gate-first contract.
  Kills D20/R1, D22/R3. Rejected.
- Pure audit-family shape — three thin SKILL.md files + giant shared chassis is
  overkill for one skill. Rejected for v1.
- Pure `skill-creator` shape — closest *process* fit (discovery + plan +
  build + audit), but `deep-research`'s phase-count + state-file discipline is
  more battle-tested for long, interruptible flows. Use `skill-creator` as a
  secondary reference.

---

## Sources

All citations are absolute paths with line numbers. Depth L1 per sub-question
spec.

- `C:\Users\jbell\.local\bin\sonash-v0\.claude\skills\deep-research\SKILL.md:106-164`
  (phase overview); `SKILL.md:179-181` (domain YAML load); `SKILL.md:208-211`
  (agent spawn with domain config); `SKILL.md:237-291` (phases 2.5–3.97
  sub-agent dispatch); `SKILL.md:15-16` (REFERENCE.md extraction rationale);
  `SKILL.md:36-40`, `221-223`, `255-266` (Windows 0-byte fallback).
- `C:\Users\jbell\.local\bin\sonash-v0\.claude\skills\deep-research\REFERENCE.md:15-38`
  (22-section TOC confirms monolithic reference doc).
- `C:\Users\jbell\.local\bin\sonash-v0\.claude\skills\deep-research\domains\academic.yaml:13-27`
  (source_authority + verification_rules sample).
- `C:\Users\jbell\.local\bin\sonash-v0\.claude\skills\mcp-builder\SKILL.md:34-112`
  (4-phase workflow + conditional language reference loading);
  `SKILL.md:100-105` (Python path); `SKILL.md:107-112` (Node path).
- `C:\Users\jbell\.local\bin\sonash-v0\.claude\skills\skill-creator\SKILL.md:18-33`
  (Critical Rules 1-7 including state-per-phase); `SKILL.md:84-93` (7 phases);
  `SKILL.md:142-143` (REFERENCE.md delegation); `SKILL.md:217-218`
  (scaffolding script invocation); `SKILL.md:15` (shared SKILL_STANDARDS.md).
- `C:\Users\jbell\.local\bin\sonash-v0\.claude\skills\doc-ecosystem-audit\SKILL.md:45-55`
  (8-rule shared chassis reference); `SKILL.md:60-65` (compaction guard
  delegation); `SKILL.md:68-176` (6 phases with checker script invocation).
- `C:\Users\jbell\.local\bin\sonash-v0\.claude\skills\pr-ecosystem-audit\SKILL.md:42-55`
  (identical shared-chassis pattern).
- `C:\Users\jbell\.local\bin\sonash-v0\.claude\skills\hook-ecosystem-audit\SKILL.md:26-41`
  (8 critical rules); `SKILL.md:74-86` (8-phase overview);
  `SKILL.md:139-152` (single-threaded declaration + orchestrator return
  protocol); `SKILL.md:156-184` (Phase 1 runner invocation + state init);
  `SKILL.md:304-347` (Phase 5 self-audit + gate effectiveness review).
- `C:\Users\jbell\.local\bin\sonash-v0\.claude\skills\hook-ecosystem-audit\scripts\run-hook-ecosystem-audit.js:1-80`
  (orchestrator entry + lib module loading).
- `C:\Users\jbell\.local\bin\sonash-v0\.claude\skills\_shared\ecosystem-audit\CRITICAL_RULES.md:1-40`
  (shared chassis self-description, 8 rules formal definition).
- Directory listings confirming file counts and byte-identical
  `safe-fs.js` (24,810 bytes) across the three audit families:
  `C:\Users\jbell\.local\bin\sonash-v0\.claude\skills\doc-ecosystem-audit\scripts\lib\`,
  `.../pr-ecosystem-audit/scripts/lib/`, `.../hook-ecosystem-audit/scripts/lib/`.
- Cross-reference to sibling finding `D7-cas-precedent.md` for Shape D
  (router-plus-ancillary-skills), which is absent from this set.
- BRAINSTORM.md §2 (bones), §3 (D20–D29), §5 Q7 (the spawning question for
  this sub-question): `C:\Users\jbell\.local\bin\JASON-OS\.research\migration-skill\BRAINSTORM.md`.

---

**End FINDINGS — D7-other-multi-skill-families.**
