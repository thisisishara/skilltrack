"use client"

import { useState } from "react"
import Link from "next/link"
import { Briefcase, PanelLeft, Plus, Settings } from "lucide-react"

import { SignOutButton } from "@/components/auth/sign-out-button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { cn } from "@/lib/utils"

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
  const [collapsed, setCollapsed] = useState(false)
  const initials = githubUsername.slice(0, 2).toUpperCase()

  return (
    <aside
      className={cn(
        "flex h-full flex-col border-r bg-sidebar text-sidebar-foreground transition-[width] duration-200",
        collapsed ? "w-16" : "w-64"
      )}
    >
      <div className="flex items-center gap-2 p-3">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          onClick={() => setCollapsed((value) => !value)}
        >
          <PanelLeft />
        </Button>
        {collapsed ? null : (
          <Link href="/dashboard" className="font-heading truncate text-sm font-medium">
            SkillTrack
          </Link>
        )}
      </div>

      <Separator />

      <div className="flex flex-1 flex-col gap-4 p-3">
        <div className="flex flex-col gap-2">
          {collapsed ? null : (
            <p className="px-2 text-xs font-medium text-muted-foreground">Roles</p>
          )}
          <p className="px-2 text-sm text-muted-foreground">
            {collapsed ? "—" : "No roles yet"}
          </p>
          <Button type="button" variant="outline" disabled className="justify-start">
            <Plus data-icon="inline-start" />
            {collapsed ? null : "Create Role"}
          </Button>
        </div>

        <Separator />

        <nav className="flex flex-col gap-1">
          <Button variant="ghost" disabled className="justify-start">
            <Briefcase data-icon="inline-start" />
            {collapsed ? null : "Job Analytics"}
          </Button>
          <Button variant="ghost" disabled className="justify-start">
            <Settings data-icon="inline-start" />
            {collapsed ? null : "Settings"}
          </Button>
        </nav>
      </div>

      <Separator />

      <div className="flex flex-col gap-3 p-3">
        <div className="flex items-center gap-2">
          <Avatar className="size-8">
            {avatarUrl ? <AvatarImage src={avatarUrl} alt="" /> : null}
            <AvatarFallback>{initials}</AvatarFallback>
          </Avatar>
          {collapsed ? null : (
            <div className="min-w-0">
              <p className="truncate text-sm font-medium">
                {displayName ?? githubUsername}
              </p>
              <p className="truncate text-xs text-muted-foreground">
                {githubUsername}
              </p>
            </div>
          )}
        </div>
        <SignOutButton collapsed={collapsed} />
      </div>
    </aside>
  )
}
