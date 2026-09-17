"use server"

import { listStaleRoadmapNotifications } from "@/application/notifications/stale-roadmaps"
import { listRoles } from "@/application/roles/roles-service"
import { failAction } from "@/lib/errors/present"
import { requireApprovedSession } from "@/lib/auth/session"
import type { StaleRoadmapNotification } from "@/domain/notifications/stale"

export type StaleNotificationsResult =
  | { ok: true; items: StaleRoadmapNotification[] }
  | { ok: false; code: string; message: string }

export async function listStaleRoadmapNotificationsAction(): Promise<StaleNotificationsResult> {
  try {
    const { applicationUser } = await requireApprovedSession()
    const roles = await listRoles(applicationUser.id)
    const items = await listStaleRoadmapNotifications(roles)
    return { ok: true, items }
  } catch (error) {
    return failAction(error, "notifications.stale_failed")
  }
}
