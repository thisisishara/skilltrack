"use client"

import { Handle, Position, type Node, type NodeProps } from "@xyflow/react"

import { NodeLucideIcon } from "@/components/canvas/lucide-icon"
import { ProgressStatusBadge } from "@/components/canvas/progress-status-badge"
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
    status: ProgressStatus
  },
  "roadmap"
>

export function RoadmapNodeCard({ data, selected }: NodeProps<RoadmapFlowNode>) {
  return (
    <div
      className={`min-w-44 max-w-56 rounded-xl border bg-card px-3 py-2 shadow-sm ${
        selected ? "border-ring ring-3 ring-ring/50" : "border-border"
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
          <p className="truncate text-sm font-medium">{data.title}</p>
          {data.description ? (
            <p className="line-clamp-2 text-xs text-muted-foreground">
              {data.description}
            </p>
          ) : null}
          <div className="mt-1.5">
            <ProgressStatusBadge status={data.status} percent={data.percent} />
          </div>
        </div>
      </div>
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
