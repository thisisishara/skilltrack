export function isGithubUsernameAllowed(
  username: string | null | undefined
): boolean {
  const allowed = process.env.ALLOWED_GITHUB_USERNAME?.trim()

  if (!allowed) {
    return false
  }

  if (allowed === "*") {
    return Boolean(username)
  }

  if (!username) {
    return false
  }

  return username.toLowerCase() === allowed.toLowerCase()
}
