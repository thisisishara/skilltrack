export function isGithubUsernameAllowed(
  username: string | null | undefined
): boolean {
  const raw = process.env.ALLOWED_GITHUB_USERNAMES?.trim()

  if (!raw) {
    return false
  }

  const allowed = raw
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean)

  if (allowed.includes("*")) {
    return Boolean(username)
  }

  if (!username) {
    return false
  }

  const lowered = username.toLowerCase()
  return allowed.some((entry) => entry.toLowerCase() === lowered)
}
