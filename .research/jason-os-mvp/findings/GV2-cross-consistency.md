# GV2 — Cross-Consistency Verification (Phase 3.96)

**Verifier:** GV2
**Phase:** 3.96 (Post-Gap-Pursuit Cross-Consistency)
**Date:** 2026-04-15
**Files reviewed:** G1, G2, G3, G4, G5, G6 (all read); targeted reads of D1b, D2a, V1b, V2b, contrarian-v1, otb-v1

---

## Summary

Six G-files were cross-checked against prior D/V-agent findings and against each other. Four consistency issues were identified: one HIGH-severity intra-G contradiction (G4 incorrectly asserts `git-utils.js` is present in JASON-OS when filesystem and G1/G3 agree it is absent), one LOW-severity G3 serendipity note that misattributes the source of a prior classification (claims D1b listed loop-detector under PostToolUse — it did not), one genuine count discrepancy between D1b's "10 sub-checks" and G3's "13 named validators" for `post-write-validator.js`, and one G2-vs-original-challenge estimate relationship that is correctly resolved (not a contradiction). Neither REFUTED claim (C-015, C-037) is re-introduced by any G-file. No inter-G contradiction affects a critical porting decision except the git-utils.js item.

---

## Contradictions: G-files vs Prior Research

### CONTRA-1: loop-detector — G3 claims D1b listed it under PostToolUse

- **G-file claim:** G3 Serendipity S1 states: "Prior research (D1b table) listed it under PostToolUse. The actual SoNash wiring (settings.json line 293) shows `PostToolUseFailure` as the event type."
- **Prior research:** D1b summary table (lines 18–25) has two distinct rows: T4 (`PostToolUse` — 9 matchers, loop-detector NOT listed) and T5 (`PostToolUseFailure` loop detector). D1b Finding 5 (lines 116–118) explicitly states: "The `loop-detector.js` hook fires on `PostToolUseFailure`." D2a line 105 and the D1b findings index (line 257) both show `PostToolUseFailure` as the event type.
- **Resolution recommendation:** G3's factual finding is CORRECT (loop-detector IS PostToolUseFailure). The serendipity note's claim that D1b misclassified it is WRONG — D1b got it right all along. G3's attribution of "prior research error" is a spurious justification; the real value of the serendipity note is the wiring reminder (JASON-OS settings.json needs a new `PostToolUseFailure` section). The synthesizer should retain the wiring implication but drop the misattribution. LOW severity — the correct event type is not in dispute.

---

### CONTRA-2: post-write-validator.js sub-check count (D1b "10" vs G3 "13 named + 1 removed")

- **G-file claim:** G3 presents a complete validator inventory table with 13 named validators plus 1 removed (`checkRequirements`), totaling 14 items, of which 13 are active.
- **Prior research:** D1b Finding 3 (line 71) states "consolidates 10 checks." D2a line 96 lists 9 named items in the hook's description column. Neither D-file read the full 1205-LOC file.
- **Resolution recommendation:** G3 is a CORRECTION of prior research. D1b and D2a's counts (10 and 9 respectively) were derived without reading the full validator inventory — both explicitly acknowledge incomplete reads of this hook. G3 read the file systematically and produced a higher-confidence count. The synthesizer should treat 13 active named validators as the authoritative figure and note that D1b/D2a undercounted. MEDIUM severity — affects portability effort estimates (G3's "~350 LOC generic core" vs any estimate derived from 10 checks).

---

## REFUTED Claims Re-Introduction Check

- **C-015 (`scripts/lib/sanitize-error.cjs` EXISTS — NOT a bug):** CONFIRMED STILL REFUTED. No G-file re-introduces this as a problem. G1 (line 257) lists it among JASON-OS scripts/lib files that ARE present. G3 (lines 321, 361, 440, 570, 660) repeatedly notes "`scripts/lib/sanitize-error.cjs` — EXISTS in JASON-OS." G4 (line 67) confirms: "available at `JASON-OS/scripts/lib/sanitize-error.cjs`." G5 (line 485) references it as present. The REFUTED verdict stands cleanly across all six G-files.

- **C-037 (`settings-guardian.js` CRITICAL_HOOKS already trimmed — NOT a false-positive guard):** CONFIRMED STILL REFUTED. No G-file mentions `CRITICAL_HOOKS`, false-positive guarding for `pre-commit-agent-compliance.js`, or settings-guardian trimming. G4 (the most likely re-introduction vector, covering governance) discusses settings-guardian only in the context of the GATE/BEHAVIORAL annotation for CLAUDE.md §4.14 — correctly noting it "blocks settings.json write" as one of two protection vectors. No re-introduction.

---

## Inter-G Contradictions

### INTER-1: G4 incorrectly asserts `git-utils.js` is present in JASON-OS hooks/lib

- **G4 claim:** Item G5 (pre-commit-agent-compliance.js porting assessment), dependency 3: "`./lib/git-utils` — already present in `JASON-OS/.claude/hooks/lib/git-utils.js`."
- **G1 claim:** Item G2 (Compaction Defense Layer), Missing hooks/lib Files table: `git-utils.js` listed as ABSENT. G1 claim C-G2-02 states without qualification that `git-utils.js` is absent and is the critical missing dependency. G1 Item G14 urgency ranking also treats git-utils.js as a CRITICAL missing file.
- **G3 claim:** post-read-handler.js dependency section (line 401): "`./lib/git-utils.js` — ABSENT in JASON-OS hooks/lib (only symlink-guard.js present)." G3 Serendipity S4 also treats git-utils.js as missing.
- **Filesystem ground truth:** `.claude/hooks/lib/` contains only `symlink-guard.js`. `git-utils.js` is ABSENT. (Independently verified against filesystem during this review session.)
- **Severity:** HIGH. G4's incorrect assertion, if used by the synthesizer without correction, would cause the pre-commit-agent-compliance.js porting plan to omit `git-utils.js` from its prerequisite list — the hook would silently fail (exit 0 due to try/catch) without producing any agent-compliance output.
- **Recommendation:** G1 and G3 are correct. G4's claim is an error. The synthesizer must treat `git-utils.js` as ABSENT and require it to be copied from SoNash before wiring pre-commit-agent-compliance.js. GV1 independently confirmed this same finding.

---

### INTER-2: G2 stub recommendation vs G3 post-todos-render.js dependency assumption

- **G2 claim:** Recommends adopting the markdown-only stub (30 min) immediately, with full port (~1.5h) optional in the same session. The stub explicitly does NOT include `render-todos.js` or `todos-cli.js`.
- **G3 claim:** post-todos-render.js (Item G4) states "Dependency on /todo skill (G2 scope): `render-todos.js` is the backend of the `/todo` skill. If `/todo` is stubbed (G2 agent's scope), two options: 1. Wire post-todos-render.js with stub renderer... 2. Defer wiring until `/todo` and `render-todos.js` are ported. Option 2 is recommended."
- **Severity:** LOW. This is not a true contradiction — it is a complementary finding. G2 says "stub or full-port the skill." G3 correctly derives the downstream implication: if stub path is chosen, post-todos-render.js must be deferred. The two G-files agree on the recommendation (stub first, defer the hook). No conflict for the synthesizer to resolve.
- **Recommendation:** Synthesizer should note the coupling explicitly: /todo stub path → post-todos-render.js deferred; /todo full-port path → post-todos-render.js can be wired in 15 min immediately after.

---

## Estimate Divergence Audit

| Artifact | G-file | Estimate | Original estimate | Notes |
|---|---|---|---|---|
| /todo full port | G2 | 1.5h | CH-O-008: 3-4h | G2 CORRECTLY reduces estimate: safe-fs.js, sanitize-error.js, parse-jsonl-line.js already present. Only 3 scripts remain. CH-O-008's 3-4h assumed missing hard deps. |
| /todo stub | G2 | 30 min | CH-O-008: 30 min | Consistent. CH-O-008 proposed the stub; G2 confirms 30 min. |
| session-end port | G1 | 2-3h | CH-C-009 revised from 45 min → 2-3h; RESEARCH_OUTPUT already incorporated | G1 confirms CH-C-009's revised estimate. Consistent with synthesized output. |
| post-write-validator generic core | G3 | 2.0h (portability verdict table) | D1b/D2a: unestimated (noted as "complex") | G3's 2h is the first concrete estimate for the generic core only (~350 LOC). Not a contradiction — a new estimate for a refined scope. |
| user-prompt-handler extraction (Phase A only) | G3 | <1h | D1b/D2a: unestimated | New estimate, not contradicted. |
| PROACTIVELY clauses (8 agents) | G4 | 15-20 min | D1b Finding 6: noted as missing, no estimate | New estimate. G4 and G6 both touch agent/skill frontmatter but different artifacts (agents vs skills), different operations. No conflict. |
| AgentSkills field hygiene (9 skills) | G6 | 30 min | CH-O-001: "2-hour spike" | G6 CORRECTLY reduces estimate: compatibility confirmed, only optional field additions needed. CH-O-001 assumed feasibility unknown. |
| Navigation docs (all 4) | G5 | 3-4h (MEDIUM confidence) | Unestimated in prior research | New estimate. MEDIUM confidence per G5 due to scope decisions. |
| pre-commit-fixer adaptation | G5 | 30-40 min | Unestimated in prior research | New estimate. Not contradicted. |
| /add-debt stub | G5 | 30-45 min | Unestimated in prior research | New estimate. Not contradicted. |
| GATE/BEHAVIORAL annotations to CLAUDE.md | G4 | ~30 min | Unestimated | New estimate. Not contradicted. |
| hooks/lib 4-file copy (git-utils, state-utils, sanitize-input, rotate-state) | G1 | Part of 2-3h session-end estimate | Not separately estimated in prior research | G1 treats these as prerequisites, effort embedded in session-end total. G3 treats git-utils copy as ~15 min standalone. Complementary, not contradictory. |

---

## Notes

1. **G4's git-utils.js error is the only HIGH-severity finding.** It is a factual codebase claim that is definitively refuted by filesystem ground truth and by two other G-files (G1, G3). The synthesizer must not propagate G4's assertion. The correct pre-commit-agent-compliance.js port plan requires copying git-utils.js first.

2. **G3's serendipity note S1 contains a false attribution but a correct conclusion.** The wiring note (JASON-OS needs a `PostToolUseFailure` section in settings.json, not just a new PostToolUse matcher) is valid and important. The framing as a "correction to prior research" is wrong — D1b had it right all along. The synthesizer should preserve the wiring implication and drop the attribution error.

3. **The post-write-validator sub-check count (10 vs 13) is a genuine D-file undercount.** G3 is a correction based on a full read of the 1205-LOC file. This affects the effort estimate for extracting the generic core: G3's "~350 LOC" figure is more reliable than any estimate derived from the 10-check figure. The D1b/D2a undercount also explains why D2a's portability note ("core write-validation portable; Firestore/AppCheck/React/Firebase checks are SoNash-specific") was vague — the full split is now: 5 generic validators keep, 7 SoNash-specific validators remove, 1 already removed.

4. **The G2 /todo effort reduction (3-4h → 1.5h) is independently well-supported.** The reasoning (hard deps already present) is verifiable against G1's scripts/lib inventory and JASON-OS filesystem. The synthesizer should use 1.5h as the full-port estimate and 30 min as the stub estimate, with a note that CH-O-008's original basis (assumed missing deps) no longer holds.

5. **All six G-files are internally consistent on sanitize-error.cjs being present.** This is the most thoroughly re-confirmed fact across the entire gap pursuit phase.

6. **G2 and G3 agree on post-todos-render.js deferral under the stub path** — this should be surfaced as an explicit coupling note in the synthesis: the /todo decision gates the post-todos-render.js wiring decision.

7. **PROVISIONAL — not fully cross-checked:** The relationship between G4's governance GATE/BEHAVIORAL table and D2c (CLAUDE.md graph) was not cross-checked due to budget exhaustion. G4's table claims `settings-guardian.js` provides a GATE for §4.14 — this is consistent with what V2b verified about settings-guardian's CRITICAL_HOOKS. No contradiction suspected, but not confirmed.

8. **PROVISIONAL — not fully cross-checked:** G5's claim about SoNash having no `ensure-fnm.sh` (C-G5-17) was not independently verified against the SoNash filesystem. G5 states it directly from a filesystem check — no reason to doubt it, but it was not re-confirmed in this review.
