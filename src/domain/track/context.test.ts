import { describe, expect, it } from "vitest"

import { assembleWorkingSet } from "@/domain/track/context"
import { DEFAULT_TRACK_CONTEXT } from "@/domain/user-settings/defaults"
import type { RoadmapNode } from "@/domain/topics/types"

function node(id: string, parentId: string | null, title: string): RoadmapNode {
  const now = "2026-09-19T00:00:00.000Z"
  return {
    id,
    roleId: "role-1",
    parentId,
    kind: "skill",
    title,
    description: "desc",
    notes: "notes",
    icon: "circle-dot",
    color: null,
    handleKind: "regular",
    incomingEdgeAnimated: false,
    positionX: 0,
    positionY: 0,
    sortOrder: 0,
    createdAt: now,
    updatedAt: now,
  }
}

describe("assembleWorkingSet", () => {
  const nodes = [
    node("a", null, "Fundamentals"),
    node("b", "a", "Python"),
  ]

  it("omits descriptions by default and caps to a title index", () => {
    const set = assembleWorkingSet({
      roleId: "role-1",
      roleName: "AI Engineer",
      nodes,
      tasks: [],
      links: [],
      context: DEFAULT_TRACK_CONTEXT,
      focusedTopicId: "b",
      pendingProposals: [],
      scratchpad: "",
    })

    expect(set.indexMode).toBe("full")
    expect(set.index[0]).toEqual({
      id: "a",
      parentId: null,
      title: "Fundamentals",
    })
    expect(set.focusedTopic).toMatchObject({ id: "b", title: "Python" })
    expect(set.focusedTopic).not.toHaveProperty("description")
  })

  it("uses a focused branch when the index cap is exceeded", () => {
    const many = Array.from({ length: 5 }, (_, index) =>
      node(`n${index}`, null, `Topic ${index}`)
    )
    const set = assembleWorkingSet({
      roleId: "role-1",
      roleName: "AI Engineer",
      nodes: many,
      tasks: [],
      links: [],
      context: { ...DEFAULT_TRACK_CONTEXT, maxIndexTopics: 2 },
      focusedTopicId: "n0",
      pendingProposals: [],
      scratchpad: "",
    })

    expect(set.indexMode).toBe("focused-branch")
    expect(set.index.length).toBeLessThanOrEqual(many.length)
  })
})
