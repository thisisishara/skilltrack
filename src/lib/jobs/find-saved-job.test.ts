import { describe, expect, it } from "vitest"

import {
  findSavedJobForSource,
  looksLikeSamePosting,
} from "@/lib/jobs/find-saved-job"

const saved = {
  externalId: "4467887456",
  sourceUrl: "https://www.linkedin.com/jobs/view/4467887456/",
  roleTitle: "Applied AI Engineer",
  companyName: "Google",
  location: "Madrid",
  postedAt: "2026-09-18",
  postedRelative: "2 days ago",
  capturedAt: "2026-09-20T12:00:00.000Z",
}

describe("findSavedJobForSource", () => {
  it("matches a LinkedIn view URL to the saved job id", () => {
    expect(
      findSavedJobForSource([saved], {
        sourceUrl: "https://www.linkedin.com/jobs/view/4467887456/?trk=foo",
      })
    ).toEqual(saved)
  })

  it("returns null when the URL is a different posting", () => {
    expect(
      findSavedJobForSource([saved], {
        sourceUrl: "https://www.linkedin.com/jobs/view/111/",
      })
    ).toBeNull()
  })
})

describe("looksLikeSamePosting", () => {
  it("treats matching title and company as likely the same job", () => {
    expect(
      looksLikeSamePosting(saved, {
        roleTitle: "Applied AI Engineer",
        companyName: "Google",
      })
    ).toBe(true)
    expect(
      looksLikeSamePosting(saved, {
        roleTitle: "Staff Engineer",
        companyName: "Google",
      })
    ).toBe(false)
  })
})
