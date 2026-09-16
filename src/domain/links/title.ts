const TITLE_MAX_LENGTH = 200

function decodeHtmlEntities(value: string) {
  return value
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&#x([0-9a-f]+);/gi, (_, hex: string) => {
      const code = Number.parseInt(hex, 16)
      return Number.isFinite(code) ? String.fromCodePoint(code) : ""
    })
    .replace(/&#(\d+);/g, (_, digits: string) => {
      const code = Number(digits)
      return Number.isFinite(code) ? String.fromCodePoint(code) : ""
    })
}

function cleanTitle(value: string | undefined) {
  if (!value) {
    return null
  }

  const trimmed = decodeHtmlEntities(value).replace(/\s+/g, " ").trim()
  if (!trimmed) {
    return null
  }

  return trimmed.slice(0, TITLE_MAX_LENGTH)
}

function metaContent(html: string, key: string, names: string[]) {
  for (const name of names) {
    const propertyFirst = new RegExp(
      `<meta[^>]+${key}=["']${name}["'][^>]+content=["']([^"']+)["'][^>]*>`,
      "i"
    )
    const contentFirst = new RegExp(
      `<meta[^>]+content=["']([^"']+)["'][^>]+${key}=["']${name}["'][^>]*>`,
      "i"
    )
    const match = html.match(propertyFirst) ?? html.match(contentFirst)
    const title = cleanTitle(match?.[1])
    if (title) {
      return title
    }
  }

  return null
}

export function pageTitleFromHtml(html: string) {
  const snippet = html.slice(0, 120_000)
  return (
    metaContent(snippet, "property", ["og:title"]) ??
    metaContent(snippet, "name", ["twitter:title", "title"]) ??
    cleanTitle(snippet.match(/<title[^>]*>([^<]*)<\/title>/i)?.[1])
  )
}
