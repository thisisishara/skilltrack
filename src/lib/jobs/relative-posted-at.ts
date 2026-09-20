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
  return value.toISOString().slice(0, 10)
}
