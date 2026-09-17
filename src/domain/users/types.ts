import type { ApprovalStatus, UserRole } from "@/lib/auth/access"

export type ApplicationUser = {
  id: string
  githubUserId: string
  githubUsername: string
  displayName: string | null
  avatarUrl: string | null
  role: UserRole
  approvalStatus: ApprovalStatus
  approvedAt: string | null
  createdAt: string
  updatedAt: string
}

export type GithubProfileInput = {
  githubUserId: string
  githubUsername: string
  displayName?: string | null
  avatarUrl?: string | null
}
