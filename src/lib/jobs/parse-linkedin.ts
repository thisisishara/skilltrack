import type { CheerioAPI, Cheerio } from "cheerio"
import type { AnyNode } from "domhandler"

import {
  emptyExtractedJob,
  emptyJobSections,
  type ExtractedJob,
  type FieldConfidence,
  type JobCompensation,
  type JobSections,
  type WorkplaceType,
} from "@/lib/jobs/extracted-job"
import {
  estimatePostedAt,
  normalizeRelativePosted,
} from "@/lib/jobs/relative-posted-at"
import {
  extractJobBodyHtml,
  loadJobDocument,
  looksLikeHtml,
} from "@/lib/jobs/sanitize-linkedin-html"
import { scoreExtraction } from "@/lib/jobs/score-extraction"

const LINKEDIN_JOB_ID_RE = /\/jobs\/view\/(?:[\w%-]+-)?(\d{8,})/
const APPLICANTS_RE = /(\d[\d,]*)\s+applicants?/i
const TRAVEL_RE = /travel up to \d+%[^.]*/i
const SALARY_RE =
  /(?:[A-Za-z]+:\s*)?[€$£]\s*([\d,]+)\s*[-–]\s*[€$£]?\s*([\d,]+)\s*\(([A-Z]{3})\)(?:\s*\+[^\n]*)?/i
const PREFERRED_LOCATIONS_RE =
  /preferred working location from the following:\s*(.+?)(?:\.|$)/i
const EEO_RE =
  /(?:^|\n).{0,40}?(?:equal opportunity workplace|equal employment opportunity|affirmative action employer)[\s\S]*$/i
const LANGUAGE_HINT_RE = /multilingual|language(?:s)?/i

const HEADING_MAP: Record<string, keyof JobSections | "about"> = {
  "minimum qualifications": "minimumQualifications",
  "preferred qualifications": "preferredQualifications",
  "about the job": "about",
  responsibilities: "responsibilities",
}

export type ParseJobInput = {
  paste: string
  sourceUrl?: string | null
  capturedAt?: Date
}

export function parseJobInput(input: ParseJobInput): ExtractedJob {
  const capturedAt = input.capturedAt ?? new Date()
  const nowIso = capturedAt.toISOString()
  const paste = input.paste.trim()
  const sourceUrl = normalizeSourceUrl(input.sourceUrl) ?? extractUrl(paste)

  if (!paste) {
    const empty = emptyExtractedJob(nowIso)
    empty.sourceUrl = sourceUrl
    empty.externalId = jobIdFromUrl(sourceUrl)
    empty.warnings = ["Paste the job page source or the job text."]
    return scoreExtraction(empty)
  }

  if (!looksLikeHtml(paste)) {
    return scoreExtraction(
      parsePlainText(paste, sourceUrl, capturedAt, nowIso)
    )
  }

  return scoreExtraction(parseHtml(paste, sourceUrl, capturedAt, nowIso))
}

function parseHtml(
  html: string,
  sourceUrl: string | null,
  capturedAt: Date,
  nowIso: string
): ExtractedJob {
  const $ = loadJobDocument(html)
  const job = emptyExtractedJob(nowIso)
  job.extractionMethod = "rules"
  job.source = "linkedin"
  job.capturedAt = nowIso
  job.extractedAt = nowIso

  job.roleTitle = text($(".topcard__title, h1.top-card-layout__title").first())
  job.companyName = text($("a.topcard__org-name-link").first())
  job.companyUrl =
    absUrl($("a.topcard__org-name-link").first().attr("href")) ?? null
  job.location = text(
    $(".topcard__flavor-row").first().find(".topcard__flavor--bullet").first()
  )
  job.postedRelative = normalizeRelativePosted(
    text($(".posted-time-ago__text").first())
  )
  job.applicantCount = parseApplicants(text($(".num-applicants__caption").first()))

  const criteria = readCriteria($)
  job.seniorityLevel = criteria["seniority level"] ?? null
  job.employmentType = criteria["employment type"] ?? null
  job.jobFunctions = splitCommaList(criteria["job function"] ?? "")
  job.industries = splitCommaList(criteria["industries"] ?? "")

  const bodyHtml = extractJobBodyHtml($)
  job.descriptionHtml = bodyHtml
  const sections = parseDescriptionSections(bodyHtml ?? "")
  job.sections = sections.sections
  job.description = sections.plainText
  applyDescriptionSignals(job, sections.plainText, sections.preamble)

  const hiddenId = decodeCodeComment($("#decoratedJobPostingId").text())
  const canonical =
    $('meta[property="lnkd:url"]').attr("content") ??
    $('link[rel="canonical"]').attr("href") ??
    $('meta[property="og:url"]').attr("content") ??
    null
  job.sourceUrl = sourceUrl ?? absUrl(canonical)
  job.externalId =
    hiddenId ??
    jobIdFromUrl(job.sourceUrl) ??
    jobIdFromUrl($("[data-semaphore-content-urn]").attr("data-semaphore-content-urn") ?? "")

  if (!job.roleTitle || !job.companyName) {
    applyOgTitleFallback($, job)
  }

  if (job.postedRelative) {
    const estimated = estimatePostedAt(job.postedRelative, capturedAt)
    job.postedAt = estimated.postedAt
    job.postedAtPrecision = estimated.precision
  }

  const datetime = $("time[datetime]").first().attr("datetime")
  if (datetime && /^\d{4}-\d{2}-\d{2}/.test(datetime) && !job.postedRelative) {
    job.postedAt = datetime.slice(0, 10)
    job.postedAtPrecision = "exact"
  }

  job.workplaceType = inferWorkplaceType(job)

  if (!looksLikeLinkedIn($, html)) {
    job.source = "manual"
    job.warnings.push("This does not look like a LinkedIn job page.")
  }

  return job
}

function parsePlainText(
  paste: string,
  sourceUrl: string | null,
  capturedAt: Date,
  nowIso: string
): ExtractedJob {
  const job = emptyExtractedJob(nowIso)
  job.extractionMethod = "rules"
  job.source = sourceUrl ? "linkedin" : "manual"
  job.sourceUrl = sourceUrl
  job.externalId = jobIdFromUrl(sourceUrl)
  job.description = collapseWhitespace(paste)
  job.sections.aboutTheJob = job.description
  applyDescriptionSignals(job, job.description, "")
  if (job.postedRelative) {
    const estimated = estimatePostedAt(job.postedRelative, capturedAt)
    job.postedAt = estimated.postedAt
    job.postedAtPrecision = estimated.precision
  }
  job.warnings.push(
    "Plain text has no LinkedIn structure. Review fields or extract with AI."
  )
  return job
}

function readCriteria($: CheerioAPI) {
  const map: Record<string, string> = {}
  $(".description__job-criteria-item").each((_, item) => {
    const key = text($(item).find(".description__job-criteria-subheader")).toLowerCase()
    const value = text($(item).find(".description__job-criteria-text"))
    if (key && value) {
      map[key] = value
    }
  })
  return map
}

function parseDescriptionSections(html: string) {
  const sections = emptyJobSections()
  if (!html) {
    return { sections, plainText: "", preamble: "" }
  }

  const $ = loadJobDocument(`<div id="job-body">${html}</div>`)
  const root = $("#job-body")
  let current: keyof JobSections | "about" | "preamble" = "preamble"
  const buffers: Record<string, string[]> = {
    preamble: [],
    about: [],
  }

  walk(root, $, (node) => {
    if (node.type === "tag" && node.name === "strong") {
      const heading = normalizeHeading($(node).text())
      const mapped = heading ? HEADING_MAP[heading] : undefined
      if (mapped) {
        current = mapped
        return "skip"
      }
    }

    if (node.type === "tag" && node.name === "li") {
      const item = collapseWhitespace($(node).text())
      if (!item) {
        return "skip"
      }
      if (current === "minimumQualifications") {
        sections.minimumQualifications.push(item)
      } else if (current === "preferredQualifications") {
        sections.preferredQualifications.push(item)
      } else if (current === "responsibilities") {
        sections.responsibilities.push(item)
      } else if (current === "about" || current === "preamble") {
        buffers[current].push(item)
      }
      return "skip"
    }

    if (node.type === "text") {
      const value = collapseWhitespace(node.data ?? "")
      if (!value) {
        return
      }
      if (current === "about" || current === "preamble") {
        buffers[current].push(value)
      } else if (current === "minimumQualifications") {
        // Headings sometimes include trailing text outside lists.
        if (!sections.minimumQualifications.includes(value) && value.length > 12) {
          sections.minimumQualifications.push(value)
        }
      }
    }
  })

  const about = stripEeo(buffers.about.join(" ").trim())
  sections.aboutTheJob = about || null
  const preamble = buffers.preamble.join(" ").trim()
  const plainParts = [
    preamble,
    sections.minimumQualifications.length
      ? `Minimum qualifications:\n${sections.minimumQualifications.map((item) => `- ${item}`).join("\n")}`
      : "",
    sections.preferredQualifications.length
      ? `Preferred qualifications:\n${sections.preferredQualifications.map((item) => `- ${item}`).join("\n")}`
      : "",
    about ? `About the job\n${about}` : "",
    sections.responsibilities.length
      ? `Responsibilities:\n${sections.responsibilities.map((item) => `- ${item}`).join("\n")}`
      : "",
  ].filter(Boolean)

  return { sections, plainText: plainParts.join("\n\n"), preamble }
}

function walk(
  root: Cheerio<AnyNode>,
  $: CheerioAPI,
  visit: (node: AnyNode) => "skip" | void
) {
  root.contents().each((_, node) => {
    const result = visit(node)
    if (result === "skip") {
      return
    }
    if (node.type === "tag") {
      walk($(node), $, visit)
    }
  })
}

function applyDescriptionSignals(job: ExtractedJob, text: string, preamble: string) {
  const haystack = `${preamble}\n${text}`
  const preferred = PREFERRED_LOCATIONS_RE.exec(haystack)
  if (preferred) {
    job.extras.preferredLocations = preferred[1]
      .split(";")
      .map((part) => part.replace(/<\/?strong>/gi, "").trim())
      .filter(Boolean)
    job.locations = unique([
      ...(job.location ? [job.location] : []),
      ...job.extras.preferredLocations,
    ])
  } else if (job.location) {
    job.locations = [job.location]
  }

  const travel = TRAVEL_RE.exec(haystack)
  if (travel) {
    job.extras.travel = collapseWhitespace(travel[0])
  }

  const salary = SALARY_RE.exec(haystack)
  if (salary) {
    job.salaryText = collapseWhitespace(salary[0])
    job.compensation = parseCompensation(salary)
  }

  if (/benefits/i.test(haystack)) {
    const benefitsLine = haystack
      .split(/\n/)
      .map((line) => line.trim())
      .find((line) => /bonus|equity|benefits/i.test(line) && /[€$£]/.test(line))
    if (benefitsLine) {
      job.extras.benefitsText = benefitsLine
    }
  }

  if (LANGUAGE_HINT_RE.test(haystack)) {
    job.extras.languages = ["Multilingual / NLP mentioned"]
  }

  const skills = unique([
    ...job.sections.skills,
    ...keywordSkills([
      ...job.sections.minimumQualifications,
      ...job.sections.preferredQualifications,
      ...job.sections.responsibilities,
    ]),
  ])
  job.sections.skills = skills
}

function keywordSkills(items: string[]) {
  const found: string[] = []
  const needles = [
    "Python",
    "GCP",
    "GenAI",
    "RAG",
    "ReAct",
    "NLP",
    "microservices",
    "observability",
    "evaluation",
  ]
  const blob = items.join(" ")
  for (const needle of needles) {
    if (new RegExp(`\\b${escapeRegExp(needle)}\\b`, "i").test(blob)) {
      found.push(needle)
    }
  }
  return found
}

function inferWorkplaceType(job: ExtractedJob): WorkplaceType {
  const blob = [
    job.location,
    job.sections.aboutTheJob,
    ...(job.extras.preferredLocations ?? []),
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase()
  if (/\bhybrid\b/.test(blob)) {
    return "hybrid"
  }
  if (/\bremote\b/.test(blob)) {
    return "remote"
  }
  if (/\bon-?site\b|\bin office\b/.test(blob)) {
    return "on_site"
  }
  return "unknown"
}

function parseCompensation(match: RegExpExecArray): JobCompensation {
  const min = Number.parseInt(match[1].replace(/,/g, ""), 10)
  const max = Number.parseInt(match[2].replace(/,/g, ""), 10)
  const bonus = /\+\s*(.+)$/.exec(match[0])?.[1]?.trim() ?? null
  return {
    min: Number.isFinite(min) ? min : null,
    max: Number.isFinite(max) ? max : null,
    currency: match[3] || null,
    bonusText: bonus,
  }
}

function applyOgTitleFallback($: CheerioAPI, job: ExtractedJob) {
  const title =
    $('meta[property="og:title"]').attr("content") ?? $("title").first().text()
  const match = /^(.*?)\s+hiring\s+(.*?)\s+in\s+(.*?)\s+\|\s+LinkedIn/i.exec(
    title ?? ""
  )
  if (!match) {
    return
  }
  job.companyName = job.companyName || match[1].trim()
  job.roleTitle = job.roleTitle || match[2].trim()
  job.location = job.location || match[3].trim()
}

function looksLikeLinkedIn($: CheerioAPI, html: string) {
  return (
    $(".topcard__title, .posted-time-ago__text, .description__job-criteria-list").length >
      0 || /linkedin\.com/i.test(html)
  )
}

function text(node: Cheerio<AnyNode>) {
  return collapseWhitespace(node.text())
}

function collapseWhitespace(value: string) {
  return value.replace(/\s+/g, " ").trim()
}

function splitCommaList(value: string) {
  return value
    .split(",")
    .map((part) => part.replace(/^\s*and\s+/i, "").replace(/\s+/g, " ").trim())
    .filter(Boolean)
}

function unique(values: string[]) {
  const seen = new Set<string>()
  const result: string[] = []
  for (const value of values) {
    const key = value.toLowerCase()
    if (!value || seen.has(key)) {
      continue
    }
    seen.add(key)
    result.push(value)
  }
  return result
}

function normalizeHeading(value: string) {
  return collapseWhitespace(value).replace(/:$/, "").toLowerCase()
}

function stripEeo(value: string) {
  return value.replace(EEO_RE, "").trim()
}

function decodeCodeComment(value: string) {
  const match = /"?(\d{8,})"?/.exec(value.replace(/<!--|-->/g, "").trim())
  return match?.[1] ?? null
}

function jobIdFromUrl(value: string | null | undefined) {
  if (!value) {
    return null
  }
  return LINKEDIN_JOB_ID_RE.exec(value)?.[1] ?? null
}

function extractUrl(paste: string) {
  const match = /(https?:\/\/(?:www\.)?linkedin\.com\/jobs\/view\/\d[\w/-]*)/i.exec(
    paste
  )
  return match ? normalizeSourceUrl(match[1]) : null
}

export function normalizeSourceUrl(value: string | null | undefined) {
  const trimmed = value?.trim() ?? ""
  if (!trimmed) {
    return null
  }
  try {
    const url = new URL(trimmed)
    if (!/^(www\.)?linkedin\.com$/i.test(url.hostname)) {
      return null
    }
    if (!url.pathname.includes("/jobs/view/")) {
      return null
    }
    url.search = ""
    url.hash = ""
    return url.toString()
  } catch {
    return null
  }
}

function absUrl(value: string | null | undefined) {
  if (!value) {
    return null
  }
  try {
    return new URL(value, "https://www.linkedin.com").toString()
  } catch {
    return null
  }
}

function parseApplicants(value: string) {
  const match = APPLICANTS_RE.exec(value)
  if (!match) {
    return null
  }
  const count = Number.parseInt(match[1].replace(/,/g, ""), 10)
  return Number.isFinite(count) ? count : null
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
}

export function confidenceFor(job: ExtractedJob): Record<string, FieldConfidence> {
  const fields: Array<[string, unknown]> = [
    ["roleTitle", job.roleTitle],
    ["companyName", job.companyName],
    ["location", job.location],
    ["postedRelative", job.postedRelative],
    ["seniorityLevel", job.seniorityLevel],
    ["employmentType", job.employmentType],
    ["description", job.description],
    ["externalId", job.externalId],
  ]
  const map: Record<string, FieldConfidence> = {}
  for (const [key, value] of fields) {
    map[key] = value && String(value).trim() ? "high" : "missing"
  }
  return map
}
