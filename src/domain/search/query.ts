export function normalizeSearchQuery(query: string) {
  return query.trim().toLowerCase()
}

export function matchesSearch(haystack: string, query: string) {
  const needle = normalizeSearchQuery(query)
  if (!needle) {
    return true
  }

  return haystack.toLowerCase().includes(needle)
}

export function ancestorTitlePath(
  nodes: { id: string; parentId: string | null; title: string }[],
  nodeId: string
) {
  const byId = new Map(nodes.map((node) => [node.id, node]))
  const parts: string[] = []
  let current = byId.get(nodeId)?.parentId ?? null
  const seen = new Set<string>()

  while (current && !seen.has(current)) {
    seen.add(current)
    const parent = byId.get(current)
    if (!parent) {
      break
    }
    parts.unshift(parent.title)
    current = parent.parentId
  }

  return parts.join(" / ")
}
