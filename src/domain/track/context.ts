import { TRACK_READ_STEP_BUDGET } from "@/domain/user-settings/defaults"
import type { TrackProposalIndex } from "@/domain/track/proposals"
import { skillTopics } from "@/domain/track/traverse"
import type { RoadmapNode } from "@/domain/topics/types"

export type TrackWorkingSet = {
  roleId: string
  roleName: string
  topicCount: number
  focusedTopicId: string | null
  pendingProposals: Pick<TrackProposalIndex, "id" | "kind" | "entity" | "title">[]
  scratchpad: string
  readBudget: {
    maxSteps: number
    policy: string
  }
}

export function assembleWorkingSet(input: {
  roleId: string
  roleName: string
  nodes: RoadmapNode[]
  focusedTopicId: string | null
  pendingProposals: TrackProposalIndex[]
  scratchpad: string
}): TrackWorkingSet {
  return {
    roleId: input.roleId,
    roleName: input.roleName,
    topicCount: skillTopics(input.nodes).length,
    focusedTopicId: input.focusedTopicId,
    pendingProposals: input.pendingProposals
      .filter((item) => item.status === "pending")
      .map((item) => ({
        id: item.id,
        kind: item.kind,
        entity: item.entity,
        title: item.title,
      })),
    scratchpad: input.scratchpad.trim().slice(0, 3000),
    readBudget: {
      maxSteps: TRACK_READ_STEP_BUDGET,
      policy:
        "One orientation (search_topics or list_roots), one zoom (list_children), then details. Prefer search path over walking the whole tree. Do not re-fetch ids from this turn.",
    },
  }
}

export function truncateJson(value: unknown, maxChars: number) {
  const text = JSON.stringify(value)
  if (text.length <= maxChars) {
    return value
  }
  return {
    truncated: true,
    preview: text.slice(0, maxChars),
  }
}
