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

export function EmptyRoadmap({ onCreate }: { onCreate: () => void }) {
  return (
    <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center p-6">
      <Empty className="pointer-events-auto max-w-sm border bg-background/90 shadow-sm backdrop-blur-sm">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <Map />
          </EmptyMedia>
          <EmptyTitle>This roadmap is empty</EmptyTitle>
          <EmptyDescription>
            Create the first node to start mapping skills for this role.
          </EmptyDescription>
        </EmptyHeader>
        <EmptyContent>
          <Button type="button" onClick={onCreate}>
            Create first node
          </Button>
        </EmptyContent>
      </Empty>
    </div>
  )
}
