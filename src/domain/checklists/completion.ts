import type { ChecklistItem } from "@/domain/checklists/types"

export function applyChecklistCompletion(
  item: ChecklistItem,
  isCompleted: boolean,
  completedAt = new Date().toISOString()
): ChecklistItem {
  return {
    ...item,
    isCompleted,
    completedAt: isCompleted ? completedAt : null,
  }
}
