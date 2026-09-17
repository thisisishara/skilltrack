import { describe, expect, it } from "vitest"

import { wouldCreateCycle } from "@/domain/topics/hierarchy"
import { displayRoleName } from "@/domain/roles/name"

describe("wouldCreateCycle", () => {
  const nodes = [
    { id: "a", parentId: null },
    { id: "b", parentId: "a" },
    { id: "c", parentId: "b" },
  ]

  it("allows moving a node under a non-descendant", () => {
    expect(wouldCreateCycle(nodes, "c", "a")).toBe(false)
    expect(wouldCreateCycle(nodes, "c", null)).toBe(false)
  })

  it("detects a self-parent and an ancestor loop", () => {
    expect(wouldCreateCycle(nodes, "a", "a")).toBe(true)
    expect(wouldCreateCycle(nodes, "a", "c")).toBe(true)
  })
})

describe("displayRoleName", () => {
  it("trims surrounding whitespace and keeps exact case", () => {
    expect(displayRoleName("  Senior AI  ")).toBe("Senior AI")
    expect(displayRoleName("")).toBe("")
  })
})
