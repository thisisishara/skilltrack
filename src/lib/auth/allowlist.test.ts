import { afterEach, describe, expect, it } from "vitest"

import { isGithubUsernameAllowed } from "@/lib/auth/allowlist"

describe("isGithubUsernameAllowed", () => {
  const previous = process.env.ALLOWED_GITHUB_USERNAMES

  afterEach(() => {
    if (previous === undefined) {
      delete process.env.ALLOWED_GITHUB_USERNAMES
    } else {
      process.env.ALLOWED_GITHUB_USERNAMES = previous
    }
  })

  it("denies everyone when the allow-list is missing or empty", () => {
    delete process.env.ALLOWED_GITHUB_USERNAMES
    expect(isGithubUsernameAllowed("anyone")).toBe(false)

    process.env.ALLOWED_GITHUB_USERNAMES = "  "
    expect(isGithubUsernameAllowed("anyone")).toBe(false)
  })

  it("allows any non-empty login when the list includes *", () => {
    process.env.ALLOWED_GITHUB_USERNAMES = "*"
    expect(isGithubUsernameAllowed("octocat")).toBe(true)
    expect(isGithubUsernameAllowed("")).toBe(false)
    expect(isGithubUsernameAllowed(null)).toBe(false)
  })

  it("matches a comma-separated list case-insensitively", () => {
    process.env.ALLOWED_GITHUB_USERNAMES = "ThisIsIshara, dinushiTJ"
    expect(isGithubUsernameAllowed("thisisishara")).toBe(true)
    expect(isGithubUsernameAllowed("DINUSHITj")).toBe(true)
    expect(isGithubUsernameAllowed("someone-else")).toBe(false)
  })
})
