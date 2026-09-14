"use client"

import { Handle, Position, type Node, type NodeProps } from "@xyflow/react"

import { NodeLucideIcon } from "@/components/canvas/lucide-icon"
import { Progress } from "@/components/ui/progress"
import {
  nodeCanHaveChildren,
  nodeCanHaveParent,
  type NodeHandleKind,
} from "@/domain/nodes/handle"
import type { ProgressStatus } from "@/domain/progress/progress"

export type RoadmapFlowNode = Node<
  {
    title: string
    description: string | null
    icon: string
    handleKind: NodeHandleKind
    percent: number
    total: number
    status: ProgressStatus
  },
  "roadmap"
>

export function RoadmapNodeCard({ data, selected }: NodeProps<RoadmapFlowNode>) {
  return (
    <div
      className={`w-52 rounded-xl border bg-card px-3 py-2.5 shadow-sm ${
        selected
          ? "border-ring outline-2 outline-dashed outline-offset-4 outline-ring"
          : "border-border"
      }`}
    >
      {nodeCanHaveParent(data.handleKind) ? (
        <Handle
          type="target"
          position={Position.Top}
          className="!size-2 !border-0 !bg-primary"
        />
      ) : null}
      <div className="flex items-start gap-2">
        <span className="mt-0.5 text-muted-foreground">
          <NodeLucideIcon name={data.icon} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium leading-5">{data.title}</p>
          {data.description ? (
            <p className="mt-0.5 line-clamp-2 text-xs leading-4 text-muted-foreground">
              {data.description}
            </p>
          ) : null}
        </div>
      </div>
      {data.total > 0 ? (
        <div className="mt-2 flex items-center gap-2">
          <Progress
            value={data.percent}
            className="min-w-0 flex-1 flex-nowrap gap-0"
          />
          <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
            {data.percent}%
          </span>
        </div>
      ) : null}
      {nodeCanHaveChildren(data.handleKind) ? (
        <Handle
          type="source"
          position={Position.Bottom}
          className="!size-2 !border-0 !bg-primary"
        />
      ) : null}
    </div>
  )
}
