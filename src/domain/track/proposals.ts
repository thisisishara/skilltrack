export type TrackProposalKind = "create" | "update" | "delete"
export type TrackProposalEntity = "topic" | "task" | "link" | "roadmap"

export type TrackProposal = {
  id: string
  kind: TrackProposalKind
  entity: TrackProposalEntity
  status: "pending" | "accepted" | "rejected"
  targetId: string | null
  parentId: string | null
  title: string
  payload: Record<string, unknown>
}

export type TrackProposalIndex = Pick<
  TrackProposal,
  "id" | "kind" | "entity" | "targetId" | "parentId" | "title" | "status"
>

export function proposalFocusNodeId(proposal: TrackProposal): string | null {
  if (proposal.entity === "task" || proposal.entity === "link") {
    return proposal.parentId
  }
  if (proposal.entity === "topic" && proposal.kind === "create") {
    return proposal.targetId ?? proposal.parentId
  }
  return proposal.targetId ?? proposal.parentId
}

export function proposalFocusTaskId(proposal: TrackProposal): string | null {
  if (proposal.entity !== "task" || !proposal.targetId) {
    return null
  }
  return proposal.targetId
}

export function proposalTopicId(proposal: TrackProposal): string | null {
  if (proposal.entity === "task" || proposal.entity === "link") {
    return proposal.parentId
  }
  return proposal.targetId ?? proposal.parentId
}

export function proposalHeadline(
  proposal: TrackProposal,
  fallbackTopicTitle?: string | null
): string {
  const topicTitle =
    typeof proposal.payload.topicTitle === "string"
      ? proposal.payload.topicTitle
      : (fallbackTopicTitle ?? null)
  const withTopic = (line: string) =>
    topicTitle ? `${line} · ${topicTitle}` : line

  if (proposal.payload.facet === "role") {
    if (proposal.payload.notes !== undefined) {
      return "Edit roadmap notes"
    }
    if (proposal.payload.description !== undefined) {
      return "Edit roadmap description"
    }
    return "Edit roadmap overview"
  }

  if (proposal.payload.facet === "notes") {
    const action =
      proposal.payload.notesAction === "delete"
        ? "Clear notes"
        : proposal.payload.notesAction === "create"
          ? "Add notes"
          : "Edit notes"
    return topicTitle ? `${action} · ${topicTitle}` : `${action} · ${proposal.title}`
  }

  const verb =
    proposal.kind === "create"
      ? "Add"
      : proposal.kind === "delete"
        ? "Delete"
        : "Update"
  const noun =
    proposal.entity === "task"
      ? "task"
      : proposal.entity === "link"
        ? "link"
        : proposal.entity === "roadmap"
          ? "roadmap"
          : "topic"
  const line = proposal.title.trim()
    ? `${verb} ${noun}: ${proposal.title}`
    : `${verb} ${noun}`
  if (proposal.entity === "task" || proposal.entity === "link") {
    return withTopic(line)
  }
  return line
}

export function toProposalIndex(proposal: TrackProposal): TrackProposalIndex {
  return {
    id: proposal.id,
    kind: proposal.kind,
    entity: proposal.entity,
    targetId: proposal.targetId,
    parentId: proposal.parentId,
    title: proposal.title,
    status: proposal.status,
  }
}

export function isTrackProposal(value: unknown): value is TrackProposal {
  if (!value || typeof value !== "object") {
    return false
  }
  const item = value as Record<string, unknown>
  return (
    typeof item.id === "string" &&
    (item.kind === "create" || item.kind === "update" || item.kind === "delete") &&
    (item.entity === "topic" ||
      item.entity === "task" ||
      item.entity === "link" ||
      item.entity === "roadmap") &&
    typeof item.title === "string"
  )
}
