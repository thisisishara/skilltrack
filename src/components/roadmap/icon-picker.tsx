"use client"

import { useMemo, useState } from "react"
import { ChevronsUpDown } from "lucide-react"

import { BRAND_ICON_IDS } from "@/components/roadmap/brand-icons"
import {
  FEATURED_NODE_ICONS,
  NodeLucideIcon,
  getNodeIconInfo,
  iconNames,
  nodeIconMatchesQuery,
} from "@/components/roadmap/lucide-icon"
import { Button } from "@/components/ui/button"
import {
  Command,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from "@/components/ui/empty"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"

const MAX_SEARCH_RESULTS = 80

export function IconPicker({
  value,
  onChange,
}: {
  value: string
  onChange: (icon: string) => void
}) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState("")

  const selected = getNodeIconInfo(value)
  const hasQuery = query.trim().length > 0

  const matches = useMemo(() => {
    if (!hasQuery) {
      return []
    }

    return iconNames.filter((name) => nodeIconMatchesQuery(name, query)).slice(0, MAX_SEARCH_RESULTS)
  }, [hasQuery, query])

  const empty = hasQuery && matches.length === 0

  return (
    <Popover
      open={open}
      onOpenChange={(next) => {
        setOpen(next)
        if (!next) {
          setQuery("")
        }
      }}
    >
      <PopoverTrigger
        render={
          <Button type="button" variant="outline" className="w-full justify-between">
            <span className="flex min-w-0 items-center gap-2">
              <NodeLucideIcon name={value} />
              <span className="truncate">{selected.title}</span>
            </span>
          </Button>
        }
      >
        <ChevronsUpDown data-icon="inline-end" />
      </PopoverTrigger>
      <PopoverContent align="start" className="w-72 p-0">
        <Command shouldFilter={false}>
          <CommandInput
            placeholder="Search icons…"
            value={query}
            onValueChange={setQuery}
          />
          {empty ? (
            <Empty className="border-0 py-8">
              <EmptyHeader>
                <EmptyTitle>No icons found</EmptyTitle>
                <EmptyDescription>
                  No icons match “{query.trim()}”.
                </EmptyDescription>
              </EmptyHeader>
              <EmptyContent>
                <Button type="button" variant="outline" size="sm" onClick={() => setQuery("")}>
                  Clear search
                </Button>
              </EmptyContent>
            </Empty>
          ) : (
            <CommandList>
              {hasQuery ? (
                <CommandGroup heading="Icons">
                  {matches.map((name) => (
                    <IconOption
                      key={name}
                      name={name}
                      selected={name === value}
                      onSelect={() => {
                        onChange(name)
                        setOpen(false)
                        setQuery("")
                      }}
                    />
                  ))}
                </CommandGroup>
              ) : (
                <>
                  <CommandGroup heading="Suggested">
                    {FEATURED_NODE_ICONS.map((name) => (
                      <IconOption
                        key={name}
                        name={name}
                        selected={name === value}
                        onSelect={() => {
                          onChange(name)
                          setOpen(false)
                          setQuery("")
                        }}
                      />
                    ))}
                  </CommandGroup>
                  <CommandGroup heading="Brands">
                    {BRAND_ICON_IDS.filter((name) => !FEATURED_NODE_ICONS.includes(name)).map((name) => (
                      <IconOption
                        key={name}
                        name={name}
                        selected={name === value}
                        onSelect={() => {
                          onChange(name)
                          setOpen(false)
                          setQuery("")
                        }}
                      />
                    ))}
                  </CommandGroup>
                </>
              )}
            </CommandList>
          )}
        </Command>
      </PopoverContent>
    </Popover>
  )
}

function IconOption({
  name,
  selected,
  onSelect,
}: {
  name: string
  selected: boolean
  onSelect: () => void
}) {
  const info = getNodeIconInfo(name)

  return (
    <CommandItem
      value={name}
      data-checked={selected || undefined}
      onSelect={onSelect}
    >
      <NodeLucideIcon name={name} />
      {info.title}
    </CommandItem>
  )
}
