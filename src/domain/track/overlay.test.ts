import { describe, expect, it } from "vitest"

import { applyAcceptedProposal, type RoadmapSnapshot } from "@/domain/track/overlay"
import type { TrackProposal } from "@/domain/track/proposals"

function snapshot(partial?: Partial<RoadmapSnapshot>): RoadmapSnapshot {
  return {
    roleId: "role-1",
    nodes: [
      {
        id: "topic-1",
        roleId: "role-1",
        parentId: null,
        kind: "skill",
        title: "Python",
        description: null,
        notes: "Old notes",
        icon: "circle-dot",
        color: null,
        handleKind: "regular",
        incomingEdgeAnimated: false,
        positionX: 0,
        positionY: 0,
        sortOrder: 0,
        createdAt: "2026-01-01T00:00:00.000Z",
        updatedAt: "2026-01-01T00:00:00.000Z",
      },
    ],
    items: [
      {
        id: "task-1",
        topicId: "topic-1",
        title: "Test",
        description: null,
        completed: false,
        sortOrder: 0,
        createdAt: "2026-01-01T00:00:00.000Z",
        updatedAt: "2026-01-01T00:00:00.000Z",
        completedAt: null,
      },
    ],
    links: [
      {
        id: "link-1",
        roleId: "role-1",
        topicId: "topic-1",
        label: "Docs",
        url: "https://example.com",
        createdAt: "2026-01-01T00:00:00.000Z",
        updatedAt: "2026-01-01T00:00:00.000Z",
      },
    ],
    ...partial,
  }
}

function proposal(
  partial: Partial<TrackProposal> & Pick<TrackProposal, "entity" | "kind" | "title">
): TrackProposal {
  return {
    id: "p1",
    status: "accepted",
    targetId: null,
    parentId: null,
    payload: {},
    ...partial,
  }
}

describe("applyAcceptedProposal", () => {
  it("adds a created topic", () => {
    const next = applyAcceptedProposal(
      snapshot(),
      proposal({
        entity: "topic",
        kind: "create",
        title: "Rust",
        targetId: "topic-2",
        parentId: "topic-1",
        payload: { id: "topic-2", title: "Rust" },
      })
    )
    expect(next.nodes.map((node) => node.title)).toEqual(["Python", "Rust"])
  })

  it("clears notes on a topic", () => {
    const next = applyAcceptedProposal(
      snapshot(),
      proposal({
        entity: "topic",
        kind: "update",
        title: "Python",
        targetId: "topic-1",
        payload: { notes: null, facet: "notes" },
      })
    )
    expect(next.nodes[0]?.notes).toBeNull()
    expect(next.nodes[0]?.title).toBe("Python")
  })

  it("removes a deleted task", () => {
    const next = applyAcceptedProposal(
      snapshot(),
      proposal({
        entity: "task",
        kind: "delete",
        title: "Test",
        targetId: "task-1",
        parentId: "topic-1",
      })
    )
    expect(next.items).toEqual([])
  })

  it("adds a created link", () => {
    const next = applyAcceptedProposal(
      snapshot({ links: [] }),
      proposal({
        entity: "link",
        kind: "create",
        title: "Guide",
        targetId: "link-2",
        parentId: "topic-1",
        payload: { id: "link-2", url: "https://guide.test", label: "Guide" },
      })
    )
    expect(next.links).toHaveLength(1)
    expect(next.links[0]?.url).toBe("https://guide.test")
  })
})
