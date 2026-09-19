import "server-only"

import { ApplicationError, isApplicationError } from "@/domain/errors"
import { defaultTrackConfig } from "@/domain/user-settings/defaults"
import { parseTrackConfig } from "@/domain/user-settings/parse"
import type {
  PublicUserSettings,
  TrackConfig,
  TrackProvider,
  UserSettings,
} from "@/domain/user-settings/types"
import {
  decryptSecret,
  encryptSecret,
  isTrackEncryptionConfigured,
  secretLast4,
} from "@/lib/crypto/secret"
import { validateProviderKey } from "@/lib/ai/validate-key"
import {
  getUserSettings,
  upsertUserSettings,
} from "@/repositories/user-settings/user-settings-repository"

export function toPublicSettings(settings: UserSettings | null): PublicUserSettings {
  const encryptionConfigured = isTrackEncryptionConfigured()
  const config = settings?.trackConfig ?? defaultTrackConfig()
  const hasApiKey = Boolean(
    settings?.trackApiKeyCiphertext && settings.trackApiKeyIv
  )
  const trackEnabled = Boolean(
    settings?.trackEnabled && hasApiKey && encryptionConfigured && settings.trackProvider
  )
  return {
    notificationsEnabled: settings?.notificationsEnabled ?? true,
    trackEnabled,
    trackProvider: settings?.trackProvider ?? null,
    trackModel: settings?.trackModel ?? null,
    trackBaseUrl: settings?.trackBaseUrl ?? null,
    trackApiKeyLast4: settings?.trackApiKeyLast4 ?? null,
    hasApiKey,
    trackConfig: config,
    encryptionConfigured,
  }
}

export async function getPublicUserSettings(userId: string) {
  try {
    const settings = await getUserSettings(userId)
    return toPublicSettings(settings)
  } catch (error) {
    if (isApplicationError(error) && error.code === "database") {
      return toPublicSettings(null)
    }
    throw error
  }
}

export async function getUserSettingsOrDefault(userId: string) {
  return (await getUserSettings(userId)) ?? {
    userId,
    notificationsEnabled: true,
    trackEnabled: false,
    trackProvider: null,
    trackModel: null,
    trackBaseUrl: null,
    trackApiKeyCiphertext: null,
    trackApiKeyIv: null,
    trackApiKeyLast4: null,
    trackConfig: defaultTrackConfig(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  } satisfies UserSettings
}

export async function setNotificationsEnabled(userId: string, enabled: boolean) {
  return toPublicSettings(
    await upsertUserSettings(userId, { notificationsEnabled: enabled })
  )
}

export async function saveTrackSettings(
  userId: string,
  input: {
    enabled: boolean
    provider: TrackProvider | null
    model: string | null
    baseUrl: string | null
    apiKey?: string | null
    clearApiKey?: boolean
    trackConfig: TrackConfig
  }
) {
  const existing = await getUserSettingsOrDefault(userId)
  const config = parseTrackConfig(input.trackConfig)
  let ciphertext = existing.trackApiKeyCiphertext
  let iv = existing.trackApiKeyIv
  let last4 = existing.trackApiKeyLast4
  let provider = input.provider
  let model = input.model?.trim() || null
  let baseUrl = input.baseUrl?.trim() || null

  if (input.clearApiKey) {
    ciphertext = null
    iv = null
    last4 = null
  }

  const incomingKey = input.apiKey?.trim() ?? ""
  if (incomingKey) {
    if (!isTrackEncryptionConfigured()) {
      throw new ApplicationError(
        "validation",
        "Track cannot store API keys until TRACK_ENCRYPTION_KEY is set on the server."
      )
    }
    if (!provider) {
      throw new ApplicationError("validation", "Choose a provider for Track.")
    }
    const valid = await validateProviderKey({
      provider,
      apiKey: incomingKey,
      baseUrl,
    })
    if (!valid.ok) {
      throw new ApplicationError(
        "validation",
        valid.message ?? "That API key could not be verified."
      )
    }
    const encrypted = encryptSecret(incomingKey)
    ciphertext = encrypted.ciphertext
    iv = encrypted.iv
    last4 = secretLast4(incomingKey)
  }

  const hasKey = Boolean(ciphertext && iv)
  let trackEnabled = input.enabled
  if (trackEnabled) {
    if (!isTrackEncryptionConfigured()) {
      throw new ApplicationError(
        "validation",
        "Track cannot be enabled until TRACK_ENCRYPTION_KEY is set on the server."
      )
    }
    if (!provider || !model || !hasKey) {
      trackEnabled = false
    }
  }

  if (!hasKey || !provider || !model) {
    trackEnabled = false
  }

  return toPublicSettings(
    await upsertUserSettings(userId, {
      trackEnabled,
      trackProvider: provider,
      trackModel: model,
      trackBaseUrl: baseUrl,
      trackApiKeyCiphertext: ciphertext,
      trackApiKeyIv: iv,
      trackApiKeyLast4: last4,
      trackConfig: config,
    })
  )
}

export async function resetTrackConfig(userId: string) {
  const existing = await getUserSettingsOrDefault(userId)
  return toPublicSettings(
    await upsertUserSettings(userId, {
      trackConfig: defaultTrackConfig(),
      trackEnabled: existing.trackEnabled,
    })
  )
}

export async function decryptTrackApiKey(settings: UserSettings) {
  if (!settings.trackApiKeyCiphertext || !settings.trackApiKeyIv) {
    return null
  }
  if (!isTrackEncryptionConfigured()) {
    return null
  }
  return decryptSecret(settings.trackApiKeyCiphertext, settings.trackApiKeyIv)
}
