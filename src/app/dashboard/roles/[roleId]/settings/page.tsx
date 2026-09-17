"use client"

import { Map } from "lucide-react"

import { RoleSettings } from "@/components/roles/role-settings"
import { useRolesUi } from "@/components/roles/roles-workspace"
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty"

export default function RoleSettingsPage() {
  const { activeRole } = useRolesUi()

  if (!activeRole) {
    return (
      <main className="flex min-h-0 flex-1 flex-col overflow-y-auto p-6">
        <Empty className="h-full">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <Map />
            </EmptyMedia>
            <EmptyTitle>Role not found</EmptyTitle>
            <EmptyDescription>
              That role does not exist or you do not have access. Choose another
              role from the sidebar.
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      </main>
    )
  }

  return (
    <main className="flex min-h-0 flex-1 flex-col overflow-y-auto p-6">
      <RoleSettings role={activeRole} />
    </main>
  )
}
