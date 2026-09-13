import type { RoadmapNode } from "@/domain/nodes/types"

export function wouldCreateCycle(
  nodes: Pick<RoadmapNode, "id" | "parentId">[],
  nodeId: string,
  newParentId: string | null
) {
  if (newParentId === null) {
    return false
  }

  if (newParentId === nodeId) {
    return true
  }

  const parentById = new Map(nodes.map((node) => [node.id, node.parentId]))
  const seen = new Set<string>()
  let current: string | null = newParentId

  while (current) {
    if (current === nodeId) {
      return true
    }

    if (seen.has(current)) {
      return true
    }

    seen.add(current)
    current = parentById.get(current) ?? null
  }

  return false
}
