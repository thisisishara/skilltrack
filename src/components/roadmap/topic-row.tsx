"use client"

import { ChevronDown, ChevronRight, GripVertical, Link2, ListTree, NotebookPen, Pencil, Plus, SquareCheck, Trash2 } from "lucide-react"
import { useRef, useState, type DragEvent } from "react"

import { TaskDialog } from "@/components/roadmap/topic-tasks-section"
import { NodeLucideIcon } from "@/components/roadmap/lucide-icon"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { ConfirmDeleteAlert } from "@/components/ui/confirm-delete-alert"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"
import type { ChecklistItem } from "@/domain/tasks/types"
import {
  dropPositionFromOffset,
  type TreeDropPosition,
} from "@/domain/topics/placement"
import {
  accentIconStyle,
  inheritedAccentColor,
} from "@/domain/topics/accent"
import type { RoadmapNode } from "@/domain/topics/types"
import {
  DONE_CHECKBOX_CLASS,
  type ProgressSnapshot,
} from "@/domain/progress/progress"
import { useTrackWorkspaceOptional } from "@/components/track/track-workspace"
import { proposalForTopic } from "@/domain/track/overlay"
import { useRolesUi } from "@/components/roles/roles-workspace"

export type ChecklistHandlers = {
  onToggle: (itemId: string, isCompleted: boolean) => Promise<void>
  onCreate: (input: { title: string; description: string }) => {
    ok: true
  } | { ok: false; message: string }
  onUpdate: (item: ChecklistItem, title: string, description: string) => void
  onDelete: (itemId: string) => void
  onReorder: (orderedIds: string[]) => void
}

export type TopicAddKind = "subtopic" | "task" | "link" | "notes"

const BADGE_PALETTE = [
  "bg-blue-500/12 text-blue-600 dark:bg-blue-400/15 dark:text-blue-400",
  "bg-violet-500/12 text-violet-600 dark:bg-violet-400/15 dark:text-violet-400",
  "bg-emerald-500/12 text-emerald-600 dark:bg-emerald-400/15 dark:text-emerald-400",
  "bg-amber-500/12 text-amber-600 dark:bg-amber-400/15 dark:text-amber-400",
  "bg-rose-500/12 text-rose-600 dark:bg-rose-400/15 dark:text-rose-400",
  "bg-cyan-500/12 text-cyan-600 dark:bg-cyan-400/15 dark:text-cyan-400",
  "bg-orange-500/12 text-orange-600 dark:bg-orange-400/15 dark:text-orange-400",
  "bg-teal-500/12 text-teal-600 dark:bg-teal-400/15 dark:text-teal-400",
  "bg-pink-500/12 text-pink-600 dark:bg-pink-400/15 dark:text-pink-400",
  "bg-indigo-500/12 text-indigo-600 dark:bg-indigo-400/15 dark:text-indigo-400",
]

function badgeClasses(seed: string) {
  let hash = 0
  for (let i = 0; i < seed.length; i++) {
    hash = (hash * 31 + seed.charCodeAt(i)) >>> 0
  }
  return BADGE_PALETTE[hash % BADGE_PALETTE.length]
}

function reorderTaskIds(
  ids: string[],
  draggedId: string,
  targetId: string,
  position: "before" | "after"
) {
  if (draggedId === targetId) {
    return null
  }

  const next = ids.filter((id) => id !== draggedId)
  const targetIndex = next.indexOf(targetId)
  if (targetIndex < 0) {
    return null
  }

  next.splice(position === "before" ? targetIndex : targetIndex + 1, 0, draggedId)
  if (next.join("\0") === ids.join("\0")) {
    return null
  }

  return next
}

function TaskTickList({
  items,
  editing,
  focusedTaskId,
  onSelectTopic,
  onToggle,
  onCreate,
  onUpdate,
  onDelete,
  onReorder,
}: {
  items: ChecklistItem[]
  editing: boolean
  focusedTaskId: string | null
  onSelectTopic: () => void
  onToggle: (itemId: string, isCompleted: boolean) => Promise<void>
  onCreate: (input: { title: string; description: string }) => {
    ok: true
  } | { ok: false; message: string }
  onUpdate: (item: ChecklistItem, title: string, description: string) => void
  onDelete: (itemId: string) => void
  onReorder: (orderedIds: string[]) => void
}) {
  const draggedIdRef = useRef<string | null>(null)
  const [draggedId, setDraggedId] = useState<string | null>(null)
  const [dropHint, setDropHint] = useState<{
    itemId: string
    position: "before" | "after"
  } | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<ChecklistItem | null>(null)
  const [pendingDelete, setPendingDelete] = useState<ChecklistItem | null>(null)

  const ordered = [...items].sort((a, b) => a.sortOrder - b.sortOrder)
  const orderedIds = ordered.map((item) => item.id)

  if (items.length === 0 && !editing) {
    return null
  }

  function setDragging(itemId: string | null) {
    draggedIdRef.current = itemId
    setDraggedId(itemId)
    if (!itemId) {
      setDropHint(null)
    }
  }

  function hintFor(event: DragEvent<HTMLElement>, itemId: string): "before" | "after" | null {
    if (!draggedIdRef.current || draggedIdRef.current === itemId) {
      return null
    }

    const rect = event.currentTarget.getBoundingClientRect()
    const position = dropPositionFromOffset(
      event.clientY - rect.top,
      rect.height,
      false
    )
    return position === "after" ? "after" : "before"
  }

  function openCreate() {
    setEditingItem(null)
    setDialogOpen(true)
  }

  return (
    <div data-no-drag className="flex flex-col" onClick={onSelectTopic}>
      <ul className="flex flex-col gap-1 py-1">
        {ordered.map((item) => {
          const hint = dropHint?.itemId === item.id ? dropHint.position : null
          return (
            <li key={item.id}>
              <div
                id={`tree-task-${item.id}`}
                data-tree-task={item.id}
                data-task-row
                className={cn(
                  "group relative flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm transition-colors hover:bg-accent/40",
                  item.completed && "opacity-80",
                  draggedId === item.id && "opacity-50",
                  focusedTaskId === item.id && "bg-accent ring-2 ring-primary/50",
                  hint === "before" &&
                    "before:absolute before:inset-x-2 before:top-0 before:h-0.5 before:rounded-full before:bg-primary",
                  hint === "after" &&
                    "after:absolute after:inset-x-2 after:bottom-0 after:h-0.5 after:rounded-full after:bg-primary"
                )}
                onDragEnter={(event) => {
                  const position = hintFor(event, item.id)
                  if (!position) {
                    return
                  }
                  event.preventDefault()
                  event.stopPropagation()
                  setDropHint({ itemId: item.id, position })
                }}
                onDragOver={(event) => {
                  const position = hintFor(event, item.id)
                  if (!position) {
                    return
                  }
                  event.preventDefault()
                  event.stopPropagation()
                  event.dataTransfer.dropEffect = "move"
                  setDropHint({ itemId: item.id, position })
                }}
                onDrop={(event) => {
                  event.preventDefault()
                  event.stopPropagation()
                  const dragging = draggedIdRef.current
                  const position = hintFor(event, item.id)
                  setDragging(null)
                  if (!dragging || !position) {
                    return
                  }
                  const next = reorderTaskIds(orderedIds, dragging, item.id, position)
                  if (next) {
                    onReorder(next)
                  }
                }}
              >
                {editing ? (
                <span
                  draggable
                  aria-label="Reorder task"
                  className="flex size-4 shrink-0 cursor-grab items-center justify-center text-muted-foreground hover:text-foreground active:cursor-grabbing"
                  onDragStart={(event) => {
                    event.stopPropagation()
                    event.dataTransfer.setData("text/plain", item.id)
                    event.dataTransfer.effectAllowed = "move"
                    const row = event.currentTarget.closest("[data-task-row]")
                    if (row instanceof HTMLElement) {
                      event.dataTransfer.setDragImage(row, 16, 16)
                    }
                    setDragging(item.id)
                  }}
                  onDragEnd={(event) => {
                    event.stopPropagation()
                    setDragging(null)
                  }}
                >
                  <GripVertical className="size-3.5" />
                </span>
                ) : null}
                <Checkbox
                  checked={item.completed}
                  className={DONE_CHECKBOX_CLASS}
                  onCheckedChange={(checked) => {
                    void onToggle(item.id, checked === true)
                  }}
                  aria-label={`Mark ${item.title} complete`}
                />
                <span
                  className={cn(
                    "min-w-0 flex-1 truncate leading-5",
                    item.completed && "text-muted-foreground line-through"
                  )}
                >
                  {item.title}
                </span>
                {editing ? (
                  <span className="flex shrink-0">
                    <Tooltip>
                      <TooltipTrigger
                        render={
                          <Button
                            type="button"
                            size="icon-sm"
                            variant="ghost"
                            className="size-6"
                            aria-label="Edit task"
                            onClick={() => {
                              setEditingItem(item)
                              setDialogOpen(true)
                            }}
                          />
                        }
                      >
                        <Pencil className="size-3.5" />
                      </TooltipTrigger>
                      <TooltipContent>Edit task</TooltipContent>
                    </Tooltip>
                    <Tooltip>
                      <TooltipTrigger
                        render={
                          <Button
                            type="button"
                            size="icon-sm"
                            variant="ghost"
                            className="size-6"
                            aria-label="Delete task"
                            onClick={() => setPendingDelete(item)}
                          />
                        }
                      >
                        <Trash2 className="size-3.5" />
                      </TooltipTrigger>
                      <TooltipContent>Delete task</TooltipContent>
                    </Tooltip>
                  </span>
                ) : null}
              </div>
            </li>
          )
        })}
      </ul>
      {editing ? (
        <Tooltip>
          <TooltipTrigger
            render={
              <Button
                type="button"
                size="sm"
                variant="ghost"
                className="self-start"
                onClick={openCreate}
              />
            }
          >
            <Plus data-icon="inline-start" />
            Add task
          </TooltipTrigger>
          <TooltipContent>Add task</TooltipContent>
        </Tooltip>
      ) : null}
      <TaskDialog
        open={dialogOpen}
        item={editingItem}
        titleFieldLabel="Task"
        titlePlaceholder="e.g. Understand CAP theorem"
        onOpenChange={setDialogOpen}
        onCreate={(input) => {
          const result = onCreate(input)
          return result.ok
        }}
        onUpdate={onUpdate}
      />
      <ConfirmDeleteAlert
        open={Boolean(pendingDelete)}
        onOpenChange={(open) => {
          if (!open) {
            setPendingDelete(null)
          }
        }}
        title="Delete this task?"
        description={
          pendingDelete
            ? `“${pendingDelete.title}” will be permanently deleted.`
            : "This task will be permanently deleted."
        }
        confirmLabel="Delete task"
        onConfirm={() => {
          if (pendingDelete) {
            onDelete(pendingDelete.id)
          }
        }}
      />
    </div>
  )
}

export function TopicRow({
  node,
  depth,
  childrenByParent,
  items,
  nodes,
  expandedIds,
  onToggleExpand,
  selectedNodeId,
  onSelect,
  onAddItem,
  getChecklistHandlers,
  editMode,
  focusedTaskId,
  subtreeProgressFor,
  draggedId,
  dropHint,
  onDragStartNode,
  onDragOverNode,
  onDropNode,
  onDragEndNode,
  getDraggedId,
  canDropOn,
}: {
  node: RoadmapNode
  depth: number
  childrenByParent: Map<string | null, RoadmapNode[]>
  items: ChecklistItem[]
  nodes: RoadmapNode[]
  expandedIds: Set<string>
  onToggleExpand: (nodeId: string) => void
  selectedNodeId: string | null
  onSelect: (nodeId: string) => void
  onAddItem: (nodeId: string, kind: TopicAddKind) => void
  getChecklistHandlers: (nodeId: string) => ChecklistHandlers
  editMode: boolean
  focusedTaskId: string | null
  subtreeProgressFor: (nodeId: string) => ProgressSnapshot
  draggedId: string | null
  dropHint: { nodeId: string; position: TreeDropPosition } | null
  onDragStartNode: (nodeId: string) => void
  onDragOverNode: (nodeId: string, position: TreeDropPosition) => void
  onDropNode: (nodeId: string, position: TreeDropPosition) => void
  onDragEndNode: () => void
  getDraggedId: () => string | null
  canDropOn: (nodeId: string, position: TreeDropPosition) => boolean
}) {
  const children = childrenByParent.get(node.id) ?? []
  const ownItems = items.filter((item) => item.topicId === node.id)
  const expanded = expandedIds.has(node.id)
  const subtree = subtreeProgressFor(node.id)
  const selected = selectedNodeId === node.id
  const description = node.description?.trim() ?? ""
  const isSubgroup = depth === 0
  const accent = inheritedAccentColor(nodes, node.id)
  const groupCount = children.length + ownItems.length
  const canExpand =
    Boolean(description) || ownItems.length > 0 || children.length > 0 || editMode
  const hasBody = expanded && canExpand
  const track = useTrackWorkspaceOptional()
  const { activeRole } = useRolesUi()
  const proposal = proposalForTopic(track?.proposals ?? [], node.id)
  const isGhost = proposal?.kind === "create"
  const proposalActions =
    proposal && track && activeRole ? (
      <span data-no-drag className="flex shrink-0 items-center gap-1">
        <Button
          type="button"
          size="sm"
          className="h-6 px-2 text-[11px]"
          onClick={(event) => {
            event.stopPropagation()
            void track.acceptProposal(activeRole.id, proposal.id)
          }}
        >
          Accept
        </Button>
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="h-6 px-2 text-[11px]"
          onClick={(event) => {
            event.stopPropagation()
            track.rejectProposal(proposal.id)
          }}
        >
          Reject
        </Button>
      </span>
    ) : null

  function showTopic() {
    onSelect(node.id)
  }

  function activateTopic() {
    showTopic()
    if (canExpand && !expanded) {
      onToggleExpand(node.id)
    }
  }

  function toggleTopic(event: { stopPropagation: () => void }) {
    event.stopPropagation()
    showTopic()
    if (canExpand) {
      onToggleExpand(node.id)
    }
  }

  const isDragging = draggedId === node.id
  const hint = dropHint?.nodeId === node.id ? dropHint.position : null

  function resolveDropPosition(event: DragEvent<HTMLElement>): TreeDropPosition | null {
    const dragging = getDraggedId()
    if (!dragging || dragging === node.id) {
      return null
    }

    const rect = event.currentTarget.getBoundingClientRect()
    const canNest = canDropOn(node.id, "inside")
    let position = dropPositionFromOffset(
      event.clientY - rect.top,
      rect.height,
      canNest
    )
    if (!canDropOn(node.id, position)) {
      position = dropPositionFromOffset(event.clientY - rect.top, rect.height, false)
      if (!canDropOn(node.id, position)) {
        return null
      }
    }
    return position
  }

  function handleDragOver(event: DragEvent<HTMLElement>) {
    const position = resolveDropPosition(event)
    if (!position) {
      return
    }

    event.preventDefault()
    event.stopPropagation()
    event.dataTransfer.dropEffect = "move"
    onDragOverNode(node.id, position)
  }

  function handleDrop(event: DragEvent<HTMLElement>) {
    event.preventDefault()
    event.stopPropagation()
    const position = resolveDropPosition(event) ?? hint
    if (!position) {
      onDragEndNode()
      return
    }
    onDropNode(node.id, position)
  }

  function handleRowDragStart(event: DragEvent<HTMLElement>) {
    const target = event.target as HTMLElement
    if (target.closest("button, input, label, a, [data-no-drag]")) {
      event.preventDefault()
      return
    }

    event.dataTransfer.setData("text/plain", node.id)
    event.dataTransfer.effectAllowed = "move"
    onDragStartNode(node.id)
  }

  const grip = editMode ? (
    <span
      aria-hidden
      className="flex size-6 shrink-0 cursor-grab items-center justify-center text-muted-foreground hover:text-foreground"
    >
      <GripVertical className="size-3.5" />
    </span>
  ) : (
    <span aria-hidden className="size-6 shrink-0" />
  )

  const dropClasses = cn(
    hint === "before" && "before:absolute before:inset-x-2 before:top-0 before:h-0.5 before:rounded-full before:bg-primary",
    hint === "after" && "after:absolute after:inset-x-2 after:bottom-0 after:h-0.5 after:rounded-full after:bg-primary",
    hint === "inside" && "ring-2 ring-primary/50"
  )

  const dragRowProps = editMode
    ? {
        draggable: true,
        onDragStart: handleRowDragStart,
        onDragEnd: () => onDragEndNode(),
        onDragEnter: handleDragOver,
        onDragOver: handleDragOver,
        onDrop: handleDrop,
      }
    : {}

  const actions = editMode ? (
    <div
      data-no-drag
      className="flex shrink-0 items-center"
    >
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              className="size-6"
              aria-label="Add to topic"
              onClick={(event) => {
                event.stopPropagation()
                showTopic()
              }}
            />
          }
        >
          <Plus className="size-3.5" />
        </DropdownMenuTrigger>
        <DropdownMenuContent
          align="end"
          className="min-w-40 w-auto"
          onClick={(event) => event.stopPropagation()}
        >
          <DropdownMenuGroup>
            <DropdownMenuItem
              onClick={() => {
                showTopic()
                onAddItem(node.id, "subtopic")
              }}
            >
              <ListTree />
              Subtopic
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => {
                showTopic()
                onAddItem(node.id, "task")
              }}
            >
              <SquareCheck />
              Task
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => {
                showTopic()
                onAddItem(node.id, "link")
              }}
            >
              <Link2 />
              Link
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => {
                showTopic()
                onAddItem(node.id, "notes")
              }}
            >
              <NotebookPen />
              Notes
            </DropdownMenuItem>
          </DropdownMenuGroup>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  ) : null

  const expandIcon = canExpand ? (
    <Button
      type="button"
      variant="ghost"
      size="icon-sm"
      className="size-6 shrink-0 text-muted-foreground"
      aria-label={expanded ? "Collapse" : "Expand"}
      onClick={toggleTopic}
    >
      {expanded ? (
        <ChevronDown className="size-3.5" />
      ) : (
        <ChevronRight className="size-3.5" />
      )}
    </Button>
  ) : (
    <span className="size-6 shrink-0" />
  )

  return (
    <li
      className="relative flex flex-col"
      id={`tree-topic-${node.id}`}
      data-tree-topic={node.id}
    >
      {depth > 0 ? (
        <span aria-hidden className="absolute -left-4 top-[18px] h-px w-4 bg-border/70" />
      ) : null}

      {isSubgroup ? (
        <div
          role="button"
          tabIndex={0}
          aria-expanded={canExpand ? expanded : undefined}
          className={cn(
            "group relative flex cursor-pointer items-center gap-1.5 rounded-md py-1 pr-1",
            isDragging && "opacity-50",
            isGhost && "border border-dashed border-primary/40 bg-primary/5",
            dropClasses
          )}
          onClick={activateTopic}
          onKeyDown={(event) => {
            if (event.key === "Enter" || event.key === " ") {
              event.preventDefault()
              activateTopic()
            }
          }}
          {...dragRowProps}
        >
          {grip}
          {expandIcon}
          <span className="flex min-w-0 flex-1 items-center gap-2 py-0.5 text-left">
            <span className="truncate text-sm font-medium text-muted-foreground">
              {node.title}
            </span>
            {groupCount > 0 ? (
              <span className="shrink-0 rounded-md bg-muted px-1.5 py-0.5 text-[11px] tabular-nums text-muted-foreground">
                {groupCount}
              </span>
            ) : null}
          </span>
          {subtree.total > 0 ? (
            <div className="hidden shrink-0 items-center gap-1.5 sm:flex">
              <div className="h-1.5 w-14 overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-primary transition-[width]"
                  style={{ width: `${subtree.percent}%` }}
                />
              </div>
              <span className="w-8 shrink-0 text-right text-[11px] tabular-nums text-muted-foreground">
                {subtree.percent}%
              </span>
            </div>
          ) : null}
          {proposalActions}
          {actions}
        </div>
      ) : (
        <div
          role="button"
          tabIndex={0}
          aria-expanded={canExpand ? expanded : undefined}
          className={cn(
            "group relative flex cursor-pointer items-center gap-2 rounded-lg border px-2 py-2 transition-colors",
            selected
              ? "border-primary/40 bg-accent shadow-sm"
              : "border-border/60 bg-card hover:border-border hover:bg-accent/40",
            isGhost && "border-dashed border-primary/50 bg-primary/5",
            isDragging && "opacity-50",
            dropClasses
          )}
          onClick={activateTopic}
          onKeyDown={(event) => {
            if (event.key === "Enter" || event.key === " ") {
              event.preventDefault()
              activateTopic()
            }
          }}
          {...dragRowProps}
        >
          {grip}
          {expandIcon}
          <span className="flex min-w-0 flex-1 items-center gap-2.5 py-0.5 text-left">
            {isSubgroup ? null : (
            <span
              className={cn(
                "flex size-7 shrink-0 items-center justify-center rounded-md",
                !accent && badgeClasses(node.id)
              )}
              style={accent ? accentIconStyle(accent) : undefined}
            >
              <NodeLucideIcon name={node.icon} className="size-4" />
            </span>
            )}
            <span className="min-w-0 flex-1 truncate text-sm font-medium">
              {node.title}
            </span>
            {!expanded && children.length > 0 ? (
              <span className="shrink-0 rounded-full bg-muted px-1.5 py-0.5 text-[10px] tabular-nums text-muted-foreground">
                {children.length}
              </span>
            ) : null}
          </span>
          {subtree.total > 0 ? (
            <div className="hidden shrink-0 items-center gap-1.5 sm:flex">
              <div className="h-1.5 w-14 overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-primary transition-[width]"
                  style={{ width: `${subtree.percent}%` }}
                />
              </div>
              <span className="w-8 shrink-0 text-right text-[11px] tabular-nums text-muted-foreground">
                {subtree.percent}%
              </span>
            </div>
          ) : null}
          {proposalActions}
          {actions}
        </div>
      )}

      {hasBody ? (
        <div
          className={cn(
            "flex flex-col",
            isSubgroup ? "pl-7" : "ml-5 border-l border-border/70 pl-4"
          )}
        >
          {description ? (
            <p
              className="cursor-pointer px-1 pt-1 pb-1.5 text-sm leading-5 text-muted-foreground"
              onClick={() => onSelect(node.id)}
            >
              {description}
            </p>
          ) : null}
          <TaskTickList
            items={ownItems}
            editing={editMode}
            focusedTaskId={focusedTaskId}
            onSelectTopic={showTopic}
            onToggle={getChecklistHandlers(node.id).onToggle}
            onCreate={getChecklistHandlers(node.id).onCreate}
            onUpdate={getChecklistHandlers(node.id).onUpdate}
            onDelete={getChecklistHandlers(node.id).onDelete}
            onReorder={getChecklistHandlers(node.id).onReorder}
          />
          {children.length > 0 ? (
            <ul className="flex flex-col gap-1.5 py-1.5">
              {children.map((child) => (
                <TopicRow
                  key={child.id}
                  node={child}
                  depth={depth + 1}
                  childrenByParent={childrenByParent}
                  items={items}
                  nodes={nodes}
                  expandedIds={expandedIds}
                  onToggleExpand={onToggleExpand}
                  selectedNodeId={selectedNodeId}
                  onSelect={onSelect}
                  onAddItem={onAddItem}
                  getChecklistHandlers={getChecklistHandlers}
                  editMode={editMode}
                  focusedTaskId={focusedTaskId}
                  subtreeProgressFor={subtreeProgressFor}
                  draggedId={draggedId}
                  dropHint={dropHint}
                  onDragStartNode={onDragStartNode}
                  onDragOverNode={onDragOverNode}
                  onDropNode={onDropNode}
                  onDragEndNode={onDragEndNode}
                  getDraggedId={getDraggedId}
                  canDropOn={canDropOn}
                />
              ))}
            </ul>
          ) : null}
        </div>
      ) : null}
    </li>
  )
}
