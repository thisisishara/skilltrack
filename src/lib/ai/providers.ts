import "server-only"

import { createAnthropic } from "@ai-sdk/anthropic"
import { createGoogleGenerativeAI } from "@ai-sdk/google"
import { createOpenAI } from "@ai-sdk/openai"
import type { LanguageModel } from "ai"

import { DEFAULT_TRACKY_MODELS } from "@/domain/user-settings/defaults"
import type { TrackyProvider } from "@/domain/user-settings/types"

export function createTrackyModel(input: {
  provider: TrackyProvider
  apiKey: string
  model: string | null
  baseUrl: string | null
}): LanguageModel {
  const model = input.model?.trim() || DEFAULT_TRACKY_MODELS[input.provider]

  if (input.provider === "anthropic") {
    return createAnthropic({ apiKey: input.apiKey })(model)
  }
  if (input.provider === "google") {
    return createGoogleGenerativeAI({ apiKey: input.apiKey })(model)
  }
  if (input.provider === "openrouter") {
    return createOpenAI({
      apiKey: input.apiKey,
      baseURL: input.baseUrl?.trim() || "https://openrouter.ai/api/v1",
    })(model)
  }
  return createOpenAI({ apiKey: input.apiKey })(model)
}
