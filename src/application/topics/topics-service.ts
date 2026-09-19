import "server-only"

import { getRoleForUser, updateRoleNotes } from "@/application/roles/roles-service"
import { ApplicationError } from "@/domain/errors"
import {
  accentUpdatesForChange,
  parseAccentHex,
  type NestedAccentMode,
} from "@/domain/topics/accent"
import {
  childrenLinkError,
  normalizeNodeHandleKind,
  parentLinkError,
  type NodeHandleKind,
} from "@/domain/topics/handle"
import { wouldCreateCycle } from "@/domain/topics/hierarchy"
import { normalizeNodeIcon } from "@/domain/topics/icon"
import {
  isLabelNode,
  normalizeNodeKind,
} from "@/domain/topics/kind"
import { placementUpdates, rootPlacementUpdates } from "@/domain/topics/placement"
import {
  CHILD_OFFSET_Y,
  LABEL_OFFSET_X,
  LABEL_ORIGIN_Y,
  ROOT_OFFSET_X,
} from "@/domain/topics/layout"
import { displayNodeTitle } from "@/domain/topics/title"
import type { RoadmapNode } from "@/domain/topics/types"
import * as linksRepository from "@/repositories/links/links-repository"
import * as topicsRepository from "@/repositories/topics/topics-repository"

function requireTitle(title: string) {
  const trimmed = displayNodeTitle(title)

  if (!trimmed) {
    throw new ApplicationError("validation", "Topic title cannot be empty.")
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
    throw new ApplicationError("validation", "That topic was not found.")
  }

  if (isLabelNode(parent)) {
    throw new ApplicationError("validation", "Labels cannot contain topics.")
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
  const node = await topicsRepository.getByIdForRole(roleId, nodeId)

  if (!node) {
    throw new ApplicationError("not_found", "That topic no longer exists.")
  }

  return node
}

export async function listTopicsForRole(userId: string, roleId: string) {
  await requireOwnedRole(userId, roleId)
  return topicsRepository.listByRoleId(roleId)
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
  const nodes = await topicsRepository.listByRoleId(input.roleId)

  if (kind === "label" && input.parentId) {
    throw new ApplicationError("validation", "Labels cannot nest under a topic.")
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
      throw new ApplicationError("validation", "That topic was not found.")
    }

    if (parent.roleId !== input.roleId) {
      throw new ApplicationError(
        "validation",
        "Topics have to stay on the same role."
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

  return topicsRepository.insert({
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
    color?: string | null
    nestedAccents?: NestedAccentMode
    handleKind?: string | null
    incomingEdgeAnimated?: boolean
  }
) {
  const node = await requireOwnedNode(userId, roleId, nodeId)
  const nodes = await topicsRepository.listByRoleId(roleId)
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

  const updated = await topicsRepository.updateDetails(roleId, nodeId, {
    title: requireTitle(input.title),
    description:
      input.description !== undefined
        ? optionalDescription(input.description)
        : node.description,
    icon:
      input.icon !== undefined ? normalizeNodeIcon(input.icon) : node.icon,
    ...(input.notes !== undefined
      ? { notes: optionalDescription(input.notes) }
      : {}),
    ...(input.color !== undefined || input.accentColor !== undefined
      ? { color: optionalAccent(input.color ?? input.accentColor) }
      : {}),
    ...(input.handleKind !== undefined ? { handleKind } : {}),
    ...(input.incomingEdgeAnimated !== undefined
      ? { incomingEdgeAnimated: Boolean(input.incomingEdgeAnimated) }
      : {}),
  })

  const nextColor =
    input.color !== undefined ? input.color : input.accentColor
  if (nextColor !== undefined && input.nestedAccents) {
    const nextAccent = optionalAccent(nextColor) ?? null
    const updates = accentUpdatesForChange(
      nodes,
      nodeId,
      nextAccent,
      input.nestedAccents
    ).filter((update) => update.id !== nodeId)
    await topicsRepository.updateAccentColors(roleId, updates)
  }

  return updated
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
    throw new ApplicationError("validation", "That topic position is invalid.")
  }

  return topicsRepository.updatePosition(roleId, nodeId, positionX, positionY)
}

export async function reparentNode(
  userId: string,
  roleId: string,
  nodeId: string,
  parentId: string | null
) {
  const node = await requireOwnedNode(userId, roleId, nodeId)
  const nodes = await topicsRepository.listByRoleId(roleId)

  if (isLabelNode(node) && parentId) {
    throw new ApplicationError("validation", "Labels cannot nest under a topic.")
  }

  if (parentId) {
    const parent = nodes.find((item) => item.id === parentId)

    if (!parent) {
      throw new ApplicationError("validation", "That topic was not found.")
    }

    if (parent.roleId !== roleId || node.roleId !== roleId) {
      throw new ApplicationError(
        "validation",
        "Topics have to stay on the same role."
      )
    }

    if (wouldCreateCycle(nodes, nodeId, parentId)) {
      throw new ApplicationError(
        "validation",
        "A topic cannot nest under itself."
      )
    }

    assertParentAssignment(nodes, node.handleKind, parentId)
  }

  return topicsRepository.updateParent(
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
  const nodes = await topicsRepository.listByRoleId(roleId)

  if (isLabelNode(node)) {
    throw new ApplicationError("validation", "Labels cannot be nested under topics.")
  }

  const parentId = position === "inside" ? targetId : nodes.find((item) => item.id === targetId)?.parentId ?? null
  if (parentId) {
    assertParentAssignment(nodes, node.handleKind, parentId)
  }

  const updates = placementUpdates(nodes, nodeId, targetId, position)
  if (!updates) {
    throw new ApplicationError("validation", "That topic cannot be moved there.")
  }

  await topicsRepository.updatePlacements(roleId, updates)
  const next = await topicsRepository.getByIdForRole(roleId, nodeId)
  if (!next) {
    throw new ApplicationError("not_found", "That topic no longer exists.")
  }
  return next
}

export async function placeNodeAtRoot(
  userId: string,
  roleId: string,
  nodeId: string
) {
  const node = await requireOwnedNode(userId, roleId, nodeId)
  const nodes = await topicsRepository.listByRoleId(roleId)

  if (isLabelNode(node)) {
    throw new ApplicationError("validation", "Labels cannot be nested under topics.")
  }

  const updates = rootPlacementUpdates(nodes, nodeId)
  if (!updates) {
    throw new ApplicationError("validation", "That topic cannot be moved there.")
  }

  await topicsRepository.updatePlacements(roleId, updates)
  const next = await topicsRepository.getByIdForRole(roleId, nodeId)
  if (!next) {
    throw new ApplicationError("not_found", "That topic no longer exists.")
  }
  return next
}

export async function deleteNode(userId: string, roleId: string, nodeId: string) {
  await requireOwnedNode(userId, roleId, nodeId)
  await topicsRepository.deleteForRole(roleId, nodeId)
}

export async function clearRoadmap(userId: string, roleId: string) {
  await requireOwnedRole(userId, roleId)
  await topicsRepository.deleteAllForRole(roleId)
  await linksRepository.deleteAllForRole(roleId)
  await updateRoleNotes(userId, roleId, null)
}
