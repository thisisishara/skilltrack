import type { Task } from "@/domain/tasks/types"

export function applyChecklistCompletion(
  item: Task,
  completed: boolean,
  completedAt = new Date().toISOString()
): Task {
  return {
    ...item,
    completed,
    completedAt: completed ? completedAt : null,
  }
}
