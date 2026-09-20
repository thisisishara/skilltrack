"use client"

import Link from "next/link"
import { useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import {
  Briefcase,
  ChevronDown,
  Eye,
  Pencil,
  Plus,
  Search,
  Trash2,
  X,
} from "lucide-react"
import { toast } from "sonner"

import { deleteJobAction } from "@/application/jobs/actions"
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
import { ConfirmDeleteAlert } from "@/components/ui/confirm-delete-alert"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty"
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from "@/components/ui/input-group"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useRolesUi } from "@/components/roles/roles-workspace"
import type { Job } from "@/domain/jobs/types"
import type { WorkplaceType } from "@/lib/jobs/extracted-job"
import {
  emptyJobListFilters,
  filterJobs,
  hasActiveJobFilters,
  jobFilterOptions,
  sortJobs,
  type JobListFilters,
  type JobPostedWindow,
  type JobSort,
} from "@/lib/jobs/filter-jobs"
import { formatJobPostedDate, resolvePostedAt } from "@/lib/jobs/relative-posted-at"

const WORKPLACE_LABELS: Record<Exclude<WorkplaceType, "unknown">, string> = {
  on_site: "On-site",
  hybrid: "Hybrid",
  remote: "Remote",
}

function FilterSelect({
  value,
  allLabel,
  placeholder,
  options,
  labels,
  onChange,
}: {
  value: string
  allLabel: string
  placeholder: string
  options: string[]
  labels?: Record<string, string>
  onChange: (value: string) => void
}) {
  if (options.length === 0) {
    return null
  }
  const labelFor = (item: string) =>
    item === "all" ? allLabel : (labels?.[item] ?? item)

  return (
    <Select
      value={value}
      itemToStringLabel={labelFor}
      onValueChange={(next) => {
        if (typeof next === "string") {
          onChange(next)
        }
      }}
    >
      <SelectTrigger size="sm" className="w-full sm:w-40">
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        <SelectGroup>
          <SelectItem value="all">{allLabel}</SelectItem>
          {options.map((option) => (
            <SelectItem key={option} value={option}>
              {labelFor(option)}
            </SelectItem>
          ))}
        </SelectGroup>
      </SelectContent>
    </Select>
  )
}

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
  const [editingJob, setEditingJob] = useState<Job | null>(null)
  const [deleteJob, setDeleteJob] = useState<Job | null>(null)
  const [filters, setFilters] = useState<JobListFilters>(emptyJobListFilters)
  const [sort, setSort] = useState<JobSort>("posted")

  const options = useMemo(() => jobFilterOptions(jobs), [jobs])
  const visible = useMemo(
    () => sortJobs(filterJobs(jobs, filters), sort, filters.query),
    [jobs, filters, sort]
  )
  const filtersActive = hasActiveJobFilters(filters)

  function patchFilters(patch: Partial<JobListFilters>) {
    setFilters((current) => ({ ...current, ...patch }))
  }

  function openAdd() {
    setEditingJob(null)
    setImportOpen(true)
  }

  function openEdit(job: Job) {
    setEditingJob(job)
    setImportOpen(true)
  }

  async function handleDelete() {
    if (!deleteJob) {
      return
    }
    const result = await deleteJobAction(roleId, deleteJob.id)
    if (!result.ok) {
      toast.error(result.message)
      return
    }
    toast.success("Job deleted.")
  }

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-6">
      <div className="flex items-start justify-between gap-3">
        <div className="flex flex-col gap-1">
          <h1 className="font-heading text-lg font-medium">Jobs</h1>
          <p className="text-sm text-muted-foreground">
            Save LinkedIn postings for this role. Paste page source when a URL
            cannot be fetched.
          </p>
        </div>
        <Button type="button" onClick={openAdd}>
          <Plus />
          Add job
        </Button>
      </div>

      {jobs.length === 0 ? (
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
            <Button type="button" onClick={openAdd}>
              <Plus />
              Add job
            </Button>
          </EmptyContent>
        </Empty>
      ) : (
        <div className="flex flex-col gap-3">
        <div className="flex flex-col gap-2">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <InputGroup className="min-w-0 flex-1">
              <InputGroupAddon>
                <Search />
              </InputGroupAddon>
              <InputGroupInput
                value={filters.query}
                onChange={(event) => patchFilters({ query: event.target.value })}
                placeholder="Search titles, companies, locations, skills…"
              />
              {filters.query ? (
                <InputGroupAddon align="inline-end">
                  <InputGroupButton
                    aria-label="Clear search"
                    onClick={() => patchFilters({ query: "" })}
                  >
                    <X />
                  </InputGroupButton>
                </InputGroupAddon>
              ) : null}
            </InputGroup>
            <Select
              value={sort}
              itemToStringLabel={(value) =>
                value === "posted"
                  ? "Newest posted"
                  : value === "saved"
                    ? "Newest saved"
                    : value === "company"
                      ? "Company"
                      : "Title"
              }
              onValueChange={(value) => {
                if (
                  value === "posted" ||
                  value === "saved" ||
                  value === "company" ||
                  value === "title"
                ) {
                  setSort(value)
                }
              }}
            >
              <SelectTrigger size="sm" className="w-full sm:w-40">
                <SelectValue placeholder="Sort" />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectItem value="posted">Newest posted</SelectItem>
                  <SelectItem value="saved">Newest saved</SelectItem>
                  <SelectItem value="company">Company</SelectItem>
                  <SelectItem value="title">Title</SelectItem>
                </SelectGroup>
              </SelectContent>
            </Select>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
              <FilterSelect
                value={filters.company}
                allLabel="All companies"
                placeholder="Company"
                options={options.companies}
                onChange={(company) => patchFilters({ company })}
              />
              <FilterSelect
                value={filters.location}
                allLabel="All locations"
                placeholder="Location"
                options={options.locations}
                onChange={(location) => patchFilters({ location })}
              />
              <FilterSelect
                value={filters.employmentType}
                allLabel="All types"
                placeholder="Type"
                options={options.employmentTypes}
                onChange={(employmentType) => patchFilters({ employmentType })}
              />
              <FilterSelect
                value={filters.seniority}
                allLabel="All seniority"
                placeholder="Seniority"
                options={options.seniorities}
                onChange={(seniority) => patchFilters({ seniority })}
              />
              <FilterSelect
                value={filters.workplace}
                allLabel="All workplaces"
                placeholder="Workplace"
                options={options.workplaces}
                labels={WORKPLACE_LABELS}
                onChange={(workplace) =>
                  patchFilters({
                    workplace: workplace as JobListFilters["workplace"],
                  })
                }
              />
              <FilterSelect
                value={filters.skill}
                allLabel="All skills"
                placeholder="Skill"
                options={options.skills}
                onChange={(skill) => patchFilters({ skill })}
              />
              <FilterSelect
                value={filters.posted}
                allLabel="Any time"
                placeholder="Posted"
                options={["7", "30", "90"]}
                labels={{
                  "7": "Posted last 7 days",
                  "30": "Posted last 30 days",
                  "90": "Posted last 90 days",
                }}
                onChange={(posted) =>
                  patchFilters({ posted: posted as JobPostedWindow })
                }
              />
            </div>
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs text-muted-foreground">
                {visible.length === jobs.length
                  ? `${jobs.length} job${jobs.length === 1 ? "" : "s"}`
                  : `${visible.length} of ${jobs.length} jobs`}
              </p>
              {filtersActive ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="xs"
                  onClick={() => setFilters(emptyJobListFilters)}
                >
                  Clear filters
                </Button>
              ) : null}
            </div>
          </div>

          {visible.length === 0 ? (
            <Empty className="border">
              <EmptyHeader>
                <EmptyTitle>No matching jobs</EmptyTitle>
                <EmptyDescription>
                  Try a different search or clear the filters.
                </EmptyDescription>
              </EmptyHeader>
            </Empty>
          ) : (
            <ul className="flex flex-col gap-3">
              {visible.map((job) => {
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
                          <div className="flex">
                            <Button
                              variant="outline"
                              size="sm"
                              className="rounded-r-none"
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
                            <DropdownMenu>
                              <DropdownMenuTrigger
                                render={
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="rounded-l-none border-l-0 px-1.5"
                                    aria-label="More job actions"
                                  />
                                }
                              >
                                <ChevronDown />
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="min-w-40">
                                <DropdownMenuGroup>
                                  <DropdownMenuItem
                                    onClick={() => openEdit(job)}
                                  >
                                    <Pencil />
                                    Update
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    variant="destructive"
                                    onClick={() => setDeleteJob(job)}
                                  >
                                    <Trash2 />
                                    Delete
                                  </DropdownMenuItem>
                                </DropdownMenuGroup>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </CardAction>
                      </CardHeader>
                      <CardContent className="flex flex-wrap items-center gap-1.5">
                        {job.employmentType ? (
                          <Badge variant="secondary">
                            {job.employmentType}
                          </Badge>
                        ) : null}
                        {posted ? (
                          <Badge variant="outline">{posted}</Badge>
                        ) : null}
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
        </div>
      )}

      <JobsImportDialog
        roleId={roleId}
        jobs={jobs}
        editingJob={editingJob}
        open={importOpen}
        onOpenChange={(open) => {
          setImportOpen(open)
          if (!open) {
            setEditingJob(null)
          }
        }}
        canUseAi={canUseAi}
        onSaved={(job) => {
          const href = `/dashboard/roles/${roleId}/jobs/${job.id}`
          beginNavigation(href)
          router.push(href)
        }}
      />
      <ConfirmDeleteAlert
        open={deleteJob != null}
        onOpenChange={(open) => {
          if (!open) {
            setDeleteJob(null)
          }
        }}
        title="Delete this job?"
        description="This removes the saved posting from this role. This cannot be undone."
        onConfirm={handleDelete}
      />
    </div>
  )
}
