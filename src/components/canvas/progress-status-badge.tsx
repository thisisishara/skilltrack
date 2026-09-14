"use client"

import { Badge } from "@/components/ui/badge"
import type { ProgressStatus } from "@/domain/progress/progress"
import { progressStatusLabel } from "@/domain/progress/progress"

export function ProgressStatusBadge({
  status,
  percent,
}: {
  status: ProgressStatus
  percent: number
}) {
  const variant =
    status === "done" ? "default" : status === "in_progress" ? "secondary" : "outline"

  return (
    <Badge variant={variant}>
      {progressStatusLabel(status)} {percent}%
    </Badge>
  )
}
