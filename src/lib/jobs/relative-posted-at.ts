import type { PostedAtPrecision } from "@/lib/jobs/extracted-job"

const RELATIVE_POSTED_RE =
  /(?:posted\s+)?(?:just\s+now|(?:an?|\d+)\s+(?:minute|hour|day|week|month|year)s?\s+ago)/i

export function normalizeRelativePosted(text: string | null | undefined) {
  const compact = text?.replace(/\s+/g, " ").trim() ?? ""
  if (!compact) {
    return null
  }
  const match = RELATIVE_POSTED_RE.exec(compact)
  return match ? match[0].replace(/^posted\s+/i, "").trim() : compact
}

export function estimatePostedAt(
  relative: string | null | undefined,
  capturedAt: Date
): { postedAt: string | null; precision: PostedAtPrecision } {
  const text = normalizeRelativePosted(relative)
  if (!text) {
    return { postedAt: null, precision: "unknown" }
  }

  if (/just\s+now/i.test(text)) {
    return { postedAt: toDateOnly(capturedAt), precision: "estimated" }
  }

  const match = /(?:an?|(\d+))\s+(minute|hour|day|week|month|year)s?\s+ago/i.exec(
    text
  )
  if (!match) {
    return { postedAt: null, precision: "unknown" }
  }

  const amount = match[1] ? Number.parseInt(match[1], 10) : 1
  if (!Number.isFinite(amount) || amount < 0) {
    return { postedAt: null, precision: "unknown" }
  }

  const unit = match[2].toLowerCase()
  const estimated = new Date(capturedAt)

  if (unit === "minute") {
    estimated.setMinutes(estimated.getMinutes() - amount)
  } else if (unit === "hour") {
    estimated.setHours(estimated.getHours() - amount)
  } else if (unit === "day") {
    estimated.setDate(estimated.getDate() - amount)
  } else if (unit === "week") {
    estimated.setDate(estimated.getDate() - amount * 7)
  } else if (unit === "month") {
    estimated.setMonth(estimated.getMonth() - amount)
  } else {
    estimated.setFullYear(estimated.getFullYear() - amount)
  }

  return { postedAt: toDateOnly(estimated), precision: "estimated" }
}

function toDateOnly(value: Date) {
  const year = value.getFullYear()
  const month = String(value.getMonth() + 1).padStart(2, "0")
  const day = String(value.getDate()).padStart(2, "0")
  return `${year}-${month}-${day}`
}

export function resolvePostedAt(input: {
  postedAt?: string | null
  postedRelative?: string | null
  capturedAt?: string | Date | null
}): string | null {
  const stored = toIsoDateOnly(input.postedAt)
  if (stored) {
    return stored
  }
  const capturedAt =
    input.capturedAt instanceof Date
      ? input.capturedAt
      : input.capturedAt
        ? new Date(input.capturedAt)
        : new Date()
  if (Number.isNaN(capturedAt.getTime())) {
    return null
  }
  return estimatePostedAt(input.postedRelative, capturedAt).postedAt
}

const MONTHS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
] as const

export function formatJobPostedDate(postedAt: string | null | undefined) {
  const iso = toIsoDateOnly(postedAt)
  if (!iso) {
    return null
  }
  const [year, month, day] = iso.split("-").map(Number)
  return `${String(day).padStart(2, "0")} ${MONTHS[month - 1]} ${year}`
}

const MONTH_NUMBER: Record<string, number> = {
  jan: 1,
  january: 1,
  feb: 2,
  february: 2,
  mar: 3,
  march: 3,
  apr: 4,
  april: 4,
  may: 5,
  jun: 6,
  june: 6,
  jul: 7,
  july: 7,
  aug: 8,
  august: 8,
  sep: 9,
  sept: 9,
  september: 9,
  oct: 10,
  october: 10,
  nov: 11,
  november: 11,
  dec: 12,
  december: 12,
}

function daysInMonth(year: number, month: number) {
  return new Date(year, month, 0).getDate()
}

function toIsoDateOnly(value: string | null | undefined) {
  const match = value?.match(/^(\d{4})-(\d{2})-(\d{2})/)
  if (!match) {
    return null
  }
  const year = Number(match[1])
  const month = Number(match[2])
  const day = Number(match[3])
  if (!isValidYmd(year, month, day)) {
    return null
  }
  return `${match[1]}-${match[2]}-${match[3]}`
}

function isValidYmd(year: number, month: number, day: number) {
  return (
    Number.isInteger(year) &&
    year >= 1900 &&
    year <= 2100 &&
    month >= 1 &&
    month <= 12 &&
    day >= 1 &&
    day <= daysInMonth(year, month)
  )
}

function toYmd(year: number, month: number, day: number) {
  if (!isValidYmd(year, month, day)) {
    return null
  }
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`
}

/** Accepts `20 Aug 2026`, `2026-08-20`, or day-first `20/08/2026`. */
export function parseJobPostedDate(text: string | null | undefined) {
  const compact = text?.replace(/\s+/g, " ").trim() ?? ""
  if (!compact) {
    return null
  }

  const iso = toIsoDateOnly(compact)
  if (iso) {
    return iso
  }

  const named = /^(\d{1,2})\s+([A-Za-z]{3,9})\.?\s+(\d{4})$/.exec(compact)
  if (named) {
    const month = MONTH_NUMBER[named[2].toLowerCase()]
    if (!month) {
      return null
    }
    return toYmd(Number(named[3]), month, Number(named[1]))
  }

  const slashed = /^(\d{1,2})[/.](\d{1,2})[/.](\d{4})$/.exec(compact)
  if (slashed) {
    const first = Number(slashed[1])
    const second = Number(slashed[2])
    const year = Number(slashed[3])
    if (first > 12) {
      return toYmd(year, second, first)
    }
    if (second > 12) {
      return toYmd(year, first, second)
    }
    return toYmd(year, second, first)
  }

  return null
}
