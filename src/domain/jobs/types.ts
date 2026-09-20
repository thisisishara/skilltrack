import type {
  ExtractionMethod,
  FieldConfidence,
  JobAnalysis,
  JobCompensation,
  JobExtras,
  JobSections,
  PostedAtPrecision,
  RequirementImportance,
  RequirementSection,
  WorkplaceType,
} from "@/lib/jobs/extracted-job"

export type JobRequirement = {
  id: string
  skillName: string
  importance: RequirementImportance
  sourceSection: RequirementSection
  notes: string | null
  createdAt: string
}

export type Job = {
  id: string
  userId: string
  roleId: string
  companyName: string
  roleTitle: string
  source: string | null
  sourceUrl: string | null
  description: string
  postedAt: string | null
  capturedAt: string
  createdAt: string
  updatedAt: string
  externalId: string | null
  companyUrl: string | null
  location: string | null
  locations: string[]
  seniorityLevel: string | null
  employmentType: string | null
  jobFunctions: string[]
  industries: string[]
  workplaceType: WorkplaceType
  applicantCount: number | null
  salaryText: string | null
  compensation: JobCompensation
  postedRelative: string | null
  postedAtPrecision: PostedAtPrecision
  extractionMethod: ExtractionMethod
  extractedAt: string | null
  fieldConfidence: Record<string, FieldConfidence>
  descriptionHtml: string | null
  sections: JobSections
  extras: JobExtras
  analysis: JobAnalysis | null
  requirements: JobRequirement[]
}
