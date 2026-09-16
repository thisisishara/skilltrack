import "server-only"

import {
  activityFromRoles,
  staleRoadmapNotifications,
  type StaleRoadmapNotification,
} from "@/domain/notifications/stale"
import type { Role } from "@/domain/roles/types"
import { listContentUpdatedAtByRoleId } from "@/repositories/activity/activity-repository"
import { logFailure } from "@/lib/observability/log"

export type { StaleRoadmapNotification }

export async function listStaleRoadmapNotifications(
  roles: Role[]
): Promise<StaleRoadmapNotification[]> {
  if (roles.length === 0) {
    return []
  }

  try {
    const contentUpdatedAt = await listContentUpdatedAtByRoleId(roles.map((role) => role.id))
    return staleRoadmapNotifications(activityFromRoles(roles, contentUpdatedAt), new Date())
  } catch (error) {
    logFailure("notifications.stale_roadmaps.failed", error)
    return []
  }
}
