/**
 * smoke.test.js — Piece 3 S2 library smoke tests.
 *
 * Runs with `node --test .claude/sync/label/lib/__tests__/smoke.test.js`.
 * Covers the externally-observable contracts of each module; not a full
 * unit-test suite.
 */

const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");

const LIB = path.join(__dirname, "..");

// --- sanitize.js ---
test("sanitize: redacts home paths and returns string", () => {
  const { sanitize, getErrorMessage, toJson } = require(path.join(LIB, "sanitize"));
  const msg = sanitize(new Error("failed at /home/secret/foo"));
  assert.equal(typeof msg, "string");
  assert.ok(msg.includes("[REDACTED]"), "home path should be redacted");
  assert.equal(getErrorMessage("plain"), "plain");
  const json = toJson(new Error("x"));
  assert.equal(json.error, true);
  assert.equal(json.type, "Error");
});

// --- fingerprint.js ---
test("fingerprint: sha256 prefix + deterministic normalization", () => {
  const { fingerprint, normalize, sameFingerprint } = require(path.join(LIB, "fingerprint"));
  const a = fingerprint("hello\r\nworld  \r\n");
  const b = fingerprint("hello\nworld\n");
  assert.ok(a.startsWith("sha256:"));
  assert.equal(a, b, "CRLF + trailing whitespace should normalize identically");
  assert.equal(normalize("a  \n\n\n"), "a\n");
  assert.equal(sameFingerprint(a, b), true);
});

// --- confidence.js ---
test("confidence: threshold + needs_review extraction", () => {
  const {
    DEFAULT_THRESHOLD,
    scoreField,
    extractNeedsReview,
    mergeNeedsReview,
  } = require(path.join(LIB, "confidence"));
  assert.equal(DEFAULT_THRESHOLD, 0.8);
  assert.equal(scoreField({ primary: 0.9 }), 0.9);
  assert.equal(scoreField({ primary: 0.9, secondary: 0.7, agree: true }), 0.7);
  assert.equal(scoreField({ primary: 0.9, secondary: 0.95, agree: false }), 0);
  const needs = extractNeedsReview({ type: 0.9, purpose: 0.5 });
  assert.deepEqual(needs, ["purpose"]);
  assert.deepEqual(mergeNeedsReview(["a"], ["b", "a"]), ["a", "b"]);
});

// --- catalog-io.js ---
test("catalog-io: round-trip write + read + updateRecord", () => {
  const { readCatalog, writeCatalog, updateRecord, findRecord } = require(
    path.join(LIB, "catalog-io")
  );
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "label-catalog-"));
  const catalog = path.join(tmpDir, "shared.jsonl");

  writeCatalog(catalog, []);
  assert.deepEqual(readCatalog(catalog), []);

  const r1 = { path: "a.md", name: "a" };
  const r2 = { path: "b.md", name: "b" };
  writeCatalog(catalog, [r1, r2]);
  const back = readCatalog(catalog);
  assert.equal(back.length, 2);
  assert.equal(back[0].path, "a.md");

  // findRecord
  assert.equal(findRecord(catalog, "b.md").name, "b");
  assert.equal(findRecord(catalog, "zzz.md"), null);

  // updateRecord — upsert
  updateRecord(catalog, "c.md", () => ({ path: "c.md", name: "c" }));
  assert.equal(readCatalog(catalog).length, 3);

  // updateRecord — mutate
  updateRecord(catalog, "a.md", (cur) => ({ ...cur, name: "alpha" }));
  assert.equal(findRecord(catalog, "a.md").name, "alpha");

  // updateRecord — delete via returning null
  updateRecord(catalog, "b.md", () => null);
  assert.equal(findRecord(catalog, "b.md"), null);

  // cleanup
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

test("catalog-io: missing file returns empty array", () => {
  const { readCatalog } = require(path.join(LIB, "catalog-io"));
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "label-missing-"));
  const catalog = path.join(tmpDir, "never-created.jsonl");
  assert.deepEqual(readCatalog(catalog), []);
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

// --- agent-runner.js ---
test("agent-runner: injected spawner + queue round-trip", () => {
  const { runAgentAsync, readQueue, rewriteQueue, classifyJob } = require(
    path.join(LIB, "agent-runner")
  );
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "label-agents-"));
  const queuePath = path.join(tmpDir, "pending.jsonl");
  const outputPath = path.join(tmpDir, "agent-out.json");

  let spawnerCalls = 0;
  const fakeSpawner = ({ outputPath: op }) => {
    spawnerCalls += 1;
    assert.equal(op, outputPath);
    return { pid: 999999, spawnedAt: Date.now() };
  };

  const jobId = runAgentAsync({
    prompt: "derive X",
    filePath: "foo/bar.md",
    outputPath,
    queuePath,
    spawner: fakeSpawner,
  });
  assert.ok(jobId.startsWith("job_"));
  assert.equal(spawnerCalls, 1);

  const q = readQueue(queuePath);
  assert.equal(q.length, 1);
  assert.equal(q[0].job_id, jobId);
  assert.equal(classifyJob(q[0]), "running");

  // Simulate completion: write output + re-classify
  fs.writeFileSync(outputPath, JSON.stringify({ ok: true }));
  assert.equal(classifyJob(q[0]), "complete");

  // Simulate timeout
  const staleEntry = { ...q[0], spawned_at: 1, output_path: path.join(tmpDir, "nope.json") };
  assert.equal(classifyJob(staleEntry), "timed_out");

  // Regression coverage for R5 Sugg#1: a corrupted queue entry with a
  // negative or zero timeout_ms must fall back to DEFAULT_TIMEOUT_MS, not
  // clamp to 0 and instantly mark every job past-deadline. Without the fix
  // this assertion would read "timed_out" for a job spawned milliseconds
  // ago, which defeats the entire defensive intent of the clamp.
  const freshWithNegativeTimeout = {
    ...q[0],
    output_path: path.join(tmpDir, "nope.json"),
    spawned_at: Date.now(),
    timeout_ms: -1,
  };
  assert.equal(classifyJob(freshWithNegativeTimeout), "running");
  const freshWithZeroTimeout = {
    ...freshWithNegativeTimeout,
    timeout_ms: 0,
  };
  assert.equal(classifyJob(freshWithZeroTimeout), "running");

  // Rewrite
  rewriteQueue(queuePath, []);
  assert.deepEqual(readQueue(queuePath), []);

  fs.rmSync(tmpDir, { recursive: true, force: true });
});

// --- derive.js ---
test("derive: deriveCheapFields on this smoke file itself", () => {
  const { deriveCheapFields, detectType, detectModuleSystem, parseExistingFrontmatter } = require(
    path.join(LIB, "derive")
  );
  const self = __filename;
  const fields = deriveCheapFields(self);
  assert.equal(typeof fields.path, "string");
  assert.ok(fields.path.endsWith("smoke.test.js"));
  assert.equal(fields.name, "smoke.test");
  assert.equal(typeof fields.fingerprint, "string");
  assert.ok(fields.fingerprint.startsWith("sha256:"));
  assert.ok(fields.file_size > 0);
  assert.ok(["cjs", "esm", "none"].includes(fields.module_system));
});

test("derive: detectType rules", () => {
  const { detectType } = require(path.join(LIB, "derive"));
  assert.equal(detectType(".claude/skills/foo/SKILL.md"), "skill");
  assert.equal(detectType(".claude/agents/bar.md"), "agent");
  assert.equal(detectType(".claude/hooks/baz.js"), "hook");
  assert.equal(detectType(".claude/hooks/lib/helper.js"), "hook-lib");
  assert.equal(detectType("scripts/lib/safe-fs.js"), "script-lib");
  assert.equal(detectType("scripts/session-end-commit.js"), "script");
  assert.equal(detectType(".github/workflows/ci.yml"), "ci-workflow");
  assert.equal(detectType("package.json"), "config");
  assert.equal(detectType(".claude/settings.json"), "settings");
  assert.equal(detectType(".planning/piece-3/PLAN.md"), "plan");
  assert.equal(detectType(".planning/piece-3/DECISIONS.md"), "planning-artifact");
  assert.equal(detectType("README.md"), "doc");
  assert.equal(detectType("unknown/file.xyz"), "other");
});

test("derive: detectType v1.3 rules (D4.5 + D4.6)", () => {
  const { detectType } = require(path.join(LIB, "derive"));

  // D4.6 — tests via __tests__ dir
  assert.equal(
    detectType(".claude/sync/label/lib/__tests__/smoke.test.js"),
    "test",
    "files under __tests__/ should classify as test"
  );
  // D4.6 — tests via suffix form
  assert.equal(detectType("scripts/foo.test.js"), "test");
  assert.equal(detectType("scripts/foo.spec.mjs"), "test");
  assert.equal(detectType("tools/statusline/statusline_test.go"), "tool-file",
    "Go _test.go does not match the JS test suffix pattern; keeps tool-file classification since it's under tools/");

  // D4.5c — .husky/_shared.sh + .husky/husky.sh → hook-lib
  assert.equal(detectType(".husky/_shared.sh"), "hook-lib");
  assert.equal(detectType(".husky/husky.sh"), "hook-lib");

  // D4.5e — .husky/_/* shims → git-hook
  assert.equal(detectType(".husky/_/pre-commit"), "git-hook");
  assert.equal(detectType(".husky/_/husky.sh"), "git-hook",
    "shim under _/ dominates — caller stamps status:generated");

  // D4.5d — .husky/<name> (no ext, top-level) → git-hook
  assert.equal(detectType(".husky/pre-commit"), "git-hook");
  assert.equal(detectType(".husky/pre-push"), "git-hook");
  assert.equal(detectType(".husky/commit-msg"), "git-hook");

  // D4.5 a+b — .claude/hooks/**/*.sh → hook-lib
  assert.equal(detectType(".claude/hooks/run-node.sh"), "hook-lib");
  assert.equal(detectType(".claude/hooks/run-go.sh"), "hook-lib");
  assert.equal(detectType(".claude/hooks/lib/_shared.sh"), "hook-lib",
    "hooks/lib/ dir wins over .sh rule — both paths converge on hook-lib");

  // Regression: test detection precedes .claude/hooks/ classification
  assert.equal(
    detectType(".claude/hooks/__tests__/block-push.test.js"),
    "test",
    "tests under .claude/hooks/__tests__ should classify as test, not hook"
  );
});

test("derive: D4.1 naming canon (deriveName)", () => {
  const { deriveName } = require(path.join(LIB, "derive"));

  // Skill → directory slug
  assert.equal(deriveName(".claude/skills/checkpoint/SKILL.md", "skill"), "checkpoint");
  assert.equal(deriveName(".claude/skills/deep-research/SKILL.md", "skill"), "deep-research");

  // Agent → basename without ext
  assert.equal(deriveName(".claude/agents/deep-research-searcher.md", "agent"), "deep-research-searcher");

  // Hook → basename without ext
  assert.equal(deriveName(".claude/hooks/block-push-to-main.js", "hook"), "block-push-to-main");

  // git-hook → basename (no ext for top-level, with ext for _shared)
  assert.equal(deriveName(".husky/pre-commit", "git-hook"), "pre-commit");

  // test → basename (keeps .test suffix in name since .js is the sole ext)
  assert.equal(deriveName(".claude/sync/label/lib/__tests__/smoke.test.js", "test"), "smoke.test");

  // Non-skill skill path (shouldn't happen, but defensive)
  assert.equal(
    deriveName(".claude/skills/foo/SKILL.md", "doc"),
    "SKILL",
    "deriveName applies skill rule only when type=skill; otherwise basename"
  );
});

test("derive: detectModuleSystem cjs vs esm vs none", () => {
  const { detectModuleSystem } = require(path.join(LIB, "derive"));
  assert.equal(detectModuleSystem("x.cjs", ""), "cjs");
  assert.equal(detectModuleSystem("x.mjs", ""), "esm");
  assert.equal(detectModuleSystem("x.js", "const fs = require('fs');"), "cjs");
  assert.equal(detectModuleSystem("x.js", "import fs from 'fs';\nconsole.log(fs);"), "esm");
  assert.equal(detectModuleSystem("x.js", "// empty"), "none");
  assert.equal(detectModuleSystem("x.md", ""), "none");
});

test("derive: parseExistingFrontmatter yaml + lineage body", () => {
  const { parseExistingFrontmatter } = require(path.join(LIB, "derive"));
  const yaml = parseExistingFrontmatter(
    "dummy",
    "---\nname: test\ndescription: hello\n---\n\nbody"
  );
  assert.equal(yaml.name, "test");
  assert.equal(yaml.description, "hello");

  const lineage = parseExistingFrontmatter(
    "dummy",
    "# Heading\n\n**Lineage:** SoNash 41526 → JASON-OS v0.1\n"
  );
  assert.equal(lineage.lineage, "SoNash 41526 → JASON-OS v0.1");

  const nothing = parseExistingFrontmatter("dummy", "just plain text");
  assert.equal(nothing, null);

  // Regression coverage for R3 Sugg#1: nested keys under an empty-value
  // parent (e.g. `metadata:\n  key: value`) must populate the nested
  // object, not get silently dropped by an overly strict kv regex.
  const nested = parseExistingFrontmatter(
    "dummy",
    "---\nname: test\nmetadata:\n  tier: foundation\n  owner: claude\n---\n"
  );
  assert.equal(nested.name, "test");
  assert.ok(nested.metadata, "metadata block should be populated");
  assert.equal(nested.metadata.tier, "foundation");
  assert.equal(nested.metadata.owner, "claude");
});

// --- validate-catalog.js ---
test("validate-catalog: rule layer rejects partial + pending + needs_review", () => {
  const { applyRuleLayer } = require(path.join(LIB, "validate-catalog"));
  assert.deepEqual(applyRuleLayer({ status: "active", needs_review: [] }), []);
  assert.ok(applyRuleLayer({ status: "partial", needs_review: [] }).some((e) => e.includes("partial")));
  assert.ok(
    applyRuleLayer({ status: "active", pending_agent_fill: true, needs_review: [] }).some((e) =>
      e.includes("pending_agent_fill")
    )
  );
  assert.ok(
    applyRuleLayer({ status: "active", needs_review: ["type"] }).some((e) =>
      e.includes("needs_review")
    )
  );
});

test("validate-catalog: D4.3 name uniqueness — duplicate names fail with both paths named", () => {
  const { checkNameUniqueness } = require(path.join(LIB, "validate-catalog"));

  // No duplicates → no errors
  assert.deepEqual(
    checkNameUniqueness([
      { name: "foo", path: "a.md" },
      { name: "bar", path: "b.md" },
    ]),
    []
  );

  // Duplicate → error names both paths
  const dups = checkNameUniqueness([
    { name: "foo", path: "a.md" },
    { name: "foo", path: "b.md" },
  ]);
  assert.equal(dups.length, 1);
  assert.equal(dups[0].path, "b.md");
  assert.ok(dups[0].messages[0].includes("Duplicate"));
  assert.ok(dups[0].messages[0].includes('"foo"'));
  assert.ok(dups[0].messages[0].includes("a.md"));
  assert.ok(dups[0].messages[0].includes("b.md"));

  // Three-way collision → two errors, all referring to the first-seen path
  const triple = checkNameUniqueness([
    { name: "x", path: "p1.md" },
    { name: "x", path: "p2.md" },
    { name: "x", path: "p3.md" },
  ]);
  assert.equal(triple.length, 2);
  assert.ok(triple[0].messages[0].includes("p1.md"));
  assert.ok(triple[0].messages[0].includes("p2.md"));
  assert.ok(triple[1].messages[0].includes("p1.md"));
  assert.ok(triple[1].messages[0].includes("p3.md"));

  // Missing name / path → silent skip (not a duplicate-name issue)
  assert.deepEqual(checkNameUniqueness([{ path: "a.md" }, { name: "b" }]), []);
});

test("validate-catalog: clean catalog passes, dirty fails", () => {
  const { validateCatalog } = require(path.join(LIB, "validate-catalog"));
  const { writeCatalog } = require(path.join(LIB, "catalog-io"));
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "label-validate-"));
  const catalog = path.join(tmpDir, "shared.jsonl");

  // Empty catalog passes
  writeCatalog(catalog, []);
  const empty = validateCatalog(catalog);
  assert.equal(empty.valid, true);

  // Dirty record fails the rule layer regardless of schema outcome
  const dirty = {
    path: "x.md",
    name: "x",
    type: "other",
    purpose: "test",
    source_scope: "universal",
    runtime_scope: "universal",
    portability: "portable",
    status: "partial",
    dependencies: [],
    external_services: [],
    tool_deps: [],
    mcp_dependencies: [],
    required_secrets: [],
    lineage: null,
    supersedes: [],
    superseded_by: null,
    sanitize_fields: [],
    state_files: [],
    notes: "",
    data_contracts: [],
    component_units: [],
    composite_id: null,
    is_copy_of: null,
    has_copies_at: [],
    content_hash: "sha256:deadbeef",
    sections: [],
    needs_review: [],
    pending_agent_fill: false,
    manual_override: [],
    last_hook_fire: "2026-04-20T00:00:00.000Z",
    schema_version: "1.0",
  };
  writeCatalog(catalog, [dirty]);
  const bad = validateCatalog(catalog);
  assert.equal(bad.valid, false);
  assert.ok(bad.errors.length >= 1);
  assert.ok(bad.errors[0].messages.some((m) => m.includes("partial")));

  fs.rmSync(tmpDir, { recursive: true, force: true });
});
