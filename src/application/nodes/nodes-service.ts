import "server-only"

import { getRoleForUser } from "@/application/roles/roles-service"
import { ApplicationError } from "@/domain/errors"
import { parseAccentHex } from "@/domain/nodes/accent"
import {
  childrenLinkError,
  normalizeNodeHandleKind,
  parentLinkError,
  type NodeHandleKind,
} from "@/domain/nodes/handle"
import { wouldCreateCycle } from "@/domain/nodes/hierarchy"
import { normalizeNodeIcon } from "@/domain/nodes/icon"
import {
  isLabelNode,
  normalizeNodeKind,
} from "@/domain/nodes/kind"
import { placementUpdates } from "@/domain/nodes/placement"
import {
  CHILD_OFFSET_Y,
  LABEL_OFFSET_X,
  LABEL_ORIGIN_Y,
  ROOT_OFFSET_X,
} from "@/domain/nodes/layout"
import { displayNodeTitle } from "@/domain/nodes/title"
import type { RoadmapNode } from "@/domain/nodes/types"
import * as nodesRepository from "@/repositories/nodes/nodes-repository"

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

function optionalAccent(value: string | null | undefined) {
  if (value === undefined) {
    return undefined
  }

  const parsed = parseAccentHex(value)
  if (!parsed.ok) {
    throw new ApplicationError("validation", "Accent color must be a 3 or 6 digit hex code.")
  }

  return parsed.value
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

  if (isLabelNode(parent)) {
    throw new ApplicationError("validation", "Labels cannot have children.")
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
    id?: string
    roleId: string
    parentId: string | null
    kind?: string | null
    title: string
    description?: string | null
    icon?: string | null
    handleKind?: string | null
    incomingEdgeAnimated?: boolean
    positionX?: number
    positionY?: number
  }
) {
  await requireOwnedRole(userId, input.roleId)
  const title = requireTitle(input.title)
  const kind = normalizeNodeKind(input.kind)
  const handleKind =
    kind === "label" ? "regular" : normalizeNodeHandleKind(input.handleKind)
  const nodes = await nodesRepository.listByRoleId(input.roleId)

  if (kind === "label" && input.parentId) {
    throw new ApplicationError("validation", "Labels cannot have a parent.")
  }

  let positionX = 0
  let positionY = 0
  const parentId: string | null = kind === "label" ? null : input.parentId

  if (
    Number.isFinite(input.positionX) &&
    Number.isFinite(input.positionY) &&
    input.positionX !== undefined &&
    input.positionY !== undefined
  ) {
    positionX = input.positionX
    positionY = input.positionY
  } else if (parentId) {
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
  } else if (kind === "label") {
    const labels = nodes.filter(isLabelNode)
    positionX = labels.length * LABEL_OFFSET_X
    positionY = LABEL_ORIGIN_Y
  } else {
    const roots = nodes.filter((node) => node.parentId === null && node.kind !== "label")
    positionX = roots.length * ROOT_OFFSET_X
    positionY = 0
  }

  if (parentId) {
    assertParentAssignment(nodes, handleKind, parentId)
  }

  return nodesRepository.insert({
    id: input.id,
    roleId: input.roleId,
    parentId,
    kind,
    title,
    description: optionalDescription(input.description),
    icon: normalizeNodeIcon(input.icon),
    handleKind,
    incomingEdgeAnimated: kind === "label" ? false : Boolean(input.incomingEdgeAnimated),
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
    accentColor?: string | null
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
    ...(input.accentColor !== undefined
      ? { accentColor: optionalAccent(input.accentColor) }
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

  if (isLabelNode(node) && parentId) {
    throw new ApplicationError("validation", "Labels cannot have a parent.")
  }

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

export async function placeNode(
  userId: string,
  roleId: string,
  nodeId: string,
  targetId: string,
  position: "before" | "after" | "inside"
) {
  const node = await requireOwnedNode(userId, roleId, nodeId)
  await requireOwnedNode(userId, roleId, targetId)
  const nodes = await nodesRepository.listByRoleId(roleId)

  if (isLabelNode(node)) {
    throw new ApplicationError("validation", "Labels cannot be nested in the tree.")
  }

  const parentId = position === "inside" ? targetId : nodes.find((item) => item.id === targetId)?.parentId ?? null
  if (parentId) {
    assertParentAssignment(nodes, node.handleKind, parentId)
  }

  const updates = placementUpdates(nodes, nodeId, targetId, position)
  if (!updates) {
    throw new ApplicationError("validation", "That topic cannot be moved there.")
  }

  await nodesRepository.updatePlacements(roleId, updates)
  const next = await nodesRepository.getByIdForRole(roleId, nodeId)
  if (!next) {
    throw new ApplicationError("not_found", "That node no longer exists.")
  }
  return next
}

export async function deleteNode(userId: string, roleId: string, nodeId: string) {
  await requireOwnedNode(userId, roleId, nodeId)
  await nodesRepository.deleteForRole(roleId, nodeId)
}
