"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { ArrowLeft } from "lucide-react"
import { toast } from "sonner"

import { deleteJobAction } from "@/application/jobs/actions"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ConfirmDeleteAlert } from "@/components/ui/confirm-delete-alert"
import { useRolesUi } from "@/components/roles/roles-workspace"
import type { Job } from "@/domain/jobs/types"
import { formatJobPostedDate, resolvePostedAt } from "@/lib/jobs/relative-posted-at"

function SectionList({ title, items }: { title: string; items: string[] }) {
  if (items.length === 0) {
    return null
  }
  return (
    <section className="flex flex-col gap-2">
      <h2 className="text-sm font-medium">{title}</h2>
      <ul className="list-disc space-y-1 pl-5 text-sm text-muted-foreground">
        {items.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    </section>
  )
}

export function JobDetail({ job }: { job: Job }) {
  const router = useRouter()
  const { beginNavigation } = useRolesUi()
  const [deleteOpen, setDeleteOpen] = useState(false)
  const listHref = `/dashboard/roles/${job.roleId}/jobs`
  const posted = formatJobPostedDate(
    resolvePostedAt({
      postedAt: job.postedAt,
      postedRelative: job.postedRelative,
      capturedAt: job.capturedAt,
    })
  )

  async function handleDelete() {
    const result = await deleteJobAction(job.roleId, job.id)
    if (!result.ok) {
      toast.error(result.message)
      return
    }
    toast.success("Job deleted.")
    beginNavigation(listHref)
    router.push(listHref)
  }

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6">
      <div className="flex items-center justify-between gap-3">
        <Button
          variant="outline"
          size="sm"
          render={
            <Link
              href={listHref}
              prefetch
              onClick={() => beginNavigation(listHref)}
            />
          }
        >
          <ArrowLeft data-icon="inline-start" />
          Back to jobs
        </Button>
        <Button
          type="button"
          variant="destructive"
          onClick={() => setDeleteOpen(true)}
        >
          Delete
        </Button>
      </div>
      <div className="flex flex-col gap-1">
        <h1 className="font-heading text-lg font-medium">{job.roleTitle}</h1>
        <p className="text-sm text-muted-foreground">
          {job.companyName}
          {job.location ? ` · ${job.location}` : ""}
        </p>
      </div>

      <div className="flex flex-wrap gap-1.5">
        {job.employmentType ? (
          <Badge variant="secondary">{job.employmentType}</Badge>
        ) : null}
        {job.seniorityLevel ? (
          <Badge variant="outline">{job.seniorityLevel}</Badge>
        ) : null}
        {posted ? <Badge variant="outline">{posted}</Badge> : null}
        {job.applicantCount != null ? (
          <Badge variant="outline">{job.applicantCount} applicants</Badge>
        ) : null}
      </div>

      {job.sourceUrl ? (
        <p className="text-sm">
          <a
            href={job.sourceUrl}
            target="_blank"
            rel="noreferrer"
            className="text-primary underline-offset-4 hover:underline"
          >
            Open original posting
          </a>
        </p>
      ) : null}

      {job.salaryText ? (
        <p className="text-sm">{job.salaryText}</p>
      ) : null}

      {job.jobFunctions.length > 0 ? (
        <p className="text-sm text-muted-foreground">
          Functions: {job.jobFunctions.join(", ")}
        </p>
      ) : null}
      {job.industries.length > 0 ? (
        <p className="text-sm text-muted-foreground">
          Industries: {job.industries.join(", ")}
        </p>
      ) : null}

      <SectionList
        title="Minimum qualifications"
        items={job.sections.minimumQualifications}
      />
      <SectionList
        title="Preferred qualifications"
        items={job.sections.preferredQualifications}
      />
      <SectionList title="Responsibilities" items={job.sections.responsibilities} />
      <SectionList title="Skills" items={job.sections.skills} />

      {job.extras.travel ? (
        <p className="text-sm">Travel: {job.extras.travel}</p>
      ) : null}

      <section className="flex flex-col gap-2">
        <h2 className="text-sm font-medium">Description</h2>
        <p className="whitespace-pre-wrap text-sm text-muted-foreground">
          {job.description}
        </p>
      </section>

      <ConfirmDeleteAlert
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title="Delete this job?"
        description="This removes the saved posting from this role. This cannot be undone."
        onConfirm={handleDelete}
      />
    </div>
  )
}
