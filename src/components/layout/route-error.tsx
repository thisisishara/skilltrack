"use client"

import { useEffect } from "react"
import { CircleAlert, RotateCw } from "lucide-react"

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { logFailure } from "@/lib/observability/log"

/**
 * Shared body for route-level `error.tsx` boundaries. Logs the error once,
 * shows a friendly message, and offers a retry via Next's `reset()`.
 */
export function RouteErrorState({
  error,
  reset,
  title = "Something went wrong",
  description = "This page could not be loaded. Try again, or sign out and back in if the problem continues.",
  event = "route.error",
}: {
  error: Error & { digest?: string }
  reset: () => void
  title?: string
  description?: string
  event?: string
}) {
  useEffect(() => {
    logFailure(event, error)
  }, [error, event])

  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-4 p-6">
      <Alert variant="destructive" className="max-w-md">
        <CircleAlert />
        <AlertTitle>{title}</AlertTitle>
        <AlertDescription>{description}</AlertDescription>
      </Alert>
      <Button type="button" variant="outline" onClick={() => reset()}>
        <RotateCw data-icon="inline-start" />
        Try again
      </Button>
    </main>
  )
}
