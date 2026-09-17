export const DEFAULT_NODE_ICON = "circle-dot"

const KEBAB_CASE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/

export function normalizeNodeIcon(icon: string | null | undefined) {
  const trimmed = icon?.trim().toLowerCase() ?? ""

  if (!trimmed || !KEBAB_CASE.test(trimmed)) {
    return DEFAULT_NODE_ICON
  }

  return trimmed
}
