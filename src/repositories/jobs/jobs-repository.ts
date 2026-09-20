import "server-only"

import { ApplicationError } from "@/domain/errors"
import { requirementsFromExtracted } from "@/domain/jobs/requirements"
import type { Job, JobRequirement } from "@/domain/jobs/types"
import {
  emptyJobCompensation,
  emptyJobExtras,
  emptyJobSections,
  extractedJobSchema,
  jobCompensationSchema,
  jobExtrasSchema,
  jobSectionsSchema,
  type ExtractedJob,
  type FieldConfidence,
  type JobCompensation,
  type JobExtras,
  type JobSections,
} from "@/lib/jobs/extracted-job"
import type { Database, Json } from "@/lib/supabase/database"
import { getSupabaseServerClient } from "@/lib/supabase/server"
import { logEvent } from "@/lib/observability/log"

type JobRow = Database["public"]["Tables"]["job_descriptions"]["Row"]
type RequirementRow = Database["public"]["Tables"]["job_requirements"]["Row"]

function throwFromSupabase(
  error: { code?: string; message?: string } | null
): never {
  if (error?.code === "23505") {
    throw new ApplicationError(
      "conflict",
      "This job is already saved for this role.",
      { cause: error }
    )
  }

  logEvent("error", "database.jobs.failed", {
    code: error?.code ?? null,
  })
  throw new ApplicationError("database", "Could not load jobs.", {
    cause: error,
  })
}

function toRequirement(row: RequirementRow): JobRequirement {
  return {
    id: row.id,
    skillName: row.skill_name,
    importance: row.importance,
    sourceSection: row.source_section,
    notes: row.notes,
    createdAt: row.created_at,
  }
}

function parseJson<T>(schema: { parse: (value: unknown) => T }, value: Json, fallback: T) {
  try {
    return schema.parse(value)
  } catch {
    return fallback
  }
}

function toJob(row: JobRow, requirements: JobRequirement[] = []): Job {
  return {
    id: row.id,
    userId: row.user_id,
    roleId: row.role_id,
    companyName: row.company_name,
    roleTitle: row.role_title,
    source: row.source,
    sourceUrl: row.source_url,
    description: row.description,
    postedAt: row.posted_at,
    capturedAt: row.captured_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    externalId: row.external_id,
    companyUrl: row.company_url,
    location: row.location,
    locations: row.locations,
    seniorityLevel: row.seniority_level,
    employmentType: row.employment_type,
    jobFunctions: row.job_functions,
    industries: row.industries,
    workplaceType: row.workplace_type,
    applicantCount: row.applicant_count,
    salaryText: row.salary_text,
    compensation: parseJson(
      jobCompensationSchema,
      row.compensation,
      emptyJobCompensation()
    ),
    postedRelative: row.posted_relative,
    postedAtPrecision: row.posted_at_precision,
    extractionMethod: row.extraction_method,
    extractedAt: row.extracted_at,
    fieldConfidence: parseJson(
      extractedJobSchema.shape.fieldConfidence,
      row.field_confidence,
      {} as Record<string, FieldConfidence>
    ),
    descriptionHtml: row.description_html,
    sections: parseJson(jobSectionsSchema, row.sections, emptyJobSections()),
    extras: parseJson(jobExtrasSchema, row.extras, emptyJobExtras()),
    requirements,
  }
}

export async function listByRoleId(userId: string, roleId: string) {
  const supabase = getSupabaseServerClient()
  const { data, error } = await supabase
    .from("job_descriptions")
    .select()
    .eq("user_id", userId)
    .eq("role_id", roleId)
    .order("captured_at", { ascending: false })

  if (error) {
    throwFromSupabase(error)
  }

  return (data ?? []).map((row) => toJob(row))
}

export async function getByIdForUser(userId: string, roleId: string, jobId: string) {
  const supabase = getSupabaseServerClient()
  const { data, error } = await supabase
    .from("job_descriptions")
    .select()
    .eq("user_id", userId)
    .eq("role_id", roleId)
    .eq("id", jobId)
    .maybeSingle()

  if (error) {
    throwFromSupabase(error)
  }

  if (!data) {
    return null
  }

  const { data: reqs, error: reqError } = await supabase
    .from("job_requirements")
    .select()
    .eq("job_description_id", data.id)
    .order("created_at", { ascending: true })

  if (reqError) {
    throwFromSupabase(reqError)
  }

  return toJob(data, (reqs ?? []).map(toRequirement))
}

export async function insert(
  userId: string,
  roleId: string,
  job: ExtractedJob
) {
  const supabase = getSupabaseServerClient()
  const { data, error } = await supabase
    .from("job_descriptions")
    .insert({
      user_id: userId,
      role_id: roleId,
      company_name: job.companyName.trim(),
      role_title: job.roleTitle.trim(),
      source: job.source,
      source_url: job.sourceUrl,
      description: job.description.trim() || job.roleTitle.trim(),
      posted_at: job.postedAt,
      captured_at: job.capturedAt,
      external_id: job.externalId,
      company_url: job.companyUrl,
      location: job.location,
      locations: job.locations,
      seniority_level: job.seniorityLevel,
      employment_type: job.employmentType,
      job_functions: job.jobFunctions,
      industries: job.industries,
      workplace_type: job.workplaceType,
      applicant_count:
        job.applicantCount == null ? null : Math.round(job.applicantCount),
      salary_text: job.salaryText,
      compensation: job.compensation as Json,
      posted_relative: job.postedRelative,
      posted_at_precision: job.postedAtPrecision,
      extraction_method: job.extractionMethod,
      extracted_at: job.extractedAt,
      field_confidence: job.fieldConfidence as Json,
      description_html: job.descriptionHtml,
      sections: job.sections as Json,
      extras: job.extras as Json,
    })
    .select()
    .single()

  if (error || !data) {
    throwFromSupabase(error)
  }

  const requirements = requirementsFromExtracted(job)
  if (requirements.length > 0) {
    const { error: reqError } = await supabase.from("job_requirements").insert(
      requirements.map((requirement) => ({
        job_description_id: data.id,
        skill_name: requirement.skillName,
        importance: requirement.importance,
        source_section: requirement.sourceSection,
      }))
    )
    if (reqError) {
      throwFromSupabase(reqError)
    }
  }

  return getByIdForUser(userId, roleId, data.id)
}

export async function deleteForUser(userId: string, roleId: string, jobId: string) {
  const supabase = getSupabaseServerClient()
  const { error, count } = await supabase
    .from("job_descriptions")
    .delete({ count: "exact" })
    .eq("user_id", userId)
    .eq("role_id", roleId)
    .eq("id", jobId)

  if (error) {
    throwFromSupabase(error)
  }

  if (!count) {
    throw new ApplicationError("not_found", "That job was not found.")
  }
}

export type { JobCompensation, JobExtras, JobSections }
