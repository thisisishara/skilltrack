# ADR-006: Canonical versioned JSON format

- **Status:** Accepted
- **Date:** 2026-09-13
- **Spec:** §5 Export, §21–§24, §30–§31

## Context

Users must export roadmaps and import them only while creating a new role. Imports must not merge into or overwrite an existing roadmap. The format should be Git-diffable, schema-versioned, and free of secrets.

## Decision

Use one **canonical, versioned JSON document**.

Current schema id:

```text
skilltrack.roadmap.v1
```

Top-level shape: `{ "schema", "roadmap", "nodes" }`. JSON Schema lives in spec §24 (`https://skilltrack.app/schemas/roadmap.v1.json`). Application validation also checks `parent_id` when non-null.

Must include: schema version, roadmap metadata, nodes, checklists, links, notes, layout positions. Must never include auth tokens, OAuth/Supabase secrets, session data, or other users’ data.

Import: only on **create role**; transactional; reject name collisions; no silent merge. Export: always available; validate generated JSON; prefer deterministic key order for diffs. Unknown optional fields may be ignored; malformed required fields fail.

## Consequences

- New breaking shapes need `skilltrack.roadmap.v2` (or a documented compatibility layer).
- Node UUIDs in JSON are the same identities used in the database.
- Tests can round-trip the sample Senior AI Engineer document in spec §44.

## Alternatives considered

| Option | Why not |
| --- | --- |
| Notion / proprietary export | Spec non-goal |
| Unversioned ad-hoc JSON | Breaks future importers |
| Import into existing roles | Risk of destroying data |
