import "server-only"

import { ApplicationError } from "@/domain/errors"
import {
  addExtraModel,
  emptyExtraModels,
  normalizeModelId,
  type TrackyExtraModels,
} from "@/domain/user-settings/models"
import type { TrackyProvider } from "@/domain/user-settings/types"
import { isFixedAdminUsername } from "@/lib/auth/access"
import type { ApplicationUser } from "@/domain/users/types"
import {
  deleteTrackyCatalogModel,
  insertTrackyCatalogModel,
  listTrackyModelCatalog,
} from "@/repositories/tracky-model-catalog/tracky-model-catalog-repository"

export async function getTrackyModelCatalog(): Promise<TrackyExtraModels> {
  try {
    return await listTrackyModelCatalog()
  } catch (error) {
    if (error instanceof ApplicationError && error.code === "database") {
      return emptyExtraModels()
    }
    throw error
  }
}

export async function addTrackyCatalogModel(
  actor: ApplicationUser,
  provider: TrackyProvider,
  modelId: string
) {
  assertAdmin(actor)
  const catalog = await getTrackyModelCatalog()
  const preview = addExtraModel(catalog, provider, modelId)
  if (!preview.ok) {
    throw new ApplicationError("validation", preview.message)
  }
  await insertTrackyCatalogModel(provider, normalizeModelId(modelId))
  return getTrackyModelCatalog()
}

export async function removeTrackyCatalogModel(
  actor: ApplicationUser,
  provider: TrackyProvider,
  modelId: string
) {
  assertAdmin(actor)
  await deleteTrackyCatalogModel(provider, modelId)
  return getTrackyModelCatalog()
}

function assertAdmin(actor: ApplicationUser) {
  if (actor.role !== "admin" || !isFixedAdminUsername(actor.githubUsername)) {
    throw new ApplicationError(
      "authorization",
      "Only the admin can manage models."
    )
  }
}
