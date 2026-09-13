import NextAuth from "next-auth"
import GitHub from "next-auth/providers/github"

import { isGithubUsernameAllowed } from "@/lib/auth/allowlist"

function githubLoginFromProfile(profile: unknown): string | undefined {
  if (
    typeof profile === "object" &&
    profile !== null &&
    "login" in profile &&
    typeof profile.login === "string"
  ) {
    return profile.login
  }

  return undefined
}

function githubIdFromProfile(profile: unknown): string | undefined {
  if (typeof profile === "object" && profile !== null && "id" in profile) {
    const id = profile.id
    if (typeof id === "string" || typeof id === "number") {
      return String(id)
    }
  }

  return undefined
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  trustHost: true,
  providers: [GitHub],
  pages: {
    signIn: "/login",
    error: "/access-denied",
  },
  callbacks: {
    authorized({ auth: session, request: { nextUrl } }) {
      const isLoggedIn = Boolean(session?.user?.githubUsername)
      const pathname = nextUrl.pathname
      const isPublicPath =
        pathname === "/login" ||
        pathname === "/access-denied" ||
        pathname === "/skilltrack-icon.png" ||
        pathname.startsWith("/favicon/")

      if (isPublicPath) {
        if (isLoggedIn && pathname === "/login") {
          return Response.redirect(new URL("/dashboard", nextUrl))
        }

        return true
      }

      return isLoggedIn
    },
    async signIn({ profile }) {
      const githubUsername = githubLoginFromProfile(profile)

      if (!isGithubUsernameAllowed(githubUsername)) {
        console.warn(
          JSON.stringify({
            event: "auth.denied",
            githubUsername: githubUsername ?? null,
          })
        )
        return false
      }

      return true
    },
    async jwt({ token, profile }) {
      if (profile) {
        token.githubUsername = githubLoginFromProfile(profile)
        token.githubUserId = githubIdFromProfile(profile)
      }

      return token
    },
    async session({ session, token }) {
      if (!token.githubUsername || !token.githubUserId) {
        return session
      }

      session.user.githubUsername = token.githubUsername
      session.user.githubUserId = token.githubUserId
      return session
    },
  },
})
