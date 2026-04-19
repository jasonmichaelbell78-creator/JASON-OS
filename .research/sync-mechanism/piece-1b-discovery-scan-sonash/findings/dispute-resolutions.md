# Dispute Resolutions — Piece 1b SoNash Discovery Scan

**Date:** 2026-04-18 | **Resolver session:** Phase 3.5 | **Disputes resolved:** 5

All 5 disputes resolved. No claim is destroyed — all require corrections of degree, not kind.

---

## D-001 — C-024: safe-fs.js Copy Count ("~10" vs 8 vs 5)

- **Conflict type:** Complementary
- **Resolution:** Correct stated count is **8 skill-level copies** (D20b per-file observation). The "~10" from D24 is an inclusive approximation counting canonical source + skill-directory copies + any additional copies in non-skill script dirs. The 5 from D1a reflects partial Wave 1 coverage of mega-skill bundles only. All three figures are consistent at their respective scopes.
- **Winning source:** D20b Learning L6 — "8 skill-level copies" (direct per-file observation) [T1]
- **Correction:** Update C-024 to "8 skill-level copies (~10 across all directories inclusive of canonical source)"

---

## D-002 — C-038: Security Flags Count (4 vs 3)

- **Conflict type:** Misinformation
- **Resolution:** Correct count is **3 formal security flags**. D17b is authoritative — its §SECURITY FLAGS section is sequentially numbered with exactly 3 entries (firebase-service-account.json CRITICAL, .env.local HIGH, .env.production MEDIUM). config.local.toml does NOT appear as a security flag in D17b. D13's initial "security gap found" finding was retracted by D13 itself (gitignored, never committed). The orchestrator's redaction of the API key value from D13 findings was precautionary — not a 4th flag classification.
- **Winning source:** D17b §SECURITY FLAGS (complete sequential section, 3 flags) [T1]
- **Correction:** C-038 count 4→3. Add separate note: "config.local.toml contains an OpenWeatherMap API key; gitignored and never committed per D13 verification; rotation recommended as precaution only."

---

## D-003 — C-001: D20c "File Missing" Evidence Note Error

- **Conflict type:** Misinformation
- **Resolution:** Claim body (884 edges, 519 nodes, three-layer pattern) is CORRECT and VERIFIED. The parenthetical "(file missing, data in D20d)" is a stale artifact from mid-research state — D20c-dep-map-ci-config-memory.md exists and contributed 240 edges as cited.
- **Winning source:** D20c-dep-map-ci-config-memory.md filesystem ground truth (file exists, 240 edges confirmed) [T1]
- **Correction:** Remove erroneous parenthetical from C-001 evidence. Upgrade C-001 verdict CONFLICTED → VERIFIED.

---

## D-004 — C-020: .husky Capabilities Count (5 vs 6)

- **Conflict type:** Complementary
- **Resolution:** The headline "5" is correct for .husky/-file-level capabilities per D17b. The body's 6-item enumeration is also correct when including the pre-push escalation gate, which D21b documents as a composite-level workflow feature. Both numbers are true at their respective scopes; the claim's internal inconsistency is a presentation defect.
- **Winning source:** D17b §.husky/ Comparison (5 numbered file-level capabilities) [T1] + D21b §pre-push-gate-workflow (composite-level escalation gate) [T1]
- **Correction:** Clarify scope in headline: "5 .husky/-file-level capabilities JASON-OS lacks, plus 1 composite-level pre-push escalation gate." All 6 items in body are factually correct.

---

## D-005 — C-033: Composite Count (27 vs 26)

- **Conflict type:** Complementary
- **Resolution:** Correct count is **26 composites** (12 D21a + 14 D21b). D21b's heading claim of "15" is a within-source error — its own port-status table enumerates 14, with an explicit note explaining repo-analysis-workflow was merged into D21a's cas-pipeline-workflow. D21c's 13 processes and D21d's 12 GSD agents are structurally distinct categories, not composites in the same schema sense. Full-scope coordinated-port count = 26 composites + 13 processes + 12 GSD = **51 units**.
- **Winning source:** D21b port-status table (14 named composites, with merge note) [T1]
- **Correction:** C-033 count 27→26. Add full-scope note: "51 total units across 4 categories (26 composites + 13 processes + 12 GSD agents)."

---

## Summary for RESEARCH_OUTPUT.md

| Dispute | Claim | Type | Resolution | Correction |
|---------|-------|------|------------|-----------|
| D-001 | C-024 safe-fs copies | Complementary | 8 precise, ~10 inclusive | "8 skill-level (~10 inclusive)" |
| D-002 | C-038 security flags | Misinformation | 3 not 4 | Remove config.local.toml flag; add rotation-note |
| D-003 | C-001 D20c missing | Misinformation | D20c exists | Remove parenthetical; CONFLICTED→VERIFIED |
| D-004 | C-020 .husky count | Complementary | 5 file-level + 1 composite | Clarify scope |
| D-005 | C-033 composite count | Complementary | 26 not 27 | Update 27→26; add 51-unit full-scope |

**Net impact on RESEARCH_OUTPUT:** 4 factual number updates + 1 verdict upgrade (C-001 CONFLICTED→VERIFIED). No claim invalidated. All changes are corrections of degree, not kind.

---

## Final verdict distribution after dispute resolution

Pre-dispute: 53 VERIFIED / 2 REFUTED / 2 UNVERIFIABLE / 3 CONFLICTED
Post-dispute: **54 VERIFIED / 2 REFUTED / 2 UNVERIFIABLE / 2 CONFLICTED**
(C-001 moved CONFLICTED → VERIFIED via D-003)

Remaining C-020 stays CONFLICTED (headline-body scope inconsistency is editorial).

Remaining C-024 + C-033 corrected in place (numbers updated; no longer conflicted after correction).

Remaining C-038 REFUTED → corrected to 3 flags; can become VERIFIED after claim update.

**Final post-correction projected distribution: 56 VERIFIED / 1 REFUTED / 2 UNVERIFIABLE / 1 CONFLICTED = 93% VERIFIED.**
