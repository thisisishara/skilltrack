"use client"

import Link from "next/link"
import { Briefcase, Plus, Settings, Zap } from "lucide-react"

import { SignOutButton } from "@/components/auth/sign-out-button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  SidebarSeparator,
  SidebarTrigger,
  useSidebar,
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
  const { state } = useSidebar()
  const collapsed = state === "collapsed"
  const initials = githubUsername.slice(0, 2).toUpperCase()

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <div className="flex items-center gap-2">
          <SidebarTrigger />
          <Link
            href="/dashboard"
            className="flex min-w-0 items-center gap-2 group-data-[collapsible=icon]:hidden"
          >
            <Zap />
            <span className="truncate text-sm font-medium">SkillTrack</span>
          </Link>
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Roles</SidebarGroupLabel>
          <SidebarGroupContent>
            <p className="px-2 text-sm text-muted-foreground group-data-[collapsible=icon]:hidden">
              No roles yet
            </p>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton disabled tooltip="Create Role">
                  <Plus />
                  <span>Create Role</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarSeparator />

        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton disabled tooltip="Job Analytics">
                  <Briefcase />
                  <span>Job Analytics</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton disabled tooltip="Settings">
                  <Settings />
                  <span>Settings</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter>
        <div className="flex items-center gap-2 px-2">
          <Avatar className="size-8">
            {avatarUrl ? <AvatarImage src={avatarUrl} alt="" /> : null}
            <AvatarFallback>{initials}</AvatarFallback>
          </Avatar>
          <div className="min-w-0 group-data-[collapsible=icon]:hidden">
            <p className="truncate text-sm font-medium">
              {displayName ?? githubUsername}
            </p>
            <p className="truncate text-xs text-muted-foreground">
              {githubUsername}
            </p>
          </div>
        </div>
        <SignOutButton collapsed={collapsed} />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}
