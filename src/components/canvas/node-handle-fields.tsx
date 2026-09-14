"use client"

import { Checkbox } from "@/components/ui/checkbox"
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldLabel,
} from "@/components/ui/field"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import {
  DEFAULT_NODE_HANDLE_KIND,
  type NodeHandleKind,
} from "@/domain/nodes/handle"

export function NodeHandleFields({
  handleKind,
  incomingEdgeAnimated,
  onHandleKindChange,
  onIncomingEdgeAnimatedChange,
  allowOutput,
  allowInput,
  idPrefix,
}: {
  handleKind: NodeHandleKind
  incomingEdgeAnimated: boolean
  onHandleKindChange: (kind: NodeHandleKind) => void
  onIncomingEdgeAnimatedChange: (animated: boolean) => void
  allowOutput: boolean
  allowInput: boolean
  idPrefix: string
}) {
  const checkboxId = `${idPrefix}-incoming-edge-animated`
  return (
    <>
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
      <Field orientation="horizontal">
        <Checkbox
          id={checkboxId}
          checked={incomingEdgeAnimated}
          onCheckedChange={(checked) =>
            onIncomingEdgeAnimatedChange(checked === true)
          }
        />
        <FieldContent>
          <FieldLabel htmlFor={checkboxId}>
            Animate incoming edge
          </FieldLabel>
          <FieldDescription>
            Uses React Flow’s animated edge from this node’s parent.
          </FieldDescription>
        </FieldContent>
      </Field>
    </>
  )
}

export { DEFAULT_NODE_HANDLE_KIND }
