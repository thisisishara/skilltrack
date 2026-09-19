"use client"

import { useEffect, useState } from "react"
import { Moon, Sun } from "lucide-react"
import { useTheme } from "next-themes"

import { Button } from "@/components/ui/button"
import { WithTooltip } from "@/components/ui/tooltip"

export function ModeToggle() {
  const { resolvedTheme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    // Theme is read after mount so SSR and the first client paint match.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true)
  }, [])

  const isDark = mounted && resolvedTheme === "dark"

  const label = isDark ? "Switch to light theme" : "Switch to dark theme"

  return (
    <WithTooltip label={label}>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="cursor-pointer"
        aria-label={label}
        onClick={() => setTheme(isDark ? "light" : "dark")}
      >
        <Sun className="dark:hidden" />
        <Moon className="hidden dark:inline" />
        <span className="sr-only">Toggle color theme</span>
      </Button>
    </WithTooltip>
  )
}
