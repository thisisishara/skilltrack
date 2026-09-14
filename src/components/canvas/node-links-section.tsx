"use client"

import { useState, type FormEvent } from "react"
import { Link2, Plus, Trash2 } from "lucide-react"
import { toast } from "sonner"

import {
  createNodeLinkAction,
  deleteNodeLinkAction,
  updateNodeLinkAction,
} from "@/application/links/actions"
import { Button } from "@/components/ui/button"
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty"
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import type { NodeLink } from "@/domain/links/types"

export function NodeLinksSection({
  roleId,
  nodeId,
  links,
  onRefresh,
}: {
  roleId: string
  nodeId: string
  links: NodeLink[]
  onRefresh: () => void
}) {
  const [adding, setAdding] = useState(false)

  async function handleDelete(linkId: string) {
    const result = await deleteNodeLinkAction({ roleId, nodeId, linkId })
    if (!result.ok) {
      toast.error(result.message)
      return
    }

    toast.success("Link deleted")
    onRefresh()
  }

  if (links.length === 0 && !adding) {
    return (
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
          <Button type="button" size="sm" onClick={() => setAdding(true)}>
            Add a link
          </Button>
        </EmptyContent>
      </Empty>
    )
  }

  return (
    <div className="flex flex-col gap-3">
      <ul className="flex flex-col gap-3">
        {links.map((link) => (
          <LinkRow
            key={link.id}
            link={link}
            roleId={roleId}
            nodeId={nodeId}
            onDelete={handleDelete}
            onRefresh={onRefresh}
          />
        ))}
      </ul>
      {adding ? (
        <LinkForm
          pendingLabel="Adding…"
          submitLabel="Add link"
          onCancel={() => setAdding(false)}
          onSubmit={async (label, url) => {
            const result = await createNodeLinkAction({
              roleId,
              nodeId,
              label,
              url,
            })
            if (!result.ok) {
              return result.message
            }
            toast.success("Link added")
            setAdding(false)
            onRefresh()
            return null
          }}
        />
      ) : (
        <Button type="button" size="sm" variant="outline" onClick={() => setAdding(true)}>
          <Plus data-icon="inline-start" />
          Add link
        </Button>
      )}
    </div>
  )
}

function LinkRow({
  link,
  roleId,
  nodeId,
  onDelete,
  onRefresh,
}: {
  link: NodeLink
  roleId: string
  nodeId: string
  onDelete: (linkId: string) => Promise<void>
  onRefresh: () => void
}) {
  return (
    <li className="rounded-lg border p-3">
      <LinkForm
        initialLabel={link.label}
        initialUrl={link.url}
        pendingLabel="Saving…"
        submitLabel="Save link"
        onSubmit={async (label, url) => {
          const result = await updateNodeLinkAction({
            roleId,
            nodeId,
            linkId: link.id,
            label,
            url,
          })
          if (!result.ok) {
            return result.message
          }
          toast.success("Link updated")
          onRefresh()
          return null
        }}
      />
      <Button
        type="button"
        size="sm"
        variant="ghost"
        className="mt-2"
        onClick={() => void onDelete(link.id)}
      >
        <Trash2 data-icon="inline-start" />
        Delete
      </Button>
    </li>
  )
}

function LinkForm({
  initialLabel = "",
  initialUrl = "",
  pendingLabel,
  submitLabel,
  onSubmit,
  onCancel,
}: {
  initialLabel?: string
  initialUrl?: string
  pendingLabel: string
  submitLabel: string
  onSubmit: (label: string, url: string) => Promise<string | null>
  onCancel?: () => void
}) {
  const [label, setLabel] = useState(initialLabel)
  const [url, setUrl] = useState(initialUrl)
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setPending(true)
    setError(null)
    const message = await onSubmit(label, url)
    setPending(false)
    if (message) {
      setError(message)
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <FieldGroup className="gap-3">
        <Field data-invalid={error ? true : undefined}>
          <FieldLabel>Label</FieldLabel>
          <Input
            value={label}
            onChange={(event) => setLabel(event.target.value)}
            placeholder="Official documentation"
            autoComplete="off"
            aria-invalid={error ? true : undefined}
          />
        </Field>
        <Field data-invalid={error ? true : undefined}>
          <FieldLabel>URL</FieldLabel>
          <Input
            value={url}
            onChange={(event) => setUrl(event.target.value)}
            placeholder="https://example.com"
            autoComplete="off"
            aria-invalid={error ? true : undefined}
          />
          {error ? <FieldError>{error}</FieldError> : null}
        </Field>
        <div className="flex gap-2">
          <Button type="submit" size="sm" disabled={pending}>
            {pending ? pendingLabel : submitLabel}
          </Button>
          {onCancel ? (
            <Button type="button" size="sm" variant="outline" onClick={onCancel}>
              Cancel
            </Button>
          ) : null}
        </div>
      </FieldGroup>
    </form>
  )
}
