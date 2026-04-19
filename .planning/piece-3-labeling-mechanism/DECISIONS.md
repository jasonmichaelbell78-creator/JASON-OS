# DECISIONS — piece-3-labeling-mechanism

**Date:** 2026-04-19 (Session #9)
**Topic:** Labeling mechanism — how schema-conforming records are created,
  kept current, validated, and corrected
**Status:** FINAL — approved for PLAN.md implementation
**Preceding:** DIAGNOSIS.md (same directory), Piece 2 DECISIONS.md (D1–D32),
  BRAINSTORM.md, Piece 1a/1b RESEARCH_OUTPUT.md

This is the standalone decision record for Piece 3. Every decision below was
confirmed during Phase 1 Discovery (5 batches, ~16 questions). PLAN.md
references these by ID (D1–D19).

Hard constraint honored throughout: **no manual steps day-to-day**; occasional
skill invocation acceptable for supplementary audits only.

Skill-role constraint honored throughout: **skills cannot be the primary
mechanism for any load-bearing process**. Skills supplement automatic layers;
they never substitute for one.

---

## Section 1 — Where labels live (source of truth)

| # | Decision | Choice | Rationale |
|---|---|---|---|
| D1 | Label storage location | **External catalog file(s) + `content_hash` fingerprint safety net.** No authoritative label data in source files. | Schema has 26 universal + up to 7 per-type fields; in-file is infeasible for 70% of file types (hooks, scripts, configs, CI). `content_hash` already universal per Piece 2 D30-supplement — staleness is auto-detectable via hash mismatch. Rejected: in-file-only (drift already proven by 3-gen memory frontmatter); hybrid per-type in-file (inherits same drift); full hybrid with minimal in-file anchor (no material gain over pure external + fingerprint). |

---

## Section 2 — Who writes and maintains records

| # | Decision | Choice | Rationale |
|---|---|---|---|
| D2 | Maintenance layer 1 | **PostToolUse write hook** — fires on every Edit/Write tool call against in-scope files. | Catches every change the moment it happens; zero user involvement. |
| D3 | Maintenance layer 2 | **Pre-commit validator** — extends `.husky/pre-commit` alongside gitleaks. Blocks commits with invalid records or unresolved `needs_review` items. | Git-native gate; non-bypassable without explicit `SKIP_CHECKS` + `SKIP_REASON`. Matches existing skip-pattern per `.husky/_shared.sh`. |
| D4 | Maintenance layer 3 | **Consolidated `/label-audit` skill** — deep periodic re-verification; supplementary only. | Catches drift the hook missed. Never primary — if user never invokes, the other two layers still keep catalog correct. |

---

## Section 3 — When validation runs

| # | Decision | Choice | Rationale |
|---|---|---|---|
| D5 | Validation timing | **Pre-commit (D3) + on-demand `/label-audit` skill (D4).** Not every-file-write — D2 hook already auto-updates on writes, so running ajv on every write would be belt-and-suspenders. | Fits "occasional skill for checks is fine" constraint. 95%+ coverage from pre-commit; remaining drift caught by audit skill. |

---

## Section 4 — Section detection for mixed-scope files (~10–20 files)

| # | Decision | Choice | Rationale |
|---|---|---|---|
| D6 | Section detection mechanism | **Three layers:** (a) heuristic (headings + scope-keyword match) runs automatically during hook/back-fill; (b) fingerprint-triggered per-file re-check (only re-scans files whose content changed since last check); (c) consolidated audit skill (D4) does deep periodic re-detection. No author declaration. | Heuristic cheap and fast for common cases; fingerprint trigger avoids re-scanning unchanged files; deep audit catches subtle bleed. Author declaration rejected per hard constraint (manual step). |

---

## Section 5 — Back-fill (one-time initial population)

| # | Decision | Choice | Rationale |
|---|---|---|---|
| D7 | Back-fill execution | **Pure AI agent fleet** — same parallel-dispatch pattern used in Piece 1a/1b discovery scans. Agents derive every field (mechanical and understanding-dependent). No script-only shortcut for mechanical fields. | User chose "most thorough" over efficiency. Agents re-check mechanical fields too, catch filename/frontmatter disagreements. |
| D8 | Back-fill verification | **Multi-agent cross-check (Q6b).** Different agents run derivation independently on the same file; disagreements are flagged via Q12 in-the-moment path, user arbitrates in conversation. | Agent disagreements are signal; catches ambiguous cases. Records of disagreement become training input for improving derivation logic. |
| D9 | Back-fill resilience | **All three mechanisms stacked:** (a) checkpoint every N files during run (resume from last good checkpoint on crash); (b) preview catalog written before real catalog (user reviews summary before commit); (c) rejection re-runs with annotated corrections. | Resilience during, review before, rollback via re-run. |
| D10 | Back-fill scope | **Back-fill is part of Piece 3 execution, not a separate phase.** The provisional "Piece 3.5" in BRAINSTORM §5 is collapsed into Piece 3. | User constraint: no MVP / defer-to-later framing. Complete tool day one. |

---

## Section 6 — New file / major-edit handling

| # | Decision | Choice | Rationale |
|---|---|---|---|
| D11 | Hook two-phase design | **Synchronous phase** (fast, always runs): name, path, type, fingerprint, module_system, file size. Writes partial record with `status: partial`, `pending_agent_fill: true`. **Async phase** (new files OR fingerprint diff >20%): spawns agent to fill understanding fields; flips `status` to `active` on completion. Minor edits (fingerprint diff ≤20%): fingerprint update only, no async. | Fast foreground, complete records eventually, no silent partial data (flag is explicit). Async failures surfaced via D15 in-the-moment paths — never logged-and-forgotten. |

---

## Section 7 — Overrides and error discovery

| # | Decision | Choice | Rationale |
|---|---|---|---|
| D12 | How user discovers errors | **Three automatic signals:** (a) multi-agent disagreement during back-fill / re-derivation surfaced in-the-moment via D15 paths; (b) per-field confidence scores below threshold flag record with `needs_review: [...]` + surface in-the-moment; (c) pre-commit validator blocks commits with non-empty `needs_review`. **No skill required to discover errors.** | Skills get forgotten (feedback_skills_not_primary_mechanism). Error discovery must be automatic and in-the-moment. |
| D12a | How user fixes errors | **Conversational correction.** User tells Claude in chat which field is wrong ("type for pr-review should be script-lib"). Claude updates catalog, sets `manual_override: [field-list]`, clears resolved `needs_review` entries, writes audit trail. **No manual file editing, no dedicated skill required.** | Zero user burden; Claude has full tool access to the catalog. `manual_override` survives re-derivations — hook respects the list. |

---

## Section 8 — Composites

| # | Decision | Choice | Rationale |
|---|---|---|---|
| D13 | Composite detection | **All three layers:** (a) heuristic runs inside hook/back-fill (skill→agent references, shared subdirectories, shared state files); (b) consolidated audit skill (D4) detects subtle semantic groupings periodically; (c) seed from Piece 1a/1b's ~15 already-identified composites at back-fill time. | Heuristic catches rule-matching groupings automatically; seed is free; deep audit catches subtle cases. Skill supplementary only per D4. |

---

## Section 9 — Two catalogs shape

| # | Decision | Choice | Rationale |
|---|---|---|---|
| D14 | Catalog file layout | **Split — shared vs local.** Mirrored files (code, shared manifest, shared docs) live in `shared.jsonl` (identical in both repos, mirrored by Piece 5 sync). Repo-specific files live in `local.jsonl` (per-repo, not mirrored). Same split applies to composites: `composites-shared.jsonl` + `composites-local.jsonl`. Catalog paths within `.claude/sync/` finalized by Piece 4. | Matches BRAINSTORM §3.3 architectural split (code=mirrored, event logs=local). Avoids duplication (11a) and data pollution (11b). |

---

## Section 10 — No-silent-failures enforcement

| # | Decision | Choice | Rationale |
|---|---|---|---|
| D15 | Failure surfacing | **Three real-time paths, never log-and-forget:** (1) hook exit non-zero with failure details in tool output — Claude surfaces in same turn with retry/fix/skip-with-reason options; (2) `UserPromptSubmit` hook injects pending-failures warning into user's next prompt — Claude cannot respond without acknowledgement first; (3) `Notification` hook fires OS-level desktop notification. **Logs exist as audit trail only**, never as the primary surfacing mechanism. Acknowledgement required before proceeding per `feedback_ack_requires_approval`. | Session-begin gets lost; audit skills aren't always run; log files never get read. Actions must be taken in the moment. |
| D15a | Applied per failure type | Write/edit hook crash, async agent failure, malformed file, catalog write failure, migration failure — all follow D15. Pre-commit failure blocks commit (already non-silent by design). | Uniform enforcement; every failure surfaces via at least one of the three D15 paths. |

---

## Section 11 — Schema evolution

| # | Decision | Choice | Rationale |
|---|---|---|---|
| D16 | Migration strategy | **Eager atomic migration on schema version change.** Migration script runs once per version bump. Reads all existing records, applies transformation (add field with default, rename, etc.), writes back atomically (temp file + rename). If any record fails migration, entire migration rolls back and surfaces via D15. No lazy upgrade. No validator-driven drift-then-upgrade. | Eager = predictable; atomic = no half-migrated catalog; non-silent per D15. Matches Piece 2 EVOLUTION.md's major-version-bump requirement for breaking changes and extends to minor bumps too. |

---

## Section 12 — Architectural meta-decisions

| # | Decision | Choice | Rationale |
|---|---|---|---|
| D17 | Safety-net posture | **Full safety net.** Accept up-front build cost for near-zero day-to-day drift and clear failure signals. | User explicit choice; matches `user_creation_mindset` (craft over shipping). |
| D18 | Cross-repo execution boundary | **JASON-OS session does:** tool build, JASON-OS back-fill, JASON-OS end-to-end test. **SoNash session (future, per BRAINSTORM §3.6):** bootstrap, SoNash back-fill, first bidirectional sync. **PLAN.md MUST include explicit "STOP: switch to SoNash session" marker at the handoff boundary.** No automatic cross-repo work from JASON-OS session. | Hooks fire per-session; Claude Code sessions are per-repo; smaller-first validates methodology before scaling. Per `feedback_user_action_steps`. |
| D19 | Skill consolidation | **ONE consolidated audit skill** (`/label-audit` or similar) covering catalog records, sections, composites. Not three separate skills. | User constraint — don't split skills when one covers it. Keeps the "supplementary only" surface small and memorable. |

---

## Cross-cutting principles enforced

| Principle | Decisions enforcing it |
|---|---|
| No manual steps day-to-day | D2, D6, D7, D11, D12, D12a, D13, D19 |
| No silent failures | D11, D12, D15, D15a, D16 |
| Skills never primary mechanism | D4, D6, D12, D13, D19 |
| Catalog is source of truth | D1, D12a, D14 |
| Cross-repo explicit prompts | D18 |
| Acknowledgement required on surfaced issues | D15, D15a |

---

## CL findings from Phase 0 — actions carried into plan

| Finding | Plan action |
|---|---|
| Claim 11: `ajv@8.18.0` installed extraneous, not declared in `package.json` | PLAN Step S1: `npm install --save-dev ajv` — declare it properly. |
| Claim 12: `Lineage` pattern in `pr-review/` is markdown body text (`**Lineage:**`), NOT YAML frontmatter | Piece 3 does not lean on a YAML-frontmatter lineage precedent; `lineage` field populates purely from catalog derivation (filename patterns + git history + explicit author marker). |

---

## Summary totals

| Count | Category |
|---|---|
| 19 | Load-bearing decisions (D1–D19) |
| 2 | Sub-decisions (D12a, D15a) |
| 3 | Architectural meta-decisions (D17–D19) |
| 2 | CL findings that drive plan steps |

**Total decisions logged:** 21 (D1–D19 + D12a + D15a).

Ready for PLAN.md implementation.
