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

export const RESET_TRACKY_CONFIRM_PHRASE = "Reset Tracky defaults"

export function ResetTrackyDefaultsAlert({
  open,
  onOpenChange,
  onConfirm,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  onConfirm: () => Promise<void>
}) {
  const [pending, setPending] = useState(false)
  const [confirmation, setConfirmation] = useState("")
  const [copied, setCopied] = useState(false)
  const matches = confirmation.trim() === RESET_TRACKY_CONFIRM_PHRASE

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

  async function copyPhrase() {
    try {
      await navigator.clipboard.writeText(RESET_TRACKY_CONFIRM_PHRASE)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1500)
    } catch {
      toast.error("Could not copy the confirmation phrase.")
    }
  }

  async function handleConfirm() {
    if (!matches || pending) {
      return
    }

    setPending(true)
    try {
      await onConfirm()
      setConfirmation("")
      setCopied(false)
      onOpenChange(false)
    } finally {
      setPending(false)
    }
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
            <AlertDialogTitle>Reset Tracky defaults?</AlertDialogTitle>
            <AlertDialogDescription>
              This replaces your Tracky prompts, tools, and context settings with
              the built-in defaults. Type the phrase to confirm.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <FieldGroup>
            <div className="flex items-center gap-2">
              <p className="min-w-0 flex-1 truncate font-mono text-sm">
                {RESET_TRACKY_CONFIRM_PHRASE}
              </p>
              <WithTooltip label={copied ? "Copied" : "Copy confirmation phrase"}>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-xs"
                  aria-label="Copy confirmation phrase"
                  disabled={pending}
                  onClick={() => void copyPhrase()}
                >
                  {copied ? <CheckIcon /> : <CopyIcon />}
                </Button>
              </WithTooltip>
            </div>
            <Field>
              <Input
                id="reset-track-confirmation"
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
              {pending ? "Resetting…" : "Reset to defaults"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </form>
      </AlertDialogContent>
    </AlertDialog>
  )
}
