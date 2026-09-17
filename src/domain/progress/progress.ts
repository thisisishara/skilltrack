import type { ChecklistItem } from "@/domain/tasks/types"
import { isSkillNode } from "@/domain/topics/kind"
import type { RoadmapNode } from "@/domain/topics/types"

export type ProgressStatus = "pending" | "in_progress" | "done"

export type ProgressSnapshot = {
  completed: number
  total: number
  percent: number
  status: ProgressStatus
}

export type NodeStatusCounts = {
  pending: number
  inProgress: number
  done: number
}

export function ratioToPercent(completed: number, total: number) {
  if (total <= 0) {
    return 0
  }

  if (completed <= 0) {
    return 0
  }

  if (completed >= total) {
    return 100
  }

  return Math.min(99, Math.round((completed / total) * 100))
}

export function statusFromCounts(completed: number, total: number): ProgressStatus {
  if (total <= 0 || completed <= 0) {
    return "pending"
  }

  if (completed >= total) {
    return "done"
  }

  return "in_progress"
}

export function progressFromCounts(completed: number, total: number): ProgressSnapshot {
  return {
    completed,
    total,
    percent: ratioToPercent(completed, total),
    status: statusFromCounts(completed, total),
  }
}

export function nodeProgress(items: ChecklistItem[], nodeId: string) {
  const own = items.filter((item) => item.topicId === nodeId)
  const completed = own.filter((item) => item.completed).length
  return progressFromCounts(completed, own.length)
}

export function subtreeNodeIds(
  nodes: Pick<RoadmapNode, "id" | "parentId">[],
  rootId: string
) {
  const childrenByParent = new Map<string | null, string[]>()

  for (const node of nodes) {
    const siblings = childrenByParent.get(node.parentId) ?? []
    siblings.push(node.id)
    childrenByParent.set(node.parentId, siblings)
  }

  const ids = new Set<string>()
  const stack = [rootId]

  while (stack.length > 0) {
    const current = stack.pop()
    if (!current || ids.has(current)) {
      continue
    }

    ids.add(current)
    const children = childrenByParent.get(current) ?? []
    for (const childId of children) {
      stack.push(childId)
    }
  }

  return ids
}

export function subtreeProgress(
  nodes: Pick<RoadmapNode, "id" | "parentId">[],
  items: ChecklistItem[],
  rootId: string
) {
  const ids = subtreeNodeIds(nodes, rootId)
  const subtreeItems = items.filter((item) => ids.has(item.topicId))
  const completed = subtreeItems.filter((item) => item.completed).length
  return progressFromCounts(completed, subtreeItems.length)
}

export function roadmapProgress(items: ChecklistItem[]) {
  const completed = items.filter((item) => item.completed).length
  return progressFromCounts(completed, items.length)
}

export const DONE_INCOMING_EDGE_STROKE = "#4CAF50"
export const DONE_CHECKBOX_CLASS =
  "data-checked:border-[#4CAF50] data-checked:bg-[#4CAF50] data-checked:text-white dark:data-checked:bg-[#4CAF50] dark:data-checked:border-[#4CAF50]"
export const DEFAULT_EDGE_STROKE = "var(--muted-foreground)"
export const DEFAULT_EDGE_STROKE_WIDTH = 1.75

export function incomingEdgeAppearance(status: ProgressStatus): {
  animated: boolean
  style: { stroke: string; strokeWidth: number }
} {
  if (status === "in_progress") {
    return {
      animated: true,
      style: { stroke: DEFAULT_EDGE_STROKE, strokeWidth: DEFAULT_EDGE_STROKE_WIDTH },
    }
  }

  if (status === "done") {
    return {
      animated: false,
      style: { stroke: DONE_INCOMING_EDGE_STROKE, strokeWidth: DEFAULT_EDGE_STROKE_WIDTH },
    }
  }

  return {
    animated: false,
    style: { stroke: DEFAULT_EDGE_STROKE, strokeWidth: DEFAULT_EDGE_STROKE_WIDTH },
  }
}

export function progressStatusLabel(status: ProgressStatus) {
  if (status === "done") {
    return "Done"
  }

  if (status === "in_progress") {
    return "In progress"
  }

  return "Pending"
}

export function nodeStatusCounts(
  nodes: Pick<RoadmapNode, "id" | "kind">[],
  items: ChecklistItem[]
): NodeStatusCounts {
  const counts: NodeStatusCounts = {
    pending: 0,
    inProgress: 0,
    done: 0,
  }

  for (const node of nodes) {
    if (!isSkillNode(node)) {
      continue
    }

    const status = nodeProgress(items, node.id).status
    if (status === "in_progress") {
      counts.inProgress += 1
    } else if (status === "done") {
      counts.done += 1
    } else {
      counts.pending += 1
    }
  }

  return counts
}
