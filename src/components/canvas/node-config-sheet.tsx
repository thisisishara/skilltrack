"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { NotebookPen, XIcon } from "lucide-react"
import { toast } from "sonner"

import type { NodeActionResult } from "@/application/nodes/actions"
import { IconPicker } from "@/components/canvas/icon-picker"
import { NodeChecklistSection } from "@/components/canvas/node-checklist-section"
import { NodeHandleFields } from "@/components/canvas/node-handle-fields"
import { NodeLinksSection } from "@/components/canvas/node-links-section"
import { ProgressStatusBadge } from "@/components/canvas/progress-status-badge"
import { Button } from "@/components/ui/button"
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
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Progress, ProgressLabel, ProgressValue } from "@/components/ui/progress"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import { Textarea } from "@/components/ui/textarea"
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
  nodeProgress,
  subtreeProgress,
  onSaveDetails,
  onParentChange,
  onToggleChecklist,
  onCreateChecklist,
  onUpdateChecklist,
  onDeleteChecklist,
  onReorderChecklist,
  onCreateLink,
  onUpdateLink,
  onDeleteLink,
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
}) {
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [icon, setIcon] = useState("circle-dot")
  const [handleKind, setHandleKind] = useState<NodeHandleKind>("regular")
  const [notes, setNotes] = useState("")
  const [editingNotes, setEditingNotes] = useState(false)
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
    setHandleKind(node.handleKind)
    setNotes(node.notes ?? "")
    setEditingNotes(Boolean(node.notes))
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
    if (!nodeCanHaveParent(handleKind)) {
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
  }, [node, nodes, handleKind])

  const selectedParent =
    parentOptions.find((option) => option.id === (node?.parentId ?? ROOT_PARENT)) ??
    parentOptions[0]

  type DetailSnapshot = {
    title: string
    description: string
    icon: string
    notes: string
    handleKind: NodeHandleKind
  }

  function snapshotWith(patch: Partial<DetailSnapshot>): DetailSnapshot {
    return {
      title: patch.title ?? title,
      description: patch.description ?? description,
      icon: patch.icon ?? icon,
      notes: patch.notes ?? notes,
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

  if (!open || !node) {
    return null
  }

  return (
    <aside className="flex h-full min-h-0 flex-col bg-background">
            <div className="flex flex-col gap-3 border-b p-4">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <h2 className="font-heading truncate text-base font-medium">
                    {node.title}
                  </h2>
                  <p className="text-sm text-muted-foreground">
                    Configure evidence, notes, and links for this skill.
                  </p>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  aria-label="Close node configuration"
                  onClick={() => onOpenChange(false)}
                >
                  <XIcon />
                </Button>
              </div>
              <div className="flex flex-col gap-3">
                <div className="flex flex-wrap items-center gap-2">
                  <ProgressStatusBadge
                    status={nodeProgress.status}
                    percent={nodeProgress.percent}
                  />
                  <span className="text-xs text-muted-foreground">
                    {nodeProgress.completed}/{nodeProgress.total} evidence
                  </span>
                </div>
                <Progress value={nodeProgress.percent}>
                  <ProgressLabel>Node</ProgressLabel>
                  <ProgressValue>
                    {() => `${nodeProgress.percent}%`}
                  </ProgressValue>
                </Progress>
                <Progress value={subtreeProgress.percent}>
                  <ProgressLabel>Subtree</ProgressLabel>
                  <ProgressValue>
                    {() => `${subtreeProgress.percent}%`}
                  </ProgressValue>
                </Progress>
              </div>
            </div>
            <ScrollArea className="min-h-0 flex-1">
              <div className="flex flex-col gap-6 p-4">
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
                    <NodeHandleFields
                      handleKind={handleKind}
                      onHandleKindChange={(next) => {
                        setHandleKind(next)
                        persistDetailsNow({ handleKind: next })
                      }}
                      allowInput={!nodes.some((item) => item.parentId === node.id)}
                      allowOutput={!node.parentId}
                    />
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
                  {!editingNotes && !notes ? (
                    <Empty className="border border-dashed py-4">
                      <EmptyHeader>
                        <EmptyMedia variant="icon">
                          <NotebookPen />
                        </EmptyMedia>
                        <EmptyTitle>No notes</EmptyTitle>
                        <EmptyDescription>
                          Capture free-form notes for this skill.
                        </EmptyDescription>
                      </EmptyHeader>
                      <EmptyContent>
                        <Button type="button" size="sm" onClick={() => setEditingNotes(true)}>
                          Add notes
                        </Button>
                      </EmptyContent>
                    </Empty>
                  ) : (
                    <Field>
                      <FieldLabel htmlFor="sheet-node-notes">Notes</FieldLabel>
                      <Textarea
                        id="sheet-node-notes"
                        value={notes}
                        onChange={(event) => {
                          const next = event.target.value
                          setNotes(next)
                          scheduleDetails({ notes: next })
                        }}
                        onBlur={() => {
                          persistDetailsNow({ notes })
                          if (!notes.trim()) {
                            setEditingNotes(false)
                          }
                        }}
                        placeholder="What have you learned?"
                      />
                    </Field>
                  )}
                </section>
                <Separator />
                <section className="flex flex-col gap-3">
                  <h3 className="text-sm font-medium">Evidence checklist</h3>
                  <NodeChecklistSection
                    items={checklistItems}
                    onToggle={onToggleChecklist}
                    onCreate={onCreateChecklist}
                    onUpdate={onUpdateChecklist}
                    onDelete={onDeleteChecklist}
                    onReorder={onReorderChecklist}
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
              </div>
            </ScrollArea>
    </aside>
  )
}
