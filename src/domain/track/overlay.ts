import type { NodeLink } from "@/domain/links/types"
import type { ChecklistItem } from "@/domain/tasks/types"
import type { TrackProposal } from "@/domain/track/proposals"
import { subtreeNodeIds } from "@/domain/progress/progress"
import type { RoadmapNode } from "@/domain/topics/types"

export type RoadmapSnapshot = {
  roleId: string
  nodes: RoadmapNode[]
  items: ChecklistItem[]
  links: NodeLink[]
}

export function pendingProposals(proposals: TrackProposal[]) {
  return proposals.filter((item) => item.status === "pending")
}

export function proposalForTopic(
  proposals: TrackProposal[],
  topicId: string
) {
  return pendingProposals(proposals).find(
    (item) =>
      item.entity === "topic" &&
      (item.targetId === topicId || item.payload.id === topicId)
  )
}

export function overlayGhostTopics(
  nodes: RoadmapNode[],
  proposals: TrackProposal[],
  roleId: string
): RoadmapNode[] {
  const extras: RoadmapNode[] = []
  const existing = new Set(nodes.map((node) => node.id))
  const now = new Date().toISOString()

  for (const proposal of pendingProposals(proposals)) {
    if (proposal.entity !== "topic" || proposal.kind !== "create") {
      continue
    }
    const id =
      (typeof proposal.payload.id === "string" && proposal.payload.id) ||
      proposal.targetId
    if (!id || existing.has(id)) {
      continue
    }
    extras.push({
      id,
      roleId,
      parentId: proposal.parentId,
      kind: "skill",
      title: proposal.title,
      description:
        typeof proposal.payload.description === "string"
          ? proposal.payload.description
          : null,
      notes:
        typeof proposal.payload.notes === "string" ? proposal.payload.notes : null,
      icon:
        typeof proposal.payload.icon === "string"
          ? proposal.payload.icon
          : "circle-dot",
      color:
        typeof proposal.payload.color === "string" ? proposal.payload.color : null,
      handleKind: "regular",
      incomingEdgeAnimated: false,
      positionX: 0,
      positionY: 0,
      sortOrder: 10_000,
      createdAt: now,
      updatedAt: now,
    })
    existing.add(id)
  }

  return [...nodes, ...extras]
}

export function overlayGhostTasks(
  items: ChecklistItem[],
  proposals: TrackProposal[]
): ChecklistItem[] {
  const extras: ChecklistItem[] = []
  const existing = new Set(items.map((item) => item.id))
  const now = new Date().toISOString()

  for (const proposal of pendingProposals(proposals)) {
    if (proposal.entity !== "task" || proposal.kind !== "create") {
      continue
    }
    const id =
      (typeof proposal.payload.id === "string" && proposal.payload.id) ||
      proposal.targetId
    const topicId =
      (typeof proposal.payload.topicId === "string" && proposal.payload.topicId) ||
      proposal.parentId
    if (!id || !topicId || existing.has(id)) {
      continue
    }
    extras.push({
      id,
      topicId,
      title: proposal.title,
      description:
        typeof proposal.payload.description === "string"
          ? proposal.payload.description
          : null,
      completed: false,
      sortOrder: 10_000,
      createdAt: now,
      updatedAt: now,
      completedAt: null,
    })
    existing.add(id)
  }

  return [...items, ...extras]
}

export function overlayGhostLinks(
  links: NodeLink[],
  proposals: TrackProposal[],
  roleId: string
): NodeLink[] {
  const extras: NodeLink[] = []
  const existing = new Set(links.map((link) => link.id))
  const now = new Date().toISOString()

  for (const proposal of pendingProposals(proposals)) {
    if (proposal.entity !== "link" || proposal.kind !== "create") {
      continue
    }
    const id =
      (typeof proposal.payload.id === "string" && proposal.payload.id) ||
      proposal.targetId
    if (!id || existing.has(id)) {
      continue
    }
    extras.push({
      id,
      roleId,
      topicId: proposal.parentId,
      label: proposal.title,
      url:
        typeof proposal.payload.url === "string"
          ? proposal.payload.url
          : "https://example.com",
      createdAt: now,
      updatedAt: now,
    })
    existing.add(id)
  }

  return [...links, ...extras]
}

function payloadString(payload: Record<string, unknown>, key: string) {
  const value = payload[key]
  return typeof value === "string" ? value : null
}

function entityId(proposal: TrackProposal) {
  const fromPayload = payloadString(proposal.payload, "id")
  return fromPayload || proposal.targetId
}

export function applyAcceptedProposal(
  snapshot: RoadmapSnapshot,
  proposal: TrackProposal
): RoadmapSnapshot {
  const now = new Date().toISOString()

  if (proposal.entity === "topic") {
    if (proposal.kind === "create") {
      const id = entityId(proposal)
      if (!id || snapshot.nodes.some((node) => node.id === id)) {
        return snapshot
      }
      const node: RoadmapNode = {
        id,
        roleId: snapshot.roleId,
        parentId: proposal.parentId,
        kind: "skill",
        title: payloadString(proposal.payload, "title") || proposal.title,
        description: payloadString(proposal.payload, "description"),
        notes: payloadString(proposal.payload, "notes"),
        icon: payloadString(proposal.payload, "icon") || "circle-dot",
        color: payloadString(proposal.payload, "color"),
        handleKind: "regular",
        incomingEdgeAnimated: false,
        positionX: 0,
        positionY: 0,
        sortOrder: 10_000,
        createdAt: now,
        updatedAt: now,
      }
      return { ...snapshot, nodes: [...snapshot.nodes, node] }
    }

    if (proposal.kind === "update" && proposal.targetId) {
      return {
        ...snapshot,
        nodes: snapshot.nodes.map((node) => {
          if (node.id !== proposal.targetId) {
            return node
          }
          return {
            ...node,
            title: payloadString(proposal.payload, "title") || node.title,
            description:
              proposal.payload.description === undefined
                ? node.description
                : (proposal.payload.description as string | null),
            notes:
              proposal.payload.notes === undefined
                ? node.notes
                : (proposal.payload.notes as string | null),
            icon: payloadString(proposal.payload, "icon") || node.icon,
            color:
              proposal.payload.color === undefined
                ? node.color
                : (proposal.payload.color as string | null),
            updatedAt: now,
          }
        }),
      }
    }

    if (proposal.kind === "delete" && proposal.targetId) {
      const removing = subtreeNodeIds(snapshot.nodes, proposal.targetId)
      return {
        ...snapshot,
        nodes: snapshot.nodes.filter((node) => !removing.has(node.id)),
        items: snapshot.items.filter((item) => !removing.has(item.topicId)),
        links: snapshot.links.filter(
          (link) => !link.topicId || !removing.has(link.topicId)
        ),
      }
    }
  }

  if (proposal.entity === "task") {
    const topicId =
      payloadString(proposal.payload, "topicId") || proposal.parentId
    if (proposal.kind === "create") {
      const id = entityId(proposal)
      if (!id || !topicId || snapshot.items.some((item) => item.id === id)) {
        return snapshot
      }
      const item: ChecklistItem = {
        id,
        topicId,
        title: payloadString(proposal.payload, "title") || proposal.title,
        description: payloadString(proposal.payload, "description"),
        completed: false,
        sortOrder: 10_000,
        createdAt: now,
        updatedAt: now,
        completedAt: null,
      }
      return { ...snapshot, items: [...snapshot.items, item] }
    }

    if (proposal.kind === "update" && proposal.targetId) {
      return {
        ...snapshot,
        items: snapshot.items.map((item) => {
          if (item.id !== proposal.targetId) {
            return item
          }
          const completed =
            typeof proposal.payload.completed === "boolean"
              ? proposal.payload.completed
              : item.completed
          return {
            ...item,
            title: payloadString(proposal.payload, "title") || item.title,
            description:
              proposal.payload.description === undefined
                ? item.description
                : (proposal.payload.description as string | null),
            completed,
            completedAt: completed ? item.completedAt ?? now : null,
            updatedAt: now,
          }
        }),
      }
    }

    if (proposal.kind === "delete" && proposal.targetId) {
      return {
        ...snapshot,
        items: snapshot.items.filter((item) => item.id !== proposal.targetId),
      }
    }
  }

  if (proposal.entity === "link") {
    const topicId =
      proposal.payload.topicId === undefined
        ? proposal.parentId
        : (proposal.payload.topicId as string | null)
    if (proposal.kind === "create") {
      const id = entityId(proposal)
      if (!id || snapshot.links.some((link) => link.id === id)) {
        return snapshot
      }
      const link: NodeLink = {
        id,
        roleId: snapshot.roleId,
        topicId,
        label: payloadString(proposal.payload, "label") || proposal.title,
        url: payloadString(proposal.payload, "url") || "https://example.com",
        createdAt: now,
        updatedAt: now,
      }
      return { ...snapshot, links: [...snapshot.links, link] }
    }

    if (proposal.kind === "update" && proposal.targetId) {
      return {
        ...snapshot,
        links: snapshot.links.map((link) => {
          if (link.id !== proposal.targetId) {
            return link
          }
          return {
            ...link,
            label: payloadString(proposal.payload, "label") || link.label,
            url: payloadString(proposal.payload, "url") || link.url,
            updatedAt: now,
          }
        }),
      }
    }

    if (proposal.kind === "delete" && proposal.targetId) {
      return {
        ...snapshot,
        links: snapshot.links.filter((link) => link.id !== proposal.targetId),
      }
    }
  }

  return snapshot
}
