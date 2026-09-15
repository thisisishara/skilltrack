import { describe, expect, it } from "vitest"

import { ancestorTitlePath, matchesSearch } from "@/domain/search/query"

describe("matchesSearch", () => {
  it("matches case-insensitively and treats empty query as all", () => {
    expect(matchesSearch("Hybrid Retrieval", "")).toBe(true)
    expect(matchesSearch("Hybrid Retrieval", "hybrid")).toBe(true)
    expect(matchesSearch("Hybrid Retrieval", "missing")).toBe(false)
  })
})

describe("ancestorTitlePath", () => {
  it("joins parent titles from root without the node itself", () => {
    const nodes = [
      { id: "a", parentId: null, title: "AI Engineering" },
      { id: "b", parentId: "a", title: "RAG" },
      { id: "c", parentId: "b", title: "Hybrid Retrieval" },
    ]

    expect(ancestorTitlePath(nodes, "c")).toBe("AI Engineering / RAG")
    expect(ancestorTitlePath(nodes, "a")).toBe("")
  })
})
