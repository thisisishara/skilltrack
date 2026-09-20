"use server"

import { revalidatePath } from "next/cache"

import {
  createJobForRole,
  deleteJobForRole,
  extractJobForUser,
  updateJobForRole,
} from "@/application/jobs/jobs-service"
import { ApplicationError, type ApplicationErrorCode } from "@/domain/errors"
import type { Job } from "@/domain/jobs/types"
import { extractedJobSchema, type ExtractedJob } from "@/lib/jobs/extracted-job"
import type { MergeMode } from "@/lib/jobs/merge-extracted"
import { failAction } from "@/lib/errors/present"
import { requireApprovedSession } from "@/lib/auth/session"

export type ExtractJobActionResult =
  | { ok: true; job: ExtractedJob; fetchFailed: string | null }
  | { ok: false; code: ApplicationErrorCode; message: string }

export type SaveJobActionResult =
  | { ok: true; job: Job; updated: boolean }
  | { ok: false; code: ApplicationErrorCode; message: string }

export type DeleteJobActionResult =
  | { ok: true; deletedJobId: string }
  | { ok: false; code: ApplicationErrorCode; message: string }

function revalidateJobs(roleId: string, jobId?: string) {
  revalidatePath(`/dashboard/roles/${roleId}/jobs`)
  if (jobId) {
    revalidatePath(`/dashboard/roles/${roleId}/jobs/${jobId}`)
  }
}

export async function extractJobAction(input: {
  paste: string
  sourceUrl?: string | null
  method: "rules" | "ai"
  mergeMode?: MergeMode
  fetchIfEmpty?: boolean
}): Promise<ExtractJobActionResult> {
  try {
    const { applicationUser } = await requireApprovedSession()
    const result = await extractJobForUser(applicationUser.id, {
      paste: input.paste ?? "",
      sourceUrl: input.sourceUrl,
      method: input.method,
      mergeMode: input.mergeMode,
      fetchIfEmpty: input.fetchIfEmpty,
    })
    return { ok: true, job: result.job, fetchFailed: result.fetchFailed }
  } catch (error) {
    return failAction(error, "jobs.extract_failed")
  }
}

export async function saveJobAction(
  roleId: string,
  job: ExtractedJob,
  options?: { replaceJobId?: string | null; saveAsNew?: boolean }
): Promise<SaveJobActionResult> {
  try {
    if (!roleId) {
      throw new ApplicationError("validation", "Select a role first.")
    }
    const parsed = extractedJobSchema.safeParse(job)
    if (!parsed.success) {
      throw new ApplicationError("validation", "Job preview is not valid.")
    }
    const { applicationUser } = await requireApprovedSession()
    const saved = options?.replaceJobId
      ? await updateJobForRole(
          applicationUser.id,
          roleId,
          options.replaceJobId,
          parsed.data
        )
      : await createJobForRole(applicationUser.id, roleId, parsed.data, {
          allowDuplicateExternalId: Boolean(options?.saveAsNew),
        })
    if (!saved) {
      throw new ApplicationError("database", "Could not save that job.")
    }
    revalidateJobs(roleId, saved.id)
    return { ok: true, job: saved, updated: Boolean(options?.replaceJobId) }
  } catch (error) {
    return failAction(error, "jobs.save_failed")
  }
}

export async function deleteJobAction(
  roleId: string,
  jobId: string
): Promise<DeleteJobActionResult> {
  try {
    if (!roleId || !jobId) {
      throw new ApplicationError("validation", "Select a job first.")
    }
    const { applicationUser } = await requireApprovedSession()
    await deleteJobForRole(applicationUser.id, roleId, jobId)
    revalidateJobs(roleId)
    return { ok: true, deletedJobId: jobId }
  } catch (error) {
    return failAction(error, "jobs.delete_failed")
  }
}
