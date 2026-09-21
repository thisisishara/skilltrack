import "server-only"

import { ApplicationError } from "@/domain/errors"
import { parseTrackyConfig } from "@/domain/user-settings/parse"
import { defaultTrackyConfig } from "@/domain/user-settings/defaults"
import type { UserSettings } from "@/domain/user-settings/types"
import type { Database } from "@/lib/supabase/database"
import { getSupabaseServerClient } from "@/lib/supabase/server"
import { logEvent } from "@/lib/observability/log"

type SettingsRow = Database["public"]["Tables"]["user_settings"]["Row"]

function toSettings(row: SettingsRow): UserSettings {
  return {
    userId: row.user_id,
    notificationsEnabled: row.notifications_enabled,
    trackyEnabled: row.tracky_enabled,
    trackyProvider: row.tracky_provider,
    trackyModel: row.tracky_model,
    trackyBaseUrl: row.tracky_base_url,
    trackyApiKeyCiphertext: row.tracky_api_key_ciphertext,
    trackyApiKeyIv: row.tracky_api_key_iv,
    trackyApiKeyLast4: row.tracky_api_key_last4,
    trackyConfig: parseTrackyConfig(row.tracky_config),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

export async function getUserSettings(userId: string) {
  const supabase = getSupabaseServerClient()
  const { data, error } = await supabase
    .from("user_settings")
    .select()
    .eq("user_id", userId)
    .maybeSingle()

  if (error) {
    logEvent("error", "database.user_settings.get_failed")
    throw new ApplicationError("database", "Could not load settings.", {
      cause: error,
    })
  }

  return data ? toSettings(data) : null
}

export async function upsertUserSettings(
  userId: string,
  patch: Partial<{
    notificationsEnabled: boolean
    trackyEnabled: boolean
    trackyProvider: UserSettings["trackyProvider"]
    trackyModel: string | null
    trackyBaseUrl: string | null
    trackyApiKeyCiphertext: string | null
    trackyApiKeyIv: string | null
    trackyApiKeyLast4: string | null
    trackyConfig: UserSettings["trackyConfig"]
  }>
) {
  const supabase = getSupabaseServerClient()
  const existing = await getUserSettings(userId)
  const nextConfig = patch.trackyConfig ?? existing?.trackyConfig ?? defaultTrackyConfig()
  const { data, error } = await supabase
    .from("user_settings")
    .upsert(
      {
        user_id: userId,
        notifications_enabled:
          patch.notificationsEnabled ?? existing?.notificationsEnabled ?? true,
        tracky_enabled: patch.trackyEnabled ?? existing?.trackyEnabled ?? false,
        tracky_provider:
          patch.trackyProvider === undefined
            ? existing?.trackyProvider ?? null
            : patch.trackyProvider,
        tracky_model:
          patch.trackyModel === undefined
            ? existing?.trackyModel ?? null
            : patch.trackyModel,
        tracky_base_url:
          patch.trackyBaseUrl === undefined
            ? existing?.trackyBaseUrl ?? null
            : patch.trackyBaseUrl,
        tracky_api_key_ciphertext:
          patch.trackyApiKeyCiphertext === undefined
            ? existing?.trackyApiKeyCiphertext ?? null
            : patch.trackyApiKeyCiphertext,
        tracky_api_key_iv:
          patch.trackyApiKeyIv === undefined
            ? existing?.trackyApiKeyIv ?? null
            : patch.trackyApiKeyIv,
        tracky_api_key_last4:
          patch.trackyApiKeyLast4 === undefined
            ? existing?.trackyApiKeyLast4 ?? null
            : patch.trackyApiKeyLast4,
        tracky_config: nextConfig as unknown as Database["public"]["Tables"]["user_settings"]["Insert"]["tracky_config"],
      },
      { onConflict: "user_id" }
    )
    .select()
    .single()

  if (error || !data) {
    logEvent("error", "database.user_settings.upsert_failed")
    throw new ApplicationError("database", "Could not save settings.", {
      cause: error,
    })
  }

  return toSettings(data)
}
