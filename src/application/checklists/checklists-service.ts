import "server-only"

import { requireOwnedNode } from "@/application/nodes/nodes-service"
import { getRoleForUser } from "@/application/roles/roles-service"
import { ApplicationError } from "@/domain/errors"
import { applyChecklistCompletion } from "@/domain/checklists/completion"
import { displayChecklistTitle } from "@/domain/checklists/title"
import { isLabelNode } from "@/domain/nodes/kind"
import * as checklistsRepository from "@/repositories/checklists/checklists-repository"

function requireTitle(title: string) {
  const trimmed = displayChecklistTitle(title)

  if (!trimmed) {
    throw new ApplicationError("validation", "Checklist title cannot be empty.")
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

export async function listChecklistsForRole(userId: string, roleId: string) {
  await requireOwnedRole(userId, roleId)
  return checklistsRepository.listByRoleId(roleId)
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
    throw new ApplicationError("validation", "Labels cannot have checklist items.")
  }
  const items = await checklistsRepository.listByNodeId(nodeId)
  const sortOrder =
    items.length === 0 ? 0 : Math.max(...items.map((item) => item.sortOrder)) + 1

  return checklistsRepository.insert({
    id: input.id,
    nodeId,
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
  return checklistsRepository.updateDetails(nodeId, itemId, {
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
  const items = await checklistsRepository.listByNodeId(nodeId)
  const current = items.find((item) => item.id === itemId)

  if (!current) {
    throw new ApplicationError("not_found", "That checklist item no longer exists.")
  }

  const next = applyChecklistCompletion(current, isCompleted)
  return checklistsRepository.setCompleted(
    nodeId,
    itemId,
    next.isCompleted,
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
  const items = await checklistsRepository.listByNodeId(nodeId)
  const itemIds = new Set(items.map((item) => item.id))

  if (orderedIds.length !== items.length || orderedIds.some((id) => !itemIds.has(id))) {
    throw new ApplicationError("validation", "Checklist order is invalid.")
  }

  await checklistsRepository.updateSortOrders(
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
  await checklistsRepository.deleteForNode(nodeId, itemId)
}
