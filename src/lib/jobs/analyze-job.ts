import "server-only"

import { generateObject, type LanguageModel } from "ai"

import { ApplicationError, isApplicationError } from "@/domain/errors"
import {
  jobAnalysisSchema,
  type ExtractedJob,
  type JobAnalysis,
} from "@/lib/jobs/extracted-job"
import { logEvent } from "@/lib/observability/log"

export async function analyzeJobWithAi(input: {
  model: LanguageModel
  job: ExtractedJob
}): Promise<JobAnalysis> {
  const job = input.job
  if (!job.roleTitle.trim() && !job.companyName.trim() && !job.description.trim()) {
    throw new ApplicationError(
      "validation",
      "Extract the job first, then analyze it."
    )
  }

  try {
    const { object } = await generateObject({
      model: input.model,
      schema: jobAnalysisSchema,
      schemaName: "JobAnalysis",
      schemaDescription:
        "A candid rating of a job posting. Use empty strings or empty arrays when unknown. Do not invent facts that are not in the posting.",
      prompt: `Rate this job posting as a career opportunity for a skilled applicant.

Use only evidence in the posting. Do not invent company news, funding, culture, or salary.

Consider:
- Company signals in the text (brand, industry, about-company copy)
- Job description quality and specificity
- Location, workplace type, travel, and relocation pressure
- Compensation transparency
- Seniority vs title vs qualifications
- Red flags (vague JD, bait-and-switch, unpaid, extreme travel, missing basics)

Ratings: poor, fair, good, strong, excellent.
Keep summary to 1-2 sentences. company, posting, and location should each be 1 short sentence.

POSTING:
${JSON.stringify(
  {
    roleTitle: job.roleTitle,
    companyName: job.companyName,
    location: job.location,
    locations: job.locations,
    workplaceType: job.workplaceType,
    employmentType: job.employmentType,
    seniorityLevel: job.seniorityLevel,
    salaryText: job.salaryText,
    industries: job.industries,
    jobFunctions: job.jobFunctions,
    extras: job.extras,
    sections: job.sections,
    description: job.description.slice(0, 8_000),
  },
  null,
  2
)}`,
      providerOptions: {
        openai: { strictJsonSchema: false },
      },
    })
    return object
  } catch (error) {
    if (isApplicationError(error)) {
      throw error
    }
    logEvent("error", "jobs.ai_analyze_failed", {
      name: error instanceof Error ? error.name : "unknown",
      detail: (error instanceof Error ? error.message : "unknown").slice(0, 240),
    })
    throw new ApplicationError(
      "validation",
      "Could not analyze this job. Try again, or save without a rating.",
      { cause: error }
    )
  }
}
