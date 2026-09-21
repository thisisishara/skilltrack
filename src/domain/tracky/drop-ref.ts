export const TRACKY_REF_MIME = "application/x-skilltrack-ref"
export const TRACKY_REF_MIME_ALT = "text/x-skilltrack-ref"
export const TRACKY_REF_TEXT_PREFIX = "skilltrack-ref:"
export const MAX_TRACKY_PINS = 8

export type TrackyDropKind = "group" | "topic" | "task"

export type TrackyDropRef = {
  kind: TrackyDropKind
  id: string
  title: string
  path: string[]
  topicId: string | null
  topicTitle: string | null
}

export function isTrackyDropRef(value: unknown): value is TrackyDropRef {
  if (!value || typeof value !== "object") {
    return false
  }
  const item = value as Record<string, unknown>
  return (
    (item.kind === "group" || item.kind === "topic" || item.kind === "task") &&
    typeof item.id === "string" &&
    item.id.length > 0 &&
    typeof item.title === "string" &&
    Array.isArray(item.path) &&
    item.path.every((part) => typeof part === "string") &&
    (item.topicId === null || typeof item.topicId === "string") &&
    (item.topicTitle === null || typeof item.topicTitle === "string")
  )
}

export function serializeTrackyDropRef(ref: TrackyDropRef) {
  return JSON.stringify(ref)
}

export function parseTrackyDropRef(raw: string): TrackyDropRef | null {
  const text = raw.startsWith(TRACKY_REF_TEXT_PREFIX)
    ? raw.slice(TRACKY_REF_TEXT_PREFIX.length)
    : raw
  try {
    const value = JSON.parse(text) as unknown
    return isTrackyDropRef(value) ? value : null
  } catch {
    return null
  }
}

export function writeTrackyDropRef(dataTransfer: DataTransfer, ref: TrackyDropRef) {
  const json = serializeTrackyDropRef(ref)
  dataTransfer.setData(TRACKY_REF_MIME, json)
  dataTransfer.setData(TRACKY_REF_MIME_ALT, json)
  dataTransfer.setData("text/plain", `${TRACKY_REF_TEXT_PREFIX}${json}`)
}

export function dataTransferHasTrackRef(dataTransfer: DataTransfer | null) {
  if (!dataTransfer) {
    return false
  }
  const types = Array.from(dataTransfer.types)
  return types.includes(TRACKY_REF_MIME) || types.includes(TRACKY_REF_MIME_ALT)
}

export function readTrackyDropRef(dataTransfer: DataTransfer | null): TrackyDropRef | null {
  if (!dataTransfer) {
    return null
  }
  const typed =
    dataTransfer.getData(TRACKY_REF_MIME) || dataTransfer.getData(TRACKY_REF_MIME_ALT)
  if (typed) {
    return parseTrackyDropRef(typed)
  }
  const plain = dataTransfer.getData("text/plain")
  if (plain.startsWith(TRACKY_REF_TEXT_PREFIX)) {
    return parseTrackyDropRef(plain)
  }
  return null
}

export function trackRefKey(ref: TrackyDropRef) {
  return `${ref.kind}:${ref.id}`
}

export function upsertTrackRef(current: TrackyDropRef[], next: TrackyDropRef) {
  const key = trackRefKey(next)
  const rest = current.filter((item) => trackRefKey(item) !== key)
  return [next, ...rest].slice(0, MAX_TRACKY_PINS)
}

export function dropRefLabel(ref: TrackyDropRef) {
  if (ref.kind === "task") {
    return ref.topicTitle ? `${ref.title} · ${ref.topicTitle}` : ref.title
  }
  return ref.path.length > 1 ? ref.path.join(" / ") : ref.title
}
