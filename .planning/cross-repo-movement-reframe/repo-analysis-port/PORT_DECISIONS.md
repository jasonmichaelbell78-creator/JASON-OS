# repo-analysis Port — Decision Record

**Started:** Session 22 (2026-04-25)
**Status:** IN PROGRESS — paused after Batch 2, one open question on T1/T2/T3 labels.
**Decision context:** Option 1 (full delegation) chosen. repo-analysis ports
manually from SoNash to JASON-OS. JASON-OS profile-discovery becomes a
500-1000 line transformer over repo-analysis output (acknowledged scope —
not the 100-200 line glue originally estimated).

**Source repo:** `C:\Users\jason\Workspace\dev-projects\sonash-v0\.claude\skills\repo-analysis\`
**Target location:** `C:\Users\jason\Workspace\dev-projects\JASON-OS\.claude\skills\repo-analysis\`
**Sibling resources to port:** SoNash uses `.claude/skills/shared/` for
cross-skill resources (CONVENTIONS.md, SKILL_STANDARDS.md, TAG_SUGGESTION.md,
AUDIT_TEMPLATE.md, SELF_AUDIT_PATTERN.md). JASON-OS will create
`.claude/skills/shared/` at port time and bring over only what repo-analysis
depends on.

**Walkthrough principle:** anything that feeds detection signal into the
JASON-OS transformer is high-value KEEP. Anything that's pre-shaped output
framing tied to SoNash's mental model is candidate REMOVE or EDIT.

---

## Batch 1 — Routing & sibling integrations (5/5 LOCKED)

| # | Item | Disposition | Rationale |
|---|------|-------------|-----------|
| 1 | TDMS integration (Send-to-TDMS routing, no-auto-pollution rule) | **REMOVE** | TDMS does not exist in JASON-OS and is not on the roadmap. Carrying integration creates dead branches. |
| 2 | `/synthesize` cross-repo synthesis (Section 17, auto-offer, reading-chain.jsonl, cross_repo_connections[]) | **REMOVE for v1, with one stub** | `/synthesize` does not exist in JASON-OS. Stub one schema field nullable (`cross_repo_links: null`) for future re-activation without schema migration. |
| 3 | `/audit-comprehensive` home-repo guard | **EDIT** | Keep guard pattern; replace `/audit-comprehensive` redirect with error-with-explanation. Update matched repo identifier from `jasonmichaelbell78-creator/sonash-v0` to JASON-OS's home-repo identifier. |
| 4 | `/analyze` router dispatch (handoff contract `{target, auto_detected_type: "repo"}`) | **REMOVE** | JASON-OS does not have `/analyze`. Direct `/repo-analysis <url>` invocation works fine. |
| 5 | EXTRACTIONS.md system (`extraction-journal.jsonl`, `EXTRACTIONS.md` regeneration via `scripts/cas/generate-extractions-md.js`, full Section 3.6 + 15.6) | **REMOVE** | Functionally duplicates the Batch 3 ledger (`.claude/state/ledger.jsonl`). The ledger becomes canonical for cross-repo extraction tracking. Avoid two parallel systems answering the same question. |

---

## Batch 2 — Output artifacts (9/10 LOCKED, 1 OPEN)

### KEEP as-is or with light edits (5 items)

| # | Item | Disposition | Rationale |
|---|------|-------------|-----------|
| 1 | `analysis.json` (canonical structured output, Zod-validated) | **KEEP, schema EDIT** | Primary transformer input. Strip SoNash-specific fields (TDMS metadata, `last_synthesized_at`, `adoption_verdict`, `source_tier`) but preserve dimension data, findings counts, repo-type, discovery metadata. |
| 2 | `findings.jsonl` (per-finding records) | **KEEP as-is** | Richest transformer input — every gate-relevant signal as a discrete row. JSONL is naturally streamable for large repos. |
| 3 | `trends.jsonl` (re-analysis comparison) | **KEEP as-is** | Tells re-discovery what changed. Adopt a rotation policy at port-time to bound growth. |
| 4 | `deep-read.md` (Phase 2b internal-artifacts enumeration) | **KEEP as-is** | Primary input for shape inference (transformer reads to identify `directory_convention` / `companion_files` / `naming_scheme` per unit type). |
| 5 | `coverage-audit.jsonl` (Phase 6b unscanned-content tracking) | **KEEP, drop interactivity for v1** | This IS the discovery_gap fallback (Q37 already locked). Drop the user-prompt interactivity; passive triage queue surfacing matches Q2C-3 pattern. |

### EDIT (3 items)

| # | Item | Disposition | Rationale |
|---|------|-------------|-----------|
| 6 | `value-map.json` (4 candidate types: pattern / knowledge / content / anti-pattern) | **KEEP with EDIT** | Drop content + anti-pattern types. Keep pattern + knowledge as advisory input to `/extract` decisions. Content is curated-list-only; anti-pattern is creator-view-tied. |
| 7 | `summary.md` (deep-plan injectable summary) | **KEEP with EDIT** | Concept is universal; format must match JASON-OS `/deep-plan` v3.4's research-context expectations. Trim sections tied to creator-view, adoption verdict. |
| 8 | Engineer View framing (Security/Reliability/Maintainability/Documentation/Process/Velocity dimensions) | **EDIT** | KEEP dimension findings as transformer inputs (raw signal that maps to gates). DROP the band scoring, dual-lens framing, adoption-verdict band. The transformer wants underlying findings, not derived bands. |

### Creator View family — REVISED from REMOVE to KEEP (per user pushback)

User pushback: "Creator View is invaluable in SoNash, I don't see why it
couldn't be here." Original REMOVE bundle was wheel-reinvention reflex.
Cross-repo *movement* depends on cross-repo *understanding*; Creator View
captures the conceptual layer (what a repo *understands*, where its blindspots
are, where its approach differs) that gates+shapes don't. Cutting it threw
away the layer that prevents porting mistakes.

| # | Item | Disposition | Rationale |
|---|------|-------------|-----------|
| 9a | `creator-view.md` artifact (6 sections: Understands+Blindspots / Relevant / Approach Differs / Challenge / Knowledge Candidates / Worth Avoiding) | **KEEP all 6 sections** | Each section translates cleanly to JASON-OS cross-repo movement context. Conversational-prose mandate stays. |
| 9b | Home-repo context loading | **KEEP, light EDIT** | Load SESSION_CONTEXT.md, CLAUDE.md, .claude/skills/, MEMORY.md (auto-memory). ROADMAP.md graceful-skip-if-absent (deferred in JASON-OS per CLAUDE.md). Add `.planning/jason-os/` as additional context source. |
| 9c | Adoption verdict (Adopt / Trial / Extract / Avoid) | **KEEP, REDEFINE** | Re-label for JASON-OS port-decision context: full-mirror / experimental-subset / cherry-pick / don't-port-from. The four-band shape is sound; labels match the consuming context. |
| 9d | T1 / T2 / T3 source tiers (Knowledge Candidates priority) | **OPEN — pending user** | Two options: (a) keep T1/T2/T3 verbatim, users learn the labels; (b) rename to JASON-OS-native port-priority labels (port-now / port-when-needed / note-only). User to decide. |
| 9e | Absence patterns (GHOST_SHIP, TEST_THEATER, SECURITY_FACADE, BORROWED_ARMOR, DEPENDENCY_FREEZE, LONE_WOLF, SILENT_FAILURE) | **KEEP all 7** | Red-flag classifiers transcend SoNash's specific use case. Useful for any port-decision flow. Audit at port-time for SoNash-specific signal sources in the classifier code. |

### REMOVE (1 bundled family — curated-list-only outputs)

| # | Item | Disposition | Rationale |
|---|------|-------------|-----------|
| 10 | `content-eval.jsonl` + `mined-links.jsonl` (curated-list-only) | **REMOVE** | Tied to repo-analysis's curated-list repo type (Awesome lists, reading collections). JASON-OS port targets are code repositories, not reference lists. Cheap re-add if needed later. |

---

## Batches Remaining

- **Batch 3** — scoring, classifiers, confidence framing (~5 items: scoring bands, repo type classification, code portability rubric, temporal fingerprint, normalization rules)
- **Batch 4** — tagging (TAG_SUGGESTION.md, 8 categories, semantic tags)
- **Batch 5** — schema and validation (analysis-schema.js, state file schema)
- **Batch 6** — process pipeline (clone, dimension wave, deep read, coverage audit) — mostly KEEP
- **Batch 7** — guard rails (rate limit, home repo, fork detection, large repo, monorepo) — mostly KEEP with edits
- **Batch 8** — `scripts/cas/` (12 TDMS-adjacent scripts, mostly REMOVE/DEFER)

---

## Resume Contract (Session 22 → 23)

1. Re-load this file (PORT_DECISIONS.md).
2. Resolve open question 9d (T1/T2/T3 vs port-priority labels).
3. Continue with Batch 3 — scoring, classifiers, confidence framing.
4. Walk through remaining batches 4-8.
5. Once walkthrough complete, the actual port operation can begin (file copy
   from SoNash with the disposition table applied as a mechanical edit pass).
6. Then transformer design re-emerges as smaller, post-port Batch 4 of the
   main /deep-plan (was: profile discovery + /extract; now: transformer-over-
   repo-analysis + /extract).

## Walkthrough Decisions Captured To Date

- Batch 1: 5 LOCKED
- Batch 2: 9 LOCKED, 1 OPEN
- **Total walkthrough decisions: 14 LOCKED + 1 OPEN**

These are independent of and additional to the main /deep-plan decision count
(currently 42 from Batches 1-3 + 2c).
