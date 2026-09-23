"use client"

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react"

import type { PublicUserSettings } from "@/domain/user-settings/types"
import type { TrackyProposal } from "@/domain/tracky/proposals"
import { isTrackyProposal } from "@/domain/tracky/proposals"
import {
  isTrackyDropRef,
  trackRefKey,
  upsertTrackRef,
  type TrackyDropRef,
} from "@/domain/tracky/drop-ref"
import { persistTrackyProposal } from "@/application/tracky/persist-proposal"
import { toast } from "sonner"
import { useRouter } from "next/navigation"
import {
  readStoredTrackyPanelOpen,
  writeStoredTrackyPanelOpen,
} from "@/lib/tracky/panel-storage"
import {
  clearStoredTrackySession,
  readStoredTrackySession,
} from "@/lib/tracky/session-storage"
import {
  readStoredDetailsPanelOpen,
  writeStoredDetailsPanelOpen,
} from "@/lib/layout/details-panel-storage"
import { useIsLgUp } from "@/hooks/use-mobile"

export type SettingsTab = "general" | "tracky" | "models" | "users"

type TrackyWorkspaceValue = {
  userId: string
  settings: PublicUserSettings
  setSettings: (settings: PublicUserSettings) => void
  canManageUsers: boolean
  settingsOpen: boolean
  settingsTab: SettingsTab
  openSettings: (tab?: SettingsTab) => void
  setSettingsOpen: (open: boolean) => void
  setSettingsTab: (tab: SettingsTab) => void
  trackyPanelOpen: boolean
  setTrackyPanelOpen: (open: boolean) => void
  detailsPanelOpen: boolean
  setDetailsPanelOpen: (open: boolean) => void
  proposals: TrackyProposal[]
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
  pinnedRefs: TrackyDropRef[]
  pinTrackyRef: (ref: TrackyDropRef) => void
  unpinTrackyRef: (ref: TrackyDropRef) => void
  clearPinnedRefs: () => void
  composerFocusNonce: number
}

const TrackyWorkspaceContext = createContext<TrackyWorkspaceValue | null>(null)

export function useTrackyWorkspaceOptional() {
  return useContext(TrackyWorkspaceContext)
}

export function useTrackyWorkspace() {
  const context = useTrackyWorkspaceOptional()
  if (!context) {
    throw new Error("useTrackyWorkspace must be used within TrackyWorkspace.")
  }
  return context
}

export function TrackyWorkspace({
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
  const lgUp = useIsLgUp()
  const [settings, setSettings] = useState(initialSettings)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [settingsTab, setSettingsTab] = useState<SettingsTab>("general")
  const [trackyPanelOpen, setTrackyPanelOpenState] = useState(false)
  const [detailsPanelOpen, setDetailsPanelOpenState] = useState(true)
  const [proposals, setProposals] = useState<TrackyProposal[]>([])
  const [sessionEpoch, setSessionEpoch] = useState(0)
  const [seedPrompt, setSeedPrompt] = useState<string | null>(null)
  const [scratchpad, setScratchpad] = useState("")
  const [focusedRoleId, setFocusedRoleId] = useState<string | null>(null)
  const [pinnedRefs, setPinnedRefs] = useState<TrackyDropRef[]>([])
  const [composerFocusNonce, setComposerFocusNonce] = useState(0)

  useLayoutEffect(() => {
    if (!lgUp) {
      // Overlay sheets start closed so the topic list is not covered on phones.
      // eslint-disable-next-line react-hooks/set-state-in-effect -- restore desktop panel state from storage
      setTrackyPanelOpenState(false)
      setDetailsPanelOpenState(false)
      return
    }
    setTrackyPanelOpenState(readStoredTrackyPanelOpen(userId))
    setDetailsPanelOpenState(readStoredDetailsPanelOpen(userId))
  }, [lgUp, userId])

  useEffect(() => {
    if (!focusedRoleId) {
      return
    }
    const snapshot = readStoredTrackySession(userId, focusedRoleId)
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setProposals(snapshot?.proposals ?? [])
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setScratchpad(snapshot?.scratchpad ?? "")
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setPinnedRefs(snapshot?.pinnedRefs ?? [])
  }, [focusedRoleId, sessionEpoch, userId])

  const setTrackyPanelOpen = useCallback(
    (open: boolean) => {
      setTrackyPanelOpenState(open)
      if (lgUp) {
        writeStoredTrackyPanelOpen(userId, open)
        return
      }
      if (open) {
        setDetailsPanelOpenState(false)
      }
    },
    [lgUp, userId]
  )

  const setDetailsPanelOpen = useCallback(
    (open: boolean) => {
      setDetailsPanelOpenState(open)
      if (lgUp) {
        writeStoredDetailsPanelOpen(userId, open)
        return
      }
      if (open) {
        setTrackyPanelOpenState(false)
      }
    },
    [lgUp, userId]
  )

  const pinTrackyRef = useCallback((ref: TrackyDropRef) => {
    if (!isTrackyDropRef(ref)) {
      return
    }
    setPinnedRefs((current) => upsertTrackRef(current, ref))
    setComposerFocusNonce((value) => value + 1)
  }, [])

  const unpinTrackyRef = useCallback((ref: TrackyDropRef) => {
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
      let next: TrackyProposal[] | null = null
      const ids = new Set(current.map((item) => item.id))
      function pushProposal(item: unknown) {
        if (!isTrackyProposal(item) || ids.has(item.id)) {
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
      const result = await persistTrackyProposal(roleId, item)
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
      const result = await persistTrackyProposal(roleId, item)
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
      clearStoredTrackySession(userId, focusedRoleId)
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
      trackyPanelOpen,
      setTrackyPanelOpen,
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
      pinTrackyRef,
      unpinTrackyRef,
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
      trackyPanelOpen,
      setTrackyPanelOpen,
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
      pinTrackyRef,
      unpinTrackyRef,
      clearPinnedRefs,
      composerFocusNonce,
    ]
  )

  return (
    <TrackyWorkspaceContext.Provider value={value}>
      {children}
    </TrackyWorkspaceContext.Provider>
  )
}
