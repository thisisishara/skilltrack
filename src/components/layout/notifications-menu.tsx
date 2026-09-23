"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { Bell, CheckCheck, X } from "lucide-react"

import { listStaleRoadmapNotificationsAction } from "@/application/notifications/actions"
import type { StaleRoadmapNotification } from "@/domain/notifications/stale"
import { useRolesUi } from "@/components/roles/roles-workspace"
import { useTrackyWorkspace } from "@/components/tracky/tracky-workspace"
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
import { Skeleton } from "@/components/ui/skeleton"
import { WithTooltip } from "@/components/ui/tooltip"

export function NotificationsMenu() {
  const router = useRouter()
  const { beginNavigation } = useRolesUi()
  const { settings } = useTrackyWorkspace()
  const [items, setItems] = useState<StaleRoadmapNotification[]>([])
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(() => new Set())
  const [loading, setLoading] = useState(true)
  const [loadFailed, setLoadFailed] = useState(false)

  useEffect(() => {
    if (!settings.notificationsEnabled) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setItems([])
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setLoading(false)
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setLoadFailed(false)
      return
    }
    let cancelled = false
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoading(true)
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoadFailed(false)
    void listStaleRoadmapNotificationsAction()
      .then((result) => {
        if (cancelled) {
          return
        }
        if (!result.ok) {
          setLoadFailed(true)
          return
        }
        setItems(result.items)
      })
      .catch(() => {
        if (!cancelled) {
          setLoadFailed(true)
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false)
        }
      })
    return () => {
      cancelled = true
    }
  }, [settings.notificationsEnabled])
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
      <WithTooltip label={count > 0 ? `Notifications, ${count} unread` : "Notifications"}>
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
      </WithTooltip>
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
        {loading ? (
          <div className="flex flex-col gap-2 p-2 pt-0">
            {Array.from({ length: 3 }).map((_, index) => (
              <Skeleton key={index} className="h-12 w-full" />
            ))}
          </div>
        ) : loadFailed ? (
          <Empty className="border-0 py-8">
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <Bell />
              </EmptyMedia>
              <EmptyTitle>Couldn’t load notifications</EmptyTitle>
              <EmptyDescription>
                Something went wrong loading reminders. Refresh the page to
                try again.
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
        ) : count === 0 ? (
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
                      const href = `/dashboard/roles/${item.roleId}`
                      beginNavigation(href)
                      router.push(href)
                    }}
                  >
                    <p className="truncate text-sm font-medium">{item.roleName}</p>
                    <p className="text-xs leading-5 text-muted-foreground">
                      No updates in {item.staleForLabel}. Jump back in when you
                      can.
                    </p>
                  </button>
                  <WithTooltip label="Dismiss">
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
                  </WithTooltip>
                </li>
              ))}
            </ul>
          </ScrollArea>
        )}
      </PopoverContent>
    </Popover>
  )
}
