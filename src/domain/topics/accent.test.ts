import { describe, expect, it } from "vitest"

import {
  accentUpdatesForChange,
  inheritedAccentColor,
  parseAccentHex,
} from "@/domain/topics/accent"

describe("parseAccentHex", () => {
  it("accepts hex with or without a hash", () => {
    expect(parseAccentHex("#3b82f6")).toEqual({ ok: true, value: "#3b82f6" })
    expect(parseAccentHex("3B82F6")).toEqual({ ok: true, value: "#3b82f6" })
    expect(parseAccentHex(" #f00 ")).toEqual({ ok: true, value: "#ff0000" })
  })

  it("clears empty values and rejects invalid input", () => {
    expect(parseAccentHex("")).toEqual({ ok: true, value: null })
    expect(parseAccentHex(null)).toEqual({ ok: true, value: null })
    expect(parseAccentHex("blue")).toEqual({ ok: false })
    expect(parseAccentHex("#12")).toEqual({ ok: false })
  })
})

describe("accentUpdatesForChange", () => {
  const nodes = [
    { id: "group", parentId: null, color: "#3b82f6" },
    { id: "topic", parentId: "group", color: null },
    { id: "own", parentId: "group", color: "#f43f5e" },
    { id: "leaf", parentId: "topic", color: null },
  ]

  it("keeps nested topics looking the same when only this topic changes", () => {
    expect(
      accentUpdatesForChange(nodes, "group", "#10b981", "keep")
    ).toEqual([
      { id: "group", color: "#10b981" },
      { id: "topic", color: "#3b82f6" },
      { id: "leaf", color: "#3b82f6" },
    ])
  })

  it("applies the new color throughout nested topics", () => {
    expect(
      accentUpdatesForChange(nodes, "group", "#10b981", "apply")
    ).toEqual([
      { id: "group", color: "#10b981" },
      { id: "topic", color: "#10b981" },
      { id: "own", color: "#10b981" },
      { id: "leaf", color: "#10b981" },
    ])
  })
})

describe("inheritedAccentColor", () => {
  it("uses the nearest ancestor accent", () => {
    const nodes = [
      { id: "root", parentId: null, color: null },
      { id: "group", parentId: "root", color: "#3b82f6" },
      { id: "topic", parentId: "group", color: null },
      { id: "child", parentId: "topic", color: "#f43f5e" },
      { id: "leaf", parentId: "child", color: null },
    ]

    expect(inheritedAccentColor(nodes, "topic")).toBe("#3b82f6")
    expect(inheritedAccentColor(nodes, "leaf")).toBe("#f43f5e")
    expect(inheritedAccentColor(nodes, "root")).toBeNull()
  })
})
