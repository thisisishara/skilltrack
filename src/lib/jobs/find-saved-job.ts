import { jobIdFromUrl, normalizeSourceUrl } from "@/lib/jobs/parse-linkedin"
import {
  formatJobPostedDate,
  resolvePostedAt,
} from "@/lib/jobs/relative-posted-at"

export type SavedJobMatch = {
  externalId: string | null
  sourceUrl: string | null
  roleTitle: string
  companyName: string
  location: string | null
  postedAt: string | null
  postedRelative: string | null
  capturedAt: string
}

export function findSavedJobForSource<T extends SavedJobMatch>(
  jobs: T[],
  input: { sourceUrl?: string | null; externalId?: string | null }
): T | null {
  const url =
    normalizeSourceUrl(input.sourceUrl) ??
    (input.externalId
      ? normalizeSourceUrl(
          `https://www.linkedin.com/jobs/view/${input.externalId}/`
        )
      : null)
  const id =
    input.externalId?.trim() ||
    jobIdFromUrl(input.sourceUrl) ||
    jobIdFromUrl(url)

  return (
    jobs.find((job) => {
      if (id && job.externalId && job.externalId === id) {
        return true
      }
      const savedUrl = normalizeSourceUrl(job.sourceUrl)
      if (url && savedUrl && url === savedUrl) {
        return true
      }
      return Boolean(id && jobIdFromUrl(job.sourceUrl) === id)
    }) ?? null
  )
}

export function formatJobMatchLine(job: SavedJobMatch) {
  const posted = formatJobPostedDate(
    resolvePostedAt({
      postedAt: job.postedAt,
      postedRelative: job.postedRelative,
      capturedAt: job.capturedAt,
    })
  )
  return [job.roleTitle, job.companyName, job.location, posted]
    .filter(Boolean)
    .join(" · ")
}

export function looksLikeSamePosting(
  saved: Pick<SavedJobMatch, "roleTitle" | "companyName">,
  extracted: Pick<SavedJobMatch, "roleTitle" | "companyName">
) {
  return (
    normalizeName(saved.roleTitle) === normalizeName(extracted.roleTitle) &&
    normalizeName(saved.companyName) === normalizeName(extracted.companyName)
  )
}

function normalizeName(value: string) {
  return value.replace(/\s+/g, " ").trim().toLowerCase()
}
