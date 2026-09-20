"use client"

import { MessageSquare, PanelRight } from "lucide-react"
import { usePathname } from "next/navigation"

import { ModeToggle } from "@/components/layout/mode-toggle"
import { NotificationsMenu } from "@/components/layout/notifications-menu"
import { CommandSearch } from "@/components/search/command-search"
import { useTrackWorkspace } from "@/components/track/track-workspace"
import { useTrackRefDrop } from "@/components/track/use-track-ref-drop"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { APP_VERSION, CHANGELOG } from "@/lib/app-release"
import { cn } from "@/lib/utils"

export function DashboardHeader() {
  const pathname = usePathname()
  const {
    settings,
    trackPanelOpen,
    setTrackPanelOpen,
    detailsPanelOpen,
    setDetailsPanelOpen,
    pinTrackRef,
  } = useTrackWorkspace()
  const showTrack = settings.trackEnabled && !pathname.endsWith("/settings")
  const showDetailsToggle = /^\/dashboard\/roles\/[^/]+\/?$/.test(pathname)
  const { isOver, dropProps } = useTrackRefDrop((ref) => {
    pinTrackRef(ref)
    setTrackPanelOpen(true)
  })

  return (
    <header className="flex h-12 shrink-0 items-center justify-between gap-1 border-b px-2 sm:gap-3 sm:px-4">
      <div className="flex min-w-0 items-center gap-2">
        <SidebarTrigger />
        <CommandSearch />
      </div>
      <div className="flex items-center gap-1">
        {showDetailsToggle ? (
          <Tooltip>
            <TooltipTrigger
              render={
                <Button
                  type="button"
                  variant={detailsPanelOpen ? "secondary" : "ghost"}
                  size="icon"
                  aria-label={
                    detailsPanelOpen ? "Hide details" : "Show details"
                  }
                  onClick={() => setDetailsPanelOpen(!detailsPanelOpen)}
                />
              }
            >
              <PanelRight />
            </TooltipTrigger>
            <TooltipContent>
              {detailsPanelOpen ? "Hide details" : "Show details"}
            </TooltipContent>
          </Tooltip>
        ) : null}
        {showTrack ? (
          <Tooltip>
            <TooltipTrigger
              render={
                <Button
                  type="button"
                  variant={trackPanelOpen || isOver ? "secondary" : "ghost"}
                  size="icon"
                  aria-label="Track"
                  className={cn(
                    isOver && "border border-dashed border-primary bg-primary/10 text-primary"
                  )}
                  onClick={() => setTrackPanelOpen(!trackPanelOpen)}
                  {...dropProps}
                />
              }
            >
              <MessageSquare />
            </TooltipTrigger>
            <TooltipContent>Track</TooltipContent>
          </Tooltip>
        ) : null}
        <NotificationsMenu />
        <ModeToggle />
        <Sheet>
          <SheetTrigger
            render={
              <Badge
                variant="secondary"
                render={<button type="button" />}
                className="hidden font-mono tabular-nums sm:inline-flex"
              />
            }
          >
            v{APP_VERSION}
          </SheetTrigger>
          <SheetContent
            side="right"
            className="w-full gap-0 data-[side=right]:sm:max-w-xl"
          >
            <SheetHeader>
              <SheetTitle>Changelog</SheetTitle>
              <SheetDescription>
                Manual SemVer. Click the version anytime to read what shipped.
              </SheetDescription>
            </SheetHeader>
            <ScrollArea className="min-h-0 flex-1">
              <ol className="flex flex-col gap-8 px-4 pb-6">
                {CHANGELOG.map((release) => (
                  <li key={release.version} className="flex flex-col gap-4">
                    <div className="flex items-baseline justify-between gap-3">
                      <h2 className="font-mono text-sm font-medium tabular-nums">
                        v{release.version}
                      </h2>
                      <time
                        className="font-mono text-[11px] text-muted-foreground tabular-nums"
                        dateTime={release.date}
                      >
                        {release.date}
                      </time>
                    </div>
                    {release.groups.map((group) => (
                      <section key={group.title} className="flex flex-col gap-2">
                        <h3 className="text-sm font-medium">{group.title}</h3>
                        <ul className="flex list-disc flex-col gap-1.5 pl-5 text-sm text-muted-foreground">
                          {group.items.map((item) => (
                            <li key={item}>{item}</li>
                          ))}
                        </ul>
                      </section>
                    ))}
                  </li>
                ))}
              </ol>
            </ScrollArea>
          </SheetContent>
        </Sheet>
      </div>
    </header>
  )
}
