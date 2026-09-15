import { describe, expect, it } from "vitest"

import { adjacentRoleId, roleHrefForCurrentView } from "@/domain/roles/cycle"

describe("adjacentRoleId", () => {
  it("wraps around the list", () => {
    expect(adjacentRoleId(["a", "b", "c"], "a", -1)).toBe("c")
    expect(adjacentRoleId(["a", "b", "c"], "c", 1)).toBe("a")
    expect(adjacentRoleId(["a", "b", "c"], "b", 1)).toBe("c")
  })

  it("picks an end when there is no current role", () => {
    expect(adjacentRoleId(["a", "b"], null, 1)).toBe("a")
    expect(adjacentRoleId(["a", "b"], null, -1)).toBe("b")
  })

  it("does nothing for a single already-selected role", () => {
    expect(adjacentRoleId(["a"], "a", 1)).toBe(null)
    expect(adjacentRoleId([], "a", 1)).toBe(null)
  })
})

describe("roleHrefForCurrentView", () => {
  it("keeps tree and settings while switching roles", () => {
    expect(
      roleHrefForCurrentView("b", "/dashboard/roles/a/tree", "a")
    ).toBe("/dashboard/roles/b/tree")
    expect(
      roleHrefForCurrentView("b", "/dashboard/roles/a/settings", "a")
    ).toBe("/dashboard/roles/b/settings")
  })

  it("falls back to the role canvas", () => {
    expect(roleHrefForCurrentView("b", "/dashboard/roles/a", "a")).toBe(
      "/dashboard/roles/b"
    )
    expect(roleHrefForCurrentView("b", "/dashboard", null)).toBe(
      "/dashboard/roles/b"
    )
  })
})
