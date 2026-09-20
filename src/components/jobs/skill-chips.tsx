"use client"

import { useState, type KeyboardEvent } from "react"
import { X } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Field, FieldLabel } from "@/components/ui/field"

export function SkillChipList({ items }: { items: string[] }) {
  if (items.length === 0) {
    return null
  }
  return (
    <section className="flex flex-col gap-2">
      <h2 className="text-sm font-medium">Skills</h2>
      <div className="flex flex-wrap gap-1.5">
        {items.map((item) => (
          <Badge
            key={item}
            variant="secondary"
            className="h-7 rounded-md px-2"
          >
            {item}
          </Badge>
        ))}
      </div>
    </section>
  )
}

export function SkillChipInput({
  values,
  disabled,
  onChange,
}: {
  values: string[]
  disabled?: boolean
  onChange: (values: string[]) => void
}) {
  const [draft, setDraft] = useState("")

  function addDraft() {
    const next = draft.trim()
    if (!next) {
      return
    }
    const exists = values.some(
      (value) => value.toLowerCase() === next.toLowerCase()
    )
    if (!exists) {
      onChange([...values, next])
    }
    setDraft("")
  }

  function removeAt(index: number) {
    onChange(values.filter((_, itemIndex) => itemIndex !== index))
  }

  function onKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Enter") {
      event.preventDefault()
      addDraft()
    }
    if (event.key === "Backspace" && draft.length === 0 && values.length > 0) {
      event.preventDefault()
      removeAt(values.length - 1)
    }
  }

  return (
    <Field>
      <FieldLabel htmlFor="job-skills">Skills</FieldLabel>
      <div className="flex min-h-9 flex-wrap items-center gap-1.5 rounded-lg border bg-transparent px-1.5 py-1 dark:bg-input/30">
        {values.map((item, index) => (
          <Badge
            key={`${item}-${index}`}
            variant="secondary"
            className="h-7 gap-0.5 rounded-md pr-0.5 pl-2"
          >
            {item}
            <Button
              type="button"
              variant="ghost"
              size="icon-xs"
              disabled={disabled}
              className="text-muted-foreground hover:bg-transparent hover:text-foreground"
              aria-label={`Remove ${item}`}
              onClick={() => removeAt(index)}
            >
              <X />
            </Button>
          </Badge>
        ))}
        <input
          id="job-skills"
          value={draft}
          disabled={disabled}
          placeholder={values.length === 0 ? "Type a skill and press Enter" : ""}
          className="min-w-32 flex-1 bg-transparent px-1.5 py-1 text-sm outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed"
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={onKeyDown}
        />
      </div>
    </Field>
  )
}
