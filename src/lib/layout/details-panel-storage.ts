export const DETAILS_PANEL_DEFAULT_SIZE = 40
export const DETAILS_PANEL_MIN_SIZE = 22
export const DETAILS_PANEL_MAX_SIZE = 48

function storageKey(userId: string) {
  return `skilltrack:details-panel-size:${userId}`
}

function clampSize(value: number) {
  return Math.min(
    DETAILS_PANEL_MAX_SIZE,
    Math.max(DETAILS_PANEL_MIN_SIZE, value)
  )
}

function isStoredSize(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value)
}

export function readStoredDetailsPanelSize(userId: string): number | null {
  if (typeof window === "undefined" || !userId) {
    return null
  }

  try {
    const raw = window.localStorage.getItem(storageKey(userId))
    if (!raw) {
      return null
    }

    const parsed = JSON.parse(raw)
    return isStoredSize(parsed) ? clampSize(parsed) : null
  } catch {
    return null
  }
}

export function writeStoredDetailsPanelSize(userId: string, size: number) {
  if (typeof window === "undefined" || !userId) {
    return
  }

  try {
    window.localStorage.setItem(
      storageKey(userId),
      JSON.stringify(clampSize(size))
    )
  } catch {
    // Ignore storage failures (e.g. private browsing quota).
  }
}

function visibilityKey(userId: string) {
  return `skilltrack:details-panel-open:${userId}`
}

export function readStoredDetailsPanelOpen(userId: string) {
  if (typeof window === "undefined" || !userId) {
    return true
  }

  try {
    const raw = window.localStorage.getItem(visibilityKey(userId))
    if (raw === "closed") {
      return false
    }
    return true
  } catch {
    return true
  }
}

export function writeStoredDetailsPanelOpen(userId: string, open: boolean) {
  if (typeof window === "undefined" || !userId) {
    return
  }

  try {
    window.localStorage.setItem(visibilityKey(userId), open ? "open" : "closed")
  } catch {
    // Ignore storage failures (e.g. private browsing quota).
  }
}
