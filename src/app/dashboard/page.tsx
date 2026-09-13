import { Map } from "lucide-react"

import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty"
import { requireSession } from "@/lib/auth/session"

export default async function DashboardPage() {
  const { applicationUser } = await requireSession()

  return (
    <main className="flex min-h-0 flex-1 flex-col p-6">
      <Empty className="h-full">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <Map />
          </EmptyMedia>
          <EmptyTitle>No roadmap selected</EmptyTitle>
          <EmptyDescription>
            Signed in as {applicationUser.githubUsername}. Role and roadmap
            management lands in the next phase.
          </EmptyDescription>
        </EmptyHeader>
      </Empty>
    </main>
  )
}
