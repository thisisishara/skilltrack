import { readFileSync } from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"
import { describe, expect, it } from "vitest"

import { parseJobInput } from "@/lib/jobs/parse-linkedin"
import {
  estimatePostedAt,
  formatJobPostedDate,
  parseJobPostedDate,
  resolvePostedAt,
} from "@/lib/jobs/relative-posted-at"
import { mergeExtractedJobs } from "@/lib/jobs/merge-extracted"
import { emptyExtractedJob } from "@/lib/jobs/extracted-job"

const fixture = readFileSync(
  path.join(path.dirname(fileURLToPath(import.meta.url)), "__fixtures__/linkedin-guest-job.html"),
  "utf8"
)

describe("parseJobInput", () => {
  it("extracts the guest LinkedIn job fields from HTML", () => {
    const capturedAt = new Date("2026-09-20T12:00:00.000Z")
    const job = parseJobInput({
      paste: fixture,
      capturedAt,
    })

    expect(job.roleTitle).toBe("Applied AI Engineer")
    expect(job.companyName).toBe("Google")
    expect(job.location).toContain("Madrid")
    expect(job.postedRelative).toBe("2 days ago")
    expect(job.postedAt).toBe("2026-09-18")
    expect(job.postedAtPrecision).toBe("estimated")
    expect(job.applicantCount).toBe(80)
    expect(job.employmentType).toBe("Full-time")
    expect(job.seniorityLevel).toBe("Not Applicable")
    expect(job.jobFunctions).toEqual([
      "Project Management",
      "Consulting",
      "Engineering",
    ])
    expect(job.industries).toEqual([
      "Information Services and Technology",
      "Information and Internet",
    ])
    expect(job.externalId).toBe("4467887456")
    expect(job.salaryText).toMatch(/90000/)
    expect(job.compensation.currency).toBe("EUR")
    expect(job.compensation.min).toBe(90000)
    expect(job.sections.minimumQualifications[0]).toMatch(/Bachelor/)
    expect(job.sections.preferredQualifications.some((item) => /ReAct/.test(item))).toBe(
      true
    )
    expect(job.sections.responsibilities[0]).toMatch(/Eval/)
    expect(job.extras.travel).toMatch(/50%/)
    expect(job.extras.preferredLocations).toEqual(["London, UK", "Madrid, Spain"])
    expect(job.description).not.toMatch(/Sign in to see who/)
    expect(job.description).not.toMatch(/Ignore this title/)
    expect(job.sections.skills).toEqual(
      expect.arrayContaining(["Python", "GCP", "RAG"])
    )
  })

  it("treats non-HTML paste as description", () => {
    const job = parseJobInput({
      paste: "Senior Engineer at Example. Python and RAG required.",
    })
    expect(job.roleTitle).toBe("")
    expect(job.description).toMatch(/Python/)
    expect(job.warnings.some((warning) => /Plain text/.test(warning))).toBe(true)
  })
})

describe("estimatePostedAt", () => {
  it("subtracts relative LinkedIn ages", () => {
    const capturedAt = new Date("2026-09-20T12:00:00.000Z")
    expect(estimatePostedAt("2 days ago", capturedAt)).toEqual({
      postedAt: "2026-09-18",
      precision: "estimated",
    })
    expect(estimatePostedAt("1 month ago", capturedAt).precision).toBe("estimated")
    expect(estimatePostedAt("just now", capturedAt).postedAt).toBe("2026-09-20")
  })

  it("formats calendar dates instead of relative strings", () => {
    const capturedAt = new Date("2026-09-20T12:00:00.000Z")
    expect(formatJobPostedDate("2026-09-18")).toBe("18 Sep 2026")
    expect(formatJobPostedDate("2026-08-20")).toBe("20 Aug 2026")
    expect(parseJobPostedDate("20 Aug 2026")).toBe("2026-08-20")
    expect(parseJobPostedDate("09/19/2026")).toBe("2026-09-19")
    expect(parseJobPostedDate("19/09/2026")).toBe("2026-09-19")
    expect(
      resolvePostedAt({
        postedRelative: "2 days ago",
        capturedAt,
      })
    ).toBe("2026-09-18")
  })
})

describe("mergeExtractedJobs", () => {
  it("fills empty rule fields from AI without overwriting", () => {
    const now = new Date().toISOString()
    const rules = emptyExtractedJob(now)
    rules.roleTitle = "Applied AI Engineer"
    rules.companyName = "Google"
    rules.description = "From rules"
    const ai = emptyExtractedJob(now)
    ai.roleTitle = "Wrong title"
    ai.companyName = "Wrong co"
    ai.location = "London"
    ai.description = "From AI"

    const merged = mergeExtractedJobs(rules, ai, "fill")
    expect(merged.roleTitle).toBe("Applied AI Engineer")
    expect(merged.location).toBe("London")
    expect(merged.description).toBe("From rules")
    expect(merged.extractionMethod).toBe("mixed")
  })
})
