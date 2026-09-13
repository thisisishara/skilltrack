import { redirect } from "next/navigation"

import { auth } from "@/auth"

export default async function Home() {
  const session = await auth()

  if (session?.user?.githubUsername) {
    redirect("/dashboard")
  }

  redirect("/login")
}
