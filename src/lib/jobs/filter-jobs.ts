import type { Job } from "@/domain/jobs/types"
import type { WorkplaceType } from "@/lib/jobs/extracted-job"
import { resolvePostedAt } from "@/lib/jobs/relative-posted-at"

export type JobPostedWindow = "all" | "7" | "30" | "90"
export type JobSort = "posted" | "saved" | "company" | "title"

export type JobListFilters = {
  query: string
  company: string
  location: string
  employmentType: string
  seniority: string
  workplace: "all" | WorkplaceType
  posted: JobPostedWindow
  skill: string
}

export const emptyJobListFilters: JobListFilters = {
  query: "",
  company: "all",
  location: "all",
  employmentType: "all",
  seniority: "all",
  workplace: "all",
  posted: "all",
  skill: "all",
}

export function tokenizeSearch(query: string) {
  return query
    .toLowerCase()
    .trim()
    .split(/[\s,/|]+/)
    .filter(Boolean)
}

function textMatchesToken(text: string, token: string) {
  const haystack = text.toLowerCase()
  if (haystack.includes(token)) {
    return true
  }
  return haystack.split(/[^a-z0-9+.#]+/).some((word) => word.startsWith(token))
}

export function jobSearchFields(job: Job) {
  return {
    title: job.roleTitle,
    company: job.companyName,
    location: [job.location, ...job.locations].filter(Boolean).join(" "),
    skills: job.sections.skills.join(" "),
    rest: [
      job.employmentType,
      job.seniorityLevel,
      job.workplaceType === "unknown" ? "" : job.workplaceType.replaceAll("_", " "),
      job.salaryText,
      ...job.jobFunctions,
      ...job.industries,
      ...job.sections.minimumQualifications,
      ...job.sections.preferredQualifications,
      job.description,
    ]
      .filter(Boolean)
      .join(" "),
  }
}

export function jobMatchesQuery(job: Job, query: string) {
  const tokens = tokenizeSearch(query)
  if (tokens.length === 0) {
    return true
  }
  const fields = jobSearchFields(job)
  const haystack = Object.values(fields).join(" ")
  return tokens.every((token) => textMatchesToken(haystack, token))
}

export function scoreJobMatch(job: Job, query: string) {
  const tokens = tokenizeSearch(query)
  if (tokens.length === 0) {
    return 0
  }
  const fields = jobSearchFields(job)
  return tokens.reduce((total, token) => {
    if (textMatchesToken(fields.title, token)) {
      return total + 8
    }
    if (textMatchesToken(fields.company, token)) {
      return total + 5
    }
    if (textMatchesToken(fields.skills, token) || textMatchesToken(fields.location, token)) {
      return total + 3
    }
    if (textMatchesToken(fields.rest, token)) {
      return total + 1
    }
    return total
  }, 0)
}

function jobLocations(job: Job) {
  return [job.location, ...job.locations].map((value) => value?.trim()).filter(Boolean) as string[]
}

function postedTimestamp(job: Job) {
  const posted =
    resolvePostedAt({
      postedAt: job.postedAt,
      postedRelative: job.postedRelative,
      capturedAt: job.capturedAt,
    }) ?? job.capturedAt
  const time = Date.parse(posted)
  return Number.isNaN(time) ? Date.parse(job.capturedAt) : time
}

function matchesPostedWindow(job: Job, posted: JobPostedWindow, now: number) {
  if (posted === "all") {
    return true
  }
  const days = Number(posted)
  return now - postedTimestamp(job) <= days * 24 * 60 * 60 * 1000
}

export function filterJobs(
  jobs: Job[],
  input: JobListFilters,
  now = Date.now()
) {
  return jobs.filter((job) => {
    if (input.company !== "all" && job.companyName !== input.company) {
      return false
    }
    if (input.location !== "all" && !jobLocations(job).includes(input.location)) {
      return false
    }
    if (
      input.employmentType !== "all" &&
      job.employmentType !== input.employmentType
    ) {
      return false
    }
    if (input.seniority !== "all" && job.seniorityLevel !== input.seniority) {
      return false
    }
    if (input.workplace !== "all" && job.workplaceType !== input.workplace) {
      return false
    }
    if (
      input.skill !== "all" &&
      !job.sections.skills.some((skill) => skill === input.skill)
    ) {
      return false
    }
    if (!matchesPostedWindow(job, input.posted, now)) {
      return false
    }
    return jobMatchesQuery(job, input.query)
  })
}

export function sortJobs(jobs: Job[], sort: JobSort, query = "") {
  const copy = [...jobs]
  const ranked = tokenizeSearch(query).length > 0
  copy.sort((left, right) => {
    if (ranked) {
      const byScore = scoreJobMatch(right, query) - scoreJobMatch(left, query)
      if (byScore !== 0) {
        return byScore
      }
    }
    if (sort === "company") {
      const byCompany = left.companyName.localeCompare(right.companyName)
      if (byCompany !== 0) {
        return byCompany
      }
      return left.roleTitle.localeCompare(right.roleTitle)
    }
    if (sort === "title") {
      return left.roleTitle.localeCompare(right.roleTitle)
    }
    if (sort === "saved") {
      return right.capturedAt.localeCompare(left.capturedAt)
    }
    return postedTimestamp(right) - postedTimestamp(left)
  })
  return copy
}

export function uniqueJobValues(
  jobs: Job[],
  read: (job: Job) => string | null | undefined | Array<string | null | undefined>
) {
  const values = new Set<string>()
  for (const job of jobs) {
    const raw = read(job)
    const items = Array.isArray(raw) ? raw : [raw]
    for (const item of items) {
      const next = item?.trim()
      if (next) {
        values.add(next)
      }
    }
  }
  return [...values].sort((left, right) => left.localeCompare(right))
}

export function jobFilterOptions(jobs: Job[]) {
  return {
    companies: uniqueJobValues(jobs, (job) => job.companyName),
    locations: uniqueJobValues(jobs, (job) => [job.location, ...job.locations]),
    employmentTypes: uniqueJobValues(jobs, (job) => job.employmentType),
    seniorities: uniqueJobValues(jobs, (job) => job.seniorityLevel),
    workplaces: uniqueJobValues(jobs, (job) =>
      job.workplaceType === "unknown" ? null : job.workplaceType
    ) as Exclude<WorkplaceType, "unknown">[],
    skills: uniqueJobValues(jobs, (job) => job.sections.skills),
  }
}

export function hasActiveJobFilters(filters: JobListFilters) {
  return (
    tokenizeSearch(filters.query).length > 0 ||
    filters.company !== "all" ||
    filters.location !== "all" ||
    filters.employmentType !== "all" ||
    filters.seniority !== "all" ||
    filters.workplace !== "all" ||
    filters.posted !== "all" ||
    filters.skill !== "all"
  )
}
