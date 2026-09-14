# ADR-006: Canonical versioned JSON format

- **Status:** Accepted
- **Date:** 2026-09-13
- **Spec:** §5 Export, §21–§24, §30–§31

## Context

Users must export roadmaps and import them while creating a new role, or onto an existing role that still has an empty graph. Imports must not merge into or overwrite a populated roadmap. The format should be Git-diffable, schema-versioned, and free of secrets.

## Decision

Use one **canonical, versioned JSON document**.

Current schema id:

```text
skilltrack.roadmap.v1
```

Top-level shape: `{ "schema", "roadmap", "nodes" }`. JSON Schema lives in spec §24 (`https://skilltrack.app/schemas/roadmap.v1.json`). Application validation also checks `parent_id` when non-null, plus label and handle-kind invariants.

Must include: schema version, roadmap metadata, skill and label nodes, checklists, links, notes, `handle_kind`, `incoming_edge_animated`, layout positions. Must never include auth tokens, OAuth/Supabase secrets, session data, other users’ data, React Flow runtime fields, or canvas viewport.

Import: on **create role** or an **empty existing role** (zero nodes, including labels); transactional; reject name collisions on create; no silent merge. If any imported UUID already exists globally, remap every id in the document and rewrite `parent_id` references. Export: always available; validate generated JSON; prefer deterministic key order for diffs. Unknown keys fail (`additionalProperties: false`).

Omitted `kind` is `skill` so older documents (spec §44) still import.

## Consequences

- New breaking shapes need `skilltrack.roadmap.v2` (or a documented compatibility layer).
- Node UUIDs in JSON are used as database identities when free; collisions remap the whole document.
- Tests can round-trip the sample Senior AI Engineer document in spec §44 and documents that include labels.

## Alternatives considered

| Option | Why not |
| --- | --- |
| Notion / proprietary export | Spec non-goal |
| Unversioned ad-hoc JSON | Breaks future importers |
| Import into populated roles | Risk of destroying data |
| Dump React Flow graph JSON | Couples the file to `@xyflow/react`; omits evidence fields |
