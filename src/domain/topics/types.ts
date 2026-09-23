import type { NodeHandleKind } from "@/domain/topics/handle"
import type { NodeKind } from "@/domain/topics/kind"

export type Topic = {
  id: string
  roleId: string
  parentId: string | null
  kind: NodeKind
  title: string
  description: string | null
  icon: string
  color: string | null
  handleKind: NodeHandleKind
  incomingEdgeAnimated: boolean
  positionX: number
  positionY: number
  sortOrder: number
  createdAt: string
  updatedAt: string
}

/** @deprecated Use Topic */
export type RoadmapNode = Topic
