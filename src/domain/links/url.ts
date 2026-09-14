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
