"use client"

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react"
import { useParams, usePathname, useRouter } from "next/navigation"
import { toast } from "sonner"

import { createRoleAction } from "@/application/roles/actions"
import { importRoadmapAction } from "@/application/import-export/actions"
import { adjacentRoleId, roleHrefForCurrentView } from "@/domain/roles/cycle"
import type { Role } from "@/domain/roles/types"
import { isEditableKeyboardTarget } from "@/lib/keyboard"
import { writeStoredActiveRoleId } from "@/lib/roles/active-role"

import { CreateRoleDialog } from "@/components/roles/create-role-dialog"
import { useTrackWorkspace } from "@/components/track/track-workspace"
import type { RoadmapViewProps } from "@/components/roadmap/roadmap"

export type TreeFocusRequest = {
  nonce: number
  roleId: string
  nodeId: string
}

type RolesUiContextValue = {
  roles: Role[]
  activeRole: Role | null
  selectRole: (roleId: string) => void
  openCreate: () => void
  treeFocusRequest: TreeFocusRequest | null
  focusTree: (target: { roleId: string; nodeId: string }) => void
  cachedRoadmap: RoadmapViewProps | null
  rememberRoadmap: (payload: RoadmapViewProps) => void
  /** Href of an in-flight client navigation, or null when idle. */
  pendingHref: string | null
  /** Mark a navigation as started so UI can show progress/overlays. */
  beginNavigation: (href: string) => void
}

const RolesUiContext = createContext<RolesUiContextValue | null>(null)

export function useRolesUi() {
  const context = useContext(RolesUiContext)
  if (!context) {
    throw new Error("useRolesUi must be used within RolesWorkspace.")
  }
  return context
}

export function RolesWorkspace({
  roles,
  children,
}: {
  roles: Role[]
  children: ReactNode
}) {
  const { setSeedPrompt, setTrackPanelOpen } = useTrackWorkspace()
  const router = useRouter()
  const pathname = usePathname()
  const params = useParams<{ roleId?: string }>()
  const [createOpen, setCreateOpen] = useState(false)
  const [treeFocusRequest, setTreeFocusRequest] = useState<TreeFocusRequest | null>(
    null
  )
  const [cachedRoadmaps, setCachedRoadmaps] = useState<
    Record<string, RoadmapViewProps>
  >({})
  const [rawPendingHref, setRawPendingHref] = useState<string | null>(null)
  const treeFocusNonceRef = useRef(0)

  // Once the pathname actually matches where we were headed, the navigation
  // is done — derive that instead of clearing state from an effect, so the
  // "pending" flag can never outlive the render where it stops being true.
  const pendingHref =
    rawPendingHref && rawPendingHref.split("?")[0] !== pathname
      ? rawPendingHref
      : null

  useEffect(() => {
    if (!pendingHref) {
      return
    }
    // Safety net: never let a stale "navigating" state stick around if a
    // navigation errors out without the pathname ever changing.
    const timer = setTimeout(() => setRawPendingHref(null), 8000)
    return () => clearTimeout(timer)
  }, [pendingHref])

  const beginNavigation = useCallback(
    (href: string) => {
      if (href.split("?")[0] === pathname) {
        return
      }
      setRawPendingHref(href)
    },
    [pathname]
  )

  const rememberRoadmap = useCallback((payload: RoadmapViewProps) => {
    setCachedRoadmaps((current) => ({
      ...current,
      [payload.roleId]: payload,
    }))
  }, [])

  const focusTree = useCallback((target: { roleId: string; nodeId: string }) => {
    treeFocusNonceRef.current += 1
    setTreeFocusRequest({
      nonce: treeFocusNonceRef.current,
      roleId: target.roleId,
      nodeId: target.nodeId,
    })
  }, [])

  const activeRole = useMemo(
    () => roles.find((role) => role.id === params.roleId) ?? null,
    [params.roleId, roles]
  )

  const cachedRoadmap = params.roleId
    ? (cachedRoadmaps[params.roleId] ?? null)
    : null

  useEffect(() => {
    if (!activeRole) {
      return
    }

    setCachedRoadmaps((current) => {
      const cached = current[activeRole.id]
      if (!cached) {
        return current
      }
      if (
        cached.roleName === activeRole.name &&
        cached.roleDescription === activeRole.description &&
        cached.roleNotes === activeRole.notes
      ) {
        return current
      }
      return {
        ...current,
        [activeRole.id]: {
          ...cached,
          roleName: activeRole.name,
          roleDescription: activeRole.description,
          roleNotes: activeRole.notes,
        },
      }
    })
  }, [activeRole])

  const selectRole = useCallback(
    (roleId: string) => {
      const href = `/dashboard/roles/${roleId}`
      writeStoredActiveRoleId(roleId)
      beginNavigation(href)
      router.push(href)
    },
    [beginNavigation, router]
  )

  const openCreate = useCallback(() => {
    setCreateOpen(true)
  }, [])

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (!(event.metaKey || event.ctrlKey) || event.altKey) {
        return
      }
      if (event.key !== "ArrowUp" && event.key !== "ArrowDown") {
        return
      }
      if (event.repeat || isEditableKeyboardTarget(event.target)) {
        return
      }

      event.preventDefault()
      const nextId = adjacentRoleId(
        roles.map((role) => role.id),
        activeRole?.id,
        event.key === "ArrowDown" ? 1 : -1
      )
      if (!nextId) {
        return
      }

      const nextHref = roleHrefForCurrentView(nextId, pathname, activeRole?.id)
      writeStoredActiveRoleId(nextId)
      beginNavigation(nextHref)
      router.push(nextHref)
    }

    window.addEventListener("keydown", onKeyDown)
    return () => window.removeEventListener("keydown", onKeyDown)
  }, [activeRole?.id, beginNavigation, pathname, roles, router])

  async function handleCreate(name: string) {
    const result = await createRoleAction(name)
    if (!result.ok) {
      return result
    }
    if ("role" in result) {
      const href = `/dashboard/roles/${result.role.id}`
      writeStoredActiveRoleId(result.role.id)
      toast.success("Role created")
      setCreateOpen(false)
      beginNavigation(href)
      router.push(href)
    }
    return result
  }

  async function handleImport(json: string, nameOverride?: string) {
    const result = await importRoadmapAction({ json, nameOverride })
    if (!result.ok) {
      return result
    }
    if ("role" in result) {
      const href = `/dashboard/roles/${result.role.id}`
      writeStoredActiveRoleId(result.role.id)
      toast.success("Roadmap imported")
      setCreateOpen(false)
      beginNavigation(href)
      router.push(href)
    }
    return result
  }

  async function handleCreateWithTrack(name: string, brief: string) {
    const result = await createRoleAction(name)
    if (!result.ok) {
      return result
    }
    if ("role" in result) {
      const href = `/dashboard/roles/${result.role.id}?track=1`
      writeStoredActiveRoleId(result.role.id)
      setSeedPrompt(brief)
      setTrackPanelOpen(true)
      toast.success("Role created")
      setCreateOpen(false)
      beginNavigation(href)
      router.push(href)
    }
    return result
  }

  const value = useMemo(
    () => ({
      roles,
      activeRole,
      selectRole,
      openCreate,
      treeFocusRequest,
      focusTree,
      cachedRoadmap,
      rememberRoadmap,
      pendingHref,
      beginNavigation,
    }),
    [
      roles,
      activeRole,
      selectRole,
      openCreate,
      treeFocusRequest,
      focusTree,
      cachedRoadmap,
      rememberRoadmap,
      pendingHref,
      beginNavigation,
    ]
  )

  return (
    <RolesUiContext.Provider value={value}>
      {children}
      <CreateRoleDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        onCreateEmpty={handleCreate}
        onImport={handleImport}
        onCreateWithTrack={handleCreateWithTrack}
      />
    </RolesUiContext.Provider>
  )
}
