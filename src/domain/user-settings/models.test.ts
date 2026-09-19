import { describe, expect, it } from "vitest"

import {
  addExtraModel,
  defaultModelForProvider,
  emptyExtraModels,
  modelsForProvider,
  removeExtraModel,
} from "@/domain/user-settings/models"

describe("track model catalog", () => {
  it("lists only catalog models for a provider", () => {
    const extra = emptyExtraModels()
    extra.openai = ["gpt-5.6-luna", "gpt-6-astra"]
    expect(modelsForProvider("openai", extra)).toEqual([
      "gpt-5.6-luna",
      "gpt-6-astra",
    ])
  })

  it("adds and removes any catalog model", () => {
    const added = addExtraModel(emptyExtraModels(), "anthropic", "claude-sonnet-5")
    expect(added.ok).toBe(true)
    if (!added.ok) {
      return
    }
    expect(added.extra.anthropic).toEqual(["claude-sonnet-5"])
    expect(removeExtraModel(added.extra, "anthropic", "claude-sonnet-5").anthropic).toEqual(
      []
    )
  })

  it("rejects duplicates and invalid ids", () => {
    const extra = emptyExtraModels()
    extra.openai = ["gpt-5.6-luna"]
    expect(addExtraModel(extra, "openai", "gpt-5.6-luna").ok).toBe(false)
    expect(addExtraModel(emptyExtraModels(), "openai", "no spaces").ok).toBe(false)
  })

  it("prefers the default model when it is in the catalog", () => {
    const extra = emptyExtraModels()
    extra.google = ["gemini-3.1-pro-preview", "gemini-3.8-flash"]
    expect(defaultModelForProvider("google", extra)).toBe("gemini-3.8-flash")
  })
})
