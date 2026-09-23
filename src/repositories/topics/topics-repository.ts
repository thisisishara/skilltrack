import "server-only"

import { ApplicationError } from "@/domain/errors"
import { logEvent } from "@/lib/observability/log"
import {
  normalizeNodeHandleKind,
  type NodeHandleKind,
} from "@/domain/topics/handle"
import { normalizeNodeKind, type NodeKind } from "@/domain/topics/kind"
import { displayNodeTitle } from "@/domain/topics/title"
import type { RoadmapNode } from "@/domain/topics/types"
import type { Database } from "@/lib/supabase/database"
import { getSupabaseServerClient } from "@/lib/supabase/server"

type NodeRow = Database["public"]["Tables"]["topics"]["Row"]

function toNode(row: NodeRow): RoadmapNode {
  return {
    id: row.id,
    roleId: row.role_id,
    parentId: row.parent_id,
    kind: normalizeNodeKind(row.kind),
    title: row.title,
    description: row.description,
    icon: row.icon,
    color: row.color,
    handleKind: normalizeNodeHandleKind(row.handle_kind),
    incomingEdgeAnimated: Boolean(row.incoming_edge_animated),
    positionX: row.position_x,
    positionY: row.position_y,
    sortOrder: row.sort_order,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

function throwFromSupabase(error: { code?: string; message?: string } | null): never {
  logEvent("error", "database.topics.failed", {
    code: error?.code ?? null,
  })
  throw new ApplicationError("database", "Could not update topics.", {
    cause: error,
  })
}

export async function listByRoleId(roleId: string) {
  const supabase = getSupabaseServerClient()
  const { data, error } = await supabase
    .from("topics")
    .select()
    .eq("role_id", roleId)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true })

  if (error) {
    throwFromSupabase(error)
  }

  return (data ?? []).map(toNode)
}

export async function getByIdForRole(roleId: string, nodeId: string) {
  const supabase = getSupabaseServerClient()
  const { data, error } = await supabase
    .from("topics")
    .select()
    .eq("role_id", roleId)
    .eq("id", nodeId)
    .maybeSingle()

  if (error) {
    throwFromSupabase(error)
  }

  return data ? toNode(data) : null
}

export async function insert(input: {
  id?: string
  roleId: string
  parentId: string | null
  kind: NodeKind
  title: string
  description: string | null
  icon: string
  handleKind: NodeHandleKind
  incomingEdgeAnimated: boolean
  positionX: number
  positionY: number
  sortOrder: number
}) {
  const supabase = getSupabaseServerClient()
  const { data, error } = await supabase
    .from("topics")
    .insert({
      ...(input.id ? { id: input.id } : {}),
      role_id: input.roleId,
      parent_id: input.parentId,
      kind: input.kind,
      title: displayNodeTitle(input.title),
      description: input.description,
      icon: input.icon,
      handle_kind: input.handleKind,
      incoming_edge_animated: input.incomingEdgeAnimated,
      position_x: input.positionX,
      position_y: input.positionY,
      sort_order: input.sortOrder,
    })
    .select()
    .single()

  if (error || !data) {
    throwFromSupabase(error)
  }

  return toNode(data)
}

export async function insertMany(
  rows: {
    id: string
    roleId: string
    parentId: string | null
    kind: NodeKind
    title: string
    description: string | null
    icon: string
    color: string | null
    handleKind: NodeHandleKind
    incomingEdgeAnimated: boolean
    positionX: number
    positionY: number
    sortOrder: number
  }[]
) {
  if (rows.length === 0) {
    return []
  }

  const supabase = getSupabaseServerClient()
  const { data, error } = await supabase
    .from("topics")
    .insert(
      rows.map((row) => ({
        id: row.id,
        role_id: row.roleId,
        parent_id: row.parentId,
        kind: row.kind,
        title: displayNodeTitle(row.title),
        description: row.description,
        icon: row.icon,
        color: row.color,
        handle_kind: row.handleKind,
        incoming_edge_animated: row.incomingEdgeAnimated,
        position_x: row.positionX,
        position_y: row.positionY,
        sort_order: row.sortOrder,
      }))
    )
    .select()

  if (error) {
    throwFromSupabase(error)
  }

  return (data ?? []).map(toNode)
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
      .from("topics")
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

export async function deleteAllForRole(roleId: string) {
  const supabase = getSupabaseServerClient()
  const { error } = await supabase.from("topics").delete().eq("role_id", roleId)

  if (error) {
    throwFromSupabase(error)
  }
}

export async function updateDetails(
  roleId: string,
  nodeId: string,
  input: {
    title: string
    description: string | null
    icon: string
    color?: string | null
    handleKind?: NodeHandleKind
    incomingEdgeAnimated?: boolean
  }
) {
  const supabase = getSupabaseServerClient()
  const { data, error } = await supabase
    .from("topics")
    .update({
      title: displayNodeTitle(input.title),
      description: input.description,
      icon: input.icon,
      ...(input.color !== undefined ? { color: input.color } : {}),
      ...(input.handleKind !== undefined ? { handle_kind: input.handleKind } : {}),
      ...(input.incomingEdgeAnimated !== undefined
        ? { incoming_edge_animated: input.incomingEdgeAnimated }
        : {}),
    })
    .eq("role_id", roleId)
    .eq("id", nodeId)
    .select()
    .maybeSingle()

  if (error) {
    throwFromSupabase(error)
  }

  if (!data) {
    throw new ApplicationError("not_found", "That topic no longer exists.")
  }

  return toNode(data)
}

export async function updateAccentColors(
  roleId: string,
  updates: { id: string; color: string | null }[]
) {
  if (updates.length === 0) {
    return
  }

  await Promise.all(
    updates.map(async (update) => {
      const supabase = getSupabaseServerClient()
      const { error } = await supabase
        .from("topics")
        .update({ color: update.color })
        .eq("role_id", roleId)
        .eq("id", update.id)

      if (error) {
        throwFromSupabase(error)
      }
    })
  )
}

export async function updatePosition(
  roleId: string,
  nodeId: string,
  positionX: number,
  positionY: number
) {
  const supabase = getSupabaseServerClient()
  const { data, error } = await supabase
    .from("topics")
    .update({
      position_x: positionX,
      position_y: positionY,
    })
    .eq("role_id", roleId)
    .eq("id", nodeId)
    .select()
    .maybeSingle()

  if (error) {
    throwFromSupabase(error)
  }

  if (!data) {
    throw new ApplicationError("not_found", "That topic no longer exists.")
  }

  return toNode(data)
}

export async function updateParent(
  roleId: string,
  nodeId: string,
  parentId: string | null,
  sortOrder: number
) {
  const supabase = getSupabaseServerClient()
  const { data, error } = await supabase
    .from("topics")
    .update({
      parent_id: parentId,
      sort_order: sortOrder,
    })
    .eq("role_id", roleId)
    .eq("id", nodeId)
    .select()
    .maybeSingle()

  if (error) {
    throwFromSupabase(error)
  }

  if (!data) {
    throw new ApplicationError("not_found", "That topic no longer exists.")
  }

  return toNode(data)
}

export async function updatePlacements(
  roleId: string,
  updates: { id: string; parentId: string | null; sortOrder: number }[]
) {
  if (updates.length === 0) {
    return
  }

  await Promise.all(
    updates.map((update) => updateParent(roleId, update.id, update.parentId, update.sortOrder))
  )
}

export async function deleteForRole(roleId: string, nodeId: string) {
  const supabase = getSupabaseServerClient()
  const { data, error } = await supabase
    .from("topics")
    .delete()
    .eq("role_id", roleId)
    .eq("id", nodeId)
    .select("id")
    .maybeSingle()

  if (error) {
    throwFromSupabase(error)
  }

  if (!data) {
    throw new ApplicationError("not_found", "That topic no longer exists.")
  }
}
