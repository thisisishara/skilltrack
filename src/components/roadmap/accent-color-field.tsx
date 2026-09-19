"use client"

import { useEffect, useState } from "react"

import { Button } from "@/components/ui/button"
import {
  Field,
  FieldDescription,
  FieldError,
  FieldLabel,
} from "@/components/ui/field"
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
  InputGroupText,
} from "@/components/ui/input-group"
import { cn } from "@/lib/utils"
import { ACCENT_PRESETS, parseAccentHex } from "@/domain/topics/accent"
import { WithTooltip } from "@/components/ui/tooltip"

export function AccentColorField({
  value,
  onChange,
  canInherit = true,
}: {
  value: string | null
  onChange: (next: string | null) => void
  canInherit?: boolean
}) {
  const [custom, setCustom] = useState(value?.replace(/^#/, "") ?? "")
  const [invalid, setInvalid] = useState(false)

  useEffect(() => {
    // Keep the hex field in sync when a preset is chosen elsewhere.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setCustom(value?.replace(/^#/, "") ?? "")
    setInvalid(false)
  }, [value])

  function commitCustom(raw: string) {
    const parsed = parseAccentHex(raw)
    if (!parsed.ok) {
      setInvalid(true)
      return
    }
    setInvalid(false)
    setCustom(parsed.value?.replace(/^#/, "") ?? "")
    onChange(parsed.value)
  }

  return (
    <Field data-invalid={invalid ? true : undefined}>
      <FieldLabel>Accent color</FieldLabel>
      <FieldDescription>
        Color for this topic’s icon. Nested topics can keep their own colors.
      </FieldDescription>
      <div className="flex flex-wrap items-center gap-2">
        {ACCENT_PRESETS.map((preset) => {
          const selected = value === preset.hex
          return (
            <WithTooltip key={preset.id} label={preset.label}>
              <Button
                type="button"
                size="icon-sm"
                variant="outline"
                aria-label={preset.label}
                aria-pressed={selected}
                className={cn(selected && "ring-2 ring-ring ring-offset-2 ring-offset-background")}
                style={{ backgroundColor: preset.hex }}
                onClick={() => onChange(preset.hex)}
              />
            </WithTooltip>
          )
        })}
        {canInherit ? (
          <Button
            type="button"
            size="sm"
            variant={value ? "outline" : "secondary"}
            onClick={() => onChange(null)}
          >
            Inherit
          </Button>
        ) : null}
      </div>
      <InputGroup>
        <InputGroupAddon>
          <InputGroupText>#</InputGroupText>
        </InputGroupAddon>
        <InputGroupInput
          value={custom}
          onChange={(event) => {
            const next = event.target.value.replace(/^#/, "")
            setCustom(next)
            if (!next.trim()) {
              setInvalid(false)
              if (canInherit) {
                onChange(null)
              }
              return
            }
            if (next.replace(/^#/, "").length === 6) {
              const parsed = parseAccentHex(next)
              if (parsed.ok) {
                setInvalid(false)
                onChange(parsed.value)
              }
            }
          }}
          onBlur={() => commitCustom(custom)}
          placeholder="3b82f6"
          autoComplete="off"
          spellCheck={false}
          aria-invalid={invalid ? true : undefined}
        />
      </InputGroup>
      {invalid ? <FieldError>Enter a 3 or 6 digit hex color.</FieldError> : null}
    </Field>
  )
}
