"use server"

import { revalidatePath } from "next/cache"

import { listManagedUsers } from "@/application/users/users-service"
import {
  getPublicUserSettings,
  resetTrackConfig,
  saveTrackSettings,
  setNotificationsEnabled,
} from "@/application/user-settings/user-settings-service"
import type { ApplicationErrorCode } from "@/domain/errors"
import type { ApplicationUser } from "@/domain/users/types"
import type {
  PublicUserSettings,
  TrackConfig,
  TrackProvider,
} from "@/domain/user-settings/types"
import { failAction } from "@/lib/errors/present"
import { requireApprovedSession } from "@/lib/auth/session"

export type SettingsActionResult =
  | { ok: true; settings: PublicUserSettings }
  | { ok: false; code: ApplicationErrorCode; message: string }

export type ManagedUsersResult =
  | { ok: true; users: ApplicationUser[] }
  | { ok: false; code: ApplicationErrorCode; message: string }

function revalidateDashboard() {
  revalidatePath("/dashboard", "layout")
}

export async function getPublicUserSettingsAction(): Promise<SettingsActionResult> {
  try {
    const { applicationUser } = await requireApprovedSession()
    const settings = await getPublicUserSettings(applicationUser.id)
    return { ok: true, settings }
  } catch (error) {
    return failAction(error, "user_settings.load_failed")
  }
}

export async function setNotificationsEnabledAction(
  enabled: boolean
): Promise<SettingsActionResult> {
  try {
    const { applicationUser } = await requireApprovedSession()
    const settings = await setNotificationsEnabled(applicationUser.id, enabled)
    revalidateDashboard()
    return { ok: true, settings }
  } catch (error) {
    return failAction(error, "user_settings.notifications_failed")
  }
}

export async function saveTrackSettingsAction(input: {
  enabled: boolean
  provider: TrackProvider | null
  model: string | null
  baseUrl: string | null
  apiKey?: string | null
  clearApiKey?: boolean
  trackConfig: TrackConfig
}): Promise<SettingsActionResult> {
  try {
    const { applicationUser } = await requireApprovedSession()
    const settings = await saveTrackSettings(applicationUser.id, input)
    revalidateDashboard()
    return { ok: true, settings }
  } catch (error) {
    return failAction(error, "user_settings.track_failed")
  }
}

export async function resetTrackConfigAction(): Promise<SettingsActionResult> {
  try {
    const { applicationUser } = await requireApprovedSession()
    const settings = await resetTrackConfig(applicationUser.id)
    revalidateDashboard()
    return { ok: true, settings }
  } catch (error) {
    return failAction(error, "user_settings.reset_failed")
  }
}

export async function listManagedUsersAction(): Promise<ManagedUsersResult> {
  try {
    const { applicationUser } = await requireApprovedSession()
    const users = await listManagedUsers(applicationUser)
    return { ok: true, users }
  } catch (error) {
    return failAction(error, "users.list_failed")
  }
}
