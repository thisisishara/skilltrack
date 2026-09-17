"use client"

import { RouteErrorState } from "@/components/layout/route-error"

export default function RoleSettingsError({
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
      title="Role settings could not be loaded"
      description="Try again, or pick another role from the sidebar."
      event="role_settings.error"
    />
  )
}
