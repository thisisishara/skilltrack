"use client"

import { useEffect, useRef, useState, type FormEvent } from "react"
import { CheckIcon, CopyIcon, Link2, Pencil, Plus, Trash2 } from "lucide-react"
import { toast } from "sonner"

import { previewLinkTitleAction } from "@/application/links/actions"
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
import { ConfirmDeleteAlert } from "@/components/ui/confirm-delete-alert"
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Spinner } from "@/components/ui/spinner"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { defaultLinkLabel, faviconUrlFor, isValidHttpUrl, normalizeLinkUrl } from "@/domain/links/url"
import type { NodeLink } from "@/domain/links/types"

export function TopicLinksSection({
  links,
  editable = true,
  onCreate,
  onUpdate,
  onDelete,
}: {
  links: NodeLink[]
  editable?: boolean
  onCreate: (input: { label: string; url: string }) => string | null
  onUpdate: (link: NodeLink, label: string, url: string) => string | null
  onDelete: (linkId: string) => void
}) {
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<NodeLink | null>(null)
  const [pendingDelete, setPendingDelete] = useState<NodeLink | null>(null)
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const copiedTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    return () => {
      if (copiedTimer.current) {
        clearTimeout(copiedTimer.current)
      }
    }
  }, [])

  async function copyLinkUrl(link: NodeLink) {
    try {
      await navigator.clipboard.writeText(link.url)
      setCopiedId(link.id)
      if (copiedTimer.current) {
        clearTimeout(copiedTimer.current)
      }
      copiedTimer.current = setTimeout(() => {
        copiedTimer.current = null
        setCopiedId(null)
      }, 1500)
    } catch {
      toast.error("Could not copy the link.")
    }
  }

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
              Add documentation, courses, or references for this topic.
            </EmptyDescription>
          </EmptyHeader>
          {editable ? (
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
          ) : null}
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
                    rel="noopener noreferrer"
                    className="text-sm font-medium underline-offset-3 hover:underline"
                  >
                    {link.label}
                  </a>
                  <p className="truncate text-xs text-muted-foreground">{link.url}</p>
                </div>
                <div className="flex shrink-0">
                  <Tooltip>
                    <TooltipTrigger
                      render={
                        <Button
                          type="button"
                          size="icon-sm"
                          variant="ghost"
                          aria-label="Copy link"
                          onClick={() => void copyLinkUrl(link)}
                        />
                      }
                    >
                      {copiedId === link.id ? <CheckIcon /> : <CopyIcon />}
                    </TooltipTrigger>
                    <TooltipContent>
                      {copiedId === link.id ? "Copied" : "Copy link"}
                    </TooltipContent>
                  </Tooltip>
                  {editable ? (
                    <div className="flex opacity-0 group-hover:opacity-100 group-focus-within:opacity-100">
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
                              onClick={() => setPendingDelete(link)}
                            />
                          }
                        >
                          <Trash2 />
                        </TooltipTrigger>
                        <TooltipContent>Delete link</TooltipContent>
                      </Tooltip>
                    </div>
                  ) : null}
                </div>
              </li>
            ))}
          </ul>
          {editable ? (
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
          ) : null}
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
      <ConfirmDeleteAlert
        open={Boolean(pendingDelete)}
        onOpenChange={(open) => {
          if (!open) {
            setPendingDelete(null)
          }
        }}
        title="Delete this link?"
        description={
          pendingDelete
            ? `“${pendingDelete.label}” will be permanently deleted.`
            : "This link will be permanently deleted."
        }
        confirmLabel="Delete link"
        onConfirm={() => {
          if (!pendingDelete) {
            return
          }
          onDelete(pendingDelete.id)
          toast.success("Link deleted")
        }}
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
  const [lookingUpTitle, setLookingUpTitle] = useState(false)
  const labelTouchedRef = useRef(false)
  const titleRequestRef = useRef(0)
  const isEdit = Boolean(link)

  useEffect(() => {
    if (!open) {
      titleRequestRef.current += 1
      setLookingUpTitle(false)
      return
    }
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLabel(link?.label ?? "")
    setUrl(link?.url ?? "")
    setError(null)
    setLookingUpTitle(false)
    labelTouchedRef.current = Boolean(link?.label)
    titleRequestRef.current += 1
  }, [open, link])

  useEffect(() => {
    if (!open || labelTouchedRef.current) {
      return
    }

    const trimmed = normalizeLinkUrl(url)
    if (!isValidHttpUrl(trimmed)) {
      setLookingUpTitle(false)
      return
    }

    const requestId = ++titleRequestRef.current
    setLookingUpTitle(true)
    const timer = window.setTimeout(() => {
      void previewLinkTitleAction(trimmed)
        .then((result) => {
          if (requestId !== titleRequestRef.current || labelTouchedRef.current) {
            return
          }
          if (result.title) {
            setLabel(result.title)
          }
        })
        .finally(() => {
          if (requestId === titleRequestRef.current) {
            setLookingUpTitle(false)
          }
        })
    }, 450)

    return () => {
      window.clearTimeout(timer)
    }
  }, [open, url])

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
    <Dialog form open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit link" : "Add link"}</DialogTitle>
          <DialogDescription>
            {isEdit
              ? "Update this reference without leaving the sidebar."
              : "Add documentation, courses, or other references."}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="grid gap-6">
          <FieldGroup>
            <Field data-invalid={error ? true : undefined}>
              <FieldLabel htmlFor="link-dialog-url">URL</FieldLabel>
              <Input
                id="link-dialog-url"
                value={url}
                onChange={(event) => setUrl(event.target.value)}
                placeholder="https://example.com"
                autoComplete="off"
                aria-invalid={error ? true : undefined}
              />
              {error ? <FieldError>{error}</FieldError> : null}
            </Field>
            <Field>
              <FieldLabel htmlFor="link-dialog-label">Label</FieldLabel>
              <Input
                id="link-dialog-label"
                value={label}
                onChange={(event) => {
                  const next = event.target.value
                  const touched = next.trim().length > 0
                  labelTouchedRef.current = touched
                  if (touched) {
                    titleRequestRef.current += 1
                    setLookingUpTitle(false)
                  }
                  setLabel(next)
                }}
                placeholder={
                  isValidHttpUrl(normalizeLinkUrl(url))
                    ? defaultLinkLabel(url)
                    : "Optional"
                }
                autoComplete="off"
              />
              <FieldDescription>
                {lookingUpTitle ? (
                  <span className="inline-flex items-center gap-1.5">
                    <Spinner className="size-3" />
                    Looking up the page title…
                  </span>
                ) : (
                  "Filled from the page title when we can find it."
                )}
              </FieldDescription>
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
