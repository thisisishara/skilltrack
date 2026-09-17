"use server"

import { revalidatePath } from "next/cache"

import {
  createNodeLink,
  deleteNodeLink,
  updateNodeLink,
} from "@/application/links/links-service"
import { fetchPublicPageTitle } from "@/application/links/page-title"
import { ApplicationError, type ApplicationErrorCode } from "@/domain/errors"
import type { NodeLink } from "@/domain/links/types"
import { auth } from "@/auth"
import { failAction } from "@/lib/errors/present"
import { requireSession } from "@/lib/auth/session"

export type LinkActionResult =
  | { ok: true; link: NodeLink }
  | { ok: true }
  | { ok: false; code: ApplicationErrorCode; message: string }

function fail(error: unknown): LinkActionResult {
  return failAction(error, "links.action_failed")
}

function revalidateRole(roleId: string) {
  revalidatePath(`/dashboard/roles/${roleId}`)
}

export async function previewLinkTitleAction(url: string): Promise<{ title: string | null }> {
  const session = await auth()
  if (!session?.user?.githubUsername) {
    return { title: null }
  }

  try {
    return { title: await fetchPublicPageTitle(url) }
  } catch {
    return { title: null }
  }
}

export async function createNodeLinkAction(input: {
  id?: string
  roleId: string
  nodeId?: string | null
  label: string
  url: string
}): Promise<LinkActionResult> {
  try {
    if (!input.roleId) {
      throw new ApplicationError("validation", "Select a role first.")
    }

    const { applicationUser } = await requireSession()
    const link = await createNodeLink(
      applicationUser.id,
      input.roleId,
      input.nodeId ?? null,
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
  nodeId?: string | null
  linkId: string
  label: string
  url: string
}): Promise<LinkActionResult> {
  try {
    if (!input.roleId || !input.linkId) {
      throw new ApplicationError("validation", "Select a link first.")
    }

    const { applicationUser } = await requireSession()
    const link = await updateNodeLink(
      applicationUser.id,
      input.roleId,
      input.nodeId ?? null,
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
  nodeId?: string | null
  linkId: string
}): Promise<LinkActionResult> {
  try {
    if (!input.roleId || !input.linkId) {
      throw new ApplicationError("validation", "Select a link first.")
    }

    const { applicationUser } = await requireSession()
    await deleteNodeLink(
      applicationUser.id,
      input.roleId,
      input.nodeId ?? null,
      input.linkId
    )
    revalidateRole(input.roleId)
    return { ok: true }
  } catch (error) {
    return fail(error)
  }
}
