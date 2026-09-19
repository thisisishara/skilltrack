"use client"

import { useState, type FormEvent } from "react"
import { CheckIcon, CopyIcon, TriangleAlert } from "lucide-react"
import { toast } from "sonner"

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
import { Button } from "@/components/ui/button"
import { Field, FieldGroup } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { WithTooltip } from "@/components/ui/tooltip"

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
  const [confirmation, setConfirmation] = useState("")
  const [copied, setCopied] = useState(false)
  const matches = confirmation.trim() === roleName

  function handleOpenChange(next: boolean) {
    if (pending) {
      return
    }

    if (!next) {
      setConfirmation("")
      setCopied(false)
    }

    onOpenChange(next)
  }

  async function copyRoleName() {
    try {
      await navigator.clipboard.writeText(roleName)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1500)
    } catch {
      toast.error("Could not copy the role name.")
    }
  }

  async function handleConfirm() {
    if (!matches || pending) {
      return
    }

    setPending(true)
    await onConfirm()
    setPending(false)
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault()
    void handleConfirm()
  }

  return (
    <AlertDialog open={open} onOpenChange={handleOpenChange}>
      <AlertDialogContent className="data-[size=default]:sm:max-w-md">
        <form onSubmit={handleSubmit} className="contents">
          <AlertDialogHeader>
            <AlertDialogMedia className="bg-destructive/10 text-destructive">
              <TriangleAlert />
            </AlertDialogMedia>
            <AlertDialogTitle>Delete this role?</AlertDialogTitle>
            <AlertDialogDescription>
              This permanently deletes the role and its roadmap. Type the name
              to confirm.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <FieldGroup>
            <div className="flex items-center gap-2">
              <p className="min-w-0 flex-1 truncate font-mono text-sm">
                {roleName}
              </p>
              <WithTooltip label={copied ? "Copied" : "Copy role name"}>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-xs"
                  aria-label="Copy role name"
                  disabled={pending || !roleName}
                  onClick={() => void copyRoleName()}
                >
                  {copied ? <CheckIcon /> : <CopyIcon />}
                </Button>
              </WithTooltip>
            </div>
            <Field>
              <Input
                id="delete-role-confirmation"
                className="font-mono"
                value={confirmation}
                onChange={(event) => setConfirmation(event.target.value)}
                autoComplete="off"
                autoFocus
                disabled={pending}
              />
            </Field>
          </FieldGroup>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={pending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              type="submit"
              variant="destructive"
              disabled={pending || !matches}
              onClick={(event) => {
                event.preventDefault()
                void handleConfirm()
              }}
            >
              {pending ? "Deleting…" : "Delete role"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </form>
      </AlertDialogContent>
    </AlertDialog>
  )
}
