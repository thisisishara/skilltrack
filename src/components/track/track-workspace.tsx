"use client"

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react"

import type { PublicUserSettings } from "@/domain/user-settings/types"
import type { TrackProposal } from "@/domain/track/proposals"
import { isTrackProposal } from "@/domain/track/proposals"
import { persistTrackProposal } from "@/application/track/persist-proposal"
import { toast } from "sonner"

export type SettingsTab = "general" | "track" | "users"

type TrackWorkspaceValue = {
  settings: PublicUserSettings
  setSettings: (settings: PublicUserSettings) => void
  canManageUsers: boolean
  settingsOpen: boolean
  settingsTab: SettingsTab
  openSettings: (tab?: SettingsTab) => void
  setSettingsOpen: (open: boolean) => void
  setSettingsTab: (tab: SettingsTab) => void
  trackPanelOpen: boolean
  setTrackPanelOpen: (open: boolean) => void
  proposals: TrackProposal[]
  ingestProposals: (values: unknown[]) => void
  acceptProposal: (roleId: string, id: string) => Promise<void>
  rejectProposal: (id: string) => void
  acceptAll: (roleId: string) => Promise<void>
  rejectAll: () => void
  restartSession: () => void
  sessionEpoch: number
  seedPrompt: string | null
  setSeedPrompt: (value: string | null) => void
  scratchpad: string
  setScratchpad: (value: string) => void
  focusedRoleId: string | null
  setFocusedRoleId: (roleId: string | null) => void
}

const TrackWorkspaceContext = createContext<TrackWorkspaceValue | null>(null)

export function useTrackWorkspaceOptional() {
  return useContext(TrackWorkspaceContext)
}

export function useTrackWorkspace() {
  const context = useTrackWorkspaceOptional()
  if (!context) {
    throw new Error("useTrackWorkspace must be used within TrackWorkspace.")
  }
  return context
}

export function TrackWorkspace({
  initialSettings,
  canManageUsers,
  children,
}: {
  initialSettings: PublicUserSettings
  canManageUsers: boolean
  children: ReactNode
}) {
  const [settings, setSettings] = useState(initialSettings)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [settingsTab, setSettingsTab] = useState<SettingsTab>("general")
  const [trackPanelOpen, setTrackPanelOpen] = useState(false)
  const [proposals, setProposals] = useState<TrackProposal[]>([])
  const [sessionEpoch, setSessionEpoch] = useState(0)
  const [seedPrompt, setSeedPrompt] = useState<string | null>(null)
  const [scratchpad, setScratchpad] = useState("")
  const [focusedRoleId, setFocusedRoleId] = useState<string | null>(null)

  const openSettings = useCallback((tab: SettingsTab = "general") => {
    setSettingsTab(tab)
    setSettingsOpen(true)
  }, [])

  const ingestProposals = useCallback((values: unknown[]) => {
    setProposals((current) => {
      const next = [...current]
      const ids = new Set(current.map((item) => item.id))
      for (const value of values) {
        if (value && typeof value === "object" && "proposals" in value) {
          const batch = (value as { proposals: unknown[] }).proposals
          for (const item of batch) {
            if (isTrackProposal(item) && !ids.has(item.id)) {
              next.push({ ...item, status: "pending" })
              ids.add(item.id)
            }
          }
          continue
        }
        if (isTrackProposal(value) && !ids.has(value.id)) {
          next.push({ ...value, status: "pending" })
          ids.add(value.id)
        }
      }
      return next
    })
  }, [])

  const rejectProposal = useCallback((id: string) => {
    setProposals((current) =>
      current.map((item) =>
        item.id === id || item.parentId === id
          ? { ...item, status: "rejected" }
          : item
      )
    )
  }, [])

  const acceptProposal = useCallback(async (roleId: string, id: string) => {
    const proposal = proposals.find((item) => item.id === id)
    if (!proposal || proposal.status !== "pending") {
      return
    }

    const ancestors = []
    if (proposal.entity === "topic" && proposal.kind === "create" && proposal.parentId) {
      const parent = proposals.find(
        (item) =>
          item.status === "pending" &&
          item.entity === "topic" &&
          item.kind === "create" &&
          (item.targetId === proposal.parentId || item.payload.id === proposal.parentId)
      )
      if (parent) {
        ancestors.push(parent)
      }
    }

    for (const item of [...ancestors, proposal]) {
      const result = await persistTrackProposal(roleId, item)
      if (!result.ok) {
        toast.error(result.message)
        return
      }
      setProposals((current) =>
        current.map((row) =>
          row.id === item.id ? { ...row, status: "accepted" } : row
        )
      )
    }
  }, [proposals])

  const acceptAll = useCallback(async (roleId: string) => {
    const pending = proposals.filter((item) => item.status === "pending")
    const topics = pending.filter((item) => item.entity === "topic")
    const rest = pending.filter((item) => item.entity !== "topic")
    const ordered = [
      ...topics.filter((item) => !item.parentId),
      ...topics.filter((item) => item.parentId),
      ...rest,
    ]
    for (const item of ordered) {
      const result = await persistTrackProposal(roleId, item)
      if (!result.ok) {
        toast.error(result.message)
        return
      }
    }
    setProposals((current) =>
      current.map((item) =>
        item.status === "pending" ? { ...item, status: "accepted" } : item
      )
    )
  }, [proposals])

  const rejectAll = useCallback(() => {
    setProposals((current) =>
      current.map((item) =>
        item.status === "pending" ? { ...item, status: "rejected" } : item
      )
    )
  }, [])

  const restartSession = useCallback(() => {
    setProposals([])
    setScratchpad("")
    setSeedPrompt(null)
    setSessionEpoch((value) => value + 1)
  }, [])

  const value = useMemo(
    () => ({
      settings,
      setSettings,
      canManageUsers,
      settingsOpen,
      settingsTab,
      openSettings,
      setSettingsOpen,
      setSettingsTab,
      trackPanelOpen,
      setTrackPanelOpen,
      proposals,
      ingestProposals,
      acceptProposal,
      rejectProposal,
      acceptAll,
      rejectAll,
      restartSession,
      sessionEpoch,
      seedPrompt,
      setSeedPrompt,
      scratchpad,
      setScratchpad,
      focusedRoleId,
      setFocusedRoleId,
    }),
    [
      settings,
      canManageUsers,
      settingsOpen,
      settingsTab,
      openSettings,
      trackPanelOpen,
      proposals,
      ingestProposals,
      acceptProposal,
      rejectProposal,
      acceptAll,
      rejectAll,
      restartSession,
      sessionEpoch,
      seedPrompt,
      scratchpad,
      focusedRoleId,
    ]
  )

  return (
    <TrackWorkspaceContext.Provider value={value}>
      {children}
    </TrackWorkspaceContext.Provider>
  )
}
