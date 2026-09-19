export const TRACK_PROVIDERS = [
  "anthropic",
  "openai",
  "google",
  "openrouter",
] as const

export type TrackProvider = (typeof TRACK_PROVIDERS)[number]

export const TRACK_TOOL_IDS = [
  "search_topics",
  "get_topic",
  "get_links",
  "propose_create_topic",
  "propose_update_topic",
  "propose_delete_topic",
  "propose_create_task",
  "propose_update_task",
  "propose_delete_task",
  "propose_create_link",
  "propose_update_link",
  "propose_delete_link",
  "propose_full_roadmap",
] as const

export type TrackToolId = (typeof TRACK_TOOL_IDS)[number]

export type TrackContextConfig = {
  includeTitleIndex: boolean
  maxIndexTopics: number
  includeFocusedTopicDetails: boolean
  includeDescriptions: boolean
  includeNotes: boolean
  includeTasks: boolean
  includeLinks: boolean
  includePendingProposals: boolean
  maxChatTurns: number
  maxToolResultChars: number
  attachFocusedTopic: boolean
}

export type TrackToolsConfig = Record<TrackToolId, boolean>

export type TrackConfig = {
  tools: TrackToolsConfig
  systemPrompt: string | null
  generationPrompt: string | null
  context: TrackContextConfig
}

export type UserSettings = {
  userId: string
  notificationsEnabled: boolean
  trackEnabled: boolean
  trackProvider: TrackProvider | null
  trackModel: string | null
  trackBaseUrl: string | null
  trackApiKeyCiphertext: string | null
  trackApiKeyIv: string | null
  trackApiKeyLast4: string | null
  trackConfig: TrackConfig
  createdAt: string
  updatedAt: string
}

export type PublicUserSettings = {
  notificationsEnabled: boolean
  trackEnabled: boolean
  trackProvider: TrackProvider | null
  trackModel: string | null
  trackBaseUrl: string | null
  trackApiKeyLast4: string | null
  hasApiKey: boolean
  trackConfig: TrackConfig
  encryptionConfigured: boolean
}
