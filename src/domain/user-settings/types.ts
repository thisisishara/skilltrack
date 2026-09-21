export const TRACKY_PROVIDERS = [
  "anthropic",
  "openai",
  "google",
  "openrouter",
] as const

export type TrackyProvider = (typeof TRACKY_PROVIDERS)[number]

export const TRACKY_TOOL_IDS = [
  "list_roots",
  "list_children",
  "search_topics",
  "get_topic",
  "get_path",
  "get_notes",
  "get_tasks",
  "get_links",
  "get_role",
  "propose_create_topic",
  "propose_update_topic",
  "propose_delete_topic",
  "propose_create_notes",
  "propose_update_notes",
  "propose_delete_notes",
  "propose_create_task",
  "propose_update_task",
  "propose_delete_task",
  "propose_create_link",
  "propose_update_link",
  "propose_delete_link",
  "propose_full_roadmap",
  "propose_update_role",
] as const

export type TrackyToolId = (typeof TRACKY_TOOL_IDS)[number]

export type TrackyContextConfig = {
  maxChatTurns: number
  maxToolResultChars: number
}

export type TrackyToolsConfig = Record<TrackyToolId, boolean>

export type TrackyConfig = {
  tools: TrackyToolsConfig
  systemPrompt: string | null
  generationPrompt: string | null
  context: TrackyContextConfig
}

export type UserSettings = {
  userId: string
  notificationsEnabled: boolean
  trackyEnabled: boolean
  trackyProvider: TrackyProvider | null
  trackyModel: string | null
  trackyBaseUrl: string | null
  trackyApiKeyCiphertext: string | null
  trackyApiKeyIv: string | null
  trackyApiKeyLast4: string | null
  trackyConfig: TrackyConfig
  createdAt: string
  updatedAt: string
}

export type PublicUserSettings = {
  notificationsEnabled: boolean
  trackyEnabled: boolean
  trackyProvider: TrackyProvider | null
  trackyModel: string | null
  trackyBaseUrl: string | null
  trackyApiKeyLast4: string | null
  hasApiKey: boolean
  trackyConfig: TrackyConfig
  extraModels: Record<TrackyProvider, string[]>
  encryptionConfigured: boolean
}
