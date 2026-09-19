import type { NodeLink } from "@/domain/links/types"
import type { ChecklistItem } from "@/domain/tasks/types"
import type { TrackProposal } from "@/domain/track/proposals"
import type { RoadmapNode } from "@/domain/topics/types"

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
