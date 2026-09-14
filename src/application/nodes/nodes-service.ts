import "server-only"

import { getRoleForUser } from "@/application/roles/roles-service"
import { ApplicationError } from "@/domain/errors"
import { wouldCreateCycle } from "@/domain/nodes/hierarchy"
import { normalizeNodeIcon } from "@/domain/nodes/icon"
import { displayNodeTitle } from "@/domain/nodes/title"
import type { RoadmapNode } from "@/domain/nodes/types"
import * as nodesRepository from "@/repositories/nodes/nodes-repository"

const CHILD_OFFSET_Y = 160
const ROOT_OFFSET_X = 280

function requireTitle(title: string) {
  const trimmed = displayNodeTitle(title)

  if (!trimmed) {
    throw new ApplicationError("validation", "Node title cannot be empty.")
  }

  return trimmed
}

function optionalDescription(description: string | null | undefined) {
  const trimmed = description?.trim() ?? ""
  return trimmed ? trimmed : null
}

function nextSortOrder(nodes: RoadmapNode[], parentId: string | null) {
  const siblings = nodes.filter((node) => node.parentId === parentId)
  if (siblings.length === 0) {
    return 0
  }

  return Math.max(...siblings.map((node) => node.sortOrder)) + 1
}

async function requireOwnedRole(userId: string, roleId: string) {
  const role = await getRoleForUser(userId, roleId)

  if (!role) {
    throw new ApplicationError("not_found", "That role no longer exists.")
  }

  return role
}

export async function requireOwnedNode(userId: string, roleId: string, nodeId: string) {
  await requireOwnedRole(userId, roleId)
  const node = await nodesRepository.getByIdForRole(roleId, nodeId)

  if (!node) {
    throw new ApplicationError("not_found", "That node no longer exists.")
  }

  return node
}

export async function listNodesForRole(userId: string, roleId: string) {
  await requireOwnedRole(userId, roleId)
  return nodesRepository.listByRoleId(roleId)
}

export async function createNode(
  userId: string,
  input: {
    roleId: string
    parentId: string | null
    title: string
    description?: string | null
    icon?: string | null
  }
) {
  await requireOwnedRole(userId, input.roleId)
  const title = requireTitle(input.title)
  const nodes = await nodesRepository.listByRoleId(input.roleId)

  let positionX = 0
  let positionY = 0
  let parentId: string | null = input.parentId

  if (parentId) {
    const parent = nodes.find((node) => node.id === parentId)

    if (!parent) {
      throw new ApplicationError("validation", "Parent node was not found.")
    }

    if (parent.roleId !== input.roleId) {
      throw new ApplicationError(
        "validation",
        "A node must belong to the same role as its parent."
      )
    }

    positionX = parent.positionX
    positionY = parent.positionY + CHILD_OFFSET_Y
  } else {
    const roots = nodes.filter((node) => node.parentId === null)
    positionX = roots.length * ROOT_OFFSET_X
    positionY = 0
  }

  return nodesRepository.insert({
    roleId: input.roleId,
    parentId,
    title,
    description: optionalDescription(input.description),
    icon: normalizeNodeIcon(input.icon),
    positionX,
    positionY,
    sortOrder: nextSortOrder(nodes, parentId),
  })
}

export async function updateNodeDetails(
  userId: string,
  roleId: string,
  nodeId: string,
  input: {
    title: string
    description?: string | null
    icon?: string | null
    notes?: string | null
  }
) {
  await requireOwnedNode(userId, roleId, nodeId)

  return nodesRepository.updateDetails(roleId, nodeId, {
    title: requireTitle(input.title),
    description: optionalDescription(input.description),
    icon: normalizeNodeIcon(input.icon),
    ...(input.notes !== undefined
      ? { notes: optionalDescription(input.notes) }
      : {}),
  })
}

export async function moveNode(
  userId: string,
  roleId: string,
  nodeId: string,
  positionX: number,
  positionY: number
) {
  await requireOwnedNode(userId, roleId, nodeId)

  if (!Number.isFinite(positionX) || !Number.isFinite(positionY)) {
    throw new ApplicationError("validation", "Node position is invalid.")
  }

  return nodesRepository.updatePosition(roleId, nodeId, positionX, positionY)
}

export async function reparentNode(
  userId: string,
  roleId: string,
  nodeId: string,
  parentId: string | null
) {
  const node = await requireOwnedNode(userId, roleId, nodeId)
  const nodes = await nodesRepository.listByRoleId(roleId)

  if (parentId) {
    const parent = nodes.find((item) => item.id === parentId)

    if (!parent) {
      throw new ApplicationError("validation", "Parent node was not found.")
    }

    if (parent.roleId !== roleId || node.roleId !== roleId) {
      throw new ApplicationError(
        "validation",
        "A node must belong to the same role as its parent."
      )
    }

    if (wouldCreateCycle(nodes, nodeId, parentId)) {
      throw new ApplicationError(
        "validation",
        "A node cannot be its own ancestor."
      )
    }
  }

  return nodesRepository.updateParent(
    roleId,
    nodeId,
    parentId,
    nextSortOrder(nodes, parentId)
  )
}

export async function deleteNode(userId: string, roleId: string, nodeId: string) {
  await requireOwnedNode(userId, roleId, nodeId)
  await nodesRepository.deleteForRole(roleId, nodeId)
}
