"use server"

import { revalidatePath } from "next/cache"

import {
  createNodeLink,
  deleteNodeLink,
  updateNodeLink,
} from "@/application/links/links-service"
import {
  ApplicationError,
  type ApplicationErrorCode,
  isApplicationError,
} from "@/domain/errors"
import type { NodeLink } from "@/domain/links/types"
import { requireSession } from "@/lib/auth/session"

export type LinkActionResult =
  | { ok: true; link: NodeLink }
  | { ok: true }
  | { ok: false; code: ApplicationErrorCode; message: string }

function fail(error: unknown): LinkActionResult {
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

export async function createNodeLinkAction(input: {
  roleId: string
  nodeId: string
  label: string
  url: string
}): Promise<LinkActionResult> {
  try {
    if (!input.roleId || !input.nodeId) {
      throw new ApplicationError("validation", "Select a node first.")
    }

    const { applicationUser } = await requireSession()
    const link = await createNodeLink(
      applicationUser.id,
      input.roleId,
      input.nodeId,
      input
    )
    revalidateRole(input.roleId)
    return { ok: true, link }
  } catch (error) {
    return fail(error)
  }
}

export async function updateNodeLinkAction(input: {
  roleId: string
  nodeId: string
  linkId: string
  label: string
  url: string
}): Promise<LinkActionResult> {
  try {
    if (!input.roleId || !input.nodeId || !input.linkId) {
      throw new ApplicationError("validation", "Select a link first.")
    }

    const { applicationUser } = await requireSession()
    const link = await updateNodeLink(
      applicationUser.id,
      input.roleId,
      input.nodeId,
      input.linkId,
      input
    )
    revalidateRole(input.roleId)
    return { ok: true, link }
  } catch (error) {
    return fail(error)
  }
}

export async function deleteNodeLinkAction(input: {
  roleId: string
  nodeId: string
  linkId: string
}): Promise<LinkActionResult> {
  try {
    if (!input.roleId || !input.nodeId || !input.linkId) {
      throw new ApplicationError("validation", "Select a link first.")
    }

    const { applicationUser } = await requireSession()
    await deleteNodeLink(
      applicationUser.id,
      input.roleId,
      input.nodeId,
      input.linkId
    )
    revalidateRole(input.roleId)
    return { ok: true }
  } catch (error) {
    return fail(error)
  }
}
