"use client"

import type { ReactNode } from "react"
import {
  GitBranch,
  Maximize2,
  Pencil,
  Plus,
  Trash2,
  ZoomIn,
  ZoomOut,
} from "lucide-react"
import { useReactFlow } from "@xyflow/react"

import { Button } from "@/components/ui/button"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"

function ToolbarButton({
  label,
  disabled,
  onClick,
  children,
}: {
  label: string
  disabled?: boolean
  onClick: () => void
  children: ReactNode
}) {
  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <Button
            type="button"
            variant="outline"
            size="icon-sm"
            disabled={disabled}
            onClick={onClick}
            aria-label={label}
          />
        }
      >
        {children}
      </TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  )
}

export function CanvasToolbar({
  hasSelection,
  onAddRoot,
  onAddChild,
  onEdit,
  onDelete,
}: {
  hasSelection: boolean
  onAddRoot: () => void
  onAddChild: () => void
  onEdit: () => void
  onDelete: () => void
}) {
  const { zoomIn, zoomOut, fitView } = useReactFlow()

  return (
    <div className="pointer-events-auto absolute top-3 left-3 z-10 flex flex-wrap items-center gap-1 rounded-xl border bg-background/90 p-1 shadow-sm backdrop-blur-sm">
      <ToolbarButton label="Add node" onClick={onAddRoot}>
        <Plus />
      </ToolbarButton>
      <ToolbarButton label="Add child" disabled={!hasSelection} onClick={onAddChild}>
        <GitBranch />
      </ToolbarButton>
      <ToolbarButton label="Edit node" disabled={!hasSelection} onClick={onEdit}>
        <Pencil />
      </ToolbarButton>
      <ToolbarButton label="Delete node" disabled={!hasSelection} onClick={onDelete}>
        <Trash2 />
      </ToolbarButton>
      <ToolbarButton label="Zoom in" onClick={() => void zoomIn()}>
        <ZoomIn />
      </ToolbarButton>
      <ToolbarButton label="Zoom out" onClick={() => void zoomOut()}>
        <ZoomOut />
      </ToolbarButton>
      <ToolbarButton label="Fit roadmap" onClick={() => void fitView({ padding: 0.2 })}>
        <Maximize2 />
      </ToolbarButton>
    </div>
  )
}
