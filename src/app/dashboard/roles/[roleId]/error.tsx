"use client"

import { RouteErrorState } from "@/components/layout/route-error"

export default function RoleRoadmapError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <RouteErrorState
      error={error}
      reset={reset}
      title="Roadmap could not be loaded"
      description="This role's roadmap failed to load. Try again, or pick another role from the sidebar."
      event="role_roadmap.error"
    />
  )
}
