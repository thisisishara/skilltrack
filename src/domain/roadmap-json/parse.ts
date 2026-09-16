import { ApplicationError } from "@/domain/errors"
import { isValidHttpUrl, normalizeLinkUrl, displayLinkLabel } from "@/domain/links/url"
import {
  childrenLinkError,
  DEFAULT_NODE_HANDLE_KIND,
  normalizeNodeHandleKind,
  parentLinkError,
  type NodeHandleKind,
} from "@/domain/nodes/handle"
import { parseAccentHex } from "@/domain/nodes/accent"
import { wouldCreateCycle } from "@/domain/nodes/hierarchy"
import { DEFAULT_NODE_ICON, normalizeNodeIcon } from "@/domain/nodes/icon"
import { DEFAULT_NODE_KIND, normalizeNodeKind, type NodeKind } from "@/domain/nodes/kind"
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
  "kind",
  "parent_id",
  "description",
  "icon",
  "accent_color",
  "handle_kind",
  "incoming_edge_animated",
  "position",
  "checklist",
  "notes",
  "links",
])
const LABEL_FORBIDDEN_KEYS = new Set([
  "description",
  "icon",
  "accent_color",
  "handle_kind",
  "incoming_edge_animated",
  "checklist",
  "notes",
  "links",
])
const POSITION_KEYS = new Set(["x", "y"])
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

function parsePosition(value: unknown): { x: number; y: number } {
  if (value === undefined) {
    return { x: 0, y: 0 }
  }

  if (!isPlainObject(value)) {
    fail("Node position must be an object.")
  }

  assertAllowedKeys(value, POSITION_KEYS, "Node position")

  const x = value.x
  const y = value.y

  if (typeof x !== "number" || typeof y !== "number" || !Number.isFinite(x) || !Number.isFinite(y)) {
    fail("Node position x and y must be finite numbers.")
  }

  return { x, y }
}

function parseChecklist(value: unknown, seen: Set<string>): NormalizedChecklistItem[] {
  if (value === undefined) {
    return []
  }

  if (!Array.isArray(value)) {
    fail("Node checklist must be an array.")
  }

  return value.map((item, index) => {
    if (!isPlainObject(item)) {
      fail(`Checklist item ${index + 1} must be an object.`)
    }

    assertAllowedKeys(item, CHECKLIST_KEYS, `Checklist item ${index + 1}`)

    const id = requireUuid(item.id, `Checklist item ${index + 1} id`)
    if (seen.has(id)) {
      fail("Checklist item IDs must be unique in the document.")
    }
    seen.add(id)

    const title = displayChecklistTitle(requireString(item.title, `Checklist item ${index + 1} title`))
    if (!title) {
      fail(`Checklist item ${index + 1} title cannot be empty.`)
    }

    if (typeof item.completed !== "boolean") {
      fail(`Checklist item ${index + 1} completed must be a boolean.`)
    }

    const description = optionalString(item.description, `Checklist item ${index + 1} description`)

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
    fail("Node links must be an array.")
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

function parseKind(value: unknown): NodeKind {
  if (value === undefined) {
    return DEFAULT_NODE_KIND
  }

  const kind = requireString(value, "Node kind")
  if (kind !== "skill" && kind !== "label") {
    fail('Node kind must be "skill" or "label".')
  }

  return normalizeNodeKind(kind)
}

function parseHandleKind(value: unknown): NodeHandleKind {
  if (value === undefined) {
    return DEFAULT_NODE_HANDLE_KIND
  }

  const handleKind = requireString(value, "Node handle_kind")
  if (handleKind !== "regular" && handleKind !== "input" && handleKind !== "output") {
    fail('Node handle_kind must be "regular", "input", or "output".')
  }

  return normalizeNodeHandleKind(handleKind)
}

function parseNode(
  value: unknown,
  index: number,
  seenNodeIds: Set<string>,
  seenChecklistIds: Set<string>,
  seenLinkIds: Set<string>
): NormalizedRoadmapNode {
  if (!isPlainObject(value)) {
    fail(`Node ${index + 1} must be an object.`)
  }

  assertAllowedKeys(value, NODE_KEYS, `Node ${index + 1}`)

  const id = requireUuid(value.id, `Node ${index + 1} id`)
  if (seenNodeIds.has(id)) {
    fail("Node IDs must be unique in the document.")
  }
  seenNodeIds.add(id)

  const title = displayNodeTitle(requireString(value.title, `Node ${index + 1} title`))
  if (!title) {
    fail(`Node ${index + 1} title cannot be empty.`)
  }

  const kind = parseKind(value.kind)
  const parentRaw = value.parent_id
  let parentId: string | null = null

  if (parentRaw !== undefined && parentRaw !== null) {
    parentId = requireUuid(parentRaw, `Node ${index + 1} parent_id`)
  }

  if (kind === "label") {
    for (const key of LABEL_FORBIDDEN_KEYS) {
      if (value[key] !== undefined) {
        fail(`Label nodes cannot include "${key}".`)
      }
    }

    if (parentId) {
      fail("Labels cannot have a parent.")
    }

    const position = parsePosition(value.position)

    return {
      id,
      kind,
      parentId: null,
      title,
      description: null,
      notes: null,
      icon: DEFAULT_NODE_ICON,
      accentColor: null,
      handleKind: DEFAULT_NODE_HANDLE_KIND,
      incomingEdgeAnimated: false,
      positionX: position.x,
      positionY: position.y,
      checklist: [],
      links: [],
    }
  }

  const position = parsePosition(value.position)
  const description = optionalString(value.description, `Node ${index + 1} description`)
  const notes = optionalString(value.notes, `Node ${index + 1} notes`)
  const accentRaw = optionalString(value.accent_color, `Node ${index + 1} accent_color`)
  let accentColor: string | null = null
  if (accentRaw !== undefined) {
    const parsed = parseAccentHex(accentRaw)
    if (!parsed.ok) {
      fail(`Node ${index + 1} accent_color must be a 3 or 6 digit hex color.`)
    }
    accentColor = parsed.value
  }

  return {
    id,
    kind,
    parentId,
    title,
    description: description?.trim() ? description.trim() : null,
    notes: notes?.trim() ? notes.trim() : null,
    icon: normalizeNodeIcon(optionalString(value.icon, `Node ${index + 1} icon`)),
    accentColor,
    handleKind: parseHandleKind(value.handle_kind),
    incomingEdgeAnimated:
      value.incoming_edge_animated === undefined
        ? false
        : typeof value.incoming_edge_animated === "boolean"
          ? value.incoming_edge_animated
          : fail(`Node ${index + 1} incoming_edge_animated must be a boolean.`),
    positionX: position.x,
    positionY: position.y,
    checklist: parseChecklist(value.checklist, seenChecklistIds),
    links: parseLinks(value.links, seenLinkIds),
  }
}

function assertGraph(nodes: NormalizedRoadmapNode[]) {
  const byId = new Map(nodes.map((node) => [node.id, node]))
  const graph = nodes.map((node) => ({ id: node.id, parentId: node.parentId }))
  const childCount = new Map<string, number>()

  for (const node of nodes) {
    if (!node.parentId) {
      continue
    }

    if (node.parentId === node.id) {
      fail("A node cannot be its own parent.")
    }

    const parent = byId.get(node.parentId)
    if (!parent) {
      fail("Parent references must point to a node in the document.")
    }

    if (parent.kind === "label") {
      fail("Labels cannot have children.")
    }

    const handleMessage = parentLinkError(node.handleKind, parent.handleKind, node.parentId)
    if (handleMessage) {
      fail(handleMessage)
    }

    childCount.set(parent.id, (childCount.get(parent.id) ?? 0) + 1)
  }

  for (const node of nodes) {
    const message = childrenLinkError(node.handleKind, childCount.get(node.id) ?? 0)
    if (message) {
      fail(message)
    }

    if (wouldCreateCycle(graph, node.id, node.parentId)) {
      fail("Roadmap parent relationships cannot contain a cycle.")
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
