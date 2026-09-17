export type Task = {
  id: string
  topicId: string
  title: string
  description: string | null
  completed: boolean
  sortOrder: number
  createdAt: string
  updatedAt: string
  completedAt: string | null
}

/** @deprecated Use Task */
export type ChecklistItem = Task
