"use server"

import { getSearchIndex, type SearchIndex } from "@/application/search/search-service"
import { failAction } from "@/lib/errors/present"
import { requireApprovedSession } from "@/lib/auth/session"

export type SearchIndexResult =
  | { ok: true; index: SearchIndex }
  | { ok: false; code: string; message: string }

export async function getSearchIndexAction(): Promise<SearchIndexResult> {
  try {
    const { applicationUser } = await requireApprovedSession()
    const index = await getSearchIndex(applicationUser.id)
    return { ok: true, index }
  } catch (error) {
    return failAction(error, "search.index_failed")
  }
}
