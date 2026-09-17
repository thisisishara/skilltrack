"use client"

import { useRolesUi } from "@/components/roles/roles-workspace"
import { cn } from "@/lib/utils"

/**
 * Thin top-of-viewport progress bar that lights up while a client-side
 * navigation initiated through `RolesUiContext.beginNavigation` is pending.
 * Gives feedback for the gap between clicking a role/link and the new
 * route committing, when React (correctly) keeps the old screen mounted.
 */
export function NavigationProgressBar() {
  const { pendingHref } = useRolesUi()
  const active = Boolean(pendingHref)

  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-x-0 top-0 z-50 h-0.5 overflow-hidden"
    >
      <div
        className={cn(
          "h-full w-1/3 rounded-full bg-primary transition-opacity duration-150",
          active
            ? "opacity-100 [animation:nav-progress_1.1s_ease-in-out_infinite]"
            : "opacity-0"
        )}
      />
    </div>
  )
}
