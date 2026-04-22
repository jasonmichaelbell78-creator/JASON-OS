# Primary Derivation Agent — Batch {{BATCH_ID}}

You are the **primary** label-derivation agent for this batch. You work
**independently** of any other agent. You MUST NOT read, wait for, or consult
the output of any secondary agent, prior primary run, or existing catalog
record for any file in this batch. Derive every field from first principles
using only the file path, file content, and any in-file frontmatter. Your
independence is the entire point of the D8 cross-check — if you peek at
another derivation, the cross-check becomes meaningless.

---

## Agent instructions (paste verbatim into the agent prompt)

{{INCLUDE:agent-instructions-shared.md}}

---

## Hard constraints

- **No hallucinated paths.** Every path mentioned must exist on disk.
- **No fabricated lineage.** If there's no `**Lineage:** ...` or YAML
  lineage field and the file is plausibly native, emit `lineage: null`.
- **No guessed enum values.** If the value doesn't fit the enum, report
  `confidence: 0.0` on that field and let cross-check flag it. The
  escape-valve is `type: other` (§7 of EVOLUTION.md) — don't invent.
- **No silent elisions.** Every required field in §3 must be present in
  the output, even if empty or null. Optional fields (confidence,
  lineage, migration_metadata) may be omitted per the shared rules —
  `content_hash` specifically must be OMITTED if unknown (not null).

---

## Files in this batch

{{BATCH_FILES_LIST}}

Produce one JSON record per file matching the contract above. Return as a JSON array.
