"use client"

import { useState } from "react"
import { CheckIcon, CopyIcon } from "lucide-react"
import { toast } from "sonner"

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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { buildRoadmapImportPrompt } from "@/lib/roadmap/llm-prompt"

export function GenerateImportPrompt({ roleName }: { roleName: string }) {
  const [roleTitle, setRoleTitle] = useState(roleName)
  const [extraGuidance, setExtraGuidance] = useState("")
  const [open, setOpen] = useState(false)
  const [prompt, setPrompt] = useState("")
  const [copied, setCopied] = useState(false)

  function handleGenerate() {
    setPrompt(
      buildRoadmapImportPrompt({
        roleTitle: roleTitle.trim() || roleName,
        extraGuidance,
      }),
    )
    setCopied(false)
    setOpen(true)
  }

  async function copyPrompt() {
    try {
      await navigator.clipboard.writeText(prompt)
      setCopied(true)
      toast.success("Prompt copied")
      window.setTimeout(() => setCopied(false), 1500)
    } catch {
      toast.error("Could not copy the prompt.")
    }
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Generate with an LLM</CardTitle>
          <CardDescription>
            Copy a prompt that asks an assistant to produce SkillTrack roadmap JSON
            for a role. Import the JSON into an empty roadmap.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="llm-prompt-role">Role</FieldLabel>
              <Input
                id="llm-prompt-role"
                value={roleTitle}
                onChange={(event) => setRoleTitle(event.target.value)}
                autoComplete="off"
              />
              <FieldDescription>
                Used as the roadmap title in the generated JSON.
              </FieldDescription>
            </Field>
            <Field>
              <FieldLabel htmlFor="llm-prompt-extra">Extra guidance</FieldLabel>
              <Textarea
                id="llm-prompt-extra"
                value={extraGuidance}
                onChange={(event) => setExtraGuidance(event.target.value)}
                placeholder="Optional: seniority, stack, industry, or topics to emphasize"
              />
            </Field>
          </FieldGroup>
        </CardContent>
        <CardFooter>
          <Button type="button" variant="outline" onClick={handleGenerate}>
            Generate prompt
          </Button>
        </CardFooter>
      </Card>

      <Dialog
        open={open}
        onOpenChange={(next) => {
          setOpen(next)
          if (!next) {
            setCopied(false)
          }
        }}
      >
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>LLM prompt</DialogTitle>
            <DialogDescription>
              Paste this into ChatGPT, Claude, or another assistant. Import the JSON
              it returns into an empty role.
            </DialogDescription>
          </DialogHeader>
          <Textarea
            readOnly
            value={prompt}
            className="max-h-80 min-h-48 overflow-y-auto font-mono text-xs"
            aria-label="Generated LLM prompt"
          />
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Close
            </Button>
            <Button type="button" onClick={() => void copyPrompt()}>
              {copied ? (
                <CheckIcon data-icon="inline-start" />
              ) : (
                <CopyIcon data-icon="inline-start" />
              )}
              {copied ? "Copied" : "Copy prompt"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
