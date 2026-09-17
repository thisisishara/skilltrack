"use client"

import { useEffect } from "react"
import { CircleAlert, RotateCw } from "lucide-react"

import { logFailure } from "@/lib/observability/log"

import "./globals.css"

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    logFailure("app.global_error", error)
  }, [error])

  return (
    <html lang="en" className="h-full antialiased">
      <body className="flex min-h-full flex-col items-center justify-center bg-background p-6 text-foreground">
        <div className="flex max-w-md flex-col items-center gap-4 text-center">
          <CircleAlert className="size-8 text-destructive" />
          <div className="flex flex-col gap-1.5">
            <h1 className="text-lg font-medium">SkillTrack hit a snag</h1>
            <p className="text-sm text-muted-foreground">
              Something went wrong loading the app. Reloading usually fixes
              it.
            </p>
          </div>
          <button
            type="button"
            onClick={() => reset()}
            className="inline-flex h-9 items-center justify-center gap-2 rounded-lg border px-4 text-sm font-medium hover:bg-muted"
          >
            <RotateCw className="size-4" />
            Try again
          </button>
        </div>
      </body>
    </html>
  )
}
