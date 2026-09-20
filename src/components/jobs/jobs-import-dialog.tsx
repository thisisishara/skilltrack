"use client"

import { useEffect, useState } from "react"
import { Plus, Trash2 } from "lucide-react"
import { toast } from "sonner"

import {
  extractJobAction,
  saveJobAction,
} from "@/application/jobs/actions"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
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
import type { Job } from "@/domain/jobs/types"
import {
  emptyExtractedJob,
  type ExtractedJob,
} from "@/lib/jobs/extracted-job"
import {
  formatJobPostedDate,
  parseJobPostedDate,
  resolvePostedAt,
} from "@/lib/jobs/relative-posted-at"

function PostedDateField({
  isoDate,
  disabled,
  onChange,
}: {
  isoDate: string | null
  disabled?: boolean
  onChange: (isoDate: string | null) => void
}) {
  const formatted = formatJobPostedDate(isoDate) ?? ""
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(formatted)

  return (
    <Field>
      <FieldLabel htmlFor="job-posted">Posted</FieldLabel>
      <Input
        id="job-posted"
        value={editing ? draft : formatted}
        placeholder="20 Aug 2026"
        disabled={disabled}
        onFocus={() => {
          setEditing(true)
          setDraft(formatted)
        }}
        onChange={(event) => {
          const next = event.target.value
          setDraft(next)
          if (!next.trim()) {
            onChange(null)
            return
          }
          const parsed = parseJobPostedDate(next)
          if (parsed) {
            onChange(parsed)
          }
        }}
        onBlur={() => {
          setEditing(false)
          if (!draft.trim()) {
            onChange(null)
            setDraft("")
            return
          }
          const parsed = parseJobPostedDate(draft)
          if (parsed) {
            onChange(parsed)
            setDraft(formatJobPostedDate(parsed) ?? "")
            return
          }
          setDraft(formatted)
        }}
      />
      <FieldDescription>Use DD Mon YYYY, for example 20 Aug 2026.</FieldDescription>
    </Field>
  )
}

function compactList(values: string[]) {
  return values.map((value) => value.trim()).filter(Boolean)
}

function EditableStringList({
  label,
  values,
  disabled,
  addLabel,
  onChange,
}: {
  label: string
  values: string[]
  disabled?: boolean
  addLabel: string
  onChange: (values: string[]) => void
}) {
  return (
    <Field>
      <FieldLabel>{label}</FieldLabel>
      {values.length > 0 ? (
        <ul className="flex flex-col gap-2">
          {values.map((item, index) => (
            <li key={`${label}-${index}`} className="flex items-start gap-2">
              <span
                aria-hidden
                className="mt-3 size-1.5 shrink-0 rounded-full bg-muted-foreground"
              />
              <Textarea
                value={item}
                rows={2}
                className="min-h-16 flex-1"
                disabled={disabled}
                onChange={(event) => {
                  const next = [...values]
                  next[index] = event.target.value
                  onChange(next)
                }}
              />
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                disabled={disabled}
                aria-label={`Remove ${label} item ${index + 1}`}
                onClick={() =>
                  onChange(values.filter((_, itemIndex) => itemIndex !== index))
                }
              >
                <Trash2 />
              </Button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-muted-foreground">No items yet.</p>
      )}
      <div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={disabled}
          onClick={() => onChange([...values, ""])}
        >
          <Plus data-icon="inline-start" />
          {addLabel}
        </Button>
      </div>
    </Field>
  )
}

export function JobsImportDialog({
  roleId,
  open,
  onOpenChange,
  canUseAi,
  onSaved,
}: {
  roleId: string
  open: boolean
  onOpenChange: (open: boolean) => void
  canUseAi: boolean
  onSaved: (job: Job) => void
}) {
  const [sourceUrl, setSourceUrl] = useState("")
  const [paste, setPaste] = useState("")
  const [preview, setPreview] = useState<ExtractedJob | null>(null)
  const [warnings, setWarnings] = useState<string[]>([])
  const [fetchFailed, setFetchFailed] = useState<string | null>(null)
  const [replaceWithAi, setReplaceWithAi] = useState(true)
  const [pending, setPending] = useState<"rules" | "ai" | "save" | null>(null)
  const [discardOpen, setDiscardOpen] = useState(false)

  useEffect(() => {
    if (open) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setSourceUrl("")
      setPaste("")
      setPreview(null)
      setWarnings([])
      setFetchFailed(null)
      setReplaceWithAi(true)
      setPending(null)
      setDiscardOpen(false)
    }
  }, [open])

  const dirty = Boolean(
    sourceUrl.trim() || paste.trim() || preview || pending
  )

  function requestClose() {
    if (pending) {
      return
    }
    if (dirty) {
      setDiscardOpen(true)
      return
    }
    onOpenChange(false)
  }

  async function extract(method: "rules" | "ai") {
    setPending(method)
    const result = await extractJobAction({
      paste,
      sourceUrl: sourceUrl.trim() || null,
      method,
      mergeMode: replaceWithAi ? "replace" : "fill",
      fetchIfEmpty: !paste.trim() && Boolean(sourceUrl.trim()),
    })
    setPending(null)
    if (!result.ok) {
      toast.error(result.message)
      return
    }
    setPreview(result.job)
    setWarnings(result.job.warnings)
    setFetchFailed(result.fetchFailed)
    if (result.fetchFailed) {
      toast.message(result.fetchFailed)
    }
  }

  async function save() {
    if (!preview) {
      return
    }
    setPending("save")
    const result = await saveJobAction(roleId, {
      ...preview,
      sections: {
        ...preview.sections,
        minimumQualifications: compactList(
          preview.sections.minimumQualifications
        ),
        preferredQualifications: compactList(
          preview.sections.preferredQualifications
        ),
        responsibilities: compactList(preview.sections.responsibilities),
        skills: compactList(preview.sections.skills),
      },
    })
    setPending(null)
    if (!result.ok) {
      toast.error(result.message)
      return
    }
    onOpenChange(false)
    onSaved(result.job)
  }

  const busy = pending !== null
  const job = preview ?? emptyExtractedJob(new Date().toISOString())

  function patch(update: Partial<ExtractedJob>) {
    setPreview({
      ...(preview ?? job),
      ...update,
      extractionMethod: preview?.extractionMethod ?? "manual",
    })
  }

  return (
    <>
      <Dialog
        form
        open={open}
        onOpenChange={(next) => {
          if (!next) {
            requestClose()
            return
          }
          onOpenChange(true)
        }}
      >
        <DialogContent className="flex h-[min(90dvh,40rem)] w-full flex-col gap-4 overflow-hidden sm:max-w-4xl">
          <DialogHeader className="shrink-0">
            <DialogTitle>Add job</DialogTitle>
            <DialogDescription>
              Paste LinkedIn View page source, or the job text. A job URL is
              optional and often blocked from the server.
            </DialogDescription>
          </DialogHeader>
          <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto pr-1">
            <FieldGroup className="min-w-0">
              <Field>
                <FieldLabel htmlFor="job-url">LinkedIn job URL</FieldLabel>
                <Input
                  id="job-url"
                  value={sourceUrl}
                  onChange={(event) => setSourceUrl(event.target.value)}
                  placeholder="https://www.linkedin.com/jobs/view/…"
                  disabled={busy}
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="job-paste">Page source or job text</FieldLabel>
                <Textarea
                  id="job-paste"
                  value={paste}
                  onChange={(event) => setPaste(event.target.value)}
                  placeholder="Paste the HTML from View page source, or the visible job description."
                  className="min-h-32 font-mono text-xs"
                  disabled={busy}
                />
                <FieldDescription>
                  Right-click the LinkedIn job page → View page source → copy all.
                </FieldDescription>
              </Field>
            </FieldGroup>
            <div className="flex flex-wrap items-center gap-2">
              <Button
                type="button"
                variant="secondary"
                disabled={busy || (!paste.trim() && !sourceUrl.trim())}
                onClick={() => void extract("rules")}
              >
                {pending === "rules" ? "Extracting…" : "Extract"}
              </Button>
              <Button
                type="button"
                variant="outline"
                disabled={
                  busy || !canUseAi || (!paste.trim() && !sourceUrl.trim())
                }
                onClick={() => void extract("ai")}
              >
                {pending === "ai" ? "Extracting with AI…" : "Extract with AI"}
              </Button>
            </div>
            {!canUseAi ? (
              <p className="text-xs text-muted-foreground">
                AI extraction needs Track enabled with an API key in User
                settings.
              </p>
            ) : (
              <label className="flex items-center gap-2 text-sm">
                <Checkbox
                  checked={replaceWithAi}
                  onCheckedChange={(checked) =>
                    setReplaceWithAi(checked === true)
                  }
                  disabled={busy}
                />
                Overwrite fields already found when using AI
              </label>
            )}
            {fetchFailed ? (
              <Alert>
                <AlertTitle>Could not fetch the URL</AlertTitle>
                <AlertDescription>{fetchFailed}</AlertDescription>
              </Alert>
            ) : null}
            {warnings.length > 0 ? (
              <Alert>
                <AlertTitle>Review this extraction</AlertTitle>
                <AlertDescription>
                  <ul className="list-disc pl-4">
                    {warnings.map((warning) => (
                      <li key={warning}>{warning}</li>
                    ))}
                  </ul>
                </AlertDescription>
              </Alert>
            ) : null}
            {preview ? (
              <FieldGroup className="min-w-0">
                <Field>
                  <FieldLabel htmlFor="job-title">Job title</FieldLabel>
                  <Input
                    id="job-title"
                    value={job.roleTitle}
                    onChange={(event) => patch({ roleTitle: event.target.value })}
                    disabled={busy}
                  />
                </Field>
                <Field>
                  <FieldLabel htmlFor="job-company">Company</FieldLabel>
                  <Input
                    id="job-company"
                    value={job.companyName}
                    onChange={(event) =>
                      patch({ companyName: event.target.value })
                    }
                    disabled={busy}
                  />
                </Field>
                <Field>
                  <FieldLabel htmlFor="job-location">Location</FieldLabel>
                  <Input
                    id="job-location"
                    value={job.location ?? ""}
                    onChange={(event) =>
                      patch({ location: event.target.value || null })
                    }
                    disabled={busy}
                  />
                </Field>
                <div className="grid grid-cols-2 gap-3">
                  <Field>
                    <FieldLabel htmlFor="job-seniority">Seniority</FieldLabel>
                    <Input
                      id="job-seniority"
                      value={job.seniorityLevel ?? ""}
                      onChange={(event) =>
                        patch({ seniorityLevel: event.target.value || null })
                      }
                      disabled={busy}
                    />
                  </Field>
                  <Field>
                    <FieldLabel htmlFor="job-type">Employment type</FieldLabel>
                    <Input
                      id="job-type"
                      value={job.employmentType ?? ""}
                      onChange={(event) =>
                        patch({ employmentType: event.target.value || null })
                      }
                      disabled={busy}
                    />
                  </Field>
                </div>
                <PostedDateField
                  isoDate={resolvePostedAt({
                    postedAt: job.postedAt,
                    postedRelative: job.postedRelative,
                    capturedAt: job.capturedAt,
                  })}
                  disabled={busy}
                  onChange={(postedAt) =>
                    patch({
                      postedAt,
                      postedAtPrecision: postedAt ? "exact" : "unknown",
                    })
                  }
                />
                <EditableStringList
                  label="Minimum qualifications"
                  addLabel="Add qualification"
                  values={job.sections.minimumQualifications}
                  disabled={busy}
                  onChange={(minimumQualifications) =>
                    patch({
                      sections: {
                        ...job.sections,
                        minimumQualifications,
                      },
                    })
                  }
                />
                <EditableStringList
                  label="Preferred qualifications"
                  addLabel="Add qualification"
                  values={job.sections.preferredQualifications}
                  disabled={busy}
                  onChange={(preferredQualifications) =>
                    patch({
                      sections: {
                        ...job.sections,
                        preferredQualifications,
                      },
                    })
                  }
                />
                <EditableStringList
                  label="Responsibilities"
                  addLabel="Add responsibility"
                  values={job.sections.responsibilities}
                  disabled={busy}
                  onChange={(responsibilities) =>
                    patch({
                      sections: {
                        ...job.sections,
                        responsibilities,
                      },
                    })
                  }
                />
                <EditableStringList
                  label="Skills"
                  addLabel="Add skill"
                  values={job.sections.skills}
                  disabled={busy}
                  onChange={(skills) =>
                    patch({
                      sections: {
                        ...job.sections,
                        skills,
                      },
                    })
                  }
                />
                <Field>
                  <FieldLabel htmlFor="job-desc">Description</FieldLabel>
                  <Textarea
                    id="job-desc"
                    value={job.description}
                    onChange={(event) =>
                      patch({ description: event.target.value })
                    }
                    className="min-h-32"
                    disabled={busy}
                  />
                </Field>
              </FieldGroup>
            ) : null}
          </div>
          <DialogFooter className="shrink-0">
            <Button type="button" variant="outline" onClick={requestClose}>
              Cancel
            </Button>
            <Button
              type="button"
              disabled={busy || !preview}
              onClick={() => void save()}
            >
              {pending === "save" ? "Saving…" : "Save job"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <AlertDialog open={discardOpen} onOpenChange={setDiscardOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Discard this job?</AlertDialogTitle>
            <AlertDialogDescription>
              What you entered will not be saved.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep editing</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                setDiscardOpen(false)
                onOpenChange(false)
              }}
            >
              Discard
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
