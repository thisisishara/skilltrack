import { describe, expect, it } from "vitest"

import { buildRoadmapImportPrompt } from "@/lib/roadmap/llm-prompt"

describe("buildRoadmapImportPrompt", () => {
  it("embeds the role title and extra guidance", () => {
    const prompt = buildRoadmapImportPrompt({
      roleTitle: "Staff Platform Engineer",
      extraGuidance: "Focus on Kubernetes and observability.",
    })

    expect(prompt).toContain("Staff Platform Engineer")
    expect(prompt).toContain("Focus on Kubernetes and observability.")
    expect(prompt).toContain("SkillTrack is an app for building a skill roadmap")
    expect(prompt).toContain("Return ONLY a single JSON object")
    expect(prompt).toContain("parent_id")
    expect(prompt).toContain('"roadmap"')
    expect(prompt).toContain('"topics"')
  })

  it("falls back when the title is blank", () => {
    const prompt = buildRoadmapImportPrompt({
      roleTitle: "   ",
    })

    expect(prompt).toContain("the target role")
    expect(prompt).toContain("No extra guidance")
  })
})
