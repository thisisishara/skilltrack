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

export function DeleteNodeAlert({
  open,
  onOpenChange,
  count,
  nodeTitle,
  onConfirm,
  noun = "node",
  childNoun = "child nodes",
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  count: number
  nodeTitle: string
  onConfirm: () => Promise<void>
  noun?: string
  childNoun?: string
}) {
  const [pending, setPending] = useState(false)
  const multi = count > 1

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
          <AlertDialogTitle>
            {multi ? `Delete ${count} items?` : `Delete this ${noun}?`}
          </AlertDialogTitle>
          <AlertDialogDescription>
            {multi
              ? `${count} selected items and any ${childNoun} will be permanently deleted.`
              : nodeTitle
                ? `“${nodeTitle}” and its ${childNoun} will be permanently deleted.`
                : `This ${noun} and its ${childNoun} will be permanently deleted.`}
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
            {pending ? "Deleting…" : multi ? "Delete items" : `Delete ${noun}`}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
