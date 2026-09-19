import "server-only"

import { ApplicationError } from "@/domain/errors"
import { emptyExtraModels, type TrackExtraModels } from "@/domain/user-settings/models"
import type { TrackProvider } from "@/domain/user-settings/types"
import { logEvent } from "@/lib/observability/log"
import { getSupabaseServerClient } from "@/lib/supabase/server"

export async function listTrackModelCatalog(): Promise<TrackExtraModels> {
  const supabase = getSupabaseServerClient()
  const extra = emptyExtraModels()
  const { data, error } = await supabase
    .from("track_model_catalog")
    .select("provider, model_id")
    .order("created_at", { ascending: true })

  if (error) {
    logEvent("error", "database.track_model_catalog.list_failed", {
      message: error.message,
      code: error.code ?? null,
    })
    throw new ApplicationError("database", "Could not load the model catalog.", {
      cause: error,
    })
  }

  for (const row of data ?? []) {
    extra[row.provider].push(row.model_id)
  }
  return extra
}

export async function insertTrackCatalogModel(
  provider: TrackProvider,
  modelId: string
) {
  const supabase = getSupabaseServerClient()
  const { error } = await supabase.from("track_model_catalog").insert({
    provider,
    model_id: modelId,
  })

  if (error) {
    if (error.code === "23505") {
      throw new ApplicationError("conflict", "That model is already in the list.")
    }
    logEvent("error", "database.track_model_catalog.insert_failed")
    throw new ApplicationError("database", "Could not add that model.", {
      cause: error,
    })
  }
}

export async function deleteTrackCatalogModel(
  provider: TrackProvider,
  modelId: string
) {
  const supabase = getSupabaseServerClient()
  const { error } = await supabase
    .from("track_model_catalog")
    .delete()
    .eq("provider", provider)
    .eq("model_id", modelId)

  if (error) {
    logEvent("error", "database.track_model_catalog.delete_failed")
    throw new ApplicationError("database", "Could not remove that model.", {
      cause: error,
    })
  }
}
