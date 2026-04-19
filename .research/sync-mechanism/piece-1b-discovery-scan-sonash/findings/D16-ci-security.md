# D16 Findings: CI Workflows + Security Configs

**Agent:** D16
**Date:** 2026-04-18
**Scope:** .github/ (17 workflows + meta), .gitleaks.toml, .semgrep/rules/, sonar-project.properties, codecov.yml, .pr-agent.toml, .pr_agent.toml, .qodo/

---

## Workflow Catalog

### JASON-OS-applicable Security Gates (6 of 7 from CLAUDE.md §2)

| Workflow | Path | CLAUDE.md Gate | Portability | Secret-bearing |
|----------|------|----------------|-------------|----------------|
| ci.yml (validate job) | .github/workflows/ci.yml | Gitleaks (inline) | sanitize-then-portable | YES — GITLEAKS_LICENSE |
| codeql.yml | .github/workflows/codeql.yml | CodeQL | **portable** | NO |
| dependency-review.yml | .github/workflows/dependency-review.yml | Dependency Review | **portable** | NO |
| scorecard.yml | .github/workflows/scorecard.yml | Scorecard | **portable** | NO |
| semgrep.yml | .github/workflows/semgrep.yml | Semgrep | sanitize-then-portable | NO |
| sonarcloud.yml | .github/workflows/sonarcloud.yml | SonarCloud | sanitize-then-portable | YES — SONAR_TOKEN |

**Gap vs CLAUDE.md:** Gitleaks in SoNash runs as a step inside ci.yml/validate, not as a standalone workflow. JASON-OS already has a standalone semgrep.yml (per D9 context, not ci.yml inline). The Qodo gate (CLAUDE.md §2) is covered by the GitHub App install, not a workflow file.

All 6 security gate workflows exist in both repos. No gaps on the security side.

---

### PR-Gate Workflows (SoNash-additional, partially portable)

| Workflow | Purpose | Portability | Notes |
|----------|---------|-------------|-------|
| auto-label-review-tier.yml | Tier-0 to Tier-4 review labels | sanitize-then-portable | Tier script is SoNash-specific; workflow shell pattern portable |
| auto-merge-dependabot.yml | Auto-merge Dependabot minor/patch | **portable** | JASON-OS already has this |
| docs-lint.yml | Lint markdown on PRs | sanitize-then-portable | Lint script SoNash-specific |
| review-check.yml | Flag PRs exceeding commit/file thresholds | sanitize-then-portable | Threshold script SoNash-specific |
| resolve-debt.yml | Auto-resolve DEBT-XXXX on merge | not-portable-product | TDMS-specific |
| validate-plan.yml | Validate phase completion docs | not-portable-product | Single SoNash file path |

---

### Deployment Workflows (SoNash-product-only)

| Workflow | Purpose | Portability |
|----------|---------|-------------|
| deploy-firebase.yml | Firebase Hosting + Cloud Functions + Firestore Rules | not-portable-product |

---

### Scheduled / Maintenance Workflows

| Workflow | Cron | Purpose | Portability |
|----------|------|---------|-------------|
| cleanup-branches.yml | Mon 6am UTC | Delete merged branches > 7 days | **portable** |
| pattern-compliance-audit.yml | Mon 6am UTC | Full-repo pattern scan | not-portable-product |
| backlog-enforcement.yml | DISABLED (was scheduled) | Backlog health check | not-portable-product |
| codeql.yml | Mon 3:17 UTC | CodeQL weekly scan | **portable** |
| scorecard.yml | Mon 6am UTC | OpenSSF Scorecard | **portable** |
| semgrep.yml | Wed 13:17 UTC | Semgrep scan | sanitize-then-portable |

---

### Other GitHub Meta

| File | Type | Portability | Notes |
|------|------|-------------|-------|
| dependabot.yml | config | sanitize-then-portable | 3 ecosystems; /functions section is SoNash-specific |
| CODEOWNERS | config | sanitize-then-portable | Core pattern portable; product entries need removal |
| pull_request_template.md | config | sanitize-then-portable | High-quality; remove TDMS section for generic use |
| release.yml | config | **portable** | Generic changelog categories |
| copilot-instructions.md | doc | not-portable-product | SoNash product overview for Copilot |

---

## Required-Secrets Matrix

| Secret | Workflows Using It |
|--------|--------------------|
| GITHUB_TOKEN | ci.yml, auto-merge-dependabot.yml, resolve-debt.yml, sync-readme.yml (built-in, always available) |
| GITLEAKS_LICENSE | ci.yml (validate job) |
| CODECOV_TOKEN | ci.yml (test job, Codecov upload) |
| SONAR_TOKEN | sonarcloud.yml |
| FIREBASE_SERVICE_ACCOUNT | deploy-firebase.yml |
| NEXT_PUBLIC_FIREBASE_API_KEY | ci.yml (build job), deploy-firebase.yml |
| NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN | ci.yml, deploy-firebase.yml |
| NEXT_PUBLIC_FIREBASE_PROJECT_ID | ci.yml, deploy-firebase.yml |
| NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET | ci.yml, deploy-firebase.yml |
| NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID | ci.yml, deploy-firebase.yml |
| NEXT_PUBLIC_FIREBASE_APP_ID | ci.yml, deploy-firebase.yml |

**Total distinct non-GITHUB_TOKEN secrets: 10**
**JASON-OS-applicable secrets (portable workflows only): 3** — GITLEAKS_LICENSE, CODECOV_TOKEN, SONAR_TOKEN

---

## JASON-OS-applicable vs SoNash-product-only

### Portable or sanitize-then-portable (JASON-OS gets value from these)

1. codeql.yml — direct port, zero changes
2. dependency-review.yml — direct port, zero changes
3. scorecard.yml — direct port, zero changes
4. auto-merge-dependabot.yml — direct port (JASON-OS already has equivalent)
5. cleanup-branches.yml — direct port (JASON-OS already has equivalent)
6. release.yml — direct port
7. ci.yml — sanitize heavily (remove Firebase env vars, TDMS steps, replace npm scripts with generic equivalents)
8. semgrep.yml — sanitize (replace/port .semgrep/rules/ content)
9. sonarcloud.yml — sanitize (replace projectKey/org; workflow YAML is trivial)
10. auto-label-review-tier.yml — sanitize (replace tier script; workflow pattern is a useful PR-labeling template)
11. docs-lint.yml — sanitize (replace lint script)
12. review-check.yml — sanitize (replace threshold script)
13. dependabot.yml — sanitize (remove /functions ecosystem, remove @dataconnect/generated ignore)
14. CODEOWNERS — sanitize (replace owner, remove product entries)
15. pull_request_template.md — sanitize (remove TDMS section)

### SoNash-product-only (not portable)

16. deploy-firebase.yml — hardcoded sonash-app project ID, Cloud Functions list
17. backlog-enforcement.yml — TDMS backlog system (and currently disabled)
18. pattern-compliance-audit.yml — SoNash pattern compliance system
19. resolve-debt.yml — SoNash TDMS debt tracking
20. validate-plan.yml — single SoNash file path
21. copilot-instructions.md — SoNash product overview

**Summary: 15 JASON-OS-applicable, 6 not-portable-product (including 1 disabled)**

---

## .pr-agent.toml vs .pr_agent.toml Resolution

**Three Qodo config files coexist:**

1. `.qodo/pr-agent.toml` — PRIMARY canonical Qodo config (per Qodo docs convention, reads from `.qodo/`). Most current: updated 2026-03-30. Contains all 29 pr_reviewer suppressions + 4 pr_code_suggestions + 8 pr_compliance_checker rules. Companion: `.qodo/REJECTED_PATTERNS.md`.

2. `.pr_agent.toml` (root, dot-underscore) — Comprehensive config that appears to have been the primary config before `.qodo/` was established. Contains same suppression structure plus global settings (publish_output, verbosity_level, github_action auto_review/auto_describe). Audited 2026-03-01 (Phase 6 GATE-05). May serve the PR-Agent app (distinct from Qodo) at root level.

3. `.pr-agent.toml` (root, dot-hyphen) — SHORT supplemental config (5 suppression rules only for pr_code_suggestions). Contains hook-security-specific suppressions not found in the other files (DEBT-2957 bidirectional containment, wx flag atomic writes, audit trail logging). Not obsolete — complements the others.

**Resolution: Neither root file is obsolete. All three are active.** The `.qodo/` file is the canonical Qodo engine config. The root files handle PR-Agent app routing and supplemental suppressions not yet migrated to `.qodo/`. The dot-hyphen file contains the most hook-specific suppressions unique to SoNash's Claude Code infrastructure.

---

## Qodo Config Architecture

The Qodo review system operates on two separate engines:
- **Reviewer engine** (`[pr_reviewer]`): general code review comments
- **Custom Compliance engine** (`[pr_code_suggestions]` + built-in rules): runs independently

Suppressions in one engine do NOT automatically apply to the other. This is why SoNash has both `[pr_reviewer]` and `[pr_compliance_checker]` sections — identical conceptual suppression must be registered twice.

The `.qodo/REJECTED_PATTERNS.md` tracks 28 reviewer suppression rules with origin PRs and rejection counts. It explicitly documents the two-engine architecture as a "gotcha" (rule #27 exists because a compliance item recurred despite reviewer suppression). This pattern — a human-readable suppression ledger alongside the machine-readable config — is a high-value JASON-OS methodology candidate independent of the specific rules.

---

## .gitleaks.toml Analysis

Uses `regexTarget = "line"` for context-aware allowlisting — this is more precise than the default (which matches just the secret value) and prevents false positives for public API keys that only appear in labeled contexts (e.g., `NEXT_PUBLIC_FIREBASE_API_KEY=AIzaSy...`).

**Portable elements:**
- `paths` allowlist structure (build artifact dirs)
- Test JWT token regex allowlist
- regexTarget=line approach

**SoNash-specific elements:**
- Firebase public API key regex (label-context pattern)
- SoNash product-specific paths (`.planning/system-wide-standardization/reference/`, `functions/lib/`, `dist-tests/`)

---

## .semgrep/rules/ Analysis

20 rules across 3 subdirectories:

**correctness/ (7 rules — all portable to any JS/TS project):**
- async-without-try-catch, file-read-without-try-catch, no-await-in-loop, no-floating-promise, no-race-condition-file-ops, no-unchecked-array-access, regex-without-lastindex-reset

**security/ (8 rules — 6 portable, 2 Firebase-specific):**
- Portable: no-eval-usage, no-hardcoded-secrets, no-unsanitized-error-response, taint-path-traversal, taint-user-input-to-exec, no-unsafe-html-prop [XSS guard]
- Firebase-specific: no-direct-firestore-write, no-innerhtml-assignment [React-specific but broadly portable]

**style/ (5 rules — 3 portable, 2 Firebase-specific):**
- Portable: no-any-type, no-console-in-components, no-default-export, no-magic-numbers
- Firebase-specific: no-inline-firestore-query

The semgrep.yml workflow runs `semgrep --test` against `tests/semgrep/` annotation files — a testing discipline for custom rules that is worth porting.

---

## Cross-Workflow Dependencies

No explicit `needs:` chains between separate workflow files. Within ci.yml: build `needs: [lint, test, validate]`.

The resolve-debt.yml workflow auto-commits to main on PR merge — this creates an indirect dependency with ci.yml (the [skip ci] tag prevents infinite loops).

The sync-readme.yml creates auto-PRs from push events — similarly uses [skip ci] convention implicitly.

---

## Action Pins Summary

All workflow actions are SHA-pinned with tag comments — good supply chain hygiene. Common SHAs used across multiple workflows:

| Action | SHA | Tag | Used In |
|--------|-----|-----|---------|
| actions/checkout | de0fac2e4500dabe0009e67214ff5f5447ce83dd | v6.0.2 | ALL 17 workflows |
| actions/setup-node | 53b83947a5a98c8d113130e565377fae1a50d02f | v6.3.0 | 12 workflows |
| actions/github-script | ed597411d8f924073f98dfc5c65a23a2325f34cd | v8.0.0 | 6 workflows |
| github/codeql-action/* | c10b8064de6f491fea524254123dbe5e09572f13 | v4.35.1 | 3 workflows |
| tj-actions/changed-files | 22103cc46bda19c2b464ffe86db46df6922fd323 | v47.0.5 | 3 workflows |

---

## Learnings for Methodology

1. **Three-file Qodo config pattern is non-obvious.** The `.qodo/`, `.pr_agent.toml`, and `.pr-agent.toml` split is not documented anywhere in the repo — it required reading all three files and inferring from content differences. Future D-agents should always check all three locations when scanning Qodo config.

2. **Gitleaks runs inline in ci.yml, not standalone.** JASON-OS has a standalone gitleaks workflow; SoNash embeds it in the validate job of ci.yml. Both are valid. The inline approach means ci.yml's validate job is secret-bearing (needs GITLEAKS_LICENSE).

3. **Workflow disable pattern: comment out triggers.** backlog-enforcement.yml uses `workflow_dispatch` only with a comment explaining the disable. This is cleaner than deleting and preserves manual invocation. Worth documenting as a JASON-OS convention.

4. **CODEOWNERS is scope-boundary documentation.** The four entries (*, .github/workflows/, functions/src/, firestore.rules) tell you exactly what SoNash treats as critical review paths. Useful signal for sync priority scoring.

5. **Semgrep custom rules have tests** (`tests/semgrep/` annotation files). The semgrep.yml workflow runs `semgrep --test` as a separate step. This is a quality gate on the rules themselves — worth porting as methodology.

6. **copilot-instructions.md overlaps with CLAUDE.md.** The GitHub Copilot instructions file at `.github/copilot-instructions.md` duplicates much of what CLAUDE.md covers. In JASON-OS, there's one CLAUDE.md. SoNash maintains both because Copilot and Claude Code are separate tools. This creates a documentation drift risk — worth noting for future sync considerations.

7. **D16 scope was well-sized.** 17 workflows + 9 configs = 26 units. Read time was manageable. No splitting needed.

---

## Gaps and Missing References

1. **Semgrep rule content not fully read.** The 20 rule YAML files in `.semgrep/rules/` were not individually read — only their filenames were inventoried. Their specific rule IDs, patterns, and test fixtures are not captured. D-agents focused on rule portability would need a separate pass.

2. **Issue templates not inventoried.** `.github/ISSUE_TEMPLATE/` contains `bug_report.md`, `feature_request.md`, `config.yml`. `.github/instructions/` contains `security.instructions.md`, `tests.instructions.md`. These were noted but not read — they are doc-type artifacts, lower priority for sync.

3. **ISSUE_TEMPLATE_APP_CHECK_REENABLE.md** at `.github/` root (not in ISSUE_TEMPLATE/) — a loose template file. Not read.

4. **Qodo GitHub App config** — the Qodo GitHub App itself (installed at repo level) is not visible via file scan. Its settings live in the Qodo dashboard, not the repo. Only the TOML configs captured here.

5. **SonarCloud quality gate thresholds** are configured in the SonarCloud UI, not in sonar-project.properties. The current issue baseline (778 issues, 2026-01-13) is noted in properties comments but the actual gate rules are cloud-only.

6. **Review tier boundary definitions** — scripts/assign-review-tier.js (what files trigger which tier) was not read — it's D9/D11 territory for scripts. The workflow and tier concept are captured but the specific tier boundaries are not.
