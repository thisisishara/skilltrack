"use client"

import type { NodeStatusCounts, ProgressSnapshot } from "@/domain/progress/progress"

function StatusSep() {
  return <span className="h-3 w-px shrink-0 bg-border" aria-hidden />
}

export function RoadmapStatusBar({
  roleName,
  progress,
  counts,
}: {
  roleName: string
  progress: ProgressSnapshot
  counts: NodeStatusCounts
}) {
  return (
    <footer className="flex h-7 shrink-0 items-center gap-2.5 overflow-hidden border-t bg-muted/50 px-3 font-mono text-[11px] leading-none text-muted-foreground">
      <span className="min-w-0 truncate text-foreground">{roleName}</span>
      <StatusSep />
      <span className="tabular-nums text-foreground">{progress.percent}%</span>
      <div
        className="h-1 w-24 shrink-0 overflow-hidden rounded-full bg-border"
        role="progressbar"
        aria-label="Overall progress"
        aria-valuenow={progress.percent}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        <div
          className="h-full bg-primary transition-[width]"
          style={{ width: `${progress.percent}%` }}
        />
      </div>
      <span className="hidden tabular-nums sm:inline">
        {progress.completed}/{progress.total} evidence
      </span>
      <StatusSep />
      <div className="ml-auto flex min-w-0 items-center gap-2.5 overflow-hidden">
        <span className="shrink-0 tabular-nums">Done {counts.done}</span>
        <span className="hidden shrink-0 tabular-nums sm:inline">
          In progress {counts.inProgress}
        </span>
        <span className="shrink-0 tabular-nums">Pending {counts.pending}</span>
      </div>
    </footer>
  )
}
