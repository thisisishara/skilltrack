import { z } from "zod"

export const WORKPLACE_TYPES = [
  "on_site",
  "hybrid",
  "remote",
  "unknown",
] as const
export type WorkplaceType = (typeof WORKPLACE_TYPES)[number]

export const POSTED_AT_PRECISIONS = ["exact", "estimated", "unknown"] as const
export type PostedAtPrecision = (typeof POSTED_AT_PRECISIONS)[number]

export const EXTRACTION_METHODS = ["rules", "ai", "mixed", "manual"] as const
export type ExtractionMethod = (typeof EXTRACTION_METHODS)[number]

export const REQUIREMENT_IMPORTANCE = [
  "required",
  "preferred",
  "unknown",
] as const
export type RequirementImportance = (typeof REQUIREMENT_IMPORTANCE)[number]

export const REQUIREMENT_SECTIONS = [
  "minimum_qualifications",
  "preferred_qualifications",
  "responsibilities",
  "skills",
  "other",
] as const
export type RequirementSection = (typeof REQUIREMENT_SECTIONS)[number]

export const FIELD_CONFIDENCE = ["high", "medium", "low", "missing"] as const
export type FieldConfidence = (typeof FIELD_CONFIDENCE)[number]

export const JOB_ANALYSIS_RATINGS = [
  "poor",
  "fair",
  "good",
  "strong",
  "excellent",
] as const
export type JobAnalysisRating = (typeof JOB_ANALYSIS_RATINGS)[number]

export const COMPENSATION_PERIODS = ["year", "month", "hour"] as const
export type CompensationPeriod = (typeof COMPENSATION_PERIODS)[number]

export const SALARY_AIM_PERIODS = [...COMPENSATION_PERIODS, "unknown"] as const
export type SalaryAimPeriod = (typeof SALARY_AIM_PERIODS)[number]

export const compensationAdviceSchema = z.object({
  target: z.number().nullable(),
  currency: z.string().nullable(),
  period: z.enum(SALARY_AIM_PERIODS),
  rationale: z.string(),
})
export type CompensationAdvice = z.infer<typeof compensationAdviceSchema>

/** Schema sent to generateObject: no optional keys. */
export const aiJobAnalysisSchema = z.object({
  rating: z.enum(JOB_ANALYSIS_RATINGS),
  summary: z.string(),
  company: z.string(),
  posting: z.string(),
  location: z.string(),
  highlights: z.array(z.string()),
  concerns: z.array(z.string()),
  compensationAdvice: compensationAdviceSchema,
})

export const jobAnalysisSchema = aiJobAnalysisSchema.extend({
  compensationAdvice: compensationAdviceSchema.nullable().default(null),
})
export type JobAnalysis = z.infer<typeof jobAnalysisSchema>

export const aiJobCompensationSchema = z.object({
  min: z.number().nullable(),
  max: z.number().nullable(),
  currency: z.string().nullable(),
  period: z.enum(COMPENSATION_PERIODS).nullable(),
  bonusText: z.string().nullable(),
})

export const jobCompensationSchema = aiJobCompensationSchema.extend({
  period: z.enum(COMPENSATION_PERIODS).nullable().default(null),
})

export const jobSectionsSchema = z.object({
  minimumQualifications: z.array(z.string()),
  preferredQualifications: z.array(z.string()),
  responsibilities: z.array(z.string()),
  skills: z.array(z.string()),
  aboutTheJob: z.string().nullable(),
})

export const jobExtrasSchema = z.object({
  travel: z.string().nullable(),
  preferredLocations: z.array(z.string()),
  languages: z.array(z.string()),
  benefitsText: z.string().nullable(),
  aboutCompany: z.string().nullable(),
})

/** Schema sent to generateObject: no records, no optional keys (strict JSON schema). */
export const aiExtractedJobSchema = z.object({
  roleTitle: z.string(),
  companyName: z.string(),
  companyUrl: z.string().nullable(),
  sourceUrl: z.string().nullable(),
  externalId: z.string().nullable(),
  location: z.string().nullable(),
  locations: z.array(z.string()),
  seniorityLevel: z.string().nullable(),
  employmentType: z.string().nullable(),
  jobFunctions: z.array(z.string()),
  industries: z.array(z.string()),
  workplaceType: z.enum(WORKPLACE_TYPES),
  applicantCount: z.number().nullable(),
  salaryText: z.string().nullable(),
  compensation: aiJobCompensationSchema,
  postedRelative: z.string().nullable(),
  postedAt: z.string().nullable(),
  postedAtPrecision: z.enum(POSTED_AT_PRECISIONS),
  description: z.string(),
  sections: jobSectionsSchema,
  extras: jobExtrasSchema,
  warnings: z.array(z.string()),
})

export const extractedJobSchema = z.object({
  roleTitle: z.string(),
  companyName: z.string(),
  companyUrl: z.string().nullable(),
  sourceUrl: z.string().nullable(),
  externalId: z.string().nullable(),
  location: z.string().nullable(),
  locations: z.array(z.string()),
  seniorityLevel: z.string().nullable(),
  employmentType: z.string().nullable(),
  jobFunctions: z.array(z.string()),
  industries: z.array(z.string()),
  workplaceType: z.enum(WORKPLACE_TYPES),
  applicantCount: z.number().nullable(),
  salaryText: z.string().nullable(),
  compensation: jobCompensationSchema,
  postedRelative: z.string().nullable(),
  postedAt: z.string().nullable(),
  postedAtPrecision: z.enum(POSTED_AT_PRECISIONS),
  description: z.string(),
  descriptionHtml: z.string().nullable(),
  sections: jobSectionsSchema,
  extras: jobExtrasSchema,
  source: z.string(),
  extractionMethod: z.enum(EXTRACTION_METHODS),
  capturedAt: z.string(),
  extractedAt: z.string(),
  fieldConfidence: z.record(z.string(), z.enum(FIELD_CONFIDENCE)),
  warnings: z.array(z.string()),
  analysis: jobAnalysisSchema.nullable().default(null),
})

export type JobCompensation = z.infer<typeof jobCompensationSchema>
export type JobSections = z.infer<typeof jobSectionsSchema>
export type JobExtras = z.infer<typeof jobExtrasSchema>
export type ExtractedJob = z.infer<typeof extractedJobSchema>
export type AiExtractedJob = z.infer<typeof aiExtractedJobSchema>

export function emptyJobCompensation(): JobCompensation {
  return { min: null, max: null, currency: null, period: null, bonusText: null }
}

export function emptyJobExtras(): JobExtras {
  return {
    travel: null,
    preferredLocations: [],
    languages: [],
    benefitsText: null,
    aboutCompany: null,
  }
}

export function emptyJobSections(): JobSections {
  return {
    minimumQualifications: [],
    preferredQualifications: [],
    responsibilities: [],
    skills: [],
    aboutTheJob: null,
  }
}

export function emptyExtractedJob(nowIso: string): ExtractedJob {
  return {
    roleTitle: "",
    companyName: "",
    companyUrl: null,
    sourceUrl: null,
    externalId: null,
    location: null,
    locations: [],
    seniorityLevel: null,
    employmentType: null,
    jobFunctions: [],
    industries: [],
    workplaceType: "unknown",
    applicantCount: null,
    salaryText: null,
    compensation: emptyJobCompensation(),
    postedRelative: null,
    postedAt: null,
    postedAtPrecision: "unknown",
    description: "",
    descriptionHtml: null,
    sections: emptyJobSections(),
    extras: {
      travel: null,
      preferredLocations: [],
      languages: [],
      benefitsText: null,
      aboutCompany: null,
    },
    source: "manual",
    extractionMethod: "manual",
    capturedAt: nowIso,
    extractedAt: nowIso,
    fieldConfidence: {},
    warnings: [],
    analysis: null,
  }
}

export function isFilled(value: unknown): boolean {
  if (value == null) {
    return false
  }
  if (typeof value === "string") {
    return value.trim() !== ""
  }
  if (Array.isArray(value)) {
    return value.length > 0
  }
  if (typeof value === "object") {
    return Object.values(value as Record<string, unknown>).some(isFilled)
  }
  return true
}
