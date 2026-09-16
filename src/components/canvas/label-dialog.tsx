"use client"

import { useEffect, useState, type FormEvent } from "react"
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
import {
  Field,
  FieldContent,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"

export type LabelDialogMode =
  | { kind: "create" }
  | { kind: "edit"; nodeId: string; title: string }

export function LabelDialog({
  open,
  onOpenChange,
  mode,
  onSubmit,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  mode: LabelDialogMode | null
  onSubmit: (title: string) => { ok: true } | { ok: false; message: string }
}) {
  const [title, setTitle] = useState("")
  const [error, setError] = useState<string | null>(null)
  const isEdit = mode?.kind === "edit"

  useEffect(() => {
    if (!open || !mode) {
      return
    }

    // Reset/populate whenever the dialog (re)opens.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setError(null)
    setTitle(mode.kind === "edit" ? mode.title : "")
  }, [open, mode])

  function handleSubmit(event: FormEvent) {
    event.preventDefault()
    const result = onSubmit(title)
    if (!result.ok) {
      setError(result.message)
      if (result.message && result.message !== "Label text cannot be empty.") {
        toast.error(result.message)
      }
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit label" : "Add label"}</DialogTitle>
          <DialogDescription>
            {isEdit
              ? "Update this canvas annotation."
              : "Place a short note on the canvas. Labels are not skills and do not connect to the tree."}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="grid gap-4">
          <FieldGroup>
            <Field orientation="horizontal" data-invalid={error ? true : undefined}>
              <FieldLabel htmlFor="canvas-label-title">
                Text
              </FieldLabel>
              <FieldContent>
                <Input
                  id="canvas-label-title"
                  value={title}
                  onChange={(event) => setTitle(event.target.value)}
                  placeholder="Focus area"
                  autoComplete="off"
                  aria-invalid={error ? true : undefined}
                />
                {error ? <FieldError>{error}</FieldError> : null}
              </FieldContent>
            </Field>
          </FieldGroup>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit">{isEdit ? "Save" : "Add label"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
