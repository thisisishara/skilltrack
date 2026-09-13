import { redirect } from "next/navigation"

import { auth } from "@/auth"

export async function requireSession() {
  const session = await auth()

  if (!session?.user?.githubUsername) {
    redirect("/login")
  }

  return session
}
