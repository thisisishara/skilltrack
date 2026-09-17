import { describe, expect, it } from "vitest"

import {
  applyPlacements,
  dropPositionFromOffset,
  placementUpdates,
  rootPlacementUpdates,
} from "@/domain/topics/placement"

const nodes = [
  { id: "root", parentId: null, sortOrder: 0 },
  { id: "a", parentId: "root", sortOrder: 0 },
  { id: "b", parentId: "root", sortOrder: 1 },
  { id: "a1", parentId: "a", sortOrder: 0 },
  { id: "a2", parentId: "a", sortOrder: 1 },
]

describe("placementUpdates", () => {
  it("reorders siblings", () => {
    const updates = placementUpdates(nodes, "b", "a", "before")
    expect(updates).toEqual([
      { id: "b", parentId: "root", sortOrder: 0 },
      { id: "a", parentId: "root", sortOrder: 1 },
    ])
  })

  it("nests a topic inside another", () => {
    const updates = placementUpdates(nodes, "b", "a", "inside")
    expect(updates?.find((item) => item.id === "b")).toEqual({
      id: "b",
      parentId: "a",
      sortOrder: 2,
    })
    expect(updates?.find((item) => item.id === "a")).toEqual({
      id: "a",
      parentId: "root",
      sortOrder: 0,
    })
  })

  it("moves a nested topic up to the parent level", () => {
    const updates = placementUpdates(nodes, "a1", "b", "before")
    expect(updates?.find((item) => item.id === "a1")).toEqual({
      id: "a1",
      parentId: "root",
      sortOrder: 1,
    })
    expect(updates?.find((item) => item.id === "a2")).toEqual({
      id: "a2",
      parentId: "a",
      sortOrder: 0,
    })
  })

  it("rejects dropping a topic onto its descendant", () => {
    expect(placementUpdates(nodes, "a", "a1", "inside")).toBeNull()
    expect(placementUpdates(nodes, "a", "a1", "before")).toBeNull()
  })

  it("applies placements onto a node list", () => {
    const updates = placementUpdates(nodes, "b", "a", "before")
    expect(updates).not.toBeNull()
    const next = applyPlacements(nodes, updates ?? [])
    expect(next.find((node) => node.id === "b")?.sortOrder).toBe(0)
    expect(next.find((node) => node.id === "a")?.sortOrder).toBe(1)
  })
})

describe("dropPositionFromOffset", () => {
  it("splits before and after when nesting is not allowed", () => {
    expect(dropPositionFromOffset(10, 100, false)).toBe("before")
    expect(dropPositionFromOffset(80, 100, false)).toBe("after")
  })

  it("uses the middle band to nest", () => {
    expect(dropPositionFromOffset(50, 100, true)).toBe("inside")
    expect(dropPositionFromOffset(10, 100, true)).toBe("before")
  })
})

describe("rootPlacementUpdates", () => {
  it("promotes a nested topic to the root", () => {
    const updates = rootPlacementUpdates(nodes, "a1")
    expect(updates?.find((item) => item.id === "a1")).toEqual({
      id: "a1",
      parentId: null,
      sortOrder: 1,
    })
    expect(updates?.find((item) => item.id === "a2")).toEqual({
      id: "a2",
      parentId: "a",
      sortOrder: 0,
    })
  })
})
