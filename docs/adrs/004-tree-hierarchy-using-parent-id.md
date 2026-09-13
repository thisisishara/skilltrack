# ADR-004: Tree hierarchy using `parent_id`

- **Status:** Accepted
- **Date:** 2026-09-13
- **Spec:** §9, §10, §25 `roadmap_nodes`, §29, §47

## Context

Roadmaps are arbitrarily deep skill trees. Nodes need stable identity across rename, reparent, move, and checklist edits. The canvas may draw edges, but the semantic model should stay simple: one parent, many children, multiple roots per roadmap. Arbitrary graph edges and real-time multi-user graphs are non-goals.

## Decision

Represent hierarchy as a **tree via `parent_id`**.

- `roadmap_nodes.parent_id` references `roadmap_nodes(id)` (nullable; `ON DELETE CASCADE`).
- Root nodes have `parent_id = null`. A role may have multiple roots.
- Every non-root node has exactly one parent.
- Node `id` is a UUID that does not change on rename, reparent, position, icon, or checklist edits.
- Canvas edges, if required by React Flow, are **derived** from `parent_id`, not a separate source of truth.
- Domain rules: no self-parenting, no cycles, child and parent share the same role.

Layout (`position_x`, `position_y`) is visual only and does not define parentage.

## Consequences

- Recursion/CTEs or application walks compute subtrees for progress and delete.
- Import/export carry `parent_id` and must validate references and cycles.
- Future DAG/graph edges would be a new model, not a silent widening of `parent_id`.

## Alternatives considered

| Option | Why not for MVP |
| --- | --- |
| Explicit `edges` table as source of truth | Duplicates parent; cycle/multi-parent risk |
| Materialized path / nested sets | Harder reparent; Spec uses adjacency list |
| Adjacency of arbitrary graphs | Spec §47 non-goal |
