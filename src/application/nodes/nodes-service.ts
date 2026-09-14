import "server-only"

import { getRoleForUser } from "@/application/roles/roles-service"
import { ApplicationError } from "@/domain/errors"
import {
  childrenLinkError,
  normalizeNodeHandleKind,
  parentLinkError,
  type NodeHandleKind,
} from "@/domain/nodes/handle"
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

function assertParentAssignment(
  nodes: RoadmapNode[],
  childKind: NodeHandleKind,
  parentId: string | null
) {
  if (!parentId) {
    return
  }

  const parent = nodes.find((node) => node.id === parentId)
  if (!parent) {
    throw new ApplicationError("validation", "Parent node was not found.")
  }

  const message = parentLinkError(childKind, parent.handleKind, parentId)
  if (message) {
    throw new ApplicationError("validation", message)
  }
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
    handleKind?: string | null
    incomingEdgeAnimated?: boolean
  }
) {
  await requireOwnedRole(userId, input.roleId)
  const title = requireTitle(input.title)
  const handleKind = normalizeNodeHandleKind(input.handleKind)
  const nodes = await nodesRepository.listByRoleId(input.roleId)

  let positionX = 0
  let positionY = 0
  const parentId: string | null = input.parentId

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

    assertParentAssignment(nodes, handleKind, parentId)

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
    handleKind,
    incomingEdgeAnimated: Boolean(input.incomingEdgeAnimated),
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
    handleKind?: string | null
    incomingEdgeAnimated?: boolean
  }
) {
  const node = await requireOwnedNode(userId, roleId, nodeId)
  const nodes = await nodesRepository.listByRoleId(roleId)
  const handleKind =
    input.handleKind !== undefined
      ? normalizeNodeHandleKind(input.handleKind)
      : node.handleKind
  const childCount = nodes.filter((item) => item.parentId === nodeId).length
  const childrenError = childrenLinkError(handleKind, childCount)
  if (childrenError) {
    throw new ApplicationError("validation", childrenError)
  }

  assertParentAssignment(nodes, handleKind, node.parentId)

  return nodesRepository.updateDetails(roleId, nodeId, {
    title: requireTitle(input.title),
    description: optionalDescription(input.description),
    icon: normalizeNodeIcon(input.icon),
    ...(input.notes !== undefined
      ? { notes: optionalDescription(input.notes) }
      : {}),
    ...(input.handleKind !== undefined ? { handleKind } : {}),
    ...(input.incomingEdgeAnimated !== undefined
      ? { incomingEdgeAnimated: Boolean(input.incomingEdgeAnimated) }
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

    assertParentAssignment(nodes, node.handleKind, parentId)
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
