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
