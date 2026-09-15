import { cache } from "react"
import { redirect } from "next/navigation"

import { ensureApplicationUser } from "@/application/users/users-service"
import { auth } from "@/auth"
import { ApplicationError } from "@/domain/errors"
import type { ApplicationUser } from "@/domain/users/types"
import { logFailure } from "@/lib/observability/log"

export const requireSession = cache(async () => {
  const session = await auth()
  const githubUsername = session?.user?.githubUsername
  const githubUserId = session?.user?.githubUserId

  if (!githubUsername || !githubUserId) {
    redirect("/login")
  }

  let applicationUser: ApplicationUser

  try {
    applicationUser = await ensureApplicationUser({
      githubUserId,
      githubUsername,
      displayName: session.user.name,
      avatarUrl: session.user.image,
    })
  } catch (error) {
    logFailure("auth.account_load_failed", error)
    if (error instanceof ApplicationError) {
      throw error
    }

    throw new ApplicationError(
      "database",
      "Could not load your SkillTrack account.",
      { cause: error }
    )
  }

  session.user.applicationUserId = applicationUser.id

  return { session, applicationUser }
})
