import { describe, expect, it } from "vitest"

import {
  inheritedAccentColor,
  parseAccentHex,
} from "@/domain/nodes/accent"

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

describe("inheritedAccentColor", () => {
  it("uses the nearest ancestor accent", () => {
    const nodes = [
      { id: "root", parentId: null, accentColor: null },
      { id: "group", parentId: "root", accentColor: "#3b82f6" },
      { id: "topic", parentId: "group", accentColor: null },
      { id: "child", parentId: "topic", accentColor: "#f43f5e" },
      { id: "leaf", parentId: "child", accentColor: null },
    ]

    expect(inheritedAccentColor(nodes, "topic")).toBe("#3b82f6")
    expect(inheritedAccentColor(nodes, "leaf")).toBe("#f43f5e")
    expect(inheritedAccentColor(nodes, "root")).toBeNull()
  })
})
