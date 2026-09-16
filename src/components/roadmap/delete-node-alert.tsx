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
import { ScrollArea } from "@/components/ui/scroll-area"

export function DeleteNodeAlert({
  open,
  onOpenChange,
  count,
  nodeTitle,
  onConfirm,
  noun = "node",
  childNoun = "child nodes",
  childNames = [],
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  count: number
  nodeTitle: string
  onConfirm: () => Promise<void>
  noun?: string
  childNoun?: string
  childNames?: string[]
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
        {childNames.length > 0 ? (
          childNames.length > 6 ? (
            <ScrollArea className="h-40 rounded-lg border bg-muted/40">
              <ul className="flex flex-col gap-1 p-2">
                {childNames.map((name, index) => (
                  <li
                    key={`${name}-${index}`}
                    className="truncate rounded-md px-2 py-1 text-sm"
                  >
                    {name}
                  </li>
                ))}
              </ul>
            </ScrollArea>
          ) : (
            <ul className="flex flex-col gap-1 rounded-lg border bg-muted/40 p-2">
              {childNames.map((name, index) => (
                <li
                  key={`${name}-${index}`}
                  className="truncate rounded-md px-2 py-1 text-sm"
                >
                  {name}
                </li>
              ))}
            </ul>
          )
        ) : null}
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
