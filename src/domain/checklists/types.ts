export type ChecklistItem = {
  id: string
  nodeId: string
  title: string
  description: string | null
  isCompleted: boolean
  sortOrder: number
  createdAt: string
  updatedAt: string
  completedAt: string | null
}
