import { Briefcase } from "lucide-react"

import { listJobsForRole } from "@/application/jobs/jobs-service"
import { getRoleForUser } from "@/application/roles/roles-service"
import { getPublicUserSettings } from "@/application/user-settings/user-settings-service"
import { JobsWorkspace } from "@/components/jobs/jobs-workspace"
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty"
import { requireSession } from "@/lib/auth/session"

export default async function RoleJobsPage({
  params,
}: {
  params: Promise<{ roleId: string }>
}) {
  const { roleId } = await params
  const { applicationUser } = await requireSession()
  const role = await getRoleForUser(applicationUser.id, roleId)

  if (!role) {
    return (
      <main className="flex min-h-0 flex-1 flex-col overflow-y-auto p-4 sm:p-6">
        <Empty className="h-full">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <Briefcase />
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

  const [jobs, settings] = await Promise.all([
    listJobsForRole(applicationUser.id, role.id),
    getPublicUserSettings(applicationUser.id),
  ])

  return (
    <main className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <JobsWorkspace
        roleId={role.id}
        jobs={jobs}
        canUseAi={settings.trackEnabled && settings.hasApiKey}
      />
    </main>
  )
}
