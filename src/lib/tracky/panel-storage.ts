function storageKey(userId: string) {
  return `skilltrack:tracky-panel-open:${userId}`
}

function legacyStorageKey(userId: string) {
  return `skilltrack:track-panel-open:${userId}`
}

export function readStoredTrackyPanelOpen(userId: string) {
  if (typeof window === "undefined" || !userId) {
    return false
  }

  try {
    const raw =
      window.localStorage.getItem(storageKey(userId)) ??
      window.localStorage.getItem(legacyStorageKey(userId))
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

export function writeStoredTrackyPanelOpen(userId: string, open: boolean) {
  if (typeof window === "undefined" || !userId) {
    return
  }

  try {
    window.localStorage.setItem(storageKey(userId), open ? "open" : "closed")
    window.localStorage.removeItem(legacyStorageKey(userId))
  } catch {
    // Ignore storage failures (e.g. private browsing quota).
  }
}
