"use client"

import { type Node, type NodeProps } from "@xyflow/react"

export type LabelFlowNode = Node<
  {
    title: string
  },
  "label"
>

export function LabelNodeCard({ data, selected }: NodeProps<LabelFlowNode>) {
  return (
    <div
      className={`max-w-72 min-w-16 rounded-md px-2 py-1 ${
        selected
          ? "outline-2 outline-dashed outline-offset-4 outline-ring"
          : ""
      }`}
    >
      <p className="text-sm font-medium tracking-tight text-muted-foreground">
        {data.title}
      </p>
    </div>
  )
}
