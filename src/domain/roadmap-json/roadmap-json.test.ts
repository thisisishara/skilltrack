import { describe, expect, it } from "vitest"

import { isApplicationError } from "@/domain/errors"
import {
  parseRoadmapJson,
  remapRoadmapDocument,
  serializeRoadmapDocument,
} from "@/domain/roadmap-json"
import mixedCanvas from "@/schemas/fixtures/mixed-canvas.v1.json"
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
  it("accepts the spec §44 sample", () => {
    const document = parseRoadmapJson(JSON.stringify(seniorAiEngineer))
    expect(document.name).toBe("Senior AI Engineer")
    expect(document.nodes.every((node) => node.kind === "skill")).toBe(true)
    expect(document.nodes.length).toBeGreaterThan(10)
  })

  it("accepts labels, handle kinds, and animated edges", () => {
    const document = parseRoadmapJson(JSON.stringify(mixedCanvas))
    const label = document.nodes.find((node) => node.kind === "label")
    const leaf = document.nodes.find((node) => node.title === "Leaf")
    expect(label?.parentId).toBeNull()
    expect(leaf?.handleKind).toBe("input")
    expect(leaf?.incomingEdgeAnimated).toBe(true)
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
    const json = structuredClone(mixedCanvas)
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

  it("rejects a label with a parent", () => {
    expectValidation(
      JSON.stringify({
        schema: "skilltrack.roadmap.v1",
        roadmap: { name: "Bad label" },
        nodes: [
          {
            id: "00000000-0000-4000-8000-000000000001",
            title: "Skill",
          },
          {
            id: "00000000-0000-4000-8000-000000000002",
            kind: "label",
            title: "Caption",
            parent_id: "00000000-0000-4000-8000-000000000001",
          },
        ],
      }),
      "Labels cannot nest under a topic"
    )
  })

  it("rejects a child of a label", () => {
    expectValidation(
      JSON.stringify({
        schema: "skilltrack.roadmap.v1",
        roadmap: { name: "Child of label" },
        nodes: [
          {
            id: "00000000-0000-4000-8000-000000000001",
            kind: "label",
            title: "Caption",
          },
          {
            id: "00000000-0000-4000-8000-000000000002",
            title: "Child",
            parent_id: "00000000-0000-4000-8000-000000000001",
          },
        ],
      }),
      "Labels cannot contain topics"
    )
  })

  it("rejects an output node with a parent", () => {
    expectValidation(
      JSON.stringify({
        schema: "skilltrack.roadmap.v1",
        roadmap: { name: "Output parent" },
        nodes: [
          {
            id: "00000000-0000-4000-8000-000000000001",
            title: "Root",
          },
          {
            id: "00000000-0000-4000-8000-000000000002",
            title: "Out",
            parent_id: "00000000-0000-4000-8000-000000000001",
            handle_kind: "output",
          },
        ],
      }),
      "This topic cannot nest under another topic"
    )
  })

  it("rejects an input node with children", () => {
    expectValidation(
      JSON.stringify({
        schema: "skilltrack.roadmap.v1",
        roadmap: { name: "Input children" },
        nodes: [
          {
            id: "00000000-0000-4000-8000-000000000001",
            title: "In",
            handle_kind: "input",
          },
          {
            id: "00000000-0000-4000-8000-000000000002",
            title: "Child",
            parent_id: "00000000-0000-4000-8000-000000000001",
          },
        ],
      }),
      "This topic cannot have sub-topics"
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
  it("round-trips mixed canvas fields", () => {
    const parsed = parseRoadmapJson(JSON.stringify(mixedCanvas))
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
        handleKind: node.handleKind,
        incomingEdgeAnimated: node.incomingEdgeAnimated,
        positionX: node.positionX,
        positionY: node.positionY,
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

    const again = parseRoadmapJson(json)
    expect(again.nodes.find((node) => node.kind === "label")?.title).toBe("Phase 1")
    expect(again.nodes.find((node) => node.title === "Leaf")?.incomingEdgeAnimated).toBe(true)
  })
})

describe("remapRoadmapDocument", () => {
  it("rewrites node and parent ids", () => {
    let n = 0
    const parsed = parseRoadmapJson(JSON.stringify(mixedCanvas))
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
