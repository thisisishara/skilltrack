import { isTrackDropRef, type TrackDropRef } from "@/domain/track/drop-ref"
import { isTrackProposal, type TrackProposal } from "@/domain/track/proposals"

export const TRACK_SESSION_VERSION = 1
export const TRACK_SESSION_MAX_MESSAGES = 40
export const TRACK_SESSION_MAX_BYTES = 180_000
export const TRACK_CHAT_INITIAL_VISIBLE = 12
export const TRACK_CHAT_PAGE = 10

export type StoredTrackMessage = {
  id: string
  role: "user" | "assistant"
  parts: Array<Record<string, unknown>>
}

export type StoredTrackSession = {
  v: typeof TRACK_SESSION_VERSION
  messages: StoredTrackMessage[]
  messageContext: Record<string, TrackDropRef[]>
  proposals: TrackProposal[]
  scratchpad: string
  pinnedRefs: TrackDropRef[]
  elapsedByMessage: Record<string, number>
}

type PendingWrite = {
  userId: string
  roleId: string
  session: StoredTrackSession
}

const pendingByKey = new Map<string, PendingWrite>()
const lastWrittenByKey = new Map<string, string>()
const timers = new Map<string, number>()

function storageKey(userId: string, roleId: string) {
  return `skilltrack:track-session:${userId}:${roleId}`
}

function capString(value: unknown, max: number) {
  if (typeof value !== "string") {
    return ""
  }
  return value.length > max ? value.slice(0, max) : value
}

function slimInput(value: unknown) {
  if (value === null || value === undefined) {
    return {}
  }
  try {
    const raw = JSON.stringify(value)
    if (raw.length <= 1500) {
      return value
    }
    return { truncated: true }
  } catch {
    return {}
  }
}

export function slimTrackMessagePart(
  part: unknown
): Record<string, unknown> | null {
  if (!part || typeof part !== "object") {
    return null
  }
  const item = part as Record<string, unknown>
  const type = String(item.type ?? "")
  if (type === "reasoning") {
    return null
  }
  if (type === "text") {
    const text = capString(item.text, 8000)
    return text ? { type: "text", text } : null
  }
  if (type.startsWith("tool-") || type === "tool-call") {
    const next: Record<string, unknown> = {
      type,
      state: item.state === "output-error" ? "output-error" : "output-available",
    }
    if (typeof item.toolCallId === "string") {
      next.toolCallId = item.toolCallId
    }
    if (typeof item.toolName === "string") {
      next.toolName = item.toolName
    }
    next.input = slimInput(item.input ?? item.args)
    if (item.state === "output-error") {
      next.errorText = capString(item.errorText, 400)
    } else {
      next.output = { restored: true }
    }
    return next
  }
  if (type === "step-start") {
    return { type }
  }
  return null
}

export function splitTrackTranscript<T>(
  messages: T[],
  visibleCount = TRACK_CHAT_INITIAL_VISIBLE
) {
  if (messages.length <= visibleCount) {
    return { older: [] as T[], visible: messages }
  }
  return {
    older: messages.slice(0, -visibleCount),
    visible: messages.slice(-visibleCount),
  }
}

export function takeOlderTrackMessages<T>(
  older: T[],
  page = TRACK_CHAT_PAGE
) {
  if (older.length === 0) {
    return { older, batch: [] as T[] }
  }
  const start = Math.max(0, older.length - page)
  return {
    older: older.slice(0, start),
    batch: older.slice(start),
  }
}

export function mergeTrackTranscript<T extends { id: string }>(
  older: T[],
  visible: T[]
) {
  const seen = new Set<string>()
  const next: T[] = []
  for (const message of [...older, ...visible]) {
    if (seen.has(message.id)) {
      continue
    }
    seen.add(message.id)
    next.push(message)
  }
  return next
}

export function slimTrackMessages(messages: unknown[]): StoredTrackMessage[] {
  const slimmed: StoredTrackMessage[] = []
  for (const message of messages) {
    if (!message || typeof message !== "object") {
      continue
    }
    const item = message as Record<string, unknown>
    if (
      (item.role !== "user" && item.role !== "assistant") ||
      typeof item.id !== "string" ||
      !Array.isArray(item.parts)
    ) {
      continue
    }
    const parts = item.parts
      .map(slimTrackMessagePart)
      .filter((part): part is Record<string, unknown> => part !== null)
    slimmed.push({ id: item.id, role: item.role, parts })
  }
  return slimmed.slice(-TRACK_SESSION_MAX_MESSAGES)
}

function isStoredMessage(value: unknown): value is StoredTrackMessage {
  if (!value || typeof value !== "object") {
    return false
  }
  const item = value as Record<string, unknown>
  return (
    typeof item.id === "string" &&
    (item.role === "user" || item.role === "assistant") &&
    Array.isArray(item.parts)
  )
}

function parseMessageContext(value: unknown): Record<string, TrackDropRef[]> {
  if (!value || typeof value !== "object") {
    return {}
  }
  const next: Record<string, TrackDropRef[]> = {}
  for (const [id, refs] of Object.entries(value as Record<string, unknown>)) {
    if (!Array.isArray(refs)) {
      continue
    }
    const valid = refs.filter(isTrackDropRef)
    if (valid.length > 0) {
      next[id] = valid
    }
  }
  return next
}

function parseElapsed(value: unknown): Record<string, number> {
  if (!value || typeof value !== "object") {
    return {}
  }
  const next: Record<string, number> = {}
  for (const [id, ms] of Object.entries(value as Record<string, unknown>)) {
    if (typeof ms === "number" && Number.isFinite(ms) && ms >= 0) {
      next[id] = ms
    }
  }
  return next
}

export function parseStoredTrackSession(
  value: unknown
): StoredTrackSession | null {
  if (!value || typeof value !== "object") {
    return null
  }
  const item = value as Record<string, unknown>
  if (item.v !== TRACK_SESSION_VERSION || !Array.isArray(item.messages)) {
    return null
  }
  return {
    v: TRACK_SESSION_VERSION,
    messages: item.messages.filter(isStoredMessage),
    messageContext: parseMessageContext(item.messageContext),
    proposals: Array.isArray(item.proposals)
      ? item.proposals.filter(isTrackProposal)
      : [],
    scratchpad: typeof item.scratchpad === "string" ? item.scratchpad : "",
    pinnedRefs: Array.isArray(item.pinnedRefs)
      ? item.pinnedRefs.filter(isTrackDropRef)
      : [],
    elapsedByMessage: parseElapsed(item.elapsedByMessage),
  }
}

export function buildStoredTrackSession(input: {
  messages: unknown[]
  messageContext: Record<string, TrackDropRef[]>
  proposals: TrackProposal[]
  scratchpad: string
  pinnedRefs: TrackDropRef[]
  elapsedByMessage: Record<string, number>
}): StoredTrackSession {
  return {
    v: TRACK_SESSION_VERSION,
    messages: slimTrackMessages(input.messages),
    messageContext: input.messageContext,
    proposals: input.proposals,
    scratchpad: input.scratchpad.slice(0, 3000),
    pinnedRefs: input.pinnedRefs.slice(0, 8),
    elapsedByMessage: input.elapsedByMessage,
  }
}

function sessionIsEmpty(session: StoredTrackSession) {
  return (
    session.messages.length === 0 &&
    session.proposals.length === 0 &&
    session.scratchpad.trim() === "" &&
    session.pinnedRefs.length === 0 &&
    Object.keys(session.messageContext).length === 0
  )
}

function fitSession(session: StoredTrackSession): StoredTrackSession {
  let next = session
  while (JSON.stringify(next).length > TRACK_SESSION_MAX_BYTES) {
    if (next.messages.length === 0) {
      return {
        ...next,
        scratchpad: "",
        messageContext: {},
        elapsedByMessage: {},
      }
    }
    next = { ...next, messages: next.messages.slice(1) }
  }
  return next
}

export function readStoredTrackSession(
  userId: string,
  roleId: string
): StoredTrackSession | null {
  if (typeof window === "undefined" || !userId || !roleId) {
    return null
  }
  try {
    const raw = window.localStorage.getItem(storageKey(userId, roleId))
    if (!raw) {
      return null
    }
    return parseStoredTrackSession(JSON.parse(raw))
  } catch {
    return null
  }
}

export function writeStoredTrackSession(
  userId: string,
  roleId: string,
  session: StoredTrackSession
) {
  if (typeof window === "undefined" || !userId || !roleId) {
    return
  }
  const key = storageKey(userId, roleId)
  if (sessionIsEmpty(session)) {
    lastWrittenByKey.delete(key)
    try {
      window.localStorage.removeItem(key)
    } catch {
      // Ignore storage failures (e.g. private browsing quota).
    }
    return
  }
  const fitted = fitSession(session)
  const raw = JSON.stringify(fitted)
  if (lastWrittenByKey.get(key) === raw) {
    return
  }
  try {
    window.localStorage.setItem(key, raw)
    lastWrittenByKey.set(key, raw)
  } catch {
    try {
      const smaller = fitSession({ ...fitted, messages: fitted.messages.slice(-8) })
      const compact = JSON.stringify(smaller)
      window.localStorage.setItem(key, compact)
      lastWrittenByKey.set(key, compact)
    } catch {
      // Ignore storage failures (e.g. private browsing quota).
    }
  }
}

export function scheduleStoredTrackSession(
  userId: string,
  roleId: string,
  session: StoredTrackSession
) {
  const key = storageKey(userId, roleId)
  pendingByKey.set(key, { userId, roleId, session })
  const existing = timers.get(key)
  if (existing !== undefined) {
    window.clearTimeout(existing)
  }
  if (typeof window === "undefined") {
    return
  }
  timers.set(
    key,
    window.setTimeout(() => {
      timers.delete(key)
      const pending = pendingByKey.get(key)
      pendingByKey.delete(key)
      if (pending) {
        writeStoredTrackSession(pending.userId, pending.roleId, pending.session)
      }
    }, 400)
  )
}

export function flushStoredTrackSession(
  userId: string,
  roleId: string,
  session?: StoredTrackSession
) {
  const key = storageKey(userId, roleId)
  const existing = timers.get(key)
  if (existing !== undefined) {
    window.clearTimeout(existing)
    timers.delete(key)
  }
  const pending = pendingByKey.get(key)
  pendingByKey.delete(key)
  const next = session ?? pending?.session
  if (next) {
    writeStoredTrackSession(userId, roleId, next)
  }
}

export function clearStoredTrackSession(userId: string, roleId: string) {
  if (typeof window === "undefined" || !userId || !roleId) {
    return
  }
  const key = storageKey(userId, roleId)
  const existing = timers.get(key)
  if (existing !== undefined) {
    window.clearTimeout(existing)
    timers.delete(key)
  }
  pendingByKey.delete(key)
  lastWrittenByKey.delete(key)
  try {
    window.localStorage.removeItem(key)
  } catch {
    // Ignore storage failures (e.g. private browsing quota).
  }
}
