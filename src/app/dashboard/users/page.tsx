import { notFound } from "next/navigation"

import { listManagedUsers } from "@/application/users/users-service"
import { UsersAccessManager } from "@/components/users/users-access-manager"
import { isFixedAdminUsername } from "@/lib/auth/access"
import { requireSession } from "@/lib/auth/session"

export default async function UsersPage() {
  const { applicationUser } = await requireSession()

  if (
    applicationUser.role !== "admin" ||
    !isFixedAdminUsername(applicationUser.githubUsername)
  ) {
    notFound()
  }

  const users = await listManagedUsers(applicationUser)
  return <UsersAccessManager users={users} />
}
