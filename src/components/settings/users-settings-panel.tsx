"use client"

import { useEffect, useState } from "react"

import { listManagedUsersAction } from "@/application/user-settings/actions"
import { UsersAccessManager } from "@/components/users/users-access-manager"
import type { ApplicationUser } from "@/domain/users/types"
import { Spinner } from "@/components/ui/spinner"

export function UsersSettingsPanel() {
  const [users, setUsers] = useState<ApplicationUser[] | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    void listManagedUsersAction().then((result) => {
      if (cancelled) {
        return
      }
      if (!result.ok) {
        setError(result.message)
        return
      }
      setUsers(result.users)
    })
    return () => {
      cancelled = true
    }
  }, [])

  if (error) {
    return <p className="text-sm text-destructive">{error}</p>
  }
  if (!users) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Spinner className="size-4" />
        Loading users…
      </div>
    )
  }
  return <UsersAccessManager users={users} />
}
