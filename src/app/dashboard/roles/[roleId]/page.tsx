import { Map } from "lucide-react"

import { listChecklistsForRole } from "@/application/checklists/checklists-service"
import { listLinksForRole } from "@/application/links/links-service"
import { listNodesForRole } from "@/application/nodes/nodes-service"
import { getRoleForUser } from "@/application/roles/roles-service"
import { RoadmapCanvas } from "@/components/canvas/roadmap-canvas"
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
      <div className="flex min-h-0 flex-1 flex-col p-6">
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
      </div>
    )
  }

  const [nodes, checklistItems, links] = await Promise.all([
    listNodesForRole(applicationUser.id, role.id),
    listChecklistsForRole(applicationUser.id, role.id),
    listLinksForRole(applicationUser.id, role.id),
  ])

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <PersistActiveRole roleId={role.id} />
      <RoadmapCanvas
        roleId={role.id}
        roleName={role.name}
        nodes={nodes}
        checklistItems={checklistItems}
        links={links}
      />
    </div>
  )
}
