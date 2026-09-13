import type { ReactNode } from "react"
import { CircleAlert } from "lucide-react"

import { AppSidebar } from "@/components/layout/app-sidebar"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"
import { isApplicationError } from "@/domain/errors"
import { requireSession } from "@/lib/auth/session"

export default async function DashboardLayout({
  children,
}: {
  children: ReactNode
}) {
  let githubUsername: string
  let displayName: string | null | undefined
  let avatarUrl: string | null | undefined
  let databaseUnavailable = false

  try {
    const { session } = await requireSession()
    githubUsername = session.user.githubUsername
    displayName = session.user.name
    avatarUrl = session.user.image
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
    <SidebarProvider className="flex min-h-full flex-1">
      <AppSidebar
        githubUsername={githubUsername}
        displayName={displayName}
        avatarUrl={avatarUrl}
      />
      <SidebarInset>{children}</SidebarInset>
    </SidebarProvider>
  )
}
