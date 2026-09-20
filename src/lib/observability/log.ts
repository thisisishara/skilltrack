import { isApplicationError } from "@/domain/errors"

export type LogLevel = "info" | "warn" | "error"

export type LogValue = string | number | boolean | null

function serializeError(error: unknown) {
  if (isApplicationError(error)) {
    const cause = error.cause
    return {
      code: error.code,
      causeName: cause instanceof Error ? cause.name : null,
      causeMessage:
        cause instanceof Error ? cause.message.slice(0, 200) : null,
    }
  }

  if (error instanceof Error) {
    return {
      code: "unexpected" as const,
      causeName: error.name,
      causeMessage: error.message.slice(0, 200),
    }
  }

  return { code: "unexpected" as const, causeName: null, causeMessage: null }
}

export function logEvent(
  level: LogLevel,
  event: string,
  fields: Record<string, LogValue> = {}
) {
  const line = JSON.stringify({ event, ...fields })

  if (level === "error") {
    console.error(line)
    return
  }

  if (level === "warn") {
    console.warn(line)
    return
  }

  console.info(line)
}

export function logFailure(
  event: string,
  error: unknown,
  fields: Record<string, LogValue> = {}
) {
  const serialized = serializeError(error)
  const level: LogLevel =
    serialized.code === "validation" || serialized.code === "authorization"
      ? "warn"
      : "error"

  logEvent(level, event, {
    ...fields,
    code: serialized.code,
    causeName: serialized.causeName ?? null,
    causeMessage: serialized.causeMessage ?? null,
  })
}
