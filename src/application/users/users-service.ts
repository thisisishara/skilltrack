import "server-only"

import type { GithubProfileInput } from "@/domain/users/types"
import { upsertByGithubProfile } from "@/repositories/users/users-repository"

export async function ensureApplicationUser(input: GithubProfileInput) {
  return upsertByGithubProfile(input)
}
