import {
  type ApplicationErrorCode,
  isApplicationError,
} from "@/domain/errors"
import { logFailure } from "@/lib/observability/log"

const GENERIC_MESSAGES: Record<ApplicationErrorCode, string> = {
  validation: "Check the highlighted fields and try again.",
  authorization: "You do not have access to this roadmap.",
  not_found: "That item no longer exists.",
  conflict: "That change conflicts with existing data.",
  database: "Could not save your changes. Try again.",
  unexpected: "Something went wrong. Try again.",
}

export type ActionFailure = {
  ok: false
  code: ApplicationErrorCode
  message: string
}

export function presentError(error: unknown): {
  code: ApplicationErrorCode
  message: string
} {
  if (isApplicationError(error)) {
    if (error.code === "database" || error.code === "unexpected") {
      return {
        code: error.code,
        message: GENERIC_MESSAGES[error.code],
      }
    }

    return { code: error.code, message: error.message }
  }

  return {
    code: "unexpected",
    message: GENERIC_MESSAGES.unexpected,
  }
}

export function failAction(
  error: unknown,
  event = "action.failed"
): ActionFailure {
  logFailure(event, error)
  return { ok: false, ...presentError(error) }
}
