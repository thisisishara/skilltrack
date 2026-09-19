import { ApplicationError } from "@/domain/errors"
import { isValidHttpUrl, normalizeLinkUrl, displayLinkLabel } from "@/domain/links/url"
import { parseAccentHex } from "@/domain/topics/accent"
import { wouldCreateCycle } from "@/domain/topics/hierarchy"
import { DEFAULT_NODE_ICON, normalizeNodeIcon } from "@/domain/topics/icon"
import { displayNodeTitle } from "@/domain/topics/title"
import { displayChecklistTitle } from "@/domain/tasks/title"
import { displayRoleName } from "@/domain/roles/name"

import {
  type NormalizedLink,
  type NormalizedRoadmapDocument,
  type NormalizedTask,
  type NormalizedTopic,
} from "@/domain/roadmap-json/types"
import { foldRoleTitleRoot } from "@/domain/roadmap-json/fold-role-title-root"
import { isUuid } from "@/domain/roadmap-json/uuid"

const DOCUMENT_KEYS = new Set(["roadmap", "topics"])
const ROADMAP_KEYS = new Set(["title", "description", "notes", "links"])
const TOPIC_KEYS = new Set([
  "id",
  "title",
  "description",
  "icon",
  "color",
  "notes",
  "tasks",
  "links",
  "topics",
])
const TASK_KEYS = new Set(["id", "title", "completed", "description"])
const LINK_KEYS = new Set(["id", "label", "url"])

function fail(message: string): never {
  throw new ApplicationError("validation", message)
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value)
}

function assertAllowedKeys(value: Record<string, unknown>, allowed: Set<string>, label: string) {
  for (const key of Object.keys(value)) {
    if (!allowed.has(key)) {
      fail(`${label} contains unknown field "${key}".`)
    }
  }
}

function requireString(value: unknown, label: string) {
  if (typeof value !== "string") {
    fail(`${label} must be a string.`)
  }

  return value
}

function optionalString(value: unknown, label: string) {
  if (value === undefined) {
    return undefined
  }

  return requireString(value, label)
}

function requireUuid(value: unknown, label: string) {
  const text = requireString(value, label)
  if (!isUuid(text)) {
    fail(`${label} must be a UUID.`)
  }

  return text
}

function parseTasks(value: unknown, seen: Set<string>): NormalizedTask[] {
  if (value === undefined) {
    return []
  }

  if (!Array.isArray(value)) {
    fail("Topic tasks must be an array.")
  }

  return value.map((item, index) => {
    if (!isPlainObject(item)) {
      fail(`Task ${index + 1} must be an object.`)
    }

    assertAllowedKeys(item, TASK_KEYS, `Task ${index + 1}`)

    const id = requireUuid(item.id, `Task ${index + 1} id`)
    if (seen.has(id)) {
      fail("Task IDs must be unique in the document.")
    }
    seen.add(id)

    const title = displayChecklistTitle(requireString(item.title, `Task ${index + 1} title`))
    if (!title) {
      fail(`Task ${index + 1} title cannot be empty.`)
    }

    if (typeof item.completed !== "boolean") {
      fail(`Task ${index + 1} completed must be a boolean.`)
    }

    const description = optionalString(item.description, `Task ${index + 1} description`)

    return {
      id,
      title,
      description: description?.trim() ? description.trim() : null,
      completed: item.completed,
    }
  })
}

function parseLinks(value: unknown, seen: Set<string>, label: string): NormalizedLink[] {
  if (value === undefined) {
    return []
  }

  if (!Array.isArray(value)) {
    fail(`${label} must be an array.`)
  }

  return value.map((item, index) => {
    if (!isPlainObject(item)) {
      fail(`Link ${index + 1} must be an object.`)
    }

    assertAllowedKeys(item, LINK_KEYS, `Link ${index + 1}`)

    const id = requireUuid(item.id, `Link ${index + 1} id`)
    if (seen.has(id)) {
      fail("Link IDs must be unique in the document.")
    }
    seen.add(id)

    const linkLabel = displayLinkLabel(requireString(item.label, `Link ${index + 1} label`))
    if (!linkLabel) {
      fail(`Link ${index + 1} label cannot be empty.`)
    }

    const url = normalizeLinkUrl(requireString(item.url, `Link ${index + 1} url`))
    if (!isValidHttpUrl(url)) {
      fail(`Link ${index + 1} url must be a valid HTTP(S) URL.`)
    }

    return { id, label: linkLabel, url }
  })
}

function parseTopic(
  value: unknown,
  parentId: string | null,
  seenTopicIds: Set<string>,
  seenTaskIds: Set<string>,
  seenLinkIds: Set<string>
): NormalizedTopic[] {
  if (!isPlainObject(value)) {
    fail("Each topic must be an object.")
  }

  assertAllowedKeys(value, TOPIC_KEYS, "Topic")

  const id = requireUuid(value.id, "Topic id")
  if (seenTopicIds.has(id)) {
    fail("Topic IDs must be unique in the document.")
  }
  seenTopicIds.add(id)

  const title = displayNodeTitle(requireString(value.title, "Topic title"))
  if (!title) {
    fail("Topic title cannot be empty.")
  }

  const description = optionalString(value.description, "Topic description")
  const notes = optionalString(value.notes, "Topic notes")
  const colorRaw = optionalString(value.color, "Topic color")
  let color: string | null = null
  if (colorRaw !== undefined) {
    const parsed = parseAccentHex(colorRaw)
    if (!parsed.ok) {
      fail("Topic color must be a 3 or 6 digit hex color.")
    }
    color = parsed.value
  }

  const topic: NormalizedTopic = {
    id,
    parentId,
    title,
    description: description?.trim() ? description.trim() : null,
    notes: notes?.trim() ? notes.trim() : null,
    icon: normalizeNodeIcon(optionalString(value.icon, "Topic icon")),
    color,
    tasks: parseTasks(value.tasks, seenTaskIds),
    links: parseLinks(value.links, seenLinkIds, "Topic links"),
  }

  const children = value.topics
  const nested: NormalizedTopic[] = []
  if (children !== undefined) {
    if (!Array.isArray(children)) {
      fail("Topic topics must be an array.")
    }
    for (const child of children) {
      nested.push(...parseTopic(child, id, seenTopicIds, seenTaskIds, seenLinkIds))
    }
  }

  return [topic, ...nested]
}

function assertGraph(topics: NormalizedTopic[]) {
  const byId = new Map(topics.map((topic) => [topic.id, topic]))
  const graph = topics.map((topic) => ({ id: topic.id, parentId: topic.parentId }))

  for (const topic of topics) {
    if (!topic.parentId) {
      continue
    }

    if (topic.parentId === topic.id) {
      fail("A topic cannot nest under itself.")
    }

    if (!byId.has(topic.parentId)) {
      fail("Each nested topic must belong to another topic in this file.")
    }

    if (wouldCreateCycle(graph, topic.id, topic.parentId)) {
      fail("Topics cannot form a loop.")
    }
  }
}

export function parseRoadmapJson(text: string): NormalizedRoadmapDocument {
  const trimmed = text.trim()
  if (!trimmed) {
    fail("JSON cannot be empty.")
  }

  let parsed: unknown
  try {
    parsed = JSON.parse(trimmed)
  } catch {
    fail("JSON is not valid.")
  }

  return validateRoadmapDocument(parsed)
}

export function validateRoadmapDocument(value: unknown): NormalizedRoadmapDocument {
  if (!isPlainObject(value)) {
    fail("Roadmap JSON must be an object.")
  }

  assertAllowedKeys(value, DOCUMENT_KEYS, "Roadmap JSON")

  if (!isPlainObject(value.roadmap)) {
    fail("roadmap must be an object.")
  }

  assertAllowedKeys(value.roadmap, ROADMAP_KEYS, "roadmap")

  const name = displayRoleName(requireString(value.roadmap.title, "roadmap.title"))
  if (!name) {
    fail("roadmap.title cannot be empty.")
  }

  const description = optionalString(value.roadmap.description, "roadmap.description")
  const notes = optionalString(value.roadmap.notes, "roadmap.notes")

  if (!Array.isArray(value.topics)) {
    fail("topics must be an array.")
  }

  const seenTopicIds = new Set<string>()
  const seenTaskIds = new Set<string>()
  const seenLinkIds = new Set<string>()
  const roadmapLinks = parseLinks(value.roadmap.links, seenLinkIds, "Roadmap links")
  const topics = value.topics.flatMap((topic) =>
    parseTopic(topic, null, seenTopicIds, seenTaskIds, seenLinkIds)
  )

  assertGraph(topics)

  return foldRoleTitleRoot({
    name,
    description: description?.trim() ? description.trim() : null,
    notes: notes?.trim() ? notes.trim() : null,
    links: roadmapLinks,
    topics,
  })
}
