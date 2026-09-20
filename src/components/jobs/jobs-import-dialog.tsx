"use client"

import { useEffect, useState } from "react"
import { CalendarIcon, Plus, Trash2 } from "lucide-react"
import { toast } from "sonner"
import { cn } from "cn"

import {
  extractJobAction,
  saveJobAction,
} from "@/application/jobs/actions"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
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
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { Spinner } from "@/components/ui/spinner"
import { Textarea } from "@/components/ui/textarea"
import { SkillChipInput } from "@/components/jobs/skill-chips"
import type { Job } from "@/domain/jobs/types"
import {
  emptyExtractedJob,
  type ExtractedJob,
} from "@/lib/jobs/extracted-job"
import { extractedJobFromSaved } from "@/lib/jobs/from-saved-job"
import {
  formatJobPostedDate,
  resolvePostedAt,
} from "@/lib/jobs/relative-posted-at"
import {
  findSavedJobForSource,
  formatJobMatchLine,
  looksLikeSamePosting,
} from "@/lib/jobs/find-saved-job"

function dateFromIso(iso: string | null) {
  if (!iso) {
    return undefined
  }
  const [year, month, day] = iso.split("-").map(Number)
  if (!year || !month || !day) {
    return undefined
  }
  return new Date(year, month - 1, day)
}

function isoFromLocalDate(date: Date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, "0")
  const day = String(date.getDate()).padStart(2, "0")
  return `${year}-${month}-${day}`
}

function PostedDateField({
  isoDate,
  disabled,
  onChange,
}: {
  isoDate: string | null
  disabled?: boolean
  onChange: (isoDate: string | null) => void
}) {
  const [open, setOpen] = useState(false)
  const selected = dateFromIso(isoDate)
  const formatted = formatJobPostedDate(isoDate)

  return (
    <Field>
      <FieldLabel htmlFor="job-posted">Posted</FieldLabel>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger
          render={
            <Button
              id="job-posted"
              type="button"
              variant="outline"
              disabled={disabled}
              className={cn(
                "w-full justify-start",
                !formatted && "text-muted-foreground"
              )}
            />
          }
        >
          <CalendarIcon data-icon="inline-start" />
          {formatted ?? "Pick a date"}
        </PopoverTrigger>
        <PopoverContent align="start" className="w-auto p-0">
          <Calendar
            mode="single"
            selected={selected}
            defaultMonth={selected}
            captionLayout="dropdown"
            onSelect={(date) => {
              onChange(date ? isoFromLocalDate(date) : null)
              setOpen(false)
            }}
          />
        </PopoverContent>
      </Popover>
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
  function updateAt(index: number, value: string) {
    const next = [...values]
    next[index] = value
    onChange(next)
  }

  function removeAt(index: number) {
    onChange(values.filter((_, itemIndex) => itemIndex !== index))
  }

  function addItem() {
    onChange([...values, ""])
  }

  return (
    <Field>
      <FieldLabel>{label}</FieldLabel>
      {values.length > 0 ? (
        <div className="overflow-hidden rounded-lg border bg-transparent dark:bg-input/30">
          <ol className="flex flex-col divide-y">
            {values.map((item, index) => (
              <li
                key={`${label}-${index}`}
                className="group/item flex items-start"
              >
                <span
                  aria-hidden
                  className="w-8 shrink-0 pt-2.5 text-center text-xs tabular-nums text-muted-foreground"
                >
                  {index + 1}
                </span>
                <Textarea
                  value={item}
                  rows={1}
                  disabled={disabled}
                  placeholder="Write this item…"
                  className="min-h-8 flex-1 resize-none rounded-none border-0 bg-transparent px-1 py-2 shadow-none focus-visible:ring-0 dark:bg-transparent"
                  onChange={(event) => updateAt(index, event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" && !event.shiftKey) {
                      event.preventDefault()
                      if (index === values.length - 1) {
                        addItem()
                      }
                    }
                    if (
                      event.key === "Backspace" &&
                      item.length === 0 &&
                      values.length > 0
                    ) {
                      event.preventDefault()
                      removeAt(index)
                    }
                  }}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  disabled={disabled}
                  className="mt-1 mr-1 opacity-0 group-hover/item:opacity-100 group-focus-within/item:opacity-100"
                  aria-label={`Remove ${label} item ${index + 1}`}
                  onClick={() => removeAt(index)}
                >
                  <Trash2 />
                </Button>
              </li>
            ))}
          </ol>
        </div>
      ) : null}
      <div className="flex justify-end">
        <Button
          type="button"
          size="sm"
          disabled={disabled}
          onClick={addItem}
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
  jobs,
  open,
  onOpenChange,
  canUseAi,
  onSaved,
  editingJob = null,
}: {
  roleId: string
  jobs: Job[]
  open: boolean
  onOpenChange: (open: boolean) => void
  canUseAi: boolean
  onSaved: (job: Job) => void
  editingJob?: Job | null
}) {
  const [sourceUrl, setSourceUrl] = useState("")
  const [paste, setPaste] = useState("")
  const [preview, setPreview] = useState<ExtractedJob | null>(null)
  const [warnings, setWarnings] = useState<string[]>([])
  const [fetchFailed, setFetchFailed] = useState<string | null>(null)
  const [replaceWithAi, setReplaceWithAi] = useState(true)
  const [pending, setPending] = useState<"rules" | "ai" | "save" | null>(null)

  useEffect(() => {
    if (open) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setSourceUrl(editingJob?.sourceUrl ?? "")
      setPaste("")
      setPreview(editingJob ? extractedJobFromSaved(editingJob) : null)
      setWarnings([])
      setFetchFailed(null)
      setReplaceWithAi(true)
      setPending(null)
    }
  }, [open, editingJob])

  function requestClose() {
    if (pending) {
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

  const existing = findSavedJobForSource(jobs, {
    sourceUrl: sourceUrl.trim() || preview?.sourceUrl,
    externalId: preview?.externalId,
  })
  const likelySame =
    preview && existing
      ? looksLikeSamePosting(existing, preview)
      : existing != null

  async function save(mode: "new" | "update") {
    if (!preview) {
      return
    }
    setPending("save")
    const payload = {
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
    }
    const result = await saveJobAction(roleId, payload, {
      replaceJobId:
        mode === "update" ? (editingJob?.id ?? existing?.id) : null,
      saveAsNew: mode === "new" && Boolean(existing || editingJob),
    })
    setPending(null)
    if (!result.ok) {
      toast.error(result.message)
      return
    }
    onOpenChange(false)
    onSaved(result.job)
    toast.success(result.updated ? "Job updated." : "Job saved.")
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
            <DialogTitle>{editingJob ? "Update job" : "Add job"}</DialogTitle>
            <DialogDescription>
              {editingJob
                ? "Edit the saved posting, or extract again from the LinkedIn URL or page source."
                : "Paste LinkedIn View page source, or the job text. A job URL is optional and often blocked from the server."}
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
                {pending === "rules" ? (
                  <Spinner data-icon="inline-start" />
                ) : null}
                Extract
              </Button>
              <Button
                type="button"
                variant="outline"
                disabled={
                  busy || !canUseAi || (!paste.trim() && !sourceUrl.trim())
                }
                onClick={() => void extract("ai")}
              >
                {pending === "ai" ? (
                  <Spinner data-icon="inline-start" />
                ) : null}
                Extract with AI
              </Button>
            </div>
            {!canUseAi ? (
              <p className="text-xs text-muted-foreground">
                AI extraction needs Track enabled with an API key in User
                settings.
              </p>
            ) : (
              <div className="flex items-center gap-2">
                <Checkbox
                  id="job-ai-overwrite"
                  checked={replaceWithAi}
                  onCheckedChange={(checked) =>
                    setReplaceWithAi(checked === true)
                  }
                  disabled={busy}
                />
                <FieldLabel htmlFor="job-ai-overwrite" className="font-normal">
                  Overwrite fields already found when using AI
                </FieldLabel>
              </div>
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
            {existing && existing.id !== editingJob?.id ? (
              <Alert>
                <AlertTitle>This link is already saved</AlertTitle>
                <AlertDescription>
                  <p>
                    Saved posting: {formatJobMatchLine(existing)}. This does
                    not block you. LinkedIn can reuse a job URL, so check
                    whether this is the same posting before updating.
                  </p>
                  {preview ? (
                    <p>
                      This extraction: {formatJobMatchLine(preview)}
                      {likelySame
                        ? " Title and company match the saved job."
                        : " Title or company differs from the saved job."}
                    </p>
                  ) : null}
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
                <SkillChipInput
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
            {(existing || editingJob) && preview ? (
              <>
                <Button
                  type="button"
                  variant="outline"
                  disabled={busy}
                  onClick={() => void save("new")}
                >
                  {pending === "save" ? (
                    <Spinner data-icon="inline-start" />
                  ) : null}
                  Save as new
                </Button>
                <Button
                  type="button"
                  disabled={busy}
                  onClick={() => void save("update")}
                >
                  {pending === "save" ? (
                    <Spinner data-icon="inline-start" />
                  ) : null}
                  {editingJob && (!existing || existing.id === editingJob.id)
                    ? "Save changes"
                    : "Update existing"}
                </Button>
              </>
            ) : (
              <Button
                type="button"
                disabled={busy || !preview}
                onClick={() => void save("new")}
              >
                {pending === "save" ? (
                  <Spinner data-icon="inline-start" />
                ) : null}
                Save job
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
  )
}
