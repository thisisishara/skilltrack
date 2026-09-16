"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { NotebookPen, Pencil, Trash2, XIcon } from "lucide-react"
import { toast } from "sonner"

import type { NodeActionResult } from "@/application/nodes/actions"
import { AccentColorField } from "@/components/roadmap/accent-color-field"
import { IconPicker } from "@/components/roadmap/icon-picker"
import {
  NodeChecklistSection,
  type NodeChecklistCopy,
} from "@/components/roadmap/node-checklist-section"
import { NodeLinksSection } from "@/components/roadmap/node-links-section"
import { ProgressStatusBadge } from "@/components/roadmap/progress-status-badge"
import { Button } from "@/components/ui/button"
import { Progress, ProgressLabel, ProgressValue } from "@/components/ui/progress"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import { Textarea } from "@/components/ui/textarea"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import {
  Combobox,
  ComboboxCollection,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
} from "@/components/ui/combobox"
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty"
import {
  Field,
  FieldContent,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import type { ChecklistItem } from "@/domain/checklists/types"
import type { NodeLink } from "@/domain/links/types"
import { wouldCreateCycle } from "@/domain/nodes/hierarchy"
import {
  nodeCanHaveChildren,
  nodeCanHaveParent,
  type NodeHandleKind,
} from "@/domain/nodes/handle"
import type { RoadmapNode } from "@/domain/nodes/types"
import { displayNodeTitle } from "@/domain/nodes/title"
import type { ProgressSnapshot } from "@/domain/progress/progress"

const ROOT_PARENT = "__none__"

type ParentOption = {
  id: string
  title: string
}

export function NodeConfigSheet({
  open,
  onOpenChange,
  node,
  nodes,
  checklistItems,
  links,
  nodeProgress: _nodeProgress,
  subtreeProgress,
  onSaveDetails,
  onParentChange,
  onToggleChecklist: _onToggleChecklist,
  onCreateChecklist,
  onUpdateChecklist: _onUpdateChecklist,
  onDeleteChecklist: _onDeleteChecklist,
  onReorderChecklist: _onReorderChecklist,
  onCreateLink,
  onUpdateLink,
  onDeleteLink,
  onDelete,
  showChecklist = true,
  showIcon = true,
  showClose = true,
  showProgressBar = true,
  mode = "topic",
  fallbackTitle,
  subtitle,
  checklistHeading = "Evidence checklist",
  checklistCopy,
  deleteLabel = "Delete topic",
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  node: RoadmapNode | null
  nodes: RoadmapNode[]
  checklistItems: ChecklistItem[]
  links: NodeLink[]
  nodeProgress: ProgressSnapshot
  subtreeProgress: ProgressSnapshot
  onSaveDetails: (input: {
    title: string
    description: string
    icon: string
    notes: string
    accentColor: string | null
    handleKind: NodeHandleKind
  }) => Promise<NodeActionResult>
  onParentChange: (parentId: string | null) => Promise<void>
  onToggleChecklist: (itemId: string, isCompleted: boolean) => Promise<void>
  onCreateChecklist: (input: { title: string; description: string }) => {
    ok: true
  } | { ok: false; message: string }
  onUpdateChecklist: (item: ChecklistItem, title: string, description: string) => void
  onDeleteChecklist: (itemId: string) => void
  onReorderChecklist: (orderedIds: string[]) => void
  onCreateLink: (input: { label: string; url: string }) => string | null
  onUpdateLink: (link: NodeLink, label: string, url: string) => string | null
  onDeleteLink: (linkId: string) => void
  onDelete?: () => void
  showChecklist?: boolean
  showIcon?: boolean
  showClose?: boolean
  showProgressBar?: boolean
  mode?: "overview" | "topic"
  fallbackTitle?: string
  subtitle?: string
  checklistHeading?: string
  checklistCopy?: NodeChecklistCopy
  deleteLabel?: string
}) {
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [icon, setIcon] = useState("circle-dot")
  const [accentColor, setAccentColor] = useState<string | null>(null)
  const [handleKind, setHandleKind] = useState<NodeHandleKind>("regular")
  const [notes, setNotes] = useState("")
  const [notesOpen, setNotesOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const persistTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const selectedNodeId = node?.id ?? null

  useEffect(() => {
    return () => {
      if (persistTimer.current) {
        clearTimeout(persistTimer.current)
      }
    }
  }, [])

  useEffect(() => {
    if (!node || !open) {
      return
    }

    if (persistTimer.current) {
      clearTimeout(persistTimer.current)
      persistTimer.current = null
    }

    // Re-sync when the selected node or panel open state changes, not on
    // every autosave that updates the same node.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setTitle(node.title)
    setDescription(node.description ?? "")
    setIcon(node.icon)
    setAccentColor(node.accentColor)
    setHandleKind(node.handleKind)
    setNotes(node.notes ?? "")
    setNotesOpen(false)
    setError(null)
    // selectedNodeId/open are enough; including `node` would reset the form
    // on every optimistic autosave of the same node.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedNodeId, open])

  const parentOptions = useMemo<ParentOption[]>(() => {
    if (!node) {
      return [{ id: ROOT_PARENT, title: "No parent" }]
    }

    const options: ParentOption[] = [{ id: ROOT_PARENT, title: "No parent" }]
    if (!nodeCanHaveParent(node.handleKind)) {
      return options
    }

    for (const candidate of nodes) {
      if (candidate.id === node.id) {
        continue
      }

      if (!nodeCanHaveChildren(candidate.handleKind)) {
        continue
      }

      if (wouldCreateCycle(nodes, node.id, candidate.id)) {
        continue
      }

      options.push({ id: candidate.id, title: candidate.title })
    }

    return options
  }, [node, nodes])

  const selectedParent =
    parentOptions.find((option) => option.id === (node?.parentId ?? ROOT_PARENT)) ??
    parentOptions[0]

  type DetailSnapshot = {
    title: string
    description: string
    icon: string
    notes: string
    accentColor: string | null
    handleKind: NodeHandleKind
  }

  function snapshotWith(patch: Partial<DetailSnapshot>): DetailSnapshot {
    return {
      title: patch.title ?? title,
      description: patch.description ?? description,
      icon: patch.icon ?? icon,
      notes: patch.notes ?? notes,
      accentColor: patch.accentColor !== undefined ? patch.accentColor : accentColor,
      handleKind: patch.handleKind ?? handleKind,
    }
  }

  function flushDetails(next: DetailSnapshot) {
    if (!displayNodeTitle(next.title)) {
      setError("Node title cannot be empty.")
      return
    }

    if (
      node &&
      next.title === node.title &&
      (next.description.trim() || null) === node.description &&
      next.icon === node.icon &&
      (next.notes.trim() || null) === node.notes &&
      next.accentColor === node.accentColor &&
      next.handleKind === node.handleKind
    ) {
      return
    }

    setError(null)
    void onSaveDetails(next).then((result) => {
      if (!result.ok) {
        setError(result.message)
        if (result.code !== "validation") {
          toast.error(result.message)
        }
      }
    })
  }

  function scheduleDetails(patch: Partial<DetailSnapshot>) {
    const next = snapshotWith(patch)
    if (persistTimer.current) {
      clearTimeout(persistTimer.current)
    }
    persistTimer.current = setTimeout(() => {
      persistTimer.current = null
      flushDetails(next)
    }, 350)
  }

  function persistDetailsNow(patch: Partial<DetailSnapshot>) {
    if (persistTimer.current) {
      clearTimeout(persistTimer.current)
      persistTimer.current = null
    }
    flushDetails(snapshotWith(patch))
  }

  if (!open) {
    return null
  }

  if (mode === "overview") {
    return (
      <aside
        className="flex h-full min-h-0 flex-col bg-background"
        aria-labelledby="node-config-title"
      >
        <ScrollArea className="min-h-0 flex-1">
          <div className="flex flex-col gap-6 p-4">
            <div className="min-w-0">
              <h2
                id="node-config-title"
                className="font-heading text-base font-medium text-pretty"
              >
                {node?.title || fallbackTitle || "Roadmap"}
              </h2>
              {node?.description ? (
                <p className="mt-1.5 text-sm leading-6 text-muted-foreground text-pretty">
                  {node.description}
                </p>
              ) : null}
            </div>
            <Progress value={subtreeProgress.percent}>
              <ProgressLabel className="text-xs">Overall</ProgressLabel>
              <ProgressValue className="text-xs">
                {() => `${subtreeProgress.percent}%`}
              </ProgressValue>
            </Progress>
            {node ? (
              <>
                <Separator />
                <section className="flex flex-col gap-3">
                  <h3 className="text-sm font-medium">Notes</h3>
                <NotesSection
                  notes={notes}
                  emptyDescription="Capture free-form notes for this roadmap."
                  onEdit={() => setNotesOpen(true)}
                />
                </section>
                <Separator />
                <section className="flex flex-col gap-3">
                  <h3 className="text-sm font-medium">Links</h3>
                  <NodeLinksSection
                    links={links}
                    onCreate={onCreateLink}
                    onUpdate={onUpdateLink}
                    onDelete={onDeleteLink}
                  />
                </section>
              </>
            ) : null}
          </div>
        </ScrollArea>
        <NotesDialog
          open={notesOpen}
          notes={notes}
          onOpenChange={setNotesOpen}
          onSave={(next) => {
            setNotes(next)
            persistDetailsNow({ notes: next })
            setNotesOpen(false)
          }}
        />
      </aside>
    )
  }

  if (!node) {
    return null
  }

  return (
    <aside
      className="flex h-full min-h-0 flex-col bg-background"
      aria-labelledby="node-config-title"
    >
      <ScrollArea className="min-h-0 flex-1">
        <div className="flex flex-col gap-6 p-4">
          <div className="flex flex-col gap-3">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <h2
                  id="node-config-title"
                  className="font-heading truncate text-base font-medium"
                >
                  {node.title}
                </h2>
                <p className="text-sm text-muted-foreground">
                  {subtitle ?? "Configure evidence, notes, and links for this skill."}
                </p>
              </div>
              {showClose ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  aria-label="Close node configuration"
                  onClick={() => onOpenChange(false)}
                >
                  <XIcon />
                </Button>
              ) : null}
            </div>
            {showProgressBar ? (
              <div className="flex flex-col gap-3">
                <div className="flex flex-wrap items-center gap-2">
                  <ProgressStatusBadge
                    status={subtreeProgress.status}
                    percent={subtreeProgress.percent}
                  />
                  {subtreeProgress.total > 0 ? (
                    <span className="text-xs tabular-nums text-muted-foreground">
                      {subtreeProgress.completed}/{subtreeProgress.total} tasks
                    </span>
                  ) : null}
                </div>
                <Progress value={subtreeProgress.percent}>
                  <ProgressLabel className="text-xs">Progress</ProgressLabel>
                  <ProgressValue className="text-xs">
                    {() => `${subtreeProgress.percent}%`}
                  </ProgressValue>
                </Progress>
              </div>
            ) : (
              <p className="text-sm tabular-nums text-muted-foreground">
                {subtreeProgress.percent}%
              </p>
            )}
          </div>
          <FieldGroup>
                    <Field data-invalid={error ? true : undefined}>
                      <FieldLabel htmlFor="sheet-node-title">Title</FieldLabel>
                      <Input
                        id="sheet-node-title"
                        value={title}
                        onChange={(event) => {
                          const next = event.target.value
                          setTitle(next)
                          scheduleDetails({ title: next })
                        }}
                        onBlur={() => persistDetailsNow({ title })}
                        autoComplete="off"
                        aria-invalid={error ? true : undefined}
                      />
                      {error ? <FieldError>{error}</FieldError> : null}
                    </Field>
                    <Field>
                      <FieldLabel htmlFor="sheet-node-description">Description</FieldLabel>
                      <Textarea
                        id="sheet-node-description"
                        value={description}
                        onChange={(event) => {
                          const next = event.target.value
                          setDescription(next)
                          scheduleDetails({ description: next })
                        }}
                        onBlur={() => persistDetailsNow({ description })}
                        placeholder="Short summary of this skill"
                      />
                    </Field>
                    <AccentColorField
                      value={accentColor}
                      onChange={(next) => {
                        setAccentColor(next)
                        persistDetailsNow({ accentColor: next })
                      }}
                    />
                    {showIcon ? (
                      <Field>
                        <FieldLabel>Icon</FieldLabel>
                        <IconPicker
                          value={icon}
                          onChange={(next) => {
                            setIcon(next)
                            persistDetailsNow({ icon: next })
                          }}
                        />
                      </Field>
                    ) : null}
                    <Field>
                      <FieldLabel>Parent</FieldLabel>
                      <Combobox
                        items={parentOptions}
                        value={selectedParent}
                        onValueChange={(option: ParentOption | null) => {
                          if (!option || !node) {
                            return
                          }

                          const parentId = option.id === ROOT_PARENT ? null : option.id
                          if (parentId === node.parentId) {
                            return
                          }

                          void onParentChange(parentId)
                        }}
                        itemToStringLabel={(item) => item?.title ?? ""}
                      >
                        <ComboboxInput showClear={false} className="w-full" />
                        <ComboboxContent>
                          <ComboboxEmpty>No matching nodes.</ComboboxEmpty>
                          <ComboboxList>
                            <ComboboxCollection>
                              {(item: ParentOption) => (
                                <ComboboxItem key={item.id} value={item}>
                                  {item.title}
                                </ComboboxItem>
                              )}
                            </ComboboxCollection>
                          </ComboboxList>
                        </ComboboxContent>
                      </Combobox>
                    </Field>
                </FieldGroup>
                <Separator />
                <section className="flex flex-col gap-3">
                  <h3 className="text-sm font-medium">Notes</h3>
                <NotesSection
                  notes={notes}
                  emptyDescription="Capture free-form notes for this skill."
                  onEdit={() => setNotesOpen(true)}
                />
                </section>
                {showChecklist ? (
                  <>
                    <Separator />
                    <section className="flex flex-col gap-3">
                      <h3 className="text-sm font-medium">{checklistHeading}</h3>
                      <NodeChecklistSection
                        onCreate={onCreateChecklist}
                        copy={checklistCopy}
                      />
                    </section>
                  </>
                ) : null}
                <Separator />
                <section className="flex flex-col gap-3">
                  <h3 className="text-sm font-medium">Links</h3>
                  <NodeLinksSection
                    links={links}
                    onCreate={onCreateLink}
                    onUpdate={onUpdateLink}
                    onDelete={onDeleteLink}
                  />
                </section>
                {onDelete ? (
                  <>
                    <Separator />
                    <Tooltip>
                      <TooltipTrigger
                        render={
                          <Button
                            type="button"
                            variant="destructive"
                            onClick={onDelete}
                          />
                        }
                      >
                        <Trash2 data-icon="inline-start" />
                        {deleteLabel}
                      </TooltipTrigger>
                      <TooltipContent>{deleteLabel}</TooltipContent>
                    </Tooltip>
                  </>
                ) : null}
              </div>
            </ScrollArea>
        <NotesDialog
          open={notesOpen}
          notes={notes}
          onOpenChange={setNotesOpen}
          onSave={(next) => {
            setNotes(next)
            persistDetailsNow({ notes: next })
            setNotesOpen(false)
          }}
        />
    </aside>
  )
}

function NotesSection({
  notes,
  emptyDescription,
  onEdit,
}: {
  notes: string
  emptyDescription: string
  onEdit: () => void
}) {
  if (!notes.trim()) {
    return (
      <Empty className="border border-dashed py-4">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <NotebookPen />
          </EmptyMedia>
          <EmptyTitle>No notes</EmptyTitle>
          <EmptyDescription>{emptyDescription}</EmptyDescription>
        </EmptyHeader>
        <EmptyContent>
          <Tooltip>
            <TooltipTrigger
              render={<Button type="button" size="sm" onClick={onEdit} />}
            >
              Add notes
            </TooltipTrigger>
            <TooltipContent>Add notes</TooltipContent>
          </Tooltip>
        </EmptyContent>
      </Empty>
    )
  }

  return (
    <div className="flex flex-col gap-2">
      <p className="text-sm leading-6 text-pretty whitespace-pre-wrap">{notes}</p>
      <Tooltip>
        <TooltipTrigger
          render={
            <Button type="button" size="sm" variant="outline" onClick={onEdit} />
          }
        >
          <Pencil data-icon="inline-start" />
          Edit notes
        </TooltipTrigger>
        <TooltipContent>Edit notes</TooltipContent>
      </Tooltip>
    </div>
  )
}

export function NotesDialog({
  open,
  notes,
  onOpenChange,
  onSave,
}: {
  open: boolean
  notes: string
  onOpenChange: (open: boolean) => void
  onSave: (notes: string) => void
}) {
  const [draft, setDraft] = useState(notes)

  useEffect(() => {
    if (!open) {
      return
    }
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setDraft(notes)
  }, [open, notes])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{notes.trim() ? "Edit notes" : "Add notes"}</DialogTitle>
          <DialogDescription>
            Capture free-form notes for this topic.
          </DialogDescription>
        </DialogHeader>
        <form
          className="grid gap-4"
          onSubmit={(event) => {
            event.preventDefault()
            onSave(draft)
          }}
        >
          <Field orientation="horizontal">
            <FieldLabel htmlFor="notes-dialog">
              Notes
            </FieldLabel>
            <FieldContent>
              <Textarea
                id="notes-dialog"
                value={draft}
                onChange={(event) => setDraft(event.target.value)}
                placeholder="What have you learned?"
                className="field-sizing-fixed min-h-40"
              />
            </FieldContent>
          </Field>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit">Save</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
