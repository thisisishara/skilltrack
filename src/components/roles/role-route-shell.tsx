"use client"

import { useLayoutEffect, useRef, type ReactNode } from "react"
import { useParams, usePathname } from "next/navigation"

import { Roadmap, type RoadmapViewProps } from "@/components/roadmap/roadmap"
import { useRolesUi } from "@/components/roles/roles-workspace"
import { PersistActiveRole } from "@/components/roles/persist-active-role"
import { cn } from "@/lib/utils"

export function RegisterRoadmap(props: RoadmapViewProps) {
  const { rememberRoadmap, cachedRoadmap } = useRolesUi()
  const propsRef = useRef(props)
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
  ])

  if (cachedRoadmap?.roleId === props.roleId) {
    return null
  }

  return <Roadmap {...props} />
}

export function RoleRouteShell({ children }: { children: ReactNode }) {
  const pathname = usePathname()
  const params = useParams<{ roleId?: string }>()
  const { cachedRoadmap } = useRolesUi()
  const roleId = params.roleId
  const onSettings = Boolean(roleId && pathname.endsWith("/settings"))
  const showCachedCanvas = Boolean(
    cachedRoadmap && roleId && cachedRoadmap.roleId === roleId
  )

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      {roleId ? <PersistActiveRole roleId={roleId} /> : null}
      {showCachedCanvas && cachedRoadmap ? (
        <div
          className={cn(
            "min-h-0 flex-1 flex-col overflow-hidden",
            onSettings ? "hidden" : "flex"
          )}
        >
          <Roadmap {...cachedRoadmap} />
        </div>
      ) : null}
      {onSettings || !showCachedCanvas ? children : null}
    </div>
  )
}
