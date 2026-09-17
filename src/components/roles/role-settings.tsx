"use client"

import { useEffect, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"

import {
  deleteRoleAction,
  renameRoleAction,
} from "@/application/roles/actions"
import { exportRoadmapAction } from "@/application/import-export/actions"
import { DeleteRoleAlert } from "@/components/roles/delete-role-alert"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import type { Role } from "@/domain/roles/types"
import {
  clearStoredActiveRoleId,
  writeStoredActiveRoleId,
} from "@/lib/roles/active-role"
import { useRolesUi } from "@/components/roles/roles-workspace"
import { downloadTextFile } from "@/lib/roadmap/download"

export function RoleSettings({ role }: { role: Role }) {
  const router = useRouter()
  const { roles } = useRolesUi()
  const [name, setName] = useState(role.name)
  const [error, setError] = useState<string | null>(null)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [exportPending, setExportPending] = useState(false)
  const persistTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const saveGeneration = useRef(0)

  useEffect(() => {
    if (persistTimer.current) {
      clearTimeout(persistTimer.current)
      persistTimer.current = null
    }

    saveGeneration.current += 1
    // Re-sync when switching roles. Ignore later role.name updates so a
    // refresh after autosave cannot overwrite in-progress typing.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setName(role.name)
    setError(null)
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only reset on role switch
  }, [role.id])

  useEffect(() => {
    return () => {
      if (persistTimer.current) {
        clearTimeout(persistTimer.current)
      }
    }
  }, [])

  function persistName(nextName: string) {
    const trimmed = nextName.trim()
    if (trimmed === role.name) {
      return
    }

    const generation = ++saveGeneration.current
    void renameRoleAction(role.id, nextName).then((result) => {
      if (generation !== saveGeneration.current) {
        return
      }

      if (!result.ok) {
        setError(result.message)
        if (result.code !== "validation" && result.code !== "conflict") {
          toast.error(result.message)
        }
        return
      }

      setError(null)
      router.refresh()
    })
  }

  function persistNameNow(nextName: string) {
    if (persistTimer.current) {
      clearTimeout(persistTimer.current)
      persistTimer.current = null
    }
    persistName(nextName)
  }

  function scheduleRename(nextName: string) {
    setName(nextName)
    if (persistTimer.current) {
      clearTimeout(persistTimer.current)
    }
    persistTimer.current = setTimeout(() => {
      persistTimer.current = null
      persistName(nextName)
    }, 350)
  }

  async function handleExport() {
    setExportPending(true)
    const result = await exportRoadmapAction(role.id)
    setExportPending(false)

    if (!result.ok) {
      toast.error(result.message)
      return
    }

    downloadTextFile(result.filename, result.json)
    toast.success("Roadmap exported")
  }

  async function handleDelete() {
    const result = await deleteRoleAction(role.id)
    if (!result.ok) {
      toast.error(result.message)
      return
    }

    toast.success("Role deleted")
    setDeleteOpen(false)

    const remaining = roles.filter((item) => item.id !== role.id)
    if (remaining.length === 0) {
      clearStoredActiveRoleId()
      router.push("/dashboard")
      return
    }

    writeStoredActiveRoleId(remaining[0].id)
    router.push(`/dashboard/roles/${remaining[0].id}`)
  }

  return (
    <div className="mx-auto flex w-full max-w-xl flex-col gap-6">
      <div className="flex flex-col gap-1.5">
        <h1 className="font-heading text-lg font-medium">Role settings</h1>
        <p className="text-sm text-muted-foreground">
          Manage the selected role. Topics and progress stay the same when you rename.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Name</CardTitle>
          <CardDescription>
            Unique per account. Changing it does not reset this role’s topics.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <FieldGroup>
            <Field data-invalid={error ? true : undefined}>
              <FieldLabel htmlFor="role-settings-name">Role name</FieldLabel>
              <Input
                id="role-settings-name"
                className="font-mono"
                value={name}
                onChange={(event) => scheduleRename(event.target.value)}
                onBlur={() => persistNameNow(name)}
                autoComplete="off"
                aria-invalid={error ? true : undefined}
              />
              {error ? <FieldError>{error}</FieldError> : (
                <FieldDescription>
                  Unique per account.
                </FieldDescription>
              )}
            </Field>
          </FieldGroup>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Export roadmap</CardTitle>
          <CardDescription>
            Download this role as SkillTrack roadmap JSON. Re-import it into a new role or
            an empty roadmap.
          </CardDescription>
        </CardHeader>
        <CardFooter>
          <Button type="button" variant="outline" disabled={exportPending} onClick={() => void handleExport()}>
            {exportPending ? "Exporting…" : "Export JSON"}
          </Button>
        </CardFooter>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Delete role</CardTitle>
          <CardDescription>
            Permanently removes this role and its roadmap. This cannot be undone.
          </CardDescription>
        </CardHeader>
        <CardFooter>
          <Button variant="destructive" onClick={() => setDeleteOpen(true)}>
            Delete role
          </Button>
        </CardFooter>
      </Card>

      <DeleteRoleAlert
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        roleName={role.name}
        onConfirm={handleDelete}
      />
    </div>
  )
}
