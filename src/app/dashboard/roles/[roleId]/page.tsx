import { ListTree } from "lucide-react"

import { listTasksForRole } from "@/application/tasks/tasks-service"
import { listLinksForRole } from "@/application/links/links-service"
import { listTopicsForRole } from "@/application/topics/topics-service"
import { getRoleForUser } from "@/application/roles/roles-service"
import { RegisterRoadmap } from "@/components/roles/role-route-shell"
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
  searchParams,
}: {
  params: Promise<{ roleId: string }>
  searchParams: Promise<{ node?: string }>
}) {
  const { roleId } = await params
  const { node: focusNodeId } = await searchParams
  const { applicationUser } = await requireSession()
  const role = await getRoleForUser(applicationUser.id, roleId)

  if (!role) {
    return (
      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto p-6">
        <Empty className="h-full">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <ListTree />
            </EmptyMedia>
            <EmptyTitle>Role not found</EmptyTitle>
            <EmptyDescription>
              That role does not exist or you do not have access. Choose another
              role from the sidebar.
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      </div>
    )
  }

  const [nodes, checklistItems, links] = await Promise.all([
    listTopicsForRole(applicationUser.id, role.id),
    listTasksForRole(applicationUser.id, role.id),
    listLinksForRole(applicationUser.id, role.id),
  ])

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <RegisterRoadmap
        userId={applicationUser.id}
        roleId={role.id}
        roleName={role.name}
        roleDescription={role.description}
        roleNotes={role.notes}
        nodes={nodes}
        checklistItems={checklistItems}
        links={links}
        focusNodeId={focusNodeId}
      />
    </div>
  )
}
