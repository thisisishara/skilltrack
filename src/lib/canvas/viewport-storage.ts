import type { Viewport } from "@xyflow/react"

function storageKey(roleId: string) {
  return `skilltrack:roadmap-viewport:${roleId}`
}

function isViewport(value: unknown): value is Viewport {
  if (!value || typeof value !== "object") {
    return false
  }

  const candidate = value as Record<string, unknown>
  return (
    typeof candidate.x === "number" &&
    typeof candidate.y === "number" &&
    typeof candidate.zoom === "number" &&
    Number.isFinite(candidate.x) &&
    Number.isFinite(candidate.y) &&
    Number.isFinite(candidate.zoom)
  )
}

export function readStoredViewport(roleId: string): Viewport | null {
  if (typeof window === "undefined") {
    return null
  }

  try {
    const raw = window.localStorage.getItem(storageKey(roleId))
    if (!raw) {
      return null
    }

    const parsed = JSON.parse(raw)
    return isViewport(parsed) ? parsed : null
  } catch {
    return null
  }
}

export function writeStoredViewport(roleId: string, viewport: Viewport) {
  if (typeof window === "undefined") {
    return
  }

  try {
    window.localStorage.setItem(storageKey(roleId), JSON.stringify(viewport))
  } catch {
    // Ignore storage failures (e.g. private browsing quota).
  }
}
