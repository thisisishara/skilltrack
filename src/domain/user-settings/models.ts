import { DEFAULT_TRACKY_MODELS } from "@/domain/user-settings/defaults"
import type { TrackyProvider } from "@/domain/user-settings/types"

export type TrackyExtraModels = Record<TrackyProvider, string[]>

export const TRACKY_PROVIDER_OPTIONS: { id: TrackyProvider; label: string }[] = [
  { id: "anthropic", label: "Claude" },
  { id: "openai", label: "OpenAI" },
  { id: "google", label: "Gemini" },
  { id: "openrouter", label: "OpenRouter" },
]

export const MAX_CATALOG_MODELS_PER_PROVIDER = 50

export function emptyExtraModels(): TrackyExtraModels {
  return {
    anthropic: [],
    openai: [],
    google: [],
    openrouter: [],
  }
}

export function normalizeModelId(value: string) {
  return value.trim()
}

export function isValidModelId(value: string) {
  const id = normalizeModelId(value)
  return id.length > 0 && id.length <= 200 && /^[\w./:+-]+$/.test(id)
}

export function parseExtraModels(value: unknown): TrackyExtraModels {
  const extra = emptyExtraModels()
  if (!value || typeof value !== "object") {
    return extra
  }
  const raw = value as Record<string, unknown>
  for (const provider of Object.keys(extra) as TrackyProvider[]) {
    const list = raw[provider]
    if (!Array.isArray(list)) {
      continue
    }
    const seen = new Set<string>()
    for (const item of list) {
      if (typeof item !== "string" || !isValidModelId(item)) {
        continue
      }
      const id = normalizeModelId(item)
      if (seen.has(id) || extra[provider].length >= MAX_CATALOG_MODELS_PER_PROVIDER) {
        continue
      }
      seen.add(id)
      extra[provider].push(id)
    }
  }
  return extra
}

export function modelsForProvider(
  provider: TrackyProvider,
  extra: TrackyExtraModels
) {
  const seen = new Set<string>()
  const models: string[] = []
  for (const id of extra[provider] ?? []) {
    if (seen.has(id)) {
      continue
    }
    seen.add(id)
    models.push(id)
  }
  return models
}

export function defaultModelForProvider(
  provider: TrackyProvider,
  extra: TrackyExtraModels
) {
  const models = modelsForProvider(provider, extra)
  const preferred = DEFAULT_TRACKY_MODELS[provider]
  if (models.includes(preferred)) {
    return preferred
  }
  return models[0] ?? preferred
}

export function addExtraModel(
  extra: TrackyExtraModels,
  provider: TrackyProvider,
  modelId: string
) {
  const id = normalizeModelId(modelId)
  if (!isValidModelId(id)) {
    return { ok: false as const, message: "Use a model id like gpt-5.6-luna." }
  }
  if (extra[provider].includes(id)) {
    return { ok: false as const, message: "That model is already in the list." }
  }
  if (extra[provider].length >= MAX_CATALOG_MODELS_PER_PROVIDER) {
    return { ok: false as const, message: "That provider already has enough models." }
  }
  return {
    ok: true as const,
    extra: {
      ...extra,
      [provider]: [...extra[provider], id],
    },
  }
}

export function removeExtraModel(
  extra: TrackyExtraModels,
  provider: TrackyProvider,
  modelId: string
) {
  return {
    ...extra,
    [provider]: extra[provider].filter((item) => item !== modelId),
  }
}
