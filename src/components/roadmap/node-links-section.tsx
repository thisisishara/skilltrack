"use client"

import { useEffect, useState, type FormEvent } from "react"
import { Link2, Pencil, Plus, Trash2 } from "lucide-react"
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
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty"
import { Field, FieldContent, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { faviconUrlFor } from "@/domain/links/url"
import type { NodeLink } from "@/domain/links/types"

export function NodeLinksSection({
  links,
  onCreate,
  onUpdate,
  onDelete,
}: {
  links: NodeLink[]
  onCreate: (input: { label: string; url: string }) => string | null
  onUpdate: (link: NodeLink, label: string, url: string) => string | null
  onDelete: (linkId: string) => void
}) {
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<NodeLink | null>(null)

  function openCreate() {
    setEditing(null)
    setDialogOpen(true)
  }

  function openEdit(link: NodeLink) {
    setEditing(link)
    setDialogOpen(true)
  }

  return (
    <div className="flex flex-col gap-3">
      {links.length === 0 ? (
        <Empty className="border border-dashed py-4">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <Link2 />
            </EmptyMedia>
            <EmptyTitle>No links</EmptyTitle>
            <EmptyDescription>
              Add documentation, courses, or references for this skill.
            </EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <Tooltip>
              <TooltipTrigger
                render={<Button type="button" size="sm" onClick={openCreate} />}
              >
                Add a link
              </TooltipTrigger>
              <TooltipContent>Add a link</TooltipContent>
            </Tooltip>
          </EmptyContent>
        </Empty>
      ) : (
        <>
          <ul className="flex flex-col">
            {links.map((link) => (
              <li
                key={link.id}
                className="group flex items-start gap-2 rounded-lg px-1 py-1.5 hover:bg-accent/40"
              >
                <LinkFavicon key={link.url} url={link.url} />
                <div className="min-w-0 flex-1">
                  <a
                    href={link.url}
                    target="_blank"
                    rel="noreferrer"
                    className="text-sm font-medium underline-offset-3 hover:underline"
                  >
                    {link.label}
                  </a>
                  <p className="truncate text-xs text-muted-foreground">{link.url}</p>
                </div>
                <div className="flex shrink-0 opacity-0 group-hover:opacity-100 group-focus-within:opacity-100">
                  <Tooltip>
                    <TooltipTrigger
                      render={
                        <Button
                          type="button"
                          size="icon-sm"
                          variant="ghost"
                          aria-label="Edit link"
                          onClick={() => openEdit(link)}
                        />
                      }
                    >
                      <Pencil />
                    </TooltipTrigger>
                    <TooltipContent>Edit link</TooltipContent>
                  </Tooltip>
                  <Tooltip>
                    <TooltipTrigger
                      render={
                        <Button
                          type="button"
                          size="icon-sm"
                          variant="ghost"
                          aria-label="Delete link"
                          onClick={() => {
                            onDelete(link.id)
                            toast.success("Link deleted")
                          }}
                        />
                      }
                    >
                      <Trash2 />
                    </TooltipTrigger>
                    <TooltipContent>Delete link</TooltipContent>
                  </Tooltip>
                </div>
              </li>
            ))}
          </ul>
          <Tooltip>
            <TooltipTrigger
              render={
                <Button type="button" size="sm" variant="outline" onClick={openCreate} />
              }
            >
              <Plus data-icon="inline-start" />
              Add link
            </TooltipTrigger>
            <TooltipContent>Add link</TooltipContent>
          </Tooltip>
        </>
      )}
      <LinkDialog
        open={dialogOpen}
        link={editing}
        onOpenChange={setDialogOpen}
        onCreate={(label, url) => {
          const message = onCreate({ label, url })
          if (message) {
            return message
          }
          toast.success("Link added")
          return null
        }}
        onUpdate={(link, label, url) => onUpdate(link, label, url)}
      />
    </div>
  )
}

function LinkFavicon({ url }: { url: string }) {
  const [failed, setFailed] = useState(false)
  const src = faviconUrlFor(url)

  if (!src || failed) {
    return (
      <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground [&_svg]:size-3">
        <Link2 />
      </span>
    )
  }

  return (
    // Favicons come from the site host via Google's public icon service.
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt=""
      width={20}
      height={20}
      className="mt-0.5 size-5 shrink-0 rounded-sm"
      onError={() => setFailed(true)}
    />
  )
}

export function LinkDialog({
  open,
  link,
  onOpenChange,
  onCreate,
  onUpdate,
}: {
  open: boolean
  link: NodeLink | null
  onOpenChange: (open: boolean) => void
  onCreate: (label: string, url: string) => string | null
  onUpdate: (link: NodeLink, label: string, url: string) => string | null
}) {
  const [label, setLabel] = useState("")
  const [url, setUrl] = useState("")
  const [error, setError] = useState<string | null>(null)
  const isEdit = Boolean(link)

  useEffect(() => {
    if (!open) {
      return
    }
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLabel(link?.label ?? "")
    setUrl(link?.url ?? "")
    setError(null)
  }, [open, link])

  function handleSubmit(event: FormEvent) {
    event.preventDefault()
    const message = link
      ? onUpdate(link, label, url)
      : onCreate(label, url)
    if (message) {
      setError(message)
      return
    }
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit link" : "Add link"}</DialogTitle>
          <DialogDescription>
            {isEdit
              ? "Update this reference without leaving the sidebar."
              : "Add documentation, courses, or other references."}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="grid gap-4">
          <FieldGroup>
            <Field orientation="horizontal">
              <FieldLabel htmlFor="link-dialog-label">
                Label
              </FieldLabel>
              <FieldContent>
                <Input
                  id="link-dialog-label"
                  value={label}
                  onChange={(event) => setLabel(event.target.value)}
                  placeholder="Official documentation"
                  autoComplete="off"
                />
              </FieldContent>
            </Field>
            <Field orientation="horizontal" data-invalid={error ? true : undefined}>
              <FieldLabel htmlFor="link-dialog-url">
                URL
              </FieldLabel>
              <FieldContent>
                <Input
                  id="link-dialog-url"
                  value={url}
                  onChange={(event) => setUrl(event.target.value)}
                  placeholder="https://example.com"
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
            <Button type="submit">{isEdit ? "Save" : "Add link"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
