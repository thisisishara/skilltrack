import "server-only"

import { requireOwnedNode } from "@/application/topics/topics-service"
import { getRoleForUser } from "@/application/roles/roles-service"
import { ApplicationError } from "@/domain/errors"
import { applyChecklistCompletion } from "@/domain/tasks/completion"
import { displayChecklistTitle } from "@/domain/tasks/title"
import { isLabelNode } from "@/domain/topics/kind"
import * as tasksRepository from "@/repositories/tasks/tasks-repository"

function requireTitle(title: string) {
  const trimmed = displayChecklistTitle(title)

  if (!trimmed) {
    throw new ApplicationError("validation", "Task title cannot be empty.")
  }

  return trimmed
}

function optionalDescription(description: string | null | undefined) {
  const trimmed = description?.trim() ?? ""
  return trimmed ? trimmed : null
}

async function requireOwnedRole(userId: string, roleId: string) {
  const role = await getRoleForUser(userId, roleId)

  if (!role) {
    throw new ApplicationError("not_found", "That role no longer exists.")
  }

  return role
}

export async function listTasksForRole(userId: string, roleId: string) {
  await requireOwnedRole(userId, roleId)
  return tasksRepository.listByRoleId(roleId)
}

export async function createChecklistItem(
  userId: string,
  roleId: string,
  nodeId: string,
  input: {
    id?: string
    title: string
    description?: string | null
  }
) {
  const node = await requireOwnedNode(userId, roleId, nodeId)
  if (isLabelNode(node)) {
    throw new ApplicationError("validation", "Labels cannot have tasks.")
  }
  const items = await tasksRepository.listByTopicId(nodeId)
  const sortOrder =
    items.length === 0 ? 0 : Math.max(...items.map((item) => item.sortOrder)) + 1

  return tasksRepository.insert({
    id: input.id,
    topicId: nodeId,
    title: requireTitle(input.title),
    description: optionalDescription(input.description),
    sortOrder,
  })
}

export async function updateChecklistItem(
  userId: string,
  roleId: string,
  nodeId: string,
  itemId: string,
  input: {
    title: string
    description?: string | null
  }
) {
  await requireOwnedNode(userId, roleId, nodeId)
  return tasksRepository.updateDetails(nodeId, itemId, {
    title: requireTitle(input.title),
    description: optionalDescription(input.description),
  })
}

export async function setChecklistItemCompleted(
  userId: string,
  roleId: string,
  nodeId: string,
  itemId: string,
  isCompleted: boolean
) {
  await requireOwnedNode(userId, roleId, nodeId)
  const items = await tasksRepository.listByTopicId(nodeId)
  const current = items.find((item) => item.id === itemId)

  if (!current) {
    throw new ApplicationError("not_found", "That task no longer exists.")
  }

  const next = applyChecklistCompletion(current, isCompleted)
  return tasksRepository.setCompleted(
    nodeId,
    itemId,
    next.completed,
    next.completedAt
  )
}

export async function reorderChecklistItems(
  userId: string,
  roleId: string,
  nodeId: string,
  orderedIds: string[]
) {
  await requireOwnedNode(userId, roleId, nodeId)
  const items = await tasksRepository.listByTopicId(nodeId)
  const itemIds = new Set(items.map((item) => item.id))

  if (orderedIds.length !== items.length || orderedIds.some((id) => !itemIds.has(id))) {
    throw new ApplicationError("validation", "Task order is invalid.")
  }

  await tasksRepository.updateSortOrders(
    nodeId,
    orderedIds.map((id, index) => ({ id, sortOrder: index }))
  )
}

export async function deleteChecklistItem(
  userId: string,
  roleId: string,
  nodeId: string,
  itemId: string
) {
  await requireOwnedNode(userId, roleId, nodeId)
  await tasksRepository.deleteForTopic(nodeId, itemId)
}
