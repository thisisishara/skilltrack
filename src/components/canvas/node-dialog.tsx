"use client"

import { useEffect, useState, type FormEvent } from "react"
import { toast } from "sonner"

import type { NodeActionResult } from "@/application/nodes/actions"
import { IconPicker } from "@/components/canvas/icon-picker"
import { NodeHandleFields } from "@/components/canvas/node-handle-fields"
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
  | { kind: "create"; parentId: string | null }
  | { kind: "edit"; nodeId: string; title: string; description: string | null; icon: string }

export function NodeDialog({
  open,
  onOpenChange,
  mode,
  onSubmit,
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
}) {
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [icon, setIcon] = useState(DEFAULT_NODE_ICON)
  const [handleKind, setHandleKind] = useState<NodeHandleKind>(DEFAULT_NODE_HANDLE_KIND)
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const isEdit = mode?.kind === "edit"
  const isChild = mode?.kind === "create" && mode.parentId !== null

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
    setHandleKind(DEFAULT_NODE_HANDLE_KIND)
  }, [open, mode])

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setPending(true)
    setError(null)
    const result = await onSubmit({
      title,
      description,
      icon,
      handleKind,
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
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit node" : isChild ? "Add child" : "Create node"}</DialogTitle>
          <DialogDescription>
            {isEdit
              ? "Update this node without changing its identity or progress."
              : isChild
                ? "Create a child node under the selected parent."
                : "Add a root node to this roadmap."}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="grid gap-4">
          <FieldGroup>
            <Field data-invalid={error ? true : undefined}>
              <FieldLabel htmlFor="node-title">Title</FieldLabel>
              <Input
                id="node-title"
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                placeholder="Retrieval"
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
                placeholder="Optional notes about this skill"
              />
            </Field>
            <Field>
              <FieldLabel>Icon</FieldLabel>
              <IconPicker value={icon} onChange={setIcon} />
            </Field>
            <NodeHandleFields
              handleKind={handleKind}
              onHandleKindChange={setHandleKind}
              allowInput
              allowOutput={!isChild}
            />
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
              {pending ? "Saving…" : isEdit ? "Save" : "Create node"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
