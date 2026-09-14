"use client"

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react"
import { useParams, useRouter } from "next/navigation"
import { toast } from "sonner"

import { createRoleAction } from "@/application/roles/actions"
import { importRoadmapAction } from "@/application/import-export/actions"
import type { Role } from "@/domain/roles/types"
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
