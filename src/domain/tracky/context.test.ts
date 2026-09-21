import { describe, expect, it } from "vitest"

import { assembleWorkingSet } from "@/domain/tracky/context"
import type { RoadmapNode } from "@/domain/topics/types"

function node(
  id: string,
  parentId: string | null,
  title: string,
  extra?: Partial<RoadmapNode>
): RoadmapNode {
  const now = "2026-09-19T00:00:00.000Z"
  return {
    id,
    roleId: "role-1",
    parentId,
    kind: "skill",
    title,
    description: "desc",
    notes: extra?.notes ?? "notes",
    icon: "circle-dot",
    color: null,
    handleKind: "regular",
    incomingEdgeAnimated: false,
    positionX: 0,
    positionY: 0,
    sortOrder: 0,
    createdAt: now,
    updatedAt: now,
    ...extra,
  }
}

describe("assembleWorkingSet", () => {
  const nodes = [node("a", null, "Fundamentals"), node("b", "a", "Python")]

  it("injects a stub without a title index", () => {
    const set = assembleWorkingSet({
      roleId: "role-1",
      roleName: "AI Engineer",
      nodes,
      focusedTopicId: "b",
      pinned: [],
      pendingProposals: [
        {
          id: "p1",
          kind: "update",
          entity: "topic",
          targetId: "b",
          parentId: "a",
          title: "Python",
          status: "pending",
        },
      ],
      scratchpad: "  remember evals  ",
    })

    expect(set).not.toHaveProperty("index")
    expect(set.topicCount).toBe(2)
    expect(set.focusedTopicId).toBe("b")
    expect(set.pinned).toEqual([])
    expect(set.pendingProposals).toEqual([
      { id: "p1", kind: "update", entity: "topic", title: "Python" },
    ])
    expect(set.scratchpad).toBe("remember evals")
    expect(set.roleNotes).toBeNull()
    expect(set.roleNotesTruncated).toBe(false)
    expect(set.readBudget.maxSteps).toBe(12)
  })
})
