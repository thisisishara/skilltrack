"use client"

import { useEffect, useState, type FormEvent } from "react"
import { ArrowDown, ArrowUp, ListChecks, Plus, Trash2 } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty"
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import type { ChecklistItem } from "@/domain/checklists/types"

export function NodeChecklistSection({
  items,
  onToggle,
  onCreate,
  onUpdate,
  onDelete,
  onReorder,
}: {
  items: ChecklistItem[]
  onToggle: (itemId: string, isCompleted: boolean) => Promise<void>
  onCreate: (input: { title: string; description: string }) => {
    ok: true
  } | { ok: false; message: string }
  onUpdate: (item: ChecklistItem, title: string, description: string) => void
  onDelete: (itemId: string) => void
  onReorder: (orderedIds: string[]) => void
}) {
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [adding, setAdding] = useState(false)

  const ordered = [...items].sort((a, b) => a.sortOrder - b.sortOrder)

  function handleAdd(event: FormEvent) {
    event.preventDefault()
    const result = onCreate({ title, description })
    if (!result.ok) {
      toast.error(result.message)
      return
    }

    toast.success("Checklist item added")
    setTitle("")
    setDescription("")
    setAdding(false)
  }

  function handleSaveItem(item: ChecklistItem, nextTitle: string, nextDescription: string) {
    if (
      nextTitle.trim() === item.title &&
      (nextDescription.trim() || null) === item.description
    ) {
      return
    }

    onUpdate(item, nextTitle, nextDescription)
  }

  function move(itemId: string, direction: -1 | 1) {
    const ids = ordered.map((item) => item.id)
    const index = ids.indexOf(itemId)
    const nextIndex = index + direction
    if (index < 0 || nextIndex < 0 || nextIndex >= ids.length) {
      return
    }

    const swapped = [...ids]
    const current = swapped[index]
    const neighbor = swapped[nextIndex]
    if (!current || !neighbor) {
      return
    }

    swapped[index] = neighbor
    swapped[nextIndex] = current
    onReorder(swapped)
  }

  if (ordered.length === 0 && !adding) {
    return (
      <Empty className="border border-dashed py-4">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <ListChecks />
          </EmptyMedia>
          <EmptyTitle>No evidence items</EmptyTitle>
          <EmptyDescription>
            Add checklist items to track progress for this node.
          </EmptyDescription>
        </EmptyHeader>
        <EmptyContent>
          <Button type="button" size="sm" onClick={() => setAdding(true)}>
            Add a checklist item
          </Button>
        </EmptyContent>
      </Empty>
    )
  }

  return (
    <div className="flex flex-col gap-3">
      <ul className="flex flex-col gap-3">
        {ordered.map((item, index) => (
          <ChecklistRow
            key={item.id}
            item={item}
            isFirst={index === 0}
            isLast={index === ordered.length - 1}
            onToggle={onToggle}
            onSave={handleSaveItem}
            onDelete={onDelete}
            onMove={move}
          />
        ))}
      </ul>
      {adding ? (
        <form onSubmit={handleAdd} className="rounded-lg border p-3">
          <FieldGroup className="gap-3">
            <Field>
              <FieldLabel htmlFor="checklist-title">Item title</FieldLabel>
              <Input
                id="checklist-title"
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                placeholder="Understand CAP theorem"
                autoComplete="off"
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="checklist-description">Description</FieldLabel>
              <Input
                id="checklist-description"
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                placeholder="Optional detail"
                autoComplete="off"
              />
            </Field>
            <div className="flex gap-2">
              <Button type="submit" size="sm">
                Add item
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => {
                  setAdding(false)
                  setTitle("")
                  setDescription("")
                }}
              >
                Cancel
              </Button>
            </div>
          </FieldGroup>
        </form>
      ) : (
        <Button type="button" size="sm" variant="outline" onClick={() => setAdding(true)}>
          <Plus data-icon="inline-start" />
          Add item
        </Button>
      )}
    </div>
  )
}

function ChecklistRow({
  item,
  isFirst,
  isLast,
  onToggle,
  onSave,
  onDelete,
  onMove,
}: {
  item: ChecklistItem
  isFirst: boolean
  isLast: boolean
  onToggle: (itemId: string, isCompleted: boolean) => Promise<void>
  onSave: (item: ChecklistItem, title: string, description: string) => void
  onDelete: (itemId: string) => void
  onMove: (itemId: string, direction: -1 | 1) => void
}) {
  const [title, setTitle] = useState(item.title)
  const [description, setDescription] = useState(item.description ?? "")

  useEffect(() => {
    // Re-sync editable fields when the underlying item changes (e.g. after
    // a reorder), without resetting on every keystroke.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setTitle(item.title)
    setDescription(item.description ?? "")
  }, [item.title, item.description])

  return (
    <li className="rounded-lg border p-3">
      <div className="flex items-start gap-2">
        <Checkbox
          checked={item.isCompleted}
          onCheckedChange={(checked) => {
            void onToggle(item.id, checked === true)
          }}
          aria-label={`Mark ${item.title} complete`}
        />
        <div className="min-w-0 flex-1">
          <Input
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            onBlur={() => onSave(item, title, description)}
            aria-label="Checklist title"
            autoComplete="off"
          />
          <Input
            className="mt-2"
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            onBlur={() => onSave(item, title, description)}
            placeholder="Optional detail"
            aria-label="Checklist description"
            autoComplete="off"
          />
        </div>
        <div className="flex flex-col gap-1">
          <Button
            type="button"
            size="icon-sm"
            variant="ghost"
            disabled={isFirst}
            aria-label="Move up"
            onClick={() => onMove(item.id, -1)}
          >
            <ArrowUp />
          </Button>
          <Button
            type="button"
            size="icon-sm"
            variant="ghost"
            disabled={isLast}
            aria-label="Move down"
            onClick={() => onMove(item.id, 1)}
          >
            <ArrowDown />
          </Button>
          <Button
            type="button"
            size="icon-sm"
            variant="ghost"
            aria-label="Delete item"
            onClick={() => onDelete(item.id)}
          >
            <Trash2 />
          </Button>
        </div>
      </div>
    </li>
  )
}
