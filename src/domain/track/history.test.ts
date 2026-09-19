import { describe, expect, it } from "vitest"

import { compactMessages } from "@/domain/track/history"

describe("compactMessages", () => {
  it("keeps the last N user turns and stubs tool parts", () => {
    const messages = [
      { role: "user", parts: [{ type: "text", text: "one" }] },
      { role: "assistant", parts: [{ type: "tool-get_topic", toolName: "get_topic", output: { huge: true } }] },
      { role: "user", parts: [{ type: "text", text: "two" }] },
      { role: "assistant", parts: [{ type: "text", text: "ok" }] },
      { role: "user", parts: [{ type: "text", text: "three" }] },
    ]

    const compacted = compactMessages(messages, 2)
    expect(compacted.map((item) => (item.parts?.[0] as { text?: string }).text)).toEqual([
      "[tool get_topic]",
      "two",
      "ok",
      "three",
    ])
  })
})
