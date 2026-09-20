import "server-only"

import { cache } from "react"

import { getRoleForUser } from "@/application/roles/roles-service"
import {
  decryptTrackApiKey,
  getUserSettingsOrDefault,
  toPublicSettings,
} from "@/application/user-settings/user-settings-service"
import { ApplicationError } from "@/domain/errors"
import type { ExtractedJob } from "@/lib/jobs/extracted-job"
import { extractJobWithAi } from "@/lib/jobs/extract-with-ai"
import { tryFetchLinkedInJobHtml } from "@/lib/jobs/fetch-linkedin"
import { mergeExtractedJobs, type MergeMode } from "@/lib/jobs/merge-extracted"
import { parseJobInput } from "@/lib/jobs/parse-linkedin"
import { assertPasteSize } from "@/lib/jobs/paste-size"
import { createTrackModel } from "@/lib/ai/providers"
import * as jobsRepository from "@/repositories/jobs/jobs-repository"

export const listJobsForRole = cache(async (userId: string, roleId: string) => {
  const role = await getRoleForUser(userId, roleId)
  if (!role) {
    throw new ApplicationError("not_found", "That role was not found.")
  }
  return jobsRepository.listByRoleId(userId, roleId)
})

export const getJobForRole = cache(
  async (userId: string, roleId: string, jobId: string) => {
    const role = await getRoleForUser(userId, roleId)
    if (!role) {
      throw new ApplicationError("not_found", "That role was not found.")
    }
    return jobsRepository.getByIdForUser(userId, roleId, jobId)
  }
)

export async function extractJobForUser(
  userId: string,
  input: {
    paste: string
    sourceUrl?: string | null
    method: "rules" | "ai"
    mergeMode?: MergeMode
    fetchIfEmpty?: boolean
  }
) {
  let paste = input.paste ?? ""
  try {
    assertPasteSize(paste)
  } catch {
    throw new ApplicationError(
      "validation",
      "Pasted job source is too large. Cap is 2 MB."
    )
  }

  let fetchFailed: string | null = null
  let fetchedUrl: string | null = null
  if (!paste.trim() && input.fetchIfEmpty && input.sourceUrl) {
    const fetched = await tryFetchLinkedInJobHtml(input.sourceUrl)
    if (fetched.ok) {
      paste = fetched.html
      fetchedUrl = fetched.url
    } else {
      fetchFailed = fetched.message
    }
  }

  const rules = parseJobInput({
    paste,
    sourceUrl: fetchedUrl ?? input.sourceUrl,
  })

  if (input.method === "ai" && !paste.trim()) {
    throw new ApplicationError(
      "validation",
      fetchFailed ??
        "Paste the job page source or the job text. LinkedIn URLs usually cannot be fetched from the server."
    )
  }

  if (input.method === "rules") {
    return { job: rules, fetchFailed }
  }

  const settings = await getUserSettingsOrDefault(userId)
  const publicSettings = toPublicSettings(settings)
  if (!publicSettings.trackEnabled || !settings.trackProvider) {
    throw new ApplicationError(
      "authorization",
      "Turn on Track and add an API key in User settings to extract with AI."
    )
  }
  const apiKey = await decryptTrackApiKey(settings)
  if (!apiKey) {
    throw new ApplicationError(
      "authorization",
      "Track needs an API key before AI extraction can run."
    )
  }

  const ai = await extractJobWithAi({
    model: createTrackModel({
      provider: settings.trackProvider,
      apiKey,
      model: settings.trackModel,
      baseUrl: settings.trackBaseUrl,
    }),
    paste,
    sourceUrl: fetchedUrl ?? input.sourceUrl,
  })

  return {
    job: mergeExtractedJobs(rules, ai, input.mergeMode ?? "fill"),
    fetchFailed,
  }
}

export async function createJobForRole(
  userId: string,
  roleId: string,
  job: ExtractedJob
) {
  const role = await getRoleForUser(userId, roleId)
  if (!role) {
    throw new ApplicationError("not_found", "That role was not found.")
  }
  if (!job.companyName.trim() || !job.roleTitle.trim()) {
    throw new ApplicationError(
      "validation",
      "Company and job title are required before saving."
    )
  }
  const saved = await jobsRepository.insert(userId, roleId, job)
  if (!saved) {
    throw new ApplicationError("database", "Could not save that job.")
  }
  return saved
}

export async function deleteJobForRole(
  userId: string,
  roleId: string,
  jobId: string
) {
  const role = await getRoleForUser(userId, roleId)
  if (!role) {
    throw new ApplicationError("not_found", "That role was not found.")
  }
  await jobsRepository.deleteForUser(userId, roleId, jobId)
}
