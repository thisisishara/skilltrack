"use client"

import { ChevronDown, ChevronRight, Plus, Trash2 } from "lucide-react"

import { NodeLucideIcon } from "@/components/canvas/lucide-icon"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { cn } from "@/lib/utils"
import type { ChecklistItem } from "@/domain/checklists/types"
import { nodeCanHaveChildren } from "@/domain/nodes/handle"
import type { RoadmapNode } from "@/domain/nodes/types"
import type { ProgressSnapshot } from "@/domain/progress/progress"

export type ChecklistHandlers = {
  onToggle: (itemId: string, isCompleted: boolean) => Promise<void>
  onCreate: (input: { title: string; description: string }) => {
    ok: true
  } | { ok: false; message: string }
  onUpdate: (item: ChecklistItem, title: string, description: string) => void
  onDelete: (itemId: string) => void
  onReorder: (orderedIds: string[]) => void
}

// A compact, read-mostly ticklist for a topic's own tasks. Adding, editing,
// reordering, and deleting tasks happens in the details panel — this is
// purely for scanning a topic and checking things off in place.
function TaskTickList({
  items,
  onToggle,
}: {
  items: ChecklistItem[]
  onToggle: (itemId: string, isCompleted: boolean) => Promise<void>
}) {
  if (items.length === 0) {
    return null
  }

  const ordered = [...items].sort((a, b) => a.sortOrder - b.sortOrder)

  return (
    <ul className="flex flex-col">
      {ordered.map((item) => (
        <li key={item.id}>
          <label className="flex cursor-pointer items-start gap-2 rounded-md px-1.5 py-1 hover:bg-accent/40">
            <Checkbox
              checked={item.isCompleted}
              onCheckedChange={(checked) => {
                void onToggle(item.id, checked === true)
              }}
              className="mt-0.5"
              aria-label={`Mark ${item.title} complete`}
            />
            <span
              className={cn(
                "min-w-0 flex-1 text-sm leading-5 break-words",
                item.isCompleted && "text-muted-foreground line-through"
              )}
            >
              {item.title}
            </span>
          </label>
        </li>
      ))}
    </ul>
  )
}

export function TreeNodeRow({
  node,
  depth,
  childrenByParent,
  items,
  expandedIds,
  onToggleExpand,
  selectedNodeId,
  onSelect,
  onAddChild,
  onDelete,
  getChecklistHandlers,
  subtreeProgressFor,
}: {
  node: RoadmapNode
  depth: number
  childrenByParent: Map<string | null, RoadmapNode[]>
  items: ChecklistItem[]
  expandedIds: Set<string>
  onToggleExpand: (nodeId: string) => void
  selectedNodeId: string | null
  onSelect: (nodeId: string) => void
  onAddChild: (parentId: string) => void
  onDelete: (nodeId: string) => void
  getChecklistHandlers: (nodeId: string) => ChecklistHandlers
  subtreeProgressFor: (nodeId: string) => ProgressSnapshot
}) {
  const children = childrenByParent.get(node.id) ?? []
  const ownItems = items.filter((item) => item.nodeId === node.id)
  const expanded = expandedIds.has(node.id)
  const subtree = subtreeProgressFor(node.id)
  const selected = selectedNodeId === node.id
  const canAddChild = nodeCanHaveChildren(node.handleKind)
  const hasBody = expanded && (ownItems.length > 0 || children.length > 0)

  return (
    <li className="flex flex-col" id={`tree-topic-${node.id}`}>
      <div
        className={cn(
          "group flex items-center gap-1 rounded-md py-1 pr-1.5",
          selected ? "bg-accent" : "hover:bg-accent/60"
        )}
      >
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          className="size-6 shrink-0"
          aria-label={expanded ? "Collapse" : "Expand"}
          onClick={() => onToggleExpand(node.id)}
        >
          {expanded ? (
            <ChevronDown className="size-3.5" />
          ) : (
            <ChevronRight className="size-3.5" />
          )}
        </Button>
        <button
          type="button"
          className="flex min-w-0 flex-1 items-center gap-2 rounded-sm py-0.5 text-left"
          onClick={() => onSelect(node.id)}
        >
          <span className="shrink-0 text-muted-foreground">
            <NodeLucideIcon name={node.icon} className="size-3.5" />
          </span>
          <span
            className={cn(
              "min-w-0 flex-1 truncate text-sm",
              depth === 0 ? "font-medium" : "font-normal"
            )}
          >
            {node.title}
          </span>
          {!expanded && children.length > 0 ? (
            <span className="shrink-0 rounded-full bg-muted px-1.5 py-0.5 text-[10px] tabular-nums text-muted-foreground">
              {children.length}
            </span>
          ) : null}
        </button>
        {subtree.total > 0 ? (
          <div className="hidden shrink-0 items-center gap-1.5 sm:flex">
            <div className="h-1 w-14 overflow-hidden rounded-full bg-border">
              <div
                className="h-full bg-primary transition-[width]"
                style={{ width: `${subtree.percent}%` }}
              />
            </div>
            <span className="w-8 shrink-0 text-right font-mono text-[11px] tabular-nums text-muted-foreground">
              {subtree.percent}%
            </span>
          </div>
        ) : null}
        <div className="flex shrink-0 items-center gap-0.5 opacity-0 group-hover:opacity-100 group-focus-within:opacity-100">
          {canAddChild ? (
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              className="size-6"
              aria-label="Add sub-topic"
              onClick={() => onAddChild(node.id)}
            >
              <Plus className="size-3.5" />
            </Button>
          ) : null}
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            className="size-6"
            aria-label="Delete topic"
            onClick={() => onDelete(node.id)}
          >
            <Trash2 className="size-3.5" />
          </Button>
        </div>
      </div>
      {hasBody ? (
        <div className="ml-3 flex flex-col gap-1 border-l border-border pl-3">
          <TaskTickList items={ownItems} onToggle={getChecklistHandlers(node.id).onToggle} />
          {children.length > 0 ? (
            <ul className="flex flex-col">
              {children.map((child) => (
                <TreeNodeRow
                  key={child.id}
                  node={child}
                  depth={depth + 1}
                  childrenByParent={childrenByParent}
                  items={items}
                  expandedIds={expandedIds}
                  onToggleExpand={onToggleExpand}
                  selectedNodeId={selectedNodeId}
                  onSelect={onSelect}
                  onAddChild={onAddChild}
                  onDelete={onDelete}
                  getChecklistHandlers={getChecklistHandlers}
                  subtreeProgressFor={subtreeProgressFor}
                />
              ))}
            </ul>
          ) : null}
        </div>
      ) : null}
    </li>
  )
}
