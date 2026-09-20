"use client"

import Link from "next/link"
import { useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import {
  Briefcase,
  ChevronDown,
  Eye,
  PanelRight,
  Pencil,
  Plus,
  Search,
  Trash2,
  X,
} from "lucide-react"
import { toast } from "sonner"

import { deleteJobAction } from "@/application/jobs/actions"
import { JobAnalysisRatingBadge } from "@/components/jobs/job-analysis-card"
import { JobsFiltersPanel } from "@/components/jobs/jobs-filters-panel"
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
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetTitle,
} from "@/components/ui/sheet"
import { useRolesUi } from "@/components/roles/roles-workspace"
import { useTrackWorkspace } from "@/components/track/track-workspace"
import type { Job } from "@/domain/jobs/types"
import { useDetailsPanelLayout } from "@/hooks/use-details-panel-layout"
import { useIsLgUp } from "@/hooks/use-mobile"
import {
  DETAILS_PANEL_MAX_SIZE,
  DETAILS_PANEL_MIN_SIZE,
} from "@/lib/layout/details-panel-storage"
import {
  emptyJobListFilters,
  filterJobs,
  hasActiveJobFilters,
  jobFilterOptions,
  sortJobs,
  type JobListFilters,
  type JobSort,
} from "@/lib/jobs/filter-jobs"
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
  const { userId, detailsPanelOpen, setDetailsPanelOpen } = useTrackWorkspace()
  const lgUp = useIsLgUp()
  const { groupKey, mainDefaultSize, detailsDefaultSize, onLayoutChanged } =
    useDetailsPanelLayout(userId)
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
  const filtersOpen = jobs.length > 0 && detailsPanelOpen

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

  const filtersPanel = (
    <JobsFiltersPanel
      filters={filters}
      options={options}
      filtersActive={filtersActive}
      showClose={!lgUp}
      onPatch={patchFilters}
      onClear={() => setFilters(emptyJobListFilters)}
      onClose={() => setDetailsPanelOpen(false)}
    />
  )

  const list = (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex shrink-0 flex-col gap-4 p-4 sm:p-6">
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

        {jobs.length > 0 ? (
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <InputGroup className="min-w-0 flex-1">
              <InputGroupAddon>
                <Search />
              </InputGroupAddon>
              <InputGroupInput
                value={filters.query}
                onChange={(event) =>
                  patchFilters({ query: event.target.value })
                }
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
            <div className="flex items-center gap-2">
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
              <Button
                type="button"
                variant={filtersOpen ? "secondary" : "outline"}
                size="sm"
                onClick={() => setDetailsPanelOpen(!detailsPanelOpen)}
              >
                <PanelRight data-icon="inline-start" />
                Filters
                {filtersActive ? (
                  <Badge variant="secondary" className="h-5 px-1.5">
                    On
                  </Badge>
                ) : null}
              </Button>
            </div>
          </div>
        ) : null}
      </div>

      <ScrollArea className="min-h-0 flex-1">
        <div className="flex flex-col gap-3 px-4 pb-6 sm:px-6">
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
          ) : visible.length === 0 ? (
            <Empty className="border">
              <EmptyHeader>
                <EmptyTitle>No matching jobs</EmptyTitle>
                <EmptyDescription>
                  Try a different search or clear the filters.
                </EmptyDescription>
              </EmptyHeader>
              {filtersActive ? (
                <EmptyContent>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setFilters(emptyJobListFilters)}
                  >
                    Clear filters
                  </Button>
                </EmptyContent>
              ) : null}
            </Empty>
          ) : (
            <>
              <p className="text-xs text-muted-foreground">
                {visible.length === jobs.length
                  ? `${jobs.length} job${jobs.length === 1 ? "" : "s"}`
                  : `${visible.length} of ${jobs.length} jobs`}
              </p>
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
                                <DropdownMenuContent
                                  align="end"
                                  className="min-w-40"
                                >
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
                          {job.analysis ? (
                            <JobAnalysisRatingBadge rating={job.analysis.rating} />
                          ) : null}
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
            </>
          )}
        </div>
      </ScrollArea>
    </div>
  )

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      {lgUp ? (
        <ResizablePanelGroup
          key={`${groupKey}-${filtersOpen ? "filters" : "nofilters"}`}
          orientation="horizontal"
          className="min-h-0 flex-1"
          onLayoutChanged={onLayoutChanged}
        >
          <ResizablePanel
            id="jobs-list"
            defaultSize={filtersOpen ? mainDefaultSize : "100%"}
            minSize={filtersOpen ? "40%" : "100%"}
          >
            {list}
          </ResizablePanel>
          {filtersOpen ? (
            <>
              <ResizableHandle withHandle />
              <ResizablePanel
                id="jobs-filters"
                defaultSize={detailsDefaultSize}
                minSize={`${DETAILS_PANEL_MIN_SIZE}%`}
                maxSize={`${DETAILS_PANEL_MAX_SIZE}%`}
              >
                <div className="h-full min-h-0 overflow-hidden border-l">
                  {filtersPanel}
                </div>
              </ResizablePanel>
            </>
          ) : null}
        </ResizablePanelGroup>
      ) : (
        <>
          <div className="min-h-0 flex-1 overflow-hidden">{list}</div>
          <Sheet
            open={filtersOpen}
            onOpenChange={setDetailsPanelOpen}
          >
            <SheetContent
              side="right"
              showCloseButton={false}
              className="h-full min-h-0 w-full max-w-none gap-0 p-0 pb-[env(safe-area-inset-bottom)] data-[side=right]:w-full data-[side=right]:max-w-none data-[side=right]:sm:max-w-md"
            >
              <SheetTitle className="sr-only">Filters</SheetTitle>
              <SheetDescription className="sr-only">
                Filter saved jobs by company, location, type, and more.
              </SheetDescription>
              <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
                {filtersOpen ? filtersPanel : null}
              </div>
            </SheetContent>
          </Sheet>
        </>
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
