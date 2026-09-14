import "server-only"

import { ApplicationError } from "@/domain/errors"
import {
  normalizeNodeHandleKind,
  type NodeHandleKind,
} from "@/domain/nodes/handle"
import { normalizeNodeKind, type NodeKind } from "@/domain/nodes/kind"
import { displayNodeTitle } from "@/domain/nodes/title"
import type { RoadmapNode } from "@/domain/nodes/types"
import type { Database } from "@/lib/supabase/database"
import { getSupabaseServerClient } from "@/lib/supabase/server"

type NodeRow = Database["public"]["Tables"]["roadmap_nodes"]["Row"]

function toNode(row: NodeRow): RoadmapNode {
  return {
    id: row.id,
    roleId: row.role_id,
    parentId: row.parent_id,
    kind: normalizeNodeKind(row.kind),
    title: row.title,
    description: row.description,
    notes: row.notes,
    icon: row.icon,
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
  console.error(
    JSON.stringify({
      event: "database.roadmap_nodes.failed",
      code: error?.code ?? null,
    })
  )
  throw new ApplicationError("database", "Could not update roadmap nodes.", {
    cause: error,
  })
}

export async function listByRoleId(roleId: string) {
  const supabase = getSupabaseServerClient()
  const { data, error } = await supabase
    .from("roadmap_nodes")
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
    .from("roadmap_nodes")
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
    .from("roadmap_nodes")
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

export async function updateDetails(
  roleId: string,
  nodeId: string,
  input: {
    title: string
    description: string | null
    icon: string
    notes?: string | null
    handleKind?: NodeHandleKind
    incomingEdgeAnimated?: boolean
  }
) {
  const supabase = getSupabaseServerClient()
  const { data, error } = await supabase
    .from("roadmap_nodes")
    .update({
      title: displayNodeTitle(input.title),
      description: input.description,
      icon: input.icon,
      ...(input.notes !== undefined ? { notes: input.notes } : {}),
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
    throw new ApplicationError("not_found", "That node no longer exists.")
  }

  return toNode(data)
}

export async function updatePosition(
  roleId: string,
  nodeId: string,
  positionX: number,
  positionY: number
) {
  const supabase = getSupabaseServerClient()
  const { data, error } = await supabase
    .from("roadmap_nodes")
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
    throw new ApplicationError("not_found", "That node no longer exists.")
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
    .from("roadmap_nodes")
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
    throw new ApplicationError("not_found", "That node no longer exists.")
  }

  return toNode(data)
}

export async function deleteForRole(roleId: string, nodeId: string) {
  const supabase = getSupabaseServerClient()
  const { data, error } = await supabase
    .from("roadmap_nodes")
    .delete()
    .eq("role_id", roleId)
    .eq("id", nodeId)
    .select("id")
    .maybeSingle()

  if (error) {
    throwFromSupabase(error)
  }

  if (!data) {
    throw new ApplicationError("not_found", "That node no longer exists.")
  }
}
