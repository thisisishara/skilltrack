"use client"

import { useEffect, useState, type FormEvent } from "react"
import { CircleAlert } from "lucide-react"
import { toast } from "sonner"

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
import { FieldGroup } from "@/components/ui/field"

export function ImportRoadmapDialog({
  open,
  onOpenChange,
  onImport,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  onImport: (json: string) => Promise<RoleActionResult>
}) {
  const [json, setJson] = useState("")
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [discardOpen, setDiscardOpen] = useState(false)

  useEffect(() => {
    if (open) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setJson("")
      setError(null)
      setPending(false)
      setDiscardOpen(false)
    }
  }, [open])

  function requestClose() {
    if (json.trim()) {
      setDiscardOpen(true)
      return
    }
    onOpenChange(false)
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    if (!json.trim()) {
      setError("Choose a JSON file or paste a roadmap document.")
      return
    }

    setPending(true)
    setError(null)
    const result = await onImport(json)
    setPending(false)

    if (!result.ok) {
      setError(result.message)
      if (result.code !== "validation" && result.code !== "conflict") {
        toast.error(result.message)
      }
      return
    }

    onOpenChange(false)
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
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Import JSON</DialogTitle>
            <DialogDescription>
              Load a canonical roadmap into this empty role. The role name stays
              the same.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="grid gap-4">
            <FieldGroup>
              <ImportJsonFields json={json} error={error} onJsonChange={(value) => {
                setJson(value)
                setError(null)
              }} />
            </FieldGroup>
            {error ? (
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
                {pending ? "Importing…" : "Import"}
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
