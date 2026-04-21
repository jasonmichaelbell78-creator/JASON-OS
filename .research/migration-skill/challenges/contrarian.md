# CONTRARIAN CHALLENGE — /migration skill research

**Date:** 2026-04-21
**Target:** `.research/migration-skill/RESEARCH_OUTPUT.md` (552 lines, 66 KB)
**Persona:** contrarian-challenger (Free-MAD protocol)
**Method:** steel-man → pre-mortem → file:line evidence. No back-down from HIGH confidence.
**Scope covered:** 8 challenges across decomposition, auth/CAS, D29 scope, CAS bootstrap timing, self-dogfood feasibility, D16 symmetry, agent count, meta-ledger / ITERATION_LEDGER load-bearing

---

## Summary

The research is directionally sound and load-bearing findings (seed-trio sizes,
byte-identical DBs, CAS coupling-site counts, state-schema choices) are
file:line-accurate. **But the synthesis is comfortable in three specific ways
that show up as confidence-inflation on claims that haven't actually cleared
the bar their confidence implies:**

1. The "router + 2 ancillaries" decomposition is presented as a convergence;
   it is actually a **middle-ground compromise** that papers over a real
   contradiction — and the boundary-heuristic used to "resolve" it was
   authored by the same cluster it is now being used to judge.
2. The "zero auth / zero credential-manager / local-only" claims for
   `/migration` are technically true **for `/migration` itself** but the CAS
   port — which RESEARCH_OUTPUT designates as `/migration`'s first real job —
   brings in `gh api` and `git clone`/`git fetch` surfaces that directly
   contradict the D29 local-only premise. The research never reconciles this.
3. The **D16 both-direction symmetry** (SoNash → JASON-OS as first-class) is
   structurally absent from the reshape pipeline design. D5's nine signals,
   eleven primitives, and single worked walkthrough are all written one
   direction: SoNash → JASON-OS.

These aren't fatal — the research direction still holds. But several claims
currently marked HIGH should be MEDIUM, and two recommendations (agent roster
and M2→M4 milestone sequencing) have circular dependencies that should be
called out explicitly rather than framed as clean "bottom-up" ordering.

Below: 8 challenges. 3 CRITICAL, 4 MAJOR, 1 MINOR.

---

## Challenges

### Challenge 1 — Decomposition "synthesis" is a comfortable middle, not a resolution

**Severity:** MAJOR
**Target claim:** C-042 / C-044 / Theme 1 convergence + Recommendation #1

**Steel-man:** Two D-agents (D7-router-vs-monolith and D7-other-multi-skill-families)
reached architectural conclusions that differ in shape, but both agree v1
should not pre-factor reshape/rewrite. A third D-agent (D7-cas-precedent)
offered a three-part boundary heuristic ((a) own invocation + (b) distinct
artifacts + (c) re-runnable independently) that the synthesis applied to
resolve the split: Phases 2 and 6 clear all three bars, so they become peer
skills; everything else stays monolithic. Refactor asymmetry argument
(under-decomposing 1-3 days to extract vs over-decomposing 1-2 weeks to
re-monolith) tips the decision toward the minimum-viable extraction.

**Challenge:** The "resolution" is not doing the work the synthesis claims.
The three recommendations don't converge on router+2 ancillaries — they
converge on "don't pre-factor reshape/rewrite." That's a much weaker claim.
On the actual shape question (router+ancillaries vs monolith-with-companions),
the two agents **directly contradict** (V4 §Cross-agent inconsistencies #1,
line 99-101, flags exactly this). D7-cas-precedent's "boundary heuristic" is
then offered as a tiebreaker — but that heuristic was authored inside the same
Q7 cluster whose contradiction it is being used to adjudicate. There's no
independent source. V4 specifically recommends C-042 + C-043 be kept as
"recommended + alternative" until a Phase-2 decision (V4-design-web.md:38-42).
Yet the RESEARCH_OUTPUT Executive Summary line 14 presents the consensus as
"monolith-with-companions + phased-pipeline" (one shape), Recommendation #1
line 379 says "ship as minimum-viable router + 2 ancillaries" (a *different*
shape), and the Theme 1 Recommendation line 53 says both "converge here."
Three sentences in the same document commit to three different specific
architectures.

**Evidence:**
- RESEARCH_OUTPUT.md:14 — "consensus architecture is a **monolith-with-companions + phased-pipeline** shape"
- RESEARCH_OUTPUT.md:53 — "Recommendation: Router + 2 ancillaries..."
- RESEARCH_OUTPUT.md:379 — "Ship `/migration` v1 as minimum-viable router + 2 ancillaries"
- V4-design-web.md:38-42 — "Downstream should keep C-042 + C-043 as 'recommended + alternative' rather than promote either to HIGH until Phase 2 decision"
- Claims file already reflects this: C-042 and C-043 are both MEDIUM in claims.jsonl; only the synthesis treats the question as resolved.

**Recommendation:** Downgrade Theme 1's internal "Confidence: HIGH" (line 55)
to MEDIUM. Rephrase Executive Summary line 14 to name the two shapes and the
unresolved tension rather than collapsing to one. Call out explicitly that
D7-cas-precedent's heuristic is a within-cluster tiebreaker, not an external
check. Keep Recommendation #1 but flag it as "preferred shape pending Phase 2
decision per V4 guidance."

---

### Challenge 2 — "Zero auth deps" claim for CAS is narrower than it reads; `/repo-analysis` uses `gh api` and `git clone`

**Severity:** CRITICAL
**Target claim:** V3-cas.md:37-39 "Zero auth deps claim — VERIFIED" + Theme 3 framing of CAS as D29-compatible first-real-job

**Steel-man:** D6-cas-integration's "no external API calls" claim was
verified by grepping `scripts/cas/*.js` for `process.env|OPENAI|ANTHROPIC|API_KEY|TOKEN|SECRET|GOOGLE|FIREBASE`
and getting zero matches. This establishes that the CAS *script layer* does
not itself read secrets or make networked calls. Combined with D29 local-only
+ D12 "zero credential-manager touch," this means CAS can be ported without
wiring up auth infrastructure — the skills' own content is the entire port
surface.

**Challenge:** The grep covered only `scripts/cas/*.js`. It did **not** cover
the skill-body behavior, which is where the actual work happens. Direct grep
of `sonash-v0/.claude/skills/repo-analysis/` shows:
- `repo-analysis/SKILL.md:69,92,429` — uses `gh api rate_limit` and `gh api` directly
- `repo-analysis/SKILL.md:174,179` + `REFERENCE.md:1675,1682` — uses `git clone --filter=blob:none --depth=1 <url>` and `git fetch --unshallow`
- `repo-analysis/REFERENCE.md:51` — calls `GET api.securityscorecards.dev/projects/github.com/{owner}/{repo}`
- `repo-analysis/REFERENCE.md:1285` — "Check `gh api /rate_limit` before each API batch; abort if `remaining < 200`"

All three of these networked operations would invoke the Git Credential Manager
the moment they hit a private or rate-limited path. D12-local-auth-perms.md:151
explicitly notes `credential.helper=manager` is configured on JASON-OS and
"would silently use cached GitHub credentials" if any code path invokes
networked git. D12's conclusion (line 165: "Zero network reach by design for
v1") is correct *for `/migration` itself*, but the RESEARCH_OUTPUT Recommendation
#2 line 381 says CAS port is `/migration`'s first real job — which means the
*first thing* `/migration` v1 runs on will be code that assumes a rich network
+ credential surface that D29 explicitly forbids.

This is not a subtle gap. The CAS handler skills' `SKILL.md` bodies do not
declare `allowed-tools` frontmatter (verified by grep `allowed-tools|tools:\s*\[`
across all 6 CAS skills — no matches), which means they inherit whatever the
invoking session has. Porting them preserves that behavior verbatim unless
/migration's reshape step strips network-requiring idioms — which is nowhere
called out in D5's 11 primitives or 9 signal detectors.

**Evidence:**
- `sonash-v0/.claude/skills/repo-analysis/SKILL.md:69` — "Rate limit safety. Check `gh api rate_limit` before every API batch."
- `sonash-v0/.claude/skills/repo-analysis/SKILL.md:174` — "Clone: `git clone --filter=blob:none --depth=1 <url>` to `/tmp/`"
- `sonash-v0/.claude/skills/repo-analysis/REFERENCE.md:51` — external API call to securityscorecards.dev
- `C:\Users\jbell\.local\bin\JASON-OS\.research\migration-skill\findings\V3-cas.md:37-39` — grep scope limited to `scripts/cas/*.js`, not skill bodies
- `D12-local-auth-perms.md:151` — acknowledges credential.helper=manager is live; relies entirely on "no networked git by design"
- No counter-evidence: D5-reshape-pipeline.md has zero mentions of "gh api" or "git clone" as reshape targets

**Recommendation:**
- Downgrade "zero auth deps" claim (sourced from D6-cas-integration) from VERIFIED to VERIFIED-NARROW (scripts only, not skill behavior).
- Add a new claim: `/repo-analysis` requires a policy decision at port time — either (a) strip networked GitHub operations for v1-MVP (most aggressive reshape on any single skill in the CAS cluster) OR (b) carve out an explicit D29 exception for `/repo-analysis` reads-only gh api.
- Explicitly reconcile: D29 says "no remote/PR in v1, both endpoints locally cloned"; CAS `/repo-analysis` inherently clones remote repos as its normal mode of operation. This contradiction must be named.
- RESEARCH_OUTPUT should surface this in Theme 6 (CAS port scope) before it hits Recommendation #2.

---

### Challenge 3 — CAS port timing has a circular dependency the milestone table hides

**Severity:** CRITICAL
**Target claim:** Recommendation #2 "port order is bottom-up, strict prerequisites" + M2 row in Theme 9 milestone table

**Steel-man:** Bottom-up port order is the standard safe approach: ship the
foundations (seed trio → convergence-loop) first, then CAS as `/migration`'s
self-dogfood first real job, then `/sync` in parallel, then `/migration`
itself last. Each tier builds on the one below. The CAS port as a self-dogfood
of a working `/migration` v0 is elegant because it validates the skill by
doing real work from day one.

**Challenge:** The milestone table is logically inconsistent. Let me read it
literally:

- M2 prereqs (Theme 9, line 282): "M1 + **`/migration` v0 working locally**"
- M4 `/migration` v1 acceptance prereq: M2 + M3
- `/migration` execution (Executive Summary line 17) is blocked by three shift-risk-1 prereqs, one of which is **"CAS is entirely absent from JASON-OS and by D19 decision must be ported through `/migration`"**

Reading these together: M4 needs M2 (CAS ported). M2 needs `/migration` v0
working. `/migration` v0 working requires executing — which is blocked by
CAS being absent. M2 cannot complete until `/migration` v0 runs end-to-end,
but `/migration` v0 cannot run without CAS absent-or-present... the synthesis
calls this "self-dogfood" but never addresses that **self-dogfood requires
the thing to work first, and the thing-working requires self-dogfood to
complete**. This is circular, not bottom-up.

The research mentions this only once as an open question (line 348 Unresolved
Questions): "Route all 6 CAS skills through `/migration`, or port schemas +
lib as Tier 0 shared work first, then use `/migration` for the skill files?"
This open question is load-bearing on the entire port plan but never feeds
back into Recommendations #1-10 or the M2→M4 chain. The D19 decision "CAS
port through `/migration` — no `--foreign-mode` flag" (BRAINSTORM.md:73) is
a logical NOT-this-path statement but doesn't resolve the bootstrap.

Furthermore: the ~143h (3-4 weeks) CAS port is scheduled to happen INSIDE an
un-built skill's happy-path flow. If Phase 5 transformation primitives work
imperfectly for the first 10 hours of the CAS port, the next 133 hours are
spent compounding the imperfection.

**Evidence:**
- RESEARCH_OUTPUT.md:17 — "Execution readiness is currently blocked by three hard prerequisites... CAS is entirely absent..."
- RESEARCH_OUTPUT.md:282 — M2 row prereqs include "`/migration` v0 working locally"
- RESEARCH_OUTPUT.md:343 — contradiction table explicitly names this: "BRAINSTORM §6: CAS as blocker OR `/migration`'s first big job"
- RESEARCH_OUTPUT.md:348 — open question: "Route all 6 CAS skills through `/migration`, or port schemas + lib as Tier 0 shared work first, then use `/migration` for the skill files?"
- No resolution text anywhere in Recommendations section.

**Recommendation:**
- Split CAS port into two phases: **CAS-Tier-0** (schemas + lib + scripts/cas/*.js, hand-ported *before* `/migration` exists, ~40-50h) and **CAS-Tier-1** (the 6 handler skills, ported by `/migration` v0 once it works on the less-risky surface).
- Elevate line 348's open question from "Unresolved" to a Phase-2 decision that must be made before M2 begins.
- Milestone M2 prereqs should be rewritten: M2a (hand-port schemas+lib), M2b (`/migration` v0), M2c (use `/migration` v0 on 3 easy CAS skills), M2d (use `/migration` v0 on the 3 hard CAS skills including /repo-analysis).
- Drop the "first real job" framing — the first real job should be a single well-chosen low-risk skill port, not 143h / 38-row CAS.

---

### Challenge 4 — D29 "local-only v1" is a design intention, not an enforced property

**Severity:** MAJOR
**Target claim:** C-062 "zero network, zero git push/fetch/pull/clone/remote, zero gh CLI" + Theme 11 "Confidence: HIGH"

**Steel-man:** D29 cleanly scopes v1 to local-filesystem. D12 documents
the 12-cell worktree matrix, 13 dirty-state categories, 5 Windows gotchas.
The `credential.helper=manager` config is a no-op because `/migration` by
design never invokes any networked git subcommand. The minimum-viable stance
"read-source + write-dest, never touch the network" is clean, small, and
already aligned with `safe-fs.js`'s single-user trust model.

**Challenge:** The claim is enforceable at the *design* level — nothing in
the `/migration` orchestrator code calls `git push`. But the research never
asks: **what happens when the user invokes `/migration` on a source that
has remotes configured and dirty state involving remote-tracking branches?**
D12's 13 dirty-state categories cover working-tree states (staged, unstaged,
merge conflicts, worktree locks), not **remote-coupled states** (local ahead
of origin, local behind origin, detached HEAD pointing at remote ref,
submodules, rebase-in-progress on a remote-tracking branch, pending force-push).

More concretely: when `/migration` commits a unit to the destination with
`Migration-Unit: U007` trailer, the destination git repo now has a commit
that its origin doesn't know about. If the user (or another process) runs
`git push` on the destination later — or if a hook runs it — the credential
manager prompts, and now `/migration`'s "never touches network" property is
violated *after* the skill completes. The `block-push-to-main.js` hook
(CLAUDE.md §4 #7 [GATE]) protects `main` but not feature branches.

D12 line 40 does say "No `git remote add` / `git remote set-url` — remotes
exist or they don't; `/migration` does not edit them." This is correct but
sidesteps the real question: does `/migration` refuse-or-warn on a source
or destination that **has** remotes configured with uncommitted local work
that could be force-pushed? D12's refuse-list is 6 categories; none of them
mention remote-state.

Strict hygiene = "I never do X" only gives you "X never happens" if the
surrounding environment is also enforced. C-014 flagged that CLAUDE.md §4
NEEDS_GATE hooks (frustrationDetection, loop-detector, track-agent-invocation
result-size check) are all honor-only. D8 "nothing silent, ever" rides on
those hooks existing. Which means: `/migration` v1 stakes its "zero network"
claim on **several layers of honor-only discipline**, in a skill that by
its own Theme 3 acknowledges is premiering on a codebase with three
shift-risk-1 blockers unresolved.

**Evidence:**
- RESEARCH_OUTPUT.md:88 — "CLAUDE.md §4 NEEDS_GATE hooks... all honor-only. Without them, D8 'nothing silent' is aspirational."
- D12-local-auth-perms.md:151 — acknowledges credential.helper=manager is live on JASON-OS
- D12-local-auth-perms.md:165 — "Zero network reach **by design** for v1" (my emphasis)
- No claim in claims.jsonl addresses remote-configured dirty states
- CLAUDE.md §4 #7 "block-push-to-main.js" [GATE] covers push-to-main only, not per-branch or `gh api`

**Recommendation:**
- Downgrade C-062 from HIGH to MEDIUM-HIGH to reflect honor-only enforcement.
- Expand D12's dirty-state matrix from 13 to ~20 categories explicitly covering remote-coupled states. Propose specific refuse rules for: detached HEAD, rebase-in-progress, active `git bisect`, submodule presence, local-ahead-of-origin by N commits where N > threshold, pending pre-push hooks.
- Add new claim: `/migration` v1 MUST run a pre-flight `git config --get remote.origin.url || true` check and enumerate remotes on both endpoints; log them to MIGRATION_STATE.json; refuse if either endpoint has an active network operation in flight (`.git/MERGE_HEAD`, `.git/REBASE_HEAD`, `.git/FETCH_HEAD` within last 60s, etc).

---

### Challenge 5 — "Self-dogfood v1 acceptance bar" is overambitious given prereq depth

**Severity:** MAJOR
**Target claim:** C-057 v1 acceptance bar = C1-C5 + C6 (round-trip); RESEARCH_OUTPUT Theme 9 "v1 acceptance bar" line 272

**Steel-man:** Self-hosting is the gold-standard acceptance test. A migration
tool that can't migrate itself is suspect. C6 round-trip (JASON-OS → SoNash →
JASON-OS idempotent) directly parallels rustc stage2-matches-stage1 and
terraform apply → plan = 0 changes — both well-regarded proofs of correctness.
The v1 bar deferring C7 zero-drift and full CI to v1.1 is a reasonable
scope-reduction already.

**Challenge:** Count the prereqs that must all be true for C6 to even be
testable:

1. Seed trio ported (M0)
2. `/convergence-loop` ported to JASON-OS (M1) — the single highest-recurrence
   dependency at 5x across phases 2,3,4,5,6
3. CAS ported (M2) — 143h / 3-4 weeks, 38 port actions, 3 XL rewrites
4. `/sync` Piece 5 engine built (M3) — which needs Pieces 3.5 + 4 finished
   first, neither of which is started per BOOTSTRAP_DEFERRED.md:166-170
5. scripts/migration/ built from scratch (C-018 — doesn't exist)
6. Content-sanitize/reshape/rewrite primitives built in scripts/lib/ (C-013
   — doesn't exist)
7. Windows 0-byte persistence safety net hooks wired (NEEDS_GATE —
   track-agent-invocation.js result-size check per C-014)
8. JASON-OS must have a SoNash-equivalent sibling with enough CAS already
   ported on the *other* end to validate C3 "ported /migration in SoNash
   produces structurally identical results"
9. C6's round-trip step 3 (SoNash → JASON-OS) needs the `/migration` ported
   to SoNash to work, meaning SoNash needs to accept the `/migration` as a
   skill — but SoNash uses `/sonash-context` which is a Phase 5 REWRITE
   target per C-082

C6 is the *keystone* criterion but it requires all of this stack to be
solid. C3 ("structurally identical results") is a stronger bar — what does
"structurally identical" even mean when the two endpoints have known
100% divergence across 8 dual-resident skills per C-084? If every one of
those 8 skills diverges into 5 buckets (B1-B5 per D2-core-orchestration),
asking for "structurally identical results" is asking the tool to be
successful at the hard problem by definition.

C1-C2 (produces + executes own plan targeting SoNash) is already ambitious.
C3 is the problem re-asked as the test. C4 back-direction is undesigned in
D5 (see Challenge 6). C5 empty-diff requires a stable baseline. C6 requires
C3 + C4. You don't get C3 for free from C1-C2.

**Evidence:**
- RESEARCH_OUTPUT.md:84-92 — three shift-risk-1 blockers + medium-risk blockers enumerated
- RESEARCH_OUTPUT.md:278-284 — M0-M5 milestone table
- RESEARCH_OUTPUT.md:287 — "implementation sequencing depends on CAS port feasibility as first-real-job" flagged as MEDIUM-HIGH
- claims.jsonl C-084 — 100% divergence of 8 dual-resident skills
- D5-reshape-pipeline.md:197 — only worked walkthrough is SoNash → JASON-OS direction
- RESEARCH_OUTPUT.md:270 — "v1 acceptance bar: Criteria 1-5 + C6 (round-trip). C7 (zero-drift) and full CI harness deferred to v1.1" — this is scope reduction but all the hard criteria remain

**Recommendation:**
- Rescope v1 acceptance to **C1 + C2 only**. That's already ambitious ("produces own plan + plan executes cleanly in SoNash").
- Move C3 (structurally identical results) to v1.1. Redefine from "structurally identical" (subjective, forces success) to an observable metric like "passing /skill-audit on both sides with no NEW warnings compared to source."
- Move C4 (back-direction) to v1.2. It requires D5 to be re-derived symmetrically (see Challenge 6).
- Move C5-C7 to v1.2+.
- The current v1 bar as written bundles 6 hard criteria together; one failure invalidates the release. Scope to 2.

---

### Challenge 6 — D16 "both-direction from v1" is undesigned; D5 reshape heuristics work only one way

**Severity:** CRITICAL
**Target claim:** C-022 (3-source hybrid idiom detection) + C-021 (9 signal detectors) + D16 "Full both-direction build from v1" (BRAINSTORM.md:70)

**Steel-man:** D16 locks direction symmetry. The reshape pipeline is in
principle direction-agnostic — idiom detection scans the *destination* for
authoritative idioms regardless of which side that is. The signal detectors
key off destination-absent imports, destination-incompatible schema, idiom
deviation — all relative to the destination, not to a fixed "source repo."
Transformation primitives P1-P11 are mostly generic (copy-bytes,
regex-replace, string-rename, etc.) — none are inherently SoNash-centric.

**Challenge:** Grep `D5-reshape-pipeline.md` for "reverse|bidirection|both
direction|symmetric|backward" returns **zero matches**. The sole worked
walkthrough (D5 §6) is titled "`audit-code` SoNash → JASON-OS." Primitive P9
schema-rebind is literally described as "SoNash Zod schema → JASON-OS-agnostic
equivalent" — not "cross-repo schema swap," but a specifically-named
reverse. Primitive P3 example is `{"SoNash": "JASON-OS", ...}` — hard-coded
directional mapping.

More structurally: signal S1 (hardcoded home-paths → sanitize) and S2
(repo-name strings → sanitize) depend on knowing what "home" *means*. For
SoNash→JASON-OS, home-paths in SoNash source get sanitized when entering
JASON-OS. For JASON-OS→SoNash, the signal fires on completely different
paths. The *heuristic* is direction-agnostic but every concrete
instantiation of it in D5 is written one way.

D16's declaration (BRAINSTORM.md:70): "Self-dogfood is a test, not a design
crutch" — the opposite has actually happened. Research was directed at one
direction (SoNash → JASON-OS — the origin use case per BRAINSTORM.md:14)
and the back-direction is treated as a symmetric extension ("D16 implies" —
C-055 criterion C4). The round-trip C6 criterion is treated as the single
strongest signal of symmetry, but round-trip can pass *without* the pipeline
actually handling JASON-OS→SoNash well if JASON-OS starts sparse and ends
sparse (trivial round-trip that doesn't exercise the hard primitives).

"Back-direction works: SoNash → JASON-OS independently" — wait, this is the
same direction as the forward case. C4 in RESEARCH_OUTPUT.md:263 reads:
"**C4** — Back-direction works: SoNash → JASON-OS independently (implied by
D16)". But the *origin* direction IS SoNash → JASON-OS. The back-direction
should be JASON-OS → SoNash. This is either a typo or evidence that the
synthesis has confused which direction is "primary" vs "reverse" — both
readings indicate the symmetry claim is not load-bearing on the synthesizer.

**Evidence:**
- `D5-reshape-pipeline.md:197` — only worked walkthrough is SoNash → JASON-OS
- `D5-reshape-pipeline.md:134` — P3 example: `{"SoNash": "JASON-OS", ...}` one-way
- `D5-reshape-pipeline.md:140` — P9 "SoNash Zod schema → JASON-OS-agnostic equivalent"
- Zero matches for `reverse|bidirection|both direction|symmetric|backward` in D5
- `RESEARCH_OUTPUT.md:263` — C4 criterion reads "Back-direction works: SoNash → JASON-OS" (same direction as forward case — likely typo but symptomatic)
- BRAINSTORM.md:70 — D16 "full both-direction build from v1"
- Only 3 total occurrences of "JASON-OS → SoNash" in the entire 552-line RESEARCH_OUTPUT, all three in the C6 round-trip discussion

**Recommendation:**
- Downgrade C-022 and C-021 from HIGH to MEDIUM (heuristics exist; direction-symmetric-instantiation is unproven).
- Commission a D5-reverse sibling finding that re-runs D5's 9-signal + 11-primitive + walkthrough exercise with JASON-OS → SoNash as the explicit case, specifically testing whether the same primitives apply or new ones emerge (e.g. a "helper-strip" primitive that removes JASON-OS-only infrastructure when going back to SoNash).
- Defer D16 symmetry from v1 to v1.1 explicitly — acknowledge self-dogfood exercises only the forward direction for v1.
- Fix the C4 text: "Reverse-direction works: JASON-OS → SoNash independently" (replace the current typo).

---

### Challenge 7 — Agent roster of 8 new custom agents is overhead-heavy vs collapsed `general-purpose` alternative

**Severity:** MAJOR
**Target claim:** C-009 (5-8 new custom agents) + D1-migration-agent-spec proposed roster of 8-new/6-reused

**Steel-man:** Eight custom agents give clean separation of concerns: distinct
tool grants per agent (sanitizer gets regex tools; rewriter gets WebFetch +
opus), auditable per-agent gate traces, opus justified for the highest-risk
rewrite verdict. The D1-migration-agent-spec author explicitly argues
"Collapsing them into one 'transformer' would muddy tool grants, gate
design, and failure-recovery semantics" (D1-migration-agent-spec.md:19).
Separating verdict-assigner from discovery-scanner enables contrarian
cross-check per D8 "nothing silent." Re-using 6 existing agents cuts the new
surface area meaningfully.

**Challenge:** D1-agents-jason-os offers a much smaller alternative: use the
`pre-commit-fixer` pattern of `subagent_type: 'general-purpose'` for
transformation dispatch — which is the **only** in-code precedent for
transformation-oriented agent dispatch in JASON-OS (C-005, verified at
`pre-commit-fixer/SKILL.md:168-170`). That would reduce the new-agent count
from 8 to 1 (`migration-executor`) or even 0 (inline general-purpose
dispatch). Against this:

- Each new agent is an `.md` file that must be written, audited per
  skill-audit's 12-category rubric (C-058), and maintained. 8 agents × median
  ~300 lines = ~2,400 lines of new agent definition to write and validate.
- Tool grants per-agent are a real benefit only if the tool set differs
  meaningfully. But sanitizer/reshaper/rewriter/executor all declare
  `Read, Write, Edit, Bash, Grep, Glob` per D1-migration-agent-spec Table
  rows 37-40 — identical except rewriter adds `WebSearch, WebFetch, Context7
  MCP`. Three identical-tool agents is not three agents — it's three prompts.
- JASON-OS currently has 8 agents total (C-001). Doubling the agent inventory
  for a single skill's execute-phase is a significant governance cost,
  especially when skill-audit's rubric has to run on each.
- The "opus for rewrite" justification is plausible but costs real money.
  D1-migration-agent-spec Table column "Model" shows `sonnet` for all new
  agents except rewriter which shows "opus (or sonnet)." The model choice is
  orthogonal to agent count — a single `migration-executor` could dispatch
  sub-tasks to opus via `general-purpose` invocation with a model hint.

RESEARCH_OUTPUT itself concedes at line 65 that "A simpler collapse is
possible: single `migration-executor` using the `general-purpose` built-in
pattern." The synthesizer prefers the expanded roster but the contradiction
with the in-code precedent (pre-commit-fixer) isn't scored — the research
output picks the more expensive architecture without a cost/benefit line.

**Evidence:**
- RESEARCH_OUTPUT.md:65 — simpler collapsed architecture is explicitly acknowledged as viable
- RESEARCH_OUTPUT.md:341 — "MEDIUM confidence each" for agent-count split architecture
- claims.jsonl C-005 — the only in-code precedent is `pre-commit-fixer` general-purpose pattern (HIGH verified)
- claims.jsonl C-009 — "5-8 new custom agents" MEDIUM confidence
- D1-migration-agent-spec.md:37-40 — rows show 4 agents with identical tool grants (sanitizer/reshaper/rewriter/executor all `Read, Write, Edit, Bash, Grep, Glob`)
- CLAUDE.md §7 at jason-os: no precedent for doubling agent inventory for a single skill

**Recommendation:**
- Downgrade C-009 from MEDIUM to MEDIUM-LOW (current preferred architecture is not justified vs precedent).
- Default to the **collapsed architecture**: one new `migration-executor` agent + retain 6 reused. Ship v1 that way.
- Defer split agents (sanitizer/reshaper/rewriter as separate) to v1.1, and only if real operational evidence shows the collapsed version is muddying gate traces.
- Explicitly invoke in-code precedent (CLAUDE.md §4 #16 "Follow skills exactly" analog for architecture: follow existing in-code transformation patterns, don't invent a new one).
- Cost/benefit line: every new custom agent = ~300 LOC + skill-audit rubric run + maintenance + documentation. Total opex for 8 agents ≈ 2 weeks additional work over the v1 milestone, which pushes M4 out to weeks 6-7. Is that worth it for cleaner audit traces?

---

### Challenge 8 — ITERATION_LEDGER recommendation's "<5% of cost" is unquantified; D-number collision evidence is thin

**Severity:** MINOR
**Target claim:** C-061 ("Full ADR system is overkill; lightweight meta-ledger at <5% of cost") + Theme 10 "3 coherence failures after only 2 iterations"

**Steel-man:** The BRAINSTORM/RESEARCH_OUTPUT/PLAN triad already shows
namespace overload — D11 means three different things (dropped direction,
meta-ledger research question, this agent's filename). A lightweight
append-only ITERATION_LEDGER.md is an extremely cheap fix (one markdown
file, no tooling) that addresses all three current coherence failures.
Precedent is well-known: ADR supersede chain, IETF RFC-bis, Microsoft
Decision Log pattern. Not adopting it now pushes the cost to iteration 5+
when the prose structure has become unreadable.

**Challenge:** The D-number "collision" is structural namespace overlap between
three distinct scopes (decision, research-question, agent-file-name). It's
not actually a collision in any semantic sense — no one tries to look up
"D11" without knowing which scope. V1-jason-os-infra.md:85-86 flags that
C-061's "<5% of cost" is unsubstantiated — D11 finding does not quantify
the comparison. The two other cited "coherence failures" (implicit
re-entry provenance, narrative-only cross-artifact coherence) are also
anticipatory — they describe problems that *would* emerge at 5 iterations,
not problems that are breaking the current 2-iteration state.

Adopting ITERATION_LEDGER.md *now* is a Chesterton's Fence argument: the
current structure hasn't actually caused a problem the synthesis can cite
on filesystem. The "3 coherence failures visible after only 2 iterations"
reads as alarming but on inspection it's "we notice that if we keep doing
this for 5 more iterations, we'd be in trouble." That's reasonable
speculation but not a load-bearing finding to commit to new scaffolding.

**Evidence:**
- V1-jason-os-infra.md:85-86 — "<5% of cost" flagged as unsubstantiated
- V1-jason-os-infra.md:126 — C-061 "Keep MEDIUM" + "flagged as unsubstantiated for text softening"
- RESEARCH_OUTPUT.md:297-299 — "three coherence failures" but all three are anticipatory, not observed
- claims.jsonl C-059 HIGH confidence for "3 coherence failures after only 2 iterations" — but V1 verifies the D-number collision as factually true, not as load-bearing problem
- Zero evidence in claims.jsonl that any downstream consumer (deep-plan, GSD, tdms) has been confused by the D11 overlap in practice

**Recommendation:**
- Downgrade C-061 from MEDIUM to MEDIUM-LOW; soften "<5% of cost" to "substantially less cost" or delete the quantification.
- Downgrade the framing of "3 coherence failures after only 2 iterations" from HIGH-evidence to "anticipatory risk."
- Adopt ITERATION_LEDGER.md at the **third** iteration trigger (when a researcher or planner explicitly requests it), not preemptively at iteration 2. Keep the proposed schema on deck for that moment.
- Alternatively: rescope Recommendation #7 from "write ITERATION_LEDGER.md" to "write a single DECISION_INDEX.md row per locked decision with scope-prefix (DEC-XX vs RQ-XX vs AGENT-XX)" — this solves the collision without standing up a second coordination artifact.

---

## Weakened claims

| Claim ID | Current conf | Proposed conf | Reason (short) |
|---|---|---|---|
| C-009 | MEDIUM | **MEDIUM-LOW** | 8-new-agents preferred architecture not justified vs `general-purpose` in-code precedent (Challenge 7) |
| C-021 | HIGH | **MEDIUM** | Signal detectors exist; direction-symmetric instantiation unproven (Challenge 6) |
| C-022 | HIGH | **MEDIUM** | Idiom detection 3-source hybrid assumes destination idioms discoverable; back-direction undesigned (Challenge 6) |
| C-035 | HIGH | **MEDIUM** | Already flagged CONFLICTED by V3 (verdict distribution numbers wrong); V3 proposes MEDIUM-HIGH, contrarian concurs but MEDIUM is safer |
| C-042 | MEDIUM | MEDIUM (no change) | Keep as "recommended" per V4; flag as not-resolved in synthesis prose (Challenge 1) |
| C-044 | MEDIUM | **MEDIUM-LOW** | Boundary heuristic is within-cluster tiebreaker, not independent resolution (Challenge 1) |
| C-055 | HIGH | **MEDIUM** | 7 criteria sound; v1 bar including C3 + C6 is overambitious given prereq depth (Challenge 5) |
| C-057 | MEDIUM | **MEDIUM-LOW** | v1 acceptance bar bundles 6 hard criteria; rescope to C1-C2 only (Challenge 5) |
| C-061 | MEDIUM | **MEDIUM-LOW** | "<5% of cost" unsubstantiated per V1; 3 coherence failures are anticipatory not observed (Challenge 8) |
| C-062 | HIGH | **MEDIUM-HIGH** | Local-only is enforceable at design level; relies on honor-only discipline for stray push / hook / pre-push scenarios (Challenge 4) |
| Zero-auth-deps claim (V3:37-39, D6-cas-integration) | VERIFIED | **VERIFIED-NARROW** | Grep covered `scripts/cas/*.js` only, not skill bodies which use `gh api` + `git clone` (Challenge 2) |

---

## New claims surfaced by challenge

**NC-01 — CAS `/repo-analysis` port requires D29 exception or aggressive
network-stripping reshape.** `/repo-analysis/SKILL.md:69,174,179,429` and
`REFERENCE.md:51,1285,1675,1682` contain networked `gh api` + `git clone
--depth=1` + `git fetch --unshallow` + external securityscorecards.dev API
calls that directly contradict D29 local-only. **Confidence:** HIGH
(file:line verified). **Recommended routing:** deepPlan=true, gsd=true,
convergenceLoop=true, memory=true, tdms=true.

**NC-02 — Bootstrap inversion: CAS-Tier-0 (schemas+lib+scripts) must be
hand-ported BEFORE `/migration` v0 exists; CAS-Tier-1 (handler skills)
becomes the first-real-job.** The current M2 "use `/migration` v0 to port
CAS" milestone is circular because `/migration` v0 cannot run without CAS
present. **Confidence:** HIGH. **Recommended routing:** deepPlan=true,
gsd=true, tdms=true.

**NC-03 — `/migration` v1 pre-flight must check remote-coupled dirty states
beyond D12's current 13-category matrix.** Remote-tracking states (local
ahead/behind, rebase-in-progress, FETCH_HEAD recent, submodules, pre-push
hooks armed) are not covered. **Confidence:** MEDIUM-HIGH (gap analysis vs
D12-local-auth-perms). **Recommended routing:** deepPlan=true, gsd=true.

**NC-04 — D5 reshape pipeline is directionally asymmetric as written;
JASON-OS → SoNash back-direction needs a parallel D5-reverse finding before
C4/C6 self-dogfood criteria are meaningful.** Zero occurrences of
reverse/bidirection/symmetric in D5-reshape-pipeline.md. **Confidence:**
HIGH. **Recommended routing:** deepPlan=true, brainstorm re-entry trigger
candidate.

**NC-05 — v1 acceptance bar should rescope from C1-C5+C6 to C1+C2 only.**
The current bar bundles 6 hard criteria with circular dependencies; rescoping
makes v1 observable and shippable. **Confidence:** MEDIUM-HIGH.
**Recommended routing:** deepPlan=true, brainstorm re-entry.

**NC-06 — Synthesis commits to three distinct shapes in three different
sentences.** Exec Summary (line 14), Theme 1 Recommendation (line 53), and
Recommendation #1 (line 379) name different architectures. Requires
synthesis pass to pick one framing. **Confidence:** HIGH (file:line verified
in RESEARCH_OUTPUT). **Recommended routing:** deepPlan=true (text correction).

---

## Severity distribution

- CRITICAL: 3 (Challenges 2, 3, 6) — each would invalidate v1 approach if
  unfixed
- MAJOR: 4 (Challenges 1, 4, 5, 7) — significant findings need revision
- MINOR: 1 (Challenge 8) — single-claim caveat

---

## Return values (for orchestrator)

- **Challenge count:** 8
- **Weakened-claims count:** 11 (10 with explicit downgrade + 1 re-scoped
  "zero-auth-deps" finding)
- **New-claims-surfaced count:** 6 (NC-01 through NC-06)
- **Findings path:** `C:\Users\jbell\.local\bin\JASON-OS\.research\migration-skill\challenges\contrarian.md`
- **Critical challenges:** Challenge 2 (CAS auth/network contradiction),
  Challenge 3 (bootstrap circular dep), Challenge 6 (D16 asymmetry)
- **Recommended Phase 4 re-synth actions:**
  1. Fix the three-sentence architecture contradiction (Challenge 1)
  2. Split CAS port into Tier 0 (hand-port) and Tier 1 (via /migration) —
     update M2 and Recommendation #2 (Challenge 3)
  3. Commission D5-reverse sub-agent for JASON-OS→SoNash direction (Challenge 6)
  4. Rescope v1 acceptance bar to C1+C2 only (Challenge 5)
  5. Reconcile CAS `/repo-analysis` network surface with D29 local-only
     (Challenge 2 + NC-01)

**End contrarian challenge report.**
