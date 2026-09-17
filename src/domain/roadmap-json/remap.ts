import type { NormalizedRoadmapDocument, NormalizedTopic } from "@/domain/roadmap-json/types"

export function remapRoadmapDocument(
  document: NormalizedRoadmapDocument,
  nextId: () => string = () => crypto.randomUUID()
): NormalizedRoadmapDocument {
  const topicIds = new Map<string, string>()
  const otherIds = new Map<string, string>()

  function mapped(source: string, store: Map<string, string>) {
    const existing = store.get(source)
    if (existing) {
      return existing
    }

    const created = nextId()
    store.set(source, created)
    return created
  }

  return {
    ...document,
    links: document.links.map((link) => ({
      ...link,
      id: mapped(link.id, otherIds),
    })),
    topics: document.topics.map((topic) => ({
      ...topic,
      id: mapped(topic.id, topicIds),
      parentId: topic.parentId ? mapped(topic.parentId, topicIds) : null,
      tasks: topic.tasks.map((task) => ({
        ...task,
        id: mapped(task.id, otherIds),
      })),
      links: topic.links.map((link) => ({
        ...link,
        id: mapped(link.id, otherIds),
      })),
    })),
  }
}

export function collectDocumentIds(document: NormalizedRoadmapDocument) {
  const ids: string[] = []

  for (const link of document.links) {
    ids.push(link.id)
  }

  for (const topic of document.topics) {
    ids.push(topic.id)
    for (const task of topic.tasks) {
      ids.push(task.id)
    }
    for (const link of topic.links) {
      ids.push(link.id)
    }
  }

  return ids
}

export function walkTopics(topics: NormalizedTopic[]) {
  return topics
}
