"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"

import type { Role } from "@/domain/roles/types"
import {
  readStoredActiveRoleId,
  resolveActiveRoleId,
  writeStoredActiveRoleId,
} from "@/lib/roles/active-role"

export function ActiveRoleRedirect({ roles }: { roles: Role[] }) {
  const router = useRouter()

  useEffect(() => {
    const roleId = resolveActiveRoleId(
      roles.map((role) => role.id),
      readStoredActiveRoleId()
    )

    if (!roleId) {
      return
    }

    writeStoredActiveRoleId(roleId)
    router.replace(`/dashboard/roles/${roleId}`)
  }, [roles, router])

  return (
    <main className="flex min-h-0 flex-1 flex-col overflow-y-auto p-6">
      <p className="text-sm text-muted-foreground">Opening your role…</p>
    </main>
  )
}
