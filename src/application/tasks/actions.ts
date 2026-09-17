"use server"

import { revalidatePath } from "next/cache"

import {
  createChecklistItem,
  deleteChecklistItem,
  reorderChecklistItems,
  setChecklistItemCompleted,
  updateChecklistItem,
} from "@/application/tasks/tasks-service"
import { ApplicationError, type ApplicationErrorCode } from "@/domain/errors"
import type { ChecklistItem } from "@/domain/tasks/types"
import { failAction } from "@/lib/errors/present"
import { requireSession } from "@/lib/auth/session"

export type TaskActionResult =
  | { ok: true; item: ChecklistItem }
  | { ok: true }
  | { ok: false; code: ApplicationErrorCode; message: string }

function fail(error: unknown): TaskActionResult {
  return failAction(error, "checklists.action_failed")
}

function revalidateRole(roleId: string) {
  revalidatePath(`/dashboard/roles/${roleId}`)
}

export async function createChecklistItemAction(input: {
  id?: string
  roleId: string
  nodeId: string
  title: string
  description?: string | null
}): Promise<TaskActionResult> {
  try {
    if (!input.roleId || !input.nodeId) {
      throw new ApplicationError("validation", "Select a topic first.")
    }

    const { applicationUser } = await requireSession()
    const item = await createChecklistItem(
      applicationUser.id,
      input.roleId,
      input.nodeId,
      input
    )
    revalidateRole(input.roleId)
    return { ok: true, item }
  } catch (error) {
    return fail(error)
  }
}

export async function updateChecklistItemAction(input: {
  roleId: string
  nodeId: string
  itemId: string
  title: string
  description?: string | null
}): Promise<TaskActionResult> {
  try {
    if (!input.roleId || !input.nodeId || !input.itemId) {
      throw new ApplicationError("validation", "Select a task first.")
    }

    const { applicationUser } = await requireSession()
    const item = await updateChecklistItem(
      applicationUser.id,
      input.roleId,
      input.nodeId,
      input.itemId,
      input
    )
    revalidateRole(input.roleId)
    return { ok: true, item }
  } catch (error) {
    return fail(error)
  }
}

export async function setChecklistItemCompletedAction(input: {
  roleId: string
  nodeId: string
  itemId: string
  isCompleted: boolean
}): Promise<TaskActionResult> {
  try {
    if (!input.roleId || !input.nodeId || !input.itemId) {
      throw new ApplicationError("validation", "Select a task first.")
    }

    const { applicationUser } = await requireSession()
    const item = await setChecklistItemCompleted(
      applicationUser.id,
      input.roleId,
      input.nodeId,
      input.itemId,
      input.isCompleted
    )
    revalidateRole(input.roleId)
    return { ok: true, item }
  } catch (error) {
    return fail(error)
  }
}

export async function reorderChecklistItemsAction(input: {
  roleId: string
  nodeId: string
  orderedIds: string[]
}): Promise<TaskActionResult> {
  try {
    if (!input.roleId || !input.nodeId) {
      throw new ApplicationError("validation", "Select a topic first.")
    }

    const { applicationUser } = await requireSession()
    await reorderChecklistItems(
      applicationUser.id,
      input.roleId,
      input.nodeId,
      input.orderedIds
    )
    revalidateRole(input.roleId)
    return { ok: true }
  } catch (error) {
    return fail(error)
  }
}

export async function deleteChecklistItemAction(input: {
  roleId: string
  nodeId: string
  itemId: string
}): Promise<TaskActionResult> {
  try {
    if (!input.roleId || !input.nodeId || !input.itemId) {
      throw new ApplicationError("validation", "Select a task first.")
    }

    const { applicationUser } = await requireSession()
    await deleteChecklistItem(
      applicationUser.id,
      input.roleId,
      input.nodeId,
      input.itemId
    )
    revalidateRole(input.roleId)
    return { ok: true }
  } catch (error) {
    return fail(error)
  }
}
