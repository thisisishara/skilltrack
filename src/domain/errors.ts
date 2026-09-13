export type ApplicationErrorCode =
  | "validation"
  | "authorization"
  | "not_found"
  | "conflict"
  | "database"
  | "unexpected"

export class ApplicationError extends Error {
  readonly code: ApplicationErrorCode

  constructor(code: ApplicationErrorCode, message: string, options?: { cause?: unknown }) {
    super(message, options)
    this.name = "ApplicationError"
    this.code = code
  }
}

export function isApplicationError(error: unknown): error is ApplicationError {
  return error instanceof ApplicationError
}
