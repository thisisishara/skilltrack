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
