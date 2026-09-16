"use client"

import { useEffect, useState, type FormEvent } from "react"
import { toast } from "sonner"

import type { NodeActionResult } from "@/application/nodes/actions"
import { IconPicker } from "@/components/roadmap/icon-picker"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import {
  DEFAULT_NODE_HANDLE_KIND,
  type NodeHandleKind,
} from "@/domain/nodes/handle"
import { DEFAULT_NODE_ICON } from "@/domain/nodes/icon"

export type NodeDialogMode =
  | { kind: "create"; parentId: string | null; asGroup?: boolean }
  | { kind: "edit"; nodeId: string; title: string; description: string | null; icon: string }

export type NodeDialogCopy = {
  createTitle?: string
  createDescription?: string
  childTitle?: string
  childDescription?: string
  editTitle?: string
  editDescription?: string
  titlePlaceholder?: string
  descriptionPlaceholder?: string
  submitCreateLabel?: string
  submitChildLabel?: string
}

export function NodeDialog({
  open,
  onOpenChange,
  mode,
  onSubmit,
  copy,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  mode: NodeDialogMode | null
  onSubmit: (input: {
    title: string
    description: string
    icon: string
    handleKind: NodeHandleKind
  }) => Promise<NodeActionResult>
  copy?: NodeDialogCopy
}) {
  const {
    createTitle = "Add topic",
    createDescription = "Add a top-level topic to this roadmap.",
    childTitle = "Add sub-topic",
    childDescription = "Create a sub-topic nested under the selected topic.",
    editTitle = "Edit topic",
    editDescription = "Update this topic without changing its progress.",
    titlePlaceholder = "Retrieval",
    descriptionPlaceholder = "Optional notes about this topic",
    submitCreateLabel = "Add topic",
    submitChildLabel,
  } = copy ?? {}
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [icon, setIcon] = useState(DEFAULT_NODE_ICON)
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const isEdit = mode?.kind === "edit"
  const isChild = mode?.kind === "create" && mode.parentId !== null && !mode.asGroup

  useEffect(() => {
    if (!open || !mode) {
      return
    }

    // Reset/populate form fields whenever the dialog (re)opens or its mode
    // changes, without resetting on every keystroke while editing.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setPending(false)
    setError(null)

    if (mode.kind === "edit") {
      setTitle(mode.title)
      setDescription(mode.description ?? "")
      setIcon(mode.icon)
      return
    }

    setTitle("")
    setDescription("")
    setIcon(DEFAULT_NODE_ICON)
  }, [open, mode])

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setPending(true)
    setError(null)
    const result = await onSubmit({
      title,
      description,
      icon,
      handleKind: DEFAULT_NODE_HANDLE_KIND,
    })
    setPending(false)

    if (!result.ok) {
      setError(result.message)
      if (result.code !== "validation") {
        toast.error(result.message)
      }
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isEdit ? editTitle : isChild ? childTitle : createTitle}</DialogTitle>
          <DialogDescription>
            {isEdit ? editDescription : isChild ? childDescription : createDescription}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="grid gap-6">
          <FieldGroup>
            <Field data-invalid={error ? true : undefined}>
              <FieldLabel htmlFor="node-title">Title</FieldLabel>
              <Input
                id="node-title"
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                placeholder={titlePlaceholder}
                autoComplete="off"
                aria-invalid={error ? true : undefined}
              />
              {error ? <FieldError>{error}</FieldError> : null}
            </Field>
            <Field>
              <FieldLabel htmlFor="node-description">Description</FieldLabel>
              <Textarea
                id="node-description"
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                placeholder={descriptionPlaceholder}
                className="field-sizing-fixed max-h-40 min-h-24 resize-y overflow-auto"
              />
            </Field>
            <Field>
              <FieldLabel>Icon</FieldLabel>
              <IconPicker value={icon} onChange={setIcon} />
            </Field>
          </FieldGroup>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={pending}>
              {pending
                ? "Saving…"
                : isEdit
                  ? "Save"
                  : isChild
                    ? (submitChildLabel ?? submitCreateLabel)
                    : submitCreateLabel}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
