import "server-only"

import { ApplicationError } from "@/domain/errors"
import { getSupabaseServerClient } from "@/lib/supabase/server"
import { logEvent } from "@/lib/observability/log"

export async function listContentUpdatedAtByRoleId(roleIds: string[]) {
  const times = new Map<string, string>()
  if (roleIds.length === 0) {
    return times
  }

  const supabase = getSupabaseServerClient()
  const { data, error } = await supabase.rpc("latest_role_content_activity", {
    p_role_ids: roleIds,
  })

  if (error) {
    logEvent("error", "database.roadmap_activity.failed", {
      code: error.code ?? null,
    })
    throw new ApplicationError("database", "Could not load roadmap activity.", {
      cause: error,
    })
  }

  for (const row of data ?? []) {
    if (row.role_id && row.last_activity_at) {
      times.set(row.role_id, row.last_activity_at)
    }
  }

  return times
}
