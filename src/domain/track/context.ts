import { TRACK_READ_STEP_BUDGET } from "@/domain/user-settings/defaults"
import type { TrackProposalIndex } from "@/domain/track/proposals"
import type { TrackDropRef } from "@/domain/track/drop-ref"
import { MAX_TRACK_PINS } from "@/domain/track/drop-ref"
import { skillTopics } from "@/domain/track/traverse"
import type { RoadmapNode } from "@/domain/topics/types"

export type TrackWorkingSet = {
  roleId: string
  roleName: string
  roleDescription: string | null
  roleNotes: string | null
  roleDescriptionTruncated: boolean
  roleNotesTruncated: boolean
  topicCount: number
  focusedTopicId: string | null
  pinned: TrackDropRef[]
  pendingProposals: Pick<TrackProposalIndex, "id" | "kind" | "entity" | "title">[]
  scratchpad: string
  readBudget: {
    maxSteps: number
    policy: string
  }
}

export const ROLE_FIELD_PREVIEW_CHARS = 800

export function clipText(value: string | null | undefined, maxChars: number) {
  const text = value?.trim() ?? ""
  if (!text) {
    return { text: null as string | null, truncated: false }
  }
  if (text.length <= maxChars) {
    return { text, truncated: false }
  }
  return { text: text.slice(0, maxChars), truncated: true }
}

export function assembleWorkingSet(input: {
  roleId: string
  roleName: string
  roleDescription?: string | null
  roleNotes?: string | null
  nodes: RoadmapNode[]
  focusedTopicId: string | null
  pinned: TrackDropRef[]
  pendingProposals: TrackProposalIndex[]
  scratchpad: string
}): TrackWorkingSet {
  const description = clipText(input.roleDescription, ROLE_FIELD_PREVIEW_CHARS)
  const notes = clipText(input.roleNotes, ROLE_FIELD_PREVIEW_CHARS)
  return {
    roleId: input.roleId,
    roleName: input.roleName,
    roleDescription: description.text,
    roleNotes: notes.text,
    roleDescriptionTruncated: description.truncated,
    roleNotesTruncated: notes.truncated,
    topicCount: skillTopics(input.nodes).length,
    focusedTopicId: input.focusedTopicId,
    pinned: input.pinned.slice(0, MAX_TRACK_PINS),
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
        "Pinned items were dragged onto this user message only — start with those ids (get_topic / get_tasks / get_path / get_notes). Role description/notes are in this working set; call get_role only if truncated. One orientation (search_topics or list_roots) only if nothing is pinned, one zoom (list_children), then details. Prefer search path over walking the whole tree. Do not re-fetch ids from this turn. Critiques of the roadmap are edit requests — propose_* in the same turn.",
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
