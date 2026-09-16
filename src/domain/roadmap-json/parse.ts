import { ApplicationError } from "@/domain/errors"
import { isValidHttpUrl, normalizeLinkUrl, displayLinkLabel } from "@/domain/links/url"
import { parseAccentHex } from "@/domain/nodes/accent"
import { wouldCreateCycle } from "@/domain/nodes/hierarchy"
import { DEFAULT_NODE_ICON, normalizeNodeIcon } from "@/domain/nodes/icon"
import { DEFAULT_NODE_KIND } from "@/domain/nodes/kind"
import { displayNodeTitle } from "@/domain/nodes/title"
import { displayChecklistTitle } from "@/domain/checklists/title"
import { displayRoleName } from "@/domain/roles/name"

import {
  ROADMAP_SCHEMA_ID,
  type NormalizedChecklistItem,
  type NormalizedLink,
  type NormalizedRoadmapDocument,
  type NormalizedRoadmapNode,
} from "@/domain/roadmap-json/types"
import { isUuid } from "@/domain/roadmap-json/uuid"

const DOCUMENT_KEYS = new Set(["schema", "roadmap", "nodes"])
const ROADMAP_KEYS = new Set(["name", "description"])
const NODE_KEYS = new Set([
  "id",
  "title",
  "parent_id",
  "description",
  "icon",
  "accent_color",
  "checklist",
  "notes",
  "links",
])
const CHECKLIST_KEYS = new Set(["id", "title", "completed", "description"])
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

function parseChecklist(value: unknown, seen: Set<string>): NormalizedChecklistItem[] {
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

    assertAllowedKeys(item, CHECKLIST_KEYS, `Task ${index + 1}`)

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

function parseLinks(value: unknown, seen: Set<string>): NormalizedLink[] {
  if (value === undefined) {
    return []
  }

  if (!Array.isArray(value)) {
    fail("Topic links must be an array.")
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

    const label = displayLinkLabel(requireString(item.label, `Link ${index + 1} label`))
    if (!label) {
      fail(`Link ${index + 1} label cannot be empty.`)
    }

    const url = normalizeLinkUrl(requireString(item.url, `Link ${index + 1} url`))
    if (!isValidHttpUrl(url)) {
      fail(`Link ${index + 1} url must be a valid HTTP(S) URL.`)
    }

    return { id, label, url }
  })
}

function parseNode(
  value: unknown,
  index: number,
  seenNodeIds: Set<string>,
  seenChecklistIds: Set<string>,
  seenLinkIds: Set<string>
): NormalizedRoadmapNode {
  if (!isPlainObject(value)) {
    fail(`Topic ${index + 1} must be an object.`)
  }

  assertAllowedKeys(value, NODE_KEYS, `Topic ${index + 1}`)

  const id = requireUuid(value.id, `Topic ${index + 1} id`)
  if (seenNodeIds.has(id)) {
    fail("Topic IDs must be unique in the document.")
  }
  seenNodeIds.add(id)

  const title = displayNodeTitle(requireString(value.title, `Topic ${index + 1} title`))
  if (!title) {
    fail(`Topic ${index + 1} title cannot be empty.`)
  }

  const parentRaw = value.parent_id
  let parentId: string | null = null

  if (parentRaw !== undefined && parentRaw !== null) {
    parentId = requireUuid(parentRaw, `Topic ${index + 1} parent_id`)
  }

  const description = optionalString(value.description, `Topic ${index + 1} description`)
  const notes = optionalString(value.notes, `Topic ${index + 1} notes`)
  const accentRaw = optionalString(value.accent_color, `Topic ${index + 1} accent_color`)
  let accentColor: string | null = null
  if (accentRaw !== undefined) {
    const parsed = parseAccentHex(accentRaw)
    if (!parsed.ok) {
      fail(`Topic ${index + 1} accent_color must be a 3 or 6 digit hex color.`)
    }
    accentColor = parsed.value
  }

  return {
    id,
    kind: DEFAULT_NODE_KIND,
    parentId,
    title,
    description: description?.trim() ? description.trim() : null,
    notes: notes?.trim() ? notes.trim() : null,
    icon: normalizeNodeIcon(optionalString(value.icon, `Topic ${index + 1} icon`)),
    accentColor,
    checklist: parseChecklist(value.checklist, seenChecklistIds),
    links: parseLinks(value.links, seenLinkIds),
  }
}

function assertGraph(nodes: NormalizedRoadmapNode[]) {
  const byId = new Map(nodes.map((node) => [node.id, node]))
  const graph = nodes.map((node) => ({ id: node.id, parentId: node.parentId }))

  for (const node of nodes) {
    if (!node.parentId) {
      continue
    }

    if (node.parentId === node.id) {
      fail("A topic cannot nest under itself.")
    }

    const parent = byId.get(node.parentId)
    if (!parent) {
      fail("Each nested topic must belong to another topic in this file.")
    }

    if (wouldCreateCycle(graph, node.id, node.parentId)) {
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

  if (value.schema !== ROADMAP_SCHEMA_ID) {
    fail(`schema must equal "${ROADMAP_SCHEMA_ID}".`)
  }

  if (!isPlainObject(value.roadmap)) {
    fail("roadmap must be an object.")
  }

  assertAllowedKeys(value.roadmap, ROADMAP_KEYS, "roadmap")

  const name = displayRoleName(requireString(value.roadmap.name, "roadmap.name"))
  if (!name) {
    fail("roadmap.name cannot be empty.")
  }

  const description = optionalString(value.roadmap.description, "roadmap.description")

  if (!Array.isArray(value.nodes)) {
    fail("nodes must be an array.")
  }

  const seenNodeIds = new Set<string>()
  const seenChecklistIds = new Set<string>()
  const seenLinkIds = new Set<string>()
  const nodes = value.nodes.map((node, index) =>
    parseNode(node, index, seenNodeIds, seenChecklistIds, seenLinkIds)
  )

  assertGraph(nodes)

  return {
    schema: ROADMAP_SCHEMA_ID,
    name,
    description: description?.trim() ? description.trim() : null,
    nodes,
  }
}
