"use client"

import { FileJson } from "lucide-react"
import { cn } from "cn"

import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty"
import {
  Field,
  FieldDescription,
  FieldError,
  FieldLabel,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { useJsonFileDrop } from "@/hooks/use-json-file-drop"

export function ImportJsonFields({
  json,
  error,
  onJsonChange,
}: {
  json: string
  error: string | null
  onJsonChange: (value: string) => void
}) {
  const hasJson = json.trim().length > 0
  const { isOver, dropProps } = useJsonFileDrop(onJsonChange)

  return (
    <Field
      data-invalid={error ? true : undefined}
      className={cn(
        "min-w-0 rounded-xl transition-colors",
        isOver && "border-2 border-dashed border-ring bg-muted/40 p-2"
      )}
      {...dropProps}
    >
      <FieldLabel htmlFor="import-roadmap-file">Roadmap JSON</FieldLabel>
      <Input
        id="import-roadmap-file"
        type="file"
        accept="application/json,.json"
        onChange={async (event) => {
          const file = event.target.files?.[0]
          if (!file) {
            return
          }
          onJsonChange(await file.text())
          event.target.value = ""
        }}
      />
      {hasJson ? (
        <Textarea
          id="import-roadmap-json"
          value={json}
          onChange={(event) => onJsonChange(event.target.value)}
          rows={12}
          spellCheck={false}
          wrap="off"
          aria-invalid={error ? true : undefined}
          className="field-sizing-fixed max-h-52 min-h-40 min-w-0 resize-y overflow-auto font-mono text-xs whitespace-pre"
        />
      ) : (
        <Empty className="min-h-40 border-2 border-dashed">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <FileJson />
            </EmptyMedia>
            <EmptyTitle>Drop a JSON file</EmptyTitle>
            <EmptyDescription>
              Drag a SkillTrack roadmap here, choose a file, or paste JSON below.
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      )}
      {hasJson ? null : (
        <Textarea
          id="import-roadmap-json"
          value={json}
          onChange={(event) => onJsonChange(event.target.value)}
          placeholder='{ "schema": "skilltrack.roadmap.v1", ... }'
          rows={6}
          spellCheck={false}
          wrap="off"
          aria-invalid={error ? true : undefined}
          className="field-sizing-fixed max-h-40 min-w-0 overflow-auto font-mono text-xs whitespace-pre"
        />
      )}
      {error ? <FieldError>{error}</FieldError> : (
        <FieldDescription>
          Must be skilltrack.roadmap.v1. Import does not merge into an existing graph.
        </FieldDescription>
      )}
    </Field>
  )
}
