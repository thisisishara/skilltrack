import "server-only"

import { ApplicationError } from "@/domain/errors"
import {
  addExtraModel,
  emptyExtraModels,
  normalizeModelId,
  type TrackExtraModels,
} from "@/domain/user-settings/models"
import type { TrackProvider } from "@/domain/user-settings/types"
import { isFixedAdminUsername } from "@/lib/auth/access"
import type { ApplicationUser } from "@/domain/users/types"
import {
  deleteTrackCatalogModel,
  insertTrackCatalogModel,
  listTrackModelCatalog,
} from "@/repositories/track-model-catalog/track-model-catalog-repository"

export async function getTrackModelCatalog(): Promise<TrackExtraModels> {
  try {
    return await listTrackModelCatalog()
  } catch (error) {
    if (error instanceof ApplicationError && error.code === "database") {
      return emptyExtraModels()
    }
    throw error
  }
}

export async function addTrackCatalogModel(
  actor: ApplicationUser,
  provider: TrackProvider,
  modelId: string
) {
  assertAdmin(actor)
  const catalog = await getTrackModelCatalog()
  const preview = addExtraModel(catalog, provider, modelId)
  if (!preview.ok) {
    throw new ApplicationError("validation", preview.message)
  }
  await insertTrackCatalogModel(provider, normalizeModelId(modelId))
  return getTrackModelCatalog()
}

export async function removeTrackCatalogModel(
  actor: ApplicationUser,
  provider: TrackProvider,
  modelId: string
) {
  assertAdmin(actor)
  await deleteTrackCatalogModel(provider, modelId)
  return getTrackModelCatalog()
}

function assertAdmin(actor: ApplicationUser) {
  if (actor.role !== "admin" || !isFixedAdminUsername(actor.githubUsername)) {
    throw new ApplicationError(
      "authorization",
      "Only the admin can manage models."
    )
  }
}
