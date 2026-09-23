export const NOTE_TITLE_MAX = 80

export function displayNoteTitle(title: string) {
  return title.trim().slice(0, NOTE_TITLE_MAX)
}

/** Title for a migrated single note when the body starts with a markdown heading. */
export function noteTitleFromBody(body: string) {
  const first = body.split(/\r?\n/).find((line) => line.trim().length > 0) ?? ""
  const match = first.match(/^\s{0,3}#{1,6}\s+(\S.*?)\s*#*\s*$/)
  const heading = match?.[1]?.trim() ?? ""
  if (!heading) {
    return "Notes"
  }
  return displayNoteTitle(heading) || "Notes"
}
