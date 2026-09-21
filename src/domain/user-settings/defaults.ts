import {
  TRACKY_TOOL_IDS,
  type TrackyConfig,
  type TrackyContextConfig,
  type TrackyProvider,
  type TrackyToolsConfig,
} from "@/domain/user-settings/types"

export const DEFAULT_TRACKY_CONTEXT: TrackyContextConfig = {
  maxChatTurns: 8,
  maxToolResultChars: 4000,
}

export const TRACKY_READ_STEP_BUDGET = 12

export function defaultTrackyTools(): TrackyToolsConfig {
  return Object.fromEntries(TRACKY_TOOL_IDS.map((id) => [id, true])) as TrackyToolsConfig
}

export function defaultTrackyConfig(): TrackyConfig {
  return {
    tools: defaultTrackyTools(),
    systemPrompt: null,
    generationPrompt: null,
    context: { ...DEFAULT_TRACKY_CONTEXT },
  }
}

export const DEFAULT_TRACKY_MODELS: Record<TrackyProvider, string> = {
  anthropic: "claude-sonnet-5",
  openai: "gpt-5.6-luna",
  google: "gemini-3.8-flash",
  openrouter: "openai/gpt-5.6-luna",
}

export function isTrackyProvider(value: unknown): value is TrackyProvider {
  return (
    value === "anthropic" ||
    value === "openai" ||
    value === "google" ||
    value === "openrouter"
  )
}
