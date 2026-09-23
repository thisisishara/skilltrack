"use client"

import { useEffect, useRef, useState } from "react"
import { Eye, FileText, Pencil, Trash2 } from "lucide-react"
import { Streamdown } from "streamdown"
import { mermaid } from "@streamdown/mermaid"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog"
import { NOTE_TITLE_MAX, displayNoteTitle } from "@/domain/notes/title"
import { cn } from "@/lib/utils"

import "streamdown/styles.css"

// ---------------------------------------------------------------------------
// Prose renderer
// ---------------------------------------------------------------------------

function NoteMarkdown({ source }: { source: string }) {
  return (
    <Streamdown
      className={cn(
        "text-sm text-foreground",
        // base
        "leading-7",
        // headings
        "[&_h1]:mt-8 [&_h1]:mb-4 [&_h1:first-child]:mt-0 [&_h1]:text-lg [&_h1]:font-bold [&_h1]:tracking-tight",
        "[&_h2]:mt-6 [&_h2]:mb-3 [&_h2:first-child]:mt-0 [&_h2]:text-base [&_h2]:font-semibold",
        "[&_h3]:mt-5 [&_h3]:mb-2 [&_h3:first-child]:mt-0 [&_h3]:text-sm [&_h3]:font-semibold",
        // paragraphs
        "[&_p]:my-4 [&_p:first-child]:mt-0 [&_p:last-child]:mb-0",
        // lists
        "[&_ul]:my-4 [&_ul:first-child]:mt-0 [&_ul]:list-disc [&_ul]:pl-5",
        "[&_ol]:my-4 [&_ol:first-child]:mt-0 [&_ol]:list-decimal [&_ol]:pl-5",
        "[&_li]:my-1.5",
        "[&_li>ul]:mt-2 [&_li>ol]:mt-2",
        // code
        "[&_code]:rounded-md [&_code]:bg-muted [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:font-mono [&_code]:text-xs",
        "[&_pre]:my-5 [&_pre]:overflow-x-auto [&_pre]:rounded-xl [&_pre]:bg-muted [&_pre]:p-4",
        "[&_pre_code]:bg-transparent [&_pre_code]:p-0",
        // blockquote
        "[&_blockquote]:my-5 [&_blockquote]:border-l-2 [&_blockquote]:border-muted-foreground/30 [&_blockquote]:pl-4 [&_blockquote]:text-muted-foreground",
        // links
        "[&_a]:underline [&_a]:decoration-muted-foreground/40 [&_a]:underline-offset-2 hover:[&_a]:decoration-foreground",
        // misc
        "[&_strong]:font-semibold",
        "[&_hr]:my-8 [&_hr]:border-muted",
        // tables
        "[&_table]:my-4 [&_table]:w-full [&_table]:text-sm",
        "[&_th]:border-b [&_th]:pb-2 [&_th]:text-left [&_th]:font-medium",
        "[&_td]:border-b [&_td]:border-muted [&_td]:py-2 [&_td]:pr-4"
      )}
      plugins={{ mermaid }}
    >
      {source}
    </Streamdown>
  )
}

// ---------------------------------------------------------------------------
// Segmented control (Edit | Preview)
// ---------------------------------------------------------------------------

function ModeToggle({
  mode,
  onChange,
}: {
  mode: "edit" | "preview"
  onChange: (m: "edit" | "preview") => void
}) {
  return (
    <div
      role="group"
      aria-label="Editor mode"
      className="flex items-center gap-0.5 rounded-lg border border-border/60 bg-muted/40 p-0.5"
    >
      {(["edit", "preview"] as const).map((m) => (
        <button
          key={m}
          type="button"
          aria-pressed={mode === m}
          onClick={() => onChange(m)}
          className={cn(
            "flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium capitalize transition-all select-none",
            mode === m
              ? "bg-background text-foreground shadow-sm ring-1 ring-border/40"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          {m === "edit" ? <Pencil className="size-3" /> : <Eye className="size-3" />}
          {m}
        </button>
      ))}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Empty preview placeholder
// ---------------------------------------------------------------------------

function EmptyPreview() {
  return (
    <div className="flex flex-col items-center gap-3 py-12 text-center">
      <div className="flex size-10 items-center justify-center rounded-xl bg-muted">
        <FileText className="size-5 text-muted-foreground/50" />
      </div>
      <div className="space-y-1">
        <p className="text-sm font-medium text-muted-foreground">Nothing to preview</p>
        <p className="text-xs text-muted-foreground/60">
          Switch to Edit and start writing in Markdown.
        </p>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Main dialog
// ---------------------------------------------------------------------------

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
  const titleRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!open) return
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setDraftTitle(title)
    setDraftBody(body)
    setError(null)
    setMode(readOnly ? "preview" : "edit")
  }, [open, title, body, readOnly])

  // Focus title on open (new note)
  useEffect(() => {
    if (open && !readOnly && !title.trim()) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setTimeout(() => titleRef.current?.focus(), 50)
    }
  }, [open, title, readOnly])

  function submit() {
    const nextTitle = displayNoteTitle(draftTitle)
    if (!nextTitle) {
      setError("Give your note a title before saving.")
      titleRef.current?.focus()
      return
    }
    onSave({ title: nextTitle, body: draftBody })
  }

  const isPreview = mode === "preview"
  const charCount = draftBody.length

  return (
    <Dialog form open={open} onOpenChange={onOpenChange}>
      {/*
       * Override the default DialogContent layout to get a true
       * document-editor feel: remove all default padding/gap so we
       * can control every zone individually.
       */}
      <DialogContent
        className={cn(
          // Size
          "h-[min(90dvh,46rem)] max-h-[min(90dvh,46rem)] w-full sm:max-w-2xl",
          // Layout override
          "flex flex-col gap-0 overflow-hidden p-0",
        )}
      >
        {/* Accessible title (visually hidden — the raw input IS the title) */}
        <DialogTitle className="sr-only">
          {draftTitle.trim() || "Untitled note"}
        </DialogTitle>

        {/* ── Title zone ─────────────────────────────────────────── */}
        <div className="shrink-0 px-6 pt-6 pb-4 pr-14">
          <input
            ref={titleRef}
            type="text"
            id="note-title"
            value={draftTitle}
            onChange={(e) => {
              setDraftTitle(e.target.value)
              setError(null)
            }}
            disabled={readOnly}
            maxLength={NOTE_TITLE_MAX}
            placeholder="Untitled note"
            autoComplete="off"
            className={cn(
              "w-full bg-transparent font-heading text-xl font-semibold leading-snug",
              "text-foreground placeholder:text-muted-foreground/35",
              "focus:outline-none",
              "disabled:cursor-default disabled:select-none",
            )}
          />
          {error ? (
            <p className="mt-1.5 text-xs text-destructive">{error}</p>
          ) : null}
        </div>

        {/* ── Toolbar ────────────────────────────────────────────── */}
        <div className="flex shrink-0 items-center justify-between border-y border-border/60 bg-muted/20 px-6 py-2">
          {/* Left: contextual hint */}
          <span className="text-xs text-muted-foreground/70 tabular-nums">
            {readOnly ? (
              <span className="italic">Tracky draft · read-only</span>
            ) : charCount > 0 ? (
              `${charCount.toLocaleString()} char${charCount === 1 ? "" : "s"}`
            ) : (
              "Markdown & Mermaid supported"
            )}
          </span>

          {/* Right: mode toggle */}
          {!readOnly ? (
            <ModeToggle mode={mode} onChange={setMode} />
          ) : null}
        </div>

        {/* ── Content area ───────────────────────────────────────── */}
        <form
          className="flex min-h-0 flex-1 flex-col"
          onSubmit={(e) => {
            e.preventDefault()
            if (!readOnly) submit()
          }}
        >
          <div className="min-h-0 flex-1 overflow-hidden">
            {isPreview ? (
              <div className="h-full overflow-y-auto px-6 py-5">
                {draftBody.trim() ? (
                  <NoteMarkdown source={draftBody} />
                ) : (
                  <EmptyPreview />
                )}
              </div>
            ) : (
              <textarea
                id="note-body"
                value={draftBody}
                onChange={(e) => setDraftBody(e.target.value)}
                disabled={readOnly}
                spellCheck
                placeholder={
                  "Start writing…\n\nMarkdown is fully supported. Mermaid diagrams will render in preview:\n\n```mermaid\ngraph TD\n  A[Start] --> B[Finish]\n```"
                }
                className={cn(
                  "h-full w-full resize-none",
                  "bg-transparent px-6 py-5",
                  "font-mono text-[0.8125rem] leading-7 text-foreground",
                  "placeholder:text-muted-foreground/35 focus:outline-none",
                  "overflow-y-auto",
                  "disabled:cursor-default",
                )}
              />
            )}
          </div>

          {/* ── Footer ─────────────────────────────────────────────── */}
          <div
            className={cn(
              "flex shrink-0 items-center justify-end gap-2",
              "border-t border-border/60 bg-muted/20 px-5 py-3",
            )}
          >
            {onDelete && !readOnly ? (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="mr-auto gap-1.5 text-muted-foreground hover:bg-destructive/8 hover:text-destructive"
                onClick={onDelete}
              >
                <Trash2 className="size-3.5" />
                Delete
              </Button>
            ) : null}

            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="text-muted-foreground hover:text-foreground"
              onClick={() => onOpenChange(false)}
            >
              {readOnly ? "Close" : "Cancel"}
            </Button>

            {!readOnly ? (
              <Button type="submit" size="sm">
                Save note
              </Button>
            ) : null}
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
