"use client"

import { Map } from "lucide-react"

import { useRolesUi } from "@/components/roles/roles-workspace"
import { Button } from "@/components/ui/button"
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty"

export function MustCreateRole() {
  const { openCreate } = useRolesUi()

  return (
    <main className="flex min-h-0 flex-1 flex-col overflow-y-auto p-6">
      <Empty className="h-full">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <Map />
          </EmptyMedia>
          <EmptyTitle>Create a role to continue</EmptyTitle>
          <EmptyDescription>
            SkillTrack organizes roadmaps by role. Create one to start tracking
            skills.
          </EmptyDescription>
        </EmptyHeader>
        <EmptyContent>
          <Button onClick={openCreate}>Create Role</Button>
        </EmptyContent>
      </Empty>
    </main>
  )
}
