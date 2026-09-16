"use client"

import { useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { Bell, CheckCheck, X } from "lucide-react"

import type { StaleRoadmapNotification } from "@/domain/notifications/stale"
import { Button } from "@/components/ui/button"
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty"
import {
  Popover,
  PopoverContent,
  PopoverDescription,
  PopoverHeader,
  PopoverTitle,
  PopoverTrigger,
} from "@/components/ui/popover"
import { ScrollArea } from "@/components/ui/scroll-area"

export function NotificationsMenu({
  items,
}: {
  items: StaleRoadmapNotification[]
}) {
  const router = useRouter()
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(() => new Set())
  const visible = useMemo(
    () => items.filter((item) => !dismissedIds.has(item.id)),
    [dismissedIds, items]
  )
  const count = visible.length

  function dismiss(id: string) {
    setDismissedIds((current) => new Set(current).add(id))
  }

  return (
    <Popover>
      <PopoverTrigger
        render={
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="relative cursor-pointer"
            aria-label={
              count > 0 ? `Notifications, ${count} unread` : "Notifications"
            }
          />
        }
      >
        <Bell />
        {count > 0 ? (
          <span className="absolute top-1.5 right-1.5 size-1.5 rounded-full bg-primary" />
        ) : null}
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0">
        <div className="flex items-start justify-between gap-2 px-3 pt-3 pb-2">
          <PopoverHeader>
            <PopoverTitle>Notifications</PopoverTitle>
            <PopoverDescription>
              Session reminders. They clear when you dismiss them or leave.
            </PopoverDescription>
          </PopoverHeader>
          {count > 0 ? (
            <Button
              type="button"
              variant="ghost"
              size="xs"
              onClick={() => {
                setDismissedIds(new Set(items.map((item) => item.id)))
              }}
            >
              <CheckCheck data-icon="inline-start" />
              Clear
            </Button>
          ) : null}
        </div>
        {count === 0 ? (
          <Empty className="border-0 py-8">
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <Bell />
              </EmptyMedia>
              <EmptyTitle>You’re all caught up</EmptyTitle>
              <EmptyDescription>
                We’ll nudge you here if a roadmap sits untouched for a couple of
                weeks.
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
        ) : (
          <ScrollArea className="max-h-80">
            <ul className="flex flex-col gap-1 p-2 pt-0">
              {visible.map((item) => (
                <li key={item.id} className="flex items-start gap-1">
                  <button
                    type="button"
                    className="min-w-0 flex-1 rounded-lg px-2 py-2 text-left hover:bg-muted"
                    onClick={() => {
                      router.push(`/dashboard/roles/${item.roleId}`)
                    }}
                  >
                    <p className="truncate text-sm font-medium">{item.roleName}</p>
                    <p className="text-xs leading-5 text-muted-foreground">
                      No updates in {item.staleForLabel}. Jump back in when you
                      can.
                    </p>
                  </button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-xs"
                    className="mt-1"
                    aria-label={`Dismiss ${item.roleName} reminder`}
                    onClick={() => dismiss(item.id)}
                  >
                    <X />
                  </Button>
                </li>
              ))}
            </ul>
          </ScrollArea>
        )}
      </PopoverContent>
    </Popover>
  )
}
