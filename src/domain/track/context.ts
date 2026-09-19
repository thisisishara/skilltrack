import type { NodeLink } from "@/domain/links/types"
import type { ChecklistItem } from "@/domain/tasks/types"
import type { TrackProposalIndex } from "@/domain/track/proposals"
import type { RoadmapNode } from "@/domain/topics/types"
import type { TrackContextConfig } from "@/domain/user-settings/types"

export type TrackIndexEntry = {
  id: string
  parentId: string | null
  title: string
  description?: string
  notes?: string
  taskCount?: number
}

export type TrackWorkingSet = {
  roleId: string
  roleName: string
  focusedTopicId: string | null
  indexMode: "full" | "focused-branch" | "none"
  index: TrackIndexEntry[]
  focusedTopic: Record<string, unknown> | null
  pendingProposals: TrackProposalIndex[]
  scratchpad: string
  note: string
}

function topicFields(
  node: RoadmapNode,
  context: TrackContextConfig
): TrackIndexEntry {
  const entry: TrackIndexEntry = {
    id: node.id,
    parentId: node.parentId,
    title: node.title,
  }
  if (context.includeDescriptions && node.description) {
    entry.description = node.description
  }
  if (context.includeNotes && node.notes) {
    entry.notes = node.notes
  }
  return entry
}

function ancestorIds(nodes: RoadmapNode[], id: string | null) {
  const byId = new Map(nodes.map((node) => [node.id, node]))
  const ids = new Set<string>()
  let current = id ? byId.get(id) : undefined
  while (current) {
    ids.add(current.id)
    current = current.parentId ? byId.get(current.parentId) : undefined
  }
  return ids
}

function focusedBranchIds(nodes: RoadmapNode[], focusedTopicId: string | null) {
  if (!focusedTopicId) {
    return new Set(nodes.filter((node) => !node.parentId).map((node) => node.id))
  }

  const keep = ancestorIds(nodes, focusedTopicId)
  const focused = nodes.find((node) => node.id === focusedTopicId)
  const parentId = focused?.parentId ?? null
  for (const node of nodes) {
    if (node.parentId === parentId || node.parentId === focusedTopicId) {
      keep.add(node.id)
    }
  }
  return keep
}

export function buildTitleIndex(
  nodes: RoadmapNode[],
  tasks: ChecklistItem[],
  context: TrackContextConfig,
  focusedTopicId: string | null
): Pick<TrackWorkingSet, "index" | "indexMode"> {
  if (!context.includeTitleIndex) {
    return { index: [], indexMode: "none" }
  }

  const skillNodes = nodes.filter((node) => node.kind !== "label")
  const counts = new Map<string, number>()
  if (context.includeTasks) {
    for (const task of tasks) {
      counts.set(task.topicId, (counts.get(task.topicId) ?? 0) + 1)
    }
  }

  const mapEntry = (node: RoadmapNode): TrackIndexEntry => {
    const entry = topicFields(node, context)
    if (context.includeTasks) {
      entry.taskCount = counts.get(node.id) ?? 0
    }
    return entry
  }

  if (skillNodes.length <= context.maxIndexTopics) {
    return {
      index: skillNodes.map(mapEntry),
      indexMode: "full",
    }
  }

  const keep = focusedBranchIds(skillNodes, focusedTopicId)
  return {
    index: skillNodes.filter((node) => keep.has(node.id)).map(mapEntry),
    indexMode: "focused-branch",
  }
}

export function buildFocusedTopic(
  nodes: RoadmapNode[],
  tasks: ChecklistItem[],
  links: NodeLink[],
  context: TrackContextConfig,
  focusedTopicId: string | null
) {
  if (!context.includeFocusedTopicDetails || !context.attachFocusedTopic || !focusedTopicId) {
    return null
  }

  const node = nodes.find((item) => item.id === focusedTopicId)
  if (!node) {
    return null
  }

  const payload: Record<string, unknown> = {
    id: node.id,
    parentId: node.parentId,
    title: node.title,
  }
  if (context.includeDescriptions) {
    payload.description = node.description
  }
  if (context.includeNotes) {
    payload.notes = node.notes
  }
  if (context.includeTasks) {
    payload.tasks = tasks
      .filter((task) => task.topicId === node.id)
      .map((task) => ({
        id: task.id,
        title: task.title,
        completed: task.completed,
      }))
  }
  if (context.includeLinks) {
    payload.links = links
      .filter((link) => link.topicId === node.id)
      .map((link) => ({ id: link.id, label: link.label, url: link.url }))
  }
  payload.childTitles = nodes
    .filter((child) => child.parentId === node.id)
    .map((child) => ({ id: child.id, title: child.title }))
  return payload
}

export function assembleWorkingSet(input: {
  roleId: string
  roleName: string
  nodes: RoadmapNode[]
  tasks: ChecklistItem[]
  links: NodeLink[]
  context: TrackContextConfig
  focusedTopicId: string | null
  pendingProposals: TrackProposalIndex[]
  scratchpad: string
}): TrackWorkingSet {
  const { index, indexMode } = buildTitleIndex(
    input.nodes,
    input.tasks,
    input.context,
    input.focusedTopicId
  )

  return {
    roleId: input.roleId,
    roleName: input.roleName,
    focusedTopicId: input.context.attachFocusedTopic ? input.focusedTopicId : null,
    indexMode,
    index,
    focusedTopic: buildFocusedTopic(
      input.nodes,
      input.tasks,
      input.links,
      input.context,
      input.focusedTopicId
    ),
    pendingProposals: input.context.includePendingProposals
      ? input.pendingProposals.filter((item) => item.status === "pending")
      : [],
    scratchpad: input.scratchpad.trim().slice(0, 3000),
    note:
      indexMode === "focused-branch"
        ? "Title index is capped. Use search_topics or get_topic for other branches."
        : indexMode === "none"
          ? "Title index is off. Use search_topics or get_topic before proposing edits."
          : "Use topic ids from this index. Look up a topic before updating or deleting it.",
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
