function storageKey(userId: string) {
  return `skilltrack:roadmap-edit-mode:${userId}`
}

export function readStoredEditMode(userId: string) {
  if (typeof window === "undefined" || !userId) {
    return false
  }

  try {
    const raw = window.localStorage.getItem(storageKey(userId))
    if (raw === "edit") {
      return true
    }
    if (raw === "view") {
      return false
    }
    return false
  } catch {
    return false
  }
}

export function writeStoredEditMode(userId: string, editMode: boolean) {
  if (typeof window === "undefined" || !userId) {
    return
  }

  try {
    window.localStorage.setItem(storageKey(userId), editMode ? "edit" : "view")
  } catch {
    // Ignore storage failures (e.g. private browsing quota).
  }
}
