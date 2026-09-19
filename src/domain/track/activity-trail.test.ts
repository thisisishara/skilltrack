import { describe, expect, it } from "vitest"

import {
  activityNextLabel,
  activitySummary,
  formatElapsedMs,
  toolActivitiesFromParts,
} from "@/domain/track/activity-trail"

describe("toolActivitiesFromParts", () => {
  it("reads AI SDK tool parts without using outputs", () => {
    const activities = toolActivitiesFromParts([
      {
        type: "tool-search_topics",
        toolCallId: "a",
        state: "output-available",
        input: { query: "Python" },
        output: { huge: true },
      },
      {
        type: "tool-propose_update_topic",
        toolCallId: "b",
        state: "input-available",
        input: { title: "Syntax" },
      },
    ])
    expect(activities).toEqual([
      {
        id: "a",
        name: "search_topics",
        label: "Searched topics",
        detail: "Python",
        state: "done",
      },
      {
        id: "b",
        name: "propose_update_topic",
        label: "Propose topic update",
        detail: "Syntax",
        state: "running",
      },
    ])
  })

  it("skips text and reasoning parts", () => {
    expect(
      toolActivitiesFromParts([
        { type: "text", text: "hi" },
        { type: "reasoning", text: "secret" },
      ])
    ).toEqual([])
  })
})

describe("activitySummary", () => {
  it("formats a finished trail from local elapsed time", () => {
    expect(
      activitySummary({
        activities: [
          {
            id: "a",
            name: "list_roots",
            label: "Listed roots",
            detail: null,
            state: "done",
          },
        ],
        busy: false,
        elapsedMs: 4200,
      })
    ).toBe("Used 1 tool · 4s")
  })
})

describe("activityNextLabel", () => {
  it("shows writing after tools finish while the reply is still streaming", () => {
    expect(
      activityNextLabel(
        [
          {
            id: "a",
            name: "list_roots",
            label: "Listed roots",
            detail: null,
            state: "done",
          },
        ],
        true
      )
    ).toBe("Writing reply")
  })

  it("does not keep writing once reply text is on the message", () => {
    expect(
      activityNextLabel(
        [
          {
            id: "a",
            name: "list_roots",
            label: "Listed roots",
            detail: null,
            state: "done",
          },
        ],
        true,
        true
      )
    ).toBeNull()
  })
})

describe("formatElapsedMs", () => {
  it("keeps the clock short", () => {
    expect(formatElapsedMs(800)).toBe("a moment")
    expect(formatElapsedMs(65_000)).toBe("1m 5s")
  })
})
