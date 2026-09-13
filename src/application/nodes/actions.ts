"use server"

import { revalidatePath } from "next/cache"

import {
  createNode,
  deleteNode,
  moveNode,
  reparentNode,
  updateNodeDetails,
} from "@/application/nodes/nodes-service"
import {
  ApplicationError,
  type ApplicationErrorCode,
  isApplicationError,
} from "@/domain/errors"
import type { RoadmapNode } from "@/domain/nodes/types"
import { requireSession } from "@/lib/auth/session"

export type NodeActionResult =
  | { ok: true; node: RoadmapNode }
  | { ok: true; deletedNodeId: string }
  | { ok: false; code: ApplicationErrorCode; message: string }

function fail(error: unknown): NodeActionResult {
  if (isApplicationError(error)) {
    return { ok: false, code: error.code, message: error.message }
  }

  return {
    ok: false,
    code: "unexpected",
    message: "Something went wrong. Try again.",
  }
}

function revalidateRole(roleId: string) {
  revalidatePath(`/dashboard/roles/${roleId}`)
}

export async function createNodeAction(input: {
  roleId: string
  parentId: string | null
  title: string
  description?: string | null
  icon?: string | null
}): Promise<NodeActionResult> {
  try {
    if (!input.roleId) {
      throw new ApplicationError("validation", "Select a role first.")
    }

    const { applicationUser } = await requireSession()
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
}): Promise<NodeActionResult> {
  try {
    if (!input.roleId || !input.nodeId) {
      throw new ApplicationError("validation", "Select a node first.")
    }

    const { applicationUser } = await requireSession()
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
}): Promise<NodeActionResult> {
  try {
    if (!input.roleId || !input.nodeId) {
      throw new ApplicationError("validation", "Select a node first.")
    }

    const { applicationUser } = await requireSession()
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
}): Promise<NodeActionResult> {
  try {
    if (!input.roleId || !input.nodeId) {
      throw new ApplicationError("validation", "Select a node first.")
    }

    const { applicationUser } = await requireSession()
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

export async function deleteNodeAction(input: {
  roleId: string
  nodeId: string
}): Promise<NodeActionResult> {
  try {
    if (!input.roleId || !input.nodeId) {
      throw new ApplicationError("validation", "Select a node first.")
    }

    const { applicationUser } = await requireSession()
    await deleteNode(applicationUser.id, input.roleId, input.nodeId)
    revalidateRole(input.roleId)
    return { ok: true, deletedNodeId: input.nodeId }
  } catch (error) {
    return fail(error)
  }
}
