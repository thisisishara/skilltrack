"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { ChevronsUpDown, ListTree, LogOut, Map, Settings } from "lucide-react"

import { signOutAction } from "@/lib/auth/actions"
import { RoleSwitcher } from "@/components/roles/role-switcher"
import { useRolesUi } from "@/components/roles/roles-workspace"
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
  const { activeRole } = useRolesUi()
  const pathname = usePathname()
  const name = displayName ?? githubUsername
  const initials = githubUsername.slice(0, 2).toUpperCase()
  const roleHref = activeRole ? `/dashboard/roles/${activeRole.id}` : null
  const treeHref = roleHref ? `${roleHref}/tree` : null
  const settingsHref = roleHref ? `${roleHref}/settings` : null
  const roadmapActive = Boolean(roleHref && pathname === roleHref)
  const treeActive = Boolean(treeHref && pathname.startsWith(treeHref))
  const settingsActive = Boolean(
    settingsHref && pathname.startsWith(settingsHref)
  )

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <RoleSwitcher />
      </SidebarHeader>

      <SidebarContent>
        {activeRole && roleHref && treeHref && settingsHref ? (
          <SidebarGroup>
            <SidebarGroupContent>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton
                    isActive={roadmapActive}
                    tooltip="Canvas"
                    render={<Link href={roleHref} />}
                  >
                    <Map />
                    <span>Canvas</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton
                    isActive={treeActive}
                    tooltip="Tree"
                    render={<Link href={treeHref} />}
                  >
                    <ListTree />
                    <span>Tree</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton
                    isActive={settingsActive}
                    tooltip="Settings"
                    render={<Link href={settingsHref} />}
                  >
                    <Settings />
                    <span>Settings</span>
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
