"use client"

import Link from "next/link"
import { useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { Briefcase, Eye, Plus } from "lucide-react"
import { toast } from "sonner"

import { JobsImportDialog } from "@/components/jobs/jobs-import-dialog"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty"
import { useRolesUi } from "@/components/roles/roles-workspace"
import type { Job } from "@/domain/jobs/types"
import { formatJobPostedDate, resolvePostedAt } from "@/lib/jobs/relative-posted-at"

export function JobsWorkspace({
  roleId,
  jobs,
  canUseAi,
}: {
  roleId: string
  jobs: Job[]
  canUseAi: boolean
}) {
  const router = useRouter()
  const { beginNavigation } = useRolesUi()
  const [importOpen, setImportOpen] = useState(false)
  const sorted = useMemo(() => jobs, [jobs])

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6">
      <div className="flex items-start justify-between gap-3">
        <div className="flex flex-col gap-1">
          <h1 className="font-heading text-lg font-medium">Jobs</h1>
          <p className="text-sm text-muted-foreground">
            Save LinkedIn postings for this role. Paste page source when a URL
            cannot be fetched.
          </p>
        </div>
        <Button type="button" onClick={() => setImportOpen(true)}>
          <Plus />
          Add job
        </Button>
      </div>

      {sorted.length === 0 ? (
        <Empty className="border">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <Briefcase />
            </EmptyMedia>
            <EmptyTitle>No jobs yet</EmptyTitle>
            <EmptyDescription>
              Import a LinkedIn job URL or paste the page source to extract
              title, company, qualifications, and more.
            </EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <Button type="button" onClick={() => setImportOpen(true)}>
              <Plus />
              Add job
            </Button>
          </EmptyContent>
        </Empty>
      ) : (
        <ul className="flex flex-col gap-3">
          {sorted.map((job) => {
            const href = `/dashboard/roles/${roleId}/jobs/${job.id}`
            const posted = formatJobPostedDate(
              resolvePostedAt({
                postedAt: job.postedAt,
                postedRelative: job.postedRelative,
                capturedAt: job.capturedAt,
              })
            )
            return (
              <li key={job.id}>
                <Card size="sm">
                  <CardHeader>
                    <CardTitle>
                      <Link
                        href={href}
                        prefetch
                        className="hover:underline"
                        onClick={() => beginNavigation(href)}
                      >
                        {job.roleTitle}
                      </Link>
                    </CardTitle>
                    <CardDescription>
                      {job.companyName}
                      {job.location ? ` · ${job.location}` : ""}
                    </CardDescription>
                    <CardAction>
                      <Button
                        variant="outline"
                        size="sm"
                        render={
                          <Link
                            href={href}
                            prefetch
                            onClick={() => beginNavigation(href)}
                          />
                        }
                      >
                        <Eye data-icon="inline-start" />
                        View
                      </Button>
                    </CardAction>
                  </CardHeader>
                  <CardContent className="flex flex-wrap items-center gap-1.5">
                    {job.employmentType ? (
                      <Badge variant="secondary">{job.employmentType}</Badge>
                    ) : null}
                    {posted ? <Badge variant="outline">{posted}</Badge> : null}
                    {job.salaryText ? (
                      <Badge variant="outline">{job.salaryText}</Badge>
                    ) : null}
                  </CardContent>
                </Card>
              </li>
            )
          })}
        </ul>
      )}

      <JobsImportDialog
        roleId={roleId}
        open={importOpen}
        onOpenChange={setImportOpen}
        canUseAi={canUseAi}
        onSaved={(job) => {
          const href = `/dashboard/roles/${roleId}/jobs/${job.id}`
          beginNavigation(href)
          router.push(href)
          toast.success("Job saved.")
        }}
      />
    </div>
  )
}
