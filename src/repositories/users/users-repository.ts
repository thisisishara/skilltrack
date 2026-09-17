import "server-only"

import { ApplicationError } from "@/domain/errors"
import type { ApplicationUser, GithubProfileInput } from "@/domain/users/types"
import type { ApprovalStatus } from "@/lib/auth/access"
import type { Database } from "@/lib/supabase/database"
import { getSupabaseServerClient } from "@/lib/supabase/server"
import { logEvent } from "@/lib/observability/log"

type UserRow = Database["public"]["Tables"]["users"]["Row"]

function toApplicationUser(row: UserRow): ApplicationUser {
  return {
    id: row.id,
    githubUserId: row.github_user_id,
    githubUsername: row.github_username,
    displayName: row.display_name,
    avatarUrl: row.avatar_url,
    role: row.role,
    approvalStatus: row.approval_status,
    approvedAt: row.approved_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

export async function getByGithubUserId(githubUserId: string) {
  const supabase = getSupabaseServerClient()
  const { data, error } = await supabase
    .from("users")
    .select()
    .eq("github_user_id", githubUserId)
    .maybeSingle()

  if (error) {
    logEvent("error", "database.users.get_by_github_failed")
    throw new ApplicationError(
      "database",
      "Could not load your SkillTrack account.",
      { cause: error }
    )
  }

  return data ? toApplicationUser(data) : null
}

export async function upsertByGithubProfile(input: GithubProfileInput) {
  const supabase = getSupabaseServerClient()
  const { data, error } = await supabase
    .from("users")
    .upsert(
      {
        github_user_id: input.githubUserId,
        github_username: input.githubUsername,
        display_name: input.displayName ?? null,
        avatar_url: input.avatarUrl ?? null,
      },
      { onConflict: "github_user_id" }
    )
    .select()
    .single()

  if (error || !data) {
    logEvent("error", "database.users.upsert_failed")
    throw new ApplicationError(
      "database",
      "Could not load your SkillTrack account.",
      { cause: error }
    )
  }

  return toApplicationUser(data)
}

export async function listUsers() {
  const supabase = getSupabaseServerClient()
  const { data, error } = await supabase
    .from("users")
    .select()
    .order("created_at", { ascending: true })

  if (error) {
    logEvent("error", "database.users.list_failed")
    throw new ApplicationError("database", "Could not load users.", {
      cause: error,
    })
  }

  return (data ?? []).map(toApplicationUser)
}

export async function getUserById(id: string) {
  const supabase = getSupabaseServerClient()
  const { data, error } = await supabase
    .from("users")
    .select()
    .eq("id", id)
    .maybeSingle()

  if (error) {
    logEvent("error", "database.users.get_failed")
    throw new ApplicationError("database", "Could not load that user.", {
      cause: error,
    })
  }

  return data ? toApplicationUser(data) : null
}

export async function setApprovalStatus(
  userId: string,
  status: Extract<ApprovalStatus, "approved" | "denied">
) {
  const supabase = getSupabaseServerClient()
  const { data, error } = await supabase
    .from("users")
    .update({
      approval_status: status,
      approved_at: status === "approved" ? new Date().toISOString() : null,
    })
    .eq("id", userId)
    .eq("role", "user")
    .select()
    .maybeSingle()

  if (error) {
    logEvent("error", "database.users.approval_failed")
    throw new ApplicationError("database", "Could not update that request.", {
      cause: error,
    })
  }

  if (!data) {
    throw new ApplicationError(
      "authorization",
      "That account cannot be approved or denied."
    )
  }

  return toApplicationUser(data)
}
