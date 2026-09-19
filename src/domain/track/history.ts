export type CompactablePart = {
  type: string
  text?: string
  toolName?: string
  [key: string]: unknown
}

export type CompactableMessage = {
  role: string
  parts?: CompactablePart[]
}

function stubPart(part: CompactablePart): CompactablePart {
  if (part.type === "text") {
    return { type: "text", text: part.text ?? "" }
  }
  if (part.type.startsWith("tool-") || part.type === "tool-call" || part.type === "tool-result") {
    const name =
      part.toolName ??
      (part.type.startsWith("tool-") ? part.type.slice(5) : "tool")
    return {
      type: "text",
      text: `[tool ${name}]`,
    }
  }
  return { type: "text", text: "" }
}

export function compactMessages<T extends CompactableMessage>(
  messages: T[],
  maxTurns: number
): T[] {
  const kept: T[] = []
  let turns = 0
  for (let i = messages.length - 1; i >= 0; i--) {
    const message = messages[i]
    if (message.role === "user") {
      turns += 1
      if (turns > maxTurns) {
        break
      }
    }
    const parts = (message.parts ?? []).map(stubPart)
    kept.push({ ...message, parts })
  }
  return kept.reverse()
}
