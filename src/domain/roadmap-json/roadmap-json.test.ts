import { describe, expect, it } from "vitest"

import { isApplicationError } from "@/domain/errors"
import {
  parseRoadmapJson,
  remapRoadmapDocument,
  serializeRoadmapDocument,
} from "@/domain/roadmap-json"
import mixedTree from "@/schemas/fixtures/mixed-tree.json"

function expectValidation(json: string, message: string) {
  try {
    parseRoadmapJson(json)
    throw new Error("expected validation failure")
  } catch (error) {
    expect(isApplicationError(error)).toBe(true)
    if (isApplicationError(error)) {
      expect(error.message).toContain(message)
    }
  }
}

describe("parseRoadmapJson", () => {
  it("accepts nested topics, notes, tasks, and links", () => {
    const document = parseRoadmapJson(JSON.stringify(mixedTree))
    const leaf = document.topics.find((topic) => topic.title === "Leaf")
    const root = document.topics.find((topic) => topic.title === "Root")
    expect(document.name).toBe("Mixed Tree")
    expect(document.notes).toBe("Roadmap notes")
    expect(leaf?.parentId).toBe(root?.id)
    expect(root?.notes).toBe("Root notes")
    expect(root?.tasks).toHaveLength(1)
    expect(root?.links).toHaveLength(1)
  })

  it("rejects canvas leftovers and unknown fields", () => {
    expectValidation(
      JSON.stringify({
        roadmap: { title: "Canvas leftover" },
        topics: [
          {
            id: "00000000-0000-4000-8000-000000000001",
            title: "Skill",
            parent_id: "00000000-0000-4000-8000-000000000002",
          },
        ],
      }),
      "unknown field"
    )
  })

  it("rejects invalid JSON", () => {
    expectValidation("{", "JSON is not valid")
  })

  it("rejects a document missing topics", () => {
    expectValidation(
      JSON.stringify({ roadmap: { title: "X" } }),
      "topics must be an array"
    )
  })

  it("rejects duplicate topic ids", () => {
    expectValidation(
      JSON.stringify({
        roadmap: { title: "Dup" },
        topics: [
          {
            id: "00000000-0000-4000-8000-000000000001",
            title: "A",
            topics: [
              {
                id: "00000000-0000-4000-8000-000000000001",
                title: "B",
              },
            ],
          },
        ],
      }),
      "Topic IDs must be unique"
    )
  })

  it("rejects an empty roadmap title", () => {
    expectValidation(
      JSON.stringify({ roadmap: { title: "  " }, topics: [] }),
      "roadmap.title cannot be empty"
    )
  })
})

describe("serializeRoadmapDocument", () => {
  it("round-trips nested topics without parent_id", () => {
    const parsed = parseRoadmapJson(JSON.stringify(mixedTree))
    const json = serializeRoadmapDocument(
      { name: parsed.name, description: parsed.description, notes: parsed.notes },
      parsed.topics.map((topic, index) => ({
        id: topic.id,
        roleId: "role",
        parentId: topic.parentId,
        kind: "skill" as const,
        title: topic.title,
        description: topic.description,
        notes: topic.notes,
        icon: topic.icon,
        color: topic.color,
        handleKind: "regular" as const,
        incomingEdgeAnimated: false,
        positionX: 0,
        positionY: 0,
        sortOrder: index,
        createdAt: "2026-01-01T00:00:00.000Z",
        updatedAt: "2026-01-01T00:00:00.000Z",
      })),
      parsed.topics.flatMap((topic) =>
        topic.tasks.map((task, index) => ({
          id: task.id,
          topicId: topic.id,
          title: task.title,
          description: task.description,
          completed: task.completed,
          sortOrder: index,
          createdAt: "2026-01-01T00:00:00.000Z",
          updatedAt: "2026-01-01T00:00:00.000Z",
          completedAt: task.completed ? "2026-01-01T00:00:00.000Z" : null,
        }))
      ),
      parsed.topics.flatMap((topic) =>
        topic.links.map((link) => ({
          id: link.id,
          roleId: "role",
          topicId: topic.id,
          label: link.label,
          url: link.url,
          createdAt: "2026-01-01T00:00:00.000Z",
          updatedAt: "2026-01-01T00:00:00.000Z",
        }))
      )
    )

    expect(json).not.toContain("parent_id")
    expect(json).not.toContain("checklist")
    expect(json).not.toContain("accent_color")
    expect(json).not.toContain('"schema"')

    const again = parseRoadmapJson(json)
    expect(again.topics.find((topic) => topic.title === "Leaf")?.parentId).toBe(
      again.topics.find((topic) => topic.title === "Root")?.id
    )
  })
})

describe("remapRoadmapDocument", () => {
  it("rewrites topic and parent ids", () => {
    let n = 0
    const parsed = parseRoadmapJson(JSON.stringify(mixedTree))
    const remapped = remapRoadmapDocument(parsed, () => {
      n += 1
      return `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`
    })
    expect(remapped.topics[0].id).not.toBe(parsed.topics[0].id)
    const leaf = remapped.topics.find((topic) => topic.title === "Leaf")
    const root = remapped.topics.find((topic) => topic.title === "Root")
    expect(leaf?.parentId).toBe(root?.id)
  })
})
