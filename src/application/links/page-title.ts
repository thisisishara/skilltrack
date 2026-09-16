import "server-only"

import { lookup } from "node:dns/promises"

import { isBlockedLinkHostname, isPrivateIpAddress } from "@/domain/links/public-host"
import { pageTitleFromHtml } from "@/domain/links/title"
import { isValidHttpUrl, normalizeLinkUrl } from "@/domain/links/url"

const FETCH_TIMEOUT_MS = 5_000
const MAX_REDIRECTS = 3
const MAX_HTML_BYTES = 120_000

async function assertPublicHttpUrl(pageUrl: string) {
  const parsed = new URL(pageUrl)
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    return false
  }

  if (parsed.username || parsed.password) {
    return false
  }

  if (isBlockedLinkHostname(parsed.hostname)) {
    return false
  }

  try {
    const records = await lookup(parsed.hostname, { all: true })
    if (records.length === 0 || records.some((record) => isPrivateIpAddress(record.address))) {
      return false
    }
  } catch {
    return false
  }

  return true
}

async function readHtml(response: Response) {
  const contentType = response.headers.get("content-type") ?? ""
  if (contentType && !contentType.includes("html") && !contentType.includes("xml")) {
    return null
  }

  const reader = response.body?.getReader()
  if (!reader) {
    const text = await response.text()
    return text.slice(0, MAX_HTML_BYTES)
  }

  const chunks: Uint8Array[] = []
  let received = 0

  while (received < MAX_HTML_BYTES) {
    const { done, value } = await reader.read()
    if (done || !value) {
      break
    }

    chunks.push(value)
    received += value.byteLength
  }

  await reader.cancel().catch(() => undefined)
  const merged = new Uint8Array(Math.min(received, MAX_HTML_BYTES))
  let offset = 0
  for (const chunk of chunks) {
    const size = Math.min(chunk.byteLength, merged.byteLength - offset)
    merged.set(chunk.subarray(0, size), offset)
    offset += size
    if (offset >= merged.byteLength) {
      break
    }
  }

  return new TextDecoder("utf-8", { fatal: false }).decode(merged)
}

export async function fetchPublicPageTitle(pageUrl: string) {
  let current = normalizeLinkUrl(pageUrl)
  if (!isValidHttpUrl(current) || !(await assertPublicHttpUrl(current))) {
    return null
  }

  for (let hop = 0; hop <= MAX_REDIRECTS; hop += 1) {
    let response: Response
    try {
      response = await fetch(current, {
        method: "GET",
        redirect: "manual",
        cache: "no-store",
        headers: {
          Accept: "text/html,application/xhtml+xml",
          "User-Agent": "SkillTrack/1.0",
        },
        signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
      })
    } catch {
      return null
    }

    if (response.status >= 300 && response.status < 400) {
      const location = response.headers.get("location")
      if (!location || hop === MAX_REDIRECTS) {
        return null
      }

      try {
        current = new URL(location, current).toString()
      } catch {
        return null
      }

      if (!(await assertPublicHttpUrl(current))) {
        return null
      }

      continue
    }

    if (!response.ok) {
      return null
    }

    const html = await readHtml(response)
    return html ? pageTitleFromHtml(html) : null
  }

  return null
}
