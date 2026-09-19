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
    includeTitleIndex: asBoolean(raw.includeTitleIndex, DEFAULT_TRACK_CONTEXT.includeTitleIndex),
    maxIndexTopics: asPositiveInt(
      raw.maxIndexTopics,
      DEFAULT_TRACK_CONTEXT.maxIndexTopics,
      400
    ),
    includeFocusedTopicDetails: asBoolean(
      raw.includeFocusedTopicDetails,
      DEFAULT_TRACK_CONTEXT.includeFocusedTopicDetails
    ),
    includeDescriptions: asBoolean(
      raw.includeDescriptions,
      DEFAULT_TRACK_CONTEXT.includeDescriptions
    ),
    includeNotes: asBoolean(raw.includeNotes, DEFAULT_TRACK_CONTEXT.includeNotes),
    includeTasks: asBoolean(raw.includeTasks, DEFAULT_TRACK_CONTEXT.includeTasks),
    includeLinks: asBoolean(raw.includeLinks, DEFAULT_TRACK_CONTEXT.includeLinks),
    includePendingProposals: asBoolean(
      raw.includePendingProposals,
      DEFAULT_TRACK_CONTEXT.includePendingProposals
    ),
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
    attachFocusedTopic: asBoolean(
      raw.attachFocusedTopic,
      DEFAULT_TRACK_CONTEXT.attachFocusedTopic
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
