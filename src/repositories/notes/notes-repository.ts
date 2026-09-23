import "server-only"

import { ApplicationError } from "@/domain/errors"
import { displayNoteTitle } from "@/domain/notes/title"
import type { TopicNote } from "@/domain/notes/types"
import type { Database } from "@/lib/supabase/database"
import { getSupabaseServerClient } from "@/lib/supabase/server"
import { logEvent } from "@/lib/observability/log"

type NoteRow = Database["public"]["Tables"]["topic_notes"]["Row"]

function toNote(row: NoteRow): TopicNote {
  return {
    id: row.id,
    topicId: row.topic_id,
    title: row.title,
    body: row.body,
    sortOrder: row.sort_order,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

function throwFromSupabase(error: { code?: string; message?: string } | null): never {
  logEvent("error", "database.notes.failed", {
    code: error?.code ?? null,
  })
  throw new ApplicationError("database", "Could not update notes.", {
    cause: error,
  })
}

export async function listByRoleId(roleId: string) {
  const supabase = getSupabaseServerClient()
  const { data, error } = await supabase
    .from("topic_notes")
    .select("*, topics!inner(role_id)")
    .eq("topics.role_id", roleId)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true })

  if (error) {
    throwFromSupabase(error)
  }

  return (data ?? []).map((row) => toNote(row))
}

export async function listByTopicId(topicId: string) {
  const supabase = getSupabaseServerClient()
  const { data, error } = await supabase
    .from("topic_notes")
    .select()
    .eq("topic_id", topicId)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true })

  if (error) {
    throwFromSupabase(error)
  }

  return (data ?? []).map(toNote)
}

export async function insert(input: {
  id?: string
  topicId: string
  title: string
  body: string
  sortOrder: number
}) {
  const supabase = getSupabaseServerClient()
  const { data, error } = await supabase
    .from("topic_notes")
    .insert({
      ...(input.id ? { id: input.id } : {}),
      topic_id: input.topicId,
      title: displayNoteTitle(input.title),
      body: input.body,
      sort_order: input.sortOrder,
    })
    .select()
    .single()

  if (error || !data) {
    throwFromSupabase(error)
  }

  return toNote(data)
}

export async function insertMany(
  rows: {
    id: string
    topicId: string
    title: string
    body: string
    sortOrder: number
  }[]
) {
  if (rows.length === 0) {
    return []
  }

  const supabase = getSupabaseServerClient()
  const { data, error } = await supabase
    .from("topic_notes")
    .insert(
      rows.map((row) => ({
        id: row.id,
        topic_id: row.topicId,
        title: displayNoteTitle(row.title),
        body: row.body,
        sort_order: row.sortOrder,
      }))
    )
    .select()

  if (error) {
    throwFromSupabase(error)
  }

  return (data ?? []).map(toNote)
}

export async function listExistingIds(ids: string[]) {
  const found = new Set<string>()
  if (ids.length === 0) {
    return found
  }

  const supabase = getSupabaseServerClient()
  for (let index = 0; index < ids.length; index += 100) {
    const chunk = ids.slice(index, index + 100)
    const { data, error } = await supabase
      .from("topic_notes")
      .select("id")
      .in("id", chunk)
    if (error) {
      throwFromSupabase(error)
    }
    for (const row of data ?? []) {
      found.add(row.id)
    }
  }

  return found
}

export async function updateDetails(
  topicId: string,
  noteId: string,
  input: {
    title: string
    body: string
  }
) {
  const supabase = getSupabaseServerClient()
  const { data, error } = await supabase
    .from("topic_notes")
    .update({
      title: displayNoteTitle(input.title),
      body: input.body,
    })
    .eq("topic_id", topicId)
    .eq("id", noteId)
    .select()
    .maybeSingle()

  if (error) {
    throwFromSupabase(error)
  }

  if (!data) {
    throw new ApplicationError("not_found", "That note no longer exists.")
  }

  return toNote(data)
}

export async function deleteForTopic(topicId: string, noteId: string) {
  const supabase = getSupabaseServerClient()
  const { data, error } = await supabase
    .from("topic_notes")
    .delete()
    .eq("topic_id", topicId)
    .eq("id", noteId)
    .select("id")
    .maybeSingle()

  if (error) {
    throwFromSupabase(error)
  }

  if (!data) {
    throw new ApplicationError("not_found", "That note no longer exists.")
  }
}
