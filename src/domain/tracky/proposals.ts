export type TrackyProposalKind = "create" | "update" | "delete"
export type TrackyProposalEntity = "topic" | "task" | "link" | "roadmap"

export type TrackyProposal = {
  id: string
  kind: TrackyProposalKind
  entity: TrackyProposalEntity
  status: "pending" | "accepted" | "rejected"
  targetId: string | null
  parentId: string | null
  title: string
  payload: Record<string, unknown>
}

export type TrackyProposalIndex = Pick<
  TrackyProposal,
  "id" | "kind" | "entity" | "targetId" | "parentId" | "title" | "status"
>

export function proposalFocusNodeId(proposal: TrackyProposal): string | null {
  if (proposal.entity === "roadmap") {
    return null
  }
  if (proposal.entity === "task" || proposal.entity === "link") {
    return proposal.parentId
  }
  if (proposal.entity === "topic" && proposal.kind === "create") {
    return proposal.targetId ?? proposal.parentId
  }
  return proposal.targetId ?? proposal.parentId
}

export function proposalFocusTaskId(proposal: TrackyProposal): string | null {
  if (proposal.entity !== "task" || !proposal.targetId) {
    return null
  }
  return proposal.targetId
}

export function proposalFocusFacet(
  proposal: TrackyProposal
): "notes" | "description" | null {
  if (proposal.payload.facet === "notes") {
    return "notes"
  }
  if (proposal.payload.facet === "role") {
    if (proposal.payload.notes !== undefined) {
      return "notes"
    }
    if (proposal.payload.description !== undefined) {
      return "description"
    }
  }
  return null
}

export function notePreview(value: unknown, max = 42) {
  if (typeof value !== "string") {
    return null
  }
  const text = value.replace(/\s+/g, " ").trim()
  if (!text) {
    return null
  }
  return text.length > max ? `${text.slice(0, max - 1)}…` : text
}

export function proposalTopicId(proposal: TrackyProposal): string | null {
  if (proposal.entity === "task" || proposal.entity === "link") {
    return proposal.parentId
  }
  if (proposal.entity === "roadmap") {
    return null
  }
  return proposal.targetId ?? proposal.parentId
}

export function proposalHeadline(
  proposal: TrackyProposal,
  fallbackTopicTitle?: string | null
): string {
  const topicTitle =
    typeof proposal.payload.topicTitle === "string"
      ? proposal.payload.topicTitle
      : (fallbackTopicTitle ?? null)
  const withTopic = (line: string) =>
    topicTitle ? `${line} · ${topicTitle}` : line

  if (proposal.payload.facet === "role") {
    const preview =
      notePreview(proposal.payload.preview) ??
      notePreview(proposal.payload.notes) ??
      notePreview(proposal.payload.description)
    if (proposal.payload.notes !== undefined) {
      return preview ? `Edit roadmap notes · ${preview}` : "Edit roadmap notes"
    }
    if (proposal.payload.description !== undefined) {
      return preview
        ? `Edit roadmap description · ${preview}`
        : "Edit roadmap description"
    }
    return "Edit roadmap overview"
  }

  if (proposal.payload.facet === "notes") {
    const action =
      proposal.payload.notesAction === "delete"
        ? "Delete note"
        : proposal.payload.notesAction === "create"
          ? "Add note"
          : "Edit note"
    const where = topicTitle
    const noteTitle =
      (typeof proposal.payload.noteTitle === "string" && proposal.payload.noteTitle) ||
      proposal.title
    const line = where ? `${action} · ${where}` : action
    return noteTitle ? `${line} · ${noteTitle}` : line
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

export function toProposalIndex(proposal: TrackyProposal): TrackyProposalIndex {
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

export function isTrackyProposal(value: unknown): value is TrackyProposal {
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
