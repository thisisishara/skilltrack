"use server"

import { revalidatePath } from "next/cache"

import { listManagedUsers } from "@/application/users/users-service"
import {
  getPublicUserSettings,
  resetTrackyConfig,
  saveTrackySettings,
  setNotificationsEnabled,
} from "@/application/user-settings/user-settings-service"
import type { ApplicationErrorCode } from "@/domain/errors"
import type { ApplicationUser } from "@/domain/users/types"
import type { TrackyExtraModels } from "@/domain/user-settings/models"
import type {
  PublicUserSettings,
  TrackyConfig,
  TrackyProvider,
} from "@/domain/user-settings/types"
import {
  addTrackyCatalogModel,
  removeTrackyCatalogModel,
} from "@/application/tracky-model-catalog/tracky-model-catalog-service"
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

export async function saveTrackySettingsAction(input: {
  enabled: boolean
  provider: TrackyProvider | null
  model: string | null
  baseUrl: string | null
  apiKey?: string | null
  clearApiKey?: boolean
  trackyConfig: TrackyConfig
}): Promise<SettingsActionResult> {
  try {
    const { applicationUser } = await requireApprovedSession()
    const settings = await saveTrackySettings(applicationUser.id, input)
    revalidateDashboard()
    return { ok: true, settings }
  } catch (error) {
    return failAction(error, "user_settings.tracky_failed")
  }
}

export async function resetTrackyConfigAction(): Promise<SettingsActionResult> {
  try {
    const { applicationUser } = await requireApprovedSession()
    const settings = await resetTrackyConfig(applicationUser.id)
    revalidateDashboard()
    return { ok: true, settings }
  } catch (error) {
    return failAction(error, "user_settings.reset_failed")
  }
}

export type ModelCatalogResult =
  | { ok: true; extraModels: TrackyExtraModels }
  | { ok: false; code: ApplicationErrorCode; message: string }

export async function addTrackyCatalogModelAction(
  provider: TrackyProvider,
  modelId: string
): Promise<ModelCatalogResult> {
  try {
    const { applicationUser } = await requireApprovedSession()
    const extraModels = await addTrackyCatalogModel(
      applicationUser,
      provider,
      modelId
    )
    revalidateDashboard()
    return { ok: true, extraModels }
  } catch (error) {
    return failAction(error, "user_settings.models_failed")
  }
}

export async function removeTrackyCatalogModelAction(
  provider: TrackyProvider,
  modelId: string
): Promise<ModelCatalogResult> {
  try {
    const { applicationUser } = await requireApprovedSession()
    const extraModels = await removeTrackyCatalogModel(
      applicationUser,
      provider,
      modelId
    )
    revalidateDashboard()
    return { ok: true, extraModels }
  } catch (error) {
    return failAction(error, "user_settings.models_failed")
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
