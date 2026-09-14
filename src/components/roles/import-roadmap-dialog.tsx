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
import { FieldGroup } from "@/components/ui/field"
import { useJsonFileDrop } from "@/hooks/use-json-file-drop"

export function ImportRoadmapDialog({
  open,
  onOpenChange,
  onImport,
  initialJson = "",
  initialError = null,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  onImport: (json: string) => Promise<RoleActionResult>
  initialJson?: string
  initialError?: string | null
}) {
  const [json, setJson] = useState("")
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [discardOpen, setDiscardOpen] = useState(false)
  const { isOver: isFileOver, dropProps } = useJsonFileDrop((text) => {
    setJson(text)
    setError(null)
  })

  useEffect(() => {
    if (open) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setJson(initialJson)
      setError(initialError)
      setPending(false)
      setDiscardOpen(false)
    }
  }, [open, initialError, initialJson])

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
        <DialogContent
          className={cn(
            "flex max-h-[min(90dvh,44rem)] w-full flex-col sm:max-w-lg",
            isFileOver && "outline-2 outline-dashed outline-offset-4 outline-ring"
          )}
          {...dropProps}
        >
          <DialogHeader>
            <DialogTitle>Import JSON</DialogTitle>
            <DialogDescription>
              Load a canonical roadmap into this empty role. Drop a .json file or
              choose one. The role name stays the same.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="flex min-h-0 flex-col">
            <div className="flex min-h-0 flex-col gap-4 overflow-y-auto">
              <FieldGroup className="min-w-0">
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
            </div>
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
