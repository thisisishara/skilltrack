import "server-only"

import { ApplicationError } from "@/domain/errors"
import { normalizeSourceUrl } from "@/lib/jobs/parse-linkedin"

const FETCH_TIMEOUT_MS = 8000

export async function tryFetchLinkedInJobHtml(rawUrl: string) {
  const url = normalizeSourceUrl(rawUrl)
  if (!url) {
    throw new ApplicationError(
      "validation",
      "Use a LinkedIn job URL like https://www.linkedin.com/jobs/view/123."
    )
  }

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS)

  try {
    const response = await fetch(url, {
      signal: controller.signal,
      redirect: "follow",
      headers: {
        Accept: "text/html,application/xhtml+xml",
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Safari/537.36",
      },
    })
    if (!response.ok) {
      return {
        ok: false as const,
        message: `LinkedIn returned ${response.status}. Paste the page source instead.`,
      }
    }
    const html = await response.text()
    if (!html.trim()) {
      return {
        ok: false as const,
        message: "LinkedIn returned an empty page. Paste the page source instead.",
      }
    }
    return { ok: true as const, html, url }
  } catch {
    return {
      ok: false as const,
      message:
        "Could not fetch that LinkedIn page. Paste View page source or the job text.",
    }
  } finally {
    clearTimeout(timer)
  }
}
