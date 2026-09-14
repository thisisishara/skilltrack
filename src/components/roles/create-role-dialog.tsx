"use client"

import { useEffect, useState, type FormEvent } from "react"
import { CircleAlert } from "lucide-react"
import { toast } from "sonner"
import { cn } from "cn"

import type { RoleActionResult } from "@/application/roles/actions"
import { ImportJsonFields } from "@/components/roles/import-json-fields"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
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
import { useJsonFileDrop } from "@/hooks/use-json-file-drop"

type CreateMode = "empty" | "import"

export function CreateRoleDialog({
  open,
  onOpenChange,
  onCreateEmpty,
  onImport,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  onCreateEmpty: (name: string) => Promise<RoleActionResult>
  onImport: (json: string, nameOverride?: string) => Promise<RoleActionResult>
}) {
  const [name, setName] = useState("")
  const [json, setJson] = useState("")
  const [mode, setMode] = useState<CreateMode>("empty")
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [discardOpen, setDiscardOpen] = useState(false)
  const { isOver: isFileOver, dropProps } = useJsonFileDrop((text) => {
    setMode("import")
    setJson(text)
    setError(null)
  })

  useEffect(() => {
    if (open) {
      // Reset the form each time the dialog opens for a fresh role.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setName("")
      setJson("")
      setMode("empty")
      setError(null)
      setPending(false)
      setDiscardOpen(false)
    }
  }, [open])

  function requestClose() {
    if (mode === "import" && json.trim()) {
      setDiscardOpen(true)
      return
    }
    onOpenChange(false)
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setPending(true)
    setError(null)

    if (mode === "import" && !json.trim()) {
      setPending(false)
      setError("Choose a JSON file or paste a roadmap document.")
      return
    }

    const result =
      mode === "empty"
        ? await onCreateEmpty(name)
        : await onImport(json, name.trim() ? name : undefined)

    setPending(false)

    if (!result.ok) {
      setError(result.message)
      if (result.code !== "validation" && result.code !== "conflict") {
        toast.error(result.message)
      }
    }
  }

  return (
    <>
      <Dialog
        open={open}
        onOpenChange={(next) => {
          if (!next) {
            requestClose()
            return
          }
          onOpenChange(true)
        }}
      >
        <DialogContent
          className={cn(
            "flex max-h-[min(90dvh,44rem)] w-full flex-col overflow-hidden sm:max-w-lg",
            isFileOver && "outline-2 outline-dashed outline-offset-4 outline-ring"
          )}
          {...dropProps}
        >
          <DialogHeader>
            <DialogTitle>Create Role</DialogTitle>
            <DialogDescription>
              Start an empty roadmap or drop a JSON file to import one.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="grid min-h-0 gap-4 overflow-y-auto">
            <FieldGroup className="min-w-0">
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
                  <ToggleGroupItem value="import" className="flex-1">
                    Import JSON
                  </ToggleGroupItem>
                </ToggleGroup>
                <FieldDescription>
                  Import onto a new role, or later onto a role that still has no
                  nodes.
                </FieldDescription>
              </Field>
              <Field data-invalid={error && mode === "empty" ? true : undefined}>
                <FieldLabel htmlFor="create-role-name">
                  {mode === "import" ? "Name override (optional)" : "Name"}
                </FieldLabel>
                <Input
                  id="create-role-name"
                  className="font-mono"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  placeholder="Senior AI Engineer"
                  autoComplete="off"
                  aria-invalid={error && mode === "empty" ? true : undefined}
                />
                {mode === "empty" && error ? <FieldError>{error}</FieldError> : (
                  <FieldDescription>
                    {mode === "import"
                      ? "Leave blank to use the name from the JSON document."
                      : "Unique per account, case-insensitive."}
                  </FieldDescription>
                )}
              </Field>
              {mode === "import" ? (
                <ImportJsonFields
                  json={json}
                  error={error}
                  onJsonChange={(value) => {
                    setJson(value)
                    setError(null)
                  }}
                />
              ) : null}
            </FieldGroup>
            {error && mode === "import" ? (
              <Alert variant="destructive">
                <CircleAlert />
                <AlertTitle>Import failed</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            ) : null}
            <DialogFooter>
              <Button type="button" variant="outline" onClick={requestClose}>
                Cancel
              </Button>
              <Button type="submit" disabled={pending}>
                {pending
                  ? mode === "import"
                    ? "Importing…"
                    : "Creating…"
                  : mode === "import"
                    ? "Import role"
                    : "Create role"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
      <AlertDialog open={discardOpen} onOpenChange={setDiscardOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Discard this import?</AlertDialogTitle>
            <AlertDialogDescription>
              The JSON you entered will not be saved.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep editing</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                setDiscardOpen(false)
                onOpenChange(false)
              }}
            >
              Discard
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
