export function displayLinkLabel(label: string) {
  return label.trim()
}

export function normalizeLinkUrl(url: string) {
  return url.trim()
}

export function isValidHttpUrl(url: string) {
  try {
    const parsed = new URL(url)
    return parsed.protocol === "http:" || parsed.protocol === "https:"
  } catch {
    return false
  }
}

export function defaultLinkLabel(pageUrl: string) {
  try {
    const hostname = new URL(pageUrl).hostname.toLowerCase()
    return hostname.replace(/^www\./, "") || pageUrl
  } catch {
    return displayLinkLabel(pageUrl)
  }
}

export function resolveLinkFields(label: string, url: string) {
  const trimmedUrl = normalizeLinkUrl(url)
  if (!trimmedUrl || !isValidHttpUrl(trimmedUrl)) {
    return { ok: false as const, message: "Enter a valid http or https URL." }
  }

  const trimmedLabel = displayLinkLabel(label) || defaultLinkLabel(trimmedUrl)
  if (!trimmedLabel) {
    return { ok: false as const, message: "Enter a valid http or https URL." }
  }

  return { ok: true as const, label: trimmedLabel, url: trimmedUrl }
}

export function faviconUrlFor(pageUrl: string) {
  try {
    const parsed = new URL(pageUrl)
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      return null
    }

    return `https://www.google.com/s2/favicons?domain=${encodeURIComponent(parsed.hostname)}&sz=64`
  } catch {
    return null
  }
}
