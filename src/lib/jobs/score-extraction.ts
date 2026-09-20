import {
  isFilled,
  type ExtractedJob,
  type FieldConfidence,
} from "@/lib/jobs/extracted-job"

const REQUIRED = ["roleTitle", "companyName", "description"] as const
const CRITERIA = ["seniorityLevel", "employmentType"] as const

export function scoreExtraction(job: ExtractedJob): ExtractedJob {
  const fieldConfidence: Record<string, FieldConfidence> = { ...job.fieldConfidence }
  const warnings = [...job.warnings]

  for (const key of REQUIRED) {
    const filled = isFilled(job[key])
    fieldConfidence[key] = filled ? "high" : "missing"
    if (!filled) {
      warnings.push(`Missing ${labelFor(key)}.`)
    }
  }

  for (const key of CRITERIA) {
    const filled = isFilled(job[key])
    fieldConfidence[key] = filled ? "high" : "missing"
    if (!filled) {
      warnings.push(`Missing ${labelFor(key)}.`)
    }
  }

  fieldConfidence.location = isFilled(job.location) ? "high" : "missing"
  fieldConfidence.postedRelative = isFilled(job.postedRelative)
    ? "high"
    : "missing"

  return {
    ...job,
    fieldConfidence,
    warnings: unique(warnings),
  }
}

function labelFor(key: string) {
  return key.replace(/([A-Z])/g, " $1").toLowerCase()
}

function unique(values: string[]) {
  return [...new Set(values)]
}
