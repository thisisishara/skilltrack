"use server"

import { revalidatePath } from "next/cache"

import {
  clearRoadmap,
  createNode,
  deleteNode,
  moveNode,
  placeNode,
  placeNodeAtRoot,
  reparentNode,
  updateNodeDetails,
} from "@/application/topics/topics-service"
import { ApplicationError, type ApplicationErrorCode } from "@/domain/errors"
import type { RoadmapNode } from "@/domain/topics/types"
import { failAction } from "@/lib/errors/present"
import { requireApprovedSession } from "@/lib/auth/session"

export type TopicActionResult =
  | { ok: true; node: RoadmapNode }
  | { ok: true; deletedNodeId: string }
  | { ok: true }
  | { ok: false; code: ApplicationErrorCode; message: string }

function fail(error: unknown): TopicActionResult {
  return failAction(error, "nodes.action_failed")
}

function revalidateRole(roleId: string) {
  revalidatePath(`/dashboard/roles/${roleId}`)
}

export async function createNodeAction(input: {
  id?: string
  roleId: string
  parentId: string | null
  kind?: string | null
  title: string
  description?: string | null
  icon?: string | null
  handleKind?: string | null
  incomingEdgeAnimated?: boolean
  positionX?: number
  positionY?: number
}): Promise<TopicActionResult> {
  try {
    if (!input.roleId) {
      throw new ApplicationError("validation", "Select a role first.")
    }

    const { applicationUser } = await requireApprovedSession()
    const node = await createNode(applicationUser.id, input)
    revalidateRole(input.roleId)
    return { ok: true, node }
  } catch (error) {
    return fail(error)
  }
}

export async function updateNodeAction(input: {
  roleId: string
  nodeId: string
  title: string
  description?: string | null
  icon?: string | null
  notes?: string | null
  accentColor?: string | null
  color?: string | null
  nestedAccents?: "keep" | "apply"
  handleKind?: string | null
  incomingEdgeAnimated?: boolean
}): Promise<TopicActionResult> {
  try {
    if (!input.roleId || !input.nodeId) {
      throw new ApplicationError("validation", "Select a topic first.")
    }

    const { applicationUser } = await requireApprovedSession()
    const node = await updateNodeDetails(
      applicationUser.id,
      input.roleId,
      input.nodeId,
      input
    )
    revalidateRole(input.roleId)
    return { ok: true, node }
  } catch (error) {
    return fail(error)
  }
}

export async function moveNodeAction(input: {
  roleId: string
  nodeId: string
  positionX: number
  positionY: number
}): Promise<TopicActionResult> {
  try {
    if (!input.roleId || !input.nodeId) {
      throw new ApplicationError("validation", "Select a topic first.")
    }

    const { applicationUser } = await requireApprovedSession()
    const node = await moveNode(
      applicationUser.id,
      input.roleId,
      input.nodeId,
      input.positionX,
      input.positionY
    )
    revalidateRole(input.roleId)
    return { ok: true, node }
  } catch (error) {
    return fail(error)
  }
}

export async function reparentNodeAction(input: {
  roleId: string
  nodeId: string
  parentId: string | null
}): Promise<TopicActionResult> {
  try {
    if (!input.roleId || !input.nodeId) {
      throw new ApplicationError("validation", "Select a topic first.")
    }

    const { applicationUser } = await requireApprovedSession()
    const node = await reparentNode(
      applicationUser.id,
      input.roleId,
      input.nodeId,
      input.parentId
    )
    revalidateRole(input.roleId)
    return { ok: true, node }
  } catch (error) {
    return fail(error)
  }
}

export async function placeNodeAction(input: {
  roleId: string
  nodeId: string
  targetId: string
  position: "before" | "after" | "inside"
}): Promise<TopicActionResult> {
  try {
    if (!input.roleId || !input.nodeId || !input.targetId) {
      throw new ApplicationError("validation", "Select a topic first.")
    }

    const { applicationUser } = await requireApprovedSession()
    const node = await placeNode(
      applicationUser.id,
      input.roleId,
      input.nodeId,
      input.targetId,
      input.position
    )
    revalidateRole(input.roleId)
    return { ok: true, node }
  } catch (error) {
    return fail(error)
  }
}

export async function placeNodeAtRootAction(input: {
  roleId: string
  nodeId: string
}): Promise<TopicActionResult> {
  try {
    if (!input.roleId || !input.nodeId) {
      throw new ApplicationError("validation", "Select a topic first.")
    }

    const { applicationUser } = await requireApprovedSession()
    const node = await placeNodeAtRoot(
      applicationUser.id,
      input.roleId,
      input.nodeId
    )
    revalidateRole(input.roleId)
    return { ok: true, node }
  } catch (error) {
    return fail(error)
  }
}

export async function deleteNodeAction(input: {
  roleId: string
  nodeId: string
}): Promise<TopicActionResult> {
  try {
    if (!input.roleId || !input.nodeId) {
      throw new ApplicationError("validation", "Select a topic first.")
    }

    const { applicationUser } = await requireApprovedSession()
    await deleteNode(applicationUser.id, input.roleId, input.nodeId)
    revalidateRole(input.roleId)
    return { ok: true, deletedNodeId: input.nodeId }
  } catch (error) {
    return fail(error)
  }
}

export async function clearRoadmapAction(input: {
  roleId: string
}): Promise<TopicActionResult> {
  try {
    if (!input.roleId) {
      throw new ApplicationError("validation", "Select a role first.")
    }

    const { applicationUser } = await requireApprovedSession()
    await clearRoadmap(applicationUser.id, input.roleId)
    revalidateRole(input.roleId)
    return { ok: true }
  } catch (error) {
    return fail(error)
  }
}
