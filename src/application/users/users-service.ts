import "server-only"

import { ApplicationError } from "@/domain/errors"
import type { ApplicationUser, GithubProfileInput } from "@/domain/users/types"
import {
  E2E_GITHUB_USERNAME,
  isFixedAdminUsername,
  type ApprovalStatus,
} from "@/lib/auth/access"
import { isE2eSessionEnabled } from "@/lib/e2e"
import {
  getByGithubUserId,
  getUserById,
  listUsers,
  setApprovalStatus,
  upsertByGithubProfile,
} from "@/repositories/users/users-repository"

function profileMatches(user: ApplicationUser, input: GithubProfileInput) {
  return (
    user.githubUsername === input.githubUsername &&
    (user.displayName ?? null) === (input.displayName ?? null) &&
    (user.avatarUrl ?? null) === (input.avatarUrl ?? null)
  )
}

export async function ensureApplicationUser(input: GithubProfileInput) {
  const existing = await getByGithubUserId(input.githubUserId)
  if (existing && profileMatches(existing, input)) {
    return finishE2eUser(existing)
  }

  return finishE2eUser(await upsertByGithubProfile(input))
}

function finishE2eUser(user: ApplicationUser) {
  if (
    isE2eSessionEnabled() &&
    user.githubUsername === E2E_GITHUB_USERNAME &&
    user.approvalStatus !== "approved"
  ) {
    return setApprovalStatus(user.id, "approved")
  }

  return user
}

export async function listManagedUsers(actor: ApplicationUser) {
  assertAdmin(actor)
  return listUsers()
}

export async function setUserApproval(
  actor: ApplicationUser,
  userId: string,
  status: Extract<ApprovalStatus, "approved" | "denied">
) {
  assertAdmin(actor)

  const target = await getUserById(userId)
  if (!target) {
    throw new ApplicationError("not_found", "That user no longer exists.")
  }

  if (isFixedAdminUsername(target.githubUsername) || target.role === "admin") {
    throw new ApplicationError(
      "authorization",
      "Admin access is fixed in the database and cannot be changed here."
    )
  }

  return setApprovalStatus(userId, status)
}

function assertAdmin(actor: ApplicationUser) {
  if (actor.role !== "admin" || !isFixedAdminUsername(actor.githubUsername)) {
    throw new ApplicationError(
      "authorization",
      "Only the admin can manage users."
    )
  }
}
