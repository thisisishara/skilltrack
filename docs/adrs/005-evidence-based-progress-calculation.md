# ADR-005: Evidence-based progress calculation

- **Status:** Accepted
- **Date:** 2026-09-13
- **Spec:** §13–§16, §29.11, §34, §48, §52

## Context

Marking a node “done” without evidence makes SkillTrack a checkbox toy. Progress appears at node, parent, and roadmap levels. Storing three independent percentages would drift. Users should never hand-edit parent completion.

## Decision

**Checklist items are the source of truth.** Progress is derived, never independently authored.

Formulas:

```text
node_progress =
  completed_checklist_items / total_checklist_items

subtree_progress =
  completed checklist items in subtree
  / total checklist items in subtree

roadmap_progress =
  all completed checklist items
  / all checklist items
```

MVP rules:

- Require at least one checklist item before a node is trackable. A leaf with zero items is `0%` until configured.
- Empty parents do not count as 100%.
- Derived state: `0%` pending, `1–99%` in_progress, `100%` done.
- On checklist change: persist, recalculate the node, ancestors, and roadmap; optimistic UI is allowed where safe.
- Optional future fields (`evidence_type`, `evidence_url`, `evidence_note`) are out of MVP.

## Consequences

- Completing a child updates parents automatically.
- Import/export persist checklist completion, not cached percentages (percentages can be recomputed).
- UI shows `Progress` + labels from the same derived numbers ([ADR-011](./011-inter-lucide-shadcn-ui-system.md)).

## Alternatives considered

| Option | Why not |
| --- | --- |
| Manual node/parent/roadmap percent fields | Drift; forbidden by §52 |
| Weighting nodes equally regardless of checklist size | Empty parents look complete |
| Binary done flag only | Loses partial evidence |
