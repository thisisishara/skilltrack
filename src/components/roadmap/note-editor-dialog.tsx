"use client"

import { useEffect, useState } from "react"
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"
import { NOTE_TITLE_MAX, displayNoteTitle } from "@/domain/notes/title"
import { useIsLgUp } from "@/hooks/use-mobile"
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
  const lgUp = useIsLgUp()
  const [draftTitle, setDraftTitle] = useState(title)
  const [draftBody, setDraftBody] = useState(body)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!open) {
      return
    }
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setDraftTitle(title)
    setDraftBody(body)
    setError(null)
  }, [open, title, body])

  function submit() {
    const nextTitle = displayNoteTitle(draftTitle)
    if (!nextTitle) {
      setError("Note title cannot be empty.")
      return
    }
    onSave({ title: nextTitle, body: draftBody })
  }

  const editor = (
    <div className="flex min-h-0 flex-1 flex-col gap-3">
      <Field>
        <FieldLabel htmlFor="note-title">Title</FieldLabel>
        <Input
          id="note-title"
          value={draftTitle}
          maxLength={NOTE_TITLE_MAX}
          disabled={readOnly}
          placeholder="Short title"
          onChange={(event) => setDraftTitle(event.target.value)}
        />
      </Field>
      <Field className="min-h-0 flex-1">
        <FieldLabel htmlFor="note-body">Markdown</FieldLabel>
        <Textarea
          id="note-body"
          value={draftBody}
          disabled={readOnly}
          placeholder={"Write in markdown. Fenced mermaid blocks render in the preview.\n\n```mermaid\ngraph TD\n  A --> B\n```"}
          className="field-sizing-fixed min-h-48 flex-1 resize-none overflow-auto font-mono text-xs lg:min-h-0"
          onChange={(event) => setDraftBody(event.target.value)}
        />
      </Field>
    </div>
  )

  const preview = (
    <div className="min-h-48 flex-1 overflow-y-auto rounded-lg border bg-muted/30 p-3 lg:min-h-0">
      <NoteMarkdown source={draftBody} />
    </div>
  )

  return (
    <Dialog form open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex h-[min(90dvh,40rem)] w-full flex-col gap-4 overflow-hidden sm:max-w-4xl">
        <DialogHeader>
          <DialogTitle>{title.trim() ? title : "New note"}</DialogTitle>
          <DialogDescription>
            {readOnly
              ? "This note is still a pending Tracky change."
              : "Markdown note. Mermaid diagrams in fenced blocks show in the preview."}
          </DialogDescription>
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
          {lgUp ? (
            <div className="grid min-h-0 flex-1 grid-cols-2 gap-4">
              {editor}
              {preview}
            </div>
          ) : (
            <Tabs defaultValue="edit" className="min-h-0 flex-1">
              <TabsList>
                <TabsTrigger value="edit">Edit</TabsTrigger>
                <TabsTrigger value="preview">Preview</TabsTrigger>
              </TabsList>
              <TabsContent value="edit" className="min-h-0 flex-1 overflow-y-auto">
                {editor}
              </TabsContent>
              <TabsContent value="preview" className="min-h-0 flex-1">
                {preview}
              </TabsContent>
            </Tabs>
          )}
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
