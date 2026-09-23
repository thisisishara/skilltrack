"use server"

import { revalidatePath } from "next/cache"

import {
  createTopicNote,
  deleteTopicNote,
  updateTopicNote,
} from "@/application/notes/notes-service"
import { ApplicationError, type ApplicationErrorCode } from "@/domain/errors"
import type { TopicNote } from "@/domain/notes/types"
import { failAction } from "@/lib/errors/present"
import { requireApprovedSession } from "@/lib/auth/session"

export type NoteActionResult =
  | { ok: true; note: TopicNote }
  | { ok: true }
  | { ok: false; code: ApplicationErrorCode; message: string }

function fail(error: unknown): NoteActionResult {
  return failAction(error, "notes.action_failed")
}

function revalidateRole(roleId: string) {
  revalidatePath(`/dashboard/roles/${roleId}`)
}

export async function createTopicNoteAction(input: {
  id?: string
  roleId: string
  topicId: string
  title: string
  body?: string | null
}): Promise<NoteActionResult> {
  try {
    if (!input.roleId || !input.topicId) {
      throw new ApplicationError("validation", "Select a topic first.")
    }

    const { applicationUser } = await requireApprovedSession()
    const note = await createTopicNote(
      applicationUser.id,
      input.roleId,
      input.topicId,
      input
    )
    revalidateRole(input.roleId)
    return { ok: true, note }
  } catch (error) {
    return fail(error)
  }
}

export async function updateTopicNoteAction(input: {
  roleId: string
  topicId: string
  noteId: string
  title: string
  body: string
}): Promise<NoteActionResult> {
  try {
    if (!input.roleId || !input.topicId || !input.noteId) {
      throw new ApplicationError("validation", "Select a note first.")
    }

    const { applicationUser } = await requireApprovedSession()
    const note = await updateTopicNote(
      applicationUser.id,
      input.roleId,
      input.topicId,
      input.noteId,
      input
    )
    revalidateRole(input.roleId)
    return { ok: true, note }
  } catch (error) {
    return fail(error)
  }
}

export async function deleteTopicNoteAction(input: {
  roleId: string
  topicId: string
  noteId: string
}): Promise<NoteActionResult> {
  try {
    if (!input.roleId || !input.topicId || !input.noteId) {
      throw new ApplicationError("validation", "Select a note first.")
    }

    const { applicationUser } = await requireApprovedSession()
    await deleteTopicNote(
      applicationUser.id,
      input.roleId,
      input.topicId,
      input.noteId
    )
    revalidateRole(input.roleId)
    return { ok: true }
  } catch (error) {
    return fail(error)
  }
}
