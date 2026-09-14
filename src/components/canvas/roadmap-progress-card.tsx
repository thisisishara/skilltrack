"use client"

import { Badge } from "@/components/ui/badge"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Progress, ProgressLabel, ProgressValue } from "@/components/ui/progress"
import type { NodeStatusCounts, ProgressSnapshot } from "@/domain/progress/progress"

export function RoadmapProgressCard({
  roleName,
  progress,
  counts,
}: {
  roleName: string
  progress: ProgressSnapshot
  counts: NodeStatusCounts
}) {
  return (
    <Card
      size="sm"
      className="pointer-events-auto w-72 max-w-[calc(100vw-8rem)] shadow-sm"
    >
      <CardHeader>
        <CardTitle className="truncate">{roleName}</CardTitle>
        <CardDescription>Overall progress</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <Progress value={progress.percent}>
          <ProgressLabel className="sr-only">Roadmap progress</ProgressLabel>
          <ProgressValue>{() => `${progress.percent}%`}</ProgressValue>
        </Progress>
        <div className="flex flex-wrap gap-1.5">
          <Badge variant="default">Done {counts.done}</Badge>
          <Badge variant="secondary">In progress {counts.inProgress}</Badge>
          <Badge variant="outline">Pending {counts.pending}</Badge>
        </div>
      </CardContent>
    </Card>
  )
}
