export type TrackToolActivityState = "running" | "done" | "error"

export type TrackToolActivity = {
  id: string
  name: string
  label: string
  detail: string | null
  state: TrackToolActivityState
}

const TOOL_LABELS: Record<string, string> = {
  list_roots: "Listed roots",
  list_children: "Listed children",
  search_topics: "Searched topics",
  get_topic: "Opened a topic",
  get_path: "Opened a path",
  get_notes: "Read notes",
  get_tasks: "Read tasks",
  get_links: "Read links",
  get_role: "Opened role overview",
  propose_create_topic: "Propose new topic",
  propose_update_topic: "Propose topic update",
  propose_delete_topic: "Propose topic delete",
  propose_create_notes: "Propose notes",
  propose_update_notes: "Propose notes update",
  propose_delete_notes: "Propose notes delete",
  propose_create_task: "Propose new task",
  propose_update_task: "Propose task update",
  propose_delete_task: "Propose task delete",
  propose_create_link: "Propose new link",
  propose_update_link: "Propose link update",
  propose_delete_link: "Propose link delete",
  propose_full_roadmap: "Propose full roadmap",
  propose_update_role: "Propose roadmap overview",
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object") {
    return null
  }
  return value as Record<string, unknown>
}

function toolNameFromPart(part: Record<string, unknown>) {
  if (typeof part.toolName === "string" && part.toolName) {
    return part.toolName
  }
  const type = String(part.type ?? "")
  if (type.startsWith("tool-") && type !== "tool-call" && type !== "tool-result") {
    return type.slice(5)
  }
  return ""
}

function toolStateFromPart(part: Record<string, unknown>): TrackToolActivityState {
  const state = String(part.state ?? "")
  if (state === "output-error" || state === "error") {
    return "error"
  }
  if (state === "output-available" || part.output !== undefined) {
    return "done"
  }
  return "running"
}

function shortDetail(value: unknown) {
  if (typeof value !== "string") {
    return null
  }
  const text = value.trim()
  if (!text) {
    return null
  }
  return text.length > 48 ? `${text.slice(0, 45)}…` : text
}

function detailFromInput(input: Record<string, unknown> | null) {
  if (!input) {
    return null
  }
  return (
    shortDetail(input.query) ??
    shortDetail(input.title) ??
    shortDetail(input.topicTitle) ??
    shortDetail(input.label) ??
    null
  )
}

export function toolActivitiesFromParts(
  parts: Array<Record<string, unknown>> | undefined
): TrackToolActivity[] {
  const activities: TrackToolActivity[] = []
  const seen = new Set<string>()

  for (const [index, part] of (parts ?? []).entries()) {
    const type = String(part.type ?? "")
    if (
      type === "text" ||
      type === "reasoning" ||
      type === "step-start" ||
      type === "tool-result"
    ) {
      continue
    }
    if (!type.startsWith("tool-") && type !== "tool-call") {
      continue
    }
    const name = toolNameFromPart(part)
    if (!name) {
      continue
    }
    const id =
      (typeof part.toolCallId === "string" && part.toolCallId) ||
      `${name}:${index}`
    if (seen.has(id)) {
      continue
    }
    seen.add(id)
    const input = asRecord(part.input) ?? asRecord(part.args)
    const detail = detailFromInput(input)
    activities.push({
      id,
      name,
      label: TOOL_LABELS[name] ?? name.replaceAll("_", " "),
      detail,
      state: toolStateFromPart(part),
    })
  }

  return activities
}

export function formatElapsedMs(ms: number) {
  if (ms < 1000) {
    return "a moment"
  }
  const seconds = Math.round(ms / 1000)
  if (seconds < 60) {
    return `${seconds}s`
  }
  const minutes = Math.floor(seconds / 60)
  const rest = seconds % 60
  return rest === 0 ? `${minutes}m` : `${minutes}m ${rest}s`
}

export function activitySummary(input: {
  activities: TrackToolActivity[]
  busy: boolean
  elapsedMs: number | null
}) {
  const { activities, busy, elapsedMs } = input
  const count = activities.length
  const elapsed =
    elapsedMs !== null && elapsedMs >= 0 ? formatElapsedMs(elapsedMs) : null
  if (busy && count === 0) {
    return "Working"
  }
  if (busy) {
    return elapsed ? `Using ${count} tools · ${elapsed}` : `Using ${count} tools`
  }
  if (count === 0) {
    return null
  }
  const used = count === 1 ? "Used 1 tool" : `Used ${count} tools`
  return elapsed ? `${used} · ${elapsed}` : used
}

export function activityNextLabel(
  activities: TrackToolActivity[],
  busy: boolean
) {
  if (!busy) {
    return null
  }
  const last = activities.at(-1)
  if (!last || last.state === "running") {
    return last ? last.label : "Working"
  }
  return "Writing reply"
}
