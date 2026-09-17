export const ACCENT_PRESETS = [
  { id: "blue", hex: "#3b82f6", label: "Blue" },
  { id: "violet", hex: "#8b5cf6", label: "Violet" },
  { id: "emerald", hex: "#10b981", label: "Emerald" },
  { id: "amber", hex: "#f59e0b", label: "Amber" },
  { id: "rose", hex: "#f43f5e", label: "Rose" },
] as const

export type AccentParseResult =
  | { ok: true; value: string | null }
  | { ok: false }

export function parseAccentHex(input: string | null | undefined): AccentParseResult {
  if (input == null) {
    return { ok: true, value: null }
  }

  const trimmed = input.trim()
  if (!trimmed) {
    return { ok: true, value: null }
  }

  const digits = trimmed.startsWith("#") ? trimmed.slice(1) : trimmed
  if (/^[0-9a-fA-F]{3}$/.test(digits)) {
    return {
      ok: true,
      value: `#${digits
        .split("")
        .map((char) => `${char}${char}`)
        .join("")
        .toLowerCase()}`,
    }
  }

  if (/^[0-9a-fA-F]{6}$/.test(digits)) {
    return { ok: true, value: `#${digits.toLowerCase()}` }
  }

  return { ok: false }
}

export function normalizeAccentColor(input: string | null | undefined) {
  const parsed = parseAccentHex(input)
  return parsed.ok ? parsed.value : null
}

export type NestedAccentMode = "keep" | "apply"

type AccentNode = {
  id: string
  parentId: string | null
  color: string | null
}

function descendantIds(nodes: AccentNode[], rootId: string) {
  const childrenByParent = new Map<string | null, string[]>()
  for (const node of nodes) {
    const siblings = childrenByParent.get(node.parentId) ?? []
    siblings.push(node.id)
    childrenByParent.set(node.parentId, siblings)
  }

  const ids: string[] = []
  const stack = [...(childrenByParent.get(rootId) ?? [])]
  while (stack.length > 0) {
    const current = stack.pop()
    if (!current) {
      continue
    }
    ids.push(current)
    stack.push(...(childrenByParent.get(current) ?? []))
  }
  return ids
}

export function hasNestedTopics(nodes: AccentNode[], nodeId: string) {
  return descendantIds(nodes, nodeId).length > 0
}

export function accentUpdatesForChange(
  nodes: AccentNode[],
  nodeId: string,
  nextAccent: string | null,
  mode: NestedAccentMode
) {
  const updates: { id: string; color: string | null }[] = [
    { id: nodeId, color: nextAccent },
  ]
  const nestedIds = descendantIds(nodes, nodeId)
    .slice()
    .sort(
      (left, right) =>
        nodes.findIndex((node) => node.id === left) -
        nodes.findIndex((node) => node.id === right)
    )
  if (nestedIds.length === 0) {
    return updates
  }

  if (mode === "apply") {
    for (const id of nestedIds) {
      updates.push({ id, color: nextAccent })
    }
    return updates
  }

  for (const id of nestedIds) {
    const nested = nodes.find((node) => node.id === id)
    if (!nested || nested.color) {
      continue
    }
    const currentColor = inheritedAccentColor(nodes, id)
    if (currentColor) {
      updates.push({ id, color: currentColor })
    }
  }

  return updates
}

export function inheritedAccentColor(
  nodes: { id: string; parentId: string | null; color: string | null }[],
  nodeId: string
) {
  const byId = new Map(nodes.map((node) => [node.id, node]))
  const seen = new Set<string>()
  let current = byId.get(nodeId) ?? null

  while (current) {
    if (seen.has(current.id)) {
      break
    }
    seen.add(current.id)
    if (current.color) {
      return current.color
    }
    current = current.parentId ? (byId.get(current.parentId) ?? null) : null
  }

  return null
}

export function accentIconStyle(hex: string) {
  return {
    backgroundColor: `color-mix(in oklab, ${hex} 18%, transparent)`,
    color: hex,
  }
}
