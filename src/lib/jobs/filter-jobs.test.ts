import { describe, expect, it } from "vitest"

import { emptyExtractedJob } from "@/lib/jobs/extracted-job"
import {
  emptyJobListFilters,
  filterJobs,
  scoreJobMatch,
} from "@/lib/jobs/filter-jobs"
import { extractedJobFromSaved } from "@/lib/jobs/from-saved-job"
import type { Job } from "@/domain/jobs/types"

function job(overrides: Partial<Job>): Job {
  const now = "2026-09-20T12:00:00.000Z"
  const extracted = emptyExtractedJob(now)
  return {
    id: "job-1",
    userId: "user-1",
    roleId: "role-1",
    createdAt: now,
    updatedAt: now,
    requirements: [],
    ...extracted,
    source: "linkedin",
    extractedAt: now,
    ...overrides,
  }
}

const jobs = [
  job({
    id: "1",
    roleTitle: "Applied AI Engineer",
    companyName: "Google",
    employmentType: "Full-time",
    seniorityLevel: "Mid-Senior level",
    workplaceType: "hybrid",
    location: "Madrid, Community of Madrid, Spain",
    postedAt: "2026-09-18",
    sections: {
      ...emptyExtractedJob("2026-09-20T12:00:00.000Z").sections,
      skills: ["Python", "RAG"],
    },
  }),
  job({
    id: "2",
    roleTitle: "Staff Engineer",
    companyName: "Acme",
    employmentType: "Contract",
    seniorityLevel: "Staff",
    workplaceType: "remote",
    location: "London",
    postedAt: "2026-08-01",
    sections: {
      ...emptyExtractedJob("2026-09-20T12:00:00.000Z").sections,
      skills: ["Go"],
    },
  }),
]

describe("filterJobs", () => {
  it("matches every search token, including prefixes", () => {
    expect(
      filterJobs(jobs, { ...emptyJobListFilters, query: "Applied Eng" }).map(
        (item) => item.id
      )
    ).toEqual(["1"])
    expect(
      filterJobs(jobs, { ...emptyJobListFilters, query: "google madrid" }).map(
        (item) => item.id
      )
    ).toEqual(["1"])
  })

  it("filters by company, type, location, workplace, skill, and posted window", () => {
    expect(
      filterJobs(jobs, { ...emptyJobListFilters, company: "Acme" }).map(
        (item) => item.id
      )
    ).toEqual(["2"])
    expect(
      filterJobs(jobs, {
        ...emptyJobListFilters,
        employmentType: "Contract",
      }).map((item) => item.id)
    ).toEqual(["2"])
    expect(
      filterJobs(jobs, { ...emptyJobListFilters, location: "London" }).map(
        (item) => item.id
      )
    ).toEqual(["2"])
    expect(
      filterJobs(jobs, { ...emptyJobListFilters, workplace: "hybrid" }).map(
        (item) => item.id
      )
    ).toEqual(["1"])
    expect(
      filterJobs(jobs, { ...emptyJobListFilters, skill: "RAG" }).map(
        (item) => item.id
      )
    ).toEqual(["1"])
    expect(
      filterJobs(
        jobs,
        { ...emptyJobListFilters, posted: "7" },
        Date.parse("2026-09-21T00:00:00.000Z")
      ).map((item) => item.id)
    ).toEqual(["1"])
  })

  it("scores title matches above body matches", () => {
    expect(scoreJobMatch(jobs[0], "engineer")).toBeGreaterThan(
      scoreJobMatch(jobs[0], "python")
    )
  })
})

describe("extractedJobFromSaved", () => {
  it("copies title and source url for editing", () => {
    const saved = job({
      roleTitle: "Applied AI Engineer",
      sourceUrl: "https://www.linkedin.com/jobs/view/4467887456/",
    })
    const extracted = extractedJobFromSaved(saved)
    expect(extracted.roleTitle).toBe("Applied AI Engineer")
    expect(extracted.sourceUrl).toBe(saved.sourceUrl)
    expect(extracted.analysis).toBeNull()
  })

  it("keeps a saved posting rating", () => {
    const saved = job({
      analysis: {
        rating: "strong",
        summary: "Clear JD at a well-known company.",
        company: "Google is named in the posting.",
        posting: "Specific qualifications and responsibilities.",
        location: "Madrid with a listed salary band.",
        highlights: ["Named company", "Salary listed"],
        concerns: ["Seniority listed as not applicable"],
        compensationAdvice: null,
      },
    })
    expect(extractedJobFromSaved(saved).analysis?.rating).toBe("strong")
  })
})
