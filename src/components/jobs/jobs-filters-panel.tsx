"use client"

import { useMemo } from "react"
import { XIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
  ComboboxTrigger,
} from "@/components/ui/combobox"
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import type { WorkplaceType } from "@/lib/jobs/extracted-job"
import {
  type JobListFilters,
  type JobPostedWindow,
} from "@/lib/jobs/filter-jobs"

const WORKPLACE_LABELS: Record<Exclude<WorkplaceType, "unknown">, string> = {
  on_site: "On-site",
  hybrid: "Hybrid",
  remote: "Remote",
}

function FilterCombobox({
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
  const items = useMemo(() => ["all", ...options], [options])
  const labelFor = (item: string) =>
    item === "all" ? allLabel : (labels?.[item] ?? item)

  return (
    <Combobox
      items={items}
      value={value}
      autoHighlight
      itemToStringLabel={labelFor}
      onValueChange={(next) => {
        if (typeof next === "string") {
          onChange(next)
          return
        }
        onChange("all")
      }}
    >
      <ComboboxTrigger
        render={
          <Button
            variant="outline"
            size="sm"
            className="w-full min-w-0 justify-between"
            title={labelFor(value)}
          />
        }
      >
        <span className="truncate">{labelFor(value)}</span>
      </ComboboxTrigger>
      <ComboboxContent align="start">
        <ComboboxInput
          showTrigger={false}
          placeholder={`Search ${placeholder.toLowerCase()}…`}
        />
        <ComboboxEmpty>No matches</ComboboxEmpty>
        <ComboboxList>
          {(item: string) => (
            <ComboboxItem key={item} value={item}>
              <span className="min-w-0 truncate">{labelFor(item)}</span>
            </ComboboxItem>
          )}
        </ComboboxList>
      </ComboboxContent>
    </Combobox>
  )
}

export function JobsFiltersPanel({
  filters,
  options,
  filtersActive,
  showClose,
  onPatch,
  onClear,
  onClose,
}: {
  filters: JobListFilters
  options: {
    companies: string[]
    locations: string[]
    employmentTypes: string[]
    seniorities: string[]
    workplaces: string[]
    skills: string[]
  }
  filtersActive: boolean
  showClose?: boolean
  onPatch: (patch: Partial<JobListFilters>) => void
  onClear: () => void
  onClose?: () => void
}) {
  return (
    <div className="flex h-full min-h-0 flex-col bg-background">
      <div className="flex items-start justify-between gap-3 border-b px-4 py-3">
        <div className="flex flex-col gap-0.5">
          <h2 className="font-heading text-base font-medium">Filters</h2>
          <p className="text-sm text-muted-foreground">
            Narrow saved jobs by company, location, and more.
          </p>
        </div>
        {showClose ? (
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            aria-label="Close filters"
            onClick={onClose}
          >
            <XIcon />
          </Button>
        ) : null}
      </div>
      <ScrollArea className="min-h-0 flex-1">
        <div className="flex flex-col gap-4 p-4">
          <FieldGroup>
            {options.companies.length > 0 ? (
              <Field>
                <FieldLabel>Company</FieldLabel>
                <FilterCombobox
                  value={filters.company}
                  allLabel="All companies"
                  placeholder="Company"
                  options={options.companies}
                  onChange={(company) => onPatch({ company })}
                />
              </Field>
            ) : null}
            {options.locations.length > 0 ? (
              <Field>
                <FieldLabel>Location</FieldLabel>
                <FilterCombobox
                  value={filters.location}
                  allLabel="All locations"
                  placeholder="Location"
                  options={options.locations}
                  onChange={(location) => onPatch({ location })}
                />
              </Field>
            ) : null}
            {options.employmentTypes.length > 0 ? (
              <Field>
                <FieldLabel>Type</FieldLabel>
                <FilterCombobox
                  value={filters.employmentType}
                  allLabel="All types"
                  placeholder="Type"
                  options={options.employmentTypes}
                  onChange={(employmentType) => onPatch({ employmentType })}
                />
              </Field>
            ) : null}
            {options.seniorities.length > 0 ? (
              <Field>
                <FieldLabel>Seniority</FieldLabel>
                <FilterCombobox
                  value={filters.seniority}
                  allLabel="All seniority"
                  placeholder="Seniority"
                  options={options.seniorities}
                  onChange={(seniority) => onPatch({ seniority })}
                />
              </Field>
            ) : null}
            {options.workplaces.length > 0 ? (
              <Field>
                <FieldLabel>Workplace</FieldLabel>
                <FilterCombobox
                  value={filters.workplace}
                  allLabel="All workplaces"
                  placeholder="Workplace"
                  options={options.workplaces}
                  labels={WORKPLACE_LABELS}
                  onChange={(workplace) =>
                    onPatch({
                      workplace: workplace as JobListFilters["workplace"],
                    })
                  }
                />
              </Field>
            ) : null}
            {options.skills.length > 0 ? (
              <Field>
                <FieldLabel>Skill</FieldLabel>
                <FilterCombobox
                  value={filters.skill}
                  allLabel="All skills"
                  placeholder="Skill"
                  options={options.skills}
                  onChange={(skill) => onPatch({ skill })}
                />
              </Field>
            ) : null}
            <Field>
              <FieldLabel>Posted</FieldLabel>
              <Select
                value={filters.posted}
                itemToStringLabel={(value) =>
                  value === "all"
                    ? "Any time"
                    : value === "7"
                      ? "Last 7 days"
                      : value === "30"
                        ? "Last 30 days"
                        : "Last 90 days"
                }
                onValueChange={(posted) => {
                  if (
                    posted === "all" ||
                    posted === "7" ||
                    posted === "30" ||
                    posted === "90"
                  ) {
                    onPatch({ posted: posted as JobPostedWindow })
                  }
                }}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Posted" />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    <SelectItem value="all">Any time</SelectItem>
                    <SelectItem value="7">Last 7 days</SelectItem>
                    <SelectItem value="30">Last 30 days</SelectItem>
                    <SelectItem value="90">Last 90 days</SelectItem>
                  </SelectGroup>
                </SelectContent>
              </Select>
            </Field>
          </FieldGroup>
        </div>
      </ScrollArea>
      {filtersActive ? (
        <>
          <Separator />
          <div className="p-4">
            <Button
              type="button"
              variant="outline"
              className="w-full"
              onClick={onClear}
            >
              Clear filters
            </Button>
          </div>
        </>
      ) : null}
    </div>
  )
}
