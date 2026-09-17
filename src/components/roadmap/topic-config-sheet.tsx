"use client"

import { useEffect, useRef, useState } from "react"
import { NotebookPen, Pencil, Trash2, XIcon } from "lucide-react"
import { toast } from "sonner"

import type { TopicActionResult } from "@/application/topics/actions"
import { AccentColorField } from "@/components/roadmap/accent-color-field"
import { IconPicker } from "@/components/roadmap/icon-picker"
import {
  TopicTasksSection,
  type TopicTasksCopy,
} from "@/components/roadmap/topic-tasks-section"
import { TopicLinksSection } from "@/components/roadmap/topic-links-section"
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
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty"
import {
  Field,
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
import { ConfirmDeleteAlert } from "@/components/ui/confirm-delete-alert"
import type { ChecklistItem } from "@/domain/tasks/types"
import type { NodeLink } from "@/domain/links/types"
import type { RoadmapNode } from "@/domain/topics/types"
import { displayNodeTitle } from "@/domain/topics/title"
import type { ProgressSnapshot } from "@/domain/progress/progress"

export function TopicConfigSheet({
  open,
  onOpenChange,
  node,
  checklistItems,
  links,
  nodeProgress: _nodeProgress,
  subtreeProgress,
  onSaveDetails,
  onToggleChecklist: _onToggleChecklist,
  onCreateChecklist,
  onUpdateChecklist: _onUpdateChecklist,
  onDeleteChecklist: _onDeleteChecklist,
  onReorderChecklist: _onReorderChecklist,
  onCreateLink,
  onUpdateLink,
  onDeleteLink,
  onDelete,
  onClearRoadmap,
  canClearRoadmap = false,
  showChecklist = true,
  showIcon = true,
  showClose = true,
  showProgressBar = true,
  editMode = false,
  mode = "topic",
  fallbackTitle,
  subtitle,
  checklistHeading = "Tasks",
  checklistCopy,
  deleteLabel = "Delete topic",
  hasNestedTopics = false,
  canInheritAccent = true,
  overviewDescription = "",
  overviewNotes = "",
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  node: RoadmapNode | null
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
    nestedAccents?: "keep" | "apply"
  }) => Promise<TopicActionResult>
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
  onClearRoadmap?: () => Promise<void>
  canClearRoadmap?: boolean
  showChecklist?: boolean
  showIcon?: boolean
  showClose?: boolean
  showProgressBar?: boolean
  editMode?: boolean
  mode?: "overview" | "topic"
  fallbackTitle?: string
  subtitle?: string
  checklistHeading?: string
  checklistCopy?: TopicTasksCopy
  deleteLabel?: string
  hasNestedTopics?: boolean
  canInheritAccent?: boolean
  overviewDescription?: string | null
  overviewNotes?: string | null
}) {
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [icon, setIcon] = useState("circle-dot")
  const [accentColor, setAccentColor] = useState<string | null>(null)
  const [notes, setNotes] = useState("")
  const [notesOpen, setNotesOpen] = useState(false)
  const [clearOpen, setClearOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [pendingAccent, setPendingAccent] = useState<string | null | undefined>(
    undefined
  )
  const persistTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const accentChoiceRef = useRef<"keep" | "apply" | null>(null)
  const selectedNodeId = node?.id ?? null

  useEffect(() => {
    return () => {
      if (persistTimer.current) {
        clearTimeout(persistTimer.current)
      }
    }
  }, [])

  useEffect(() => {
    if (!open) {
      return
    }

    if (persistTimer.current) {
      clearTimeout(persistTimer.current)
      persistTimer.current = null
    }

    if (mode === "overview") {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setTitle(fallbackTitle ?? "Roadmap")
      setDescription(overviewDescription ?? "")
      setNotes(overviewNotes ?? "")
      setNotesOpen(false)
      setError(null)
      return
    }

    if (!node) {
      return
    }

    // Re-sync when the selected node or panel open state changes, not on
    // every autosave that updates the same node.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setTitle(node.title)
    setDescription(node.description ?? "")
    setIcon(node.icon)
    setAccentColor(node.color)
    setNotes(node.notes ?? "")
    setNotesOpen(false)
    setError(null)
    // selectedNodeId/open are enough; including `node` would reset the form
    // on every optimistic autosave of the same node.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedNodeId, open, mode, fallbackTitle, overviewDescription, overviewNotes])

  type DetailSnapshot = {
    title: string
    description: string
    icon: string
    notes: string
    accentColor: string | null
    nestedAccents?: "keep" | "apply"
  }

  function snapshotWith(patch: Partial<DetailSnapshot>): DetailSnapshot {
    const accentPending = pendingAccent !== undefined && !patch.nestedAccents
    return {
      title: patch.title ?? title,
      description: patch.description ?? description,
      icon: patch.icon ?? icon,
      notes: patch.notes ?? notes,
      accentColor: accentPending
        ? (node?.color ?? null)
        : patch.accentColor !== undefined
          ? patch.accentColor
          : accentColor,
      nestedAccents: patch.nestedAccents,
    }
  }

  function confirmNestedAccent(choice: "keep" | "apply") {
    const next = pendingAccent ?? null
    accentChoiceRef.current = choice
    setPendingAccent(undefined)
    persistDetailsNow({ accentColor: next, nestedAccents: choice })
  }

  function cancelNestedAccent() {
    if (accentChoiceRef.current) {
      accentChoiceRef.current = null
      setPendingAccent(undefined)
      return
    }
    setAccentColor(node?.color ?? null)
    setPendingAccent(undefined)
  }

  function flushDetails(next: DetailSnapshot) {
    if (mode !== "overview" && !displayNodeTitle(next.title)) {
      setError("Topic title cannot be empty.")
      return
    }

    if (mode === "overview") {
      if (
        !next.nestedAccents &&
        (next.description.trim() || null) === (overviewDescription?.trim() || null) &&
        (next.notes.trim() || null) === (overviewNotes?.trim() || null)
      ) {
        return
      }
    } else if (
      node &&
      !next.nestedAccents &&
      next.title === node.title &&
      (next.description.trim() || null) === node.description &&
      next.icon === node.icon &&
      (next.notes.trim() || null) === node.notes &&
      next.accentColor === node.color
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
                {fallbackTitle || "Roadmap"}
              </h2>
              {editMode ? (
                <Field className="mt-3">
                  <FieldLabel htmlFor="roadmap-description">Description</FieldLabel>
                  <Textarea
                    id="roadmap-description"
                    value={description}
                    onChange={(event) => {
                      const next = event.target.value
                      setDescription(next)
                      scheduleDetails({ description: next })
                    }}
                    onBlur={() => persistDetailsNow({ description })}
                    placeholder="What this roadmap covers"
                    className="field-sizing-fixed max-h-40 min-h-24 resize-y overflow-auto"
                  />
                </Field>
              ) : description.trim() ? (
                <p className="mt-1.5 text-sm leading-6 text-muted-foreground text-pretty">
                  {description}
                </p>
              ) : null}
            </div>
            <Progress value={subtreeProgress.percent}>
              <ProgressLabel className="text-xs">Overall</ProgressLabel>
              <ProgressValue className="text-xs">
                {() => `${subtreeProgress.percent}%`}
              </ProgressValue>
            </Progress>
            <Separator />
            <section className="flex flex-col gap-3">
              <h3 className="text-sm font-medium">Notes</h3>
              <NotesSection
                notes={notes}
                emptyDescription="Capture free-form notes for this roadmap."
                editable={editMode}
                onEdit={() => setNotesOpen(true)}
              />
            </section>
            <Separator />
            <section className="flex flex-col gap-3">
              <h3 className="text-sm font-medium">Links</h3>
              <TopicLinksSection
                links={links}
                editable={editMode}
                onCreate={onCreateLink}
                onUpdate={onUpdateLink}
                onDelete={onDeleteLink}
              />
            </section>
            {canClearRoadmap && onClearRoadmap ? (
              <>
                <Separator />
                <section className="flex flex-col gap-3">
                  <h3 className="text-sm font-medium">Delete roadmap</h3>
                  <p className="text-sm text-muted-foreground">
                    Remove every topic, task, note, and link. This role stays in the
                    sidebar so you can start over or import again.
                  </p>
                  <Button
                    type="button"
                    variant="destructive"
                    onClick={() => setClearOpen(true)}
                  >
                    <Trash2 data-icon="inline-start" />
                    Delete roadmap
                  </Button>
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
        <ConfirmDeleteAlert
          open={clearOpen}
          onOpenChange={setClearOpen}
          title="Delete this roadmap?"
          description="All topics, tasks, notes, and links will be removed. The role is kept."
          confirmLabel="Delete roadmap"
          onConfirm={async () => {
            await onClearRoadmap?.()
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
                  {subtitle ?? "Configure tasks, notes, and links for this topic."}
                </p>
              </div>
              {showClose ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  aria-label="Close topic details"
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
          {editMode ? (
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
                        placeholder="Short summary of this topic"
                        className="field-sizing-fixed max-h-40 min-h-24 resize-y overflow-auto"
                      />
                    </Field>
                    <AccentColorField
                      value={accentColor}
                      canInherit={canInheritAccent}
                      onChange={(next) => {
                        setAccentColor(next)
                        if (hasNestedTopics && next !== node?.color) {
                          if (persistTimer.current) {
                            clearTimeout(persistTimer.current)
                            persistTimer.current = null
                          }
                          setPendingAccent(next)
                          return
                        }
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
                </FieldGroup>
          ) : null}
                <Separator />
                <section className="flex flex-col gap-3">
                  <h3 className="text-sm font-medium">Notes</h3>
                <NotesSection
                  notes={notes}
                  emptyDescription="Capture free-form notes for this topic."
                  editable={editMode}
                  onEdit={() => setNotesOpen(true)}
                />
                </section>
                {showChecklist && editMode ? (
                  <>
                    <Separator />
                    <section className="flex flex-col gap-3">
                      <h3 className="text-sm font-medium">{checklistHeading}</h3>
                      <TopicTasksSection
                        onCreate={onCreateChecklist}
                        copy={checklistCopy}
                      />
                    </section>
                  </>
                ) : null}
                <Separator />
                <section className="flex flex-col gap-3">
                  <h3 className="text-sm font-medium">Links</h3>
                  <TopicLinksSection
                    links={links}
                    editable={editMode}
                    onCreate={onCreateLink}
                    onUpdate={onUpdateLink}
                    onDelete={onDeleteLink}
                  />
                </section>
                {editMode && onDelete ? (
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
        <Dialog
          open={pendingAccent !== undefined}
          onOpenChange={(next) => {
            if (!next) {
              cancelNestedAccent()
            }
          }}
        >
          <DialogContent
            className="sm:max-w-md"
            showCloseButton={false}
          >
            <DialogHeader>
              <DialogTitle>Update nested topic colors?</DialogTitle>
              <DialogDescription>
                {node
                  ? `“${displayNodeTitle(node.title)}” includes other topics. Apply this color to those topics too, or leave their colors as they are.`
                  : "This topic includes other topics. Apply this color to those topics too, or leave their colors as they are."}
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button
                type="button"
                variant="ghost"
                onClick={cancelNestedAccent}
              >
                Cancel
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => confirmNestedAccent("keep")}
              >
                Keep current colors
              </Button>
              <Button
                type="button"
                onClick={() => confirmNestedAccent("apply")}
              >
                Update nested topics
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
    </aside>
  )
}

function NotesSection({
  notes,
  emptyDescription,
  editable = true,
  onEdit,
}: {
  notes: string
  emptyDescription: string
  editable?: boolean
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
        {editable ? (
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
        ) : null}
      </Empty>
    )
  }

  return (
    <div className="flex flex-col gap-2">
      <p className="text-sm leading-6 text-pretty whitespace-pre-wrap">{notes}</p>
      {editable ? (
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
      ) : null}
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
          className="grid gap-6"
          onSubmit={(event) => {
            event.preventDefault()
            onSave(draft)
          }}
        >
          <Field>
            <FieldLabel htmlFor="notes-dialog">Notes</FieldLabel>
            <Textarea
              id="notes-dialog"
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              placeholder="What have you learned?"
              className="field-sizing-fixed max-h-72 min-h-36 resize-y overflow-auto"
            />
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
