import type { ExtractedJob } from "@/lib/jobs/extracted-job"
import type {
  RequirementImportance,
  RequirementSection,
} from "@/lib/jobs/extracted-job"

export type JobRequirementInput = {
  skillName: string
  importance: RequirementImportance
  sourceSection: RequirementSection
}

export function requirementsFromExtracted(
  job: ExtractedJob
): JobRequirementInput[] {
  const rows: JobRequirementInput[] = []
  pushAll(rows, job.sections.minimumQualifications, "required", "minimum_qualifications")
  pushAll(rows, job.sections.preferredQualifications, "preferred", "preferred_qualifications")
  pushAll(rows, job.sections.skills, "unknown", "skills")
  return rows
}

function pushAll(
  rows: JobRequirementInput[],
  values: string[],
  importance: RequirementImportance,
  sourceSection: RequirementSection
) {
  const seen = new Set(rows.map((row) => row.skillName.toLowerCase()))
  for (const value of values) {
    const skillName = value.trim()
    if (!skillName) {
      continue
    }
    const key = skillName.toLowerCase()
    if (seen.has(key)) {
      continue
    }
    seen.add(key)
    rows.push({ skillName, importance, sourceSection })
  }
}
