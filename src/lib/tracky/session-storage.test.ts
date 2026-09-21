import { describe, expect, it } from "vitest"

import {
  buildStoredTrackySession,
  mergeTrackyTranscript,
  parseStoredTrackySession,
  slimTrackyMessagePart,
  slimTrackyMessages,
  splitTrackyTranscript,
  takeOlderTrackyMessages,
} from "@/lib/tracky/session-storage"

describe("slimTrackyMessagePart", () => {
  it("drops reasoning and tool outputs", () => {
    expect(slimTrackyMessagePart({ type: "reasoning", text: "secret" })).toBeNull()
    expect(
      slimTrackyMessagePart({
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

describe("slimTrackyMessages", () => {
  it("keeps only user and assistant turns", () => {
    const messages = slimTrackyMessages([
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

describe("splitTrackyTranscript", () => {
  it("keeps only the tail visible", () => {
    const messages = [1, 2, 3, 4, 5, 6].map((id) => ({ id: String(id) }))
    expect(splitTrackyTranscript(messages, 2)).toEqual({
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

describe("takeOlderTrackyMessages", () => {
  it("pages from the end of the hidden prefix", () => {
    expect(
      takeOlderTrackyMessages([{ id: "1" }, { id: "2" }, { id: "3" }], 2)
    ).toEqual({
      older: [{ id: "1" }],
      batch: [{ id: "2" }, { id: "3" }],
    })
  })
})

describe("mergeTrackyTranscript", () => {
  it("dedupes overlapping ids", () => {
    expect(
      mergeTrackyTranscript([{ id: "1" }, { id: "2" }], [{ id: "2" }, { id: "3" }])
    ).toEqual([{ id: "1" }, { id: "2" }, { id: "3" }])
  })
})

describe("parseStoredTrackySession", () => {
  it("round-trips a slim snapshot", () => {
    const session = buildStoredTrackySession({
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
    expect(parseStoredTrackySession(session)).toEqual(session)
    expect(parseStoredTrackySession({ v: 0, messages: [] })).toBeNull()
  })
})
