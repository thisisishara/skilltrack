import "server-only"

import {
  getRoleForUser,
  createEmptyRole,
  deleteRole,
  updateRoleDescription,
  updateRoleNotes,
} from "@/application/roles/roles-service"
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
import * as tasksRepository from "@/repositories/tasks/tasks-repository"
import * as linksRepository from "@/repositories/links/links-repository"
import * as topicsRepository from "@/repositories/topics/topics-repository"

async function documentIdsCollide(document: NormalizedRoadmapDocument) {
  const ids = collectDocumentIds(document)
  const topicIds = document.topics.map((topic) => topic.id)
  const taskIds = document.topics.flatMap((topic) => topic.tasks.map((task) => task.id))
  const linkIds = [
    ...document.links.map((link) => link.id),
    ...document.topics.flatMap((topic) => topic.links.map((link) => link.id)),
  ]

  const [topics, tasks, links] = await Promise.all([
    topicsRepository.listExistingIds(topicIds),
    tasksRepository.listExistingIds(taskIds),
    linksRepository.listExistingIds(linkIds),
  ])

  return ids.some((id) => topics.has(id) || tasks.has(id) || links.has(id))
}

function siblingSortOrders(document: NormalizedRoadmapDocument) {
  const counters = new Map<string, number>()
  const orders = new Map<string, number>()

  for (const topic of document.topics) {
    const key = topic.parentId ?? "__root__"
    const next = counters.get(key) ?? 0
    orders.set(topic.id, next)
    counters.set(key, next + 1)
  }

  return orders
}

async function insertGraph(roleId: string, document: NormalizedRoadmapDocument) {
  const sortOrders = siblingSortOrders(document)
  const remaining = [...document.topics]
  const inserted = new Set<string>()

  while (remaining.length > 0) {
    const ready = remaining.filter(
      (topic) => !topic.parentId || inserted.has(topic.parentId)
    )

    if (ready.length === 0) {
      throw new ApplicationError("validation", "Topics cannot form a loop.")
    }

    await topicsRepository.insertMany(
      ready.map((topic) => ({
        id: topic.id,
        roleId,
        parentId: topic.parentId,
        kind: "skill",
        title: topic.title,
        description: topic.description,
        notes: topic.notes,
        icon: topic.icon,
        color: topic.color,
        handleKind: "regular",
        incomingEdgeAnimated: false,
        positionX: 0,
        positionY: 0,
        sortOrder: sortOrders.get(topic.id) ?? 0,
      }))
    )

    for (const topic of ready) {
      inserted.add(topic.id)
    }

    remaining.splice(0, remaining.length, ...remaining.filter((topic) => !inserted.has(topic.id)))
  }

  const now = new Date().toISOString()
  const taskRows = document.topics.flatMap((topic) =>
    topic.tasks.map((task, index) => ({
      id: task.id,
      topicId: topic.id,
      title: task.title,
      description: task.description,
      sortOrder: index,
      completed: task.completed,
      completedAt: task.completed ? now : null,
    }))
  )
  const linkRows = [
    ...document.links.map((link) => ({
      id: link.id,
      roleId,
      topicId: null as string | null,
      label: link.label,
      url: link.url,
    })),
    ...document.topics.flatMap((topic) =>
      topic.links.map((link) => ({
        id: link.id,
        roleId,
        topicId: topic.id,
        label: link.label,
        url: link.url,
      }))
    ),
  ]

  await tasksRepository.insertMany(taskRows)
  await linksRepository.insertMany(linkRows)
}

async function applyRoadmapFields(userId: string, role: Role, document: NormalizedRoadmapDocument) {
  let next = role
  if (!role.description && document.description) {
    next = await updateRoleDescription(userId, role.id, document.description)
  }
  if (!role.notes && document.notes) {
    next = await updateRoleNotes(userId, role.id, document.notes)
  }
  return next
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

    const existing = await topicsRepository.listByRoleId(role.id)
    if (existing.length > 0) {
      throw new ApplicationError(
        "validation",
        "Import is only allowed on an empty roadmap."
      )
    }

    try {
      const stillEmpty = await topicsRepository.listByRoleId(role.id)
      if (stillEmpty.length > 0) {
        throw new ApplicationError(
          "validation",
          "Import is only allowed on an empty roadmap."
        )
      }

      await insertGraph(role.id, document)
      return applyRoadmapFields(userId, role, document)
    } catch (error) {
      await topicsRepository.deleteAllForRole(role.id)
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
    return applyRoadmapFields(userId, role, document)
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

  const [topics, tasks, links] = await Promise.all([
    topicsRepository.listByRoleId(role.id),
    tasksRepository.listByRoleId(role.id),
    linksRepository.listByRoleId(role.id),
  ])

  const json = serializeRoadmapDocument(role, topics, tasks, links)
  return {
    filename: exportFileName(role.name),
    json,
  }
}
