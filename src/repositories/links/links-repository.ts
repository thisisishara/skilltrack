import "server-only"

import { ApplicationError } from "@/domain/errors"
import { displayLinkLabel, normalizeLinkUrl } from "@/domain/links/url"
import type { Link } from "@/domain/links/types"
import type { Database } from "@/lib/supabase/database"
import { getSupabaseServerClient } from "@/lib/supabase/server"
import { logEvent } from "@/lib/observability/log"

type LinkRow = Database["public"]["Tables"]["links"]["Row"]

function toLink(row: LinkRow): Link {
  return {
    id: row.id,
    roleId: row.role_id,
    topicId: row.topic_id,
    label: row.label,
    url: row.url,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

function throwFromSupabase(error: { code?: string; message?: string } | null): never {
  logEvent("error", "database.links.failed", {
    code: error?.code ?? null,
  })
  throw new ApplicationError("database", "Could not update links.", {
    cause: error,
  })
}

export async function listByRoleId(roleId: string) {
  const supabase = getSupabaseServerClient()
  const { data, error } = await supabase
    .from("links")
    .select()
    .eq("role_id", roleId)
    .order("created_at", { ascending: true })

  if (error) {
    throwFromSupabase(error)
  }

  return (data ?? []).map(toLink)
}

export async function insert(input: {
  id?: string
  roleId: string
  topicId: string | null
  label: string
  url: string
}) {
  const supabase = getSupabaseServerClient()
  const { data, error } = await supabase
    .from("links")
    .insert({
      ...(input.id ? { id: input.id } : {}),
      role_id: input.roleId,
      topic_id: input.topicId,
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

export async function insertMany(
  rows: {
    id: string
    roleId: string
    topicId: string | null
    label: string
    url: string
  }[]
) {
  if (rows.length === 0) {
    return []
  }

  const supabase = getSupabaseServerClient()
  const { data, error } = await supabase
    .from("links")
    .insert(
      rows.map((row) => ({
        id: row.id,
        role_id: row.roleId,
        topic_id: row.topicId,
        label: displayLinkLabel(row.label),
        url: normalizeLinkUrl(row.url),
      }))
    )
    .select()

  if (error) {
    throwFromSupabase(error)
  }

  return (data ?? []).map(toLink)
}

export async function listExistingIds(ids: string[]) {
  const found = new Set<string>()
  if (ids.length === 0) {
    return found
  }

  const supabase = getSupabaseServerClient()
  for (let index = 0; index < ids.length; index += 100) {
    const chunk = ids.slice(index, index + 100)
    const { data, error } = await supabase.from("links").select("id").in("id", chunk)
    if (error) {
      throwFromSupabase(error)
    }
    for (const row of data ?? []) {
      found.add(row.id)
    }
  }

  return found
}

export async function update(
  roleId: string,
  topicId: string | null,
  linkId: string,
  input: {
    label: string
    url: string
  }
) {
  const supabase = getSupabaseServerClient()
  let query = supabase
    .from("links")
    .update({
      label: displayLinkLabel(input.label),
      url: normalizeLinkUrl(input.url),
    })
    .eq("role_id", roleId)
    .eq("id", linkId)

  query = topicId === null ? query.is("topic_id", null) : query.eq("topic_id", topicId)

  const { data, error } = await query.select().maybeSingle()

  if (error) {
    throwFromSupabase(error)
  }

  if (!data) {
    throw new ApplicationError("not_found", "That link no longer exists.")
  }

  return toLink(data)
}

export async function deleteLink(roleId: string, topicId: string | null, linkId: string) {
  const supabase = getSupabaseServerClient()
  let query = supabase.from("links").delete().eq("role_id", roleId).eq("id", linkId)
  query = topicId === null ? query.is("topic_id", null) : query.eq("topic_id", topicId)

  const { data, error } = await query.select("id").maybeSingle()

  if (error) {
    throwFromSupabase(error)
  }

  if (!data) {
    throw new ApplicationError("not_found", "That link no longer exists.")
  }
}

/** @deprecated Use deleteLink */
export async function deleteForNode(nodeId: string, linkId: string) {
  const supabase = getSupabaseServerClient()
  const { data, error } = await supabase
    .from("links")
    .delete()
    .eq("topic_id", nodeId)
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
