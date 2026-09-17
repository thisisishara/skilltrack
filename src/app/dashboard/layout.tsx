import type { ReactNode } from "react"
import { CircleAlert } from "lucide-react"

import { listRoles } from "@/application/roles/roles-service"
import { AppSidebar } from "@/components/layout/app-sidebar"
import { DashboardHeader } from "@/components/layout/dashboard-header"
import { RoleRouteShell } from "@/components/roles/role-route-shell"
import { RolesWorkspace } from "@/components/roles/roles-workspace"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"
import { isApplicationError } from "@/domain/errors"
import type { Role } from "@/domain/roles/types"
import { requireSession } from "@/lib/auth/session"

export default async function DashboardLayout({
  children,
}: {
  children: ReactNode
}) {
  let githubUsername: string
  let displayName: string | null | undefined
  let avatarUrl: string | null | undefined
  let roles: Role[] = []
  let databaseUnavailable = false
  let isAdmin = false

  try {
    const { session, applicationUser } = await requireSession()
    githubUsername = session.user.githubUsername
    displayName = session.user.name
    avatarUrl = session.user.image
    isAdmin = applicationUser.role === "admin"
    roles = await listRoles(applicationUser.id)
  } catch (error) {
    if (isApplicationError(error) && error.code === "database") {
      databaseUnavailable = true
      githubUsername = ""
    } else {
      throw error
    }
  }

  if (databaseUnavailable) {
    return (
      <main className="flex flex-1 flex-col p-6">
        <Alert variant="destructive">
          <CircleAlert />
          <AlertTitle>Account could not be loaded</AlertTitle>
          <AlertDescription>
            The application database is unavailable. Check the Supabase
            environment variables and try again.
          </AlertDescription>
        </Alert>
      </main>
    )
  }

  return (
    <SidebarProvider className="h-dvh overflow-hidden">
      <RolesWorkspace roles={roles}>
        <AppSidebar
          githubUsername={githubUsername}
          displayName={displayName}
          avatarUrl={avatarUrl}
          isAdmin={isAdmin}
        />
        <SidebarInset className="min-h-0 overflow-hidden">
          <DashboardHeader />
          <RoleRouteShell>{children}</RoleRouteShell>
        </SidebarInset>
      </RolesWorkspace>
    </SidebarProvider>
  )
}
