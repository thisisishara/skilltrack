import {
  createNodeLinkAction,
  deleteNodeLinkAction,
  updateNodeLinkAction,
} from "@/application/links/actions"
import { updateRoleDescriptionAction, updateRoleNotesAction } from "@/application/roles/actions"
import { createNodeAction, deleteNodeAction, updateNodeAction } from "@/application/topics/actions"
import {
  createChecklistItemAction,
  deleteChecklistItemAction,
  setChecklistItemCompletedAction,
  updateChecklistItemAction,
} from "@/application/tasks/actions"
import type { TrackyProposal } from "@/domain/tracky/proposals"

function asString(value: unknown) {
  return typeof value === "string" ? value : ""
}

export async function persistTrackyProposal(
  roleId: string,
  proposal: TrackyProposal
): Promise<{ ok: true } | { ok: false; message: string }> {
  if (proposal.entity === "topic") {
    if (proposal.kind === "create") {
      const result = await createNodeAction({
        id: asString(proposal.payload.id) || proposal.targetId || undefined,
        roleId,
        parentId: proposal.parentId,
        title: asString(proposal.payload.title) || proposal.title,
        description: asString(proposal.payload.description) || null,
        icon: asString(proposal.payload.icon) || null,
      })
      return result.ok ? { ok: true } : { ok: false, message: result.message }
    }
    if (proposal.kind === "update" && proposal.targetId) {
      const result = await updateNodeAction({
        roleId,
        nodeId: proposal.targetId,
        title: asString(proposal.payload.title) || proposal.title,
        description:
          proposal.payload.description === undefined
            ? undefined
            : (proposal.payload.description as string | null),
        notes:
          proposal.payload.notes === undefined
            ? undefined
            : (proposal.payload.notes as string | null),
        icon:
          proposal.payload.icon === undefined
            ? undefined
            : asString(proposal.payload.icon) || null,
        color:
          proposal.payload.color === undefined
            ? undefined
            : (proposal.payload.color as string | null),
      })
      return result.ok ? { ok: true } : { ok: false, message: result.message }
    }
    if (proposal.kind === "delete" && proposal.targetId) {
      const result = await deleteNodeAction({ roleId, nodeId: proposal.targetId })
      return result.ok ? { ok: true } : { ok: false, message: result.message }
    }
  }

  if (proposal.entity === "task") {
    const topicId =
      asString(proposal.payload.topicId) || proposal.parentId || ""
    if (proposal.kind === "create") {
      const result = await createChecklistItemAction({
        id: asString(proposal.payload.id) || proposal.targetId || undefined,
        roleId,
        nodeId: topicId,
        title: asString(proposal.payload.title) || proposal.title,
        description: asString(proposal.payload.description) || null,
      })
      return result.ok ? { ok: true } : { ok: false, message: result.message }
    }
    if (proposal.kind === "update" && proposal.targetId) {
      if (typeof proposal.payload.completed === "boolean") {
        const done = await setChecklistItemCompletedAction({
          roleId,
          nodeId: topicId,
          itemId: proposal.targetId,
          isCompleted: proposal.payload.completed,
        })
        if (!done.ok) {
          return { ok: false, message: done.message }
        }
      }
      if (proposal.payload.title || proposal.payload.description !== undefined) {
        const result = await updateChecklistItemAction({
          roleId,
          nodeId: topicId,
          itemId: proposal.targetId,
          title: asString(proposal.payload.title) || proposal.title,
          description:
            proposal.payload.description === undefined
              ? null
              : (proposal.payload.description as string | null),
        })
        return result.ok ? { ok: true } : { ok: false, message: result.message }
      }
      return { ok: true }
    }
    if (proposal.kind === "delete" && proposal.targetId) {
      const result = await deleteChecklistItemAction({
        roleId,
        nodeId: topicId,
        itemId: proposal.targetId,
      })
      return result.ok ? { ok: true } : { ok: false, message: result.message }
    }
  }

  if (proposal.entity === "link") {
    const topicId =
      proposal.payload.topicId === undefined
        ? proposal.parentId
        : (proposal.payload.topicId as string | null)
    if (proposal.kind === "create") {
      const result = await createNodeLinkAction({
        id: asString(proposal.payload.id) || proposal.targetId || undefined,
        roleId,
        nodeId: topicId,
        label: asString(proposal.payload.label) || proposal.title,
        url: asString(proposal.payload.url),
      })
      return result.ok ? { ok: true } : { ok: false, message: result.message }
    }
    if (proposal.kind === "update" && proposal.targetId) {
      const result = await updateNodeLinkAction({
        roleId,
        nodeId: topicId,
        linkId: proposal.targetId,
        label: asString(proposal.payload.label) || proposal.title,
        url: asString(proposal.payload.url),
      })
      return result.ok ? { ok: true } : { ok: false, message: result.message }
    }
    if (proposal.kind === "delete" && proposal.targetId) {
      const result = await deleteNodeLinkAction({
        roleId,
        nodeId: topicId,
        linkId: proposal.targetId,
      })
      return result.ok ? { ok: true } : { ok: false, message: result.message }
    }
  }

  if (proposal.entity === "roadmap" && proposal.kind === "update") {
    if (proposal.payload.notes !== undefined) {
      const notes =
        proposal.payload.notes === null
          ? null
          : asString(proposal.payload.notes) || null
      const result = await updateRoleNotesAction(roleId, notes)
      if (!result.ok) {
        return { ok: false, message: result.message }
      }
    }
    if (proposal.payload.description !== undefined) {
      const description =
        proposal.payload.description === null
          ? null
          : asString(proposal.payload.description) || null
      const result = await updateRoleDescriptionAction(roleId, description)
      if (!result.ok) {
        return { ok: false, message: result.message }
      }
    }
    return { ok: true }
  }

  return { ok: false, message: "That proposal cannot be applied." }
}
