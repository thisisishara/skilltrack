import { redirect } from "next/navigation"

import { isFixedAdminUsername } from "@/lib/auth/access"
import { requireSession } from "@/lib/auth/session"

export default async function UsersPage() {
  const { applicationUser } = await requireSession()

  if (
    applicationUser.role !== "admin" ||
    !isFixedAdminUsername(applicationUser.githubUsername)
  ) {
    redirect("/dashboard")
  }

  redirect("/dashboard?settings=users")
}
