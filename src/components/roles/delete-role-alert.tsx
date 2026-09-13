"use client"

import { useState } from "react"
import { TriangleAlert } from "lucide-react"

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogMedia,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"

export function DeleteRoleAlert({
  open,
  onOpenChange,
  roleName,
  onConfirm,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  roleName: string
  onConfirm: () => Promise<void>
}) {
  const [pending, setPending] = useState(false)

  async function handleConfirm() {
    setPending(true)
    await onConfirm()
    setPending(false)
  }

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogMedia>
            <TriangleAlert />
          </AlertDialogMedia>
          <AlertDialogTitle>Delete this role?</AlertDialogTitle>
          <AlertDialogDescription>
            {roleName
              ? `“${roleName}” and its roadmap will be permanently deleted.`
              : "This role and its roadmap will be permanently deleted."}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={pending}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            variant="destructive"
            disabled={pending}
            onClick={(event) => {
              event.preventDefault()
              void handleConfirm()
            }}
          >
            {pending ? "Deleting…" : "Delete role"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
