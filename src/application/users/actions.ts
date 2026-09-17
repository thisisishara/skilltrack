"use server"

import { revalidatePath } from "next/cache"

import { setUserApproval } from "@/application/users/users-service"
import type { ApplicationErrorCode } from "@/domain/errors"
import type { ApplicationUser } from "@/domain/users/types"
import { failAction } from "@/lib/errors/present"
import { requireApprovedSession } from "@/lib/auth/session"

export type UserAccessActionResult =
  | { ok: true; user: ApplicationUser }
  | { ok: false; code: ApplicationErrorCode; message: string }

function revalidateUsers() {
  revalidatePath("/dashboard/users")
}

export async function approveUserAction(
  userId: string
): Promise<UserAccessActionResult> {
  try {
    const { applicationUser } = await requireApprovedSession()
    const user = await setUserApproval(applicationUser, userId, "approved")
    revalidateUsers()
    return { ok: true, user }
  } catch (error) {
    return failAction(error, "users.approve_failed")
  }
}

export async function denyUserAction(
  userId: string
): Promise<UserAccessActionResult> {
  try {
    const { applicationUser } = await requireApprovedSession()
    const user = await setUserApproval(applicationUser, userId, "denied")
    revalidateUsers()
    return { ok: true, user }
  } catch (error) {
    return failAction(error, "users.deny_failed")
  }
}
