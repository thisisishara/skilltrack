import "server-only"

import type { TrackProvider } from "@/domain/user-settings/types"

const OPENAI_MODELS = "https://api.openai.com/v1/models"
const OPENROUTER_MODELS = "https://openrouter.ai/api/v1/models"
const ANTHROPIC_MODELS = "https://api.anthropic.com/v1/models"
const GOOGLE_MODELS = "https://generativelanguage.googleapis.com/v1beta/models"

export async function validateProviderKey(input: {
  provider: TrackProvider
  apiKey: string
  baseUrl?: string | null
}): Promise<{ ok: true } | { ok: false; message: string }> {
  try {
    if (input.provider === "openai") {
      const response = await fetch(OPENAI_MODELS, {
        headers: { Authorization: `Bearer ${input.apiKey}` },
      })
      if (!response.ok) {
        return { ok: false, message: "OpenAI rejected that API key." }
      }
      return { ok: true }
    }

    if (input.provider === "openrouter") {
      const origin = (input.baseUrl?.replace(/\/$/, "") || "https://openrouter.ai/api/v1")
      const response = await fetch(`${origin}/models`, {
        headers: { Authorization: `Bearer ${input.apiKey}` },
      })
      if (!response.ok) {
        return { ok: false, message: "OpenRouter rejected that API key." }
      }
      return { ok: true }
    }

    if (input.provider === "anthropic") {
      const response = await fetch(ANTHROPIC_MODELS, {
        headers: {
          "x-api-key": input.apiKey,
          "anthropic-version": "2023-06-01",
        },
      })
      if (!response.ok) {
        return { ok: false, message: "Anthropic rejected that API key." }
      }
      return { ok: true }
    }

    const response = await fetch(`${GOOGLE_MODELS}?key=${encodeURIComponent(input.apiKey)}`)
    if (!response.ok) {
      return { ok: false, message: "Gemini rejected that API key." }
    }
    return { ok: true }
  } catch {
    return { ok: false, message: "Could not reach that provider to check the key." }
  }
}
