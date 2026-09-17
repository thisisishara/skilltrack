export const FIXED_ADMIN_GITHUB_USERNAME = "thisisishara"

export const E2E_GITHUB_USERNAME = "e2e-skilltrack"

export type UserRole = "admin" | "user"

export type ApprovalStatus = "pending" | "approved" | "denied"

export function isFixedAdminUsername(
  username: string | null | undefined
): boolean {
  return username?.toLowerCase() === FIXED_ADMIN_GITHUB_USERNAME
}

export function isApprovedStatus(
  status: ApprovalStatus | null | undefined
): boolean {
  return status === "approved"
}
