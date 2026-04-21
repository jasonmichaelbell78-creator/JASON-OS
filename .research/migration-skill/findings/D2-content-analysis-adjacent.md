# D2 — CAS-adjacent skill integration surface for /migration

**Agent:** Phase 1 D-agent D2-content-analysis-adjacent
**Scope sub-question:** SQ-D2-content-analysis-adjacent
**Depth:** L1 (shallow on internals, deep on integration mechanics)
**Date:** 2026-04-21
**Context:** BRAINSTORM.md §5 Q2, §3 D19 (CAS-coupling reshape during CAS's own port), D27 (cross-skill integration inventory)

---

## Q6 boundary note (explicit)

**This finding file stays at the OUTSIDE / invocation-surface view.** Q6 deep-dives into CAS port scope — the surgical-rewrite list, home-context coupling resolution, configurable target-repo parameters. I do NOT duplicate that work. Where internals are unavoidable (because they shape the call contract), I note only what /migration must know to CALL these skills, not how to port them.

Put differently: **Q6 is "how do we port CAS into JASON-OS." Q2 (this file) is "once CAS is there, how does /migration USE it; and what does /migration do while CAS ISN'T there yet."**

---

## Summary

The 7 CAS-adjacent skills fall into three integration roles for /migration:

1. **Analyzers (4):** `repo-analysis`, `document-analysis`, `media-analysis`, `analyze` (router). Give /migration the Discovery-phase knowledge-layer — *what is this artifact, what does it know, how does it compare to destination idioms?* Feeds verdict assignment (copy-as-is / sanitize / reshape / rewrite per D23).
2. **Query (1):** `recall`. SQLite-backed retrieval over prior CAS extractions. Gives /migration read-through access to historical analyses so it can skip re-analyzing a target that was already analyzed.
3. **Synthesizers (2):** `synthesize` (active), `repo-synthesis` (DEPRECATED stub, consolidated into `/synthesize`). Cross-source interpretation across 3+ analyzed sources — relevant for /migration's concept-level unit type (reshape verdict, idiom patterns across a multi-artifact concept).

**All 7 skills are SoNash-resident and home-context-coupled.** Per D19 and confirmed by reading `creator-view` requirements ("Home context MUST be loaded — SESSION_CONTEXT.md, ROADMAP.md, CLAUDE.md, `.claude/skills/` listing, MEMORY.md"), every handler bakes in SoNash assumptions. CAS must be ported (Q6 job) before /migration can invoke these against JASON-OS as home-repo. **`repo-synthesis` is a deprecated redirect stub — /migration should never integrate against it; target `/synthesize` instead.**

**Key finding for /migration shape:** `/recall` is the lowest-cost integration point (query-only, pre-existing DB) — it's the natural "have we seen this before?" call at Phase 2 (Discovery). `/analyze` router is the one-shot "what is this?" call for unknown migration targets. `/synthesize` is the heavy call for concept-level migration where destination-idiom research (verdict=reshape/rewrite, D25) needs multi-source pattern extraction.

---

## Integration Table

| Skill | Purpose (1-liner) | /migration use | Invocation shape | Pre-port dependency? | Fallback pre-port |
| --- | --- | --- | --- | --- | --- |
| **`/analyze`** (router v2.0) | Type-detect + dispatch to handler + index | Phase 2 Discovery: when target is URL/file of unknown type, get a full CAS write-up so Phase 3 Research has structured input | `Skill("analyze", args="<target> --depth=standard")` — emits payload `{target, auto_detected_type, flags}` to handler; router writes `.research/analysis/<slug>/` + SQLite upsert | YES — router + 4 handlers + index scripts + SQLite + home-context loader all SoNash-coupled | Skip CAS dispatch; fall back to Grep + Read against the target directly inline in /migration Phase 2. Lose: dual-lens (Creator/Engineer), value-map, tag suggestion, home-comparison. Keep: raw "what files exist, what do they contain" |
| **`/document-analysis`** (v2.0) | Dual-lens analysis of PDF/gist/arxiv/article/markdown | Phase 2 when migration unit is a single doc (e.g., a CLAUDE.md snippet being ported, a plan doc) — gives Creator View (what doc knows) + knowledge candidates. Also relevant for Phase 3 Research when reshape verdict needs destination-idiom analysis of a destination doc | `Skill("document-analysis", args="<path> --depth=standard")` OR via `/analyze` router passing `auto_detected_type: "document"`. Output at `.research/analysis/<slug>/{analysis.json, creator-view.md, value-map.json, ...}` | YES — home-context load (SESSION_CONTEXT.md/ROADMAP.md/CLAUDE.md/skills-listing/MEMORY.md), CONVENTIONS.md shared file, schema `scripts/lib/analysis-schema.js`, invocation-tracking writer | Skip; use Read tool directly + inline prose summary in /migration Phase 2 findings. Lose: value-map, content-eval, coverage audit, tag suggestion, reading chain |
| **`/media-analysis`** (v2.0) | Transcription-first analysis of YouTube/TikTok/podcast/audio/video | Rarely relevant to /migration (migration targets are usually code/docs/workflows, not videos). Possibly: a migration target that includes demo-video assets as referenced resources | Same pattern as document-analysis — `Skill("media-analysis", args="<url-or-path>")`. Extra input: `--transcript=<path>` for pre-existing transcripts. Whisper is opt-in; captions API primary | YES — same home-context + schema + CONVENTIONS coupling, plus Python bootstrap for youtube-transcript-api, optional Whisper | Skip entirely for v1 of /migration. Media migration is edge-case; defer until CAS ported |
| **`/recall`** (v1.2) | Query SQLite-backed CAS index (FTS5, tags, type, source filters) | Phase 0 Context / Phase 2 Discovery: "has this target been analyzed before?" If yes, skip redundant `/analyze` call. Also: Phase 3 Research — query for prior-art on destination idioms (`/recall <target-concept> --type=repo`) | `Skill("recall", args="<terms> --type=repo --tag=<t> --sort=recent")` — produces human-readable result list + source/stats modes. Script delegate: `node scripts/cas/recall.js` | YES — depends on ported SQLite DB (`.research/content-analysis.db`), rebuild-index.js, retag.js, vocabulary.json. But the data layer is pure (no home-context baked into query-time); it's the *index* that's coupled to what was analyzed where | Skip; degrade to Grep over `.research/analysis/` directly (text-only, no tag filters, no FTS5). Or defer all prior-art lookup until CAS ported |
| **`/repo-analysis`** (v5.0) | Dual-lens analysis of external GitHub repo (Creator + Engineer views) | Phase 2 when migration unit is a whole external repo being ported-from, OR Phase 3 Research when reshape verdict needs destination-repo structural understanding. Also: bootstrap moment — /migration's first self-dogfood target per BRAINSTORM §6 might BE a repo-analysis of SoNash from JASON-OS | `Skill("repo-analysis", args="<github-url> --depth=standard")`. Heavy: clones via git blobless, runs repomix, dimension-wave agents, History Wave for Deep. Produces repomix-output.txt, analysis.json, creator-view.md, value-map.json, mined-links.jsonl, findings.jsonl | YES — heaviest coupling: git+gh+repomix toolchain, subagents, home-repo guard (hardcoded `jasonmichaelbell78-creator/sonash-v0`), rate-limit checks, schema. Home-repo guard is the single most SoNash-specific line — **this exact line is Q6's surgical-rewrite target** | Skip; use raw `gh api` + `git clone` + Read/Grep inline in /migration. Lose: dimension-wave scoring, dual-lens, History Wave, value-map. Very heavy loss — /migration on a repo unit-type will be meaningfully degraded pre-port |
| **`/synthesize`** (v2.0) | Cross-source synthesis across 3+ analyzed sources (4 paradigms, 8 sections) | Phase 3 Research for CONCEPT-level migration (D10: concept tracks need most research depth). When reshape/rewrite verdict (D25) requires understanding patterns across many destination artifacts — `/synthesize --type=repo --paradigm=meta-pattern` pulls idiom consensus from prior repo analyses | `Skill("synthesize", args="--type=<t> --paradigm=<thematic\|narrative\|matrix\|meta-pattern> --focus=<themes\|gaps\|...>")`. Heavy phased run (9 phases including convergence loops); 5-30min wall-clock per MENU warm-up | YES — needs 3+ analyzed sources to run at all (PRE-FLIGHT blocks below 3). Read-only on handler artifacts but heavy home-context coupling in synthesis output (Mental Model Evolution section, Fit Portfolio weighting). Also coupled to `/recall` index | Skip entirely pre-port. Synthesis requires a corpus of ported analyses to be meaningful — it's last-domino in the CAS port chain |
| **`/repo-synthesis`** (v1.3-D, DEPRECATED) | Redirect stub → `/synthesize` | NONE — never invoke. Deprecated 2026-04-09, slated for removal after one-session overlap | N/A — directory exists only to surface migration note | N/A — don't port the stub; port `/synthesize` and let this rot | Ignore. If encountered, redirect is already built-in to the stub's SKILL.md |

---

## Invocation-shape distribution

Five distinct shapes across the 7 skills:

1. **Router-dispatch** (1): `/analyze` — hands off to one of 4 handlers via Skill tool, then does post-handler index work. This is the ONE-CALL-GETS-EVERYTHING shape for an unknown target.
2. **Direct-handler-call** (3): `/repo-analysis`, `/document-analysis`, `/media-analysis` — invoked directly OR via router; both paths produce identical artifacts. /migration should prefer direct calls when it already knows the type (it usually will, since /migration's unit-type parameter establishes that).
3. **Query-script-wrapper** (1): `/recall` — thin wrapper over `node scripts/cas/recall.js`, transforms JSON→prose. Cheapest and most reusable shape.
4. **Phased-pipeline-with-convergence** (1): `/synthesize` — heaviest shape, 9 phases incl. interactive MENU gate + 2 convergence loops + user gates. /migration calling this is effectively spawning another full workflow.
5. **Deprecated-stub** (1): `/repo-synthesis` — not a real integration shape.

For /migration this maps to:
- **Cheap + universal:** `/recall` (Phase 0 / Phase 2 prior-art check)
- **Medium + flexible:** `/analyze` router (Phase 2 unknown-target)
- **Medium + typed:** direct handlers (Phase 2 known-type)
- **Heavy + conditional:** `/synthesize` (Phase 3 concept-level reshape research only)

---

## Pre-port dependency count

**All 6 of 6 live CAS skills are pre-port-dependent for /migration.** (7 total minus the deprecated stub = 6 live.)

None of the 6 work in JASON-OS *today* because:
- Every handler loads home context from SoNash paths (SESSION_CONTEXT.md / ROADMAP.md / CLAUDE.md / MEMORY.md at SoNash roots, not JASON-OS roots)
- Every handler writes to `.research/analysis/<slug>/` under SoNash's convention
- `scripts/cas/*.js` (update-index, rebuild-index, generate-extractions-md, retag) live under SoNash
- `scripts/lib/analysis-schema.js` (Zod schema) lives under SoNash
- `/repo-analysis` has a hardcoded home-repo guard: `jasonmichaelbell78-creator/sonash-v0` (the single most-concrete home-context assumption in the stack)
- `/synthesize` requires a PRE-EXISTING corpus of analyzed sources — can't synthesize a JASON-OS that hasn't been populated yet
- `/recall` queries `.research/content-analysis.db` — DB lives at SoNash path; empty in JASON-OS until CAS re-runs analyses there

**Implication for D19:** CAS port is /migration's prerequisite OR first self-dogfood job. The decision depends on research question 6 (Q6) verdict on whether CAS port is small enough to be /migration v1's first real migration OR big enough it must precede /migration design entirely. **This agent's recommendation: the 6 CAS-live skills are NOT hard-prerequisites for /migration DESIGN (they don't shape the 7-phase arc), but they ARE prerequisites for /migration EXECUTION beyond trivial file-copy unit-types.** Matches BRAINSTORM §6 Dependencies table ("For design / research / plan: None").

---

## Top integration points (ranked by /migration value)

1. **`/recall` at Phase 0 / Phase 2 — prior-art scan.** Lowest integration cost (query only, JSON output easy to parse). Per CLAUDE.md PRE-TASK rule, this is already canonical: "scan `.research/EXTRACTIONS.md` for prior art, query `extraction-journal.jsonl` to filter" before building anything. /migration Phase 2 Discovery should START with `/recall <target-slug-or-keyword>` to determine if the target has been analyzed. If yes, skip `/analyze`; if no, proceed to `/analyze`.

2. **`/analyze` router at Phase 2 — unknown-target full write-up.** Second-lowest integration cost because router abstracts the 4 handler call shapes. /migration calls `/analyze <target>` once, gets a slug + artifact set, and moves on. Router handles type detection, handoff contract, and post-handler index work. **One key decision for /migration design:** does /migration await the full `/analyze` pipeline (5-30min) or dispatch it async and proceed on "while we wait" basis? Per D8 (nothing silent), probably await + show progress.

3. **`/repo-analysis` direct at Phase 2/3 — repo unit-type Research.** When migration unit-type is "whole repo" (D1 workflow/concept level) and the external endpoint is GitHub-hosted, direct `/repo-analysis` call skips router detection. Heavy but the mined-links.jsonl + repomix-output.txt + value-map.json artifacts directly feed /migration Phase 4 Plan writing.

4. **`/synthesize` at Phase 3 for concept-level reshape verdict.** When D25 mandates destination-idiom research (reshape/rewrite verdicts), `/synthesize --type=<t> --paradigm=meta-pattern` finds idiom consensus across prior analyses. Conditional invocation — only triggered when corpus has 3+ sources AND unit-type is concept.

5. **`/document-analysis` direct at Phase 2 — single-doc unit-type.** When migrating one doc (e.g., a plan or brainstorm) into the other endpoint's conventions, document-analysis's Creator View section §3 ("Where Your Approach Differs") directly names the reshape-candidate deltas. This is nearly a pre-built verdict-assignment heuristic.

6. **`/media-analysis` — edge case.** Include only if /migration unit-type expands to include video assets. Likely defer.

7. **`/repo-synthesis` — never.** Deprecated.

---

## Invocation contract /migration should adopt

Based on the handoff contract in `/analyze` SKILL.md v2.0 (which all 4 handlers acknowledge), a uniform shape for /migration→CAS calls:

```
# From /migration Phase 2/3:
Skill("<cas-skill>", args="<target> [--depth=standard] [--type=<t>]")

# Expected return:
# - Artifacts at .research/analysis/<slug>/
# - SQLite upsert
# - extraction-journal append
# /migration reads .research/analysis/<slug>/analysis.json to resume
```

/migration's wrapper should handle:
- **Compaction safety:** per `/analyze` Guard Rails, if CAS loses control mid-dispatch, /migration must know to run `node scripts/cas/update-index.js --slug=<slug>` manually before proceeding.
- **Slug generation:** /migration must not assume it knows the slug; read from handler output directory.
- **Retry ceiling (2):** matches /migration's own state-machine gate behavior per D8.
- **Idempotency:** re-invoking on same target overwrites `analysis.json`; handler decides re-fetch vs cache. /migration should decide up-front whether to accept cached analysis or force re-run.

---

## Skip-until-ported fallback decision matrix

| Migration unit-type | If CAS ported | If CAS NOT ported (v1-MVP fallback) |
| --- | --- | --- |
| **File** (single file port) | `/recall` + optional `/document-analysis` | Read tool inline; emit verdict-assignment from regex + user confirmation per D8 |
| **Workflow** (multi-file workflow) | `/recall` + direct `/repo-analysis --depth=standard` on destination subtree | Grep + Read inline; manual idiom-spotting in /migration Phase 3 prose |
| **Concept** (cross-file concept) | `/recall` + `/synthesize --type=<t> --paradigm=meta-pattern` | **Cannot meaningfully execute concept-level reshape/rewrite without CAS.** Suggest: either (a) block concept unit-type in v1-MVP, or (b) degrade concept to workflow-level and accept reduced-depth verdict |
| **Unknown (proactive scan)** | `/recall --target=sources` + `/analyze <target>` | Grep-based proactive scan only; no structured knowledge layer |

**Recommendation:** /migration v1-MVP supports file + workflow unit-types with Grep/Read fallback; concept unit-type is **blocked-on-prereq** verdict (per D23) until CAS is ported. That turns the CAS port into /migration's first real job (D19 option A), which is clean self-dogfood + unblocks concept unit-type in v1.1.

---

## Sources

- `<SONASH_ROOT>\.claude\skills\analyze\SKILL.md` (v2.0, 2026-04-15)
- `<SONASH_ROOT>\.claude\skills\document-analysis\SKILL.md` (v2.0, 2026-04-15)
- `<SONASH_ROOT>\.claude\skills\media-analysis\SKILL.md` (v2.0, 2026-04-15)
- `<SONASH_ROOT>\.claude\skills\recall\SKILL.md` (v1.2, 2026-04-17)
- `<SONASH_ROOT>\.claude\skills\repo-analysis\SKILL.md` (v5.0, 2026-04-15)
- `<SONASH_ROOT>\.claude\skills\synthesize\SKILL.md` (v2.0, 2026-04-15)
- `<SONASH_ROOT>\.claude\skills\repo-synthesis\SKILL.md` (v1.3-D, DEPRECATED 2026-04-09)
- `<JASON_OS_ROOT>\.research\migration-skill\BRAINSTORM.md` §5 Q2, §3 D19/D27, §6 Dependencies
- `<SONASH_ROOT>\CLAUDE.md` v6.0 §7 PRE-TASK (prior-art rule)
