# DISPUTE RESOLUTIONS — CAS cluster

**Agent:** dispute-resolver (Phase 3.5)
**Persona:** `C:\Users\jbell\.local\bin\JASON-OS\.claude\agents\dispute-resolver.md`
**Date:** 2026-04-21
**Scope:** 3 CAS-focused disputes between D6-cas-integration (D-agents), V3-cas (verifier), and contrarian.md Challenges 2 + 3 (adversarial challenger)
**Method:** DRAGged 5-type classification + T1 filesystem ground truth (direct greps); dissent record preserved per resolver protocol

---

## Summary

**Disputes resolved:** 3 (Dispute 1, Dispute 2, Dispute 3)
**Overall verdict on CAS auth deps:** **NARROW** — the "zero auth deps" finding is true for `scripts/cas/*.js` only; the full 6-skill CAS family carries networked git + `gh api` + external HTTPS surfaces in the skill bodies.
**Overall verdict on CAS bootstrap:** **Option (b) is the most evidence-consistent reading** — CAS-Tier-0 (lib + schemas + scripts) must be hand-ported before `/migration` v0 exists; CAS-Tier-1 (handler skills) becomes `/migration`'s first real job. This reconciles BRAINSTORM D19, BRAINSTORM §6 line 152's explicit "OR precursor milestone" language, and RESEARCH_OUTPUT line 348's "schemas+lib are so foundational that they're not meaningfully 'migrated' — they're ported as prereq."
**`/sonash-context` verdict:** **SKILL** — confirmed at `C:\Users\jbell\.local\bin\sonash-v0\.claude\skills\sonash-context\SKILL.md` (91 lines, has frontmatter `name: sonash-context`); consumed by 30+ agents via `skills: [sonash-context]` frontmatter field. Port surface for `/migration` is to introduce `/jason-os-context` as analog skill and rewrite agent frontmatter — exactly what claim C-082 already commits to.

---

## Dispute 1 — CAS auth deps: zero or networked?

### Positions

- **D6-cas-integration C-040 / §1:** "Count: 0 (zero outbound auth dependencies)" — claims CAS is filesystem-native with no tokens/secrets/network.
- **V3-cas.md:37-39:** "Zero auth deps claim — VERIFIED. Grep of `process\.env|OPENAI|ANTHROPIC|API_KEY|TOKEN|SECRET|GOOGLE|FIREBASE` across `scripts/cas/*.js` returned 0 matches."
- **contrarian.md Challenge 2 + NC-01:** "The grep covered only `scripts/cas/*.js`. It did not cover the skill-body behavior." Lists 7+ file:line locations with `gh api`, `git clone --depth=1`, `git fetch --unshallow`, external `api.securityscorecards.dev` — all in `repo-analysis/` skill body.

### Classification

**No Conflict / Complementary** (DRAGged Type 1/2). Both positions describe different scopes of the same truth. D6-cas-integration's OWN §1 already anticipates this — it cleanly separates "Script-level scan" (line 53-67, zero matches) from "Skill-level auth surfaces (via Bash/WebFetch at invocation, NOT via script)" (line 69-86) and names `gh api`, `youtube-transcript-api`, `npx repomix`, `gh api /gists/<gist-id>` explicitly. The V3 verifier's VERIFIED applies to the narrow script-grep portion only; V3 never claimed the full skill family was zero-network. The contrarian's CRITICAL framing is correct-as-scope-correction but is essentially re-surfacing what D6 already documented in its own §1 skill-level subsection — though phrased as a "narrow true / wider false" re-scoping that is materially different from how the claim has been propagated downstream.

### Evidence (T1 — direct filesystem grep, this session)

**Scripts layer — confirms D6/V3 narrow claim:**

| Path | Pattern | Matches |
|---|---|---|
| `scripts/cas/*.js` (12 files) | `process\.env\|OPENAI\|ANTHROPIC\|API_KEY\|TOKEN\|SECRET\|GOOGLE\|FIREBASE` | **0** |
| `scripts/cas/*.js` | `gh api\|git clone\|git fetch\|curl \|fetch\(\|https?://[a-z]+\.` | **0** |

**Skill-body layer — confirms contrarian expansion:**

| Skill | File:line | Surface |
|---|---|---|
| `/repo-analysis` | `SKILL.md:69` | `gh api rate_limit` before every API batch |
| `/repo-analysis` | `SKILL.md:92` | "Quick dependency check → `gh api` directly" |
| `/repo-analysis` | `SKILL.md:174` | `git clone --filter=blob:none --depth=1 <url>` to `/tmp/` |
| `/repo-analysis` | `SKILL.md:179` | `git fetch --unshallow` or `--shallow-since="1 year ago"` |
| `/repo-analysis` | `SKILL.md:429` | `gh api rate_limit` pre-batch; abort if `remaining < 200` |
| `/repo-analysis` | `REFERENCE.md:38` | `api.securityscorecards.dev` for OpenSSF 16-check score |
| `/repo-analysis` | `REFERENCE.md:51` | `GET api.securityscorecards.dev/projects/github.com/{owner}/{repo}` |
| `/repo-analysis` | `REFERENCE.md:1285` | `gh api /rate_limit` check |
| `/repo-analysis` | `REFERENCE.md:1675,1682` | `git clone --depth=1`, `git fetch --unshallow` |
| `/document-analysis` | `REFERENCE.md:929-930` | `WebFetch https://api.github.com/gists/<gist-id>` or `gh api /gists/<gist-id>` |
| `/document-analysis` | `REFERENCE.md:943-950` | arxiv `WebFetch` + `api.semanticscholar.org/graph/v1/paper/arXiv:<id>` |
| `/media-analysis` | `SKILL.md:159-162` | YouTube `oembed?url=...&format=json` / noembed / `youtube-transcript-api` |
| `/media-analysis` | `SKILL.md:191-193` | Python `youtube-transcript-api` for captions |
| `/analyze` | `REFERENCE.md` (multiple) | URL parsing tables only — **no actual network calls** |
| `/recall` | (entire dir) | **0 network-call patterns** |
| `/synthesize` | (entire dir) | **0 network-call patterns** (beyond `sonash-context` prose reference) |

### Resolution

**NARROW** — Both the D6 "zero auth deps" script-layer claim and the contrarian "networked at skill layer" observation are factually correct at their respective scopes. The issue is **claim propagation** in downstream synthesis: the phrase "CAS has zero auth deps" (without the scope qualifier) has leaked into RESEARCH_OUTPUT-style summaries and appears to underwrite D29 local-only framing in a way that conflates "scripts do no network" with "CAS does no network." The Winning Source is the filesystem itself (T1), which supports BOTH claims depending on scope. The **propagation** is what's miscalibrated.

**Confidence:** HIGH (filesystem-verified both directions this session).

**Dissent record:** D6-cas-integration's own §1 lines 69-86 cannot lose this dispute — D6 itself documents the skill-level surfaces that the contrarian re-surfaces. What loses is the **unscoped "zero auth deps" framing** that appears in RESEARCH_OUTPUT Theme 3 / Recommendation #2 prose where the qualifier got dropped. If the project later decides the skill-layer network surface is acceptable (e.g., `gh api` read-only with user-scope token is declared in-scope for D29 v1), both claims remain valid and the dispute becomes moot.

### Implication for D29 (v1 local-only)

D29 as currently written says "read source + write dest, zero network, zero git push/fetch/pull/clone/remote, zero gh CLI, zero credential-helper touch" (C-062). Layering this against the verified skill-level surfaces:

- `/migration` **the skill itself** is D29-compatible — it has no network code of its own.
- CAS **as `/migration`'s first real job** is NOT D29-compatible under current framing, because porting the `/repo-analysis` skill body preserves `git clone`, `git fetch`, and `gh api` idioms verbatim (no frontmatter `allowed-tools` stripping, per contrarian Challenge 2 line 124-128; confirmed in scope above — no CAS skill has `allowed-tools`).
- Resolution requires D5 reshape/rewrite primitives to either **strip** networked idioms during port (Phase 5 REWRITE verdict for `/repo-analysis` + `/document-analysis` + `/media-analysis`) OR explicitly **carve out** a D29 exception for user-initiated analysis runs.

The BRAINSTORM §6 / D19 / research framing treats `/migration` and CAS-the-port-target as independent concerns, but once CAS is ported, its network surface **inherits into JASON-OS** where `credential.helper=manager` is live per D12 line 151. This is a real cross-claim contradiction that the synthesis elides.

### Proposed claim updates (Dispute 1)

- **C-040 (unchanged):** MD5 byte-identical DB claim stands at HIGH — it's a different claim.
- **New C-040.1 to extract from existing framing:** "CAS **scripts layer** (`scripts/cas/*.js`, 12 files) has zero auth deps, zero secrets, zero network — filesystem-only. Confidence HIGH, filesystem-grep verified both rounds."
- **New C-040.2:** "CAS **skill layer** carries networked surfaces: `/repo-analysis` (`gh api`, `git clone --depth=1`, `git fetch --unshallow`, `api.securityscorecards.dev`), `/document-analysis` (`WebFetch api.github.com/gists`, arxiv, `api.semanticscholar.org`), `/media-analysis` (YouTube oEmbed/noembed, `youtube-transcript-api`). `/analyze`, `/recall`, `/synthesize` have zero network surfaces. Confidence HIGH, filesystem-grep this session."
- **Rescoped C-062 (D29 v1 local-only):** downgrade HIGH → MEDIUM-HIGH to reflect that D29 applies strictly to `/migration` the skill, not to `/migration`'s port targets. Add qualifier: "CAS skill-body network surfaces must be stripped (Phase 5 REWRITE) or D29-exempted during their port; D29 does not cover ported-skill-body behavior post-port."

---

## Dispute 2 — CAS bootstrap circularity

### Positions

- **BRAINSTORM D19 (line 73):** "Locally-ported CAS (with home-context assumptions reshaped during the CAS port itself into configurable target-repo parameters). No `--foreign-mode` flag."
- **BRAINSTORM §6 line 152:** "The CAS port may itself be `/migration`'s first big real job (self-dogfood variant) **OR a precursor milestone** — research to recommend."
- **RESEARCH_OUTPUT Theme 9 line 282:** M2 row prereqs = "M1 + `/migration` v0 working locally"; CAS port is M2's body.
- **RESEARCH_OUTPUT line 348 (Unresolved Questions):** "Route all 6 CAS skills through `/migration`, or port schemas + lib as Tier 0 shared work first, then use `/migration` for the skill files? ... The schemas+lib are so foundational that they're not meaningfully 'migrated' — they're ported as prereq. Open for decision."
- **contrarian Challenge 3 + NC-02:** Flags circularity — "`/migration` v0 working" requires M2 (CAS present) but M2 **is** `/migration` v0 running on CAS. Proposes CAS-Tier-0 hand-port (schemas + lib + scripts, ~40-50h) BEFORE `/migration` v0, then CAS-Tier-1 (handler skills) AS `/migration`'s first real job.

### Classification

**Complementary + Freshness** (DRAGged Type 2+4). D19's "no `--foreign-mode`" is a design intent (no wrapper-around-CAS shortcut); it does NOT require CAS to go through `/migration`. §6 line 152 explicitly leaves the decision open between self-dogfood and precursor. RESEARCH_OUTPUT line 348 leans toward precursor for schemas+lib. The contrarian's Option-(b)-equivalent split (Tier-0 hand-port, Tier-1 via migration) is internally consistent with ALL three of those sources.

### Options (as enumerated by the task)

| Option | Description | Evidence-compatibility |
|---|---|---|
| (a) | `/migration` v0.5 runs WITHOUT CAS (Phase 0 /sync skipped for CAS port itself — bootstrap) | **Partial fit.** Skipping /sync during CAS port is mechanical; doesn't resolve whether CAS handlers themselves need `/migration` v0 functioning. |
| (b) | CAS port happens **manually first** (not via /migration); v1 scope doesn't include self-porting | **Strongest fit.** Directly supported by BRAINSTORM §6 line 152 "OR precursor milestone" and RESEARCH_OUTPUT line 348 "schemas+lib … ported as prereq." |
| (c) | Sort `/sync` to Piece 5 priority so `/sync` lands before `/migration` | **Not applicable** — `/sync` is independent of this circularity; BRAINSTORM.md:193-194 shows `/sync` is Piece 5 of its own 5-piece project with Pieces 1-4 unbuilt. |
| (d) | Accept circularity as irreducible; `/migration` v1 explicitly cannot port CAS; deferred to v1.1 | **Poor fit.** Contradicts D19's explicit "locally-ported CAS" direction and pushes self-dogfood entirely out of v1. |

### Recommended interpretation

**Option (b) — split CAS port into Tier-0 (hand-port, precursor) + Tier-1 (via `/migration` as first real job).**

This is what the research is **implicitly** assuming — line 348's "schemas+lib … ported as prereq" phrasing means they DON'T go through /migration. What the research fails to do is **promote this from Unresolved Questions into an explicit milestone-table revision**. The M2 row as currently written is self-contradictory because it lists "CAS port" as body AND "/migration v0 working" as prereq. Under Option (b) the milestone structure becomes:

- **M2a (new):** Hand-port Tier-0 — `scripts/lib/{safe-cas-io,parse-jsonl-line,read-jsonl,analysis-schema,retag-mutations}.js` + `scripts/cas/*.js` (12 files) + `.research/` substrate. No `/migration` involvement. ~40-50h per contrarian NC-02 estimate.
- **M2b (ex-M2):** `/migration` v0 working locally on a simple non-CAS target (e.g., one of the seed-trio verifications). Requires M1 (convergence-loop) + M2a libs.
- **M2c (new):** Use `/migration` v0 on 3 low-risk CAS skill ports (e.g., `/recall` — thin wrapper; `/document-analysis` — no git clone; `/media-analysis` — public APIs only). First real self-dogfood.
- **M2d (new):** Use `/migration` v0 on 3 high-risk CAS skill ports (`/repo-analysis` with network stripping; `/synthesize` with `/convergence-loop` dependency; `/analyze` router). Validates reshape primitives at their hardest.

### Key evidence citations

- `C:\Users\jbell\.local\bin\JASON-OS\.research\migration-skill\BRAINSTORM.md:73` — D19 locked decision
- `C:\Users\jbell\.local\bin\JASON-OS\.research\migration-skill\BRAINSTORM.md:152` — explicit OR precursor milestone
- `C:\Users\jbell\.local\bin\JASON-OS\.research\migration-skill\RESEARCH_OUTPUT.md:282` — M2 row
- `C:\Users\jbell\.local\bin\JASON-OS\.research\migration-skill\RESEARCH_OUTPUT.md:348` — Unresolved Question
- `C:\Users\jbell\.local\bin\JASON-OS\.research\migration-skill\findings\D6-cas-integration.md:338-388` — 5-layer port DAG (Layer 0-1-2-3 are precursor-style; Layer 4-5 are skill-port-style)
- `C:\Users\jbell\.local\bin\JASON-OS\.research\migration-skill\challenges\contrarian.md:194-197` — explicit split proposal

### Resolution

**Confidence: HIGH.** The research implicitly commits to Option (b) through three converging signals (BRAINSTORM §6 "OR precursor", RESEARCH_OUTPUT line 348 "ported as prereq", D6-cas-integration's 5-layer DAG treating Layers 0-3 as foundation-before-skill-port). The circularity contrarian Challenge 3 raises is **real** but is a framing failure, not a substantive contradiction — the milestone table just needs to be rewritten to reflect what the rest of the research already implies.

**Dissent record:** contrarian Challenge 3's critique (that the synthesis "never reconciles" the circularity) loses only on the narrow question of **has the research implicitly picked an option** — Challenge 3 is correct that the **synthesis prose** never picks one explicitly. The Recommendation section claims "bottom-up" as if that resolves it, but "bottom-up" is compatible with both (b) and a mythical "CAS gets migrated in one atomic shot" reading. The contrarian was right to flag it; the fix is a prose / milestone-table edit, not a research reversal.

### Proposed claim updates (Dispute 2)

- **C-077 (unchanged wording, routing update):** "All 6 live CAS skills are pre-port-dependent for /migration EXECUTION beyond trivial file-copy; concept unit-type is blocked-on-prereq in v1-MVP until CAS ported." Confidence HIGH — confirmed. Add routing.gsd=true (already set) + note that CAS-Tier-0 (lib+scripts) is the pre-port prerequisite, not the 6 skills themselves.
- **New NC-02-as-claim (promote from contrarian):** "CAS port splits into Tier-0 (hand-ported precursor: 5 lib modules + 12 scripts + `.research/` substrate + `better-sqlite3` npm install, ~40-50h) and Tier-1 (/migration's first real job: 6 CAS skills, ~90-100h). M2 milestone must be decomposed into M2a-M2d." Confidence HIGH.

---

## Dispute 3 — `/sonash-context` as implicit CAS dependency

### Positions

- **D6-cas-integration §2:** Lists 5 home-context files (`SESSION_CONTEXT.md`, `ROADMAP.md`, `CLAUDE.md`, `MEMORY.md`, `.research/home-context.json`) as the home-context surface. `/sonash-context` is not in this list.
- **Synthesis Unexpected Findings:** "/sonash-context implicit dependency of /synthesize" (per task statement; also per C-108).
- **Question from task:** Is `/sonash-context` a SKILL that /synthesize invokes, or a FILE that /synthesize reads?

### Evidence (T1 — filesystem ground truth, this session)

**`/sonash-context` is a SKILL.** Direct confirmation:

- `C:\Users\jbell\.local\bin\sonash-v0\.claude\skills\sonash-context\SKILL.md` exists, 91 lines, has frontmatter:
  ```yaml
  ---
  name: sonash-context
  description: SoNash project context injected into agent definitions via skills: field
  ---
  ```
- Consumed by 30+ agents via `skills: [sonash-context]` frontmatter field. Examples (grep hits this session):
  - `.claude/agents/backend-architect.md:9`
  - `.claude/agents/code-reviewer.md:10`
  - `.claude/agents/debugger.md:11`
  - `.claude/agents/database-architect.md:9`
  - `.claude/agents/dispute-resolver.md:9`
  - `.claude/agents/general-purpose.md:7`
  - `.claude/agents/deep-research-searcher.md:4`
  - `.claude/agents/deep-research-verifier.md:10`
  - `.claude/agents/deep-research-synthesizer.md:4`
  - `.claude/agents/deep-research-final-synthesizer.md:10`
  - `.claude/agents/deep-research-gap-pursuer.md:12`
  - `.claude/agents/explore.md:11`
  - `.claude/agents/plan.md:11`
  - `.claude/agents/contrarian-challenger.md:9`
  - `.claude/agents/otb-challenger.md:9`
  - … and 15 more (total 30+).
- The one grep hit inside `/synthesize` (`synthesize/REFERENCE.md:730`) is a **prose reference** to `sonash-context`: "Stack: Zod 4.3.6 schemas per CLAUDE.md §1; script runners per sonash-context". This is the reference C-108 cites. It's documentation-text; `/synthesize` does not itself invoke the skill.

**Content of `sonash-context/SKILL.md`:** Stack versions (Next.js 16 / React 19 / Firebase 12 / Tailwind 4 / Zod 4), architecture (repository pattern, Firestore + Cloud Functions), security boundaries (App Check, httpsCallable), coding standards. This is **pure SoNash content** — stack-specific facts that JASON-OS (stack-agnostic) does not carry.

### Classification

**No Conflict** (DRAGged Type 1) — different scopes. D6-cas-integration's 5-file home-context list is about **data files** the CAS handlers read (e.g., `CLAUDE.md` as prose). `/sonash-context` is a **skill** injected into agents via the `skills:` field — different mechanism (skill-system injection into agent prompt), different location (`/skills/sonash-context/SKILL.md`, not a top-level repo file), different consumer (30+ agents, not 6 CAS handlers).

### Resolution

**Factual verdict: `/sonash-context` is a SKILL** (T1-verified, filesystem: `sonash-v0\.claude\skills\sonash-context\SKILL.md`).

**Implications for the CAS port:**

1. `/sonash-context` is **not** in the 5-item home-context-file list (that list is correct as-is for its own scope).
2. `/sonash-context` **is** a cross-skill dependency of `/synthesize` — but **only as prose reference** at `synthesize/REFERENCE.md:730`. `/synthesize` does not invoke `/sonash-context` at runtime the way it invokes `/convergence-loop`. The coupling is documentation/narrative, not runtime dispatch.
3. The **real** port blocker for `/sonash-context` is its consumption by 30+ **agents**, not by the CAS skills. When the CAS agents are ported (`.claude/agents/document-analyst.md`, `media-analyst.md`, etc. — if they exist in JASON-OS), their frontmatter `skills: [sonash-context]` must be rewritten to `skills: [jason-os-context]` AND the analog `/jason-os-context` skill must exist. This is exactly what C-082 already commits to: "sonash-context skill is Phase 5 REWRITE target — /migration must transform skills:[sonash-context] → skills:[jason-os-context] in ported agent frontmatter."

**CAS port depth therefore DOES include porting `/sonash-context` → `/jason-os-context`** — but as an agent-frontmatter rewrite surface, NOT as a CAS handler runtime dependency. D6-cas-integration's 5-file home-context list remains correct and complete for the handlers' own read surface.

**Confidence: HIGH** (filesystem: SKILL.md file exists + 30+ agent frontmatter consumers verified by grep this session).

**Dissent record:** C-108's MEDIUM confidence stood because V3 correctly noted it was single-D-agent sourced. The C-108 claim text ("implicit cross-skill dependency of /synthesize via REFERENCE.md:730") is factually correct but **understates the dependency graph**. The real surface is agent-layer, not skill-layer — 30+ agents depend on `/sonash-context`, of which only `/deep-research-*` and `/plan` are routinely invoked by CAS workflows. C-082 (HIGH) already captures the rewrite action correctly; C-108 is subsumed by it. C-108 should be reclassified as an **observation** of one cite (true) that points at a larger dependency (C-082, which owns the port action).

---

## Proposed claim updates

| Claim ID | Current confidence | Proposed confidence | New wording / action |
|---|---|---|---|
| **C-040** | HIGH | HIGH (no change) | Keep as-is. MD5 byte-identical claim is its own thing and remains verified. |
| **C-062** | HIGH | **MEDIUM-HIGH** | Add scope qualifier: "Local-only applies to `/migration` the skill, not its port targets. Ported CAS skill bodies carry network surfaces (see NC-CAS-NET-01) that must be stripped (Phase 5 REWRITE) or D29-exempted at port time." |
| **C-077** | HIGH | HIGH (no change) | Wording stands; evidence now reinforced by Dispute 2 resolution. |
| **C-082** | HIGH | HIGH (reinforced) | Wording stands — already committed to `skills:[sonash-context] → skills:[jason-os-context]` rewrite. Add cross-reference to new claim NC-SONASH-CTX-SKILL below. |
| **C-108** | MEDIUM | **MEDIUM (reworded)** | Revise to: "`/sonash-context` is referenced in prose at `synthesize/REFERENCE.md:730` but is NOT a runtime dispatch dependency of `/synthesize`. Real dependency is at the agent-frontmatter layer (30+ agents via `skills: [sonash-context]`) — see C-082 for the port action. This cite is observational, not load-bearing for skill-level port planning." Confidence MEDIUM because the cite is factual but the framing was misleading. |

---

## New claims to add

**NC-CAS-NET-SCRIPTS (HIGH):** CAS scripts layer (`scripts/cas/*.js`, 12 files) has zero auth deps, zero secrets, zero network, zero external API calls. Filesystem grep this session confirms 0 matches for `process\.env|OPENAI|ANTHROPIC|API_KEY|TOKEN|SECRET|GOOGLE|FIREBASE|gh api|git clone|git fetch|curl |fetch\(|https?://[a-z]+\.` across all 12 scripts.
**Evidence:** grep results, 2026-04-21 this session. **Sources:** S-017 (D6-cas-scripts-deep), S-048 (D6-cas-integration §1), V3-cas.md:37-39.
**Routing:** `deepPlan=true, gsd=true, convergenceLoop=false, memory=true, tdms=true`

**NC-CAS-NET-SKILLS (HIGH):** CAS skill-body layer carries networked surfaces in 3 of 6 skills:
- `/repo-analysis` — `gh api` (SKILL.md:69,92,429; REFERENCE.md:1285), `git clone --depth=1` (SKILL.md:174; REFERENCE.md:1675), `git fetch --unshallow` (SKILL.md:179; REFERENCE.md:1682), `api.securityscorecards.dev` external HTTPS (REFERENCE.md:38,51)
- `/document-analysis` — `WebFetch api.github.com/gists/<id>` / `gh api /gists/<id>` (REFERENCE.md:929-930), arxiv.org `WebFetch` (REFERENCE.md:943-946), `api.semanticscholar.org/graph/v1/paper/arXiv:<id>` (REFERENCE.md:950)
- `/media-analysis` — YouTube oEmbed/noembed `WebFetch` (SKILL.md:159), `youtube-transcript-api` Python (SKILL.md:161,191-193)
- `/analyze` — URL parsing tables only (REFERENCE.md:51-169); zero actual network calls
- `/recall` — 0 network patterns
- `/synthesize` — 0 network patterns (one prose mention of `sonash-context` at REFERENCE.md:730)

None of the 6 skills declares `allowed-tools` frontmatter — they inherit invoking session's tool grants verbatim.
**Evidence:** filesystem grep this session.
**Routing:** `deepPlan=true, gsd=true, convergenceLoop=true, memory=true, tdms=true`

**NC-CAS-BOOTSTRAP-SPLIT (HIGH):** CAS port must be split into Tier-0 (hand-port precursor: 5 lib modules + 12 scripts + `.research/` substrate + `better-sqlite3` native install, ~40-50h) and Tier-1 (`/migration` first-real-job: 6 CAS skills, ~90-100h). M2 milestone decomposes to M2a (Tier-0 hand-port), M2b (`/migration` v0 on simple non-CAS target), M2c (`/migration` on 3 low-risk CAS skills — `/recall`, `/document-analysis`, `/media-analysis`), M2d (`/migration` on 3 high-risk CAS skills — `/repo-analysis` with network stripping, `/synthesize` with /convergence-loop dep, `/analyze` router).
**Resolves:** BRAINSTORM §6 line 152 open decision + RESEARCH_OUTPUT line 348 Unresolved Question + contrarian Challenge 3 circularity.
**Evidence:** BRAINSTORM.md:73,152; RESEARCH_OUTPUT.md:282,348; D6-cas-integration.md:338-388 (5-layer DAG); contrarian.md:194-197.
**Routing:** `deepPlan=true, gsd=true, convergenceLoop=false, memory=true, tdms=true`

**NC-SONASH-CTX-SKILL (HIGH):** `/sonash-context` is a skill at `C:\Users\jbell\.local\bin\sonash-v0\.claude\skills\sonash-context\SKILL.md` (91 lines, `name: sonash-context` frontmatter), NOT a file-system home-context file. Consumed by 30+ agents via `skills: [sonash-context]` frontmatter field (examples: backend-architect, code-reviewer, debugger, general-purpose, deep-research-searcher, deep-research-verifier, deep-research-synthesizer, deep-research-gap-pursuer, explore, plan, contrarian-challenger, otb-challenger, dispute-resolver, and 17 more). Content is SoNash-specific stack/security facts (Next.js 16 / React 19 / Firebase 12 / Tailwind 4 / Zod 4 / Cloud Functions / App Check). Port action is captured by C-082 (sonash-context → jason-os-context rewrite in agent frontmatter, with analog skill `/jason-os-context` to be authored in JASON-OS carrying stack-agnostic content).
**Evidence:** filesystem this session (SKILL.md exists); 30 agent-file grep hits.
**Routing:** `deepPlan=true, gsd=true, convergenceLoop=false, memory=true, tdms=true`

**NC-D29-SCOPE-QUALIFIER (MEDIUM-HIGH):** D29 "v1 local-only" (C-062) applies to `/migration` the skill, not to `/migration`'s port targets. CAS `/repo-analysis` + `/document-analysis` + `/media-analysis` skill bodies contain networked idioms (see NC-CAS-NET-SKILLS) that would inherit into JASON-OS on verbatim port. Phase 5 REWRITE primitives must strip these OR the port must declare an explicit D29 exception for user-initiated analysis runs. D12's `credential.helper=manager` is live on JASON-OS (D12-local-auth-perms.md:151); porting unreshaped `/repo-analysis` would activate credential prompts the first time a user invokes it against a private repo.
**Evidence:** C-062 claim, D12-local-auth-perms:151, NC-CAS-NET-SKILLS evidence, absence of `allowed-tools` frontmatter in all 6 CAS skills.
**Routing:** `deepPlan=true, gsd=true, convergenceLoop=true, memory=true, tdms=false`

---

## Return values (for orchestrator)

- **Disputes resolved:** 3 (Dispute 1, 2, 3)
- **Auth-deps verdict:** **NARROW** (scripts zero-auth verified; skills networked in 3 of 6)
- **Bootstrap resolution:** **(b)** — CAS-Tier-0 hand-port precursor; CAS-Tier-1 via `/migration` first-real-job
- **`/sonash-context` verdict:** **SKILL** (SKILL.md at `sonash-v0\.claude\skills\sonash-context\`, consumed by 30+ agents via `skills:` frontmatter)
- **Findings path:** `C:\Users\jbell\.local\bin\JASON-OS\.research\migration-skill\findings\dispute-resolutions-cas.md`
- **Claim updates:** 2 unchanged (C-040, C-077), 1 reinforced (C-082), 1 scope-qualified (C-062 HIGH → MEDIUM-HIGH), 1 reworded (C-108)
- **New claims surfaced:** 5 (NC-CAS-NET-SCRIPTS, NC-CAS-NET-SKILLS, NC-CAS-BOOTSTRAP-SPLIT, NC-SONASH-CTX-SKILL, NC-D29-SCOPE-QUALIFIER)

**End dispute-resolver report — CAS cluster.**
