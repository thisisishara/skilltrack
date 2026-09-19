"use client"

import { useEffect } from "react"
import { useSearchParams } from "next/navigation"

import { useRolesUi } from "@/components/roles/roles-workspace"
import { useTrackWorkspace } from "@/components/track/track-workspace"

export function TrackRoleSync() {
  const searchParams = useSearchParams()
  const { activeRole } = useRolesUi()
  const {
    setFocusedRoleId,
    openSettings,
    setTrackPanelOpen,
    settings,
  } = useTrackWorkspace()

  useEffect(() => {
    const tab = searchParams.get("settings")
    if (
      tab === "users" ||
      tab === "models" ||
      tab === "track" ||
      tab === "general"
    ) {
      openSettings(tab)
    }
  }, [openSettings, searchParams])

  useEffect(() => {
    if (searchParams.get("track") === "1" && settings.trackEnabled) {
      setTrackPanelOpen(true)
    }
  }, [searchParams, setTrackPanelOpen, settings.trackEnabled])

  useEffect(() => {
    if (!activeRole) {
      return
    }
    setFocusedRoleId(activeRole.id)
  }, [activeRole, setFocusedRoleId])

  return null
}
