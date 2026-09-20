import * as React from "react"

const MOBILE_BREAKPOINT = 768
const LG_BREAKPOINT = 1024

function subscribe(onStoreChange: () => void) {
  const mql = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`)
  mql.addEventListener("change", onStoreChange)
  return () => mql.removeEventListener("change", onStoreChange)
}

function getSnapshot() {
  return window.innerWidth < MOBILE_BREAKPOINT
}

function getServerSnapshot() {
  return false
}

export function useIsMobile() {
  return React.useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)
}

function subscribeLg(onStoreChange: () => void) {
  const mql = window.matchMedia(`(min-width: ${LG_BREAKPOINT}px)`)
  mql.addEventListener("change", onStoreChange)
  return () => mql.removeEventListener("change", onStoreChange)
}

function getLgSnapshot() {
  return window.innerWidth >= LG_BREAKPOINT
}

function getLgServerSnapshot() {
  return true
}

export function useIsLgUp() {
  return React.useSyncExternalStore(
    subscribeLg,
    getLgSnapshot,
    getLgServerSnapshot
  )
}
