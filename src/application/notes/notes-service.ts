import "server-only"

import { requireOwnedNode } from "@/application/topics/topics-service"
import { getRoleForUser } from "@/application/roles/roles-service"
import { ApplicationError } from "@/domain/errors"
import { displayNoteTitle } from "@/domain/notes/title"
import { isLabelNode } from "@/domain/topics/kind"
import * as notesRepository from "@/repositories/notes/notes-repository"

function requireTitle(title: string) {
  const trimmed = displayNoteTitle(title)
  if (!trimmed) {
    throw new ApplicationError("validation", "Note title cannot be empty.")
  }
  return trimmed
}

export async function listNotesForRole(userId: string, roleId: string) {
  const role = await getRoleForUser(userId, roleId)
  if (!role) {
    throw new ApplicationError("not_found", "That role no longer exists.")
  }
  return notesRepository.listByRoleId(roleId)
}

export async function createTopicNote(
  userId: string,
  roleId: string,
  topicId: string,
  input: {
    id?: string
    title: string
    body?: string | null
  }
) {
  const node = await requireOwnedNode(userId, roleId, topicId)
  if (isLabelNode(node)) {
    throw new ApplicationError("validation", "Labels cannot have notes.")
  }

  const notes = await notesRepository.listByTopicId(topicId)
  const sortOrder =
    notes.length === 0 ? 0 : Math.max(...notes.map((note) => note.sortOrder)) + 1

  return notesRepository.insert({
    id: input.id,
    topicId,
    title: requireTitle(input.title),
    body: input.body ?? "",
    sortOrder,
  })
}

export async function updateTopicNote(
  userId: string,
  roleId: string,
  topicId: string,
  noteId: string,
  input: {
    title: string
    body: string
  }
) {
  await requireOwnedNode(userId, roleId, topicId)
  return notesRepository.updateDetails(topicId, noteId, {
    title: requireTitle(input.title),
    body: input.body,
  })
}

export async function deleteTopicNote(
  userId: string,
  roleId: string,
  topicId: string,
  noteId: string
) {
  await requireOwnedNode(userId, roleId, topicId)
  await notesRepository.deleteForTopic(topicId, noteId)
}
