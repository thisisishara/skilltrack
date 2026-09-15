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
import { useParams, usePathname, useRouter } from "next/navigation"
import { toast } from "sonner"

import { createRoleAction } from "@/application/roles/actions"
import { importRoadmapAction } from "@/application/import-export/actions"
import { adjacentRoleId, roleHrefForCurrentView } from "@/domain/roles/cycle"
import type { Role } from "@/domain/roles/types"
import { isEditableKeyboardTarget } from "@/lib/keyboard"
import { writeStoredActiveRoleId } from "@/lib/roles/active-role"

import { CreateRoleDialog } from "@/components/roles/create-role-dialog"

type RolesUiContextValue = {
  roles: Role[]
  activeRole: Role | null
  selectRole: (roleId: string) => void
  openCreate: () => void
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
  const router = useRouter()
  const pathname = usePathname()
  const params = useParams<{ roleId?: string }>()
  const [createOpen, setCreateOpen] = useState(false)

  const activeRole = useMemo(
    () => roles.find((role) => role.id === params.roleId) ?? null,
    [params.roleId, roles]
  )

  const selectRole = useCallback(
    (roleId: string) => {
      writeStoredActiveRoleId(roleId)
      router.push(`/dashboard/roles/${roleId}`)
    },
    [router]
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

      writeStoredActiveRoleId(nextId)
      router.push(roleHrefForCurrentView(nextId, pathname, activeRole?.id))
    }

    window.addEventListener("keydown", onKeyDown)
    return () => window.removeEventListener("keydown", onKeyDown)
  }, [activeRole?.id, pathname, roles, router])

  async function handleCreate(name: string) {
    const result = await createRoleAction(name)
    if (!result.ok) {
      return result
    }
    if ("role" in result) {
      writeStoredActiveRoleId(result.role.id)
      toast.success("Role created")
      setCreateOpen(false)
      router.push(`/dashboard/roles/${result.role.id}`)
    }
    return result
  }

  async function handleImport(json: string, nameOverride?: string) {
    const result = await importRoadmapAction({ json, nameOverride })
    if (!result.ok) {
      return result
    }
    if ("role" in result) {
      writeStoredActiveRoleId(result.role.id)
      toast.success("Roadmap imported")
      setCreateOpen(false)
      router.push(`/dashboard/roles/${result.role.id}`)
    }
    return result
  }

  const value = useMemo(
    () => ({
      roles,
      activeRole,
      selectRole,
      openCreate,
    }),
    [roles, activeRole, selectRole, openCreate]
  )

  return (
    <RolesUiContext.Provider value={value}>
      {children}
      <CreateRoleDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        onCreateEmpty={handleCreate}
        onImport={handleImport}
      />
    </RolesUiContext.Provider>
  )
}
