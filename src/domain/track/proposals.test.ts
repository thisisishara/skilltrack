import { describe, expect, it } from "vitest"

import {
  proposalFocusNodeId,
  proposalHeadline,
  type TrackProposal,
} from "@/domain/track/proposals"

function proposal(partial: Partial<TrackProposal> & Pick<TrackProposal, "entity" | "kind" | "title">): TrackProposal {
  return {
    id: "p1",
    status: "pending",
    targetId: null,
    parentId: null,
    payload: {},
    ...partial,
  }
}

describe("proposalFocusNodeId", () => {
  it("focuses the parent topic for tasks and links", () => {
    expect(
      proposalFocusNodeId(
        proposal({
          entity: "task",
          kind: "delete",
          title: "Test",
          targetId: "task-1",
          parentId: "topic-1",
        })
      )
    ).toBe("topic-1")
    expect(
      proposalFocusNodeId(
        proposal({
          entity: "link",
          kind: "update",
          title: "Docs",
          targetId: "link-1",
          parentId: "topic-2",
        })
      )
    ).toBe("topic-2")
  })

  it("focuses the topic itself for topic edits", () => {
    expect(
      proposalFocusNodeId(
        proposal({
          entity: "topic",
          kind: "update",
          title: "Python",
          targetId: "topic-9",
          parentId: "topic-1",
        })
      )
    ).toBe("topic-9")
  })
})

describe("proposalHeadline", () => {
  it("includes the parent topic for tasks", () => {
    expect(
      proposalHeadline(
        proposal({
          entity: "task",
          kind: "delete",
          title: "Test",
          payload: { topicTitle: "Software Engineering Foundations" },
        })
      )
    ).toBe("Delete task: Test · Software Engineering Foundations")
  })

  it("includes the parent topic for links", () => {
    expect(
      proposalHeadline(
        proposal({
          entity: "link",
          kind: "delete",
          title: "Docs",
          payload: { topicTitle: "Relational databases" },
        })
      )
    ).toBe("Delete link: Docs · Relational databases")
  })

  it("falls back to a client topic title when payload omits it", () => {
    expect(
      proposalHeadline(
        proposal({
          entity: "task",
          kind: "delete",
          title: "Test",
        }),
        "Software Engineering Foundations"
      )
    ).toBe("Delete task: Test · Software Engineering Foundations")
  })

  it("names notes with the topic", () => {
    expect(
      proposalHeadline(
        proposal({
          entity: "topic",
          kind: "update",
          title: "Python",
          payload: {
            facet: "notes",
            notesAction: "delete",
            topicTitle: "Python",
          },
        })
      )
    ).toBe("Clear notes · Python")
  })
})
