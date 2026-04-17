# PR Review Pre-Checks

<!-- prettier-ignore-start -->
**Document Version:** 1.0 (JASON-OS port v0.1)
**Last Updated:** 2026-04-17
**Status:** ACTIVE (Foundation-scoped)
**Lineage:** SoNash `pr-review/reference/PRE_CHECKS.md` v1.0 → JASON-OS trimmed port
<!-- prettier-ignore-end -->

Generic pre-push checks that prevent known multi-round review churn patterns.
Run ALL applicable checks before the first CI push. Each check captures a
class of failure that recurs across PRs in any project — they are not tied
to a specific codebase's conventions.

**JASON-OS scope note:** v0 keeps the language- and stack-agnostic checks.
Project-specific checks (custom pattern compliance scripts, project-local
JSONL pipelines, project-specific watchlists) were dropped during the port.
Add them back per-project as needed.

---

## 1. New File Pre-Review

New files >500 lines: run a code-review pass FIRST, fix issues, THEN push.
Large new files frequently trigger first-scan reviewer noise that is easier
to address before they hit CI.

## 2. Local Pattern / Lint Compliance

If the project has a local lint or pattern-check command (e.g. `npm run
lint -- --staged`, `ruff check`, `golangci-lint`), run it on staged files
before pushing. This eliminates a large chunk of CI-blocking review items
that round-trip through the pipeline.

## 3. Security Pattern Sweep

If the PR introduces security-adjacent code (file writes, command
execution, external requests, deserialization), grep for unguarded
instances of the same primitive across the touched directories. The
canonical failure mode: one path is fixed, ten others with the same
shape are missed.

```bash
# Example — find unguarded write paths
grep -rn 'writeFileSync\|renameSync\|appendFileSync' .claude/hooks/ scripts/ --include="*.js" | grep -v 'isSafeToWrite'
```

## 4. Cyclomatic Complexity

If the project enforces a CC threshold (commonly CC <= 15), run the local
CC check on changed files before pushing. After extracting helpers, re-check
the ENTIRE file — not just the function you modified — to make sure no other
function crossed the threshold.

## 5. Filesystem Guard Pre-Check

If the PR modifies a filesystem-guard function (path containment, symlink
following, root-confinement), verify against the full lifecycle matrix:

| Scenario                        | Test With                            |
| ------------------------------- | ------------------------------------ |
| File exists                     | Normal operation                     |
| File doesn't exist, parent does | `.tmp` / `.bak` paths                |
| Parent doesn't exist            | Fresh checkout, mkdir ordering       |
| Fresh checkout (no project dir) | First-ever run on clean clone        |
| Symlink in path                 | Symlink to outside project root      |

Path containment decisions BEFORE writing code:

1. Which directions are needed? Descendant-only or bidirectional?
2. Separator boundary — `startsWith(root + path.sep)`, NOT `startsWith(root)`
3. Case sensitivity — Windows needs `.toLowerCase()`
4. Depth limit — if ancestor direction, cap at 10 levels

## 6. Shared Utility Caller Audit

If the PR modifies a shared utility function, grep ALL callers and verify
compatibility. The canonical failure mode: behavior change in a shared
helper isn't propagated to the 4-10 callers in other files.

## 7. Algorithm Design Pre-Check

**Trigger:** Non-trivial algorithm or heuristic/analysis function. Design the
full algorithm before committing: define invariants, enumerate edge cases,
handle all input types, add depth/size caps. For heuristics, define a test
matrix of inputs → outputs covering true positives, true negatives, and
edge cases.

| Heuristic Type         | Required Test Cases                                       |
| ---------------------- | --------------------------------------------------------- |
| Brace/scope detection  | Nested braces, adjacent blocks, empty blocks, single-line |
| Regex-based analysis   | Match, non-match, partial match, multiline, special chars |
| Line-counting logic    | 0 lines, 1 line, boundary lines, lines with mixed content |
| AST-like parsing       | Nested constructs, sibling constructs, malformed input    |
| Dedup/canonicalization | Identical, near-identical, different types, circular refs |

## 8. Mapping / Enumeration Completeness

When modifying mapping logic (severity, priority, status enums, etc.):
list ALL possible input values and verify each maps correctly. Use
case-insensitive matching and `\b` word boundaries where needed.

## 9. Same-File Regex DoS Sweep

After fixing a flagged regex, grep the same file for ALL other vulnerable
regexes. Two-strikes rule: if a reviewer flags the same regex twice,
replace it with string parsing rather than patching the regex.

When replacing a regex with a `testFn` function, also check any helper
regexes INSIDE the testFn — DoS rules apply to all regex patterns, not
just the top-level one.

## 10. Large PR Scope Pre-Check

20+ changed files? Consider splitting. Grep for shared patterns across
all files and fix them in one pass to avoid round-tripping the same
finding across multiple files.

## 11. Stale Reviewer HEAD Check

Before investigating reviewer items, compare the reviewer's commit
against HEAD. If stale (2+ behind), reject ALL items from that reviewer
as a batch rather than re-investigating each one.

## 12. Repeat-Item Batch Rejection

When processing R2+ rounds:

1. Check the project's PR review learnings log for prior rejections in
   the same PR
2. If an item matches a previously rejected item (same rule ID + same
   file), mark it **repeat-rejected** without re-investigating
3. Add a single batch note: "N items repeat-rejected (same justification
   as R{X})"

## 13. Cross-Platform Path Normalization

**Trigger:** PR modifies path-handling code (`includes`, `endsWith`,
`startsWith`, `.has()` on file paths). Verify ALL string-based path
comparisons in modified files use POSIX-normalized paths.

```bash
grep -n 'includes\|endsWith\|\.has(\|startsWith' <modified-file> | grep -iv 'toPosixPath\|normalize'
```

## 14. Logic Fix Test Matrix

**Trigger:** PR fixes logic bugs in pattern-matching, filtering, or
detection code. Before committing, define a test matrix covering:

- (1) target present + changed
- (2) target present + unchanged
- (3) target removed + changed
- (4) no target + changed

## 15. Lint Rule CC Hygiene

**Trigger:** PR adds or modifies project lint rules. If any handler /
visitor / `create()` function has CC > 10, extract helpers NOW. Target
CC <= 10 to leave margin for future additions.

## 16. Fix-One-Audit-All Propagation Check

**Trigger:** PR fixes a bug or adds handling for a pattern in one file.
Before committing, grep the codebase for ALL other instances of the
same pattern gap.

```bash
# Example: after fixing path normalization in one file
grep -rn 'includes\|endsWith\|\.has(\|startsWith' scripts/ --include="*.js" | grep -iv 'toPosixPath\|normalize'
```

This is the longest-running unresolved class of review churn. Always run.

## 17. Test-Production Regex Sync

**Trigger:** PR modifies a regex in a checker or compliance script. After
updating the production regex, verify that corresponding test files use
the matching pattern.

```bash
grep -rn 'pattern_you_changed' tests/ --include="*.test.*"
```

## 18. Tooling Migration Grep

**Trigger:** PR changes a dev tooling wrapper (fnm, nvm, rbenv, pyenv) or
migrates from one tool to another. Before pushing, grep for ALL usages of
the old AND new tool across the entire codebase. Fix all instances in the
same commit. Do NOT push with partial migration.

## 19. Parser/Algorithm Edge Case Matrix

**Trigger:** PR adds a new parser (YAML, JSON, config, log format) or
algorithm with multiple input formats. Before committing, enumerate ALL
edge cases as a test matrix:

- Quoted vs unquoted values
- Inline vs multi-line syntax
- Comments (inline, standalone)
- Empty / missing values
- Special characters / escaping
- Boundary markers (siblings vs children)

Commit the test matrix WITH the parser. Do not rely on reviewers to
discover edge cases one at a time.

## 20. Run Quality Gate Locally Before Pushing

**Trigger:** PR modifies >5 source files or introduces new scripts. If the
project has a local quality-gate runner, run it before pushing to catch
CC, code smells, and security hotspots before the CI round-trip:

```bash
# Example for a SonarCloud-equivalent local scan (requires scanner installed)
npx sonarqube-scanner 2>&1 | grep -E 'MAJOR|CRITICAL|BLOCKER'

# Or at minimum, check CC on modified files
npx eslint --rule '{"complexity": ["error", 15]}' <modified-files>
```

## 21. Auto-Fixer Output Review

**Trigger:** PR runs an ESLint auto-fixer or codemod across multiple files.
After running any auto-fixer, review 3-5 transformed files for
over-nesting, unnecessary complexity, or patterns that will trigger the
project's quality gate. Auto-fixers can produce technically correct but
overly complex output.

```bash
# Check for deeply nested ternaries in fixed files
grep -n '? .* ? .* ?' <fixed-files> | head -10
```

## 22. Escape Character Enumeration

**Trigger:** PR adds or modifies an escape / sanitization function
(`escapeMd`, `escapeCell`, `sanitizeInput`, etc.). Before committing,
enumerate ALL characters that need escaping for the target context and
handle them in a single pass. Do NOT discover characters one-at-a-time
across review rounds.

Reference:
[MDN — Characters with special meaning](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Regular_expressions#escaping)

## 23. Error Context in Catch Blocks

**Trigger:** PR adds or modifies try/catch blocks. Every `catch` block
that logs or re-throws MUST include the operation context (what was being
attempted, which file/record). Bare `catch(e) { throw e; }` or
`console.error(e.message)` loses context for debugging. Wrap with:
`throw new Error(\`Failed to \${operation}: \${e.message}\`)`.
