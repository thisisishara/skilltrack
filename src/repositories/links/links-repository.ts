import "server-only"

import { ApplicationError } from "@/domain/errors"
import { displayLinkLabel, normalizeLinkUrl } from "@/domain/links/url"
import type { NodeLink } from "@/domain/links/types"
import type { Database } from "@/lib/supabase/database"
import { getSupabaseServerClient } from "@/lib/supabase/server"

type LinkRow = Database["public"]["Tables"]["node_links"]["Row"]

function toLink(row: LinkRow): NodeLink {
  return {
    id: row.id,
    nodeId: row.node_id,
    label: row.label,
    url: row.url,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

function throwFromSupabase(error: { code?: string; message?: string } | null): never {
  console.error(
    JSON.stringify({
      event: "database.node_links.failed",
      code: error?.code ?? null,
    })
  )
  throw new ApplicationError("database", "Could not update node links.", {
    cause: error,
  })
}

export async function listByRoleId(roleId: string) {
  const supabase = getSupabaseServerClient()
  const { data, error } = await supabase
    .from("node_links")
    .select("*, roadmap_nodes!inner(role_id)")
    .eq("roadmap_nodes.role_id", roleId)
    .order("created_at", { ascending: true })

  if (error) {
    throwFromSupabase(error)
  }

  return (data ?? []).map((row) => toLink(row))
}

export async function insert(input: {
  id?: string
  nodeId: string
  label: string
  url: string
}) {
  const supabase = getSupabaseServerClient()
  const { data, error } = await supabase
    .from("node_links")
    .insert({
      ...(input.id ? { id: input.id } : {}),
      node_id: input.nodeId,
      label: displayLinkLabel(input.label),
      url: normalizeLinkUrl(input.url),
    })
    .select()
    .single()

  if (error || !data) {
    throwFromSupabase(error)
  }

  return toLink(data)
}

export async function update(
  nodeId: string,
  linkId: string,
  input: {
    label: string
    url: string
  }
) {
  const supabase = getSupabaseServerClient()
  const { data, error } = await supabase
    .from("node_links")
    .update({
      label: displayLinkLabel(input.label),
      url: normalizeLinkUrl(input.url),
    })
    .eq("node_id", nodeId)
    .eq("id", linkId)
    .select()
    .maybeSingle()

  if (error) {
    throwFromSupabase(error)
  }

  if (!data) {
    throw new ApplicationError("not_found", "That link no longer exists.")
  }

  return toLink(data)
}

export async function deleteForNode(nodeId: string, linkId: string) {
  const supabase = getSupabaseServerClient()
  const { data, error } = await supabase
    .from("node_links")
    .delete()
    .eq("node_id", nodeId)
    .eq("id", linkId)
    .select("id")
    .maybeSingle()

  if (error) {
    throwFromSupabase(error)
  }

  if (!data) {
    throw new ApplicationError("not_found", "That link no longer exists.")
  }
}
