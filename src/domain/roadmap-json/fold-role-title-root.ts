import type {
  NormalizedRoadmapDocument,
  NormalizedTopicNote,
} from "@/domain/roadmap-json/types"

function sameTitle(left: string, right: string) {
  return left.trim().toLowerCase() === right.trim().toLowerCase()
}

function notesText(notes: NormalizedTopicNote[]) {
  const parts = notes
    .map((note) => note.body.trim())
    .filter((body) => body.length > 0)
  return parts.length > 0 ? parts.join("\n\n") : null
}

function mergeText(primary: string | null, extra: string | null) {
  if (!extra?.trim()) {
    return primary
  }
  if (!primary?.trim()) {
    return extra.trim()
  }
  if (primary.trim() === extra.trim()) {
    return primary
  }
  return `${primary.trim()}\n\n${extra.trim()}`
}

/** Models often copy roadmap.title as an extra root topic. Fold that wrapper away. */
export function foldRoleTitleRoot(
  document: NormalizedRoadmapDocument
): NormalizedRoadmapDocument {
  const wrappers = document.topics.filter(
    (topic) => !topic.parentId && sameTitle(topic.title, document.name)
  )
  if (wrappers.length !== 1) {
    return document
  }

  const wrapper = wrappers[0]
  if (wrapper.tasks.length > 0) {
    return document
  }

  return {
    ...document,
    description: mergeText(document.description, wrapper.description),
    notes: mergeText(document.notes, notesText(wrapper.notes)),
    links: [...document.links, ...wrapper.links],
    topics: document.topics
      .filter((topic) => topic.id !== wrapper.id)
      .map((topic) =>
        topic.parentId === wrapper.id ? { ...topic, parentId: null } : topic
      ),
  }
}
