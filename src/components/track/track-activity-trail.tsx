"use client"

import { useState } from "react"
import { Check, ChevronRight, CircleAlert, LoaderCircle } from "lucide-react"

import {
  activityNextLabel,
  activitySummary,
  type TrackToolActivity,
} from "@/domain/track/activity-trail"
import { cn } from "@/lib/utils"

export function TrackActivityTrail({
  activities,
  busy,
  elapsedMs,
}: {
  activities: TrackToolActivity[]
  busy: boolean
  elapsedMs: number | null
}) {
  const summary = activitySummary({ activities, busy, elapsedMs })
  const next = activityNextLabel(activities, busy)
  const [userOpen, setUserOpen] = useState<boolean | null>(null)
  const expanded = userOpen ?? busy

  if (!summary) {
    return null
  }

  return (
    <div className="mb-2">
      <button
        type="button"
        className="flex max-w-full items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
        aria-expanded={expanded}
        onClick={() => setUserOpen(!(userOpen ?? busy))}
      >
        <ChevronRight
          className={cn("size-3 shrink-0 transition-transform", expanded && "rotate-90")}
        />
        <span className="truncate">{summary}</span>
      </button>
      {expanded ? (
        <ol className="mt-1.5 flex flex-col gap-1 pl-4">
          {activities.map((item) => (
            <li
              key={item.id}
              className="flex min-w-0 items-center gap-1.5 text-xs text-muted-foreground"
            >
              <StatusIcon state={item.state} />
              <span className="truncate">
                {item.label}
                {item.detail ? ` · ${item.detail}` : ""}
              </span>
            </li>
          ))}
          {next && next !== activities.at(-1)?.label ? (
            <li className="flex min-w-0 items-center gap-1.5 text-xs text-muted-foreground">
              <LoaderCircle className="size-3 shrink-0 animate-spin" />
              <span className="truncate">{next}</span>
            </li>
          ) : null}
        </ol>
      ) : null}
    </div>
  )
}

function StatusIcon({ state }: { state: TrackToolActivity["state"] }) {
  if (state === "running") {
    return <LoaderCircle className="size-3 shrink-0 animate-spin" />
  }
  if (state === "error") {
    return <CircleAlert className="size-3 shrink-0 text-destructive" />
  }
  return <Check className="size-3 shrink-0" />
}
