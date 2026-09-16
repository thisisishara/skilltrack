import { describe, expect, it } from "vitest"

import { isApplicationError } from "@/domain/errors"
import {
  parseRoadmapJson,
  remapRoadmapDocument,
  serializeRoadmapDocument,
} from "@/domain/roadmap-json"
import mixedTree from "@/schemas/fixtures/mixed-tree.v1.json"
import seniorAiEngineer from "@/schemas/fixtures/senior-ai-engineer.v1.json"

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
  it("accepts the Senior AI Engineer sample", () => {
    const document = parseRoadmapJson(JSON.stringify(seniorAiEngineer))
    expect(document.name).toBe("Senior AI Engineer")
    expect(document.nodes.every((node) => node.kind === "skill")).toBe(true)
    expect(document.nodes.length).toBeGreaterThan(10)
  })

  it("accepts nested topics, notes, tasks, and links", () => {
    const document = parseRoadmapJson(JSON.stringify(mixedTree))
    const leaf = document.nodes.find((node) => node.title === "Leaf")
    const root = document.nodes.find((node) => node.title === "Root")
    expect(leaf?.parentId).toBe(root?.id)
    expect(root?.notes).toBe("Root notes")
    expect(root?.checklist).toHaveLength(1)
    expect(root?.links).toHaveLength(1)
  })

  it("rejects canvas fields", () => {
    expectValidation(
      JSON.stringify({
        schema: "skilltrack.roadmap.v1",
        roadmap: { name: "Canvas leftover" },
        nodes: [
          {
            id: "00000000-0000-4000-8000-000000000001",
            title: "Skill",
            position: { x: 0, y: 0 },
            handle_kind: "regular",
            incoming_edge_animated: true,
            kind: "label",
          },
        ],
      }),
      "unknown field"
    )
  })

  it("rejects invalid JSON", () => {
    expectValidation("{", "JSON is not valid")
  })

  it("rejects the wrong schema version", () => {
    expectValidation(
      JSON.stringify({ schema: "skilltrack.roadmap.v0", roadmap: { name: "X" }, nodes: [] }),
      "schema must equal"
    )
  })

  it("rejects duplicate node ids", () => {
    const json = structuredClone(mixedTree)
    json.nodes[1].id = json.nodes[0].id
    expectValidation(JSON.stringify(json), "Topic IDs must be unique")
  })

  it("rejects a cycle", () => {
    expectValidation(
      JSON.stringify({
        schema: "skilltrack.roadmap.v1",
        roadmap: { name: "Cycle" },
        nodes: [
          {
            id: "00000000-0000-4000-8000-000000000001",
            title: "A",
            parent_id: "00000000-0000-4000-8000-000000000002",
          },
          {
            id: "00000000-0000-4000-8000-000000000002",
            title: "B",
            parent_id: "00000000-0000-4000-8000-000000000001",
          },
        ],
      }),
      "loop"
    )
  })

  it("rejects a missing parent", () => {
    expectValidation(
      JSON.stringify({
        schema: "skilltrack.roadmap.v1",
        roadmap: { name: "Missing parent" },
        nodes: [
          {
            id: "00000000-0000-4000-8000-000000000001",
            title: "Child",
            parent_id: "00000000-0000-4000-8000-000000000099",
          },
        ],
      }),
      "Each nested topic must belong to another topic"
    )
  })

  it("rejects an empty roadmap name", () => {
    expectValidation(
      JSON.stringify({ schema: "skilltrack.roadmap.v1", roadmap: { name: "  " }, nodes: [] }),
      "roadmap.name cannot be empty"
    )
  })

  it("rejects a malformed link url", () => {
    expectValidation(
      JSON.stringify({
        schema: "skilltrack.roadmap.v1",
        roadmap: { name: "Bad url" },
        nodes: [
          {
            id: "00000000-0000-4000-8000-000000000001",
            title: "Skill",
            links: [
              {
                id: "10000000-0000-4000-8000-000000000001",
                label: "Nope",
                url: "ftp://example.com",
              },
            ],
          },
        ],
      }),
      "HTTP(S)"
    )
  })
})

describe("serializeRoadmapDocument", () => {
  it("round-trips tree fields and omits canvas leftovers", () => {
    const parsed = parseRoadmapJson(JSON.stringify(mixedTree))
    const json = serializeRoadmapDocument(
      { name: parsed.name, description: parsed.description },
      parsed.nodes.map((node, index) => ({
        id: node.id,
        roleId: "role",
        parentId: node.parentId,
        kind: node.kind,
        title: node.title,
        description: node.description,
        notes: node.notes,
        icon: node.icon,
        accentColor: node.accentColor,
        handleKind: "regular",
        incomingEdgeAnimated: false,
        positionX: 12,
        positionY: 34,
        sortOrder: index,
        createdAt: "2026-01-01T00:00:00.000Z",
        updatedAt: "2026-01-01T00:00:00.000Z",
      })),
      parsed.nodes.flatMap((node) =>
        node.checklist.map((item, index) => ({
          id: item.id,
          nodeId: node.id,
          title: item.title,
          description: item.description,
          isCompleted: item.completed,
          sortOrder: index,
          createdAt: "2026-01-01T00:00:00.000Z",
          updatedAt: "2026-01-01T00:00:00.000Z",
          completedAt: item.completed ? "2026-01-01T00:00:00.000Z" : null,
        }))
      ),
      parsed.nodes.flatMap((node) =>
        node.links.map((link) => ({
          id: link.id,
          nodeId: node.id,
          label: link.label,
          url: link.url,
          createdAt: "2026-01-01T00:00:00.000Z",
          updatedAt: "2026-01-01T00:00:00.000Z",
        }))
      )
    )

    expect(json).not.toContain("position")
    expect(json).not.toContain("handle_kind")
    expect(json).not.toContain("incoming_edge_animated")
    expect(json).not.toContain('"kind"')

    const again = parseRoadmapJson(json)
    expect(again.nodes.find((node) => node.title === "Root")?.notes).toBe("Root notes")
    expect(again.nodes.find((node) => node.title === "Leaf")?.parentId).toBe(
      again.nodes.find((node) => node.title === "Root")?.id
    )
  })
})

describe("remapRoadmapDocument", () => {
  it("rewrites node and parent ids", () => {
    let n = 0
    const parsed = parseRoadmapJson(JSON.stringify(mixedTree))
    const remapped = remapRoadmapDocument(parsed, () => {
      n += 1
      return `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`
    })
    expect(remapped.nodes[0].id).not.toBe(parsed.nodes[0].id)
    const leaf = remapped.nodes.find((node) => node.title === "Leaf")
    const root = remapped.nodes.find((node) => node.title === "Root")
    expect(leaf?.parentId).toBe(root?.id)
  })
})
