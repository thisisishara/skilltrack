"use client"

import { FileJson } from "lucide-react"

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

  return (
    <Field data-invalid={error ? true : undefined}>
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
        }}
      />
      {hasJson ? (
        <Textarea
          id="import-roadmap-json"
          value={json}
          onChange={(event) => onJsonChange(event.target.value)}
          rows={10}
          aria-invalid={error ? true : undefined}
          className="min-h-40 font-mono text-xs"
        />
      ) : (
        <Empty className="border">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <FileJson />
            </EmptyMedia>
            <EmptyTitle>No JSON selected</EmptyTitle>
            <EmptyDescription>
              Choose a SkillTrack roadmap file or paste JSON below.
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
          aria-invalid={error ? true : undefined}
          className="font-mono text-xs"
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
