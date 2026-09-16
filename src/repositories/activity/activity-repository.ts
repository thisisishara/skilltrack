import "server-only"

import { ApplicationError } from "@/domain/errors"
import { latestTimestamp } from "@/domain/notifications/stale"
import { getSupabaseServerClient } from "@/lib/supabase/server"
import { logEvent } from "@/lib/observability/log"

const IN_FILTER_CHUNK = 200

function throwFromSupabase(error: { code?: string; message?: string } | null): never {
  logEvent("error", "database.roadmap_activity.failed", {
    code: error?.code ?? null,
  })
  throw new ApplicationError("database", "Could not load roadmap activity.", {
    cause: error,
  })
}

function chunk<T>(values: T[], size: number) {
  const groups: T[][] = []
  for (let index = 0; index < values.length; index += size) {
    groups.push(values.slice(index, index + size))
  }
  return groups
}

function remember(
  times: Map<string, string>,
  roleId: string | null | undefined,
  updatedAt: string | null | undefined
) {
  if (!roleId || !updatedAt) {
    return
  }

  const current = times.get(roleId)
  const next = latestTimestamp(current, updatedAt)
  if (next) {
    times.set(roleId, next)
  }
}

export async function listContentUpdatedAtByRoleId(roleIds: string[]) {
  const times = new Map<string, string>()
  if (roleIds.length === 0) {
    return times
  }

  const supabase = getSupabaseServerClient()

  for (const roleChunk of chunk(roleIds, IN_FILTER_CHUNK)) {
    const { data: nodes, error: nodeError } = await supabase
      .from("roadmap_nodes")
      .select("id, role_id, updated_at")
      .in("role_id", roleChunk)

    if (nodeError) {
      throwFromSupabase(nodeError)
    }

    const nodeIds: string[] = []
    const roleByNodeId = new Map<string, string>()
    for (const node of nodes ?? []) {
      nodeIds.push(node.id)
      roleByNodeId.set(node.id, node.role_id)
      remember(times, node.role_id, node.updated_at)
    }

    if (nodeIds.length === 0) {
      continue
    }

    for (const nodeChunk of chunk(nodeIds, IN_FILTER_CHUNK)) {
      const [{ data: items, error: itemError }, { data: links, error: linkError }] =
        await Promise.all([
          supabase
            .from("checklist_items")
            .select("node_id, updated_at")
            .in("node_id", nodeChunk),
          supabase.from("node_links").select("node_id, updated_at").in("node_id", nodeChunk),
        ])

      if (itemError) {
        throwFromSupabase(itemError)
      }
      if (linkError) {
        throwFromSupabase(linkError)
      }

      for (const item of items ?? []) {
        remember(times, roleByNodeId.get(item.node_id), item.updated_at)
      }
      for (const link of links ?? []) {
        remember(times, roleByNodeId.get(link.node_id), link.updated_at)
      }
    }
  }

  return times
}
