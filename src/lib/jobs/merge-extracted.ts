import {
  isFilled,
  type ExtractedJob,
  type ExtractionMethod,
} from "@/lib/jobs/extracted-job"
import { scoreExtraction } from "@/lib/jobs/score-extraction"

export type MergeMode = "fill" | "replace"

const OBJECT_KEYS = ["compensation", "sections", "extras"] as const

export function mergeExtractedJobs(
  rules: ExtractedJob,
  ai: ExtractedJob,
  mode: MergeMode
): ExtractedJob {
  const merged: ExtractedJob = {
    ...structuredClone(rules),
    extractionMethod: methodFor(mode, rules, ai),
  }

  for (const key of Object.keys(rules) as (keyof ExtractedJob)[]) {
    if (
      key === "warnings" ||
      key === "fieldConfidence" ||
      key === "extractionMethod" ||
      key === "capturedAt" ||
      key === "analysis"
    ) {
      continue
    }

    const ruleValue = rules[key]
    const aiValue = ai[key]

    if (OBJECT_KEYS.includes(key as (typeof OBJECT_KEYS)[number])) {
      merged[key] = mergeRecord(
        ruleValue as Record<string, unknown>,
        aiValue as Record<string, unknown>,
        mode
      ) as never
      continue
    }

    if (mode === "replace") {
      merged[key] = (isFilled(aiValue) ? aiValue : ruleValue) as never
    } else {
      merged[key] = (isFilled(ruleValue) ? ruleValue : aiValue) as never
    }
  }

  merged.extractedAt = new Date().toISOString()
  merged.warnings = unique([
    ...rules.warnings,
    ...ai.warnings.filter((warning) => !warning.startsWith("Missing ")),
  ])
  return scoreExtraction(merged)
}

function mergeRecord(
  rules: Record<string, unknown>,
  ai: Record<string, unknown>,
  mode: MergeMode
) {
  const keys = new Set([...Object.keys(rules ?? {}), ...Object.keys(ai ?? {})])
  const result: Record<string, unknown> = { ...rules }
  for (const key of keys) {
    const ruleValue = rules?.[key]
    const aiValue = ai?.[key]
    if (mode === "replace") {
      result[key] = isFilled(aiValue) ? aiValue : ruleValue
    } else {
      result[key] = isFilled(ruleValue) ? ruleValue : aiValue
    }
  }
  return result
}

function methodFor(
  mode: MergeMode,
  rules: ExtractedJob,
  ai: ExtractedJob
): ExtractionMethod {
  const rulesFilled = isFilled(rules.roleTitle) || isFilled(rules.description)
  const aiFilled = isFilled(ai.roleTitle) || isFilled(ai.description)
  if (rulesFilled && aiFilled) {
    return "mixed"
  }
  if (aiFilled && (mode === "replace" || !rulesFilled)) {
    return "ai"
  }
  return rules.extractionMethod
}

function unique(values: string[]) {
  return [...new Set(values)]
}
