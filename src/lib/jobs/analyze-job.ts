import "server-only"

import { generateObject, type LanguageModel } from "ai"

import { ApplicationError, isApplicationError } from "@/domain/errors"
import {
  aiJobAnalysisSchema,
  type ExtractedJob,
  type JobAnalysis,
} from "@/lib/jobs/extracted-job"
import { logEvent } from "@/lib/observability/log"

export type JobAnalysisExpertise = {
  roleName: string
  roleDescription: string | null
  roadmapPercent: number
  completedTasks: number
  totalTasks: number
  skillTopicCount: number
}

export async function analyzeJobWithAi(input: {
  model: LanguageModel
  job: ExtractedJob
  expertise?: JobAnalysisExpertise | null
}): Promise<JobAnalysis> {
  const job = input.job
  if (!job.roleTitle.trim() && !job.companyName.trim() && !job.description.trim()) {
    throw new ApplicationError(
      "validation",
      "Extract the job first, then analyze it."
    )
  }

  const expertise = input.expertise
  const expertiseBlock = expertise
    ? `APPLICANT EXPERTISE (SkillTrack role they are building toward; this is their level, not the job's seniority unless they match):
${JSON.stringify(
  {
    targetRole: expertise.roleName,
    roleDescription: expertise.roleDescription,
    roadmapProgressPercent: expertise.roadmapPercent,
    completedTasks: expertise.completedTasks,
    totalTasks: expertise.totalTasks,
    skillTopics: expertise.skillTopicCount,
  },
  null,
  2
)}`
    : `APPLICANT EXPERTISE: unknown. Still estimate a target salary from the posting's location, title, and seniority.`

  try {
    const { object } = await generateObject({
      model: input.model,
      schema: aiJobAnalysisSchema,
      schemaName: "JobAnalysis",
      schemaDescription:
        "A candid rating of a job posting plus a salary to aim for. Use empty strings or empty arrays when unknown.",
      prompt: `Rate this job posting as a career opportunity and recommend cash compensation to aim for.

Use posting text as evidence for the rating. Do not invent company news, funding, or culture.

compensationAdvice is different: always try to recommend a target even if the posting lists no pay. Base the ask on the applicant's target role/seniority, roadmap progress (completed tasks as evidence of skill), location, and market for this kind of job. The posting's listed range is only a signal. Do not copy the listed max unless that is actually the right ask for their level. If they look more senior than the band, aim above it. If they look more junior, aim inside or toward the lower half. Prefer annual cash (period year) unless the posting is clearly hourly or monthly. Currency should match the posting or the job location. If you truly cannot estimate, set target to null and explain in rationale.

Consider for the rating:
- Company signals in the text (brand, industry, about-company copy)
- Job description quality and specificity
- Location, workplace type, travel, and relocation pressure
- Compensation transparency
- Seniority vs title vs qualifications
- Red flags (vague JD, bait-and-switch, unpaid, extreme travel, missing basics)

Ratings: poor, fair, good, strong, excellent.
Keep summary to 1-2 sentences. company, posting, and location should each be 1 short sentence.
compensationAdvice.rationale: 1-3 sentences.

${expertiseBlock}

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
    compensation: job.compensation,
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
