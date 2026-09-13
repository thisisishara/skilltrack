import "server-only"

import { ApplicationError } from "@/domain/errors"
import type { ApplicationUser, GithubProfileInput } from "@/domain/users/types"
import type { Database } from "@/lib/supabase/database"
import { getSupabaseServerClient } from "@/lib/supabase/server"

type UserRow = Database["public"]["Tables"]["users"]["Row"]

function toApplicationUser(row: UserRow): ApplicationUser {
  return {
    id: row.id,
    githubUserId: row.github_user_id,
    githubUsername: row.github_username,
    displayName: row.display_name,
    avatarUrl: row.avatar_url,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
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
    console.error(
      JSON.stringify({
        event: "database.users.upsert_failed",
      })
    )
    throw new ApplicationError(
      "database",
      "Could not load your SkillTrack account.",
      { cause: error }
    )
  }

  return toApplicationUser(data)
}
