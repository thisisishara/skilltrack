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
import { useTrackWorkspace } from "@/components/track/track-workspace"
import { Textarea } from "@/components/ui/textarea"

type CreateMode = "empty" | "import" | "track"

export function CreateRoleDialog({
  open,
  onOpenChange,
  onCreateEmpty,
  onImport,
  onCreateWithTrack,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  onCreateEmpty: (name: string) => Promise<RoleActionResult>
  onImport: (json: string, nameOverride?: string) => Promise<RoleActionResult>
  onCreateWithTrack?: (name: string, brief: string) => Promise<RoleActionResult>
}) {
  const { settings } = useTrackWorkspace()
  const [name, setName] = useState("")
  const [json, setJson] = useState("")
  const [brief, setBrief] = useState("")
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
      setBrief("")
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

    if (mode === "track" && (!brief.trim() || !onCreateWithTrack)) {
      setPending(false)
      setError("Describe the role you want Track to build.")
      return
    }

    const result =
      mode === "empty"
        ? await onCreateEmpty(name)
        : mode === "track" && onCreateWithTrack
          ? await onCreateWithTrack(name, brief)
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
            "flex w-full flex-col sm:max-w-lg",
            mode === "import" && "max-h-[min(90dvh,44rem)]",
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
          <form onSubmit={handleSubmit} className="flex min-h-0 flex-col gap-6">
            <div
              className={cn(
                "flex flex-col gap-4",
                mode === "import" && "min-h-0 overflow-y-auto"
              )}
            >
              <FieldGroup className="min-w-0">
                <Field>
                  <FieldLabel>How to start</FieldLabel>
                  <ToggleGroup
                      value={[mode]}
                      onValueChange={(value) => {
                        const next = Array.isArray(value) ? value[0] : value
                        if (next === "empty" || next === "import" || next === "track") {
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
                      {settings.trackEnabled ? (
                        <ToggleGroupItem value="track" className="flex-1">
                          Ask Track
                        </ToggleGroupItem>
                      ) : null}
                    </ToggleGroup>
                    <FieldDescription>
                      Import onto a new role, or later onto a role that still has no
                      topics.
                    </FieldDescription>
                </Field>
                <Field
                  data-invalid={error && mode === "empty" ? true : undefined}
                >
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
                          : "Unique per account."}
                      </FieldDescription>
                    )}
                </Field>
                {mode === "track" ? (
                  <Field data-invalid={error && mode === "track" ? true : undefined}>
                    <FieldLabel htmlFor="create-role-brief">What should Track build?</FieldLabel>
                    <Textarea
                      id="create-role-brief"
                      value={brief}
                      onChange={(event) => {
                        setBrief(event.target.value)
                        setError(null)
                      }}
                      placeholder="Senior AI Engineer focused on RAG, evals, and production LLM ops."
                    />
                    {error ? <FieldError>{error}</FieldError> : (
                      <FieldDescription>
                        Track will propose a full roadmap. You accept or reject each change.
                      </FieldDescription>
                    )}
                  </Field>
                ) : null}
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
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={requestClose}>
                Cancel
              </Button>
              <Button type="submit" disabled={pending}>
                {pending
                  ? mode === "import"
                    ? "Importing…"
                    : mode === "track"
                      ? "Creating…"
                      : "Creating…"
                  : mode === "import"
                    ? "Import role"
                    : mode === "track"
                      ? "Create with Track"
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
