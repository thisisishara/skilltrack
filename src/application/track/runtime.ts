import { getRoleForUser } from "@/application/roles/roles-service"
import { listLinksForRole } from "@/application/links/links-service"
import { listTasksForRole } from "@/application/tasks/tasks-service"
import { listTopicsForRole } from "@/application/topics/topics-service"
import { composeSystemPrompt } from "@/application/track/prompts"
import { createTrackTools } from "@/application/track/tools"
import {
  decryptTrackApiKey,
  getUserSettingsOrDefault,
  toPublicSettings,
} from "@/application/user-settings/user-settings-service"
import { assembleWorkingSet } from "@/domain/track/context"
import { compactMessages } from "@/domain/track/history"
import type { TrackProposalIndex } from "@/domain/track/proposals"
import { enabledToolIds } from "@/domain/user-settings/parse"
import { TRACK_READ_STEP_BUDGET } from "@/domain/user-settings/defaults"
import { ApplicationError } from "@/domain/errors"
import { createTrackModel } from "@/lib/ai/providers"
import { skillTopics } from "@/domain/track/traverse"

export async function loadTrackRuntime(input: {
  userId: string
  roleId: string
  focusedTopicId: string | null
  pendingProposals: TrackProposalIndex[]
  scratchpad: string
}) {
  const settings = await getUserSettingsOrDefault(input.userId)
  const publicSettings = toPublicSettings(settings)
  if (!publicSettings.trackEnabled || !settings.trackProvider) {
    throw new ApplicationError("authorization", "Track is turned off.")
  }

  const apiKey = await decryptTrackApiKey(settings)
  if (!apiKey) {
    throw new ApplicationError("authorization", "Track needs an API key.")
  }

  const role = await getRoleForUser(input.userId, input.roleId)
  if (!role) {
    throw new ApplicationError("not_found", "That role was not found.")
  }

  const [nodes, tasks, links] = await Promise.all([
    listTopicsForRole(input.userId, role.id),
    listTasksForRole(input.userId, role.id),
    listLinksForRole(input.userId, role.id),
  ])

  const treeIsEmpty = skillTopics(nodes).length === 0
  const toolsEnabled = enabledToolIds(settings.trackConfig)
  const workingSet = assembleWorkingSet({
    roleId: role.id,
    roleName: role.name,
    nodes,
    focusedTopicId: input.focusedTopicId,
    pendingProposals: input.pendingProposals,
    scratchpad: input.scratchpad,
  })

  const system = `${composeSystemPrompt({
    systemOverride: settings.trackConfig.systemPrompt,
    generationOverride: settings.trackConfig.generationPrompt,
    roleTitle: role.name,
    treeIsEmpty,
    generationEnabled: settings.trackConfig.tools.propose_full_roadmap,
  })}

## Working set
${JSON.stringify(workingSet)}`

  return {
    model: createTrackModel({
      provider: settings.trackProvider,
      apiKey,
      model: settings.trackModel,
      baseUrl: settings.trackBaseUrl,
    }),
    system,
    tools: createTrackTools({
      enabled: toolsEnabled,
      nodes,
      tasks,
      links,
      treeIsEmpty,
      maxToolResultChars: settings.trackConfig.context.maxToolResultChars,
    }),
    maxChatTurns: settings.trackConfig.context.maxChatTurns,
    maxSteps: TRACK_READ_STEP_BUDGET,
    compactMessages,
  }
}
