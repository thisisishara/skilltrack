import { describe, expect, it } from "vitest"

import { applyAcceptedProposal, overlayGhostLinks, overlayRoleNotes, overlayTopicNotes, type RoadmapSnapshot } from "@/domain/tracky/overlay"
import type { TrackyProposal } from "@/domain/tracky/proposals"

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
    notes: [
      {
        id: "note-1",
        topicId: "topic-1",
        title: "Notes",
        body: "Old notes",
        sortOrder: 0,
        createdAt: "2026-01-01T00:00:00.000Z",
        updatedAt: "2026-01-01T00:00:00.000Z",
      },
    ],
    ...partial,
  }
}

function proposal(
  partial: Partial<TrackyProposal> & Pick<TrackyProposal, "entity" | "kind" | "title">
): TrackyProposal {
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

  it("deletes one topic note", () => {
    const next = applyAcceptedProposal(
      snapshot(),
      proposal({
        entity: "topic",
        kind: "update",
        title: "Notes",
        targetId: "topic-1",
        payload: {
          noteId: "note-1",
          topicId: "topic-1",
          facet: "notes",
          notesAction: "delete",
        },
      })
    )
    expect(next.notes).toEqual([])
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

  it("updates roadmap notes", () => {
    const next = applyAcceptedProposal(
      snapshot({ roleNotes: "Every topic below is required." }),
      proposal({
        entity: "roadmap",
        kind: "update",
        title: "Roadmap notes",
        payload: { facet: "role", notes: "Required topics are listed below." },
      })
    )
    expect(next.roleNotes).toBe("Required topics are listed below.")
  })
})

describe("pending overlays", () => {
  it("shows topic note edits before they are accepted", () => {
    const notes = overlayTopicNotes(snapshot().notes ?? [], [
      proposal({
        status: "pending",
        entity: "topic",
        kind: "update",
        title: "Shorter",
        targetId: "topic-1",
        payload: {
          noteId: "note-1",
          noteTitle: "Shorter",
          body: "Shorter notes.",
          facet: "notes",
          notesAction: "update",
        },
      }),
    ])
    expect(notes[0]?.title).toBe("Shorter")
    expect(notes[0]?.body).toBe("Shorter notes.")
  })

  it("shows link edits and hides deleted links", () => {
    const links = overlayGhostLinks(
      snapshot().links,
      [
        proposal({
          status: "pending",
          entity: "link",
          kind: "update",
          title: "Docs v2",
          targetId: "link-1",
          parentId: "topic-1",
          payload: { label: "Docs v2", url: "https://new.example" },
        }),
      ],
      "role-1"
    )
    expect(links[0]?.label).toBe("Docs v2")
    expect(links[0]?.url).toBe("https://new.example")
  })

  it("overlays roadmap notes", () => {
    expect(
      overlayRoleNotes("Long note", [
        proposal({
          status: "pending",
          entity: "roadmap",
          kind: "update",
          title: "Roadmap notes",
          payload: { facet: "role", notes: "Short note" },
        }),
      ])
    ).toBe("Short note")
  })
})
