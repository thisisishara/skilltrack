import type { NodeHandleKind } from "@/domain/nodes/handle"

export type RoadmapNode = {
  id: string
  roleId: string
  parentId: string | null
  title: string
  description: string | null
  notes: string | null
  icon: string
  handleKind: NodeHandleKind
  incomingEdgeAnimated: boolean
  positionX: number
  positionY: number
  sortOrder: number
  createdAt: string
  updatedAt: string
}
