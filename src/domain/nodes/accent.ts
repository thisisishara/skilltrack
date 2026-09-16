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

export function inheritedAccentColor(
  nodes: { id: string; parentId: string | null; accentColor: string | null }[],
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
    if (current.accentColor) {
      return current.accentColor
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
