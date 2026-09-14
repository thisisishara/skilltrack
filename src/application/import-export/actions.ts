"use server"

import { revalidatePath } from "next/cache"

import {
  exportRoadmap,
  importRoadmap,
} from "@/application/import-export/import-export-service"
import type { RoleActionResult } from "@/application/roles/actions"
import {
  ApplicationError,
  type ApplicationErrorCode,
  isApplicationError,
} from "@/domain/errors"
import { requireSession } from "@/lib/auth/session"

export type ExportRoadmapResult =
  | { ok: true; filename: string; json: string }
  | { ok: false; code: ApplicationErrorCode; message: string }

function fail(error: unknown): { ok: false; code: ApplicationErrorCode; message: string } {
  if (isApplicationError(error)) {
    return { ok: false, code: error.code, message: error.message }
  }

  return {
    ok: false,
    code: "unexpected",
    message: "Something went wrong. Try again.",
  }
}

function revalidateImportedRole(roleId: string) {
  revalidatePath("/dashboard", "layout")
  revalidatePath(`/dashboard/roles/${roleId}`)
}

export async function importRoadmapAction(input: {
  json: string
  roleId?: string
  nameOverride?: string
}): Promise<RoleActionResult> {
  try {
    const { applicationUser } = await requireSession()
    const role = await importRoadmap(applicationUser.id, input.json, {
      roleId: input.roleId,
      nameOverride: input.nameOverride,
    })
    revalidateImportedRole(role.id)
    return { ok: true, role }
  } catch (error) {
    return fail(error)
  }
}

export async function exportRoadmapAction(
  roleId: string
): Promise<ExportRoadmapResult> {
  try {
    if (!roleId) {
      throw new ApplicationError("validation", "Select a role first.")
    }

    const { applicationUser } = await requireSession()
    const exported = await exportRoadmap(applicationUser.id, roleId)
    return { ok: true, ...exported }
  } catch (error) {
    return fail(error)
  }
}
