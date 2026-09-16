"use client"

import { useState } from "react"
import Image from "next/image"
import { ChevronsUpDown, Plus } from "lucide-react"

import { matchesSearch } from "@/domain/search/query"
import { useRolesUi } from "@/components/roles/roles-workspace"
import {
  Command,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import { Button } from "@/components/ui/button"
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from "@/components/ui/empty"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"

export function RoleSwitcher() {
  const { roles, activeRole, selectRole, openCreate } = useRolesUi()
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState("")
  const filteredRoles = roles.filter((role) => matchesSearch(role.name, query))

  const title = activeRole?.name ?? "Create a role"
  const subtitle = activeRole ? "Role" : "SkillTrack"

  function closeAnd(run: () => void) {
    setOpen(false)
    run()
  }

  return (
    <SidebarMenu>
      <SidebarMenuItem>
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
              <SidebarMenuButton
                size="lg"
                variant="outline"
                tooltip={title}
                className="data-open:bg-sidebar-accent data-open:text-sidebar-accent-foreground"
              />
            }
          >
            <Image
              src="/skilltrack-icon.png"
              alt=""
              width={1254}
              height={1254}
              sizes="32px"
              className="size-8 rounded-lg"
            />
            <div className="grid flex-1 text-left text-sm leading-tight">
              <span className="truncate font-medium">{title}</span>
              <span className="truncate text-xs">{subtitle}</span>
            </div>
            <ChevronsUpDown className="ml-auto" />
          </PopoverTrigger>
          <PopoverContent
            align="start"
            side="bottom"
            sideOffset={4}
            collisionAvoidance={{ side: "none" }}
            className="w-(--anchor-width) min-w-64 gap-0 overflow-hidden p-0"
          >
            <Command shouldFilter={false}>
              <CommandInput
                placeholder="Find Role..."
                value={query}
                onValueChange={setQuery}
              />
              {query.trim() && filteredRoles.length === 0 ? (
                <Empty className="border-0 py-6">
                  <EmptyHeader>
                    <EmptyTitle>No roles found</EmptyTitle>
                    <EmptyDescription>
                      Nothing matches “{query.trim()}”.
                    </EmptyDescription>
                  </EmptyHeader>
                  <EmptyContent>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setQuery("")}
                    >
                      Clear search
                    </Button>
                  </EmptyContent>
                </Empty>
              ) : (
                <CommandList>
                  {filteredRoles.length > 0 ? (
                    <CommandGroup className="flex flex-col gap-0.5">
                      {filteredRoles.map((role) => {
                        const selected = role.id === activeRole?.id
                        return (
                          <CommandItem
                            key={role.id}
                            value={`${role.name} ${role.id}`}
                            data-checked={selected ? true : undefined}
                            onSelect={() => {
                              closeAnd(() => selectRole(role.id))
                            }}
                          >
                            <span className="flex size-4 shrink-0 items-center justify-center rounded-sm bg-muted text-[10px] font-medium">
                              {role.name.slice(0, 1).toUpperCase()}
                            </span>
                            <span className="min-w-0 flex-1 truncate">
                              {role.name}
                            </span>
                          </CommandItem>
                        )
                      })}
                    </CommandGroup>
                  ) : null}
                </CommandList>
              )}
            </Command>
            <div className="flex items-center gap-2 border-t p-1">
              <button
                type="button"
                className="flex min-w-0 flex-1 items-center gap-1.5 rounded-md px-1.5 py-1 text-sm outline-hidden hover:bg-muted [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4"
                onClick={() => {
                  closeAnd(openCreate)
                }}
              >
                <Plus />
                Create Role
              </button>
              <span className="hidden shrink-0 pr-1.5 font-mono text-[10px] text-muted-foreground sm:inline">
              ⌘ ↑ ↓
              </span>
            </div>
          </PopoverContent>
        </Popover>
      </SidebarMenuItem>
    </SidebarMenu>
  )
}
