"use client"

import { RouteErrorState } from "@/components/layout/route-error"

export default function UsersError({
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
      title="Users could not be loaded"
      description="Something went wrong loading pending approvals. Try again."
      event="users.error"
    />
  )
}
