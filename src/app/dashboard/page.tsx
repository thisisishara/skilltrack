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
  await requireSession()

  return (
    <main className="flex flex-1 flex-col p-6">
      <Empty className="h-full">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <Map />
          </EmptyMedia>
          <EmptyTitle>No roadmap selected</EmptyTitle>
          <EmptyDescription>
            Role and roadmap management lands in the next phase. You are signed
            in and this dashboard is protected.
          </EmptyDescription>
        </EmptyHeader>
      </Empty>
    </main>
  )
}
