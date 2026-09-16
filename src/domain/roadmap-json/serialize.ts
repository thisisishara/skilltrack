import type { ChecklistItem } from "@/domain/checklists/types"
import type { NodeLink } from "@/domain/links/types"
import { isLabelNode } from "@/domain/nodes/kind"
import type { RoadmapNode } from "@/domain/nodes/types"
import type { Role } from "@/domain/roles/types"

import { parseRoadmapJson } from "@/domain/roadmap-json/parse"
import { ROADMAP_SCHEMA_ID } from "@/domain/roadmap-json/types"

function sortedSiblings(nodes: RoadmapNode[]) {
  return [...nodes].sort((left, right) => {
    if (left.sortOrder !== right.sortOrder) {
      return left.sortOrder - right.sortOrder
    }

    return left.createdAt.localeCompare(right.createdAt)
  })
}

export function serializeRoadmapDocument(
  role: Pick<Role, "name" | "description">,
  nodes: RoadmapNode[],
  items: ChecklistItem[],
  links: NodeLink[]
) {
  const itemsByNode = new Map<string, ChecklistItem[]>()
  for (const item of items) {
    const list = itemsByNode.get(item.nodeId) ?? []
    list.push(item)
    itemsByNode.set(item.nodeId, list)
  }

  const linksByNode = new Map<string, NodeLink[]>()
  for (const link of links) {
    const list = linksByNode.get(link.nodeId) ?? []
    list.push(link)
    linksByNode.set(link.nodeId, list)
  }

  const document = {
    schema: ROADMAP_SCHEMA_ID,
    roadmap: {
      name: role.name,
      ...(role.description ? { description: role.description } : {}),
    },
    nodes: sortedSiblings(nodes).map((node) => {
      if (isLabelNode(node)) {
        return {
          id: node.id,
          kind: "label" as const,
          title: node.title,
          position: { x: node.positionX, y: node.positionY },
        }
      }

      const checklist = (itemsByNode.get(node.id) ?? [])
        .slice()
        .sort((left, right) => left.sortOrder - right.sortOrder)
        .map((item) => ({
          id: item.id,
          title: item.title,
          ...(item.description ? { description: item.description } : {}),
          completed: item.isCompleted,
        }))

      const nodeLinks = (linksByNode.get(node.id) ?? []).map((link) => ({
        id: link.id,
        label: link.label,
        url: link.url,
      }))

      return {
        id: node.id,
        kind: "skill" as const,
        title: node.title,
        ...(node.parentId ? { parent_id: node.parentId } : {}),
        ...(node.description ? { description: node.description } : {}),
        icon: node.icon,
        ...(node.accentColor ? { accent_color: node.accentColor } : {}),
        handle_kind: node.handleKind,
        incoming_edge_animated: node.incomingEdgeAnimated,
        position: { x: node.positionX, y: node.positionY },
        ...(node.notes ? { notes: node.notes } : {}),
        ...(checklist.length > 0 ? { checklist } : {}),
        ...(nodeLinks.length > 0 ? { links: nodeLinks } : {}),
      }
    }),
  }

  const json = `${JSON.stringify(document, null, 2)}\n`
  parseRoadmapJson(json)
  return json
}

export function exportFileName(roleName: string) {
  const slug = roleName
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")

  return `skilltrack-${slug || "roadmap"}.json`
}
