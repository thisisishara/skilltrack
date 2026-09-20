export const MAX_JOB_PASTE_BYTES = 2 * 1024 * 1024

export function assertPasteSize(paste: string) {
  const bytes = new TextEncoder().encode(paste).length
  if (bytes > MAX_JOB_PASTE_BYTES) {
    throw new Error(
      `Pasted job source is too large (${Math.ceil(bytes / 1024 / 1024)} MB). Cap is 2 MB.`
    )
  }
}
