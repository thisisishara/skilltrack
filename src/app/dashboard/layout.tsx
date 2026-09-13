import type { ReactNode } from "react"

import { AppSidebar } from "@/components/layout/app-sidebar"
import { requireSession } from "@/lib/auth/session"

export default async function DashboardLayout({
  children,
}: {
  children: ReactNode
}) {
  const session = await requireSession()

  return (
    <div className="flex min-h-full flex-1">
      <AppSidebar
        githubUsername={session.user.githubUsername}
        displayName={session.user.name}
        avatarUrl={session.user.image}
      />
      <div className="flex min-w-0 flex-1 flex-col">{children}</div>
    </div>
  )
}
