"use client"

import { useMemo, useState } from "react"
import { ChevronsUpDown } from "lucide-react"

import {
  FEATURED_NODE_ICONS,
  NodeLucideIcon,
  iconNames,
} from "@/components/canvas/lucide-icon"
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

  const matches = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) {
      return [...FEATURED_NODE_ICONS]
    }

    return iconNames.filter((name) => name.includes(q)).slice(0, MAX_SEARCH_RESULTS)
  }, [query])

  const hasQuery = query.trim().length > 0
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
              <span className="truncate">{value}</span>
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
                  No Lucide icons match “{query.trim()}”.
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
              <CommandGroup heading={hasQuery ? "Icons" : "Suggested"}>
                {matches.map((name) => (
                  <CommandItem
                    key={name}
                    value={name}
                    data-checked={name === value || undefined}
                    onSelect={() => {
                      onChange(name)
                      setOpen(false)
                      setQuery("")
                    }}
                  >
                    <NodeLucideIcon name={name} />
                    {name}
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          )}
        </Command>
      </PopoverContent>
    </Popover>
  )
}
