"use client"

import { useLayoutEffect, useRef, type ReactNode } from "react"
import { useParams, usePathname } from "next/navigation"

import { Roadmap, type RoadmapViewProps } from "@/components/roadmap/roadmap"
import { useRolesUi } from "@/components/roles/roles-workspace"
import { PersistActiveRole } from "@/components/roles/persist-active-role"
import { Spinner } from "@/components/ui/spinner"
import { cn } from "@/lib/utils"

const ROLE_HREF_PATTERN = /^\/dashboard\/roles\/([^/?]+)/

function extractRoleId(href: string | null): string | null {
  if (!href) {
    return null
  }
  return ROLE_HREF_PATTERN.exec(href)?.[1] ?? null
}

export function RegisterRoadmap(props: RoadmapViewProps) {
  const { rememberRoadmap, cachedRoadmap } = useRolesUi()
  const propsRef = useRef(props)
  // eslint-disable-next-line react-hooks/refs
  propsRef.current = props

  useLayoutEffect(() => {
    rememberRoadmap(propsRef.current)
  }, [
    rememberRoadmap,
    props.roleId,
    props.roleName,
    props.roleDescription,
    props.roleNotes,
    props.focusNodeId,
    props.nodes,
    props.checklistItems,
    props.links,
    props.notes,
  ])

  if (cachedRoadmap?.roleId === props.roleId) {
    return null
  }

  return <Roadmap {...props} />
}

export function RoleRouteShell({ children }: { children: ReactNode }) {
  const pathname = usePathname()
  const params = useParams<{ roleId?: string }>()
  const { cachedRoadmap, pendingHref } = useRolesUi()
  const roleId = params.roleId
  const onNonCanvasRoute = Boolean(
    roleId &&
      (pathname.endsWith("/settings") || pathname.includes("/jobs"))
  )
  const showCachedCanvas = Boolean(
    cachedRoadmap && roleId && cachedRoadmap.roleId === roleId
  )
  const pendingRoleId = extractRoleId(pendingHref)
  // We're leaving this role for a different one. React (correctly) keeps
  // the old roadmap mounted and visible while the new route loads, so make
  // that explicit instead of letting stale content sit there silently.
  const switchingAwayFromRole = Boolean(
    roleId && pendingRoleId && pendingRoleId !== roleId
  )

  return (
    <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden">
      {roleId ? <PersistActiveRole roleId={roleId} /> : null}
      {showCachedCanvas && cachedRoadmap ? (
        <div
          className={cn(
            "min-h-0 flex-1 flex-col overflow-hidden",
            onNonCanvasRoute ? "hidden" : "flex"
          )}
        >
          <Roadmap {...cachedRoadmap} />
        </div>
      ) : null}
      {onNonCanvasRoute || !showCachedCanvas ? children : null}
      {switchingAwayFromRole ? <RoleTransitionOverlay /> : null}
    </div>
  )
}

function RoleTransitionOverlay() {
  return (
    <div className="absolute inset-0 z-10 flex animate-in fade-in items-center justify-center bg-background/70 backdrop-blur-[1px] duration-150">
      <div className="flex items-center gap-2 rounded-full border bg-card px-3 py-1.5 text-sm text-muted-foreground shadow-sm">
        <Spinner className="size-3.5" />
        Switching role…
      </div>
    </div>
  )
}
