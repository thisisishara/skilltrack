import "server-only"

import { getRoleForUser, createEmptyRole, deleteRole, updateRoleDescription } from "@/application/roles/roles-service"
import { ApplicationError } from "@/domain/errors"
import { displayRoleName } from "@/domain/roles/name"
import type { Role } from "@/domain/roles/types"
import {
  collectDocumentIds,
  parseRoadmapJson,
  remapRoadmapDocument,
  serializeRoadmapDocument,
  exportFileName,
  type NormalizedRoadmapDocument,
} from "@/domain/roadmap-json"
import * as checklistsRepository from "@/repositories/checklists/checklists-repository"
import * as linksRepository from "@/repositories/links/links-repository"
import * as nodesRepository from "@/repositories/nodes/nodes-repository"

async function documentIdsCollide(document: NormalizedRoadmapDocument) {
  const ids = collectDocumentIds(document)
  const nodeIds = document.nodes.map((node) => node.id)
  const checklistIds = document.nodes.flatMap((node) => node.checklist.map((item) => item.id))
  const linkIds = document.nodes.flatMap((node) => node.links.map((link) => link.id))

  const [nodes, checklists, links] = await Promise.all([
    nodesRepository.listExistingIds(nodeIds),
    checklistsRepository.listExistingIds(checklistIds),
    linksRepository.listExistingIds(linkIds),
  ])

  return ids.some(
    (id) => nodes.has(id) || checklists.has(id) || links.has(id)
  )
}

function siblingSortOrders(document: NormalizedRoadmapDocument) {
  const counters = new Map<string, number>()
  const orders = new Map<string, number>()

  for (const node of document.nodes) {
    const key = node.parentId ?? "__root__"
    const next = counters.get(key) ?? 0
    orders.set(node.id, next)
    counters.set(key, next + 1)
  }

  return orders
}

async function insertGraph(roleId: string, document: NormalizedRoadmapDocument) {
  const sortOrders = siblingSortOrders(document)
  const remaining = [...document.nodes]
  const inserted = new Set<string>()

  while (remaining.length > 0) {
    const ready = remaining.filter(
      (node) => !node.parentId || inserted.has(node.parentId)
    )

    if (ready.length === 0) {
      throw new ApplicationError("validation", "Roadmap parent relationships cannot contain a cycle.")
    }

    await nodesRepository.insertMany(
      ready.map((node) => ({
        id: node.id,
        roleId,
        parentId: node.parentId,
        kind: node.kind,
        title: node.title,
        description: node.description,
        notes: node.notes,
        icon: node.icon,
        accentColor: node.accentColor,
        handleKind: node.handleKind,
        incomingEdgeAnimated: node.incomingEdgeAnimated,
        positionX: node.positionX,
        positionY: node.positionY,
        sortOrder: sortOrders.get(node.id) ?? 0,
      }))
    )

    for (const node of ready) {
      inserted.add(node.id)
    }

    remaining.splice(0, remaining.length, ...remaining.filter((node) => !inserted.has(node.id)))
  }

  const now = new Date().toISOString()
  const checklistRows = document.nodes.flatMap((node) =>
    node.checklist.map((item, index) => ({
      id: item.id,
      nodeId: node.id,
      title: item.title,
      description: item.description,
      sortOrder: index,
      isCompleted: item.completed,
      completedAt: item.completed ? now : null,
    }))
  )
  const linkRows = document.nodes.flatMap((node) =>
    node.links.map((link) => ({
      id: link.id,
      nodeId: node.id,
      label: link.label,
      url: link.url,
    }))
  )

  await checklistsRepository.insertMany(checklistRows)
  await linksRepository.insertMany(linkRows)
}

export async function importRoadmap(
  userId: string,
  jsonText: string,
  options: { roleId?: string; nameOverride?: string } = {}
): Promise<Role> {
  let document = parseRoadmapJson(jsonText)

  if (await documentIdsCollide(document)) {
    document = remapRoadmapDocument(document)
  }

  if (options.roleId) {
    const role = await getRoleForUser(userId, options.roleId)
    if (!role) {
      throw new ApplicationError("not_found", "That role no longer exists.")
    }

    const existing = await nodesRepository.listByRoleId(role.id)
    if (existing.length > 0) {
      throw new ApplicationError(
        "validation",
        "Import is only allowed on an empty roadmap."
      )
    }

    try {
      const stillEmpty = await nodesRepository.listByRoleId(role.id)
      if (stillEmpty.length > 0) {
        throw new ApplicationError(
          "validation",
          "Import is only allowed on an empty roadmap."
        )
      }

      await insertGraph(role.id, document)

      if (!role.description && document.description) {
        return updateRoleDescription(userId, role.id, document.description)
      }

      return role
    } catch (error) {
      await nodesRepository.deleteAllForRole(role.id)
      throw error
    }
  }

  const name = displayRoleName(options.nameOverride ?? document.name)
  if (!name) {
    throw new ApplicationError("validation", "Role name cannot be empty.")
  }

  const role = await createEmptyRole(userId, name, document.description)

  try {
    await insertGraph(role.id, document)
    return role
  } catch (error) {
    await deleteRole(userId, role.id)
    throw error
  }
}

export async function exportRoadmap(userId: string, roleId: string) {
  const role = await getRoleForUser(userId, roleId)
  if (!role) {
    throw new ApplicationError("not_found", "That role no longer exists.")
  }

  const [nodes, items, links] = await Promise.all([
    nodesRepository.listByRoleId(role.id),
    checklistsRepository.listByRoleId(role.id),
    linksRepository.listByRoleId(role.id),
  ])

  const json = serializeRoadmapDocument(role, nodes, items, links)
  return {
    filename: exportFileName(role.name),
    json,
  }
}
