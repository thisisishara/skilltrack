import "server-only"

import { ApplicationError } from "@/domain/errors"
import { displayRoleName } from "@/domain/roles/name"
import type { Role } from "@/domain/roles/types"
import type { Database } from "@/lib/supabase/database"
import { getSupabaseServerClient } from "@/lib/supabase/server"

type RoleRow = Database["public"]["Tables"]["roles"]["Row"]

function toRole(row: RoleRow): Role {
  return {
    id: row.id,
    userId: row.user_id,
    name: row.name,
    description: row.description,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

function throwFromSupabase(error: { code?: string; message?: string } | null): never {
  if (error?.code === "23505") {
    throw new ApplicationError(
      "conflict",
      "Roadmap name already exists.",
      { cause: error }
    )
  }

  console.error(
    JSON.stringify({
      event: "database.roles.failed",
      code: error?.code ?? null,
    })
  )
  throw new ApplicationError("database", "Could not update roles.", {
    cause: error,
  })
}

export async function listByUserId(userId: string) {
  const supabase = getSupabaseServerClient()
  const { data, error } = await supabase
    .from("roles")
    .select()
    .eq("user_id", userId)
    .order("created_at", { ascending: true })

  if (error) {
    throwFromSupabase(error)
  }

  return (data ?? []).map(toRole)
}

export async function getByIdForUser(userId: string, roleId: string) {
  const supabase = getSupabaseServerClient()
  const { data, error } = await supabase
    .from("roles")
    .select()
    .eq("user_id", userId)
    .eq("id", roleId)
    .maybeSingle()

  if (error) {
    throwFromSupabase(error)
  }

  return data ? toRole(data) : null
}

export async function insert(userId: string, name: string) {
  const supabase = getSupabaseServerClient()
  const { data, error } = await supabase
    .from("roles")
    .insert({
      user_id: userId,
      name: displayRoleName(name),
    })
    .select()
    .single()

  if (error || !data) {
    throwFromSupabase(error)
  }

  return toRole(data)
}

export async function updateName(userId: string, roleId: string, name: string) {
  const supabase = getSupabaseServerClient()
  const { data, error } = await supabase
    .from("roles")
    .update({ name: displayRoleName(name) })
    .eq("user_id", userId)
    .eq("id", roleId)
    .select()
    .maybeSingle()

  if (error) {
    throwFromSupabase(error)
  }

  if (!data) {
    throw new ApplicationError("not_found", "That role no longer exists.")
  }

  return toRole(data)
}

export async function deleteForUser(userId: string, roleId: string) {
  const supabase = getSupabaseServerClient()
  const { data, error } = await supabase
    .from("roles")
    .delete()
    .eq("user_id", userId)
    .eq("id", roleId)
    .select("id")
    .maybeSingle()

  if (error) {
    throwFromSupabase(error)
  }

  if (!data) {
    throw new ApplicationError("not_found", "That role no longer exists.")
  }
}
