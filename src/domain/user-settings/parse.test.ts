import { describe, expect, it } from "vitest"

import { parseTrackConfig } from "@/domain/user-settings/parse"

describe("parseTrackConfig", () => {
  it("fills defaults for missing fields", () => {
    const config = parseTrackConfig({})
    expect(config.context.includeTitleIndex).toBe(true)
    expect(config.context.includeDescriptions).toBe(false)
    expect(config.tools.search_topics).toBe(true)
    expect(config.systemPrompt).toBeNull()
  })

  it("clamps numeric context values", () => {
    const config = parseTrackConfig({
      context: { maxIndexTopics: 9999, maxChatTurns: 0 },
    })
    expect(config.context.maxIndexTopics).toBe(400)
    expect(config.context.maxChatTurns).toBe(1)
  })
})
