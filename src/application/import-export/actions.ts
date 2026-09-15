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
} from "@/domain/errors"
import { failAction } from "@/lib/errors/present"
import { requireSession } from "@/lib/auth/session"

export type ExportRoadmapResult =
  | { ok: true; filename: string; json: string }
  | { ok: false; code: ApplicationErrorCode; message: string }

function fail(error: unknown, event: string) {
  return failAction(error, event)
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
    return fail(error, "import.failed")
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
    return fail(error, "export.failed")
  }
}
