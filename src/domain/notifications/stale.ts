import type { Role } from "@/domain/roles/types"

export const ROADMAP_STALE_AFTER_MS = 14 * 24 * 60 * 60 * 1000

export type RoadmapActivity = {
  roleId: string
  roleName: string
  lastActivityAt: string
}

export type StaleRoadmapNotification = {
  id: string
  roleId: string
  roleName: string
  lastActivityAt: string
  staleForLabel: string
}

const DAY_MS = 24 * 60 * 60 * 1000

export function staleForLabel(lastActivityAt: Date, now: Date) {
  const elapsed = Math.max(0, now.getTime() - lastActivityAt.getTime())
  const days = Math.max(1, Math.floor(elapsed / DAY_MS))

  if (days < 14) {
    return `${days} day${days === 1 ? "" : "s"}`
  }

  const weeks = Math.floor(days / 7)
  if (weeks < 8) {
    return `${weeks} week${weeks === 1 ? "" : "s"}`
  }

  const months = Math.max(1, Math.floor(days / 30))
  return `${months} month${months === 1 ? "" : "s"}`
}

export function latestTimestamp(...values: Array<string | null | undefined>) {
  let latest: string | null = null
  for (const value of values) {
    if (!value) {
      continue
    }
    if (!latest || value > latest) {
      latest = value
    }
  }
  return latest
}

export function staleRoadmapNotifications(
  activities: RoadmapActivity[],
  now: Date,
  staleAfterMs = ROADMAP_STALE_AFTER_MS
): StaleRoadmapNotification[] {
  const cutoff = now.getTime() - staleAfterMs

  return activities
    .flatMap((activity) => {
      const lastActivityAt = new Date(activity.lastActivityAt)
      if (Number.isNaN(lastActivityAt.getTime()) || lastActivityAt.getTime() > cutoff) {
        return []
      }

      return [
        {
          id: `stale-roadmap:${activity.roleId}`,
          roleId: activity.roleId,
          roleName: activity.roleName,
          lastActivityAt: activity.lastActivityAt,
          staleForLabel: staleForLabel(lastActivityAt, now),
        },
      ]
    })
    .sort((left, right) => left.lastActivityAt.localeCompare(right.lastActivityAt))
}

export function activityFromRoles(
  roles: Pick<Role, "id" | "name" | "createdAt" | "updatedAt">[],
  contentUpdatedAt: ReadonlyMap<string, string>
): RoadmapActivity[] {
  return roles.map((role) => ({
    roleId: role.id,
    roleName: role.name,
    lastActivityAt:
      latestTimestamp(role.createdAt, role.updatedAt, contentUpdatedAt.get(role.id)) ??
      role.createdAt,
  }))
}
