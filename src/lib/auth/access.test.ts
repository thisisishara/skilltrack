import { describe, expect, it } from "vitest"

import {
  isApprovedStatus,
  isFixedAdminUsername,
} from "@/lib/auth/access"

describe("access helpers", () => {
  it("treats only thisisishara as the fixed admin username", () => {
    expect(isFixedAdminUsername("thisisishara")).toBe(true)
    expect(isFixedAdminUsername("ThisIsIshara")).toBe(true)
    expect(isFixedAdminUsername("dinushiTJ")).toBe(false)
    expect(isFixedAdminUsername(null)).toBe(false)
  })

  it("treats only approved as an allowed login status", () => {
    expect(isApprovedStatus("approved")).toBe(true)
    expect(isApprovedStatus("pending")).toBe(false)
    expect(isApprovedStatus("denied")).toBe(false)
  })
})
