import { describe, expect, it } from "vitest"

import { parseTrackyConfig } from "@/domain/user-settings/parse"

describe("parseTrackyConfig", () => {
  it("fills defaults for missing fields", () => {
    const config = parseTrackyConfig({})
    expect(config.context.maxChatTurns).toBe(8)
    expect(config.context.maxToolResultChars).toBe(4000)
    expect(config.tools.search_topics).toBe(true)
    expect(config.tools.list_roots).toBe(true)
    expect(config.tools.get_notes).toBe(true)
    expect(config.tools.propose_create_notes).toBe(true)
    expect(config.tools.propose_update_notes).toBe(true)
    expect(config.tools.get_role).toBe(true)
    expect(config.tools.propose_update_role).toBe(true)
    expect(config.systemPrompt).toBeNull()
  })

  it("clamps numeric context values and ignores leftover include flags", () => {
    const config = parseTrackyConfig({
      context: {
        maxIndexTopics: 9999,
        maxChatTurns: 0,
        maxToolResultChars: 50,
        includeNotes: true,
        includeTitleIndex: false,
      },
    })
    expect(config.context).toEqual({
      maxChatTurns: 1,
      maxToolResultChars: 50,
    })
    expect(config.context).not.toHaveProperty("includeNotes")
    expect(config.context).not.toHaveProperty("maxIndexTopics")
  })
})
