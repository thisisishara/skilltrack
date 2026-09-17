import { ShieldAlert } from "lucide-react"
import { redirect } from "next/navigation"

import { SignOutButton } from "@/components/auth/sign-out-button"
import { ModeToggle } from "@/components/layout/mode-toggle"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { isApprovedStatus } from "@/lib/auth/access"
import { requireAccount } from "@/lib/auth/session"

export default async function PendingApprovalPage() {
  const { applicationUser } = await requireAccount()

  if (isApprovedStatus(applicationUser.approvalStatus)) {
    redirect("/dashboard")
  }

  const denied = applicationUser.approvalStatus === "denied"

  return (
    <main className="relative flex min-h-full flex-1 items-center justify-center p-6">
      <div className="absolute top-4 right-4">
        <ModeToggle />
      </div>
      <div className="flex w-full max-w-lg flex-col gap-4">
        <Alert>
          <ShieldAlert />
          <AlertTitle>
            {denied ? "Access request denied" : "Approval needed to log in"}
          </AlertTitle>
          <AlertDescription>
            {denied
              ? "An admin denied this GitHub account. You can sign out and try a different account."
              : "Your GitHub sign-in was received. An admin needs to approve this account before you can use SkillTrack."}
          </AlertDescription>
        </Alert>
        <SignOutButton />
      </div>
    </main>
  )
}
