"use client"

import { useCallback, useEffect, useState } from "react"
import type { Layout, LayoutChangedMeta } from "react-resizable-panels"

import {
  DETAILS_PANEL_DEFAULT_SIZE,
  readStoredDetailsPanelSize,
  writeStoredDetailsPanelSize,
} from "@/lib/layout/details-panel-storage"

const DETAILS_PANEL_IDS = ["roadmap-details", "node-config", "jobs-filters"] as const

export function useDetailsPanelLayout(userId: string) {
  const [detailsSize, setDetailsSize] = useState(DETAILS_PANEL_DEFAULT_SIZE)
  const [hydrated, setHydrated] = useState(false)

  useEffect(() => {
    // Hydrate after mount so SSR markup does not depend on localStorage.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setDetailsSize(
      readStoredDetailsPanelSize(userId) ?? DETAILS_PANEL_DEFAULT_SIZE
    )
    setHydrated(true)
  }, [userId])

  const onLayoutChanged = useCallback(
    (layout: Layout, meta: LayoutChangedMeta) => {
      if (!meta.isUserInteraction) {
        return
      }

      const next = DETAILS_PANEL_IDS.map((id) => layout[id]).find(
        (value) => typeof value === "number" && Number.isFinite(value)
      )
      if (next == null) {
        return
      }

      setDetailsSize(next)
      writeStoredDetailsPanelSize(userId, next)
    },
    [userId]
  )

  return {
    groupKey: hydrated ? userId : "pending",
    mainDefaultSize: `${100 - detailsSize}%` as const,
    detailsDefaultSize: `${detailsSize}%` as const,
    onLayoutChanged,
  }
}
