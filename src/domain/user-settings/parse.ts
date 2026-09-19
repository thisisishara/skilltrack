import {
  DEFAULT_TRACK_CONTEXT,
  defaultTrackTools,
  isTrackProvider,
} from "@/domain/user-settings/defaults"
import {
  TRACK_TOOL_IDS,
  type TrackConfig,
  type TrackContextConfig,
  type TrackToolId,
  type TrackToolsConfig,
} from "@/domain/user-settings/types"

function asBoolean(value: unknown, fallback: boolean) {
  return typeof value === "boolean" ? value : fallback
}

function asPositiveInt(value: unknown, fallback: number, max: number) {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return fallback
  }
  return Math.min(max, Math.max(1, Math.round(value)))
}

function parseContext(value: unknown): TrackContextConfig {
  const raw = value && typeof value === "object" ? (value as Record<string, unknown>) : {}
  return {
    maxChatTurns: asPositiveInt(
      raw.maxChatTurns,
      DEFAULT_TRACK_CONTEXT.maxChatTurns,
      40
    ),
    maxToolResultChars: asPositiveInt(
      raw.maxToolResultChars,
      DEFAULT_TRACK_CONTEXT.maxToolResultChars,
      20000
    ),
  }
}

function parseTools(value: unknown): TrackToolsConfig {
  const raw = value && typeof value === "object" ? (value as Record<string, unknown>) : {}
  const defaults = defaultTrackTools()
  for (const id of TRACK_TOOL_IDS) {
    defaults[id] = asBoolean(raw[id], true)
  }
  return defaults
}

export function parseTrackConfig(value: unknown): TrackConfig {
  const raw = value && typeof value === "object" ? (value as Record<string, unknown>) : {}
  return {
    tools: parseTools(raw.tools),
    systemPrompt:
      typeof raw.systemPrompt === "string" && raw.systemPrompt.trim()
        ? raw.systemPrompt
        : null,
    generationPrompt:
      typeof raw.generationPrompt === "string" && raw.generationPrompt.trim()
        ? raw.generationPrompt
        : null,
    context: parseContext(raw.context),
  }
}

export function enabledToolIds(config: TrackConfig): TrackToolId[] {
  return TRACK_TOOL_IDS.filter((id) => config.tools[id])
}

export { isTrackProvider }
