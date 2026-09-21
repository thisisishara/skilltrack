import {
  DEFAULT_TRACKY_CONTEXT,
  defaultTrackyTools,
  isTrackyProvider,
} from "@/domain/user-settings/defaults"
import {
  TRACKY_TOOL_IDS,
  type TrackyConfig,
  type TrackyContextConfig,
  type TrackyToolId,
  type TrackyToolsConfig,
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

function parseContext(value: unknown): TrackyContextConfig {
  const raw = value && typeof value === "object" ? (value as Record<string, unknown>) : {}
  return {
    maxChatTurns: asPositiveInt(
      raw.maxChatTurns,
      DEFAULT_TRACKY_CONTEXT.maxChatTurns,
      40
    ),
    maxToolResultChars: asPositiveInt(
      raw.maxToolResultChars,
      DEFAULT_TRACKY_CONTEXT.maxToolResultChars,
      20000
    ),
  }
}

function parseTools(value: unknown): TrackyToolsConfig {
  const raw = value && typeof value === "object" ? (value as Record<string, unknown>) : {}
  const defaults = defaultTrackyTools()
  for (const id of TRACKY_TOOL_IDS) {
    defaults[id] = asBoolean(raw[id], true)
  }
  return defaults
}

export function parseTrackyConfig(value: unknown): TrackyConfig {
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

export function enabledToolIds(config: TrackyConfig): TrackyToolId[] {
  return TRACKY_TOOL_IDS.filter((id) => config.tools[id])
}

export { isTrackyProvider }
