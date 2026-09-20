import {
  emptyJobCompensation,
  type CompensationPeriod,
  type JobCompensation,
} from "@/lib/jobs/extracted-job"

const SYMBOL_CURRENCY: Record<string, string> = {
  $: "USD",
  "€": "EUR",
  "£": "GBP",
}

const RANGE_RE =
  /(?:[A-Za-z][A-Za-z .]{0,24}:\s*)?(?:([€$£])\s*)?(\d[\d,]*(?:\.\d+)?)\s*([kKmM])?\s*(?:[-–]|to)\s*(?:([€$£])\s*)?(\d[\d,]*(?:\.\d+)?)\s*([kKmM])?(?:\s*\(([A-Z]{3})\))?(?:\s+([A-Z]{3})\b)?((?:\s*\+[^\n]*)?)/

const SINGLE_RE =
  /(?:[A-Za-z][A-Za-z .]{0,24}:\s*)?(?:([€$£])\s*)?(\d[\d,]*(?:\.\d+)?)\s*([kKmM])?(?:\s*\(([A-Z]{3})\))?(?:\s*\/\s*(hr|hour|mo|month|yr|year))?/i

const ISO_PREFIX_RANGE_RE =
  /\b([A-Z]{3})\s+(\d[\d,]*(?:\.\d+)?)\s*([kKmM])?\s*(?:[-–]|to)\s*(\d[\d,]*(?:\.\d+)?)\s*([kKmM])?/

const VAGUE_PAY_RE =
  /\b(competitive (salary|compensation|pay)|compensation commensurate|salary (to be )?discussed|doe\b|depends on experience)\b/i

export function parseCompensationFromText(text: string): {
  salaryText: string
  compensation: JobCompensation
} | null {
  const haystack = text.replace(/\u00a0/g, " ")
  const isoRange = ISO_PREFIX_RANGE_RE.exec(haystack)
  if (isoRange) {
    const min = parsePayAmount(isoRange[2], isoRange[3])
    const max = parsePayAmount(isoRange[4], isoRange[5])
    if (min != null || max != null) {
      const around = snippetAround(haystack, isoRange.index, isoRange[0].length)
      return {
        salaryText: collapse(isoRange[0]),
        compensation: {
          min,
          max,
          currency: isoRange[1],
          period: inferPeriod(around, min, max),
          bonusText: null,
        },
      }
    }
  }

  const range = RANGE_RE.exec(haystack)
  if (range) {
    const min = parsePayAmount(range[2], range[3])
    const max = parsePayAmount(range[5], range[6])
    if (min == null && max == null) {
      return null
    }
    const currency =
      range[7] ||
      range[8] ||
      SYMBOL_CURRENCY[range[1]] ||
      SYMBOL_CURRENCY[range[4]] ||
      null
    const around = snippetAround(haystack, range.index, range[0].length)
    const bonus = bonusFrom(range[9])
    return {
      salaryText: collapse(range[0]),
      compensation: {
        min,
        max,
        currency,
        period: inferPeriod(around, min, max),
        bonusText: bonus,
      },
    }
  }

  const single = SINGLE_RE.exec(haystack)
  if (single && (single[1] || single[4] || single[5])) {
    const amount = parsePayAmount(single[2], single[3])
    if (amount == null) {
      return null
    }
    const around = snippetAround(haystack, single.index, single[0].length)
    const listedPeriod = periodFromToken(single[5])
    return {
      salaryText: collapse(single[0]),
      compensation: {
        min: amount,
        max: amount,
        currency: single[4] || SYMBOL_CURRENCY[single[1]] || null,
        period: listedPeriod ?? inferPeriod(around, amount, amount),
        bonusText: null,
      },
    }
  }

  if (VAGUE_PAY_RE.test(haystack)) {
    return null
  }

  return null
}

export function normalizeExtractedCompensation(
  compensation: JobCompensation,
  salaryText: string | null
): JobCompensation {
  const parsed = salaryText ? parseCompensationFromText(salaryText) : null
  const min = finiteOrNull(compensation.min)
  const max = finiteOrNull(compensation.max)
  if (min == null && max == null) {
    return parsed?.compensation ?? emptyJobCompensation()
  }
  if (!salaryText?.trim() && !parsed) {
    return emptyJobCompensation()
  }
  return {
    min,
    max: max == null ? min : max,
    currency: trimOrNull(compensation.currency) ?? parsed?.compensation.currency ?? null,
    period: compensation.period ?? parsed?.compensation.period ?? null,
    bonusText: trimOrNull(compensation.bonusText) ?? parsed?.compensation.bonusText ?? null,
  }
}

function parsePayAmount(raw: string | undefined, suffix: string | undefined) {
  if (!raw) {
    return null
  }
  const value = Number.parseFloat(raw.replace(/,/g, ""))
  if (!Number.isFinite(value)) {
    return null
  }
  const letter = suffix?.toLowerCase()
  if (letter === "k") {
    return Math.round(value * 1_000)
  }
  if (letter === "m") {
    return Math.round(value * 1_000_000)
  }
  return Math.round(value)
}

function inferPeriod(
  around: string,
  min: number | null,
  max: number | null
): CompensationPeriod | null {
  const blob = around.toLowerCase()
  if (/\b(per\s+hour|\/\s*hr|hourly)\b/.test(blob)) {
    return "hour"
  }
  if (/\b(per\s+month|\/\s*mo|monthly|pcm)\b/.test(blob)) {
    return "month"
  }
  if (/\b(per\s+year|\/\s*yr|annual|annum|\bpa\b)\b/.test(blob)) {
    return "year"
  }
  const sample = max ?? min
  if (sample != null && sample >= 10_000) {
    return "year"
  }
  return null
}

function periodFromToken(token: string | undefined): CompensationPeriod | null {
  if (!token) {
    return null
  }
  const value = token.toLowerCase()
  if (value === "hr" || value === "hour") {
    return "hour"
  }
  if (value === "mo" || value === "month") {
    return "month"
  }
  if (value === "yr" || value === "year") {
    return "year"
  }
  return null
}

function bonusFrom(raw: string | undefined) {
  const text = collapse(raw ?? "")
  if (!text || !/^\+/.test(text)) {
    return null
  }
  return text.replace(/^\+\s*/, "") || null
}

function snippetAround(text: string, index: number, length: number) {
  return text.slice(Math.max(0, index - 40), index + length + 40)
}

function finiteOrNull(value: number | null) {
  return value != null && Number.isFinite(value) ? value : null
}

function trimOrNull(value: string | null) {
  const trimmed = value?.trim() ?? ""
  return trimmed ? trimmed : null
}

function collapse(value: string) {
  return value.replace(/\s+/g, " ").trim()
}
