"use client"

import type { ReactNode } from "react"
import {
  Download,
  GitBranch,
  Maximize2,
  MousePointer2,
  Pencil,
  Plus,
  SquareDashedMousePointer,
  Trash2,
  Type,
  ZoomIn,
  ZoomOut,
} from "lucide-react"
import { useReactFlow } from "@xyflow/react"

import { Button } from "@/components/ui/button"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"

export type CanvasInteractionTool = "pointer" | "select"

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
      <TooltipContent side="right" className="font-mono">
        {label}
      </TooltipContent>
    </Tooltip>
  )
}

function ToolToggle({
  value,
  label,
  children,
}: {
  value: CanvasInteractionTool
  label: string
  children: ReactNode
}) {
  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <ToggleGroupItem
            value={value}
            aria-label={label}
            className="size-7 px-0"
          />
        }
      >
        {children}
      </TooltipTrigger>
      <TooltipContent side="right" className="font-mono">
        {label}
      </TooltipContent>
    </Tooltip>
  )
}

function ToolbarSep() {
  return <span className="mx-auto h-px w-5 shrink-0 bg-border" aria-hidden />
}

export function CanvasToolbar({
  tool,
  onToolChange,
  hasSelection,
  canEdit,
  canAddChild,
  onAddRoot,
  onAddLabel,
  onAddChild,
  onEdit,
  onDelete,
  onExport,
}: {
  tool: CanvasInteractionTool
  onToolChange: (tool: CanvasInteractionTool) => void
  hasSelection: boolean
  canEdit: boolean
  canAddChild: boolean
  onAddRoot: () => void
  onAddLabel: () => void
  onAddChild: () => void
  onEdit: () => void
  onDelete: () => void
  onExport: () => void
}) {
  const { zoomIn, zoomOut, fitView } = useReactFlow()

  return (
    <div className="pointer-events-auto absolute top-3 left-3 z-10 flex flex-col items-center gap-1 rounded-xl border bg-background/90 p-1 shadow-sm backdrop-blur-sm">
      <ToggleGroup
        value={[tool]}
        onValueChange={(value) => {
          const next = Array.isArray(value) ? value[0] : value
          if (next === "pointer" || next === "select") {
            onToolChange(next)
          }
        }}
        variant="outline"
        size="sm"
        spacing={0}
        orientation="vertical"
        className="flex-col"
      >
        <ToolToggle value="pointer" label="Pointer">
          <MousePointer2 />
        </ToolToggle>
        <ToolToggle value="select" label="Select">
          <SquareDashedMousePointer />
        </ToolToggle>
      </ToggleGroup>
      <ToolbarSep />
      <ToolbarButton label="Add node" onClick={onAddRoot}>
        <Plus />
      </ToolbarButton>
      <ToolbarButton label="Add label" onClick={onAddLabel}>
        <Type />
      </ToolbarButton>
      <ToolbarButton label="Add child" disabled={!canAddChild} onClick={onAddChild}>
        <GitBranch />
      </ToolbarButton>
      <ToolbarButton label="Edit node" disabled={!canEdit} onClick={onEdit}>
        <Pencil />
      </ToolbarButton>
      <ToolbarButton label="Delete" disabled={!hasSelection} onClick={onDelete}>
        <Trash2 />
      </ToolbarButton>
      <ToolbarSep />
      <ToolbarButton label="Zoom in" onClick={() => void zoomIn()}>
        <ZoomIn />
      </ToolbarButton>
      <ToolbarButton label="Zoom out" onClick={() => void zoomOut()}>
        <ZoomOut />
      </ToolbarButton>
      <ToolbarButton label="Fit roadmap" onClick={() => void fitView({ padding: 0.2 })}>
        <Maximize2 />
      </ToolbarButton>
      <ToolbarSep />
      <ToolbarButton label="Export JSON" onClick={onExport}>
        <Download />
      </ToolbarButton>
    </div>
  )
}
