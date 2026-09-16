import type { NodeHandleKind } from "@/domain/nodes/handle"
import type { NodeKind } from "@/domain/nodes/kind"

export type RoadmapNode = {
  id: string
  roleId: string
  parentId: string | null
  kind: NodeKind
  title: string
  description: string | null
  notes: string | null
  icon: string
  accentColor: string | null
  handleKind: NodeHandleKind
  incomingEdgeAnimated: boolean
  positionX: number
  positionY: number
  sortOrder: number
  createdAt: string
  updatedAt: string
}
