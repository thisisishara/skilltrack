import type { Job } from "@/domain/jobs/types"
import type { ExtractedJob } from "@/lib/jobs/extracted-job"

export function extractedJobFromSaved(job: Job): ExtractedJob {
  const nowIso = new Date().toISOString()
  return {
    roleTitle: job.roleTitle,
    companyName: job.companyName,
    companyUrl: job.companyUrl,
    sourceUrl: job.sourceUrl,
    externalId: job.externalId,
    location: job.location,
    locations: job.locations,
    seniorityLevel: job.seniorityLevel,
    employmentType: job.employmentType,
    jobFunctions: job.jobFunctions,
    industries: job.industries,
    workplaceType: job.workplaceType,
    applicantCount: job.applicantCount,
    salaryText: job.salaryText,
    compensation: job.compensation,
    postedRelative: job.postedRelative,
    postedAt: job.postedAt,
    postedAtPrecision: job.postedAtPrecision,
    description: job.description,
    descriptionHtml: job.descriptionHtml,
    sections: job.sections,
    extras: job.extras,
    source: job.source ?? "manual",
    extractionMethod: job.extractionMethod,
    capturedAt: job.capturedAt,
    extractedAt: job.extractedAt ?? nowIso,
    fieldConfidence: job.fieldConfidence,
    warnings: [],
  }
}
