import type { NodeHandleKind } from "@/domain/nodes/handle"
import type { NodeKind } from "@/domain/nodes/kind"

export const ROADMAP_SCHEMA_ID = "skilltrack.roadmap.v1"

export type NormalizedChecklistItem = {
  id: string
  title: string
  description: string | null
  completed: boolean
}

export type NormalizedLink = {
  id: string
  label: string
  url: string
}

export type NormalizedRoadmapNode = {
  id: string
  kind: NodeKind
  parentId: string | null
  title: string
  description: string | null
  notes: string | null
  icon: string
  handleKind: NodeHandleKind
  incomingEdgeAnimated: boolean
  positionX: number
  positionY: number
  checklist: NormalizedChecklistItem[]
  links: NormalizedLink[]
}

export type NormalizedRoadmapDocument = {
  schema: typeof ROADMAP_SCHEMA_ID
  name: string
  description: string | null
  nodes: NormalizedRoadmapNode[]
}
