"use client"

import { useEffect, useState } from "react"
import { Eye, Pencil } from "lucide-react"
import { Streamdown } from "streamdown"
import { mermaid } from "@streamdown/mermaid"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Field, FieldError, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { NOTE_TITLE_MAX, displayNoteTitle } from "@/domain/notes/title"
import { cn } from "@/lib/utils"

import "streamdown/styles.css"

function NoteMarkdown({ source }: { source: string }) {
  return (
    <Streamdown
      className={cn(
        "text-sm leading-relaxed",
        "[&_p]:my-2 [&_p:first-child]:mt-0 [&_p:last-child]:mb-0",
        "[&_ul]:my-2 [&_ul]:list-disc [&_ul]:pl-4",
        "[&_ol]:my-2 [&_ol]:list-decimal [&_ol]:pl-4",
        "[&_h1]:mt-3 [&_h1]:mb-1 [&_h1]:text-base [&_h1]:font-semibold",
        "[&_h2]:mt-3 [&_h2]:mb-1 [&_h2]:text-sm [&_h2]:font-semibold",
        "[&_h3]:mt-2 [&_h3]:mb-1 [&_h3]:text-sm [&_h3]:font-medium",
        "[&_pre]:my-2 [&_pre]:overflow-x-auto [&_pre]:rounded-md [&_pre]:bg-muted [&_pre]:p-2",
        "[&_code]:font-mono [&_code]:text-xs"
      )}
      plugins={{ mermaid }}
    >
      {source.trim() ? source : "_Nothing to preview yet._"}
    </Streamdown>
  )
}

export function NoteEditorDialog({
  open,
  title,
  body,
  readOnly = false,
  onOpenChange,
  onSave,
  onDelete,
}: {
  open: boolean
  title: string
  body: string
  readOnly?: boolean
  onOpenChange: (open: boolean) => void
  onSave: (input: { title: string; body: string }) => void
  onDelete?: () => void
}) {
  const [draftTitle, setDraftTitle] = useState(title)
  const [draftBody, setDraftBody] = useState(body)
  const [error, setError] = useState<string | null>(null)
  const [mode, setMode] = useState<"edit" | "preview">("edit")

  useEffect(() => {
    if (!open) {
      return
    }
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setDraftTitle(title)
    setDraftBody(body)
    setError(null)
    setMode(readOnly ? "preview" : "edit")
  }, [open, title, body, readOnly])

  function submit() {
    const nextTitle = displayNoteTitle(draftTitle)
    if (!nextTitle) {
      setError("Note title cannot be empty.")
      return
    }
    onSave({ title: nextTitle, body: draftBody })
  }

  const isPreview = mode === "preview"

  return (
    <Dialog form open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex h-[min(90dvh,44rem)] w-full flex-col gap-4 overflow-hidden sm:max-w-3xl">
        <DialogHeader>
          <div className="flex items-start gap-2">
            <div className="min-w-0 flex-1">
              <DialogTitle>{title.trim() ? title : "New note"}</DialogTitle>
              <DialogDescription className="mt-0.5">
                {readOnly
                  ? "This note is a pending Tracky change."
                  : "Markdown · Mermaid diagrams render in preview."}
              </DialogDescription>
            </div>
            {!readOnly ? (
              <Button
                type="button"
                size="sm"
                variant="ghost"
                className="shrink-0"
                onClick={() => setMode(isPreview ? "edit" : "preview")}
                aria-label={isPreview ? "Switch to edit mode" : "Switch to preview mode"}
              >
                {isPreview ? (
                  <>
                    <Pencil data-icon="inline-start" />
                    Edit
                  </>
                ) : (
                  <>
                    <Eye data-icon="inline-start" />
                    Preview
                  </>
                )}
              </Button>
            ) : null}
          </div>
        </DialogHeader>
        <form
          className="flex min-h-0 flex-1 flex-col gap-4"
          onSubmit={(event) => {
            event.preventDefault()
            if (!readOnly) {
              submit()
            }
          }}
        >
          <div className="flex min-h-0 flex-1 flex-col gap-3">
            <Field>
              <FieldLabel htmlFor="note-title">Title</FieldLabel>
              <Input
                id="note-title"
                value={draftTitle}
                maxLength={NOTE_TITLE_MAX}
                disabled={readOnly || isPreview}
                placeholder="Short title"
                onChange={(event) => setDraftTitle(event.target.value)}
              />
            </Field>

            {isPreview ? (
              <div className="min-h-0 flex-1 overflow-y-auto rounded-lg border bg-muted/30 p-4">
                <NoteMarkdown source={draftBody} />
              </div>
            ) : (
              <Field className="min-h-0 flex-1">
                <FieldLabel htmlFor="note-body">Markdown</FieldLabel>
                <Textarea
                  id="note-body"
                  value={draftBody}
                  disabled={readOnly}
                  placeholder={"Write in markdown. Fenced mermaid blocks render in preview.\n\n```mermaid\ngraph TD\n  A --> B\n```"}
                  className="field-sizing-fixed min-h-48 flex-1 resize-none overflow-auto font-mono text-xs"
                  onChange={(event) => setDraftBody(event.target.value)}
                />
              </Field>
            )}
          </div>

          {error ? <FieldError>{error}</FieldError> : null}

          <DialogFooter>
            {onDelete && !readOnly ? (
              <Button
                type="button"
                variant="destructive"
                className="sm:mr-auto"
                onClick={onDelete}
              >
                Delete
              </Button>
            ) : null}
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              {readOnly ? "Close" : "Cancel"}
            </Button>
            {readOnly ? null : <Button type="submit">Save</Button>}
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
