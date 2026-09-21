"use client"

import { useEffect } from "react"
import { useSearchParams } from "next/navigation"

import { useRolesUi } from "@/components/roles/roles-workspace"
import { useTrackyWorkspace } from "@/components/tracky/tracky-workspace"

export function TrackyRoleSync() {
  const searchParams = useSearchParams()
  const { activeRole } = useRolesUi()
  const {
    setFocusedRoleId,
    openSettings,
    setTrackyPanelOpen,
    settings,
  } = useTrackyWorkspace()

  useEffect(() => {
    const tab = searchParams.get("settings")
    if (
      tab === "users" ||
      tab === "models" ||
      tab === "tracky" ||
      tab === "track" ||
      tab === "general"
    ) {
      openSettings(tab === "track" ? "tracky" : tab)
    }
  }, [openSettings, searchParams])

  useEffect(() => {
    if (
      (searchParams.get("tracky") === "1" || searchParams.get("track") === "1") &&
      settings.trackyEnabled
    ) {
      setTrackyPanelOpen(true)
    }
  }, [searchParams, setTrackyPanelOpen, settings.trackyEnabled])

  useEffect(() => {
    if (!activeRole) {
      return
    }
    setFocusedRoleId(activeRole.id)
  }, [activeRole, setFocusedRoleId])

  return null
}
