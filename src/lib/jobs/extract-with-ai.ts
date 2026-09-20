import "server-only"

import { generateObject, type LanguageModel } from "ai"

import { ApplicationError, isApplicationError } from "@/domain/errors"
import {
  aiExtractedJobSchema,
  emptyExtractedJob,
  type AiExtractedJob,
  type ExtractedJob,
} from "@/lib/jobs/extracted-job"
import { logEvent } from "@/lib/observability/log"
import { scoreExtraction } from "@/lib/jobs/score-extraction"
import {
  looksLikeHtml,
  sanitizeLinkedInHtml,
} from "@/lib/jobs/sanitize-linkedin-html"
import {
  normalizeExtractedCompensation,
  parseCompensationFromText,
} from "@/lib/jobs/parse-compensation"

const MAX_AI_CHARS = 40_000

export async function extractJobWithAi(input: {
  model: LanguageModel
  paste: string
  sourceUrl?: string | null
  capturedAt?: Date
}): Promise<ExtractedJob> {
  const capturedAt = input.capturedAt ?? new Date()
  const nowIso = capturedAt.toISOString()
  const sanitized = looksLikeHtml(input.paste)
    ? sanitizeLinkedInHtml(input.paste)
    : input.paste.trim()
  const clipped = sanitized.slice(0, MAX_AI_CHARS)

  if (!clipped) {
    throw new ApplicationError(
      "validation",
      "Paste the job page source or the job text before extracting with AI. LinkedIn URLs usually cannot be fetched from the server."
    )
  }

  try {
    const { object } = await generateObject({
      model: input.model,
      schema: aiExtractedJobSchema,
      schemaName: "ExtractedJob",
      schemaDescription:
        "Structured fields from a job posting. Use empty strings, empty arrays, or null when unknown.",
      prompt: `Extract a structured job posting from this content.
Ignore site chrome, navigation, footers, similar jobs, people-also-viewed, and any sign-in or join popups.
Prefer LinkedIn top-card fields and the job description body.
postedAt must be YYYY-MM-DD or null.
compensation.min, compensation.max, compensation.currency, and compensation.period must be filled only when the posting explicitly lists a numeric pay range or a single pay number. Convert 90k to 90000. Do not infer pay from "competitive", "DOE", or similar vague wording — leave those fields null and salaryText null (or the vague phrase only, without inventing numbers).
compensation.period is year, month, hour, or null if the posting does not say.
sourceUrl hint: ${input.sourceUrl ?? "none"}

CONTENT:
${clipped}`,
      providerOptions: {
        openai: { strictJsonSchema: false },
      },
    })
    return scoreExtraction(fromAiDraft(object, nowIso, input.sourceUrl))
  } catch (error) {
    if (isApplicationError(error)) {
      throw error
    }
    const detail = error instanceof Error ? error.message : "Unknown model error"
    logEvent("error", "jobs.ai_extract_failed", {
      name: error instanceof Error ? error.name : "unknown",
      detail: detail.slice(0, 240),
    })
    throw new ApplicationError(
      "validation",
      "AI extraction failed. Try rule-based Extract, or paste clearer job page source.",
      { cause: error }
    )
  }
}

function fromAiDraft(
  draft: AiExtractedJob,
  nowIso: string,
  sourceUrl: string | null | undefined
): ExtractedJob {
  const base = emptyExtractedJob(nowIso)
  const applicant =
    draft.applicantCount == null
      ? null
      : Math.round(draft.applicantCount)
  const fromListedPay = parseCompensationFromText(draft.salaryText ?? "")
  const fromDescription = parseCompensationFromText(draft.description)
  const salaryFromBody = fromListedPay ?? fromDescription
  const salaryText = fromListedPay
    ? (draft.salaryText ?? "").trim()
    : salaryFromBody?.salaryText ?? (draft.salaryText?.trim() || null)
  return {
    ...base,
    ...draft,
    applicantCount: Number.isFinite(applicant) ? applicant : null,
    salaryText,
    compensation: normalizeExtractedCompensation(
      {
        ...draft.compensation,
        period: draft.compensation.period ?? salaryFromBody?.compensation.period ?? null,
      },
      salaryText
    ),
    sourceUrl: draft.sourceUrl ?? sourceUrl ?? null,
    source: draft.sourceUrl || sourceUrl ? "linkedin" : "manual",
    extractionMethod: "ai",
    capturedAt: nowIso,
    extractedAt: new Date().toISOString(),
    descriptionHtml: null,
    extras: {
      travel: draft.extras.travel,
      preferredLocations: draft.extras.preferredLocations,
      languages: draft.extras.languages,
      benefitsText: draft.extras.benefitsText,
      aboutCompany: draft.extras.aboutCompany,
    },
  }
}
