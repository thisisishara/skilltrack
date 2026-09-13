"use client"

import { useState } from "react"
import Image from "next/image"
import { ChevronsUpDown, Plus } from "lucide-react"

import { useRolesUi } from "@/components/roles/roles-workspace"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"

export function RoleSwitcher() {
  const { roles, activeRole, selectRole, openCreate } = useRolesUi()
  const [open, setOpen] = useState(false)

  const title = activeRole?.name ?? "Create a role"
  const subtitle = activeRole ? "Role" : "SkillTrack"

  function closeAnd(run: () => void) {
    setOpen(false)
    run()
  }

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger
            render={
              <SidebarMenuButton
                size="lg"
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
            <Command>
              <CommandInput placeholder="Find Role..." />
              <CommandList>
                <CommandEmpty>No roles found.</CommandEmpty>
                {roles.length > 0 ? (
                  <CommandGroup className="flex flex-col gap-0.5">
                    {roles.map((role) => {
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
            </Command>
            <div className="border-t p-1">
              <button
                type="button"
                className="flex w-full items-center gap-1.5 rounded-md px-1.5 py-1 text-sm outline-hidden hover:bg-muted [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4"
                onClick={() => {
                  closeAnd(openCreate)
                }}
              >
                <Plus />
                Create Role
              </button>
            </div>
          </PopoverContent>
        </Popover>
      </SidebarMenuItem>
    </SidebarMenu>
  )
}
