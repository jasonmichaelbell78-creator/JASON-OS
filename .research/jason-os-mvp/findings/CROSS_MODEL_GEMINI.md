# Cross-Model Verification via Gemini CLI (Phase 4)

**Date:** 2026-04-15
**Gemini CLI version:** 0.34.0
**Model:** Gemini (default via cached credentials)
**L1 scope:** Top 5 HIGH-confidence claims (4 attempted, C-G1 skipped — already resolved by G6)

---

## Results

### C-039: Auto-Memory Injection Mechanism + 200-Line Limit

**Verdict:** AGREE
**Confidence:** HIGH

**Gemini evidence:**
- Path `~/.claude/projects/<project-slug>/memory/MEMORY.md` confirmed as automatic injection point
- MEMORY.md loaded at conversation start, injected as hidden user message after system prompt
- 200-line limit confirmed via binary inspection of Claude Code tool (`var pZ = 200`)
- Individual topic files linked from MEMORY.md are NOT auto-injected — read on-demand by the model

**Impact on research:** C-039 remains MEDIUM confidence in our claims.jsonl (conservative — we can't independently verify the binary inspection claim). But Gemini's agreement with detailed evidence increases our subjective confidence. No confidence change required in claims.jsonl — the claim was already correctly caveated.

---

### C-009: user-prompt-handler.js runAnalyze() Portability — Ghost Directives

**Verdict:** AGREE
**Confidence:** HIGH

**Gemini evidence (independent reasoning, not codebase-dependent):**
1. "MUST use [agent_name]" for missing agents causes tool_not_found errors or failure loops
2. LLMs suffer "reasoning decay" when MUST constraints are environmentally unfulfillable
3. Porting hooks with unresolvable directives creates "ghost directives" in the model's world-model
4. Parameterization or "check-before-emit" logic is the standard engineering fix

**Impact on research:** Confirms G3's extraction plan (Phase A: port portable sub-functions, stub runAnalyze with agent-presence check). Our downgrade of C-009 from HIGH → MEDIUM is validated by independent cross-model reasoning. No claims.jsonl change needed.

---

### C-023: Skills Portability Classification (32/80) — Structural Analysis Sufficiency

**Verdict:** DISAGREE
**Confidence:** HIGH

**Gemini evidence (used our own research findings to argue against the claim):**
1. **Latent functional failures:** `/todo` skill classified as "portable" and ported, but gap pursuit (G2) found it completely non-functional — missing scripts not caught by structural analysis
2. **Explicit verification rejection:** V1b states "Sub-claim breakdown (32/28/11) is not filesystem-verifiable at this scope"
3. **Semantic vs syntactic coupling:** CH-C-001 warns of "SoNash-in-a-trenchcoat" — skills appear syntactically portable but remain semantically coupled to evolved patterns
4. **Structural undercounting:** post-write-validator 10→13 sub-check correction (30% error from grep-based structural analysis)
5. **RESEARCH_OUTPUT.md** itself assigns only MEDIUM confidence to the portability classification

**Impact on research:** This is the most valuable cross-model finding. Gemini independently reached the conclusion that structural analysis (grep + frontmatter review) is necessary but NOT sufficient for portability claims. The "32 of 80" figure should be treated as an **upper bound with known false-positives**. The synthesizer should add a caveat to any references to this figure. C-023 confidence should remain MEDIUM (already correctly caveated) or be downgraded to LOW if the figure is used for scoping decisions.

---

### C-031: PR-Retro Hard Gate Produces Behavioral Change

**Verdict:** TIMED OUT (Gemini still processing after ~10 min, likely to exceed backend timeout)

**Note:** Same pattern as C-023 — Gemini CLI reading codebase for context. This is a judgment question ("do hard gates produce real change vs theater in young repos?") not a factual claim. The BOOTSTRAP_DEFERRED.md already defers pr-retro for architectural coupling reasons, not effectiveness reasons.

**Self-audit note:** Skipped per §13. Not a research gap — the porting decision is driven by dependency analysis (pr-retro depends on pr-ecosystem-audit which is not ported), not by effectiveness claims.

---

### C-G1: AgentSkills Open Standard — SKIPPED

**Reason:** Already fully resolved by G6 gap-pursuit agent (web research). Standard confirmed at agentskills.io/specification, JASON-OS skills already structurally compliant, 30-min field-hygiene pass confirmed. GV1 independently verified via WebFetch. Cross-model verification would be redundant.

---

## Summary

| Claim | Gemini Verdict | Claude Assessment | Agreement? |
|---|---|---|---|
| C-039 (auto-memory) | AGREE HIGH | MEDIUM | ✅ Consistent (Gemini more confident, but from internal binary inspection we can't independently verify) |
| C-009 (runAnalyze portability) | AGREE HIGH | MEDIUM | ✅ Consistent (independent reasoning path reaches same conclusion) |
| C-023 (32/80 structural analysis) | **DISAGREE HIGH** | MEDIUM | ❌ **Cross-model disagreement** — Gemini argues structural analysis insufficient; "32 of 80" is an upper bound with known false-positives |
| C-031 (pr-retro hard gate) | INCONCLUSIVE | MEDIUM | ⚠️ Gemini read codebase but produced no verdict — porting decision driven by dependency analysis |
| C-G1 (AgentSkills) | SKIPPED | HIGH | ✅ Already resolved by G6 + GV1 |

**Cross-model bias assessment:** 3 of 4 queries produced verdicts. 2 AGREE (C-039, C-009), 1 **DISAGREE** (C-023), 1 inconclusive (C-031). The C-023 disagreement is the highest-value finding: Gemini independently identified that our "32 of 80 portable" figure overstates confidence in structural-only analysis. This is exactly the kind of same-model bias cross-model verification is designed to catch — Claude assessed its own structural analysis at MEDIUM confidence, but a more rigorous external eye flags it as potentially misleading if taken at face value. The figure should carry a "structural upper bound — runtime-verified subset is smaller" caveat in all downstream use (deep-plan, scope decisions).
