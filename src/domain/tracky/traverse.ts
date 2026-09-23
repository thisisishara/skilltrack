import type { NodeLink } from "@/domain/links/types"
import type { ChecklistItem } from "@/domain/tasks/types"
import type { RoadmapNode } from "@/domain/topics/types"

export const MAX_LIST_ROOTS = 40
export const MAX_LIST_CHILDREN = 80
export const MAX_SEARCH_HITS = 20

export type TopicSummary = {
  id: string
  title: string
  childCount: number
  hasNotes: boolean
  taskCount: number
  linkCount: number
}

export type TopicPathEntry = {
  id: string
  title: string
}

export function skillTopics(nodes: RoadmapNode[]) {
  return nodes.filter((node) => node.kind !== "label")
}

export function countByTopicId(items: { topicId: string | null }[]) {
  const counts = new Map<string, number>()
  for (const item of items) {
    if (!item.topicId) {
      continue
    }
    counts.set(item.topicId, (counts.get(item.topicId) ?? 0) + 1)
  }
  return counts
}

export function childCountByParent(nodes: RoadmapNode[]) {
  const counts = new Map<string, number>()
  for (const node of skillTopics(nodes)) {
    if (!node.parentId) {
      continue
    }
    counts.set(node.parentId, (counts.get(node.parentId) ?? 0) + 1)
  }
  return counts
}

export function summarizeTopic(
  node: RoadmapNode,
  childCounts: Map<string, number>,
  taskCounts: Map<string, number>,
  linkCounts: Map<string, number>,
  noteCounts: Map<string, number>
): TopicSummary {
  return {
    id: node.id,
    title: node.title,
    childCount: childCounts.get(node.id) ?? 0,
    hasNotes: (noteCounts.get(node.id) ?? 0) > 0,
    taskCount: taskCounts.get(node.id) ?? 0,
    linkCount: linkCounts.get(node.id) ?? 0,
  }
}

export function topicPath(nodes: RoadmapNode[], topicId: string): TopicPathEntry[] | null {
  const byId = new Map(skillTopics(nodes).map((node) => [node.id, node]))
  const start = byId.get(topicId)
  if (!start) {
    return null
  }
  const chain: TopicPathEntry[] = []
  let current: RoadmapNode | undefined = start
  const seen = new Set<string>()
  while (current) {
    if (seen.has(current.id)) {
      break
    }
    seen.add(current.id)
    chain.push({ id: current.id, title: current.title })
    current = current.parentId ? byId.get(current.parentId) : undefined
  }
  return chain.reverse()
}

function lookupMaps(
  nodes: RoadmapNode[],
  tasks: ChecklistItem[],
  links: NodeLink[],
  notes: { topicId: string | null }[]
) {
  return {
    childCounts: childCountByParent(nodes),
    taskCounts: countByTopicId(tasks),
    linkCounts: countByTopicId(links),
    noteCounts: countByTopicId(notes),
  }
}

export function listRootSummaries(
  nodes: RoadmapNode[],
  tasks: ChecklistItem[],
  links: NodeLink[],
  notes: { topicId: string | null }[] = []
) {
  const { childCounts, taskCounts, linkCounts, noteCounts } = lookupMaps(
    nodes,
    tasks,
    links,
    notes
  )
  const roots = skillTopics(nodes)
    .filter((node) => !node.parentId)
    .sort((a, b) => a.sortOrder - b.sortOrder)
  const sliced = roots.slice(0, MAX_LIST_ROOTS)
  return {
    topics: sliced.map((node) =>
      summarizeTopic(node, childCounts, taskCounts, linkCounts, noteCounts)
    ),
    truncated: roots.length > MAX_LIST_ROOTS,
  }
}

export function listChildSummaries(
  nodes: RoadmapNode[],
  tasks: ChecklistItem[],
  links: NodeLink[],
  topicId: string,
  notes: { topicId: string | null }[] = []
) {
  const parent = skillTopics(nodes).find((node) => node.id === topicId)
  if (!parent) {
    return { error: "Topic not found in this role." as const }
  }
  const { childCounts, taskCounts, linkCounts, noteCounts } = lookupMaps(
    nodes,
    tasks,
    links,
    notes
  )
  const children = skillTopics(nodes)
    .filter((node) => node.parentId === topicId)
    .sort((a, b) => a.sortOrder - b.sortOrder)
  const sliced = children.slice(0, MAX_LIST_CHILDREN)
  return {
    topicId,
    topics: sliced.map((node) =>
      summarizeTopic(node, childCounts, taskCounts, linkCounts, noteCounts)
    ),
    truncated: children.length > MAX_LIST_CHILDREN,
  }
}

export function searchTopicSummaries(
  nodes: RoadmapNode[],
  tasks: ChecklistItem[],
  links: NodeLink[],
  query: string,
  notes: { topicId: string | null }[] = []
) {
  const needle = query.trim().toLowerCase()
  const { childCounts, taskCounts, linkCounts, noteCounts } = lookupMaps(
    nodes,
    tasks,
    links,
    notes
  )
  const matches = skillTopics(nodes).filter((node) =>
    node.title.toLowerCase().includes(needle)
  )
  const sliced = matches.slice(0, MAX_SEARCH_HITS)
  return {
    matches: sliced.map((node) => ({
      ...summarizeTopic(node, childCounts, taskCounts, linkCounts, noteCounts),
      parentId: node.parentId,
      path: topicPath(nodes, node.id) ?? [{ id: node.id, title: node.title }],
    })),
    truncated: matches.length > MAX_SEARCH_HITS,
  }
}
