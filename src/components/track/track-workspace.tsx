"use client"

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react"

import type { PublicUserSettings } from "@/domain/user-settings/types"
import type { TrackProposal } from "@/domain/track/proposals"
import { isTrackProposal } from "@/domain/track/proposals"
import {
  isTrackDropRef,
  trackRefKey,
  upsertTrackRef,
  type TrackDropRef,
} from "@/domain/track/drop-ref"
import { persistTrackProposal } from "@/application/track/persist-proposal"
import { toast } from "sonner"
import { useRouter } from "next/navigation"
import {
  readStoredTrackPanelOpen,
  writeStoredTrackPanelOpen,
} from "@/lib/track/panel-storage"
import {
  clearStoredTrackSession,
  readStoredTrackSession,
} from "@/lib/track/session-storage"
import {
  readStoredDetailsPanelOpen,
  writeStoredDetailsPanelOpen,
} from "@/lib/layout/details-panel-storage"

export type SettingsTab = "general" | "track" | "models" | "users"

type TrackWorkspaceValue = {
  userId: string
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
  detailsPanelOpen: boolean
  setDetailsPanelOpen: (open: boolean) => void
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
  pinnedRefs: TrackDropRef[]
  pinTrackRef: (ref: TrackDropRef) => void
  unpinTrackRef: (ref: TrackDropRef) => void
  clearPinnedRefs: () => void
  composerFocusNonce: number
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
  userId,
  initialSettings,
  canManageUsers,
  children,
}: {
  userId: string
  initialSettings: PublicUserSettings
  canManageUsers: boolean
  children: ReactNode
}) {
  const router = useRouter()
  const [settings, setSettings] = useState(initialSettings)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [settingsTab, setSettingsTab] = useState<SettingsTab>("general")
  const [trackPanelOpen, setTrackPanelOpenState] = useState(false)
  const [detailsPanelOpen, setDetailsPanelOpenState] = useState(true)
  const [proposals, setProposals] = useState<TrackProposal[]>([])
  const [sessionEpoch, setSessionEpoch] = useState(0)
  const [seedPrompt, setSeedPrompt] = useState<string | null>(null)
  const [scratchpad, setScratchpad] = useState("")
  const [focusedRoleId, setFocusedRoleId] = useState<string | null>(null)
  const [pinnedRefs, setPinnedRefs] = useState<TrackDropRef[]>([])
  const [composerFocusNonce, setComposerFocusNonce] = useState(0)

  useEffect(() => {
    setTrackPanelOpenState(readStoredTrackPanelOpen(userId))
    setDetailsPanelOpenState(readStoredDetailsPanelOpen(userId))
  }, [userId])

  useEffect(() => {
    if (!focusedRoleId) {
      return
    }
    const snapshot = readStoredTrackSession(userId, focusedRoleId)
    setProposals(snapshot?.proposals ?? [])
    setScratchpad(snapshot?.scratchpad ?? "")
    setPinnedRefs(snapshot?.pinnedRefs ?? [])
  }, [focusedRoleId, sessionEpoch, userId])

  const setTrackPanelOpen = useCallback(
    (open: boolean) => {
      setTrackPanelOpenState(open)
      writeStoredTrackPanelOpen(userId, open)
    },
    [userId]
  )

  const setDetailsPanelOpen = useCallback(
    (open: boolean) => {
      setDetailsPanelOpenState(open)
      writeStoredDetailsPanelOpen(userId, open)
    },
    [userId]
  )

  const pinTrackRef = useCallback((ref: TrackDropRef) => {
    if (!isTrackDropRef(ref)) {
      return
    }
    setPinnedRefs((current) => upsertTrackRef(current, ref))
    setComposerFocusNonce((value) => value + 1)
  }, [])

  const unpinTrackRef = useCallback((ref: TrackDropRef) => {
    setPinnedRefs((current) =>
      current.filter((item) => trackRefKey(item) !== trackRefKey(ref))
    )
  }, [])

  const clearPinnedRefs = useCallback(() => {
    setPinnedRefs([])
  }, [])

  const openSettings = useCallback((tab: SettingsTab = "general") => {
    const next =
      (tab === "users" || tab === "models") && !canManageUsers
        ? "general"
        : tab
    setSettingsTab(next)
    setSettingsOpen(true)
  }, [canManageUsers])

  const ingestProposals = useCallback((values: unknown[]) => {
    setProposals((current) => {
      let next: TrackProposal[] | null = null
      const ids = new Set(current.map((item) => item.id))
      function pushProposal(item: unknown) {
        if (!isTrackProposal(item) || ids.has(item.id)) {
          return
        }
        if (!next) {
          next = [...current]
        }
        next.push({ ...item, status: "pending" })
        ids.add(item.id)
      }
      for (const value of values) {
        if (value && typeof value === "object" && "proposals" in value) {
          for (const item of (value as { proposals: unknown[] }).proposals) {
            pushProposal(item)
          }
          continue
        }
        pushProposal(value)
      }
      return next ?? current
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
    router.refresh()
  }, [proposals, router])

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
    router.refresh()
  }, [proposals, router])

  const rejectAll = useCallback(() => {
    setProposals((current) =>
      current.map((item) =>
        item.status === "pending" ? { ...item, status: "rejected" } : item
      )
    )
  }, [])

  const restartSession = useCallback(() => {
    if (focusedRoleId) {
      clearStoredTrackSession(userId, focusedRoleId)
    }
    setProposals([])
    setScratchpad("")
    setSeedPrompt(null)
    setPinnedRefs([])
    setSessionEpoch((value) => value + 1)
  }, [focusedRoleId, userId])

  const value = useMemo(
    () => ({
      userId,
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
      detailsPanelOpen,
      setDetailsPanelOpen,
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
      pinnedRefs,
      pinTrackRef,
      unpinTrackRef,
      clearPinnedRefs,
      composerFocusNonce,
    }),
    [
      userId,
      settings,
      canManageUsers,
      settingsOpen,
      settingsTab,
      openSettings,
      trackPanelOpen,
      setTrackPanelOpen,
      detailsPanelOpen,
      setDetailsPanelOpen,
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
      pinnedRefs,
      pinTrackRef,
      unpinTrackRef,
      clearPinnedRefs,
      composerFocusNonce,
    ]
  )

  return (
    <TrackWorkspaceContext.Provider value={value}>
      {children}
    </TrackWorkspaceContext.Provider>
  )
}
