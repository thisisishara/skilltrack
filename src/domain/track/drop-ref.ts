export const TRACK_REF_MIME = "application/x-skilltrack-ref"
export const TRACK_REF_MIME_ALT = "text/x-skilltrack-ref"
export const TRACK_REF_TEXT_PREFIX = "skilltrack-ref:"
export const MAX_TRACK_PINS = 8

export type TrackDropKind = "group" | "topic" | "task"

export type TrackDropRef = {
  kind: TrackDropKind
  id: string
  title: string
  path: string[]
  topicId: string | null
  topicTitle: string | null
}

export function isTrackDropRef(value: unknown): value is TrackDropRef {
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

export function serializeTrackDropRef(ref: TrackDropRef) {
  return JSON.stringify(ref)
}

export function parseTrackDropRef(raw: string): TrackDropRef | null {
  const text = raw.startsWith(TRACK_REF_TEXT_PREFIX)
    ? raw.slice(TRACK_REF_TEXT_PREFIX.length)
    : raw
  try {
    const value = JSON.parse(text) as unknown
    return isTrackDropRef(value) ? value : null
  } catch {
    return null
  }
}

export function writeTrackDropRef(dataTransfer: DataTransfer, ref: TrackDropRef) {
  const json = serializeTrackDropRef(ref)
  dataTransfer.setData(TRACK_REF_MIME, json)
  dataTransfer.setData(TRACK_REF_MIME_ALT, json)
  dataTransfer.setData("text/plain", `${TRACK_REF_TEXT_PREFIX}${json}`)
}

export function dataTransferHasTrackRef(dataTransfer: DataTransfer | null) {
  if (!dataTransfer) {
    return false
  }
  const types = Array.from(dataTransfer.types)
  return types.includes(TRACK_REF_MIME) || types.includes(TRACK_REF_MIME_ALT)
}

export function readTrackDropRef(dataTransfer: DataTransfer | null): TrackDropRef | null {
  if (!dataTransfer) {
    return null
  }
  const typed =
    dataTransfer.getData(TRACK_REF_MIME) || dataTransfer.getData(TRACK_REF_MIME_ALT)
  if (typed) {
    return parseTrackDropRef(typed)
  }
  const plain = dataTransfer.getData("text/plain")
  if (plain.startsWith(TRACK_REF_TEXT_PREFIX)) {
    return parseTrackDropRef(plain)
  }
  return null
}

export function trackRefKey(ref: TrackDropRef) {
  return `${ref.kind}:${ref.id}`
}

export function upsertTrackRef(current: TrackDropRef[], next: TrackDropRef) {
  const key = trackRefKey(next)
  const rest = current.filter((item) => trackRefKey(item) !== key)
  return [next, ...rest].slice(0, MAX_TRACK_PINS)
}

export function dropRefLabel(ref: TrackDropRef) {
  if (ref.kind === "task") {
    return ref.topicTitle ? `${ref.title} · ${ref.topicTitle}` : ref.title
  }
  return ref.path.length > 1 ? ref.path.join(" / ") : ref.title
}
