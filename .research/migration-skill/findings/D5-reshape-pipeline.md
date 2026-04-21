# D5 — Reshape / Rewrite Pipeline Design

**Agent:** D5-reshape-pipeline (Phase 1 D-agent, deep-research migration-skill)
**Scope:** SQ-D5 per BRAINSTORM §5 Q5 — concrete pipeline for the four active-transformation verdicts (copy-as-is / sanitize / reshape / rewrite).
**Depth:** L1 (code snippets preferred over prose).
**Date:** 2026-04-21

---

## 1. Summary

The reshape/rewrite pipeline in `/migration` is a **4-lane verdict router**, each lane with its own primitive set and gate budget. Verdicts are assigned by a composable signal matrix (9 distinct evidence triggers) rather than a single heuristic. Idiom detection for v1 is **3-source hybrid**: static scan of destination `.claude/skills/_shared/` (authoritative) + few-shot on destination-skill exemplars (probabilistic) + optional `IDIOM_MANIFEST.yaml` (explicit override). Transformation primitives span regex → template → AST → LLM-rewrite (11 primitives catalogued). Gate budget scales with verdict (0 / 2 / 3 / 4 gates) and is **per-unit, not per-batch** — batch-level gates are offered only as an opt-in "confirm-all" at the gate prompt.

---

## 2. Verdict-heuristic matrix

### 2.1 Verdict-assigner inputs

```
verdict-assigner(
  source_artifact: {path, content, language, size_bytes},
  destination_idiom: IdiomProfile,     # §3
  cross_skill_refs: [SkillRef],        # from /sync registry
  semgrep_findings: [Finding],         # semantic patterns
  label_tags: [Tag],                   # from label-audit if available
  history: {copied_before?, prior_verdict?}   # state/gate memory
) -> Verdict + EvidenceTrace
```

### 2.2 Nine distinct signal triggers

| # | Signal | Detector | Weight toward |
|---|---|---|---|
| S1 | Hardcoded absolute path matching user-home patterns (`/Users/`, `C:\Users\`) | `sanitize-error.cjs` regex set | sanitize |
| S2 | Repo-name strings (`sonash-v0`, `SoNash`, `jasonmichaelbell78-creator/...`) | string-match | sanitize |
| S3 | Import of a dest-absent module (e.g., `firebase/firestore` in JASON-OS) | AST import scan vs `package.json` | reshape OR rewrite |
| S4 | Reference to destination-incompatible schema (e.g., `journal`, `daily_logs` Firestore collections) | AST member-access scan | rewrite |
| S5 | Cross-skill call whose target is unresolved in dest `.claude/skills/` | grep `/skill-name` tokens vs Glob of dest skills | blocked-on-prereq |
| S6 | Dest-idiom deviation (e.g., src uses Firestore `httpsCallable`, dest uses direct CLI args) | IdiomProfile §3.2 diff | reshape |
| S7 | Domain logic tied to source-only concepts (e.g., `migrateAnonymousUserData`, `inventoryEntries`) | name/identifier allowlist | rewrite |
| S8 | Structural identity — MD5 of normalized content unchanged vs prior-port | hash compare vs `.migration/state.json` | copy-as-is OR skip |
| S9 | File-type fast-path (LICENSE, .gitignore-fragment, pure-data .json without secrets) | extension + content heuristic | copy-as-is |

### 2.3 Verdict decision rules (evaluated top-down; first match wins)

```
if S5:                               → blocked-on-prereq
elif S8 and no S1/S2:                → copy-as-is
elif S9 and no S1/S2:                → copy-as-is
elif S4 or S7:                       → rewrite        # domain/schema coupling
elif S3 or S6:                       → reshape        # structural idiom gap
elif S1 or S2:                       → sanitize       # regex-scrubbable
else:                                → copy-as-is     # no triggers
```

Ties/multi-match → **escalate** to the next higher verdict (sanitize < reshape < rewrite). Every assignment emits an `EvidenceTrace` (list of fired signals + file:line refs) shown at the verdict gate (D8 nothing-silent).

### 2.4 Worked triggers (concrete)

```yaml
# example 1: scripts/lib/sanitize-error.cjs  →  JASON-OS
# S2: no repo strings; S6: no idiom gap (shared infra)
# no other signals fire
verdict: copy-as-is

# example 2: .claude/skills/pr-review/SKILL.md  →  JASON-OS
# S1: none; S2: "sonash" mentioned in 3 places; S6: dest uses gh-label set diff
verdict: sanitize  (from S2)  + reshape escalation (from S6)  →  reshape

# example 3: .claude/skills/audit-code/SKILL.md  →  JASON-OS
# S4: scans Firestore code paths; S6: dest has no firestore; S7: "SoNash" domain refs
verdict: rewrite
```

---

## 3. Idiom detection — recommended v1 approach

**Recommendation: 3-source hybrid, precedence static > manifest > LLM-fewshot.**

### 3.1 Source 1 — Static scan of destination (authoritative, cheap)

```js
// idiom-scan.js — runs in Phase 2 discovery, cached per-migration-session
const IDIOM_SOURCES = [
  `${DEST}/.claude/skills/_shared/SKILL_STANDARDS.md`,  // skill structure
  `${DEST}/CLAUDE.md`,                                   // guardrails, stack, antipatterns
  `${DEST}/scripts/lib/`,                                // helper inventory
  `${DEST}/.claude/skills/*/SKILL.md`,                   // exemplars
  `${DEST}/package.json`,                                // available deps
];
// extract: skill-frontmatter-fields, required helpers, forbidden patterns,
// naming conventions, file-layout norms.
```

Output: `IdiomProfile` record with fields `{stack, required_helpers, forbidden_patterns, skill_structure_rules, dep_allowlist, dep_denylist}`. This is the **authoritative** source — when it says "use `sanitize-error.cjs`", S6 diff fires deterministically.

### 3.2 Source 2 — Explicit `IDIOM_MANIFEST.yaml` (optional override)

v1: optional file at `<dest>/.claude/IDIOM_MANIFEST.yaml`. If present, its fields **override** static-scan inferences for ambiguous cases. Format:

```yaml
version: 1
stack: agnostic
require:
  file_helpers: scripts/lib/safe-fs.js
  error_sanitize: scripts/lib/sanitize-error.cjs
forbid:
  - pattern: "startsWith('..')"
    rule: path-traversal-safe
    replace_with: "/^\\.\\.(?:[\\/]|$)/.test(rel)"
skill_structure:
  frontmatter_required: [name, description]
  when_sections_required: [when_to_use, when_not_to_use]
```

### 3.3 Source 3 — Few-shot LLM exemplar inference (for gaps)

Only used when static+manifest don't resolve an idiom question mid-reshape. Dispatch a scoped subagent with 3 dest-skill exemplars + the source fragment; ask "does the destination have a convention for X?" Returns `{has_convention: bool, convention: ...}`. Result is **presented at the reshape gate**, never applied silently. Cache in `.migration/idiom-inferences.jsonl` for the session.

**Precision for v1:** static+manifest handles ~80% of idiom questions for the known JASON-OS ↔ SoNash pair; LLM-inference covers the long tail with human confirmation at the gate. This is "good enough for v1" per D17/D18 scope.

---

## 4. Transformation primitives catalog

11 primitives, ordered least-to-most invasive. Reshape agent uses P1–P7; rewrite agent uses P1–P11.

| # | Primitive | Mechanism | Used by | Gated? |
|---|---|---|---|---|
| P1 | `copy-bytes` | `fs.copyFile` | copy-as-is | post-copy diff shown |
| P2 | `regex-replace` | Compose `sanitize-error.cjs` SENSITIVE_PATTERNS + user-supplied patterns | sanitize | preview-then-confirm |
| P3 | `string-rename` | Literal string mapping `{"SoNash": "JASON-OS", ...}` | sanitize, reshape | preview |
| P4 | `template-substitute` | `${PLACEHOLDER}` fill from `IdiomProfile` (Apache-Commons-Text style) | reshape | preview |
| P5 | `frontmatter-rewrite` | YAML parse → edit keys → serialize; target SKILL.md frontmatter per dest rules | reshape | diff-gate |
| P6 | `import-swap` | AST import-declaration replace (jscodeshift-style `.find(ImportDeclaration).replaceWith(...)`) | reshape | diff-gate |
| P7 | `section-restructure` | Markdown-AST (remark) reorder/rename section headers to match dest skill structure | reshape | diff-gate |
| P8 | `helper-inject` | AST: insert `require('./sanitize-error.cjs')` + wrap call sites | rewrite | diff-gate |
| P9 | `schema-rebind` | Type/schema swap: SoNash Zod schema → JASON-OS-agnostic equivalent (manual mapping, LLM-proposed) | rewrite | 2-stage: propose + confirm |
| P10 | `domain-rewrite` | LLM generates replacement body for function whose semantics are source-only | rewrite | full-diff gate + test-plan |
| P11 | `research-dispatch` | Invoke `/deep-research` subflow when dest idiom is unknown mid-execute (per D24) | rewrite only | gate before dispatch, gate on results |

### 4.1 Primitive compatibility matrix (which primitives chain)

```
copy-as-is:   P1
sanitize:     P2, P3  (and P1 for untouched bytes)
reshape:      P1..P7  (all composable)
rewrite:      P1..P11 (all composable; P11 only when idiom unknown)
```

### 4.2 Reshape-vs-rewrite delta (what rewrite adds)

Rewrite = reshape + (P8, P9, P10, P11). Specifically: any primitive that **generates net-new code or semantics** rather than restructuring existing code. Rewrite alone can dispatch `/deep-research` mid-execute (P11) — reshape cannot (matches D24/D25).

---

## 5. Gate design

### 5.1 Gates-per-verdict (D8 nothing-silent; per-unit default)

| Verdict | Gate count | Gate sequence |
|---|---|---|
| copy-as-is | **1** | (G-CONFIRM) post-copy diff + "accept/reject" |
| sanitize | **2** | (G-PREVIEW) regex matches shown pre-apply → (G-CONFIRM) post-apply diff |
| reshape | **3** | (G-PLAN) transformation plan (primitives P1–P7 list + idiom evidence) → (G-PREVIEW) full diff pre-apply → (G-CONFIRM) post-apply structural-diff + test-plan |
| rewrite | **4** | (G-PLAN) + (G-RESEARCH) if P11 fires, present research findings → (G-PREVIEW) full diff → (G-CONFIRM) post-apply + required test-plan execution |

### 5.2 Per-unit vs per-batch

- **Default: per-unit.** Every file gets its own gate pass. Matches D8 ("nothing silent, ever — every verdict, sanitization, reshape, rewrite, ripple, commit requires explicit user confirmation").
- **Opt-in: batch-confirm.** At any G-PLAN gate the user can choose `[3] apply all similar (N) with one confirm`. Only offered when the remaining batch is same-verdict + same-primitive-set. Still emits a batch-summary gate at the end.
- **Never: silent batch.** No "auto-continue" mode in v1 (D29 local-scope + D8).

### 5.3 Checkpoint granularity

One checkpoint file entry per gate in `.migration/state.json`:

```json
{
  "session_id": "mig-2026-04-21-001",
  "unit": ".claude/skills/audit-code/SKILL.md",
  "verdict": "rewrite",
  "gates_passed": ["G-PLAN", "G-RESEARCH"],
  "gates_pending": ["G-PREVIEW", "G-CONFIRM"],
  "evidence_trace": [...],
  "primitives_applied": ["P3", "P5"],
  "resume_hint": "await G-PREVIEW; llm-rewrite output staged at .migration/staging/..."
}
```

Resume (R3) replays the evidence+prior-answers for context, **re-asks for confirmation**.

---

## 6. Concrete walkthrough — `audit-code` SoNash → JASON-OS

Source: `C:\Users\jbell\.local\bin\sonash-v0\.claude\skills\audit-code\SKILL.md` (370 lines, Firestore+Next.js heavy, AUDIT_TEMPLATE reference, Zod, MCP-SonarCloud, Session-#128 episodic-memory pattern).

### Phase sequence

```
Phase 0 — Context
  - /sync registry loaded
  - IdiomProfile(JASON-OS) built from static scan + CLAUDE.md
  - state: .migration/state.json initialized

Phase 1 — Target pick
  - user: "migrate audit-code from SoNash to JASON-OS"

Phase 2 — Discovery (verdict assignment)
  signals fired on audit-code/SKILL.md:
    S3: imports conceptual refs to firebase/firestore, zod, next.js         → reshape/rewrite
    S4: references `journal`, `daily_logs`, `inventoryEntries` schemas       → rewrite
    S6: references `npm run patterns:check`, `npm run lint`; JASON-OS has
        no lint infra yet (forbid-pattern unknown in dest)                   → reshape
    S7: "SoNash", "session #128 episodic memory MCP", Firestore antipatterns → rewrite
    S5: refs `mcp__plugin_episodic-memory__search` — absent in JASON-OS       → blocked-on-prereq candidate

  decision: S4+S7 dominate → VERDICT = rewrite
  sub-finding: S5 flags episodic-memory block; user chooses at gate whether
               to (a) drop that step, (b) stub it, (c) treat as prereq and halt.

  ┌──────────────────── GATE G-VERDICT ────────────────────┐
  │ audit-code → VERDICT: rewrite                          │
  │ Evidence: S3, S4, S6, S7 (shown)                       │
  │ S5 sub-issue (MCP episodic-memory absent): resolve     │
  │   [1] drop    [2] stub    [3] block & prereq          │
  │ user chose: [2] stub                                   │
  └────────────────────────────────────────────────────────┘

Phase 3 — Research (MANDATORY per R4; rewrite cannot skip)
  dispatches scoped /deep-research subflow:
    Q1: what does an "audit" skill look like idiomatically in JASON-OS v0?
    Q2: what lint/patterns infra does JASON-OS v0 expose today?
    Q3: does JASON-OS want a single-session audit, or is this a Layer-2 skill?
  findings cached in .migration/research/audit-code-rewrite-R1.md

  ┌──────── GATE G-RESEARCH (rewrite-only; P11) ──────────┐
  │ research findings summary shown                        │
  │ recommendation: target JASON-OS v0 "foundation" scope; │
  │ drop Next.js/Firestore categories; retain Hygiene +    │
  │ Types + Security; defer AICode+Debugging to Layer 2.   │
  │ [accept] [request more research] [abort]               │
  └────────────────────────────────────────────────────────┘

Phase 4 — Plan (writes MIGRATION_PLAN.md)
  primitives to apply:
    P3  string-rename: SoNash→JASON-OS, sonash-v0→jason-os, etc.
    P5  frontmatter-rewrite: strip `supports_parallel`/`estimated_time_*`
        (not idiomatic in JASON-OS v0 skills per IdiomProfile), keep name+desc
    P7  section-restructure: collapse 7-category audit → 3-category (per research)
    P8  helper-inject: reference scripts/lib/sanitize-error.cjs (the JASON-OS
        copy) instead of SoNash path
    P9  schema-rebind: drop Zod/TS-strict mentions → keep language-agnostic
        wording per JASON-OS CLAUDE.md §1
    P10 domain-rewrite: rewrite `npm run patterns:check` orchestration to
        reference JASON-OS `gitleaks` + `codeql` + `semgrep` CI gates instead
    (P2 sanitize runs as sub-step inside rewrite — sweeps S1/S2 residues)

Phase 5 — Execute (active transformation, gated)

  ┌──────────── GATE G-PLAN (rewrite #1) ──────────────────┐
  │ Primitive plan shown: P3, P5, P7, P8, P9, P10          │
  │ Estimated diff size: ~220 lines changed                │
  │ [accept] [modify plan] [downgrade to reshape] [abort]  │
  └────────────────────────────────────────────────────────┘
  # user: accept

  agent runs P3 → P5 → P7 → P8 → P9 → P10 sequentially on staged copy
    staging: .migration/staging/audit-code-SKILL.md

  ┌──────────── GATE G-PREVIEW (rewrite #3) ───────────────┐
  │ FULL DIFF (staging vs would-be destination)            │
  │ sections renamed: 7 → 3                                │
  │ 62 lines removed (Firestore/Zod/MCP-episodic)          │
  │ 38 lines added (JASON-OS CI gate references)           │
  │ [accept] [edit inline] [re-run with different LLM] [abort] │
  └────────────────────────────────────────────────────────┘
  # user: accept

  write to: C:\Users\jbell\.local\bin\JASON-OS\.claude\skills\audit-code\SKILL.md

Phase 6 — Prove (convergence-loop verification)

  ┌──────────── GATE G-CONFIRM (rewrite #4) ───────────────┐
  │ post-apply structural diff + test plan:                │
  │  - skill frontmatter parses (convergence check)        │
  │  - no SoNash strings remain (grep == 0)                │
  │  - referenced helpers exist in JASON-OS (file-check)   │
  │  - /session-begin can enumerate the skill (smoke)      │
  │ all checks PASS                                        │
  │ [commit] [rollback] [hold for review]                  │
  └────────────────────────────────────────────────────────┘
  # user: commit  →  single git commit, no push (per guardrail #7)

artifacts produced:
  - .migration/state.json         (resumable state)
  - .migration/staging/...        (pre-write staged copy)
  - .migration/research/...R1.md  (research output, cached)
  - MIGRATION_PLAN.md             (plan artifact, committed)
  - docs/audits/...               (not produced by /migration;
                                    the ported skill produces those)
  - git commit on JASON-OS branch

gate count this run: 5 (G-VERDICT, G-RESEARCH, G-PLAN, G-PREVIEW, G-CONFIRM)
```

---

## 7. Sources

**In-house:**
- `C:\Users\jbell\.local\bin\sonash-v0\scripts\lib\sanitize-error.cjs` — sanitize primitive (P2), 15 baseline regex patterns re-used.
- `C:\Users\jbell\.local\bin\sonash-v0\.claude\skills\_shared\SKILL_STANDARDS.md` — skill-structure idiom source (P5, P7).
- `C:\Users\jbell\.local\bin\sonash-v0\.claude\skills\audit-code\SKILL.md` — walkthrough subject.
- `C:\Users\jbell\.local\bin\sonash-v0\.claude\skills\quick-fix\SKILL.md` — reshape-adjacent pattern (auto-fix framing).
- `C:\Users\jbell\.local\bin\JASON-OS\CLAUDE.md` — IdiomProfile v0 source of truth.
- `C:\Users\jbell\.local\bin\JASON-OS\.research\migration-skill\BRAINSTORM.md` §3 D23/D24/D25, §5 Q5.

**Web:**
- [OpenRewrite recipes](https://docs.openrewrite.org/concepts-and-explanations/recipes) — 3-recipe-type model (declarative/refaster/imperative) informs primitive P4 (declarative) / P6-P10 (imperative) split.
- [OpenRewrite LST](https://www.javacodegeeks.com/2026/04/openrewrite-the-automated-migration-tool-thats-quietly-changing-how-teams-upgrade-java.html) — Lossless Semantic Tree precedent for diff-gated AST edits.
- [jscodeshift API](https://jscodeshift.com/build/api-reference/) — fluent collection/node-path model for P6 import-swap + P7 section-restructure.
- [jscodeshift intro](https://jscodeshift.com/overview/introduction/) — codemod workflow precedent.
- [Rector PHP docs](https://getrector.com/documentation) — rule-based detect+fix precedent for verdict-signal architecture (§2.2).
- [Rector set lists](https://getrector.com/documentation/set-lists) — prepared-rule-set precedent (future: JASON-OS IDIOM_MANIFEST preset packs).
- [LLM code migration with diffs](https://arxiv.org/html/2511.00160v1) — supports P10 (LLM domain-rewrite) with diff context.
- [SemGuard semantic evaluator](https://arxiv.org/html/2509.24507v1) — semantic gating precedent for G-CONFIRM checks.
- [AI code edit formats](https://www.morphllm.com/edit-formats) — diff-preview-then-apply pattern (G-PREVIEW gate design).
- [Aviator LLM migration case study](https://www.aviator.co/blog/llm-agents-for-code-migration-a-real-world-case-study/) — confidence-threshold → human-review handoff pattern (matches G-CONFIRM escalation).
- [Apache Commons Text StringSubstitutor](https://simplesolution.dev/java-substitute-a-string-in-java-by-replace-variables-map-to-template-string/) — P4 template-substitute reference impl.

---

## 8. Returns (for parent agent)

- **verdict-heuristic distinct-signals count:** **9** (S1–S9)
- **idiom-detection approach recommended:** **3-source hybrid** — static-scan (authoritative) + optional `IDIOM_MANIFEST.yaml` (explicit override) + few-shot LLM exemplar inference (gap filler, gated)
- **primitive count:** **11** (P1–P11); reshape uses P1–P7, rewrite uses P1–P11
- **gate count per verdict:** copy-as-is=**1**, sanitize=**2**, reshape=**3**, rewrite=**4** (rewrite's G-RESEARCH only fires when P11 dispatches)
- **findings path:** `C:\Users\jbell\.local\bin\JASON-OS\.research\migration-skill\findings\D5-reshape-pipeline.md`
- **file size:** see reported by caller after write
