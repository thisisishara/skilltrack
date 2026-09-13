export type ApplicationUser = {
  id: string
  githubUserId: string
  githubUsername: string
  displayName: string | null
  avatarUrl: string | null
  createdAt: string
  updatedAt: string
}

export type GithubProfileInput = {
  githubUserId: string
  githubUsername: string
  displayName?: string | null
  avatarUrl?: string | null
}
