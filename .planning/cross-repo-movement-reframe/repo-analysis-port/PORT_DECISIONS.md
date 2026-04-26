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
| 9d | T1 / T2 / T3 source tiers (Knowledge Candidates priority) | **EDIT — rename to port-priority labels** | Option (b) chosen 2026-04-25. JASON-OS-native labels: `port-now` / `port-when-needed` / `note-only`. Mapping table for cross-repo conversation: T1↔port-now, T2↔port-when-needed, T3↔note-only. Captured here so the equivalence isn't lost. |
| 9e | Absence patterns (GHOST_SHIP, TEST_THEATER, SECURITY_FACADE, BORROWED_ARMOR, DEPENDENCY_FREEZE, LONE_WOLF, SILENT_FAILURE) | **KEEP all 7** | Red-flag classifiers transcend SoNash's specific use case. Useful for any port-decision flow. Audit at port-time for SoNash-specific signal sources in the classifier code. |

### REMOVE (1 bundled family — curated-list-only outputs)

| # | Item | Disposition | Rationale |
|---|------|-------------|-----------|
| 10 | `content-eval.jsonl` + `mined-links.jsonl` (curated-list-only) | **REMOVE** | Tied to repo-analysis's curated-list repo type (Awesome lists, reading collections). JASON-OS port targets are code repositories, not reference lists. Cheap re-add if needed later. |

---

## Batch 3 — Scoring, classifiers, confidence framing (5/5 LOCKED)

| # | Item | Disposition | Rationale |
|---|------|-------------|-----------|
| 1 | Scoring bands (Section 4: Adoption Lens, Creator Lens, Lens Selection Logic, Verdict Tables, Display Format) | **KEEP both lenses + band display, RELABEL verdicts per 9c** | Fix to Batch 2 item 8: bands stay for human outputs (creator-view.md, summary.md). Transformer continues to read raw findings underneath. Two-audience design. Lens labels translate to JASON-OS framing (adoption≈port-decision, creator≈learn-from); auto-selection thresholds may need port-time tuning. |
| 2 | Repo type classification (Section 5b: detection signal matrix, classification thresholds, secondary type, library-vs-application, monorepo-and-registry detection) | **KEEP, drop curated-list specialization** | Universal repo-introspection pattern; improves quality of every downstream judgment. Curated-list-specialized handling drops since its outputs were already cut in Batch 2 item 10. Thresholds may need observation-driven tuning if JASON-OS's port targets skew differently than SoNash's typical analyses. |
| 3 | Code portability rubric (Section 6, 0-15 scale across dependencies / coupling / tests / documentation / license clarity) | **KEEP, audit weights at port-time** | Directly relevant to JASON-OS — porting code IS the primary use case. Score feeds straight into /port's decision flow. Sub-axis weights tuned against SoNash adoption framing; axes themselves universal. Tune in first few real ports. |
| 4 | Temporal fingerprint (Section 7, 5-signal — Deep tier only) | **KEEP as-is** | 12-month history walk surfacing repo trajectory. Tells you whether a target is worth investing porting effort in. Deep-tier-gated means cheap when not used. Window is configurable. |
| 5 | Normalization and comparison (Section 12) | **KEEP as-is** | Pure utility helpers (string normalization, score comparison, display formatting). No SoNash-specific logic. Lifts cleanly. |

**Item 8 retroactive fix (from Batch 2):** "DROP band scoring" was overcorrected.
Revised: drop bands for transformer-input purposes (transformer reads raw findings,
not bands), KEEP bands for human-readable output files (creator-view.md, summary.md).

---

## Batch 4 — Tagging (6/6 LOCKED)

| # | Item | Disposition | Rationale |
|---|------|-------------|-----------|
| 1 | Tag Suggestion Phase 6c protocol | **KEEP** | Tagging builds queryable index across many analyses. Without it, every analysis is an island. |
| 2 | The 8 tag categories (`domain`, `technology`, `concept`, `technique`, `pattern`, `applicability`, `quality`, `taxonomic`) | **KEEP all 8 unchanged** | General taxonomy; none carry SoNash-specific meaning. Add 9th later via vocabulary growth process if needed. |
| 3 | `.research/tag-vocabulary.json` (vocabulary-first growth model) | **KEEP mechanism, bootstrap empty in JASON-OS** | Prevents tag sprawl. JASON-OS grows its own vocabulary organically; cross-pollination from SoNash via manual single-step add when needed. |
| 4 | Tag destinations (analysis.json.tags + extraction-journal.jsonl rows) | **EDIT — write to analysis.json.tags only** | extraction-journal cut (Batch 1 #5). Ledger-side tagging is a /port concern, not repo-analysis's. Adding tags-to-ledger later is purely additive. |
| 5 | `_shared/` vs `shared/` directory layout | **CONSOLIDATE into single `.claude/skills/shared/` in JASON-OS** | SoNash has both directories doing the same job (accidental fork). JASON-OS greenfield — no reason to inherit the split. |
| 6 | Auto-approve-forbidden rule (CONVENTIONS §14.6) | **KEEP** | Tags are how you find things months later; auto-approval erodes index quality. Quick depth exempt. |

---

## Batch 5 — Schema and validation (7/7 LOCKED)

| # | Item | Disposition | Rationale |
|---|------|-------------|-----------|
| 1 | `analysis-schema.js` Zod schema | **KEEP, schema EDIT** (already covered Batch 2 #1) | Trim TDMS metadata + last_synthesized_at + adoption_verdict + source_tier (last two retained but relabeled per 9c/9d). Preserve dimension data, findings counts, repo-type, discovery metadata. |
| 2 | State file schema (Section 8 — `repo-analysis.<repo-slug>.state.json`, 16 fields) | **KEEP as-is** | Universal shape. Repo-analysis state stays machine-local (does NOT extend the .gitignore bridge — analyses anchor to specific target_commit per machine; output artifacts in .research/analysis/ are git-tracked anyway). |
| 3 | Schema versioning + skillVersion + migration baggage | **Restart at v1.0; strip SoNash migration code; keep migration-handling pattern** | JASON-OS has no v0 state to migrate from. Version History line: "v1.0 \| 2026-04-25 \| Initial port from SoNash repo-analysis v5.0". |
| 4 | CONVENTIONS §12 schema contract + cross-skill preserve-on-rewrite list | **KEEP pattern, REPLACE list** | List becomes JASON-OS-specific: `last_extracted_at` (/port), `last_ported_to` (/port), `last_sync_back_at` (/sync-back), `last_synced_at` (/context-sync). Per main-plan Q42. |
| 5 | Validation timing (write-time + self-audit re-check) | **KEEP both gates** | Two-gate safety; minimal cost. |
| 6 | Zod vs JSON Schema reconciliation | **Keep Zod for analysis.json; JSON Schema for the 4 new data structures (ledger/drift/profile/cache)** | Different artifacts, different lifecycles. Two validators in package.json (~200 KB combined) — minor. Reverses neither Q17 nor SoNash's Zod choice. |
| 7 | Research Index (Section 12b — `.research/research-index.jsonl`, 7 fields per record) | **KEEP** | Cross-analysis discoverability layer. /deep-plan v3.4 in JASON-OS extends naturally to read it. score_summary + absence_patterns fields embed scoring/patterns we already KEPT. |

---

## Batch 6 — Process pipeline (8/8 LOCKED)

| # | Item | Disposition | Rationale |
|---|------|-------------|-----------|
| 1 | Phase 1 — Clone + Repomix mechanics | **KEEP, port-time check repomix dep** | Universal pipeline; matches main-plan Q36 blobless+depth=1 lock. Add `repomix` as JASON-OS dev dep. Pin to known-good version. |
| 2 | Phase 2 — Dimension Wave inline-vs-agents threshold (20-file mark; 4-agent concurrency) | **KEEP both as-is** | Production-tuned in SoNash. Observation-driven retune cheap if JASON-OS targets skew differently. |
| 3 | Phase 2b — Deep Read JASON-OS-specific artifact enumeration | **KEEP all SoNash patterns; ADD JASON-OS patterns** | Add `.planning/<topic>/`, `.claude/skills/<skill>/`, `.research/<topic>/`, `MEMORY.md`, `BOOTSTRAP_DEFERRED.md`. Cost negligible — extra glob patterns no-op when irrelevant. |
| 4 | Self-Audit phase trim | **KEEP, drop extraction-journal grep + retune phase ordering** | Phase ordering check drops Content Eval (cut Batch 2 #10). Regression check no-ops gracefully on empty prior state. |
| 5 | Routing menu trim (8 options) | **Drop options 2 (TDMS) + 8 (cross-repo synthesis); KEEP other 6; ADD "Promote to /port" stub option** | TDMS + /synthesize cut in Batch 1. /port stub errors helpfully ("/port not yet built — analysis saved to .research/analysis/<slug>/, run /port manually"). Avoids menu renumbering when /port lands. |
| 6 | Prior Feedback Replay (CONVENTIONS §18) + Retro (CONVENTIONS §10) | **KEEP both as-is** | State-aware UX prevents drift. Cheap (one prompt + one state field each). |
| 7 | Invocation tracking | **REPLACE SoNash mechanic with simpler JSONL append at `.claude/state/invocations.jsonl`** | SoNash's `scripts/reviews/write-invocation.ts` grew sophisticated for SoNash analytics consumers JASON-OS doesn't have. JSONL is the natural append-path any future analytics tool can consume. |
| 8 | Per-phase artifact gate (verify output exists+non-empty after every phase) | **KEEP as-is — implicit** | Universal infrastructure. No real decision. |

---

## Batch 7 — Guard rails (8/8 LOCKED)

| # | Item | Disposition | Rationale |
|---|------|-------------|-----------|
| 1 | Rate Limits (auth always, gh api /rate_limit before each batch with 200-floor abort, ETag caching, 429/403 retry-after, GitHub App 1hr token) | **KEEP as-is** | Universal GitHub-API hygiene. 200-floor matches main-plan Q41. |
| 2 | Large Repository Safety (10K-commit threshold, HTTP 202 retry, Trees API truncation, Linguist 100K-file fallback to scc) | **KEEP as-is** | Production-tested fallbacks. Add `scc` install at port-time if not present. |
| 3 | Monorepo Handling (multiple-indicator detection: Turborepo/Nx/pnpm/npm/Yarn/Bun/Rush/Bazel/Cargo) | **KEEP all signals** | Comprehensive table; no JASON-OS-specific additions. New monorepo flavors emerge → table-additions trivial. |
| 4 | Fork Detection (fetch parent/source, flag prominently, analyze the fork — don't redirect) | **KEEP as-is** | Sound framing. One extra API call per analysis with high info value. |
| 5 | Home Repo Guard | **(cross-ref Batch 1 #3 — already EDIT)** | No new decision. Mechanical port-time application of the EDIT lands here. |
| 6 | Error Handling (5xx/timeout retry-once with backoff, degrade gracefully, OpenSSF 404 = not indexed continue, deps.dev failure = skip CVE) | **KEEP as-is** | OpenSSF Scorecard already in JASON-OS security pipeline; deps.dev universally useful. |
| 7 | Clone Safety (`/tmp/repo-analysis-<slug>/`, GIT_LFS_SKIP_SMUDGE=1, auto-cleanup, blobless default) | **KEEP, port-time check tmp portability** | Use `os.tmpdir()` not hard-coded `/tmp/` for Windows compatibility. |
| 8 | Framework Detection Heuristics (10 frameworks: Next.js, React/CRA, Vite React, Angular, Vue, Django, FastAPI, Express, Go, Rust) | **KEEP all 10, ADD "Claude Code skill collection"** | Primary signal for new row: presence of `.claude/skills/` directory with at least one `SKILL.md` inside, OR `.claude/agents/` with at least one `*.md`. Distinguishes JASON-OS-style targets from generic Node projects. |

---

## Batch 8 — `scripts/cas/` scripts (12/12 LOCKED)

| # | Script | Disposition | Rationale |
|---|--------|-------------|-----------|
| 1 | `backfill-candidates.js` | **REMOVE** | Backfills extraction-journal data into analysis.json.candidates. Source cut (Batch 1 #5). |
| 2 | `backfill-tags.js` | **REMOVE** | Copies tags into extraction-journal entries. Destination cut. |
| 3 | `generate-extractions-md.js` | **REMOVE** | Generates EXTRACTIONS.md from extraction-journal. Already implicitly cut. |
| 4 | `promote-firecrawl-to-journal.js` | **REMOVE** | One-shot Session #273 fix promoting firecrawl candidates to extraction-journal. Two-cut (firecrawl tied to website-analysis we don't have; extraction-journal cut). |
| 5 | `retag.js` | **REMOVE** | Retags extraction-journal under tag-vocabulary. Tag-vocabulary survives but at analysis.json layer only — porting with-edits = rewrite. Write fresh `retag-analysis.js` later if needed. |
| 6 | `migrate-schemas.js` | **REMOVE** | v2→v3 migration for SoNash. JASON-OS v1.0 fresh start — no migrations needed. |
| 7 | `migrate-v3.js` | **REMOVE** | Same — v3.0 migration completion fixes. Dead in v1.0 fresh start. |
| 8 | `fix-depth-mislabel.js` | **REMOVE** | One-shot SoNash Session #272/273 mislabel fix. Pure historical. |
| 9 | `rebuild-index.js` | **DEFER for v1** | SQLite + FTS5 retrieval rebuild. Overkill at JASON-OS's expected corpus size (5-20 analyses first year). Revisit at >50 analyses. |
| 10 | `recall.js` | **DEFER for v1** | Query CLI for the SQLite index. Paired with #9. Manual JSONL grep against research-index.jsonl is sufficient near-term. |
| 11 | `update-index.js` | **DEFER for v1** | Incremental SQLite update post-analysis. Paired with #9 + #10. |
| 12 | `self-audit.js` | **KEEP with port-time adaptation** | Universal output-completeness validator. Drop extraction-gaps check; review CONVENTIONS section number references after port; otherwise survives. |

---

## Walkthrough Complete

**Final tally:**
- Batch 1: 5 LOCKED (4 REMOVE, 1 EDIT)
- Batch 2: 10 LOCKED (5 KEEP-as-is, 3 EDIT, 1 KEEP-bundle revised from REMOVE per user pushback, 1 REMOVE-bundle)
- Batch 3: 5 LOCKED (5 KEEP — with item 8 retroactive fix from Batch 2)
- Batch 4: 6 LOCKED (5 KEEP, 1 EDIT)
- Batch 5: 7 LOCKED (4 KEEP, 2 EDIT, 1 STRUCTURAL — Zod kept alongside JSON Schema)
- Batch 6: 8 LOCKED (5 KEEP, 2 EDIT, 1 REPLACE)
- Batch 7: 8 LOCKED (7 KEEP, 1 KEEP-with-addition)
- Batch 8: 12 LOCKED (8 REMOVE, 3 DEFER, 1 KEEP-with-adaptation)

**Total walkthrough decisions: 61 LOCKED.**

## Next Step — The Actual Port Operation

The walkthrough is the *blueprint*. The *execution* is a separate piece of
work: a session-spanning file copy + mechanical edit pass that applies the
disposition table above. Estimated steps:

1. Create `.claude/skills/repo-analysis/` and `.claude/skills/shared/` in JASON-OS.
2. Copy SoNash's repo-analysis files (SKILL.md, REFERENCE.md, ARCHIVE.md) and the
   relevant `shared/` resources (CONVENTIONS.md, TAG_SUGGESTION.md, etc.) into
   place.
3. Copy SoNash's `scripts/lib/analysis-schema.js` and `scripts/cas/self-audit.js`
   to JASON-OS equivalents (`scripts/lib/`, `scripts/cas/`).
4. Apply the disposition table mechanically — REMOVEs strip out content; EDITs
   reshape per the rationale; KEEPs stay verbatim. Each batch becomes a
   commit boundary.
5. Add new content called out in EDITs (Claude Code skill detection signal in
   framework table, JASON-OS-specific Deep Read patterns, /port stub routing
   option, JSONL invocation tracking, etc.).
6. Update CLAUDE.md / package.json with new deps (`zod`, `repomix`, possibly `scc`).
7. Smoke-test the ported skill against a known-shape target (probably
   JASON-OS itself, as a sanity check — even though the home-repo guard will
   refuse, the validation chain runs).

After the port lands, **main /deep-plan Batch 4 re-emerges as the smaller
transformer-design batch** (was: profile-discovery + /extract; now:
transformer-over-repo-analysis + /extract).

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
- Batch 2: 10 LOCKED (9d resolved 2026-04-25)
- Batch 3: 5 LOCKED
- Batch 4: 6 LOCKED
- Batch 5: 7 LOCKED
- Batch 6: 8 LOCKED
- Batch 7: 8 LOCKED
- Batch 8: 12 LOCKED
- **Total walkthrough decisions: 61 LOCKED**

These are independent of and additional to the main /deep-plan decision count
(currently 42 from Batches 1-3 + 2c).
