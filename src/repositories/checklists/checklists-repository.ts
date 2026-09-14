import "server-only"

import { ApplicationError } from "@/domain/errors"
import { displayChecklistTitle } from "@/domain/checklists/title"
import type { ChecklistItem } from "@/domain/checklists/types"
import type { Database } from "@/lib/supabase/database"
import { getSupabaseServerClient } from "@/lib/supabase/server"

type ChecklistRow = Database["public"]["Tables"]["checklist_items"]["Row"]

function toItem(row: ChecklistRow): ChecklistItem {
  return {
    id: row.id,
    nodeId: row.node_id,
    title: row.title,
    description: row.description,
    isCompleted: row.is_completed,
    sortOrder: row.sort_order,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    completedAt: row.completed_at,
  }
}

function throwFromSupabase(error: { code?: string; message?: string } | null): never {
  console.error(
    JSON.stringify({
      event: "database.checklist_items.failed",
      code: error?.code ?? null,
    })
  )
  throw new ApplicationError("database", "Could not update checklist items.", {
    cause: error,
  })
}

export async function listByRoleId(roleId: string) {
  const supabase = getSupabaseServerClient()
  const { data, error } = await supabase
    .from("checklist_items")
    .select("*, roadmap_nodes!inner(role_id)")
    .eq("roadmap_nodes.role_id", roleId)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true })

  if (error) {
    throwFromSupabase(error)
  }

  return (data ?? []).map((row) => toItem(row))
}

export async function listByNodeId(nodeId: string) {
  const supabase = getSupabaseServerClient()
  const { data, error } = await supabase
    .from("checklist_items")
    .select()
    .eq("node_id", nodeId)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true })

  if (error) {
    throwFromSupabase(error)
  }

  return (data ?? []).map(toItem)
}

export async function insert(input: {
  nodeId: string
  title: string
  description: string | null
  sortOrder: number
}) {
  const supabase = getSupabaseServerClient()
  const { data, error } = await supabase
    .from("checklist_items")
    .insert({
      node_id: input.nodeId,
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

export async function updateDetails(
  nodeId: string,
  itemId: string,
  input: {
    title: string
    description: string | null
  }
) {
  const supabase = getSupabaseServerClient()
  const { data, error } = await supabase
    .from("checklist_items")
    .update({
      title: displayChecklistTitle(input.title),
      description: input.description,
    })
    .eq("node_id", nodeId)
    .eq("id", itemId)
    .select()
    .maybeSingle()

  if (error) {
    throwFromSupabase(error)
  }

  if (!data) {
    throw new ApplicationError("not_found", "That checklist item no longer exists.")
  }

  return toItem(data)
}

export async function setCompleted(
  nodeId: string,
  itemId: string,
  isCompleted: boolean,
  completedAt: string | null
) {
  const supabase = getSupabaseServerClient()
  const { data, error } = await supabase
    .from("checklist_items")
    .update({
      is_completed: isCompleted,
      completed_at: completedAt,
    })
    .eq("node_id", nodeId)
    .eq("id", itemId)
    .select()
    .maybeSingle()

  if (error) {
    throwFromSupabase(error)
  }

  if (!data) {
    throw new ApplicationError("not_found", "That checklist item no longer exists.")
  }

  return toItem(data)
}

export async function updateSortOrders(
  nodeId: string,
  orders: { id: string; sortOrder: number }[]
) {
  const supabase = getSupabaseServerClient()

  for (const order of orders) {
    const { error } = await supabase
      .from("checklist_items")
      .update({ sort_order: order.sortOrder })
      .eq("node_id", nodeId)
      .eq("id", order.id)

    if (error) {
      throwFromSupabase(error)
    }
  }
}

export async function deleteForNode(nodeId: string, itemId: string) {
  const supabase = getSupabaseServerClient()
  const { data, error } = await supabase
    .from("checklist_items")
    .delete()
    .eq("node_id", nodeId)
    .eq("id", itemId)
    .select("id")
    .maybeSingle()

  if (error) {
    throwFromSupabase(error)
  }

  if (!data) {
    throw new ApplicationError("not_found", "That checklist item no longer exists.")
  }
}
