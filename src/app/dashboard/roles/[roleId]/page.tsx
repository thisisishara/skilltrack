import { Map } from "lucide-react"

import { getRoleForUser } from "@/application/roles/roles-service"
import { PersistActiveRole } from "@/components/roles/persist-active-role"
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty"
import { requireSession } from "@/lib/auth/session"

export default async function RoleDashboardPage({
  params,
}: {
  params: Promise<{ roleId: string }>
}) {
  const { roleId } = await params
  const { applicationUser } = await requireSession()
  const role = await getRoleForUser(applicationUser.id, roleId)

  if (!role) {
    return (
      <main className="flex min-h-0 flex-1 flex-col p-6">
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
    <main className="flex min-h-0 flex-1 flex-col p-6">
      <PersistActiveRole roleId={role.id} />
      <Empty className="h-full">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <Map />
          </EmptyMedia>
          <EmptyTitle>Roadmap</EmptyTitle>
          <EmptyDescription>
            The canvas for {role.name} lands in the next phase.
          </EmptyDescription>
        </EmptyHeader>
      </Empty>
    </main>
  )
}
