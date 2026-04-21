# D2-content-other — SoNash "other content" cluster vs `/migration`

**Agent:** Phase 1 D-agent D2-content-other
**Scope:** SQ-D2-content-other — inventory 7 content/web/market/data-focused
SoNash skills, assess their `/migration` integration likelihood (expected LOW),
verdict per D23.
**Depth:** L1 (read each SKILL.md, assess integration surface).
**Sources:** SoNash `.claude/skills/{content-research-writer, website-analysis,
website-synthesis, excel-analysis, market-research-reports,
developer-growth-analysis, data-effectiveness-audit}/SKILL.md`.
**BRAINSTORM ref:** §5 Q2 (cross-skill integration inventory), §3 D27
(research-scope expansion), D19 (foreign-repo understanding), D23 (verdict
legend), D24 (Phase 5 content).

---

## Summary

All 7 skills confirm the "LOW integration likelihood" hypothesis. They are
**domain-specific content / analysis / reporting tools** whose subject matter
(external websites, Excel workbooks, market reports, chat-history growth
analysis, data-system effectiveness scoring, article writing) has **no
structural overlap** with `/migration`'s job (moving files / workflows /
concepts between two locally-cloned repos with sanitize + reshape + rewrite).

No surprising integration points. One edge case worth noting:
`/data-effectiveness-audit` could be a **post-port audit consumer** if
`/migration` ports data-producing systems into JASON-OS (the audit would then
pick up the ported systems on its next run) — but that is consumer-side
ambient coupling, not a `/migration` call-out. Handled by existing SoNash
ecosystem invocation, no bespoke `/migration` integration needed.

**`website-synthesis` is DEPRECATED** (redirect stub; consolidated into
`/synthesize` at Session #271, T29 Wave 3). Per D23, verdict = **skip** by
definition; do not port the stub, port the live successor (`/synthesize`) only
if D2-content-cas / other D-agents recommend it.

---

## Skill integration table

| # | Skill | Does-what (one line) | Coupling to `/migration` | Evidence (file:line) | `/migration` call? | Phase | Verdict (D23) |
|---|-------|----------------------|--------------------------|----------------------|---------------------|-------|---------------|
| 1 | content-research-writer | Collaborative long-form writing partner (outline, cite, hook, polish) | NONE — user-content domain, no codebase / repo awareness | SKILL.md:1-8 frontmatter; SKILL.md:16-35 scope = blog/newsletter/tutorial | No | — | **skip** |
| 2 | website-analysis | Dual-lens (Creator+Engineer) 3-tier (Quick/Standard/Deep) arbitrary-URL analysis with compliance gates, superpowers-chrome extraction | NONE — consumes external URLs, not repo files; outputs to `.research/analysis/<slug>/` not codebase | SKILL.md:23-28 (web content as knowledge artifact); SKILL.md:78-82 ("NOT for OUR webapp"); SKILL.md:101-116 artifact table (all under `.research/analysis/`) | No | — | **skip** (port-target candidate — separate question; not a `/migration` caller) |
| 3 | website-synthesis | DEPRECATED stub (redirect to `/synthesize`) | N/A — deprecated | SKILL.md:1-7 frontmatter = "DEPRECATED — use /synthesize instead"; SKILL.md:44-48 "redirect expires next session"; SKILL.md:63 version `1.1-D` | No | — | **skip** (deprecated; do not port the stub — the successor `/synthesize` may or may not be in scope for other D-agents) |
| 4 | excel-analysis | pandas/openpyxl recipes for .xlsx analysis + pivot / chart / cleaning | NONE — user spreadsheet domain; pure Python code recipe reference | SKILL.md:1-9 frontmatter = .xlsx files; SKILL.md:22-36 recipes; no `.research/` or repo-state artifacts | No | — | **skip** |
| 5 | market-research-reports | Generate 50+ page LaTeX market research reports (Porter / PESTLE / SWOT / TAM-SAM-SOM) | NONE — LaTeX PDF deliverables, depends on `research-lookup`, `scientific-schematics`, `generate-image`, `peer-review`, `citation-management` skills — none of which are migration-adjacent | SKILL.md:291-300 Integration section (lists only domain siblings); SKILL.md:218-230 output = `writing_outputs/YYYYMMDD_HHMMSS_market_report_[topic]/` (isolated dir tree) | No | — | **skip** |
| 6 | developer-growth-analysis | Analyze `~/.claude/history.jsonl` 24-48h window, send coaching report via Rube MCP to Slack DM | NONE — consumer of transient chat history + external Rube/Slack MCPs; no repo-state coupling | SKILL.md:93-105 reads `~/.claude/history.jsonl`; SKILL.md:240-253 Slack delivery via Rube MCP | No | — | **skip** |
| 7 | data-effectiveness-audit | Lifecycle-score all project data systems (Capture / Storage / Recall / Action 0-3 each, 0-12 total) and route gaps | LOW / AMBIENT — would pick up any newly-ported data systems on its next SoNash run, but does not call `/migration` and `/migration` does not call it | SKILL.md:24-38 Critical Rules (reads `.claude/state/lifecycle-scores.jsonl`); SKILL.md:57-67 Routing Guide (no `/migration`); SKILL.md:332-336 Integration (health-check, alerts, session-end — not migration) | No (ambient consumer only) | — | **skip** (integration is incidental, not directed) |

---

## Coupling distribution

| Coupling | Count | Skills |
|----------|-------|--------|
| **NONE** | 5 | content-research-writer, website-analysis, excel-analysis, market-research-reports, developer-growth-analysis |
| **LOW / ambient** | 1 | data-effectiveness-audit (incidental post-port consumer if a ported system lands inside its scoring scope) |
| **N/A (deprecated)** | 1 | website-synthesis |
| **MEDIUM / HIGH** | 0 | — |

**Verdict distribution (D23):** 7/7 = **skip**.

**Invocation shapes:** None required. `/migration` does not need to wire any of
these 7 skills as callees or ancillary skills.

---

## Surprises / flagged anomalies

**None of substance.** The L1 pass confirms the pre-hypothesis: this cluster
is content / web / tabular / reporting / coaching / audit work that shares no
structural axis with repo-to-repo file movement or transformation.

Two small things worth noting for downstream agents (not surprises, context):

1. **`website-synthesis` deprecation (SKILL.md:1-7, 44-48, 63).** If any other
   D-agent was going to treat this as a live skill and evaluate it for port,
   they should instead evaluate `/synthesize` (the consolidated successor).
   Update the D27 cross-skill inventory accordingly: `/website-synthesis` =
   retired stub, do not carry forward.

2. **`data-effectiveness-audit` reads state files (SKILL.md:180,
   `.claude/state/lifecycle-scores.jsonl`).** Not a `/migration` coupling, but
   it does illustrate the pattern `/migration` will eventually face: skills
   that read state files get implicitly affected by anything `/migration`
   moves into or out of the state dir. Consider a note in the `/migration`
   plan: when porting state-file-dependent systems, surface the consumer list
   so the operator knows which audits / alerts / session-end hooks may see
   changed scores on their next run. This is a **ripple** concern (Phase 2
   Discovery in the 7-phase arc), not a callee relationship.

No skill in this cluster needs first-class wiring in `/migration`. No re-entry
to brainstorm is warranted based on this cluster. The D27 integration
inventory can confidently mark all 7 as **non-participants**.

---

## Recommendations for `/migration` design

- **Do not wire** any of these 7 skills into `/migration` phases. None belongs
  in Phase 0 context load, Phase 3 research, Phase 5 execute dispatch, or
  Phase 6 prove.
- **Document** `/data-effectiveness-audit` as an **ambient post-port
  consumer** in the `/migration` plan's "after the port lands" section — only
  so operators know their next run of it may see new rows. This is
  operator-facing documentation, not a code-level integration.
- **Exclude** `website-synthesis` from any JASON-OS port target list
  (deprecated upstream). If the consolidated `/synthesize` is a port target,
  that is a separate D-agent's call (likely D2-content-cas given CAS
  adjacency).
- **Port-target status** for the remaining 5 (content-research-writer,
  website-analysis, excel-analysis, market-research-reports,
  developer-growth-analysis) is **out of scope for this question** —
  SQ-D2-content-other asks about integration likelihood of `/migration`
  *calling* them, not whether `/migration` should port them. They may or may
  not be JASON-OS port candidates on their own merits (all are largely
  self-contained domain skills with low SoNash-specific coupling — if ported,
  probably `copy-as-is` or `sanitize` verdicts, not `reshape` / `rewrite`).

---

## Sources

1. `<SONASH_ROOT>\.claude\skills\content-research-writer\SKILL.md` (lines 1-147; frontmatter:1-8, scope:16-35, workflow:36-115, pro tips:117-133, related use cases:136-137)
2. `<SONASH_ROOT>\.claude\skills\website-analysis\SKILL.md` (lines 1-393; frontmatter:1-8, routing guide:42-50, critical rules:52-68, output artifacts:103-116, integration contract:373-382)
3. `<SONASH_ROOT>\.claude\skills\website-synthesis\SKILL.md` (lines 1-63; deprecation frontmatter:1-7, consolidation note:14-24, migration path:26-36, removal:44-48, version history:61-63)
4. `<SONASH_ROOT>\.claude\skills\excel-analysis\SKILL.md` (lines 1-269; frontmatter:1-9, quick-start:22-36, workflows:38-207, available packages:254-261)
5. `<SONASH_ROOT>\.claude\skills\market-research-reports\SKILL.md` (lines 1-373; frontmatter:1-11, features:26-49, workflow phases:148-287, integration:291-300, resources:304-326)
6. `<SONASH_ROOT>\.claude\skills\developer-growth-analysis\SKILL.md` (lines 1-431; frontmatter:1-8, 6-step analysis:42-65, chat-history read:93-105, Rube MCP / Slack delivery:199-253)
7. `<SONASH_ROOT>\.claude\skills\data-effectiveness-audit\SKILL.md` (lines 1-353; frontmatter:1-13, critical rules:24-38, routing guide:57-67, phases:72-83, audit domains:99-160, integration:332-336)
8. `<JASON_OS_ROOT>\.research\migration-skill\BRAINSTORM.md` §3 D23 (verdict legend), D24 (Phase 5 content), D27 (research-scope expansion), §5 Q2 (cross-skill integration inventory).

---

## Return payload

- **skill count:** 7
- **coupling distribution:** 5 NONE / 1 LOW-ambient / 1 N/A-deprecated / 0 MEDIUM-HIGH
- **verdict distribution (D23):** 7/7 skip
- **surprising integration points:** none (hypothesis confirmed)
- **flags worth downstream attention:** (1) `/website-synthesis` is a deprecated stub, update D27 inventory to point at `/synthesize` instead; (2) `/data-effectiveness-audit` is ambient state-file consumer, mention in `/migration` operator docs as a post-port-ripple item but not a code integration
- **findings path:** `<JASON_OS_ROOT>\.research\migration-skill\findings\D2-content-other.md`
