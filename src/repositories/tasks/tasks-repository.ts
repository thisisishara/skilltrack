import "server-only"

import { ApplicationError } from "@/domain/errors"
import { displayChecklistTitle } from "@/domain/tasks/title"
import type { Task } from "@/domain/tasks/types"
import type { Database } from "@/lib/supabase/database"
import { getSupabaseServerClient } from "@/lib/supabase/server"
import { logEvent } from "@/lib/observability/log"

type TaskRow = Database["public"]["Tables"]["tasks"]["Row"]

function toItem(row: TaskRow): Task {
  return {
    id: row.id,
    topicId: row.topic_id,
    title: row.title,
    description: row.description,
    completed: row.completed,
    sortOrder: row.sort_order,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    completedAt: row.completed_at,
  }
}

function throwFromSupabase(error: { code?: string; message?: string } | null): never {
  logEvent("error", "database.tasks.failed", {
    code: error?.code ?? null,
  })
  throw new ApplicationError("database", "Could not update tasks.", {
    cause: error,
  })
}

export async function listByRoleId(roleId: string) {
  const supabase = getSupabaseServerClient()
  const { data, error } = await supabase
    .from("tasks")
    .select("*, topics!inner(role_id)")
    .eq("topics.role_id", roleId)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true })

  if (error) {
    throwFromSupabase(error)
  }

  return (data ?? []).map((row) => toItem(row))
}

export async function listByTopicId(topicId: string) {
  const supabase = getSupabaseServerClient()
  const { data, error } = await supabase
    .from("tasks")
    .select()
    .eq("topic_id", topicId)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true })

  if (error) {
    throwFromSupabase(error)
  }

  return (data ?? []).map(toItem)
}

/** @deprecated Use listByTopicId */
export const listByNodeId = listByTopicId

export async function insert(input: {
  id?: string
  topicId: string
  title: string
  description: string | null
  sortOrder: number
}) {
  const supabase = getSupabaseServerClient()
  const { data, error } = await supabase
    .from("tasks")
    .insert({
      ...(input.id ? { id: input.id } : {}),
      topic_id: input.topicId,
      title: displayChecklistTitle(input.title),
      description: input.description,
      sort_order: input.sortOrder,
    })
    .select()
    .single()

  if (error || !data) {
    throwFromSupabase(error)
  }

  return toItem(data)
}

export async function insertMany(
  rows: {
    id: string
    topicId: string
    title: string
    description: string | null
    sortOrder: number
    completed: boolean
    completedAt: string | null
  }[]
) {
  if (rows.length === 0) {
    return []
  }

  const supabase = getSupabaseServerClient()
  const { data, error } = await supabase
    .from("tasks")
    .insert(
      rows.map((row) => ({
        id: row.id,
        topic_id: row.topicId,
        title: displayChecklistTitle(row.title),
        description: row.description,
        sort_order: row.sortOrder,
        completed: row.completed,
        completed_at: row.completedAt,
      }))
    )
    .select()

  if (error) {
    throwFromSupabase(error)
  }

  return (data ?? []).map(toItem)
}

export async function listExistingIds(ids: string[]) {
  const found = new Set<string>()
  if (ids.length === 0) {
    return found
  }

  const supabase = getSupabaseServerClient()
  for (let index = 0; index < ids.length; index += 100) {
    const chunk = ids.slice(index, index + 100)
    const { data, error } = await supabase.from("tasks").select("id").in("id", chunk)
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
  itemId: string,
  input: {
    title: string
    description: string | null
  }
) {
  const supabase = getSupabaseServerClient()
  const { data, error } = await supabase
    .from("tasks")
    .update({
      title: displayChecklistTitle(input.title),
      description: input.description,
    })
    .eq("topic_id", topicId)
    .eq("id", itemId)
    .select()
    .maybeSingle()

  if (error) {
    throwFromSupabase(error)
  }

  if (!data) {
    throw new ApplicationError("not_found", "That task no longer exists.")
  }

  return toItem(data)
}

export async function setCompleted(
  topicId: string,
  itemId: string,
  completed: boolean,
  completedAt: string | null
) {
  const supabase = getSupabaseServerClient()
  const { data, error } = await supabase
    .from("tasks")
    .update({
      completed,
      completed_at: completedAt,
    })
    .eq("topic_id", topicId)
    .eq("id", itemId)
    .select()
    .maybeSingle()

  if (error) {
    throwFromSupabase(error)
  }

  if (!data) {
    throw new ApplicationError("not_found", "That task no longer exists.")
  }

  return toItem(data)
}

export async function updateSortOrders(
  topicId: string,
  orders: { id: string; sortOrder: number }[]
) {
  const supabase = getSupabaseServerClient()

  for (const order of orders) {
    const { error } = await supabase
      .from("tasks")
      .update({ sort_order: order.sortOrder })
      .eq("topic_id", topicId)
      .eq("id", order.id)

    if (error) {
      throwFromSupabase(error)
    }
  }
}

export async function deleteForTopic(topicId: string, itemId: string) {
  const supabase = getSupabaseServerClient()
  const { data, error } = await supabase
    .from("tasks")
    .delete()
    .eq("topic_id", topicId)
    .eq("id", itemId)
    .select("id")
    .maybeSingle()

  if (error) {
    throwFromSupabase(error)
  }

  if (!data) {
    throw new ApplicationError("not_found", "That task no longer exists.")
  }
}

/** @deprecated Use deleteForTopic */
export const deleteForNode = deleteForTopic
