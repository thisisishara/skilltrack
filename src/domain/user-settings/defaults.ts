import {
  TRACK_TOOL_IDS,
  type TrackConfig,
  type TrackContextConfig,
  type TrackProvider,
  type TrackToolsConfig,
} from "@/domain/user-settings/types"

export const DEFAULT_TRACK_CONTEXT: TrackContextConfig = {
  includeTitleIndex: true,
  maxIndexTopics: 80,
  includeFocusedTopicDetails: true,
  includeDescriptions: false,
  includeNotes: false,
  includeTasks: false,
  includeLinks: false,
  includePendingProposals: true,
  maxChatTurns: 8,
  maxToolResultChars: 4000,
  attachFocusedTopic: true,
}

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
  anthropic: "claude-sonnet-4-5",
  openai: "gpt-4o-mini",
  google: "gemini-2.5-flash",
  openrouter: "openai/gpt-4o-mini",
}

export function isTrackProvider(value: unknown): value is TrackProvider {
  return (
    value === "anthropic" ||
    value === "openai" ||
    value === "google" ||
    value === "openrouter"
  )
}
