import { describe, expect, it } from "vitest"

import {
  activityFromRoles,
  ROADMAP_STALE_AFTER_MS,
  staleForLabel,
  staleRoadmapNotifications,
} from "@/domain/notifications/stale"

const now = new Date("2026-09-17T00:00:00.000Z")

describe("stale roadmap notifications", () => {
  it("skips roadmaps touched within two weeks", () => {
    expect(
      staleRoadmapNotifications(
        [
          {
            roleId: "fresh",
            roleName: "Fresh",
            lastActivityAt: "2026-09-10T00:00:00.000Z",
          },
        ],
        now
      )
    ).toEqual([])
  })

  it("reminds about roadmaps idle longer than two weeks, oldest first", () => {
    const stale = staleRoadmapNotifications(
      [
        {
          roleId: "newer",
          roleName: "Backend",
          lastActivityAt: "2026-08-20T00:00:00.000Z",
        },
        {
          roleId: "older",
          roleName: "Frontend",
          lastActivityAt: "2026-07-01T00:00:00.000Z",
        },
      ],
      now
    )

    expect(stale.map((item) => item.roleId)).toEqual(["older", "newer"])
    expect(stale[0]?.staleForLabel).toBe("2 months")
    expect(stale[1]?.staleForLabel).toBe("4 weeks")
    expect(stale[0]?.id).toBe("stale-roadmap:older")
  })

  it("uses the latest role or content timestamp", () => {
    expect(
      activityFromRoles(
        [
          {
            id: "role-1",
            name: "AI",
            createdAt: "2026-01-01T00:00:00.000Z",
            updatedAt: "2026-02-01T00:00:00.000Z",
          },
        ],
        new Map([["role-1", "2026-03-01T00:00:00.000Z"]])
      )
    ).toEqual([
      {
        roleId: "role-1",
        roleName: "AI",
        lastActivityAt: "2026-03-01T00:00:00.000Z",
      },
    ])
  })

  it("labels two weeks as the stale threshold", () => {
    expect(ROADMAP_STALE_AFTER_MS).toBe(14 * 24 * 60 * 60 * 1000)
    expect(staleForLabel(new Date("2026-09-03T00:00:00.000Z"), now)).toBe("2 weeks")
  })
})
