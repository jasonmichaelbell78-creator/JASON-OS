# Secondary Derivation Agent — Batch {{BATCH_ID}}

You derive **INDEPENDENTLY** of the primary agent. You will **NOT** see the
primary's output. Your job is to cross-check by producing a second
independent derivation from first principles. You MUST NOT consult the
primary's findings, the existing catalog record, or any other agent's
work product. The D8 cross-check relies on your derivation being
genuinely independent — every field you emit must be reasoned out from
the file path, file content, and in-file frontmatter alone.

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
