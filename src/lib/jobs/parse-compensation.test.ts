import { describe, expect, it } from "vitest"

import { emptyJobCompensation } from "@/lib/jobs/extracted-job"
import {
  normalizeExtractedCompensation,
  parseCompensationFromText,
} from "@/lib/jobs/parse-compensation"

describe("parseCompensationFromText", () => {
  it("reads an explicit LinkedIn range with currency and bonus", () => {
    const parsed = parseCompensationFromText(
      "Spain: €90000 - €92000 (EUR) + 15% bonus target + equity + benefits"
    )
    expect(parsed?.compensation).toEqual({
      min: 90000,
      max: 92000,
      currency: "EUR",
      period: "year",
      bonusText: "15% bonus target + equity + benefits",
    })
  })

  it("reads k-suffix USD ranges", () => {
    const parsed = parseCompensationFromText("USD 90k-120k per year")
    expect(parsed?.compensation.min).toBe(90000)
    expect(parsed?.compensation.max).toBe(120000)
    expect(parsed?.compensation.currency).toBe("USD")
    expect(parsed?.compensation.period).toBe("year")
  })

  it("leaves vague pay unknown", () => {
    expect(parseCompensationFromText("Competitive salary. DOE.")).toBeNull()
    expect(
      parseCompensationFromText("Compensation commensurate with experience.")
    ).toBeNull()
  })

  it("does not treat years of experience as pay", () => {
    expect(
      parseCompensationFromText(
        "6 years of experience with software development using Python."
      )
    ).toBeNull()
  })
})

describe("normalizeExtractedCompensation", () => {
  it("drops invented numbers when no listed figure exists", () => {
    expect(
      normalizeExtractedCompensation(
        {
          min: 140000,
          max: 180000,
          currency: "USD",
          period: "year",
          bonusText: null,
        },
        null
      )
    ).toEqual(emptyJobCompensation())
  })
})
