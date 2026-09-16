"use client"

import { useEffect, useState, type FormEvent } from "react"
import { Plus } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import type { ChecklistItem } from "@/domain/checklists/types"

export type NodeChecklistCopy = {
  emptyTitle?: string
  emptyDescription?: string
  emptyAddLabel?: string
  addedToast?: string
  titleFieldLabel?: string
  titlePlaceholder?: string
  addButtonLabel?: string
}

export function NodeChecklistSection({
  onCreate,
  copy,
}: {
  onCreate: (input: { title: string; description: string }) => {
    ok: true
  } | { ok: false; message: string }
  copy?: NodeChecklistCopy
}) {
  const {
    addedToast = "Checklist item added",
    emptyAddLabel = "Add a checklist item",
    titleFieldLabel = "Item title",
    titlePlaceholder = "Understand CAP theorem",
    addButtonLabel = "Add item",
  } = copy ?? {}
  const [dialogOpen, setDialogOpen] = useState(false)

  return (
    <div className="flex flex-col gap-2">
      <p className="text-sm text-muted-foreground">
        Tasks live on the left. Add more from a topic’s + menu or here.
      </p>
      <div className="flex flex-wrap items-center gap-2">
        <Tooltip>
          <TooltipTrigger
            render={
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => setDialogOpen(true)}
              />
            }
          >
            <Plus data-icon="inline-start" />
            {addButtonLabel}
          </TooltipTrigger>
          <TooltipContent>{emptyAddLabel}</TooltipContent>
        </Tooltip>
      </div>
      <TaskDialog
        open={dialogOpen}
        item={null}
        titleFieldLabel={titleFieldLabel}
        titlePlaceholder={titlePlaceholder}
        onOpenChange={setDialogOpen}
        onCreate={(input) => {
          const result = onCreate(input)
          if (!result.ok) {
            toast.error(result.message)
            return false
          }
          toast.success(addedToast)
          return true
        }}
        onUpdate={() => undefined}
      />
    </div>
  )
}

export function TaskDialog({
  open,
  item,
  titleFieldLabel,
  titlePlaceholder,
  onOpenChange,
  onCreate,
  onUpdate,
}: {
  open: boolean
  item: ChecklistItem | null
  titleFieldLabel: string
  titlePlaceholder: string
  onOpenChange: (open: boolean) => void
  onCreate: (input: { title: string; description: string }) => boolean
  onUpdate: (item: ChecklistItem, title: string, description: string) => void
}) {
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const isEdit = Boolean(item)

  useEffect(() => {
    if (!open) {
      return
    }
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setTitle(item?.title ?? "")
    setDescription(item?.description ?? "")
  }, [open, item])

  function handleSubmit(event: FormEvent) {
    event.preventDefault()
    if (item) {
      onUpdate(item, title, description)
      onOpenChange(false)
      return
    }
    if (onCreate({ title, description })) {
      onOpenChange(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit task" : "Add task"}</DialogTitle>
          <DialogDescription>
            {isEdit
              ? "Update this task without changing its completion."
              : "Add a task to track what you need to learn here."}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="grid gap-6">
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="task-dialog-title">
                {titleFieldLabel}
              </FieldLabel>
              <Input
                id="task-dialog-title"
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                placeholder={titlePlaceholder}
                autoComplete="off"
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="task-dialog-description">
                Description
              </FieldLabel>
              <Textarea
                id="task-dialog-description"
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                placeholder="Optional detail"
                className="field-sizing-fixed max-h-40 min-h-24 resize-y overflow-auto"
              />
            </Field>
          </FieldGroup>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit">{isEdit ? "Save" : "Add task"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
