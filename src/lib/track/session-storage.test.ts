import { describe, expect, it } from "vitest"

import {
  buildStoredTrackSession,
  mergeTrackTranscript,
  parseStoredTrackSession,
  slimTrackMessagePart,
  slimTrackMessages,
  splitTrackTranscript,
  takeOlderTrackMessages,
} from "@/lib/track/session-storage"

describe("slimTrackMessagePart", () => {
  it("drops reasoning and tool outputs", () => {
    expect(slimTrackMessagePart({ type: "reasoning", text: "secret" })).toBeNull()
    expect(
      slimTrackMessagePart({
        type: "tool-list_children",
        toolCallId: "a",
        state: "output-available",
        input: { topicId: "1" },
        output: { huge: "tree" },
      })
    ).toEqual({
      type: "tool-list_children",
      toolCallId: "a",
      state: "output-available",
      input: { topicId: "1" },
      output: { restored: true },
    })
  })
})

describe("slimTrackMessages", () => {
  it("keeps only user and assistant turns", () => {
    const messages = slimTrackMessages([
      { id: "s", role: "system", parts: [{ type: "text", text: "nope" }] },
      {
        id: "u",
        role: "user",
        parts: [{ type: "text", text: "add a task" }],
      },
    ])
    expect(messages).toEqual([
      {
        id: "u",
        role: "user",
        parts: [{ type: "text", text: "add a task" }],
      },
    ])
  })
})

describe("splitTrackTranscript", () => {
  it("keeps only the tail visible", () => {
    const messages = [1, 2, 3, 4, 5, 6].map((id) => ({ id: String(id) }))
    expect(splitTrackTranscript(messages, 2)).toEqual({
      older: [
        { id: "1" },
        { id: "2" },
        { id: "3" },
        { id: "4" },
      ],
      visible: [{ id: "5" }, { id: "6" }],
    })
  })
})

describe("takeOlderTrackMessages", () => {
  it("pages from the end of the hidden prefix", () => {
    expect(
      takeOlderTrackMessages([{ id: "1" }, { id: "2" }, { id: "3" }], 2)
    ).toEqual({
      older: [{ id: "1" }],
      batch: [{ id: "2" }, { id: "3" }],
    })
  })
})

describe("mergeTrackTranscript", () => {
  it("dedupes overlapping ids", () => {
    expect(
      mergeTrackTranscript([{ id: "1" }, { id: "2" }], [{ id: "2" }, { id: "3" }])
    ).toEqual([{ id: "1" }, { id: "2" }, { id: "3" }])
  })
})

describe("parseStoredTrackSession", () => {
  it("round-trips a slim snapshot", () => {
    const session = buildStoredTrackSession({
      messages: [
        {
          id: "u",
          role: "user",
          parts: [{ type: "text", text: "hi" }],
        },
      ],
      messageContext: {},
      proposals: [
        {
          id: "p1",
          kind: "create",
          entity: "task",
          status: "pending",
          targetId: null,
          parentId: "topic",
          title: "Test stuff",
          payload: { title: "Test stuff" },
        },
      ],
      scratchpad: "Goal: hi",
      pinnedRefs: [],
      elapsedByMessage: { a: 1200 },
    })
    expect(parseStoredTrackSession(session)).toEqual(session)
    expect(parseStoredTrackSession({ v: 0, messages: [] })).toBeNull()
  })
})
