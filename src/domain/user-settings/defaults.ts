import {
  TRACK_TOOL_IDS,
  type TrackConfig,
  type TrackContextConfig,
  type TrackProvider,
  type TrackToolsConfig,
} from "@/domain/user-settings/types"

export const DEFAULT_TRACK_CONTEXT: TrackContextConfig = {
  maxChatTurns: 8,
  maxToolResultChars: 4000,
}

export const TRACK_READ_STEP_BUDGET = 12

export function defaultTrackTools(): TrackToolsConfig {
  return Object.fromEntries(TRACK_TOOL_IDS.map((id) => [id, true])) as TrackToolsConfig
}

export function defaultTrackConfig(): TrackConfig {
  return {
    tools: defaultTrackTools(),
    systemPrompt: null,
    generationPrompt: null,
    context: { ...DEFAULT_TRACK_CONTEXT },
  }
}

export const DEFAULT_TRACK_MODELS: Record<TrackProvider, string> = {
  anthropic: "claude-sonnet-5",
  openai: "gpt-5.6-luna",
  google: "gemini-3.8-flash",
  openrouter: "openai/gpt-5.6-luna",
}

export function isTrackProvider(value: unknown): value is TrackProvider {
  return (
    value === "anthropic" ||
    value === "openai" ||
    value === "google" ||
    value === "openrouter"
  )
}
