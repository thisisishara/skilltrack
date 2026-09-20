import { Briefcase } from "lucide-react"

import { getJobForRole } from "@/application/jobs/jobs-service"
import { getRoleForUser } from "@/application/roles/roles-service"
import { JobDetail } from "@/components/jobs/job-detail"
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty"
import { requireSession } from "@/lib/auth/session"

export default async function RoleJobDetailPage({
  params,
}: {
  params: Promise<{ roleId: string; jobId: string }>
}) {
  const { roleId, jobId } = await params
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

  const job = await getJobForRole(applicationUser.id, role.id, jobId)
  if (!job) {
    return (
      <main className="flex min-h-0 flex-1 flex-col overflow-y-auto p-4 sm:p-6">
        <Empty className="h-full">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <Briefcase />
            </EmptyMedia>
            <EmptyTitle>Job not found</EmptyTitle>
            <EmptyDescription>
              That job was deleted or is not part of this role.
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      </main>
    )
  }

  return (
    <main className="flex min-h-0 flex-1 flex-col overflow-y-auto p-4 sm:p-6">
      <JobDetail job={job} />
    </main>
  )
}
