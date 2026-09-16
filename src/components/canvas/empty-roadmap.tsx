"use client"

import { Map } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty"

export function EmptyRoadmap({
  onCreate,
  onImport,
}: {
  onCreate: () => void
  onImport: () => void
}) {
  return (
    <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center p-6">
      <Empty className="pointer-events-auto max-w-sm border bg-background/90 shadow-sm backdrop-blur-sm">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <Map />
          </EmptyMedia>
          <EmptyTitle>This roadmap is empty</EmptyTitle>
          <EmptyDescription>
            Add the first topic, import a roadmap, or drop a .json file on the canvas.
          </EmptyDescription>
        </EmptyHeader>
        <EmptyContent>
          <Button type="button" onClick={onCreate}>
            Add first topic
          </Button>
          <Button type="button" variant="outline" onClick={onImport}>
            Import JSON
          </Button>
        </EmptyContent>
      </Empty>
    </div>
  )
}
