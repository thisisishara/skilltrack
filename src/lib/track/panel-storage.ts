function storageKey(userId: string) {
  return `skilltrack:track-panel-open:${userId}`
}

export function readStoredTrackPanelOpen(userId: string) {
  if (typeof window === "undefined" || !userId) {
    return false
  }

  try {
    const raw = window.localStorage.getItem(storageKey(userId))
    if (raw === "open") {
      return true
    }
    if (raw === "closed") {
      return false
    }
    return false
  } catch {
    return false
  }
}

export function writeStoredTrackPanelOpen(userId: string, open: boolean) {
  if (typeof window === "undefined" || !userId) {
    return
  }

  try {
    window.localStorage.setItem(storageKey(userId), open ? "open" : "closed")
  } catch {
    // Ignore storage failures (e.g. private browsing quota).
  }
}
