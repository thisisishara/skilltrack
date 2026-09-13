# ADR-009: React Flow for the roadmap canvas

- **Status:** Accepted
- **Date:** 2026-09-13
- **Spec:** §5 Frontend, §5 “What is not a shadcn component”, §19, §35, §50 Phase 3

## Context

The primary roadmap surface is an infinite, pannable graph: pan, zoom, select, create, edit, delete, branch, move, fit-to-view, and search-to-focus. shadcn/ui does not provide a canvas. Hierarchy remains `parent_id` ([ADR-004](./004-tree-hierarchy-using-parent-id.md)); positions are persisted separately.

## Decision

Implement the canvas with **React Flow** (`@xyflow/react`).

- It is the **only** primary surface that is not a shadcn primitive.
- Chrome around the canvas stays shadcn: zoom/fit `Button`s, node `Badge` progress, Lucide icons, `Sheet` for configuration, `Empty` when there are no nodes, `Command` for node search.
- Persist `position_x` / `position_y`. Position never defines parentage.
- Derive React Flow edges from `parent_id`.
- Empty roadmaps show `Empty` over the canvas with a create-first-node action.

## Consequences

- Canvas code lives under a dedicated `components/canvas` (or similar) module.
- React Flow node internals can still compose shadcn/`Badge`/Lucide.
- Library upgrades are isolated from domain progress math.

## Alternatives considered

| Option | Why not |
| --- | --- |
| Custom Canvas/SVG | High cost; pan/zoom/a11y from scratch |
| D3 force graphs | Poor structured tree editing |
| Pure CSS/absolute nodes | Weak infinite pan/zoom |
