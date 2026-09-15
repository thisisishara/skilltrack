// Nodes are collapsed by default (like a file explorer) — we persist the
// opt-in set of *expanded* node ids, not collapsed ones. This keeps first
// paint of a large roadmap cheap: nothing renders its children or checklist
// until the user actually opens it.
function storageKey(roleId: string) {
  return `skilltrack:roadmap-tree-expanded:${roleId}`
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === "string")
}

export function readExpandedIds(roleId: string): Set<string> {
  if (typeof window === "undefined") {
    return new Set()
  }

  try {
    const raw = window.localStorage.getItem(storageKey(roleId))
    if (!raw) {
      return new Set()
    }

    const parsed = JSON.parse(raw)
    return isStringArray(parsed) ? new Set(parsed) : new Set()
  } catch {
    return new Set()
  }
}

export function writeExpandedIds(roleId: string, expandedIds: Set<string>) {
  if (typeof window === "undefined") {
    return
  }

  try {
    window.localStorage.setItem(storageKey(roleId), JSON.stringify([...expandedIds]))
  } catch {
    // Ignore storage failures (e.g. private browsing quota).
  }
}
