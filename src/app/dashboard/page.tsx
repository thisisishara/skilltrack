import { listRoles } from "@/application/roles/roles-service"
import { ActiveRoleRedirect } from "@/components/roles/active-role-redirect"
import { MustCreateRole } from "@/components/roles/must-create-role"
import { requireSession } from "@/lib/auth/session"

export default async function DashboardPage() {
  const { applicationUser } = await requireSession()
  const roles = await listRoles(applicationUser.id)

  if (roles.length === 0) {
    return <MustCreateRole />
  }

  return <ActiveRoleRedirect roles={roles} />
}
