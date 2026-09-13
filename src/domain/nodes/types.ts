export type RoadmapNode = {
  id: string
  roleId: string
  parentId: string | null
  title: string
  description: string | null
  notes: string | null
  icon: string
  positionX: number
  positionY: number
  sortOrder: number
  createdAt: string
  updatedAt: string
}
