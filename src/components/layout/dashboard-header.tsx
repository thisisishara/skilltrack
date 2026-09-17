"use client"

import { ModeToggle } from "@/components/layout/mode-toggle"
import { NotificationsMenu } from "@/components/layout/notifications-menu"
import { CommandSearch } from "@/components/search/command-search"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"
import { APP_VERSION, CHANGELOG } from "@/lib/app-release"

export function DashboardHeader() {
  return (
    <header className="flex h-12 shrink-0 items-center justify-between gap-3 border-b px-4">
      <div className="flex min-w-0 items-center gap-2">
        <SidebarTrigger />
        <CommandSearch />
      </div>
      <div className="flex items-center gap-1">
        <NotificationsMenu />
        <ModeToggle />
        <Sheet>
          <SheetTrigger
            render={
              <Badge
                variant="secondary"
                render={<button type="button" />}
                className="font-mono tabular-nums"
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
