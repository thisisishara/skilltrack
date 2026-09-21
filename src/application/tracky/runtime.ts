import { getRoleForUser } from "@/application/roles/roles-service"
import { listLinksForRole } from "@/application/links/links-service"
import { listTasksForRole } from "@/application/tasks/tasks-service"
import { listTopicsForRole } from "@/application/topics/topics-service"
import { composeSystemPrompt } from "@/application/tracky/prompts"
import { createTrackyTools } from "@/application/tracky/tools"
import {
  decryptTrackyApiKey,
  getUserSettingsOrDefault,
  toPublicSettings,
} from "@/application/user-settings/user-settings-service"
import { assembleWorkingSet } from "@/domain/tracky/context"
import { compactMessages } from "@/domain/tracky/history"
import type { TrackyProposalIndex } from "@/domain/tracky/proposals"
import type { TrackyDropRef } from "@/domain/tracky/drop-ref"
import { enabledToolIds } from "@/domain/user-settings/parse"
import { TRACKY_READ_STEP_BUDGET } from "@/domain/user-settings/defaults"
import { ApplicationError } from "@/domain/errors"
import { createTrackyModel } from "@/lib/ai/providers"
import { skillTopics } from "@/domain/tracky/traverse"

export async function loadTrackyRuntime(input: {
  userId: string
  roleId: string
  focusedTopicId: string | null
  pinned: TrackyDropRef[]
  pendingProposals: TrackyProposalIndex[]
  scratchpad: string
}) {
  const settings = await getUserSettingsOrDefault(input.userId)
  const publicSettings = toPublicSettings(settings)
  if (!publicSettings.trackyEnabled || !settings.trackyProvider) {
    throw new ApplicationError("authorization", "Tracky is turned off.")
  }

  const apiKey = await decryptTrackyApiKey(settings)
  if (!apiKey) {
    throw new ApplicationError("authorization", "Tracky needs an API key.")
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
  const toolsEnabled = enabledToolIds(settings.trackyConfig)
  const workingSet = assembleWorkingSet({
    roleId: role.id,
    roleName: role.name,
    roleDescription: role.description,
    roleNotes: role.notes,
    nodes,
    focusedTopicId: input.focusedTopicId,
    pinned: input.pinned,
    pendingProposals: input.pendingProposals,
    scratchpad: input.scratchpad,
  })

  const system = `${composeSystemPrompt({
    systemOverride: settings.trackyConfig.systemPrompt,
    generationOverride: settings.trackyConfig.generationPrompt,
    roleTitle: role.name,
    treeIsEmpty,
    generationEnabled: settings.trackyConfig.tools.propose_full_roadmap,
  })}

## Working set
${JSON.stringify(workingSet)}`

  return {
    model: createTrackyModel({
      provider: settings.trackyProvider,
      apiKey,
      model: settings.trackyModel,
      baseUrl: settings.trackyBaseUrl,
    }),
    system,
    tools: createTrackyTools({
      enabled: toolsEnabled,
      role: {
        id: role.id,
        description: role.description,
        notes: role.notes,
      },
      nodes,
      tasks,
      links,
      treeIsEmpty,
      maxToolResultChars: settings.trackyConfig.context.maxToolResultChars,
    }),
    maxChatTurns: settings.trackyConfig.context.maxChatTurns,
    maxSteps: TRACKY_READ_STEP_BUDGET,
    compactMessages,
  }
}
