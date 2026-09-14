"use client"

import { Field, FieldDescription, FieldLabel } from "@/components/ui/field"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { type NodeHandleKind } from "@/domain/nodes/handle"

export function NodeHandleFields({
  handleKind,
  onHandleKindChange,
  allowOutput,
  allowInput,
}: {
  handleKind: NodeHandleKind
  onHandleKindChange: (kind: NodeHandleKind) => void
  allowOutput: boolean
  allowInput: boolean
}) {
  return (
    <Field>
      <FieldLabel>Node type</FieldLabel>
      <ToggleGroup
        value={[handleKind]}
        onValueChange={(value) => {
          const next = Array.isArray(value) ? value[0] : value
          if (next === "regular" || next === "input" || next === "output") {
            onHandleKindChange(next)
          }
        }}
        variant="outline"
        spacing={0}
        className="w-full"
      >
        <ToggleGroupItem value="regular" className="flex-1">
          Regular
        </ToggleGroupItem>
        <ToggleGroupItem value="input" className="flex-1" disabled={!allowInput}>
          Input
        </ToggleGroupItem>
        <ToggleGroupItem
          value="output"
          className="flex-1"
          disabled={!allowOutput}
        >
          Output
        </ToggleGroupItem>
      </ToggleGroup>
      <FieldDescription>
        Regular nodes connect both ways. Input nodes only accept a parent.
        Output nodes only connect to children.
      </FieldDescription>
    </Field>
  )
}
