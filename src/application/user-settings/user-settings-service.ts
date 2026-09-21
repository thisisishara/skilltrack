import "server-only"

import { ApplicationError, isApplicationError } from "@/domain/errors"
import { defaultTrackyConfig } from "@/domain/user-settings/defaults"
import { emptyExtraModels, type TrackyExtraModels } from "@/domain/user-settings/models"
import { parseTrackyConfig } from "@/domain/user-settings/parse"
import type {
  PublicUserSettings,
  TrackyConfig,
  TrackyProvider,
  UserSettings,
} from "@/domain/user-settings/types"
import { getTrackyModelCatalog } from "@/application/tracky-model-catalog/tracky-model-catalog-service"
import {
  decryptSecret,
  encryptSecret,
  isTrackyEncryptionConfigured,
  secretLast4,
} from "@/lib/crypto/secret"
import { validateProviderKey } from "@/lib/ai/validate-key"
import {
  getUserSettings,
  upsertUserSettings,
} from "@/repositories/user-settings/user-settings-repository"

export function toPublicSettings(
  settings: UserSettings | null,
  extraModels: TrackyExtraModels = emptyExtraModels()
): PublicUserSettings {
  const encryptionConfigured = isTrackyEncryptionConfigured()
  const config = settings?.trackyConfig ?? defaultTrackyConfig()
  const hasApiKey = Boolean(
    settings?.trackyApiKeyCiphertext && settings.trackyApiKeyIv
  )
  const trackyEnabled = Boolean(
    settings?.trackyEnabled && hasApiKey && encryptionConfigured && settings.trackyProvider
  )
  return {
    notificationsEnabled: settings?.notificationsEnabled ?? true,
    trackyEnabled,
    trackyProvider: settings?.trackyProvider ?? null,
    trackyModel: settings?.trackyModel ?? null,
    trackyBaseUrl: settings?.trackyBaseUrl ?? null,
    trackyApiKeyLast4: settings?.trackyApiKeyLast4 ?? null,
    hasApiKey,
    trackyConfig: config,
    extraModels,
    encryptionConfigured,
  }
}

async function toPublicSettingsWithCatalog(settings: UserSettings | null) {
  return toPublicSettings(settings, await getTrackyModelCatalog())
}

export async function getPublicUserSettings(userId: string) {
  try {
    const settings = await getUserSettings(userId)
    return toPublicSettingsWithCatalog(settings)
  } catch (error) {
    if (isApplicationError(error) && error.code === "database") {
      return toPublicSettingsWithCatalog(null)
    }
    throw error
  }
}

export async function getUserSettingsOrDefault(userId: string) {
  return (await getUserSettings(userId)) ?? {
    userId,
    notificationsEnabled: true,
    trackyEnabled: false,
    trackyProvider: null,
    trackyModel: null,
    trackyBaseUrl: null,
    trackyApiKeyCiphertext: null,
    trackyApiKeyIv: null,
    trackyApiKeyLast4: null,
    trackyConfig: defaultTrackyConfig(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  } satisfies UserSettings
}

export async function setNotificationsEnabled(userId: string, enabled: boolean) {
  return toPublicSettingsWithCatalog(
    await upsertUserSettings(userId, { notificationsEnabled: enabled })
  )
}

export async function saveTrackySettings(
  userId: string,
  input: {
    enabled: boolean
    provider: TrackyProvider | null
    model: string | null
    baseUrl: string | null
    apiKey?: string | null
    clearApiKey?: boolean
    trackyConfig: TrackyConfig
  }
) {
  const existing = await getUserSettingsOrDefault(userId)
  const config = parseTrackyConfig(input.trackyConfig)
  let ciphertext = existing.trackyApiKeyCiphertext
  let iv = existing.trackyApiKeyIv
  let last4 = existing.trackyApiKeyLast4
  const provider = input.provider
  const model = input.model?.trim() || null
  const baseUrl = input.baseUrl?.trim() || null

  if (input.clearApiKey) {
    ciphertext = null
    iv = null
    last4 = null
  }

  const incomingKey = input.apiKey?.trim() ?? ""
  if (incomingKey) {
    if (!isTrackyEncryptionConfigured()) {
      throw new ApplicationError(
        "validation",
        "Tracky cannot store API keys until TRACKY_ENCRYPTION_KEY is set on the server."
      )
    }
    if (!provider) {
      throw new ApplicationError("validation", "Choose a provider for Tracky.")
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
  let trackyEnabled = input.enabled
  if (trackyEnabled) {
    if (!isTrackyEncryptionConfigured()) {
      throw new ApplicationError(
        "validation",
        "Tracky cannot be enabled until TRACKY_ENCRYPTION_KEY is set on the server."
      )
    }
    if (!provider || !model || !hasKey) {
      trackyEnabled = false
    }
  }

  if (!hasKey || !provider || !model) {
    trackyEnabled = false
  }

  return toPublicSettingsWithCatalog(
    await upsertUserSettings(userId, {
      trackyEnabled,
      trackyProvider: provider,
      trackyModel: model,
      trackyBaseUrl: baseUrl,
      trackyApiKeyCiphertext: ciphertext,
      trackyApiKeyIv: iv,
      trackyApiKeyLast4: last4,
      trackyConfig: config,
    })
  )
}

export async function resetTrackyConfig(userId: string) {
  const existing = await getUserSettingsOrDefault(userId)
  return toPublicSettingsWithCatalog(
    await upsertUserSettings(userId, {
      trackyConfig: defaultTrackyConfig(),
      trackyEnabled: existing.trackyEnabled,
    })
  )
}

export async function decryptTrackyApiKey(settings: UserSettings) {
  if (!settings.trackyApiKeyCiphertext || !settings.trackyApiKeyIv) {
    return null
  }
  if (!isTrackyEncryptionConfigured()) {
    return null
  }
  return decryptSecret(settings.trackyApiKeyCiphertext, settings.trackyApiKeyIv)
}
