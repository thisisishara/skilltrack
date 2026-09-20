"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { ChevronsUpDown, Briefcase, LogOut, Map, Settings } from "lucide-react"

import { signOutAction } from "@/lib/auth/actions"
import { RoleSwitcher } from "@/components/roles/role-switcher"
import { useRolesUi } from "@/components/roles/roles-workspace"
import { useTrackWorkspace } from "@/components/track/track-workspace"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from "@/components/ui/sidebar"

type AppSidebarProps = {
  githubUsername: string
  displayName?: string | null
  avatarUrl?: string | null
}

export function AppSidebar({
  githubUsername,
  displayName,
  avatarUrl,
}: AppSidebarProps) {
  const { activeRole, beginNavigation } = useRolesUi()
  const { openSettings } = useTrackWorkspace()
  const pathname = usePathname()
  const name = displayName ?? githubUsername
  const initials = githubUsername.slice(0, 2).toUpperCase()
  const roleHref = activeRole ? `/dashboard/roles/${activeRole.id}` : null
  const jobsHref = roleHref ? `${roleHref}/jobs` : null
  const settingsHref = roleHref ? `${roleHref}/settings` : null
  const roadmapActive = Boolean(roleHref && pathname === roleHref)
  const jobsActive = Boolean(jobsHref && pathname.startsWith(jobsHref))
  const settingsActive = Boolean(
    settingsHref && pathname.startsWith(settingsHref)
  )

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <RoleSwitcher />
      </SidebarHeader>

      <SidebarContent>
        {activeRole && roleHref && jobsHref && settingsHref ? (
          <SidebarGroup>
            <SidebarGroupContent>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton
                    isActive={roadmapActive}
                    tooltip="Roadmap"
                    render={
                      <Link
                        href={roleHref}
                        prefetch
                        scroll={false}
                        onClick={() => beginNavigation(roleHref)}
                      />
                    }
                  >
                    <Map />
                    <span>Roadmap</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton
                    isActive={jobsActive}
                    tooltip="Jobs"
                    render={
                      <Link
                        href={jobsHref}
                        prefetch
                        scroll={false}
                        onClick={() => beginNavigation(jobsHref)}
                      />
                    }
                  >
                    <Briefcase />
                    <span>Jobs</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton
                    isActive={settingsActive}
                    tooltip="Role settings"
                    render={
                      <Link
                        href={settingsHref}
                        prefetch
                        scroll={false}
                        onClick={() => beginNavigation(settingsHref)}
                      />
                    }
                  >
                    <Settings />
                    <span>Role settings</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ) : null}
      </SidebarContent>

      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <DropdownMenu>
              <DropdownMenuTrigger
                render={
                  <SidebarMenuButton
                    size="lg"
                    variant="outline"
                    className="data-open:bg-sidebar-accent data-open:text-sidebar-accent-foreground"
                  />
                }
              >
                <Avatar className="size-8 rounded-lg">
                  {avatarUrl ? (
                    <AvatarImage src={avatarUrl} alt="" />
                  ) : null}
                  <AvatarFallback className="rounded-lg">
                    {initials}
                  </AvatarFallback>
                </Avatar>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-medium">{name}</span>
                  <span className="truncate text-xs">{githubUsername}</span>
                </div>
                <ChevronsUpDown className="ml-auto" />
              </DropdownMenuTrigger>
              <DropdownMenuContent
                className="min-w-56"
                side="top"
                align="start"
                sideOffset={4}
                collisionAvoidance={{ side: "none" }}
              >
                <DropdownMenuGroup>
                  <DropdownMenuLabel className="p-0 font-normal">
                    <div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
                      <Avatar className="size-8 rounded-lg">
                        {avatarUrl ? (
                          <AvatarImage src={avatarUrl} alt="" />
                        ) : null}
                        <AvatarFallback className="rounded-lg">
                          {initials}
                        </AvatarFallback>
                      </Avatar>
                      <div className="grid flex-1 text-left text-sm leading-tight">
                        <span className="truncate font-medium">{name}</span>
                        <span className="truncate text-xs">
                          {githubUsername}
                        </span>
                      </div>
                    </div>
                  </DropdownMenuLabel>
                </DropdownMenuGroup>
                <DropdownMenuSeparator />
                <DropdownMenuGroup>
                  <DropdownMenuItem
                    onClick={() => {
                      openSettings("general")
                    }}
                  >
                    <Settings />
                    User settings
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => {
                      void signOutAction()
                    }}
                  >
                    <LogOut />
                    Log out
                  </DropdownMenuItem>
                </DropdownMenuGroup>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}
