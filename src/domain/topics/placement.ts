import { wouldCreateCycle } from "@/domain/topics/hierarchy"
import type { RoadmapNode } from "@/domain/topics/types"

export type TreeDropPosition = "before" | "after" | "inside"

export type NodePlacement = {
  id: string
  parentId: string | null
  sortOrder: number
}

type Placeable = Pick<RoadmapNode, "id" | "parentId" | "sortOrder">

function childrenOf(nodes: Placeable[], parentId: string | null) {
  return nodes
    .filter((node) => node.parentId === parentId)
    .sort((left, right) => left.sortOrder - right.sortOrder)
}

function ordersFor(parentId: string | null, ids: string[]): NodePlacement[] {
  return ids.map((id, sortOrder) => ({ id, parentId, sortOrder }))
}

export function dropPositionFromOffset(
  offsetY: number,
  height: number,
  canNest: boolean
): TreeDropPosition {
  if (height <= 0) {
    return "after"
  }

  const ratio = offsetY / height
  if (canNest && ratio > 0.28 && ratio < 0.72) {
    return "inside"
  }

  return ratio < 0.5 ? "before" : "after"
}

export function placementUpdates(
  nodes: Placeable[],
  draggedId: string,
  targetId: string,
  position: TreeDropPosition
): NodePlacement[] | null {
  if (draggedId === targetId) {
    return null
  }

  const dragged = nodes.find((node) => node.id === draggedId)
  const target = nodes.find((node) => node.id === targetId)
  if (!dragged || !target) {
    return null
  }

  const parentId = position === "inside" ? targetId : target.parentId
  if (wouldCreateCycle(nodes, draggedId, parentId)) {
    return null
  }

  const nextSiblings = childrenOf(nodes, parentId).filter((node) => node.id !== draggedId)

  let orderedIds: string[]
  if (position === "inside") {
    orderedIds = [...nextSiblings.map((node) => node.id), draggedId]
  } else {
    const targetIndex = nextSiblings.findIndex((node) => node.id === targetId)
    if (targetIndex < 0) {
      return null
    }
    const insertAt = position === "before" ? targetIndex : targetIndex + 1
    orderedIds = nextSiblings.map((node) => node.id)
    orderedIds.splice(insertAt, 0, draggedId)
  }

  const currentIds = childrenOf(nodes, parentId).map((node) => node.id)
  const parentUnchanged = dragged.parentId === parentId
  if (parentUnchanged && currentIds.join("\0") === orderedIds.join("\0")) {
    return null
  }

  const updates = new Map<string, NodePlacement>()
  for (const placement of ordersFor(parentId, orderedIds)) {
    updates.set(placement.id, placement)
  }

  if (!parentUnchanged) {
    const previousIds = childrenOf(nodes, dragged.parentId)
      .filter((node) => node.id !== draggedId)
      .map((node) => node.id)
    for (const placement of ordersFor(dragged.parentId, previousIds)) {
      if (!updates.has(placement.id)) {
        updates.set(placement.id, placement)
      }
    }
  }

  return [...updates.values()]
}

export function rootPlacementUpdates(
  nodes: Placeable[],
  draggedId: string
): NodePlacement[] | null {
  const dragged = nodes.find((node) => node.id === draggedId)
  if (!dragged) {
    return null
  }

  if (dragged.parentId === null) {
    return null
  }

  const nextSiblings = childrenOf(nodes, null).filter((node) => node.id !== draggedId)
  const orderedIds = [...nextSiblings.map((node) => node.id), draggedId]
  const previousIds = childrenOf(nodes, dragged.parentId)
    .filter((node) => node.id !== draggedId)
    .map((node) => node.id)

  return [
    ...ordersFor(null, orderedIds),
    ...ordersFor(dragged.parentId, previousIds),
  ]
}

export function applyPlacements<T extends Placeable>(nodes: T[], placements: NodePlacement[]) {
  const byId = new Map(placements.map((placement) => [placement.id, placement]))
  return nodes.map((node) => {
    const next = byId.get(node.id)
    return next ? { ...node, parentId: next.parentId, sortOrder: next.sortOrder } : node
  })
}
