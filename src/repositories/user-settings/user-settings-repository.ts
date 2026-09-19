import "server-only"

import { ApplicationError } from "@/domain/errors"
import { parseTrackConfig } from "@/domain/user-settings/parse"
import { defaultTrackConfig } from "@/domain/user-settings/defaults"
import type { UserSettings } from "@/domain/user-settings/types"
import type { Database } from "@/lib/supabase/database"
import { getSupabaseServerClient } from "@/lib/supabase/server"
import { logEvent } from "@/lib/observability/log"

type SettingsRow = Database["public"]["Tables"]["user_settings"]["Row"]

function toSettings(row: SettingsRow): UserSettings {
  return {
    userId: row.user_id,
    notificationsEnabled: row.notifications_enabled,
    trackEnabled: row.track_enabled,
    trackProvider: row.track_provider,
    trackModel: row.track_model,
    trackBaseUrl: row.track_base_url,
    trackApiKeyCiphertext: row.track_api_key_ciphertext,
    trackApiKeyIv: row.track_api_key_iv,
    trackApiKeyLast4: row.track_api_key_last4,
    trackConfig: parseTrackConfig(row.track_config),
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
    trackEnabled: boolean
    trackProvider: UserSettings["trackProvider"]
    trackModel: string | null
    trackBaseUrl: string | null
    trackApiKeyCiphertext: string | null
    trackApiKeyIv: string | null
    trackApiKeyLast4: string | null
    trackConfig: UserSettings["trackConfig"]
  }>
) {
  const supabase = getSupabaseServerClient()
  const existing = await getUserSettings(userId)
  const nextConfig = patch.trackConfig ?? existing?.trackConfig ?? defaultTrackConfig()
  const { data, error } = await supabase
    .from("user_settings")
    .upsert(
      {
        user_id: userId,
        notifications_enabled:
          patch.notificationsEnabled ?? existing?.notificationsEnabled ?? true,
        track_enabled: patch.trackEnabled ?? existing?.trackEnabled ?? false,
        track_provider:
          patch.trackProvider === undefined
            ? existing?.trackProvider ?? null
            : patch.trackProvider,
        track_model:
          patch.trackModel === undefined
            ? existing?.trackModel ?? null
            : patch.trackModel,
        track_base_url:
          patch.trackBaseUrl === undefined
            ? existing?.trackBaseUrl ?? null
            : patch.trackBaseUrl,
        track_api_key_ciphertext:
          patch.trackApiKeyCiphertext === undefined
            ? existing?.trackApiKeyCiphertext ?? null
            : patch.trackApiKeyCiphertext,
        track_api_key_iv:
          patch.trackApiKeyIv === undefined
            ? existing?.trackApiKeyIv ?? null
            : patch.trackApiKeyIv,
        track_api_key_last4:
          patch.trackApiKeyLast4 === undefined
            ? existing?.trackApiKeyLast4 ?? null
            : patch.trackApiKeyLast4,
        track_config: nextConfig as unknown as Database["public"]["Tables"]["user_settings"]["Insert"]["track_config"],
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
