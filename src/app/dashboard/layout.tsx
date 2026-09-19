import type { ReactNode } from "react"
import { Suspense } from "react"
import { CircleAlert } from "lucide-react"

import { listRoles } from "@/application/roles/roles-service"
import { getPublicUserSettings } from "@/application/user-settings/user-settings-service"
import { AppSidebar } from "@/components/layout/app-sidebar"
import { DashboardHeader } from "@/components/layout/dashboard-header"
import { NavigationProgressBar } from "@/components/layout/navigation-progress-bar"
import { RoleRouteShell } from "@/components/roles/role-route-shell"
import { RolesWorkspace } from "@/components/roles/roles-workspace"
import { UserSettingsDialog } from "@/components/settings/user-settings-dialog"
import { TrackRoleSync } from "@/components/track/track-role-sync"
import { TrackWorkspace } from "@/components/track/track-workspace"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"
import { defaultTrackConfig } from "@/domain/user-settings/defaults"
import { isApplicationError } from "@/domain/errors"
import type { PublicUserSettings } from "@/domain/user-settings/types"
import type { Role } from "@/domain/roles/types"
import { isFixedAdminUsername } from "@/lib/auth/access"
import { requireSession } from "@/lib/auth/session"

const FALLBACK_SETTINGS: PublicUserSettings = {
  notificationsEnabled: true,
  trackEnabled: false,
  trackProvider: null,
  trackModel: null,
  trackBaseUrl: null,
  trackApiKeyLast4: null,
  hasApiKey: false,
  trackConfig: defaultTrackConfig(),
  encryptionConfigured: false,
}

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
  let canManageUsers = false
  let settings = FALLBACK_SETTINGS

  try {
    const { session, applicationUser } = await requireSession()
    githubUsername = session.user.githubUsername
    displayName = session.user.name
    avatarUrl = session.user.image
    canManageUsers =
      applicationUser.role === "admin" &&
      isFixedAdminUsername(applicationUser.githubUsername)
    roles = await listRoles(applicationUser.id)
    settings = await getPublicUserSettings(applicationUser.id)
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
      <TrackWorkspace
        initialSettings={settings}
        canManageUsers={canManageUsers}
      >
        <RolesWorkspace roles={roles}>
          <NavigationProgressBar />
          <AppSidebar
            githubUsername={githubUsername}
            displayName={displayName}
            avatarUrl={avatarUrl}
          />
          <SidebarInset className="min-h-0 overflow-hidden">
            <DashboardHeader />
            <RoleRouteShell>{children}</RoleRouteShell>
          </SidebarInset>
          <UserSettingsDialog />
          <Suspense fallback={null}>
            <TrackRoleSync />
          </Suspense>
        </RolesWorkspace>
      </TrackWorkspace>
    </SidebarProvider>
  )
}
