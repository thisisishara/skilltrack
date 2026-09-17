"use server"

import { revalidatePath } from "next/cache"

import {
  createEmptyRole,
  deleteRole,
  renameRole,
  updateRoleDescription,
  updateRoleNotes,
} from "@/application/roles/roles-service"
import { ApplicationError, type ApplicationErrorCode } from "@/domain/errors"
import type { Role } from "@/domain/roles/types"
import { failAction } from "@/lib/errors/present"
import { requireSession } from "@/lib/auth/session"

export type RoleActionResult =
  | { ok: true; role: Role }
  | { ok: true; deletedRoleId: string }
  | { ok: false; code: ApplicationErrorCode; message: string }

function fail(error: unknown): RoleActionResult {
  return failAction(error, "roles.action_failed")
}

function revalidateRoles() {
  revalidatePath("/dashboard", "layout")
}

export async function createRoleAction(name: string): Promise<RoleActionResult> {
  try {
    const { applicationUser } = await requireSession()
    const role = await createEmptyRole(applicationUser.id, name)
    revalidateRoles()
    return { ok: true, role }
  } catch (error) {
    return fail(error)
  }
}

export async function renameRoleAction(
  roleId: string,
  name: string
): Promise<RoleActionResult> {
  try {
    if (!roleId) {
      throw new ApplicationError("validation", "Select a role first.")
    }

    const { applicationUser } = await requireSession()
    const role = await renameRole(applicationUser.id, roleId, name)
    revalidateRoles()
    return { ok: true, role }
  } catch (error) {
    return fail(error)
  }
}

export async function updateRoleNotesAction(
  roleId: string,
  notes: string | null
): Promise<RoleActionResult> {
  try {
    if (!roleId) {
      throw new ApplicationError("validation", "Select a role first.")
    }

    const { applicationUser } = await requireSession()
    const role = await updateRoleNotes(applicationUser.id, roleId, notes)
    revalidateRoles()
    return { ok: true, role }
  } catch (error) {
    return fail(error)
  }
}

export async function updateRoleDescriptionAction(
  roleId: string,
  description: string | null
): Promise<RoleActionResult> {
  try {
    if (!roleId) {
      throw new ApplicationError("validation", "Select a role first.")
    }

    const { applicationUser } = await requireSession()
    const role = await updateRoleDescription(applicationUser.id, roleId, description)
    revalidateRoles()
    return { ok: true, role }
  } catch (error) {
    return fail(error)
  }
}

export async function deleteRoleAction(
  roleId: string
): Promise<RoleActionResult> {
  try {
    if (!roleId) {
      throw new ApplicationError("validation", "Select a role first.")
    }

    const { applicationUser } = await requireSession()
    await deleteRole(applicationUser.id, roleId)
    revalidateRoles()
    return { ok: true, deletedRoleId: roleId }
  } catch (error) {
    return fail(error)
  }
}
