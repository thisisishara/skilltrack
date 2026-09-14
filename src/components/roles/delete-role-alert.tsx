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
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field"
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from "@/components/ui/input-group"

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
            <AlertDialogMedia>
              <TriangleAlert />
            </AlertDialogMedia>
            <AlertDialogTitle>Delete this role?</AlertDialogTitle>
            <AlertDialogDescription>
              {roleName
                ? `This permanently deletes “${roleName}” and its roadmap. Type the role name to confirm.`
                : "This role and its roadmap will be permanently deleted."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="delete-role-confirmation">
                Role name
              </FieldLabel>
              <InputGroup>
                <InputGroupInput
                  id="delete-role-confirmation"
                  className="font-mono"
                  value={confirmation}
                  onChange={(event) => setConfirmation(event.target.value)}
                  autoComplete="off"
                  autoFocus
                  disabled={pending}
                />
                <InputGroupAddon align="inline-end">
                  <InputGroupButton
                    size="icon-xs"
                    aria-label="Copy role name"
                    disabled={pending || !roleName}
                    onClick={() => void copyRoleName()}
                  >
                    {copied ? <CheckIcon /> : <CopyIcon />}
                  </InputGroupButton>
                </InputGroupAddon>
              </InputGroup>
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
