import { describe, expect, it } from "vitest"

import type { ChecklistItem } from "@/domain/checklists/types"
import {
  nodeProgress,
  nodeStatusCounts,
  ratioToPercent,
  roadmapProgress,
  subtreeProgress,
} from "@/domain/progress/progress"

function item(
  nodeId: string,
  id: string,
  isCompleted: boolean
): ChecklistItem {
  return {
    id,
    nodeId,
    title: id,
    description: null,
    isCompleted,
    sortOrder: 0,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    completedAt: isCompleted ? "2026-01-01T00:00:00.000Z" : null,
  }
}

describe("progress", () => {
  it("maps 5 / 10 checklist items to 50%", () => {
    const items = Array.from({ length: 10 }, (_, index) =>
      item("n1", `i${index}`, index < 5)
    )
    expect(nodeProgress(items, "n1")).toMatchObject({
      completed: 5,
      total: 10,
      percent: 50,
      status: "in_progress",
    })
  })

  it("is 0% when a node has no checklist items", () => {
    expect(nodeProgress([], "n1")).toMatchObject({
      percent: 0,
      total: 0,
      status: "pending",
    })
  })

  it("caps in-progress percents below 100 until every item is done", () => {
    expect(ratioToPercent(99, 100)).toBe(99)
    expect(ratioToPercent(100, 100)).toBe(100)
  })

  it("rolls subtree progress from descendant checklist items", () => {
    const nodes = [
      { id: "root", parentId: null },
      { id: "child", parentId: "root" },
    ]
    const items = [
      item("root", "a", true),
      item("child", "b", false),
      item("child", "c", true),
    ]
    expect(subtreeProgress(nodes, items, "root")).toMatchObject({
      completed: 2,
      total: 3,
      percent: 67,
    })
  })

  it("computes roadmap progress from all checklist items", () => {
    const items = [item("a", "1", true), item("b", "2", false)]
    expect(roadmapProgress(items)).toMatchObject({
      completed: 1,
      total: 2,
      percent: 50,
    })
  })

  it("ignores labels in node status counts", () => {
    const nodes = [
      { id: "skill", kind: "skill" as const },
      { id: "label", kind: "label" as const },
    ]
    const items = [item("skill", "1", true), item("label", "2", false)]
    expect(nodeStatusCounts(nodes, items)).toEqual({
      pending: 0,
      inProgress: 0,
      done: 1,
    })
  })
})
