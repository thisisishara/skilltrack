"use client"

import { useEffect } from "react"

import { writeStoredActiveRoleId } from "@/lib/roles/active-role"

export function PersistActiveRole({ roleId }: { roleId: string }) {
  useEffect(() => {
    writeStoredActiveRoleId(roleId)
  }, [roleId])

  return null
}
