"use client"

import { useEffect, useState, type FormEvent } from "react"
import { CircleAlert } from "lucide-react"
import { toast } from "sonner"

import type { RoleActionResult } from "@/application/roles/actions"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
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
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"

type CreateMode = "empty" | "import"

export function CreateRoleDialog({
  open,
  onOpenChange,
  onSubmit,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (name: string) => Promise<RoleActionResult>
}) {
  const [name, setName] = useState("")
  const [mode, setMode] = useState<CreateMode>("empty")
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (open) {
      setName("")
      setMode("empty")
      setError(null)
      setPending(false)
    }
  }, [open])

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    if (mode !== "empty") {
      setError("JSON import is not available yet.")
      return
    }

    setPending(true)
    setError(null)
    const result = await onSubmit(name)
    setPending(false)

    if (!result.ok) {
      setError(result.message)
      if (result.code !== "validation" && result.code !== "conflict") {
        toast.error(result.message)
      }
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create Role</DialogTitle>
          <DialogDescription>
            Start an empty roadmap for this role. Importing JSON will be
            available later.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="grid gap-4">
          <FieldGroup>
            <Field>
              <FieldLabel>How to start</FieldLabel>
              <ToggleGroup
                value={[mode]}
                onValueChange={(value) => {
                  const next = Array.isArray(value) ? value[0] : value
                  if (next === "empty" || next === "import") {
                    setMode(next)
                    setError(null)
                  }
                }}
                variant="outline"
                spacing={0}
                className="w-full"
              >
                <ToggleGroupItem value="empty" className="flex-1">
                  Empty roadmap
                </ToggleGroupItem>
                <ToggleGroupItem value="import" className="flex-1" disabled>
                  Import JSON
                </ToggleGroupItem>
              </ToggleGroup>
              <FieldDescription>
                Import is only allowed while creating a role, and lands in a
                later phase.
              </FieldDescription>
            </Field>
            <Field data-invalid={error ? true : undefined}>
              <FieldLabel htmlFor="create-role-name">Name</FieldLabel>
              <Input
                id="create-role-name"
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="Senior AI Engineer"
                autoComplete="off"
                aria-invalid={error ? true : undefined}
              />
              {error ? <FieldError>{error}</FieldError> : null}
            </Field>
          </FieldGroup>
          {error && error === "JSON import is not available yet." ? (
            <Alert variant="destructive">
              <CircleAlert />
              <AlertTitle>Import unavailable</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          ) : null}
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={pending}>
              {pending ? "Creating…" : "Create role"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
